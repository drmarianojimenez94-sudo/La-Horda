// PRE-ALFA: el servidor del multijugador "dormido" (plan gratuito). El relay arranca recién a los
// COLD_MS milisegundos: crear sala desde el teléfono A tiene que reintentar solo, mostrar
// "Despertando el servidor… N s" y terminar creando la sala; el teléfono B se une con el código.
//   (python3 -m http.server 8771 &) ; node tools/net-test/coldstart.js
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const { spawn } = require('child_process');
const path = require('path');
const SITE = process.env.SITE || 'http://127.0.0.1:8771';
const PORT = parseInt(process.env.COLD_PORT || '8797', 10);
const COLD_MS = parseInt(process.env.COLD_MS || '20000', 10);
const RELAY = `ws://127.0.0.1:${PORT}`;
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); if (!ok) fails++; };
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const phone = async (relayUrl) => {
    const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
    await ctx.addInitScript(() => { window.__campaignMode = true; });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(`${SITE}/index.html?server=${encodeURIComponent(relayUrl || RELAY)}`);
    for (let k = 0; k < 300; k++) { if (await p.evaluate(() => { const b = document.getElementById('title-continue-btn'); return b && !b.disabled; })) break; await sleep(100); }
    await p.evaluate(() => { save.starterChosen = true; save.champions.mago.unlocked = true; selectedClass = 'mago'; currentArena = 'ciudad'; setState('prep'); renderPrepSummary(); });
    return { p, errs };
  };
  const A = await phone();
  const t0 = Date.now();
  await A.p.evaluate(() => document.getElementById('net-create-btn').click());
  const labels = new Set();
  let relay = null;
  for (let k = 0; k < 130; k++) {
    await sleep(1000);
    if (!relay && Date.now() - t0 >= COLD_MS) relay = spawn(process.execPath, [path.join(__dirname, '../../server/relay.js')], { env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });
    const st = await A.p.evaluate(() => ({ code: net.code, txt: (document.getElementById('net-create-btn') || {}).textContent || '' }));
    if (st.txt) labels.add(st.txt.replace(/\d+ s/, 'N s'));
    if (st.code) break;
  }
  const codeA = await A.p.evaluate(() => net.code);
  check('A_crea_sala_despues_de_despertar', !!codeA, { code: codeA, secs: Math.round((Date.now() - t0) / 1000) });
  check('A_ve_despertando', [...labels].some(l => /Despertando el servidor/.test(l)), [...labels]);
  const B = await phone();
  await B.p.evaluate((c) => { document.getElementById('net-join-code').value = c; }, codeA || 'XXXXXX');
  await B.p.evaluate(() => document.getElementById('net-join-btn').click());
  for (let k = 0; k < 40 && !(await B.p.evaluate(() => net.code && net.role === 'guest')); k++) await sleep(250);
  const rb = await B.p.evaluate(() => ({ code: net.code, role: net.role }));
  check('B_se_une_con_codigo', rb.code === codeA && rb.role === 'guest', rb);
  await sleep(800);
  const humans = await A.p.evaluate(() => net.room ? net.room.slots.filter(s => s && s.connected).length : 0);
  check('A_ve_2_jugadores', humans === 2, humans);
  check('sin_errores', A.errs.length + B.errs.length === 0, A.errs.concat(B.errs).slice(0, 3));
  if (relay) relay.kill();
  // servidor que RECHAZA esta página (ALLOWED_ORIGINS sin este origen): antes el botón quedaba en
  // "Conectando…" sin ningún cartel. Ahora tiene que aparecer el motivo.
  const R2 = spawn(process.execPath, [path.join(__dirname, '../../server/relay.js')], { env: { ...process.env, PORT: String(PORT + 1), ALLOWED_ORIGINS: 'https://ejemplo.invalid' }, stdio: 'ignore' });
  await sleep(1200);
  const C = await phone(`ws://127.0.0.1:${PORT + 1}`);
  await C.p.evaluate(() => document.getElementById('net-create-btn').click());
  let rej = null;
  for (let k = 0; k < 60; k++) { await sleep(250); rej = await C.p.evaluate(() => ({ err: netLobby.lastError, toast: (document.getElementById('net-toast') || {}).textContent || '', btn: (document.getElementById('net-create-btn') || {}).textContent || '', code: net.code })); if (rej.err) break; }
  check('rechazo_muestra_motivo', /no acepta conexiones desde esta p/.test(rej.err) && /no acepta/.test(rej.toast), rej);
  check('rechazo_no_queda_colgado', !/Conectando|Despertando/.test(rej.btn) && !rej.code, rej.btn);
  R2.kill();
  await browser.close();
  console.log(`SUMMARY ${fails ? 'FAIL' : 'OK'} fails=${fails}`);
  process.exit(fails ? 1 : 0);
})();
