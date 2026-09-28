// AUDITORÍA DE UI MÓVIL (horizontal): recorre todas las pantallas de menú con toques reales en
// iPhone 14 (844×390) y iPhone SE (667×375) y mide, en cada una:
//   (a) blancos táctiles chicos: elementos interactivos visibles con caja < 40 px de ancho o de alto
//   (b) desbordes: scroll horizontal de la página, o interactivos cortados por el borde de la
//       pantalla que no están dentro de un contenedor que scrollee
//   (c) texto visible con font-size calculado < 11 px
//   (d) botón principal (Comenzar, ¡A LA BATALLA!, Comprar, Aceptar…) fuera de la vista sin scrollear
//   (e) tipografía: texto visible (con letras o números) cuya fuente calculada no empieza por
//       Press Start 2P o VT323 (Georgia/serif/Arial que se colaron). Se mide también en el HUD de la
//       partida, donde (c) no aplica. Va aparte en el resumen: "fonts=N".
// Saca una captura por pantalla y por dispositivo, imprime un resumen JSON y "SUMMARY issues=N".
//   node tools/audit/ui_layout.js [outdir=/tmp/ui_layout]     (ONLY=regex filtra pantallas; FONTS_DIR, ver abajo)
// Cada problema se cuenta una vez por pantalla (misma firma = misma regla de CSS); report.json trae
// además la lista completa de elementos.
// Sirve el repo en 127.0.0.1:8783 (lo levanta solo si no hay nada escuchando; SE_BASE_URL lo cambia).
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const fs = require('fs'), path = require('path'), http = require('http'), { spawn } = require('child_process');
const BASE = process.env.SE_BASE_URL || 'http://127.0.0.1:8783';
const OUT = process.argv[2] || '/tmp/ui_layout'; fs.mkdirSync(OUT, { recursive: true });
const ROOT = path.resolve(__dirname, '..', '..');
const ONLY = process.env.ONLY ? new RegExp(process.env.ONLY) : null; // filtro opcional de pantallas
// Opcional: carpeta con fonts.css + .woff2 de Google Fonts (Press Start 2P / VT323) para medir con la
// tipografía real cuando el navegador de pruebas no llega a fonts.googleapis.com.
const FONTS_DIR = process.env.FONTS_DIR || '';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const VIEWPORTS = [
  { name: 'iphone14', width: 844, height: 390, dpr: 3 },
  { name: 'iphoneSE', width: 667, height: 375, dpr: 2 },
];
const MIN_TARGET = 40, MIN_FONT = 11;

function ping(url) {
  return new Promise(res => { const r = http.get(url, x => { x.resume(); res(x.statusCode < 500); }); r.on('error', () => res(false)); r.setTimeout(1500, () => { r.destroy(); res(false); }); });
}
async function ensureServer() {
  if (await ping(BASE + '/index.html')) return null;
  const u = new URL(BASE);
  const srv = spawn('python3', ['-m', 'http.server', u.port || '80', '--bind', u.hostname], { cwd: ROOT, stdio: 'ignore' });
  for (let i = 0; i < 50 && !(await ping(BASE + '/index.html')); i++) await sleep(100);
  return srv;
}

// ---------------------------------------------------------------- medición (corre en la página)
function measure(opts) {
  const { root: rootSel, primary, minTarget, minFont, interSel, skipText, skipFonts } = opts;
  const vw = innerWidth, vh = innerHeight;
  const root = rootSel ? document.querySelector(rootSel) : document.body;
  if (!root || !root.getBoundingClientRect().width) return { small: [], overflow: [], tinyText: [], primaryHidden: [`pantalla ${rootSel} no se abrió`], fonts: [] };
  const vis = el => {
    if (!el || !el.getBoundingClientRect) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    if (el.checkVisibility && !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false;
    return true;
  };
  const desc = el => {
    const r = el.getBoundingClientRect();
    let s = el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.classList.length ? '.' + [...el.classList].slice(0, 3).join('.') : '');
    const t = (el.innerText || el.value || el.getAttribute('aria-label') || el.title || '').trim().replace(/\s+/g, ' ').slice(0, 32);
    return `${s}${t ? ' "' + t + '"' : ''} [${Math.round(r.width)}x${Math.round(r.height)} @${Math.round(r.left)},${Math.round(r.top)}]`;
  };
  // ¿Algún ancestro scrollea en ese eje? (entonces lo que queda afuera se alcanza deslizando)
  const scrollAncestor = (el, axis) => {
    for (let p = el.parentElement; p && p !== document.documentElement; p = p.parentElement) {
      const cs = getComputedStyle(p), ov = axis === 'x' ? cs.overflowX : cs.overflowY;
      if ((ov === 'auto' || ov === 'scroll') && (axis === 'x' ? p.scrollWidth > p.clientWidth + 1 : p.scrollHeight > p.clientHeight + 1)) return p;
    }
    return null;
  };
  // antes de medir: todo scrolleado al principio (lo que ve el jugador al entrar)
  for (const el of [root, ...root.querySelectorAll('*')]) { if (el.scrollTop) el.scrollTop = 0; if (el.scrollLeft) el.scrollLeft = 0; }
  const res = { small: [], overflow: [], tinyText: [], primaryHidden: [], fonts: [] };
  const se = document.scrollingElement;
  if (se.scrollWidth > vw + 1) res.overflow.push(`page scrollWidth ${se.scrollWidth} > ${vw}`);
  // la pantalla activa no debe scrollear de costado
  const scr = root.matches('.screen') ? root : root.querySelector('.screen:not(.hidden)');
  if (scr && vis(scr) && scr.scrollWidth > scr.clientWidth + 1 && getComputedStyle(scr).overflowX !== 'hidden') res.overflow.push(`${desc(scr)} scrollWidth ${scr.scrollWidth} > ${scr.clientWidth}`);

  // herramientas de desarrollo (solo con ?dev=1 / ?debug=1): no las ve el jugador
  const IGNORE = '#net-debug-btn, #net-debug-panel, .inv-debug-btn';
  const ignored = el => !!el.closest(IGNORE);
  const SEL = interSel || 'button, [onclick], a, input:not([type=hidden]), select, textarea, [role=button], .btn, .hub-tab, .shop-tab, .cx-tab, .cx-chip:not(.static), .inv-chip';
  const inter = [...root.querySelectorAll(SEL)].filter(el => vis(el) && !ignored(el));
  for (const el of inter) {
    const r = el.getBoundingClientRect();
    if (!el.disabled && (r.width < minTarget || r.height < minTarget)) res.small.push(desc(el));
    const outX = r.left < -1 || r.right > vw + 1, outY = r.top < -1 || r.bottom > vh + 1;
    if ((outX && !scrollAncestor(el, 'x')) || (outY && !scrollAncestor(el, 'y'))) res.overflow.push('cut: ' + desc(el));
  }
  // (c) texto chico: se agrupa por elemento padre
  const seen = new Set();
  const tw = skipText ? null : document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: n => n.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT });
  for (let n; tw && (n = tw.nextNode());) {
    const p = n.parentElement; if (!p || seen.has(p)) continue; seen.add(p);
    if (p.closest('svg, canvas, script, style, noscript') || ignored(p)) continue;
    if (!vis(p)) continue;
    const fs = parseFloat(getComputedStyle(p).fontSize);
    if (fs < minFont) res.tinyText.push(`${fs.toFixed(1)}px ${desc(p)}`);
  }
  // (e) tipografía: solo las dos fuentes pixel del juego (el primer nombre de la pila calculada). Texto
  // que es solo símbolos o emojis (★ ▲ ✓) no cuenta: esos glifos salen de la fuente de reserva igual.
  if (!skipFonts) {
    const OKF = /^(press start 2p|vt323|vt323 texto)$/i, HASW = /[\p{L}\p{N}]/u;
    const fam = el => (getComputedStyle(el).fontFamily.split(',')[0] || '').trim().replace(/^["']|["']$/g, '');
    const seenF = new Set();
    const tf = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: n => HASW.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT });
    const chk = p => {
      if (!p || seenF.has(p)) return; seenF.add(p);
      if (p.closest('svg, canvas, script, style, noscript') || ignored(p) || !vis(p)) return;
      const f = fam(p); if (!OKF.test(f)) res.fonts.push(`${f} ${desc(p)}`);
    };
    for (let n; (n = tf.nextNode());) chk(n.parentElement);
    for (const el of root.querySelectorAll('input:not([type=hidden]):not([type=range]):not([type=checkbox]):not([type=radio]), select, textarea')) chk(el);
  }
  // (d) botones principales: al menos uno por selector debe verse entero sin scrollear
  for (const sel of primary || []) {
    let cands = [...document.querySelectorAll(sel.css)].filter(vis);
    if (sel.text) cands = cands.filter(e => new RegExp(sel.text, 'i').test(e.innerText || ''));
    if (!cands.length) { res.primaryHidden.push(`${sel.css}${sel.text ? ' /' + sel.text + '/' : ''}: no existe/visible`); continue; }
    const ok = cands.some(e => { const r = e.getBoundingClientRect(); return r.top >= -1 && r.bottom <= vh + 1 && r.left >= -1 && r.right <= vw + 1; });
    if (!ok) res.primaryHidden.push('below fold: ' + desc(cands[0]));
  }
  res.small = [...new Set(res.small)]; res.overflow = [...new Set(res.overflow)]; res.fonts = [...new Set(res.fonts)];
  return res;
}

// Una lista de 90 objetos con el mismo botón chico es UN problema de CSS, no 90: se cuenta cada
// problema una vez por pantalla según su firma (etiqueta#id.clases [+ tamaño de letra]).
const sigOf = s => s.replace(/^cut: /, 'cut ').replace(/^below fold: /, '').replace(/ ".*$| \[.*$/, '');
function uniq(r) {
  const o = {};
  for (const k of ['small', 'overflow', 'tinyText', 'primaryHidden', 'fonts']) o[k] = new Set((r[k] || []).map(sigOf)).size;
  return o;
}

// ---------------------------------------------------------------- recorrido
async function runViewport(browser, vp, report) {
  const errors = [];
  const mk = async (dev) => {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: true, hasTouch: true, deviceScaleFactor: vp.dpr });
    await ctx.addInitScript(() => { window.__autoConfirm = true; });
    if (FONTS_DIR && fs.existsSync(path.join(FONTS_DIR, 'fonts.css'))) {
      await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ contentType: 'text/css', body: fs.readFileSync(path.join(FONTS_DIR, 'fonts.css'), 'utf8') }));
      await ctx.route('https://fonts.gstatic.com/**', r => { const f = path.join(FONTS_DIR, path.basename(new URL(r.request().url()).pathname)); return fs.existsSync(f) ? r.fulfill({ contentType: 'font/woff2', body: fs.readFileSync(f) }) : r.abort(); });
    }
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    page.on('dialog', d => d.accept());
    await page.goto(BASE + '/index.html' + (dev ? '?dev=1' : ''), { waitUntil: 'load' });
    for (let k = 0; k < 300; k++) {
      if (await page.evaluate(() => { const b = document.getElementById('title-continue-btn'); return !!b && !b.disabled && /Toca/.test(b.textContent); })) break;
      await sleep(100);
    }
    await sleep(400);
    return { ctx, page };
  };
  const out = report[vp.name] = {};
  const snap = async (page, label, opts = {}) => {
    if (ONLY && !ONLY.test(label)) return;
    await sleep(opts.wait || 450);
    const r = await page.evaluate(measure, { root: opts.root || null, primary: opts.primary || [], interSel: opts.interSel || null, skipText: !!opts.skipText, skipFonts: !!opts.skipFonts, minTarget: MIN_TARGET, minFont: MIN_FONT });
    await page.screenshot({ path: path.join(OUT, `${vp.name}_${label}.png`) });
    out[label] = r;
    const u = uniq(r), n = u.small + u.overflow + u.tinyText + u.primaryHidden;
    console.log(`  ${vp.name} ${label.padEnd(24)} small=${u.small} overflow=${u.overflow} tiny=${u.tinyText} primary=${u.primaryHidden} fonts=${u.fonts}${n + u.fonts ? '' : '  ✓'}`);
  };
  const tapEl = async (page, el) => {
    await el.evaluate(e => e.scrollIntoView({ block: 'center', inline: 'center' }));
    await sleep(200);
    const b = await el.boundingBox(); if (!b) return false;
    await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); await sleep(500); return true;
  };
  const tap = async (page, sel) => { const el = await page.$(sel); if (!el) { console.log('   (no existe', sel, ')'); return false; } return tapEl(page, el); };
  const js = (page, fn, arg) => page.evaluate(fn, arg).catch(e => console.log('   eval ERR', e.message.split('\n')[0]));

  // ---- perfil limpio: título + primer guardián
  {
    const { ctx, page } = await mk(false);
    await snap(page, 'title', { primary: [{ css: '#title-continue-btn' }] });
    await tap(page, '#title-continue-btn');
    await snap(page, 'starter');
    await tap(page, '.starter-card');
    await sleep(600);
    await snap(page, 'starter_confirm', { primary: [{ css: '#starter-yes-btn' }] });
    await ctx.close();
  }
  // ---- perfil de desarrollo (todo desbloqueado)
  const { ctx, page } = await mk(true);
  await tap(page, '#title-continue-btn');
  await snap(page, 'mainmenu', { primary: [{ css: '#hub-play-btn' }] });
  // hub con todos los accesos (Horda Infinita bloqueada y Desafíos, como si ya existieran esos módulos)
  // (si esos módulos ya están cargados se usan los reales; si no, un reemplazo mínimo que después se saca)
  await js(page, () => { const st = window.__hubStubs = {}; if (typeof window.endlessOpen !== 'function') { st.endless = 1; window.endlessOpen = () => {}; window.endlessUnlocked = () => false; }
    if (typeof window.questsOpen !== 'function') { st.quests = 1; window.questsOpen = () => {}; } renderMainMenu(); });
  await snap(page, 'mainmenu_full', { primary: [{ css: '#hub-play-btn' }, { css: '#hub-endless-btn' }, { css: '#mainmenu-quests-btn' }] });
  await js(page, () => { const st = window.__hubStubs || {}; if (st.endless) { delete window.endlessOpen; delete window.endlessUnlocked; } if (st.quests) delete window.questsOpen; renderMainMenu(); openHubOptions(); });
  await snap(page, 'options', { root: '#hub-options', primary: [{ css: '#opt-close-btn' }] });
  await js(page, () => closeHubOptions());
  await js(page, () => { if (typeof window.endlessOpen !== 'function') { window.endlessOpen = () => {}; window.__hubStubs.endless2 = 1; } });
  await tap(page, '#mainmenu-jugar-btn');
  await snap(page, 'modes', { primary: [{ css: '#mode-join-btn' }, { css: '#mode-arena-btn' }] });
  await js(page, () => { if (window.__hubStubs.endless2) delete window.endlessOpen; });
  await tap(page, '#mode-arena-btn');
  await snap(page, 'arenaselect');
  await tap(page, '.arena-card:not(.locked)');
  await snap(page, 'guardianselect', { primary: [{ css: '#start-btn' }] });
  await tap(page, '#start-btn');
  await snap(page, 'prep_equipo', { primary: [{ css: '#prep-start-btn' }] });
  await tap(page, '#prep-tabs [data-tab=talentos]');
  await snap(page, 'prep_talentos', { primary: [{ css: '#prep-start-btn' }] });
  await tap(page, '#prep-tabs [data-tab=habilidades]');
  await snap(page, 'prep_habilidades', { primary: [{ css: '#prep-start-btn' }] });
  await tap(page, '#prep-tabs [data-tab=equipo]');
  // pestañas de la Sala (js/ui/prep-sections.js): Arena y Sala online
  await js(page, () => { document.getElementById('prep-screen').scrollTop = 0; });
  await tap(page, '[data-prep-sec=arena]');
  await snap(page, 'prep_arena', { primary: [{ css: '#prep-start-btn' }] });
  await tap(page, '[data-prep-sec=online]');
  await snap(page, 'prep_online', { primary: [{ css: '#prep-start-btn' }] });
  await tap(page, '[data-prep-sec=equipo]');
  // inventario de la cuenta
  for (const t of ['objetos', 'recetas', 'coleccion']) { await js(page, t => openMyInventory(t), t); await snap(page, 'inventory_' + t); }
  // ficha de un objeto (tocar una tarjeta del inventario)
  await js(page, () => openMyInventory('objetos'));
  const closePreview = () => js(page, () => { const b = document.querySelector('#item-preview [data-ip-close]'); if (b) b.click(); });
  if (await tap(page, '#myinv-panel .inv-card .item-name')) { await snap(page, 'inventory_item_preview', { root: '#item-preview' }); await closePreview(); }
  // ficha de un objeto CON afijos (la sección AFIJOS y el botón de la Mística) y el modal de la Mística
  const afxUid = await js(page, () => { save.gold = Math.max(save.gold || 0, 1e6); let it = stashItems().find(x => itemAffixes(x).length) || stashItems()[0]; if (!it) return null; if (!itemAffixes(it).length) rollItemAffixes(it);
    openItemPreview(it.uid, CHAMPION_CATALOG[0].id); return it.uid; });
  if (afxUid) {
    await snap(page, 'item_preview_affixes', { root: '#item-preview' });
    await js(page, u => { const b = document.querySelector('#item-preview [data-ip-close]'); if (b) b.click(); openAffixReroll(u, 0, CHAMPION_CATALOG[0].id, null); }, afxUid);
    await sleep(300);
    await snap(page, 'mistica', { root: '#affix-reroll' });
    await js(page, () => { const b = document.querySelector('#affix-reroll [data-afx-choose="-1"]'); if (b) b.click(); });
  }
  // tienda
  for (const t of ['destacados', 'campeones', 'objetos', 'skins']) {
    await js(page, t => { if (typeof codexReturnTo !== 'undefined') codexReturnTo = null; shopTab = t; setState('shop'); renderShop(); }, t);
    await snap(page, 'shop_' + t, { primary: t === 'objetos' || t === 'destacados' ? [{ css: '#shop-panel button', text: 'Comprar|🪙|Desbloquear' }] : [] });
    if (t === 'objetos' && await tap(page, '#shop-panel .shop-item .shop-item-name')) {
      await snap(page, 'shop_item_preview', { root: '#item-preview', primary: [{ css: '#item-preview [data-ip-buy]' }] });
      await closePreview();
    }
  }
  await js(page, () => { const k = CHAMPION_CATALOG[1].id; setState('champdetail'); renderChampDetail(k); });
  await snap(page, 'champdetail');
  // códice
  await js(page, () => openCodex());
  await snap(page, 'codex_home');
  for (const s of ['campeones', 'bestiario', 'jefes', 'arenas']) {
    await js(page, s => { openCodex(); const x = CODEX_SECTIONS.find(q => q.id === s); codexGo('list', x.id, x.label); }, s);
    await snap(page, 'codex_' + s);
  }
  // GUARDIANES (hub): la ficha del guardián en uso, en la pestaña Equipo
  await js(page, () => openGuardians());
  await snap(page, 'guardianes');
  for (const t of ['ficha', 'equipo', 'talentos', 'habilidades', 'skins']) {
    await js(page, t => { openCodex(); codexGo('list', 'campeones', 'GUARDIANES'); codexChampTab = t; const k = CHAMPION_CATALOG[0].id; codexGo('champ', k, CLASSES[k].name); }, t);
    await snap(page, 'codex_champ_' + t);
  }
  await js(page, () => { openCodex(); codexGo('list', 'bestiario', 'BESTIARIO'); const k = codexCreatureOrder()[0]; codexGo('creature', k, 'x'); });
  await snap(page, 'codex_creature');
  await js(page, () => { openCodex(); codexGo('list', 'jefes', 'JEFES'); codexGo('boss', CODEX_BOSSES[0].id, 'x'); });
  await snap(page, 'codex_boss');
  await js(page, () => { openCodex(); codexGo('list', 'arenas', 'ARENAS'); codexGo('arena', CAMPAIGN_ORDER[0], 'x'); });
  await snap(page, 'codex_arena');
  await js(page, () => setState('divina'));
  await snap(page, 'divina');
  // DESAFÍOS (logros, diarios/semanales, pase, perfil) y el cofre de desafío
  for (const t of ['desafios', 'logros', 'pase', 'perfil']) {
    await js(page, t => { setState('mainmenu'); questsOpen(t); }, t);
    await snap(page, 'quests_' + t, { primary: [{ css: '#quests-back-btn' }] });
  }
  await js(page, () => { save.quests.chests = [3]; questsOpen('desafios'); });
  await snap(page, 'quests_chestbar', { primary: [{ css: '#quests-body [data-qchest]' }] });
  await tap(page, '#quests-body [data-qchest]'); await sleep(1500);
  await snap(page, 'quests_chest_open', { root: '.qs-chest-ov', primary: [{ css: '.qs-chest-close' }] });
  await js(page, () => { const b = document.querySelector('.qs-chest-close'); if (b) b.click(); setState('mainmenu'); });
  // diálogos propios
  await js(page, () => { window.__autoConfirm = false; setState('prep'); renderPrepSummary(); gameConfirm('¿Salir? La sala se cierra para tus amigos.', { okText: 'Salir', danger: true }); });
  await snap(page, 'dialog_confirm', { root: '#game-dialog', primary: [{ css: '#game-dialog .gd-ok' }] });
  await tap(page, '#game-dialog .gd-ok'); await sleep(300);
  await js(page, () => { gameAlert('No se pudo arrancar la partida:\n' + 'TypeError: algo salió mal en la carga del arte de la arena.\n\n'.repeat(4) + 'Probá de nuevo en unos segundos.'); });
  await snap(page, 'dialog_alert', { root: '#game-dialog', primary: [{ css: '#game-dialog .gd-ok' }] });
  await tap(page, '#game-dialog .gd-ok'); await sleep(300);
  await js(page, () => { window.__autoConfirm = true; });
  // partida: Hechicero → pausa → resultados
  await js(page, () => { currentArena = ARENA_ORDER[0]; setState('prep'); renderPrepSummary(); });
  await tap(page, '#prep-start-btn');
  for (let i = 0; i < 6; i++) {
    const st = await page.evaluate(() => ({ open: !document.getElementById('run-intro').classList.contains('hidden'), state, go: (document.querySelector('.ri-go') || {}).textContent, dis: (document.querySelector('.ri-go') || {}).disabled }));
    if (!st.open) break;
    if (st.dis) { await sleep(500); continue; }
    await snap(page, /BATALLA/.test(st.go) ? 'run_intro' : 'run_prologue', { root: '#run-intro', primary: [{ css: '.ri-go' }] });
    await tap(page, '.ri-go'); await sleep(900);
  }
  for (let k = 0; k < 40 && (await page.evaluate(() => state)) !== 'playing'; k++) await sleep(250);
  await sleep(1200);
  // el HUD no es un menú: solo se mide la entrada a la pausa (botones de arriba), sin texto
  await snap(page, 'hud_playing', { interSel: '#pause-btn, #mute-btn', skipText: true, primary: [{ css: '#pause-btn' }] });
  // elección de refuerzo (cartas de refuerzos que transforman habilidades)
  await js(page, () => { openBuffChoice(); });
  await snap(page, 'buff_choice', { root: '#buffscreen' });
  await js(page, () => { setState('playing'); });
  await sleep(300);
  await tap(page, '#pause-btn');
  await snap(page, 'pause', { primary: [{ css: '#resume-btn' }] });
  await js(page, () => { showGameOverScreen(); });
  await snap(page, 'gameover', { primary: [{ css: '#retry-btn' }] });
  await js(page, () => { setState('playing'); showVictoryScreen(); });
  await snap(page, 'victory', { primary: [{ css: '#victory-next-btn' }] });
  for (let i = 0; i < 6; i++) {
    const more = await page.evaluate(() => typeof victoryStep !== 'undefined' && victoryStep < VICTORY_STEPS.length - 1);
    if (!more) break;
    await tap(page, '#victory-next-btn');
    await snap(page, 'victory_step' + (i + 2), { primary: [{ css: '#victory-screen .btn.wide:not(.hidden)' }] });
  }
  // Campamento de los Portadores (después de una victoria de campaña) y la Crónica
  await js(page, () => { campOpen({ arena: 'ciudad', classKey: CHAMPION_CATALOG[0].id, lost: 0, worn: null, crystals: 0, post: false, online: false }, null); });
  await snap(page, 'camp', { root: '#camp', primary: [{ css: '#camp .camp-go' }] });
  await js(page, () => campClose(true));
  await ctx.close();
  return errors;
}

(async () => {
  const srv = await ensureServer();
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const report = {}, errs = {};
  try {
    for (const vp of VIEWPORTS) { console.log(`== ${vp.name} ${vp.width}x${vp.height}`); errs[vp.name] = await runViewport(browser, vp, report); }
  } finally { await browser.close(); if (srv) srv.kill(); }
  const perVp = {};
  let total = 0, raw = 0, fontsT = 0;
  for (const [v, screens] of Object.entries(report)) {
    const c = { small: 0, overflow: 0, tinyText: 0, primaryHidden: 0, fonts: 0 };
    let rv = 0;
    for (const r of Object.values(screens)) { const u = uniq(r); for (const k in c) { c[k] += u[k]; if (k !== 'fonts') rv += r[k].length; } }
    c.total = c.small + c.overflow + c.tinyText + c.primaryHidden; c.rawElements = rv; total += c.total; raw += rv; fontsT += c.fonts; perVp[v] = c;
  }
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ perViewport: perVp, screens: report, errors: errs }, null, 1));
  // resumen: solo las pantallas con problemas
  const slim = {};
  for (const [v, screens] of Object.entries(report)) for (const [s, r] of Object.entries(screens)) {
    const keep = Object.fromEntries(Object.entries(r).filter(([, a]) => a.length));
    if (Object.keys(keep).length) (slim[v] = slim[v] || {})[s] = keep;
  }
  console.log(JSON.stringify({ perViewport: perVp, issues: slim, pageErrors: errs }, null, 1));
  console.log(`SUMMARY issues=${total} (elementos=${raw}) fonts=${fontsT}`);
})().catch(e => { console.error(e); process.exit(1); });
