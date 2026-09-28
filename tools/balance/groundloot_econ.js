// Economía del BOTÍN EN EL PISO (js/data/ground-loot.js) con el código real del juego.
//   1) Partidas completas con el piloto automático: cuenta bajas por rango (y élites con nombre), lo que
//      cae al piso, el cofre final y el oro ganado peleando.
//   2) Monte Carlo con esas bajas: objetos por partida, Legendarios+ y oro de venta, piso vs. cofre.
// usage: GAME_URL=http://127.0.0.1:8821/index.html node tools/balance/groundloot_econ.js [arenas=bosque,infernal] [N=3000]
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright');
const path = require('path'); const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const arenas = (process.argv[2] || 'bosque,infernal').split(','), N = +(process.argv[3] || 3000);
  const LVL = { ciudad: 6, bosque: 10, acuatica: 18, fortaleza: 22, micelial: 26, hielo: 30, abismo: 36, laberinto: 40, minas: 44, infernal: 50 };
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  // KILLS='{"infernal":{"normal":700,...}}' salta las partidas y usa esas bajas (para iterar el balance rápido)
  // RUNS=runs.jsonl (tools/balance/campaign_runs.js) usa esas partidas: bajas, élites con nombre que APARECIERON y oro peleando
  let measured = process.env.KILLS ? Object.fromEntries(Object.entries(JSON.parse(process.env.KILLS)).map(([a, k]) => [a, { kills: k, gold: 0 }])) : {};
  if (process.env.RUNS) for (const l of require('fs').readFileSync(process.env.RUNS, 'utf8').split('\n')) { try { const r = JSON.parse(l.trim()); const k = Object.assign({}, r.kills);
    if (r.named) { k.elite = (k.elite || 0) + (k.named || 0); k.named = r.named; k.elite = Math.max(0, k.elite - r.named); } measured[r.arena] = { kills: k, gold: r.goldFight, state: r.state }; } catch (e) {} }
  const skipRuns = !!(process.env.KILLS || process.env.RUNS);
  for (const arena of (skipRuns ? [] : arenas)) {
    const page = await (await browser.newContext({ viewport: { width: 844, height: 390 } })).newPage();
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto((process.env.GAME_URL || 'http://127.0.0.1:8821/index.html'), { waitUntil: 'load' });
    for (let i = 0; i < 300; i++) { const ok = await page.evaluate(() => { const b = document.getElementById('title-continue-btn'); return b && !b.disabled; }); if (ok) break; await sleep(100); }
    await page.addScriptTag({ path: path.join(__dirname, 'autopilot.js') });
    const r = await page.evaluate(([a, l]) => {
      for (const k in save.champions) { save.champions[k].level = l; save.champions[k].unlocked = true; const al = Math.min(10, Math.floor(l / 4)); save.champions[k].skillMastery.forEach(m => m.alloc = al); save.champions[k].ultMastery.alloc = al; }
      save.stash = []; save.gold = 0;
      const kills = {}, drops = []; const ok = window.killEnemy;
      killEnemy = function (e) { const k = e.eliteName ? 'named' : e.rank; kills[k] = (kills[k] || 0) + 1; return ok.apply(this, arguments); };
      const od = window.groundLootDrop;
      groundLootDrop = function () { const g = od.apply(this, arguments); if (g) drops.push(g.tier); return g; };
      __AP.start('guerrero', a, 1);
      for (let i = 0; i < 200; i++) { const o = __AP.sim(5000); if (o.state !== 'playing' && o.state !== 'buff') break; }
      const chest = victoryData ? victoryData.rewards.map(it => itemTier(it)) : [];
      return { state, runLevel, kills, drops, chest, gold: save.gold, minutes: Math.round(runElapsedMs / 600) / 100 };
    }, [arena, LVL[arena] || 20]);
    console.log('PARTIDA ' + arena + ' ' + JSON.stringify(r) + (errors.length ? ' ERRORES ' + errors.slice(0, 2).join(' | ') : ''));
    measured[arena] = r;
    await page.context().close();
  }
  // 2) Monte Carlo con las bajas medidas
  const page = await (await browser.newContext()).newPage();
  await page.goto((process.env.GAME_URL || 'http://127.0.0.1:8821/index.html'), { waitUntil: 'load' });
  await sleep(800);
  const mc = await page.evaluate(([measured, N]) => {
    let seed = 777; const rng = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    const HIGH = { legendario: 1, mitico: 1, set: 1, unico: 1 };
    const out = {};
    for (const arena in measured) {
      const K = measured[arena].kills; let pity = {}, fl = 0, fHigh = 0, fSell = 0, ch = 0, cHigh = 0, cSell = 0, build = 0;
      const buildOk = buildLegendAllowed(arena);
      const tiers = {};
      for (let run = 0; run < N; run++) {
        for (const rk in K) {
          const e = { rank: rk === 'named' ? 'elite' : rk, eliteName: rk === 'named' ? 'x' : null };
          const src = _glSource(e); if (!src) continue;
          for (let i = 0; i < K[rk]; i++) {
            if (buildOk && src.build && rng() < src.build) { build++; fl++; fHigh++; fSell += SELL_VALUE.legendario; }
            const n = groundLootRollCount(src, rng);
            for (let j = 0; j < n; j++) {
              const t = groundLootRollTier(arena, src.grade, src.hm, pity, rng); fl++; tiers[t] = (tiers[t] || 0) + 1;
              if (HIGH[t]) { fHigh++; pity[t] = 0; }
              fSell += t === 'set' ? SELL_VALUE_SET_PIECE : (SELL_VALUE[t] || 0);
            }
          }
        }
        const r = rollLoot({ arena, grade: 'A', victory: true, subjefes: 1, owned: new Set(), pity, rng }); pity = r.pity;
        for (const it of r.items) { ch++; if (HIGH[it.tier]) cHigh++; cSell += it.tier === 'set' ? SELL_VALUE_SET_PIECE : (SELL_VALUE[it.tier] || 0); }
      }
      const f = x => Math.round(x / N * 100) / 100;
      const sell = f(fSell) + f(cSell), gold = measured[arena].gold || 0;
      out[arena] = { ventaSobreOroPeleando: gold ? Math.round(sell / gold * 1000) / 10 + '%' : '?', legendariosBuild: f(build), pisoObjetos: f(fl), pisoLegendariosMas: f(fHigh), pisoOroVenta: f(fSell), cofreObjetos: f(ch), cofreLegendariosMas: f(cHigh), cofreOroVenta: f(cSell),
        tiersPiso: Object.fromEntries(Object.entries(tiers).map(([k, v]) => [k, Math.round(v / fl * 1000) / 10 + '%'])), oroPeleandoMedido: measured[arena].gold };
    }
    return out;
  }, [measured, N]);
  for (const a in mc) console.log('MONTECARLO ' + a + ' ' + JSON.stringify(mc[a]));
  await browser.close();
})();
