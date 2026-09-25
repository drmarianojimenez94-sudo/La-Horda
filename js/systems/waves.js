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
  showBanner(runLevel===LEVEL_COUNT ? "NIVEL 10 — EL JEFE DESPIERTA" : `NIVEL ${runLevel}`);
}
let midBossSpawned = false;
let activeChampion = null; // subjefe/jefe activo: mientras exista, se detiene la aparición normal de monstruos

function startBossFight(){
  bossActive = true;
  enemies = enemies.filter(e=>e.rank==="subjefe"); // deja en pie a cualquier campeón activo
  const bossType = currentArena==="hielo" ? "mago_hielo_cristal" : (currentArena==="bosque" ? "jinete_sin_cabeza" : (currentArena==="laberinto" ? "minotauro" : (currentArena==="acuatica" ? "leviatan" : "demonio_mayor")));
  boss = spawnEnemy(bossType, true);
  boss.hp = boss.maxHp = Math.round(ENEMY_BASE[bossType].hp * (1+ (save.champions[player.classKey].level)*0.01));
  boss.breathCd = 3800; boss.waveCd = 6500; boss.regenUsed = false; boss.regenTimer = 0;
  if(bossType==="mago_hielo_cristal"){
    boss.novaCd = 4000; boss.ventiscaCd = 6200; boss.armorCd = 8500; boss.armorTimer = 0; boss.skillAnim = null;
  }
  if(bossType==="leviatan"){
    // El Leviatán ronda el borde del escenario en vez de perseguir de cerca -"no necesita
    // entrar completamente en pantalla"- y ataca con embestidas/coletazos/oleadas telegrafiados.
    const spawnAng = Math.random()*Math.PI*2;
    boss.x = Math.cos(spawnAng)*LEVIATAN_ORBIT_R; boss.y = Math.sin(spawnAng)*LEVIATAN_ORBIT_R;
    boss.orbitAngle = spawnAng; boss.biteCd = 3400; boss.chargeCd = 8000; boss.tailCd = 6200; boss.waveCd2 = 9000;
    boss.acuaticaPhase = 1;
  }
  boss.bossPhase = 1;
  showBanner(currentArena==="hielo" ? "EL MAGO DE HIELO DESPIERTA" : (currentArena==="bosque" ? "EL JINETE SIN CABEZA DESPIERTA" : (currentArena==="laberinto" ? "EL MINOTAURO DESPIERTA" : (currentArena==="acuatica" ? "¡EL LEVIATÁN EMERGE DE LAS PROFUNDIDADES!" : "EL DEMONIO MAYOR DESPIERTA"))));
}
