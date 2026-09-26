"use strict";
/* ============================================================
   js/rendering/camera.js
   Cámara: qué está a la vista y conversión de coordenadas del mundo a la pantalla.
   ============================================================ */

// CAM_LIFT: la cámara se levanta (unidades del mundo) para que entre un jefe enorme que está
// arriba del jugador (La Madre Espora). 0 en el resto del juego: la cámara sigue centrada en `player`.
let CAM_LIFT = 0;
function updateCamLift(){
  const want = (state==="playing" && !player.duelActive && arenaHas("camLift")) ? (arenaHook("camLift")||0) : 0;
  CAM_LIFT += (want - CAM_LIFT)*0.06;
  if(Math.abs(CAM_LIFT) < 0.5 && want===0) CAM_LIFT = 0;
}
function inView(x, y, pad){
  pad = pad || 140;
  const hw = VW/2/CAM_ZOOM + pad, hh = VH/2/CAM_ZOOM + pad;
  return Math.abs(x-player.x) < hw && Math.abs(y-(player.y - CAM_LIFT)) < hh;
}

function worldToScreen(x,y){
  return { x: VW/2 + (x-player.x)*CAM_ZOOM, y: (VH/2 - CAM_Y_ANCHOR) + (y-(player.y - CAM_LIFT))*CAM_ZOOM };
}
