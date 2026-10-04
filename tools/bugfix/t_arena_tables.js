// Tablas por arena del botín: las 10 arenas de campaña tienen su fila. Antes a la Ciudad Maldita y a
// las Minas Profundas les faltaba: las Minas (Arena 09) tiraban el botín del Bosque (el más pobre),
// sus gemas y familias caían a valores por defecto y la victoria mostraba "Dificultad —".
//   (python3 -m http.server 8771 &) ; node tools/bugfix/t_arena_tables.js
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const BASE = process.env.SE_BASE_URL || 'http://127.0.0.1:8771';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 400) : '')); if (!ok) fails++; };
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: 900, height: 506 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${BASE}/index.html`, { waitUntil: 'load' });
  for (let k = 0; k < 300; k++) { if (await page.evaluate(() => !document.getElementById('title-continue-btn').disabled)) break; await sleep(100); }
  const r = await page.evaluate(() => {
    const miss = {};
    const T = { ARENA_LOOT, ARENA_LOOT_LABEL, GEMS_PER_VICTORY, ARENA_ITEM_FAMILIES, SET_ARENA_WEIGHTS };
    for (const n in T) { const m = CAMPAIGN_ORDER.filter(a => !T[n][a]); if (m.length) miss[n] = m; }
    // las familias y sets que nombran las filas existen
    const badFam = [], badSet = [];
    for (const a in ARENA_ITEM_FAMILIES) for (const f in ARENA_ITEM_FAMILIES[a]) if (!ITEM_FAMILIES[f]) badFam.push(a + ':' + f);
    for (const a in SET_ARENA_WEIGHTS) for (const s in SET_ARENA_WEIGHTS[a]) if (!SET_DB[s]) badSet.push(a + ':' + s);
    const L = a => lootTierWeights(a, 'A', null, false);
    const tot = w => Object.values(w).reduce((x, y) => x + y, 0);
    const leg = a => { const w = L(a); return (w.legendario + w.mitico + w.set) / tot(w); };
    // 400 cofres de victoria en las Minas: se tiran sin romperse y con la calidad esperada
    let items = 0, hi = 0, err = null;
    try { for (let i = 0; i < 400; i++) { const o = rollLoot({ arena: 'minas', grade: 'A', victory: true, runLevel: 10, subjefes: 1, owned: new Set(), classKey: 'guerrero' }); for (const it of (o.items || [])) { items++; if (/legendario|mitico|set|unico/.test(it.tier || '')) hi++; } } } catch (e) { err = e.message; }
    return { miss, badFam, badSet, leg: { bosque: leg('bosque'), laberinto: leg('laberinto'), minas: leg('minas'), infernal: leg('infernal'), ciudad: leg('ciudad') }, gems: { minas: runGemReward('minas', 'A', true, 10), bosque: runGemReward('bosque', 'A', true, 10) }, items, hi, err };
  }).catch(e => ({ fatal: e.message }));
  check('TAB.sin_error_de_evaluacion', !r.fatal, r.fatal);
  if (!r.fatal) {
    check('TAB.las_10_arenas_tienen_fila', Object.keys(r.miss).length === 0, r.miss);
    check('TAB.familias_y_sets_existen', r.badFam.length === 0 && r.badSet.length === 0, { f: r.badFam, s: r.badSet });
    check('TAB.minas_entre_laberinto_e_infernal', r.leg.minas > r.leg.laberinto && r.leg.minas < r.leg.infernal, r.leg);
    check('TAB.ciudad_es_la_que_menos_paga', r.leg.ciudad <= r.leg.bosque && r.leg.ciudad <= r.leg.laberinto, r.leg); // Q4 (alfa): cada arena de la campaña paga un poco más que la anterior; la Ciudad es la 1
    check('TAB.minas_da_mas_gemas_que_el_bosque', r.gems.minas > r.gems.bosque, r.gems);
    check('TAB.cofres_de_las_minas_se_tiran', !r.err && r.items > 0, { items: r.items, hi: r.hi, err: r.err });
  }
  check('TAB.sin_errores', errors.length === 0, errors);
  await browser.close();
  console.log('SUMMARY ' + (fails ? 'FAIL' : 'OK') + ' fails=' + fails);
  process.exit(fails ? 1 : 0);
})();
