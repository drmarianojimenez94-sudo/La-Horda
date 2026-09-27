// Arte panorámico de las ARENAS del Códice: capturas del juego REAL (el escenario de cada arena con su
// horda), sin HUD. No se dibuja nada a mano: si una arena cambia, se vuelve a correr esto.
//   (python3 -m http.server 8771 &) ; node tools/codex/capture_arenas.js
//   → assets/ui/codex/arenas/<arena>.jpg (960×420, JPEG)
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const path = require('path');
const BASE = process.env.SE_BASE_URL || 'http://127.0.0.1:8771';
const OUT = path.join(__dirname, '..', '..', 'assets', 'ui', 'codex', 'arenas');
const SHOTS = { fortaleza:6, bosque:4, micelial:5, hielo:4, acuatica:4, laberinto:5, abismo:3, infernal:5, divina:1 };
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: 960, height: 540 } })).newPage();
  await page.addInitScript(() => { window.__campaignMode = true; });
  await page.goto(`${BASE}/index.html`, { waitUntil: 'load' });
  for (let k = 0; k < 300; k++) { if (await page.evaluate(() => !document.getElementById('title-continue-btn').disabled)) break; await page.waitForTimeout(100); }
  await page.waitForTimeout(2500);
  for (const [arena, lv] of Object.entries(SHOTS)) {
    await page.evaluate(([a, lv]) => {
      loop = function(){};
      for (const k of Object.keys(save.champions)) save.champions[k].unlocked = true;
      selectedClass = 'guerrero'; lobbyAllies = ['tanque', 'mago', 'soporte'];
      if (a === 'divina') { save.divineArenaUnlocked = true; startDivinaExploration(); } else { divinaMode = false; currentArena = a; startRun(lv); }
      if (typeof arenaTitleCardHide === 'function') arenaTitleCardHide();
      if (a === 'fortaleza') for (const h of heroes) { h.x = (h === player ? 0 : (Math.random()-0.5)*160); h.y = -950 + (h === player ? 0 : Math.random()*120); } // La Forja
      let t = 0; while (t < (a === 'divina' ? 14000 : 9000)) { for (const h of heroes) h.hp = h.maxHp; update(16); t += 16; }
      for (const id of ['hud', 'controls', 'pause-btn', 'mute-btn', 'tut-panel', 'boss-hud', 'center-banner', 'arena-title-card', 'boss-intro'])
        { const el = document.getElementById(id); if (el) el.style.visibility = 'hidden'; }
      // sin textos flotantes ni minimapa: solo el escenario, la horda y los héroes
      for (const f of floatTexts) if (f) f.on = false;
      const D = (typeof ARENA_DEFS !== 'undefined' && ARENA_DEFS[a]) || null, X = (typeof ARENA_EXT !== 'undefined' && ARENA_EXT[a]) || null;
      window.__cxSaved = [D && D.drawScreen, X && X.drawScreen];
      if (D) D.drawScreen = null; if (X) X.drawScreen = null;
      render();
    }, [arena, lv]);
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(OUT, arena + '.jpg'), type: 'jpeg', quality: 78, clip: { x: 0, y: 60, width: 960, height: 420 } });
    await page.evaluate((a) => { const D = ARENA_DEFS[a], X = ARENA_EXT[a]; if (D) D.drawScreen = __cxSaved[0]; if (X) X.drawScreen = __cxSaved[1]; state = 'menu'; for (const id of ['hud', 'controls', 'pause-btn', 'mute-btn', 'tut-panel', 'boss-hud', 'center-banner', 'arena-title-card', 'boss-intro']) { const el = document.getElementById(id); if (el) el.style.visibility = ''; } }, arena);
    console.log('ok', arena);
  }
  await browser.close();
})();
