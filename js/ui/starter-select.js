"use strict";
/* ============================================================
   js/ui/starter-select.js
   MODO CAMPAÑA (prueba): "Tu primer guardián". Al entrar por primera vez (o al abrir un enlace de
   invitación sin guardián propio) cada jugador elige UN guardián de regalo. Los demás quedan
   bloqueados y se compran en la Tienda (CHAMPION_PRICE_GOLD). Se muestran todos animados,
   quietos y respirando. `onDone` sigue el camino que se había interrumpido (menú o unirse a sala).
   REGALO INICIAL (js/systems/starter-gift.js): después del guardián viene el paso 2, "Tu skin de
   regalo": sus skins (de set y cromas) animadas como en la Tienda, la primera ya marcada (un toque
   en "¡La quiero!" alcanza). Al elegirla: "¡Es tuya!", queda equipada y sigue `onDone`.
   ============================================================ */
let _starterPick = null, _starterDone = null, _starterSkinPick = null, _starterSkinBusy = false;
const STARTER_ROLE_LABEL = {tanque:"Tanque", asesino:"Asesino", mago:"Mago", soporte:"Soporte"};

function openStarterSelect(onDone){
  _starterPick = null; _starterDone = onDone || null;
  setState("starter");
  // ya tiene guardián y le falta la skin de regalo (cerró el juego en el medio): directo al paso 2
  if(!needsStarterChampion() && typeof needsStarterSkin==="function" && needsStarterSkin()){ openStarterSkinStep(); return; }
  _starterShowStep("champ");
  renderStarterSelect();
}
function _starterShowStep(step){
  const a = document.getElementById("starter-step-champ"), b = document.getElementById("starter-step-skin");
  if(a) a.classList.toggle("hidden", step!=="champ");
  if(b) b.classList.toggle("hidden", step!=="skin");
  const sc = document.getElementById("starter-screen"); if(sc) sc.scrollTop = 0;
}
function _starterFinish(){
  const next = _starterDone; _starterDone = null;
  if(next) next(); else { setState("mainmenu"); renderMainMenu(); }
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
      document.getElementById("starter-confirm-text").innerHTML = `¿Elegir a <b>${CLASSES[_starterPick].name}</b>? ${championGuideHTML(_starterPick)}`;
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
  // REGALO INICIAL: ahora le toca elegir la skin de regalo de este guardián
  if(typeof starterGiftEnabled==="function" && starterGiftEnabled() && !save.starterSkin) save.starterSkinPending = true;
  persistNow();
  return true;
}
document.getElementById("starter-yes-btn").addEventListener("click", ()=>{
  if(!_starterPick || !grantStarterChampion(_starterPick)) return;
  if(typeof showNetToast==="function") showNetToast(`🎁 ${CLASSES[_starterPick].name} es tuyo`);
  if(typeof needsStarterSkin==="function" && needsStarterSkin()){ openStarterSkinStep(); return; }
  _starterFinish();
});
document.getElementById("starter-no-btn").addEventListener("click", ()=>{
  _starterPick = null;
  document.getElementById("starter-confirm").classList.add("hidden");
  document.querySelectorAll(".starter-card").forEach(c=>c.classList.remove("sel"));
});
// El guardián seleccionado siempre tiene que ser uno PROPIO (si no, el primero que tenga).
function ensureOwnedSelection(){
  if(save.champions[selectedClass] && save.champions[selectedClass].unlocked) return true;
  const own = Object.keys(CLASSES).find(k=>save.champions[k] && save.champions[k].unlocked);
  if(own){ selectedClass = own; return true; }
  return false;
}

/* ---------------- paso 2: la skin de regalo ---------------- */
function _starterEsc(t){ return String(t==null ? "" : t).replace(/[&<>"]/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c])); }
function openStarterSkinStep(){
  ensureOwnedSelection(); // la skin es para el guardián de regalo (el único tuyo en un perfil nuevo)
  const opts = starterSkinOptions(selectedClass);
  _starterSkinPick = opts.length ? opts[0].id : null; _starterSkinBusy = false;
  if(state!=="starter") setState("starter");
  _starterShowStep("skin");
  renderStarterSkinStep();
  if(typeof playSfx==="function") playSfx("ready");
}
function renderStarterSkinStep(){
  const k = selectedClass, cls = CLASSES[k] || {}, opts = starterSkinOptions(k);
  const sub = document.getElementById("starter-skin-sub"), grid = document.getElementById("starter-skin-grid");
  const yes = document.getElementById("starter-skin-yes-btn"), later = document.getElementById("starter-skin-later-btn");
  const txt = document.getElementById("starter-skin-confirm-text");
  if(!grid) return;
  if(!opts.length){
    // guardián sin skins todavía: un vale para la Tienda (cubre cualquier skin o croma)
    if(sub) sub.innerHTML = `<b style="color:${cls.color||"#ffcf5c"}">${_starterEsc(cls.name)}</b> todavía no tiene skins: te guardamos un <b>vale de skin</b>.`;
    grid.innerHTML = `<div class="gallery-card starter-skin-card starter-skin-vale">
      <canvas class="champ-anim starter-anim" width="110" height="110" data-class-key="${k}" data-idle="1" data-skin="" style="background:${cls.color||"#888"}1c;"></canvas>
      <div class="gallery-card-name">🎟 Vale de skin</div>
      <div class="starter-lore">Canjealo cuando quieras en la Tienda por cualquier skin o croma: el precio queda cubierto.</div></div>`;
    if(txt) txt.innerHTML = "Tu vale te espera en la Tienda.";
    if(yes){ yes.textContent = "¡Seguir!"; yes.disabled = false; if(yes.parentElement) yes.parentElement.classList.remove("hidden"); }
    if(later) later.classList.add("hidden");
    startChampAnimLoop();
    return;
  }
  if(sub) sub.innerHTML = `Elegí una para <b style="color:${cls.color||"#ffcf5c"}">${_starterEsc(cls.name)}</b>: es tuya y la llevás puesta desde ya.`;
  grid.innerHTML = opts.map(o=>`<button class="gallery-card starter-skin-card ${_starterSkinPick===o.id?"sel":""}" data-skin-gift="${o.id}">
      <span class="starter-skin-own hidden">¡Es tuya!</span>
      <canvas class="champ-anim starter-anim" width="110" height="110" data-class-key="${k}" data-skin="${o.id}" data-idle="1" style="background:${cls.color||"#888"}1c;"></canvas>
      <div class="gallery-card-name">${_starterEsc(o.name)}</div>
      <div class="mychamp-meta starter-skin-tag" style="color:${o.color}">${o.kind==="croma" ? "◆" : "✦"} ${_starterEsc(o.tag)}</div>
      <div class="starter-lore">${_starterEsc(o.lore)}</div>
    </button>`).join("");
  const setTxt = ()=>{ const o = opts.find(x=>x.id===_starterSkinPick); if(txt && o) txt.innerHTML = `¿Te quedás con <b>${_starterEsc(o.name)}</b>?`; };
  setTxt();
  if(yes){ yes.textContent = "¡La quiero!"; yes.disabled = false; if(yes.parentElement) yes.parentElement.classList.remove("hidden"); }
  if(later){ later.classList.remove("hidden"); later.disabled = false; }
  grid.querySelectorAll("[data-skin-gift]").forEach(card=> card.addEventListener("click", ()=>{
    if(_starterSkinBusy) return;
    _starterSkinPick = card.getAttribute("data-skin-gift");
    grid.querySelectorAll("[data-skin-gift]").forEach(c2=>c2.classList.toggle("sel", c2===card));
    setTxt();
  }));
  startChampAnimLoop();
}
document.getElementById("starter-skin-yes-btn").addEventListener("click", ()=>{
  if(_starterSkinBusy) return;
  const k = selectedClass;
  if(!starterSkinOptions(k).length){ starterSkinVoucher(); _starterFinish(); return; }
  const id = _starterSkinPick; if(!id) return;
  const r = starterSkinGrant(k, id);
  if(!r.ok){ gameAlert(r.reason); return; }
  _starterSkinBusy = true;
  const d = typeof skinDefOf==="function" ? skinDefOf(id) : null, nm = (d && d.name) || id;
  const card = document.querySelector(`#starter-skin-grid [data-skin-gift="${id}"]`);
  if(card){ card.classList.add("owned"); const st = card.querySelector(".starter-skin-own"); if(st) st.classList.remove("hidden"); }
  const txt = document.getElementById("starter-skin-confirm-text");
  if(txt) txt.innerHTML = `🎨 <b>¡Es tuya!</b> ${_starterEsc(nm)}${r.equipped ? " · equipada en " + _starterEsc(CLASSES[k].name) : ""}`;
  const yes = document.getElementById("starter-skin-yes-btn"), row = yes.parentElement;
  yes.disabled = true; document.getElementById("starter-skin-later-btn").disabled = true;
  if(row) row.classList.add("hidden"); // un instante de festejo y sigue solo
  if(typeof playSfx==="function") playSfx("levelup");
  if(typeof showNetToast==="function") showNetToast(`🎨 ¡Es tuya! ${nm}${r.equipped ? " · equipada" : ""}`);
  setTimeout(()=>{ _starterSkinBusy = false; if(state==="starter") _starterFinish(); }, 1100);
});
document.getElementById("starter-skin-later-btn").addEventListener("click", ()=>{
  if(_starterSkinBusy) return;
  starterSkinVoucher();
  if(typeof showNetToast==="function") showNetToast("🎟 Te guardamos un vale de skin: canjealo en la Tienda cuando quieras");
  _starterFinish();
});
