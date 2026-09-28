// Cooperativo de 3: cuando UN invitado pide el estado completo (vuelve de una caída o termina de bajar
// el arte), los DEMÁS siguen viendo bien la partida. Antes ese estado completo pisaba las referencias
// de diferencias de todos: al resto le llegaban los enemigos nuevos sin tipo ni vida (dibujados con
// nada) y las bajas no llegaban (enemigos fantasma quietos) hasta el siguiente keyframe (10 s).
//   (python3 -m http.server 8771 &) ; (cd server && PORT=8799 node relay.js &) ; node tools/bugfix/t_net_full_for_one.js
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
    await p.evaluate(([c]) => { for (const k in save.champions) { save.champions[k].level = 30; save.champions[k].unlocked = true; } save.starterChosen = true; save.arenasCleared = {}; for (const a of CAMPAIGN_ORDER) save.arenasCleared[a] = true; selectedClass = c; persistNow(); }, [champ]);
    return { p, errs };
  };
  const H = await mk(`${SITE}/index.html?dev=1&server=${encodeURIComponent(RELAY)}`, 'Mariano', 'tanque');
  await H.p.evaluate(() => { document.getElementById('title-continue-btn').click(); setState('prep'); currentArena = 'bosque'; lobbyAllies = pickLobbyAllies(selectedClass); renderPrepSummary(); document.getElementById('net-create-btn').click(); });
  for (let k = 0; k < 500 && !(await H.p.evaluate(() => net.code)); k++) await sleep(100);
  const url = await H.p.evaluate(() => netInviteUrl());
  const G1 = await mk(url, 'Facundo', 'mago'), G2 = await mk(url, 'Lucia', 'cazadora');
  for (const G of [G1, G2]) {
    await G.p.evaluate(() => document.getElementById('title-join-btn').click());
    for (let k = 0; k < 600 && !(await G.p.evaluate(() => state === 'prep' && !!net.room)); k++) await sleep(100);
    await G.p.evaluate(() => document.getElementById('net-ready-btn').click());
  }
  await sleep(800);
  await H.p.evaluate(() => document.getElementById('prep-start-btn').click());
  for (let k = 0; k < 600 && !(await G2.p.evaluate(() => state === 'playing')); k++) await sleep(100);
  await sleep(1500);
  // escena quieta: 6 duendes vivos e inmortales, ninguna oleada
  await H.p.evaluate(() => { spawnTimer = 1e12; for (const h of heroes) h.stunTimer = 1e6; for (const e of enemies) e.alive = false; enemies = [];
    window.__old = []; for (let i = 0; i < 6; i++) { const e = spawnEnemy('duende_bosque', false, false); e.x = heroes[0].x + 100 + i * 30; e.y = heroes[0].y + 60; e.stunTimer = 1e6; e.hp = e.maxHp = 1e9; __old.push(e); } });
  await sleep(1500);
  // en UN mismo cuadro del anfitrión: 3 bajas, 4 esqueletos nuevos y el invitado 2 pide el estado completo
  await H.p.evaluate(() => { for (let i = 0; i < 3; i++) { __old[i].alive = false; } enemies = enemies.filter(e => e.alive);
    for (let i = 0; i < 4; i++) { const e = spawnEnemy('duende_bosque', false, false); e.x = heroes[0].x - 120 - i * 30; e.y = heroes[0].y - 40; e.stunTimer = 1e6; e.hp = e.maxHp = 1e9; e.__nuevo = 1; }
    netHostOnMsg(2, { k: 'needFull' }); });
  await sleep(1500);
  const look = p => p.evaluate(() => { const v = enemies.filter(e => e.alive !== false); return { n: v.length, sinTipo: v.filter(e => !e.type || !e.maxHp).length }; });
  const h = await H.p.evaluate(() => enemies.filter(e => e.alive).length), g1 = await look(G1.p), g2 = await look(G2.p);
  check('FO.anfitrion_7_enemigos', h === 7, h);
  check('FO.invitado2_ve_7', g2.n === 7 && g2.sinTipo === 0, g2);
  check('FO.invitado1_sin_fantasmas', g1.n === 7, g1);
  check('FO.invitado1_enemigos_nuevos_completos', g1.sinTipo === 0, g1);
  check('FO.sin_errores', H.errs.length + G1.errs.length + G2.errs.length === 0, H.errs.concat(G1.errs, G2.errs).slice(0, 4));
  await b.close();
  console.log('SUMMARY ' + (fails ? 'FAIL' : 'OK') + ' fails=' + fails);
  process.exit(fails ? 1 : 0);
})();
