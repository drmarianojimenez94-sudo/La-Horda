// Pelea contra EL PRESENTADOR (Ciudad Maldita, nivel 10) con el piloto automático "jugador competente".
// Mide lo que pidió la reseña (#6): cuánto dura la pelea y cuánto daño real le hace al guardián.
// Arranca la partida directo en el nivel 10 con 9 refuerzos al azar (lo que juntaría una partida real
// desde el nivel 1) y el guardián en el nivel esperado de la primera arena.
//   (servir el repo) SE_BASE_URL=http://127.0.0.1:8823 node tools/playtest/boss_presentador.js [intentos] [clase] [nivel]
// Sale un resumen por intento y la mediana: segundos de pelea, % de vida perdida del jugador (suma de golpes
// recibidos / vida máx.), vida mínima, si cayó, golpes de la Ovación y de los reflectores.
const { chromium } = (() => { try { return require('playwright'); } catch (e) { return require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright'); } })();
const path = require('path');
const BASE = process.env.SE_BASE_URL || 'http://127.0.0.1:8823';
const N = +(process.argv[2] || 4), CLS = process.argv[3] || 'mago', LVL = +(process.argv[4] || 6);
const DIFFK = process.env.DIFF_TIER || 'normal';
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const out = [];
  for (let i = 0; i < N; i++) {
    const ctx = await browser.newContext({ viewport: { width: 844, height: 390 } });
    await ctx.addInitScript(() => { window.__campaignMode = true; });
    const page = await ctx.newPage(); const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    await page.goto(`${BASE}/index.html`, { waitUntil: 'load', timeout: 180000 });
    for (let k = 0; k < 300; k++) { if (await page.evaluate(() => { const b = document.getElementById('title-continue-btn'); return b && !b.disabled; })) break; await sleep(100); }
    await page.addScriptTag({ path: path.join(__dirname, 'autopilot.js') });
    const r = await page.evaluate(([cls, lvl, seed, dk]) => {
      loop = function () {};
      for (const k in save.champions) { const c = save.champions[k]; c.unlocked = true; c.level = lvl; const al = Math.min(10, Math.floor(lvl / 3)); c.skillMastery.forEach(m => m.alloc = al); c.ultMastery.alloc = al; }
      if (typeof diffSetSelected === 'function' && dk !== 'normal') { save.diffProgress = save.diffProgress || {}; for (const a of ARENA_ORDER) save.diffProgress[a] = { normal: true, pesadilla: true, infierno: false }; diffSetSelected(dk); }
      lobbyAllies = ['tanque', 'guerrero', 'soporte'].filter(k => k !== cls).slice(0, 3);
      const B = { hits: {}, taken: 0, minHp: 100, bossAt: null, deadAt: null, fell: false };
      const dh = window.damageHero;
      window.damageHero = function (h, amount, src) { const hp0 = h.hp; dh(h, amount, src); if (h === player && boss && boss.type === 'cm_presentador') { const lost = Math.max(0, hp0 - h.hp); B.taken += lost; } };
      const bh = window.bossHitHero;
      window.bossHitHero = function (h, dmg, o) { if (h === player && boss && boss.type === 'cm_presentador') { const k = (new Error().stack || '').split('\n')[2].trim().split(' ')[1] || '?'; B.hits[k] = (B.hits[k] || 0) + 1; } return bh(h, dmg, o); };
      __AP.start(cls, 'ciudad', 10);
      // 9 refuerzos al azar (una partida real llega al jefe con los de los niveles 1-9)
      for (let j = 0; j < 9; j++) { const b = BUFF_POOL[(Math.random() * BUFF_POOL.length) | 0]; try { b.apply(runStats); } catch (e) {} }
      let t = 0;
      while (t < 8 * 60000) {
        __AP.sim(500); t += 500;
        if (boss && boss.type === 'cm_presentador' && B.bossAt === null) B.bossAt = t;
        if (B.bossAt !== null && player.alive) B.minHp = Math.min(B.minHp, Math.round(100 * player.hp / player.maxHp));
        if (B.bossAt !== null && !player.alive) B.fell = true;
        if (B.bossAt !== null && B.deadAt === null && (!boss || !boss.alive || (cmS.pr && cmS.pr.st !== 'fight' && cmS.pr.st !== 'transform'))) { B.deadAt = t; break; }
        if (state !== 'playing' && state !== 'buff') break;
      }
      return { lvl, hp: Math.round(player.maxHp), fightS: B.bossAt === null ? null : Math.round(((B.deadAt || t) - B.bossAt) / 1000), won: B.deadAt !== null,
        lostPct: Math.round(100 * B.taken / player.maxHp), minHp: B.minHp, fell: B.fell, state, bossHpLeft: boss && boss.alive ? Math.round(100 * boss.hp / boss.maxHp) : 0,
        bossMax: boss ? Math.round(boss.maxHp) : null, bossDmg: boss ? boss.dmg : null, hits: B.hits, act: cmS.pr && cmS.pr.act };
    }, [CLS, LVL, i, DIFFK]);
    r.errs = errs.slice(0, 2);
    out.push(r); console.log(JSON.stringify(r));
    await ctx.close();
  }
  await browser.close();
  const med = a => { const s = a.filter(x => x !== null).sort((x, y) => x - y); return s.length ? s[(s.length - 1) >> 1] : null; };
  console.log('RESUMEN', JSON.stringify({ cls: CLS, lvl: LVL, diff: DIFFK, n: out.length, fightS_med: med(out.map(r => r.fightS)), lostPct_med: med(out.map(r => r.lostPct)), minHp_med: med(out.map(r => r.minHp)),
    fell: out.filter(r => r.fell).length, won: out.filter(r => r.won).length }));
})();
