let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const fs = require('fs');
const path = require('path');
const BASE = process.env.REGRESSION_BASE_URL || 'http://127.0.0.1:8750';
const sleep = ms => new Promise(r => setTimeout(r, ms));

function seedSave(opts = {}) {
  const champs = ["tanque","guerrero","mago","soporte","segador","axiom","profeta","musashi","cazadora","nigromante"];
  const save = { champions:{}, gold: opts.gold ?? 500, gems:0, divineArenaUnlocked: opts.divina ?? true, itemSchemaV:2,
    arenasCleared: opts.cleared || {bosque:true,acuatica:true,hielo:true,laberinto:true,infernal:true}, relics:{hp:0,dmg:0,def:0,vel:0} };
  champs.forEach(c => { save.champions[c] = { level: opts.level ?? 20, xp:0, talentPoints: opts.tp ?? 0, unlocked:true,
    skillMastery:[{useXp:0,useLvl:1,alloc:opts.alloc ?? 10},{useXp:0,useLvl:1,alloc:opts.alloc ?? 10},{useXp:0,useLvl:1,alloc:opts.alloc ?? 10}],
    ultMastery:{useXp:0,useLvl:1,alloc:opts.alloc ?? 10}, inventory:[], equipment:{} }; });
  return save;
}

async function launch(opts = {}) {
  return chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'], ...opts });
}

// Open a site in deterministic mode with a given save; waits until every tracked image settled.
async function openDet(browser, site, { seed = 12345, save = null, viewport = { width: 1280, height: 800 } } = {}) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  if (save) {
    await ctx.addInitScript(s => { try { if (!sessionStorage.getItem('__seeded')) { localStorage.setItem('laHordaSave_v1', s); sessionStorage.setItem('__seeded', '1'); } } catch (e) {} }, JSON.stringify(save));
  }
  await page.goto(`${BASE}/${site}/index.html?det=1&seed=${seed}`, { waitUntil: 'load', timeout: 120000 });
  await waitImages(page);
  return { ctx, page, errors };
}

async function waitImages(page, timeoutMs = 120000) {
  const t0 = Date.now();
  for (;;) {
    const st = await page.evaluate(() => window.__imgState());
    if (st.done === st.total && st.total > 0) return st;
    if (Date.now() - t0 > timeoutMs) throw new Error('images not loaded: ' + JSON.stringify(st));
    await sleep(150);
  }
}

function writeJSON(file, obj) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(obj, null, 1));
}

module.exports = { BASE, sleep, seedSave, launch, openDet, waitImages, writeJSON };
