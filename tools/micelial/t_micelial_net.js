// El Reino Micelial en cooperativo real (anfitrión autoritativo + invitados por el relay).
//   (python3 -m http.server 8771 &) ; (cd server && PORT=8799 node relay.js &) ; node tools/micelial/t_micelial_net.js <invitados 1|3> <outdir>
// Verifica: arena/hongos iguales en todos, núcleos vistos y su infección sufrida por el invitado, el
// Micelio armándose visto por todos, intervenciones de la Madre (7-9), la revelación del nivel 10,
// las 3 fases (oscuridad, floración, alucinaciones, corazón, infección), la muerte y la victoria.
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const fs = require('fs'), path = require('path');
const SITE = process.env.SITE || 'http://127.0.0.1:8771', RELAY = process.env.RELAY || 'ws://127.0.0.1:8799';
const NG = +(process.argv[2] || 1), OUT = process.argv[3] || '/tmp/mic_net'; fs.mkdirSync(OUT, { recursive: true });
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
    await p.evaluate(([c]) => { for (const k in save.champions) { save.champions[k].level = 30; save.champions[k].unlocked = true; } save.arenasCleared = { bosque: true, acuatica: true, fortaleza: true, micelial: false, hielo: false, laberinto: false, infernal: false }; selectedClass = c; }, [CH[i]]);
    return { p, errs, i };
  };
  const H = await mk(`${SITE}/index.html?server=${encodeURIComponent(RELAY)}`, 0);
  await H.p.evaluate(() => { document.getElementById('title-continue-btn').click(); currentArena = 'micelial'; setState('prep'); renderPrepSummary(); document.getElementById('net-create-btn').click(); });
  for (let k = 0; k < 50 && !(await H.p.evaluate(() => net.code)); k++) await sleep(100);
  const url = await H.p.evaluate(() => netInviteUrl());
  const all = [H];
  for (let i = 1; i <= NG; i++) { const g = await mk(url, i); await g.p.click('#title-join-btn'); for (let k = 0; k < 60 && !(await g.p.evaluate(() => state === 'prep')); k++) await sleep(100); all.push(g); }
  await H.p.evaluate(() => document.getElementById('prep-start-btn').click());
  await sleep(2500);
  const G = all.slice(1);
  for (const g of G) await g.p.evaluate(() => { window.__goal = null; setInterval(() => { if (!window.__goal || !player || !player.alive || state !== 'playing') { joyVec = {x:0, y:0}; return; } const t = window.__goal, dx = t.x - player.x, dy = t.y - player.y, l = Math.hypot(dx, dy); joyVec = l > 30 ? {x:dx/l, y:dy/l} : {x:0, y:0}; }, 60); });
  const goal = async (x, y) => { for (const g of G) await g.p.evaluate(([x, y]) => { window.__goal = x===null ? null : {x, y}; }, [x, y]); };
  await H.p.evaluate(() => { window.__calm = setInterval(() => { spawnTimer = 1e12; for (const h of heroes) { h.hp = Math.max(h.hp, h.maxHp * 0.7); } }, 40); });
  const gi = 1;
  const arena = await Promise.all(all.map(c => c.p.evaluate(() => ({ arena: currentArena, nodes: MIC_NODES.length, st: state, has: !!micS }))));
  check('NET.arena_en_todos', arena.every(a => a.arena === 'micelial' && a.nodes > 40 && a.st === 'playing' && a.has), arena);
  await sleep(3000);
  const ns = await Promise.all(all.map(c => c.p.evaluate(() => micS.nodes)));
  check('NET.hongos_iguales_en_todos', ns.every(s => s === ns[0] && s.length > 40), ns.map(s=>s.slice(0,20)));

  // ---- nivel 3: núcleo al lado del invitado (etapa 3) -> lo ve y queda ralentizado ----
  await H.p.evaluate(([gi]) => { runLevel = 3; beginLevel(); enemies.forEach(e => e.alive = false); const h = heroes[gi]; h.x = 500; h.y = 200; const n = micSpawnNucleo(560, 220, 3); n.nuc.rr = 200; }, [gi]);
  await goal(560, 220);
  await sleep(2500);
  const nucG = await G[0].p.evaluate(() => { const n = enemies.find(e => e.alive && e.type === 'nucleo_micelial'); return n ? { st: n.nuc && n.nuc.st, rr: Math.round(n.nuc.rr) } : null; });
  const slowH = await H.p.evaluate(([gi]) => +(heroes[gi].slowAmt||0).toFixed(2), [gi]);
  check('NET.invitado_ve_el_nucleo_y_lo_ralentiza', nucG && nucG.st >= 3 && slowH >= 0.2, { nucG, slowH });
  await G[0].p.screenshot({ path: path.join(OUT, 'net_guest_nucleo.png') });
  await H.p.evaluate(() => { for (const e of enemies) if (e.alive && e.type === 'nucleo_micelial') { e.hp = 1; damageEnemy(e, 50, {src: player}); } });
  await sleep(1500);
  const rec = await G[0].p.evaluate(() => ({ n: enemies.filter(e => e.alive && e.type === 'nucleo_micelial').length, recede: micS.recede.length }));
  check('NET.nucleo_destruido_y_la_infeccion_se_retira', rec.n === 0 && rec.recede >= 1, rec);

  // ---- nivel 6: el Micelio se arma delante de todos ----
  await H.p.evaluate(() => { runLevel = 6; beginLevel(); levelTimer = levelDuration * 0.31; });
  await sleep(2500);
  const mi = await Promise.all(G.map(g => g.p.evaluate(() => ({ st: micS.mi.st, e: enemies.some(e => e.type === 'micelio' && e.alive) }))));
  await sleep(4500);
  const mi2 = await Promise.all(G.map(g => g.p.evaluate(() => ({ st: micS.mi.st, card: document.querySelector('#arena-title-card .atc-title').textContent }))));
  check('NET.micelio_se_arma_en_los_invitados', mi.every(m => m.st === 'build' && m.e) && mi2.every(m => m.st === 'fight' && /MICELIO/.test(m.card)), { mi, mi2 });
  await G[0].p.screenshot({ path: path.join(OUT, 'net_guest_micelio.png') });
  await H.p.evaluate(() => { const m = enemies.find(e => e.type === 'micelio' && e.alive); m.hp = 1; damageEnemy(m, 50, {src: player}); });
  await sleep(3500);
  const sink = await G[0].p.evaluate(() => micS.mi.st);
  check('NET.micelio_colapsa_en_el_invitado', sink === 'sink' || sink === 'dead', sink);

  // ---- nivel 8: intervenciones de la Madre ----
  await H.p.evaluate(([gi]) => { runLevel = 8; beginLevel(); enemies.forEach(e => e.alive = false); micInterRoot(heroes[gi]); micInterArm(heroes[gi]); micInterGiant(heroes[gi]); }, [gi]);
  await sleep(1700);
  const inter = await G[0].p.evaluate(() => ({ roots: micS.roots.length, arms: micS.arms.length, giants: micS.giants.length }));
  check('NET.intervenciones_de_la_madre_en_el_invitado', inter.roots >= 1 && inter.arms >= 1 && inter.giants >= 1, inter);
  await G[0].p.screenshot({ path: path.join(OUT, 'net_guest_inter.png') });

  // ---- nivel 10: revelación, fases, muerte y victoria ----
  await H.p.evaluate(() => { runLevel = 10; beginLevel(); heroes.forEach((h, i) => { h.x = (i - 1.5) * 60; h.y = 260; }); micS.mo.t = MIC_STIR_MS - 1500; });
  await goal(0, 260);
  await sleep(4000);
  const rv = await Promise.all(G.map(g => g.p.evaluate(() => ({ st: micS.mo.st, m: enemies.some(e => e.type === 'madre_espora' && e.alive) }))));
  check('NET.revelacion_en_los_invitados', rv.every(r => r.st === 'reveal' && r.m), rv);
  await G[0].p.screenshot({ path: path.join(OUT, 'net_guest_reveal.png') });
  await sleep(9000);
  const f1 = await Promise.all(all.map(c => c.p.evaluate(() => ({ st: micS.mo.st, boss: !!(boss && boss.type === 'madre_espora'), card: document.querySelector('#arena-title-card .atc-title').textContent }))));
  check('NET.pelea_con_la_madre_en_todos', f1.every(f => f.st === 'fight' && f.boss), f1);
  await H.p.evaluate(() => { boss.hp = boss.maxHp * 0.58; });
  await sleep(1800);
  const dark = await Promise.all(G.map(g => g.p.evaluate(() => !!micS.mo.dark && micS.mo.ph === 2)));
  await sleep(2500);
  await H.p.evaluate(() => { boss.halCd = 0; boss.mcd = 0; });
  await sleep(1500);
  const p2 = await Promise.all(G.map(g => g.p.evaluate(() => ({ ph: micS.mo.ph, bloom: micS.mo.bloom, hal: micS.hal.length }))));
  check('NET.floracion_oscuridad_y_alucinaciones_en_los_invitados', dark.every(Boolean) && p2.every(p => p.ph === 2 && p.bloom && p.hal > 0), { dark, p2 });
  await G[0].p.screenshot({ path: path.join(OUT, 'net_guest_bloom.png') });
  await H.p.evaluate(() => { boss.hp = boss.maxHp * 0.28; });
  await sleep(5000);
  const p3 = await Promise.all(G.map(g => g.p.evaluate(() => ({ ph: micS.mo.ph, heart: micS.mo.heart, inf: +(micS.mo.inf||0).toFixed(3) }))));
  check('NET.corazon_e_infeccion_en_los_invitados', p3.every(p => p.ph === 3 && p.heart && p.inf > 0), p3);
  await G[0].p.screenshot({ path: path.join(OUT, 'net_guest_heart.png') });
  await H.p.evaluate(() => { clearInterval(window.__calm); const k = boss; k.hp = 1; damageEnemy(k, 99999, {src: player}); });
  await sleep(4000);
  const dy = await Promise.all(G.map(g => g.p.evaluate(() => ({ st: micS.mo.st, dead: micS.dead }))));
  check('NET.secuencia_de_muerte_en_los_invitados', dy.every(d => d.st === 'dying'), dy);
  await G[0].p.screenshot({ path: path.join(OUT, 'net_guest_dying.png') });
  await sleep(9500);
  const end = await Promise.all(all.map(c => c.p.evaluate(() => ({ st: state, dead: micS && micS.dead, cleared: !!(save.arenasCleared||{}).micelial }))));
  check('NET.victoria_y_reino_muerto_en_todos', end.every(e => e.st === 'victory' && e.dead && e.cleared), end);
  const errs = all.map(c => c.errs);
  check('NET.sin_errores', errs.every(e => e.length === 0), errs);
  await b.close();
  console.log(fails ? `${fails} FALLAS` : 'OK');
  process.exit(fails ? 1 : 0);
})();
