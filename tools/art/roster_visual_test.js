// LA HORDA VISUAL GATE — Roster Visual Test (champions), see docs/ART_BIBLE.md §8.
// Draws all champions with the game's own rendering code (makeHero/drawHeroBody) onto one
// contact sheet: same scale, background and lighting, no VFX, so a human can compare them
// against the Master Reference (Tanque) and answer: "¿parecen personajes del MISMO juego?"
// This does not decide style itself — it only removes scale/background/lighting as variables.
//
// usage: node roster_visual_test.js [out.png]     (site served at REGRESSION_BASE_URL, default
//        http://127.0.0.1:8750; run e.g. `python3 -m http.server 8750` from the repo root first)
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const BASE = process.env.REGRESSION_BASE_URL || 'http://127.0.0.1:8750';
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const out = process.argv[2] || 'roster.png';
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${BASE}/index.html`, { waitUntil: 'load' });
  for (let i = 0; i < 300; i++) { const ok = await page.evaluate(() => { const b = document.getElementById('title-continue-btn'); return b && !b.disabled; }); if (ok) break; await sleep(100); }
  await sleep(500);
  const dims = await page.evaluate(() => {
    if (typeof buildSprites === 'function') buildSprites();
    selectedClass = 'guerrero'; currentArena = 'bosque'; startRun(1); state = 'paused';
    const KEYS = ["tanque", "guerrero", "mago", "soporte", "segador", "axiom", "profeta", "musashi", "cazadora", "nigromante", "libertador", "eren"];
    const COLS = [["idle_front", h => { h.fx = 0; h.fy = 1; }], ["idle_side", h => { h.fx = 1; h.fy = 0; }], ["walk_side", h => { h.moving = true; h.animT = 180; h.fx = 1; h.fy = 0; }], ["walk_down", h => { h.moving = true; h.animT = 180; h.fx = 0; h.fy = 1; }], ["attack", h => { h._aDur = 300; h._aPrev = 300; h.attackAnim = 150; }], ["hurt", h => { h.hurtTimer = 100; }]];
    const CW = 180, CH = 200, LH = 20;
    const cvs = document.createElement('canvas'); cvs.id = 'lab'; cvs.width = 110 + CW * COLS.length; cvs.height = LH + CH * KEYS.length;
    cvs.style.cssText = 'position:fixed;left:0;top:0;z-index:9999;';
    document.body.appendChild(cvs);
    const g = cvs.getContext('2d');
    const grad = g.createLinearGradient(0, 0, 0, cvs.height);
    grad.addColorStop(0, '#5a5f56'); grad.addColorStop(1, '#3a3f36');
    g.fillStyle = grad; g.fillRect(0, 0, cvs.width, cvs.height);
    g.fillStyle = '#fff'; g.font = '13px monospace';
    COLS.forEach((c, i) => g.fillText(c[0], 110 + i * CW + 6, 15));
    const saved = ctx; animNow = performance.now();
    KEYS.forEach((k, ri) => {
      g.fillStyle = '#fff'; g.font = 'bold 14px monospace'; g.fillText(k, 6, LH + ri * CH + CH / 2);
      COLS.forEach((c, ci) => {
        const h = makeHero(k, true, 0, 0);
        h.fx = 1; h.fy = 0; h.moving = false; h.animT = 0; h.attackAnim = 0; h.hurtTimer = 0;
        c[1](h);
        const cx = 110 + ci * CW + CW / 2, cy = LH + ri * CH + CH * 0.86;
        g.save(); g.strokeStyle = 'rgba(255,255,255,0.15)'; g.strokeRect(110 + ci * CW, LH + ri * CH, CW, CH);
        g.beginPath(); g.moveTo(110 + ci * CW, cy); g.lineTo(110 + (ci + 1) * CW, cy); g.strokeStyle = 'rgba(255,255,255,0.25)'; g.stroke();
        g.translate(cx, cy); g.imageSmoothingEnabled = false;
        ctx = g;
        try { h.x = 0; h.y = 0; drawHeroBody(h, h.scale, false, false); }
        catch (e) { g.fillStyle = 'red'; g.fillText('ERR ' + e.message.slice(0, 30), -50, -20); }
        ctx = saved; g.restore();
      });
    });
    return [cvs.width, cvs.height];
  });
  await page.setViewportSize({ width: Math.max(800, dims[0]), height: Math.max(600, dims[1]) });
  await (await page.$('#lab')).screenshot({ path: out });
  console.log('dims', dims, 'errors', errors.slice(0, 4));
  await browser.close();
})();
