// Sensación de combate (js/rendering/juice.js + feedback.js): hit-stop escalado, freeze-frame visual en
// red (sin tocar el tiempo de simulación), viñeta de daño, racha de bajas con su recompensa chica,
// números agrupados, adelanto de cámara, silueta blanca y la opción "Reducir movimiento" que apaga
// sacudidas/hit-stop/cámara lenta.
//   (python3 -m http.server 8771 &) ; SE_BASE_URL=http://127.0.0.1:8771 node tools/regression/t_juice.js
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const BASE = process.env.SE_BASE_URL || process.env.REGRESSION_BASE_URL || 'http://127.0.0.1:8771';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 400) : '')); if (!ok) fails++; };
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: 900, height: 506 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  await page.addInitScript(() => { window.__campaignMode = true; try { localStorage.removeItem('horda_motion'); } catch (e) {} });
  await page.goto(`${BASE}/index.html`, { waitUntil: 'load' });
  for (let k = 0; k < 300; k++) { if (await page.evaluate(() => !document.getElementById('title-continue-btn').disabled)) break; await sleep(100); }
  const E = (fn, a) => page.evaluate(fn, a);
  await E(() => { loop = function(){};
    window.__start = (arena, champ) => { for (const k of Object.keys(save.champions)) save.champions[k].unlocked = true; save.stash = []; for (const k in save.champions) save.champions[k].equipment = mkEquipment();
      selectedClass = champ || 'guerrero'; currentArena = arena || 'laberinto'; lobbyAllies = ['tanque','mago','soporte']; startRun(3); spawnTimer = 1e12; enemies.length = 0; levelDuration = 9e9; invalidatePassiveCache(); runElapsedMs = 5000;
      setReduceMotion(false); resetFeedback(); for (const k in JUICE_STATS) JUICE_STATS[k] = 0; _hitStopLastAt = -1e9; };
    window.__foe = (dx, dy, t) => { const e = spawnEnemy(t || 'esqueleto', false); e.x = player.x + dx; e.y = player.y + dy; e.hp = e.maxHp = 50000; return e; };
  });

  // 1) hit-stop escalado por peso: crítico < remate de élite < muerte de subjefe; en solo frena la simulación
  const hs = await E(() => { __start();
    const a = __foe(60, 0); damageEnemy(a, 100, { src: player, forceCrit: true, heavy: true }); const crit = hitStopTimer, scale = gameTimeScale(0);
    hitStopTimer = 0; _hitStopLastAt = -1e9;
    const el = __foe(60, 20); el.rank = 'elite'; el.hp = 50; damageEnemy(el, 5000, { src: player, forceCrit: true, heavy: true }); const fin = hitStopTimer;
    hitStopTimer = 0; _hitStopLastAt = -1e9; slowMoTimer = 0;
    const sb = __foe(-60, 0); sb.rank = 'subjefe'; killFeedback(sb, true); const sub = hitStopTimer, slow = slowMoTimer;
    return { crit, scale, fin, sub, slow, n: JUICE_STATS.hitStop }; });
  check('JUICE.hitstop_critico_frena_la_simulacion_en_solo', hs.crit > 20 && hs.scale < 0.2, hs);
  check('JUICE.hitstop_escala_por_peso', hs.fin > hs.crit && hs.sub >= hs.fin && hs.slow > 0, hs);
  const basic = await E(() => { __start(); const a = __foe(60, 0); damageEnemy(a, 10, { src: player, fromBasic: true, critChanceOverride: 0 }); return { t: hitStopTimer, n: JUICE_STATS.hitStop }; });
  check('JUICE.golpe_basico_sin_hitstop', basic.t === 0 && basic.n === 0, basic);

  // 2) red: el hit-stop es un freeze-frame visual; el tiempo de simulación NUNCA cambia
  const net = await E(() => { __start(); const prev = netMatch; netMatch = { role: 'host', recording: false, slots: [], last: {} };
    let r;
    try {
      const a = __foe(60, 0); damageEnemy(a, 100, { src: player, forceCrit: true, heavy: true });
      const sb = __foe(-60, 0); sb.rank = 'subjefe'; _hitStopLastAt = -1e9; killFeedback(sb, true);
      bossDeathFeedback();
      r = { freeze: hitFreezeTimer, sim: hitStopTimer, slow: slowMoTimer, scale: gameTimeScale(16), hold: juiceFrameHold(1), punch: camPunchT > 0, stats: { ...JUICE_STATS } };
    } finally { netMatch = prev; }
    return r; });
  check('JUICE.red_freeze_visual_sin_tocar_la_simulacion', net.freeze > 0 && net.sim === 0 && net.slow === 0 && net.scale === 1 && net.hold === true, net);
  check('JUICE.red_camara_lenta_se_vuelve_golpe_de_zoom', net.punch && net.stats.slowMo === 0, net);

  // 2b) red, lado anfitrión: los golpes pesados/racha de un invitado le llegan como eventos PERSONALES
  //     (a su slot) y el temblor de los críticos del anfitrión ya no viaja a los demás
  const ev = await E(() => { __start(); netHookEvents(); const prev = netMatch; netMatch = { role: 'host', recording: true, slots: [], last: { enemies: new Map() } };
    let r;
    try {
      _netEvents.length = 0;
      const g = heroes.find(h => h !== player); g.isRemote = true; g._netSlot = 1;
      const a = __foe(60, 0); damageEnemy(a, 100, { src: g, forceCrit: true, heavy: true });
      for (let i = 0; i < 15; i++) { const e = __foe(70, 10); e.hp = 1; damageEnemy(e, 999, { src: g, critChanceOverride: 0 }); }
      const guestEv = _netEvents.filter(x => x[2] === 1).map(x => x[0]);
      _netEvents.length = 0; screenShake = 0;
      const b = __foe(60, 0); damageEnemy(b, 100, { src: player, forceCrit: true, heavy: true });
      const hostEv = _netEvents.map(x => x[0]);
      r = { guestEv: [...new Set(guestEv)], hostEv: [...new Set(hostEv)], sim: hitStopTimer, energy: g.energy, stk: g._stk };
      g.isRemote = false;
    } finally { netMatch = prev; }
    return r; });
  check('JUICE.red_invitado_recibe_sus_golpes_y_racha', ev.guestEv.includes('juiceHitLocal') && ev.guestEv.includes('juiceStreakShow') && ev.stk === 15, ev);
  check('JUICE.red_temblor_del_anfitrion_no_viaja', !ev.hostEv.includes('vfxShake') && !ev.hostEv.includes('flashScreen') && ev.sim === 0, ev);

  // 3) viñeta roja al recibir daño + latido con vida baja (dibujado sin errores)
  const vig = await E(() => { __start(); hurtFlash = 0; const d = __foe(80, 0); registerPlayerHurt(player.maxHp * 0.1, d); const h = hurtFlash;
    player.hp = player.maxHp * 0.1; state = 'playing'; render(); return { h, n: JUICE_STATS.vignette, dirs: hurtDirs.length }; });
  check('JUICE.vineta_al_recibir_dano', vig.h >= 0.5 && vig.n === 1 && vig.dirs === 1, vig);

  // 4) racha de bajas: contador visible, escalón a las 15 con un sorbo de energía (8%), se corta sola
  const stk = await E(() => { __start(); player.energy = 0;
    for (let i = 0; i < 15; i++) { const e = __foe(70, 10); e.hp = 1; damageEnemy(e, 999, { src: player, critChanceOverride: 0 }); }
    const r = { n: streakN, shown: streakShowT > 0, energy: player.energy, max: player.maxEnergy, reward: JUICE_STATS.streakReward };
    runElapsedMs += STREAK_GAP + 100; const e = __foe(70, 10); e.hp = 1; damageEnemy(e, 999, { src: player, critChanceOverride: 0 }); r.after = player._stk;
    return r; });
  check('JUICE.racha_visible_y_recompensa_chica', stk.n === 15 && stk.shown && stk.reward === 1 && Math.abs(stk.energy - stk.max * 0.08) < 1.5, stk);
  check('JUICE.racha_se_corta_sin_bajas', stk.after === 1, stk);
  const bots = await E(() => { __start(); const bot = heroes.find(h => h !== player); for (let i = 0; i < 20; i++) { const e = __foe(70, 10); e.hp = 1; damageEnemy(e, 999, { src: bot, critChanceOverride: 0 }); } return { bot: bot._stk || 0, reward: JUICE_STATS.streakReward }; });
  check('JUICE.bots_no_suman_racha', bots.bot === 0 && bots.reward === 0, bots);

  // 5) números: golpes seguidos al mismo enemigo se agrupan; color por tipo; crítico con "!"
  const ft = await E(() => { __start(); for (const f of floatTexts) f.on = false; const a = __foe(60, 0), b = __foe(200, 0);
    for (let i = 0; i < 4; i++) damageEnemy(a, 50, { src: player, fromBasic: true, critChanceOverride: 0 });
    damageEnemy(b, 50, { src: player, burn: true, critChanceOverride: 0 }); damageEnemy(b, 300, { src: player, forceCrit: true });
    const on = floatTexts.filter(f => f.on && f.kind <= 1).map(f => ({ t: f.text, dk: f.dk, k: f.kind, v: Math.round(f.val) }));
    return on; });
  const grouped = ft.find(f => f.dk === 'physical' && f.k === 0);
  check('JUICE.numeros_agrupados_por_objetivo', ft.length <= 3 && grouped && grouped.v > 150, ft);
  check('JUICE.numeros_color_por_tipo_y_critico', ft.some(f => f.dk === 'fire') && ft.some(f => f.k === 1 && /!$/.test(f.t)), ft);

  // 6) cámara: adelanto hacia donde se apunta, coherente con worldToScreen/inView; subir de nivel y ulti lista
  const cam = await E(() => { __start(); state = 'playing'; facing = { x: 1, y: 0 }; joyVec = { x: 1, y: 0 }; for (let i = 0; i < 90; i++) updateJuice(16);
    const s = worldToScreen(player.x + CAM_LEAD_X, player.y + CAM_LEAD_Y - 0); joyVec = { x: 0, y: 0 };
    const c = save.champions[player.classKey]; grantXP(player.classKey, xpToNext(c.level) - c.xp + 1);
    player.ultCharge = player.ultMax; player.ultCd = 0; runLevel = Math.max(runLevel, ULT_MIN_ARENA_LEVEL); document.getElementById('btn-ult').classList.remove('ready', 'locked'); updateHUD();
    return { lead: CAM_LEAD_X, sx: s.x, vw: VW, lvl: JUICE_STATS.levelUp, ult: JUICE_STATS.ultReady, pop: document.getElementById('btn-ult').classList.contains('ready-pop') }; });
  check('JUICE.camara_adelanta_hacia_donde_apuntas', cam.lead > 15 && cam.lead <= 30 && Math.abs(cam.sx - cam.vw / 2) < 0.5, cam);
  check('JUICE.subir_de_nivel_y_ulti_lista', cam.lvl === 1 && cam.ult === 1 && cam.pop, cam);

  // 7) destello blanco: silueta blanca cacheada del cuadro
  const wf = await E(() => { const c = document.createElement('canvas'); c.width = c.height = 8; const g = c.getContext('2d'); g.fillStyle = '#301010'; g.fillRect(2, 2, 4, 4);
    const w = whiteFrame(c, 0, 0, 8, 8); const d = w.getContext('2d').getImageData(0, 0, 8, 8).data; return { center: [d[(3*8+3)*4], d[(3*8+3)*4+1], d[(3*8+3)*4+3]], corner: d[3] }; });
  check('JUICE.silueta_blanca_para_el_destello', wf.center[0] === 255 && wf.center[1] === 255 && wf.center[2] === 255 && wf.corner === 0, wf);

  // 8) "Reducir movimiento": casilla en la pausa; apaga sacudidas, hit-stop, cámara lenta y adelanto; se guarda
  const rm = await E(() => { __start(); const box = document.getElementById('opt-reduce-motion'); const inPause = !!box && !!box.closest('#pause-screen');
    box.checked = true; box.dispatchEvent(new Event('change'));
    screenShake = 0; const a = __foe(60, 0); damageEnemy(a, 100, { src: player, forceCrit: true, heavy: true }); vfxShake(12);
    const sb = __foe(-60, 0); sb.rank = 'subjefe'; killFeedback(sb, true); bossDeathFeedback();
    facing = { x: 1, y: 0 }; joyVec = { x: 1, y: 0 }; for (let i = 0; i < 60; i++) updateJuice(16); joyVec = { x: 0, y: 0 };
    screenShake = 8; animNow = 1234; const off = juiceShakeOffset();
    const r = { inPause, on: JUICE.reduceMotion, stored: localStorage.getItem('horda_motion'), hs: hitStopTimer, slow: slowMoTimer, shake: JUICE_STATS.shake, lead: CAM_LEAD_X, off: [off.x, off.y], body: document.body.classList.contains('reduce-motion'), stats: { ...JUICE_STATS } };
    box.checked = false; box.dispatchEvent(new Event('change')); r.offAgain = JUICE.reduceMotion; r.stored2 = localStorage.getItem('horda_motion');
    return r; });
  check('JUICE.reducir_movimiento_esta_en_la_pausa_y_se_guarda', rm.inPause && rm.on && rm.stored === '1' && rm.body && rm.offAgain === false && rm.stored2 === '0', rm);
  check('JUICE.reducir_movimiento_apaga_hitstop_sacudida_y_camara', rm.hs === 0 && rm.slow === 0 && rm.shake === 0 && rm.lead === 0 && rm.off[0] === 0 && rm.off[1] === 0 && rm.stats.hitStop === 0 && rm.stats.slowMo === 0, rm);

  // 9) sacudida con curva y tope
  const sh = await E(() => { __start(); screenShake = 16; let mx = 0; for (let t = 0; t < 400; t += 7) { animNow = t; const o = juiceShakeOffset(); mx = Math.max(mx, Math.abs(o.x), Math.abs(o.y)); }
    const s0 = screenShake; screenShakeDecay(100); const s1 = screenShake; for (let i = 0; i < 40; i++) screenShakeDecay(16); return { mx, cap: SHAKE_CAP, s0, s1, end: screenShake }; });
  check('JUICE.sacudida_con_tope_y_decae_a_cero', sh.mx <= sh.cap + 1e-6 && sh.mx > 3 && sh.s1 < sh.s0 * 0.6 && sh.end === 0, sh);

  check('JUICE.sin_errores', errors.length === 0, errors);
  console.log(`SUMMARY ${fails === 0 ? 'OK' : 'FAIL'} fails=${fails}`);
  await browser.close(); process.exit(fails ? 1 : 0);
})();
