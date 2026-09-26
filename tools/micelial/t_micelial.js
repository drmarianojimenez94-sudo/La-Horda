// Batería de pruebas del Reino Micelial (sin dibujar: update() a mano).
//   (python3 -m http.server 8771 &) ; node tools/micelial/t_micelial.js
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const BASE = process.env.SE_BASE_URL || 'http://127.0.0.1:8771';
const HELP = require('./sim-helpers.js');
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 360) : '')); if (!ok) fails++; };
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: 800, height: 450 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_CERT|fonts\.g|net::/.test(m.text())) errors.push('console: ' + m.text().slice(0, 300)); });
  await page.goto(`${BASE}/index.html`, { waitUntil: 'load' });
  for (let k = 0; k < 300; k++) { if (await page.evaluate(() => !document.getElementById('title-continue-btn').disabled)) break; await sleep(100); }
  await page.evaluate(HELP);
  await page.evaluate(() => { loop = function(){}; });
  const E = (fn, a) => page.evaluate(fn, a);
  // paso manual del juego (con el equipo invulnerable salvo que se pida)
  await E(() => { window.__step = (ms, god) => { let t = 0; while (t < ms) { if (state === 'buff') { const c = document.querySelector('#buff-cards > *'); if (c) c.click(); continue; } if (state !== 'playing') break; if (god !== false) for (const h of heroes) h.hp = Math.max(h.hp, h.maxHp*0.8); update(16); t += 16; } }; });
  const fresh = (lv) => E((lv) => { __ms.start('guerrero', ['tanque','mago','soporte'], lv || 1, {}); spawnTimer = 1e12; enemies.length = 0; for (const h of heroes) { h.x = (Math.random()-0.5)*100; h.y = 420; } update(16); enemies.length = 0; }, lv);

  // ---------------- geometría ----------------
  await fresh(1);
  const geo = await E(() => {
    let outOk = true, podOk = true, n = 0;
    for (let i = 0; i < 4000; i++) { const x = (Math.random()-0.5)*3000, y = (Math.random()-0.5)*2400; const e = {x, y, radius:20}; micClamp(e); if (micEllNorm(e.x, e.y) > 1.001) outOk = false; if (Math.hypot(e.x, e.y) < MIC_MAP.pod.r - 1) podOk = false; n++; }
    const inside = MIC_NODES.every(nd => micEllNorm(nd.x, nd.y) < 1 && Math.hypot(nd.x, nd.y) > 260);
    return { outOk, podOk, nodes: MIC_NODES.length, inside, nav: AID_NAV.on, startIn: micInside(MIC_MAP.start.x, MIC_MAP.start.y, 20) };
  });
  check('GEO.clamp_nunca_deja_afuera_ni_dentro_del_capullo', geo.outOk && geo.podOk, geo);
  check('GEO.nodos_fungicos_dentro_y_lejos_del_capullo', geo.nodes >= 40 && geo.inside, geo);
  check('GEO.navegacion_propia_y_salida_valida', geo.nav && geo.startIn, geo);
  // un único tramo conexo: BFS de la grilla de navegación alcanza toda celda libre
  const conn = await E(() => { const N = AID_NAV; let free = 0, start = -1; for (let i = 0; i < N.W*N.H; i++) if (!N.blocked[i]) { free++; if (start < 0) start = i; } const seen = new Uint8Array(N.W*N.H); const q = [start]; seen[start] = 1; let c = 0; while (q.length) { const k = q.pop(); c++; const x = k % N.W, y = (k / N.W)|0; for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) { const nx = x+dx, ny = y+dy; if (nx<0||ny<0||nx>=N.W||ny>=N.H) continue; const j = ny*N.W+nx; if (!seen[j] && !N.blocked[j]) { seen[j] = 1; q.push(j); } } } return { free, reach: c }; });
  check('GEO.caverna_conexa_sin_zonas_aisladas', conn.free > 500 && conn.reach === conn.free, conn);
  // aparición: nunca encima del equipo
  const sp = await E(() => { let bad = 0, n = 0; for (let i = 0; i < 60; i++) { const e = spawnEnemy('infectado', false); n++; if (micMinHeroDist(e.x, e.y) < 380) bad++; if (!micInside(e.x, e.y, -2)) bad++; } enemies.length = 0; return { bad, n }; });
  check('SPAWN.por_tuneles_lejos_del_equipo', sp.bad === 0, sp);
  const pack = await E(() => { enemies.length = 0; spawnEnemy('sabueso', false); return enemies.filter(e => e.type === 'sabueso').length; });
  check('SPAWN.sabuesos_llegan_en_jauria', pack >= 2, pack);

  // ---------------- MICELIAL_STAGE y FUNGAL_NODE ----------------
  const st = await E(() => { const r = []; for (const lv of [1,2,3,5,6,7,9,10]) r.push(micStageForLevel(lv)); return r; });
  check('STAGE.germinacion_colonizacion_maduracion_floracion_corazon', JSON.stringify(st) === '[0,0,1,1,2,3,3,4]', st);
  await fresh(1);
  const eco = await E(() => { const seen = new Set(); let max = 0; for (let i = 0; i < 200; i++) { __step(500); for (const c of micS.nodes) seen.add(c); let a = 0; for (const c of micS.nodes) if (c.charCodeAt(0)-48 <= FN.SPORE) a++; max = Math.max(max, a); } return { states: [...seen].sort().join(''), max, len: micS.nodes.length }; });
  check('ECO.ciclo_completo_semilla_a_muerto', ['0','1','2','3','4','5','6','7'].every(c => eco.states.includes(c)), eco);
  const eco2 = await E(() => { runLevel = 9; micS.stage = 3; let max = 0; for (let i = 0; i < 120; i++) { __step(500); let a = 0; for (const c of micS.nodes) if (c.charCodeAt(0)-48 <= FN.SPORE) a++; max = Math.max(max, a); } return max; });
  check('ECO.el_reino_crece_con_las_etapas', eco2 > eco.max, { germ: eco.max, flor: eco2 });

  // ---------------- Núcleos Miceliales ----------------
  await fresh(3);
  // (en las pruebas de mecánicas los bots no pelean: así nadie rompe el núcleo/enemigo que se mide)
  await E(() => { window.__ua = updateAllies; updateAllies = function(){}; });
  const nuc = await E(() => {
    levelDuration = 9e9; const h = heroes[1]; const n = micSpawnNucleo(h.x + 60, h.y, 1); const stages = [];
    for (let i = 0; i < 40; i++) { __step(1000); if (n.nuc && stages[stages.length-1] !== n.nuc.st) stages.push(n.nuc.st); }
    h.x = n.x + 30; h.y = n.y; __step(300);
    const slow = h.slowAmt; const before = enemies.filter(e => e.alive && !e.structure).length;
    __step(7000);
    const after = enemies.filter(e => e.alive && !e.structure).length;
    const r0 = n.nuc.rr, alive0 = n.alive, rc0 = micS.recede.length; n.hp = 1; damageEnemy(n, 50, {src:player});
    return { stages, slow: +slow.toFixed(2), spawned: after - before, recede: micS.recede.length - rc0, alive0, dead: !n.alive, r0: Math.round(r0) };
  });
  check('NUCLEO.cuatro_etapas', JSON.stringify(nuc.stages) === '[1,2,3,4]', nuc);
  check('NUCLEO.infeccion_ralentiza_no_dania', nuc.slow >= 0.3, nuc);
  check('NUCLEO.etapa4_genera_colonia', nuc.spawned >= 1, nuc);
  check('NUCLEO.se_destruye_y_la_infeccion_se_retira', nuc.dead && nuc.recede >= 1, nuc);
  const dir = await E(() => { enemies.length = 0; runLevel = 5; micS.stage = 1; micS.nucT = 0; __step(60000); return { n: __ms.stats ? micNucleos().length : 0, spawned: enemies.filter(e => e.type === 'nucleo_micelial').length }; });
  check('NUCLEO.el_director_los_siembra_con_tope', dir.n >= 1 && dir.n <= 3, dir);
  const dmgInf = await E(() => { enemies.length = 0; const h = heroes[0]; h.hp = h.maxHp; const n = micSpawnNucleo(h.x, h.y + 10, 3); n.nuc.rr = 200; const hp0 = h.hp; for (let i = 0; i < 60; i++) { h.x = n.x; h.y = n.y + 40; update(16); } return { hp0: Math.round(hp0), hp: Math.round(h.hp) }; });
  check('NUCLEO.no_hace_danio_constante', dmgInf.hp >= dmgInf.hp0 - 1, dmgInf);

  // ---------------- los seis enemigos ----------------
  await fresh(4);
  const ace = await E(() => { const h = heroes[0]; const e = micSpawnAt('acechador', h.x + 330, h.y); e.leapCd = 0; const sts = []; let minA = 1; for (let i = 0; i < 300; i++) { update(16); for (const x of heroes) x.hp = x.maxHp; if (e.ac && sts[sts.length-1] !== e.ac.st) sts.push(e.ac.st); } return { sts, hide: e.micHide }; });
  check('ACECHADOR.se_entierra_avisa_y_salta', ['hide','warn','leap','rec'].every(s => ace.sts.includes(s)), ace);
  const tele = await E(() => { enemies.length = 0; const h = heroes[0]; const e = micSpawnAt('acechador', h.x + 330, h.y); e.leapCd = 0; let warnTele = false; for (let i = 0; i < 300; i++) { update(16); for (const x of heroes) x.hp = x.maxHp; if (e.ac && e.ac.st === 'warn' && vfxTeles.some(s => s.on && s.rgb === '150,120,255')) warnTele = true; } return warnTele; });
  check('ACECHADOR.aviso_visible_antes_del_salto', tele);
  const hin = await E(() => { enemies.length = 0; const h = heroes[0]; const e = micSpawnAt('hinchado', h.x + 150, h.y); e.boomCd = 0; e.punchCd = 1e9; let prep = false, telR = 0; for (let i = 0; i < 200; i++) { update(16); for (const x of heroes) x.hp = x.maxHp; if (e.boomS) { prep = true; for (const s of vfxTeles) if (s.on && s.follow === e) telR = s.r; } } e.hp = 1; damageEnemy(e, 99, {src:player}); const deathStrike = bossStrikes.length; return { prep, telR, deathStrike }; });
  check('HINCHADO.explosion_preparada_con_aviso_y_muerte_telegrafiada', hin.prep && hin.telR >= 150 && hin.deathStrike >= 1, hin);
  const per = await E(() => { enemies.length = 0; const h = heroes[0]; const e = micSpawnAt('peregrino', h.x + 400, h.y); const sts = []; let shots = 0; const seen = new Set(); for (let i = 0; i < 500; i++) { update(16); for (const x of heroes) { x.hp = x.maxHp; } h.x = e.x - 400; if (e.pg && sts[sts.length-1] !== e.pg.st) sts.push(e.pg.st); for (const p of projectiles) if (p.src === e && !seen.has(p)) { seen.add(p); shots++; } } return { sts, shots }; });
  check('PEREGRINO.camina_se_planta_y_dispara', per.sts.includes('plant') && per.sts.includes('planted') && per.shots >= 1, per);
  const sab = await E(() => { enemies.length = 0; for (const x of heroes) { x.x = (Math.random()-0.5)*80; x.y = 420; } const h = heroes[0]; const e = micSpawnAt('sabueso', h.x + 220, h.y); e.leapCd = 0; const sts = []; for (let i = 0; i < 200; i++) { update(16); for (const x of heroes) x.hp = x.maxHp; if (e.sb && sts[sts.length-1] !== e.sb.st) sts.push(e.sb.st); } return sts; });
  check('SABUESO.salto_con_aviso', sab.includes('warn') && sab.includes('leap'), sab);
  const cha = await E(() => { enemies.length = 0; const h = heroes[0]; const c = micSpawnAt('chaman', h.x + 280, h.y); const f = micSpawnAt('infectado', h.x + 330, h.y + 40); f.hp = f.maxHp*0.3; f.stunTimer = 1e9; c.regenCd = 0; const hp0 = f.hp; let aura = false, regen = false; for (let i = 0; i < 250; i++) { update(16); for (const x of heroes) x.hp = x.maxHp; if (f._micAura > runElapsedMs) aura = true; if (c.micChan && c.micChan.k === 'regen') regen = true; } return { aura, regen, healed: f.hp > hp0 }; });
  check('CHAMAN.regenera_visible_y_aura', cha.aura && cha.regen && cha.healed, cha);
  const chg = await E(() => { enemies.length = 0; const h = heroes[0]; const c = micSpawnAt('chaman', h.x + 280, h.y); const n = micSpawnNucleo(h.x + 500, h.y, 1); c.regenCd = 1e9; c.germCd = 0; for (let i = 0; i < 150; i++) { update(16); for (const x of heroes) x.hp = x.maxHp; } return { st: n.nuc.st, t: Math.round(n.nuc.t), boost: n._micBoost > 0 }; });
  check('CHAMAN.acelera_la_germinacion', chg.boost || chg.st >= 2, chg);
  const inf = await E(() => { enemies.length = 0; micS.clouds.length = 0; let clouds = 0; for (let i = 0; i < 30; i++) { const e = micSpawnAt('infectado', 300, 300); e.hp = 1; damageEnemy(e, 50, {src:player}); } return {n: micS.clouds.length, max: MIC_CFG.cloud.max}; });
  check('INFECTADO.nube_de_esporas_al_morir_con_tope', inf.n >= 1 && inf.n <= inf.max, inf);
  await E(() => { updateAllies = window.__ua; });
  const bot = await E(() => { enemies.length = 0; const b = allies[0]; b.x = 0; b.y = 420; const f = micSpawnAt('infectado', 60, 430); const c = micSpawnAt('chaman', 250, 420); b._tgtT = 0; botMove(b, 16); return b._tgt && b._tgt.type; });
  check('BOTS.priorizan_al_chaman', bot === 'chaman', bot);

  // ---------------- subjefe ----------------
  await fresh(6);
  const mi = await E(() => { levelTimer = levelDuration*0.31; const sts = []; let links = 0, hold = true; for (let i = 0; i < 400; i++) { __step(100); if (sts[sts.length-1] !== micS.mi.st) sts.push(micS.mi.st); if (levelTimer >= levelDuration && micS.mi.st === 'fight') hold = hold && arenaHook('holdLevel'); if (micS.mi.st === 'fight') { const m = enemies.find(e => e.type === 'micelio' && e.alive); if (m && !links && m.hp > m.maxHp*0.6) { m.hp = m.maxHp*0.6; m.absorbCd = 0; m.mcd = 0; } if (enemies.some(e => e.alive && e.type === 'raiz_absorcion')) links++; } } return { sts, links, spawnsStopped: activeChampion && activeChampion.type }; });
  check('MICELIO.se_construye_delante_y_pelea', mi.sts.includes('build') && mi.sts.includes('fight'), mi);
  check('MICELIO.absorcion_con_raices_rompibles', mi.links >= 1, mi);
  const mi2 = await E(() => { const m = enemies.find(e => e.type === 'micelio' && e.alive); const lk = enemies.filter(e => e.alive && e.type === 'raiz_absorcion'); for (const l of lk) { l.hp = 1; damageEnemy(l, 99, {src:player}); } __step(200); const abs = !!m.micAbs; const hold1 = arenaHook('holdLevel'); m.hp = 1; damageEnemy(m, 99, {src:player}); __step(3000); const s = micS.mi.st; __step(9000); return { abs, hold1, s, lv: runLevel }; });
  check('MICELIO.cortar_raices_corta_la_absorcion', !mi2.abs, mi2);
  check('MICELIO.el_nivel_espera_al_subjefe_y_despues_sigue', mi2.hold1 === true && (mi2.s === 'sink' || mi2.s === 'dead') && mi2.lv >= 7, mi2);

  // ---------------- intervenciones 7-9 ----------------
  await fresh(8);
  const it = await E(() => { micS.inter.t = 0; let n0 = micS.inter.n; const kinds = new Set(); for (let i = 0; i < 90; i++) { __step(1000); kinds.add(micS.inter.last); } return { n: micS.inter.n - n0, kinds: [...kinds].filter(Boolean) }; });
  check('MADRE.intervenciones_con_aviso_en_7_9', it.n >= 4 && it.kinds.length >= 3, it);

  // ---------------- la Madre ----------------
  await fresh(10);
  const mo = await E(() => { const sts = []; for (let i = 0; i < 300; i++) { __step(100); if (sts[sts.length-1] !== micS.mo.st) sts.push(micS.mo.st); } const b = micMotherEntity(); return { sts, boss: !!(b && boss === b), few: enemies.length, lvDur: levelDuration > 1e8 }; });
  check('MADRE.nivel10_silencio_revelacion_y_pelea', JSON.stringify(mo.sts) === '["stir","reveal","fight"]' && mo.boss && mo.lvDur, mo);
  const ph = await E(() => { const b = micMotherEntity(); b.hp = b.maxHp*0.59; let dark = false, bloom = false; for (let i = 0; i < 60; i++) { __step(100); if (micS.mo.dark) dark = true; if (micS.mo.bloom) bloom = true; } const inv = b.dmgTakenMult; b.halCd = 0; b.mcd = 0; b.summonCd = b.whipCd = b.cloudCd = b.rootsCd = b.sporeCd = b.clawCd = 1e9; __step(1500); const hal = micS.hal.length; b.summonCd = b.whipCd = b.cloudCd = b.rootsCd = b.sporeCd = b.clawCd = 0; const hp0 = heroes.map(h => h.hp); for (const z of micS.hal) { z.x = heroes[0].x; z.y = heroes[0].y; } let lost = 0; for (let i = 0; i < 5; i++) { const before = heroes[0].hp; update(16); } return { dark, bloom, ph: micS.mo.ph, hal, inv }; });
  check('MADRE.fase2_oscuridad_floracion_alucinaciones', ph.dark && ph.bloom && ph.ph === 2 && ph.hal >= 3, ph);
  const halNoDmg = await E(() => { enemies.filter(e => e !== micMotherEntity()).forEach(e => e.alive = false); bossStrikes.length = 0; projectiles.length = 0; micS.clouds.length = 0; const b = micMotherEntity(); b.mcd = 1e9; b.bossWind = null; const h = heroes[0]; h.hp = h.maxHp; h.x = 700; h.y = 500; micS.hal.push({x:h.x + 20, y:h.y, k:'sabueso', t:0, d:9000, vx:0, vy:0, h:0}); const hp0 = h.hp; for (let i = 0; i < 30; i++) update(16); return { hp0: Math.round(hp0), hp: Math.round(h.hp) }; });
  check('MADRE.alucinaciones_no_hacen_danio', halNoDmg.hp >= halNoDmg.hp0 - 1, halNoDmg);
  const p3 = await E(() => { const b = micMotherEntity(); b.mcd = 0; b.hp = b.maxHp*0.29; __step(3500); const heart = micS.mo.heart, vuln = b.dmgTakenMult; __step(30000); const K = micSafeK(); const h = heroes[0]; h.x = 900; h.y = -200; h.hp = h.maxHp; const hp0 = h.hp; for (let i = 0; i < 120; i++) { update(16); h.x = 900; h.y = -200; } const outside = h.hp < hp0; const safeIn = micSafeNorm(0, 170) < K; return { heart, vuln, inf: +micS.mo.inf.toFixed(2), K: +K.toFixed(2), outside, safeIn }; });
  check('MADRE.fase3_corazon_expuesto_y_vulnerable', p3.heart && p3.vuln > 1, p3);
  check('MADRE.infeccion_achica_la_zona_segura_enrage_suave', p3.inf > 0.3 && p3.K < 2 && p3.outside && p3.safeIn, p3);
  const botSafe = await E(() => { const b = allies[0]; b.x = 900; b.y = -200; const v = botDangerVec(b.x, b.y, 30); return v && v.x < 0; });
  check('BOTS.vuelven_a_la_zona_segura', botSafe);
  const death = await E(() => { const b = micMotherEntity(); b.hp = 1; damageEnemy(b, 1e6, {src:player}); const s0 = micS.mo.st, re = runEnding; const h = heroes[0]; h.hp = 1; const sts = []; for (let i = 0; i < 130; i++) { __step(100); if (sts[sts.length-1] !== micS.mo.st) sts.push(micS.mo.st); if (state !== 'playing') break; } return { s0, re, sts, state, dead: micS.dead, cleared: save.arenasCleared.micelial }; });
  check('MADRE.secuencia_de_muerte_y_victoria', death.s0 === 'dying' && death.re && death.state === 'victory' && death.dead && death.cleared, death);

  // ---------------- guardado ----------------
  const sv = await E(() => { const raw = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}'); raw.arenasCleared = {bosque:true, acuatica:true, fortaleza:true}; delete raw.micelialMigrated; raw.campaignResetV3 = true; raw.legacyHieloOpen = false; localStorage.setItem(SAVE_KEY, JSON.stringify(raw)); loadSave(); const a = { hielo: isArenaUnlocked('hielo'), mic: isArenaUnlocked('micelial'), flag: save.micelialMigrated };
    raw.micelialMigrated = true; raw.legacyHieloOpen = false; localStorage.setItem(SAVE_KEY, JSON.stringify(raw)); loadSave(); a.hielo2 = isArenaUnlocked('hielo'); return a; });
  check('SAVE.guardado_viejo_conserva_el_hielo_y_abre_el_reino', sv.hielo && sv.mic && sv.flag && !sv.hielo2, sv);

  // ---------------- rendimiento ----------------
  await fresh(9);
  const perf = await E(() => { for (let i = 0; i < 45; i++) micSpawnAt(['infectado','sabueso','acechador','peregrino','hinchado','chaman'][i%6], (Math.random()-0.5)*1400, (Math.random()-0.5)*800 + 100); micSpawnNucleo(400, 300, 4); micSpawnNucleo(-400, 300, 3); for (let i = 0; i < 8; i++) micAddCloud((Math.random()-0.5)*1000, (Math.random()-0.5)*600, 'small'); const t0 = performance.now(); __step(10000); const ms = (performance.now() - t0)/(10000/16); return { msPerFrame: +ms.toFixed(3), enemies: enemies.length }; });
  check('PERF.update_barato_con_horda_nucleos_y_nubes', perf.msPerFrame < 4, perf);
  const draw = await E(() => { window.__origLoopOff = true; const t0 = performance.now(); for (let i = 0; i < 60; i++) render(); return +((performance.now() - t0)/60).toFixed(2); });
  check('PERF.dibujo_por_cuadro', draw < 25, draw);
  check('ERRORES.ninguno', errors.length === 0, errors.slice(0, 5));
  await browser.close();
  console.log(fails ? `${fails} FALLAS` : 'OK');
  process.exit(fails ? 1 : 0);
})();
