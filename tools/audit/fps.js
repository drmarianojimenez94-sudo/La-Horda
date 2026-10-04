// AUDITORÍA — fluidez con CPU de celular de gama media simulada (Chrome: CPU 4x más lenta), iPhone
// horizontal, en el tramo más cargado (nivel 8-9 de una arena, horda grande). Mide durante 20 s reales:
//   · script: lo que cuesta el CÓDIGO del juego por cuadro (update + render) con la CPU ×4 — es lo que modela el
//     estrangulamiento de CPU y lo que el juego controla. Por defecto con el canvas chico (DPR 1, ?res=0.5) para que el
//     rasterizado por software de esta máquina sin GPU no se cuele en la medida.
//   · raf: intervalo real entre cuadros en ESTA máquina (sin GPU: el canvas se rasteriza y compone por software). Es
//     informativo: en un celular el rasterizado y la composición van por la GPU. El FPS real en un teléfono es juicio
//     humano pendiente (docs/quality/SCORECARD.md).
//   Variables: DPR (default 1), Q (default ?res=0.5).
//   (python3 -m http.server 8771 &) ; node tools/audit/fps.js [arena] [cpuRate]
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const path = require('path');
const BASE = process.env.SE_BASE_URL || 'http://127.0.0.1:8771';
const ARENA = process.argv[2] || 'ciudad', RATE = parseFloat(process.argv[3] || '4');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: +(process.env.DPR || 1) });
  await ctx.addInitScript(() => { window.__campaignMode = true; });
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${BASE}/index.html${process.env.Q != null ? process.env.Q : '?res=0.5'}`);
  for (let k = 0; k < 300; k++) { if (await page.evaluate(() => { const b = document.getElementById('title-continue-btn'); return b && !b.disabled; })) break; await sleep(100); }
  await page.addScriptTag({ path: path.join(__dirname, '../playtest/autopilot.js') });
  await page.evaluate((a) => { save.starterChosen = true; for (const k in save.champions) { save.champions[k].unlocked = true; save.champions[k].level = 30; } __AP.start('mago', a, 8); }, ARENA);
  await sleep(4000);
  const cdp = await ctx.newCDPSession(page);
  await page.evaluate(() => { const S = window.__st = []; const u0 = window.update, r0 = window.render; let acc = 0;
    window.update = function () { const t = performance.now(); try { return u0.apply(this, arguments); } finally { acc = performance.now() - t; } };
    window.render = function () { const t = performance.now(); try { return r0.apply(this, arguments); } finally { S.push(acc + performance.now() - t); acc = 0; } }; });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: RATE });
  await page.evaluate(() => { window.__ft = []; let last = performance.now(); const f = (t) => { window.__ft.push(t - last); last = t; if (window.__ft.length < 5000) requestAnimationFrame(f); }; requestAnimationFrame(f); });
  let maxEn = 0;
  for (let k = 0; k < 30; k++) { await sleep(1000); maxEn = Math.max(maxEn, await page.evaluate(() => { if (state === 'buff' && typeof AP !== 'undefined' && AP.pickBuff) AP.pickBuff(); return enemies.filter(e => e.alive).length; })); }
  const r = await page.evaluate(() => { const a = window.__ft.slice(5).sort((x, y) => x - y); const q = p => a[Math.floor(a.length * p)] || 0; return { frames: a.length, med: +q(0.5).toFixed(1), p95: +q(0.95).toFixed(1), slowPct: Math.round(100 * a.filter(x => x > 33.4).length / Math.max(1, a.length)) }; });
  const sc = await page.evaluate(() => { const a = window.__st.slice(5).sort((x, y) => x - y); const q = p => a[Math.floor(a.length * p)] || 0;
    return { scriptMed: +q(0.5).toFixed(1), scriptP95: +q(0.95).toFixed(1), scriptSlowPct: Math.round(100 * a.filter(x => x > 33.4).length / Math.max(1, a.length)), canvas: [canvas.width, canvas.height] }; });
  Object.assign(r, sc); r.scriptFps = Math.round(1000 / Math.max(16.7, sc.scriptMed));
  r.fpsMed = Math.round(1000 / r.med); r.maxEnemies = maxEn; r.arena = ARENA; r.cpu = RATE + 'x'; r.errors = errors.slice(0, 3);
  console.log(JSON.stringify(r));
  await browser.close();
})();
