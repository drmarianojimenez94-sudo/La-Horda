// MEZCLA DE AUDIO medida (no hay parlantes en el entorno de pruebas): el motor real de js/audio/ se
// arma sobre un OfflineAudioContext y se renderiza una ráfaga típica de combate + música (oleada ->
// rugido del jefe -> jefe -> muerte del jefe -> victoria), una prueba de ESTRÉS (decenas de efectos
// por cuadro) y la música de cada arena de la campaña. Mide sobre las muestras:
//   pico (dBFS), RMS, clipping (pico < -1 dBFS), NaN, nodos vivos (que no crezcan sin fin),
//   huecos de silencio en las transiciones y cuánto se diferencian las arenas entre sí (espectro).
// Después, en un AudioContext real: costo en el hilo principal por cuadro (playSfx + secuenciador) y
// una partida corta con el piloto automático sin errores de consola.
//   node tools/audio/t_audio_mix.js            (levanta su propio servidor en 127.0.0.1:8796)
//   SE_BASE_URL=http://127.0.0.1:8796 node tools/audio/t_audio_mix.js   (servidor ya levantado)
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const path = require('path'), http = require('http'), { spawn } = require('child_process');
const PORT = 8796, ROOT = path.join(__dirname, '../..');
const BASE = process.env.SE_BASE_URL || `http://127.0.0.1:${PORT}`;
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 500) : '')); if (!ok) fails++; };
const info = (n, x) => console.log('INFO ' + n + '  ' + JSON.stringify(x).slice(0, 900));
const up = () => new Promise(res => { const rq = http.get(BASE + '/index.html', r => { r.resume(); res(r.statusCode === 200); }); rq.on('error', () => res(false)); rq.setTimeout(800, () => { rq.destroy(); res(false); }); });

// ---- código que corre DENTRO de la página: arnés de render offline ----
function pageHarness() {
  const H = window.__AH = {};
  const SR = 44100;
  const db = x => x > 0 ? Math.round(20 * Math.log10(x) * 10) / 10 : -120;
  // cuenta nodos creados y fuentes programadas (inicio/fin) del contexto que se está midiendo
  const BAC = window.BaseAudioContext || window.AudioContext;
  H.created = 0; H.byType = {}; H.src = []; H.ctx = null;
  for (const k of Object.getOwnPropertyNames(BAC.prototype)) {
    if (!/^create/.test(k) || typeof BAC.prototype[k] !== 'function' || k === 'createPeriodicWave' || k === 'createBuffer') continue;
    const orig = BAC.prototype[k];
    BAC.prototype[k] = function () { const n = orig.apply(this, arguments); if (this === H.ctx) { H.created++; H.byType[k] = (H.byType[k] || 0) + 1; } return n; };
  }
  const ASN = window.AudioScheduledSourceNode.prototype;
  const oStart = ASN.start, oStop = ASN.stop;
  ASN.start = function (when) { if (this.context === H.ctx) { this.__rec = [when || this.context.currentTime, Infinity]; H.src.push(this.__rec); } return oStart.apply(this, arguments); };
  ASN.stop = function (when) { if (this.__rec) this.__rec[1] = when === undefined ? this.context.currentTime : when; return oStop.apply(this, arguments); };
  H.live = t => { let n = 0; for (const r of H.src) if (r[0] <= t && r[1] > t) n++; return n; };
  // todo lo que se conecta al destino también pasa por un analizador (espectro por arena)
  const oConnect = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (dst) {
    const r = oConnect.apply(this, arguments);
    if (dst && dst === this.context.destination && H.an && this.context === H.ctx) oConnect.call(this, H.an);
    return r;
  };
  const pn = performance.now.bind(performance); let fakeMs = null;
  // Reinicia el motor para renderizar sobre un contexto nuevo (el juego no lo expone: se usa lo global)
  H.reset = () => {
    try { if (typeof M !== 'undefined') { if (M.timer) clearInterval(M.timer); Object.assign(M, { mode: 'off', pending: null, step: 0, bar: 0, next: 0, timer: null, wanted: null }); } } catch (e) {}
    try { for (const k of Object.keys(_sfxLast)) delete _sfxLast[k]; } catch (e) {}
    try { _sfxVoices = []; } catch (e) {}
    try { if (typeof _audioResetGraph === 'function') _audioResetGraph(); } catch (e) {}
    audioCtx = null; musicStarted = false;
  };
  // Renderiza `dur` segundos. events: [[t, () => ...]]. Devuelve métricas.
  H.render = async (dur, events, opt) => {
    opt = opt || {};
    H.reset();
    const oc = new OfflineAudioContext(2, Math.ceil(SR * dur), SR);
    H.ctx = oc; H.created = 0; H.byType = {}; H.src = [];
    H.an = oc.createAnalyser(); H.an.fftSize = 2048; H.an.smoothingTimeConstant = 0;
    const AC0 = window.AudioContext, wAC0 = window.webkitAudioContext;
    window.AudioContext = function () { return oc; }; window.webkitAudioContext = window.AudioContext;
    const origNow = performance.now; performance.now = () => fakeMs != null ? fakeMs : pn();
    fakeMs = 1e7;
    try { initAudio(); } finally { window.AudioContext = AC0; window.webkitAudioContext = wAC0; }
    if (opt.arena) currentArena = opt.arena;
    if (opt.setup) opt.setup();
    const ev = events.slice().sort((a, b) => a[0] - b[0]); let ei = 0;
    const liveSeries = [], spec = new Float32Array(H.an.frequencyBinCount), specAcc = new Float64Array(spec.length); let specN = 0;
    const step = 0.05; let errs = [];
    const tick = () => {
      const t = oc.currentTime; fakeMs = 1e7 + t * 1000;
      while (ei < ev.length && ev[ei][0] <= t + 1e-6) { try { ev[ei][1](); } catch (e) { errs.push(String(e)); } ei++; }
      try { if (typeof _schedTick === 'function') _schedTick(); } catch (e) { errs.push(String(e)); }
      liveSeries.push([Math.round(t * 100) / 100, H.live(t)]);
      if (opt.spectrum && t > (opt.specFrom || 0)) { H.an.getFloatFrequencyData(spec); for (let i = 0; i < spec.length; i++) specAcc[i] += Math.pow(10, Math.max(-140, spec[i]) / 20); specN++; }
    };
    for (let t = step; t < dur - 0.01; t += step) oc.suspend(t).then(() => { tick(); oc.resume(); });
    tick();
    const w0 = pn();
    const buf = await oc.startRendering();
    const wall = pn() - w0;
    performance.now = origNow; fakeMs = null;
    // métricas sobre las muestras
    const L = buf.getChannelData(0), R = buf.getChannelData(1);
    let pk = 0, s2 = 0, nan = 0, clip = 0, knee = 0; const N = L.length;
    const win = Math.round(SR * 0.4), wins = [];
    let ws = 0, wn = 0;
    const i0 = Math.floor((opt.from || 0) * SR);
    for (let i = i0; i < N; i++) {
      const a = L[i], b = R[i];
      if (a !== a || b !== b) { nan++; continue; }
      const m = Math.max(Math.abs(a), Math.abs(b)); if (m > pk) pk = m; if (m >= 0.8913) clip++; if (m >= 0.7079) knee++;
      const e = (a * a + b * b) / 2; s2 += e; ws += e; wn++;
      if (wn === win) { wins.push(Math.sqrt(ws / wn)); ws = 0; wn = 0; }
    }
    const res = { dur, wall_ms: Math.round(wall), dsp_load_pct: +(100 * wall / 1000 / dur).toFixed(1), peak_dBFS: db(pk), over3dB_pct: +(100 * knee / Math.max(1, N - i0)).toFixed(3), rms_dBFS: db(Math.sqrt(s2 / Math.max(1, N - i0))), nan, clip,
      rms_win_max_dBFS: db(Math.max(...wins)), created: H.created, byType: H.byType,
      live_max: Math.max(...liveSeries.map(x => x[1])), live_end: liveSeries[liveSeries.length - 1][1],
      never_stopped: H.src.filter(r => r[1] === Infinity).length, errs: errs.slice(0, 3) };
    res.winsDb = wins.map(db);
    res.liveSeries = liveSeries;
    if (opt.spectrum && specN) {
      // 20 bandas logarítmicas 60 Hz..12 kHz (dB medios) + centroide
      const bins = spec.length, hz = i => i * SR / 2 / bins, bands = []; let cN = 0, cD = 0;
      for (let i = 1; i < bins; i++) { const m = specAcc[i] / specN; cN += hz(i) * m; cD += m; }
      for (let b = 0; b < 20; b++) {
        const f0 = 60 * Math.pow(200, b / 20), f1 = 60 * Math.pow(200, (b + 1) / 20); let s = 0, n = 0;
        for (let i = 1; i < bins; i++) { const f = hz(i); if (f >= f0 && f < f1) { s += specAcc[i] / specN; n++; } }
        bands.push(db(n ? s / n : 0));
      }
      res.bands = bands; res.centroid_hz = Math.round(cN / cD);
    }
    return res;
  };
  return true;
}

(async () => {
  let server = null;
  if (!(await up())) {
    server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
    for (let k = 0; k < 50 && !(await up()); k++) await sleep(200);
  }
  const browser = await chromium.launch({ args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const out = { };
  try {
    const ctx = await browser.newContext({ viewport: { width: 844, height: 390 } });
    await ctx.addInitScript(() => {
      window.__campaignMode = true;
      try { localStorage.removeItem('horda_vol'); localStorage.removeItem('horda_mute'); } catch (e) {}
      // analizador en vivo: todo lo que llega al destino del contexto real
      const oConnect = AudioNode.prototype.connect;
      AudioNode.prototype.connect = function (dst) {
        const r = oConnect.apply(this, arguments);
        try {
          if (dst && dst === this.context.destination && !(this.context instanceof OfflineAudioContext)) {
            const c = this.context; if (!c.__an) { c.__an = c.createAnalyser(); c.__an.fftSize = 2048; window.__liveAn = c.__an; }
            oConnect.call(this, c.__an);
          }
        } catch (e) {}
        return r;
      };
    });
    const page = await ctx.newPage(); const errors = [];
    page.on('pageerror', e => errors.push('pageerror: ' + e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
    page.on('console', m => { if (m.type() === 'error' && !/ERR_CERT|fonts\.g|net::|404/.test(m.text())) errors.push('console: ' + m.text().slice(0, 300)); });
    await page.goto(`${BASE}/index.html`, { waitUntil: 'load' });
    for (let k = 0; k < 300; k++) { if (await page.evaluate(() => { const b = document.getElementById('title-continue-btn'); return b && !b.disabled; })) break; await sleep(100); }
    await page.evaluate(pageHarness);
    const E = (fn, a) => page.evaluate(fn, a);

    // ---------------- 1) ráfaga típica de combate + música ----------------
    const combat = await E(async () => { window.__combatEv = () => {
      const ev = [];
      const P = (t, ty, a) => ev.push([t, () => playSfx(ty, a)]);
      const foe = { type: 'x', material: 'flesh', _lastDmgKind: 'physical' };
      ev.push([0, () => setMusicMode('wave', 5)]);
      // 0.5..6 s: oleada llena. Golpes del jugador, muertes, sangre, daño recibido, habilidades.
      for (let t = 0.5; t < 6; t += 0.11) P(t, Math.random() < 0.15 ? 'crit' : 'hit', foe);
      for (let t = 0.7; t < 6; t += 0.33) { P(t, 'kill', foe); if (Math.random() < 0.5) P(t + 0.02, 'splat'); }
      for (let t = 1.0; t < 6; t += 0.9) { P(t, 'skillHit'); P(t + 0.05, 'heavy'); P(t + 0.3, 'cast'); }
      for (let t = 1.3; t < 6; t += 1.4) { P(t, 'hurt'); P(t + 0.4, 'gib'); P(t + 0.6, 'shatter'); P(t + 0.8, 'zap'); }
      P(2.5, 'eliteKill', foe); P(3.2, 'boom'); P(3.9, 'hurtHeavy'); P(4.4, 'bigKill'); P(5.0, 'ult');
      // 6 s: entra el jefe
      P(6.0, 'bossRoar'); ev.push([6.05, () => setMusicMode('boss')]);
      for (let t = 6.4; t < 11; t += 0.12) P(t, Math.random() < 0.2 ? 'crit' : 'hit', { material: 'rock' });
      for (let t = 6.6; t < 11; t += 0.8) { P(t, 'heavy'); P(t + 0.2, 'skillHit'); P(t + 0.45, 'kill', foe); }
      P(8.0, 'bossRoar'); P(8.6, 'hurtHeavy'); P(9.2, 'thunder'); P(9.8, 'stomp');
      P(11.0, 'bossDeath'); ev.push([12.2, () => setMusicMode('victory')]); P(12.4, 'victory');
      P(13.5, 'lootLegend');
      return ev; };
      // carga DSP: el mínimo de 3 renders (la máquina de pruebas es compartida y el tiempo varía)
      let best = null;
      for (let k = 0; k < 3; k++) { const r = await __AH.render(16, window.__combatEv(), { arena: 'ciudad' }); if (!best) best = r; best.wall_ms = Math.min(best.wall_ms, r.wall_ms); }
      best.dsp_load_pct = +(100 * best.wall_ms / 1000 / 16).toFixed(1);
      return best;
    });
    out.combat = combat;
    info('combate', { peak: combat.peak_dBFS, sobre_3dB_pct: combat.over3dB_pct, rms: combat.rms_dBFS, rmsWinMax: combat.rms_win_max_dBFS, nodos: combat.created, vivos_max: combat.live_max, vivos_fin: combat.live_end, sin_stop: combat.never_stopped, dsp: combat.dsp_load_pct + '%', wall: combat.wall_ms });
    info('combate_rms_por_ventana_400ms', combat.winsDb);
    check('MIX.combate_sin_NaN', combat.nan === 0, combat.nan);
    check('MIX.combate_pico_bajo_-1dBFS', combat.peak_dBFS < -1, combat.peak_dBFS);
    check('MIX.combate_sin_clipping', combat.clip === 0, combat.clip);
    check('MIX.combate_volumen_razonable', combat.rms_dBFS > -30 && combat.rms_dBFS < -8, combat.rms_dBFS);
    check('MIX.combate_sin_errores', combat.errs.length === 0, combat.errs);
    // transición oleada -> jefe -> victoria sin agujero de silencio (ventanas de 400 ms)
    const trans = combat.winsDb.slice(13, 34);
    check('MIX.transiciones_sin_silencio', Math.min(...trans) > -45, Math.min(...trans));

    // ---------------- 2) estrés: 40 efectos por cuadro durante 6 s ----------------
    const stress = await E(async () => {
      const types = Object.keys(SFX_CFG).filter(k => !/^loot|chest|victory|clear|levelup|bugle|bossDeath/.test(k));
      const ev = [[0, () => setMusicMode('boss')]];
      for (let t = 0.1; t < 6; t += 0.016) ev.push([t, () => { for (let i = 0; i < 40; i++) playSfx(types[(Math.random() * types.length) | 0], { material: ['flesh', 'rock', 'ice', 'spirit', 'bone'][i % 5] }); }]);
      const r = await __AH.render(9, ev, { arena: 'infernal' });
      const a = r.liveSeries.filter(x => x[0] > 1 && x[0] < 3.5).map(x => x[1]), b = r.liveSeries.filter(x => x[0] > 3.5 && x[0] < 6).map(x => x[1]);
      r.live_first = Math.max(...a); r.live_second = Math.max(...b);
      delete r.liveSeries; return r;
    });
    out.stress = stress;
    info('estres', { peak: stress.peak_dBFS, rms: stress.rms_dBFS, nodos_creados: stress.created, vivos_max: stress.live_max, vivos_1a_mitad: stress.live_first, vivos_2a_mitad: stress.live_second, vivos_fin: stress.live_end, sin_stop: stress.never_stopped, dsp: stress.dsp_load_pct + '%' });
    check('MIX.estres_sin_NaN', stress.nan === 0, stress.nan);
    check('MIX.estres_pico_bajo_-1dBFS', stress.peak_dBFS < -1, stress.peak_dBFS);
    check('MIX.estres_nodos_acotados', stress.live_max < 700 && stress.live_second <= stress.live_first * 1.25 + 20, { max: stress.live_max, a: stress.live_first, b: stress.live_second });
    check('MIX.estres_se_liberan_al_terminar', stress.live_end < 60, stress.live_end);
    check('MIX.estres_fuentes_con_fin', stress.never_stopped <= 4, stress.never_stopped);

    // ---------------- 3) identidad musical por arena ----------------
    const arenas = await E(() => CAMPAIGN_ORDER.slice());
    const per = {};
    for (const a of arenas) {
      per[a] = await E(async (a) => {
        const r = await __AH.render(9, [[0, () => setMusicMode('wave', 4)], [5.0, () => setMusicMode('boss')]], { arena: a, spectrum: true, specFrom: 0.8 });
        delete r.liveSeries; delete r.winsDb; return r;
      }, a);
      const r = per[a];
      info('arena_' + a, { peak: r.peak_dBFS, rms: r.rms_dBFS, centroide_hz: r.centroid_hz, nodos: r.created, vivos_max: r.live_max, dsp: r.dsp_load_pct + '%' });
    }
    out.arenas = per;
    let minD = 1e9, pair = null;
    for (let i = 0; i < arenas.length; i++) for (let j = i + 1; j < arenas.length; j++) {
      const A = per[arenas[i]].bands, B = per[arenas[j]].bands; let d = 0; for (let k = 0; k < A.length; k++) d += Math.abs(A[k] - B[k]); d /= A.length;
      if (d < minD) { minD = d; pair = arenas[i] + '/' + arenas[j]; }
    }
    info('arenas_distancia_espectral_minima_dB', { d: +minD.toFixed(2), par: pair });
    check('MIX.arenas_musica_sin_NaN_ni_clipping', arenas.every(a => per[a].nan === 0 && per[a].peak_dBFS < -1), arenas.map(a => per[a].peak_dBFS));
    check('MIX.arenas_con_identidad_propia', minD > 1.5, { minD: +minD.toFixed(2), pair });

    // ---------------- 3b) materiales y variación por disparo ----------------
    const mats = await E(async () => {
      const out = {};
      for (const m of ['flesh', 'wet', 'stone', 'bone', 'shell', 'ice', 'magic', 'fire', 'metal']) {
        const r = await __AH.render(0.6, [[0.05, () => playSfx('kill', m)]], { spectrum: true, specFrom: 0.04 });
        out[m] = { bands: r.bands, centroid_hz: r.centroid_hz, peak: r.peak_dBFS };
      }
      const a = await __AH.render(0.6, [[0.05, () => playSfx('hit', 'flesh')]], { spectrum: true, specFrom: 0.04 });
      const b = await __AH.render(0.6, [[0.05, () => playSfx('hit', 'flesh')]], { spectrum: true, specFrom: 0.04 });
      let d = 0; for (let k = 0; k < a.bands.length; k++) d += Math.abs(a.bands[k] - b.bands[k]);
      return { out, varDiff: +(d / a.bands.length).toFixed(2), varPk: [a.peak_dBFS, b.peak_dBFS] };
    });
    const mk = Object.keys(mats.out); let mMin = 1e9, mPair = null;
    for (let i = 0; i < mk.length; i++) for (let j = i + 1; j < mk.length; j++) {
      const A = mats.out[mk[i]].bands, B = mats.out[mk[j]].bands; let d = 0; for (let k = 0; k < A.length; k++) d += Math.abs(A[k] - B[k]); d /= A.length;
      if (d < mMin) { mMin = d; mPair = mk[i] + '/' + mk[j]; }
    }
    info('materiales_centroide_hz', Object.fromEntries(mk.map(k => [k, mats.out[k].centroid_hz])));
    check('SFX.materiales_suenan_distinto', mMin > 1.5, { minD: +mMin.toFixed(2), par: mPair });
    check('SFX.variacion_por_disparo', mats.varDiff > 0.1, { dif_dB: mats.varDiff, picos: mats.varPk });

    // ---------------- 4) mute y volúmenes ----------------
    const vol = await E(async () => {
      const ev = [[0, () => setMusicMode('wave', 3)]]; for (let t = 0.3; t < 3; t += 0.2) ev.push([t, () => playSfx('heavy')]);
      const muted = await __AH.render(3, ev.concat([[0, () => setAudioEnabled(false)]]), { from: 0.6 });
      setAudioEnabled(true);
      const noMusic = await __AH.render(3, [[0, () => setMusicMode('wave', 3)]], { setup: () => setAudioVolume('music', 0), from: 0.6 });
      setAudioVolume('music', 1);
      return { muted: muted.peak_dBFS, noMusic: noMusic.peak_dBFS };
    });
    info('mute_y_volumen', vol);
    check('MIX.mute_silencia', vol.muted < -60, vol.muted);
    check('MIX.volumen_musica_0_silencia_musica', vol.noMusic < -60, vol.noMusic);

    // ---------------- 5) costo en el hilo principal (contexto real) ----------------
    const cost = await E(async () => {
      __AH.reset();
      startMusic(); setMusicMode('wave', 6);
      await new Promise(r => setTimeout(r, 400));
      const typical = ['hit', 'kill', 'splat', 'crit', 'skillHit', 'hurt', 'heavy', 'gib'];
      const big = ['bossRoar', 'bigKill', 'thunder', 'eliteKill'];
      const foe = { material: 'flesh' };
      const t = []; let f = 0;
      await new Promise(done => {
        const fr = () => {
          const a = performance.now();
          for (let i = 0; i < 4; i++) playSfx(typical[(f * 4 + i) % typical.length], foe);
          if (f % 45 === 0) playSfx(big[(f / 45) % big.length]);
          if (typeof _schedTick === 'function') _schedTick();
          t.push(performance.now() - a);
          if (++f < 240) requestAnimationFrame(fr); else done();
        };
        requestAnimationFrame(fr);
      });
      t.sort((x, y) => x - y);
      const avg = t.reduce((x, y) => x + y, 0) / t.length;
      return { frames: t.length, avg_ms: +avg.toFixed(3), p95_ms: +t[Math.floor(t.length * 0.95)].toFixed(3), max_ms: +t[t.length - 1].toFixed(3), ctx: audioCtx.state };
    }).catch(e => ({ err: String(e) }));
    info('costo_por_cuadro', cost);
    check('MIX.rafaga_4_efectos_por_cuadro_promedio_menor_1ms', cost.avg_ms !== undefined && cost.avg_ms < 1.0, cost);

    // ---------------- 6) partida corta real con el piloto automático ----------------
    await page.goto(`${BASE}/index.html`, { waitUntil: 'load' });
    for (let k = 0; k < 300; k++) { if (await page.evaluate(() => { const b = document.getElementById('title-continue-btn'); return b && !b.disabled; })) break; await sleep(100); }
    await page.click('#title-continue-btn');
    await page.addScriptTag({ path: path.join(ROOT, 'tools/playtest/autopilot.js') });
    await E(() => {
      save.starterChosen = true; save.champions.mago.unlocked = true;
      const an = window.__liveAn; const buf = new Float32Array(2048);
      window.__lv = { pk: 0, clip: 0, s: 0, n: 0, modes: {} };
      window.__lvT = setInterval(() => {
        if (!an) return; an.getFloatTimeDomainData(buf); const L = window.__lv;
        for (let i = 0; i < buf.length; i++) { const a = Math.abs(buf[i]); if (a > L.pk) L.pk = a; if (a >= 0.8913) L.clip++; if (state === 'playing') { L.s += a * a; L.n++; } }
        L.modes[typeof M !== 'undefined' ? M.mode : '?'] = 1;
      }, 100);
      // costo REAL en el hilo principal: tiempo dentro de playSfx + secuenciador, sumado por cuadro
      const F = window.__fc = { acc: 0, frames: [], calls: 0, by: { playSfx: 0, _schedTick: 0 }, maxBy: { playSfx: 0, _schedTick: 0 } };
      const wrap = (name) => { const f = window[name]; window[name] = function () { const a = performance.now(); try { return f.apply(this, arguments); } finally { const d = performance.now() - a; F.acc += d; F.by[name] += d; if (d > F.maxBy[name]) F.maxBy[name] = d; if (name === 'playSfx') F.calls++; } }; };
      wrap('playSfx'); wrap('_schedTick');
      if (typeof M !== 'undefined' && M.timer) { clearInterval(M.timer); M.timer = setInterval(() => window._schedTick(), 25); }
      const fr = () => { F.frames.push(F.acc); F.acc = 0; requestAnimationFrame(fr); }; requestAnimationFrame(fr);
      __AP.start('mago', 'ciudad', 1);
    });
    for (let k = 0; k < 22; k++) { await sleep(1000); await E(() => { if (state === 'buff' && window.__AP) __AP.pickBuff(); }).catch(() => {}); }
    const live = await E(() => { const L = window.__lv, db = x => x > 0 ? Math.round(20 * Math.log10(x) * 10) / 10 : -120;
      return { ctx: audioCtx && audioCtx.state, t: audioCtx ? Math.round(audioCtx.currentTime) : 0, peak_dBFS: db(L.pk), clip: L.clip, rms_play_dBFS: db(Math.sqrt(L.s / Math.max(1, L.n))), modes: Object.keys(L.modes), st: state, apErr: window.__AP && __AP.err || null,
        frame: (() => { const f = window.__fc.frames.slice(30).sort((a, b) => a - b); const n = f.length; return { frames: n, sfx_calls: window.__fc.calls, avg_ms: +(f.reduce((a, b) => a + b, 0) / n).toFixed(3), p95_ms: +f[Math.floor(n * 0.95)].toFixed(3), p99_ms: +f[Math.floor(n * 0.99)].toFixed(3), max_ms: +f[n - 1].toFixed(2), total_sfx_ms: Math.round(window.__fc.by.playSfx), total_sched_ms: Math.round(window.__fc.by._schedTick), max_call_ms: { sfx: +window.__fc.maxBy.playSfx.toFixed(1), sched: +window.__fc.maxBy._schedTick.toFixed(1) } }; })() }; });
    info('partida_en_vivo', live);
    check('JUEGO.audio_corre', live.ctx === 'running' && live.t > 10, live);
    check('JUEGO.pico_en_vivo_bajo_-1dBFS', live.peak_dBFS < -1, live.peak_dBFS);
    check('JUEGO.costo_audio_por_cuadro_menor_1ms', live.frame.p95_ms < 1.0 && live.frame.avg_ms < 0.5, live.frame);
    check('JUEGO.volumen_en_partida_razonable', live.rms_play_dBFS > -36 && live.rms_play_dBFS < -8, live.rms_play_dBFS);
    check('JUEGO.sin_errores_de_consola', errors.length === 0 && !live.apErr, errors.slice(0, 4).concat(live.apErr ? [live.apErr] : []));

    // ---------------- 7) jefe real en tiempo real: rugido, música del jefe, muerte y victoria ----------------
    await E(() => { window.__AP.on = false; window.__lv.modes = {}; window.__lv.pk = 0; window.__lv.clip = 0;
      for (const k of Object.keys(save.champions)) save.champions[k].unlocked = true;
      selectedClass = 'guerrero'; currentArena = 'hielo'; lobbyAllies = ['tanque', 'soporte', 'mago']; startRun(10);
      for (const h of heroes) h.invulnTimer = 1e9; runLevel = LEVEL_COUNT; levelTimer = levelDuration + 1; });
    let bt = null;
    for (let k = 0; k < 40 && !bt; k++) { await sleep(150); bt = await E(() => boss && boss.alive ? boss.type : null); }
    await sleep(1800);
    const kill = () => E(() => { if (boss && boss.alive) { boss.hp = 1; damageEnemy(boss, 1e8, { src: player }); } for (const h of heroes) h.invulnTimer = 1e9; });
    await kill(); await sleep(1500); await kill();
    for (let k = 0; k < 16; k++) { await sleep(500); if (await E(() => state !== 'playing')) break; }
    await sleep(1500);
    const bossRun = await E(() => { const L = window.__lv, db = x => x > 0 ? Math.round(20 * Math.log10(x) * 10) / 10 : -120;
      return { boss: null, modes: Object.keys(L.modes), st: state, peak_dBFS: db(L.pk), clip: L.clip, spaces: typeof AU !== 'undefined' ? Object.keys(AU.spaces || {}) : [], spaceKey: typeof AU !== 'undefined' ? AU.spaceKey : null }; });
    bossRun.boss = bt;
    info('jefe_en_vivo', bossRun);
    check('JUEGO.jefe_musica_jefe_y_victoria', !!bt && bossRun.modes.includes('boss') && bossRun.modes.includes('victory') && bossRun.st === 'victory', bossRun);
    check('JUEGO.jefe_pico_bajo_-1dBFS', bossRun.peak_dBFS < -1 && bossRun.clip === 0, bossRun.peak_dBFS);
    check('JUEGO.jefe_sin_errores_de_consola', errors.length === 0, errors.slice(0, 4));
  } catch (e) {
    console.log('ERROR ' + (e && e.stack || e)); fails++;
  } finally {
    await browser.close();
    if (server) server.kill();
  }
  console.log(`SUMMARY ${fails ? 'FAIL' : 'OK'} fails=${fails}`);
  process.exit(fails ? 1 : 0);
})();
