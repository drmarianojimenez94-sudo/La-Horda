'use strict';
/* ARENA VALIDATOR + AUTOMATED EXPLORATION (Game Bible: docs/bible/ARENA_BIBLE.md, QA.md).
   Carga el juego real y, por cada arena del orden de campaña:
     1. FICHA: validateArenaBlueprint (identidad, decisión propia, hazard con telegraph, objetivos
        explicados, jefe con relación a la arena, micro-tutorial, sets).
     2. GEOMETRÍA: grilla de 24 u con la colisión REAL del motor (clampToArena + resolveWallCollision).
        Flood fill desde el inicio: componentes caminables inalcanzables (bolsillos) = FAIL (WARNING si
        la arena declara geometría con compuertas: sectores que se abren al avanzar).
     3. SI SE VE SÓLIDO, ES SÓLIDO: cada sólido visual declarado (geometry.solids) se sondea en su
        interior; si un punto interior es caminable = FAIL "obstáculo visual sin colisión".
     4. SPAWNS: 120 apariciones reales por la ruta del motor (spawnEnemy + placeSpawn) tras un cuadro:
        dentro de un sólido o fuera de lo caminable / inalcanzable = FAIL.
     5. EXPLORACIÓN AGRESIVA: bots que intentan romper la arena manejando al jugador con el joystick real
        (aleatorio, abrazar paredes, escapar del mapa) + enemigos persiguiendo: NaN, fuera de los límites,
        dentro de colisión o atrapado (ninguna de 8 direcciones lo saca) = FAIL.
   Salida: docs/bible/generated/arena-audit.json + ARENA_AUDIT.md + láminas de depuración (.webp).
   Uso: node tools/bible/arena-validator.js [--strict]   ARENAS=micelial,hielo para filtrar. */
const fs = require('node:fs'), path = require('node:path'), {spawn} = require('node:child_process');
let chromium; try { ({chromium} = require('playwright')); } catch (e) { ({chromium} = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const ROOT = path.resolve(__dirname, '../..'), PORT = +(process.env.BIBLE_PORT || 8832);
const OUT = path.join(ROOT, 'docs/bible/generated');
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], {cwd: ROOT, stdio: 'ignore'});
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  await sleep(600);
  const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || chromium.executablePath(), args: ['--no-sandbox']});
  try {
    const page = await browser.newPage({viewport: {width: 844, height: 390}}), pageErrors = [];
    page.on('pageerror', e => pageErrors.push(e.message));
    await page.goto(`http://127.0.0.1:${PORT}/`, {waitUntil: 'domcontentloaded', timeout: 120000});
    await page.waitForFunction(() => typeof startRun === 'function' && typeof ARENA_BLUEPRINTS !== 'undefined', null, {timeout: 120000});
    await page.waitForTimeout(1500);
    const keys = (await page.evaluate(() => ARENA_ORDER.slice())).filter(k => !process.env.ARENAS || process.env.ARENAS.split(',').includes(k));
    const results = [];
    fs.mkdirSync(path.join(OUT, 'arenas'), {recursive: true});
    for (const key of keys) {
      const t0 = Date.now();
      const r = await page.evaluate(async key => {
        const checks = [], add = (area, name, level, detail) => checks.push({area, name, level, detail: detail || ''});
        for (const i of validateArenaBlueprint(key)) add('blueprint', i.msg, i.level);
        if (!validateArenaBlueprint(key).length) add('blueprint', 'ficha completa', 'PASS');
        const B = ARENA_BLUEPRINTS[key];
        // ---------- partida real ----------
        let seedX = 99; const oRand = Math.random;
        Math.random = () => { seedX ^= seedX << 13; seedX >>>= 0; seedX ^= seedX >> 17; seedX ^= seedX << 5; seedX >>>= 0; return seedX / 4294967296; };
        for (const ck in save.champions) { const s = save.champions[ck]; s.unlocked = true; s.level = 20; }
        selectedClass = 'tanque'; currentArena = key; lobbyAllies = ['soporte', 'mago', 'guerrero']; netMatch = null;
        startRun(3); setState('playing');
        enemies = []; spawnTimer = 1e9; arenaHazardTimer = 1e9;
        for (const h of heroes) { h.hp = h.maxHp = 1e7; }
        const start = {x: player.x, y: player.y};
        const walk = (x, y, r, tol) => { const e = {x, y, radius: r || 18}; clampToArena(e); resolveWallCollision(e); return Math.hypot(e.x - x, e.y - y) < (tol || 0.75); };
        // en la exploración se tolera <= 4 u (márgenes de borde y empujes entre héroes); más es meterse en un sólido
        const PEN = 4;
        // ---------- grilla ----------
        const def = arenaDef(), nb = def && def.navBounds;
        const bx0 = nb ? nb.x0 : -1340, by0 = nb ? nb.y0 : -940, bx1 = nb ? nb.x1 : 1340, by1 = nb ? nb.y1 : 940;
        const C = 24, W = Math.ceil((bx1 - bx0) / C), H = Math.ceil((by1 - by0) / C);
        const cx = i => bx0 + (i + 0.5) * C, cy = j => by0 + (j + 0.5) * C;
        const ok = new Uint8Array(W * H);
        for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) ok[j * W + i] = walk(cx(i), cy(j)) ? 1 : 0;
        const comp = new Int32Array(W * H).fill(-1), comps = [];
        const si = Math.floor((start.x - bx0) / C), sj = Math.floor((start.y - by0) / C);
        const flood = (s, id) => { const q = [s]; comp[s] = id; let n = 0, sx = 0, sy = 0;
          while (q.length) { const c = q.pop(); n++; const i = c % W, j = (c / W) | 0; sx += cx(i); sy += cy(j);
            for (const [di, dj] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]) {
              const ni = i + di, nj = j + dj; if (ni < 0 || nj < 0 || ni >= W || nj >= H) continue; const nc = nj * W + ni;
              if (!ok[nc] || comp[nc] >= 0) continue;
              if (di && dj && !(ok[j * W + ni] && ok[nj * W + i])) continue; // sin cortar esquinas
              comp[nc] = id; q.push(nc); } }
          return {id, n, x: Math.round(sx / n), y: Math.round(sy / n)}; };
        let mainId = -1;
        const startCell = sj * W + si;
        if (ok[startCell]) { comps.push(flood(startCell, 0)); mainId = 0; }
        else add('geometry', 'inicio caminable', 'FAIL', `(${Math.round(start.x)},${Math.round(start.y)})`);
        for (let c = 0; c < W * H; c++) if (ok[c] && comp[c] < 0) comps.push(flood(c, comps.length));
        const walkCells = comps.reduce((s, c) => s + c.n, 0), pockets = comps.filter(c => c.id !== mainId);
        const gated = !!(B && B.geometry && B.geometry.gated);
        const bigPockets = pockets.filter(p => p.n >= 6);
        add('geometry', 'área caminable conexa', bigPockets.length ? (gated ? 'WARNING' : 'FAIL') : (pockets.length ? 'WARNING' : 'PASS'),
          `${walkCells} celdas; ${pockets.length} bolsillos inalcanzables` + (pockets.length ? ': ' + pockets.slice(0, 6).map(p => `${p.n}@(${p.x},${p.y})`).join(' ') : '') + (gated && bigPockets.length ? ' (geometría con compuertas)' : ''));
        // ---------- sólidos visuales ----------
        let visual = [];
        if (B && B.geometry && B.geometry.solids && typeof window[B.geometry.solids] === 'function') {
          for (const P of window[B.geometry.solids]()) {
            const pts = P.pts; let ax = 0, ay = 0; for (const [x, y] of pts) { ax += x; ay += y; } ax /= pts.length; ay /= pts.length;
            const probes = [[ax, ay], ...pts.map(([x, y]) => [ax + (x - ax) * 0.55, ay + (y - ay) * 0.55])];
            const leaks = probes.filter(([x, y]) => walk(x, y, 4)).length;
            visual.push({id: P.id, leaks, probes: probes.length, pts});
          }
          const leaky = visual.filter(v => v.leaks);
          add('geometry', 'si se ve sólido, es sólido', leaky.length ? 'FAIL' : 'PASS', leaky.length ? 'sin colisión: ' + leaky.map(v => v.id).join(', ') : visual.length + ' sólidos pintados con colisión');
        } else if (B && B.geometry && B.geometry.derived) add('geometry', 'si se ve sólido, es sólido', 'PASS', 'sin fondo pintado: el dibujo sale de la misma geometría que la colisión (' + (B.code || '') + ')');
        else add('geometry', 'si se ve sólido, es sólido', 'WARNING', 'la arena no declara sólidos visuales (geometry.solids): revisión manual');
        // CANARIO: un "sólido" falso sobre el inicio (siempre caminable) DEBE detectarse como fuga.
        { const q = [[start.x - 30, start.y - 30], [start.x + 30, start.y - 30], [start.x + 30, start.y + 30], [start.x - 30, start.y + 30]];
          const leaks = [[start.x, start.y], ...q.map(([x, y]) => [start.x + (x - start.x) * 0.55, start.y + (y - start.y) * 0.55])].filter(([x, y]) => walk(x, y, 4)).length;
          if (!leaks) add('geometry', 'canario del validador', 'FAIL', 'un sólido falso sobre el inicio no se detectó: el chequeo visual no funciona'); }
        // ---------- variantes por semilla (trazados de la Arena Factory) ----------
        if (typeof AID_LAYOUT_ARENAS !== 'undefined' && AID_LAYOUT_ARENAS[key] && typeof diffNewSoloSeed === 'function') {
          const oSeed = diffNewSoloSeed, names = new Set(); let badVar = [];
          window.__layForce = true;
          for (const sd of [11, 23, 37, 41, 53, 67, 79, 97]) {
            diffNewSoloSeed = () => { _soloMapSeed = sd; return sd; };
            try { startRun(3); setState('playing'); enemies = []; spawnTimer = 1e9; } catch (err) { badVar.push(sd + ': ' + err.message); continue; }
            if (typeof aidLayoutInfo !== 'undefined' && aidLayoutInfo) names.add(aidLayoutInfo.name || JSON.stringify(aidLayoutInfo).slice(0, 30));
            const ok2 = new Uint8Array(W * H); for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) ok2[j * W + i] = walk(cx(i), cy(j)) ? 1 : 0;
            const seen = new Uint8Array(W * H), s0 = Math.floor((player.y - by0) / C) * W + Math.floor((player.x - bx0) / C);
            if (!ok2[s0]) { badVar.push(sd + ': inicio bloqueado'); continue; }
            const q = [s0]; seen[s0] = 1; let reach = 0, total = 0;
            while (q.length) { const c = q.pop(); reach++; const i = c % W, j = (c / W) | 0; for (const [di, dj] of [[1,0],[-1,0],[0,1],[0,-1]]) { const ni = i + di, nj = j + dj; if (ni < 0 || nj < 0 || ni >= W || nj >= H) continue; const nc = nj * W + ni; if (ok2[nc] && !seen[nc]) { seen[nc] = 1; q.push(nc); } } }
            for (let c = 0; c < W * H; c++) if (ok2[c]) total++;
            if (total - reach > 6) badVar.push(sd + ': ' + (total - reach) + ' celdas aisladas');
          }
          diffNewSoloSeed = oSeed; window.__layForce = undefined;
          try { startRun(3); setState('playing'); enemies = []; spawnTimer = 1e9; } catch (err) {}
          add('variants', 'variantes por semilla sin bolsillos', badVar.length ? 'FAIL' : 'PASS', badVar.length ? badVar.slice(0, 4).join('; ') : `8 semillas, ${names.size} trazados distintos`);
        }
        // ---------- spawns ----------
        runLevel = 3; let badSpawn = 0, unreach = 0, sample = [];
        const pool = spawnPoolFor(runLevel);
        for (let n = 0; n < 120; n++) {
          enemies = [];
          let e; try { e = spawnEnemy(pickFromPool(pool)); } catch (err) { add('spawn', 'spawnEnemy', 'FAIL', err.message); break; }
          if (!e) continue;
          clampToArena(e); resolveWallCollision(e);
          if (e.flying) continue;
          const okHere = walk(e.x, e.y, e.radius || 18);
          // alcanzable = su celda o una vecina pertenece al área principal (la celda puede tener el centro tapado)
          const ei = Math.floor((e.x - bx0) / C), ej = Math.floor((e.y - by0) / C);
          let reach = false;
          for (let dj = -1; dj <= 1 && !reach; dj++) for (let di = -1; di <= 1 && !reach; di++) { const ni = ei + di, nj = ej + dj; if (ni >= 0 && nj >= 0 && ni < W && nj < H && comp[nj * W + ni] === mainId) reach = true; }
          if (!okHere) badSpawn++; else if (!reach && !gated) unreach++;
          if (sample.length < 60) sample.push([Math.round(e.x), Math.round(e.y), okHere && (reach || gated) ? 1 : 0]);
        }
        enemies = [];
        add('spawn', 'apariciones válidas', badSpawn ? 'FAIL' : unreach ? 'WARNING' : 'PASS', `${120 - badSpawn - unreach}/120 válidas; ${badSpawn} dentro de colisión, ${unreach} inalcanzables`);
        // ---------- exploración agresiva ----------
        const stats = {frames: 0, nan: 0, outside: 0, oob: 0, trapped: 0, trappedAt: [], oobAt: [], outsideAt: []};
        const mainCells = []; for (let c = 0; c < W * H; c++) if (comp[c] === mainId) mainCells.push(c);
        const farthestWall = () => { let best = null, bd = -1; for (let k = 0; k < 40; k++) { const c = mainCells[(Math.random() * mainCells.length) | 0]; const x = cx(c % W), y = cy((c / W) | 0); const d = Math.hypot(x - player.x, y - player.y); if (d > bd) { bd = d; best = {x, y}; } } return best; };
        const modes = ['random', 'hug', 'escape', 'goal'];
        let mode = 'random', dir = {x: 1, y: 0}, modeT = 0, goal = null, lastPos = {x: player.x, y: player.y}, stillT = 0;
        for (const h of heroes) h.hp = h.maxHp;
        for (let i = 0; i < 6; i++) { const e = spawnEnemy(pickFromPool(pool)); if (e) { e.hp = e.maxHp = 1e9; e.dmg = 0; } }
        for (let f = 0; f < 1800; f++) { // ~29 s de juego
          modeT -= 16;
          if (modeT <= 0) { mode = modes[(Math.random() * modes.length) | 0]; modeT = 1200 + Math.random() * 1800; const a = Math.random() * 6.283; dir = {x: Math.cos(a), y: Math.sin(a)}; goal = mode === 'goal' ? farthestWall() : null; }
          if (mode === 'escape') { const l = Math.hypot(player.x, player.y) || 1; dir = {x: player.x / l, y: player.y / l}; }
          if (mode === 'hug') { const a = Math.atan2(dir.y, dir.x) + 0.02; dir = {x: Math.cos(a), y: Math.sin(a)}; }
          if (mode === 'goal' && goal) { const dx = goal.x - player.x, dy = goal.y - player.y, l = Math.hypot(dx, dy) || 1; dir = {x: dx / l, y: dy / l}; }
          joyVec = {x: dir.x, y: dir.y};
          try { update(16); } catch (err) { add('explore', 'update sin errores', 'FAIL', err.message); break; }
          if (state !== 'playing') setState('playing');
          stats.frames++;
          for (const h of [player, ...allies]) {
            if (!Number.isFinite(h.x) || !Number.isFinite(h.y)) { stats.nan++; continue; }
            if (h.x < bx0 - 40 || h.x > bx1 + 40 || h.y < by0 - 40 || h.y > by1 + 40) { stats.oob++; if (stats.oobAt.length < 5) stats.oobAt.push(['heroe', h.classKey, Math.round(h.x), Math.round(h.y), f]); }
            else if (!walk(h.x, h.y, h.radius || 18, PEN)) { stats.outside++; if (stats.outsideAt.length < 5) stats.outsideAt.push([h.classKey, Math.round(h.x), Math.round(h.y), f, Object.keys(h).filter(k => /hang|fall|ledge|dangl|rescue/i.test(k) && h[k]).join('|')]); }
          }
          for (const e of enemies) { if (!e.alive || e.flying || e.rank === 'jefe') continue; if (!Number.isFinite(e.x)) stats.nan++; else if (e.x < bx0 - 200 || e.x > bx1 + 200 || e.y < by0 - 200 || e.y > by1 + 200) { stats.oob++; if (stats.oobAt.length < 5) stats.oobAt.push(['enemigo', e.type, Math.round(e.x), Math.round(e.y), f]); } }
          // ¿atrapado? quieto 2 s con el joystick apretado: probar 8 direcciones
          if (Math.hypot(player.x - lastPos.x, player.y - lastPos.y) < 1) stillT += 16; else { stillT = 0; lastPos = {x: player.x, y: player.y}; }
          if (stillT > 2000) {
            let free = false;
            for (let k = 0; k < 8 && !free; k++) { const a = k / 8 * 6.283, p = {x: player.x + Math.cos(a) * 14, y: player.y + Math.sin(a) * 14, radius: player.radius || 18}; clampToArena(p); resolveWallCollision(p); if (Math.hypot(p.x - player.x, p.y - player.y) > 6) free = true; }
            if (!free) { stats.trapped++; stats.trappedAt.push([Math.round(player.x), Math.round(player.y)]); }
            stillT = 0; modeT = 0;
          }
        }
        joyVec = {x: 0, y: 0};
        add('explore', 'sin NaN', stats.nan ? 'FAIL' : 'PASS', String(stats.nan));
        add('explore', 'nadie fuera del mapa', stats.oob ? 'FAIL' : 'PASS', stats.oob + (stats.oob ? ' ' + JSON.stringify(stats.oobAt) : ''));
        const fallable = !!(B && B.geometry && B.geometry.fallable);
        add('explore', 'héroes siempre en zona caminable', stats.outside > 3 ? (fallable ? 'WARNING' : 'FAIL') : stats.outside ? 'WARNING' : 'PASS', stats.outside + ' cuadros-héroe dentro de colisión (> ' + 4 + ' u)' + (stats.outside ? ' ' + JSON.stringify(stats.outsideAt) : '') + (fallable && stats.outside ? ' (arena con caídas: colgado del borde)' : ''));
        add('explore', 'nunca atrapado', stats.trapped ? 'FAIL' : 'PASS', stats.trapped ? 'en ' + JSON.stringify(stats.trappedAt.slice(0, 4)) : stats.frames + ' cuadros de exploración');
        // ---------- lámina de depuración ----------
        const sc = Math.min(2, 1000 / (W * 4)), cv = document.createElement('canvas'); cv.width = W * 4 * sc | 0; cv.height = H * 4 * sc | 0;
        const g = cv.getContext('2d'), k4 = 4 * sc;
        g.fillStyle = '#111'; g.fillRect(0, 0, cv.width, cv.height);
        for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const c = j * W + i; if (!ok[c]) continue; g.fillStyle = comp[c] === mainId ? '#2f6f3a' : '#c0392b'; g.fillRect(i * k4, j * k4, k4 + .5, k4 + .5); }
        const w2c = (x, y) => [(x - bx0) / C * k4, (y - by0) / C * k4];
        g.lineWidth = 1.5;
        for (const v of visual) { g.strokeStyle = v.leaks ? '#ff00ff' : '#ffd23f'; g.beginPath(); v.pts.forEach(([x, y], i) => { const [a, b] = w2c(x, y); i ? g.lineTo(a, b) : g.moveTo(a, b); }); g.closePath(); g.stroke(); }
        for (const [x, y, good] of sample) { const [a, b] = w2c(x, y); g.fillStyle = good ? '#5dade2' : '#ff00ff'; g.fillRect(a - 2, b - 2, 4, 4); }
        { const [a, b] = w2c(start.x, start.y); g.fillStyle = '#fff'; g.beginPath(); g.arc(a, b, 5, 0, 7); g.fill(); }
        const img = cv.toDataURL('image/webp', 0.8);
        Math.random = oRand; state = 'menu';
        return {key, name: (ARENA_MODS[key] || {}).label, number: campaignNumber(key), checks, grid: {W, H, cell: C, walkCells, pockets: pockets.length}, explore: stats, design: B ? B.status : null, img};
      }, key).catch(e => ({key, name: key, checks: [{area: 'load', name: 'evaluación', level: 'FAIL', detail: e.message}], img: null}));
      if (r.img) { fs.writeFileSync(path.join(OUT, 'arenas', key + '.webp'), Buffer.from(r.img.split(',')[1], 'base64')); r.img = `arenas/${key}.webp`; }
      const f = r.checks.filter(c => c.level === 'FAIL').length, w = r.checks.filter(c => c.level === 'WARNING').length;
      r.summary = {fail: f, warning: w, seconds: Math.round((Date.now() - t0) / 1000)};
      r.status = f ? 'FAIL' : w ? 'WARNING' : 'PASS';
      results.push(r);
      console.log(`${r.status.padEnd(8)} ${key.padEnd(10)} fail=${f} warn=${w} (${r.summary.seconds}s)`);
      for (const c of r.checks.filter(c => c.level !== 'PASS' || process.env.VERBOSE)) console.log(`   ${c.level} [${c.area}] ${c.name} — ${c.detail}`);
    }
    const report = {schemaVersion: 1, generatedBy: 'tools/bible/arena-validator.js', scope: 'Automated geometry/spawn/exploration checks on the real engine + blueprint completeness. PASS is not a design approval.', arenas: results, pageErrors};
    if (!process.env.ARENAS) {
      fs.writeFileSync(path.join(OUT, 'arena-audit.json'), JSON.stringify(report, null, 1) + '\n');
      fs.writeFileSync(path.join(OUT, 'ARENA_AUDIT.md'), renderMd(report));
    }
    console.log(`page errors: ${pageErrors.length}`); if (pageErrors.length) console.log(pageErrors.slice(0, 5).join('\n'));
    if (process.argv.includes('--strict') && (pageErrors.length || results.some(r => r.summary.fail))) process.exitCode = 1;
  } finally { await browser.close(); server.kill(); }
})().catch(e => { console.error(e); process.exitCode = 1; server.kill(); });

function renderMd(rep) {
  const L = ['# Auditoría de arenas (AUTO-GENERADO)', '', '> Generado por `node tools/bible/arena-validator.js`. No editar a mano.', '> ' + rep.scope, '',
    'Lámina: verde = caminable y alcanzable · rojo = caminable pero inalcanzable (bolsillo) · amarillo = sólido pintado con colisión · magenta = sólido sin colisión / aparición inválida · celeste = aparición válida · blanco = inicio.', '',
    '| # | Arena | Validador | FAIL | WARN | Diseño | Celdas | Bolsillos | Lámina |', '|---|---|---|---|---|---|---|---|---|'];
  for (const a of rep.arenas) L.push(`| ${a.number || '—'} | ${a.name} (\`${a.key}\`) | **${a.status}** | ${a.summary.fail} | ${a.summary.warning} | ${a.design ? a.design.grade : '—'} | ${a.grid ? a.grid.walkCells : '—'} | ${a.grid ? a.grid.pockets : '—'} | ${a.img ? `![${a.key}](${a.img})` : '—'} |`);
  L.push('', '## Detalle', '');
  for (const a of rep.arenas) {
    L.push(`### ${a.name} — ${a.status}`);
    for (const c of a.checks) L.push(`- ${c.level === 'PASS' ? '✔' : c.level === 'WARNING' ? '⚠' : '✘'} **${c.level}** [${c.area}] ${c.name}${c.detail ? ' — ' + c.detail : ''}`);
    L.push('');
  }
  return L.join('\n') + '\n';
}
