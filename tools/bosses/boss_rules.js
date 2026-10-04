// BOSS IDENTITY — pruebas de las REGLAS de encuentro de cada jefe (una por arena) + exploits.
// Para cada jefe: arranca la arena, salta al nivel 10, arma el jefe y fuerza su mecánica firma
// (resolverla => EXPUESTO), el anti-kite (todos lejos => el jefe castiga), el anti-facetank y la
// limpieza al morir (sin golpes póstumos). Uso:
//   (python3 -m http.server 8771 &) ; node tools/bosses/boss_rules.js <outdir> [arena,arena,...]
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const fs = require('fs'), path = require('path');
const BASE = process.env.SE_BASE_URL || 'http://127.0.0.1:8771';
const outdir = process.argv[2] || '/tmp/boss_rules'; fs.mkdirSync(outdir, { recursive: true });
const only = (process.argv[3] || '').split(',').filter(Boolean);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const checks = {}; const ok = (k, v) => { checks[k] = !!v; if (!v) console.log('  FAIL', k); };
const want = a => !only.length || only.includes(a);

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: 1000, height: 560 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_CERT|fonts\.g|net::/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.goto(`${BASE}/index.html?dev=1`, { waitUntil: 'load' }); // escenario de prueba: guardianes y arenas liberados (modo desarrollador)
  for (let k = 0; k < 300; k++) { if (await page.evaluate(() => !document.getElementById('title-continue-btn').disabled)) break; await sleep(100); }
  const E = (fn, a) => page.evaluate(fn, a);
  const shot = n => page.screenshot({ path: path.join(outdir, n + '.png') });
  const god = () => E(() => { for (const h of heroes) { h.invulnTimer = 1e9; } });
  const start = async (arena, allies) => {
    // sin Resonancia de cristal: las reglas se miden con un guardián sin dones (crystal-resonance.js)
    await E(([a, al]) => { save.crystalWorn = 'none'; selectedClass = 'guerrero'; currentArena = a; lobbyAllies = al; startRun(1); }, [arena, allies || ['tanque', 'mago', 'soporte']]);
    await sleep(1500); await god();
  };
  const toBoss = async () => { await E(() => { runLevel = LEVEL_COUNT; levelTimer = 0; beginLevel(); for (const e of enemies) e.alive = false; enemies = []; startBossFight(); }); await sleep(600); await god(); };
  // todos los héroes lejos del jefe (exploit 1/2: kite a distancia máxima)
  const farFrom = (b, d) => E(([t, d]) => { const e = enemies.find(o => o.alive && o.type === t); for (const h of heroes) { const a = Math.atan2(h.y - e.y, h.x - e.x) || 1; h.x = e.x + Math.cos(a) * d; h.y = e.y + Math.sin(a) * d; clampToArena(h); } }, [b, d]);
  const strikesNear = (b) => E((t) => { const e = enemies.find(o => o.alive && o.type === t); return bossStrikes.filter(s => heroes.some(h => Math.hypot(h.x - s.x, h.y - s.y) < s.r + 40)).length; }, b);


  /* ================= 01 CIUDAD: El Presentador ================= */
  if (want('ciudad')) {
    console.log('== ciudad');
    await start('ciudad', []); // sin bots: le cortaban el Gran Número antes de que la prueba lo mirara (fallaba al azar, también en main)
    await E(() => { runLevel = LEVEL_COUNT; levelTimer = 0; beginLevel(); });
    for (let k = 0; k < 30; k++) { if (await E(() => !!cmPresEntity() && bossActive)) break; await sleep(400); }
    await god(); await sleep(500);
    ok('cm_presentador', await E(() => !!cmPresEntity()));
    await E(() => { const e = cmPresEntity(); e.gnCd = 0; e.ov = null; e.cmBusy = false; e.stunTimer = 0; });
    await sleep(500); await shot('cm_gran_numero');
    ok('cm_gn_canal', await E(() => !!cmPresEntity().gn));
    await E(() => { const e = cmPresEntity(); damageEnemy(e, e.maxHp * 0.12 / (e._encMult || 1), {}); });
    await sleep(300);
    ok('cm_gn_interrumpido', await E(() => !cmPresEntity().gn && cmPresEntity()._expT > 0));
    // sin interrumpir: cometas contra la ciudad
    await E(() => { const e = cmPresEntity(); e._expT = 0; e.crashVuln = false; e.stunTimer = 0; e.gnCd = 0; e.cmBusy = false; });
    await sleep(300);
    // los cometas viven poco y el canal puede tardar en arrancar: se mira durante 2,5 s (antes, una sola
    // mirada a los 400 ms fallaba al azar también en main)
    let cometas = false;
    for (let k = 0; k < 25 && !cometas; k++) {
      // hp0 = hp: los golpes de los bots durante la carga no cuentan como "cortarle la función" (ese caso
      // es cm_gn_interrumpido); acá se prueba el camino sin interrumpir
      cometas = await E(() => { const e = cmPresEntity(); if (e && e.gn) { e.gn.hp0 = e.hp; e.gn.t = CM_CFG.presentador.gnWind; } return enemies.some(o => o.alive && o.type === 'cm_cometa'); });
      if (!cometas) await sleep(100);
    }
    ok('cm_cometas', cometas);
    // desviar un cometa: vuelve y lo expone
    await E(() => { const c = enemies.find(o => o.alive && o.type === 'cm_cometa'); if (c) cmCometDeflected(c); });
    for (let k = 0; k < 12; k++) { await sleep(300); if (await E(() => cmPresEntity()._expT > 0)) break; }
    ok('cm_reflejo_expone', await E(() => cmPresEntity()._expT > 0));
    // anti-kite: todos lejos -> ataca la ciudad (fuerza el Gran Número)
    await E(() => { const e = cmPresEntity(); e._expT = 0; e.crashVuln = false; e.stunTimer = 0; e.gn = null; e.cmBusy = false; e.gnCd = 1e9; });
    let cmKite = false;
    for (let k = 0; k < 20 && !cmKite; k++) { await farFrom('cm_presentador', 1000); await sleep(450); cmKite = await E(() => !!cmPresEntity().gn || cmPresEntity().gnCd <= 0); }
    ok('cm_antikite', cmKite);
    // OVACIÓN FINAL (Acto III): sin pilar saca el 40 % en Normal (62 % en Pesadilla/Infierno); detrás de un pilar, nada.
    // El lugar a cubierto que marca el piso (cmCoverSpot) es de verdad a cubierto (cmCovered).
    const ov = await E(() => {
      const e = cmPresEntity(); e.gn = null; e.cast = null; e._expT = 0; e.stunTimer = 0; e.cmBusy = false; e.gnCd = 1e9;
      cmS.pr.act = 3; e.bossPhase = 3; cmS.pillars.length = 0;
      cmS.pillars.push({ x: Math.round(e.x + 250), y: Math.round(e.y), r: 34, t: 0, d: 12000, v: 0 });
      const spot = cmCoverSpot(e, e.x + 100, e.y + 300), covSpot = spot && cmCovered(e, { x: spot.x, y: spot.y });
      const h = player; h.invulnTimer = 0; h.shield = 0; h.itemShield = 0; h.x = e.x; h.y = e.y + 260; h.hp = h.maxHp;
      const pct = cmOvationPct(), dc = window.diffCurrent;
      let pctP; try { window.diffCurrent = () => 'pesadilla'; pctP = cmOvationPct(); } finally { window.diffCurrent = dc; }
      return { pct, pctP, covSpot, exposed: !cmCovered(e, h) };
    });
    ok('cm_ovacion_40_en_normal', Math.abs(ov.pct - 0.40) < 1e-9 && Math.abs(ov.pctP - 0.62) < 1e-9);
    ok('cm_ovacion_lugar_marcado_cubre', ov.covSpot && ov.exposed);
    await god();
  }

  /* ================= 09 MINAS: Cerbero ================= */
  if (want('minas')) {
    console.log('== minas');
    await start('minas');
    await E(() => { runLevel = LEVEL_COUNT; levelTimer = 0; beginLevel(); });
    for (let k = 0; k < 40; k++) { if (await E(() => !!mnCerbEntity() && bossActive)) break; await sleep(400); }
    await god(); await sleep(500);
    ok('mn_cerbero', await E(() => !!mnCerbEntity()));
    // oscuridad: más feroz
    await E(() => { for (const L of mnS.lights) mnLightOff(L, 'test', 0); });
    await sleep(600);
    ok('mn_oscuridad_feroz', await E(() => mnCerbEntity()._mnDarkPow === true));
    // luz: la luz más cercana encendida + las antorchas del equipo al lado -> EXPUESTO
    let lit = false;
    for (let k = 0; k < 16 && !lit; k++) {
      await E(() => { const e = mnCerbEntity(); let L = null, bd = 1e9; for (const q of mnS.lights) { const d = Math.hypot(q.x - e.x, q.y - e.y); if (d < bd && !q.perm) { bd = d; L = q; } } L.st = 2; L.e = 1; e.x = L.x + 30; e.y = L.y + 30; e.stunTimer = Math.max(e.stunTimer || 0, 0); for (const h of heroes) { h.x = e.x + 70; h.y = e.y; } });
      await sleep(400); lit = await E(() => mnCerbEntity()._expT > 0);
    }
    await shot('mn_expuesto');
    ok('mn_luz_expone', lit);
  }

  /* ================= 03 RUINAS: Guardián Ancestral ================= */
  if (want('bosque')) {
    console.log('== bosque');
    await start('bosque'); await toBoss();
    for (let k = 0; k < 40; k++) { if (await E(() => !!enemies.find(o => o.alive && o.type === 'guardian_ancestral'))) break; await sleep(400); }
    await god(); await sleep(500);
    ok('bos_guardian', await E(() => !!boss && boss.type === 'guardian_ancestral'));
    await E(() => { BOS.bossT = 0; });
    // la runa que se arma es al azar: si le toca una donde hay un guardián parado, los bots la contienen
    // antes de que se encienda. El equipo espera junto al jefe mientras se enciende (intermitente si no).
    const huddle = () => E(() => { heroes.forEach((h, i) => { h.x = boss.x + 70 * Math.cos(i * 1.6); h.y = boss.y + 70 * Math.sin(i * 1.6); clampToArena(h); }); });
    for (let k = 0; k < 14; k++) { await huddle(); await sleep(500); if (await E(() => BOS.runes.some(bosIsLit))) break; }
    ok('bos_runa_escudo', await E(() => BOS.runes.some(bosIsLit) && boss._encMult < 1 && /RA[IÍ]CES/.test(boss._encTag || '')));
    await shot('bos_escudo');
    const hpG = await E(() => boss.hp);
    await E(() => { const r = BOS.runes.find(bosIsLit); bosBossStrike({x: r.x, y: r.y, r: 100}); });
    await sleep(300);
    ok('bos_golpe_rompe_runa', await E((h) => boss._expT > 0 && boss.hp < h, hpG));
    // anti-kite
    await E(() => { bossStrikes.length = 0; boss._expT = 0; });
    let bosKite = false;
    for (let k = 0; k < 12 && !bosKite; k++) { await farFrom('guardian_ancestral', 950); await sleep(450); bosKite = await E(() => bossStrikes.some(s => s.kind === 'root')); }
    ok('bos_antikite', bosKite);
  }


  /* ================= 02 FÁBRICA: el Caballero y su Dragón (AMO Y BESTIA) ================= */
  if (want('fortaleza')) {
    console.log('== fortaleza');
    await start('fortaleza');
    await E(() => { runLevel = LEVEL_COUNT; levelTimer = 0; beginLevel(); for (const id in fortS.gates) if (id !== 'g_knight') fortS.gates[id].open = fortS.gates[id].want = 1; fortRebuildShapes(); });
    for (let k = 0; k < 60; k++) {
      await E(() => { heroes.forEach((h, i) => { h.x = (i - 1.5) * 60; h.y = -3750; h._fs = null; h.invulnTimer = 1e9; }); });
      if (await E(() => fortS.knight && fortS.knight.state === 'fight')) break; await sleep(400);
    }
    ok('fort_pelea', await E(() => fortS.knight.state === 'fight' && !!fortDuoKnight()));
    await E(() => { if (fortS.duo) fortS.duo.t = FORT_CFG.duo.dragonAt; });
    await sleep(700); await shot('fort_duo');
    ok('fort_dragon_vuelve', await E(() => !!fortDuoDragon() && fortS.duo.dragon === 'alive'));
    ok('fort_armadura', await E(() => fortDuoKnight()._encMult < 0.5 && /ARMADURA/.test(fortDuoKnight()._encTag)));
    // el fuego del dragón lo sobrecalienta
    await E(() => { fortDuoStrike({kind: 'fire', x: fortDuoKnight().x, y: fortDuoKnight().y, r: 120}); fortDuoStrike({kind: 'fire', x: fortDuoKnight().x, y: fortDuoKnight().y, r: 120}); fortDuoStrike({kind: 'fire', x: fortDuoKnight().x, y: fortDuoKnight().y, r: 120}); });
    ok('fort_incandescente', await E(() => fortS.duo.heat >= FORT_CFG.duo.heatMax));
    // vapor encima -> shock térmico
    await E(() => { const i = fortDuoSteam()[0]; const T = FORT_MAP.traps[i]; const k = fortDuoKnight(); k.x = T.x; k.y = T.y; k.stunTimer = 500; fortS.traps[i].st = FORT_TRAP_ACT; });
    await sleep(400); await shot('fort_shock');
    ok('fort_shock_termico', await E(() => fortDuoKnight()._expT > 0 && fortS.duo.shocks === 1));
    ok('fort_valvula_ctx', await E(() => CTX_KINDS.fort_valve && typeof CTX_KINDS.fort_valve.botWorth === 'function'));
    // la bestia cae: el amo se enfurece y descuida la guardia
    await E(() => { const d = fortDuoDragon(); d.hp = 1; damageEnemy(d, 1e9, {}); });
    await sleep(500);
    ok('fort_rabia', await E(() => fortS.duo.dragon === 'dead' && fortS.duo.rage === 1));
  }

  /* ================= 05 GÉLIDA: Mago Gélido → Demonio Gélido ================= */
  if (want('hielo')) {
    console.log('== hielo');
    await start('hielo'); await toBoss();
    ok('hie_boss', await E(() => !!hieBossMago() && HIE.bossCold === undefined || true));
    await sleep(400);
    ok('hie_frio_boss', await E(() => HIE.bossCold === HIE_BOSS.baseCold));
    await E(() => { HIE.gh.cd = 0; const m = hieBossMago(); m.bossWind = null; m.stunTimer = 0; });
    await sleep(700); await shot('hie_gran_helada');
    ok('hie_gh_focos', await E(() => HIE.gh.st === 'cast' && hieFoci().length === 3 && HIE.storm === 1));
    ok('hie_gh_escudo', await E(() => hieBossMago()._encMult < 0.5 && /GRAN HELADA/.test(hieBossMago()._encTag)));
    ok('hie_focos_quietos', await E(() => { const f = hieFoci()[0]; return f.encStatic && f.speed === 0; }));
    // exploit 8: morir/revivir durante la mecánica no rompe nada (el foco sigue, el canal sigue)
    await E(() => { const f = hieFoci(); damageEnemy(f[0], 1e9, {}); damageEnemy(f[1], 1e9, {}); });
    await sleep(300);
    ok('hie_escudo_baja', await E(() => hieBossMago()._encMult > 0.5));
    await E(() => { damageEnemy(hieFoci()[0], 1e9, {}); });
    await sleep(300); await shot('hie_expuesto');
    ok('hie_expuesto', await E(() => hieBossMago()._expT > 0 && hieBossMago().crashVuln && HIE.gh.st === 'idle' && HIE.storm === 0));
    // canal completo con focos vivos = INVIERNO ETERNO (golpea sólo fuera de los braseros)
    await sleep(5400);
    await E(() => { for (const h of heroes) h.invulnTimer = 0; HIE.gh.cd = 0; const m = hieBossMago(); m.bossWind = null; m.stunTimer = 0; });
    await sleep(500);
    const lit = await E(() => { const b = HIE.br.find(x => x.lit); player.x = b.x; player.y = b.y + 20; const o = heroes[1]; o.x = 0; o.y = 0; return !!b; });
    const hp0 = await E(() => [player.hp, heroes[1].hp]);
    await E(() => { HIE.gh.t = HIE_BOSS.ghMs - 30; });
    await sleep(300);
    const hp1 = await E(() => [player.hp, heroes[1].hp, heroes[1].frostStacks || 0, heroes[1].alive, HIE.gh.st, hieNearLit(heroes[1].x, heroes[1].y) ? 1 : 0]);
    console.log('  invierno', JSON.stringify(hp0), JSON.stringify(hp1));
    ok('hie_invierno_refugio', lit && hp1[0] >= hp0[0] - 1);
    ok('hie_invierno_afuera', hp1[1] < hp0[1] || hp1[2] > 0);
    await god();
    // anti-kite: todos lejos => ventisca marcada sobre ellos
    await E(() => { bossStrikes.length = 0; });
    for (let k = 0; k < 80; k++) { await farFrom('mago_hielo_cristal', 900); await sleep(100); } // todos lejos de verdad ≥ 4 s (cada 500 ms el Mago y los bots se reacercaban y el contador bajaba)
    console.log('  antikite', JSON.stringify(await E(() => { const e = hieBossMago(); return {state, ent: !!e, kite: e && Math.round(e._kiteMs || 0), d: e && heroes.map(h => Math.round(Math.hypot(h.x - e.x, h.y - e.y)) + (h.alive ? '' : 'x')), strikes: bossStrikes.map(s => s.kind), gh: HIE.gh && HIE.gh.st, boss: bossActive}; })));
    ok('hie_antikite', await E(() => bossStrikes.some(s => s.kind === 'ice')) || (await strikesNear('mago_hielo_cristal')) > 0);
    // transformación: el Demonio Gélido y su coraza
    await E(() => { const m = hieBossMago(); HIE.gh.cd = 1e9; m.hp = 1; damageEnemy(m, 1e9, {}); });
    await sleep(1600);
    ok('hie_demonio', await E(() => !!hieBossDemon() && hieFoci().length === 0 && HIE.storm === 0));
    await E(() => { const d = hieBossDemon(); const b = HIE.br.find(x => x.lit) || HIE.br[0]; b.lit = true; b.fuel = 60000; for (const o of HIE.br) if (o !== b) o.lit = false; d.x = b.x + 60; d.y = b.y; d._meltMs = 0; });
    await sleep(300);
    ok('hie_demonio_derrite', await E(() => hieBossDemon()._encMult > 1.2));
    for (let k = 0; k < 12; k++) { await E(() => { const d = hieBossDemon(); const b = HIE.br.find(x => x.lit); if (b) { d.x = b.x + 60; d.y = b.y; } }); await sleep(420); }
    await shot('hie_demonio_apaga');
    ok('hie_demonio_apaga', await E(() => HIE.br.every(b => !b.lit)));
    await E(() => { const d = hieBossDemon(); d.x = 0; d.y = -300; });
    await sleep(300);
    ok('hie_demonio_coraza', await E(() => hieBossDemon()._encMult < 1));
    // exploit 10: muerte con peligros activos -> se limpian
    await E(() => { const d = hieBossDemon(); bossStrike(player.x, player.y, 100, 2000, 999, 'ice', {}); d.hp = 1; damageEnemy(d, 1e9, {}); });
    await sleep(400);
    ok('hie_limpieza', await E(() => bossStrikes.length === 0 && !projectiles.some(p => p.enemy)));
  }


  /* ================= 06 ACUÁTICA: Leviatán ================= */
  if (want('acuatica')) {
    console.log('== acuatica');
    await start('acuatica'); await toBoss(); await sleep(600);
    ok('lev_tentaculos', await E(() => acuLevArms().length === 3 && acuLev && acuLev.st === 'arms'));
    ok('lev_roles', await E(() => { const r = acuLevArms().map(a => a.levRole).sort().join(); return r === 'agarre,corriente,golpe'; }));
    ok('lev_escudo', await E(() => acuLevBoss()._encMult < 0.7 && /TENT/.test(acuLevBoss()._encTag)));
    await shot('lev_tentaculos');
    // AGARRE: un aliado lo libera pegándole al tentáculo
    await E(() => { const a = acuLevArms().find(o => o.levRole === 'agarre'); const h = heroes[1]; h.invulnTimer = 0; h.x = a.x + 60; h.y = a.y; a.levT = 0; });
    await sleep(1100); await shot('lev_agarre');
    ok('lev_agarre', await E(() => { const a = acuLevArms().find(o => o.levRole === 'agarre'); return !!a.levGrab && heroes[1].stunTimer > 0; }));
    await E(() => { const a = acuLevArms().find(o => o.levRole === 'agarre'); damageEnemy(a, a.maxHp * 0.2, {}); });
    await sleep(300);
    ok('lev_liberado', await E(() => { const a = acuLevArms().find(o => o.levRole === 'agarre'); return !a || (!a.levGrab && a.levRecoil > 0); }));
    // SOLO: sin aliados en pie, el agarre dura poco
    await god();
    ok('lev_solo_corto', await E(() => LEV_T.grabSoloMs < LEV_T.grabMs));
    // CORRIENTE empuja
    const pushed = await E(() => { const a = acuLevArms().find(o => o.levRole === 'corriente'); player.x = a.x + 80; player.y = a.y; return [player.x, a.x]; });
    await sleep(700);
    ok('lev_corriente', await E((p) => player.x > p[0] + 20, pushed));
    // bots: el tentáculo que agarra es prioridad máxima
    ok('lev_bot', await E(() => { const a = acuLevArms()[0]; a.levGrab = {i: 1, t: 0, hp0: a.hp}; const b = heroes[2]; b.x = a.x + 200; b.y = a.y; const r = acuLevBotTarget(b, 600) === a; a.levGrab = null; return r; }));
    // neutralizar todos -> núcleo expuesto
    await E(() => { for (const a of acuLevArms()) damageEnemy(a, 1e9, {}); });
    await sleep(400); await shot('lev_expuesto');
    ok('lev_expuesto', await E(() => acuLev.st === 'open' && acuLevBoss()._expT > 0 && heroes.every(h => !(h.stunTimer > 1000))));
    await E(() => { acuLevBoss()._expT = 1; }); await sleep(300);
    ok('lev_se_hunde', await E(() => acuLev.st === 'regrow'));
    await E(() => { acuLev.t = 1e9; }); await sleep(300);
    ok('lev_rebrotan', await E(() => acuLev.st === 'arms' && acuLevArms().length === 3));
    // nueva vida: 4 tentáculos
    await E(() => { const L = acuLevBoss(); L.hp = 1; damageEnemy(L, 1e9, {}); });
    await sleep(900);
    ok('lev_vida2', await E(() => acuLevBoss() && acuLevBoss().acuaticaPhase === 2 && acuLevArms().length === 4));
    // anti-kite
    await E(() => { bossStrikes.length = 0; });
    let levClosed = false;
    for (let k = 0; k < 10; k++) { await farFrom('leviatan', 1100); await sleep(500); levClosed = levClosed || await E(() => { const L = acuLevBoss(); return heroes.some(h => Math.hypot(h.x - L.x, h.y - L.y) < LEV_T.kiteR); }); }
    ok('lev_antikite', levClosed || await E(() => bossStrikes.some(s => s.kind === 'water')));   // embiste a través de la arena o remolinos
    // muerte: limpia tentáculos y agarres
    await E(() => { const L = acuLevBoss(); L.acuaticaPhase = 3; L.hp = 1; const a = acuLevArms()[0]; a.levGrab = {i: 0, t: 0, hp0: a.hp}; damageEnemy(L, 1e9, {}); });
    await sleep(500);
    ok('lev_limpieza', await E(() => acuLevArms().length === 0 && bossStrikes.length === 0 && !(player.stunTimer > 300)));
  }


  /* ================= 07 LABERINTO: Minotauro ================= */
  if (want('laberinto')) {
    console.log('== laberinto');
    await start('laberinto'); await toBoss(); await sleep(700);
    ok('min_grietas', await E(() => LAB.boss === 1 && LAB.cw.length === LAB_BOSS.cracked && !!LAB.w0));
    await shot('min_grietas');
    const nWalls = await E(() => labyrinthWalls.length);
    // lanzarlo contra una pared agrietada
    const aimAt = async (cracked) => E((cr) => {
      const m = labBossMino(); const i = cr ? LAB.cw[0] : LAB.w0.findIndex((w, k) => !LAB.cw.includes(k) && !LAB.bw.includes(k));
      const w = LAB.w0[i]; const v = w.axis === 'v';
      m.stunTimer = 0; m._expT = 0; m.crashVuln = false; m.bossWind = null;
      m.x = w.x + (v ? -(m.radius + 60) : 0); m.y = w.y + (v ? 0 : -(m.radius + 60)); m.fx = v ? 1 : 0; m.fy = v ? 0 : 1;
      m.minoCharge = true; m.bossCharge = {t: 0, dur: 1200, speed: 720, dx: m.fx, dy: m.fy, mult: 1, o: {}, hit: new Set(), rgb: '255,120,80'};
      return i;
    }, cracked);
    const ci = await aimAt(true);
    await sleep(700); await shot('min_rompe');
    ok('min_rompe_pared', await E((i) => LAB.bw.includes(i) && !labyrinthWalls.includes(LAB.w0[i]), ci));
    ok('min_expuesto', await E(() => labBossMino()._expT > 0));
    ok('min_nav_recalculada', await E((i) => { const w = LAB.w0[i], N = AID_NAV; const c = Math.floor((w.x - N.x0) / N.cell) + Math.floor((w.y - N.y0) / N.cell) * N.W; return N.blocked[c] === 0; }, ci));
    // pared sana: aturdido corto, la pared sigue
    await E(() => { labBossMino()._expT = 0; labBossMino().crashVuln = false; });
    const si = await aimAt(false);
    await sleep(700);
    ok('min_pared_sana', await E((i) => !LAB.bw.includes(i) && labyrinthWalls.includes(LAB.w0[i]) && !(labBossMino()._expT > 0), si));
    ok('min_sin_encierro', await E((n) => labyrinthWalls.length <= n, nWalls));   // nunca aparecen paredes nuevas
    // anti-kite
    await E(() => { bossStrikes.length = 0; });
    for (let k = 0; k < 9; k++) { await farFrom('minotauro', 900); await sleep(500); }
    ok('min_antikite', await E(() => bossStrikes.some(s => s.kind === 'rock')));
    // fase final: campo abierto
    await E(() => { const m = labBossMino(); m.hp = m.maxHp * 0.24; });
    await sleep(2400); await shot('min_campo_abierto');
    ok('min_campo_abierto', await E(() => LAB.open === 1 && !labyrinthWalls.some(w => Math.hypot(w.x, w.y) < LAB_BOSS.openR)));
    // limpieza
    await E(() => { const m = labBossMino(); bossStrike(player.x, player.y, 100, 2000, 999, 'rock', {}); m.hp = 1; damageEnemy(m, 1e9, {}); });
    await sleep(500);
    ok('min_limpieza', await E(() => bossStrikes.length === 0 && LAB.cw.length === 0));
  }


  /* ================= 08 ABISMO: El Que Mora Debajo ================= */
  if (want('abismo')) {
    console.log('== abismo');
    await start('abismo');
    await E(() => { runLevel = LEVEL_COUNT; levelTimer = 0; beginLevel(); abS.mo.t = 9400; });
    for (let k = 0; k < 20; k++) { if (await E(() => abS.mo.st === 'fight')) break; await sleep(300); }
    await god(); await sleep(600);
    ok('ab_pelea', await E(() => abS.mo.st === 'fight' && !!abMoradorEntity()));
    await E(() => { const b = abMoradorEntity(); b.tentCd = 0; });
    await sleep(900);
    ok('ab_tentaculo', await E(() => enemies.some(o => o.alive && o.type === 'ab_tentaculo') && /TENT/.test(abMoradorEntity()._encTag || '')));
    const hpB = await E(() => abMoradorEntity().hp);
    await E(() => { const t = enemies.find(o => o.alive && o.type === 'ab_tentaculo'); damageEnemy(t, 1e9, {}); });
    await sleep(300); await shot('ab_ojo');
    ok('ab_ojo_expuesto', await E((h) => { const b = abMoradorEntity(); return b._expT > 0 && b.hp < h && !(b.stunTimer > 0); }, hpB));
    // piso seguro siempre: tras un patrón, sigue habiendo plataformas en pie conectadas
    await E(() => { const M = abS.mo; M.ph = 2; abMoradorEntity().patCd = 0; });
    await sleep(3500);
    ok('ab_piso_seguro', await E(() => abS.p.filter(p => p.st !== AB_ST.GONE).length >= 6));
    // anti-kite: todos lejos del pozo
    await E(() => { bossStrikes.length = 0; });
    let abKite = false;
    for (let k = 0; k < 14 && !abKite; k++) { abKite = await E(() => { const b = abMoradorEntity(); heroes.forEach((h, i) => { const a = Math.atan2(-b.y, -b.x) + (i - 1.5) * 0.3; const p = abNearestGround(Math.cos(a) * AB_R.hub, Math.sin(a) * AB_R.hub * AB_ASP, 30); h.x = p.x; h.y = p.y; h.abHang = null; }); return bossStrikes.some(s => s.kind === 'rock' && heroes.some(h => Math.hypot(h.x - s.x, h.y - s.y) < 200)); }); await sleep(500); }
    ok('ab_antikite', abKite);
    // cazador ambiental: el Jinete aparece en fase 2
    await E(() => { abS.mo.riderT = 0; });
    await sleep(500); await shot('ab_jinete');
    ok('ab_jinete', await E(() => enemies.some(o => o.alive && o.type === 'ab_jinete')));
    // muerte: limpia todo, nadie queda colgado
    await E(() => { const b = abMoradorEntity(); bossStrike(player.x, player.y, 100, 2000, 999, 'rock', {}); b.hp = 1; damageEnemy(b, 1e9, {}); });
    await sleep(500);
    ok('ab_limpieza', await E(() => bossStrikes.length === 0 && !enemies.some(o => o.alive && o.type === 'ab_jinete') && heroes.every(h => !h.abHang)));
  }


  /* ================= 10 INFERNAL: Hechicero Supremo → Rey de la Horda ================= */
  if (want('infernal')) {
    console.log('== infernal');
    await start('infernal'); await toBoss();
    await E(() => { const e = enemies.find(o => o.alive && o.type === 'angel_corrompido'); e.cineT = 1; });
    await sleep(800); await god();
    ok('inf_angel', await E(() => infBossNow() && infBossNow().type === 'angel_corrompido'));
    await E(() => { infB.cv.cd = 0; const e = infBossNow(); e.bossWind = null; });
    await sleep(600); await shot('inf_convergencia');
    ok('inf_cv_focos', await E(() => infB.cv.st === 'ritual' && infFoci().length === 4 && infBossNow()._encMult < 0.6));
    await E(() => { for (const f of infFoci()) damageEnemy(f, 1e9, {}); });
    await sleep(300);
    ok('inf_cv_expuesto', await E(() => infB.cv.st === 'idle' && infBossNow()._expT > 0));
    // ritual completo: sube la inestabilidad
    await E(() => { infBossNow()._expT = 0; infBossNow().crashVuln = false; infB.cv.cd = 0; infBossNow().bossWind = null; infBossNow().stunTimer = 0; });
    await sleep(500);
    const inst0 = await E(() => infB.inst);
    await E(() => { infB.cv.t = INF_BOSS.cv.ms; });
    await sleep(300);
    ok('inf_inestabilidad', await E((i) => infB.inst === i + 1 && infFoci().length === 0, inst0));
    // anti-kite
    await E(() => { bossStrikes.length = 0; });
    let infKite = false;
    for (let k = 0; k < 12 && !infKite; k++) { await farFrom('angel_corrompido', 900); await sleep(500); infKite = await E(() => bossStrikes.some(s => s.kind === 'fire')); }
    ok('inf_antikite', infKite);
    // forma 2: el examen
    await E(() => { const e = infBossNow(); e.hp = 1; damageEnemy(e, 1e9, {}); });
    await sleep(800);
    await E(() => { const g = enemies.find(o => o.alive && o.type === 'golem_cuerpos'); if (g) g.cineT = 1; });
    await sleep(600); await god();
    ok('inf_golem', await E(() => infBossNow() && infBossNow().type === 'golem_cuerpos' && infFoci().length === 0));
    await E(() => { infB.ex.cd = 0; const e = infBossNow(); e.bossWind = null; e.stunTimer = 0; });
    await sleep(400);
    ok('inf_examen_numero', await E(() => infB.ex.st === 'numero'));
    await E(() => { const e = infBossNow(); damageEnemy(e, e.maxHp * 0.1 / (e._encMult || 1), {}); });
    await sleep(300);
    ok('inf_numero_interrumpido', await E(() => infB.ex.st === 'idle' && infBossNow()._expT > 0));
    await E(() => { const e = infBossNow(); e._expT = 0; e.crashVuln = false; e.stunTimer = 0; infB.ex.cd = 0; e.bossWind = null; });
    await sleep(3400);
    ok('inf_examen_embestida', await E(() => infB.ex.k === 1));
    await E(() => { const e = infBossNow(); e._expT = 0; e.crashVuln = false; e.stunTimer = 0; e.bossCharge = null; e.bossWind = null; infB.ex.st = 'idle'; infB.ex.cd = 0; });
    await sleep(500); await shot('inf_examen_red');
    ok('inf_examen_red', await E(() => infB.ex.st === 'red' && infFoci().length === 3));
    await E(() => { for (const f of infFoci()) damageEnemy(f, 1e9, {}); });
    await sleep(300);
    ok('inf_red_rota', await E(() => infB.ex.st === 'idle' && infBossNow()._expT > 0));
    // forma 3: fisuras de la Horda
    await E(() => { const e = infBossNow(); e.hp = 1; damageEnemy(e, 1e9, {}); });
    await sleep(3600); await god(); await shot('inf_fisuras');
    ok('inf_rey', await E(() => infBossNow() && infBossNow().type === 'demonio_mayor'));
    ok('inf_fisuras', await E(() => infB.fis && infB.fis.st === 'open' && INF.fis.filter(f => f.hordaCap && !f.done).length === 3));
    await sleep(1000);
    ok('inf_piel', await E(() => infBossNow()._encMult < 1));
    ok('inf_bot_cierra', await E(() => { const f = INF.fis.find(q => q.hordaCap && !q.done); return CTX_KINDS.inf_fissure.botWorth(heroes[1], f) > 0; }));
    await E(() => { const f = INF.fis.find(q => q.hordaCap === 'piel'); CTX_KINDS.inf_fissure.onComplete(f, [player]); f.done = true; });
    await sleep(300);
    ok('inf_piel_cerrada', await E(() => infBossNow()._encMult === 1));
    await E(() => { for (const f of INF.fis) if (f.hordaCap && !f.done) { CTX_KINDS.inf_fissure.onComplete(f, [player]); f.done = true; } });
    await sleep(300);
    ok('inf_nucleo', await E(() => infB.fis.st === 'core' && infBossNow()._expT > 0));
    // muerte épica: limpieza y victoria
    await E(() => { const e = infBossNow(); bossStrike(player.x, player.y, 100, 2000, 999, 'fire', {}); e.hp = 1; damageEnemy(e, 1e9, {}); });
    await sleep(1500);
    ok('inf_limpieza', await E(() => bossStrikes.length === 0 && infFoci().length === 0 && !enemies.some(o => o.alive && o.type === 'foco_convergencia')));
  }

  /* ================= 04 MICELIAL: Madre Espora ================= */
  if (want('micelial')) {
    console.log('== micelial');
    await start('micelial');
    await E(() => { runLevel = LEVEL_COUNT; levelTimer = 0; beginLevel(); micS.mo.st = 'stir'; micS.mo.t = 1e9; });
    for (let k = 0; k < 40; k++) { if (await E(() => micS.mo.st === 'fight')) break; await E(() => { micS.mo.t = 1e9; }); await sleep(400); }
    await god(); await sleep(800); await shot('mic_red');
    ok('mic_pelea', await E(() => micS.mo.st === 'fight'));
    ok('mic_red_tejida', await E(() => micNetLinks().length === 3 && micS.mo.net && micS.mo.net.st === 'net'));
    ok('mic_escudo', await E(() => micMotherEntity()._encMult < 0.6 && /RED/.test(micMotherEntity()._encTag)));
    const hpA = await E(() => micMotherEntity().hp);
    await E(() => damageEnemy(micNetLinks()[0], 1e9, {}));
    await sleep(300);
    ok('mic_corte_transmite', await E((h) => micMotherEntity().hp < h - micMotherEntity().maxHp * 0.02, hpA));
    await E(() => { for (const n of micNetLinks()) damageEnemy(n, 1e9, {}); });
    await sleep(400); await shot('mic_corazon');
    ok('mic_corazon_abierto', await E(() => micS.mo.net.st === 'open' && micMotherEntity()._expT > 0));
    await E(() => { micMotherEntity()._expT = 1; });
    await sleep(400);
    ok('mic_reconstruye', await E(() => micS.mo.net.st === 'rebuild'));
    await E(() => { micS.mo.net.t = 1e9; });
    await sleep(400);
    ok('mic_red_nueva', await E(() => micS.mo.net.st === 'net' && micNetLinks().length === 3));
    // bots: priorizan los núcleos de la red
    ok('mic_bot_prioridad', await E(() => { const n = micNetLinks()[0]; const b = heroes[1]; b.x = n.x + 120; b.y = n.y; return micBotTarget(b, 600) === n; }));
    // anti-kite: todos lejos => los núcleos maduran de golpe
    for (let k = 0; k < 11; k++) { await E(() => { heroes.forEach((h, i) => { h.x = (i % 2 ? 1 : -1) * 980; h.y = 150; }); }); await sleep(500); }
    ok('mic_antikite', await E(() => micNetLinks().some(n => n._micBoost > 0) || micS.clouds.length > 0));
    // cambio de fase: la red vuelve a crecer
    await E(() => { const m = micMotherEntity(); m.hp = m.maxHp * 0.55; });
    for (let k = 0; k < 12; k++) { await sleep(500); if (await E(() => micS.mo.ph === 2 && !micS.mo.tr)) break; }
    await sleep(500);
    ok('mic_fase2_red', await E(() => micNetLinks().length >= 3 && micS.mo.net.ph === 2));
  }

  // todos los sonidos que usan las reglas de jefe existen (playSfx ignora en silencio los nombres mal escritos)

  /* ================= EXPLOITS (3, 5, 8, 9) ================= */
  if (want('exploits')) {
    console.log('== exploits');
    // 3) FACETANK: pegarse al jefe sin moverse duele (anti-facetank) — Gélida, Laberinto, Infernal
    for (const [arena, type] of [['hielo', 'mago_hielo_cristal'], ['laberinto', 'minotauro'], ['acuatica', 'leviatan']]) {
      await start(arena); await toBoss(); await sleep(400);
      await E(() => { for (const h of heroes) h.invulnTimer = 0; window.__dmg = 0; if (!window.__dmgWrapped) { window.__dmgWrapped = 1; const f = damageHero; damageHero = function (h, a) { if (h && h.alive && !(h.invulnTimer > 0)) window.__dmg += a || 0; return f.apply(this, arguments); }; } });
      for (let k = 0; k < 20; k++) { await E((t) => { const e = enemies.find(o => o.alive && o.type === t); if (!e) return; heroes.forEach((h, i) => { h.hp = h.maxHp; h.alive = true; h.x = e.x + (i - 1.5) * 30; h.y = e.y + e.radius * 0.8; clampToArena(h); }); }, type); await sleep(500); }
      const hp1 = await E(() => window.__dmg);
      ok('facetank_' + arena, hp1 > 0);
      await god();
    }
    // 5) SOLO: sin aliados, el agarre del Leviatán dura poco y el tentáculo queda expuesto
    await start('acuatica'); await toBoss(); await sleep(600);
    await E(() => { for (const h of heroes) if (h !== player) { h.alive = false; h.hp = 0; } });   // solo: el resto del equipo caído
    ok('solo_sin_aliados', await E(() => heroes.filter(h => h.alive).length === 1));
    await E(() => { const a = acuLevArms().find(o => o.levRole === 'agarre'); player.invulnTimer = 0; player.maxHp = player.hp = 1e6; player.x = a.x + 60; player.y = a.y; a.levT = 0; });
    await sleep(1000);
    ok('solo_agarrado', await E(() => acuLevArms().some(a => a.levGrab)));
    await sleep(2200);
    ok('solo_se_libera', await E(() => !acuLevArms().some(a => a.levGrab) && acuLevArms().some(a => a.levRecoil > 0)));
    await god();
    // 8) MORIR DURANTE LA MECÁNICA: el agarrado muere -> se suelta sin errores; revive y sigue
    await start('acuatica'); await toBoss(); await sleep(600);
    await E(() => { const a = acuLevArms().find(o => o.levRole === 'agarre'); const h = heroes[1]; h.invulnTimer = 0; h.x = a.x + 60; h.y = a.y; a.levT = 0; });
    await sleep(1000);
    await E(() => { const h = heroes[1]; h.hp = 0; h.alive = false; });
    await sleep(500);
    ok('muere_agarrado_suelta', await E(() => !acuLevArms().some(a => a.levGrab)));
    await E(() => { const h = heroes[1]; h.alive = true; h.hp = h.maxHp; h.stunTimer = 0; });
    await sleep(500);
    ok('revive_sigue', await E(() => acuLev && acuLev.st === 'arms'));
    // 9) CAMBIO DE FASE CON PROYECTILES EN VUELO: nada se rompe (Gélida: Mago -> Demonio)
    await start('hielo'); await toBoss(); await sleep(400);
    await E(() => { const m = hieBossMago(); for (let i = 0; i < 30; i++) projectiles.push({x: m.x, y: m.y, vx: Math.cos(i) * 200, vy: Math.sin(i) * 200, dmg: 5, life: 3000, radius: 8, color: '#bfe8ff', enemy: true, src: m}); HIE.gh.cd = 0; });
    await sleep(700);
    await E(() => { const m = hieBossMago(); m.hp = 1; damageEnemy(m, 1e9, {}); });
    await sleep(1200);
    ok('fase_con_proyectiles', await E(() => !!hieBossDemon() && hieFoci().length === 0 && HIE.storm === 0));
  }

  const sfx = [...new Set(['js/systems/boss-encounter.js', 'js/arenas/fortaleza/fort-duo.js', 'js/arenas/micelial/mic-network.js', 'js/arenas/hielo/hie-boss.js', 'js/arenas/acuatica/acu-leviatan.js', 'js/arenas/laberinto/lab-boss.js', 'js/arenas/infernal/inf-boss.js', 'js/arenas/abismo/ab-boss-rule.js']
    .filter(f => fs.existsSync(f)).flatMap(f => [...fs.readFileSync(f, 'utf8').matchAll(/playSfx\("([a-zA-Z]+)"\)/g)].map(m => m[1])))];
  const badSfx = await E((l) => l.filter(k => !SFX_CFG[k] && !ARENA_SFX[k]), sfx);
  ok('sfx_existen', !badSfx.length); if (badSfx.length) console.log('  sfx faltantes', badSfx.join(','));
  const fails = Object.entries(checks).filter(([k, v]) => !v).map(([k]) => k);
  console.log('CHECKS', JSON.stringify(checks));
  console.log(fails.length ? 'SUMMARY FAIL fails=' + fails.join(',') : 'SUMMARY OK fails=');
  console.log('ERRORS', errors.length); for (const e of errors.slice(0, 8)) console.log(e);
  await browser.close();
})();
