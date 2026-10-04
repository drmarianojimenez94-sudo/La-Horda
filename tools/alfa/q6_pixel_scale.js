// Q6 — Medición del TAMAÑO DE PÍXEL en pantalla (dirección de arte técnica).
// Reproduce la medición del panel de críticos: intercepta drawImage durante un render() y calcula,
// por cada dibujo, cuántos píxeles de pantalla (del dispositivo) ocupa un píxel del arte:
//     escala = |dw/sw| × sqrt(|det(transformación del contexto)|)      (la transformación ya trae el DPR)
// Agrupa por quién dibuja (guardián / enemigo / jefe / decorado / efectos), envolviendo las funciones
// de dibujo del juego, y por entidad (clase del guardián o tipo del enemigo).
// Además del número "crudo", informa el píxel EFECTIVO = max(1, escala): un arte fino reducido (0,3)
// no puede mostrar píxeles más chicos que el del dispositivo, así que se ve a 1.
//
// Uso (servir el repo primero):  python3 -m http.server 8906 &
//   node tools/alfa/q6_pixel_scale.js --tag antes [--out docs/alfa/q6] [--arenas ciudad,minas] [--shots] [--perf]
//   --shots   guarda una captura .webp chica por escena (<out>/<tag>_<arena>_<escena>.webp)
//   --perf    mide el costo de render() por escena (ms, promedio de 60 cuadros)
//   --ab      A/B intercalado en la misma página: render() con las capas de Q6 prendidas vs apagadas
//   --escenas oleada,jefe  solo esas escenas
//   --q6 k=v  fija window.Q6_ART.<k> antes de medir (p.ej. --q6 light=0 para comparar sin luz)
// Salida: <out>/q6_pixel_scale_<tag>.json + una tabla por consola.
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const fs = require('fs'), path = require('path');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true) : d; };
const BASE = process.env.SE_BASE_URL || 'http://127.0.0.1:8906';
const TAG = opt('tag', 'medicion');
const OUT = opt('out', 'docs/alfa/q6');
const ARENAS = (opt('arenas', '') || '').split(',').filter(Boolean);
const SHOTS = !!opt('shots', false), PERF = !!opt('perf', false), AB = !!opt('ab', false);
const Q6SET = args.map((a, i) => a === '--q6' ? args[i + 1] : null).filter(Boolean);
fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ALL = ['ciudad', 'fortaleza', 'bosque', 'micelial', 'hielo', 'acuatica', 'laberinto', 'abismo', 'minas', 'infernal'];

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const ctxB = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctxB.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => { window.__campaignMode = true; });
  page.setDefaultTimeout(180000);
  await page.goto(`${BASE}/index.html?dev=1${process.env.Q6_QUERY || ''}`, { waitUntil: 'load', timeout: 180000 });
  for (let k = 0; k < 300; k++) { if (await page.evaluate(() => { const b = document.getElementById('title-continue-btn'); return b && !b.disabled; })) break; await sleep(100); }
  await sleep(800);
  await page.evaluate((q6set) => {
    loop = function () {}; // cuadros manuales: medición reproducible
    save.tut = { basics: 1, b_move: 1, b_attack: 1, b_skill: 1 };
    window.Q6_ART = window.Q6_ART || {};
    for (const kv of q6set) { const [k, v] = kv.split('='); window.Q6_ART[k] = isNaN(+v) ? v : +v; }
    window.__go = (arena, lv, team) => {
      for (const k of Object.keys(save.champions)) save.champions[k].unlocked = true;
      const T = team || ['guerrero', 'tanque', 'mago', 'soporte'];
      save.crystalWorn = 'none'; selectedClass = T[0]; currentArena = arena; lobbyAllies = T.slice(1); startRun(lv);
    };
    window.__st = (ms) => { let t = 0; while (t < ms) { if (state === 'buff') { const c = document.querySelector('#buff-cards > *'); if (c) c.click(); continue; } if (typeof RUN_INTRO !== 'undefined' && RUN_INTRO.open) { try { runIntroClose(); } catch (e) { RUN_INTRO.open = false; } } if (state !== 'playing') break; for (const h of heroes) h.hp = Math.max(h.hp, h.maxHp * 0.6); update(16); t += 16; } };
    // jefe de la arena por su camino real (ganchos de arena del nivel 10); si no llega solo, startBossFight
    window.__isBoss = (e) => e.alive && (e.rank === 'jefe' || e.isBoss);
    window.__boss = () => {
      runLevel = LEVEL_COUNT; levelTimer = 0; beginLevel(); for (const e of enemies) e.alive = false; enemies = [];
      for (let t = 0; t < 14000 && !enemies.some(__isBoss); t += 500) __st(500);
      if (!enemies.some(__isBoss) && levelDuration < 1e8) { levelTimer = levelDuration; __st(600); }
      for (let t = 0; t < 8000 && !enemies.some(__isBoss); t += 500) __st(500);
      if (!enemies.some(__isBoss) && !bossActive) { try { startBossFight(); } catch (e) {} }
    };
    // --- instrumentación ---
    const Q = window.__Q6M = { on: false, rec: [], cat: [] };
    const NONPIX = new WeakSet(), LABEL = new WeakMap();
    const wrapRet = (name) => { const f = window[name]; if (typeof f !== 'function') return; window[name] = function () { const r = f.apply(this, arguments); if (r && typeof r === 'object') NONPIX.add(r); return r; }; };
    ['glowSprite', 'fxGlowSprite', 'softGlow', 'radialSprite', 'fxDarkSprite', '_shadowSprite'].forEach(wrapRet);
    const wrapCat = (name, fn) => { const f = window[name]; if (typeof f !== 'function') return; window[name] = function () { Q.cat.push(fn.apply(null, arguments)); try { return f.apply(this, arguments); } finally { Q.cat.pop(); } }; };
    wrapCat('drawHero', h => ({ g: 'guardian', k: h.classKey }));
    wrapCat('drawFallenHero', h => ({ g: 'guardian', k: h.classKey }));
    wrapCat('drawGolemReal', () => ({ g: 'invocacion', k: 'golem_nigro' }));
    wrapCat('drawSkeletonMinion', () => ({ g: 'invocacion', k: 'esqueleto_nigro' }));
    wrapCat('drawEnemy', e => ({ g: (e.rank === 'jefe' || e.rank === 'subjefe' || e.isBoss) ? 'jefe' : 'enemigo', k: e.type }));
    for (const n of ['drawArena', 'aidDrawTall', 'aidAmbDraw', 'drawAcuaAmbience', 'drawCorpses', 'drawGoreDecals']) wrapCat(n, () => ({ g: 'decorado', k: n }));
    for (const n of ['drawShadow', 'drawArenaLight', 'drawScreenFeedback', 'mnDrawDarkness', 'aidGrade']) wrapCat(n, () => ({ g: '_capa', k: n })); // sombras, luz y viñetas: no son pixel art
    for (const n of ['vfxDrawSprites', 'vfxDrawGround', 'vfxDrawParticles', 'drawChainFX', 'drawChampFxTop', 'drawChampFxGround', 'drawProjectileFx', 'vfxDrawDying', 'drawFxContrastTop']) wrapCat(n, () => ({ g: 'efectos', k: n }));
    const lab = (img) => {
      if (!img) return '?';
      if (LABEL.has(img)) return LABEL.get(img);
      if (img.src) return decodeURIComponent(img.src.split('?')[0].split('/').slice(-2).join('/'));
      if (img._srcImg && img._srcImg !== img) return lab(img._srcImg) + ' (derivado)';
      if (img.width !== undefined) return 'canvas ' + img.width + 'x' + img.height;
      return '?';
    };
    const main = document.getElementById('game');
    const orig = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (img) {
      try {
        if (this.canvas !== main) {
          // lienzo fuera de pantalla armado a partir de arte (recoloreos, contornos): hereda la etiqueta
          if (img && !NONPIX.has(img) && img !== this.canvas && !LABEL.has(this.canvas)) { const l = lab(img); if (!l.startsWith('canvas')) LABEL.set(this.canvas, l + ' (derivado)'); }
          if (img && NONPIX.has(img)) NONPIX.add(this.canvas);
        } else if (Q.on && img && !NONPIX.has(img)) {
          const a = arguments; let sw, dw;
          if (a.length >= 9) { sw = a[3]; dw = a[7]; } else if (a.length >= 5) { sw = img.width; dw = a[3]; } else { sw = 1; dw = 1; }
          const m = this.getTransform(); const k = Math.sqrt(Math.abs(m.a * m.d - m.b * m.c));
          const s = Math.abs(dw / (sw || 1)) * k;
          let c = Q.cat[Q.cat.length - 1];
          if (!c) { const st = (new Error().stack || '').split('\n')[2] || ''; const m2 = st.match(/at (\S+)/); c = { g: 'otro', k: m2 ? m2[1] : '' }; }
          if (c.g[0] !== '_' && isFinite(s) && s > 0 && Math.abs(dw * k) >= 6) Q.rec.push({ g: c.g, k: c.k, img: lab(img), s: +s.toFixed(3), px: Math.round(Math.abs(dw) * k) });
        }
      } catch (e) {}
      return orig.apply(this, arguments);
    };
    window.__measure = () => {
      Q.rec = []; Q.on = true; try { render(); } finally { Q.on = false; }
      // una entrada por (grupo, entidad, imagen): la escala más frecuente
      const by = new Map();
      for (const r of Q.rec) { const key = r.g + '|' + r.k + '|' + r.img; if (!by.has(key)) by.set(key, r); }
      return [...by.values()];
    };
    window.__perf = (n) => {
      const t0 = performance.now(); for (let i = 0; i < n; i++) render(); const t1 = performance.now();
      const g = document.getElementById('game').getContext('2d'); g.getImageData(0, 0, 1, 1); const t2 = performance.now();
      return { renderMs: +((t1 - t0) / n).toFixed(2), flushMs: +(t2 - t1).toFixed(1) };
    };
  }, Q6SET);

  const scenes = [];
  for (const arena of (ARENAS.length ? ARENAS : ALL)) {
    scenes.push({ arena, esc: 'oleada', setup: () => page.evaluate((a) => { __go(a, 3); __st(9000); }, arena) });
    // plantel completo de la arena alrededor del jugador (para la tabla por entidad)
    scenes.push({ arena, esc: 'plantel', noShot: true, setup: () => page.evaluate((a) => {
      __go(a, 3); __st(600); for (const e of enemies) e.alive = false; enemies = [];
      const ros = (typeof CODEX_ARENA_ROSTER !== 'undefined' && CODEX_ARENA_ROSTER[a]) || [];
      ros.forEach((t, i) => { let e; try { e = spawnEnemy(t, false, false); } catch (err) { return; } if (!e) return; const an = i / ros.length * Math.PI * 2; e.x = player.x + Math.cos(an) * 200; e.y = player.y + Math.sin(an) * 120; e.stunTimer = 1e6; });
      __st(48);
    }, arena) });
    scenes.push({ arena, esc: 'jefe', setup: () => page.evaluate((a) => {
      __go(a, 3); __st(1500); __boss(); __st(3500);
      const b = enemies.find(__isBoss);
      if (b) { player.x = b.x; player.y = b.y + 110; clampToArena && clampToArena(player); for (const h of heroes) if (h !== player) { h.x = player.x + (Math.random() - 0.5) * 80; h.y = player.y + 30; } __st(32); }
    }, arena) });
  }
  // todos los guardianes (también los de la Ascensión), de a cuatro, en la Ciudad: tabla de héroes completa
  if (!ARENAS.length || opt('guardianes', false)) {
    const ks = await page.evaluate(() => Object.keys(CLASSES).filter(k => save.champions[k]));
    for (let i = 0; i < ks.length; i += 4) {
      const team = ks.slice(i, i + 4); while (team.length < 4) team.push(ks[team.length % ks.length]);
      scenes.push({ arena: 'ciudad', esc: 'guardianes' + (i / 4 + 1), noShot: true, setup: () => page.evaluate((T) => {
        __go('ciudad', 3, T); __st(800); for (const e of enemies) e.alive = false; enemies = [];
        heroes.forEach((h, j) => { h.x = player.x + (j - 1.5) * 70; h.y = player.y; }); __st(64);
      }, team) });
    }
  }
  const ESC = (opt('escenas', '') || '').split(',').filter(Boolean);
  if (ESC.length) for (let i = scenes.length - 1; i >= 0; i--) if (!ESC.some(e => scenes[i].esc.startsWith(e))) scenes.splice(i, 1);
  const result = { tag: TAG, fecha: new Date().toISOString(), viewport: '844x390 dpr2', q6: Q6SET, escenas: [] };
  for (const sc of scenes) {
    try { await sc.setup(); } catch (e) { console.log('setup', sc.arena, sc.esc, e.message.slice(0, 120)); continue; }
    await page.evaluate(() => { try { updateHUD(); } catch (e) {} for (let i = 0; i < 2; i++) render(); });
    const recs = await page.evaluate(() => __measure());
    let perf = PERF ? await page.evaluate(() => { __perf(10); return __perf(60); }) : null;
    if (AB) perf = Object.assign(perf || {}, await page.evaluate(() => {
      // A/B en la MISMA página y el mismo cuadro, intercalado (la carga de la máquina afecta a los dos por igual):
      // capas de Q6 prendidas (luz, sombra, mipmaps, tope) contra apagadas
      if (typeof Q6_ART === 'undefined') return {};
      const keys = ['light', 'shadow', 'mip', 'cap'], set = v => keys.forEach(k => Q6_ART[k] = v);
      const on = [], off = [];
      // el MÍNIMO de 11 tandas de 20 cuadros: la interferencia de otros procesos solo suma tiempo, nunca resta
      for (let r = 0; r < 11; r++) { set(1); on.push(__perf(20).renderMs); set(0); off.push(__perf(20).renderMs); }
      set(1);
      return { abOn: Math.min(...on), abOff: Math.min(...off) };
    }));
    result.escenas.push({ arena: sc.arena, escena: sc.esc, recs, perf });
    if (SHOTS && !sc.noShot) {
      // la captura es para mirar el arte: se ocultan la guía del jefe, el cartel central y el cuadro del Hechicero
      await page.addStyleTag({ content: '#boss-intro,#center-banner,#tut-panel,.story-voice,#arena-title-card{display:none!important}' }).catch(() => {});
      const png = path.join(OUT, `${TAG}_${sc.arena}_${sc.esc}.png`);
      await page.screenshot({ path: png });
      try { require('child_process').execFileSync('python3', ['-c', `from PIL import Image;im=Image.open('${png}').convert('RGB');im=im.resize((im.width//2,im.height//2),Image.LANCZOS);im.save('${png.replace(/\.png$/, '.webp')}','WEBP',quality=72,method=6)`]); fs.unlinkSync(png); } catch (e) { console.log('webp', e.message.slice(0, 80)); }
    }
    process.stdout.write(`${sc.arena}/${sc.esc}: ${recs.length} dibujos${perf ? ' · render ' + perf.renderMs + ' ms' : ''}${perf && perf.abOn !== undefined ? ' · A/B Q6 ' + perf.abOn + ' vs ' + perf.abOff + ' ms' : ''}\n`);
  }
  // --- resumen ---
  const med = a => { const b = [...a].sort((x, y) => x - y); return b.length ? b[Math.floor((b.length - 1) / 2)] : 0; };
  const stat = a => a.length ? { n: a.length, min: Math.min(...a), med: med(a), max: Math.max(...a) } : { n: 0 };
  const groups = {}, ents = {};
  for (const sc of result.escenas) for (const r of sc.recs) {
    (groups[r.g] = groups[r.g] || []).push(r.s);
    if (r.g === 'guardian' || r.g === 'enemigo' || r.g === 'jefe' || r.g === 'invocacion') { const k = r.g + ':' + r.k; (ents[k] = ents[k] || { g: r.g, k: r.k, s: [], img: new Set(), arena: new Set() }).s.push(r.s); ents[k].img.add(r.img); ents[k].arena.add(sc.arena); }
  }
  result.grupos = {}; for (const g of Object.keys(groups)) { const st = stat(groups[g]); st.efMed = med(groups[g].map(v => Math.max(1, v))); result.grupos[g] = st; }
  result.entidades = Object.values(ents).map(o => ({ g: o.g, k: o.k, med: med(o.s), min: Math.min(...o.s), max: Math.max(...o.s), arenas: [...o.arena].join(','), img: [...o.img].slice(0, 3).join(' | ') })).sort((a, b) => b.med - a.med);
  // dispersión en cada pantalla: cuerpos de actores (guardián/enemigo/jefe), píxel efectivo p90/p10
  result.dispersion = result.escenas.map(sc => {
    const v = sc.recs.filter(r => ['guardian', 'enemigo', 'jefe'].includes(r.g)).map(r => Math.max(1, r.s)).sort((a, b) => a - b);
    const all = sc.recs.map(r => r.s);
    return { arena: sc.arena, escena: sc.escena, crudoMin: all.length ? Math.min(...all) : 0, crudoMax: all.length ? Math.max(...all) : 0, actoresEfMax: v.length ? v[v.length - 1] : 0, actoresEfMed: med(v), perf: sc.perf };
  });
  fs.writeFileSync(path.join(OUT, `q6_pixel_scale_${TAG}.json`), JSON.stringify(result, null, 1));
  console.log('\nGRUPO        n    mín   mediana  máx   (efectivo med)');
  for (const [g, s] of Object.entries(result.grupos)) console.log(g.padEnd(12), String(s.n).padStart(4), String(s.min).padStart(6), String(s.med).padStart(7), String(s.max).padStart(6), '  ', s.efMed);
  console.log('\nENTIDADES (mediana de escala, de mayor a menor)');
  for (const e of result.entidades) console.log(`${e.g.padEnd(10)} ${e.k.padEnd(26)} ${String(e.med).padStart(6)}  [${e.min}-${e.max}]  ${e.arenas}  ${e.img}`);
  console.log('\nPANTALLAS (crudo mín-máx · actores efectivo mediana/máx · render ms)');
  for (const d of result.dispersion) console.log(`${(d.arena + '/' + d.escena).padEnd(20)} ${d.crudoMin}-${d.crudoMax}  ·  ${d.actoresEfMed}/${d.actoresEfMax}${d.perf ? '  ·  ' + d.perf.renderMs + ' ms' : ''}`);
  console.log(errors.length ? '\nERRORES ' + JSON.stringify(errors.slice(0, 5)) : '\nsin errores de página');
  await browser.close();
})();
