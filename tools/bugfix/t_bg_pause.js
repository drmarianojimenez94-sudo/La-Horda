// Celular: al cambiar de app (llamada, notificación) en plena partida SOLO, al volver el juego está en
// pausa. Antes seguía de golpe con la horda encima. En cooperativo no se pausa (la partida es de todos).
//   (python3 -m http.server 8771 &) ; node tools/bugfix/t_bg_pause.js
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const BASE = process.env.SE_BASE_URL || process.env.SITE || 'http://127.0.0.1:8771';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 400) : '')); if (!ok) fails++; };
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] });
  const p = await (await b.newContext({ viewport: { width: 844, height: 390 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(`${BASE}/index.html`, { timeout: 120000 });
  for (let k = 0; k < 1200; k++) { if (await p.evaluate(() => { const x = document.getElementById('title-continue-btn'); return x && !x.disabled; })) break; await sleep(100); }
  // simula que la pestaña/app pasa a segundo plano y vuelve
  const hide = (hidden) => p.evaluate(([h]) => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => h ? 'hidden' : 'visible' }); Object.defineProperty(document, 'hidden', { configurable: true, get: () => h }); document.dispatchEvent(new Event('visibilitychange')); }, [hidden]);
  await p.evaluate(() => { for (const k in save.champions) { save.champions[k].level = 10; save.champions[k].unlocked = true; } save.starterChosen = true; document.getElementById('title-continue-btn').click(); selectedClass = 'tanque'; currentArena = 'bosque'; startRun(1); });
  await sleep(800);
  await hide(true); await hide(false);
  const r = await p.evaluate(() => ({ st: state, pause: !document.getElementById('pause-screen').classList.contains('hidden') }));
  check('BG.solo_vuelve_en_pausa', r.st === 'paused' && r.pause, r);
  await p.evaluate(() => document.getElementById('resume-btn').click());
  const r2 = await p.evaluate(() => state);
  check('BG.reanudar_sigue_la_partida', r2 === 'playing', r2);
  // en el menú no hace nada
  await p.evaluate(() => { setState('menu'); });
  await hide(true); await hide(false);
  const r3 = await p.evaluate(() => state);
  check('BG.fuera_de_partida_no_toca_nada', r3 === 'menu', r3);
  check('BG.sin_errores', errs.length === 0, errs.slice(0, 3));
  await b.close();
  console.log('SUMMARY ' + (fails ? 'FAIL' : 'OK') + ' fails=' + fails);
  process.exit(fails ? 1 : 0);
})();
