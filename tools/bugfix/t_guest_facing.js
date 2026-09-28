// Cooperativo: el guardián del INVITADO quieto mira a lo que ataca (como en solitario) y no parpadea.
// Antes el anfitrión pisaba su mirada cada cuadro con la del joystick y el básico la volvía a girar
// hacia el objetivo: en la pantalla del anfitrión el guardián del invitado se daba vuelta con cada
// golpe, y en la del invitado quedaba mirando para el otro lado mientras le pegaba a lo de atrás.
//   (python3 -m http.server 8771 &) ; (cd server && PORT=8799 node relay.js &) ; node tools/bugfix/t_guest_facing.js
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
  await sleep(1200);
  // el invitado camina un poco a la DERECHA y se queda quieto
  await G.p.evaluate(async () => { joyVec = { x: 1, y: 0 }; await new Promise(r => setTimeout(r, 400)); joyVec = { x: 0, y: 0 }; });
  await sleep(500);
  // sin horda, los demás lejos; un duende quieto e inmortal a su IZQUIERDA
  await H.p.evaluate(() => { spawnTimer = 1e12; for (const e of enemies) e.alive = false; const g = heroes[1];
    for (const h of heroes) if (h !== g) { h.x = g.x + 900; h.y = g.y + 500; h.stunTimer = 1e6; }
    const e = spawnEnemy('duende_bosque', false, false); e.x = g.x - 130; e.y = g.y; e.stunTimer = 1e6; e.hp = e.maxHp = 1e9; window.__dummy = e; });
  await sleep(600);
  const before = await G.p.evaluate(() => Math.sign(player.fx));
  check('GF.el_invitado_empieza_mirando_a_la_derecha', before === 1, before);
  // el invitado mantiene el ataque básico sin moverse
  await G.p.evaluate(() => { basicHeld = true; });
  const hs = await H.p.evaluate(async () => {
    const g = heroes[1], xs = []; const t0 = performance.now();
    await new Promise(r => { const f = () => { xs.push(Math.sign(Math.round(g.fx * 10))); if (performance.now() - t0 < 2500) requestAnimationFrame(f); else r(); }; requestAnimationFrame(f); });
    let flips = 0; for (let i = 1; i < xs.length; i++) if (xs[i] && xs[i - 1] && xs[i] !== xs[i - 1]) flips++;
    return { flips, last: xs[xs.length - 1], n: xs.length, hit: Math.round(__dummy.maxHp - __dummy.hp) };
  });
  check('GF.el_invitado_pega', hs.hit > 0, hs);
  check('GF.anfitrion_ve_al_invitado_sin_parpadear', hs.flips <= 1, hs);
  check('GF.anfitrion_lo_ve_mirando_al_objetivo', hs.last === -1, hs);
  const gs = await G.p.evaluate(() => Math.sign(Math.round(player.fx * 10)));
  check('GF.invitado_se_ve_mirando_al_objetivo', gs === -1, gs);
  // al volver a caminar, la mirada es la del joystick al instante
  await G.p.evaluate(async () => { basicHeld = false; joyVec = { x: 1, y: 0.1 }; await new Promise(r => setTimeout(r, 300)); });
  const mv = await G.p.evaluate(() => Math.sign(player.fx));
  await G.p.evaluate(() => { joyVec = { x: 0, y: 0 }; });
  check('GF.caminando_manda_el_joystick', mv === 1, mv);
  check('GF.sin_errores', H.errs.length + G.errs.length === 0, H.errs.concat(G.errs).slice(0, 4));
  await b.close();
  console.log('SUMMARY ' + (fails ? 'FAIL' : 'OK') + ' fails=' + fails);
  process.exit(fails ? 1 : 0);
})();
