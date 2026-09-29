"use strict";
/* ============================================================
   js/arenas/ciudad/cm-arena.js
   Registro de la CIUDAD MALDITA en ARENA_DEFS (los ganchos que llama el motor) + arte real (atlas
   recortados de las hojas oficiales: tools/art/ciudad/extract.py), guías de jefe, sonidos, bots y red.
   Datos: cm-data.js · Mapa: cm-map.js · Civiles/estructuras: cm-civilians.js · Enemigos: cm-enemies.js
   Jefes: cm-bosses.js · Dibujo: cm-render.js
   ============================================================ */
Object.assign(ANIM_PROFILES, {
  cm_saqueador:{speed:1.1, weight:1.0, lunge:14, material:"flesh", death:"frames"},
  cm_perro:{speed:1.6, weight:0.6, lunge:16, material:"flesh", death:"frames"},
  cm_raptor:{speed:1.2, weight:1.0, lunge:10, material:"flesh", death:"frames"},
  cm_verdugo:{speed:0.5, weight:2.8, amp:0.5, lunge:10, impact:2.4, material:"flesh", death:"frames"},
  cm_planidera:{speed:0.8, basic:"cast", cast:1.3, material:"spirit", death:"frames"},
  cm_acechante:{speed:1.5, weight:0.7, lunge:16, material:"flesh", death:"frames"},
  cm_campanero:{speed:0.7, weight:2.0, lunge:8, impact:1.8, material:"flesh", death:"frames"},
  cm_sectario:{speed:1.1, weight:1.0, lunge:12, material:"flesh", death:"frames"},
  cm_espectro:{speed:0.9, weight:0.4, material:"spirit", death:"frames"},
  cm_maestro:{speed:0.8, basic:"cast", cast:1.2, material:"flesh", death:"frames"},
  cm_tramoyista:{speed:0.5, weight:3.0, amp:0.4, lunge:8, impact:2.6, material:"flesh", death:"frames"},
  cm_dama:{speed:0.7, basic:"cast", cast:1.3, material:"spirit", death:"frames"},
  cm_espejismo:{speed:0.7, material:"spirit", death:"dissolve"},
  cm_presentador:{speed:0.7, basic:"cast", cast:1.2, weight:2.0, material:"flesh", death:"frames"}
});

/* ---------------- atlas reales ----------------
   hMul = alto dibujado / radio. Escala respecto de un guardián (≈ 65 u): Saqueador 1.0 · Perro 0.7 ·
   Verdugo 1.6 · Campanero 1.35 · subjefes 1.8–2.0 · Presentador 2.1 → 3.0 (forma verdadera). */
// Tope de escala de píxel (Q6 del alfa, docs/alfa/q6_arte_tecnico.md): Verdugo, Campanero, Acechante y Perro bajan
// 2-10 % para no pasar de 3 píxeles de pantalla por píxel del arte en el celular (antes 3,1-3,4, más que un jefe).
const CM_HMUL = {cm_saqueador:3.1, cm_perro:2.25, cm_raptor:3.1, cm_verdugo:2.6, cm_planidera:3.2, cm_acechante:2.65, cm_campanero:2.6, cm_sectario:3.1, cm_espectro:3.2,
  cm_maestro:3.8, cm_tramoyista:2.7, cm_dama:3.7, cm_presentador:3.5, cm_presentador2:3.3, cm_presentador3:3.4, cm_aldeano:2.6, cm_mujer:2.6, cm_nino:2.2};
if(typeof CIUDAD_ATLAS!=="undefined") for(const k in CIUDAD_ATLAS){
  enemyAtlasPackLoad(k, CIUDAD_ATLAS[k].src, CIUDAD_ATLAS[k].meta);
  ENEMY_ATLAS_PACK[k].hMul = CM_HMUL[k] || 3;
}
if(typeof ENEMY_ATLAS_PACK!=="undefined" && ENEMY_ATLAS_PACK.cm_dama && !ENEMY_ATLAS_PACK.cm_espejismo) ENEMY_ATLAS_PACK.cm_espejismo = ENEMY_ATLAS_PACK.cm_dama;
if(typeof CIUDAD_FX!=="undefined") for(const k in CIUDAD_FX){
  const F = CIUDAD_FX[k], imgs = F.srcs.map(src=>{ const im = new Image(); im.src = src; return im; });
  VFX_SPR_EXTRA[k] = {imgs, ready:()=>imgs.every(im=>im.complete && im.naturalWidth > 0), ground:!!F.ground};
}

/* ---------------- guías de jefe (boss-hud.js) ---------------- */
ARENA_BOSS_TIPS.cm_maestro = {epithet:"Conduce la función", phases:[{hp:1}], tips:[
  "MARCA a un guardián: el círculo lo sigue y después estalla. Alejate de tus compañeros.",
  "Abre ZONAS rojas en el piso y se teletransporta si lo encerrás.",
  "Si el Tramoyista cae primero, el Maestro se enfurece (y al revés)."]};
ARENA_BOSS_TIPS.cm_tramoyista = {epithet:"Mueve el escenario", phases:[{hp:1}], tips:[
  "Deja caer DECORADO sobre las marcas del Maestro: salí del círculo naranja.",
  "Arma BARRICADAS de madera: duran poco, rodealas.",
  "Golpe en cono con aviso: nunca te quedes adelante de él."]};
ARENA_BOSS_TIPS.cm_dama = {epithet:"Nadie aplaude en la oscuridad", phases:[{hp:1}, {hp:0.3}], tips:[
  "Los TELONES caen en línea hacia un guardián: salí de la fila de círculos.",
  "Crea ESPEJISMOS: el verdadero tiene barra de vida y sombra.",
  "Invoca ECOS de la función anterior. Al 30% ESTALLA: alejate."]};
ARENA_BOSS_TIPS.cm_presentador = {epithet:"El dueño del espectáculo", phases:[{hp:1}, {hp:0.66}, {hp:0.33}], tips:[
  "Acto I: abanicos de proyectiles, REFLECTORES que estallan y telones en línea.",
  "Acto II: invoca ECOS de sus ayudantes (uno por vez). Los pilares del escenario te cubren.",
  "Acto III: cuando anuncie la OVACIÓN FINAL, CUBRITE detrás de un pilar. Quedar expuesto duele mucho."]};

/* ---------------- sonidos (sintetizados; se pueden reemplazar por grabaciones) ---------------- */
function _cmsx(p, gap, play){ return {p, gap, play}; }
Object.assign(ARENA_SFX, {
  cmFound:      _cmsx(3, 300, (t,D)=>{ [523,659].forEach((f,i)=>_tone(t+i*0.08,"triangle",f,f,0.25,0.07,D,0.02)); return 0.35; }),
  cmRescueStart:_cmsx(3, 300, (t,D)=>{ [392,523].forEach((f,i)=>_tone(t+i*0.07,"triangle",f,f,0.3,0.07,D,0.02)); return 0.35; }),
  cmRescue:     _cmsx(4, 250, (t,D)=>{ [523,659,784,1046].forEach((f,i)=>_tone(t+i*0.07,"triangle",f,f,0.4,0.08,D,0.02)); return 0.6; }),
  cmSob:        _cmsx(1, 2500,(t,D)=>{ _tone(t,"sine",520,380,0.35,0.03,D,0.05); _tone(t+0.4,"sine",500,360,0.3,0.025,D,0.05); return 0.8; }),
  cmCivHurt:    _cmsx(2, 200, (t,D)=>{ _tone(t,"sawtooth",620,420,0.18,0.05,D,0.01); return 0.2; }),
  cmCivDeath:   _cmsx(4, 600, (t,D)=>{ _tone(t,"sine",440,180,0.9,0.1,D,0.02); _tone(t+0.1,"sine",330,140,0.9,0.06,D,0.05); return 1.0; }),
  cmGrab:       _cmsx(4, 400, (t,D)=>{ _noise(t,0.2,0.25,"bandpass",900,2,D); _tone(t,"sawtooth",300,520,0.3,0.06,D); return 0.35; }),
  cmSlash:      _cmsx(2, 120, (t,D)=>{ _noise(t,0.12,0.25,"highpass",2400,0,D); return 0.15; }),
  cmSmash:      _cmsx(3, 160, (t,D)=>{ _tone(t,"sine",90,34,0.4,0.6,D); _noise(t,0.3,0.4,"lowpass",700,0,D); return 0.4; }),
  cmStructHit:  _cmsx(3, 400, (t,D)=>{ for(let i=0;i<3;i++) _noise(t+i*0.05,0.08,0.24,"bandpass",500+i*120,3,D); return 0.25; }),
  cmStructCrack:_cmsx(4, 500, (t,D)=>{ for(let i=0;i<6;i++) _noise(t+i*0.04,0.06,0.28,"bandpass",420+i*110,3,D); _tone(t,"sine",70,34,0.5,0.3,D); return 0.5; }),
  cmStructFall: _cmsx(5, 900, (t,D)=>{ _noise(t,1.8,0.5,"lowpass",320,0,D); _tone(t,"sine",52,20,1.8,0.6,D,0.05); _duck(0.35,1500); return 1.8; }),
  cmScream:     _cmsx(4, 600, (t,D)=>{ _tone(t,"sawtooth",880,1400,0.9,0.07,D,0.1); _tone(t,"sawtooth",660,1100,0.9,0.05,D,0.1); _noise(t,0.9,0.14,"highpass",2500,0,D); return 1.0; }),
  cmTear:       _cmsx(2, 200, (t,D)=>{ _tone(t,"sine",700,300,0.25,0.05,D,0.02); return 0.25; }),
  cmRoof:       _cmsx(3, 400, (t,D)=>{ _noise(t,0.3,0.18,"bandpass",1400,2,D); return 0.3; }),
  cmLand:       _cmsx(3, 200, (t,D)=>{ _tone(t,"sine",120,50,0.25,0.4,D); _noise(t,0.2,0.25,"lowpass",900,0,D); return 0.25; }),
  cmBell:       _cmsx(5, 900, (t,D)=>{ [220,330,440,554].forEach((f,i)=>_tone(t,"sine",f,f*0.99,2.4,0.12/(i+1),D,0.005)); _duck(0.5,1500); return 2.4; }),
  cmBellTick:   _cmsx(1, 500, (t,D)=>{ _tone(t,"sine",330,328,0.8,0.05,D,0.005); return 0.8; }),
  cmBellCut:    _cmsx(4, 400, (t,D)=>{ _tone(t,"sine",330,160,0.4,0.12,D,0.005); _noise(t,0.2,0.2,"bandpass",1800,3,D); return 0.4; }),
  cmBellHit:    _cmsx(3, 300, (t,D)=>{ _tone(t,"sine",250,248,0.9,0.14,D,0.005); _noise(t,0.1,0.3,"lowpass",900,0,D); return 0.9; }),
  cmFuse:       _cmsx(3, 400, (t,D)=>{ _noise(t,1.1,0.12,"highpass",3000,0,D); _tone(t,"square",200,600,1.1,0.03,D); return 1.1; }),
  cmBoom:       _cmsx(4, 200, (t,D)=>{ _noise(t,0.6,0.5,"lowpass",600,0,D); _tone(t,"sine",80,30,0.6,0.5,D); return 0.6; }),
  cmWhisper:    _cmsx(2, 700, (t,D)=>{ _noise(t,0.8,0.08,"bandpass",2200,6,D); _tone(t,"sine",300,260,0.8,0.02,D,0.2); return 0.8; }),
  cmCurtain:    _cmsx(4, 600, (t,D)=>{ _noise(t,1.2,0.22,"lowpass",400,0,D); _noise(t,1.2,0.08,"bandpass",1200,1,D); return 1.2; }),
  cmApplause:   _cmsx(4, 1500,(t,D)=>{ for(let i=0;i<28;i++) _noise(t+i*0.045+Math.random()*0.02,0.03,0.12,"bandpass",1600+Math.random()*1200,2,D); return 1.4; }),
  cmLaugh:      _cmsx(4, 900, (t,D)=>{ for(let i=0;i<5;i++) _tone(t+i*0.13,"sawtooth",180-i*6,150-i*6,0.1,0.07,D,0.01); return 0.7; }),
  cmBlackout:   _cmsx(5, 1500,(t,D)=>{ _tone(t,"sawtooth",220,40,1.2,0.12,D,0.02); _noise(t,0.1,0.35,"lowpass",300,0,D); _duck(0.3,2000); return 1.2; }),
  cmSpot:       _cmsx(3, 600, (t,D)=>{ _tone(t,"square",90,90,0.06,0.2,D,0); _noise(t,0.3,0.1,"highpass",4000,0,D); return 0.3; }),
  cmMark:       _cmsx(3, 400, (t,D)=>{ _tone(t,"sine",660,990,0.5,0.07,D,0.1); return 0.5; }),
  cmZone:       _cmsx(3, 400, (t,D)=>{ _tone(t,"sine",140,90,0.9,0.18,D,0.2); return 0.9; }),
  cmTeleport:   _cmsx(3, 300, (t,D)=>{ _tone(t,"sine",1200,200,0.3,0.08,D,0.01); return 0.3; }),
  cmBolt:       _cmsx(2, 200, (t,D)=>{ _tone(t,"sine",500,900,0.25,0.06,D,0.02); return 0.25; }),
  cmRope:       _cmsx(3, 500, (t,D)=>{ _noise(t,0.6,0.15,"bandpass",700,2,D); _tone(t,"triangle",140,90,0.6,0.08,D); return 0.6; }),
  cmThrow:      _cmsx(2, 200, (t,D)=>{ _noise(t,0.25,0.2,"bandpass",600,1,D); return 0.25; }),
  cmCrash:      _cmsx(3, 150, (t,D)=>{ _noise(t,0.5,0.4,"lowpass",900,0,D); for(let i=0;i<4;i++) _noise(t+i*0.05,0.05,0.2,"bandpass",1200+i*300,4,D); return 0.5; }),
  cmBlast:      _cmsx(4, 200, (t,D)=>{ _noise(t,0.7,0.45,"lowpass",700,0,D); _tone(t,"sine",90,30,0.7,0.45,D); return 0.7; }),
  cmMirror:     _cmsx(3, 500, (t,D)=>{ [880,1175,1397].forEach((f,i)=>_tone(t+i*0.05,"sine",f,f,0.5,0.04,D,0.05)); return 0.6; }),
  cmPillar:     _cmsx(4, 600, (t,D)=>{ _noise(t,1.0,0.3,"lowpass",250,0,D); _tone(t,"sine",60,90,1.0,0.3,D,0.1); return 1.0; }),
  cmTransform:  _cmsx(5, 2000,(t,D)=>{ _tone(t,"sawtooth",60,180,3.0,0.14,D,0.3); _noise(t,3.0,0.2,"bandpass",500,0.8,D); _duck(0.35,3000); return 3.0; })
});

/* ---------------- ciclo de la partida ---------------- */
function cmRunStart(){
  cmS = cmNewState();
  cmRenderReset(); _cmNavSig = ""; _cmRewarded = false; CM_TRAIL.clear(); CM_SAFE_FIELD = [];
  const S = CM_MAP.start;
  heroes.forEach((h, i)=>{ const a = (i/heroes.length)*Math.PI*2 - Math.PI/2; h.x = S.x + (i ? Math.cos(a)*70 : 0); h.y = S.y + (i ? Math.sin(a)*50 : 0); });
}
function cmBeginLevel(){
  if(!cmS) return;
  const lv = runLevel;
  cmS.lv = lv;
  cmS.shots.length = 0; cmS.zones.length = 0; cmS.drops.length = 0; cmS.bars.length = 0;
  for(const b of cmS.bells) { b.by = 0; b.t = 0; }
  cmSpawnCivilians(lv);
  if(lv === 1){
    arenaTitleCard(campaignArenaKicker("ciudad"), "CIUDAD MALDITA", "No podés salvarlos a todos. Pero vas a intentarlo.", 5200);
    runLater(6000, ()=>cmTutSay("cm_intro", "Todavía hay gente viva en la ciudad. Buscá en las casas: los escondidos se delatan con un «?» y sollozos.", 9000));
  }
  const hint = {2:"Los PERROS salen de las cloacas y van por los civiles que corren solos.", 4:"Un VERDUGO puede derribar un refugio. Las estructuras no se reparan.", 7:"Si un CAMPANERO toca una campana, llegan refuerzos. Cortalo."}[lv];
  if(hint) runLater(2600, ()=>{ if(state==="playing") showBanner(hint); });
  if(cmS.total > 0 && lv > 1 && lv < 9) runLater(1200, ()=>{ if(state==="playing") showBanner(`🧍 ${CM_CFG.civ.perLevel[lv - 1]||0} civiles escondidos en la ciudad`); });
  if(lv === 9 && cmS.sub.st!=="done") cmS.sub = {st:"none", t:0};
  if(lv === LEVEL_COUNT) cmPresLevelStart();
}
function cmHoldLevel(){ return !!(cmS && runLevel === 9 && cmS.sub.st!=="done"); }
function cmEnemyWorldUpdate(dt){
  for(const e of enemies){
    if(!e.alive || !e.type || e.type.indexOf("cm_")!==0) continue;
    if(e.packTimer > 0){ e.packTimer -= dt; if(e.packTimer <= 0) e.packSet = null; }
    cmId(e);
  }
}
function cmAgeTimers(dt){
  for(const A of cmS.alerts) A.t += dt;
  cmS.alerts = cmS.alerts.filter(A=>A.t < A.d + 200);
  for(const S of cmS.st) if(S.hit > 0) S.hit -= dt;
  for(const c of cmS.civ) if(c.warn > 0) c.warn -= dt;
}
function cmUpdate(dt){
  if(!cmS) return;
  cmNavMaybe();
  cmS.rule = arenaRuleStacks();
  cmCiviliansUpdate(dt);
  cmShotsUpdate(dt);
  cmZonesUpdate(dt);
  cmDropsUpdate(dt);
  cmAgeTimers(dt);
  cmSubDirector(dt);
  cmPresController(dt);
  cmEnemyWorldUpdate(dt);
  for(const h of heroes){ if(h.alive && !h.duelActive && !h.isDuelLocked) cmClamp(h); }
  cmRenderTick(dt);
}
// Invitado: el estado real llega en cada snapshot; acá solo corren los relojes para animar.
function cmGuestUpdate(dt){
  if(!cmS) return;
  for(const c of cmS.civ) c.t = (c.t||0) + dt;
  for(const L of [cmS.zones, cmS.drops, cmS.bars, cmS.pillars, cmS.alerts, cmS.spec||[]]) for(const o of L) o.t = (o.t||0) + dt;
  for(const s of cmS.shots){ s.t += dt; s.x += s.vx*dt/1000; s.y += s.vy*dt/1000; }
  cmS.sub.t += dt; cmS.pr.t += dt;
  for(const S of cmS.st) if(S.hit > 0) S.hit -= dt;
  cmRenderTick(dt);
}
function cmNetState(){
  if(!cmS) return null;
  const s = Object.assign({}, cmS);
  s.civ = cmS.civ.map(c=>{ const o = {}; for(const k in c) if(k[0]!=="_") o[k] = c[k]; return o; });
  return s;
}
function cmApplyNetState(v){
  if(!v) return;
  if(!cmS){ cmS = cmNewState(); cmRenderReset(); }
  Object.assign(cmS, v);
}
function cmAfterEnemies(){
  if(!cmS) return;
  for(const e of enemies){ if(!e.alive || e.cmRoof || e.isDuelLocked) continue; if(e.cmGhost){ const B = CM_BOUNDS; e.x = Math.max(B.x0 + 20, Math.min(B.x1 - 20, e.x)); e.y = Math.max(B.y0 + 20, Math.min(B.y1 - 20, e.y)); continue; } cmClamp(e); }
}

/* ---------------- bots ---------------- */
function cmBotDanger(x, y, pad){
  if(!cmS) return null;
  let vx = 0, vy = 0, hit = false;
  const push = (ax, ay, k)=>{ const d = Math.hypot(ax, ay) || 1; vx += ax/d*k; vy += ay/d*k; hit = true; };
  for(const D of cmS.drops){ const d = Math.hypot(x - D.x, y - D.y); if(d < D.r + pad*0.5) push(x - D.x, y - D.y, 1.4); }
  for(const Z of cmS.zones){ const d = Math.hypot(x - Z.x, y - Z.y); if(d < Z.r + pad*0.4) push(x - Z.x, y - Z.y, 0.9); }
  for(const e of enemies){
    if(!e.alive) continue;
    if(e.sp){ const d = Math.hypot(x - e.x, y - e.y); if(d < CM_CFG.sectario.primeR + pad*0.5) push(x - e.x, y - e.y, 1.3); }
    if(e.vw){ const d = Math.hypot(x - e.x, y - e.y); if(d < CM_CFG.verdugo.smashR + pad*0.4) push(x - e.x, y - e.y, 1.0); }
    if(e.ac && e.ac.st==="warn"){ const d = Math.hypot(x - e.ac.tx, y - e.ac.ty); if(d < CM_CFG.acechante.leapR + pad*0.5) push(x - e.ac.tx, y - e.ac.ty, 1.2); }
  }
  const P = cmPresEntity && cmPresEntity();
  if(P && P.ov){ // ovación: ir detrás del pilar más cercano
    const best = cmCoverSpot(P, x, y);   // el mismo lugar que marca el piso (solo pilares que aguantan hasta el golpe)
    if(best && best.d > 20) push(best.x - x, best.y - y, 2.4);
  }
  return hit ? {x:vx, y:vy} : null;
}
// Prioridad: Raptor con un civil > Campanero canalizando > Verdugo sobre un edificio > Plañidera
function cmBotTarget(h, range){
  if(!cmS) return null;
  let best = null, bs = -Infinity;
  for(const e of enemies){
    if(!e.alive || e.cmRoof) continue;
    const d = Math.hypot(e.x - h.x, e.y - h.y); if(d > range*1.4) continue;
    let s = -Infinity;
    if(e.type==="cm_cometa") s = 1100 - d*0.25;                          // interceptar el Gran Número (defiende la ciudad y expone al jefe)
    else if(e.type==="cm_raptor" && e.rp && (e.rp.st==="ESCAPE" || e.rp.st==="GRAB")) s = 900 - d*0.3;
    else if(e.type==="cm_campanero" && e.cp && e.cp.st==="channel") s = 820 - d*0.3;
    else if(e.type==="cm_verdugo" && e.vw && e.vw.si >= 0) s = 620 - d*0.4;
    else if(e.type==="cm_planidera") s = 460 - d*0.45;
    else if(e.type==="cm_maestro") s = 480 - d*0.4;
    if(s > bs){ bs = s; best = e; }
  }
  return best;
}
// ESCOLTA: un bot con civiles detrás los lleva a la zona segura más cercana (salvo pelea encima)
function cmBotNudge(h, target){
  if(!cmS || !h.alive || h===player) return null;
  const hi = heroes.indexOf(h);
  const mine = cmS.civ.filter(c=>c.st===CIV.FOLLOW && c.lead===hi);
  if(!mine.length) return null;
  const threat = enemies.some(e=>e.alive && !e.cmRoof && Math.hypot(e.x - h.x, e.y - h.y) < 130);
  if(threat && h.hp > h.maxHp*0.35) return null;
  const i = cmNearestSafeIdx(h.x, h.y); if(i < 0) return null;
  const z = CM_SAFE[i];
  // no dejar atrás a la fila: si el último está lejos, esperar
  const far = mine.some(c=>Math.hypot(c.x - h.x, c.y - h.y) > 300);
  if(far) return {mx:0, my:0, target};
  let dir = null;
  if(!aidLineClear(h.x, h.y, z.x, z.y)) dir = cmFieldDir(h, i);
  const dx = dir ? dir.x : (z.x - h.x), dy = dir ? dir.y : (z.y - h.y), d = Math.hypot(dx, dy)||1;
  if(Math.hypot(z.x - h.x, z.y - h.y) < 40) return {mx:0, my:0, target};
  return {mx:dx/d, my:dy/d, target, navd:true};
}
function cmBotUrgent(h){ return false; }

ARENA_DEFS.ciudad = {
  key:"ciudad",
  subBossLevels:[],                       // el nivel 9 lo maneja cmSubDirector
  navBounds:CM_MAP.navBounds,
  runStart:cmRunStart,
  guestStart:()=>{ cmS = null; cmRenderReset(); arenaTitleCardHide(); },
  beginLevel:cmBeginLevel,
  update:cmUpdate,
  guestUpdate:cmGuestUpdate,
  clamp:cmClamp,
  inside:(x, y, m)=>cmInside(x, y, m||0),
  navBlocked:cmNavBlocked,
  spawnPool:cmSpawnPool,
  spawnIntervalMult:cmSpawnIntervalMult,
  placeSpawn:(e, atBoss)=>cmPlaceSpawn(e, atBoss),
  holdLevel:cmHoldLevel,
  enemyAI:Object.assign({cm_maestro:cmAIMaestro, cm_tramoyista:cmAITramoyista, cm_dama:cmAIDama, cm_espejismo:cmAIEspejismo, cm_presentador:cmAIPresentador, cm_cometa:cmAICometa}, CM_ENEMY_AI),
  enemyKilled:cmEnemyKilled,
  afterEnemies:cmAfterEnemies,
  bossDefeated:cmBossDefeated,
  enemyTarget:cmEnemyTarget,
  botDanger:cmBotDanger,
  botTarget:cmBotTarget,
  botNudge:cmBotNudge,
  botUrgent:cmBotUrgent,
  ctxTargets:()=>cmS ? cmS.ctx : null,
  buildDecor:()=>{ lavaPools = []; floorDecor = []; braziers = []; wallBlocks = []; deadTrees = []; smokePuffs = [];
    labyrinthWalls = []; aidProps = []; aidDecals = []; aidSolids = []; aidLights = []; aidKelp = []; aidOuterBlobs = []; aidLavaLayer = null; },
  drawWorld:cmDrawWorld,
  pushTall:cmPushTall,
  drawTall:cmDrawTall,
  drawTop:cmDrawTop,
  drawScreen:cmDrawScreen,
  drawEnemyBody:cmDrawEnemyBody,
  resultsHTML:cmResultsHTML,
  netState:cmNetState,
  applyNetState:cmApplyNetState
};
// internos del anfitrión que no hace falta mandar por red
window.addEventListener("load", ()=>{ if(typeof NET_SKIP_KEYS==="undefined") return; for(const k of ["rp","cp","ac","vw","sc","sp","dr","pl","tw","cast","ov","_near","_dropOn","_vwTut"]) NET_SKIP_KEYS.add(k); });
