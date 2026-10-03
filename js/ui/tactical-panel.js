"use strict";
/* ============================================================
   js/ui/tactical-panel.js
   PANEL TÁCTICO (UX Bible §Panel táctico). El botón ❚❚:
     - Partida SOLA: pausa (como siempre) y muestra el panel.
     - MULTIJUGADOR: NO pausa a nadie. El panel se abre semitransparente encima de la partida, que
       sigue (el anfitrión manda); el héroe propio queda en su lugar. Se cierra con un toque.
   Muestra: campeón, nivel, vida/energía actuales, estadísticas, básico + pasiva + habilidades +
   definitiva con enfriamientos EN VIVO (misma ficha que el long press: abilityCardHTML), estados
   activos, talentos elegidos, equipo y efectos de set. Lee de las mismas fuentes que el HUD; no
   escribe nada en la partida ni en la red.
   ============================================================ */
let _tpTimer = 0;
function _tpEsc(s){ return String(s==null ? "" : s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function _tpNode(){
  let el = document.getElementById("tactical-panel");
  if(el) return el;
  const scr = document.getElementById("pause-screen"); if(!scr) return null;
  el = document.createElement("div"); el.id = "tactical-panel";
  const title = scr.querySelector(".arena-title");
  if(title && title.nextSibling) scr.insertBefore(el, title.nextSibling); else scr.prepend(el);
  return el;
}
// Estados activos del héroe, con el lenguaje de combate (glifo + nombre; nunca solo color).
function tacticalStatusList(h){
  const out = [];
  const add = (key, txt, ms)=>out.push({key, txt, ms});
  if(!h) return out;
  if(h.invulnTimer > 0) add("invulnerable", "Invulnerable", h.invulnTimer);
  if((h.shield||0) + (h.itemShield||0) >= 1) add("shield", "Escudo " + Math.round((h.shield||0)+(h.itemShield||0)), h.shieldTimer||0);
  if(h.buffTimer > 0 && (h.buffDmgMult||1) > 1) add("buff", "+" + Math.round(((h.buffDmgMult||1)-1)*100) + "% daño", h.buffTimer);
  if(h.buffTimer > 0 && (h.buffDefMult||1) > 1) add("buff", "+" + Math.round(((h.buffDefMult||1)-1)*100) + "% defensa", h.buffTimer);
  if(h.stunTimer > 0) add("stun", "Aturdido", h.stunTimer);
  if(h.slowTimer > 0 && (h.slowAmt||0) > 0) add("slow", "Ralentizado " + Math.round(h.slowAmt*100) + "%", h.slowTimer);
  if(h.burnTimer > 0) add("burn", "Quemado", h.burnTimer);
  if(h.poisonTimer > 0) add("poison", "Envenenado", h.poisonTimer);
  if(h.bleedTimer > 0) add("bleed", "Sangrando", h.bleedTimer);
  if(h.frozenTimer > 0) add("freeze", "Congelado", h.frozenTimer);
  return out;
}
function _tpStatusHTML(h){
  const list = tacticalStatusList(h);
  if(!list.length) return `<div class="tp-empty">Sin estados activos.</div>`;
  return `<div class="ab-chips">${list.map(s=>{ const L = COMBAT_LANGUAGE[s.key] || COMBAT_LANGUAGE.buff;
    return `<span class="ab-chip" style="--chip:${L.color}"><b>${_tpEsc(L.glyph)}</b>${_tpEsc(s.txt)}${s.ms > 0 ? " · " + (s.ms/1000).toFixed(1).replace(".", ",") + " s" : ""}</span>`; }).join("")}</div>`;
}
function _tpTalentsHTML(k){
  if(typeof talentState!=="function" || typeof talentAllNodes!=="function") return "";
  const st = talentState(k), picked = talentAllNodes(k).filter(n=>(st.nodes||{})[n.id] > 0);
  const tree = typeof talentTreeFor==="function" ? talentTreeFor(k) : null;
  const mastery = st.mastery && tree && tree.masteries ? (Array.isArray(tree.masteries) ? tree.masteries.find(m=>m.id===st.mastery) : tree.masteries[st.mastery]) : null;
  if(!picked.length && !mastery) return `<div class="tp-empty">Sin talentos elegidos (se eligen en la Sala).</div>`;
  return `<ul class="tp-list">${mastery ? `<li><b>Maestría: ${_tpEsc(mastery.name||st.mastery)}</b></li>` : ""}${picked.map(n=>`<li><b>${_tpEsc(n.name)}</b> ${n.maxRank>1 ? `(${st.nodes[n.id]}/${n.maxRank})` : ""} — ${_tpEsc(n.desc)}</li>`).join("")}</ul>`;
}
function _tpGearHTML(h){
  const k = h.classKey;
  if(typeof EQUIP_SLOT_TYPES==="undefined" || typeof equippedItem!=="function") return "";
  const items = EQUIP_SLOT_TYPES.map(t=>({t, it:equippedItem(k, t)})).filter(x=>x.it);
  const sets = typeof heroSetCounts==="function" ? (heroSetCounts(h) || {}) : {};
  const setRows = Object.entries(sets).map(([id, n])=>{
    const S = SET_DB[id]; if(!S) return "";
    const total = typeof setFullCount==="function" ? setFullCount(id) : Object.keys(S.pieces||{}).length;
    const th = (S.thresholds||[]).map(t=>`<li class="${n >= t.count ? "on" : "off"}">${n >= t.count ? "✔" : "·"} (${t.count}) ${_tpEsc(t.desc)}</li>`).join("");
    return `<div class="tp-set"><b>${_tpEsc(S.name)}</b> ${n}/${total}<ul class="tp-list">${th}</ul></div>`;
  }).join("");
  if(!items.length && !setRows) return `<div class="tp-empty">Sin equipo (se equipa en la Sala).</div>`;
  return `<ul class="tp-list">${items.map(x=>`<li><b>${_tpEsc(x.t)}</b>: ${_tpEsc(x.it.name)}</li>`).join("")}</ul>${setRows}`;
}
function renderTacticalPanel(){
  const el = _tpNode(); if(!el || !player || !player.cls) return;
  const h = player, k = h.classKey, champ = save.champions[k] || {};
  const online = !!(typeof netMatch!=="undefined" && netMatch);
  const scr = document.getElementById("pause-screen");
  if(scr){
    scr.classList.toggle("tactical-live", online);
    const t = scr.querySelector(".arena-title"); if(t) t.textContent = online ? "Panel táctico" : "Pausa";
    const note = scr.querySelector(".pause-note"); if(note) note.innerHTML = online
      ? "<b>La partida sigue:</b> en multijugador nadie se pausa. Consultá y volvé rápido."
      : "Partida en pausa. Objetos y talentos se cambian en la Sala; las habilidades se suben en partida con el <b>+</b> de cada botón.";
  }
  const defs = championAbilityDefinitions(k, h.cls);
  const card = d=>abilityCardHTML(d, h, {short:true});
  el.innerHTML = `
    <div class="tp-head">
      <div class="tp-name">${_tpEsc(h.cls.name || CLASSES[k].name)}</div>
      <div class="tp-sub">${_tpEsc((CLASSES[k]||{}).role||"")}</div>
      <div class="tp-bars"><span>♥ ${Math.ceil(h.hp)}/${Math.ceil(h.maxHp)}</span><span>✦ ${Math.floor(h.energy||0)}/${Math.round(h.energyMax||h.cls.energyMax||100)}</span><span>Nv. ${champ.level||1}</span>${typeof runLevel!=="undefined" ? `<span>Arena ${runLevel}/${typeof LEVEL_COUNT!=="undefined" ? LEVEL_COUNT : 10}</span>` : ""}</div>
    </div>
    <div class="tp-section"><div class="tp-h">Estados</div>${_tpStatusHTML(h)}</div>
    <div class="tp-section"><div class="tp-h">Kit</div><div class="tp-grid">${defs.map(card).join("")}</div></div>
    <div class="tp-section"><div class="tp-h">Talentos</div>${_tpTalentsHTML(k)}</div>
    <div class="tp-section"><div class="tp-h">Equipo y sets</div>${_tpGearHTML(h)}</div>
    <div class="tp-section tp-help"><div class="tp-h">Ayuda</div>${_tpHelpHTML()}</div>`;
}
// Volver a consultar: la Guía del Hechicero y la lección de la arena actual (si ya se vio).
function _tpHelpHTML(){
  const a = typeof currentArena!=="undefined" ? currentArena : null;
  const B = a && typeof arenaBlueprint==="function" ? arenaBlueprint(a) : null;
  const canReplay = B && typeof ARENA_TUT_DRIVERS!=="undefined" && ARENA_TUT_DRIVERS[a] && typeof arenaTutorialSeen==="function" && arenaTutorialSeen(a);
  return `${B ? `<div class="tp-rule">✦ <b>${_tpEsc(B.primary.name)}:</b> ${_tpEsc(B.primary.rule)}</div><div class="tp-rule">⚠ <b>${_tpEsc(B.hazard.name)}</b> — aviso: ${_tpEsc(B.hazard.telegraph)}</div>` : ""}
    <div class="tp-actions">${typeof alphaGuideOpen==="function" ? `<button type="button" class="btn secondary small" data-tp="guide">📖 Guía del Hechicero</button>` : ""}
    ${canReplay ? `<button type="button" class="btn secondary small" data-tp="replay">↺ Repetir la lección de la arena</button>` : ""}</div>`;
}
// delegación: el panel se redibuja cada 0,4 s
document.addEventListener("click", ev=>{
  const b = ev.target && ev.target.closest && ev.target.closest("#tactical-panel [data-tp]"); if(!b) return;
  if(b.dataset.tp==="guide" && typeof alphaGuideOpen==="function") alphaGuideOpen();
  if(b.dataset.tp==="replay" && typeof arenaTutorialReplay==="function"){
    arenaTutorialReplay(currentArena);
    if(typeof ARENA_TUT!=="undefined"){ ARENA_TUT.run = null; ARENA_TUT.t = 1800; } // arranca al volver a la partida
    if(typeof showNetToast==="function") showNetToast("El Hechicero repite la lección al volver a la partida.");
  }
});
function tacticalPanelOpen(){
  renderTacticalPanel();
  clearInterval(_tpTimer);
  // enfriamientos y estados en vivo mientras está abierto (en multijugador la partida sigue)
  _tpTimer = setInterval(()=>{
    const scr = document.getElementById("pause-screen");
    if(!scr || scr.classList.contains("hidden")){ clearInterval(_tpTimer); _tpTimer = 0; return; }
    renderTacticalPanel();
  }, 400);
  if(typeof tutDone==="function") try{ tutDone("tactical"); }catch(e){}
  if(typeof telemetryEvent==="function") telemetryEvent("tactical_panel_opened", {online:!!(typeof netMatch!=="undefined" && netMatch)});
}
