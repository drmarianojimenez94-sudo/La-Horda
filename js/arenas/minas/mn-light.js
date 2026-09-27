"use strict";
/* ============================================================
   js/arenas/minas/mn-light.js
   MINAS PROFUNDAS — "LA LUZ ES TERRITORIO".

   FUENTE DE LUZ (mnS.lights, la simula SOLO el anfitrión; el invitado la ve por el netState):
     st 2 ENCENDIDA   ilumina su radio. Energía e (0..1) que se recupera sola si nadie la ataca.
     st 1 PARPADEA    e < 0,5: la están absorbiendo o golpeando (aviso visual y sonoro).
     st 0 APAGADA     e = 0: su zona queda a oscuras. ENCENDER (acción contextual, mantener) la vuelve
                      a prender; si el que la enciende recibe un golpe fuerte, se interrumpe.
                      off > 0 = apagón temporal (aullido de Cerbero, pisotón): vuelve sola.
   OSCURIDAD: fuera de toda fuente encendida (o dentro de una ZONA DE OSCURIDAD del Escupidor) un
     guardián recibe +15% de daño, no regenera y es presa de los Acechadores. En la luz regenera un
     poco. NUNCA conviene apagar una luz a propósito: no hay ninguna recompensa por la oscuridad.
   ANTORCHA PERSONAL: cada guardián lleva un radio chico de visión (no cuenta como territorio); el
     Escupidor y el Devoraluz la pueden apagar unos segundos.
   Pantalla: una máscara de oscuridad de baja resolución (una textura cacheada por luz, sin shaders)
     que nunca llega al negro total; los avisos de ataque y los proyectiles se dibujan encima.
   ============================================================ */

/* ---------------- consultas ---------------- */
function mnLightInt(L){ return L.st===2 ? 1 : L.st===1 ? 0.55 + 0.25*Math.sin(animNow/60 + L.i) : 0; }
function mnInZone(x, y){ if(!mnS) return false; for(const Z of mnS.zones){ if(Z.t >= 0 && Math.hypot(x - Z.x, y - Z.y) < Z.r) return true; } return false; }
// Nivel de luz del TERRITORIO en un punto (0 = oscuridad, 1 = pleno): solo fuentes, no antorchas.
function mnLightAt(x, y){
  if(!mnS) return 1;
  let best = 0;
  for(const L of mnS.lights){ if(L.st===0) continue; const d = Math.hypot(x - L.x, y - L.y); if(d < L.r){ const v = (1 - d/L.r)*(L.st===2 ? 1 : 0.6); if(v > best) best = v; } }
  if(mnS.portal && mnS.portal.st!=="none" && mnS.portal.st!=="used" && mnS.sec===5){ // el Portal Infernal abierto también alumbra
    const G = MN_SECTORS[5].portal, d = Math.hypot(x - G.x, y - G.y); if(d < 360) best = Math.max(best, 1 - d/360);
  }
  if(best > 0 && mnInZone(x, y)) best *= 0.15;
  return best;
}
function mnIsLit(x, y){ return mnLightAt(x, y) > 0.14; }
function mnHeroDark(h){ return !!(h && h.alive && !mnIsLit(h.x, h.y)); }
function mnTorchR(i){ return mnS && mnS.torch[i] > 0 ? MN_CFG.light.torchSnuffR : MN_CFG.light.torchR; }
function mnLitCount(){ return mnS ? mnS.lights.filter(L=>L.st>0).length : 0; }
function mnLightsNear(x, y, R, fn){ for(const L of mnS.lights){ if(Math.hypot(L.x - x, L.y - y) <= R) fn(L); } }
function mnNearestLight(x, y, filt){ let best = null, bd = Infinity; for(const L of mnS.lights){ if(filt && !filt(L)) continue; const d = Math.hypot(L.x - x, L.y - y); if(d < bd){ bd = d; best = L; } } return best; }

/* ---------------- cambios de estado ---------------- */
function mnLightSt(L){ L.st = L.e <= 0 ? 0 : L.e < MN_CFG.light.flickerAt ? 1 : 2; }
// daño a una fuente (golpe del Minero, pisotón, absorción). cause: texto corto para la alerta
function mnLightHit(L, amt, cause){
  if(!L || L.st===0 || runEnding) return;
  const prev = L.st;
  L.e = Math.max(0, L.e - amt*(1 + 0.04*(mnS.rule||0))); L.hit = 300;
  mnLightSt(L);
  if(L.st===0) mnLightOff(L, cause, 0);
  else if(prev===2 && L.st===1){ playSfx("mnFlicker"); }
}
function mnLightOff(L, cause, tempMs){
  if(!L) return;
  const was = L.st;
  L.e = 0; L.st = 0; L.off = tempMs||0; L.dr = 0; L.hit = 0;
  if(was===0) return;
  mnS.lost++;
  playSfx("mnExtinguish");
  vfxBurst(L.x, L.y - 40, 8, "smoke", 60, 700, 3, 1, -30, 0);
  if(!tempMs){
    mnAlert("light", L.x, L.y, cause ? `${cause} apagó una luz` : "Se apagó una luz", 2600);
    if(!tutSeen("mn_off")) mnTutSay("mn_off", "Se apagó una luz: su zona quedó a OSCURAS. Acercate y MANTENÉ la acción ENCENDER para recuperar ese territorio.", 9000);
  }
}
function mnRelight(L, by){
  if(!L || L.perm) return;                       // el Umbral se la comió: no vuelve
  L.e = 1; L.st = 2; L.off = 0; L.dr = 0; L.dev = 0;
  mnS.relit++;
  playSfx("mnRelight");
  vfxBurst(L.x, L.y - 40, 12, "holy", 90, 600, 3, 2, -40, 0);
  if(inView(L.x, L.y, 60)) floatText(L.x, L.y - 80, "¡LUZ!", "heal");
  if(by && by.stats) by.stats.lightsRelit = (by.stats.lightsRelit||0) + 1;
}
// apagón temporal de las luces cercanas (pisotones, aullido): vuelven solas en tempMs
function mnLightsBlackout(x, y, R, tempMs, maxN){
  let n = 0;
  const L = mnS.lights.filter(q=>q.st>0 && Math.hypot(q.x - x, q.y - y) <= R).sort((a, b)=>Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y));
  for(const q of L){ if(maxN && n >= maxN) break; mnLightOff(q, null, tempMs); n++; }
  return n;
}
// zona de oscuridad (impacto del Escupidor): corta la luz del lugar por un rato
function mnDarkZone(x, y, r, ms, k){
  const C = MN_CFG.light;
  if(mnS.zones.length >= C.maxZones) mnS.zones.shift();
  mnS.zones.push({x:Math.round(x), y:Math.round(y), r:r||C.zoneR, t:0, d:ms||C.zoneMs, k:k||"spit"});
}
function mnSnuffTorch(h, ms){
  const i = heroes.indexOf(h); if(i < 0) return;
  if(!(mnS.torch[i] > 0) && inView(h.x, h.y, 60)) floatText(h.x, h.y - 70, "¡Antorcha apagada!", "warn");
  mnS.torch[i] = Math.max(mnS.torch[i]||0, ms||MN_CFG.light.torchSnuffMs);
  playSfx("mnSnuff");
}

/* ---------------- actualización (anfitrión) ---------------- */
function mnLightsUpdate(dt){
  const C = MN_CFG.light;
  for(const L of mnS.lights){
    if(L.hit > 0) L.hit -= dt;
    if(L.dr > 0) L.dr -= dt;
    if(L.st===0){
      if(L.perm) continue;
      if(L.off > 0){ L.off -= dt; if(L.off <= 0){ L.off = 0; L.e = 0.7; mnLightSt(L); playSfx("mnRelight"); } }
      continue;
    }
    if(!(L.dr > 0) && L.e < 1){ L.e = Math.min(1, L.e + C.regen/(1 + 0.08*(mnS.rule||0))*dt/1000); mnLightSt(L); }
  }
  for(let i=mnS.zones.length-1;i>=0;i--){ const Z = mnS.zones[i]; Z.t += dt; if(Z.t >= Z.d) mnS.zones.splice(i, 1); }
  for(let i=0;i<mnS.torch.length;i++) if(mnS.torch[i] > 0) mnS.torch[i] = Math.max(0, mnS.torch[i] - dt);
  // guardianes: oscuridad = vulnerables; luz = un poco de regeneración (el territorio vale)
  for(const h of heroes){
    if(!h.alive){ h._mnDark = false; continue; }
    const dark = mnHeroDark(h);
    if(dark && !h._mnDark){ h._mnDarkT = 0; }
    h._mnDark = dark; h._mnDarkT = (h._mnDarkT||0) + dt;
    if(!dark && h.hp < h.maxHp && !enemies.some(e=>e.alive && Math.hypot(e.x - h.x, e.y - h.y) < 190)) h.hp = Math.min(h.maxHp, h.hp + h.maxHp*C.litRegenPct*dt/1000);
    if(dark && h===player && h._mnDarkT > 900 && !tutSeen("mn_dark")) mnTutSay("mn_dark", "Estás A OSCURAS: recibís más daño y los Acechadores te pueden emboscar. Volvé a la luz o encendé una fuente.", 8000);
  }
  // objetivos de la acción contextual: ENCENDER luces apagadas o casi apagadas (se conserva el progreso)
  const old = new Map(mnS.ctx.map(t=>[t.id, t])); mnS.ctx = [];
  for(const L of mnS.lights){
    if(L.perm || L.st===2 || (L.st===1 && L.e > 0.3)) continue;
    const id = "L" + L.i, t = old.get(id) || {id, li:L.i, r:86, kind:"mn_light", dur:C.relightMs, prog:0};
    if(!t.done){ t.x = L.x; t.y = L.y + 10; mnS.ctx.push(t); }
  }
  const P = mnS.portal;
  if(P.st==="open"){
    const G = MN_SECTORS[5].portal, t = old.get("portal") || {id:"portal", r:130, kind:"mn_portal", dur:MN_CFG.cerbero.portalUseMs, prog:0};
    if(!t.done){ t.x = G.x; t.y = G.y + 40; mnS.ctx.push(t); }
  }
}

/* ---------------- acciones contextuales ---------------- */
CTX_KINDS.mn_light = {
  label:"ENCENDER", icon:"🔥", color:"#ffd27a", farOk:true, maxBots:1, decay:0.35, pointer:()=>false,
  canUse:(h, t)=>!!mnS && h.alive && !mnDescending(),
  onTick:(t, users, dt)=>{
    // un golpe fuerte mientras se enciende la interrumpe (hay que elegir el momento)
    t._hp = t._hp || {};
    for(const h of users){
      const i = heroes.indexOf(h), k = "h" + i;
      if(t._hp[k]===undefined || t._hp[k] < h.hp) t._hp[k] = h.hp;
      if(t._hp[k] - h.hp > h.maxHp*MN_CFG.light.interruptPct){
        t.prog = 0; t._hp = {}; for(const u of users) u._ctxHold = null;
        if(inView(h.x, h.y, 60)) floatText(h.x, h.y - 70, "¡Interrumpido!", "warn");
        return;
      }
    }
  },
  onComplete:(t, users)=>{ const L = mnS && mnS.lights[t.li]; if(L) mnRelight(L, users[0]); t._hp = {}; },
  botWorth:(h, t)=>{
    if(!mnS) return 0;
    // los bots encienden cuando no hay pelea encima (o cuando la luz está cerca)
    const near = enemies.some(e=>e.alive && Math.hypot(e.x - h.x, e.y - h.y) < 170);
    if(near && h.hp < h.maxHp*0.5) return 0;
    const d = Math.hypot(t.x - h.x, t.y - h.y);
    return d < 700 ? 9 : 4;
  }
};
// ATRAVESAR EL UMBRAL: solo un guardián HUMANO (jugador local o invitado conectado). Un bot nunca
// termina la partida por su cuenta: la decisión de cruzar es de las personas.
function mnIsHuman(h){ return !!h && (h===player || (h.isRemote && h._net && h._net.connected!==false)); }
CTX_KINDS.mn_portal = {
  label:"ATRAVESAR EL UMBRAL", icon:"🜂", color:"#ff5a3a", farOk:false, maxBots:0, decay:0.6, pointer:()=>true,
  canUse:(h, t)=>!!mnS && mnS.portal.st==="open" && h.alive && mnIsHuman(h),
  onComplete:(t, users)=>{ mnPortalEnter(users[0]); },
  botWorth:()=>0
};

/* ---------------- alertas / tutorial ---------------- */
function mnAlert(k, x, y, txt, d){
  const same = mnS.alerts.find(a=>a.k===k && a.txt===txt);
  if(same){ same.t = 0; same.x = Math.round(x); same.y = Math.round(y); return; }
  mnS.alerts.push({k, x:Math.round(x), y:Math.round(y), txt, t:0, d:d||2600});
  if(mnS.alerts.length > 4) mnS.alerts.shift();
}
function mnTutSay(key, text, ms, urgent){
  if(!player || typeof tutSay!=="function" || tutSeen(key)) return;
  tutSay(key, text, null, ms || 6500, urgent);
}

/* ---------------- máscara de oscuridad (pantalla) ----------------
   Canvas chico (1/4 de la vista en unidades de mundo): se llena de oscuridad y se "recortan" las luces
   con una textura radial cacheada (destination-out). Las zonas oscuras se pintan encima. Se dibuja
   estirada con suavizado sobre el mundo (bordes blandos, costo fijo, sin shaders). */
const MN_MASK_DS = 4;
let _mnMask = null, _mnMaskCtx = null, _mnHole = null, _mnBlot = null;
function _mnRadial(rgb, soft){
  const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d");
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, `rgba(${rgb},1)`); gr.addColorStop(soft||0.55, `rgba(${rgb},0.75)`); gr.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return c;
}
function mnDarkLevel(){
  if(!mnS) return 0;
  const S = mnSector();
  let d = S.dark;
  if(mnS.sec===5 && mnS.portal.st!=="none") d -= 0.12;       // el portal abierto ilumina la cámara de rojo
  return Math.max(0, Math.min(0.8, d));
}
function mnViewRect(){
  const W = VW/CAM_ZOOM, H = VH/CAM_ZOOM;
  return {x:player.x - W/2, y:(player.y - CAM_LIFT) - (VH/2 - CAM_Y_ANCHOR)/CAM_ZOOM, w:W, h:H};
}
function mnDrawDarkness(){
  const base = mnDarkLevel(); if(base <= 0.02) return;
  const V = mnViewRect();
  const mw = Math.ceil(V.w/MN_MASK_DS) + 2, mh = Math.ceil(V.h/MN_MASK_DS) + 2;
  if(!_mnMask){ _mnMask = document.createElement("canvas"); _mnMaskCtx = _mnMask.getContext("2d"); _mnHole = _mnRadial("255,255,255", 0.5); _mnBlot = _mnRadial("2,0,6", 0.6); }
  if(_mnMask.width !== mw || _mnMask.height !== mh){ _mnMask.width = mw; _mnMask.height = mh; }
  const m = _mnMaskCtx, k = 1/MN_MASK_DS, tone = mnS.sec===5 ? "10,2,2" : mnS.sec===3 ? "6,0,10" : "3,2,6";
  m.globalCompositeOperation = "source-over"; m.globalAlpha = 1;
  m.clearRect(0, 0, mw, mh);
  m.fillStyle = `rgba(${tone},${base})`; m.fillRect(0, 0, mw, mh);
  m.globalCompositeOperation = "destination-out";
  const hole = (x, y, r, a)=>{ if(a <= 0.01) return; const sx = (x - V.x)*k, sy = (y - V.y)*k, sr = r*k; if(sx + sr < 0 || sy + sr < 0 || sx - sr > mw || sy - sr > mh) return; m.globalAlpha = Math.min(1, a); m.drawImage(_mnHole, sx - sr, sy - sr, sr*2, sr*2); };
  for(const L of mnS.lights){ const a = mnLightInt(L); if(a > 0) hole(L.x, L.y - 20, L.r*(0.92 + 0.04*Math.sin(animNow/140 + L.i)), a); }
  heroes.forEach((h, i)=>{ if(h.alive) hole(h.x, h.y - 20, mnTorchR(i)*(h===player ? 1.05 : 0.95), 0.95); });
  // el portal, el fuego de Cerbero y los parches ardientes también alumbran
  if(mnS.portal.st!=="none"){ const G = MN_SECTORS[5].portal; hole(G.x, G.y, 360 + 30*Math.sin(animNow/300), 0.9); }
  for(const F of mnS.fire) hole(F.x, F.y, F.r*2, 0.5);
  for(const e of enemies){ if(e.alive && e.mnFlame) hole(e.mnFlame.x, e.mnFlame.y, 260, 0.6); }
  // zonas de oscuridad: se vuelven a tapar
  m.globalCompositeOperation = "source-over";
  for(const Z of mnS.zones){ const a = Math.min(1, Z.t/300, (Z.d - Z.t)/500)*0.92; const sx = (Z.x - V.x)*k, sy = (Z.y - V.y)*k, sr = Z.r*1.35*k; m.globalAlpha = a; m.drawImage(_mnBlot, sx - sr, sy - sr, sr*2, sr*2); }
  m.globalAlpha = 1;
  ctx.save(); ctx.imageSmoothingEnabled = true;
  ctx.drawImage(_mnMask, V.x, V.y, mw*MN_MASK_DS, mh*MN_MASK_DS);
  ctx.restore();
}
