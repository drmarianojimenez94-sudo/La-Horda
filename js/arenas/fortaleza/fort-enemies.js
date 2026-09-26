"use strict";
/* ============================================================
   js/arenas/fortaleza/fort-enemies.js
   Los seis enemigos de la Fortaleza (IA propia; números en FORT_CFG):
     Carcelero Deforme      cuerpo a cuerpo + TIRÓN DE CADENA (aviso, enfriamiento, inmunidad: sin stunlock)
     Dragón de Bronce       volador que acosa: mordida en picada, ALIENTO DE VAPOR (cono, ralentiza),
                            al morir estalla en vapor (aviso en el piso antes de dañar)
     Autómata de Hierro     tanque lento: golpe frontal + PROTOCOLO DE EMBESTIDA; si choca contra un
                            borde/muro queda ATURDIDO y vulnerable
     Prisionero Ensamblado  enjambre errático; al morir se parte en 2 Engendros (que no se parten)
     Verdugo de Vapor       élite con hacha; SOBREPRESIÓN: más rápido y fuerte, pero recibe más daño
     Araña Mecánica         a distancia, mantiene la distancia; RED DE CADENAS (zona lenta) y REPARA
                            a los enemigos mecánicos (rayo visible: se la puede interrumpir matándola)
   Cada IA devuelve true si ya movió/atacó este cuadro (el motor saltea la persecución genérica).
   ============================================================ */
function _fr(a){ return a[0] + Math.random()*(a[1]-a[0]); }

// Campos propios al aparecer (una sola vez por enemigo).
function fortInitEnemy(e){
  if(e._fi) return; e._fi = 1;
  const B = ENEMY_BASE[e.type] || {};
  if(B.flying) e.flying = true;
  if(B.mech) e.mech = true;
  const C = FORT_CFG;
  if(e.type==="carcelero"){ e.chainCd = _fr([4000, 7000]); }
  else if(e.type==="dragon_bronce"){ e.hover = -34; e.breathCd = 2500 + Math.random()*2500; e.orbDir = Math.random()<0.5 ? 1 : -1; }
  else if(e.type==="automata"){ e.slamCd = 1200; e.chargeCd = _fr([3500, 6000]); e.dmgTakenMult = C.automata.armor; }
  else if(e.type==="prisionero" || e.type==="engendro"){ e.jit = Math.random()*6.283; }
  else if(e.type==="verdugo"){ e.axeCd = 800; e.overCd = _fr([5000, 8000]); }
  else if(e.type==="arana"){ e.shotCd = 900; e.netCd = _fr([3500, 6000]); e.repairCd = _fr([2500, 4000]); e.strafe = Math.random()<0.5 ? 1 : -1; }
}

// Objetivo: el héroe vivo más cercano AL QUE SE PUEDE LLEGAR (los voladores llegan a todos).
function fortEnemyTarget(e){
  let best = null, bd = Infinity, any = null, ad = Infinity;
  const myComp = e.flying ? -2 : fortCompAt(e.x, e.y);
  for(const h of heroes){
    if(!h.alive || h.stealthTimer>0) continue;
    const d = Math.hypot(h.x-e.x, h.y-e.y);
    if(d < ad){ ad = d; any = h; }
    if(myComp!==-2 && fortCompAt(h.x, h.y)!==myComp) continue;
    if(d < bd){ bd = d; best = h; }
  }
  e._fortStranded = !best;
  return best || any;
}
function _fortReach(e, h){ return e.flying || fortCompAt(e.x, e.y)===fortCompAt(h.x, h.y); }
function _fortFace(e, x, y){ const dx = x-e.x, dy = y-e.y, d = Math.hypot(dx,dy)||1; e.fx = dx/d; e.fy = dy/d; }
function _fortPack(e, set, ms){ e.packSet = set; e.packTimer = ms; e.packDur = ms; }
function _fortHeroesInCone(x, y, dx, dy, R, arc, fn){
  const ca = Math.cos(arc);
  for(const h of heroes){
    if(!h.alive) continue;
    const hx = h.x-x, hy = h.y-y, d = Math.hypot(hx,hy);
    if(d > R + (h.radius||20)*0.5) continue;
    if(d > 20 && (hx*dx + hy*dy)/d < ca) continue;
    fn(h, d);
  }
}
function _fortMelee(e, tgt, dist, cd, mult){
  if(dist <= e.radius + tgt.radius + 8 && e.atkCd2 <= 0){
    e.atkCd2 = cd; e.attackAnim = 300;
    damageHero(tgt, e.dmg*(mult||1), e);
    return true;
  }
  return false;
}

/* ---------------- Carcelero Deforme ---------------- */
function fortAICarcelero(e, dt, tgt, dist){
  const C = FORT_CFG.carcelero;
  e.chainCd -= dt;
  const ch = e.fortChain;
  if(ch){
    if(ch.st==="fly"){
      ch.d += C.chainSpeed*dt/1000;
      const hx = e.x + ch.dx*ch.d, hy = e.y + ch.dy*ch.d;
      ch.x = hx; ch.y = hy;
      let caught = null;
      for(const h of heroes){ if(h.alive && Math.hypot(h.x-hx, h.y-hy) < (h.radius||20) + 12){ caught = h; break; } }
      if(caught){
        damageHero(caught, e.dmg*C.dmgMult, e);
        playSfx("fortChainHit");
        vfxBurst(caught.x, caught.y-14, 8, "spark", 150, 300, 3, 1, -30, 0);
        // sin stunlock ni combos injustos: inmunidad al tirón, y no arrastra hacia una trampa activa
        const dd = Math.hypot(caught.x-e.x, caught.y-e.y), pull = Math.min(C.pullMax, Math.max(0, dd - e.radius - caught.radius - 14));
        const destX = caught.x + (e.x-caught.x)/(dd||1)*pull, destY = caught.y + (e.y-caught.y)/(dd||1)*pull;
        if(caught.alive && !(caught._fortChainImm>0) && !fortTrapDangerAt(destX, destY, 30) && _fortReach(e, caught) && pull > 20){
          caught._fortChainImm = C.immuneMs;
          ch.st = "pull"; ch.t = 0; ch.tgt = caught; ch.rate = pull/C.pullMs;
          caught.slowAmt = Math.max(caught.slowAmt||0, 0.3); caught.slowTimer = Math.max(caught.slowTimer||0, 600);
        } else { ch.st = "back"; ch.t = 0; }
      } else if(ch.d >= ch.max || !fortWalkable(hx, hy, -60)){ ch.st = "back"; ch.t = 0; }
    } else if(ch.st==="pull"){
      ch.t += dt;
      const h = ch.tgt;
      if(!h || !h.alive || ch.t >= C.pullMs){ ch.st = "back"; ch.t = 0; }
      else {
        const dx = e.x-h.x, dy = e.y-h.y, d = Math.hypot(dx,dy)||1;
        if(d > e.radius + h.radius + 12){ const k = Math.min(d - e.radius - h.radius - 12, ch.rate*dt); h.x += dx/d*k; h.y += dy/d*k; clampToArena(h); resolveWallCollision(h); }
        else { ch.st = "back"; ch.t = 0; }
        ch.x = h.x; ch.y = h.y;
      }
    } else {
      ch.t += dt;
      const k = Math.max(0, 1 - ch.t/220);
      ch.x = e.x + (ch.x - e.x)*k; ch.y = e.y + (ch.y - e.y)*k;
      if(ch.t >= 220) e.fortChain = null;
    }
    return true; // mientras la cadena vuela o tira, no camina
  }
  if(!e.bossWind && e.chainCd <= 0 && dist >= C.chainRange[0] && dist <= C.chainRange[1] && !(tgt._fortChainImm>0) && _fortReach(e, tgt)){
    e.chainCd = _fr(C.chainCdMs);
    _fortPack(e, "chain", C.windMs + 500);
    playSfx("fortChain");
    bossWindup(e, C.windMs, "bossCast", {shape:2, r:16, len:C.chainRange[1], aimAt:tgt, rgb:"210,200,180"}, ()=>{
      const t2 = tgt.alive ? tgt : fortEnemyTarget(e); if(!t2) return;
      const dx = t2.x-e.x, dy = t2.y-e.y, d = Math.hypot(dx,dy)||1;
      e.fortChain = {st:"fly", d:e.radius, dx:dx/d, dy:dy/d, x:e.x, y:e.y, max:C.chainRange[1]+60, t:0};
      _fortFace(e, t2.x, t2.y);
      playSfx("fortChainThrow");
    });
    return true;
  }
  e.atkCd2 = (e.atkCd2||0) - dt;
  e.atkCd = 1e6; // el golpe básico lo maneja esta IA
  if(dist > e.radius + tgt.radius - 4) aidEnemyStep(e, tgt.x-e.x, tgt.y-e.y, dist, e.bossWind ? 0 : e.speed*(1-e.slowAmt), dt);
  _fortMelee(e, tgt, dist, 1100, 1);
  return true;
}

/* ---------------- Dragón de Bronce (volador) ---------------- */
function fortAIBronce(e, dt, tgt, dist){
  const C = FORT_CFG.bronce;
  e.breathCd -= dt; e.atkCd2 = (e.atkCd2||0) - dt; e.atkCd = 1e6;
  const spd = e.speed*(1-e.slowAmt)*(e.bossWind ? 0.15 : 1);
  if(e.dive){
    e.dive.t += dt;
    const dx = tgt.x-e.x, dy = tgt.y-e.y, d = Math.hypot(dx,dy)||1;
    const v = spd*2.3*dt/1000; e.x += dx/d*Math.min(v, d); e.y += dy/d*Math.min(v, d);
    e.hover = Math.min(-8, (e.hover||-34) + dt*0.08);
    if(d <= e.radius + tgt.radius + 6){ e.attackAnim = 300; damageHero(tgt, e.dmg, e); playSfx("fortBite"); e.dive = null; e.retreat = 800; e.atkCd2 = 1700; }
    else if(e.dive.t > 1400){ e.dive = null; e.retreat = 500; }
    clampToArena(e);
    return true;
  }
  e.hover = Math.max(-34, (e.hover||-34) - dt*0.05);
  if(!e.bossWind && e.breathCd <= 0 && dist < C.breathR + 10){
    e.breathCd = C.breathCdMs*(0.85 + Math.random()*0.3);
    _fortPack(e, "breath", C.windMs + 600);
    const fdx = (tgt.x-e.x)/dist, fdy = (tgt.y-e.y)/dist;
    bossWindup(e, C.windMs, "bossCast", {shape:1, r:C.breathR, arc:C.breathArc, dx:fdx, dy:fdy, rgb:"235,235,225"}, ()=>{
      _fortHeroesInCone(e.x, e.y, fdx, fdy, C.breathR, C.breathArc, (h)=>{ bossHitHero(h, e.dmg*C.dmgMult, {from:e, slow:C.slow, slowDur:C.slowMs}); });
      for(let k=1;k<=3;k++) vfxSprite(k%2 ? "fortSteamA" : "fortSteamB", 0, e.x + fdx*C.breathR*k/3.4, e.y + fdy*C.breathR*k/3.4, 40+k*14, 700, null, 0.6, fdx<0, 0.6);
      vfxBurst(e.x + fdx*80, e.y + fdy*80, 14, "steam", 200, 600, 5, 1, -40, 0);
      playSfx("fortSteam");
    });
    return true;
  }
  // picada: antes era instantánea (solo el sonido de alas). Ahora avisa 0,45 s con una línea hacia su
  // objetivo (regla de avisos: ataque rápido 0,4-0,7 s), y se puede esquivar corriéndose de la línea.
  if(!e.bossWind && e.atkCd2 <= 0 && dist < 240 && !(e.retreat>0)){
    e.atkCd2 = 1e6; playSfx("fortWing");
    bossWindup(e, 450, "bossCast", {shape:2, r:14, len:Math.min(260, dist + 40), aimAt:tgt, rgb:"255,190,110"}, ()=>{ e.dive = {t:0}; e.atkCd2 = 0; });
    return true;
  }
  // órbita a media distancia (acoso): se acerca/aleja y rodea
  if(e.retreat>0) e.retreat -= dt;
  const want = e.retreat>0 ? C.keepMax : (C.keepMin + C.keepMax)/2;
  const rx = (e.x-tgt.x)/dist, ry = (e.y-tgt.y)/dist;
  // rodea despacio y se deja alcanzar (acosa, no huye): la corrección de distancia es suave
  let mx = -ry*e.orbDir*0.55 + rx*Math.max(-1, Math.min(1, (want-dist)/90)), my = rx*e.orbDir*0.55 + ry*Math.max(-1, Math.min(1, (want-dist)/90));
  const ml = Math.hypot(mx,my)||1; mx /= ml; my /= ml;
  e.x += mx*spd*dt/1000; e.y += my*spd*dt/1000;
  if(Math.random() < dt/4000) e.orbDir *= -1;
  clampToArena(e);
  _fortFace(e, tgt.x, tgt.y);
  return true;
}

/* ---------------- Autómata de Hierro ---------------- */
function fortAIAutomata(e, dt, tgt, dist){
  const C = FORT_CFG.automata;
  e.slamCd -= dt; e.chargeCd -= dt; e.atkCd = 1e6;
  const ch = e.fortCharge;
  if(ch){
    const step = C.chargeSpeed*dt/1000;
    const nx = e.x + ch.dx*step, ny = e.y + ch.dy*step;
    // choca contra el borde (muro/parapeto) -> se estrella, queda aturdido y vulnerable
    if(!fortWalkable(nx + ch.dx*e.radius*0.6, ny + ch.dy*e.radius*0.6, 4)){
      e.fortCharge = null; e.stunTimer = C.stunMs; e.crashVuln = true; e.packSet = null;
      vfxShock(e.x + ch.dx*e.radius, e.y + ch.dy*e.radius, 10, 120, "255,200,120", 420, 1);
      vfxBurst(e.x + ch.dx*e.radius, e.y + ch.dy*e.radius - 20, 16, "spark", 220, 420, 3.5, 1, -60, 0);
      vfxBurst(e.x, e.y - 30, 8, "steam", 90, 600, 5, 1, -80, 0);
      floatText(e.x, e.y-70, "¡SE ESTRELLÓ!", "crit");
      playSfx("fortCrash");
      if(player && Math.hypot(player.x-e.x, player.y-e.y) < 500) vfxShake(6);
      return true;
    }
    e.x = nx; e.y = ny; ch.d += step;
    for(const h of heroes){
      if(!h.alive || ch.hit.includes(h) || Math.hypot(h.x-e.x, h.y-e.y) > e.radius + (h.radius||20) + 4) continue;
      ch.hit.push(h);
      const side = (-(h.x-e.x)*ch.dy + (h.y-e.y)*ch.dx) >= 0 ? 1 : -1;
      damageHero(h, e.dmg*C.chargeMult, e);
      if(h.alive){ h.x += -ch.dy*side*80; h.y += ch.dx*side*80; clampToArena(h); resolveWallCollision(h); }
      vfxBurst(h.x, h.y-16, 10, "rock", 170, 380, 3.5, 1, -40, 0);
    }
    if(Math.random() < dt/40) vfxBurst(e.x - ch.dx*e.radius, e.y - ch.dy*e.radius, 2, "steam", 60, 500, 5, 0, -40, 1);
    if(ch.d >= C.chargeLen){ e.fortCharge = null; e.packSet = null; }
    return true;
  }
  if(!e.bossWind && e.chargeCd <= 0 && dist >= C.chargeRange[0] && dist <= C.chargeRange[1] && _fortReach(e, tgt)){
    e.chargeCd = _fr(C.chargeCdMs);
    _fortPack(e, "charge", C.chargeWind + 200);
    playSfx("fortAutomataCharge");
    showBanner("¡PROTOCOLO DE EMBESTIDA!");
    bossWindup(e, C.chargeWind, "bossHeavyAttack", {shape:2, r:e.radius+14, len:C.chargeLen, aimAt:tgt, rgb:"255,150,60"}, ()=>{
      const t2 = tgt.alive ? tgt : fortEnemyTarget(e); if(!t2) return;
      const dx = t2.x-e.x, dy = t2.y-e.y, d = Math.hypot(dx,dy)||1;
      e.fortCharge = {dx:dx/d, dy:dy/d, d:0, hit:[]};
      _fortPack(e, "charge", 2000);
      _fortFace(e, t2.x, t2.y);
    });
    return true;
  }
  if(!e.bossWind && e.slamCd <= 0 && dist < C.slamR + tgt.radius*0.5){
    e.slamCd = C.slamCdMs;
    const fdx = (tgt.x-e.x)/dist, fdy = (tgt.y-e.y)/dist;
    bossWindup(e, C.slamWind, "bossGroundSlam", {shape:1, r:C.slamR, arc:0.95, dx:fdx, dy:fdy, rgb:"255,170,90"}, ()=>{
      e.attackAnim = 420;
      _fortHeroesInCone(e.x, e.y, fdx, fdy, C.slamR, 0.95, (h)=>bossHitHero(h, e.dmg*1.15, {from:e, knock:55}));
      vfxShock(e.x + fdx*50, e.y + fdy*50, 10, C.slamR, "255,190,120", 360, 1);
      vfxBurst(e.x + fdx*60, e.y + fdy*60, 10, "rock", 150, 380, 3.5, 1, -40, 0);
      playSfx("fortSlam");
    });
    return true;
  }
  if(dist > e.radius + tgt.radius - 4) aidEnemyStep(e, tgt.x-e.x, tgt.y-e.y, dist, e.bossWind ? 0 : e.speed*(1-e.slowAmt), dt);
  return true;
}

/* ---------------- Prisionero Ensamblado / Engendro (enjambre errático) ---------------- */
function fortAIPrisionero(e, dt, tgt, dist){
  const C = FORT_CFG.prisionero;
  e.atkCd2 = (e.atkCd2||0) - dt; e.atkCd = 1e6;
  e.jit = (e.jit||0) + dt/1000*(e.type==="engendro" ? 5 : 3.2);
  if(dist > e.radius + tgt.radius - 4){
    // zigzag: se desvía de costado (más cuanto más lejos), nunca una fila ordenada
    const j = Math.sin(e.jit)*C.jitter*Math.min(1, dist/160) + Math.sin(e.jit*2.3)*0.2;
    const c = Math.cos(j), s = Math.sin(j), dx = tgt.x-e.x, dy = tgt.y-e.y;
    aidEnemyStep(e, dx*c - dy*s, dx*s + dy*c, dist, e.bossWind ? 0 : e.speed*(1-e.slowAmt), dt);
  }
  if(_fortMelee(e, tgt, dist, e.type==="engendro" ? 700 : 950, 1)){
    if(e.type==="prisionero" && Math.random()<0.35) _fortPack(e, "rip", 420);
    vfxBurst(tgt.x, tgt.y-14, 4, "blood", 110, 260, 2.5, 0, -30, 1);
  }
  return true;
}

/* ---------------- Verdugo de Vapor ---------------- */
function fortAIVerdugo(e, dt, tgt, dist){
  const C = FORT_CFG.verdugo;
  e.axeCd -= dt; e.overCd -= dt; e.atkCd = 1e6;
  const over = e.fortOver > 0;
  if(!e.bossWind && !over && e.overCd <= 0 && dist < 420){
    e.overCd = _fr(C.overCdMs);
    _fortPack(e, "steam", C.overWind + 300);
    playSfx("fortSteamBig");
    floatText(e.x, e.y-90, "¡SOBREPRESIÓN!", "crit");
    bossWindup(e, C.overWind, "bossCast", {shape:0, r:e.radius+30, rgb:"255,120,60"}, ()=>{
      e.fortOver = C.overMs; e.dmgTakenMult = C.overTaken;
      vfxBurst(e.x, e.y-50, 22, "steam", 220, 800, 6, 1, -120, 0);
      vfxSprite("fortVerdugoSteamA", 0, e.x, e.y-40, 90, 900, e, 0.4, e.fx<0, 0.8);
    });
    return true;
  }
  const reach = C.axeR*0.8 + tgt.radius*0.5;
  if(!e.bossWind && e.axeCd <= 0 && dist < reach){
    e.axeCd = over ? 1250 : 2100;
    const fdx = (tgt.x-e.x)/dist, fdy = (tgt.y-e.y)/dist, wind = over ? C.axeWind*0.75 : C.axeWind;
    bossWindup(e, wind, "bossHeavyAttack", {shape:1, r:C.axeR, arc:0.8, dx:fdx, dy:fdy, rgb:over ? "255,90,40" : "255,170,90"}, ()=>{
      e.attackAnim = 420;
      _fortHeroesInCone(e.x, e.y, fdx, fdy, C.axeR, 0.8, (h)=>bossHitHero(h, e.dmg*C.axeMult*(e.fortOver>0 ? C.overDmg : 1), {from:e, knock:30}));
      vfxBurst(e.x + fdx*70, e.y + fdy*70, 8, "spark", 170, 300, 3, 1, -30, 0);
      playSfx("fortAxe");
    });
    return true;
  }
  const spd = (e.bossWind ? 0 : e.speed*(over ? C.overSpeed : 1))*(1-e.slowAmt);
  if(dist > reach*0.7) aidEnemyStep(e, tgt.x-e.x, tgt.y-e.y, dist, spd, dt);
  if(over && Math.random() < dt/90) vfxBurst(e.x + (Math.random()-0.5)*30, e.y-60, 2, "steam", 60, 600, 5, 0, -90, 1);
  return true;
}

/* ---------------- Araña Mecánica ---------------- */
function fortAIArana(e, dt, tgt, dist){
  const C = FORT_CFG.arana;
  e.shotCd -= dt; e.netCd -= dt; e.repairCd -= dt; e.atkCd = 1e6;
  // reparando: se queda quieta (se la puede interrumpir: aturdirla o matarla)
  const R = e.fortRepair;
  if(R){
    R.t += dt; R.tick = (R.tick||0) + dt;
    const m = R.tgt;
    if(!m || !m.alive || m.hp >= m.maxHp || R.t >= C.repairMs || Math.hypot(m.x-e.x, m.y-e.y) > C.repairR + 60){ e.fortRepair = null; e.repairCd = _fr(C.repairCdMs); return true; }
    if(R.tick >= C.repairTickMs){
      R.tick = 0;
      const heal = m.maxHp*C.repairPct;
      m.hp = Math.min(m.maxHp, m.hp + heal);
      if(inView(m.x, m.y, 40)) floatText(m.x, m.y-60, "+"+Math.round(heal), "heal");
      vfxBurst(m.x, m.y-30, 5, "spark", 90, 300, 2.5, 0, -40, 1);
    }
    _fortFace(e, m.x, m.y);
    return true;
  }
  if(e.repairCd <= 0){
    let best = null, bw = 0;
    for(const o of enemies){
      if(!o.alive || o===e || !o.mech || o.rank==="jefe" || o.rank==="subjefe") continue;
      const miss = 1 - o.hp/o.maxHp; if(miss < 0.12) continue;
      const d = Math.hypot(o.x-e.x, o.y-e.y); if(d > C.repairR) continue;
      const w = miss*(o.rank==="elite" ? 2 : 1); if(w > bw){ bw = w; best = o; }
    }
    if(best){ e.fortRepair = {tgt:best, t:0}; _fortPack(e, "net", C.repairMs); playSfx("fortRepair"); return true; }
    e.repairCd = 900;
  }
  if(!e.bossWind && e.netCd <= 0 && dist < 360){
    e.netCd = _fr(C.netCdMs);
    const nx = tgt.x, ny = tgt.y;
    _fortPack(e, "net", C.netWarnMs + 300);
    vfxTelegraph({shape:0, r:C.netR, x:nx, y:ny, follow:null, dur:C.netWarnMs, rgb:"200,180,140"});
    playSfx("fortChainThrow");
    e.fortNetAt = {x:nx, y:ny, t:0};
    return true;
  }
  if(e.fortNetAt){
    e.fortNetAt.t += dt;
    if(e.fortNetAt.t >= C.netWarnMs){ fortAddNet(e.fortNetAt.x, e.fortNetAt.y); vfxSprite("fortChainNet", 0, e.fortNetAt.x, e.fortNetAt.y+30, 70, 500, null, 0.3, false, 0.7); playSfx("fortChainHit"); e.fortNetAt = null; }
  }
  // disparo
  if(!e.bossWind && e.shotCd <= 0 && dist <= (e.range||300)){
    e.shotCd = 1700 + Math.random()*500; e.attackAnim = 320;
    const sp = C.boltSpeed;
    _enemyShot(e, (tgt.x-e.x)/dist*sp, (tgt.y-e.y)/dist*sp, e.dmg, {radius:7, color:"#ffb040", fortSpr:"fortSpiderBolt", life:1800});
    playSfx("fortBolt");
  }
  // mantener la distancia (se aleja si la encierran, se acerca si queda lejos, si no rodea)
  const spd = e.speed*(1-e.slowAmt)*(e.bossWind ? 0 : 1);
  const dx = tgt.x-e.x, dy = tgt.y-e.y;
  if(dist < C.keepMin){
    const ax = e.x - dx/dist*40, ay = e.y - dy/dist*40;
    if(fortWalkable(ax, ay, 20)) aidEnemyStep(e, -dx, -dy, dist, spd*1.05, dt);
    else aidEnemyStep(e, -dy*e.strafe, dx*e.strafe, dist, spd, dt);
  } else if(dist > C.keepMax) aidEnemyStep(e, dx, dy, dist, spd, dt);
  else { if(Math.random() < dt/3000) e.strafe *= -1; aidEnemyStep(e, -dy*e.strafe, dx*e.strafe, dist, spd*0.6, dt); }
  _fortFace(e, tgt.x, tgt.y);
  return true;
}

const FORT_ENEMY_AI = {
  carcelero:fortAICarcelero, dragon_bronce:fortAIBronce, automata:fortAIAutomata,
  prisionero:fortAIPrisionero, engendro:fortAIPrisionero, verdugo:fortAIVerdugo, arana:fortAIArana
};

/* ---------------- cada cuadro: mantenimiento del mundo de enemigos ---------------- */
let _fortSpawnAt = null; // si está puesto, el próximo enemigo aparece acá (Engendros, adds del Caballero)
function fortEnemyWorldUpdate(dt){
  for(const e of enemies){
    if(!e.alive) continue;
    fortInitEnemy(e);
    if(e.packTimer > 0){ e.packTimer -= dt; if(e.packTimer <= 0) e.packSet = null; }
    // aturdido/cortado: la cadena se suelta, la carga se corta
    if(e.stunTimer > 0){ if(e.fortChain) e.fortChain = null; if(e.fortCharge){ e.fortCharge = null; e.packSet = null; } if(e.fortRepair) e.fortRepair = null; }
    if(e.crashVuln && !(e.stunTimer > 0)) e.crashVuln = false;
    if(e.fortOver > 0){ e.fortOver -= dt; if(e.fortOver <= 0){ e.fortOver = 0; e.dmgTakenMult = 1; } }
    if(!e.flying && e.rank!=="jefe" && !e.isDuelLocked) fortClamp(e);
    // destrabe: si no avanza hacia un héroe alcanzable, sigue la grilla de caminos aunque "vea" al
    // objetivo (evita quedar empujando contra una esquina) y, si igual no se mueve y nadie lo ve,
    // reaparece por una puerta
    if(e.rank!=="jefe" && e.rank!=="subjefe" && !e.flying && !e.fortCharge && !e.fortRepair && !e.bossWind){
      const mv = Math.hypot(e.x - (e._ux===undefined ? e.x : e._ux), e.y - (e._uy===undefined ? e.y : e._uy));
      e._ut = (e._ut||0) + dt;
      if(e._ut >= 2000){
        const t = fortEnemyTarget(e), far = t && Math.hypot(t.x-e.x, t.y-e.y) > 170;
        if(mv < 25 && far && !e._fortStranded){ e._stk = (e._stk||0) + e._ut; if(e._stk >= 4000){ e._navBlocked = true; e._navT = 2500; } }
        else e._stk = 0;
        if((e._stk||0) >= 14000 && !heroes.some(h=>Math.hypot(h.x-e.x, h.y-e.y) < 650)){ e._stk = 0; fortPlaceSpawn(e, false); e._fs = null; }
        e._ux = e.x; e._uy = e.y; e._ut = 0;
      }
    }
    // enemigo varado del otro lado de un puente y lejos de todos: vuelve a entrar por una puerta
    if(e.rank!=="jefe" && e.rank!=="subjefe" && !e.flying){
      if(e._fortStranded){ e._strT = (e._strT||0) + dt; } else e._strT = 0;
      if(e._strT > 12000){
        let far = true; for(const h of heroes){ if(Math.hypot(h.x-e.x, h.y-e.y) < 700) far = false; }
        e._strT = 0;
        if(far){ e._fortRelocating = true; fortPlaceSpawn(e, false); e._fortRelocating = false; e._fs = null; e._navT = 0; }
      }
    }
  }
  for(const h of heroes){ if(h._fortChainImm > 0) h._fortChainImm -= dt; }
}

// Muertes con efecto propio.
function fortEnemyKilled(e){
  const C = FORT_CFG;
  if(e.type==="dragon_bronce"){
    // estalla en vapor: aviso en el piso y recién después el daño (se puede salir a tiempo)
    const avg = (runDifficulty && runDifficulty.avgHp) || 400;
    bossStrike(e.x, e.y, C.bronce.deathR, C.bronce.deathWarnMs, avg*C.bronce.deathDmgPct, "fire", null);
    vfxSprite("fortSteamA", 0, e.x, e.y+10, 60, 700, null, 0.5, false, 0.7);
    playSfx("fortSteamHiss");
  } else if(e.type==="prisionero"){
    if(enemies.filter(o=>o.alive).length < C.prisionero.maxEnemies){
      for(let i=0;i<C.prisionero.splitN;i++){
        const a = Math.random()*Math.PI*2;
        _fortSpawnAt = {x:e.x + Math.cos(a)*22, y:e.y + Math.sin(a)*22};
        const g = spawnEnemy("engendro", false);
        _fortSpawnAt = null;
        g.xp = Math.round(g.xp*0.5); g.gold = 0;
        g.stunTimer = 380; // tardan un instante en levantarse (no golpean en el mismo cuadro)
      }
      vfxBurst(e.x, e.y-20, 12, "blood", 150, 400, 3, 1, -40, 0);
      vfxSprite("fortClaw", 0, e.x, e.y-10, 50, 380, null, 0.3, false, 0.7);
      playSfx("fortRip");
    }
  } else if(e.type==="automata" || e.type==="verdugo"){
    vfxBurst(e.x, e.y-30, 16, "steam", 160, 700, 5, 1, -80, 0);
    vfxBurst(e.x, e.y-20, 10, "spark", 180, 380, 3, 1, -40, 0);
  } else if(e.type==="arana"){
    vfxBurst(e.x, e.y-10, 10, "spark", 160, 320, 3, 1, -30, 0);
  }
  if(e.type==="dragon_forja") fortDragonKilled(e);
  if(e.type==="caballero") fortKnightKilled(e);
}
