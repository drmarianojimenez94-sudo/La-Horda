"use strict";
/* ============================================================
   js/arenas/abismo/ab-bosses.js
   SUBJEFE (nivel 9): EL CARCELERO DEL VACÍO — gigante encadenado que mantiene unidas las ruinas.
     Golpe de Cadena (línea) · Barrido (círculo: empuja héroes Y enemigos) · GANCHO (línea con aviso:
     engancha y arrastra hacia el borde; se rompe si el enganchado usa una habilidad o si los
     compañeros le sacan un pedazo de vida) · Pisotón (agrieta el piso).
     Al 66 % y al 33 % rompe una cadena: parte de las ruinas se suelta (se derrumba lo que la regla
     de seguridad permite) y otra parte se reconstruye. Al morir, todas las cadenas ceden… y por
     primera vez se ve algo gigantesco debajo.
   JEFE (nivel 10): EL QUE MORA DEBAJO — nunca se muestra entero.
     F1 (100-66 %) tentáculos que golpean plataformas (aviso) + rayo gravitatorio del ojo.
     F2 (66-33 %) modifica la geometría (centro / laterales / cruz / anillo; siempre queda piso y
                 se reconstruye) + zonas de atracción + lluvia de fragmentos.
     F3 (33-0 %) la verdadera forma: la mandíbula bajo la arena (succión con aviso), onda del abismo,
                 más tentáculos. El ojo asoma por el borde del pozo: ahí se le pega.
   PRESENCIA (niveles 1-9): ojo lejano, sombra bajo una plataforma, tentáculo en el vacío, temblor.
   ============================================================ */
function _abBossPack(e, set, ms){ e.packSet = set; e.packTimer = ms; e.packDur = ms; }
const AB_ANCHORS = ["h0", "h4", "h5", "h7"];   // hubs donde están enganchadas las cadenas del Carcelero

/* ---------------- presencia de lo que vive debajo ---------------- */
function abHintUpdate(dt){
  const H = abS.hint;
  if(H.k){ H.a += dt; if(H.a >= (H.d||2600)){ H.k = ""; H.a = 0; } }
  if(runLevel >= LEVEL_COUNT || bossActive || runEnding) return;
  H.t -= dt;
  if(H.t > 0) return;
  const C = AB_CFG.hint, lv = runLevel;
  H.t = abRand(C.everyMs[0], C.everyMs[1])*(lv >= 7 ? 0.7 : 1);
  const kinds = lv <= 2 ? ["rumble", "shadow"] : (lv <= 5 ? ["rumble", "shadow", "eye", "tent"] : ["shadow", "eye", "tent", "tent", "eye"]);
  const k = abPick(kinds);
  H.k = k; H.a = 0; H.d = k==="eye" ? 2600 : (k==="tent" ? 2400 : 3200);
  // dónde: en el vacío cerca del equipo (nunca encima de una plataforma para el tentáculo)
  const h = heroes.find(o=>o.alive) || player;
  for(let t=0;t<12;t++){
    const a = Math.random()*Math.PI*2, d = abRand(260, 520), x = h.x + Math.cos(a)*d, y = h.y + Math.sin(a)*d*0.8;
    if(k!=="tent" || !abWalkable(x, y, -40)){ H.x = Math.round(x); H.y = Math.round(y); break; }
  }
  if(k==="eye"){ H.x = 0; H.y = 0; }
  playSfx(k==="rumble" ? "abRumble" : "abDeep");
  if(k==="rumble") vfxShake(2);
  if(!abS.shown["hint_"+k] && k!=="rumble"){
    abS.shown["hint_"+k] = 1;
    const msg = {shadow:"…algo enorme pasó por debajo de las ruinas…", eye:"…en el fondo del pozo, algo abrió un ojo…", tent:"…un tentáculo se asomó del vacío y volvió a hundirse…"}[k];
    runLater(600, ()=>{ if(state==="playing") showBanner(msg); });
  }
}

/* ---------------- EL CARCELERO DEL VACÍO (nivel 9) ---------------- */
function abCarceleroDirector(dt){
  const M = abS.ca, C = AB_CFG.carcelero;
  if(runLevel !== 9 && M.st!=="dead") return;
  M.t += dt;
  if(M.st==="none"){
    if(levelClearing || runEnding) return;
    if(levelTimer > levelDuration*C.triggerAt) abCarceleroRise();
    return;
  }
  const e = enemies.find(o=>o.alive && o.type==="ab_carcelero");
  if(M.st==="rise"){
    if(!e){ M.st = "dead"; return; }
    if(Math.random() < dt/200) vfxBurst(M.x + (Math.random()-0.5)*160, M.y + (Math.random()-0.5)*80, 3, "arcane", 90, 500, 3, 0, -40, 1);
    if(!M.s1 && M.t > 1200){ M.s1 = 1; vfxShake(6); playSfx("abRumble"); showBanner("…las cadenas que sostienen las ruinas se tensan…"); }
    if(M.t >= 3600){
      M.st = "fight"; M.t = 0; e.dmgTakenMult = 1; e.abRise = 0;
      _abBossPack(e, "break", 1200);
      vfxShock(e.x, e.y, 20, 320, "170,60,110", 850, 2); vfxShake(10); flashScreen(0.22, "200,120,180");
      playSfx("bossRoar"); if(typeof setMusicMode==="function") setMusicMode("boss");
      arenaTitleCard("SUBJEFE", "EL CARCELERO DEL VACÍO", "Sus cadenas mantienen unidas las ruinas.", 4200);
    }
    return;
  }
  if(M.st==="fight"){
    if(!e){ M.st = "dead"; return; }
    // cadenas a los anclajes (dibujo): las que siguen enteras
    abS.chains = AB_ANCHORS.map((id, k)=>{ const p = AB_PLATS.find(q=>q.id===id), c = abPlatCenter(p); return {x0:Math.round(e.x), y0:Math.round(e.y - 60), x1:Math.round(c.x), y1:Math.round(c.y), k, broken:(M.broken||0) & (1<<k) ? 1 : 0}; });
  }
}
function abCarceleroRise(){
  const M = abS.ca;
  // aparece sobre un sector del anillo interior, del lado del equipo
  const h = heroes.find(o=>o.alive) || player;
  const a = Math.atan2(h.y/AB_ASP, h.x), R = (AB_R.ringIn + AB_R.ringOut)/2;
  const x = Math.cos(a)*R, y = Math.sin(a)*R*AB_ASP;
  M.st = "rise"; M.t = 0; M.x = Math.round(x); M.y = Math.round(y); M.broken = 0;
  const e = abSpawnAt("ab_carcelero", x, y);
  e.x = x; e.y = y; e.abRise = 1; e.dmgTakenMult = 0; e.bossPhase = 1;
  e.strikeCd = 2500; e.sweepCd = 6000; e.hookCd = 7500; e.slamCd = 9000;
  activeChampion = e;
  playSfx("abRumble");
}
function abAICarcelero(e, dt, tgt, dist){
  const C = AB_CFG.carcelero, M = abS.ca;
  e.atkCd = 1e6;
  if(M.st!=="fight"){ return true; }
  // fases: rompe una cadena al 66 % y al 33 %
  const frac = e.hp/e.maxHp;
  if(frac <= 0.66 && !(M.broken & 1)) abCarceleroBreakChain(e, 0);
  if(frac <= 0.33 && !(M.broken & 2)) abCarceleroBreakChain(e, 1);
  if(e.abAct){
    const A = e.abAct; A.t += dt;
    if(A.t < A.wind){ if(A.k!=="sweep" && A.k!=="slam") _abFace(e, A.x1, A.y1); return true; }
    abCarceleroRelease(e, A); e.abAct = null; e.abBusy = false;
    return true;
  }
  e.strikeCd -= dt; e.sweepCd -= dt; e.hookCd -= dt; e.slamCd -= dt;
  if(dist > 200) abStep(e, tgt, dist, dt); else if(dist < 110) abStepTo(e, e.x - (tgt.x - e.x), e.y - (tgt.y - e.y), dt, 0.6);
  const aim = (len)=>{ const d = Math.hypot(tgt.x - e.x, tgt.y - e.y)||1; return {x1:e.x + (tgt.x - e.x)/d*len, y1:e.y + (tgt.y - e.y)/d*len, ux:(tgt.x - e.x)/d, uy:(tgt.y - e.y)/d}; };
  const start = (k, wind, extra)=>{ e.abAct = Object.assign({k, t:0, wind}, extra); e.abBusy = true; };
  if(e.hookCd <= 0 && dist < C.hookLen && !tgt.abHang){
    e.hookCd = abRand(C.hookCd[0], C.hookCd[1]);
    const A = aim(C.hookLen);
    start("hook", C.hookWind, A);
    vfxTelegraph({shape:2, r:26, x:e.x, y:e.y, dx:A.ux, dy:A.uy, len:C.hookLen, dur:C.hookWind, rgb:"230,70,120"});
    _abBossPack(e, "drag", C.hookWind + 500); playSfx("abChainWarn"); bossSkillLabel(e, "GANCHO");
    abTutSay("ab_hook", "¡GANCHO del Carcelero! Si te engancha te arrastra al borde: usá una HABILIDAD para soltarte, o que tus compañeros le peguen fuerte.", 8000, true);
    return true;
  }
  if(e.sweepCd <= 0 && dist < C.sweepR){
    e.sweepCd = abRand(C.sweepCd[0], C.sweepCd[1]);
    start("sweep", C.sweepWind, {x1:e.x, y1:e.y});
    vfxTelegraph({shape:0, r:C.sweepR, x:e.x, y:e.y, dur:C.sweepWind, rgb:"230,70,120"});
    _abBossPack(e, "chain", C.sweepWind + 400); playSfx("abChainWarn"); bossSkillLabel(e, "BARRIDO DE CADENAS");
    return true;
  }
  if(e.slamCd <= 0 && dist < 260){
    e.slamCd = abRand(C.slamCd[0], C.slamCd[1]);
    const tx = tgt.x, ty = tgt.y;
    start("slam", C.slamWind, {x1:tx, y1:ty});
    vfxTelegraph({shape:0, r:C.slamR, x:tx, y:ty, dur:C.slamWind, rgb:"230,70,120"});
    _abBossPack(e, "slam", C.slamWind + 400);
    return true;
  }
  if(e.strikeCd <= 0 && dist < C.strikeLen){
    e.strikeCd = abRand(C.strikeCd[0], C.strikeCd[1]);
    const A = aim(C.strikeLen);
    start("strike", C.strikeWind, A);
    vfxTelegraph({shape:2, r:C.strikeW, x:e.x, y:e.y, dx:A.ux, dy:A.uy, len:C.strikeLen, dur:C.strikeWind, rgb:"230,70,120"});
    _abBossPack(e, "chain", C.strikeWind + 400);
    return true;
  }
  return true;
}
function abCarceleroRelease(e, A){
  const C = AB_CFG.carcelero;
  const inLine = (h, w)=>{ const q = _abSegDist(h.x, h.y, e.x, e.y, A.x1, A.y1); return q.d <= w + (h.radius||18)*0.5; };
  if(A.k==="strike"){
    for(const h of heroes){ if(h.alive && !h.abHang && inLine(h, C.strikeW)){ bossHitHero(h, e.dmg*C.strikeMult, {from:e}); abShove(h, h.x - e.x, h.y - e.y, 60, e); } }
    for(const o of enemies){ if(o!==e && o.alive && !o.structure && inLine(o, C.strikeW)){ damageEnemy(o, o.maxHp*0.3, {src:heroes.find(h=>h.alive)||player, fromProc:true}); abShove(o, o.x - e.x, o.y - e.y, 110, null); } }
    if(typeof ABISMO_FX!=="undefined") bossSheetFx("abChainImpact", A.x1, A.y1, 70, 420, {anchorY:0.6});
    playSfx("abChain");
  } else if(A.k==="sweep"){
    abHeroesNear(e.x, e.y, C.sweepR, h=>{ bossHitHero(h, e.dmg*C.sweepMult, {from:e}); abShove(h, h.x - e.x, h.y - e.y, C.sweepKnock, e); });
    for(const o of enemies){ if(o!==e && o.alive && !o.structure && Math.hypot(o.x - e.x, o.y - e.y) <= C.sweepR){ abShove(o, o.x - e.x, o.y - e.y, C.sweepKnock*1.3, null); } }
    vfxShock(e.x, e.y, 20, C.sweepR, "230,70,120", 520, 2);
    if(typeof ABISMO_FX!=="undefined") bossSheetFx("abChainWave", e.x, e.y + 4, C.sweepR*1.1, 600, {anchorY:0.5});
    playSfx("abChain"); vfxShake(5);
  } else if(A.k==="slam"){
    abHeroesNear(A.x1, A.y1, C.slamR, h=>bossHitHero(h, e.dmg, {from:e, slow:0.3, slowDur:900}));
    abDamageArea(A.x1, A.y1, C.slamR, C.slamStruct);
    if(typeof ABISMO_FX!=="undefined") bossSheetFx("abChainTerrain", A.x1, A.y1, 110, 600, {anchorY:0.5});
    vfxShock(A.x1, A.y1, 10, C.slamR, "230,70,120", 420, 2); playSfx("abStomp"); vfxShake(5);
  } else if(A.k==="hook"){
    let best = null, bd = Infinity;
    for(const h of heroes){ if(!h.alive || h.abHang || !inLine(h, 30)) continue; const d = Math.hypot(h.x - e.x, h.y - e.y); if(d < bd){ bd = d; best = h; } }
    abS.chains.push({x0:Math.round(e.x), y0:Math.round(e.y - 60), x1:Math.round(A.x1), y1:Math.round(A.y1), t:0, d:500, hook:1});
    if(best){
      bossHitHero(best, e.dmg*0.6, {from:e});
      best.abHook = {t:0, dur:C.hookMs, by:e, hp0:e.hp, dir:abEdgeDir(best)};
      floatText(best.x, best.y - 60, "¡ENGANCHADO!", "crit"); playSfx("abChain");
    }
  }
}
// Dirección hacia el borde más cercano (donde se termina el piso) desde la posición de h.
function abEdgeDir(h){
  let best = null, bd = Infinity;
  for(let k=0;k<16;k++){
    const a = k/16*Math.PI*2, ux = Math.cos(a), uy = Math.sin(a);
    for(let s=20; s<=420; s+=20){ if(!abWalkable(h.x + ux*s, h.y + uy*s, 0)){ if(s < bd){ bd = s; best = {x:ux, y:uy}; } break; } }
  }
  return best || {x:0, y:1};
}
function abHookUpdate(h, dt){
  const K = h.abHook; if(!K) return;
  const C = AB_CFG.carcelero;
  K.t += dt;
  const e = K.by;
  const broken = !e || !e.alive || K.t >= K.dur || (K.hp0 - e.hp) > e.maxHp*C.hookBreakPct || h.abHookBreak || !h.alive || h.abHang;
  if(broken){
    if(h.alive && !h.abHang && K.t < K.dur) floatText(h.x, h.y - 60, "¡LIBRE!", "heal");
    h.abHook = null; h.abHookBreak = false; return;
  }
  h.x += K.dir.x*C.hookDrag*dt/1000; h.y += K.dir.y*C.hookDrag*dt/1000;
  h._abKbT = runElapsedMs + 200; h._kbBy = e;             // arrastrado: si llega al borde, se cae (queda colgado)
  if(Math.random() < dt/80) vfxBurst(h.x, h.y - 10, 2, "arcane", 40, 300, 2.5, h===player?1:0, -10, 1);
  abS.chains = abS.chains.filter(c=>!c.hookLive);
  abS.chains.push({x0:Math.round(e.x), y0:Math.round(e.y - 60), x1:Math.round(h.x), y1:Math.round(h.y - 20), t:0, d:120, hook:1, hookLive:1});
}
function abCarceleroBreakChain(e, n){
  const M = abS.ca; M.broken |= (1<<n);
  playSfx("abChainBreak"); vfxShake(10); flashScreen(0.18, "200,120,180");
  _abBossPack(e, "break", 1400);
  showBanner(n===0 ? "¡El Carcelero rompe una cadena: las ruinas se sueltan!" : "¡Otra cadena cede! Parte del Abismo se reacomoda");
  // lo que sostenía esa cadena se suelta (con la regla de seguridad) y otra parte se reconstruye
  const id = AB_ANCHORS[n], k = +id.slice(1);
  for(const pid of ["o"+k, "o"+((k+7)%8), "s"+((k+4)%8)]){ const i = AB_PLATS.findIndex(p=>p.id===pid); if(i >= 0) abDamagePlat(i, 999); }
  for(let i=0;i<AB_PLATS.length;i++){ if(abS.p[i].st===AB_ST.GONE && Math.random() < 0.5) abRebuildOne(i); }
}
function abCarceleroKilled(e){
  const M = abS.ca; M.st = "dead"; M.t = 0;
  activeChampion = null;
  abS.chains = [];
  playSfx("abChainBreak"); vfxShake(14); flashScreen(0.3, "220,160,255");
  showBanner("Las cadenas ceden… las ruinas tiemblan…");
  runLater(2200, ()=>{ if(!abS || state!=="playing") return; abS.hint.k = "eye"; abS.hint.a = 0; abS.hint.d = 5200; abS.hint.x = 0; abS.hint.y = 0; playSfx("abDeep"); vfxShake(8);
    showBanner("…y debajo, algo ENORME abre un ojo."); });
  runLater(4200, ()=>{ if(!abS || state!=="playing") return; abS.hint.k = "tent"; abS.hint.a = 0; abS.hint.d = 3000; const h = heroes.find(o=>o.alive)||player; abS.hint.x = Math.round(h.x + 380); abS.hint.y = Math.round(h.y - 120); });
  if(typeof setMusicMode==="function") setMusicMode("normal");
}

/* ---------------- EL QUE MORA DEBAJO (nivel 10) ---------------- */
const AB_PATTERNS = {
  centro:["r0","r2","r4","r6","o1","o5"],            // medio anillo se hunde: siempre queda por dónde llegarle al ojo
  laterales:["s0","s4","o0","o3","o4","o7","h0","h4"],
  cruz:["s1","s3","s5","s7","r1","r3","r5","r7"],
  anillo:["o0","o2","o4","o6","s1","s5"]
};
function abMoradorEntity(){ return enemies.find(o=>o.alive && o.type==="ab_morador") || null; }
function abMoradorLevelStart(){
  levelDuration = 9e9;
  const M = abS.mo; M.st = "stir"; M.t = 0;
  if(typeof setMusicMode==="function") setMusicMode("prelude");
  runLater(900, ()=>{ if(state==="playing") showBanner("Las ruinas dejaron de temblar. Todo está demasiado quieto…"); });
}
function abMoradorController(dt){
  const M = abS.mo, C = AB_CFG.morador;
  if(runLevel !== LEVEL_COUNT) return;
  M.t += dt;
  if(M.st==="stir"){
    if(Math.random() < dt/900){ vfxShake(2 + M.t/3000); playSfx("abDeep"); }
    if(!M.s1 && M.t > 3500){ M.s1 = 1; M.eye = 1; showBanner("En el fondo del pozo… el ojo se abre"); playSfx("abDeep"); }
    if(!M.s2 && M.t > 7000){ M.s2 = 1; showBanner("TODO ESTE TIEMPO HABÍA ALGO DEBAJO DE NOSOTROS"); vfxShake(10); }
    if(M.t >= 9500){
      M.st = "fight"; M.t = 0; M.ph = 1;
      for(const o of enemies){ if(o.alive){ o.alive = false; o.hp = 0; vfxOnDeath(o); } }
      enemies = enemies.filter(o=>o.alive);
      const e = abSpawnAt("ab_morador", 0, 0); e.x = 0; e.y = 0;
      scaleBossStats(e, "ab_morador");
      e.bossPhase = 1; e.fx = 0; e.fy = 1; e.speed = 0; e.abNoClamp = true; e.flying = true;
      e.slamCd = 2500; e.rayCd = 6000; e.pullCd = 4000; e.shardCd = 5000; e.patCd = 8000; e.jawCd = 3000; e.waveCd = 6000; e.tentCd = 1200;
      bossActive = true; boss = e;
      bossEntrance(e);
      vfxShake(14); flashScreen(0.35, "200,120,255"); playSfx("bossRoar");
      arenaTitleCard("JEFE", "EL QUE MORA DEBAJO", "Las ruinas donde peleaste eran su lomo.", 4800);
    }
    return;
  }
  if(M.st==="fight"){
    const e = abMoradorEntity(); if(!e) return;
    // el ojo asoma por el borde del pozo del lado del equipo (ahí se le pega cuerpo a cuerpo)
    let sx = 0, sy = 0, n = 0; for(const h of heroes){ if(h.alive){ sx += h.x; sy += h.y/AB_ASP; n++; } }
    const a = n ? Math.atan2(sy/n, sx/n) : Math.PI/2;
    e._ang = e._ang===undefined ? a : e._ang + Math.atan2(Math.sin(a - e._ang), Math.cos(a - e._ang))*Math.min(1, dt/1800);
    const r = AB_R.pit - 40;
    e.x = Math.cos(e._ang)*r; e.y = Math.sin(e._ang)*r*AB_ASP; e.radius = 110;
    // fases
    const f = e.hp/e.maxHp;
    if(M.ph===1 && f <= C.p2At){ M.ph = 2; e.bossPhase = 2; abMoradorPhase(e, 2); }
    if(M.ph===2 && f <= C.p3At){ M.ph = 3; e.bossPhase = 3; abMoradorPhase(e, 3); }
    // patrón de geometría en curso: reconstrucción programada
    // el Abismo devuelve el piso de a poco (nunca se erosiona la arena entera durante la pelea)
    M.rb = (M.rb||0) + dt;
    if(M.rb >= C.rebuildEvery){
      M.rb = 0; let n = 0; const pat = AB_PATTERNS[M.pat] || [];
      for(let i=0;i<AB_PLATS.length && n < 2;i++){ if(abS.p[i].st===AB_ST.GONE && !pat.includes(AB_PLATS[i].id)){ abRebuildOne(i); n++; } }
      if(n) playSfx("abRebuild");
    }
    if(M.patT > 0){ M.patT -= dt; if(M.patT <= 0){ for(const id of (AB_PATTERNS[M.pat]||[])){ const i = AB_PLATS.findIndex(p=>p.id===id); if(i >= 0) abRebuildOne(i); } M.pat = ""; playSfx("abRebuild"); showBanner("Los fragmentos suben desde el vacío: el piso vuelve"); } }
    return;
  }
  if(M.st==="dying"){
    const T = M.t;
    if(!M.d1 && T > 1200){ M.d1 = 1; playSfx("abDeep"); showBanner("El ojo se cierra…"); }
    if(!M.d2 && T > 3200){ M.d2 = 1; abRebuildAll(100); vfxShake(10); playSfx("abRebuild"); showBanner("…los tentáculos se hunden y las ruinas vuelven a su lugar…"); }
    if(!M.d3 && T > 6000){ M.d3 = 1; flashScreen(0.4, "230,200,255"); vfxShock(0, 0, 40, 900, "200,140,255", 1400, 2); showBanner("Silencio. El Abismo duerme."); }
    if(T >= C.deathMs){ M.st = "dead"; if(typeof finishBossVictory==="function") finishBossVictory(); }
  }
}
function abMoradorPhase(e, ph){
  vfxShake(12); flashScreen(0.3, "200,120,255"); playSfx("bossRoar");
  if(typeof bossPhaseFeedback==="function") bossPhaseFeedback();
  if(ph===2){ showBanner("FASE 2 — EL ABISMO DESPIERTA: el piso cambia de forma"); abS.mo.jaw = 0; }
  else { showBanner("FASE 3 — LA VERDADERA FORMA: la mandíbula está debajo de la arena"); abS.mo.jaw = 1; abRebuildAll(40); }
}
function abAIMorador(e, dt, tgt, dist){
  const C = AB_CFG.morador, M = abS.mo, ph = M.ph - 1;
  e.atkCd = 1e6;
  if(M.st!=="fight") return true;
  e.slamCd -= dt; e.rayCd -= dt; e.pullCd -= dt; e.shardCd -= dt; e.patCd -= dt; e.jawCd -= dt; e.waveCd -= dt; e.tentCd -= dt;
  // tentáculos (estructuras que se pueden romper: cada uno roto le saca vida al jefe y abre el ojo)
  const tents = enemies.filter(o=>o.alive && o.type==="ab_tentaculo");
  if(e.tentCd <= 0 && tents.length < C.tentMax[ph]){ e.tentCd = C.tentCd[ph]; abSpawnTentacle(e); }
  if(e.rayCd <= 0 && !tgt.abHang){
    e.rayCd = C.rayCd[ph];
    const d = Math.hypot(tgt.x - e.x, tgt.y - e.y)||1, ux = (tgt.x - e.x)/d, uy = (tgt.y - e.y)/d;
    vfxTelegraph({shape:2, r:C.rayW, x:e.x, y:e.y, dx:ux, dy:uy, len:C.rayLen, dur:C.rayWind, rgb:"200,90,255"});
    bossSkillLabel(e, "RAYO GRAVITATORIO"); playSfx("abRayWarn");
    runLater(C.rayWind, ()=>{
      if(!e.alive) return;
      for(const h of heroes){ if(!h.alive || h.abHang) continue; const q = _abSegDist(h.x, h.y, e.x, e.y, e.x + ux*C.rayLen, e.y + uy*C.rayLen); if(q.d <= C.rayW + (h.radius||18)*0.5){ bossHitHero(h, e.dmg*C.rayMult, {from:e, slow:0.45, slowDur:1600}); } }
      if(typeof ABISMO_FX!=="undefined") for(let s=0;s<4;s++) bossSheetFx("abMorRay", e.x + ux*C.rayLen*(0.2 + s*0.22), e.y + uy*C.rayLen*(0.2 + s*0.22), 70, 500, {rot:Math.atan2(uy, ux), anchorY:0.5});
      playSfx("abRay");
    });
    return true;
  }
  if(ph >= 1 && e.patCd <= 0 && !M.pat){
    e.patCd = C.patCd[ph];
    const keys = Object.keys(AB_PATTERNS), key = abPick(keys);
    M.pat = key; M.patT = C.rebuildAfter + C.patWarn;
    bossSkillLabel(e, {centro:"EL CENTRO SE HUNDE", laterales:"LOS COSTADOS SE DESPRENDEN", cruz:"SE PARTE EN CRUZ", anillo:"EL ANILLO SE ROMPE"}[key]);
    playSfx("abRumble"); vfxShake(6);
    for(const id of AB_PATTERNS[key]){ const i = AB_PLATS.findIndex(p=>p.id===id); if(i >= 0) abDamagePlat(i, 999, {warn:C.patWarn}); }   // la regla de seguridad deja siempre piso conectado
    return true;
  }
  if(ph >= 1 && e.pullCd <= 0){
    e.pullCd = C.pullCd[ph];
    const n = abNearestGround(tgt.x + (Math.random()-0.5)*120, tgt.y + (Math.random()-0.5)*90, 20);
    abS.zones.push({x:Math.round(n.x), y:Math.round(n.y), r:C.pullR, t:0, d:C.pullMs, k:"pull"});
    vfxTelegraph({shape:0, r:C.pullR, x:n.x, y:n.y, dur:700, rgb:"200,90,255"}); playSfx("abGrav");
    return true;
  }
  if(ph >= 1 && e.shardCd <= 0){
    e.shardCd = C.shardCd[ph];
    for(let i=0;i<C.shardN[ph];i++){
      const h = abPick(heroes.filter(o=>o.alive && !o.abHang)) || tgt;
      const x = h.x + (Math.random()-0.5)*260, y = h.y + (Math.random()-0.5)*190;
      bossStrike(x, y, C.shardR, C.shardDelay + i*120, e.dmg*C.shardMult, "rock", null);
      runLater(C.shardDelay + i*120, ()=>{ if(typeof ABISMO_FX!=="undefined") bossSheetFx("abMorShards", x, y, 80, 520, {anchorY:0.8}); abDamageArea(x, y, C.shardR*0.8, 4); });
    }
    bossSkillLabel(e, "LLUVIA DE FRAGMENTOS");
    return true;
  }
  if(ph >= 2 && e.jawCd <= 0){
    e.jawCd = C.jawCd[ph];
    M.jawOpen = runElapsedMs + C.jawWind + 2200;
    vfxTelegraph({shape:0, r:C.jawR, x:0, y:0, dur:C.jawWind, rgb:"255,80,160"});
    bossSkillLabel(e, "¡LA MANDÍBULA! ALEJATE DEL POZO"); playSfx("abJaw");
    runLater(C.jawWind, ()=>{ if(e.alive) abS.zones.push({x:0, y:0, r:C.jawR, t:300, d:2300, k:"jaw"}); });
    return true;
  }
  if(ph >= 2 && e.waveCd <= 0){
    e.waveCd = C.waveCd[ph];
    abS.wave = {t:0, d:1600, hit:[]};
    vfxShock(0, 0, 60, 900, "200,90,255", 1600, 2); playSfx("abWave");
    bossSkillLabel(e, "ONDA DEL ABISMO");
    return true;
  }
  return true;
}
function abSpawnTentacle(boss){
  // en el borde de una plataforma en pie, cerca del equipo
  const h = abPick(heroes.filter(o=>o.alive)) || player;
  let best = null;
  for(let t=0;t<16 && !best;t++){
    const a = Math.random()*Math.PI*2, d = abRand(140, 320), x = h.x + Math.cos(a)*d, y = h.y + Math.sin(a)*d*0.8;
    if(abWalkable(x, y, 10) && !abWalkable(x, y, 60)) best = {x, y};
  }
  if(!best){ const n = abNearestGround(h.x + 200, h.y, 12); best = {x:n.x, y:n.y}; }
  const t = abSpawnAt("ab_tentaculo", best.x, best.y);
  t.x = best.x; t.y = best.y; t.hp = t.maxHp = Math.round(boss.maxHp*AB_CFG.morador.tentHp);
  t.abNoClamp = true; t._ax = best.x; t._ay = best.y; t.slamCd = 1800 + Math.random()*1200; t.abRise = 700;
  playSfx("abTentacle");
  if(typeof ABISMO_FX!=="undefined") bossSheetFx("abMorRise", best.x, best.y, 110, 700, {anchorY:0.85});
}
function abAITentaculo(e, dt, tgt, dist){
  const C = AB_CFG.morador, boss = abMoradorEntity();
  e.atkCd = 1e6;
  if(!boss){ e.alive = false; e.hp = 0; return true; }
  if(e.abRise > 0){ e.abRise -= dt; return true; }
  e.slamCd -= dt;
  if(e.abWind){
    e.abWind -= dt;
    if(e.abWind <= 0){
      e.abWind = 0; const x = e._tx, y = e._ty;
      abHeroesNear(x, y, C.slamR, h=>bossHitHero(h, boss.dmg*C.slamMult, {from:e, slow:0.35, slowDur:900}));   // aplasta y agrieta; no empuja (el peligro es el piso)
      abDamageArea(x, y, C.slamR, C.slamStruct);
      if(typeof ABISMO_FX!=="undefined") bossSheetFx("abMorSlam", x, y, 120, 620, {anchorY:0.75});
      vfxShock(x, y, 10, C.slamR, "200,90,255", 420, 2); playSfx("abStomp"); vfxShake(4);
    }
    return true;
  }
  if(e.slamCd <= 0 && dist < 420){
    e.slamCd = C.slamCd[abS.mo.ph - 1];
    e._tx = tgt.x; e._ty = tgt.y; e.abWind = C.slamWind;
    vfxTelegraph({shape:0, r:C.slamR, x:tgt.x, y:tgt.y, dur:C.slamWind, rgb:"200,90,255"});
    _abFace(e, tgt.x, tgt.y);
  }
  return true;
}
function abWaveUpdate(dt){
  const W = abS.wave; if(!W) return;
  W.t += dt;
  const r = (W.t/W.d)*900;
  for(const h of heroes){
    if(!h.alive || h.abHang || W.hit.includes(heroes.indexOf(h))) continue;
    const d = Math.hypot(h.x, h.y/AB_ASP);
    if(Math.abs(d - r) < 30){ W.hit.push(heroes.indexOf(h)); const b = abMoradorEntity(); bossHitHero(h, (b ? b.dmg : 30)*AB_CFG.morador.waveMult, {from:{x:0, y:0}}); }
  }
  if(W.t >= W.d) abS.wave = null;
}
// Jaw zone: además de tirar, el que es arrastrado fuera del anillo interior cae (queda colgado)
function abJawMarkPushed(){
  for(const z of abS.zones){
    if(z.k!=="jaw" || z.t < 250) continue;
    for(const h of heroes){ if(h.alive && !h.abHang && Math.hypot(h.x, h.y/AB_ASP) <= AB_R.ringOut + 20){ h._abKbT = runElapsedMs + 150; } } // solo el anillo del pozo: ahí la succión tira abajo
  }
}
function abEnemyKilled(e){
  if(!abS) return;
  if(e.type==="ab_carcelero") abCarceleroKilled(e);
  else if(e.type==="ab_tentaculo"){
    const b = abMoradorEntity();
    if(b){ b.hitFlash = 120; b._eyeOpenUntil = runElapsedMs + AB_RULE.exposeMs; abRuleTentacleCut(b); }   // ab-boss-rule.js
    if(typeof ABISMO_FX!=="undefined") bossSheetFx("abMorDisint", e.x, e.y, 90, 600, {anchorY:0.8});
  } else if(e.type==="ab_devorador"){
    if(inView(e.x, e.y, 80) && typeof ABISMO_FX!=="undefined") bossSheetFx("abDevFrag", e.x, e.y, 70, 500, {anchorY:0.7});
  }
}
function abBossDefeated(b){
  if(!abS || !b || b.type!=="ab_morador") return false;
  const M = abS.mo; M.st = "dying"; M.t = 0;
  runEnding = true; bossActive = false;
  for(const o of enemies){ if(o.alive && o!==b){ o.alive = false; o.hp = 0; vfxOnDeath(o); } }
  enemies = enemies.filter(o=>o.alive);
  abS.zones.length = 0; abS.lines.length = 0; abS.orbs.length = 0; abS.wave = null; bossStrikes.length = 0;
  for(const h of heroes){ if(h.abHang) abRescue(h, null); h.abHook = null; }
  if(typeof bossHudHide==="function") bossHudHide();
  hitStop(110, true); slowMo(0.3, 1400);
  playSfx("abDeep"); showBanner("El Que Mora Debajo se hunde en el vacío…");
  return true;
}
