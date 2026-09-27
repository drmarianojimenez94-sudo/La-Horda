// AUDITORÍA — niveles de audio medidos (no hay parlantes en el entorno de pruebas): se engancha un
// analizador a la salida del compresor maestro y se mide durante una partida real con el piloto
// automático: pico, saturación (muestras >= 0.99), volumen medio (RMS) por tramo y silencios.
//   (python3 -m http.server 8771 &) ; node tools/audit/audio_levels.js
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const path = require('path');
const BASE = process.env.SE_BASE_URL || 'http://127.0.0.1:8771';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); if (!ok) fails++; };
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 } });
  await ctx.addInitScript(() => {
    window.__campaignMode = true;
    const C = window.AudioContext || window.webkitAudioContext;
    const orig = C.prototype.createDynamicsCompressor;
    C.prototype.createDynamicsCompressor = function () { const n = orig.call(this); if (!window.__comp) window.__comp = n; return n; };
  });
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${BASE}/index.html`);
  for (let k = 0; k < 300; k++) { if (await page.evaluate(() => { const b = document.getElementById('title-continue-btn'); return b && !b.disabled; })) break; await sleep(100); }
  await page.click('#title-continue-btn');
  await page.addScriptTag({ path: path.join(__dirname, '../playtest/autopilot.js') });
  await page.evaluate(() => {
    save.starterChosen = true; save.champions.mago.unlocked = true;
    const an = audioCtx.createAnalyser(); an.fftSize = 2048; window.__comp.connect(an);
    const buf = new Float32Array(an.fftSize);
    window.__lv = { samples: [], clip: 0, n: 0, peak: 0 };
    setInterval(() => {
      an.getFloatTimeDomainData(buf); let s = 0, pk = 0, c = 0;
      for (let i = 0; i < buf.length; i++) { const a = Math.abs(buf[i]); s += a * a; if (a > pk) pk = a; if (a >= 0.99) c++; }
      const L = window.__lv; L.samples.push({ rms: Math.sqrt(s / buf.length), pk, mode: typeof musicMode !== 'undefined' ? musicMode : '?', st: state });
      L.clip += c; L.n += buf.length; if (pk > L.peak) L.peak = pk;
    }, 100);
    __AP.start('mago', 'ciudad', 1);
  });
  // partida con el piloto (tiempo real: el audio corre en tiempo real)
  for (let k = 0; k < 60; k++) { await sleep(1000); await page.evaluate(() => { if (state === 'buff' && typeof AP !== 'undefined' && AP.pickBuff) AP.pickBuff(); }).catch(() => {}); }
  const r = await page.evaluate(() => {
    const L = window.__lv, db = x => x > 0 ? Math.round(20 * Math.log10(x) * 10) / 10 : -99;
    const play = L.samples.filter(s => s.st === 'playing');
    const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
    const rmsPlay = mean(play.map(s => s.rms));
    const silent = play.filter(s => s.rms < 0.001).length / Math.max(1, play.length);
    return { ctxState: audioCtx.state, t: Math.round(audioCtx.currentTime), frames: L.samples.length, peak_dBFS: db(L.peak), clip_pct: +(100 * L.clip / Math.max(1, L.n)).toFixed(3), rms_play_dBFS: db(rmsPlay), silent_pct: Math.round(silent * 100), modes: [...new Set(L.samples.map(s => s.mode))] };
  });
  console.log(JSON.stringify(r));
  check('audio_corre', r.ctxState === 'running' && r.t > 30, r.ctxState + ' t=' + r.t);
  check('sin_saturacion', r.clip_pct < 0.1, r.clip_pct);
  check('pico_bajo_0dB', r.peak_dBFS <= -0.1, r.peak_dBFS);
  check('volumen_de_juego_razonable', r.rms_play_dBFS > -36 && r.rms_play_dBFS < -8, r.rms_play_dBFS);
  check('casi_sin_silencios_en_partida', r.silent_pct < 20, r.silent_pct);
  check('sin_errores', errors.length === 0, errors.slice(0, 3));
  await browser.close();
  console.log(`SUMMARY ${fails ? 'FAIL' : 'OK'} fails=${fails}`);
  process.exit(fails ? 1 : 0);
})();
