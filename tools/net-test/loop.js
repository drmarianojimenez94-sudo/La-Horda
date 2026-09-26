// LA HORDA — PLAYTEST V1 (P0): el ciclo completo del cooperativo con 4 navegadores independientes.
//
//   FULL CYCLE (modo campaña): cada jugador abre el juego (todo en nivel 1, 0 de oro) y elige su
//   campeón de REGALO; A: Jugar -> Arena -> Bosque -> campeón -> Sala -> Crear sala; B/C/D: Jugar ->
//   Arena -> Sala -> pegan el enlace/código en "Unirse" -> sala de A. D compra un campeón en la
//   Tienda (1.000 de oro). Todos LISTO -> partida -> alguien cae -> lo reviven -> REVIVE 1-5 ->
//   TEAM WIPE -> derrota -> la MISMA sala (mismo código, misma arena, LISTO en NO) -> cambian
//   campeón -> LISTO -> REINTENTAR (instancia limpia). Se repite RETRY_ROUNDS veces sin recargar
//   la página ni recrear el servidor, y se mide que nada se degrade.
//
// uso: node tools/net-test/loop.js [rondas de reintento, default 3]
//   requiere el sitio (python3 -m http.server 8771) y el relay (PORT=8799 node server/relay.js)
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const SITE = process.env.SITE || 'http://127.0.0.1:8771';
const RELAY = process.env.RELAY || 'ws://127.0.0.1:8799';
const ROUNDS = Math.max(1, parseInt(process.argv[2] || '3', 10));
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0;
const check = (name, ok, extra) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  ' + JSON.stringify(extra).slice(0, 360) : '')); if (!ok) fails++; };
const NAMES = ['Ana', 'Beto', 'Caro', 'Dani'];
const FIRST = ['tanque', 'mago', 'soporte', 'guerrero'];
const ev = (c, fn, arg) => c.page.evaluate(fn, arg);
async function waitFor(c, fn, arg, ms = 8000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await ev(c, fn, arg)) return true; await sleep(100); } return false; }
async function waitAll(cs, fn, ms = 8000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { const r = await Promise.all(cs.map(c => ev(c, fn))); if (r.every(Boolean)) return true; await sleep(100); } return false; }

async function newClient(browser, i) {
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 560 } });
  await ctx.addInitScript(([name]) => {
    try { if (!sessionStorage.getItem('__seeded')) { localStorage.clear(); localStorage.setItem('horda_name', name); sessionStorage.setItem('__seeded', '1'); } } catch (e) {}
  }, [NAMES[i]]);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', d => d.accept());
  // el servidor de pruebas viaja en la URL (los enlaces de invitación lo copian solos)
  await page.goto(`${SITE}/index.html?server=${encodeURIComponent(RELAY)}`, { waitUntil: 'load' });
  const c = { ctx, page, errors, i };
  await waitFor(c, () => { const b = document.getElementById('title-continue-btn'); return b && !b.disabled; }, null, 30000);
  return c;
}
// La partida de prueba no debe terminar sola: sin enemigos ni fin de nivel (solo para medir revivir/derrota).
const CALM = () => { if (window.__calm) clearInterval(window.__calm); window.__calm = setInterval(() => { if (state === 'playing') { enemies.length = 0; projectiles.length = 0; levelTimer = 0; levelDuration = 1e9; } }, 30); };
const UNCALM = () => { if (window.__calm) clearInterval(window.__calm); window.__calm = null; };

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const all = [];
  for (let i = 0; i < 4; i++) all.push(await newClient(browser, i));
  const [A, B, C, D] = all;
  const guests = [B, C, D];

  // ---------------- modo campaña: todo en nivel 1 y un campeón de regalo a elegir ----------------
  for (const c of all) {
    const s0 = await ev(c, () => ({ gold: save.gold, lv: Object.values(save.champions).every(ch => ch.level === 1 && ch.xp === 0), owned: Object.keys(save.champions).filter(k => save.champions[k].unlocked), multi: !!document.getElementById('mainmenu-multi-btn') }));
    check(`campaign.client${c.i}_fresh_level1_no_gold`, s0.gold === 0 && s0.lv && s0.owned.length === 0 && !s0.multi, s0);
    await c.page.click('#title-continue-btn');
    check(`starter.client${c.i}_screen`, await c.page.isVisible('#starter-screen'));
    await c.page.click(`.starter-card[data-champ="${FIRST[c.i]}"]`);
    await c.page.click('#starter-yes-btn');
    const s1 = await ev(c, () => ({ state, owned: Object.keys(save.champions).filter(k => save.champions[k].unlocked), sel: selectedClass }));
    check(`starter.client${c.i}_owns_only_gift`, s1.state === 'mainmenu' && s1.owned.join() === FIRST[c.i] && s1.sel === FIRST[c.i], s1);
  }
  // recargar no vuelve a regalar
  await A.page.reload({ waitUntil: 'load' });
  await waitFor(A, () => !document.getElementById('title-continue-btn').disabled, null, 30000);
  await A.page.click('#title-continue-btn');
  check('starter.not_twice_after_reload', await ev(A, () => state === 'mainmenu' && Object.keys(save.champions).filter(k => save.champions[k].unlocked).length === 1));
  // guardado VIEJO (con progreso, de antes de la campaña): vuelve a nivel 1, se respalda y se regala de nuevo
  await ev(A, () => { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); s.gold = 300; for (const k in s.champions) { s.champions[k].level = 37; s.champions[k].xp = 55; s.champions[k].unlocked = true; } delete s.campaignResetV1; delete s.campaignResetV2; delete s.campaignResetV3; localStorage.setItem(SAVE_KEY, JSON.stringify(s)); localStorage.removeItem(SAVE_KEY + '_antesDeCampania'); });
  await A.page.reload({ waitUntil: 'load' });
  await waitFor(A, () => !document.getElementById('title-continue-btn').disabled, null, 30000);
  const reset = await ev(A, () => ({ gold: save.gold, lv: Object.values(save.champions).every(ch => ch.level === 1 && ch.xp === 0), owned: Object.keys(save.champions).filter(k => save.champions[k].unlocked).length, backup: JSON.parse(localStorage.getItem(SAVE_KEY + '_antesDeCampania') || '{}').champions.tanque.level }));
  check('campaign.old_save_reset_with_backup', reset.gold === 0 && reset.lv && reset.owned === 0 && reset.backup === 37, reset);
  await A.page.click('#title-continue-btn');
  await A.page.click(`.starter-card[data-champ="${FIRST[0]}"]`);
  await A.page.click('#starter-yes-btn');
  // D compra un campeón en la Tienda (1.000 de oro)
  await ev(D, () => { save.gold = 1200; setState('shop'); renderShop(); });
  await D.page.click('.shop-champ-card[data-champ="musashi"]');
  await D.page.click('#cd-unlock-btn');
  const buy = await ev(D, () => ({ gold: save.gold, owned: save.champions.musashi.unlocked }));
  check('shop.champion_costs_1000', buy.gold === 200 && buy.owned === true, buy);
  await ev(D, () => { setState('mainmenu'); renderMainMenu(); });
  // para la prueba de red: nivel 12 y B tiene comprados los campeones a los que cambia en cada ronda
  await ev(A, () => { for (const k in save.champions) { save.champions[k].level = 12; save.champions[k].talentPoints = 2; } save.arenasCleared = { bosque: true }; persistNow(); });
  for (const c of guests) await ev(c, () => { for (const k in save.champions) { save.champions[k].level = 12; save.champions[k].talentPoints = 2; } persistNow(); });
  await ev(B, () => { for (const k of ['axiom', 'segador', 'profeta', 'cazadora']) save.champions[k].unlocked = true; persistNow(); });

  // ---------------- A: Jugar -> Arena -> Bosque -> campeón -> Sala -> Crear sala ----------------
  const toLobby = async (c, champ) => {
    await c.page.click('#mainmenu-jugar-btn');
    await c.page.click('#mode-arena-btn');
    await c.page.click('.arena-card[data-arena="bosque"]');
    await c.page.click(`#champ-grid .champ-card:nth-child(${await ev(c, (k) => Object.keys(CLASSES).indexOf(k) + 1, champ)})`);
    await c.page.click('#start-btn');
    return waitFor(c, () => state === 'prep', null, 8000);
  };
  check('lobby.host_in_prep', await toLobby(A, FIRST[0]));
  check('lobby.join_box_visible', await A.page.isVisible('#net-join-code'));
  await A.page.click('#net-create-btn');
  await waitFor(A, () => !!net.code, null, 15000);
  const code = await ev(A, () => net.code);
  check('room.created_from_lobby', /^[A-Z2-9]{6}$/.test(code || ''), code);
  check('room.host_champion', await ev(A, () => selectedClass) === FIRST[0]);
  const invite = await ev(A, () => netInviteUrl());

  // ---------------- B/C/D: Jugar -> Arena -> Sala -> pegar enlace (o código) -> Unirse ----------------
  for (const [n, c] of guests.entries()) {
    check(`lobby.client${c.i}_in_prep`, await toLobby(c, FIRST[c.i]));
    // B pega el enlace completo, C "SALA XXXXXX", D el código en minúsculas con espacios
    const paste = n === 0 ? invite : (n === 1 ? `SALA ${code}` : ` ${code.toLowerCase()} `);
    await c.page.fill('#net-join-code', paste);
    await c.page.click('#net-join-btn');
    const ok = await waitFor(c, () => state === 'prep' && !!net.room && net.role === 'guest', null, 15000);
    const st = await ev(c, () => ({ state, slot: net.slot, code: net.code, champ: selectedClass, arena: currentArena }));
    check(`join.client${c.i}_via_lobby_code`, ok && st.code === code && st.champ === FIRST[c.i] && st.arena === 'bosque', st);
  }
  await sleep(500);
  const room0 = await ev(A, () => net.room.slots.map(s => s && `${s.name}:${s.champ}`));
  check('lobby.four_players_with_their_champions', room0.join() === NAMES.map((n, i) => `${n}:${FIRST[i]}`).join(), room0);
  // colores P1-P4 en la sala
  const tags = await A.page.$$eval('#lobby-slots .lobby-tag', els => els.map(e => e.className + '|' + e.textContent));
  check('lobby.p1_p4_tags', tags.length === 4 && tags.every((t, i) => t.includes('p' + i) && t.includes('P' + (i + 1))), tags);
  // héroes animados respirando en la sala
  const anims = await A.page.$$eval('#lobby-slots canvas.lobby-anim[data-idle]', els => els.length);
  check('lobby.breathing_heroes', anims === 4, anims);
  // en la sala solo se ofrecen los campeones propios; D tiene el comprado
  const dOffer = await D.page.$$eval('[data-net-champ]', els => els.map(e => e.getAttribute('data-net-champ')));
  check('lobby.only_owned_champions_offered', dOffer.sort().join() === ['guerrero', 'musashi'].join(), dOffer);
  await D.page.click('[data-net-champ="musashi"]');
  await waitFor(A, () => net.room.slots[3] && net.room.slots[3].champ === 'musashi');
  check('lobby.guest_changes_champion_in_room', await ev(A, () => net.room.slots[3].champ) === 'musashi');
  // el campeón de otro jugador aparece bloqueado (B tiene varios comprados; el de A no lo tiene)
  await ev(B, () => { save.champions.tanque.unlocked = true; renderPrepSummary(); });
  const takenDisabled = await B.page.$eval(`[data-net-champ="${FIRST[0]}"]`, b => b.disabled);
  check('lobby.taken_champion_disabled', takenDisabled === true);
  // no se puede comenzar sin que estén todos LISTOS (pide confirmación): primero los LISTO
  const lbl0 = await ev(A, () => document.getElementById('prep-start-btn').textContent);
  check('lobby.start_label_shows_missing_ready', /faltan 3 LISTO/.test(lbl0), lbl0);
  for (const c of guests) await c.page.click('#net-ready-btn');
  await waitFor(A, () => net.room.slots.every((s, i) => !s || i === 0 || s.ready));
  const lbl1 = await ev(A, () => document.getElementById('prep-start-btn').textContent);
  check('lobby.all_ready', !/faltan/.test(lbl1), lbl1);

  const champsNow = () => ['tanque', 'mago', 'soporte', 'musashi'];
  let expectChamps = champsNow();
  const startMatch = async (label) => {
    await A.page.click('#prep-start-btn');
    const ok = await waitAll(all, () => state === 'playing' && !!netMatch && !netMatch.ended, 15000);
    check(`${label}.everyone_playing`, ok, await Promise.all(all.map(c => ev(c, () => state))));
    await ev(A, CALM);
    await sleep(700);
  };
  await startMatch('start');
  const hs = await ev(A, () => heroes.map(h => h.classKey));
  check('start.champions_as_chosen', hs.join() === expectChamps.join(), hs);

  // posiciona a todos juntos (el anfitrión manda: corrige a los invitados)
  const gather = () => ev(A, () => { heroes.forEach((h, i) => { h.x = [0, 60, 0, 60][i]; h.y = [0, 0, 60, 60][i]; }); });
  const down = (i) => ev(A, (i) => { const h = heroes[i]; h.shield = 0; h.itemShield = 0; h.hp = 1; damageHero(h, 1e7, { x: 0, y: 0 }); return h.alive; }, i);
  const hold = (c, on) => c.page.dispatchEvent('#btn-revive', on ? 'pointerdown' : 'pointerup');
  const hostView = () => ev(A, () => heroes.map(h => ({ alive: h.alive, by: h._reviveBy ? heroes.indexOf(h._reviveBy) : -1, t: Math.round(h._reviveT || 0), hp: Math.round(h.hp), rev: h.stats.revives })));

  // ---------------- REVIVE 1: un invitado revive a otro invitado ----------------
  await gather(); await sleep(400);
  await down(1);
  await sleep(300);
  const seeDown = await Promise.all(all.map(c => ev(c, () => heroes[1].alive)));
  check('revive1.everyone_sees_P2_down', seeDown.every(a => a === false), seeDown);
  const overlay = await ev(B, () => !document.getElementById('downed-overlay').classList.contains('hidden'));
  check('revive1.downed_feedback_for_P2', overlay);
  const btnReady = await ev(C, () => document.getElementById('btn-revive').classList.contains('ready'));
  check('revive1.button_visible_only_when_valid', btnReady === true);
  await hold(C, true);
  await sleep(600);
  const mid = await Promise.all(all.map(c => ev(c, () => ({ by: heroes[1]._reviveBy ? heroes.indexOf(heroes[1]._reviveBy) : -1, t: heroes[1]._reviveT || 0 }))));
  check('revive1.everyone_sees_P3_reviving_P2', mid.every(m => m.by === 2 && m.t > 200), mid);
  const bSub = await ev(B, () => document.getElementById('downed-sub').textContent);
  check('revive1.P2_sees_who_revives', /Caro te está reviviendo/.test(bSub), bSub);
  await sleep(1100);
  await hold(C, false);
  await sleep(300);
  let hv = await hostView();
  check('revive1.P2_revived_once', hv[1].alive && hv[2].rev === 1 && hv[1].by === -1, hv);
  const bAlive = await ev(B, () => player.alive);
  check('revive1.P2_sees_self_alive', bAlive === true);

  // ---------------- REVIVE 2: soltar el botón cancela (sin progreso fantasma) ----------------
  await gather(); await sleep(300);
  await down(3);
  await sleep(300);
  await hold(C, true); await sleep(500); await hold(C, false);
  await sleep(300);
  hv = await hostView();
  const gv2 = await Promise.all(all.map(c => ev(c, () => ({ by: heroes[3]._reviveBy ? 1 : 0, t: heroes[3]._reviveT || 0 }))));
  check('revive2.release_cancels', !hv[3].alive && hv[3].by === -1 && hv[3].t === 0, hv[3]);
  check('revive2.no_ghost_reviving_anywhere', gv2.every(g => g.by === 0 && g.t === 0), gv2);

  // ---------------- REVIVE 3: alejarse cancela ----------------
  await hold(C, true); await sleep(400);
  await ev(A, () => { heroes[2].x = 900; heroes[2].y = 900; });
  await sleep(500);
  hv = await hostView();
  check('revive3.out_of_range_cancels', !hv[3].alive && hv[3].by === -1, hv[3]);
  const cBtn = await ev(C, () => document.getElementById('btn-revive').dataset.holding);
  check('revive3.button_released_by_itself', cBtn === '0', cBtn);
  await hold(C, false);

  // ---------------- REVIVE 4: dos intentan revivir al mismo: uno solo (candado), sin doble vida ----------------
  await gather(); await sleep(400);
  const revBefore = (await hostView()).reduce((s, h) => s + h.rev, 0);
  await hold(C, true); await sleep(250);
  await hold(A, true); // el anfitrión también quiere: no puede, ya lo está reviviendo P3
  await sleep(1500);
  await hold(A, false); await hold(C, false);
  await sleep(300);
  hv = await hostView();
  const revAfter = hv.reduce((s, h) => s + h.rev, 0);
  const maxHp = await ev(A, () => heroes[3].maxHp);
  check('revive4.single_reviver_lock', hv[3].alive && revAfter - revBefore === 1 && hv[2].rev >= 1, { hv3: hv[3], revBefore, revAfter });
  check('revive4.no_duplicated_hp', hv[3].hp <= Math.round(maxHp * 0.6) + 1, { hp: hv[3].hp, maxHp });

  // ---------------- REVIVE 5: el que revive cae / se desconecta a mitad ----------------
  await gather(); await sleep(300);
  await down(1); await sleep(300);
  await hold(C, true); await sleep(400);
  await down(2); // el reanimador cae
  await sleep(300);
  hv = await hostView();
  check('revive5.reviver_dies_cancels', !hv[1].alive && hv[1].by === -1 && hv[1].t === 0, hv);
  await hold(C, false);
  // ninguno en pie salvo A y D: todavía NO es derrota (quedan humanos vivos)
  check('wipe.no_premature_wipe', await ev(A, () => state === 'playing' && !runEnding));
  // A revive a P3; D empieza a revivir a P2 y se desconecta
  await ev(A, () => { heroes[0].x = heroes[2].x + 20; heroes[0].y = heroes[2].y; });
  await sleep(300);
  await hold(A, true); await sleep(1700); await hold(A, false);
  await ev(A, () => { heroes[3].x = heroes[1].x + 20; heroes[3].y = heroes[1].y; });
  await sleep(400);
  await hold(D, true); await sleep(400);
  const midD = (await hostView())[1];
  await ev(D, () => { net.ws.close(); });
  await waitFor(A, () => !heroes[3]._net.connected, null, 5000);
  hv = await hostView();
  // se interrumpe (0); el bot que toma su héroe puede empezar de nuevo desde cero
  check('revive5.reviver_disconnect_cancels', midD.by === 3 && midD.t > 200 && !hv[1].alive && hv[1].t < 120, { midD, now: hv[1] });
  await waitFor(A, () => net.room.slots[3] && net.room.slots[3].connected, null, 15000);
  await waitFor(D, () => state === 'playing' && !!netMatch, null, 15000);
  check('revive5.reconnected', await ev(D, () => state === 'playing' && net.slot === 3));
  await hold(D, false);

  // ---------------- TEAM WIPE -> derrota -> la MISMA sala (todos juntos) ----------------
  for (let round = 1; round <= ROUNDS; round++) {
    const R = `round${round}`;
    await Promise.all(all.map(c => ev(c, () => { window.__goCount = 0; if (!window.__goWrapped) { const f = showGameOverScreen; window.showGameOverScreen = function () { window.__goCount++; return f.apply(this, arguments); }; window.__goWrapped = 1; } })));
    const gold0 = await Promise.all(all.map(c => ev(c, () => save.gold)));
    await ev(A, () => { for (let i = 0; i < 4; i++) { const h = heroes[i]; h.shield = 0; h.itemShield = 0; if (h.alive) { h.hp = 1; damageHero(h, 1e7, { x: 0, y: 0 }); } } });
    const allOver = await waitAll(all, () => state === 'gameover', 8000);
    check(`${R}.wipe_defeat_for_everyone`, allOver, await Promise.all(all.map(c => ev(c, () => state))));
    const goCounts = await Promise.all(all.map(c => ev(c, () => window.__goCount)));
    check(`${R}.defeat_shown_once_each`, goCounts.every(n => n === 1), goCounts);
    const btn = await ev(A, () => document.getElementById('retry-btn').textContent);
    check(`${R}.button_volver_al_lobby`, /VOLVER AL LOBBY/.test(btn), btn);
    await sleep(800);
    const gold1 = await Promise.all(all.map(c => ev(c, () => save.gold)));
    // la derrota se procesa una vez: el oro no sube (nunca premio duplicado)
    check(`${R}.no_duplicated_rewards`, gold1.every((g, i) => g <= gold0[i]), { gold0, gold1 });
    await ev(A, UNCALM);
    await A.page.click('#retry-btn');
    const back = await waitAll(all, () => state === 'prep' && !!net.room && net.room.state === 'lobby', 12000);
    const views = await Promise.all(all.map(c => ev(c, () => ({ state, code: net.code, arena: currentArena, match: !!netMatch, slot: net.slot, ready: net.room && net.room.slots.map(s => s && s.ready) }))));
    check(`${R}.everyone_back_in_same_lobby`, back && views.every(v => v.code === code && v.state === 'prep' && !v.match), views);
    check(`${R}.same_arena_kept`, views.every(v => v.arena === views[0].arena), views.map(v => v.arena));
    check(`${R}.ready_reset_to_not_ready`, views[0].ready.slice(1).every(r => r === false), views[0].ready);
    const people = await ev(A, () => net.room.slots.map(s => s && `${s.name}:${s.connected}`));
    check(`${R}.same_players_connected`, people.join() === NAMES.map(n => `${n}:true`).join(), people);
    const guestLbl = await ev(A, () => document.getElementById('prep-start-btn').textContent);
    check(`${R}.retry_label`, /Reintentar/.test(guestLbl), guestLbl);
    // cambios de build en la sala: B cambia de campeón; en la 2ª ronda el anfitrión cambia de arena
    const newB = ['axiom', 'segador', 'profeta', 'cazadora'][round % 4];
    await B.page.click(`[data-net-champ="${newB}"]`);
    expectChamps = ['tanque', newB, 'soporte', 'musashi'];
    if (round === 2) {
      await ev(A, () => { save.arenasCleared.acuatica = true; save.arenasCleared.bosque = true; renderPrepSummary(); });
      await A.page.selectOption('#net-arena-sel', 'bosque'); // (queda igual si ya lo estaba)
      await A.page.selectOption('#net-arena-sel', 'hielo').catch(() => {});
      const arenaNow = await ev(A, () => currentArena);
      await waitAll(guests, () => true);
      await sleep(400);
      const ga = await Promise.all(guests.map(c => ev(c, () => currentArena)));
      check(`${R}.host_can_change_arena_guests_follow`, ga.every(a => a === arenaNow), { host: arenaNow, ga });
    }
    for (const c of guests) await c.page.click('#net-ready-btn');
    await waitFor(A, () => net.room.slots.every((s, i) => !s || i === 0 || s.ready));
    await startMatch(R + '.retry');
    const inst = await ev(A, () => ({ lvl: runLevel, ending: runEnding, boss: !!boss, bossActive, lc: levelClearing, act: !!activeChampion, frz: axiomFreezeTimer, timers: runTimers.length,
      alive: heroes.every(h => h.alive && h.hp === h.maxHp), revs: heroes.map(h => h.stats.revives), champs: heroes.map(h => h.classKey), kills,
      colls: [projectiles.length, fireWalls.length, traps.length, axiomZones.length, sylvaRainZones.length, hazardZones.length, bossStrikes.length, iceWalls.length].reduce((a, b) => a + b, 0) }));
    check(`${R}.clean_new_instance`, inst.lvl === 1 && !inst.ending && !inst.boss && !inst.bossActive && inst.lc === 0 && !inst.act && inst.frz === 0 && inst.alive && inst.kills === 0 && inst.revs.every(r => r === 0) && inst.colls === 0, inst);
    check(`${R}.new_builds_applied`, inst.champs.join() === expectChamps.join(), inst.champs);
    const gInst = await Promise.all(guests.map(c => ev(c, () => ({ lvl: runLevel, me: player.classKey, alive: player.alive, ended: netMatch.ended, over: state }))));
    check(`${R}.guests_in_new_instance`, gInst.every((g, k) => g.lvl === 1 && g.alive && !g.ended && g.over === 'playing' && g.me === expectChamps[k + 1]), gInst);
    const snap = await ev(A, () => netMatch.lastSnapBytes || 0);
    check(`${R}.snapshot_size_ok`, snap > 0 && snap < 60000, snap);
    // revivir sigue funcionando igual en cada reintento
    await gather(); await sleep(400);
    await down(1); await sleep(300);
    await hold(C, true); await sleep(1800); await hold(C, false); await sleep(300);
    check(`${R}.revive_still_works`, (await hostView())[1].alive);
  }
  const errs = all.map(c => c.errors);
  errs.forEach((e, i) => check(`errors.client${i}`, e.length === 0, e));
  console.log('SUMMARY ' + JSON.stringify({ rounds: ROUNDS, fails }));
  await browser.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
