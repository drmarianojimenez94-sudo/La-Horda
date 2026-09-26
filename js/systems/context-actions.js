"use strict";
/* ============================================================
   js/systems/context-actions.js
   CONTEXT ACTION SYSTEM — una sola acción "usar" para todo lo que se activa en el escenario
   (cerrar una fisura, encender un brasero, activar una runa, romper un sello...).

   - Los OBJETIVOS los pone la arena: gancho ctxTargets() -> [{id, x, y, r, kind, prog, dur}].
     Viven en el estado de la arena (y viajan en su netState), así el invitado los ve igual.
   - Cada TIPO se describe una vez en CTX_KINDS[kind] = {
       label, icon, color,             lo que muestra el botón y el aviso en el mundo
       canUse(h, t)                    (opcional) ¿este héroe lo puede usar ahora?
       onTick(t, users, dt)            (opcional) mientras se mantiene (p.ej. riesgo: más enemigos)
       onComplete(t, users)            al llenarse la barra (lo decide el anfitrión)
       botWorth(h, t)                  (opcional) cuánto le conviene a un bot ir (0 = nunca)
       decay                           (opcional) ms perdidos por ms sin nadie (por defecto 0.5)
       pointer(t)                      (opcional) true = si está fuera de cámara, flecha en el borde
       maxBots                         (opcional) cuántos bots pueden ir al mismo objetivo (por defecto 2)
       farOk                           (opcional) true = un bot puede alejarse del jugador para usarlo
     }
   - MANTENER el botón contextual (el mismo de Revivir: revivir tiene prioridad) = h._ctxHold.
     El progreso lo lleva SOLO el anfitrión (ctxUpdate, después de updateRevives); el invitado
     manda {k:"ctx", id, on} y ve la barra por el estado sincronizado de la arena.
   - Varios héroes a la vez lo llenan más rápido (1 / 1,6 / 2 / 2,3): cooperar se nota.
   - Los bots los usan con botObjective (bot-brain.js) si botWorth > 0 y no hay algo más urgente.
   - Tecla E en escritorio = el mismo botón.
   ============================================================ */
const CTX_KINDS = {};
const CTX_RATE = [0, 1, 1.6, 2, 2.3];

function ctxTargets(){
  if(state!=="playing" || !arenaHas("ctxTargets")) return null;
  return arenaHook("ctxTargets") || null;
}
function ctxFind(id){
  const ts = ctxTargets(); if(!ts || id==null) return null;
  for(const t of ts) if(t.id===id) return t;
  return null;
}
function ctxInRange(h, t, pad){ return Math.hypot(h.x-t.x, h.y-t.y) < t.r + (pad||0); }
function ctxCanUse(h, t, pad){
  const k = t && CTX_KINDS[t.kind];
  return !!(k && h && h.alive && !(h.stunTimer>0) && !runEnding && !t.done && ctxInRange(h, t, pad)
    && (!k.canUse || k.canUse(h, t)));
}
// El objetivo usable más cercano para este héroe (lo usa el botón del jugador).
function ctxNearest(h){
  const ts = ctxTargets(); if(!ts || !h) return null;
  let best = null, bd = Infinity;
  for(const t of ts){
    if(!ctxCanUse(h, t)) continue;
    const d = Math.hypot(h.x-t.x, h.y-t.y);
    if(d < bd){ bd = d; best = t; }
  }
  return best;
}
// Anfitrión / partida local: avanza el progreso de cada objetivo según quién lo mantiene.
function ctxUpdate(dt){
  const ts = ctxTargets();
  if(!ts){ for(const h of heroes) if(h._ctxHold!=null) h._ctxHold = null; return; }
  for(const h of heroes){
    if(h._ctxHold==null) continue;
    const t = ctxFind(h._ctxHold);
    if(!t || !ctxCanUse(h, t, h.isRemote ? 24 : 6)) h._ctxHold = null;
  }
  for(const t of ts){
    if(t.done) continue;
    const k = CTX_KINDS[t.kind]; if(!k) continue;
    let users = null;
    for(const h of heroes){ if(h._ctxHold===t.id){ (users || (users = [])).push(h); } }
    if(users){
      t.prog = (t.prog||0) + dt*CTX_RATE[Math.min(4, users.length)];
      t.by = heroes.indexOf(users[0]);
      if(k.onTick) k.onTick(t, users, dt);
      if(t.prog >= t.dur){
        t.prog = t.dur; t.done = true;
        for(const h of users) h._ctxHold = null;
        if(k.onComplete) k.onComplete(t, users);
      }
    } else {
      t.by = -1;
      if(t.prog > 0) t.prog = Math.max(0, t.prog - dt*(k.decay!=null ? k.decay : 0.5));
    }
  }
}
// Mantener / soltar (jugador local). En el invitado se lo pide al anfitrión.
function ctxSetHold(t){
  if(netIsGuest()){ netSendToHost(t ? {k:"ctx", id:t.id, on:1} : {k:"ctx", on:0}); return; }
  if(player) player._ctxHold = t ? t.id : null;
}
// Anfitrión: mensaje del invitado.
function ctxNetMsg(h, d){
  if(!d.on){ h._ctxHold = null; return; }
  const t = ctxFind(d.id);
  if(t && ctxCanUse(h, t, 24)) h._ctxHold = t.id;
}
// Bots: ¿hay algún objetivo que valga la pena? Devuelve {mx,my,target...} para botMove o null.
function ctxBotObjective(h, dt, target){
  const ts = ctxTargets(); if(!ts) return null;
  // sigue con el que tenía
  let t = h._ctxGoal!=null ? ctxFind(h._ctxGoal) : null;
  if(t && (t.done || !CTX_KINDS[t.kind])) t = null;
  h._ctxGoalT = (h._ctxGoalT||0) - dt;
  if(!t && h._ctxGoalT <= 0){
    h._ctxGoalT = 600;
    let best = null, bw = 0;
    for(const c of ts){
      const k = CTX_KINDS[c.kind]; if(!k || c.done || !k.botWorth) continue;
      if(k.canUse && !k.canUse(h, c)) continue;
      // correa: un bot no deja solo al jugador por algo lejano (salvo objetivos que lo piden)
      if(!k.farOk && player && Math.hypot(c.x-player.x, c.y-player.y) > 700) continue;
      // no se amontonan: si ya van los que hacen falta, que vaya otro a otra cosa
      let going = 0; for(const o of heroes){ if(o!==h && o._ctxGoal===c.id) going++; }
      if(going >= (k.maxBots || 2)) continue;
      const raw = k.botWorth(h, c);
      if(raw < 1) continue; // solo lo que de verdad vale la pena (pelear también importa)
      const w = raw / (1 + Math.hypot(h.x-c.x, h.y-c.y)/500) / (1 + going*0.8);
      if(w > bw){ bw = w; best = c; }
    }
    t = best;
  }
  if(!t){ h._ctxGoal = null; if(h._ctxHold!=null) h._ctxHold = null; return null; }
  const k = CTX_KINDS[t.kind];
  if(k.botWorth(h, t) < 1){ h._ctxGoal = null; h._ctxHold = null; return null; }
  if(h._ctxGoal !== t.id){ h._ctxBestD = undefined; h._ctxProgT = 0; h._ctxUnstick = 0; } // objetivo nuevo: medición de avance de cero
  h._ctxGoal = t.id;
  const d = Math.hypot(t.x-h.x, t.y-h.y);
  // se acerca hasta bien adentro; si ya lo está usando, un empujón no lo corta (hasta el borde)
  if(d > (h._ctxHold===t.id ? t.r-4 : t.r*0.6)){
    h._ctxHold = null;
    // camino: con muros (Laberinto) sigue la grilla salvo en el tramo final; si no, derecho
    let dir = d > 90 ? ctxNavDir(h, t) : null, navd = !!dir;
    if(!dir) dir = {x:(t.x-h.x)/d, y:(t.y-h.y)/d};
    // ¿avanza? si en 1,2 s no se acercó 15 u POR EL CAMINO (rodear un muro no cuenta como trabarse),
    // está trabado contra una punta de muro o un compañero: paso al costado
    const pd = (navd && dir.pathD!=null) ? dir.pathD : d;
    h._ctxProgT = (h._ctxProgT||0) + dt;
    if(h._ctxProgT > 1200){
      if((h._ctxBestD===undefined ? 1e9 : h._ctxBestD) - pd < 15){ h._ctxUnstick = 700; h._ctxSide = -(h._ctxSide||1); }
      h._ctxBestD = pd; h._ctxProgT = 0;
    }
    if(h._ctxUnstick > 0){
      h._ctxUnstick -= dt; const sd = h._ctxSide||1;
      return {mx:-dir.y*sd*0.95 + dir.x*0.2, my:dir.x*sd*0.95 + dir.y*0.2, target, navd:true};
    }
    return {mx:dir.x, my:dir.y, target, navd};
  }
  if(ctxCanUse(h, t)) h._ctxHold = t.id;
  return {mx:0, my:0, target, usingCtx:true};
}

// Camino hacia un objetivo cuando hay obstáculos: campo de distancias sobre la grilla de navegación
// (js/ai/navigation.js) sembrado en el objetivo, con los obstáculos INFLADOS una celda más que para
// los enemigos (un campeón grande que dobla pegado a la punta de un muro se traba). Los objetivos no
// se mueven: el campo se calcula una vez por objetivo.
const _ctxFields = new Map();
function _ctxBuildField(t){
  const N = AID_NAV, W = N.W, H = N.H, n = W*H;
  const infl = new Uint8Array(n);
  for(let j=0;j<H;j++) for(let i=0;i<W;i++){
    const c = j*W+i; if(N.blocked[c]){ infl[c] = 1; continue; }
    for(let dj=-1; dj<=1 && !infl[c]; dj++) for(let di=-1; di<=1; di++){
      const ii = i+di, jj = j+dj; if(ii<0||jj<0||ii>=W||jj>=H) continue;
      if(N.blocked[jj*W+ii]){ infl[c] = 1; break; }
    }
  }
  const D = new Uint16Array(n).fill(65535), q = new Int32Array(n);
  let qh = 0, qt = 0;
  const s0 = aidNavCell(t.x, t.y); if(s0 < 0) return {D, infl};
  D[s0] = 0; q[qt++] = s0; infl[s0] = 0;
  while(qh < qt){
    const c = q[qh++], d = D[c]+1, i = c % W, j = (c-i)/W;
    if(i>0 && !infl[c-1] && D[c-1]===65535){ D[c-1] = d; q[qt++] = c-1; }
    if(i<W-1 && !infl[c+1] && D[c+1]===65535){ D[c+1] = d; q[qt++] = c+1; }
    if(j>0 && !infl[c-W] && D[c-W]===65535){ D[c-W] = d; q[qt++] = c-W; }
    if(j<H-1 && !infl[c+W] && D[c+W]===65535){ D[c+W] = d; q[qt++] = c+W; }
  }
  return {D, infl};
}
function ctxNavDir(h, t){
  const N = AID_NAV;
  if(!N.on || !N.blocked) return null;
  const key = t.x + "," + t.y + "," + N.W + "x" + N.H;
  let f = _ctxFields.get(t.id);
  if(!f || f.key!==key){
    f = Object.assign(_ctxBuildField(t), {key}); _ctxFields.set(t.id, f);
    if(_ctxFields.size > 12) _ctxFields.delete(_ctxFields.keys().next().value);
  }
  const W = N.W, c = aidNavCell(h.x, h.y); if(c < 0) return null;
  const i = c % W, j = (c-i)/W;
  // en una celda inflada (pegado a un muro): ir a la vecina con menor distancia, aunque esté inflada
  let best = -1, bd = f.D[c];
  for(let dj=-1; dj<=1; dj++) for(let di=-1; di<=1; di++){
    if(!di && !dj) continue;
    const ii = i+di, jj = j+dj; if(ii<0||jj<0||ii>=W||jj>=N.H) continue;
    const k = jj*W+ii; if(N.blocked[k]) continue;
    if(di && dj && (N.blocked[j*W+ii] || N.blocked[jj*W+i] || f.infl[j*W+ii] || f.infl[jj*W+i])) continue; // no cortar esquinas
    if(f.D[k] < bd){ bd = f.D[k]; best = k; }
  }
  if(best < 0 || bd===65535) return null;
  const bi = best % W, bj = (best-bi)/W;
  const tx = N.x0 + (bi+0.5)*N.cell, ty = N.y0 + (bj+0.5)*N.cell, dx = tx-h.x, dy = ty-h.y, l = Math.hypot(dx, dy)||1;
  return {x:dx/l, y:dy/l, pathD:f.D[c]===65535 ? null : f.D[c]*N.cell}; // pathD: distancia por el camino (para medir avance)
}

/* ---- Botón (el de Revivir) ---- */
let ctxBtnTarget = null, ctxBtnRaf = null;
function ctxBtnSetLook(t){
  const btn = document.getElementById("btn-revive"); if(!btn) return;
  const k = t && CTX_KINDS[t.kind];
  const ico = btn.querySelector(".ico"), lbl = btn.querySelector(".lbl");
  const want = k ? k.label : "Revivir";
  if(lbl && lbl.textContent!==want) lbl.textContent = want;
  if(ico && btn.dataset.holding!=="1"){ const i = k ? k.icon : "✚"; if(ico.textContent!==i) ico.textContent = i; }
  btn.classList.toggle("ctx", !!k);
  if(k) btn.style.setProperty("--ctx-col", k.color || "#ffcf5c");
}
function ctxBtnStart(t){
  const btn = document.getElementById("btn-revive");
  ctxBtnTarget = t;
  if(btn){ btn.dataset.holding = "1"; btn.dataset.ctx = "1"; btn.classList.add("holding"); }
  ctxSetHold(t);
  ctxBtnRaf = requestAnimationFrame(ctxBtnTick);
}
function ctxBtnStop(){
  if(ctxBtnRaf) cancelAnimationFrame(ctxBtnRaf);
  ctxBtnRaf = null;
  const btn = document.getElementById("btn-revive");
  const was = btn && btn.dataset.ctx==="1";
  if(btn && was){ btn.dataset.holding = "0"; btn.dataset.ctx = "0"; btn.classList.remove("holding"); }
  if(was) ctxSetHold(null);
  ctxBtnTarget = null;
  if(was) ctxBtnSetLook(ctxNearest(player));
}
function ctxBtnTick(){
  const cur = ctxBtnTarget && ctxFind(ctxBtnTarget.id);
  if(!cur || cur.done || !player || !player.alive || !ctxInRange(player, cur, 10)){ ctxBtnStop(); return; }
  ctxBtnTarget = cur;
  const ico = document.querySelector("#btn-revive .ico");
  if(ico) ico.textContent = Math.round(Math.min(1, (cur.prog||0)/cur.dur)*100)+"%";
  ctxBtnRaf = requestAnimationFrame(ctxBtnTick);
}

/* ---- Dibujo en el mundo: aviso + barra circular ---- */
function ctxDraw(){
  const ts = ctxTargets(); if(!ts || !player) return;
  const now = animNow/1000;
  for(const t of ts){
    if(t.done || !inView(t.x, t.y, t.r+60)) continue;
    const k = CTX_KINDS[t.kind]; if(!k) continue;
    const near = player.alive && Math.hypot(player.x-t.x, player.y-t.y) < t.r + 150;
    const p = (t.prog||0)/t.dur;
    if(!near && p <= 0) continue;
    ctx.save();
    const col = k.color || "#ffcf5c";
    if(near){
      // radio de uso: anillo punteado que late
      ctx.globalAlpha = 0.45 + 0.25*Math.sin(now*5);
      ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.setLineDash([7, 6]);
      ctx.beginPath(); ctx.ellipse(t.x, t.y, t.r, t.r*0.62, 0, 0, Math.PI*2); ctx.stroke();
      ctx.setLineDash([]);
    }
    const bx = t.x, by = t.y - (t.h || 46);
    ctx.globalAlpha = 1;
    ctx.fillStyle = "rgba(10,8,12,0.78)";
    ctx.beginPath(); ctx.arc(bx, by, 15, 0, Math.PI*2); ctx.fill();
    if(p > 0){
      ctx.strokeStyle = col; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(bx, by, 15, -Math.PI/2, -Math.PI/2 + Math.PI*2*Math.min(1, p)); ctx.stroke();
    } else {
      ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(bx, by, 15, 0, Math.PI*2); ctx.stroke();
    }
    ctx.fillStyle = "#fff"; ctx.font = "bold 14px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(k.icon, bx, by+1);
    ctx.restore();
  }
}

/* ---- Flechas en el borde de la pantalla hacia objetivos importantes fuera de cámara ---- */
function ctxDrawScreen(){
  const ts = ctxTargets(); if(!ts || !player || !player.alive) return;
  const now = animNow/1000, m = 30;
  for(const t of ts){
    const k = CTX_KINDS[t.kind]; if(!k || !k.pointer || t.done || !k.pointer(t)) continue;
    if(inView(t.x, t.y, -40) || Math.hypot(t.x-player.x, t.y-player.y) > 1600) continue;
    const s = worldToScreen(t.x, t.y), cx = VW/2, cy = VH/2;
    const dx = s.x-cx, dy = s.y-cy, l = Math.hypot(dx, dy)||1;
    const kx = (VW/2 - m)/Math.abs(dx||1e-6), ky = (VH/2 - m)/Math.abs(dy||1e-6), kk = Math.min(kx, ky);
    const x = cx + dx*kk, y = cy + dy*kk, a = Math.atan2(dy, dx);
    ctx.save(); ctx.translate(x, y);
    ctx.globalAlpha = 0.75 + 0.25*Math.sin(now*5);
    ctx.fillStyle = "rgba(10,8,12,0.8)"; ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = k.color || "#ffcf5c"; ctx.lineWidth = 2; ctx.stroke();
    ctx.rotate(a); ctx.fillStyle = k.color || "#ffcf5c";
    ctx.beginPath(); ctx.moveTo(22, 0); ctx.lineTo(14, -6); ctx.lineTo(14, 6); ctx.closePath(); ctx.fill();
    ctx.rotate(-a); ctx.fillStyle = "#fff"; ctx.font = "bold 13px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(t.kind==="lab_seal" ? LAB_NUM[t.n] : k.icon, 0, 1);
    ctx.restore();
  }
}

/* ---- Tecla E (escritorio): mismo comportamiento que mantener el botón ---- */
window.addEventListener("keydown", (ev)=>{
  if(ev.repeat || (ev.key!=="e" && ev.key!=="E") || state!=="playing") return;
  const tag = ev.target && ev.target.tagName; if(tag==="INPUT" || tag==="TEXTAREA") return;
  const btn = document.getElementById("btn-revive");
  if(btn) btn.dispatchEvent(new PointerEvent("pointerdown", {bubbles:true}));
});
window.addEventListener("keyup", (ev)=>{
  if(ev.key!=="e" && ev.key!=="E") return;
  const btn = document.getElementById("btn-revive");
  if(btn) btn.dispatchEvent(new PointerEvent("pointerup", {bubbles:true}));
});
