"use strict";
// BILLETERA PREMIUM (Brasas): saldo en el servidor, acreditación del panel (RBAC), compras idempotentes con reintegro,
// pagos apagados por defecto y webhook firmado. Escribe docs/ux/wallet-results.json.
process.env.PORT = '8819'; process.env.DATABASE_URL = ''; process.env.ADMIN_USERS = 'Director'; process.env.ALLOWED_ORIGINS = 'http://127.0.0.1:8802';
delete process.env.PAYMENTS_PROVIDER; delete process.env.PAYMENTS_WEBHOOK_SECRET;
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'horda-wallet-'));
const { server, accounts } = require('./relay');
const wallet = require('./wallet');
const results = [];
const check = (name, ok, x) => { results.push({ name, ok: !!ok }); if(!ok) console.log('FAIL', name, x !== undefined ? JSON.stringify(x).slice(0, 300) : ''); };
async function api(method, p, body, token, headers){
  const r = await fetch('http://127.0.0.1:8819' + p, { method, headers: { origin: 'http://127.0.0.1:8802', 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}), ...(headers || {}) },
    body: body === undefined ? undefined : (typeof body === 'string' ? body : JSON.stringify(body)) });
  let j = null; try{ j = await r.json(); }catch(e){}
  return { status: r.status, j };
}
const ref = () => crypto.randomUUID();
(async () => {
  await accounts.ready;
  const AT = (await api('POST', '/api/register', { user: 'Director', pass: 'espada123' })).j.token;
  const UT = (await api('POST', '/api/register', { user: 'Jugador', pass: 'espada123' })).j.token;
  const NT = (await api('POST', '/api/register', { user: 'SinNube', pass: 'espada123' })).j.token;
  await api('PUT', '/api/save', { data: { gold: 50, champions: {}, cosmeticUnlocks: {}, cromas: {} }, baseVersion: 0 }, UT);
  const users = (await api('GET', '/api/gm/users', undefined, AT)).j.users;
  const uid = users.find(u => u.user === 'Jugador').id, nid = users.find(u => u.user === 'SinNube').id;
  const sku = Object.keys(wallet.skinCatalog())[0];
  check('catálogo de skins con entradas', !!sku);

  check('anónimo no ve billetera', (await api('GET', '/api/wallet')).status === 401);
  const w0 = await api('GET', '/api/wallet', undefined, UT);
  check('saldo inicial 0 y precios 9000/1000', w0.status === 200 && w0.j.premium === 0 && w0.j.prices.skinGold === 9000 && w0.j.prices.skinPremium === 1000 && w0.j.currency.id === 'brasas');
  check('pagos apagados por defecto', w0.j.payments.enabled === false);
  const pk = w0.j.payments.packs, byId = Object.fromEntries(pk.map(p => [p.id, p]));
  check('packs listados con precio y moneda explícita', pk.length === 5 && pk.every(p => p.price && p.price.currency === 'USD' && p.price.amount > 0)
    && byId.brasas_500.price.amount === 4.99 && byId.brasas_1000.price.amount === 9.99 && byId.brasas_2500.bonus === 250 && byId.brasas_5000.price.amount === 49.99, pk);
  check('pack de bienvenida: una vez, 1000+200, disponible', byId.brasas_bienvenida && byId.brasas_bienvenida.once === true && byId.brasas_bienvenida.premium === 1000
    && byId.brasas_bienvenida.bonus === 200 && byId.brasas_bienvenida.price.amount === 4.99 && byId.brasas_bienvenida.available === true, byId.brasas_bienvenida);
  check('comprar sin saldo: 402', (await api('POST', '/api/wallet/buy', { sku, ref: ref() }, UT)).status === 402);

  // acreditación desde el panel
  check('jugador no puede acreditar', (await api('POST', '/api/gm/user/premium', { id: uid, amount: 5000, reason: 'x', ref: ref() }, UT)).status === 403);
  check('acreditar exige motivo', (await api('POST', '/api/gm/user/premium', { id: uid, amount: 100, ref: ref() }, AT)).status === 400);
  check('monto inválido rechazado', (await api('POST', '/api/gm/user/premium', { id: uid, amount: 1.5, reason: 'x', ref: ref() }, AT)).status === 400);
  const gref = ref();
  const g1 = await api('POST', '/api/gm/user/premium', { id: uid, amount: 2500, reason: 'compensación', ref: gref }, AT);
  check('acreditar 2500', g1.status === 200 && g1.j.premium === 2500, g1);
  const g2 = await api('POST', '/api/gm/user/premium', { id: uid, amount: 2500, reason: 'compensación', ref: gref }, AT);
  check('reintentar la misma acreditación no duplica', g2.status === 200 && g2.j.repeated && g2.j.premium === 2500, g2);
  check('descontar exige confirmación', (await api('POST', '/api/gm/user/premium', { id: uid, amount: -100, reason: 'corrección', ref: ref() }, AT)).status === 428);
  check('no se puede dejar saldo negativo', (await api('POST', '/api/gm/user/premium', { id: uid, amount: -99999, reason: 'x', ref: ref(), confirm: true }, AT)).status === 409);
  const sheet = await api('GET', '/api/gm/user?id=' + uid, undefined, AT);
  check('la ficha del panel muestra el saldo y el libro', sheet.j.premium === 2500 && sheet.j.premiumLedger.length === 1 && /compensación/.test(sheet.j.premiumLedger[0].reason));

  // comprar una skin con Brasas
  check('sku inexistente', (await api('POST', '/api/wallet/buy', { sku: 'no_existe', ref: ref() }, UT)).status === 400);
  check('precio cambiado: 409', (await api('POST', '/api/wallet/buy', { sku, ref: ref(), expectedPrice: 999 }, UT)).status === 409);
  const bref = ref();
  const b1 = await api('POST', '/api/wallet/buy', { sku, ref: bref, expectedPrice: 1000 }, UT);
  check('compra: 1000 menos', b1.status === 200 && b1.j.premium === 1500, b1);
  const save = (await api('GET', '/api/save', undefined, UT)).j.data;
  check('la skin queda en el guardado (y el oro intacto)', save.cosmeticUnlocks[sku] === true && save.gold === 50);
  const b2 = await api('POST', '/api/wallet/buy', { sku, ref: bref, expectedPrice: 1000 }, UT);
  check('reintentar la misma compra no cobra de nuevo', b2.status === 200 && b2.j.repeated && b2.j.premium === 1500, b2);
  const b3 = await api('POST', '/api/wallet/buy', { sku, ref: ref() }, UT);
  check('comprar algo que ya tenés: 409 sin cobrar', b3.status === 409 && (await api('GET', '/api/wallet', undefined, UT)).j.premium === 1500);

  // sin guardado en la nube: se reintegra
  await api('POST', '/api/gm/user/premium', { id: nid, amount: 1000, reason: 'prueba', ref: ref() }, AT);
  const b4 = await api('POST', '/api/wallet/buy', { sku, ref: ref() }, NT);
  const after = (await api('GET', '/api/wallet', undefined, NT)).j;
  check('sin guardado: no se entrega y se reintegra', b4.status === 409 && after.premium === 1000 && after.ledger.length === 3, { b4: b4.j, after });

  // pagos: apagados -> 501; webhook sin proveedor -> rechazado
  const co = await api('POST', '/api/wallet/checkout', { pack: 'brasas_1000' }, UT);
  check('checkout apagado: 501 PAYMENTS_DISABLED', co.status === 501 && co.j.error === 'PAYMENTS_DISABLED' && /pagos todavía no están conectados/.test(co.j.msg), co);
  const body = JSON.stringify({ pack: 'brasas_1000', userId: uid, paymentId: 'pay_123456' });
  check('webhook sin proveedor: rechazado', (await api('POST', '/api/payments/webhook', body)).status === 400);
  // con proveedor (firma HMAC): acredita una sola vez
  process.env.PAYMENTS_PROVIDER = 'hmac'; process.env.PAYMENTS_WEBHOOK_SECRET = 'secreto-de-prueba-largo';
  const sig = crypto.createHmac('sha256', process.env.PAYMENTS_WEBHOOK_SECRET).update(body).digest('hex');
  check('firma inválida rechazada', (await api('POST', '/api/payments/webhook', body, undefined, { 'x-horda-signature': 'f'.repeat(64) })).status === 400);
  const p1 = await api('POST', '/api/payments/webhook', body, undefined, { 'x-horda-signature': sig });
  const p2 = await api('POST', '/api/payments/webhook', body, undefined, { 'x-horda-signature': sig });
  const wp = (await api('GET', '/api/wallet', undefined, UT)).j;
  check('pago verificado acredita una sola vez', p1.status === 200 && p2.j.duplicate === true && wp.premium === 2500, { p1: p1.j, p2: p2.j, premium: wp.premium });
  const signed = (o) => { const raw = JSON.stringify(o); return [raw, { 'x-horda-signature': crypto.createHmac('sha256', process.env.PAYMENTS_WEBHOOK_SECRET).update(raw).digest('hex') }]; };
  const hook = (o) => { const [raw, h] = signed(o); return api('POST', '/api/payments/webhook', raw, undefined, h); };
  // cuenta inexistente: rechazado, no se crea saldo
  const u1 = await hook({ pack: 'brasas_1000', userId: 987654, paymentId: 'pay_unknown_user' });
  check('webhook con cuenta inexistente: rechazado', u1.status === 404, u1);
  // paquete desconocido o sin precio: rechazado
  require('./premium-packs.json').packs.push({ id: 'brasas_sin_precio', premium: 100, bonus: 0, price: null });
  const u2 = await hook({ pack: 'brasas_sin_precio', userId: uid, paymentId: 'pay_unpriced_1' });
  const u3 = await hook({ pack: 'brasas_inventado', userId: uid, paymentId: 'pay_unknown_pack' });
  check('webhook con paquete sin precio: rechazado', u2.status === 400, u2);
  check('webhook con paquete desconocido: rechazado', u3.status === 400, u3);
  check('el paquete sin precio no se ofrece', !(await api('GET', '/api/wallet', undefined, UT)).j.payments.packs.some(p => p.id === 'brasas_sin_precio'));
  check('saldo intacto tras webhooks rechazados', (await api('GET', '/api/wallet', undefined, UT)).j.premium === 2500);
  // pack de bienvenida: se acredita una sola vez por cuenta, aunque llegue otro pago distinto
  const o1 = await hook({ pack: 'brasas_bienvenida', userId: uid, paymentId: 'pay_welcome_1' });
  const o2 = await hook({ pack: 'brasas_bienvenida', userId: uid, paymentId: 'pay_welcome_2' });
  const wo = (await api('GET', '/api/wallet', undefined, UT)).j;
  check('pack de bienvenida acreditado una sola vez', o1.status === 200 && !o1.j.duplicate && o2.status === 200 && o2.j.alreadyBought === true && wo.premium === 2500 + 1200, { o1: o1.j, o2: o2.j, premium: wo.premium });
  check('el servidor marca el pack de bienvenida como comprado', wo.payments.enabled === true && wo.payments.packs.find(p => p.id === 'brasas_bienvenida').available === false);
  const other = (await api('GET', '/api/wallet', undefined, NT)).j;
  check('otra cuenta sigue viendo el pack de bienvenida', other.payments.packs.find(p => p.id === 'brasas_bienvenida').available === true);
  process.env.PAYMENTS_CHECKOUT_URL = 'https://pagos.example/checkout';
  check('checkout del pack de bienvenida ya comprado: 409', (await api('POST', '/api/wallet/checkout', { pack: 'brasas_bienvenida' }, UT)).status === 409);
  const c2 = await api('POST', '/api/wallet/checkout', { pack: 'brasas_2500' }, UT);
  check('checkout con proveedor: redirige con precio USD', c2.status === 200 && /pack=brasas_2500/.test(c2.j.redirect) && c2.j.price.currency === 'USD', c2);
  delete process.env.PAYMENTS_CHECKOUT_URL;

  fs.mkdirSync(path.join(__dirname, '../docs/ux'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, '../docs/ux/wallet-results.json'), JSON.stringify(results, null, 2));
  const bad = results.filter(r => !r.ok);
  console.log(`${results.length - bad.length}/${results.length} PASS`);
  server.close(); process.exit(bad.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
