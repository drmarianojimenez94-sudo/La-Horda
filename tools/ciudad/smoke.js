// Humo de la CIUDAD MALDITA: arranca la partida, entra a una casa (fundido local del techo), rescata un
// civil hasta la zona segura, pasa por los niveles con cada enemigo, el nivel 9 (subjefes) y El Presentador.
//   (python3 -m http.server 8771 &) ; node tools/ciudad/smoke.js <outdir>
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const fs = require('fs'), path = require('path');
const BASE = process.env.SE_BASE_URL || 'http://127.0.0.1:8771';
const outdir = process.argv[2] || '/tmp/cm_smoke'; fs.mkdirSync(outdir, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const checks = {}; const ok = (k, v) => { checks[k] = !!v; };
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: 1000, height: 560 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_CERT|fonts\.g|net::/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.goto(`${BASE}/index.html`, { waitUntil: 'load' });
  for (let k = 0; k < 300; k++) { if (await page.evaluate(() => !document.getElementById('title-continue-btn').disabled)) break; await sleep(100); }
  const E = (fn, a) => page.evaluate(fn, a);
  const shot = n => page.screenshot({ path: path.join(outdir, n + '.png') });
  ok('arena_jugable', await E(() => ARENA_ORDER[0] === 'ciudad' && !ARENA_MODS.ciudad.comingSoon));
  await E(() => { selectedClass = 'guerrero'; currentArena = 'ciudad'; lobbyAllies = ['tanque', 'mago', 'soporte']; startRun(1); });
  await sleep(2500); await shot('L1_start');
  ok('estado', await E(() => !!cmS && cmS.civ.length >= 2 && AID_NAV.on));
  await E(() => { for (const h of heroes) { h.invulnTimer = 1e9; } });
  // entrar a la Casa de la Viuda (civil del tutorial) -> techo fundido localmente
  await E(() => { const b = CM_BLD.b12; player.x = b.doorPt.x + 60; player.y = b.doorPt.y; });
  await sleep(600);
  await E(() => { const b = CM_BLD.b12; player.x = (b.inner.x0 + b.inner.x1)/2 + 40; player.y = (b.inner.y0 + b.inner.y1)/2; });
  await sleep(1200); await shot('L1_inside');
  ok('techo_fundido', await E(() => CM_ROOF_A.b12 < 0.3 && (CM_ROOF_A.b13 === undefined || CM_ROOF_A.b13 > 0.9)));
  ok('civil_descubierto', await E(() => cmS.civ.some(c => c.st === CIV.IDLE)));
  // rescate: mantener la acción contextual
  await E(() => { const t = cmS.ctx[0]; if (t) player._ctxHold = t.id; });
  await sleep(1500);
  ok('civil_sigue', await E(() => cmS.civ.some(c => c.st === CIV.FOLLOW && heroes[c.lead] === player)));
  // caminar hasta la Puerta de Evacuación (la fila sigue por la puerta)
  for (let k = 0; k < 40; k++) {
    await E(() => { const z = CM_SAFE.find(q => q.id === 'puerta'); const b = CM_BLD.b12; const inB = cmBuildingAt(player.x, player.y); const tg = inB ? b.doorPt : z; const dx = tg.x - player.x, dy = tg.y - player.y, d = Math.hypot(dx, dy) || 1; player.x += dx / d * Math.min(d, 40); player.y += dy / d * Math.min(d, 40); cmClamp(player); });
    await sleep(120);
  }
  await sleep(1200); await shot('L1_rescue');
  ok('rescatado', await E(() => cmS.saved >= 1));
  // niveles con cada enemigo
  for (const lv of [3, 4, 6, 7, 8]) {
    await E((lv) => { runLevel = lv; levelTimer = 0; cmBeginLevel(); for (const h of heroes) { h.invulnTimer = 1e9; } }, lv);
    const types = { 3: ['cm_raptor', 'cm_perro'], 4: ['cm_verdugo'], 6: ['cm_acechante', 'cm_sectario', 'cm_planidera'], 7: ['cm_campanero', 'cm_espectro'], 8: ['cm_saqueador'] }[lv];
    await E((types) => { for (const t of types) { const p = cmNearestFree(player.x + 260, player.y - 120, 30); cmSpawnAt(t, p.x, p.y); } }, types);
    await sleep(7000);
    await shot('L' + lv);
  }
  ok('enemigos_vivos', await E(() => enemies.some(e => e.alive && e.type.indexOf('cm_') === 0)));
  // secuestro forzado: un Raptor agarra al civil más cercano y lo suelta si le pegan
  const kid = await E(() => {
    for (const e of enemies) { e.alive = false; } enemies = [];
    const p = cmNearestFree(player.x + 300, player.y + 160, 30);
    cmS.civ.push({id:cmS.nid++, k:0, st:CIV.IDLE, x:p.x, y:p.y, hp:60, t:0, lead:-1, fx:1}); const c = cmS.civ[cmS.civ.length - 1];
    const r = cmSpawnAt('cm_raptor', c.x + 30, c.y); cmId(r);
    return {cid:c.id, rid:r.cmId};
  });
  let kidnapped = false;
  for (let k = 0; k < 20 && !kidnapped; k++) { await sleep(150); kidnapped = await E((k) => { const c = cmCivById(k.cid); return !!c && c.st === CIV.KIDNAPPED; }, kid); }
  await E((k) => { const r = enemies.find(e => e.cmId === k.rid); if (r) damageEnemy(r, r.maxHp * 0.5, {}); }, kid);
  await sleep(300);
  ok('secuestro_y_suelta', kidnapped && await E((k) => { const c = cmCivById(k.cid); return c && (c.st === CIV.FLEE || c.st === CIV.FOLLOW || c.st === CIV.IDLE); }, kid));
  // estructura: un golpe grande la lleva a CRÍTICA y otro la derriba (sus refugiados salen corriendo)
  await E(() => { const i = cmStructIdx('refEste'); cmS.st[i].sh = 2; cmHitStruct(i, 1000); cmHitStruct(i, 1000); });
  ok('estructura_cae', await E(() => cmS.st[cmStructIdx('refEste')].st === CM_ST.DESTROYED && cmS.civ.some(c => c.st === CIV.RUN)));
  await sleep(1000); await shot('struct_fall');
  // nivel 9: Maestro + Tramoyista -> apagón -> Dama
  await E(() => { runLevel = 9; levelTimer = levelDuration * 0.31; cmBeginLevel(); for (const h of heroes) { h.invulnTimer = 1e9; } levelTimer = levelDuration * 0.31; });
  await sleep(4500); await shot('L9_subjefes');
  ok('subjefes', await E(() => !!cmEnt('cm_maestro') && !!cmEnt('cm_tramoyista')));
  await sleep(5000); await shot('L9_pelea');
  await E(() => { for (const e of enemies) if (e.type === 'cm_maestro' || e.type === 'cm_tramoyista') damageEnemy(e, 1e9, {}); });
  await sleep(4500); await shot('L9_dama');
  ok('dama', await E(() => !!cmEnt('cm_dama')));
  await sleep(5000); await shot('L9_dama_pelea');
  await E(() => { const d = cmEnt('cm_dama'); if (d) damageEnemy(d, 1e9, {}); });
  await sleep(5000);
  ok('nivel9_listo', await E(() => cmS.sub.st === 'done'));
  // nivel 10: El Presentador (3 actos)
  await E(() => { runLevel = 10; levelTimer = 0; beginLevel(); for (const h of heroes) { h.invulnTimer = 1e9; } });
  await sleep(7000); await shot('L10_acto1');
  ok('presentador', await E(() => !!cmPresEntity() && bossActive));
  await E(() => { const e = cmPresEntity(); e.hp = e.maxHp * 0.6; });
  await sleep(5500); await shot('L10_acto2');
  ok('acto2', await E(() => cmS.pr.act === 2));
  await E(() => { const e = cmPresEntity(); e.hp = e.maxHp * 0.3; });
  await sleep(6500); await shot('L10_acto3');
  ok('acto3', await E(() => cmS.pr.act === 3 && (cmS.spec || []).length >= 2));
  await E(() => { const e = cmPresEntity(); e.ovCd = 0; });
  await sleep(4500); await shot('L10_ovacion');
  await E(() => { const e = cmPresEntity(); damageEnemy(e, 1e12, {}); });
  await sleep(3500); await shot('L10_muerte');
  await sleep(8000); await shot('victoria');
  ok('victoria', await E(() => state === 'victory' && !!save.arenasCleared.ciudad));
  const html = await E(() => document.getElementById('victory-step-body') ? document.getElementById('victory-step-body').innerText : '');
  ok('resultados_civiles', /Civiles rescatados/.test(html));
  console.log(JSON.stringify(checks));
  console.log('SUMMARY', Object.values(checks).every(Boolean) ? 'OK' : 'FAIL', 'fails=' + Object.entries(checks).filter(([k, v]) => !v).map(([k]) => k).join(','));
  console.log('ERRORS', errors.length); errors.slice(0, 20).forEach(e => console.log(e));
  await browser.close();
})();
