// Cooperativo: cristales de los Guardianes en el INVITADO.
//  1) La ceremonia del cristal (crystalAward, llega como evento) termina: el cristal vuela y se apaga
//     como en el anfitrión. Antes el invitado no corría crystalTick: quedaba congelado en el piso.
//  2) Resonancia: el invitado ve la gema de TODOS los portadores (h._res viaja en el snapshot), no
//     solo la suya, y deja de verla cuando el Hechicero se los arranca (resonanceSteal).
//   (python3 -m http.server 8771 &) ; (cd server && PORT=8799 node relay.js &) ; node tools/bugfix/t_guest_crystal.js
//   variables: SITE (default http://127.0.0.1:8771), RELAY (default ws://127.0.0.1:8799)
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const SITE = process.env.SITE || process.env.SE_BASE_URL || 'http://127.0.0.1:8771', RELAY = process.env.RELAY || 'ws://127.0.0.1:8799';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 400) : '')); if (!ok) fails++; };
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] });
  const mk = async (url, name, champ, crystals, worn) => {
    const ctx = await b.newContext({ viewport: { width: 844, height: 390 } });
    await ctx.addInitScript(([n]) => { try { if (!localStorage.getItem('__s')) { localStorage.clear(); localStorage.setItem('__s', '1'); localStorage.setItem('horda_name', n); } } catch (e) {} }, [name]);
    await ctx.addInitScript(() => { window.__autoConfirm = true; });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(url, { timeout: 120000 });
    for (let k = 0; k < 1200; k++) { if (await p.evaluate(() => { const x = document.getElementById('title-continue-btn'); return x && !x.disabled; })) break; await sleep(100); }
    await p.evaluate(([c, cr, w]) => { for (const k in save.champions) { save.champions[k].level = 30; save.champions[k].unlocked = true; } save.starterChosen = true; save.arenasCleared = {}; for (const a of CAMPAIGN_ORDER) if (a !== 'infernal') save.arenasCleared[a] = true; save.crystals = cr; save.crystalWorn = w; selectedClass = c; persistNow(); }, [champ, crystals, worn]);
    return { p, errs };
  };
  const H = await mk(`${SITE}/index.html?dev=1&server=${encodeURIComponent(RELAY)}`, 'Mariano', 'tanque', { piedra: true }, 'piedra');
  await H.p.evaluate(() => { document.getElementById('title-continue-btn').click(); setState('prep'); currentArena = 'bosque'; lobbyAllies = pickLobbyAllies(selectedClass); renderPrepSummary(); document.getElementById('net-create-btn').click(); });
  for (let k = 0; k < 500 && !(await H.p.evaluate(() => net.code)); k++) await sleep(100);
  const url = await H.p.evaluate(() => netInviteUrl());
  const G = await mk(url, 'Facundo', 'mago', { escarcha: true }, 'escarcha');
  await G.p.evaluate(() => document.getElementById('title-join-btn').click());
  for (let k = 0; k < 600 && !(await G.p.evaluate(() => state === 'prep' && !!net.room)); k++) await sleep(100);
  await G.p.evaluate(() => document.getElementById('net-ready-btn').click());
  await sleep(700);
  await H.p.evaluate(() => document.getElementById('prep-start-btn').click());
  for (let k = 0; k < 600 && !(await G.p.evaluate(() => state === 'playing')); k++) await sleep(100);
  await sleep(2500);
  // cuántas gemas de resonancia dibuja cada uno (y de qué color)
  const gems = p => p.evaluate(async () => {
    const seen = {}; const orig = window.crystalDrawGem;
    window.crystalDrawGem = function (c, x, y, s, D) { if (s === 6) seen[D.name || D.mid] = 1; return orig.apply(this, arguments); };
    await new Promise(r => setTimeout(r, 1500)); window.crystalDrawGem = orig;
    return { gems: Object.keys(seen).sort(), res: heroes.map(h => h._res ? h._res.k : null) };
  });
  const hg = await gems(H.p), gg = await gems(G.p);
  check('CR.anfitrion_ve_2_gemas', hg.gems.length === 2, hg);
  check('CR.invitado_ve_las_mismas_gemas', JSON.stringify(gg.gems) === JSON.stringify(hg.gems), { hg, gg });
  // el anfitrión gana un cristal: el invitado ve la ceremonia y termina
  await H.p.evaluate(() => { spawnTimer = 1e12; crystalAward('ancestral', player.x + 80, player.y); });
  let on1 = null;
  for (let k = 0; k < 100; k++) { on1 = await G.p.evaluate(() => ({ on: CRYSTAL_FX.on, key: CRYSTAL_FX.key, t: Math.round(CRYSTAL_FX.t) })); if (on1.on && on1.t > 0) break; await sleep(100); }
  check('CR.invitado_recibe_la_ceremonia', on1.on && on1.key === 'ancestral' && on1.t > 0, on1);
  // (el reloj es el del juego: con la máquina cargada los cuadros tardan más, se espera hasta 60 s)
  let on2 = null;
  for (let k = 0; k < 600; k++) { on2 = await G.p.evaluate(() => ({ on: CRYSTAL_FX.on, got: CRYSTAL_FX.got, has: !!(save.crystals && save.crystals.ancestral) })); if (!on2.on) break; await sleep(100); }
  check('CR.invitado_la_ceremonia_termina', !on2.on && on2.got, on2);
  check('CR.invitado_se_queda_el_cristal', on2.has, on2);
  // el Hechicero se los arranca: nadie ve más la gema
  await H.p.evaluate(() => resonanceSteal());
  await sleep(2500);
  const gg2 = await gems(G.p);
  check('CR.invitado_sin_gemas_tras_el_robo', gg2.gems.length === 0, gg2);
  check('CR.sin_errores', H.errs.length + G.errs.length === 0, H.errs.concat(G.errs).slice(0, 4));
  await b.close();
  console.log('SUMMARY ' + (fails ? 'FAIL' : 'OK') + ' fails=' + fails);
  process.exit(fails ? 1 : 0);
})();
