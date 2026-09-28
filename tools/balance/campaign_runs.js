// Partidas de la CAMPAÑA con el piloto automático y el código real del juego: una por arena (en el orden
// canónico, CAMPAIGN_ORDER), con el guardián al nivel ESPERADO de esa arena (DIFF.arenaLevel).
// Mide lo que necesitan las otras herramientas de balance:
//   - bajas por rango (y élites con nombre) -> groundloot_econ.js (KILLS=...)
//   - XP de bajas del jugador, calificación y XP de victoria -> xp_curve.js
//   - oro ganado peleando (sin venta) y botín del piso levantado
// El jugador es INVULNERABLE (declarado) y, si el jefe sigue vivo a los 16 min de juego, se lo remata: se
// mide una partida COMPLETA (bajas, XP, botín), no la habilidad del piloto.
// usage: GAME_URL=http://127.0.0.1:8841/index.html node tools/balance/campaign_runs.js [arenas=todas] [clase=guerrero] > runs.jsonl
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright');
const path = require('path'); const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const URL = process.env.GAME_URL || 'http://127.0.0.1:8841/index.html';
  const cls = process.argv[3] || 'guerrero';
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  let arenas = process.argv[2] && process.argv[2] !== 'todas' ? process.argv[2].split(',') : null;
  for (let ai = 0; ; ai++) {
    const page = await (await browser.newContext({ viewport: { width: 844, height: 390 } })).newPage();
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => { window.__campaignMode = true; });
    await page.goto(URL, { waitUntil: 'load' });
    for (let i = 0; i < 300; i++) { const ok = await page.evaluate(() => { const b = document.getElementById('title-continue-btn'); return b && !b.disabled; }); if (ok) break; await sleep(100); }
    if (!arenas) arenas = await page.evaluate(() => CAMPAIGN_ORDER.slice());
    if (ai >= arenas.length) { await page.context().close(); break; }
    const arena = arenas[ai];
    await page.addScriptTag({ path: path.join(__dirname, 'autopilot.js') });
    let r; try { r = await page.evaluate(([a, cls, lvlTable]) => {
      loop = function () {};
      // nivel de ENTRADA de cada arena (LVL=ciudad:1,fortaleza:8,... para cambiarlo); por defecto, la curva buscada
      const LV = Object.assign({ ciudad: 1, fortaleza: 7, bosque: 11, micelial: 15, hielo: 19, acuatica: 23, laberinto: 27, abismo: 30, minas: 33, infernal: 36 }, lvlTable || {});
      const lvl = LV[a] || DIFF.arenaLevel[a] || 1;
      for (const k in save.champions) { const c = save.champions[k]; c.level = lvl; c.xp = 0; c.unlocked = true; const al = Math.min(10, Math.floor(lvl / 4)); c.skillMastery.forEach(m => m.alloc = al); c.ultMastery.alloc = al; }
      save.stash = []; save.gold = 0; save.defeatCount = 99;
      const kills = {}; let named = 0, killXp = 0, inRun = true;
      const ok = window.killEnemy;
      killEnemy = function (e) { const k = e.eliteName ? 'named' : e.rank; kills[k] = (kills[k] || 0) + 1; return ok.apply(this, arguments); };
      const gx = window.grantXP;
      grantXP = function (k, amt) { if (inRun && k === selectedClass) killXp += Math.round(amt); return gx.apply(this, arguments); };
      const dh = window.damageHero;
      damageHero = function (h, amount, src) { return dh.call(this, h, h === player ? 0 : amount, src); };
      const drops = []; const od = window.groundLootDrop;
      groundLootDrop = function () { const g = od.apply(this, arguments); if (g) drops.push(g.tier); return g; };
      const spawnE = window.eliteMaybeName; eliteMaybeName = function (e) { const r = spawnE.apply(this, arguments); if (r) named++; return r; };
      __AP.start(cls, a, 1);
      for (let i = 0; i < 260; i++) {
        const o = __AP.sim(5000); if (o.state !== 'playing' && o.state !== 'buff') break;
        if (runElapsedMs > 16 * 60000) for (const e of enemies) if (e.alive && (e.rank === 'jefe' || e.rank === 'subjefe')) { e.lastHitBy = player; damageEnemy(e, e.hp + 1, { src: player, fromProc: true }); }
      }
      inRun = false;
      const vd = typeof victoryData !== 'undefined' && victoryData ? victoryData : null;
      if (vd) killXp -= vd.victoryXpBonus; // la de victoria se cuenta aparte
      const goldFight = save.gold;
      return { arena: a, lvl, state, runLevel, kills, named, killXp, score: vd ? vd.score : null, victoryXp: vd ? vd.victoryXpBonus : null,
        levelAfter: save.champions[cls].level, goldFight, drops, chest: vd ? vd.rewards.map(it => itemTier(it)) : [], minutes: Math.round(runElapsedMs / 600) / 100 };
    }, [arena, cls, process.env.LVL ? Object.fromEntries(process.env.LVL.split(',').map(p => p.split(':')).map(([k, v]) => [k, +v])) : null]); } catch (err) { r = { arena, error: String(err.message || err).slice(0, 200) }; }
    if (errors.length) r.errors = errors.slice(0, 3);
    console.log(JSON.stringify(r));
    await page.context().close().catch(() => {});
  }
  await browser.close();
})();
