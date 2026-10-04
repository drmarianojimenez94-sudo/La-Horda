// PRUEBA DE HUMO DE LA CAMPAÑA (alfa): recorre las 10 arenas en el orden canónico (CAMPAIGN_ORDER) con el
// piloto automático (tools/playtest/autopilot.js) y la simulación ACELERADA (update() a mano, sin dibujar).
// No mide la habilidad del piloto: mide que la arena se pueda TERMINAR. Por eso, por defecto, el guardián no
// cae (si baja del 30 % de vida se lo cura y se cuenta como "rescate"; MODE=real lo deja morir y solo informa).
//
// Falla (código de salida 1) si en alguna arena:
//   - hay un error de página (pageerror) o una excepción dentro de update();
//   - un nivel (oleada) no termina en un tiempo razonable (LEVEL_MIN minutos de juego, 6 por defecto);
//   - el jefe no aparece, no muere o la victoria no se dispara (BOSS_MIN minutos de juego desde el nivel 10, 9 por defecto);
//   - algún arreglo del juego crece sin control (partículas, proyectiles, enemigos, temporizadores...);
//   - un enemigo vivo queda fuera del mapa / dentro de una pared durante el atasco (se informa dónde).
//
//   (servir el repo) GAME_URL=http://127.0.0.1:8902/index.html node tools/alfa/q2_campaign_smoke.js
//   ARENAS=ciudad,fortaleza  CLASSES=guerrero,mago  MODE=god|real  LEVEL_MIN=6  BOSS_MIN=9  DIFF_TIER=normal
//   LV=ciudad:1,fortaleza:7 (nivel del guardián al entrar a cada arena; por defecto la curva de la campaña)
//   QUICK=1 -> una sola clase por arena, rotando entre CLASSES (para correr rápido: 10 partidas en total)
const { chromium } = (() => { try { return require('playwright'); } catch (e) { return require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright'); } })();
const path = require('path');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const URL = process.env.GAME_URL || 'http://127.0.0.1:8902/index.html';
const MODE = process.env.MODE || 'god';
const LEVEL_MIN = +(process.env.LEVEL_MIN || 6), BOSS_MIN = +(process.env.BOSS_MIN || 9);
const CLASSES = (process.env.CLASSES || 'guerrero,mago,nigromante,eren,profeta').split(',');
const QUICK = !!process.env.QUICK;
const LV = Object.assign({ ciudad: 1, fortaleza: 7, bosque: 11, micelial: 15, hielo: 19, acuatica: 23, laberinto: 27, abismo: 30, minas: 33, infernal: 36 },
  process.env.LV ? Object.fromEntries(process.env.LV.split(',').map(p => p.split(':')).map(([k, v]) => [k, +v])) : {});
// arreglos que se vigilan (nombre global -> tope razonable en cualquier momento de la partida)
const WATCH = { enemies: 260, projectiles: 500, particles: 2600, embers: 900, potions: 60, fireWalls: 60, traps: 80, bossStrikes: 120, runTimers: 400, allies: 40 };

async function openPage(browser) {
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 } });
  await ctx.addInitScript(() => { window.__campaignMode = true; });
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', e => errors.push(String(e.message || e).slice(0, 300)));
  await page.goto(URL, { waitUntil: 'load', timeout: 180000 });
  for (let i = 0; i < 600; i++) { const ok = await page.evaluate(() => { const b = document.getElementById('title-continue-btn'); return b && !b.disabled; }); if (ok) break; await sleep(100); }
  await page.addScriptTag({ path: path.join(__dirname, '..', 'playtest', 'autopilot.js') });
  await page.evaluate(require('../fortaleza/sim-helpers.js'));
  return { ctx, page, errors };
}

async function runArena(browser, cls, arena) {
  const { ctx, page, errors } = await openPage(browser);
  const res = { cls, arena, lvl: LV[arena] || 1, ok: true, fails: [], levels: {}, rescues: 0, deaths: 0 };
  try {
    await page.evaluate(([cls, arena, lvl, mode, watch, tier]) => {
      loop = function () {};   // sin loop real: la simulación la maneja la prueba
      for (const k in save.champions) { const c = save.champions[k]; c.unlocked = true; c.level = lvl; c.xp = 0; const al = Math.min(10, Math.floor(lvl / 4)); c.skillMastery.forEach(m => m.alloc = al); c.ultMastery.alloc = al; }
      if (tier && tier !== 'normal' && typeof diffSetSelected === 'function') { for (const a of ARENA_ORDER) { save.arenasCleared[a] = true; save.diffCleared.pesadilla[a] = true; if (tier === 'infierno') save.diffCleared.infierno[a] = true; } diffSetSelected(tier); }
      lobbyAllies = pickLobbyAllies(cls);
      const S = window.__Q2 = { mode, rescues: 0, deaths: 0, updErr: null, peak: {}, watch, lvT: 0, lastLv: 0, bossSeen: false, bossType: null, won: false };
      const dh = window.damageHero;
      window.damageHero = function (h, amount, src) {
        if (S.mode === 'god' && h === player && h.alive && h.hp - amount < h.maxHp * 0.3) { h.hp = h.maxHp; S.rescues++; }
        return dh.apply(this, arguments);
      };
      // Abismo: la caída al vacío no pasa por damageHero; en modo god se lo rescata igual
      if (typeof window.abHangFall === 'function') { const hf = window.abHangFall; window.abHangFall = function (h, H) { if (S.mode === 'god' && h === player) { S.rescues++; h.abHang = null; if (typeof abNearestGround === 'function') { const p = abNearestGround(h.x, h.y, 30); if (p) { h.x = p.x; h.y = p.y; } } return; } return hf.apply(this, arguments); }; }
      __AP.start(cls, arena, 1);
      S.lastLv = runLevel;
    }, [cls, arena, res.lvl, MODE, WATCH, process.env.DIFF_TIER || 'normal']);
    let simMs = 0, lvStart = 0, lastLv = 1, bossAt = null, wall0 = Date.now(), slowest = 0;
    const CHUNK = 15000;
    for (;;) {
      const t0 = Date.now();
      const o = await page.evaluate((chunk) => {
        const S = window.__Q2, step = 16.67; let t = 0;
        for (let i = 0; i < chunk / step; i++) {
          if (state === 'buff') __AP.pickBuff();
          const cov = document.getElementById('camp-overlay'); if (cov && !cov.classList.contains('hidden') && typeof campClose === 'function') { try { campClose(true); } catch (e) {} }
          if (state !== 'playing') break;
          try { update(step); } catch (e) { S.updErr = String(e && e.stack || e).slice(0, 500); break; }
          t += step;
          if (!player.alive && S.mode === 'god') { S.deaths++; }
          if (boss && runLevel === LEVEL_COUNT) { S.bossSeen = true; S.bossType = boss.type; }
        }
        for (const k in S.watch) { try { const v = eval(k); const n = v && v.length !== undefined ? v.length : 0; if (!(k in S.peak) || n > S.peak[k]) S.peak[k] = n; } catch (e) {} }
        const alive = enemies.filter(e => e.alive);
        return { t, state, runLevel, alive: player.alive, hp: Math.round(100 * player.hp / player.maxHp), enemies: alive.length, boss: boss ? { type: boss.type, alive: boss.alive, hp: Math.round(100 * boss.hp / Math.max(1, boss.maxHp)) } : null,
          updErr: S.updErr, apErr: __AP.err || null, rescues: S.rescues, deaths: S.deaths, peak: S.peak, bossSeen: S.bossSeen, bossType: S.bossType, levelCount: LEVEL_COUNT };
      }, CHUNK);
      slowest = Math.max(slowest, (Date.now() - t0) / Math.max(1, o.t / 1000));
      simMs += o.t;
      if (o.runLevel !== lastLv) { res.levels[lastLv] = Math.round((simMs - lvStart) / 1000); lvStart = simMs; lastLv = o.runLevel; }
      if (o.runLevel === o.levelCount && bossAt === null) bossAt = simMs;
      res.rescues = o.rescues; res.deaths = o.deaths; res.peak = o.peak; res.bossType = o.bossType;
      if (o.updErr) { res.fails.push('excepción en update(): ' + o.updErr); break; }
      if (o.state === 'victory') { res.levels[lastLv] = Math.round((simMs - lvStart) / 1000); res.result = 'victoria'; break; }
      if (o.state === 'gameover') { res.result = 'derrota'; if (MODE === 'god') res.fails.push('derrota en modo god (L' + o.runLevel + ')'); break; }
      if (o.state !== 'playing' && o.state !== 'buff') { res.fails.push('estado inesperado: ' + o.state); break; }
      if (!o.alive && MODE === 'real') { /* esperar a que el juego decida (revivir o derrota) */ }
      const lvCap = (o.runLevel === o.levelCount ? BOSS_MIN : LEVEL_MIN) * 60000;
      if (simMs - lvStart > lvCap) {
        res.fails.push((o.runLevel === o.levelCount ? (o.bossSeen ? `el jefe (${o.bossType}) no murió / la victoria no se disparó` : 'el jefe no apareció') : `el nivel ${o.runLevel} no terminó`) + ` en ${Math.round((simMs - lvStart) / 60000)} min de juego`);
        res.stall = await page.evaluate(() => {
          const R = v => Math.round(v);
          const inside = (x, y) => (typeof arenaHas === 'function' && arenaHas('inside')) ? !!arenaHook('inside', x, y, 0) : (Math.hypot(x, y) < ARENA_RADIUS + 40);
          const al = enemies.filter(e => e.alive);
          return { levelTimer: R(levelTimer), levelDuration: levelDuration > 1e8 ? 'inf' : R(levelDuration), levelClearing, runEnding, bossActive,
            hold: (typeof arenaHas === 'function' && arenaHas('holdLevel')) ? !!arenaHook('holdLevel') : null,
            boss: boss ? { type: boss.type, alive: boss.alive, hp: R(boss.hp), max: R(boss.maxHp), x: R(boss.x), y: R(boss.y), inside: inside(boss.x, boss.y), dmgTakenMult: boss.dmgTakenMult, invuln: !!(boss.invuln || boss.invulnerable || boss._invuln) } : null,
            enemies: al.slice(0, 12).map(e => ({ type: e.type, rank: e.rank, hp: R(e.hp), x: R(e.x), y: R(e.y), inside: inside(e.x, e.y) })), enemiesOut: al.filter(e => !inside(e.x, e.y)).length,
            player: { x: R(player.x), y: R(player.y), inside: inside(player.x, player.y), alive: player.alive } };
        });
        break;
      }
      if (Date.now() - wall0 > 20 * 60000) { res.fails.push('tope de tiempo real (20 min)'); break; }
    }
    res.simMin = +(simMs / 60000).toFixed(1); res.msPerSimSec = Math.round(slowest);
    for (const k in WATCH) if (res.peak && res.peak[k] > WATCH[k]) res.fails.push(`"${k}" llegó a ${res.peak[k]} (tope ${WATCH[k]})`);
    if (res.stall && res.stall.enemiesOut) res.fails.push(`${res.stall.enemiesOut} enemigo(s) vivos fuera del mapa`);
  } catch (e) { res.fails.push('la prueba se cayó: ' + String(e.message || e).slice(0, 300)); }
  if (errors.length) res.fails.push(...errors.slice(0, 3).map(e => 'pageerror: ' + e));
  res.ok = res.fails.length === 0;
  await ctx.close().catch(() => {});
  return res;
}

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  let arenas = process.env.ARENAS ? process.env.ARENAS.split(',') : null;
  if (!arenas) { const { ctx, page } = await openPage(browser); arenas = await page.evaluate(() => CAMPAIGN_ORDER.slice()); await ctx.close(); }
  const rows = [];
  let qi = 0;
  for (const arena of arenas) {
    const list = QUICK ? [CLASSES[qi++ % CLASSES.length]] : CLASSES;
    for (const cls of list) {
      const t0 = Date.now();
      const r = await runArena(browser, cls, arena);
      r.wall = Math.round((Date.now() - t0) / 1000);
      rows.push(r);
      console.log(`${r.ok ? 'OK  ' : 'FALLA'} ${arena.padEnd(10)} ${cls.padEnd(11)} lv${String(r.lvl).padEnd(3)} ${r.result || '-'} ${r.simMin}min jefe=${r.bossType || '-'} rescates=${r.rescues} niveles=${JSON.stringify(r.levels)} ${r.msPerSimSec}ms/s wall=${r.wall}s`);
      if (!r.ok) console.log('      ' + r.fails.join('\n      ') + (r.stall ? '\n      atasco: ' + JSON.stringify(r.stall) : ''));
    }
  }
  await browser.close();
  const bad = rows.filter(r => !r.ok);
  console.log(`\nRESUMEN: ${rows.length - bad.length}/${rows.length} partidas terminadas sin problemas (modo ${MODE}).`);
  if (process.env.JSON_OUT) require('fs').writeFileSync(process.env.JSON_OUT, JSON.stringify(rows, null, 1));
  process.exit(bad.length ? 1 : 0);
})();
