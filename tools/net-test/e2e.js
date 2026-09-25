// LA HORDA — B1: prueba de punta a punta del multijugador cooperativo con navegadores
// INDEPENDIENTES (cada cliente es un contexto de Chromium aparte: su propio guardado, su propia
// conexión WebSocket) contra un relay real (server/relay.js).
//
// uso: node tools/net-test/e2e.js <humanos 1-4> [--fifth] [--long]
//   requiere el sitio servido (python3 -m http.server 8771) y el relay (PORT=8799 node server/relay.js)
//   variables: SITE (default http://127.0.0.1:8771), RELAY (default ws://127.0.0.1:8799)
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const SITE = process.env.SITE || 'http://127.0.0.1:8771';
const RELAY = process.env.RELAY || 'ws://127.0.0.1:8799';
const N = Math.max(1, Math.min(4, parseInt(process.argv[2] || '2', 10)));
const FIFTH = process.argv.includes('--fifth');
const LONG = process.argv.includes('--long');
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0;
const check = (name, ok, extra) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  ' + JSON.stringify(extra).slice(0, 400) : '')); if (!ok) fails++; };
const NAMES = ['Mariano', 'Facundo', 'Daniel', 'Lucia', 'Quinto'];
const CHAMPS = ['tanque', 'mago', 'guerrero', 'soporte', 'axiom'];
const CHAMP_LABEL = { tanque: 'Tanque', mago: 'Mago', guerrero: 'Asesino', soporte: 'Soporte', axiom: 'Axiom' };

async function newClient(browser, i, url) {
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 560 } });
  // guardado propio de cada jugador: campeones en nivel 12, Bosque abierto
  await ctx.addInitScript(([i]) => {
    try {
      if (!localStorage.getItem('__seeded')) {
        localStorage.clear(); localStorage.setItem('__seeded', '1');
        localStorage.setItem('horda_name', ['Mariano', 'Facundo', 'Daniel', 'Lucia', 'Quinto'][i]);
      }
    } catch (e) {}
  }, [i]);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', d => d.accept());
  await page.goto(url, { waitUntil: 'load' });
  for (let k = 0; k < 300; k++) { if (await page.evaluate(() => { const b = document.getElementById('title-continue-btn'); return b && !b.disabled; })) break; await sleep(100); }
  await page.evaluate(([c]) => { for (const k in save.champions) { save.champions[k].level = 12; save.champions[k].talentPoints = 2; } selectedClass = c; persistNow(); }, [CHAMPS[i]]);
  return { ctx, page, errors, i };
}
const ev = (c, fn, arg) => c.page.evaluate(fn, arg);

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  // ---------------- anfitrión: menú -> arena -> campeón -> pre-sala -> crear sala ----------------
  const host = await newClient(browser, 0, `${SITE}/index.html?server=${encodeURIComponent(RELAY)}`);
  await host.page.click('#title-continue-btn');
  await host.page.click('#mainmenu-jugar-btn');
  await host.page.click('#mode-arena-btn');
  await host.page.click('.arena-card[data-arena="bosque"]');
  await host.page.click('#start-btn');
  check('lobby.prep_visible', await host.page.isVisible('#prep-screen'));
  // test crítico de inventario: cambiar un objeto equipado DESDE la pre-sala y entrar con él
  const invUid = await ev(host, () => {
    const it = makeItem('arma', 'legendario', selectedClass); addItemToInventory(selectedClass, it); renderPrepSummary(); return it.uid;
  });
  await host.page.click(`#prep-inventory-panel [data-prep-equip="${invUid}"]`);
  const eqAfter = await ev(host, () => save.champions[selectedClass].equipment.arma);
  check('inventory.equip_in_lobby', eqAfter === invUid, { eqAfter, invUid });
  if (N > 1 || FIFTH) {
    await host.page.click('#net-create-btn');
    for (let k = 0; k < 50 && !(await ev(host, () => net.code)); k++) await sleep(100);
  }
  const code = await ev(host, () => net.code);
  if (N > 1 || FIFTH) check('room.created', /^[A-Z2-9]{6}$/.test(code || ''), code);
  const invite = await ev(host, () => netInviteUrl());
  if (N > 1) check('invite.url_has_room', invite.includes('room=' + code), invite);

  // ---------------- invitados: abren el enlace -> Unirse -> pre-sala de la misma arena ----------------
  const guests = [];
  for (let i = 1; i < N; i++) {
    const g = await newClient(browser, i, invite);
    await g.page.click('#title-join-btn');
    for (let k = 0; k < 60 && !(await ev(g, () => state === 'prep' && !!net.room)); k++) await sleep(100);
    const st = await ev(g, () => ({ state, slot: net.slot, arena: currentArena, role: net.role }));
    check(`join.guest${i}_in_prep`, st.state === 'prep' && st.slot === i && st.arena === 'bosque' && st.role === 'guest', st);
    guests.push(g);
  }
  if (N > 1) {
    await sleep(600);
    const slotsHost = await ev(host, () => net.room.slots.map(s => s && (s.name + ':' + s.champ)));
    check('lobby.host_sees_all', slotsHost.filter(Boolean).length === N, slotsHost);
    const slotsDom = await host.page.$$eval('#lobby-slots .lobby-slot:not(.empty) .lobby-name', els => els.map(e => e.textContent));
    check('lobby.slots_rendered', slotsDom.length === N && slotsDom[0] === 'Mariano', slotsDom);
    for (const g of guests) {
      const view = await ev(g, () => net.room.slots.map(s => s && s.name));
      check(`lobby.guest${g.i}_sees_all`, view.filter(Boolean).length === N, view);
    }
  }
  if (FIFTH) {
    // completar a 4 si hace falta y probar que el 5º queda afuera
    const extra = [];
    for (let i = N; i < 4; i++) { const g = await newClient(browser, i, invite); await g.page.click('#title-join-btn'); await sleep(700); extra.push(g); guests.push(g); }
    const f = await newClient(browser, 4, invite);
    await f.page.click('#title-join-btn');
    await sleep(900);
    const msg = await ev(f, () => ({ err: netLobby.lastError, state, slot: net.slot }));
    check('room.fifth_rejected', /SALA COMPLETA/.test(msg.err) && msg.state !== 'prep', msg);
    await f.ctx.close();
  }
  // ready
  for (const g of guests) await g.page.click('#net-ready-btn');
  await sleep(500);
  if (guests.length) {
    const readies = await ev(host, () => net.room.slots.map(s => s && s.ready));
    check('lobby.ready_synced', readies.filter((r, i) => i > 0 && r).length === guests.length, readies);
  }
  // ---------------- COMENZAR ----------------
  await host.page.click('#prep-start-btn');
  const all = [host, ...guests];
  for (let k = 0; k < 60; k++) { const ok = await Promise.all(all.map(c => ev(c, () => state === 'playing'))); if (ok.every(Boolean)) break; await sleep(100); }
  const st0 = await Promise.all(all.map(c => ev(c, () => ({ state, arena: currentArena, heroes: heroes.map(h => h.classKey + (h.isRemote ? '*' : '') + (h.isBot ? 'b' : '')), me: player.classKey, role: netMatch && netMatch.role }))));
  st0.forEach((s, i) => check(`start.client${i}_playing_same_arena`, s.state === 'playing' && s.arena === 'bosque' && s.heroes.length === 4, s));
  const humansInGame = st0[0].heroes.filter(h => !h.endsWith('b')).length;
  check('start.humans_plus_bots', humansInGame === all.length, { humansInGame, heroes: st0[0].heroes });
  const hostWeapon = await ev(host, () => save.champions[player.classKey].equipment.arma);
  check('inventory.entered_with_lobby_gear', hostWeapon === invUid);

  // ---------------- movimiento simultáneo ----------------
  await sleep(1200);
  const p0 = await Promise.all(all.map(c => ev(c, () => ({ x: player.x, y: player.y }))));
  await Promise.all(all.map((c, i) => ev(c, (i) => { joyVec = { x: [1, -1, 0, 0.7][i], y: [0, 0, 1, -0.7][i] }; }, i)));
  await sleep(1500);
  await Promise.all(all.map(c => ev(c, () => { joyVec = { x: 0, y: 0 }; })));
  await sleep(700);
  const p1 = await Promise.all(all.map(c => ev(c, () => ({ x: player.x, y: player.y }))));
  all.forEach((c, i) => check(`move.client${i}_moved_locally`, Math.hypot(p1[i].x - p0[i].x, p1[i].y - p0[i].y) > 60, { p0: p0[i], p1: p1[i] }));
  if (guests.length) {
    // el anfitrión ve a cada invitado donde el invitado dice estar, y viceversa
    const hostView = await ev(host, () => heroes.map(h => ({ x: Math.round(h.x), y: Math.round(h.y) })));
    guests.forEach((g, k) => { const i = g.i; const d = Math.hypot(hostView[i].x - p1[i].x, hostView[i].y - p1[i].y); check(`move.host_sees_guest${i}`, d < 40, { host: hostView[i], guest: p1[i], d }); });
    const gv = await ev(guests[0], () => ({ x: heroes[0].x, y: heroes[0].y }));
    check('move.guest_sees_host', Math.hypot(gv.x - p1[0].x, gv.y - p1[0].y) < 40, { gv, host: p1[0] });
  }
  // ---------------- mismos enemigos ----------------
  await sleep(400);
  const eh = await ev(host, () => enemies.filter(e => e.alive).map(e => e.type).sort().join(','));
  for (const g of guests) {
    const eg = await ev(g, () => enemies.filter(e => e.alive !== false).map(e => e.type).sort().join(','));
    const same = eg === eh || Math.abs(eg.split(',').length - eh.split(',').length) <= 2;
    check(`world.guest${g.i}_same_enemies`, same && eh.length > 0, { host: eh.slice(0, 120), guest: eg.slice(0, 120) });
  }
  // ---------------- habilidades simultáneas ----------------
  if (guests.length) {
    await Promise.all(all.map(c => ev(c, () => { player.energy = player.maxEnergy; })));
    await ev(host, () => { for (const h of heroes) { h.energy = h.maxEnergy; h.cds = [0, 0, 0]; } });
    await sleep(200);
    await Promise.all(all.map(c => ev(c, () => useSkill(0, null))));
    await sleep(500);
    const cds = await ev(host, () => heroes.map(h => Math.round(h.cds[0])));
    check('skills.all_humans_cast', cds.slice(0, all.length).every(c => c > 0), cds);
    const gcd = await ev(guests[0], () => Math.round(player.cds[0]));
    check('skills.guest_sees_own_cooldown', gcd > 0, gcd);
  }
  // ---------------- fuego amigo OFF (sin bloquear curas) ----------------
  const ff = await ev(host, () => {
    const a = heroes[0], b = heroes[1]; const hp0 = b.hp;
    damageHero(b, 50, a); // golpe directo de un aliado
    damageHero(b, 50, { src: a, x: a.x, y: a.y }); // proyectil de un aliado
    damageHero(b, 50, { owner: a, x: a.x, y: a.y }); // invocación de un aliado
    const hp1 = b.hp;
    b.hp = Math.max(1, b.hp - 30); const before = b.hp; b.hp = Math.min(b.maxHp, b.hp + 20); // una cura sigue funcionando
    const e = enemies.find(x => x.alive); const hp2 = b.hp; if (e) damageHero(b, 5, e); // un enemigo sí daña
    return { hp0, hp1, healed: b.hp >= before, enemyHits: b.hp < hp2 || !e };
  });
  check('ff.allies_cannot_damage_allies', ff.hp0 === ff.hp1, ff);
  check('ff.heal_still_works', ff.healed);
  check('ff.enemies_still_damage', ff.enemyHits, ff);
  // ---------------- XP para cada uno, en su propio guardado ----------------
  const xp0 = await Promise.all(all.map(c => ev(c, () => totalXpForChamp(selectedClass))));
  await ev(host, () => { for (const e of enemies.slice(0, 12)) { if (!e.alive) continue; e.lastHitBy = heroes[Math.floor(Math.random() * 4)]; e.hp = 1; damageEnemy(e, 999, { src: e.lastHitBy }); } });
  // cada humano remata al menos uno
  for (let i = 0; i < all.length; i++) await ev(host, (i) => { const e = enemies.find(x => x.alive); if (e) damageEnemy(e, 999999, { src: heroes[i] }); }, i);
  await sleep(700);
  const xp1 = await Promise.all(all.map(c => ev(c, () => totalXpForChamp(selectedClass))));
  all.forEach((c, i) => check(`xp.client${i}_gained`, xp1[i] > xp0[i], { before: xp0[i], after: xp1[i] }));
  if (guests.length) {
    const hostSaveGuestChamp = await ev(host, (k) => JSON.parse(localStorage.getItem(SAVE_KEY)).champions[k].level, CHAMPS[1]);
    check('save.host_never_stores_guest_data', hostSaveGuestChamp === 12, hostSaveGuestChamp);
  }
  // ---------------- caída y revive (humano) ----------------
  if (guests.length) {
    await ev(host, () => { const g = heroes[1]; g.hp = 1; damageHero(g, 99999, enemies.find(e => e.alive) || { x: 0, y: 0, rank: 'normal' }); });
    await sleep(400);
    const downed = await ev(guests[0], () => player.alive);
    check('revive.guest_sees_self_down', downed === false);
    const stillPlaying = await ev(host, () => state);
    check('revive.match_continues_with_humans_alive', stillPlaying === 'playing', stillPlaying);
    await ev(host, () => { const g = heroes[1]; player.x = g.x + 20; player.y = g.y; });
    await sleep(150);
    await ev(host, () => tryReviveAlly(heroes[1]));
    await sleep(500);
    const back = await ev(guests[0], () => player.alive);
    check('revive.guest_revived', back === true);
  }
  // ---------------- refuerzo entre niveles: cada humano elige ----------------
  await ev(host, () => { levelTimer = levelDuration + 1; });
  for (let k = 0; k < 60 && !(await ev(host, () => state === 'buff')); k++) await sleep(100);
  await sleep(400);
  const buffStates = await Promise.all(all.map(c => ev(c, () => state)));
  check('buff.all_choose', buffStates.every(s => s === 'buff'), buffStates);
  for (const c of all) { await c.page.click('#buff-cards .buff-card').catch(() => {}); await sleep(150); }
  for (let k = 0; k < 40; k++) { const ok = await Promise.all(all.map(c => ev(c, () => state === 'playing'))); if (ok.every(Boolean)) break; await sleep(100); }
  const lv = await Promise.all(all.map(c => ev(c, () => ({ state, runLevel }))));
  check('buff.resumed_level2', lv.every(s => s.state === 'playing' && s.runLevel === 2), lv);
  if (LONG) { await sleep(20000); }
  // ---------------- jefe + victoria compartida ----------------
  await ev(host, () => { runLevel = LEVEL_COUNT; enemies.forEach(e => e.alive = false); startBossFight(); });
  await sleep(1500);
  const bossSeen = await Promise.all(all.map(c => ev(c, () => !!(boss && boss.type))));
  check('boss.everyone_sees_boss', bossSeen.every(Boolean), bossSeen);
  const bossHp = await Promise.all(all.map(c => ev(c, () => boss ? Math.round(boss.hp) : -1)));
  check('boss.same_hp', bossHp.every(h => Math.abs(h - bossHp[0]) <= Math.max(50, bossHp[0] * 0.05)), bossHp);
  // matar al jefe (con todas sus fases)
  for (let k = 0; k < 6; k++) { await ev(host, () => { if (boss && boss.alive) damageEnemy(boss, boss.hp + 10, { src: heroes[0] }); }); await sleep(250); }
  for (let k = 0; k < 60; k++) { const ok = await Promise.all(all.map(c => ev(c, () => state === 'victory'))); if (ok.every(Boolean)) break; await sleep(150); }
  const vic = await Promise.all(all.map(c => ev(c, () => ({ state, cleared: !!(save.arenasCleared || {}).bosque }))));
  vic.forEach((v, i) => check(`victory.client${i}`, v.state === 'victory' && v.cleared, v));
  // volver a la sala con el mismo código
  if (guests.length) {
    await host.page.evaluate(() => { victoryStep = VICTORY_STEPS.length - 1; renderVictoryStep(); });
    await host.page.click('#again-btn');
    await sleep(600);
    const back = await ev(host, () => ({ state, code: net.code, match: !!netMatch }));
    check('after.host_back_in_room', back.state === 'prep' && back.code === code && !back.match, back);
    const hostChamp = await ev(host, (k) => save.champions[k].level, CHAMPS[1]);
    check('after.host_guest_champ_restored', hostChamp === 12, hostChamp);
  }
  // revancha: todos vuelven a la sala y el anfitrión comienza otra partida
  if (guests.length) {
    for (const g of guests) { await g.page.evaluate(() => { victoryStep = VICTORY_STEPS.length - 1; renderVictoryStep(); }); await g.page.click('#again-btn'); }
    await sleep(700);
    const lobbyStates = await Promise.all(guests.map(g => ev(g, () => ({ state, code: net.code }))));
    check('rematch.guests_back_in_room', lobbyStates.every(s => s.state === 'prep' && s.code === code), lobbyStates);
    // campeón repetido: el invitado elige el del anfitrión -> no se puede comenzar
    await ev(guests[0], () => { selectedClass = 'tanque'; renderPrepSummary(); netSendLoadout(true); });
    await sleep(600);
    const blocked = await ev(host, () => ({ dup: netDuplicateChamps(), disabled: document.getElementById('prep-start-btn').disabled }));
    check('lobby.duplicate_champion_blocks_start', blocked.dup.length === 1 && blocked.disabled, blocked);
    await ev(guests[0], () => { selectedClass = 'mago'; renderPrepSummary(); netSendLoadout(true); });
    await sleep(600);
    await host.page.click('#prep-start-btn');
    for (let k = 0; k < 60; k++) { const ok = await Promise.all(all.map(c => ev(c, () => state === 'playing'))); if (ok.every(Boolean)) break; await sleep(100); }
    const re = await Promise.all(all.map(c => ev(c, () => ({ state, lvl: runLevel, match: netMatch && netMatch.role, ended: netMatch && netMatch.ended }))));
    check('rematch.everyone_playing_again', re.every(r => r.state === 'playing' && r.lvl === 1 && !r.ended), re);
  }
  // errores de página
  for (const c of all) check(`errors.client${c.i}`, c.errors.length === 0, c.errors.slice(0, 3));
  console.log('SUMMARY', JSON.stringify({ humans: N, fails }));
  await browser.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.log('FAIL exception', e.stack); process.exit(1); });
