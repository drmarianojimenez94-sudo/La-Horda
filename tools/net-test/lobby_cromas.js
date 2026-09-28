// LA HORDA — CROMAS en red (js/systems/cromas.js): dos clientes de Chromium INDEPENDIENTES (cada uno con su
// guardado y su WebSocket) contra el relay real. El invitado (celular) compra y equipa una croma desde la
// Tienda abierta en la Sala; el anfitrión equipa otra (Tanque, atlas viejo). Cada uno ve la del otro en la
// Sala y en partida (el invitado dibuja con el atlas recoloreado), y la del otro NO queda en su guardado.
//
// uso: node tools/net-test/lobby_cromas.js [carpeta_capturas]
//   requiere: python3 -m http.server <puerto> (raíz) y PORT=<puerto> node server/relay.js
//   SITE=http://127.0.0.1:8771 RELAY=ws://127.0.0.1:8799 (por defecto)
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const SITE = process.env.SITE || 'http://127.0.0.1:8771';
const RELAY = process.env.RELAY || 'ws://127.0.0.1:8799';
const OUT = process.argv[2];
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0;
const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 400) : '')); if (!ok) fails++; };
const PHONE = { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };

async function client(browser, name, champ) {
  const ctx = await browser.newContext(PHONE);
  await ctx.addInitScript(([n]) => { try { if (!localStorage.getItem('__s')) { localStorage.clear(); localStorage.setItem('__s', '1'); localStorage.setItem('horda_name', n); } } catch (e) {} }, [name]);
  await ctx.addInitScript(() => { window.__autoConfirm = true; });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', d => d.accept());
  await page.goto(`${SITE}/index.html?server=${encodeURIComponent(RELAY)}`, { timeout: 120000 });
  for (let k = 0; k < 300; k++) { if (await page.evaluate(() => { const b = document.getElementById('title-continue-btn'); return b && !b.disabled; })) break; await sleep(100); }
  await page.evaluate(([c]) => {
    for (const k in save.champions) save.champions[k].level = 12;
    for (const it of stashItems().slice()) if (it.set) removeItemFromInventory(null, it.uid, false); // sin skins de set de regalo
    save.champions[c].unlocked = true; save.starterChosen = true; save.gold = 99999; save.cromas = {};
    save.arenasCleared.fortaleza = true; selectedClass = c; save.lastChamp = c; persistNow();
  }, [champ]);
  return { ctx, page, errors, name };
}
const ev = (c, fn, a) => c.page.evaluate(fn, a);
async function press(c, sel) { await c.page.tap(sel); await sleep(450); }
const slotSkins = (c) => ev(c, () => [...document.querySelectorAll('#lobby-slots canvas.lobby-anim')].map(cv => ({ k: cv.dataset.classKey, skin: cv.dataset.skin })));

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const A = await client(browser, 'Ana', 'tanque');
  await press(A, '#title-continue-btn'); await press(A, '#mainmenu-jugar-btn'); await press(A, '#mode-arena-btn');
  await press(A, '.arena-card[data-arena="fortaleza"]'); await press(A, '#start-btn');
  await press(A, '#net-create-btn');
  for (let k = 0; k < 60; k++) { if (await ev(A, () => !!net.code)) break; await sleep(100); }
  const code = await ev(A, () => net.code);
  check('sala.creada', /^[A-Z2-9]{6}$/.test(code || ''), { code });

  const B = await client(browser, 'Beto', 'nigromante');
  await press(B, '#title-continue-btn'); await press(B, '#mainmenu-jugar-btn');
  await B.page.fill('#mode-join-code', code); await press(B, '#mode-join-btn');
  for (let k = 0; k < 60; k++) { if (await ev(B, () => net.role === 'guest' && state === 'prep')) break; await sleep(100); }
  await sleep(800);
  check('sala.invitado_unido', await ev(B, () => net.role === 'guest' && state === 'prep'));

  // ---- B abre la Tienda desde la Sala y compra la croma con el dedo ----
  // (el bloque "Skins de X" de la Sala solo aparece si el guardián tiene skin de set: se abre la Tienda
  // igual que ese botón -menus.js no se toca en esta tanda-)
  await ev(B, () => { codexReturnTo = 'prep'; shopTab = 'skins'; setState('shop'); renderShop(); }); await sleep(300);
  check('tienda.pestana_skins_con_cromas', await ev(B, () => state === 'shop' && shopTab === 'skins' && document.querySelectorAll('[data-croma-card]').length > 0));
  await B.page.evaluate(() => document.querySelector('[data-croma-buy="nigromante_escarcha"]').scrollIntoView({ block: 'center' })); await sleep(250);
  const gold0 = await ev(B, () => save.gold); // (los logros/pase pueden haber sumado oro al entrar)
  await press(B, '[data-croma-buy="nigromante_escarcha"]');
  await sleep(700);
  const bBuy = await ev(B, () => ({ owned: cromaOwned('nigromante_escarcha'), eq: cromaEquippedId('nigromante'), skin: champSkinId('nigromante'), gold: save.gold,
    toast: (document.getElementById('net-toast') || {}).textContent || '' }));
  check('tienda.compra_y_equipa', bBuy.owned && bBuy.eq === 'nigromante_escarcha' && bBuy.skin === 'nigromante_escarcha' && bBuy.gold === gold0 - 1500, Object.assign({ gold0 }, bBuy));
  if (OUT) await B.page.screenshot({ path: OUT + '/B_tienda_cromas.png' });
  await press(B, '#shop-back-btn');
  check('tienda.vuelve_a_la_sala', await ev(B, () => state === 'prep' && netInRoom()));

  // ---- A equipa la croma del Tanque (atlas viejo: imagen recoloreada) ----
  await ev(A, () => { save.cromas.tanque_juicio = true; cromaEquip('tanque', 'tanque_juicio'); if (typeof renderPrepSummary === 'function') renderPrepSummary(); });
  await sleep(1500);
  const aSlots = await slotSkins(A), bSlots = await slotSkins(B);
  check('sala.anfitrion_ve_croma_del_invitado', aSlots.some(s => s.k === 'nigromante' && s.skin === 'nigromante_escarcha'), aSlots);
  check('sala.invitado_ve_croma_del_anfitrion', bSlots.some(s => s.k === 'tanque' && s.skin === 'tanque_juicio'), bSlots);
  const label = await ev(B, () => [...document.querySelectorAll('.lobby-skin')].map(e => e.textContent));
  check('sala.nombre_de_la_croma', label.some(t => /Paladín del Juicio/.test(t)) && label.some(t => /Sudario de Escarcha/.test(t)), label);
  const cross = { a: await ev(A, () => cromaEquippedId('nigromante')), b: await ev(B, () => cromaEquippedId('tanque')), aOwn: await ev(A, () => cromaOwned('nigromante_escarcha')) };
  check('sala.no_pisa_el_guardado_del_otro', cross.a === null && cross.b === null && !cross.aOwn, cross);
  if (OUT) await B.page.screenshot({ path: OUT + '/B_sala_cromas.png' });

  // ---- partida ----
  await ev(B, () => { document.getElementById('net-ready-btn').click(); });
  await sleep(600);
  await ev(A, () => netHostStartGame());
  for (let k = 0; k < 80; k++) { if (await ev(B, () => state === 'playing') && await ev(A, () => state === 'playing')) break; await sleep(150); }
  await sleep(3000);
  const inHost = await ev(A, () => heroes.map(h => ({ k: h.classKey, skin: h.skinSet || null })));
  check('partida.anfitrion_simula_ambas_cromas', inHost.some(h => h.k === 'tanque' && h.skin === 'tanque_juicio') && inHost.some(h => h.k === 'nigromante' && h.skin === 'nigromante_escarcha'), inHost);
  for (let k = 0; k < 40; k++) { if (await ev(B, () => { const t = heroes.find(h => h.classKey === 'tanque'), n = heroes.find(h => h.classKey === 'nigromante'); return t && n && cromaImage(t, 'tanque_atlas') && CHAMP_PACK[setSkinPackKey(n, 'nigromante')].cromaOf; })) break; await sleep(150); }
  const inGuest = await ev(B, () => heroes.map(h => ({ k: h.classKey, act: (activeSetSkin(h) || {}).name || null,
    pack: h.classKey === 'nigromante' ? setSkinPackKey(h, 'nigromante') : null, img: h.classKey === 'tanque' ? !!cromaImage(h, 'tanque_atlas') : null })));
  check('partida.invitado_dibuja_la_croma_del_anfitrion', inGuest.some(h => h.k === 'tanque' && /Juicio/.test(h.act || '') && h.img), inGuest);
  check('partida.invitado_dibuja_su_croma', inGuest.some(h => h.k === 'nigromante' && /Escarcha/.test(h.act || '') && h.pack === 'croma_nigromante_escarcha'), inGuest);
  if (OUT) {
    await ev(B, () => { const t = heroes.find(h => h.classKey === 'tanque'), n = heroes.find(h => h.classKey === 'nigromante'); if (t && n) { camX = (t.x + n.x) / 2 - innerWidth / 2 / (window.camZoom || 1); } });
    await sleep(400); await B.page.screenshot({ path: OUT + '/B_partida_cromas.png' }); await A.page.screenshot({ path: OUT + '/A_partida_cromas.png' });
  }
  // el anfitrión nunca guarda la croma del invitado (su guardado sigue con la propia)
  const aSave = await ev(A, () => { try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); return { nig: s.champions.nigromante.croma || null, tq: s.champions.tanque.croma || null }; } catch (e) { return 'ERR ' + e.message; } });
  check('guardado.anfitrion_sin_la_croma_del_invitado', aSave && aSave.nig === null && aSave.tq === 'tanque_juicio', aSave);

  const errs = [...A.errors, ...B.errors];
  check('sin_errores_js', errs.length === 0, errs.slice(0, 5));
  console.log(fails ? `FAILS ${fails}` : 'OK');
  await browser.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
