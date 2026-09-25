// Deterministic gameplay + render trace. Same seed, same virtual clock, same scripted inputs:
// two builds of the same game must produce identical traces (state digests + canvas pixels).
// usage: node t_det.js <site> <outdir> [filter-regex]
const { launch, openDet, seedSave, writeJSON } = require('./lib.js');

const CHAMPS = ["tanque","guerrero","mago","soporte","segador","axiom","profeta","musashi","cazadora","nigromante"];
const ARENAS = ["bosque","hielo","laberinto","infernal","acuatica"];

// standard combat script: move in a circle, hold basic attack, cast everything on a schedule
function combatScript(extra = {}) {
  const s = {
    0: "__T.setJoy(1,0); basicHeld=true;",
    60: "__T.setCds(0); __T.setEnergy(999); __T.forceCast(0);",
    90: "__T.setJoy(0,1);",
    120: "__T.setCds(0); __T.setEnergy(999); __T.forceCast(1);",
    150: "__T.setJoy(-1,0);",
    180: "__T.setCds(0); __T.setEnergy(999); __T.forceCast(2);",
    210: "__T.setJoy(0,-1);",
    240: "__T.setCds(0); __T.setEnergy(999); __T.forceUlt();",
    300: "__T.setJoy(0.7,0.7);",
    360: "__T.setCds(0); __T.setEnergy(999); __T.forceCast(0); __T.forceCast(1); __T.forceCast(2);",
    420: "__T.setJoy(0,0);",
  };
  return Object.assign(s, extra);
}

const SCENARIOS = [];
CHAMPS.forEach((c, i) => {
  const arena = ARENAS[i % ARENAS.length];
  SCENARIOS.push({ name: `combat_${c}_${arena}`, setup: `__T.startAs(${JSON.stringify(c)}, ${JSON.stringify(arena)}, 3);`, frames: 540, script: combatScript() });
});
// second arena for every champion (different rotation) with god mode, longer
CHAMPS.forEach((c, i) => {
  const arena = ARENAS[(i + 2) % ARENAS.length];
  SCENARIOS.push({ name: `long_${c}_${arena}`, setup: `__T.startAs(${JSON.stringify(c)}, ${JSON.stringify(arena)}, 1); __T.god();`, frames: 1500, script: combatScript({ 900: "__T.setCds(0); __T.setEnergy(999); __T.forceUlt();", 1200: "__T.setJoy(-0.7,0.3);" }), hashEvery: 300 });
});
// bosses: final level of every arena, strong party so the fight resolves
ARENAS.forEach((a, i) => {
  const c = ["guerrero","mago","segador","musashi","cazadora"][i];
  SCENARIOS.push({ name: `boss_${a}_${c}`, setup: `__T.startAs(${JSON.stringify(c)}, ${JSON.stringify(a)}, 10); __T.god(); __T.setDmgMult(8);`, frames: 3600, script: combatScript({ 30: "__T.startBoss();", 600: "__T.setCds(0); __T.setEnergy(999); __T.forceUlt();", 1200: "__T.setCds(0); __T.setEnergy(999); __T.forceCast(0); __T.forceCast(1); __T.forceCast(2); __T.forceUlt();", 1800: "__T.setJoy(0.3,-0.9);", 2400: "__T.setCds(0); __T.setEnergy(999); __T.forceUlt();" }), hashEvery: 600 });
});
SCENARIOS.push({ name: 'divina_guerrero', setup: `save.divineArenaUnlocked=true; __T.startDivina("guerrero"); __T.god();`, frames: 2400, script: combatScript({ 900: "__T.setJoy(0,-1);", 1500: "__T.setCds(0); __T.setEnergy(999); __T.forceUlt();" }), hashEvery: 600 });
SCENARIOS.push({ name: 'divina_nigromante_natural', setup: `save.divineArenaUnlocked=true; __T.startDivina("nigromante");`, frames: 1800, script: combatScript(), hashEvery: 600 });
SCENARIOS.push({ name: 'nigro_summons', setup: `__T.startAs("nigromante","bosque",2); __T.god();`, frames: 1200, script: combatScript({ 30: "__T.setCds(0); __T.setEnergy(999); __T.forceCast(0); __T.forceCast(1); __T.forceCast(2);", 500: "__T.setCds(0); __T.setEnergy(999); __T.forceCast(0); __T.forceCast(1);", 700: "__T.killAll();" }), hashEvery: 300 });
SCENARIOS.push({ name: 'death_natural_soporte', setup: `__T.startAs("soporte","infernal",9);`, frames: 3600, script: { 0: "__T.setJoy(0,0); basicHeld=false;" }, stopOn: ['gameover'], hashEvery: 900 });
SCENARIOS.push({ name: 'levelup_buffs_asesino', setup: `__T.startAs("guerrero","bosque",1); __T.god(); __T.setDmgMult(30);`, frames: 4200, script: combatScript(), hashEvery: 1400 });
SCENARIOS.push({ name: 'revive_flow', setup: `__T.startAs("profeta","hielo",4); __T.god();`, frames: 900, script: combatScript({ 100: "heroes[1].hp=0; heroes[1].alive=false;", 400: "__T.setCds(0); __T.setEnergy(999); __T.forceCast(0); __T.forceCast(1); __T.forceCast(2); __T.forceUlt();" }), hashEvery: 300 });

// pure-logic probes (no frames): items, talents, rewards, persistence
const LOGIC = `(() => {
  const out = {};
  for (const k of Object.keys(CLASSES)) {
    selectedClass = k; currentArena = 'bosque'; startRun(1);
    const inv0 = __T.inv().len;
    const r = [];
    for (let i = 0; i < 6; i++) { try { r.push(JSON.stringify(__T.genReward(40 + i*15))); } catch (e) { r.push('ERR ' + e.message); } }
    for (const rar of ['comun','raro','muyraro','legendario','mitico']) for (const ty of ['arma','escudo','casco','pechera','guantes','botas']) { try { __T.itemGen(ty, rar); } catch (e) { r.push('genERR ' + e.message); } }
    const inv = __T.inv();
    for (const it of inv.items.slice(0, 12)) { try { __T.equip(it.uid); } catch (e) { r.push('eqERR ' + e.message); } }
    let fused = [];
    for (const g of __T.fusableGroups().slice(0, 3)) { try { fused.push(JSON.stringify(__T.fuse(g.uids.slice(0, 3)))); } catch (e) { fused.push('fuseERR ' + e.message); } }
    __T.talentPointsAdd(40);
    const bought = [];
    for (const id of __T.talentTree()) { try { bought.push(id + ':' + JSON.stringify(__T.talentBuy(id))); } catch (e) { bought.push(id + ':ERR ' + e.message); } }
    let ids = []; try { ids = __T.designedFor(); } catch (e) { ids = ['ERR ' + e.message]; }
    out[k] = { inv0, rewards: r, invAfter: JSON.stringify(__T.inv()), fused, bought, designed: JSON.stringify(ids),
      stats: JSON.stringify([player.maxHp, player.baseDmg, player.def, player.speed, player.maxEnergy, runStats.critChance, runStats.critMult]) };
  }
  out.save = JSON.stringify(save);
  return out;
})()`;

async function runScenario(browser, site, sc) {
  const { ctx, page, errors } = await openDet(browser, site, { save: seedSave(), seed: 777 });
  const trace = { name: sc.name, digests: [], hashes: [], events: [] };
  await page.evaluate(code => window.__T.ev(code), sc.setup);
  const script = sc.script || {};
  const marks = new Set(Object.keys(script).map(Number));
  const dEvery = sc.digestEvery || 30, hEvery = sc.hashEvery || 120;
  let f = 0;
  while (f < sc.frames) {
    if (marks.has(f)) await page.evaluate(code => window.__T.ev(code), script[f]);
    let next = sc.frames;
    for (const m of marks) if (m > f && m < next) next = m;
    const nd = Math.ceil((f + 1) / dEvery) * dEvery; if (nd < next) next = nd;
    await page.evaluate(n => window.__step(n), next - f);
    f = next;
    if (f % dEvery === 0) trace.digests.push([f, await page.evaluate(() => window.__T.digest())]);
    if (f % hEvery === 0) trace.hashes.push([f, await page.evaluate(() => window.__T.canvasHash())]);
    const st = await page.evaluate(() => window.__T.state());
    if (st === 'buff') {
      const pick = await page.evaluate(() => { const c = document.querySelector('#buff-cards .buff-card'); const n = c && c.querySelector('.buff-name').textContent; if (c) c.click(); return n; });
      trace.events.push([f, 'buff', pick]);
    } else if (st !== 'playing') {
      trace.events.push([f, 'state', st, await page.evaluate(() => { const el = document.querySelector('.screen:not(.hidden)') || document.getElementById(({gameover:'gameover-screen',victory:'victory-screen'})[state] || ''); return el ? el.innerText.replace(/\s+/g, ' ').slice(0, 300) : null; })]);
      if (!sc.stopOn || sc.stopOn.includes(st) || st === 'gameover' || st === 'victory') break;
    }
  }
  trace.finalFrame = f;
  trace.errors = (await page.evaluate(() => window.__errors.slice())).concat(errors);
  await ctx.close();
  return trace;
}

(async () => {
  const [site, outdir, filter] = process.argv.slice(2);
  const re = filter ? new RegExp(filter) : null;
  const browser = await launch();
  const results = {};
  const t0 = Date.now();
  for (const sc of SCENARIOS) {
    if (re && !re.test(sc.name)) continue;
    const t1 = Date.now();
    try { results[sc.name] = await runScenario(browser, site, sc); }
    catch (e) { results[sc.name] = { name: sc.name, crash: String(e) }; }
    const r = results[sc.name];
    console.log(`${sc.name.padEnd(34)} frames=${r.finalFrame} digests=${r.digests ? r.digests.length : '-'} ev=${r.events ? JSON.stringify(r.events).slice(0, 160) : ''} err=${r.errors ? r.errors.length : r.crash} ${((Date.now() - t1) / 1000).toFixed(1)}s`);
  }
  if (!re || re.test('logic')) {
    const { ctx, page, errors } = await openDet(browser, site, { save: seedSave({ tp: 0 }), seed: 4242 });
    let logic;
    try { logic = await page.evaluate(code => window.__T.ev(code), LOGIC); } catch (e) { logic = { crash: String(e) }; }
    logic.errors = (await page.evaluate(() => window.__errors.slice())).concat(errors);
    // persistence: reload and compare save
    const before = await page.evaluate(() => window.__T.ev('JSON.stringify(save)'));
    await page.evaluate(() => window.__T.ev('persist()'));
    await page.reload({ waitUntil: 'load' });
    const after = await page.evaluate(() => window.__T.ev('JSON.stringify(save)'));
    logic.persistRoundtrip = before === after;
    results.logic = logic;
    console.log('logic', Object.keys(logic).length, 'persist', logic.persistRoundtrip, 'errors', logic.errors.length);
    await ctx.close();
  }
  writeJSON(`${outdir}/det${filter ? '_' + filter.replace(/\W+/g, '_') : ''}.json`, results);
  console.log('total', ((Date.now() - t0) / 1000).toFixed(1) + 's');
  await browser.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
