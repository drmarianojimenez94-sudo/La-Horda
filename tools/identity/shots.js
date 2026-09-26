// Capturas de legibilidad en pantalla de celular (844x390) de cada arena con su mecánica propia activa.
//   (python3 -m http.server 8771 &) ; node tools/identity/shots.js <carpeta>
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const path = require('path'), fs = require('fs');
const BASE = process.env.SE_BASE_URL || 'http://127.0.0.1:8771';
const OUT = process.argv[2] || '/tmp/id_shots'; fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })).newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => { window.__campaignMode = true; });
  await page.goto(`${BASE}/index.html`, { waitUntil: 'load' });
  for (let k = 0; k < 300; k++) { if (await page.evaluate(() => !document.getElementById('title-continue-btn').disabled)) break; await sleep(100); }
  await page.evaluate(() => { loop = function(){}; save.tut = {basics:1, b_move:1, b_attack:1, b_skill:1};
    window.__go = (arena, lv, champ) => { for (const k of Object.keys(save.champions)) save.champions[k].unlocked = true; selectedClass = champ || 'guerrero'; currentArena = arena; lobbyAllies = ['tanque','mago','soporte']; startRun(lv); };
    window.__st = (ms) => { let t = 0; while (t < ms) { if (state === 'buff') { const c = document.querySelector('#buff-cards > *'); if (c) c.click(); continue; } if (state !== 'playing') break; for (const h of heroes) h.hp = Math.max(h.hp, h.maxHp*0.6); update(16); t += 16; } }; });
  const shot = async (n) => { await page.evaluate(() => { for (let i = 0; i < 3; i++) render(); }); await page.screenshot({ path: path.join(OUT, n + '.png') }); };
  const scenes = [
    ['bosque', 4, () => { BOS.runes[0].charge = 1; const r = BOS.runes[0]; BOS.ambT = 10; __st(1200); player.x = r.x + 20; player.y = r.y + 10; __st(32); }],
    ['acuatica', 7, () => { const z = ACU.zones.find(z => z.type === 'charco'); player.x = z.x - 120; player.y = z.y; z.t = 10; __st(500); }],
    ['hielo', 5, () => { const b = HIE.br[1]; b.lit = false; b.fuel = 0; player.x = b.x + 30; player.y = b.y + 15; __st(300); player._cold = 80; }],
    ['laberinto', 4, () => { LAB.spawnT = 10; __st(100); const s = LAB.seals[1]; player.x = s.x + 50; player.y = s.y + 40; __st(300); }],
    ['infernal', 6, () => { INF.fis.length = 0; const f = infMakeFissure(player.x + 150, player.y + 40); f.warn = 0; f.stage = 3; infSyncStage(f); f.prog = f.dur*0.5; player.x = f.x - 60; player.y = f.y + 20; player._ctxHold = f.id; __st(300); }]
  ];
  for (const [arena, lv, setup] of scenes) {
    await page.evaluate(([a, l]) => { __go(a, l); __st(9000); }, [arena, lv]);
    await page.evaluate(setup);
    await sleep(400);
    await page.evaluate(() => { updateHUD(); });
    await shot(arena);
    console.log('shot', arena);
  }
  console.log(errors.length ? 'ERRORES ' + JSON.stringify(errors.slice(0, 3)) : 'sin errores');
  await browser.close();
})();
