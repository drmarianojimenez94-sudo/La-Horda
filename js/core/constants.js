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
const CAM_ZOOM = 0.60; // aleja la cámara: el jugador se ve más pequeño y entran más enemigos en pantalla
// Desplaza el punto de anclaje del jugador hacia arriba en la pantalla (en píxeles de pantalla),
// dejando algo de espacio libre abajo -donde está el joystick- para revivir aliados sin tocarlo,
// pero sin subir tanto como para que el personaje quede tapado por el botón de pausa (arriba).
const CAM_Y_ANCHOR = 34;
const LEVEL_COUNT = 10;
