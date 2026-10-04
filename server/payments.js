"use strict";
// PAGOS CON DINERO REAL — apagado por defecto. Acá NO se cobra nada: este módulo solo deja la conexión lista.
// Para encenderlo (ver docs/production/PREMIUM_CURRENCY.md):
//   PAYMENTS_PROVIDER=hmac            proveedor genérico: una pasarela/middleware propio firma cada pago confirmado
//   PAYMENTS_WEBHOOK_SECRET=…         secreto compartido para verificar la firma (HMAC-SHA256 del cuerpo, hex)
//   PAYMENTS_CHECKOUT_URL=https://…   adónde mandar al jugador a pagar (la pasarela recibe pack y cuenta)
// y fijar los precios de server/premium-packs.json (sin precio, un paquete no se ofrece).
// Mercado Pago / Stripe: su webhook se verifica con SU esquema de firma; el adaptador va en verifyWebhook y siempre
// termina en lo mismo: { userId, pack, premium, paymentId } -> wallet.walletApply con ref "pay:<paymentId>" (idempotente).
const crypto = require("crypto");
const PACKS = require("./premium-packs.json");

const provider = () => (process.env.PAYMENTS_PROVIDER || "").trim().toLowerCase();
const secret = () => process.env.PAYMENTS_WEBHOOK_SECRET || "";
const enabled = () => provider() === "hmac" && secret().length >= 16;
const sellable = () => PACKS.packs.filter(p => p.price && p.price.amount > 0);

function publicInfo(){
  return { enabled: enabled(), currency: PACKS.currency, packs: enabled() ? sellable().map(p => ({ id: p.id, premium: p.premium, bonus: p.bonus || 0, price: p.price })) : [] };
}
function fail(code, status){ const e = new Error(code); e.status = status || 400; throw e; }

async function checkout({ user, pack }){
  if(!enabled()) fail("PAYMENTS_DISABLED", 501);
  const p = sellable().find(x => x.id === pack); if(!p) fail("BAD_PACK");
  const base = process.env.PAYMENTS_CHECKOUT_URL; if(!base) fail("PAYMENTS_DISABLED", 501);
  const u = new URL(base); u.searchParams.set("pack", p.id); u.searchParams.set("account", String(user.id));
  return { ok: true, redirect: u.href, pack: p.id };
}

// Devuelve el crédito a acreditar o null (sin proveedor, firma inválida, paquete desconocido).
function verifyWebhook(headers, raw){
  if(!enabled()) return null;
  const sig = String(headers["x-horda-signature"] || "");
  const want = crypto.createHmac("sha256", secret()).update(raw).digest("hex");
  if(sig.length !== want.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return null;
  let b; try{ b = JSON.parse(raw); }catch(e){ return null; }
  const p = PACKS.packs.find(x => x.id === b.pack);
  if(!p || !Number.isSafeInteger(b.userId) || typeof b.paymentId !== "string" || !/^[a-zA-Z0-9_.:-]{4,120}$/.test(b.paymentId)) return null;
  return { userId: b.userId, pack: p.id, premium: p.premium + (p.bonus || 0), paymentId: b.paymentId };
}

module.exports = { publicInfo, checkout, verifyWebhook, enabled };
