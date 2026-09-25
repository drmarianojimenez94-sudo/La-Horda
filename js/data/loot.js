"use strict";
/* ============================================================
   js/data/loot.js
   TABLAS DEL BOTÍN (Loot & Progression V1). El loot importante sale del COFRE DEL JEFE al
   terminar: pocas piezas, y lo emocionante es la RAREZA, no la cantidad.
     recompensa = ARENA (tabla base) × CALIFICACIÓN (C..S+) × RESULTADO (victoria/derrota)
                  + protección suave contra la mala suerte (oculta)
   Categorías: común (blanco) · raro (azul) · muy raro (amarillo) · legendario (naranja) ·
   SET (verde, sinergia entre piezas) · mítico (rojo). Único (violeta) ya no cae: se conserva
   solo para los guardados que ya lo tienen.
   >>> Todo el balance del botín se toca acá.
   ============================================================ */
const LOOT_TIERS = ["comun","raro","muyraro","legendario","set","mitico"];
const LOOT_TIER_META = {
  comun:{label:"Común", color:"#e8e8ec"}, raro:{label:"Raro", color:"#4fa8f0"}, muyraro:{label:"Muy Raro", color:"#ffe14a"},
  legendario:{label:"Legendario", color:"#ffb020"}, set:{label:"Set", color:"#3ddc71"}, mitico:{label:"Mítico", color:"#ff4d4d"}
};
// Probabilidad (pesos) de cada categoría por objeto, con calificación A. La diferencia entre
// arenas es de PROBABILIDADES, no de cantidad.
const ARENA_LOOT = {
  bosque:    {comun:62, raro:28, muyraro:8,  legendario:1.5, set:0.35, mitico:0.08},
  acuatica:  {comun:46, raro:35, muyraro:15, legendario:3.0, set:0.8,  mitico:0.2},
  fortaleza: {comun:38, raro:36, muyraro:20, legendario:4.5, set:1.2,  mitico:0.22},
  hielo:     {comun:31, raro:37, muyraro:24, legendario:6.0, set:1.6,  mitico:0.25},
  laberinto: {comun:18, raro:33, muyraro:35, legendario:9.5, set:3.5,  mitico:0.55},
  infernal:  {comun:8,  raro:25, muyraro:38, legendario:16,  set:9,    mitico:1.6}
};
ARENA_LOOT.divina = ARENA_LOOT.laberinto;
const ARENA_LOOT_LABEL = {bosque:"Introducción", acuatica:"Intermedia", fortaleza:"Intermedia-alta", hielo:"Media-alta", laberinto:"Avanzada", infernal:"Endgame", divina:"Avanzada"};
// La calificación mejora las probabilidades de lo raro (más cuanto más rara la categoría),
// sin garantizar nada: peso × factor^exponente, y "común" absorbe la diferencia.
const GRADE_LOOT = {
  C:  {factor:0.60, extra:0.10},
  B:  {factor:0.80, extra:0.30},
  A:  {factor:1.00, extra:0.50},
  S:  {factor:1.25, extra:0.68},
  "S+":{factor:1.50, extra:0.82}
};
const TIER_EXP = {comun:0, raro:0.5, muyraro:1, legendario:1.5, set:1.5, mitico:2};
// Cantidad: la victoria da 1 objeto seguro + 1 extra con probabilidad `extra` de la calificación;
// cada subjefe derrotado suma +10% a ese extra y hay un 2º extra (máx. 3) con la mitad.
const LOOT_MAX_ITEMS = 3;
// Derrota: con suerte, un objeto de consuelo (desde el nivel 6), sin categorías altas casi nunca.
// Perder (o abandonar) después de pelear el nivel 6 (subjefe) deja SIEMPRE un objeto de consuelo;
// la XP y el oro sí se castigan (ver applyArenaFailurePenalty).
const DEFEAT_LOOT = {minLevel:6, chance:1, gradeCap:"B", highTierMult:0.25};
// Protección suave contra la mala suerte: cada VICTORIA sin la categoría sube un poco su
// probabilidad (tope), y se reinicia cuando cae. Oculta para el jugador.
const LOOT_PITY = {
  legendario:{step:0.06, cap:0.60},
  set:       {step:0.05, cap:0.80},
  mitico:    {step:0.04, cap:0.50}
};
// De qué sets tiene "sabor" cada arena (peso relativo; los que no figuran: 0, salvo Infernal
// que tiene acceso a toda la tabla). Algunos jefes empujan su set temático.
const SET_ARENA_WEIGHTS = {
  bosque:    {alba:3, cazador:2, sepulturero:2, guardian:1},
  acuatica:  {tempestad:3, laberinto:2, glaciar:2, alba:1},
  fortaleza: {coloso:3, guardian:3, berserker:2, tempestad:1},
  hielo:     {glaciar:4, coloso:2, arcano:2, guardian:1},
  laberinto: {laberinto:4, coloso:3, guardian:3, cazador:1, arcano:1},
  infernal:  {lucifer:4, berserker:3, glaciar:1, coloso:1, sepulturero:1, tempestad:1, guardian:1, alba:1, cazador:1, arcano:1, laberinto:1},
  divina:    {laberinto:2, coloso:2, guardian:2, cazador:2, arcano:2, tempestad:2}
};
// Sets en los que ya tenés piezas pesan más (se puede perseguir uno), y las piezas que te
// faltan pesan más que las repetidas (los duplicados existen, pero no dominan).
const SET_OWNED_BIAS = 1.7, SET_MISSING_PIECE_BIAS = 2.2;
