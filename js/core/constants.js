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
const REVIVE_DURATION_MS = 5000; // Same duration for players and bots.
const REVIVE_RANGE = 110; // qué tan cerca debe estar el jugador de un aliado caído para revivirlo
// Viewport del juego en UNIDADES DE MUNDO (ver js/core/canvas.js): el lado corto de la pantalla
// siempre muestra VIEW_WORLD_SHORT unidades (650 = lo que se veía en iPhone horizontal con el
// zoom 0,60 original), y el lado largo nunca más de VIEW_WORLD_LONG_MAX (pantallas muy anchas).
const VIEW_WORLD_SHORT = 650, VIEW_WORLD_LONG_MAX = 1500;
// Píxeles CSS por unidad de mundo. NO es fijo: lo calcula resize() a partir del viewport.
let CAM_ZOOM = 0.60;
// Cuánto queda el jugador (sus pies) ARRIBA del centro de la pantalla, en píxeles de pantalla
// (negativo = abajo del centro). Ya no es fijo: lo calcula camFitAnchor() (canvas.js) según el alto
// disponible descontando el HUD de arriba (barra de estado de la arena, jefe) y el de abajo (voz del
// Hechicero). Antes valía 34 siempre y en 844×390 el guardián quedaba en el tercio de arriba, pegado a
// la barra de la arena, con media pantalla vacía abajo (reseña #9).
let CAM_Y_ANCHOR = 34;
const LEVEL_COUNT = 10;
