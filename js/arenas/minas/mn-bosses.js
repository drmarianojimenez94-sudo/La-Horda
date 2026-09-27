"use strict";
/* ============================================================
   js/arenas/minas/mn-bosses.js
   MINAS PROFUNDAS — Titán de Piedra, Cerbero y el Portal Infernal.
   NIVEL 8 (Profundidades): TITÁN DE PIEDRA, entidad mineral corrompida. Asedio y terreno: golpe,
     onda sísmica en línea, rocas lanzadas, lluvia de meteoros, PISOTÓN (apaga las luces cercanas: no
     las come como el Devoraluz, las rompe por pura fuerza) y DERRUMBES (escombros sólidos temporales,
     nunca en pasillos: sin encierros). Al caer: "ya estamos demasiado profundo" y la mina se enrojece.
   NIVEL 10 (Umbral Infernal): CERBERO, Guardián del Umbral (no es uno de los Cuatro Guardianes).
     Presagio (tres rugidos, cadenas) -> Acto 1 encadenado frente a la puerta -> Acto 2 rompe las
     cadenas -> Acto 3 el Umbral despierta. Lanzallamas (cono con barrido y fuego en el piso), pisotón
     (onda + apagón de luces cercanas), mordida triple, aullido (luces parpadean, algunas se apagan un
     rato, llegan esbirros), carga. Todo con ANTICIPACIÓN -> AVISO -> ATAQUE -> IMPACTO -> RECUPERACIÓN.
   MUERTE != VICTORIA: Cerbero cae (secuencia propia), silencio, el Umbral se abre y aparece el PORTAL
     INFERNAL. Objetivo "ATRAVIESA EL UMBRAL": cuando UN guardián humano lo atraviesa (acción
     contextual, validada por el anfitrión, una sola vez) termina la arena para todo el equipo con la
     victoria de siempre y se abre la Arena Infernal. Los bots nunca lo cruzan.
   ============================================================ */
function mnBossPack(e, set, ms){ e.packSet = set; e.packTimer = ms; e.packDur = ms; }
function mnPartyCenter(){ let sx = 0, sy = 0, n = 0; for(const h of heroes){ if(h.alive){ sx += h.x; sy += h.y; n++; } } return n ? {x:sx/n, y:sy/n} : {x:player.x, y:player.y}; }
function mnRandHero(){ const L = heroes.filter(h=>h.alive); return L.length ? mnPick(L) : player; }
// escombros del derrumbe: solo en lugares abiertos (nunca tapan un pasillo) y lejos de los héroes
function mnRubbleAt(x, y){
  const C = MN_CFG.titan;
  if(mnS.rubble.filter(r=>r.t >= 0).length >= C.maxRubble) return;
  if(!mnInside(x, y, 130) || heroes.some(h=>h.alive && Math.hypot(h.x - x, h.y - y) < 80)) return;
  mnS.rubble.push({x:Math.round(x), y:Math.round(y), r:44, t:0, d:C.rubbleMs, v:(Math.random()*3)|0});
}

/* ============================================================
   NIVEL 8 — TITÁN DE PIEDRA
   ============================================================ */
function mnTitanDirector(dt){
  const T = mnS.ti;
  if(runLevel !== 8) return;
  T.t += dt;
  if(T.st==="none"){
    if(levelClearing || runEnding || mnDescending()) return;
    if(levelTimer > levelDuration*0.3){
      T.st = "intro"; T.t = 0;
      playSfx("mnRumble"); vfxShake(8);
      showBanner("La roca tiembla… algo ENORME se abre paso");
      if(typeof setMusicMode==="function") setMusicMode("prelude");
    }
    return;
  }
  if(T.st==="intro"){
    if(Math.random() < dt/260){ const c = mnPartyCenter(); vfxBurst(c.x + mnRand(-400, 400), c.y + mnRand(-300, 300) - 80, 6, "rock", 80, 700, 3, 1, 40, 0); }
    if(T.t >= 2800){
      T.st = "fight"; T.t = 0;
      const p = mnNearestFree(0, -420, 60), e = mnSpawnAt("mn_titan", p.x, p.y);
      e.bossPhase = 1; e.fx = 0; e.fy = 1; e.slamCd = 2200; e.quakeCd = 5000; e.throwCd = 3500; e.rainCd = 8000; e.stompCd = 7000; e.collapseCd = 9e9;
      activeChampion = null;
      if(typeof MINAS_FX!=="undefined") bossSheetFx("mnCollapse", e.x, e.y, 260, 900, {anchorY:0.9});
      vfxShake(14); flashScreen(0.3, "255,160,90"); playSfx("bossRoar");
      if(typeof setMusicMode==="function") setMusicMode("boss");
      arenaTitleCard("SUBJEFE", "TITÁN DE PIEDRA", "Entidad mineral corrompida", 4600);
      mnTutSay("mn_titan", "El TITÁN rompe todo con su fuerza: su PISOTÓN apaga las luces cercanas. Esquivá los círculos y volvé a encender cuando puedas.", 9000, true);
    }
    return;
  }
  if(T.st==="fight"){
    const e = mnEnt("mn_titan");
    if(e && !e._p2 && e.hp <= e.maxHp*MN_CFG.titan.p2At){ e._p2 = 1; e.bossPhase = 2; e.collapseCd = 1200; e.speed *= 1.15; showBanner("¡EL TITÁN SE DESMORONA… Y SE ENFURECE!"); playSfx("bossRoar"); if(typeof bossPhaseFeedback==="function") bossPhaseFeedback(); }
    if(!e){ T.st = "dead"; T.t = 0; mnS.drops.length = 0; showBanner("El Titán cae. El suelo está caliente… ya estamos DEMASIADO PROFUNDO."); playSfx("mnRumble"); if(typeof setMusicMode==="function") setMusicMode("prelude"); }
    return;
  }
  if(T.st==="dead"){
    mnS.hell = Math.min(0.5, mnS.hell + dt/8000);
    if(T.t >= 4200){ T.st = "done"; if(typeof setMusicMode==="function") setMusicMode("wave", runLevel); }
  }
}
function mnAITitan(e, dt, tgt, dist){
  const C = MN_CFG.titan, sp = e._p2 ? 0.75 : 1;
  e.atkCd = 1e6;
  for(const k of ["slamCd", "quakeCd", "throwCd", "rainCd", "stompCd", "collapseCd"]) e[k] = (e[k]||2000) - dt;
  if(e.cast){ e.cast.t += dt; if(e.cast.t >= e.cast.d){ const f = e.cast.fn; e.cast = null; e.mnBusy = false; if(f) f(); } return true; }
  const cast = (set, ms, fn)=>{ mnBossPack(e, set, ms + 250); e.cast = {t:0, d:ms, fn}; e.mnBusy = true; };
  if(e.stompCd <= 0 && dist < C.stompR + 120){
    e.stompCd = mnRand(C.stompCd[0], C.stompCd[1])*sp;
    mnDrop("stomp", e.x, e.y, C.stompR, 1000, e.dmg*1.2, {from:mnId(e), knock:60, black:C.lightR, bn:3});
    cast("stomp", 1000); playSfx("mnGrunt");
    return true;
  }
  if(e.collapseCd <= 0){
    e.collapseCd = mnRand(C.collapseCd[0], C.collapseCd[1]);
    for(let k=0;k<4;k++){ const h = mnRandHero(), p = mnNearestFree(h.x + mnRand(-260, 260), h.y + mnRand(-220, 220), 30); mnDrop("collapse", p.x, p.y, 90, 1300 + k*160, e.dmg*1.1, {rubble:1}); }
    cast("throw", 900); showBanner("¡DERRUMBE!"); playSfx("mnRumble");
    return true;
  }
  if(e.quakeCd <= 0 && dist < 700){
    e.quakeCd = mnRand(C.quakeCd[0], C.quakeCd[1])*sp; _mnFace(e, tgt.x, tgt.y);
    const dx = e.fx, dy = e.fy;
    for(let k=1;k<=6;k++) mnDrop("quake", e.x + dx*k*95, e.y + dy*k*95, 62, 800 + k*110, e.dmg*0.9, {from:mnId(e)});
    cast("slam", 800); playSfx("mnGrunt");
    return true;
  }
  if(e.rainCd <= 0){
    e.rainCd = mnRand(C.rainCd[0], C.rainCd[1])*sp;
    for(const h of heroes.filter(q=>q.alive)) for(let k=0;k<2;k++) mnDrop("meteor", h.x + mnRand(-90, 90), h.y + mnRand(-90, 90), 64, 1300 + k*250, e.dmg*0.9);
    cast("throw", 900); playSfx("mnRumble");
    return true;
  }
  if(e.throwCd <= 0 && dist > 220){
    e.throwCd = mnRand(C.throwCd[0], C.throwCd[1])*sp; _mnFace(e, tgt.x, tgt.y);
    for(let k=0;k<3;k++) mnDrop("rock", tgt.x + mnRand(-110, 110), tgt.y + mnRand(-90, 90), 70, 1100 + k*180, e.dmg*0.9);
    cast("throw", 750); playSfx("mnThrow");
    return true;
  }
  if(e.slamCd <= 0 && dist < C.slamR + 80){
    e.slamCd = mnRand(C.slamCd[0], C.slamCd[1])*sp; _mnFace(e, tgt.x, tgt.y);
    mnCone("tslam", e, C.slamR + 30, 0.8, C.slamWind, e.dmg*1.3, {knock:50, light:0.5, lr:180});
    cast("slam", C.slamWind); playSfx("mnGrunt");
    return true;
  }
  if(dist > e.radius + 60) mnStep(e, tgt, dist, dt);
  _mnFace(e, tgt.x, tgt.y);
  return true;
}

/* ============================================================
   NIVEL 10 — CERBERO, GUARDIÁN DEL UMBRAL
   ============================================================ */
function mnCerbLevelStart(){
  levelDuration = 9e9;
  const P = mnS.cb; P.st = "prelude"; P.t = 0; P.act = 0;
  mnS.hell = 1;
  if(typeof setMusicMode==="function") setMusicMode("prelude");
}
function mnCerbEntity(){ return mnEnt("mn_cerbero"); }
function mnCerbController(dt){
  const P = mnS.cb, C = MN_CFG.cerbero;
  if(runLevel !== LEVEL_COUNT) return;
  P.t += dt;
  if(mnS.portal.st!=="none") mnPortalUpdate(dt);
  if(P.st==="prelude"){
    if(mnDescending()){ P.t = 0; return; }
    // presagio: cadenas, respiración y TRES rugidos superpuestos antes de verlo
    if(!P.p1 && P.t > 1400){ P.p1 = 1; playSfx("mnChains"); showBanner("Se oyen cadenas arrastrándose detrás de la puerta…"); }
    if(!P.p2 && P.t > 3400){ P.p2 = 1; playSfx("mnTripleRoar"); vfxShake(10); showBanner("Tres rugidos. Tres voces. Algo guarda la entrada."); }
    if(P.t >= 6200){
      P.st = "fight"; P.t = 0; P.act = 1;
      const A = MN_SECTORS[5].chain, e = mnSpawnAt("mn_cerbero", A.x, A.y); e.x = A.x; e.y = A.y;
      scaleBossStats(e, "mn_cerbero");
      e.bossPhase = 1; e.fx = 0; e.fy = 1;
      e.flameCd = 3500; e.stompCd = 6000; e.biteCd = 2200; e.howlCd = 11000; e.chargeCd = 9e9; e.summonCd = 9e9;
      bossActive = true; boss = e;
      bossEntrance(e);
      if(typeof MINAS_FX!=="undefined") bossSheetFx("mnHellSummon", e.x, e.y, 260, 900, {anchorY:0.9});
      arenaTitleCard("JEFE FINAL", "CERBERO", "Guardián del Umbral Infernal", 5200);
      mnTutSay("mn_cerb", "CERBERO: su LANZALLAMAS sale en cono (salí del frente), el PISOTÓN apaga las luces cercanas y el AULLIDO trae esbirros. Mantené la luz: todavía importa.", 11000, true);
    }
    return;
  }
  if(P.st==="fight"){
    const e = mnCerbEntity(); if(!e) return;
    const f = e.hp/e.maxHp;
    if(P.act===1 && f <= C.p2At){
      P.act = 2; e.bossPhase = 2; e.chargeCd = 2500; e.speed *= 1.2;
      showBanner("¡CERBERO ROMPE SUS CADENAS!"); playSfx("mnChainBreak"); vfxShake(12); flashScreen(0.3, "255,90,40");
      for(let k=0;k<14;k++) vfxBurst(e.x + mnRand(-120, 120), e.y + mnRand(-90, 60) - 40, 4, "spark", 160, 700, 3, 1, -40, 0);
      if(typeof bossPhaseFeedback==="function") bossPhaseFeedback();
    } else if(P.act===2 && f <= C.p3At){
      P.act = 3; e.bossPhase = 3; e.summonCd = 1500;
      showBanner("EL UMBRAL DESPIERTA: la luz infernal arde detrás de la puerta"); playSfx("mnPortalHum"); vfxShake(10); flashScreen(0.35, "255,40,20");
      if(typeof bossPhaseFeedback==="function") bossPhaseFeedback();
    }
    return;
  }
  if(P.st==="dying"){
    const T = P.t;
    if(!P.d1 && T > 1400){ P.d1 = 1; playSfx("mnChainBreak"); for(let k=0;k<18;k++) vfxBurst(P.x + mnRand(-140, 140), P.y + mnRand(-80, 40) - 40, 4, "spark", 160, 800, 3, 1, -40, 0); }
    if(!P.d2 && T > 3000){ P.d2 = 1; playSfx("mnCerbDeath"); vfxShake(10); showBanner("El fuego se apaga. Silencio."); }
    if(T >= C.deathMs){
      P.st = "dead"; P.t = 0;
      mnS.portal.st = "opening"; mnS.portal.t = 0;
      playSfx("mnPortalOpen"); vfxShake(12); flashScreen(0.35, "255,60,30");
      showBanner("La puerta detrás de él se quiebra… EL UMBRAL SE ABRE");
    }
  }
}
function mnAICerbero(e, dt, tgt, dist){
  const C = MN_CFG.cerbero, P = mnS.cb, act = P.act||1;
  e.atkCd = 1e6;
  if(P.st!=="fight"){ return true; }
  const sp = act===3 ? 0.72 : act===2 ? 0.85 : 1;
  for(const k of ["flameCd", "stompCd", "biteCd", "howlCd", "chargeCd", "summonCd"]) e[k] = (e[k]||2000) - dt;
  // LANZALLAMAS en curso: barrido del cono con daño por tics; deja fuego en el piso
  if(e.mnFlame){
    const F = e.mnFlame; F.t += dt; F.acc = (F.acc||0) + dt;
    const a = F.a0 + F.sw*Math.min(1, F.t/F.d), dx = Math.cos(a), dy = Math.sin(a);
    F.dx = +dx.toFixed(3); F.dy = +dy.toFixed(3); F.x = Math.round(e.x + dx*C.flameR*0.5); F.y = Math.round(e.y + dy*C.flameR*0.5);
    e.fx = dx; e.fy = dy; mnBossPack(e, "flame", 300);
    if(F.acc >= 250){ F.acc = 0; for(const h of heroes){ if(!h.alive) continue; const ax = h.x - e.x, ay = h.y - e.y, d = Math.hypot(ax, ay); if(d < C.flameR && d > 0 && (ax*dx + ay*dy)/d > Math.cos(C.flameArc*0.8)) bossHitHero(h, e.dmg*0.32, {from:e}); } }
    if(F.t >= F.d){ for(let k=1;k<=3;k++) mnS.fire.push({x:Math.round(e.x + dx*k*110), y:Math.round(e.y + dy*k*110), r:56, t:0, d:4200, dps:e.dmg*0.16}); e.mnFlame = null; e.mnBusy = false; }
    return true;
  }
  if(e.cast){ e.cast.t += dt; if(e.cast.t >= e.cast.d){ const f = e.cast.fn; e.cast = null; e.mnBusy = false; if(f) f(); } return true; }
  const cast = (set, ms, fn)=>{ mnBossPack(e, set, ms + 250); e.cast = {t:0, d:ms, fn}; e.mnBusy = true; };
  if(e.flameCd <= 0 && dist < C.flameR + 60){
    e.flameCd = mnRand(C.flameCd[0], C.flameCd[1])*sp; _mnFace(e, tgt.x, tgt.y);
    const a0 = Math.atan2(e.fy, e.fx) - 0.25, sw = 0.5*(Math.random() < 0.5 ? 1 : -1);
    mnCone("flamew", e, C.flameR, C.flameArc, C.flameWind, 0, {warn:1});
    cast("idle", C.flameWind, ()=>{ e.mnFlame = {t:0, d:C.flameMs, a0:sw > 0 ? a0 : a0 + 0.5, sw, x:e.x, y:e.y, dx:e.fx, dy:e.fy}; e.mnBusy = true; playSfx("mnFlame"); });
    playSfx("mnInhale");
    return true;
  }
  if(e.howlCd <= 0){
    e.howlCd = mnRand(C.howlCd[0], C.howlCd[1])*sp;
    cast("summon", C.howlWind, ()=>{
      for(const L of mnS.lights){ if(L.st===2){ L.e = Math.min(L.e, 0.45); mnLightSt(L); } }
      const c = mnPartyCenter(); mnLightsBlackout(c.x, c.y, 2400, MN_CFG.light.tempOffMs, act===1 ? 1 : 2);
      if(act >= 2){ const S = mnSector(); for(let k=0;k<2;k++){ const p = mnPick(S.tunnels), f = mnNearestFree(p.x, p.y, 24); mnSpawnAt("mn_esclavo", f.x, f.y); } }
      vfxShake(8); showBanner("¡AULLIDO INFERNAL! Las luces tiemblan");
      if(typeof MINAS_FX!=="undefined") bossSheetFx("mnHowl", e.x, e.y, 240, 800, {anchorY:0.9});
    });
    mnDrop("howl", e.x, e.y, 320, C.howlWind, 0, {warn:1});
    playSfx("mnHowl");
    return true;
  }
  if(e.stompCd <= 0 && dist < C.stompR + 90){
    e.stompCd = mnRand(C.stompCd[0], C.stompCd[1])*sp;
    mnDrop("cstomp", e.x, e.y, C.stompR, C.stompWind, e.dmg*1.2, {from:mnId(e), knock:70, black:380, bn:2});
    cast("stomp", C.stompWind); playSfx("mnGrunt");
    return true;
  }
  if(act >= 3 && e.summonCd <= 0){
    e.summonCd = mnRand(C.summonCd[0], C.summonCd[1]);
    cast("summon", 900, ()=>{ for(let k=0;k<3;k++){ const h = mnRandHero(), p = mnNearestFree(h.x + mnRand(-300, 300), h.y + mnRand(-240, 240), 30); if(typeof MINAS_FX!=="undefined") bossSheetFx("mnHellSummon", p.x, p.y, 120, 700, {anchorY:0.9}); mnSpawnAt(k ? "mn_esclavo" : "mn_acechador", p.x, p.y); } showBanner("INVOCACIÓN INFERNAL"); });
    playSfx("mnPortalHum");
    return true;
  }
  if(act >= 2 && e.chargeCd <= 0 && dist > 220 && dist < 700){
    e.chargeCd = mnRand(C.chargeCd[0], C.chargeCd[1])*sp; _mnFace(e, tgt.x, tgt.y);
    const L = Math.min(620, dist + 120), x2 = e.x + e.fx*L, y2 = e.y + e.fy*L;
    mnLine("charge", e.x, e.y, x2, y2, 70, C.chargeWind, e.dmg*1.3, {from:mnId(e), knock:60});
    cast("run", C.chargeWind + 200); playSfx("mnGrowl");
    return true;
  }
  if(e.biteCd <= 0 && dist < C.biteR + 50){
    e.biteCd = mnRand(C.biteCd[0], C.biteCd[1])*sp; _mnFace(e, tgt.x, tgt.y);
    for(let k=0;k<3;k++) mnCone("bite", e, C.biteR, 0.85, C.biteWind + k*260, e.dmg*0.75);
    cast("bite", C.biteWind + 520); playSfx("mnBite");
    return true;
  }
  // Acto 1: encadenado frente a la puerta (no persigue más allá de la cadena)
  const A = MN_SECTORS[5].chain;
  if(act===1){
    const nx = e.x + (tgt.x - e.x)/(dist||1)*40, ny = e.y + (tgt.y - e.y)/(dist||1)*40;
    if(Math.hypot(nx - A.x, ny - A.y) < C.chainR && dist > e.radius + 50) mnStep(e, tgt, dist, dt, 0.8);
  } else if(dist > e.radius + 60) mnStep(e, tgt, dist, dt);
  if(act===1){ const d = Math.hypot(e.x - A.x, e.y - A.y); if(d > C.chainR){ e.x = A.x + (e.x - A.x)/d*C.chainR; e.y = A.y + (e.y - A.y)/d*C.chainR; } }
  _mnFace(e, tgt.x, tgt.y);
  return true;
}
// La carga termina donde marcó la línea (se resuelve en mnDropsUpdate con el resto de los avisos)
function mnChargeLand(D){ const e = D.from ? mnById(D.from) : null; if(e){ e.x = D.x2; e.y = D.y2; mnClamp(e); } }

/* ---------------- PORTAL INFERNAL ---------------- */
function mnPortalUpdate(dt){
  const P = mnS.portal; P.t += dt;
  if(P.st==="opening" && P.t >= MN_CFG.cerbero.portalMs){
    P.st = "open"; P.t = 0;
    playSfx("mnPortalHum");
    showBanner("🜂 ATRAVIESA EL UMBRAL");
    mnAlert("portal", MN_SECTORS[5].portal.x, MN_SECTORS[5].portal.y, "ATRAVIESA EL UMBRAL", 9e9);
    mnTutSay("mn_portal", "El Portal Infernal está abierto. Acercate y MANTENÉ la acción ATRAVESAR EL UMBRAL cuando estés listo: basta con que un guardián lo cruce para que termine la arena.", 12000, true);
  }
}
// Validación autoritativa (anfitrión): la primera interacción válida bloquea la salida. Nunca dos veces.
function mnPortalEnter(h){
  const P = mnS.portal;
  if(P.st!=="open" || runEnding || !mnIsHuman(h)) return false;
  P.st = "used"; P.t = 0; P.by = heroes.indexOf(h);
  playSfx("mnPortalEnter"); flashScreen(0.6, "255,60,20"); vfxShake(10);
  showBanner(`${h.netName || (h.cls && h.cls.name) || "Un guardián"} atraviesa el Umbral… el equipo lo sigue al Infierno`);
  mnS.alerts = mnS.alerts.filter(a=>a.k!=="portal");
  if(typeof completeArenaByExit==="function") completeArenaByExit(); else finishBossVictory();
  return true;
}

/* ---------------- muerte de los jefes ---------------- */
function mnBossDefeated(b){
  if(!mnS || !b || b.type!=="mn_cerbero") return false;
  // CERBERO MUERTO != VICTORIA: secuencia de muerte y después el portal (ENEMY_BASE.defeatOutcome = "exit")
  const P = mnS.cb; P.st = "dying"; P.t = 0; P.x = Math.round(b.x); P.y = Math.round(b.y); P.fx = b.fx < 0 ? -1 : 1;
  bossActive = false;
  for(const o of enemies){ if(o.alive && o!==b){ o.alive = false; o.hp = 0; vfxOnDeath(o); } }
  enemies = enemies.filter(o=>o.alive);
  mnS.drops.length = 0; mnS.shots.length = 0;
  if(typeof bossHudHide==="function") bossHudHide();
  if(typeof setMusicMode==="function") setMusicMode("prelude");
  hitStop(140, true); slowMo(0.3, 1800);
  playSfx("mnCerbDeath"); showBanner("CERBERO SE DERRUMBA…");
  return true;
}
function mnEnemyKilled(e){
  if(!mnS) return;
  // la emboscada de un Acechador muerto no se resuelve
  if(e.type==="mn_acechador") mnS.drops = mnS.drops.filter(D=>!(D.k==="amb" && D.src===e.mnId));
  if(e.type==="mn_insecto") mnDrop("shard", e.x, e.y, MN_CFG.insecto.shardR, MN_CFG.insecto.shardWind, e.dmg*MN_CFG.insecto.shardMult);
  if(e.type==="mn_consumidor"){
    // libera la luz absorbida: reenciende fuentes cercanas y cura un poco
    let n = 0;
    mnS.lights.filter(L=>L.st<2 && Math.hypot(L.x - e.x, L.y - e.y) < MN_CFG.consumidor.pulseR + 200).sort((a, b)=>Math.hypot(a.x - e.x, a.y - e.y) - Math.hypot(b.x - e.x, b.y - e.y)).slice(0, 2).forEach(L=>{ mnRelight(L); n++; });
    mnHeroesNear(e.x, e.y, 260, h=>{ h.hp = Math.min(h.maxHp, h.hp + h.maxHp*0.06); });
    vfxShock(e.x, e.y, 20, MN_CFG.consumidor.pulseR, "150,200,255", 700, 2);
    showBanner(n ? "La luz absorbida vuelve a las fuentes" : "El Consumidor libera la luz que robó");
  }
  if(e.type==="mn_devoraluz"){
    let n = 0;
    for(const L of mnS.lights){ if(L.dev && n < 2){ mnRelight(L); n++; } }
    vfxShock(e.x, e.y, 30, 400, "220,120,255", 900, 2); vfxShake(8);
    showBanner(n ? "¡El Devoraluz cae! La luz robada vuelve" : "¡El Devoraluz cae!");
    playSfx("mnDevDeath");
  }
  if(e.type==="mn_titan"){ vfxShake(14); flashScreen(0.25, "255,160,90"); }
}
