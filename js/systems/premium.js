"use strict";
/* ============================================================
   js/systems/premium.js — PRECIOS DE APARIENCIAS y MONEDA PREMIUM ("Brasas" ✦)
   · Toda APARIENCIA (skin de set, skin independiente, croma) se paga con Brasas ✦ o con oro, según su escalón
     (js/data/pricing.js, la misma fuente que ejecuta el servidor). Comprarla da SOLO la apariencia: nunca poder.
     Las piezas de set se siguen comprando aparte como equipo, y completar el set sigue regalando su skin.
   · Los CAMPEONES no se compran con Brasas: se compran con oro (shop.js). Las únicas elecciones de campeón "gratis" son las 3 del
     Pack de bienvenida (regalo del servidor, js/ui/welcome-picks.js).
   · Las Brasas viven en el SERVIDOR (server/wallet.js): este archivo solo las muestra y pide compras; el saldo, el precio
     y la entrega los decide el servidor (el cliente manda el precio que VIO y el servidor rechaza si no coincide).
     Sin cuenta o sin conexión, solo se compra con oro.
   Carga después de shop.js, cromas.js y account.js.
   ============================================================ */
const PREMIUM = { premium: null, welcome: null, currency: { id: "brasas", name: "Brasas", icon: "✦" }, payments: { enabled: false, packs: [] }, at: 0, busy: false };

// ¿Es una skin (arte propio) o un croma (paleta)? Un set skin siempre es skin.
function premiumIsSkin(id){
  if(typeof SET_SKINS !== "undefined" && SET_SKINS[id]) return true;
  return typeof cosmeticAppearanceKind === "function" ? cosmeticAppearanceKind(id) === "skin" : false;
}
function premiumSkinOwned(id){
  if(typeof SET_SKINS !== "undefined" && SET_SKINS[id]) return typeof skinOwnedFull === "function" && skinOwnedFull(id);
  return typeof cromaOwned === "function" && cromaOwned(id);
}
// Escalón de precio ("set" | "autor" | "croma" | null) de una apariencia: lo define js/data/pricing.js
function premiumTier(id){
  if(typeof SET_SKINS !== "undefined" && SET_SKINS[id]) return pricingCosmeticTier(true, null);
  const d = typeof CROMA_SKINS !== "undefined" ? CROMA_SKINS[id] : null;
  return d ? pricingCosmeticTier(false, d) : null;
}
const PREMIUM_TIER_LABEL = { set: "Skin de colección", autor: "Skin con diseño propio", croma: "Croma (otra paleta)" };
function premiumPrice(id){ return pricingBrasas(premiumTier(id)); }   // ✦ (0 = no se vende por Brasas)
function premiumGoldPrice(id){
  const d = typeof CROMA_SKINS !== "undefined" ? CROMA_SKINS[id] : null;
  return pricingCosmeticGold(premiumTier(id), d ? d.price : 0);
}
// Nombre corto del campeón ("Axiom, el Reengendrado" -> "Axiom")
function premiumChampName(k){ return typeof CLASSES !== "undefined" && CLASSES[k] ? String(CLASSES[k].name).split(",")[0] : k; }
function premiumFmt(n){ return n.toLocaleString("es-AR"); }

/* ---------- precio en oro por escalón (9000 set · 12000 diseño propio · croma: su precio propio) ---------- */
shopSkinPrice = function(setId){
  if(premiumSkinOwned(setId)) return 0;
  return shopConfiguredPrice("cosmetic", setId, premiumGoldPrice(setId));
};
cromaPrice = function(id){ return shopConfiguredPrice("cosmetic", id, premiumGoldPrice(id)); };

// Comprar la skin de un set con oro: solo la apariencia (no las piezas).
function shopBuySkinGold(setId, expectedPrice){
  if(typeof state !== "undefined" && state === "playing") return { ok: false, reason: "La tienda se usa fuera de la partida" };
  if(typeof SET_SKINS === "undefined" || !SET_SKINS[setId]) return { ok: false, reason: "Esa skin no existe" };
  if(premiumSkinOwned(setId)) return { ok: false, reason: "Ya es tuya" };
  const price = shopSkinPrice(setId);
  if(expectedPrice != null && expectedPrice !== price) return { ok: false, reason: "El precio cambió. Revisá el nuevo valor y volvé a confirmar." };
  if(!Number.isSafeInteger(price) || price < 0 || (save.gold || 0) < price) return { ok: false, reason: `No te alcanza el oro (cuesta ${price})` };
  save.gold -= price;
  save.cosmeticUnlocks = Object.assign({}, save.cosmeticUnlocks, { [setId]: true });
  persist();
  if(typeof AlphaServices !== "undefined") AlphaServices.emit("skin", { skin: setId, currency: "gold", price });
  return { ok: true, id: setId, price };
}
const _premiumSetBundle = shopBuySetBundle;
shopBuySetBundle = function(setId, appearance, discount, expectedPrice){
  if(appearance){
    if(discount != null){ // las ofertas siguen aplicando su descuento sobre el precio de oro
      if(!SHOP_DEAL_OFF.includes(discount)) return { ok: false, reason: "Descuento inválido" };
      const price = _shopDisc(shopSkinPrice(setId), discount);
      if(expectedPrice != null && expectedPrice !== price) return { ok: false, reason: "El precio cambió. Revisá el nuevo valor y volvé a confirmar." };
      if((save.gold || 0) < price) return { ok: false, reason: "No te alcanza el oro" };
      if(premiumSkinOwned(setId)) return { ok: false, reason: "Ya es tuya" };
      save.gold -= price; save.cosmeticUnlocks = Object.assign({}, save.cosmeticUnlocks, { [setId]: true }); persist();
      return { ok: true, id: setId, price };
    }
    return shopBuySkinGold(setId, expectedPrice);
  }
  return _premiumSetBundle(setId, appearance, discount, expectedPrice);
};

/* ---------- Brasas (servidor) ---------- */
function premiumAvailable(){ return typeof acct !== "undefined" && !!acct.session && typeof accountFetch === "function"; }
async function premiumRefresh(force){
  if(!premiumAvailable()) { PREMIUM.premium = null; premiumRender(); return null; }
  if(!force && PREMIUM.at && Date.now() - PREMIUM.at < 15000) return PREMIUM.premium;
  try{
    const r = await accountFetch("GET", "/api/wallet");
    if(r.status === 200){ PREMIUM.premium = r.j.premium; PREMIUM.currency = r.j.currency || PREMIUM.currency; PREMIUM.payments = r.j.payments || PREMIUM.payments; PREMIUM.welcome = r.j.welcome || null; PREMIUM.at = Date.now(); }
  }catch(e){ /* sin conexión: el saldo queda como estaba */ }
  premiumRender();
  return PREMIUM.premium;
}
function premiumNewRef(){ return (crypto.randomUUID && crypto.randomUUID()) || (Date.now().toString(36) + Math.random().toString(36).slice(2, 12)); }
const PREMIUM_ERR = {
  OWNED: "Ya es tuyo.", NO_CLOUD_SAVE: "Primero guardá tu partida en la nube (Opciones → Cuenta). No se cobró nada.",
  CONFLICT: "Tu guardado cambió mientras comprabas. No se cobró nada: probá de nuevo.", PRICE_CHANGED: "El precio cambió. Revisá y volvé a confirmar.",
  BAD_SKU: "Eso no se vende por Brasas.", NOT_A_COLLECTION: "Ya casi la tenés completa: comprá la que falta suelta.", BAD_CHAMPION: "Ese campeón no está disponible.",
  NOT_PURCHASED: "Tenés que comprar el Pack de bienvenida primero.", NO_PICKS_LEFT: "Ya elegiste tus 3 campeones."
};
// Pedido al servidor con la misma referencia en el reintento (un corte de red nunca cobra dos veces). Devuelve {r} o {fail}.
async function premiumPost(path, body){
  if(!premiumAvailable()) return { fail: "Para usar Brasas tenés que entrar con tu cuenta." };
  if(PREMIUM.busy) return { fail: "Ya hay una compra en curso." };
  PREMIUM.busy = true;
  try{
    for(let attempt = 0; attempt < 2; attempt++){
      let r;
      try{ r = await accountFetch("POST", path, body); }
      catch(e){ if(attempt === 0) continue; return { fail: "Sin conexión con el servidor. No se cobró nada que no se haya entregado." }; }
      if(r.status === 200) return { r };
      const code = r.j && (r.j.error || r.j.code);
      let msg = PREMIUM_ERR[code];
      if(code === "INSUFFICIENT") msg = "No te alcanzan las Brasas.";
      await premiumRefresh(true);
      return { fail: msg || "No se pudo completar la compra.", code };
    }
  } finally { PREMIUM.busy = false; }
  return { fail: "No se pudo completar la compra." };
}
function premiumApply(j){
  PREMIUM.premium = j.premium; PREMIUM.at = Date.now();
  if(!(typeof accountApplyEventReward === "function" && accountApplyEventReward(j))){
    // si la versión local cambió en el medio, la próxima sincronización trae lo entregado desde la nube
    for(const c of (j.cosmetics || [])){
      save.cosmeticUnlocks = Object.assign({}, save.cosmeticUnlocks, { [c.id]: true });
      if(c.type === "croma") save.cromas = Object.assign({}, save.cromas, { [c.id]: true });
    }
    for(const id of (j.champions || [])) if(typeof CLASSES !== "undefined" && CLASSES[id]) save.champions[id] = Object.assign(save.champions[id] || (typeof mkChampion === "function" ? mkChampion(true) : {}), { unlocked: true });
    persist();
  }
  premiumRender();
}
// Compra con Brasas: el servidor cobra, entrega la apariencia en el guardado de la nube y lo aplicamos acá.
async function premiumBuySkin(id){
  if(!premiumAvailable()) return { ok: false, reason: "Para usar Brasas tenés que entrar con tu cuenta." };
  if(premiumSkinOwned(id)) return { ok: false, reason: "Ya es tuya" };
  const price = premiumPrice(id); if(!(price > 0)) return { ok: false, reason: PREMIUM_ERR.BAD_SKU };
  const o = await premiumPost("/api/wallet/buy", { sku: id, ref: premiumNewRef(), expectedPrice: price });
  if(!o.r) return { ok: false, reason: o.code === "INSUFFICIENT" ? `No te alcanzan las Brasas (cuesta ${premiumFmt(price)}).` : o.fail };
  premiumApply(o.r.j);
  if(typeof AlphaServices !== "undefined") AlphaServices.emit("skin", { skin: id, currency: "premium", price });
  return { ok: true, premium: o.r.j.premium };
}

/* ---------- colecciones: todas las apariencias de un campeón que te faltan, con descuento por cantidad ---------- */
function premiumCollection(k){
  const ids = premiumChampSkinIds(k), q = pricingCollection(ids.map(premiumPrice));
  return Object.assign({ champ: k, ids }, q);   // {n, sum, offPct, price, save}
}
async function premiumBuyCollection(k, expectedPrice){
  const q = premiumCollection(k);
  if(q.n < PRICING.collection.minPieces) return { ok: false, reason: PREMIUM_ERR.NOT_A_COLLECTION };
  if(expectedPrice != null && expectedPrice !== q.price) return { ok: false, reason: PREMIUM_ERR.PRICE_CHANGED };
  const o = await premiumPost("/api/wallet/buy-collection", { champion: k, ref: premiumNewRef(), expectedPrice: q.price });
  if(!o.r) return { ok: false, reason: o.code === "INSUFFICIENT" ? `No te alcanzan las Brasas (cuesta ${premiumFmt(q.price)}).` : o.fail };
  premiumApply(o.r.j);
  if(typeof AlphaServices !== "undefined") AlphaServices.emit("collection", { champion: k, currency: "premium", price: q.price, n: q.n });
  return { ok: true, n: o.r.j.n, saved: o.r.j.saved, premium: o.r.j.premium };
}

/* ---------- Pack de bienvenida: 3 campeones de regalo (elige el jugador, decide el servidor) ---------- */
function premiumWelcomePending(){ const w = PREMIUM.welcome; return w && w.remaining > 0 ? w : null; }
async function premiumWelcomeClaim(champion){
  const o = await premiumPost("/api/wallet/welcome/claim", { champion });
  if(!o.r) return { ok: false, reason: o.fail, code: o.code };
  const j = o.r.j;
  if(!(typeof accountApplyEventReward === "function" && accountApplyEventReward(j))){
    save.champions[champion] = Object.assign(save.champions[champion] || (typeof mkChampion === "function" ? mkChampion(true) : {}), { unlocked: true }); save.starterChosen = true; persist();
  }
  PREMIUM.welcome = Object.assign({}, PREMIUM.welcome, { claimed: j.claimed, remaining: j.remaining, eligible: (PREMIUM.welcome.eligible || []).filter(x => x !== champion) });
  premiumRender();
  return { ok: true, remaining: j.remaining };
}

/* ---------- mostrar el saldo (hub y tienda) ---------- */
function premiumLabel(){ return PREMIUM.premium == null ? "—" : PREMIUM.premium.toLocaleString("es-AR"); }
// El chip ✦ se ve siempre (sin sesión muestra "✦ —"); la tienda redibuja su pestaña ✦ Brasas al llegar datos nuevos.
function premiumRender(){
  for(const el of document.querySelectorAll("[data-premium-balance]")) el.textContent = premiumLabel();
  for(const el of document.querySelectorAll("[data-premium-chip]")) el.hidden = false;
  try{ document.dispatchEvent(new CustomEvent("premium-change")); }catch(e){}
}

/* ---------- paquetes de Brasas (dinero real): el servidor dice cuáles hay, a qué precio y si se puede pagar ---------- */
// "US$ 4,99": moneda explícita, nunca un número suelto
function premiumPriceLabel(price){
  if(!price || !Number.isFinite(price.amount)) return "";
  const sym = { USD: "US$", ARS: "AR$", EUR: "€" }[price.currency] || price.currency;
  return sym + " " + price.amount.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function premiumPacks(){ return (PREMIUM.payments && Array.isArray(PREMIUM.payments.packs)) ? PREMIUM.payments.packs : []; }
function premiumPaymentsOn(){ return !!(PREMIUM.payments && PREMIUM.payments.enabled); }
// Pack de bienvenida: solo si el servidor dice que todavía no se compró en esta cuenta
function premiumWelcomePack(){ return premiumPacks().find(p => p.once && p.available) || null; }
// Pedir un pago: el servidor arma el enlace de la pasarela; sin proveedor responde "todavía no conectados".
async function premiumCheckout(packId){
  if(!premiumAvailable()) return { ok: false, reason: "Iniciá sesión para comprar Brasas." };
  let r;
  try{ r = await accountFetch("POST", "/api/wallet/checkout", { pack: packId }); }
  catch(e){ return { ok: false, reason: "Sin conexión con el servidor. No se cobró nada." }; }
  if(r.status === 200 && r.j && r.j.redirect) return { ok: true, redirect: r.j.redirect };
  if(r.status === 501) return { ok: false, soon: true, reason: (r.j && r.j.msg) || "Muy pronto: los pagos todavía no están conectados." };
  await premiumRefresh(true);
  return { ok: false, reason: (r.j && r.j.msg && r.j.msg !== r.j.error ? r.j.msg : "No se pudo iniciar el pago. No se cobró nada.") };
}
// Apariencias (skins y cromas, se pagan con Brasas) de un guardián que todavía no tenés
function premiumChampSkinIds(k){
  const out = [];
  if(typeof SET_SKINS !== "undefined" && typeof skinSetChamp === "function")
    for(const id of Object.keys(SET_SKINS)) if((typeof SET_DB === "undefined" || SET_DB[id]) && skinSetChamp(id) === k && !premiumSkinOwned(id)) out.push(id);
  if(typeof CROMA_SKINS !== "undefined")
    for(const id of Object.keys(CROMA_SKINS)) if(CROMA_SKINS[id].champ === k && premiumPrice(id) > 0 && !premiumSkinOwned(id)) out.push(id);
  return out;
}
function premiumSkinPreview(id){
  if(typeof SET_SKINS !== "undefined" && SET_SKINS[id]) return SET_SKINS[id].preview || SET_SKINS[id].src || "";
  return typeof CROMA_SKINS !== "undefined" && CROMA_SKINS[id] ? CROMA_SKINS[id].preview || "" : "";
}
if(typeof window !== "undefined"){
  window.addEventListener("account-change", () => premiumRefresh(true));
  setTimeout(() => premiumRefresh(true), 1500);
}

/* ---------- botón "✦ 800" (Tienda, Códice) y su manejo, en un solo lugar ---------- */
function premiumSkinButton(id, cls){
  const price = premiumPrice(id);
  if(premiumSkinOwned(id) || !(price > 0)) return "";
  const can = PREMIUM.premium != null && PREMIUM.premium >= price;
  const title = PREMIUM.premium == null ? "Entrá con tu cuenta para usar Brasas" : can ? "Pagar con Brasas" : "No te alcanzan las Brasas";
  return `<button type="button" class="${cls || "shop-btn"} premium-btn" data-skin-premium="${id}" title="${title}" ${PREMIUM.premium != null && !can ? "disabled" : ""}>✦ ${premiumFmt(price)}</button>`;
}
function premiumSkinName(id){
  if(typeof SET_SKINS !== "undefined" && SET_SKINS[id]) return SET_SKINS[id].name || (typeof SET_DB !== "undefined" && SET_DB[id] ? SET_DB[id].name : id);
  return typeof CROMA_SKINS !== "undefined" && CROMA_SKINS[id] ? CROMA_SKINS[id].name : id;
}
if(typeof document !== "undefined") document.addEventListener("click", e => {
  const b = e.target.closest && e.target.closest("[data-skin-premium]"); if(!b) return;
  e.preventDefault(); e.stopPropagation();
  const id = b.getAttribute("data-skin-premium");
  if(!premiumAvailable()){ gameAlert("Para pagar con Brasas tenés que entrar con tu cuenta (Opciones → Cuenta)."); return; }
  const gold = premiumGoldPrice(id), gnote = gold > 0 ? ` (o ${premiumFmt(gold)} de oro jugando)` : "";
  gameConfirm(`¿Comprar ${premiumTier(id) === "croma" ? "el croma" : "la skin"} ${premiumSkinName(id)} por ${premiumFmt(premiumPrice(id))} Brasas${gnote}? Es solo apariencia: no cambia estadísticas.`, { okText: "Comprar con Brasas" }).then(async ok => {
    if(!ok) return;
    b.disabled = true;
    const r = await premiumBuySkin(id);
    if(!r.ok){ b.disabled = false; gameAlert(r.reason); return; }
    if(typeof SET_SKINS !== "undefined" && SET_SKINS[id] && typeof _shopAfterSkinBuy === "function") _shopAfterSkinBuy(id, 0);
    else {
      const d = typeof CROMA_SKINS !== "undefined" && CROMA_SKINS[id];
      if(d && save.champions[d.champ] && save.champions[d.champ].unlocked && typeof cromaEquip === "function") cromaEquip(d.champ, id);
      if(typeof playSfx === "function") playSfx("lootLegend");
      if(typeof showNetToast === "function") showNetToast(`🎨 SKIN ${premiumSkinName(id)} · comprada con Brasas`);
    }
    if(typeof state !== "undefined" && state === "shop" && typeof renderShop === "function") renderShop();
    if(typeof state !== "undefined" && state === "codex" && typeof codexRender === "function") codexRender();
    if(typeof renderSaveLine === "function") renderSaveLine();
  });
});
// Colección de un campeón (botón data-col-premium="<campeón>")
if(typeof document !== "undefined") document.addEventListener("click", e => {
  const b = e.target.closest && e.target.closest("[data-col-premium]"); if(!b) return;
  e.preventDefault(); e.stopPropagation();
  const k = b.getAttribute("data-col-premium"), q = premiumCollection(k);
  if(!premiumAvailable()){ gameAlert("Para pagar con Brasas tenés que entrar con tu cuenta (Opciones → Cuenta)."); return; }
  if(q.n < PRICING.collection.minPieces){ gameAlert(PREMIUM_ERR.NOT_A_COLLECTION); return; }
  const nm = premiumChampName(k);
  gameConfirm(`¿Comprar la colección de ${nm} (${q.n} apariencias) por ${premiumFmt(q.price)} Brasas? Sueltas suman ${premiumFmt(q.sum)}: ahorrás ${premiumFmt(q.save)} Brasas (${q.offPct}%). Es solo apariencia: no cambia estadísticas.`, { okText: "Comprar colección" }).then(async ok => {
    if(!ok) return;
    b.disabled = true;
    const r = await premiumBuyCollection(k, q.price);
    if(!r.ok){ b.disabled = false; gameAlert(r.reason); return; }
    if(typeof playSfx === "function") playSfx("lootLegend");
    if(typeof showNetToast === "function") showNetToast(`🎨 COLECCIÓN DE ${nm.toUpperCase()} · ${r.n} apariencias`);
    if(typeof state !== "undefined" && state === "shop" && typeof renderShop === "function") renderShop();
    if(typeof renderSaveLine === "function") renderSaveLine();
  });
});
