// Cristales de los Guardianes (js/systems/crystals.js): se ganan al vencer a un Guardián
// corrompido (Guardián del Laberinto, Mago de Hielo, Madre Espora), vuelan al jugador, se guardan
// y se ven en la pantalla previa.
//   (python3 -m http.server 8771 &) ; node tools/items/t_crystals.js [carpeta_capturas]
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const BASE = process.env.SE_BASE_URL || 'http://127.0.0.1:8771';
const OUT = process.argv[2];
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 400) : '')); if (!ok) fails++; };
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 900, height: 506 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_CERT|fonts\.g|net::|404/.test(m.text())) errors.push('console: ' + m.text().slice(0, 300)); });
  await page.addInitScript(() => { window.__campaignMode = true; });
  const boot = async () => {
    await page.goto(`${BASE}/index.html`, { waitUntil: 'load' });
    for (let k = 0; k < 300; k++) { if (await page.evaluate(() => !document.getElementById('title-continue-btn').disabled)) break; await sleep(100); }
    await sleep(500);
    await page.evaluate(() => { loop = function(){};
      window.__start = (a, lv) => { for (const k of Object.keys(save.champions)) save.champions[k].unlocked = true;
        selectedClass = 'guerrero'; currentArena = a; lobbyAllies = ['tanque','soporte','mago']; startRun(lv); spawnTimer = 1e12; enemies.length = 0; };
      window.__step = (ms) => { let t = 0; while (t < ms) { for (const h of heroes){ h.hp = h.maxHp; } update(16); t += 16; } };
      window.__kill = (e) => { e.hp = 1; damageEnemy(e, 999999, {src:player}); };
    });
  };
  await boot();
  const E = (fn, a) => page.evaluate(fn, a);
  const r0 = await E(() => ({ c: Object.assign({}, save.crystals), n: crystalsOwned().length }));
  check('CR.guardado_nuevo_sin_cristales', r0.n === 0 && r0.c.piedra === false, r0);
  // ---- Guardián del Laberinto (subjefe) ----
  const r1 = await E(() => { __start('laberinto', 6);
    const g = spawnEnemy('guardian_laberinto', false, false); g.x = player.x + 120; g.y = player.y;
    __kill(g); const fx = CRYSTAL_FX.on && CRYSTAL_FX.key === 'piedra';
    __step(1000); render(); return { fx, has: crystalHas('piedra') }; });
  check('CR.guardian_laberinto_da_cristal_de_piedra', r1.fx && r1.has, r1);
  if (OUT) await page.screenshot({ path: OUT + '/crystal_flight.png' });
  const r1b = await E(() => { __step(1800); return { done: !CRYSTAL_FX.on, banner: (document.getElementById('center-banner')||{}).textContent || '', tut: (document.querySelector('#tut-panel .tut-text')||{}).textContent || '' }; });
  check('CR.llega_al_jugador_con_cartel', r1b.done && /PIEDRA/.test(r1b.banner) && /1\/3/.test(r1b.banner), r1b);
  await sleep(700);
  const tut = await E(() => (document.querySelector('#tut-panel .tut-text')||{}).textContent || '');
  check('CR.el_hechicero_comenta', /Cristal de Piedra/.test(tut) && /primero de tres/.test(tut), tut.slice(0, 90));
  // ---- Mago de Hielo (jefe de 2 fases) ----
  const r2 = await E(() => { __start('hielo', 10); runLevel = LEVEL_COUNT; levelTimer = levelDuration + 1; __step(64);
    const t1 = boss && boss.type; __kill(boss); __step(64); const t2 = boss && boss.type; __kill(boss); __step(200);
    return { t1, t2, fx: CRYSTAL_FX.on && CRYSTAL_FX.key === 'escarcha', has: crystalHas('escarcha'), st: state }; });
  check('CR.mago_de_hielo_da_cristal_de_escarcha', r2.t1 === 'mago_hielo_cristal' && r2.t2 === 'angel_caido_hielo' && r2.fx && r2.has && r2.st === 'playing', r2);
  const r2b = await E(() => { __step(3600); return { st: state }; });
  check('CR.victoria_despues_de_la_ceremonia', r2b.st !== 'playing', r2b);
  // ---- persiste al recargar + pantalla previa ----
  await boot();
  const r3 = await E(() => { const n = crystalsOwned(); runIntroShow('infernal', ()=>{}); const el = document.querySelector('#run-intro .ri-crystals');
    return { n, on: el.querySelectorAll('.cr-gem.on').length, all: el.querySelectorAll('.cr-gem').length, txt: el.textContent, vis: getComputedStyle(el).display !== 'none' }; });
  check('CR.persisten_al_recargar', r3.n.length === 2 && r3.n.includes('piedra') && r3.n.includes('escarcha'), r3);
  check('CR.pantalla_previa_muestra_2_de_3', r3.vis && r3.on === 2 && r3.all === 3 && /2\/3/.test(r3.txt), r3);
  if (OUT) { await sleep(300); await page.screenshot({ path: OUT + '/crystal_intro.png' }); }
  check('CR.sin_errores', errors.length === 0, errors);
  await browser.close();
  console.log(fails ? `${fails} FALLAS` : 'OK');
  process.exit(fails ? 1 : 0);
})();
