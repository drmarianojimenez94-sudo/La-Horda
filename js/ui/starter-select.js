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
let _starterPick = null, _starterDone = null, _starterSkinPick = null, _starterSkinBusy = false, _starterJustGot = null;
const STARTER_ROLE_LABEL = {tanque:"Tanque", asesino:"Asesino", mago:"Mago", soporte:"Soporte"};

// Sin elección explícita, el regalo propuesto es el Mago (DEFAULT_CHAMPION): ya viene marcado y un toque en
// "Sí" alcanza; tocar otra carta lo cambia. Solo se marca si de verdad está entre los guardianes de regalo.
function _starterOptions(){ return CHAMPION_CATALOG.filter(c=>championMeta(c.id).starterEligible && shopChampionPurchasable(c.id)); }
function openStarterSelect(onDone){
  _starterPick = _starterOptions().some(c=>c.id===DEFAULT_CHAMPION) ? DEFAULT_CHAMPION : null; _starterDone = onDone || null;
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
  grid.innerHTML = _starterOptions().map(c=>{
    const cls = CLASSES[c.id];
    return `<button class="gallery-card starter-card ${_starterPick===c.id?"sel":""}" data-champ="${c.id}">
      <canvas class="champ-anim starter-anim" width="110" height="110" data-class-key="${c.id}" data-idle="1" style="background:${cls.color}1c;"></canvas>
      <div class="gallery-card-name">${championShortName(c.id)}</div><div class="champ-title">${championTitle(c.id)}</div>
      ${(STARTER_ROLE_LABEL[cls.roleCategory]||"") && STARTER_ROLE_LABEL[cls.roleCategory]!==championShortName(c.id) ? `<div class="mychamp-meta">${STARTER_ROLE_LABEL[cls.roleCategory]}</div>` : ""}
      <div class="starter-lore">${c.lore}</div>
    </button>`;
  }).join("");
  grid.querySelectorAll(".starter-card").forEach(card=>{
    card.addEventListener("click", ()=>{
      _starterPick = card.getAttribute("data-champ");
      grid.querySelectorAll(".starter-card").forEach(c2=>c2.classList.toggle("sel", c2===card));
      _starterShowConfirm();
      // el cartel de confirmar es pegajoso (abajo): se baja todo lo posible sin perder de vista la carta
      // elegida, así el cartel queda en su lugar debajo de las cartas y no tapa la etiqueta de otras
      const sc = document.getElementById("starter-screen");
      if(sc){
        const top = card.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop - 8;
        sc.scrollTo({top:Math.max(0, Math.min(sc.scrollHeight - sc.clientHeight, top)), behavior:"smooth"});
      }
    });
  });
  const box = document.getElementById("starter-confirm"); if(box && !_starterPick) box.classList.add("hidden");
  if(_starterPick) _starterShowConfirm();
  startChampAnimLoop();
}
function _starterShowConfirm(){
  const box = document.getElementById("starter-confirm"), txt = document.getElementById("starter-confirm-text");
  if(!box || !txt || !_starterPick || !CLASSES[_starterPick]) return;
  txt.innerHTML = `¿Elegir a <b>${CLASSES[_starterPick].name}</b>? <details><summary>Ver habilidades</summary>${championGuideHTML(_starterPick)}</details>`;
  box.classList.remove("hidden");
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
  // el "¡X se une a tu equipo!" (neutro: hay guardianas) va en el subtítulo del paso 2 (antes era un aviso arriba a la derecha que tapaba el final
  // del subtítulo); si no hay paso 2, un aviso normal (la pantalla que sigue no tiene nada arriba a la derecha)
  if(typeof needsStarterSkin==="function" && needsStarterSkin()){ _starterJustGot = _starterPick; openStarterSkinStep(); return; }
  if(typeof showNetToast==="function") showNetToast(`🎁 ${CLASSES[_starterPick].name} se une a tu equipo`);
  _starterFinish();
});
document.getElementById("starter-no-btn").addEventListener("click", ()=>{
  _starterPick = null;
  document.getElementById("starter-confirm").classList.add("hidden");
  document.querySelectorAll(".starter-card").forEach(c=>c.classList.remove("sel"));
});
// El guardián seleccionado siempre tiene que ser uno PROPIO: si no, el Mago si es tuyo, y si no el primero
// que tengas. Sin ningún guardián propio (perfil nuevo o reiniciado: todavía falta el de regalo) queda el
// Mago por defecto y devuelve false; nunca queda apuntando a otro guardián bloqueado (ej. el Asesino).
function ensureOwnedSelection(){
  const usable = k=>save.champions[k] && save.champions[k].unlocked && (typeof championPlayable!=="function" || championPlayable(k));
  if(usable(selectedClass)) return true;
  const own = usable(DEFAULT_CHAMPION) ? DEFAULT_CHAMPION : Object.keys(CLASSES).find(usable);
  if(own){ selectedClass = own; return true; }
  if(CLASSES[DEFAULT_CHAMPION]) selectedClass = DEFAULT_CHAMPION;
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
  const nm = `<b style="color:${cls.color||"#ffcf5c"}">${_starterEsc(cls.name)}</b>`;
  if(sub) sub.innerHTML = _starterJustGot===k
    ? `🎁 ¡${nm} se une a tu equipo! Ahora elegí su skin: es tuya y la llevás puesta desde ya.`
    : `Elegí una skin para ${nm}: es tuya y la llevás puesta desde ya.`;
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
  // sin aviso arriba a la derecha: el cartel de confirmar ya dice "¡Es tuya!" (el aviso tapaba el subtítulo)
  setTimeout(()=>{ _starterSkinBusy = false; _starterJustGot = null; if(state==="starter") _starterFinish(); }, 1100);
});
document.getElementById("starter-skin-later-btn").addEventListener("click", ()=>{
  if(_starterSkinBusy) return;
  starterSkinVoucher();
  if(typeof showNetToast==="function") showNetToast("🎟 Te guardamos un vale de skin: canjealo en la Tienda cuando quieras");
  _starterFinish();
});
