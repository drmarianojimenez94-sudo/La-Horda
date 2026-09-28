// LA HORDA — DIFICULTAD Y SEMILLA EN COOPERATIVO (difficulty-tiers.js).
//   Anfitrión (campaña Normal terminada: Pesadilla abierta) + invitado (solo la Ciudad superada), cada uno con
//   su guardado y su WebSocket. El anfitrión elige PESADILLA en la Sala -> el invitado la ve (la elige el
//   anfitrión, con aviso de que no le cuenta) -> COMENZAR -> los dos juegan en Pesadilla con la MISMA semilla
//   -> victoria: al anfitrión le cuenta, al invitado no. Segunda partida en las Ruinas (Normal): las runas
//   de la variante por semilla son las mismas en los dos.
// uso: SITE=http://127.0.0.1:8823 RELAY=ws://127.0.0.1:8833 node tools/net-test/difficulty_net.js
//   (sitio: python3 -m http.server 8823 · relay: PORT=8833 node server/relay.js)
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const SITE = process.env.SITE || 'http://127.0.0.1:8823';
const RELAY = process.env.RELAY || 'ws://127.0.0.1:8833';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0;
const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 500) : '')); if (!ok) fails++; };
const PHONE = { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };
const ev = (c, fn, a) => c.page.evaluate(fn, a);
async function waitFor(c, fn, arg, ms = 10000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await ev(c, fn, arg)) return true; await sleep(100); } return false; }
async function waitAll(cs, fn, ms = 10000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { const r = await Promise.all(cs.map(c => ev(c, fn))); if (r.every(Boolean)) return true; await sleep(100); } return false; }
async function tap(c, sel) {
  await c.page.evaluate(s => { if (typeof prepSecReveal === 'function') prepSecReveal(s); }, sel).catch(() => {}); // pestaña de la Sala que lo contiene (js/ui/prep-sections.js)
  const el = await c.page.$(sel); if (!el) throw new Error('no existe ' + sel);
  await el.evaluate(e => e.scrollIntoView({ block: 'center', inline: 'center' })); await sleep(150);
  const b = await el.boundingBox(); if (!b) throw new Error('invisible ' + sel);
  await c.page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); await sleep(450);
}
async function client(browser, name, champ, cleared, url) {
  const ctx = await browser.newContext(PHONE);
  await ctx.addInitScript(([n]) => { try { if (!localStorage.getItem('__s')) { localStorage.clear(); localStorage.setItem('__s', '1'); localStorage.setItem('horda_name', n); } } catch (e) {} }, [name]);
  await ctx.addInitScript(() => { window.__autoConfirm = true; });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', d => d.accept());
  await page.goto(url || `${SITE}/index.html?server=${encodeURIComponent(RELAY)}`, { timeout: 120000 });
  const c = { ctx, page, errors, name };
  await waitFor(c, () => { const b = document.getElementById('title-continue-btn'); return !!b && !b.disabled && /Toca/.test(b.textContent); }, null, 60000);
  await ev(c, ([k, cl]) => {
    for (const q in save.champions) save.champions[q].level = 40;
    save.champions[k].unlocked = true; save.starterChosen = true; selectedClass = k; save.lastChamp = k;
    save.arenasCleared = {}; for (const a of cl) save.arenasCleared[a] = true;
    save.legacyOpenArenas = []; save.justUnlockedArena = null; save.defeatCount = 5; persistNow();
  }, [champ, cleared]);
  return c;
}
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const ALL = ['ciudad','fortaleza','bosque','micelial','hielo','acuatica','laberinto','abismo','minas','infernal'];
  const H = await client(browser, 'Ana', 'tanque', ALL);
  await tap(H, '#title-continue-btn'); await tap(H, '#mainmenu-jugar-btn'); await tap(H, '#mode-arena-btn');
  await tap(H, '.arena-card[data-arena="ciudad"]'); await tap(H, '#start-btn');
  await tap(H, '#net-create-btn');
  await waitFor(H, () => !!net.code);
  const url = await ev(H, () => netInviteUrl());
  const G = await client(browser, 'Beto', 'mago', ['ciudad'], url);
  await ev(G, () => document.getElementById('title-join-btn').click());
  await waitFor(G, () => net.role === 'guest' && state === 'prep', null, 20000);
  await waitFor(H, () => netHumanCount() === 2);
  // el anfitrión elige Pesadilla con el dedo, en la Sala
  const hp = await ev(H, () => [...document.querySelectorAll('#lobby-arena .diff-pick')].map(b => b.dataset.diff + (b.disabled ? ':locked' : '')));
  check('sala.anfitrion_ve_el_selector', hp.join() === 'normal,pesadilla,infierno:locked', hp);
  await tap(H, '#lobby-arena .diff-pick[data-diff="pesadilla"]');
  const gSees = await waitFor(G, () => netLobby.diff === 'pesadilla' && /PESADILLA/.test((document.querySelector('#lobby-arena .diff-row') || {}).textContent || ''), null, 8000);
  const gl = await ev(G, () => ({ diff: netLobby.diff, row: (document.querySelector('#lobby-arena .diff-row') || {}).textContent || '', warn: !!document.getElementById('diff-no-credit'), picks: document.querySelectorAll('#lobby-arena .diff-pick').length }));
  check('sala.invitado_ve_la_dificultad_del_anfitrion', gSees && /elige el anfitrión/.test(gl.row) && gl.picks === 0, gl);
  check('sala.invitado_avisado_sin_credito', gl.warn, gl);
  // COMENZAR
  await waitFor(H, () => typeof assetsAllReady !== 'function' || assetsAllReady(), null, 60000);
  await tap(H, '#prep-start-btn');
  const playing = await waitAll([H, G], () => state === 'playing' && currentArena === 'ciudad', 30000);
  const st = await Promise.all([H, G].map(c => ev(c, () => ({ role: netMatch && netMatch.role, diff: netMatch && netMatch.diff, cur: diffCurrent(), seed: runMapSeed(), pick: mapVariantPick('bos_runes', 2), lay: mapLayoutOn(), hud: (document.getElementById('hud-diff') || {}).textContent || '', tier: runDifficulty && runDifficulty.tier }))));
  check('partida.los_dos_en_pesadilla', playing && st.every(s => s.diff === 'pesadilla' && s.cur === 'pesadilla' && /PESADILLA/.test(s.hud)) && st[0].tier === 'pesadilla', st);
  check('partida.misma_semilla', st[0].seed && st[0].seed === st[1].seed && st[0].pick === st[1].pick, st);
  check('partida.trazado_al_azar_en_pesadilla_para_los_dos', st.every(s => s.lay), st.map(s => s.lay));
  // victoria: al anfitrión le cuenta Pesadilla, al invitado (sin Pesadilla abierta) no
  await ev(H, () => { enemies.length = 0; finishBossVictory(); });
  const vic = await waitAll([H, G], () => state === 'victory', 20000);
  const cl = await Promise.all([H, G].map(c => ev(c, () => ({ pes: !!save.diffCleared.pesadilla.ciudad, row: (document.getElementById('victory-body') || document.body).textContent.includes('Pesadilla') }))));
  check('victoria.credito_solo_a_quien_la_tenia', vic && cl[0].pes && !cl[1].pes, cl);
  check('victoria.resultados_dicen_la_dificultad', cl.every(x => x.row), cl);
  // segunda partida: Ruinas en Normal (arena con variante de runas por semilla)
  await ev(H, () => { victoryStep = VICTORY_STEPS.length - 1; renderVictoryStep(); });
  await tap(H, '#again-btn');
  await waitFor(H, () => state === 'prep', null, 15000);
  if (await ev(G, () => state === 'victory')) { await ev(G, () => { victoryStep = VICTORY_STEPS.length - 1; renderVictoryStep(); }); await tap(G, '#again-btn'); }
  await waitAll([H, G], () => state === 'prep', 15000);
  await sleep(600); await Promise.all([H, G].map(c => ev(c, () => { if (typeof campClose === 'function') campClose(true); }))); // el campamento (camp.js) se abre al volver a la Sala
  await ev(H, () => { diffSetSelected('normal'); pickLobbyArena('bosque'); renderPrepSummary(); netHostBroadcastCos(true); });
  await waitFor(G, () => currentArena === 'bosque' && netLobby.diff === 'normal', null, 8000);
  await tap(H, '#prep-start-btn');
  const p2 = await waitAll([H, G], () => state === 'playing' && currentArena === 'bosque' && BOS.runes && BOS.runes.length === 4, 30000);
  const rn = await Promise.all([H, G].map(c => ev(c, () => ({ seed: runMapSeed(), runes: BOS.runes.map(r => r.id + '@' + r.x + ',' + r.y).join(' '), diff: netMatch.diff, hud: !!document.getElementById('hud-diff'), lay: aidSolids.filter(x => x.lay).length + (mapLayoutOn() ? 100 : 0) }))));
  check('partida2.normal_sin_trazado_al_azar', rn.every(r => r.lay === 0), rn.map(r => r.lay));
  check('partida2.runas_iguales_en_los_dos', p2 && rn[0].runes === rn[1].runes && rn[0].seed === rn[1].seed, rn);
  check('partida2.normal_sin_etiqueta', rn.every(r => r.diff === 'normal' && !r.hud), rn);
  // tercera partida: la Gélida (el anillo de braseros gira según la semilla): mismos braseros en los dos
  await ev(H, () => { enemies.length = 0; finishBossVictory(); });
  await waitAll([H, G], () => state === 'victory', 20000);
  await ev(H, () => { victoryStep = VICTORY_STEPS.length - 1; renderVictoryStep(); });
  await tap(H, '#again-btn');
  await waitFor(H, () => state === 'prep', null, 15000);
  if (await ev(G, () => state === 'victory')) { await ev(G, () => { victoryStep = VICTORY_STEPS.length - 1; renderVictoryStep(); }); await tap(G, '#again-btn'); }
  await waitAll([H, G], () => state === 'prep', 15000);
  await sleep(600); await Promise.all([H, G].map(c => ev(c, () => { if (typeof campClose === 'function') campClose(true); }))); // el campamento (camp.js) se abre al volver a la Sala
  await ev(H, () => { pickLobbyArena('hielo'); renderPrepSummary(); });
  await waitFor(G, () => currentArena === 'hielo', null, 8000);
  await tap(H, '#prep-start-btn');
  const p3 = await waitAll([H, G], () => state === 'playing' && currentArena === 'hielo' && HIE.br && HIE.br.length === 4, 30000);
  const br = await Promise.all([H, G].map(c => ev(c, () => ({ seed: runMapSeed(), br: HIE.br.map(b => b.x + ',' + b.y).join(' ') }))));
  check('partida3.braseros_iguales_en_los_dos', p3 && br[0].br === br[1].br && br[0].seed === br[1].seed, br);
  check('sin_errores', H.errors.length === 0 && G.errors.length === 0, [H.errors.slice(0, 3), G.errors.slice(0, 3)]);
  await browser.close();
  console.log(fails ? `FALLAS: ${fails}` : 'OK');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
