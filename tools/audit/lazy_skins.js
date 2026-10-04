// AUDITORÍA — segunda tanda de imágenes con skins y cromas.  (python3 -m http.server 8905 &) ; ROOT=. node tools/audit/lazy_skins.js
// Verifica la segunda tanda con skins/cromas: no se piden antes del título, después cargan todas,
// los packs de skin quedan listos, nada queda pendiente y una partida arranca sin errores.
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
const path = require('path');
const BASE = process.env.BASE || 'http://127.0.0.1:8905', ROOT = process.env.ROOT || path.join(__dirname, '../..');
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); if (!ok) fails++; };
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await ctx.addInitScript(() => { window.__campaignMode = true; performance.setResourceTimingBufferSize(10000); });
  const p = await ctx.newPage(); const errs = []; let title = false; const early = [], bad = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 160)); });
  p.on('request', r => { const u = r.url(); if (!title && /\/skins\/[^/]+\/(?!preview)|\/cromas\//.test(u)) early.push(u.slice(-70)); });
  p.on('response', r => { if (r.status() >= 400) bad.push(r.status() + ' ' + r.url().slice(-70)); });
  await p.goto(BASE + '/index.html?lazy=1');
  for (let k = 0; k < 900; k++) { await sleep(100); if (await p.evaluate(() => { const x = document.getElementById('title-continue-btn'); return x && !x.disabled; }).catch(() => false)) break; }
  title = true;
  const atTitle = await p.evaluate(() => ({ core: ASSET_LOAD.core, rest: ASSET_LOAD.rest.total, previewsReady: Object.values(SET_SKINS).filter(s => s.preview).length }));
  // el sondeo cada 100 ms llega tarde: se compara con el reloj de la página (fin de la última imagen de la 1.ª tanda)
  const rt = await p.evaluate(() => { const D = /\/skins\/[^/]+\/(?!preview)|\/cromas\//; const L = /(^|\/)assets\/(sprites\/(arenas|enemies|bosses)\/|vfx\/)/; const e = performance.getEntriesByType('resource');
    const cs = new Set(ASSET_MANIFEST.filter(u => !LAZY_IMG.isDeferred(u)).map(u => u.replace(/\.png$/, ''))); const core = e.filter(x => cs.has(decodeURI(x.name).replace(/^.*?\/(assets\/)/, '$1').replace(/\.(png|webp)$/, ''))); const coreEnd = Math.max(...core.map(x => x.responseEnd));
    const sk = e.filter(x => D.test(x.name)); return { nCore: core.length, coreEnd: Math.round(coreEnd), firstSkin: Math.round(Math.min(...sk.map(x => x.startTime))), skinsBefore: sk.filter(x => x.startTime < coreEnd - 1).map(x => x.name.slice(-60)).slice(0, 3) }; });
  check('skins_y_cromas_no_se_piden_antes_del_titulo', rt.skinsBefore.length === 0 && rt.firstSkin > 0, rt);
  check('titulo_con_previews_de_skins_en_primera_tanda', atTitle.core.done === atTitle.core.total, atTitle);
  for (let k = 0; k < 600 && !(await p.evaluate(() => assetsAllReady())); k++) await sleep(200);
  const st = await p.evaluate(() => {
    const skinPacks = Object.entries(CHAMP_PACK).filter(([k]) => /^skin_/.test(k));
    const pend = [...document.images].filter(i => i.__lazySrc).length;
    return { all: assetsAllReady(), rest: ASSET_LOAD.rest, skinPacks: skinPacks.length, notReady: skinPacks.filter(([, P]) => !P.ready).map(([k, P]) => k + (P.failed ? ':failed' : '')).slice(0, 5), pend, released: LAZY_IMG.released };
  });
  check('todo_cargado_despues', st.all && st.rest.done === st.rest.total, st);
  check('packs_de_skin_listos', st.skinPacks > 0 && st.notReady.length === 0, st);
  check('ninguna_imagen_pendiente', st.pend === 0, st.pend);
  // partida con el Tanque
  await p.addScriptTag({ path: path.join(ROOT, 'tools/playtest/autopilot.js') });
  await p.evaluate(() => {
    save.starterChosen = true; for (const k in save.champions) { save.champions[k].unlocked = true; save.champions[k].level = 30; }
    try { if (save.champions.tanque) { save.champions.tanque.setSkin = 'baluarte'; save.champions.tanque.skin = 'baluarte'; } } catch (e) {}
    __AP.start('tanque', 'ciudad', 3);
  });
  await sleep(6000);
  const g = await p.evaluate(() => ({ state, heroes: typeof heroes !== 'undefined' ? heroes.length : (typeof hero !== 'undefined' ? 1 : 0), skinKey: (typeof hero !== 'undefined' && hero && typeof setSkinPackKey === 'function') ? setSkinPackKey(hero, hero.classKey) : null }));
  await p.screenshot({ path: path.join(process.env.OUT || '/tmp', 'lazy_skins.png') });
  check('partida_corre', /playing|buff/.test(g.state), g);
  check('sin_errores', errs.length === 0 && bad.length === 0, { errs: errs.slice(0, 4), bad: bad.slice(0, 4) });
  await b.close();
  console.log(`SUMMARY ${fails ? 'FAIL' : 'OK'} fails=${fails}`); process.exit(fails ? 1 : 0);
})();
