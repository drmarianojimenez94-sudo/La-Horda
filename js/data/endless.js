"use strict";
/* ============================================================
   js/data/endless.js
   DATOS de LA HORDA INFINITA (modo de supervivencia por rondas; lógica en js/systems/endless.js).
   Lore: la Horda no se puede destruir. Los nuevos guardianes la CONTIENEN, ronda tras ronda,
   mientras la Cicatriz los arrastra de una arena a otra.
     - Cada TRAMO son 5 rondas en una arena: 4 de horda y la 5ª con subjefe (tramos pares) o
       con el JEFE de la arena (tramos impares: rondas 10, 20, 30...). Al cerrar el tramo, la
       Cicatriz te lleva a la próxima arena.
     - La dificultad sube SIN TECHO por ronda y por minuto (vida, daño, cantidad y élites).
     - Mutadores SEMANALES determinísticos por fecha (semana ISO, UTC): todos juegan lo mismo.
     - Botín: el sistema de siempre (rarezas, familias por arena, protección contra la mala
       suerte) en cofres de jefe/subjefe, en rescates y al final según la ronda alcanzada.
   >>> Todo el balance del modo se toca acá.
   ============================================================ */
const ENDLESS_CFG = {
  roundsPerArena: 5,                 // 4 de horda + 1 de jefe/subjefe ("la Cicatriz te lleva")
  // Duración de cada ronda: base + extra por ronda (con techo: la dificultad sube por densidad, no por aguante)
  roundMs: 26000, roundMsPerRound: 1500, roundMsMax: 44000,
  // Curvas de dificultad SIN TECHO. r = ronda (1..), m = minutos jugados.
  //   vida de la chusma  = (1 + hpPerRound*(r-1)) * (1 + hpPerMin*m)
  //   daño de la chusma  = (1 + dmgPerRound*(r-1)) * (1 + dmgPerMin*m)
  // (se reemplaza el escalado propio del nivel de la arena: la ronda manda, no el nivel del tramo)
  hpPerRound: 0.20, hpPerMin: 0.015,
  dmgPerRound: 0.10, dmgPerMin: 0.010,
  // Jefes y subjefes: parten más blandos que en la campaña (son una ronda, no el cierre de la arena)
  bossHpBase: 0.62, bossHpPerRound: 0.055, bossDmgBase: 0.80, bossDmgPerRound: 0.03,
  // Cantidad: el intervalo de aparición se achica por ronda y por minuto; desde la ronda 8 salen
  // grupos más grandes (+1 cada 7 rondas). Tope de RENDIMIENTO (no de dificultad): con más de
  // `aliveCap` enemigos vivos no salen extras y la horda "se condensa" (+vida a los que aparecen).
  spawnPerRound: 0.035, spawnPerMin: 0.010, burstEvery: 7, aliveCap: 90, condenseHp: 0.35,
  // Élites (roles: Comandante, Cazador, Sanador...): probabilidad extra que crece por ronda
  eliteMax: 0.45, eliteTau: 15,
  // ECONOMÍA (medida con tools/items/t_endless_econ.js contra la campaña: ver el reporte)
  goldMult: 0.70, xpMult: 0.80, lootGrowthPerRound: 0.02,
  // Botín
  chestEveryBoss: true,              // cofre al cerrar cada ronda de jefe/subjefe: jefe = 1 objeto seguro;
  subChestItemChance: 0.5,           //   subjefe = objeto con esta probabilidad, si no "cofre menor" (oro + gema)
  minorChestGold: 40, minorChestGoldPerRound: 8,
  endChestMinRound: 8,               // cofre final (gemas) si llegaste a esta ronda...
  endChestItems: [10, 20, 30],       // ...y un objeto por cada umbral alcanzado
  // Rescates en la arena (Cofre de la Cicatriz / Cristal corrupto): mantener la acción contextual
  rescueChance: 0.55, rescueMs: 22000, rescueHoldMs: 2400, rescueR: 46,
  rescueDist: [360, 620],
  rescueItemChance: 0.10, rescueItemPerRound: 0.008,
  rescueGold: 30, rescueGoldPerRound: 6,
  rescueXp: 30, rescueXpPerRound: 5,
  rescueGemChance: 0.20,
  // Puntaje
  score: { comun:10, subelite:18, elite:40, role:30, subjefe:600, jefe:1500, roundClear:150, rescue:350, roundMult:0.10 },
  // Desbloqueo: completar la Arena 02 (la Fábrica Sin Fin) -> el jugador ya entendió lo básico
  unlockArena: "fortaleza",
  hpRefillOnRound: 0.25
};
// Nivel del tramo en el que cada arena saca su subjefe (así se reusa el director propio de cada una).
const ENDLESS_SUB_LEVEL = {ciudad:9, fortaleza:6, bosque:9, micelial:6, hielo:6, acuatica:6, laberinto:6, abismo:9, minas:8, infernal:7};
// Arenas cuyo JEFE final se puede pelear como una ronda (su secuencia termina en finishBossVictory
// sin depender de recorrer el mapa entero). Las demás aportan su subjefe.
const ENDLESS_BOSS_ARENAS = ["fortaleza","bosque","hielo","acuatica","laberinto","infernal"];

// MUTADORES SEMANALES: cada semana salen 2 (determinístico por la semana ISO en UTC).
// scoreMult: cuánto multiplica el puntaje (lo difícil paga más).
const ENDLESS_MUTATORS = {
  elites_x2:   {name:"Élites dobles",     icon:"👑", desc:"El doble de élites con rol (Comandante, Cazador, Sanador...).", scoreMult:1.20},
  no_potions:  {name:"Sin pociones",      icon:"🚫", desc:"No caen pociones de vida (las de maná sí). La curación es tuya.", scoreMult:1.25},
  fast_horde:  {name:"Horda rápida",      icon:"💨", desc:"Los enemigos corren un 22% más y aparecen más seguido.", scoreMult:1.20},
  swarm:       {name:"Enjambre",          icon:"🐜", desc:"Muchos más enemigos, con un 30% menos de vida cada uno.", scoreMult:1.10},
  furious:     {name:"Jefes furiosos",    icon:"😡", desc:"Jefes y subjefes con +30% de vida y +20% de daño.", scoreMult:1.20},
  dense:       {name:"Sin respiro",       icon:"⏳", desc:"Rondas un 20% más cortas y mucho más densas.", scoreMult:1.15},
  rifts:       {name:"Cicatrices inestables", icon:"🌀", desc:"Rescates en todas las rondas, pero con menos tiempo para llegar.", scoreMult:1.05}
};
const ENDLESS_MUTATOR_IDS = Object.keys(ENDLESS_MUTATORS);

// SINERGIAS de refuerzos: cada refuerzo tiene familias; juntar 2 de una familia activa el nivel 1
// de su sinergia y 3, el nivel 2 (se aplican una sola vez cada uno, al héroe que las junta).
const ENDLESS_BUFF_TAGS = {
  dmg:["filo"], glass:["filo"], vamp:["filo","sangre"], critdmg:["filo","precision"],
  crit:["precision"], focus:["precision","arcano"], hunter:["precision","cazador"],
  execute:["cazador"], elite:["cazador"],
  hp:["baluarte"], armor:["baluarte"], bulwark:["baluarte"], thorns:["baluarte"],
  life:["sangre"], hpregen:["sangre"], potion:["sangre"],
  spd:["viento"], aspd:["viento"], swift:["viento"],
  cdr:["arcano"], regen:["arcano"], arcane:["arcano"], ultcharge:["arcano"]
};
const ENDLESS_SYNERGIES = {
  filo:      {name:"Filo de la Cicatriz", icon:"⚔", t1:"+10% daño", t2:"+15% daño y +5% crítico",
              a1:s=>{ s.dmgMult*=1.10; }, a2:s=>{ s.dmgMult*=1.15; s.critChance+=0.05; }},
  precision: {name:"Ojo del Guardián",    icon:"🎯", t1:"+6% crítico", t2:"+30% daño crítico",
              a1:s=>{ s.critChance+=0.06; }, a2:s=>{ s.critMult=(s.critMult||1.8)+0.30; }},
  cazador:   {name:"Cazadores de la Horda", icon:"🏹", t1:"+15% daño a élites y jefes", t2:"+25% a debilitados",
              a1:s=>{ s.eliteDmgMult*=1.15; }, a2:s=>{ s.executeBonus+=0.25; }},
  baluarte:  {name:"Muralla Viva",        icon:"🛡", t1:"+6% reducción de daño", t2:"+12% vida y +20% espinas",
              a1:s=>{ s.defBonus+=0.06; }, a2:s=>{ s.hpMult*=1.12; s.thorns+=0.20; }},
  sangre:    {name:"Pacto de Sangre",     icon:"🩸", t1:"+4% robo de vida", t2:"+0,6% vida por segundo",
              a1:s=>{ s.lifesteal+=0.04; }, a2:s=>{ s.regenPct+=0.006; }},
  viento:    {name:"Viento de Guerra",    icon:"🌪", t1:"+6% velocidad", t2:"+12% velocidad de ataque",
              a1:s=>{ s.speedMult*=1.06; }, a2:s=>{ s.atkSpeedMult*=1.12; }},
  arcano:    {name:"Pozo Sin Fondo",      icon:"🔮", t1:"-8% enfriamientos", t2:"+25% energía y definitiva",
              a1:s=>{ s.cdMult*=0.92; }, a2:s=>{ s.energyRegenMult*=1.25; s.ultChargeMult*=1.25; }}
};
// Refuerzos que NO salen en la Horda Infinita (romperían la economía de la campaña).
const ENDLESS_BUFF_EXCLUDE = ["gold", "xp"];

// Calificación del botín según la ronda (usa las tablas de siempre: GRADE_LOOT / ARENA_LOOT).
function endlessGradeForRound(r){ return r >= 25 ? "S+" : r >= 18 ? "S" : r >= 10 ? "A" : r >= 5 ? "B" : "C"; }

// REGISTRO DE MODOS: entrada de datos para el selector de modos (el menú la puede leer para
// armar sus tarjetas; mientras tanto js/systems/endless.js agrega la tarjeta al selector actual).
// (propiedad de window, sin declarar: no choca si el menú nuevo arma su propio registro)
window.GAME_MODE_REGISTRY = window.GAME_MODE_REGISTRY || {};
window.GAME_MODE_REGISTRY.endless = {
  id:"endless", name:"Horda Infinita", icon:"∞",
  desc:"Supervivencia sin fin: rondas que no paran, la Cicatriz te lleva de arena en arena, jefes cada 5 rondas y mutadores de la semana. Botín según cuánto aguantes.",
  unlock:()=> typeof endlessUnlocked==="function" ? endlessUnlocked() : false,
  lockedDesc:"🔒 Completá la Arena 02 (Fábrica Sin Fin) para desbloquearla.",
  open:()=> window.endlessOpen && window.endlessOpen(),
  coop:true
};
