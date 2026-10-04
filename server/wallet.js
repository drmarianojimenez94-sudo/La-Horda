"use strict";
// BILLETERA PREMIUM ("Brasas"). El saldo vive en el SERVIDOR (horda_wallet / data/wallet.json), nunca en el guardado del
// cliente: el guardado lo escribe el cliente y se puede editar; la moneda que algún día se compra con dinero no.
//   · Cada movimiento queda en un libro append-only con referencia ÚNICA: reintentar un pedido no cobra ni acredita dos veces.
//   · Comprar con Brasas: el precio lo pone el servidor, se debita, se entrega la skin en el guardado (con control de
//     versión, igual que los regalos del Game Master) y, si no se pudo entregar, se reintegra.
//   · Solo cosméticos (skins): nunca poder de juego.
//   · El panel de administración acredita o corrige saldos (permiso MODIFY_CURRENCY); queda en el libro y en la auditoría.
//   · Pagos con dinero real: server/payments.js (apagado hasta configurar un proveedor; ver docs/production/PREMIUM_CURRENCY.md).
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const payments = require("./payments");

const CURRENCY = Object.freeze({ id: "brasas", name: "Brasas", icon: "✦" });
const SKIN_PRICE_GOLD = 9000;      // todas las skins: 9000 de oro…
const SKIN_PRICE_PREMIUM = 1000;   // …o 1000 Brasas

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
  for(const [id, v] of Object.entries(c.SET_SKINS)) out[id] = { id, name: v.name, champion: v.champ || null, kind: "set" };
  // los cromas de verdad (cambio de paleta) NO son skins: tienen su precio aparte y no se venden por Brasas
  for(const [id, v] of Object.entries(c.CROMA_SKINS)) if(v.appearanceType === "skin" || v.authoredPacks) out[id] = { id, name: v.name, champion: v.champ || null, kind: "croma-skin" };
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
      }catch(e){ if(e.status) return err(req, res, e.status, e.message, e.message); throw e; }
    };
  }
  const store = () => { const s = getStore(); if(!s || !s.walletApply) fail("WALLET_DOWN", 503); return s; };

  // Entrega una skin en el guardado del jugador, con control de versión (reintenta si el cliente subió algo en el medio)
  async function grantSkin(userId, sku){
    for(let i = 0; i < 4; i++){
      const saved = await store().getSave(userId);
      const d = saved ? JSON.parse(saved.data) : null;
      if(!d) return { ok: false, reason: "NO_SAVE" };
      d.cosmeticUnlocks = Object.assign({}, d.cosmeticUnlocks, { [sku.id]: true });
      if(sku.kind === "croma-skin") d.cromas = Object.assign({}, d.cromas, { [sku.id]: true });
      const r = await store().putSave(userId, JSON.stringify(d), summarize(d), saved.version, false);
      if(r.ok) return { ok: true, saveVersion: r.version, baseVersion: saved.version };
    }
    return { ok: false, reason: "CONFLICT" };
  }
  async function owned(userId, sku){
    const saved = await store().getSave(userId); if(!saved) return false;
    const d = JSON.parse(saved.data);
    return !!((d.cosmeticUnlocks && d.cosmeticUnlocks[sku.id]) || (sku.kind === "croma-skin" && d.cromas && d.cromas[sku.id]));
  }

  route("GET", "/api/wallet", "user", async ({ user }) => {
    const w = await store().walletGet(user.id);
    return { currency: CURRENCY, premium: w.premium, prices: { skinGold: SKIN_PRICE_GOLD, skinPremium: SKIN_PRICE_PREMIUM },
      ledger: (await store().walletLedger(user.id, 20)).map(e => ({ delta: e.delta, balanceAfter: e.balanceAfter, reason: e.reason, at: e.at })),
      payments: payments.publicInfo() };
  });

  // Comprar una skin con Brasas. ref: identificador del intento que genera el cliente (reintentar = mismo ref).
  route("POST", "/api/wallet/buy", "user", async ({ user, body }) => {
    const ref = refOf(body.ref); if(!ref) fail("BAD_REF");
    const sku = Object.hasOwn(skinCatalog(), body.sku) ? skinCatalog()[body.sku] : null; if(!sku) fail("BAD_SKU");
    if(body.expectedPrice !== undefined && body.expectedPrice !== SKIN_PRICE_PREMIUM) fail("PRICE_CHANGED", 409);
    const debitRef = "buy:" + user.id + ":" + ref;
    if(await owned(user.id, sku)){
      // si ya la tiene: o es un reintento de esta misma compra (ok) o nunca se cobra
      const prev = (await store().walletLedger(user.id, 200)).find(e => e.ref === debitRef);
      if(prev) return { ok: true, repeated: true, sku: sku.id, premium: (await store().walletGet(user.id)).premium };
      fail("OWNED", 409);
    }
    const debit = await store().walletApply({ userId: user.id, delta: -SKIN_PRICE_PREMIUM, reason: "buy:" + sku.id, ref: debitRef, actor: user.id, at: now() });
    if(debit.insufficient) fail("INSUFFICIENT", 402);
    const g = await grantSkin(user.id, sku);
    if(!g.ok){
      await store().walletApply({ userId: user.id, delta: SKIN_PRICE_PREMIUM, reason: "refund:" + sku.id + ":" + g.reason, ref: "refund:" + debitRef, actor: user.id, at: now() });
      fail(g.reason === "NO_SAVE" ? "NO_CLOUD_SAVE" : "CONFLICT", 409);
    }
    log("WALLET_BUY", { user: user.id, sku: sku.id, premium: debit.premium });
    // mismo formato que los premios de evento: el cliente lo aplica con accountApplyEventReward (avanza la versión sin conflicto)
    return { ok: true, sku: sku.id, kind: sku.kind, cosmetic: sku.id, cosmeticType: sku.kind === "croma-skin" ? "croma" : "skin",
      premium: (await store().walletGet(user.id)).premium, saveVersion: g.saveVersion, baseVersion: g.baseVersion };
  });

  // El Game Master acredita y ve saldos desde el panel de usuarios (server/admin-users.js, permiso MODIFY_CURRENCY).

  // Pagos con dinero real (apagado hasta configurar un proveedor: server/payments.js)
  route("POST", "/api/wallet/checkout", "user", async ({ user, body }) => payments.checkout({ user, pack: body.pack, now }));
  result["POST /api/payments/webhook"] = async (req, res) => {
    try{
      const raw = await new Promise((ok, ko) => { let b = ""; req.on("data", c => { b += c; if(b.length > 65536){ ko(Object.assign(new Error("TOO_BIG"), { code: "TOO_BIG" })); req.destroy(); } }); req.on("end", () => ok(b)); req.on("error", ko); });
      const credit = payments.verifyWebhook(req.headers, raw);   // null si el proveedor no está configurado o la firma no es válida
      if(!credit) return err(req, res, 400, "BAD_WEBHOOK", "Webhook no verificado.");
      const r = await store().walletApply({ userId: credit.userId, delta: credit.premium, reason: "purchase:" + credit.pack, ref: "pay:" + credit.paymentId, actor: null, at: now() });
      log("WALLET_PURCHASE", { user: credit.userId, pack: credit.pack, duplicate: !!r.duplicate });
      send(req, res, 200, { ok: true, duplicate: !!r.duplicate });
    }catch(e){ if(e.status) return err(req, res, e.status, e.message, e.message); throw e; }
  };
  return result;
}

module.exports = { routes, CURRENCY, SKIN_PRICE_GOLD, SKIN_PRICE_PREMIUM, skinCatalog };
