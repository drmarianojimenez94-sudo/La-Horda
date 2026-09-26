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
   habilidades mucho más débiles. potionMult/enemyHpMult (opcionales, 1 si faltan): pociones que
   caen y vida de todo lo que aparece en esa arena. Los multiplicadores de daño de héroe se repiten como NÚMERO
   en varias arenas (es solo una perilla de dificultad), pero el peligro ambiental y el roster
   nunca se repiten entre arenas.
   Ruinas del Bosque, Hielo y Laberinto todavía no tienen monstruos 100% propios en los tramos
   comunes (llegan en mensajes aparte) así que usan un roster prestado con sus propios
   modificadores. "unlockLevel: 0" = desbloqueada desde el arranque (demo).
   ============================================================ */
const ARENA_MODS = {
  bosque:   { label:"Ruinas del Bosque", icon:"🌲", desc:"La entrada al Camino al Infierno.", hazardName:"Niebla del Olvido",
              fireDmgMult:1.3, iceDmgMult:1.0, enemyDmgPerWave:0.12, unlockLevel:0,
              heroSpeedMult:1.0,  heroCdMult:1.0,  heroEnergyRegenMult:1.0,  abilityDmgMult:1.0, heroDmgMult:0.90, enemyRegenPct:0.012, hazard:null, hasWalls:false },
  hielo:    { label:"Arena de Hielo",    icon:"❄", desc:"Bastante más dura que las Ruinas.", hazardName:"Furia del Vendaval Helado",
              fireDmgMult:1.0,  iceDmgMult:1.0, enemyDmgPerWave:0.15, unlockLevel:0,
              heroSpeedMult:0.90, heroCdMult:1.10, heroEnergyRegenMult:0.85, abilityDmgMult:1.0, heroDmgMult:0.85, enemyRegenPct:0, hazard:"nova_gelida", hasWalls:false },
  laberinto:{ label:"Laberinto Maldito", icon:"🗿", desc:"Muros que dividen la arena, sismos y maná escaso. Más dura que el Hielo.", hazardName:"Maldición del Minotauro",
              fireDmgMult:1.0,  iceDmgMult:1.0, enemyDmgPerWave:0.18, unlockLevel:0,
              heroSpeedMult:1.0,  heroCdMult:1.0,  heroEnergyRegenMult:0.50, abilityDmgMult:1.0, heroDmgMult:0.85, enemyRegenPct:0, hazard:"sismo", hasWalls:true,
              // Era un muro (~12% de victorias a nivel 30 vs ~37-40% en Hielo/Infernal): más pociones
              // (vida y maná, x2.2) y -20% de vida a todo lo que aparece -> ~33% en 40 partidas.
              potionMult:2.2, enemyHpMult:0.8 },
  infernal: { label:"Arena Infernal",    icon:"🔥", desc:"La arena final. Extremadamente dura.", hazardName:"Ignición Eterna",
              fireDmgMult:0.8,  iceDmgMult:1.25, enemyDmgPerWave:0.22, unlockLevel:0,
              heroSpeedMult:1.0,  heroCdMult:1.0,  heroEnergyRegenMult:1.0,  abilityDmgMult:0.6, heroDmgMult:1.0, enemyRegenPct:0, hazard:"ignicion", hasWalls:false },
  // Segunda arena por dificultad (entre Bosque y Hielo, ver ARENA_ORDER). Sin peligro ambiental
  // propio -su identidad de riesgo pasa por el roster (embestidas/descargas/agarres) más que
  // por un hazard de piso como las demás- y con una corriente suave que empuja (ver
  // updateAcuaCurrents) como único elemento ambiental que roza el gameplay.
  acuatica: { label:"Arena Acuática",    icon:"🌊", desc:"Ruinas hundidas. Más dura que el Bosque, más suave que el Hielo.", hazardName:"Corriente Profunda",
              fireDmgMult:1.15, iceDmgMult:0.9, enemyDmgPerWave:0.14, unlockLevel:0,
              heroSpeedMult:1.0,  heroCdMult:1.0,  heroEnergyRegenMult:1.0,  abilityDmgMult:1.0, heroDmgMult:0.88, enemyRegenPct:0, hazard:"corriente_acuatica", hasWalls:false },
  // ARENA III (tercera en la campaña, entre la Acuática y el Hielo). Su peligro no es un hazard de
  // piso sino el MAPA: un recorrido largo por sectores con puentes que se reconfiguran y el Ciclo
  // Mecánico de trampas (js/arenas/fortaleza/). Roster más pesado (élites y subélites desde temprano)
  // con menos enemigos por minuto: la dificultad sube por composición, no por vida.
  fortaleza:{ label:"La Fortaleza Sin Fin", icon:"⚙", desc:"Arena III. Una fortaleza viva: puentes que se mueven, trampas y un Caballero que no perdona.", hazardName:"Ciclo Mecánico",
              fireDmgMult:1.1, iceDmgMult:1.0, enemyDmgPerWave:0.145, unlockLevel:0,
              heroSpeedMult:1.0,  heroCdMult:1.0,  heroEnergyRegenMult:1.0,  abilityDmgMult:1.0, heroDmgMult:0.87, enemyRegenPct:0, hazard:null, hasWalls:false,
              potionMult:1.25 },
  // ARENA IV (cuarta en la campaña, entre la Fortaleza y el Hielo). "EL ESCENARIO CRECE, MADURA Y
  // MUERE": el mapa entero es un organismo (la Madre Espora) con ciclo de vida por etapas, Núcleos
  // Miceliales que infectan territorio y un jefe que ES la estructura del centro
  // (js/arenas/micelial/). Sin hazard de piso genérico: el peligro es la infección y la colonia.
  micelial: { label:"El Reino Micelial", icon:"🍄", desc:"Arena IV. Una caverna viva que crece, madura y muere. La Madre ya te está mirando.", hazardName:"La Colonia",
              fireDmgMult:1.15, iceDmgMult:1.0, enemyDmgPerWave:0.148, unlockLevel:0,
              heroSpeedMult:1.0,  heroCdMult:1.0,  heroEnergyRegenMult:1.0,  abilityDmgMult:1.0, heroDmgMult:0.87, enemyRegenPct:0, hazard:null, hasWalls:false,
              potionMult:1.3 },
  // Arena Divina: la de asedio 4v4. Todavía sin combate (Fase 1: solo el escenario), así que
  // sin debuffs propios por ahora -esto se termina de calibrar cuando exista el combate de
  // verdad. NO va en ARENA_ORDER a propósito: no tiene que aparecer en la selección normal
  // de arenas de oleadas, se entra por su propia pantalla ("Modos de juego" -> Arena Divina).
  divina:   { label:"Arena Divina", icon:"👁", desc:"Asedio 4 contra 4. Todavía en construcción.", hazardName:"Mirada Ascendida",
              fireDmgMult:1.0,  iceDmgMult:1.0, enemyDmgPerWave:0, unlockLevel:0,
              heroSpeedMult:1.0,  heroCdMult:1.0,  heroEnergyRegenMult:1.0,  abilityDmgMult:1.0, heroDmgMult:1.0, enemyRegenPct:0, hazard:null, hasWalls:false }
};
const ARENA_ORDER = ["bosque","acuatica","fortaleza","micelial","hielo","laberinto","infernal"];
