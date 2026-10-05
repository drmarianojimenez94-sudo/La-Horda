"use strict";
/* ============================================================
   js/systems/premium.js — PRECIOS DE SKINS y MONEDA PREMIUM ("Brasas" ✦)
   · Toda SKIN (apariencia con arte propio) cuesta 9000 de oro o 1000 Brasas, y comprarla da SOLO la apariencia
     (antes, comprar la skin de un set compraba sus piezas de equipo: poder por una compra cosmética). Las piezas de set
     se siguen comprando aparte como equipo, y completar el set sigue regalando su skin.
   · Los CROMAS (cambio de paleta) son otra cosa: conservan su precio propio en oro.
   · Las Brasas viven en el SERVIDOR (server/wallet.js): este archivo solo las muestra y pide compras; el saldo, el precio
     y la entrega los decide el servidor. Sin cuenta o sin conexión, solo se compra con oro.
   Carga después de shop.js, cromas.js y account.js.
   ============================================================ */
const SKIN_PRICE_GOLD = 9000;
const SKIN_PRICE_PREMIUM = 1000;
const PREMIUM = { premium: null, currency: { id: "brasas", name: "Brasas", icon: "✦" }, payments: { enabled: false, packs: [] }, at: 0, busy: false };

// ¿Es una skin (arte propio) o un croma (paleta)? Un set skin siempre es skin.
function premiumIsSkin(id){
  if(typeof SET_SKINS !== "undefined" && SET_SKINS[id]) return true;
  return typeof cosmeticAppearanceKind === "function" ? cosmeticAppearanceKind(id) === "skin" : false;
}
function premiumSkinOwned(id){
  if(typeof SET_SKINS !== "undefined" && SET_SKINS[id]) return typeof skinOwnedFull === "function" && skinOwnedFull(id);
  return typeof cromaOwned === "function" && cromaOwned(id);
}

/* ---------- precio en oro: 9000 para toda skin ---------- */
shopSkinPrice = function(setId){
  if(premiumSkinOwned(setId)) return 0;
  return shopConfiguredPrice("cosmetic", setId, SKIN_PRICE_GOLD);
};
const _premiumCromaPrice = cromaPrice;
cromaPrice = function(id){ return premiumIsSkin(id) ? shopConfiguredPrice("cosmetic", id, SKIN_PRICE_GOLD) : _premiumCromaPrice(id); };

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
    if(discount != null){ // las ofertas siguen aplicando su descuento sobre los 9000
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
    if(r.status === 200){ PREMIUM.premium = r.j.premium; PREMIUM.currency = r.j.currency || PREMIUM.currency; PREMIUM.payments = r.j.payments || PREMIUM.payments; PREMIUM.at = Date.now(); }
  }catch(e){ /* sin conexión: el saldo queda como estaba */ }
  premiumRender();
  return PREMIUM.premium;
}
function premiumNewRef(){ return (crypto.randomUUID && crypto.randomUUID()) || (Date.now().toString(36) + Math.random().toString(36).slice(2, 12)); }
// Compra con Brasas: el servidor cobra, entrega la skin en el guardado de la nube y lo aplicamos acá.
async function premiumBuySkin(id){
  if(!premiumAvailable()) return { ok: false, reason: "Para usar Brasas tenés que entrar con tu cuenta." };
  if(premiumSkinOwned(id)) return { ok: false, reason: "Ya es tuya" };
  if(PREMIUM.busy) return { ok: false, reason: "Ya hay una compra en curso." };
  PREMIUM.busy = true;
  const ref = premiumNewRef();
  try{
    for(let attempt = 0; attempt < 2; attempt++){ // un corte de red se reintenta con la MISMA referencia: nunca cobra dos veces
      let r;
      try{ r = await accountFetch("POST", "/api/wallet/buy", { sku: id, ref, expectedPrice: SKIN_PRICE_PREMIUM }); }
      catch(e){ if(attempt === 0) continue; return { ok: false, reason: "Sin conexión con el servidor. No se cobró nada que no se haya entregado." }; }
      if(r.status === 200){
        PREMIUM.premium = r.j.premium; PREMIUM.at = Date.now();
        if(!(typeof accountApplyEventReward === "function" && accountApplyEventReward(r.j))){
          // si la versión local cambió en el medio, la próxima sincronización trae la skin desde la nube
          save.cosmeticUnlocks = Object.assign({}, save.cosmeticUnlocks, { [id]: true });
          if(r.j.cosmeticType === "croma") save.cromas = Object.assign({}, save.cromas, { [id]: true });
          persist();
        }
        premiumRender();
        if(typeof AlphaServices !== "undefined") AlphaServices.emit("skin", { skin: id, currency: "premium", price: SKIN_PRICE_PREMIUM });
        return { ok: true, premium: r.j.premium };
      }
      const code = r.j && (r.j.error || r.j.code);
      const msg = { INSUFFICIENT: `No te alcanzan las Brasas (cuesta ${SKIN_PRICE_PREMIUM} ✦).`, OWNED: "Ya es tuya.", NO_CLOUD_SAVE: "Primero guardá tu partida en la nube (Opciones → Cuenta). No se cobró nada.",
        CONFLICT: "Tu guardado cambió mientras comprabas. No se cobró nada: probá de nuevo.", PRICE_CHANGED: "El precio cambió. Revisá y volvé a confirmar.", BAD_SKU: "Esa skin no se vende por Brasas." }[code];
      await premiumRefresh(true);
      return { ok: false, reason: msg || "No se pudo completar la compra." };
    }
  } finally { PREMIUM.busy = false; }
  return { ok: false, reason: "No se pudo completar la compra." };
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
// Skins (arte propio, se pagan con Brasas) de un guardián que todavía no tenés
function premiumChampSkinIds(k){
  const out = [];
  if(typeof SET_SKINS !== "undefined" && typeof skinSetChamp === "function")
    for(const id of Object.keys(SET_SKINS)) if((typeof SET_DB === "undefined" || SET_DB[id]) && skinSetChamp(id) === k && !premiumSkinOwned(id)) out.push(id);
  if(typeof CROMA_SKINS !== "undefined")
    for(const id of Object.keys(CROMA_SKINS)) if(CROMA_SKINS[id].champ === k && premiumIsSkin(id) && !premiumSkinOwned(id)) out.push(id);
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

/* ---------- botón "✦ 1.000" (Tienda, Códice) y su manejo, en un solo lugar ---------- */
function premiumSkinButton(id, cls){
  if(premiumSkinOwned(id) || !premiumIsSkin(id)) return "";
  const can = PREMIUM.premium != null && PREMIUM.premium >= SKIN_PRICE_PREMIUM;
  const title = PREMIUM.premium == null ? "Entrá con tu cuenta para usar Brasas" : can ? "Pagar con Brasas" : "No te alcanzan las Brasas";
  return `<button type="button" class="${cls || "shop-btn"} premium-btn" data-skin-premium="${id}" title="${title}" ${PREMIUM.premium != null && !can ? "disabled" : ""}>✦ ${SKIN_PRICE_PREMIUM.toLocaleString("es-AR")}</button>`;
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
  gameConfirm(`¿Comprar la skin ${premiumSkinName(id)} por ${SKIN_PRICE_PREMIUM.toLocaleString("es-AR")} ✦ Brasas? Es solo apariencia: no cambia estadísticas.`, { okText: "Comprar con Brasas" }).then(async ok => {
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
