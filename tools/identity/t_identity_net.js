// Mecánicas de identidad (ARENA_EXT) + acción contextual en cooperativo real (anfitrión + invitados por el relay).
//   (python3 -m http.server 8771 &) ; (cd server && PORT=8799 node relay.js &) ; [ARENA=infernal|hielo|...] node tools/identity/t_identity_net.js <invitados 1|3> <outdir>
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const fs = require('fs'), path = require('path');
const SITE = process.env.SITE || 'http://127.0.0.1:8771', RELAY = process.env.RELAY || 'ws://127.0.0.1:8799';
const NG = +(process.argv[2] || 1), OUT = process.argv[3] || '/tmp/id_net'; fs.mkdirSync(OUT, { recursive: true });
const ARENAS = [process.env.ARENA || 'infernal']; // una arena por corrida
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
  if (ARENA === 'hielo') {
    // braseros y frío iguales en todos; el invitado quieto se enfría (lo decide el anfitrión) y enciende un brasero
    await H.p.evaluate(([gi]) => { ctxBotObjective = () => null; /* (los bots no se adelantan a encender) */ runLevel = 3; enemies.forEach(e => e.alive = false); for (const b of HIE.br){ b.lit = false; b.fuel = 0; } HIE.br[0].lit = true; HIE.br[0].fuel = 40000; const h = heroes[gi]; h.x = HIE.br[2].x + 200; h.y = HIE.br[2].y; for (const o of heroes) if (o !== h && o.classKey) { o.x = -800; o.y = 0; } }, [gi]);
    await goal(null);
    await sleep(8000);
    const cold = await Promise.all(all.map(c => c.p.evaluate(([gi]) => ({ br: HIE.br.map(b => b.lit ? 1 : 0).join(''), cold: Math.round(heroes[gi]._cold||0), fr: heroes[gi].frostStacks||0 }), [gi])));
    check('NET.hielo.braseros_iguales_en_todos', cold.every(c => c.br === cold[0].br), cold);
    check('NET.hielo.el_invitado_quieto_se_enfria', cold[1].cold > 30 || cold[1].fr > 0, cold);
    await G[0].p.screenshot({ path: path.join(OUT, 'net_guest_frio.png') });
    const bx = await H.p.evaluate(() => [HIE.br[2].x, HIE.br[2].y]);
    await goal(bx[0] + 30, bx[1] + 12);
    await sleep(3000);
    await goal(null);
    const gb = await G[0].p.evaluate(() => { updateReviveBtn(); const b = document.getElementById('btn-revive'); return { ready: b.classList.contains('ready'), lbl: b.querySelector('.lbl').textContent }; });
    check('NET.hielo.invitado_ve_encender', gb.ready && gb.lbl === 'Encender', gb);
    await G[0].p.evaluate(() => document.getElementById('btn-revive').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
    await sleep(2400);
    await G[0].p.evaluate(() => document.getElementById('btn-revive').dispatchEvent(new PointerEvent('pointerup', { bubbles: true })));
    await sleep(800);
    const lit = await Promise.all(all.map(c => c.p.evaluate(() => HIE.br[2].lit)));
    check('NET.hielo.el_invitado_enciende_y_todos_lo_ven', lit.every(x => x === true), lit);
    await sleep(2500);
    const warm = await H.p.evaluate(([gi]) => Math.round(heroes[gi]._cold||0), [gi]);
    check('NET.hielo.el_brasero_calienta_al_invitado', warm < 15, warm);
  }
  if (ARENA === 'acuatica') {
    // el invitado en una corriente: se arrastra solo (predicción) y el anfitrión no lo corrige a cada cuadro
    await H.p.evaluate(([gi]) => { enemies.forEach(e => e.alive = false); acuaCurrent.active = false; ACU.zones = []; const h = heroes[gi]; h.x = -150; h.y = 250; const z = acuAdd('lineal'); z.x = 0; z.y = 250; z.dx = 1; z.dy = 0; }, [gi]);
    await goal(null);
    await sleep(1500);
    const z0 = await Promise.all(all.map(c => c.p.evaluate(() => ACU.zones.map(z => [z.type, z.x, z.y]).join('|'))));
    check('NET.acuatica.zonas_iguales_en_todos', z0.every(z => z === z0[0] && z.length > 0), z0);
    const pa0 = await H.p.evaluate(([gi]) => heroes[gi]._net.posAuth, [gi]);
    const gx0 = await G[0].p.evaluate(() => player.x);
    await sleep(2500);
    const gx1 = await G[0].p.evaluate(() => player.x);
    const pa1 = await H.p.evaluate(([gi]) => ({ pa: heroes[gi]._net.posAuth, x: Math.round(heroes[gi].x) }), [gi]);
    check('NET.acuatica.el_invitado_es_arrastrado', gx1 - gx0 > 80, { gx0: Math.round(gx0), gx1: Math.round(gx1), host: pa1.x });
    check('NET.acuatica.sin_correcciones_en_cadena', pa1.pa - pa0 <= 2, { pa0, pa1: pa1.pa });
  }
  if (ARENA === 'laberinto') {
    // sellos iguales en todos; el invitado activa el I y todos lo ven encendido
    await H.p.evaluate(([gi]) => { ctxBotObjective = () => null; runLevel = 3; enemies.forEach(e => e.alive = false); LAB.seals = []; LAB.spawnT = 10; }, [gi]);
    await sleep(1500);
    const s0 = await Promise.all(all.map(c => c.p.evaluate(() => LAB.seals.map(s => [s.n, s.x, s.y, s.lit ? 1 : 0].join(':')).join('|'))));
    check('NET.laberinto.sellos_iguales_en_todos', s0.every(x => x === s0[0] && x.length > 0), s0);
    const p1 = await H.p.evaluate(() => { const s = LAB.seals.find(x => x.n === 1); return [s.x, s.y]; });
    await H.p.evaluate(([gi, x, y]) => { const h = heroes[gi]; h.x = x - 80; h.y = y; }, [gi, p1[0], p1[1]]);
    await goal(p1[0], p1[1] + 6);
    await sleep(2500);
    await goal(null);
    const gb = await G[0].p.evaluate(() => { updateReviveBtn(); const b = document.getElementById('btn-revive'); return { ready: b.classList.contains('ready'), lbl: b.querySelector('.lbl').textContent }; });
    check('NET.laberinto.invitado_ve_el_boton_sello', gb.ready && gb.lbl === 'Sello', gb);
    await G[0].p.evaluate(() => document.getElementById('btn-revive').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
    await sleep(1800);
    await G[0].p.evaluate(() => document.getElementById('btn-revive').dispatchEvent(new PointerEvent('pointerup', { bubbles: true })));
    await sleep(800);
    const lit = await Promise.all(all.map(c => c.p.evaluate(() => ({ lit: LAB.seals.filter(s => s.lit).map(s => s.n).join(''), next: LAB.next }))));
    check('NET.laberinto.el_invitado_enciende_el_I_y_todos_lo_ven', lit.every(l => l.lit === '1' && l.next === 2), lit);
  }
  if (ARENA === 'bosque') {
    // runas y emboscadas iguales en todos; el invitado activa una runa
    await H.p.evaluate(([gi]) => { ctxBotObjective = () => null; runLevel = 3; enemies.forEach(e => e.alive = false); for (const r of BOS.runes) r.charge = 0; BOS.runes[0].charge = 1; const r = BOS.runes[0]; const h = heroes[gi]; h.x = r.x - 90; h.y = r.y; BOS.ambT = 10; }, [gi]);
    await sleep(1200);
    const st = await Promise.all(all.map(c => c.p.evaluate(() => ({ r: BOS.runes.map(r => bosReady(r) ? 1 : 0).join(''), a: BOS.amb.map(a => a.x + ',' + a.y).join('|') }))));
    check('NET.bosque.runas_y_emboscadas_iguales', st.every(x => x.r === st[0].r && x.a === st[0].a) && st[0].r === '1000' && st[0].a.length > 0, st);
    const r0 = await H.p.evaluate(() => [BOS.runes[0].x, BOS.runes[0].y]);
    await goal(r0[0], r0[1] + 4);
    await sleep(2500); await goal(null);
    await G[0].p.evaluate(() => { updateReviveBtn(); document.getElementById('btn-revive').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); });
    await sleep(1600);
    await G[0].p.evaluate(() => document.getElementById('btn-revive').dispatchEvent(new PointerEvent('pointerup', { bubbles: true })));
    await sleep(700);
    const used = await Promise.all(all.map(c => c.p.evaluate(() => +BOS.runes[0].charge.toFixed(2))));
    check('NET.bosque.el_invitado_activa_la_runa', used.every(c => c < 0.2), used);
  }
  await H.p.evaluate(() => { clearInterval(window.__calm); });
  }
  for (const c of all) check(`NET.sin_errores_J${c.i + 1}`, c.errs.length === 0, c.errs.slice(0, 4));
  console.log(fails ? `FALLAS: ${fails}` : 'OK todas');
  await b.close(); process.exit(fails ? 1 : 0);
})();
