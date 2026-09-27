// Hoja de bestias en cooperativo real (anfitrión + 1 invitado por el relay): el invitado recibe y DIBUJA
// con su arte a las Hadas de Escarcha (y su robo de calor), Dragoncito, Ángel, Cù-Sìth, hadas del Bosque
// con su color (atlasKey) y la muerte de 4 cuadros de la Esfinge. Sin errores en ninguno de los dos.
//   (python3 -m http.server 8793 --bind 127.0.0.1 &) ; (cd server && PORT=8809 node relay.js &)
//   SITE=http://127.0.0.1:8793 RELAY=ws://127.0.0.1:8809 node tools/regression/t_bestias_net.js <outdir>
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const fs = require('fs'), path = require('path');
const SITE = process.env.SITE || 'http://127.0.0.1:8771', RELAY = process.env.RELAY || 'ws://127.0.0.1:8799';
const OUT = process.argv[2] || '/tmp/bestias_net'; fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 400) : '')); if (!ok) fails++; };
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] });
  const mk = async (url, i, champ) => {
    const ctx = await b.newContext({ viewport: { width: 844, height: 390 } });
    await ctx.addInitScript(([n]) => { try { if (!localStorage.getItem('__s')) { localStorage.clear(); localStorage.setItem('__s', '1'); localStorage.setItem('horda_name', n); } } catch (e) {} }, ['J' + (i + 1)]);
    await ctx.addInitScript(() => { window.__autoConfirm = true; });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
    p.on('console', m => { if (m.type() === 'error' && !/ERR_CERT|fonts\.g|net::|WebSocket/.test(m.text())) errs.push('console: ' + m.text().slice(0, 200)); });
    await p.goto(url);
    for (let k = 0; k < 300; k++) { if (await p.evaluate(() => { const x = document.getElementById('title-continue-btn'); return x && !x.disabled; })) break; await sleep(100); }
    await p.evaluate(([c]) => { for (const k in save.champions) { save.champions[k].level = 30; save.champions[k].unlocked = true; } selectedClass = c; save.arenasCleared = Object.assign({}, save.arenasCleared, { hielo: true }); }, [champ]);
    return { p, errs };
  };
  const H = await mk(`${SITE}/index.html?server=${encodeURIComponent(RELAY)}`, 0, 'tanque');
  await H.p.evaluate(() => { document.getElementById('title-continue-btn').click(); currentArena = 'hielo'; setState('prep'); renderPrepSummary(); document.getElementById('net-create-btn').click(); });
  for (let k = 0; k < 50 && !(await H.p.evaluate(() => net.code)); k++) await sleep(100);
  const url = await H.p.evaluate(() => netInviteUrl());
  const G = await mk(url, 1, 'mago');
  await G.p.click('#title-join-btn');
  for (let k = 0; k < 60 && !(await G.p.evaluate(() => state === 'prep')); k++) await sleep(100);
  await H.p.evaluate(() => document.getElementById('prep-start-btn').click());
  await sleep(2500);
  await H.p.evaluate(() => { window.__calm = setInterval(() => { spawnTimer = 1e12; levelDuration = 9e9; for (const h of heroes) { h.hp = h.maxHp; h.basicCd = 1e6; } }, 40); });
  const st = await Promise.all([H, G].map(c => c.p.evaluate(() => ({ arena: currentArena, st: state }))));
  check('NET.partida_en_hielo', st.every(s => s.arena === 'hielo' && s.st === 'playing'), st);

  // el anfitrión hace aparecer las criaturas cerca del invitado (y un brasero encendido para las hadas)
  await H.p.evaluate(() => {
    enemies.forEach(e => { e.alive = false; }); enemies = [];
    const g = heroes[1], b = HIE.br[0]; b.lit = true; b.fuel = 60000;
    g.x = b.x + 90; g.y = b.y + 60;
    const put = (t, dx, dy) => { const e = spawnEnemy(t, false, false); e.x = g.x + dx; e.y = g.y + dy; e.hp = e.maxHp = 1e6; return e; };
    const n0 = enemies.length; put('hada_escarcha', -60, -40); for (let k = n0; k < enemies.length; k++) { enemies[k].x = b.x + (k - n0) * 20; enemies[k].y = b.y + 20; enemies[k].hp = enemies[k].maxHp = 1e6; }
    put('dragoncito_hielo', 160, -30).speed = 0; put('angel_hielo', 170, 60).speed = 0; put('cu_sith', -170, 80).speed = 0;
    for (let k = 0; k < 6; k++) put('enjambre_hadas', -120 + k * 45, 140).speed = 0;
    const s = put('esfinge', 120, 0); s.speed = 0; s.ranged = false; s.dmg = 0; s.hp = s.maxHp = 50;
    for (const e of enemies) { if (e.type !== 'hada_escarcha') { e.ranged = false; e.dmg = 0; e.cuCd = e.dgCd = e.agCd = 1e9; } }
  });
  await G.p.evaluate(() => {
    window.__drawn = {};
    const f = drawEnemyAtlasPack; window.drawEnemyAtlasPack = function (e) { const ok = f(e); if (ok) window.__drawn[e.type] = (window.__drawn[e.type] || 0) + 1; return ok; };
    const d = drawDeathPack; window.drawDeathPack = function (e) { const ok = d(e); if (ok) window.__drawn['muerte_' + e.type] = (window.__drawn['muerte_' + e.type] || 0) + 1; return ok; };
  });
  await sleep(2500);
  const gv = await G.p.evaluate(() => ({ types: [...new Set(enemies.map(e => e.type))].sort(), keys: [...new Set(enemies.filter(e => e.type === 'enjambre_hadas').map(e => e.atlasKey || 'verde'))].length,
    steal: enemies.filter(e => e.type === 'hada_escarcha' && e.hSteal).length, drawn: window.__drawn, role: net.role }));
  await G.p.screenshot({ path: path.join(OUT, 'net_invitado_bestias.png') });
  check('NET.invitado_recibe_tipos', ['angel_hielo', 'cu_sith', 'dragoncito_hielo', 'enjambre_hadas', 'esfinge', 'hada_escarcha'].every(t => gv.types.includes(t)), gv.types);
  check('NET.invitado_dibuja_con_arte', ['angel_hielo', 'cu_sith', 'dragoncito_hielo', 'enjambre_hadas', 'hada_escarcha'].every(t => gv.drawn[t] > 0), gv.drawn);
  check('NET.invitado_ve_hadas_robando_calor', gv.steal >= 1, { steal: gv.steal });
  check('NET.invitado_colores_de_hadas', gv.keys >= 2, { keys: gv.keys });
  // muerte en el invitado (la Esfinge usa su caída de siempre: se mira que muera sin errores)
  await H.p.evaluate(() => { const s = enemies.find(e => e.type === 'esfinge'); s.lastHitBy = heroes[0]; s.hp = 5; damageEnemy(s, 20, { src: heroes[0] }); });
  await sleep(700);
  const dd = await G.p.evaluate(() => window.__drawn.muerte_esfinge || 0);
  await G.p.screenshot({ path: path.join(OUT, 'net_invitado_esfinge_muerte.png') });
  const gone = await G.p.evaluate(() => !enemies.some(e => e.type === 'esfinge' && e.alive && e.hp > 0));
  check('NET.invitado_ve_morir_la_esfinge', gone && dd === 0, { dd, gone });
  check('NET.sin_errores', H.errs.length === 0 && G.errs.length === 0, { host: H.errs.slice(0, 3), guest: G.errs.slice(0, 3) });
  await b.close();
  console.log(fails ? `FALLAS: ${fails}` : 'TODO OK');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
