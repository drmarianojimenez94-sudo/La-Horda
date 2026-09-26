// Pruebas del RITMO del nivel (js/systems/pacing.js: calentamiento, oleada con aviso, respiro,
// clímax) y de la CURACIÓN DE EMERGENCIA (1 por nivel, bots, invitado, no suma puntaje).
//   (python3 -m http.server 8771 &) ; node tools/items/t_pacing.js
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const BASE = process.env.SE_BASE_URL || 'http://127.0.0.1:8771';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 400) : '')); if (!ok) fails++; };
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: 900, height: 506 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_CERT|fonts\.g|net::|404/.test(m.text())) errors.push('console: ' + m.text().slice(0, 300)); });
  await page.addInitScript(() => { window.__campaignMode = true; });
  await page.goto(`${BASE}/index.html`, { waitUntil: 'load' });
  for (let k = 0; k < 300; k++) { if (await page.evaluate(() => !document.getElementById('title-continue-btn').disabled)) break; await sleep(100); }
  const E = (fn, a) => page.evaluate(fn, a);
  await E(() => { loop = function(){};
    window.__start = (lv, arena, cls) => { for (const k of Object.keys(save.champions)) save.champions[k].unlocked = true; save.stash = []; for (const k in save.champions) save.champions[k].equipment = mkEquipment();
      selectedClass = cls || 'guerrero'; currentArena = arena || 'bosque'; lobbyAllies = ['tanque','soporte','mago']; startRun(lv || 5); spawnTimer = 1e12; enemies.length = 0; levelDuration = 9e9; invalidatePassiveCache(); updateAllies = function(){}; };
    window.__foe = (dx, dy, t) => { const e = spawnEnemy(t || 'duende_bosque', false); e.x = player.x + dx; e.y = player.y + dy; e.atkCd = 1e9; return e; };
    window.__role = (dx, dy, role, t) => { const e = __foe(dx, dy, t); applyRole(e, role); e.roleT = 0; return e; };
    window.__step = (ms, keepHp) => { let t = 0; while (t < ms && state === 'playing') { if (keepHp) for (const h of heroes) h.hp = Math.max(h.hp, h.maxHp*0.9); update(16); t += 16; } };
    window.__freeze = () => { for (const h of heroes){ h.speed = 0; } };
  });


  // fases y multiplicadores
  const r1 = await E(() => { __start(5); levelDuration = 60000; const out = {}; for (const p of [0.05, 0.3, 0.45, 0.55, 0.7, 0.9]) out[p] = pacingPhaseAt(p).key;
    let inv = 0, prev = 0; for (const ph of PACE_PHASES){ const u = Math.min(1, ph.until); inv += (u - prev) / ph.mult; prev = u; } return { out, avgRate: inv }; });
  check('PACE.fases_en_orden', r1.out['0.05']==='calentamiento' && r1.out['0.45']==='oleada' && r1.out['0.55']==='respiro' && r1.out['0.9']==='climax', r1);
  check('PACE.promedio_de_aparicion_casi_igual', r1.avgRate > 0.95 && r1.avgRate < 1.08, r1);

  // oleada: aviso, 1,5 s después un grupo desde ese lado
  const r2 = await E(() => { __start(5, 'infernal'); levelDuration = 60000; spawnTimer = 1e12; levelTimer = 60000*0.395; __step(420); const warned = PACE.surgeAt > 0; const ang = PACE.surgeAng; const n0 = enemies.length;
    __step(500); const mid = enemies.length; __step(1200); const got = enemies.filter(e => e.alive); let side = 0; for (const e of got){ const a = Math.atan2(e.y-player.y, e.x-player.x); if (Math.abs(Math.atan2(Math.sin(a-ang), Math.cos(a-ang))) < 1.0) side++; }
    return { warned, n0, mid, after: got.length, side, phase: PACE.phase }; });
  check('PACE.oleada_avisa_y_llega_por_ese_lado', r2.warned && r2.mid === r2.n0 && r2.after >= 5 && r2.side >= r2.after - 1, r2);
  const r3 = await E(() => { __start(1); levelDuration = 60000; spawnTimer = 1e12; levelTimer = 60000*0.395; __step(2000); return enemies.length; });
  check('PACE.nivel_1_sin_oleada', r3 === 0, r3);

  // respiro: poción si el grupo viene golpeado; nada si está sano
  const r4 = await E(() => { let drops = 0; const od = dropPotion; dropPotion = function(...a){ drops++; return od(...a); };
    __start(5); levelDuration = 60000; spawnTimer = 1e12; levelTimer = 60000*0.495; for (let i=0;i<30;i++){ for (const h of heroes) h.hp = h.maxHp*0.4; update(16); } const hurt = drops;
    __start(5); levelDuration = 60000; spawnTimer = 1e12; levelTimer = 60000*0.495; for (let i=0;i<30;i++){ for (const h of heroes) h.hp = h.maxHp; update(16); } dropPotion = od; return { hurt, healthy: drops - hurt }; });
  check('PACE.respiro_con_pocion_solo_si_hace_falta', r4.hurt === 1 && r4.healthy === 0, r4);

  // intervalo real: el respiro espacia mucho más que la oleada
  const r5 = await E(() => { __start(5); levelDuration = 60000; levelTimer = 60000*0.45; const a = pacingIntervalMult(); levelTimer = 60000*0.55; const b = pacingIntervalMult(); bossActive = true; const c = pacingIntervalMult(); bossActive = false; return { surge: a, breath: b, boss: c }; });
  check('PACE.respiro_espaciado_oleada_apretada_sin_director_en_jefe', r5.breath > r5.surge*3 && r5.boss === 1, r5);

  // curación de emergencia
  const r6 = await E(() => { __start(5); player.hp = player.maxHp*0.3; const h0 = player.hp; const ok = emergUse(player); const inst = player.hp - h0; for (let i=0;i<200;i++) updateEmergency(16);
    const tot = player.hp - h0; const again = emergUse(player); const heal0 = player.stats.healEffective||0; beginLevel(); player.hp = player.maxHp*0.5; const next = emergUse(player);
    return { ok, instPct: inst/player.maxHp, totPct: tot/player.maxHp, again, next, healScore: heal0 }; });
  check('EMERG.cura_30_al_instante_y_20_de_a_poco', r6.ok && Math.abs(r6.instPct - 0.3) < 0.01 && Math.abs(r6.totPct - 0.5) < 0.02, r6);
  check('EMERG.una_por_nivel_y_se_recarga', r6.again === false && r6.next === true, r6);
  check('EMERG.no_suma_puntaje_de_curacion', r6.healScore === 0, r6);
  const r7 = await E(() => { __start(5); player.hp = player.maxHp; const full = emergUse(player); divinaMode = true; player.hp = 10; const div = emergCanUse(player); divinaMode = false; return { full, div, charges: player.emergCharges }; });
  check('EMERG.no_se_gasta_con_vida_llena_ni_en_la_divina', r7.full === false && r7.div === false && r7.charges === 1, r7);
  const r8 = await E(() => { __start(5); const b = heroes.find(h => h.classKey === 'tanque'); b.hp = b.maxHp*0.2; botTryAbilities(b); const used = b.emergCharges === 0; const m = heroes.find(h => h.classKey === 'mago'); m.hp = m.maxHp*0.5; botTryAbilities(m); return { used, keep: m.emergCharges === 1 }; });
  check('EMERG.bots_la_usan_solo_en_peligro', r8.used && r8.keep, r8);
  const r9 = await E(() => { __start(5); render(); updateHUD && updateHUD(); const b = document.getElementById('btn-emerg'); player.hp = player.maxHp*0.2; updateHUD(); const urgent = b.classList.contains('urgent'); b.dispatchEvent(new PointerEvent('pointerdown', {bubbles:true})); updateHUD();
    const r = b.getBoundingClientRect(); const overl = ['btn-s1','btn-s2','btn-s3','btn-basic','btn-ult'].filter(id => { const o = document.getElementById(id).getBoundingClientRect(); return !(r.right <= o.left || r.left >= o.right || r.bottom <= o.top || r.top >= o.bottom); });
    return { urgent, spent: b.classList.contains('spent'), charges: player.emergCharges, overl }; });
  check('EMERG.boton_urgente_gastado_y_sin_tapar_habilidades', r9.urgent && r9.spent && r9.charges === 0 && r9.overl.length === 0, r9);

  // partida real con director: nada se rompe y hay oleada
  const r10 = await E(() => { let surges = 0; const orig = pacingSpawnSurge; pacingSpawnSurge = function(){ surges++; return orig(); };
    for (const [a, lv] of [['bosque', 3], ['fortaleza', 4], ['laberinto', 5], ['acuatica', 4]]){ __start(lv, a, 'guerrero'); spawnTimer = 0; levelDuration = 26000; for (let i = 0; i < 1800 && state === 'playing'; i++){ for (const h of heroes) h.hp = h.maxHp; update(16); if (i % 300 === 0) render(); } }
    pacingSpawnSurge = orig; return { surges }; });
  check('PACE.partidas_reales_con_oleadas', r10.surges >= 3, r10);
  check('PACE.sin_errores', errors.length === 0, errors);
  console.log(`SUMMARY ${fails === 0 ? 'OK' : 'FAIL'} fails=${fails}`);
  await browser.close();
  process.exit(fails ? 1 : 0);
})();
