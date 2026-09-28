// AUDITORÍA DE ATLAS DE GUARDIANES Y SKINS (CHAMP_PACK): dibuja cada guardián base y cada skin de set
// con el código del juego (drawHeroBody / drawFallenHero, igual que en partida) en cada vista
// (frente, perfil derecho, perfil izquierdo, espalda; frente/espalda mirando a cada lado) × estado
// (quieto, caminar, correr, ataque, lanzar, golpe, muerte), arma una hoja de contacto por pack y marca:
//   - izquierda y derecha mirando para el MISMO lado (o una sola vista horizontal)
//   - estados / vistas que no resuelven a ningún cuadro
//   - cuadros que miran para el otro lado dentro de un mismo set
//   - saltos grandes de tamaño dentro de un set
// Aserción (sale con código 1 si falla): todo pack de guardián tiene las dos vistas horizontales
// mirando a lados opuestos en quieto/caminar/ataque/lanzar/golpe y todos sus estados resueltos.
//
// usage: node tools/art/skin_audit.js [carpeta_salida]
//        (sitio servido en SE_BASE_URL, p.ej. `python3 -m http.server 8788 --bind 127.0.0.1`)
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const fs = require('fs'), path = require('path'), os = require('os');
const BASE = process.env.SE_BASE_URL || 'http://127.0.0.1:8771';
const OUT = process.argv[2] || path.join(os.tmpdir(), 'skin_audit');
const ONLY = process.env.PACKS ? process.env.PACKS.split(',') : null;
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${BASE}/index.html`, { waitUntil: 'load' });
  for (let i = 0; i < 300; i++) { const ok = await page.evaluate(() => { const b = document.getElementById('title-continue-btn'); return b && !b.disabled; }); if (ok) break; await sleep(100); }
  // cromas (js/systems/cromas.js): se cargan a pedido; acá, todas, para auditarlas como un guardián más
  await page.evaluate(() => { if (typeof cromaLoadAll === 'function') cromaLoadAll(); });
  // todos los atlas cargados
  for (let i = 0; i < 200; i++) { const n = await page.evaluate(() => Object.values(CHAMP_PACK).filter(P => P.atlas && !P.ready && !P.failed).length); if (!n) break; await sleep(100); }
  await sleep(300);

  const packs = await page.evaluate((ONLY) => {
    selectedClass = 'guerrero'; currentArena = 'bosque'; startRun(1); state = 'paused';
    // pack -> guardián que lo usa (base o skin de set) y si es el cuerpo principal (con todos los estados)
    const list = [];
    const skinOf = {};
    for (const id in SET_SKINS) { const d = SET_SKINS[id]; for (const base in (d.packs || {})) skinOf[d.packs[base]] = { id, champ: d.champ, base }; }
    if (typeof CROMA_SKINS !== 'undefined') for (const id in CROMA_SKINS) { const d = CROMA_SKINS[id]; for (const base in (d.packs || {})) skinOf[d.packs[base]] = { id, champ: d.champ, base }; }
    for (const key in CHAMP_PACK) {
      const P = CHAMP_PACK[key]; if (!P.atlas || P.failed) continue;
      if (ONLY && ONLY.indexOf(key) < 0) continue;
      const sk = skinOf[key];
      const base = sk ? sk.base : key;
      const champ = sk ? sk.champ : (CLASSES[key] ? key : null);
      const dirPack = !!(P.sets.idle_down || P.sets.walk_side || P.sets.walk_down);
      if (!dirPack) { list.push({ key, champ, skin: sk ? sk.id : null, role: 'extra' }); continue; }
      const role = base === champ ? 'guardian' : 'forma'; // forma = El Portador (titán), etc.
      list.push({ key, champ: champ || base.split('_')[0], skin: sk ? sk.id : null, role, base });
    }
    return list;
  }, ONLY);

  const report = [];
  let fail = 0;
  for (const pk of packs) {
    if (pk.role === 'extra') { console.log(`--   ${pk.key.padEnd(20)} sin vistas (sets con nombre propio, se dibuja con su propio código)`); continue; }
    const res = await page.evaluate((pk) => {
      const P = CHAMP_PACK[pk.key];
      const STATES = pk.role === 'guardian' ? ['idle', 'walk', 'run', 'attack', 'cast', 'hit', 'death'] : ['idle', 'walk'];
      const REQ = pk.role === 'guardian' ? ['idle', 'walk', 'attack', 'cast', 'hit'] : ['idle', 'walk'];
      const VIEWS = [['frente·der', 'down', false], ['frente·izq', 'down', true], ['perfil der', 'side', false], ['perfil izq', 'side', true], ['espalda·der', 'up', false], ['espalda·izq', 'up', true]];
      // ---- píxeles del atlas ----
      const img = P.atlas, W = img.naturalWidth, H = img.naturalHeight;
      const c0 = document.createElement('canvas'); c0.width = W; c0.height = H;
      const g0 = c0.getContext('2d', { willReadFrequently: true }); g0.drawImage(img, 0, 0);
      const D = g0.getImageData(0, 0, W, H).data;
      const cache = {};
      function frameInfo(v) {
        if (cache[v]) return cache[v];
        const x0 = (v % P.cols) * P.fw, y0 = Math.floor(v / P.cols) * P.fh;
        let minX = 1e9, maxX = -1, minY = 1e9, maxY = -1;
        for (let y = 0; y < P.fh; y++) for (let x = 0; x < P.fw; x++) if (D[((y0 + y) * W + x0 + x) * 4 + 3] > 100) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
        const N = 20, desc = new Float32Array(N * N * 4);
        if (maxX >= 0) {
          const bw = maxX - minX + 1, bh = maxY - minY + 1, side = Math.max(bw, bh);
          const ox = minX + bw / 2 - side / 2, oy = maxY + 1 - side;
          const cnt = new Float32Array(N * N);
          for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
            const i = ((y0 + y) * W + x0 + x) * 4, a = D[i + 3] / 255;
            const gx = Math.min(N - 1, Math.floor((x - ox) / side * N)), gy = Math.min(N - 1, Math.floor((y - oy) / side * N));
            if (gx < 0 || gy < 0) continue;
            const j = (gy * N + gx) * 4;
            desc[j] += a; desc[j + 1] += a * D[i] / 255; desc[j + 2] += a * D[i + 1] / 255; desc[j + 3] += a * D[i + 2] / 255;
          }
          const px = side / N; for (let j = 0; j < desc.length; j++) desc[j] /= px * px;
          void cnt;
        }
        return (cache[v] = { v, w: maxX - minX + 1, h: maxY - minY + 1, desc, empty: maxX < 0 });
      }
      const N = 20;
      function descOf(v, flip) { // v con su espejo (~v) y flip del dibujo
        let m = !!flip; if (v < 0) { v = ~v; m = !m; }
        const f = frameInfo(v); if (!m) return f.desc;
        const o = new Float32Array(f.desc.length);
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) for (let k = 0; k < 4; k++) o[(y * N + x) * 4 + k] = f.desc[(y * N + (N - 1 - x)) * 4 + k];
        return o;
      }
      function dist(a, b) { let s = 0; for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]); return s / a.length; }
      const fakeH = left => ({ _pleft: left });
      const mkProbe = () => makeHero(pk.champ in CLASSES ? pk.champ : 'guerrero', true, 0, 0);
      // ---- resolución estado × vista ----
      const table = {}, issues = [];
      for (const st of STATES) {
        table[st] = {};
        for (const [lab, dir, left] of VIEWS) {
          if (st === 'death' && dir !== 'down') continue;
          const pick = champPackSet(P, st, dir, fakeH(left));
          table[st][lab] = pick ? { arr: pick.arr.slice(), flip: !!pick.flip } : null;
          if (!pick && REQ.indexOf(st) >= 0) issues.push({ sev: 'FAIL', what: `sin cuadros: ${st} / ${lab}` });
        }
      }
      // ---- izquierda vs derecha ----
      for (const st of REQ) {
        const R = table[st]['perfil der'], L = table[st]['perfil izq'];
        if (!R || !L) continue;
        if (R.flip === L.flip && R.arr.join() === L.arr.join()) continue; // vista única de frente (golpe/quieto del titán): no tiene lado
        // se compara el primer cuadro (quieto) y el cuadro del medio de cada set
        for (const k of [0, Math.floor(R.arr.length / 2)]) {
          const r = R.arr[k], l = L.arr[Math.min(k, L.arr.length - 1)];
          const dSame = dist(descOf(r, R.flip), descOf(l, L.flip)), dMir = dist(descOf(r, R.flip), descOf(l, !L.flip));
          if (dSame < dMir * 0.92) { issues.push({ sev: 'FAIL', what: `${st}: perfil izq mira igual que el der (cuadro ${k}: ${dSame.toFixed(3)} vs espejo ${dMir.toFixed(3)})` }); break; }
        }
      }
      // ---- cuadros con otra orientación dentro del set / saltos de tamaño ----
      const seen = new Set();
      for (const st of STATES) for (const lab in table[st]) {
        const S = table[st][lab]; if (!S) continue;
        const sig = S.arr.join(',') + S.flip; if (seen.has(sig)) continue; seen.add(sig);
        const ref = S.arr[0];
        S.arr.forEach((v, k) => {
          if (k === 0 || v === ref) return;
          const a = dist(descOf(v, S.flip), descOf(ref, S.flip)), b = dist(descOf(v, !S.flip), descOf(ref, S.flip));
          if (st !== 'death' && b < a * 0.8) issues.push({ sev: 'WARN', what: `${st}/${lab}: cuadro ${k} (${v}) parece mirar al otro lado (${a.toFixed(3)} vs espejo ${b.toFixed(3)})` });
        });
        if (st !== 'death') {
          const hs = S.arr.map(v => frameInfo(v < 0 ? ~v : v).h), med = hs.slice().sort((x, y) => x - y)[hs.length >> 1];
          hs.forEach((h, k) => { if (h > med * 1.3 || h < med * 0.72) issues.push({ sev: 'WARN', what: `${st}/${lab}: salto de tamaño cuadro ${k} (${S.arr[k]}) alto ${h} vs mediana ${med}` }); });
        }
      }
      // alto del quieto vs refH (escala)
      const idl = table.idle && table.idle['frente·der'];
      if (idl) { const h0 = frameInfo(idl.arr[0] < 0 ? ~idl.arr[0] : idl.arr[0]).h; if (P.refH && (h0 > P.refH * 1.35 || h0 < P.refH * 0.7)) issues.push({ sev: 'WARN', what: `quieto alto ${h0} vs refH ${P.refH}` }); }
      // estados que el atlas no traía (rellenados por champPackNormalize)
      const raw = P.rawSets || {}, filled = [];
      for (const st of STATES) for (const d of ['down', 'side', 'left', 'up']) if (!raw[st + '_' + d] && P.sets[st + '_' + d]) filled.push(st + '_' + d);
      for (const d of ['down', 'side', 'left', 'up']) if (raw['walk_' + d] && raw['walk_' + d].length < 4 && P.sets['walk_' + d] && P.sets['walk_' + d].length >= 4) filled.push('walk_' + d + '(4)');

      // ---- hoja de contacto: dibujada por el juego ----
      const hh0 = mkProbe(), s0 = champPackScale(P, hh0, hh0.scale || 2);
      const cellH = 150, ZOOM = (cellH - 22) / ((P.refH || P.fh) * s0 * 1.18);
      const cellW = Math.max(70, Math.round(P.fw * s0 * ZOOM * 0.85));
      const maxN = Math.max(...STATES.filter(st => st !== 'death').map(st => Math.max(0, ...Object.values(table[st]).map(s => s ? s.arr.length : 0))));
      const colW = cellW * Math.min(maxN, 4) + 8, LW = 70, TH = 36;
      const cvs = document.createElement('canvas');
      cvs.width = LW + colW * VIEWS.length; cvs.height = TH + STATES.length * (cellH + 6) + 16 + issues.length * 13;
      const g = cvs.getContext('2d');
      g.fillStyle = '#3d423a'; g.fillRect(0, 0, cvs.width, cvs.height);
      g.fillStyle = '#fff'; g.font = 'bold 13px monospace';
      g.fillText(`${pk.key}  (${pk.champ}${pk.skin ? ' · skin ' + pk.skin : ''})  ${JSON.stringify(P.fix || {})}`.slice(0, 180), 6, 14);
      g.font = '12px monospace';
      VIEWS.forEach((v, i) => g.fillText(v[0], LW + i * colW + 4, TH - 6));
      const saved = ctx, savedNow = animNow;
      const mk = () => {
        const h = makeHero(pk.champ in CLASSES ? pk.champ : 'guerrero', true, 0, 0);
        if (pk.skin) h._codexSkin = pk.skin; else h._codexSkin = null;
        if (pk.role !== 'guardian') h._codexPack = pk.base;
        return h;
      };
      STATES.forEach((st, ri) => {
        const y0 = TH + ri * (cellH + 6);
        g.fillStyle = '#fff'; g.fillText(st, 6, y0 + cellH / 2);
        VIEWS.forEach(([lab, dir, left], ci) => {
          const S = table[st][lab]; if (!S) return;
          if (st === 'death' && ci > 0) return; // la muerte es una sola secuencia: ocupa toda la fila
          const n = Math.min(S.arr.length, st === 'death' ? 8 : 4);
          for (let k = 0; k < n; k++) {
            const cx = LW + ci * colW + k * cellW + cellW / 2, cy = y0 + cellH - 8;
            g.fillStyle = (k % 2) ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)';
            g.fillRect(LW + ci * colW + k * cellW, y0, cellW, cellH);
            g.strokeStyle = 'rgba(255,220,80,0.5)'; g.beginPath(); g.moveTo(cx, y0 + 4); g.lineTo(cx, cy + 4); g.stroke(); // eje del guardián
            const h = mk();
            h.x = 0; h.y = 0; h.alive = true; h.moving = false; h.attackAnim = 0; h.hurtTimer = 0; h.animT = 0;
            h.fx = dir === 'side' ? (left ? -1 : 1) : (left ? -0.2 : 0.2); h.fy = dir === 'down' ? 1 : dir === 'up' ? -1 : 0;
            h._pdir = dir; h._pleft = left;
            if (pk.role !== 'guardian') { h._codexSet = null; }
            animNow = 100000;
            const pr = (k + 0.5) / S.arr.length;
            if (st === 'walk') { h.moving = true; h.animT = k * 130 + 1; }
            else if (st === 'idle') animNow = 230 * S.arr.length * 400 + k * 230 + 1;
            else if (st === 'attack' || st === 'cast') { const a = 1000 * (1 - pr); h._aDur = 1000; h._aPrev = a; h.attackAnim = a; h._packCastUntil = st === 'cast' ? Infinity : 0; }
            else if (st === 'hit') h.hurtTimer = 160 * (1 - pr);
            g.save(); g.translate(cx, cy); g.scale(ZOOM, ZOOM); g.imageSmoothingEnabled = false; ctx = g;
            try {
              const P2 = CHAMP_PACK[pk.key];
              if (st === 'death') { h._deadAt = animNow - k * 170 - 1; const pick = champPackSet(P2, 'death', 'down', h); champPackDrawFrame(P2, pick.arr[k], 0, 0, champPackScale(P2, h, h.scale || 2), pick.flip, 1); }
              else if (st === 'run' || pk.role !== 'guardian') { champPackDrawFrame(P2, S.arr[k], 0, 0, champPackScale(P2, h, h.scale || 2), S.flip, 1); }
              else if (st === 'walk' || st === 'idle' || (pk.champ !== 'eren' && pk.champ !== 'libertador')) drawHeroBody(h, h.scale, false, false); // en partida

              else champPackDrawFrame(P2, S.arr[k], 0, 0, champPackScale(P2, h, h.scale || 2), S.flip, 1);
            } catch (e) { g.fillStyle = 'red'; g.fillText('ERR ' + e.message.slice(0, 40), -40, -20); }
            ctx = saved; g.restore();
            g.fillStyle = '#ffe66b'; g.font = '10px monospace';
            const v = S.arr[k]; const eff = (v < 0) !== S.flip;
            g.fillText((v < 0 ? ~v : v) + (eff ? '↔' : ''), LW + ci * colW + k * cellW + 2, y0 + 10);
            g.font = '12px monospace';
          }
        });
      });
      animNow = savedNow;
      let y = TH + STATES.length * (cellH + 6) + 10;
      for (const is of issues) { g.fillStyle = is.sev === 'FAIL' ? '#ff6b6b' : '#ffd36b'; g.fillText(is.sev + ' ' + is.what, 6, y); y += 13; }
      return { issues, filled, png: cvs.toDataURL('image/png'), sets: Object.fromEntries(Object.entries(P.sets).filter(([k]) => /_(down|side|left|up)$|^run$/.test(k))) };
    }, pk);
    const file = path.join(OUT, `${pk.key}.png`);
    if (res.png) fs.writeFileSync(file, Buffer.from(res.png.split(',')[1], 'base64'));
    const nf = res.issues.filter(i => i.sev === 'FAIL').length; fail += nf;
    report.push({ key: pk.key, champ: pk.champ, skin: pk.skin, role: pk.role, sheet: file, issues: res.issues, filled: res.filled });
    console.log(`${nf ? 'FAIL' : 'ok  '} ${pk.key.padEnd(20)} ${pk.role.padEnd(8)} ${res.issues.length ? res.issues.map(i => i.sev + ': ' + i.what).join('\n' + ' '.repeat(35)) : ''}`);
    if (res.filled.length) console.log(' '.repeat(35) + 'rellenado: ' + res.filled.join(' '));
  }
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));
  console.log(`\nhojas: ${OUT}  ·  packs: ${report.length}  ·  fallas: ${fail}  ·  errores de página: ${errors.length ? errors.slice(0, 3).join(' | ') : 0}`);
  await browser.close();
  process.exit(fail || errors.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
