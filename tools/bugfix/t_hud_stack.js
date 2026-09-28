// HUD en celular apaisado: el bloque de estado del guardián (vida, energía y sus indicadores propios)
// no pisa la pastilla de Arena/Nivel/Bajas ni la lista de aliados. Antes la pastilla tenía posición
// fija (106px) y el Nigromante con gólem y Encarnación del Abismo (4 filas extra) la tapaba 25px.
//   (python3 -m http.server 8771 &) ; node tools/bugfix/t_hud_stack.js
let chromium, devices;
try { ({ chromium, devices } = require('playwright')); } catch (e) { ({ chromium, devices } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const BASE = process.env.SE_BASE_URL || process.env.SITE || 'http://127.0.0.1:8771';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 400) : '')); if (!ok) fails++; };
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] });
  const d = Object.assign({}, devices['iPhone 13']); delete d.defaultBrowserType;
  d.viewport = { width: 844, height: 390 }; d.screen = { width: 844, height: 390 };
  const ctx = await b.newContext(d);
  await ctx.addInitScript(() => { try { if (!localStorage.getItem('__s')) { localStorage.clear(); localStorage.setItem('__s', '1'); } } catch (e) {} });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(`${BASE}/index.html`, { timeout: 120000 });
  for (let k = 0; k < 1200; k++) { if (await p.evaluate(() => { const x = document.getElementById('title-continue-btn'); return x && !x.disabled; })) break; await sleep(100); }
  await p.evaluate(() => { for (const k in save.champions) { save.champions[k].level = 30; save.champions[k].unlocked = true; } save.starterChosen = true; save.arenasCleared = {}; for (const a of CAMPAIGN_ORDER) save.arenasCleared[a] = true; persistNow(); document.getElementById('title-continue-btn').click(); });
  for (const c of ['nigromante', 'libertador', 'eren', 'musashi', 'cazadora', 'tanque']) {
    const r = await p.evaluate(async ([c]) => {
      selectedClass = c; currentArena = 'bosque'; startRun(1);
      await new Promise(r => setTimeout(r, 600));
      if (c === 'nigromante') { player.nigroDemonForm = true; player.nigroDemonTimer = 9000; player.golem = {}; }
      await new Promise(r => setTimeout(r, 400));
      const a = document.getElementById('player-status').getBoundingClientRect(), t = document.querySelector('#hud .top').getBoundingClientRect(), q = document.getElementById('party').getBoundingClientRect();
      const sk = document.getElementById('skillzone'); const z = sk ? sk.getBoundingClientRect() : null;
      const out = { status: Math.round(a.bottom), top: [Math.round(t.top), Math.round(t.bottom)], party: [Math.round(q.top), Math.round(q.bottom)], allies: document.querySelectorAll('#party .ally-row').length, visibleAllies: [...document.querySelectorAll('#party .ally-row')].filter(r => r.getBoundingClientRect().bottom <= q.bottom + 1).length };
      if (c === 'nigromante') { player.nigroDemonForm = false; player.golem = null; }
      setState('menu');
      return out;
    }, [c]);
    check('HUD.' + c + '_estado_no_pisa_arena', r.status <= r.top[0], r);
    check('HUD.' + c + '_arena_no_pisa_aliados', r.top[1] <= r.party[0], r);
    check('HUD.' + c + '_se_ven_los_3_aliados', r.visibleAllies === r.allies && r.allies === 3, r);
  }
  check('HUD.sin_errores', errs.length === 0, errs.slice(0, 3));
  await b.close();
  console.log('SUMMARY ' + (fails ? 'FAIL' : 'OK') + ' fails=' + fails);
  process.exit(fails ? 1 : 0);
})();
