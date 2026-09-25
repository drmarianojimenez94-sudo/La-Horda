// LA HORDA — B1: prueba de resistencia. 4 humanos (campeones de kit complejo) se mueven, usan
// habilidades y ultis sin parar durante un rato; se vigilan errores de página y del loop en
// TODOS los clientes, el tamaño de los snapshots y que todos sigan viendo el mismo mundo.
// uso: node tools/net-test/soak.js [segundos] [arena] [campeones separados por coma]
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const SITE = process.env.SITE || 'http://127.0.0.1:8771', RELAY = process.env.RELAY || 'ws://127.0.0.1:8799';
const SECS = parseInt(process.argv[2] || '60', 10), ARENA = process.argv[3] || 'laberinto';
const CH = (process.argv[4] || 'nigromante,musashi,axiom,profeta').split(',');
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 400) : '')); if (!ok) fails++; };
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] });
  const mk = async (url, i) => {
    const ctx = await b.newContext({ viewport: { width: 844, height: 390 } });
    await ctx.addInitScript(([n]) => { try { if (!localStorage.getItem('__s')) { localStorage.clear(); localStorage.setItem('__s', '1'); localStorage.setItem('horda_name', n); } } catch (e) {} }, ['J' + (i + 1)]);
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
    await p.goto(url);
    for (let k = 0; k < 300; k++) { if (await p.evaluate(() => { const x = document.getElementById('title-continue-btn'); return x && !x.disabled; })) break; await sleep(100); }
    await p.evaluate(([c]) => { for (const k in save.champions) { save.champions[k].level = 30; save.champions[k].skillMastery.forEach(m => m.alloc = 5); save.champions[k].ultMastery.alloc = 3; } save.arenasCleared = { bosque: true, acuatica: true, hielo: true, laberinto: true, infernal: true }; selectedClass = c; }, [CH[i]]);
    return { p, errs, i };
  };
  const H = await mk(`${SITE}/index.html?server=${encodeURIComponent(RELAY)}`, 0);
  await H.p.evaluate(([a]) => { document.getElementById('title-continue-btn').click(); currentArena = a; setState('prep'); renderPrepSummary(); document.getElementById('net-create-btn').click(); }, [ARENA]);
  for (let k = 0; k < 50 && !(await H.p.evaluate(() => net.code)); k++) await sleep(100);
  const url = await H.p.evaluate(() => netInviteUrl());
  const all = [H];
  for (let i = 1; i < CH.length; i++) { const g = await mk(url, i); await g.p.click('#title-join-btn'); for (let k = 0; k < 50 && !(await g.p.evaluate(() => state === 'prep')); k++) await sleep(100); all.push(g); }
  await H.p.evaluate(() => document.getElementById('prep-start-btn').click());
  await sleep(1500);
  // BOSS=1: directo a la pelea con el jefe final de la arena (todas sus fases)
  if (process.env.BOSS) await H.p.evaluate(() => { runLevel = LEVEL_COUNT; enemies.forEach(e => e.alive = false); startBossFight(); });
  const t0 = Date.now(); let tick = 0; const sizes = [];
  while (Date.now() - t0 < SECS * 1000) {
    tick++;
    await Promise.all(all.map((c, i) => c.p.evaluate(([t, i]) => {
      if (state === 'buff') { const card = document.querySelector('#buff-cards .buff-card'); if (card) card.click(); return; }
      if (state !== 'playing' || !player) return;
      const a = (t * 0.7 + i * 1.7); joyVec = { x: Math.cos(a) * 0.8, y: Math.sin(a) * 0.8 }; basicHeld = true;
      if (t % 3 === i % 3) { player.energy = player.maxEnergy; useSkill(t % 3, null); }
      if (t % 10 === i) { player.ultCharge = player.ultMax; useUltimate(); }
    }, [tick, i])));
    // el anfitrión mantiene a los humanos vivos y recarga su energía (es una prueba de sync, no de dificultad)
    await H.p.evaluate(() => { if (!heroes) return; for (const h of heroes) { if (!h.alive && !runEnding) { h.alive = true; h.hp = h.maxHp; } h.hp = Math.max(h.hp, h.maxHp * 0.5); h.energy = h.maxEnergy; if (h.isRemote) { h.ultCharge = h.ultMax; h.ultCd = 0; } } if (runLevel < 5) runLevel = 5; });
    if (tick % 10 === 0) sizes.push(await H.p.evaluate(() => netMatch && netMatch.lastSnapBytes));
    if (process.env.PROFILE && tick % 25 === 0) console.log('profile', await H.p.evaluate(() => {
      const hs = o => JSON.stringify(o || '').length; const s = netBuildSnapshot(false); const out = { total: hs(s), h: hs(s.h), p: hs(s.p), v: hs(s.v), g: hs(s.g) };
      for (const c in s.c) out[c] = hs(s.c[c]);
      const keys = {}; (s.h || []).forEach(d => { if (d) for (const k in d) keys['h.' + k] = (keys['h.' + k] || 0) + hs(d[k]); });
      if (s.c.enemies) for (const [id, d] of s.c.enemies.u) for (const k in d) keys['e.' + k] = (keys['e.' + k] || 0) + hs(d[k]) + k.length + 3;
      (s.v || []).forEach(e => keys['ev.' + e[0]] = (keys['ev.' + e[0]] || 0) + hs(e));
      out.top = Object.entries(keys).sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k, v]) => k + ':' + v).join(' ');
      return JSON.stringify(out); }));
    await sleep(350);
  }
  if (process.env.BOSS) {
    const bs = await Promise.all(all.map(c => c.p.evaluate(() => ({ boss: boss && boss.type, hud: !document.getElementById('boss-bar') || getComputedStyle(document.getElementById('boss-bar').parentElement).display !== 'none', st: state }))));
    check('boss.all_see_same_boss_or_victory', bs.every(b => (b.boss === bs[0].boss) || b.st === 'victory'), bs);
  }
  const loopErrs = await Promise.all(all.map(c => c.p.evaluate(() => lastLoopError)));
  all.forEach((c, i) => check(`soak.client${i}_no_page_errors`, c.errs.length === 0, c.errs.slice(0, 3)));
  all.forEach((c, i) => check(`soak.client${i}_no_loop_errors`, !loopErrs[i], loopErrs[i]));
  const states = await Promise.all(all.map(c => c.p.evaluate(() => ({ state, lvl: runLevel, enemies: enemies ? enemies.filter(e => e.alive !== false).length : -1, slot: net.slot, role: net.role, match: netMatch && netMatch.role }))));
  check('soak.all_same_level', states.every(s => s.lvl === states[0].lvl), states);
  check('soak.enemy_counts_close', states.every(s => Math.abs(s.enemies - states[0].enemies) <= 3), states);
  const avg = Math.round(sizes.filter(Boolean).reduce((a, b) => a + b, 0) / Math.max(1, sizes.filter(Boolean).length));
  check('soak.snapshot_size_ok', avg < 12000, { avgBytes: avg, max: Math.max(...sizes.filter(Boolean)) });
  console.log('SUMMARY', JSON.stringify({ fails, secs: SECS, arena: ARENA, champs: CH }));
  await b.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.log('FAIL exception', e.stack); process.exit(1); });
