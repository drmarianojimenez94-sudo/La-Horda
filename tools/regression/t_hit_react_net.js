// Reacción al golpe en cooperativo: el retroceso lo simula el ANFITRIÓN (posición autoritativa) y el
// invitado lo ve llegar por las instantáneas; el cadáver despedido por el remate fuerte vuela en las
// dos pantallas (la dirección viaja con el evento de muerte) y queda en el mismo lugar.
//   (python3 -m http.server 8824 &) ; (PORT=8834 NODE_PATH=server/node_modules node server/relay.js &)
//   SITE=http://127.0.0.1:8824 RELAY=ws://127.0.0.1:8834 node tools/regression/t_hit_react_net.js
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const SITE = process.env.SITE || process.env.SE_BASE_URL || 'http://127.0.0.1:8824', RELAY = process.env.RELAY || 'ws://127.0.0.1:8834';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 400) : '')); if (!ok) fails++; };
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] });
  const mk = async (url, name, champ) => {
    const ctx = await b.newContext({ viewport: { width: 844, height: 390 } });
    await ctx.addInitScript(([n]) => { try { if (!localStorage.getItem('__s')) { localStorage.clear(); localStorage.setItem('__s', '1'); localStorage.setItem('horda_name', n); } } catch (e) {} }, [name]);
    await ctx.addInitScript(() => { window.__autoConfirm = true; });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(url, { timeout: 120000 });
    for (let k = 0; k < 1200; k++) { if (await p.evaluate(() => { const x = document.getElementById('title-continue-btn'); return x && !x.disabled; })) break; await sleep(100); }
    await p.evaluate(([c]) => { for (const k in save.champions) { save.champions[k].level = 30; save.champions[k].unlocked = true; } save.starterChosen = true; save.arenasCleared = {}; for (const a of CAMPAIGN_ORDER) save.arenasCleared[a] = true; selectedClass = c; persistNow(); }, [champ]);
    return { p, errs };
  };
  const H = await mk(`${SITE}/index.html?dev=1&server=${encodeURIComponent(RELAY)}`, 'Mariano', 'tanque');
  await H.p.evaluate(() => { document.getElementById('title-continue-btn').click(); setState('prep'); currentArena = 'bosque'; lobbyAllies = pickLobbyAllies(selectedClass); renderPrepSummary(); document.getElementById('net-create-btn').click(); });
  for (let k = 0; k < 500 && !(await H.p.evaluate(() => net.code)); k++) await sleep(100);
  const url = await H.p.evaluate(() => netInviteUrl());
  const G = await mk(url, 'Facundo', 'mago');
  await G.p.evaluate(() => document.getElementById('title-join-btn').click());
  for (let k = 0; k < 600 && !(await G.p.evaluate(() => state === 'prep' && !!net.room)); k++) await sleep(100);
  await G.p.evaluate(() => document.getElementById('net-ready-btn').click());
  await sleep(500);
  await H.p.evaluate(() => document.getElementById('prep-start-btn').click());
  for (let k = 0; k < 600 && !(await G.p.evaluate(() => state === 'playing')); k++) await sleep(100);
  await sleep(1500);
  // un duende quieto frente al invitado (los demás enemigos afuera; aliados lejos y quietos)
  await H.p.evaluate(() => { spawnTimer = 1e12; for (const e of enemies) e.alive = false; const g = heroes[1];
    for (const h of heroes) if (h !== g) { h.x = g.x + 320; h.y = g.y + 220; h.stunTimer = 1e6; }
    const e = spawnEnemy('duende_bosque', false, false); e.x = g.x; e.y = g.y - 120; e.hp = e.maxHp = 1e6; e.stunTimer = 1e6; window.__kb = e; window.__kbId = e.id; });
  let seen = false;
  for (let k = 0; k < 100 && !seen; k++) { seen = await G.p.evaluate(() => enemies.some(e => e.type === 'duende_bosque' && e.alive !== false)); if (!seen) await sleep(200); }
  await sleep(800);
  const g0 = await G.p.evaluate(() => { const e = enemies.find(e => e.type === 'duende_bosque' && e.alive !== false); return e ? { x: e.x, y: e.y } : null; });
  // el anfitrión le pega un crítico desde abajo (lo empuja hacia arriba); la simulación es suya
  const h = await H.p.evaluate(() => { const e = __kb, y0 = e.y, g = heroes[1]; const src = { x: e.x, y: e.y + 60, classKey: 'tanque', stats: {}, baseDmg: 10, ultCharge: 0, ultMax: 100, cds: [] };
    damageEnemy(e, 50, { src, forceCrit: true, heavy: true }); return { y0, rx: e._kbRx || 0, ry: e._kbRy || 0 }; });
  await sleep(1200);
  const hy = await H.p.evaluate(() => __kb.y);
  const g1 = await G.p.evaluate(() => { const e = enemies.find(e => e.type === 'duende_bosque' && e.alive !== false); return e ? { x: e.x, y: e.y, kb: e._kbRx || e._kbRy || 0 } : null; });
  check('NET.retroceso_lo_simula_el_anfitrion', h.ry < -5 && hy < h.y0 - 5, { h, hy });
  check('NET.invitado_ve_el_retroceso_por_instantaneas', g0 && g1 && g1.y < g0.y - 5 && Math.abs(g1.y - hy) < 8 && !g1.kb, { g0, g1, hy });
  // remate fuerte: el cuerpo vuela en las dos pantallas y queda en el mismo lugar
  await H.p.evaluate(() => { const e = __kb; e.hp = 1; const src = { x: e.x, y: e.y + 60, classKey: 'tanque', stats: {}, baseDmg: 10, ultCharge: 0, ultMax: 100, cds: [] }; window.__dieY = e.y; e._dieX = e.x; damageEnemy(e, 1e7, { src, forceCrit: true, heavy: true }); });
  for (let k = 0; k < 150; k++) { const n = await Promise.all([H, G].map(c => c.p.evaluate(() => corpseList.filter(c => c.e && c.e.type === 'duende_bosque').length))); if (n[0] >= 1 && n[1] >= 1) break; await sleep(200); }
  const die = await H.p.evaluate(() => ({ x: __kb._dieX, y: __dieY }));
  const r = await Promise.all([H, G].map(c => c.p.evaluate(([dx, dy]) => { let best = null, bd = 1e9; for (const c of corpseList) { if (!c.e || c.e.type !== 'duende_bosque') continue; const d = Math.hypot(c.x - dx, c.y - dy); if (d < bd) { bd = d; best = c; } } return best ? { x: Math.round(best.x), y: Math.round(best.y), fly: DEATH_FLY_STATS.launched } : null; }, [die.x, die.y])));
  const dieY = die.y;
  check('NET.cadaver_despedido_en_las_dos_pantallas', r[0] && r[1] && r[0].fly >= 1 && r[1].fly >= 1 && r[0].y < dieY - 15, { r, dieY });
  check('NET.cadaver_queda_en_el_mismo_lugar', r[0] && r[1] && Math.hypot(r[0].x - r[1].x, r[0].y - r[1].y) < 14, r);
  check('NET.sin_errores', H.errs.length + G.errs.length === 0, H.errs.concat(G.errs).slice(0, 4));
  await b.close();
  console.log('SUMMARY ' + (fails ? 'FAIL' : 'OK') + ' fails=' + fails);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
