// PERFIL DE CUADRO: en el tramo más cargado de una arena (mismo arranque que tools/audit/fps.js), mide cuánto del
// cuadro se va en update() y en render() y, con el perfilador de Chrome (CDP), qué funciones se llevan el tiempo
// propio. Sirve para optimizar con datos y no a ciegas.
//   node tools/audit/frame_profile.js [arena=infernal] [cpuRate=1] [segundos=10]     (sirve el repo en SE_BASE_URL)
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const path = require('path');
const BASE = process.env.SE_BASE_URL || 'http://127.0.0.1:8771';
const ARENA = process.argv[2] || 'infernal', RATE = parseFloat(process.argv[3] || '1'), SECS = parseFloat(process.argv[4] || '10');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: +(process.env.DPR || 3) });
  await ctx.addInitScript(() => { window.__campaignMode = true; });
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${BASE}/index.html${process.env.Q || ''}`);
  for (let k = 0; k < 300; k++) { if (await page.evaluate(() => { const b = document.getElementById('title-continue-btn'); return b && !b.disabled; })) break; await sleep(100); }
  await page.addScriptTag({ path: path.join(__dirname, '../playtest/autopilot.js') });
  await page.evaluate((a) => { save.starterChosen = true; for (const k in save.champions) { save.champions[k].unlocked = true; save.champions[k].level = 30; } __AP.start('mago', a, 8); }, ARENA);
  await sleep(4000);
  await page.evaluate(() => {
    const T = window.__T = { u: [], r: [] };
    const u0 = window.update, r0 = window.render;
    window.update = function () { const t = performance.now(); try { return u0.apply(this, arguments); } finally { T.u.push(performance.now() - t); } };
    window.render = function () { const t = performance.now(); try { return r0.apply(this, arguments); } finally { T.r.push(performance.now() - t); } };
  });
  // FNS=a,b,c: cronometra esas funciones globales una por una (ms por llamada y llamadas por cuadro)
  const FNS = (process.env.FNS || '').split(',').filter(Boolean);
  // HOOKS=1: cronometra también los ganchos de la arena actual (ARENA_DEFS / ARENA_EXT), que se registran por referencia
  if (process.env.HOOKS) FNS.push('__hooks__');
  await page.evaluate((fns) => { window.__F = {};
    if (fns.includes('__hooks__')) { const def = (ARENA_DEFS[currentArena] || ARENA_EXT[currentArena]); if (def) for (const k in def) { const f = def[k]; if (typeof f !== 'function') continue; const L = window.__F['hook.' + k] = [];
      def[k] = function () { const t = performance.now(); try { return f.apply(this, arguments); } finally { L.push(performance.now() - t); } }; } } for (const n of fns) { const f = window[n]; if (typeof f !== 'function') continue; const L = window.__F[n] = [];
    window[n] = function () { const t = performance.now(); try { return f.apply(this, arguments); } finally { L.push(performance.now() - t); } }; } }, FNS);
  // OPS=1: cuenta operaciones de canvas por cuadro, atribuidas al paso de render() que las emite
  if (process.env.OPS) await page.evaluate(() => {
    const SEC = ['drawArena','drawHazardZones','drawCorpses','drawGoreDecals','vfxDrawGround','drawPortadorGround','drawChampFxGround','drawClassicPassiveGround','drawMythicGrounds','drawSetAuras','drawFireWall','drawTrap','drawPotion','drawShadow','drawEnemy','drawHero','drawProjectileFx','vfxDrawParticles','drawFloatTexts','drawPortadorTop','drawChampFxScreen','drawScreenFeedback','drawBossSkillOverlay','drawAcua2Overlays','drawDownedMarkers','ctxDraw','ctxDrawScreen','crystalDraw','resonanceDraw','aidAmbDraw','vfxDrawDying','drawFxContrastTop','drawChampionSignatures','drawBossTethers','drawAxiomZones','drawUniqueFissures','drawSylvaRainZones','drawMusashiAfterimages','drawNigroGolemFx','drawAimPreview','drawAcuaAmbience'];
    const O = window.__OPS = { cur: 'otro', by: {}, frames: 0 };
    for (const n of SEC) { const f = window[n]; if (typeof f !== 'function') continue; window[n] = function () { const prev = O.cur; O.cur = n; try { return f.apply(this, arguments); } finally { O.cur = prev; } }; }
    const P = CanvasRenderingContext2D.prototype;
    for (const m of Object.getOwnPropertyNames(P)) { const d = Object.getOwnPropertyDescriptor(P, m); if (!d || typeof d.value !== 'function' || m === 'constructor') continue;
      const f = d.value; P[m] = function () { if (this.canvas && this.canvas.id === 'game') { const k = O.cur + '.' + m; O.by[k] = (O.by[k] || 0) + 1; } return f.apply(this, arguments); }; }
    const r0 = window.render; window.render = function () { O.frames++; return r0.apply(this, arguments); };
  });
  const cdp = await ctx.newCDPSession(page);
  if (RATE !== 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: RATE });
  await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 200 }); await cdp.send('Profiler.start');
  // traza de la línea de tiempo: estilo, layout, pintado, raster... (lo que el perfilador de JS ve como "(program)")
  const events = []; cdp.on('Tracing.dataCollected', d => events.push(...d.value));
  const traceDone = new Promise(r => cdp.once('Tracing.tracingComplete', r));
  await cdp.send('Tracing.start', { categories: 'devtools.timeline,disabled-by-default-devtools.timeline', transferMode: 'ReportEvents' });
  let maxEn = 0;
  for (let k = 0; k < SECS; k++) { await sleep(1000); maxEn = Math.max(maxEn, await page.evaluate(() => { if (state === 'buff' && typeof AP !== 'undefined' && AP.pickBuff) AP.pickBuff(); return enemies.filter(e => e.alive).length; })); }
  const { profile } = await cdp.send('Profiler.stop');
  await cdp.send('Tracing.end'); await traceDone;
  const byName = new Map(); let mainTid = null;
  const tc = events.filter(e => e.name === 'TracingStartedInBrowser' || e.name === 'TracingStartedInPage'); // hilo principal del renderer: el que corre FunctionCall
  const fc = events.find(e => e.name === 'FunctionCall'); if (fc) mainTid = fc.tid;
  for (const e of events) if (e.ph === 'X' && e.dur && e.tid === mainTid) byName.set(e.name, (byName.get(e.name) || 0) + e.dur / 1000);
  const T = await page.evaluate(() => { const q = (a, p) => { const b = [...a].sort((x, y) => x - y); return +(b[Math.floor(b.length * p)] || 0).toFixed(2); };
    return { frames: __T.u.length, updateMed: q(__T.u, .5), updateP95: q(__T.u, .95), renderMed: q(__T.r, .5), renderP95: q(__T.r, .95), canvas: [canvas.width, canvas.height], enemies: enemies.filter(e => e.alive).length, particles: typeof particles !== 'undefined' ? particles.length : null }; });
  // tiempo propio por función (muestras × intervalo)
  const byId = new Map(profile.nodes.map(n => [n.id, n])), self = new Map();
  const dts = profile.timeDeltas; let total = 0;
  profile.samples.forEach((id, i) => { const n = byId.get(id), f = n.callFrame; const key = (f.functionName || '(anónima)') + ' ' + (f.url ? f.url.replace(/^.*\/js\//, '') + ':' + (f.lineNumber + 1) : ''); const dt = (dts[i] || 0) / 1000; self.set(key, (self.get(key) || 0) + dt); total += dt; });
  const top = [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30);
  const Fr = await page.evaluate(() => { const o = {}, n = __T.u.length || 1; for (const k in __F) { const a = [...__F[k]].sort((x, y) => x - y), sum = a.reduce((x, y) => x + y, 0);
    o[k] = { porCuadro: +(sum / n).toFixed(2), llamadas: +(a.length / n).toFixed(1), p95: +(a[Math.floor(a.length * .95)] || 0).toFixed(2) }; } return o; });
  if (Object.keys(Fr).length) console.log('FNS ' + JSON.stringify(Fr));
  if (process.env.OPS) { const O = await page.evaluate(() => __OPS); const per = {}, tot = {}; let all = 0;
    for (const k in O.by) { const sec = k.split('.')[0]; per[sec] = (per[sec] || 0) + O.by[k] / O.frames; tot[k] = O.by[k] / O.frames; all += O.by[k] / O.frames; }
    console.log('OPS por cuadro: ' + all.toFixed(0));
    for (const [k, v] of Object.entries(per).sort((a, b) => b[1] - a[1]).slice(0, 14)) console.log('  ' + v.toFixed(0).padStart(6) + '  ' + k);
    console.log('OPS más usadas:'); for (const [k, v] of Object.entries(tot).sort((a, b) => b[1] - a[1]).slice(0, 16)) console.log('  ' + v.toFixed(0).padStart(6) + '  ' + k); }
  console.log(JSON.stringify(Object.assign(T, { arena: ARENA, cpu: RATE + 'x', maxEnemies: maxEn, errors: errors.slice(0, 3) })));
  console.log('--- hilo principal: tiempo total por evento (ms, incluye anidados) ---');
  for (const [k, ms] of [...byName.entries()].sort((a, b) => b[1] - a[1]).slice(0, 18)) console.log(ms.toFixed(0).padStart(7) + ' ms  ' + k);
  console.log('--- JS: tiempo propio por función ---');
  for (const [k, ms] of top) console.log(((ms / total) * 100).toFixed(1).padStart(5) + ' %  ' + ms.toFixed(0).padStart(6) + ' ms  ' + k);
  await browser.close();
})();
