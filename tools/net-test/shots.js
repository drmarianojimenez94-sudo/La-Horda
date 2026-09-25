// Capturas lado a lado (anfitrión / invitado) en plena pelea para revisar a ojo la sincronización.
// uso: node tools/net-test/shots.js <outdir>   (mismos servidores que e2e.js)
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const SITE = process.env.SITE || 'http://127.0.0.1:8771', RELAY = process.env.RELAY || 'ws://127.0.0.1:8799';
const OUT = process.argv[2] || '.';
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] });
  const mk = async (url, name, champ) => {
    const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await ctx.addInitScript(([n]) => { try { if (!localStorage.getItem('__s')) { localStorage.clear(); localStorage.setItem('__s', '1'); localStorage.setItem('horda_name', n); } } catch (e) {} }, [name]);
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
    await p.goto(url);
    for (let k = 0; k < 300; k++) { if (await p.evaluate(() => { const x = document.getElementById('title-continue-btn'); return x && !x.disabled; })) break; await sleep(100); }
    await p.evaluate(([c]) => { for (const k in save.champions) { save.champions[k].level = 15; save.champions[k].unlocked = true; } selectedClass = c; }, [champ]);
    return { p, errs };
  };
  const H = await mk(`${SITE}/index.html?server=${encodeURIComponent(RELAY)}`, 'Mariano', 'mago');
  await H.p.evaluate(() => { document.getElementById('title-continue-btn').click(); setState('prep'); currentArena = 'bosque'; lobbyAllies = pickLobbyAllies(selectedClass); renderPrepSummary(); });
  await H.p.evaluate(() => document.getElementById('net-create-btn').click());
  for (let k = 0; k < 50 && !(await H.p.evaluate(() => net.code)); k++) await sleep(100);
  await H.p.screenshot({ path: `${OUT}/1_host_lobby_empty.png` });
  const url = await H.p.evaluate(() => netInviteUrl());
  const G = await mk(url, 'Facundo', 'segador');
  await G.p.screenshot({ path: `${OUT}/2_guest_title_invite.png` });
  await G.p.evaluate(() => document.getElementById('title-join-btn').click());
  await sleep(1200);
  await G.p.evaluate(() => document.getElementById('net-ready-btn').click());
  await sleep(600);
  await H.p.screenshot({ path: `${OUT}/3_host_lobby_with_friend.png` });
  await G.p.screenshot({ path: `${OUT}/4_guest_lobby.png` });
  await H.p.evaluate(() => document.getElementById('prep-start-btn').click());
  await sleep(1500);
  // pelea: el anfitrión y el invitado se mueven y atacan
  await H.p.evaluate(() => { joyVec = { x: 0.6, y: 0.3 }; basicHeld = true; });
  await G.p.evaluate(() => { joyVec = { x: -0.5, y: 0.4 }; basicHeld = true; });
  await sleep(2500);
  await H.p.evaluate(() => { joyVec = { x: 0, y: 0 }; useSkill(0, null); });
  await G.p.evaluate(() => { joyVec = { x: 0, y: 0 }; useSkill(1, null); });
  await sleep(350);
  await Promise.all([H.p.screenshot({ path: `${OUT}/5_host_fight.png` }), G.p.screenshot({ path: `${OUT}/6_guest_fight.png` })]);
  await sleep(4000);
  await Promise.all([H.p.screenshot({ path: `${OUT}/7_host_fight2.png` }), G.p.screenshot({ path: `${OUT}/8_guest_fight2.png` })]);
  const dbg = await G.p.evaluate(() => { netDebugToggle(true); return { enemies: enemies.length, particles: particles.length, bytes: 0 }; });
  await sleep(1200);
  await G.p.screenshot({ path: `${OUT}/9_guest_debug_panel.png` });
  const hb = await H.p.evaluate(() => netMatch.lastSnapBytes);
  console.log(JSON.stringify({ dbg, snapBytes: hb, hostErrs: H.errs.slice(0, 3), guestErrs: G.errs.slice(0, 3) }));
  await b.close();
})();
