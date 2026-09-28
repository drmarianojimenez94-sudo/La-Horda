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
// Centro de la pantalla en el mundo (y): el jugador no está en el medio, está CAM_Y_ANCHOR px arriba
// o abajo (camFitAnchor, canvas.js). Los recortes "qué se ve" se centran acá, no en el jugador.
function camCenterY(){ return player.y - CAM_LIFT + CAM_LEAD_Y + CAM_Y_ANCHOR/CAM_ZOOM; }
function inView(x, y, pad){
  pad = pad || 140;
  const hw = VW/2/CAM_ZOOM + pad, hh = VH/2/CAM_ZOOM + pad;
  return Math.abs(x-(player.x + CAM_LEAD_X)) < hw && Math.abs(y-camCenterY()) < hh;
}
// (CAM_LEAD_X/Y: adelanto suave de la cámara hacia donde se apunta, ver juice.js; 0 con "Reducir movimiento")
function worldToScreen(x,y){
  return { x: VW/2 + (x-(player.x + CAM_LEAD_X))*CAM_ZOOM, y: (VH/2 - CAM_Y_ANCHOR) + (y-(player.y - CAM_LIFT + CAM_LEAD_Y))*CAM_ZOOM };
}
