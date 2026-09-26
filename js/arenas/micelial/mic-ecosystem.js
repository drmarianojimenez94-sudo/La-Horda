"use strict";
/* ============================================================
   js/arenas/micelial/mic-ecosystem.js
   El ecosistema vivo del Reino Micelial:
   - FUNGAL_NODE: ~54 hongos del escenario con estados SEED/SPROUT/GROWN/MATURE/SPORE_RELEASE/
     WITHERED/DEAD (+EMPTY). Sin IA: un número por nodo que el anfitrión avanza con un reloj
     barato (una pasada cada 450 ms, no por cuadro) y viaja como UNA cadena de texto.
   - NÚCLEOS MICELIALES (enemigos-estructura, nivel 3+): 4 etapas — expanden micelio, después
     ralentizan, después maduran hongos y aceleran a la colonia, y al final generan enemigos y
     estallidos de esporas. Se destruyen; al morir la infección se retira. La infección afecta
     la MOVILIDAD, la APARICIÓN y el TERRITORIO: nunca es daño constante.
   - Nubes de esporas (Infectado al morir, pared, Madre): zonas que ralentizan (daño mínimo).
   ============================================================ */

/* ---------------- FUNGAL_NODE ---------------- */
// Lugares fijos (misma semilla en todos los clientes): solo viaja el estado.
let MIC_NODES = [];
let _micNodeT = [];      // reloj de cada nodo (solo anfitrión)
let _micNodeCycles = []; // cuántas veces liberó esporas antes de marchitarse
let _micEcoAcc = 0;
function _micSeeded(seed){ let s = seed>>>0; return ()=>{ s = (s + 0x6D2B79F5)>>>0; let t = s; t = Math.imul(t ^ (t>>>15), t | 1); t ^= t + Math.imul(t ^ (t>>>7), t | 61); return ((t ^ (t>>>14))>>>0)/4294967296; }; }
function micBuildNodes(){
  const R = _micSeeded(7331), out = [], E = MIC_MAP.ell, N = MIC_CFG.eco.slots;
  const kinds = [["sprig",4],["bush",4],["lamp",3],["row",2],["cyan",3],["grove",1.4],["pillar",0.8]];
  const tot = kinds.reduce((a,k)=>a+k[1], 0);
  let guard = 0;
  while(out.length < N && guard++ < 6000){
    const a = R()*Math.PI*2, n = 0.22 + Math.sqrt(R())*0.74;
    const k = micEdgeK(a), x = E.cx + Math.cos(a)*E.rx*k*n, y = E.cy + Math.sin(a)*E.ry*k*n;
    if(Math.hypot(x - MIC_MAP.pod.x, y - MIC_MAP.pod.y) < 270) continue;
    if(Math.hypot(x - MIC_MAP.start.x, y - MIC_MAP.start.y) < 130) continue;
    let ok = true; for(const o of out){ if(Math.hypot(o.x-x, o.y-y) < 92){ ok = false; break; } }
    if(!ok) continue;
    let r = R()*tot, kind = "sprig"; for(const kk of kinds){ r -= kk[1]; if(r <= 0){ kind = kk[0]; break; } }
    if((kind==="pillar" || kind==="grove") && n < 0.62) kind = "lamp"; // lo grande, contra las paredes
    out.push({x, y, kind, flip:R() < 0.5, s:0.85 + R()*0.3, ph:R()*6.28});
  }
  MIC_NODES = out;
}
function micEcoReset(){
  if(!MIC_NODES.length) micBuildNodes();
  const n = MIC_NODES.length;
  _micNodeT = new Array(n).fill(0); _micNodeCycles = new Array(n).fill(0);
  let s = "";
  // Germinación: el Reino arranca lleno de semillas y brotes (todavía nada maduro)
  for(let i=0;i<n;i++){
    const r = Math.random();
    const st = r < 0.18 ? FN.SEED : (r < 0.3 ? FN.SPROUT : (r < 0.34 ? FN.GROWN : FN.EMPTY));
    s += st; _micNodeT[i] = micRand(500, 5000);
  }
  if(micS) micS.nodes = s;
  _micEcoAcc = 0;
}
function micNodeState(i){ return micS && micS.nodes ? (micS.nodes.charCodeAt(i) - 48) : FN.EMPTY; }
function _micSetNodes(arr){ micS.nodes = arr.join(""); }
function _micNodeTime(st){ const T = FN_TIMES[st]; const sp = [1, 0.85, 0.75, 0.65, 0.6, 1][micS.stage] || 1; return micRand(T[0], T[1])*sp; }
function micEcoUpdate(dt){
  if(!micS || !MIC_NODES.length) return;
  _micEcoAcc += dt;
  if(_micEcoAcc < MIC_CFG.eco.tickMs) return;
  const step = _micEcoAcc; _micEcoAcc = 0;
  const arr = micS.nodes.split("").map(c=>c.charCodeAt(0)-48);
  if(micS.dead){ // Reino muerto: todo lo vivo se marchita y queda muerto (sin volver a crecer)
    for(let i=0;i<arr.length;i++){ if(arr[i] <= FN.SPORE && Math.random() < 0.25) arr[i] = FN.WITHERED; else if(arr[i]===FN.WITHERED && Math.random() < 0.12) arr[i] = FN.DEAD; }
    _micSetNodes(arr); return;
  }
  const bloom = micS.mo.bloom && micS.mo.st==="fight";
  let alive = 0; for(const v of arr) if(v <= FN.SPORE) alive++;
  const want = Math.round(MIC_CFG.eco.alive[micS.stage]*arr.length);
  for(let i=0;i<arr.length;i++){
    let v = arr[i];
    _micNodeT[i] -= step;
    if(bloom && v >= FN.SPROUT && v <= FN.GROWN){ arr[i] = FN.MATURE; continue; } // Floración: todo lo vivo florece
    if(_micNodeT[i] > 0) continue;
    if(v===FN.SEED) v = FN.SPROUT;
    else if(v===FN.SPROUT) v = FN.GROWN;
    else if(v===FN.GROWN) v = FN.MATURE;
    else if(v===FN.MATURE){
      // demasiados vivos: los viejos se marchitan antes; si no, liberan esporas 1-2 veces
      if(alive > want + 3 || _micNodeCycles[i] >= 2) { v = FN.WITHERED; alive--; }
      else { v = FN.SPORE; _micNodeCycles[i]++; }
    }
    else if(v===FN.SPORE) v = FN.MATURE;
    else if(v===FN.WITHERED) v = FN.DEAD;
    else if(v===FN.DEAD) v = FN.EMPTY;
    else if(v===FN.EMPTY){
      if(alive < want && micS.stage < MIC_STAGE.MUERTA){ v = FN.SEED; alive++; _micNodeCycles[i] = 0; }
    }
    arr[i] = v;
    _micNodeT[i] = _micNodeTime(v);
  }
  _micSetNodes(arr);
}
// Brota/madura a la fuerza los nodos cerca de un punto (Chamán, Micelio absorbido, hongo gigante).
function micEcoBloomAt(x, y, r, toState){
  if(!micS || !micS.nodes) return;
  const arr = micS.nodes.split("").map(c=>c.charCodeAt(0)-48);
  for(let i=0;i<MIC_NODES.length;i++){
    const n = MIC_NODES[i];
    if(Math.hypot(n.x-x, n.y-y) > r) continue;
    if(arr[i] >= FN.WITHERED || arr[i] < toState){ arr[i] = toState; _micNodeT[i] = _micNodeTime(toState); _micNodeCycles[i] = 0; }
  }
  _micSetNodes(arr);
}

/* ---------------- Núcleos Miceliales ---------------- */
function micRuleMult(){ return 1 + 0.06*(typeof arenaRuleStacks==="function" ? arenaRuleStacks() : Math.max(0, runLevel-1)); }
function micNucleos(){ return enemies.filter(e=>e.alive && e.type==="nucleo_micelial"); }
function micInfectionLevel(){ let s = 0; for(const e of enemies){ if(e.alive && e.type==="nucleo_micelial" && e.nuc) s += e.nuc.st; } return s; }
function micNucleoRadius(e){ return e.nuc ? (e.nuc.rr||0) : 0; }
function micInitNucleo(e, st){
  e.structure = true; e.micStatic = true; e._ax = e.x; e._ay = e.y;
  e.nuc = {st:st||1, t:0, rr:MIC_CFG.nucleo.r[0]*0.4, sp:MIC_CFG.nucleo.lastStageSpawnMs*0.6, bt:4000};
  e.atkCd = 1e6; e.speed = 0; e.fx = 0; e.fy = 1;
}
function micSpawnNucleo(x, y, st){
  const e = micSpawnAt("nucleo_micelial", x, y);
  micInitNucleo(e, st);
  vfxBurst(x, y-10, 14, "micSpore", 120, 600, 3.5, 2, -50, 0);
  vfxSprite("mic_spore_puff", 0, x, y+8, 60, 700, null, 0.4, false, 0.8);
  playSfx("micGrow");
  if(!micS.nucShown){
    micS.nucShown = 1;
    showBanner("¡Un NÚCLEO MICELIAL germina! Destruilo antes de que madure");
  }
  return e;
}
function micNucleoDirector(dt){
  const C = MIC_CFG.nucleo;
  if(runLevel < C.fromLevel || levelClearing || bossActive || runEnding) return;
  if(runLevel === LEVEL_COUNT) return;              // el nivel 10 es de la Madre
  if(micS.mi.st==="build" || micS.mi.st==="fight") return; // el Micelio germina los suyos
  micS.nucT -= dt*micRuleMult();
  if(micS.nucT > 0) return;
  micS.nucT = micRand(C.everyMs[1], C.everyMs[0]) * (runLevel >= 7 ? 0.85 : 1);
  const maxA = C.maxAlive[Math.min(C.maxAlive.length-1, Math.max(0, micS.stage-1))];
  const cur = micNucleos();
  if(cur.length >= maxA) return;
  const h = micRandPick(micAliveHeroes()); if(!h) return;
  for(let t=0;t<16;t++){
    const p = micPointNear(h.x, h.y, 360, 680, 60);
    if(Math.hypot(p.x - MIC_MAP.pod.x, p.y - MIC_MAP.pod.y) < 300) continue;
    if(cur.some(o=>Math.hypot(o.x-p.x, o.y-p.y) < 300)) continue;
    micSpawnNucleo(p.x, p.y, 1);
    return;
  }
}
// IA del núcleo: crece por etapas; en la última genera colonia y estallidos de esporas.
function micAINucleo(e, dt){
  const C = MIC_CFG.nucleo, N = e.nuc;
  if(!N){ micInitNucleo(e, 1); return true; }
  e.atkCd = 1e6; e.x = e._ax; e.y = e._ay;
  const want = C.r[N.st-1];
  N.rr += (want - N.rr)*Math.min(1, dt/900);
  const grow = dt*micRuleMult()*(e._micBoost > 0 ? 2.2 : 1);
  if(e._micBoost > 0) e._micBoost -= dt;
  if(N.st < 4){
    N.t += grow;
    if(N.t >= C.stageMs){
      N.t = 0; N.st++;
      e.packSet = "grow"; e.packTimer = 600; e.packDur = 600;
      playSfx("micGrow");
      vfxBurst(e.x, e.y-20, 10 + N.st*3, "micSpore", 110, 650, 3.5, 1, -50, 0);
      if(N.st===3) micEcoBloomAt(e.x, e.y, C.r[2], FN.MATURE);
      if(N.st===4 && inView(e.x, e.y, 200)) floatText(e.x, e.y-70, "¡Núcleo maduro!", "crit");
    }
    return true;
  }
  // etapa 4: genera colonia (con tope global) y estallidos donde haya alguien parado
  N.sp -= dt;
  if(N.sp <= 0){
    N.sp = C.lastStageSpawnMs;
    const alive = enemies.filter(o=>o.alive && !o.structure).length;
    if(alive < C.spawnCap){
      const t = Math.random() < 0.6 ? "infectado" : "sabueso";
      const a = Math.random()*Math.PI*2;
      const s = micSpawnAt(t, e.x + Math.cos(a)*50, e.y + Math.sin(a)*40);
      s.stunTimer = 450;
      vfxBurst(s.x, s.y-10, 8, "micSpore", 90, 500, 3, 1, -40, 0);
    }
  }
  N.bt -= dt;
  if(N.bt <= 0){
    N.bt = 4200 + Math.random()*1600;
    const inside = heroes.filter(h=>h.alive && Math.hypot(h.x-e.x, h.y-e.y) < N.rr);
    if(inside.length){
      const h = micRandPick(inside);
      const avg = (runDifficulty && runDifficulty.avgHp) || 400;
      bossStrike(h.x, h.y, C.burstR, C.burstWarn, avg*C.burstPct*micRuleMult(), "root", {slow:0.3, slowDur:1200});
      runLater(C.burstWarn, ()=>{ vfxSprite("mic_spore_geyser", 0, h.x, h.y+10, 90, 650, null, 0.3, false, 0.9); playSfx("micSpore"); });
    }
  }
  return true;
}
function micNucleoKilled(e){
  e._micRecd = 1;
  micS.recede.push({x:e.x, y:e.y, r:micNucleoRadius(e), t:0});
  if(micS.recede.length > 8) micS.recede.shift();
  vfxBurst(e.x, e.y-20, 22, "micSpore", 170, 800, 4, 2, -60, 0);
  vfxSprite("mic_boom_med", 0, e.x, e.y+10, 90, 600, null, 0.3, false, 0.85);
  playSfx("micNucleoDie");
  if(inView(e.x, e.y, 100)) floatText(e.x, e.y-60, "Núcleo destruido", "heal");
  // los hongos que había madurado se marchitan con él
  const arr = micS.nodes.split("").map(c=>c.charCodeAt(0)-48);
  for(let i=0;i<MIC_NODES.length;i++){ const n = MIC_NODES[i]; if(arr[i] <= FN.SPORE && arr[i] >= FN.GROWN && Math.hypot(n.x-e.x, n.y-e.y) < micNucleoRadius(e)) { arr[i] = FN.WITHERED; _micNodeT[i] = _micNodeTime(FN.WITHERED); } }
  _micSetNodes(arr);
}

/* ---------------- infección y nubes: efectos sobre héroes y colonia ---------------- */
// Ralentización del territorio infectado (etapa 2+) y de las nubes. La colonia, en cambio, se
// mueve más rápido sobre su micelio (etapa 3+).
function micInfectionApply(dt){
  const C = MIC_CFG.nucleo, CL = MIC_CFG.cloud;
  const nucs = micNucleos();
  for(const h of heroes){
    if(!h.alive) continue;
    let slow = 0, dps = 0;
    for(const e of nucs){ const N = e.nuc; if(N && N.st >= 2 && Math.hypot(h.x-e.x, h.y-e.y) < N.rr) slow = Math.max(slow, C.slow[N.st-1]); }
    for(const c of micS.clouds){ if(c.t < c.d && Math.hypot(h.x-c.x, h.y-c.y) < c.r){ slow = Math.max(slow, c.s); dps = Math.max(dps, c.p); } }
    if(slow > 0){ h.slowAmt = Math.max(h.slowAmt||0, slow); h.slowTimer = Math.max(h.slowTimer||0, 220); }
    if(dps > 0) micTickDmg(h, h.maxHp*dps*dt/1000);
  }
  for(const e of enemies){
    if(!e.alive || e.structure) continue;
    let haste = 1;
    for(const n of nucs){ const N = n.nuc; if(N && N.st >= 3 && Math.hypot(e.x-n.x, e.y-n.y) < N.rr){ haste = 1 + C.enemyHaste; break; } }
    e._micHaste = haste;
  }
}
// Daño lento acumulado (nubes, territorio de la fase 3): se aplica en tandas de ~1,5% de la vida
// para no llenar la pantalla de números ni de sonidos de golpe.
function micTickDmg(h, amt){
  if(!h.alive || h.invulnTimer > 0) return;
  h._micDps = (h._micDps||0) + amt;
  const th = Math.max(2, h.maxHp*0.015);
  if(h._micDps >= th){ const d = h._micDps; h._micDps = 0; damageHero(h, d, null); }
}
function micAddCloud(x, y, kind){
  const C = MIC_CFG.cloud;
  if(micS.clouds.length >= C.max) micS.clouds.shift();
  const k = kind||"small";
  const c = k==="wall" ? {r:C.wallR, d:C.wallMs, s:C.wallSlow, p:C.wallDps} : (k==="big" ? {r:C.bigR, d:C.bigMs, s:C.bigSlow, p:C.bigDps} : {r:C.smallR, d:C.smallMs, s:C.smallSlow, p:C.smallDps});
  const o = {x:Math.round(x), y:Math.round(y), r:c.r, t:0, d:c.d, s:c.s, p:c.p, k};
  if(k==="wall"){ o.vx = -(x - MIC_MAP.ell.cx)*0.02; o.vy = -(y - MIC_MAP.ell.cy)*0.02; }
  micS.clouds.push(o);
  return o;
}
function micCloudsUpdate(dt, host){
  if(!micS.clouds.length) return;
  let w = 0;
  for(let i=0;i<micS.clouds.length;i++){
    const c = micS.clouds[i]; c.t += dt;
    if(c.vx){ c.x += c.vx*dt/1000; c.y += c.vy*dt/1000; }
    if(c.t < c.d) micS.clouds[w++] = c;
  }
  micS.clouds.length = w;
  if(host) for(const z of micS.recede) z.t += dt;
  if(host && micS.recede.length && micS.recede[0].t > MIC_CFG.nucleo.recedeMs) micS.recede.shift();
}
// Peligros propios para que los bots los esquiven: nubes, zonas de núcleo avanzadas, raíces
// gigantes activas y el territorio infectado de la fase 3 (ir hacia la zona segura).
function micBotDanger(x, y, pad){
  if(!micS) return null;
  let vx = 0, vy = 0, hit = false;
  for(const c of micS.clouds){ const dx = x-c.x, dy = y-c.y, d = Math.hypot(dx,dy)||1; if(d < c.r + pad*0.5){ hit = true; vx += dx/d*0.8; vy += dy/d*0.8; } }
  for(const e of enemies){
    if(!e.alive || e.type!=="nucleo_micelial" || !e.nuc || e.nuc.st < 3) continue;
    // un núcleo maduro se ataca desde el borde: salir de la zona solo si no es el blanco a destruir
    const dx = x-e.x, dy = y-e.y, d = Math.hypot(dx,dy)||1;
    if(d < e.nuc.rr*0.6 && d > 90){ hit = true; vx += dx/d*0.35; vy += dy/d*0.35; }
  }
  const M = micS.mo;
  if(M.st==="fight" && M.ph===3){
    const sf = micSafeK();
    if(micSafeNorm(x, y) > sf*0.92){ const S = MIC_CFG.madre, tx = 0 - x, ty = 260 - y, l = Math.hypot(tx, ty)||1; hit = true; vx += tx/l*1.4; vy += ty/l*1.4; }
  }
  return hit ? {x:vx, y:vy} : null;
}
