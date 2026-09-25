// LA HORDA — B1: desconexiones. Invitado que pierde la conexión y vuelve (reconexión al mismo
// lugar), invitado que cierra el juego (lo reemplaza un bot, la partida sigue) y anfitrión que
// se va (los invitados vuelven al menú de forma segura).  uso: node tools/net-test/disconnect.js
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const SITE = process.env.SITE || 'http://127.0.0.1:8771', RELAY = process.env.RELAY || 'ws://127.0.0.1:8799';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0;
const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 300) : '')); if (!ok) fails++; };
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] });
  const mk = async (url, name, champ) => {
    const ctx = await b.newContext({ viewport: { width: 900, height: 500 } });
    await ctx.addInitScript(([n]) => { try { if (!localStorage.getItem('__s')) { localStorage.clear(); localStorage.setItem('__s', '1'); localStorage.setItem('horda_name', n); } } catch (e) {} }, [name]);
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
    await p.goto(url);
    for (let k = 0; k < 300; k++) { if (await p.evaluate(() => { const x = document.getElementById('title-continue-btn'); return x && !x.disabled; })) break; await sleep(100); }
    await p.evaluate(([c]) => { for (const k in save.champions) save.champions[k].level = 10; selectedClass = c; }, [champ]);
    return { ctx, p, errs };
  };
  const H = await mk(`${SITE}/index.html?server=${encodeURIComponent(RELAY)}`, 'Mariano', 'tanque');
  await H.p.evaluate(() => { document.getElementById('title-continue-btn').click(); currentArena = 'bosque'; setState('prep'); renderPrepSummary(); document.getElementById('net-create-btn').click(); });
  for (let k = 0; k < 50 && !(await H.p.evaluate(() => net.code)); k++) await sleep(100);
  const url = await H.p.evaluate(() => netInviteUrl());
  const G1 = await mk(url, 'Facundo', 'mago'), G2 = await mk(url, 'Daniel', 'soporte');
  for (const g of [G1, G2]) { await g.p.evaluate(() => document.getElementById('title-join-btn').click()); await sleep(900); }
  await H.p.evaluate(() => document.getElementById('prep-start-btn').click());
  await sleep(1500);
  check('start.all_playing', (await Promise.all([H, G1, G2].map(c => c.p.evaluate(() => state)))).every(s => s === 'playing'));
  // 1) Facundo pierde la conexión (se cae el socket) y vuelve solo
  await G1.p.evaluate(() => net.ws.close());
  await sleep(500);
  const mid = await H.p.evaluate(() => ({ remote: heroes[1].isRemote, alive: heroes[1].alive, st: state }));
  check('drop.host_keeps_playing_bot_takes_over', mid.st === 'playing' && mid.remote === false, mid);
  for (let k = 0; k < 60; k++) { if (await H.p.evaluate(() => heroes[1].isRemote === true)) break; await sleep(200); }
  const back = await G1.p.evaluate(() => ({ st: state, slot: net.slot, role: netMatch && netMatch.role, attempts: net.reconnectAttempts, code: net.code }));
  check('reconnect.guest_back_same_slot', back.st === 'playing' && back.slot === 1 && back.role === 'guest', back);
  check('reconnect.host_gives_control_back', await H.p.evaluate(() => heroes[1].isRemote === true));
  // se sigue moviendo y el anfitrión lo ve
  const p0 = await G1.p.evaluate(() => ({ x: player.x, y: player.y }));
  await G1.p.evaluate(() => { joyVec = { x: 1, y: 0 }; });
  await sleep(1200);
  await G1.p.evaluate(() => { joyVec = { x: 0, y: 0 }; });
  await sleep(600);
  const p1 = await G1.p.evaluate(() => ({ x: player.x, y: player.y }));
  const hv = await H.p.evaluate(() => ({ x: heroes[1].x, y: heroes[1].y }));
  check('reconnect.moves_again', Math.hypot(p1.x - p0.x, p1.y - p0.y) > 50 && Math.hypot(hv.x - p1.x, hv.y - p1.y) < 40, { p0, p1, hv });
  // 2) Daniel cierra el juego: lo reemplaza un bot, la partida sigue
  await G2.ctx.close();
  await sleep(1500);
  const after = await H.p.evaluate(() => ({ st: state, remote: heroes[2].isRemote, conn: net.room.slots[2] && net.room.slots[2].connected }));
  check('leave.bot_replaces_guest', after.st === 'playing' && after.remote === false && after.conn === false, after);
  // 3) el anfitrión se va: el invitado sale de forma segura
  await H.ctx.close();
  await sleep(1500);
  const gEnd = await G1.p.evaluate(() => ({ st: state, title: document.getElementById('go-title').textContent, match: !!netMatch }));
  check('host_left.guest_safe_exit', gEnd.st === 'gameover' && /anfitrión/i.test(gEnd.title) && !gEnd.match, gEnd);
  await G1.p.click('#menu-btn-1').catch(() => {});
  await sleep(300);
  check('host_left.guest_back_to_menu', (await G1.p.evaluate(() => state)) === 'menu');
  check('errors.none', G1.errs.length === 0 && H.errs.length === 0, [...G1.errs, ...H.errs].slice(0, 3));
  console.log('SUMMARY', JSON.stringify({ fails }));
  await b.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.log('FAIL exception', e.stack); process.exit(1); });
