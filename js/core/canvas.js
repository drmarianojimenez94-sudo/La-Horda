"use strict";
/* ============================================================
   js/core/canvas.js
   Canvas principal del juego, su resolución y la escala de la cámara.

   Cuatro cosas separadas (antes estaban mezcladas y en iPhone la cámara podía verse
   demasiado cerca o la imagen estirada):
   - TAMAÑO CSS (VW×VH): lo que MIDE DE VERDAD el canvas en pantalla (su propia caja), no
     window.innerWidth/innerHeight, que iOS informa tarde al rotar o al mostrar/ocultar la barra
     de Safari. Si el buffer no tiene la misma proporción que la caja, la imagen se deforma.
   - RESOLUCIÓN INTERNA (canvas.width/height) = tamaño CSS × DPR (devicePixelRatio, tope 2).
   - DPR: se vuelve a leer en cada ajuste (cambia con el zoom de página de Safari "aA").
   - ESCALA DE CÁMARA (CAM_ZOOM, píxeles CSS por unidad de mundo): sale del VIEWPORT DEL JUEGO,
     que se define en unidades de mundo: siempre se ven VIEW_WORLD_SHORT unidades en el lado corto
     (y nunca más de VIEW_WORLD_LONG_MAX en el largo). Así la arena se ve igual en cualquier
     pantalla, orientación, zoom de página o recarga: los personajes ocupan siempre la misma
     proporción de la pantalla.
   Se reajusta en resize/orientationchange/visualViewport y, por las dudas, cada cuadro se
   compara la caja real con la guardada (barato) y se corrige si iOS no avisó.
   Las pruebas de tools/regression/t_camera.js vigilan que esto no vuelva a romperse.
   ============================================================ */
const canvas = document.getElementById("game");
let ctx = canvas.getContext("2d"); // let (no const): la previsualización de campeones lo pisa un instante para dibujar en su propio canvas chico
let VW = 0, VH = 0, DPR = 1;
function computeCamZoom(w, h){
  return Math.max(Math.min(w, h)/VIEW_WORLD_SHORT, Math.max(w, h)/VIEW_WORLD_LONG_MAX);
}
function _viewportBox(){
  // la caja real del canvas (100% de #stage); si todavía no hay layout, la ventana
  let w = canvas.clientWidth, h = canvas.clientHeight;
  if(!w || !h){ w = window.innerWidth; h = window.innerHeight; }
  return {w:Math.max(1, Math.round(w)), h:Math.max(1, Math.round(h))};
}
function resize(force){
  const b = _viewportBox(), dpr = Math.min(window.devicePixelRatio||1, 2);
  if(!force && b.w===VW && b.h===VH && dpr===DPR) return false;
  VW = b.w; VH = b.h; DPR = dpr;
  canvas.width = Math.round(VW*DPR); canvas.height = Math.round(VH*DPR);
  // relación exacta buffer/CSS en cada eje (sin redondeos que estiren un eje más que el otro)
  ctx.setTransform(canvas.width/VW, 0, 0, canvas.height/VH, 0, 0);
  // cambiar el tamaño del canvas reinicia el contexto: el suavizado vuelve a "true" y los
  // sprites de pixel art se ven borrosos. Se apaga de nuevo acá, siempre.
  ctx.imageSmoothingEnabled = false;
  CAM_ZOOM = computeCamZoom(VW, VH);
  return true;
}
// Chequeo por cuadro: si la caja real cambió y el navegador no avisó, se corrige.
function ensureCanvasSize(){
  if(canvas.clientWidth !== VW || canvas.clientHeight !== VH || Math.min(window.devicePixelRatio||1, 2) !== DPR) resize();
}
window.addEventListener("resize", ()=>resize());
window.addEventListener("orientationchange", ()=>{ resize(); setTimeout(()=>resize(), 250); });
if(window.visualViewport) window.visualViewport.addEventListener("resize", ()=>resize());
resize(true);
