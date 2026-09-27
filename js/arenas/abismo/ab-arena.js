"use strict";
/* ============================================================
   js/arenas/abismo/ab-arena.js
   Registro de la ARENA DEL ABISMO en ARENA_DEFS (los ganchos que llama el motor) + arte real de
   los enemigos (atlas recortados de las hojas oficiales: tools/art/abismo/extract.py), guías de
   jefe, sonidos, bots y estado de red.
   Datos: ab-data.js · Mapa/estados/caída: ab-map.js · Enemigos: ab-enemies.js
   Jefes y presencia: ab-bosses.js · Dibujo: ab-render.js · Daño estructural de habilidades:
   js/systems/terrain-tags.js (etiqueta "terrain").
   ============================================================ */
Object.assign(ANIM_PROFILES, {
  ab_errante:{speed:0.9, weight:1.3, lunge:12, impact:1.4, material:"arcane", death:"frames"},
  ab_acechador:{speed:1.5, weight:0.6, lunge:16, material:"arcane", death:"frames"},
  ab_heraldo:{speed:0.8, basic:"cast", cast:1.3, material:"arcane", death:"frames"},
  ab_devorador:{speed:0.5, weight:2.6, amp:0.6, lunge:10, impact:2.2, material:"rock", death:"frames"},
  ab_tejedor:{speed:1.1, weight:0.8, lunge:10, material:"arcane", death:"frames"},
  ab_jinete:{speed:1.2, weight:2.0, lunge:18, impact:1.8, material:"arcane", death:"frames"},
  ab_carcelero:{speed:0.5, weight:3.0, amp:0.4, lunge:8, impact:2.6, material:"rock", death:"frames"},
  ab_morador:{speed:0.3, weight:3.0, amp:0.1, lunge:0, material:"arcane", death:"dissolve"},
  ab_tentaculo:{speed:0.4, weight:3.0, amp:0.2, lunge:0, material:"arcane", death:"dissolve"}
});

/* ---------------- atlas reales ----------------
   hMul = alto dibujado / radio. Escala respecto de un guardia (x1.0 ≈ 65 u):
   Errante 1.1 · Acechador 0.85 (va agazapado) · Heraldo 1.2 · Devorador 1.8 · Tejedor 1.0 (araña,
   ancho) · Jinete 1.7 · Carcelero 3.2 (gigante encadenado). El Que Mora Debajo: por partes. */
const AB_HMUL = {ab_errante:3.25, ab_acechador:2.75, ab_heraldo:3.5, ab_devorador:3.1, ab_tejedor:2.7, ab_jinete:3.25, ab_carcelero:3.35};
if(typeof ABISMO_ATLAS!=="undefined") for(const k in ABISMO_ATLAS){
  enemyAtlasPackLoad(k, ABISMO_ATLAS[k].src, ABISMO_ATLAS[k].meta);
  ENEMY_ATLAS_PACK[k].hMul = AB_HMUL[k] || 3;
}
// efectos de la hoja (bossSheetFx / vfxSprite: viajan por red como cualquier efecto)
if(typeof ABISMO_FX!=="undefined") for(const k in ABISMO_FX){
  const F = ABISMO_FX[k], imgs = F.srcs.map(src=>{ const im = new Image(); im.src = src; return im; });
  VFX_SPR_EXTRA[k] = {imgs, ready:()=>imgs.every(im=>im.complete && im.naturalWidth > 0), ground:!!F.ground};
}

/* ---------------- guías de jefe (boss-hud.js) ---------------- */
ARENA_BOSS_TIPS.ab_carcelero = {epithet:"Sus cadenas mantienen unidas las ruinas", phases:[{hp:1},{hp:0.66},{hp:0.33}], tips:[
  "Golpe de Cadena y Barrido: líneas y círculos rojos. El barrido empuja a todos… también a la horda.",
  "GANCHO: si te engancha te arrastra al borde. Usá una habilidad para soltarte, o que tus compañeros le peguen fuerte.",
  "Al 66% y al 33% rompe una cadena: parte de las ruinas se suelta. Quedate sobre piedra firme."]};
ARENA_BOSS_TIPS.ab_morador = {epithet:"Todo este tiempo estuvo debajo", phases:[{hp:1},{hp:0.66},{hp:0.33}], tips:[
  "El ojo asoma por el borde del pozo: ahí se le pega. Romper un TENTÁCULO le saca vida y le abre el ojo.",
  "Fase 2: el piso cambia de forma (centro, costados, cruz, anillo). Siempre queda piso conectado y vuelve a subir.",
  "Fase 3: la MANDÍBULA succiona hacia el pozo. Cuando avisa, alejate del centro."]};

/* ---------------- sonidos (sintetizados; se pueden reemplazar por grabaciones) ---------------- */
function _absx(p, gap, play){ return {p, gap, play}; }
Object.assign(ARENA_SFX, {
  abCrack:     _absx(2, 160, (t,D)=>{ for(let i=0;i<4;i++) _noise(t+i*0.03,0.05,0.22,"bandpass",600+i*150,3,D); return 0.2; }),
  abCrackBig:  _absx(3, 300, (t,D)=>{ for(let i=0;i<7;i++) _noise(t+i*0.04,0.06,0.28,"bandpass",420+i*110,3,D); _tone(t,"sine",70,34,0.5,0.35,D); return 0.5; }),
  abRumble:    _absx(4, 900, (t,D)=>{ _noise(t,1.6,0.34,"lowpass",130,0,D); _tone(t,"sine",36,28,1.6,0.35,D,0.3); _duck(0.55,1200); return 1.6; }),
  abCollapse:  _absx(5, 700, (t,D)=>{ _noise(t,1.8,0.5,"lowpass",320,0,D); _tone(t,"sine",52,20,1.8,0.6,D,0.05); for(let i=0;i<9;i++) _noise(t+i*0.12,0.05,0.16,"bandpass",500+i*40,4,D); _duck(0.3,1600); return 1.8; }),
  abRebuild:   _absx(3, 600, (t,D)=>{ [196,247,294,370].forEach((f,i)=>_tone(t+i*0.09,"sine",f,f*1.02,0.9,0.05,D,0.1)); _noise(t,0.9,0.1,"bandpass",900,1,D); return 1.0; }),
  abFallEnemy: _absx(2, 180, (t,D)=>{ _tone(t,"sawtooth",420,90,0.7,0.07,D,0.02); _noise(t,0.6,0.1,"bandpass",700,1,D); return 0.7; }),
  abHang:      _absx(4, 600, (t,D)=>{ _noise(t,0.2,0.3,"bandpass",500,2,D); _tone(t,"triangle",330,250,0.35,0.12,D); return 0.35; }),
  abFallHero:  _absx(5, 1200,(t,D)=>{ _tone(t,"sine",300,50,1.6,0.25,D,0.02); _noise(t,1.4,0.12,"bandpass",600,0.6,D); return 1.6; }),
  abRescue:    _absx(4, 500, (t,D)=>{ [392,494,587].forEach((f,i)=>_tone(t+i*0.07,"triangle",f,f,0.35,0.09,D,0.02)); return 0.5; }),
  abHeavy:     _absx(3, 160, (t,D)=>{ _tone(t,"sine",110,40,0.3,0.55,D); _noise(t,0.2,0.3,"lowpass",800,0,D); return 0.3; }),
  abHiss:      _absx(2, 300, (t,D)=>{ _noise(t,0.5,0.2,"highpass",3000,0,D); _tone(t,"sawtooth",200,320,0.4,0.035,D,0.1); return 0.5; }),
  abLeap:      _absx(2, 150, (t,D)=>{ _noise(t,0.18,0.24,"bandpass",1000,1,D); return 0.2; }),
  abOrb:       _absx(2, 250, (t,D)=>{ _tone(t,"sine",180,360,0.5,0.1,D,0.1); _noise(t,0.4,0.06,"bandpass",1800,3,D); return 0.5; }),
  abGrav:      _absx(3, 350, (t,D)=>{ _tone(t,"sine",90,50,1.2,0.25,D,0.2); _tone(t,"sine",180,90,1.2,0.08,D,0.2); return 1.2; }),
  abStomp:     _absx(3, 160, (t,D)=>{ _tone(t,"sine",80,30,0.4,0.65,D); _noise(t,0.3,0.4,"lowpass",600,0,D); return 0.4; }),
  abWeave:     _absx(2, 300, (t,D)=>{ for(let i=0;i<6;i++) _noise(t+i*0.05,0.05,0.12,"bandpass",2200+i*200,5,D); return 0.35; }),
  abHorse:     _absx(3, 600, (t,D)=>{ _tone(t,"sawtooth",260,420,0.3,0.08,D,0.05); _tone(t+0.25,"sawtooth",420,240,0.5,0.07,D); _noise(t,0.7,0.1,"lowpass",400,0,D); return 0.8; }),
  abCharge:    _absx(3, 300, (t,D)=>{ for(let i=0;i<8;i++){ _tone(t+i*0.09,"sine",90,50,0.08,0.3,D); _noise(t+i*0.09,0.06,0.2,"lowpass",500,0,D); } return 0.8; }),
  abDeep:      _absx(4, 1500,(t,D)=>{ _tone(t,"sine",44,36,2.4,0.35,D,0.6); _tone(t,"sawtooth",66,58,2.2,0.05,D,0.8); _noise(t,2.2,0.12,"lowpass",110,0,D); return 2.4; }),
  abChainWarn: _absx(3, 300, (t,D)=>{ for(let i=0;i<6;i++) _noise(t+i*0.07,0.05,0.2,"bandpass",1500+i*90,6,D); return 0.45; }),
  abChain:     _absx(3, 200, (t,D)=>{ for(let i=0;i<4;i++) _noise(t+i*0.03,0.06,0.3,"bandpass",2000-i*250,5,D); _tone(t,"sine",90,40,0.3,0.4,D); return 0.3; }),
  abChainBreak:_absx(5, 900, (t,D)=>{ for(let i=0;i<10;i++) _noise(t+i*0.03,0.07,0.3,"bandpass",2400-i*120,6,D); _tone(t,"sine",60,26,1.2,0.6,D); _duck(0.3,1000); return 1.2; }),
  abRayWarn:   _absx(3, 500, (t,D)=>{ _tone(t,"sine",220,660,1.2,0.07,D,0.4); return 1.2; }),
  abRay:       _absx(4, 400, (t,D)=>{ _tone(t,"sawtooth",120,60,0.6,0.14,D); _noise(t,0.6,0.25,"bandpass",900,0.8,D); return 0.6; }),
  abJaw:       _absx(5, 900, (t,D)=>{ _tone(t,"sawtooth",50,80,1.4,0.16,D,0.2); _noise(t,1.4,0.35,"lowpass",250,0,D); _duck(0.35,1400); return 1.4; }),
  abWave:      _absx(4, 700, (t,D)=>{ _tone(t,"sine",70,30,1.5,0.5,D,0.05); _noise(t,1.2,0.2,"bandpass",400,0.6,D); return 1.5; }),
  abTentacle:  _absx(3, 400, (t,D)=>{ _noise(t,0.6,0.3,"lowpass",500,0,D); _tone(t,"sine",100,60,0.6,0.25,D,0.1); return 0.6; })
});

/* ---------------- ciclo de la partida ---------------- */
function abRunStart(){
  abS = abNewState();
  abRenderReset();
  _abNavSig = "";
  const S = AB_MAP.start;
  heroes.forEach((h, i)=>{ const a = (i/heroes.length)*Math.PI*2 + Math.PI/4; h.x = S.x + (i ? Math.cos(a)*70 : 0); h.y = S.y + (i ? Math.sin(a)*52 : 0); h.abHang = null; h.abHook = null; });
}
function abBeginLevel(){
  if(!abS) return;
  const lv = runLevel;
  abS.lv = lv;
  // entre niveles el Abismo reconstruye lo que se cayó y repara las grietas
  if(lv > 1){ abRebuildAll(45); playSfx("abRebuild"); runLater(500, ()=>{ if(state==="playing") showBanner("🕳 Las ruinas vuelven a subir desde el vacío"); }); }
  abS.zones.length = 0; abS.lines.length = 0; abS.charges.length = 0; abS.orbs.length = 0; abS.chains.length = 0; abS.wave = null;
  for(const h of heroes){ if(h.abHang) abRescue(h, null); h.abHook = null; }
  abS.tremorT = 14000 + Math.random()*6000;
  if(lv === 1){
    arenaTitleCard(campaignArenaKicker("abismo"), "EL ABISMO", "El punto de no retorno. Acá el piso también es parte del combate.", 5200);
    runLater(6000, ()=>abTutSay("ab_intro", "Estas ruinas flotan sobre el VACÍO. El piso se agrieta, avisa y se derrumba… y lo que esté arriba cae. Empujá a la horda por el borde.", 9000));
  }
  if(lv === 9 && abS.ca.st!=="dead") abS.ca = {st:"none", t:0, x:0, y:0};
  if(lv === LEVEL_COUNT) abMoradorLevelStart();
}
function abHoldLevel(){
  if(!abS) return false;
  if(runLevel === 9){
    if(abS.ca.st==="none") abCarceleroRise();
    return abS.ca.st!=="dead";
  }
  return false;
}
function abAgeList(list, dt){ for(let i=list.length-1;i>=0;i--){ const o = list[i]; o.t = (o.t||0) + dt; if(o.d && o.t >= o.d) list.splice(i, 1); } }
function abEnemyWorldUpdate(dt){
  for(const e of enemies){
    if(!e.alive || !e.type || e.type.indexOf("ab_")!==0) continue;
    if(e.packTimer > 0){ e.packTimer -= dt; if(e.packTimer <= 0) e.packSet = null; }
    if(e.abEmerge > 0) e.abEmerge -= dt;
    abShoveUpdate(e, dt);
  }
}
function abUpdate(dt){
  if(!abS) return;
  abPlatsUpdate(dt);
  for(const h of heroes){ if(h.alive){ abShoveUpdate(h, dt); abHookUpdate(h, dt); } else { h.abHook = null; } }
  abHangUpdate(dt);
  abOrbsUpdate(dt);
  abZonesUpdate(dt);
  abLinesUpdate(dt);
  abAgeList(abS.charges, dt);
  abAgeList(abS.chains, dt);
  abHintUpdate(dt);
  abTremorUpdate(dt);
  abCarceleroDirector(dt);
  abMoradorController(dt);
  abWaveUpdate(dt);
  abJawMarkPushed();
  abEnemyWorldUpdate(dt);
  abNavMaybe();
  for(const h of heroes){ if(h.alive && !h.duelActive && !h.isDuelLocked) abClamp(h); }
  abRenderTick(dt);
}
// Invitado: el estado real llega en cada snapshot; acá solo corren los relojes para animar.
function abGuestUpdate(dt){
  if(!abS) return;
  for(const S of abS.p){ if(S.st===AB_ST.FALLING || S.st===AB_ST.REBUILD) S.t += dt; }
  for(const L of [abS.zones, abS.lines, abS.charges, abS.hang]) for(const o of L) o.t = (o.t||0) + dt;
  for(const o of abS.orbs){ o.t += dt; o.x += o.vx*dt/1000; o.y += o.vy*dt/1000; }
  if(abS.wave) abS.wave.t += dt;
  abS.hint.a += dt; abS.ca.t += dt; abS.mo.t += dt;
  abRenderTick(dt);
}
function abNetState(){
  if(!abS) return null;
  const s = Object.assign({}, abS);
  delete s.dirty;
  return s;
}
function abApplyNetState(v){
  if(!v) return;
  if(!abS){ abS = abNewState(); abRenderReset(); }
  Object.assign(abS, v);
}
// Después de mover a todos: nadie queda en el aire (los empujados, al vacío). Tentáculos y jefe fijos.
function abAfterEnemies(){
  if(!abS) return;
  for(const e of enemies){
    if(!e.alive) continue;
    if(e.type==="ab_tentaculo"){ if(e._ax!==undefined){ e.x = e._ax; e.y = e._ay; } continue; }
    if(e.type==="ab_morador") continue;
    if(!e.isDuelLocked) abClamp(e);
  }
}

/* ---------------- a quién persiguen los enemigos ---------------- */
// Nadie remata a un colgado (el peligro es el reloj): van al héroe en pie más cercano.
function abEnemyTarget(e){
  let best = null, bd = Infinity;
  for(const h of heroes){ if(!h.alive || h.abHang) continue; const d = Math.hypot(h.x - e.x, h.y - e.y); if(d < bd){ bd = d; best = h; } }
  return best || nearestHeroTo(e.x, e.y);
}

/* ---------------- bots ---------------- */
// Peligros propios: el borde, las plataformas críticas o que se derrumban, la línea de carga del
// Jinete, las zonas gravitatorias, los filamentos y la mandíbula.
function abBotDanger(x, y, pad){
  if(!abS) return null;
  let vx = 0, vy = 0, hit = false;
  const push = (ax, ay, k)=>{ const d = Math.hypot(ax, ay) || 1; vx += ax/d*k; vy += ay/d*k; hit = true; };
  // borde: si el punto está cerca del vacío, volver hacia adentro
  // (más margen cuando hay algo que empuja: Carcelero, Jinete, Errantes con el golpe cargado)
  const risky = abS.ca.st==="fight" || abS.charges.length || enemies.some(e=>e.alive && e.abWind && Math.hypot(e.x - x, e.y - y) < 160);
  const nearRescue = abS.rescue.some(r=>Math.hypot(r.x - x, r.y - y) < r.r + 60);   // yendo a RESCATAR: el borde es el objetivo
  if(!nearRescue && !abWalkable(x, y, risky ? 36 : 20)){ const n = abNearestGround(x, y, risky ? 60 : 44); push(n.x - x, n.y - y, 1.2); }
  // plataforma que se va a caer (o crítica): salir hacia la piedra firme más cercana
  const i = abPlatAt(x, y, 0);
  if(i >= 0){
    const st = abS.p[i].st;
    if(st===AB_ST.FALLING || (st===AB_ST.CRITICAL && abS.mo.st!=="fight")){
      let best = null, bd = Infinity;
      for(let j=0;j<AB_PLATS.length;j++){
        if(j===i || abS.p[j].st > (st===AB_ST.FALLING ? AB_ST.CRITICAL : AB_ST.CRACKED)) continue;
        const q = abPlatProject(AB_PLATS[j], x, y, 30), d = Math.hypot(q.x - x, q.y - y);
        if(d < bd){ bd = d; best = q; }
      }
      if(best && bd < 700) push(best.x - x, best.y - y, st===AB_ST.FALLING ? 2.6 : 0.5);
    }
  }
  for(const c of abS.charges){ const q = _abSegDist(x, y, c.x0, c.y0, c.x1, c.y1); if(q.d < (c.w||46) + pad*0.5){ const L = Math.hypot(c.x1 - c.x0, c.y1 - c.y0)||1, nx = -(c.y1 - c.y0)/L, ny = (c.x1 - c.x0)/L, sg = ((x - c.x0)*nx + (y - c.y0)*ny) >= 0 ? 1 : -1; push(nx*sg, ny*sg, 1.6); } }
  for(const z of abS.zones){ const d = Math.hypot(x - z.x, y - z.y); if(d < z.r*1.35 + pad*0.4) push(x - z.x, y - z.y, z.k==="jaw" ? 1.8 : 0.9); }
  for(const l of abS.lines){ const q = _abSegDist(x, y, l.x0, l.y0, l.x1, l.y1); if(q.d < 26 + pad*0.3){ const px = l.x0 + (l.x1 - l.x0)*q.t, py = l.y0 + (l.y1 - l.y0)*q.t; push(x - px, y - py, 0.7); } }
  for(const o of abS.orbs){ const d = Math.hypot(x - o.tx, y - o.ty); if(d < AB_CFG.heraldo.zoneR + pad*0.4) push(x - o.tx, y - o.ty, 0.8); }
  return hit ? {x:vx, y:vy} : null;
}
// Prioridad: tentáculos (le sacan vida al jefe) > Tejedor y Heraldo (apoyo) > Jinete agotado.
function abBotTarget(h, range){
  if(!abS) return null;
  let best = null, bs = -Infinity;
  for(const e of enemies){
    if(!e.alive) continue;
    const d = Math.hypot(e.x - h.x, e.y - h.y); if(d > range) continue;
    let s = -Infinity;
    if(e.type==="ab_tentaculo" && !(e.abRise > 0)) s = 540 - d*0.4;
    else if(e.type==="ab_tejedor") s = 480 - d*0.45;
    else if(e.type==="ab_heraldo") s = 460 - d*0.45;
    else if(e.type==="ab_jinete" && e.jn && e.jn.st==="rec") s = 500 - d*0.4;
    if(s > bs){ bs = s; best = e; }
  }
  return best;
}
// RESCATAR va antes que revivir o pelear: los dos héroes en pie más cercanos a cada colgado van a subirlo.
function abBotNudge(h, target){
  if(!abS || h.abHang || !h.alive) return null;
  // 1) su piso se derrumba: salir YA hacia la piedra firme más cercana (no depende del esquive)
  const pi = abPlatAt(h.x, h.y, 0);
  if(pi >= 0 && abS.p[pi].st===AB_ST.FALLING){
    let best = null, bd = Infinity;
    for(let j=0;j<AB_PLATS.length;j++){
      if(j===pi || abS.p[j].st > AB_ST.CRITICAL) continue;
      const q = abPlatProject(AB_PLATS[j], h.x, h.y, 34), d = Math.hypot(q.x - h.x, q.y - h.y);
      if(d < bd){ bd = d; best = q; }
    }
    if(best){ const d = bd || 1; return {mx:(best.x - h.x)/d, my:(best.y - h.y)/d, target, dodging:true}; }
  }
  const goal = abRescueGoalFor(h);
  if(!goal) return null;
  const gd = Math.hypot(h.x - goal.x, h.y - goal.y);
  h._ctxGoal = goal.id;
  if(gd > goal.r*0.6){
    if(h._ctxHold===goal.id && gd < goal.r - 4) return {mx:0, my:0, target, usingCtx:true};
    h._ctxHold = null;
    const dir = abPathDir(h, goal);
    return {mx:dir.x, my:dir.y, target, navd:true};
  }
  if(ctxCanUse(h, goal)) h._ctxHold = goal.id;
  return {mx:0, my:0, target, usingCtx:true};
}
// ¿A quién tiene que ir a rescatar este héroe? (es de los dos en pie más cercanos a un colgado)
function abRescueGoalFor(h){
  if(!abS || !abS.rescue.length || h.abHang || !h.alive) return null;
  let goal = null, gd = Infinity;
  for(const r of abS.rescue){
    if(r.done || heroes[r.h]===h) continue;
    const d = Math.hypot(h.x - r.x, h.y - r.y);
    let closer = 0;
    for(const o of heroes){ if(o!==h && o.alive && !o.abHang && heroes[r.h]!==o && Math.hypot(o.x - r.x, o.y - r.y) < d) closer++; }
    if(closer < 2 && d < gd && d < 1100){ gd = d; goal = r; }
  }
  return goal;
}
// Camino por el grafo de plataformas (las que siguen en pie): hacia el punto de la próxima plataforma.
function abPathDir(h, goal){
  let ia = abPlatAt(h.x, h.y, 0), ib = abPlatAt(goal.x, goal.y, 0);
  if(ia < 0) ia = abNearestGround(h.x, h.y, 0).i;
  if(ib < 0) ib = abNearestGround(goal.x, goal.y, 0).i;
  let tx = goal.x, ty = goal.y;
  if(ia >= 0 && ib >= 0 && ia !== ib){
    const prev = new Int16Array(AB_PLATS.length).fill(-1), q = [ia]; prev[ia] = ia;
    while(q.length){ const k = q.shift(); if(k===ib) break; for(const j of AB_PLATS[k].nb){ if(prev[j] < 0 && abSolidAfter(j)){ prev[j] = k; q.push(j); } } }
    if(prev[ib] >= 0){
      let step = ib; while(prev[step] !== ia) step = prev[step];
      const w = abPlatProject(AB_PLATS[step], h.x, h.y, 34); tx = w.x; ty = w.y;
    }
  }
  const d = Math.hypot(tx - h.x, ty - h.y) || 1;
  return {x:(tx - h.x)/d, y:(ty - h.y)/d};
}
function abBotUrgent(h){
  if(!abS || h.hp <= h.maxHp*0.3 || !abRescueGoalFor(h)) return false;
  const i = abPlatAt(h.x, h.y, 0);
  return !(i >= 0 && abS.p[i].st===AB_ST.FALLING);    // si su propio piso se cae, primero salvarse
}
function abHeroReachable(h, t){ if(!abS || !t) return true; return abReachable(h, t); }
function abBotRegroup(h, p){ const n = abNearestGround(p.x, p.y, 30); return {x:n.x, y:n.y}; }

ARENA_DEFS.abismo = {
  key:"abismo",
  subBossLevels:[],                       // el Carcelero lo maneja abCarceleroDirector
  navBounds:AB_MAP.navBounds,
  runStart:abRunStart,
  guestStart:()=>{ abS = null; abRenderReset(); arenaTitleCardHide(); },
  beginLevel:abBeginLevel,
  update:abUpdate,
  guestUpdate:abGuestUpdate,
  clamp:abClamp,
  inside:(x, y, m)=>abInside(x, y, m||0),
  navBlocked:abNavBlocked,
  spawnPool:abSpawnPool,
  spawnIntervalMult:abSpawnIntervalMult,
  placeSpawn:(e, atBoss)=>abPlaceSpawn(e, atBoss),
  holdLevel:abHoldLevel,
  enemyAI:Object.assign({ab_carcelero:abAICarcelero, ab_morador:abAIMorador, ab_tentaculo:abAITentaculo}, AB_ENEMY_AI),
  enemyKilled:abEnemyKilled,
  afterEnemies:abAfterEnemies,
  bossDefeated:abBossDefeated,
  enemyTarget:abEnemyTarget,
  botDanger:abBotDanger,
  botTarget:abBotTarget,
  botNudge:abBotNudge,
  botUrgent:abBotUrgent,
  heroReachable:abHeroReachable,
  botRegroup:abBotRegroup,
  ctxTargets:()=>abS ? abS.rescue : null,
  buildDecor:()=>{ lavaPools = []; floorDecor = []; braziers = []; wallBlocks = []; deadTrees = []; smokePuffs = [];
    labyrinthWalls = []; aidProps = []; aidDecals = []; aidSolids = []; aidLights = []; aidKelp = []; aidOuterBlobs = []; aidLavaLayer = null; },
  drawWorld:abDrawWorld,
  pushTall:abPushTall,
  drawTall:abDrawTall,
  drawTop:abDrawTop,
  drawScreen:abDrawScreen,
  drawEnemyBody:abDrawEnemyBody,
  netState:abNetState,
  applyNetState:abApplyNetState
};
// daño estructural de las habilidades (metadata por tipo en SKILL_TERRAIN)
if(typeof envOn==="function") envOn("terrain", "abismo", (x, y, src, o)=>{ if(abS && !(typeof netIsGuest==="function" && netIsGuest())) abDamageArea(x, y, o.r||120, (o.dmg||20)*AB_CFG.terrain.heroMult, {heroSafe:true}); });
// internos del anfitrión que no hace falta mandar por red
window.addEventListener("load", ()=>{ if(typeof NET_SKIP_KEYS==="undefined") return; for(const k of ["_abKb","_abKbT","_kbAt","_kbBy","_abLineAt","_abSafeX","_abSafeY","_lastAimPt","ac","jn","abAct","_ax","_ay"]) NET_SKIP_KEYS.add(k); });
