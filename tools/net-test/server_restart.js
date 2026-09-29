// LA HORDA — el servidor como se porta en RENDER PLAN GRATIS (alfa en la Comic Con):
//   1) DORMIDO: la primera conexión queda "colgada" ~N s mientras despierta (Render retiene el pedido,
//      no lo rechaza). El jugador tiene que ver "Despertando el servidor… N s" y que termine solo.
//   2) SE REINICIA EN LA SALA: pierde la memoria (salas) y el disco. Anfitrión e invitado tienen que
//      recibir un aviso entendible y quedar en un lugar jugable (nunca una sala "fantasma"); después se
//      crea una sala nueva y el amigo entra con el código nuevo.
//   3) SE REINICIA EN PLENA PARTIDA: el anfitrión sigue jugando (sus amigos pasan a bots); el invitado ve
//      "Reconectando…" y, como la sala ya no existe, un cartel claro y el botón al menú (nada trabado).
//   4) El modo SOLO no depende del servidor: con el servidor caído se juega igual y sin errores.
// Clientes de Chromium INDEPENDIENTES en celular apaisado (844×390, táctil) contra el relay REAL, detrás
// de un proxy que imita a Render (retiene conexiones mientras el servidor "despierta").
//
// uso: SITE=http://127.0.0.1:8903 RELAY_PORT=8926 node tools/net-test/server_restart.js
//   (levanta su propio relay en RELAY_PORT+1 y el proxy en RELAY_PORT; WAKE_MS = demora al despertar)
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const net = require('net'), path = require('path'), fs = require('fs'), os = require('os'), { spawn } = require('child_process');
const SITE = process.env.SITE || 'http://127.0.0.1:8771';
const PROXY_PORT = parseInt(process.env.RELAY_PORT || '8926', 10);
const BACK_PORT = PROXY_PORT + 1;
const WAKE_MS = parseInt(process.env.WAKE_MS || '15000', 10);
const RELAY = 'ws://127.0.0.1:' + PROXY_PORT;
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0;
const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 400) : '')); if (!ok) fails++; };
const PHONE = { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };

/* ---------------- relay real + proxy "Render" ---------------- */
let relayCp = null, dataDir = null, backUp = false;
function startRelay() {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'horda-restart-')); // disco nuevo: Render sin disco persistente
  const env = Object.assign({}, process.env, { PORT: String(BACK_PORT), DATA_DIR: dataDir, DATABASE_URL: '' });
  relayCp = spawn(process.execPath, [path.join(__dirname, '../../server/relay.js')], { env, stdio: 'ignore' });
  return new Promise(res => {
    const t0 = Date.now();
    const probe = () => { const s = net.connect(BACK_PORT, '127.0.0.1', () => { s.destroy(); backUp = true; res(); }); s.on('error', () => { if (Date.now() - t0 < 10000) setTimeout(probe, 100); else res(); }); };
    probe();
  });
}
function killRelay() {
  backUp = false;
  if (relayCp) { try { relayCp.kill('SIGKILL'); } catch (e) {} relayCp = null; }
  if (dataDir) { try { fs.rmSync(dataDir, { recursive: true, force: true }); } catch (e) {} dataDir = null; }
}
// Como Render: mientras el servicio no está arriba, la conexión entrante queda esperando (no se rechaza).
const held = new Set(), live = new Set();
const proxy = net.createServer(sock => {
  sock.on('error', () => {});
  const buf = [];
  const onData = d => buf.push(d);
  sock.on('data', onData);
  const t0 = Date.now();
  const go = () => {
    held.delete(go);
    if (sock.destroyed) return;
    const up = net.connect(BACK_PORT, '127.0.0.1');
    up.on('error', () => sock.destroy());
    up.on('connect', () => { sock.off('data', onData); for (const d of buf) up.write(d); sock.pipe(up); up.pipe(sock); });
    const pair = { sock, up }; live.add(pair);
    const end = () => { live.delete(pair); sock.destroy(); up.destroy(); };
    up.on('close', end); sock.on('close', end);
  };
  if (backUp) go();
  else { held.add(go); const wait = () => { if (sock.destroyed || !held.has(go)) return; if (backUp) go(); else if (Date.now() - t0 > 120000) sock.destroy(); else setTimeout(wait, 100); }; wait(); }
});
function dropAll() { for (const p of [...live]) { p.sock.destroy(); p.up.destroy(); } live.clear(); }
async function restartRelay(downMs) { killRelay(); dropAll(); await sleep(downMs); await startRelay(); }

/* ---------------- clientes ---------------- */
const ev = (c, fn, a) => c.page.evaluate(fn, a);
async function waitFor(c, fn, arg, ms = 10000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await ev(c, fn, arg).catch(() => false)) return true; await sleep(150); } return false; }
async function client(browser, name, champ, url) {
  const ctx = await browser.newContext(PHONE);
  await ctx.addInitScript(([n]) => { try { if (!localStorage.getItem('__s')) { localStorage.clear(); localStorage.setItem('__s', '1'); localStorage.setItem('horda_name', n); } } catch (e) {} }, [name]);
  await ctx.addInitScript(() => { window.__autoConfirm = true; });
  const page = await ctx.newPage();
  const errors = [], consoleErr = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_CONNECTION|WebSocket connection|net::|Failed to load resource/.test(m.text())) consoleErr.push(m.text()); });
  page.on('dialog', d => d.accept());
  await page.goto(url || `${SITE}/index.html?server=${encodeURIComponent(RELAY)}`, { timeout: 120000 });
  const c = { ctx, page, errors, consoleErr, name };
  await waitFor(c, () => { const b = document.getElementById('title-continue-btn'); return !!b && !b.disabled; }, null, 60000);
  await ev(c, ([k]) => {
    for (const q in save.champions) { save.champions[q].level = 10; save.champions[q].unlocked = true; }
    save.starterChosen = true; selectedClass = k; save.lastChamp = k;
    save.arenasCleared = save.arenasCleared || {}; save.arenasCleared.ciudad = true; persistNow();
  }, [champ]);
  return c;
}
async function tap(c, sel) {
  await c.page.evaluate(s => { if (typeof prepSecReveal === 'function') prepSecReveal(s); }, sel).catch(() => {});
  const el = await c.page.$(sel); if (!el) throw new Error('no existe ' + sel);
  await el.evaluate(e => e.scrollIntoView({ block: 'center' })); await sleep(120);
  const b = await el.boundingBox(); await c.page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
  await sleep(300);
}
async function toPrep(c) {
  await ev(c, () => { document.getElementById('title-continue-btn').click(); });
  await sleep(400);
  await ev(c, () => { currentArena = 'ciudad'; setState('prep'); renderPrepSummary(); });
  await sleep(300);
}
async function createRoom(c) {
  await tap(c, '#net-create-btn');
  await waitFor(c, () => !!net.code && net.role === 'host', null, 60000);
  return ev(c, () => net.code);
}
async function joinByCode(c, code) {
  await ev(c, (cd) => { if (typeof prepSecReveal === 'function') prepSecReveal('#net-join-code'); document.getElementById('net-join-code').value = cd; }, code);
  await tap(c, '#net-join-btn');
  return waitFor(c, () => net.role === 'guest' && !!net.room && state === 'prep', null, 30000);
}
const snap = (c) => ev(c, () => ({ state, role: net.role, code: net.code, room: !!net.room, ws: net.status, err: netLobby.lastError,
  toast: (document.getElementById('net-toast') || {}).textContent || '', match: !!netMatch, mrole: netMatch && netMatch.role,
  go: (document.getElementById('go-title') || {}).textContent || '', conn: (document.getElementById('net-conn') || { textContent: '' }).textContent,
  connShown: !!(document.getElementById('net-conn') && !document.getElementById('net-conn').classList.contains('hidden')) }));

(async () => {
  await new Promise(r => proxy.listen(PROXY_PORT, '127.0.0.1', r));
  const browser = await chromium.launch({ args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });

  // ================= 1) DORMIDO: la primera conexión queda retenida mientras despierta =================
  const A = await client(browser, 'Ana', 'mago');
  const B = await client(browser, 'Beto', 'tanque');
  await toPrep(A); await toPrep(B);
  const t0 = Date.now();
  setTimeout(() => { startRelay(); }, WAKE_MS); // Render tarda en despertar: el proxy retiene hasta entonces
  await tap(A, '#net-create-btn');
  const labels = new Set();
  for (let k = 0; k < 120; k++) {
    const s = await ev(A, () => ({ code: net.code, txt: (document.getElementById('net-create-btn') || {}).textContent || '', err: netLobby.lastError }));
    if (s.txt) labels.add(s.txt.replace(/\d+ s/, 'N s'));
    if (s.code || s.err) break;
    await sleep(500);
  }
  const code1 = await ev(A, () => net.code);
  check('dormido.crea_sala_al_despertar', !!code1, { code1, secs: Math.round((Date.now() - t0) / 1000), err: await ev(A, () => netLobby.lastError) });
  check('dormido.muestra_despertando', [...labels].some(l => /Despertando el servidor/.test(l)) && ![...labels].some(l => /No se pudo|Error/i.test(l)), [...labels]);
  check('dormido.b_se_une_con_codigo', await joinByCode(B, code1));
  await waitFor(A, () => netHumanCount() === 2, null, 5000);

  // ================= 2) REINICIO EN LA SALA =================
  await restartRelay(3000);
  const okA = await waitFor(A, () => !net.room && state === 'prep', null, 40000);
  const okB = await waitFor(B, () => !net.room && !net.role && (state === 'mainmenu' || state === 'prep'), null, 60000);
  const sA = await snap(A), sB = await snap(B);
  check('sala_reinicio.anfitrion_sin_sala_fantasma', okA, sA);
  check('sala_reinicio.anfitrion_aviso_claro', /servidor/i.test(sA.err) && /reinici|conexi/i.test(sA.err), sA.err);
  check('sala_reinicio.invitado_sin_sala_fantasma', okB, sB);
  check('sala_reinicio.invitado_aviso_claro', /servidor se reinici|sala ya no existe|se cerr/i.test(sB.toast + ' ' + sB.err), { toast: sB.toast, err: sB.err });
  check('sala_reinicio.sin_codigo_inexistente_confuso', !/Revisá que esté bien escrito/.test(sB.toast + sB.err), sB);
  // se vuelve a armar: sala nueva, código nuevo, el amigo entra
  if (sB.state !== 'prep') await ev(B, () => { currentArena = 'ciudad'; setState('prep'); renderPrepSummary(); });
  const code2 = await createRoom(A);
  check('sala_reinicio.crea_sala_nueva', !!code2 && code2 !== code1, { code1, code2 });
  check('sala_reinicio.amigo_entra_de_nuevo', await joinByCode(B, code2));
  await waitFor(A, () => netHumanCount() === 2, null, 5000);

  // ================= 3) REINICIO EN PLENA PARTIDA =================
  await ev(B, () => { netSend({ t: 'update', ready: true }); });
  await sleep(600);
  await ev(A, () => document.getElementById('prep-start-btn').click());
  const playing = await waitFor(A, () => state === 'playing', null, 15000) && await waitFor(B, () => state === 'playing' && netMatch && netMatch.role === 'guest', null, 30000);
  check('partida.comienza', playing, [await snap(A), await snap(B)]);
  await sleep(1500);
  await restartRelay(6000);
  // mientras el servidor está caído: el invitado ve "Reconectando…" (no una pantalla congelada muda)
  const sawReconnect = await waitFor(B, () => { const e = document.getElementById('net-conn'); return !!e && !e.classList.contains('hidden') && /Reconectando|conexión/i.test(e.textContent); }, null, 8000);
  check('partida_reinicio.invitado_ve_reconectando', sawReconnect, await snap(B));
  const hostOk = await waitFor(A, () => state === 'playing' && netMatch && netMatch.role === 'host-offline', null, 10000);
  check('partida_reinicio.anfitrion_sigue_jugando', hostOk, await snap(A));
  const guestEnd = await waitFor(B, () => state === 'gameover' && !netMatch, null, 90000);
  const eB = await snap(B);
  check('partida_reinicio.invitado_cartel_claro', guestEnd && /servidor/i.test(eB.go), eB);
  check('partida_reinicio.invitado_sin_overlay_colgado', !eB.connShown, eB);
  await tap(B, '#menu-btn-1');
  await sleep(500);
  const bMenu = await ev(B, () => state);
  check('partida_reinicio.invitado_vuelve_al_menu', bMenu === 'menu' || bMenu === 'mainmenu', bMenu);
  // el anfitrión termina la partida (sin servidor) y queda en un lugar jugable
  await ev(A, () => { for (const h of heroes) { h.hp = 0; h.alive = false; } });
  const aEnd = await waitFor(A, () => state === 'gameover' || state === 'victory', null, 30000);
  check('partida_reinicio.anfitrion_ve_resultados', aEnd, await snap(A));
  const retryTxt = await ev(A, () => (document.getElementById('retry-btn') || {}).textContent || '');
  await ev(A, () => document.getElementById('retry-btn').click());
  await sleep(800);
  const aAfter = await snap(A);
  check('partida_reinicio.anfitrion_despues_juega', ['playing', 'prep', 'menu', 'mainmenu'].includes(aAfter.state) && !aAfter.match || aAfter.mrole === 'host', { retryTxt, aAfter });

  // ================= 4) SOLO sin servidor =================
  killRelay(); dropAll();
  const C = await client(browser, 'Caro', 'soporte');
  await toPrep(C);
  await ev(C, () => document.getElementById('prep-start-btn').click());
  const soloOk = await waitFor(C, () => state === 'playing' && !netMatch, null, 20000);
  await sleep(3000);
  check('solo.sin_servidor_se_juega', soloOk && (await ev(C, () => state)) === 'playing', await snap(C));

  for (const c of [A, B, C]) check('errores.' + c.name, c.errors.length === 0 && c.consoleErr.length === 0, c.errors.concat(c.consoleErr).slice(0, 4));
  console.log(`SUMMARY ${fails ? 'FAIL' : 'OK'} fails=${fails}`);
  await browser.close(); killRelay(); proxy.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.log('FAIL exception', e && e.stack); killRelay(); process.exit(1); });
