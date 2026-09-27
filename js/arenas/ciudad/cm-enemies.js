"use strict";
/* ============================================================
   js/arenas/ciudad/cm-enemies.js
   Los nueve enemigos de la Ciudad Maldita (números en CM_CFG). Cada uno presiona una parte de
   "decidir qué vale la pena salvar":
     Saqueador Maldito     presión cuerpo a cuerpo; si no hay campeones cerca, va por los civiles (con aviso)
     Perro del Albañal     sale de las cloacas; rápido; muerde a los civiles que corren o van últimos en la fila
     Raptor                SECUESTRADOR: busca civiles, los agarra (aviso) y escapa por un borde.
                           Estados SEARCH / CHASE_CIVILIAN / GRAB / ESCAPE / INTERRUPTED / COMBAT.
                           Pegarle fuerte, aturdirlo o matarlo SUELTA al civil.
     Verdugo               ASEDIO: camina hasta un edificio y lo golpea (golpe vertical con aviso)
     Plañidera             a distancia; GRITO DE PÁNICO telegrafiado: los civiles cercanos entran en pánico
     Acechante             salta entre tejados (nodos): aviso en el piso, cae, pelea y vuelve a subir
     Campanero             canaliza una CAMPANA: si termina, llegan refuerzos (y se revelan civiles cerca).
                           Objetivo prioritario: cortarlo con daño o control.
     Sectario Fanático     en grupo; se prepara para ESTALLAR (aviso): daña campeones, civiles y edificios
     Espectro Ciudadano    atraviesa paredes; drena a un campeón o asusta a un civil
   Cada IA devuelve true (el motor saltea la persecución genérica). Solo corre en el anfitrión.
   ============================================================ */
let _cmEid = 0;
function _cmPack(e, set, ms){ e.packSet = set; e.packTimer = ms; e.packDur = ms; }
function _cmFace(e, x, y){ const dx = x - e.x, dy = y - e.y, d = Math.hypot(dx, dy)||1; e.fx = dx/d; e.fy = dy/d; }
function cmSpd(e){ return e.cmBusy ? 0 : e.speed*(1 - Math.min(0.8, e.slowAmt||0)); }
function cmStep(e, tgt, dist, dt, mult){ aidEnemyStep(e, tgt.x - e.x, tgt.y - e.y, dist, cmSpd(e)*(mult||1), dt); }
function cmStepTo(e, x, y, dt, mult){ const d = Math.hypot(x - e.x, y - e.y); if(d > 6) aidEnemyStep(e, x - e.x, y - e.y, d, cmSpd(e)*(mult||1), dt); return d; }
function cmMelee(e, tgt, dist, cd, mult){
  if(tgt && dist <= e.radius + (tgt.radius||18) + 8 && e.atkCd2 <= 0){ e.atkCd2 = cd; e.attackAnim = 300; damageHero(tgt, e.dmg*(mult||1), e); return true; }
  return false;
}
function cmHeroesNear(x, y, R, fn){ for(const h of heroes){ if(h.alive && Math.hypot(h.x - x, h.y - y) <= R + (h.radius||18)*0.5) fn(h); } }
function cmCivsNear(x, y, R, fn){ for(const c of cmS.civ){ if(cmCivFree(c) && Math.hypot(c.x - x, c.y - y) <= R) fn(c); } }
function cmId(e){ return e.cmId || (e.cmId = ++_cmEid); }
function cmEnemyTarget(e){
  let best = null, bd = Infinity;
  for(const h of heroes){ if(!h.alive) continue; const d = Math.hypot(h.x - e.x, h.y - e.y); if(d < bd){ bd = d; best = h; } }
  return best || nearestHeroTo(e.x, e.y);
}
function cmNearestHeroDist(x, y){ return cmMinHeroDist(x, y); }
// civil más cercano "atacable" (no escondido, no a salvo, no cargado por otro)
function cmNearestCiv(x, y, R, filt){
  let best = null, bd = R||Infinity;
  for(const c of cmS.civ){ if(!cmCivFree(c) || (filt && !filt(c))) continue; const d = Math.hypot(c.x - x, c.y - y); if(d < bd){ bd = d; best = c; } }
  return best;
}
function cmShot(e, tx, ty, k, spd, dmgMult, o){
  const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy)||1;
  cmS.shots.push(Object.assign({x:e.x + dx/d*20, y:e.y - 30 + dy/d*20, vx:dx/d*spd, vy:dy/d*spd, t:0, d:2600, k, dmg:e.dmg*(dmgMult||1), r:16, src:cmId(e)}, o||{}));
}

/* ---------------- Saqueador Maldito ---------------- */
function cmAISaqueador(e, dt, tgt, dist){
  const C = CM_CFG.saqueador;
  e.atkCd = 1e6; e.atkCd2 = (e.atkCd2||0) - dt;
  if(e.lungeCd===undefined) e.lungeCd = cmRand(1200, C.lungeCd[1]);
  e.lungeCd -= dt;
  // golpe a un civil (con aviso): solo si no hay campeones cerca que lo defiendan
  if(e.civWind){
    e.civWind -= dt; const c = cmCivById(e.civT);
    if(!c || !cmCivFree(c)){ e.civWind = 0; e.cmBusy = false; return true; }
    _cmFace(e, c.x, c.y);
    if(e.civWind <= 0){ e.civWind = 0; e.cmBusy = false; e.attackAnim = 320; e.civCd = C.civCd; if(Math.hypot(c.x - e.x, c.y - e.y) < e.radius + 40) cmHurtCiv(c, C.civDmg, e); }
    return true;
  }
  if(e.lWind){
    e.lWind -= dt; _cmFace(e, tgt.x, tgt.y);
    if(e.lWind <= 0){
      e.lWind = 0; e.cmBusy = false;
      const k = Math.min(60, Math.max(0, dist - e.radius - 10)); e.x += e.fx*k; e.y += e.fy*k; cmClamp(e);
      cmHeroesNear(e.x + e.fx*30, e.y + e.fy*30, C.lungeR*0.7, h=>bossHitHero(h, e.dmg*C.lungeMult, {from:e}));
      if(typeof CIUDAD_FX!=="undefined") bossSheetFx("cmSaqImpact", e.x + e.fx*30, e.y + e.fy*30, 50, 320, {anchorY:0.6});
      _cmPack(e, "slash", 360); playSfx("cmSlash");
    }
    return true;
  }
  const hd = cmNearestHeroDist(e.x, e.y);
  if(e.civCd > 0) e.civCd -= dt;
  if(hd > 280 && !(e.civCd > 0)){
    const c = cmNearestCiv(e.x, e.y, 260);
    if(c){
      const d = Math.hypot(c.x - e.x, c.y - e.y);
      if(d < e.radius + 34){ e.civWind = C.civWind; e.civT = c.id; e.cmBusy = true; cmCivWarn(c, C.civWind); return true; }
      cmStepTo(e, c.x, c.y, dt); return true;
    }
  }
  if(e.lungeCd <= 0 && dist < C.lungeR + 70 && dist > e.radius + 10){
    e.lungeCd = cmRand(C.lungeCd[0], C.lungeCd[1]); e.lWind = C.lungeWind; e.cmBusy = true; _cmPack(e, "rush", C.lungeWind + 300);
    vfxTelegraph({shape:1, x:e.x, y:e.y, r:C.lungeR + 40, dx:e.fx, dy:e.fy, arc:0.5, dur:C.lungeWind, rgb:"255,80,60"});
    return true;
  }
  if(dist > e.radius + tgt.radius - 4) cmStep(e, tgt, dist, dt);
  cmMelee(e, tgt, dist, 1000, 1);
  return true;
}
// aviso sobre el civil amenazado ("!" rojo) — viaja en el estado
function cmCivWarn(c, ms){ c.warn = Math.max(c.warn||0, ms); }

/* ---------------- Perro del Albañal ---------------- */
function cmAIPerro(e, dt, tgt, dist){
  const C = CM_CFG.perro;
  e.atkCd = 1e6; e.atkCd2 = (e.atkCd2||0) - dt;
  if(e.cmEmerge > 0){ e.cmEmerge -= dt; _cmPack(e, "emerge", 600); return true; }
  if(e.leapCd===undefined) e.leapCd = cmRand(1500, C.leapCd[1]);
  e.leapCd -= dt;
  if(e.pl){
    const L = e.pl; L.t += dt;
    if(L.st==="warn"){ if(L.t >= 440){ L.st = "air"; L.t = 0; L.x0 = e.x; L.y0 = e.y; _cmPack(e, "leap", 380); } return true; }
    const q = Math.min(1, L.t/360); e.x = L.x0 + (L.tx - L.x0)*q; e.y = L.y0 + (L.ty - L.y0)*q;
    if(q >= 1){ e.pl = null; e.cmBusy = false; cmClamp(e); cmHeroesNear(e.x, e.y, 46, h=>damageHero(h, e.dmg*1.2, e)); }
    return true;
  }
  // presa fácil: civiles que corren solos o van últimos en la fila
  if(cmNearestHeroDist(e.x, e.y) > 150){
    const c = cmNearestCiv(e.x, e.y, 240, c=>c.st===CIV.RUN || c.st===CIV.FLEE || c.st===CIV.PANIC || c.st===CIV.FOLLOW && cmMinHeroDist(c.x, c.y) > 90);
    if(c){
      const d = cmStepTo(e, c.x, c.y, dt, 1.05);
      if(d < e.radius + 30 && e.atkCd2 <= 0){ e.atkCd2 = C.biteCd; e.attackAnim = 260; cmCivWarn(c, 300); cmHurtCiv(c, e.dmg, e); }
      return true;
    }
  }
  if(e.leapCd <= 0 && dist < C.leapR && dist > 90){
    e.leapCd = cmRand(C.leapCd[0], C.leapCd[1]); e.cmBusy = true;
    e.pl = {st:"warn", t:0, tx:tgt.x, ty:tgt.y};
    vfxTelegraph({shape:0, x:tgt.x, y:tgt.y, r:46, dur:440, rgb:"255,90,70"});
    return true;
  }
  if(dist > e.radius + tgt.radius - 4) cmStep(e, tgt, dist, dt);
  cmMelee(e, tgt, dist, C.biteCd, 1);
  return true;
}

/* ---------------- Raptor (secuestrador) ---------------- */
function cmAIRaptor(e, dt, tgt, dist){
  const C = CM_CFG.raptor;
  e.atkCd = 1e6; e.atkCd2 = (e.atkCd2||0) - dt;
  const R = e.rp || (e.rp = {st:"SEARCH", t:0, civ:0, hp0:e.hp});
  R.t += dt; cmId(e);
  if(e.stunTimer > 0 && R.st!=="INTERRUPTED" && R.st!=="SEARCH" && R.st!=="COMBAT"){ cmRaptorInterrupt(e, R); return true; }
  switch(R.st){
    case "SEARCH": case "COMBAT": {
      if(R.st==="COMBAT" && R.t < 1600){ if(dist > e.radius + tgt.radius - 4) cmStep(e, tgt, dist, dt); cmMelee(e, tgt, dist, 1100, 0.9); return true; }
      const c = cmNearestCiv(e.x, e.y, C.searchR, c=>!cmS.civ.some(o=>o!==c && o.st===CIV.KIDNAPPED && o.by===e.cmId) && !enemies.some(q=>q!==e && q.alive && q.rp && q.rp.civ===c.id));
      if(c){ R.st = "CHASE_CIVILIAN"; R.t = 0; R.civ = c.id; e.cmState = "CHASE_CIVILIAN"; return true; }
      R.st = "COMBAT"; R.t = 0; e.cmState = "COMBAT";
      if(dist > e.radius + tgt.radius - 4) cmStep(e, tgt, dist, dt);
      cmMelee(e, tgt, dist, 1100, 0.9);
      return true;
    }
    case "CHASE_CIVILIAN": {
      const c = cmCivById(R.civ);
      if(!c || !cmCivFree(c)){ R.st = "SEARCH"; R.t = 0; return true; }
      const d = cmStepTo(e, c.x, c.y, dt, 1.05);
      if(d < C.grabR + 10){
        R.st = "GRAB"; R.t = 0; R.hp0 = e.hp; e.cmBusy = true; e.cmState = "GRAB";
        _cmPack(e, "grab", C.grabWind + 200); cmCivWarn(c, C.grabWind);
        vfxTelegraph({shape:0, follow:c, r:40, dur:C.grabWind, rgb:"255,60,60"});
        cmAlert("grab", c.x, c.y, "¡Un Raptor agarra a un civil!", 1800);
        playSfx("cmGrab");
        if(!tutSeen("cm_raptor")) cmTutSay("cm_raptor", "¡Un RAPTOR! Busca civiles y se los lleva por un borde. Pegale fuerte, aturdilo o matalo para que lo SUELTE.", 9000, true);
      }
      if(R.t > 9000){ R.st = "SEARCH"; R.t = 0; }
      return true;
    }
    case "GRAB": {
      const c = cmCivById(R.civ);
      if(!c || !cmCivFree(c) || Math.hypot(c.x - e.x, c.y - e.y) > C.grabR + 60){ e.cmBusy = false; R.st = "SEARCH"; R.t = 0; return true; }
      if(R.hp0 - e.hp > e.maxHp*C.breakPct*0.5){ cmRaptorInterrupt(e, R); return true; }
      _cmFace(e, c.x, c.y);
      if(R.t >= C.grabWind){
        c.st = CIV.KIDNAPPED; c.by = e.cmId; c.lead = -1; c.t = 0; cmS.kid++;
        let best = CM_MAP.exits[0], bd = Infinity;
        for(const x of CM_MAP.exits){ const q = Math.hypot(x.x - e.x, x.y - e.y) + cmMinHeroDist(x.x, x.y)*-0.35; if(q < bd){ bd = q; best = x; } }
        R.st = "ESCAPE"; R.t = 0; R.ex = best.x; R.ey = best.y; R.hp0 = e.hp; e.cmBusy = false; e.cmState = "ESCAPE";
        showBanner("⚠ ¡EL RAPTOR SE LLEVA A UN CIVIL! — detenelo antes del borde");
      }
      return true;
    }
    case "ESCAPE": {
      const c = cmS.civ.find(o=>o.st===CIV.KIDNAPPED && o.by===e.cmId);
      if(!c){ R.st = "SEARCH"; R.t = 0; return true; }
      if(R.hp0 - e.hp > e.maxHp*C.breakPct){ cmRaptorInterrupt(e, R); return true; }
      _cmPack(e, "carry", 400);
      cmAlert("kid", e.x, e.y, "¡Secuestro en curso!", 600);
      const d = cmStepTo(e, R.ex, R.ey, dt, C.carrySpeed);
      if(d < C.escapeR + 20){
        // escapó por el borde: el civil se pierde
        c.st = CIV.DEAD; c.gone = 1; c.t = 0; cmS.lost++; cmS.kid = Math.max(0, cmS.kid - 1);
        playSfx("cmCivDeath"); showBanner("Un civil fue secuestrado… se perdió en la oscuridad");
        cmAlert("lost", e.x, e.y, "Civil secuestrado", 3000);
        e.alive = false; e.hp = 0; e.cmVanish = 1; e.xp = 0; e.gold = 0;
      }
      return true;
    }
    case "INTERRUPTED": {
      if(R.t >= C.stunMs){ R.st = "COMBAT"; R.t = 0; e.cmBusy = false; e.cmState = "COMBAT"; }
      return true;
    }
  }
  return true;
}
function cmRaptorInterrupt(e, R){
  const c = cmS.civ.find(o=>o.st===CIV.KIDNAPPED && o.by===e.cmId);
  if(c) cmCivRelease(c);
  R.st = "INTERRUPTED"; R.t = 0; R.civ = 0; e.cmBusy = true; e.cmState = "INTERRUPTED";
  _cmPack(e, "drop", CM_CFG.raptor.stunMs);
  if(typeof CIUDAD_FX!=="undefined") bossSheetFx("cmRapImpact", e.x, e.y - 20, 60, 380, {anchorY:0.6});
  floatText(e.x, e.y - 60, "¡LO SOLTÓ!", "crit");
}

/* ---------------- Verdugo (asedio) ---------------- */
function cmAIVerdugo(e, dt, tgt, dist){
  const C = CM_CFG.verdugo;
  e.atkCd = 1e6; e.atkCd2 = (e.atkCd2||0) - dt;
  if(e.smashCd===undefined) e.smashCd = 1500;
  e.smashCd -= dt;
  if(e.vw){
    const W = e.vw; W.t += dt; _cmFace(e, W.x, W.y);
    if(W.t >= C.smashWind){
      e.vw = null; e.cmBusy = false; e.attackAnim = 400;
      const cx = e.x + e.fx*C.smashR*0.55, cy = e.y + e.fy*C.smashR*0.55;
      cmHeroesNear(cx, cy, C.smashR*0.7, h=>bossHitHero(h, e.dmg*C.heroMult, {from:e}));
      cmCivsNear(cx, cy, C.smashR*0.6, c=>cmHurtCiv(c, 40, e));
      if(W.si >= 0) cmHitStruct(W.si, C.structDmg, e);
      if(typeof CIUDAD_FX!=="undefined") bossSheetFx("cmVerSlam", cx, cy, 90, 520, {anchorY:0.7});
      vfxShake(W.si >= 0 ? 6 : 4); playSfx("cmSmash");
    }
    return true;
  }
  const hd = dist;
  const si = cmNearestStruct(e.x, e.y, true);
  // un campeón que se le planta enfrente lo distrae
  if(hd < C.heroAggroR || si < 0){
    if(e.smashCd <= 0 && hd < C.smashR){ cmVerdugoWind(e, tgt.x, tgt.y, -1); return true; }
    if(hd > e.radius + tgt.radius - 4) cmStep(e, tgt, hd, dt);
    cmMelee(e, tgt, hd, 1400, 1);
    return true;
  }
  const p = cmStructAttackPt(si, e.x, e.y);
  const d = cmStepTo(e, p.x, p.y, dt);
  if(d < 40 && e.smashCd <= 0) cmVerdugoWind(e, p.ex, p.ey, si);
  if(!e._vwTut && d < 400){ e._vwTut = 1; cmAlert("verdugo", e.x, e.y, "¡Un Verdugo va por un edificio!", 3000); }
  return true;
}
function cmVerdugoWind(e, x, y, si){
  const C = CM_CFG.verdugo;
  e.smashCd = cmRand(C.smashCd[0], C.smashCd[1]); e.cmBusy = true; e.vw = {t:0, x, y, si};
  _cmFace(e, x, y); _cmPack(e, si >= 0 ? "smash" : "chop", C.smashWind + 400);
  vfxTelegraph({shape:1, x:e.x, y:e.y, r:C.smashR + 20, dx:e.fx, dy:e.fy, arc:0.7, dur:C.smashWind, rgb:"255,60,40"});
}

/* ---------------- Plañidera ---------------- */
function cmAIPlanidera(e, dt, tgt, dist){
  const C = CM_CFG.planidera;
  e.atkCd = 1e6;
  if(e.boltCd===undefined){ e.boltCd = cmRand(900, C.boltCd[1]); e.screamCd = cmRand(4000, C.screamCd[1]); }
  e.boltCd -= dt; e.screamCd -= dt;
  if(e.sc){
    e.sc.t += dt;
    if(e.sc.t >= C.screamWind){
      e.sc = null; e.cmBusy = false;
      cmCivsNear(e.x, e.y, C.screamR, c=>cmCivPanic(c, e.x, e.y));
      cmHeroesNear(e.x, e.y, C.screamR*0.55, h=>{ bossHitHero(h, e.dmg*C.screamDmgMult, {from:e}); h.slowAmt = Math.max(h.slowAmt||0, 0.3); h.slowTimer = Math.max(h.slowTimer||0, 1200); });
      if(typeof CIUDAD_FX!=="undefined") bossSheetFx("cmPanicZone", e.x, e.y, C.screamR*0.9, 700, {anchorY:0.5});
      vfxShock(e.x, e.y - 20, 30, C.screamR, "255,80,110", 700, 2);
      playSfx("cmScream");
    }
    return true;
  }
  if(e.screamCd <= 0 && (cmNearestCiv(e.x, e.y, C.screamR*0.9) || dist < C.screamR*0.5)){
    e.screamCd = cmRand(C.screamCd[0], C.screamCd[1]); e.sc = {t:0}; e.cmBusy = true;
    _cmPack(e, "scream", C.screamWind + 300);
    vfxTelegraph({shape:0, x:e.x, y:e.y, r:C.screamR, dur:C.screamWind, rgb:"255,90,140"});
    cmAlert("scream", e.x, e.y, "¡Grito de la Plañidera!", 1400);
    if(!tutSeen("cm_scream")) cmTutSay("cm_scream", "La PLAÑIDERA grita: los civiles cerca entran en PÁNICO y se dispersan. Cortale el grito o sacalos de su alcance.", 8000);
    return true;
  }
  // mantener distancia
  if(dist < C.keepMin){ const ux = (e.x - tgt.x)/(dist||1), uy = (e.y - tgt.y)/(dist||1); cmStepTo(e, e.x + ux*60, e.y + uy*60, dt, 0.9); }
  else if(dist > C.keepMax) cmStep(e, tgt, dist, dt);
  _cmFace(e, tgt.x, tgt.y);
  if(e.boltCd <= 0 && dist < C.keepMax + 120){ e.boltCd = cmRand(C.boltCd[0], C.boltCd[1]); _cmPack(e, "throw", 500); e.attackAnim = 300; cmShot(e, tgt.x, tgt.y, "tear", C.boltSpeed, 1); playSfx("cmTear"); }
  return true;
}

/* ---------------- Acechante de los tejados ---------------- */
function cmRoofNodes(){ return CM_BUILDINGS.filter(b=>b.kind==="casa").map(b=>({x:b.cx, y:b.cy - 10, b:b.id})); }
const CM_ROOFS = cmRoofNodes();
function cmAIAcechante(e, dt, tgt, dist){
  const C = CM_CFG.acechante;
  e.atkCd = 1e6; e.atkCd2 = (e.atkCd2||0) - dt;
  const A = e.ac || (e.ac = {st:"ground", t:0, gd:1400});
  A.t += dt;
  if(A.st==="roof"){
    e.cmRoof = 1; e.dmgTakenMult = 0.05;
    if(A.t >= A.d){
      // objetivo: un campeón o (a veces) el civil más atrás de una fila
      let tx = tgt.x, ty = tgt.y;
      const c = Math.random() < 0.3 ? cmNearestCiv(e.x, e.y, 650, c=>c.st===CIV.FOLLOW || c.st===CIV.RUN) : null;
      if(c){ tx = c.x; ty = c.y; A.civ = c.id; cmCivWarn(c, C.leapWarn); } else A.civ = 0;
      if(Math.hypot(tx - e.x, ty - e.y) > 800){ A.t = A.d - 400; return true; }
      A.st = "warn"; A.t = 0; A.tx = tx; A.ty = ty;
      vfxTelegraph({shape:0, x:tx, y:ty, r:C.leapR, dur:C.leapWarn + C.leapMs, rgb:"255,70,70"});
      if(typeof CIUDAD_FX!=="undefined") bossSheetFx("cmLeapArc", (e.x + tx)/2, (e.y + ty)/2, 120, C.leapWarn, {anchorY:0.5});
      playSfx("cmRoof");
      if(!tutSeen("cm_roof")) cmTutSay("cm_roof", "Algo se mueve en los TEJADOS. Cuando veas un círculo rojo en el piso: salí de ahí.", 7000);
    }
    return true;
  }
  if(A.st==="warn"){
    if(A.t >= C.leapWarn){ A.st = "leap"; A.t = 0; A.x0 = e.x; A.y0 = e.y - CM_WALL_H; _cmPack(e, "dive", C.leapMs + 200); }
    return true;
  }
  if(A.st==="leap"){
    const q = Math.min(1, A.t/C.leapMs);
    e.x = A.x0 + (A.tx - A.x0)*q; e.y = A.y0 + (A.ty - A.y0)*q; e.hover = -Math.sin(q*Math.PI)*80;
    if(q >= 1){
      e.hover = 0; e.cmRoof = 0; e.dmgTakenMult = 1; cmClamp(e);
      cmHeroesNear(e.x, e.y, C.leapR, h=>bossHitHero(h, e.dmg*C.dmgMult, {from:e}));
      if(A.civ){ const c = cmCivById(A.civ); if(c && cmCivFree(c) && Math.hypot(c.x - e.x, c.y - e.y) < C.leapR) cmHurtCiv(c, 22, e); }
      if(typeof CIUDAD_FX!=="undefined") bossSheetFx("cmAceImpact", e.x, e.y, 70, 380, {anchorY:0.6});
      vfxShake(3); playSfx("cmLand");
      A.st = "ground"; A.t = 0; A.gd = cmRand(C.groundMs[0], C.groundMs[1]);
    }
    return true;
  }
  if(A.st==="climb"){
    if(A.t >= 700){ const n = A.node; e.x = n.x; e.y = n.y; A.st = "roof"; A.t = 0; A.d = cmRand(C.roofMs[0], C.roofMs[1]); }
    return true;
  }
  // en el piso: pelea un rato y vuelve a subir al tejado más cercano
  e.cmRoof = 0; e.dmgTakenMult = 1;
  if(A.t >= A.gd){
    let best = CM_ROOFS[0], bd = Infinity;
    for(const n of CM_ROOFS){ const d = Math.hypot(n.x - e.x, n.y - e.y); if(d < bd){ bd = d; best = n; } }
    A.st = "climb"; A.t = 0; A.node = best; _cmPack(e, "climb", 700);
    if(typeof CIUDAD_FX!=="undefined") bossSheetFx("cmRoofDust", e.x, e.y, 60, 500, {anchorY:0.8});
    return true;
  }
  if(dist > e.radius + tgt.radius - 4) cmStep(e, tgt, dist, dt);
  cmMelee(e, tgt, dist, 900, 1);
  return true;
}

/* ---------------- Campanero ---------------- */
function cmAICampanero(e, dt, tgt, dist){
  const C = CM_CFG.campanero;
  e.atkCd = 1e6; e.atkCd2 = (e.atkCd2||0) - dt;
  const P = e.cp || (e.cp = {st:"go", t:0, bell:-1, cd:cmRand(2500, 5000)});
  P.t += dt; cmId(e);
  if(P.st==="channel"){
    const B = cmS.bells[P.bell];
    if(e.stunTimer > 0 || P.hp0 - e.hp > e.maxHp*C.breakPct){
      P.st = "fight"; P.t = 0; P.cd = cmRand(C.cdMs[0], C.cdMs[1]); B.by = 0; B.t = 0; e.cmBusy = false;
      floatText(e.x, e.y - 80, "¡CAMPANA CORTADA!", "crit"); playSfx("cmBellCut");
      return true;
    }
    B.t = P.t; _cmPack(e, "channel", 800);
    cmAlert("bell", e.x, e.y, "¡CAMPANERO CANALIZANDO! — cortalo", 700);
    if(Math.random() < dt/700) playSfx("cmBellTick");
    if(P.t >= C.channelMs){
      B.by = 0; B.t = 0; P.st = "fight"; P.t = 0; P.cd = cmRand(C.cdMs[0], C.cdMs[1]); e.cmBusy = false;
      cmBellComplete(e, P.bell);
    }
    return true;
  }
  P.cd -= dt;
  if(P.st==="go" || (P.st==="fight" && P.cd <= 0)){
    if(P.bell < 0 || cmS.bells[P.bell].by){
      let best = -1, bd = Infinity;
      CM_MAP.bells.forEach((b, i)=>{ if(cmS.bells[i].by) return; const d = Math.hypot(b.x - e.x, b.y - e.y); if(d < bd){ bd = d; best = i; } });
      P.bell = best;
    }
    if(P.bell >= 0){
      const b = CM_MAP.bells[P.bell];
      P.st = "go";
      const d = cmStepTo(e, b.x, b.y, dt);
      if(d < 36){
        P.st = "channel"; P.t = 0; P.hp0 = e.hp; e.cmBusy = true; cmS.bells[P.bell].by = e.cmId; cmS.bells[P.bell].t = 0;
        vfxTelegraph({shape:3, x:b.x, y:b.y, r:C.revealR*0.5, r2:40, dur:C.channelMs, rgb:"255,170,60"});
        showBanner(`🔔 UN CAMPANERO TOCA LA CAMPANA DE ${b.name.toUpperCase()}`);
        if(!tutSeen("cm_bell")) cmTutSay("cm_bell", "El CAMPANERO canaliza: si termina, llegan más enemigos. Pegale fuerte o aturdilo para cortar la campana. Es prioridad.", 9000, true);
      }
      if(dist < 120){ P.st = "fight"; P.t = 0; P.cd = 1500; }
      return true;
    }
  }
  // pelea: campanazo con empuje
  if(dist > e.radius + tgt.radius - 4) cmStep(e, tgt, dist, dt);
  if(dist <= e.radius + tgt.radius + 12 && e.atkCd2 <= 0){
    e.atkCd2 = 1500; e.attackAnim = 400; _cmPack(e, "bell", 500);
    damageHero(tgt, e.dmg*1.1, e);
    const d = dist||1; tgt.x += (tgt.x - e.x)/d*40; tgt.y += (tgt.y - e.y)/d*40; cmClamp(tgt);
    playSfx("cmBellHit");
  }
  return true;
}
function cmBellComplete(e, bi){
  const C = CM_CFG.campanero, b = CM_MAP.bells[bi];
  playSfx("cmBell"); vfxShake(6); flashScreen(0.12, "255,190,90");
  if(typeof CIUDAD_FX!=="undefined") bossSheetFx("cmBellSummon", b.x, b.y, 150, 900, {anchorY:0.6});
  vfxShock(b.x, b.y, 40, C.revealR, "255,180,80", 900, 2);
  // refuerzos: llegan por las salidas más cercanas a la campana
  const n = Math.round(cmRand(C.reinf[0], C.reinf[1]));
  const ex = CM_MAP.exits.slice().sort((a, c)=>Math.hypot(a.x - b.x, a.y - b.y) - Math.hypot(c.x - b.x, c.y - b.y)).slice(0, 2);
  for(let i=0;i<n;i++){ const p = ex[i % ex.length]; const f = cmNearestFree(p.x + cmRand(-60, 60), p.y + cmRand(-60, 60), 24); cmSpawnAt(i % 3===2 ? "cm_sectario" : "cm_saqueador", f.x, f.y); }
  // el campanazo también revela a los civiles escondidos cerca (buscalos antes que la Horda)
  let rev = 0;
  for(const c of cmS.civ){ if(c.st===CIV.HIDDEN && Math.hypot(c.x - b.x, c.y - b.y) < C.revealR){ cmCivDiscover(c); rev++; } }
  showBanner(`🔔 ¡LA CAMPANA SONÓ! Llegan refuerzos${rev ? ` · ${rev} civil${rev>1?"es":""} al descubierto` : ""}`);
}

/* ---------------- Sectario Fanático ---------------- */
function cmAISectario(e, dt, tgt, dist){
  const C = CM_CFG.sectario;
  e.atkCd = 1e6; e.atkCd2 = (e.atkCd2||0) - dt;
  if(e.sp){
    e.sp.t += dt; e.cmBusy = true; _cmPack(e, "prep", 400);
    if(e.sp.t >= C.primeWind){ cmSectarioBoom(e); }
    return true;
  }
  e._near = (e._near||0) + (dist < 90 ? dt : 0);
  if(e.hp < e.maxHp*C.primeAt || e._near > 3500){
    e.sp = {t:0}; e.cmBusy = true;
    vfxTelegraph({shape:0, follow:e, r:C.primeR, dur:C.primeWind, rgb:"255,110,30"});
    playSfx("cmFuse"); floatText(e.x, e.y - 60, "¡VA A ESTALLAR!", "warn");
    if(!tutSeen("cm_sect")) cmTutSay("cm_sect", "El SECTARIO se prepara para ESTALLAR: lastima a campeones, civiles y edificios. Alejate o terminalo antes.", 7000);
    return true;
  }
  if(dist > e.radius + tgt.radius - 4) cmStep(e, tgt, dist, dt);
  cmMelee(e, tgt, dist, 950, 1);
  return true;
}
function cmSectarioBoom(e){
  const C = CM_CFG.sectario;
  e.sp = null;
  cmHeroesNear(e.x, e.y, C.primeR, h=>bossHitHero(h, e.dmg*C.boomMult, {from:e}));
  cmCivsNear(e.x, e.y, C.primeR, c=>cmHurtCiv(c, e.dmg*C.boomMult*C.civMult, e));
  cmStructArea(e.x, e.y, C.primeR + 40, C.structDmg, e);
  if(typeof CIUDAD_FX!=="undefined") bossSheetFx("cmBoomFx", e.x, e.y, 110, 520, {anchorY:0.7});
  vfxBurst(e.x, e.y - 20, 18, "ember", 160, 600, 4, 2, -40, 0); vfxShake(5); playSfx("cmBoom");
  e.cmBoomed = 1;
  damageEnemy(e, e.hp + 1, {noCrit:true});
}

/* ---------------- Espectro Ciudadano ---------------- */
function cmAIEspectro(e, dt, tgt, dist){
  const C = CM_CFG.espectro;
  e.atkCd = 1e6; e.cmGhost = 1; e.flying = true;
  if(e.drCd===undefined){ e.drCd = cmRand(1500, C.drainCd[1]); e.poCd = cmRand(2500, C.possessCd[1]); }
  e.drCd -= dt; e.poCd -= dt;
  if(e.dr){
    const h = heroes[e.dr.h]; e.dr.t += dt;
    if(!h || !h.alive || Math.hypot(h.x - e.x, h.y - e.y) > C.drainR*1.4 || e.stunTimer > 0){ e.dr = null; e.cmBusy = false; return true; }
    _cmPack(e, "drain", 400);
    e.dr.acc = (e.dr.acc||0) + dt;
    if(e.dr.acc >= 300){ e.dr.acc = 0; const dmg = e.dmg*0.35; damageHero(h, dmg, e); e.hp = Math.min(e.maxHp, e.hp + dmg*C.healPct); }
    if(e.dr.t >= C.drainMs){ e.dr = null; e.cmBusy = false; }
    return true;
  }
  if(e.poCd <= 0){
    const c = cmNearestCiv(e.x, e.y, 520, c=>c.st===CIV.FOLLOW || c.st===CIV.IDLE);
    if(c){
      const d = cmStepTo(e, c.x, c.y, dt, 1.2);
      if(d < 30){ e.poCd = cmRand(C.possessCd[0], C.possessCd[1]); cmCivPanic(c, e.x, e.y, 2200); _cmPack(e, "possess", 700); if(typeof CIUDAD_FX!=="undefined") bossSheetFx("cmSpecPossess", c.x, c.y - 20, 50, 500, {anchorY:0.7}); playSfx("cmWhisper"); }
      return true;
    }
    e.poCd = 1500;
  }
  if(e.drCd <= 0 && dist < C.drainR){ e.drCd = cmRand(C.drainCd[0], C.drainCd[1]); e.dr = {h:heroes.indexOf(tgt), t:0}; e.cmBusy = true; playSfx("cmWhisper"); return true; }
  // flota derecho (atraviesa paredes)
  if(dist > e.radius + tgt.radius){ const k = cmSpd(e)*dt/1000; e.x += (tgt.x - e.x)/(dist||1)*k; e.y += (tgt.y - e.y)/(dist||1)*k; }
  _cmFace(e, tgt.x, tgt.y);
  return true;
}

/* ---------------- proyectiles propios ---------------- */
function cmShotsUpdate(dt){
  for(let i=cmS.shots.length-1;i>=0;i--){
    const s = cmS.shots[i]; s.t += dt;
    s.x += s.vx*dt/1000; s.y += s.vy*dt/1000;
    let hit = false;
    for(const h of heroes){ if(h.alive && Math.hypot(h.x - s.x, h.y - 30 - s.y) < s.r + (h.radius||18)){ bossHitHero(h, s.dmg, {from:null}); hit = true; break; } }
    if(!hit && s.t > 120 && !cmInside(s.x, s.y + 30, 0) && !s.ghost) hit = true;   // chocan contra las paredes
    if(hit || s.t >= s.d){ if(hit && inView(s.x, s.y, 60)) vfxBurst(s.x, s.y, 6, s.k==="tear" ? "blood" : "arcane", 70, 360, 3, 1, 0, 0); cmS.shots.splice(i, 1); }
  }
}

/* ---------------- oleadas ---------------- */
function cmSpawnPool(level){
  const P = [], add = (t, w)=>P.push({t, w});
  if(cmS && (cmS.sub.st==="fight1" || cmS.sub.st==="fight2")){ add("cm_saqueador", 5); add("cm_sectario", 2); return P; }
  if(level <= 1){ add("cm_saqueador", 10); }
  else if(level === 2){ add("cm_saqueador", 9); add("cm_perro", 4); }
  else if(level === 3){ add("cm_saqueador", 8); add("cm_perro", 3); add("cm_raptor", 2.4); }
  else if(level === 4){ add("cm_saqueador", 7); add("cm_perro", 3); add("cm_raptor", 2); add("cm_verdugo", 1.1); }
  else if(level === 5){ add("cm_saqueador", 7); add("cm_perro", 2.5); add("cm_raptor", 2); add("cm_verdugo", 0.8); add("cm_planidera", 2.4); }
  else if(level === 6){ add("cm_saqueador", 6); add("cm_perro", 2.5); add("cm_raptor", 1.8); add("cm_verdugo", 0.8); add("cm_planidera", 1.6); add("cm_acechante", 2); add("cm_sectario", 3); }
  else if(level === 7){ add("cm_saqueador", 5); add("cm_perro", 2); add("cm_raptor", 1.8); add("cm_verdugo", 0.8); add("cm_planidera", 1.5); add("cm_acechante", 1.5); add("cm_sectario", 3); add("cm_campanero", 1); add("cm_espectro", 3); }
  else if(level === 8){ add("cm_saqueador", 5); add("cm_perro", 2.5); add("cm_raptor", 2); add("cm_verdugo", 1); add("cm_planidera", 1.8); add("cm_acechante", 1.6); add("cm_sectario", 3); add("cm_campanero", 1); add("cm_espectro", 2.5); }
  else if(level === 9){ add("cm_saqueador", 6); add("cm_sectario", 3); add("cm_espectro", 2); add("cm_perro", 2); }
  else { add("cm_saqueador", 5); add("cm_sectario", 2); }
  const cap = {cm_raptor:level >= 6 ? 3 : 2, cm_verdugo:level >= 8 ? 2 : 1, cm_campanero:1, cm_planidera:3, cm_acechante:2, cm_espectro:5};
  const n = {}; for(const e of enemies){ if(e.alive && cap[e.type]) n[e.type] = (n[e.type]||0) + 1; }
  for(const p of P){ if(cap[p.t] && (n[p.t]||0) >= cap[p.t]) p.w = 0; }
  return P;
}
function cmSpawnIntervalMult(){
  if(!cmS) return 1.4;
  if(runLevel === LEVEL_COUNT) return cmS.pr.st==="fight" ? 4.5 : 3.0;
  if(cmS.sub.st==="fight1" || cmS.sub.st==="fight2") return 3.2;
  if(cmS.sub.st==="blackout" || cmS.sub.st==="curtain" || cmS.sub.st==="reveal") return 99;
  return runLevel <= 1 ? 2.0 : (runLevel <= 3 ? 1.7 : 1.5);
}
const CM_ENEMY_AI = {cm_saqueador:cmAISaqueador, cm_perro:cmAIPerro, cm_raptor:cmAIRaptor, cm_verdugo:cmAIVerdugo, cm_planidera:cmAIPlanidera,
                     cm_acechante:cmAIAcechante, cm_campanero:cmAICampanero, cm_sectario:cmAISectario, cm_espectro:cmAIEspectro};
