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
bindAbilityButton(document.getElementById("btn-s1"), ()=> {
  // Sylva — Flecha Perforante se dispara al soltar el botón (ver listeners de carga más abajo),
  // no al apretarlo: para ella este disparo instantáneo genérico queda anulado.
  if(player.classKey==="cazadora" && player.cls.skills[0].kind==="piercing_shot") return;
  useSkill(0);
});
bindAbilityButton(document.getElementById("btn-s2"), ()=> useSkill(1));
bindAbilityButton(document.getElementById("btn-s3"), ()=> useSkill(2));
bindAbilityButton(document.getElementById("btn-ult"), ()=> useUltimate());

let basicHeld = false;
const basicBtn = document.getElementById("btn-basic");
basicBtn.addEventListener("pointerdown", ()=> basicHeld=true);
basicBtn.addEventListener("pointerup", ()=> basicHeld=false);
basicBtn.addEventListener("pointercancel", ()=> basicHeld=false);

// Sylva — Flecha Perforante: única habilidad "mantener apretado para cargar" del juego, así que
// se resuelve con un listener dedicado sobre el mismo botón #btn-s1 en vez de generalizar
// bindAbilityButton para todos los campeones (ver useSylvaPiercingShot).
const s1Btn = document.getElementById("btn-s1");
function sylvaChargeStart(e){
  if(player.classKey!=="cazadora" || !player.alive || state!=="playing") return;
  const sk = player.cls.skills[0];
  if(sk.kind!=="piercing_shot") return;
  if(player.cds[0]>0 || player.energy < sk.cost) return;
  e.preventDefault();
  player.sylvaCharging = true;
  player.sylvaChargeTimer = 0;
}
function sylvaChargeRelease(){
  if(player.classKey!=="cazadora" || !player.sylvaCharging) return;
  player.sylvaCharging = false;
  useSylvaPiercingShot(player, player.sylvaChargeTimer);
  player.sylvaChargeTimer = 0;
}
s1Btn.addEventListener("pointerdown", sylvaChargeStart);
s1Btn.addEventListener("pointerup", sylvaChargeRelease);
s1Btn.addEventListener("pointercancel", sylvaChargeRelease);

/* ---- Botón dedicado de revivir (cerca de las habilidades) ---- */
const REVIVE_BTN_HOLD_MS = 1300; // demo: 1.3s en vez de 2s
let reviveBtnHoldRaf = null, reviveBtnHoldStart = 0, reviveBtnTarget = null;
function nearestDownedAlly(){
  if(divinaMode) return null; // la muerte es definitiva en el asedio: nadie revive a nadie
  let best = null, bestD = Infinity;
  for(const a of allies){
    if(a.alive) continue;
    const d = distance(player, a);
    if(d < REVIVE_RANGE && d < bestD){ bestD = d; best = a; }
  }
  return best;
}
function stopReviveBtnHold(){
  if(reviveBtnHoldRaf) cancelAnimationFrame(reviveBtnHoldRaf);
  reviveBtnHoldRaf = null;
  const btn = document.getElementById("btn-revive");
  if(btn){
    btn.dataset.holding = "0";
    btn.classList.remove("holding");
    const ico = btn.querySelector(".ico");
    if(ico) ico.textContent = "✚";
  }
  reviveBtnTarget = null;
}
function reviveBtnTick(){
  if(!reviveBtnTarget || reviveBtnTarget.alive || distance(player, reviveBtnTarget) >= REVIVE_RANGE){ stopReviveBtnHold(); return; }
  const elapsed = performance.now() - reviveBtnHoldStart;
  const btn = document.getElementById("btn-revive");
  const ico = btn ? btn.querySelector(".ico") : null;
  if(ico) ico.textContent = Math.ceil((REVIVE_BTN_HOLD_MS-elapsed)/1000)+"s";
  if(elapsed >= REVIVE_BTN_HOLD_MS){
    stopReviveBtnHold();
    tryReviveAlly(reviveBtnTarget);
    return;
  }
  reviveBtnHoldRaf = requestAnimationFrame(reviveBtnTick);
}
const reviveBtn = document.getElementById("btn-revive");
reviveBtn.addEventListener("pointerdown", (ev)=>{
  ev.stopPropagation();
  const target = nearestDownedAlly();
  if(!target) return;
  reviveBtnTarget = target;
  reviveBtnHoldStart = performance.now();
  reviveBtn.dataset.holding = "1";
  reviveBtn.classList.add("holding");
  reviveBtnHoldRaf = requestAnimationFrame(reviveBtnTick);
});
["pointerup","pointercancel","pointerleave"].forEach(evt=>{
  reviveBtn.addEventListener(evt, (ev)=>{ ev.stopPropagation(); stopReviveBtnHold(); });
});
// Muestra/oculta el botón según si hay algún aliado caído al alcance ahora mismo
function updateReviveBtn(){
  const btn = document.getElementById("btn-revive");
  if(!btn) return;
  const hasTarget = !!nearestDownedAlly();
  btn.classList.toggle("ready", hasTarget);
  if(!hasTarget && btn.dataset.holding==="1") stopReviveBtnHold();
}

document.getElementById("pause-btn").addEventListener("click", ()=>{
  if(state==="playing"){ setState("paused"); renderMasteryPanel(); renderTalentsPanel(); renderInventoryPanel(); renderStatsPanel(); }
});
document.getElementById("resume-btn").addEventListener("click", ()=> setState("playing"));
document.getElementById("quit-btn").addEventListener("click", ()=>{
  if(divinaMode){
    divinaMode = false;
    setState("divina");
    return;
  }
  if(!confirm("¿Abandonar la arena? Vas a perder el 50% de la XP acumulada del campeón y el 50% de tu oro, igual que si perdieras.")) return;
  applyArenaFailurePenalty(player.classKey);
  setState("menu"); renderChampGrid(); renderSaveLine();
});
document.querySelectorAll(".pause-tab").forEach(tab=>{
  tab.addEventListener("click", ()=>{
    document.querySelectorAll(".pause-tab").forEach(t=>t.classList.remove("active"));
    tab.classList.add("active");
    const which = tab.dataset.tab;
    document.getElementById("mastery-panel").classList.toggle("hidden", which!=="skills");
    document.getElementById("talents-panel").classList.toggle("hidden", which!=="talents");
    document.getElementById("inventory-panel").classList.toggle("hidden", which!=="inventory");
    document.getElementById("stats-panel").classList.toggle("hidden", which!=="stats");
    if(which==="talents") renderTalentsPanel();
    if(which==="inventory") renderInventoryPanel();
    if(which==="stats") renderStatsPanel();
  });
});
