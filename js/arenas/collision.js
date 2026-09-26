"use strict";
/* ============================================================
   js/arenas/collision.js
   Límites de la arena y colisión con muros.
   ============================================================ */

function clampToArena(ent){
  // Musashi: mientras dura un Último Duelo, tanto él como su rival están anclados a la arena
  // de bolsillo (ver updateLastDuel, que ya los mantiene dentro de MUSASHI_DUEL_RADIUS cada
  // frame) -si se dejara pasar por el recorte de acá abajo, los mandaría de vuelta de un tirón
  // al octágono principal, a decenas de miles de píxeles de donde están parados-.
  if(ent.duelActive || ent.isDuelLocked) return;
  // Arenas con geometría propia (La Fortaleza: plataformas, puentes y puertas)
  if(arenaHas("clamp")){ arenaHook("clamp", ent); return; }
  // El coliseo es un octágono alargado: recortamos contra cada uno de sus 8 lados
  const R = ARENA_RADIUS*0.94, SX = 1.18, SY = 0.82;
  const nx = ent.x/SX, ny = ent.y/SY;
  const d = Math.hypot(nx, ny);
  const inradius = R*Math.cos(Math.PI/8);
  if(d > inradius){
    const ang = Math.atan2(ny, nx);
    const seg = Math.abs(((ang - Math.PI/8) % (Math.PI/4)) - Math.PI/8);
    const maxD = inradius/Math.cos(seg);
    if(d > maxD){
      ent.x = Math.cos(ang)*maxD*SX;
      ent.y = Math.sin(ang)*maxD*SY;
    }
  }
  if(!ent.cls && ent.rank && ent.rank!=="jefe" && AID_NAV.on) aidCollideEnemy(ent);
}

// ============================================================
// MUROS DEL LABERINTO MALDITO — bloquean el paso (solo en esta arena; en el resto,
// labyrinthWalls queda vacío y esto no hace nada). Son rectángulos rotados: se guarda su
// centro, largo, grosor y ángulo, y se resuelve la colisión pasando el punto al espacio
// local del muro (rotado a 0°) para un simple recorte de caja.
// ============================================================
let labyrinthWalls = [];
function buildLabyrinthWalls(){
  labyrinthWalls = [];
  // el resto de las arenas del coliseo también tienen muros propios (arena-blocks.js)
  if(!arenaMods().hasWalls){ labyrinthWalls = arenaBlockLayout(currentArena); return; }
  // Arena Identity V1: pasillos, cámaras y plazas diseñados (ver aidLabyrinthLayout) en vez de
  // tabiques al azar sobre anillos. Mismo formato {x,y,len,thick,rot} que usa la colisión.
  labyrinthWalls = aidLabyrinthLayout();
}
// Empuja a "ent" fuera de cualquier muro con el que se esté superponiendo
function resolveWallCollision(ent){
  resolveIceWalls(ent); // Muro de Hielo del Demonio de Hielo y Fuego (solo bloquea campeones)
  aidResolveCircles(ent, 0.9); // obstáculos sólidos del escenario (columnas, menhires, pilares...)
  if(!labyrinthWalls.length) return;
  const rad = ent.radius || 18;
  for(const w of labyrinthWalls){
    const dx = ent.x-w.x, dy = ent.y-w.y;
    const c = Math.cos(-w.rot), s = Math.sin(-w.rot);
    const lx = dx*c - dy*s, ly = dx*s + dy*c; // punto en el espacio local del muro
    const hw = w.len/2 + rad, hh = w.thick/2 + rad;
    if(Math.abs(lx) < hw && Math.abs(ly) < hh){
      const overlapX = hw - Math.abs(lx), overlapY = hh - Math.abs(ly);
      let pLx = lx, pLy = ly;
      if(overlapX < overlapY) pLx = lx>0 ? hw : -hw;
      else pLy = ly>0 ? hh : -hh;
      const cw = Math.cos(w.rot), sw = Math.sin(w.rot);
      ent.x = w.x + (pLx*cw - pLy*sw);
      ent.y = w.y + (pLx*sw + pLy*cw);
    }
  }
}
