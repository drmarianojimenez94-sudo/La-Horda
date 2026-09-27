// AUDITORÍA — tiempo de carga con red de celular simulada (4G ~12 Mbit/s, 60 ms), en un iPhone
// horizontal emulado. Compara la carga vieja (?lazy=0&webp=0: todo junto, PNG) con la nueva (dos
// tandas + WebP) y, en la nueva, juega el recorrido completo hasta la partida.
//   (python3 -m http.server 8771 &) ; node tools/audit/loadtime.js [outdir]
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const path = require('path'), fs = require('fs');
const BASE = process.env.SE_BASE_URL || 'http://127.0.0.1:8771';
const OUT = process.argv[2] || '/tmp/loadtime'; fs.mkdirSync(OUT, { recursive: true });
const MBPS = parseFloat(process.env.MBPS || '12');
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); if (!ok) fails++; };
async function run(browser, query, full) {
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await ctx.addInitScript(() => { window.__campaignMode = true; });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 60, downloadThroughput: MBPS * 1e6 / 8, uploadThroughput: 3e6 / 8 });
  const errors = []; let bytes = 0, bytesAtTitle = 0, arenaReqBeforeTitle = 0, titleReady = false;
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/fonts\.g|ERR_CERT/.test(m.text())) errors.push(m.text()); });
  page.on('requestfinished', async r => { try { const s = await r.sizes(); bytes += s.responseBodySize; if (!titleReady && /assets\/(sprites\/(arenas|enemies|bosses)|vfx)\//.test(r.url())) arenaReqBeforeTitle++; } catch (e) {} });
  const t0 = Date.now();
  await page.goto(`${BASE}/index.html${query}`, { waitUntil: 'commit' });
  let tTitle = null, tAll = null;
  for (let k = 0; k < 2400; k++) {
    await sleep(100);
    const st = await page.evaluate(() => { const b = document.getElementById('title-continue-btn'); return { t: !!(b && !b.disabled && /Toca/.test(b.textContent)), all: typeof assetsAllReady === 'function' ? assetsAllReady() : null }; }).catch(() => ({}));
    if (st.t && tTitle === null) { tTitle = Date.now() - t0; titleReady = true; bytesAtTitle = bytes; }
    if (tTitle !== null && (st.all || !full)) { tAll = st.all ? Date.now() - t0 : null; break; }
  }
  const res = { query, tTitle, tAll, MB_at_title: +(bytesAtTitle / 1048576).toFixed(1), arenaReqBeforeTitle };
  if (full) {
    // el recorrido del jugador, SIN esperar a la segunda tanda: se toca apenas se puede
    const tap = async sel => { const el = await page.$(sel); await el.evaluate(e => e.scrollIntoView({ block: 'center' })); const b = await el.boundingBox(); await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); await sleep(500); };
    await page.reload({ waitUntil: 'commit' });
    const t1 = Date.now();
    for (let k = 0; k < 1200; k++) { await sleep(100); if (await page.evaluate(() => { const b = document.getElementById('title-continue-btn'); return b && !b.disabled && /Toca/.test(b.textContent); }).catch(() => false)) break; }
    res.tTitleCached = Date.now() - t1;
    await tap('#title-continue-btn');
    await page.evaluate(() => { const c = [...document.querySelectorAll('#starter-grid > *')].find(x => /Mago/.test(x.innerText)); c && c.click(); });
    await sleep(400); await tap('#starter-yes-btn'); await tap('#mainmenu-jugar-btn'); await tap('#mode-arena-btn'); await tap('.arena-card'); await tap('#start-btn');
    await tap('#prep-start-btn'); await sleep(600);
    const introBtn = await page.evaluate(() => { const g = document.querySelector('#run-intro .ri-go'); return g ? { txt: g.textContent, dis: g.disabled } : null; });
    res.introAtStart = introBtn;
    await page.screenshot({ path: path.join(OUT, 'intro.png') });
    // prólogo -> ficha -> esperar a que se habilite ¡A LA BATALLA!
    for (let k = 0; k < 3; k++) { await sleep(600); await page.evaluate(() => { const g = document.querySelector('#run-intro .ri-go'); if (g && !g.disabled) g.click(); }); if (await page.evaluate(() => state === 'playing')) break; }
    for (let k = 0; k < 600 && !(await page.evaluate(() => state === 'playing')); k++) { await sleep(200); await page.evaluate(() => { const g = document.querySelector('#run-intro .ri-go'); if (g && !g.disabled) g.click(); }); }
    res.playingAfterMs = Date.now() - t1;
    res.allReadyWhenPlaying = await page.evaluate(() => assetsAllReady());
    await sleep(9000);
    await page.screenshot({ path: path.join(OUT, 'playing.png') });
    const vis = await page.evaluate(() => {
      const bad = []; let n = 0;
      for (const im of document.images) { if (im.__lazySrc) bad.push('pendiente ' + im.__lazySrc); }
      return { enemies: enemies.filter(e => e.alive).length, pendientes: bad.length, sample: bad.slice(0, 3), webp: LAZY_IMG.webp };
    });
    res.inGame = vis;
  }
  res.errors = errors.slice(0, 5);
  await ctx.close();
  return res;
}
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const before = await run(browser, '?lazy=0&webp=0', false);
  console.log('ANTES', JSON.stringify(before));
  const after = await run(browser, '?lazy=1', true);
  console.log('AHORA', JSON.stringify(after));
  check('titulo_mas_rapido', after.tTitle < before.tTitle * 0.5, { antes: before.tTitle, ahora: after.tTitle });
  check('arte_de_arena_no_frena_el_titulo', after.arenaReqBeforeTitle === 0, after.arenaReqBeforeTitle);
  check('la_partida_arranca_con_todo_cargado', after.allReadyWhenPlaying === true, after.allReadyWhenPlaying);
  check('ninguna_imagen_quedo_pendiente', after.inGame && after.inGame.pendientes === 0, after.inGame);
  check('usa_webp', after.inGame && after.inGame.webp === true);
  // la carga nueva no puede tener errores; la de referencia (?lazy=0, baja ~50 MB de golpe) se informa aparte:
  // contra GitHub Pages a veces recibe un 503 pasajero de la CDN y no es lo que se está midiendo
  check('sin_errores', after.errors.length === 0, after.errors);
  if (before.errors.length) console.log('INFO errores_en_la_referencia ' + JSON.stringify(before.errors));
  await browser.close();
  console.log(`SUMMARY ${fails ? 'FAIL' : 'OK'} fails=${fails}`);
  process.exit(fails ? 1 : 0);
})();
