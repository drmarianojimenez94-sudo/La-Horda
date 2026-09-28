// CUENTA DE TOQUES DE LOS MENÚS (celular apaisado): recorre con toques reales los caminos más frecuentes
// desde la pantalla de título y cuenta cuántos toques lleva cada uno hasta cumplir su objetivo:
//   arena  → empezar la próxima arena de la campaña (hasta estar jugando)
//   equipo → equipar un objeto en tu guardián
//   compra → comprar (desbloquear) un guardián
//   skin   → cambiar de skin (una que ya tenés)
//   sala   → entrar a una sala con código (escribir el código cuenta como un toque)
//   primera→ PERFIL NUEVO: del título a estar jugando la Arena 01 (elegir el guardián de regalo incluido;
//            el prólogo y la ficha del Hechicero cuentan un toque por página; primera_salta: con "Saltar ▸▸")
// Perfil de prueba: guardián Musashi (Nv. 5), Arena 01 superada, 20.000 de oro, un arma en el inventario
// y las piezas del set de la skin "errante" sin equipar.
//   node tools/audit/menu_taps.js [outdir=/tmp/menu_taps]     (FLOWS=before para el camino viejo; ONLY=regex)
// Sirve el repo en SE_BASE_URL (default http://127.0.0.1:8783; lo levanta si no hay nada escuchando).
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const fs = require('fs'), path = require('path'), http = require('http'), { spawn } = require('child_process');
const BASE = process.env.SE_BASE_URL || 'http://127.0.0.1:8783';
const OUT = process.argv[2] || '/tmp/menu_taps'; fs.mkdirSync(OUT, { recursive: true });
const ROOT = path.resolve(__dirname, '..', '..');
const ONLY = process.env.ONLY ? new RegExp(process.env.ONLY) : null;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const VIEWPORTS = [{ name: 'iphone14', width: 844, height: 390, dpr: 2 }, { name: 'iphoneSE', width: 667, height: 375, dpr: 2 }];

function ping(url) { return new Promise(res => { const r = http.get(url, x => { x.resume(); res(x.statusCode < 500); }); r.on('error', () => res(false)); r.setTimeout(1500, () => { r.destroy(); res(false); }); }); }
async function ensureServer() {
  if (await ping(BASE + '/index.html')) return null;
  const u = new URL(BASE);
  const srv = spawn('python3', ['-m', 'http.server', u.port || '80', '--bind', u.hostname], { cwd: ROOT, stdio: 'ignore' });
  for (let i = 0; i < 50 && !(await ping(BASE + '/index.html')); i++) await sleep(100);
  return srv;
}
// pasos: string = selector a tocar · {fill, text} = tocar el campo y escribir · {intro:true} = ¡A LA BATALLA!
const RI = { intro: true };
const FLOWS = {
  before: {
    arena: ['#title-continue-btn', '#mainmenu-jugar-btn', '#mode-arena-btn', '.arena-card[data-arena="fortaleza"]', '#start-btn', '#prep-start-btn', RI],
    equipo: ['#title-continue-btn', '#mainmenu-codex-btn', '[data-sec="campeones"]', '.cx-champ-card[data-go="champ:musashi"]', '[data-ctab="equipo"]', '#cx-hub-panel [data-inv-equip]'],
    compra: ['#title-continue-btn', '#mainmenu-tienda-btn', '[data-champ-buy="mago"]'],
    skin: ['#title-continue-btn', '#mainmenu-codex-btn', '[data-sec="campeones"]', '.cx-champ-card[data-go="champ:musashi"]', '[data-skin="errante"]', '#cx-skin-equip'],
    sala: ['#title-continue-btn', '#mainmenu-jugar-btn', { fill: '#mode-join-code', text: 'QKL58J' }, '#mode-join-btn'],
    // antes del primer arranque corto: guardián → hub → JUGAR → Sala → Comenzar → Hechicero
    primera: ['#title-continue-btn', '.starter-card[data-champ="mago"]', '#starter-yes-btn', '#hub-play-btn', '#prep-start-btn', RI],
  },
  after: {
    arena: ['#title-continue-btn', '#hub-play-btn', '#prep-start-btn', RI],
    equipo: ['#title-continue-btn', '#mainmenu-guardianes-btn', '#cx-hub-panel [data-inv-equip]'],
    compra: ['#title-continue-btn', '#mainmenu-tienda-btn', '[data-champ-buy="mago"]', '#game-dialog .gd-ok'],
    skin: ['#title-continue-btn', '#mainmenu-guardianes-btn', '[data-ctab="skins"]', '[data-skin-use="errante"]'],
    sala: ['#title-continue-btn', '#mainmenu-jugar-btn', { fill: '#mode-join-code', text: 'QKL58J' }, '#mode-join-btn'],
    // primer arranque corto: título → guardián de regalo → directo a la Ciudad (sin hub ni Sala)
    primera: ['#title-continue-btn', '.starter-card[data-champ="mago"]', '#starter-yes-btn', RI],
    // lo mismo salteando el prólogo con "Saltar ▸▸"
    primera_salta: ['#title-continue-btn', '.starter-card[data-champ="mago"]', '#starter-yes-btn', '#run-intro .ri-skip', RI],
  },
};
const GOALS = {
  arena: () => state === 'playing' && currentArena === 'fortaleza',
  equipo: () => Object.values(save.champions.musashi.equipment).filter(Boolean).length > (window.__eq0 || 0),
  compra: () => !!save.champions.mago.unlocked,
  skin: () => typeof skinIsActiveOn === 'function' && skinIsActiveOn('errante', 'musashi'),
  primera: () => state === 'playing' && currentArena === 'ciudad',
  primera_salta: () => state === 'playing' && currentArena === 'ciudad',
  sala: () => /caracteres|No existe|servidor|Conectando|conect|sala/i.test((document.getElementById('mode-join-status') || {}).textContent || '') || state === 'prep',
};
function setupProfile() {
  for (const k in save.champions) { save.champions[k].unlocked = (k === 'musashi'); save.champions[k].level = 5; }
  selectedClass = 'musashi'; save.lastChamp = 'musashi'; save.starterChosen = true; save.startGoldNotice = false;
  save.gold = 20000; save.arenasCleared = { ciudad: true }; save.legacyOpenArenas = []; save.justUnlockedArena = null;
  currentArena = 'ciudad';
  const it = makeItem('arma', 'raro', null); addItemToInventory(null, it);
  for (const p of shopSetMissing('errante')) { const x = makeDesignedItem(p); x.bought = true; addItemToInventory(null, x); }
  window.__eq0 = Object.values(save.champions.musashi.equipment).filter(Boolean).length;
  persistNow();
}

async function runFlow(browser, vp, which, name, steps) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: true, hasTouch: true, deviceScaleFactor: vp.dpr });
  await ctx.addInitScript(() => { window.__campaignMode = true; try { if (!sessionStorage.getItem('__mt')) { localStorage.clear(); sessionStorage.setItem('__mt', '1'); } } catch (e) {} });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', d => d.accept());
  await page.goto(BASE + '/index.html', { waitUntil: 'load' });
  for (let k = 0; k < 300; k++) { if (await page.evaluate(() => { const b = document.getElementById('title-continue-btn'); return !!b && !b.disabled && /Toca/.test(b.textContent); })) break; await sleep(100); }
  if (!/^primera/.test(name)) await page.evaluate(setupProfile); // "primera" arranca con el perfil vacío
  await sleep(300);
  let taps = 0, n = 0, ok = false, fail = '';
  const shot = async (lbl) => page.screenshot({ path: path.join(OUT, `${which}_${vp.name}_${name}_${String(n++).padStart(2, '0')}_${lbl}.png`) });
  await shot('inicio');
  for (const s of steps) {
    if (s.intro) {
      for (let i = 0; i < 80; i++) {
        const st = await page.evaluate(() => ({ open: !document.getElementById('run-intro').classList.contains('hidden'), dis: (document.querySelector('.ri-go') || {}).disabled, state }));
        if (!st.open && st.state === 'playing') break;
        if (st.open && !st.dis) { const b = await page.$('.ri-go'); const bb = b && await b.boundingBox(); if (bb) { await shot('intro'); await page.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2); taps++; await sleep(900); continue; } }
        await sleep(250);
      }
      continue;
    }
    const sel = typeof s === 'string' ? s : s.fill;
    let el = null;
    for (let i = 0; i < 40 && !el; i++) { el = await page.$(sel); if (el && !(await el.boundingBox())) el = null; if (!el) await sleep(150); }
    if (!el) { fail = 'no aparece ' + sel; break; }
    await el.evaluate(e => e.scrollIntoView({ block: 'center', inline: 'center' })); await sleep(200);
    const b = await el.boundingBox();
    await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); taps++;
    if (s.fill) await page.keyboard.type(s.text);
    await sleep(700);
    await shot(sel.replace(/[^a-z0-9]+/gi, '_').slice(0, 30));
  }
  for (let i = 0; i < 40 && !ok; i++) { ok = await page.evaluate(GOALS[name]).catch(() => false); if (!ok) await sleep(250); }
  await ctx.close();
  return { taps, ok, fail, errors };
}

(async () => {
  const which = process.env.FLOWS || 'after';
  const srv = await ensureServer();
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const res = {};
  let bad = 0;
  try {
    for (const vp of VIEWPORTS) for (const [name, steps] of Object.entries(FLOWS[which])) {
      if (ONLY && !ONLY.test(name)) continue;
      const r = await runFlow(browser, vp, which, name, steps);
      (res[vp.name] = res[vp.name] || {})[name] = r;
      if (!r.ok || r.errors.length) bad++;
      console.log(`${r.ok && !r.errors.length ? 'PASS' : 'FAIL'} ${which} ${vp.name} ${name.padEnd(7)} toques=${r.taps}${r.fail ? ' · ' + r.fail : ''}${r.errors.length ? ' · errores: ' + r.errors.slice(0, 3).join(' | ') : ''}`);
    }
  } finally { await browser.close(); if (srv) srv.kill(); }
  fs.writeFileSync(path.join(OUT, which + '_taps.json'), JSON.stringify(res, null, 1));
  console.log(`SUMMARY ${which} fallas=${bad}`);
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
