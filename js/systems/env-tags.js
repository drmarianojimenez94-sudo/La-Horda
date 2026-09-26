"use strict";
/* ============================================================
   js/systems/env-tags.js
   TIPOS DE DAÑO, ESTADOS Y ETIQUETAS AMBIENTALES (data-driven).

   Separación que pide el diseño:
   - TIPO DE DAÑO = de qué está hecho el golpe (físico, fuego, hielo, rayo, sagrado, arcano,
     sombra/necrótico). Hoy el daño se resuelve igual para todos; el tipo sirve para las
     interacciones con el escenario y queda listo para resistencias futuras.
   - ESTADO = lo que el golpe deja en el objetivo (quemadura, ralentización, aturdimiento,
     escarcha, sangrado, maldición...). Viven en los campos de siempre (burnTimer, slowAmt,
     stunTimer, frostStacks, bleedTimer, cursed...).
   - ETIQUETA AMBIENTAL = lo que un efecto le hace al ESCENARIO. Una habilidad "emite" su
     etiqueta en un punto (envEmit) y cada arena escucha las que le importan (envOn).
     Así el Muro de Fuego prende un brasero de la Gélida sin que el Mago sepa que existe.

   Reacciones implementadas (todas en el anfitrión; el resultado viaja en el estado de la arena):
     fire      -> Gélida: enciende braseros apagados.   Ruinas: quema la maleza de una emboscada
                  (los que saltan salen ardiendo).
     ice       -> Infernal: enfría una fisura (+35 % del progreso para cerrarla).
     lightning -> Acuática: un rayo que toca a un enemigo parado en un charco conductor lo
                  descarga contra los ENEMIGOS del charco (a los héroes no).
   La matriz completa (qué habilidad real emite qué) está en docs/LA_HORDA_ABILITY_MATRIX.md.
   ============================================================ */
const DAMAGE_TYPES = {
  fisico:   {name:"Físico",   color:"#e8e0d0"},
  fuego:    {name:"Fuego",    color:"#ff7a2a", env:"fire"},
  hielo:    {name:"Hielo",    color:"#8fd0ff", env:"ice"},
  rayo:     {name:"Rayo",     color:"#ffe86a", env:"lightning"},
  sagrado:  {name:"Sagrado",  color:"#ffe79a"},
  arcano:   {name:"Arcano",   color:"#b98cff"},
  sombra:   {name:"Sombra / Necrótico", color:"#5ae68c"}
};
const STATUS_EFFECTS = {
  quemadura:    {field:"burnTimer",   name:"Quemadura"},
  ralentizado:  {field:"slowTimer",   name:"Ralentizado"},
  aturdido:     {field:"stunTimer",   name:"Aturdido"},
  escarcha:     {field:"frostStacks", name:"Escarcha (4 = congelado)"},
  sangrado:     {field:"bleedTimer",  name:"Sangrado"},
  maldito:      {field:"cursed",      name:"Maldito (Plaga)"},
  electrizado:  {field:"electrifiedTimer", name:"Electrizado"}
};
const ENV_LISTENERS = {};
// Una arena escucha una etiqueta: fn(x, y, src, o) — o.r = radio del efecto.
function envOn(tag, arena, fn){ (ENV_LISTENERS[tag] || (ENV_LISTENERS[tag] = [])).push({arena, fn}); }
// Una habilidad emite su etiqueta en un punto (solo tiene efecto donde alguien escucha).
function envEmit(tag, x, y, src, o){
  const ls = ENV_LISTENERS[tag]; if(!ls || typeof currentArena==="undefined" || (typeof divinaMode!=="undefined" && divinaMode)) return;
  if(netIsGuest()) return; // el escenario lo decide el anfitrión
  for(const l of ls){ if(l.arena==="*" || l.arena===currentArena){ try{ l.fn(x, y, src, o || {}); }catch(e){ console.error("envEmit", tag, e); } } }
}
