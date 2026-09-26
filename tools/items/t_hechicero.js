// Final de campaña (js/arenas/infernal/inf-hechicero.js): el Hechicero Supremo es el subjefe del
// nivel 9 de la Infernal (huye en vez de morir) y el jefe final tiene 3 formas:
// Hechicero (cinemática) -> Golem de Cuerpos -> Demonio Mayor.
//   (python3 -m http.server 8771 &) ; node tools/items/t_hechicero.js
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
  await sleep(600);
  const E = (fn, a) => page.evaluate(fn, a);
  await E(() => { loop = function(){};
    window.__start = (lv) => { for (const k of Object.keys(save.champions)) save.champions[k].unlocked = true;
      selectedClass = 'guerrero'; currentArena = 'infernal'; lobbyAllies = ['tanque','soporte','mago']; startRun(lv); spawnTimer = 1e12; enemies.length = 0; };
    window.__step = (ms) => { let t = 0; while (t < ms && state === 'playing') { for (const h of heroes){ h.hp = h.maxHp; } update(16); t += 16; } };
    window.__kill = (e) => { e.hp = 1; damageEnemy(e, 99999, {src:player}); };
  });
  // ---- subjefe nivel 9 ----
  const r1 = await E(() => { __start(9); runLevel = 9; levelTimer = levelDuration*0.5; midBossSpawned = false; __step(64);
    const h = enemies.find(e => e.type === 'hechicero_supremo');
    if (!h) return { none: true };
    const hp0 = h.hp; damageEnemy(h, 500, {src:player}); const cineBlock = h.hp === hp0;
    __step(2200); damageEnemy(h, 50, {src:player}); const hurtAfter = h.hp < hp0;
    let atk = 0; for (let i = 0; i < 400 && h.alive; i++){ __step(16); if (h.bossWind || h.packSet === 'cast') atk++; h.hp = h.maxHp; }
    const atlas = !!(ENEMY_ATLAS_PACK.hechicero_supremo && ENEMY_ATLAS_PACK.hechicero_supremo.ready);
    const dyingBefore = vfxDying.filter(d => d.e && d.e.type === 'hechicero_supremo').length;
    __kill(h);
    const dying = vfxDying.filter(d => d.e && d.e.type === 'hechicero_supremo').length - dyingBefore;
    return { rank: h.rank, cineBlock, hurtAfter, atk, atlas, dead: !h.alive, dying, champ: activeChampion === null }; });
  check('HECH.subjefe_nivel9_aparece', !r1.none && r1.rank === 'subjefe', r1);
  check('HECH.intocable_en_cinematica_y_despues_pelea', r1.cineBlock && r1.hurtAfter, r1);
  check('HECH.usa_sus_habilidades', r1.atk > 5, r1);
  check('HECH.arte_cargado', r1.atlas, r1);
  check('HECH.huye_en_vez_de_morir', r1.dead && r1.dying === 0 && r1.champ, r1);
  // ---- jefe final: 3 formas ----
  const r2 = await E(() => { __start(10); runLevel = LEVEL_COUNT; levelTimer = levelDuration + 1; __step(32);
    const g = boss; if (!g) return { none: true };
    const t0 = g.type, hp0 = g.hp; damageEnemy(g, 500, {src:player}); const cineBlock = g.hp === hp0;
    const sets = []; for (let i = 0; i < 200; i++){ __step(16); if (g.packSet && !sets.includes(g.packSet)) sets.push(g.packSet); }
    let busy = 0; for (let i = 0; i < 500; i++){ __step(16); if (g.bossWind || g.channel || g.packSet) busy++; g.hp = Math.max(g.hp, g.maxHp*0.6); }
    __kill(g); __step(32);
    const b2 = boss; const t2 = b2 && b2.type, name2 = b2 && b2.name, alive2 = b2 && b2.alive, st2 = state;
    __kill(b2); __step(3000);
    return { t0, cineBlock, sets, busy, t2, name2, alive2, st2, finalState: state, runEnding: typeof runEnding !== 'undefined' ? runEnding : null }; });
  check('FINAL.forma2_golem_con_transformacion', r2.t0 === 'golem_cuerpos' && r2.cineBlock && r2.sets.includes('pre') && r2.sets.includes('tf'), r2);
  check('FINAL.golem_ataca_despues', r2.busy > 20, r2);
  check('FINAL.forma3_demonio_nace_del_golem', r2.t2 === 'demonio_mayor' && r2.alive2 && /Forma Final/.test(r2.name2) && r2.st2 === 'playing', r2);
  check('FINAL.matar_la_forma3_gana', r2.finalState !== 'playing' || !!r2.runEnding, r2);
  check('HECH.sin_errores', errors.length === 0, errors);
  await browser.close();
  console.log(fails ? `${fails} FALLAS` : 'OK');
  process.exit(fails ? 1 : 0);
})();
