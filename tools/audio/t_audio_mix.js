// MEZCLA DE AUDIO medida (no hay parlantes en el entorno de pruebas): el motor real de js/audio/ se
// arma sobre un OfflineAudioContext y se renderiza una ráfaga típica de combate + música (oleada ->
// rugido del jefe -> jefe -> muerte del jefe -> victoria), una prueba de ESTRÉS (decenas de efectos
// por cuadro) y la música de cada arena de la campaña. Mide sobre las muestras:
//   pico (dBFS), RMS, clipping (pico < -1 dBFS), NaN, nodos vivos (que no crezcan sin fin),
//   huecos de silencio en las transiciones y cuánto se diferencian las arenas entre sí (espectro).
// MÚSICA COMPUESTA (js/audio/music-score.js): que cada modo, cada jefe de arena y cada fase del jefe
//   suenen distinto (distancia espectral), que la horda sume capas, que el loop sea largo, que el
//   director ponga el tema del Hechicero / su pantalla previa, golpes sin saturar y nodos estables.
//   AUDIO_ONLY=music node tools/audio/t_audio_mix.js   (solo esta parte, para iterar)
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
    try { if (typeof M !== 'undefined') { if (M.timer) clearInterval(M.timer); Object.assign(M, { mode: 'off', pending: null, step: 0, bar: 0, next: 0, timer: null, wanted: null, S: null, pk: null, sec: null, vl: null, dirT: 0, seam: false, auto: null }); } } catch (e) {}
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
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || chromium.executablePath(), args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
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

    const ONLY_MUSIC = process.env.AUDIO_ONLY === 'music';
    if (!ONLY_MUSIC) {
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
    }

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

    // ---------------- 3c) música compuesta (music-score.js): modos, jefes, fases, capas, golpes ----------------
    const dist = (A, B) => { let d = 0; for (let k = 0; k < A.length; k++) d += Math.abs(A[k] - B[k]); return +(d / A.length).toFixed(2); };
    const minPair = (obj) => { const ks = Object.keys(obj); let m = 1e9, p = null; for (let i = 0; i < ks.length; i++) for (let j = i + 1; j < ks.length; j++) { const d = dist(obj[ks[i]].bands, obj[ks[j]].bands); if (d < m) { m = d; p = ks[i] + '/' + ks[j]; } } return { d: m, par: p }; };
    // escena falsa de la partida para el director musical (enemigos, jefe, Hechicero, pantalla previa)
    await E(() => { window.__scene = (o) => { o = o || {};
      enemies = Array.from({ length: o.n || 0 }, () => ({ alive: true }));
      boss = o.boss || null; activeChampion = o.ac || null; RUN_INTRO.open = !!o.intro;
      M.int = o.int0 || 0; M.phaseT = 1; M.phase = 1; M.auto = null; M.err = null; M.vl = null; };
    });
    // a) cada MODO suena distinto (y ninguno satura ni tira errores)
    const modeList = [['title', 'ciudad', 'title'], ['menu', 'ciudad', 'menu'], ['intro', 'ciudad', 'intro'], ['wave', 'ciudad', 'wave'], ['prelude', 'ciudad', 'prelude'],
      ['boss', 'ciudad', 'boss'], ['sorcerer', 'infernal', 'boss'], ['victory', 'ciudad', 'victory'], ['defeat', 'ciudad', 'defeat']];
    const modes = {};
    for (const [name, arena, mode] of modeList) {
      modes[name] = await E(async (a) => {
        const r = await __AH.render(a.mode === 'defeat' ? 7 : 10, [[0, () => { __scene({ n: a.mode === 'wave' ? 12 : 0, intro: a.mode === 'intro' }); setMusicMode(a.mode, 4); }]], { arena: a.arena, spectrum: true, specFrom: 1.2 });
        r.pk = M.pk; r.err = M.err; delete r.liveSeries; delete r.winsDb; return r;
      }, { mode, arena });
      const r = modes[name];
      info('modo_' + name, { pieza: r.pk, peak: r.peak_dBFS, rms: r.rms_dBFS, centroide_hz: r.centroid_hz, nodos: r.created, vivos_max: r.live_max, dsp: r.dsp_load_pct + '%', err: r.err });
    }
    const mm = minPair(modes);
    info('modos_distancia_espectral_minima_dB', mm);
    check('MUS.modos_sin_NaN_clipping_ni_errores', Object.values(modes).every(r => r.nan === 0 && r.peak_dBFS < -1 && !r.err && r.errs.length === 0), Object.fromEntries(Object.entries(modes).map(([k, r]) => [k, [r.peak_dBFS, r.err]])));
    check('MUS.modos_con_volumen_audible', Object.values(modes).every(r => r.rms_dBFS > -40 && r.rms_dBFS < -10), Object.fromEntries(Object.entries(modes).map(([k, r]) => [k, r.rms_dBFS])));
    check('MUS.hechicero_tiene_su_tema', modes.sorcerer.pk === 'sorcerer' && modes.boss.pk === 'boss', [modes.sorcerer.pk, modes.boss.pk]);
    check('MUS.cada_modo_suena_distinto', mm.d > 1.5, mm);

    // b) el JEFE de cada arena suena distinto (mismo tema, otro modo/tempo/timbre/batería)
    const bosses = {};
    for (const a of arenas) {
      bosses[a] = await E(async (a) => { const r = await __AH.render(8, [[0, () => { __scene({ boss: { alive: true, hp: 80, maxHp: 100 } }); setMusicMode('boss'); }]], { arena: a, spectrum: true, specFrom: 1.2 });
        r.err = M.err; delete r.liveSeries; delete r.winsDb; return r; }, a);
    }
    const bm = minPair(bosses);
    info('jefes_por_arena', Object.fromEntries(arenas.map(a => [a, { peak: bosses[a].peak_dBFS, rms: bosses[a].rms_dBFS, c: bosses[a].centroid_hz }])));
    info('jefes_distancia_espectral_minima_dB', bm);
    check('MUS.jefes_sin_clipping_ni_errores', arenas.every(a => bosses[a].peak_dBFS < -1 && bosses[a].nan === 0 && !bosses[a].err), arenas.map(a => bosses[a].peak_dBFS));
    check('MUS.jefe_de_cada_arena_suena_distinto', bm.d > 1.5, bm);

    // c) FASES del jefe: según su vida entra otra sección con más capas (y cambia la mezcla)
    const phases = await E(async () => {
      const out = {};
      for (const [k, hp] of [['f1', 90], ['f2', 50], ['f3', 12]]) {
        const r = await __AH.render(9, [[0, () => { __scene({ boss: { alive: true, hp, maxHp: 100 } }); setMusicMode('boss'); }]], { arena: 'ciudad', spectrum: true, specFrom: 1.5, from: 1.5 });
        out[k] = { bands: r.bands, rms: r.rms_dBFS, peak: r.peak_dBFS, c: r.centroid_hz, sec: M.sec && M.sec.key, phase: M.phase, nodos: r.created, err: M.err };
      }
      // Hechicero: sus 3 formas (bossPhase)
      for (const ph of [1, 2, 3]) {
        const r = await __AH.render(9, [[0, () => { __scene({ boss: { alive: true, hp: 90, maxHp: 100, bossPhase: ph } }); setMusicMode('boss'); }]], { arena: 'infernal', spectrum: true, specFrom: 1.5, from: 1.5 });
        out['h' + ph] = { bands: r.bands, rms: r.rms_dBFS, peak: r.peak_dBFS, c: r.centroid_hz, sec: M.sec && M.sec.key, phase: M.phase, err: M.err, steps: M.sec && M.sec.steps };
      }
      // cambio de fase EN VIVO: el jefe baja de 90 % a 20 % a mitad de la pelea
      const live = await __AH.render(12, [[0, () => { __scene({ boss: { alive: true, hp: 90, maxHp: 100 } }); setMusicMode('boss'); }], [5, () => { boss.hp = 20; }]], { arena: 'ciudad' });
      out.live = { sec: M.sec && M.sec.key, phase: M.phase, peak: live.peak_dBFS, err: M.err };
      return out;
    });
    info('fases_jefe', Object.fromEntries(Object.entries(phases).map(([k, v]) => [k, { rms: v.rms, peak: v.peak, c: v.c, sec: v.sec, fase: v.phase, steps: v.steps }])));
    const dPh = { f12: dist(phases.f1.bands, phases.f2.bands), f23: dist(phases.f2.bands, phases.f3.bands), h12: dist(phases.h1.bands, phases.h2.bands), h23: dist(phases.h2.bands, phases.h3.bands) };
    info('fases_distancia_espectral_dB', dPh);
    check('MUS.fases_jefe_eligen_su_seccion', phases.f1.sec === 'P1' && phases.f2.sec === 'P2' && phases.f3.sec === 'P3' && phases.h1.sec === 'H1' && phases.h2.sec === 'H2' && phases.h3.sec === 'H3', [phases.f1.sec, phases.f2.sec, phases.f3.sec, phases.h1.sec, phases.h2.sec, phases.h3.sec]);
    check('MUS.fases_jefe_cambian_la_mezcla', dPh.f12 > 1 && dPh.f23 > 1 && dPh.h12 > 1 && dPh.h23 > 1, dPh);
    check('MUS.fase_3_mas_intensa_que_fase_1', phases.f3.rms > phases.f1.rms, [phases.f1.rms, phases.f2.rms, phases.f3.rms]);
    check('MUS.cambio_de_fase_en_vivo', phases.live.phase === 3 && /^P3/.test(phases.live.sec || '') && phases.live.peak < -1, phases.live);
    check('MUS.hechicero_forma_3_rompe_el_vals_a_4_4', phases.h1.steps === 12 && phases.h3.steps === 16, [phases.h1.steps, phases.h3.steps]);
    check('MUS.fases_sin_clipping_ni_errores', Object.values(phases).every(v => v.peak < -1 && !v.err), Object.values(phases).map(v => v.peak));

    // d) INTENSIDAD: con más horda entran más capas (melodía, charles, metales)
    const inten = await E(async () => {
      const out = {};
      for (const [k, n] of [['calma', 0], ['horda', 30]]) {
        const r = await __AH.render(10, [[0, () => { __scene({ n, int0: n ? 1 : 0 }); setMusicMode('wave', 1); }]], { arena: 'ciudad', spectrum: true, specFrom: 2, from: 2 });
        out[k] = { bands: r.bands, rms: r.rms_dBFS, nodos: r.created, int: +M.int.toFixed(2) };
      }
      return out;
    });
    const dInt = dist(inten.calma.bands, inten.horda.bands);
    info('intensidad_capas', { calma: { rms: inten.calma.rms, nodos: inten.calma.nodos, int: inten.calma.int }, horda: { rms: inten.horda.rms, nodos: inten.horda.nodos, int: inten.horda.int }, dist_dB: dInt });
    check('MUS.mas_horda_mas_capas', inten.horda.nodos > inten.calma.nodos * 1.2 && inten.horda.rms > inten.calma.rms && dInt > 1, { dist: dInt, rms: [inten.calma.rms, inten.horda.rms], nodos: [inten.calma.nodos, inten.horda.nodos] });

    // e) forma larga: secciones A/B/... distintas, el loop no es corto ni idéntico
    const forms = await E(() => { const o = {};
      for (const k of Object.keys(MUSIC_SCORE)) { const S = _msPiece(k), secs = S.pform ? [].concat(...Object.values(S.pform)) : S.form;
        let bars = 0, steps16 = 0; for (const s of secs) { bars += S._c[s].bars; steps16 += S._c[s].bars * S._c[s].steps; }
        const chords = new Set(secs.map(s => S.sec[s].ch || S.sec[S.sec[s].from].ch));
        o[k] = { secciones: secs.length, distintas: new Set(secs).size, compases: bars, seg: +(steps16 * 60 / (S.bpm * (S.arena ? 1 : 1)) / 4).toFixed(1), progresiones: chords.size }; }
      return o; });
    info('formas', forms);
    check('MUS.oleadas_loop_largo_con_secciones', forms.wave.distintas >= 3 && forms.wave.seg >= 60 && forms.wave.progresiones >= 3, forms.wave);
    check('MUS.jefe_y_hechicero_con_6_secciones', forms.boss.distintas >= 6 && forms.sorcerer.distintas >= 6, [forms.boss, forms.sorcerer]);

    // e2) COMPOSICIÓN (análisis de la partitura, sin audio): la melodía cae en notas del acorde en los
    // tiempos fuertes y las voces del pad se mueven poco (conducción de voces)
    const comp = await E(() => {
      const out = {}; const sv = { key: M.key, sc: M.sc, ext: M.ext, vl: M.vl };
      for (const pk of Object.keys(MUSIC_SCORE)) {
        const S = _msPiece(pk); M.key = S.key; M.sc = MUSIC_SCALES[S.scale]; M.ext = '';
        let strong = 0, inChord = 0, moves = 0, changes = 0, vl = [55, 60, 64, 67];
        for (const sk of Object.keys(S._c)) {
          const sec = S._c[sk], L = sec.bars * sec.steps;
          for (let T = 0; T < L; T++) {
            const c = _chordAt(sec, T);
            if ((T % sec.ch.len) === c.at) { const k = _chordOf(c), nv = _voiceLead(vl, k.root, k.iv, 50, 76); for (let v = 0; v < 4; v++) moves += Math.abs(nv[v] - vl[v]); changes++; vl = nv; }
            for (const p of sec.parts) { if (p.p !== 'mel' || p.hz) continue; const e = p.mel.by[T % p.mel.len]; if (!e) continue;
              const beat = sec.steps === 12 ? 4 : 4; if (T % beat) continue;
              const k = _chordOf(c), pcs = k.iv.map(x => (k.root + x) % 12), n = _degN(e.deg, e.acc);
              strong++; if (pcs.includes(((n % 12) + 12) % 12)) inChord++; }
          }
        }
        out[pk] = { consonancia_pct: strong ? Math.round(100 * inChord / strong) : null, mov_voz_prom: +(moves / Math.max(1, changes) / 4).toFixed(2) };
      }
      Object.assign(M, sv); return out;
    });
    info('composicion', comp);
    const consOk = Object.values(comp).every(v => v.consonancia_pct === null || v.consonancia_pct >= 55), vlOk = Object.values(comp).every(v => v.mov_voz_prom <= 2.5);
    check('MUS.melodia_en_notas_del_acorde_en_tiempos_fuertes', consOk, Object.fromEntries(Object.entries(comp).map(([k, v]) => [k, v.consonancia_pct])));
    check('MUS.conduccion_de_voces_movimiento_chico', vlOk, Object.fromEntries(Object.entries(comp).map(([k, v]) => [k, v.mov_voz_prom])));

    // f) director: pantalla previa (vals angelical), Hechicero subjefe y empalme título -> menú
    const dir = await E(async () => {
      const out = {};
      let r = await __AH.render(4, [[0, () => { __scene({}); setMusicMode('menu'); }], [1, () => { RUN_INTRO.open = true; }], [3.2, () => { out.introPk = M.pk; out.introMode = M.mode; RUN_INTRO.open = false; }]], { arena: 'ciudad' });
      out.after = M.pending ? M.pending.mode : M.mode;
      r = await __AH.render(5, [[0, () => { __scene({ n: 8 }); setMusicMode('wave', 9); }], [1, () => { activeChampion = { alive: true, type: 'hechicero_supremo', hp: 50, maxHp: 100 }; }],
        [3, () => { out.sorcPk = M.pk; out.sorcMode = M.mode; activeChampion = null; }]], { arena: 'infernal' });
      out.sorcAfter = M.pending ? M.pending.mode : M.mode;
      r = await __AH.render(19, [[0, () => { __scene({}); setMusicMode('title'); }], [2, () => { setMusicMode('menu'); out.seamPend = !!M.pending; }]], { arena: 'ciudad' });
      out.seamPk = M.pk; out.seamPeak = r.peak_dBFS; out.seamMin = Math.min(...r.winsDb.slice(3));
      __scene({}); return out;
    });
    info('director', dir);
    check('MUS.pantalla_previa_pone_el_vals_del_hechicero', dir.introPk === 'intro' && dir.after === 'menu', dir);
    check('MUS.hechicero_subjefe_pone_su_tema_y_vuelve', dir.sorcPk === 'sorcerer' && dir.sorcMode === 'boss' && dir.sorcAfter === 'wave', dir);
    check('MUS.titulo_empalma_con_menu_sin_corte', dir.seamPk === 'menu' && !dir.seamPend && dir.seamMin > -45, dir);

    // g) GOLPES (stingers) en la tonalidad de la música: subida de nivel, cristal, cofre legendario
    const st = await E(async () => {
      const out = {};
      for (const k of ['levelup', 'crystal', 'lootLegend', 'victory']) {
        const r = await __AH.render(4, [[0, () => { __scene({ n: 10 }); setMusicMode('wave', 3); }], [1.5, () => { playSfx(k); out[k + '_root'] = M.chRoot; }]], { arena: 'hielo', from: 1.4 });
        out[k] = { peak: r.peak_dBFS, err: r.errs.length, rms: r.rms_dBFS };
      }
      return out;
    });
    info('golpes', st);
    check('MUS.golpes_sin_clipping', ['levelup', 'crystal', 'lootLegend', 'victory'].every(k => st[k].peak < -1 && st[k].err === 0), st);

    // h) nodos estables: 30 s de jefe en fase 3 con la horda llena, sin fuentes colgadas
    const stab = await E(async () => {
      const r = await __AH.render(30, [[0, () => { __scene({ n: 30, boss: { alive: true, hp: 10, maxHp: 100 } }); setMusicMode('boss'); }]], { arena: 'minas' });
      const a = r.liveSeries.filter(x => x[0] > 3 && x[0] < 16).map(x => x[1]), b = r.liveSeries.filter(x => x[0] >= 16 && x[0] < 29).map(x => x[1]);
      return { peak: r.peak_dBFS, live_max: r.live_max, a: Math.max(...a), b: Math.max(...b), never: r.never_stopped, created: r.created, dsp: r.dsp_load_pct, err: M.err };
    });
    info('nodos_musica_30s', stab);
    check('MUS.nodos_estables', stab.live_max < 400 && stab.b <= stab.a * 1.25 + 20 && stab.never <= 4 && !stab.err, stab);
    check('MUS.jefe_fase3_pico_bajo_-1dBFS', stab.peak < -1, stab.peak);
    if (process.env.AUDIO_ONLY === 'music') throw new Error('__solo_musica__');

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

    // Champion accents use the same offline mixer and bounded source envelopes.
    const expedition = await E(async () => {
      const out={};if(typeof EX_AUDIO==='undefined')return out;
      for(const k of Object.keys(EX_AUDIO)){
        const r=await __AH.render(1.2,[[.05,()=>playSfx('ex_'+k+'_cast')],[.4,()=>playSfx('ex_'+k+'_ult')]],{});
        out[k]={peak:r.peak_dBFS,clip:r.clip,nan:r.nan,never:r.never_stopped,errors:r.errs};
      }return out;
    });
    for(const [k,r] of Object.entries(expedition))check('EXPEDITION.'+k,Number.isFinite(r.peak)&&r.peak<-1&&r.peak>-100&&!r.nan&&!r.errors.length&&r.never<=4,r);

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
    if (String(e && e.message) !== '__solo_musica__') { console.log('ERROR ' + (e && e.stack || e)); fails++; }
  } finally {
    await browser.close();
    if (server) server.kill();
  }
  console.log(`SUMMARY ${fails ? 'FAIL' : 'OK'} fails=${fails}`);
  process.exit(fails ? 1 : 0);
})();
