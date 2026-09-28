// Cooperativo: en un cuadro cargado (barrido de fin de nivel con 150 enemigos) el INVITADO recibe TODA
// su XP y ve morir a todos. Antes el anfitrión cortaba en 260 eventos por snapshot: una muerte + una
// XP por enemigo -> el invitado perdía XP y los últimos enemigos se esfumaban sin su muerte.
//   (python3 -m http.server 8771 &) ; (cd server && PORT=8799 node relay.js &) ; node tools/bugfix/t_net_events_keep.js
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
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(url, { timeout: 120000 });
    for (let k = 0; k < 1200; k++) { if (await p.evaluate(() => { const x = document.getElementById('title-continue-btn'); return x && !x.disabled; })) break; await sleep(100); }
    await p.evaluate(([c]) => { for (const k in save.champions) { save.champions[k].level = 5; save.champions[k].xp = 0; save.champions[k].unlocked = true; } save.starterChosen = true; save.arenasCleared = {}; for (const a of CAMPAIGN_ORDER) save.arenasCleared[a] = true; selectedClass = c; persistNow(); }, [champ]);
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
  // 150 enemigos quietos cerca del invitado
  await H.p.evaluate(() => { spawnTimer = 1e12; for (const e of enemies) e.alive = false; enemies = enemies.filter(e => e.alive); const g = heroes[1];
    for (const h of heroes) h.stunTimer = 1e6;
    for (let i = 0; i < 150; i++) { const e = spawnEnemy('duende_bosque', false, false); const a = i / 150 * Math.PI * 2, r = 120 + (i % 5) * 40; e.x = g.x + Math.cos(a) * r; e.y = g.y + Math.sin(a) * r * 0.6; e.stunTimer = 1e6; e.hp = e.maxHp = 1e9; } });
  await sleep(2000);
  const seen = await G.p.evaluate(() => enemies.filter(e => e.type === 'duende_bosque' && e.alive !== false).length);
  check('EK.invitado_ve_los_150', seen === 150, seen);
  const xp0 = await G.p.evaluate(() => { const c = save.champions.mago; return { xp: c.xp, lvl: c.level }; });
  // cierre de nivel: todos caen juntos, con la mitad de su XP para cada héroe
  const expect = await H.p.evaluate(() => { let s = 0; for (const e of enemies) if (e.alive && e.rank !== 'jefe' && e.rank !== 'subjefe') s += Math.round(e.xp * 0.5); beginLevelClear(); return s; });
  await sleep(2500);
  const r = await G.p.evaluate(([x0]) => { const c = save.champions.mago; let gained = 0; for (let l = x0.lvl; l < c.level; l++) gained += xpToNext(l); gained += c.xp - x0.xp; return { gained, lvl: c.level, left: enemies.filter(e => e.type === 'duende_bosque' && e.alive !== false).length, corpses: corpseList.length }; }, [xp0]);
  const mult = await G.p.evaluate(() => DEV_XP_MULT);
  check('EK.invitado_recibe_toda_la_xp', Math.abs(r.gained - expect * mult) <= 2, { expect, mult, r });
  check('EK.invitado_no_queda_nadie_en_pie', r.left === 0, r);
  check('EK.sin_errores', H.errs.length + G.errs.length === 0, H.errs.concat(G.errs).slice(0, 4));
  await b.close();
  console.log('SUMMARY ' + (fails ? 'FAIL' : 'OK') + ' fails=' + fails);
  process.exit(fails ? 1 : 0);
})();
