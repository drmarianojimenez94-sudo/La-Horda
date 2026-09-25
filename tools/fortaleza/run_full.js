// Partida completa de La Fortaleza (1 jugador + 3 bots) simulada sin dibujar.
//   node tools/fortaleza/run_full.js [god=1] [champ] 
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
  // sin render: se para el loop del juego y se avanza a mano
  await page.evaluate(() => { window.__origLoop = loop; loop = function(){}; });
  await sleep(200);
  const allies = champ === 'guerrero' ? ['tanque','mago','soporte'] : ['guerrero','mago','soporte'];
  const clvl = +(process.env.CLVL || 0);
  if (clvl) await page.evaluate(l => { for (const k in save.champions) save.champions[k].level = l; }, clvl);
  await page.evaluate(([c, a, g, l]) => __fs.start(c, a, l, {god:g}), [champ, allies, god, startLv]);
  let last = null;
  for (let i = 0; i < 120; i++) {
    last = await page.evaluate(() => __fs.run(10000));
    const S = last.stats;
    console.log(`t=${last.t}s lv=${last.lv} sec=${last.sector} wi=${last.wi} st=${last.state} en=${last.enemies} hero=${last.heroes.map(h=>h.alive?'A':'x').join('')} ${JSON.stringify(last.heroes[0])} boss=${last.boss?JSON.stringify(last.boss):''} K=${last.knight&&last.knight.state}:${last.knight&&last.knight.phase} D=${last.dragon&&last.dragon.state}`);
    if (last.lastErr) { console.log('ERR', last.lastErr.slice(0, 600)); }
    if (last.state !== 'playing' && last.state !== 'buff') break;
    if (S.lastLevelAt && last.t*1000 - S.lastLevelAt > 400000) { console.log('SOFTLOCK?'); break; }
  }
  const S = last.stats;
  console.log(JSON.stringify({levels:S.levels, heroOut:S.heroOut, enemyOut:S.enemyOut, nan:S.nan, stuck:S.stuck, stuckList:(S.stuckList||[]).slice(0,8), maxEnemies:S.maxEnemies, maxProj:S.maxProj, maxPart:S.maxPart, maxStrikes:S.maxStrikes, maxVfxSpr:S.maxVfxSpr, maxAdds:S.maxAdds, trapsFired:S.trapsFired, reconf:S.reconf, knight:S.knightPhases, dragon:S.dragon, botsFar:S.botsFar, errorsInUpdate:S.errorsInUpdate, frames:S.frames}, null, 0));
  const vic = await page.evaluate(() => ({ state, cleared: save.arenasCleared.fortaleza, victory: !!document.querySelector('#victory-screen:not(.hidden), .victory:not(.hidden)') }));
  console.log('END', JSON.stringify(vic), 'errors', errors.length); errors.slice(0, 15).forEach(e => console.log(e));
  await browser.close();
})();
