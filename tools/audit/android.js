// LA HORDA — ANDROID: el juego en Chrome para Android (emulado) solo y en línea contra un iPhone.
// Nació del reporte "lo probamos entre dos y muchos errores de sprites" (un Android, sala online). Mide:
//   solo    Pixel 7 acostado, carga real en dos tandas (?lazy=1): sin errores ni pedidos fallidos, ninguna
//           imagen dibujada sin cargar, joystick y ataque con toques reales, audio que arranca con el toque,
//           pantalla completa pedida en Android (y NUNCA en iPhone), canvas que se recupera si Chrome pierde
//           el contexto, estela de Musashi con su skin.
//   pantalla Galaxy S9+ acostado (658×320): la ficha del Hechicero se puede leer; alturas casi completas en
//           dvh (Chrome para Android: 100vh es el alto SIN la barra de direcciones).
//   online  anfitrión iPhone + invitado Pixel 7 con red de celular (1,5 MB/s) que entra por código y NO
//           marca Listo; el anfitrión comienza igual. El invitado no entra a la partida con el arte de la
//           arena a medio bajar (mientras tanto su guardián lo maneja un bot) y después dibuja lo mismo que
//           el anfitrión: enemigos con su atlas, destello/pose de dolor al recibir un golpe, pose de ataque
//           (no de cast) en los golpes básicos, cuadros de muerte, efectos de skin ya cargados.
// uso:  python3 -m http.server 8771 (raíz del repo) · PORT=8799 node server/relay.js
//       node tools/audit/android.js [solo|pantalla|online|todo] [carpeta_capturas]
//       SITE=http://127.0.0.1:8785 RELAY=ws://127.0.0.1:8913 node tools/audit/android.js
//       (contra lo publicado: SITE=https://….github.io/La-Horda RELAY=wss://….onrender.com)
// Sale con código 1 si falla algo (imprime PASS/FAIL por chequeo y "SUMMARY fails=N").
let pw;
try { pw = require('playwright'); } catch (e) { pw = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright'); }
const fs = require('fs'), path = require('path');
const SITE = (process.env.SITE || process.env.SE_BASE_URL || 'http://127.0.0.1:8771').replace(/\/$/, '');
const RELAY = process.env.RELAY || 'ws://127.0.0.1:8799';
const MODE = process.argv[2] || 'todo';
const OUT = process.argv[3] || '';
if (OUT) fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0;
const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 500) : '')); if (!ok) fails++; };
const PIXEL = pw.devices['Pixel 7 landscape'];
const GALAXY = pw.devices['Galaxy S9+ landscape'];
const IPHONE = { viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1' };
const IGNORE = /fonts\.g|ERR_CERT|net::ERR_ABORTED/;

// ---------------------------------------------------------------- captura de lo que dibuja cada entidad (corre en la página)
function installCapture() {
  if (window.__capInstalled) return; window.__capInstalled = true;
  let cur = null;
  const DI = CanvasRenderingContext2D.prototype.drawImage;
  const nameOf = img => {
    if (img instanceof HTMLImageElement) { const s = img.currentSrc || img.src || ''; return (s.replace(/^.*assets\//, '').replace(/\.(webp|png|jpg)(\?.*)?$/, '') || 'img?') + (img.naturalWidth === 0 ? '#EMPTY' : ''); }
    if (img instanceof HTMLCanvasElement) return 'canvas';
    return '?';
  };
  CanvasRenderingContext2D.prototype.drawImage = function (img, ...a) { if (cur && this === ctx) cur.push(nameOf(img)); return DI.call(this, img, ...a); };
  const wrap = (name, keyFn) => {
    const o = window[name]; if (typeof o !== 'function') return;
    window[name] = function (x, ...rest) {
      const prev = cur, k = window.__capOut ? keyFn(x) : null, arr = [];
      if (k) cur = arr;
      try { return o.call(this, x, ...rest); }
      finally { if (k) { (window.__capOut[k] = window.__capOut[k] || []).push(...arr); if (prev) prev.push(...arr); } cur = prev; }
    };
  };
  const enemyId = e => {
    if (typeof netMatch === 'undefined' || !netMatch) return '?';
    if (netMatch.role === 'host') return netIdOf(e);
    for (const [id, o] of netMatch.ents) if (o === e) return id;
    return '?';
  };
  wrap('drawEnemy', e => 'enemy' + enemyId(e) + ':' + e.type);
  wrap('drawHero', h => { const i = heroes.indexOf(h); return i >= 0 ? 'hero' + i : null; });
  // qué animación elige el atlas de cada guardián (idle/walk/attack/cast/hit…)
  const cps = window.champPackSet;
  if (typeof cps === 'function') window.champPackSet = function (P, st, dir, h) { if (window.__stLog && h && heroes && heroes.indexOf(h) >= 0) window.__stLog.push(heroes.indexOf(h) + ':' + st); return cps.apply(this, arguments); };
  window.__capFrame = function () {
    const out = {}; window.__capOut = out;
    const iv = window.inView; window.inView = () => true;
    const all = []; cur = all;
    try { render(); } finally { window.inView = iv; window.__capOut = null; cur = null; }
    out.__all = all;
    return out;
  };
}

async function newClient(browser, device, opts) {
  opts = opts || {};
  const dev = Object.assign({}, device);
  const ctx = await browser.newContext(dev);
  await ctx.addInitScript(([n]) => { try { if (!localStorage.getItem('__s')) { localStorage.clear(); localStorage.setItem('__s', '1'); localStorage.setItem('horda_name', n); } } catch (e) {} window.__autoConfirm = true; }, [opts.name || 'Jugador']);
  const page = await ctx.newPage();
  const errors = [], failed = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errors.push('console: ' + m.text()); });
  page.on('requestfailed', r => { const f = r.failure(); if (!IGNORE.test(r.url()) && !(f && IGNORE.test(f.errorText))) failed.push(r.url()); });
  page.on('response', r => { if (r.status() >= 400 && !IGNORE.test(r.url())) failed.push(r.status() + ' ' + r.url()); });
  const cdp = await ctx.newCDPSession(page);
  if (opts.netBps) {
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 70, downloadThroughput: opts.netBps, uploadThroughput: 400000 });
  }
  const q = ['dev=1', 'lazy=1'].concat(opts.query || []);
  if (opts.online) q.push('server=' + encodeURIComponent(RELAY));
  await page.goto(`${SITE}/index.html?${q.join('&')}`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => { const b = document.getElementById('title-continue-btn'); return b && !b.disabled; }, null, { timeout: 240000 });
  await page.evaluate(installCapture);
  if (opts.champ) await page.evaluate(([c]) => {
    for (const k in save.champions) save.champions[k].unlocked = true;
    for (const a of CAMPAIGN_ORDER) save.arenasCleared[a] = true;
    save.starterChosen = true; selectedClass = c; save.lastChamp = c; persistNow();
  }, [opts.champ]);
  return { ctx, page, cdp, errors, failed };
}
const tapSel = async (c, sel) => { const b = await c.page.locator(sel).first().boundingBox(); await c.page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); await sleep(350); };
const touch = (c, type, pts) => c.cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
// en línea: entre niveles cada uno elige su refuerzo; se eligen solos y se espera horda en pantalla
const pickBuff = () => { if (state === 'buff') { const b = document.querySelector('#buff-cards .buff-card'); if (b) b.click(); } };
async function ensurePlaying(H, G) {
  for (let i = 0; i < 360; i++) {
    await H.page.evaluate(pickBuff); await G.page.evaluate(pickBuff);
    const ok = await H.page.evaluate(() => state === 'playing' && !levelClearing && enemies.filter(e => e.alive).length >= 6) &&
      await G.page.evaluate(() => state === 'playing');
    if (ok) return true;
    await sleep(250);
  }
  return false;
}

// ================================================================ SOLO (Pixel 7)
async function solo(browser) {
  console.log('== solo: Pixel 7 acostado (Chrome para Android) ==');
  const A = await newClient(browser, PIXEL, { query: ['fs=1'], champ: 'musashi' });
  const p = A.page;
  const vp = await p.evaluate(() => ({ iw: innerWidth, ih: innerHeight, VW, VH, DPR, cw: canvas.width, webp: LAZY_IMG.webp, lazy: LAZY_IMG.deferredOn }));
  check('solo.canvas_mide_la_pantalla', vp.VW === vp.iw && vp.VH === vp.ih && vp.DPR === 2 && vp.cw === vp.VW * 2, vp);
  check('solo.webp_y_carga_en_dos_tandas', vp.webp && vp.lazy, vp);
  const fsInfo = await p.evaluate(() => ({ has: typeof FULLSCREEN !== 'undefined', enabled: typeof FULLSCREEN !== 'undefined' && FULLSCREEN.enabled }));
  check('solo.pantalla_completa_activa_en_android', fsInfo.has && fsInfo.enabled, fsInfo);
  await tapSel(A, '#title-continue-btn');
  await sleep(500);
  const afterTap = await p.evaluate(() => ({ state, fsReq: typeof FULLSCREEN !== 'undefined' ? FULLSCREEN.requests : 0, audio: typeof audioCtx !== 'undefined' && audioCtx ? audioCtx.state : null }));
  check('solo.toque_titulo_pide_pantalla_completa', afterTap.fsReq >= 1, afterTap);
  check('solo.audio_arranca_con_el_toque', afterTap.audio === 'running', afterTap);
  await p.waitForFunction(() => assetsAllReady(), null, { timeout: 240000 });
  await p.evaluate(() => { currentArena = 'fortaleza'; lobbyAllies = pickLobbyAllies(selectedClass); startRun(1); });
  await p.waitForFunction(() => state === 'playing', null, { timeout: 20000 });
  await sleep(600);
  // joystick con el dedo (eventos táctiles reales)
  const jb = await p.locator('#joy-base').boundingBox();
  const cx = jb.x + jb.width / 2, cy = jb.y + jb.height / 2;
  const x0 = await p.evaluate(() => player.x);
  await touch(A, 'touchStart', [{ x: cx, y: cy, id: 1 }]);
  for (let i = 1; i <= 6; i++) { await touch(A, 'touchMove', [{ x: cx + 6 * i, y: cy, id: 1 }]); await sleep(30); }
  await sleep(500);
  const joy = await p.evaluate(() => ({ jx: joyVec.x, jy: joyVec.y, x: player.x }));
  await touch(A, 'touchEnd', []);
  await sleep(150);
  const joyEnd = await p.evaluate(() => joyVec.x);
  check('solo.joystick_tactil_mueve', joy.jx > 0.5 && joy.x > x0 + 5 && joyEnd === 0, { joy, x0, joyEnd });
  const bb = await p.locator('#btn-basic').boundingBox();
  await touch(A, 'touchStart', [{ x: bb.x + bb.width / 2, y: bb.y + bb.height / 2, id: 2 }]);
  await sleep(120);
  const held = await p.evaluate(() => basicHeld);
  await touch(A, 'touchEnd', []);
  await sleep(120);
  check('solo.boton_ataque_tactil', held === true && (await p.evaluate(() => basicHeld)) === false, { held });
  // ninguna imagen dibujada sin cargar
  const empty = new Set();
  for (let i = 0; i < 4; i++) {
    await p.evaluate(([i]) => { joyVec = [{ x: .6, y: 0 }, { x: 0, y: .6 }, { x: -.6, y: 0 }, { x: 0, y: -.6 }][i]; basicHeld = true; }, [i]);
    await sleep(700);
    for (const s of await p.evaluate(() => __capFrame().__all.filter(s => /#EMPTY/.test(s)))) empty.add(s);
  }
  check('solo.ninguna_imagen_vacia_dibujada', empty.size === 0, [...empty].slice(0, 8));
  // estela de Musashi (dash): con la skin de set que lleva puesta
  const trail = await p.evaluate(() => {
    const skin = typeof activeSetSkinId === 'function' ? activeSetSkinId(player) : null;
    musashiAfterimages.push({ x: player.x + 40, y: player.y, fx: 1, fy: 0, classKey: 'musashi', life: 240, maxLife: 240 });
    const f = __capFrame().__all; musashiAfterimages.length = 0;
    return { skin, base: f.filter(s => /champions\/musashi\/v2\/atlas/.test(s)).length, skinDraws: f.filter(s => /champions\/musashi\/skins\//.test(s)).length };
  });
  check('solo.estela_musashi_con_su_skin', !trail.skin || (trail.base === 0 && trail.skinDraws >= 2), trail);
  // Chrome puede perder el contexto 2D (Android, segundo plano) y recuperarlo "en cero"
  const ctxr = await p.evaluate(() => {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = true;
    canvas.dispatchEvent(new Event('contextrestored'));
    const m = ctx.getTransform();
    return { a: m.a, want: canvas.width / VW, smooth: ctx.imageSmoothingEnabled };
  });
  check('solo.contexto_recuperado_se_reaplica', Math.abs(ctxr.a - ctxr.want) < 1e-6 && ctxr.smooth === false, ctxr);
  if (OUT) await p.screenshot({ path: path.join(OUT, 'android_solo.png') });
  check('solo.sin_errores', A.errors.length === 0, A.errors.slice(0, 5));
  check('solo.sin_pedidos_fallidos', A.failed.length === 0, A.failed.slice(0, 5));
  await A.ctx.close();

  // iPhone: la pantalla completa NO se toca (no hay Fullscreen API para páginas; comportamiento de siempre)
  const I = await newClient(browser, IPHONE, { query: ['fs=1'] });
  const ifs = await I.page.evaluate(() => typeof FULLSCREEN !== 'undefined' ? FULLSCREEN.enabled : 'sin FULLSCREEN');
  check('solo.iphone_sin_pantalla_completa', ifs === false, { ifs });
  await I.ctx.close();
}

// ================================================================ PANTALLA (Galaxy S9+ 658×320 y CSS)
async function pantalla(browser) {
  console.log('== pantalla: Galaxy S9+ acostado (658×320) ==');
  const G = await newClient(browser, GALAXY, { champ: 'musashi' });
  const p = G.page;
  await p.evaluate(() => { document.getElementById('title-continue-btn').click(); currentArena = 'fortaleza'; setState('prep'); renderPrepSummary(); });
  await p.waitForFunction(() => assetsAllReady(), null, { timeout: 240000 });
  await p.evaluate(() => runIntroShow(currentArena, () => {}));
  await sleep(900);
  const ri = await p.evaluate(() => {
    const c = document.querySelector('#run-intro .ri-card').getBoundingClientRect(), go = document.querySelector('#run-intro .ri-go').getBoundingClientRect();
    return { card: Math.round(c.width), vw: innerWidth, ratio: +(c.width / innerWidth).toFixed(2), goBottom: Math.round(go.bottom), goTop: Math.round(go.top), vh: innerHeight };
  });
  check('pantalla.ficha_hechicero_legible_320px', ri.ratio >= 0.4, ri);
  check('pantalla.boton_a_la_batalla_visible', ri.goTop >= 0 && ri.goBottom <= ri.vh, ri);
  if (OUT) await p.screenshot({ path: path.join(OUT, 'android_galaxy_run_intro.png') });
  check('pantalla.sin_errores', G.errors.length === 0, G.errors.slice(0, 5));
  await G.ctx.close();
  // alturas casi completas (>= 90vh): cada una con su versión en dvh a continuación
  const bad = [];
  const dir = path.join(__dirname, '..', '..', 'css');
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.css'))) {
    const css = fs.readFileSync(path.join(dir, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    for (const rule of css.split('}')) {
      const decls = rule.slice(rule.indexOf('{') + 1).split(';').map(s => s.trim()).filter(Boolean);
      decls.forEach((d, i) => {
        const m = d.match(/^([a-z-]+)\s*:(.*)$/); if (!m) return;
        if (!/(^|[^\d.])(9\d|100)vh/.test(m[2])) return;
        const next = decls[i + 1] || '';
        if (!(next.startsWith(m[1]) && /dvh/.test(next))) bad.push(f + ': ' + d);
      });
    }
  }
  check('pantalla.alto_completo_en_dvh', bad.length === 0, bad.slice(0, 6));
}

// ================================================================ ONLINE (anfitrión iPhone + invitado Android con red de celular)
async function online(browser) {
  console.log('== online: anfitrión iPhone + invitado Pixel 7 con red de celular ==');
  const H = await newClient(browser, IPHONE, { online: true, name: 'Ana', champ: 'musashi' });
  await H.page.evaluate(() => { document.getElementById('title-continue-btn').click(); setState('prep'); currentArena = 'bosque'; renderPrepSummary(); });
  await H.page.waitForFunction(() => assetsAllReady(), null, { timeout: 240000 });
  await H.page.evaluate(() => document.getElementById('net-create-btn').click());
  await H.page.waitForFunction(() => !!net.code, null, { timeout: 60000 });
  const code = await H.page.evaluate(() => net.code);
  const G = await newClient(browser, PIXEL, { online: true, name: 'Beto', champ: 'cazadora', netBps: 1500000 });
  const gp = G.page;
  await tapSel(G, '#title-continue-btn');
  await tapSel(G, '#mainmenu-jugar-btn');
  await gp.fill('#mode-join-code', code);
  await tapSel(G, '#mode-join-btn');
  await gp.waitForFunction(() => net.role === 'guest' && state === 'prep', null, { timeout: 60000 });
  await sleep(1200);
  const atStart = await gp.evaluate(() => ({ all: assetsAllReady(), pct: assetsRestPct() }));
  // el invitado NO marcó Listo: el anfitrión comienza igual (confirmación aceptada)
  await H.page.evaluate(() => document.getElementById('prep-start-btn').click());
  await H.page.waitForFunction(() => state === 'playing', null, { timeout: 60000 });
  const exercised = !atStart.all;
  console.log('   invitado al comenzar:', JSON.stringify(atStart), exercised ? '' : '(ya tenía todo: no se prueba la espera)');
  let early = null, entered = false, sawOverlay = false, sawBot = false, t0 = Date.now();
  await H.page.evaluate(() => { joyVec = { x: 0.3, y: 0.1 }; basicHeld = true; });
  while (Date.now() - t0 < 240000) {
    const g = await gp.evaluate(() => ({ state, all: assetsAllReady(), pct: assetsRestPct(), overlay: !!(document.getElementById('net-loading') && !document.getElementById('net-loading').classList.contains('hidden')) }));
    if (g.state === 'playing') { entered = true; if (!g.all) early = g; break; }
    if (g.overlay) sawOverlay = true;
    if (!sawBot) sawBot = await H.page.evaluate(() => !!(heroes[1] && !heroes[1].isRemote && heroes[1]._net && heroes[1]._net.loading));
    await H.page.evaluate(() => { if (state === 'buff') { const b = document.querySelector('#buff-cards .buff-card'); if (b) b.click(); } });
    await sleep(250);
  }
  const gState = await gp.evaluate(() => ({ state, all: assetsAllReady(), pct: assetsRestPct() }));
  check('online.invitado_no_entra_con_arte_a_medio_bajar', !early && entered && gState.all, { early, entered, gState, atStart });
  if (exercised) {
    check('online.invitado_ve_preparando_la_arena', sawOverlay, { sawOverlay });
    check('online.mientras_carga_lo_maneja_un_bot', sawBot, { sawBot });
  }
  await sleep(1500);
  const remote = await H.page.evaluate(() => ({ isRemote: !!(heroes[1] && heroes[1].isRemote), loading: !!(heroes[1] && heroes[1]._net && heroes[1]._net.loading) }));
  check('online.al_entrar_vuelve_a_ser_el_jugador', remote.isRemote && !remote.loading, remote);
  if (process.env.DEBUG) console.log('   estado:', JSON.stringify(await H.page.evaluate(() => ({ state, lvl: runLevel, en: enemies.length, buff: !!document.querySelector('#buff-cards .buff-card'), picks: netMatch.buffPicks }))), JSON.stringify(await gp.evaluate(() => ({ state, en: enemies.length }))));
  // (oleadas del Bosque: se espera a tener horda en pantalla para comparar)
  await ensurePlaying(H, G);
  // efectos de skin de la sala ya bajados en el invitado (el primero no se pierde)
  const fx = await gp.evaluate(() => heroes.map(h => h.skinSet).filter(id => id && SKIN_FX_PLAN[id]).map(id => [id, !!SKIN_FX_LOADED[id]]));
  check('online.invitado_precarga_efectos_de_skin', fx.length > 0 && fx.every(x => x[1]), fx);
  // lo que dibuja cada uno: enemigos con su atlas (no el respaldo procedural)
  let common = 0, fallback = 0; const ex = [];
  for (let i = 0; i < 6; i++) {
    if (i === 3) await ensurePlaying(H, G);
    await H.page.evaluate(([i]) => { joyVec = [{ x: .5, y: 0 }, { x: 0, y: .5 }, { x: -.5, y: 0 }][i % 3]; basicHeld = true; if (state === 'buff') { const b = document.querySelector('#buff-cards .buff-card'); if (b) b.click(); } }, [i]);
    await sleep(900);
    const [ch, cg] = await Promise.all([H.page.evaluate(() => state === 'playing' ? __capFrame() : {}), gp.evaluate(() => state === 'playing' ? __capFrame() : {})]);
    for (const k in ch) {
      if (!/^enemy\d/.test(k) || !cg[k]) continue;
      common++;
      const hImg = ch[k].some(s => s !== 'canvas'), gImg = cg[k].some(s => s !== 'canvas');
      if (hImg && !gImg) { fallback++; if (ex.length < 3) ex.push({ k, host: ch[k].slice(0, 3), guest: cg[k].slice(0, 3) }); }
    }
  }
  check('online.invitado_dibuja_enemigos_con_su_atlas', common >= 10 && fallback / common <= 0.05, { common, fallback, ex });
  // golpe: el destello / la pose de dolor (hitFlash 90 ms) llega al invitado. Se mira el valor que trae cada
  // snapshot (dura ~60 ms en el invitado: consultarlo desde afuera cada tanto se lo puede perder)
  await gp.evaluate(() => {
    window.__hf = { id: null, max: 0 };
    const ap = window.netApplySnapshot;
    window.netApplySnapshot = function (s) { const r = ap.apply(this, arguments); const w = window.__hf; if (w.id != null) { const e = netMatch && netMatch.ents.get(w.id); if (e && e.hitFlash > w.max) w.max = e.hitFlash; } return r; };
  });
  let got = 0, tries = 0;
  await ensurePlaying(H, G);
  for (let t = 0; t < 6; t++) {
    if (t === 3) await ensurePlaying(H, G);
    const id = await H.page.evaluate(() => { const e = enemies.find(e => e.alive && e.rank === 'normal' && !(e.hitFlash > 0) && e.hp > e.maxHp * 0.5); if (!e) return null; return netIdOf(e); });
    if (id == null) { await sleep(300); continue; }
    await sleep(200); // el anfitrión ya mandó ese enemigo sin destello
    const ok = await gp.evaluate(([id]) => { const e = netMatch && netMatch.ents.get(id); if (!e || e.hitFlash > 0) return false; window.__hf = { id, max: 0 }; return true; }, [id]);
    if (!ok) continue;
    const set = await H.page.evaluate(([id]) => { const e = enemies.find(e => netIdOf(e) === id); if (!e || !e.alive) return false; e.hitFlash = 90; return true; }, [id]);
    if (!set) continue;
    tries++;
    await sleep(350);
    const w = await gp.evaluate(() => { const w = window.__hf; window.__hf = { id: null, max: 0 }; return w; });
    if (w.max > 0) got++;
    else if (process.env.DEBUG) console.log('   destello perdido', id, JSON.stringify(w));
  }
  check('online.destello_de_golpe_llega_al_invitado', tries >= 4 && got >= Math.ceil(tries * 0.66), { got, tries });
  // pose: tras una habilidad, el golpe básico del anfitrión se ve como ATAQUE (no como cast) en el invitado
  await ensurePlaying(H, G);
  await H.page.evaluate(() => { joyVec = { x: 0, y: 0 }; basicHeld = false; player.cds[0] = 0; player.energy = player.maxEnergy; useSkill(0, null); });
  await sleep(900);
  await gp.evaluate(() => { window.__stLog = []; });
  await H.page.evaluate(() => { player.attackAnim = 240; }); // golpe básico (no toca la marca de cast)
  await sleep(260);
  const st = await gp.evaluate(() => { const l = (window.__stLog || []).filter(s => s.startsWith('0:')); window.__stLog = null; return l; });
  const cast = st.filter(s => s === '0:cast').length, atk = st.filter(s => s === '0:attack').length;
  check('online.golpe_basico_se_ve_como_ataque', atk > 0 && cast === 0, { atk, cast });
  // muertes: el invitado anima la muerte con los cuadros de muerte (el enemigo que muere ya no está "vivo")
  let dying = 0, aliveDying = 0;
  await ensurePlaying(H, G);
  await H.page.evaluate(() => { basicHeld = true; });
  for (let i = 0; i < 20; i++) {
    await H.page.evaluate(() => { const vis = enemies.filter(e => e.alive && e.rank === 'normal' && Math.hypot(e.x - player.x, e.y - player.y) < 500).slice(0, 2); for (const e of vis) e.hp = Math.min(e.hp, 1); });
    await H.page.evaluate(pickBuff); await gp.evaluate(pickBuff);
    await sleep(250);
    const r = await gp.evaluate(() => { let n = 0, a = 0; for (let i = 0; i < vfxDyingN; i++) { const d = vfxDying[i]; if (d.e && d.t < d.dur) { n++; if (d.e.alive) a++; } } return [n, a]; });
    dying += r[0]; aliveDying += r[1];
  }
  check('online.muerte_con_cuadros_de_muerte', dying > 0 && aliveDying === 0, { dying, aliveDying });
  // el estado propio del dibujo (reloj de la página, dirección) no viaja
  const skip = await H.page.evaluate(() => { const d = _netDeltaOf({}, { x: 1, _deadAt: 123456, _pdir: 'side', _aPrev: 5 }, true); return Object.keys(d); });
  check('online.estado_del_dibujo_no_viaja', !skip.includes('_deadAt') && !skip.includes('_pdir') && !skip.includes('_aPrev'), skip);
  if (OUT) await Promise.all([H.page.screenshot({ path: path.join(OUT, 'online_anfitrion_iphone.png') }), gp.screenshot({ path: path.join(OUT, 'online_invitado_android.png') })]);
  check('online.sin_errores', H.errors.length === 0 && G.errors.length === 0, { host: H.errors.slice(0, 3), guest: G.errors.slice(0, 3) });
  check('online.sin_pedidos_fallidos', H.failed.length === 0 && G.failed.length === 0, { host: H.failed.slice(0, 3), guest: G.failed.slice(0, 3) });
  await H.ctx.close(); await G.ctx.close();
}

(async () => {
  const browser = await pw.chromium.launch({ args: ['--no-sandbox', '--autoplay-policy=user-gesture-required'] });
  try {
    if (MODE === 'solo' || MODE === 'todo') await solo(browser);
    if (MODE === 'pantalla' || MODE === 'todo') await pantalla(browser);
    if (MODE === 'online' || MODE === 'todo') await online(browser);
  } catch (e) { console.log('FAIL excepcion  ' + (e && e.stack || e)); fails++; }
  await browser.close();
  console.log('SUMMARY fails=' + fails);
  process.exit(fails ? 1 : 0);
})();
