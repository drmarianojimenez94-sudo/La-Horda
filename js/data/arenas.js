"use strict";
/* ============================================================
   js/data/arenas.js
   DATOS de las arenas: modificadores de dificultad de cada una y orden de desbloqueo.
   ============================================================ */

/* ============================================================
   MODIFICADORES DE ARENA — arquitectura lista para más arenas a futuro.
   ORDEN CANÓNICO de la campaña (docs/lore/LA_HORDA_LORE_BIBLE.md): CAMPAIGN_ORDER, más abajo.
   Los IDs internos NO cambian (guardados): fortaleza = Fábrica Sin Fin, bosque = Ruinas Célticas /
   Élficas, micelial = Reino Fúngico, hielo = Arena Gélida. La dificultad sigue la posición en la
   campaña (DIFF.arenaLevel / bossDmgPct / enemyDmgPerWave), no el ID.
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
  bosque:   { label:"Ruinas Célticas / Élficas", icon:"🌲", desc:"Arena 03. Ruinas de un bosque sagrado. Acá espera el primero de los Cuatro Guardianes.", hazardName:"Niebla del Olvido",
              fireDmgMult:1.3, iceDmgMult:1.0, enemyDmgPerWave:0.14, unlockLevel:0,
              heroSpeedMult:1.0,  heroCdMult:1.0,  heroEnergyRegenMult:1.0,  abilityDmgMult:1.0, heroDmgMult:0.90, enemyRegenPct:0.012, hazard:null, hasWalls:false },
  hielo:    { label:"Arena Gélida",      icon:"❄", desc:"Arena 05. El frío es el enemigo. Acá espera el segundo Guardián.", hazardName:"Furia del Vendaval Helado",
              fireDmgMult:1.0,  iceDmgMult:1.0, enemyDmgPerWave:0.148, unlockLevel:0,
              heroSpeedMult:0.90, heroCdMult:1.10, heroEnergyRegenMult:0.85, abilityDmgMult:1.0, heroDmgMult:0.85, enemyRegenPct:0, hazard:"nova_gelida", hasWalls:false },
  laberinto:{ label:"Laberinto", icon:"🗿", desc:"Arena 07. Muros, sismos y maná escaso. Acá espera el tercer Guardián.", hazardName:"Maldición del Minotauro",
              fireDmgMult:1.0,  iceDmgMult:1.0, enemyDmgPerWave:0.16, unlockLevel:0,
              heroSpeedMult:1.0,  heroCdMult:1.0,  heroEnergyRegenMult:0.50, abilityDmgMult:1.0, heroDmgMult:0.85, enemyRegenPct:0, hazard:"sismo", hasWalls:true,
              // Era un muro (~12% de victorias a nivel 30 vs ~37-40% en Hielo/Infernal): más pociones
              // (vida y maná, x2.2) y -20% de vida a todo lo que aparece -> ~33% en 40 partidas.
              potionMult:2.2, enemyHpMult:0.8 },
  infernal: { label:"Arena Infernal",    icon:"🔥", desc:"Arena 10. La dimensión de la Horda. El final del viaje.", hazardName:"Ignición Eterna",
              fireDmgMult:0.8,  iceDmgMult:1.25, enemyDmgPerWave:0.22, unlockLevel:0,
              heroSpeedMult:1.0,  heroCdMult:1.0,  heroEnergyRegenMult:1.0,  abilityDmgMult:0.6, heroDmgMult:1.0, enemyRegenPct:0, hazard:"ignicion", hasWalls:false },
  // Segunda arena por dificultad (entre Bosque y Hielo, ver ARENA_ORDER). Sin peligro ambiental
  // propio -su identidad de riesgo pasa por el roster (embestidas/descargas/agarres) más que
  // por un hazard de piso como las demás- y con una corriente suave que empuja (ver
  // updateAcuaCurrents) como único elemento ambiental que roza el gameplay.
  acuatica: { label:"Arena Acuática",    icon:"🌊", desc:"Arena 06. Ruinas hundidas: el agua te mueve. Las Cicatrices se vuelven inestables.", hazardName:"Corriente Profunda",
              fireDmgMult:1.15, iceDmgMult:0.9, enemyDmgPerWave:0.15, unlockLevel:0,
              heroSpeedMult:1.0,  heroCdMult:1.0,  heroEnergyRegenMult:1.0,  abilityDmgMult:1.0, heroDmgMult:0.88, enemyRegenPct:0, hazard:"corriente_acuatica", hasWalls:false },
  // ARENA III (tercera en la campaña, entre la Acuática y el Hielo). Su peligro no es un hazard de
  // piso sino el MAPA: un recorrido largo por sectores con puentes que se reconfiguran y el Ciclo
  // Mecánico de trampas (js/arenas/fortaleza/). Roster más pesado (élites y subélites desde temprano)
  // con menos enemigos por minuto: la dificultad sube por composición, no por vida.
  fortaleza:{ label:"Fábrica Sin Fin", icon:"⚙", desc:"Arena 02. Una fábrica viva que la Horda contaminó: puentes que se mueven, trampas y máquinas que no perdonan.", hazardName:"Ciclo Mecánico",
              fireDmgMult:1.1, iceDmgMult:1.0, enemyDmgPerWave:0.12, unlockLevel:0,
              heroSpeedMult:1.0,  heroCdMult:1.0,  heroEnergyRegenMult:1.0,  abilityDmgMult:1.0, heroDmgMult:0.87, enemyRegenPct:0, hazard:null, hasWalls:false,
              potionMult:1.25 },
  // ARENA IV (cuarta en la campaña, entre la Fortaleza y el Hielo). "EL ESCENARIO CRECE, MADURA Y
  // MUERE": el mapa entero es un organismo (la Madre Espora) con ciclo de vida por etapas, Núcleos
  // Miceliales que infectan territorio y un jefe que ES la estructura del centro
  // (js/arenas/micelial/). Sin hazard de piso genérico: el peligro es la infección y la colonia.
  micelial: { label:"Reino Fúngico", icon:"🍄", desc:"Arena 04. Una caverna viva que crece, madura y muere. La Madre ya te está mirando.", hazardName:"La Colonia",
              fireDmgMult:1.15, iceDmgMult:1.0, enemyDmgPerWave:0.145, unlockLevel:0,
              heroSpeedMult:1.0,  heroCdMult:1.0,  heroEnergyRegenMult:1.0,  abilityDmgMult:1.0, heroDmgMult:0.87, enemyRegenPct:0, hazard:null, hasWalls:false,
              potionMult:1.3 },
  // ARENA DEL ABISMO (entre el Hielo y el Laberinto; el orden final se revisa después). "EL TERRENO ES
  // UN RECURSO": ruinas suspendidas sobre el vacío con plataformas que se agrietan, colapsan y el
  // Abismo reconstruye entre oleadas; caer no mata (quedás colgado del borde y un compañero te
  // rescata) y a los enemigos SÍ se los puede tirar al vacío (js/arenas/abismo/).
  abismo:   { label:"Abismo", icon:"🕳", desc:"Arena 08. El punto de no retorno: el mundo se rompe y el piso también pelea.", hazardName:"El Vacío",
              fireDmgMult:1.0, iceDmgMult:1.0, enemyDmgPerWave:0.18, unlockLevel:0,
              heroSpeedMult:1.0,  heroCdMult:1.0,  heroEnergyRegenMult:1.0,  abilityDmgMult:1.0, heroDmgMult:0.86, enemyRegenPct:0, hazard:null, hasWalls:false,
              potionMult:1.3 },
  // Arena Divina: la de asedio 4v4. Todavía sin combate (Fase 1: solo el escenario), así que
  // sin debuffs propios por ahora -esto se termina de calibrar cuando exista el combate de
  // verdad. NO va en ARENA_ORDER a propósito: no tiene que aparecer en la selección normal
  // de arenas de oleadas, se entra por su propia pantalla ("Modos de juego" -> Arena Divina).
  divina:   { label:"Arena Divina", icon:"👁", desc:"Asedio 4 contra 4: derribá las torres y el castillo del equipo divino.", hazardName:"Mirada Ascendida",
              fireDmgMult:1.0,  iceDmgMult:1.0, enemyDmgPerWave:0, unlockLevel:0,
              heroSpeedMult:1.0,  heroCdMult:1.0,  heroEnergyRegenMult:1.0,  abilityDmgMult:1.0, heroDmgMult:1.0, enemyRegenPct:0, hazard:null, hasWalls:false }
};
// Arenas del ORDEN CANÓNICO que todavía no existen en el juego: aparecen en el selector con su número
// (EN CONSTRUCCIÓN) pero no se pueden jugar y el desbloqueo las saltea hasta que se construyan.
// (Hoy las diez arenas del orden canónico son jugables.)
Object.assign(ARENA_MODS, {
  // CIUDAD MALDITA (Arena 01, jugable): "NO PODÉS SALVARLOS A TODOS. PERO VAS A INTENTARLO." Civiles
  // escondidos que hay que encontrar, rescatar y escoltar; estructuras que la Horda derriba; subjefes
  // en el nivel 9 y El Presentador en el 10 (js/arenas/ciudad/).
  ciudad:   { label:"Ciudad Maldita", icon:"🏚", desc:"Arena 01. Donde empieza todo: la ciudad que defendiste cuando la Horda volvió.", hazardName:"La Ciudad Arde",
              fireDmgMult:1.0, iceDmgMult:1.0, enemyDmgPerWave:0.10, unlockLevel:0, heroSpeedMult:1.0, heroCdMult:1.0, heroEnergyRegenMult:1.0, abilityDmgMult:1.0, heroDmgMult:1.0, enemyRegenPct:0, hazard:null, hasWalls:false,
              // Auditoría pre-alfa: es la PRIMERA arena de un jugador nuevo y era la más dura de la campaña
              // (simulación: 4 derrotas en el nivel 9 antes de ganar, 45-60 min). Más amable sin cambiar su
              // identidad: el daño enemigo crece más lento, el guardián pega normal, -12% de vida enemiga y
              // más pociones.
              potionMult:1.6, enemyHpMult:0.88 },
  // MINAS PROFUNDAS (Arena 09, la última antes de la Infernal): "LA LUZ ES TERRITORIO". Descenso por seis
  // sectores; los enemigos apagan las luces y el equipo las reenciende; Devoraluz, Titán de Piedra y
  // Cerbero. Matar a Cerbero NO termina la partida: hay que ATRAVESAR EL UMBRAL (js/arenas/minas/).
  minas:    { label:"Minas Profundas", icon:"⛏", desc:"Arena 09. La luz es territorio. Y el camino baja hasta la puerta del Infierno.", hazardName:"La Oscuridad",
              fireDmgMult:1.0, iceDmgMult:1.0, enemyDmgPerWave:0.17, unlockLevel:0, heroSpeedMult:1.0, heroCdMult:1.0, heroEnergyRegenMult:1.0, abilityDmgMult:1.0, heroDmgMult:0.86, enemyRegenPct:0, hazard:null, hasWalls:false,
              potionMult:1.3 }
});
/* ORDEN CANÓNICO DE LA CAMPAÑA (Lore Bible: docs/lore/LA_HORDA_LORE_BIBLE.md). Los IDs internos NO
   cambian (los guardados siguen apuntando a la misma arena); lo que cambia es el orden.
     01 Ciudad Maldita · 02 Fábrica Sin Fin (fortaleza) · 03 Ruinas Célticas/Élficas
     (bosque, 1er Guardián) · 04 Reino Fúngico (micelial) · 05 Arena Gélida (hielo, 2º Guardián) ·
     06 Arena Acuática · 07 Laberinto (3er Guardián) · 08 Abismo · 09 Minas Profundas (la última
     antes del Infierno: el Umbral se cruza al final) · 10 Arena Infernal (4º Guardián: el Hechicero Supremo).
     (Decisión del usuario, 2026-09: las Minas pasan del 07 al 09 — son el camino físico al Infierno.)
   Arena Divina queda FUERA de las diez: postgame (se abre al completar la Infernal). */
const CAMPAIGN_ORDER = ["ciudad","fortaleza","bosque","micelial","hielo","acuatica","laberinto","abismo","minas","infernal"];
// Arenas JUGABLES en el orden canónico (lo que usan el desbloqueo, la sala online y los cierres de nivel).
const ARENA_ORDER = CAMPAIGN_ORDER.filter(k=>ARENA_MODS[k] && !ARENA_MODS[k].comingSoon);
// Orden anterior (para migrar guardados: nadie pierde una arena que ya tenía abierta).
const LEGACY_ARENA_ORDER_V1 = ["bosque","acuatica","fortaleza","micelial","hielo","abismo","laberinto","infernal"];
function campaignNumber(key){ const i = CAMPAIGN_ORDER.indexOf(key); return i < 0 ? 0 : i + 1; }
function campaignNumberLabel(key){ const n = campaignNumber(key); return n ? String(n).padStart(2, "0") : ""; }
