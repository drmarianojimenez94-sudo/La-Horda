// La Fortaleza en cooperativo real (anfitrión autoritativo + invitados por el relay).
//   (python3 -m http.server 8771 &) ; (cd server && PORT=8799 node relay.js &) ; node tools/fortaleza/t_fortaleza_net.js <invitados 1|3> <outdir>
// Verifica: arena y mapa en todos, giratorio sincronizado (y el invitado que va ENCIMA se mueve con él),
// trampas vistas y sufridas por el invitado, entrada del Dragón vista por el invitado, puerta del
// Caballero que espera a los invitados, fases vistas por todos y victoria para todos.
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const fs = require('fs'), path = require('path');
const SITE = process.env.SITE || 'http://127.0.0.1:8771', RELAY = process.env.RELAY || 'ws://127.0.0.1:8799';
const NG = +(process.argv[2] || 1), OUT = process.argv[3] || '/tmp/fort_net'; fs.mkdirSync(OUT, { recursive: true });
const CH = ['guerrero', 'tanque', 'mago', 'soporte'];
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 400) : '')); if (!ok) fails++; };
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] });
  const mk = async (url, i) => {
    const ctx = await b.newContext({ viewport: { width: 844, height: 390 } });
    await ctx.addInitScript(([n]) => { try { if (!localStorage.getItem('__s')) { localStorage.clear(); localStorage.setItem('__s', '1'); localStorage.setItem('horda_name', n); } } catch (e) {} }, ['J' + (i + 1)]);
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
    p.on('console', m => { if (m.type() === 'error' && !/ERR_CERT|fonts\.g|net::|WebSocket/.test(m.text())) errs.push('console: ' + m.text().slice(0, 200)); });
    await p.goto(url);
    for (let k = 0; k < 300; k++) { if (await p.evaluate(() => { const x = document.getElementById('title-continue-btn'); return x && !x.disabled; })) break; await sleep(100); }
    await p.evaluate(([c]) => { for (const k in save.champions) { save.champions[k].level = 30; save.champions[k].unlocked = true; } save.arenasCleared = { bosque: true, acuatica: true, fortaleza: false, hielo: true, laberinto: true, infernal: true }; selectedClass = c; }, [CH[i]]);
    return { p, errs, i };
  };
  const H = await mk(`${SITE}/index.html?server=${encodeURIComponent(RELAY)}`, 0);
  await H.p.evaluate(() => { document.getElementById('title-continue-btn').click(); currentArena = 'fortaleza'; setState('prep'); renderPrepSummary(); document.getElementById('net-create-btn').click(); });
  for (let k = 0; k < 50 && !(await H.p.evaluate(() => net.code)); k++) await sleep(100);
  const url = await H.p.evaluate(() => netInviteUrl());
  const all = [H];
  for (let i = 1; i <= NG; i++) { const g = await mk(url, i); await g.p.click('#title-join-btn'); for (let k = 0; k < 60 && !(await g.p.evaluate(() => state === 'prep')); k++) await sleep(100); all.push(g); }
  await H.p.evaluate(() => document.getElementById('prep-start-btn').click());
  await sleep(2500);
  const G = all.slice(1);
  // piloto de los invitados: caminan hacia window.__goal (esperan en el borde si un puente los separa)
  for (const g of G) await g.p.evaluate(() => { window.__goal = null; setInterval(() => { if (!window.__goal || !player || !player.alive || state !== 'playing') { joyVec = {x:0, y:0}; return; } let t = window.__goal; if (fortS && !fortReachable(player, t)) { const r = fortBotRegroup(player, t); if (r) t = r; } const dx = t.x - player.x, dy = t.y - player.y, l = Math.hypot(dx, dy); joyVec = l > 30 ? {x:dx/l, y:dy/l} : {x:0, y:0}; }, 60); });
  const goal = async (x, y) => { for (const g of G) await g.p.evaluate(([x, y]) => { window.__goal = {x, y}; }, [x, y]); };
  // anfitrión: equipo invulnerable (esto prueba la sincronización, no el balance) y sin oleadas
  await H.p.evaluate(() => { window.__calm = setInterval(() => { spawnTimer = 1e12; for (const h of heroes) { h.hp = Math.max(h.hp, h.maxHp * 0.7); } }, 40); });
  const arena = await Promise.all(all.map(c => c.p.evaluate(() => ({ arena: currentArena, shapes: fortShapes.length, me: player && player.classKey, st: state }))));
  check('NET.arena_y_mapa_en_todos', arena.every(a => a.arena === 'fortaleza' && a.shapes > 15 && a.st === 'playing'), arena);

  // ---- nivel 5: giratorio sincronizado, invitado encima del puente ----
  await H.p.evaluate(() => { runLevel = 5; beginLevel(); enemies.forEach(e => e.alive = false); for (const id in fortS.gates) if (fortS.gates[id].want) fortS.gates[id].open = 1; fortRebuildShapes();
    const hb = fortS.rot.hub; hb.ang = Math.PI/2; hb.idx = 0; hb.phase = 'hold'; hb.t = 0; hb.hold = 4000; fortRebuildShapes();
    heroes.forEach((h, i) => { h.x = (i - 1.5) * 20; h.y = 377 - 380; h._fs = null; }); });
  await goal(0, 377 - 380);
  await sleep(1500);
  for (const g of G) await g.p.evaluate(() => { window.__goal = null; }); // quietos ENCIMA del brazo mientras gira
  const pre = await Promise.all(all.map(c => c.p.evaluate(() => ({ ang: +fortS.rot.hub.ang.toFixed(2), y: Math.round(player.y), walk: fortWalkable(player.x, player.y, -3) }))));
  await sleep(9500); // aviso + giro
  const post = await Promise.all(all.map(c => c.p.evaluate(() => ({ ang: +fortS.rot.hub.ang.toFixed(2), ph: fortS.rot.hub.phase, x: Math.round(player.x), y: Math.round(player.y), walk: fortWalkable(player.x, player.y, -3), sig: fortGeomSig().length }))));
  check('NET.giratorio_mismo_angulo_en_todos', post.every(p => Math.abs(p.ang - post[0].ang) < 0.05) && Math.abs(post[0].ang) < 0.05, post);
  check('NET.invitado_encima_del_puente_se_mueve_con_el', G.every((g, k) => post[k + 1].walk && Math.abs(post[k + 1].x) > 200), { pre, post });
  await G[0].p.screenshot({ path: path.join(OUT, 'net_guest_bridge.png') });

  // ---- trampa al lado del invitado: la ve avisar y la sufre ----
  const gi = 1; // índice del héroe del primer invitado
  await H.p.evaluate(([gi]) => { const T = FORT_MAP.traps.findIndex(t => t.id === 't_br2'); const h = heroes[gi]; h.x = -810; h.y = 380; h._fs = null; h.hp = h.maxHp; clearInterval(window.__calm); window.__trapHp0 = h.hp; fortS.traps[T].st = 0; _fortTrapStart(T); }, [gi]);
  await goal(-810, 380);
  await sleep(700);
  const tg = await G[0].p.evaluate(() => { const T = FORT_MAP.traps.findIndex(t => t.id === 't_br2'); return { st: fortS.traps[T].st, tele: vfxTeles.some(s => s.on) }; });
  await sleep(2400);
  const hurt = await H.p.evaluate(([gi]) => ({ hp: Math.round(heroes[gi].hp), hp0: Math.round(window.__trapHp0) }), [gi]);
  check('NET.invitado_ve_la_trampa_avisar_y_la_sufre', tg.st === 1 && tg.tele && hurt.hp < hurt.hp0, { tg, hurt });
  await H.p.evaluate(() => { window.__calm = setInterval(() => { spawnTimer = 1e12; for (const h of heroes) { h.hp = Math.max(h.hp, h.maxHp * 0.7); } }, 40); });

  // ---- nivel 6: el Dragón irrumpe (lo ven los invitados) ----
  await H.p.evaluate(() => { runLevel = 6; beginLevel(); for (const id in fortS.gates) if (fortS.gates[id].want) fortS.gates[id].open = 1; fortS.lift.db_forge.down = 1; fortRebuildShapes(); heroes.forEach((h, i) => { h.x = (i - 1.5) * 40; h.y = -1000; h._fs = null; }); levelTimer = levelDuration * 0.31; });
  await goal(0, -1000);
  await sleep(4000);
  const dr = await Promise.all(G.map(g => g.p.evaluate(() => ({ dragon: enemies.some(e => e.type === 'dragon_forja' && e.alive), card: document.querySelector('#arena-title-card .atc-title').textContent, hud: !document.getElementById('boss-hud').classList.contains('hidden'), furnace: fortS.furnaceBroken }))));
  check('NET.invitados_ven_al_dragon_y_su_cartel', dr.every(d => d.dragon && /DRAG/.test(d.card) && d.hud && d.furnace === 1), dr);
  await G[0].p.screenshot({ path: path.join(OUT, 'net_guest_dragon.png') });
  await H.p.evaluate(() => { const d = enemies.find(e => e.type === 'dragon_forja'); if (d) { d.hp = 1; damageEnemy(d, 50, {src: player}); if (d.hp <= 0 && d.alive) killEnemy(d); } });
  await sleep(2500);
  const gateG = await G[0].p.evaluate(() => fortS.gates.g_blast.open);
  check('NET.muerte_del_dragon_abre_la_compuerta_en_el_invitado', gateG >= 0.6, gateG);

  // ---- nivel 10: la puerta espera a los invitados, se cierra, fases, victoria ----
  await H.p.evaluate(() => { runLevel = 10; beginLevel(); for (const id in fortS.gates) if (fortS.gates[id].want) fortS.gates[id].open = 1; fortRebuildShapes(); heroes.forEach((h, i) => { h.x = (i - 1.5) * 40; h.y = -3300; h._fs = null; }); player.x = 0; player.y = -3800; for (const a of allies) if (!a.isRemote) { a.x = 30; a.y = -3780; } });
  await goal(0, -3300);
  await sleep(2500);
  const waiting = await H.p.evaluate(() => fortS.knight.state);
  await goal(0, -3780);
  await sleep(9000);
  const kn = await Promise.all(all.map(c => c.p.evaluate(() => ({ st: fortS.knight.state, gate: fortS.gates.g_knight.open, y: Math.round(player.y), boss: !!(boss && boss.type === 'caballero'), card: document.querySelector('#arena-title-card .atc-title').textContent }))));
  check('NET.puerta_espera_a_los_invitados', waiting === 'waiting', waiting);
  check('NET.puerta_cerrada_y_jefe_en_todos', kn.every(k => k.gate === 0 && k.st === 'fight' && k.y < -3540), kn);
  await G[0].p.screenshot({ path: path.join(OUT, 'net_guest_knight.png') });
  await H.p.evaluate(() => { boss.hp = boss.maxHp * 0.6; });
  await sleep(3500);
  const p2 = await Promise.all(G.map(g => g.p.evaluate(() => fortS.knight.phase)));
  await H.p.evaluate(() => { boss.hp = boss.maxHp * 0.25; });
  await sleep(3500);
  const p3 = await Promise.all(G.map(g => g.p.evaluate(() => ({ ph: fortS.knight.phase, chains: fortS.knight.chains }))));
  check('NET.fases_del_caballero_en_los_invitados', p2.every(x => x === 2) && p3.every(x => x.ph === 3 && x.chains), { p2, p3 });
  await G[0].p.screenshot({ path: path.join(OUT, 'net_guest_knight_p3.png') });
  await H.p.evaluate(() => { const k = boss; k.fortTrans = null; k.dmgTakenMult = 1; k.hp = 1; damageEnemy(k, 99, {src: player}); if (k.hp <= 0 && k.alive) killEnemy(k); });
  await sleep(4000);
  const end = await Promise.all(all.map(c => c.p.evaluate(() => ({ st: state, cleared: !!(save.arenasCleared||{}).fortaleza }))));
  check('NET.victoria_en_todos', end.every(e => e.st === 'victory'), end);
  const errs = all.map(c => c.errs);
  check('NET.sin_errores', errs.every(e => e.length === 0), errs);
  await b.close();
  console.log(fails ? `${fails} FALLAS` : 'OK');
  process.exit(fails ? 1 : 0);
})();
