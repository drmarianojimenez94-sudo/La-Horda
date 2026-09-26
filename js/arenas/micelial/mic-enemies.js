"use strict";
/* ============================================================
   js/arenas/micelial/mic-enemies.js
   Los seis enemigos del Reino Micelial (IA propia; números en MIC_CFG):
     Infectado Micelial    cuerpo a cuerpo, masa básica; al morir a veces deja una nube de esporas
     Acechador de Esporas  emboscada: se ENTIERRA (se ve su rastro en el piso, nunca invisible del
                           todo), avanza bajo tierra, AVISA (círculo + siseo) y salta; al caer queda
                           expuesto un instante
     Hinchado              tanque lento: puñetazo telegrafiado + EXPLOSIÓN PREPARADA (se infla con
                           aviso largo); al morir revienta (aviso en el piso antes del daño)
     Peregrino Enraizado   camina disparando poco; al acercarse SE PLANTA (echa raíces) y dispara
                           más seguido, más lejos y más fuerte; se desentierra si lo encaran
     Sabueso Cordyceps     rápido, llega en jauría, salto corto con aviso; deja rastros
                           bioluminiscentes (dibujo)
     Chamán de la Colonia  APOYO PRIORITARIO: regenera a la colonia (canalizado, visible), acelera
                           la germinación de los núcleos, lanza bolas de esporas y su aura potencia
                           a los cercanos (anillo violeta). Mantiene la distancia.
   Cada IA devuelve true (el motor saltea la persecución genérica).
   ============================================================ */
function _micPack(e, set, ms){ e.packSet = set; e.packTimer = ms; e.packDur = ms; }
function _micFace(e, x, y){ const dx = x-e.x, dy = y-e.y, d = Math.hypot(dx,dy)||1; e.fx = dx/d; e.fy = dy/d; }
function micAura(e){ return e._micAura > runElapsedMs; }
function micDmgMult(e){ return micAura(e) ? 1 + MIC_CFG.chaman.auraDmg : 1; }
function micSpd(e){ return e.bossWind ? 0 : e.speed*(1 - Math.min(0.8, e.slowAmt||0))*(e._micHaste||1)*(micAura(e) ? 1 + MIC_CFG.chaman.auraSpd : 1); }
function micStep(e, tgt, dist, dt, mult){ aidEnemyStep(e, tgt.x-e.x, tgt.y-e.y, dist, micSpd(e)*(mult||1), dt); }
function micMelee(e, tgt, dist, cd, mult){
  if(dist <= e.radius + tgt.radius + 8 && e.atkCd2 <= 0){
    e.atkCd2 = cd; e.attackAnim = 300;
    damageHero(tgt, e.dmg*(mult||1)*micDmgMult(e), e);
    return true;
  }
  return false;
}
function micHeroesNear(x, y, R, fn){ for(const h of heroes){ if(h.alive && Math.hypot(h.x-x, h.y-y) <= R + (h.radius||18)*0.5) fn(h); } }
function micHeroesInCone(x, y, dx, dy, R, arc, fn){
  const ca = Math.cos(arc);
  for(const h of heroes){
    if(!h.alive) continue;
    const hx = h.x-x, hy = h.y-y, d = Math.hypot(hx,hy);
    if(d > R + (h.radius||20)*0.5) continue;
    if(d > 20 && (hx*dx + hy*dy)/d < ca) continue;
    fn(h, d);
  }
}
function micShot(e, tgt, speed, dmg, spr, extra){
  const dx = tgt.x-e.x, dy = tgt.y-e.y, d = Math.hypot(dx,dy)||1;
  e.attackAnim = 320;
  return _enemyShot(e, dx/d*speed, dy/d*speed, dmg, Object.assign({fortSpr:spr, radius:8, life:2600, color:"#9cff5a"}, extra||{}));
}

/* ---------------- Infectado Micelial ---------------- */
function micAIInfectado(e, dt, tgt, dist){
  e.atkCd = 1e6; e.atkCd2 = (e.atkCd2||0) - dt;
  if(dist > e.radius + tgt.radius - 4) micStep(e, tgt, dist, dt);
  micMelee(e, tgt, dist, 1000, 1);
  return true;
}

/* ---------------- Acechador de Esporas ---------------- */
function micAIAcechador(e, dt, tgt, dist){
  const C = MIC_CFG.acechador;
  e.atkCd = 1e6; e.atkCd2 = (e.atkCd2||0) - dt;
  if(e.leapCd===undefined) e.leapCd = micRand(1200, 3200);
  e.leapCd -= dt;
  const A = e.ac || (e.ac = {st:"stalk", t:0});
  A.t += dt;
  if(A.st==="stalk"){
    if(dist > e.radius + tgt.radius - 4) micStep(e, tgt, dist, dt);
    micMelee(e, tgt, dist, 950, 1);
    if(e.leapCd <= 0 && dist >= C.hideRange[0] && dist <= C.hideRange[1]){
      A.st = "hide"; A.t = 0; A.dur = micRand(C.hideMs[0], C.hideMs[1]);
      e.micHide = 1; e.dmgTakenMult = 0.6;
      _micPack(e, "hide", A.dur + 200);
      vfxBurst(e.x, e.y, 8, "micSpore", 80, 500, 3, 1, -20, 0);
      playSfx("micBurrow");
    }
    return true;
  }
  if(A.st==="hide"){
    // avanza bajo tierra: se ve la tierra removida y un brillo tenue (mic-render.js)
    _micPack(e, "hide", 400);
    if(dist > 150) micStep(e, tgt, dist, dt, 1.35);
    if(A.t >= A.dur || dist < 160){
      A.st = "warn"; A.t = 0;
      const d = Math.min(dist, C.leapMax), ux = (tgt.x-e.x)/dist, uy = (tgt.y-e.y)/dist;
      A.tx = e.x + ux*d; A.ty = e.y + uy*d; A.fx = e.x; A.fy = e.y;
      e.micHide = 2;
      vfxTelegraph({shape:0, r:66, x:A.tx, y:A.ty, dur:C.warnMs, rgb:"150,120,255"});
      vfxTelegraph({shape:2, r:16, x:e.x, y:e.y, dx:ux, dy:uy, len:d, dur:C.warnMs, rgb:"150,120,255"});
      playSfx("micHiss");
      _micPack(e, "leap", C.warnMs + C.leapMs);
    }
    return true;
  }
  if(A.st==="warn"){
    _micFace(e, A.tx, A.ty);
    if(A.t >= C.warnMs){ A.st = "leap"; A.t = 0; e.micHide = 0; e.dmgTakenMult = 1; playSfx("micLeap"); }
    return true;
  }
  if(A.st==="leap"){
    const q = Math.min(1, A.t/C.leapMs);
    e.x = A.fx + (A.tx - A.fx)*q; e.y = A.fy + (A.ty - A.fy)*q; e.hover = -Math.sin(q*Math.PI)*48;
    if(q >= 1){
      e.hover = 0;
      micHeroesNear(A.tx, A.ty, 62, h=>damageHero(h, e.dmg*C.dmgMult*micDmgMult(e), e));
      vfxSprite("mic_leap_splat", 0, A.tx, A.ty+6, 30, 500, null, 0.3, false, 0.6);
      vfxSprite("mic_claw_blue_a", 0, A.tx, A.ty-10, 46, 360, null, 0.2, e.fx < 0, 0.7);
      A.st = "rec"; A.t = 0; e.dmgTakenMult = 1.3; e.leapCd = micRand(C.leapCdMs[0], C.leapCdMs[1]);
      _micPack(e, "atk", C.recoverMs);
    }
    return true;
  }
  // rec: expuesto un instante (recibe más daño)
  if(A.t >= C.recoverMs){ A.st = "stalk"; e.dmgTakenMult = 1; }
  return true;
}

/* ---------------- Hinchado ---------------- */
function micAIHinchado(e, dt, tgt, dist){
  const C = MIC_CFG.hinchado;
  e.atkCd = 1e6;
  if(e.punchCd===undefined){ e.punchCd = 1200; e.boomCd = micRand(4000, 7000); }
  e.punchCd -= dt; e.boomCd -= dt;
  const B = e.boomS;
  if(B){
    B.t += dt;
    _micPack(e, "prep", 300);
    if(Math.random() < dt/90) vfxBurst(e.x + (Math.random()-0.5)*40, e.y - 40, 2, "micEmber", 60, 400, 3, 0, -40, 1);
    if(B.t >= C.boomWarn){
      e.boomS = null; e.boomCd = micRand(C.boomCdMs[0], C.boomCdMs[1]);
      micHeroesNear(e.x, e.y, C.boomR, h=>bossHitHero(h, e.dmg*C.boomMult*micDmgMult(e), {from:e, knock:90}));
      vfxSprite("mic_boom_big", 0, e.x, e.y+16, 150, 700, null, 0.3, false, 0.85);
      vfxShock(e.x, e.y, 20, C.boomR, "255,150,70", 520, 2);
      micAddCloud(e.x, e.y, "small");
      playSfx("micBurst"); vfxShake(6);
      _micPack(e, "boom", 500);
    }
    return true;
  }
  if(!e.bossWind && e.boomCd <= 0 && dist < C.boomRange){
    e.boomS = {t:0};
    vfxTelegraph({shape:0, r:C.boomR, follow:e, dur:C.boomWarn, rgb:"255,140,60"});
    playSfx("micSwell");
    if(inView(e.x, e.y, 60)) floatText(e.x, e.y - 90, "¡Se infla!", "crit");
    return true;
  }
  if(!e.bossWind && e.punchCd <= 0 && dist < C.punchR*0.85){
    e.punchCd = C.punchCd;
    const fdx = (tgt.x-e.x)/dist, fdy = (tgt.y-e.y)/dist;
    _micPack(e, "atk", C.punchWind + 400);
    bossWindup(e, C.punchWind, "bossHeavyAttack", {shape:1, r:C.punchR, arc:0.7, dx:fdx, dy:fdy, rgb:"255,150,80"}, ()=>{
      e.attackAnim = 380;
      micHeroesInCone(e.x, e.y, fdx, fdy, C.punchR, 0.7, h=>bossHitHero(h, e.dmg*micDmgMult(e), {from:e, knock:50}));
      vfxSprite("mic_slash_red_thin", 0, e.x + fdx*70, e.y + fdy*70, 60, 360, null, 0.2, fdx<0, 0.7);
      playSfx("micSlam");
    });
    return true;
  }
  if(!e.bossWind && dist > e.radius + tgt.radius) micStep(e, tgt, dist, dt);
  return true;
}

/* ---------------- Peregrino Enraizado ---------------- */
function micAIPeregrino(e, dt, tgt, dist){
  const C = MIC_CFG.peregrino;
  e.atkCd = 1e6;
  const P = e.pg || (e.pg = {st:"walk", t:0, shot:micRand(700, 1600)});
  P.t += dt; P.shot -= dt;
  if(P.st==="walk"){
    if(dist > C.walkRange*0.75) micStep(e, tgt, dist, dt);
    else if(dist < 150) micStep(e, {x:e.x*2 - tgt.x, y:e.y*2 - tgt.y}, dist, dt, 0.8); // no se deja encimar
    if(P.shot <= 0 && dist <= C.walkRange){ P.shot = C.walkShotMs; micShot(e, tgt, C.boltSpeed, e.dmg*micDmgMult(e), "mic_green_proj"); playSfx("micShot"); }
    if(dist <= C.plantRange && P.t > 1400){
      P.st = "plant"; P.t = 0;
      _micPack(e, "plant", C.plantMs);
      playSfx("micRoot");
      vfxBurst(e.x, e.y, 8, "micRoot", 70, 500, 3, 1, -10, 0);
    }
    return true;
  }
  if(P.st==="plant"){
    _micFace(e, tgt.x, tgt.y);
    if(P.t >= C.plantMs){ P.st = "planted"; P.t = 0; P.shot = 300; e.dmgTakenMult = 0.85; e.micRooted = 1; }
    return true;
  }
  if(P.st==="planted"){
    _micFace(e, tgt.x, tgt.y);
    if(P.shot <= 0 && dist <= C.plantedRange){
      P.shot = C.plantedShotMs;
      micShot(e, tgt, C.boltSpeed*1.15, e.dmg*1.25*micDmgMult(e), "mic_green_proj", {radius:10, big:1});
      _micPack(e, "atk", 350);
      playSfx("micShot");
    }
    if(P.t > C.plantMaxMs || dist < C.uprootNear || dist > C.plantedRange + 120){
      P.st = "uproot"; P.t = 0; e.micRooted = 0; e.dmgTakenMult = 1;
      _micPack(e, "plant", 600);
    }
    return true;
  }
  if(P.t >= 600){ P.st = "walk"; P.t = 0; }
  return true;
}

/* ---------------- Sabueso Cordyceps ---------------- */
function micAISabueso(e, dt, tgt, dist){
  const C = MIC_CFG.sabueso;
  e.atkCd = 1e6; e.atkCd2 = (e.atkCd2||0) - dt;
  if(e.leapCd===undefined) e.leapCd = micRand(700, 2600);
  e.leapCd -= dt;
  const S = e.sb || (e.sb = {st:"run", t:0});
  S.t += dt;
  if(S.st==="run"){
    if(dist > e.radius + tgt.radius - 4){ micStep(e, tgt, dist, dt); _micPack(e, "run", 2000); e.packTimer = 250; }
    micMelee(e, tgt, dist, 800, 1);
    if(e.leapCd <= 0 && dist >= C.leapRange[0] && dist <= C.leapRange[1]){
      S.st = "warn"; S.t = 0;
      const ux = (tgt.x-e.x)/dist, uy = (tgt.y-e.y)/dist, d = Math.min(dist + 20, C.leapRange[1] + 30);
      S.tx = e.x + ux*d; S.ty = e.y + uy*d; S.fx = e.x; S.fy = e.y;
      vfxTelegraph({shape:2, r:18, x:e.x, y:e.y, dx:ux, dy:uy, len:d, dur:C.leapWarn, rgb:"255,70,90"});
      _micPack(e, "leap", C.leapWarn + C.leapMs);
      if(Math.random() < 0.35) playSfx("micHowl");
    }
    return true;
  }
  if(S.st==="warn"){
    _micFace(e, S.tx, S.ty);
    if(S.t >= C.leapWarn){ S.st = "leap"; S.t = 0; }
    return true;
  }
  // salto
  const q = Math.min(1, S.t/C.leapMs);
  e.x = S.fx + (S.tx - S.fx)*q; e.y = S.fy + (S.ty - S.fy)*q; e.hover = -Math.sin(q*Math.PI)*26;
  if(q >= 1){
    e.hover = 0; S.st = "run"; S.t = 0; e.leapCd = micRand(C.leapCdMs[0], C.leapCdMs[1]);
    micHeroesNear(e.x, e.y, 50, h=>damageHero(h, e.dmg*1.3*micDmgMult(e), e));
    vfxSprite("mic_bite_slash", 0, e.x + e.fx*20, e.y - 10, 36, 300, null, 0.2, e.fx < 0, 0.7);
    micClamp(e);
  }
  return true;
}

/* ---------------- Chamán de la Colonia ---------------- */
function micAIChaman(e, dt, tgt, dist){
  const C = MIC_CFG.chaman;
  e.atkCd = 1e6;
  if(e.regenCd===undefined){ e.regenCd = micRand(2500, 4500); e.germCd = micRand(5000, 8000); e.ballCd = 1400; e.strafe = Math.random() < 0.5 ? 1 : -1; }
  e.regenCd -= dt; e.germCd -= dt; e.ballCd -= dt;
  const ch = e.micChan;
  if(ch){
    ch.t += dt;
    _micFace(e, tgt.x, tgt.y);
    if(ch.k==="regen"){
      _micPack(e, "regen", 400);
      ch.tick -= dt;
      if(ch.tick <= 0){
        ch.tick = C.regenTick;
        for(const o of enemies){
          if(!o.alive || o===e || o.structure || o.rank==="jefe" || o.hp >= o.maxHp) continue;
          if(Math.hypot(o.x-e.x, o.y-e.y) > C.regenR) continue;
          const amt = o.maxHp*C.regenPct*(o.rank==="subjefe" ? 0.25 : 1);
          o.hp = Math.min(o.maxHp, o.hp + amt);
          if(inView(o.x, o.y, 40) && Math.random() < 0.5) floatText(o.x, o.y - 30, "+" + Math.round(amt), "heal");
        }
      }
      if(ch.t >= C.regenMs){ e.micChan = null; e.regenCd = micRand(C.regenCdMs[0], C.regenCdMs[1]); }
      return true;
    }
    if(ch.k==="germ"){
      _micPack(e, "channel", 400);
      if(ch.t >= 1100){
        e.micChan = null; e.germCd = micRand(C.germCdMs[0], C.germCdMs[1]);
        const n = ch.tgt;
        if(n && n.alive && n.nuc){
          n._micBoost = C.germBoostMs;
          if(n.nuc.st < 4) n.nuc.t += MIC_CFG.nucleo.stageMs*0.45;
          vfxBurst(n.x, n.y-30, 14, "micSpore", 130, 600, 3.5, 1, -60, 0);
          if(inView(n.x, n.y, 60)) floatText(n.x, n.y - 80, "¡Germinación acelerada!", "crit");
        } else if(ch.x!==undefined){
          micEcoBloomAt(ch.x, ch.y, 180, FN.MATURE);
          if(enemies.filter(o=>o.alive && !o.structure).length < MIC_CFG.nucleo.spawnCap){ const s = micSpawnAt("infectado", ch.x, ch.y); s.stunTimer = 500; }
          vfxBurst(ch.x, ch.y-10, 12, "micSpore", 110, 600, 3.5, 1, -50, 0);
        }
        playSfx("micGerm");
      }
      return true;
    }
  }
  // regenerar: si hay aliados heridos cerca
  if(e.regenCd <= 0){
    let hurt = 0; for(const o of enemies){ if(o.alive && o!==e && !o.structure && o.hp < o.maxHp*0.85 && Math.hypot(o.x-e.x, o.y-e.y) < C.regenR) hurt++; }
    if(hurt >= 1){
      e.micChan = {k:"regen", t:0, tick:200};
      vfxTelegraph({shape:0, r:C.regenR, follow:e, dur:C.regenMs, rgb:"90,255,170"});
      playSfx("micShaman");
      return true;
    }
    e.regenCd = 1500;
  }
  // germinación acelerada: un núcleo cercano (o hace brotar la tierra)
  if(e.germCd <= 0){
    let best = null, bd = C.germRange;
    for(const n of enemies){ if(n.alive && n.type==="nucleo_micelial" && n.nuc && n.nuc.st < 4){ const d = Math.hypot(n.x-e.x, n.y-e.y); if(d < bd){ bd = d; best = n; } } }
    if(best) e.micChan = {k:"germ", t:0, tgt:best};
    else { const p = micPointNear(e.x, e.y, 120, 260, 40); e.micChan = {k:"germ", t:0, x:p.x, y:p.y}; }
    playSfx("micShaman");
    return true;
  }
  // bola de esporas
  if(e.ballCd <= 0 && dist <= e.range){
    e.ballCd = C.ballCdMs;
    micShot(e, tgt, C.ballSpeed, e.dmg*micDmgMult(e), "mic_green_orb", {radius:11, life:2800});
    _micPack(e, "atk", 360);
    playSfx("micShot");
  }
  // mantener distancia (y moverse de costado para no quedar quieto)
  if(dist < C.keepMin) micStep(e, {x:e.x*2 - tgt.x, y:e.y*2 - tgt.y}, dist, dt, 0.9);
  else if(dist > C.keepMax) micStep(e, tgt, dist, dt);
  else { const sx = -(tgt.y-e.y)/dist*e.strafe, sy = (tgt.x-e.x)/dist*e.strafe; aidEnemyStep(e, sx*100, sy*100, 100, micSpd(e)*0.55, dt); if(Math.random() < dt/2500) e.strafe *= -1; }
  return true;
}

// Estructuras: no caminan ni pegan (el motor solo las dibuja y les baja la vida).
function micAIRaiz(e){ e.atkCd = 1e6; if(e._ax!==undefined){ e.x = e._ax; e.y = e._ay; } return true; }

const MIC_ENEMY_AI = {
  infectado:micAIInfectado, acechador:micAIAcechador, hinchado:micAIHinchado,
  peregrino:micAIPeregrino, sabueso:micAISabueso, chaman:micAIChaman,
  nucleo_micelial:micAINucleo, raiz_absorcion:micAIRaiz
};

/* ---------------- cada cuadro: mantenimiento del mundo de enemigos ---------------- */
let _micNucSeen = [];
function micEnemyWorldUpdate(dt){
  const auraR = MIC_CFG.chaman.auraR;
  // núcleos que desaparecieron sin morir "de verdad" (fin de nivel, llegada de un jefe): su
  // infección igual se retira de a poco
  for(const n of _micNucSeen){ if(!n.alive && !n._micRecd){ n._micRecd = 1; micS.recede.push({x:n.x, y:n.y, r:micNucleoRadius(n), t:0}); if(micS.recede.length > 8) micS.recede.shift(); } }
  _micNucSeen = enemies.filter(e=>e.alive && e.type==="nucleo_micelial");
  const shamans = [];
  for(const e of enemies){
    if(!e.alive) continue;
    if(e.packTimer > 0){ e.packTimer -= dt; if(e.packTimer <= 0) e.packSet = null; }
    if(e.type==="chaman") shamans.push(e);
    // aturdido: se cortan canalizaciones, emboscadas y el inflado
    if(e.stunTimer > 0){
      if(e.micChan) e.micChan = null;
      if(e.ac && (e.ac.st==="hide" || e.ac.st==="warn")){ e.ac.st = "rec"; e.ac.t = 0; e.micHide = 0; e.dmgTakenMult = 1.3; e.leapCd = 3000; }
      if(e.boomS){ e.boomS = null; e.boomCd = 3500; }
      if(e.hover) e.hover = 0;
    }
    if(e.micStatic){ if(e._ax!==undefined){ e.x = e._ax; e.y = e._ay; } continue; }
    if(!e.isDuelLocked && e.rank!=="jefe") micClamp(e); // (un empujón de un héroe después del ajuste del cuadro anterior)
    // destrabe: si no avanza hacia un héroe y nadie lo ve, sigue la grilla y al final vuelve a entrar por un túnel
    if(e.rank!=="jefe" && e.rank!=="subjefe" && !e.bossWind){
      const mv = Math.hypot(e.x - (e._ux===undefined ? e.x : e._ux), e.y - (e._uy===undefined ? e.y : e._uy));
      e._ut = (e._ut||0) + dt;
      if(e._ut >= 2000){
        const far = micMinHeroDist(e.x, e.y) > 200;
        if(mv < 25 && far && e.type!=="peregrino" && e.type!=="chaman"){ e._stk = (e._stk||0) + e._ut; if(e._stk >= 4000){ e._navBlocked = true; e._navT = 2500; } }
        else e._stk = 0;
        if((e._stk||0) >= 12000 && micMinHeroDist(e.x, e.y) > 650){ e._stk = 0; _micSpawnAt = null; micPlaceSpawn(e, false); }
        e._ux = e.x; e._uy = e.y; e._ut = 0;
      }
    }
  }
  // aura del Chamán (se renueva mientras estén cerca)
  if(shamans.length){
    for(const o of enemies){
      if(!o.alive || o.structure || o.type==="chaman" || o.rank==="jefe") continue;
      for(const s of shamans){ if(Math.hypot(o.x-s.x, o.y-s.y) < auraR){ o._micAura = runElapsedMs + 350; break; } }
    }
  }
}
// Después de mover a todos: nadie queda afuera de la caverna ni dentro del capullo.
function micAfterEnemies(){
  for(const e of enemies){
    if(!e.alive) continue;
    if(e.micStatic){ if(e._ax!==undefined){ e.x = e._ax; e.y = e._ay; } continue; }
    if(!e.isDuelLocked) micClamp(e);
  }
}

// Muertes con efecto propio.
function micEnemyKilled(e){
  const C = MIC_CFG;
  if(e.type==="infectado"){
    if(inView(e.x, e.y, 80)) vfxSprite("mic_spore_puff", 0, e.x, e.y+6, 44, 600, null, 0.4, false, 0.8);
    if(Math.random() < C.infectado.cloudChance){ micAddCloud(e.x, e.y, "small"); playSfx("micSpore"); }
  } else if(e.type==="hinchado"){
    const avg = (runDifficulty && runDifficulty.avgHp) || 400;
    bossStrike(e.x, e.y, C.hinchado.deathR, C.hinchado.deathWarn, avg*C.hinchado.deathPct, "fire", null);
    runLater(C.hinchado.deathWarn, ()=>{ vfxSprite("mic_boom_med", 0, e.x, e.y+10, 110, 600, null, 0.3, false, 0.85); playSfx("micBurst"); });
    micAddCloud(e.x, e.y, "small");
  } else if(e.type==="sabueso"){
    if(inView(e.x, e.y, 60)) vfxBurst(e.x, e.y-10, 8, "micBlood", 110, 400, 3, 0, -30, 1);
  } else if(e.type==="chaman"){
    vfxBurst(e.x, e.y-40, 18, "micSpore", 150, 700, 4, 2, -60, 0);
    if(inView(e.x, e.y, 60)) floatText(e.x, e.y - 90, "Chamán caído: la colonia se debilita", "heal");
  } else if(e.type==="nucleo_micelial"){
    micNucleoKilled(e);
  } else if(e.type==="raiz_absorcion"){
    micRootLinkKilled(e);
  } else if(e.type==="micelio"){
    micMicelioKilled(e);
  }
}
