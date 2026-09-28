"use strict";
/* ============================================================
   js/rendering/juice.js
   Sensación de combate, segunda capa (la primera está en feedback.js):
     - opción "Reducir movimiento" (pausa): apaga sacudidas, hit-stop, cámara lenta, adelanto
       de cámara y los latidos/pops de pantalla;
     - sacudida de cámara con curva (decae exponencial, ruido suave en vez de saltos al azar
       cuadro a cuadro) y tope más bajo en pantallas táctiles;
     - adelanto de cámara (lead) hacia donde apuntás/caminás y "golpe de zoom" corto;
     - racha de bajas (combo) visible con una recompensa chica: un sorbo de energía;
     - subida de nivel y ulti lista con su momento propio;
     - silueta blanca cacheada para el destello de golpe (todos los caminos de dibujo de sprites).
   RED: nada de esto toca el tiempo de simulación del anfitrión. En partidas online el hit-stop
   es un freeze-frame puramente visual (el cuadro se sostiene; la simulación sigue) y la cámara
   lenta se reemplaza por un golpe de zoom. Todo es local a cada pantalla.
   Barato: sin shadowBlur ni filtros; pools fijos, sprites cacheados.
   ============================================================ */

/* ---------------- Opciones (por dispositivo, como el volumen) ---------------- */
const JUICE = {reduceMotion:false};
// Contadores para las pruebas (tools/regression/t_juice.js) y para medir en campo.
const JUICE_STATS = {hitStop:0, freeze:0, slowMo:0, punch:0, shake:0, vignette:0, streak:0, streakReward:0, levelUp:0, ultReady:0};
(function(){
  try{
    const v = localStorage.getItem("horda_motion");
    if(v!==null) JUICE.reduceMotion = v==="1";
    else JUICE.reduceMotion = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }catch(e){}
})();
function setReduceMotion(on){
  JUICE.reduceMotion = !!on;
  try{ localStorage.setItem("horda_motion", on ? "1" : "0"); }catch(e){}
  try{ document.body.classList.toggle("reduce-motion", JUICE.reduceMotion); const el = document.getElementById("opt-reduce-motion"); if(el) el.checked = JUICE.reduceMotion; }catch(e){}
  if(on){ screenShake = 0; hitStopTimer = 0; hitFreezeTimer = 0; slowMoTimer = 0; slowMoScale = 1; camPunchT = 0; CAM_LEAD_X = 0; CAM_LEAD_Y = 0; }
}
// casilla de la pausa (index.html #opt-reduce-motion) + clase en <body> para los pops del HUD (hud.css)
(function(){
  const apply = ()=>{ try{ document.body.classList.toggle("reduce-motion", JUICE.reduceMotion); }catch(e){} };
  const bind = ()=>{
    apply();
    const el = document.getElementById("opt-reduce-motion"); if(!el) return;
    el.checked = JUICE.reduceMotion;
    el.addEventListener("change", ()=>{ setReduceMotion(el.checked); apply(); });
  };
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", bind); else bind();
})();
function juiceNet(){ return typeof netMatch!=="undefined" && !!netMatch; }
const JUICE_TOUCH = (function(){ try{ return !!(window.matchMedia && window.matchMedia("(pointer: coarse)").matches); }catch(e){ return false; } })();

/* ---------------- Freeze-frame visual (partidas online) ---------------- */
// En red el hit-stop no puede frenar la simulación (el anfitrión simula para todos y el invitado
// predice su propio movimiento): se sostiene el último cuadro dibujado unos ms. Cero costo.
let hitFreezeTimer = 0;
function juiceFrameHold(realDt){
  if(hitFreezeTimer <= 0) return false;
  hitFreezeTimer -= realDt;
  return true;
}

/* ---------------- Sacudida con curva y tope ---------------- */
const SHAKE_CAP = JUICE_TOUCH ? 6 : 9;     // desplazamiento máximo (unidades del mundo)
const _shk = {x:0, y:0};
// decae exponencial (golpe seco al principio, cola corta) + un piso lineal para terminar en 0
function screenShakeDecay(dt){
  if(screenShake <= 0) return;
  screenShake = screenShake*Math.exp(-dt/150) - dt*0.004;
  if(screenShake < 0.25) screenShake = 0;
}
// desplazamiento del cuadro: suma de senos desfasados (~10-15 Hz) -> vibra sin "temblequeo" al azar
function juiceShakeOffset(){
  _shk.x = 0; _shk.y = 0;
  if(screenShake <= 0 || JUICE.reduceMotion) return _shk;
  const amp = Math.min(SHAKE_CAP, screenShake*0.5), t = animNow/1000;
  _shk.x = amp*(0.62*Math.sin(t*61.3 + 1.7) + 0.38*Math.sin(t*97.1 + 0.3));
  _shk.y = amp*(0.62*Math.sin(t*53.9 + 4.1) + 0.38*Math.sin(t*89.7 + 2.2));
  return _shk;
}

/* ---------------- Adelanto de cámara y golpe de zoom ---------------- */
let CAM_LEAD_X = 0, CAM_LEAD_Y = 0;
const CAM_LEAD_MAX = 30;                    // unidades del mundo (~2% del ancho visible): se siente, no marea
function updateCamLead(dt){
  let tx = 0, ty = 0;
  if(state==="playing" && player && player.alive && !JUICE.reduceMotion && !player.duelActive && !CAM_LIFT){
    let dx = facing.x, dy = facing.y;
    if(typeof aimState!=="undefined" && aimState && aimState.manual){ const l = Math.hypot(aimState.dx, aimState.dy)||1; dx = aimState.dx/l; dy = aimState.dy/l; }
    const mv = Math.min(1, Math.hypot(joyVec.x, joyVec.y) + (aimState && aimState.manual ? 1 : 0));
    const k = 0.35 + 0.65*mv;               // quieto: adelanto chico hacia donde mira
    tx = dx*CAM_LEAD_MAX*k; ty = dy*CAM_LEAD_MAX*0.55*k;
  }
  const a = 1 - Math.exp(-Math.min(64, dt)/420);
  CAM_LEAD_X += (tx - CAM_LEAD_X)*a; CAM_LEAD_Y += (ty - CAM_LEAD_Y)*a;
  if(Math.abs(CAM_LEAD_X) < 0.05) CAM_LEAD_X = 0;
  if(Math.abs(CAM_LEAD_Y) < 0.05) CAM_LEAD_Y = 0;
}
let camPunchT = 0, camPunchDur = 1, camPunchAmt = 0;
// zoom corto hacia adentro que vuelve solo (muerte de élite/jefe, remate pesado; en red reemplaza la cámara lenta)
function camPunch(amt, ms){
  if(JUICE.reduceMotion) return;
  if(camPunchT > 0 && camPunchAmt*(camPunchT/camPunchDur) >= amt) return;
  camPunchAmt = Math.min(0.08, amt); camPunchDur = camPunchT = ms||260;
  JUICE_STATS.punch++;
}
function camPunchZoom(){
  if(camPunchT <= 0) return 1;
  const q = 1 - camPunchT/camPunchDur;                       // 0 -> 1
  const e = q < 0.18 ? q/0.18 : 1 - (q-0.18)/0.82;           // entra rápido, sale suave
  return 1 + camPunchAmt*Math.max(0, e*e*(3-2*e));
}

/* ---------------- Racha de bajas (combo) ---------------- */
// Cuenta las bajas seguidas del guardián (las decide el anfitrión con el tiempo de simulación).
// Cada escalón da un sorbo de energía: chico a propósito (no cambia el balance del daño ni la XP).
const STREAK_GAP = 2600;                    // ms sin bajas y la racha se corta
const STREAK_TIERS = [15, 30, 50, 75, 100];
const STREAK_ENERGY = 0.08;                 // 8% de la energía máxima por escalón
function streakTierOf(n){ return STREAK_TIERS.indexOf(n) >= 0 || (n > 100 && n % 50 === 0); }
function juiceOnKill(k){
  if(!k || !k.classKey || !(k===player || k.isRemote)) return;
  const now = runElapsedMs;
  if(!(k._stkAt > now - STREAK_GAP)) k._stk = 0;
  k._stk = (k._stk||0) + 1; k._stkAt = now;
  const n = k._stk, tier = streakTierOf(n);
  if(tier && k.alive && k.maxEnergy){
    k.energy = Math.min(k.maxEnergy, (k.energy||0) + k.maxEnergy*STREAK_ENERGY);
    JUICE_STATS.streakReward++;
  }
  if(k===player) juiceStreakShow(n, tier ? 1 : 0);
  else if(typeof netEmitTo==="function") netEmitTo(k._netSlot, "juiceStreakShow", [n, tier ? 1 : 0]);
}
let streakN = 0, streakShowT = 0, streakPop = 0, streakTierT = 0;
function juiceStreakShow(n, tier){
  streakN = n; streakShowT = STREAK_GAP; streakPop = 1; JUICE_STATS.streak++;
  if(tier){
    streakTierT = 900;
    const q = ()=>{ playSfx("ready"); if(player) vfxShock(player.x, player.y, 12, 70, "255,207,92", 320, 1); };
    if(typeof netQuiet==="function") netQuiet(q); else q();
  }
}

/* ---------------- Subir de nivel / ulti lista ---------------- */
function juiceLevelUp(champKey, level){
  if(state!=="playing" || !player || champKey!==player.classKey) return;
  JUICE_STATS.levelUp++;
  const x = player.x, y = player.y;
  vfxShock(x, y, 16, 140, "255,220,140", 620, 2);
  vfxBurst(x, y - 30, 18, "holy", 150, 700, 3, 2, -120, 1);
  floatText(x, y - 70, "¡NIVEL " + level + "!", "crit");
  const q = ()=>{ flashScreen(0.14, "255,230,160"); camPunch(0.03, 320); };
  if(typeof netQuiet==="function") netQuiet(q); else q();
}
function juiceUltReady(){
  JUICE_STATS.ultReady++;
  if(!player) return;
  const q = ()=>{ vfxShock(player.x, player.y, 14, 96, "255,179,0", 460, 2); playSfx("ready"); };
  if(typeof netQuiet==="function") netQuiet(q); else q();
}

/* ---------------- Golpes propios de un invitado ---------------- */
// El anfitrión calcula el daño; al invitado le llega este evento personal para sentir SUS golpes
// pesados (freeze-frame visual + sacudida) igual que el anfitrión siente los suyos.
function juiceHitLocal(pow, big, w){
  w = Math.max(1, Math.min(1.8, w||1));
  if(pow >= 4){ hitStop(70); vfxShake(7); flashScreen(0.14); }
  else if(pow >= 3){ hitStop((big ? 50 : 36)*Math.min(1.3, w)); vfxShake((big ? 4 : 2.5)*Math.min(1.4, w)); }
}

/* ---------------- Silueta blanca para el destello de golpe ---------------- */
// Antes el destello era una copia "lighter" del mismo sprite: en sprites oscuros apenas aclaraba y
// en claros quemaba. Ahora, mientras ANIM_WHITE está prendido, los primitivos de dibujo de sprites
// (drawAnimFrame / drawAnimFrameSized / drawSprite) usan una silueta blanca del cuadro, cacheada.
let ANIM_WHITE = false;
const _whiteCache = new Map();
let _whitePx = 0, _whiteNew = 0, _whiteSeq = 0;
const WHITE_PX_BUDGET = 3000000;            // ~12 MB como mucho entre todas las siluetas
function whiteFrameBegin(){ _whiteNew = 0; }
function whiteFrame(img, sx, sy, sw, sh){
  if(!img || sw <= 0 || sh <= 0) return null;
  if(img.naturalWidth===0) return null; // imagen todavía sin bajar: no se cachea una silueta vacía
  let id = img.__wid; if(id===undefined){ try{ id = img.__wid = ++_whiteSeq; }catch(e){ return null; } }
  const key = id + ":" + sx + ":" + sy + ":" + sw + ":" + sh;
  let c = _whiteCache.get(key);
  if(c) return c;
  if(_whiteNew >= 6 || sw*sh > 200000) return null; // pocas siluetas nuevas por cuadro: nunca un pico
  _whiteNew++;
  sw = Math.ceil(sw); sh = Math.ceil(sh);
  c = document.createElement("canvas"); c.width = sw; c.height = sh;
  const g = c.getContext("2d");
  try{ g.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh); }catch(e){ return null; }
  g.globalCompositeOperation = "source-in"; g.fillStyle = "#fff"; g.fillRect(0, 0, sw, sh);
  _whiteCache.set(key, c); _whitePx += sw*sh;
  while(_whitePx > WHITE_PX_BUDGET && _whiteCache.size > 1){
    const k0 = _whiteCache.keys().next().value, c0 = _whiteCache.get(k0);
    _whitePx -= c0.width*c0.height; _whiteCache.delete(k0);
  }
  return c;
}

/* ---------------- Tiempo real (lo llama updateFeedback) ---------------- */
function updateJuice(dt){
  if(camPunchT > 0) camPunchT = Math.max(0, camPunchT - dt);
  if(streakShowT > 0){ streakShowT -= dt; if(streakShowT <= 0) streakN = 0; }
  if(streakPop > 0) streakPop = Math.max(0, streakPop - dt/180);
  if(streakTierT > 0) streakTierT = Math.max(0, streakTierT - dt);
  if(player) updateCamLead(dt);
}
function resetJuice(){
  hitFreezeTimer = 0; camPunchT = 0; streakN = 0; streakShowT = 0; streakPop = 0; streakTierT = 0;
  CAM_LEAD_X = 0; CAM_LEAD_Y = 0;
}

/* ---------------- Dibujo: contador de racha ---------------- */
function drawStreakHud(){
  if(streakN < 5 || streakShowT <= 0) return;
  const a = Math.min(1, streakShowT/400);
  const pop = JUICE.reduceMotion ? 1 : 1 + 0.35*streakPop*streakPop;
  const x = VW - 20, y = Math.round(VH*0.36);
  const hot = streakN >= 50 ? "#ff8a3d" : (streakN >= 15 ? "#ffcf5c" : "#ffe7a8");
  ctx.save();
  ctx.globalAlpha = a;
  ctx.textAlign = "right"; ctx.textBaseline = "alphabetic"; ctx.lineJoin = "round";
  ctx.font = "bold 11px Georgia, serif";
  ctx.lineWidth = 3; ctx.strokeStyle = "rgba(0,0,0,0.85)"; ctx.strokeText("RACHA", x, y - 26);
  ctx.fillStyle = "#e8d8b0"; ctx.fillText("RACHA", x, y - 26);
  ctx.save(); ctx.translate(x, y); ctx.scale(pop, pop);
  ctx.font = "bold 26px Georgia, serif";
  const txt = "×" + streakN;
  ctx.lineWidth = 4; ctx.strokeStyle = "rgba(40,8,0,0.95)"; ctx.strokeText(txt, 0, 0);
  ctx.fillStyle = streakTierT > 0 && ((streakTierT/90)|0) % 2 ? "#ffffff" : hot; ctx.fillText(txt, 0, 0);
  ctx.restore();
  // barra que se vacía: cuánto queda para seguir la racha
  const w = 64, q = Math.max(0, streakShowT/STREAK_GAP);
  ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(x - w, y + 6, w, 4);
  ctx.fillStyle = hot; ctx.fillRect(x - w*q, y + 6, w*q, 4);
  if(streakTierT > 0){
    ctx.globalAlpha = a*Math.min(1, streakTierT/300);
    ctx.font = "bold 11px Georgia, serif"; ctx.lineWidth = 3; ctx.strokeStyle = "rgba(0,0,0,0.85)";
    ctx.strokeText("+energía", x, y + 24); ctx.fillStyle = "#7ec8ff"; ctx.fillText("+energía", x, y + 24);
  }
  ctx.restore();
}
