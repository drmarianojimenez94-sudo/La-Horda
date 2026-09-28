// Pruebas de LA HORDA INFINITA (js/systems/endless.js + js/data/endless.js): arranca, las rondas
// avanzan, subjefe/jefe cada 5 rondas, la Cicatriz cambia de arena, mutadores semanales aplicados,
// sinergias, rescates, botín, récord guardado, fin de partida limpio y sin errores.
//   (python3 -m http.server 8808 &) ; SE_BASE_URL=http://127.0.0.1:8808 node tools/items/t_endless.js
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const BASE = process.env.SE_BASE_URL || 'http://127.0.0.1:8808';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 500) : '')); if (!ok) fails++; };
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: 900, height: 506 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message + ' ' + (e.stack||'').split('\n').slice(0,3).join(' | ')));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_CERT|fonts\.g|net::|404/.test(m.text())) errors.push('console: ' + m.text().slice(0, 300)); });
  await page.addInitScript(() => { window.__campaignMode = true; });
  await page.goto(`${BASE}/index.html`, { waitUntil: 'load', timeout: 240000 });
  for (let k = 0; k < 300; k++) { if (await page.evaluate(() => !document.getElementById('title-continue-btn').disabled)) break; await sleep(100); }
  const E = (fn, a) => page.evaluate(fn, a);
  await E(() => { loop = function(){};
    for (const k of Object.keys(save.champions)) save.champions[k].unlocked = true;
    window.__prep = () => { save.stash = []; for (const k in save.champions) save.champions[k].equipment = mkEquipment(); selectedClass = 'guerrero'; lobbyAllies = ['tanque','soporte','mago']; };
    // avanza la simulación con el equipo invulnerable (para que las rondas se cierren solas)
    window.__step = (ms, god) => { let t = 0; while (t < ms && (state === 'playing' || state === 'buff')) { if (state === 'buff') { const c = document.querySelector('#buff-cards .buff-card'); if (c) c.click(); else break; } if (god) for (const h of heroes){ h.hp = h.maxHp; h.alive = true; } update(16); t += 16; } return t; };
    // termina la ronda actual: tiempo cumplido + mata a jefes/subjefes vivos
    window.__finishRound = () => { let guard = 0; const r0 = EN.round;
      while (EN.round === r0 && guard++ < 4000 && (state === 'playing' || state === 'buff')) {
        if (state === 'buff') { const c = document.querySelector('#buff-cards .buff-card'); if (c) c.click(); continue; }
        if (levelDuration < 1e8) levelTimer = Math.max(levelTimer, levelDuration);
        for (const e of enemies) if (e.alive && (e.rank === 'subjefe' || e.rank === 'jefe') && (guard % 20 === 0)) { e.hp = 1; damageEnemy(e, 1e9, {src:player}); }
        for (const h of heroes){ h.hp = h.maxHp; h.alive = true; }
        update(16);
      }
      return { r0, r: EN.round, guard, arena: currentArena, st: state };
    };
  });

  // 0) bloqueo: sin la Arena 02, no se abre
  const r0 = await E(() => { save.arenasCleared = {}; const locked = !endlessUnlocked(); const opened = window.endlessOpen(); save.arenasCleared.fortaleza = true; return { locked, opened, unlocked: endlessUnlocked(), reg: !!(window.GAME_MODE_REGISTRY && GAME_MODE_REGISTRY.endless) }; });
  check('END.bloqueado_hasta_la_arena_02', r0.locked && r0.opened === false && r0.unlocked && r0.reg, r0);
  const rCard = await E(() => { setState('modeselect'); const c = document.getElementById('mode-endless-btn'); return { card: !!c, locked: c && c.classList.contains('locked'), txt: c && c.textContent.slice(0, 80) }; });
  check('END.tarjeta_en_el_selector_de_modos', rCard.card && !rCard.locked && /Horda Infinita/.test(rCard.txt), rCard);

  // 1) mutadores semanales determinísticos
  const r1 = await E(() => { const a = endlessWeeklyMutators(new Date('2026-09-28T10:00:00Z')), b = endlessWeeklyMutators(new Date('2026-10-03T23:00:00Z')), c = endlessWeeklyMutators(new Date('2026-10-06T10:00:00Z'));
    const weeks = new Set(); for (let i = 0; i < 20; i++) weeks.add(endlessWeeklyMutators(new Date(Date.UTC(2026, 0, 5 + 7*i))).ids.join('+'));
    return { a, b, c, distinct: weeks.size, key: endlessWeekKey(new Date('2026-01-01T00:00:00Z')) }; });
  check('END.mutadores_misma_semana_iguales', r1.a.key === r1.b.key && r1.a.ids.join() === r1.b.ids.join() && r1.a.ids.length === 2 && r1.a.ids[0] !== r1.a.ids[1], r1);
  check('END.mutadores_cambian_entre_semanas', r1.c.key !== r1.a.key && r1.distinct >= 6 && r1.key === '2026-W01', r1);

  // 2) arranque desde la Sala (flujo real de menús): Horda Infinita -> guardián -> Sala -> Comenzar
  const r2 = await E(() => { __prep(); window.endlessOpen(); const pend = endlessPending; document.getElementById('start-btn').click(); const st1 = state;
    const title = document.getElementById('lobby-title').textContent; document.getElementById('prep-start-btn').click();
    return { pend, st1, title, st: state, active: endlessActive, round: EN.round, arena: currentArena, lvl: runLevel, base: EN.baseLevel, muts: EN.mutators, dur: levelDuration, expBase: ENDLESS_SUB_LEVEL[currentArena] - 4,
      hud: (updateHUD(), (document.getElementById('hud-endless')||{}).textContent || '') }; });
  check('END.arranca_desde_la_sala', r2.pend && r2.st1 === 'prep' && /Horda Infinita/.test(r2.title) && r2.st === 'playing' && r2.active && r2.round === 1, r2);
  check('END.primer_tramo_arena_temprana_y_nivel_del_subjefe', ['ciudad','fortaleza'].includes(r2.arena) && r2.lvl === r2.base && r2.base === r2.expBase, r2);
  check('END.hud_ronda_y_puntaje', /Ronda\s*1/.test(r2.hud) && /pts/.test(r2.hud), r2.hud);

  // 3) juega de verdad unos segundos: aparecen enemigos escalados por la curva de la ronda
  const r3 = await E(() => { __step(9000, true); const e = enemies.filter(x => x.alive && x.rank !== 'subjefe' && x.rank !== 'jefe'); return { n: e.length, kills, score: EN.score, anyGoldInt: e.every(x => Number.isInteger(x.gold)) }; });
  check('END.hay_horda_y_puntaje', r3.n > 0 && r3.anyGoldInt, r3);

  // 4) las rondas avanzan con el refuerzo; ronda 5 = subjefe; al cerrarla la Cicatriz cambia de arena
  const r4 = await E(() => { const gems0 = save.gems||0, gold0 = save.gold; const log = []; for (let i = 0; i < 4; i++) log.push(__finishRound());
    const boss5 = endlessIsBossRound(); const lvl5 = runLevel, arena5 = currentArena;
    // ronda 5: el subjefe tiene que aparecer (director propio de la arena o el estándar)
    let seenSub = false, t = 0; levelTimer = 0;
    while (t < 120000 && EN.round === 5) { if (enemies.some(e => e.alive && e.rank === 'subjefe') || bossActive) { seenSub = true; break; } for (const h of heroes){ h.hp = h.maxHp; h.alive = true; } update(16); t += 16; if (levelTimer < levelDuration*0.5) levelTimer += 48; }
    const held = (()=>{ if (!seenSub) return null; levelTimer = levelDuration + 10; update(16); return EN.round === 5 && levelClearing === 0; })();
    const fin = __finishRound();
    return { log, boss5, lvl5, arena5, seenSub, held, fin, arenaNow: currentArena, round: EN.round, bossKills: EN.bossKills, loot: (EN.local.loot||[]).length, gems: (save.gems||0) - gems0, arenas: EN.arenas }; });
  check('END.rondas_avanzan', r4.log.every((x, i) => x.r === i + 2), r4.log);
  check('END.ronda_5_con_subjefe', r4.boss5 && r4.seenSub, r4);
  check('END.ronda_de_subjefe_no_termina_con_el_subjefe_vivo', r4.held === true, r4);
  check('END.la_cicatriz_cambia_de_arena', r4.round === 6 && r4.arenaNow !== r4.arena5 && r4.arenas.length === 2, r4);
  check('END.cofre_del_subjefe_objeto_o_cofre_menor', r4.bossKills === 1 && (r4.loot >= 1 || r4.gems >= 1), r4);

  // 5) mutador aplicado (se fuerzan los siete y se mide cada uno)
  const r5 = await E(() => { const out = {}; const keep = EN.mutators.slice();
    EN.mutators = []; const base = { spawn: endlessSpawnIntervalMult(), role: endlessRoleChance(0.1), dur: endlessRoundDuration(EN.round), bossHp: endlessBossHp() };
    EN.mutators = ['fast_horde']; out.fast = endlessSpawnIntervalMult() < base.spawn; const e1 = spawnEnemy(pickFromPool(spawnPoolFor(runLevel)), false); EN.mutators = []; const e0 = spawnEnemy(e1.type, false); out.fastSpeed = e1.speed > e0.speed*1.15;
    EN.mutators = ['elites_x2']; out.elites = endlessRoleChance(0.1) > base.role*1.9;
    EN.mutators = ['dense']; out.dense = endlessRoundDuration(EN.round) < base.dur;
    EN.mutators = ['furious']; out.furious = endlessBossHp() > base.bossHp*1.2;
    EN.mutators = ['swarm']; out.swarm = endlessSpawnIntervalMult() < base.spawn*0.75;
    EN.mutators = ['no_potions']; const n0 = potions.length; dropPotion(player.x, player.y, 'heal'); const n1 = potions.length; dropPotion(player.x, player.y, 'mana'); out.noPot = n1 === n0 && potions.length === n0 + 1 && !endlessBuffPool().some(b => b.id === 'potion');
    EN.mutators = ['rifts']; out.rifts = endlessScoreMult() > 1;
    EN.mutators = keep; out.pool = !endlessBuffPool().some(b => b.id === 'gold' || b.id === 'xp');
    return out; });
  check('END.mutadores_aplicados', Object.values(r5).every(Boolean), r5);

  // 6) sinergias: 2 refuerzos de la misma familia activan el nivel 1
  const r6 = await E(() => { const d0 = runStats.dmgMult; player._enTags = {}; const syn0 = EN.synergies;
    const b1 = BUFF_POOL.find(b => b.id === 'dmg'), b2 = BUFF_POOL.find(b => b.id === 'glass');
    b1.apply(runStats); endlessOnBuffPicked(player, 'dmg'); const mid = runStats.dmgMult; b2.apply(runStats); endlessOnBuffPicked(player, 'glass');
    return { d0, mid, after: runStats.dmgMult, expect: mid*1.35*1.10, syn: EN.synergies - syn0, hint: endlessBuffHint(BUFF_POOL.find(b => b.id === 'vamp')) }; });
  check('END.sinergia_se_activa', r6.syn === 1 && Math.abs(r6.after - r6.expect) < 1e-6 && /Filo/.test(r6.hint), r6);

  // 7) rescate: aparece, se completa manteniendo la acción contextual y da recompensa
  const r7 = await E(() => { endlessRescues = []; const g0 = save.gold, sc0 = EN.score; EN.rescueSeq = 0; endlessSpawnRescue(); const t = endlessRescues[0]; if (!t) return { none: true };
    const tg = ctxTargets(); const listed = tg && tg.some(x => x.id === t.id);
    player.x = t.x; player.y = t.y; player._ctxHold = t.id; let ms = 0; while (!t.done && ms < 6000) { for (const h of heroes){ h.hp = h.maxHp; } player.x = t.x; player.y = t.y; player._ctxHold = t.id; update(16); ms += 16; }
    // uno que se vence: castigo con élites
    endlessSpawnRescue(); const t2 = endlessRescues.find(x => !x.done); const fails0 = EN.rescueFails; if (t2) t2.t = 10; update(16);
    return { listed, done: t.done, ms, gold: save.gold - g0, score: EN.score - sc0, rescues: EN.rescues, failed: EN.rescueFails - fails0, kind: t.kind }; });
  check('END.rescate_se_completa_y_paga', r7.listed && r7.done && r7.gold > 0 && r7.score > 0 && r7.rescues >= 1, r7);
  check('END.rescate_vencido_castiga', r7.failed === 1, r7);

  // 8) dificultad sin techo: la curva sigue subiendo en rondas altas y con los minutos
  const r8 = await E(() => { const keep = EN.round, keepMs = runElapsedMs; const v = []; for (const r of [1, 10, 30, 60]) { EN.round = r; v.push(+endlessHpCurve().toFixed(2)); }
    EN.round = 10; runElapsedMs = 0; const m0 = endlessHpCurve(); runElapsedMs = 20*60000; const m20 = endlessHpCurve(); EN.round = 40; const burst = endlessExtraBurst(); const role = endlessRoleChance(0.1);
    EN.round = keep; runElapsedMs = keepMs; return { v, m0, m20, burst, role }; });
  check('END.dificultad_sin_techo', r8.v[0] < r8.v[1] && r8.v[1] < r8.v[2] && r8.v[2] < r8.v[3] && r8.m20 > r8.m0 && r8.burst >= 5 && r8.role > 0.4, r8);

  // 9) ronda 10: el JEFE de una arena con jefe, y cae como una ronda (sin victoria de campaña)
  const r9 = await E(() => { const cleared0 = JSON.stringify(save.arenasCleared); let guard = 0; while (EN.round < 10 && guard++ < 10) __finishRound();
    const arena = currentArena, lvl = runLevel, kind = EN.stintKind;
    const own = levelDuration > 1e8; if (!own) levelTimer = levelDuration + 1; let t = 0; while (!bossActive && t < 90000){ for (const h of heroes){ h.hp = h.maxHp; h.alive = true; } update(16); t += 16; if (!own) levelTimer = Math.max(levelTimer, levelDuration + 1); }
    const bossOn = bossActive, bname = boss && boss.name;
    let k = 0; while (EN.round === 10 && k < 6000 && (state === 'playing' || state === 'buff')) { if (state === 'buff') { document.querySelector('#buff-cards .buff-card').click(); continue; } if (boss && boss.alive && k % 30 === 0) damageEnemy(boss, 1e9, {src:player}); for (const h of heroes){ h.hp = h.maxHp; h.alive = true; } update(16); k++; }
    return { arena, lvl, kind, bossOn, bname, inBoss: ENDLESS_BOSS_ARENAS.includes(arena), round: EN.round, st: state, arenaAfter: currentArena, campaignUntouched: JSON.stringify(save.arenasCleared) === cleared0, vic: state === 'victory' }; });
  check('END.ronda_10_jefe_de_la_arena', r9.kind === 'boss' && r9.lvl === 10 && r9.bossOn && r9.inBoss, r9);
  check('END.el_jefe_cae_y_sigue_la_horda', r9.round === 11 && r9.st === 'playing' && !r9.vic && r9.arenaAfter !== r9.arena && r9.campaignUntouched, r9);

  // 10) muerte: resultados con estadísticas, botín y récord guardado; "una más" arranca otra
  const r10 = await E(() => { const runs0 = endlessSave().runs; for (const h of heroes) h.hp = 1; player.hp = 0; player.alive = false; onPlayerDeath(); let t = 0; while (state === 'playing' && t < 3000){ update(16); t += 16; }
    const scr = document.getElementById('endless-screen'); const S = endlessSave();
    return { st: state, visible: scr && !scr.classList.contains('hidden'), txt: scr ? scr.textContent : '', runs: S.runs - runs0, best: S.best.score, score: EN.score, g: (S.byGuardian.guerrero||{}).score, again: !!document.getElementById('en-again-btn'), saved: JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => /save/i.test(k)) || '{}') || '{}').endless || null }; });
  check('END.pantalla_de_resultados', r10.st === 'endless' && r10.visible && /Ronda/.test(r10.txt) && /Botín juntado/.test(r10.txt) && /Arenas recorridas/.test(r10.txt), { st: r10.st, txt: r10.txt.slice(0, 300) });
  check('END.record_guardado', r10.runs === 1 && r10.best === r10.score && r10.g === r10.score && r10.score > 0, { runs: r10.runs, best: r10.best, score: r10.score, g: r10.g, saved: !!r10.saved });
  // ranking semanal: sin cuenta el récord queda local, con el aviso para entrar al ranking (sin pedidos a la red)
  const rLb = await E(() => { const line = document.getElementById('en-lb-line'); const acc = document.getElementById('en-lb-acc'), open = document.getElementById('en-lb-open');
    return { vis: !!line && !line.classList.contains('hidden'), txt: line ? line.textContent : '', acc: !!acc, open: !!open, st: EN.local && EN.local.lb && EN.local.lb.st, pend: !!endlessSave().lbPending }; });
  check('END.ranking_invitado_record_local_con_aviso', rLb.vis && rLb.acc && rLb.open && /Creá una cuenta para entrar al ranking/.test(rLb.txt) && rLb.st === 'guest' && !rLb.pend, rLb);
  const r11 = await E(() => { const id0 = EN.id; document.getElementById('en-again-btn').click(); return { st: state, active: endlessActive, round: EN.round, newRun: EN.id !== id0, score: EN.score, kills }; });
  check('END.una_mas_en_un_toque', r11.st === 'playing' && r11.active && r11.round === 1 && r11.newRun && r11.score === 0, r11);

  // 12) abandonar desde la pausa: resultados sin castigo, y volver al menú deja todo limpio
  const r12 = await E(async () => { __step(2000, true); const g0 = save.gold; setState('paused'); document.getElementById('quit-btn').click(); await new Promise(r => setTimeout(r, 320));
    const ok = document.querySelector('#game-dialog .gd-ok'); if (ok) ok.click(); await new Promise(r => setTimeout(r, 80));
    const st = state, reason = EN.endReason; document.getElementById('en-back-btn').click();
    // una partida normal después: sin rastros del modo
    endlessPending = false; currentArena = 'bosque'; startRun(3); update(16); updateHUD();
    return { st, reason, noPenalty: save.gold >= g0, after: state, active: endlessActive, hudGone: !document.getElementById('hud-endless'), lvlShown: getComputedStyle(document.getElementById('hud-level').parentElement).display !== 'none', dur: levelDuration, lvl: runLevel }; });
  check('END.abandonar_da_resultados_sin_castigo', r12.st === 'endless' && r12.reason === 'quit' && r12.noPenalty, r12);
  check('END.fin_limpio_la_campaña_sigue_igual', !r12.active && r12.hudGone && r12.lvlShown && r12.lvl === 3 && r12.dur === 22000 + 3*2600, r12);

  // 13) cada arena de la rotación arranca su tramo sin romperse (mapa, director, jefe/subjefe)
  const r13 = await E(() => { const out = {}; for (const a of ARENA_ORDER) { try { __prep(); endlessActive = false; endlessBeginRun(); EN.stintArena = a; EN.stintKind = 'sub'; EN.baseLevel = ENDLESS_SUB_LEVEL[a] - 4; currentArena = a; startRun(1);
        for (let i = 0; i < 4; i++) __finishRound(); let t = 0, seen = false; while (t < 90000 && EN.round === 5) { if (enemies.some(e => e.alive && e.rank === 'subjefe') || bossActive) { seen = true; break; } for (const h of heroes){ h.hp = h.maxHp; h.alive = true; } update(16); t += 16; if (levelTimer < levelDuration*0.5) levelTimer += 48; }
        const f = __finishRound(); out[a] = { seen, next: f.r, lvl: runLevel, st: state }; } catch (err) { out[a] = { err: String(err && err.message) }; } }
    endlessFinish(); return out; });
  const bad13 = Object.entries(r13).filter(([a, v]) => v.err || !v.seen || v.next !== 6 || v.st !== 'playing');
  check('END.las_diez_arenas_con_subjefe_en_la_ronda_5', bad13.length === 0, bad13.length ? bad13 : Object.keys(r13));
  const r14 = await E(() => { const out = {}; for (const a of ENDLESS_BOSS_ARENAS) { try { __prep(); endlessActive = false; endlessBeginRun(); EN.round = 6; EN.stintArena = a; EN.stintKind = 'boss'; EN.baseLevel = 6; currentArena = a; startRun(1);
        for (let i = 0; i < 4; i++) __finishRound(); const own = levelDuration > 1e8; if (!own) levelTimer = levelDuration + 1; let t = 0; while (!bossActive && t < 90000){ for (const h of heroes){ h.hp = h.maxHp; h.alive = true; } update(16); t += 16; if (!own) levelTimer = Math.max(levelTimer, levelDuration + 1); if (state === 'buff') document.querySelector('#buff-cards .buff-card').click(); }
        const on = bossActive, bt = boss && boss.type; let k = 0; while (EN.round === 10 && k < 8000 && (state === 'playing' || state === 'buff')) { if (state === 'buff') { document.querySelector('#buff-cards .buff-card').click(); continue; } if (boss && boss.alive && k % 30 === 0) damageEnemy(boss, 1e9, {src:player}); for (const h of heroes){ h.hp = h.maxHp; h.alive = true; } update(16); k++; }
        out[a] = { on, bt, next: EN.round, st: state }; } catch (err) { out[a] = { err: String(err && err.message) }; } }
    endlessFinish(); return out; });
  const bad14 = Object.entries(r14).filter(([a, v]) => v.err || !v.on || v.next !== 11 || v.st !== 'playing' || (a === 'fortaleza' && v.bt !== 'caballero'));
  check('END.jefes_de_arena_caen_como_ronda', bad14.length === 0, bad14.length ? bad14 : r14);

  check('END.sin_errores', errors.length === 0, errors.slice(0, 6));
  console.log(`SUMMARY ${fails === 0 ? 'OK' : 'FAIL'} fails=${fails}`);
  await browser.close();
  process.exit(fails ? 1 : 0);
})();
