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

function joyCenter(){
  const r = joyBase.getBoundingClientRect();
  return {x:r.left+r.width/2, y:r.top+r.height/2};
}
joyZone.addEventListener("pointerdown", e=>{
  joyActive = true; joyId = e.pointerId;
  updateJoy(e);
  joyZone.setPointerCapture(e.pointerId);
});
joyZone.addEventListener("pointermove", e=>{ if(joyActive && e.pointerId===joyId) updateJoy(e); });
function endJoy(e){ if(e.pointerId===joyId){ joyActive=false; joyId=null; joyVec={x:0,y:0}; joyKnob.style.transform=`translate(${JOY_CENTER}px,${JOY_CENTER}px)`; } }
joyZone.addEventListener("pointerup", endJoy);
joyZone.addEventListener("pointercancel", endJoy);

function updateJoy(e){
  const c = joyCenter();
  let dx = e.clientX-c.x, dy = e.clientY-c.y;
  const dist = Math.hypot(dx,dy);
  const clamped = Math.min(dist, JOY_MAX);
  const ang = Math.atan2(dy,dx);
  const kx = Math.cos(ang)*clamped, ky = Math.sin(ang)*clamped;
  joyKnob.style.transform = `translate(${JOY_CENTER+kx}px,${JOY_CENTER+ky}px)`;
  joyVec = { x: clamped/JOY_MAX*Math.cos(ang), y: clamped/JOY_MAX*Math.sin(ang) };
}

function bindAbilityButton(el, handler){
  el.addEventListener("pointerdown", e=>{ e.preventDefault(); handler(); });
}
bindAbilityButton(document.getElementById("btn-basic"), ()=> triggerBasic(player));
// Las 3 habilidades (btn-s1/s2/s3) se manejan en js/core/aim.js: tocar = lanzar al mejor
// objetivo; mantener y arrastrar = apuntar con previsualización del área.
bindAbilityButton(document.getElementById("btn-ult"), ()=> useUltimate());

let basicHeld = false;
const basicBtn = document.getElementById("btn-basic");
basicBtn.addEventListener("pointerdown", ()=> basicHeld=true);
basicBtn.addEventListener("pointerup", ()=> basicHeld=false);
basicBtn.addEventListener("pointercancel", ()=> basicHeld=false);

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
  if(player) player._revHold = target ? heroes.indexOf(target) : -1;
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
  if(!target) return;
  reviveBtnTarget = target;
  reviveBtn.dataset.holding = "1";
  reviveBtn.classList.add("holding");
  setReviveHold(target);
  reviveBtnHoldRaf = requestAnimationFrame(reviveBtnTick);
});
["pointerup","pointercancel","pointerleave"].forEach(evt=>{
  reviveBtn.addEventListener(evt, (ev)=>{ ev.stopPropagation(); stopReviveBtnHold(); });
});
// Muestra/oculta el botón según si hay algún aliado caído al alcance que se pueda revivir ahora
// (vivo, en rango, nadie más lo está reviviendo, partida en curso).
function updateReviveBtn(){
  const btn = document.getElementById("btn-revive");
  if(!btn) return;
  const holding = btn.dataset.holding==="1";
  const hasTarget = holding ? reviveTargetValid(reviveBtnTarget) : !!nearestDownedAlly();
  btn.classList.toggle("ready", hasTarget);
  if(!hasTarget && holding) stopReviveBtnHold();
}

document.getElementById("pause-btn").addEventListener("click", ()=>{
  // B1: en una partida online no hay pausa: el menú se abre encima y la partida sigue
  if(netMatch && state==="playing"){ document.getElementById("pause-screen").classList.remove("hidden"); renderStatsPanel(); return; }
  if(state==="playing"){ setState("paused"); renderStatsPanel(); }
});
document.getElementById("resume-btn").addEventListener("click", ()=>{
  if(netMatch){ document.getElementById("pause-screen").classList.add("hidden"); return; }
  setState("playing");
});
document.getElementById("quit-btn").addEventListener("click", ()=>{
  if(divinaMode){
    divinaMode = false;
    setState("divina");
    return;
  }
  const lootMsg = runLevel >= DEFEAT_LOOT.minLevel ? " Igual te llevás un objeto por haber llegado al nivel "+runLevel+"." : "";
  if(netIsHost() && !confirm("Sos el anfitrión: si abandonás, la partida termina para todos. ¿Seguir?")) return;
  if(!confirm("¿Abandonar la arena? Vas a perder el "+Math.round(ARENA_FAIL_PENALTY_PCT*100)+"% de la XP y del oro que ganaste en esta partida, igual que si perdieras."+lootMsg)) return;
  applyArenaFailurePenalty(player.classKey);
  if(runLevel >= DEFEAT_LOOT.minLevel) grantEndOfRunLoot(player.classKey, computePerformance(player), false);
  document.getElementById("pause-screen").classList.add("hidden");
  if(netMatch) netQuitMatch(); // B1: invitado -> lo reemplaza un bot; anfitrión -> se cierra la sala
  setState("menu"); renderChampGrid(); renderSaveLine();
});
