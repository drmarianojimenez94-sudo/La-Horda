// Diagnóstico: arranca ARENA en el nivel LEVEL con CLS (piloto automático, modo god) y registra el estado del
// jefe/subjefe cada 15 s de juego (para investigar atascos que informa q2_campaign_smoke.js).
//   GAME_URL=http://127.0.0.1:8902/index.html node tools/alfa/q2_diag_level.js abismo 9 nigromante 30 [minutos]
const REPO = require('path').join(__dirname, '..', '..');
const { chromium } = (() => { try { return require('playwright'); } catch (e) { return require('/opt/node22/lib/node_modules/playwright'); } })();
const path = require('path');
const [arena, level, cls, lv, mins] = [process.argv[2], +process.argv[3], process.argv[4], +process.argv[5], +(process.argv[6] || 6)];
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 } });
  await ctx.addInitScript(() => { window.__campaignMode = true; });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('PAGEERROR', String(e.message || e).slice(0, 300)));
  await page.goto((process.env.GAME_URL || 'http://127.0.0.1:8902/index.html'), { waitUntil: 'load', timeout: 600000 });
  for (let i = 0; i < 3000; i++) { const ok = await page.evaluate(() => { const b = document.getElementById('title-continue-btn'); return b && !b.disabled; }); if (ok) break; await sleep(200); }
  await page.addScriptTag({ path: path.join(REPO, 'tools/playtest/autopilot.js') });
  await page.evaluate(require(path.join(REPO, 'tools/fortaleza/sim-helpers.js')));
  await page.evaluate(([cls, arena, lvl, level]) => {
    loop = function () {};
    for (const k in save.champions) { const c = save.champions[k]; c.unlocked = true; c.level = lvl; c.xp = 0; const al = Math.min(10, Math.floor(lvl / 4)); c.skillMastery.forEach(m => m.alloc = al); c.ultMastery.alloc = al; }
    lobbyAllies = pickLobbyAllies(cls);
    const dh = window.damageHero;
    window.damageHero = function (h, amount) { if (h === player && h.alive && h.hp - amount < h.maxHp * 0.3) h.hp = h.maxHp; return dh.apply(this, arguments); };
    if (typeof window.abHangFall === 'function') { const hf = window.abHangFall; window.abHangFall = function (h) { if (h === player) { h.abHang = null; const p = abNearestGround(h.x, h.y, 30); if (p) { h.x = p.x; h.y = p.y; } return; } return hf.apply(this, arguments); }; }
    __AP.start(cls, arena, level);
  }, [cls, arena, lv, level]);
  let sim = 0;
  while (sim < mins * 60000) {
    const o = await page.evaluate(() => {
      let t = 0; const step = 16.67;
      for (let i = 0; i < 15000 / step; i++) {
        if (state === 'buff') __AP.pickBuff();
        const cov = document.getElementById('camp-overlay'); if (cov && !cov.classList.contains('hidden') && typeof campClose === 'function') { try { campClose(true); } catch (e) {} }
        if (state !== 'playing') break;
        update(step); t += step;
      }
      const R = Math.round, e = activeChampion || boss;
      const plat = (x, y) => typeof abPlatAt === 'function' ? abPlatAt(x, y, 0) : null;
      return { t, state, runLevel, levelTimer: R(levelTimer), levelDuration: R(levelDuration),
        champ: e ? { type: e.type, hp: R(e.hp), max: R(e.maxHp), x: R(e.x), y: R(e.y), plat: plat(e.x, e.y), dtm: e.dmgTakenMult, enc: e._encMult, tag: e._encTag || null, ph: e.acuaticaPhase || e.bossPhase || null, st: (typeof abS !== 'undefined' && abS && abS.ca) ? abS.ca.st : undefined, rise: e.abRise, act: e.abAct ? e.abAct.k : null } : null,
        player: { x: R(player.x), y: R(player.y), plat: plat(player.x, player.y), hp: R(100 * player.hp / player.maxHp), mv: __AP._mv ? [+(__AP._mv.x).toFixed(2), +(__AP._mv.y).toFixed(2)] : null },
        allies: allies.map(a => ({ k: a.classKey, alive: a.alive, x: R(a.x), y: R(a.y) })), enemies: enemies.filter(x => x.alive).length,
        levArms: typeof acuLevArms === 'function' ? acuLevArms().map(a => ({ hp: R(a.hp), x: R(a.x), y: R(a.y), role: a.levRole })) : undefined, levSt: typeof acuLev !== 'undefined' && acuLev ? acuLev.st : undefined };
    });
    sim += o.t;
    console.log(Math.round(sim / 1000) + 's', JSON.stringify(o));
    if (o.state !== 'playing' && o.state !== 'buff') break;
  }
  await browser.close();
})();
