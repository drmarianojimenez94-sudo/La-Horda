"use strict";
/* ============================================================
   js/rendering/camera.js
   Cámara: qué está a la vista y conversión de coordenadas del mundo a la pantalla.
   ============================================================ */

function inView(x, y, pad){
  pad = pad || 140;
  const hw = VW/2/CAM_ZOOM + pad, hh = VH/2/CAM_ZOOM + pad;
  return Math.abs(x-player.x) < hw && Math.abs(y-player.y) < hh;
}

function worldToScreen(x,y){
  return { x: VW/2 + (x-player.x)*CAM_ZOOM, y: (VH/2 - CAM_Y_ANCHOR) + (y-player.y)*CAM_ZOOM };
}
