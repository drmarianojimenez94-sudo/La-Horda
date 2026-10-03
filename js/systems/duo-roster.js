"use strict";
// Compatibility entry points: one champion per player, no reserve or automatic handoff.
function duoEnabled(){ return false; }
function duoKeys(){ return [selectedClass]; }
function duoValid(){ return !!(CLASSES[selectedClass] && save.champions[selectedClass]?.unlocked); }
function duoPending(){ return false; }
let duoProgress = {};
function duoInitRun(){ duoProgress = {}; }
function duoRestoreLead(){}
function duoHandoff(){ return false; }
function duoUpdate(){}
function duoTaken(){
  if(!netInRoom()) return [];
  return net.room.slots.flatMap((s,i)=>s?.connected && i!==net.slot ? [s.champ] : []);
}
function duoChoose(index,key){
  if(duoTaken().includes(key)){showNetToast("Ese héroe ya está en las cartas de otro jugador. Elegí otro.");return;}
  if(!CLASSES[key] || !save.champions[key]) return;
  if(index!==0 || !save.champions[key].unlocked) return;
  selectedClass=key; netRememberChamp(key); if(netInRoom()) netSend({t:"update",champ:key});
  lobbyAllies=pickLobbyAllies(selectedClass); persist();
  if(netInRoom()){ netSend({t:"update",ready:false}); if(net.role==="guest") netSendLoadout(true); }
  renderPrepSummary();
}
function renderDuoPicker(){
  const box=document.getElementById("duo-picker"); if(!box) return;
  const key=selectedClass;
  box.innerHTML=`<h3>Tu campeón</h3><p>Un campeón por jugador. Mantené ✚ junto a un aliado caído durante 5 segundos para revivirlo. Los golpes no interrumpen la reanimación.</p><div class="duo-cards single-champion"><article class="duo-card"><canvas class="champ-anim" width="104" height="104" data-class-key="${key}" data-idle="1"></canvas><strong>${guideEsc(CLASSES[key].name)}</strong><small>Nv. ${save.champions[key].level}</small><details><summary>Ver habilidades</summary>${championGuideHTML(key)}</details><label>Cambiar campeón<select data-duo="0">${Object.keys(CLASSES).filter(k=>save.champions[k]?.unlocked).map(k=>`<option value="${k}" ${k===key?"selected":""} ${duoTaken().includes(k)?"disabled":""}>${guideEsc(CLASSES[k].name)}</option>`).join("")}</select></label></article></div>`;
  box.querySelector("[data-duo]").onchange=ev=>duoChoose(0,ev.target.value);
  startChampAnimLoop();
}
function duoHud(){ const el=document.getElementById("duo-hud"); if(el) el.hidden=true; }
