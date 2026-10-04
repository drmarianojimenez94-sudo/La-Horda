// LA HORDA — el juego nuevo contra un SERVIDOR VIEJO (el de Render/Fondal puede quedar sin actualizar).
//   v0 = relay de antes de las cuentas (commit 3bb85e4): sin /api (ni cuentas, ni ranking, ni salas
//        abiertas) y sin {t:"trade"}. Sus 404 no traen permiso CORS: pedirlos = error rojo en la consola.
//   v1 = relay con cuentas pero sin salas abiertas, ranking ni intercambio (commit 3c5156a).
// Lo que se exige: carteles claros ("todavía no está disponible en el servidor"), nada de "No existe." ni
// "sin conexión" engañosos, ningún error de JavaScript ni de CORS en la consola, ningún botón que no hace
// nada (la oferta de intercambio no queda colgada) y que crear sala / unirse / jugar siga andando.
//
// uso: SITE=http://127.0.0.1:8903 RELAY_PORT=8928 node tools/net-test/old_server.js
//   (levanta los relays viejos sacándolos del historial de git, en RELAY_PORT y RELAY_PORT+1)
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const path = require('path'), fs = require('fs'), os = require('os'), { spawn, execFileSync } = require('child_process');
const SITE = process.env.SITE || 'http://127.0.0.1:8771';
const PORT0 = parseInt(process.env.RELAY_PORT || '8928', 10);
const REPO = path.join(__dirname, '../..');
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0;
const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 400) : '')); if (!ok) fails++; };
const PHONE = { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };
const VERSIONS = { v0: { commit: '3bb85e4', files: ['relay.js'] }, v1: { commit: '3c5156a', files: ['relay.js', 'accounts.js'] } };
const procs = [];
function nodePath() {
  const cands = [process.env.NODE_PATH, path.join(REPO, 'server/node_modules'), '/home/user/La-Horda/server/node_modules'].filter(Boolean);
  return cands.find(p => fs.existsSync(path.join(p, 'ws'))) || cands[0];
}
async function startOld(ver, port) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'horda-old-' + ver + '-'));
  for (const f of VERSIONS[ver].files) fs.writeFileSync(path.join(dir, f), execFileSync('git', ['-C', REPO, 'show', `${VERSIONS[ver].commit}:server/${f}`]));
  const env = Object.assign({}, process.env, { PORT: String(port), DATA_DIR: path.join(dir, 'data'), DATABASE_URL: '', NODE_PATH: nodePath() });
  const cp = spawn(process.execPath, [path.join(dir, 'relay.js')], { env, stdio: 'ignore' });
  procs.push({ cp, dir });
  for (let k = 0; k < 100; k++) { try { const r = await fetch(`http://127.0.0.1:${port}/health`); if (r.ok) break; } catch (e) {} await sleep(100); }
}
const ev = (c, fn, a) => c.page.evaluate(fn, a);
async function waitFor(c, fn, arg, ms = 10000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await ev(c, fn, arg).catch(() => false)) return true; await sleep(150); } return false; }
async function client(browser, name, champ, relay) {
  const ctx = await browser.newContext(PHONE);
  await ctx.addInitScript(([n]) => { try { if (!localStorage.getItem('__s')) { localStorage.clear(); localStorage.setItem('__s', '1'); localStorage.setItem('horda_name', n); } } catch (e) {} }, [name]);
  await ctx.addInitScript(() => { window.__autoConfirm = true; });
  const page = await ctx.newPage();
  const errors = [], consoleErr = [];
  page.on('pageerror', e => errors.push(e.message));
  // "Failed to load resource" = el navegador anotando un 404 de un servidor que SÍ manda CORS (v1): no es
  // un error del juego. Lo de CORS ("blocked by CORS policy") sí cuenta: significa que se pidió algo que
  // el servidor viejo no tiene.
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|WebSocket connection/.test(m.text())) consoleErr.push(m.text()); });
  page.on('dialog', d => d.accept());
  await page.goto(`${SITE}/index.html?server=${encodeURIComponent(relay)}`, { timeout: 300000 });
  const c = { ctx, page, errors, consoleErr, name };
  await waitFor(c, () => { const b = document.getElementById('title-continue-btn'); return typeof setState === 'function' && !!b && !b.disabled; }, null, 180000);
  await ev(c, ([k]) => {
    for (const q in save.champions) { save.champions[q].level = 10; save.champions[q].unlocked = true; }
    save.starterChosen = true; selectedClass = k; save.lastChamp = k;
    save.arenasCleared = save.arenasCleared || {}; save.arenasCleared.ciudad = true; persistNow();
    document.getElementById('title-continue-btn').click();
  }, [champ]);
  await sleep(600);
  return c;
}
const toPrep = (c) => ev(c, () => { currentArena = 'ciudad'; setState('prep'); renderPrepSummary(); });

async function suite(browser, ver, port) {
  const relay = 'ws://127.0.0.1:' + port;
  await startOld(ver, port);
  const A = await client(browser, 'Ana' + ver, 'mago', relay);
  const B = await client(browser, 'Beto' + ver, 'tanque', relay);
  await waitFor(A, () => netCaps.api !== null, null, 15000);
  const api = await ev(A, () => netCaps.api);
  check(ver + '.detecta_version', api === (ver !== 'v0'), { api, esperado: ver !== 'v0' });
  // MULTIJUGADOR → salas abiertas
  await ev(A, () => { setState('modeselect'); netRefreshRooms(); });
  await waitFor(A, () => netRooms.unsupported || (netRooms.list && !netRooms.busy), null, 15000);
  const rs = await ev(A, () => (document.getElementById('mode-rooms-status') || {}).textContent || '');
  check(ver + '.salas_abiertas_aviso_claro', /todavía no están disponibles en el servidor/.test(rs), rs);
  // ranking
  await ev(A, () => lbOpen({ guardian: '' }));
  await waitFor(A, () => !__lb.loading, null, 30000);
  const lbt = await ev(A, () => (document.querySelector('#lb-screen .lb-empty') || {}).textContent || '');
  check(ver + '.ranking_aviso_claro', /todavía no está disponible en el servidor/.test(lbt) && !/No existe/.test(lbt), lbt);
  await ev(A, () => lbClose());
  // cuentas
  await ev(A, () => window.accountOpen());
  await sleep(ver === 'v0' ? 2500 : 1500);
  const acc = await ev(A, () => { const s = document.querySelector('#account-screen .acc-status, .acc-status'); const sub = document.getElementById('acc-submit'); return { txt: s ? s.textContent : '', disabled: sub ? sub.disabled : null }; });
  if (ver === 'v0') check(ver + '.cuentas_aviso_claro', /cuentas todavía no están disponibles/.test(acc.txt) && acc.disabled === true, acc);
  else check(ver + '.cuentas_andan', !/todavía no están disponibles/.test(acc.txt) && acc.disabled === false, acc);
  await ev(A, () => { const b = document.getElementById('acc-guest-btn'); if (b) b.click(); });
  await sleep(400);
  // sala + intercambio
  await toPrep(A); await toPrep(B);
  await ev(A, () => { if (typeof prepSecReveal === 'function') prepSecReveal('#net-create-btn'); document.getElementById('net-create-btn').click(); });
  await waitFor(A, () => !!net.code, null, 20000);
  const code = await ev(A, () => net.code);
  check(ver + '.crea_sala', !!code, code);
  await ev(B, (cd) => { if (typeof prepSecReveal === 'function') prepSecReveal('#net-join-code'); document.getElementById('net-join-code').value = cd; document.getElementById('net-join-btn').click(); }, code);
  check(ver + '.amigo_entra', await waitFor(B, () => net.role === 'guest' && !!net.room, null, 20000));
  await waitFor(A, () => netHumanCount() === 2, null, 5000);
  const offered = await ev(A, () => { const it = makeItem('arma', 'raro', 'mago'); stashItems().push(it); persistNow(); return netTradeOffer(1, it.uid); });
  check(ver + '.oferta_enviada', offered && offered.ok, offered);
  const gaveUp = await waitFor(A, () => !netTrade.out, null, 12000);
  const tr = await ev(A, () => ({ toast: (document.getElementById('net-toast') || {}).textContent || '', box: (document.getElementById('net-trade') || {}).textContent || '', unsupported: netTrade.unsupported, esc: Object.keys(save.trades && save.trades.esc || {}).length }));
  check(ver + '.intercambio_no_queda_colgado', gaveUp && tr.unsupported && tr.esc === 0, tr);
  check(ver + '.intercambio_aviso_claro', /intercambio todavía no está disponible/.test(tr.toast + tr.box), tr);
  // y se juega
  await ev(B, () => netSend({ t: 'update', ready: true }));
  await sleep(500);
  await ev(A, () => document.getElementById('prep-start-btn').click());
  const playing = await waitFor(A, () => state === 'playing', null, 30000) && await waitFor(B, () => state === 'playing', null, 40000);
  check(ver + '.partida_comienza', playing, [await ev(A, () => state), await ev(B, () => state)]);
  await sleep(2000);
  for (const c of [A, B]) check(ver + '.sin_errores_consola.' + c.name, c.errors.length === 0 && c.consoleErr.length === 0, c.errors.concat(c.consoleErr).slice(0, 4));
  await A.ctx.close(); await B.ctx.close();
}

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  await suite(browser, 'v0', PORT0);
  await suite(browser, 'v1', PORT0 + 1);
  console.log(`SUMMARY ${fails ? 'FAIL' : 'OK'} fails=${fails}`);
  await browser.close();
  for (const p of procs) { try { p.cp.kill(); } catch (e) {} try { fs.rmSync(p.dir, { recursive: true, force: true }); } catch (e) {} }
  process.exit(fails ? 1 : 0);
})().catch(e => { console.log('FAIL exception', e && e.stack); for (const p of procs) { try { p.cp.kill(); } catch (x) {} } process.exit(1); });
