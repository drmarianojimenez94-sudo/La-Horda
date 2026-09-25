"use strict";
/* ============================================================
   js/core/constants.js
   Constantes generales del mundo: radio de la arena, cámara, niveles por arena.
   ============================================================ */

/* ============================================================
   TUNING
   ============================================================ */
const ARENA_RADIUS = 1050;
// Radio de la órbita del Leviatán: fijo respecto del CENTRO del escenario (no del jugador),
// bastante adentro del límite jugable (ver clampToArena) para que acercarse de verdad acerque
// -antes orbitaba siempre pegado al jugador y la distancia real nunca cambiaba-.
const LEVIATAN_ORBIT_R = ARENA_RADIUS*0.62;
const REVIVE_RANGE = 110; // qué tan cerca debe estar el jugador de un aliado caído para revivirlo
// Viewport del juego en UNIDADES DE MUNDO (ver js/core/canvas.js): el lado corto de la pantalla
// siempre muestra VIEW_WORLD_SHORT unidades (650 = lo que se veía en iPhone horizontal con el
// zoom 0,60 original), y el lado largo nunca más de VIEW_WORLD_LONG_MAX (pantallas muy anchas).
const VIEW_WORLD_SHORT = 650, VIEW_WORLD_LONG_MAX = 1500;
// Píxeles CSS por unidad de mundo. NO es fijo: lo calcula resize() a partir del viewport.
let CAM_ZOOM = 0.60;
// Desplaza el punto de anclaje del jugador hacia arriba en la pantalla (en píxeles de pantalla),
// dejando algo de espacio libre abajo -donde está el joystick- para revivir aliados sin tocarlo,
// pero sin subir tanto como para que el personaje quede tapado por el botón de pausa (arriba).
const CAM_Y_ANCHOR = 34;
const LEVEL_COUNT = 10;
