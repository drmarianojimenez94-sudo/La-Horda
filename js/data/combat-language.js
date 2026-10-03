"use strict";
/* ============================================================
   js/data/combat-language.js
   LENGUAJE VISUAL DE COMBATE — una señal significa siempre lo mismo en todo el juego.
   Game Bible: docs/bible/VISUAL_COMBAT_BIBLE.md.

   Cada señal combina COLOR + GLIFO/FORMA + MOVIMIENTO: nunca depende solo del color
   (accesibilidad). Lo leen los números flotantes (js/rendering/effects.js), el inspector de
   habilidades (long press), el panel táctico y el Códice. Agregar un estado = agregar una fila.
     color   relleno principal (contraste AA sobre el piso oscuro con su contorno)
     glyph   prefijo/sufijo o ícono que lo distingue sin color
     shape   forma del indicador en el mundo (anillo, rombo, chevrón...)
     motion  cómo se mueve (sube, late, cae, gira...)
     label   nombre corto para UI
   ============================================================ */
const COMBAT_LANGUAGE = {
  damage:      {color:"#fff1d6", glyph:"",   shape:"número",            motion:"sube y se desvanece",      label:"Daño"},
  crit:        {color:"#fff4c8", glyph:"!",  shape:"número grande con contorno rojo", motion:"pop + sube más alto", label:"Crítico"},
  heal:        {color:"#6fdc8c", glyph:"+",  shape:"número con cruz",   motion:"sube lento",               label:"Curación"},
  shield:      {color:"#8fd0ff", glyph:"◈",  shape:"rombo / burbuja",   motion:"aparece en el sitio y late", label:"Escudo"},
  dot:         {color:"#c9b8a0", glyph:"·",  shape:"número chico agrupado por objetivo", motion:"sube corto", label:"Daño en el tiempo"},
  taken:       {color:"#ff5a4a", glyph:"-",  shape:"número con signo menos", motion:"cae hacia abajo",     label:"Daño recibido"},
  stun:        {color:"#ffe36a", glyph:"✶",  shape:"estrellas girando sobre la cabeza", motion:"gira",       label:"Aturdido"},
  slow:        {color:"#9fe3ff", glyph:"▼",  shape:"chevrón hacia abajo", motion:"pulso lento",            label:"Ralentizado"},
  freeze:      {color:"#bfe8ff", glyph:"❄",  shape:"cristal",           motion:"quieto",                   label:"Congelado"},
  root:        {color:"#a8e070", glyph:"⌇",  shape:"raíces en los pies", motion:"quieto",                  label:"Inmovilizado"},
  burn:        {color:"#ff9a3c", glyph:"♨",  shape:"llamitas",          motion:"titila",                   label:"Quemado"},
  poison:      {color:"#9be35a", glyph:"☣",  shape:"burbujas",          motion:"burbujea",                 label:"Envenenado"},
  bleed:       {color:"#ff6a7e", glyph:"◆",  shape:"gotas",             motion:"gotea",                    label:"Sangrado"},
  curse:       {color:"#c9a0ff", glyph:"☠",  shape:"calavera",          motion:"late",                     label:"Maldito"},
  taunt:       {color:"#ffb04a", glyph:"⚑",  shape:"bandera",           motion:"late",                     label:"Provocado"},
  buff:        {color:"#ffd36a", glyph:"▲",  shape:"chevrón hacia arriba", motion:"sube",                  label:"Mejora"},
  debuff:      {color:"#d06aff", glyph:"▽",  shape:"chevrón hueco hacia abajo", motion:"baja",             label:"Debilitado"},
  invulnerable:{color:"#ffffff", glyph:"◯",  shape:"halo blanco",       motion:"brillo constante",         label:"Invulnerable"},
  aoe:         {color:"#ffffff", glyph:"○",  shape:"anillo en el piso", motion:"se expande",               label:"Área"},
  danger:      {color:"#ff3b30", glyph:"⚠",  shape:"área roja que se llena", motion:"se llena hasta el golpe", label:"Peligro"},
  ultimate:    {color:"#ffcf5c", glyph:"★",  shape:"estrella + destello de pantalla", motion:"explosión", label:"Definitiva"},
  objective:   {color:"#5cf0ff", glyph:"◎",  shape:"diana / flecha en el borde", motion:"late lento",     label:"Objetivo"}
};
// Formas de apuntado (inspector de habilidades, panel táctico, Códice).
const TARGETING_LANGUAGE = {
  point:   {glyph:"○", label:"Área en un punto"},
  cone:    {glyph:"△", label:"Cono frontal"},
  line:    {glyph:"→", label:"Proyectil en línea"},
  dash:    {glyph:"↝", label:"Desplazamiento"},
  target:  {glyph:"⌖", label:"Objetivo único"},
  self_aoe:{glyph:"◎", label:"Área alrededor propio"},
  self:    {glyph:"◉", label:"Sobre sí mismo"},
  ally:    {glyph:"✚", label:"Aliado"},
  passive: {glyph:"∞", label:"Pasiva"}
};
function combatSignal(key){ return COMBAT_LANGUAGE[key] || COMBAT_LANGUAGE.damage; }
