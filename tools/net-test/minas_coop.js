// LA HORDA — MINAS PROFUNDAS en cooperativo (2 clientes reales contra el relay):
//   - el invitado recibe el mismo sector y las mismas luces que el anfitrión
//   - el invitado REENCIENDE una luz con la acción contextual (la autoridad es del anfitrión)
//   - CASO D: Cerbero muere, el portal se abre, el INVITADO lo atraviesa -> victoria para los dos,
//     y el invitado también desbloquea la Arena Infernal en su guardado
//   - CASO E: los dos mantienen ATRAVESAR a la vez -> una sola finalización
// uso: node tools/net-test/minas_coop.js [carpeta_capturas]
//   requiere: python3 -m http.server 8771 (raíz) y PORT=8799 node server/relay.js
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const SITE = process.env.SITE || 'http://127.0.0.1:8771';
const RELAY = process.env.RELAY || 'ws://127.0.0.1:8799';
const OUT = process.argv[2];
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0;
const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 400) : '')); if (!ok) fails++; };
const PHONE = { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };
const DESK = { viewport: { width: 1000, height: 560 } };
async function client(browser, mobile, name, champ) {
  const ctx = await browser.newContext(Object.assign({}, mobile ? PHONE : DESK));
  await ctx.addInitScript(([n]) => { try { if (!localStorage.getItem('__s')) { localStorage.clear(); localStorage.setItem('__s', '1'); localStorage.setItem('horda_name', n); } } catch (e) {} }, [name]);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && /loop del juego/.test(m.text())) errors.push(m.text().slice(0, 200)); });
  await page.goto(`${SITE}/index.html?server=${encodeURIComponent(RELAY)}`);
  for (let k = 0; k < 300; k++) { if (await page.evaluate(() => { const b = document.getElementById('title-continue-btn'); return b && !b.disabled; })) break; await sleep(100); }
  await page.evaluate(([c]) => { for (const k in save.champions) save.champions[k].level = 30; save.champions[c].unlocked = true; save.starterChosen = true; save.tut = Object.assign(save.tut || {}, { training: 1 }); selectedClass = c; save.lastChamp = c;
    for (const a of ARENA_ORDER) if (a !== 'minas' && a !== 'infernal') save.arenasCleared[a] = true; save.arenasCleared.minas = false; save.arenasCleared.infernal = false; save.legacyOpenArenas = (save.legacyOpenArenas || []).filter(k => k !== 'infernal'); persistNow(); }, [champ]);
  return { ctx, page, errors, mobile, name };
}
const ev = (c, fn, a) => c.page.evaluate(fn, a);
async function press(c, sel) {
  await c.page.evaluate(s => { if (typeof prepSecReveal === 'function') prepSecReveal(s); }, sel).catch(() => {}); // pestaña de la Sala que lo contiene (js/ui/prep-sections.js)
  if (c.mobile) await c.page.tap(sel); else await c.page.click(sel); await sleep(450); }
async function startCoop(browser) {
  const A = await client(browser, false, 'Ana', 'guerrero');
  await press(A, '#title-continue-btn'); await press(A, '#mainmenu-jugar-btn'); await press(A, '#mode-arena-btn');
  await press(A, '.arena-card[data-arena="minas"]'); await press(A, '#start-btn');
  await press(A, '#net-create-btn');
  for (let k = 0; k < 60; k++) { if (await ev(A, () => !!net.code)) break; await sleep(100); }
  const code = await ev(A, () => net.code);
  const B = await client(browser, true, 'Beto', 'mago');
  await press(B, '#title-continue-btn'); await press(B, '#mainmenu-jugar-btn');
  await B.page.fill('#mode-join-code', code); await press(B, '#mode-join-btn');
  for (let k = 0; k < 60; k++) { if (await ev(B, () => net.role === 'guest' && state === 'prep')) break; await sleep(100); }
  await ev(B, () => { document.getElementById('net-ready-btn').click(); });
  await sleep(600);
  await ev(A, () => netHostStartGame());
  for (let k = 0; k < 80; k++) { if (await ev(B, () => state === 'playing') && await ev(A, () => state === 'playing')) break; await sleep(150); }
  await sleep(3000);
  await ev(A, () => { for (const h of heroes) h.invulnTimer = 1e9; });
  return { A, B, code };
}
// lleva la partida del anfitrión a Cerbero muerto y el portal abierto
async function toOpenPortal(A) {
  await ev(A, () => { runLevel = 10; levelTimer = 0; beginLevel(); });
  for (let k = 0; k < 60; k++) { await sleep(500); if (await ev(A, () => !!mnCerbEntity())) break; }
  await ev(A, () => { for (const h of heroes) h.invulnTimer = 1e9; const e = mnCerbEntity(); damageEnemy(e, 1e12, {}); });
  for (let k = 0; k < 50; k++) { await sleep(500); if (await ev(A, () => mnS.portal.st === 'open')) break; }
}
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  // ================= partida 1: estado, reencender, CASO D =================
  let { A, B, code } = await startCoop(browser);
  check('sala.creada_en_las_minas', /^[A-Z2-9]{6}$/.test(code || '') && await ev(A, () => currentArena === 'minas'), code);
  const lightsOf = c => ev(c, () => mnS && { sec: mnS.sec, n: mnS.lights.length, st: mnS.lights.map(L => L.st).join('') });
  const s0 = { host: await lightsOf(A), guest: await lightsOf(B) };
  check('red.invitado_mismo_sector_y_luces', s0.guest && s0.guest.sec === s0.host.sec && s0.guest.n === s0.host.n && s0.guest.st === s0.host.st, s0);
  // el invitado reenciende una luz apagada
  const gi = await ev(A, () => heroes.findIndex(h => h.isRemote));
  await ev(A, (gi) => { for (const e of enemies) e.alive = false; enemies = []; const g = heroes[gi]; const L = mnNearestLight(g.x, g.y); mnLightOff(L); g.x = L.x + 40; g.y = L.y + 20; window.__L = L.i; }, gi);
  await sleep(900);
  const Li = await ev(A, () => window.__L);
  const off = await ev(B, (i) => mnS.lights[i].st === 0 && !!mnS.ctx.find(t => t.kind === 'mn_light' && t.li === i), Li);
  const tgt = await ev(B, (i) => { const t = mnS.ctx.find(q => q.kind === 'mn_light' && q.li === i) || mnS.ctx.find(q => q.kind === 'mn_light'); return t ? t.id : null; }, Li);
  await ev(B, (id) => { const t = mnS.ctx.find(q => q.id === id); ctxSetHold(t); }, tgt);
  let relit = null;
  for (let k = 0; k < 20; k++) { await sleep(300); relit = { host: await ev(A, (i) => mnS.lights[i].st, Li), guest: await ev(B, (i) => mnS.lights[i].st, Li) }; if (relit.host > 0 && relit.guest > 0) break; }
  await ev(B, () => ctxSetHold(null));
  check('red.invitado_ve_la_luz_apagada', off, { Li, tgt });
  check('red.invitado_reenciende_autoridad_anfitrion', relit.host > 0 && relit.guest > 0, relit);
  // ---- CASO D ----
  check('D0.infernal_cerrada_antes_en_los_dos', !(await ev(A, () => isArenaUnlocked('infernal'))) && !(await ev(B, () => isArenaUnlocked('infernal'))));
  await toOpenPortal(A);
  const pOpen = { host: await ev(A, () => ({ st: mnS.portal.st, playing: state === 'playing', ending: runEnding })), guest: await ev(B, () => ({ st: mnS.portal.st, playing: state === 'playing', ctx: !!mnS.ctx.find(t => t.kind === 'mn_portal') })) };
  check('D.cerbero_muerto_no_termina_en_ninguno', pOpen.host.playing && !pOpen.host.ending && pOpen.guest.playing && pOpen.host.st === 'open' && pOpen.guest.st === 'open' && pOpen.guest.ctx, pOpen);
  // los bots en el portal no lo cruzan; el anfitrión lejos
  await ev(A, (gi) => { const G = MN_SECTORS[5].portal; for (const h of heroes) if (!h.isRemote && h !== player) { h.x = G.x + 20; h.y = G.y + 40; } player.x = G.x + 400; player.y = G.y + 400; heroes[gi].x = G.x; heroes[gi].y = G.y + 50; }, gi);
  await sleep(1200);
  check('D.bots_en_el_portal_no_terminan', await ev(A, () => state === 'playing' && mnS.portal.st === 'open'));
  const ptid = await ev(B, () => { const t = mnS.ctx.find(q => q.kind === 'mn_portal'); return t && t.id; });
  await ev(B, (id) => { ctxSetHold(mnS.ctx.find(q => q.id === id)); }, ptid);
  let dres = null;
  for (let k = 0; k < 30; k++) { await sleep(300); dres = { host: await ev(A, () => ({ st: mnS && mnS.portal.st, ending: runEnding, state })), guest: await ev(B, () => ({ state, ending: typeof runEnding !== 'undefined' && runEnding })) }; if (dres.host.st === 'used') break; }
  check('D.invitado_atraviesa_portal_usado', dres.host.st === 'used' && dres.host.ending, dres);
  let vic = null;
  for (let k = 0; k < 40; k++) { await sleep(400); vic = { host: await ev(A, () => ({ state, cleared: !!save.arenasCleared.minas, infernal: isArenaUnlocked('infernal') })), guest: await ev(B, () => ({ state, cleared: !!save.arenasCleared.minas, infernal: isArenaUnlocked('infernal') })) }; if (vic.host.state !== 'playing' && vic.guest.state !== 'playing' && vic.guest.cleared) break; }
  check('D.victoria_para_los_dos', vic.host.state !== 'playing' && vic.guest.state !== 'playing' && vic.host.cleared && vic.guest.cleared, vic);
  check('D.infernal_desbloqueada_en_los_dos', vic.host.infernal === true && vic.guest.infernal === true, vic);
  if (OUT) { await B.page.screenshot({ path: OUT + '/minas_D_invitado.png' }); await A.page.screenshot({ path: OUT + '/minas_D_anfitrion.png' }); }
  const errs1 = { A: A.errors.slice(0, 4), B: B.errors.slice(0, 4) };
  await A.ctx.close(); await B.ctx.close();
  // ================= partida 2: CASO E (simultáneo) =================
  ({ A, B } = await startCoop(browser));
  const gi2 = await ev(A, () => heroes.findIndex(h => h.isRemote));
  await toOpenPortal(A);
  await ev(A, (gi) => { const G = MN_SECTORS[5].portal; player.x = G.x - 30; player.y = G.y + 50; heroes[gi].x = G.x + 30; heroes[gi].y = G.y + 50; window.__exitCalls = 0; const f = completeArenaByExit; completeArenaByExit = function () { window.__exitCalls++; return f.apply(this, arguments); }; const v = finishBossVictory; window.__vict = 0; finishBossVictory = function () { window.__vict++; return v.apply(this, arguments); }; }, gi2);
  await sleep(500);
  const pid = await ev(B, () => { const t = mnS.ctx.find(q => q.kind === 'mn_portal'); return t && t.id; });
  await Promise.all([
    ev(B, (id) => { ctxSetHold(mnS.ctx.find(q => q.id === id)); }, pid),
    ev(A, () => { const t = mnS.ctx.find(q => q.kind === 'mn_portal'); player._ctxHold = t.id; })
  ]);
  for (let k = 0; k < 30; k++) { await sleep(300); if (await ev(A, () => mnS.portal.st === 'used')) break; }
  await sleep(2500);
  const eres = await ev(A, () => ({ st: mnS && mnS.portal.st, vict: window.__vict, calls: window.__exitCalls, again: completeArenaByExit() }));
  check('E.simultaneo_una_sola_finalizacion', eres.vict === 1 && eres.again === false, eres);
  check('sin_errores', !errs1.A.length && !errs1.B.length && !A.errors.length && !B.errors.length, { errs1, A: A.errors.slice(0, 4), B: B.errors.slice(0, 4) });
  console.log(fails ? `${fails} FALLAS` : 'OK');
  await browser.close();
  process.exit(fails ? 1 : 0);
})();
