// Cooperativo: los enemigos que mueren en el INVITADO caen y quedan tirados con su pose de muerte,
// igual que en el anfitrión. Antes el invitado recibía el aviso de muerte con la copia del último
// snapshot (alive:true) y dibujaba la caída y el cadáver DE PIE: parecían enemigos vivos quietos.
//   (python3 -m http.server 8771 &) ; (cd server && PORT=8799 node relay.js &) ; node tools/bugfix/t_guest_corpses.js [carpeta_capturas]
//   variables: SITE (default http://127.0.0.1:8771), RELAY (default ws://127.0.0.1:8799)
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const SITE = process.env.SITE || process.env.SE_BASE_URL || 'http://127.0.0.1:8771', RELAY = process.env.RELAY || 'ws://127.0.0.1:8799';
const OUT = process.argv[2];
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
  // el anfitrión rodea al invitado con 8 duendes quietos (los demás enemigos afuera) y los mata juntos
  await H.p.evaluate(() => { spawnTimer = 1e12; for (const e of enemies) e.alive = false; const g = heroes[1];
    for (const h of heroes) if (h !== g) { h.x = g.x + 320; h.y = g.y + 220; h.stunTimer = 1e6; } // (quietos: los bots no los matan antes de tiempo)
    window.__sp = []; for (let i = 0; i < 8; i++) { const e = spawnEnemy('duende_bosque', false, false); const a = i / 8 * Math.PI * 2; e.x = g.x + Math.cos(a) * 110; e.y = g.y + Math.sin(a) * 70; e.stunTimer = 1e6; __sp.push(e); } });
  let seen = 0, hostN = 0;
  for (let k = 0; k < 100; k++) { seen = await G.p.evaluate(() => enemies.filter(e => e.type === 'duende_bosque' && e.alive !== false).length); if (seen >= 6) break; await sleep(200); }
  hostN = await H.p.evaluate(() => enemies.filter(e => e.type === 'duende_bosque' && e.alive).length);
  check('GC.invitado_ve_a_los_duendes_vivos', seen >= 6, { seen, hostN });
  await H.p.evaluate(() => { for (const e of __sp) { e.hp = 1; damageEnemy(e, 1e7, { src: player }); } });
  // (el cadáver queda al terminar la animación de muerte, que corre con el reloj del juego: con la
  // máquina cargada hay menos cuadros por segundo, así que se espera hasta que aparezcan)
  for (let k = 0; k < 150; k++) { const n = await Promise.all([H, G].map(c => c.p.evaluate(() => corpseList.filter(c => c.e && c.e.type === 'duende_bosque').length))); if (n[0] >= 6 && n[1] >= 6) break; await sleep(200); }
  const r = await Promise.all([H, G].map(c => c.p.evaluate(() => {
    const cs = corpseList.filter(c => c.e && c.e.type === 'duende_bosque');
    // qué cuadro de la hoja se elige para el cadáver: el de muerte (tirado), no uno de caminata
    const d = PACK_ANIM.duende_bosque, P = ENEMY_ATLAS_PACK.duende_bosque;
    return { n: cs.length, alive: cs.filter(c => c.e.alive).length, inEnemies: enemies.filter(e => e.type === 'duende_bosque' && e.alive !== false).length, hasSheet: !!(d || P) };
  })));
  check('GC.anfitrion_cadaveres_muertos', r[0].n >= 6 && r[0].alive === 0, r[0]);
  check('GC.invitado_cadaveres_muertos', r[1].n >= 6 && r[1].alive === 0, r[1]);
  check('GC.invitado_sin_enemigos_fantasma', r[1].inEnemies === 0, r[1]);
  if (OUT) await Promise.all([H.p.screenshot({ path: OUT + '/gc_host.png' }), G.p.screenshot({ path: OUT + '/gc_guest.png' })]);
  check('GC.sin_errores', H.errs.length + G.errs.length === 0, H.errs.concat(G.errs).slice(0, 4));
  await b.close();
  console.log('SUMMARY ' + (fails ? 'FAIL' : 'OK') + ' fails=' + fails);
  process.exit(fails ? 1 : 0);
})();
