"use strict";
/* ============================================================
   js/ui/item-preview.js
   VISTA PREVIA DE UN OBJETO (tocar una tarjeta del inventario): todo lo que hace falta para
   ENTENDER un objeto antes de equiparlo.
     ARTE · NOMBRE · CATEGORÍA · TIPO/SLOT · NIVEL · STATS (con el rango posible de esa pieza)
     EFECTO (qué hace, con números reales) · SET (piezas conseguidas/faltantes, bonus activos y el
     siguiente) · LORE (aparte, en cursiva) · comparación con lo equipado · mejorar con Gemas.
   ============================================================ */
function _pct(v){ return Math.round(v*100); }
// Bloque de set dentro de la vista previa: piezas, bonus activos y el próximo.
function itemSetBlockHTML(it, classKey){
  if(!it.set || !SET_DB[it.set]) return "";
  const S = SET_DB[it.set], owned = ownedDesignIds(), total = setPieceCount(it.set);
  const eqN = classKey ? equippedSetCount(classKey, it.set) : 0;
  const pieces = setPieceIds(it.set).map(id=>{
    const d = DESIGNED_ITEMS[id], have = owned.has(id);
    const eq = classKey && EQUIP_SLOT_TYPES.some(t=>{ const e = equippedItem(classKey, t); return e && e.designId===id; });
    return `<span class="ip-piece ${eq?"eq":(have?"have":"miss")}">${eq?"✓":(have?"◐":"□")} ${d.name}</span>`;
  }).join("");
  const next = S.thresholds.find(th=>eqN < th.count);
  const bon = S.thresholds.map((th,i)=>`<div class="ip-bonus ${eqN>=th.count?"on":""}">${i===S.thresholds.length-1?"COMPLETO":"BONUS"} ${th.count}/${total}: ${th.desc}</div>`).join("");
  const skin = (typeof SET_SKINS!=="undefined" && SET_SKINS[it.set]) ? "Completo: activa su skin." : "Completo: aura plena (la skin llega cuando exista su arte).";
  return `<div class="ip-sec ip-set"><div class="ip-h" style="color:${SET_COLOR}">SET · ${S.name} <span class="ip-sub">${S.theme||""}</span></div>
    <div class="ip-pieces">${pieces}</div>
    <div class="ip-sub">Equipadas: ${eqN}/${total}${next?` · Próximo bonus con ${next.count}`:" · ¡Completo!"} · ${skin}</div>${bon}</div>`;
}
function itemDetailHTML(it, classKey){
  const col = itemColor(it), tier = itemTier(it), lv = itemLevel(it);
  const [lo, hi] = itemStatRange(it);
  const owner = it.designed && it.champion ? `Solo ${CLASSES[it.champion].name}` : "Universal";
  const family = it.family && ITEM_FAMILIES[it.family] ? `<span class="ip-fam" style="color:${ITEM_FAMILIES[it.family].color}">Familia ${ITEM_FAMILIES[it.family].label}</span>` : "";
  // pasivas que NO se van a sumar porque ya hay otra igual equipada (regla de duplicados)
  const dupIds = new Set();
  if(classKey){ EQUIP_SLOT_TYPES.forEach(t=>{ const e = equippedItem(classKey, t); if(e && e.uid!==it.uid && e.type!==it.type){ (e.passives||[]).forEach(p=>{ if(_isCatalogPassive(p)) dupIds.add(p.id); }); if(e.mythicPassive) dupIds.add(e.mythicPassive.id); } }); }
  const eff = itemEffectLines(it).map(l=>`<div class="ip-line ${l.cls}">${l.txt}${l.id && dupIds.has(l.id) ? ' <span class="ip-dup">(ya la tenés en otra pieza: no se suma, vale la más fuerte)</span>' : ""}</div>`).join("") || '<div class="ip-line ip-sub">Solo estadísticas.</div>';
  const cost = gemUpgradeCost(it);
  const upg = cost===null ? `<div class="ip-upg max">Nivel máximo</div>`
    : `<button class="ip-upg-btn ${(save.gems||0) >= cost ? "ready" : ""}" data-ip-upgrade="${it.uid}">Mejorar a Nv.${lv+1} · ◆ ${cost} gema${cost>1?"s":""}</button><span class="ip-sub"> (tenés ${save.gems||0} · al máximo: ◆ ${gemCostToMax(it)})</span>`;
  const compare = (classKey && canEquipItem(classKey, it) && itemEquippedBy(it.uid)!==classKey && typeof compareItemsHTML==="function") ? compareItemsHTML(classKey, it) : "";
  const lore = it.designed && DESIGNED_ITEMS[it.designId] ? DESIGNED_ITEMS[it.designId].lore : null;
  return `<div class="ip-card tier-${tier}" style="--ic:${col}">
    <div class="ip-top">${itemIconHTML(it, "ip-art")}
      <div class="ip-head"><div class="ip-name" style="color:${col}">${it.name}</div>
        ${it.epithet?`<div class="ip-epi">«${it.epithet}»</div>`:""}
        <div class="ip-tags"><span class="ip-tier" style="border-color:${col};color:${col}">${itemTierLabel(it)}</span><span>${ITEM_TYPES[it.type].label}</span><span>Nv. ${lv}/${ITEM_MAX_LEVEL}</span><span>${owner}</span>${family}</div>
      </div></div>
    <div class="ip-sec"><div class="ip-h">ESTADÍSTICAS</div>
      <div class="ip-line">+${_pct(itemStat(it))}% ${ITEM_TYPES[it.type].statLabel} <span class="ip-sub">(esta pieza: ${_pct(lo)}–${_pct(hi)}% en Nv.${lv})</span></div></div>
    <div class="ip-sec"><div class="ip-h">EFECTO</div>${eff}</div>
    ${itemSetBlockHTML(it, classKey)}
    ${compare}
    <div class="ip-sec ip-upgrade"><div class="ip-h">MEJORAR</div>${upg}</div>
    ${lore ? `<div class="ip-sec ip-lore"><div class="ip-h">LORE</div><i>“${lore}”</i></div>` : ""}
  </div>`;
}
// Modal de vista previa (se abre desde cualquier tarjeta de inventario).
function openItemPreview(uid, classKey, rerender){
  const it = findStashItem(uid); if(!it) return;
  let el = document.getElementById("item-preview");
  if(!el){ el = document.createElement("div"); el.id = "item-preview"; document.body.appendChild(el); }
  const by = itemEquippedBy(uid), onMe = classKey && by===classKey, compat = classKey ? canEquipItem(classKey, it) : false;
  const equipBtn = classKey ? (onMe ? `<button data-ip-unequip="${it.type}">Quitar</button>` : (compat ? `<button class="primary" data-ip-equip="${uid}">Equipar</button>` : `<button disabled>No compatible</button>`)) : "";
  el.innerHTML = `<div class="ip-backdrop" data-ip-close></div><div class="ip-panel">${itemDetailHTML(it, classKey)}
    <div class="ip-actions">${equipBtn}<button data-ip-close>Cerrar</button></div></div>`;
  el.classList.remove("hidden");
  const close = ()=>{ el.classList.add("hidden"); el.innerHTML = ""; if(rerender) rerender(); };
  el.querySelectorAll("[data-ip-close]").forEach(b=>b.addEventListener("click", close));
  const up = el.querySelector("[data-ip-upgrade]");
  if(up) up.addEventListener("click", ()=>{ const r = upgradeItemLevel(uid); if(!r.ok) alert(r.reason); openItemPreview(uid, classKey, rerender); if(typeof renderSaveLine==="function") renderSaveLine(); });
  const eq = el.querySelector("[data-ip-equip]"); if(eq) eq.addEventListener("click", ()=>{ equipItem(classKey, uid); openItemPreview(uid, classKey, rerender); });
  const un = el.querySelector("[data-ip-unequip]"); if(un) un.addEventListener("click", ()=>{ unequipItem(classKey, it.type); openItemPreview(uid, classKey, rerender); });
}
