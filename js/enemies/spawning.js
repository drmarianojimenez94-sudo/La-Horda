"use strict";
/* ============================================================
   js/enemies/spawning.js
   Aparición de enemigos: qué enemigos salen en cada arena/nivel y creación de cada
   enemigo con su escalado.
   ============================================================ */

// Qué criaturas pueden aparecer en cada nivel de arena (dificultad creciente)
function spawnPoolFor(level){
  if(currentArena==="hielo") return spawnPoolForHielo(level);
  if(currentArena==="bosque") return spawnPoolForBosque(level);
  if(currentArena==="laberinto") return spawnPoolForLaberinto(level);
  if(currentArena==="acuatica") return spawnPoolForAcuatica(level);
  const pool = [{t:"esqueleto", w:10}];
  if(level >= 2) pool.push({t:"zombie", w:6});
  if(level >= 3) pool.push({t:"esqueleto_h", w:4});
  if(level >= 5) pool.push({t:"demonio_menor", w:4});
  if(level >= 6) pool.push({t:"demonio_mago", w:2});
  if(level >= 7) pool.push({t:"golem", w:2});
  // en niveles altos la chusma básica pierde peso frente a las criaturas mayores
  if(level >= 8){ pool[0].w = 5; }
  if(level >= 9){ pool[0].w = 3; }
  return pool;
}
// Laberinto Maldito: roster propio (Escorpión Gigante -> Gólem de Piedra -> Medusa ->
// Druida de Arena -> Esfinge), con arte real integrado. El Guardián (subjefe, nivel 6) y
// el Minotauro (jefe final) ya eran exclusivos de esta arena.
function spawnPoolForLaberinto(level){
  const pool = [{t:"escorpion_gigante", w:10}];
  if(level >= 2) pool.push({t:"golem_piedra", w:6});
  if(level >= 3) pool.push({t:"medusa", w:5});
  if(level >= 5) pool.push({t:"druida_arena", w:4});
  if(level >= 7) pool.push({t:"esfinge", w:3});
  if(level >= 8){ pool[0].w = 6; }
  return pool;
}
// Ruinas del Bosque: roster real (Duendes/Hadas -> Bestias/Cù-Sìth -> Ents/Dama del Bosque).
// El nivel 9 no aparece acá: ahí saltan los 4 Dobladores juntos (ver update()), y mientras
// estén vivos se corta la aparición normal, igual que con cualquier campeón/subjefe.
function spawnPoolForBosque(level){
  const pool = [{t:"duende_bosque", w:10}, {t:"enjambre_hadas", w:6}];
  if(level >= 3) pool.push({t:"bestia_bosque", w:5});
  if(level >= 4) pool.push({t:"cu_sith", w:4});
  if(level >= 6) pool.push({t:"dama_bosque", w:2});
  if(level >= 7) pool.push({t:"ent", w:2});
  if(level >= 8){ pool[0].w = 6; }
  return pool;
}
// Mismo criterio que la Arena Infernal (spawnPoolFor), con el roster de hielo. A diferencia
// de la Infernal (3 subjefes en niveles 4/7/9), acá hay un solo subjefe -Tundraverx- en el
// nivel 6 (ver la lista ARENA_SUBBOSS_LEVELS en beginLevel/update).
function spawnPoolForHielo(level){
  const pool = [{t:"lobo_artico", w:10}];
  if(level >= 2) pool.push({t:"golem_hielo", w:6});
  if(level >= 3) pool.push({t:"dragoncito_hielo", w:5});
  if(level >= 5) pool.push({t:"angel_hielo", w:4});
  if(level >= 6) pool.push({t:"demonio_hielo_fuego", w:3});
  if(level >= 8){ pool[0].w = 5; }
  if(level >= 9){ pool[0].w = 3; }
  return pool;
}
// Arena Acuática: roster propio, introducido de a poco tal como pide el diseño -tiburones
// solos, después +medusas, después +cangrejos, después +sirenas, después +anguilas, y recién
// en niveles altos el Tiburón Blanco (élite) se suma al pool común-. El Kraken Joven (subjefe,
// nivel 6) y el Leviatán (jefe final) no van acá: se manejan aparte, igual que en el resto de
// las arenas (ver subBossLevels/startBossFight).
function spawnPoolForAcuatica(level){
  const pool = [{t:"tiburon_joven", w:10}];
  if(level >= 2) pool.push({t:"medusa_electrica", w:6});
  if(level >= 3) pool.push({t:"cangrejo_acorazado", w:5});
  if(level >= 4) pool.push({t:"sirena_abisal", w:4});
  if(level >= 5) pool.push({t:"anguila_electrica", w:4});
  if(level >= 7) pool.push({t:"tiburon_blanco", w:2});
  if(level >= 8){ pool[0].w = 6; }
  return pool;
}
function pickFromPool(pool){
  let total = 0; for(const p of pool) total += p.w;
  let r = Math.random()*total;
  for(const p of pool){ r -= p.w; if(r <= 0) return p.t; }
  return pool[0].t;
}

// (La dificultad por poder del equipo vive ahora en js/systems/difficulty.js: partyLevelScale.)
function spawnEnemy(type, atBoss, champion){
  const base = ENEMY_BASE[type];
  const scale = 1 + (runLevel-1)*0.17;
  const ang = Math.random()*Math.PI*2;
  // distancia fija en el MUNDO (antes dependía del devicePixelRatio: en cada pantalla aparecían a
  // otra distancia). Equivale a lo que se veía en iPhone: justo afuera del borde de arriba/abajo.
  const dist = VIEW_WORLD_SHORT/2 + 170 + Math.random()*100;
  const x = player.x + Math.cos(ang)*dist;
  const y = player.y + Math.sin(ang)*dist;
  const hpScale = atBoss ? scale*1.0 : scale;
  // Un "campeón" es una versión agrandada de una criatura, usada como subjefe
  const champHp = champion ? 5.5 : 1, champScale = champion ? 1.45 : 1;
  const pls = partyLevelScale(); // dificultad extra por nivel de cuenta de los héroes en la partida
  const e = {
    type, name: base.name, rank: champion ? "subjefe" : base.rank,
    x, y, radius: base.radius*champScale,
    hp: Math.round(base.hp*hpScale*champHp*pls.hp*((champion||base.rank==="subjefe")?DIFF.subbossHp:1)), maxHp: Math.round(base.hp*hpScale*champHp*pls.hp*((champion||base.rank==="subjefe")?DIFF.subbossHp:1)),
    dmg: (champion||base.rank==="subjefe") ? Math.round(pls.avgHp*DIFF.subbossDmgPct*(1+(runLevel-1)*0.03)) : Math.round(base.dmg*(1+(runLevel-1)*arenaMods().enemyDmgPerWave)*pls.dmg),
    speed: base.speed*(champion?0.9:1), color: base.color,
    ranged: base.ranged||false, range: base.range||0, projSpeed: base.projSpeed||0,
    atkCd:0, xp: Math.round(base.xp*(champion?7:1)*pls.xp), gold: base.gold*(champion?7:1),
    dropsItem: champion ? true : (base.dropsItem||false),
    slowTimer:0, slowAmt:0, burnTimer:0, burnDmg:0, bleedTimer:0, bleedDmg:0, stunTimer:0, hitFlash:0,
    fx:0, fy:1, animT:Math.random()*600, attackAnim:0,
    scale: base.scale*champScale,
    target:null,
    alive:true
  };
  // Cooldowns iniciales (con algo de variación al azar) de las habilidades propias de este
  // tipo — ver el bloque "Habilidades de..." correspondiente en el loop de enemigos.
  if(type==="dragon_hielo"){ e.alientoCd = 3000+Math.random()*1500; e.novaCd = 6000+Math.random()*1500; }
  if(type==="demonio_hielo_fuego"){ e.escarchaCd = 2500+Math.random()*2500; }
  enemies.push(e);
  // Un campeón (subjefe) detiene la aparición normal de monstruos mientras esté vivo,
  // salvo que se marque explícitamente como "caótico" (permite que sigan apareciendo).
  if(champion && !e.allowChaosSpawn) activeChampion = e;
  return e;
}
