// Humo de las MINAS PROFUNDAS: arranca la partida, prueba la luz (apagar / encender / oscuridad), el
// descenso por sectores, cada enemigo (Consumidor absorbe, Escupidor crea oscuridad, Devoraluz elige y
// devora una luz y se interrumpe con daño), el Titán de Piedra y Cerbero con sus tres actos. Después
// verifica la regla canónica: CERBERO MUERTO != VICTORIA (casos A, B, F) e INTERACCIÓN CON EL PORTAL =
// VICTORIA + ARENA INFERNAL DESBLOQUEADA (casos C, E, G).
//   (python3 -m http.server 8771 &) ; node tools/minas/smoke.js <outdir>
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const fs = require('fs'), path = require('path');
const BASE = process.env.SE_BASE_URL || 'http://127.0.0.1:8771';
const outdir = process.argv[2] || '/tmp/mn_smoke'; fs.mkdirSync(outdir, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const checks = {}; const ok = (k, v) => { checks[k] = !!v; };
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: 1000, height: 560 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_CERT|fonts\.g|net::/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.goto(`${BASE}/index.html`, { waitUntil: 'load' });
  for (let k = 0; k < 300; k++) { if (await page.evaluate(() => !document.getElementById('title-continue-btn').disabled)) break; await sleep(100); }
  const E = (fn, a) => page.evaluate(fn, a);
  const shot = n => page.screenshot({ path: path.join(outdir, n + '.png') });
  const god = () => E(() => { for (const h of heroes) { h.invulnTimer = 1e9; } });
  ok('orden_campania', await E(() => ARENA_ORDER.indexOf('minas') === 8 && ARENA_ORDER[9] === 'infernal' && !ARENA_MODS.minas.comingSoon && campaignNumberLabel('minas') === '09'));
  await E(() => { save.arenasCleared.minas = false; selectedClass = 'guerrero'; currentArena = 'minas'; lobbyAllies = ['tanque', 'mago', 'soporte']; startRun(1); });
  await sleep(2500); await shot('L1_start');
  ok('estado', await E(() => !!mnS && mnS.sec === 0 && mnS.lights.length >= 8 && AID_NAV.on));
  await god();
  // --- LUZ: apagar -> aparece ENCENDER -> mantener -> vuelve a prender ---
  await E(() => { const L = mnS.lights[0]; mnLightOff(L, 'test', 0); player.x = L.x + 30; player.y = L.y + 30; });
  await sleep(400);
  ok('luz_apagada_ctx', await E(() => mnS.lights[0].st === 0 && mnS.ctx.some(t => t.kind === 'mn_light' && t.li === 0)));
  await E(() => { const t = mnS.ctx.find(q => q.li === 0); player._ctxHold = t.id; });
  await sleep(1900); await shot('L1_relight');
  ok('luz_reencendida', await E(() => mnS.lights[0].st === 2 && mnS.relit >= 1));
  // --- OSCURIDAD: lejos de toda luz = vulnerable (+15%), en la luz no ---
  const darkPt = await E(() => { for (let y = -700; y < 700; y += 40) for (let x = -1000; x < 1000; x += 40) if (mnInside(x, y, 30) && mnLightAt(x, y) === 0) return {x, y}; return null; });
  if (darkPt) await E((p) => { player.x = p.x; player.y = p.y; }, darkPt);
  await sleep(500); await shot('L1_dark');
  ok('oscuridad_vulnerable', darkPt && await E(() => player._mnDark === true && mnHeroDmgTakenMult(player) > 1.1));
  // --- DESCENSO: nivel 3 = Galerías ---
  await E(() => { runLevel = 3; levelTimer = 0; beginLevel(); });
  await sleep(1500); await shot('L3_descent');
  await sleep(2200);
  ok('descenso', await E(() => mnS.sec === 1 && !mnS.desc && Math.hypot(player.x - MN_SECTORS[1].entry.x, player.y - MN_SECTORS[1].entry.y) < 200));
  await god(); await shot('L3_galerias');
  // --- ENEMIGOS ---
  await E(() => { runLevel = 5; levelTimer = 0; beginLevel(); }); await sleep(3200); await god();
  ok('sector_vetas', await E(() => mnS.sec === 2));
  await E(() => { for (const t of ['mn_esclavo', 'mn_insecto', 'mn_acechador', 'mn_minero', 'mn_escupidor']) { const p = mnNearestFree(player.x + 240, player.y - 200, 30); mnSpawnAt(t, p.x, p.y); } });
  await sleep(9000); await shot('L5_enemigos');
  ok('enemigos_vivos', await E(() => enemies.some(e => e.alive && e.type.indexOf('mn_') === 0)));
  ok('zona_oscuridad', await E(() => mnS.zones.length > 0 || mnS.shots.some(s => s.k === 'dark') || enemies.some(e => e.type === 'mn_escupidor' && e.boltCd < 4200)));
  // Consumidor absorbe una luz
  const drainL = await E(() => { for (const e of enemies) e.alive = false; enemies = []; const L = mnS.lights.find(q => q.st === 2); const e = mnSpawnAt('mn_consumidor', L.x + 60, L.y + 40); e.hp = e.maxHp = 1e6; return L.i; });
  await sleep(6000); await shot('L5_consumidor');
  ok('consumidor_absorbe', await E((i) => mnS.lights[i].e < 0.75, drainL));
  await E(() => { const e = mnEnt('mn_consumidor'); if (e) damageEnemy(e, 1e9, {}); });
  await sleep(400);
  ok('consumidor_libera', await E((i) => mnS.lights[i].e >= 0.99, drainL));
  // Devoraluz: elige una luz, viaja, devora; un golpe fuerte lo interrumpe
  await E(() => { runLevel = 6; mnS.dev.lv = 6; mnS.dev.n = 0; });
  const dv = await E(() => { const e = mnDevSpawn(); e.hp = e.maxHp = 5000; return !!e; });
  await sleep(1200);
  ok('devoraluz_elige', dv && await E(() => { const e = mnEnt('mn_devoraluz'); return e && e.dv && (e.dv.st === 'TRAVEL' || e.dv.st === 'DEVOUR') && e.dv.L >= 0; }));
  await E(() => { const e = mnEnt('mn_devoraluz'), L = mnS.lights[e.dv.L]; e.x = L.x + 60; e.y = L.y + 30; });
  for (let k = 0; k < 20; k++) { await sleep(200); if (await E(() => { const e = mnEnt('mn_devoraluz'); return e && e.dv.st === 'DEVOUR'; })) break; }
  await shot('L6_devoraluz');
  await E(() => { const e = mnEnt('mn_devoraluz'); damageEnemy(e, e.maxHp * 0.2, {}); });
  await sleep(300);
  ok('devoraluz_interrumpido', await E(() => { const e = mnEnt('mn_devoraluz'); return e && e.dv.st === 'STAGGER'; }));
  await sleep(1500);
  await E(() => { const e = mnEnt('mn_devoraluz'), L = mnS.lights[e.dv.L >= 0 ? e.dv.L : 0]; e.dv.st = 'DEVOUR'; e.dv.t = MN_CFG.devoraluz.devourMs; e.dv.hp = e.hp; });
  await sleep(500);
  ok('devoraluz_devora', await E(() => mnS.devoured >= 1));
  await E(() => { const e = mnEnt('mn_devoraluz'); if (e) damageEnemy(e, 1e9, {}); });
  await sleep(500);
  ok('devoraluz_devuelve_luz', await E(() => mnS.lights.some(L => L.dev) === false || mnS.lights.filter(L => L.st === 2).length > 0));
  // --- TITÁN DE PIEDRA (nivel 8) ---
  await E(() => { runLevel = 8; levelTimer = 0; beginLevel(); }); await sleep(3200); await god();
  await E(() => { levelTimer = levelDuration * 0.31; });
  await sleep(4000); await god(); await shot('L8_titan');
  ok('titan', await E(() => !!mnEnt('mn_titan') && mnS.ti.st === 'fight' && mnHoldLevel()));
  await E(() => { const e = mnEnt('mn_titan'); e.stompCd = 0; });
  await sleep(2500); await shot('L8_titan_pisoton');
  await E(() => { const e = mnEnt('mn_titan'); e.hp = e.maxHp * 0.45; });
  await sleep(4000); await shot('L8_titan_derrumbe');
  await E(() => { const e = mnEnt('mn_titan'); if (e) damageEnemy(e, 1e9, {}); });
  await sleep(5000);
  ok('titan_cae_infierno', await E(() => mnS.ti.st === 'done' && mnS.hell > 0.2));
  // --- CERBERO (nivel 10) ---
  await E(() => { runLevel = 10; levelTimer = 0; beginLevel(); }); await sleep(3400); await god();
  ok('sector_umbral', await E(() => mnS.sec === 5));
  await sleep(6500); await god(); await shot('L10_cerbero');
  ok('cerbero', await E(() => !!mnCerbEntity() && bossActive && mnS.cb.act === 1));
  await E(() => { const e = mnCerbEntity(); e.flameCd = 0; });
  await sleep(2600); await shot('L10_lanzallamas');
  await E(() => { const e = mnCerbEntity(); e.hp = e.maxHp * 0.6; });
  await sleep(800);
  ok('acto2', await E(() => mnS.cb.act === 2));
  await E(() => { const e = mnCerbEntity(); e.hp = e.maxHp * 0.3; e.howlCd = 0; });
  await sleep(2500); await shot('L10_acto3');
  ok('acto3', await E(() => mnS.cb.act === 3));
  // antes del portal Infernal está CERRADA (sin aperturas heredadas ni modo prueba): G mide el desbloqueo real
  ok('G0_infernal_cerrada_antes', await E(() => { save.legacyOpenArenas = (save.legacyOpenArenas || []).filter(k => k !== 'infernal'); save.arenasCleared.infernal = false;
    for (const a of ARENA_ORDER) if (a !== 'minas' && a !== 'infernal') save.arenasCleared[a] = true; save.arenasCleared.minas = false;
    return !(typeof PLAYTEST_UNLOCK_ALL !== 'undefined' && PLAYTEST_UNLOCK_ALL) && !isArenaUnlocked('infernal'); }));
  // CASO A: matar a Cerbero NO es la victoria
  await E(() => { const e = mnCerbEntity(); damageEnemy(e, 1e12, {}); });
  await sleep(1500); await shot('L10_muerte');
  ok('A_muerte_no_victoria', await E(() => state === 'playing' && !runEnding && mnS.cb.st === 'dying' && !save.arenasCleared.minas));
  // CASO B: esperar: la partida sigue, el portal se abre
  for (let k = 0; k < 40; k++) { await sleep(500); if (await E(() => mnS.portal.st === 'open')) break; }
  await sleep(600); await shot('L10_portal');
  ok('B_sigue_y_portal', await E(() => state === 'playing' && !runEnding && mnS.portal.st === 'open' && mnS.ctx.some(t => t.kind === 'mn_portal')));
  // CASO F: los bots parados en el portal no terminan la partida
  await E(() => { const G = MN_SECTORS[5].portal; for (const h of heroes) if (h !== player) { h.x = G.x; h.y = G.y + 40; } player.x = G.x + 300; player.y = G.y + 300; });
  await sleep(3000);
  ok('F_bots_no_cruzan', await E(() => state === 'playing' && mnS.portal.st === 'open' && !CTX_KINDS.mn_portal.canUse(heroes.find(h => h !== player), {})));
  // CASO C: el jugador interactúa -> VICTORIA
  await E(() => { const G = MN_SECTORS[5].portal; player.x = G.x; player.y = G.y + 40; });
  await sleep(300);
  await E(() => { const t = mnS.ctx.find(q => q.kind === 'mn_portal'); player._ctxHold = t.id; });
  await sleep(2500); await shot('L10_cruza');
  ok('C_portal_victoria', await E(() => mnS.portal.st === 'used' && runEnding));
  // CASO E (local): una segunda finalización se ignora
  ok('E_una_sola_vez', await E(() => completeArenaByExit() === false && mnPortalEnter(player) === false));
  await sleep(4500); await shot('victoria');
  // CASO G: victoria + Arena Infernal desbloqueada
  ok('G_victoria_y_desbloqueo', await E(() => state === 'victory' && !!save.arenasCleared.minas && isArenaUnlocked('infernal')));
  const html = await E(() => document.body.innerText);
  ok('resultados_luz', /Luces reencendidas/i.test(html) && /UMBRAL/.test(html));
  console.log(JSON.stringify(checks));
  console.log('SUMMARY', Object.values(checks).every(Boolean) ? 'OK' : 'FAIL', 'fails=' + Object.entries(checks).filter(([k, v]) => !v).map(([k]) => k).join(','));
  console.log('ERRORS', errors.length); errors.slice(0, 20).forEach(e => console.log(e));
  await browser.close();
})();
