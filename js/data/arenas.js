"use strict";
/* ============================================================
   js/data/arenas.js
   DATOS de las arenas: modificadores de dificultad de cada una y orden de desbloqueo.
   ============================================================ */

/* ============================================================
   MODIFICADORES DE ARENA — arquitectura lista para más arenas a futuro.
   Orden de dificultad: Ruinas del Bosque (entrada) -> Arena de Hielo -> Laberinto Maldito ->
   Arena Infernal (la ÚLTIMA, la más dura).
   Cada arena tiene su propia mecánica de firma para que no se sientan iguales entre sí:
   Bosque = regeneración enemiga + niebla; Hielo = novas gélidas + enfriamientos más largos;
   Laberinto = MUROS que bloquean el paso + sismos + maná muy castigado; Infernal = ignición +
   habilidades mucho más débiles. Los multiplicadores de daño de héroe se repiten como NÚMERO
   en varias arenas (es solo una perilla de dificultad), pero el peligro ambiental y el roster
   nunca se repiten entre arenas.
   Ruinas del Bosque, Hielo y Laberinto todavía no tienen monstruos 100% propios en los tramos
   comunes (llegan en mensajes aparte) así que usan un roster prestado con sus propios
   modificadores. "unlockLevel: 0" = desbloqueada desde el arranque (demo).
   ============================================================ */
const ARENA_MODS = {
  bosque:   { label:"Ruinas del Bosque", icon:"🌲", desc:"La entrada al Camino al Infierno.", hazardName:"Niebla del Olvido",
              fireDmgMult:1.3, iceDmgMult:1.0, enemyDmgPerWave:0.07, unlockLevel:0,
              heroSpeedMult:1.0,  heroCdMult:1.0,  heroEnergyRegenMult:1.0,  abilityDmgMult:1.0, heroDmgMult:0.90, enemyRegenPct:0.012, hazard:null, hasWalls:false },
  hielo:    { label:"Arena de Hielo",    icon:"❄", desc:"Bastante más dura que las Ruinas.", hazardName:"Furia del Vendaval Helado",
              fireDmgMult:1.0,  iceDmgMult:1.0, enemyDmgPerWave:0.11, unlockLevel:0,
              heroSpeedMult:0.90, heroCdMult:1.10, heroEnergyRegenMult:0.85, abilityDmgMult:1.0, heroDmgMult:0.85, enemyRegenPct:0, hazard:"nova_gelida", hasWalls:false },
  laberinto:{ label:"Laberinto Maldito", icon:"🗿", desc:"Muros que dividen la arena, sismos y maná escaso. Más dura que el Hielo.", hazardName:"Maldición del Minotauro",
              fireDmgMult:1.0,  iceDmgMult:1.0, enemyDmgPerWave:0.18, unlockLevel:0,
              heroSpeedMult:1.0,  heroCdMult:1.0,  heroEnergyRegenMult:0.50, abilityDmgMult:1.0, heroDmgMult:0.85, enemyRegenPct:0, hazard:"sismo", hasWalls:true },
  infernal: { label:"Arena Infernal",    icon:"🔥", desc:"La arena final. Extremadamente dura.", hazardName:"Ignición Eterna",
              fireDmgMult:0.8,  iceDmgMult:1.25, enemyDmgPerWave:0.33, unlockLevel:0,
              heroSpeedMult:1.0,  heroCdMult:1.0,  heroEnergyRegenMult:1.0,  abilityDmgMult:0.6, heroDmgMult:1.0, enemyRegenPct:0, hazard:"ignicion", hasWalls:false },
  // Segunda arena por dificultad (entre Bosque y Hielo, ver ARENA_ORDER). Sin peligro ambiental
  // propio -su identidad de riesgo pasa por el roster (embestidas/descargas/agarres) más que
  // por un hazard de piso como las demás- y con una corriente suave que empuja (ver
  // updateAcuaCurrents) como único elemento ambiental que roza el gameplay.
  acuatica: { label:"Arena Acuática",    icon:"🌊", desc:"Ruinas hundidas. Más dura que el Bosque, más suave que el Hielo.", hazardName:"Corriente Profunda",
              fireDmgMult:1.15, iceDmgMult:0.9, enemyDmgPerWave:0.09, unlockLevel:0,
              heroSpeedMult:1.0,  heroCdMult:1.0,  heroEnergyRegenMult:1.0,  abilityDmgMult:1.0, heroDmgMult:0.88, enemyRegenPct:0, hazard:"corriente_acuatica", hasWalls:false },
  // Arena Divina: la de asedio 4v4. Todavía sin combate (Fase 1: solo el escenario), así que
  // sin debuffs propios por ahora -esto se termina de calibrar cuando exista el combate de
  // verdad. NO va en ARENA_ORDER a propósito: no tiene que aparecer en la selección normal
  // de arenas de oleadas, se entra por su propia pantalla ("Modos de juego" -> Arena Divina).
  divina:   { label:"Arena Divina", icon:"👁", desc:"Asedio 4 contra 4. Todavía en construcción.", hazardName:"Mirada Ascendida",
              fireDmgMult:1.0,  iceDmgMult:1.0, enemyDmgPerWave:0, unlockLevel:0,
              heroSpeedMult:1.0,  heroCdMult:1.0,  heroEnergyRegenMult:1.0,  abilityDmgMult:1.0, heroDmgMult:1.0, enemyRegenPct:0, hazard:null, hasWalls:false }
};
const ARENA_ORDER = ["bosque","acuatica","hielo","laberinto","infernal"];
