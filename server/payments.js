"use strict";
// PAGOS CON DINERO REAL — apagado por defecto. Acá NO se cobra nada: este módulo solo deja la conexión lista.
// Para encenderlo (ver docs/production/PREMIUM_CURRENCY.md):
//   PAYMENTS_PROVIDER=hmac            proveedor genérico: una pasarela/middleware propio firma cada pago confirmado
//   PAYMENTS_WEBHOOK_SECRET=…         secreto compartido para verificar la firma (HMAC-SHA256 del cuerpo, hex)
//   PAYMENTS_CHECKOUT_URL=https://…   adónde mandar al jugador a pagar (la pasarela recibe pack y cuenta)
// Los precios (sugeridos, con moneda ISO explícita) están en server/premium-packs.json; sin precio, un paquete no se ofrece
// ni se acredita. Un paquete "once" (Pack de bienvenida) se acredita UNA sola vez por cuenta: su referencia en el libro es
// "once:<pack>:<userId>", única, así que un segundo webhook para la misma cuenta nunca acredita.
// Mercado Pago / Stripe: su webhook se verifica con SU esquema de firma; el adaptador va en verifyWebhook y siempre
// termina en lo mismo: { userId, pack, premium, paymentId } -> wallet.walletApply con ref idempotente.
const crypto = require("crypto");
const PACKS = require("./premium-packs.json");

const provider = () => (process.env.PAYMENTS_PROVIDER || "").trim().toLowerCase();
const secret = () => process.env.PAYMENTS_WEBHOOK_SECRET || "";
const enabled = () => provider() === "hmac" && secret().length >= 16;
const priced = p => !!(p && p.price && typeof p.price.currency === "string" && /^[A-Z]{3}$/.test(p.price.currency) && Number.isFinite(p.price.amount) && p.price.amount > 0);
const sellable = () => PACKS.packs.filter(priced);
const findPack = id => sellable().find(x => x.id === id) || null;
// referencia del libro que marca un paquete de una sola vez como ya acreditado para esa cuenta
const onceRef = (packId, userId) => "once:" + packId + ":" + userId;
const creditRef = (credit) => credit.once ? onceRef(credit.pack, credit.userId) : "pay:" + credit.paymentId;

// Catálogo para el cliente: los paquetes con precio se muestran siempre (con su moneda); "enabled" dice si se puede pagar.
// bought(packId) -> true si ese paquete de una sola vez ya se acreditó a esta cuenta (lo resuelve el servidor).
async function publicInfo(bought){
  const out = [];
  for(const p of sellable()){
    const once = !!p.once;
    out.push({ id: p.id, name: p.name || null, premium: p.premium, bonus: p.bonus || 0, once, championGifts: p.championGifts || 0,
      available: once && bought ? !(await bought(p.id)) : true,
      price: { currency: p.price.currency, amount: p.price.amount } });
  }
  return { enabled: enabled(), currency: PACKS.currency, packs: out };
}
function fail(code, status, human){ const e = new Error(code); e.status = status || 400; if(human) e.human = human; throw e; }
const NOT_CONNECTED = "Los pagos todavía no están conectados. Muy pronto vas a poder comprar Brasas.";

async function checkout({ user, pack, bought }){
  if(!enabled()) fail("PAYMENTS_DISABLED", 501, NOT_CONNECTED);
  const p = findPack(pack); if(!p) fail("BAD_PACK", 400, "Ese paquete no está a la venta.");
  if(p.once && bought && await bought(p.id)) fail("ALREADY_BOUGHT", 409, "El Pack de bienvenida ya es tuyo: se compra una sola vez.");
  const base = process.env.PAYMENTS_CHECKOUT_URL; if(!base) fail("PAYMENTS_DISABLED", 501, NOT_CONNECTED);
  const u = new URL(base); u.searchParams.set("pack", p.id); u.searchParams.set("account", String(user.id));
  return { ok: true, redirect: u.href, pack: p.id, price: p.price };
}

// Devuelve el crédito a acreditar o null (sin proveedor, firma inválida, paquete desconocido o sin precio).
function verifyWebhook(headers, raw){
  if(!enabled()) return null;
  const sig = String(headers["x-horda-signature"] || "");
  const want = crypto.createHmac("sha256", secret()).update(raw).digest("hex");
  if(sig.length !== want.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return null;
  let b; try{ b = JSON.parse(raw); }catch(e){ return null; }
  const p = b && typeof b.pack === "string" ? findPack(b.pack) : null;
  if(!p || !Number.isSafeInteger(b.userId) || b.userId <= 0 || typeof b.paymentId !== "string" || !/^[a-zA-Z0-9_.:-]{4,120}$/.test(b.paymentId)) return null;
  return { userId: b.userId, pack: p.id, once: !!p.once, premium: p.premium + (p.bonus || 0), paymentId: b.paymentId };
}

module.exports = { publicInfo, checkout, verifyWebhook, enabled, onceRef, creditRef, PACKS };
