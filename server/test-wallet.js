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
  const cat = wallet.skinCatalog(), skus = Object.values(cat);
  const setSku = skus.find(x => x.kind === 'set'), autorSku = skus.find(x => x.kind === 'croma-skin');
  const sku = setSku.id;
  check('catálogo de skins con entradas de set y de autor', !!setSku && !!autorSku && setSku.tier === 'set' && autorSku.tier === 'autor', { setSku, autorSku });
  check('precios del servidor = pricing.js (set 800, autor 1200, croma 300)', wallet.pricing().pricingBrasas('set') === 800 && wallet.pricing().pricingBrasas('autor') === 1200 && wallet.pricing().pricingBrasas('croma') === 300);

  check('anónimo no ve billetera', (await api('GET', '/api/wallet')).status === 401);
  const w0 = await api('GET', '/api/wallet', undefined, UT);
  check('saldo inicial 0 y precios por escalón', w0.status === 200 && w0.j.premium === 0 && w0.j.prices.skinGold === 9000 && w0.j.prices.skinPremium === 800 && w0.j.prices.brasas.autor === 1200 && w0.j.prices.goldCosmetic.autor === 12000 && w0.j.currency.id === 'brasas');
  check('pagos apagados por defecto', w0.j.payments.enabled === false);
  const pk = w0.j.payments.packs, byId = Object.fromEntries(pk.map(p => [p.id, p]));
  check('packs listados con precio y moneda explícita', pk.length === 6 && pk.every(p => p.price && p.price.currency === 'USD' && p.price.amount > 0)
    && byId.brasas_500.price.amount === 4.99 && byId.brasas_1000.price.amount === 9.99 && byId.brasas_2500.bonus === 300 && byId.brasas_5000.price.amount === 49.99 && byId.brasas_10000.price.amount === 99.99, pk);
  const perUsd = ['brasas_500', 'brasas_1000', 'brasas_2500', 'brasas_5000', 'brasas_10000'].map(id => (byId[id].premium + byId[id].bonus) / byId[id].price.amount);
  check('valor por dólar creciente entre packs', perUsd.every((v, i) => i === 0 || v > perUsd[i - 1]), perUsd);
  check('pack de bienvenida: una vez, 500+200 y 3 campeones, disponible', byId.brasas_bienvenida && byId.brasas_bienvenida.once === true && byId.brasas_bienvenida.premium === 500
    && byId.brasas_bienvenida.bonus === 200 && byId.brasas_bienvenida.championGifts === wallet.pricing().PRICING.welcome.champions && byId.brasas_bienvenida.championGifts === 3 && byId.brasas_bienvenida.price.amount === 6.99 && byId.brasas_bienvenida.available === true, byId.brasas_bienvenida);
  check('sin compra no hay derecho a campeones', w0.j.welcome.entitled === 0 && w0.j.welcome.remaining === 0 && w0.j.welcome.eligible.length === 0, w0.j.welcome);
  check('comprar sin saldo: 402', (await api('POST', '/api/wallet/buy', { sku, ref: ref(), expectedPrice: 800 }, UT)).status === 402);
  check('comprar sin cotización: 409', (await api('POST', '/api/wallet/buy', { sku, ref: ref() }, UT)).status === 409);

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
  check('sku inexistente', (await api('POST', '/api/wallet/buy', { sku: 'no_existe', ref: ref(), expectedPrice: 800 }, UT)).status === 400);
  check('precio cambiado: 409', (await api('POST', '/api/wallet/buy', { sku, ref: ref(), expectedPrice: 999 }, UT)).status === 409);
  check('el precio del cliente no puede ser más barato: 1000 sobre 1200 rechazado', (await api('POST', '/api/wallet/buy', { sku: autorSku.id, ref: ref(), expectedPrice: 800 }, UT)).status === 409);
  const bref = ref();
  const b1 = await api('POST', '/api/wallet/buy', { sku, ref: bref, expectedPrice: 800 }, UT);
  check('compra de skin de set: 800 menos', b1.status === 200 && b1.j.premium === 1700 && b1.j.price === 800, b1);
  const save = (await api('GET', '/api/save', undefined, UT)).j.data;
  check('la skin queda en el guardado (y el oro intacto)', save.cosmeticUnlocks[sku] === true && save.gold === 50);
  const b2 = await api('POST', '/api/wallet/buy', { sku, ref: bref, expectedPrice: 800 }, UT);
  check('reintentar la misma compra no cobra de nuevo', b2.status === 200 && b2.j.repeated && b2.j.premium === 1700, b2);
  const b3 = await api('POST', '/api/wallet/buy', { sku, ref: ref(), expectedPrice: 800 }, UT);
  check('comprar algo que ya tenés: 409 sin cobrar', b3.status === 409 && (await api('GET', '/api/wallet', undefined, UT)).j.premium === 1700);
  const a1 = await api('POST', '/api/wallet/buy', { sku: autorSku.id, ref: ref(), expectedPrice: 1200 }, UT);
  check('skin independiente: 1200 y queda como croma comprada', a1.status === 200 && a1.j.premium === 500 && a1.j.cosmeticType === 'croma' && (await api('GET', '/api/save', undefined, UT)).j.data.cromas[autorSku.id] === true, a1);
  await api('POST', '/api/gm/user/premium', { id: uid, amount: 1200, reason: 'reponer para pruebas', ref: ref() }, AT);   // vuelve a 1700

  // sin guardado en la nube: se reintegra
  await api('POST', '/api/gm/user/premium', { id: nid, amount: 1000, reason: 'prueba', ref: ref() }, AT);
  const b4 = await api('POST', '/api/wallet/buy', { sku, ref: ref(), expectedPrice: 800 }, NT);
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
  check('pago verificado acredita una sola vez', p1.status === 200 && p2.j.duplicate === true && wp.premium === 2800, { p1: p1.j, p2: p2.j, premium: wp.premium });
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
  check('saldo intacto tras webhooks rechazados', (await api('GET', '/api/wallet', undefined, UT)).j.premium === 2800);
  // pack de bienvenida: se acredita una sola vez por cuenta, aunque llegue otro pago distinto
  const o1 = await hook({ pack: 'brasas_bienvenida', userId: uid, paymentId: 'pay_welcome_1' });
  const o2 = await hook({ pack: 'brasas_bienvenida', userId: uid, paymentId: 'pay_welcome_2' });
  const wo = (await api('GET', '/api/wallet', undefined, UT)).j;
  check('pack de bienvenida acreditado una sola vez', o1.status === 200 && !o1.j.duplicate && o2.status === 200 && o2.j.alreadyBought === true && wo.premium === 2800 + 700, { o1: o1.j, o2: o2.j, premium: wo.premium });
  check('el servidor marca el pack de bienvenida como comprado', wo.payments.enabled === true && wo.payments.packs.find(p => p.id === 'brasas_bienvenida').available === false);
  const other = (await api('GET', '/api/wallet', undefined, NT)).j;
  check('otra cuenta sigue viendo el pack de bienvenida', other.payments.packs.find(p => p.id === 'brasas_bienvenida').available === true);
  // ---- Pack de bienvenida: 3 campeones de regalo (el servidor decide, registra y no deja pasar de 3) ----
  const nrm = (await api('GET', '/api/wallet', undefined, NT)).j.welcome;
  check('sin compra no se puede reclamar ni hay candidatos', nrm.entitled === 0 && nrm.remaining === 0 && nrm.eligible.length === 0
    && (await api('POST', '/api/wallet/welcome/claim', { champion: 'tanque' }, NT)).status === 403);
  const ws = (await api('GET', '/api/wallet', undefined, UT)).j.welcome;
  check('tras la compra: 3 elecciones disponibles y candidatos STANDARD', ws.entitled === 3 && ws.remaining === 3 && ws.claimed.length === 0 && ws.eligible.length >= 6
    && !ws.eligible.includes('aurelia') && !ws.eligible.includes('myla') && !ws.eligible.includes('ynara'), ws);
  const [e1, e2, e3, e4, e5] = ws.eligible;
  check('campeón inexistente o de Ascensión: rechazado', (await api('POST', '/api/wallet/welcome/claim', { champion: 'inexistente' }, UT)).status === 400
    && (await api('POST', '/api/wallet/welcome/claim', { champion: 'aurelia' }, UT)).status === 400 && (await api('POST', '/api/wallet/welcome/claim', {}, UT)).status === 400);
  const c1 = await api('POST', '/api/wallet/welcome/claim', { champion: e1 }, UT);
  const sv1 = (await api('GET', '/api/save', undefined, UT)).j.data;
  check('elegir 1: queda en el guardado y quedan 2', c1.status === 200 && c1.j.remaining === 2 && sv1.champions[e1].unlocked === true, c1);
  const c1b = await api('POST', '/api/wallet/welcome/claim', { champion: e1 }, UT);
  check('repetir la misma elección no consume otra', c1b.status === 200 && c1b.j.repeated === true && c1b.j.remaining === 2, c1b);
  const race = await Promise.all([e2, e3, e4].map(c => api('POST', '/api/wallet/welcome/claim', { champion: c }, UT)));
  const oks = race.filter(r => r.status === 200).length;
  check('tres pedidos simultáneos con 2 elecciones libres: pasan exactamente 2', oks === 2 && race.filter(r => r.status === 409 && r.j.error === 'NO_PICKS_LEFT').length === 1, race.map(r => [r.status, r.j.error]));
  const wd = (await api('GET', '/api/wallet', undefined, UT)).j;
  check('nunca más de 3 campeones por el pack', wd.welcome.claimed.length === 3 && wd.welcome.remaining === 0 && wd.welcome.eligible.length === 0
    && (await api('POST', '/api/wallet/welcome/claim', { champion: e5 }, UT)).status === 409, wd.welcome);
  const picks = wd.ledger.filter(e => /^welcome_pick:/.test(e.reason));
  check('cada elección queda en el libro con monto 0 y el saldo no se toca', picks.length === 3 && picks.every(e => e.delta === 0) && wd.premium === 2800 + 700, picks);
  // un segundo pago del pack no suma elecciones
  await hook({ pack: 'brasas_bienvenida', userId: uid, paymentId: 'pay_welcome_3' });
  check('un segundo pago de bienvenida no da más campeones', (await api('GET', '/api/wallet', undefined, UT)).j.welcome.entitled === 3);
  // restaurable: si otro dispositivo sube un guardado viejo sin el campeón, la billetera lo reentrega
  const cur = await api('GET', '/api/save', undefined, UT);
  const old = JSON.parse(JSON.stringify(cur.j.data)); delete old.champions[e1];
  const put = await api('PUT', '/api/save', { data: old, baseVersion: cur.j.version }, UT);
  const rec = await api('GET', '/api/wallet', undefined, UT);
  check('guardado viejo sin el campeón: se restaura al abrir la billetera', put.status === 200 && (await api('GET', '/api/save', undefined, UT)).j.data.champions[e1].unlocked === true && rec.j.welcome.claimed.includes(e1));
  // un campeón que ya tenés no se puede elegir (ni aparece como candidato)
  const XT = (await api('POST', '/api/register', { user: 'Comprador2', pass: 'espada123' })).j.token;
  await api('PUT', '/api/save', { data: { gold: 0, champions: { tanque: { unlocked: true } }, cosmeticUnlocks: {}, cromas: {} }, baseVersion: 0 }, XT);
  const xid = (await api('GET', '/api/gm/users', undefined, AT)).j.users.find(u => u.user === 'Comprador2').id;
  await hook({ pack: 'brasas_bienvenida', userId: xid, paymentId: 'pay_welcome_x' });
  const xs = (await api('GET', '/api/wallet', undefined, XT)).j.welcome;
  check('un campeón que ya tenés no es candidato ni se puede elegir', xs.entitled === 3 && !xs.eligible.includes('tanque') && (await api('POST', '/api/wallet/welcome/claim', { champion: 'tanque' }, XT)).status === 409, xs);
  const xc = await api('POST', '/api/wallet/welcome/claim', { champion: xs.eligible[0] }, XT);
  check('otra cuenta elige con su propio derecho', xc.status === 200 && xc.j.remaining === 2);
  const xsave = (await api('GET', '/api/save', undefined, XT)).j.data;
  check('el oro del guardado no cambia al elegir (es un regalo, no una compra)', xsave.gold === 0);

  // ---- Colecciones: todas las apariencias de un campeón que faltan, con descuento por cantidad ----
  const byChamp = {}; for(const x of skus) if(x.champion) (byChamp[x.champion] = byChamp[x.champion] || []).push(x);
  const cc = Object.keys(byChamp).sort((a, b) => byChamp[b].length - byChamp[a].length)[0], list = byChamp[cc];
  check('hay un campeón con al menos 3 apariencias', list.length >= 3, list.length);
  const CT = (await api('POST', '/api/register', { user: 'Coleccionista', pass: 'espada123' })).j.token;
  await api('PUT', '/api/save', { data: { gold: 0, champions: {}, cosmeticUnlocks: {}, cromas: {} }, baseVersion: 0 }, CT);
  const cid = (await api('GET', '/api/gm/users', undefined, AT)).j.users.find(u => u.user === 'Coleccionista').id;
  const q = wallet.pricing().pricingCollection(list.map(x => wallet.pricing().pricingBrasas(x.tier)));
  check('el descuento es real: precio < suma de las piezas y ahorro = suma - precio', q.price < q.sum && q.save === q.sum - q.price && q.offPct >= 15, q);
  check('colección sin saldo: 402', (await api('POST', '/api/wallet/buy-collection', { champion: cc, ref: ref(), expectedPrice: q.price }, CT)).status === 402);
  await api('POST', '/api/gm/user/premium', { id: cid, amount: q.price + 300, reason: 'prueba de colección', ref: ref() }, AT);
  check('colección con cotización vieja: 409 sin cobrar', (await api('POST', '/api/wallet/buy-collection', { champion: cc, ref: ref(), expectedPrice: q.sum }, CT)).status === 409
    && (await api('GET', '/api/wallet', undefined, CT)).j.premium === q.price + 300);
  const colRef = ref();
  const col = await api('POST', '/api/wallet/buy-collection', { champion: cc, ref: colRef, expectedPrice: q.price }, CT);
  const csave = (await api('GET', '/api/save', undefined, CT)).j.data;
  check('colección: se cobra el precio con descuento y llegan todas las piezas', col.status === 200 && col.j.premium === 300 && col.j.n === list.length && col.j.saved === q.save
    && list.every(x => csave.cosmeticUnlocks[x.id] === true), col);
  const col2 = await api('POST', '/api/wallet/buy-collection', { champion: cc, ref: colRef, expectedPrice: q.price }, CT);
  check('reintentar la colección no cobra de nuevo', col2.status === 200 && col2.j.repeated && (await api('GET', '/api/wallet', undefined, CT)).j.premium === 300);
  check('colección ya completa con otra referencia: 409 sin cobrar', (await api('POST', '/api/wallet/buy-collection', { champion: cc, ref: ref(), expectedPrice: q.price }, CT)).status === 409
    && (await api('GET', '/api/wallet', undefined, CT)).j.premium === 300);
  check('campeón sin apariencias: 400', (await api('POST', '/api/wallet/buy-collection', { champion: 'inexistente', ref: ref(), expectedPrice: 1 }, CT)).status === 400);
  const CT2 = (await api('POST', '/api/register', { user: 'Colec2', pass: 'espada123' })).j.token;
  const c2id = (await api('GET', '/api/gm/users', undefined, AT)).j.users.find(u => u.user === 'Colec2').id;
  await api('PUT', '/api/save', { data: { gold: 0, champions: {}, cosmeticUnlocks: Object.fromEntries(list.slice(1).map(x => [x.id, true])), cromas: Object.fromEntries(list.slice(1).filter(x => x.kind !== 'set').map(x => [x.id, true])) }, baseVersion: 0 }, CT2);
  await api('POST', '/api/gm/user/premium', { id: c2id, amount: 2000, reason: 'prueba', ref: ref() }, AT);
  check('con una sola pieza faltante no es colección: se compra suelta', (await api('POST', '/api/wallet/buy-collection', { champion: cc, ref: ref(), expectedPrice: wallet.pricing().pricingBrasas(list[0].tier) }, CT2)).status === 409);

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
