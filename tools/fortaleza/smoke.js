// Humo rápido de La Fortaleza: arranca la partida, recorre los sectores y saca capturas.
//   (python3 -m http.server 8771 &) ; node tools/fortaleza/smoke.js <outdir>
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const fs = require('fs'), path = require('path');
const BASE = process.env.SE_BASE_URL || 'http://127.0.0.1:8771';
const outdir = process.argv[2] || '/tmp/fort_smoke'; fs.mkdirSync(outdir, { recursive: true });
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
  await E(() => { selectedClass = 'guerrero'; currentArena = 'fortaleza'; lobbyAllies = ['tanque','mago','soporte']; startRun(1); });
  await sleep(1500);
  await page.screenshot({ path: path.join(outdir, 'L1_start.png') });
  const pts = [[0,1900,'patio'],[0,1100,'prison'],[0,377,'hub'],[-800,380,'west'],[0,-1000,'forge'],[0,-1700,'int_s'],[-470,-1940,'slide'],[0,-2900,'core'],[0,-3900,'knight']];
  for (const [x,y,n] of pts) {
    await E(([x,y]) => { for (const h of heroes){ h.x = x + (Math.random()-0.5)*80; h.y = y + (Math.random()-0.5)*80; h._fs = null; } enemies.length = 0; }, [x,y]);
    await sleep(700);
    await page.screenshot({ path: path.join(outdir, 'pos_' + n + '.png') });
  }
  const info = await E(() => ({ shapes: fortShapes.length, comps: new Set(fortShapes.map(s=>s.comp)).size, nav: AID_NAV.W+'x'+AID_NAV.H, on: AID_NAV.on, lvl: runLevel, en: enemies.length }));
  console.log(JSON.stringify(info));
  console.log('ERRORS', errors.length); errors.slice(0, 20).forEach(e => console.log(e));
  await browser.close();
})();
