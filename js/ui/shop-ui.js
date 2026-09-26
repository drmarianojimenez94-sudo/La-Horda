"use strict";
/* ============================================================
   js/ui/shop-ui.js
   TIENDA en tres pestañas (BUGFIX 01, etapa de prueba):
   - Campeones: todos los de CHAMPION_CATALOG, animados, con rol, historia, habilidades, precio y compra.
   - Objetos y sets: TODO el catálogo (shopCatalog en js/systems/shop.js) por categoría; los sets se
     muestran como conjunto (piezas que tenés / que faltan, bonus y cuáles tenés activos).
   - Skins: las skins de set que existen (SET_SKINS); se activan con el set COMPLETO, así que la
     tarjeta vende las piezas que te faltan (regla canónica: la skin nunca se compra suelta).
   Tocar un objeto abre su ficha completa (itemDetailHTML en modo tienda).
   ============================================================ */
let shopTab = "campeones", shopCat = "set", shopTier = {};
const SHOP_CATS = [["set", "Sets"], ["legendario", "Legendarios"], ["mitico", "Míticos"], ["unico", "Únicos"], ["campeon", "De campeón"], ["base", "Básicos"]];
const TIER_LABEL = {comun:"Común", raro:"Raro", muyraro:"Muy Raro", legendario:"Legendario", mitico:"Mítico"};

function renderShop(){
  document.getElementById("shop-gold-line").innerHTML = `Oro: <b>${fmtGold(save.gold)}</b> &nbsp;·&nbsp; Gemas: <b>${save.gems||0}</b> &nbsp;·&nbsp; Inventario: <b>${stashUsedSlots()}/${INVENTORY_CAPACITY}</b>`;
  document.querySelectorAll("[data-shop-tab]").forEach(b=>{
    b.classList.toggle("on", b.getAttribute("data-shop-tab")===shopTab);
    b.onclick = ()=>{ shopTab = b.getAttribute("data-shop-tab"); renderShop(); };
  });
  const panel = document.getElementById("shop-panel"); if(!panel) return;
  if(shopTab==="campeones") renderShopChampions(panel);
  else if(shopTab==="objetos") renderShopObjects(panel);
  else renderShopSkins(panel);
}
function _shopFlash(el){ if(!el) return; el.classList.remove("shop-bought"); void el.offsetWidth; el.classList.add("shop-bought"); }
function _shopAfterBuy(msg, sfx){
  if(typeof playSfx==="function") playSfx(sfx || "ready");
  if(typeof showNetToast==="function") showNetToast(msg);
  renderShop(); if(typeof renderSaveLine==="function") renderSaveLine();
}

/* ---------------- Campeones ---------------- */
function renderShopChampions(panel){
  panel.innerHTML = '<div class="shop-champ-list">' + CHAMPION_CATALOG.map(c=>{
    const cls = CLASSES[c.id], champ = save.champions[c.id], owned = champ.unlocked, sel = owned && selectedClass===c.id;
    const status = sel ? '<span class="shop-st sel">★ Seleccionado</span>' : owned ? `<span class="shop-st own">✔ Comprado · Nv. ${champ.level}</span>` : '<span class="shop-st lock">🔒 Bloqueado</span>';
    const skills = cls.skills.map(s=>`<span class="shop-skill">${s.ico} ${s.name}</span>`).join("") + `<span class="shop-skill ult">${cls.ultimate.ico} ${cls.ultimate.name}</span>`;
    return `<div class="shop-champ-row ${owned?"owned":""}" data-champ="${c.id}">
      <canvas class="champ-anim shop-champ-anim" width="96" height="96" data-class-key="${c.id}" data-idle="1" style="background:${cls.color}1c;"></canvas>
      <div class="shop-champ-info">
        <div class="shop-champ-name" style="color:${cls.color}">${cls.name} ${status}</div>
        <div class="shop-champ-role">${cls.role}</div>
        <div class="shop-champ-lore">${c.lore}</div>
        <div class="shop-skills">${skills}</div>
      </div>
      <div class="shop-champ-buy">
        <div class="shop-price">🪙 ${fmtGold(c.priceGold)}</div>
        ${owned ? `<button class="shop-btn sec" data-champ-detail="${c.id}">Ver ficha</button>`
                : `<button class="shop-btn" data-champ-buy="${c.id}" ${save.gold < c.priceGold ? "disabled" : ""}>Comprar</button>`}
      </div>
    </div>`;
  }).join("") + '</div>';
  panel.querySelectorAll("[data-champ-buy]").forEach(b=> b.addEventListener("click", ()=>{
    const id = b.getAttribute("data-champ-buy"), r = shopBuyChampion(id);
    if(!r.ok){ alert(r.reason); return; }
    selectedClass = id;
    _shopAfterBuy(`🔓 ${CLASSES[id].name} desbloqueado: ya lo podés elegir`, "levelup");
    _shopFlash(document.querySelector(`.shop-champ-row[data-champ="${id}"]`));
  }));
  panel.querySelectorAll("[data-champ-detail]").forEach(b=> b.addEventListener("click", ()=>{ renderChampDetail(b.getAttribute("data-champ-detail")); setState("champdetail"); }));
  startChampAnimLoop();
}

/* ---------------- Objetos y sets ---------------- */
function _shopItemCard(entry, tier){
  const it = shopPreviewItem(entry, tier), col = itemColor(it), n = shopOwnedCount(entry);
  const lines = itemEffectLines(it).slice(0, 3).map(l=>`<div class="shop-eff ${l.cls}">${l.txt}</div>`).join("");
  const tiers = entry.kind==="archetype" ? `<div class="shop-tiers">${SHOP_ARCHETYPE_TIERS.map(t=>`<button class="shop-tier ${t===tier?"on":""}" data-tier-for="${entry.key}" data-tier="${t}" style="--tc:${RARITY_META[t].color}">${TIER_LABEL[t]}</button>`).join("")}</div>` : "";
  return `<div class="shop-item" data-item="${entry.key}" style="--ic:${col}">
    ${itemIconHTML(it)}
    <div class="shop-item-meta">
      <div class="shop-item-name" style="color:${col}">${it.name}${it.set?' <span class="set-badge">SET</span>':""}</div>
      <div class="shop-item-sub">${itemTierLabel(it)} · ${ITEM_TYPES[it.type].label}${it.designed && it.champion ? ` · Solo ${CLASSES[it.champion].name}` : ""} · +${Math.round(itemStat(it)*100)}% ${ITEM_TYPES[it.type].statLabel}</div>
      ${lines}${tiers}
    </div>
    <div class="shop-item-buy">
      <div class="shop-price">🪙 ${fmtGold(entry.price)}</div>
      ${n ? `<div class="shop-st own">Tenés ${n}</div>` : '<div class="shop-st">No comprado</div>'}
      <button class="shop-btn" data-buy-item="${entry.key}" ${save.gold < entry.price ? "disabled" : ""}>Comprar</button>
    </div>
  </div>`;
}
function _shopSetBlock(setId){
  const S = SET_DB[setId], ids = setPieceIds(setId), owned = ownedDesignIds(), have = ids.filter(id=>owned.has(id)).length;
  const champ = ids.map(id=>DESIGNED_ITEMS[id].champion).find(Boolean);
  const eq = champ ? equippedSetCount(champ, setId) : Math.max(0, ...Object.keys(save.champions).filter(k=>save.champions[k].unlocked).map(k=>equippedSetCount(k, setId)));
  const bon = S.thresholds.map(th=>`<div class="shop-bonus ${eq>=th.count?"on":(have>=th.count?"ready":"")}">${eq>=th.count?"✔ ACTIVO":(have>=th.count?"◐ equipalas":"🔒")} ${th.count} piezas: ${th.desc}</div>`).join("");
  const skin = (typeof SET_SKINS!=="undefined" && SET_SKINS[setId]) ? '<span class="shop-set-skin">🎨 Skin al completarlo</span>' : "";
  const missing = shopSetMissing(setId);
  const entries = ids.map(id=>shopCatalog().find(e=>e.kind==="designed" && e.id===id));
  return `<div class="shop-set" data-set="${setId}">
    <div class="shop-set-head"><span class="shop-set-name">${S.name}</span> <span class="shop-set-theme">${S.theme||""}${champ?` · Solo ${CLASSES[champ].name}`:" · Universal"}</span> ${skin}
      <span class="shop-set-count">${have}/${ids.length} piezas · ${eq} equipadas</span></div>
    <div class="shop-set-bonus">${bon}</div>
    <div class="shop-set-pieces">${entries.map(e=>_shopItemCard(e)).join("")}</div>
    ${missing.length ? `<button class="shop-btn sec shop-set-buyall" data-buy-set="${setId}" ${save.gold < missing.length*SHOP_TEST_PRICE ? "disabled" : ""}>Comprar las ${missing.length} que faltan · 🪙 ${fmtGold(missing.length*SHOP_TEST_PRICE)}</button>` : '<div class="shop-st own">✔ Tenés el set completo</div>'}
  </div>`;
}
function renderShopObjects(panel){
  const cats = `<div class="inv-filters">${SHOP_CATS.map(([k, l])=>`<button class="inv-chip ${shopCat===k?"on":""}" data-shop-cat="${k}">${l} (${k==="set" ? Object.keys(SET_DB).length : shopCatalog().filter(e=>e.cat===k).length})</button>`).join("")}</div>`;
  let body;
  if(shopCat==="set") body = Object.keys(SET_DB).map(_shopSetBlock).join("");
  else body = '<div class="shop-item-list">' + shopCatalog().filter(e=>e.cat===shopCat).map(e=>_shopItemCard(e, e.kind==="archetype" ? (shopTier[e.key]||"raro") : undefined)).join("") + '</div>';
  panel.innerHTML = cats + body;
  panel.querySelectorAll("[data-shop-cat]").forEach(b=> b.addEventListener("click", ()=>{ shopCat = b.getAttribute("data-shop-cat"); renderShop(); }));
  panel.querySelectorAll("[data-tier-for]").forEach(b=> b.addEventListener("click", ev=>{ ev.stopPropagation(); shopTier[b.getAttribute("data-tier-for")] = b.getAttribute("data-tier"); renderShop(); }));
  panel.querySelectorAll("[data-buy-item]").forEach(b=> b.addEventListener("click", ev=>{
    ev.stopPropagation();
    const key = b.getAttribute("data-buy-item"), r = shopBuyCatalog(key, shopTier[key]||"raro");
    if(!r.ok){ alert(r.reason); return; }
    _shopAfterBuy(`🛒 ${r.item.name} va a tu inventario (−1.000 de oro)`, r.item.set || r.item.rarity==="legendario" ? "lootLegend" : "ready");
    _shopFlash(document.querySelector(`.shop-item[data-item="${CSS.escape(key)}"]`));
  }));
  panel.querySelectorAll("[data-buy-set]").forEach(b=> b.addEventListener("click", ()=>{
    const setId = b.getAttribute("data-buy-set"), miss = shopSetMissing(setId);
    if(!confirm(`¿Comprar las ${miss.length} piezas que te faltan de ${SET_DB[setId].name} por ${fmtGold(miss.length*SHOP_TEST_PRICE)} de oro?`)) return;
    let n = 0; for(const id of miss){ const r = shopBuyCatalog("d:"+id); if(!r.ok){ alert(r.reason); break; } n++; }
    if(n) _shopAfterBuy(`🛒 ${n} pieza${n>1?"s":""} de ${SET_DB[setId].name} en tu inventario`, "lootLegend");
  }));
  panel.querySelectorAll(".shop-item").forEach(card=> card.addEventListener("click", ev=>{
    if(ev.target.closest("button")) return;
    const key = card.getAttribute("data-item"), entry = shopCatalog().find(e=>e.key===key);
    openShopItemPreview(entry, shopTier[key]||"raro");
  }));
}
// Ficha completa de un objeto de la tienda (mismo detalle que el inventario, sin mejorar/comparar)
function openShopItemPreview(entry, tier){
  const it = shopPreviewItem(entry, entry.kind==="archetype" ? tier : undefined);
  let el = document.getElementById("item-preview");
  if(!el){ el = document.createElement("div"); el.id = "item-preview"; document.body.appendChild(el); }
  el.innerHTML = `<div class="ip-backdrop" data-ip-close></div><div class="ip-panel">${itemDetailHTML(it, null, {shop:true})}
    <div class="ip-actions"><button class="primary" data-ip-buy ${save.gold < entry.price ? "disabled" : ""}>Comprar · 🪙 ${fmtGold(entry.price)}</button><button data-ip-close>Cerrar</button></div></div>`;
  el.classList.remove("hidden");
  const close = ()=>{ el.classList.add("hidden"); el.innerHTML = ""; };
  el.querySelectorAll("[data-ip-close]").forEach(b=>b.addEventListener("click", close));
  el.querySelector("[data-ip-buy]").addEventListener("click", ()=>{
    const r = shopBuyCatalog(entry.key, tier); if(!r.ok){ alert(r.reason); return; }
    close(); _shopAfterBuy(`🛒 ${r.item.name} va a tu inventario (−1.000 de oro)`, "lootLegend");
  });
}

/* ---------------- Skins ---------------- */
function renderShopSkins(panel){
  const withSkin = Object.keys(SET_DB).filter(id=>typeof SET_SKINS!=="undefined" && SET_SKINS[id]);
  const cards = withSkin.map(id=>{
    const S = SET_DB[id], sk = SET_SKINS[id], ids = setPieceIds(id), owned = ownedDesignIds(), have = ids.filter(p=>owned.has(p)).length, miss = shopSetMissing(id);
    const champ = sk.champ || ids.map(p=>DESIGNED_ITEMS[p].champion).find(Boolean);
    const eq = champ ? equippedSetCount(champ, id) : 0, active = eq >= setFullCount(id);
    return `<div class="shop-skin ${active?"active":""}">
      <img class="shop-skin-img" src="${sk.preview || sk.src}" alt="">
      <div class="shop-skin-info">
        <div class="shop-skin-name">${sk.name || "Skin de " + S.name}</div>
        <div class="shop-item-sub">${champ ? CLASSES[champ].name : "Universal"} · se activa con el set completo <b>${S.name}</b></div>
        <div class="shop-st ${active?"own":""}">${active ? "✔ ACTIVA (set completo equipado)" : `${have}/${ids.length} piezas · ${eq} equipadas`}</div>
        ${miss.length ? `<button class="shop-btn" data-skin-buy="${id}" ${save.gold < miss.length*SHOP_TEST_PRICE ? "disabled" : ""}>Comprar las ${miss.length} piezas que faltan · 🪙 ${fmtGold(miss.length*SHOP_TEST_PRICE)}</button>`
                      : `<div class="shop-item-sub">${active ? "" : "Tenés todas las piezas: equipalas en " + (champ ? CLASSES[champ].name : "tu campeón") + " para ver la skin."}</div>`}
      </div></div>`;
  }).join("");
  const pending = Object.keys(SET_DB).filter(id=>!withSkin.includes(id)).map(id=>SET_DB[id].name);
  panel.innerHTML = `<div class="lobby-note">Una skin de set nunca se vende suelta: aparece cuando equipás el set COMPLETO en su campeón.</div>
    <div class="shop-skin-list">${cards || '<div class="inv-empty">Todavía no hay skins.</div>'}</div>
    <div class="shop-soon-box shop-soon-small">Sets sin skin todavía (arte pendiente, ver docs/assets_faltantes/skins_sets/): ${pending.join(" · ")}. Con el set completo se ve su aura plena.</div>`;
  panel.querySelectorAll("[data-skin-buy]").forEach(b=> b.addEventListener("click", ()=>{
    const id = b.getAttribute("data-skin-buy"), miss = shopSetMissing(id);
    if(!confirm(`¿Comprar las ${miss.length} piezas que faltan de ${SET_DB[id].name}?`)) return;
    let n = 0; for(const p of miss){ const r = shopBuyCatalog("d:"+p); if(!r.ok){ alert(r.reason); break; } n++; }
    if(n) _shopAfterBuy(`🛒 ${n} pieza${n>1?"s":""} de ${SET_DB[id].name}: equipá el set completo para ver la skin`, "lootLegend");
  }));
}
