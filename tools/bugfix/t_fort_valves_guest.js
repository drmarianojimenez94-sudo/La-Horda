// Cooperativo, La Fortaleza, nivel 10: el INVITADO ve y puede usar las válvulas de vapor del Caballero.
// Antes fortS.duo.valves[i] quedaba a 4 niveles de profundidad del snapshot (netSer corta ahí): al
// invitado le llegaban como null, ctxDraw tiraba "Cannot read properties of null (reading 'done')" en
// cada cuadro y se cortaba el resto del dibujo (proyectiles, partículas, números) toda la pelea.
//   (python3 -m http.server 8771 &) ; (cd server && PORT=8799 node relay.js &) ; node tools/bugfix/t_fort_valves_guest.js
//   variables: SITE (default http://127.0.0.1:8771), RELAY (default ws://127.0.0.1:8799)
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const SITE = process.env.SITE || process.env.SE_BASE_URL || 'http://127.0.0.1:8771', RELAY = process.env.RELAY || 'ws://127.0.0.1:8799';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 400) : '')); if (!ok) fails++; };
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] });
  const mk = async (url, name, champ) => {
    const ctx = await b.newContext({ viewport: { width: 844, height: 390 } });
    await ctx.addInitScript(([n]) => { try { if (!localStorage.getItem('__s')) { localStorage.clear(); localStorage.setItem('__s', '1'); localStorage.setItem('horda_name', n); } } catch (e) {} }, [name]);
    await ctx.addInitScript(() => { window.__autoConfirm = true; });
    const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    p.on('console', m => { if (m.type() === 'error' && /loop del juego/.test(m.text())) errs.push(m.text().slice(0, 200)); });
    await p.goto(url, { timeout: 120000 });
    for (let k = 0; k < 1200; k++) { if (await p.evaluate(() => { const x = document.getElementById('title-continue-btn'); return x && !x.disabled; })) break; await sleep(100); }
    await p.evaluate(([c]) => { for (const k in save.champions) { save.champions[k].level = 30; save.champions[k].unlocked = true; } save.starterChosen = true; save.arenasCleared = {}; for (const a of CAMPAIGN_ORDER) save.arenasCleared[a] = true; selectedClass = c; persistNow(); }, [champ]);
    return { p, errs };
  };
  const H = await mk(`${SITE}/index.html?dev=1&server=${encodeURIComponent(RELAY)}`, 'Mariano', 'tanque');
  await H.p.evaluate(() => { document.getElementById('title-continue-btn').click(); setState('prep'); currentArena = 'fortaleza'; lobbyAllies = pickLobbyAllies(selectedClass); renderPrepSummary(); document.getElementById('net-create-btn').click(); });
  for (let k = 0; k < 500 && !(await H.p.evaluate(() => net.code)); k++) await sleep(100);
  const url = await H.p.evaluate(() => netInviteUrl());
  const G = await mk(url, 'Facundo', 'cazadora');
  await G.p.evaluate(() => document.getElementById('title-join-btn').click());
  for (let k = 0; k < 600 && !(await G.p.evaluate(() => state === 'prep' && !!net.room)); k++) await sleep(100);
  await G.p.evaluate(() => document.getElementById('net-ready-btn').click());
  await sleep(500);
  await H.p.evaluate(() => document.getElementById('prep-start-btn').click());
  for (let k = 0; k < 600 && !(await G.p.evaluate(() => state === 'playing')); k++) await sleep(100);
  await sleep(1000);
  // el anfitrión salta al nivel 10 (el Caballero espera), acelera y nadie muere
  await H.p.evaluate(() => { for (const e of enemies) e.alive = false; runLevel = 10; beginLevel(); const g = gameTimeScale; window.gameTimeScale = dt => g(dt) * 4;
    setInterval(() => { for (const h of heroes) if (h.alive) h.hp = h.maxHp; }, 200); });
  let hv = [];
  for (let k = 0; k < 120; k++) { hv = await H.p.evaluate(() => (typeof fortDuoCtxTargets === 'function' ? fortDuoCtxTargets() : []).map(v => v.id)); if (hv.length) break; await sleep(1000); }
  check('FV.anfitrion_tiene_valvulas', hv.length > 0, hv);
  await sleep(1200);
  const gv = await G.p.evaluate(() => { const ts = ctxTargets() || []; return { ids: ts.map(t => t && t.id), raw: (fortS && fortS.duo && fortS.duo.valves || []).map(v => v === null ? null : v.id), kind: ts[0] && ts[0].kind }; });
  check('FV.invitado_recibe_las_valvulas', gv.ids.length === hv.length && gv.ids.every(Boolean) && gv.kind === 'fort_valve', { hv, gv });
  check('FV.invitado_sin_nulls_en_el_estado', gv.raw.every(x => x !== null), gv.raw);
  check('FV.invitado_render_sin_errores', G.errs.length === 0, G.errs.slice(0, 3));
  check('FV.anfitrion_sin_errores', H.errs.length === 0, H.errs.slice(0, 3));
  await b.close();
  console.log('SUMMARY ' + (fails ? 'FAIL' : 'OK') + ' fails=' + fails);
  process.exit(fails ? 1 : 0);
})();
