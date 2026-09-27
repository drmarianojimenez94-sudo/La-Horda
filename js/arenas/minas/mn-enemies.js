"use strict";
/* ============================================================
   js/arenas/minas/mn-enemies.js
   Los enemigos de las Minas Profundas (números en MN_CFG). Forman un ECOSISTEMA contra la luz:
     Esclavo Enlazado      presión básica cuerpo a cuerpo; numeroso; tirón de cadena con aviso.
     Insecto de Cristal    rápido y frágil; sale de las vetas (paredes/columnas) en grupos de tres;
                           al morir estalla en esquirlas (aviso corto, daño chico).
     Acechador Ciego       LA OSCURIDAD ES SU HÁBITAT: a oscuras se oculta (solo se le ven los ojos) y
                           caza al guardián que queda aislado en la oscuridad. Antes de saltar SIEMPRE
                           marca el lugar (aviso). En la luz se lo ve y busca volver a la sombra.
     Minero Corrompido     pesado; golpe con aviso que además APAGA las fuentes cercanas; si el equipo
                           está lejos, va a romper una luz; tira rocas (círculo de aviso).
     Escupidor             a distancia; su bola oscura crea una ZONA DE OSCURIDAD temporal donde cae y
                           apaga la antorcha del guardián que golpea.
     Consumidor Luminoso   se prende a una fuente y le ABSORBE la energía (parpadea, se apaga) mientras
                           potencia a los enemigos cercanos. Al morir libera la luz: reenciende fuentes
                           cercanas y cura un poco. Objetivo prioritario.
     DEVORALUZ (élite especial, evento): no viene por el equipo, viene por las LUCES: elige una, viaja,
                           la devora (aviso largo, se puede interrumpir con daño) y busca la siguiente.
   Cada IA devuelve true (el motor saltea la persecución genérica). Solo corre en el anfitrión.
   ============================================================ */
let _mnEid = 0;
function _mnPack(e, set, ms){ e.packSet = set; e.packTimer = ms; e.packDur = ms; }
function _mnFace(e, x, y){ const dx = x - e.x, dy = y - e.y, d = Math.hypot(dx, dy)||1; e.fx = dx/d; e.fy = dy/d; }
function mnAura(e){ return e.mnAura > 0; }
function mnSpd(e){ return e.mnBusy ? 0 : e.speed*(1 - Math.min(0.8, e.slowAmt||0))*(mnAura(e) ? MN_CFG.consumidor.auraSpd : 1)*(e.mnDarkBoost ? 1.18 : 1); }
function mnStep(e, tgt, dist, dt, mult){ aidEnemyStep(e, tgt.x - e.x, tgt.y - e.y, dist, mnSpd(e)*(mult||1), dt); }
function mnStepTo(e, x, y, dt, mult){ const d = Math.hypot(x - e.x, y - e.y); if(d > 6) aidEnemyStep(e, x - e.x, y - e.y, d, mnSpd(e)*(mult||1), dt); return d; }
function mnDmg(e, mult){ return e.dmg*(mult||1)*(mnAura(e) ? MN_CFG.consumidor.auraDmg : 1); }
function mnMelee(e, tgt, dist, cd, mult){
  if(tgt && dist <= e.radius + (tgt.radius||18) + 8 && e.atkCd2 <= 0){ e.atkCd2 = cd; e.attackAnim = 300; damageHero(tgt, mnDmg(e, mult), e); return true; }
  return false;
}
function mnHeroesNear(x, y, R, fn){ for(const h of heroes){ if(h.alive && Math.hypot(h.x - x, h.y - y) <= R + (h.radius||18)*0.5) fn(h); } }
function mnId(e){ return e.mnId || (e.mnId = ++_mnEid); }
function mnEnemyTarget(e){
  let best = null, bd = Infinity;
  for(const h of heroes){ if(!h.alive) continue; const d = Math.hypot(h.x - e.x, h.y - e.y); if(d < bd){ bd = d; best = h; } }
  return best || nearestHeroTo(e.x, e.y);
}
// impacto con aviso en el piso (lo resuelve mnDropsUpdate): shape 0 círculo · 1 cono · 2 línea
function mnDrop(k, x, y, r, wind, dmg, o){ mnS.drops.push(Object.assign({k, x:Math.round(x), y:Math.round(y), r, t:0, d:wind, dmg, sh:0}, o||{})); }
function mnCone(k, e, len, arc, wind, dmg, o){ mnDrop(k, e.x, e.y, len, wind, dmg, Object.assign({sh:1, dx:+e.fx.toFixed(3), dy:+e.fy.toFixed(3), arc, from:mnId(e)}, o||{})); }
function mnLine(k, x, y, x2, y2, w, wind, dmg, o){ mnDrop(k, x, y, w, wind, dmg, Object.assign({sh:2, x2:Math.round(x2), y2:Math.round(y2)}, o||{})); }
function mnShot(e, tx, ty, k, spd, dmgMult, o){
  const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy)||1;
  mnS.shots.push(Object.assign({x:e.x + dx/d*20, y:e.y - 30 + dy/d*20, vx:dx/d*spd, vy:dy/d*spd, t:0, d:Math.min(2600, d/spd*1000 + 120), k, dmg:mnDmg(e, dmgMult), r:16, src:mnId(e), tx:Math.round(tx), ty:Math.round(ty)}, o||{}));
}
function mnEnt(type){ return enemies.find(o=>o.alive && o.type===type) || null; }
function mnById(id){ return enemies.find(o=>o.alive && o.mnId===id) || null; }
// ¿está este punto dentro del aviso? (para bots y para el impacto)
function mnDropHits(D, x, y, pad){
  pad = pad||0;
  if(D.sh===1){ const ax = x - D.x, ay = y - D.y, d = Math.hypot(ax, ay); if(d > D.r + pad) return false; if(d < 30) return true; const c = (ax*D.dx + ay*D.dy)/d; return c >= Math.cos(D.arc); }
  if(D.sh===2){ const ax = D.x2 - D.x, ay = D.y2 - D.y, L2 = ax*ax + ay*ay || 1, t = Math.max(0, Math.min(1, ((x - D.x)*ax + (y - D.y)*ay)/L2)); return Math.hypot(x - (D.x + ax*t), y - (D.y + ay*t)) < D.r + pad; }
  return Math.hypot(x - D.x, y - D.y) < D.r + pad;
}
function mnDropsUpdate(dt){
  for(let i=mnS.drops.length-1;i>=0;i--){
    const D = mnS.drops[i]; D.t += dt;
    if(D.follow){ const h = heroes[D.follow - 1]; if(h && h.alive && D.t < D.d*0.6){ D.x = Math.round(h.x); D.y = Math.round(h.y); } }
    if(D.t < D.d) continue;
    const src = D.from ? mnById(D.from) : null;
    if(D.dmg > 0) for(const h of heroes){ if(h.alive && mnDropHits(D, h.x, h.y, (h.radius||18)*0.5)){ bossHitHero(h, D.dmg, {from:src, knock:D.knock||0, stun:D.stun||0}); if(D.torch) mnSnuffTorch(h, D.torch); } }
    if(D.light){ mnLightsNear(D.x, D.y, D.lr || D.r + 40, L=>mnLightHit(L, D.light, D.lc || null)); }
    if(D.black){ mnLightsBlackout(D.x, D.y, D.black, MN_CFG.light.tempOffMs, D.bn||0); }
    if(D.zone) mnDarkZone(D.x, D.y, D.zone, MN_CFG.light.zoneMs, "spit");
    if(D.fire){ mnS.fire.push({x:D.x, y:D.y, r:D.fire, t:0, d:4200, dps:D.dmg*0.18}); }
    if(D.rubble) mnRubbleAt(D.x, D.y);
    if(D.k==="charge") mnChargeLand(D);
    if(D.warn || D.aim){ mnS.drops.splice(i, 1); continue; }   // avisos puros (el ataque lo hace el que los puso)
    mnDropFx(D);
    mnS.drops.splice(i, 1);
  }
  for(let i=mnS.fire.length-1;i>=0;i--){
    const F = mnS.fire[i]; F.t += dt; F.acc = (F.acc||0) + dt;
    if(F.acc >= 500){ F.acc = 0; mnHeroesNear(F.x, F.y, F.r, h=>bossHitHero(h, F.dps, {})); }
    if(F.t >= F.d) mnS.fire.splice(i, 1);
  }
  for(let i=mnS.rubble.length-1;i>=0;i--){ const R = mnS.rubble[i]; R.t += dt; if(R.t >= R.d) mnS.rubble.splice(i, 1); }
}
const MN_DROP_FX = {slam:"mnQuake", tslam:"mnQuake", quake:"mnQuake", rock:"mnRockLine", meteor:"mnMeteor", collapse:"mnCollapse", stomp:"mnCerbStomp",
  cstomp:"mnCerbStomp", howl:"mnHowl", bolt:"mnDarkBoom", shard:"mnDarkBoom", breath:"mnDarkBoom", summon:"mnHellSummon", flame:"mnCerbStomp"};
function mnDropFx(D){
  const key = MN_DROP_FX[D.k];
  const cx = D.sh===1 ? D.x + D.dx*D.r*0.55 : D.sh===2 ? (D.x + D.x2)/2 : D.x, cy = D.sh===1 ? D.y + D.dy*D.r*0.55 : D.sh===2 ? (D.y + D.y2)/2 : D.y;
  if(key && typeof MINAS_FX!=="undefined" && inView(cx, cy, 200)) bossSheetFx(key, cx, cy, Math.max(70, D.r*(D.sh===1 ? 1.1 : 1.6)), 520, {anchorY:0.8});
  if(D.k==="shard" || D.k==="bolt" || D.k==="breath") vfxBurst(cx, cy, 8, "arcane", 90, 420, 3, 1, -20, 0);
  else vfxBurst(cx, cy, 10, "rock", 120, 520, 3, 1, -30, 0);
  if(D.r > 110) vfxShake(D.k==="cstomp" || D.k==="collapse" ? 9 : 5);
  playSfx(D.k==="shard" ? "mnShard" : D.k==="bolt" ? "mnSpitHit" : D.k==="breath" ? "mnDevBreath" : D.k==="howl" ? "mnHowl" : "mnRock");
}

/* ---------------- Esclavo Enlazado ---------------- */
function mnAIEsclavo(e, dt, tgt, dist){
  const C = MN_CFG.esclavo;
  e.atkCd = 1e6; e.atkCd2 = (e.atkCd2||0) - dt;
  if(e.lungeCd===undefined) e.lungeCd = mnRand(1500, C.lungeCd[1]);
  e.lungeCd -= dt;
  e.mnDarkBoost = !mnIsLit(e.x, e.y);
  if(e.lWind){
    e.lWind -= dt; if(e.lWind > C.lungeWind*0.4) _mnFace(e, tgt.x, tgt.y);
    if(e.lWind <= 0){
      e.lWind = 0; e.mnBusy = false;
      const k = Math.min(70, Math.max(0, dist - e.radius - 12)); e.x += e.fx*k; e.y += e.fy*k; mnClamp(e);
      _mnPack(e, "atk2", 420); playSfx("mnChain");
    }
    return true;
  }
  if(e.lungeCd <= 0 && dist < C.lungeR + 60 && dist > e.radius + 14){
    e.lungeCd = mnRand(C.lungeCd[0], C.lungeCd[1]); e.lWind = C.lungeWind; e.mnBusy = true; _mnPack(e, "atk", C.lungeWind + 300);
    mnLine("chain", e.x, e.y, e.x + e.fx*(C.lungeR + 30), e.y + e.fy*(C.lungeR + 30), 34, C.lungeWind, mnDmg(e, C.lungeMult), {from:mnId(e)});
    return true;
  }
  if(!mnMelee(e, tgt, dist, 950)) mnStep(e, tgt, dist, dt);
  _mnFace(e, tgt.x, tgt.y);
  return true;
}

/* ---------------- Insecto de Cristal ---------------- */
function mnAIInsecto(e, dt, tgt, dist){
  e.atkCd = 1e6; e.atkCd2 = (e.atkCd2||0) - dt;
  if(e.mnEmerge > 0){ e.mnEmerge -= dt; e.mnBusy = e.mnEmerge > 0; _mnPack(e, "idle", 200); return true; }
  // en grupo: el primero de la veta trae a dos más
  if(!e._grp){ e._grp = 1; for(let k=0;k<MN_CFG.insecto.group - 1;k++){ const p = mnNearestFree(e.x + mnRand(-50, 50), e.y + mnRand(-50, 50), 18); const o = mnSpawnAt("mn_insecto", p.x, p.y); if(o){ o._grp = 1; o.mnEmerge = MN_CFG.insecto.emergeMs + k*120; } } }
  e.mnDarkBoost = !mnIsLit(e.x, e.y);
  if(!mnMelee(e, tgt, dist, 700)) mnStep(e, tgt, dist, dt, 1 + 0.15*Math.sin(animNow/200 + mnId(e)));
  _mnFace(e, tgt.x, tgt.y);
  return true;
}

/* ---------------- Acechador Ciego ---------------- */
function mnAIAcechador(e, dt, tgt, dist){
  const C = MN_CFG.acechador;
  e.atkCd = 1e6; e.atkCd2 = (e.atkCd2||0) - dt;
  if(e.mnEmerge > 0){ e.mnEmerge -= dt; e.mnBusy = e.mnEmerge > 0; _mnPack(e, "emerge", 500); return true; }
  e.acCd = (e.acCd===undefined ? 2000 : e.acCd) - dt;
  if(e.vis > 0) e.vis -= dt;
  const lit = mnIsLit(e.x, e.y);
  e.mnHide = !lit && !(e.vis > 0) && !e.amb;
  // emboscada en curso: aviso (sigue un momento al objetivo y después se fija) -> salto
  if(e.amb){
    const A = e.amb, h = heroes[A.h]; A.t += dt;
    if(A.st==="warn"){
      if(h && h.alive && A.t < C.ambushWarn*0.55){ A.x = h.x; A.y = h.y; }
      const D = mnS.drops.find(q=>q.k==="amb" && q.src===mnId(e)); if(D){ D.x = Math.round(A.x); D.y = Math.round(A.y); }
      _mnFace(e, A.x, A.y);
      if(A.t >= C.ambushWarn){ A.st = "leap"; A.t = 0; A.sx = e.x; A.sy = e.y; _mnPack(e, "leap", C.leapMs + 200); playSfx("mnLeap"); }
      return true;
    }
    if(A.st==="leap"){
      const q = Math.min(1, A.t/C.leapMs); e.x = A.sx + (A.x - A.sx)*q; e.y = A.sy + (A.y - A.sy)*q;
      if(q >= 1){ mnClamp(e); e.amb = null; e.mnBusy = false; e.vis = C.visibleMs; e.acCd = mnRand(C.cd[0], C.cd[1]); _mnPack(e, "atk", 420); }
      return true;
    }
  }
  // presa: el guardián A OSCURAS más aislado dentro del radio de caza
  let prey = null, ps = -Infinity;
  heroes.forEach((h, i)=>{ if(!h.alive || !h._mnDark) return; const d = Math.hypot(h.x - e.x, h.y - e.y); if(d > C.huntR) return;
    let allies = 0; for(const o of heroes) if(o!==h && o.alive && Math.hypot(o.x - h.x, o.y - h.y) < 260) allies++;
    const s = -d*0.4 - allies*220; if(s > ps){ ps = s; prey = {h, i, d}; } });
  if(prey && e.acCd <= 0 && prey.d < 300 && !(e.vis > 0)){
    e.amb = {st:"warn", t:0, h:prey.i, x:prey.h.x, y:prey.h.y}; e.mnBusy = true;
    mnDrop("amb", prey.h.x, prey.h.y, C.ambushR, C.ambushWarn + C.leapMs, mnDmg(e, C.ambushMult), {from:mnId(e), src:mnId(e)});
    if(inView(prey.h.x, prey.h.y, 80)) floatText(prey.h.x, prey.h.y - 80, "¡!", "crit");
    playSfx("mnGrowl");
    if(!tutSeen("mn_amb") && prey.h===player) mnTutSay("mn_amb", "Un ACECHADOR te marcó en la oscuridad: salí del círculo. En la luz no se puede esconder.", 7000, true);
    return true;
  }
  if(prey && !(e.vis > 0)){ mnStep(e, prey.h, prey.d, dt, 1.2); _mnFace(e, prey.h.x, prey.h.y); return true; }
  // en la luz (o sin presa): pelea normal, y si hay sombra cerca vuelve a ella
  if(lit && !(e.vis > 0) && dist > 160){
    const dx = e.x - tgt.x, dy = e.y - tgt.y, d = Math.hypot(dx, dy)||1;
    const px = e.x + dx/d*120, py = e.y + dy/d*120;
    if(!mnIsLit(px, py)){ mnStepTo(e, px, py, dt, 0.9); _mnFace(e, tgt.x, tgt.y); return true; }
  }
  if(!mnMelee(e, tgt, dist, 850)) mnStep(e, tgt, dist, dt);
  _mnFace(e, tgt.x, tgt.y);
  return true;
}

/* ---------------- Minero Corrompido ---------------- */
function mnAIMinero(e, dt, tgt, dist){
  const C = MN_CFG.minero;
  e.atkCd = 1e6; e.atkCd2 = (e.atkCd2||0) - dt;
  if(e.slamCd===undefined){ e.slamCd = 1800; e.throwCd = mnRand(2500, C.throwCd[1]); }
  e.slamCd -= dt; e.throwCd -= dt;
  if(e.cast){ e.cast.t += dt; if(e.cast.t >= e.cast.d){ e.cast = null; e.mnBusy = false; } return true; }
  const cast = (set, ms)=>{ _mnPack(e, set, ms + 250); e.cast = {t:0, d:ms}; e.mnBusy = true; };
  const hd = mnMinHeroDist(e.x, e.y);
  // si el equipo está lejos, va a romper la luz más cercana (presiona el territorio)
  if(hd > 420){
    const L = mnNearestLight(e.x, e.y, q=>q.st>0 && Math.hypot(q.x - e.x, q.y - e.y) < 800);
    if(L){
      const d = Math.hypot(L.x - e.x, L.y - e.y);
      if(d < e.radius + 60 && e.slamCd <= 0){
        e.slamCd = mnRand(C.slamCd[0], C.slamCd[1]); _mnFace(e, L.x, L.y);
        mnDrop("slam", L.x, L.y, C.slamR, C.slamWind, mnDmg(e, 1.3), {from:mnId(e), light:C.lightHit + 0.4, lr:C.lightR, lc:"Un Minero"});
        cast("atk2", C.slamWind); playSfx("mnGrunt");
        if(!tutSeen("mn_minero")) mnTutSay("mn_minero", "El MINERO va a romper una luz. Frenalo antes de que golpee.", 7000);
        return true;
      }
      mnStepTo(e, L.x, L.y + 30, dt); _mnFace(e, L.x, L.y); return true;
    }
  }
  if(e.slamCd <= 0 && dist < C.slamR + 60){
    e.slamCd = mnRand(C.slamCd[0], C.slamCd[1]); _mnFace(e, tgt.x, tgt.y);
    mnCone("slam", e, C.slamR + 40, 0.75, C.slamWind, mnDmg(e, 1.4), {light:C.lightHit, lr:C.lightR + 60, lc:"Un Minero", knock:30});
    cast("atk", C.slamWind); playSfx("mnGrunt");
    return true;
  }
  if(e.throwCd <= 0 && dist > 200 && dist < 560){
    e.throwCd = mnRand(C.throwCd[0], C.throwCd[1]); _mnFace(e, tgt.x, tgt.y);
    mnDrop("rock", tgt.x, tgt.y, 70, C.throwWind + 500, mnDmg(e, 1.1), {from:mnId(e)});
    cast("throw", C.throwWind); playSfx("mnThrow");
    return true;
  }
  if(!mnMelee(e, tgt, dist, 1300, 0.9)) mnStep(e, tgt, dist, dt);
  _mnFace(e, tgt.x, tgt.y);
  return true;
}

/* ---------------- Escupidor de Oscuridad ---------------- */
function mnAIEscupidor(e, dt, tgt, dist){
  const C = MN_CFG.escupidor;
  e.atkCd = 1e6;
  if(e.boltCd===undefined) e.boltCd = mnRand(1200, C.boltCd[1]);
  e.boltCd -= dt;
  if(e.cast){ e.cast.t += dt; if(e.cast.t >= e.cast.d){ const f = e.cast.fn; e.cast = null; e.mnBusy = false; if(f) f(); } return true; }
  if(e.boltCd <= 0 && dist < 560){
    e.boltCd = mnRand(C.boltCd[0], C.boltCd[1]);
    const tx = tgt.x, ty = tgt.y; _mnFace(e, tx, ty);
    _mnPack(e, "throw", C.boltWind + 300); e.cast = {t:0, d:C.boltWind, fn:()=>{ mnShot(e, tx, ty, "dark", C.boltSpeed, 1); playSfx("mnSpit"); }}; e.mnBusy = true;
    mnLine("aim", e.x, e.y, tx, ty, 10, C.boltWind, 0, {aim:1});
    return true;
  }
  if(dist < C.keepMin){ const ux = (e.x - tgt.x)/(dist||1), uy = (e.y - tgt.y)/(dist||1); mnStepTo(e, e.x + ux*70, e.y + uy*70, dt, 0.9); }
  else if(dist > C.keepMax) mnStep(e, tgt, dist, dt);
  _mnFace(e, tgt.x, tgt.y);
  return true;
}

/* ---------------- Consumidor Luminoso ---------------- */
function mnAIConsumidor(e, dt, tgt, dist){
  const C = MN_CFG.consumidor;
  e.atkCd = 1e6; e.atkCd2 = (e.atkCd2||0) - dt;
  // potencia a los enemigos cercanos (aura)
  for(const o of enemies){ if(o.alive && o!==e && Math.hypot(o.x - e.x, o.y - e.y) < C.auraR) o.mnAura = 400; }
  let L = e.drainL!=null ? mnS.lights[e.drainL] : null;
  if(!L || L.st===0) { L = mnNearestLight(e.x, e.y, q=>q.st>0 && Math.hypot(q.x - e.x, q.y - e.y) < 950); e.drainL = L ? L.i : null; }
  // si un guardián lo encara cuerpo a cuerpo, se defiende
  if(dist < e.radius + (tgt.radius||18) + 10 && mnMelee(e, tgt, dist, 1100)){ _mnFace(e, tgt.x, tgt.y); return true; }
  if(L){
    const d = Math.hypot(L.x - e.x, L.y - e.y);
    if(d < C.drainR){
      e.mnDrain = L.i; L.dr = 500;
      L.e = Math.max(0, L.e - C.drainRate*dt/1000); const prev = L.st; mnLightSt(L);
      if(prev===2 && L.st===1){ playSfx("mnFlicker"); mnAlert("drain", L.x, L.y, "Un Consumidor absorbe una luz", 2600); if(!tutSeen("mn_cons")) mnTutSay("mn_cons", "El CONSUMIDOR le chupa la energía a la luz y potencia a los demás. Matalo: al morir devuelve la luz.", 8000); }
      if(L.st===0) mnLightOff(L, "Un Consumidor", 0);
      _mnPack(e, "absorb", 300); _mnFace(e, L.x, L.y);
      return true;
    }
    e.mnDrain = null;
    mnStepTo(e, L.x + 60, L.y + 40, dt); _mnFace(e, L.x, L.y);
    return true;
  }
  e.mnDrain = null;
  if(!mnMelee(e, tgt, dist, 1100)) mnStep(e, tgt, dist, dt);
  _mnFace(e, tgt.x, tgt.y);
  return true;
}

/* ---------------- DEVORALUZ (élite especial) ----------------
   SPAWN -> SELECT LIGHT -> TRAVEL -> TELEGRAPH/DEVOUR -> LIGHT OFF -> SELECT NEXT.
   Aparece lejos (nunca encima de una luz), la elige, viaja (la luz objetivo late en violeta y el HUD
   marca adónde va), la devora con un aviso largo; un golpe fuerte lo interrumpe y lo aturde. Si lo
   provocan responde con un aliento en cono (con aviso), pero siempre vuelve a su objetivo. */
function mnDevTarget(e){
  const lit = mnS.lights.filter(L=>L.st>0);
  if(!lit.length) return null;
  // la luz encendida más lejana del equipo (la más difícil de defender)
  let best = null, bs = -Infinity;
  for(const L of lit){ const s = mnMinHeroDist(L.x, L.y)*0.8 - Math.hypot(L.x - e.x, L.y - e.y)*0.35 + Math.random()*60; if(s > bs){ bs = s; best = L; } }
  return best;
}
function mnAIDevoraluz(e, dt, tgt, dist){
  const C = MN_CFG.devoraluz;
  e.atkCd = 1e6; e.atkCd2 = (e.atkCd2||0) - dt;
  if(!e.dv){ e.dv = {st:"SELECT", t:0, L:-1, hp:e.hp}; e.breathCd = 2500; }
  const V = e.dv; V.t += dt; e.breathCd -= dt;
  if(e.cast){ e.cast.t += dt; if(e.cast.t >= e.cast.d){ const f = e.cast.fn; e.cast = null; e.mnBusy = false; if(f) f(); } return true; }
  if(V.st==="STAGGER"){ if(V.t >= C.staggerMs){ V.st = "SELECT"; V.t = 0; } e.mnBusy = V.t < C.staggerMs; return true; }
  // provocado: aliento en cono al guardián que lo encara (y apaga su antorcha)
  if(dist < C.breathR*0.8 && e.breathCd <= 0 && V.st!=="DEVOUR"){
    e.breathCd = mnRand(C.breathCd[0], C.breathCd[1]); _mnFace(e, tgt.x, tgt.y);
    mnCone("breath", e, C.breathR, 0.6, C.breathWind, mnDmg(e, 1.2), {torch:MN_CFG.light.torchSnuffMs});
    _mnPack(e, "drain", C.breathWind + 300); e.cast = {t:0, d:C.breathWind}; e.mnBusy = true;
    return true;
  }
  if(V.st==="SELECT"){
    const L = mnDevTarget(e);
    if(!L){ // sin luces: caza las antorchas del equipo
      if(!mnMelee(e, tgt, dist, 1000, 1.1)) mnStep(e, tgt, dist, dt);
      _mnFace(e, tgt.x, tgt.y); return true;
    }
    V.L = L.i; V.st = "TRAVEL"; V.t = 0;
    mnAlert("dev", L.x, L.y, "El Devoraluz va por una luz", 3600);
  }
  const L = mnS.lights[V.L];
  if(!L || L.st===0){ V.st = "SELECT"; V.t = 0; return true; }
  if(V.st==="TRAVEL"){
    const d = mnStepTo(e, L.x + (e.x < L.x ? -60 : 60), L.y + 30, dt, C.spd*(1 + Math.min(0.6, V.t/20000)));
    _mnFace(e, L.x, L.y);
    if(d < 70){ V.st = "DEVOUR"; V.t = 0; V.hp = e.hp; e.mnBusy = true; playSfx("mnDevour"); mnAlert("dev", L.x, L.y, "¡El Devoraluz está devorando una luz!", C.devourMs); }
    return true;
  }
  if(V.st==="DEVOUR"){
    L.dr = 400; if(V.t > C.devourMs*0.35 && L.st===2){ L.e = Math.min(L.e, 0.45); mnLightSt(L); }
    _mnPack(e, "drain", 300); _mnFace(e, L.x, L.y);
    if(V.hp - e.hp > e.maxHp*C.interruptPct){
      V.st = "STAGGER"; V.t = 0; e.mnBusy = true; _mnPack(e, "hit", C.staggerMs);
      if(inView(e.x, e.y, 80)) floatText(e.x, e.y - 90, "¡INTERRUMPIDO!", "crit");
      playSfx("mnDevHurt"); L.e = Math.max(L.e, 0.6); mnLightSt(L);
      return true;
    }
    if(V.t >= C.devourMs){
      mnLightOff(L, "El Devoraluz", 0); L.dev = 1; mnS.devoured++;
      e.dmg = Math.round(e.dmg*1.05);
      V.st = "SELECT"; V.t = 0; e.mnBusy = false; playSfx("mnDevEat");
      vfxBurst(L.x, L.y - 40, 14, "arcane", 120, 700, 3, 2, -40, 0);
    }
    return true;
  }
  return true;
}
// aparición del Devoraluz: en un túnel a oscuras, lejos del equipo (y de las luces), con alerta
function mnDevSpawn(){
  const S = mnSector(), C = MN_CFG.devoraluz;
  let c = S.tunnels.filter(p=>mnMinHeroDist(p.x, p.y) > C.spawnMin);
  if(!c.length) c = S.tunnels.slice().sort((a, b)=>mnMinHeroDist(b.x, b.y) - mnMinHeroDist(a.x, a.y)).slice(0, 2);
  const p = mnPick(c), f = mnNearestFree(p.x, p.y, 40);
  const e = mnSpawnAt("mn_devoraluz", f.x, f.y);
  if(!e) return null;
  mnS.dev.n++;
  if(typeof MINAS_FX!=="undefined") bossSheetFx("mnTeleport", e.x, e.y, 150, 800, {anchorY:0.85});
  playSfx("mnDevRoar"); vfxShake(6);
  showBanner("⚠ ¡DEVORALUZ! — No viene por ustedes: viene por las LUCES");
  mnAlert("dev", e.x, e.y, "¡DEVORALUZ!", 4000);
  if(!tutSeen("mn_dev")) mnTutSay("mn_dev", "El DEVORALUZ elige una luz, va hacia ella y la devora. Interceptalo: un golpe fuerte lo interrumpe mientras come. Al morir devuelve la luz que robó.", 11000, true);
  return e;
}
function mnDevDirector(dt){
  const plan = MN_CFG.devoraluz.levels[runLevel]||0;
  if(mnS.dev.lv !== runLevel){ mnS.dev.lv = runLevel; mnS.dev.n = 0; mnS.dev.next = levelDuration*0.25; }
  if(!plan || mnS.dev.n >= plan || levelClearing || runEnding || mnDescending()) return;
  if(mnEnt("mn_devoraluz") || mnEnt("mn_titan")) return;
  if(levelTimer >= mnS.dev.next){ mnDevSpawn(); mnS.dev.next = levelTimer + levelDuration*0.35; }
}

/* ---------------- proyectiles propios ---------------- */
function mnShotsUpdate(dt){
  for(let i=mnS.shots.length-1;i>=0;i--){
    const s = mnS.shots[i]; s.t += dt;
    s.x += s.vx*dt/1000; s.y += s.vy*dt/1000;
    let hit = null;
    for(const h of heroes){ if(h.alive && Math.hypot(h.x - s.x, h.y - 30 - s.y) < s.r + (h.radius||18)){ hit = h; break; } }
    const wall = s.t > 120 && !mnInside(s.x, s.y + 30, 0);
    if(hit || wall || s.t >= s.d){
      if(hit){ bossHitHero(hit, s.dmg, {from:null}); if(s.k==="dark") mnSnuffTorch(hit, MN_CFG.escupidor.snuffMs); }
      if(s.k==="dark"){ mnDarkZone(s.x, s.y + 30, MN_CFG.light.zoneR, MN_CFG.light.zoneMs, "spit"); if(typeof MINAS_FX!=="undefined" && inView(s.x, s.y, 80)) bossSheetFx("mnDarkBoom", s.x, s.y + 20, 80, 420, {anchorY:0.7}); playSfx("mnSpitHit"); }
      if(s.k==="rock" && inView(s.x, s.y, 60)) vfxBurst(s.x, s.y, 8, "rock", 90, 420, 3, 1, -20, 0);
      mnS.shots.splice(i, 1);
    }
  }
}

/* ---------------- oleadas: primero enseñar, después combinar ---------------- */
function mnSpawnPool(level){
  const P = [], add = (t, w)=>P.push({t, w});
  if(mnS && mnS.ti.st==="fight"){ add("mn_esclavo", 5); add("mn_insecto", 3); add("mn_escupidor", 1); return P; }
  if(mnS && mnS.cb.st==="fight"){ add("mn_esclavo", 5); add("mn_insecto", 3); return P; }
  if(level <= 1){ add("mn_esclavo", 10); add("mn_insecto", 2); }
  else if(level === 2){ add("mn_esclavo", 9); add("mn_insecto", 5); }
  else if(level === 3){ add("mn_esclavo", 8); add("mn_insecto", 4); add("mn_acechador", 2.6); }
  else if(level === 4){ add("mn_esclavo", 7); add("mn_insecto", 4); add("mn_acechador", 2); add("mn_minero", 1.2); }
  else if(level === 5){ add("mn_esclavo", 7); add("mn_insecto", 3.5); add("mn_acechador", 1.8); add("mn_minero", 0.9); add("mn_escupidor", 2.6); }
  else if(level === 6){ add("mn_esclavo", 6); add("mn_insecto", 3.5); add("mn_acechador", 2); add("mn_minero", 0.9); add("mn_escupidor", 2); add("mn_consumidor", 1.3); }
  else if(level === 7){ add("mn_esclavo", 6); add("mn_insecto", 4); add("mn_acechador", 2.2); add("mn_minero", 1.1); add("mn_escupidor", 2.2); add("mn_consumidor", 1.2); }
  else if(level === 8){ add("mn_esclavo", 6); add("mn_insecto", 4); add("mn_acechador", 2); add("mn_minero", 1); add("mn_escupidor", 2); add("mn_consumidor", 1); }
  else if(level === 9){ add("mn_esclavo", 6); add("mn_insecto", 4); add("mn_acechador", 2.4); add("mn_minero", 1.2); add("mn_escupidor", 2.4); add("mn_consumidor", 1.3); }
  else { add("mn_esclavo", 5); add("mn_insecto", 3); }
  const cap = {mn_minero:level >= 7 ? 2 : 1, mn_consumidor:level >= 7 ? 2 : 1, mn_escupidor:3, mn_acechador:level >= 7 ? 3 : 2, mn_insecto:9};
  const n = {}; for(const e of enemies){ if(e.alive && cap[e.type]) n[e.type] = (n[e.type]||0) + 1; }
  for(const p of P){ if(cap[p.t] && (n[p.t]||0) >= cap[p.t]) p.w = 0; }
  return P;
}
function mnSpawnIntervalMult(){
  if(!mnS) return 1.5;
  if(mnDescending()) return 99;
  if(runLevel === LEVEL_COUNT) return mnS.cb.st==="fight" ? 4.2 : 99;
  if(mnS.ti.st==="fight") return 3.0;
  if(mnS.ti.st==="intro" || mnS.ti.st==="dead") return 99;
  return runLevel <= 1 ? 2.0 : (runLevel <= 3 ? 1.7 : 1.5);
}
const MN_ENEMY_AI = {mn_esclavo:mnAIEsclavo, mn_insecto:mnAIInsecto, mn_acechador:mnAIAcechador, mn_minero:mnAIMinero,
                     mn_escupidor:mnAIEscupidor, mn_consumidor:mnAIConsumidor, mn_devoraluz:mnAIDevoraluz};
