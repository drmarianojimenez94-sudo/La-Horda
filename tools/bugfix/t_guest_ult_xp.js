// Cooperativo: la ulti del INVITADO suma XP de uso en SU guardado (como las habilidades, "useXp").
// Antes el anfitrión la sumaba a la copia temporal del guardián del invitado, que se descarta al
// terminar: en cooperativo la maestría de uso de la ulti no subía nunca.
//   (python3 -m http.server 8771 &) ; (cd server && PORT=8799 node relay.js &) ; node tools/bugfix/t_guest_ult_xp.js
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
  const G = await mk(url, 'Facundo', 'mago');
  await G.p.evaluate(() => document.getElementById('title-join-btn').click());
  for (let k = 0; k < 600 && !(await G.p.evaluate(() => state === 'prep' && !!net.room)); k++) await sleep(100);
  await G.p.evaluate(() => document.getElementById('net-ready-btn').click());
  await sleep(500);
  await H.p.evaluate(() => document.getElementById('prep-start-btn').click());
  for (let k = 0; k < 600 && !(await G.p.evaluate(() => state === 'playing')); k++) await sleep(100);
  await sleep(1500);
  const xp = () => G.p.evaluate(() => { const m = save.champions.mago.ultMastery; return m.useXp + m.useLvl * 1000; });
  const x0 = await xp();
  // la ulti del invitado está lista (nivel suficiente, carga llena)
  await H.p.evaluate(() => { runLevel = Math.max(runLevel, ULT_MIN_ARENA_LEVEL); const g = heroes[1]; g.ultCharge = g.ultMax; g.ultCd = 0; });
  await sleep(600);
  await G.p.evaluate(() => useUltimate());
  await sleep(1500);
  const used = await H.p.evaluate(() => ({ charge: Math.round(heroes[1].ultCharge), cd: Math.round(heroes[1].ultCd) }));
  check('UX.el_anfitrion_ejecuto_la_ulti', used.cd > 0, used);
  const x1 = await xp();
  check('UX.el_invitado_gana_xp_de_uso_de_la_ulti', x1 > x0, { x0, x1 });
  // un segundo pedido sin carga no suma
  await G.p.evaluate(() => { player.ultCharge = player.ultMax; player.ultCd = 0; useUltimate(); });
  await sleep(1200);
  const x2 = await xp();
  check('UX.sin_carga_no_suma', x2 === x1, { x1, x2 });
  check('UX.sin_errores', H.errs.length + G.errs.length === 0, H.errs.concat(G.errs).slice(0, 4));
  await b.close();
  console.log('SUMMARY ' + (fails ? 'FAIL' : 'OK') + ' fails=' + fails);
  process.exit(fails ? 1 : 0);
})();
