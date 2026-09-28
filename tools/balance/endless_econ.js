// ECONOMÍA DE LA HORDA INFINITA vs CAMPAÑA (herramienta de desarrollo, no es parte del juego).
// Juega partidas reales con el piloto automático (autopilot.js) y mide por minuto de juego:
// oro, XP del guardián y objetos (inventario) — campaña (una arena completa, con su cofre y el
// bono de victoria o el castigo de derrota) contra Horda Infinita (hasta caer o hasta el tope).
//   (python3 -m http.server 8808 &)
//   [GOD=1] GAME_URL=http://127.0.0.1:8808/index.html node tools/balance/endless_econ.js [nivel=8] [partidas=2] [topeMin=14] [clase=guerrero] [arenas=fortaleza,hielo]
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright');
const path = require('path'); const sleep = ms => new Promise(r => setTimeout(r, ms));
const LVL = +(process.argv[2] || 8), N = +(process.argv[3] || 2), CAP = +(process.argv[4] || 14), CLS = process.argv[5] || 'guerrero';
const ARENAS = (process.argv[6] || 'fortaleza,hielo').split(',');
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const rows = [];
  async function run(mode, arena, i){
    const page = await (await browser.newContext({ viewport: { width: 844, height: 390 } })).newPage();
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(process.env.GAME_URL || 'http://127.0.0.1:8808/index.html', { waitUntil: 'load', timeout: 240000 });
    for (let k = 0; k < 300; k++) { const ok = await page.evaluate(() => { const b = document.getElementById('title-continue-btn'); return b && !b.disabled; }); if (ok) break; await sleep(100); }
    await page.addScriptTag({ path: path.join(__dirname, 'autopilot.js') });
    const r = await page.evaluate(([mode, arena, L, CAP, CLS, GOD]) => {
      loop = function(){}; gameDialogAutoConfirm = () => true;
      for (const k in save.champions){ const c = save.champions[k]; c.unlocked = true; c.level = L; c.xp = 0; const al = Math.min(10, Math.floor(L/4)); c.skillMastery.forEach(m => m.alloc = al); c.ultMastery.alloc = al; }
      save.stash = []; for (const k in save.champions) save.champions[k].equipment = mkEquipment();
      save.arenasCleared = Object.assign(save.arenasCleared||{}, {ciudad:true, fortaleza:true}); save.gold = 10000; save.gems = 0;
      const totalXp = () => { const c = save.champions[CLS]; let t = c.xp; for (let l = 1; l < c.level; l++) t += xpToNext(l); return t; };
      const g0 = save.gold, x0 = totalXp(), s0 = stashItems().length, gem0 = save.gems||0;
      lobbyAllies = null; selectedClass = CLS;
      if (mode === 'endless'){ endlessActive = false; endlessBeginRun(); startRun(1); __AP.on = true; }
      else { __AP.start(CLS, arena, 1); }
      const capMs = (mode === 'endless' ? CAP : 25)*60000; let guard = 0;
      // GOD=1: el equipo no muere (mide el RITMO de ingresos de alguien que sobrevive; el piloto automático
      // solo no pasa de las primeras rondas/niveles y la derrota de campaña castiga el 50%, lo que ensucia la comparación)
      const god = GOD;
      while (guard++ < 100000){
        if (state === 'buff') __AP.pickBuff();
        if (state !== 'playing') break;
        if (god) for (const h of heroes){ h.alive = true; h.hp = Math.max(h.hp, h.maxHp*0.6); }
        update(16.67);
        if (runElapsedMs >= capMs) break;
      }
      // cierre: dejar correr los temporizadores del final (cofre, pantalla de victoria/derrota)
      for (let k = 0; k < 400 && state === 'playing'; k++) update(16);
      const ms = runElapsedMs;
      if (mode === 'endless' && state === 'playing'){ endlessEndRun('quit'); }
      if (state === 'victory' && typeof victoryData !== 'undefined' && !victoryData && typeof buildVictoryData === 'function') {}
      const out = { mode, arena: mode === 'endless' ? EN.arenas.join('>') : arena, state, min: +(ms/60000).toFixed(2), gold: save.gold - g0, xp: totalXp() - x0, items: stashItems().length - s0, gems: (save.gems||0) - gem0,
        round: mode === 'endless' ? EN.round : runLevel, score: mode === 'endless' ? EN.score : 0, kills };
      return out;
    }, [mode, arena, LVL, CAP, CLS, !!process.env.GOD]);
    r.errors = errors.slice(0, 2);
    await page.context().close();
    return r;
  }
  for (let i = 0; i < N; i++){
    for (const a of ARENAS){ const r = await run('campaign', a, i); rows.push(r); console.log(JSON.stringify(r)); }
    const r = await run('endless', null, i); rows.push(r); console.log(JSON.stringify(r));
  }
  const agg = (m) => { const R = rows.filter(r => r.mode === m && r.min > 0.5); const min = R.reduce((s, r) => s + r.min, 0);
    return { runs: R.length, min: +min.toFixed(1), goldPerMin: +(R.reduce((s, r) => s + r.gold, 0)/min).toFixed(1), xpPerMin: +(R.reduce((s, r) => s + r.xp, 0)/min).toFixed(1), itemsPerMin: +(R.reduce((s, r) => s + r.items, 0)/min).toFixed(3), gemsPerMin: +(R.reduce((s, r) => s + r.gems, 0)/min).toFixed(3) }; };
  const c = agg('campaign'), e = agg('endless');
  console.log('RESUMEN nivel', LVL, 'clase', CLS, process.env.GOD ? '(GOD: el equipo no muere)' : '(real)');
  console.log('  campaña  ', JSON.stringify(c));
  console.log('  infinita ', JSON.stringify(e));
  console.log('  ratio oro/min', (e.goldPerMin/c.goldPerMin).toFixed(2), '· XP/min', (e.xpPerMin/c.xpPerMin).toFixed(2), '· objetos/min', (e.itemsPerMin/Math.max(1e-9, c.itemsPerMin)).toFixed(2));
  await browser.close();
})();
