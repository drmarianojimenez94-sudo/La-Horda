"use strict";
/* ============================================================
   js/data/ground-loot.js
   BOTÍN EN EL PISO (datos y balance; la lógica está en js/systems/ground-loot.js).
   Durante la partida, élites, subjefes y jefes (y muy de vez en cuando la horda común) sueltan
   OBJETOS REALES al piso, con un haz de luz del color de su rareza y su nombre al acercarse.
   El cofre del final queda como bonus: esto es lo que se ve caer MIENTRAS se pelea.
   - Cada jugador tiene SU botín (instanciado, como en Diablo III): el anfitrión decide por separado
     si a cada uno le cae algo y de qué calidad; la rareza se tira con la protección contra la mala
     suerte de CADA guardado (js/data/loot.js, LOOT_PITY) y cada uno lo ve y lo levanta solo.
   - La tabla de rarezas es la de siempre (ARENA_LOOT × calificación). Lo que cambia por fuente es la
     CALIFICACIÓN y un multiplicador para lo alto (Legendario, Mítico, Set, Único): la horda común casi
     nunca suelta algo grande; el jefe, como el cofre.
   Medido con tools/balance/groundloot_econ.js (objetos, oro de venta y Legendarios por partida).
   >>> Todo el balance del botín en el piso se toca acá.
   ============================================================ */
const GROUND_LOOT_CFG = {
  // Probabilidad de que un enemigo de ese rango le suelte un objeto a CADA jugador.
  // (reseña §6.4 #3: antes caían 0-5 objetos por partida en las arenas 1-4; la horda común ×5, las
  // élites ×2 y las élites con nombre, ahora 4-8 por partida -elite-affixes.js-, sueltan casi siempre)
  chance: {normal:0.005, subelite:0.012, elite:0.10, named:0.75, subjefe:1, jefe:1},
  // Cuántos objetos [mín, máx] cuando cae (subjefe y jefe: siempre).
  count:  {normal:[1,1], subelite:[1,1], elite:[1,1], named:[1,2], subjefe:[1,2], jefe:[2,3]},
  // LEGENDARIO QUE CAMBIA LA BUILD (js/data/legendaries.js, BUILD_LEGENDARIES): tirada APARTE, desde la
  // arena BUILD_LEGEND_MIN_ARENA de la campaña: 0,2-0,6 por partida en el piso (tools/balance/groundloot_econ.js).
  buildChance: {named:0.03, subjefe:0.04, jefe:0.10},
  // Calificación con la que se tira la rareza (misma escala que el cofre: C..S+).
  grade:  {normal:"C", subelite:"C", elite:"B", named:"A", subjefe:"A", jefe:"S"},
  // Multiplicador de Legendario/Mítico/Set/Único por fuente (la horda común no llueve legendarios).
  highMult:{normal:0.05, subelite:0.08, elite:0.15, named:0.2, subjefe:0.3, jefe:0.45},
  pickR: 52,          // radio para levantarlo al pasar por encima
  btnR: 120,          // radio del botón contextual "Levantar"
  nameR: 300,         // a esta distancia aparece el nombre flotante (Legendario o más: siempre en pantalla)
  maxOnFloor: 16,     // tope por jugador (si se llena, lo más viejo y más común se levanta solo)
  scatter: 46         // dispersión alrededor del cadáver
};
// Haz de luz por categoría (rgb). Común gris, Raro azul, Muy Raro amarillo (el "raro" de Diablo II),
// Legendario dorado (el haz de Diablo III), Mítico rojo, Set verde, Único violeta.
const GROUND_BEAM = {comun:"170,170,182", raro:"79,168,240", muyraro:"255,225,74", legendario:"255,176,32", mitico:"255,77,77", set:"61,220,113", unico:"176,106,255"};
// Alto del haz (px de mundo) por categoría: lo raro se ve desde lejos.
const GROUND_BEAM_H = {comun:0, raro:90, muyraro:140, legendario:240, mitico:260, set:250, unico:300};
// Sonido al caer (motor de audio existente: los mismos del cofre).
const GROUND_SFX = {comun:"lootCommon", raro:"lootRare", muyraro:"lootVeryRare", legendario:"lootLegend", mitico:"lootMythic", set:"lootSet", unico:"lootUnique"};
// INVENTARIO LLENO (30 espacios): con más botín en el piso, el inventario se llenaba en una partida.
// Regla única (se avisa en pantalla al levantar y en el inventario): con el inventario lleno, un Común o
// un Raro que levantás se RECICLA solo en polvo de Gema; si lo que levantás es mejor, se recicla el Común
// (después el Raro) de menor nivel que tengas guardado sin equipar, para hacerle lugar. Lo diseñado
// (con nombre, sets, míticos, únicos), lo equipado y lo Muy Raro o mejor nunca se reciclan solos.
// Valor en Gemas (se acumula en save.recycleDust hasta completar una Gema entera).
const RECYCLE_GEM = {comun:0.25, raro:0.5};
