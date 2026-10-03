// LA HORDA VISUAL GATE — ALINEACIÓN A ESCALA REAL POR ARENA (docs/ART_BIBLE.md §1, §2, §8, §9).
// Las hojas de contacto (boss_visual_test.js, enemy_coverage.js) agrandan o achican cada entidad para que
// entre en su celda: sirven para revisar poses, pero esconden la ESCALA y la DENSIDAD DE PÍXEL reales.
// Esta herramienta dibuja, con el código del juego (drawHeroBody/drawEnemyBody), al Caballero (Master
// Reference) junto a todos los tipos de cada arena, todos con el MISMO zoom de mundo, sin VFX. Debajo de
// cada uno anota la densidad: unidades de mundo por píxel de arte (u/px) y cuántas veces más gruesa es que
// la típica del roster de campeones (mediana, medida en cada corrida). Una densidad muy distinta es "mezcla de densidades de píxel" (ART_BIBLE §1: NO).
//
// Salida (en <outdir>): lineup_<arena>.png y density.json.   Esto mide; no decide estilo.
// Uso:  python3 -m http.server 8792 --bind 127.0.0.1   (raíz del repo)
//       node tools/art/arena_lineup.js <outdir> [arena,arena,...]
//       node tools/art/arena_lineup.js --report   → docs/bible/generated/ENEMY_ART_AUDIT.md + art/lineup_<arena>.webp
//       (el informe versionado; umbrales: ≤ ×2,5 PASS · ×2,5–4 FIX (vigilar) · ≥ ×4 REDRAW por densidad)
// Variables: LINEUP_BASE_URL (por defecto http://127.0.0.1:8792), PLAYWRIGHT_MODULE.
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const fs = require('fs'), path = require('path');
const BASE = process.env.LINEUP_BASE_URL || 'http://127.0.0.1:8792';
const REPORT = process.argv.includes('--report');
const ROOT = path.resolve(__dirname, '../..');
const args = process.argv.slice(2).filter(a => a !== '--report');
const outdir = REPORT ? path.join(ROOT, 'docs/bible/generated/art') : (args[0] || '/tmp/arena_lineup'); fs.mkdirSync(outdir, { recursive: true });
const only = ((REPORT ? '' : args[1]) || '').split(',').filter(Boolean);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const FALLBACK = { cm_: 'ciudad', mn_: 'minas', ab_: 'abismo', lev_: 'acuatica', foco_hielo: 'hielo', foco_convergencia: 'infernal' };
const K = 2; // píxeles de pantalla por unidad de mundo (igual para todos)
const RANK_ORDER = { normal: 0, subelite: 1, elite: 2, subjefe: 3, jefe: 4 };

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${BASE}/index.html?dev=1`, { waitUntil: 'load', timeout: 180000 });
  for (let i = 0; i < 300; i++) { if (await page.evaluate(() => { const b = document.getElementById('title-continue-btn'); return b && !b.disabled; })) break; await sleep(100); }
  await sleep(800);
  for (let i = 0; i < 200; i++) { if (await page.evaluate(() => typeof ENEMY_ATLAS_PACK === 'undefined' || Object.values(ENEMY_ATLAS_PACK).every(P => P.ready))) break; await sleep(150); }
  const byArena = await page.evaluate((fb) => {
    const out = {};
    for (const t in ENEMY_BASE) {
      let a = (typeof codexArenaOfType === 'function' && codexArenaOfType(t)) || null;
      if (!a) for (const k in fb) if (t.startsWith(k)) { a = fb[k]; break; }
      if (!a || a === 'divina') continue;
      (out[a] = out[a] || []).push(t);
    }
    return out;
  }, FALLBACK);
  // REFERENCIA DE DENSIDAD = mediana del roster de campeones (u/px del cuerpo principal de cada uno). El atlas del
  // Caballero/Asesino/Mago viene de una fuente de alta resolución (≈0,3 u/px: cada "píxel de arte" son ~3 píxeles
  // de la imagen), así que compararse contra ese número exageraría todo; lo que el jugador ve al lado de un
  // enemigo es la densidad típica del roster.
  const roster = [];
  for (const k of await page.evaluate(() => Object.keys(typeof CHAMPION_IDENTITY !== 'undefined' ? CHAMPION_IDENTITY : CLASSES))) {
    await page.evaluate(k => { selectedClass = k; currentArena = 'bosque'; lobbyAllies = []; netMatch = null; startRun(1); state = 'paused'; }, k);
    await sleep(400);
    const u = await page.evaluate(() => {
      const g = document.createElement('canvas').getContext('2d'); g.canvas.width = 400; g.canvas.height = 400;
      const proto = Object.getPrototypeOf(g), o = proto.drawImage; const calls = [];
      proto.drawImage = function (img, ...a) { if (img && img.width) { let sh, dh, dw; if (a.length >= 8) { sh = a[3]; dh = a[7]; dw = a[6]; } else if (a.length >= 4) { sh = img.height; dh = a[3]; dw = a[2]; } else { sh = img.height; dh = img.height; dw = img.width; } const t = this.getTransform(); if (sh && this.globalCompositeOperation === 'source-over' && this.globalAlpha >= 0.6) calls.push({area: Math.abs(dw * dh), upx: Math.abs(dh * Math.hypot(t.a, t.b) / sh)}); } return o.call(this, img, ...a); };
      const saved = ctx; ctx = g; g.translate(200, 350);
      const h = heroes[0]; h.x = 0; h.y = 0; h.fx = 1; h.fy = 0; h.moving = false; h.attackAnim = 0;
      const dss = typeof drawSetSkin === 'function' ? drawSetSkin : null; if (dss) window.drawSetSkin = null;
      try { drawHeroBody(h, (h.scale || 1) * (typeof uniqueScaleMult === 'function' ? uniqueScaleMult(h) : 1), false, false); } catch (e) {}
      if (dss) window.drawSetSkin = dss; ctx = saved; proto.drawImage = o;
      let m = null; for (const c of calls) if (!m || c.area > m.area) m = c; return m ? m.upx : 0;
    });
    if (u) roster.push(u);
  }
  roster.sort((a, b) => a - b);
  const REF = roster.length ? roster[Math.floor(roster.length / 2)] : 0.9;
  console.log(`referencia: mediana del roster = ${REF.toFixed(2)} u/px (${roster.length} campeones, ${roster[0].toFixed(2)}–${roster[roster.length - 1].toFixed(2)})`);
  const density = {};
  for (const arena of Object.keys(byArena)) {
    if (only.length && !only.includes(arena)) continue;
    await page.evaluate((a) => { selectedClass = 'tanque'; currentArena = a; lobbyAllies = []; netMatch = null; startRun(1); state = 'paused'; }, arena);
    await sleep(1500);
    const res = await page.evaluate(({ arena, types, K, RANK_ORDER, REPORT_WEBP, REF_UPX }) => {
      // registra cada drawImage para saber la escala (unidades de mundo por píxel de origen) del cuerpo principal
      const g0 = document.createElement('canvas').getContext('2d');
      const proto = Object.getPrototypeOf(g0), oDI = proto.drawImage;
      let calls = null;
      proto.drawImage = function (img, ...a) {
        if (calls && img && img.width) {
          let sw, sh, dw, dh;
          if (a.length >= 8) { sw = a[2]; sh = a[3]; dw = a[6]; dh = a[7]; } else if (a.length >= 4) { sw = img.width; sh = img.height; dw = a[2]; dh = a[3]; } else { sw = img.width; sh = img.height; dw = img.width; dh = img.height; }
          const t = this.getTransform(), sc = Math.hypot(t.a, t.b) / K;
          const add = this.globalCompositeOperation !== 'source-over' || this.globalAlpha < 0.6;
          const src = (img.src || (img.width + 'x' + img.height)).replace(location.origin + '/', '');
          if (sh) calls.push({ area: Math.abs(dw * dh) * sc * sc, upx: Math.abs(dh * sc / sh), add, src, canvas: !img.src });
        }
        return oDI.call(this, img, ...a);
      };
      const list = types.slice().sort((a, b) => (RANK_ORDER[ENEMY_BASE[a].rank] || 0) - (RANK_ORDER[ENEMY_BASE[b].rank] || 0) || (ENEMY_BASE[a].radius || 0) - (ENEMY_BASE[b].radius || 0));
      const cells = [], PAD = 18, BOT = 46;
      const H = 330 * K;
      const cvs = document.createElement('canvas'); const g = cvs.getContext('2d');
      // primera pasada para medir anchos
      const items = [{ hero: true, t: 'tanque (referencia)', w: 60 * K }].concat(list.map(t => ({ t, w: Math.max(70, (ENEMY_BASE[t].radius || 20) * 3.2) * K })));
      cvs.width = Math.min(16000, items.reduce((s, it) => s + it.w + PAD, PAD)); cvs.height = H + BOT + 30;
      g.fillStyle = '#3e433b'; g.fillRect(0, 0, cvs.width, cvs.height);
      g.fillStyle = '#5a5f56'; g.fillRect(0, H - 4, cvs.width, BOT + 4);
      g.fillStyle = '#fff'; g.font = 'bold 15px monospace'; g.fillText(`${arena} — escala real (${K} px por unidad de mundo). Mismo zoom para todos.`, 10, 18);
      // líneas de altura: 66 u (campeón), 132 u, 198 u
      g.strokeStyle = 'rgba(255,255,255,.18)'; g.setLineDash([4, 6]);
      for (const hu of [66, 132, 198, 264]) { const y = H - 6 - hu * K; g.beginPath(); g.moveTo(0, y); g.lineTo(cvs.width, y); g.stroke(); g.fillStyle = 'rgba(255,255,255,.45)'; g.font = '11px monospace'; g.fillText(hu + 'u', 2, y - 2); }
      g.setLineDash([]);
      const saved = ctx; animNow = performance.now();
      let x = PAD; const out = [];
      for (const it of items) {
        const cx = x + it.w / 2, base = H - 6;
        calls = [];
        g.save(); g.translate(cx, base); g.scale(K, K); g.imageSmoothingEnabled = false; ctx = g;
        let err = null;
        try {
          if (it.hero) { const h = heroes[0]; if (typeof drawSetSkin === 'function') { window.__dss = drawSetSkin; window.drawSetSkin = null; } /* arte base, sin skin de set */ h.x = 0; h.y = 0; h.fx = 1; h.fy = 0; h.moving = false; h.attackAnim = 0; drawHeroBody(h, (h.scale || 1) * (typeof uniqueScaleMult === "function" ? uniqueScaleMult(h) : 1), false, false); }
          else {
            const e = spawnEnemy(it.t, false, false); enemies = enemies.filter(o => o !== e);
            if (typeof activeChampion !== 'undefined' && activeChampion === e) activeChampion = null;
            e.x = 0; e.y = 0; e.fx = 1; e.fy = 0; e.moving = false; e.animT = 0; e.attackAnim = 0; e.hitFlash = 0;
            e.abEmerge = 0; e.mnEmerge = 0; e.micBuild = false; e.cmRoof = false; e.abRise = 0; e.mnHide = false;
            drawEnemyBody(e);
          }
        } catch (ex) { err = ex.message; }
        if (window.__dss) { window.drawSetSkin = window.__dss; window.__dss = null; }
        ctx = saved; g.restore();
        let main = null; for (const c of calls) if (!c.add && !/^(64x64|128x128)$/.test(c.src) && (!main || c.area > main.area)) main = c;
        calls = null;
        const upx = main ? +main.upx.toFixed(2) : 0;
        out.push({ t: it.t, rank: it.hero ? 'campeón' : ENEMY_BASE[it.t].rank, upx, src: main ? main.src : null, err });
        g.fillStyle = '#fff'; g.font = '11px monospace'; g.textAlign = 'center';
        g.fillText(String(it.t).slice(0, 18), cx, H + 12);
        g.fillStyle = '#cfd'; g.fillText((it.hero ? 'referencia' : ENEMY_BASE[it.t].rank) + (err ? ' ERR' : ''), cx, H + 26);
        g.fillStyle = '#ffd27a'; g.fillText(upx ? upx + ' u/px' : '—', cx, H + 40);
        g.textAlign = 'left';
        x += it.w + PAD;
      }
      proto.drawImage = oDI;
      const ref = REF_UPX || out[0].upx || 1;
      for (const o of out) o.vsChampion = o.upx ? +(o.upx / ref).toFixed(1) : 0;
      // anota "×N" respecto del campeón
      x = PAD;
      items.forEach((it, i) => { const o = out[i]; g.fillStyle = o.vsChampion >= 4 ? '#ff7070' : o.vsChampion >= 2.5 ? '#ffb347' : '#9f9'; g.font = 'bold 12px monospace'; g.textAlign = 'center'; if (o.vsChampion) g.fillText('×' + o.vsChampion, x + it.w / 2, H + 56); g.textAlign = 'left'; x += it.w + PAD; });
      return { url: cvs.toDataURL(REPORT_WEBP ? 'image/webp' : 'image/png', 0.82), out };
    }, { arena, types: byArena[arena], K, RANK_ORDER, REPORT_WEBP: REPORT, REF_UPX: REF });
    fs.writeFileSync(path.join(outdir, `lineup_${arena}.${REPORT ? 'webp' : 'png'}`), Buffer.from(res.url.split(',')[1], 'base64'));
    density[arena] = res.out;
    console.log(arena.padEnd(10), res.out.map(o => `${o.t}:${o.upx}(×${o.vsChampion})`).join(' '));
  }
  const rep = { generatedBy: 'tools/art/arena_lineup.js', unit: 'unidades de mundo por píxel de arte (u/px); vsChampion = u/px / mediana del roster de campeones', rosterMedianUpx: +REF.toFixed(3), roster: roster.map(v => +v.toFixed(2)), density, errors };
  fs.writeFileSync(path.join(outdir, 'density.json'), JSON.stringify(rep, null, 1) + '\n');
  if (REPORT) {
    const grade = v => !v ? '—' : v >= 4 ? '**REDRAW**' : v >= 2.5 ? 'FIX (vigilar)' : 'PASS';
    const L = ['# Auditoría de arte de enemigos y jefes (AUTO-GENERADO)', '',
      `> \`node tools/art/arena_lineup.js --report\` (servidor en \`LINEUP_BASE_URL\`). Cada tipo dibujado con el código del juego, a escala real y con el mismo zoom, junto al Caballero (Master Reference, docs/ART_BIBLE.md §2). **Densidad** = unidades de mundo por píxel de arte; **×** = cuántas veces más grueso que la densidad típica de los campeones (mediana del roster: ${REF.toFixed(2)} u/px, ${roster.length} campeones; el Caballero se dibuja a la izquierda como referencia de estilo, pero su atlas viene de una fuente de alta resolución y no sirve como vara de densidad). Umbral: ≤ ×2,5 PASS · ×2,5–4 FIX (vigilar; los jefes pueden tener más detalle, no píxeles más gruesos) · ≥ ×4 REDRAW por mezcla de densidades (ART_BIBLE §1). Mide; no decide estilo: el Visual Gate (§8) sigue siendo humano.`, '',
      'Jefes y subjefes: estado de arte completo (cuerpos prestados, poses faltantes, encargos) en `BOSS_BLUEPRINTS` y `BOSS_AUDIT.md`; encargos en `docs/ART_COMMISSION_BRIEF.md`.', ''];
    for (const [arena, xs] of Object.entries(density)) {
      L.push(`## ${arena}`, '', `![alineación ${arena}](art/lineup_${arena}.webp)`, '', '| Tipo | Rango | u/px | × roster | Densidad | Arte principal |', '|---|---|---|---|---|---|');
      for (const o of xs) L.push(`| ${o.t} | ${o.rank} | ${o.upx || '—'} | ${o.vsChampion ? '×' + o.vsChampion : '—'} | ${o.rank === 'campeón' ? 'referencia' : grade(o.vsChampion)} | ${o.src ? '`' + o.src + '`' : 'procedural / compuesto'} |`);
      L.push('');
    }
    fs.writeFileSync(path.join(ROOT, 'docs/bible/generated/ENEMY_ART_AUDIT.md'), L.join('\n'));
  }
  if (errors.length) console.log('errores de página:', errors.slice(0, 5));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
