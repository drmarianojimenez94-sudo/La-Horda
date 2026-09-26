"use strict";
/* ============================================================
   js/arenas/infernal/inf-fissures.js
   ARENA INFERNAL — FISURAS: "¿MATO O CIERRO?"

   Desde el nivel 2 se abren grietas en el piso (con aviso: temblor + grieta que se forma).
   - Son PORTALES: buena parte de la horda sale de las fisuras abiertas (placeSpawn), y las
     maduras escupen un demonio propio cada tanto. Cuanto más tiempo quedan, más crecen
     (3 etapas) y más peligrosas son (la etapa 3 erupciona con aviso).
   - Se CIERRAN con la acción contextual (mantener el botón al lado): el calor quema al que
     cierra y a mitad de camino la fisura reacciona y vomita dos enemigos. Varios héroes a la
     vez la cierran más rápido. Al sellarse estalla: aturde y empuja a los enemigos cercanos y
     deja una poción.
   - Al terminar cada nivel todas bajan una etapa (las chicas se apagan). Durante el jefe no se
     abren nuevas ni escupen enemigos (solo erupcionan): el jefe es la pelea.
   Todo lo decide el anfitrión; viaja en infNetState(). Arte: procedural (sin sprite propio
   todavía: ver LA_HORDA_MISSING_ASSETS.md).
   ============================================================ */
const INF_CFG = {
  firstLevel: 2,
  maxOpen: lvl => lvl >= 7 ? 3 : (lvl >= 4 ? 2 : 1),
  openEvery: [15000, 22000],   // ms entre aperturas (mientras haya lugar)
  openWarn: 1700,              // la grieta se forma (sin efecto) antes de abrirse
  growEvery: 15000,            // ms por etapa (1 -> 2 -> 3)
  radius: [0, 46, 62, 80],     // radio visual/ocupado por etapa
  useR: 44,                    // alcance extra para cerrarla (además del radio)
  spawnShare: [0, 0.30, 0.42, 0.55], // fracción de la aparición normal que sale por fisuras (por etapa de la mayor)
  spitEvery: 10000,            // etapa >= 2: escupe un enemigo propio (con tope global)
  spitCap: 34,                 // no escupe si ya hay tantos enemigos vivos
  eruptEvery: [8000, 11000],   // etapa 3: erupción telegrafiada
  eruptDmg: 0.07,              // % de la vida media de los héroes
  closeMs: [0, 2600, 3200, 3800], // ms de mantener para cerrar, por etapa
  heatPct: 0.012,              // % de vida máxima por segundo que quema al que cierra
  reactAt: 0.45,               // a esta fracción del cierre, la fisura reacciona (una vez)
  reactSpawns: 2,
  sealStun: 1300, sealR: 230
};
const INF = { fis:[], nextId:1, openT:0 };

function infOpenCount(){ let n = 0; for(const f of INF.fis) if(!f.done) n++; return n; }
function infHeroCentroid(){
  let x = 0, y = 0, n = 0;
  for(const h of heroes){ if(h.alive){ x += h.x; y += h.y; n++; } }
  return n ? {x:x/n, y:y/n} : {x:player.x, y:player.y};
}
function infMakeFissure(x, y){
  const f = { id:"inf"+(INF.nextId++), kind:"inf_fissure", x, y, stage:1, warn:INF_CFG.openWarn, age:0,
    growT:INF_CFG.growEvery, spitT:INF_CFG.spitEvery, eruptT:INF_CFG.eruptEvery[0],
    prog:0, dur:INF_CFG.closeMs[1], r:INF_CFG.radius[1]+INF_CFG.useR, reacted:false, done:false, doneT:0,
    seed:(Math.random()*1e6)|0, by:-1, h:70 };
  INF.fis.push(f);
  return f;
}
function infTryOpen(){
  const c = infHeroCentroid();
  for(let tries=0; tries<30; tries++){
    const a = Math.random()*Math.PI*2, d = 300 + Math.random()*360;
    const x = c.x + Math.cos(a)*d, y = c.y + Math.sin(a)*d*0.8;
    if(!aidInside(x, y, 110)) continue;
    if(INF.fis.some(f=>!f.done && Math.hypot(f.x-x, f.y-y) < 260)) continue;
    if(heroes.some(h=>h.alive && Math.hypot(h.x-x, h.y-y) < 170)) continue;
    if(aidSolids.some(s=>Math.hypot(s.x-x, s.y-y) < s.r+60)) continue;
    const f = infMakeFissure(x, y);
    vfxShake(4); playSfx("infCrack");
    vfxTelegraph({shape:0, r:INF_CFG.radius[1], x, y, follow:null, dur:INF_CFG.openWarn, rgb:"255,110,30"});
    floatText(x, y-40, "¡Fisura!", "crit");
    return f;
  }
  return null;
}
function infResetRun(){ INF.fis = []; INF.nextId = 1; INF.openT = INF_CFG.openEvery[0]*0.6; }

// ---- ganchos (anfitrión / partida local) ----
function infRunStart(){ infResetRun(); }
function infGuestStart(){ infResetRun(); }
function infBeginLevel(){
  // al pasar de nivel todas bajan una etapa (las recién abiertas se apagan)
  if(runLevel <= 1) return;
  for(const f of INF.fis){
    if(f.done) continue;
    if(f.stage <= 1){ f.done = true; f.doneT = 0; f.sealedBy = "level"; }
    else { f.stage--; f.growT = INF_CFG.growEvery; infSyncStage(f); }
  }
}
function infSyncStage(f){
  f.r = INF_CFG.radius[f.stage] + INF_CFG.useR;
  const nd = INF_CFG.closeMs[f.stage];
  f.prog = f.prog * nd / (f.dur || nd); f.dur = nd;
}
function infUpdate(dt){
  const calm = runEnding || levelClearing > 0;
  // aperturas
  if(!calm && runLevel >= INF_CFG.firstLevel && !bossActive && !activeChampion){
    INF.openT -= dt;
    if(INF.openT <= 0){
      INF.openT = INF_CFG.openEvery[0] + Math.random()*(INF_CFG.openEvery[1]-INF_CFG.openEvery[0]);
      if(infOpenCount() < INF_CFG.maxOpen(runLevel)) infTryOpen();
    }
  }
  let w = 0;
  for(const f of INF.fis){
    f.age += dt;
    if(f.done){ f.doneT += dt; if(f.doneT < 5000) INF.fis[w++] = f; continue; }
    INF.fis[w++] = f;
    if(f.warn > 0){ f.warn -= dt; continue; }
    if(calm) continue;
    // crece
    if(f.stage < 3){
      f.growT -= dt;
      if(f.growT <= 0){
        f.stage++; f.growT = INF_CFG.growEvery; infSyncStage(f);
        vfxShake(3); playSfx("infGrow");
        vfxBurst(f.x, f.y, 10, "ember", 120, 500, 3, 0, -60, 0);
        if(Math.hypot(player.x-f.x, player.y-f.y) < 700) floatText(f.x, f.y-50, f.stage===3 ? "¡La fisura se desborda!" : "La fisura crece", "crit");
      }
    }
    // escupe demonios propios (no durante jefes/subjefes)
    if(f.stage >= 2 && !bossActive && !activeChampion){
      f.spitT -= dt * (f.stage===3 ? 1.35 : 1);
      if(f.spitT <= 0){
        f.spitT = INF_CFG.spitEvery;
        if(enemies.filter(e=>e.alive).length < INF_CFG.spitCap) infSpawnFrom(f, 1);
      }
    }
    // erupción (etapa 3): telegrafiada
    if(f.stage === 3){
      f.eruptT -= dt;
      if(f.eruptT <= 0){
        f.eruptT = INF_CFG.eruptEvery[0] + Math.random()*(INF_CFG.eruptEvery[1]-INF_CFG.eruptEvery[0]);
        bossStrike(f.x, f.y, INF_CFG.radius[3]+46, 1300, _avgHeroMaxHp()*INF_CFG.eruptDmg, "fire", null);
        playSfx("infRumble");
      }
    }
  }
  INF.fis.length = w;
  infTut();
}
// Saca enemigos por la boca de la fisura (con estallido de brasas).
let _infForce = null;
function infSpawnFrom(f, n){
  const pool = spawnPoolFor(runLevel);
  for(let i=0;i<n;i++){
    _infForce = f;
    const e = spawnEnemy(pickFromPool(pool), false);
    _infForce = null;
    if(e) infPlaceAt(e, f);
  }
}
function infPlaceAt(e, f){
  const a = Math.random()*Math.PI*2, d = Math.random()*INF_CFG.radius[f.stage]*0.6;
  e.x = f.x + Math.cos(a)*d; e.y = f.y + Math.sin(a)*d*0.7;
  clampToArena(e);
  vfxBurst(e.x, e.y-8, 8, "ember", 110, 420, 3, 0, -80, 0);
}
function infPlaceSpawn(e, atBoss, champion){
  if(champion || atBoss || e.rank==="jefe" || e.rank==="subjefe" || _infForce) return;
  let best = null, st = 0;
  for(const f of INF.fis){ if(!f.done && f.warn <= 0 && f.stage > st){ st = f.stage; best = f; } }
  if(!best || Math.random() > INF_CFG.spawnShare[st]) return;
  // elige una fisura abierta al azar (más peso a las grandes)
  let tot = 0; for(const f of INF.fis) if(!f.done && f.warn <= 0) tot += f.stage;
  let r = Math.random()*tot;
  for(const f of INF.fis){ if(f.done || f.warn > 0) continue; r -= f.stage; if(r <= 0){ best = f; break; } }
  infPlaceAt(e, best);
}
function infGuestUpdate(dt){
  for(const f of INF.fis){ f.age += dt; if(f.done) f.doneT += dt; }
  infTut();
}
// Consejo del Hechicero (cada cliente: anfitrión e invitados).
function infTut(){
  if(!player || !player.alive) return;
  for(const f of INF.fis){
    if(f.done || f.warn > 0 || Math.hypot(player.x-f.x, player.y-f.y) > 650) continue;
    tutSay("fissure", "La tierra se abre donde el mundo es fino. De esas grietas sale la horda… y se pueden coser.", "Mantené ✖ junto a la fisura para cerrarla (quema)", 12000);
    if(TUT.key==="fissure" && f.prog > 0 && f.by===heroes.indexOf(player)) tutDone("fissure");
    break;
  }
}
// ---- acción contextual: cerrar ----
function infCtxTargets(){
  const out = [];
  for(const f of INF.fis) if(!f.done && f.warn <= 0) out.push(f);
  return out;
}
CTX_KINDS.inf_fissure = {
  label:"Cerrar", icon:"✖", color:"#ff7a2a",
  onTick(f, users, dt){
    for(const h of users){
      damageHero(h, h.maxHp*INF_CFG.heatPct*dt/1000, {x:f.x, y:f.y});
      if(Math.random() < dt/220) vfxBurst(h.x, h.y-10, 1, "ember", 60, 300, 2.5, 0, -50, 0);
    }
    if(Math.random() < dt/300) vfxBurst(f.x, f.y, 2, "ember", 90, 380, 3, 0, -70, 0);
    if(!f.reacted && f.prog >= f.dur*INF_CFG.reactAt){
      f.reacted = true;
      playSfx("infRumble"); vfxShake(5);
      floatText(f.x, f.y-60, "¡La fisura reacciona!", "crit");
      infSpawnFrom(f, INF_CFG.reactSpawns + (f.stage===3 ? 1 : 0));
    }
  },
  onComplete(f, users){
    f.doneT = 0; f.sealedBy = "hero";
    playSfx("infSeal"); vfxShake(6);
    vfxBurst(f.x, f.y, 26, "ember", 220, 700, 3.5, 0, -40, 0);
    particles.push({x:f.x, y:f.y, life:600, ring:true, maxLife:600, maxR:INF_CFG.sealR, color:"#ffb060"});
    for(const e of enemies){
      if(!e.alive || e.rank==="jefe" || Math.hypot(e.x-f.x, e.y-f.y) > INF_CFG.sealR) continue;
      e.stunTimer = Math.max(e.stunTimer||0, e.rank==="subjefe" ? INF_CFG.sealStun*0.4 : INF_CFG.sealStun);
      const d = Math.hypot(e.x-f.x, e.y-f.y)||1; e.x += (e.x-f.x)/d*60; e.y += (e.y-f.y)/d*60; clampToArena(e);
    }
    dropPotion(f.x, f.y, "hp");
    const who = users[0];
    showBanner(who===player ? "¡Sellaste la fisura!" : `${heroLabel(who)} selló una fisura`);
    for(const h of users) if(h.stats) h.stats.fissures = (h.stats.fissures||0) + 1;
  },
  botWorth(h, f){
    if(bossActive && boss && boss.alive && Math.hypot(boss.x-f.x, boss.y-f.y) < 420) return 0;
    if(h.hp < h.maxHp*0.45) return 0;
    let near = 0; for(const e of enemies){ if(e.alive && Math.hypot(e.x-f.x, e.y-f.y) < 220) near++; }
    const tough = botRole(h)==="tanque" || botRole(h)==="soporte";
    if(near > (tough ? 6 : 3)) return 0;
    return f.stage + (tough ? 1 : 0) + (f.prog > 0 ? 2 : 0);
  }
};
// ---- red ----
function infNetState(){
  if(!INF.fis.length) return null;
  return {f:INF.fis.map(f=>[f.id, f.x|0, f.y|0, f.stage, Math.max(0, f.warn|0), f.prog|0, f.dur, f.done?1:0, f.seed, f.doneT|0, f.by])};
}
function infApplyNetState(s){
  const list = (s && s.f) || [];
  const old = {}; for(const f of INF.fis) old[f.id] = f;
  INF.fis = list.map(a=>{
    const f = old[a[0]] || {id:a[0], kind:"inf_fissure", age:0, h:70};
    f.x = a[1]; f.y = a[2]; f.stage = a[3]; f.warn = a[4]; f.prog = a[5]; f.dur = a[6]; f.done = !!a[7];
    f.seed = a[8]; f.doneT = a[9]; f.by = a[10];
    f.r = INF_CFG.radius[f.stage] + INF_CFG.useR;
    return f;
  });
}
// ---- dibujo (procedural: grieta + brillo de lava) ----
function _infRng(seed){ let s = seed|0 || 1; return ()=>{ s = (s*1103515245 + 12345) & 0x7fffffff; return s/0x7fffffff; }; }
function infCrackPath(f, scale){
  // 3-4 ramas quebradas que salen del centro (misma forma en todos los clientes: semilla)
  const rnd = _infRng(f.seed), out = [];
  const branches = 3 + ((f.seed>>3)&1);
  for(let b=0;b<branches;b++){
    const a0 = b/branches*Math.PI*2 + rnd()*0.8;
    const pts = [[0,0]]; let x = 0, y = 0, a = a0;
    const segs = 4;
    for(let i=0;i<segs;i++){
      a += (rnd()-0.5)*0.9;
      const L = (18 + rnd()*14)*scale;
      x += Math.cos(a)*L; y += Math.sin(a)*L*0.62;
      pts.push([Math.round(x/2)*2, Math.round(y/2)*2]);
    }
    out.push(pts);
  }
  return out;
}
function infDrawGround(now){
  for(const f of INF.fis){
    if(!inView(f.x, f.y, 160)) continue;
    const maxR = INF_CFG.radius[Math.max(1, f.stage)];
    let k = f.stage/3; // tamaño
    let heat = 1;
    if(f.warn > 0){ k = (1 - f.warn/INF_CFG.openWarn)*0.33; heat = 0.4; }
    if(f.done){ heat = Math.max(0, 1 - f.doneT/1200); }
    const scale = 0.55 + k*1.1;
    const paths = infCrackPath(f, scale);
    ctx.save();
    ctx.translate(Math.round(f.x), Math.round(f.y));
    // resplandor de lava debajo
    if(heat > 0){
      ctx.globalCompositeOperation = "lighter";
      const pulse = 0.75 + 0.25*Math.sin(now*4 + f.seed);
      const g = ctx.createRadialGradient(0, 0, 4, 0, 0, maxR*1.5);
      g.addColorStop(0, `rgba(255,180,70,${0.75*heat*pulse})`);
      g.addColorStop(0.5, `rgba(255,80,20,${0.4*heat*pulse})`);
      g.addColorStop(1, "rgba(120,10,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(0, 0, maxR*1.5, maxR*0.95, 0, 0, Math.PI*2); ctx.fill();
      ctx.globalCompositeOperation = "source-over";
    }
    // grieta: borde oscuro, núcleo naranja, centro amarillo (líneas enteras: se ve pixelado)
    ctx.lineCap = "square"; ctx.lineJoin = "miter";
    const layers = f.done
      ? [[8, `rgba(20,10,8,${0.85*Math.max(0.2, 1-f.doneT/5000)})`], [3, `rgba(90,40,20,${0.7*Math.max(0, 1-f.doneT/5000)})`]]
      : [[6+f.stage*2, "#1a0b07"], [3+f.stage, `rgba(255,90,20,${0.6+0.4*heat})`], [1+Math.floor(f.stage/2), `rgba(255,220,120,${heat})`]];
    for(const [lw, col] of layers){
      ctx.lineWidth = lw; ctx.strokeStyle = col;
      ctx.beginPath();
      for(const pts of paths){ ctx.moveTo(pts[0][0], pts[0][1]); for(let i=1;i<pts.length;i++) ctx.lineTo(pts[i][0], pts[i][1]); }
      ctx.stroke();
    }
    // boca central
    if(!f.done && f.warn <= 0){
      ctx.fillStyle = "#12070a";
      ctx.beginPath(); ctx.ellipse(0, 0, 8+f.stage*5, 4+f.stage*3, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = `rgba(255,120,40,${0.5+0.3*Math.sin(now*6+f.seed)})`;
      ctx.beginPath(); ctx.ellipse(0, 0, 4+f.stage*3, 2+f.stage*2, 0, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
    // brasas que suben (local, barato)
    if(!f.done && f.warn <= 0 && vfxLoad < 0.85 && Math.random() < 0.05*f.stage)
      particles.push({x:f.x+(Math.random()-0.5)*maxR, y:f.y+(Math.random()-0.5)*maxR*0.5, vx:(Math.random()-0.5)*10, vy:-30-Math.random()*30, life:700, color:Math.random()<0.5?"#ff8a3a":"#ffd070"});
  }
}
// ---- peligro para bots: no quedarse en la boca de una fisura grande ----
function infBotDanger(x, y, pad){
  for(const f of INF.fis){
    if(f.done || f.stage < 3) continue;
    const d = Math.hypot(x-f.x, y-f.y);
    if(d < INF_CFG.radius[3]*0.5 + pad) return {x:(x-f.x)/(d||1), y:(y-f.y)/(d||1)};
  }
  return null;
}

Object.assign(ARENA_SFX, {
  infCrack:  {p:3, gap:600, play:(t,D)=>{ _noise(t,0.5,0.3,"lowpass",300,0,D); for(let i=0;i<6;i++) _noise(t+0.05+i*0.05,0.04,0.18,"bandpass",900+i*200,4,D); _tone(t,"sine",70,40,0.5,0.35,D); return 0.55; }},
  infGrow:   {p:2, gap:500, play:(t,D)=>{ _noise(t,0.6,0.22,"lowpass",240,0,D); _tone(t,"sawtooth",55,42,0.5,0.08,D,0.05); return 0.6; }},
  infRumble: {p:3, gap:700, play:(t,D)=>{ _noise(t,0.9,0.3,"lowpass",180,0,D); _tone(t,"sine",48,32,0.9,0.4,D,0.05); return 0.9; }},
  infSeal:   {p:4, gap:400, play:(t,D)=>{ _tone(t,"sine",220,90,0.5,0.3,D); _noise(t,0.35,0.25,"bandpass",700,1,D); [392,523,659].forEach((f,i)=>_tone(t+0.12+i*0.06,"triangle",f,f,0.35,0.07,D,0.02)); return 0.7; }}
});

ARENA_EXT.infernal = {
  runStart: infRunStart,
  guestStart: infGuestStart,
  beginLevel: infBeginLevel,
  update: infUpdate,
  guestUpdate: infGuestUpdate,
  placeSpawn: infPlaceSpawn,
  ctxTargets: infCtxTargets,
  drawGround: infDrawGround,
  botDanger: infBotDanger,
  netState: infNetState,
  applyNetState: infApplyNetState
};
