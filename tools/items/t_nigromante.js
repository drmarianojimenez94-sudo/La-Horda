// Pruebas del Nigromante rediseñado: cadáveres -> esqueletos (pasiva), almas, Pacto, Cosecha de
// Almas, Gólem de Carne, Plaga potenciada, set Réquiem y una partida real con bots.
//   (python3 -m http.server 8771 &) ; node tools/items/t_nigromante.js
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
    window.__start = (lv) => { for (const k of Object.keys(save.champions)) save.champions[k].unlocked = true; save.stash = []; for (const k in save.champions) save.champions[k].equipment = mkEquipment();
      selectedClass = 'nigromante'; currentArena = 'bosque'; lobbyAllies = ['tanque','guerrero','soporte']; startRun(lv || 3); spawnTimer = 1e12; enemies.length = 0; levelDuration = 9e9; invalidatePassiveCache(); };
    window.__foe = (dx, dy, t) => { const e = spawnEnemy(t || 'zombie', false); e.x = player.x + dx; e.y = player.y + dy; return e; };
    window.__kill = (e) => damageEnemy(e, e.hp*3 + 50, {src:player});
    window.__step = (ms) => { let t = 0; while (t < ms && state === 'playing') { for (const h of heroes) h.hp = Math.max(h.hp, h.maxHp*0.8); update(16); t += 16; } };
  });

  // cadáveres y esqueletos pasivos
  const r1 = await E(() => { __start(3); updateAllies = function(){}; for (let i = 0; i < 4; i++){ const e = __foe(60 + i*30, 20); __kill(e); } __step(1200); const corpses = corpseList.length;
    const sk0 = player.skeletons.length; __step(5000); return { corpses, sk0, sk: player.skeletons.length, max: nigromanteMaxSkeletons(masteryOf('nigromante', 0)), left: corpseList.length }; });
  check('NIGRO.las_muertes_dejan_cadaveres', r1.corpses >= 3, r1);
  check('NIGRO.levanta_esqueletos_de_los_cadaveres_sin_boton', r1.sk0 === 0 && r1.sk >= 2 && r1.sk <= r1.max && r1.left < r1.corpses, r1);
  const r2 = await E(() => { __start(3); updateAllies = function(){}; __step(3000); return player.skeletons.length; });
  check('NIGRO.sin_cadaveres_no_hay_ejercito', r2 === 0, r2);

  // almas
  const r3 = await E(() => { __start(3); for (let i = 0; i < 3; i++) __kill(__foe(80, i*20)); const s1 = player.nigroSouls; const el = __foe(90, 0, 'golem'); el.rank = 'elite'; __kill(el);
    const m = heroDmgOutMult(player); return { s1, s2: player.nigroSouls, m }; });
  check('NIGRO.las_bajas_dan_almas', r3.s1 === 3 && r3.s2 === 5, r3);
  check('NIGRO.almas_guardadas_dan_danio', Math.abs(r3.m - 1.10) < 0.001, r3);
  const r4 = await E(() => { __start(3); player.nigroSouls = 3; nigroTogglePact(player); const a = player.nigroPact; player.nigroSouls = 6; nigroTogglePact(player); return { noSouls: a, armed: player.nigroPact }; });
  check('NIGRO.pacto_necesita_5_almas', r4.noSouls === false && r4.armed === true, r4);

  // Cosecha de Almas normal y potenciada
  const r5 = await E(() => { __start(3); player.fx = 1; player.fy = 0; player.aim = null; const front = __foe(120, 0), back = __foe(-120, 0); front.hp = front.maxHp = 9999; back.hp = back.maxHp = 9999;
    castAbility(player, player.cls.skills[0], false, 0); const n = { front: front.hp < 9999, back: back.hp < 9999, slow: front.slowTimer > 0, souls: player.nigroSouls };
    player.nigroSouls = 8; player.nigroPact = true; player.hp = player.maxHp*0.5; const hp0 = player.hp; const b2 = __foe(-120, 10); b2.hp = b2.maxHp = 9999;
    castAbility(player, player.cls.skills[0], false, 0); return { n, backHit: b2.hp < 9999, sk: player.skeletons.length, souls: player.nigroSouls, heal: player.hp > hp0, pact: player.nigroPact }; });
  check('NIGRO.cosecha_cono_frontal_ralentiza_y_da_almas', r5.n.front && !r5.n.back && r5.n.slow && r5.n.souls > 0, r5);
  check('NIGRO.cosecha_potenciada_nova_esqueletos_y_cura', r5.backHit && r5.sk === 2 && r5.heal && r5.souls <= 5 && !r5.pact, r5);

  // Gólem de Carne
  const r6 = await E(() => { __start(3); updateAllies = function(){}; nigroTogglePact = nigroTogglePact; for (let i = 0; i < 5; i++) __kill(__foe(50 + i*15, 30)); __step(1200);
    const c0 = corpseList.length; player.nigroRaiseT = 1e9; castAbility(player, player.cls.skills[1], false, 1); const g = player.golem; const hp1 = g && g.maxHp;
    const e = __foe(200, 0); e.hp = e.maxHp = 9999; player.aim = {x: e.x, y: e.y}; castAbility(player, player.cls.skills[1], false, 1); player.aim = null;
    return { c0, used: g && g.corpses, hp1, golemAt: g && Math.round(Math.hypot(g.x-e.x, g.y-e.y)), hit: e.hp < 9999, stun: e.stunTimer > 0 }; });
  check('NIGRO.golem_se_arma_con_cadaveres', r6.c0 >= 3 && r6.used >= 3, r6);
  check('NIGRO.golem_existente_salta_y_aplasta', r6.golemAt < 60 && r6.hit && r6.stun, r6);
  const r7 = await E(() => { __start(3); updateAllies = function(){}; castAbility(player, player.cls.skills[1], false, 1); const weak = player.golem.maxHp;
    player.golem = null; for (let i = 0; i < 6; i++) __kill(__foe(40 + i*10, 20)); __step(1200); player.nigroRaiseT = 1e9; castAbility(player, player.cls.skills[1], false, 1); return { weak, strong: player.golem.maxHp }; });
  check('NIGRO.mas_cuerpos_mas_vida', r7.strong > r7.weak * 1.5, r7);

  // Plaga potenciada
  const r8 = await E(() => { __start(3); const far = __foe(0, 0); const p = {x: player.x + 200, y: player.y}; far.x = p.x + 200; far.y = p.y; player.aim = p; castAbility(player, player.cls.skills[2], false, 2); const n = !!far.cursed;
    player.nigroSouls = 6; player.nigroPact = true; castAbility(player, player.cls.skills[2], false, 2); player.aim = null; return { normal: n, pact: !!far.cursed }; });
  check('NIGRO.plaga_potenciada_cubre_mas', r8.normal === false && r8.pact === true, r8);

  // set Réquiem
  const r9 = await E(() => { __start(3); for (const pid of setPieceIds('requiem')) { const it = makeDesignedItem(pid); stashItems().push(it); equipItem('nigromante', it.uid); } invalidatePassiveCache();
    const extra = champSetExtraSkeletons(player); for (let i = 0; i < 5; i++) spawnNigroSkeleton(player, 'warrior', {}); const legion = champSetLegion(player);
    player.hp = player.maxHp*0.5; const hp0 = player.hp; player.nigroSouls = 5; player.nigroPact = true; nigroConsumePact(player); return { extra, legion, heal: player.hp > hp0, dr: setDmgTakenMult(player) }; });
  check('CSET.requiem_esqueleto_extra_cura_y_legion', r9.extra === 1 && r9.legion && r9.heal && r9.dr < 0.9, r9);

  // partida real con bots (sin tocar al piloto): el ejército crece con la horda
  const r10 = await E(() => { __start(4); spawnTimer = 0; levelDuration = 9e9; let maxSk = 0, souls = 0, pacts = 0; const orig = nigroConsumePact; nigroConsumePact = function(h){ const r = orig(h); if (r) pacts++; return r; };
    for (let i = 0; i < 1500 && state === 'playing'; i++){ player.hp = player.maxHp; if (i % 30 === 0){ const t = nearestEnemyTo(player, 400); if (t){ player.fx = (t.x-player.x)/Math.max(1,distance(player,t)); player.fy = (t.y-player.y)/Math.max(1,distance(player,t)); } for (let k = 0; k < 3; k++) if (useSkill(k)) {} triggerBasic(player); if ((player.nigroSouls||0) >= 5 && !player.nigroPact) nigroTogglePact(player); }
      update(16); maxSk = Math.max(maxSk, player.skeletons.length); souls = Math.max(souls, player.nigroSouls||0); }
    return { maxSk, souls, pacts, kills, golem: !!player.golem }; });
  check('NIGRO.partida_real_ejercito_almas_y_pactos', r10.maxSk >= 2 && r10.souls >= 5 && r10.pacts >= 1, r10);
  check('NIGRO.sin_errores', errors.length === 0, errors);
  console.log(`SUMMARY ${fails === 0 ? 'OK' : 'FAIL'} fails=${fails}`);
  await browser.close();
  process.exit(fails ? 1 : 0);
})();
