"use strict";
/* ============================================================
   js/arenas/fortaleza/fort-traps.js
   CICLO MECÁNICO — las trampas de la Fortaleza y el director que las dispara.

   Cinco trampas (datos en FORT_MAP.traps, números en FORT_CFG.cycle):
     steam  rejilla de vapor: círculo que sopla (daño + empujón)
     gear   engranaje que rueda por su riel (línea)
     chain  cadena que barre un abanico desde su anclaje
     forge  rejilla de forja que se pone al rojo (zona que quema un rato)
     press  prensa industrial que cae (daño fuerte + aturdimiento corto, con inmunidad)
   TODAS avisan antes (telegraph en el piso + sonido) y NUNCA se disparan todas juntas: el
   director elige UNA cerca del equipo (dos en el Núcleo y en la fase final del Caballero), con
   un ritmo que depende del nivel, del sector, de cuántos héroes siguen en pie y de cuántos
   enemigos hay (con la pantalla llena de enemigos, la Fortaleza "respira" más lento).
   Estado sincronizado: fortS.traps[i] = {st, t, d}  (st 0 quieta, 1 aviso, 2 activa, 3 enfriando).
   ============================================================ */
const FORT_TRAP_IDLE = 0, FORT_TRAP_WARN = 1, FORT_TRAP_ACT = 2, FORT_TRAP_CD = 3;
let _fortTrapHits = new Map();   // anfitrión: a quién ya golpeó cada activación (índice -> Set)

function fortTrapsReset(){
  if(!fortS) return;
  fortS.traps = FORT_MAP.traps.map(()=>({st:0, t:0, d:1}));
  fortS.cyc = {t:9000, act:0};
  fortS.nets = [];
  _fortTrapHits = new Map();
}
function _fortTrapDef(i){ return FORT_MAP.traps[i]; }
function _fortRailLen(T){ return Math.hypot(T.x1-T.x0, T.y1-T.y0); }
function _fortTrapWarnMs(T){ return FORT_CFG.cycle[T.type].warnMs; }
function _fortTrapActMs(T){
  const C = FORT_CFG.cycle;
  if(T.type==="steam") return C.steam.burstMs;
  if(T.type==="gear") return _fortRailLen(T)/C.gear.speed*1000;
  if(T.type==="chain") return C.chain.sweepMs;
  if(T.type==="forge") return C.forge.hotMs;
  return C.press.liftMs + 120; // prensa: golpe al empezar, después sube
}
// posición del engranaje / ángulo de la cadena mientras están activos (lo usan la lógica y el dibujo)
function fortGearPos(T, s){
  const q = s.st===FORT_TRAP_ACT ? Math.min(1, s.t/_fortTrapActMs(T)) : (s.d>0 ? 0 : 1);
  const k = s.d>0 ? q : 1-q;
  return {x:T.x0 + (T.x1-T.x0)*k, y:T.y0 + (T.y1-T.y0)*k};
}
function fortChainAng(T, s){
  const q = s.st===FORT_TRAP_ACT ? Math.min(1, s.t/_fortTrapActMs(T)) : 0;
  const e = q<0.5 ? 2*q*q : 1-Math.pow(-2*q+2,2)/2;
  return s.d>0 ? T.a0 + (T.a1-T.a0)*e : T.a1 + (T.a0-T.a1)*e;
}
function _fortInRect(T, x, y, pad){ return Math.abs(x-T.x) <= T.hw+pad && Math.abs(y-T.y) <= T.hh+pad; }
function _fortSegDist(px, py, x0, y0, x1, y1){
  const dx = x1-x0, dy = y1-y0, L2 = dx*dx+dy*dy || 1;
  const t = Math.max(0, Math.min(1, ((px-x0)*dx + (py-y0)*dy)/L2));
  return Math.hypot(px-(x0+dx*t), py-(y0+dy*t));
}
// Distancia de un punto a la zona de una trampa (para elegir trampas cerca del equipo)
function _fortTrapDistTo(T, x, y){
  if(T.type==="gear") return _fortSegDist(x, y, T.x0, T.y0, T.x1, T.y1);
  if(T.type==="chain") return Math.max(0, Math.hypot(x-T.x, y-T.y) - T.len*0.5);
  if(T.type==="forge" || T.type==="press") return Math.max(0, Math.max(Math.abs(x-T.x)-T.hw, Math.abs(y-T.y)-T.hh));
  return Math.hypot(x-T.x, y-T.y);
}

/* ---------------- aviso ---------------- */
function _fortTrapTelegraph(i){
  const T = _fortTrapDef(i), s = fortS.traps[i], C = FORT_CFG.cycle, dur = _fortTrapWarnMs(T);
  if(T.type==="steam"){
    vfxTelegraph({shape:0, r:C.steam.r, x:T.x, y:T.y, follow:null, dur, rgb:"235,235,225"});
    playSfx("fortSteamHiss");
  } else if(T.type==="gear"){
    const a = s.d>0 ? {x:T.x0, y:T.y0} : {x:T.x1, y:T.y1}, b = s.d>0 ? {x:T.x1, y:T.y1} : {x:T.x0, y:T.y0};
    const L = _fortRailLen(T);
    vfxTelegraph({shape:2, r:C.gear.r, len:L, x:a.x, y:a.y, dx:(b.x-a.x)/L, dy:(b.y-a.y)/L, follow:null, dur, rgb:"255,170,60"});
    playSfx("fortGears");
  } else if(T.type==="chain"){
    const mid = (T.a0+T.a1)/2, half = Math.abs(T.a1-T.a0)/2 + 0.08;
    vfxTelegraph({shape:1, r:T.len, arc:half, x:T.x, y:T.y, dx:Math.cos(mid), dy:Math.sin(mid), follow:null, dur, rgb:"200,200,210"});
    playSfx("fortChain");
  } else if(T.type==="forge"){
    vfxTelegraph({shape:2, r:T.hh, len:T.hw*2, x:T.x-T.hw, y:T.y, dx:1, dy:0, follow:null, dur, rgb:"255,110,30"});
    playSfx("fortFurnace");
  } else if(T.type==="press"){
    vfxTelegraph({shape:2, r:T.hh, len:T.hw*2, x:T.x-T.hw, y:T.y, dx:1, dy:0, follow:null, dur, rgb:"255,80,60"});
    playSfx("fortPressWarn");
  }
}

/* ---------------- daño ---------------- */
// regla creciente de la arena: las trampas pegan +5% por nivel (y cada 45 s de jefe)
function _fortTrapLevelMult(){ return 1 + 0.05*(typeof arenaRuleStacks==="function" ? arenaRuleStacks() : Math.max(0, runLevel-1)); }
function _fortTrapHitHero(h, pct, o){
  if(!h || !h.alive || h.fortNoTrap>0) return;
  damageHero(h, h.maxHp*pct*_fortTrapLevelMult(), {x:o.x, y:o.y, rank:"trap"});
  if(!h.alive) return;
  if(o.knock){
    const dx = h.x-o.x, dy = h.y-o.y, d = Math.hypot(dx,dy)||1;
    const kx = o.kdx!==undefined ? o.kdx : dx/d, ky = o.kdy!==undefined ? o.kdy : dy/d;
    h.x += kx*o.knock; h.y += ky*o.knock; clampToArena(h); resolveWallCollision(h);
  }
  if(o.stun && !(h._fortStunImm>0)){ h.stunTimer = Math.max(h.stunTimer||0, o.stun); h._fortStunImm = 3200; }
  if(o.slow){ h.slowAmt = Math.max(h.slowAmt||0, o.slow); h.slowTimer = Math.max(h.slowTimer||0, o.slowMs||800); }
}
function _fortTrapHitEnemy(e, pct, o){
  if(!e.alive || e.rank==="jefe" || e.rank==="subjefe") return;
  if(e.flying && !o.air) return;
  const C = FORT_CFG.cycle;
  const dmg = Math.max(4, e.maxHp*pct*3*C.enemyDmgMult);
  damageEnemy(e, dmg, {src:{x:o.x, y:o.y}});
  if(e.hp <= 0 && e.alive) killEnemy(e);
  if(o.knock && e.alive && e.rank!=="elite"){
    const dx = e.x-o.x, dy = e.y-o.y, d = Math.hypot(dx,dy)||1;
    e.x += dx/d*o.knock*0.7; e.y += dy/d*o.knock*0.7; clampToArena(e);
  }
}
function _fortHitOnce(i, o){
  let set = _fortTrapHits.get(i); if(!set){ set = new Set(); _fortTrapHits.set(i, set); }
  if(set.has(o)) return false; set.add(o); return true;
}
function _fortTrapStrike(i, dt){
  const T = _fortTrapDef(i), s = fortS.traps[i], C = FORT_CFG.cycle;
  if(T.type==="steam"){
    // una ráfaga al empezar (el resto del tiempo es la columna de vapor que se ve)
    if(s.t - dt <= 0){
      for(const h of heroes){ if(h.alive && Math.hypot(h.x-T.x, h.y-T.y) <= C.steam.r + (h.radius||20)*0.4) _fortTrapHitHero(h, C.steam.dmgPct, {x:T.x, y:T.y, knock:C.steam.knock}); }
      for(const e of enemies){ if(e.alive && Math.hypot(e.x-T.x, e.y-T.y) <= C.steam.r + e.radius*0.4) _fortTrapHitEnemy(e, C.steam.dmgPct, {x:T.x, y:T.y, knock:C.steam.knock, air:true}); }
      vfxBurst(T.x, T.y-20, 16, "steam", 160, 700, 5, 1, -120, 0);
      vfxShock(T.x, T.y, 10, C.steam.r*1.2, "235,235,225", 420, 1);
      playSfx("fortSteam");
    }
    if(Math.random() < dt/60) vfxBurst(T.x + (Math.random()-0.5)*40, T.y-30, 2, "steam", 60, 700, 5, 0, -140, 1);
  } else if(T.type==="gear"){
    const p = fortGearPos(T, s), R = C.gear.r;
    const L = _fortRailLen(T), ux = (T.x1-T.x0)/L*s.d, uy = (T.y1-T.y0)/L*s.d;
    for(const h of heroes){
      if(!h.alive || Math.hypot(h.x-p.x, h.y-p.y) > R + (h.radius||20)*0.6 || !_fortHitOnce(i, h)) continue;
      // empuja hacia el costado del riel (sale del camino del engranaje)
      const side = (-(h.x-p.x)*uy + (h.y-p.y)*ux) >= 0 ? 1 : -1;
      _fortTrapHitHero(h, C.gear.dmgPct, {x:p.x, y:p.y, knock:C.gear.knock, kdx:-uy*side, kdy:ux*side});
    }
    for(const e of enemies){ if(e.alive && !e.flying && Math.hypot(e.x-p.x, e.y-p.y) <= R + e.radius*0.6 && _fortHitOnce(i, e)) _fortTrapHitEnemy(e, C.gear.dmgPct, {x:p.x, y:p.y, knock:C.gear.knock}); }
    if(Math.random() < dt/50) vfxBurst(p.x, p.y, 2, "spark", 140, 260, 2.5, 0, -40, 1);
  } else if(T.type==="chain"){
    const a = fortChainAng(T, s), ex = T.x + Math.cos(a)*T.len, ey = T.y + Math.sin(a)*T.len;
    const W = C.chain.width;
    for(const h of heroes){
      if(!h.alive || _fortSegDist(h.x, h.y, T.x, T.y, ex, ey) > W/2 + (h.radius||20)*0.7 || !_fortHitOnce(i, h)) continue;
      const tang = s.d>0 ? 1 : -1; // empuja en el sentido del barrido
      _fortTrapHitHero(h, C.chain.dmgPct, {x:T.x, y:T.y, knock:C.chain.knock, kdx:-Math.sin(a)*tang, kdy:Math.cos(a)*tang});
    }
    for(const e of enemies){ if(e.alive && !e.flying && _fortSegDist(e.x, e.y, T.x, T.y, ex, ey) <= W/2 + e.radius*0.7 && _fortHitOnce(i, e)) _fortTrapHitEnemy(e, C.chain.dmgPct, {x:T.x, y:T.y, knock:C.chain.knock}); }
    if(Math.random() < dt/40) vfxBurst(ex, ey, 2, "spark", 120, 240, 2.5, 0, -20, 1);
  } else if(T.type==="forge"){
    const k = dt/1000;
    for(const h of heroes){ if(h.alive && _fortInRect(T, h.x, h.y, -4)){ if(h.fortNoTrap>0) continue; damageHero(h, h.maxHp*C.forge.dpsPct*k*_fortTrapLevelMult(), {x:T.x, y:T.y, rank:"trap"}); h._fortBurnFx = (h._fortBurnFx||0) - dt; if(h._fortBurnFx<=0){ h._fortBurnFx = 260; vfxBurst(h.x, h.y-10, 3, "ember", 80, 380, 3, 0, -60, 1); } } }
    for(const e of enemies){ if(e.alive && !e.flying && e.rank!=="jefe" && e.rank!=="subjefe" && _fortInRect(T, e.x, e.y, -4)){ e.hp -= e.maxHp*C.forge.dpsPct*3*C.enemyDmgMult*k; if(e.hp<=0) killEnemy(e); } }
    if(Math.random() < dt/70) vfxBurst(T.x + (Math.random()-0.5)*T.hw*2, T.y + (Math.random()-0.5)*T.hh*2, 2, "ember", 70, 600, 3, 0, -70, 1);
  } else if(T.type==="press"){
    if(s.t - dt <= 0){
      for(const h of heroes){ if(h.alive && _fortInRect(T, h.x, h.y, (h.radius||20)*0.3)) _fortTrapHitHero(h, C.press.dmgPct, {x:T.x, y:T.y, stun:C.press.stunMs}); }
      for(const e of enemies){ if(e.alive && !e.flying && _fortInRect(T, e.x, e.y, e.radius*0.3)) _fortTrapHitEnemy(e, C.press.dmgPct*1.5, {x:T.x, y:T.y}); }
      vfxShock(T.x, T.y, 20, Math.max(T.hw, T.hh)*1.4, "255,200,140", 420, 2);
      vfxBurst(T.x, T.y, 18, "rock", 180, 480, 4, 2, -60, 0);
      vfxBurst(T.x, T.y-10, 10, "spark", 220, 300, 3, 0, -60, 0);
      if(player && Math.hypot(player.x-T.x, player.y-T.y) < 520) vfxShake(7);
      playSfx("fortPress");
    }
  }
}

/* ---------------- máquina de estados de cada trampa ---------------- */
function _fortTrapStart(i){
  const s = fortS.traps[i], T = _fortTrapDef(i);
  if(T.type==="gear" || T.type==="chain") s.d = -(s.d||1); // va y vuelve (cada pasada al revés)
  s.st = FORT_TRAP_WARN; s.t = 0;
  _fortTrapHits.delete(i);
  _fortTrapTelegraph(i);
}
function _fortTrapStep(i, dt, host){
  const s = fortS.traps[i]; if(s.st===FORT_TRAP_IDLE) return;
  const T = _fortTrapDef(i);
  s.t += dt;
  if(s.st===FORT_TRAP_WARN){
    if(host && Math.random() < dt/260 && T.type==="steam") vfxBurst(T.x + (Math.random()-0.5)*50, T.y-10, 1, "steam", 40, 500, 3, 0, -60, 1);
    if(s.t >= _fortTrapWarnMs(T)){ s.st = FORT_TRAP_ACT; s.t = 0; if(host && T.type==="gear") playSfx("fortGearRoll"); if(host && T.type==="chain") playSfx("fortChainSweep"); }
  } else if(s.st===FORT_TRAP_ACT){
    if(host) _fortTrapStrike(i, dt);
    if(s.t >= _fortTrapActMs(T)){ s.st = FORT_TRAP_CD; s.t = 0; if(host && T.type==="forge") playSfx("fortCool"); }
  } else if(s.st===FORT_TRAP_CD){
    if(s.t >= FORT_CFG.cycle.cdMs){ s.st = FORT_TRAP_IDLE; s.t = 0; }
  }
}

/* ---------------- director ---------------- */
// ¿Cuántas trampas pueden estar avisando/activas a la vez ahora?
function _fortTrapCap(){
  const K = fortS.knight;
  if(runLevel >= LEVEL_COUNT){
    if(!K || K.state!=="fight") return 0;
    if((K.phase||1) <= 1) return 0;
    if(K.phase===2) return (K.awake||0) > 20000 ? 2 : 1;   // la Fortaleza despierta de a poco
    return 2;
  }
  return fortS.sector===5 ? 2 : 1;
}
function fortTrapsUpdate(dt){
  if(!fortS || !fortS.traps) return;
  for(let i=0;i<fortS.traps.length;i++) _fortTrapStep(i, dt, true);
  fortNetsUpdate(dt);
  for(const h of heroes){ if(h._fortStunImm>0) h._fortStunImm -= dt; if(h.fortNoTrap>0) h.fortNoTrap -= dt; }
  const C = FORT_CFG.cycle, cyc = fortS.cyc;
  if(runLevel < C.firstAtLevel || levelClearing || runEnding) return;
  const K = fortS.knight;
  if(K && K.state==="fight" && K.phase>=2) K.awake = (K.awake||0) + dt;
  let busy = 0; for(const s of fortS.traps) if(s.st===FORT_TRAP_WARN || s.st===FORT_TRAP_ACT) busy++;
  cyc.act = busy;
  cyc.t -= dt;
  if(cyc.t > 0) return;
  const cap = _fortTrapCap();
  if(busy >= cap){ cyc.t = 700; return; }
  // ritmo: nivel (más seguido), héroes en pie (con menos, más lento), enemigos (con muchos, más lento)
  const lvQ = Math.max(0, Math.min(1, (runLevel - C.firstAtLevel)/(LEVEL_COUNT - C.firstAtLevel)));
  const alive = heroes.filter(h=>h.alive).length;
  const nEn = enemies.length;
  let iv = C.intervalMs[0] + (C.intervalMs[1]-C.intervalMs[0])*lvQ;
  iv *= alive<=1 ? 1.35 : (alive===2 ? 1.12 : 1);
  iv *= nEn > 30 ? 1.35 : (nEn > 18 ? 1.15 : 1);
  if(activeChampion && activeChampion.type==="dragon_forja") iv *= 1.3;
  if(K && K.state==="fight" && K.phase===2) iv *= Math.max(1, 1.8 - (K.awake||0)/25000); // despertar gradual
  // candidatas: quietas, en un sector con héroes, cerca de alguien (y que ese alguien no esté caído)
  const cands = [];
  for(let i=0;i<FORT_MAP.traps.length;i++){
    const T = FORT_MAP.traps[i], s = fortS.traps[i];
    if(s.st!==FORT_TRAP_IDLE) continue;
    if(runLevel >= LEVEL_COUNT ? T.sector!==6 : Math.abs(T.sector - fortS.sector) > 1) continue;
    let dmin = Infinity;
    for(const h of heroes){ if(h.alive){ const d = _fortTrapDistTo(T, h.x, h.y); if(d < dmin) dmin = d; } }
    if(dmin > C.nearHero) continue;
    // la trampa no se dispara justo al lado de la otra que ya está activa (nunca dos juntas encima de alguien)
    let clash = false;
    for(let j=0;j<fortS.traps.length;j++){ if(j!==i && fortS.traps[j].st>=FORT_TRAP_WARN && fortS.traps[j].st<=FORT_TRAP_ACT){ const U = FORT_MAP.traps[j]; const ux = U.x!==undefined ? U.x : (U.x0+U.x1)/2, uy = U.y!==undefined ? U.y : (U.y0+U.y1)/2; if(_fortTrapDistTo(T, ux, uy) < 260) clash = true; } }
    if(clash) continue;
    cands.push({i, w: dmin < 200 ? 3 : (dmin < 380 ? 2 : 1)});
  }
  if(!cands.length){ cyc.t = 1500; return; }
  let tot = 0; for(const c of cands) tot += c.w;
  let r = Math.random()*tot, pick = cands[0];
  for(const c of cands){ r -= c.w; if(r <= 0){ pick = c; break; } }
  _fortTrapStart(pick.i);
  cyc.t = iv*(0.8 + Math.random()*0.4);
}
// Invitado: solo avanza los relojes para animar entre snapshots.
function fortTrapsGuestUpdate(dt){
  if(!fortS || !fortS.traps) return;
  for(let i=0;i<fortS.traps.length;i++) _fortTrapStep(i, dt, false);
  if(fortS.nets) for(const n of fortS.nets) n.t += dt;
}

/* ---------------- redes de cadenas (Araña Mecánica): zonas que ralentizan ---------------- */
function fortAddNet(x, y){
  const C = FORT_CFG.arana;
  if(fortS.nets.length >= 6) fortS.nets.shift();
  fortS.nets.push({x:Math.round(x), y:Math.round(y), r:C.netR, t:0, dur:C.netMs});
}
function fortNetsUpdate(dt){
  if(!fortS.nets || !fortS.nets.length) return;
  const C = FORT_CFG.arana;
  let w = 0;
  for(const n of fortS.nets){
    n.t += dt;
    if(n.t >= n.dur) continue;
    for(const h of heroes){ if(h.alive && Math.hypot(h.x-n.x, h.y-n.y) <= n.r){ h.slowAmt = Math.max(h.slowAmt||0, C.netSlow); h.slowTimer = Math.max(h.slowTimer||0, 300); } }
    fortS.nets[w++] = n;
  }
  fortS.nets.length = w;
}

/* ---------------- peligros para los bots / para no combinar injustamente ---------------- */
// ¿El punto está dentro de una trampa que avisa o está activa (o una forja al rojo)?
function fortTrapDangerAt(x, y, pad){
  if(!fortS || !fortS.traps) return false;
  pad = pad||0;
  const C = FORT_CFG.cycle;
  for(let i=0;i<fortS.traps.length;i++){
    const s = fortS.traps[i]; if(s.st!==FORT_TRAP_WARN && s.st!==FORT_TRAP_ACT) continue;
    const T = FORT_MAP.traps[i];
    if(T.type==="steam" && Math.hypot(x-T.x, y-T.y) < C.steam.r + pad) return true;
    if((T.type==="forge" || T.type==="press") && _fortInRect(T, x, y, pad)) return true;
    if(T.type==="gear" && _fortSegDist(x, y, T.x0, T.y0, T.x1, T.y1) < C.gear.r + pad) return true;
    if(T.type==="chain"){ const d = Math.hypot(x-T.x, y-T.y); if(d < T.len + pad){ let a = Math.atan2(y-T.y, x-T.x); const lo = Math.min(T.a0,T.a1)-0.1, hi = Math.max(T.a0,T.a1)+0.1; while(a < lo) a += Math.PI*2; while(a > hi + Math.PI*2) a -= Math.PI*2; if(a >= lo && a <= hi) return true; } }
  }
  return false;
}
// Vector de escape de las trampas activas (lo usa botDangerVec a través de ARENA_DEFS).
function fortBotDanger(x, y, pad){
  if(!fortS || !fortS.traps) return null;
  const C = FORT_CFG.cycle;
  let vx = 0, vy = 0, hit = false;
  for(let i=0;i<fortS.traps.length;i++){
    const s = fortS.traps[i]; if(s.st!==FORT_TRAP_WARN && s.st!==FORT_TRAP_ACT) continue;
    const T = FORT_MAP.traps[i];
    if(T.type==="forge" || T.type==="press"){
      if(_fortInRect(T, x, y, pad)){ hit = true; const ox = T.hw+pad - Math.abs(x-T.x), oy = T.hh+pad - Math.abs(y-T.y); if(ox < oy) vx += x>=T.x ? 1 : -1; else vy += y>=T.y ? 1 : -1; }
    } else if(T.type==="gear"){
      if(_fortSegDist(x, y, T.x0, T.y0, T.x1, T.y1) < C.gear.r + pad){ hit = true; const L = _fortRailLen(T), ux = (T.x1-T.x0)/L, uy = (T.y1-T.y0)/L; const side = (-(x-T.x0)*uy + (y-T.y0)*ux) >= 0 ? 1 : -1; vx += -uy*side; vy += ux*side; }
    } else if(T.type==="chain"){
      if(fortTrapDangerAt(x, y, pad) && Math.hypot(x-T.x, y-T.y) < T.len + pad){ hit = true; const d = Math.hypot(x-T.x, y-T.y)||1; vx += (x-T.x)/d; vy += (y-T.y)/d; }
    } else {
      const d = Math.hypot(x-T.x, y-T.y); if(d < C.steam.r + pad){ hit = true; vx += (x-T.x)/(d||1); vy += (y-T.y)/(d||1); }
    }
  }
  if(fortS.nets) for(const n of fortS.nets){ const d = Math.hypot(x-n.x, y-n.y); if(d < n.r + pad*0.5){ hit = true; vx += (x-n.x)/(d||1)*0.6; vy += (y-n.y)/(d||1)*0.6; } }
  return hit ? {x:vx, y:vy} : null;
}
