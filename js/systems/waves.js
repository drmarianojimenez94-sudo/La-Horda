"use strict";
/* ============================================================
   js/systems/waves.js
   Niveles/oleadas de la Horda y comienzo de la pelea de jefe.
   ============================================================ */

function beginLevel(){
  runWave = 1;
  levelDuration = 22000 + runLevel*2600;
  levelTimer = 0;
  spawnTimer = 0;
  bossActive = false;
  boss = null;
  midBossSpawned = false;
  activeChampion = null;
  levelClearing = 0;
  resetPacing(); emergReset(); // ritmo del nivel de cero y una curación de emergencia por nivel
  if(typeof setMusicMode==="function") setMusicMode(runLevel===LEVEL_COUNT ? "prelude" : "wave", runLevel);
  updateArenaRuleChip();
  const ruleTxt = arenaRuleStacks()>0 ? " · " + arenaRuleLevelText() : "";
  showBanner(runLevel===LEVEL_COUNT ? "NIVEL 10 — EL JEFE ESPERA" + ruleTxt : `NIVEL ${runLevel}` + ruleTxt);
  if(arenaHas("beginLevel")) arenaHook("beginLevel"); // puertas, sectores y jefes de la arena
}
let midBossSpawned = false;
let activeChampion = null; // subjefe/jefe activo: mientras exista, se detiene la aparición normal de monstruos

// Vida/daño del jefe: base de su ficha x poder del equipo (difficulty.js) x perilla de jefes.
function scaleBossStats(e, type){
  e.hp = e.maxHp = Math.round(ENEMY_BASE[type].hp * runDifficulty.hp * DIFF.bossHp * (DIFF.bossHpType[type]||1) * (arenaMods().enemyHpMult||1));
  e.dmg = Math.round(runDifficulty.avgHp * (DIFF.bossDmgPct[currentArena]||0.12));
  e.basicMult = DIFF.bossBasicMult;
}
// Llegada del jefe: la horda que quedaba se dispersa (muere con su animación, sin premio),
// temblor, rugido y cambio de música. Después aparece su guía con 3 consejos (boss-hud.js).
function bossEntrance(e){
  for(const o of enemies){
    if(!o.alive || o===e || o.rank==="subjefe") continue;
    o.alive = false; o.hp = 0;
    vfxOnDeath(o);
  }
  enemies = enemies.filter(o=>o.alive);
  vfxShock(e.x, e.y, e.radius*0.5, e.radius*4, "255,180,90", 900, 2);
  vfxShake(12); flashScreen(0.3, "255,200,140"); playSfx("bossRoar");
  if(typeof setMusicMode==="function") setMusicMode("boss");
  bossHudShow(e);
}
function startBossFight(){
  bossActive = true;
  const bossType = currentArena==="hielo" ? "mago_hielo_cristal" : (currentArena==="bosque" ? "jinete_sin_cabeza" : (currentArena==="laberinto" ? "minotauro" : (currentArena==="acuatica" ? "leviatan" : "demonio_mayor")));
  boss = spawnEnemy(bossType, true);
  scaleBossStats(boss, bossType);
  boss.regenUsed = false; boss.regenTimer = 0; boss.bd = null;
  if(bossType==="leviatan"){
    // El Leviatán ronda el borde del escenario en vez de perseguir de cerca -"no necesita
    // entrar completamente en pantalla"- y ataca con embestidas/coletazos/oleadas telegrafiados.
    const spawnAng = Math.random()*Math.PI*2;
    boss.x = Math.cos(spawnAng)*LEVIATAN_ORBIT_R; boss.y = Math.sin(spawnAng)*LEVIATAN_ORBIT_R;
    boss.orbitAngle = spawnAng;
    boss.acuaticaPhase = 1;
  } else {
    // entra caminando desde cerca del borde de la pantalla (no aparece encima de nadie)
    const a = Math.random()*Math.PI*2, d = Math.min(VW, VH)/2/CAM_ZOOM*0.8;
    boss.x = player.x + Math.cos(a)*d; boss.y = player.y + Math.sin(a)*d; clampToArena(boss);
  }
  boss.bossPhase = 1;
  bossEntrance(boss);
  showBanner(currentArena==="hielo" ? "EL MAGO DE HIELO DESPIERTA" : (currentArena==="bosque" ? "EL JINETE SIN CABEZA DESPIERTA" : (currentArena==="laberinto" ? "EL MINOTAURO DESPIERTA" : (currentArena==="acuatica" ? "¡EL LEVIATÁN EMERGE DE LAS PROFUNDIDADES!" : "EL DEMONIO MAYOR DESPIERTA"))));
}

// Cierre de nivel: al terminar el tiempo, la horda restante cae de golpe (con su animación y
// su XP), hay un respiro corto con el nivel superado en pantalla, y recién ahí se elige refuerzo.
let levelClearing = 0;
function beginLevelClear(){
  levelClearing = 1500;
  let n = 0;
  for(const o of enemies){
    if(!o.alive || o.rank==="subjefe" || o.rank==="jefe") continue;
    o.alive = false; o.hp = 0; n++;
    kills++;
    grantXP(player.classKey, Math.round(o.xp*0.5));
    if(netIsHost()) for(const h of heroes) if(h.isRemote) netEmitTo(h._netSlot, "xp", [Math.round(o.xp*0.5)]);
    vfxOnDeath(o);
  }
  enemies = enemies.filter(o=>o.alive);
  vfxShock(player.x, player.y, 30, 900, "255,220,140", 900, 2);
  flashScreen(0.25, "255,230,170"); playSfx("clear");
  showBanner(`¡NIVEL ${runLevel} SUPERADO!`);
}
