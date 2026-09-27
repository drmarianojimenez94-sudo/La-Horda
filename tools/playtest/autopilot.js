// Playtest autopilot: a "competent human-ish" player that moves, dodges telegraphs, kites,
// holds basic attack, uses skills/ult and revives. Injected as a classic script so it shares
// the game's global lexical scope (joyVec, player, enemies, ...).
(function(){
  const AP = window.__AP = { on:false, log:[], stats:null, skill:0.85, reaction:260, clock:0 };
  let lastDecision = 0, dodgeUntil = 0, dodgeVec = null, reviveHold = 0, skillTimer = 0;
  function norm(x,y){ const l=Math.hypot(x,y)||1; return {x:x/l,y:y/l}; }
  function insideTele(s, px, py, pad){
    // vfxTeles shapes: 0 circle, 1 cone (dx,dy,arc,r), 2 line (dx,dy,len,r). Telegraphs are
    // drawn squashed but damage uses real distances; approximate with real geometry.
    const dx = px - s.x, dy = py - s.y, d = Math.hypot(dx,dy);
    if(s.shape===0) return d < s.r + pad;
    if(s.shape===1){ if(d > s.r + pad) return false; const a = Math.atan2(dy,dx) - Math.atan2(s.dy/ (s.dy===0?1:1), s.dx); let da = Math.abs(Math.atan2(Math.sin(a),Math.cos(a))); return da < s.arc + 0.25; }
    if(s.shape===2){ const L = s.len/(s.k||1); const ux=s.dx, uy=s.dy; const t = dx*ux+dy*uy; if(t < -pad || t > (s.len||0)+pad) return false; const perp = Math.abs(-dx*uy+dy*ux); return perp < s.r + pad; }
    return false;
  }
  function dangerAt(px, py){
    let v = {x:0,y:0}, hit = false;
    const safes = [];
    if(typeof vfxTeles!=="undefined") for(const s of vfxTeles){
      if(!s.on) continue;
      if(s.shape===4){ safes.push(s); continue; }
      if(s.shape===3){ // donut: danger between r2 and r
        const d = Math.hypot(px-s.x, py-s.y);
        if(d > s.r2-10 && d < s.r+26){ hit = true; const n = norm(px-s.x, py-s.y); const k = (d - s.r2) < (s.r - d) ? -1 : 1; v.x += n.x*k; v.y += n.y*k; }
        continue;
      }
      if(insideTele(s, px, py, 26)){
        hit = true;
        if(s.shape===2){ // line: sidestep perpendicular
          const dx = px-s.x, dy = py-s.y, side = (-dx*s.dy + dy*s.dx) >= 0 ? 1 : -1;
          v.x += -s.dy*side; v.y += s.dx*side;
        } else { const n = norm(px-s.x, py-s.y); v.x += n.x; v.y += n.y; }
      }
    }
    if(safes.length){
      let best = null, bd = 1e9; for(const z of safes){ const d = Math.hypot(z.x-px, z.y-py); if(d < bd){ bd = d; best = z; } }
      if(bd > best.r*0.6){ hit = true; const n = norm(best.x-px, best.y-py); v.x = n.x*3; v.y = n.y*3; return v; }
    }
    if(typeof bossStrikes!=="undefined") for(const s of bossStrikes){
      if(Math.hypot(px-s.x, py-s.y) < s.r+28){ hit = true; const n = norm(px-s.x, py-s.y); v.x += n.x; v.y += n.y; }
    }
    return hit ? v : null;
  }
  // Acción contextual reservada a humanos (los bots nunca la toman: botWorth 0 / maxBots 0). Se usa
  // la misma API que un jugador: caminar con joyVec (siguiendo el campo de navegación de la acción
  // contextual, ctxNavDir, si hay muros) y MANTENER el botón contextual (#btn-revive -> ctxBtnStart
  // -> ctxSetHold). El progreso y el final (mnPortalEnter -> completeArenaByExit) los decide el juego.
  const HUMAN_EXIT_KINDS = ["mn_portal"];
  let exitHoldMs = 0;
  function humanExitTarget(){
    if(typeof ctxTargets!=="function") return null;
    const ts = ctxTargets(); if(!ts) return null;
    for(const t of ts){ if(!t.done && HUMAN_EXIT_KINDS.includes(t.kind)) return t; }
    return null;
  }
  function humanExit(dt){
    const t = humanExitTarget();
    if(!t){ if(AP.exit && AP.exit.holding){ releaseCtx(); AP.exit.holding = false; } return false; }
    const ex = AP.exit || (AP.exit = {seenAt:AP.clock, holds:0, holding:false, reachedAt:null});
    const d = Math.hypot(t.x-player.x, t.y-player.y);
    basicHeld = false;
    if(d > t.r*0.55){
      if(ex.holding){ releaseCtx(); ex.holding = false; }
      let dir = (d > 90 && typeof ctxNavDir==="function") ? ctxNavDir(player, t) : null;
      if(!dir) dir = norm(t.x-player.x, t.y-player.y);
      // un peligro telegrafiado encima pesa más que llegar (un humano esquiva y sigue)
      const dz = dangerAt(player.x, player.y);
      let mx = dir.x, my = dir.y; if(dz){ const n = norm(dz.x, dz.y); mx += n.x*2; my += n.y*2; }
      const l = Math.hypot(mx, my)||1; joyVec = {x:mx/l, y:my/l};
      return true;
    }
    joyVec = {x:0, y:0};
    if(ex.reachedAt===null) ex.reachedAt = AP.clock;
    if(player._ctxHold !== t.id){
      // el juego suelta la acción si algo la corta (aturdido, fuera de rango): se vuelve a apretar
      const btn = document.getElementById("btn-revive");
      if(btn){ btn.dispatchEvent(new PointerEvent("pointerup", {bubbles:true})); if(typeof updateReviveBtn==="function") updateReviveBtn(); btn.dispatchEvent(new PointerEvent("pointerdown", {bubbles:true})); }
      if(player._ctxHold !== t.id && typeof ctxCanUse==="function" && ctxCanUse(player, t) && typeof ctxSetHold==="function") ctxSetHold(t);
      if(player._ctxHold === t.id) ex.holds++;
    }
    ex.holding = player._ctxHold === t.id;
    exitHoldMs = ex.holding ? exitHoldMs + dt : 0;
    return true;
  }
  function releaseCtx(){
    const btn = document.getElementById("btn-revive");
    if(btn) btn.dispatchEvent(new PointerEvent("pointerup", {bubbles:true}));
  }
  // CAMINO alrededor de muros/edificios (arenas con geometría: Ciudad, Minas, Laberinto, Fortaleza...).
  // Antes el piloto iba en línea recta hacia el enemigo más cercano y se quedaba empujando contra una
  // casa (se vio en la Ciudad: jugador quieto 10+ minutos detrás de un edificio con la Dama del Telón
  // del otro lado). Un humano rodea: con la grilla de navegación del juego (AID_NAV, la misma de los
  // enemigos) se arma un campo de distancias desde el objetivo y se sigue el gradiente (aidNavDir).
  const _nav = {D:null, Q:null, cell:-1, t:-1e9};
  function pathDir(tx, ty){
    if(typeof AID_NAV==="undefined" || !AID_NAV.on || !AID_NAV.blocked || typeof aidLineClear!=="function") return null;
    if(aidLineClear(player.x, player.y, tx, ty)) return null;
    const N = AID_NAV, n = N.W*N.H, c0 = aidNavCell(tx, ty); if(c0 < 0) return null;
    if(!_nav.D || _nav.D.length!==n){ _nav.D = new Uint16Array(n); _nav.Q = new Int32Array(n); _nav.cell = -1; }
    if(c0!==_nav.cell || AP.clock - _nav.t > 700){
      const D = _nav.D, Q = _nav.Q; D.fill(65535); let qh = 0, qt = 0; D[c0] = 0; Q[qt++] = c0;
      while(qh < qt){ const c = Q[qh++], d = D[c]+1, i = c % N.W, j = (c-i)/N.W;
        if(i>0 && !N.blocked[c-1] && D[c-1]===65535){ D[c-1] = d; Q[qt++] = c-1; }
        if(i<N.W-1 && !N.blocked[c+1] && D[c+1]===65535){ D[c+1] = d; Q[qt++] = c+1; }
        if(j>0 && !N.blocked[c-N.W] && D[c-N.W]===65535){ D[c-N.W] = d; Q[qt++] = c-N.W; }
        if(j<N.H-1 && !N.blocked[c+N.W] && D[c+N.W]===65535){ D[c+N.W] = d; Q[qt++] = c+N.W; } }
      _nav.cell = c0; _nav.t = AP.clock;
    }
    const pc = aidNavCell(player.x, player.y); if(pc < 0 || _nav.D[pc]===65535 && !N.blocked[pc]) return null; // inalcanzable: derecho
    const d = aidNavDir(player, _nav.D);
    return d ? {x:d.x, y:d.y} : null;
  }
  const towards = (tx, ty) => pathDir(tx, ty) || norm(tx-player.x, ty-player.y);
  function tick(dt){
    if(!AP.on || state!=="playing" || !player || !player.alive) return;
    AP.clock += dt; const now = AP.clock;
    basicHeld = true;
    // --- movement decision (with human reaction delay) ---
    if(now - lastDecision > 90){
      lastDecision = now;
      let mx = 0, my = 0;
      const dz = dangerAt(player.x, player.y);
      if(dz && Math.random() < AP.skill){ if(now > dodgeUntil){ dodgeUntil = now + AP.reaction; } }
      if(dz && now >= dodgeUntil - AP.reaction + AP.reaction*0.6){ const n = norm(dz.x, dz.y); mx += n.x*3; my += n.y*3; }
      // threats
      let tx=0, ty=0, close=0, nearest=null, nd=1e9;
      for(const e of enemies){ if(!e.alive) continue; const d = Math.hypot(e.x-player.x, e.y-player.y);
        if(d < nd){ nd=d; nearest=e; }
        if(d < 230){ close++; const w = (e.rank==="jefe"||e.rank==="subjefe"?3:1)/Math.max(30,d); tx += (player.x-e.x)*w; ty += (player.y-e.y)*w; } }
      const ranged = !!player.cls.ranged;
      const hpPct = player.hp/player.maxHp;
      if(hpPct < 0.3 && typeof emergUse === "function") emergUse(player); // curación de emergencia (1 por nivel)
      // potion seeking when hurt
      let pot = null, pd = 1e9;
      if(hpPct < 0.6 || player.energy < player.maxEnergy*0.25) for(const p of potions){ const d = Math.hypot(p.x-player.x,p.y-player.y); if(d<pd && d<500){ pd=d; pot=p; } }
      // downed ally to revive
      let down = null; for(const a of allies){ if(!a.alive){ const d=Math.hypot(a.x-player.x,a.y-player.y); if(d<700 && close<6){ down=a; } } }
      if(down){ const n = towards(down.x, down.y); const d = Math.hypot(down.x-player.x, down.y-player.y); if(d > REVIVE_RANGE*0.6){ mx += n.x*1.4; my += n.y*1.4; } }
      else if(pot){ const n = towards(pot.x, pot.y); mx += n.x*1.3; my += n.y*1.3; }
      if(hpPct < 0.35 || close > 7){ const n = norm(tx,ty); mx += n.x*1.8; my += n.y*1.8; }
      else if(nearest){
        const want = ranged ? 210 : 55;
        const n = norm(nearest.x-player.x, nearest.y-player.y);
        if(nd > want+30){ const w = towards(nearest.x, nearest.y); mx += w.x; my += w.y; } else if(nd < want-40){ mx -= n.x*1.1; my -= n.y*1.1; }
        else { mx += -n.y*0.5; my += n.x*0.5; } // strafe
      }
      // stay away from the arena edge
      // (el coliseo es un octágono alrededor del origen; las arenas con mapa propio -Ciudad, Minas,
      // Fortaleza, Micelial- tienen sus propios bordes y el recorte del juego ya los respeta: ahí este
      // tirón hacia el centro alejaba al jugador de jefes y subjefes pegados a un lado del mapa)
      const ownMap = typeof arenaHas==="function" && arenaHas("inside") && currentArena!=="abismo";
      const r = Math.hypot(player.x, player.y); if(!ownMap && r > ARENA_RADIUS*0.8){ mx -= player.x/r*1.5; my -= player.y/r*1.5; }
      const l = Math.hypot(mx,my);
      AP._mv = l > 0.1 ? {x:mx/l, y:my/l} : {x:0,y:0};
    }
    joyVec = AP._mv || {x:0,y:0};
    // La Fortaleza se recorre por sectores: el piloto de tools/fortaleza/sim-helpers.js sabe la ruta.
    if(currentArena==="fortaleza" && window.__fs) window.__fs.autopilot(dt);
    // Salidas que SOLO puede tomar un humano (p.ej. el Portal Infernal de las Minas: "ATRAVESAR EL
    // UMBRAL", CTX_KINDS.mn_portal, maxBots:0): ir hasta el objetivo y mantener la acción contextual.
    if(humanExit(dt)) return;
    // revive
    const nd = (typeof nearestDownedAlly==="function") ? nearestDownedAlly() : null;
    if(nd){ reviveHold += dt; if(reviveHold > 1300){ tryReviveAlly(nd); reviveHold = 0; } } else reviveHold = 0;
    // skills
    skillTimer -= dt;
    if(skillTimer <= 0){
      skillTimer = 250 + Math.random()*300;
      const near = enemies.filter(e=>e.alive && Math.hypot(e.x-player.x,e.y-player.y) < 330);
      if(near.length){
        // face the densest/nearest enemy so directional skills go somewhere useful
        const t = near.reduce((a,b)=> (Math.hypot(a.x-player.x,a.y-player.y) < Math.hypot(b.x-player.x,b.y-player.y) ? a : b));
        const n = norm(t.x-player.x, t.y-player.y); player.fx = n.x; player.fy = n.y; facing = {x:n.x,y:n.y};
        if(typeof AP.aimAt === "function") AP.aimAt(t);
        for(let i=0;i<3;i++){
          if(player.cds[i]<=0 && player.energy >= player.cls.skills[i].cost){
            if(player.classKey==="cazadora" && i===0){ useSylvaPiercingShot(player, 1200); }
            else useSkill(i);
            break;
          }
        }
        if(player.ultCharge >= player.ultMax && player.ultCd<=0) useUltimate();
      } else {
        // support heals even without enemies
        for(let i=0;i<3;i++){ const k = player.cls.skills[i].kind; if(/heal|immunity/.test(k) && heroes.some(h=>h.alive && h.hp/h.maxHp < 0.6) && player.cds[i]<=0 && player.energy>=player.cls.skills[i].cost){ useSkill(i); break; } }
      }
    }
  }
  const origUpdate = window.update;
  window.update = function(dt){ try{ tick(dt); }catch(e){ AP.err = String(e); } return origUpdate(dt); };
  AP.pickBuff = function(){ const c = document.querySelector('#buff-cards .buff-card'); if(c){ c.click(); return true; } return false; };
  // Accelerated simulation without render: runs update() in fixed steps.
  AP.sim = function(ms, stepMs){
    stepMs = stepMs || 16.67; const n = Math.round(ms/stepMs); let t = 0;
    for(let i=0;i<n;i++){
      if(state==="buff") AP.pickBuff();
      if(state!=="playing") break;
      update(stepMs); t += stepMs;
    }
    return {t, state, runLevel, alive: player.alive, hp: Math.round(player.hp), maxHp: Math.round(player.maxHp), kills, boss: boss?{type:boss.type,hp:Math.round(boss.hp),max:boss.maxHp,alive:boss.alive}:null,
      allies: allies.map(a=>({k:a.classKey, alive:a.alive, hp:Math.round(a.hp)})), enemies: enemies.filter(e=>e.alive).length};
  };
  AP.start = function(cls, arena, level){
    selectedClass = cls; currentArena = arena;
    startRun(level||1);
    if(window.__fs) window.__fs.wi = 0;
    AP.exit = null;
    AP.on = true;
  };
})();
