"use strict";
/* ============================================================
   js/ui/champions-hub.js
   Mis Campeones: el inventario de campeones propios y la ficha de cada uno (equipamiento,
   talentos en árbol y habilidades). Junto con la Sala es el único lugar donde se cambia el
   equipo: en partida no se puede (multijugador, sin pausa).
   Hoy todos los campeones vienen desbloqueados; cuando se bloqueen, acá aparecen solo los tuyos
   y el resto se consigue en la Tienda.
   ============================================================ */
let champHubKey = null, champHubTab = "equipo";
const HUB_ROLE_LABEL = {tanque:"Tanque", asesino:"Asesino", mago:"Mago", soporte:"Soporte"};

function renderMyChampions(){
  const owned = CHAMPION_CATALOG.filter(c=>save.champions[c.id] && save.champions[c.id].unlocked);
  document.getElementById("champions-sub").textContent =
    `${owned.length} de ${CHAMPION_CATALOG.length} campeones · tocá uno para ver su equipo y sus talentos`;
  const grid = document.getElementById("mychamps-grid");
  grid.innerHTML = owned.map(c=>{
    const cls = CLASSES[c.id], champ = save.champions[c.id];
    const eq = Object.values(champ.equipment||{}).filter(Boolean).length;
    return `<button class="gallery-card mychamp-card" data-champ="${c.id}">
      <canvas class="champ-anim shop-champ-anim" width="96" height="96" data-class-key="${c.id}" style="background:${cls.color}1c;"></canvas>
      <div class="gallery-card-name">${cls.name}</div>
      <div class="mychamp-meta">${HUB_ROLE_LABEL[cls.roleCategory]||""} · Nv. ${champ.level}</div>
      <div class="mychamp-meta">🛡 ${eq}/6 equipados${champ.talentPoints>0?` · <b class="mychamp-pts">${champ.talentPoints} pts</b>`:""}</div>
    </button>`;
  }).join("");
  grid.querySelectorAll(".mychamp-card").forEach(card=>{
    card.addEventListener("click", ()=> openChampHub(card.getAttribute("data-champ"), "equipo"));
  });
  startChampAnimLoop();
}
function openChampHub(key, tab){
  champHubKey = key; champHubTab = tab || champHubTab || "equipo";
  setState("champhub");
  renderChampHub();
}
function renderChampHub(){
  const key = champHubKey; if(!key) return;
  const cls = CLASSES[key], champ = save.champions[key];
  const need = xpToNext(champ.level), pct = Math.min(100, Math.round(champ.xp/need*100));
  document.getElementById("champhub-head").innerHTML = `<div class="hub-head">
    <canvas class="champ-anim hub-anim" width="84" height="84" data-class-key="${key}" style="background:${cls.color}1c;"></canvas>
    <div class="hub-head-txt">
      <div class="hub-name" style="color:${cls.color};">${cls.name}</div>
      <div class="hub-meta">${HUB_ROLE_LABEL[cls.roleCategory]||""} · Nv. ${champ.level} · Puntos sin gastar: <b>${champ.talentPoints}</b></div>
      <div class="hub-xp"><div style="width:${pct}%"></div></div>
      <div class="hub-meta dim">${cls.role}</div>
    </div></div>`;
  setHubTabs("champhub-tabs", champHubTab);
  const panel = document.getElementById("champhub-panel");
  panel.classList.toggle("tree-wide", champHubTab==="talentos");
  if(champHubTab==="talentos") renderTalentTree(panel, key, renderChampHub);
  else if(champHubTab==="habilidades") renderSkillsPanel(panel, key, renderChampHub);
  else renderChampInventory(panel, key, renderChampHub);
  startChampAnimLoop();
}
function setHubTabs(tabsId, active){
  document.querySelectorAll(`#${tabsId} .hub-tab`).forEach(t=> t.classList.toggle("active", t.dataset.tab===active));
}
document.getElementById("mychamps-tab-champs").addEventListener("click", ()=>{ setState("champions"); renderMyChampions(); });
document.getElementById("mainmenu-campeones-btn").addEventListener("click", ()=>{
  setState("champions"); renderMyChampions();
});
document.getElementById("champions-back-btn").addEventListener("click", ()=>{
  setState("mainmenu"); renderMainMenu();
});
document.getElementById("champhub-back-btn").addEventListener("click", ()=>{
  setState("champions"); renderMyChampions();
});
document.querySelectorAll("#champhub-tabs .hub-tab").forEach(t=>{
  t.addEventListener("click", ()=>{ champHubTab = t.dataset.tab; renderChampHub(); });
});

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
