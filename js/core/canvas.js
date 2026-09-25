"use strict";
/* ============================================================
   js/core/canvas.js
   Canvas principal del juego y su ajuste al tamaño de la pantalla.
   ============================================================ */

/* ============================================================
   CANVAS / RESIZE
   ============================================================ */
const canvas = document.getElementById("game");
let ctx = canvas.getContext("2d"); // let (no const): la previsualización de campeones lo pisa un instante para dibujar en su propio canvas chico
let VW=window.innerWidth, VH=window.innerHeight, DPR=Math.min(window.devicePixelRatio||1,2);
function resize(){
  VW = window.innerWidth; VH = window.innerHeight;
  canvas.width = VW*DPR; canvas.height = VH*DPR;
  ctx.setTransform(DPR,0,0,DPR,0,0);
}
window.addEventListener("resize", resize);
resize();
