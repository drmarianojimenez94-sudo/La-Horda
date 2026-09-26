"use strict";
/* ============================================================
   js/arenas/micelial/mic-subboss.js
   SUBJEFE (nivel 6): MICELIO PRIMIGENIO — no llega de ningún lado: SE CONSTRUYE delante del
   equipo. Tiembla el piso, brotan raíces, arrastran cadáveres colonizados hasta un punto y se
   fusionan en una masa que se levanta.
     Zarpazo (cono) · Latigazo de Raíz (1-3 líneas telegrafiadas) · Lluvia de Esporas (círculos)
     Germinación (siembra un núcleo) · ABSORCIÓN: raíces hacia los cadáveres que lo curan mientras
     vivan (se pueden cortar; con enfriamiento, tope de curación y máximo de usos).
   Al morir colapsa y el suelo lo absorbe: la arena cambia (manchón de micelio, hongos que
   florecen, el capullo late más fuerte: la Madre se alimentó).
   ============================================================ */
function _micBossPack(e, set, ms){ e.packSet = set; e.packTimer = ms; e.packDur = ms; }

function micCorpseAlive(i){ const c = MIC_MAP.corpses[i]; return c && c.from <= micS.stage && !(micS.corpses & (1<<i)); }

function micMicelioDirector(dt){
  const M = micS.mi, C = MIC_CFG.micelio;
  if(runLevel !== 6 && M.st!=="sink") return;
  M.t += dt;
  if(M.st==="none"){
    if(levelClearing || runEnding) return;
    if(levelTimer > levelDuration*C.triggerAt || levelTimer >= levelDuration) micMicelioStartBuild();
    return;
  }
  if(M.st==="build"){
    const e = enemies.find(o=>o.alive && o.type==="micelio");
    if(!e){ M.st = "dead"; return; }
    // temblor y raíces que arrastran los cadáveres hacia el punto de fusión
    if(Math.random() < dt/260) vfxBurst(M.x + (Math.random()-0.5)*160, M.y + (Math.random()-0.5)*100, 3, "micRoot", 90, 500, 3, 0, -30, 1);
    if(!M.shook && M.t > 1500){ M.shook = 1; vfxShake(7); playSfx("micRumble"); showBanner("…los cadáveres se arrastran hacia el mismo punto…"); }
    if(!M.fuse && M.t > C.buildMs*0.68){ M.fuse = 1; for(const i of (M.drag||[])) micS.corpses |= (1<<i); playSfx("micGrow"); vfxBurst(M.x, M.y-40, 26, "micSpore", 160, 800, 4, 2, -60, 0); }
    if(M.t >= C.buildMs){
      M.st = "fight"; M.t = 0;
      e.micBuild = 0; e.dmgTakenMult = 1;
      _micBossPack(e, "roar", 1300);
      vfxShock(e.x, e.y, 20, 320, "220,90,255", 850, 2);
      vfxShake(12); flashScreen(0.25, "220,140,255");
      playSfx("bossRoar");
      if(typeof setMusicMode==="function") setMusicMode("boss");
      arenaTitleCard("SUBJEFE", "MICELIO PRIMIGENIO", "Los caídos del Reino, cosidos por raíces.", 4200);
    }
    return;
  }
  if(M.st==="sink"){
    if(Math.random() < dt/120) vfxBurst(M.x + (Math.random()-0.5)*120, M.y - 20, 3, "micSpore", 80, 600, 3, 0, -50, 1);
    if(M.t >= C.sinkMs){
      M.st = "dead"; M.t = 0;
      micEcoBloomAt(M.x, M.y, 340, FN.MATURE);
      vfxBurst(M.x, M.y-10, 30, "micSpore", 200, 900, 4, 2, -70, 0);
      playSfx("micPulse");
      showBanner("El suelo se lo tragó… y el capullo del centro late más fuerte");
    }
  }
}
function micMicelioStartBuild(){
  const M = micS.mi, C = MIC_CFG.micelio;
  // punto de fusión: a media distancia del equipo, lejos del capullo, entre cadáveres
  const h = micRandPick(micAliveHeroes()) || player;
  let p = null;
  for(let t=0;t<20 && !p;t++){ const q = micPointNear(h.x, h.y, 360, 520, 90); if(Math.hypot(q.x - MIC_MAP.pod.x, q.y - MIC_MAP.pod.y) > 330) p = q; }
  if(!p) p = micPointNear(h.x, h.y, 300, 460, 80);
  M.st = "build"; M.t = 0; M.x = Math.round(p.x); M.y = Math.round(p.y); M.shook = 0; M.fuse = 0;
  // los 4 cadáveres más cercanos son los que se arrastran
  const list = MIC_MAP.corpses.map((c, i)=>({i, d:Math.hypot(c.x-p.x, c.y-p.y)})).filter(o=>micCorpseAlive(o.i)).sort((a,b)=>a.d-b.d);
  M.drag = list.slice(0, 4).map(o=>o.i);
  const e = micSpawnAt("micelio", p.x, p.y);
  e.micBuild = 1; e.dmgTakenMult = 0; e.bossPhase = 1; e.fx = 0; e.fy = 1;
  e.mcd = 1600; e.lashCd = 3500; e.rainCd = 7000; e.germCd = 10000; e.absorbCd = 0; e.absorbN = 0;
  activeChampion = e; // mientras esté, no aparecen oleadas
  showBanner("¡La tierra tiembla! Algo se está armando…");
  playSfx("micRumble"); vfxShake(6);
  if(typeof setMusicMode==="function") setMusicMode("prelude");
}
// El nivel 6 no termina mientras el Micelio no haya caído (red de seguridad: si el tiempo se
// acabó antes de que empiece a armarse, arranca en ese momento).
function micHoldLevel(){
  if(!micS) return false;
  if(runLevel===6){ const st = micS.mi.st; return st!=="sink" && st!=="dead"; }
  return false;
}

function micAIMicelio(e, dt, tgt, dist){
  const C = MIC_CFG.micelio;
  e.atkCd = 1e6;
  if(e.micBuild){ _micBossPack(e, "idle", 400); return true; }
  e.mcd -= dt; e.lashCd -= dt; e.rainCd -= dt; e.germCd -= dt; e.absorbCd -= dt;
  const A = e.micAbs;
  // ABSORCIÓN en curso: quieto, se cura por cada raíz viva (con tope)
  if(A){
    A.t += dt;
    _micBossPack(e, "absorb", 400);
    const links = enemies.filter(o=>o.alive && o.type==="raiz_absorcion" && o.lk===e);
    if(links.length && A.healed < e.maxHp*C.absorbCap){
      const amt = Math.min(e.maxHp*C.absorbCap - A.healed, e.maxHp*C.absorbPct*links.length*dt/1000);
      e.hp = Math.min(e.maxHp, e.hp + amt); A.healed += amt;
      if(Math.random() < dt/500 && inView(e.x, e.y, 80)) floatText(e.x, e.y - 150, "+" + Math.round(amt*500/dt), "heal");
    }
    if(!links.length || A.t >= C.absorbMs){
      e.micAbs = null; e.absorbCd = C.absorbCdMs; e.mcd = 900;
      for(const l of links){ l.alive = false; l.hp = 0; vfxOnDeath(l); }
      if(!links.length) showBanner("¡Cortaste las raíces! El Micelio queda expuesto");
    }
    // sigue latigueando (más lento) mientras absorbe
    if(e.lashCd <= 0 && !e.bossWind){ micMicelioLash(e, 1); e.lashCd = 3200; }
    return true;
  }
  if(e.mcd > 6000 && !e.bossWind) e.mcd = 1200; // red de seguridad
  if(!e.bossWind && e.mcd <= 0){
    const frac = e.hp/e.maxHp;
    if(frac < C.absorbAt && e.absorbCd <= 0 && e.absorbN < C.absorbMax){ micMicelioAbsorb(e); return true; }
    if(e.rainCd <= 0){ micMicelioRain(e); return true; }
    if(e.lashCd <= 0){ micMicelioLash(e, frac < 0.45 ? 3 : (frac < 0.8 ? 2 : 1)); e.lashCd = micRand(C.lashCdMs[0], C.lashCdMs[1]); e.mcd = C.lashWarn + 600; return true; }
    if(e.germCd <= 0 && micNucleos().length < 3){
      e.germCd = micRand(C.germCdMs[0], C.germCdMs[1]); e.mcd = 1400;
      _micBossPack(e, "germ", 1200);
      bossHudHint("Germinación", "destruí el núcleo antes de que madure");
      const p = micPointNear(tgt.x, tgt.y, 180, 320, 60);
      runLater(700, ()=>{ if(state==="playing" && e.alive && micS) micSpawnNucleo(p.x, p.y, 2); });
      return true;
    }
    if(dist < C.clawR*0.8){
      e.mcd = C.clawCd;
      const fdx = (tgt.x-e.x)/dist, fdy = (tgt.y-e.y)/dist;
      _micBossPack(e, "atk", C.clawWind + 500);
      bossWindup(e, C.clawWind, "bossHeavyAttack", {shape:1, r:C.clawR, arc:0.8, dx:fdx, dy:fdy, rgb:"230,90,255"}, ()=>{
        e.attackAnim = 400;
        micHeroesInCone(e.x, e.y, fdx, fdy, C.clawR, 0.8, h=>bossHitHero(h, e.dmg, {from:e, knock:40}));
        vfxSprite("mic_slash_red_triple", 0, e.x + fdx*90, e.y + fdy*90 - 20, 80, 380, null, 0.2, fdx<0, 0.7);
        playSfx("micSlam");
      });
      return true;
    }
  }
  if(!e.bossWind && dist > 130) micStep(e, tgt, dist, dt);
  return true;
}
function micMicelioLash(e, n){
  const C = MIC_CFG.micelio;
  _micBossPack(e, "lash", C.lashWarn + 500);
  bossHudHint("Latigazo de Raíz", "salí de las líneas del piso");
  const alive = micAliveHeroes(); if(!alive.length) return;
  const lines = [];
  for(let i=0;i<n;i++){
    const h = alive[i % alive.length];
    let a = Math.atan2(h.y-e.y, h.x-e.x) + (i >= alive.length ? (i%2 ? 0.5 : -0.5) : 0);
    lines.push({dx:Math.cos(a), dy:Math.sin(a)});
  }
  for(const L of lines) vfxTelegraph({shape:2, r:C.lashW/2, x:e.x, y:e.y, dx:L.dx, dy:L.dy, len:C.lashLen, dur:C.lashWarn, rgb:"230,80,255"});
  playSfx("micRootWarn");
  const ox = e.x, oy = e.y;
  bossWindup(e, C.lashWarn, "bossCast", null, ()=>{
    for(const L of lines){
      for(const h of heroes){
        if(!h.alive) continue;
        const hx = h.x-ox, hy = h.y-oy, t = hx*L.dx + hy*L.dy, perp = Math.abs(-hx*L.dy + hy*L.dx);
        if(t > -20 && t < C.lashLen && perp < C.lashW/2 + (h.radius||18)*0.6) bossHitHero(h, e.dmg*C.lashMult, {from:e, slow:0.3, slowDur:900});
      }
      for(let d=80; d<C.lashLen; d+=95) vfxSprite(["mic_root_spike_a","mic_root_spike_b","mic_root_spike_c"][(d/95|0)%3], 0, ox + L.dx*d, oy + L.dy*d + 8, 56, 700, null, 0.3, L.dx<0, 0.9);
    }
    playSfx("micRoot"); vfxShake(5);
  });
}
function micMicelioRain(e){
  const C = MIC_CFG.micelio;
  e.rainCd = micRand(C.rainCdMs[0], C.rainCdMs[1]); e.mcd = 1500;
  _micBossPack(e, "rain", 1300);
  bossHudHint("Lluvia de Esporas", "salí de los círculos antes de que caigan");
  playSfx("micSporeBig");
  const alive = micAliveHeroes();
  for(let i=0;i<C.rainN;i++){
    const h = alive[i % Math.max(1, alive.length)] || player;
    const a = Math.random()*Math.PI*2, off = i < alive.length ? 0 : 40 + Math.random()*140;
    const x = h.x + Math.cos(a)*off, y = h.y + Math.sin(a)*off, delay = C.rainDelay + i*90;
    bossStrike(x, y, C.rainR, delay, e.dmg*C.rainMult, "root", {slow:0.25, slowDur:900});
    vfxSprite(["mic_spore_rain_a","mic_spore_rain_b","mic_spore_rain_c"][i%3], 0, x, y - 240, 40, delay, null, 0, false, 0.5, 0, 0, 240/(delay/1000));
    runLater(delay, ()=>{ vfxSprite(["mic_spore_hit_a","mic_spore_hit_b","mic_spore_hit_c","mic_spore_hit_d"][i%4], 0, x, y + 8, 50, 500, null, 0.3, false, 0.8); });
  }
}
function micMicelioAbsorb(e){
  const C = MIC_CFG.micelio;
  e.absorbN++; e.mcd = 1200;
  // raíces hacia cadáveres (los que queden; si no, al piso alrededor)
  const pts = MIC_MAP.corpses.map((c, i)=>({i, x:c.x, y:c.y, d:Math.hypot(c.x-e.x, c.y-e.y)})).filter(o=>micCorpseAlive(o.i) && o.d < 760).sort((a,b)=>a.d-b.d).slice(0, C.absorbLinks);
  while(pts.length < C.absorbLinks){ const p = micPointNear(e.x, e.y, 220, 340, 40); pts.push({x:p.x, y:p.y}); }
  for(const p of pts){
    const l = micSpawnAt("raiz_absorcion", p.x, p.y);
    l.structure = true; l.micStatic = true; l._ax = l.x; l._ay = l.y; l.lk = e; l.speed = 0; l.atkCd = 1e6;
    vfxBurst(l.x, l.y-10, 10, "micRoot", 100, 500, 3, 1, -30, 0);
  }
  e.micAbs = {t:0, healed:0};
  _micBossPack(e, "absorb", 900);
  showBanner("¡El Micelio ABSORBE a los caídos! Cortá las raíces");
  bossHudHint("Absorción", "rompé las raíces brillantes para cortar la curación");
  playSfx("micGerm");
}
function micRootLinkKilled(l){
  vfxBurst(l.x, l.y-10, 12, "micRoot", 120, 500, 3, 1, -30, 0);
  playSfx("micRoot");
}
function micMicelioKilled(e){
  const M = micS.mi;
  M.st = "sink"; M.t = 0; M.x = Math.round(e.x); M.y = Math.round(e.y);
  for(const o of enemies){ if(o.alive && o.type==="raiz_absorcion"){ o.alive = false; o.hp = 0; vfxOnDeath(o); } }
  vfxShock(e.x, e.y, 30, 360, "220,110,255", 1000, 2);
  vfxBurst(e.x, e.y-50, 36, "micSpore", 260, 1000, 5, 2, -80, 0);
  vfxShake(12); flashScreen(0.3, "220,160,255");
  playSfx("micCollapse");
  showBanner("¡El Micelio Primigenio colapsa!");
  if(typeof setMusicMode==="function") setMusicMode("wave", runLevel);
  levelTimer = Math.max(levelTimer, levelDuration - 6000);
}
