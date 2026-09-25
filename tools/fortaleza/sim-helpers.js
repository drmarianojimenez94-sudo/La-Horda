// Ayudas que se inyectan en la página para simular La Fortaleza sin dibujar (update() a mano).
// No es parte del juego. Lo usan tools/fortaleza/t_fortaleza.js y t_fortaleza_net.js.
module.exports = () => {
  // Ruta del recorrido (waypoints) y hasta dónde tiene que llegar el jugador en cada nivel.
  const ROUTE = [
    [0, 2100], [0, 1640], [0, 1510], [0, 1250], [0, 900], [0, 670], [0, 420], [0, 150], [0, -330],
    [0, -600], [0, -900], [0, -1250], [0, -1500], [0, -1700], [-790, -1760], [-790, -1945], [-790, -2150],
    [0, -2200], [0, -2400], [0, -2540], [0, -2700], [0, -2900], [0, -3100], [0, -3320], [0, -3470], [0, -3700], [0, -3900]
  ];
  const GOAL = {1:1, 2:1, 3:4, 4:4, 5:8, 6:11, 7:13, 8:17, 9:23, 10:26};
  window.__fs = {
    ROUTE, GOAL, wi: 0, log: [], stats: null, god: false, auto: true,
    start(champ, allies, lvl, opts) {
      opts = opts || {};
      for (const k of Object.keys(save.champions)) save.champions[k].unlocked = true;
      selectedClass = champ; currentArena = 'fortaleza'; lobbyAllies = allies.slice();
      startRun(lvl || 1);
      this.wi = 0; this.log = []; this.god = !!opts.god;
      if (lvl > 1) { this.wi = GOAL[lvl-1] || 0; const p = ROUTE[this.wi]; for (const h of heroes) { h.x = p[0] + (Math.random()-0.5)*60; h.y = p[1] + (Math.random()-0.5)*60; h._fs = null; } }
      if (this.god) this.godify();
      this.resetStats();
      return true;
    },
    godify() { for (const h of heroes) { h.maxHp = h.hp = 5e6; h.baseDmg *= 5; } runStats.dmgMult = (runStats.dmgMult||1)*1.5; },
    resetStats() {
      this.stats = { frames:0, heroOut:0, heroOutMax:0, enemyOut:0, nan:0, maxEnemies:0, maxProj:0, maxPart:0, maxStrikes:0, maxNets:0, maxVfxSpr:0,
        stuck:0, levels:[], deaths:0, trapsFired:0, trapHits:0, reconf:0, splits:0, maxAdds:0, knightPhases:[], dragon:[], gates:{}, errorsInUpdate:0,
        botsFar:0, botsFarMax:0, softlockAt:null, lastLevelAt:0 };
      this._lastLv = runLevel; this._enemyPos = new Map();
    },
    // piloto automático del jugador: pelea con lo que tiene cerca y avanza por la ruta
    autopilot(dt) {
      const h = player; if (!h.alive) { joyVec = {x:0, y:0}; basicHeld = false; return; }
      const goal = GOAL[runLevel] || 0;
      while (this.wi < goal) { const p = ROUTE[this.wi]; if (Math.hypot(h.x-p[0], h.y-p[1]) < 70) this.wi++; else break; }
      if (this.wi > goal) this.wi = goal;
      let tx, ty;
      const near = enemies.filter(e => e.alive && Math.hypot(e.x-h.x, e.y-h.y) < 380 && (e.flying || fortReachable(h, e)));
      const bm = botMove(h, dt);
      const p = ROUTE[this.wi];
      const atGoal = this.wi >= goal && Math.hypot(h.x-p[0], h.y-p[1]) < 120;
      if (bm.dodging || (near.length && (atGoal || near.length > 3))) { joyVec = {x:bm.mx, y:bm.my}; }
      else {
        let wp = {x:p[0], y:p[1]};
        if (!fortReachable(h, wp)) { const r = fortBotRegroup(h, wp); if (r) wp = r; }
        tx = wp.x - h.x; ty = wp.y - h.y; const l = Math.hypot(tx, ty);
        joyVec = l > 20 ? {x:tx/l, y:ty/l} : {x:0, y:0};
        if (near.length && l < 20) joyVec = {x:bm.mx, y:bm.my};
      }
      const t = bm.target || near[0];
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
      for (const h of heroes) {
        if (!Number.isFinite(h.x) || !Number.isFinite(h.y)) S.nan++;
        if (h.alive && !h.duelActive && !fortWalkable(h.x, h.y, -3)) S.heroOut++;
      }
      for (const e of enemies) {
        if (!e.alive) continue;
        if (!Number.isFinite(e.x) || !Number.isFinite(e.y)) S.nan++;
        if (!e.flying && e.rank !== 'jefe' && !fortWalkable(e.x, e.y, -3)) S.enemyOut++;
      }
      for (const p of projectiles) if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) S.nan++;
      S.maxEnemies = Math.max(S.maxEnemies, enemies.length); S.maxProj = Math.max(S.maxProj, projectiles.length);
      S.maxPart = Math.max(S.maxPart, particles.length); S.maxStrikes = Math.max(S.maxStrikes, bossStrikes.length);
      S.maxNets = Math.max(S.maxNets, (fortS.nets||[]).length);
      S.maxVfxSpr = Math.max(S.maxVfxSpr, vfxSprites.filter(s=>s.on).length);
      S.maxAdds = Math.max(S.maxAdds, enemies.filter(e=>e.alive && e.fortAdd).length);
      let far = 0; for (const h of allies) { if (h.alive && !h.isRemote && Math.hypot(h.x-player.x, h.y-player.y) > 1200) far++; }
      if (far) S.botsFar++; S.botsFarMax = Math.max(S.botsFarMax, far);
      for (const G of FORT_MAP.gates) { const o = fortS.gates[G.id].open >= 1 ? 1 : 0; if (S.gates[G.id] !== o) S.gates[G.id] = o; }
      const K = fortS.knight; if (K && K.phase && S.knightPhases[S.knightPhases.length-1] !== K.state+':'+K.phase) S.knightPhases.push(K.state+':'+K.phase);
      const D = fortS.dragon; if (D && S.dragon[S.dragon.length-1] !== D.state) S.dragon.push(D.state);
      let busy = 0; for (const s of fortS.traps) if (s.st === 1) busy++; if (busy > (this._busy||0)) S.trapsFired += busy - (this._busy||0); this._busy = busy;
      if (fortS.rot.hub.phase === 'warn' && this._hubPh !== 'warn') S.reconf++; this._hubPh = fortS.rot.hub.phase;
      if (fortS.rot.core.phase === 'warn' && this._corePh !== 'warn') S.reconf++; this._corePh = fortS.rot.core.phase;
      if (runLevel !== this._lastLv) { S.levels.push({lv: runLevel, t: Math.round(runElapsedMs/1000)}); this._lastLv = runLevel; S.lastLevelAt = runElapsedMs; }
      // enemigos trabados: no se movieron en 12 s teniendo un héroe alcanzable cerca
      if (S.frames % 30 === 0) {
        for (const e of enemies) {
          if (!e.alive || e.rank === 'jefe' || e.fortDormant) continue;
          const prev = this._enemyPos.get(e);
          if (!prev) { this._enemyPos.set(e, {x:e.x, y:e.y, t:runElapsedMs}); continue; }
          if (Math.hypot(prev.x-e.x, prev.y-e.y) > 40) { prev.x = e.x; prev.y = e.y; prev.t = runElapsedMs; continue; }
          if (runElapsedMs - prev.t > 12000) {
            const tgt = fortEnemyTarget(e);
            if (tgt && Math.hypot(tgt.x-e.x, tgt.y-e.y) > 200 && (e.flying || fortReachable(e, tgt))) { S.stuck++; (S.stuckList || (S.stuckList = [])).push({type:e.type, x:e.x|0, y:e.y|0, tx:tgt.x|0, ty:tgt.y|0}); }
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
        if (this.god) for (const h of heroes) { if (h.alive) h.hp = Math.max(h.hp, h.maxHp*0.5); }
        this.sample();
        if (maxLevel && runLevel > maxLevel) break;
      }
      return this.summary();
    },
    summary() {
      return { state, lv: runLevel, t: Math.round(runElapsedMs/1000), sector: fortS && fortS.sector, wi: this.wi,
        heroes: heroes.map(h => ({k:h.classKey, x:h.x|0, y:h.y|0, alive:h.alive, hp:Math.round(h.hp)})),
        enemies: enemies.length, boss: boss ? {type:boss.type, hp:Math.round(boss.hp), max:boss.maxHp, alive:boss.alive} : null,
        knight: fortS && fortS.knight, dragon: fortS && fortS.dragon, stats: this.stats, lastErr: this.lastErr || null };
    }
  };
};
