// Vida máxima TEMPORAL del Tanque (Grito de Guerra / Grito Provocador, `pendingHpBonus`):
// elegir un refuerzo entre niveles (refreshEquippedStats) con el grito activo no puede dejar la
// vida máxima rota. Antes se pisaba el bonus pero se restaba igual al vencer: la vida máxima caía
// nivel a nivel hasta quedar negativa (medido en la Gélida: "hp -5365/-3379").
//   (python3 -m http.server 8771 &) ; node tools/items/t_hpbonus.js
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const BASE = process.env.SE_BASE_URL || 'http://127.0.0.1:8771';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 400) : '')); if (!ok) fails++; };
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: 900, height: 506 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  await page.addInitScript(() => { window.__campaignMode = true; });
  await page.goto(`${BASE}/index.html`, { waitUntil: 'load' });
  for (let k = 0; k < 300; k++) { if (await page.evaluate(() => !document.getElementById('title-continue-btn').disabled)) break; await sleep(100); }
  const r = await page.evaluate(() => {
    loop = function(){};
    for (const k of Object.keys(save.champions)) save.champions[k].unlocked = true;
    selectedClass = 'tanque'; currentArena = 'bosque'; lobbyAllies = []; startRun(5); spawnTimer = 1e12; enemies.length = 0; levelDuration = 9e9;
    const base = player.maxHp, out = { base, trace: [] };
    const cast = (i) => { player.cds[i] = 0; player.energy = player.maxEnergy; useSkill(i); };
    const expire = () => { let t = 0; while (player.buffTimer > 0 && t < 20000) { update(16); t += 16; } };
    for (let lv = 0; lv < 6; lv++) {
      cast(2);                                  // Grito de Guerra: +vida máx temporal
      out.trace.push(Math.round(player.maxHp));
      refreshEquippedStats();                   // lo que pasa al elegir un refuerzo entre niveles
      expire();                                 // el grito vence
      out.trace.push(Math.round(player.maxHp));
    }
    out.after = player.maxHp; out.pending = player.pendingHpBonus;
    // refuerzo de vida real con el grito activo: aplica y el grito se retira limpio
    cast(2); runStats.hpMult *= 1.26; refreshEquippedStats(); expire();
    out.withVit = player.maxHp; out.expectVit = Math.round(computePlayerStats('tanque').hp * runStats.hpMult);
    return out;
  });
  check('HPBONUS.no_se_degrada', r.after === r.base && r.pending === 0, r);
  check('HPBONUS.nunca_negativa', r.trace.every(v => v > 0), r.trace);
  check('HPBONUS.refuerzo_de_vida_aplica', r.withVit === r.expectVit, { got: r.withVit, want: r.expectVit });
  check('HPBONUS.sin_errores', errors.length === 0, errors);
  await browser.close();
  console.log(fails ? `${fails} FALLAS` : 'OK');
  process.exit(fails ? 1 : 0);
})();
