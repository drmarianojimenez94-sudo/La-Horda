'use strict';
// Guerra de Cristales integrada al juego: tarjeta propia en el hub, registro de modos, ida al Coliseo y vuelta
// DIRECTA al hub (sin pasar por la portada). A 844×390 y 667×375 la tarjeta entra en pantalla y no tapa nada.
//   node tools/crystal-wars/hub-integration.js [outdir]   (levanta su servidor; CW_HUB_PORT, CHROMIUM_PATH)
const assert = require('node:assert/strict'), {spawn} = require('node:child_process'), path = require('node:path'), fs = require('node:fs');
let chromium; try { ({chromium} = require('playwright')); } catch (e) { ({chromium} = require('/opt/node22/lib/node_modules/playwright')); }
const ROOT = path.resolve(__dirname, '../..'), PORT = +(process.env.CW_HUB_PORT || 8843), OUT = process.argv[2] || null;
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], {cwd: ROOT, stdio: 'ignore'});
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  await sleep(500);
  const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || chromium.executablePath(), args: ['--no-sandbox']});
  try {
    for (const [width, height] of [[844, 390], [667, 375]]) {
      const ctx = await browser.newContext({viewport: {width, height}});
      // jugador que ya hizo el entrenamiento, invitado sin cuenta
      await ctx.addInitScript(() => { try { if (!localStorage.getItem('cwTestInit')) { localStorage.setItem('cwTestInit', '1'); } } catch (e) {} });
      const page = await ctx.newPage(), errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(`http://127.0.0.1:${PORT}/`, {waitUntil: 'domcontentloaded'});
      await page.waitForFunction(() => typeof setState === 'function' && typeof renderMainMenu === 'function', null, {timeout: 120000});
      await page.evaluate(() => { save.tut = save.tut || {}; save.tut.training = 1; save.firstRun = 'hub'; save.champions.tanque.unlocked = true; persistNow(); setState('mainmenu'); renderMainMenu(); });
      await sleep(400);
      const r = await page.evaluate(() => {
        const b = document.getElementById('hub-crystal-btn'), rc = b && b.getBoundingClientRect();
        const play = document.getElementById('hub-play-btn').getBoundingClientRect();
        return {vis: !!b && !b.classList.contains('hidden') && rc.width > 0, rc: rc && {x: rc.x, y: rc.y, w: rc.width, h: rc.height}, inView: rc && rc.left >= 0 && rc.right <= innerWidth + 1 && rc.top >= 0 && rc.bottom <= innerHeight + 1,
          overlapPlay: rc && !(rc.right <= play.left || rc.left >= play.right || rc.bottom <= play.top || rc.top >= play.bottom), reg: !!(window.GAME_MODE_REGISTRY && GAME_MODE_REGISTRY.crystalWars), txt: b && b.innerText};
      });
      assert(r.vis && r.reg, `${width}: tarjeta y registro (${JSON.stringify(r)})`);
      assert(r.inView, `${width}: la tarjeta entra en pantalla (${JSON.stringify(r.rc)})`);
      assert(r.rc.h >= 44, `${width}: objetivo táctil ≥ 44 px (${r.rc.h})`);
      assert(!r.overlapPlay, `${width}: no tapa el botón de jugar`);
      if (OUT) { fs.mkdirSync(OUT, {recursive: true}); await page.screenshot({path: path.join(OUT, `hub_${width}.png`)}); }
      // ida al Coliseo
      await page.click('#hub-crystal-btn');
      await page.waitForURL(/crystal-wars\.html/, {timeout: 15000, waitUntil: 'commit'}).catch(async e => { console.log('  sin navegar:', JSON.stringify(await page.evaluate(() => ({ready: HordaOnboarding.ready(save), url: location.href, toast: (document.querySelector('.net-toast')||{}).innerText})).catch(x => x.message))); throw e; });
      await page.waitForSelector('#practice', {timeout: 15000});
      const back = await page.getAttribute('#back', 'href');
      assert.equal(back, 'index.html?return=hub', 'el enlace de vuelta pide el hub');
      // vuelta directa al hub
      await page.click('#back');
      await page.waitForURL(/index\.html/, {timeout: 15000, waitUntil: 'commit'}).catch(e => { console.log('  vuelta: url', page.url()); throw e; });
      await page.waitForFunction(() => typeof state !== 'undefined' && state === 'mainmenu', null, {timeout: 90000}).catch(() => {});
      const st = await page.evaluate(() => ({state, url: location.search}));
      assert.equal(st.state, 'mainmenu', `vuelve al hub, no a la portada (${JSON.stringify(st)})`);
      assert(!/return=/.test(st.url), 'limpia ?return de la barra de direcciones');
      assert.deepEqual(errors, [], 'sin errores de página');
      console.log(`PASS ${width}×${height}: tarjeta en el hub, ida al Coliseo y vuelta directa al hub`);
      await ctx.close();
    }
    // sin entrenamiento: el botón explica por qué (no manda al tutorial en silencio) y "Ya sé jugar" entra
    {
      const ctx = await browser.newContext({viewport: {width: 667, height: 375}});
      const page = await ctx.newPage(), errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(`http://127.0.0.1:${PORT}/`, {waitUntil: 'domcontentloaded'});
      await page.waitForFunction(() => typeof setState === 'function' && typeof renderMainMenu === 'function', null, {timeout: 120000});
      await page.evaluate(() => { save.tut = {}; save.firstRun = 'hub'; save.champions.tanque.unlocked = true; save.starterSkinPending = false; persistNow(); setState('mainmenu'); renderMainMenu(); });
      await sleep(400);
      await page.click('#hub-crystal-btn');
      await page.waitForSelector('#cw-gate:not(.hidden)', {timeout: 5000});
      const g = await page.evaluate(() => { const r = document.querySelector('#cw-gate .ui-modal-panel').getBoundingClientRect();
        return {state, url: location.pathname, text: document.getElementById('cw-gate-text').innerText, skip: !document.getElementById('cw-gate-skip').classList.contains('hidden'),
          fits: r.top >= 0 && r.bottom <= innerHeight + 1 && r.left >= 0 && r.right <= innerWidth + 1}; });
      assert.equal(g.state, 'mainmenu', 'no entra al tutorial sin avisar');
      assert(/entrenamiento/.test(g.text) && g.skip && g.fits, `aviso claro con opción de saltar (${JSON.stringify(g)})`);
      if (OUT) await page.screenshot({path: path.join(OUT, 'gate_667.png')});
      await page.click('#cw-gate-skip');
      await page.waitForURL(/crystal-wars\.html/, {timeout: 15000, waitUntil: 'commit'});
      await page.waitForSelector('#practice', {timeout: 15000});
      assert.deepEqual(errors, [], 'sin errores de página');
      console.log('PASS 667×375 sin entrenamiento: aviso con opción, "Ya sé jugar" entra al Coliseo');
      await ctx.close();
    }
    // servidor sin la página del Coliseo (404): mensaje claro y el jugador se queda en el juego (no pantalla negra de error)
    {
      const ctx = await browser.newContext({viewport: {width: 667, height: 375}});
      const page = await ctx.newPage(), errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.route('**/crystal-wars.html*', route => route.fulfill({status: 404, contentType: 'text/plain', body: 'No esta: /crystal-wars.html'}));
      await page.goto(`http://127.0.0.1:${PORT}/`, {waitUntil: 'domcontentloaded'});
      await page.waitForFunction(() => typeof setState === 'function' && typeof renderMainMenu === 'function', null, {timeout: 120000});
      await page.evaluate(() => { save.tut = save.tut || {}; save.tut.training = 1; save.firstRun = 'hub'; save.champions.tanque.unlocked = true; persistNow(); setState('mainmenu'); renderMainMenu(); });
      await sleep(400);
      await page.click('#hub-crystal-btn');
      await page.waitForFunction(() => /todavía no está publicada/.test(document.body.innerText), null, {timeout: 8000});
      assert(!/crystal-wars\.html/.test(page.url()), 'no navega a la página que da 404');
      assert.equal(await page.evaluate(() => state), 'mainmenu', 'sigue en el hub');
      assert.deepEqual(errors, [], 'sin errores de página');
      console.log('PASS 404 del Coliseo: aviso claro y el jugador se queda en el hub');
      await ctx.close();
    }
  } finally { await browser.close(); server.kill(); }
})().catch(e => { console.error(e.message || e); process.exitCode = 1; server.kill(); });
