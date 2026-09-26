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
      // no se amontonan: si ya van dos, que vaya otro a otra cosa
      let going = 0; for(const o of heroes){ if(o!==h && o._ctxGoal===c.id) going++; }
      if(going >= 2) continue;
      const w = k.botWorth(h, c) / (1 + Math.hypot(h.x-c.x, h.y-c.y)/500) / (1 + going*0.8);
      if(w > bw){ bw = w; best = c; }
    }
    t = best;
  }
  if(!t){ h._ctxGoal = null; if(h._ctxHold!=null) h._ctxHold = null; return null; }
  const k = CTX_KINDS[t.kind];
  if(k.botWorth(h, t) <= 0){ h._ctxGoal = null; h._ctxHold = null; return null; }
  h._ctxGoal = t.id;
  const d = Math.hypot(t.x-h.x, t.y-h.y);
  // se acerca hasta bien adentro; si ya lo está usando, un empujón no lo corta (hasta el borde)
  if(d > (h._ctxHold===t.id ? t.r-4 : t.r*0.6)){
    h._ctxHold = null;
    const nd = ctxNavDir(h, t); // con muros en el medio (Laberinto) sigue el camino de la grilla
    if(nd) return {mx:nd.x, my:nd.y, target, navd:true};
    return {mx:(t.x-h.x)/d, my:(t.y-h.y)/d, target};
  }
  if(ctxCanUse(h, t)) h._ctxHold = t.id;
  return {mx:0, my:0, target, usingCtx:true};
}

// Camino hacia un objetivo cuando hay obstáculos: campo de distancias de la grilla de navegación
// (js/ai/navigation.js) sembrado en el objetivo. Los objetivos no se mueven: se calcula una vez.
const _ctxFields = new Map();
function ctxNavDir(h, t){
  const N = AID_NAV;
  if(!N.on || !N.blocked || aidLineClear(h.x, h.y, t.x, t.y)) return null;
  const key = t.x + "," + t.y + "," + N.W + "x" + N.H;
  let f = _ctxFields.get(t.id);
  if(!f || f.key!==key){
    const d = new Uint16Array(N.W*N.H);
    aidNavBfs(d, seed=>seed({x:t.x, y:t.y, alive:true}));
    f = {d, key}; _ctxFields.set(t.id, f);
    if(_ctxFields.size > 12) _ctxFields.delete(_ctxFields.keys().next().value);
  }
  return aidNavDir(h, f.d);
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
