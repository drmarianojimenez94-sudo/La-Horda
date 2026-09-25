"use strict";
/* ============================================================
   js/data/rewards.js
   DATOS del puntaje de desempeño por rol y de las probabilidades de rareza
   de las recompensas.
   ============================================================ */

// Fórmula de puntaje por rol: cada métrica se normaliza contra un valor de referencia
// ("una partida muy buena en esa métrica") y se pondera. Así ningún campeón se compara
// por números en bruto (daño vs. curación no son comparables), sino por qué tan cerca
// estuvo cada uno de una partida ejemplar EN SU PROPIO ROL. Todo esto es fácil de tocar
// después sin afectar el generador de recompensas.
// Umbrales pensados para que llegar a 100/100 sea difícil de verdad, no un resultado normal
// de jugar bien una partida — sobre todo mientras el multiplicador de XP de testeo siga alto.
const SCORE_CONFIG = {
  tanque: [
    {stat:"dmgTaken",          ref:7200,  weight:0.45},
    {stat:"enemiesControlled", ref:40,    weight:0.30},
    {stat:"presenceTicks",     ref:50,    weight:0.25}
  ],
  guerrero: [
    {stat:"kills",     ref:66,    weight:0.35},
    {stat:"dmgDealt",  ref:19500, weight:0.40},
    {stat:"dmgToBoss", ref:4700,  weight:0.25}
  ],
  mago: [
    {stat:"kills",       ref:58,    weight:0.30},
    {stat:"dmgDealt",    ref:18200, weight:0.35},
    {stat:"abilityHits", ref:110,   weight:0.35}
  ],
  soporte: [
    {stat:"healEffective", ref:9800, weight:0.45},
    {stat:"alliesSaved",   ref:16,   weight:0.20},
    {stat:"revives",       ref:8,    weight:0.20},
    {stat:"buffsGranted",  ref:29,   weight:0.15}
  ],
  profeta: [
    {stat:"healEffective", ref:9200, weight:0.40},
    {stat:"alliesSaved",   ref:14,   weight:0.25},
    {stat:"revives",       ref:7,    weight:0.20},
    {stat:"dmgDealt",      ref:9000, weight:0.15}
  ]
};
// Pedido explícito: el sistema de recompensas se comparte por CLASE DE ROL, no una fórmula
// bespoke por campeón. Axiom se mide como mago, el Segador Olvidado ("Berserk") como tanque,
// Musashi y la Cazadora del Bosque como asesino/guerrero, el Nigromante como mago -mismas
// referencias (SCORE_CONFIG.mago/tanque/guerrero), no copias, así un ajuste de balance futuro
// a esa fórmula base se propaga sola a todos los que la comparten-. Antes Axiom/Segador ni
// siquiera tenían entrada (bug real: sacaban 0/100 de puntaje siempre, ver commits previos).
SCORE_CONFIG.axiom = SCORE_CONFIG.mago;
SCORE_CONFIG.segador = SCORE_CONFIG.tanque;
SCORE_CONFIG.musashi = SCORE_CONFIG.guerrero;
SCORE_CONFIG.cazadora = SCORE_CONFIG.guerrero;
SCORE_CONFIG.nigromante = SCORE_CONFIG.mago;

// Probabilidades de rareza: se interpola entre una tabla "puntaje bajo" y una tabla
// "puntaje alto" según el desempeño (0-100). El azar sigue existiendo siempre: incluso con
// puntaje 100 la chance de Único es baja, nunca se garantiza. Todo centralizado acá.
// Único debe ser EXTREMADAMENTE difícil: ni siquiera con el jefe derrotado y la partida
// jugada a la perfección (puntaje 100) debería superar ~1% de probabilidad. El resto de la
// escala mítico/legendario queda igual de accesible que antes.
const RARITY_WEIGHTS_LOW  = {comun:54, raro:29, muyraro:13.5, legendario:4.7, mitico:1.4, unico:0.06};
const RARITY_WEIGHTS_HIGH = {comun:18, raro:26, muyraro:27,   legendario:19,  mitico:9,   unico:1.0};
// Afinidad de objetos por campeón: no es una restricción dura, es un peso de probabilidad
// (así se puede ampliar a más campeones/objetos después sin reescribir esto). Guantes/botas
// pesan igual para todos (velocidad de ataque/movimiento le sirve a cualquiera); lo que cambia
// por campeón es cuánto le interesa daño puro (arma) contra supervivencia (escudo/casco/pechera).
const CHAMP_ITEM_AFFINITY = {
  tanque:   {arma:0.10, escudo:0.24, casco:0.20, pechera:0.22, guantes:0.12, botas:0.12},
  guerrero: {arma:0.30, escudo:0.08, casco:0.12, pechera:0.14, guantes:0.20, botas:0.16},
  mago:     {arma:0.30, escudo:0.08, casco:0.12, pechera:0.14, guantes:0.16, botas:0.20},
  soporte:  {arma:0.14, escudo:0.18, casco:0.16, pechera:0.18, guantes:0.16, botas:0.18},
  segador:  {arma:0.22, escudo:0.14, casco:0.14, pechera:0.18, guantes:0.18, botas:0.14},
  axiom:    {arma:0.22, escudo:0.10, casco:0.14, pechera:0.14, guantes:0.18, botas:0.22},
  profeta:  {arma:0.16, escudo:0.14, casco:0.16, pechera:0.18, guantes:0.16, botas:0.20},
  musashi:  {arma:0.34, escudo:0.06, casco:0.10, pechera:0.12, guantes:0.20, botas:0.18},
  cazadora: {arma:0.30, escudo:0.06, casco:0.10, pechera:0.12, guantes:0.20, botas:0.22},
  nigromante: {arma:0.22, escudo:0.10, casco:0.14, pechera:0.16, guantes:0.16, botas:0.22}
};
