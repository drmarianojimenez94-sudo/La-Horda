// LA HORDA — SIGUIENTE ARENA SIN SALIR DE LA SALA.
//   ONLINE: anfitrión + invitado (Chromium independientes, cada uno con su guardado y su WebSocket, en
//   celular apaisado) en una sala -> el anfitrión gana la arena -> los dos vuelven a la MISMA sala ->
//   la sala ya tiene elegida la próxima arena -> el anfitrión elige otra desde la Sala (el invitado la
//   ve al instante, con aviso si no le cuenta para la campaña) -> vuelve a la siguiente -> COMENZAR ->
//   los dos juegan la arena nueva.
//   CAMPAMENTO (camp.js): online, cada uno ve el suyo al volver a la Sala; solo, entre "Continuar" y la Sala.
//   SOLO: victoria -> "Continuar" -> la Sala con la próxima arena elegida (mismos bots) y se puede
//   cambiar ahí mismo.
//
// uso: node tools/net-test/next_arena.js
//   requiere el sitio (python3 -m http.server 8784 --bind 127.0.0.1, desde la raíz) y el relay
//   (PORT=8794 node server/relay.js). Variables: SITE (default http://127.0.0.1:8784), RELAY (ws://127.0.0.1:8794)
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const SITE = process.env.SITE || 'http://127.0.0.1:8784';
const RELAY = process.env.RELAY || 'ws://127.0.0.1:8794';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0;
const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 400) : '')); if (!ok) fails++; };
const PHONE = { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };
const ev = (c, fn, a) => c.page.evaluate(fn, a);
async function waitFor(c, fn, arg, ms = 10000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await ev(c, fn, arg)) return true; await sleep(100); } return false; }
async function waitAll(cs, fn, ms = 10000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { const r = await Promise.all(cs.map(c => ev(c, fn))); if (r.every(Boolean)) return true; await sleep(100); } return false; }
// toque real de celular (el elemento se centra antes, como lo haría el dedo al scrollear)
async function tap(c, sel) {
  const el = await c.page.$(sel); if (!el) throw new Error('no existe ' + sel);
  await el.evaluate(e => e.scrollIntoView({ block: 'center', inline: 'center' })); await sleep(150);
  const b = await el.boundingBox(); if (!b) throw new Error('invisible ' + sel);
  await c.page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); await sleep(450);
}

// cleared: arenas ya superadas en SU guardado (campaña real: solo la frontera siguiente está abierta)
async function client(browser, name, champ, cleared, url) {
  const ctx = await browser.newContext(PHONE);
  await ctx.addInitScript(([n]) => { try { if (!localStorage.getItem('__s')) { localStorage.clear(); localStorage.setItem('__s', '1'); localStorage.setItem('horda_name', n); } } catch (e) {} }, [name]);
  await ctx.addInitScript(() => { window.__autoConfirm = true; }); // diálogos propios (game-dialog.js): aceptar solos
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', d => d.accept());
  await page.goto(url || `${SITE}/index.html?server=${encodeURIComponent(RELAY)}`);
  const c = { ctx, page, errors, name };
  await waitFor(c, () => { const b = document.getElementById('title-continue-btn'); return !!b && !b.disabled && /Toca/.test(b.textContent); }, null, 40000);
  await ev(c, ([k, cl]) => {
    for (const q in save.champions) save.champions[q].level = 10;
    save.champions[k].unlocked = true; save.starterChosen = true; selectedClass = k; save.lastChamp = k;
    save.arenasCleared = {}; for (const a of cl) save.arenasCleared[a] = true;
    save.legacyOpenArenas = []; save.justUnlockedArena = null; persistNow();
  }, [champ, cleared]);
  return c;
}
const lobbyArena = (c) => ev(c, () => {
  const box = document.getElementById('lobby-arena'), sel = box.querySelector('.la-chip.sel'), card = box.querySelector('.la-card');
  const chips = [...box.querySelectorAll('.la-chip')];
  return { visible: !box.classList.contains('hidden') && box.offsetParent !== null, current: currentArena, sel: sel ? sel.dataset.lobbyArena : null,
    selText: sel ? sel.textContent.trim() : '', card: card ? card.dataset.laCurrent : null, cardText: card ? card.textContent.replace(/\s+/g, ' ').trim() : '',
    chips: chips.map(b => b.dataset.lobbyArena + (b.disabled ? ':locked' : '')), minChipH: chips.filter(b => !b.disabled).reduce((m, b) => Math.min(m, b.getBoundingClientRect().height), 999),
    warn: !!document.getElementById('la-no-credit'), hostWarn: (document.getElementById('la-guest-no-credit') || {}).textContent || '',
    title: document.getElementById('lobby-title').textContent };
});

async function online(browser) {
  // los dos tienen superada la Ciudad Maldita: la frontera es la Fábrica Sin Fin (02)
  const H = await client(browser, 'Ana', 'tanque', ['ciudad']);
  await tap(H, '#title-continue-btn'); await tap(H, '#mainmenu-jugar-btn'); await tap(H, '#mode-arena-btn');
  await tap(H, '.arena-card[data-arena="fortaleza"]'); await tap(H, '#start-btn');
  let la = await lobbyArena(H);
  check('online.sala_muestra_arena_elegible', la.visible && la.sel === 'fortaleza' && la.chips.join() === 'ciudad,fortaleza,bosque:locked', la);
  await tap(H, '#net-create-btn');
  await waitFor(H, () => !!net.code);
  const code = await ev(H, () => net.code), url = await ev(H, () => netInviteUrl());
  const G = await client(browser, 'Beto', 'mago', ['ciudad'], url);
  await ev(G, () => document.getElementById('title-join-btn').click());
  await waitFor(G, () => net.role === 'guest' && state === 'prep');
  await waitFor(H, () => netHumanCount() === 2);
  la = await lobbyArena(G);
  check('online.invitado_ve_arena_del_anfitrion', la.card === 'fortaleza' && /02 — Fábrica Sin Fin/.test(la.cardText) && !la.warn && la.chips.length === 0, la);
  // COMENZAR (el invitado no marcó LISTO: el diálogo se acepta solo)
  await waitFor(H, () => typeof assetsAllReady !== 'function' || assetsAllReady(), null, 40000);
  await tap(H, '#prep-start-btn');
  check('online.los_dos_juegan_fortaleza', await waitAll([H, G], () => state === 'playing' && currentArena === 'fortaleza', 20000),
    await Promise.all([H, G].map(c => ev(c, () => ({ state, arena: currentArena })))));
  // victoria forzada por el anfitrión (el cierre real: arena superada, desbloqueos, pantalla final)
  await ev(H, () => { enemies.length = 0; finishBossVictory(); });
  const vicOk = await waitAll([H, G], () => state === 'victory', 15000);
  const cl = await Promise.all([H, G].map(c => ev(c, () => ({ state, fortaleza: !!save.arenasCleared.fortaleza, bosqueOpen: isArenaUnlocked('bosque') }))));
  check('online.victoria_los_dos_acreditados', vicOk && cl.every(x => x.state === 'victory' && x.fortaleza && x.bosqueOpen), cl);
  for (const c of [H, G]) await ev(c, () => { victoryStep = VICTORY_STEPS.length - 1; renderVictoryStep(); });
  const notes = await Promise.all([H, G].map(c => ev(c, () => ({ note: (document.getElementById('vic-next-note') || {}).textContent || '', back: document.getElementById('again-btn').textContent, nextHidden: document.getElementById('victory-next-btn').classList.contains('hidden') }))));
  check('online.resultados_anuncian_proxima_arena', /Ruinas Célticas/.test(notes[0].note) && /anfitrión elige/.test(notes[1].note) && notes.every(n => /VOLVER AL LOBBY/.test(n.back) && n.nextHidden), notes);
  // VOLVER AL LOBBY: la misma sala, con la próxima arena ya elegida
  await tap(H, '#again-btn');
  await waitFor(H, () => state === 'prep');
  if (await ev(G, () => state === 'victory')) await tap(G, '#again-btn'); // (si no volvió solo)
  await waitAll([H, G], () => state === 'prep' && currentArena === 'bosque');
  // EL CAMPAMENTO (camp.js): cada uno ve el suyo, local, recién al volver a la Sala (no frenó la vuelta)
  const camps = await Promise.all([H, G].map(c => ev(c, () => { const el = document.getElementById('camp');
    return { open: !!el && !el.classList.contains('hidden'), state, who: el ? el.querySelector('.camp-box-who').textContent : '', hero: typeof CAMP !== 'undefined' && CAMP.ctx ? CAMP.ctx.classKey : null }; })));
  check('online.campamento_local_al_volver_a_la_sala', camps.every(x => x.open && x.state === 'prep' && /HECHICERO/.test(x.who)) && camps[0].hero === 'tanque' && camps[1].hero === 'mago', camps);
  for (const c of [H, G]) await tap(c, '#camp .camp-go'); // "Seguir": un toque
  check('online.campamento_se_cierra_con_seguir', (await Promise.all([H, G].map(c => ev(c, () => document.getElementById('camp').classList.contains('hidden'))))).every(Boolean));
  const hb =await ev(H, () => ({ state, code: net.code, match: !!netMatch, room: net.room.state, roomArena: net.room.arena, humans: netHumanCount(), start: document.getElementById('prep-start-btn').textContent }));
  la = await lobbyArena(H);
  check('online.anfitrion_vuelve_misma_sala', hb.state === 'prep' && hb.code === code && !hb.match && hb.room === 'lobby' && hb.humans === 2, hb);
  check('online.proxima_arena_preseleccionada', la.sel === 'bosque' && /SIGUIENTE/.test(la.selText) && hb.roomArena === 'bosque' && /Ruinas Célticas/.test(la.title) && /Comenzar · Ruinas/.test(hb.start), { la, hb });
  check('online.selector_tactil_40px', la.minChipH >= 40, la.minChipH);
  la = await lobbyArena(G);
  const gb = await ev(G, () => ({ state, code: net.code, role: net.role }));
  check('online.invitado_sigue_en_la_sala_con_la_arena_nueva', gb.state === 'prep' && gb.code === code && gb.role === 'guest' && la.card === 'bosque' && /03 — Ruinas Célticas/.test(la.cardText) && !la.warn, { gb, la });
  // el anfitrión (que ya superó más arenas) elige una que el invitado NO tiene abierta: aviso a los dos
  await ev(H, () => { save.arenasCleared.bosque = true; renderPrepSummary(); });
  await tap(H, '[data-lobby-arena="micelial"]');
  await waitFor(G, () => currentArena === 'micelial');
  await sleep(400);
  la = await lobbyArena(G);
  const gToast = await ev(G, () => (document.getElementById('net-toast') || {}).textContent || '');
  check('online.invitado_ve_el_cambio_en_vivo', la.card === 'micelial' && /Reino Fúngico/.test(la.cardText) && /eligió la arena 04 — Reino Fúngico/.test(gToast), { la, gToast });
  check('online.invitado_avisado_sin_credito', la.warn, la);
  await waitFor(H, () => !!document.getElementById('la-guest-no-credit'), null, 4000);
  la = await lobbyArena(H);
  check('online.anfitrion_ve_quien_no_suma_campania', /Beto/.test(la.hostWarn) && /no le cuenta para su campaña/.test(la.hostWarn), la.hostWarn);
  // vuelve a la siguiente (la que el invitado sí tiene): el aviso desaparece
  await tap(H, '[data-lobby-arena="bosque"]');
  await waitFor(G, () => currentArena === 'bosque');
  await sleep(400);
  la = await lobbyArena(G);
  check('online.invitado_sin_aviso_en_arena_propia', la.card === 'bosque' && !la.warn, la);
  check('online.comenzar_visible_sin_scrollear', await ev(H, () => { const r = document.getElementById('prep-start-btn').getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight + 1; }));
  // COMENZAR: los dos juegan la arena nueva
  await waitFor(H, () => typeof assetsAllReady !== 'function' || assetsAllReady(), null, 40000);
  await tap(H, '#prep-start-btn');
  const okNew = await waitAll([H, G], () => state === 'playing' && currentArena === 'bosque' && !!netMatch && netMatch.arena === 'bosque', 20000);
  const st = await Promise.all([H, G].map(c => ev(c, () => ({ state, arena: currentArena, match: netMatch && netMatch.arena, role: netMatch && netMatch.role, lvl: runLevel }))));
  check('online.los_dos_juegan_la_arena_nueva', okNew && st.every(s => s.lvl === 1), st);
  for (const c of [H, G]) check(`online.errores_${c.name}`, c.errors.length === 0, c.errors.slice(0, 3));
  await H.ctx.close(); await G.ctx.close();
}

async function solo(browser) {
  const S = await client(browser, 'Caro', 'soporte', []); // guardado nuevo: solo la Ciudad Maldita
  await tap(S, '#title-continue-btn'); await tap(S, '#mainmenu-jugar-btn'); await tap(S, '#mode-arena-btn');
  await tap(S, '.arena-card[data-arena="ciudad"]'); await tap(S, '#start-btn');
  let la = await lobbyArena(S);
  check('solo.sala_arena_actual', la.sel === 'ciudad' && la.chips.join() === 'ciudad,fortaleza:locked', la);
  const allies0 = await ev(S, () => (lobbyAllies || []).slice());
  await waitFor(S, () => typeof assetsAllReady !== 'function' || assetsAllReady(), null, 40000);
  await tap(S, '#prep-start-btn');
  // el Hechicero presenta la arena (run-intro.js)
  for (let i = 0; i < 10; i++) {
    const r = await ev(S, () => ({ open: !document.getElementById('run-intro').classList.contains('hidden'), dis: (document.querySelector('.ri-go') || {}).disabled }));
    if (!r.open) break;
    if (!r.dis) await ev(S, () => document.querySelector('.ri-go').click());
    await sleep(700);
  }
  check('solo.juega_ciudad', await waitFor(S, () => state === 'playing' && currentArena === 'ciudad', 15000));
  await ev(S, () => { enemies.length = 0; finishBossVictory(); });
  check('solo.victoria', await waitFor(S, () => state === 'victory', 15000));
  await ev(S, () => { victoryStep = VICTORY_STEPS.length - 1; renderVictoryStep(); });
  const v = await ev(S, () => { const b = document.getElementById('victory-next-btn'), r = b.getBoundingClientRect();
    return { next: b.textContent, hidden: b.classList.contains('hidden'), inView: r.top >= 0 && r.bottom <= innerHeight + 1, again: document.getElementById('again-btn').textContent,
      note: (document.getElementById('vic-next-note') || {}).textContent || '' }; });
  check('solo.continuar_ofrece_siguiente_arena', !v.hidden && v.inView && /Continuar ▶ 02 — Fábrica Sin Fin/.test(v.next) && /Repetir/.test(v.again) && /Fábrica Sin Fin/.test(v.note), v);
  await tap(S, '#victory-next-btn');
  // EL CAMPAMENTO (camp.js): entre la victoria y la Sala; "Seguir" en un toque
  const camp = await ev(S, () => { const el = document.getElementById('camp'); return { open: !!el && !el.classList.contains('hidden'), state }; });
  check('solo.campamento_antes_de_la_sala', camp.open && camp.state === 'victory', camp);
  if (camp.open) await tap(S, '#camp .camp-go');
  la = await lobbyArena(S);
  const allies1 = await ev(S, () => ({ state, allies: (lobbyAllies || []).slice(), sel: selectedClass }));
  check('solo.sala_con_la_siguiente_elegida', allies1.state === 'prep' && la.sel === 'fortaleza' && /SIGUIENTE/.test(la.selText) && /Fábrica Sin Fin/.test(la.title), { la, allies1 });
  check('solo.mismos_bots_y_guardian', JSON.stringify(allies1.allies) === JSON.stringify(allies0) && allies1.sel === 'soporte', { allies0, allies1 });
  // cambiarla ahí mismo (y volver)
  await tap(S, '[data-lobby-arena="ciudad"]');
  la = await lobbyArena(S);
  check('solo.cambiar_arena_en_la_sala', la.current === 'ciudad' && la.sel === 'ciudad' && /Ciudad Maldita/.test(la.title), la);
  await tap(S, '[data-lobby-arena="fortaleza"]');
  await tap(S, '#prep-start-btn');
  const intro = await ev(S, () => ({ open: !document.getElementById('run-intro').classList.contains('hidden'), arena: currentArena }));
  check('solo.comenzar_entra_a_la_siguiente', intro.arena === 'fortaleza' && (intro.open || state === 'playing'), intro);
  check('solo.errores', S.errors.length === 0, S.errors.slice(0, 3));
  await S.ctx.close();
}

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  try { await online(browser); } catch (e) { check('online.exception', false, e.message); }
  try { await solo(browser); } catch (e) { check('solo.exception', false, e.message); }
  console.log('SUMMARY', JSON.stringify({ fails }));
  await browser.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.log('FAIL exception', e.stack); process.exit(1); });
