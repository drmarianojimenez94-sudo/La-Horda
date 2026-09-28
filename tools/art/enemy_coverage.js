// LA HORDA — COBERTURA DEL ARTE DE ENEMIGOS, JEFES, SUBJEFES E INVOCACIONES.
// Para cada tipo de ENEMY_BASE arma la entidad con el código del juego (spawnEnemy + drawEnemyBody),
// la pone en cada estado (quieto, caminar derecha/izquierda/abajo/arriba, ataque, golpeado, muerte)
// y registra QUÉ dibuja: arte real (imagen de assets/), espejo (mismo cuadro que la otra dirección,
// dado vuelta), clon (reusa el cuadro de otro estado), procedural (sprite armado por código) o vacío.
// También mide cosas de unidad visual: alto en pantalla respecto del radio, contorno oscuro, dibujos
// escalados con suavizado (borrosos) y cuántos cuadros distintos tiene la caminata.
//
// Salida (en <outdir>): coverage.json (todo), coverage.tsv (tabla entidad x estado), contact_*.png
// (hoja de contacto: una fila por entidad, una columna por estado, con la fuente abajo de cada celda).
//
// Uso:
//   python3 -m http.server 8791 --bind 127.0.0.1   (desde la raíz del repo)
//   node tools/art/enemy_coverage.js <outdir> [tipo,tipo,...]
// Variables: ENEMY_COV_BASE_URL (por defecto http://127.0.0.1:8791), PLAYWRIGHT_MODULE.
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const fs = require('fs'), path = require('path');
const BASE = process.env.ENEMY_COV_BASE_URL || 'http://127.0.0.1:8791';
const outdir = process.argv[2] || '/tmp/enemy_coverage'; fs.mkdirSync(outdir, { recursive: true });
const only = (process.argv[3] || '').split(',').filter(Boolean);
const sleep = ms => new Promise(r => setTimeout(r, ms));

// cuerpos que la arena dibuja en otro lado a propósito (no son faltantes): se marcan así en la tabla
const HIDDEN = { madre_espora: 'escenario(arena)', 'nucleo_micelial:death': 'propio(arena)', 'raiz_absorcion:death': 'propio(arena)', 'micelio:death': 'propio(arena)' };
// atlas reales recoloreados en un lienzo al cargar (mismo arte, otra paleta)
const TINTED = { angel_corrompido: 1 };
// arena de dibujo por tipo cuando el Códice no la sabe (invocaciones de jefes, focos, etc.)
const ARENA_FALLBACK = { cm_: 'ciudad', mn_: 'minas', ab_: 'abismo', lev_: 'acuatica', foco_hielo: 'hielo', foco_convergencia: 'infernal' };

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_CERT|fonts\.g|net::/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.goto(`${BASE}/index.html?dev=1`, { waitUntil: 'load', timeout: 180000 }); // con la máquina cargada, 30 s no alcanzan
  for (let i = 0; i < 300; i++) { if (await page.evaluate(() => { const b = document.getElementById('title-continue-btn'); return b && !b.disabled; })) break; await sleep(100); }
  await sleep(800);
  // todas las imágenes de arenas tienen que estar decodificadas antes de medir
  for (let i = 0; i < 200; i++) { if (await page.evaluate(() => [...document.images].length >= 0 && Object.values(ENEMY_ATLAS_PACK).every(P => P.ready))) break; await sleep(150); }

  const types = await page.evaluate((fb) => {
    const out = [];
    for (const t in ENEMY_BASE) {
      let a = (typeof codexArenaOfType === 'function' && codexArenaOfType(t)) || null;
      if (!a) for (const k in fb) if (t.startsWith(k)) { a = fb[k]; break; }
      if (a === 'divina' || !a) a = 'bosque';
      out.push({ t, arena: a, rank: ENEMY_BASE[t].rank, name: ENEMY_BASE[t].name, alias: ENEMY_BASE[t].visualAlias || null });
    }
    return out;
  }, ARENA_FALLBACK);
  const want = types.filter(x => !only.length || only.includes(x.t));
  const byArena = {};
  for (const x of want) (byArena[x.arena] = byArena[x.arena] || []).push(x);

  const results = [];
  for (const arena of Object.keys(byArena)) {
    // arranca una partida en esa arena (algunos cuerpos usan el estado propio de la arena)
    await page.evaluate((a) => { try { selectedClass = 'guerrero'; currentArena = a; lobbyAllies = []; startRun(1); } catch (e) { console.warn('startRun', a, e.message); } }, arena);
    await sleep(1200);
    await page.evaluate(() => { for (const h of heroes) h.invulnTimer = 1e9; });
    for (const x of byArena[arena]) {
      const r = await page.evaluate(probeType, x);
      results.push(Object.assign({}, x, r));
      process.stdout.write('.');
    }
  }
  process.stdout.write('\n');

  // ---- clasificación de fuente por estado (en Node, con las firmas medidas) ----
  const STATES = ['idle', 'walk_R', 'walk_L', 'walk_D', 'walk_U', 'attack', 'attack_D', 'attack_U', 'hit', 'hit_D', 'death'];
  for (const r of results) {
    r.src = {};
    const S = r.states || {};
    const walkSigs = new Set(r.walkSigs || []), walkAll = new Set(r.walkAll || []);
    const sigOf = s => S[s] && S[s].sig;
    for (const st of STATES) {
      const s = S[st];
      if (!s) { r.src[st] = 'error'; continue; }
      if (s.err) { r.src[st] = 'error:' + s.err; continue; }
      if (!s.px) { r.src[st] = HIDDEN[r.t + ':' + st] || HIDDEN[r.t] || 'vacío'; continue; }
      const kind = s.kind; // real | proc | canvas | shapes
      let label = kind === 'real' ? 'real' : (kind === 'proc' ? 'procedural' : (kind === 'canvas' ? (TINTED[r.t] ? 'real(tinte)' : 'canvas') : 'formas'));
      if (kind === 'proc' && s.procKey && r.alias && s.procKey === 'enemy_' + r.alias) label = 'procedural(prestado)';
      if (st === 'walk_L') {
        if (s.sig === sigOf('walk_R') && s.flip !== S.walk_R.flip) label += '+espejo';
        else if (s.sig === sigOf('walk_R')) label += '+sin-giro';
      } else if (st === 'walk_D' || st === 'walk_U') {
        if (walkSigs.has(s.sig)) label += '+clon(perfil)';
      } else if (st === 'attack_D' || st === 'attack_U' || st === 'hit_D') {
        const side = st === 'hit_D' ? 'hit' : 'attack';
        if (s.sig === sigOf(side)) label += '+clon(perfil)';
        else if (walkAll.has(s.sig)) label += '+clon(caminar)';
      } else if (st === 'attack' || st === 'hit' || st === 'idle') {
        if (walkAll.has(s.sig)) label += '+clon(caminar)';
        else if (st === 'hit' && s.sig === sigOf('idle')) label += '+clon(quieto)';
      } else if (st === 'death') {
        if (walkAll.has(s.sig)) label += '+clon(caminar)';
        else if (s.sig === sigOf('hit')) label += '+clon(golpe)';
        else if (s.sig === sigOf('idle')) label += '+clon(quieto)';
      }
      r.src[st] = label;
    }
  }
  fs.writeFileSync(path.join(outdir, 'coverage.json'), JSON.stringify({ base: BASE, errors, results }, null, 1));
  const head = ['tipo', 'arena', 'rango', 'cuadros_caminar', 'alto/radio', 'contorno%', 'suavizado'].concat(STATES);
  const rows = results.map(r => [r.t, r.arena, r.rank, r.walkFrames, r.hRatio, r.outline, r.smooth ? 'SI' : ''].concat(STATES.map(s => r.src[s])));
  fs.writeFileSync(path.join(outdir, 'coverage.tsv'), [head].concat(rows).map(a => a.join('\t')).join('\n') + '\n');

  // ---- hojas de contacto ----
  const PER = 18;
  for (let p = 0; p * PER < results.length; p++) {
    const chunk = results.slice(p * PER, (p + 1) * PER).map(r => ({ t: r.t, arena: r.arena, rank: r.rank, src: r.src, walkFrames: r.walkFrames }));
    const dims = await page.evaluate(drawSheet, { chunk, STATES, id: 'sheet' + p });
    await page.setViewportSize({ width: Math.max(800, dims[0]), height: Math.max(600, dims[1]) });
    // captura por recorte de la página (la del elemento esperaba a que "quedara quieto" y con la máquina cargada vencía a los 30 s)
    await page.screenshot({ path: path.join(outdir, `contact_${String(p + 1).padStart(2, '0')}.png`), clip: { x: 0, y: 0, width: dims[0], height: dims[1] }, timeout: 120000 });
    await page.evaluate((id) => document.getElementById(id).remove(), 'sheet' + p);
  }
  const bad = results.filter(r => STATES.some(s => /vacío|error/.test(r.src[s])));
  console.log(`tipos: ${results.length} | con estados vacíos/error: ${bad.length} ${bad.map(r => r.t).join(',')}`);
  console.log('errores de página:', errors.slice(0, 6));
  console.log('salida:', outdir);
  await browser.close();
})();

// ============ en la página: mide un tipo ============
function probeType(x) {
  const S = 520; // lienzo de medición (unidades de mundo, escala 1)
  if (!window.__covCv) { window.__covCv = document.createElement('canvas'); window.__covCv.width = S; window.__covCv.height = S; }
  const cv = window.__covCv, g = cv.getContext('2d', { willReadFrequently: true });
  // identificar lienzos procedurales (SPRITES) y de efectos
  if (!window.__covProc) {
    const m = new Map();
    for (const k in SPRITES) { const sp = SPRITES[k]; for (const p in sp) { const v = sp[p]; if (Array.isArray(v)) v.forEach((c, i) => m.set(c, k + '.' + p + i)); else if (v && v.getContext) m.set(v, k + '.' + p); } }
    window.__covProc = m;
  }
  const PROC = window.__covProc;
  let calls = [], shapes = 0;
  if (!g.__covPatched) {
    const dI = g.drawImage, fl = g.fill, fr = g.fillRect;
    g.drawImage = function (img) {
      const a = arguments, t = this.getTransform();
      let id, kind;
      if (img && img._srcImg instanceof HTMLImageElement) img = img._srcImg; // recorte real con contorno horneado (packOutlined)
      if (img instanceof HTMLImageElement) { const s = img.currentSrc || img.src || ''; const i = s.indexOf('assets/'); id = (i >= 0 ? s.slice(i) : s).replace(/\.webp$/, '.png'); kind = 'real'; }
      else if (PROC.has(img)) { id = 'proc:' + PROC.get(img); kind = 'proc'; }
      else { id = 'canvas:' + (img.width + 'x' + img.height); kind = 'canvas'; }
      let sx = 0, sy = 0, sw = img.width, sh = img.height, dw, dh;
      if (a.length >= 9) { sx = a[1]; sy = a[2]; sw = a[3]; sh = a[4]; dw = a[7]; dh = a[8]; }
      else if (a.length >= 5) { dw = a[3]; dh = a[4]; } else { dw = img.width; dh = img.height; }
      const sc = Math.hypot(t.a, t.b);
      const fx = this.globalCompositeOperation !== 'source-over';
      g.__cov.calls.push({ id, kind, rect: [Math.round(sx), Math.round(sy), Math.round(sw), Math.round(sh)], area: Math.abs(dw * dh) * sc * sc, flip: t.a < 0, smooth: this.imageSmoothingEnabled, scale: sw ? Math.abs(dw * sc / sw) : 0, fx, alpha: this.globalAlpha });
      return dI.apply(this, a);
    };
    g.fill = function () { g.__cov.shapes++; return fl.apply(this, arguments); };
    g.fillRect = function () { g.__cov.shapes++; return fr.apply(this, arguments); };
    g.__covPatched = true;
  }
  const B = ENEMY_BASE[x.t];
  let e;
  try { e = spawnEnemy(x.t, false, false); } catch (err) { return { err: 'spawn: ' + err.message }; }
  enemies = enemies.filter(o => o !== e);
  if (typeof activeChampion !== 'undefined' && activeChampion === e) activeChampion = null;
  const reset = () => {
    e.alive = true; e.fx = 1; e.fy = 0; e.animT = 0; e.attackAnim = 0; e._pkAtkLast = 0; e._pkAtkMax = 0; e.hitFlash = 0;
    e.stunTimer = 0; e.frozenTimer = 0; e.packSet = null; e.packTimer = 0; e._rdir = 0; e._pdir = 0; e._rfaceL = false;
    e.dashing = false; e.charging = false; e.charging2 = false; e.biteTelegraph = 0; e.skillAnim = null; e.fxAnim = null;
    delete e._dyingP; delete e._diedAt; e._an = null; e.hover = 0;
    // entradas en escena (saliendo del suelo/del borde): se miden ya paradas
    e.abEmerge = 0; e.mnEmerge = 0; e.micBuild = false; e.cmRoof = false; e.abRise = 0; e.mnHide = false;
  };
  const draw = (setup) => {
    reset(); setup(e);
    g.__cov = { calls: [], shapes: 0 };
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, S, S);
    const saved = ctx; ctx = g;
    const k = Math.min(1, (S * 0.55) / ((e.radius || 20) * 4.5));
    g.imageSmoothingEnabled = false; g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    let err = null;
    try { g.save(); g.translate(S / 2, S * 0.78); g.scale(k, k); e.x = 0; e.y = 0; animNow = 100000; drawEnemyBody(e); g.restore(); }
    catch (ex) { err = ex.message; try { g.restore(); } catch (_) {} }
    ctx = saved;
    const cl = g.__cov.calls;
    // cuadro principal: la imagen más grande que no sea brillo/aditiva ni sombra de efecto
    let main = null;
    for (const c of cl) if (!c.fx && !/^canvas:(64x64|128x128)$/.test(c.id) && (!main || c.area > main.area)) main = c;
    // cuerpos dibujados solo en modo aditivo (espectros): el más grande de esos
    if (!main) for (const c of cl) if (!/^canvas:(64x64|128x128)$/.test(c.id) && (!main || c.area > main.area)) main = c;
    // píxeles: cantidad, caja y contorno oscuro
    const d = g.getImageData(0, 0, S, S).data;
    let px = 0, x0 = S, y0 = S, x1 = -1, y1 = -1, edge = 0, dark = 0;
    const A = (i) => d[i * 4 + 3];
    for (let yy = 1; yy < S - 1; yy++) for (let xx = 1; xx < S - 1; xx++) {
      const i = yy * S + xx; if (A(i) < 40) continue;
      px++; if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (yy < y0) y0 = yy; if (yy > y1) y1 = yy;
      if (A(i - 1) < 40 || A(i + 1) < 40 || A(i - S) < 40 || A(i + S) < 40) {
        edge++; const L = 0.3 * d[i * 4] + 0.59 * d[i * 4 + 1] + 0.11 * d[i * 4 + 2]; if (L < 55) dark++;
      }
    }
    return { err, px, bbox: px ? [(x1 - x0 + 1) / k, (y1 - y0 + 1) / k] : [0, 0], edgeDark: edge ? dark / edge : 0,
      sig: main ? main.id + '@' + main.rect.join(',') : (px ? 'formas' : ''), kind: main ? main.kind : (px ? 'shapes' : ''),
      procKey: main && main.kind === 'proc' ? main.id.slice(5).split('.')[0] : null, flip: main ? main.flip : false,
      smooth: cl.some(c => !c.fx && c.smooth && Math.abs(c.scale - Math.round(c.scale)) > 0.05), scale: main ? +main.scale.toFixed(2) : 0,
      shapes: g.__cov.shapes, calls: cl.length, main: main ? main.id : null };
  };
  const st = {};
  st.idle = draw(e => { e.stunTimer = 1; });
  st.walk_R = draw(e => { e.animT = 200; });
  st.walk_L = draw(e => { e.animT = 200; e.fx = -1; });
  st.walk_D = draw(e => { e.animT = 200; e.fx = 0; e.fy = 1; });
  st.walk_U = draw(e => { e.animT = 200; e.fx = 0; e.fy = -1; });
  st.attack = draw(e => { e.attackAnim = 200; e._pkAtkMax = 400; e._pkAtkLast = 200; });
  st.attack_D = draw(e => { e.attackAnim = 200; e._pkAtkMax = 400; e._pkAtkLast = 200; e.fx = 0; e.fy = 1; });
  st.attack_U = draw(e => { e.attackAnim = 200; e._pkAtkMax = 400; e._pkAtkLast = 200; e.fx = 0; e.fy = -1; });
  st.hit = draw(e => { e.hitFlash = 110; });
  st.hit_D = draw(e => { e.hitFlash = 110; e.fx = 0; e.fy = 1; });
  st.death = draw(e => { e.alive = false; e._dyingP = 0.9; });
  // ciclo de caminata: cuadros distintos de perfil en 1,5 s
  const sigs = new Set(), all = new Set();
  for (let t = 0; t < 1500; t += 45) { const r = draw(e => { e.animT = t; }); if (r.sig) { sigs.add(r.sig); all.add(r.sig); } }
  // los ciclos de frente y de espalda también cuentan como "caminar" para detectar clones
  for (let t = 0; t < 1500; t += 90) for (const fy of [1, -1]) { const r = draw(e => { e.animT = t; e.fx = 0; e.fy = fy; }); if (r.sig) all.add(r.sig); }
  for (const k in st) delete st[k].calls;
  const w = st.walk_R;
  return {
    states: st, walkSigs: [...sigs], walkAll: [...all], walkFrames: sigs.size,
    hRatio: w.bbox[1] && e.radius ? +(w.bbox[1] / e.radius).toFixed(2) : 0,
    hWorld: Math.round(w.bbox[1]), wWorld: Math.round(w.bbox[0]), radius: e.radius,
    outline: Math.round(w.edgeDark * 100), smooth: Object.values(st).some(s => s.smooth), scale: w.scale,
  };
}

// ============ en la página: hoja de contacto ============
function drawSheet({ chunk, STATES, id }) {
  const CW = 150, CH = 170, LW = 170, TOP = 22;
  const cvs = document.createElement('canvas'); cvs.id = id;
  cvs.width = LW + CW * STATES.length; cvs.height = TOP + CH * chunk.length;
  cvs.style.cssText = 'position:fixed;left:0;top:0;z-index:99999';
  document.body.appendChild(cvs);
  const g = cvs.getContext('2d');
  g.fillStyle = '#2d302b'; g.fillRect(0, 0, cvs.width, cvs.height);
  g.fillStyle = '#fff'; g.font = 'bold 13px monospace';
  STATES.forEach((s, i) => g.fillText(s, LW + i * CW + 6, 15));
  const saved = ctx;
  const SET = {
    idle: e => { e.stunTimer = 1; }, walk_R: e => { e.animT = 200; }, walk_L: e => { e.animT = 200; e.fx = -1; },
    walk_D: e => { e.animT = 200; e.fx = 0; e.fy = 1; }, walk_U: e => { e.animT = 200; e.fx = 0; e.fy = -1; },
    attack: e => { e.attackAnim = 200; e._pkAtkMax = 400; e._pkAtkLast = 200; }, hit: e => { e.hitFlash = 110; },
    attack_D: e => { e.attackAnim = 200; e._pkAtkMax = 400; e._pkAtkLast = 200; e.fx = 0; e.fy = 1; },
    attack_U: e => { e.attackAnim = 200; e._pkAtkMax = 400; e._pkAtkLast = 200; e.fx = 0; e.fy = -1; },
    hit_D: e => { e.hitFlash = 110; e.fx = 0; e.fy = 1; },
    death: e => { e.alive = false; e._dyingP = 0.9; },
  };
  chunk.forEach((r, ri) => {
    const y0 = TOP + ri * CH;
    g.fillStyle = ri % 2 ? '#353831' : '#30332d'; g.fillRect(0, y0, cvs.width, CH);
    g.fillStyle = '#ffe9a8'; g.font = 'bold 12px monospace'; g.fillText(r.t, 6, y0 + 20);
    g.fillStyle = '#ccc'; g.font = '11px monospace'; g.fillText(r.arena + ' · ' + r.rank, 6, y0 + 36); g.fillText('caminar: ' + r.walkFrames + ' cuadro(s)', 6, y0 + 52);
    const sa = currentArena; currentArena = r.arena;
    let e; try { e = spawnEnemy(r.t, false, false); } catch (err) { currentArena = sa; return; }
    enemies = enemies.filter(o => o !== e);
    if (typeof activeChampion !== 'undefined' && activeChampion === e) activeChampion = null;
    STATES.forEach((s, ci) => {
      const cx = LW + ci * CW;
      Object.assign(e, { alive: true, fx: 1, fy: 0, animT: 0, attackAnim: 0, _pkAtkLast: 0, _pkAtkMax: 0, hitFlash: 0, stunTimer: 0, packSet: null, packTimer: 0, _rdir: 0, _pdir: 0, _rfaceL: false, skillAnim: null, hover: 0,
        abEmerge: 0, mnEmerge: 0, micBuild: false, cmRoof: false, abRise: 0, mnHide: false });
      delete e._dyingP; delete e._diedAt;
      SET[s](e);
      const k = Math.min(1.5, (CH - 44) / ((e.radius || 20) * 3.4));
      g.save(); g.beginPath(); g.rect(cx, y0, CW, CH - 26); g.clip();
      g.strokeStyle = 'rgba(255,255,255,0.10)'; g.strokeRect(cx + 0.5, y0 + 0.5, CW - 1, CH - 1);
      g.translate(cx + CW / 2, y0 + CH - 36); g.scale(k, k); g.imageSmoothingEnabled = false;
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(0, 4, (e.radius || 20) * 0.8, (e.radius || 20) * 0.3, 0, 0, Math.PI * 2); g.fill();
      ctx = g; e.x = 0; e.y = 0; animNow = 100000;
      try { drawEnemyBody(e); } catch (err) { g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = 'red'; g.fillText('ERR', cx + 10, y0 + 40); }
      ctx = saved; g.restore();
      const lab = r.src[s] || '';
      g.fillStyle = /vacío|error/.test(lab) ? '#ff6b6b' : (/procedural|formas|canvas/.test(lab) ? '#ffb86b' : (/espejo|clon/.test(lab) ? '#9fd3ff' : '#9fe79f'));
      g.font = '10px monospace';
      const parts = lab.split('+');
      g.fillText(parts[0], cx + 4, y0 + CH - 16); if (parts[1]) g.fillText('+' + parts.slice(1).join('+'), cx + 4, y0 + CH - 4);
    });
    currentArena = sa;
  });
  return [cvs.width, cvs.height];
}
