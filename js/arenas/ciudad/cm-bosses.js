"use strict";
/* ============================================================
   js/arenas/ciudad/cm-bosses.js
   CIUDAD MALDITA — el ESPECTÁCULO.
   NIVEL 9 (anteúltimo), dos batallas seguidas:
     1) MAESTRO DE CEREMONIAS + EL TRAMOYISTA, juntos: control + presión. El Maestro MARCA, abre ZONAS,
        dispara abanicos y se TELETRANSPORTA; el Tramoyista golpea, deja caer DECORADO sobre las marcas,
        tira utilería y arma BARRICADAS temporales (nunca más de dos, vencen solas: sin encierros).
        Si uno cae, el otro se enfurece.
     2) APAGÓN -> LA DAMA DEL TELÓN: telones que caen en línea, zonas oscuras, espejismos y ECOS de
        las mecánicas anteriores (la marca del Maestro, el decorado del Tramoyista). Al 30% estalla.
     Cae el telón: detrás espera el final.
   NIVEL 10: EL PRESENTADOR (no es un Guardián: es el dueño del espectáculo).
     Acto I (humanoide) · Acto II (transformación; ECOS LIMITADOS de los subjefes) · Acto III (verdadera
     forma: espectadores espectrales, manipulación del escenario y la OVACIÓN FINAL: cubrirse tras un pilar).
     Pocas líneas y cortas; línea especial si el rescate fue perfecto. Muerte con secuencia propia.
   Los civiles salvados se reconocen en la narrativa (menos espectadores hostiles y una línea), sin
   castigar a quien salvó pocos.
   ============================================================ */
function cmEnt(type){ return enemies.find(o=>o.alive && o.type===type) || null; }
function cmBossPack(e, set, ms){ e.packSet = set; e.packTimer = ms; e.packDur = ms; }
function cmPartyCenter(){ let sx = 0, sy = 0, n = 0; for(const h of heroes){ if(h.alive){ sx += h.x; sy += h.y; n++; } } return n ? {x:sx/n, y:sy/n} : {x:player.x, y:player.y}; }
function cmRandHero(){ const L = heroes.filter(h=>h.alive); return L.length ? cmPick(L) : player; }
// impacto con aviso en el piso (lo resuelve cmDropsUpdate)
function cmDrop(k, x, y, r, wind, dmg, o){ cmS.drops.push(Object.assign({k, x:Math.round(x), y:Math.round(y), r, t:0, d:wind, dmg}, o||{})); }
function cmZone(k, x, y, r, ms, o){ cmS.zones.push(Object.assign({k, x:Math.round(x), y:Math.round(y), r, t:0, d:ms}, o||{})); }
function cmDropsUpdate(dt){
  for(let i=cmS.drops.length-1;i>=0;i--){
    const D = cmS.drops[i]; D.t += dt;
    if(D.follow){ const h = heroes[D.follow - 1]; if(h && h.alive && D.t < D.d - 600){ D.x = Math.round(h.x); D.y = Math.round(h.y); } }
    if(D.t >= D.d){
      cmHeroesNear(D.x, D.y, D.r, h=>bossHitHero(h, D.dmg, {from:D.from ? cmEnt(D.from) : null, knock:D.knock||0, stun:D.stun||0}));
      if(D.civ) cmCivsNear(D.x, D.y, D.r, c=>cmHurtCiv(c, D.dmg*0.5, null));
      if(D.struct) cmStructArea(D.x, D.y, D.r + 30, D.struct, null);
      const fx = {scenery:"cmScenery", mark:"cmShowMark", curtain:"cmChaosCurtain", mae:"cmMark", burst:"cmFinalBoom", spect:"cmPreBolt"}[D.k];
      if(fx && typeof CIUDAD_FX!=="undefined") bossSheetFx(fx, D.x, D.y, Math.max(70, D.r*1.6), 520, {anchorY:D.k==="curtain" || D.k==="scenery" ? 0.9 : 0.6});
      vfxBurst(D.x, D.y, 8, D.k==="scenery" ? "wood" : "ember", 110, 480, 3, 1, -30, 0);
      if(D.r > 80) vfxShake(4);
      playSfx(D.k==="scenery" ? "cmCrash" : "cmBlast");
      cmS.drops.splice(i, 1);
    }
  }
}
function cmZonesUpdate(dt){
  for(let i=cmS.zones.length-1;i>=0;i--){
    const Z = cmS.zones[i]; Z.t += dt;
    if(Z.dps && Z.t > (Z.arm||0)){
      Z.acc = (Z.acc||0) + dt;
      if(Z.acc >= 500){ Z.acc = 0; cmHeroesNear(Z.x, Z.y, Z.r, h=>{ bossHitHero(h, Z.dps, {slow:Z.slow||0, slowDur:700}); }); }
    }
    if(Z.t >= Z.d) cmS.zones.splice(i, 1);
  }
  for(let i=cmS.bars.length-1;i>=0;i--){ const B = cmS.bars[i]; B.t += dt; if(B.t >= B.d) cmS.bars.splice(i, 1); }
  for(let i=cmS.pillars.length-1;i>=0;i--){ const P = cmS.pillars[i]; P.t += dt; if(P.t >= P.d) cmS.pillars.splice(i, 1); }
}

/* ============================================================
   NIVEL 9 — Maestro de Ceremonias + Tramoyista -> apagón -> Dama del Telón
   ============================================================ */
function cmSubDirector(dt){
  const S = cmS.sub;
  if(runLevel !== 9) return;
  S.t += dt;
  if(S.st==="none"){
    if(levelClearing || runEnding) return;
    if(levelTimer > levelDuration*0.3){
      S.st = "curtain"; S.t = 0;
      playSfx("cmCurtain"); showBanner("🎭 Suenan aplausos en la ciudad vacía… EL TELÓN SE LEVANTA");
      if(typeof setMusicMode==="function") setMusicMode("prelude");
    }
    return;
  }
  if(S.st==="curtain"){
    if(S.t >= 3200){
      S.st = "fight1"; S.t = 0;
      const c = cmPartyCenter();
      const a = cmNearestFree(c.x - 230, c.y - 180, 40), b = cmNearestFree(c.x + 230, c.y - 160, 50);
      const m = cmSpawnAt("cm_maestro", a.x, a.y), t = cmSpawnAt("cm_tramoyista", b.x, b.y);
      for(const e of [m, t]){ e.bossPhase = 1; e.fx = 0; e.fy = 1; if(typeof CIUDAD_FX!=="undefined") bossSheetFx("cmCurtain", e.x, e.y, 150, 800, {anchorY:0.9}); }
      m.markCd = 3500; m.boltCd = 1800; m.zoneCd = 7000; m.tpCd = 6000;
      t.slamCd = 2500; t.dropCd = 5500; t.barCd = 9000; t.throwCd = 4500;
      vfxShake(10); flashScreen(0.25, "255,120,140"); playSfx("bossRoar");
      if(typeof setMusicMode==="function") setMusicMode("boss");
      arenaTitleCard("SUBJEFES", "MAESTRO DE CEREMONIAS Y EL TRAMOYISTA", "«Damas y caballeros… la función comienza.»", 4600);
      cmTutSay("cm_sub1", "Dos a la vez: el MAESTRO marca y abre zonas; el TRAMOYISTA tira decorado sobre las marcas. Separalos o bajá primero al que controla.", 9000, true);
    }
    return;
  }
  if(S.st==="fight1"){
    const m = cmEnt("cm_maestro"), t = cmEnt("cm_tramoyista");
    if(m && !t && !m._rage){ m._rage = 1; m.speed *= 1.2; showBanner("¡EL MAESTRO SE ENFURECE!"); playSfx("cmLaugh"); }
    if(t && !m && !t._rage){ t._rage = 1; t.speed *= 1.25; showBanner("¡EL TRAMOYISTA SE ENFURECE!"); playSfx("bossRoar"); }
    if(!m && !t){
      S.st = "blackout"; S.t = 0; cmS.bars.length = 0; cmS.drops.length = 0; cmS.zones.length = 0; cmS.shots.length = 0;
      playSfx("cmBlackout"); showBanner("…SE APAGAN LAS LUCES…");
      if(typeof setMusicMode==="function") setMusicMode("prelude");
    }
    return;
  }
  if(S.st==="blackout"){
    cmS.dark = Math.min(0.88, S.t/1200*0.88);
    if(S.t >= 3400){
      S.st = "fight2"; S.t = 0;
      const c = cmPartyCenter(), p = cmNearestFree(c.x, c.y - 260, 40);
      const d = cmSpawnAt("cm_dama", p.x, p.y);
      d.bossPhase = 1; d.fx = 0; d.fy = 1; d.curtainCd = 3000; d.boltCd = 2000; d.darkCd = 6000; d.mirrorCd = 9000; d.summonCd = 12000;
      activeChampion = d;
      cmS.spot = {x:Math.round(d.x), y:Math.round(d.y), t:0};
      playSfx("cmSpot"); vfxShake(8); if(typeof setMusicMode==="function") setMusicMode("boss");
      arenaTitleCard("SUBJEFE", "LA DAMA DEL TELÓN", "«Nadie aplaude en la oscuridad.»", 4600);
    }
    return;
  }
  if(S.st==="fight2"){
    cmS.dark = Math.max(0.28, cmS.dark - dt/2000);
    const d = cmEnt("cm_dama");
    if(cmS.spot && d){ cmS.spot.x = Math.round(d.x); cmS.spot.y = Math.round(d.y); }
    if(!d){
      S.st = "reveal"; S.t = 0; activeChampion = null; cmS.spot = null;
      for(const o of enemies){ if(o.alive && o.type==="cm_espejismo"){ o.alive = false; o.hp = 0; vfxOnDeath(o); } }
      cmS.drops.length = 0; cmS.zones.length = 0;
      playSfx("cmCurtain"); showBanner("EL TELÓN CAE…");
    }
    return;
  }
  if(S.st==="reveal"){
    cmS.dark = Math.max(0, cmS.dark - dt/1500);
    if(S.t > 1800 && !S.r1){ S.r1 = 1; showBanner("…y detrás, en la catedral, ALGUIEN APLAUDE."); playSfx("cmApplause"); }
    if(S.t >= 4200){ S.st = "done"; S.t = 0; if(typeof setMusicMode==="function") setMusicMode("wave", runLevel); }
  }
}
// ---- Maestro de Ceremonias ----
function cmAIMaestro(e, dt, tgt, dist){
  const C = CM_CFG.maestro, rage = e._rage ? 0.7 : 1;
  e.atkCd = 1e6;
  for(const k of ["markCd", "boltCd", "zoneCd", "tpCd"]) e[k] = (e[k]||2000) - dt;
  if(e.cast){ e.cast.t += dt; if(e.cast.t >= e.cast.d){ e.cast = null; e.cmBusy = false; } return true; }
  // teletransporte: si lo encierran
  if(e.tpCd <= 0 && dist < 150){
    e.tpCd = cmRand(C.tpCd[0], C.tpCd[1])*rage;
    if(typeof CIUDAD_FX!=="undefined") bossSheetFx("cmMaeBolt", e.x, e.y, 90, 420, {anchorY:0.7});
    const a = Math.random()*Math.PI*2, p = cmNearestFree(tgt.x + Math.cos(a)*340, tgt.y + Math.sin(a)*260, 40);
    e.x = p.x; e.y = p.y; cmBossPack(e, "tp", 600); playSfx("cmTeleport");
    return true;
  }
  if(e.markCd <= 0){
    e.markCd = cmRand(C.markCd[0], C.markCd[1])*rage;
    const h = cmRandHero(), hi = heroes.indexOf(h);
    cmDrop("mae", h.x, h.y, C.markR, C.markMs, e.dmg*1.2, {follow:hi + 1, from:"cm_maestro"});
    // sinergia: el Tramoyista deja caer decorado sobre la marca
    const t = cmEnt("cm_tramoyista"); if(t) t._dropOn = hi + 1;
    cmBossPack(e, "cast", 700); e.cast = {t:0, d:500}; e.cmBusy = true;
    floatText(h.x, h.y - 80, "¡MARCADO!", "warn"); playSfx("cmMark");
    return true;
  }
  if(e.zoneCd <= 0){
    e.zoneCd = cmRand(C.zoneCd[0], C.zoneCd[1])*rage;
    const h = cmRandHero();
    cmZone("mae", h.x, h.y, C.zoneR, C.zoneMs, {dps:e.dmg*0.35, arm:900, slow:0.25});
    vfxTelegraph({shape:0, x:h.x, y:h.y, r:C.zoneR, dur:900, rgb:"255,60,90"});
    cmBossPack(e, "cast", 800); e.cast = {t:0, d:600}; e.cmBusy = true; playSfx("cmZone");
    return true;
  }
  if(e.boltCd <= 0 && dist < 520){
    e.boltCd = cmRand(C.boltCd[0], C.boltCd[1])*rage;
    const a0 = Math.atan2(tgt.y - e.y, tgt.x - e.x);
    for(let k=-1;k<=1;k++){ const a = a0 + k*0.22; cmShot(e, e.x + Math.cos(a)*400, e.y + Math.sin(a)*400, "mae", 260, 0.8); }
    e.attackAnim = 320; playSfx("cmBolt");
    return true;
  }
  if(dist < 240){ const ux = (e.x - tgt.x)/(dist||1), uy = (e.y - tgt.y)/(dist||1); cmStepTo(e, e.x + ux*60, e.y + uy*60, dt, 0.9); }
  else if(dist > 380) cmStep(e, tgt, dist, dt);
  _cmFace(e, tgt.x, tgt.y);
  return true;
}
// ---- El Tramoyista ----
function cmAITramoyista(e, dt, tgt, dist){
  const C = CM_CFG.tramoyista, rage = e._rage ? 0.7 : 1;
  e.atkCd = 1e6;
  for(const k of ["slamCd", "dropCd", "barCd", "throwCd"]) e[k] = (e[k]||2000) - dt;
  if(e.tw){
    e.tw.t += dt; _cmFace(e, e.tw.x, e.tw.y);
    if(e.tw.t >= e.tw.d){
      const W = e.tw; e.tw = null; e.cmBusy = false; e.attackAnim = 400;
      if(W.k==="slam"){
        const cx = e.x + e.fx*C.slamR*0.5, cy = e.y + e.fy*C.slamR*0.5;
        cmHeroesNear(cx, cy, C.slamR*0.75, h=>bossHitHero(h, e.dmg*1.3, {from:e, knock:50}));
        cmStructArea(cx, cy, C.slamR, 60, e);
        if(typeof CIUDAD_FX!=="undefined") bossSheetFx("cmTraImpact", cx, cy, 110, 520, {anchorY:0.6});
        vfxShake(6); playSfx("cmSmash");
      } else if(W.k==="throw"){ cmShot(e, W.x, W.y, "prop", 300, 1.2, {r:24}); playSfx("cmThrow"); }
    }
    return true;
  }
  // decorado sobre la marca del Maestro (o sobre los guardianes)
  if(e._dropOn || e.dropCd <= 0){
    const targets = e._dropOn ? [heroes[e._dropOn - 1]].filter(Boolean) : heroes.filter(h=>h.alive).slice(0, 3);
    e._dropOn = 0; e.dropCd = cmRand(C.dropCd[0], C.dropCd[1])*rage;
    for(const h of targets){ cmDrop("scenery", h.x + cmRand(-20, 20), h.y + cmRand(-20, 20), C.dropR, C.dropWind, e.dmg*1.1, {civ:1}); }
    cmBossPack(e, "wreck", 800); playSfx("cmRope");
    return true;
  }
  if(e.barCd <= 0 && cmS.bars.length < 2){
    e.barCd = cmRand(C.barCd[0], C.barCd[1])*rage;
    cmTramoyistaBarricade(e, tgt);
    return true;
  }
  if(e.throwCd <= 0 && dist > 180 && dist < 560){
    e.throwCd = cmRand(C.throwCd[0], C.throwCd[1])*rage;
    e.tw = {k:"throw", t:0, d:C.throwWind, x:tgt.x, y:tgt.y}; e.cmBusy = true; cmBossPack(e, "throw", C.throwWind + 200);
    const dx = tgt.x - e.x, dy = tgt.y - e.y, d = Math.hypot(dx, dy)||1;
    vfxTelegraph({shape:2, x:e.x, y:e.y, r:22, len:d, dx:dx/d, dy:dy/d, dur:C.throwWind, rgb:"255,150,60"});
    return true;
  }
  if(e.slamCd <= 0 && dist < C.slamR + 30){
    e.slamCd = cmRand(C.slamCd[0], C.slamCd[1])*rage;
    e.tw = {k:"slam", t:0, d:C.slamWind, x:tgt.x, y:tgt.y}; e.cmBusy = true; _cmFace(e, tgt.x, tgt.y); cmBossPack(e, "hit6", C.slamWind + 300);
    vfxTelegraph({shape:1, x:e.x, y:e.y, r:C.slamR + 20, dx:e.fx, dy:e.fy, arc:0.75, dur:C.slamWind, rgb:"255,110,50"});
    return true;
  }
  if(dist > e.radius + tgt.radius - 4) cmStep(e, tgt, dist, dt);
  return true;
}
// barricada temporal: nunca encima de nadie, nunca tapando una puerta ni una zona segura (sin encierros)
function cmTramoyistaBarricade(e, tgt){
  const C = CM_CFG.tramoyista;
  for(let k=0;k<8;k++){
    const a = Math.random()*Math.PI*2, cx = tgt.x + Math.cos(a)*170, cy = tgt.y + Math.sin(a)*140;
    const horiz = Math.random() < 0.5, hw = horiz ? 90 : 16, hh = horiz ? 16 : 90;
    const B = {x0:Math.round(cx - hw), y0:Math.round(cy - hh), x1:Math.round(cx + hw), y1:Math.round(cy + hh), t:0, d:C.barMs};
    const clear = !heroes.some(h=>h.alive && _cmInRect(h.x, h.y, B, 40)) && !cmS.civ.some(c=>cmCivAlive(c) && _cmInRect(c.x, c.y, B, 30))
      && !CM_SAFE.some(z=>Math.hypot(z.x - cx, z.y - cy) < 180) && !CM_BUILDINGS.some(b=>b.doorPt && Math.hypot(b.doorPt.x - cx, b.doorPt.y - cy) < 150)
      && cmInside(cx, cy, 30) && cmInside(B.x0, B.y0, 4) && cmInside(B.x1, B.y1, 4);
    if(clear){ cmS.bars.push(B); cmBossPack(e, "drag", 900); playSfx("cmRope"); if(typeof CIUDAD_FX!=="undefined") bossSheetFx("cmScenery", cx, cy, 90, 500, {anchorY:0.8}); return; }
  }
}
// ---- La Dama del Telón ----
function cmAIDama(e, dt, tgt, dist){
  const C = CM_CFG.dama;
  e.atkCd = 1e6;
  for(const k of ["curtainCd", "boltCd", "darkCd", "mirrorCd", "summonCd"]) e[k] = (e[k]||2000) - dt;
  if(e.cast){ e.cast.t += dt; if(e.cast.t >= e.cast.d){ const f = e.cast.fn; e.cast = null; e.cmBusy = false; if(f) f(); } return true; }
  const cast = (set, ms, fn)=>{ cmBossPack(e, set, ms + 200); e.cast = {t:0, d:ms, fn}; e.cmBusy = true; };
  // al 30%: estallido grande (una vez)
  if(!e._burst && e.hp < e.maxHp*C.burstAt){
    e._burst = 1;
    vfxTelegraph({shape:0, x:e.x, y:e.y, r:320, dur:1800, rgb:"255,40,80"});
    showBanner("¡LA DAMA ESTALLA! — alejate"); playSfx("cmLaugh");
    cast("summon", 1800, ()=>{ cmHeroesNear(e.x, e.y, 320, h=>bossHitHero(h, e.dmg*2, {from:e, knock:60})); if(typeof CIUDAD_FX!=="undefined") bossSheetFx("cmDamaBoom", e.x, e.y, 260, 700, {anchorY:0.7}); vfxShake(10); playSfx("cmBlast"); });
    return true;
  }
  if(e.summonCd <= 0){
    // ECOS de lo anterior: la marca del Maestro, el decorado del Tramoyista y almas de la ciudad
    e.summonCd = cmRand(C.summonCd[0], C.summonCd[1]);
    cast("summon", 900, ()=>{
      const h = cmRandHero(); cmDrop("mae", h.x, h.y, 100, 1700, e.dmg*1.1, {follow:heroes.indexOf(h) + 1});
      for(const o of heroes.filter(q=>q.alive).slice(0, 2)) cmDrop("scenery", o.x + cmRand(-30, 30), o.y + cmRand(-30, 30), 90, 1300, e.dmg);
      for(let k=0;k<3;k++){ const p = cmNearestFree(e.x + cmRand(-200, 200), e.y + cmRand(-150, 150), 24); cmSpawnAt("cm_espectro", p.x, p.y); }
      showBanner("ECOS DE LA FUNCIÓN: la marca, el decorado… y las almas de la ciudad"); playSfx("cmWhisper");
    });
    return true;
  }
  if(e.mirrorCd <= 0){
    e.mirrorCd = cmRand(C.mirrorCd[0], C.mirrorCd[1]);
    cast("mirror", 900, ()=>{ for(let k=0;k<2;k++){ const p = cmNearestFree(e.x + cmRand(-260, 260), e.y + cmRand(-200, 200), 40); const m = cmSpawnAt("cm_espejismo", p.x, p.y); m.maxHp = m.hp = 1; m.boltCd = 1500 + k*500; } playSfx("cmMirror"); });
    return true;
  }
  if(e.curtainCd <= 0){
    e.curtainCd = cmRand(C.curtainCd[0], C.curtainCd[1]);
    const h = cmRandHero(), dx = h.x - e.x, dy = h.y - e.y, d = Math.hypot(dx, dy)||1;
    cast("cast", 500, null);
    for(let k=0;k<6;k++){ const q = 0.25 + k*0.22; cmDrop("curtain", e.x + dx/d*d*q, e.y + dy/d*d*q, 62, C.curtainWind + k*140, e.dmg*1.1, {struct:40}); }
    playSfx("cmCurtain");
    return true;
  }
  if(e.darkCd <= 0){
    e.darkCd = cmRand(C.darkCd[0], C.darkCd[1]);
    const h = cmRandHero(); cast("cast", 600, null);
    cmZone("dark", h.x, h.y, C.darkR, C.darkMs, {dps:e.dmg*0.3, arm:900, slow:0.35});
    vfxTelegraph({shape:0, x:h.x, y:h.y, r:C.darkR, dur:900, rgb:"170,60,255"});
    return true;
  }
  if(e.boltCd <= 0){
    e.boltCd = cmRand(C.boltCd[0], C.boltCd[1]);
    for(let k=0;k<6;k++){ const a = k/6*Math.PI*2 + Math.random()*0.3; cmShot(e, e.x + Math.cos(a)*400, e.y + Math.sin(a)*400, "dama", 220, 0.8); }
    e.attackAnim = 320; playSfx("cmBolt");
    return true;
  }
  if(dist < 220){ const ux = (e.x - tgt.x)/(dist||1), uy = (e.y - tgt.y)/(dist||1); cmStepTo(e, e.x + ux*60, e.y + uy*60, dt, 0.9); }
  else if(dist > 360) cmStep(e, tgt, dist, dt);
  _cmFace(e, tgt.x, tgt.y);
  return true;
}
// espejismo: copia frágil que también dispara (el verdadero tiene sombra y barra de vida)
function cmAIEspejismo(e, dt, tgt, dist){
  e.atkCd = 1e6; e.boltCd = (e.boltCd||1500) - dt;
  if(e.boltCd <= 0){ e.boltCd = 2600; cmShot(e, tgt.x, tgt.y, "dama", 200, 0.5); e.attackAnim = 300; }
  if(dist > 300) cmStep(e, tgt, dist, dt, 0.8);
  _cmFace(e, tgt.x, tgt.y);
  return true;
}

/* ============================================================
   NIVEL 10 — EL PRESENTADOR
   ============================================================ */
function cmPresLevelStart(){
  levelDuration = 9e9;
  const P = cmS.pr; P.st = "prelude"; P.t = 0; P.act = 0;
  if(typeof setMusicMode==="function") setMusicMode("prelude");
  runLater(900, ()=>{ if(state==="playing") showBanner("La ciudad queda en silencio. En la catedral se enciende UN reflector."); });
}
function cmPresEntity(){ return cmEnt("cm_presentador"); }
function cmPresController(dt){
  const P = cmS.pr, C = CM_CFG.presentador;
  if(runLevel !== LEVEL_COUNT) return;
  P.t += dt;
  if(P.st==="prelude"){
    if(!P.s1 && P.t > 2600){ P.s1 = 1; playSfx("cmApplause"); showBanner("«¿Me escuchan? Excelente. Entonces empecemos.»"); }
    if(P.t >= 5200){
      P.st = "fight"; P.t = 0; P.act = 1;
      for(const o of enemies){ if(o.alive){ o.alive = false; o.hp = 0; vfxOnDeath(o); } }
      enemies = enemies.filter(o=>o.alive);
      // se levanta el telón: el equipo (y quien lo siga) pasa al ESCENARIO frente a la catedral
      flashScreen(0.6, "20,0,10"); playSfx("cmCurtain");
      heroes.forEach((h, i)=>{ const p = cmNearestFree(CM_MAP.stage.x - 150 + i*100, CM_MAP.stage.y + 330, 24); h.x = p.x; h.y = p.y; h.invulnTimer = Math.max(h.invulnTimer||0, 1200); });
      for(const c of cmS.civ){ if(c.st===CIV.FOLLOW){ c.st = CIV.RESCUED; c.t = 9999; cmS.saved++; } }   // los que venían con vos quedan a salvo tras bambalinas
      const S = CM_MAP.stage, e = cmSpawnAt("cm_presentador", S.x, S.y); e.x = S.x; e.y = S.y;
      scaleBossStats(e, "cm_presentador");
      e.bossPhase = 1; e.fx = 0; e.fy = 1;
      e.boltCd = 2200; e.markCd = 5000; e.curtainCd = 8000; e.echoCd = 6000; e.addCd = 12000; e.ovCd = 9000;
      bossActive = true; boss = e;
      bossEntrance(e);
      // reconocimiento de los civiles salvados (narrativo; un empujón chico, nunca un castigo)
      const sv = cmS.saved; P.cheer = Math.min(8, Math.floor(sv/3));
      if(P.cheer){ e.maxHp = e.hp = Math.round(e.maxHp/(1 + P.cheer*0.01)); }   // equivale a +cheer% de daño del equipo
      arenaTitleCard("JEFE FINAL", "EL PRESENTADOR", "«Todo esto es un espectáculo… y ustedes son mis invitados especiales.»", 5200);
      if(sv >= 10) runLater(5600, ()=>{ if(state==="playing") showBanner(`Desde los refugios, ${sv} voces gritan tu nombre. (+${P.cheer}% de daño)`); });
    }
    return;
  }
  if(P.st==="fight" || P.st==="transform"){
    const e = cmPresEntity(); if(!e) return;
    const f = e.hp/e.maxHp;
    if(P.st==="fight" && P.act===1 && f <= C.p2At) cmPresTransform(e, 2);
    else if(P.st==="fight" && P.act===2 && f <= C.p3At) cmPresTransform(e, 3);
    if(P.st==="transform"){
      e.hp = Math.max(e.hp, e.maxHp*(P.act===2 ? C.p2At : C.p3At) - 1);
      if(P.t >= C.transformMs){ P.st = "fight"; P.t = 0; e.dmgTakenMult = 1; e.cmBusy = false; e.cineT = 0;
        e.atlasKey = P.act===2 ? "cm_presentador2" : "cm_presentador3"; e.radius = P.act===2 ? 52 : 60;
        if(P.act===3){ cmPresSpectators(); }
        vfxShake(12); flashScreen(0.3, "255,80,120"); playSfx("bossRoar");
      }
    }
    if(P.act===3){ cmS.dark = Math.min(0.42, cmS.dark + dt/3000); cmSpectatorsUpdate(dt); }
    cmReflUpdate(dt);
    return;
  }
  if(P.st==="dying"){
    const T = P.t;
    cmS.dark = Math.max(0, cmS.dark - dt/4000);
    if(!P.d1 && T > 900){ P.d1 = 1; showBanner(cmS.lost===0 && cmS.saved >= cmS.total && cmS.total > 0 ? "«Los salvaste a todos… qué final tan aburrido. Tan… hermoso.»" : "«No… todavía no bajen el telón… el público…»"); playSfx("cmLaugh"); }
    if(!P.d2 && T > 3600){ P.d2 = 1; flashScreen(0.35, "255,200,200"); vfxShock(P.x, P.y, 40, 700, "255,80,120", 1300, 2); if(typeof CIUDAD_FX!=="undefined") bossSheetFx("cmFinalBoom", P.x, P.y, 320, 1200, {anchorY:0.7}); playSfx("cmBlast"); vfxShake(14); }
    if(!P.d3 && T > 6000){ P.d3 = 1; playSfx("cmApplause"); showBanner("Silencio. Después, de a uno, los aplausos de la gente que salvaste."); }
    if(T >= C.deathMs){ P.st = "dead"; if(typeof finishBossVictory==="function") finishBossVictory(); }
  }
}
function cmPresTransform(e, act){
  const P = cmS.pr;
  P.st = "transform"; P.t = 0; P.act = act;
  e.bossPhase = act; e.dmgTakenMult = 0.0001; e.cmBusy = true; e.cineT = CM_CFG.presentador.transformMs;
  e.atlasKey = "cm_presentador"; cmBossPack(e, "transform", CM_CFG.presentador.transformMs);
  cmS.drops.length = 0;
  if(typeof bossPhaseFeedback==="function") bossPhaseFeedback();
  playSfx("cmTransform"); vfxShake(10); flashScreen(0.3, "200,40,90");
  // el escenario cambia: suben pilares alrededor
  cmPresPillars(e, act===2 ? 6 : 4, act===2 ? 380 : 250);
  showBanner(act===2 ? "ACTO II — «¡Un aplauso para mis ayudantes!»" : "ACTO III — «Ahora… la verdadera función.»");
  if(act===3) cmTutSay("cm_act3", "ACTO III: cuando anuncie la OVACIÓN FINAL, CUBRITE detrás de un pilar del escenario.", 9000, true);
}
// Suben n pilares alrededor del Presentador. Antes se probaban solo n ángulos fijos y los que caían fuera del
// escenario (el Presentador está pegado a la catedral) se perdían: en la Ovación solía subir UNO solo, a veces
// del lado de atrás. Ahora se prueban 12 ángulos en 3 radios y se aceptan los que entran, separados entre sí.
function cmPresPillars(e, n, R){
  const C = CM_CFG.presentador, placed = [], a0 = Math.random()*Math.PI*2;
  const standing = cmS.pillars.filter(p=>p.t + 700 < p.d);
  for(const rr of [R, R*0.8, R*1.3]){
    for(let k=0;k<12 && placed.length < n;k++){
      const a = a0 + k/12*Math.PI*2, p = {x:Math.round(e.x + Math.cos(a)*rr), y:Math.round(e.y + Math.sin(a)*rr*0.8)};
      if(!cmInside(p.x, p.y, 40) || heroes.some(h=>h.alive && Math.hypot(h.x - p.x, h.y - p.y) < 60)) continue;
      if(placed.concat(standing).some(q=>Math.hypot(q.x - p.x, q.y - p.y) < 150)) continue;
      placed.push(p);
    }
  }
  placed.forEach((p, k)=>cmS.pillars.push({x:p.x, y:p.y, r:34, t:-700, d:C.pillarMs, v:k % 8}));
  playSfx("cmPillar");
}
function cmPresSpectators(){
  const n = Math.max(2, 6 - Math.floor(cmS.saved/6));
  cmS.spec = [];
  const S = CM_MAP.stage;
  for(let k=0;k<n;k++){ const a = Math.PI*(0.1 + 0.8*k/Math.max(1, n - 1)); cmS.spec.push({x:Math.round(S.x + Math.cos(a)*560), y:Math.round(S.y + 180 + Math.sin(a)*420), t:cmRand(0, 2000), v:k % 4}); }
  if(cmS.saved >= 6) runLater(2000, ()=>{ if(state==="playing") showBanner("Entre los espectadores espectrales faltan asientos: los que salvaste no vinieron a verte caer."); });
}
function cmSpectatorsUpdate(dt){
  const C = CM_CFG.presentador;
  for(const s of (cmS.spec||[])){
    s.t += dt;
    if(s.t >= C.spectatorCd[1]){ s.t = cmRand(0, C.spectatorCd[1] - C.spectatorCd[0]); const h = cmRandHero(); cmDrop("spect", h.x + cmRand(-40, 40), h.y + cmRand(-40, 40), 56, 1000, (boss ? boss.dmg : 20)*0.5*C.telMult); }
  }
}
function cmAIPresentador(e, dt, tgt, dist){
  const C = CM_CFG.presentador, P = cmS.pr, act = P.act||1;
  e.atkCd = 1e6;
  if(P.st!=="fight"){ return true; }
  const sp = act===3 ? 0.8 : act===2 ? 0.9 : 1;
  for(const k of ["boltCd", "markCd", "curtainCd", "echoCd", "addCd", "ovCd"]) e[k] = (e[k]||2000) - dt;
  if(e.ov){
    // OVACIÓN FINAL: los que no están cubiertos por un pilar reciben un golpe enorme
    e.ov.t += dt; cmBossPack(e, "cast", 400);
    if(Math.random() < dt/300) vfxBurst(e.x, e.y - 60, 4, "ember", 90, 500, 3, 1, -40, 0);
    if(e.ov.t >= C.ovationWind){
      e.ov = null; e.cmBusy = false;
      const ovPct = cmOvationPct();
      for(const h of heroes){ if(!h.alive) continue; if(!cmCovered(e, h)){ bossHitHero(h, h.maxHp*ovPct, {from:e}); floatText(h.x, h.y - 70, "¡SIN COBERTURA!", "crit"); } else floatText(h.x, h.y - 70, "¡A CUBIERTO!", "heal"); }
      if(typeof CIUDAD_FX!=="undefined") bossSheetFx("cmFinalBoom", e.x, e.y, 360, 800, {anchorY:0.7});
      vfxShock(e.x, e.y, 60, 900, "255,70,110", 900, 2); vfxShake(14); flashScreen(0.3, "255,90,120"); playSfx("cmBlast");
    }
    return true;
  }
  // GRAN NÚMERO en carga: si le sacan suficiente vida se corta y queda EXPUESTO; si no, sale el cometa
  e.gnCd = (e.gnCd === undefined ? 9000 : e.gnCd) - dt;
  if(bossHeroesFarMs(e, C.kiteR, dt) > C.kiteMs && !e.gn){ e._kiteMs = 0; e.gnCd = Math.min(e.gnCd, 0); if(!e._kiteSaid){ e._kiteSaid = 1; showBanner("«¿Se van? Entonces el público paga la entrada.» — ataca la ciudad"); } }
  if(e.gn){
    e.gn.t += dt; cmBossPack(e, "cast", 400);
    if(Math.random() < dt/120) vfxBurst(e.x + cmRand(-40, 40), e.y - 80, 2, "ember", 70, 500, 3, 1, -50, 0);
    if(e.gn.hp0 - e.hp >= e.maxHp*C.gnBreakPct){
      e.gn = null; e.cmBusy = false; e.gnCd = cmRand(C.gnCd[0], C.gnCd[1]);
      bossExpose(e, C.gnExposeMs, 1.6, "¡LE CORTASTE LA FUNCIÓN! El Presentador queda EXPUESTO");
      return true;
    }
    if(e.gn.t >= C.gnWind){
      const n = act===1 ? 1 : 2, used = [];
      for(let k=0;k<n;k++){
        let si = -1, bd = Infinity;
        CM_STRUCTS.forEach((q, i)=>{ if(cmS.st[i].st===CM_ST.DESTROYED || used.includes(i)) return; const p = cmStructAttackPt(i, e.x, e.y), d = Math.hypot(p.x - e.x, p.y - e.y) + (q.critical ? 0 : 900); if(d < bd){ bd = d; si = i; } });
        if(si < 0) break; used.push(si);
        const p = cmStructAttackPt(si, e.x, e.y), c = cmSpawnAt("cm_cometa", e.x + (k ? 40 : -40), e.y + 40);
        c.maxHp = c.hp = Math.max(40, Math.round(e.dmg*2.4)); c.gnSi = si; c.gnTx = Math.round(p.ex); c.gnTy = Math.round(p.ey); c.gnFrom = cmId(e);
        cmAlert("struct", p.ex, p.ey, `¡EL GRAN NÚMERO VA HACIA ${CM_STRUCTS[si].name.toUpperCase()}!`, 4200);
      }
      e.gn = null; e.cmBusy = false; e.gnCd = cmRand(C.gnCd[0], C.gnCd[1])*(act===3 ? 0.8 : 1);
      playSfx("cmBlast"); vfxShake(6);
      if(!tutSeen("cm_gn")) cmTutSay("cm_gn", "¡El GRAN NÚMERO va hacia la ciudad! Rompé el cometa o ponete en el medio: REBOTA contra el Presentador y lo deja EXPUESTO.", 10000, true);
    }
    return true;
  }
  if(e.cast){ e.cast.t += dt; if(e.cast.t >= e.cast.d){ const f = e.cast.fn; e.cast = null; e.cmBusy = false; if(f) f(); } return true; }
  const cast = (set, ms, fn)=>{ cmBossPack(e, set, ms + 200); e.cast = {t:0, d:ms, fn}; e.cmBusy = true; };
  if(e.gnCd <= 0 && !e.ov && CM_STRUCTS.some((q, i)=>cmS.st[i].st!==CM_ST.DESTROYED)){
    e.gn = {t:0, hp0:e.hp}; e.cmBusy = true;
    showBanner("«¡Y AHORA… EL GRAN NÚMERO!» — cortale la función (pegale fuerte) o interceptá el cometa");
    vfxTelegraph({shape:0, x:e.x, y:e.y, r:e.radius*2.4, dur:C.gnWind, rgb:"255,150,60", follow:e});
    playSfx("cmApplause");
    return true;
  }
  if(act===3 && e.ovCd <= 0){
    e.ovCd = cmRand(C.ovationCd[0], C.ovationCd[1]);
    // pilares que sigan en pie cuando caiga el golpe (antes contaba uno que se hundía a mitad del aviso: una trampa)
    if(cmS.pillars.filter(p=>p.t >= 0 && p.d - p.t > C.ovationWind + 300).length < 3) cmPresPillars(e, 4, 250);
    e.ov = {t:0}; e.cmBusy = true;
    showBanner("«¡DE PIE PARA LA OVACIÓN FINAL!» — cubrite detrás de un pilar"); playSfx("cmApplause");
    vfxTelegraph({shape:0, x:e.x, y:e.y, r:900, dur:C.ovationWind, rgb:"255,60,100"});
    return true;
  }
  if(act>=2 && e.echoCd <= 0){
    // ECOS LIMITADOS de los subjefes (uno por vez)
    e.echoCd = cmRand(C.echoCd[0], C.echoCd[1])*sp;
    const k = (e._echo = ((e._echo||0) + 1) % 3);
    if(k===0){ cast("cast", 700, ()=>{ const h = cmRandHero(); cmDrop("mae", h.x, h.y, 100, 1700, e.dmg*1.1*C.telMult, {follow:heroes.indexOf(h) + 1}); cmZone("mae", tgt.x, tgt.y, 140, 4000, {dps:e.dmg*0.3, arm:900}); vfxTelegraph({shape:0, x:tgt.x, y:tgt.y, r:140, dur:900, rgb:"255,60,90"}); showBanner("Eco: el Maestro de Ceremonias"); }); }
    else if(k===1){ cast("cast", 700, ()=>{ for(const h of heroes.filter(q=>q.alive)) cmDrop("scenery", h.x, h.y, 90, 1200, e.dmg*C.telMult); showBanner("Eco: el Tramoyista"); }); }
    else { cast("cast", 700, ()=>{ for(let j=0;j<2;j++){ const p = cmNearestFree(e.x + cmRand(-240, 240), e.y + cmRand(-180, 180), 40); const m = cmSpawnAt("cm_espejismo", p.x, p.y); m.maxHp = m.hp = 1; m.atlasKey = "cm_dama"; } showBanner("Eco: la Dama del Telón"); }); }
    playSfx("cmWhisper");
    return true;
  }
  if(e.markCd <= 0){
    e.markCd = cmRand(C.markCd[0], C.markCd[1])*sp;
    const L = heroes.filter(h=>h.alive).sort(()=>Math.random() - 0.5).slice(0, act===1 ? 1 : 2);
    for(const h of L){ cmDrop("mark", h.x, h.y, 100, 1800, e.dmg*1.2*C.telMult, {follow:heroes.indexOf(h) + 1}); floatText(h.x, h.y - 80, "¡EN EL REFLECTOR!", "warn"); }
    cast("cast", 600, null); playSfx("cmSpot");
    return true;
  }
  if(e.curtainCd <= 0){
    e.curtainCd = cmRand(C.curtainCd[0], C.curtainCd[1])*sp;
    const h = cmRandHero(), dx = h.x - e.x, dy = h.y - e.y, d = Math.hypot(dx, dy)||1;
    cast("cast", 500, null);
    for(let k=0;k<7;k++){ const q = 0.2 + k*0.17; cmDrop("curtain", e.x + dx*q*1.2, e.y + dy*q*1.2, 60, 1000 + k*130, e.dmg*1.1*C.telMult); }
    playSfx("cmCurtain");
    return true;
  }
  if(act===1 && e.addCd <= 0){
    e.addCd = 14000;
    for(let k=0;k<2;k++){ const p = cmNearestFree(e.x + cmRand(-200, 200), e.y + 160, 24); cmSpawnAt("cm_sectario", p.x, p.y); }
    showBanner("«¡Voluntarios del público!»"); playSfx("cmApplause");
    return true;
  }
  if(e.boltCd <= 0 && dist < 620){
    e.boltCd = cmRand(C.boltCd[0], C.boltCd[1])*sp;
    const n = act===1 ? 5 : 7, spread = act===1 ? 0.18 : 0.15, a0 = Math.atan2(tgt.y - e.y, tgt.x - e.x);
    for(let k=0;k<n;k++){ const a = a0 + (k - (n - 1)/2)*spread; cmShot(e, e.x + Math.cos(a)*400, e.y + Math.sin(a)*400, "pre", act===1 ? 250 : 290, 0.7); }
    e.attackAnim = 320; playSfx("cmBolt");
    return true;
  }
  if(dist < 200){ const ux = (e.x - tgt.x)/(dist||1), uy = (e.y - tgt.y)/(dist||1); cmStepTo(e, e.x + ux*60, e.y + uy*60, dt, 0.9); }
  else if(dist > 360) cmStep(e, tgt, dist, dt);
  _cmFace(e, tgt.x, tgt.y);
  return true;
}
// COMETA DEL GRAN NÚMERO: cruza la ciudad despacio hacia la estructura marcada. Un guardián que lo toca o lo rompe
// lo DESVÍA: rebota hacia el Presentador (EXPUESTO al llegar). Si llega, la estructura recibe un golpe enorme.
function cmAICometa(e, dt){
  e.atkCd = 1e6; e.cmBusy = true;
  const dx = e.gnTx - e.x, dy = e.gnTy - e.y, d = Math.hypot(dx, dy);
  if(d < 30){
    const S = cmS.st[e.gnSi];
    if(S && S.st!==CM_ST.DESTROYED) cmHitStruct(e.gnSi, S.max*CM_CFG.presentador.gnStructPct, e);
    if(typeof CIUDAD_FX!=="undefined") bossSheetFx("cmBoom", e.x, e.y, 200, 800, {anchorY:0.7});
    vfxShake(8); playSfx("cmBlast");
    e.gnArrived = true; e.alive = false; e.hp = 0;
    return true;
  }
  const v = CM_CFG.presentador.gnSpd*dt/1000; e.x += dx/d*v; e.y += dy/d*v; e.fx = dx/d; e.fy = dy/d;
  for(const h of heroes){ if(h.alive && Math.hypot(h.x - e.x, h.y - e.y) < e.radius + (h.radius||18)){ bossHitHero(h, (boss ? boss.dmg : 30)*0.35, {from:e}); damageEnemy(e, e.hp + 1, {src:h}); break; } }
  if(Math.random() < dt/60) vfxBurst(e.x, e.y - 20, 2, "ember", 60, 500, 3, 1, -20, 0);
  return true;
}
function cmCometDeflected(e){
  const P = cmPresEntity(); if(!P || e.gnArrived) return;
  cmS.refl = cmS.refl || []; cmS.refl.push({x:Math.round(e.x), y:Math.round(e.y - 20), t:0});
  floatText(e.x, e.y - 50, "¡DESVIADO!", "heal"); playSfx("shatter");
}
function cmReflUpdate(dt){
  const P = cmPresEntity(); if(!cmS.refl || !cmS.refl.length) return;
  for(let i=cmS.refl.length-1;i>=0;i--){
    const R = cmS.refl[i]; R.t += dt;
    if(!P){ cmS.refl.splice(i, 1); continue; }
    const dx = P.x - R.x, dy = (P.y - 50) - R.y, d = Math.hypot(dx, dy), v = 700*dt/1000;
    if(d <= v + 10){ cmS.refl.splice(i, 1); bossExpose(P, CM_CFG.presentador.gnExposeMs, 1.6, "¡SU PROPIO NÚMERO LO GOLPEA! El Presentador queda EXPUESTO"); if(typeof CIUDAD_FX!=="undefined") bossSheetFx("cmBoom", P.x, P.y - 40, 180, 700, {anchorY:0.7}); continue; }
    R.x += dx/d*v; R.y += dy/d*v;
  }
}
// Golpe de la Ovación sin cobertura (fracción de la vida): más suave en Normal (CM_CFG.presentador.ovationPctNormal).
function cmOvationPct(){
  const C = CM_CFG.presentador, k = typeof diffCurrent==="function" ? diffCurrent() : "normal";
  return k==="normal" && C.ovationPctNormal ? C.ovationPctNormal : C.ovationPct;
}
// Lugar a cubierto más cercano a (x, y) durante la Ovación: detrás de un pilar en pie, mirando desde el
// Presentador. {x, y, p (el pilar), ux, uy (hacia dónde cae la sombra)} o null. Lo usan el dibujo del piso
// (sombra verde de cada pilar) y la flecha de pantalla cuando el pilar queda fuera de vista.
// ¿El pilar va a estar en pie (y ya levantado) cuando caiga la Ovación? Sin Ovación en curso: si está en pie.
function cmPillarHolds(e, p){
  const left = e && e.ov ? Math.max(0, CM_CFG.presentador.ovationWind - e.ov.t) : 0;
  return p.t + left >= 0 && p.t + left < p.d - 100;
}
function cmCoverSpot(e, x, y){
  if(!cmS || !e) return null;
  let best = null, bd = Infinity;
  for(const p of cmS.pillars){
    if(!cmPillarHolds(e, p)) continue;
    const dx = p.x - e.x, dy = p.y - e.y, L = Math.hypot(dx, dy)||1, sx = p.x + dx/L*(p.r + 34), sy = p.y + dy/L*(p.r + 34);
    const d = Math.hypot(sx - x, sy - y);
    if(d < bd){ bd = d; best = {x:sx, y:sy, p, ux:dx/L, uy:dy/L, d}; }
  }
  return best;
}
// ¿Hay un pilar entre el Presentador y el héroe?
function cmCovered(e, h){
  for(const p of cmS.pillars){
    if(p.t < 0) continue;
    const ax = h.x - e.x, ay = h.y - e.y, L2 = ax*ax + ay*ay || 1;
    const t = Math.max(0, Math.min(1, ((p.x - e.x)*ax + (p.y - e.y)*ay)/L2));
    if(t < 0.15) continue;
    const qx = e.x + ax*t, qy = e.y + ay*t;
    if(Math.hypot(p.x - qx, p.y - qy) < p.r + 6) return true;
  }
  return false;
}
function cmBossDefeated(b){
  if(!cmS || !b || b.type!=="cm_presentador") return false;
  const P = cmS.pr; P.st = "dying"; P.t = 0; P.x = Math.round(b.x); P.y = Math.round(b.y); P.fx = b.fx < 0 ? -1 : 1;
  runEnding = true; bossActive = false;
  for(const o of enemies){ if(o.alive && o!==b){ o.alive = false; o.hp = 0; vfxOnDeath(o); } }
  enemies = enemies.filter(o=>o.alive);
  cmS.drops.length = 0; cmS.zones.length = 0; cmS.shots.length = 0; cmS.spec = []; cmS.refl = [];
  if(typeof bossHudHide==="function") bossHudHide();
  hitStop(120, true); slowMo(0.3, 1600);
  playSfx("cmCurtain"); showBanner("EL PRESENTADOR CAE DE RODILLAS…");
  return true;
}
function cmEnemyKilled(e){
  if(!cmS) return;
  if(e.type==="cm_cometa"){ cmCometDeflected(e); return; }
  if(e.type==="cm_raptor"){ const c = cmS.civ.find(o=>o.st===CIV.KIDNAPPED && o.by===e.cmId); if(c) cmCivRelease(c); }
  if(e.type==="cm_campanero" && e.cp && e.cp.bell >= 0 && cmS.bells[e.cp.bell].by===e.cmId){ cmS.bells[e.cp.bell].by = 0; cmS.bells[e.cp.bell].t = 0; }
  if(e.type==="cm_maestro" || e.type==="cm_tramoyista" || e.type==="cm_dama"){ vfxShake(10); flashScreen(0.2, "255,150,160"); playSfx("cmApplause"); }
}
