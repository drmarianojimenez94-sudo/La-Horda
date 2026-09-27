"use strict";
/* ============================================================
   js/ui/champions-hub.js
   Pestañas compartidas de gestión del campeón. "Mis Campeones" pasó a ser CÓDICE → CAMPEONES
   (js/ui/codex/codex.js). Junto con la Sala es el único lugar donde se cambia el equipo: en partida
   no se puede (multijugador, sin pausa).
   ============================================================ */
const HUB_ROLE_LABEL = {tanque:"Tanque", asesino:"Asesino", mago:"Mago", soporte:"Soporte"};
// La ficha de cada campeón (equipamiento, talentos en árbol, maestría) vive ahora en el CÓDICE →
// CAMPEONES (js/ui/codex/codex.js), con los mismos paneles de siempre (renderChampInventory,
// renderTalentTree, renderSkillsPanel). Acá queda lo compartido y la Sala.
function setHubTabs(tabsId, active){
  document.querySelectorAll(`#${tabsId} .hub-tab`).forEach(t=> t.classList.toggle("active", t.dataset.tab===active));
}

// Sala: las mismas 3 pestañas para el campeón elegido, justo antes de entrar.
let prepTab = "equipo";
function renderPrepTabs(){
  setHubTabs("prep-tabs", prepTab);
  const inv = document.getElementById("prep-inventory-panel");
  const tal = document.getElementById("prep-talents-panel");
  const sk = document.getElementById("prep-skills-panel");
  inv.classList.toggle("hidden", prepTab!=="equipo");
  tal.classList.toggle("hidden", prepTab!=="talentos");
  sk.classList.toggle("hidden", prepTab!=="habilidades");
  if(prepTab==="talentos") renderTalentTree(tal, selectedClass, renderPrepSummary);
  else if(prepTab==="habilidades") renderSkillsPanel(sk, selectedClass, renderPrepSummary);
  else renderPrepInventory();
}
document.querySelectorAll("#prep-tabs .hub-tab").forEach(t=>{
  t.addEventListener("click", ()=>{ prepTab = t.dataset.tab; renderPrepTabs(); });
});
