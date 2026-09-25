// LA HORDA VISUAL GATE — Roster Visual Test (enemies/bosses), see docs/ART_BIBLE.md §8.
// Draws enemies/bosses with the game's own rendering code (spawnEnemy/drawEnemy) onto one
// contact sheet: same scale, background and lighting, no VFX, so a human can compare them
// against the Master Reference (Tanque, champions sheet) and the "bigger/more detail allowed
// for bosses" rule in ART_BIBLE.md §9. This does not decide style itself.
//
// usage: node boss_visual_test.js [out.png]     (site served at REGRESSION_BASE_URL, default
//        http://127.0.0.1:8750; run e.g. `python3 -m http.server 8750` from the repo root first)
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const BASE = process.env.REGRESSION_BASE_URL || 'http://127.0.0.1:8750';
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const out = process.argv[2] || 'bossroster.png';
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${BASE}/index.html`, { waitUntil: 'load' });
  for (let i = 0; i < 300; i++) { const ok = await page.evaluate(() => { const b = document.getElementById('title-continue-btn'); return b && !b.disabled; }); if (ok) break; await sleep(100); }
  await sleep(500);
  const dims = await page.evaluate(() => {
    buildSprites(); selectedClass = 'guerrero'; currentArena = 'bosque'; startRun(1); state = 'paused';
    const TYPES = ["mago_hielo_cristal", "angel_caido_hielo", "demonio_mayor", "jinete_sin_cabeza", "minotauro", "leviatan", "esqueleto_h", "dragon_hielo", "kraken_joven", "guardian_laberinto", "golem", "demonio_menor", "esqueleto", "zombie", "duende_bosque", "dama_bosque", "esfinge", "golem_hielo", "lobo_artico", "demonio_mago", "tiburon_blanco", "sirena_abisal"];
    const COLS = [["idle", e => {}], ["walk", e => { e.moving = true; e.animT = 200; e.fx = 1; e.fy = 0; }], ["attack", e => { e.attackAnim = 200; }]];
    const CW = 260, CH = 260, per = Math.ceil(TYPES.length / 2);
    const cvs = document.createElement('canvas'); cvs.id = 'lab'; cvs.width = CW * COLS.length * 2 + 30; cvs.height = CH * per + 20;
    cvs.style.cssText = 'position:fixed;left:0;top:0;z-index:9999';
    document.body.appendChild(cvs);
    const g = cvs.getContext('2d');
    const grad = g.createLinearGradient(0, 0, 0, cvs.height); grad.addColorStop(0, '#5a5f56'); grad.addColorStop(1, '#3a3f36');
    g.fillStyle = grad; g.fillRect(0, 0, cvs.width, cvs.height);
    const saved = ctx; animNow = performance.now();
    TYPES.forEach((t, i) => {
      const bx = (i < per ? 0 : CW * COLS.length + 30), by = (i % per) * CH;
      COLS.forEach((c, ci) => {
        let e; try { e = spawnEnemy(t, false, false); } catch (err) { return; }
        enemies = enemies.filter(o => o !== e);
        e.fx = 1; e.fy = 0; e.moving = false; e.animT = 0; e.attackAnim = 0; e.hitFlash = 0; c[1](e);
        const k = Math.min(1.6, 130 / ((e.radius || 30) * 3));
        g.save(); g.strokeStyle = 'rgba(255,255,255,.12)'; g.strokeRect(bx + ci * CW, by, CW, CH);
        g.fillStyle = '#fff'; g.font = '12px monospace'; if (ci === 0) g.fillText(t, bx + 4, by + 14);
        g.translate(bx + ci * CW + CW / 2, by + CH * 0.85); g.scale(k, k); g.imageSmoothingEnabled = false; ctx = g; e.x = 0; e.y = 0;
        try { drawEnemy(e); } catch (err) { g.fillStyle = 'red'; g.fillText('ERR ' + err.message.slice(0, 40), -80, -20); }
        ctx = saved; g.restore();
      });
    });
    return [cvs.width, cvs.height];
  });
  await page.setViewportSize({ width: dims[0], height: dims[1] });
  await (await page.$('#lab')).screenshot({ path: out });
  console.log(dims, errors.slice(0, 4));
  await browser.close();
})();
