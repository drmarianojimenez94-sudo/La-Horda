"use strict";
/* ============================================================
   js/arenas/minas/mn-arena.js
   Registro de MINAS PROFUNDAS en ARENA_DEFS (los ganchos que llama el motor) + arte real (atlas
   recortados de las hojas oficiales: tools/art/minas/extract.py), guías de jefe, sonidos, bots y red.
   Datos: mn-data.js · Mapa/descenso: mn-map.js · Luz: mn-light.js · Enemigos: mn-enemies.js
   Jefes y portal: mn-bosses.js · Dibujo: mn-render.js
   ============================================================ */
Object.assign(ANIM_PROFILES, {
  mn_esclavo:{speed:1.0, weight:1.1, lunge:12, material:"flesh", death:"frames"},
  mn_insecto:{speed:1.7, weight:0.5, lunge:14, material:"crystal", death:"frames"},
  mn_acechador:{speed:1.5, weight:0.8, lunge:16, material:"flesh", death:"frames"},
  mn_minero:{speed:0.55, weight:2.6, amp:0.5, lunge:10, impact:2.3, material:"rock", death:"frames"},
  mn_escupidor:{speed:0.8, basic:"cast", cast:1.2, material:"flesh", death:"frames"},
  mn_consumidor:{speed:0.8, basic:"cast", cast:1.2, material:"spirit", death:"frames"},
  mn_devoraluz:{speed:1.1, weight:1.8, lunge:12, material:"spirit", death:"frames"},
  mn_titan:{speed:0.45, weight:3.2, amp:0.4, lunge:8, impact:2.8, material:"rock", death:"frames"},
  mn_cerbero:{speed:0.8, weight:2.6, lunge:14, impact:2.4, material:"flesh", death:"frames"}
});

/* ---------------- atlas reales ----------------
   hMul = alto dibujado / radio. Escala respecto de un guardián (≈ 65 u): Esclavo 1.0 · Insecto 0.6 ·
   Minero 1.5 · Devoraluz 1.8 · Titán 2.6 · Cerbero 2.9 (el más grande de la campaña hasta acá). */
// Tope de escala de píxel (Q6 del alfa): el arte de Cerbero mide 36 px de alto y a 3,2 radios se veía en bloques de
// 6 píxeles de pantalla; a 2,6 radios (el alto estándar de los enemigos es 2,4-2,7) sigue siendo el más grande hasta acá.
const MN_HMUL = {mn_esclavo:3.2, mn_insecto:2.3, mn_acechador:3.1, mn_minero:3.0, mn_escupidor:3.0, mn_consumidor:3.5, mn_devoraluz:3.25, mn_titan:3.1, mn_cerbero:2.6};
if(typeof MINAS_ATLAS!=="undefined") for(const k in MINAS_ATLAS){
  enemyAtlasPackLoad(k, MINAS_ATLAS[k].src, MINAS_ATLAS[k].meta);
  ENEMY_ATLAS_PACK[k].hMul = MN_HMUL[k] || 3;
}
if(typeof MINAS_FX!=="undefined") for(const k in MINAS_FX){
  const F = MINAS_FX[k], imgs = F.srcs.map(src=>{ const im = new Image(); im.src = src; return im; });
  VFX_SPR_EXTRA[k] = {imgs, ready:()=>imgs.every(im=>im.complete && im.naturalWidth > 0), ground:!!F.ground};
}

/* ---------------- guías de jefe (boss-hud.js) ---------------- */
ARENA_BOSS_TIPS.mn_titan = {epithet:"Entidad mineral corrompida", phases:[{hp:1}, {hp:0.5}], tips:[
  "PISOTÓN: onda alrededor suyo que además APAGA las luces cercanas. Alejate y volvé a encenderlas.",
  "Onda sísmica en línea, rocas y lluvia de meteoros: todos marcan el piso antes de caer.",
  "Al 50% provoca DERRUMBES: quedan escombros un rato (nunca tapan un pasillo)."]};
ARENA_BOSS_TIPS.mn_cerbero = {epithet:"Guardián del Umbral Infernal", phases:[{hp:1}, {hp:0.66}, {hp:0.33}], tips:[
  "LANZALLAMAS: la cabeza se echa atrás y marca un cono. Salí del frente y del fuego del piso.",
  "PISOTÓN y AULLIDO apagan luces: la oscuridad sigue siendo peligrosa, reencendé cuando puedas.",
  "Matarlo no termina la pelea: el UMBRAL se abre. Uno de ustedes tiene que ATRAVESARLO."]};

/* ---------------- sonidos (sintetizados; se pueden reemplazar por grabaciones) ---------------- */
function _mnsx(p, gap, play){ return {p, gap, play}; }
Object.assign(ARENA_SFX, {
  mnElevator:  _mnsx(4, 1500,(t,D)=>{ _noise(t,2.2,0.18,"lowpass",260,0,D); for(let i=0;i<6;i++) _noise(t+i*0.3,0.06,0.2,"bandpass",1400,6,D); _tone(t,"sine",70,50,2.2,0.2,D,0.2); return 2.2; }),
  mnFlicker:   _mnsx(2, 500, (t,D)=>{ for(let i=0;i<4;i++) _noise(t+i*0.06,0.03,0.16,"highpass",3000,0,D); return 0.3; }),
  mnExtinguish:_mnsx(3, 300, (t,D)=>{ _noise(t,0.5,0.24,"bandpass",900,1.2,D); _tone(t,"sine",340,120,0.4,0.05,D,0.02); return 0.5; }),
  mnRelight:   _mnsx(3, 300, (t,D)=>{ _noise(t,0.35,0.2,"highpass",1800,0,D); [392,523,659].forEach((f,i)=>_tone(t+i*0.06,"triangle",f,f,0.35,0.07,D,0.02)); return 0.5; }),
  mnSnuff:     _mnsx(2, 400, (t,D)=>{ _noise(t,0.3,0.2,"lowpass",700,0,D); return 0.3; }),
  mnChain:     _mnsx(2, 200, (t,D)=>{ for(let i=0;i<3;i++) _noise(t+i*0.05,0.05,0.2,"bandpass",2400+i*300,8,D); return 0.2; }),
  mnLeap:      _mnsx(3, 200, (t,D)=>{ _noise(t,0.25,0.25,"bandpass",700,1,D); _tone(t,"sawtooth",200,420,0.25,0.05,D); return 0.3; }),
  mnGrowl:     _mnsx(3, 600, (t,D)=>{ _tone(t,"sawtooth",90,70,0.6,0.1,D,0.05); _noise(t,0.6,0.12,"lowpass",400,0,D); return 0.6; }),
  mnGrunt:     _mnsx(2, 300, (t,D)=>{ _tone(t,"sawtooth",110,80,0.3,0.08,D,0.02); return 0.3; }),
  mnThrow:     _mnsx(2, 200, (t,D)=>{ _noise(t,0.25,0.2,"bandpass",500,1,D); return 0.25; }),
  mnSpit:      _mnsx(2, 200, (t,D)=>{ _noise(t,0.2,0.22,"bandpass",600,2,D); _tone(t,"sine",300,180,0.2,0.06,D); return 0.2; }),
  mnSpitHit:   _mnsx(2, 200, (t,D)=>{ _noise(t,0.4,0.2,"lowpass",500,0,D); _tone(t,"sine",160,60,0.4,0.08,D); return 0.4; }),
  mnShard:     _mnsx(2, 150, (t,D)=>{ for(let i=0;i<4;i++) _tone(t+i*0.03,"triangle",1800+i*400,1200,0.12,0.04,D,0.005); return 0.2; }),
  mnRock:      _mnsx(3, 150, (t,D)=>{ _tone(t,"sine",90,34,0.4,0.5,D); _noise(t,0.35,0.35,"lowpass",700,0,D); return 0.4; }),
  mnDevour:    _mnsx(4, 800, (t,D)=>{ _tone(t,"sawtooth",60,40,2.4,0.08,D,0.3); _noise(t,2.4,0.1,"bandpass",300,2,D); return 2.4; }),
  mnDevHurt:   _mnsx(3, 400, (t,D)=>{ _tone(t,"sawtooth",220,110,0.4,0.1,D,0.02); return 0.4; }),
  mnDevEat:    _mnsx(4, 600, (t,D)=>{ _tone(t,"sine",200,40,0.8,0.2,D,0.02); _noise(t,0.3,0.25,"lowpass",300,0,D); return 0.8; }),
  mnDevRoar:   _mnsx(5, 1500,(t,D)=>{ _tone(t,"sawtooth",70,140,1.4,0.14,D,0.1); _tone(t,"sawtooth",105,210,1.4,0.08,D,0.1); _noise(t,1.4,0.2,"bandpass",500,0.8,D); _duck(0.4,1500); return 1.4; }),
  mnDevDeath:  _mnsx(4, 800, (t,D)=>{ _tone(t,"sawtooth",160,30,1.4,0.14,D,0.02); [523,659,784].forEach((f,i)=>_tone(t+0.6+i*0.08,"triangle",f,f,0.5,0.06,D,0.02)); return 1.6; }),
  mnDevBreath: _mnsx(3, 400, (t,D)=>{ _noise(t,0.7,0.24,"bandpass",700,0.6,D); return 0.7; }),
  mnRumble:    _mnsx(4, 1200,(t,D)=>{ _noise(t,1.8,0.4,"lowpass",180,0,D); _tone(t,"sine",40,30,1.8,0.4,D,0.2); _duck(0.5,1500); return 1.8; }),
  mnChains:    _mnsx(3, 1200,(t,D)=>{ for(let i=0;i<9;i++) _noise(t+i*0.12+audioRandom()*0.04,0.05,0.16,"bandpass",2000+audioRandom()*1200,7,D); return 1.2; }),
  mnTripleRoar:_mnsx(5, 3000,(t,D)=>{ [55,82,123].forEach((f,i)=>{ _tone(t+i*0.18,"sawtooth",f,f*1.6,1.8,0.12,D,0.15); }); _noise(t,2.2,0.25,"bandpass",400,0.7,D); _duck(0.3,2500); return 2.4; }),
  mnChainBreak:_mnsx(4, 800, (t,D)=>{ for(let i=0;i<6;i++) _tone(t+i*0.04,"triangle",2200-i*200,900,0.2,0.06,D,0.005); _noise(t,0.4,0.3,"highpass",2500,0,D); return 0.6; }),
  mnPortalHum: _mnsx(4, 1500,(t,D)=>{ _tone(t,"sawtooth",48,52,2.4,0.12,D,0.4); _tone(t,"sine",96,98,2.4,0.08,D,0.4); return 2.4; }),
  mnPortalOpen:_mnsx(5, 3000,(t,D)=>{ _tone(t,"sawtooth",40,160,3.0,0.16,D,0.4); _noise(t,3.0,0.25,"lowpass",600,0,D); _duck(0.35,3000); return 3.0; }),
  mnPortalEnter:_mnsx(5, 3000,(t,D)=>{ _tone(t,"sawtooth",80,20,1.6,0.2,D,0.02); _noise(t,1.6,0.35,"lowpass",900,0,D); return 1.6; }),
  mnCerbDeath: _mnsx(5, 3000,(t,D)=>{ [60,90,135].forEach((f,i)=>_tone(t+i*0.1,"sawtooth",f*1.5,f*0.4,2.0,0.12,D,0.05)); _noise(t,2.0,0.3,"lowpass",400,0,D); _duck(0.3,2500); return 2.2; }),
  mnInhale:    _mnsx(3, 600, (t,D)=>{ _noise(t,1.0,0.18,"bandpass",400,0.8,D); return 1.0; }),
  mnFlame:     _mnsx(4, 800, (t,D)=>{ _noise(t,1.5,0.35,"lowpass",900,0,D); _noise(t,1.5,0.15,"bandpass",2400,0.6,D); return 1.5; }),
  mnHowl:      _mnsx(5, 2000,(t,D)=>{ [220,330,440].forEach((f,i)=>_tone(t+i*0.06,"sawtooth",f*0.7,f*1.2,1.4,0.08,D,0.3)); _duck(0.4,1500); return 1.4; }),
  mnBite:      _mnsx(3, 300, (t,D)=>{ for(let i=0;i<3;i++) _noise(t+i*0.26,0.08,0.3,"bandpass",800,2,D); return 0.8; })
});

/* ---------------- ciclo de la partida ---------------- */
function mnRunStart(){
  mnS = mnNewState();
  mnRenderReset(); _mnNavSig = "";
  const E = MN_SECTORS[0].entry;
  heroes.forEach((h, i)=>{ const a = (i/heroes.length)*Math.PI*2 - Math.PI/2; h.x = E.x + (i ? Math.cos(a)*80 : 0); h.y = E.y + (i ? Math.sin(a)*40 : 0); });
}
function mnSectorIntro(sec){
  const T = ["", "Las GALERÍAS: vagonetas y túneles. Aparecen los ACECHADORES: se esconden en la oscuridad.",
    "VETAS PROFUNDAS: los cristales dan luz. El ESCUPIDOR crea zonas de oscuridad: rompé su línea de tiro.",
    "La MINA CORROMPIDA: menos luces y más hambre. Cuidá cada fuente.",
    "PROFUNDIDADES: el suelo tiembla. Algo enorme se mueve dentro de la roca.",
    "El UMBRAL: la mina está conectada al Infierno. Mantené la luz: todavía importa."][sec];
  if(T) runLater(3800, ()=>{ if(state==="playing") showBanner(T); });
}
function mnBeginLevel(){
  if(!mnS) return;
  const lv = runLevel; mnS.lv = lv;
  mnS.drops.length = 0; mnS.shots.length = 0;
  const target = MN_SECTOR_OF_LEVEL[Math.min(lv, MN_SECTOR_OF_LEVEL.length - 1)];
  const desc = target !== mnS.sec;
  if(desc) mnDescendTo(target);
  if(lv === 1){
    arenaTitleCard(campaignArenaKicker("minas"), "MINAS PROFUNDAS", "La luz es territorio.", 5200);
    runLater(6000, ()=>mnTutSay("mn_intro", "En las Minas la LUZ ES TERRITORIO: en la oscuridad recibís más daño. Si una fuente se apaga, acercate y MANTENÉ ENCENDER.", 9500));
  }
  const hint = {2:"Los INSECTOS DE CRISTAL salen de las vetas de la roca, de a tres.", 4:"El MINERO CORROMPIDO rompe las luces con sus golpes.",
    6:"El CONSUMIDOR LUMINOSO absorbe las fuentes y potencia a los demás.", 9:"Hace calor. Se oyen cadenas más abajo."}[lv];
  if(hint) runLater(desc ? 4200 : 2600, ()=>{ if(state==="playing") showBanner(hint); });
  if(lv === 8) mnS.ti = {st:"none", t:0};
  if(lv === 9){ mnS.hell = Math.max(mnS.hell, 0.6); runLater(9000, ()=>{ if(state==="playing"){ playSfx("mnChains"); } }); runLater(19000, ()=>{ if(state==="playing"){ playSfx("mnTripleRoar"); showBanner("Tres rugidos, lejanos. Algo espera en el fondo."); } }); }
  if(lv === LEVEL_COUNT) mnCerbLevelStart();
}
function mnHoldLevel(){ return !!(mnS && ((runLevel === 8 && mnS.ti.st!=="done") || mnDescending())); }
function mnEnemyWorldUpdate(dt){
  for(const e of enemies){
    if(!e.alive || !e.type || e.type.indexOf("mn_")!==0) continue;
    if(e.packTimer > 0){ e.packTimer -= dt; if(e.packTimer <= 0) e.packSet = null; }
    if(e.mnAura > 0) e.mnAura -= dt;
    mnId(e);
  }
}
function mnAgeTimers(dt){
  for(const A of mnS.alerts) A.t += dt;
  mnS.alerts = mnS.alerts.filter(A=>A.t < A.d + 200);
}
function mnUpdate(dt){
  if(!mnS) return;
  mnNavMaybe();
  mnDescentUpdate(dt);
  mnS.rule = arenaRuleStacks();
  mnLightsUpdate(dt);
  mnShotsUpdate(dt);
  mnDropsUpdate(dt);
  mnAgeTimers(dt);
  mnTitanDirector(dt);
  mnCerbController(dt);
  mnDevDirector(dt);
  mnEnemyWorldUpdate(dt);
  for(const h of heroes){ if(h.alive && !h.duelActive && !h.isDuelLocked) mnClamp(h); }
}
// Invitado: el estado real llega en cada snapshot; acá solo corren los relojes para animar.
let _mnGuestSec = -1;
function mnGuestUpdate(dt){
  if(!mnS) return;
  if(mnS.sec !== _mnGuestSec){ _mnGuestSec = mnS.sec; _mnNavSig = ""; }
  for(const L of [mnS.drops, mnS.zones, mnS.fire, mnS.rubble, mnS.alerts]) for(const o of L) o.t = (o.t||0) + dt;
  for(const s of mnS.shots){ s.t += dt; s.x += s.vx*dt/1000; s.y += s.vy*dt/1000; }
  if(mnS.desc) mnS.desc.t += dt;
  mnS.portal.t += dt; mnS.cb.t += dt; mnS.ti.t += dt;
}
function mnNetState(){ return mnS ? Object.assign({}, mnS) : null; }
function mnApplyNetState(v){
  if(!v) return;
  if(!mnS){ mnS = mnNewState(); mnRenderReset(); }
  Object.assign(mnS, v);
}
function mnAfterEnemies(){
  if(!mnS) return;
  for(const e of enemies){ if(!e.alive || e.isDuelLocked) continue; mnClamp(e); }
}
// regla creciente "La Oscuridad Avanza": +3% de daño por nivel; a oscuras, +15% más
function mnHeroDmgTakenMult(h){ const r = mnS ? 1 + 0.03*(mnS.rule||0) : 1; return (h && h._mnDark ? MN_CFG.light.darkDmgTaken : 1)*r; }

/* ---------------- bots ---------------- */
function mnBotDanger(x, y, pad){
  if(!mnS) return null;
  let vx = 0, vy = 0, hit = false;
  const push = (ax, ay, k)=>{ const d = Math.hypot(ax, ay) || 1; vx += ax/d*k; vy += ay/d*k; hit = true; };
  for(const D of mnS.drops){
    if(D.aim || !mnDropHits(D, x, y, pad*0.5)) continue;
    if(D.sh===1){ push(-D.dy, D.dx, 1.4); push(x - D.x, y - D.y, 0.6); }
    else if(D.sh===2){ const ax = D.x2 - D.x, ay = D.y2 - D.y; push(-ay, ax, 1.4); }
    else push(x - D.x, y - D.y, 1.4);
  }
  for(const F of mnS.fire){ if(Math.hypot(x - F.x, y - F.y) < F.r + pad*0.4) push(x - F.x, y - F.y, 1.0); }
  for(const e of enemies){ if(e.alive && e.mnFlame){ const F = e.mnFlame, ax = x - e.x, ay = y - e.y, d = Math.hypot(ax, ay); if(d < MN_CFG.cerbero.flameR + pad && d > 0 && (ax*F.dx + ay*F.dy)/d > 0.7) push(-F.dy, F.dx, 1.8); } }
  return hit ? {x:vx, y:vy} : null;
}
// Prioridad: Devoraluz comiendo una luz > Consumidor absorbiendo > Minero sobre una luz > Escupidor
function mnBotTarget(h, range){
  if(!mnS) return null;
  let best = null, bs = -Infinity;
  for(const e of enemies){
    if(!e.alive) continue;
    const d = Math.hypot(e.x - h.x, e.y - h.y); if(d > range*1.5) continue;
    let s = -Infinity;
    if(e.type==="mn_devoraluz") s = (e.dv && (e.dv.st==="DEVOUR" || e.dv.st==="TRAVEL") ? 950 : 700) - d*0.3;
    else if(e.type==="mn_consumidor") s = (e.mnDrain!=null ? 860 : 560) - d*0.35;
    else if(e.type==="mn_minero" && e.cast) s = 600 - d*0.4;
    else if(e.type==="mn_escupidor") s = 480 - d*0.45;
    else if(e.type==="mn_acechador" && !e.mnHide) s = 420 - d*0.45;
    if(s > bs){ bs = s; best = e; }
  }
  return best;
}
// a oscuras y sin pelea encima: volver a la luz más cercana (el territorio iluminado es el refugio)
function mnBotNudge(h, target){
  if(!mnS || !h.alive || h===player || mnDescending()) return null;
  if(!h._mnDark) return null;
  if(enemies.some(e=>e.alive && Math.hypot(e.x - h.x, e.y - h.y) < 150) && h.hp > h.maxHp*0.4) return null;
  const L = mnNearestLight(h.x, h.y, q=>q.st>0); if(!L) return null;
  const d = Math.hypot(L.x - h.x, L.y - h.y); if(d < L.r*0.5) return null;
  let dx = L.x - h.x, dy = L.y - h.y;
  if(!aidLineClear(h.x, h.y, L.x, L.y)){ const dir = aidNavDir && aidNavDir(h); if(dir){ dx = dir.x; dy = dir.y; } }
  const l = Math.hypot(dx, dy)||1;
  return {mx:dx/l, my:dy/l, target, navd:true};
}

/* ---------------- resultados ---------------- */
function mnResultsHTML(win){
  if(!mnS) return "";
  const S = mnS, deep = MN_SECTORS[S.sec];
  return `<div class="res-row"><span>Profundidad alcanzada</span><b>−${deep.depth} m · ${deep.name}</b></div>
    <div class="res-row"><span>Luces reencendidas</span><b style="color:#ffd27a;">${S.relit}</b></div>
    <div class="res-row"><span>Luces perdidas</span><b style="color:#c090ff;">${S.lost}</b></div>
    <div class="res-row"><span>Devoradas por el Devoraluz</span><b>${S.devoured}</b></div>
    ${win ? `<div class="res-row"><span>🜂</span><b style="color:#ff8a5a;">ATRAVESASTE EL UMBRAL</b></div>` : ""}`;
}

ARENA_DEFS.minas = {
  key:"minas",
  subBossLevels:[],                       // el Titán (nivel 8) lo maneja mnTitanDirector
  navBounds:{x0:MN_BOUNDS.x0, y0:MN_BOUNDS.y0, x1:MN_BOUNDS.x1, y1:MN_BOUNDS.y1},
  runStart:mnRunStart,
  guestStart:()=>{ mnS = null; mnRenderReset(); _mnGuestSec = -1; arenaTitleCardHide(); },
  beginLevel:mnBeginLevel,
  update:mnUpdate,
  guestUpdate:mnGuestUpdate,
  clamp:mnClamp,
  inside:(x, y, m)=>mnInside(x, y, m||0),
  navBlocked:mnNavBlocked,
  spawnPool:mnSpawnPool,
  spawnIntervalMult:mnSpawnIntervalMult,
  placeSpawn:(e, atBoss)=>mnPlaceSpawn(e, atBoss),
  holdLevel:mnHoldLevel,
  enemyAI:Object.assign({mn_titan:mnAITitan, mn_cerbero:mnAICerbero}, MN_ENEMY_AI),
  enemyKilled:mnEnemyKilled,
  afterEnemies:mnAfterEnemies,
  bossDefeated:mnBossDefeated,
  enemyTarget:mnEnemyTarget,
  heroDmgTakenMult:mnHeroDmgTakenMult,
  botDanger:mnBotDanger,
  botTarget:mnBotTarget,
  botNudge:mnBotNudge,
  botUrgent:()=>false,
  ctxTargets:()=>mnS ? mnS.ctx : null,
  buildDecor:()=>{ lavaPools = []; floorDecor = []; braziers = []; wallBlocks = []; deadTrees = []; smokePuffs = [];
    labyrinthWalls = []; aidProps = []; aidDecals = []; aidSolids = []; aidLights = []; aidKelp = []; aidOuterBlobs = []; aidLavaLayer = null; },
  drawWorld:mnDrawWorld,
  pushTall:mnPushTall,
  drawTall:mnDrawTall,
  drawTop:mnDrawTop,
  drawScreen:mnDrawScreen,
  drawEnemyBody:mnDrawEnemyBody,
  resultsHTML:mnResultsHTML,
  netState:mnNetState,
  applyNetState:mnApplyNetState
};
// internos del anfitrión que no hace falta mandar por red
window.addEventListener("load", ()=>{ if(typeof NET_SKIP_KEYS==="undefined") return; for(const k of ["amb","lWind","acCd","breathCd","_grp","atkCd2","_mnForceT"]) NET_SKIP_KEYS.add(k); });
