// Pruebas de La Fortaleza Sin Fin (Arena III). No es parte del juego.
//   (python3 -m http.server 8771 &) ; node tools/fortaleza/t_fortaleza.js <outdir>
// Simula sin dibujar (update() a mano) y saca capturas dibujadas donde hace falta mirar.
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const fs = require('fs'), path = require('path');
const BASE = process.env.SE_BASE_URL || 'http://127.0.0.1:8771';
const outdir = process.argv[2] || '/tmp/fort_out'; fs.mkdirSync(outdir, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const HELP = require('./sim-helpers.js');
const checks = [];
function check(id, ok, detail) { checks.push({ id, ok: !!ok, detail }); console.log((ok ? 'PASS ' : 'FAIL ') + id + (detail !== undefined ? '  ' + JSON.stringify(detail).slice(0, 300) : '')); }

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: 1000, height: 560 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message + ' ' + (e.stack||'').split('\n').slice(1,3).join('|')));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_CERT|fonts\.g|net::/.test(m.text())) errors.push('console: ' + m.text().slice(0, 300)); });
  await page.goto(`${BASE}/index.html`, { waitUntil: 'load' });
  for (let k = 0; k < 300; k++) { if (await page.evaluate(() => !document.getElementById('title-continue-btn').disabled)) break; await sleep(100); }
  await page.evaluate(HELP);
  const E = (fn, a) => page.evaluate(fn, a);
  // pausa el loop real: la simulación la avanza cada prueba
  await E(() => { window.__realLoop = loop; loop = function(){}; window.__step = (ms, auto) => { const a = __fs.auto; __fs.auto = !!auto; const r = __fs.run(ms); __fs.auto = a; return r; }; });
  const shot = async (name, fn) => { await E(() => { render(); }); if (fn) await E(fn); await page.screenshot({ path: path.join(outdir, name + '.png') }); };
  // arranque controlado: sin oleadas, héroes en un punto, nivel dado
  const setup = (lv, x, y, opts) => E(([lv, x, y, opts]) => {
    __fs.start('guerrero', ['tanque','mago','soporte'], lv, {god: !!(opts && opts.god)});
    enemies = enemies.filter(e => e.type === 'caballero'); projectiles.length = 0; bossStrikes.length = 0;
    if (!(opts && opts.keepGates)) { for (const G of FORT_MAP.gates) { const g = fortS.gates[G.id]; if (g.want === 1) g.open = 1; } fortRebuildShapes(); }
    spawnTimer = 1e12; levelTimer = 0; levelDuration = 1e12;
    for (const h of heroes) { h.x = x + (Math.random()-0.5)*40; h.y = y + (Math.random()-0.5)*40; h._fs = null; }
    if (!(opts && opts.traps)) { fortS.cyc.t = 1e12; }
    window.__noSpawn = setInterval(() => { spawnTimer = 1e12; }, 20);
    return true;
  }, [lv, x, y, opts || null]);
  const heroPos = () => E(() => heroes.map(h => ({x:Math.round(h.x), y:Math.round(h.y), alive:h.alive, walk:fortWalkable(h.x, h.y, -3)})));

  /* ============ 1. GEOMETRÍA Y CONECTIVIDAD ============ */
  {
    await setup(5, 0, 380);
    const g = await E(() => {
      const out = {};
      // configuración "todo abierto": puertas abiertas, giratorio N-S, brazos extendidos, levadizo bajo
      for (const id in fortS.gates) fortS.gates[id].open = fortS.gates[id].want = 1;
      fortS.lift.db_forge.down = fortS.lift.db_forge.want = 1;
      fortS.rot.hub.ang = Math.PI/2; fortS.rot.hub.idx = 0;
      fortRebuildShapes();
      const route = __fs.ROUTE.map(p => fortCompAt(p[0], p[1]));
      out.routeOneComp = route.every(c => c === route[0]);
      out.routeWalkable = __fs.ROUTE.every(p => fortWalkable(p[0], p[1], 0));
      // giratorio O-E: une las plataformas laterales, corta el camino al norte
      fortS.rot.hub.ang = 0; fortS.rot.hub.idx = 1; fortRebuildShapes();
      out.ewJoinsSides = fortCompAt(-800, 380) === fortCompAt(0, 380) && fortCompAt(800, 380) === fortCompAt(0, 380);
      out.ewCutsNorth = fortCompAt(0, -330) !== fortCompAt(0, 380);
      // puertas cerradas cortan de verdad
      fortS.gates.g_prison.open = 0; fortRebuildShapes();
      out.closedGateBlocks = fortCompAt(0, 1100) !== fortCompAt(0, 2000);
      // la red de seguridad de navegación: el mapa de caminos cubre todo el mapa grande
      out.nav = AID_NAV.W + 'x' + AID_NAV.H; out.navOn = AID_NAV.on;
      return out;
    });
    check('GEO.ruta_conectada_con_todo_abierto', g.routeOneComp && g.routeWalkable, g);
    check('GEO.giratorio_OE_une_costados_y_corta_norte', g.ewJoinsSides && g.ewCutsNorth, g);
    check('GEO.puerta_cerrada_bloquea', g.closedGateBlocks, g);
    check('GEO.grilla_navegacion_mapa_grande', g.navOn && g.nav === '67x170', g.nav);
  }

  /* ============ 2. PUENTES QUE SE MUEVEN (con gente, enemigos, bots, proyectiles, caídos) ============ */
  {
    await setup(5, 0, 380);
    const r = await E(() => {
      // giratorio en N-S, todos parados SOBRE el brazo norte (a mitad de camino)
      fortS.rot.hub.ang = Math.PI/2; fortS.rot.hub.idx = 0; fortS.rot.hub.phase = 'hold'; fortS.rot.hub.t = 0; fortS.rot.hub.hold = 500; fortRebuildShapes();
      const R = FORT_MAP.rotors.hub;
      heroes.forEach((h, i) => { h.x = R.x + (i-1.5)*18; h.y = R.y - 380 - i*12; h._fs = null; });
      heroes[3].alive = false; heroes[3].hp = 0; // un caído sobre el puente
      const e1 = spawnEnemy('carcelero', false); e1.x = R.x + 10; e1.y = R.y - 450; e1.speed = 0; e1.dmg = 0; e1._fs = null;
      const e2 = spawnEnemy('dragon_bronce', false); e2.x = R.x; e2.y = R.y - 420; e2.speed = 0; e2.dmg = 0;
      projectiles.push({x:R.x, y:R.y-400, vx:0, vy:0, dmg:0, life:6000, radius:6, color:'#fff', enemy:true, rank:'normal'});
      const before = heroes.map(h => Math.hypot(h.x-R.x, h.y-R.y));
      return {before, n: enemies.length};
    });
    // el aviso: ~2,6 s sin moverse
    const w = await E(() => { __fs.auto = false; for (let i=0;i<60;i++){ update(16); } return {phase: fortS.rot.hub.phase, ang: +fortS.rot.hub.ang.toFixed(3), tele: true}; });
    const w2 = await E(() => { for (let i=0;i<120;i++){ update(16); } return {phase: fortS.rot.hub.phase, ang: +fortS.rot.hub.ang.toFixed(3)}; });
    check('BRIDGE.avisa_antes_de_moverse', w.phase === 'warn' && Math.abs(w.ang - 1.571) < 0.01 && w2.phase === 'warn', {w, w2});
    const mid = await E(() => { let sampleOut = 0; for (let i=0;i<260;i++){ update(16); for (const h of heroes) if (!fortWalkable(h.x, h.y, -3)) sampleOut++; for (const e of enemies) if (e.alive && !e.flying && !fortWalkable(e.x, e.y, -3)) sampleOut++; } return {phase: fortS.rot.hub.phase, ang: +fortS.rot.hub.ang.toFixed(3), sampleOut}; });
    const after = await E(() => { const R = FORT_MAP.rotors.hub; return {dist: heroes.map(h => Math.round(Math.hypot(h.x-R.x, h.y-R.y))), walk: heroes.map(h => fortWalkable(h.x, h.y, -3)), alive: heroes.map(h => h.alive), downedStill: !heroes[3].alive, enemies: enemies.filter(e=>e.alive).map(e => ({t:e.type, walk: e.flying || fortWalkable(e.x, e.y, -3)})), proj: projectiles.length}; });
    check('BRIDGE.gira_y_lleva_a_los_que_estan_encima', Math.abs(mid.ang) < 0.02 && after.walk.every(Boolean) && mid.sampleOut === 0, {mid, after});
    check('BRIDGE.nadie_muere_por_la_geometria', after.alive.slice(0,3).every(Boolean) && after.walk[3], {alive: after.alive, caidoSobreLoCaminable: after.walk[3]});
    check('BRIDGE.enemigos_siguen_sobre_lo_caminable', after.enemies.every(e => e.walk), after.enemies);
  }
  // 2b. brazos retráctiles del Núcleo con alguien encima: lo empujan hacia el disco (nunca a la lava)
  {
    await setup(9, 0, -2900);
    const r = await E(() => {
      fortS.gates.g_core.open = fortS.gates.g_core.want = 1; fortRebuildShapes();
      const h = player; h.x = 0; h.y = -2900 - 330; h._fs = null; // sobre el brazo norte, cerca de la punta
      fortS.rot.core.phase = 'hold'; fortS.rot.core.t = 0; fortS.rot.core.hold = 100; fortS.rot.core.pat = 0; // próximo patrón: sin brazo norte
      let out = 0, maxT = 0; const log = [];
      for (let i=0;i<700;i++){ update(16); if (!fortWalkable(h.x, h.y, -3)) out++; if (i%100===0) log.push([Math.round(h.y), fortS.rot.core_n.ext.toFixed(2)]); }
      return {out, y: Math.round(h.y), ext: fortS.rot.core_n.ext, log, alive: h.alive};
    });
    check('CORE.brazo_que_se_retrae_no_tira_a_nadie', r.out === 0 && r.alive, r);
  }
  // 2c. la plataforma deslizante lleva al que está encima
  {
    await setup(7, -470, -1945);
    const r = await E(() => {
      fortS.gates.g_blast.open = fortS.gates.g_blast.want = 1; fortRebuildShapes();
      heroes.forEach((h,i) => { h.x = -470 + (i-1.5)*20; h.y = -1945; h._fs = null; });
      const st = fortS.slide.sl_int; st.phase = 'hold'; st.t = 0; st.hold = 100;
      let out = 0; for (let i=0;i<500;i++){ update(16); for (const h of heroes) if (!fortWalkable(h.x, h.y, -3)) out++; }
      return {x: heroes.map(h => Math.round(h.x)), slideX: Math.round(st.x), out};
    });
    check('SLIDE.lleva_a_los_de_arriba', r.out === 0 && r.x.every(x => x > 250), r);
  }
  // 2d. separados por el giratorio: el bot NO camina hacia la lava, espera en el borde y se reúne al volver
  {
    await setup(5, 0, 380);
    const r = await E(() => {
      for (const id in fortS.gates) if (id!=='g_knight') fortS.gates[id].open = fortS.gates[id].want = 1;
      const hb = fortS.rot.hub; hb.ang = 0; hb.idx = 1; hb.phase = 'hold'; hb.t = 0; hb.hold = 99999; fortRebuildShapes();
      player.x = -820; player.y = 380; player._fs = null; // jugador en la plataforma oeste
      hb.hold = 200; // gira a N-S: el oeste queda aislado
      for (let i=0;i<600;i++){ update(16); }
      const split = !fortReachable(player, allies[0]);
      let out = 0, lavaWalk = 0; const bx0 = allies.map(a => [a.x, a.y]);
      for (let i=0;i<400;i++){ update(16); for (const a of allies) { if (!fortWalkable(a.x, a.y, -3)) out++; } }
      const distEdge = allies.map(a => Math.round(Math.hypot(a.x - player.x, a.y - player.y)));
      // el mecanismo vuelve (siempre cicla mientras haya alguien en el sector)
      let rejoined = false, t = 0;
      for (let i=0;i<2400 && !rejoined;i++){ update(16); t += 16; rejoined = fortReachable(player, allies[0]); }
      return {split, out, distEdge, rejoined, rejoinS: Math.round(t/1000), hub: hb.idx};
    });
    check('SPLIT.giratorio_puede_aislar', r.split, r);
    check('SPLIT.bots_no_caminan_a_la_lava', r.out === 0, r);
    check('SPLIT.se_reconecta_solo', r.rejoined && r.rejoinS < 35, r);
  }
  // 2e. inicio/fin de oleada con el puente moviéndose (limpieza del nivel, elección de refuerzo)
  {
    await setup(5, 0, 150);
    const r = await E(() => {
      clearInterval(window.__noSpawn);
      const hb = fortS.rot.hub; hb.ang = Math.PI/2; hb.idx = 0; hb.phase = 'hold'; hb.t = 0; hb.hold = 50; fortRebuildShapes();
      heroes.forEach((h,i) => { h.x = (i-1.5)*18; h.y = 377 - 400; h._fs = null; });
      for (let i=0;i<5;i++){ const e = spawnEnemy('prisionero', false); e.x = 0; e.y = 377 - 300; }
      for (let i=0;i<200;i++) update(16); // entra en movimiento
      const moving = hb.phase;
      levelDuration = levelTimer + 30; // termina el nivel JUSTO mientras gira
      let out = 0, err = null;
      for (let i=0;i<400;i++){ if (state === 'buff'){ document.querySelector('#buff-cards > *').click(); } try { update(16); } catch(e){ err = String(e); } for (const h of heroes) if (!fortWalkable(h.x, h.y, -3)) out++; }
      return {moving, lv: runLevel, out, err, state};
    });
    check('WAVE.fin_de_nivel_con_puente_girando', r.out === 0 && !r.err && r.lv === 6, r);
  }

  /* ============ 3. PUERTAS ============ */
  {
    await setup(3, 0, 2000);
    const r = await E(() => { for (let i=0;i<150;i++) update(16); const a = fortS.gates.g_prison.open; const b = fortS.gates.g_bridges.open; return {prison:a, bridges:b}; });
    check('GATE.abre_la_del_sector_y_no_la_siguiente', r.prison === 1 && r.bridges === 0, r);
    const r2 = await E(() => {
      // nunca se cierra con alguien en el hueco
      player.x = 0; player.y = 1510; player._fs = null; fortCloseGate('g_prison');
      for (let i=0;i<200;i++) update(16);
      const stayOpen = fortS.gates.g_prison.open > 0.6;
      player.x = 0; player.y = 1900; player._fs = null;
      for (let i=0;i<200;i++) update(16);
      return {stayOpen, closedAfter: fortS.gates.g_prison.open};
    });
    check('GATE.no_se_cierra_con_alguien_en_el_hueco', r2.stayOpen && r2.closedAfter === 0, r2);
  }

  /* ============ 4. CICLO MECÁNICO ============ */
  for (const [tid, x, y] of [['t_pr1', -500, 1000], ['t_pr3', 0, 1260], ['t_pr4', -500, 960], ['t_pr5', 460, 1320], ['t_fo1', -500, -1050], ['t_br1', 0, 540]]) {
    await setup(tid.startsWith('t_fo') ? 6 : 5, x, y);
    const r = await E(([tid, x, y]) => {
      for (const id in fortS.gates) fortS.gates[id].open = fortS.gates[id].want = 1; fortRebuildShapes();
      const i = FORT_MAP.traps.findIndex(t => t.id === tid), T = FORT_MAP.traps[i];
      const h = player; h.x = x; h.y = y; h._fs = null; h.maxHp = 1000; h.hp = 1000; h.def = 0; runStats.defBonus = 0;
      for (const a of allies) { a.x = 3000; a.y = 3000; a.alive = false; }
      let px = h.x, py = h.y; fortS.traps[i].d = -1;
      _fortTrapStart(i);
      const tele = vfxTeles.some(s => s.on);
      let hpAtWarnEnd = null, st = [];
      for (let k=0;k<500;k++){ h.x = px; h.y = py; update(16); if (T.type==='gear') { const p = fortGearPos(T, fortS.traps[i]); } if (fortS.traps[i].st === 2 && hpAtWarnEnd === null) hpAtWarnEnd = h.hp; st.push(fortS.traps[i].st); if (fortS.traps[i].st === 3) break; }
      return {type: T.type, tele, hpAtWarnEnd, hpEnd: Math.round(h.hp), fired: st.includes(2), cooled: st.includes(3)};
    }, [tid, x, y]);
    check('TRAP.' + r.type + '.' + tid + '_avisa_y_despues_pega', r.tele && r.hpAtWarnEnd >= 999 && r.hpEnd < 999 && r.cooled, r);
  }
  {
    await setup(9, 0, -2900, {traps: true});
    const r = await E(() => {
      for (const id in fortS.gates) fortS.gates[id].open = fortS.gates[id].want = 1; fortRebuildShapes();
      fortS.cyc.t = 0; let maxBusy = 0, fired = 0, last = 0, overlap = 0;
      for (let i=0;i<60000/16;i++){ update(16); for (const h of heroes) h.hp = h.maxHp; let b = 0; for (const s of fortS.traps) if (s.st === 1 || s.st === 2) b++; maxBusy = Math.max(maxBusy, b); if (b > last) fired += b - last; last = b; }
      return {maxBusy, fired, cap: _fortTrapCap()};
    });
    check('TRAP.director_nunca_todas_juntas', r.maxBusy <= 2 && r.fired >= 4, r);
  }

  /* ============ 5. ENEMIGOS ============ */
  const enemyTest = async (name, type, lv, x, y, body) => {
    await setup(lv, x, y);
    const r = await E(([type, body]) => {
      for (const id in fortS.gates) fortS.gates[id].open = fortS.gates[id].want = 1; fortRebuildShapes();
      for (const a of allies) { a.x = player.x + 3000; a.y = player.y; a.alive = false; }
      player.maxHp = player.hp = 1e6;
      const e = spawnEnemy(type, false); e.x = player.x + 260; e.y = player.y; e._fs = null; fortInitEnemy(e);
      return (new Function('e', body))(e);
    }, [type, body]);
    return r;
  };
  {
    const r = await enemyTest('carcelero', 'carcelero', 1, 0, 1900, `
      e.chainCd = 0; e.speed = 0; let tele = false, imm = 0; const d0 = Math.hypot(player.x-e.x, player.y-e.y);
      for (let i=0;i<260 && !(imm > 0 && !e.fortChain);i++){ update(16); if (vfxTeles.some(s=>s.on && s.shape===2)) tele = true; if (player._fortChainImm > 0) imm = player._fortChainImm; }
      const d1 = Math.hypot(player.x-e.x, player.y-e.y);
      // inmune: un segundo tirón enseguida no vuelve a arrastrar
      e.chainCd = 0; player.x = e.x - 260; player.y = e.y; const d2a = 260; let pulled2 = false;
      for (let i=0;i<90;i++){ update(16); if (Math.hypot(player.x-e.x, player.y-e.y) < d2a - 40) pulled2 = true; }
      return {tele, pulled: d1 < d0 - 60, imm, d0: Math.round(d0), d1: Math.round(d1), pulled2, immLeft: Math.round(player._fortChainImm||0)};`);
    check('ENEMY.carcelero_tiron_con_aviso_e_inmunidad', r.tele && r.pulled && r.imm > 0 && !r.pulled2, r);
  }
  {
    const r = await enemyTest('bronce', 'dragon_bronce', 1, 0, 1900, `
      e.breathCd = 0; e.atkCd2 = 99999; let cone = false, slowed = false;
      for (let i=0;i<200;i++){ update(16); if (vfxTeles.some(s=>s.on && s.shape===1)) cone = true; if (player.slowAmt >= 0.39) slowed = true; }
      const flying = !!e.flying, hover = e.hover;
      // muere: aviso de vapor en el piso ANTES del daño
      const hp0 = player.hp; player.x = e.x; player.y = e.y; killEnemy(e);
      const strike = bossStrikes.length > 0; const hpAfterKill = player.hp;
      for (let i=0;i<80;i++) update(16);
      return {cone, slowed, flying, hover, strike, noInstantDmg: hpAfterKill === hp0, dmgLater: player.hp < hp0};`);
    check('ENEMY.bronce_vuela_aliento_lento_y_explota_con_aviso', r.cone && r.slowed && r.flying && r.strike && r.noInstantDmg && r.dmgLater, r);
  }
  {
    const r = await enemyTest('automata', 'automata', 5, 0, 1000, `
      // embestida hacia el borde: se estrella y queda aturdido/vulnerable
      player.x = 560; e.x = 220; e.y = player.y; e.chargeCd = 0; e.slamCd = 99999;
      let line = false, charged = false, crashed = false, vuln = false;
      for (let i=0;i<400;i++){ player.x = 560; update(16); if (vfxTeles.some(s=>s.on && s.shape===2)) line = true; if (e.fortCharge) charged = true; if (e.stunTimer > 1500) crashed = true; if (e.crashVuln) vuln = true; }
      return {line, charged, crashed, vuln, armor: e.dmgTakenMult};`);
    check('ENEMY.automata_embestida_telegrafiada_y_choque', r.line && r.charged && r.crashed && r.vuln, r);
  }
  {
    const r = await enemyTest('prisionero', 'prisionero', 3, 0, 1100, `
      const n0 = enemies.filter(x=>x.alive).length; killEnemy(e);
      const eng = enemies.filter(x=>x.alive && x.type==='engendro');
      const n1 = eng.length; eng.forEach(g => killEnemy(g));
      const n2 = enemies.filter(x=>x.alive && x.type==='engendro').length;
      return {n1, noRecursion: n2 === 0, walk: eng.every(g => fortWalkable(g.x, g.y, -3))};`);
    check('ENEMY.prisionero_se_parte_en_2_sin_recursion', r.n1 === 2 && r.noRecursion && r.walk, r);
  }
  {
    const r = await enemyTest('verdugo', 'verdugo', 5, 0, 1000, `
      e.x = player.x + 150; e.overCd = 0; let over = false, taken = 1, fast = false;
      for (let i=0;i<200;i++){ update(16); if (e.fortOver > 0){ over = true; taken = e.dmgTakenMult; } }
      return {over, taken};`);
    check('ENEMY.verdugo_sobrepresion_recibe_mas_daño', r.over && r.taken > 1.2, r);
  }
  {
    const r = await enemyTest('arana', 'arana', 3, 0, 1100, `
      const a = spawnEnemy('automata', false); a.x = e.x + 60; a.y = e.y; a.speed = 0; a.hp = a.maxHp*0.4; a.dmg = 0; fortInitEnemy(a);
      e.repairCd = 0; e.netCd = 99999; e.shotCd = 99999; const hp0 = a.hp; let beam = false;
      for (let i=0;i<180;i++){ update(16); if (e.fortRepair) beam = true; }
      const healed = a.hp > hp0;
      e.fortRepair = null; e.repairCd = 99999; e.netCd = 0; e.x = player.x + 250; e.y = player.y;
      let net = false, slowed = false;
      for (let i=0;i<150;i++){ update(16); if (fortS.nets.length) net = true; if (player.slowAmt >= 0.44) slowed = true; }
      e.shotCd = 0; let shot = false; for (let i=0;i<30;i++){ update(16); if (projectiles.some(p=>p.fortSpr)) shot = true; }
      return {beam, healed, net, slowed, shot};`);
    check('ENEMY.arana_repara_red_lenta_y_dispara', r.beam && r.healed && r.net && r.slowed && r.shot, r);
  }

  /* ============ 6. SUBJEFE: DRAGÓN DE LA FORJA ============ */
  {
    await setup(6, 0, -1000, {god: true});
    await E(() => { for (const h of heroes) h.baseDmg /= 5; });
    const r = await E(() => {
      for (const id in fortS.gates) if (id !== 'g_blast' && id !== 'g_knight') fortS.gates[id].open = fortS.gates[id].want = 1;
      fortS.lift.db_forge.down = fortS.lift.db_forge.want = 1; fortRebuildShapes();
      levelDuration = 14000; levelTimer = 14000*0.31;
      const seen = {warn:false, fight:false, bomb:false, breath:false, flap:false, over:false, hold:false};
      let d = null, t = 0;
      for (let i=0;i<9000 && !(d && !d.alive); i++){
        update(16); t += 16; for (const h of heroes) if (h.alive) h.hp = h.maxHp;
        if (fortS.dragon.state === 'warn') seen.warn = true;
        d = enemies.find(e => e.type === 'dragon_forja') || d;
        if (d && d.alive){ seen.fight = true; if (d.fortFly) seen.bomb = true; if (d.fortBreath) seen.breath = true; if (d.packSet === 'flap') seen.flap = true; if (d.fortOverload) seen.over = true;
          if (i % 30 === 0) d.hp -= d.maxHp*0.012; }
        if (levelTimer >= levelDuration && d && d.alive) seen.hold = true;
      }
      const deadAt = Math.round(t/1000);
      for (let i=0;i<200;i++) update(16);
      return {seen, deadAt, gate: fortS.gates.g_blast.open, drState: fortS.dragon.state, lv: runLevel, furnace: fortS.furnaceBroken};
    });
    check('DRAGON.entrada_rompiendo_la_compuerta', r.seen.warn && r.seen.fight && r.furnace === 1, r);
    check('DRAGON.bombardeo_aliento_aleteo_sobrecarga', r.seen.bomb && r.seen.breath && r.seen.flap && r.seen.over, r.seen);
    check('DRAGON.el_nivel_espera_su_muerte', r.seen.hold, r);
    check('DRAGON.su_muerte_abre_el_paso', r.drState === 'dead' && r.gate === 1, r);
    await shot('dragon_view', null);
  }

  /* ============ 7. JEFE: CABALLERO ============ */
  {
    await setup(10, 0, -3320, {god: true});
    const r = await E(() => {
      for (const id in fortS.gates) if (id !== 'g_knight') fortS.gates[id].open = fortS.gates[id].want = 1; fortRebuildShapes();
      for (let i=0;i<120;i++) update(16);
      const k = enemies.find(e => e.type === 'caballero');
      const r = {dormant: k && k.fortDormant, waves: activeChampion === k, gateOpen: fortS.gates.g_knight.open};
      // entra solo el jugador: la puerta sigue abierta (esperando a todos)
      player.x = 0; player.y = -3800; player._fs = null; allies.forEach(a => { a.x = 0; a.y = -3300; a._fs = null; a.alive = true; });
      __fs.auto = false;
      for (let i=0;i<100;i++){ for (const a of allies){ a.x = 0; a.y = -3300; } update(16); }
      r.waitsForAll = fortS.knight.state === 'waiting';
      // todos adentro -> se cierra la puerta -> silencio -> se levanta
      allies.forEach((a,i) => { a.x = (i-1)*60; a.y = -3750; a._fs = null; });
      const seq = []; let t = 0;
      for (let i=0;i<800;i++){ update(16); t += 16; if (seq[seq.length-1] !== fortS.knight.state) seq.push(fortS.knight.state); }
      r.seq = seq; r.closed = fortS.gates.g_knight.open === 0; r.bossActive = bossActive; r.boss = boss === k;
      // fases
      const ph = {p2:false, p3:false, adds:0, maxAdds:0, counter:false, exec:false, execTele:false, charge:false};
      for (let i=0;i<9000 && k.alive; i++){
        update(16); for (const h of heroes) if (h.alive) h.hp = h.maxHp;
        if (fortS.knight.phase === 2) ph.p2 = true; if (fortS.knight.phase === 3) ph.p3 = true;
        if (k.fortCounter) ph.counter = true; if (k.fortCharge) ph.charge = true;
        if (k.packSet === 'exec') { ph.exec = true; if (vfxTeles.some(s => s.on && s.shape === 2 && s.r >= 70)) ph.execTele = true; }
        ph.maxAdds = Math.max(ph.maxAdds, enemies.filter(e => e.alive && e.fortAdd).length);
        if (i % 40 === 0 && !k.fortTrans) k.hp -= k.maxHp*0.01;
      }
      r.ph = ph; r.dead = !k.alive; r.state = state;
      for (let i=0;i<100;i++) update(16);
      r.stateAfter = state; r.cleared = !!save.arenasCleared.fortaleza;
      return r;
    });
    check('KNIGHT.sentado_sin_oleadas', r.dormant && r.waves && r.gateOpen === 1, r);
    check('KNIGHT.espera_a_todo_el_equipo', r.waitsForAll, r);
    check('KNIGHT.puerta_se_cierra_silencio_y_se_levanta', r.closed && r.seq.join(',').includes('closing,silence,rising,fight') && r.bossActive && r.boss, r.seq);
    check('KNIGHT.tres_fases_contraataque_carga_ejecucion', r.ph.p2 && r.ph.p3 && r.ph.counter && r.ph.charge && r.ph.exec && r.ph.execTele, r.ph);
    check('KNIGHT.refuerzos_con_tope', r.ph.maxAdds >= 1 && r.ph.maxAdds <= 4, r.ph.maxAdds);
    check('KNIGHT.victoria', r.dead && (r.stateAfter === 'victory' || r.state === 'victory') && r.cleared, r);
  }
  // 7b. red de seguridad: alguien que no entra es arrastrado adentro a los 45 s
  {
    await setup(10, 0, -3800, {god: true});
    const r = await E(() => {
      for (const id in fortS.gates) if (id !== 'g_knight') fortS.gates[id].open = fortS.gates[id].want = 1; fortRebuildShapes();
      __fs.auto = false;
      allies[2].x = 0; allies[2].y = 2000; allies[2]._fs = null; allies[2].alive = false; // caído lejísimos
      let t = 0; while (fortS.knight.state === 'waiting' && t < 60000){ allies[2].x = 0; allies[2].y = 2000; update(16); t += 16; }
      return {t: Math.round(t/1000), state: fortS.knight.state, in: allies[2].y < -3500};
    });
    check('KNIGHT.rezagados_entran_a_los_45s', r.t <= 46 && r.state !== 'waiting' && r.in, r);
  }

  /* ============ 8. RENDIMIENTO Y DIBUJO ============ */
  {
    await setup(8, 0, -1720);
    await E(() => { clearInterval(window.__noSpawn); for (const id in fortS.gates) fortS.gates[id].open = fortS.gates[id].want = 1; fortRebuildShapes(); for (let i=0;i<40;i++){ const e = spawnEnemy(['prisionero','carcelero','arana','automata','verdugo','dragon_bronce'][i%6], false); } });
    const perf = await E(() => { const t0 = performance.now(); let n = 0; while (performance.now() - t0 < 2000){ update(16); render(); n++; } return {frames: n, msPerFrame: +(2000/n).toFixed(2), enemies: enemies.length}; });
    check('PERF.update+render_40_enemigos', perf.msPerFrame < 16, perf);
    await shot('horde_interior');
  }
  // capturas de cada enemigo al lado del campeón (escala)
  {
    await setup(4, 0, 1100);
    await E(() => {
      for (const a of allies){ a.x = 9999; }
      const types = ['carcelero','dragon_bronce','automata','prisionero','engendro','verdugo','arana'];
      types.forEach((t, i) => { const e = spawnEnemy(t, false); e.x = player.x - 330 + i*110; e.y = player.y + 60; e.speed = 0; e.dmg = 0; e.ranged = false; e.chainCd = e.breathCd = e.chargeCd = e.slamCd = e.overCd = e.netCd = e.repairCd = e.shotCd = 1e9; e.atkCd2 = 1e9; e.fx = 1; });
      for (let i=0;i<20;i++) update(16);
    });
    await shot('escala_enemigos');
  }
  {
    await setup(6, 0, -1000);
    await E(() => { for (const a of allies){ a.x = 9999; } const d = spawnEnemy('dragon_forja', false); d.x = player.x + 200; d.y = player.y - 40; fortInitEnemy(d); d.flying = true; d.hover = -70; d.speed = 0; d.dcd = 1e9; activeChampion = d; for (let i=0;i<20;i++) update(16); });
    await shot('escala_dragon_forja');
    await setup(10, 0, -3800);
    await E(() => { for (const a of allies){ a.x = 9999; } for (let i=0;i<20;i++) update(16); });
    await shot('escala_caballero_trono');
  }

  const failed = checks.filter(c => !c.ok);
  console.log(`\n${checks.length - failed.length}/${checks.length} PASS · errores de página: ${errors.length}`);
  errors.slice(0, 20).forEach(e => console.log('  ' + e));
  fs.writeFileSync(path.join(outdir, 'results.json'), JSON.stringify({ checks, errors }, null, 1));
  await browser.close();
  process.exit(failed.length || errors.length ? 1 : 0);
})();
