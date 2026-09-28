// Cooperativo: botín del piso INSTANCIADO (cada jugador ve y levanta el suyo, como en Diablo III) y
// élites con nombre que se ven igual en el invitado.
//   python3 -m http.server 8821 &
//   PORT=8831 NODE_PATH=server/node_modules node server/relay.js &
//   SITE=http://127.0.0.1:8821 RELAY=ws://127.0.0.1:8831 node tools/net-test/ground_loot_coop.js
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const SITE = process.env.SITE || process.env.SE_BASE_URL || 'http://127.0.0.1:8821', RELAY = process.env.RELAY || 'ws://127.0.0.1:8831';
const SHOT_DIR = process.env.SHOT_DIR || '';
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
    await p.evaluate(([c]) => { for (const k in save.champions) { save.champions[k].level = 5; save.champions[k].xp = 0; save.champions[k].unlocked = true; } save.starterChosen = true; save.arenasCleared = {}; for (const a of CAMPAIGN_ORDER) save.arenasCleared[a] = true; save.stash = []; selectedClass = c; persistNow(); }, [champ]);
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
  check('GL.partida_de_a_dos', await G.p.evaluate(() => state === 'playing' && netIsGuest()));

  // Una élite con nombre (Encantado de Fuego + Aura de Escarcha) entre los dos; el anfitrión la mata.
  await H.p.evaluate(() => { eliteNamedChance = () => 0; /* la élite de la prueba se fuerza */ spawnTimer = 1e12; for (const e of enemies) e.alive = false; enemies = enemies.filter(e => e.alive);
    for (const h of heroes) { h.stunTimer = 1e6; h.hp = h.maxHp; }
    const g = heroes[1]; window.__el = spawnEnemy('ent', false); eliteMaybeName(__el, ['fuego', 'escarcha']);
    __el.x = Math.max(player.x, g.x) + 260; __el.y = (player.y + g.y) / 2; /* lejos de los dos: nadie lo levanta sin querer */ __el.stunTimer = 1e6; __el.hp = __el.maxHp = 1e6; });
  await sleep(1500);
  const seen = await G.p.evaluate(() => { const e = enemies.find(o => o.eliteName); return e ? { name: e.eliteName, mods: e.eliteMods } : null; });
  const hostName = await H.p.evaluate(() => __el.eliteName);
  check('GL.invitado_ve_la_elite_con_nombre', !!seen && seen.name === hostName && seen.mods.join() === 'fuego,escarcha', { seen, hostName });
  if (SHOT_DIR) { await G.p.evaluate(() => { document.querySelectorAll('#center-banner,#tut-panel,#qs-toasts').forEach(x => x.style.display = 'none'); }); await G.p.screenshot({ path: SHOT_DIR + '/u1_coop_invitado_elite_844x390.png' }); }

  const n0 = await G.p.evaluate(() => groundLoot.length);
  await H.p.evaluate(() => { GROUND_LOOT_CFG.chance.named = 1; __el.hp = 1; __el.lastHitBy = player; killEnemy(__el); });
  await sleep(1800);
  const hostFloor = await H.p.evaluate(() => groundLoot.map(g => ({ uid: g.item.uid, name: g.item.name, tier: g.tier, x: g.x, y: g.y })));
  const guestFloor = await G.p.evaluate(() => groundLoot.map(g => ({ uid: g.item.uid, name: g.item.name, tier: g.tier, x: g.x, y: g.y })));
  check('GL.al_anfitrion_le_cae_lo_suyo', hostFloor.length >= 1, hostFloor);
  check('GL.al_invitado_le_llega_lo_suyo', guestFloor.length >= 1 && n0 === 0, guestFloor);
  check('GL.botin_instanciado_distinto', guestFloor.every(g => !hostFloor.some(h => h.uid === g.uid)), { hostFloor, guestFloor });
  if (SHOT_DIR) { await G.p.evaluate(() => { document.querySelectorAll('#center-banner,#tut-panel,#qs-toasts').forEach(x => x.style.display = 'none'); }); await sleep(300); await G.p.screenshot({ path: SHOT_DIR + '/u1_coop_invitado_botin_844x390.png' }); }

  // El invitado camina hasta SU objeto y lo levanta: va a SU inventario (no al del anfitrión).
  const hostStash0 = await H.p.evaluate(() => stashItems().length);
  const got = await G.p.evaluate(async () => {
    const g = groundLoot[0]; const uid = g.item.uid; player.x = g.x; player.y = g.y;
    await new Promise(r => setTimeout(r, 2000)); // (en partida el guardado se escribe cada 1,5 s)
    const toast = document.querySelector('#loot-toasts .lt-name');
    return { uid, inStash: stashItems().some(i => i.uid === uid), floor: groundLoot.length, toast: toast && toast.textContent, saved: JSON.parse(localStorage.getItem(SAVE_KEY)).stash.some(i => i.uid === uid) };
  });
  check('GL.invitado_levanta_su_objeto', got.inStash && got.saved && !!got.toast, got);
  const hostAfter = await H.p.evaluate(([uid]) => ({ n: stashItems().length, has: stashItems().some(i => i.uid === uid) }), [got.uid]);
  check('GL.el_anfitrion_no_recibe_el_del_invitado', !hostAfter.has && hostAfter.n === hostStash0, hostAfter);
  // El anfitrión levanta el suyo en su pantalla
  const hGot = await H.p.evaluate(async () => { for (const h of heroes) h.stunTimer = 0; const g = groundLoot[0]; const uid = g.item.uid; player.x = g.x; player.y = g.y; await new Promise(r => setTimeout(r, 700)); return { uid, inStash: stashItems().some(i => i.uid === uid) }; });
  check('GL.anfitrion_levanta_el_suyo', hGot.inStash, hGot);
  const gHas = await G.p.evaluate(([uid]) => stashItems().some(i => i.uid === uid), [hGot.uid]);
  check('GL.el_invitado_no_recibe_el_del_anfitrion', !gHas);

  // Un cuadro cargado (muchos eventos): el botín del invitado no se descarta.
  const burst = await H.p.evaluate(() => { const g = heroes[1]; for (let i = 0; i < 400; i++) floatText(g.x, g.y, 'x' + i, null);
    for (let i = 0; i < 3; i++) netEmitTo(g._netSlot, 'groundLootDrop', [Math.round(g.x + 300 + i * 40), Math.round(g.y), 'A', 1, currentArena, 'named']); return true; });
  await sleep(1500);
  const after = await G.p.evaluate(() => groundLoot.length);
  check('GL.evento_de_botin_no_se_descarta', burst && after >= 3, after);
  check('GL.sin_errores', H.errs.length + G.errs.length === 0, H.errs.concat(G.errs).slice(0, 4));
  await b.close();
  console.log('SUMMARY ' + (fails ? 'FAIL' : 'OK') + ' fails=' + fails);
  process.exit(fails ? 1 : 0);
})();
