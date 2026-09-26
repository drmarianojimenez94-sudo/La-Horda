"use strict";
/* ============================================================
   js/arenas/abismo/ab-enemies.js
   Los seis enemigos de la Arena del Abismo (números en AB_CFG). Cada uno enseña una parte de
   "el terreno es un recurso":
     Errante del Vacío     cuerpo a cuerpo; golpe fuerte con aviso que EMPUJA (cerca del borde, peligra)
     Acechador del Borde   rápido, busca los flancos y los bordes; salta con aviso y empuja al caer
     Heraldo del Ojo       a distancia: orbe lento y legible que abre una ZONA GRAVITATORIA (atrae a todos)
     Devorador de Piedra   pesado: sus pasos y su pisotón AGRIETAN el piso (nunca lo derrumban solo:
                           como mucho lo dejan crítico). Usalo para romper la plataforma de la horda.
     Tejedor del Vacío     tiende FILAMENTOS entre dos puntos: cruzarlos frena y tira un poco
     Jinete Sin Cabeza     muestra la trayectoria y CARGA: empuja fuerte a TODOS en su línea, héroes
                           y enemigos. Puesto bien, tira a la horda al vacío (maestría de arena).
   Cada IA devuelve true (el motor saltea la persecución genérica).
   ============================================================ */
let _abEid = 0;
function _abPack(e, set, ms){ e.packSet = set; e.packTimer = ms; e.packDur = ms; }
function _abFace(e, x, y){ const dx = x-e.x, dy = y-e.y, d = Math.hypot(dx,dy)||1; e.fx = dx/d; e.fy = dy/d; }
function abSpd(e){ return e.abBusy ? 0 : e.speed*(1 - Math.min(0.8, e.slowAmt||0)); }
function abStep(e, tgt, dist, dt, mult){ aidEnemyStep(e, tgt.x-e.x, tgt.y-e.y, dist, abSpd(e)*(mult||1), dt); }
function abStepTo(e, x, y, dt, mult){ const d = Math.hypot(x-e.x, y-e.y); if(d > 6) aidEnemyStep(e, x-e.x, y-e.y, d, abSpd(e)*(mult||1), dt); }
function abMelee(e, tgt, dist, cd, mult){
  if(dist <= e.radius + tgt.radius + 8 && e.atkCd2 <= 0){
    e.atkCd2 = cd; e.attackAnim = 300;
    damageHero(tgt, e.dmg*(mult||1), e);
    return true;
  }
  return false;
}
function abHeroesNear(x, y, R, fn){ for(const h of heroes){ if(h.alive && !h.abHang && Math.hypot(h.x-x, h.y-y) <= R + (h.radius||18)*0.5) fn(h); } }
function abId(e){ return e.abId || (e.abId = ++_abEid); }

/* ---------------- Errante del Vacío ---------------- */
function abAIErrante(e, dt, tgt, dist){
  const C = AB_CFG.errante;
  e.atkCd = 1e6; e.atkCd2 = (e.atkCd2||0) - dt;
  if(e.strongCd===undefined) e.strongCd = abRand(1500, C.strongCd[1]);
  e.strongCd -= dt;
  if(e.abWind){
    e.abWind -= dt; _abFace(e, tgt.x, tgt.y);
    if(e.abWind <= 0){
      e.abWind = 0; e.abBusy = false;
      const fx = e.fx, fy = e.fy, cx = e.x + fx*C.strongR*0.55, cy = e.y + fy*C.strongR*0.55;
      abHeroesNear(cx, cy, C.strongR*0.75, h=>{ bossHitHero(h, e.dmg*C.strongMult, {from:e}); abShove(h, h.x - e.x, h.y - e.y, C.knock, e); });
      if(typeof ABISMO_FX!=="undefined") bossSheetFx("abErranteImpact", cx, cy, 60, 380, {anchorY:0.6});
      playSfx("abHeavy");
    }
    return true;
  }
  if(e.strongCd <= 0 && dist < C.strongR + 30){
    e.strongCd = abRand(C.strongCd[0], C.strongCd[1]); e.abWind = C.strongWind; e.abBusy = true;
    _abPack(e, "strong", C.strongWind + 300);
    vfxTelegraph({shape:1, x:e.x, y:e.y, r:C.strongR + 20, dx:e.fx, dy:e.fy, arc:0.8, dur:C.strongWind, rgb:"190,90,255"});
    return true;
  }
  if(dist > e.radius + tgt.radius - 4) abStep(e, tgt, dist, dt);
  abMelee(e, tgt, dist, 1100, 1);
  return true;
}

/* ---------------- Acechador del Borde ---------------- */
function abAIAcechador(e, dt, tgt, dist){
  const C = AB_CFG.acechador;
  e.atkCd = 1e6; e.atkCd2 = (e.atkCd2||0) - dt;
  if(e.leapCd===undefined) e.leapCd = abRand(1400, 3000);
  e.leapCd -= dt;
  const A = e.ac || (e.ac = {st:"stalk", t:0, side:Math.random() < 0.5 ? -1 : 1});
  A.t += dt;
  if(A.st==="stalk"){
    // flanco: se abre hacia el costado del objetivo que da al vacío
    const px = -(tgt.y - e.y)/dist, py = (tgt.x - e.x)/dist;
    if(A.t > 900){
      A.t = 0;
      const pA = abNearestGround(tgt.x + px*C.flankR, tgt.y + py*C.flankR, 0), pB = abNearestGround(tgt.x - px*C.flankR, tgt.y - py*C.flankR, 0);
      A.side = (pA.d > pB.d) ? 1 : -1;
    }
    if(dist > C.leapRange[1] || e.leapCd > 0){
      const fx = tgt.x + px*C.flankR*A.side*0.8, fy = tgt.y + py*C.flankR*A.side*0.8;
      if(dist > 90) abStepTo(e, fx, fy, dt); else abStep(e, tgt, dist, dt);
    }
    if(abMelee(e, tgt, dist, 950, 1)) _abPack(e, "claw", 420);
    if(e.leapCd <= 0 && dist >= C.leapRange[0] && dist <= C.leapRange[1] && !tgt.abHang){
      A.st = "warn"; A.t = 0;
      const n = abNearestGround(tgt.x, tgt.y, AB_EDGE);
      A.tx = n.x; A.ty = n.y; A.fx = e.x; A.fy = e.y;
      const ux = (A.tx - e.x)/(Math.hypot(A.tx - e.x, A.ty - e.y)||1), uy = (A.ty - e.y)/(Math.hypot(A.tx - e.x, A.ty - e.y)||1);
      vfxTelegraph({shape:0, r:60, x:A.tx, y:A.ty, dur:C.warnMs, rgb:"180,90,255"});
      vfxTelegraph({shape:2, r:14, x:e.x, y:e.y, dx:ux, dy:uy, len:Math.hypot(A.tx - e.x, A.ty - e.y), dur:C.warnMs, rgb:"180,90,255"});
      if(typeof ABISMO_FX!=="undefined") bossSheetFx("abAcechWarn", A.tx, A.ty, 50, C.warnMs, {anchorY:0.5});
      playSfx("abHiss"); _abPack(e, "leap", C.warnMs + C.leapMs);
    }
    return true;
  }
  if(A.st==="warn"){
    _abFace(e, A.tx, A.ty);
    if(A.t >= C.warnMs){ A.st = "leap"; A.t = 0; playSfx("abLeap"); e.abNoClamp = true; }
    return true;
  }
  if(A.st==="leap"){
    const q = Math.min(1, A.t/C.leapMs);
    e.x = A.fx + (A.tx - A.fx)*q; e.y = A.fy + (A.ty - A.fy)*q; e.hover = -Math.sin(q*Math.PI)*46;
    if(q >= 1){
      e.hover = 0; e.abNoClamp = false;
      abHeroesNear(A.tx, A.ty, 58, h=>{ damageHero(h, e.dmg*C.dmgMult, e); abShove(h, h.x - A.fx, h.y - A.fy, C.push, e); });
      if(typeof ABISMO_FX!=="undefined") bossSheetFx("abAcechImpact", A.tx, A.ty, 56, 380, {anchorY:0.6});
      A.st = "rec"; A.t = 0; e.dmgTakenMult = 1.3; e.leapCd = abRand(C.leapCdMs[0], C.leapCdMs[1]);
    }
    return true;
  }
  if(A.t >= 650){ A.st = "stalk"; A.t = 0; e.dmgTakenMult = 1; }
  return true;
}

/* ---------------- Heraldo del Ojo ---------------- */
function abAIHeraldo(e, dt, tgt, dist){
  const C = AB_CFG.heraldo;
  e.atkCd = 1e6;
  if(e.orbCd===undefined) e.orbCd = abRand(1400, 2600);
  e.orbCd -= dt;
  if(e.abCast){
    e.abCast -= dt; _abFace(e, tgt.x, tgt.y);
    if(e.abCast <= 0){
      e.abCast = 0;
      // orbe lento hacia donde está el objetivo (no persigue: se esquiva caminando)
      const tx = tgt.x, ty = tgt.y, d = Math.hypot(tx - e.x, ty - e.y)||1;
      abS.orbs.push({x:Math.round(e.x), y:Math.round(e.y - 30), vx:(tx - e.x)/d*C.orbSpeed, vy:(ty - e.y)/d*C.orbSpeed, tx:Math.round(tx), ty:Math.round(ty), t:0, life:Math.min(4200, d/C.orbSpeed*1000 + 200), dmg:e.dmg});
      playSfx("abOrb");
    }
    return true;
  }
  if(dist < C.keepMin){ abStepTo(e, e.x - (tgt.x - e.x), e.y - (tgt.y - e.y), dt, 0.9); }
  else if(dist > C.keepMax) abStep(e, tgt, dist, dt);
  if(e.orbCd <= 0 && dist <= C.keepMax + 80 && !tgt.abHang){
    e.orbCd = abRand(C.orbCd[0], C.orbCd[1]); e.abCast = 620; _abPack(e, "orb", 900);
    e.attackAnim = 400;
  }
  return true;
}
function abOrbsUpdate(dt){
  const C = AB_CFG.heraldo;
  for(let i=abS.orbs.length-1;i>=0;i--){
    const o = abS.orbs[i]; o.t += dt;
    o.x += o.vx*dt/1000; o.y += o.vy*dt/1000;
    let pop = o.t >= o.life || Math.hypot(o.tx - o.x, o.ty - o.y + 30) < 14;
    if(!pop){ for(const h of heroes){ if(h.alive && !h.abHang && Math.hypot(h.x - o.x, h.y - 20 - o.y) < (h.radius||18) + 10){ damageHero(h, o.dmg, {x:o.x, y:o.y, rank:"subelite"}); pop = true; break; } } }
    if(pop){
      abS.orbs.splice(i, 1);
      const n = abNearestGround(o.x, o.y + 30, 0);
      abS.zones.push({x:Math.round(n.x), y:Math.round(n.y), r:C.zoneR, t:0, d:C.zoneMs, k:"grav"});
      if(typeof ABISMO_FX!=="undefined") bossSheetFx("abHeraldoHit", n.x, n.y, 50, 360, {anchorY:0.6});
      playSfx("abGrav");
      abTutSay("ab_grav", "Zona GRAVITATORIA: atrae a todo lo que esté cerca, héroes y horda. Salí caminando hacia afuera… o dejá que junte a los enemigos.", 7000);
    }
  }
  if(abS.orbs.length > 14) abS.orbs.splice(0, abS.orbs.length - 14);
}
// Zonas gravitatorias (Heraldo) y de atracción (El Que Mora Debajo): tiran hacia el centro.
function abZonesUpdate(dt){
  for(let i=abS.zones.length-1;i>=0;i--){
    const z = abS.zones[i]; z.t += dt;
    if(z.t >= z.d){ abS.zones.splice(i, 1); continue; }
    const pull = (z.k==="grav" ? AB_CFG.heraldo.pull : AB_CFG.morador.pull), R = z.r*1.35;
    const act = z.t > 250;
    if(!act) continue;
    const affect = (ent, mult)=>{
      const dx = z.x - ent.x, dy = z.y - ent.y, d = Math.hypot(dx, dy);
      if(d > R || d < 8) return;
      const k = pull*mult*dt/1000*(0.5 + 0.5*(1 - d/R));
      ent.x += dx/d*Math.min(k, d - 6); ent.y += dy/d*Math.min(k, d - 6);
    };
    for(const h of heroes){ if(h.alive && !h.abHang) affect(h, 1 - (typeof heroCcResist==="function" ? heroCcResist(h) : 0)); }
    for(const e of enemies){ if(e.alive && !e.structure && e.rank!=="jefe" && e.rank!=="subjefe" && e.type!=="ab_heraldo") affect(e, e.type==="ab_devorador" ? 0.3 : 1); }
  }
}

/* ---------------- Devorador de Piedra ---------------- */
function abAIDevorador(e, dt, tgt, dist){
  const C = AB_CFG.devorador;
  e.atkCd = 1e6; e.atkCd2 = (e.atkCd2||0) - dt;
  if(e.stompCd===undefined) e.stompCd = abRand(2500, C.stompCd[1]);
  e.stompCd -= dt;
  if(e.abWind){
    e.abWind -= dt;
    if(e.abWind <= 0){
      e.abWind = 0; e.abBusy = false;
      abHeroesNear(e.x, e.y, C.stompR, h=>{ bossHitHero(h, e.dmg*C.stompMult, {from:e, slow:0.3, slowDur:900}); abShove(h, h.x - e.x, h.y - e.y, 36, e); });
      abDamageArea(e.x, e.y, C.stompR, C.stompStruct, {cap:1});      // agrieta, nunca derrumba solo
      if(typeof ABISMO_FX!=="undefined") bossSheetFx("abDevFracture", e.x, e.y + 4, 120, 700, {anchorY:0.5});
      vfxShock(e.x, e.y, 10, C.stompR, "190,110,255", 420, 1); playSfx("abStomp");
      if(player && Math.hypot(player.x - e.x, player.y - e.y) < 600) vfxShake(4);
      abTutSay("ab_dev", "El DEVORADOR agrieta el piso con cada pisotón. Si lo llevás a donde está la horda, después un golpe fuerte la tira abajo.", 8000);
    }
    return true;
  }
  if(e.stompCd <= 0 && dist < C.stompR + 40){
    e.stompCd = abRand(C.stompCd[0], C.stompCd[1]); e.abWind = C.stompWind; e.abBusy = true;
    _abPack(e, "stomp", C.stompWind + 300);
    vfxTelegraph({shape:0, x:e.x, y:e.y, r:C.stompR, dur:C.stompWind, rgb:"190,110,255"});
    return true;
  }
  const moving = dist > e.radius + tgt.radius - 4;
  if(moving){
    abStep(e, tgt, dist, dt);
    e.stepT = (e.stepT||0) + dt;
    if(e.stepT >= C.stepMs){ e.stepT = 0; abDamagePlat(abPlatAt(e.x, e.y, 0), C.stepDmg, {cap:1}); if(inView(e.x, e.y, 60)) vfxBurst(e.x, e.y + 6, 4, "rock", 60, 360, 3, 0, -10, 0); }
  }
  if(abMelee(e, tgt, dist, 1500, 1.15)) _abPack(e, "atk", 520);
  return true;
}

/* ---------------- Tejedor del Vacío ---------------- */
function abAITejedor(e, dt, tgt, dist){
  const C = AB_CFG.tejedor;
  e.atkCd = 1e6; e.atkCd2 = (e.atkCd2||0) - dt;
  if(e.weaveCd===undefined) e.weaveCd = abRand(1800, 3200);
  e.weaveCd -= dt;
  if(e.abCast){
    e.abCast -= dt;
    if(e.abCast <= 0){
      e.abCast = 0;
      // filamento que cruza el camino entre él y el objetivo (perpendicular), con los dos extremos en el piso
      const mx = (e.x + tgt.x)/2, my = (e.y + tgt.y)/2, px = -(tgt.y - e.y)/dist, py = (tgt.x - e.x)/dist;
      const L = abRand(C.lineLen[0], C.lineLen[1])/2;
      const a = abNearestGround(mx + px*L, my + py*L, AB_EDGE), b = abNearestGround(mx - px*L, my - py*L, AB_EDGE);
      const id = abId(e);
      const mine = abS.lines.filter(l=>l.o===id);
      if(mine.length >= C.maxLines) abS.lines.splice(abS.lines.indexOf(mine[0]), 1);
      if(Math.hypot(a.x - b.x, a.y - b.y) > 90) abS.lines.push({x0:Math.round(a.x), y0:Math.round(a.y), x1:Math.round(b.x), y1:Math.round(b.y), t:0, d:C.lineMs, o:id});
      playSfx("abWeave");
      abTutSay("ab_line", "FILAMENTO del Tejedor: cruzarlo te frena y te tira hacia él. Rodealo o matá al Tejedor y se corta.", 7000);
    }
    return true;
  }
  if(dist < C.keepMin) abStepTo(e, e.x - (tgt.x - e.x), e.y - (tgt.y - e.y), dt, 0.9);
  else if(dist > C.keepMax) abStep(e, tgt, dist, dt);
  if(abMelee(e, tgt, dist, 1100, 1)) _abPack(e, "atk", 380);
  if(e.weaveCd <= 0 && dist < 520){ e.weaveCd = abRand(C.weaveCd[0], C.weaveCd[1]); e.abCast = C.weaveMs; _abPack(e, "weave", C.weaveMs + 200); }
  return true;
}
function _abSegDist(px, py, x0, y0, x1, y1){
  const dx = x1 - x0, dy = y1 - y0, L = dx*dx + dy*dy || 1;
  const t = Math.max(0, Math.min(1, ((px - x0)*dx + (py - y0)*dy)/L));
  return {d:Math.hypot(px - (x0 + dx*t), py - (y0 + dy*t)), t};
}
function abLinesUpdate(dt){
  const C = AB_CFG.tejedor;
  for(let i=abS.lines.length-1;i>=0;i--){
    const l = abS.lines[i]; l.t += dt;
    if(l.t >= l.d || !enemies.some(e=>e.alive && e.abId===l.o)){ abS.lines.splice(i, 1); continue; }
    if(l.t < 350) continue;
    for(const h of heroes){
      if(!h.alive || h.abHang) continue;
      const q = _abSegDist(h.x, h.y, l.x0, l.y0, l.x1, l.y1);
      if(q.d > (h.radius||18)*0.6 + 6) continue;
      if(h._abLineAt && runElapsedMs - h._abLineAt < 900) continue;
      h._abLineAt = runElapsedMs;
      h.slowAmt = Math.max(h.slowAmt||0, C.slow); h.slowTimer = Math.max(h.slowTimer||0, C.slowMs);
      const cx = (l.x0 + l.x1)/2, cy = (l.y0 + l.y1)/2, d = Math.hypot(cx - h.x, cy - h.y)||1;
      h.x += (cx - h.x)/d*Math.min(C.pull, d); h.y += (cy - h.y)/d*Math.min(C.pull, d);
      if(inView(h.x, h.y, 40)) vfxBurst(h.x, h.y - 20, 5, "arcane", 60, 300, 2.5, h===player?1:0, -20, 1);
    }
  }
}

/* ---------------- Jinete Sin Cabeza ---------------- */
function abChargeLine(e, tgt){
  const C = AB_CFG.jinete, dx = tgt.x - e.x, dy = tgt.y - e.y, d = Math.hypot(dx, dy)||1, ux = dx/d, uy = dy/d;
  let len = 0;
  for(let s=30; s<=C.len; s+=20){ if(abWalkable(e.x + ux*s, e.y + uy*s, 14)) len = s; else break; }
  return {ux, uy, len};
}
function abAIJinete(e, dt, tgt, dist){
  const C = AB_CFG.jinete;
  e.atkCd = 1e6; e.atkCd2 = (e.atkCd2||0) - dt;
  if(e.chargeCd===undefined) e.chargeCd = abRand(2200, 3800);
  const J = e.jn || (e.jn = {st:"roam", t:0});
  J.t += dt;
  if(J.st==="roam"){
    e.chargeCd -= dt;
    if(dist > 420) abStep(e, tgt, dist, dt);
    else if(dist < 200) abStepTo(e, e.x - (tgt.x - e.x), e.y - (tgt.y - e.y), dt, 0.8);
    if(abMelee(e, tgt, dist, 1400, 1)) _abPack(e, "impact", 420);
    if(e.chargeCd <= 0 && dist < C.len && !tgt.abHang){
      const L = abChargeLine(e, tgt);
      if(L.len >= 200){
        J.st = "prep"; J.t = 0; J.ux = L.ux; J.uy = L.uy; J.len = L.len; J.x0 = e.x; J.y0 = e.y; J.hit = [];
        e.abBusy = true; e.fx = L.ux; e.fy = L.uy;
        abS.charges.push({x0:Math.round(e.x), y0:Math.round(e.y), x1:Math.round(e.x + L.ux*L.len), y1:Math.round(e.y + L.uy*L.len), t:0, d:C.prepMs, w:C.hitW, o:abId(e)});
        vfxTelegraph({shape:2, r:C.hitW, x:e.x, y:e.y, dx:L.ux, dy:L.uy, len:L.len, dur:C.prepMs, rgb:"170,90,255"});
        _abPack(e, "prep", C.prepMs); playSfx("abHorse");
        abTutSay("ab_jin", "El JINETE marca su carga en el piso y embiste en línea: empuja a TODO lo que toque, también a la horda. Ponelos en su camino.", 8000);
      } else e.chargeCd = 800;
    }
    return true;
  }
  if(J.st==="prep"){
    if(J.t >= C.prepMs){ J.st = "charge"; J.t = 0; e.abNoClamp = true; playSfx("abCharge"); }
    return true;
  }
  if(J.st==="charge"){
    const s = Math.min(J.len, J.t/1000*C.speed);
    e.x = J.x0 + J.ux*s; e.y = J.y0 + J.uy*s; e.fx = J.ux; e.fy = J.uy;
    _abPack(e, "charge", 300);
    if(Math.random() < dt/60 && typeof ABISMO_FX!=="undefined") bossSheetFx("abJinTrail", e.x - J.ux*30, e.y, 50, 420, {anchorY:0.5});
    // golpea a todo lo que esté en su línea (una vez a cada uno): empuja hacia el costado
    const side = (ox, oy)=>{ const c = (ox - e.x)*(-J.uy) + (oy - e.y)*J.ux; return c >= 0 ? 1 : -1; };
    for(const h of heroes){
      if(!h.alive || h.abHang || J.hit.includes(h)) continue;
      if(Math.hypot(h.x - e.x, h.y - e.y) > C.hitW + (h.radius||18)) continue;
      J.hit.push(h); const sg = side(h.x, h.y);
      bossHitHero(h, e.dmg*C.dmgMult, {from:e});
      abShove(h, -J.uy*sg + J.ux*0.35, J.ux*sg + J.uy*0.35, C.knockHero, e);
    }
    for(const o of enemies){
      if(o===e || !o.alive || o.structure || o.rank==="jefe" || o.rank==="subjefe" || J.hit.includes(o)) continue;
      if(Math.hypot(o.x - e.x, o.y - e.y) > C.hitW + (o.radius||18)) continue;
      J.hit.push(o); const sg = side(o.x, o.y);
      damageEnemy(o, o.maxHp*C.enemyDmgPct, {src:e._jinBy || heroes.find(h=>h.alive) || player, fromProc:true});
      abShove(o, -J.uy*sg + J.ux*0.35, J.ux*sg + J.uy*0.35, C.knockEnemy, null);
      if(inView(o.x, o.y, 60)) floatText(o.x, o.y - (o.radius||20)*2, "¡ARROLLADO!", null);
    }
    if(s >= J.len){
      J.st = "rec"; J.t = 0; e.abBusy = false; e.abNoClamp = false; e.dmgTakenMult = 1.4;
      e.chargeCd = abRand(C.cdMs[0], C.cdMs[1]); _abPack(e, "turn", C.recoverMs);
      if(typeof ABISMO_FX!=="undefined") bossSheetFx("abJinImpact", e.x, e.y, 60, 380, {anchorY:0.6});
      if(J.hit.some(o=>!o.cls)) abS.shown.jinWeapon = (abS.shown.jinWeapon||0) + 1;
    }
    return true;
  }
  if(J.t >= C.recoverMs){ J.st = "roam"; J.t = 0; e.dmgTakenMult = 1; }
  return true;
}

/* ---------------- oleadas: composición progresiva (una mecánica nueva por nivel, después combinadas) ---------------- */
function abSpawnPool(level){
  const P = [], add = (t, w)=>P.push({t, w});
  if(level <= 1){ add("ab_errante", 10); }
  else if(level === 2){ add("ab_errante", 9); add("ab_acechador", 3.5); }
  else if(level === 3){ add("ab_errante", 8); add("ab_acechador", 3); add("ab_heraldo", 2.6); }
  else if(level === 4){ add("ab_errante", 8); add("ab_acechador", 3); add("ab_heraldo", 2); add("ab_devorador", 1.3); }
  else if(level === 5){ add("ab_errante", 7); add("ab_acechador", 3); add("ab_heraldo", 2); add("ab_devorador", 1); add("ab_tejedor", 2.4); }
  else if(level === 6){ add("ab_errante", 7); add("ab_acechador", 2.5); add("ab_heraldo", 1.6); add("ab_tejedor", 1.4); add("ab_jinete", 1.1); }
  else if(level === 7){ add("ab_errante", 8); add("ab_acechador", 3); add("ab_heraldo", 3); add("ab_devorador", 1.6); add("ab_tejedor", 1.4); add("ab_jinete", 0.7); }
  else if(level === 8){ add("ab_errante", 7); add("ab_acechador", 3); add("ab_heraldo", 2); add("ab_devorador", 1); add("ab_tejedor", 2.6); add("ab_jinete", 1.4); }
  else if(level === 9){ add("ab_errante", 7); add("ab_acechador", 3); add("ab_heraldo", 2.4); add("ab_devorador", 1); add("ab_tejedor", 1.4); }
  else { add("ab_errante", 6); add("ab_acechador", 2); }
  const cap = {ab_jinete:level >= 8 ? 2 : 1, ab_devorador:level >= 7 ? 3 : 2, ab_tejedor:3, ab_heraldo:4, ab_acechador:6};
  const n = {}; for(const e of enemies){ if(e.alive && cap[e.type]) n[e.type] = (n[e.type]||0) + 1; }
  for(const p of P){ if(cap[p.t] && (n[p.t]||0) >= cap[p.t]) p.w = 0; }
  return P;
}
function abSpawnIntervalMult(){
  if(!abS) return 1.3;
  if(runLevel === LEVEL_COUNT) return 3.0;
  if(abS.ca.st==="fight" || abS.ca.st==="rise") return 2.4;
  return runLevel <= 1 ? 1.9 : (runLevel <= 3 ? 1.65 : 1.5);   // pocas y legibles al principio: la dificultad viene de la composición
}
const AB_ENEMY_AI = {ab_errante:abAIErrante, ab_acechador:abAIAcechador, ab_heraldo:abAIHeraldo, ab_devorador:abAIDevorador, ab_tejedor:abAITejedor, ab_jinete:abAIJinete};
