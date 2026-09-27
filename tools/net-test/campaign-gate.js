// LA HORDA — B1: la campaña se respeta. Un guardado nuevo solo tiene abierta la primera arena
// (Ruinas del Bosque); las demás se abren en orden al superar la anterior, y un anfitrión no
// puede crear una sala para una arena que no tiene abierta.  uso: node tools/net-test/campaign-gate.js
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const SITE = process.env.SITE || 'http://127.0.0.1:8771', RELAY = process.env.RELAY || 'ws://127.0.0.1:8799';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); if (!ok) fails++; };
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 900, height: 520 } });
  await ctx.addInitScript(() => { window.__campaignMode = true; }); // prueba la campaña real (sin el modo prueba de save.js)
  await ctx.addInitScript(() => { try { if (!sessionStorage.getItem('__s')) { localStorage.clear(); sessionStorage.setItem('__s', '1'); } } catch (e) {} });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(`${SITE}/index.html?server=${encodeURIComponent(RELAY)}`);
  for (let k = 0; k < 300; k++) { if (await p.evaluate(() => { const x = document.getElementById('title-continue-btn'); return x && !x.disabled; })) break; await sleep(100); }
  await p.click('#title-continue-btn');
  // modo campaña: primero se elige el campeón de regalo
  await p.click('.starter-card[data-champ="tanque"]'); await p.click('#starter-yes-btn');
  await p.click('#mainmenu-jugar-btn'); await p.click('#mode-arena-btn');
  const cards = await p.$$eval('.arena-card:not(.divina)', els => els.map(e => e.dataset.arena + ':' + (e.disabled ? 'locked' : 'open')));
  // orden canónico (docs/lore/LA_HORDA_LORE_BIBLE.md): 01 Ciudad … 08 Abismo · 09 Minas · 10 Infernal
  check('new_save.only_first_arena_open', cards.join(',') === 'ciudad:open,fortaleza:locked,bosque:locked,micelial:locked,hielo:locked,acuatica:locked,laberinto:locked,abismo:locked,minas:locked,infernal:locked,coliseo:locked', cards);
  // completar la Ciudad abre la Fábrica, y así en orden
  const after = await p.evaluate(() => { save.arenasCleared = { ciudad: true }; save.legacyOpenArenas = []; renderArenaGrid(); return [...document.querySelectorAll('.arena-card:not(.divina)')].map(e => e.dataset.arena + ':' + (e.disabled ? 'locked' : 'open')); });
  check('progression.ciudad_opens_fabrica', after.slice(0, 3).join(',') === 'ciudad:open,fortaleza:open,bosque:locked', after);
  // el Abismo abre las Minas (09), no la Infernal; las Minas abren la Infernal
  const ab = await p.evaluate(() => { save.arenasCleared = {}; for (const k of ['ciudad','fortaleza','bosque','micelial','hielo','acuatica','laberinto','abismo']) save.arenasCleared[k] = true; renderArenaGrid(); return [...document.querySelectorAll('.arena-card:not(.divina)')].map(e => e.dataset.arena + ':' + (e.disabled ? 'locked' : 'open')); });
  check('progression.abismo_opens_minas_not_infernal', ab.slice(7, 10).join(',') === 'abismo:open,minas:open,infernal:locked', ab);
  const mn = await p.evaluate(() => { save.arenasCleared.minas = true; renderArenaGrid(); return [...document.querySelectorAll('.arena-card:not(.divina)')].map(e => e.dataset.arena + ':' + (e.disabled ? 'locked' : 'open')); });
  check('progression.minas_opens_infernal', mn.slice(8, 10).join(',') === 'minas:open,infernal:open', mn);
  // intento de exploit: forzar una sala online en la Infernal sin tenerla
  const exploit = await p.evaluate(async () => { save.arenasCleared = {}; currentArena = 'infernal'; setState('prep'); renderPrepSummary(); document.getElementById('net-create-btn').click(); await new Promise(r => setTimeout(r, 800)); return { code: net.code, err: netLobby.lastError }; });
  check('exploit.no_room_for_locked_arena', !exploit.code && /desbloqueaste/.test(exploit.err), exploit);
  check('errors.none', errs.length === 0, errs.slice(0, 3));
  console.log('SUMMARY', JSON.stringify({ fails }));
  await b.close(); process.exit(fails ? 1 : 0);
})();
