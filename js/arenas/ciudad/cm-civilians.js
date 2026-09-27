"use strict";
/* ============================================================
   js/arenas/ciudad/cm-civilians.js
   CIUDAD MALDITA — el corazón de la arena: CIVILES y ESTRUCTURAS.

   CIVIL (vive en cmS.civ, lo simula SOLO el anfitrión; el invitado lo ve por el netState):
     HIDDEN   escondido (casa o callejón). Pistas: sollozos y un "?" cuando un campeón anda cerca.
     IDLE     descubierto, agachado: RESCATAR (mantener la acción contextual) lo pone a seguirte.
     FOLLOW   sigue a su campeón (migas de pan por las puertas). Si su campeón cae o se aleja demasiado,
              se queda quieto (IDLE) y cualquiera lo puede volver a rescatar.
     PANIC    grito de la Plañidera / golpe / Espectro: corre lejos de la amenaza y después vuelve.
     RUN      su refugio cayó: corre solo al refugio en pie más cercano (hay que cubrirlo).
     HURT     recibió un golpe (tambaleo corto).
     KIDNAPPED lo carga un Raptor hacia el borde. Pegarle, aturdirlo o matarlo lo suelta.
     FLEE     recién soltado: corre hacia el campeón más cercano.
     RESCUED  llegó a una zona segura: +1 RESCATADO (entra y desaparece).
     DEAD     murió (queda el cuerpo): +1 PERDIDO.
   Los civiles NO son enemigos: ningún ataque de campeón los toca (inmunes por construcción).
   Solo los dañan ataques enemigos con aviso (cmHurtCiv).

   ESTRUCTURA: vida -> INTACTA / DAÑADA / CRÍTICA / DESTRUIDA (sin reparación). Consecuencias en
   cmStructDestroyed. Si caen TODAS las críticas: DERROTA (cmDefeat).
   ============================================================ */
const CIV = {HIDDEN:0, IDLE:1, FOLLOW:2, PANIC:3, RUN:4, HURT:5, KIDNAPPED:6, FLEE:7, RESCUED:8, DEAD:9};
const CIV_NAME = ["HIDDEN","IDLE","FOLLOW","PANIC","RUN","HURT","KIDNAPPED","FLEE","RESCUED","DEAD"];
const CM_TRAIL = new Map();      // migas de pan por héroe (solo anfitrión)

function cmCivAlive(c){ return c.st!==CIV.DEAD && c.st!==CIV.RESCUED; }
function cmCivFree(c){ return c.st!==CIV.DEAD && c.st!==CIV.RESCUED && c.st!==CIV.KIDNAPPED && c.st!==CIV.HIDDEN; }
function cmCivById(id){ for(const c of cmS.civ) if(c.id===id) return c; return null; }
function cmStructIdx(id){ return CM_STRUCTS.findIndex(s=>s.id===id); }

/* ---------------- aparición de civiles por nivel ---------------- */
function cmHideSpots(){
  const out = [];
  for(const b of CM_BUILDINGS){ if(b.kind==="casa" && b.door){ const I = b.inner; out.push({x:I.x0 + (I.x1 - I.x0)*(0.25 + Math.random()*0.5), y:I.y0 + (I.y1 - I.y0)*(0.3 + Math.random()*0.4), b:b.id}); } }
  for(const p of CM_MAP.hideOut) out.push({x:p.x, y:p.y, b:null});
  return out;
}
function cmSpawnCivilians(lv){
  const n = CM_CFG.civ.perLevel[Math.min(CM_CFG.civ.perLevel.length, lv) - 1] || 0;
  if(!n) return;
  let spots = cmHideSpots();
  // lejos de otros civiles vivos y (salvo el tutorial) no pegados al equipo
  spots = spots.filter(s=>!cmS.civ.some(c=>cmCivAlive(c) && Math.hypot(c.x - s.x, c.y - s.y) < 260));
  const made = [];
  if(lv===1){
    // tutorial: el primero en la Casa de la Viuda, a pasos de la entrada (y de la Puerta de Evacuación)
    const I = CM_BLD.b12.inner; made.push({x:(I.x0 + I.x1)/2, y:(I.y0 + I.y1)/2, b:"b12"});
    spots = spots.filter(s=>s.b!=="b12");
  }
  spots.sort(()=>Math.random() - 0.5);
  for(const s of spots){ if(made.length >= n) break; if(lv===1 || cmMinHeroDist(s.x, s.y) > 420) made.push(s); }
  for(const s of made){
    const f = cmNearestFree(s.x, s.y, 16);
    cmS.civ.push({id:cmS.nid++, k:(Math.random()*3)|0, st:CIV.HIDDEN, x:Math.round(f.x), y:Math.round(f.y), hp:CM_CFG.civ.hp, t:0, lead:-1, b:s.b, fx:1, cue:0, prev:CIV.IDLE, danger:0});
    cmS.total++;
  }
}

/* ---------------- daño a civiles (solo desde IA enemiga, siempre con aviso previo) ---------------- */
function cmHurtCiv(c, dmg, src){
  if(!c || !cmCivFree(c) && c.st!==CIV.KIDNAPPED) return;
  c.hp -= dmg; c.hitT = 200;
  if(inView(c.x, c.y, 80)) floatText(c.x, c.y - 44, "-" + Math.round(dmg), "dmg");
  vfxBurst(c.x, c.y - 18, 5, "blood", 70, 380, 3, 1, -20, 0);
  if(c.hp <= 0){ cmCivDie(c, src); return; }
  if(!c._alT || runElapsedMs - c._alT > 3000){ c._alT = runElapsedMs; cmAlert("civhit", c.x, c.y, "¡Están atacando a un civil!", 2200); }
  if(c.st!==CIV.KIDNAPPED){ if(c.st!==CIV.HURT && c.st!==CIV.PANIC) c.prev = c.st===CIV.RUN ? CIV.RUN : (c.st===CIV.FOLLOW ? CIV.FOLLOW : CIV.IDLE); c.st = CIV.HURT; c.t = 0; }
  playSfx("cmCivHurt");
}
function cmCivDie(c, src){
  c.st = CIV.DEAD; c.t = 0; c.hp = 0; c.lead = -1;
  cmS.lost++;
  playSfx("cmCivDeath");
  cmAlert("lost", c.x, c.y, "Un civil ha muerto", 2600);
  if(!tutSeen("cm_lost")) cmTutSay("cm_lost", "No podés salvarlos a todos. Pero cada uno que llega al refugio cuenta. Seguí buscando.", 7000);
}
function cmCivPanic(c, fromX, fromY, ms){
  if(!cmCivFree(c) || c.st===CIV.RUN) return;
  if(c.st!==CIV.PANIC) c.prev = c.st===CIV.FOLLOW ? CIV.FOLLOW : CIV.IDLE;
  c.st = CIV.PANIC; c.t = 0; c.pd = ms || CM_CFG.civ.panicMs; c.px = fromX; c.py = fromY;
}

/* ---------------- migas de pan (los civiles siguen el camino real del campeón) ---------------- */
function cmTrailTick(){
  heroes.forEach((h, i)=>{
    if(!h.alive) return;
    let T = CM_TRAIL.get(i); if(!T){ T = []; CM_TRAIL.set(i, T); }
    const L = T[T.length - 1];
    if(!L || Math.hypot(L.x - h.x, L.y - h.y) > 44){ T.push({x:h.x, y:h.y}); if(T.length > 70) T.shift(); }
  });
}
function cmFollowTarget(c, h, order){
  // con línea libre y cerca: un lugar en la fila detrás del campeón
  const d = Math.hypot(h.x - c.x, h.y - c.y), gap = CM_CFG.civ.followGap*(order + 1);
  c._lt = (c._lt||0) - 16;
  if(c._lt <= 0){ c._lt = 220; c._los = d < 420 && aidLineClear(c.x, c.y, h.x, h.y); c._tp = null;
    if(!c._los){ const T = CM_TRAIL.get(c.lead) || []; for(let k=T.length-1;k>=0;k--){ if(aidLineClear(c.x, c.y, T[k].x, T[k].y)){ c._tp = T[k]; break; } } } }
  if(c._los || !c._tp){
    if(d <= gap) return null;
    const ux = (c.x - h.x)/(d||1), uy = (c.y - h.y)/(d||1);
    return {x:h.x + ux*gap, y:h.y + uy*gap, far:d > gap + 160};
  }
  return {x:c._tp.x, y:c._tp.y, far:true};
}
function _cmCivMove(c, tx, ty, spd, dt){
  const dx = tx - c.x, dy = ty - c.y, d = Math.hypot(dx, dy);
  if(d < 4) return;
  const k = Math.min(d, spd*dt/1000);
  c.x += dx/d*k; c.y += dy/d*k; c.fx = dx < 0 ? -1 : 1; c.mv = 1;
  cmClamp(c);
}

/* ---------------- actualización (anfitrión) ---------------- */
function cmCiviliansUpdate(dt){
  const C = CM_CFG.civ;
  cmTrailTick();
  const order = new Map();
  const oldCtx = new Map(cmS.ctx.map(t=>[t.id, t])); cmS.ctx = [];
  for(const c of cmS.civ){
    c.t += dt; c.mv = 0; if(c.hitT > 0) c.hitT -= dt;
    // amenaza cercana (para agacharse / el ícono de peligro en el HUD)
    let thr = null, td = Infinity;
    if(c.st!==CIV.HIDDEN && cmCivAlive(c)) for(const e of enemies){ if(!e.alive) continue; const d = Math.hypot(e.x - c.x, e.y - c.y); if(d < td){ td = d; thr = e; } }
    c.danger = td < 200 ? 1 : 0;
    switch(c.st){
      case CIV.HIDDEN: {
        const dm = cmMinHeroDist(c.x, c.y);
        c.cue = dm < C.cueR ? 1 : 0;
        if(dm < C.discoverR && !(runLevel===LEVEL_COUNT)) cmCivDiscover(c);
        break;
      }
      case CIV.IDLE: {
        const id = "civ" + c.id, t = oldCtx.get(id) || {id, cid:c.id, r:74, kind:"cm_civ", dur:C.rescueMs, prog:0};
        if(!t.done){ t.x = Math.round(c.x); t.y = Math.round(c.y); cmS.ctx.push(t); }
        break;
      }
      case CIV.FOLLOW: {
        const h = heroes[c.lead];
        if(!h || !h.alive || Math.hypot(h.x - c.x, h.y - c.y) > C.leashR*1.6){
          c.st = CIV.IDLE; c.lead = -1; c.t = 0;
          if(inView(c.x, c.y, 60)) floatText(c.x, c.y - 50, "¡No me dejes!", "warn");
          break;
        }
        const o = order.get(c.lead)||0; order.set(c.lead, o + 1);
        const tg = cmFollowTarget(c, h, o);
        if(tg) _cmCivMove(c, tg.x, tg.y, tg.far ? C.runSpeed : C.speed, dt);
        cmCivCheckSafe(c);
        break;
      }
      case CIV.PANIC: {
        const ax = c.x - (c.px||c.x), ay = c.y - (c.py||c.y), l = Math.hypot(ax, ay) || 1;
        _cmCivMove(c, c.x + ax/l*60 + Math.sin(c.t/180)*20, c.y + ay/l*60, C.runSpeed, dt);
        if(c.t >= (c.pd||C.panicMs)){ const h = heroes[c.lead]; c.st = (c.prev===CIV.FOLLOW && h && h.alive && Math.hypot(h.x - c.x, h.y - c.y) < C.leashR) ? CIV.FOLLOW : CIV.IDLE; if(c.st===CIV.IDLE) c.lead = -1; c.t = 0; }
        cmCivCheckSafe(c);
        break;
      }
      case CIV.RUN: {
        const i = cmNearestSafeIdx(c.x, c.y);
        if(i < 0){ c.st = CIV.IDLE; break; }
        const dir = cmFieldDir(c, cmSafeFieldIndex(i));
        const z = CM_SAFE[i];
        if(dir && !aidLineClear(c.x, c.y, z.x, z.y)) _cmCivMove(c, c.x + dir.x*40, c.y + dir.y*40, C.runSpeed*0.9, dt);
        else _cmCivMove(c, z.x, z.y, C.runSpeed*0.9, dt);
        cmCivCheckSafe(c);
        break;
      }
      case CIV.HURT: {
        if(c.t >= C.hurtMs){ c.st = CIV.PANIC; c.t = 0; c.pd = 1200; c.px = thr ? thr.x : c.x; c.py = thr ? thr.y : c.y; }
        break;
      }
      case CIV.KIDNAPPED: {
        const e = enemies.find(o=>o.alive && o.cmId===c.by);
        if(!e){ cmCivRelease(c); break; }
        c.x = e.x + (e.fx < 0 ? -10 : 10); c.y = e.y - 2; c.fx = e.fx < 0 ? -1 : 1;
        break;
      }
      case CIV.FLEE: {
        const h = nearestHeroTo(c.x, c.y);
        if(h) _cmCivMove(c, h.x, h.y, C.runSpeed, dt);
        if(c.t >= C.fleeMs){ if(h && Math.hypot(h.x - c.x, h.y - c.y) < 260){ c.st = CIV.FOLLOW; c.lead = heroes.indexOf(h); } else { c.st = CIV.IDLE; c.lead = -1; } c.t = 0; }
        cmCivCheckSafe(c);
        break;
      }
      case CIV.RESCUED: {
        // camina hacia adentro y se desvanece
        const z = CM_SAFE[c.safe] || null;
        if(z){ const s = CM_STRUCTS[cmStructIdx(z.id)]; const b = s && s.b ? CM_BLD[s.b] : null; const tg = b && b.doorIn ? b.doorIn : {x:z.x, y:z.y + 60}; _cmCivMove(c, tg.x, tg.y, C.speed, dt); }
        break;
      }
    }
  }
  // limpieza: rescatados ya adentro y cuerpos viejos (quedan unos cuantos como huella)
  cmS.civ = cmS.civ.filter(c=>!(c.st===CIV.RESCUED && c.t > 1600));
  const dead = cmS.civ.filter(c=>c.st===CIV.DEAD);
  if(dead.length > 8){ const old = dead[0]; cmS.civ = cmS.civ.filter(c=>c!==old); }
}
function cmSafeFieldIndex(i){ return i; }
function cmCivDiscover(c){
  c.st = CIV.IDLE; c.t = 0; c.cue = 0;
  cmS.found++;
  playSfx("cmFound");
  if(inView(c.x, c.y, 60)) floatText(c.x, c.y - 56, "¡Ayuda!", "heal");
  if(!tutSeen("cm_first")) cmTutSay("cm_first", "Encontraste a alguien con vida. Acercate y MANTENÉ la acción RESCATAR: te va a seguir. Llevalo a un REFUGIO o a la PUERTA DE EVACUACIÓN (marcados con un escudo verde).", 11000);
}
function cmCivRescueBy(c, h){
  if(!c || c.st!==CIV.IDLE) return;                 // autoridad del anfitrión: nunca un doble rescate
  c.st = CIV.FOLLOW; c.lead = heroes.indexOf(h); c.t = 0; c._lt = 0;
  playSfx("cmRescueStart");
  if(inView(c.x, c.y, 60)) floatText(c.x, c.y - 56, "¡Te sigo!", "heal");
  if(!tutSeen("cm_follow") && h===player) cmTutSay("cm_follow", "Te sigue. Si caés o te alejás mucho se queda quieto. Las zonas seguras brillan en VERDE: escudo en el minimapa.", 8000);
}
function cmCivRelease(c){
  c.by = 0; c.st = CIV.FLEE; c.t = 0;
  playSfx("cmFound");
  if(inView(c.x, c.y, 60)) floatText(c.x, c.y - 56, "¡LIBRE!", "heal");
  cmS.kid = Math.max(0, cmS.kid - 1);
}
function cmNearestSafeIdx(x, y){
  let best = -1, bd = Infinity;
  CM_SAFE.forEach((z, i)=>{ const S = cmS.st[cmStructIdx(z.id)]; if(S.st===CM_ST.DESTROYED) return; const d = Math.hypot(z.x - x, z.y - y); if(d < bd){ bd = d; best = i; } });
  return best;
}
function cmCivCheckSafe(c){
  const R = CM_CFG.civ.safeR;
  for(let i=0;i<CM_SAFE.length;i++){
    const z = CM_SAFE[i], si = cmStructIdx(z.id), S = cmS.st[si];
    if(S.st===CM_ST.DESTROYED) continue;
    if(Math.hypot(c.x - z.x, c.y - z.y) < R){
      c.st = CIV.RESCUED; c.t = 0; c.safe = i; S.sh++;
      cmS.saved++;
      const h = heroes[c.lead];
      if(h && h.stats) h.stats.alliesSaved = (h.stats.alliesSaved||0) + 1;
      c.lead = -1;
      playSfx("cmRescue");
      floatText(z.x, z.y - 70, "+1 RESCATADO", "heal");
      vfxBurst(z.x, z.y - 20, 12, "holy", 90, 600, 3, 2, -40, 0);
      if(!tutSeen("cm_saved")) cmTutSay("cm_saved", "¡A salvo! Cada civil rescatado suma oro y experiencia al final. Si un refugio cae, sus refugiados salen corriendo: cubrilos.", 8000);
      return true;
    }
  }
  return false;
}

/* ---------------- acción contextual RESCATAR ---------------- */
CTX_KINDS.cm_civ = {
  label:"RESCATAR", icon:"🧍", color:"#9dffb0", farOk:true, maxBots:1, decay:0.4, pointer:()=>false,
  canUse:(h, t)=>!!cmS && h.alive,
  onComplete:(t, users)=>{ const c = cmS && cmCivById(t.cid); if(c) cmCivRescueBy(c, users[0]); },
  botWorth:(h, t)=>{
    if(!cmS) return 0;
    // un bot con demasiados civiles detrás primero los lleva a salvo
    const mine = cmS.civ.filter(c=>c.st===CIV.FOLLOW && heroes[c.lead]===h).length;
    return mine >= 3 ? 0 : 8;
  }
};

/* ---------------- estructuras ---------------- */
function cmStructHpState(S){ const f = S.hp/S.max; return S.hp <= 0 ? CM_ST.DESTROYED : f < 0.33 ? CM_ST.CRITICAL : f < 0.66 ? CM_ST.DAMAGED : CM_ST.INTACT; }
function cmStructRuleMult(){ return 1 + CM_CFG.struct.ruleDmgPerStack*arenaRuleStacks(); }
function cmHitStruct(i, dmg, src){
  const S = cmS.st[i]; if(!S || S.st===CM_ST.DESTROYED || runEnding) return;
  S.hp = Math.max(0, S.hp - dmg*cmStructRuleMult()); S.hit = 260;
  const s = CM_STRUCTS[i];
  if(inView(s.cx, s.cy, 200)) vfxBurst(s.cx + cmRand(-60, 60), s.cy + cmRand(-40, 40) - CM_WALL_H*0.6, 6, "rock", 80, 500, 3, 1, -30, 0);
  const ns = cmStructHpState(S);
  if(ns !== S.st){
    S.st = ns;
    if(ns===CM_ST.DESTROYED) cmStructDestroyed(i);
    else { playSfx("cmStructCrack"); cmAlert("struct", s.cx, s.cy, `${s.name}: ${CM_ST_NAME[ns]}`, 3200); if(ns===CM_ST.CRITICAL) showBanner(`⚠ ${s.name.toUpperCase()} ESTÁ POR CAER`); }
  } else if(!S._aT || runElapsedMs - S._aT > 5000){ S._aT = runElapsedMs; cmAlert("struct", s.cx, s.cy, `${s.name} bajo ataque`, 2400); playSfx("cmStructHit"); }
  if(!tutSeen("cm_struct")) cmTutSay("cm_struct", "El Verdugo va por los EDIFICIOS. No se reparan: si un refugio cae, pierde su zona segura. Frenalo antes.", 8000);
}
function cmStructDestroyed(i){
  const s = CM_STRUCTS[i], S = cmS.st[i];
  playSfx("cmStructFall"); vfxShake(12); flashScreen(0.18, "255,140,80");
  vfxShock(s.cx, s.cy, 30, 260, "255,150,80", 900, 2);
  for(let k=0;k<5;k++) runLater(k*120, ()=>vfxBurst(s.cx + cmRand(-120, 120), s.cy + cmRand(-80, 80) - 40, 10, "rock", 120, 700, 4, 2, -60, 0));
  showBanner(`🔥 ${s.name.toUpperCase()} HA CAÍDO`);
  // consecuencias
  if(s.safe && S.sh > 0){
    // los refugiados salen corriendo al refugio en pie más cercano: hay que volver a cubrirlos
    const b = s.b ? CM_BLD[s.b] : null, p = b && b.doorPt ? b.doorPt : {x:s.sx||s.cx, y:(s.sy||s.cy) - 40};
    const n = Math.min(S.sh, 6);
    for(let k=0;k<n;k++){
      const f = cmNearestFree(p.x + cmRand(-50, 50), p.y + cmRand(-30, 30), 16);
      cmS.civ.push({id:cmS.nid++, k:(Math.random()*3)|0, st:CIV.RUN, x:Math.round(f.x), y:Math.round(f.y), hp:CM_CFG.civ.hp, t:0, lead:-1, b:null, fx:1, cue:0, prev:CIV.RUN, danger:0});
    }
    cmS.saved = Math.max(0, cmS.saved - n); S.sh -= n;
    cmAlert("run", p.x, p.y, `¡${n} refugiado${n>1?"s":""} huyen!`, 5000);
    cmTutSay("cm_refuge_fall", "¡Los refugiados salen corriendo al próximo refugio! Cubrilos en el camino.", 7000, true);
  }
  if(s.id==="puerta") cmTutSay("cm_gate_fall", "Cayó la Puerta de Evacuación: solo quedan los refugios.", 6000, true);
  if(s.id==="torre") cmTutSay("cm_tower_fall", "Cayó la Torre de Vigía: ya no vas a ver las pistas de civiles en el minimapa.", 6000, true);
  // DERROTA: cayeron todas las estructuras críticas
  const alive = CM_STRUCTS.some((q, j)=>q.critical && cmS.st[j].st!==CM_ST.DESTROYED);
  if(!alive) cmDefeat();
}
function cmDefeat(){
  if(runEnding) return;
  runEnding = true;
  showBanner("LA CIUDAD HA CAÍDO — no quedó nada en pie para proteger");
  playSfx("cmStructFall"); flashScreen(0.4, "120,20,20");
  runLater(2200, ()=>{ if(state==="playing") showGameOverScreen(); });
}
// punto de ataque sobre una estructura (borde más cercano, del lado de afuera)
function cmStructAttackPt(i, x, y){
  const s = CM_STRUCTS[i], R = s.b ? CM_BLD[s.b] : s.gate;
  const cx = Math.max(R.x0, Math.min(x, R.x1)), cy = Math.max(R.y0, Math.min(y, R.y1));
  let dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy);
  if(d < 1){ dx = 0; dy = 1; d = 1; }
  return {x:cx + dx/d*44, y:cy + dy/d*44, ex:cx, ey:cy};
}
function cmNearestStruct(x, y, onlyAlive){
  let best = -1, bd = Infinity;
  CM_STRUCTS.forEach((s, i)=>{ if(onlyAlive!==false && cmS.st[i].st===CM_ST.DESTROYED) return; const p = cmStructAttackPt(i, x, y), d = Math.hypot(p.x - x, p.y - y); if(d < bd){ bd = d; best = i; } });
  return best;
}
// daño de área a estructuras (explosiones, golpes pesados)
function cmStructArea(x, y, r, dmg, src){
  CM_STRUCTS.forEach((s, i)=>{ if(cmS.st[i].st===CM_ST.DESTROYED) return; const p = cmStructAttackPt(i, x, y); if(Math.hypot(p.ex - x, p.ey - y) < r) cmHitStruct(i, dmg, src); });
}

/* ---------------- alertas prioritarias (HUD) ---------------- */
function cmAlert(k, x, y, txt, d){
  const same = cmS.alerts.find(a=>a.k===k && a.txt===txt);
  if(same){ same.t = 0; same.x = Math.round(x); same.y = Math.round(y); return; }
  cmS.alerts.push({k, x:Math.round(x), y:Math.round(y), txt, t:0, d:d||2600});
  if(cmS.alerts.length > 4) cmS.alerts.shift();
}
function cmTutSay(key, text, ms, urgent){
  if(!player || typeof tutSay!=="function" || tutSeen(key)) return;
  tutSay(key, text, null, ms || 6500, urgent);
}

/* ---------------- recompensas y resultados (data-driven: CM_CFG.reward) ---------------- */
let _cmRewarded = false;
function cmRewardCalc(win){
  const R = CM_CFG.reward, S = cmS || {saved:0, lost:0, total:0, found:0, st:[]};
  const kept = S.st.filter(q=>q.st!==CM_ST.DESTROYED).length;
  const lvMul = 1 + Math.max(0, (S.lv||1) - 1)*0.08;
  let gold = Math.round(S.saved*R.goldPer*lvMul), xp = Math.round(S.saved*R.xpPer*lvMul);
  const perfect = !!(win && S.total > 0 && S.saved >= S.total && S.lost===0);
  if(perfect){ gold += R.perfectGold; xp += R.perfectXp; }
  if(win) gold += kept*R.structGold;
  if(!win){ gold = Math.round(gold*0.5); xp = Math.round(xp*0.5); }
  return {gold, xp, perfect, kept, total:CM_STRUCTS.length};
}
function cmGrantRescueRewards(win){
  if(_cmRewarded || !cmS) return null;
  _cmRewarded = true;
  const r = cmRewardCalc(win);
  if(r.gold) grantGold(r.gold);
  if(r.xp && player && player.classKey) grantXP(player.classKey, r.xp);
  return r;
}
function cmResultsHTML(win){
  if(!cmS) return "";
  const r = cmGrantRescueRewards(win) || cmRewardCalc(win);
  const S = cmS;
  return `<div class="res-row"><span>Civiles encontrados</span><b>${S.found} / ${S.total}</b></div>
    <div class="res-row"><span>Civiles rescatados</span><b style="color:#9dffb0;">${S.saved}</b></div>
    <div class="res-row"><span>Civiles perdidos</span><b style="color:#ff8a6a;">${S.lost}</b></div>
    <div class="res-row"><span>Estructuras en pie</span><b>${r.kept} / ${r.total}</b></div>
    <div class="res-row"><span>Bono de rescate</span><b style="color:#ffd76a;">+${r.gold} oro · +${r.xp} XP</b></div>
    ${r.perfect ? `<div class="res-row"><span>★</span><b style="color:#ffd76a;">RESCATE PERFECTO</b></div>` : ""}`;
}
