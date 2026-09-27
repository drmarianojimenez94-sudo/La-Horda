// Playtest campaign: full runs (level 1 -> victory/defeat) driven by the autopilot "competent player".
// usage: node campaign.js <jobs.json> <out.jsonl> [port]   (serve the repo first: python3 -m http.server <port>)
//   job: {cls, arena, lvl, tag, progression?:[{cls,arena}...]}  (lvl<=0: keep save as is)
const { chromium } = (()=>{ try { return require('playwright'); } catch (e) { return require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright'); } })();
const fs = require('fs'); const path = require('path'); const sleep = ms => new Promise(r => setTimeout(r, ms));
const [jobsFile, outFile, port] = [process.argv[2], process.argv[3], process.argv[4] || '8763'];
const jobs = JSON.parse(fs.readFileSync(jobsFile, 'utf8'));
const HOOKS = () => {
  if (window.__CP) return; const CP = window.__CP = {};
  CP.reset = () => { CP.dmgSrc = {}; CP.items = []; CP.buffs = []; CP.levelAt = {}; CP.bossAt = null; CP.bossDeadAt = null; CP.idleMs = 0; CP.peakEnemies = 0; CP.minHpPct = 100; CP.revives = 0; CP.allyDowns = 0; CP.bigHits = []; };
  CP.reset();
  const dh = window.damageHero;
  window.damageHero = function (h, amount, src) {
    const hp0 = h.hp, a0 = h.alive; dh(h, amount, src);
    if (h === player) { let k = src && src.type ? src.type : (src && src.from && src.from.type ? src.from.type + '(proj)' : null);
      if (!k) { const fr = (new Error().stack || '').split('\n').slice(2, 5).map(x => (x.trim().split(' ')[1] || '?')).join('<'); k = 'fn:' + fr; }
      const lost = Math.max(0, Math.min(hp0, hp0 - h.hp)); CP.dmgSrc[k] = (CP.dmgSrc[k] || 0) + lost;
      if (amount > h.maxHp * 0.6 && CP.bigHits.length < 5) CP.bigHits.push(k + (src && src.kind ? '[' + src.kind + ']' : '') + ' ' + Math.round(amount) + '/' + Math.round(h.maxHp) + ' L' + runLevel);
      if (a0 && !h.alive) CP.killer = k + ' (hit ' + Math.round(amount) + ', hp antes ' + Math.round(hp0) + '/' + Math.round(h.maxHp) + ', nivel ' + runLevel + ')'; }
    else if (a0 && !h.alive) CP.allyDowns++;
  };
  const ai = window.addItemToInventory;
  window.addItemToInventory = function (k, item) { const r = ai(k, item); if (r) CP.items.push((item.rarity || '?') + ':' + (item.type || item.slot || '?')); return r; };
  __AP.pickBuff = function () { const c = document.querySelector('#buff-cards .buff-card'); if (c) { const n = c.querySelector('.buff-name'); CP.buffs.push(n ? n.textContent : '?'); c.click(); return true; } return false; };
};
async function runOne(page, job) {
  return page.evaluate(([job]) => {
    if (job.lvl > 0) for (const k in save.champions) { save.champions[k].level = job.lvl; const al = Math.min(10, Math.floor(job.lvl / 3)); save.champions[k].skillMastery.forEach(m => m.alloc = al); save.champions[k].ultMastery.alloc = al; }
    if (job.diff) Object.assign(DIFF, job.diff);
    if (job.penalty !== undefined) ARENA_FAIL_PENALTY_PCT = job.penalty;
    if (job.mods) Object.assign(ARENA_MODS[job.arena], job.mods);
    if (job.gear) { for (const k in save.champions) if (typeof autoEquipBest === 'function') autoEquipBest(k); }
    // un jugador competente gasta sus puntos de talento (el HUD le sugiere cuál subir)
    if (job.lvl <= 0 && typeof suggestedSkillInvest === 'function') for (let g = 0; g < 60; g++) { const i = suggestedSkillInvest(job.cls); if (i === null || i === undefined || !investTalentPoint(job.cls, i)) break; }
    __CP.reset();
    if (job.arena === 'auto') job.arena = ARENA_ORDER.find(a => !(save.arenasCleared||{})[a]) || 'infernal';
    const lvl0 = save.champions[job.cls].level, xp0 = save.champions[job.cls].xp, gold0 = save.gold;
    __AP.start(job.cls, job.arena, 1);
    let t = 0, lastLv = 0;
    while (t < 22 * 60000) {
      const o = __AP.sim(1000); t += 1000;
      if (runLevel !== lastLv) { __CP.levelAt[runLevel] = Math.round(t / 1000); lastLv = runLevel; }
      const alive = enemies.filter(e => e.alive).length; if (alive === 0 && state === 'playing') __CP.idleMs += 1000;
      __CP.peakEnemies = Math.max(__CP.peakEnemies, alive);
      if (player.alive) __CP.minHpPct = Math.min(__CP.minHpPct, Math.round(100 * player.hp / player.maxHp));
      if (boss && __CP.bossAt === null && runLevel === LEVEL_COUNT) __CP.bossAt = Math.round(t / 1000);
      if (boss && !boss.alive && __CP.bossDeadAt === null && __CP.bossAt !== null) __CP.bossDeadAt = Math.round(t / 1000);
      if (state !== 'playing' && state !== 'buff') break;
    }
    const st = player.stats || {};
    const allyDmg = allies.reduce((s, a) => s + ((a.stats && a.stats.dmgDealt) || 0), 0);
    const top = Object.entries(__CP.dmgSrc).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => k + ' ' + Math.round(v));
    const res = { tag: job.tag, cls: job.cls, arena: job.arena, lvl: lvl0, result: state, reached: runLevel, secs: Math.round(t / 1000), kills,
      bossSecs: __CP.bossAt !== null ? ((__CP.bossDeadAt || Math.round(t / 1000)) - __CP.bossAt) : null, bossType: boss ? boss.type : null, bossHpLeftPct: boss && boss.alive ? Math.round(100 * boss.hp / boss.maxHp) : 0,
      dmgShare: Math.round(100 * (st.dmgDealt || 0) / Math.max(1, (st.dmgDealt || 0) + allyDmg)), casts: st.skillCasts || 0, dmgTaken: Math.round(st.dmgTaken || 0), healDone: Math.round(st.healDone || 0),
      minHpPct: __CP.minHpPct, idleSecs: Math.round(__CP.idleMs / 1000), peakEnemies: __CP.peakEnemies, allyDowns: __CP.allyDowns,
      items: __CP.items, bigHits: __CP.bigHits, killer: __CP.killer || null, buffs: __CP.buffs, levelAt: __CP.levelAt, top,
      xpGain: (save.champions[job.cls].level - lvl0) + ' lv / ' + Math.round(save.champions[job.cls].xp - xp0) + ' xp', goldGain: save.gold - gold0, apErr: __AP.err || null,
      exit: __AP.exit ? { seenS: Math.round(__AP.exit.seenAt / 1000), reachedS: __AP.exit.reachedAt === null ? null : Math.round(__AP.exit.reachedAt / 1000), holds: __AP.exit.holds } : null,
      after: { lv: save.champions[job.cls].level, totXp: totalXpForChamp(job.cls), gold: save.gold, cleared: Object.keys(save.arenasCleared || {}).length } };
    // partida que no terminó (tope de tiempo): foto del estado para diagnosticar dónde se trabó
    if (state === 'playing') {
      const R = v => Math.round(v);
      const ent = e => e ? { type: e.type, alive: e.alive, hp: R(e.hp), max: R(e.maxHp), x: R(e.x), y: R(e.y), dmgTakenMult: e.dmgTakenMult, encMult: e._encMult, stun: R(e.stunTimer || 0), rank: e.rank } : null;
      const byType = {}; for (const e of enemies) if (e.alive) byType[e.type] = (byType[e.type] || 0) + 1;
      const st = { levelTimer: R(levelTimer), levelDuration: levelDuration > 1e8 ? 'inf' : R(levelDuration), levelClearing, runEnding, bossActive,
        hold: (typeof arenaHas === 'function' && arenaHas('holdLevel')) ? !!arenaHook('holdLevel') : null,
        boss: ent(boss), champ: ent(activeChampion), byType,
        player: { x: R(player.x), y: R(player.y), walkable: (typeof arenaHas === 'function' && arenaHas('inside')) ? !!arenaHook('inside', player.x, player.y, 0) : null, alive: player.alive, hp: R(player.hp), joy: joyVec && { x: +joyVec.x.toFixed(2), y: +joyVec.y.toFixed(2) }, ctxHold: player._ctxHold },
        allies: allies.map(a => ({ k: a.classKey, alive: a.alive, x: R(a.x), y: R(a.y) })) };
      try { const ts = ctxTargets(); if (ts) st.ctx = ts.map(t => ({ id: t.id, kind: t.kind, x: R(t.x), y: R(t.y), r: t.r, prog: R(t.prog || 0), dur: t.dur, done: !!t.done })); } catch (e) {}
      if (typeof mnS !== 'undefined' && mnS && job.arena === 'minas') st.minas = { sec: mnS.sec, portal: mnS.portal && { st: mnS.portal.st, t: R(mnS.portal.t || 0) }, cb: mnS.cb && { st: mnS.cb.st } };
      if (typeof cmS !== 'undefined' && cmS && job.arena === 'ciudad') st.ciudad = { sub: cmS.sub && { st: cmS.sub.st, t: R(cmS.sub.t) }, pr: cmS.pr && { st: cmS.pr.st, act: cmS.pr.act, t: R(cmS.pr.t) }, saved: cmS.saved, lost: cmS.lost };
      res.stall = st;
    }
    // leave the run cleanly so the next job starts from a menu state
    try { if (typeof clearRunTimers === 'function') clearRunTimers(); } catch (e) {}
    state = 'menu';
    return res;
  }, [job]);
}
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  let page = null, errors = [];
  const fresh = async (seedSave) => {
    if (page) await page.context().close();
    const ctx = await browser.newContext({ viewport: { width: 844, height: 390 } });
    await ctx.addInitScript(() => { window.__campaignMode = true; }); // campaña real (sin el modo prueba que libera todo)
    if (seedSave === 'empty') await ctx.addInitScript(() => { try { if (!sessionStorage.getItem('__s')) { localStorage.clear(); sessionStorage.setItem('__s', '1'); } } catch (e) {} });
    page = await ctx.newPage(); errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'load', timeout: 180000 });
    for (let i = 0; i < 300; i++) { const ok = await page.evaluate(() => { const b = document.getElementById('title-continue-btn'); return b && !b.disabled; }); if (ok) break; await sleep(100); }
    await page.addScriptTag({ path: path.join(__dirname, 'autopilot.js') });
    await page.evaluate(require('../fortaleza/sim-helpers.js'));
    await page.evaluate(HOOKS);
  };
  for (const job of jobs) {
    if (!job.keep) await fresh(job.empty ? 'empty' : null);
    const t0 = Date.now();
    let r; try { r = await runOne(page, job); } catch (e) { r = { tag: job.tag, cls: job.cls, arena: job.arena, crash: String(e).slice(0, 300) }; }
    r.errors = errors.slice(0, 3); r.wall = Math.round((Date.now() - t0) / 1000);
    fs.appendFileSync(outFile, JSON.stringify(r) + '\n');
    console.log(`${r.tag} ${r.cls}/${r.arena} lv${r.lvl} -> ${r.result} L${r.reached} ${r.secs}s boss=${r.bossSecs} err=${r.errors.length} wall=${r.wall}s`);
  }
  await browser.close();
})();
