'use strict';
// BOSS + ARENA = ENCUENTRO — pruebas de los ganchos "player"/"phase" de BOSS_BLUEPRINTS que el validador de
// peleas (tools/bible/boss-validator.js) no puede provocar solo, de las identidades nuevas de jefe y de los
// arreglos de la auditoría de jefes. Cada prueba arma la situación con el motor real y comprueba el EFECTO
// (EXPUESTO, daño, aturdimiento, estado de la arena), no solo que se contó el gancho.
//   node tools/bosses/t_boss_arena_hooks.js          (levanta su propio servidor; BOSS_HOOKS_PORT, CHROMIUM_PATH)
const assert = require('node:assert/strict'), {spawn} = require('node:child_process'), path = require('node:path');
let chromium; try { ({chromium} = require('playwright')); } catch (e) { ({chromium} = require('/opt/node22/lib/node_modules/playwright')); }
const ROOT = path.resolve(__dirname, '../..'), PORT = +(process.env.BOSS_HOOKS_PORT || 8839);
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], {cwd: ROOT, stdio: 'ignore'});
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0;
const ok = (name, cond, detail) => { assert(cond, name + (detail ? ' — ' + JSON.stringify(detail) : '')); pass++; console.log('PASS', name); };

(async () => {
  await sleep(500);
  const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || chromium.executablePath(), args: ['--no-sandbox']});
  try {
    const page = await browser.newPage({viewport: {width: 844, height: 390}}), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`http://127.0.0.1:${PORT}/`, {waitUntil: 'domcontentloaded'});
    await page.waitForFunction(() => typeof startRun === 'function' && typeof BOSS_BLUEPRINTS !== 'undefined' && typeof bossArenaEvent === 'function', null, {timeout: 120000});
    await sleep(1200);
    const E = (fn, a) => page.evaluate(fn, a);
    // arranca una arena en un nivel, con 4 héroes invulnerables y sin azar
    const start = (arena, level) => E(([a, lv]) => {
      let sx = 777; Math.random = () => { sx ^= sx << 13; sx >>>= 0; sx ^= sx >> 17; sx ^= sx << 5; sx >>>= 0; return sx / 4294967296; };
      for (const ck in save.champions) { const s = save.champions[ck]; s.unlocked = true; s.level = 20; }
      selectedClass = 'tanque'; currentArena = a; lobbyAllies = ['soporte', 'mago', 'guerrero']; netMatch = null;
      startRun(lv); setState('playing');
      for (const h of heroes) { h.maxHp = 5e5; h.hp = h.maxHp; }
      return true;
    }, [arena, level]);
    const tick = (n) => E(n => { for (let i = 0; i < n; i++) { for (const h of heroes) { h.hp = h.maxHp; h.alive = true; } if (state !== 'playing') break; update(16); } return state; }, n);

    // ---- 1. Ficha: todas las entradas válidas (sin FAIL) y los ids de ganchos con prefijo de su tipo ----
    const bp = await E(() => BOSS_BLUEPRINT_ORDER.map(t => ({t, issues: validateBossBlueprint(t).filter(i => i.level === 'FAIL'), ids: BOSS_BLUEPRINTS[t].hooks.map(h => h.id)})));
    ok('BOSS_BLUEPRINTS: ' + bp.length + ' fichas sin FAIL', bp.every(b => !b.issues.length), bp.filter(b => b.issues.length));
    ok('cada gancho lleva el prefijo de su jefe', bp.every(b => b.ids.every(id => id.startsWith(b.t + '.'))));
    ok('cada ficha PASS tiene al menos un gancho con su arena', await E(() => BOSS_BLUEPRINT_ORDER.every(t => BOSS_BLUEPRINTS[t].status.grade !== 'PASS' || BOSS_BLUEPRINTS[t].hooks.length > 0)));

    // ---- 2. Kraken Joven: charco cargado con él adentro → EXPUESTO; tentáculo en punto fijo; agarre con aviso ----
    await start('acuatica', 6);
    let r = await E(() => {
      const z = ACU.zones.find(q => q.type === 'charco'); if (!z) return {noCharco: true};
      const k = spawnEnemy('kraken_joven', false, false); k.x = z.x; k.y = z.y; k.tentacleCd = 9e9; k.grabCd = 9e9; k.sweepCd = 9e9; k.summonCd = 9e9;
      const hp0 = k.hp; acuDischarge(z);
      return {exp: k._expT, vuln: k.crashVuln, dmg: hp0 - k.hp, hook: bossArenaCount('kraken_joven.charco')};
    });
    ok('Kraken en el charco que descarga: EXPUESTO', !r.noCharco && r.exp > 3000 && r.vuln && r.dmg > 0 && r.hook === 1, r);
    r = await E(() => {
      const k = enemies.find(e => e.alive && e.type === 'kraken_joven'); k._expT = 0; k.crashVuln = false; k.stunTimer = 0;
      const h = heroes[1]; h.x = k.x + 200; h.y = k.y; k.tentacleCd = 0; k.grabCd = 9e9;
      for (let i = 0; i < 3; i++) update(16);
      const pt = k.tentaclePt && {x: k.tentaclePt.x, y: k.tentaclePt.y}, tgt = k.tentacleTarget;
      // el objetivo se corre 120 u: el golpe cae donde ESTABA, no lo persigue
      const hp0 = tgt.hp; tgt.x += 120; for (const o of heroes) if (o !== tgt) { o.x = k.x - 600; o.y = k.y - 400; }
      for (let i = 0; i < 50; i++) { tgt.hp = hp0; update(16); if (!(k.tentacleTelegraph > 0)) break; }
      return {pt, moved: Math.hypot(tgt.x - pt.x, tgt.y - pt.y), hpLost: hp0 - tgt.hp, follows: !!(k.tentaclePt)};
    });
    ok('Kraken: el tentáculo golpea un punto fijo (el que se corre lo esquiva)', r.pt && r.moved > 64 && r.hpLost === 0, r);
    r = await E(() => {
      const k = enemies.find(e => e.alive && e.type === 'kraken_joven'); k.tentacleCd = 9e9; k.grabCd = 0; k.grabbedHero = null;
      const h = heroes[1]; h.x = k.x + 150; h.y = k.y; h.stunTimer = 0;
      update(16);
      const warned = k.grabWarn > 0, grabbedEarly = !!k.grabbedHero, hx = h.x, hy = h.y;
      for (let i = 0; i < 60; i++) { h.x = hx; h.y = hy; update(16); }   // se queda adentro (los bots lo esquivarían)
      return {warned, grabbedEarly, grabbed: !!k.grabbedHero};
    });
    ok('Kraken: el agarre avisa 0,75 s antes (y agarra si te quedás)', r.warned && !r.grabbedEarly && r.grabbed, r);
    r = await E(() => {
      const k = enemies.find(e => e.alive && e.type === 'kraken_joven'); k.grabCd = 9e9; k.summonCd = 0; k.summonWarn = 0;
      const n0 = enemies.filter(e => e.alive && (e.type === 'tiburon_joven' || e.type === 'cangrejo_acorazado')).length, c0 = bossArenaCount('kraken_joven.corriente');
      // se cuentan los que APARECEN (los aliados pueden matar uno antes de que termine la ventana)
      let born = 0; const sp0 = window.spawnEnemy; window.spawnEnemy = function (t) { const e = sp0.apply(this, arguments); if (t === 'tiburon_joven' || t === 'cangrejo_acorazado') born++; return e; };
      let pt, cur, before;
      try {
        update(16); pt = k.summonPt && {x: k.summonPt.x, y: k.summonPt.y}; cur = k.summonPt && k.summonPt.cur;
        before = born;
        for (let i = 0; i < 70; i++) update(16);
      } finally { window.spawnEnemy = sp0; }
      return {pt, cur, before, after: born, alive: enemies.filter(e => e.alive && (e.type === 'tiburon_joven' || e.type === 'cangrejo_acorazado')).length - n0, hook: bossArenaCount('kraken_joven.corriente') - c0, inFlow: pt ? !!acuFlowAt(pt.x, pt.y) || ACU.zones.some(z => z.type === 'remolino' && Math.hypot(z.x - pt.x, z.y - pt.y) < 120) : false};
    });
    ok('Kraken: refuerzos con aviso, salen de una corriente real', r.cur && r.before === 0 && r.after >= 2 && r.hook === 1 && r.inFlow, r);

    // ---- 3. Leviatán: MAREA invierte corrientes y carga charcos; el tentáculo del charco es conductor; embestida al objetivo ----
    await start('acuatica', 10);
    r = await E(() => {
      levelTimer = levelDuration; for (let i = 0; i < 40 && !(boss && boss.alive && bossActive); i++) update(16);
      const L = acuLevBoss(); if (!L) return {noBoss: true};
      for (let i = 0; i < 5; i++) update(16);
      const lin = ACU.zones.find(z => z.type === 'lineal'), d0 = lin && [lin.dx, lin.dy];
      L.acuaticaPhase = 2; L.bossPhase = 2; update(16);
      const ch = ACU.zones.filter(z => z.type === 'charco');
      return {d0, d1: lin && [lin.dx, lin.dy], charged: ch.length && ch.every(z => z.warn > 0), hook: bossArenaCount('leviatan.marea'), armInCharco: acuLevArms().some(a => ch.some(z => Math.hypot(a.x - z.x, a.y - z.y) < 40))};
    });
    ok('Leviatán: la MAREA invierte las corrientes y carga los charcos', !r.noBoss && r.d0 && r.d1[0] === -r.d0[0] && r.d1[1] === -r.d0[1] && r.charged && r.hook === 1, r);
    r = await E(() => {
      const z = ACU.zones.find(q => q.type === 'charco'); const a = acuLevArms()[0]; a.x = a._ax = z.x; a.y = a._ay = z.y;
      const hp0 = a.hp, c0 = bossArenaCount('leviatan.charco'); acuDischarge(z);
      return {lost: (hp0 - a.hp) / a.maxHp, hook: bossArenaCount('leviatan.charco') - c0};
    });
    ok('Leviatán: un tentáculo en el charco pierde ~45 % con la descarga', r.lost > 0.4 && r.hook >= 1, r);
    r = await E(() => {
      const L = acuLevBoss(); L.bossWind = null; L.bossCharge = null;
      const far = heroes[2]; far.x = L.x + 300; far.y = L.y + 40; player.x = -L.x; player.y = -L.y;
      BOSS_ATTACKS.levCharge(L, far, 300);
      return {fx: L.fx, fy: L.fy, want: [(far.x - L.x) / Math.hypot(far.x - L.x, far.y - L.y), (far.y - L.y) / Math.hypot(far.x - L.x, far.y - L.y)], pose: L._levPose};
    });
    ok('Leviatán: la embestida apunta al objetivo del director (no al jugador local) y usa su pose', Math.abs(r.fx - r.want[0]) < 1e-6 && Math.abs(r.fy - r.want[1]) < 1e-6 && r.pose === 'dash', r);

    // ---- 4. Caballero: sus trampas lo alcanzan (daño + aturdimiento, 1 vez cada 9 s) ----
    await start('fortaleza', 10);
    r = await E(() => {
      const k = enemies.find(e => e.alive && e.type === 'caballero'); if (!k) return {none: true};
      k.fortDormant = false; k.dmgTakenMult = 1; k.stunTimer = 0;
      const hp0 = k.hp; _fortTrapHitEnemy(k, 0.2, {x: k.x, y: k.y});
      const a = {lost: hp0 - k.hp, stun: k.stunTimer, hook: bossArenaCount('caballero.trampa')};
      k.stunTimer = 0; const hp1 = k.hp; _fortTrapHitEnemy(k, 0.2, {x: k.x, y: k.y});
      a.second = hp1 - k.hp;
      k.dmgTakenMult = 0; k._trapCd = 0; const hp2 = k.hp; _fortTrapHitEnemy(k, 0.2, {x: k.x, y: k.y}); a.immune = hp2 - k.hp;
      return a;
    });
    ok('Caballero: una trampa en marcha lo daña y aturde', !r.none && r.lost > 0 && r.stun >= 1000 && r.hook === 1, r);
    ok('Caballero: no se encadena (enfriamiento) y no lo toca dormido/inmune', r.second === 0 && r.immune === 0, r);

    // ---- 5. Guardián del Laberinto: Laberinto de Piedra + pisotón que lo derriba (EXPUESTO) ----
    await start('laberinto', 6);
    r = await E(() => {
      const g = spawnEnemy('guardian_laberinto', false, false); const h = heroes[1]; g.x = 0; g.y = 0; h.x = 260; h.y = 0;
      dt_boss = 16; g._glRing = 0; const acted = labGuardTick(g, h, 260);
      for (let i = 0; i < 60; i++) { for (const o of heroes) o.hp = o.maxHp; update(16); }
      const pil = labGuardPillars(); const onHero = pil.some(w => heroes.some(o => o.alive && Math.hypot(o.x - w.x, o.y - w.y) < w.r + (o.radius || 18)));
      return {acted, n: pil.length, onHero, hook: bossArenaCount('guardian_laberinto.muro')};
    });
    ok('Guardián del Laberinto: levanta el anillo de pilares (nunca encima de nadie)', r.acted && r.n >= 6 && !r.onHero && r.hook >= 1, r);
    r = await E(() => {
      const g = enemies.find(e => e.alive && e.type === 'guardian_laberinto'); const w = labGuardPillars()[0];
      g.x = w.x + 60; g.y = w.y; g._expT = 0; const n0 = labGuardPillars().length;
      labGuardStompResolved(g, 175); update(16);
      return {exp: g._expT, broke: n0 - labGuardPillars().length, hook: bossArenaCount('guardian_laberinto.derrumbe')};
    });
    ok('Guardián del Laberinto: su pisotón junto a los pilares los derriba y queda EXPUESTO', r.exp > 3000 && r.broke >= 1 && r.hook === 1, r);

    // ---- 6. Hechicero Supremo: grietas conjuradas (fisuras reales), escudo, sellar → EXPUESTO ----
    await start('infernal', 9);
    r = await E(() => {
      const e = hechSpawnSubboss(); e.cine = null; const h = heroes[1];
      const ok1 = hechRiftOpen(e, h); const f = INF.fis.find(q => q.hech);
      f.warn = 0; hechRiftRule(e);
      return {ok1, real: !!f && f.kind === 'inf_fissure' && f.stage === 2, near: f && Math.hypot(f.x - h.x, f.y - h.y), shield: e._encMult, hook: bossArenaCount('hechicero_supremo.fisura')};
    });
    ok('Hechicero: abre una fisura real cerca de un guardián y se alimenta (escudo)', r.ok1 && r.real && r.near >= 150 && r.near <= 400 && r.shield < 0.8 && r.hook === 1, r);
    r = await E(() => {
      const e = enemies.find(o => o.alive && o.type === 'hechicero_supremo'); const f = INF.fis.find(q => q.hech && !q.done);
      f.done = true; CTX_KINDS.inf_fissure.onComplete(f, [heroes[1]]); hechRiftRule(e);
      return {exp: e._expT, shield: e._encMult, hook: bossArenaCount('hechicero_supremo.sello')};
    });
    ok('Hechicero: sellar su grieta lo deja EXPUESTO y sin escudo', r.exp > 3000 && r.shield === 1 && r.hook === 1, r);
    ok('Hechicero: "Grieta Conjurada" está en su rotación', await E(() => BOSS_DESIGNS.hechicero_supremo.phases.every(p => p.rot.includes('hsRift'))));

    // ---- 7. Doppelgängers: atados a runas; contener la runa → EXPUESTO ----
    await start('bosque', 9);
    r = await E(() => {
      const dops = ['doblador_guerrero', 'doblador_arquera', 'doblador_picaro', 'doblador_clerigo'].map(t => spawnEnemy(t, false, false));
      activeChampion = dops[3]; bosDoppelBind(dops); bosDoppelRule();
      const bound = BOS.runes.filter(r => r.dop).length;
      const cl = dops[3], r = BOS.runes.find(q => q.dop === 'doblador_clerigo');
      const shield = cl._encMult; const hp0 = cl.hp; damageEnemy(cl, 100, {src: heroes[1], critChanceOverride: 0}); const shieldedHit = hp0 - cl.hp;
      CTX_KINDS.bos_rune.onComplete(r, [heroes[1]]); bosDoppelRule();
      return {bound, shield, shieldedHit, exp: cl._expT, after: cl._encMult, hook: bossArenaCount('doblador_guerrero.contencion'), hookB: bossArenaCount('doblador_guerrero.runas')};
    });
    ok('Doppelgängers: cada uno atado a una runa encendida, con escudo', r.bound === 4 && r.shield === 0.6 && r.hookB === 1, r);
    ok('Doppelgängers: contener su runa → EXPUESTO y sin escudo', r.exp > 3000 && r.after === 1 && r.hook === 1, r);

    // ---- 7b. Guardianes nuevos de la fábrica: Tundraverx, Esqueleto Cornudo, Demonio Menor, Maestro ----
    await start('hielo', 6);
    r = await E(() => {
      const d = spawnEnemy('dragon_hielo', false, true); const b = HIE.br.find(q => q.lit); d.x = b.x + 30; d.y = b.y; d._expT = 0;
      hieTundraRule(d, 16); const melt = d._encMult;
      d.x = b.x + 900; d.y = b.y; hieTundraRule(d, 16); const scale = d._encMult;
      // aliento hacia un brasero encendido (con otro encendido: nunca el último)
      const lit0 = HIE.br.filter(q => q.lit).length; d.x = b.x - 150; d.y = b.y; hieTundraBreath(d, 1, 0, 260);
      return {melt, scale, lit0, lit1: HIE.br.filter(q => q.lit).length, out: !b.lit, hf: bossArenaCount('dragon_hielo.fuego'), hb: bossArenaCount('dragon_hielo.brasero')};
    });
    ok('Tundraverx: se derrite junto al fuego (×1,35) y lo protegen las escamas lejos (−30 %)', r.melt === 1.35 && r.scale === 0.7 && r.hf === 1, r);
    ok('Tundraverx: su aliento apaga el brasero del cono', r.out && r.lit1 === r.lit0 - 1 && r.hb === 1, r);
    await start('infernal', 4);
    r = await E(() => {
      const e = spawnEnemy('esqueleto_h', false, true); const sp = infGuardianSpawn(e);
      const W = labyrinthWalls[0]; if (!W) return {noWall: true, sp};
      // embestida que termina dentro de una barricada de basalto
      e.x = W.x - Math.cos(W.rot) * 0; e.y = W.y; e.minoCharge = true; e.bossCharge = {dx: 1, dy: 0, speed: 900, dur: 500, t: 0, hit: new Set(), mult: 1, o: {}, rgb: '1,1,1'};
      e.stunTimer = 0; for (let i = 0; i < 3 && e.bossCharge; i++) update(16);
      return {sp, stun: e.stunTimer, vuln: e.crashVuln, hook: bossArenaCount('esqueleto_h.barricada'), hf: bossArenaCount('esqueleto_h.fisura')};
    });
    ok('Esqueleto Cornudo: sale de una fisura y su embestida contra el basalto lo aturde', !r.noWall && r.sp && r.hf === 1 && r.stun > 1500 && r.vuln && r.hook === 1, r);
    await start('infernal', 7);
    r = await E(() => {
      const e = spawnEnemy('demonio_menor', false, true); infGuardianSpawn(e);
      const f = INF.fis.find(q => !q.done); f.warn = 0; e.x = f.x + 120; e.y = f.y; e._igFeed = 1e9;
      infGuardianTick(e, 16); const shield = e._encMult;
      f.done = true; CTX_KINDS.inf_fissure.onComplete(f, [heroes[1]]);
      return {shield, exp: e._expT, hook: bossArenaCount('demonio_menor.sello')};
    });
    ok('Demonio Menor: la fisura cercana lo protege y sellarla lo expone', r.shield === 0.75 && r.exp > 3000 && r.hook === 1, r);
    await start('ciudad', 9);
    r = await E(() => {
      const z = CM_SAFE.find(q => { const S = cmS.st[cmStructIdx(q.id)]; return S && S.st !== CM_ST.DESTROYED; }); if (!z) return {noSafe: true};
      const h = heroes[1]; h.x = z.x; h.y = z.y; const hp0 = h.hp;
      cmDrop('mae', h.x, h.y, 100, 10, 500, {follow: 2});
      for (let i = 0; i < 3; i++) { h.x = z.x; h.y = z.y; cmDropsUpdate(16); }
      return {lost: hp0 - h.hp, hook: bossArenaCount('cm_maestro.refugio'), inR: cmInRefuge(h.x, h.y)};
    });
    ok('Maestro: su marca no atraviesa el escudo de un refugio en pie', !r.noSafe && r.inR && r.lost === 0 && r.hook >= 1, r);

    // ---- 8. Cerbero (acto 1, encadenado): el anti-kite castiga fuera del alcance del lanzallamas ----
    await start('minas', 10);
    r = await E(() => {
      levelTimer = levelDuration; let e = null;
      for (let i = 0; i < 900 && !(e = enemies.find(o => o.alive && o.type === 'mn_cerbero' && mnS.cb.st === 'fight')); i++) { for (const h of heroes) h.hp = h.maxHp; update(16); }
      if (!e) return {none: true};
      for (const h of heroes) { h.x = e.x + 40; h.y = e.y + 520; }   // fuera del lanzallamas (400), dentro del viejo kiteR (640)
      const d0 = mnS.drops.length; let rain = 0;
      for (let i = 0; i < 300; i++) { for (const h of heroes) { h.hp = h.maxHp; h.x = e.x + 40; h.y = e.y + 520; } update(16); rain = Math.max(rain, mnS.drops.filter(D => D.k === 'meteor').length); }
      return {act: mnS.cb.act, rain};
    });
    ok('Cerbero encadenado: quedarse fuera de su alcance ya no es un lugar seguro', !r.none && r.act === 1 && r.rain > 0, r);

    // ---- 9. HUD de jefes: forma actual (designKey), barra del Titán, Jinete fuera del Bosque ----
    await start('infernal', 10);
    r = await E(() => {
      const e = spawnEnemy('demonio_mayor', true); boss = e; bossActive = true; e.designKey = 'demonio_mayor'; updateBossHud(16);
      const ep0 = document.getElementById('boss-epithet').textContent;
      e.designKey = 'demonio_final'; e.name = 'Rey de la Horda — Forma Final'; updateBossHud(16);
      const ep1 = document.getElementById('boss-epithet').textContent, nm = document.getElementById('boss-name').textContent;
      const want = (BOSS_DESIGNS.demonio_final || {}).epithet;
      bossActive = false; boss = null; e.alive = false; updateBossHud(16);
      return {ep0, ep1, nm, want};
    });
    ok('HUD: al cambiar de forma (Gólem → Rey de la Horda) muestra el epíteto de la forma actual', r.want && r.ep1 === r.want && r.nm.startsWith('Rey de la Horda'), r);
    await start('minas', 8);
    r = await E(() => {
      levelTimer = levelDuration*0.31; let t = null;
      for (let i = 0; i < 400 && !(t = enemies.find(o => o.alive && o.type === 'mn_titan')); i++) { for (const h of heroes) h.hp = h.maxHp; update(16); }
      updateBossHud(16);
      return {titan: !!t, hidden: document.getElementById('boss-hud').classList.contains('hidden'), name: document.getElementById('boss-name').textContent};
    });
    ok('HUD: el Titán de Piedra muestra su barra grande', r.titan && !r.hidden && /Titán/.test(r.name), r);
    r = await E(() => {
      currentArena = 'divina'; const j = spawnEnemy('jinete_sin_cabeza', true); hudBoss = j; bossHudStatus();
      const t = document.getElementById('boss-status').textContent; currentArena = 'bosque'; bossHudStatus();
      const t2 = document.getElementById('boss-status').textContent; j.alive = false; hudBoss = null;
      return {divina: t, bosque: t2};
    });
    ok('HUD: el Jinete no promete "Vida 1/2" fuera de las Ruinas', !/Vida/.test(r.divina) && /Vida 1\/2/.test(r.bosque), r);

    // ---- 10. Música: la capa de fase sigue la fase real (Minotauro) ----
    await start('laberinto', 10);
    r = await E(() => {
      levelTimer = levelDuration; for (let i = 0; i < 60 && !(boss && boss.alive && bossActive); i++) update(16);
      const m = boss; if (!m) return {none: true};
      const p0 = m.bossPhase; m.hp = m.maxHp*0.45; for (let i = 0; i < 3; i++) update(16);
      return {p0, p1: m.bossPhase};
    });
    ok('Minotauro: bossPhase sube con su fase (la música escala)', !r.none && r.p0 === 1 && r.p1 >= 2, r);

    assert.deepEqual(errors, [], 'sin errores de página');
    console.log(`\n${pass} pruebas OK`);
  } finally { await browser.close(); server.kill(); }
})().catch(e => { console.error(e.message || e); process.exitCode = 1; server.kill(); });
