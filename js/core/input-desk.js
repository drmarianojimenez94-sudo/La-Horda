"use strict";
/* ============================================================
   js/core/input-desk.js
   Controles de ESCRITORIO y de MANDO, más las guías de primera vez de los controles.
   Todo termina en las mismas variables/funciones que usan los controles táctiles (joyVec,
   basicHeld, useSkill, useUltimate...), así que el cooperativo y la simulación no cambian.

   TECLADO                              MANDO (Gamepad API, mapeo estándar tipo Xbox)
   - WASD / flechas: moverse            - stick izquierdo / cruceta: moverse
   - Espacio o J (o clic izquierdo      - A: atacar (mantener)
     sobre el mapa): atacar             - X / Y / B: habilidades 1 / 2 / 3
   - 1 / 2 / 3: habilidades             - RB o RT: Definitiva
     (apuntan al mouse si está sobre    - LB: curación de emergencia
     el mapa; si no, al mejor objetivo) - LT: revivir / acción (mantener)
   - R o 4: Definitiva                  - R3 (apretar el stick derecho): Pacto (Nigromante)
   - Q: curación · E: revivir/acción    - stick derecho: apuntar las habilidades
   - F: Pacto (Nigromante)              - Start / Select: pausa y continuar
   - Esc o P: pausa y continuar
   Las teclas se muestran en los botones apenas se usa el teclado (o si el aparato tiene mouse y no
   pantalla táctil); con mando, las letras del mando.
   ============================================================ */
const DESK = { codes:new Set(), kbVec:{x:0,y:0}, gpVec:{x:0,y:0}, drove:false,
  mouse:{x:0, y:0, on:false}, mouseBasic:false, kbBasic:false, gpBasic:false,
  sylvaSrc:null, gp:{prev:[], aim:null, on:false, ctx:false}, device:null };
const KB_MOVE = { KeyW:[0,-1], KeyA:[-1,0], KeyS:[0,1], KeyD:[1,0], ArrowUp:[0,-1], ArrowLeft:[-1,0], ArrowDown:[0,1], ArrowRight:[1,0] };
const KB_SKILL = { Digit1:0, Digit2:1, Digit3:2, Numpad1:0, Numpad2:1, Numpad3:2 };
const SKILL_BTN_IDS = ["btn-s1","btn-s2","btn-s3"];

function _deskTyping(ev){
  const t = ev && ev.target; if(!t) return false;
  const tag = t.tagName;
  return tag==="INPUT" || tag==="TEXTAREA" || tag==="SELECT" || !!t.isContentEditable;
}
// pantallas encima de la partida que manejan su propio Esc/Enter (Hechicero, historia, campamento)
function _deskOverlayOpen(){
  try{
    if(typeof RUN_INTRO!=="undefined" && RUN_INTRO.open) return true;
    if(typeof STORY_CINE!=="undefined" && STORY_CINE.open) return true;
    if(typeof CAMP!=="undefined" && CAMP.open) return true;
  }catch(e){}
  return false;
}
function _deskOptionsOpen(){ const o = document.getElementById("hub-options"); return !!(o && !o.classList.contains("hidden")); }
// Qué se usó por última vez: cambia las teclas que se muestran en los botones y el texto de la guía.
function deskSetDevice(d){
  if(DESK.device===d) return;
  DESK.device = d;
  const b = document.body; if(!b) return;
  b.classList.toggle("inp-kb", d==="kb");
  b.classList.toggle("inp-pad", d==="pad");
}
// Aparato con mouse y sin pantalla táctil: las teclas se ven desde el principio.
(function(){
  try{
    const fine = window.matchMedia && window.matchMedia("(pointer: fine)").matches;
    const touch = ("ontouchstart" in window) || (navigator.maxTouchPoints||0) > 0;
    const set = ()=>{ if(fine && !touch) deskSetDevice("kb"); };
    if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", set); else set();
  }catch(e){}
})();
// un toque en la pantalla vuelve a los textos táctiles
window.addEventListener("pointerdown", (e)=>{ if(e.pointerType==="touch") deskSetDevice("touch"); }, {capture:true, passive:true});

/* ---------------- movimiento (teclado + mando) ---------------- */
function _deskKbVec(){
  let x = 0, y = 0;
  for(const c of DESK.codes){ const v = KB_MOVE[c]; if(v){ x += v[0]; y += v[1]; } }
  const l = Math.hypot(x, y);
  DESK.kbVec = l ? {x:x/l, y:y/l} : {x:0, y:0};
}
// El joystick táctil manda; si no se está usando, teclado + mando escriben joyVec.
function deskApplyMove(){
  if(typeof joyActive!=="undefined" && joyActive) { DESK.drove = false; return; }
  let x = DESK.kbVec.x + DESK.gpVec.x, y = DESK.kbVec.y + DESK.gpVec.y;
  const l = Math.hypot(x, y);
  if(l > 0.01){ if(l > 1){ x /= l; y /= l; } joyVec = {x, y}; DESK.drove = true; }
  else if(DESK.drove){ joyVec = {x:0, y:0}; DESK.drove = false; }
}
function _deskBasicSync(){ basicHeld = DESK.kbBasic || DESK.mouseBasic || DESK.gpBasic || (typeof basicPtr!=="undefined" && basicPtr!==null); }

/* ---------------- apuntado con mouse / stick derecho ---------------- */
function _deskMouseWorld(){
  if(!DESK.mouse.on || !player || typeof CAM_ZOOM==="undefined") return null;
  const r = canvas.getBoundingClientRect();
  const sx = DESK.mouse.x - r.left, sy = DESK.mouse.y - r.top;
  const x = player.x + CAM_LEAD_X + (sx - VW/2)/CAM_ZOOM;
  const y = player.y - CAM_LIFT + CAM_LEAD_Y + (sy - (VH/2 - CAM_Y_ANCHOR))/CAM_ZOOM;
  return {x, y};
}
// Punto/dirección a mano para la habilidad idx (mismo formato que manualAimWorld de aim.js), o null = automático.
function deskAimWorld(idx){
  if(!player || !player.cls) return null;
  const sk = player.cls.skills[idx];
  const range = (typeof aimRangeOf==="function" ? aimRangeOf(player, sk, idx) : 0) || 300;
  if(DESK.gp.aim){
    const a = DESK.gp.aim;
    return {x:player.x + a.x*range*0.8, y:player.y + a.y*range*0.8, dx:a.x, dy:a.y};
  }
  if(DESK.device==="kb"){
    const m = _deskMouseWorld(); if(!m) return null;
    const dx = m.x - player.x, dy = m.y - player.y, l = Math.hypot(dx, dy);
    if(l < 8) return null;
    return {x:m.x, y:m.y, dx:dx/l, dy:dy/l};
  }
  return null;
}

/* ---------------- habilidades, Definitiva, pausa ---------------- */
function _deskFlash(el){ if(!el) return; el.classList.remove("key-press"); void el.offsetWidth; el.classList.add("key-press"); }
// down=true al apretar la tecla/botón, false al soltarla (solo importa para la carga de Sylva).
function deskSkill(idx, down, src){
  if(!player || !player.cls || state!=="playing") return;
  const el = document.getElementById(SKILL_BTN_IDS[idx]);
  const sk = player.cls.skills[idx]; if(!sk) return;
  const isSylva = player.classKey==="cazadora" && sk.kind==="piercing_shot";
  if(!down){
    if(DESK.sylvaSrc===src+idx){ DESK.sylvaSrc = null; if(el) el.classList.remove("aiming"); sylvaChargeRelease(deskAimWorld(idx)); }
    return;
  }
  if(typeof aimState!=="undefined" && aimState) return; // se está apuntando con el dedo
  if(!_skillReadyFor(idx)){ if(el) _denyFeedback(el, idx); return; }
  _deskFlash(el);
  if(isSylva){ if(sylvaChargeStart()){ DESK.sylvaSrc = src+idx; if(el) el.classList.add("aiming"); } return; }
  const aim = aimProfileOf(sk) ? deskAimWorld(idx) : null;
  const ok = aim ? useSkill(idx, aim) : useSkill(idx);
  if(!ok && el) _denyFeedback(el, idx);
}
function deskUlt(){ if(state==="playing"){ _deskFlash(document.getElementById("btn-ult")); useUltimate(); } }
function deskPact(){
  const b = document.getElementById("btn-pact");
  if(!b || b.classList.contains("hidden") || state!=="playing") return;
  b.dispatchEvent(new PointerEvent("pointerdown", {bubbles:true, cancelable:true}));
}
function deskCtx(on){
  const btn = document.getElementById("btn-revive"); if(!btn) return;
  btn.dispatchEvent(new PointerEvent(on ? "pointerdown" : "pointerup", {bubbles:true}));
}
function deskPauseToggle(){
  if(_deskOptionsOpen()){ if(typeof closeHubOptions==="function") closeHubOptions(); return; }
  const ps = document.getElementById("pause-screen");
  if(state==="playing" && ps && !ps.classList.contains("hidden")){ document.getElementById("resume-btn").click(); return; } // online: menú abierto
  if(state==="playing"){ document.getElementById("pause-btn").click(); return; }
  if(state==="paused"){ document.getElementById("resume-btn").click(); }
}
// Suelta todo lo que el teclado/mando esté manteniendo (lo llama inputResetAll de input.js).
function deskInputReset(){
  DESK.codes.clear(); DESK.kbVec = {x:0,y:0}; DESK.gpVec = {x:0,y:0};
  DESK.kbBasic = DESK.mouseBasic = DESK.gpBasic = false;
  if(DESK.drove){ joyVec = {x:0,y:0}; DESK.drove = false; }
  if(DESK.sylvaSrc!==null && player){ player.sylvaCharging = false; player.sylvaChargeTimer = 0; if(typeof netIsGuest==="function" && netIsGuest()) netSendToHost({k:"sylva", on:false, aim:null, cancel:true}); }
  DESK.sylvaSrc = null;
  for(const id of SKILL_BTN_IDS){ const el = document.getElementById(id); if(el && !(typeof aimState!=="undefined" && aimState && aimState.el===el)) el.classList.remove("aiming"); }
  if(DESK.gp.ctx){ DESK.gp.ctx = false; deskCtx(false); }
}

/* ---------------- teclado ---------------- */
const KB_GAME_CODES = new Set(["Space","KeyJ","KeyR","Digit4","Numpad4","KeyF","Escape","KeyP"].concat(Object.keys(KB_MOVE), Object.keys(KB_SKILL)));
window.addEventListener("keydown", (ev)=>{
  if(_deskTyping(ev)) return;
  const c = ev.code;
  if((c==="Escape" || c==="KeyP") && !ev.repeat){
    // Esc: cierra Opciones si están abiertas; en partida, pausa / continuar
    if(_deskOptionsOpen()){ ev.preventDefault(); if(typeof closeHubOptions==="function") closeHubOptions(); return; }
    if((state==="playing" || state==="paused") && !_deskOverlayOpen()){ ev.preventDefault(); deskPauseToggle(); }
    return;
  }
  if(state!=="playing") return;
  if(!KB_GAME_CODES.has(c) && ev.key!=="q" && ev.key!=="Q" && ev.key!=="e" && ev.key!=="E") return;
  // que Espacio/flechas no "aprieten" el último botón que quedó con foco (la pausa, un menú) ni scrolleen
  ev.preventDefault();
  deskSetDevice("kb");
  if(KB_MOVE[c]){ DESK.codes.add(c); _deskKbVec(); deskApplyMove(); return; }
  if(ev.repeat) return;
  if(c==="Space" || c==="KeyJ"){ DESK.kbBasic = true; _deskBasicSync(); return; }
  if(c in KB_SKILL){ deskSkill(KB_SKILL[c], true, "k"); return; }
  if(c==="KeyR" || c==="Digit4" || c==="Numpad4"){ deskUlt(); return; }
  if(c==="KeyF"){ deskPact(); return; }
});
window.addEventListener("keyup", (ev)=>{
  const c = ev.code;
  if(KB_MOVE[c]){ DESK.codes.delete(c); _deskKbVec(); deskApplyMove(); }
  if(c==="Space" || c==="KeyJ"){ DESK.kbBasic = false; _deskBasicSync(); if(state==="playing") ev.preventDefault(); }
  if(c in KB_SKILL) deskSkill(KB_SKILL[c], false, "k");
});

/* ---------------- mouse sobre el mapa ---------------- */
(function(){
  const cv = document.getElementById("game"); if(!cv) return;
  cv.addEventListener("pointermove", (e)=>{ if(e.pointerType==="mouse"){ DESK.mouse.x = e.clientX; DESK.mouse.y = e.clientY; DESK.mouse.on = true; } });
  cv.addEventListener("pointerleave", (e)=>{ if(e.pointerType==="mouse") DESK.mouse.on = false; });
  cv.addEventListener("pointerdown", (e)=>{
    if(e.pointerType!=="mouse" || e.button!==0 || state!=="playing") return;
    DESK.mouse.x = e.clientX; DESK.mouse.y = e.clientY; DESK.mouse.on = true;
    DESK.mouseBasic = true; _deskBasicSync();
    try{ cv.setPointerCapture(e.pointerId); }catch(_){}
  });
  const up = (e)=>{ if(e.pointerType==="mouse" && DESK.mouseBasic){ DESK.mouseBasic = false; _deskBasicSync(); } };
  cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up); cv.addEventListener("lostpointercapture", up);
  cv.addEventListener("contextmenu", (e)=> e.preventDefault());
  // después de tocar un botón con el mouse (pausa, continuar) el foco no se queda en él: si no, Espacio lo volvía a apretar
  document.addEventListener("click", (e)=>{
    const b = e.target && e.target.closest && e.target.closest("#pause-btn, #mute-btn, #resume-btn, .skill-plus");
    if(b && typeof b.blur==="function") setTimeout(()=>{ try{ b.blur(); }catch(_){} }, 0);
  }, true);
})();

/* ---------------- mando (Gamepad API) ---------------- */
const GP_DEAD = 0.28;
function _gpPad(){
  if(typeof navigator==="undefined" || typeof navigator.getGamepads!=="function") return null;
  let list; try{ list = navigator.getGamepads(); }catch(e){ return null; }
  if(!list) return null;
  for(const g of list) if(g && g.connected!==false && g.buttons && g.buttons.length) return g;
  return null;
}
function _gpBtn(g, i){ const b = g.buttons[i]; return !!(b && (b.pressed || (typeof b.value==="number" && b.value > 0.5))); }
function deskGamepadTick(){
  const g = _gpPad();
  if(!g){ if(DESK.gp.on){ DESK.gp.on = false; DESK.gpVec = {x:0,y:0}; DESK.gp.aim = null; if(DESK.gpBasic){ DESK.gpBasic = false; _deskBasicSync(); } deskApplyMove(); } return; }
  const prev = DESK.gp.prev, now = [];
  for(let i=0;i<Math.min(18, g.buttons.length);i++) now[i] = _gpBtn(g, i);
  const edge = i => now[i] && !prev[i], rel = i => !now[i] && prev[i];
  DESK.gp.prev = now;
  const ax = g.axes || [];
  let mx = Math.abs(ax[0]||0) > GP_DEAD ? ax[0] : 0, my = Math.abs(ax[1]||0) > GP_DEAD ? ax[1] : 0;
  if(now[14]) mx = -1; if(now[15]) mx = 1; if(now[12]) my = -1; if(now[13]) my = 1;
  const rx = ax[2]||0, ry = ax[3]||0, rl = Math.hypot(rx, ry);
  DESK.gp.aim = rl > 0.45 ? {x:rx/rl, y:ry/rl} : null;
  const any = mx || my || now.some(Boolean) || rl > 0.45;
  if(any){ DESK.gp.on = true; deskSetDevice("pad"); }
  if(edge(9) || edge(8)) deskPauseToggle();
  if(state!=="playing"){
    if(DESK.gpVec.x || DESK.gpVec.y){ DESK.gpVec = {x:0,y:0}; deskApplyMove(); }
    if(DESK.gpBasic){ DESK.gpBasic = false; _deskBasicSync(); }
    return;
  }
  const l = Math.hypot(mx, my);
  DESK.gpVec = l > 1 ? {x:mx/l, y:my/l} : {x:mx, y:my};
  deskApplyMove();
  if(now[0]!==DESK.gpBasic){ DESK.gpBasic = now[0]; _deskBasicSync(); }
  [[2,0],[3,1],[1,2]].forEach(([b, idx])=>{ if(edge(b)) deskSkill(idx, true, "g"); else if(rel(b)) deskSkill(idx, false, "g"); });
  if(edge(5) || edge(7)) deskUlt();
  if(edge(4) && typeof emergPress==="function") emergPress();
  if(edge(11)) deskPact();
  if(edge(6)){ DESK.gp.ctx = true; deskCtx(true); } else if(rel(6) && DESK.gp.ctx){ DESK.gp.ctx = false; deskCtx(false); }
}

/* ---------------- guía de controles de la primera partida ----------------
   Acompaña los tres primeros consejos del Hechicero (js/systems/tutorial.js: b_move, b_attack,
   b_skill) SIN texto nuevo: un aro que late sobre el joystick, sobre Ataque o sobre las habilidades
   (y la perilla que "muestra" el gesto), y se va solo apenas el jugador lo hace. El texto lo pone el
   Hechicero, adaptado a teclado/mando con ctlHint(). */
function ctlHint(kind){
  const d = DESK.device;
  if(d==="pad") return {move:"Movete con el stick izquierdo", attack:"Mantené A para pelear", skill:"Apretá X, Y o B (el stick derecho apunta)"}[kind];
  if(d==="kb") return {move:"Movete con WASD o las flechas", attack:"Mantené Espacio (o clic) para pelear", skill:"Apretá 1, 2 o 3 (apuntan al mouse)"}[kind];
  const thumb = typeof PREFS!=="undefined" && PREFS.lefty ? "pulgar derecho" : "pulgar izquierdo"; // modo zurdo
  return {move:"Movete con el joystick ("+thumb+")", attack:"Mantené Ataque para pelear", skill:"Tocá una habilidad (mantené y arrastrá para apuntar)"}[kind];
}
let _onbCls = "";
function deskOnboardTick(){
  let want = "";
  if(state==="playing" && typeof TUT!=="undefined" && TUT.key && !TUT.ducked && player && player.alive){
    if(TUT.key==="b_move" && !(joyActive || Math.hypot(joyVec.x, joyVec.y) > 0.1)) want = "onb-move";
    else if(TUT.key==="b_attack" && !basicHeld) want = "onb-attack";
    else if(TUT.key==="b_skill" && !(typeof aimState!=="undefined" && aimState) && !(player.cds && player.cds.some(c=>c>0))) want = "onb-skill";
  }
  if(want===_onbCls) return;
  const b = document.body;
  if(_onbCls) b.classList.remove(_onbCls);
  if(want) b.classList.add(want);
  _onbCls = want;
}

/* ---------------- teclas en los botones ---------------- */
(function(){
  const HINTS = { "btn-basic":["Espacio","A"], "btn-s1":["1","X"], "btn-s2":["2","Y"], "btn-s3":["3","B"], "btn-ult":["R","RB"],
    "btn-emerg":["Q","LB"], "btn-pact":["F","R3"], "btn-revive":["E","LT"], "pause-btn":["Esc","Start"] };
  const add = ()=>{
    for(const id in HINTS){
      const el = document.getElementById(id); if(!el || el.querySelector(".kh")) continue;
      const s = document.createElement("span"); s.className = "kh"; s.setAttribute("aria-hidden", "true");
      s.dataset.kb = HINTS[id][0]; s.dataset.pad = HINTS[id][1];
      el.appendChild(s);
    }
  };
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", add); else add();
})();

// un solo bucle liviano para el mando y la guía (no depende del bucle del juego: la pausa también lo escucha)
(function loop(){
  try{ deskGamepadTick(); deskOnboardTick(); }catch(e){ if(typeof console!=="undefined") console.warn("input-desk", e); }
  requestAnimationFrame(loop);
})();
// al rotar el teléfono o cambiar a modo zurdo, los "+" de subir habilidad se vuelven a ubicar junto a su botón
window.addEventListener("resize", ()=> setTimeout(()=>{ if(typeof positionSkillPlusButtons==="function" && state==="playing") positionSkillPlusButtons(); }, 80));
