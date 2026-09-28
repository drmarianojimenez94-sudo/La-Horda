// Pantalla de refuerzo: la nota al pie dice la verdad. Antes decía siempre "En una partida de hasta 4
// jugadores, esta elección se decide por voto del equipo", falso solo (los bots no eligen) y falso en
// cooperativo (cada humano elige el suyo y la partida sigue cuando eligieron todos).
//   (python3 -m http.server 8771 &) ; (cd server && PORT=8799 node relay.js &) ; node tools/bugfix/t_buff_note.js
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
  const note = p => p.evaluate(() => { const n = document.getElementById('vote-note'); return { txt: n.textContent, vis: !!(n.offsetWidth || n.offsetHeight), st: state }; });
  // solo
  const S = await mk(`${SITE}/index.html`, 'Solo', 'tanque');
  await S.p.evaluate(() => { document.getElementById('title-continue-btn').click(); selectedClass = 'tanque'; currentArena = 'bosque'; startRun(1); });
  await sleep(500);
  await S.p.evaluate(() => openBuffChoice());
  const s = await note(S.p);
  check('BN.solo_no_habla_de_voto', s.st === 'buff' && !/voto/i.test(s.txt) && s.txt.length > 0, s);
  await S.p.context().close();
  // cooperativo
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
  await sleep(1000);
  await H.p.evaluate(() => openBuffChoice());
  for (let k = 0; k < 40 && !(await G.p.evaluate(() => state === 'buff')); k++) await sleep(100);
  const h = await note(H.p), g = await note(G.p);
  check('BN.anfitrion_cada_uno_elige', h.st === 'buff' && /cada jugador/i.test(h.txt) && !/voto/i.test(h.txt), h);
  check('BN.invitado_cada_uno_elige', g.st === 'buff' && /cada jugador/i.test(g.txt) && !/voto/i.test(g.txt), g);
  check('BN.sin_errores', S.errs.length + H.errs.length + G.errs.length === 0, S.errs.concat(H.errs, G.errs).slice(0, 4));
  await b.close();
  console.log('SUMMARY ' + (fails ? 'FAIL' : 'OK') + ' fails=' + fails);
  process.exit(fails ? 1 : 0);
})();
