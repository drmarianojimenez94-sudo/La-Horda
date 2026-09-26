// Mecánicas de identidad (ARENA_EXT) + acción contextual en cooperativo real (anfitrión + invitados por el relay).
//   (python3 -m http.server 8771 &) ; (cd server && PORT=8799 node relay.js &) ; node tools/identity/t_identity_net.js <invitados 1|3> <outdir>
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const fs = require('fs'), path = require('path');
const SITE = process.env.SITE || 'http://127.0.0.1:8771', RELAY = process.env.RELAY || 'ws://127.0.0.1:8799';
const NG = +(process.argv[2] || 1), OUT = process.argv[3] || '/tmp/id_net'; fs.mkdirSync(OUT, { recursive: true });
const ARENAS = (process.env.ARENAS || 'infernal').split(',');
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
    await p.evaluate(([c]) => { for (const k in save.champions) { save.champions[k].level = 30; save.champions[k].unlocked = true; } selectedClass = c; }, [CH[i]]);
    return { p, errs, i };
  };
  const all = [];
  for (const ARENA of ARENAS) {
  const H = all[0] || await mk(`${SITE}/index.html?server=${encodeURIComponent(RELAY)}`, 0);
  if (!all.length) {
    await H.p.evaluate(([a]) => { document.getElementById('title-continue-btn').click(); currentArena = a; setState('prep'); renderPrepSummary(); document.getElementById('net-create-btn').click(); }, [ARENA]);
    for (let k = 0; k < 50 && !(await H.p.evaluate(() => net.code)); k++) await sleep(100);
    const url = await H.p.evaluate(() => netInviteUrl());
    all.push(H);
    for (let i = 1; i <= NG; i++) { const g = await mk(url, i); await g.p.click('#title-join-btn'); for (let k = 0; k < 60 && !(await g.p.evaluate(() => state === 'prep')); k++) await sleep(100); all.push(g); }
  }
  await H.p.evaluate(() => document.getElementById('prep-start-btn').click());
  await sleep(2500);
  const G = all.slice(1);
  for (const g of G) await g.p.evaluate(() => { if (window.__gi) return; window.__gi = 1; window.__goal = null; setInterval(() => { if (!window.__goal || !player || !player.alive || state !== 'playing') { joyVec = {x:0, y:0}; return; } const t = window.__goal, dx = t.x - player.x, dy = t.y - player.y, l = Math.hypot(dx, dy); joyVec = l > 18 ? {x:dx/l, y:dy/l} : {x:0, y:0}; }, 60); });
  const goal = async (x, y) => { for (const g of G) await g.p.evaluate(([x, y]) => { window.__goal = x===null ? null : {x, y}; }, [x, y]); };
  await H.p.evaluate(() => { clearInterval(window.__calm); window.__calm = setInterval(() => { spawnTimer = 1e12; levelDuration = 9e9; for (const h of heroes) { h.hp = Math.max(h.hp, h.maxHp * 0.7); } }, 40); });
  const gi = 1;
  const arena = await Promise.all(all.map(c => c.p.evaluate(() => ({ arena: currentArena, st: state }))));
  check(`NET.${ARENA}.arena_en_todos`, arena.every(a => a.arena === ARENA && a.st === 'playing'), arena);

  if (ARENA === 'infernal') {
    // una fisura al lado del invitado: todos la ven igual
    await H.p.evaluate(([gi]) => { runLevel = 4; enemies.forEach(e => e.alive = false); INF.openT = 1e12; INF.fis.length = 0; const h = heroes[gi]; h.x = 300; h.y = 250; const f = infMakeFissure(380, 260); f.warn = 0; f.stage = 2; infSyncStage(f); f.reacted = true; }, [gi]);
    await goal(380, 262);
    await sleep(2000);
    const seen = await Promise.all(all.map(c => c.p.evaluate(() => INF.fis.map(f => [f.id, f.x, f.y, f.stage, f.done]))));
    check('NET.infernal.fisura_igual_en_todos', seen.every(s => JSON.stringify(s) === JSON.stringify(seen[0]) && s.length === 1), seen);
    const gb = await G[0].p.evaluate(() => { updateReviveBtn(); const b = document.getElementById('btn-revive'); return { ready: b.classList.contains('ready'), lbl: b.querySelector('.lbl').textContent, d: Math.round(Math.hypot(player.x - INF.fis[0].x, player.y - INF.fis[0].y)) }; });
    check('NET.infernal.invitado_ve_el_boton_cerrar', gb.ready && gb.lbl === 'Cerrar', gb);
    await G[0].p.screenshot({ path: path.join(OUT, 'net_guest_fisura.png') });
    // el invitado mantiene el botón: el anfitrión lleva el progreso y la sella
    await G[0].p.evaluate(() => document.getElementById('btn-revive').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
    await sleep(600);
    const hold = await H.p.evaluate(([gi]) => ({ hold: heroes[gi]._ctxHold, prog: Math.round(INF.fis[0] ? INF.fis[0].prog : -1) }), [gi]);
    check('NET.infernal.anfitrion_recibe_la_accion_del_invitado', hold.hold === 'inf1' && hold.prog > 0, hold);
    await sleep(1000);
    const gp = await G[0].p.evaluate(() => ({ prog: Math.round(INF.fis[0] ? INF.fis[0].prog : -1), ico: document.querySelector('#btn-revive .ico').textContent }));
    check('NET.infernal.invitado_ve_el_progreso', gp.prog > 0 && /%$/.test(gp.ico), gp);
    await sleep(3200);
    const done = await Promise.all(all.map(c => c.p.evaluate(() => INF.fis[0] ? INF.fis[0].done : 'none')));
    check('NET.infernal.sellada_en_todos', done.every(d => d === true || d === 'none'), done);
    await G[0].p.evaluate(() => document.getElementById('btn-revive').dispatchEvent(new PointerEvent('pointerup', { bubbles: true })));
    // soltar a mitad corta en el anfitrión
    await H.p.evaluate(([gi]) => { INF.fis.length = 0; const h = heroes[gi]; const f = infMakeFissure(h.x + 40, h.y + 5); f.warn = 0; f.reacted = true; }, [gi]);
    await sleep(1200);
    await G[0].p.evaluate(() => { updateReviveBtn(); document.getElementById('btn-revive').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); });
    await sleep(800);
    await G[0].p.evaluate(() => document.getElementById('btn-revive').dispatchEvent(new PointerEvent('pointerup', { bubbles: true })));
    await sleep(500);
    const rel = await H.p.evaluate(([gi]) => ({ hold: heroes[gi]._ctxHold, prog: Math.round(INF.fis[0].prog), done: INF.fis[0].done }), [gi]);
    check('NET.infernal.soltar_corta_en_el_anfitrion', rel.hold == null && !rel.done, rel);
    await goal(null);
  }
  // fin de esta arena: volver a la sala
  await H.p.evaluate(() => { clearInterval(window.__calm); });
  if (ARENAS.indexOf(ARENA) < ARENAS.length - 1) {
    await H.p.evaluate(() => { for (const h of heroes) { h.alive = false; h.hp = 0; } });
    await sleep(6000);
    await H.p.evaluate(([a]) => { if (state !== 'prep') { setState('prep'); } currentArena = a; renderPrepSummary(); }, [ARENAS[ARENAS.indexOf(ARENA) + 1]]);
    await sleep(1500);
  }
  }
  for (const c of all) check(`NET.sin_errores_J${c.i + 1}`, c.errs.length === 0, c.errs.slice(0, 4));
  console.log(fails ? `FALLAS: ${fails}` : 'OK todas');
  await b.close(); process.exit(fails ? 1 : 0);
})();
