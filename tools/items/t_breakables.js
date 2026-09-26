// Pruebas de la DESTRUCCIÓN DEL ENTORNO (js/systems/breakables.js): aparecen por nivel, se patean,
// se arman con golpes cercanos o con la etiqueta justa, encadenan y solo dañan a la horda.
//   (python3 -m http.server 8771 &) ; node tools/items/t_breakables.js
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
      selectedClass = cls || 'guerrero'; currentArena = arena || 'bosque'; lobbyAllies = ['tanque','soporte','mago']; startRun(lv || 5); spawnTimer = 1e12; enemies.length = 0; levelDuration = 9e9; invalidatePassiveCache(); if (!window.__ua) window.__ua = updateAllies; updateAllies = function(){}; };
    window.__foe = (dx, dy, t) => { const e = spawnEnemy(t || 'duende_bosque', false); e.x = player.x + dx; e.y = player.y + dy; e.atkCd = 1e9; return e; };
    window.__role = (dx, dy, role, t) => { const e = __foe(dx, dy, t); applyRole(e, role); e.roleT = 0; return e; };
    window.__step = (ms, keepHp) => { let t = 0; while (t < ms && state === 'playing') { if (keepHp) for (const h of heroes) h.hp = Math.max(h.hp, h.maxHp*0.9); update(16); t += 16; } };
    window.__freeze = () => { for (const h of heroes){ h.speed = 0; } };
  });


  const ARENAS = ['infernal','hielo','acuatica','bosque','laberinto','fortaleza','micelial'];
  const r1 = await E((ARENAS) => { const out = {}; for (const a of ARENAS){ __start(3, a); beginLevel(); out[a] = { n: breakables.length, minD: Math.round(Math.min(...breakables.map(b => Math.hypot(b.x-player.x, b.y-player.y)))) }; }
    divinaMode = true; spawnBreakables(); const div = breakables.length; divinaMode = false; return { out, div }; }, ARENAS);
  check('BRK.cada_arena_3_a_5_lejos_de_los_heroes', Object.values(r1.out).every(o => o.n >= 3 && o.n <= 5 && o.minD >= 200) && r1.div === 0, r1);

  // patear: aviso 0,7 s, estalla, efecto del tipo en la horda, nada a los héroes
  const r2 = await E((ARENAS) => { const out = {};
    for (const a of ARENAS){ __start(3, a); beginLevel(); __freeze(); const b = breakables[0]; const foes = [0,1,2].map(i => { const e = __foe(0, 0); e.x = b.x + 30 + i*15; e.y = b.y + 10; e.hp = e.maxHp = 1e5; e.speed = 0; return e; });
      const hp0 = heroes.map(h => h.hp); player.x = b.x; player.y = b.y + 5; for (const h of heroes){ if (h !== player){ h.x = b.x + 40; h.y = b.y; } }
      __step(100); const armed = b.fuse > 0; __step(800); const gone = !breakables.includes(b);
      const f = foes[0]; out[a] = { armed, gone, dmg: foes.every(e => e.lastHitBy === player || e.hp < 1e5), heroesOk: heroes.every((h, i) => h.hp >= hp0[i] - 0.01),
        st: { burn: f.burnTimer > 0, frozen: f.frozenTimer > 0, wet: f.wetTimer > 0, bleed: f.bleedTimer > 0, stun: f.stunTimer > 0, poison: f.poisonTimer > 0 } }; }
    return out; }, ARENAS);
  const expect = { infernal:'burn', hielo:'frozen', acuatica:'wet', bosque:'bleed', laberinto:'stun', fortaleza:'stun', micelial:'poison' };
  const bad2 = Object.entries(r2).filter(([a, o]) => !(o.armed && o.gone && o.dmg && o.heroesOk && o.st[expect[a]]));
  check('BRK.patear_avisa_estalla_y_aplica_su_efecto', bad2.length === 0, bad2.length ? bad2 : r2.acuatica);
  check('BRK.sin_fuego_amigo', Object.values(r2).every(o => o.heroesOk), r2);

  // un golpe a un enemigo pegado lo arma; la explosión encadena al vecino; la etiqueta justa lo prende
  const r3 = await E(() => { __start(3, 'fortaleza'); beginLevel(); __freeze(); breakables.length = 0;
    const b1 = {id:901, kind:'fortaleza', x: player.x + 400, y: player.y, fuse:0, by:-1}, b2 = {id:902, kind:'fortaleza', x: player.x + 500, y: player.y, fuse:0, by:-1}; breakables.push(b1, b2);
    const e = __foe(0, 0); e.x = b1.x + 10; e.y = b1.y; e.hp = e.maxHp = 1e5; e.speed = 0; const e2 = __foe(0, 0); e2.x = b2.x - 20; e2.y = b2.y; e2.hp = e2.maxHp = 1e5; e2.speed = 0;
    damageEnemy(e, 10, {src:player}); const armed1 = b1.fuse > 0; __step(800); const chain = b2.fuse > 0 || !breakables.includes(b2); __step(900);
    __start(3, 'infernal'); beginLevel(); const u = breakables[0]; envEmit('fire', u.x + 20, u.y, player, {r:40}); const lit = u.fuse > 0 && u.fuse <= 120; envEmit('ice', breakables[1].x, breakables[1].y, player, {r:40}); const wrongTag = !(breakables[1].fuse > 0);
    return { armed1, chain, lit, wrongTag }; });
  check('BRK.golpe_cercano_arma_y_encadena', r3.armed1 && r3.chain, r3);
  check('BRK.etiqueta_justa_la_prende_y_otra_no', r3.lit && r3.wrongTag, r3);

  // combo: el ánfora moja y un rayo dispara Conducción
  const r4 = await E(() => { __start(3, 'acuatica', 'axiom'); beginLevel(); __freeze(); const b = breakables[0]; const foes = [0,1].map(i => { const e = __foe(0,0); e.x = b.x + 20 + i*30; e.y = b.y; e.hp = e.maxHp = 1e5; e.speed = 0; e.type = 'duende_bosque'; return e; });
    player.x = b.x; player.y = b.y; __step(900); player.x = b.x - 300; const wet = foes.every(e => e.wetTimer > 0); let label = false; const of = floatText; floatText = function(x, y, t){ if (/CONDUCCI/.test(t)) label = true; return of.apply(this, arguments); };
    runElapsedMs += 1000; const h0 = foes[1].hp; damageEnemy(foes[0], 100, {src:player, chain:true}); floatText = of; return { wet, label, arc: foes[1].hp < h0 }; });
  check('BRK.anfora_moja_y_el_rayo_conduce', r4.wet && r4.arc, r4);

  // dibujo de todos los tipos y partidas reales
  const r5 = await E((ARENAS) => { let drawn = 0; for (const a of ARENAS){ __start(3, a); beginLevel(); for (const b of breakables){ player.x = b.x - 60; player.y = b.y; } render(); drawn += breakables.length; }
    let exploded = 0; for (const a of ['infernal','acuatica','fortaleza']){ __start(4, a, 'tanque'); spawnTimer = 0; const n0 = breakables.length; for (let i = 0; i < 1500 && state === 'playing'; i++){ for (const h of heroes) h.hp = h.maxHp; update(16); if (i % 300 === 0) render(); } exploded += n0 - breakables.length; }
    return { drawn, exploded }; }, ARENAS);
  const r6 = await E(() => { __start(3, 'bosque', 'mago'); beginLevel(); breakables.length = 0; const bot = heroes.find(h => h !== player && h.alive); bot.x = player.x + 60; bot.y = player.y;
    const b = {id:990, kind:'bosque', x: bot.x + 200, y: bot.y, fuse:0, by:-1}; breakables.push(b);
    for (let i = 0; i < 4; i++){ const e = __foe(0, 0); e.x = b.x + 40 + i*12; e.y = b.y + (i%2 ? 30 : -30); e.hp = e.maxHp = 1e5; e.speed = 0; e.atkCd = 1e9; }
    const g = botBreakableGoal(bot); updateAllies = window.__ua; let armed = false; for (let i = 0; i < 150 && !armed; i++){ for (const h of heroes) h.hp = h.maxHp; update(16); armed = b.fuse > 0 || !breakables.includes(b); }
    return { goal: !!g, armed, by: heroes[b.by] && heroes[b.by].classKey }; });
  check('BRK.bot_patea_cuando_la_horda_se_amontona', r6.goal && r6.armed, r6);
  check('BRK.dibujo_y_partidas_reales', r5.drawn >= 21, r5);
  check('BRK.sin_errores', errors.length === 0, errors);
  console.log(`SUMMARY ${fails === 0 ? 'OK' : 'FAIL'} fails=${fails}`);
  await browser.close();
  process.exit(fails ? 1 : 0);
})();
