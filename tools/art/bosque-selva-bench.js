'use strict';
/* BENCH + CAPTURAS DE LA ARENA "Ruinas del Bosque" (currentArena="bosque").
   Chromium headless (NO es un iPhone real): viewport 844x390, DPR 3, isMobile + touch, y throttling de CPU
   por CDP (Emulation.setCPUThrottlingRate). Mide con el juego real jugando: frame time por requestAnimationFrame
   (FPS, p50/p95/p99) y, envolviendo update()/render(), cuánto cuesta cada uno por cuadro.
   Uso: node tools/art/bosque-selva-bench.js <etiqueta> [--shots] [--rates=1,4,6] [--secs=10]
        → docs/bosque-selva/<etiqueta>/bench.json (+ capturas con --shots)
   Variables: CHROMIUM_PATH (por defecto /opt/pw-browsers/chromium), PLAYWRIGHT_MODULE. */
const fs = require('node:fs'), path = require('node:path'), {spawn} = require('node:child_process');
let chromium; try { ({chromium} = require('playwright')); } catch (e) { ({chromium} = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const ROOT = path.resolve(__dirname, '../..'), PORT = +(process.env.BENCH_PORT || 8841);
const label = process.argv[2] || 'run';
const SHOTS = process.argv.includes('--shots');
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const RATES = arg('rates', '1,4,6').split(',').map(Number), SECS = +arg('secs', 10);
const OUT = path.join(ROOT, 'docs/bosque-selva', label); fs.mkdirSync(OUT, {recursive: true});
const sleep = ms => new Promise(r => setTimeout(r, ms));
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], {cwd: ROOT, stdio: 'ignore'});

(async () => {
  await sleep(700);
  const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium', args: ['--no-sandbox']});
  const result = {label, note: 'Chromium headless con viewport 844x390 y CPU throttling: NO es una prueba en un iPhone real.', viewport: '844x390@DPR3', secs: SECS, runs: []};
  try {
    const ctx = await browser.newContext({viewport: {width: 844, height: 390}, deviceScaleFactor: 3, isMobile: true, hasTouch: true});
    const page = await ctx.newPage(); const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, {waitUntil: 'domcontentloaded', timeout: 120000});
    await page.waitForFunction(() => typeof startRun === 'function' && typeof ARENA_ORDER !== 'undefined', null, {timeout: 120000});
    await sleep(2500);
    const cdp = await ctx.newCDPSession(page);
    const setup = async () => page.evaluate(() => {
      let s = 7; Math.random = () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
      for (const ck in save.champions) { const c = save.champions[ck]; c.unlocked = true; c.level = 12; }
      selectedClass = 'tanque'; currentArena = 'bosque'; lobbyAllies = ['soporte', 'mago', 'guerrero']; netMatch = null;
      startRun(3); setState('playing');
      for (const h of heroes) { h.hp = h.maxHp = 1e8; }
      return {order0: ARENA_ORDER[0], arena: currentArena, x: player.x, y: player.y};
    });
    result.setup = await setup();
    if (SHOTS) {
      const spots = [['centro', 0, 0], ['noroeste_ruinas', -520, -250], ['este_sendero', 420, 120], ['sur_arroyo', 150, 430], ['borde_oeste', -820, 60]];
      for (const [name, x, y] of spots) {
        await page.evaluate(([x, y]) => { enemies = []; spawnTimer = 1e9; for (const h of heroes) { h.x = x + (h === player ? 0 : 60); h.y = y + (h === player ? 0 : 50); } }, [x, y]);
        await sleep(900);
        await page.screenshot({path: path.join(OUT, `${name}.png`)});
      }
    }
    for (const rate of RATES) {
      await setup();
      await cdp.send('Emulation.setCPUThrottlingRate', {rate});
      await sleep(600);
      const r = await page.evaluate(async secs => {
        const rt = [], ut = [], dts = [];
        const oR = window.render, oU = window.update;
        window.render = function () { const t = performance.now(); const v = oR.apply(this, arguments); rt.push(performance.now() - t); return v; };
        window.update = function () { const t = performance.now(); const v = oU.apply(this, arguments); ut.push(performance.now() - t); return v; };
        // el jugador recorre la arena con el joystick real (rumbo que gira) mientras la horda lo persigue
        let last = performance.now(), t0 = last, a = 0;
        await new Promise(res => {
          const tick = now => {
            dts.push(now - last); last = now;
            a += 0.012; joyVec = {x: Math.cos(a * 1.3), y: Math.sin(a * 1.9)};
            for (const h of heroes) h.hp = h.maxHp;
            if (now - t0 < secs * 1000) requestAnimationFrame(tick); else res();
          };
          requestAnimationFrame(tick);
        });
        joyVec = {x: 0, y: 0};
        window.render = oR; window.update = oU;
        const st = (arr) => { const s = arr.slice().sort((x, y) => x - y), n = s.length, q = p => s[Math.min(n - 1, Math.floor(n * p))]; return {n, avg: +(s.reduce((x, y) => x + y, 0) / n).toFixed(2), p50: +q(0.5).toFixed(2), p95: +q(0.95).toFixed(2), p99: +q(0.99).toFixed(2), max: +s[n - 1].toFixed(2)}; };
        const d = dts.slice(2);
        return {frameMs: st(d), fpsAvg: +(1000 / (d.reduce((x, y) => x + y, 0) / d.length)).toFixed(1), renderMs: st(rt), updateMs: st(ut), enemiesAlive: enemies.length, props: aidProps.length, solids: aidSolids.length, walls: labyrinthWalls.length, inBounds: heroes.every(h => Math.abs(h.x) < 3000 && isFinite(h.x))};
      }, SECS);
      // costo de render() SIN rAF ni compositor (300 llamadas síncronas, héroes quietos): menos ruido que el FPS de headless
      r.syncRenderMs = await page.evaluate(() => { const a = []; for (let i = 0; i < 20; i++) render(); for (let i = 0; i < 300; i++) { const t = performance.now(); render(); a.push(performance.now() - t); } a.sort((x, y) => x - y); return {avg: +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(2), p50: +a[150].toFixed(2), p95: +a[285].toFixed(2)}; });
      result.runs.push({cpuThrottle: rate, ...r});
      console.log(`[${label}] cpu x${rate}: ${r.fpsAvg} fps · frame p50/p95/p99 ${r.frameMs.p50}/${r.frameMs.p95}/${r.frameMs.p99} ms · render avg/p95 ${r.renderMs.avg}/${r.renderMs.p95} ms · update avg ${r.updateMs.avg} ms · render sincrono avg/p50/p95 ${r.syncRenderMs.avg}/${r.syncRenderMs.p50}/${r.syncRenderMs.p95} ms · enemigos ${r.enemiesAlive}`);
    }
    await cdp.send('Emulation.setCPUThrottlingRate', {rate: 1});
    result.pageErrors = errors.slice(0, 10);
    fs.writeFileSync(path.join(OUT, 'bench.json'), JSON.stringify(result, null, 1));
  } finally { await browser.close(); server.kill(); }
})().catch(e => { console.error(e); server.kill(); process.exit(1); });
