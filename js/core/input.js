"use strict";
/* ============================================================
   js/core/input.js
   Controles en partida: joystick, botones de ataque/habilidades/ulti, carga de la
   Flecha Perforante de Sylva, botón de revivir y pausa.
   ============================================================ */

/* ============================================================
   INPUT: joystick + buttons
   ============================================================ */
const joyBase = document.getElementById("joy-base");
const joyKnob = document.getElementById("joy-knob");
const joyZone = document.getElementById("joyzone");
let joyActive=false, joyId=null, joyVec={x:0,y:0};
const JOY_MAX = 36;
const JOY_CENTER = 25; // (92-42)/2: centra el knob dentro de la base más chica

// Joystick FLOTANTE: si el pulgar apoya dentro de la base, la base queda donde está; si apoya en otro
// lugar de la zona izquierda (lo normal con dedos grandes y sin mirar), la base salta abajo del dedo y
// se mide desde ahí. Antes medía siempre desde la base fija: apoyar un poco más arriba ya era "caminar
// a fondo" en una dirección que el jugador no eligió. Al soltar vuelve a su lugar.
let joyOrigin = null; // centro de medición mientras el dedo está apoyado (coordenadas de pantalla)
function joyCenter(){
  if(joyOrigin) return joyOrigin;
  const r = joyBase.getBoundingClientRect();
  return {x:r.left+r.width/2, y:r.top+r.height/2};
}
let joyOff = {x:0, y:0}; // cuánto se corrió la base de su lugar (lo suma también la perilla)
function _joyPlaceBase(dx, dy){
  joyOff = {x:dx||0, y:dy||0};
  joyBase.style.transform = dx||dy ? `translate(${dx}px,${dy}px)` : "";
}
function _joyHomeCenter(){
  _joyPlaceBase(0, 0);
  const r = joyBase.getBoundingClientRect();
  return {x:r.left+r.width/2, y:r.top+r.height/2};
}
joyZone.addEventListener("pointerdown", e=>{
  e.preventDefault();
  if(joyActive && joyId!==e.pointerId) return; // otro dedo ya maneja el joystick
  joyActive = true; joyId = e.pointerId;
  const home = _joyHomeCenter(), R = joyBase.offsetWidth/2 || 46;
  if(Math.hypot(e.clientX-home.x, e.clientY-home.y) > R){
    // que la base no quede cortada por el borde de la pantalla
    const x = Math.max(R+4, Math.min(innerWidth-R-4, e.clientX)), y = Math.max(R+4, Math.min(innerHeight-R-4, e.clientY));
    joyOrigin = {x, y}; _joyPlaceBase(x-home.x, y-home.y);
  } else { joyOrigin = home; _joyPlaceBase(0, 0); }
  joyBase.classList.add("on");
  updateJoy(e);
  try{ joyZone.setPointerCapture(e.pointerId); }catch(_){}
});
joyZone.addEventListener("pointermove", e=>{ if(joyActive && e.pointerId===joyId) updateJoy(e); });
function joyRelease(){
  joyActive=false; joyId=null; joyOrigin=null; joyVec={x:0,y:0};
  _joyPlaceBase(0, 0); joyBase.classList.remove("on");
  joyKnob.style.transform=`translate(${JOY_CENTER}px,${JOY_CENTER}px)`;
}
function endJoy(e){ if(e.pointerId===joyId) joyRelease(); }
joyZone.addEventListener("pointerup", endJoy);
joyZone.addEventListener("pointercancel", endJoy);
// si el navegador suelta la captura sin avisar (se escondieron los controles, una notificación, el
// dedo salió por el borde en algunos Android) el joystick no queda "pegado" caminando solo
joyZone.addEventListener("lostpointercapture", e=>{ if(e.target===joyZone) endJoy(e); });

function updateJoy(e){
  const c = joyCenter();
  let dx = e.clientX-c.x, dy = e.clientY-c.y;
  const dist = Math.hypot(dx,dy);
  const clamped = Math.min(dist, JOY_MAX);
  const ang = Math.atan2(dy,dx);
  const kx = Math.cos(ang)*clamped, ky = Math.sin(ang)*clamped;
  joyKnob.style.transform = `translate(${JOY_CENTER+kx+joyOff.x}px,${JOY_CENTER+ky+joyOff.y}px)`;
  // zona muerta chica: un pulgar apoyado quieto no hace caminar de a poquito
  const k = clamped < 5 ? 0 : clamped/JOY_MAX;
  joyVec = { x: k*Math.cos(ang), y: k*Math.sin(ang) };
}

function bindAbilityButton(el, handler){
  el.addEventListener("pointerdown", e=>{ e.preventDefault(); handler(); });
}
bindAbilityButton(document.getElementById("btn-basic"), ()=> triggerBasic(player));
// Las 3 habilidades (btn-s1/s2/s3) se manejan en js/core/aim.js: tocar = lanzar al mejor
// objetivo; mantener y arrastrar = apuntar con previsualización del área.
bindAbilityButton(document.getElementById("btn-ult"), ()=> useUltimate());
// Nigromante: Pacto (gasta 5 almas -> la próxima habilidad sale potenciada)
// Curación de emergencia (1 por nivel). Tecla Q en escritorio.
function emergPress(){ if(netIsGuest()) netSendToHost({k:"emerg"}); else emergUse(player); }
bindAbilityButton(document.getElementById("btn-emerg"), emergPress);
window.addEventListener("keydown", (ev)=>{ if(ev.repeat || (ev.key!=="q" && ev.key!=="Q") || state!=="playing") return; const tag = ev.target && ev.target.tagName; if(tag==="INPUT" || tag==="TEXTAREA") return; emergPress(); });
bindAbilityButton(document.getElementById("btn-pact"), ()=>{ if(netIsGuest()) netSendToHost({k:"pact"}); else nigroTogglePact(player); });

let basicHeld = false;
const basicBtn = document.getElementById("btn-basic");
let basicPtr = null;
// Captura del puntero: con el mouse, apretar Ataque y soltar afuera del botón dejaba basicHeld pegado.
basicBtn.addEventListener("pointerdown", (e)=>{ basicHeld = true; basicPtr = e.pointerId; try{ basicBtn.setPointerCapture(e.pointerId); }catch(_){} });
function basicUp(e){ if(basicPtr===null || e.pointerId===basicPtr){ basicHeld = false; basicPtr = null; } }
basicBtn.addEventListener("pointerup", basicUp);
basicBtn.addEventListener("pointercancel", basicUp);
basicBtn.addEventListener("lostpointercapture", e=>{ if(e.target===basicBtn) basicUp(e); });
// Suelta TODO lo que se esté manteniendo (joystick, ataque, apuntado, revivir): al cambiar de pestaña,
// al entrar una llamada/notificación, al perder el foco la ventana o al salir de la partida. Sin esto,
// un dedo o una tecla que se soltó "afuera" dejaba al guardián caminando o pegando solo al volver.
function inputResetAll(){
  if(joyActive || joyVec.x || joyVec.y) joyRelease();
  basicHeld = false; basicPtr = null;
  if(typeof aimCancelActive==="function") aimCancelActive();
  if(typeof deskInputReset==="function") deskInputReset();
  try{ if(typeof reviveBtnTarget!=="undefined" && reviveBtnTarget) stopReviveBtnHold(); }catch(_){}
}
window.addEventListener("blur", inputResetAll);
window.addEventListener("pagehide", inputResetAll);
document.addEventListener("visibilitychange", ()=>{ if(document.visibilityState==="hidden") inputResetAll(); });
// mantener apretado un botón no abre el menú del navegador (Android) ni la lupa/copiar de iOS
document.getElementById("controls").addEventListener("contextmenu", e=> e.preventDefault());

// Sylva — Flecha Perforante: única habilidad "mantener apretado para cargar" del juego. La carga
// arranca al apretar #btn-s1 y el disparo sale al soltar (ver js/core/aim.js, que además
// permite apuntar la flecha arrastrando mientras carga).
function sylvaChargeStart(){
  if(player.classKey!=="cazadora" || !player.alive || state!=="playing") return false;
  const sk = player.cls.skills[0];
  if(sk.kind!=="piercing_shot") return false;
  if(player.cds[0]>0 || player.energy < sk.cost) return false;
  if(netIsGuest()) netSendToHost({k:"sylva", on:true});
  player.sylvaCharging = true;
  player.sylvaChargeTimer = 0;
  return true;
}
function sylvaChargeRelease(aim){
  if(player.classKey!=="cazadora" || !player.sylvaCharging) return;
  player.sylvaCharging = false;
  if(netIsGuest()){ netSendToHost({k:"sylva", on:false, aim: aim ? {x:Math.round(aim.x), y:Math.round(aim.y), dx:aim.dx, dy:aim.dy} : null}); player.sylvaChargeTimer = 0; return; }
  useSylvaPiercingShot(player, player.sylvaChargeTimer, aim);
  player.sylvaChargeTimer = 0;
}

/* ---- Botón dedicado de revivir (cerca de las habilidades) ----
   Mantenerlo apretado = "estoy reviviendo a X". El progreso y el resultado los decide la
   simulación (updateRevives en allies.js; en cooperativo, el anfitrión): el botón solo muestra
   el progreso real y se suelta solo si el revivir deja de ser válido. */
const REVIVE_BTN_HOLD_MS = 1300; // demo: 1.3s en vez de 2s
let reviveBtnHoldRaf = null, reviveBtnTarget = null;
function reviveTargetValid(a){
  return !!(a && !a.alive && a!==player && player && player.alive && !(player.stunTimer>0) && state==="playing" && !runEnding && !divinaMode
    && distance(player, a) < REVIVE_RANGE && !reviveBusyFor(a, player));
}
function nearestDownedAlly(){
  if(divinaMode) return null; // la muerte es definitiva en el asedio: nadie revive a nadie
  let best = null, bestD = Infinity;
  for(const a of allies){
    if(!reviveTargetValid(a)) continue;
    const d = distance(player, a);
    if(d < bestD){ bestD = d; best = a; }
  }
  return best;
}
function setReviveHold(target){
  if(netIsGuest()){
    if(target) netSendToHost({k:"revive", slot:target._netSlot, on:1});
    else netSendToHost({k:"revive", on:0});
    return;
  }
  if(!player) return;
  player._revHold = target ? heroes.indexOf(target) : -1;
  if(!target) cancelRevivesBy(player); // soltar el botón corta al instante
}
function stopReviveBtnHold(){
  if(reviveBtnHoldRaf) cancelAnimationFrame(reviveBtnHoldRaf);
  reviveBtnHoldRaf = null;
  const btn = document.getElementById("btn-revive");
  const wasHolding = btn && btn.dataset.holding==="1";
  if(btn){
    btn.dataset.holding = "0";
    btn.classList.remove("holding");
    const ico = btn.querySelector(".ico");
    if(ico) ico.textContent = "✚";
  }
  if(wasHolding) setReviveHold(null);
  reviveBtnTarget = null;
}
function reviveBtnTick(){
  const a = reviveBtnTarget;
  if(!a || a.alive || !reviveTargetValid(a)){ stopReviveBtnHold(); return; }
  const btn = document.getElementById("btn-revive");
  const ico = btn ? btn.querySelector(".ico") : null;
  const mine = a._reviveBy===player && a._reviveT>0;
  const dur = a._reviveDur || REVIVE_BTN_HOLD_MS;
  if(ico) ico.textContent = mine ? Math.round(Math.min(1, a._reviveT/dur)*100)+"%" : "…";
  reviveBtnHoldRaf = requestAnimationFrame(reviveBtnTick);
}
const reviveBtn = document.getElementById("btn-revive");
reviveBtn.addEventListener("pointerdown", (ev)=>{
  ev.stopPropagation();
  const target = nearestDownedAlly();
  // sin nadie para revivir, el mismo botón es la acción contextual (js/systems/context-actions.js)
  if(!target){
    const ct = player && player.alive && state==="playing" ? ctxNearest(player) : null; if(ct){ ctxBtnStart(ct); return; }
    if(player && player.alive && state==="playing" && typeof groundLootPickNearest==="function") groundLootPickNearest(); // levantar botín (un toque)
    return;
  }
  reviveBtnTarget = target;
  reviveBtn.dataset.holding = "1";
  reviveBtn.classList.add("holding");
  setReviveHold(target);
  reviveBtnHoldRaf = requestAnimationFrame(reviveBtnTick);
});
["pointerup","pointercancel","pointerleave"].forEach(evt=>{
  reviveBtn.addEventListener(evt, (ev)=>{ ev.stopPropagation(); stopReviveBtnHold(); ctxBtnStop(); });
});
// Muestra/oculta el botón según si hay algún aliado caído al alcance que se pueda revivir ahora
// (vivo, en rango, nadie más lo está reviviendo, partida en curso).
function updateReviveBtn(){
  const btn = document.getElementById("btn-revive");
  if(!btn) return;
  const holding = btn.dataset.holding==="1";
  if(btn.dataset.ctx==="1"){ btn.classList.add("ready"); return; } // manteniendo una acción contextual (ctxBtnTick la corta)
  const hasRevive = holding ? reviveTargetValid(reviveBtnTarget) : !!nearestDownedAlly();
  let ct = (!hasRevive && !holding && player && player.alive) ? ctxNearest(player) : null;
  // botín en el piso al alcance: el mismo botón dice "Levantar" (js/systems/ground-loot.js)
  if(!ct && !hasRevive && !holding && typeof groundLootNearest==="function" && groundLootNearest(player)) ct = GROUND_LOOT_CTX;
  ctxBtnSetLook(ct);
  btn.classList.toggle("ready", hasRevive || !!ct);
  if(!hasRevive && holding) stopReviveBtnHold();
}

document.getElementById("pause-btn").addEventListener("click", ()=>{
  // B1: en una partida online no hay pausa: el menú se abre encima y la partida sigue
  if(netMatch && state==="playing"){ document.getElementById("pause-screen").classList.remove("hidden"); renderStatsPanel(); return; }
  if(state==="playing"){ setState("paused"); renderStatsPanel(); }
});
// Celular: una llamada, una notificación o cambiar de app en plena partida SOLO. Antes el juego
// quedaba congelado y al volver seguía de golpe, con la horda encima y sin aviso. Ahora vuelve en
// pausa (en cooperativo no hay pausa: la partida es de todos y la sigue el anfitrión).
document.addEventListener("visibilitychange", ()=>{
  if(document.visibilityState==="hidden" && state==="playing" && !netMatch && typeof renderStatsPanel==="function"){ setState("paused"); renderStatsPanel(); }
});
document.getElementById("resume-btn").addEventListener("click", ()=>{
  if(netMatch){ document.getElementById("pause-screen").classList.add("hidden"); return; }
  setState("playing");
});
document.getElementById("quit-btn").addEventListener("click", ()=>{
  if(typeof endlessOn==="function" && endlessOn()){ endlessQuitFromPause(); return; } // Horda Infinita: terminar = resultados (sin castigo)
  if(divinaMode){
    divinaMode = false;
    setState("divina");
    return;
  }
  const lootMsg = runLevel >= DEFEAT_LOOT.minLevel ? " Igual te llevás un objeto por haber llegado al nivel "+runLevel+"." : "";
  // Diálogos propios (game-dialog.js). En una partida online el juego sigue corriendo mientras se
  // decide: si la partida terminó entretanto (ya no estamos en pausa/jugando), no se aplica nada.
  const st0 = state;
  const stillHere = ()=> state===st0 && !!player;
  const abandon = ()=>{
    const forgive = typeof arenaFailureForgiveReason==="function" && arenaFailureForgiveReason();
    const costMsg = forgive ? "Cuenta como una derrota, pero esta vez la Horda te perdona: no perdés XP ni oro."
      : "Vas a perder el "+Math.round(ARENA_FAIL_PENALTY_PCT*100)+"% de la XP y del oro que ganaste en esta partida, igual que si perdieras.";
    gameConfirm("¿Abandonar la arena? "+costMsg+lootMsg, {okText:"Abandonar", cancelText:"Seguir jugando", danger:true}).then(ok=>{
      if(!ok || !stillHere()) return;
      applyArenaFailurePenalty(player.classKey);
      if(runLevel >= DEFEAT_LOOT.minLevel) grantEndOfRunLoot(player.classKey, computePerformance(player), false);
      if(typeof questsOnRunEnd==="function") questsOnRunEnd(false, {abandon:true});
      document.getElementById("pause-screen").classList.add("hidden");
      if(netMatch) netQuitMatch(); // B1: invitado -> lo reemplaza un bot; anfitrión -> se cierra la sala
      if(typeof firstRunToHub==="function" && firstRunToHub()) return; // primera partida: al hub (js/ui/hub.js)
      setState("menu"); renderChampGrid(); renderSaveLine();
    });
  };
  if(netIsHost()){
    gameConfirm("Sos el anfitrión: si abandonás, la partida termina para todos. ¿Seguir?", {okText:"Seguir", danger:true}).then(ok=>{ if(ok && stillHere()) abandon(); });
    return;
  }
  abandon();
});
