// FIN DE PARTIDA: si TODO el equipo cae en medio de un lanzamiento (runCastOwner = el lanzador, que también cae), la
// derrota tiene que llegar igual. Antes el temporizador del fin quedaba atado al lanzador caído (runLater) y la partida
// seguía "jugando" con todos muertos. Lo mismo para la victoria.
//   node tools/regression/t_run_end.js     (sirve el repo en SE_BASE_URL, default http://127.0.0.1:8771; lo levanta si no hay nada)
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const path = require('path'), http = require('http'), { spawn } = require('child_process');
const BASE = process.env.SE_BASE_URL || 'http://127.0.0.1:8771';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); if (!ok) fails++; };
function ping(url) { return new Promise(res => { const r = http.get(url, x => { x.resume(); res(x.statusCode < 500); }); r.on('error', () => res(false)); r.setTimeout(1500, () => { r.destroy(); res(false); }); }); }
(async () => {
  let srv = null;
  if (!(await ping(BASE + '/index.html'))) { const u = new URL(BASE); srv = spawn('python3', ['-m', 'http.server', u.port, '--bind', u.hostname], { cwd: path.resolve(__dirname, '..', '..'), stdio: 'ignore' }); for (let i = 0; i < 50 && !(await ping(BASE + '/index.html')); i++) await sleep(100); }
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: 1000, height: 600 } })).newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${BASE}/index.html?dev=1`, { waitUntil: 'load', timeout: 180000 });
  for (let i = 0; i < 400; i++) { if (await page.evaluate(() => { const b = document.getElementById('title-continue-btn'); return b && !b.disabled; })) break; await sleep(100); }
  const start = (a) => page.evaluate((a) => { save.tut = Object.assign(save.tut || {}, { training: 1 }); selectedClass = 'mago'; currentArena = a; lobbyAllies = ['tanque', 'soporte', 'guerrero']; startRun(1); }, a);
  // derrota en medio de un lanzamiento del jugador
  await start('bosque'); await sleep(800);
  const lose = await page.evaluate(() => {
    runCastOwner = player;                                  // el jugador está lanzando una habilidad...
    for (const h of heroes){ h.hp = 0; h.alive = false; }   // ...y el equipo entero cae en ese mismo golpe
    onPlayerDeath();
    runCastOwner = null;                                    // termina el lanzamiento
    let t = 0; while (state === 'playing' && t < 3000){ update(16); t += 16; }
    return { st: state, ms: t };
  });
  check('derrota_llega_aunque_caiga_el_lanzador', lose.st !== 'playing', lose);
  // victoria con el lanzador caído (un bot lanzaba cuando cayó el jefe y él también)
  await start('bosque'); await sleep(800);
  const win = await page.evaluate(() => {
    const bot = heroes.find(h => h !== player) || player;
    const b = spawnEnemy('guardian_ancestral', true); boss = b; bossActive = true;
    runCastOwner = bot; bot.alive = false; bot.hp = 0;         // el bot lanzaba y cae en el mismo golpe que el jefe
    damageEnemy(b, 1e9, { src: bot });
    runCastOwner = null;
    let t = 0; while (state === 'playing' && t < 6000){ update(16); t += 16; }
    return { st: state, ms: t };
  });
  check('victoria_llega_aunque_caiga_el_lanzador', win.st !== 'playing', win);
  check('sin_errores_de_pagina', errors.length === 0, errors.slice(0, 3));
  await browser.close(); if (srv) srv.kill();
  console.log(`SUMMARY ${fails ? 'FALLAS: ' + fails : 'OK'}`);
  process.exit(fails ? 1 : 0);
})();
