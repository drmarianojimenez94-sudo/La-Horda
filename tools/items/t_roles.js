// Pruebas de los ROLES ENEMIGOS (js/enemies/enemy-roles.js): cada rol hace lo suyo, se puede
// contrarrestar (salir de la marca, alejarse del suicida...), los bots los priorizan y aparecen
// en una partida real sin romper nada.
//   (python3 -m http.server 8771 &) ; node tools/items/t_roles.js
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

  // asignación: nunca a jefes/élites, respeta topes
  const r0 = await E(() => { __start(9, 'infernal'); const saveCh = ROLE_CHANCE_BY_LEVEL.slice(); ROLE_CHANCE_BY_LEVEL.fill(1);
    const boss = spawnEnemy('demonio_mayor', true); maybeAssignRole(boss); const el = __foe(100, 0, 'golem'); el.rank = 'elite'; maybeAssignRole(el);
    for (let i = 0; i < 20; i++) maybeAssignRole(__foe(200 + i*10, 0, 'esqueleto'));
    const n = enemies.filter(e => e.role).length, per = {}; for (const e of enemies) if (e.role) per[e.role] = (per[e.role]||0) + 1;
    ROLE_CHANCE_BY_LEVEL.splice(0, 99, ...saveCh);
    return { boss: !!boss.role, elite: !!el.role, n, max: roleMaxConcurrent(), per, pool: ROLE_POOL_BY_ARENA.infernal }; });
  check('ROLES.nunca_en_jefes_ni_elites', !r0.boss && !r0.elite, r0);
  check('ROLES.tope_por_nivel_y_por_rol', r0.n === r0.max && Object.values(r0.per).every(v => v <= 3) && Object.keys(r0.per).every(k => r0.pool.includes(k)), r0);
  const rLow = await E(() => { __start(1, 'bosque'); for (let i = 0; i < 60; i++) maybeAssignRole(__foe(200 + i, 0)); return enemies.filter(e => e.role).length; });
  check('ROLES.nivel_1_sin_roles', rLow === 0, rLow);

  // sanador
  const r1 = await E(() => { __start(5); const s = __role(300, 0, 'sanador'); const hurt = __foe(330, 30); hurt.hp = hurt.maxHp*0.5; const far = __foe(-400, 0); far.hp = far.maxHp*0.5; const h0 = hurt.hp;
    __step(50, true); return { healed: hurt.hp - h0 > hurt.maxHp*0.06, far: far.hp < far.maxHp*0.52 }; });
  check('ROLES.sanador_cura_solo_a_los_cercanos', r1.healed && r1.far, r1);

  // resucitador
  const r2 = await E(() => { __start(5); __freeze(); const r = __role(260, 0, 'resucitador'); r.roleT = 1e9; const victim = __foe(300, 20); damageEnemy(victim, victim.hp + 10, {src:player}); __step(1300, true);
    const c0 = corpseList.length; r.roleT = 0; __step(50, true); const raised = enemies.filter(e => e.alive && e.summonedByRole);
    return { c0, c1: corpseList.length, raised: raised.length, xp: raised[0] && raised[0].xp }; });
  check('ROLES.resucitador_levanta_cadaveres_sin_xp', r2.c0 >= 1 && r2.c1 === r2.c0 - 1 && r2.raised === 1 && r2.xp === 0, r2);

  // invocador
  const r3 = await E(() => { __start(5); __freeze(); const inv = __role(320, 0, 'invocador'); const n0 = enemies.length; __step(50, true); const n1 = enemies.length; __step(800, true);
    const s = enemies.filter(e => e.summoner === inv); inv.roleT = 0; __step(50, true); maybeAssignRole(s[0]);
    return { n0, before: n1, after: enemies.length, summons: s.length, noRole: !s[0].role }; });
  check('ROLES.invocador_avisa_y_trae_refuerzos', r3.before === r3.n0 && r3.summons === 2 && r3.noRole, r3);

  // protector
  const r4 = await E(() => { __start(5); const p = __role(300, 0, 'protector'); const a = __foe(330, 0); const b = __foe(-300, 0); a.hp = a.maxHp = b.hp = b.maxHp = 9999; __step(20, true);
    damageEnemy(a, 100, {src:player}); damageEnemy(b, 100, {src:player}); return { a: 9999 - a.hp, b: 9999 - b.hp, links: (p._links||[]).length }; });
  check('ROLES.protector_reduce_danio_a_los_suyos', r4.a > 0 && r4.a < r4.b*0.7 && r4.links >= 1, r4);

  // carcelero: quieto = enraizado; salir de la marca = libre
  const r5 = await E(() => { __start(5); __freeze(); const c = __role(250, 0, 'carcelero'); __step(50, true); __step(1000, true); const stay = { slow: player.slowAmt, t: player.slowTimer };
    player.slowAmt = 0; player.slowTimer = 0; c.roleT = 0; __step(50, true); player.x += 200; __step(1000, true); return { stay, moved: player.slowAmt }; });
  check('ROLES.carcelero_enraiza_si_no_salis', r5.stay.slow >= 0.9 && r5.stay.t > 0 && r5.moved < 0.9, r5);

  // cazador: va por el soporte/mago herido aunque el tanque esté más cerca
  const r6 = await E(() => { __start(5); const tank = heroes.find(h => h.classKey === 'tanque'), sup = heroes.find(h => h.classKey === 'soporte');
    const c = __role(0, 0, 'cazador'); c.x = tank.x + 60; c.y = tank.y; sup.x = tank.x + 300; sup.y = tank.y; sup.hp = sup.maxHp*0.4; const t = roleHunterTarget(c); return { tgt: t && t.classKey, spd: c.speed / ENEMY_BASE[c.type].speed }; });
  check('ROLES.cazador_persigue_al_mas_fragil', r6.tgt === 'soporte' && r6.spd > 1.3, r6);

  // suicida: parpadea, explota, lastima; alejarse lo esquiva
  const r7 = await E(() => { __start(5); __freeze(); const s = __role(50, 0, 'suicida'); player.hp = player.maxHp; const hp0 = player.hp; __step(1100); const hit = player.hp < hp0;
    const s2 = __role(50, 0, 'suicida'); player.hp = player.maxHp; __step(100); player.x -= 250; __step(1100); return { hit, dead: !s.alive, dodged: player.hp === player.maxHp, dead2: !s2.alive }; });
  check('ROLES.suicida_explota_y_se_puede_esquivar', r7.hit && r7.dead && r7.dodged && r7.dead2, r7);

  // comandante: horda más rápida y fuerte; al morir, duda
  const r8 = await E(() => { __start(5); __freeze(); const c = __role(300, 0, 'comandante'); c.hp = c.maxHp = 99999; const f = __foe(330, 0); __step(20, true);
    const buffed = roleCommandBuff(f); const x0 = f.x; __step(160, true); const movedB = Math.abs(f.x - x0);
    damageEnemy(c, 1e6, {src:player}); return { buffed, movedB, slowAfter: f.slowAmt, dead: !c.alive }; });
  check('ROLES.comandante_potencia_y_al_morir_desmoraliza', r8.buffed && r8.dead && r8.slowAfter >= 0.3, r8);

  // artillero: aviso de 1 s; quieto = golpe; moverse = esquiva (cuenta como esquivable)
  const r9 = await E(() => { __start(5, 'fortaleza'); __freeze(); const a = __role(320, 0, 'artillero'); player.fx = 0; player.fy = 0; player.hp = player.maxHp; __step(50); const tele = bossStrikes.length;
    __step(1100); const hit = player.maxHp - player.hp; const av = player.stats && player.stats.avoidableTaken;
    player.hp = player.maxHp; a.roleT = 0; __step(50); player.x += 300; __step(1100); return { tele, hit, av, dodged: player.hp === player.maxHp }; });
  check('ROLES.artillero_avisa_y_se_esquiva', r9.tele === 2 && r9.hit > 0 && r9.dodged && r9.av > 0, r9);

  // bots: el mago/asesino eligen al sanador antes que a la chusma
  const r10 = await E(() => { __start(5); const mago = heroes.find(h => h.classKey === 'mago'); const near = __foe(0, 0); near.x = mago.x + 60; near.y = mago.y; const s = __role(0, 0, 'sanador'); s.x = mago.x + 200; s.y = mago.y + 20;
    for (let i = 0; i < 3; i++){ const o = __foe(0, 0); o.x = s.x + 20*i; o.y = s.y + 15; } const tm = botPickTarget(mago, 400); return { mago: tm === s }; });
  check('ROLES.bots_priorizan_al_sanador', r10.mago, r10);

  // partida real: aparecen roles, se dibujan y nada se rompe
  const r11 = await E(() => { const seen = {}; let frames = 0;
    for (const [arena, lv] of [['bosque', 6], ['fortaleza', 7], ['micelial', 8], ['infernal', 9]]){
      __start(lv, arena, 'mago'); spawnTimer = 0; for (let i = 0; i < 2400 && state === 'playing'; i++){ for (const h of heroes) h.hp = h.maxHp; update(16); frames++;
        for (const e of enemies) if (e.role) seen[e.role] = (seen[e.role]||0) + 1; if (i % 200 === 0) render(); }
    }
    const kinds = Object.keys(seen); return { kinds, n: kinds.length, frames }; });
  check('ROLES.aparecen_en_partidas_reales', r11.n >= 5, r11);
  check('ROLES.sin_errores', errors.length === 0, errors);
  console.log(`SUMMARY ${fails === 0 ? 'OK' : 'FAIL'} fails=${fails}`);
  await browser.close();
  process.exit(fails ? 1 : 0);
})();
