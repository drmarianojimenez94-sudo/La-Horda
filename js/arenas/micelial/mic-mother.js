"use strict";
/* ============================================================
   js/arenas/micelial/mic-mother.js
   MOTHER_SPORE_CONTROLLER + LA MADRE ESPORA.
   La Madre está desde el nivel 1: el capullo del centro ES ella. El controlador coordina todo:
   - Niveles 1-9: el capullo late (cada vez más seguido: se oye desde el nivel 3).
   - Niveles 7-9: PARTES de la Madre intervienen sin mostrarla entera: una raíz gigante cruza la
     arena, un brazo golpea desde arriba, una nube de esporas sale de la pared, un hongo gigante
     brota y suelta colonia. Siempre con aviso.
   - Nivel 10: casi no aparecen enemigos, silencio, latidos, los hongos cambian de color, las
     raíces convergen al centro… y la estructura central se revela: ES el jefe.
   - Pelea (enorme, incrustada en el centro, no camina):
       Fase 1 COLONIA   (100-60%): raíces del piso, proyectiles de esporas, latigazo, invocaciones
                                   con tope, zarpazo si la encaran.
       Fase 2 FLORACIÓN (60-30%):  se cierra, 1-2 s de casi oscuridad, todos los hongos se
                                   encienden (paleta psicodélica), nubes de esporas y
                                   ALUCINACIONES (no hacen daño, se distinguen: translúcidas,
                                   sin sombra, con borde que cambia de color).
       Fase 3 CORAZÓN   (30-0%):   el torso se abre, el corazón late expuesto (recibe más daño) y
                                   la infección cubre la arena desde los bordes: la zona segura se
                                   achica (enrage suave por espacio, no por daño x5).
   - Muerte: el corazón se detiene, se apagan las luces, las raíces se aflojan, los hongos se
     marchitan, la estructura colapsa, las esporas paran, se desintegra, una última liberación de
     esporas… y silencio. La arena queda muerta y desaturada.
   ============================================================ */
const MIC_MOTHER_POS = {x:0, y:125};   // punto golpeable (frente del cuerpo, al pie del capullo)
const MIC_SAFE_C = {x:0, y:230, rx:760, ry:520};

function micMotherEntity(){ return enemies.find(e=>e.alive && e.type==="madre_espora") || null; }
function _micAvg(){ return (runDifficulty && runDifficulty.avgHp) || 400; }
function _micInterDmg(mult){ return _micAvg()*0.07*mult*(1 + 0.04*Math.max(0, runLevel-7)); }

/* ---------------- zona segura de la fase 3 ---------------- */
function micSafeK(){ const C = MIC_CFG.madre, M = micS && micS.mo; const q = M ? (M.inf||0) : 0; return C.safeStart - (C.safeStart - C.safeMin)*q; }
function micSafeNorm(x, y){ return Math.hypot((x - MIC_SAFE_C.x)/MIC_SAFE_C.rx, (y - MIC_SAFE_C.y)/MIC_SAFE_C.ry); }

/* ---------------- controlador ---------------- */
function micMotherController(dt){
  const M = micS.mo;
  M.t += dt;
  if(M.st==="sleep"){
    const gap = [9000, 7000, 5600, 4400, 3600][micS.stage] || 6000;
    M.beat -= dt;
    if(M.beat <= 0){ M.beat = gap; M.bt = runElapsedMs; if(runLevel >= 3) playSfx("micPulse"); }
    if(runLevel >= 7 && runLevel <= 9) micInterventions(dt);
    return;
  }
  if(M.st==="stir"){ micMotherStir(dt); return; }
  if(M.st==="reveal"){ micMotherReveal(dt); return; }
  if(M.st==="fight"){ micMotherFightWorld(dt); return; }
  if(M.st==="dying"){ micMotherDeath(dt); return; }
}

/* ---------------- intervenciones (niveles 7-9) ---------------- */
function micInterventions(dt){
  const I = micS.inter, C = MIC_CFG.inter;
  if(levelClearing || runEnding) return;
  I.t -= dt;
  if(I.t > 0) return;
  const g = C.gapMs[runLevel] || [14000, 18000];
  I.t = micRand(g[0], g[1]);
  const kinds = ["root", "arm", "cloud", "giant"].filter(k=>k!==I.last);
  const k = micRandPick(kinds); I.last = k; I.n++;
  const h = micRandPick(micAliveHeroes()); if(!h) return;
  if(!I.shown){ I.shown = 1; showBanner("La Madre se mueve bajo el Reino…"); }
  if(k==="root") micInterRoot(h);
  else if(k==="arm") micInterArm(h);
  else if(k==="cloud") micInterCloud(h);
  else micInterGiant(h);
}
// Recorre una línea desde (x,y) en dirección (dx,dy) hasta salir de la caverna.
function _micLineEnd(x, y, dx, dy){ let d = 40; while(d < 2400 && micEllNorm(x + dx*d, y + dy*d) < 1.04) d += 40; return {x:x + dx*d, y:y + dy*d}; }
function micInterRoot(h){
  const C = MIC_CFG.inter;
  const a = Math.random()*Math.PI, dx = Math.cos(a), dy = Math.sin(a);
  const p0 = _micLineEnd(h.x, h.y, -dx, -dy), p1 = _micLineEnd(h.x, h.y, dx, dy);
  const len = Math.hypot(p1.x-p0.x, p1.y-p0.y);
  vfxTelegraph({shape:2, r:C.rootW/2, x:p0.x, y:p0.y, dx, dy, len, dur:C.rootWarn, rgb:"210,80,255"});
  playSfx("micRootWarn"); vfxShake(3);
  if(inView(h.x, h.y, 0) && h===player) floatText(h.x, h.y - 70, "¡Raíz gigante!", "crit");
  runLater(C.rootWarn, ()=>{
    if(state!=="playing" || !micS) return;
    for(const o of heroes){
      if(!o.alive) continue;
      const hx = o.x-p0.x, hy = o.y-p0.y, t = hx*dx + hy*dy, perp = Math.abs(-hx*dy + hy*dx);
      if(t > -10 && t < len + 10 && perp < C.rootW/2 + (o.radius||18)*0.6) bossHitHero(o, _micInterDmg(C.rootMult), {slow:0.35, slowDur:1200});
    }
    micS.roots.push({x0:Math.round(p0.x), y0:Math.round(p0.y), x1:Math.round(p1.x), y1:Math.round(p1.y), t:0, d:3400, w:C.rootW});
    if(micS.roots.length > 6) micS.roots.shift();
    playSfx("micRoot"); vfxShake(7);
  });
}
function micInterArm(h){
  const C = MIC_CFG.inter, x = Math.round(h.x), y = Math.round(h.y);
  vfxTelegraph({shape:0, r:C.armR, x, y, dur:C.armWarn, rgb:"255,90,200"});
  micS.arms.push({x, y, t:0, d:C.armWarn + 1100, w:C.armWarn, s:Math.random() < 0.5 ? 0 : 1});
  if(micS.arms.length > 4) micS.arms.shift();
  playSfx("micRumble");
  runLater(C.armWarn, ()=>{
    if(state!=="playing" || !micS) return;
    micHeroesNear(x, y, C.armR, o=>bossHitHero(o, _micInterDmg(C.armMult), {from:{x, y}, knock:110}));
    vfxShock(x, y, 20, C.armR + 30, "255,120,210", 600, 2);
    vfxBurst(x, y-10, 22, "micSpore", 200, 700, 4, 2, -60, 0);
    playSfx("micSlam"); vfxShake(10);
  });
}
function micInterCloud(h){
  const E = MIC_MAP.ell, a = Math.atan2((h.y - E.cy)/E.ry, (h.x - E.cx)/E.rx);
  const p = micEdgePoint(a, 90);
  vfxTelegraph({shape:0, r:MIC_CFG.cloud.wallR, x:p.x, y:p.y, dur:1000, rgb:"160,255,120"});
  playSfx("micSporeBig");
  runLater(1000, ()=>{ if(state==="playing" && micS){ micAddCloud(p.x, p.y, "wall"); vfxBurst(p.x, p.y-30, 18, "micSpore", 160, 800, 4, 1, -40, 0); } });
}
function micInterGiant(h){
  const C = MIC_CFG.inter, p = micPointNear(h.x, h.y, 240, 400, 70), R = 110;
  vfxTelegraph({shape:0, r:R, x:p.x, y:p.y, dur:1300, rgb:"255,150,90"});
  micS.giants.push({x:Math.round(p.x), y:Math.round(p.y), t:0, d:15000});
  if(micS.giants.length > 4) micS.giants.shift();
  playSfx("micGrow");
  runLater(1300, ()=>{
    if(state!=="playing" || !micS) return;
    micHeroesNear(p.x, p.y, R, o=>bossHitHero(o, _micInterDmg(0.9), {from:p, knock:80}));
    vfxBurst(p.x, p.y-60, 26, "micSpore", 200, 900, 4, 2, -70, 0);
    playSfx("micSporeBig"); vfxShake(6);
    const alive = enemies.filter(o=>o.alive && !o.structure).length;
    for(let i=0;i<C.capAdds && alive + i < MIC_CFG.nucleo.spawnCap;i++){
      const a = i/C.capAdds*Math.PI*2, s = micSpawnAt(i%2 ? "sabueso" : "infectado", p.x + Math.cos(a)*70, p.y + Math.sin(a)*50);
      s.stunTimer = 500;
    }
    micEcoBloomAt(p.x, p.y, 220, FN.MATURE);
  });
}

/* ---------------- nivel 10: el Reino contiene la respiración ---------------- */
const MIC_STIR_MS = 17000;
function micMotherLevelStart(){
  levelDuration = 9e9;          // el nivel 10 no termina por tiempo: termina cuando cae la Madre
  const M = micS.mo;
  M.st = "stir"; M.t = 0; M.beat = 0;
  if(typeof setMusicMode==="function") setMusicMode("prelude");
  runLater(900, ()=>{ if(state==="playing") showBanner("El Reino contiene la respiración…"); });
}
function micMotherStir(dt){
  const M = micS.mo;
  M.beat -= dt;
  const gap = Math.max(650, 1300 - M.t*0.035);
  if(M.beat <= 0){ M.beat = gap; M.bt = runElapsedMs; playSfx("micHeart"); if(M.t > 6000) vfxShake(2 + M.t/4000); }
  if(!M.s1 && M.t > 5500){ M.s1 = 1; showBanner("Las raíces se mueven… todas hacia el centro"); }
  if(!M.s2 && M.t > 11000){ M.s2 = 1; showBanner("El capullo… respira"); playSfx("micSilence"); }
  if(M.t >= MIC_STIR_MS) micMotherRevealStart();
}
function micMotherRevealStart(){
  const M = micS.mo;
  M.st = "reveal"; M.t = 0;
  // la colonia se retira: se marchita en el lugar (sin premio)
  for(const o of enemies){ if(o.alive){ o.alive = false; o.hp = 0; vfxOnDeath(o); } }
  enemies = enemies.filter(o=>o.alive);
  micS.clouds.length = 0;
  const e = micSpawnAt("madre_espora", MIC_MOTHER_POS.x, MIC_MOTHER_POS.y);
  e.x = MIC_MOTHER_POS.x; e.y = MIC_MOTHER_POS.y; e._ax = e.x; e._ay = e.y; e.micStatic = true;
  scaleBossStats(e, "madre_espora");
  e.micDormant = 1; e.dmgTakenMult = 0; e.bossPhase = 1; e.fx = 0; e.fy = 1; e.speed = 0;
  e.mcd = 2200; e.rootsCd = 2500; e.sporeCd = 4500; e.whipCd = 7000; e.summonCd = 9000; e.clawCd = 0; e.cloudCd = 4000; e.halCd = 7000;
  activeChampion = e;
  playSfx("micSilence");
  if(typeof setMusicMode==="function") setMusicMode("prelude");
}
function micMotherReveal(dt){
  const M = micS.mo, e = micMotherEntity();
  if(!e){ M.st = "fight"; return; }
  if(!M.r1 && M.t > 1500){ M.r1 = 1; M.bt = runElapsedMs; vfxShock(0, 40, 30, 420, "255,120,230", 1100, 2); vfxBurst(0, -20, 40, "micSpore", 260, 1100, 5, 2, -90, 0); vfxShake(12); playSfx("micCrack"); flashScreen(0.3, "255,180,240"); }
  if(!M.r2 && M.t > 4200){ M.r2 = 1; showBanner("La estructura del centro… ES ELLA"); playSfx("micRumble"); vfxShake(8); }
  if(!M.r3 && M.t > 7000){ M.r3 = 1; playSfx("bossRoar"); vfxShake(14); flashScreen(0.35, "255,160,240"); }
  if(M.t >= MIC_CFG.madre.revealMs){
    M.st = "fight"; M.t = 0; M.ph = 1;
    e.micDormant = 0; e.dmgTakenMult = 1;
    activeChampion = null;
    bossActive = true; boss = e;
    bossEntrance(e);
    arenaTitleCard("JEFE", "LA MADRE ESPORA", "El Reino entero es su cuerpo.", 4600);
  }
}

/* ---------------- pelea: mundo (infección de la fase 3, alucinaciones) ---------------- */
function micMotherFightWorld(dt){
  const M = micS.mo, C = MIC_CFG.madre;
  // alucinaciones: vagan hacia el equipo y se deshacen al tocar a alguien (no hacen daño)
  if(micS.hal.length){
    let w = 0;
    for(let i=0;i<micS.hal.length;i++){
      const z = micS.hal[i]; z.t += dt;
      const h = heroes[z.h % heroes.length];
      if(h && h.alive){ const dx = h.x-z.x, dy = h.y-z.y, d = Math.hypot(dx,dy)||1; z.vx = dx/d*125; z.vy = dy/d*125; if(d < 34){ z.t = z.d; vfxBurst(z.x, z.y-20, 8, "micHal", 90, 450, 3, 1, -30, 0); } }
      z.x += z.vx*dt/1000; z.y += z.vy*dt/1000;
      if(z.t < z.d) micS.hal[w++] = z;
    }
    micS.hal.length = w;
  }
  if(M.ph===3 && !M.tr){
    M.inf = Math.min(1, (M.inf||0) + dt/C.infectMs);
    const K = micSafeK();
    for(const h of heroes){
      if(!h.alive || micSafeNorm(h.x, h.y) <= K) continue;
      h.slowAmt = Math.max(h.slowAmt||0, C.infectSlow); h.slowTimer = Math.max(h.slowTimer||0, 220);
      micTickDmg(h, h.maxHp*(C.infectDps + C.infectDpsRamp*3*M.inf)*dt/1000);
    }
  }
}

/* ---------------- IA de la Madre ---------------- */
function micAIMadre(e, dt, tgt, dist){
  const C = MIC_CFG.madre, M = micS.mo;
  e.atkCd = 1e6; e.x = e._ax; e.y = e._ay;
  if(M.st!=="fight" || e.micDormant){ _micBossPack(e, M.st==="reveal" ? "trans" : "idle", 400); return true; }
  // transiciones de fase (una vez cada una)
  if(M.ph===1 && !M.tr && e.hp < e.maxHp*C.p2At){ micMotherToPhase(e, 2); return true; }
  if(M.ph===2 && !M.tr && e.hp < e.maxHp*C.p3At){ micMotherToPhase(e, 3); return true; }
  if(M.tr){
    M.tr.t += dt;
    const T = M.tr;
    if(T.to===2){
      _micBossPack(e, "trans", 400);
      if(!T.dk && T.t > C.closeMs*0.45){ T.dk = 1; M.dark = runElapsedMs; playSfx("micDark"); }
      if(T.t >= C.closeMs + 500){ M.tr = null; M.bloom = 1; e.dmgTakenMult = 1; e.mcd = 900; bossPhaseFeedback(); playSfx("micBloom"); showBanner("🌸 FLORACIÓN — todo el Reino se enciende"); }
    } else {
      _micBossPack(e, "open", 400);
      if(T.t >= 2600){ M.tr = null; M.heart = 1; e.dmgTakenMult = C.heartVuln; e.mcd = 800; bossPhaseFeedback(); showBanner("💗 ¡EL CORAZÓN ESTÁ EXPUESTO! Quedate cerca: la infección avanza"); }
    }
    return true;
  }
  const P = M.ph - 1;
  e.mcd -= dt; e.rootsCd -= dt; e.sporeCd -= dt; e.whipCd -= dt; e.summonCd -= dt; e.clawCd -= dt; e.cloudCd -= dt; e.halCd -= dt;
  if(M.ph===3){ M.beat -= dt; if(M.beat <= 0){ M.beat = 900; M.bt = runElapsedMs; playSfx("micHeart"); } _micBossPack(e, "heart", 400); }
  if(e.bossWind || e.mcd > 0) return true;
  if(e.mcd < -8000) e.mcd = 0;
  // zarpazo: si la encaran de cerca
  const near = heroes.filter(h=>h.alive && Math.hypot(h.x-e.x, h.y-e.y) < C.clawR*0.9);
  if(near.length && e.clawCd <= 0){
    e.clawCd = C.clawCd; e.mcd = C.clawWind + 500;
    const t2 = near[0], d2 = Math.hypot(t2.x-e.x, t2.y-e.y)||1, fdx = (t2.x-e.x)/d2, fdy = (t2.y-e.y)/d2;
    _micBossPack(e, "atk", C.clawWind + 500);
    bossHudHint("Zarpazo", "sus brazos alcanzan lejos: salí del cono");
    bossWindup(e, C.clawWind, "bossHeavyAttack", {shape:1, r:C.clawR, arc:0.85, dx:fdx, dy:fdy, rgb:"255,90,220"}, ()=>{
      micHeroesInCone(e.x, e.y, fdx, fdy, C.clawR, 0.85, h=>bossHitHero(h, e.dmg*1.1, {from:e, knock:120}));
      vfxSprite("mic_claw_blue_b", 0, e.x + fdx*150, e.y + fdy*150, 120, 420, null, 0.2, fdx<0, 0.7);
      playSfx("micSlam"); vfxShake(7);
    });
    return true;
  }
  const adds = enemies.filter(o=>o.alive && !o.structure && o!==e).length;
  if(e.summonCd <= 0 && adds < C.addsMax){ micMotherSummon(e, C.summonN[P]); e.summonCd = C.summonCdMs[P]; e.mcd = 1300; return true; }
  if(e.whipCd <= 0){ micMotherWhip(e, tgt); e.whipCd = C.whipCdMs[P]; e.mcd = C.whipWind + 500; return true; }
  if(M.ph >= 2 && e.cloudCd <= 0){ micMotherClouds(e); e.cloudCd = C.cloudCdMs; e.mcd = 1100; return true; }
  if(M.ph >= 2 && e.halCd <= 0){ micMotherHallucinate(e); e.halCd = C.halCdMs; e.mcd = 900; return true; }
  if(e.rootsCd <= 0){ micMotherRoots(e, C.rootsN[P]); e.rootsCd = C.rootsCdMs[P]; e.mcd = 1000; return true; }
  if(e.sporeCd <= 0){ micMotherSpores(e, tgt, C.sporeN[P]); e.sporeCd = C.sporeCdMs[P]; e.mcd = 900; return true; }
  return true;
}
function micMotherToPhase(e, ph){
  const M = micS.mo;
  M.ph = ph; M.tr = {t:0, to:ph};
  e.bossWind = null; e.bossPhase = ph;
  bossHudPhase(ph, 3);
  if(ph===2){
    e.dmgTakenMult = 0;
    showBanner("La Madre se cierra sobre sí misma…");
    playSfx("micRumble"); vfxShake(8);
  } else {
    e.dmgTakenMult = 0.5; M.inf = 0; M.beat = 0;
    showBanner("¡El torso se abre!");
    playSfx("micOpen"); vfxShake(12); flashScreen(0.3, "255,120,160");
  }
}
function micMotherRoots(e, n){
  const C = MIC_CFG.madre;
  _micBossPack(e, "cast", 1100);
  bossHudHint("Raíces del Reino", "salí de los círculos: brotan raíces");
  const alive = micAliveHeroes();
  for(let i=0;i<n;i++){
    const h = alive[i % Math.max(1, alive.length)] || player;
    const a = Math.random()*Math.PI*2, off = i < alive.length ? 0 : 60 + Math.random()*160;
    const p = {x:h.x + Math.cos(a)*off, y:h.y + Math.sin(a)*off}; micClamp(p);
    const delay = C.rootsDelay + i*70;
    bossStrike(p.x, p.y, C.rootsR, delay, e.dmg*C.rootsMult, "root", {slow:0.3, slowDur:1000});
    runLater(delay, ()=>{ vfxSprite("mic_m_root_spikes", 0, p.x, p.y + 12, 70, 700, null, 0.3, Math.random() < 0.5, 0.9); });
  }
  playSfx("micRootWarn");
}
function micMotherSpores(e, tgt, n){
  const C = MIC_CFG.madre;
  _micBossPack(e, "atk", 700);
  const ox = e.x, oy = e.y - 150, a0 = Math.atan2(tgt.y - oy, tgt.x - ox), spread = 1.1;
  for(let i=0;i<n;i++){
    const a = a0 + (n > 1 ? (i/(n-1) - 0.5)*spread : 0);
    const p = _enemyShot(e, Math.cos(a)*C.sporeSpeed, Math.sin(a)*C.sporeSpeed, e.dmg*C.sporeMult, {fortSpr:"mic_m_proj", radius:11, life:3400, color:"#ff7ae0"});
    p.x = ox; p.y = oy;
  }
  playSfx("micShot");
}
function micMotherWhip(e, tgt){
  const C = MIC_CFG.madre;
  const dx0 = tgt.x - e.x, dy0 = tgt.y - e.y, d0 = Math.hypot(dx0, dy0)||1, dx = dx0/d0, dy = dy0/d0;
  _micBossPack(e, "atk", C.whipWind + 500);
  bossHudHint("Latigazo", "una raíz enorme barre la línea marcada");
  vfxTelegraph({shape:2, r:C.whipW/2, x:e.x, y:e.y, dx, dy, len:C.whipLen, dur:C.whipWind, rgb:"255,80,220"});
  playSfx("micRootWarn");
  const ox = e.x, oy = e.y;
  bossWindup(e, C.whipWind, "bossCast", null, ()=>{
    for(const h of heroes){
      if(!h.alive) continue;
      const hx = h.x-ox, hy = h.y-oy, t = hx*dx + hy*dy, perp = Math.abs(-hx*dy + hy*dx);
      if(t > -20 && t < C.whipLen && perp < C.whipW/2 + (h.radius||18)*0.6) bossHitHero(h, e.dmg*C.whipMult, {from:e, knock:80});
    }
    micS.roots.push({x0:Math.round(ox), y0:Math.round(oy), x1:Math.round(ox + dx*C.whipLen), y1:Math.round(oy + dy*C.whipLen), t:0, d:1100, w:C.whipW});
    if(micS.roots.length > 6) micS.roots.shift();
    playSfx("micRoot"); vfxShake(8);
  });
}
function micMotherSummon(e, n){
  _micBossPack(e, "cast", 1200);
  bossHudHint("Invocación", "la colonia brota de los hongos");
  const types = micS.mo.ph===1 ? ["infectado", "sabueso"] : (micS.mo.ph===2 ? ["infectado", "acechador", "peregrino", "sabueso"] : ["infectado", "sabueso", "hinchado"]);
  for(let i=0;i<n;i++){
    const a = Math.PI*0.15 + Math.random()*Math.PI*0.7, d = 260 + Math.random()*220;
    const p = {x:e.x + Math.cos(a)*d*(Math.random() < 0.5 ? 1 : -1), y:e.y + Math.sin(a)*d*0.8, radius:20}; micClamp(p);
    vfxSprite("mic_m_summon_a", 0, p.x, p.y + 10, 70, 900, null, 0.4, false, 0.9);
    const t = types[i % types.length];
    runLater(700, ()=>{
      if(state!=="playing" || !micS || micS.mo.st!=="fight") return;
      if(t==="hinchado" && enemies.some(o=>o.alive && o.type==="hinchado")) return;
      const s = micSpawnAt(t, p.x, p.y); s.stunTimer = 400; s.xp = Math.round(s.xp*0.5);
      vfxBurst(p.x, p.y-10, 10, "micSpore", 110, 500, 3, 1, -40, 0);
    });
  }
  playSfx("micGrow");
}
function micMotherClouds(e){
  const C = MIC_CFG.madre;
  _micBossPack(e, "bloom", 1100);
  bossHudHint("Nubes de Esporas", "no te quedes adentro: ralentizan y dañan de a poco");
  const alive = micAliveHeroes();
  for(let i=0;i<C.cloudN;i++){
    const h = alive[i % Math.max(1, alive.length)] || player;
    const p = i < alive.length ? micPointNear(h.x, h.y, 60, 140, 40) : micPointNear(h.x, h.y, 200, 360, 40);
    vfxTelegraph({shape:0, r:MIC_CFG.cloud.bigR, x:p.x, y:p.y, dur:900, rgb:"170,255,130"});
    runLater(900, ()=>{ if(state==="playing" && micS && micS.mo.st==="fight") micAddCloud(p.x, p.y, "big"); });
  }
  playSfx("micSporeBig");
}
function micMotherHallucinate(e){
  const C = MIC_CFG.madre;
  _micBossPack(e, "bloom", 900);
  showBanner("👁 Alucinaciones: las figuras translúcidas no hacen daño");
  const kinds = ["sabueso", "infectado", "acechador", "hinchado", "chaman"];
  for(let i=0;i<C.halN;i++){
    const p = micEdgePoint(Math.random()*Math.PI*2, 80);
    micS.hal.push({x:Math.round(p.x), y:Math.round(p.y), k:kinds[i % kinds.length], t:0, d:C.halMs, vx:0, vy:0, h:i});
  }
  if(micS.hal.length > 10) micS.hal.splice(0, micS.hal.length - 10);
  playSfx("micBloom");
}

/* ---------------- muerte ---------------- */
// Reemplaza la victoria inmediata: primero la secuencia de muerte (≈10 s) y recién después la
// pantalla de victoria (finishBossVictory, js/core/run.js). Mientras dura no se puede perder.
function micBossDefeated(b){
  if(!micS || !b || b.type!=="madre_espora") return false;
  const M = micS.mo;
  M.st = "dying"; M.t = 0; M.tr = null; M.ev = 0;
  runEnding = true; bossActive = false;
  for(const o of enemies){ if(o.alive && o!==b){ o.alive = false; o.hp = 0; vfxOnDeath(o); } }
  enemies = enemies.filter(o=>o.alive);
  micS.clouds.length = 0; micS.hal.length = 0; bossStrikes.length = 0;
  for(const h of heroes){ h.slowAmt = 0; h.slowTimer = 0; }
  if(typeof bossHudHide==="function") bossHudHide();
  hitStop(110, true); slowMo(0.3, 1400);
  playSfx("micHeartStop");
  showBanner("El corazón se detiene…");
  return true;
}
function micMotherDeath(dt){
  const M = micS.mo, C = MIC_CFG.madre, T = M.t;
  const ev = (i, at, fn)=>{ if(M.ev < i && T >= at){ M.ev = i; fn(); } };
  ev(1, 1000, ()=>{ playSfx("micDark"); showBanner("…las luces del Reino se apagan…"); });
  ev(2, 2200, ()=>{ playSfx("micRoot"); vfxShake(5); });
  ev(3, 3200, ()=>{ micS.dead = 1; micS.stage = MIC_STAGE.MUERTA; showBanner("…los hongos se marchitan…"); });
  ev(4, 4700, ()=>{ playSfx("micCollapse"); vfxShake(12); vfxBurst(0, -60, 40, "micDust", 220, 1200, 5, 2, 40, 0); });
  ev(5, 6600, ()=>{ vfxBurst(0, -120, 50, "micDust", 180, 1400, 5, 2, 60, 0); });
  ev(6, 8000, ()=>{ vfxShock(0, 40, 40, 900, "255,220,245", 1400, 2); vfxBurst(0, -80, 60, "micSpore", 320, 1600, 5, 2, -90, 0); flashScreen(0.45, "255,230,250"); playSfx("micFinal"); });
  ev(7, 9000, ()=>{ playSfx("micSilence"); showBanner("Silencio."); });
  if(T >= C.deathMs && M.st==="dying"){
    M.st = "dead"; M.t = 0;
    if(typeof finishBossVictory==="function") finishBossVictory();
  }
}
