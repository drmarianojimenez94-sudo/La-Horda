// Ayudas que se inyectan en la página para simular El Reino Micelial sin dibujar (update() a mano).
// No es parte del juego. Lo usan tools/micelial/t_micelial.js, run_full.js y t_micelial_net.js.
module.exports = () => {
  window.__ms = {
    log: [], stats: null, god: false, auto: true,
    start(champ, allies, lvl, opts) {
      opts = opts || {};
      for (const k of Object.keys(save.champions)) save.champions[k].unlocked = true;
      selectedClass = champ; currentArena = 'micelial'; lobbyAllies = allies.slice();
      startRun(lvl || 1);
      this.log = []; this.god = !!opts.god;
      if (this.god) this.godify();
      this.resetStats();
      return true;
    },
    godify() { for (const h of heroes) { h.maxHp = h.hp = 5e6; h.baseDmg *= 5; h._gd = 1; } runStats.dmgMult = (runStats.dmgMult||1)*1.5; },
    resetStats() {
      this.stats = { frames:0, heroOut:0, heroInPod:0, enemyOut:0, nan:0, maxEnemies:0, maxProj:0, maxPart:0, maxStrikes:0, maxVfxSpr:0, maxClouds:0, maxHal:0, maxRoots:0, maxNuc:0,
        stuck:0, levels:[], stages:[], nucSpawned:0, nucKilled:0, nucMaxStage:0, micelio:[], mother:[], phases:[], links:0, inter:0, errorsInUpdate:0,
        botsFar:0, botsFarMax:0, lastLevelAt:0, heroDowns:0, outsideSafe:0, maxNodesAlive:0, nodeStates:{} };
      this._lastLv = runLevel; this._enemyPos = new Map(); this._nucIds = new Set(); this._alive = heroes.map(h=>h.alive);
    },
    // piloto automático: pelea como un bot (prioridades del Reino incluidas) y no se queda quieto
    autopilot(dt) {
      const h = player; if (!h.alive) { joyVec = {x:0, y:0}; basicHeld = false; return; }
      const bm = botMove(h, dt);
      let mx = bm.mx, my = bm.my;
      if (!bm.dodging && Math.hypot(mx, my) < 0.1) {
        const t = bm.target || nearestEnemyTo(h, 900);
        if (t) { const dx = t.x-h.x, dy = t.y-h.y, d = Math.hypot(dx,dy)||1; if (d > 70) { mx = dx/d; my = dy/d; } }
        else { const dx = 0-h.x, dy = 300-h.y, d = Math.hypot(dx,dy)||1; if (d > 120) { mx = dx/d; my = dy/d; } }
      }
      joyVec = {x:mx, y:my};
      const t = bm.target || nearestEnemyTo(h, 400);
      if (t) { const dx = t.x-h.x, dy = t.y-h.y, d = Math.hypot(dx,dy)||1; facing = {x:dx/d, y:dy/d}; h.fx = facing.x; h.fy = facing.y; }
      basicHeld = true;
      if (Math.random() < dt/900) { const i = (Math.random()*3)|0; try { if (h.cds[i] <= 0) useSkill(i, null); } catch (e) {} }
      if (Math.random() < dt/3000) { try { if (h.ultCd <= 0) useUltimate(); } catch (e) {} }
    },
    handleMenus() {
      if (state === 'buff') { const c = document.querySelector('#buff-cards > *'); if (c) c.click(); return true; }
      return false;
    },
    sample() {
      const S = this.stats;
      S.frames++;
      heroes.forEach((h, i) => {
        if (!Number.isFinite(h.x) || !Number.isFinite(h.y)) S.nan++;
        if (h.alive && !h.duelActive && micEllNorm(h.x, h.y) > 1.0) S.heroOut++;
        if (h.alive && Math.hypot(h.x - MIC_MAP.pod.x, h.y - MIC_MAP.pod.y) < MIC_MAP.pod.r - 4) S.heroInPod++;
        if (this._alive[i] && !h.alive) S.heroDowns++;
        this._alive[i] = h.alive;
      });
      for (const e of enemies) {
        if (!e.alive) continue;
        if (!Number.isFinite(e.x) || !Number.isFinite(e.y)) S.nan++;
        if (e.rank !== 'jefe' && micEllNorm(e.x, e.y) > 1.01) S.enemyOut++;
        if (e.type === 'nucleo_micelial') { if (!this._nucIds.has(e)) { this._nucIds.add(e); S.nucSpawned++; } S.nucMaxStage = Math.max(S.nucMaxStage, e.nuc ? e.nuc.st : 0); }
      }
      for (const n of this._nucIds) { if (!n.alive && !n._counted) { n._counted = 1; S.nucKilled++; } }
      for (const p of projectiles) if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) S.nan++;
      S.maxEnemies = Math.max(S.maxEnemies, enemies.length); S.maxProj = Math.max(S.maxProj, projectiles.length);
      S.maxPart = Math.max(S.maxPart, particles.length); S.maxStrikes = Math.max(S.maxStrikes, bossStrikes.length);
      S.maxVfxSpr = Math.max(S.maxVfxSpr, vfxSprites.filter(s=>s.on).length);
      S.maxClouds = Math.max(S.maxClouds, micS.clouds.length); S.maxHal = Math.max(S.maxHal, micS.hal.length); S.maxRoots = Math.max(S.maxRoots, micS.roots.length);
      S.maxNuc = Math.max(S.maxNuc, micNucleos().length);
      if (S.frames % 60 === 0) { let a = 0; for (const c of micS.nodes) { const v = c.charCodeAt(0)-48; if (v <= FN.SPORE) a++; S.nodeStates[FN_NAMES[v]] = 1; } S.maxNodesAlive = Math.max(S.maxNodesAlive, a); }
      let far = 0; for (const h of allies) { if (h.alive && !h.isRemote && Math.hypot(h.x-player.x, h.y-player.y) > 1200) far++; }
      if (far) S.botsFar++; S.botsFarMax = Math.max(S.botsFarMax, far);
      if (S.stages[S.stages.length-1] !== micS.stage) S.stages.push(micS.stage);
      if (S.micelio[S.micelio.length-1] !== micS.mi.st) S.micelio.push(micS.mi.st);
      if (S.mother[S.mother.length-1] !== micS.mo.st) S.mother.push(micS.mo.st);
      const ph = micS.mo.st === 'fight' ? micS.mo.ph : 0; if (ph && S.phases[S.phases.length-1] !== ph) S.phases.push(ph);
      if (micS.inter.n !== this._inter) { this._inter = micS.inter.n; S.inter = micS.inter.n; }
      if (enemies.some(e => e.alive && e.type === 'raiz_absorcion') && !this._lk) { this._lk = 1; S.links++; } else if (!enemies.some(e => e.alive && e.type === 'raiz_absorcion')) this._lk = 0;
      if (micS.mo.st === 'fight' && micS.mo.ph === 3) for (const h of heroes) if (h.alive && micSafeNorm(h.x, h.y) > micSafeK()) S.outsideSafe++;
      if (runLevel !== this._lastLv) { S.levels.push({lv: runLevel, t: Math.round(runElapsedMs/1000)}); this._lastLv = runLevel; S.lastLevelAt = runElapsedMs; }
      // enemigos trabados: no se movieron en 12 s teniendo un héroe lejos
      if (S.frames % 30 === 0) {
        for (const e of enemies) {
          if (!e.alive || e.rank === 'jefe' || e.structure || e.micBuild || e.ranged) continue;
          const prev = this._enemyPos.get(e);
          if (!prev) { this._enemyPos.set(e, {x:e.x, y:e.y, t:runElapsedMs}); continue; }
          if (Math.hypot(prev.x-e.x, prev.y-e.y) > 40) { prev.x = e.x; prev.y = e.y; prev.t = runElapsedMs; continue; }
          if (runElapsedMs - prev.t > 12000) {
            const tgt = nearestHeroTo(e.x, e.y);
            if (tgt && Math.hypot(tgt.x-e.x, tgt.y-e.y) > 250) { S.stuck++; (S.stuckList || (S.stuckList = [])).push({type:e.type, x:e.x|0, y:e.y|0, tx:tgt.x|0, ty:tgt.y|0}); }
            prev.t = runElapsedMs;
          }
        }
      }
    },
    // avanza `ms` de juego a cuadros de 16 ms (sin dibujar)
    run(ms, maxLevel) {
      const t0 = runElapsedMs;
      let guard = 0;
      while (runElapsedMs - t0 < ms && guard++ < ms/8) {
        if (this.handleMenus()) continue;
        if (state !== 'playing') break;
        if (this.auto) this.autopilot(16);
        try { update(16); } catch (err) { this.stats.errorsInUpdate++; this.lastErr = String(err && err.stack || err); }
        if (this.god) for (const h of heroes) { if (h.maxHp < 1e6) { h.maxHp = 5e6; if (!h._gd) { h._gd = 1; h.baseDmg *= 5; } } if (h.alive) h.hp = Math.max(h.hp, h.maxHp*0.5); }
        this.sample();
        if (maxLevel && runLevel > maxLevel) break;
      }
      return this.summary();
    },
    summary() {
      return { state, lv: runLevel, t: Math.round(runElapsedMs/1000), stage: micS && micS.stage,
        heroes: heroes.map(h => ({k:h.classKey, x:h.x|0, y:h.y|0, alive:h.alive, hp:Math.round(h.hp)})),
        enemies: enemies.length, boss: boss ? {type:boss.type, hp:Math.round(boss.hp), max:boss.maxHp, alive:boss.alive} : null,
        mi: micS && micS.mi.st, mo: micS && {st:micS.mo.st, ph:micS.mo.ph, inf:+(micS.mo.inf||0).toFixed(2), t:Math.round(micS.mo.t)}, nuc: micS ? micNucleos().map(e=>e.nuc&&e.nuc.st).join('') : '',
        stats: this.stats, lastErr: this.lastErr || null };
    }
  };
};
