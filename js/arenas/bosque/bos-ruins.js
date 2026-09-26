"use strict";
/* ============================================================
   js/arenas/bosque/bos-ruins.js
   RUINAS ÉLFICAS (Bosque) — "EL BOSQUE TE CAZA, LAS PIEDRAS TE RECUERDAN"

   RUNAS INVERTIDAS (BUGFIX 01): las 4 runas del círculo ya NO son un poder del jugador. Se
   ACTIVAN SOLAS, de a una y cada vez más seguido, y el equipo tiene que CONTENERLAS.
   Estados de cada runa (se ven en el menhir, con cartel y color):
     controlada   → apagada, verde tenue. Nada pasa.
     activándose  → se tiñe de rojo y se llena (aviso: flecha en el borde si está fuera de cámara).
     activa       → brilla roja: más enemigos por minuto (algunos salen de la runa, corrompidos:
                    más daño y velocidad) y la horda entera pega más mientras siga activa.
     corrupción avanzada → activa hace demasiado: además late una onda roja telegrafiada.
     siendo desactivada  → alguien mantiene ✚ al lado (varios a la vez = más rápido).
     bloqueada    → recién contenida: SELLADA un rato (no se puede reactivar) y sus raíces
                    castigan a la horda cercana (el premio por contenerla).
   Cuantas más runas activas, más peligro (nunca un "perdiste" directo). Las 4 activas a la vez
   desatan la OLEADA DE CORRUPCIÓN (una horda de golpe desde las cuatro piedras).
   NIVEL 10: al terminar el tiempo las runas se DESBORDAN (ya no se pueden contener), se activan
   todas, explotan… y del centro del círculo sale el Guardián Ancestral Corrompido.
   EMBOSCADAS: desde el nivel 2, la maleza se sacude alrededor del equipo (aviso de 2,6 s) y salta
   una jauría. Nunca sin aviso.
   Tutorial (VER → ENTENDER → HACER → FEEDBACK) con el Hechicero la primera vez que una runa se
   activa. Todo lo decide el anfitrión; viaja en bosNetState(). Arte: menhires existentes + glifo
   y maleza procedurales (ver LA_HORDA_MISSING_ASSETS.md).
   ============================================================ */
const BOS_CFG = {
  runeIdx: [1, 3, 5, 7],        // menhires con runa (de los 8 del círculo)
  ring: 300,
  firstArmMs: 22000,            // la primera runa despierta pronto (después de los básicos; la enseña el Hechicero)
  armEvery: lvl => Math.max(9000, 27000 - lvl*1900),   // cada cuánto despierta otra runa
  armMs: lvl => Math.max(5500, 10500 - lvl*500),       // cuánto tarda en activarse
  maxAwake: lvl => lvl <= 2 ? 2 : (lvl <= 5 ? 3 : 4),  // runas despiertas a la vez (activándose + activas)
  corruptAfter: 22000,          // activa -> corrupción avanzada
  sealMs: 20000,                // bloqueada después de contenerla
  containMs: {arming:1500, active:2600, corrupt:3400},
  spawnEvery: {active:9000, corrupt:5500},
  pulseEvery: 7000, pulseR: 170, pulseDmg: 0.07,       // % de la vida media del equipo
  buffPerRune: 0.08,            // +daño de los enemigos nuevos por runa activa (corrupción: +0.06 más)
  corruptedBuff: {dmg:1.15, speed:1.10},
  rootR: 280, rootStun: [2200, 900, 350], rootDmg: [0.20, 0.06, 0.015],
  surgeCd: 40000, surgeN: lvl => 6 + lvl,
  finaleArmMs: 3200, finaleBlastMs: 1400,
  ambushFirst: 2,
  ambushEvery: [36000, 50000],
  ambushWarn: 2600,
  ambushSpots: [2, 3],
  ambushPer: [1, 2]
};
const BOS_STATE_TXT = {ctrl:"CONTROLADA", arming:"ACTIVÁNDOSE", active:"ACTIVA", corrupt:"CORRUPCIÓN", sealed:"SELLADA", finale:"¡INCONTENIBLE!"};
const BOS = { runes:[], amb:[], ambT:0, nextA:1, armT:0, surgeT:0, finale:null };

function bosResetRun(){
  BOS.runes = BOS_CFG.runeIdx.map((i)=>{
    const a = i/8*6.283 + Math.PI/8;
    const p = aidOnRing(BOS_CFG.ring, BOS_CFG.ring, a);
    return { id:"rn"+i, kind:"bos_rune", mx:Math.round(p.x), my:Math.round(p.y), x:Math.round(p.x), y:Math.round(p.y)+30, r:70, h:132,
      st:"ctrl", t:0, arm:0, prog:0, dur:BOS_CFG.containMs.arming, done:false, by:-1, flash:0, spawnT:0, pulseT:0 };
  });
  BOS.amb = []; BOS.ambT = BOS_CFG.ambushEvery[0]*0.5; BOS.nextA = 1;
  BOS.armT = BOS_CFG.firstArmMs; BOS.surgeT = 0; BOS.finale = null;
}
function bosRunStart(){ bosResetRun(); }
function bosGuestStart(){ bosResetRun(); }
const bosIsLit = r => r.st==="active" || r.st==="corrupt" || r.st==="finale";
function bosLitCount(){ let n = 0; for(const r of BOS.runes) if(bosIsLit(r)) n++; return n; }
function bosAwakeCount(){ let n = 0; for(const r of BOS.runes) if(r.st==="arming" || bosIsLit(r)) n++; return n; }
// "Peligro" de las runas: lo usan el ritmo de aparición y el refuerzo de los enemigos nuevos.
function bosDanger(){ let d = 0; for(const r of BOS.runes){ if(r.st==="active") d += 1; else if(r.st==="corrupt") d += 1.75; } return d; }
function bosSetState(r, st){
  r.st = st; r.t = 0; r.prog = 0; r.done = false; r.by = -1;
  if(BOS_CFG.containMs[st]) r.dur = BOS_CFG.containMs[st];
}
function bosUpdate(dt){
  const calm = runEnding || levelClearing > 0 || activeChampion;
  if(BOS.finale){ bosFinaleTick(dt); }
  // despertar de runas (nunca durante el jefe ni en el respiro entre niveles)
  if(!calm && !bossActive && !BOS.finale){
    BOS.armT -= dt;
    if(BOS.armT <= 0){
      BOS.armT = BOS_CFG.armEvery(runLevel) * (0.85 + Math.random()*0.3);
      if(bosAwakeCount() < BOS_CFG.maxAwake(runLevel)){
        const pool = BOS.runes.filter(r=>r.st==="ctrl");
        if(pool.length) bosArm(pool[(Math.random()*pool.length)|0]);
      }
    }
  }
  for(const r of BOS.runes){
    if(r.flash > 0) r.flash -= dt;
    r.t += dt;
    if(r.st==="arming"){
      r.arm = Math.min(1, r.t / BOS_CFG.armMs(runLevel));
      if(r.arm >= 1){ bosSetState(r, "active"); r.spawnT = 2500; bosOnLit(r); }
    } else if(r.st==="active" || r.st==="corrupt"){
      if(r.st==="active" && r.t >= BOS_CFG.corruptAfter){ bosSetState(r, "corrupt"); r.pulseT = 2500; floatText(r.x, r.y-120, "¡Corrupción avanzada!", "crit"); playSfx("bosRuneReady"); }
      if(!calm && !bossActive){
        r.spawnT -= dt;
        if(r.spawnT <= 0){ r.spawnT = BOS_CFG.spawnEvery[r.st] || 9000; bosRuneSpawn(r, r.st==="corrupt" ? 2 : 1); }
        if(r.st==="corrupt"){
          r.pulseT -= dt;
          if(r.pulseT <= 0){
            r.pulseT = BOS_CFG.pulseEvery;
            bossStrike(r.x, r.y, BOS_CFG.pulseR, 1300, (runDifficulty.avgHp||300)*BOS_CFG.pulseDmg, "fire", {slow:0.3, slowDur:900});
          }
        }
      }
    } else if(r.st==="sealed"){
      if(r.t >= BOS_CFG.sealMs) bosSetState(r, "ctrl");
    }
  }
  // Oleada de Corrupción: las 4 activas a la vez
  if(BOS.surgeT > 0) BOS.surgeT -= dt;
  if(!calm && !bossActive && !BOS.finale && BOS.surgeT <= 0 && BOS.runes.length && BOS.runes.every(bosIsLit)) bosSurge();
  // emboscadas
  if(!calm && !bossActive && runLevel >= BOS_CFG.ambushFirst){
    BOS.ambT -= dt;
    if(BOS.ambT <= 0){ BOS.ambT = BOS_CFG.ambushEvery[0] + Math.random()*(BOS_CFG.ambushEvery[1]-BOS_CFG.ambushEvery[0]); bosStartAmbush(); }
  }
  let w = 0;
  for(const a of BOS.amb){
    a.t -= dt;
    if(a.t <= 0 && !a.sprung){ a.sprung = true; bosSpring(a); }
    if(a.t > -900) BOS.amb[w++] = a;
  }
  BOS.amb.length = w;
  bosTut();
}
function bosArm(r){
  bosSetState(r, "arming"); r.arm = 0;
  playSfx("bosRustle");
  if(inView(r.x, r.y, 60)) floatText(r.x, r.y-120, "¡Una runa despierta!", "crit");
}
function bosOnLit(r){
  r.flash = 700;
  vfxShock(r.x, r.y, 20, 220, "230,60,50", 600, 2);
  vfxBurst(r.x, r.y-60, 14, "ember", 140, 520, 3, 1, -60, 0);
  playSfx("bosRuneFire");
  const n = bosLitCount();
  showBanner(n >= 4 ? "¡LAS CUATRO RUNAS ARDEN!" : `RUNA ACTIVA (${n}/4): LA HORDA SE FORTALECE`);
}
// Enemigos que salen de una runa activa: corrompidos (más daño y velocidad).
function bosRuneSpawn(r, n){
  const pool = spawnPoolFor(runLevel);
  for(let i=0;i<n;i++){
    const e = spawnEnemy(pickFromPool(pool), false);
    if(!e) continue;
    e.x = r.x + (Math.random()-0.5)*60; e.y = r.y + 20 + Math.random()*30; clampToArena(e);
    bosCorrupt(e);
  }
  vfxBurst(r.x, r.y-20, 10, "ember", 120, 420, 3, 1, -50, 0);
}
function bosCorrupt(e){
  if(e._bosCorrupt) return;
  e._bosCorrupt = true; e.dmg = Math.round(e.dmg*BOS_CFG.corruptedBuff.dmg); e.speed *= BOS_CFG.corruptedBuff.speed;
}
// Gancho de aparición (spawning.js): con runas activas la horda nueva sale más fuerte.
function bosPlaceSpawn(e, atBoss, champion){
  if(champion || e.rank==="jefe" || !BOS.runes.length) return;
  const d = bosDanger(); if(d <= 0) return;
  e.dmg = Math.round(e.dmg*(1 + BOS_CFG.buffPerRune*d));
  // algunos salen directamente de una runa encendida (la ruta de la horda cambia)
  const lit = BOS.runes.filter(bosIsLit);
  if(lit.length && Math.random() < 0.12*lit.length){
    const r = lit[(Math.random()*lit.length)|0];
    e.x = r.x + (Math.random()-0.5)*80; e.y = r.y + 20 + Math.random()*40; clampToArena(e); bosCorrupt(e);
  }
}
// Más runas activas = más enemigos por minuto.
function bosSpawnIntervalMult(){ return 1/(1 + 0.14*bosDanger()); }
function bosSurge(){
  BOS.surgeT = BOS_CFG.surgeCd;
  const n = BOS_CFG.surgeN(runLevel), lit = BOS.runes.filter(bosIsLit);
  for(let i=0;i<n;i++) bosRuneSpawn(lit[i % lit.length], 1);
  flashScreen(0.35, "200,40,40"); vfxShake(10); playSfx("bossRoar");
  showBanner("¡OLEADA DE CORRUPCIÓN!");
  if(player) floatText(player.x, player.y-80, "¡Contené las runas!", "crit");
}
// Consejos del Hechicero (cada cliente mira lo suyo: anfitrión e invitados).
function bosTut(){
  if(!player || !player.alive) return;
  const r0 = BOS.runes.find(r=>r.st==="arming" || bosIsLit(r));
  if(r0 && !BOS.finale){
    // VER + ENTENDER
    if(!tutSeen("rune_see")) tutSay("rune_see", "¡Mirá esa RUNA que se tiñe de ROJO! Si termina de activarse, la corrupción FORTALECE a la horda: cuantas más runas activas, más enemigos y más fuertes.", "Acercate a la runa roja (seguí la flecha)", 14000);
    if(TUT.key==="rune_see" && Math.hypot(player.x-r0.x, player.y-r0.y) < 230) tutDone("rune_see");
    // HACER
    if(tutSeen("rune_see") && Math.hypot(player.x-r0.x, player.y-r0.y) < 420)
      tutSay("rune_do", "Mantené ✚ al lado de la runa para CONTENERLA. Con un compañero se contiene más rápido.", "Mantené ✚ junto a la runa roja", 14000);
  }
  if(BOS.amb.some(a=>a.t > 0)) tutSay("ambush", "¡Cuidado! La maleza que se sacude esconde una EMBOSCADA.", "Alejate de la maleza que se sacude", 7000);
}
function bosStartAmbush(){
  const c = infHeroCentroid();
  const n = BOS_CFG.ambushSpots[0] + ((Math.random()*(BOS_CFG.ambushSpots[1]-BOS_CFG.ambushSpots[0]+1))|0);
  const base = Math.random()*Math.PI*2;
  let made = 0, fails = 0;
  for(let i=0; i<n*10 && made<n; i++){
    // si un sector choca con el borde o una roca, cada reintento abre el abanico (antes repetía
    // casi el mismo ángulo y la emboscada quedaba con un solo punto)
    const ang = base + made*(Math.PI*2/n) + (Math.random()-0.5)*(0.5 + fails*0.45), d = 270 + Math.random()*90 - Math.min(fails, 4)*14;
    const x = c.x + Math.cos(ang)*d, y = c.y + Math.sin(ang)*d*0.8;
    if(!aidInside(x, y, 70) || aidBlocked(x, y, 40) || BOS.amb.some(o=>o.t > 0 && Math.hypot(o.x-x, o.y-y) < 120)){ fails++; continue; }
    fails = 0;
    BOS.amb.push({id:BOS.nextA++, x:Math.round(x), y:Math.round(y), t:BOS_CFG.ambushWarn, sprung:false, seed:(Math.random()*1e6)|0});
    made++;
  }
  if(!made) return;
  playSfx("bosRustle");
  floatText(player.x, player.y-70, "¡Emboscada!", "crit");
}
function bosSpring(a){
  const pool = spawnPoolFor(runLevel);
  // prefiere cazadores (bestias / Cù-Sìth) si ya salen en este nivel
  const hunters = pool.filter(p=>p.t==="bestia_bosque" || p.t==="cu_sith");
  const src = hunters.length ? hunters : pool;
  const k = BOS_CFG.ambushPer[0] + ((Math.random()*(BOS_CFG.ambushPer[1]-BOS_CFG.ambushPer[0]+1))|0);
  for(let i=0;i<k;i++){
    const e = spawnEnemy(pickFromPool(src), false);
    if(!e) continue;
    e.x = a.x + (Math.random()-0.5)*30; e.y = a.y + (Math.random()-0.5)*20; clampToArena(e);
    if(a.burnt){ e.burnTimer = Math.max(e.burnTimer||0, 4000); e.burnDmg = Math.max(e.burnDmg||0, e.maxHp*0.05); }
  }
  vfxBurst(a.x, a.y-10, 16, "leaf", 150, 520, 3, 1, -60, 0);
  playSfx("bosSpring");
}
function bosGuestUpdate(dt){ for(const a of BOS.amb) a.t -= dt; for(const r of BOS.runes) if(r.flash > 0) r.flash -= dt; bosTut(); }
function bosGuestUpdate(dt){
  for(const a of BOS.amb) a.t -= dt;
  for(const r of BOS.runes){ if(r.flash > 0) r.flash -= dt; }
  bosTut();
}
// ---- acción contextual: CONTENER una runa (activándose / activa / corrupta) ----
function bosCtxTargets(){ const out = []; for(const r of BOS.runes) if(r.st==="arming" || r.st==="active" || r.st==="corrupt") out.push(r); return out; }
CTX_KINDS.bos_rune = {
  label:"Contener", icon:"ᛉ", color:"#ff6a5a",
  maxBots: 2, farOk: true,
  pointer(r){ return r.st==="arming" || r.st==="active" || r.st==="corrupt"; },
  onComplete(r, users){
    const was = r.st;
    bosSetState(r, "sealed"); r.flash = 900; r.by = heroes.indexOf(users[0]);
    // premio: las raíces élficas castigan a la horda cercana (más fuerte si la contuvieron temprano)
    const k = was==="arming" ? 1.25 : 1;
    let hit = 0;
    for(const e of enemies){
      if(!e.alive || Math.hypot(e.x-r.x, e.y-r.y) > BOS_CFG.rootR) continue;
      const tier = e.rank==="jefe" ? 2 : ((e.rank==="subjefe" || e.rank==="elite") ? 1 : 0);
      e.stunTimer = Math.max(e.stunTimer||0, BOS_CFG.rootStun[tier]);
      damageEnemy(e, Math.max(1, e.maxHp*BOS_CFG.rootDmg[tier]*k), {src:users[0], critChanceOverride:0, fromProc:true});
      hit++;
      vfxBurst(e.x, e.y, 5, "leaf", 90, 420, 2.5, 0, -40, 0);
    }
    vfxShock(r.x, r.y, 20, BOS_CFG.rootR, "140,230,110", 600, 3);
    playSfx("bosRuneFire"); vfxShake(4);
    floatText(r.x, r.y-110, hit ? `¡Runa contenida! Raíces ×${hit}` : "¡Runa contenida!", "crit");
    for(const h of users){
      if(h.stats) h.stats.runes = (h.stats.runes||0) + 1;
      if(h===player){ tutDone("rune_do"); tutSay("rune_ok", "¡Bien! La runa quedó SELLADA un rato y sus raíces castigaron a la horda. Vigilá las otras: se despiertan cada vez más seguido.", null, 7000); }
    }
  },
  botWorth(h, r){
    const base = r.st==="corrupt" ? 5 : (r.st==="active" ? 4 : 2.5);
    let n = 0; for(const e of enemies){ if(e.alive && Math.hypot(e.x-r.x, e.y-r.y) < 200) n++; }
    return Math.max(0.5, base - n*0.25);
  }
};
/* ---- NIVEL 10: las runas se desbordan -> explosión -> Guardián Ancestral Corrompido ---- */
// startBossFight (waves.js) llama acá primero: true = la secuencia arrancó (el jefe sale al final).
function bosBossIntro(){
  if(BOS.finale || !BOS.runes.length) return false;
  BOS.finale = {t:0, stage:0};
  for(const r of BOS.runes){ bosSetState(r, "finale"); r.arm = 0; }
  if(typeof setMusicMode==="function") setMusicMode("boss");
  showBanner("¡LAS RUNAS SE DESBORDAN!");
  bossHudHint("Las runas se desbordan", "ya no se pueden contener: preparate");
  vfxShake(6); playSfx("bosRustle");
  return true;
}
function bosFinaleTick(dt){
  const F = BOS.finale; if(!F || F.stage >= 2) return;
  F.t += dt;
  for(const r of BOS.runes) r.arm = Math.min(1, F.t / BOS_CFG.finaleArmMs);
  if(F.stage===0 && F.t >= BOS_CFG.finaleArmMs){
    F.stage = 1;
    for(const r of BOS.runes){ r.flash = 900; vfxShock(r.x, r.y, 20, 240, "230,60,50", 700, 3); vfxBurst(r.x, r.y-60, 18, "ember", 180, 600, 4, 2, -60, 0); }
    // la corrupción de las 4 piedras converge en el centro del círculo
    bossStrike(0, 0, 230, BOS_CFG.finaleBlastMs, (runDifficulty.avgHp||300)*0.06, "fire", {knock:120});
    playSfx("bosRuneFire"); vfxShake(8);
  }
  if(F.stage===1 && F.t >= BOS_CFG.finaleArmMs + BOS_CFG.finaleBlastMs){
    F.stage = 2;
    flashScreen(0.6, "255,120,80"); vfxShake(16);
    vfxShock(0, 0, 30, 520, "255,90,60", 900, 3);
    if(typeof bossSheetFx==="function") bossSheetFx("gdBurst", 0, -40, 320, 900);
    for(const r of BOS.runes){ bosSetState(r, "sealed"); r.t = -1e9; } // apagadas (quemadas) durante el jefe
    startBossFight();   // ahora sí: el Guardián sale del centro
    if(boss){ boss.x = 0; boss.y = 0; clampToArena(boss); }
  }
}
// ---- red ----
const BOS_ST = ["ctrl","arming","active","corrupt","sealed","finale"];
function bosNetState(){
  return {r:BOS.runes.map(r=>[BOS_ST.indexOf(r.st), Math.round((r.arm||0)*1000), r.prog|0, r.by, r.flash|0, r.t|0]), a:BOS.amb.map(a=>[a.id, a.x, a.y, a.t|0, a.seed]), f:BOS.finale ? 1 : 0};
}
function bosApplyNetState(s){
  if(!s) return;
  if(s.r) s.r.forEach((v, i)=>{ const r = BOS.runes[i]; if(!r) return; const st = BOS_ST[v[0]] || "ctrl"; if(r.st!==st && BOS_CFG.containMs[st]) r.dur = BOS_CFG.containMs[st]; r.st = st; r.arm = v[1]/1000; r.prog = v[2]; r.by = v[3]; r.flash = v[4]; r.t = v[5]; r.done = false; });
  if(s.a) BOS.amb = s.a.map(v=>({id:v[0], x:v[1], y:v[2], t:v[3], seed:v[4], sprung:v[3] <= 0}));
  BOS.finale = s.f ? (BOS.finale || {t:0, stage:0}) : null;
}
// ---- dibujo ----
function bosDrawGround(now){
  // maleza que se sacude antes de la emboscada
  for(const a of BOS.amb){
    if(a.t <= 0 || !inView(a.x, a.y, 90)) continue;
    const k = 1 - a.t/BOS_CFG.ambushWarn, shake = Math.sin(now*40 + a.seed)*(2 + k*4);
    ctx.save(); ctx.translate(Math.round(a.x + shake), Math.round(a.y));
    ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.beginPath(); ctx.ellipse(0, 4, 34, 11, 0, 0, Math.PI*2); ctx.fill();
    const rnd = _infRng(a.seed);
    for(let i=0;i<9;i++){
      const lx = (rnd()-0.5)*56, ly = (rnd()-0.5)*14 - 6, s = 8 + rnd()*8;
      ctx.fillStyle = i%3===0 ? "#2e5a24" : (i%3===1 ? "#3f7a2e" : "#5a9a3a");
      ctx.fillRect(Math.round(lx - s/2), Math.round(ly - s), Math.round(s), Math.round(s));
    }
    // ojos en la maleza al final del aviso
    if(k > 0.55){ ctx.fillStyle = "#ffe066"; ctx.fillRect(-9, -14, 3, 2); ctx.fillRect(4, -14, 3, 2); }
    ctx.restore();
    // "!" encima
    ctx.save(); ctx.fillStyle = k > 0.7 && Math.sin(now*20) > 0 ? "#ff4a3a" : "#ffcf5c"; ctx.font = "bold 22px sans-serif"; ctx.textAlign = "center";
    ctx.fillText("!", a.x, a.y - 40 - k*6); ctx.restore();
  }
  // zona de influencia de cada runa encendida (roja) / despertándose (se llena)
  for(const r of BOS.runes){
    if(!inView(r.x, r.y, 260)) continue;
    const lit = bosIsLit(r), R = r.st==="corrupt" ? BOS_CFG.pulseR + 20 : 150;
    if(r.st==="arming" || r.st==="finale" && r.arm < 1){
      ctx.save(); ctx.strokeStyle = `rgba(230,70,50,${0.25 + 0.35*r.arm})`; ctx.lineWidth = 2 + 2*r.arm; ctx.setLineDash([6, 8]);
      ctx.beginPath(); ctx.ellipse(r.x, r.y, R*r.arm + 20, (R*r.arm + 20)*0.62, 0, 0, Math.PI*2); ctx.stroke(); ctx.restore();
    } else if(lit){
      const a = 0.14 + 0.08*Math.sin(now*4 + r.mx);
      ctx.save(); const g = ctx.createRadialGradient(r.x, r.y, 10, r.x, r.y, R);
      g.addColorStop(0, `rgba(220,40,30,${a*1.6})`); g.addColorStop(1, "rgba(120,10,10,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(r.x, r.y, R, R*0.62, 0, 0, Math.PI*2); ctx.fill(); ctx.restore();
    }
  }
}
function bosPushTall(){ for(let i=0;i<BOS.runes.length;i++){ const r = BOS.runes[i]; if(inView(r.mx, r.my-60, 80)) _entPush(r.my+1, null, null, null, {arena:1, bosRune:i+1}); } }
const BOS_COL = {ctrl:["#3f7a2e","#8ee07a"], arming:["#7a2a1e","#ff8a6a"], active:["#c8281c","#ffd0c0"], corrupt:["#8a0e0e","#ffb0a0"], sealed:["#2e6a8a","#bfe8ff"], finale:["#c8281c","#fff0e0"]};
function bosDrawTall(it, now){
  const r = BOS.runes[it.bosRune-1]; if(!r) return;
  // glifo sobre el menhir: el color dice el estado; la barra se llena mientras se activa
  const x = r.mx, y = r.my - 78, col = BOS_COL[r.st] || BOS_COL.ctrl, lit = bosIsLit(r);
  ctx.save();
  ctx.fillStyle = "rgba(10,20,8,0.75)"; ctx.fillRect(x-7, y-12, 14, 24);
  const fill = r.st==="arming" || r.st==="finale" ? Math.round(22*Math.min(1, r.arm||0)) : (r.st==="ctrl" ? 0 : 22);
  ctx.fillStyle = col[0]; ctx.fillRect(x-5, y+10-fill, 10, fill);
  ctx.fillStyle = col[1];
  ctx.fillRect(x-1, y-9, 2, 18); ctx.fillRect(x-5, y-9, 2, 6); ctx.fillRect(x+3, y-9, 2, 6); ctx.fillRect(x-4, y-4, 2, 2); ctx.fillRect(x+2, y-4, 2, 2);
  if(lit || r.st==="arming" || r.flash > 0 || r.st==="sealed"){
    ctx.globalCompositeOperation = "lighter";
    const a = r.flash > 0 ? r.flash/900 : (lit ? 0.55 + 0.3*Math.sin(now*(r.st==="corrupt" ? 9 : 5) + r.mx) : (r.st==="sealed" ? 0.25 : 0.2 + 0.4*(r.arm||0)));
    const rgb = r.st==="sealed" ? "140,210,255" : (r.flash > 0 && r.st==="sealed" ? "150,255,120" : "255,70,50");
    const g = ctx.createRadialGradient(x, y, 2, x, y, 50); g.addColorStop(0, `rgba(${rgb},${0.6*a})`); g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 50, 0, Math.PI*2); ctx.fill();
    ctx.globalCompositeOperation = "source-over";
  }
  // cartel de estado (solo cuando importa: no controlada)
  if(r.st!=="ctrl"){
    let txt = BOS_STATE_TXT[r.st] || "";
    if(r.prog > 0 && r.st!=="sealed" && r.st!=="finale") txt = "CONTENIENDO…";
    if(r.st==="sealed" && r.t > 0) txt += " " + Math.max(0, Math.ceil((BOS_CFG.sealMs - r.t)/1000)) + "s";
    ctx.font = "bold 11px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const w = ctx.measureText(txt).width + 10;
    ctx.fillStyle = "rgba(8,6,10,0.78)"; ctx.fillRect(Math.round(x - w/2), y - 34, Math.round(w), 15);
    ctx.fillStyle = r.st==="sealed" ? "#bfe8ff" : (r.st==="arming" ? "#ffb08a" : "#ff6a5a");
    ctx.fillText(txt, x, y - 26);
  }
  ctx.restore();
}
// Barra de runas en pantalla (arriba al centro): cuántas están encendidas y en qué estado.
function bosDrawScreen(){
  if(!BOS.runes.length || state!=="playing" || (bossActive && !BOS.finale)) return;
  const n = BOS.runes.length, w = 26, x0 = Math.round(VW/2 - n*w/2), y0 = 54;
  ctx.save();
  ctx.fillStyle = "rgba(8,6,10,0.62)"; ctx.fillRect(x0 - 50, y0 - 4, n*w + 58, 26);
  ctx.font = "bold 11px sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillStyle = "#e8d8c0";
  ctx.fillText("Runas", x0 - 44, y0 + 9);
  BOS.runes.forEach((r, i)=>{
    const col = BOS_COL[r.st] || BOS_COL.ctrl, x = x0 + i*w + 4;
    ctx.fillStyle = "#15110e"; ctx.fillRect(x, y0, 18, 18);
    const f = r.st==="arming" || r.st==="finale" ? (r.arm||0) : (r.st==="ctrl" ? 0 : 1);
    ctx.fillStyle = col[0]; ctx.fillRect(x+2, y0+2 + Math.round(14*(1-f)), 14, Math.round(14*f));
    ctx.strokeStyle = bosIsLit(r) ? "#ff6a5a" : (r.st==="sealed" ? "#bfe8ff" : "#5a6a4a"); ctx.lineWidth = 1.5; ctx.strokeRect(x+0.5, y0+0.5, 17, 17);
  });
  ctx.restore();
}

Object.assign(ARENA_SFX, {
  bosRuneReady: {p:2, gap:800, play:(t,D)=>{ [523,659,784].forEach((f,i)=>_tone(t+i*0.07,"sine",f,f,0.5,0.06,D,0.02)); return 0.7; }},
  bosRuneFire:  {p:4, gap:300, play:(t,D)=>{ _tone(t,"sine",110,55,0.6,0.35,D); for(let i=0;i<6;i++) _noise(t+i*0.05,0.06,0.2,"bandpass",400+i*90,3,D); [392,523].forEach((f,i)=>_tone(t+0.1+i*0.08,"triangle",f,f*1.01,0.5,0.08,D,0.02)); return 0.8; }},
  bosRustle:    {p:3, gap:900, play:(t,D)=>{ for(let i=0;i<10;i++) _noise(t+i*0.07,0.08,0.14,"highpass",2400+Math.random()*1500,0,D); return 0.8; }},
  bosSpring:    {p:3, gap:300, play:(t,D)=>{ _noise(t,0.25,0.25,"bandpass",1200,1,D); _tone(t,"sawtooth",220,110,0.2,0.08,D); return 0.3; }}
});

// Etiqueta ambiental "fire" (js/systems/env-tags.js): el fuego quema la maleza de una emboscada que
// todavía no saltó: los que salen, salen ardiendo.
envOn("fire", "bosque", (x, y, src, o)=>{
  for(const a of BOS.amb){ if(a.t > 0 && !a.burnt && Math.hypot(a.x-x, a.y-y) < (o.r||40) + 50){ a.burnt = true; vfxBurst(a.x, a.y-10, 12, "ember", 120, 500, 3, 1, -60, 0); floatText(a.x, a.y-50, "¡La maleza arde!", null); } }
});

ARENA_EXT.bosque = {
  runStart: bosRunStart,
  guestStart: bosGuestStart,
  update: bosUpdate,
  guestUpdate: bosGuestUpdate,
  ctxTargets: bosCtxTargets,
  placeSpawn: bosPlaceSpawn,
  spawnIntervalMult: bosSpawnIntervalMult,
  drawGround: bosDrawGround,
  drawScreen: bosDrawScreen,
  pushTall: bosPushTall,
  drawTall: bosDrawTall,
  netState: bosNetState,
  applyNetState: bosApplyNetState
};
