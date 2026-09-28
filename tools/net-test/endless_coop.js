// LA HORDA — HORDA INFINITA en cooperativo (2 clientes reales contra el relay). El anfitrión decide
// rondas, arena y mutadores; el invitado recibe todo por el mismo canal de snapshots/eventos:
//   - entrada por el selector de modos -> guardián -> Sala online -> el invitado se une con código
//   - el invitado ve la misma ronda, puntaje y mutadores (HUD "Ronda N")
//   - refuerzo del invitado entre rondas (título de ronda) y la partida sigue para los dos
//   - ronda 5 con subjefe -> cofre para el invitado en SU guardado -> la Cicatriz cambia de arena en los dos
//   - rescate hecho por el INVITADO con la acción contextual (autoridad del anfitrión) -> oro para él
//   - team wipe -> pantalla de resultados y récord guardado en los dos -> "una más" del anfitrión arrastra al invitado
// uso: SITE=http://127.0.0.1:8808 RELAY=ws://127.0.0.1:8818 node tools/net-test/endless_coop.js [carpeta_capturas]
//   requiere: python3 -m http.server 8808 (raíz) y PORT=8818 node server/relay.js
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const SITE = process.env.SITE || 'http://127.0.0.1:8808';
const RELAY = process.env.RELAY || 'ws://127.0.0.1:8818';
const OUT = process.argv[2];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const AID_COLISEO = ['bosque', 'hielo', 'laberinto', 'acuatica', 'infernal']; // arenas con trazado al azar
let fails = 0;
const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 500) : '')); if (!ok) fails++; };
const PHONE = { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };
const DESK = { viewport: { width: 1000, height: 560 } };
async function client(browser, mobile, name, champ) {
  const ctx = await browser.newContext(Object.assign({}, mobile ? PHONE : DESK));
  await ctx.addInitScript(([n]) => { try { if (!localStorage.getItem('__s')) { localStorage.clear(); localStorage.setItem('__s', '1'); localStorage.setItem('horda_name', n); } } catch (e) {} }, [name]);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
  page.on('console', m => { if (m.type() === 'error' && /loop del juego|Error al/.test(m.text())) errors.push(m.text().slice(0, 200)); });
  await page.goto(`${SITE}/index.html?server=${encodeURIComponent(RELAY)}`, { waitUntil: 'load', timeout: 240000 });
  for (let k = 0; k < 600; k++) { if (await page.evaluate(() => { const b = document.getElementById('title-continue-btn'); return b && !b.disabled; })) break; await sleep(100); }
  await page.evaluate(([c]) => { for (const k in save.champions) save.champions[k].level = 20; save.champions[c].unlocked = true; save.starterChosen = true; selectedClass = c; save.lastChamp = c;
    save.arenasCleared.ciudad = true; save.arenasCleared.fortaleza = true; save.stash = []; persistNow(); }, [champ]);
  return { ctx, page, errors, mobile, name };
}
const ev = (c, fn, a) => c.page.evaluate(fn, a);
async function press(c, sel) {
  await c.page.evaluate(s => { if (typeof prepSecReveal === 'function') prepSecReveal(s); }, sel).catch(() => {}); // pestaña de la Sala que lo contiene (js/ui/prep-sections.js)
  if (c.mobile) await c.page.tap(sel); else await c.page.click(sel); await sleep(450); }
async function waitFor(c, fn, a, ms) { for (let k = 0; k < (ms || 20000)/150; k++) { if (await ev(c, fn, a)) return true; await sleep(150); } return false; }
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const A = await client(browser, false, 'Ana', 'guerrero');
  await press(A, '#title-continue-btn'); await press(A, '#mainmenu-jugar-btn');
  const card = await ev(A, () => { const c = document.getElementById('mode-endless-btn'); return c && !c.classList.contains('locked'); });
  check('selector.tarjeta_horda_infinita_abierta', card);
  await press(A, '#mode-endless-btn');
  await press(A, '#start-btn');
  const prep = await ev(A, () => ({ st: state, title: document.getElementById('lobby-title').textContent, box: document.getElementById('lobby-arena').textContent.slice(0, 120) }));
  check('sala.en_modo_infinito', prep.st === 'prep' && /Horda Infinita/.test(prep.title) && /HORDA INFINITA/.test(prep.box), prep);
  await press(A, '#net-create-btn');
  await waitFor(A, () => !!net.code);
  const code = await ev(A, () => net.code);
  const B = await client(browser, true, 'Beto', 'mago');
  await press(B, '#title-continue-btn'); await press(B, '#mainmenu-jugar-btn');
  await B.page.fill('#mode-join-code', code); await press(B, '#mode-join-btn');
  await waitFor(B, () => net.role === 'guest' && state === 'prep');
  await ev(B, () => { document.getElementById('net-ready-btn').click(); });
  await sleep(800);
  await ev(A, () => { document.getElementById('prep-start-btn').click(); });
  const both = await waitFor(A, () => state === 'playing') && await waitFor(B, () => state === 'playing', null, 60000);
  await sleep(2500);
  await ev(A, () => { for (const h of heroes) h.invulnTimer = 1e9; });
  const s0 = { host: await ev(A, () => ({ on: endlessActive, r: EN.round, mu: EN.mutators.join(), arena: currentArena, id: EN.id })),
               guest: await ev(B, () => { updateHUD(); return { on: endlessActive, r: EN.round, mu: EN.mutators.join(), arena: currentArena, id: EN.id, hud: (document.getElementById('hud-endless')||{}).textContent || '' }; }) };
  check('red.los_dos_juegan', both, s0);
  check('red.invitado_mismo_estado_infinito', s0.guest.on && s0.guest.r === 1 && s0.guest.mu === s0.host.mu && s0.guest.arena === s0.host.arena && s0.guest.id === s0.host.id && /Ronda\s*1/.test(s0.guest.hud), s0);

  // cierre de ronda -> refuerzos: el invitado elige el suyo y siguen los dos
  await ev(A, () => { levelTimer = levelDuration + 1; });
  const gBuff = await waitFor(B, () => state === 'buff' && /Ronda 1/.test(document.getElementById('buff-title').textContent));
  const hBuff = await waitFor(A, () => state === 'buff');
  await ev(A, () => { const c = document.querySelector('#buff-cards .buff-card'); if (c) c.click(); });
  await ev(B, () => { const c = document.querySelector('#buff-cards .buff-card'); if (c) c.click(); });
  const r2 = await waitFor(A, () => state === 'playing' && EN.round === 2) && await waitFor(B, () => state === 'playing' && EN.round === 2);
  check('red.refuerzo_del_invitado_y_ronda_2', gBuff && hBuff && r2, { gBuff, hBuff, r2 });

  // rescate: el anfitrión lo pone al lado del invitado; el invitado lo mantiene
  const gold0 = await ev(B, () => save.gold);
  await ev(A, () => { const g = heroes.find(h => h.isRemote); endlessRescues = []; EN.rescueSeq = 0; endlessSpawnRescue(); const t = endlessRescues[0]; t.x = Math.round(g.x + 10); t.y = Math.round(g.y); t.t = t.tmax = 60000; for (const e of enemies) { e.alive = false; } enemies = []; spawnTimer = 1e9; });
  const seen = await waitFor(B, () => endlessRescues.length > 0 && !!ctxNearest(player));
  await ev(B, () => { ctxSetHold(ctxNearest(player)); });
  const rescued = await waitFor(A, () => EN.rescues >= 1, null, 15000);
  await ev(B, () => ctxSetHold(null));
  await sleep(1200);
  const gold1 = await ev(B, () => save.gold);
  check('red.invitado_rescata_con_autoridad_del_anfitrion', seen && rescued && gold1 > gold0, { seen, rescued, gold0, gold1 });

  // hasta la ronda 5: subjefe -> cofre del invitado -> la Cicatriz cambia de arena en los dos
  const loot0 = await ev(B, () => (EN.local && EN.local.loot || []).length), gems0 = await ev(B, () => save.gems||0);
  const arena5 = await ev(A, () => currentArena);
  for (let step = 0; step < 400; step++) {
    const st = await ev(A, () => ({ r: EN.round, st: state }));
    if (st.r >= 6) break;
    await ev(A, () => { if (state === 'playing') { levelTimer = Math.max(levelTimer, levelDuration + 1); for (const e of enemies) if (e.alive && (e.rank === 'subjefe' || e.rank === 'jefe')) damageEnemy(e, 1e12, {src:player}); spawnTimer = Math.min(spawnTimer, 1e9); } else if (state === 'buff') { const c = document.querySelector('#buff-cards .buff-card'); if (c) c.click(); } });
    await ev(B, () => { if (state === 'buff') { const c = document.querySelector('#buff-cards .buff-card'); if (c) c.click(); } });
    await sleep(250);
  }
  const rot = await waitFor(B, (a) => state === 'playing' && EN.round === 6 && currentArena !== a, arena5, 30000);
  const s6 = { host: await ev(A, () => ({ r: EN.round, arena: currentArena, bk: EN.bossKills, lay: JSON.stringify(aidSolids.filter(x => x.lay)) })), guest: await ev(B, () => ({ r: EN.round, arena: currentArena, st: state, loot: (EN.local && EN.local.loot || []).length, gems: save.gems||0, n: heroes.length, lay: JSON.stringify(aidSolids.filter(x => x.lay)), on: !!netMatch.lay })) };
  // trazado al azar (js/arenas/arena-layouts.js): siempre en la Horda Infinita, idéntico en el invitado
  check('red.trazado_al_azar_igual_en_los_dos', s6.guest.on && s6.guest.lay === s6.host.lay && (!AID_COLISEO.includes(s6.host.arena) || s6.host.lay.length > 10), { arena: s6.host.arena, host: s6.host.lay.length, guest: s6.guest.lay.length, on: s6.guest.on });
  check('red.cicatriz_cambia_la_arena_en_los_dos', rot && s6.guest.arena === s6.host.arena && s6.host.arena !== arena5 && s6.guest.n === 4, { arena5, s6 });
  check('red.cofre_del_subjefe_para_el_invitado', s6.host.bk >= 1 && (s6.guest.loot > loot0 || s6.guest.gems > gems0), { loot0, gems0, s6 });
  if (OUT) { await B.page.screenshot({ path: OUT + '/endless_invitado.png' }); await A.page.screenshot({ path: OUT + '/endless_anfitrion.png' }); }

  // team wipe -> resultados en los dos, récord guardado
  await ev(A, () => { for (const h of heroes) { h.invulnTimer = 0; h.hp = 0; h.alive = false; } });
  const endA = await waitFor(A, () => state === 'endless', null, 20000), endB = await waitFor(B, () => state === 'endless', null, 20000);
  const res = { host: await ev(A, () => ({ runs: endlessSave().runs, best: endlessSave().best.score, sc: EN.score, again: !!document.getElementById('en-again-btn') })),
                guest: await ev(B, () => ({ runs: endlessSave().runs, best: endlessSave().best.score, sc: EN.score, again: !!document.getElementById('en-again-btn'), txt: document.getElementById('endless-screen').textContent.slice(0, 200) })) };
  check('red.resultados_en_los_dos', endA && endB && res.guest.sc === res.host.sc && res.host.sc > 0, res);
  check('red.record_guardado_en_los_dos', res.host.runs === 1 && res.guest.runs === 1 && res.guest.best === res.guest.sc, res);
  check('red.una_mas_solo_la_decide_el_anfitrion', res.host.again && !res.guest.again, res);
  if (OUT) { await B.page.screenshot({ path: OUT + '/endless_resultados_invitado.png' }); }

  // "una más": el anfitrión arrastra al invitado a otra partida infinita
  const id0 = await ev(A, () => EN.id);
  await ev(A, () => document.getElementById('en-again-btn').click());
  const again = await waitFor(A, () => state === 'playing') && await waitFor(B, (id) => state === 'playing' && endlessActive && EN.id !== id && EN.round === 1, id0, 60000);
  check('red.una_mas_arrastra_al_invitado', again, { again });
  await sleep(1500);
  check('sin_errores', !A.errors.length && !B.errors.length, { A: A.errors.slice(0, 4), B: B.errors.slice(0, 4) });
  console.log(fails ? `${fails} FALLAS` : 'OK');
  await browser.close();
  process.exit(fails ? 1 : 0);
})();
