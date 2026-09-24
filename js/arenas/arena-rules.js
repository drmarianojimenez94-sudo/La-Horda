"use strict";
/* ============================================================
   js/arenas/arena-rules.js
   Reglas de arena: modificadores activos y desbloqueo.
   ============================================================ */

function arenaMods(){ return ARENA_MODS[currentArena] || ARENA_MODS.bosque; }
function isArenaUnlocked(key){ return true; } // demo: todo desbloqueado. Acá va la condición real después.
