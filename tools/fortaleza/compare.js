// Compara la presión de las primeras oleadas entre arenas (mismo equipo, piloto automático de bot).
//   node tools/fortaleza/compare.js <arena> <champLevel> <segundos> [nivelArena]
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const BASE = process.env.SE_BASE_URL || 'http://127.0.0.1:8771';
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const [arena, clvl, secs, alv] = [process.argv[2]||'acuatica', +(process.argv[3]||1), +(process.argv[4]||60), +(process.argv[5]||1)];
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: 800, height: 450 } })).newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${BASE}/index.html`, { waitUntil: 'load' });
  for (let k = 0; k < 300; k++) { if (await page.evaluate(() => !document.getElementById('title-continue-btn').disabled)) break; await sleep(100); }
  const res = [];
  for (let rep = 0; rep < 3; rep++) {
    const r = await page.evaluate(([arena, clvl, secs, alv]) => {
      loop = function(){};
      for (const k of Object.keys(save.champions)) { save.champions[k].unlocked = true; save.champions[k].level = clvl; }
      selectedClass = 'guerrero'; currentArena = arena; lobbyAllies = ['tanque','mago','soporte'];
      startRun(alv);
      let t = 0, maxEn = 0, sumEn = 0, n = 0, died = null, dmgTaken = 0;
      const k0 = kills;
      while (t < secs*1000) {
        if (state === 'buff') { const c = document.querySelector('#buff-cards > *'); if (c) c.click(); continue; }
        if (state !== 'playing') { died = died || t; break; }
        const bm = botMove(player, 16); joyVec = {x:bm.mx, y:bm.my}; basicHeld = true;
        if (bm.target){ const dx = bm.target.x-player.x, dy = bm.target.y-player.y, d = Math.hypot(dx,dy)||1; player.fx = dx/d; player.fy = dy/d; facing = {x:player.fx, y:player.fy}; }
        if (Math.random() < 16/900) { const i = (Math.random()*3)|0; try { if (player.cds[i] <= 0) useSkill(i, null); } catch (e) {} }
        update(16); t += 16;
        maxEn = Math.max(maxEn, enemies.length); sumEn += enemies.length; n++;
        if (!player.alive && died===null) died = t;
      }
      const ev = {}; for (const e of enemies) ev[e.type] = (ev[e.type]||0) + 1;
      return { alive: heroes.filter(h=>h.alive).length, died: died && Math.round(died/1000), maxEn, avgEn: +(sumEn/n).toFixed(1), kills: kills-k0, lv: runLevel, types: ev, hp: heroes.map(h=>Math.round(h.hp/h.maxHp*100)) };
    }, [arena, clvl, secs, alv]);
    res.push(r);
  }
  console.log(arena, 'champLv', clvl, 'arenaLv', alv, JSON.stringify(res));
  if (errors.length) console.log('errors', errors.slice(0,5));
  await browser.close();
})();
