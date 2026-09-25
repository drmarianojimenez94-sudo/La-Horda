"use strict";
/* ============================================================
   js/arenas/fortaleza/fort-bosses.js
   SUBJEFE (nivel 6): DRAGÓN DE LA FORJA — irrumpe rompiendo la compuerta del horno.
     Mordida · Aliento de Forja (barrido telegrafiado) · Bombardeo desde el aire (círculos en el
     piso) · Aleteo de Vapor (empuje) · SOBRECARGA al 30% (rojo -> naranja/blanco, más seguido)
     Al morir explota y ABRE la compuerta blindada hacia el Interior Industrial.
   JEFE (nivel 10): CABALLERO DE LA ARMADURA OXIDADA — sentado en su trono; el equipo entra, la
     puerta se cierra (fort-map.js: fortKnightUpdate) y recién ahí se levanta.
     Fase 1 (100-65%): Espadazo, Golpe de Escudo, Barrido, Carga, Postura de Contraataque.
     Fase 2 (65-30%): clava la espada, la Fortaleza despierta de a poco (trampas de la cámara) y
                      ORDEN DEL CARCELERO (2 refuerzos con enfriamiento y tope).
     Fase 3 (30-0%):  transformación, cadenas, pierde el escudo, espada a dos manos: más rápido,
                      combos y EJECUCIÓN OXIDADA (enorme, con aviso largo: nunca inevitable).
   La dificultad sube por ritmo y lectura, no por más vida.
   ============================================================ */
function _fb(e, set, ms){ e.packSet = set; e.packTimer = ms; e.packDur = ms; }
function _fbTarget(e){ return fortEnemyTarget(e) || nearestHeroTo(e.x, e.y); }

/* ======================= DRAGÓN DE LA FORJA ======================= */
function fortDragonDirector(dt){
  const D = fortS.dragon;
  if(runLevel !== 6 || !D) return;
  if(D.state==="none"){
    if(levelTimer > levelDuration*0.3 && !levelClearing){
      D.state = "warn"; D.t = 0; D.bangs = 0;
      showBanner("¡Algo golpea la compuerta del horno!");
      if(typeof setMusicMode==="function") setMusicMode("prelude");
    }
    return;
  }
  if(D.state==="warn"){
    D.t += dt;
    const G = FORT_MAP.furnaceGate;
    const bangAt = [0, 900, 1800];
    while(D.bangs < bangAt.length && D.t >= bangAt[D.bangs]){
      D.bangs++;
      playSfx("fortForgeBang"); vfxShake(4 + D.bangs*2);
      vfxBurst(G.x - 20, G.y - 40, 10, "spark", 180, 380, 3, 1, -50, 0);
      vfxBurst(G.x - 20, G.y - 20, 6, "ember", 120, 500, 3, 1, -60, 0);
    }
    if(D.t >= FORT_CFG.dragon.entranceMs){
      D.state = "fight"; D.t = 0;
      fortS.furnaceBroken = 1;
      vfxShock(G.x, G.y, 20, 300, "255,150,60", 850, 2);
      vfxBurst(G.x - 30, G.y - 30, 36, "rock", 300, 800, 5, 2, -80, 0);
      vfxBurst(G.x - 30, G.y - 50, 30, "ember", 260, 900, 4, 2, -70, 0);
      vfxSprite("fortExplosion", 0, G.x - 30, G.y + 20, 200, 900, null, 0.3, false, 0.8);
      vfxSprite("fortSmoke", 0, G.x - 60, G.y - 10, 120, 1600, null, 0.6, true, 0.8, 0, -30, -20);
      flashScreen(0.35, "255,190,120"); vfxShake(14);
      playSfx("fortBlast"); playSfx("fortMetal");
      const d = spawnEnemy("dragon_forja", false, false);
      d.x = G.x - 60; d.y = G.y; d.fx = -1; d.fy = 0;
      fortInitEnemy(d);
      d.flying = true; d.hover = -70; d.bossPhase = 1;
      d.dcd = 1800; d.breathCd = 4500; d.bombCd = 9000; d.flapCd = 7000;
      activeChampion = d;
      if(typeof setMusicMode==="function") setMusicMode("boss");
      playSfx("bossRoar");
      arenaTitleCard("SUBJEFE", "DRAGÓN DE LA FORJA", "Nació en el horno donde se templaban las cadenas.", 4200);
    }
  }
}
function fortAIDragon(e, dt, tgt, dist){
  const C = FORT_CFG.dragon;
  const over = !!e.fortOverload;
  const k = over ? 0.65 : 1;
  e.dcd -= dt; e.breathCd -= dt; e.bombCd -= dt; e.flapCd -= dt; e.atkCd = 1e6;
  // SOBRECARGA (una vez, al 30%)
  if(!over && e.hp < e.maxHp*C.overchargeAt){
    e.fortOverload = true; e.enraged = true; e.speed *= C.overSpeed;
    e.bossWind = null; e.fortBreath = null; e.fortFly = null;
    _fb(e, "flap", 1400);
    bossPhaseFeedback();
    showBanner("¡SOBRECARGA! El Dragón de la Forja arde al blanco");
    playSfx("fortOverload");
    vfxShock(e.x, e.y, 20, 260, "255,220,160", 800, 2);
    vfxBurst(e.x, e.y-60, 30, "ember", 260, 900, 4, 2, -80, 0);
    e.dcd = 1200;
    return true;
  }
  // vuelo del Bombardeo
  const F = e.fortFly;
  if(F){
    F.t += dt;
    e.hover = Math.max(-200, (e.hover||-70) - dt*0.25);
    // se desliza despacio sobre el equipo mientras bombardea
    const dx = tgt.x-e.x, dy = tgt.y-e.y, d = Math.hypot(dx,dy)||1;
    e.x += dx/d*Math.min(d, 70*dt/1000); e.y += dy/d*Math.min(d, 70*dt/1000);
    while(F.n < F.max && F.t >= 350 + F.n*260){
      F.n++;
      const alive = heroes.filter(h=>h.alive);
      const h = alive[(Math.random()*alive.length)|0] || tgt;
      const a = Math.random()*Math.PI*2, off = F.n===1 ? 0 : 20 + Math.random()*90;
      const bx = h.x + Math.cos(a)*off, by = h.y + Math.sin(a)*off;
      const delay = C.bombDelay + (over ? -150 : 0);
      bossStrike(bx, by, C.bombR, delay, e.dmg*1.05, "fire", null);
      vfxSprite(F.n%2 ? "fortBombBig" : "fortBombMed", 0, bx, by - 260, 30, delay, null, 0, false, 0.5, 0, 0, 260/(delay/1000));
      runLater(delay, ()=>{ vfxSprite("fortBombBlast", 0, bx, by+10, 70, 520, null, 0.3, false, 0.8); playSfx("fortBomb"); });
    }
    if(F.t >= C.flyMs + 400){ e.fortFly = null; e.dcd = 1300*k; _fb(e, "walk", 600); }
    return true;
  }
  e.hover = Math.min(-70, (e.hover||-70) + dt*0.2);
  // Aliento de Forja: un barrido de fuego de un lado al otro
  const B = e.fortBreath;
  if(B){
    B.t += dt;
    const q = Math.min(1, B.t/B.dur);
    const a = B.a0 + (B.a1-B.a0)*q, cdx = Math.cos(a), cdy = Math.sin(a);
    B.ca = a;
    for(const h of heroes){
      if(!h.alive) continue;
      const hx = h.x-e.x, hy = h.y-e.y, hd = Math.hypot(hx,hy);
      if(hd > B.r || (hd > 30 && (hx*cdx + hy*cdy)/hd < Math.cos(0.3))) continue;
      const last = B.hit[h.classKey+(h._netSlot||0)] || -1e9;
      if(B.t - last < 380) continue;
      B.hit[h.classKey+(h._netSlot||0)] = B.t;
      damageHero(h, e.dmg*0.42, e);
      if(h.alive){ h.burnTimer = Math.max(h.burnTimer||0, 1200); h.burnDmg = Math.max(h.burnDmg||0, e.dmg*0.08); }
    }
    if(Math.random() < dt/35){ const rr = 60 + Math.random()*(B.r-60); vfxBurst(e.x + cdx*rr, e.y + cdy*rr, 3, "ember", 90, 450, 4, 1, -50, 1); }
    if(Math.random() < dt/120) vfxSprite("fortFireBurst", 0, e.x + cdx*B.r*0.6, e.y + cdy*B.r*0.6 + 20, 50, 450, null, 0.4, cdx<0, 0.8);
    if(q >= 1){ e.fortBreath = null; e.dcd = 1400*k; }
    return true;
  }
  if(e.dcd > 5000 && !e.bossWind && !e.fortBreath && !e.fortFly) e.dcd = 1000; // red de seguridad
  if(!e.bossWind && e.dcd <= 0){
    // prioridad: bombardeo > aleteo (si lo rodean) > aliento > mordida
    const near = heroes.filter(h=>h.alive && Math.hypot(h.x-e.x, h.y-e.y) < 230).length;
    if(e.bombCd <= 0){
      e.bombCd = 12500*k; e.dcd = 99999;
      _fb(e, "bomb", 900);
      bossHudHint("Bombardeo", "salí de los círculos del piso");
      showBanner("¡BOMBARDEO!");
      playSfx("fortWing");
      bossWindup(e, 600, "bossCast", null, ()=>{ e.fortFly = {t:0, n:0, max:C.bombN + (over ? 2 : 0)}; _fb(e, "fly", C.flyMs + 400); });
      return true;
    }
    if(e.flapCd <= 0 && near >= 1 && (near >= 2 || Math.random() < 0.5)){
      e.flapCd = 9000*k; e.dcd = 1600*k;
      _fb(e, "flap", 1300);
      bossHudHint("Aleteo de Vapor", "alejate: te empuja fuerte");
      bossWindup(e, 750, "bossGroundSlam", {shape:0, r:240, rgb:"235,235,225"}, ()=>{
        for(const h of heroes){ if(h.alive && Math.hypot(h.x-e.x, h.y-e.y) <= 240 + (h.radius||20)*0.5) bossHitHero(h, e.dmg*0.5, {from:e, knock:150, slow:0.35, slowDur:900}); }
        vfxShock(e.x, e.y, 20, 260, "235,235,225", 520, 2);
        for(let i=0;i<6;i++){ const a = i/6*Math.PI*2; vfxSprite(i%2 ? "fortSteamA" : "fortSteamB", 0, e.x + Math.cos(a)*150, e.y + Math.sin(a)*110, 46, 600, null, 0.6, Math.cos(a)<0, 0.6); }
        playSfx("fortSteamBig"); vfxShake(6);
      });
      return true;
    }
    if(e.breathCd <= 0 && dist < 380){
      e.breathCd = 7500*k; e.dcd = 99999;
      const base = Math.atan2(tgt.y-e.y, tgt.x-e.x), sweep = 1.05, dir = Math.random()<0.5 ? 1 : -1;
      _fb(e, "breath", 900 + 1400);
      bossHudHint("Aliento de Forja", "barre de un lado al otro: cruzá por detrás del dragón");
      bossWindup(e, 950, "bossCast", {shape:1, r:340, arc:sweep, dx:Math.cos(base), dy:Math.sin(base), rgb:"255,110,30"}, ()=>{
        e.fortBreath = {t:0, dur:over ? 1100 : 1400, r:340, a0:base - sweep*dir, a1:base + sweep*dir, hit:{}};
        vfxSprite("fortForgeBreath", 0, e.x + Math.cos(base)*120, e.y + Math.sin(base)*120 + 30, 120, 1300, null, 0.3, Math.cos(base)<0, 0.8);
        playSfx("fortFireBreath");
      });
      return true;
    }
    if(dist < 190){
      e.dcd = 1100*k;
      const fdx = (tgt.x-e.x)/dist, fdy = (tgt.y-e.y)/dist;
      _fb(e, "atk", 900);
      bossWindup(e, 520, "bossHeavyAttack", {shape:1, r:180, arc:0.6, dx:fdx, dy:fdy, rgb:"255,150,80"}, ()=>{
        e.attackAnim = 380;
        for(const h of heroes){ if(!h.alive) continue; const hx = h.x-e.x, hy = h.y-e.y, hd = Math.hypot(hx,hy)||1; if(hd <= 180 + (h.radius||20)*0.5 && (hx*fdx+hy*fdy)/hd > Math.cos(0.6)) bossHitHero(h, e.dmg, {from:e}); }
        vfxSprite("fortClaw", 0, e.x + fdx*90, e.y + fdy*90, 60, 360, null, 0.2, fdx<0, 0.7);
        playSfx("fortBite");
      });
      return true;
    }
  }
  // acercarse volando (se queda a media distancia: no se pega encima)
  if(!e.bossWind && dist > 150){
    const spd = e.speed*1.8*(1-e.slowAmt);
    e.x += (tgt.x-e.x)/dist*spd*dt/1000; e.y += (tgt.y-e.y)/dist*spd*dt/1000;
    clampToArena(e);
  }
  return true;
}
function fortDragonKilled(e){
  const D = fortS.dragon; if(D) D.state = "dead";
  vfxShock(e.x, e.y, 30, 380, "255,200,120", 1000, 2);
  vfxBurst(e.x, e.y-40, 40, "ember", 320, 1000, 5, 2, -80, 0);
  vfxBurst(e.x, e.y-20, 30, "rock", 280, 900, 5, 2, -60, 0);
  vfxSprite("fortExplosionB", 0, e.x, e.y+20, 220, 1000, null, 0.3, false, 0.8);
  vfxShake(14); flashScreen(0.4, "255,210,150"); playSfx("fortBlast");
  if(typeof setMusicMode==="function") setMusicMode("wave", runLevel);
  runLater(1200, ()=>{
    if(!fortS) return;
    fortOpenGate("g_blast", "blast");
    showBanner("¡La explosión abrió la compuerta hacia el Interior!");
  });
  // el nivel cierra poco después (ver fortHoldLevel)
  levelTimer = Math.max(levelTimer, levelDuration - 5500);
}
// El nivel 6 no termina mientras el Dragón siga vivo (su muerte abre el camino).
function fortHoldLevel(){
  if(!fortS) return false;
  if(runLevel===6){ const D = fortS.dragon; return !D || D.state!=="dead"; }
  return false;
}

/* ======================= CABALLERO DE LA ARMADURA OXIDADA ======================= */
function _knightPhase(){ return (fortS.knight && fortS.knight.phase) || 1; }
function fortAIKnight(e, dt, tgt, dist){
  const C = FORT_CFG.caballero, K = fortS.knight;
  if(e.fortDormant || !K || K.state!=="fight"){ e.atkCd = 1e6; if(K && K.state==="waiting"){ _fb(e, "idle", 400); } return true; }
  const P = K.phase || 1;
  if(e.kcd===undefined){ e.kcd = 1500; e.chargeCd = 6000; e.counterCd = 9000; e.orderCd = 4000; e.execCd = 7000; }
  e.kcd -= dt; e.chargeCd -= dt; e.counterCd -= dt; e.orderCd -= dt; e.execCd -= dt; e.atkCd = 1e6;
  // transiciones de fase (una vez cada una)
  if(P===1 && e.hp < e.maxHp*0.65 && !e.fortTrans){ fortKnightToPhase(e, 2); return true; }
  if(P===2 && e.hp < e.maxHp*0.30 && !e.fortTrans){ fortKnightToPhase(e, 3); return true; }
  if(e.fortTrans){
    e.fortTrans.t += dt;
    if(Math.random() < dt/60) vfxBurst(e.x + (Math.random()-0.5)*80, e.y - 40 - Math.random()*60, 2, P===3 ? "ember" : "spark", 90, 500, 3, 0, -60, 1);
    if(e.fortTrans.t >= e.fortTrans.dur){ e.fortTrans = null; e.dmgTakenMult = 1; e.kcd = 900; }
    return true;
  }
  // Postura de Contraataque
  const CT = e.fortCounter;
  if(CT){
    CT.t += dt;
    if(e.hp < CT.hp0 - 1 && !CT.hitBy){ CT.hitBy = (e.lastHitBy && e.lastHitBy.classKey && e.lastHitBy.alive) ? e.lastHitBy : _fbTarget(e); }
    if(CT.t >= C.counterMs || CT.hitBy){
      e.fortCounter = null; e.dmgTakenMult = 1;
      if(CT.hitBy){
        const t2 = CT.hitBy, dx = t2.x-e.x, dy = t2.y-e.y, d = Math.hypot(dx,dy)||1, fdx = dx/d, fdy = dy/d;
        showBanner("¡CONTRAATAQUE!");
        _fb(e, "atk", 900);
        bossWindup(e, 480, "bossHeavyAttack", {shape:1, r:240, arc:0.85, dx:fdx, dy:fdy, rgb:"255,60,40"}, ()=>{
          e.attackAnim = 420;
          _fortHeroesInCone(e.x, e.y, fdx, fdy, 240, 0.85, (h)=>bossHitHero(h, e.dmg*C.counterMult, {from:e, knock:70}));
          vfxSprite("fortExecWave", 0, e.x + fdx*110, e.y + fdy*110, 90, 450, null, 0.3, fdx<0, 0.7);
          playSfx("fortSword");
        });
      } else {
        // nadie cayó en la trampa: queda expuesto un momento
        floatText(e.x, e.y-120, "EXPUESTO", "crit");
        e.dmgTakenMult = 1.3; e.fortExposed = 1500;
      }
      e.kcd = 1100;
    }
    return true;
  }
  if(e.fortExposed > 0){ e.fortExposed -= dt; if(e.fortExposed <= 0) e.dmgTakenMult = 1; }
  // Carga en curso
  const CH = e.fortCharge;
  if(CH){
    const step = 640*dt/1000, nx = e.x + CH.dx*step, ny = e.y + CH.dy*step;
    if(!fortWalkable(nx + CH.dx*e.radius*0.5, ny + CH.dy*e.radius*0.5, 4) || CH.d >= CH.len){
      e.fortCharge = null; e.kcd = 900; _fb(e, "idle", 300);
      vfxBurst(e.x + CH.dx*e.radius, e.y + CH.dy*e.radius - 20, 10, "spark", 180, 380, 3, 1, -40, 0);
      return true;
    }
    e.x = nx; e.y = ny; CH.d += step;
    for(const h of heroes){
      if(!h.alive || CH.hit.includes(h) || Math.hypot(h.x-e.x, h.y-e.y) > e.radius + (h.radius||20)) continue;
      CH.hit.push(h);
      const side = (-(h.x-e.x)*CH.dy + (h.y-e.y)*CH.dx) >= 0 ? 1 : -1;
      bossHitHero(h, e.dmg*1.3, {from:e});
      if(h.alive){ h.x += -CH.dy*side*100; h.y += CH.dx*side*100; clampToArena(h); resolveWallCollision(h); }
    }
    if(Math.random() < dt/40) vfxBurst(e.x - CH.dx*30, e.y, 2, "rock", 60, 400, 3, 0, -20, 1);
    return true;
  }
  // Orden del Carcelero (fase 2+): refuerzos con enfriamiento y tope
  if(P >= 2 && e.orderCd <= 0 && !e.bossWind){
    e.orderCd = C.orderCdMs*(P===3 ? 0.85 : 1);
    const adds = enemies.filter(o=>o.alive && o.fortAdd).length;
    if(adds <= C.orderMaxAdds - 2){
      _fb(e, "plant", 900);
      showBanner("¡ORDEN DEL CARCELERO!");
      bossHudHint("Orden del Carcelero", "llegan refuerzos por los costados");
      playSfx("fortBell");
      const pts = FORT_MAP.spawns[6].slice().sort(()=>Math.random()-0.5);
      const types = ["carcelero", Math.random()<0.5 ? "prisionero" : "arana"];
      types.forEach((t, i)=>{
        const p = pts[i % pts.length];
        _fortSpawnAt = {x:p[0], y:p[1]};
        const a = spawnEnemy(t, false);
        _fortSpawnAt = null;
        a.fortAdd = 1;
        vfxBurst(p[0], p[1]-20, 12, "rock", 150, 500, 3, 1, -40, 0);
      });
      return true;
    }
  }
  // red de seguridad: si un ataque quedó a medias (fase nueva, objetivo perdido) el reloj no queda trabado
  if(e.kcd > 5000 && !e.bossWind && !e.fortCharge && !e.fortCounter && !e.fortTrans) e.kcd = 1000;
  if(!e.bossWind && e.kcd <= 0) { if(fortKnightAttack(e, tgt, dist, P)) return true; }
  // caminar hacia el objetivo
  const want = e.radius + tgt.radius + 30;
  if(!e.bossWind && dist > want){
    const spd = e.speed*(P===3 ? C.p3Speed : 1)*(1-e.slowAmt*0.5);
    e.x += (tgt.x-e.x)/dist*spd*dt/1000; e.y += (tgt.y-e.y)/dist*spd*dt/1000;
    clampToArena(e);
  }
  return true;
}
function fortKnightAttack(e, tgt, dist, P){
  const C = FORT_CFG.caballero, gap = P===3 ? 700 : 1150;
  const fdx = (tgt.x-e.x)/dist, fdy = (tgt.y-e.y)/dist;
  const cone = (set, wind, r, arc, mult, o, label, tip, sfx, then)=>{
    _fb(e, set, wind + 450);
    if(label) bossHudHint(label, tip);
    bossWindup(e, wind, "bossHeavyAttack", {shape:1, r, arc, dx:fdx, dy:fdy, rgb:"255,120,70"}, ()=>{
      e.attackAnim = 420;
      _fortHeroesInCone(e.x, e.y, fdx, fdy, r, arc, (h)=>bossHitHero(h, e.dmg*mult, Object.assign({from:e}, o||{})));
      vfxBurst(e.x + fdx*r*0.55, e.y + fdy*r*0.55, 10, "spark", 170, 320, 3, 1, -30, 0);
      playSfx(sfx||"fortSword");
      if(then) then();
    });
  };
  const sweep = (wind, r, mult, then)=>{
    _fb(e, "sweep", wind + 450);
    bossHudHint("Barrido", "alejate del círculo");
    bossWindup(e, wind, "bossGroundSlam", {shape:0, r, rgb:"255,140,80"}, ()=>{
      e.attackAnim = 420;
      for(const h of heroes){ if(h.alive && Math.hypot(h.x-e.x, h.y-e.y) <= r + (h.radius||20)*0.5) bossHitHero(h, e.dmg*mult, {from:e, knock:50}); }
      vfxShock(e.x, e.y, 20, r, "255,160,100", 420, 1);
      playSfx("fortSword");
      if(then) then();
    });
  };
  // Ejecución Oxidada (fase 3): enorme, aviso largo en línea fija (se esquiva de costado)
  if(P===3 && e.execCd <= 0 && dist < 700){
    e.execCd = 12500; e.kcd = 99999;
    _fb(e, "exec", C.execWind + 600);
    showBanner("¡EJECUCIÓN OXIDADA! — salí de la línea");
    bossHudHint("Ejecución Oxidada", "hacete a un costado de la línea roja");
    playSfx("fortExecWarn");
    const L = 760, W = 80;
    vfxTelegraph({shape:2, r:W, len:L, x:e.x, y:e.y, dx:fdx, dy:fdy, follow:null, dur:C.execWind, rgb:"255,40,30"});
    e.bossWind = {t:0, dur:C.execWind, fn:()=>{
      e.attackAnim = 520;
      for(const h of heroes){
        if(!h.alive) continue;
        const hx = h.x-e.x, hy = h.y-e.y, t = hx*fdx + hy*fdy, perp = Math.abs(-hx*fdy + hy*fdx);
        if(t > -30 && t < L && perp < W + (h.radius||20)*0.4) bossHitHero(h, Math.min(h.maxHp*0.55, e.dmg*C.execMult*1.6), {from:e});
      }
      for(let i=1;i<=4;i++) vfxSprite("fortExecGround", 0, e.x + fdx*L*i/4.6, e.y + fdy*L*i/4.6 + 30, 80, 700, null, 0.2, fdx<0, 0.8);
      vfxSprite("fortExecWave", 0, e.x + fdx*160, e.y + fdy*160, 140, 600, null, 0.3, fdx<0, 0.7);
      vfxShake(14); flashScreen(0.3, "255,120,80"); playSfx("fortExec");
      e.kcd = 1300;
    }};
    return true;
  }
  // Carga: va contra el héroe MÁS LEJANO a su alcance (castiga a la retaguardia que se queda quieta)
  let far = null, fd = 0;
  if(e.chargeCd <= 0) for(const h of heroes){ if(!h.alive) continue; const d = Math.hypot(h.x-e.x, h.y-e.y); if(d >= 185 && d <= 620 && d > fd){ fd = d; far = h; } }
  if(far){
    e.chargeCd = P===3 ? 6500 : 9000; e.kcd = 99999;
    _fb(e, "charge", 900 + 1500);
    bossHudHint("Carga", "movete de costado");
    const ct = far;
    bossWindup(e, P===3 ? 750 : 900, "bossHeavyAttack", {shape:2, r:e.radius+12, len:600, aimAt:ct, rgb:"255,130,60"}, ()=>{
      e.kcd = 900;
      const t2 = ct.alive ? ct : _fbTarget(e); if(!t2) return;
      const dx = t2.x-e.x, dy = t2.y-e.y, d = Math.hypot(dx,dy)||1;
      e.fortCharge = {dx:dx/d, dy:dy/d, d:0, len:600, hit:[]};
      playSfx("fortCharge");
    });
    return true;
  }
  if(P < 3 && e.counterCd <= 0 && dist < 280){
    e.counterCd = 15000; e.kcd = 99999;
    e.fortCounter = {t:0, hp0:e.hp, hitBy:null};
    e.dmgTakenMult = 0.25;
    _fb(e, "shield", C.counterMs + 200);
    showBanner("POSTURA DE CONTRAATAQUE — ¡no le pegues!");
    bossHudHint("Contraataque", "si le pegás ahora, responde fuerte; si esperás, queda expuesto");
    playSfx("shield");
    return true;
  }
  if(dist > 240) return false;
  e.kcd = gap;
  const near = heroes.filter(h=>h.alive && Math.hypot(h.x-e.x, h.y-e.y) < 210).length;
  if(P===3){
    // combos: espadazo a dos manos -> barrido
    cone("sweep", 520, 200, 0.85, 1.05, null, "Espadazo", "", "fortSword", ()=>{ e.kcd = 99999; runLater(250, ()=>{ if(e.alive && !e.bossWind) { sweep(560, 205, 0.9, ()=>{ e.kcd = gap; }); } else e.kcd = gap; }); });
    return true;
  }
  const r = Math.random();
  if(near >= 2 && r < 0.45) sweep(800, 200, 0.9);
  else if(dist < 140 && r < 0.55) cone("shield", 450, 135, 0.9, 0.7, {knock:110, slow:0.4, slowDur:800}, "Golpe de Escudo", "te empuja", "fortShieldBash");
  else cone("atk", 650, 195, 0.75, 1.0, null, "Espadazo", "rodealo o alejate");
  return true;
}
function fortKnightToPhase(e, p){
  const C = FORT_CFG.caballero, K = fortS.knight;
  K.phase = p; e.bossPhase = p;
  e.bossWind = null; e.fortCharge = null; e.fortCounter = null;
  bossPhaseFeedback();
  bossHudPhase(p-1, 3);
  if(p===2){
    e.fortTrans = {t:0, dur:2400}; e.dmgTakenMult = 0.2;
    _fb(e, "plant", 2400);
    K.awake = 0;
    showBanner("CLAVA SU ESPADA… ¡LA FORTALEZA DESPIERTA!");
    playSfx("fortPhase2");
    vfxShock(e.x, e.y, 20, 420, "255,170,90", 1000, 2);
    vfxShake(10);
    e.orderCd = 3500;
  } else {
    e.fortTrans = {t:0, dur:C.transMs}; e.dmgTakenMult = 0;
    _fb(e, "tf", C.transMs);
    e.enraged = true; e.noShield = true;
    K.chains = 1;
    showBanner("¡LAS CADENAS LO SOSTIENEN! Suelta el escudo y toma la espada con las dos manos");
    playSfx("fortPhase3");
    vfxShock(e.x, e.y, 20, 480, "255,90,60", 1100, 2);
    vfxBurst(e.x, e.y-60, 40, "ember", 280, 1000, 4, 2, -80, 0);
    flashScreen(0.35, "255,120,80"); vfxShake(12);
    e.execCd = 4500; e.chargeCd = 3000;
  }
}
function fortKnightKilled(e){
  if(fortS && fortS.knight) fortS.knight.state = "dead";
  for(const o of enemies){ if(o.alive && o!==e && o.fortAdd){ o.alive = false; o.hp = 0; vfxOnDeath(o); } }
  vfxShock(e.x, e.y, 30, 460, "255,210,160", 1200, 2);
  vfxBurst(e.x, e.y-60, 40, "rock", 300, 1100, 5, 2, -70, 0);
  playSfx("fortGears");
}
