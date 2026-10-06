"use strict";
// BILLETERA PREMIUM ("Brasas"). El saldo vive en el SERVIDOR (horda_wallet / data/wallet.json), nunca en el guardado del
// cliente: el guardado lo escribe el cliente y se puede editar; la moneda que algún día se compra con dinero no.
//   · Cada movimiento queda en un libro append-only con referencia ÚNICA: reintentar un pedido no cobra ni acredita dos veces.
//   · Comprar con Brasas: el precio lo pone el servidor, se debita, se entrega la skin en el guardado (con control de
//     versión, igual que los regalos del Game Master) y, si no se pudo entregar, se reintegra.
//   · Solo cosméticos (skins, cromas y colecciones de apariencias): nunca poder de juego. Los CAMPEONES no se compran con
//     Brasas: se compran con oro (js/data/pricing.js). Única excepción: las 3 elecciones del Pack de bienvenida (regalo, no compra).
//   · Precios: UNA fuente (js/data/pricing.js, la misma que carga el cliente). Este módulo la ejecuta en un contexto aislado.
//   · El panel de administración acredita o corrige saldos (permiso MODIFY_CURRENCY); queda en el libro y en la auditoría.
//   · Pagos con dinero real: server/payments.js (apagado hasta configurar un proveedor; ver docs/production/PREMIUM_CURRENCY.md).
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const payments = require("./payments");

const CURRENCY = Object.freeze({ id: "brasas", name: "Brasas", icon: "✦" });
const entitlements = require("./entitlements");

// Precios base: se ejecuta js/data/pricing.js (datos y funciones puras) igual que el catálogo de skins.
let PRICING_MOD = null;
function pricing(){
  if(PRICING_MOD) return PRICING_MOD;
  const c = {}; vm.createContext(c);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "../js/data/pricing.js"), "utf8") + "\n;this.__P = PRICING; this.__fn = { pricingCosmeticTier, pricingBrasas, pricingCosmeticGold, pricingChampionGold, pricingCollection };", c, { timeout: 1000, filename: "pricing.js" });
  return (PRICING_MOD = Object.assign({ PRICING: c.__P }, c.__fn));
}
const brasasOf = (sku) => pricing().pricingBrasas(sku.tier);
const goldOf = (sku) => pricing().pricingCosmeticGold(sku.tier, sku.goldBase);

function fail(code, status){ const e = new Error(code); e.status = status || 400; throw e; }
function text(s, n){ if(typeof s !== "string") return ""; return s.normalize("NFC").replace(/[<>\u0000-\u001f\u007f]/g, "").trim().slice(0, n || 120); }
function refOf(s){ return typeof s === "string" && /^[a-zA-Z0-9_.:-]{8,80}$/.test(s) ? s : ""; }

// Catálogo de skins (lo mismo que ve el cliente): se ejecuta SOLO metadata del repositorio en un contexto aislado.
let SKINS = null;
function skinCatalog(){
  if(SKINS) return SKINS;
  const noop = () => {};
  const c = { CROMA_SKINS: {}, SET_SKINS: {}, champPackLoadAtlas: noop, champPackCloneAtlas: noop, champPackLoadSheets: noop, console: { log: noop, warn: noop } };
  vm.createContext(c);
  const root = path.join(__dirname, "..");
  for(const f of ["js/assets/croma-skins-meta.js", "js/assets/set-skins-meta.js", "js/assets/portadores-meta.js", "js/assets/ynara-meta.js",
                  "js/assets/complete-set-skins-meta.js", "js/assets/alpha-set-skins-meta.js", "js/assets/unique-skins-meta.js",
                  "js/assets/extra-skins-meta.js", "js/champions/expedition/art.js"]){
    const file = path.join(root, f); if(!fs.existsSync(file)) continue;
    try{ vm.runInContext(fs.readFileSync(file, "utf8"), c, { timeout: 1000, filename: f }); }catch(e){ /* un archivo que no es solo metadata no rompe el catálogo */ }
  }
  const out = {};
  const P = pricing();
  for(const [id, v] of Object.entries(c.SET_SKINS)) out[id] = { id, name: v.name, champion: v.champ || null, kind: "set", tier: P.pricingCosmeticTier(true, null) };
  // escalón por apariencia: skin independiente ("autor") o cambio de paleta ("croma"); precio en pricing.js
  for(const [id, v] of Object.entries(c.CROMA_SKINS)) out[id] = { id, name: v.name, champion: v.champ || null, kind: v.appearanceType === "skin" || v.authoredPacks ? "croma-skin" : "croma",
    tier: P.pricingCosmeticTier(false, v), goldBase: Number.isSafeInteger(v.price) ? v.price : 0 };
  return (SKINS = out);
}

function routes(ctx){
  const { getStore, auth, send, err, readBody, summarize, now, isOwner, log } = ctx;
  const result = {};
  function route(method, url, role, fn){
    result[method + " " + url] = async (req, res, ip) => {
      try{
        let user = null;
        if(role){ const a = await auth(req); if(!a.user) fail("NO_SESSION", 401); user = a.user; if(role === "owner" && !isOwner(user)) fail("FORBIDDEN", 403); }
        const body = method === "GET" ? {} : await readBody(req, 16384);
        send(req, res, 200, await fn({ req, user, body, ip }));
      }catch(e){ if(e.status) return err(req, res, e.status, e.message, e.human || e.message); throw e; }
    };
  }
  const store = () => { const s = getStore(); if(!s || !s.walletApply) fail("WALLET_DOWN", 503); return s; };
  // ¿ya se acreditó este paquete de una sola vez a la cuenta? (lo decide el libro del servidor, nunca el cliente)
  const bought = (userId) => async (packId) => {
    const ref = payments.onceRef(packId, userId);
    return store().walletHasRef ? store().walletHasRef(ref) : !!(await store().walletLedger(userId, 100000)).find(e => e.ref === ref);
  };

  // Entrega una skin en el guardado del jugador, con control de versión (reintenta si el cliente subió algo en el medio)
  // mutate(d) cambia el guardado; se guarda con control de versión y se reintenta si el cliente subió algo en el medio
  async function mutateSave(userId, mutate){
    for(let i = 0; i < 4; i++){
      const saved = await store().getSave(userId);
      const d = saved ? JSON.parse(saved.data) : null;
      if(!d) return { ok: false, reason: "NO_SAVE" };
      mutate(d);
      const r = await store().putSave(userId, JSON.stringify(d), summarize(d), saved.version, false);
      if(r.ok) return { ok: true, saveVersion: r.version, baseVersion: saved.version };
    }
    return { ok: false, reason: "CONFLICT" };
  }
  const isCromaKind = (sku) => sku.kind !== "set";
  const grantSkins = (userId, skus) => mutateSave(userId, d => {
    d.cosmeticUnlocks = Object.assign({}, d.cosmeticUnlocks);
    for(const sku of skus){
      d.cosmeticUnlocks[sku.id] = true;
      if(isCromaKind(sku)) d.cromas = Object.assign({}, d.cromas, { [sku.id]: true });
    }
  });
  const grantSkin = (userId, sku) => grantSkins(userId, [sku]);
  const ownedIn = (d, sku) => !!((d.cosmeticUnlocks && d.cosmeticUnlocks[sku.id]) || (isCromaKind(sku) && d.cromas && d.cromas[sku.id]));
  async function owned(userId, sku){
    const saved = await store().getSave(userId); if(!saved) return false;
    return ownedIn(JSON.parse(saved.data), sku);
  }
  const cosmeticOut = (sku) => ({ id: sku.id, type: isCromaKind(sku) ? "croma" : "skin" });

  /* ---------- Pack de bienvenida: 3 elecciones de campeón (regalo; el servidor decide y registra) ----------
     Derecho: la compra del pack (referencia once:<pack>:<cuenta> del libro). Cada elección es un asiento de monto 0 en el
     libro con referencia única por campeón (welcome:<cuenta>:<campeón>): reintentar no la repite y no hay duplicados.
     Se registra ANTES de entregar: si la entrega falla (guardado en conflicto), la elección queda hecha y se completa
     al reintentar o al abrir la billetera (reconcilia), así que no se pierde ni se cobra otra. Un candado por cuenta evita
     que dos pedidos simultáneos pasen del límite. Solo campeones STANDARD publicados y comprables que la cuenta no tiene. */
  const locks = new Map();
  function withLock(key, fn){
    const next = (locks.get(key) || Promise.resolve()).catch(() => {}).then(fn);
    locks.set(key, next);
    next.catch(() => {}).then(() => { if(locks.get(key) === next) locks.delete(key); });
    return next;
  }
  const welcomeRef = (userId, champ) => "welcome:" + userId + ":" + champ;
  function welcomeEligibleIds(){
    const T = entitlements.taxonomy(), want = pricing().PRICING.welcome.category;
    return T.ids.filter(id => { const m = T.meta(id); return m.category === want && m.releaseState === "RELEASED" && m.purchasable && !T.requiresGrant(id); });
  }
  async function welcomeState(userId, d){
    const W = pricing().PRICING.welcome;
    const entitled = (await bought(userId)(W.pack)) ? W.champions : 0;
    const claimed = entitled ? (await store().walletLedger(userId, 5000)).filter(e => typeof e.reason === "string" && e.reason.startsWith("welcome_pick:")).map(e => e.reason.slice(13)) : [];
    const out = { entitled, claimed: [...new Set(claimed)].reverse(), remaining: 0, eligible: [] };
    out.remaining = Math.max(0, entitled - out.claimed.length);
    if(out.remaining && d){ const has = (id) => !!(d.champions && d.champions[id] && d.champions[id].unlocked); out.eligible = welcomeEligibleIds().filter(id => !has(id)); }
    return out;
  }
  // completa la entrega de elecciones ya registradas que no llegaron al guardado (nunca quita nada)
  async function welcomeReconcile(userId, claimed){
    if(!claimed.length) return null;
    const saved = await store().getSave(userId); if(!saved) return null;
    const d = JSON.parse(saved.data);
    const missing = claimed.filter(id => !(d.champions && d.champions[id] && d.champions[id].unlocked));
    if(!missing.length) return null;
    return mutateSave(userId, x => { x.champions = Object.assign({}, x.champions); for(const id of missing) x.champions[id] = Object.assign({}, x.champions[id], { unlocked: true }); });
  }

  route("GET", "/api/wallet", "user", async ({ user }) => {
    const w = await store().walletGet(user.id);
    const P = pricing().PRICING;
    // la entrega pendiente de una elección ya registrada se completa acá (reconciliación, ver Pack de bienvenida)
    let welcome = await welcomeState(user.id, null);
    if(welcome.entitled){
      await withLock("welcome:" + user.id, async () => {
        welcome = await welcomeState(user.id, null);
        try{ await welcomeReconcile(user.id, welcome.claimed); }catch(e){ /* se reintenta en la próxima apertura */ }
        const saved = welcome.remaining ? await store().getSave(user.id) : null;
        welcome = await welcomeState(user.id, saved ? JSON.parse(saved.data) : null);
      });
    }
    return { currency: CURRENCY, premium: w.premium,
      prices: { brasas: P.brasas, goldCosmetic: P.gold.cosmetic, collection: P.collection, skinPremium: P.brasas.set, skinGold: P.gold.cosmetic.set },
      welcome: { pack: P.welcome.pack, champions: P.welcome.champions, entitled: welcome.entitled, claimed: welcome.claimed, remaining: welcome.remaining, eligible: welcome.eligible },
      ledger: (await store().walletLedger(user.id, 20)).map(e => ({ delta: e.delta, balanceAfter: e.balanceAfter, reason: e.reason, at: e.at })),
      payments: await payments.publicInfo(bought(user.id)) };
  });

  // Comprar una apariencia (skin de set, skin independiente o croma) con Brasas. ref: identificador del intento que genera el
  // cliente (reintentar = mismo ref). El precio lo pone el servidor; expectedPrice es lo que el jugador VIO y debe coincidir.
  route("POST", "/api/wallet/buy", "user", async ({ user, body }) => {
    const ref = refOf(body.ref); if(!ref) fail("BAD_REF");
    const sku = Object.hasOwn(skinCatalog(), body.sku) ? skinCatalog()[body.sku] : null; if(!sku) fail("BAD_SKU");
    const price = brasasOf(sku); if(!(price > 0)) fail("BAD_SKU");
    if(body.expectedPrice !== price) fail("PRICE_CHANGED", 409);
    const debitRef = "buy:" + user.id + ":" + ref;
    if(await owned(user.id, sku)){
      // si ya la tiene: o es un reintento de esta misma compra (ok) o nunca se cobra
      const prev = (await store().walletLedger(user.id, 200)).find(e => e.ref === debitRef);
      if(prev) return { ok: true, repeated: true, sku: sku.id, premium: (await store().walletGet(user.id)).premium };
      fail("OWNED", 409);
    }
    const debit = await store().walletApply({ userId: user.id, delta: -price, reason: "buy:" + sku.id, ref: debitRef, actor: user.id, at: now() });
    if(debit.insufficient) fail("INSUFFICIENT", 402);
    const g = await grantSkin(user.id, sku);
    if(!g.ok){
      await store().walletApply({ userId: user.id, delta: price, reason: "refund:" + sku.id + ":" + g.reason, ref: "refund:" + debitRef, actor: user.id, at: now() });
      fail(g.reason === "NO_SAVE" ? "NO_CLOUD_SAVE" : "CONFLICT", 409);
    }
    log("WALLET_BUY", { user: user.id, sku: sku.id, price, premium: debit.premium });
    // mismo formato que los premios de evento: el cliente lo aplica con accountApplyEventReward (avanza la versión sin conflicto)
    return { ok: true, sku: sku.id, kind: sku.kind, price, cosmetic: sku.id, cosmeticType: isCromaKind(sku) ? "croma" : "skin", cosmetics: [cosmeticOut(sku)],
      premium: (await store().walletGet(user.id)).premium, saveVersion: g.saveVersion, baseVersion: g.baseVersion };
  });

  // Colección de un campeón: todas sus apariencias que todavía no tenés, con descuento por cantidad (ahorro calculado contra
  // la suma de los precios sueltos de ESAS piezas). Una sola compra, un solo cobro, un solo asiento en el libro.
  route("POST", "/api/wallet/buy-collection", "user", async ({ user, body }) => {
    const ref = refOf(body.ref); if(!ref) fail("BAD_REF");
    const champ = typeof body.champion === "string" ? body.champion : "";
    const all = Object.values(skinCatalog()).filter(s => s.champion === champ); if(!champ || !all.length) fail("BAD_CHAMPION");
    const debitRef = "buycol:" + user.id + ":" + ref;
    const saved = await store().getSave(user.id); if(!saved) fail("NO_CLOUD_SAVE", 409);
    const d = JSON.parse(saved.data), missing = all.filter(s => !ownedIn(d, s));
    const prev = (await store().walletLedger(user.id, 200)).find(e => e.ref === debitRef);
    if(prev) return { ok: true, repeated: true, champion: champ, premium: (await store().walletGet(user.id)).premium };
    const q = pricing().pricingCollection(missing.map(brasasOf));
    if(missing.length < pricing().PRICING.collection.minPieces) fail("NOT_A_COLLECTION", 409);
    if(body.expectedPrice !== q.price) fail("PRICE_CHANGED", 409);
    const debit = await store().walletApply({ userId: user.id, delta: -q.price, reason: "buycol:" + champ + ":" + missing.map(s => s.id).join(","), ref: debitRef, actor: user.id, at: now() });
    if(debit.insufficient) fail("INSUFFICIENT", 402);
    const g = await grantSkins(user.id, missing);
    if(!g.ok){
      await store().walletApply({ userId: user.id, delta: q.price, reason: "refund:" + champ + ":" + g.reason, ref: "refund:" + debitRef, actor: user.id, at: now() });
      fail(g.reason === "NO_SAVE" ? "NO_CLOUD_SAVE" : "CONFLICT", 409);
    }
    log("WALLET_BUY_COLLECTION", { user: user.id, champion: champ, n: missing.length, price: q.price, save: q.save, premium: debit.premium });
    return { ok: true, champion: champ, n: missing.length, price: q.price, offPct: q.offPct, saved: q.save, cosmetics: missing.map(cosmeticOut),
      premium: (await store().walletGet(user.id)).premium, saveVersion: g.saveVersion, baseVersion: g.baseVersion };
  });

  // Elegir uno de los 3 campeones de regalo del Pack de bienvenida.
  route("POST", "/api/wallet/welcome/claim", "user", async ({ user, body }) => withLock("welcome:" + user.id, async () => {
    const champ = typeof body.champion === "string" ? body.champion : "";
    if(!champ || !welcomeEligibleIds().includes(champ)) fail("BAD_CHAMPION");
    if(!(await welcomeState(user.id, null)).entitled) fail("NOT_PURCHASED", 403);   // sin compra no hay derecho, haya o no guardado
    const saved = await store().getSave(user.id); if(!saved) fail("NO_CLOUD_SAVE", 409);
    let st = await welcomeState(user.id, JSON.parse(saved.data));
    const done = (extra) => ({ ok: true, champion: champ, entitled: st.entitled, claimed: st.claimed, remaining: st.remaining, ...extra });
    if(st.claimed.includes(champ)){   // reintento: se completa la entrega si faltaba, sin consumir otra elección
      const r = await welcomeReconcile(user.id, st.claimed);
      if(r && !r.ok) fail("CONFLICT", 409);
      return done({ repeated: true, champions: [champ], saveVersion: r ? r.saveVersion : undefined, baseVersion: r ? r.baseVersion : undefined });
    }
    if(!st.remaining) fail("NO_PICKS_LEFT", 409);
    const have = JSON.parse(saved.data).champions;
    if(have && have[champ] && have[champ].unlocked) fail("OWNED", 409);
    const w = await store().walletApply({ userId: user.id, delta: 0, reason: "welcome_pick:" + champ, ref: welcomeRef(user.id, champ), actor: user.id, at: now() });
    log("WELCOME_PICK", { user: user.id, champion: champ, duplicate: !!w.duplicate });
    const g = await mutateSave(user.id, x => { x.champions = Object.assign({}, x.champions); x.champions[champ] = Object.assign({}, x.champions[champ], { unlocked: true }); x.starterChosen = true; });
    st = { ...st, claimed: [...st.claimed, champ], remaining: st.remaining - 1 };
    if(!g.ok) fail("CONFLICT", 409);   // la elección quedó registrada: reintentar completa la entrega
    return done({ champions: [champ], saveVersion: g.saveVersion, baseVersion: g.baseVersion });
  }));

  // El Game Master acredita y ve saldos desde el panel de usuarios (server/admin-users.js, permiso MODIFY_CURRENCY).

  // Pagos con dinero real (apagado hasta configurar un proveedor: server/payments.js)
  route("POST", "/api/wallet/checkout", "user", async ({ user, body }) => payments.checkout({ user, pack: body.pack, bought: bought(user.id) }));
  result["POST /api/payments/webhook"] = async (req, res) => {
    try{
      const raw = await new Promise((ok, ko) => { let b = ""; req.on("data", c => { b += c; if(b.length > 65536){ ko(Object.assign(new Error("TOO_BIG"), { code: "TOO_BIG" })); req.destroy(); } }); req.on("end", () => ok(b)); req.on("error", ko); });
      const credit = payments.verifyWebhook(req.headers, raw);   // null si el proveedor no está configurado o la firma no es válida
      if(!credit) return err(req, res, 400, "BAD_WEBHOOK", "Webhook no verificado.");
      if(!(await store().getUser(credit.userId))) return err(req, res, 404, "UNKNOWN_USER", "Cuenta inexistente.");
      // paquete de una sola vez: la referencia es por cuenta (once:<pack>:<userId>), así un segundo pago nunca acredita
      const r = await store().walletApply({ userId: credit.userId, delta: credit.premium, reason: "purchase:" + credit.pack + ":" + credit.paymentId, ref: payments.creditRef(credit), actor: null, at: now() });
      const alreadyBought = !!(r.duplicate && credit.once);
      log(alreadyBought ? "WALLET_ONCE_REPEATED" : "WALLET_PURCHASE", { user: credit.userId, pack: credit.pack, paymentId: credit.paymentId, duplicate: !!r.duplicate });
      send(req, res, 200, { ok: true, duplicate: !!r.duplicate, alreadyBought });
    }catch(e){ if(e.status) return err(req, res, e.status, e.message, e.message); throw e; }
  };
  return result;
}

module.exports = { routes, CURRENCY, skinCatalog, pricing };
