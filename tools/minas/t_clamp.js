// LA HORDA — Minas: ningún desplazamiento puede dejar a un guardián fuera del mapa.
// Una embestida que terminaba dentro de una roca pegada al borde hacía que el empuje lo sacara por
// afuera y quedaba trabado para siempre (no podía llegar al Portal). Para cada sector y cada roca
// pone al guardián en el centro y en puntos interiores de la roca, aplica mnClamp y exige que
// quede en un lugar caminable.   uso: (python3 -m http.server 8771 &) ; node tools/minas/t_clamp.js
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const BASE = process.env.SE_BASE_URL || 'http://127.0.0.1:8771';
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] });
  const p = await (await b.newContext({ viewport: { width: 844, height: 390 } })).newPage();
  const errors = []; p.on('pageerror', e => errors.push(e.message));
  await p.goto(`${BASE}/index.html?dev=1`);
  for (let k = 0; k < 300; k++) { if (await p.evaluate(() => !document.getElementById('title-continue-btn').disabled)) break; await sleep(100); }
  await p.evaluate(() => { selectedClass = 'tanque'; currentArena = 'minas'; lobbyAllies = ['mago', 'soporte', 'guerrero']; startRun(1); });
  await sleep(1500);
  const r = await p.evaluate(() => {
    const out = { sectors: 0, cases: 0, bad: [] };
    const nSec = (typeof MN_SECTORS !== 'undefined' ? MN_SECTORS.length : 1);
    for (let s = 0; s < nSec; s++) {
      if (typeof MN_SECTORS !== 'undefined') mnS.sec = s;
      out.sectors++;
      for (const w of mnRocksNow()) {
        const pts = [[(w.x0 + w.x1) / 2, (w.y0 + w.y1) / 2], [w.x0 + 5, w.y0 + 5], [w.x1 - 5, w.y1 - 5], [w.x0 + 5, w.y1 - 5], [w.x1 - 5, w.y0 + 5]];
        for (const [x, y] of pts) {
          const ent = { x, y, radius: player.radius };
          mnClamp(ent); out.cases++;
          if (!mnInside(ent.x, ent.y, 0)) out.bad.push({ s, from: [Math.round(x), Math.round(y)], to: [Math.round(ent.x), Math.round(ent.y)] });
        }
      }
    }
    return out;
  });
  const ok = r.bad.length === 0 && r.cases > 0 && errors.length === 0;
  console.log(JSON.stringify({ sectors: r.sectors, cases: r.cases, bad: r.bad.slice(0, 8), errors: errors.slice(0, 3) }));
  console.log(ok ? 'OK' : 'FAIL');
  await b.close(); process.exit(ok ? 0 : 1);
})();
