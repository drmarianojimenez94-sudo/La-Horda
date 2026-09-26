"use strict";
/* ============================================================
   js/data/loot.js
   TABLAS DEL BOTÍN (Loot & Progression V1). El loot importante sale del COFRE DEL JEFE al
   terminar: pocas piezas, y lo emocionante es la RAREZA, no la cantidad.
     recompensa = ARENA (tabla base) × CALIFICACIÓN (C..S+) × RESULTADO (victoria/derrota)
                  + protección suave contra la mala suerte (oculta)
   Categorías: común (blanco) · raro (azul) · muy raro (amarillo) · legendario (naranja) ·
   mítico (rojo) · SET (verde, sinergia entre piezas) · ÚNICO (violeta, jackpot: extraordinariamente raro).
   El botín es CRUZADO: puede caer un objeto de cualquier campeón (va al inventario de la cuenta).
   >>> Todo el balance del botín se toca acá.
   ============================================================ */
const LOOT_TIERS = ["comun","raro","muyraro","legendario","mitico","set","unico"];
const LOOT_TIER_META = {
  comun:{label:"Común", color:"#e8e8ec"}, raro:{label:"Raro", color:"#4fa8f0"}, muyraro:{label:"Muy Raro", color:"#ffe14a"},
  legendario:{label:"Legendario", color:"#ffb020"}, mitico:{label:"Mítico", color:"#ff4d4d"}, set:{label:"Set", color:"#3ddc71"},
  unico:{label:"Único", color:"#b06aff"}
};
// Probabilidad (pesos) de cada categoría por objeto, con calificación A. La diferencia entre
// arenas es de PROBABILIDADES, no de cantidad.
// Calibrado con simulación (tools/balance/lootsim.js, ver LA_HORDA_PROGRESSION_ECONOMY_REPORT.md):
// el Legendario emociona (no llueve), el Mítico directo es raro (su camino normal es la RECETA),
// el Set es muy especial y el Único es un acontecimiento (del orden de 1 cada varios miles de objetos).
const ARENA_LOOT = {
  bosque:    {comun:66, raro:26, muyraro:6.5, legendario:1.0,  mitico:0.03, set:0.08, unico:0.001},
  acuatica:  {comun:52, raro:34, muyraro:11,  legendario:2.0,  mitico:0.06, set:0.20, unico:0.002},
  fortaleza: {comun:45, raro:37, muyraro:14,  legendario:2.8,  mitico:0.08, set:0.35, unico:0.003},
  micelial:  {comun:42, raro:38, muyraro:15.5,legendario:3.2,  mitico:0.10, set:0.40, unico:0.004},
  hielo:     {comun:39, raro:38, muyraro:17,  legendario:4.0,  mitico:0.12, set:0.50, unico:0.005},
  laberinto: {comun:28, raro:37, muyraro:26,  legendario:6.0,  mitico:0.30, set:1.00, unico:0.012},
  infernal:  {comun:16, raro:34, muyraro:36,  legendario:10.0, mitico:0.80, set:2.00, unico:0.025}
};
ARENA_LOOT.divina = ARENA_LOOT.laberinto;
const ARENA_LOOT_LABEL = {bosque:"Introducción", acuatica:"Intermedia", fortaleza:"Intermedia-alta", micelial:"Intermedia-alta", hielo:"Media-alta", laberinto:"Avanzada", infernal:"Endgame", divina:"Avanzada"};
// La calificación mejora las probabilidades de lo raro (más cuanto más rara la categoría),
// sin garantizar nada: peso × factor^exponente, y "común" absorbe la diferencia.
const GRADE_LOOT = {
  C:  {factor:0.60, extra:0.10},
  B:  {factor:0.80, extra:0.30},
  A:  {factor:1.00, extra:0.50},
  S:  {factor:1.25, extra:0.68},
  "S+":{factor:1.50, extra:0.82}
};
const TIER_EXP = {comun:0, raro:0.5, muyraro:1, legendario:1.5, set:1.6, mitico:2, unico:2.2};
// Cantidad: la victoria da 1 objeto seguro + 1 extra con probabilidad `extra` de la calificación;
// cada subjefe derrotado suma +10% a ese extra y hay un 2º extra (máx. 3) con la mitad.
const LOOT_MAX_ITEMS = 3;
// Derrota: con suerte, un objeto de consuelo (desde el nivel 6), sin categorías altas casi nunca.
// Perder (o abandonar) después de pelear el nivel 6 (subjefe) deja SIEMPRE un objeto de consuelo;
// la XP y el oro sí se castigan (ver applyArenaFailurePenalty).
const DEFEAT_LOOT = {minLevel:6, chance:1, gradeCap:"B", highTierMult:0.25}; // highTierMult: Legendario, Mítico, Set y Único
// Protección suave contra la mala suerte: cada VICTORIA sin la categoría sube un poco su
// probabilidad (tope), y se reinicia cuando cae. Oculta para el jugador.
// El Único respeta su rareza: su protección es mínima (tras 200 victorias sin verlo, x1,8).
const LOOT_PITY = {
  legendario:{step:0.06, cap:0.60},
  mitico:    {step:0.04, cap:0.50},
  set:       {step:0.05, cap:0.80},
  unico:     {step:0.004, cap:0.80}
};
// Qué clase de objeto sale cuando la categoría es Legendario / Mítico / Único.
const LEGEND_SOURCE = {named:0.62, champion:0.13, procedural:0.25}; // con nombre (receta) · de un campeón · procedural con nombre
const MYTHIC_SOURCE = {recipe:0.70, champion:0.30};
// Botín cruzado: si sale un objeto propio de un campeón, es del que estás jugando con esta probabilidad
// (si no, de cualquier otro: colección, venta, futuro intercambio).
const CROSS_DROP_OWN_CHAMP = 0.5;
// Legendarios con nombre que te faltan para una receta que ya empezaste pesan más (objetivo de farmeo).
const RECIPE_MISSING_BIAS = 1.8;
// De qué sets tiene "sabor" cada arena (peso relativo; los que no figuran: 0, salvo Infernal
// que tiene acceso a toda la tabla). Algunos jefes empujan su set temático.
const SET_ARENA_WEIGHTS = {
  bosque:    {alba:3, cazador:2, sepulturero:2, guardian:1},
  acuatica:  {tempestad:3, laberinto:2, glaciar:2, alba:1},
  fortaleza: {coloso:3, guardian:3, berserker:2, tempestad:1},
  micelial:  {sepulturero:3, arcano:3, cazador:2, alba:1},
  hielo:     {glaciar:4, coloso:2, arcano:2, guardian:1},
  laberinto: {laberinto:4, coloso:3, guardian:3, cazador:1, arcano:1},
  infernal:  {lucifer:4, berserker:3, glaciar:1, coloso:1, sepulturero:1, tempestad:1, guardian:1, alba:1, cazador:1, arcano:1, laberinto:1},
  divina:    {laberinto:2, coloso:2, guardian:2, cazador:2, arcano:2, tempestad:2}
};
// Sets en los que ya tenés piezas pesan más (se puede perseguir uno), y las piezas que te
// faltan pesan más que las repetidas (los duplicados existen, pero no dominan).
const SET_OWNED_BIAS = 1.7, SET_MISSING_PIECE_BIAS = 2.2;
