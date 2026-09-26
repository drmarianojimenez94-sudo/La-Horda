// Humo rápido del Reino Micelial: arranca la partida, pasa por las etapas y saca capturas.
//   (python3 -m http.server 8771 &) ; node tools/micelial/smoke.js <outdir>
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const fs = require('fs'), path = require('path');
const BASE = process.env.SE_BASE_URL || 'http://127.0.0.1:8771';
const outdir = process.argv[2] || '/tmp/mic_smoke'; fs.mkdirSync(outdir, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: 1000, height: 560 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message + ' @ ' + (e.stack || '').split('\n').slice(1,3).join(' | ')));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_CERT|fonts\.g|net::/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.goto(`${BASE}/index.html`, { waitUntil: 'load' });
  for (let k = 0; k < 300; k++) { if (await page.evaluate(() => !document.getElementById('title-continue-btn').disabled)) break; await sleep(100); }
  const E = (fn, a) => page.evaluate(fn, a);
  const shot = n => page.screenshot({ path: path.join(outdir, n + '.png') });
  await E(() => { selectedClass = 'guerrero'; currentArena = 'micelial'; lobbyAllies = ['tanque','mago','soporte']; startRun(1); });
  await sleep(2500); await shot('L1_start');
  await E(() => { for (const h of heroes) { h.invulnTimer = 1e9; } });
  await sleep(4000); await shot('L1_fight');
  // saltar de nivel: cada etapa del ciclo de vida
  for (const lv of [3, 6, 7, 9]) {
    await E((lv) => { runLevel = lv; levelTimer = 0; micBeginLevel(); micS.nucT = 0; for (const h of heroes) { h.invulnTimer = 1e9; } }, lv);
    await sleep(9000);
    await shot('L' + lv + '_a');
  }
  const info = await E(() => ({ nodes: MIC_NODES.length, st: micS.nodes, nav: AID_NAV.W+'x'+AID_NAV.H, on: AID_NAV.on, lvl: runLevel, en: enemies.length, nuc: micNucleos().length, stage: micS.stage, mi: micS.mi.st }));
  console.log(JSON.stringify(info));
  console.log('ERRORS', errors.length); errors.slice(0, 20).forEach(e => console.log(e));
  await browser.close();
})();
