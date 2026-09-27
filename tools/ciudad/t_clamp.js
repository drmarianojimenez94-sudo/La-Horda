// LA HORDA — Ciudad: ningún desplazamiento puede dejar a un guardián fuera del mapa (mismo caso que
// tools/minas/t_clamp.js): para cada pared pone al guardián adentro, aplica cmClamp y exige que quede
// en un lugar caminable.   uso: (python3 -m http.server 8771 &) ; node tools/ciudad/t_clamp.js
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
  await p.evaluate(() => { selectedClass = 'tanque'; currentArena = 'ciudad'; lobbyAllies = ['mago', 'soporte', 'guerrero']; startRun(1); });
  await sleep(1500);
  const r = await p.evaluate(() => {
    const out = { sectors: 0, cases: 0, bad: [] };
    const nSec = 1;
    for (let s = 0; s < nSec; s++) {
      
      out.sectors++;
      for (const w of cmWallsNow()) {
        const pts = [[(w.x0 + w.x1) / 2, (w.y0 + w.y1) / 2], [w.x0 + 5, w.y0 + 5], [w.x1 - 5, w.y1 - 5], [w.x0 + 5, w.y1 - 5], [w.x1 - 5, w.y0 + 5]];
        for (const [x, y] of pts) {
          const ent = { x, y, radius: player.radius };
          cmClamp(ent); out.cases++;
          if (!cmInside(ent.x, ent.y, 0)) out.bad.push({ s, from: [Math.round(x), Math.round(y)], to: [Math.round(ent.x), Math.round(ent.y)] });
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
