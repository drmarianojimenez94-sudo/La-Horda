// Partida completa del Reino Micelial (1 jugador + 3 bots) simulada sin dibujar.
//   node tools/micelial/run_full.js [god=1] [champ] [nivel inicial]
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const BASE = process.env.SE_BASE_URL || 'http://127.0.0.1:8771';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const HELP = require('./sim-helpers.js');
(async () => {
  const god = process.argv[2] !== '0', champ = process.argv[3] || 'guerrero', startLv = +(process.argv[4] || 1);
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: 800, height: 450 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_CERT|fonts\.g|net::/.test(m.text())) errors.push('console: ' + m.text().slice(0, 300)); });
  await page.goto(`${BASE}/index.html`, { waitUntil: 'load' });
  for (let k = 0; k < 300; k++) { if (await page.evaluate(() => !document.getElementById('title-continue-btn').disabled)) break; await sleep(100); }
  await page.evaluate(HELP);
  await page.evaluate(() => { window.__origLoop = loop; loop = function(){}; });
  await sleep(200);
  const allies = (process.env.ALLIES || (champ === 'guerrero' ? 'tanque,mago,soporte' : 'guerrero,mago,soporte')).split(',').filter(Boolean);
  const clvl = +(process.env.CLVL || 0);
  if (clvl) await page.evaluate(l => { for (const k in save.champions) save.champions[k].level = l; }, clvl);
  await page.evaluate(([c, a, g, l]) => __ms.start(c, a, l, {god:g}), [champ, allies, god, startLv]);
  let last = null;
  for (let i = 0; i < 160; i++) {
    last = await page.evaluate(() => __ms.run(10000));
    const S = last.stats;
    console.log(`t=${last.t}s lv=${last.lv} stg=${last.stage} st=${last.state} en=${last.enemies} nuc=${last.nuc} hero=${last.heroes.map(h=>h.alive?'A':'x').join('')} ${JSON.stringify(last.heroes[0])} mi=${last.mi} mo=${JSON.stringify(last.mo)} boss=${last.boss?JSON.stringify(last.boss):''}`);
    if (last.lastErr) { console.log('ERR', last.lastErr.slice(0, 600)); }
    if (last.state !== 'playing' && last.state !== 'buff') break;
    if (S.lastLevelAt && last.t*1000 - S.lastLevelAt > 420000) { console.log('SOFTLOCK?'); break; }
  }
  const S = last.stats;
  const out = Object.assign({}, S); delete out.frames;
  console.log(JSON.stringify(out));
  const vic = await page.evaluate(() => ({ state, cleared: save.arenasCleared.micelial, dead: micS && micS.dead }));
  console.log('END', JSON.stringify(vic), 'errors', errors.length); errors.slice(0, 15).forEach(e => console.log(e));
  await browser.close();
})();
