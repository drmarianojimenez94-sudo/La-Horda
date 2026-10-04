// LA HORDA — SALAS PÚBLICAS: el anfitrión marca su sala como pública en la Sala (pestaña Sala online),
// otro jugador la ve en MULTIJUGADOR → Salas abiertas (arena, dificultad, jugadores/4, nivel, anfitrión)
// y entra con UN toque; el hub dice cuántas hay; privada, llena o empezada ya no se lista; un cliente
// viejo (sin "public") sigue creando salas privadas y entrando por código.
// Clientes de Chromium INDEPENDIENTES (cada uno con su guardado y su WebSocket) contra el relay real.
//
// uso: SITE=http://127.0.0.1:8845 RELAY=ws://127.0.0.1:8855 node tools/net-test/public_rooms.js
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
let WebSocket;
try { WebSocket = require('ws'); } catch (e) { WebSocket = require(require('path').join(__dirname, '../../server/node_modules/ws')); }
const SITE = process.env.SITE || 'http://127.0.0.1:8771';
const RELAY = process.env.RELAY || 'ws://127.0.0.1:8799';
const SITE_ORIGIN = new URL(SITE).origin;
const HTTP = RELAY.replace(/^ws/, 'http');
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0;
const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 400) : '')); if (!ok) fails++; };
const PHONE = { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };
const DESK = { viewport: { width: 1000, height: 560 } };
const ev = (c, fn, a) => c.page.evaluate(fn, a);
async function waitFor(c, fn, arg, ms = 10000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await ev(c, fn, arg)) return true; await sleep(100); } return false; }

async function client(browser, mobile, name, champ, level) {
  const ctx = await browser.newContext(mobile ? PHONE : DESK);
  await ctx.addInitScript(([n]) => { try { if (!localStorage.getItem('__s')) { localStorage.clear(); localStorage.setItem('__s', '1'); localStorage.setItem('horda_name', n); } } catch (e) {} }, [name]);
  await ctx.addInitScript(() => { window.__autoConfirm = true; });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', d => d.accept());
  await page.goto(`${SITE}/index.html?server=${encodeURIComponent(RELAY)}`, { timeout: 120000 }); // máquina compartida: la carga puede tardar
  const c = { ctx, page, errors, name, mobile };
  await waitFor(c, () => { const b = document.getElementById('title-continue-btn'); return !!b && !b.disabled; }, null, 40000);
  await ev(c, ([k, lv]) => {
    for (const q in save.champions) save.champions[q].level = lv;
    save.champions[k].unlocked = true; save.starterChosen = true; save.tut = Object.assign(save.tut || {}, { training: 1 }); selectedClass = k; save.lastChamp = k;
    save.arenasCleared.ciudad = true; persistNow();
  }, [champ, level]);
  return c;
}
async function press(c, sel) {
  await c.page.evaluate(s => { if (typeof prepSecReveal === 'function') prepSecReveal(s); }, sel).catch(() => {});
  const el = await c.page.$(sel); if (!el) throw new Error('no existe ' + sel);
  await el.evaluate(e => e.scrollIntoView({ block: 'center' })); await sleep(120);
  if (c.mobile) { const b = await el.boundingBox(); await c.page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); } else await el.click();
  await sleep(400);
}
const rows = (c) => ev(c, () => [...document.querySelectorAll('#mode-rooms-list .mr-row')].map(r => ({ code: r.dataset.roomCode, txt: r.textContent.replace(/\s+/g, ' ').trim() })));
const httpRooms = () => fetch(HTTP + '/api/rooms').then(r => r.json());

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  // ================= A: crea una sala PÚBLICA desde la Sala =================
  const A = await client(browser, false, 'Ana', 'mago', 14);
  await press(A, '#title-continue-btn'); await press(A, '#mainmenu-jugar-btn'); await press(A, '#mode-arena-btn');
  await press(A, '.arena-card[data-arena="fortaleza"]'); await press(A, '#start-btn');
  await press(A, '[data-prep-sec="online"]');
  check('sala.casilla_publica_visible', await A.page.isVisible('#net-public-chk'));
  check('sala.privada_por_defecto', await ev(A, () => !document.getElementById('net-public-chk').checked));
  await press(A, '#net-public-chk');
  await press(A, '#net-create-btn');
  await waitFor(A, () => !!net.code && net.room && net.room.pub);
  const code = await ev(A, () => net.code);
  const pubBtn = await ev(A, () => { const b = document.getElementById('net-public-btn'); return b ? b.textContent.trim() : null; });
  check('sala.creada_publica', /^[A-Z2-9]{6}$/.test(code || '') && /PÚBLICA/.test(pubBtn || ''), { code, pubBtn });
  let list = await httpRooms();
  check('relay.lista_la_sala', list.rooms.some(r => r.code === code && r.arena === 'fortaleza' && r.host === 'Ana' && r.humans === 1 && r.lvMin === 14), list);

  // ================= B (celular): la ve en MULTIJUGADOR y entra con un toque =================
  const B = await client(browser, true, 'Beto', 'musashi', 22);
  await press(B, '#title-continue-btn');
  // el hub cuenta las salas abiertas
  const hubOk = await waitFor(B, () => /1 sala abierta/.test((document.querySelector('#mainmenu-jugar-btn .hub-tile-sub') || {}).textContent || ''), null, 6000);
  check('hub.cuenta_salas_abiertas', hubOk, await ev(B, () => document.querySelector('#mainmenu-jugar-btn .hub-tile-sub').textContent));
  await press(B, '#mainmenu-jugar-btn');
  await waitFor(B, () => document.querySelectorAll('#mode-rooms-list .mr-row').length > 0, null, 8000);
  let r = await rows(B);
  const row = r.find(x => x.code === code) || {};
  check('modos.lista_salas_abiertas', !!row.code, r);
  check('modos.fila_con_datos', /Fábrica Sin Fin/.test(row.txt || '') && /Normal/.test(row.txt || '') && /Ana/.test(row.txt || '') && /1\/4/.test(row.txt || '') && /Nv\. 14/.test(row.txt || ''), row);
  check('modos.lista_visible_en_celular', await B.page.isVisible(`[data-room-join="${code}"]`));
  await press(B, `[data-room-join="${code}"]`);
  await waitFor(B, () => net.role === 'guest' && state === 'prep', null, 12000);
  const bj = await ev(B, () => ({ role: net.role, code: net.code, state, arena: currentArena }));
  check('modos.unirse_con_un_toque', bj.role === 'guest' && bj.code === code && bj.state === 'prep' && bj.arena === 'fortaleza', bj);
  await waitFor(A, () => netHumanCount() === 2);
  await sleep(1200);
  list = await httpRooms();
  const e2 = list.rooms.find(x => x.code === code) || {};
  check('relay.rango_de_nivel', e2.humans === 2 && e2.lvMin === 14 && e2.lvMax === 22, e2);

  // ================= C: en Multijugador; la lista se refresca sola =================
  const C = await client(browser, false, 'Caro', 'soporte', 5);
  await press(C, '#title-continue-btn'); await press(C, '#mainmenu-jugar-btn');
  await waitFor(C, () => document.querySelectorAll('#mode-rooms-list .mr-row').length > 0, null, 8000);
  check('refresco.c_ve_2_de_4', /2\/4/.test(((await rows(C)).find(x => x.code === code) || {}).txt || ''));
  // A la hace privada: desaparece de la lista de C sin tocar nada (refresco automático)
  await press(A, '#net-public-btn');
  await waitFor(A, () => net.room && !net.room.pub);
  const gone = await waitFor(C, (cd) => !document.querySelector(`#mode-rooms-list [data-room-code="${cd}"]`), code, 12000);
  const st = await ev(C, () => document.getElementById('mode-rooms-status').textContent);
  check('refresco.privada_desaparece_sola', gone && /No hay salas públicas/.test(st), { st });
  // vuelve a pública: aparece con ↻
  await press(A, '#net-public-btn');
  await waitFor(A, () => net.room && net.room.pub);
  await sleep(1100);
  await press(C, '#mode-rooms-refresh');
  await waitFor(C, (cd) => !!document.querySelector(`#mode-rooms-list [data-room-code="${cd}"]`), code, 5000);
  check('refresco.boton_actualizar', !!(await rows(C)).find(x => x.code === code));

  // ================= cliente VIEJO: crea sin "public" (privada) y entra por código a una pública =================
  const build = await ev(A, () => NET_CONFIG.build);
  const old = new WebSocket(RELAY, { origin: SITE_ORIGIN }); await new Promise(res => old.on('open', res));
  const inbox = []; old.on('message', b => inbox.push(JSON.parse(b.toString())));
  old.send(JSON.stringify({ t: 'create', protocol: 1, build, arena: 'bosque', champ: 'tanque', level: 3, name: 'Viejo', clientId: 'old' + Date.now() }));
  await sleep(500);
  const oldRoom = (inbox.find(m => m.t === 'joined') || {}).room || {};
  await sleep(1100);
  list = await httpRooms();
  check('viejo.su_sala_queda_privada', !!oldRoom.code && !list.rooms.some(x => x.code === oldRoom.code), { old: oldRoom.code });
  old.send(JSON.stringify({ t: 'leave' }));
  const old2 = new WebSocket(RELAY, { origin: SITE_ORIGIN }); await new Promise(res => old2.on('open', res));
  const inbox2 = []; old2.on('message', b => inbox2.push(JSON.parse(b.toString())));
  old2.send(JSON.stringify({ t: 'join', protocol: 1, build, code, champ: 'tanque', level: 3, name: 'Viejo2', clientId: 'old2' + Date.now() }));
  await sleep(700);
  const j2 = inbox2.find(m => m.t === 'joined');
  check('viejo.entra_por_codigo_a_una_publica', !!j2 && j2.slot === 2, inbox2.map(m => m.t));
  // ================= llena: 4/4 no se lista =================
  const old3 = new WebSocket(RELAY, { origin: SITE_ORIGIN }); await new Promise(res => old3.on('open', res));
  old3.send(JSON.stringify({ t: 'join', protocol: 1, build, code, champ: 'axiom', level: 3, name: 'Viejo3', clientId: 'old3' + Date.now() }));
  await sleep(1300);
  list = await httpRooms();
  check('llena.no_se_lista', !list.rooms.some(x => x.code === code), list);
  for (const w of [old2, old3]) { w.send(JSON.stringify({ t: 'leave' })); w.close(); }
  old.close();
  await sleep(1300);
  check('llena.vuelve_al_liberarse', (await httpRooms()).rooms.some(x => x.code === code));

  // ================= empezada: no se lista; un toque sobre una fila vieja avisa sin romper =================
  await ev(B, () => document.getElementById('net-ready-btn').click()); await sleep(400);
  await ev(A, () => netHostStartGame());
  await waitFor(A, () => state === 'playing', null, 15000);
  await sleep(1300);
  check('empezada.no_se_lista', !(await httpRooms()).rooms.some(x => x.code === code));
  // C todavía tiene la fila (la lista es de hace unos segundos): toca UNIRSE -> aviso claro y la lista se pone al día
  const stale = await ev(C, (cd) => !!document.querySelector(`[data-room-join="${cd}"]`), code);
  if (stale) {
    await press(C, `[data-room-join="${code}"]`);
    await sleep(1500);
    const cs = await ev(C, () => ({ state, role: net.role, msg: document.getElementById('mode-join-status').textContent }));
    check('empezada.toque_tardio_avisa', cs.state === 'modeselect' && !cs.role && /ya comenzó/.test(cs.msg), cs);
  } else check('empezada.toque_tardio_avisa', true, 'la lista ya estaba al día');
  await waitFor(C, (cd) => !document.querySelector(`[data-room-join="${cd}"]`), code, 10000);
  check('empezada.desaparece_de_la_lista', !(await rows(C)).some(x => x.code === code));

  // ================= límite de pedidos (HTTP, por IP) =================
  let last = 0; for (let i = 0; i < 40; i++) last = (await fetch(HTTP + '/api/rooms')).status;
  check('relay.limite_de_pedidos', last === 429, last);

  const errs = [...A.errors, ...B.errors, ...C.errors];
  check('sin_errores_js', errs.length === 0, errs.slice(0, 5));
  console.log(fails ? `FAILS ${fails}` : 'OK');
  await browser.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
