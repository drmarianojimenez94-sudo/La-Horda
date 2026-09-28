// Un error a mitad del dibujo no deja la cámara "acumulada". Antes el loop atrapaba el error pero el
// ctx.save() de la cámara quedaba sin su restore: en el cuadro siguiente el zoom y el desplazamiento
// se aplicaban encima del anterior y el mundo salía volando de la pantalla (solo quedaba el HUD).
//   (python3 -m http.server 8771 &) ; node tools/bugfix/t_render_recover.js
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const BASE = process.env.SE_BASE_URL || process.env.SITE || 'http://127.0.0.1:8771';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 400) : '')); if (!ok) fails++; };
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] });
  const p = await (await b.newContext({ viewport: { width: 844, height: 390 } })).newPage();
  await p.goto(`${BASE}/index.html`, { timeout: 120000 });
  for (let k = 0; k < 1200; k++) { if (await p.evaluate(() => { const x = document.getElementById('title-continue-btn'); return x && !x.disabled; })) break; await sleep(100); }
  const r = await p.evaluate(async () => {
    for (const k in save.champions) { save.champions[k].level = 10; save.champions[k].unlocked = true; } save.starterChosen = true;
    document.getElementById('title-continue-btn').click();
    selectedClass = 'tanque'; currentArena = 'bosque'; startRun(1);
    await new Promise(r => setTimeout(r, 800));
    // escala del contexto al empezar cada cuadro (tiene que ser siempre la base del canvas)
    const seen = []; const origRender = window.render;
    window.render = function () { const t = ctx.getTransform(); seen.push(Math.round(t.a * 1000) / 1000); return origRender.apply(this, arguments); };
    const base = Math.round(canvas.width / VW * 1000) / 1000;
    await new Promise(r => setTimeout(r, 300));
    // durante ~20 cuadros el dibujo de acciones contextuales revienta (como el invitado en la Fortaleza)
    const origCtx = window.ctxDraw; let n = 0;
    window.ctxDraw = function () { if (n++ < 20) throw new TypeError('prueba: objetivo nulo'); return origCtx.apply(this, arguments); };
    await new Promise(r => setTimeout(r, 1500));
    window.ctxDraw = origCtx; window.render = origRender;
    const after = seen.slice(-10);
    return { base, thrown: n, after, max: Math.max(...seen), min: Math.min(...seen) };
  });
  check('RR.el_error_ocurrio', r.thrown >= 20, r);
  check('RR.la_escala_vuelve_a_la_base', r.after.every(a => a === r.base), r);
  check('RR.nunca_se_acumula', r.max === r.base && r.min === r.base, r);
  await b.close();
  console.log('SUMMARY ' + (fails ? 'FAIL' : 'OK') + ' fails=' + fails);
  process.exit(fails ? 1 : 0);
})();
