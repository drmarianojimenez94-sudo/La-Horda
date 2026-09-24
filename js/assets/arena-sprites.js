"use strict";
/* ============================================================
   js/assets/arena-sprites.js
   Carga de los sprites de estructuras de la Arena Divina (assets/sprites/arenas/).
   ============================================================ */

// Estructuras de la Arena Divina por facción (Pack 5, recortadas de la hoja de referencia)
const DIVINA_FACTION_IMG = {};
DIVINA_FACTION_IMG.tower_cel_1 = new Image(); DIVINA_FACTION_IMG.tower_cel_1.src = "assets/sprites/arenas/divina/tower_cel_1.png";
DIVINA_FACTION_IMG.tower_cel_2 = new Image(); DIVINA_FACTION_IMG.tower_cel_2.src = "assets/sprites/arenas/divina/tower_cel_2.png";
DIVINA_FACTION_IMG.tower_cel_3 = new Image(); DIVINA_FACTION_IMG.tower_cel_3.src = "assets/sprites/arenas/divina/tower_cel_3.png";
DIVINA_FACTION_IMG.tower_cel_4 = new Image(); DIVINA_FACTION_IMG.tower_cel_4.src = "assets/sprites/arenas/divina/tower_cel_4.png";
DIVINA_FACTION_IMG.tower_inf_1 = new Image(); DIVINA_FACTION_IMG.tower_inf_1.src = "assets/sprites/arenas/divina/tower_inf_1.png";
DIVINA_FACTION_IMG.tower_inf_2 = new Image(); DIVINA_FACTION_IMG.tower_inf_2.src = "assets/sprites/arenas/divina/tower_inf_2.png";
DIVINA_FACTION_IMG.tower_inf_3 = new Image(); DIVINA_FACTION_IMG.tower_inf_3.src = "assets/sprites/arenas/divina/tower_inf_3.png";
DIVINA_FACTION_IMG.castle_cel = new Image(); DIVINA_FACTION_IMG.castle_cel.src = "assets/sprites/arenas/divina/castle_cel.png";
DIVINA_FACTION_IMG.castle_inf = new Image(); DIVINA_FACTION_IMG.castle_inf.src = "assets/sprites/arenas/divina/castle_inf.png";
/* ============================================================
   ARENA DIVINA — sprites reales de castillo/torre/proyectil (referencia del usuario). Mismo
   patron que el resto de sprites reales del juego: una imagen por frame, sin motor de grilla.
   ============================================================ */
const DIVINA_CASTLE_REAL_IMG = {};
const DIVINA_CASTLE_REAL_READY = {};
DIVINA_CASTLE_REAL_IMG.frame1 = new Image(); DIVINA_CASTLE_REAL_READY.frame1=false; DIVINA_CASTLE_REAL_IMG.frame1.onload=()=>{ DIVINA_CASTLE_REAL_READY.frame1=true; };
DIVINA_CASTLE_REAL_IMG.frame1.src = "assets/sprites/arenas/divina/castle-frame1.png";
DIVINA_CASTLE_REAL_IMG.frame2 = new Image(); DIVINA_CASTLE_REAL_READY.frame2=false; DIVINA_CASTLE_REAL_IMG.frame2.onload=()=>{ DIVINA_CASTLE_REAL_READY.frame2=true; };
DIVINA_CASTLE_REAL_IMG.frame2.src = "assets/sprites/arenas/divina/castle-frame2.png";

const DIVINA_TOWER_REAL_IMG = {};
const DIVINA_TOWER_REAL_READY = {};
DIVINA_TOWER_REAL_IMG.frame1 = new Image(); DIVINA_TOWER_REAL_READY.frame1=false; DIVINA_TOWER_REAL_IMG.frame1.onload=()=>{ DIVINA_TOWER_REAL_READY.frame1=true; };
DIVINA_TOWER_REAL_IMG.frame1.src = "assets/sprites/arenas/divina/tower-frame1.png";
DIVINA_TOWER_REAL_IMG.frame2 = new Image(); DIVINA_TOWER_REAL_READY.frame2=false; DIVINA_TOWER_REAL_IMG.frame2.onload=()=>{ DIVINA_TOWER_REAL_READY.frame2=true; };
DIVINA_TOWER_REAL_IMG.frame2.src = "assets/sprites/arenas/divina/tower-frame2.png";
DIVINA_TOWER_REAL_IMG.frame3 = new Image(); DIVINA_TOWER_REAL_READY.frame3=false; DIVINA_TOWER_REAL_IMG.frame3.onload=()=>{ DIVINA_TOWER_REAL_READY.frame3=true; };
DIVINA_TOWER_REAL_IMG.frame3.src = "assets/sprites/arenas/divina/tower-frame3.png";
DIVINA_TOWER_REAL_IMG.frame4 = new Image(); DIVINA_TOWER_REAL_READY.frame4=false; DIVINA_TOWER_REAL_IMG.frame4.onload=()=>{ DIVINA_TOWER_REAL_READY.frame4=true; };
DIVINA_TOWER_REAL_IMG.frame4.src = "assets/sprites/arenas/divina/tower-frame4.png";
DIVINA_TOWER_REAL_IMG.frame5 = new Image(); DIVINA_TOWER_REAL_READY.frame5=false; DIVINA_TOWER_REAL_IMG.frame5.onload=()=>{ DIVINA_TOWER_REAL_READY.frame5=true; };
DIVINA_TOWER_REAL_IMG.frame5.src = "assets/sprites/arenas/divina/tower-frame5.png";

const DIVINA_PROJ_REAL_IMG = {};
const DIVINA_PROJ_REAL_READY = {};
DIVINA_PROJ_REAL_IMG.frame1 = new Image(); DIVINA_PROJ_REAL_READY.frame1=false; DIVINA_PROJ_REAL_IMG.frame1.onload=()=>{ DIVINA_PROJ_REAL_READY.frame1=true; };
DIVINA_PROJ_REAL_IMG.frame1.src = "assets/vfx/divina/tower-projectile-frame1.png";
DIVINA_PROJ_REAL_IMG.frame2 = new Image(); DIVINA_PROJ_REAL_READY.frame2=false; DIVINA_PROJ_REAL_IMG.frame2.onload=()=>{ DIVINA_PROJ_REAL_READY.frame2=true; };
DIVINA_PROJ_REAL_IMG.frame2.src = "assets/vfx/divina/tower-projectile-frame2.png";
DIVINA_PROJ_REAL_IMG.frame3 = new Image(); DIVINA_PROJ_REAL_READY.frame3=false; DIVINA_PROJ_REAL_IMG.frame3.onload=()=>{ DIVINA_PROJ_REAL_READY.frame3=true; };
DIVINA_PROJ_REAL_IMG.frame3.src = "assets/vfx/divina/tower-projectile-frame3.png";
DIVINA_PROJ_REAL_IMG.frame4 = new Image(); DIVINA_PROJ_REAL_READY.frame4=false; DIVINA_PROJ_REAL_IMG.frame4.onload=()=>{ DIVINA_PROJ_REAL_READY.frame4=true; };
DIVINA_PROJ_REAL_IMG.frame4.src = "assets/vfx/divina/tower-projectile-frame4.png";
DIVINA_PROJ_REAL_IMG.frame5 = new Image(); DIVINA_PROJ_REAL_READY.frame5=false; DIVINA_PROJ_REAL_IMG.frame5.onload=()=>{ DIVINA_PROJ_REAL_READY.frame5=true; };
DIVINA_PROJ_REAL_IMG.frame5.src = "assets/vfx/divina/tower-projectile-frame5.png";
