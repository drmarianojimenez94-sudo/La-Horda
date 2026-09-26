// Auditoría de COLISIONES del Reino Micelial: hongos grandes sólidos (hileras, lámparas, pilares,
// hongos gigantes de la Madre) sin bolsillos cerrados (flood-fill), héroes/enemigos nunca adentro.
//   (python3 -m http.server 8771 &) ; node tools/items/t_collision.js
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const BASE = process.env.SE_BASE_URL || 'http://127.0.0.1:8771';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 400) : '')); if (!ok) fails++; };
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: 900, height: 506 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_CERT|fonts\.g|net::|404/.test(m.text())) errors.push('console: ' + m.text().slice(0, 300)); });
  await page.addInitScript(() => { window.__campaignMode = true; });
  await page.goto(`${BASE}/index.html`, { waitUntil: 'load' });
  for (let k = 0; k < 300; k++) { if (await page.evaluate(() => !document.getElementById('title-continue-btn').disabled)) break; await sleep(100); }
  const E = (fn, a) => page.evaluate(fn, a);
  await E(() => { loop = function(){};
    window.__start = (lv, arena, cls) => { for (const k of Object.keys(save.champions)) save.champions[k].unlocked = true; save.stash = []; for (const k in save.champions) save.champions[k].equipment = mkEquipment();
      selectedClass = cls || 'guerrero'; currentArena = arena || 'bosque'; lobbyAllies = ['tanque','soporte','mago']; startRun(lv || 5); spawnTimer = 1e12; enemies.length = 0; levelDuration = 9e9; invalidatePassiveCache(); updateAllies = function(){}; };
    window.__foe = (dx, dy, t) => { const e = spawnEnemy(t || 'duende_bosque', false); e.x = player.x + dx; e.y = player.y + dy; e.atkCd = 1e9; return e; };
    window.__role = (dx, dy, role, t) => { const e = __foe(dx, dy, t); applyRole(e, role); e.roleT = 0; return e; };
    window.__step = (ms, keepHp) => { let t = 0; while (t < ms && state === 'playing') { if (keepHp) for (const h of heroes) h.hp = Math.max(h.hp, h.maxHp*0.9); update(16); t += 16; } };
    window.__freeze = () => { for (const h of heroes){ h.speed = 0; } };
  });


  const r1 = await E(() => { __start(3, 'micelial', 'tanque'); update(16); micS.nodes = MIC_NODES.map(() => String.fromCharCode(48 + FN.MATURE)).join(''); const sol = micSolids();
    const kinds = {}; for (const n of MIC_NODES) kinds[n.kind] = (kinds[n.kind]||0) + 1;
    // separación mínima entre hongos sólidos de nodos distintos (borde a borde)
    let minGap = 1e9; const byNode = []; MIC_NODES.forEach((n, i) => { const sh = MIC_SOLID_SHAPE[n.kind]; if (sh) byNode.push(sol.filter(c => Math.abs(c.y - n.y) < 0.01 && Math.abs(c.x - n.x) < 40)); });
    for (let a = 0; a < byNode.length; a++) for (let b = a + 1; b < byNode.length; b++) for (const p of byNode[a]) for (const q of byNode[b]) minGap = Math.min(minGap, Math.hypot(p.x-q.x, p.y-q.y) - p.r - q.r);
    return { solids: sol.length, kinds, minGap: Math.round(minGap) }; });
  check('COL.hongos_grandes_son_solidos', r1.solids >= 8, r1);
  check('COL.siempre_queda_paso_entre_dos_hongos', r1.minGap >= 26, r1);

  // flood-fill: todo lo caminable (con los hongos sólidos) es un solo tramo conexo
  const r2 = await E(() => { const E0 = MIC_MAP.ell, S = 16, half = 12; const cols = Math.ceil(E0.rx*2/S), rows = Math.ceil(E0.ry*2/S); const ok = new Uint8Array(cols*rows); const sol = micSolids();
    const free = (x, y) => micInside(x, y, half) && !sol.some(c => Math.hypot(c.x-x, c.y-y) < c.r + half);
    let total = 0, start = -1; for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++){ const x = E0.cx - E0.rx + (i+0.5)*S, y = E0.cy - E0.ry + (j+0.5)*S; if (free(x, y)){ ok[j*cols+i] = 1; total++; if (start < 0 && Math.hypot(x - MIC_MAP.start.x, y - MIC_MAP.start.y) < 40) start = j*cols+i; } }
    if (start < 0) start = ok.indexOf(1); const seen = new Uint8Array(cols*rows); const q = [start]; seen[start] = 1; let n = 0;
    while (q.length){ const c = q.pop(); n++; const i = c % cols, j = (c - i)/cols; for (const [di, dj] of [[1,0],[-1,0],[0,1],[0,-1]]){ const ii = i+di, jj = j+dj; if (ii<0||jj<0||ii>=cols||jj>=rows) continue; const k = jj*cols+ii; if (ok[k] && !seen[k]){ seen[k] = 1; q.push(k); } } }
    return { total, reached: n, pct: Math.round(n/total*1000)/10 }; });
  check('COL.caminable_conexo_sin_bolsillos', r2.pct >= 99.5, r2);

  // un héroe/enemigo metido en un hongo sale; caminando contra una hilera no la atraviesa
  const r3 = await E(() => { const i = MIC_NODES.findIndex(n => n.kind === 'grove' || n.kind === 'pillar'); const n = MIC_NODES[i]; const sol = micSolids();
    player.x = n.x; player.y = n.y; micClamp(player); const out = sol.every(c => Math.hypot(c.x-player.x, c.y-player.y) >= c.r + 11.9);
    const e = spawnEnemy('infectado', false); e.x = n.x + 2; e.y = n.y; micClamp(e); const eOut = sol.every(c => Math.hypot(c.x-e.x, c.y-e.y) >= c.r + Math.min(e.radius, 30)*0.5 - 0.1);
    // caminar derecho hacia el centro del hongo desde 120 u a la izquierda
    player.x = n.x - 120; player.y = n.y; let inside = 0; for (let k = 0; k < 90; k++){ player.x += 3; micClamp(player); if (sol.some(c => Math.hypot(c.x-player.x, c.y-player.y) < c.r + 11)) inside++; }
    return { kind: n.kind, out, eOut, inside }; });
  check('COL.nadie_queda_adentro_de_un_hongo', r3.out && r3.eOut && r3.inside === 0, r3);

  // hongos gigantes de la Madre: sólidos mientras están en pie, no mientras brotan ni al morir
  const r4 = await E(() => { micS.giants.length = 0; micS.giants.push({x: player.x + 300, y: player.y, t: 0, d: 15000}); const a = micSolids().filter(c => c.r === 24).length;
    micS.giants[0].t = 5000; const b = micSolids().filter(c => c.r === 24).length; micS.giants[0].t = 14500; const c = micSolids().filter(c => c.r === 24).length; micS.giants.length = 0; return { growing: a, standing: b, dying: c }; });
  check('COL.hongo_gigante_solido_solo_en_pie', r4.growing === 0 && r4.standing === 1 && r4.dying === 0, r4);

  // partida real con bots en el Micelial: nadie termina adentro de un hongo y los bots llegan a los núcleos
  const r5 = await E(() => { __start(4, 'micelial', 'mago'); spawnTimer = 0; let inside = 0, frames = 0, maxE = 0, checked = 0;
    for (let i = 0; i < 2400 && state === 'playing'; i++){ for (const h of heroes) h.hp = h.maxHp; update(16); frames++; maxE = Math.max(maxE, enemies.filter(e=>e.alive).length); if (i % 20 === 0){ checked += enemies.length; const sol = micSolids(); for (const h of heroes) if (h.alive && sol.some(c => Math.hypot(c.x-h.x, c.y-h.y) < c.r + 10)) inside++; for (const e of enemies) if (e.alive && e.rank !== 'jefe' && (e.radius||0) <= 60 && sol.some(c => Math.hypot(c.x-e.x, c.y-e.y) < c.r + Math.min(e.radius||20, 30)*0.5 - 2)) inside++; } if (i % 400 === 0) render(); }
    return { inside, frames, solids: micSolids().length, maxE, checked }; });
  check('COL.partida_real_sin_nadie_adentro', r5.inside === 0 && r5.maxE >= 5, r5);
  check('COL.sin_errores', errors.length === 0, errors);
  console.log(`SUMMARY ${fails === 0 ? 'OK' : 'FAIL'} fails=${fails}`);
  await browser.close();
  process.exit(fails ? 1 : 0);
})();
