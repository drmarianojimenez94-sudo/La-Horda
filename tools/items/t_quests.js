// RETENCIÓN (js/data/quests.js, js/systems/quests.js, js/ui/quests-ui.js): logros que disparan jugando (al
// ganar y en plena partida), desafíos diarios/semanales que rotan por FECHA (determinísticos, sin servidor),
// Pase de Temporada que sube de nivel con la XP de cuenta, cofres, cooperativo (cada cliente con su
// guardado), guardado y migración de guardados viejos sin estos campos, y la pantalla DESAFÍOS.
//   (python3 -m http.server 8806 &) ; SE_BASE_URL=http://127.0.0.1:8806 node tools/items/t_quests.js [carpeta_capturas]
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const BASE = process.env.SE_BASE_URL || 'http://127.0.0.1:8806';
const OUT = process.argv[2];
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 400) : '')); if (!ok) fails++; };
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_CERT|fonts\.g|net::|404/.test(m.text())) errors.push('console: ' + m.text().slice(0, 300)); });
  await page.addInitScript(() => { window.__campaignMode = true; });
  const boot = async () => {
    await page.goto(`${BASE}/index.html`, { waitUntil: 'load' });
    for (let k = 0; k < 300; k++) { if (await page.evaluate(() => !document.getElementById('title-continue-btn').disabled)) break; await sleep(100); }
    await sleep(400);
    await page.evaluate(() => { loop = function(){};
      window.__start = (a, lv, k) => { for (const c of Object.keys(save.champions)) save.champions[c].unlocked = true;
        selectedClass = k || 'guerrero'; currentArena = a; lobbyAllies = ['tanque','soporte','mago']; startRun(lv); spawnTimer = 1e12; enemies.length = 0; };
      window.__step = (ms) => { let t = 0; while (t < ms) { for (const h of heroes){ h.hp = h.maxHp; } update(16); t += 16; } };
    });
  };
  const E = (fn, a) => page.evaluate(fn, a);
  await page.goto(`${BASE}/index.html`); await page.evaluate(() => localStorage.clear());
  await boot();

  // ---------------- perfil nuevo ----------------
  const r0 = await E(() => { const q = save.quests; return { v: q && q.v, dk: q.daily.key, today: questsDayKey(), nd: q.daily.list.length, nw: q.weekly.list.length,
    titles: q.titles, granted: q.season.granted, gold: save.gold, ach: Object.keys(q.ach).length, retro: q.retro }; });
  check('Q.perfil_nuevo_tiene_quests_normalizado', r0.v === 1 && r0.nd === 3 && r0.nw === 3 && r0.dk === r0.today && r0.retro === false, r0);
  check('Q.pase_nivel1_da_titulo_sin_tocar_el_oro', r0.granted === 1 && r0.titles.includes('t1_nuevo') && r0.gold === 0 /* perfil nuevo sin oro de regalo */ && r0.ach === 0, r0);

  // ---------------- rotación por fecha ----------------
  const r1 = await E(() => {
    const V = questsView(), ids = l => l.map(c => c.tpl + (c.champ ? ':' + c.champ : '') + '=' + c.n).join(',');
    const day = d => new Date(2026, 8, d, 12).getTime();
    const a1 = ids(questsRoll('daily', questsDayKey(new Date(day(28))), V)), a2 = ids(questsRoll('daily', questsDayKey(new Date(day(28))), V));
    const days = []; for (let d = 1; d <= 14; d++) days.push(ids(questsRoll('daily', questsDayKey(new Date(day(d))), V)));
    const wk = []; for (let d = 21; d <= 29; d++) wk.push(questsWeekKey(new Date(day(d))));
    // el día cambia -> la rotación guardada cambia sola; la semana solo el lunes
    window.__questsNow = day(27); questsEnsureRotation(); const w27 = save.quests.weekly.key;   // domingo
    window.__questsNow = day(28); save.quests.daily.key = ''; questsEnsureRotation(); const k28 = save.quests.daily.key, w28 = save.quests.weekly.key, l28 = ids(save.quests.daily.list); // lunes
    window.__questsNow = day(29); questsEnsureRotation(); const k29 = save.quests.daily.key, w29 = save.quests.weekly.key;
    window.__questsNow = day(30); questsEnsureRotation(); const w30 = save.quests.weekly.key;
    window.__questsNow = day(28); questsEnsureRotation(); const back = ids(save.quests.daily.list);
    const unique = new Set(days).size, allThree = days.every(s => s.split(',').length === 3);
    const noDup = days.every(s => new Set(s.split(',').map(x => x.split(/[:=]/)[0])).size === 3);
    return { same: a1 === a2, unique, allThree, noDup, wk, k28, k29, w27, w28, w29, w30, back28: back === l28 };
  });
  check('Q.diarios_determinísticos_por_fecha', r1.same && r1.back28, r1);
  check('Q.diarios_rotan_y_varían', r1.unique >= 10 && r1.allThree && r1.noDup, { unique: r1.unique });
  check('Q.semana_iso_cambia_el_lunes', r1.wk[0] === r1.wk[6] && r1.wk[7] !== r1.wk[6] && r1.w27 !== r1.w28 && r1.w28 === r1.w29 && r1.w29 === r1.w30 && r1.k28 !== r1.k29, r1);

  // cambiar un diario: una sola vez por día
  const r1b = await E(() => { const before = save.quests.daily.list.map(c => c.tpl).join(); const ok1 = questsReroll(0); const after = save.quests.daily.list.map(c => c.tpl);
    const ok2 = questsReroll(1); return { ok1, ok2, changed: before !== after.join(), uniq: new Set(after).size === 3 }; });
  check('Q.cambiar_un_diario_una_vez', r1b.ok1 && !r1b.ok2 && r1b.changed && r1b.uniq, r1b);
  await E(() => { window.__questsNow = null; save.quests.daily.key = ''; save.quests.weekly.key = ''; questsEnsureRotation(); });

  // ---------------- logros al ganar (partida real) ----------------
  const r2 = await E(() => {
    const g0 = save.gold, xp0 = save.quests.xp;
    // desafío diario conocido para verificar que se completa jugando
    save.quests.daily.list[0] = { tpl: 'wins', stat: 'wins', n: 1, gold: 250, done: false, base: save.quests.stats.wins };
    __start('micelial', 1); state = 'playing'; player.stats.kills = 42; boss = null; finishBossVictory();
    for (let i = 0; i < 400 && state === 'playing'; i++) __step(16);
    const q = save.quests;
    return { st: state, wins: q.stats.wins, runs: q.stats.runs, kills: q.stats.kills, first: !!q.ach.c_first_win, dayDone: q.daily.list[0].done,
      gold: save.gold - g0, xp: q.xp - xp0, arena: q.stats.byArena.micelial, champ: q.stats.byChamp.guerrero,
      sum: (document.querySelector('#victory-screen .qs-run-sum') || {}).textContent || '' };
  });
  check('Q.victoria_cuenta_estadisticas', r2.st === 'victory' && r2.wins === 1 && r2.runs === 1 && r2.kills === 42 && r2.arena.wins === 1 && r2.champ.runs === 1, r2);
  check('Q.logro_primera_sangre_dispara_y_paga', r2.first && r2.gold >= 80 + 150 + 250, r2);
  check('Q.desafio_diario_se_completa_ganando', r2.dayDone, r2);
  check('Q.xp_de_cuenta_y_resumen_en_pantalla', r2.xp > 100 && /XP de cuenta/.test(r2.sum), r2);
  await sleep(700);
  const t2 = await E(() => [...document.querySelectorAll('#qs-toasts .qs-toast')].map(e => e.textContent).join(' | '));
  check('Q.aviso_emergente_en_cola', /LOGRO|DESAFÍO/.test(t2), t2.slice(0, 200));
  if (OUT) await page.screenshot({ path: OUT + '/quests_victory.png' });

  // ---------------- logro en plena partida + castigo que no se come el oro del logro ----------------
  const r3 = await E(() => {
    __start('fortaleza', 1); state = 'playing';
    const rs0 = runStartGold, g0 = save.gold;
    player.stats.kills = 1000; questsLiveTick();
    const got = !!save.quests.ach.m_kills1k, playing = state === 'playing';
    const rsDelta = runStartGold - rs0, goldDelta = save.gold - g0;
    // derrota: el castigo se calcula sobre lo ganado peleando, no sobre el oro del logro
    showGameOverScreen();
    const q = save.quests;
    return { got, playing, rsDelta, goldDelta, losses: q.stats.losses, kills: q.stats.kills, maxRun: q.stats.maxRunKills, st: state, goldAfter: save.gold - g0 };
  });
  check('Q.logro_salta_en_plena_partida', r3.got && r3.playing, r3);
  check('Q.oro_de_logro_no_entra_en_el_castigo', r3.rsDelta === r3.goldDelta && r3.goldAfter >= r3.goldDelta, r3);
  check('Q.derrota_cierra_la_partida_una_vez', r3.losses === 1 && r3.kills === 1042 && r3.maxRun === 1000, r3);
  const r3b = await E(() => { const n = save.quests.stats.runs; questsOnRunEnd(false); showGameOverScreen(); return { same: save.quests.stats.runs === n }; });
  check('Q.sin_doble_conteo', r3b.same, r3b);

  // ---------------- pase de temporada ----------------
  const r4 = await E(() => {
    const q = save.quests, lv0 = questsSeason().level, g0 = save.gold, t0 = q.titles.length;
    questsAddXp(3000);
    const lv1 = questsSeason().level; let expGold = 0; for (let l = lv0 + 1; l <= lv1; l++) expGold += (SEASON_REWARDS[l].gold || 0);
    return { lv0, lv1, granted: q.season.granted, gold: save.gold - g0, expGold, chests: q.chests.slice(), titles: q.titles.length - t0, acc: questsAccount().level };
  });
  check('Q.pase_sube_de_nivel_y_entrega', r4.lv1 > r4.lv0 && r4.granted === r4.lv1 && r4.gold === r4.expGold && r4.chests.length >= 1, r4);
  const r4b = await E(() => { const q = save.quests; q.season.xp = 0; q.season.granted = 0; questsAddXp(999999); return { lv: questsSeason().level, granted: q.season.granted, frame: q.frames.includes('temporada1'), title: q.titles.includes('t1_legend') }; });
  check('Q.pase_tope_30_con_premio_final', r4b.lv === 30 && r4b.granted === 30 && r4b.frame && r4b.title, r4b);
  await sleep(300);
  const t4 = await E(() => [...document.querySelectorAll('#qs-toasts .qs-toast')].length + (typeof _qToasts !== 'undefined' ? _qToasts.length : 0));
  check('Q.avisos_del_pase_limitados_en_cola', t4 > 0 && t4 <= 12, t4);

  // ---------------- cofres ----------------
  const r5 = await E(() => { const q = save.quests; q.chests = [2]; const n0 = stashItems().length, gm0 = save.gems || 0;
    const res = questsOpenChest(); return { items: res.items.length, stash: stashItems().length - n0, gems: (save.gems || 0) - gm0, left: q.chests.length }; });
  check('Q.cofre_da_botin_normal_y_gemas', r5.items === 1 && r5.stash === 1 && r5.gems === 1 && r5.left === 0, r5);

  // ---------------- cooperativo: cuenta en el guardado de cada cliente ----------------
  const r6 = await E(() => {
    const q = save.quests, c0 = q.stats.coopRuns, keep = netMatch;
    __start('bosque', 1); state = 'playing';
    netMatch = { role: 'guest', slots: [{ kind: 'human' }, { kind: 'human' }, { kind: 'bot' }, { kind: 'bot' }], ended: true, loadouts: {} };
    questsOnRunStart(); player.stats.revives = 3;
    const sum = questsOnRunEnd(true);
    netMatch = keep;
    return { coop: q.stats.coopRuns - c0, wins: q.stats.coopWins, first: !!q.ach.co_first, win: !!q.ach.co_win, frame: q.frames.includes('hermandad'), rev: q.stats.revives, sumCoop: sum && sum.coop };
  });
  check('Q.cooperativo_suma_a_la_cuenta', r6.coop === 1 && r6.wins === 1 && r6.first && r6.win && r6.frame && r6.sumCoop, r6);

  // ---------------- guardado ----------------
  const snap = await E(() => { persistNow(); const s = JSON.parse(localStorage.getItem(SAVE_KEY)); return { wins: s.quests.stats.wins, ach: Object.keys(s.quests.ach).length, xp: s.quests.xp }; });
  await boot();
  const r7 = await E(() => ({ wins: save.quests.stats.wins, ach: Object.keys(save.quests.ach).length, xp: save.quests.xp, retro: save.quests.retro }));
  check('Q.persiste_al_recargar', r7.wins === snap.wins && r7.ach === snap.ach && r7.xp === snap.xp && !r7.retro, { snap, r7 });

  // ---------------- migración: guardado viejo SIN quests ----------------
  await E(() => {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY)); delete s.quests;
    s.arenasCleared = Object.assign(s.arenasCleared || {}, { ciudad: true, fortaleza: true, bosque: true });
    s.crystals = { ancestral: true, escarcha: false, piedra: false }; s.gold = 777;
    localStorage.setItem(SAVE_KEY, JSON.stringify(s));
  });
  await boot();
  const r8 = await E(() => { const q = save.quests; return { v: q.v, wins: q.stats.wins, cleared: ARENA_ORDER.filter(a => save.arenasCleared[a]).length, ach: Object.keys(q.ach), gold: save.gold, dailyDone: q.daily.list.filter(c => c.done).length, retroMsg: QST.retroCount || 0 }; });
  check('Q.migracion_guardado_viejo_sin_campos', r8.v === 1 && r8.cleared >= 3 && r8.wins === r8.cleared, r8);
  check('Q.migracion_desbloquea_lo_ya_hecho_en_silencio', ['c_first_win', 'c_arenas3', 'j_ciudad', 'j_fortaleza', 'r_crystal1'].every(id => r8.ach.includes(id)) && r8.dailyDone === 0 && r8.retroMsg > 0, r8);
  check('Q.migracion_paga_logros_retroactivos', r8.gold > 777, r8.gold);
  // guardado con quests A MEDIAS (campos faltantes o rotos)
  await E(() => { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); s.quests = { v: 1, stats: { kills: 5, byChamp: null }, daily: 7, titles: ['nope', 'veterano'], title: 'nope', chests: [9, 2] };
    localStorage.setItem(SAVE_KEY, JSON.stringify(s)); });
  await boot();
  const r9 = await E(() => { const q = save.quests; return { kills: q.stats.kills, bc: typeof q.stats.byChamp, nd: q.daily.list.length, titles: q.titles, title: q.title, chests: q.chests, frame: q.frame }; });
  check('Q.guardado_a_medias_se_completa', r9.kills === 5 && r9.bc === 'object' && r9.nd === 3 && r9.titles.includes('veterano') && !r9.titles.includes('nope') && r9.title === 'novato' && r9.chests.join() === '2' && r9.frame === 'madera', r9);

  // ---------------- pantalla DESAFÍOS ----------------
  const r10 = await E(() => {
    for (const c of Object.keys(save.champions)) save.champions[c].unlocked = true;
    setState('mainmenu'); renderMainMenu();
    const btn = document.querySelector('[data-quests-open]'); const hasBtn = !!btn; if (btn) btn.click();
    const out = { hasBtn, st: state, tabs: {} };
    for (const t of ['desafios', 'logros', 'pase', 'perfil']) { questsOpen(t); const b = document.getElementById('quests-body');
      out.tabs[t] = { cards: b.querySelectorAll('.qs-card').length, tiers: b.querySelectorAll('.qs-tier').length, chips: b.querySelectorAll('.qs-chip').length, text: b.textContent.length }; }
    // botones de la pantalla: blancos táctiles >= 40 px
    const small = [...document.querySelectorAll('#quests-screen button')].filter(e => e.offsetParent && (e.getBoundingClientRect().width < 40 || e.getBoundingClientRect().height < 40)).map(e => e.className + ':' + e.textContent.trim().slice(0, 12));
    // elegir título y marco
    questsOpen('perfil'); const q = save.quests; q.titles.push('maestro'); q.frames.push('oro');
    const okT = questsSetCosmetic('title', 'maestro'), okF = questsSetCosmetic('frame', 'oro'), bad = questsSetCosmetic('title', 'noexiste');
    questsOpen('perfil'); const shown = document.querySelector('.qs-prof-title').textContent;
    document.getElementById('quests-back-btn').click();
    return Object.assign(out, { small, okT, okF, bad, shown, back: state });
  });
  check('Q.acceso_desde_el_menu', r10.hasBtn && r10.st === 'quests', r10);
  check('Q.pestañas_renderizan', r10.tabs.desafios.cards === 6 && r10.tabs.logros.cards >= 40 && r10.tabs.pase.tiers === 30 && r10.tabs.perfil.chips >= 3, r10.tabs);
  check('Q.botones_de_40px', r10.small.length === 0, r10.small);
  check('Q.titulo_y_marco_elegibles', r10.okT && r10.okF && !r10.bad && /Maestro de la Horda/.test(r10.shown), r10);
  check('Q.volver_al_menu', r10.back === 'mainmenu', r10.back);
  if (OUT) { await E(() => questsOpen('logros')); await sleep(300); await page.screenshot({ path: OUT + '/quests_logros.png' }); }
  // cofre desde la pantalla
  const r11 = await E(async () => { save.quests.chests = [3]; questsOpen('desafios'); const b = document.querySelector('[data-qchest]'); b.click();
    await new Promise(r => setTimeout(r, 1500)); const ov = document.querySelector('.qs-chest-ov');
    const n = ov ? ov.querySelectorAll('.qs-loot').length : 0; if (ov) ov.querySelector('.qs-chest-close').click();
    return { ov: !!ov, n, gone: !document.querySelector('.qs-chest-ov'), left: save.quests.chests.length }; });
  check('Q.cofre_se_abre_en_la_pantalla', r11.ov && r11.n >= 1 && r11.gone && r11.left === 0, r11);

  check('Q.sin_errores', errors.length === 0, errors);
  await browser.close();
  console.log(fails ? `${fails} FALLAS` : 'OK');
  process.exit(fails ? 1 : 0);
})();
