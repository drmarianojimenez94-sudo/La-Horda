// LA HORDA — B1: prueba de punta a punta del multijugador cooperativo con navegadores
// INDEPENDIENTES (cada cliente es un contexto de Chromium aparte: su propio guardado, su propia
// conexión WebSocket) contra un relay real (server/relay.js).
//
// uso: node tools/net-test/e2e.js <humanos 1-4> [--fifth] [--long]
//   requiere el sitio servido (python3 -m http.server 8771) y el relay (PORT=8799 node server/relay.js)
//   (el anfitrión entra con ?dev=1; los invitados abren el enlace de invitación, sin ?dev=1: su
//   guardado es el propio -campaña real-, por eso se les marcan Ciudad y Fortaleza como superadas)
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
const RESERVES = ['eren', 'musashi', 'nigromante', 'cazadora', 'profeta'];
const CHAMP_LABEL = { tanque: 'Tanque', mago: 'Mago', guerrero: 'Asesino', soporte: 'Soporte', axiom: 'Axiom' };

async function newClient(browser, i, url) {
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 560 } });
  // guardado propio de cada jugador: campeones en nivel 12, Bosque abierto (orden canónico CAMPAIGN_ORDER:
  // se completan la Ciudad Maldita y la Fortaleza; sin eso el invitado no tiene el Bosque abierto y, con
  // razón, la victoria cooperativa no se lo cuenta como superado -ver netGuestEnd-)
  await ctx.addInitScript(([i]) => {
    try {
      if (!localStorage.getItem('__seeded')) {
        localStorage.clear(); localStorage.setItem('__seeded', '1');
        localStorage.setItem('horda_name', ['Mariano', 'Facundo', 'Daniel', 'Lucia', 'Quinto'][i]);
      }
    } catch (e) {}
  }, [i]);
  await ctx.addInitScript(() => { window.__autoConfirm = true; }); // diálogos propios (game-dialog.js): aceptar solos, como page.on('dialog')
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', d => d.accept());
  await page.goto(url, { waitUntil: 'load' });
  for (let k = 0; k < 300; k++) { if (await page.evaluate(() => { const b = document.getElementById('title-continue-btn'); return b && !b.disabled; })) break; await sleep(100); }
  await page.evaluate(([c,reserve]) => { save.stash=[]; save.duoReserve=reserve; save.lastChamp=c; for (const k in save.champions) { save.champions[k].level = 12; save.champions[k].talentPoints = 2; save.champions[k].unlocked = true; } save.starterChosen = true; save.arenasCleared = save.arenasCleared || {}; save.arenasCleared.ciudad = true; save.arenasCleared.fortaleza = true; selectedClass = c; persistNow(); }, [CHAMPS[i],RESERVES[i]]);
  return { ctx, page, errors, i };
}
const ev = (c, fn, arg) => c.page.evaluate(fn, arg);

(async () => {
  const browser = await chromium.launch({ executablePath:process.env.CHROMIUM_PATH||chromium.executablePath(), args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  // ---------------- anfitrión: menú -> arena -> campeón -> pre-sala -> crear sala ----------------
  const host = await newClient(browser, 0, `${SITE}/index.html?dev=1&server=${encodeURIComponent(RELAY)}`);
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
  await host.page.click('[data-prep-sec="equipo"]');
  await host.page.locator('.prep-advanced[data-part="equipo"] > summary').click();
  await host.page.click('#prep-tabs [data-tab="equipo"]');
  await host.page.click(`#prep-inventory-panel [data-inv-equip="${invUid}"]`);
  const eqAfter = await ev(host, () => save.champions[selectedClass].equipment.arma);
  check('inventory.equip_in_lobby', eqAfter === invUid, { eqAfter, invUid });
  if (N > 1 || FIFTH) {
    await host.page.evaluate(s => { if (typeof prepSecReveal === 'function') prepSecReveal(s); }, '#net-create-btn'); // pestaña Sala online (js/ui/prep-sections.js)
    await host.page.click('#net-create-btn');
    await host.page.waitForFunction(()=>!!net.code||!!netLobby.lastError, null, {timeout:30000});
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
    await g.page.waitForFunction(()=>state==='prep'&&!!net.room||!!netLobby.lastError, null, {timeout:30000});
    const st = await ev(g, () => ({ state, slot: net.slot, arena: currentArena, role: net.role, error:netLobby.lastError, status:document.getElementById('title-join-status')?.textContent }));
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
  const all0 = () => [host, ...guests];
  // ---------------- chat de la sala ----------------
  if (guests.length) {
    await guests[0].page.click('#net-chat [data-q="¡Vamos!"]');
    await host.page.fill('#net-chat-input', 'arranco en 5');
    await host.page.press('#net-chat-input', 'Enter');
    await sleep(600);
    const logs = await Promise.all(all0().map(c => ev(c, () => netChat.log.map(m => m.name + ':' + m.text))));
    check('chat.frase_rapida_y_texto_llegan_a_todos', logs.every(l => l.includes('Facundo:¡Vamos!') && l.includes('Mariano:arranco en 5')), logs[0]);
    const shown = await ev(guests[0], () => document.getElementById('net-chat-log').textContent);
    check('chat.visible_en_la_sala', /arranco en 5/.test(shown), shown.slice(0, 80));
    await host.page.click('#net-chat-log [data-mute="1"]');
    await sleep(500);
    const mutedUi = await ev(guests[0], () => document.getElementById('net-chat-input').disabled);
    check('chat.anfitrion_silencia_y_el_invitado_lo_ve', mutedUi === true, mutedUi);
    await host.page.click('#net-chat-log [data-mute="1"]');
    await sleep(400);
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
  // La horda aparece de a tandas: si justo cae una tanda entre las dos lecturas la cuenta difiere
  // sin que haya desincronización. Se toman hasta 6 muestras (cada ~250 ms) y basta con que una
  // coincida (misma lista o a lo sumo 2 de diferencia), igual que antes.
  await sleep(400);
  for (const g of guests) {
    let eh = '', eg = '', same = false;
    for (let k = 0; k < 6 && !same; k++) {
      if (k) await sleep(250);
      [eh, eg] = await Promise.all([
        ev(host, () => enemies.filter(e => e.alive).map(e => e.type).sort().join(',')),
        ev(g, () => enemies.filter(e => e.alive !== false).map(e => e.type).sort().join(','))]);
      same = eh.length > 0 && (eg === eh || Math.abs(eg.split(',').length - eh.split(',').length) <= 2);
    }
    check(`world.guest${g.i}_same_enemies`, same, { host: eh.slice(0, 120), guest: eg.slice(0, 120) });
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
  // Los escudos (habilidades, objetos: itemShield) absorben golpes sin bajar la vida: se vacían antes
  // de cada golpe para que "la vida no cambió" signifique "el golpe no se aplicó" y no "lo absorbió
  // un escudo" (con escudo, un fuego amigo roto pasaría desapercibido y un golpe enemigo válido
  // parecería no hacer daño).
  const ff = await ev(host, () => {
    const a = heroes[0], b = heroes[1];
    const noShield = () => { b.shield = 0; b.itemShield = 0; b.invulnTimer = 0; b.emergencyShieldUsed = true; };
    noShield(); const hp0 = b.hp;
    damageHero(b, 50, a); // golpe directo de un aliado
    damageHero(b, 50, { src: a, x: a.x, y: a.y }); // proyectil de un aliado
    damageHero(b, 50, { owner: a, x: a.x, y: a.y }); // invocación de un aliado
    const hp1 = b.hp;
    b.hp = Math.max(1, b.hp - 30); const before = b.hp; b.hp = Math.min(b.maxHp, b.hp + 20); // una cura sigue funcionando
    const e = enemies.find(x => x.alive); noShield(); const hp2 = b.hp; if (e) damageHero(b, 5, e); // un enemigo sí daña
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
  // ---------------- dúo: primera caída activa reserva; ya no hay revivir ilimitado ----------------
  if (guests.length) {
    await ev(host, () => { const g=heroes[1]; g.alive=false;g.hp=0; });
    await guests[0].page.waitForFunction(k=>player.alive&&player.classKey===k&&player._duoUsed,RESERVES[1]);
    check('duo.guest_sees_reserve', await ev(guests[0], k=>player.classKey===k&&player.alive,RESERVES[1]));
    check('duo.match_continues',await ev(host,()=>state==='playing'));
    check('duo.host_and_guest_same_card',await ev(host,k=>heroes[1].classKey===k&&heroes[1]._duoUsed,RESERVES[1]));
    // curación de emergencia pedida por el invitado: la aplica el anfitrión, una sola vez
    // Antes se exigía pct < 0.9 como prueba de "una sola vez", pero la vida también sube por otras
    // curas legítimas (el Soporte bot cura aliados heridos, regeneración, la cura en el tiempo de la
    // propia emergencia: EMERG_CFG 30% al instante + 20% en 2,5 s) y se vio 0.907 con una sola
    // aplicación. Ahora "una sola vez" se mide directo: stats.emergHeals sube exactamente 1 y la
    // carga queda en 0; y la cura instantánea tiene que notarse (>= +25% de la vida máxima).
    const em0 = await ev(host, () => { const g = heroes[1]; g.hp = g.maxHp*0.3; g.emergCharges = 1; return { heals: (g.stats && g.stats.emergHeals) || 0 }; });
    await sleep(300);
    const pctBefore = await ev(host, () => heroes[1].hp/heroes[1].maxHp);
    await ev(guests[0], () => { emergPress(); emergPress(); });
    await sleep(500);
    const em = await ev(host, () => ({ pct: heroes[1].hp/heroes[1].maxHp, charges: heroes[1].emergCharges, heals: (heroes[1].stats && heroes[1].stats.emergHeals) || 0 }));
    em.before = pctBefore; em.healsDelta = em.heals - em0.heals;
    check('emerg.guest_heal_applied_once', em.healsDelta === 1 && em.charges === 0 && em.pct - pctBefore >= 0.25, em);
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
  // El Bosque ya no hace aparecer al jefe al instante: startBossFight() primero dispara la secuencia
  // de las runas (bosBossIntro, bos-ruins.js: se desbordan ~3,2 s y estallan ~1,4 s) y recién al
  // final se crea el Guardián Ancestral. Se espera a que exista en el ANFITRIÓN y después se exige
  // que cada invitado lo vea (por la sincronización de red, no por su propio tiempo).
  await ev(host, () => { runLevel = LEVEL_COUNT; enemies.forEach(e => e.alive = false); startBossFight(); });
  const introOk = await ev(host, () => !!(typeof BOS !== 'undefined' && BOS.finale) || !!(boss && boss.type));
  check('boss.intro_started', introOk);
  let hostBossAt = -1;
  for (let k = 0; k < 100; k++) { if (await ev(host, () => !!(boss && boss.alive && boss.type))) { hostBossAt = k * 100; break; } await sleep(100); }
  check('boss.host_spawns_after_intro', hostBossAt >= 0, { waitedMs: hostBossAt });
  // 1,5 s de margen para la red (igual que antes, pero contado desde que el jefe existe)
  let bossSeen = [];
  for (let k = 0; k < 15; k++) { bossSeen = await Promise.all(all.map(c => ev(c, () => !!(boss && boss.type)))); if (bossSeen.every(Boolean)) break; await sleep(100); }
  check('boss.everyone_sees_boss', bossSeen.every(Boolean), bossSeen);
  const bossHp = await Promise.all(all.map(c => ev(c, () => boss ? Math.round(boss.hp) : -1)));
  check('boss.same_hp', bossHp[0] > 0 && bossHp.every(h => Math.abs(h - bossHp[0]) <= Math.max(50, bossHp[0] * 0.05)), bossHp);
  // matar al jefe con TODAS sus fases: el director (boss-patterns.js) pone un piso de vida por fase
  // (bossPhaseFloor: un golpe no cruza dos umbrales) y el Guardián se transforma al 65% con corteza
  // (x0,15 de daño y vida mínima del 61% durante 2,1 s, boss-guardian.js). Se golpea en cada cuadro
  // de a un golpe "letal" hasta que muere de verdad (máx. 40 s) y se registran las fases vistas.
  const phasesSeen = new Set();
  let bossDead = false;
  for (let k = 0; k < 160 && !bossDead; k++) {
    const r = await ev(host, () => {
      if (!boss) return { dead: true };
      const ph = boss.bd ? boss.bd.phase : -1, tf = !!boss._gdTf;
      if (boss.alive) damageEnemy(boss, boss.hp + 10, { src: heroes[0] });
      return { dead: !boss.alive, ph, tf };
    });
    if (r.ph !== undefined) phasesSeen.add(r.ph + (r.tf ? 't' : ''));
    bossDead = r.dead;
    if (!bossDead) await sleep(250);
  }
  // el Guardián tiene 3 fases (0, 1 = transformado, 2 = "El Bosque Muere con Él"): morir sin pasar por la
  // última significaría que el piso de fase no funciona o que la pelea terminó por otra vía
  const lastPhase = await ev(host, () => { const d = BOSS_DESIGNS.guardian_ancestral; return d && d.phases ? d.phases.length - 1 : 2; });
  check('boss.killed_through_all_phases', bossDead && [...phasesSeen].some(p => parseInt(p, 10) === lastPhase), { bossDead, lastPhase, phases: [...phasesSeen] });
  // victoria: el Guardián suelta su cristal (crystalAward) y la pantalla llega ~3,4 s después
  for (let k = 0; k < 100; k++) { const ok = await Promise.all(all.map(c => ev(c, () => state === 'victory'))); if (ok.every(Boolean)) break; await sleep(150); }
  const vic = await Promise.all(all.map(c => ev(c, () => ({ state, cleared: !!(save.arenasCleared || {}).bosque }))));
  vic.forEach((v, i) => check(`victory.client${i}`, v.state === 'victory' && v.cleared, v));
  // logros/desafíos (js/systems/quests.js): cada cliente cuenta la partida en SU guardado, con SUS bajas
  const qs = await Promise.all(all.map(c => ev(c, () => { const q = save.quests; return q ? { wins: q.stats.wins, coop: q.stats.coopRuns, coopWins: q.stats.coopWins, kills: q.stats.kills, own: player.stats.kills|0, coWin: !!q.ach.co_win } : null; })));
  qs.forEach((q, i) => check(`quests.client${i}_cuenta_su_partida`, !!q && q.wins >= 1 && q.kills === q.own && (N < 2 ? q.coop === 0 : (q.coop === 1 && q.coopWins === 1 && q.coWin)), q));
  const allVictory = vic.every(v => v.state === 'victory');
  if (!allVictory) check('after.skipped_no_victory', false, 'sin victoria no se puede probar volver a la sala ni la revancha');
  // volver a la sala con el mismo código
  if (guests.length && allVictory) {
    await host.page.evaluate(() => { victoryStep = VICTORY_STEPS.length - 1; renderVictoryStep(); });
    await host.page.click('#again-btn');
    await sleep(600);
    const back = await ev(host, () => ({ state, code: net.code, match: !!netMatch }));
    check('after.host_back_in_room', back.state === 'prep' && back.code === code && !back.match, back);
    const hostChamp = await ev(host, (k) => save.champions[k].level, CHAMPS[1]);
    check('after.host_guest_champ_restored', hostChamp === 12, hostChamp);
  }
  // revancha: todos vuelven a la sala y el anfitrión comienza otra partida
  if (guests.length && allVictory) {
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
    await Promise.all(all.map(c => ev(c, () => { if (typeof campClose === 'function') campClose(true); if (typeof prepSecReveal === 'function') prepSecReveal('#prep-start-btn'); }))); // el campamento (camp.js) se abre al volver a la Sala
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
