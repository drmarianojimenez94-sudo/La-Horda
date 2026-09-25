// LA HORDA — El Libertador y Eren en cooperativo (host autoritativo).
// Anfitrión = El Libertador, invitado 1 = Eren, invitado 2 = Soporte, + 1 bot.
// Verifica que el INVITADO vea/controle: fases de San Martín (montar, cargar, forma montada,
// Cruce de los Andes), la transformación de Eren (clase del titán, botones, tamaño), El Retumbar
// (pedido por el invitado, pisadas sincronizadas), AGOTADO, y que el anfitrión vea lo mismo.
// uso: node tools/net-test/champs_se.js   (sitio en :8771 y relay en :8799, ver README.md)
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const SITE = process.env.SITE || 'http://127.0.0.1:8771', RELAY = process.env.RELAY || 'ws://127.0.0.1:8799';
const CH = ['libertador', 'eren', 'soporte'];
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 400) : '')); if (!ok) fails++; };
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] });
  const mk = async (url, i) => {
    const ctx = await b.newContext({ viewport: { width: 844, height: 390 } });
    await ctx.addInitScript(([n]) => { try { if (!localStorage.getItem('__s')) { localStorage.clear(); localStorage.setItem('__s', '1'); localStorage.setItem('horda_name', n); } } catch (e) {} }, ['J' + (i + 1)]);
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
    await p.goto(url);
    for (let k = 0; k < 300; k++) { if (await p.evaluate(() => { const x = document.getElementById('title-continue-btn'); return x && !x.disabled; })) break; await sleep(100); }
    await p.evaluate(([c]) => { for (const k in save.champions) { save.champions[k].level = 30; save.champions[k].unlocked = true; } save.arenasCleared = { bosque: true, acuatica: true, hielo: true, laberinto: true, infernal: true }; selectedClass = c; }, [CH[i]]);
    return { p, errs, i };
  };
  const H = await mk(`${SITE}/index.html?server=${encodeURIComponent(RELAY)}`, 0);
  await H.p.evaluate(() => { document.getElementById('title-continue-btn').click(); currentArena = 'bosque'; setState('prep'); renderPrepSummary(); document.getElementById('net-create-btn').click(); });
  for (let k = 0; k < 50 && !(await H.p.evaluate(() => net.code)); k++) await sleep(100);
  const url = await H.p.evaluate(() => netInviteUrl());
  const all = [H];
  for (let i = 1; i < CH.length; i++) { const g = await mk(url, i); await g.p.click('#title-join-btn'); for (let k = 0; k < 50 && !(await g.p.evaluate(() => state === 'prep')); k++) await sleep(100); all.push(g); }
  await H.p.evaluate(() => document.getElementById('prep-start-btn').click());
  await sleep(2000);
  const [_, G1, G2] = all;
  // mundo tranquilo para mirar estados: sin oleadas, nivel con ulti habilitada
  await H.p.evaluate(() => { runLevel = Math.max(runLevel, ULT_MIN_ARENA_LEVEL); setInterval(() => { spawnTimer = 1e9; levelTimer = 0; for (const h of heroes) { h.hp = Math.max(h.hp, h.maxHp * 0.6); h.energy = h.maxEnergy; } }, 50); enemies.forEach(e => e.alive = false); for (let j = 0; j < 12; j++) { const e = spawnEnemy('duende_bosque'); e.x = player.x + 150 + (j % 4) * 40; e.y = player.y + ((j / 4) | 0) * 50 - 50; e.speed = 0; e.dmg = 0; e.hp = e.maxHp = 5000; } });
  const who = await Promise.all(all.map(c => c.p.evaluate(() => ({ me: player && player.classKey, heroes: heroes.map(h => h.classKey), role: net.role }))));
  check('net.roles', who[0].me === 'libertador' && who[1].me === 'eren' && who[2].me === 'soporte' && who.every(w => w.heroes.includes('libertador') && w.heroes.includes('eren')), who);

  // ---- San Martín (anfitrión): San Lorenzo + Cruce de los Andes, visto por los invitados ----
  await H.p.evaluate(() => { player.cds = [0, 0, 0]; useSkill(2, null); });
  await sleep(250);
  const smSeen = await G1.p.evaluate(() => { const s = heroes.find(h => h.classKey === 'libertador'); return { ph: s.smPhase, x: Math.round(s.x) }; });
  check('net.guest_sees_san_lorenzo', ['mount', 'charge', 'dismount'].includes(smSeen.ph), smSeen);
  await sleep(1500);
  await H.p.evaluate(() => { player.ultCharge = player.ultMax; player.ultCd = 0; useUltimate(); });
  await sleep(2600);
  const smM = await G1.p.evaluate(() => { const s = heroes.find(h => h.classKey === 'libertador'); return { mounted: !!s.smMounted, fx: champFx.map(f => f.type) }; });
  check('net.guest_sees_mounted_and_andes', smM.mounted && smM.fx.includes('andes'), smM);
  await G1.p.screenshot({ path: (process.env.OUT || '/tmp') + '/net_guest_andes.png' });

  // ---- Eren (invitado 1): transformación pedida por el invitado ----
  await H.p.evaluate(() => { const e = heroes.find(h => h.classKey === 'eren'); e.ultCharge = e.ultMax; e.ultCd = 0; });
  await sleep(300);
  await G1.p.evaluate(() => useUltimate());
  await sleep(2300);
  const tHost = await H.p.evaluate(() => { const e = heroes.find(h => h.classKey === 'eren'); return { titan: !!e.erenTitan, r: e.radius }; });
  const tGuest = await G1.p.evaluate(() => ({ titan: !!player.erenTitan, cls: player.cls.name, r: player.radius, btn: [...document.querySelectorAll('.skill-btn .skill-name, .ability-btn span')].map(x => x.textContent).join('|') }));
  check('net.guest_eren_transforms', tHost.titan && tGuest.titan && tGuest.cls === 'El Portador' && tGuest.r > 40, { tHost, tGuest });
  // habilidades del titán pedidas por el invitado
  await G1.p.evaluate(() => useSkill(0, null));
  await sleep(400);
  const sismo = await H.p.evaluate(() => { const e = heroes.find(h => h.classKey === 'eren'); return { cd0: Math.round(e.cds[0]) }; });
  check('net.guest_titan_skill', sismo.cd0 > 0, sismo);
  await G1.p.screenshot({ path: (process.env.OUT || '/tmp') + '/net_guest_titan.png' });
  // El Retumbar: Furia llena transformado -> el invitado lo pide
  await H.p.evaluate(() => { const e = heroes.find(h => h.classKey === 'eren'); e.erenPhase = null; e.ultCharge = e.ultMax; erenCheckRumbling(e); });
  await sleep(400);
  const readyG = await G1.p.evaluate(() => ({ ready: !!player.erenRumblingReady, hud: (document.getElementById('se-hud') || {}).innerText || '' }));
  await G1.p.evaluate(() => useUltimate());
  await sleep(1500);
  const rG = await G1.p.evaluate(() => ({ ph: player.erenPhase, steps: champFx.filter(f => f.type === 'rumbleStep').length, sil: champFx.some(f => f.type === 'rumbling') }));
  const rO = await G2.p.evaluate(() => ({ steps: champFx.filter(f => f.type === 'rumbleStep').length }));
  check('net.guest_rumbling', readyG.ready && /RETUMBAR/.test(readyG.hud) && rG.ph === 'rumble' && rG.steps === 3 && rG.sil && rO.steps === 3, { readyG, rG, other: rO });
  await sleep(1800);
  await G2.p.screenshot({ path: (process.env.OUT || '/tmp') + '/net_other_rumbling.png' });
  await sleep(5500);
  const ex = await G1.p.evaluate(() => ({ titan: !!player.erenTitan, cls: player.cls.name, exhaust: Math.round(player.erenExhaustTimer || 0), hud: (document.getElementById('se-hud') || {}).innerText || '' }));
  check('net.guest_exhausted', !ex.titan && ex.cls === 'Eren' && ex.exhaust > 0 && /AGOTADO/.test(ex.hud), ex);
  // el Soldado Cabral del anfitrión lo ven todos
  await H.p.evaluate(() => { player.invulnTimer = 0; player.hp = 3; damageHero(player, 1e6, null); });
  await sleep(400);
  const cab = await G2.p.evaluate(() => { const s = heroes.find(h => h.classKey === 'libertador'); return { alive: s.alive, hp: Math.round(s.hp), used: !!s.smCabralUsed }; });
  check('net.guest_sees_cabral', cab.alive && cab.used, cab);
  const bytes = await H.p.evaluate(() => netMatch && netMatch.lastSnapBytes);
  check('net.snapshot_size', bytes > 0 && bytes < 12000, { bytes });
  all.forEach((c, i) => check(`net.client${i}_no_errors`, c.errs.length === 0, c.errs.slice(0, 3)));
  console.log('SUMMARY', JSON.stringify({ fails }));
  await b.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.log('FAIL exception', e.stack); process.exit(1); });
