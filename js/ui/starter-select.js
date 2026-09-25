"use strict";
/* ============================================================
   js/ui/starter-select.js
   MODO CAMPAÑA (prueba): "Tu primer campeón". Al entrar por primera vez (o al abrir un enlace de
   invitación sin campeón propio) cada jugador elige UN campeón de regalo. Los demás quedan
   bloqueados y se compran en la Tienda (CHAMPION_PRICE_GOLD). Se muestran todos animados,
   quietos y respirando. `onDone` sigue el camino que se había interrumpido (menú o unirse a sala).
   ============================================================ */
let _starterPick = null, _starterDone = null;
const STARTER_ROLE_LABEL = {tanque:"Tanque", asesino:"Asesino", mago:"Mago", soporte:"Soporte"};

function openStarterSelect(onDone){
  _starterPick = null; _starterDone = onDone || null;
  setState("starter");
  renderStarterSelect();
}
function renderStarterSelect(){
  const pr = document.getElementById("starter-price"); if(pr) pr.textContent = fmtGold(CHAMPION_PRICE_GOLD);
  const grid = document.getElementById("starter-grid"); if(!grid) return;
  grid.innerHTML = CHAMPION_CATALOG.map(c=>{
    const cls = CLASSES[c.id];
    return `<button class="gallery-card starter-card ${_starterPick===c.id?"sel":""}" data-champ="${c.id}">
      <canvas class="champ-anim starter-anim" width="110" height="110" data-class-key="${c.id}" data-idle="1" style="background:${cls.color}1c;"></canvas>
      <div class="gallery-card-name">${cls.name}</div>
      <div class="mychamp-meta">${STARTER_ROLE_LABEL[cls.roleCategory]||""}</div>
      <div class="starter-lore">${c.lore}</div>
    </button>`;
  }).join("");
  grid.querySelectorAll(".starter-card").forEach(card=>{
    card.addEventListener("click", ()=>{
      _starterPick = card.getAttribute("data-champ");
      grid.querySelectorAll(".starter-card").forEach(c2=>c2.classList.toggle("sel", c2===card));
      const box = document.getElementById("starter-confirm");
      document.getElementById("starter-confirm-text").innerHTML = `¿Empezar la campaña con <b>${CLASSES[_starterPick].name}</b>?`;
      box.classList.remove("hidden");
      box.scrollIntoView({block:"nearest", behavior:"smooth"});
    });
  });
  const box = document.getElementById("starter-confirm"); if(box && !_starterPick) box.classList.add("hidden");
  startChampAnimLoop();
}
function grantStarterChampion(key){
  if(!CLASSES[key] || !save.champions[key]) return false;
  save.champions[key].unlocked = true;
  save.starterChosen = true;
  selectedClass = key; save.lastChamp = key;
  persistNow();
  return true;
}
document.getElementById("starter-yes-btn").addEventListener("click", ()=>{
  if(!_starterPick || !grantStarterChampion(_starterPick)) return;
  if(typeof showNetToast==="function") showNetToast(`🎁 ${CLASSES[_starterPick].name} es tuyo`);
  const next = _starterDone; _starterDone = null;
  if(next) next(); else { setState("mainmenu"); renderMainMenu(); }
});
document.getElementById("starter-no-btn").addEventListener("click", ()=>{
  _starterPick = null;
  document.getElementById("starter-confirm").classList.add("hidden");
  document.querySelectorAll(".starter-card").forEach(c=>c.classList.remove("sel"));
});
// El campeón seleccionado siempre tiene que ser uno PROPIO (si no, el primero que tenga).
function ensureOwnedSelection(){
  if(save.champions[selectedClass] && save.champions[selectedClass].unlocked) return true;
  const own = Object.keys(CLASSES).find(k=>save.champions[k] && save.champions[k].unlocked);
  if(own){ selectedClass = own; return true; }
  return false;
}
