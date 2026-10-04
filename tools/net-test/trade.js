// LA HORDA — INTERCAMBIO EN LA SALA (sin plata real) con el relay real y dos navegadores independientes:
//   A (anfitrión, escritorio) le da objetos a B (invitado, celular). Se prueba:
//   - la pestaña Sala online muestra el intercambio; el selector separa lo que se puede dar de lo ligado
//     (Único, pieza de set, re-tirado con la Mística, equipado) con el motivo;
//   - oferta → B ve la ficha y ACEPTA → A CONFIRMA → el objeto pasa COMPLETO (nombre, afijos, nivel) con
//     un uid nuevo, y A lo pierde recién cuando B lo recibió; los dos guardados quedan escritos;
//   - uid quemado: una copia vieja del objeto ya dado no se puede volver a dar;
//   - rechazo: nadie pierde nada;
//   - corte antes del commit (el "got" de B nunca llega): se anula, A recupera el objeto, B no lo tiene;
//   - corte después del commit (B pierde el "commit"): al reintentar B lo recibe y A lo pierde, una sola copia;
//   - A se cae justo después de confirmar (recarga): al volver termina solo, una sola copia en total;
//   - comenzar la partida anula una oferta abierta.
//
// uso: SITE=http://127.0.0.1:8845 RELAY=ws://127.0.0.1:8855 node tools/net-test/trade.js
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const SITE = process.env.SITE || 'http://127.0.0.1:8771';
const RELAY = process.env.RELAY || 'ws://127.0.0.1:8799';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0;
const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 400) : '')); if (!ok) fails++; };
const PHONE = { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };
const DESK = { viewport: { width: 1000, height: 560 } };
const ev = (c, fn, a) => c.page.evaluate(fn, a);
async function waitFor(c, fn, arg, ms = 10000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await ev(c, fn, arg)) return true; } catch (e) {} await sleep(150); } return false; }
const URL0 = `${SITE}/index.html?server=${encodeURIComponent(RELAY)}`;
async function boot(c) {
  await c.page.goto(URL0, { timeout: 120000 });
  await waitFor(c, () => { const b = document.getElementById('title-continue-btn'); return !!b && !b.disabled; }, null, 60000);
}
async function client(browser, mobile, name, champ) {
  const ctx = await browser.newContext(mobile ? PHONE : DESK);
  await ctx.addInitScript(([n]) => { try { if (!localStorage.getItem('__s')) { localStorage.clear(); localStorage.setItem('__s', '1'); localStorage.setItem('horda_name', n); } } catch (e) {} }, [name]);
  await ctx.addInitScript(() => { window.__autoConfirm = true; });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', d => d.accept());
  const c = { ctx, page, errors, name, mobile };
  await boot(c);
  await ev(c, ([k]) => {
    for (const q in save.champions) save.champions[q].level = 12;
    for (const it of stashItems().slice()) removeItemFromInventory(null, it.uid, false); // inventario limpio
    save.champions[k].unlocked = true; save.starterChosen = true; save.tut = Object.assign(save.tut || {}, { training: 1 }); selectedClass = k; save.lastChamp = k;
    save.arenasCleared.ciudad = true; persistNow();
  }, [champ]);
  return c;
}
async function press(c, sel) {
  await c.page.evaluate(s => { if (typeof prepSecReveal === 'function') prepSecReveal(s); }, sel).catch(() => {});
  const el = await c.page.waitForSelector(sel, { state: 'visible', timeout: 8000 });
  await el.evaluate(e => e.scrollIntoView({ block: 'center' })); await sleep(120);
  if (c.mobile) { const b = await el.boundingBox(); await c.page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); } else await el.click();
  await sleep(350);
}
// cuántas copias de un objeto (por nombre) hay en el inventario guardado (localStorage) de cada uno
const copies = (c, name) => ev(c, (n) => { const s = JSON.parse(localStorage.getItem('laHordaSave_v1')); return s.stash.filter(it => it.name === n).length; }, name);
const escN = (c) => ev(c, () => { const s = JSON.parse(localStorage.getItem('laHordaSave_v1')); const t = s.trades || {}; return Object.keys(t.esc || {}).length; });
const pendN = (c) => ev(c, () => { const s = JSON.parse(localStorage.getItem('laHordaSave_v1')); const t = s.trades || {}; return Object.keys(t.pend || {}).length; });
async function roomUp(A, B) {
  await ev(A, () => { hubPlay(); });
  await press(A, '[data-prep-sec="online"]');
  await press(A, '#net-create-btn');
  await waitFor(A, () => !!net.code);
  const code = await ev(A, () => net.code);
  await ev(B, (cd) => { setState('modeselect'); netJoinWithCode(cd, null, 'UNIRSE'); }, code);
  await waitFor(B, () => net.role === 'guest' && state === 'prep', null, 15000);
  await waitFor(A, () => netHumanCount() === 2);
  await ev(B, () => prepSecSet('online'));
  return code;
}
async function offerAndAccept(A, B, name) {
  const r = await ev(A, (n) => { const it = stashItems().find(x => x.name === n); return netTradeOffer(1, it.uid); }, name);
  await waitFor(B, () => netTrade.inc && netTrade.inc.st === 'offered');
  await press(B, '#tr-accept');
  await waitFor(A, () => netTrade.out && netTrade.out.st === 'accepted');
  return r;
}

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const A = await client(browser, false, 'Ana', 'mago');
  const B = await client(browser, true, 'Beto', 'musashi');
  await press(A, '#title-continue-btn'); await press(B, '#title-continue-btn');
  // inventario de A: 5 legendarios que se pueden dar + lo ligado (Único, set, Mística) + uno equipado
  const names = await ev(A, () => {
    const mk = (n, extra) => { const it = makeItem('arma', 'legendario', null); it.name = n; it.level = 4; Object.assign(it, extra || {}); stashItems().push(it); return it; };
    for (let i = 1; i <= 5; i++) mk('Prueba L' + i);
    mk('Prueba Unico', { rarity: 'unico' });
    const s = makeDesignedItem('lucifer_casco'); s.name = 'Prueba Set'; stashItems().push(s);
    mk('Prueba Mistica', { rerolls: 1, rerollIdx: 0 });
    const e = mk('Prueba Equipada'); e.type = 'guantes'; save.champions.mago.equipment.guantes = e.uid;
    persistNow();
    const L1 = stashItems().find(x => x.name === 'Prueba L1');
    return { affixes: JSON.stringify(L1.affixes || []), level: L1.level, uid: L1.uid, passives: (L1.passives || []).length };
  });
  const code = await roomUp(A, B);
  check('sala.juntos', /^[A-Z2-9]{6}$/.test(code || ''), code);

  // ================= UI: pestaña Sala online y selector =================
  check('ui.intercambio_visible', await A.page.isVisible('#net-trade') && await B.page.isVisible('#net-trade'));
  await press(A, '[data-tr-to="1"]');
  const pick = await ev(A, () => ({ ok: [...document.querySelectorAll('#item-preview [data-tr-pick]')].map(b => b.textContent.replace(/\s+/g, ' ').trim()),
    off: [...document.querySelectorAll('#item-preview .tr-pick.off')].map(b => b.textContent.replace(/\s+/g, ' ').trim()) }));
  check('ui.selector_solo_lo_que_se_puede', pick.ok.length === 5 && pick.ok.every(t => /Prueba L\d/.test(t)), pick.ok);
  check('ui.selector_ligados_con_motivo', pick.off.length === 4 && pick.off.some(t => /Único: ligado/.test(t)) && pick.off.some(t => /set \(skin\)/.test(t)) && pick.off.some(t => /Mística/.test(t)) && pick.off.some(t => /Lo lleva puesto/.test(t)), pick.off);
  // elegir L1 -> ficha -> Ofrecer
  await ev(A, () => { const b = [...document.querySelectorAll('#item-preview [data-tr-pick]')].find(x => /Prueba L1/.test(x.textContent)); b.click(); });
  await sleep(300);
  await press(A, '#tr-offer-go');
  await waitFor(B, () => netTrade.inc && netTrade.inc.st === 'offered');
  const bSees = await ev(B, () => document.getElementById('net-trade').textContent.replace(/\s+/g, ' '));
  check('oferta.b_la_ve', /Ana te ofrece/.test(bSees) && /Prueba L1/.test(bSees), bSees);
  check('oferta.pestana_avisa', await ev(B, () => document.querySelector('[data-prep-sec="online"]').classList.contains('trade-ask')));
  await press(B, '#tr-view');
  const ficha = await ev(B, () => (document.querySelector('#item-preview .ip-name') || {}).textContent);
  check('oferta.ficha_completa', ficha === 'Prueba L1', ficha);
  await ev(B, () => document.querySelector('#item-preview [data-ip-close]').click());
  check('oferta.a_no_perdio_nada_todavia', await copies(A, 'Prueba L1') === 1);
  await press(B, '#tr-accept');
  await waitFor(A, () => netTrade.out && netTrade.out.st === 'accepted');
  check('oferta.b_acepto_a_pide_confirmar', await A.page.isVisible('#tr-confirm'));
  check('oferta.a_sigue_con_el_objeto', await copies(A, 'Prueba L1') === 1);
  await press(A, '#tr-confirm');
  await waitFor(A, () => !netTrade.out, null, 10000);
  await waitFor(B, () => !netTrade.inc, null, 10000);
  const got = await ev(B, () => { const it = stashItems().find(x => x.name === 'Prueba L1'); return it ? { uid: it.uid, affixes: JSON.stringify(it.affixes || []), level: it.level, passives: (it.passives || []).length, type: it.type, rarity: it.rarity } : null; });
  check('entrega.b_lo_tiene_completo', got && got.affixes === names.affixes && got.level === names.level && got.passives === names.passives && got.rarity === 'legendario', got);
  check('entrega.uid_nuevo', got && /^it_t[0-9a-f]+$/.test(got.uid) && got.uid !== names.uid, got && got.uid);
  check('entrega.guardados_escritos', await copies(A, 'Prueba L1') === 0 && await copies(B, 'Prueba L1') === 1 && await escN(A) === 0 && await pendN(B) === 0);
  const logs = { a: await ev(A, () => netTrade.log.join('|')), b: await ev(B, () => netTrade.log.join('|')) };
  check('entrega.avisos', /Beto recibió/.test(logs.a) && /Recibiste «Prueba L1» de Ana/.test(logs.b), logs);

  // ================= uid quemado: una copia vieja no se puede volver a dar =================
  await sleep(1700);
  await ev(A, (u) => { const it = makeItem('arma', 'legendario', null); it.uid = u; it.name = 'Copia vieja'; stashItems().push(it); }, names.uid);
  await ev(A, (u) => { window.__toastSeen = ''; netTradeOffer(1, u); }, names.uid);
  await waitFor(A, () => /ya lo diste/.test((document.getElementById('net-toast') || {}).textContent || ''));
  check('antidup.uid_quemado', /ya lo diste/.test(await ev(A, () => document.getElementById('net-toast').textContent)) && await ev(A, () => !netTrade.out) && await waitFor(B, () => !netTrade.inc, null, 1500));
  await ev(A, (u) => { removeItemFromInventory(null, u, false); }, names.uid);

  // ================= rechazo =================
  await sleep(1700);
  await ev(A, () => { const it = stashItems().find(x => x.name === 'Prueba L2'); netTradeOffer(1, it.uid); });
  await waitFor(B, () => netTrade.inc && netTrade.inc.st === 'offered');
  await press(B, '#tr-reject');
  await waitFor(A, () => !netTrade.out);
  check('rechazo.nadie_pierde', await copies(A, 'Prueba L2') === 1 && await copies(B, 'Prueba L2') === 0 && await escN(A) === 0);

  // ================= corte ANTES del commit: el "got" de B nunca llega =================
  await sleep(1700);
  await ev(B, () => { window.__origSend = netSend; netSend = (m) => (m && m.t === 'trade' && m.op === 'got') ? true : window.__origSend(m); });
  await offerAndAccept(A, B, 'Prueba L3');
  await press(A, '#tr-confirm');
  await waitFor(B, () => Object.keys(save.trades.pend).length === 1);
  const mid = { aEsc: await escN(A), aHas: await copies(A, 'Prueba L3'), bPend: await pendN(B), bHas: await copies(B, 'Prueba L3') };
  check('corte_antes.en_camino_sin_copias', mid.aEsc === 1 && mid.aHas === 0 && mid.bPend === 1 && mid.bHas === 0, mid);
  const t0 = Date.now();
  await waitFor(A, () => Object.keys(save.trades.esc).length === 0, null, 40000);
  await waitFor(B, () => Object.keys(save.trades.pend).length === 0, null, 5000);
  const fin = { aHas: await copies(A, 'Prueba L3'), bHas: await copies(B, 'Prueba L3'), aEsc: await escN(A), bPend: await pendN(B), secs: Math.round((Date.now() - t0) / 1000) };
  check('corte_antes.se_anula_y_a_lo_recupera', fin.aHas === 1 && fin.bHas === 0 && fin.aEsc === 0 && fin.bPend === 0, fin);
  await ev(B, () => { netSend = window.__origSend; });

  // ================= corte DESPUÉS del commit: B pierde el aviso "commit" =================
  await sleep(1700);
  await ev(B, () => { const h = net.handlers.trade; window.__origTrade = h; let drop = true; net.handlers.trade = (m) => { if (drop && m.op === 'commit') { drop = false; return; } h(m); }; });
  await offerAndAccept(A, B, 'Prueba L4');
  await press(A, '#tr-confirm');
  await waitFor(B, () => Object.keys(save.trades.pend).length === 1);
  await sleep(600);
  const mid2 = { aEsc: await escN(A), aHas: await copies(A, 'Prueba L4'), bHas: await copies(B, 'Prueba L4') };
  check('corte_despues.a_espera_b_todavia_no', mid2.aEsc === 1 && mid2.aHas === 0 && mid2.bHas === 0, mid2);
  await waitFor(B, () => stashItems().some(x => x.name === 'Prueba L4'), null, 30000); // B vuelve a preguntar solo
  await waitFor(A, () => Object.keys(save.trades.esc).length === 0, null, 15000);
  await waitFor(B, () => Object.keys(save.trades.pend).length === 0, null, 15000);
  const fin2 = { aHas: await copies(A, 'Prueba L4'), bHas: await copies(B, 'Prueba L4'), aEsc: await escN(A), bPend: await pendN(B) };
  check('corte_despues.una_sola_copia', fin2.aHas === 0 && fin2.bHas === 1 && fin2.aEsc === 0 && fin2.bPend === 0, fin2);
  await ev(B, () => { net.handlers.trade = window.__origTrade; });

  // ================= A se cae justo después de confirmar (recarga la página) =================
  await sleep(1700);
  await offerAndAccept(A, B, 'Prueba L5');
  await ev(A, () => document.getElementById('tr-confirm').click());
  await waitFor(A, () => netTrade.out && netTrade.out.st === 'delivering', null, 3000);
  await A.page.reload({ timeout: 120000 }); // se corta la conexión del anfitrión (la sala se cierra)
  await waitFor(A, () => typeof save !== 'undefined' && save.trades && Object.keys(save.trades.esc || {}).length === 0, null, 45000);
  await waitFor(B, () => Object.keys(save.trades.pend).length === 0, null, 15000);
  const fin3 = { aHas: await copies(A, 'Prueba L5'), bHas: await copies(B, 'Prueba L5'), aEsc: await escN(A), bPend: await pendN(B) };
  check('caida_del_que_da.una_sola_copia_en_total', fin3.aHas + fin3.bHas === 1 && fin3.aEsc === 0 && fin3.bPend === 0, fin3);

  // ================= comenzar la partida anula una oferta abierta =================
  await waitFor(A, () => { const b = document.getElementById('title-continue-btn'); return !!b && !b.disabled; }, null, 60000);
  await press(A, '#title-continue-btn');
  await ev(B, () => { if (netInRoom()) netLeaveRoom(); setState('mainmenu'); renderMainMenu(); });
  await roomUp(A, B);
  await sleep(1700);
  await ev(A, () => { const it = stashItems().find(x => x.name === 'Prueba L2'); netTradeOffer(1, it.uid); });
  await waitFor(B, () => netTrade.inc && netTrade.inc.st === 'offered');
  await ev(B, () => document.getElementById('net-ready-btn').click()); await sleep(300);
  await ev(A, () => netHostStartGame());
  await waitFor(A, () => state === 'playing', null, 15000);
  await sleep(800);
  const st = { aOut: await ev(A, () => netTrade.out), bInc: await ev(B, () => netTrade.inc), aHas: await copies(A, 'Prueba L2'), bHas: await copies(B, 'Prueba L2') };
  check('partida.anula_oferta_abierta', !st.aOut && !st.bInc && st.aHas === 1 && st.bHas === 0, st);
  check('partida.intercambio_oculto', !(await A.page.isVisible('#net-trade')));

  const errs = [...A.errors, ...B.errors];
  check('sin_errores_js', errs.length === 0, errs.slice(0, 5));
  console.log(fails ? `FAILS ${fails}` : 'OK');
  await browser.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
