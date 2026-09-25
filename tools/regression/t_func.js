// Functional UI suite in real time (no determinism): real clicks/taps through menus and a live
// game loop. Produces a list of checks; comparing baseline vs modular results.
// usage: node t_func.js <site> <outdir>
const { launch, BASE, sleep, seedSave, writeJSON, waitImages } = require('./lib.js');
const ARENA_TITLES = ["Ruinas del Bosque", "Arena Acuática", "Arena de Hielo", "Laberinto Maldito", "Arena Infernal"];
const CHAMP_NAMES = ['Tanque', 'Asesino', 'Mago', 'Soporte', 'Segador Olvidado', 'Axiom', 'La Profeta', 'Musashi', 'Sylva', 'Nigromante'];

const checks = [];
function check(id, ok, detail) { checks.push({ id, ok: !!ok, detail: detail === undefined ? null : detail }); console.log((ok ? 'PASS ' : 'FAIL ') + id + (detail !== undefined ? '  ' + JSON.stringify(detail).slice(0, 200) : '')); }

async function newPage(browser, site, { save = seedSave(), mobile = false, portrait = false } = {}) {
  const ctx = await browser.newContext(mobile
    ? { viewport: portrait ? { width: 390, height: 844 } : { width: 844, height: 390 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' }
    : { viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(8000);
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('dialog', d => d.accept().catch(() => {}));
  if (save) await ctx.addInitScript(s => { try { if (!sessionStorage.getItem('__seeded')) { localStorage.setItem('laHordaSave_v1', s); sessionStorage.setItem('__seeded', '1'); } } catch (e) {} }, typeof save === 'string' ? save : JSON.stringify(save));
  const t0 = Date.now();
  await page.goto(`${BASE}/${site}/index.html`, { waitUntil: 'load', timeout: 120000 });
  const loadMs = Date.now() - t0;
  return { ctx, page, errors, loadMs };
}
const gameErrors = async (page, errors) => (await page.evaluate(() => window.__errors.filter(e => !/fonts\.googleapis/.test(e)))).concat(errors);
const T = (page, fn, ...a) => page.evaluate(([fn, a]) => window.__T[fn](...a), [fn, a]);
const vis = (page, sel) => page.isVisible(sel).catch(() => false);

async function goToChampSelect(page, arenaTitle) {
  await page.click('#title-continue-btn');
  await page.click('#mainmenu-jugar-btn');
  await page.click('#mode-arena-btn');
  await page.click(`.arena-card-title:text-is("${arenaTitle}")`);
}
async function pickChamp(page, name) {
  await page.evaluate(n => { const el = [...document.querySelectorAll('.champ-name')].find(e => e.textContent.trim() === n); if (el) el.closest('.champ-card').click(); }, name);
}
async function startFromSelect(page) {
  await page.click('#start-btn');
  await sleep(300);
  if (await vis(page, 'text=Comenzar')) await page.click('text=Comenzar').catch(() => {});
  await sleep(300);
}
async function joyDrag(page, dx, dy, ms) {
  const b = await page.locator('#joyzone').boundingBox();
  const base = await page.locator('#joy-base').boundingBox();
  const cx = base.x + base.width / 2, cy = base.y + base.height / 2;
  await page.mouse.move(cx, cy); await page.mouse.down(); await page.mouse.move(cx + dx, cy + dy, { steps: 3 });
  await sleep(ms); await page.mouse.up();
  return b;
}
async function canvasNonBlank(page) {
  return page.evaluate(() => { const c = document.querySelector('canvas'); const g = c.getContext('2d'); const d = g.getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 4 * 97) if (d[i] + d[i + 1] + d[i + 2] > 30) n++; return n; });
}

(async () => {
  const [site, outdir] = process.argv.slice(2);
  const browser = await launch();
  const tStart = Date.now();

  // F1 boot + F2 navigation
  {
    const { ctx, page, errors, loadMs } = await newPage(browser, site, { save: null });
    check('boot.load', true, { loadMs });
    check('boot.title_visible', await vis(page, '#title-screen'));
    const img = await waitImages(page).catch(e => ({ err: String(e) }));
    check('boot.images_all_loaded', img.total && img.done === img.total && !img.broken.length, img);
    await page.click('#title-continue-btn');
    check('nav.mainmenu', await vis(page, '#mainmenu-screen'));
    // el catálogo de campeones vive dentro de la Tienda
    await page.click('#mainmenu-tienda-btn');
    check('nav.shop', await vis(page, '#shop-screen'));
    const gcount = await page.locator('#shop-champ-grid .gallery-card').count();
    check('nav.gallery_cards', gcount >= 10, gcount);
    await page.locator('#shop-champ-grid .gallery-card').first().click().catch(() => {});
    await sleep(200);
    check('nav.champdetail', await vis(page, '#champdetail-screen'));
    await page.click('#champdetail-back-btn').catch(async () => { await page.click('text=Volver').catch(() => {}); });
    await sleep(150);
    await page.click('#shop-back-btn');
    // Mis Campeones: inventario de campeones -> ficha con equipo / talentos (árbol) / habilidades
    await page.click('#mainmenu-campeones-btn');
    check('nav.mychamps', await vis(page, '#champions-screen'));
    const mcount = await page.locator('#mychamps-grid .mychamp-card').count();
    check('nav.mychamps_cards', mcount >= 10, mcount);
    await page.locator('#mychamps-grid .mychamp-card').first().click();
    check('nav.champhub', await vis(page, '#champhub-screen'));
    await page.click('#champhub-tabs .hub-tab[data-tab="talentos"]');
    const tnodes = await page.locator('#champhub-panel .tt-node').count();
    check('nav.champhub_tree', tnodes >= 12 && (await page.locator('#champhub-panel .tt-col').count()) === 3, tnodes);
    await page.click('#champhub-tabs .hub-tab[data-tab="habilidades"]');
    check('nav.champhub_skills', (await page.locator('#champhub-panel .mastery-row').count()) === 4);
    await page.click('#champhub-tabs .hub-tab[data-tab="equipo"]');
    check('nav.champhub_equip', (await page.locator('#champhub-panel .inv-capacity').count()) === 1);
    await page.click('#champhub-back-btn');
    await page.click('#champions-back-btn');
    await page.click('#mainmenu-jugar-btn');
    check('nav.modeselect', await vis(page, '#modeselect-screen'));
    await page.click('#mode-arena-btn');
    const titles = await page.locator('.arena-card-title').allTextContents();
    check('nav.arena_titles', titles.length >= 5, titles);
    await page.click('#arenaselect-back-btn');
    await page.click('#modeselect-back-btn');
    await page.click('#mainmenu-back-btn');
    check('nav.back_to_title', await vis(page, '#title-screen'));
    const errs = await gameErrors(page, errors);
    check('nav.no_errors', errs.length === 0, errs);
    await ctx.close();
  }

  // F3 play every arena through the real UI with a different champion; joystick + buttons
  for (let i = 0; i < ARENA_TITLES.length; i++) {
    const arena = ARENA_TITLES[i], champ = CHAMP_NAMES[(i * 3) % CHAMP_NAMES.length];
    const { ctx, page, errors } = await newPage(browser, site);
    await waitImages(page);
    await goToChampSelect(page, arena);
    await pickChamp(page, champ);
    await startFromSelect(page);
    const st = await T(page, 'state');
    check(`play.${arena}.started`, st === 'playing', { champ, st });
    const p0 = await T(page, 'player');
    await joyDrag(page, 30, 0, 700);
    for (const b of ['#btn-basic', '#btn-s1', '#btn-s2', '#btn-s3']) { await page.dispatchEvent(b, 'pointerdown').catch(() => {}); await page.dispatchEvent(b, 'pointerup').catch(() => {}); await sleep(250); }
    await sleep(2500);
    const p1 = await T(page, 'player');
    check(`play.${arena}.player_moved`, Math.hypot(p1.x - p0.x, p1.y - p0.y) > 5, { p0, p1 });
    check(`play.${arena}.hud_visible`, await vis(page, '#hud'));
    check(`play.${arena}.canvas_drawn`, (await canvasNonBlank(page)) > 50);
    const stats = await T(page, 'stats');
    check(`play.${arena}.world_alive`, stats.enemies > 0, stats);
    // pausa (solo pruebas): nada de equipo/talentos/habilidades, solo estadísticas
    await page.click('#pause-btn');
    check(`pause.${arena}.open`, await vis(page, '#pause-screen'));
    const pz = await page.evaluate(() => ({ tabs: document.querySelectorAll('.pause-tab').length, inv: !!document.getElementById('inventory-panel'), stats: (document.getElementById('stats-panel') || {}).innerHTML.length || 0 }));
    check(`pause.${arena}.stats_only`, pz.tabs === 0 && !pz.inv && pz.stats > 20, pz);
    await page.click('#resume-btn');
    check(`pause.${arena}.resumed`, (await T(page, 'state')) === 'playing');
    const errs = await gameErrors(page, errors);
    check(`play.${arena}.no_errors`, errs.length === 0, errs);
    await ctx.close();
  }

  // F3b Arena Divina via UI
  {
    const { ctx, page, errors } = await newPage(browser, site);
    await waitImages(page);
    await page.click('#title-continue-btn'); await page.click('#mainmenu-jugar-btn');
    const divBtn = await page.$('#mode-divina-btn');
    if (divBtn) await divBtn.click(); else { await page.click('#mode-arena-btn'); await page.click('.arena-card-title:text-is("Arena Divina")').catch(() => {}); }
    await sleep(300);
    await pickChamp(page, 'Mago');
    await page.click('#divina-explore-btn').catch(() => {});
    await sleep(2500);
    const st = await T(page, 'state');
    const dv = await page.evaluate(() => window.__T.ev('({divinaMode, minions: divinaMinions.length, enemies: enemies.length, arena: currentArena})'));
    check('divina.started', st === 'playing' && dv.divinaMode && dv.arena === 'divina', dv);
    await sleep(3000);
    const errs = await gameErrors(page, errors);
    check('divina.no_errors', errs.length === 0, errs);
    await ctx.close();
  }

  // F5 talents UI purchase (Mis Campeones -> ficha -> Talentos, árbol)
  {
    const { ctx, page, errors } = await newPage(browser, site, { save: seedSave({ level: 95, tp: 60, alloc: 0 }) });
    await waitImages(page);
    await page.click('#title-continue-btn'); await page.click('#mainmenu-campeones-btn');
    await page.click('#mychamps-grid .mychamp-card[data-champ="nigromante"]');
    await page.click('#champhub-tabs .hub-tab[data-tab="talentos"]'); await sleep(200);
    const before = await page.evaluate(() => window.__T.ev('save.champions.nigromante.talentPoints'));
    let bought = 0;
    for (let i = 0; i < 6; i++) { const b = page.locator('#champhub-panel .tt-buy').first(); if (!(await b.count())) break; await b.click({ timeout: 800 }).catch(() => {}); bought++; await sleep(60); }
    const after = await page.evaluate(() => window.__T.ev('save.champions.nigromante.talentPoints'));
    check('talents.buy_ui', bought > 0 && after < before, { bought, before, after });
    const errs = await gameErrors(page, errors);
    check('talents.no_errors', errs.length === 0, errs);
    await ctx.close();
  }

  // F5b subir habilidades en partida con el "+" sobre los botones (la ulti recién desde el nivel 20)
  {
    const { ctx, page, errors } = await newPage(browser, site, { save: seedSave({ level: 12, tp: 3, alloc: 0 }) });
    await waitImages(page);
    await goToChampSelect(page, 'Ruinas del Bosque'); await pickChamp(page, 'Mago'); await startFromSelect(page);
    await sleep(600);
    const ui = await page.evaluate(() => ({ vis: [...document.querySelectorAll('.skill-plus:not(.hidden)')].map(b => b.dataset.idx), sug: (document.querySelector('.skill-plus.suggested') || {}).dataset }));
    check('skillup.plus_visible', ui.vis.length === 3 && !ui.vis.includes('ult'), ui);
    await page.dispatchEvent('.skill-plus.suggested', 'pointerdown').catch(() => {});
    await sleep(200);
    const after = await page.evaluate(() => window.__T.ev('({tp: save.champions.mago.talentPoints, alloc: save.champions.mago.skillMastery.map(m=>m.alloc)})'));
    check('skillup.invested', after.tp === 2 && after.alloc.reduce((a, b) => a + b, 0) === 1, after);
    const errs = await gameErrors(page, errors);
    check('skillup.no_errors', errs.length === 0, errs);
    await ctx.close();
  }

  // F6 inventory UI equip (en la Sala, antes de entrar: en partida no se puede)
  {
    const { ctx, page, errors } = await newPage(browser, site);
    await waitImages(page);
    await goToChampSelect(page, 'Ruinas del Bosque'); await pickChamp(page, 'Mago');
    await page.click('#start-btn'); await sleep(300);
    await page.evaluate(() => window.__T.ev('(addItemToInventory(selectedClass, makeItem("arma","legendario",selectedClass)), addItemToInventory(selectedClass, makeItem("casco","raro",selectedClass)), renderPrepSummary(), 1)'));
    await sleep(100);
    const html = await page.locator('#prep-inventory-panel').innerHTML();
    await page.locator('#prep-inventory-panel [data-prep-equip]').first().click().catch(() => {});
    await sleep(150);
    const eq = await page.evaluate(() => window.__T.ev('({len: save.champions.mago.inventory.length, equipped: Object.values(save.champions.mago.equipment).filter(Boolean).length})'));
    check('inventory.ui', html.length > 100 && eq.len >= 2 && eq.equipped >= 1, eq);
    const errs = await gameErrors(page, errors);
    check('inventory.no_errors', errs.length === 0, errs);
    await ctx.close();
  }

  // F7 death -> game over -> retry
  {
    const { ctx, page, errors } = await newPage(browser, site, { save: seedSave({ level: 5, alloc: 0 }) });
    await waitImages(page);
    await goToChampSelect(page, 'Ruinas del Bosque'); await pickChamp(page, 'Mago'); await startFromSelect(page);
    await T(page, 'damagePlayer', 999999);
    await sleep(900);
    check('death.gameover_screen', await vis(page, '#gameover-screen'), await T(page, 'state'));
    await page.click('#retry-btn').catch(() => {});
    await sleep(400);
    if (await vis(page, 'text=Comenzar')) await page.click('text=Comenzar').catch(() => {});
    await sleep(500);
    check('death.retry_playing', (await T(page, 'state')) === 'playing');
    const errs = await gameErrors(page, errors);
    check('death.no_errors', errs.length === 0, errs);
    await ctx.close();
  }

  // F12 restart / arena changes without reload (quit -> choose another arena)
  {
    const { ctx, page, errors } = await newPage(browser, site);
    await waitImages(page);
    await page.click('#title-continue-btn');
    let ok = 0;
    for (let k = 0; k < 5; k++) {
      await page.click('#mainmenu-jugar-btn'); await page.click('#mode-arena-btn');
      await page.click(`.arena-card-title:text-is("${ARENA_TITLES[k]}")`);
      await pickChamp(page, CHAMP_NAMES[(k * 7) % 10]); await startFromSelect(page);
      await sleep(1200);
      if ((await T(page, 'state')) === 'playing') ok++;
      await page.click('#pause-btn'); await page.click('#quit-btn');
      await sleep(400);
      // back to main menu from wherever quit lands
      for (let tries = 0; tries < 4 && !(await vis(page, '#mainmenu-screen')); tries++) {
        for (const sel of ['#arenaselect-back-btn', '#modeselect-back-btn', '#menu-back-btn', '#prep-back-btn', 'text=Volver']) { if (await vis(page, sel)) { await page.click(sel).catch(() => {}); await sleep(150); break; } }
      }
    }
    check('restart.five_arena_changes', ok === 5, ok);
    const errs = await gameErrors(page, errors);
    check('restart.no_errors', errs.length === 0, errs);
    await ctx.close();
  }

  // F9 saves: corrupt JSON, legacy save without talents/equipment, save persistence across reload
  {
    const { ctx, page, errors } = await newPage(browser, site, { save: '{"champions": { "tanque": broken JSON' });
    check('save.corrupt_json_boots', await vis(page, '#title-screen'));
    await page.click('#title-continue-btn');
    check('save.corrupt_json_menu', await vis(page, '#mainmenu-screen'));
    await ctx.close();
  }
  {
    const legacy = { champions: { tanque: { level: 7, xp: 12, unlocked: true, skillMastery: [{ useXp: 3, useLvl: 2 }], ultMastery: { useXp: 0, useLvl: 1 } }, mago: { level: 3, xp: 0 } }, gold: 321, itemSchemaV: 1, arenasCleared: { bosque: true } };
    const { ctx, page, errors } = await newPage(browser, site, { save: legacy });
    const s = await page.evaluate(() => window.__T.ev('({gold: save.gold, tl: save.champions.tanque.level, talents: !!save.champions.tanque.talents, eq: !!save.champions.tanque.equipment, n: Object.keys(save.champions).length, nClasses: Object.keys(CLASSES).length, schema: save.itemSchemaV})'));
    // 321 del guardado viejo (+2000 del bono único de bienvenida, P4); un guardado por campeón existente
    check('save.legacy_migrates', (s.gold === 321 || s.gold === 2321) && s.tl === 7 && s.talents && s.eq && s.n === s.nClasses, s);
    await page.click('#title-continue-btn'); await page.click('#mainmenu-tienda-btn');
    check('save.legacy_gallery', (await page.locator('#shop-champ-grid .gallery-card').count()) >= 10);
    const errs = await gameErrors(page, errors);
    check('save.legacy_no_errors', errs.length === 0, errs);
    await ctx.close();
  }
  {
    const { ctx, page, errors } = await newPage(browser, site);
    await page.evaluate(() => window.__T.ev('save.gold = 4321; save.champions.mago.level = 42; persist();'));
    await page.reload({ waitUntil: 'load' });
    const s = await page.evaluate(() => window.__T.ev('({g: save.gold, l: save.champions.mago.level})'));
    check('save.persist_reload', s.g === 4321 && s.l === 42, s);
    await ctx.close();
  }

  // F11 iPhone: portrait shows the rotate overlay; landscape + touch plays
  {
    const { ctx, page } = await newPage(browser, site, { mobile: true, portrait: true });
    check('mobile.portrait_rotate_overlay', await vis(page, '#rotate-overlay'));
    await ctx.close();
  }
  {
    const { ctx, page, errors } = await newPage(browser, site, { mobile: true });
    await waitImages(page);
    await page.tap('#title-continue-btn');
    check('mobile.menu_tap', await vis(page, '#mainmenu-screen'));
    await page.tap('#mainmenu-jugar-btn'); await page.tap('#mode-arena-btn');
    await page.tap('.arena-card-title:text-is("Ruinas del Bosque")');
    await pickChamp(page, 'Soporte');
    await page.tap('#start-btn'); await sleep(300);
    if (await vis(page, 'text=Comenzar')) await page.tap('text=Comenzar').catch(() => {});
    await sleep(400);
    check('mobile.playing', (await T(page, 'state')) === 'playing');
    const p0 = await T(page, 'player');
    const cdp = await ctx.newCDPSession(page);
    const jb = await page.locator('#joy-base').boundingBox();
    const cx = jb.x + jb.width / 2, cy = jb.y + jb.height / 2;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx, y: cy, id: 1 }] });
    for (let k = 1; k <= 4; k++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: cx + 8 * k, y: cy - 3 * k, id: 1 }] }); await sleep(30); }
    await sleep(900);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    const p1 = await T(page, 'player');
    check('mobile.touch_joystick_moves', Math.hypot(p1.x - p0.x, p1.y - p0.y) > 5, { p0, p1 });
    await page.tap('#btn-s1').catch(() => {}); await page.tap('#btn-basic').catch(() => {});
    const layout = await page.evaluate(() => ({ w: innerWidth, h: innerHeight, scrollW: document.documentElement.scrollWidth, canvas: [document.querySelector('canvas').width, document.querySelector('canvas').height], controls: !!document.getElementById('controls').getBoundingClientRect().width }));
    check('mobile.layout', layout.scrollW <= layout.w + 1 && layout.controls, layout);
    const errs = await gameErrors(page, errors);
    check('mobile.no_errors', errs.length === 0, errs);
    await ctx.close();
  }

  const summary = { pass: checks.filter(c => c.ok).length, fail: checks.filter(c => !c.ok).length, secs: (Date.now() - tStart) / 1000 };
  console.log('SUMMARY', JSON.stringify(summary));
  writeJSON(`${outdir}/func.json`, { summary, checks });
  await browser.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
