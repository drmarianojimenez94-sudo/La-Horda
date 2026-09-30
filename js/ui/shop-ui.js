"use strict";
/* ============================================================
   js/ui/shop-ui.js
   TIENDA: vitrina (★ Destacados: destacado del día, ofertas diarias, paquetes de skins y guardianes)
   y tres pestañas de catálogo completo (BUGFIX 01):
   - Guardianes: todos los de CHAMPION_CATALOG, animados, con rol, historia, habilidades, precio y compra.
   - Objetos y sets: TODO el catálogo (shopCatalog en js/systems/shop.js) por categoría; los sets se
     muestran como conjunto (piezas que tenés / que faltan, bonus y cuáles tenés activos).
   - Skins: las skins de set que existen (SET_SKINS); se activan con el set COMPLETO, así que la
     tarjeta vende las piezas que te faltan (regla canónica: la skin nunca se compra suelta).
   Tocar un objeto abre su ficha completa (itemDetailHTML en modo tienda).
   ============================================================ */
let shopTab = "destacados", shopCat = "set", shopTier = {};
const SHOP_CATS = [["set", "Sets"], ["legendario", "Legendarios"], ["campeon", "De guardián"], ["base", "Básicos"]]; // Míticos (receta) y Únicos (botín) no se venden
const TIER_LABEL = {comun:"Común", raro:"Raro", muyraro:"Muy Raro", legendario:"Legendario", mitico:"Mítico"};

function renderShop(){
  const prem = typeof SHOP_PREMIUM!=="undefined" && SHOP_PREMIUM.enabled ? `<span class="ui-chip">${SHOP_PREMIUM.icon} 0</span>` : ""; // apagada (ver shop.js)
  document.getElementById("shop-gold-line").innerHTML = `<span class="ui-chip gold">🪙 <b>${fmtGold(save.gold)}</b></span><span class="ui-chip" title="Inventario">🎒 ${stashUsedSlots()}/${INVENTORY_CAPACITY}</span>${prem}`;
  document.querySelectorAll("[data-shop-tab]").forEach(b=>{
    b.classList.toggle("on", b.getAttribute("data-shop-tab")===shopTab);
    b.onclick = ()=>{ shopTab = b.getAttribute("data-shop-tab"); renderShop(); const p = document.getElementById("shop-screen"); if(p) p.scrollTop = 0; };
  });
  const panel = document.getElementById("shop-panel"); if(!panel) return;
  panel.className = "shop-panel-" + shopTab;
  if(shopTab==="destacados") renderShopShowcase(panel);
  else if(shopTab==="campeones") renderShopChampions(panel);
  else if(shopTab==="objetos") renderShopObjects(panel);
  else renderShopSkins(panel);
  _shopVoucherMount(panel);
}
/* ---------------- Vale de skin (regalo inicial, js/systems/starter-gift.js) ----------------
   Mientras tengas un vale sin canjear: un cartel arriba de la vitrina y de Skins, y cada skin o croma
   que no tenés suma "🎟 Canjear vale" (la skin queda tuya y equipada, sin cobrar oro). */
function _shopVoucherBtn(id){
  if(typeof skinVoucherCanRedeem!=="function" || !skinVoucherCanRedeem(id)) return "";
  return `<button class="shop-btn hot shop-vale-btn" data-voucher="${id}">🎟 Canjear vale</button>`;
}
function _shopVoucherMount(panel){
  const n = typeof skinVoucherCount==="function" ? skinVoucherCount() : 0;
  if(!n || (shopTab!=="destacados" && shopTab!=="skins")) return;
  const box = document.createElement("div"); box.className = "shop-vale-banner";
  box.innerHTML = `🎁 <b>Tenés una skin de regalo: elegila.</b> Tocá <b>🎟 Canjear vale</b> en la skin o croma que quieras: el precio queda cubierto.${n>1 ? ` (${n} vales)` : ""}${shopTab==="destacados" ? ' <button class="shop-btn hot" id="shop-vale-go">Ver las skins ▸</button>' : ""}`;
  panel.insertBefore(box, panel.firstChild);
  const go = box.querySelector("#shop-vale-go");
  if(go) go.addEventListener("click", ()=>{ shopTab = "skins"; renderShop(); const p = document.getElementById("shop-screen"); if(p) p.scrollTop = 0; });
  panel.querySelectorAll("[data-voucher]").forEach(b=> b.addEventListener("click", ev=>{
    ev.stopPropagation();
    const id = b.getAttribute("data-voucher"), d = typeof skinDefOf==="function" ? skinDefOf(id) : null;
    const nm = (d && d.name) || (SET_DB[id] && SET_DB[id].name) || id;
    const extra = SET_SKINS[id] && SET_DB[id] ? ` (trae las piezas del set ${SET_DB[id].name} que te faltan)` : "";
    gameConfirm(`¿Canjear tu vale de skin por ${nm}${extra}?`, {okText:"Canjear"}).then(ok=>{
      if(!ok) return;
      const r = skinVoucherRedeem(id); if(!r.ok){ gameAlert(r.reason); return; }
      const who = r.champ && CLASSES[r.champ] ? CLASSES[r.champ].name : "";
      _shopAfterBuy(`🎨 ¡Es tuya! ${nm}${r.equipped ? " · equipada" + (who ? " en " + who : "") : (who ? " · conseguí a " + who + " para usarla" : "")}`, "levelup");
      if(r.kind==="set" && r.equipped && typeof netInRoom==="function" && netInRoom() && typeof cromaAfterEquip==="function") cromaAfterEquip(r.champ);
    });
  }));
}
function _shopFlash(el){ if(!el) return; el.classList.remove("shop-bought"); void el.offsetWidth; el.classList.add("shop-bought"); }
function _shopAfterBuy(msg, sfx){
  if(typeof playSfx==="function") playSfx(sfx || "ready");
  if(typeof showNetToast==="function") showNetToast(msg);
  renderShop(); if(typeof renderSaveLine==="function") renderSaveLine();
}
// Comprar un guardián (con confirmación: son 2.500 de oro). featured: la oferta del día (con descuento).
function shopConfirmChampion(id, featured, after){
  const cat = CHAMPION_CATALOG.find(c=>c.id===id); if(!cat) return;
  const p = featured ? featured.price : cat.priceGold;
  gameConfirm(`¿Desbloquear a ${CLASSES[id].name} por ${fmtGold(p)} de oro?`, {okText:"Desbloquear"}).then(ok=>{
    if(!ok) return;
    const r = featured ? shopBuyFeatured() : shopBuyChampion(id);
    if(!r.ok){ gameAlert(r.reason); return; }
    selectedClass = id; save.lastChamp = id; if(typeof netRememberChamp==="function") netRememberChamp(id);
    _shopAfterBuy(`🔓 ${CLASSES[id].name} desbloqueado: ya es tu guardián para jugar`, "levelup");
    if(after) after();
  });
}

/* ---------------- ★ Destacados (vitrina) ----------------
   Destacado del día con arte grande animado, ofertas del día (rotación diaria determinística, ver
   shopDailyShowcase en js/systems/shop.js), paquetes de skins (el set completo = la skin) y los
   guardianes por desbloquear. Etiquetas NUEVO (todavía no lo viste) y OFERTA (−X %). */
function _shopSeen(){ if(!save.shopSeen || typeof save.shopSeen!=="object") save.shopSeen = {}; return save.shopSeen; }
function _shopTagNew(key){ return _shopSeen()[key] ? "" : '<span class="ui-tag new">NUEVO</span>'; }
function _shopPriceHTML(price, base){ return `<span class="shop-price">${base && base > price ? `<s>${fmtGold(base)}</s> ` : ""}🪙 ${fmtGold(price)}</span>`; }
function _shopRenewTxt(){ const m = shopMinutesToRenew(); return m >= 60 ? `${Math.floor(m/60)} h ${m%60} min` : `${m} min`; }
function renderShopShowcase(panel){
  const sc = shopDailyShowcase(), f = sc.featured, seenNow = [];
  let hero = "";
  if(f){
    const isSkin = f.kind==="skin", sk = isSkin ? SET_SKINS[f.id] : null, S = isSkin ? SET_DB[f.id] : null;
    const champ = isSkin ? (skinSetChamp(f.id) || selectedClass) : f.id, cls = CLASSES[champ] || {};
    const cat = !isSkin ? CHAMPION_CATALOG.find(c=>c.id===f.id) : null;
    const key = "feat:" + f.kind + ":" + f.id; seenNow.push(key);
    const title = isSkin ? (sk.name || "Skin de " + S.name) : cls.name;
    const sub = isSkin ? `Paquete de skin · set ${S.name} completo (${setPieceIds(f.id).length} piezas)${skinSetChamp(f.id) ? " · " + cls.name : " · universal"}` : `Guardián · ${cls.role || ""}`;
    const desc = isSkin ? (S.lore || S.theme || "") : (cat ? cat.lore : "");
    const act = f.owned ? '<span class="shop-st own">✔ Ya es tuyo</span>'
      : `<button class="shop-btn hot" id="shop-feat-buy" ${save.gold < f.price ? "disabled" : ""}>${isSkin ? "Comprar paquete" : "Desbloquear"}</button>`;
    hero = `<div class="shop-hero ${isSkin ? "skin" : "champ"}" data-feat="${f.kind}:${f.id}" style="--hc:${cls.color || "#ff7a2e"}">
      <div class="shop-hero-art">
        ${isSkin ? `<img class="shop-hero-img" data-portador-skin="${f.id}" src="${sk.preview || sk.src}" alt="">` : ""}
        <canvas class="champ-anim shop-hero-anim" width="176" height="176" data-class-key="${champ}" data-skin="${isSkin ? f.id : ""}"></canvas>
      </div>
      <div class="shop-hero-info">
        <div class="shop-hero-tags"><span class="ui-tag hot">★ DEL DÍA</span>${!f.owned && f.off ? `<span class="ui-tag sale">OFERTA −${f.off}%</span>` : ""}${_shopTagNew(key)}</div>
        <div class="shop-hero-title" style="color:${cls.color || "var(--ember3)"}">${title}</div>
        <div class="shop-hero-sub">${sub}</div>
        <div class="shop-hero-desc">${desc}</div>
        <div class="shop-hero-buy">${f.owned ? "" : _shopPriceHTML(f.price, f.base)}${act}</div>
      </div></div>`;
  }
  // ofertas del día
  const deals = sc.deals.map(d=>{
    const entry = shopCatalog().find(e=>e.key===d.key); if(!entry) return "";
    const it = shopPreviewItem(entry, d.tier), col = itemColor(it), sold = shopDealBought(d.id);
    return `<div class="shop-deal ${sold ? "sold" : ""}" data-deal="${d.id}" style="--ic:${col}">
      <div class="shop-deal-head"><div class="shop-deal-ico">${itemIconHTML(it)}<span class="ui-tag sale">−${d.off}%</span></div><div class="shop-deal-meta"><div class="shop-deal-name" style="color:${col}">${it.name}</div>
        <div class="shop-item-sub">${itemTierLabel(it)} · ${ITEM_TYPES[it.type].label}${it.designed && it.champion ? ` · ${CLASSES[it.champion].name}` : ""}</div></div></div>
      <div class="shop-deal-buy">${sold ? '<span class="shop-st own">✔ Comprado hoy</span>' : `<button class="shop-btn" data-deal-buy="${d.id}" ${save.gold < d.price ? "disabled" : ""}>🪙 ${fmtGold(d.price)} <s class="shop-was">${fmtGold(d.base)}</s></button>`}</div>
    </div>`;
  }).join("");
  // paquetes de skins (set completo = skin)
  const skinIds = typeof SET_SKINS!=="undefined" ? Object.keys(SET_SKINS).filter(id=>SET_DB[id]) : [];
  const bundles = skinIds.map(id=>{
    const sk = SET_SKINS[id], S = SET_DB[id], miss = shopSetMissing(id), n = setPieceIds(id).length, champ = skinSetChamp(id);
    const key = "skin:" + id; seenNow.push(key);
    const own = !miss.length;
    return `<div class="shop-bundle ${own ? "owned" : ""}" data-bundle="${id}">
      <div class="shop-bundle-art"><img data-portador-skin="${id}" src="${sk.preview || sk.src}" alt="" loading="lazy">${own ? "" : _shopTagNew(key)}</div>
      <div class="shop-bundle-name">${sk.name || S.name}</div>
      <div class="shop-item-sub">${champ ? CLASSES[champ].name : "Universal"} · ${n} piezas + skin</div>
      <div class="shop-deal-buy">${own ? '<span class="shop-st own">✔ Tuyo</span>' : `<button class="shop-btn" data-skin-buy="${id}" ${save.gold < miss.length*SHOP_TEST_PRICE ? "disabled" : ""}>🪙 ${fmtGold(miss.length*SHOP_TEST_PRICE)}</button>`}${_shopVoucherBtn(id)}</div>
    </div>`;
  }).join("");
  // cromas: cosméticas sueltas (js/ui/shop-cromas.js da los productos); las que no tenés primero
  const cromaList = typeof shopCromaProducts==="function" ? shopCromaProducts().sort((a,b)=>(a.owned-b.owned) || (b.champOwned-a.champOwned)) : [];
  const cromas = cromaList.map(p=>{
    const key = "croma:" + p.id; seenNow.push(key);
    const act = !p.owned ? `<button class="shop-btn" data-croma-buy="${p.id}" ${save.gold < p.price ? "disabled" : ""}>🪙 ${fmtGold(p.price)}</button>`
      : p.equipped ? '<span class="shop-st own">✔ Equipada</span>'
      : p.champOwned ? `<button class="shop-btn sec" data-croma-on="${p.id}">Equipar</button>` : '<span class="shop-st own">✔ Tuya</span>';
    return `<div class="shop-bundle shop-croma-card ${p.owned ? "owned" : ""}" data-croma-card="${p.id}">
      <div class="shop-bundle-art"><img src="${p.preview}" alt="" loading="lazy">${p.owned ? "" : _shopTagNew(key)}</div>
      <div class="shop-bundle-name">${p.name}</div>
      <div class="shop-item-sub"><span style="color:${p.color}">◆</span> ${p.champName} · ${p.crystalLabel}</div>
      <div class="shop-deal-buy">${act}${_shopVoucherBtn(p.id)}</div>
    </div>`;
  }).join("");
  // guardianes por desbloquear
  const locked = CHAMPION_CATALOG.filter(c=>!(save.champions[c.id]||{}).unlocked);
  const champs = locked.map(c=>{
    const cls = CLASSES[c.id];
    return `<div class="shop-mini-champ" data-champ="${c.id}">
      <canvas class="champ-anim shop-mini-anim" width="72" height="72" data-class-key="${c.id}" data-idle="1" data-skin="" style="background:${cls.color}1c;"></canvas>
      <div class="shop-bundle-name" style="color:${cls.color}">${cls.name}</div>
      <div class="shop-deal-buy"><button class="shop-btn" data-champ-buy="${c.id}" ${save.gold < c.priceGold ? "disabled" : ""}>🪙 ${fmtGold(c.priceGold)}</button></div>
    </div>`;
  }).join("");
  panel.innerHTML = `<div class="shop-show-top">${hero}
      <div class="shop-deals-box"><div class="shop-row-head"><span class="shop-row-title">OFERTAS DEL DÍA</span><span class="shop-renew" id="shop-renew" title="Las ofertas se renuevan a la medianoche">⟳ ${_shopRenewTxt()}</span></div>
      <div class="shop-deals-grid">${deals}</div></div></div>
    ${bundles ? `<div class="shop-row-head"><span class="shop-row-title">PAQUETES DE SKINS</span><span class="shop-renew">el set completo de piezas + su skin</span></div><div class="shop-strip ui-scroll-x">${bundles}</div>` : ""}
    ${cromas ? `<div class="shop-row-head"><span class="shop-row-title">CROMAS</span><span class="shop-renew">otra paleta · solo cosmético</span></div><div class="shop-strip ui-scroll-x">${cromas}</div>` : ""}
    ${champs ? `<div class="shop-row-head"><span class="shop-row-title">GUARDIANES</span><span class="shop-renew">${locked.length} por desbloquear</span></div><div class="shop-strip ui-scroll-x">${champs}</div>` : ""}
    <div class="shop-fair">⚖ Todo se consigue jugando: se paga con el oro que ganás en las arenas. No hay compras con dinero real. Míticos y Únicos no se venden: se fabrican o se ganan peleando.</div>`;
  const fb = panel.querySelector("#shop-feat-buy");
  if(fb) fb.addEventListener("click", ()=>{
    if(f.kind==="champ"){ shopConfirmChampion(f.id, f); return; }
    const nm = SET_SKINS[f.id].name || SET_DB[f.id].name;
    gameConfirm(`¿Comprar el paquete ${nm} (set ${SET_DB[f.id].name} completo) por ${fmtGold(f.price)} de oro?`, {okText:"Comprar"}).then(ok=>{
      if(!ok) return;
      const r = shopBuyFeatured(); if(!r.ok){ gameAlert(r.reason); return; }
      _shopAfterSkinBuy(f.id, r.n);
    });
  });
  panel.querySelectorAll("[data-deal-buy]").forEach(b=> b.addEventListener("click", ev=>{
    ev.stopPropagation();
    const id = b.getAttribute("data-deal-buy"), r = shopBuyDeal(id);
    if(!r.ok){ gameAlert(r.reason); return; }
    _shopAfterBuy(`🛒 ${r.item.name} va a tu inventario (oferta del día)`, "lootLegend");
    _shopFlash(document.querySelector(`.shop-deal[data-deal="${id}"]`));
  }));
  panel.querySelectorAll(".shop-deal").forEach(card=> card.addEventListener("click", ev=>{
    if(ev.target.closest("button")) return;
    const d = sc.deals.find(x=>x.id===card.getAttribute("data-deal")); if(!d) return;
    openShopItemPreview(shopCatalog().find(e=>e.key===d.key), d.tier);
  }));
  _bindSkinBuy(panel);
  panel.querySelectorAll("[data-champ-buy]").forEach(b=> b.addEventListener("click", ()=> shopConfirmChampion(b.getAttribute("data-champ-buy"))));
  panel.querySelectorAll("[data-croma-buy]").forEach(b=> b.addEventListener("click", ()=>{
    const id = b.getAttribute("data-croma-buy"), d = CROMA_SKINS[id], ch = save.champions[d.champ];
    gameConfirm(`¿Comprar la croma ${d.name} por ${fmtGold(cromaPrice(id))} de oro?`, {okText:"Comprar"}).then(ok=>{
      if(!ok) return;
      const r = cromaBuy(id); if(!r.ok){ gameAlert(r.reason); return; }
      if(ch && ch.unlocked) cromaEquip(d.champ, id); // recién comprada: se pone en su guardián
      _shopAfterBuy(`🎨 CROMA ${d.name}${ch && ch.unlocked ? " · equipada" : " · comprada"}`, "levelup");
    });
  }));
  panel.querySelectorAll("[data-croma-on]").forEach(b=> b.addEventListener("click", ()=>{
    const id = b.getAttribute("data-croma-on"), d = CROMA_SKINS[id];
    if(cromaEquip(d.champ, id)) _shopAfterBuy(`🎨 CROMA EQUIPADA · ${d.name}`, "levelup");
  }));
  // lo que se vio hoy deja de ser NUEVO la próxima vez; las ofertas del día ya no marcan el hub
  const seen = _shopSeen(); let ch = false;
  for(const k of seenNow) if(!seen[k]){ seen[k] = true; ch = true; }
  if(save.shopDealsSeen !== sc.day){ save.shopDealsSeen = sc.day; ch = true; }
  if(ch) persist();
  startChampAnimLoop();
}
// el contador "se renuevan en…" se actualiza solo mientras la vitrina está abierta
setInterval(()=>{ if(typeof state!=="undefined" && state==="shop"){ const el = document.getElementById("shop-renew"); if(el) el.textContent = "⟳ " + _shopRenewTxt(); } }, 30000);
function _bindSkinBuy(panel){
  panel.querySelectorAll("[data-skin-buy]").forEach(b=> b.addEventListener("click", ()=>{
    const id = b.getAttribute("data-skin-buy");
    gameConfirm(`¿Comprar la skin ${SET_SKINS[id].name || SET_DB[id].name} (${shopSetMissing(id).length} piezas del set ${SET_DB[id].name})?`, {okText:"Comprar"}).then(ok=>{
      if(!ok) return;
      shopBuySkin(id);
    });
  }));
}

/* ---------------- Guardianes ---------------- */
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
    const id = b.getAttribute("data-champ-buy");
    shopConfirmChampion(id, null, ()=> _shopFlash(document.querySelector(`.shop-champ-row[data-champ="${id}"]`)));
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
      <div class="shop-price">🪙 ${fmtGold(shopPriceOf(entry, tier))}</div>
      ${n ? `<div class="shop-st own">Tenés ${n}</div>` : '<div class="shop-st">No comprado</div>'}
      <button class="shop-btn" data-buy-item="${entry.key}" ${save.gold < shopPriceOf(entry, tier) ? "disabled" : ""}>Comprar</button>
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
    if(!r.ok){ gameAlert(r.reason); return; }
    _shopAfterBuy(`🛒 ${r.item.name} va a tu inventario (−${fmtGold(shopPriceOf(shopCatalog().find(e=>e.key===key), shopTier[key]||"raro"))} de oro)`, r.item.set || r.item.rarity==="legendario" ? "lootLegend" : "ready");
    _shopFlash(document.querySelector(`.shop-item[data-item="${CSS.escape(key)}"]`));
  }));
  panel.querySelectorAll("[data-buy-set]").forEach(b=> b.addEventListener("click", ()=>{
    const setId = b.getAttribute("data-buy-set"), miss = shopSetMissing(setId);
    gameConfirm(`¿Comprar las ${miss.length} piezas que te faltan de ${SET_DB[setId].name} por ${fmtGold(miss.length*SHOP_TEST_PRICE)} de oro?`, {okText:"Comprar"}).then(ok=>{
      if(!ok) return;
      let n = 0; for(const id of miss){ const r = shopBuyCatalog("d:"+id); if(!r.ok){ gameAlert(r.reason); break; } n++; }
      if(!n) return;
      if(typeof SET_SKINS!=="undefined" && SET_SKINS[setId]) _shopAfterSkinBuy(setId, n); // completar el set = comprar su skin
      else _shopAfterBuy(`🛒 ${n} pieza${n>1?"s":""} de ${SET_DB[setId].name} en tu inventario`, "lootLegend");
    });
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
    <div class="ip-actions"><button class="primary" data-ip-buy ${save.gold < shopPriceOf(entry, tier) ? "disabled" : ""}>Comprar · 🪙 ${fmtGold(shopPriceOf(entry, tier))}</button><button data-ip-close>Cerrar</button></div></div>`;
  el.classList.remove("hidden");
  const close = ()=>{ el.classList.add("hidden"); el.innerHTML = ""; };
  el.querySelectorAll("[data-ip-close]").forEach(b=>b.addEventListener("click", close));
  el.querySelector("[data-ip-buy]").addEventListener("click", ()=>{
    const r = shopBuyCatalog(entry.key, tier); if(!r.ok){ gameAlert(r.reason); return; }
    close(); _shopAfterBuy(`🛒 ${r.item.name} va a tu inventario (−${fmtGold(shopPriceOf(entry, tier))} de oro)`, "lootLegend");
  });
}

/* ---------------- Skins ---------------- */
function renderShopSkins(panel){
  const withSkin = Object.keys(SET_DB).filter(id=>typeof SET_SKINS!=="undefined" && SET_SKINS[id]);
  const cards = withSkin.map(id=>{
    const S = SET_DB[id], sk = SET_SKINS[id], ids = setPieceIds(id), owned = ownedDesignIds(), have = ids.filter(p=>owned.has(p)).length, miss = shopSetMissing(id);
    const champ = skinSetChamp(id);
    const comp = skinCompatibleChamps(id), activeOn = comp.filter(k=>skinIsActiveOn(id, k));
    const eq = champ ? equippedSetCount(champ, id) : 0, active = activeOn.length > 0;
    const previewKey = champ || comp[0];
    let action;
    if(miss.length) action = `<button class="shop-btn" data-skin-buy="${id}" ${save.gold < miss.length*SHOP_TEST_PRICE ? "disabled" : ""}>Comprar la skin (${miss.length} pieza${miss.length>1?"s":""} que faltan) · 🪙 ${fmtGold(miss.length*SHOP_TEST_PRICE)}</button>${_shopVoucherBtn(id)}`;
    else if(!comp.length) action = `<div class="shop-item-sub">Skin desbloqueada: conseguí a <b>${champ ? CLASSES[champ].name : "un guardián"}</b> en la pestaña Guardianes para usarla.</div>`;
    else {
      const rest = comp.filter(k=>!activeOn.includes(k));
      action = rest.length ? `<div class="shop-skin-equip">${activeOn.length ? "" : '<span class="shop-item-sub">Desbloqueada · </span>'}${rest.map(k=>`<button class="shop-btn" data-skin-equip="${id}" data-skin-champ="${k}">${comp.length>1 ? "Equipar en " + CLASSES[k].name : "EQUIPAR"}</button>`).join("")}</div>` : "";
    }
    return `<div class="shop-skin ${active?"active":""}" data-skin-card="${id}">
      <img class="shop-skin-img" data-portador-skin="${id}" src="${sk.preview || sk.src}" alt="">
      ${previewKey ? `<canvas class="champ-anim shop-skin-anim" width="84" height="84" data-class-key="${previewKey}" data-skin="${id}" data-idle="1"></canvas>` : ""}
      <div class="shop-skin-info">
        <div class="shop-skin-name">${sk.name || "Skin de " + S.name}</div>
        <div class="shop-item-sub">${champ ? CLASSES[champ].name : "Universal"} · se activa con el set completo <b>${S.name}</b></div>
        <div class="shop-st ${active?"own":""}">${active ? "✔ EQUIPADA en " + activeOn.map(k=>CLASSES[k].name).join(", ") : (miss.length ? `${have}/${ids.length} piezas · ${eq} equipadas` : "🔓 Desbloqueada")}</div>
        ${action}
      </div></div>`;
  }).join("");
  const pending = Object.keys(SET_DB).filter(id=>!withSkin.includes(id)).map(id=>SET_DB[id].name);
  panel.innerHTML = `<div class="lobby-note">Una skin de set nunca se vende suelta: aparece cuando equipás el set COMPLETO en su guardián.</div>
    <div class="shop-skin-list">${cards || '<div class="inv-empty">Todavía no hay skins.</div>'}</div>
    <div class="shop-soon-box shop-soon-small">Sets sin skin todavía (arte pendiente, ver docs/assets_faltantes/skins_sets/): ${pending.join(" · ")}. Con el set completo se ve su aura plena.</div>`;
  _bindSkinBuy(panel);
  panel.querySelectorAll("[data-skin-equip]").forEach(b=> b.addEventListener("click", ()=>{
    const id = b.getAttribute("data-skin-equip"), k = b.getAttribute("data-skin-champ");
    if(skinEquipOn(id, k)) _skinEquippedFeedback(id, k); else gameAlert("No se pudo equipar: revisá que tengas todas las piezas en el inventario.");
    renderShop();
  }));
  if(typeof shopCromaMount==="function") shopCromaMount(panel); // cromas sueltas por oro (js/ui/shop-cromas.js)
  startChampAnimLoop();
}
// Compra las piezas que faltan de una skin (desde la Tienda o la Sala) y la autoequipa si corresponde.
// Devuelve true si compró algo.
function shopBuySkin(id){
  const miss = shopSetMissing(id);
  let n = 0; for(const p of miss){ const r = shopBuyCatalog("d:"+p); if(!r.ok){ gameAlert(r.reason); break; } n++; }
  if(n) _shopAfterSkinBuy(id, n);
  return n > 0;
}
function _skinEquippedFeedback(id, k){
  const sk = SET_SKINS[id];
  if(typeof playSfx==="function") playSfx("levelup");
  if(typeof showNetToast==="function") showNetToast(`🎨 SKIN EQUIPADA · ${sk.name || SET_DB[id].name}${k ? " en " + CLASSES[k].name : ""}`);
  if(typeof renderSaveLine==="function") renderSaveLine();
  // en la Sala online: que los demás la vean ya (el loadout lleva la skin)
  if(typeof netInRoom==="function" && netInRoom()){
    if(net.role==="guest" && k===selectedClass) netSendLoadout(true);
    else if(net.role==="host") netHostBroadcastCos(false);
  }
}
function _shopAfterSkinBuy(id, n){
  const r = skinAutoEquip(id), sk = SET_SKINS[id], nm = sk.name || SET_DB[id].name;
  if(r.equipped){ _skinEquippedFeedback(id, r.target); }
  else if(!skinOwnedFull(id)) { if(typeof showNetToast==="function") showNetToast(`🛒 ${n} pieza${n>1?"s":""} de ${SET_DB[id].name}`); }
  else if(r.choices.length > 1){ if(typeof showNetToast==="function") showNetToast(`🔓 Skin ${nm} desbloqueada: elegí en qué guardián equiparla`); }
  else { const c = skinSetChamp(id); if(typeof showNetToast==="function") showNetToast(`🔓 Skin ${nm} desbloqueada${c ? ": conseguí a " + CLASSES[c].name + " para usarla" : ""}`); }
  if(typeof playSfx==="function" && !r.equipped) playSfx("lootLegend");
  if(state==="shop") renderShop();
  if(typeof renderSaveLine==="function") renderSaveLine();
  if(state==="prep" && typeof renderPrepSummary==="function") renderPrepSummary();
  return r;
}
