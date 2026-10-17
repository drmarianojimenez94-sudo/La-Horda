'use strict';
/* PRUEBAS de la arena Bosque rediseñada (js/arenas/bosque/bos-selva.js). Uso: node tools/art/bosque-selva-test.js
   Verifica: piezas colocadas, colisión real de cada sólido nuevo, tiros (bloquea alto, no bloquea bajo ni lob),
   navegación (enemigos rodean obstáculos y llegan al jugador), determinismo del trazado y errores de página. */
const path = require('node:path'), {spawn} = require('node:child_process');
let chromium; try { ({chromium} = require('playwright')); } catch (e) { ({chromium} = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const ROOT = path.resolve(__dirname, '../..'), PORT = 8842;
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], {cwd: ROOT, stdio: 'ignore'});
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  await sleep(700);
  const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium', args: ['--no-sandbox']});
  let fails = 0; const ok = (n, c, d) => { console.log((c ? 'PASS ' : 'FAIL ') + n + (d ? '  ' + d : '')); if (!c) fails++; };
  try {
    const page = await browser.newPage({viewport: {width: 844, height: 390}}), errs = [];
    page.on('pageerror', e => errs.push(e.message));
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, {waitUntil: 'domcontentloaded', timeout: 120000});
    await page.waitForFunction(() => typeof startRun === 'function' && typeof BSV !== 'undefined', null, {timeout: 120000});
    await sleep(1500);
    const r = await page.evaluate(async () => {
      const out = {};
      for (const ck in save.champions) { const s = save.champions[ck]; s.unlocked = true; s.level = 20; }
      selectedClass = 'tanque'; currentArena = 'bosque'; lobbyAllies = ['soporte']; netMatch = null;
      diffNewSoloSeed = () => { _soloMapSeed = 11; return 11; };
      startRun(3); setState('playing'); enemies = []; spawnTimer = 1e9; for (const h of heroes) h.hp = h.maxHp = 1e8;
      const snap = () => JSON.stringify(aidSolids.map(s => [s.x, s.y, s.r]));
      out.info = Object.assign({}, BSV.info); out.solids = aidSolids.length; const s1 = snap();
      startRun(3); setState('playing'); out.deterministic = snap() === s1;
      enemies = []; spawnTimer = 1e9; for (const h of heroes) h.hp = h.maxHp = 1e8;
      const mine = aidSolids.filter(s => s.bsv); let leaks = 0;
      for (const s of mine) { const e = {x: s.x, y: s.y + 1, radius: 18}; clampToArena(e); resolveWallCollision(e); if (Math.hypot(e.x - s.x, e.y - s.y) < s.r * 0.9) leaks++; }
      out.mine = mine.length; out.leaks = leaks;
      const hi = aidSolids.find(s => !s.low && s.r >= 14 && s.bsv), lo = aidSolids.find(s => s.low);
      const fire = (s, extra) => { const p = Object.assign({x: s.x - s.r - 30, y: s.y, vx: 400, vy: 0, life: 2000, radius: 6, dmg: 1}, extra); for (let i = 0; i < 20; i++) { const ox = p.x, oy = p.y; p.x += 12; if (bosBlockProjectile(p, ox, oy)) return true; } return false; };
      out.shotHigh = fire(hi); out.shotLow = fire(lo); out.shotLob = fire(hi, {lob: true}); out.shotIgnore = fire(hi, {ignoreTerrain: true});
      // enemigos desde 12 puntos lejanos deben llegar al jugador en 25 s simulados
      player.x = 0; player.y = 0; for (const h of heroes) { h.x = 0; h.y = 0; }
      const pts = []; for (let i = 0; i < 40; i++) { const a = i / 40 * 6.283, p = aidOnRing(600 + (i % 3) * 90, 600 + (i % 3) * 90, a + 0.2); if (!aidBlocked(p.x, p.y, 40) && aidInside(p.x, p.y, 80)) pts.push(p); }
      const type = Object.keys(ENEMY_BASE).find(k => !ENEMY_BASE[k].flying && !ENEMY_BASE[k].ranged) || Object.keys(ENEMY_BASE)[0];
      const es = pts.map(p => { const e = spawnEnemy(type, false, false); e.x = p.x; e.y = p.y; e.hp = e.maxHp = 1e9; e.dmg = 0; return e; });
      for (let t = 0; t < 25000; t += 16) { update(16); }
      let arrived = 0; for (const e of es) if (heroes.some(h => Math.hypot(e.x - h.x, e.y - h.y) < 160)) arrived++;
      out.enemies = es.length; out.arrived = arrived; out.type = type;
      return out;
    });
    console.log(JSON.stringify(r));
    ok('piezas nuevas colocadas', r.info.boulders >= 5 && r.info.thickets >= 6 && r.info.logs >= 2 && r.info.columns >= 3, JSON.stringify(r.info));
    ok('determinístico (misma semilla, mismos sólidos)', r.deterministic);
    ok('todo sólido nuevo tiene colisión real', r.leaks === 0, `${r.mine} sólidos, ${r.leaks} fugas`);
    ok('tiro recto choca con obstáculo alto', r.shotHigh);
    ok('tiro NO choca con obstáculo bajo (zarzal/tronco)', !r.shotLow);
    ok('tiro en arco (lob) pasa por encima', !r.shotLob);
    ok('p.ignoreTerrain pasa', !r.shotIgnore);
    ok('enemigos rodean obstáculos y llegan al jugador', r.enemies >= 15 && r.arrived >= r.enemies - 1, `${r.arrived}/${r.enemies} (${r.type})`);
    ok('sin errores de página', errs.length === 0, errs.slice(0, 3).join(' | '));
  } finally { await browser.close(); server.kill(); }
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); server.kill(); process.exit(1); });
