// LA HORDA — QA del flujo multijugador pre-alfa: UNIRSE CON CÓDIGO + scroll táctil en celular + autoequip
// de skins + sincronización de skins (sala, partida, revivir, reconexión) + enlace de invitación.
// Clientes de Chromium INDEPENDIENTES (cada uno con su guardado y su WebSocket) contra el relay real.
//
// uso: node tools/net-test/lobby_code_skins.js [desktop|mobile] [carpeta_capturas]
//   desktop (default): A = escritorio, B = iPhone horizontal · mobile: A y B en iPhone horizontal
//   requiere: python3 -m http.server 8771 (raíz) y PORT=8799 node server/relay.js
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
let WebSocket;
try { WebSocket = require('ws'); } catch (e) { WebSocket = require(require('path').join(__dirname, '../../server/node_modules/ws')); }
const SITE = process.env.SITE || 'http://127.0.0.1:8771';
const RELAY = process.env.RELAY || 'ws://127.0.0.1:8799';
const HOST_MODE = process.argv[2] === 'mobile' ? 'mobile' : 'desktop';
const OUT = process.argv[3];
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0;
const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 400) : '')); if (!ok) fails++; };
const PHONE = { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };
const DESK = { viewport: { width: 1000, height: 560 } };

async function client(browser, mobile, name, champ, url) {
  const ctx = await browser.newContext(Object.assign({}, mobile ? PHONE : DESK));
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: SITE });
  await ctx.addInitScript(([n]) => { try { if (!localStorage.getItem('__s')) { localStorage.clear(); localStorage.setItem('__s', '1'); localStorage.setItem('horda_name', n); } } catch (e) {} }, [name]);
  await ctx.addInitScript(() => { window.__autoConfirm = true; }); // diálogos propios (game-dialog.js): aceptar solos, como page.on('dialog')
  const page = await ctx.newPage();
  const errors = [], dialogs = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', d => { dialogs.push(d.message()); d.accept(); });
  await page.goto(url || `${SITE}/index.html?server=${encodeURIComponent(RELAY)}`);
  for (let k = 0; k < 300; k++) { if (await page.evaluate(() => { const b = document.getElementById('title-continue-btn'); return b && !b.disabled; })) break; await sleep(100); }
  await page.evaluate(([c]) => {
    for (const k in save.champions) { save.champions[k].level = 12; }
    // la prueba compra y equipa skins: arranca sin las skins de regalo de la etapa de prueba (testSkinsV1)
    for (const it of stashItems().slice()) if (it.set) removeItemFromInventory(null, it.uid, false);
    save.champions[c].unlocked = true; save.starterChosen = true; save.gold = 99999;
    save.arenasCleared.fortaleza = true; selectedClass = c; save.lastChamp = c; persistNow();
  }, [champ]);
  const c = { ctx, page, errors, dialogs, mobile, name };
  c.cdp = mobile ? await ctx.newCDPSession(page) : null;
  return c;
}
const ev = (c, fn, a) => c.page.evaluate(fn, a);
// toque "humano": en celular, touch real; en escritorio, click
async function press(c, sel) { if (c.mobile) await c.page.tap(sel); else await c.page.click(sel); await sleep(450); }
// swipe vertical con eventos táctiles reales (dedo hacia arriba = contenido hacia abajo)
async function swipe(c, x, y, dy) {
  await c.cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  const n = 12; for (let i = 1; i <= n; i++) { await c.cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y + dy * i / n }] }); await sleep(30); }
  await c.cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await sleep(250);
}
// Baja con el dedo hasta el final de `sel` y devuelve si llegó y si el último botón quedó a la vista.
async function swipeToBottom(c, sel, x) {
  const H = c.page.viewportSize().height;
  let last = -1;
  for (let i = 0; i < 90; i++) {
    const st = await ev(c, (s) => document.querySelector(s).scrollTop, sel);
    if (st === last) break; last = st;
    await swipe(c, x || 420, H * 0.78, -H * 0.55);
  }
  return ev(c, (s) => {
    const el = document.querySelector(s), r = el.getBoundingClientRect();
    const btns = [...el.querySelectorAll('button')].filter(b => b.offsetParent);
    const lb = btns[btns.length - 1], br = lb ? lb.getBoundingClientRect() : null;
    return { atEnd: el.scrollTop + el.clientHeight >= el.scrollHeight - 2, scrolled: el.scrollTop, sh: el.scrollHeight, ch: el.clientHeight,
      lastBtnVisible: !br || (br.bottom <= Math.min(innerHeight, r.bottom) + 1 && br.top >= r.top - 1), lastBtn: lb ? lb.textContent.trim().slice(0, 30) : '' };
  }, sel);
}
async function swipeToTop(c, sel) {
  const H = c.page.viewportSize().height;
  for (let i = 0; i < 40; i++) { if (await ev(c, (s) => document.querySelector(s).scrollTop, sel) <= 0) break; await swipe(c, 420, H * 0.25, H * 0.55); }
  return ev(c, (s) => document.querySelector(s).scrollTop, sel);
}
// cuenta reconstrucciones del DOM de la sala (barra + lugares) durante `ms`
async function countLobbyRebuilds(c, ms) {
  await ev(c, () => { window.__rb = 0; window.__mo && window.__mo.disconnect(); window.__mo = new MutationObserver(ms => { for (const m of ms) if (m.type === 'childList' && (m.target.id === 'net-bar' || m.target.id === 'lobby-slots')) window.__rb++; });
    for (const id of ['net-bar', 'lobby-slots']) window.__mo.observe(document.getElementById(id), { childList: true }); });
  await sleep(ms);
  return ev(c, () => window.__rb);
}
const slotSkins = (c) => ev(c, () => [...document.querySelectorAll('#lobby-slots canvas.lobby-anim')].map(cv => ({ k: cv.dataset.classKey, skin: cv.dataset.skin })));
const toast = (c) => ev(c, () => (document.getElementById('net-toast') || {}).textContent || '');

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  // ================= JUGADOR A: crea la sala =================
  const A = await client(browser, HOST_MODE === 'mobile', 'Ana', 'mago');
  await press(A, '#title-continue-btn'); await press(A, '#mainmenu-jugar-btn'); await press(A, '#mode-arena-btn');
  await press(A, '.arena-card[data-arena="fortaleza"]'); await press(A, '#start-btn');
  await press(A, '#net-create-btn');
  for (let k = 0; k < 60; k++) { if (await ev(A, () => !!net.code)) break; await sleep(100); }
  await sleep(300);
  const code = await ev(A, () => net.code);
  const shown = await ev(A, () => { const e = document.getElementById('net-room-code'); return e ? e.textContent : null; });
  check('codigo.visible_al_crear', /^[A-Z2-9]{6}$/.test(code || '') && shown === code, { code, shown });
  await press(A, '#net-copy-code-btn');
  const clip = await ev(A, () => navigator.clipboard.readText().catch(e => 'ERR ' + e.message));
  check('codigo.copiar_codigo', clip === code, { clip });
  const link = await ev(A, () => ({ has: !!document.getElementById('net-copy-btn'), url: netInviteUrl() }));
  check('enlace.sigue_disponible', link.has && link.url.includes('room=' + code), link);

  // ================= JUGADOR B (celular): abre el juego por su cuenta =================
  const B = await client(browser, true, 'Beto', 'musashi');
  await press(B, '#title-continue-btn'); await press(B, '#mainmenu-jugar-btn');
  check('codigo.tarjeta_en_modos', await B.page.isVisible('#mode-join-card') && await B.page.isVisible('#mode-join-btn'));
  const tryCode = async (txt) => { await B.page.fill('#mode-join-code', txt); await press(B, '#mode-join-btn'); await sleep(900); return ev(B, () => ({ msg: document.getElementById('mode-join-status').textContent, state })); };
  let r = await tryCode('QKL');
  check('codigo.valida_largo', /6 caracteres/.test(r.msg) && r.state === 'modeselect', r);
  r = await tryCode('QKL5O1');
  check('codigo.valida_caracteres', /no usan O, 0, I ni 1/.test(r.msg), r);
  r = await tryCode('ZZZZ22');
  check('codigo.sala_inexistente', /No existe ninguna sala/.test(r.msg) && r.state === 'modeselect', r);
  // sala llena: 3 clientes crudos ocupan los lugares 2-4
  const build = await ev(A, () => NET_CONFIG.build);
  const raws = [];
  for (let i = 0; i < 3; i++) {
    const ws = new WebSocket(RELAY); await new Promise(res => ws.on('open', res));
    ws.send(JSON.stringify({ t: 'join', protocol: 1, build, code, champ: ['tanque', 'soporte', 'axiom'][i], level: 5, name: 'Relleno' + i, clientId: 'raw' + i + Date.now() }));
    raws.push(ws);
  }
  await sleep(700);
  r = await tryCode(code);
  check('codigo.sala_llena', /SALA COMPLETA/.test(r.msg) && r.state === 'modeselect', r);
  for (const ws of raws) { ws.send(JSON.stringify({ t: 'leave' })); ws.close(); }
  await sleep(900);
  // código bien, en minúsculas y con un espacio: se normaliza
  await B.page.fill('#mode-join-code', code.slice(0, 3).toLowerCase() + ' ' + code.slice(3).toLowerCase());
  await press(B, '#mode-join-btn');
  for (let k = 0; k < 60; k++) { if (await ev(B, () => net.role === 'guest' && state === 'prep')) break; await sleep(100); }
  await sleep(800);
  const joined = await ev(B, () => ({ role: net.role, state, code: net.code, champ: selectedClass }));
  check('codigo.union_ok', joined.role === 'guest' && joined.state === 'prep' && joined.code === code, joined);
  const aSees = await ev(A, () => netHumanCount());
  check('sala.anfitrion_ve_al_invitado', aSees === 2, { aSees });

  // ================= sala estable (sin bucle de re-render) =================
  const rbB = await countLobbyRebuilds(B, 3000), rbA = await countLobbyRebuilds(A, 3000);
  check('sala.sin_bucle_de_render', rbB === 0 && rbA === 0, { rbB, rbA });

  // ================= scroll táctil del invitado =================
  const sb = await swipeToBottom(B, '#prep-screen');
  check('scroll.sala_invitado_hasta_abajo', sb.atEnd && sb.lastBtnVisible && sb.scrolled > 0, sb);
  check('scroll.sala_invitado_vuelve_arriba', (await swipeToTop(B, '#prep-screen')) === 0);
  // tocar un botón después de scrollear (pestaña Talentos) responde
  await B.page.evaluate(() => document.querySelector('#prep-tabs [data-tab="talentos"]').scrollIntoView({ block: 'center' }));
  await sleep(200);
  await press(B, '#prep-tabs [data-tab="talentos"]');
  check('scroll.toque_tras_scroll_funciona', await B.page.isVisible('#prep-talents-panel'));
  const sbt = await swipeToBottom(B, '#prep-screen');
  check('scroll.talentos_hasta_abajo', sbt.atEnd, sbt);
  await swipeToTop(B, '#prep-screen');
  await B.page.evaluate(() => document.querySelector('#prep-tabs [data-tab="equipo"]').scrollIntoView({ block: 'center' })); await sleep(200);
  await press(B, '#prep-tabs [data-tab="equipo"]');
  if (OUT) await B.page.screenshot({ path: OUT + '/B_sala.png' });

  // ================= B compra una skin en la Sala: se autoequipa =================
  check('skin.b_sin_skin_al_inicio', (await ev(B, () => champSkinId('musashi'))) === null);
  await B.page.evaluate(() => document.querySelector('[data-prep-skin-buy="errante"]').scrollIntoView({ block: 'center' })); await sleep(250);
  await press(B, '[data-prep-skin-buy="errante"]');
  await sleep(600);
  const bT = await toast(B);
  const bSkin = await ev(B, () => ({ id: champSkinId('musashi'), chip: (document.querySelector('.prep-skin.on .prep-skin-name') || {}).textContent || '',
    saved: (() => { try { const s = JSON.parse(localStorage.getItem('laHordaSave_v1')); const eq = s.champions.musashi.equipment; return Object.values(eq).filter(u => s.stash.find(it => it.uid === u && it.set === 'errante')).length; } catch (e) { return 'ERR ' + e.message; } })() }));
  check('skin.autoequipada_al_comprar', bSkin.id === 'errante', bSkin);
  check('skin.feedback_skin_equipada', /SKIN EQUIPADA/.test(bT), { bT });
  check('skin.guardada_al_instante', typeof bSkin.saved === 'number' && bSkin.saved >= 4, bSkin);
  await sleep(900);
  let bSlots = await slotSkins(B);
  check('skin.preview_propia_actualizada', bSlots.some(s => s.k === 'musashi' && s.skin === 'errante') && /Samurái/.test(bSkin.chip), { bSlots, chip: bSkin.chip });
  let aSlots = await slotSkins(A);
  check('skin.anfitrion_ve_skin_del_invitado', aSlots.some(s => s.k === 'musashi' && s.skin === 'errante'), aSlots);

  // ================= A compra SU skin desde la Tienda (abierta desde la Sala) =================
  await A.page.evaluate(() => document.querySelector('[data-prep-shop]').scrollIntoView({ block: 'center' })); await sleep(200);
  await press(A, '[data-prep-shop]');
  check('pantalla.tienda_desde_sala', await ev(A, () => state === 'shop' && shopTab === 'skins'));
  await press(A, '[data-skin-buy="convergencia"]');
  await sleep(500);
  const aT = await toast(A);
  const aSkin = await ev(A, () => champSkinId('mago'));
  check('skin.tienda_autoequipa', aSkin === 'convergencia' && /SKIN EQUIPADA/.test(aT), { aSkin, aT });
  const card = await ev(A, () => (document.querySelector('[data-skin-card="convergencia"] .shop-st') || {}).textContent || '');
  check('skin.tienda_muestra_equipada', /EQUIPADA en Mago/.test(card), { card });
  await press(A, '#shop-back-btn');
  check('pantalla.vuelve_a_la_sala', await ev(A, () => state === 'prep' && netInRoom()));
  await sleep(1200);
  bSlots = await slotSkins(B); aSlots = await slotSkins(A);
  check('skin.invitado_ve_skin_del_anfitrion', bSlots.some(s => s.k === 'mago' && s.skin === 'convergencia'), bSlots);
  check('skin.cada_uno_la_suya', bSlots.some(s => s.k === 'musashi' && s.skin === 'errante') && aSlots.some(s => s.k === 'mago' && s.skin === 'convergencia'), { aSlots, bSlots });
  const cross = { aHasErrante: await ev(A, () => champSkinId('musashi')), bHasConv: await ev(B, () => champSkinId('mago')) };
  check('skin.no_pisa_la_del_otro', cross.aHasErrante === null && cross.bHasConv === null, cross);

  // ================= cambiar de pantalla y volver (invitado) =================
  await B.page.evaluate(() => document.querySelector('[data-prep-shop]').scrollIntoView({ block: 'center' })); await sleep(200);
  await press(B, '[data-prep-shop]');
  const sbs = await swipeToBottom(B, '#shop-screen');
  check('scroll.tienda_celular_hasta_abajo', sbs.atEnd && sbs.lastBtnVisible, sbs);
  await swipeToTop(B, '#shop-screen');
  await press(B, '#shop-back-btn');
  await sleep(600);
  const back = await ev(B, () => ({ state, room: netInRoom(), skin: champSkinId('musashi') }));
  check('pantalla.invitado_vuelve_con_su_skin', back.state === 'prep' && back.room && back.skin === 'errante', back);

  // ================= enlace de invitación (sistema anterior) =================
  const C = await client(browser, true, 'Caro', 'soporte', `${SITE}/index.html?room=${code}&server=${encodeURIComponent(RELAY)}`);
  for (let k = 0; k < 50; k++) { if (await ev(C, () => !document.getElementById('title-join-btn').disabled)) break; await sleep(100); }
  await press(C, '#title-join-btn');
  for (let k = 0; k < 60; k++) { if (await ev(C, () => net.role === 'guest' && state === 'prep')) break; await sleep(100); }
  check('enlace.union_por_enlace', await ev(C, () => net.role === 'guest' && state === 'prep' && net.code) === code);
  await sleep(800);
  const cSlots = await slotSkins(C);
  check('skin.recien_llegado_ve_skins', cSlots.some(s => s.k === 'musashi' && s.skin === 'errante') && cSlots.some(s => s.k === 'mago' && s.skin === 'convergencia') && cSlots.some(s => s.k === 'soporte' && s.skin === ''), cSlots);
  await ev(C, () => { netLeaveRoom(); setState('mainmenu'); renderMainMenu(); });
  await sleep(800);

  // ================= partida: la skin de cada uno en juego =================
  await ev(B, () => { document.getElementById('net-ready-btn').click(); });
  await sleep(600);
  await ev(A, () => netHostStartGame());
  for (let k = 0; k < 80; k++) { if (await ev(B, () => state === 'playing') && await ev(A, () => state === 'playing')) break; await sleep(150); }
  await sleep(2500);
  const inHost = await ev(A, () => heroes.map(h => ({ k: h.classKey, skin: h.skinSet || null, act: (activeSetSkin(h) || {}).name || null })));
  check('partida.anfitrion_dibuja_ambas_skins', inHost.some(h => h.k === 'mago' && h.skin === 'convergencia') && inHost.some(h => h.k === 'musashi' && h.skin === 'errante'), inHost);
  const inGuest = await ev(B, () => heroes.map(h => ({ k: h.classKey, act: (activeSetSkin(h) || {}).name || null })));
  check('partida.invitado_dibuja_ambas_skins', inGuest.some(h => h.k === 'mago' && /Arcano/.test(h.act || '')) && inGuest.some(h => h.k === 'musashi' && /Samurái/.test(h.act || '')), inGuest);
  // cae y lo reviven: sigue con su skin
  const rev = await ev(A, () => { const h = heroes.find(x => x.classKey === 'musashi'); h.alive = false; h.hp = 0; reviveHero(h, player); return new Promise(res => setTimeout(() => res({ alive: h.alive, skin: h.skinSet }), 600)); });
  check('partida.revivir_conserva_skin', rev.alive && rev.skin === 'errante', rev);
  // reconexión del invitado en plena partida
  await ev(B, () => { try { net.ws.close(); } catch (e) {} });
  for (let k = 0; k < 120; k++) { await sleep(150); if (await ev(B, () => net.status === 'open' && net.role === 'guest' && state === 'playing')) break; }
  await sleep(2500);
  const afterRe = { guest: await ev(B, () => ({ st: net.status, role: net.role, state, skins: heroes.map(h => ({ k: h.classKey, act: (activeSetSkin(h) || {}).name || null })) })),
    host: await ev(A, () => heroes.filter(h => h.classKey === 'musashi').map(h => h.skinSet)) };
  check('reconexion.vuelve_a_la_partida', afterRe.guest.role === 'guest' && afterRe.guest.state === 'playing', afterRe.guest);
  check('reconexion.conserva_skins', afterRe.host[0] === 'errante' && afterRe.guest.skins.some(h => h.k === 'mago' && /Arcano/.test(h.act || '')) && afterRe.guest.skins.some(h => h.k === 'musashi' && /Samurái/.test(h.act || '')), afterRe);
  if (OUT) { await B.page.screenshot({ path: OUT + '/B_partida.png' }); await A.page.screenshot({ path: OUT + '/A_partida.png' }); }

  // ================= persistencia: el invitado cierra y vuelve a abrir el juego =================
  await ev(B, () => { netLeaveRoom(); });
  await B.page.reload(); for (let k = 0; k < 300; k++) { if (await ev(B, () => { const b = document.getElementById('title-continue-btn'); return b && !b.disabled; })) break; await sleep(100); }
  check('persistencia.skin_tras_recargar', (await ev(B, () => champSkinId('musashi'))) === 'errante');

  // ================= scroll táctil en otras pantallas del celular =================
  await press(B, '#title-continue-btn');
  const screens = [
    ['tienda_objetos', () => { shopTab = 'objetos'; setState('shop'); renderShop(); }, '#shop-screen'],
    ['tienda_campeones', () => { shopTab = 'campeones'; setState('shop'); renderShop(); }, '#shop-screen'],
    ['mi_inventario', () => { openMyInventory('objetos'); }, '#inventory-screen'],
    ['eleccion_de_campeon', () => { setState('menu'); renderChampGrid(); renderSaveLine(); }, '#menu-screen'],
    ['modos_de_juego', () => { setState('modeselect'); netRenderModeJoin(); }, '#modeselect-screen'],
  ];
  for (const [n, open, sel] of screens) {
    await ev(B, open); await sleep(500);
    const res = await swipeToBottom(B, sel);
    check('scroll.' + n, res.atEnd && res.lastBtnVisible, res);
    await swipeToTop(B, sel);
  }
  // ficha de objeto (modal) desde la tienda: su panel también scrollea
  await ev(B, () => { shopTab = 'objetos'; shopCat = 'legendario'; setState('shop'); renderShop(); });
  await sleep(300);
  await ev(B, () => document.querySelector('.shop-item').click()); await sleep(400);
  const modal = await swipeToBottom(B, '#item-preview .ip-panel', 422);
  check('scroll.ficha_de_objeto_modal', modal.atEnd && modal.lastBtnVisible, modal);

  const errs = [...A.errors, ...B.errors, ...C.errors];
  check('sin_errores_js', errs.length === 0, errs.slice(0, 5));
  console.log(fails ? `FAILS ${fails}` : 'OK');
  await browser.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
