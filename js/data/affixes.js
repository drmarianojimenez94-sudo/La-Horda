"use strict";
/* ============================================================
   js/data/affixes.js
   AFIJOS AL AZAR (prefijos y sufijos al estilo Diablo II): lo que hace que dos "Hachas" no sean
   iguales. La IDENTIDAD del objeto no cambia (su pasiva de pieza, su familia, su poder, su set o su
   Único siguen fijos, ver item-identity.js); los afijos son una capa de números encima:
     Común      → 2 afijos flojos    ("Hacha Ávida de la Presteza"; antes 1: los comunes aburrían, reseña §6.4 #3)
     Raro       → 2-3 afijos         ("Hacha Ávida de la Tormenta")
     Muy Raro   → 3-4 afijos         (su nombre de familia + el sufijo: "Hacha Escarchada de la Presteza")
     Legendario, Mítico, Set, Único → su identidad fija + 1-2 afijos (el nombre no cambia)
   Cada afijo usa un EFECTO REAL de passiveSum() (el mismo balde que ya consultan las fórmulas de
   daño, defensa, crítico, cooldown, resistencias...): ningún afijo es decorativo.
   Rango: [mín, máx] a la escala del Muy Raro; la rareza lo estira (AFFIX_RARITY_SCALE) y el nivel del
   objeto (Gemas) lo sube igual que al resto de sus números. El tooltip muestra el valor y su rango.
   Sin oro que compre poder de afuera: la Mística (re-tirar UN afijo) se paga con oro ganado jugando.
   >>> Todo el balance de los afijos se toca acá.
   ============================================================ */
// kind: "pre" (adjetivo, va pegado al sustantivo: "Hacha Ávida") o "suf" ("de la Tormenta").
// adj: con {o} para el género del sustantivo (mismo formato que ITEM_QUALITY). slots: dónde puede salir.
const AFFIX_DB = {
  afx_dmg:     {kind:"pre", adj:"Cruel",        effect:"dmg_mult",        range:[0.06, 0.12], slots:["arma","guantes"]},
  afx_crit:    {kind:"pre", adj:"Certer{o}",    effect:"crit_chance_add", range:[0.02, 0.05], slots:["arma","guantes","casco"]},
  afx_critdmg: {kind:"pre", adj:"Despiadad{o}", effect:"crit_mult_add",   range:[0.10, 0.24], slots:["arma","guantes"]},
  afx_leech:   {kind:"pre", adj:"Ávid{o}",      effect:"lifesteal_add",   range:[0.015,0.035],slots:["arma","guantes"]},
  afx_skill:   {kind:"pre", adj:"Encantad{o}",  effect:"skilldmg_mult",   range:[0.05, 0.12], slots:["arma","casco","guantes"]},
  afx_hp:      {kind:"pre", adj:"Robust{o}",    effect:"hp_mult",         range:[0.05, 0.10], slots:["casco","pechera","escudo","botas"]},
  afx_def:     {kind:"pre", adj:"Férre{o}",     effect:"def_add",         range:[0.02, 0.05], slots:["escudo","pechera","casco","botas"]},
  afx_heal:    {kind:"pre", adj:"Bendit{o}",    effect:"heal_mult",       range:[0.06, 0.14], slots:["casco","pechera","escudo","arma"]},
  afx_atk:     {kind:"suf", suf:"de la Presteza",  effect:"atkspeed_mult", range:[0.04, 0.09], slots:["arma","guantes"]},
  afx_cdr:     {kind:"suf", suf:"del Sabio",       effect:"cd_mult",       range:[0.03, 0.07], slots:["casco","arma","guantes"]},
  afx_speed:   {kind:"suf", suf:"del Viento",      effect:"speed_mult",    range:[0.03, 0.07], slots:["botas","guantes"]},
  afx_energy:  {kind:"suf", suf:"de la Vigilia",   effect:"energy_mult",   range:[0.06, 0.14], slots:["casco","pechera","arma"]},
  afx_resfire: {kind:"suf", suf:"de la Salamandra",effect:"res_fire",      range:[0.08, 0.18], slots:["escudo","pechera","casco","botas"]},
  afx_resice:  {kind:"suf", suf:"del Invierno",    effect:"res_ice",       range:[0.08, 0.18], slots:["escudo","pechera","casco","botas"]},
  afx_resltg:  {kind:"suf", suf:"de la Tormenta",  effect:"res_lightning", range:[0.08, 0.18], slots:["escudo","pechera","casco","botas","arma"]},
  afx_resphys: {kind:"suf", suf:"de la Piedra",    effect:"res_physical",  range:[0.04, 0.09], slots:["escudo","pechera","botas"]},
  afx_life2:   {kind:"suf", suf:"de la Ballena",   effect:"hp_mult",       range:[0.04, 0.08], slots:["pechera","escudo"]}
};
const AFFIX_IDS = Object.keys(AFFIX_DB);
// Cuántos afijos nacen en cada rareza [mín, máx]. Set = su rareza base (legendario/mítico) con esta regla.
const AFFIX_COUNT = {comun:[2,2], raro:[2,3], muyraro:[3,4], legendario:[1,2], mitico:[1,2], unico:[1,2]};
// La rareza estira el rango (un afijo de Común es la mitad de fuerte que el de un Legendario).
// El Común trae 2 afijos al 0,6: sigue muy por debajo del Raro (su valor base es la mitad), pero ya dice algo.
const AFFIX_RARITY_SCALE = {comun:0.6, raro:0.8, muyraro:1, legendario:1.15, mitico:1.3, unico:1.3};
// Rareza cuyo NOMBRE se arma con los afijos (los demás conservan el nombre de su identidad).
const AFFIX_NAMED_RARITY = {comun:1, raro:1};

/* ---------------- Mística: re-tirar UN afijo por oro (sumidero de oro, estilo D3) ---------------- */
// Costo = base de la rareza × crecimiento^(veces ya re-tiradas en ESE objeto). Como en D3, una vez que
// re-tirás un afijo, el objeto queda "atado" a ese afijo: solo ese se puede volver a re-tirar.
// La re-tirada muestra 2 opciones nuevas y podés quedarte con el original: nunca empeora a la fuerza.
// Nunca toca la rareza, la identidad, el set ni el Único (no crea Únicos ni cambia un Legendario).
const AFFIX_REROLL_BASE = {comun:40, raro:120, muyraro:320, legendario:900, set:1000, mitico:1600, unico:2200};
const AFFIX_REROLL_GROWTH = 1.45;
const AFFIX_REROLL_CAP = 60000;
const AFFIX_REROLL_OPTIONS = 2;
