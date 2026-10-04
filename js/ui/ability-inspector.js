"use strict";
/* ============================================================
   js/ui/ability-inspector.js
   INSPECTOR DE HABILIDADES (long press). UX Bible: docs/bible/UX_BIBLE.md §Long press.
     TOQUE        -> lanza (como siempre).
     MANTENER     -> a los ABILITY_INSPECT_MS se abre la ficha: nombre, ícono, forma de apuntado,
                     descripción, costo, enfriamiento, estado actual, alcance/área y estados que aplica.
                     Soltar SIN arrastrar no lanza nada (nunca un lanzamiento accidental).
     ARRASTRAR    -> se cierra la ficha y sigue el apuntado manual de siempre (soltar lanza).
   Lee SOLO de js/skills/ability-registry.js (misma fuente que el panel táctico y el Códice) y del
   lenguaje de combate (js/data/combat-language.js). Es UI local: no manda nada por red ni pausa.
   ============================================================ */
const ABILITY_INSPECT_MS = 480;
let _abInspEl = null, _abInspFor = null, _abInspTimer = 0;
function _abEsc(s){ return String(s==null ? "" : s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function _abInspNode(){
  if(_abInspEl) return _abInspEl;
  const el = document.createElement("div");
  el.id = "ability-inspector"; el.className = "hidden"; el.setAttribute("role", "tooltip");
  document.body.appendChild(el);
  _abInspEl = el; return el;
}
function _abSecs(ms){ const s = ms/1000; return (s >= 10 ? Math.round(s) : Math.round(s*10)/10).toString().replace(".", ",") + " s"; }
// Chips de estado: glifo + etiqueta (+ color). Nunca solo color.
function abilityStatusChipsHTML(list){
  return (list||[]).map(k=>{ const L = COMBAT_LANGUAGE[k]; if(!L) return ""; return `<span class="ab-chip" style="--chip:${L.color}"><b>${_abEsc(L.glyph)}</b>${_abEsc(L.label)}</span>`; }).join("");
}
function abilityIconHTML(def){
  const img = def.icon.img && typeof SKILL_ICON_IMG!=="undefined" && SKILL_ICON_IMG[def.icon.img];
  const src = typeof img==="string" ? img : (img && img.src);
  if(src) return `<img class="ab-ico" src="${_abEsc(src)}" alt="">`;
  return `<span class="ab-ico glyph">${_abEsc(def.icon.glyph || "◆")}</span>`;
}
const ABILITY_SLOT_LABEL = {basic:"Ataque básico", passive:"Pasiva", 0:"Habilidad 1", 1:"Habilidad 2", 2:"Habilidad 3", ult:"Definitiva"};
// Ficha completa de una habilidad (la reutiliza el panel táctico). h = héroe para valores en vivo.
function abilityCardHTML(def, h, opts){
  opts = opts || {};
  const live = h ? abilityLiveValues(h, def) : null;
  const T = TARGETING_LANGUAGE[def.targetingType] || TARGETING_LANGUAGE.self;
  const facts = [];
  if(def.type!=="passive"){
    if(def.cooldown) facts.push(["⟳", "Enfriamiento", _abSecs(def.cooldown)]);
    if(def.cost) facts.push(["◇", (h && h.cls && h.cls.isFuryClass) ? "Furia" : "Energía", def.cost]);
    const rad = live ? live.radius : def.radius, rng = live ? live.range : def.range;
    if(rad) facts.push(["○", "Área", Math.round(rad) + " u"]);
    if(rng && def.type!=="basic") facts.push(["↔", "Alcance", Math.round(rng) + " u"]);
    if(def.type==="basic" && rng) facts.push(["↔", "Alcance", Math.round(rng) + " u"]);
    if(def.duration) facts.push(["⧗", "Duración", _abSecs(def.duration)]);
    const dm = def.scaling.dmgMult || def.scaling.strikeDmgMult;
    if(dm && def.type!=="basic") facts.push(["⚔", "Daño", Math.round(dm*100) + "% del daño"]);
    if(def.scaling.healPct) facts.push(["✚", "Curación", Math.round(def.scaling.healPct*100) + "% vida"]);
  }
  let state = "";
  if(live && def.type!=="passive" && def.type!=="basic") state = live.ready ? `<div class="ab-state ready">✔ Lista</div>` : `<div class="ab-state wait">⏳ ${_abEsc(live.reason)}</div>`;
  return `<div class="ab-card${def.type==="ultimate" ? " ult" : ""}">
    <div class="ab-head">${abilityIconHTML(def)}<div class="ab-title"><div class="ab-kicker">${_abEsc(ABILITY_SLOT_LABEL[def.slot]||"")}</div><div class="ab-name">${_abEsc(def.name)}</div></div>
      <div class="ab-shape" title="${_abEsc(T.label)}"><b>${_abEsc(T.glyph)}</b><span>${_abEsc(T.label)}</span></div></div>
    ${state}
    <div class="ab-desc">${_abEsc(opts.short ? def.shortDescription : def.fullDescription)}</div>
    ${facts.length ? `<div class="ab-facts">${facts.map(f=>`<span><b>${_abEsc(f[0])}</b>${_abEsc(f[1])}: ${_abEsc(f[2])}</span>`).join("")}</div>` : ""}
    ${def.statusEffects.length ? `<div class="ab-chips">${abilityStatusChipsHTML(def.statusEffects)}</div>` : ""}
  </div>`;
}
function abilityInspectorOpen(slot, anchorEl){
  if(!player || !player.cls) return false;
  const def = championAbilityDefinitions(player.classKey, player.cls).find(d=>d.slot===slot);
  if(!def) return false;
  const el = _abInspNode();
  el.innerHTML = abilityCardHTML(def, player) + `<div class="ab-hint">Soltá para cerrar · arrastrá para apuntar</div>`;
  el.classList.remove("hidden");
  // Ubicación: sobre el botón, dentro de la pantalla y de la zona segura (notch)
  const vw = window.innerWidth, vh = window.innerHeight;
  const w = Math.min(310, vw - 24);
  el.style.width = w + "px";
  const r = anchorEl ? anchorEl.getBoundingClientRect() : {left:vw-200, top:vh-160, width:60, height:60};
  const h = el.offsetHeight;
  let left = r.left + r.width/2 - w/2, top = r.top - h - 12;
  if(top < 8) top = Math.max(8, Math.min(vh - h - 8, r.top + r.height/2 - h/2)), left = r.left - w - 14;
  left = Math.max(12, Math.min(vw - w - 12, left));
  el.style.left = left + "px"; el.style.top = Math.max(8, top) + "px";
  _abInspFor = slot;
  if(typeof tutDone==="function") try{ tutDone("inspect"); }catch(e){}
  if(typeof telemetryEvent==="function") telemetryEvent("ability_inspected", {champion:player.classKey, slot:String(slot)});
  return true;
}
function abilityInspectorClose(){
  clearTimeout(_abInspTimer); _abInspTimer = 0;
  if(_abInspEl) _abInspEl.classList.add("hidden");
  const was = _abInspFor; _abInspFor = null; return was!==null;
}
function abilityInspectorIsOpen(){ return _abInspFor!==null; }
// Arranca el temporizador de long press (lo usan aim.js y el botón de la definitiva).
function abilityInspectorArm(slot, anchorEl, onOpen){
  clearTimeout(_abInspTimer);
  _abInspTimer = setTimeout(()=>{ _abInspTimer = 0; if(abilityInspectorOpen(slot, anchorEl) && onOpen) onOpen(); }, ABILITY_INSPECT_MS);
}
function abilityInspectorDisarm(){ clearTimeout(_abInspTimer); _abInspTimer = 0; }
// tocar afuera / salir de la partida cierra
document.addEventListener("pointerdown", ev=>{ if(_abInspFor!==null && _abInspEl && !_abInspEl.contains(ev.target) && !(ev.target.closest && ev.target.closest(".ability-btn"))) abilityInspectorClose(); }, true);

// DEFINITIVA: tocar = lanzar al soltar (antes al apretar); mantener = inspeccionar sin lanzar.
(function bindUltInspector(){
  const el = document.getElementById("btn-ult"); if(!el) return;
  let pid = null, inspected = false;
  el.addEventListener("pointerdown", ev=>{
    ev.preventDefault(); pid = ev.pointerId; inspected = false;
    try{ el.setPointerCapture(ev.pointerId); }catch(_){}
    abilityInspectorArm("ult", el, ()=>{ inspected = true; });
  });
  const up = (ev, cancelled)=>{
    if(pid===null || ev.pointerId!==pid) return;
    pid = null; abilityInspectorDisarm();
    if(inspected){ abilityInspectorClose(); return; }
    if(!cancelled) useUltimate();
  };
  el.addEventListener("pointerup", ev=>up(ev, false));
  el.addEventListener("pointercancel", ev=>up(ev, true));
})();
_abInspNode(); // existe desde el arranque (lo miran pruebas y lectores de pantalla)
