// Cooperativo en celular apaisado: con el cartel "CAÍSTE" en pantalla, el cartel central ("NIVEL 7",
// "RUNA ACTIVA (3/4): LA HORDA SE FORTALECE") no queda detrás de él. Antes se pisaban y no se leía ninguno.
//   (python3 -m http.server 8771 &) ; (cd server && PORT=8799 node relay.js &) ; node tools/bugfix/t_downed_banner.js
//   variables: SITE (default http://127.0.0.1:8771), RELAY (default ws://127.0.0.1:8799)
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const SITE = process.env.SITE || process.env.SE_BASE_URL || 'http://127.0.0.1:8771', RELAY = process.env.RELAY || 'ws://127.0.0.1:8799';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 400) : '')); if (!ok) fails++; };
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] });
  const mk = async (url, name, champ) => {
    const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
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
  // cae el invitado (los demás siguen en pie) y aparece un cartel central
  await H.p.evaluate(() => { spawnTimer = 1e12; window.__gDmg = []; const g = heroes[1]; for (let i = 0; i < 12 && !g.downed && g.hp > 0; i++) { g.invulnTimer = 0; damageHero(g, g.maxHp * 10); window.__gDmg.push(Math.round(g.hp)); } }); // una Profeta aliada (set) o Último Aliento pueden salvarlo una vez y dejarlo invulnerable un instante: se insiste hasta que caiga
  for (let k = 0; k < 100 && !(await G.p.evaluate(() => !document.getElementById('downed-overlay').classList.contains('hidden'))); k++) await sleep(100);
  await H.p.evaluate(() => showBanner('RUNA ACTIVA (3/4): LA HORDA SE FORTALECE', 2));
  await sleep(700);
  const r = await G.p.evaluate(() => {
    const a = document.getElementById('downed-overlay').getBoundingClientRect(), c = document.getElementById('center-banner').getBoundingClientRect();
    const inter = Math.max(0, Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top)) * Math.max(0, Math.min(a.right, c.right) - Math.max(a.left, c.left));
    return { downed: !document.getElementById('downed-overlay').classList.contains('hidden'), banner: document.getElementById('center-banner').textContent, over: Math.round(inter), a: [Math.round(a.top), Math.round(a.bottom)], c: [Math.round(c.top), Math.round(c.bottom)], inView: c.bottom <= innerHeight };
  });
  check('DB.invitado_caido_con_cartel', r.downed && /RUNA/.test(r.banner), r);
  check('DB.los_carteles_no_se_pisan', r.over === 0 && r.inView, r);
  // al revivir, el cartel central vuelve a su lugar
  await H.p.evaluate(() => { const g = heroes[1]; g.alive = true; g.hp = g.maxHp; });
  await sleep(1000);
  const back = await G.p.evaluate(() => document.getElementById('center-banner').classList.contains('downed'));
  check('DB.revivido_el_cartel_vuelve', back === false, back);
  check('DB.sin_errores', H.errs.length + G.errs.length === 0, H.errs.concat(G.errs).slice(0, 4));
  await b.close();
  console.log('SUMMARY ' + (fails ? 'FAIL' : 'OK') + ' fails=' + fails);
  process.exit(fails ? 1 : 0);
})();
