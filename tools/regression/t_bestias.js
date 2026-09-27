// Hoja de bestias (IMG 1-3): Hadas de Escarcha, Dragoncito y Ángel de Hielo (conductas nuevas), Enjambre
// de Hadas (verde/rosa/oro), Cù-Sìth (Tres Aullidos) y las muertes de 4 cuadros de Esfinge/Medusa/Druida.
// Por cada criatura: el atlas está listo, aparece, hace su conducta, se la mata y su muerte se dibuja con
// sus cuadros; sin errores de página. Saca capturas (vivo y muriendo) en <outdir>.
//   (python3 -m http.server 8793 --bind 127.0.0.1 &) ; SE_BASE_URL=http://127.0.0.1:8793 node tools/regression/t_bestias.js <outdir>
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const fs = require('fs');
const path = require('path');
const BASE = process.env.SE_BASE_URL || 'http://127.0.0.1:8771';
const outdir = process.argv[2] || '/tmp/bestias_out';
fs.mkdirSync(outdir, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0;
const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 300) : '')); if (!ok) fails++; };

const HELPERS = () => {
  window.__hb = {
    start(arena, level) {
      for (const k of Object.keys(save.champions)) save.champions[k].unlocked = true;
      selectedClass = 'tanque'; currentArena = arena; lobbyAllies = [];
      startRun(level || 5);
      window.__hbFreeze = true;
      player.hp = player.maxHp = 1e6;
    },
    clear() { enemies.forEach(e => { e.alive = false; }); enemies = []; projectiles = []; bossStrikes.length = 0; },
    spawn(type, dx, dy) {
      const n0 = enemies.length;
      const e = spawnEnemy(type, false, false);
      e.x = player.x + dx; e.y = player.y + dy;
      for (let k = n0; k < enemies.length; k++) enemies[k].hp = enemies[k].maxHp = 1e6; // el guardián no las mata antes de mirar
      return enemies.indexOf(e);
    },
    ready(type) {
      const P = ENEMY_ATLAS_PACK[type] || (typeof DEATH_PACK !== 'undefined' && DEATH_PACK[type]);
      return !!(P && P.ready && P.atlas.naturalWidth > 0);
    },
    kill(i) { const e = enemies[i]; e.lastHitBy = player; e.hp = 5; damageEnemy(e, 20, { src: player }); return !e.alive; }, // golpe justo: sin despedazar (gore) para ver la muerte con sus cuadros
    dying(e) { return vfxDying.slice(0, vfxDyingN).some(d => d.e === e); },
  };
  setInterval(() => { if (window.__hbFreeze && typeof spawnTimer !== 'undefined') { spawnTimer = 1e9; levelTimer = 0; arenaHazardTimer = 1e9; if (player) { player.hp = player.maxHp; player.basicCd = 1e6; player.invulnTimer = 0; } } }, 30); // guardián pasivo: no pega ni empuja
};

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: 1000, height: 560 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message + ' @ ' + (e.stack || '').split('\n')[1]));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_CERT|fonts\.g/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.goto(`${BASE}/index.html`, { waitUntil: 'load', timeout: 120000 });
  for (let k = 0; k < 300; k++) { if (await page.evaluate(() => !document.getElementById('title-continue-btn').disabled)) break; await sleep(100); }
  await page.evaluate(HELPERS);
  const E = (fn, a) => page.evaluate(fn, a);
  const shot = n => page.screenshot({ path: path.join(outdir, n + '.png') });
  // recorte ampliado alrededor del enemigo (la cámara sigue al guardián; el enemigo queda a +120 en x)
  const clip = async n => { const c = await E(() => { const r = canvas.getBoundingClientRect(); return { w: r.width, h: r.height }; });
    await page.screenshot({ path: path.join(outdir, 'zoom_' + n + '.png'), clip: { x: Math.round(c.w / 2) - 60, y: Math.round(c.h / 2) - 150, width: 320, height: 230 } }); };
  const away = () => E(() => heroes.forEach((h, k) => { if (h !== player) { h.x = player.x - 900 - k * 60; h.y = player.y + 300; h.stunTimer = 60000; } }));

  // atlas listos
  for (const t of ['hada_escarcha', 'enjambre_hadas', 'enjambre_hadas_rosa', 'enjambre_hadas_oro', 'cu_sith', 'dragoncito_hielo', 'angel_hielo', 'dama_bosque', 'esfinge', 'medusa', 'druida_arena']) {
    check('atlas.' + t, await E(t => __hb.ready(t), t));
  }
  check('fx.hoja', await E(() => ['hbDragAliento', 'hbAngelPrisma', 'hbCuMordida', 'hbDamaHechizo'].every(k => VFX_SPR_EXTRA[k] && vfxSprReady(k))));

  // muere y se dibuja con sus cuadros (el cuerpo queda en la lista de muertes animadas)
  const killAndShoot = async (i, name, deathPack) => {
    const r = await E(([i, dp]) => {
      const e = enemies[i]; let drawn = 0;
      if (dp) { const f = drawDeathPack; window.drawDeathPack = function (x) { const ok = f(x); if (ok && x === e) drawn++; return ok; }; window.__hbRestore = () => { window.drawDeathPack = f; }; }
      // a la vista y sin congelar (congelado = se hace añicos: otra muerte, sin cuadros)
      e.x = player.x + 120; e.y = player.y; e.frozenTimer = 0; e.slowAmt = 0; e.slowTimer = 0;
      window.__hbE = e; __hb.kill(i); e._drawn = () => drawn;
      return { dead: !e.alive, dying: __hb.dying(e) };
    }, [i, deathPack]);
    await sleep(170); await clip(name + '_muerte1'); await shot(name + '_muerte');
    await sleep(230); await clip(name + '_muerte2');
    await sleep(250); await clip(name + '_muerte3');
    await sleep(200);
    const r2 = await E(() => { const e = window.__hbE; const o = { p: e._dyingP, drawn: e._drawn() }; if (window.__hbRestore) { window.__hbRestore(); window.__hbRestore = null; } return o; });
    check('muerte.' + name, r.dead && r.dying && r2.p > 0.5 && (!deathPack || r2.drawn > 0), { ...r, ...r2 });
  };

  /* ---------------- GÉLIDA ---------------- */
  await E(() => __hb.start('hielo', 5)); await sleep(800); await E(() => __hb.clear()); await away();
  // Hadas de Escarcha: llegan de a tres y roban el calor del brasero encendido
  {
    const r = await E(() => {
      const b = HIE.br.find(b => b.lit); player.x = b.x + 60; player.y = b.y + 90;
      const n0 = enemies.length; __hb.spawn('hada_escarcha', 40, -40);
      const group = enemies.length - n0;
      for (const e of enemies) { e.x = b.x + (Math.random() - 0.5) * 80; e.y = b.y + 30; }
      window.__hbB = b; b.fuel = 40000; window.__hbF0 = b.fuel; window.__hbT0 = runElapsedMs;
      return { group, lit: b.lit };
    });
    await sleep(2500);
    const s = await E(() => { const b = window.__hbB; const dt = runElapsedMs - window.__hbT0; return { spent: Math.round(window.__hbF0 - b.fuel), dt: Math.round(dt), steal: enemies.filter(e => e.hSteal).length, hBr: enemies.filter(e => e.hBr != null).length }; });
    await shot('hada_escarcha_brasero');
    check('hada.grupo_de_tres', r.group === 3, r);
    check('hada.roba_calor', s.steal >= 1 && s.spent > s.dt * 1.5, s);
    await killAndShoot(await E(() => 0), 'hada_escarcha', false);
    await E(() => __hb.clear());
    // enjambre: sin brasero cerca revolotean alrededor del guardián y pican
    const r3 = await E(() => { HIE.br.forEach(b => { b.lit = false; }); player.x = 0; player.y = 0; __hb.spawn('hada_escarcha', 150, 0); enemies.forEach((e, k) => { e.x = 150 + k * 20; e.y = k * 15; }); return enemies.length; });
    await sleep(2500);
    const r4 = await E(() => enemies.map(e => Math.round(Math.min(...heroes.filter(h => h.alive).map(h => Math.hypot(e.x - h.x, e.y - h.y)))))); // (con los bots del equipo: persigue al más cercano)
    check('hada.enjambre_orbita', r3 === 3 && r4.every(d => d < 170), { n: r3, dist: r4 });
    await E(() => { __hb.clear(); HIE.br.forEach(b => { b.lit = true; b.fuel = 40000; }); });
  }
  // Dragoncito: Aliento de Escarcha (cono con aviso, después daño + escarcha)
  {
    const i = await E(() => { player.x = 0; player.y = 0; heroes.forEach((h, k) => { h.frostStacks = 0; if (h !== player) { h.x = -900 - k * 60; h.y = 300; h.stunTimer = 4000; } }); const i = __hb.spawn('dragoncito_hielo', 140, 0); enemies[i].dgCd = 0; return i; });
    await sleep(350);
    const w = await E(i => ({ wind: !!enemies[i].bossWind, rank: enemies[i].rank }), i);
    await shot('dragoncito_aviso'); await clip('dragoncito_aviso');
    await sleep(900);
    const hit = await E(() => ({ frost: Math.max(...heroes.map(h => h.frostStacks || 0)) }));
    await shot('dragoncito_aliento');
    check('dragoncito.elite', w.rank === 'elite', w);
    check('dragoncito.aliento', w.wind && hit.frost >= 1, { ...w, ...hit });
    await killAndShoot(i, 'dragoncito', false);
    await E(() => { __hb.clear(); player.frostStacks = 0; player.stunTimer = 0; });
  }
  // Ángel: Prisma Helado (círculo bajo el guardián; quedarse quieto = 2 cargas de escarcha)
  {
    const i = await E(() => { player.x = 0; player.y = 0; player.frostStacks = 0; const i = __hb.spawn('angel_hielo', 220, -40); enemies[i].agCd = 0; return i; });
    await sleep(300);
    const s = await E(() => bossStrikes.map(b => ({ r: b.r, frost: b.o && b.o.frost })));
    await shot('angel_prisma'); await clip('angel_prisma');
    await sleep(1300);
    const f = await E(() => player.frostStacks || 0);
    await shot('angel_prisma_cierra');
    check('angel.prisma', s.length >= 1 && s[0].frost === 2 && f >= 2, { strikes: s, frost: f });
    await killAndShoot(i, 'angel', false);
    await E(() => { __hb.clear(); player.frostStacks = 0; });
  }

  /* ---------------- RUINAS DEL BOSQUE ---------------- */
  await E(() => __hb.start('bosque', 6)); await sleep(800); await E(() => __hb.clear()); await away();
  {
    const pals = await E(() => { const out = []; for (let k = 0; k < 24; k++) { const i = __hb.spawn('enjambre_hadas', -200 + (k % 6) * 70, -120 + Math.floor(k / 6) * 60); out.push(enemies[i].atlasKey || 'verde'); } return [...new Set(out)].sort(); });
    await sleep(600); await shot('enjambre_hadas_colores');
    check('hadas_bosque.tres_colores', pals.length === 3, pals);
    await killAndShoot(0, 'enjambre_hadas', false);
    await E(() => __hb.clear());
  }
  {
    const i = await E(() => { player.x = 0; player.y = 0; const i = __hb.spawn('cu_sith', 260, 0); enemies[i].cuCd = 0; return i; });
    await sleep(700);
    const h = await E(i => { const e = enemies[i]; return { st: e.cu && e.cu.st, n: e.cu && e.cu.n, rank: e.rank }; }, i);
    await shot('cu_sith_aullido'); await clip('cu_sith_aullido');
    let leap = false, st = [];
    for (let k = 0; k < 30 && !leap; k++) { await sleep(60); const s = await E(i => enemies[i] && enemies[i].cu && enemies[i].cu.st, i); st.push(s); if (s === 'leap') { leap = true; await shot('cu_sith_salto'); await clip('cu_sith_salto'); } }
    check('cu_sith.elite', h.rank === 'elite', h);
    check('cu_sith.tres_aullidos', h.st === 'howl' && leap, { h, st: [...new Set(st)] });
    await killAndShoot(i, 'cu_sith', false);
    await E(() => __hb.clear());
  }
  {
    const i = await E(() => { player.x = 0; player.y = 0; const i = __hb.spawn('dama_bosque', 230, 0); enemies[i].atkCd = 0; return i; });
    let p = 0;
    for (let k = 0; k < 30 && !p; k++) { await sleep(80); p = await E(() => projectiles.filter(p => p.enemy && p.sprite === 'hbDamaHechizo').length); }
    await shot('dama_bosque_hechizo'); await clip('dama_bosque_hechizo');
    check('dama.hechizo_sprite', p >= 1, { p });
    await E(() => __hb.clear());
  }

  /* ---------------- LABERINTO: muertes de 4 cuadros ---------------- */
  await E(() => __hb.start('laberinto', 7)); await sleep(800); await E(() => __hb.clear()); await away();
  for (const t of ['esfinge', 'medusa', 'druida_arena']) {
    const i = await E(t => { player.x = 0; player.y = 0; const i = __hb.spawn(t, 120, 20); const e = enemies[i]; e.speed = 0; e.ranged = false; e.dmg = 0; return i; }, t);
    await sleep(500); await shot(t + '_vivo'); await clip(t + '_vivo');
    await killAndShoot(i, t, true);
    await E(() => __hb.clear());
  }

  check('sin_errores', errors.length === 0, errors.slice(0, 5));
  await browser.close();
  console.log(fails ? `FALLAS: ${fails}` : 'TODO OK');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
