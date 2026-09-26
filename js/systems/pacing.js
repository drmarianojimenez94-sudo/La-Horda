"use strict";
/* ============================================================
   js/systems/pacing.js
   RITMO DE CADA NIVEL (montaña rusa) + CURACIÓN DE EMERGENCIA.
   Antes cada nivel era un goteo parejo de enemigos de principio a fin. Ahora el nivel respira:
     CALENTAMIENTO  (0-15%)   aparecen algo más espaciados
     ESCALADA       (15-40%)  ritmo normal
     OLEADA         (40-50%)  aviso ("¡se acerca una oleada desde el norte!") y 1,5 s después
                              un grupo entra junto por ESE lado; el ritmo se aprieta
     RESPIRO        (50-62%)  casi no aparecen; si el grupo viene golpeado cae una poción cerca
     ESCALADA       (62-85%)  ritmo normal
     CLÍMAX         (85-100%) la horda se enfurece hasta el cierre del nivel
   El promedio de enemigos por nivel queda casi igual al anterior (la dificultad calibrada no se
   mueve): lo que cambia es la forma. Nivel 1 sin oleada (arranque suave). Todo en el anfitrión.
   CURACIÓN DE EMERGENCIA: botón secundario universal (tecla Q). 1 carga por nivel: cura 30% al
   instante + 20% en 2,5 s. Es la red de seguridad para un error, no una rotación: los bots la usan
   por debajo del 30%. No suma a la calificación de curación (no se puede "farmear" puntaje).
   >>> Balance: PACE_PHASES, PACE_SURGE, EMERG_CFG.
   ============================================================ */
const PACE_PHASES = [
  {key:"calentamiento", until:0.15, mult:1.25},
  {key:"escalada",      until:0.40, mult:1.0},
  {key:"oleada",        until:0.50, mult:0.6},
  {key:"respiro",       until:0.62, mult:2.4},
  {key:"escalada2",     until:0.85, mult:1.0},
  {key:"climax",        until:1.01, mult:0.72}
];
const PACE_SURGE = {warn:1500, base:3, perLevel:0.5, max:7, arc:0.55};
const EMERG_CFG = {charges:1, instPct:0.30, hotPct:0.20, hotMs:2500, botBelow:0.30, minMissing:0.05};
let PACE = {phase:"calentamiento", surgeAt:0, surgeAng:0, surgeDone:false, breatherDone:false};

function resetPacing(){ PACE = {phase:"calentamiento", surgeAt:0, surgeAng:0, surgeDone:false, breatherDone:false}; }
function pacingPhaseAt(p){ for(const ph of PACE_PHASES) if(p < ph.until) return ph; return PACE_PHASES[PACE_PHASES.length-1]; }
// Multiplicador del intervalo de aparición (lo lee update.js). Sin director en la Divina ni con jefe.
function pacingIntervalMult(){
  if(divinaMode || bossActive || !levelDuration || levelDuration > 1e8) return 1;
  return pacingPhaseAt(levelTimer/levelDuration).mult;
}
const _PACE_DIRS = ["el este","el sureste","el sur","el suroeste","el oeste","el noroeste","el norte","el noreste"];
function _paceDirName(a){ const k = Math.round(((a % (Math.PI*2)) + Math.PI*2) % (Math.PI*2) / (Math.PI/4)) % 8; return _PACE_DIRS[k]; }
function updatePacing(dt){
  if(divinaMode || bossActive || !player || !levelDuration || levelDuration > 1e8) return;
  const ph = pacingPhaseAt(levelTimer/levelDuration);
  if(ph.key !== PACE.phase){
    PACE.phase = ph.key;
    if(ph.key==="oleada" && runLevel >= 2 && !activeChampion && !PACE.surgeDone){
      PACE.surgeAng = Math.random()*Math.PI*2; PACE.surgeAt = PACE_SURGE.warn; PACE.surgeDone = true;
      PACE.surgeDir = !arenaDef(); // arenas con geometría propia (puertas/plataformas) deciden por dónde entran
      showBanner(PACE.surgeDir ? `¡Se acerca una oleada desde ${_paceDirName(PACE.surgeAng)}!` : "¡Se acerca una oleada!");
      playSfx("threat");
    } else if(ph.key==="respiro" && !PACE.breatherDone){
      PACE.breatherDone = true;
      const alive = heroes.filter(h=>h.alive), avg = alive.length ? alive.reduce((s,h)=>s + h.hp/h.maxHp, 0)/alive.length : 1;
      if(avg < 0.75){ dropPotion(player.x + Math.cos(PACE.surgeAng+Math.PI)*90, player.y + Math.sin(PACE.surgeAng+Math.PI)*60, "heal"); }
      floatText(player.x, player.y-80, "respiro…", "heal");
    } else if(ph.key==="climax" && runLevel >= 2){
      floatText(player.x, player.y-80, "¡la horda se enfurece!", "crit");
    }
  }
  if(PACE.surgeAt > 0){
    PACE.surgeAt -= dt;
    if(PACE.surgeAt <= 0) pacingSpawnSurge();
  }
}
function pacingSpawnSurge(){
  if(activeChampion || bossActive || state!=="playing") return;
  const n = Math.min(PACE_SURGE.max, Math.round(PACE_SURGE.base + runLevel*PACE_SURGE.perLevel));
  const pool = spawnPoolFor(runLevel), place = PACE.surgeDir;
  const dist = VIEW_WORLD_SHORT/2 + 150;
  for(let i=0;i<n;i++){
    const e = spawnEnemy(pickFromPool(pool), false);
    if(place){
      const a = PACE.surgeAng + (Math.random()-0.5)*PACE_SURGE.arc*2, d = dist + Math.random()*90;
      e.x = player.x + Math.cos(a)*d; e.y = player.y + Math.sin(a)*d; clampToArena(e); resolveWallCollision(e);
    }
    maybeAssignRole(e);
  }
}
// Flecha en el borde mientras se avisa de la oleada (la dibuja feedback.js).
function pacingDrawWarn(now, edgePoint, arrow){
  if(!(PACE.surgeAt > 0) || !PACE.surgeDir) return;
  const p = edgePoint(PACE.surgeAng, 26);
  ctx.globalAlpha = 0.6 + 0.4*Math.sin(now/90);
  arrow(p.x, p.y, PACE.surgeAng, 16, "#ff5a3c", "rgba(0,0,0,0.75)");
  ctx.globalAlpha = 1;
}

/* ---- Curación de emergencia ---- */
function emergReset(){ for(const h of heroes){ h.emergCharges = EMERG_CFG.charges; h.emergHotT = 0; } }
function emergCanUse(h){
  return !!h && h.alive && state==="playing" && !divinaMode && (h.emergCharges||0) > 0 && h.hp < h.maxHp*(1-EMERG_CFG.minMissing);
}
function emergUse(h){
  if(!emergCanUse(h)) return false;
  h.emergCharges--;
  const inst = h.maxHp*EMERG_CFG.instPct, before = h.hp;
  h.hp = Math.min(h.maxHp, h.hp + inst);
  h.emergHotT = EMERG_CFG.hotMs;
  vfxBurst(h.x, h.y-20, 14, "heal", 90, 600, 3.5, h===player ? 2 : 1, -60, 1);
  vfxShock(h.x, h.y, 10, 70, "111,220,140", 420, 1);
  floatText(h.x, h.y-54, `+${Math.round(h.hp-before)}`, "heal");
  if(h===player || inView(h.x, h.y, 0)) playSfx("emergencyHeal");
  if(h.stats) h.stats.emergHeals = (h.stats.emergHeals||0) + 1;
  return true;
}
function updateEmergency(dt){
  for(const h of heroes){
    if(!(h.emergHotT > 0)) continue;
    if(!h.alive){ h.emergHotT = 0; continue; }
    const step = Math.min(dt, h.emergHotT); h.emergHotT -= dt;
    h.hp = Math.min(h.maxHp, h.hp + h.maxHp*EMERG_CFG.hotPct*step/EMERG_CFG.hotMs);
  }
}
// Lo llaman los bots cada vez que piensan sus habilidades.
function botMaybeEmergency(h){
  if(h.hp < h.maxHp*EMERG_CFG.botBelow && emergCanUse(h)) emergUse(h);
}
