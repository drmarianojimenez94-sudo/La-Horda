"use strict";
/* ============================================================
   js/ui/inventory-ui.js
   INVENTARIO (objetos de la cuenta, compartidos por todos los campeones):
   - renderChampInventory(): vista POR CAMPEÓN (la Sala y la ficha de Mis Campeones): equipo puesto,
     sets, objetos compatibles/recomendados/todos, equipar y desequipar con un toque.
   - Mi Inventario (pestaña en Mis Campeones): todos los objetos con filtros (rareza, tipo,
     campeón, sets), RECETAS de Míticos ordenadas por progreso y COLECCIÓN (catálogo descubierto).
   ============================================================ */

// Qué efectos le importan a cada rol (para "Recomendados").
const ROLE_STAT_PREF = {
  tanque:  {hp_mult:3, def_add:3, res_physical:2, res_fire:1, res_ice:1, res_lightning:1, lifesteal_add:1, overheal_shield_pct:1},
  asesino: {dmg_mult:3, crit_chance_add:3, crit_mult_add:2, atkspeed_mult:2, lifesteal_add:1, speed_mult:1, missinghp_dmg_bonus:1},
  mago:    {skilldmg_mult:3, cd_mult:3, energy_mult:2, dmg_mult:2, onhit_proc:1},
  soporte: {heal_mult:3, overheal_shield_pct:2, energy_mult:2, cd_mult:2, hp_mult:1, def_add:1}
};
const ITEM_ELEMENT_ICON = {fire:"🔥", ice:"❄", lightning:"⚡", bleed:"🩸", holy:"✦", arcane:"✧", physical:"⚔"};
function itemRelevance(it, classKey){
  if(!canEquipItem(classKey, it)) return -1;
  const role = (CLASSES[classKey]||{}).roleCategory || "asesino";
  const pref = ROLE_STAT_PREF[role] || {};
  let r = 0;
  for(const p of (it.passives||[])) r += (pref[p.effect]||0);
  if(it.designed && it.champion===classKey) r += 8;
  if(it.set && typeof setChampionAffinity==="function" && setChampionAffinity(it.set)===classKey) r += 8;
  return r + rarityIndex(it.rarity)*0.5;
}
function itemColor(it){ return it.set ? SET_COLOR : RARITY_META[it.rarity].color; }
function itemTierLabel(it){ return it.set ? "Set" : RARITY_META[it.rarity].label; }
// Tarjeta de objeto compartida. o = {classKey, actions:true|false, compare:bool}
function itemCardHTML(it, o){
  o = o || {};
  const col = itemColor(it);
  const by = itemEquippedBy(it.uid);
  const compat = o.classKey ? canEquipItem(o.classKey, it) : true;
  const onMe = o.classKey && by===o.classKey;
  const owner = it.designed && it.champion ? `<span class="inv-owner">Solo ${CLASSES[it.champion].name}</span>` : "";
  const elem = it.element && ITEM_ELEMENT_ICON[it.element] ? `<span class="inv-elem">${ITEM_ELEMENT_ICON[it.element]}</span>` : "";
  const byTxt = by ? `<span class="inv-by ${onMe?"me":""}">${onMe?"Equipado":"Lo usa "+CLASSES[by].name}</span>` : "";
  const passives = itemPassivesHTML(it);
  const epithet = it.epithet ? `<div class="item-epithet">«${it.epithet}»</div>` : "";
  const sell = sellValueOf(it);
  let actions = "";
  if(o.actions){
    const equipBtn = o.classKey ? (onMe ? `<button data-inv-unequip="${it.type}">Quitar</button>`
      : (compat ? `<button class="primary" data-inv-equip="${it.uid}">${by?"Equipar (sacárselo a "+CLASSES[by].name+")":"Equipar"}</button>` : `<button disabled>No compatible</button>`)) : "";
    actions = `<div class="vic-item-actions">${equipBtn}
      ${it.rarity!=="unico" ? `<button data-inv-sell="${it.uid}">Vender (+${sell}o)</button>` : ""}
      <button data-inv-discard="${it.uid}">Descartar</button></div>`;
  }
  return `<div class="inv-card tier-${itemTier(it)} ${it.set?"set-item":""} ${compat?"":"incompat"}" data-inv-card="${it.uid}" style="border-left-color:${col};">
    <span class="item-icon">${it.icon}</span>
    <div class="item-meta">
      <div class="item-name" style="color:${col};">${elem}${it.name}${it.set?' <span class="set-badge">SET</span>':""}</div>
      ${epithet}
      <div class="item-stat">${itemTierLabel(it)} · ${ITEM_TYPES[it.type].label} · +${Math.round(it.value*100)}% ${ITEM_TYPES[it.type].statLabel} ${owner} ${byTxt}</div>
      ${passives ? `<div class="item-passives">${passives}</div>` : ""}
      ${(o.compare && o.classKey && compat && !onMe) ? compareItemsHTML(o.classKey, it) : ""}
      ${actions}
    </div>
  </div>`;
}
function _bindItemActions(panel, classKey, rerender){
  panel.querySelectorAll("[data-inv-equip]").forEach(b=> b.addEventListener("click", ev=>{ ev.stopPropagation(); equipItem(classKey, b.getAttribute("data-inv-equip")); prepCompareOpenUid = null; rerender(); }));
  panel.querySelectorAll("[data-inv-unequip]").forEach(b=> b.addEventListener("click", ev=>{ ev.stopPropagation(); unequipItem(classKey, b.getAttribute("data-inv-unequip")); rerender(); }));
  panel.querySelectorAll("[data-inv-sell]").forEach(b=> b.addEventListener("click", ev=>{
    ev.stopPropagation();
    const it = findStashItem(b.getAttribute("data-inv-sell"));
    const warn = it && (it.rarity==="legendario"||it.rarity==="mitico"||it.set) ? "\nEs un objeto valioso: si lo necesitás para una receta o un set, no lo vas a recuperar." : "";
    if(!confirm(`¿Vender por ${sellValueOf(it)} de oro? No se puede deshacer.${warn}`)) return;
    sellItem(classKey, it.uid); prepCompareOpenUid = null; rerender(); if(typeof renderSaveLine==="function") renderSaveLine();
  }));
  panel.querySelectorAll("[data-inv-discard]").forEach(b=> b.addEventListener("click", ev=>{
    ev.stopPropagation();
    if(!confirm("¿Descartar este objeto sin recompensa? No se puede deshacer.")) return;
    discardItem(classKey, b.getAttribute("data-inv-discard")); prepCompareOpenUid = null; rerender();
  }));
}

/* ---------------- vista por campeón ---------------- */
let champInvFilter = "compatibles"; // ordenados por relevancia para el rol del campeón
function renderChampInventory(panel, classKey, rerender){
  if(!panel) return;
  const champ = save.champions[classKey];
  champ.equipment = Object.assign(mkEquipment(), champ.equipment||{});
  let html = renderEquipmentGridHTML(classKey, "prep-unequip");
  html += renderSetPanelHTML(classKey);
  const used = stashUsedSlots();
  html += `<div class="inv-capacity">Inventario de la cuenta: ${used}/${INVENTORY_CAPACITY}${used>=INVENTORY_CAPACITY?" — lleno: vendé o descartá para recibir botín":""} · <a href="#" data-open-myinv>abrir Mi Inventario</a></div>`;
  html += renderFusionHTML(classKey, "prep-fuse");
  const chips = [["compatibles","Compatibles"],["recomendados","Recomendados"],["todos","Todos"]];
  html += `<div class="inv-filters">${chips.map(([k,l])=>`<button class="inv-chip ${champInvFilter===k?"on":""}" data-champ-filter="${k}">${l}</button>`).join("")}</div>`;
  let list = stashItems().slice();
  if(champInvFilter!=="todos") list = list.filter(it=>canEquipItem(classKey, it));
  if(champInvFilter==="recomendados") list = list.filter(it=>itemRelevance(it, classKey) >= 3 || itemEquippedBy(it.uid)===classKey);
  list.sort((a,b)=> (itemEquippedBy(b.uid)===classKey) - (itemEquippedBy(a.uid)===classKey) || itemRelevance(b, classKey)-itemRelevance(a, classKey) || rarityIndex(b.rarity)-rarityIndex(a.rarity));
  if(!list.length){
    html += `<div class="inv-empty">${stashItems().length ? "Nada para mostrar con este filtro." : "Todavía no hay objetos en la cuenta. Se obtienen en el cofre del final de cada arena (desde el subjefe)."}</div>`;
  } else {
    html += '<div class="inv-list">' + list.map(it=>itemCardHTML(it, {classKey, actions:true, compare: prepCompareOpenUid===it.uid})).join("") + '</div>';
  }
  html += `<button class="inv-debug-btn prep-debug-gen" ${stashFull()?"disabled":""}>[Prueba] Generar objeto al azar — para testear sin esperar a derrotar un subjefe</button>`;
  panel.innerHTML = html;
  panel.querySelectorAll(".inv-card").forEach(card=> card.addEventListener("click", ev=>{
    if(ev.target.closest("button")) return;
    const uid = card.getAttribute("data-inv-card");
    prepCompareOpenUid = (prepCompareOpenUid===uid) ? null : uid; rerender();
  }));
  panel.querySelectorAll("[data-champ-filter]").forEach(b=> b.addEventListener("click", ()=>{ champInvFilter = b.getAttribute("data-champ-filter"); rerender(); }));
  panel.querySelectorAll("[data-prep-unequip]").forEach(b=> b.addEventListener("click", ev=>{ ev.stopPropagation(); unequipItem(classKey, b.getAttribute("data-prep-unequip")); rerender(); }));
  panel.querySelectorAll("[data-prep-fuse]").forEach(b=> b.addEventListener("click", ev=>{ ev.stopPropagation(); handleFuseClick(classKey, b.getAttribute("data-prep-fuse")); rerender(); }));
  panel.querySelectorAll("[data-reforge]").forEach(b=> b.addEventListener("click", ev=>{ ev.stopPropagation(); const r = reforgeSetDuplicates(classKey, b.getAttribute("data-reforge")); if(!r.ok) alert(r.reason); rerender(); }));
  const openInv = panel.querySelector("[data-open-myinv]"); if(openInv) openInv.addEventListener("click", ev=>{ ev.preventDefault(); if(state==="prep") return; openMyInventory("objetos"); });
  _bindItemActions(panel, classKey, rerender);
  const dbg = panel.querySelector(".prep-debug-gen");
  if(dbg) dbg.addEventListener("click", ()=>{
    const type = rollItemType(classKey);
    const rarity = ["comun","raro","muyraro","legendario"][Math.floor(Math.random()*4)];
    addItemToInventory(classKey, rarity==="legendario" ? materializeLoot({tier:"legendario"}, classKey, currentArena) : makeItem(type, rarity, classKey));
    rerender();
  });
}

/* ---------------- Mi Inventario ---------------- */
let myInvTab = "objetos";
const myInvFilter = {rarity:"todas", type:"todos", champ:"todos"};
function openMyInventory(tab){ myInvTab = tab || myInvTab; setState("inventory"); renderMyInventory(); }
function renderMyInventory(){
  const used = stashUsedSlots();
  document.getElementById("myinv-sub").textContent = `${used}/${INVENTORY_CAPACITY} espacios · ${stashItems().length} objetos en total (lo equipado no ocupa espacio) · compartido por todos tus campeones`;
  setHubTabs("myinv-tabs", myInvTab);
  const panel = document.getElementById("myinv-panel");
  if(myInvTab==="recetas") renderRecipesPanel(panel);
  else if(myInvTab==="coleccion") renderCollectionPanel(panel);
  else renderMyItemsPanel(panel);
}
function renderMyItemsPanel(panel){
  const rarChips = [["todas","Todas"],["comun","Común"],["raro","Raro"],["muyraro","Muy Raro"],["legendario","Legendario"],["mitico","Mítico"],["set","Set"],["unico","Único"]];
  const typeChips = [["todos","Todos"]].concat(EQUIP_SLOT_TYPES.map(t=>[t, ITEM_TYPES[t].icon+" "+ITEM_TYPES[t].label]));
  const champOpts = [["todos","Todos los campeones"],["universal","Sirve a cualquiera"]].concat(Object.keys(CLASSES).map(k=>[k, "Para "+CLASSES[k].name]));
  let html = `<div class="inv-filters">${rarChips.map(([k,l])=>`<button class="inv-chip ${myInvFilter.rarity===k?"on":""}" data-f-rar="${k}" ${k!=="todas"&&k!=="set"&&RARITY_META[k]?`style="color:${RARITY_META[k].color}"`:(k==="set"?`style="color:${SET_COLOR}"`:"")}>${l}</button>`).join("")}</div>
    <div class="inv-filters">${typeChips.map(([k,l])=>`<button class="inv-chip ${myInvFilter.type===k?"on":""}" data-f-type="${k}">${l}</button>`).join("")}</div>
    <div class="inv-filters"><select id="myinv-champ">${champOpts.map(([k,l])=>`<option value="${k}" ${myInvFilter.champ===k?"selected":""}>${l}</option>`).join("")}</select></div>`;
  let list = stashItems().slice();
  if(myInvFilter.rarity!=="todas") list = list.filter(it=> myInvFilter.rarity==="set" ? !!it.set : (it.rarity===myInvFilter.rarity && !it.set));
  if(myInvFilter.type!=="todos") list = list.filter(it=>it.type===myInvFilter.type);
  if(myInvFilter.champ==="universal") list = list.filter(it=>!(it.designed && it.champion));
  else if(myInvFilter.champ!=="todos") list = list.filter(it=>canEquipItem(myInvFilter.champ, it));
  list.sort((a,b)=> rarityIndex(b.rarity)-rarityIndex(a.rarity) || (b.set?1:0)-(a.set?1:0) || a.type.localeCompare(b.type));
  html += list.length ? '<div class="inv-list tall">' + list.map(it=>itemCardHTML(it, {actions:true})).join("") + '</div>'
    : '<div class="inv-empty">No hay objetos con este filtro.</div>';
  panel.innerHTML = html;
  panel.querySelectorAll("[data-f-rar]").forEach(b=> b.addEventListener("click", ()=>{ myInvFilter.rarity = b.getAttribute("data-f-rar"); renderMyInventory(); }));
  panel.querySelectorAll("[data-f-type]").forEach(b=> b.addEventListener("click", ()=>{ myInvFilter.type = b.getAttribute("data-f-type"); renderMyInventory(); }));
  const sel = panel.querySelector("#myinv-champ"); if(sel) sel.addEventListener("change", ()=>{ myInvFilter.champ = sel.value; renderMyInventory(); });
  _bindItemActions(panel, null, renderMyInventory);
}
function renderRecipesPanel(panel){
  const recs = sortedRecipes();
  let html = `<div class="lobby-note">Cada Mítico se fabrica con <b>3 Legendarios específicos</b>. Caen con más frecuencia en las arenas de su tema, y los que te faltan para una receta empezada pesan más en el botín.</div>`;
  html += recs.map(r=>{
    const M = RECIPE_MYTHICS[r.mythicId], P = MYTHIC_POWERS[M.mythic];
    const parts = r.parts.map(p=>{
      const L = NAMED_LEGENDARIES[p.id];
      const arenas = Object.keys(L.arenas||{}).sort((a,b)=>L.arenas[b]-L.arenas[a]).slice(0,2).map(a=>(ARENA_MODS[a]||{}).label||a).join(", ");
      return `<div class="rc-part ${p.have?"have":"miss"}"><span class="rc-mark">${p.have?"✓":"?"}</span>
        <span class="rc-name" style="color:${p.have||p.seen?RARITY_META.legendario.color:"#8a8078"}">${p.have||p.seen ? p.name : "??? — "+ITEM_TYPES[p.type].label+" legendario"}</span>
        <span class="rc-where">${p.have ? (p.equippedBy?"(lo usa "+CLASSES[p.equippedBy].name+")":"en el inventario") : "Suele caer en: "+arenas}</span></div>`;
    }).join("");
    return `<div class="recipe-card ${r.ready?"ready":""}" style="--mc:${RARITY_META.mitico.color}">
      <div class="rc-head"><span class="rc-title">${ITEM_TYPES[M.type].icon} ${M.name}</span><span class="rc-count">${r.n} / ${r.total}</span></div>
      <div class="rc-power">★ ${P.name}: ${P.desc}</div>
      ${parts}
      ${r.ready ? `<button class="btn rc-craft" data-craft="${r.mythicId}">⚗ Fabricar ${M.name}</button>` : ""}
      ${r.owned ? `<div class="rc-owned">Ya fabricaste o encontraste este Mítico alguna vez.</div>` : ""}
    </div>`;
  }).join("");
  panel.innerHTML = html;
  panel.querySelectorAll("[data-craft]").forEach(b=> b.addEventListener("click", ()=>{
    const id = b.getAttribute("data-craft");
    if(!confirm(`¿Fabricar ${DESIGNED_ITEMS[id].name}? Los 3 legendarios se consumen.`)) return;
    const res = craftMythic(id);
    if(!res.ok){ alert(res.reason); return; }
    if(typeof playSfx==="function") playSfx("lootMythic");
    renderMyInventory();
    if(typeof showLootCeremonyForItem==="function") showLootCeremonyForItem(res.item);
  }));
}
function renderCollectionPanel(panel){
  const groups = [
    ["Legendarios con nombre", Object.keys(NAMED_LEGENDARIES), RARITY_META.legendario.color],
    ["Míticos", Object.keys(DESIGNED_ITEMS).filter(id=>DESIGNED_ITEMS[id].rarity==="mitico"), RARITY_META.mitico.color],
    ["Legendarios de campeón", Object.keys(DESIGNED_ITEMS).filter(id=>{ const d = DESIGNED_ITEMS[id]; return d.rarity==="legendario" && d.champion && !d.named && !d.set; }), RARITY_META.legendario.color],
    ["Piezas de set", Object.keys(DESIGNED_ITEMS).filter(id=>DESIGNED_ITEMS[id].set), SET_COLOR],
    ["Únicos", Object.keys(UNIQUE_DESIGNS), RARITY_META.unico.color]
  ];
  let total = 0, seen = 0;
  const body = groups.map(([title, ids, col])=>{
    const n = ids.filter(collectionHas).length; total += ids.length; seen += n;
    const cells = ids.map(id=>{
      const d = DESIGNED_ITEMS[id], has = collectionHas(id);
      const hint = d.unique ? "Único · "+CLASSES[d.champion].name : (d.set ? SET_DB[d.set].name : ITEM_TYPES[d.type].label);
      return `<div class="col-cell ${has?"have":""}" style="--cc:${col}" title="${has?d.name:"Sin descubrir"}">
        <span class="col-ico">${has ? ITEM_TYPES[d.type].icon : "?"}</span><span class="col-name">${has ? d.name : "???"}</span><span class="col-hint">${hint}</span></div>`;
    }).join("");
    return `<div class="col-group"><div class="col-title" style="color:${col}">${title} — ${n}/${ids.length}</div><div class="col-grid">${cells}</div></div>`;
  }).join("");
  panel.innerHTML = `<div class="lobby-note">Descubiertos: <b>${seen}/${total}</b>. Lo que alguna vez tuviste queda registrado aunque lo vendas.</div>` + body;
}
document.getElementById("mychamps-tab-inv").addEventListener("click", ()=> openMyInventory("objetos"));
document.getElementById("myinv-back-btn").addEventListener("click", ()=>{ setState("champions"); renderMyChampions(); });
document.querySelectorAll("#myinv-tabs .hub-tab").forEach(t=> t.addEventListener("click", ()=>{ myInvTab = t.dataset.tab; renderMyInventory(); }));
