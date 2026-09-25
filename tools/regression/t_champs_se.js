// Pruebas de partida real de El Libertador (San Martín) y Eren (El Portador).
// No es parte del juego. Corre sobre el repo servido tal cual:
//   (python3 -m http.server 8771 &) ; SE_BASE_URL=http://127.0.0.1:8771 node tools/regression/t_champs_se.js <outdir>
// Casos: SM 1-13, EREN 1-20, EQUIPO (SM + Eren + 2 bots), AMBOS COMO BOTS, rendimiento.
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const fs = require('fs');
const path = require('path');
const BASE = process.env.SE_BASE_URL || 'http://127.0.0.1:8771';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const outdir = process.argv[2] || '/tmp/se_out';
fs.mkdirSync(outdir, { recursive: true });

const checks = [];
function check(id, ok, detail) {
  checks.push({ id, ok: !!ok, detail: detail === undefined ? null : detail });
  console.log((ok ? 'PASS ' : 'FAIL ') + id + (detail !== undefined ? '  ' + JSON.stringify(detail).slice(0, 240) : ''));
}

// ---- utilidades dentro de la página (se inyectan una vez) ----
const PAGE_HELPERS = () => {
  window.__se = {
    // partida controlada: sin oleadas automáticas, sin reglas de arena que molesten
    start(champ, allies, level) {
      for (const k of Object.keys(save.champions)) { save.champions[k].unlocked = true; }
      const c = save.champions[champ]; c.level = Math.max(c.level || 1, 30); c.unlocked = true;
      selectedClass = champ; currentArena = 'bosque';
      if (allies) lobbyAllies = allies.slice();
      startRun(level || 3);
      window.__seFreeze = true;
      return player.classKey;
    },
    freeze(on) { window.__seFreeze = on; if (!on) { spawnTimer = 0; arenaHazardTimer = 6000; } },
    clear() { enemies.forEach(e => { e.alive = false; }); enemies = []; projectiles = []; },
    // enemigo quieto (speed 0 + dmg 0) en una posición relativa al jugador
    spawn(type, dx, dy, o) {
      o = o || {};
      const e = spawnEnemy(type, !!o.boss);
      e.x = player.x + dx; e.y = player.y + dy;
      if (o.still !== false) { e.speed = 0; e.baseSpeed = 0; }
      if (o.harmless !== false) { e.dmg = 0; e.ranged = false; }
      if (o.hp) { e.hp = e.maxHp = o.hp; }
      if (o.rank) e.rank = o.rank;
      e.__dmg = 0;
      return enemies.indexOf(e);
    },
    en(i) { const e = enemies[i]; return e ? { hp: Math.round(e.hp), dmg: Math.round(e.__dmg || 0), bossKnocks: e.__knocked || 0, maxHp: e.maxHp, x: Math.round(e.x - player.x), y: Math.round(e.y - player.y), alive: e.alive, stun: Math.round(e.stunTimer || 0), bleed: Math.round(e.bleedTimer || 0), vuln: e._seVulnUntil > runElapsedMs, rank: e.rank } : null; },
    p() {
      const h = player;
      return { x: Math.round(h.x), y: Math.round(h.y), hp: Math.round(h.hp), maxHp: h.maxHp, alive: h.alive, downed: !!h.downed,
        sm: h.smPhase || null, mounted: !!h.smMounted, cabral: !!h.smCabralUsed, officer: !!h.smOfficerReady, shots: h.smShots || 0,
        er: h.erenPhase || null, titan: !!h.erenTitan, ready: !!h.erenRumblingReady, exhaust: Math.round(h.erenExhaustTimer || 0), notf: Math.round(h.erenNoTfTimer || 0),
        fury: Math.round(h.ultCharge || 0), furyMax: h.ultMax, combo: h.erenCombo || 0, cls: h.cls.name, radius: h.radius, invuln: Math.round(h.invulnTimer || 0),
        speed: +heroSpeedMult(h).toFixed(3), dmgOut: +heroDmgOutMult(h).toFixed(3), taken: +heroDmgTakenMult(h).toFixed(3), cds: h.cds.map(c => Math.round(c)), state };
    },
  };
  const _de = damageEnemy;
  damageEnemy = function (e, amt, o) { const h0 = e.hp; const r = _de.apply(this, arguments); e.__dmg = (e.__dmg || 0) + Math.max(0, h0 - Math.max(0, e.hp)); return r; };
  const _kn = seKnock;
  seKnock = function (e) { const r = _kn.apply(this, arguments); if (r !== 'none' && isBossRank(e)) e.__knocked = (e.__knocked || 0) + 1; return r; };
  // congela las oleadas y el reloj del nivel cuando la prueba lo pide
  setInterval(() => { if (window.__seFreeze && typeof spawnTimer !== 'undefined') { spawnTimer = 1e9; levelTimer = 0; arenaHazardTimer = 1e9; } }, 30);
  // registro de fases por cuadro (para verificar secuencias montar->cargar->desmontar, etc.)
  window.__phaseLog = [];
  (function logLoop() {
    try { if (typeof player !== 'undefined' && player) { const ph = (player.smPhase || '') + '|' + (player.erenPhase || '') + '|' + (player.smMounted ? 'M' : '') + (player.erenTitan ? 'T' : ''); const L = window.__phaseLog; if (L[L.length - 1] !== ph) L.push(ph); if (L.length > 400) L.shift(); } } catch (e) {}
    requestAnimationFrame(logLoop);
  })();
  // FPS medido con requestAnimationFrame
  window.__fps = { frames: 0, t0: performance.now(), worst: 0, last: performance.now() };
  (function fpsLoop() { const f = window.__fps, now = performance.now(); f.frames++; f.worst = Math.max(f.worst, now - f.last); f.last = now; requestAnimationFrame(fpsLoop); })();
};

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 560 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message + ' @ ' + (e.stack || '').split('\n')[1]));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_CERT|fonts\.g/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.goto(`${BASE}/index.html`, { waitUntil: 'load', timeout: 120000 });
  for (let k = 0; k < 300; k++) { if (await page.evaluate(() => !document.getElementById('title-continue-btn').disabled)) break; await sleep(100); }
  await page.evaluate(PAGE_HELPERS);
  const E = (fn, arg) => page.evaluate(fn, arg);
  const P = () => E(() => __se.p());
  const shot = async name => page.screenshot({ path: path.join(outdir, name + '.png') });
  const phaseLog = async () => E(() => { const l = window.__phaseLog.slice(); window.__phaseLog.length = 0; return l; });
  const fpsReset = () => E(() => { window.__fps.frames = 0; window.__fps.t0 = performance.now(); window.__fps.worst = 0; window.__fps.last = performance.now(); });
  const fpsRead = () => E(() => { const f = window.__fps; const s = (performance.now() - f.t0) / 1000; return { fps: +(f.frames / s).toFixed(1), worstFrameMs: Math.round(f.worst) }; });
  const errCount = () => errors.length;

  /* ================= SAN MARTÍN ================= */
  {
    const e0 = errCount();
    // SM1: humano (seleccionable, se mueve, HUD propio)
    const k = await E(() => __se.start('libertador', ['tanque', 'soporte', 'mago']));
    await sleep(700);
    await E(() => __se.clear());
    const a = await P();
    await E(() => { joyVec = { x: 1, y: 0 }; });
    await sleep(600);
    await E(() => { joyVec = { x: 0, y: 0 }; });
    const b = await P();
    const hud = await E(() => document.getElementById('se-hud').innerText.includes('Oficial'));
    check('SM1.humano', k === 'libertador' && b.x - a.x > 60 && hud, { k, moved: b.x - a.x, hud, cls: b.cls });

    // SM2: disparo normal (lento, pesado, sin cancelar recarga)
    const i1 = await E(() => __se.spawn('duende_bosque', 220, 0, { hp: 5000 }));
    await E(() => { basicHeld = true; });
    await sleep(350);
    const r1 = await E(() => ({ cd: Math.round(player.basicCd), proj: projectiles.filter(p => p.smShot).length }));
    await sleep(1600);
    const hit1 = await E(i => __se.en(i), i1);
    await E(() => { basicHeld = false; });
    check('SM2.disparo_normal', r1.cd > 800 && hit1.hp < 5000 && (await P()).shots >= 1, { reloadMs: r1.cd, enemyHp: hit1.hp, proj: r1.proj });
    // intento de "cancelar" la recarga usando habilidades: el cooldown del básico se mantiene
    await E(() => { player.basicCd = 1200; player.cds = [0, 0, 0]; player.energy = 999; });
    await E(() => useSkill(1, null));
    const cdAfter = await E(() => Math.round(player.basicCd));
    check('SM2b.recarga_no_se_cancela', cdAfter > 1000, { basicCdAfterSkill: cdAfter });

    // SM3: Disparo de Oficial (atraviesa, crítico, se consume)
    await E(() => __se.clear());
    await sleep(900);
    const ids = [];
    for (const dx of [160, 200, 240]) ids.push(await E(dx => __se.spawn('duende_bosque', dx, 0, { hp: 99999 }), dx));
    await E(() => { player.smOfficerReady = false; player.smShots = 3; player.basicCd = 0; player.fx = 1; player.fy = 0; basicHeld = true; });
    await sleep(900); // 4to impacto -> Oficial listo
    const ready = (await P()).officer;
    await E(() => { player.basicCd = 0; });
    await sleep(900);
    await E(() => { basicHeld = false; });
    const hp3 = [];
    for (const i of ids) hp3.push((await E(i => __se.en(i), i)).dmg);
    const damaged = hp3.filter(d => d > 0).length;
    check('SM3.disparo_oficial', ready && damaged >= 2 && !(await P()).officer, { readyAfter4Hits: ready, dmgLine: hp3 });

    // SM4: Bayoneta (embestida corta, se detiene al conectar, sangrado, tambaleo)
    await E(() => __se.clear());
    const ib = await E(() => __se.spawn('dama_bosque', 150, 0, { hp: 99999 }));
    await E(() => { player.cds = [0, 0, 0]; player.energy = 999; player.fx = 1; player.fy = 0; });
    const pb0 = await P();
    await E(() => useSkill(0, { x: player.x + 150, y: player.y, dx: 1, dy: 0 }));
    await sleep(80);
    const phB = (await P()).sm;
    await sleep(600);
    const pb1 = await P(), eb = await E(i => __se.en(i), ib);
    check('SM4.bayoneta', phB === 'bayo' && pb1.sm === null && eb.dmg > 0 && eb.bleed > 0 && pb1.x - pb0.x > 60 && pb1.x - pb0.x < 190 && eb.x > 0,
      { phase: phB, dashPx: pb1.x - pb0.x, enemyDmg: eb.dmg, bleed: eb.bleed, stun: eb.stun, enemyDx: eb.x });

    // SM5: buff de equipo (solo aliados)
    await E(() => { __se.clear(); allies.forEach((h, i) => { h.x = player.x + 60 + i * 20; h.y = player.y + 30; }); player.cds = [0, 0, 0]; player.energy = 999; });
    const ie5 = await E(() => __se.spawn('duende_bosque', 120, 0, { hp: 99999 }));
    await E(() => useSkill(1, null));
    await sleep(100);
    const b5 = await E(i => ({ me: Math.round(player.granTimer || 0), allies: allies.map(h => Math.round(h.granTimer || 0)), enemyBuffed: !!enemies[i].granTimer, spd: +heroSpeedMult(player).toFixed(2), atk: +heroAtkSpeedMult(player).toFixed(2), dmg: +heroDmgOutMult(player).toFixed(2), cc: heroCcResist(player) }), ie5);
    check('SM5.granaderos_buff', b5.me > 7000 && b5.allies.every(t => t > 7000) && !b5.enemyBuffed && Math.abs(b5.spd - 1.2) < 0.02 && Math.abs(b5.atk - 1.15) < 0.02 && b5.cc > 0, b5);
    await shot('sm5_granaderos');

    // SM6: Soldado Cabral (una vez por partida)
    await E(() => { __se.clear(); player.hp = 10; player.invulnTimer = 0; damageHero(player, 99999, null); });
    const c6 = await P();
    await sleep(200);
    await shot('sm6_cabral');
    const hudC = await E(() => document.getElementById('se-hud').innerText);
    check('SM6.cabral', c6.alive && c6.hp === 1 && c6.cabral && c6.invuln > 1500 && c6.speed > 1.25, { ...c6, hudC });
    await E(() => { player.invulnTimer = 0; player.hp = player.maxHp; player.smCabralSpeedTimer = 0; });

    // SM7: Carga de San Lorenzo (montar -> cargar -> impacto -> desmontar; rangos)
    await E(() => { __se.clear(); allies.forEach(h => { h.x = player.x - 300; h.y = player.y - 200; }); player.granTimer = 0; });
    const c1 = await E(() => __se.spawn('duende_bosque', 120, 0, { hp: 99999 }));
    const c2 = await E(() => __se.spawn('duende_bosque', 200, 20, { hp: 99999 }));
    const el = await E(() => __se.spawn('dama_bosque', 280, -10, { hp: 99999 }));
    const bo = await E(() => __se.spawn('demonio_mayor', 380, 0, { boss: true, hp: 99999 }));
    const before7 = { c1: await E(i => __se.en(i), c1), bo: await E(i => __se.en(i), bo) };
    await phaseLog();
    await E(() => { player.cds = [0, 0, 0]; player.energy = 999; useSkill(2, { x: player.x + 400, y: player.y, dx: 1, dy: 0 }); });
    await sleep(250);
    await shot('sm7_san_lorenzo');
    await sleep(1200);
    const log7 = await phaseLog();
    const a7 = { c1: await E(i => __se.en(i), c1), c2: await E(i => __se.en(i), c2), el: await E(i => __se.en(i), el), bo: await E(i => __se.en(i), bo), p: await P() };
    const seq = log7.map(s => s.split('|')[0]).filter((v, i, a) => v && v !== a[i - 1]);
    const boAbs = await E(i => ({ x: Math.round(enemies[i].x), y: Math.round(enemies[i].y) }), bo);
    check('SM7.san_lorenzo', seq.join('>').includes('mount>charge') && (seq.includes('dismount') || a7.p.sm === null) && a7.p.sm === null
      && a7.c1.dmg > 0 && a7.c2.dmg > 0 && a7.bo.dmg > 0 && a7.bo.vuln && a7.bo.bossKnocks === 0 && a7.el.dmg > 0,
      { seq, c1: a7.c1, el: a7.el, boss: a7.bo, bossAbs: boAbs });

    // SM8 + SM9: Cruce de los Andes -> forma montada
    await E(() => { __se.clear(); });
    const ia = [];
    for (let j = 0; j < 8; j++) ia.push(await E(j => __se.spawn('duende_bosque', 150 + j * 40, (j % 3 - 1) * 70, { hp: 99999 }), j));
    await phaseLog();
    await E(() => { player.fx = 1; player.fy = 0; player.ultCharge = player.ultMax; player.ultCd = 0; runLevel = Math.max(runLevel, ULT_MIN_ARENA_LEVEL); useUltimate(); });
    await sleep(500);
    const fx8 = await E(() => champFx.map(f => f.type));
    await shot('sm8_andes_cast');
    await sleep(900);
    await shot('sm8_andes_riders');
    await sleep(900);
    const log8 = await phaseLog();
    let hit8 = 0; for (const i of ia) if ((await E(i => __se.en(i), i)).dmg > 0) hit8++;
    const p9 = await P();
    const seq8 = log8.map(s => s.split('|')[0]).filter((v, i, a) => v && v !== a[i - 1]);
    check('SM8.cruce_de_los_andes', seq8.includes('ultcast') && seq8.includes('andes') && fx8.includes('andes') && hit8 >= 5, { seq8, fx: [...new Set(fx8)], hit: hit8 + '/8' });
    // forma montada: sable en movimiento, +40% vel, +25% daño, -20% daño recibido
    const im = await E(() => __se.spawn('duende_bosque', 60, 0, { hp: 99999 }));
    await E(() => { player.basicCd = 0; basicHeld = true; });
    await sleep(700);
    await E(() => { basicHeld = false; });
    const em = await E(i => __se.en(i), im);
    const shotsMounted = await E(() => projectiles.filter(p => p.smShot).length);
    check('SM9.forma_montada', p9.mounted && Math.abs(p9.speed - 1.4) < 0.03 && Math.abs(p9.dmgOut - 1.25) < 0.03 && Math.abs(p9.taken - 0.8) < 0.02 && em.dmg > 0 && shotsMounted === 0,
      { mounted: p9.mounted, speed: p9.speed, dmgOut: p9.dmgOut, taken: p9.taken, sabreHit: em.dmg, musketShots: shotsMounted });
    await shot('sm9_mounted');

    // SM10: desmontaje al terminar el tiempo
    await E(() => { player.smMountedTimer = 100; });
    await sleep(900);
    const p10 = await P();
    check('SM10.desmontaje', !p10.mounted && p10.sm === null, p10);

    // SM11: muerte montado (Cabral ya usado)
    await E(() => { player.smMounted = true; player.smMountedTimer = 5000; player.invulnTimer = 0; player.hp = 5; damageHero(player, 99999, null); });
    await sleep(200);
    const p11 = await P();
    check('SM11.muerte_montado', (!p11.alive || p11.downed) && !p11.mounted && p11.sm === null, p11);

    // SM12: jefe (nunca desplazado; defensa rota; pelea completa sin errores)
    await E(() => __se.start('libertador', ['tanque', 'soporte', 'mago']));
    await sleep(500);
    await E(() => __se.clear());
    const ib12 = await E(() => __se.spawn('demonio_mayor', 200, 0, { boss: true, hp: 60000, harmless: true }));
    const bossPos0 = await E(i => ({ x: enemies[i].x, y: enemies[i].y }), ib12);
    for (let r = 0; r < 3; r++) {
      await E(() => { player.cds = [0, 0, 0]; player.energy = 999; useSkill(2, null); });
      await sleep(1500);
      await E(() => { player.cds = [0, 0, 0]; player.energy = 999; useSkill(0, null); });
      await sleep(700);
    }
    await E(() => { player.ultCharge = player.ultMax; player.ultCd = 0; useUltimate(); });
    await sleep(2800);
    const bossPos1 = await E(i => ({ dmg: Math.round(enemies[i].__dmg || 0), knocks: enemies[i].__knocked || 0, vulnSeen: !!enemies[i]._seVulnUntil }), ib12);
    const unitKnock = await E(i => seKnock(enemies[i], 1, 0, 200, 500), ib12);
    check('SM12.jefe', bossPos1.knocks === 0 && unitKnock === 'none' && bossPos1.dmg > 0 && bossPos1.vulnSeen, { ...bossPos1, seKnockOnBoss: unitKnock });

    // SM13: oleadas densas (60 enemigos, todas las habilidades, FPS)
    await E(() => { __se.clear(); __se.freeze(true); for (let j = 0; j < 60; j++) { const a = j / 60 * Math.PI * 2, r = 140 + (j % 5) * 50; __se.spawn('duende_bosque', Math.cos(a) * r, Math.sin(a) * r, { still: false, harmless: false }); } });
    await fpsReset();
    for (let r = 0; r < 4; r++) {
      await E(r => { player.cds = [0, 0, 0]; player.energy = 999; basicHeld = true; useSkill(r % 3, null); if (r === 2) { player.ultCharge = player.ultMax; player.ultCd = 0; useUltimate(); } }, r);
      await sleep(1500);
    }
    await E(() => { basicHeld = false; });
    const f13 = await fpsRead();
    const st13 = await E(() => ({ fx: champFx.length, parts: particles.length, enemiesAlive: enemies.filter(e => e.alive).length, kills }));
    await shot('sm13_dense');
    check('SM13.oleadas_densas', errCount() === e0 && st13.fx <= 60, { ...f13, ...st13, errors: errors.slice(e0) });
  }

  /* ================= EREN ================= */
  {
    const e0 = errCount();
    // E1: movimiento humano
    const k = await E(() => __se.start('eren', ['tanque', 'soporte', 'mago']));
    await sleep(600);
    await E(() => __se.clear());
    const a = await P();
    await E(() => { joyVec = { x: 0, y: 1 }; });
    await sleep(600);
    await E(() => { joyVec = { x: 0, y: 0 }; });
    const b = await P();
    check('E1.movimiento_humano', k === 'eren' && b.y - a.y > 60 && !b.titan, { moved: b.y - a.y, cls: b.cls });

    // E2: combo de 3 (el 3ro da Furia extra)
    const ic = await E(() => __se.spawn('duende_bosque', 45, 0, { hp: 99999 }));
    await E(() => { player.ultCharge = 0; player.erenCombo = 0; player.erenComboTimer = 0; player.basicCd = 0; player.fx = 1; player.fy = 0; });
    const furyLog = [], comboLog = [];
    for (let j = 0; j < 3; j++) {
      await E(() => { player.basicCd = 0; triggerBasic(player); });
      const s = await P(); furyLog.push(s.fury); comboLog.push(s.combo);
      await sleep(120);
    }
    const jump12 = furyLog[1] - furyLog[0], jump23 = furyLog[2] - furyLog[1];
    check('E2.combo', comboLog.join(',') === '1,2,3' && jump23 > jump12, { comboLog, furyLog });

    // E3/E4/E5: primer gancho, segundo gancho, cambio de dirección
    await E(() => { __se.clear(); player.cds = [0, 0, 0]; player.energy = 999; player.x = 0; player.y = 0; });
    await phaseLog();
    const h0 = await P();
    await E(() => useSkill(0, { x: player.x + 300, y: player.y, dx: 1, dy: 0 }));
    await sleep(200);
    const h1 = await P();
    const redirOk = await E(() => erenHookCanRedirect(player));
    await E(() => useSkill(0, { x: player.x, y: player.y + 300, dx: 0, dy: 1 }));
    await sleep(60);
    const h2 = await P();
    await sleep(500);
    const h3 = await P();
    const log3 = await phaseLog();
    check('E3.primer_gancho', h1.er === 'hook' || h1.er === 'hookPrep' || h1.er === 'land', { phase: h1.er, dx: h1.x - h0.x });
    check('E4.segundo_gancho', redirOk && h2.er === 'hook', { canRedirect: redirOk, phase: h2.er });
    check('E5.cambio_direccion', h3.y - h2.y > 80 && Math.abs(h3.x - h2.x) < 60, { firstLegDx: h2.x - h0.x, secondLegDy: h3.y - h2.y, secondLegDx: h3.x - h2.x, log: log3.slice(0, 8) });
    await E(() => { player.cds = [0, 0, 0]; });
    const noThird = await E(() => { const r = erenHookCanRedirect(player); return r; });
    check('E5b.sin_gancho_infinito', !noThird, { canRedirectAfterSecond: noThird });

    // E6: límites de arena (ganchos repetidos hacia afuera, nunca sale)
    const bounds = [];
    for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      for (let j = 0; j < 6; j++) {
        await E(d => { player.cds = [0, 0, 0]; player.energy = 999; player.erenPhase = null; useSkill(0, { x: player.x + d[0] * 300, y: player.y + d[1] * 300, dx: d[0], dy: d[1] }); }, d);
        await sleep(450);
      }
      bounds.push(await E(() => { const o = { x: player.x, y: player.y, radius: player.radius }; const x0 = o.x, y0 = o.y; clampToArena(o); return { x: Math.round(player.x), y: Math.round(player.y), inside: Math.abs(o.x - x0) < 1 && Math.abs(o.y - y0) < 1, finite: isFinite(player.x) && isFinite(player.y) }; }));
    }
    check('E6.limites_arena', bounds.every(b => b.inside && b.finite), bounds);

    // E7: Furia (sube al recibir daño; Instinto la multiplica; Instinto NO es invulnerable)
    await E(() => { __se.clear(); player.x = 0; player.y = 0; player.erenPhase = null; player.hp = player.maxHp; player.ultCharge = 0; player.erenInstinctTimer = 0; player.invulnTimer = 0; });
    const f7h0 = (await P()).hp;
    await E(() => damageHero(player, player.maxHp * 0.1, null));
    const f7a = (await P()).fury, f7a0lost = f7h0 - (await P()).hp;
    await E(() => { player.hp = player.maxHp; player.ultCharge = 0; player.cds = [0, 0, 0]; player.energy = 999; useSkill(1, null); player.invulnTimer = 0; });
    const hpBefore = (await P()).hp;
    await E(() => damageHero(player, player.maxHp * 0.1, null));
    const f7b = await P();
    const perHpN = f7a / (f7a0lost || 1), perHpI = f7b.fury / ((hpBefore - f7b.hp) || 1);
    check('E7.furia', f7a > 0 && perHpI > perHpN * 2.5 && f7b.hp < hpBefore && Math.abs(f7b.taken - 0.65) < 0.02, { furyNormal: f7a, furyInstinct: f7b.fury, furyPerHpNormal: +perHpN.toFixed(3), furyPerHpInstinct: +perHpI.toFixed(3), hpLost: hpBefore - f7b.hp, takenMult: f7b.taken });

    // E8: HP bajo (Seguir Adelante: <25% -> +15% vel/daño y más Furia)
    await E(() => { player.erenInstinctTimer = 0; player.erenAdvanceTimer = 0; player.hp = player.maxHp; });
    const full = await P();
    const g1 = await E(() => erenFuryGainMult(player));
    await E(() => { player.hp = player.maxHp * 0.2; });
    const low = await P();
    const g2 = await E(() => erenFuryGainMult(player));
    await shot('e8_lowhp');
    check('E8.hp_bajo', Math.abs(low.speed / full.speed - 1.15) < 0.02 && Math.abs(low.dmgOut / full.dmgOut - 1.15) < 0.02 && g2 > g1 * 1.5, { speed: [full.speed, low.speed], dmg: [full.dmgOut, low.dmgOut], furyMult: [+g1.toFixed(2), +g2.toFixed(2)] });

    // E9: transformación (bite -> rayo -> titán, ~2.7x, hitbox propia)
    await E(() => { player.hp = player.maxHp; __se.clear(); });
    const r0 = (await P()).radius;
    await phaseLog();
    await E(() => { player.ultCharge = player.ultMax; player.ultCd = 0; runLevel = Math.max(runLevel, ULT_MIN_ARENA_LEVEL); useUltimate(); });
    await sleep(200);
    await shot('e9_bite');
    await sleep(500);
    await shot('e9_bolt');
    await sleep(1200);
    const t9 = await P();
    await shot('e9_titan');
    const log9 = await phaseLog();
    check('E9.transformacion', t9.titan && t9.cls === 'El Portador' && t9.radius > r0 * 2 && t9.maxHp > full.maxHp * 2 && log9.some(s => s.split('|')[1] === 'tf') && t9.fury === 0,
      { radius: [r0, t9.radius], maxHp: [full.maxHp, t9.maxHp], log: log9.slice(0, 6) });

    // E10: ataque monstruoso (puño-puño-pisotón; comunes empujados, jefes quietos)
    const ic10 = await E(() => __se.spawn('duende_bosque', 90, 0, { hp: 99999 }));
    const ib10 = await E(() => __se.spawn('demonio_mayor', 0, 110, { boss: true, hp: 99999 }));
    const cP0 = await E(i => __se.en(i), ic10), bP0 = await E(i => ({ x: enemies[i].x, y: enemies[i].y }), ib10);
    await E(() => { player.erenCombo = 0; player.erenComboTimer = 0; player.fx = 1; player.fy = 0; });
    const steps10 = [];
    for (let j = 0; j < 3; j++) { await E(() => { player.basicCd = 0; triggerBasic(player); }); steps10.push(await E(() => player.erenAtkStep)); await sleep(200); }
    const bK = await E(i => __se.en(i), ib10);
    const cP1 = await E(i => __se.en(i), ic10), bP1 = await E(i => ({ x: enemies[i].x, y: enemies[i].y, hp: enemies[i].hp }), ib10);
    check('E10.ataque_monstruoso', steps10.join(',') === '0,1,2' && cP1.dmg > 0 && Math.hypot(cP1.x - cP0.x, cP1.y - cP0.y) > 20 && bK.dmg > 0 && bK.bossKnocks === 0,
      { steps: steps10, commonPushed: Math.round(Math.hypot(cP1.x - cP0.x, cP1.y - cP0.y)), bossDmg: bK.dmg, bossKnocks: bK.bossKnocks });

    // E11: Sismo (radial con caída de daño)
    await E(() => __se.clear());
    const near = await E(() => __se.spawn('duende_bosque', 40, 0, { hp: 99999 }));
    const far = await E(() => __se.spawn('duende_bosque', -200, 0, { hp: 99999 }));
    const out = await E(() => __se.spawn('duende_bosque', 0, 420, { hp: 99999 }));
    await E(() => { player.cds = [0, 0, 0]; player.energy = 999; useSkill(0, null); });
    await sleep(150);
    await shot('e11_sismo');
    const s11 = [await E(i => __se.en(i), near), await E(i => __se.en(i), far), await E(i => __se.en(i), out)];
    check('E11.sismo', s11[0].dmg > s11[1].dmg && s11[1].dmg > 0 && s11[2].dmg === 0, { dmgNear: s11[0].dmg, dmgFar: s11[1].dmg, dmgOut: s11[2].dmg });

    // E12: Terremoto (4 pulsos canalizados, más vulnerable)
    await E(() => __se.clear());
    const q = await E(() => __se.spawn('duende_bosque', 80, 0, { hp: 99999 }));
    await E(() => { player.cds = [0, 0, 0]; player.energy = 999; useSkill(1, null); });
    await sleep(100);
    const q1 = await P();
    const hpQ = [];
    for (let j = 0; j < 5; j++) { await sleep(500); hpQ.push((await E(i => __se.en(i), q)).dmg); }
    const pulses = hpQ.filter((d, j) => d > (j ? hpQ[j - 1] : 0)).length;
    check('E12.terremoto', q1.er === 'quake' && q1.taken > 1 && pulses >= 3 && (await P()).er === null, { phase: q1.er, takenMult: q1.taken, hpSeries: hpQ, pulsesSeen: pulses, dmgSeries: hpQ });

    // E13: Retumbar (pisadas que avanzan, giro limitado)
    await E(() => __se.clear());
    const rr = await E(() => __se.spawn('duende_bosque', 160, 0, { hp: 99999 }));
    const r13a = await P();
    await E(() => { player.cds = [0, 0, 0]; player.energy = 999; useSkill(2, { x: player.x + 300, y: player.y, dx: 1, dy: 0 }); });
    await sleep(1400);
    const r13b = await P();
    await shot('e13_retumbar');
    await sleep(2400);
    const r13c = await P(), er13 = await E(i => __se.en(i), rr);
    check('E13.retumbar', r13b.er === 'stomp' && r13c.x - r13a.x > 150 && er13.dmg > 0 && r13c.er === null, { advancedPx: r13c.x - r13a.x, enemyDmg: er13.dmg, phaseMid: r13b.er, phaseEnd: r13c.er });

    // E14: regeneración (parte del daño vuelve con vapor; no inmortal)
    await E(() => { __se.clear(); player.hp = player.maxHp * 0.9; player.erenRegenPool = 0; player.invulnTimer = 0; damageHero(player, player.maxHp * 0.3, null); });
    const r14a = await P();
    await sleep(2000);
    const r14b = await P();
    check('E14.regeneracion', r14b.hp > r14a.hp && r14b.hp < r14a.maxHp * 0.9, { hpAfterHit: r14a.hp, hpAfter2s: r14b.hp, max: r14a.maxHp });

    // E15: llenar Furia transformado -> indicador especial
    await E(() => { player.ultCharge = 0; player.erenRumblingReady = false; });
    await sleep(300);
    const hidden = await E(() => document.getElementById('se-hud').innerText.includes('RETUMBAR'));
    await E(() => { player.ultCharge = player.ultMax - 1; erenAddFury(player, 5); });
    await sleep(150);
    const p15 = await P();
    const shown = await E(() => document.getElementById('se-hud').innerText.includes('RETUMBAR LISTO'));
    check('E15.furia_llena_transformado', p15.ready && shown && !hidden, { ready: p15.ready, bannerOrHud: shown, notShownBefore: !hidden });

    // E16/E17/E18/E19: Ultimate II -> 3 pisadas -> humano -> agotado
    await E(() => { __se.clear(); allies.forEach((h, i) => { h.x = player.x + 60; h.y = player.y + 40 * i; h.hp = h.maxHp; }); });
    const allyHp0 = await E(() => allies.map(h => Math.round(h.hp)));
    const rs = [];
    for (const [dx, dy] of [[-320, -80], [320, 80], [0, 0], [60, 40]]) rs.push(await E(([dx, dy]) => __se.spawn('duende_bosque', dx, dy, { hp: 999999 }), [dx, dy]));
    await E(() => { window.__steps = []; const orig = erenUpdateRumbleStep; window.__origStep = orig; });
    await E(() => useUltimate());
    await sleep(150);
    const p16 = await P();
    const fx16 = await E(() => champFx.filter(f => f.type === 'rumbleStep').map(f => ({ idx: f.idx, dx: Math.round(f.x - player.x), dy: Math.round(f.y - player.y), r: f.r, delay: f.delay })));
    await E(() => { joyVec = { x: 1, y: 0 }; });
    await sleep(900);
    const ctl = await P();
    await E(() => { joyVec = { x: 0, y: 0 }; });
    await shot('e16_roar');
    await sleep(1400);
    await shot('e17_step1');
    await sleep(2000);
    await shot('e17_step2');
    await sleep(2000);
    await shot('e17_step3');
    const hpSteps = [];
    for (const i of rs) hpSteps.push((await E(i => __se.en(i), i)).dmg);
    await sleep(2000);
    const p18 = await P();
    const allyHp1 = await E(() => allies.map(h => Math.round(h.hp)));
    check('E16.ultimate_II', p16.er === 'rumble' && !p16.ready && Math.abs(ctl.x - p16.x) < 2, { phase: p16.er, playerMovedWhileRumble: ctl.x - p16.x });
    check('E17.tres_pisadas', fx16.length === 3 && fx16[0].dx < 0 && fx16[1].dx > 0 && fx16[2].r > fx16[0].r && hpSteps.filter(d => d > 0).length >= 3 && allyHp1.every((h, i) => h >= allyHp0[i] - 1),
      { steps: fx16, enemyDmg: hpSteps, allyHp: [allyHp0, allyHp1] });
    check('E18.retorno_humano', !p18.titan && p18.cls !== 'El Portador' && p18.radius < 40, { titan: p18.titan, cls: p18.cls, radius: p18.radius });
    const blocked = await E(() => { player.ultCharge = player.ultMax; player.ultCd = 0; useUltimate(); return !player.erenTitan && player.erenPhase !== 'tf'; });
    check('E19.agotamiento', p18.fury === 0 && p18.exhaust > 0 && p18.notf > 0 && p18.speed < 1 && blocked, { fury: p18.fury, exhaustMs: p18.exhaust, noTransformMs: p18.notf, speed: p18.speed, ultBlocked: blocked });
    await shot('e19_exhausted');

    // E20: muerte durante distintos estados (gancho, transformación, titán, Terremoto)
    const deaths = {};
    for (const st of ['hook', 'tf', 'titan', 'quake']) {
      await E(() => __se.start('eren', ['tanque', 'soporte', 'mago']));
      await sleep(300);
      await E(() => { __se.clear(); runLevel = Math.max(runLevel, ULT_MIN_ARENA_LEVEL); });
      if (st === 'hook') await E(() => { player.cds = [0, 0, 0]; player.energy = 999; useSkill(0, { x: player.x + 300, y: player.y, dx: 1, dy: 0 }); });
      if (st === 'tf') await E(() => { player.ultCharge = player.ultMax; player.ultCd = 0; useUltimate(); });
      if (st === 'titan' || st === 'quake') { await E(() => { player.ultCharge = player.ultMax; player.ultCd = 0; useUltimate(); }); await sleep(1900); }
      if (st === 'quake') await E(() => { player.cds = [0, 0, 0]; player.energy = 999; useSkill(1, null); });
      await sleep(120);
      await E(() => { player.invulnTimer = 0; if (player.erenPhase === 'tf') { player.erenPhase = null; } player.hp = 1; damageHero(player, 1e7, null); });
      await sleep(300);
      deaths[st] = await P();
    }
    const deathOk = Object.values(deaths).every(d => (!d.alive || d.downed) && !d.titan && d.er === null && d.radius < 40);
    check('E20.muerte_estados', deathOk && errCount() === e0, Object.fromEntries(Object.entries(deaths).map(([k, d]) => [k, { alive: d.alive, titan: d.titan, er: d.er, r: d.radius, cls: d.cls }])));
    // cinemáticas (tf/retumbar) sin daño recibido
    await E(() => __se.start('eren', ['tanque', 'soporte', 'mago']));
    await sleep(300);
    const cinem = await E(() => { __se.clear(); runLevel = Math.max(runLevel, ULT_MIN_ARENA_LEVEL); player.ultCharge = player.ultMax; player.ultCd = 0; useUltimate(); const hp = player.hp; damageHero(player, 50, null); return { phase: player.erenPhase, noDamage: player.hp === hp }; });
    check('E20b.cinematica_protegida', cinem.phase === 'tf' && cinem.noDamage, cinem);
    check('EREN.sin_errores', errCount() === e0, errors.slice(e0));
  }

  /* ================= EQUIPO: SAN MARTÍN + EREN + 2 BOTS ================= */
  {
    const e0 = errCount();
    await E(() => __se.start('libertador', ['eren', 'soporte', 'mago'], ULT_MIN_ARENA_LEVEL));
    await E(() => { __se.freeze(false); });
    await sleep(400);
    const team = await E(() => heroes.map(h => h.classKey));
    // el Eren BOT también tiene que funcionar; se le llena la Furia para ver su IA de titán
    await fpsReset();
    const stats = { granAllies: 0, erenTitan: false, erenHook: false, smMounted: false, rumble: false, maxFx: 0, maxParts: 0 };
    for (let t = 0; t < 45; t++) {
      const s = await E(() => {
        const er = heroes.find(h => h.classKey === 'eren');
        if (er && er.alive && !er.erenTitan && !er.erenNoTfTimer && runElapsedMs > 6000) er.ultCharge = er.ultMax;
        if (er && er.erenTitan && runElapsedMs > 16000) er.ultCharge = er.ultMax;
        player.cds = player.cds.map(c => Math.min(c, 800)); player.energy = 999; basicHeld = true;
        if (Math.random() < 0.3) useSkill((Math.random() * 3) | 0, null);
        if (runElapsedMs > 9000 && !player.smMounted) { player.ultCharge = player.ultMax; player.ultCd = 0; useUltimate(); }
        player.hp = Math.max(player.hp, player.maxHp * 0.5);
        heroes.forEach(h => { if (h.alive) h.hp = Math.max(h.hp, h.maxHp * 0.3); });
        return { gran: allies.filter(h => h.granTimer > 0).length, titan: !!(er && er.erenTitan), hook: !!(er && (er.erenPhase === 'hook' || er.erenPhase === 'hookPrep')), rumble: !!(er && er.erenPhase === 'rumble'), mounted: !!player.smMounted, fx: champFx.length, parts: particles.length, en: enemies.filter(e => e.alive).length };
      });
      stats.granAllies = Math.max(stats.granAllies, s.gran); stats.erenTitan ||= s.titan; stats.erenHook ||= s.hook; stats.smMounted ||= s.mounted; stats.rumble ||= s.rumble;
      stats.maxFx = Math.max(stats.maxFx, s.fx); stats.maxParts = Math.max(stats.maxParts, s.parts);
      if (t === 20) await shot('team_mid');
      if (s.rumble && !stats.shotR) { stats.shotR = true; await shot('team_rumble_bot'); }
      await sleep(500);
    }
    await E(() => { basicHeld = false; });
    const f = await fpsRead();
    // pasar a jefe
    await E(() => { __se.freeze(true); __se.clear(); startBossFight(); });
    await sleep(6000);
    const bossSt = await E(() => ({ boss: !!boss, bossHp: boss ? Math.round(boss.hp) : null, bossMax: boss ? boss.maxHp : null, state }));
    await shot('team_boss');
    check('TEAM.sm_eren_2bots', team.join(',') === 'libertador,eren,soporte,mago' && stats.granAllies >= 1 && stats.erenTitan && stats.smMounted && errCount() === e0,
      { team, ...stats, ...f, boss: bossSt, errors: errors.slice(e0) });
    check('TEAM.boss', bossSt.boss && bossSt.bossHp < bossSt.bossMax, bossSt);
  }

  /* ================= AMBOS COMO BOTS ================= */
  {
    const e0 = errCount();
    await E(() => __se.start('tanque', ['libertador', 'eren', 'soporte'], ULT_MIN_ARENA_LEVEL));
    await E(() => { __se.freeze(false); });
    const seen = { smShots: 0, smSkills: new Set(), erSkills: new Set(), erTitan: false, smUlt: false, erHook: false };
    for (let t = 0; t < 60; t++) {
      const s = await E(() => {
        const sm = heroes.find(h => h.classKey === 'libertador'), er = heroes.find(h => h.classKey === 'eren');
        player.hp = player.maxHp; // el jugador (tanque) no muere: se mira a los bots
        heroes.forEach(h => { if (h.alive) h.hp = Math.max(h.hp, h.maxHp * 0.35); });
        if (runElapsedMs > 8000) { if (sm && sm.ultCharge < sm.ultMax) sm.ultCharge += 3; if (er && !er.erenTitan && er.ultCharge < er.ultMax) er.ultCharge += 3; }
        return { sm: sm && { ph: sm.smPhase, m: sm.smMounted, cds: sm.cds.map(c => c > 0), shots: projectiles.filter(p => p.smShot && p.src === sm).length },
          er: er && { ph: er.erenPhase, t: er.erenTitan, cds: er.cds.map(c => c > 0) } };
      });
      if (s.sm) { seen.smShots += s.sm.shots; s.sm.cds.forEach((c, i) => c && seen.smSkills.add(i)); if (s.sm.m) seen.smUlt = true; }
      if (s.er) { s.er.cds.forEach((c, i) => c && seen.erSkills.add(i)); if (s.er.t) seen.erTitan = true; if (s.er.ph === 'hook' || s.er.ph === 'hookPrep') seen.erHook = true; }
      if (t === 30) await shot('bots_both');
      await sleep(500);
    }
    const r = { smShots: seen.smShots, smSkills: [...seen.smSkills], smUlt: seen.smUlt, erSkills: [...seen.erSkills], erTitan: seen.erTitan, erHook: seen.erHook };
    check('BOTS.libertador', r.smShots > 0 && r.smSkills.length >= 2 && r.smUlt, r);
    check('BOTS.eren', r.erSkills.length >= 2 && r.erTitan, r);
    check('BOTS.sin_errores', errCount() === e0, errors.slice(e0));
  }

  const pass = checks.filter(c => c.ok).length;
  console.log(`\n${pass}/${checks.length} OK   errores de página: ${errors.length}`);
  fs.writeFileSync(path.join(outdir, 'champs_se.json'), JSON.stringify({ checks, errors }, null, 1));
  await browser.close();
  process.exit(pass === checks.length ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
