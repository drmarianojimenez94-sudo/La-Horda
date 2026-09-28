// AUDITORÍA ALPHA — "jugador nuevo": perfil limpio, iPhone horizontal, toques reales.
// Saca captura en cada paso, lista los botones visibles y junta errores de consola / 404.
//   (python3 -m http.server 8771 &) ; node tools/audit/journey.js <outdir> [campaign]
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const fs = require('fs'), path = require('path');
const BASE = process.env.SE_BASE_URL || 'http://127.0.0.1:8771';
const out = process.argv[2] || '/tmp/journey'; fs.mkdirSync(out, { recursive: true });
const campaign = process.argv[3] === 'campaign';
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  if (campaign) await ctx.addInitScript(() => { window.__campaignMode = true; });
  await ctx.addInitScript(() => { window.__autoConfirm = true; window.__firstRun = true; }); // + primer arranque corto (js/ui/hub.js) // diálogos propios (game-dialog.js): aceptar solos, como page.on('dialog')
  const page = await ctx.newPage();
  const errors = [], missing = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/fonts\.g|ERR_CERT/.test(m.text())) errors.push('console: ' + m.text()); });
  page.on('dialog', d => { console.log('   [confirm]', d.message().slice(0, 90)); d.accept(); }); // un jugador que dice que sí
  page.on('response', r => { if (r.status() >= 400) missing.push(r.status() + ' ' + r.url()); });
  let n = 0; const log = [];
  const snap = async (label) => {
    const file = String(++n).padStart(2, '0') + '_' + label + '.png';
    await page.screenshot({ path: path.join(out, file) });
    const vis = await page.evaluate(() => [...document.querySelectorAll('button, a.btn, [role=button], .mode-card, .arena-card, .tab')].filter(b => { const r = b.getBoundingClientRect(); const s = getComputedStyle(b); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && r.bottom > 0 && r.top < innerHeight; }).map(b => { const r = b.getBoundingClientRect(); return (b.id ? '#' + b.id + ' ' : '') + (b.innerText || b.title || b.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 40) + ` [${Math.round(r.width)}x${Math.round(r.height)}${r.left < 0 || r.right > innerWidth ? ' OFFSCREEN' : ''}]`; }));
    log.push({ step: file, buttons: vis });
    console.log('--', file, '\n   ', vis.slice(0, 18).join('\n    '));
  };
  const tap = async (sel) => { const el = await page.$(sel); if (!el) { console.log('   (no existe', sel, ')'); return false; } await el.evaluate(e => e.scrollIntoView({block: 'center'})); await sleep(250); const b = await el.boundingBox(); if (!b) { console.log('   (invisible', sel, ')'); return false; } await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); await sleep(700); return true; };
  const tapText = async (re) => { const h = await page.evaluateHandle((src) => { const r = new RegExp(src, 'i'); return [...document.querySelectorAll('button, .mode-card, .arena-card, .champ-card, [class*=card], [data-tab], .tab, [role=button], a, li')].find(b => { const x = b.getBoundingClientRect(); return x.width > 0 && r.test(b.innerText || ''); }) || null; }, re.source); const el = h.asElement(); if (!el) { console.log('   (no encontré', re, ')'); return false; } await el.evaluate(e => e.scrollIntoView({block: 'center'})); await sleep(250); const b = await el.boundingBox(); await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); await sleep(800); return true; };
  const t0 = Date.now();
  await page.goto(BASE + '/index.html', { waitUntil: 'load' });
  await sleep(1500); await snap('t0_carga');
  for (let k = 0; k < 100; k++) { if (await page.evaluate(() => { const b = document.getElementById('title-continue-btn'); return b && !b.disabled; })) break; await sleep(100); }
  console.log('   carga hasta botón listo:', Date.now() - t0, 'ms');
  await snap('titulo');
  await tap('#title-continue-btn'); await sleep(800); await snap('tras_titulo');
  fs.writeFileSync(path.join(out, 'log.json'), JSON.stringify({ log, errors, missing }, null, 1));
  // modo exploración: el resto lo maneja el orquestador leyendo la pantalla
  global.__page = page;
  const steps = JSON.parse(process.env.STEPS || '[]');
  for (const s of steps) {
    if (s.tap) await tap(s.tap); else if (s.text) await tapText(new RegExp(s.text)); else if (s.eval) { try { console.log('   eval ->', JSON.stringify(await page.evaluate(s.eval))); } catch (e) { console.log('   eval ERR', e.message); } } else if (s.wait) await sleep(s.wait); else if (s.reload) { await page.reload({ waitUntil: 'load' }); for (let k = 0; k < 150; k++) { if (await page.evaluate(() => { const b = document.getElementById('title-continue-btn'); return b && !b.disabled; })) break; await sleep(100); } await tap('#title-continue-btn'); }
    if (s.snap) await snap(s.snap);
  }
  fs.writeFileSync(path.join(out, 'log.json'), JSON.stringify({ log, errors, missing }, null, 1));
  console.log('ERRORS', errors.length); for (const e of errors.slice(0, 12)) console.log('  ', e);
  console.log('HTTP>=400', missing.length); for (const m of missing.slice(0, 12)) console.log('  ', m);
  await browser.close();
})();
