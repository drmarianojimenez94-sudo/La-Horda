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
let ctx = canvas.getContext("2d"); // let (no const): la previsualización de guardianes lo pisa un instante para dibujar en su propio canvas chico
let VW = 0, VH = 0, DPR = 1;
function computeCamZoom(w, h){
  return Math.max(Math.min(w, h)/VIEW_WORLD_SHORT, Math.max(w, h)/VIEW_WORLD_LONG_MAX);
}
// Anclaje vertical de la cámara según el alto disponible. La franja útil del centro de la pantalla va
// desde debajo del HUD de arriba (la barra de estado de cada arena se dibuja en max(52, 8,5 % del alto)
// y ocupa ~36 px con su fila de íconos) hasta arriba del cuadro del Hechicero (abajo al centro). El
// cuerpo del guardián (no sus pies) va al medio de esa franja. Solo depende del tamaño de la pantalla:
// la cámara nunca salta porque aparezca o se vaya un cartel.
const CAM_HUD_TOP_EXTRA = 36, CAM_HUD_BOTTOM_LOW = 58, CAM_HUD_BOTTOM_TALL = 92, CAM_BODY_UNITS = 22;
function camFitAnchor(w, h, zoom){
  const top = Math.max(52, h*0.085) + CAM_HUD_TOP_EXTRA;
  const bottom = h <= 500 ? CAM_HUD_BOTTOM_LOW : CAM_HUD_BOTTOM_TALL;
  let feet = (top + (h - bottom))/2 + CAM_BODY_UNITS*zoom;
  feet = Math.max(h*0.42, Math.min(h*0.6, feet));
  return Math.round(h/2 - feet);
}
function _viewportBox(){
  // la caja real del canvas (100% de #stage); si todavía no hay layout, la ventana
  let w = canvas.clientWidth, h = canvas.clientHeight;
  if(!w || !h){ w = window.innerWidth; h = window.innerHeight; }
  return {w:Math.max(1, Math.round(w)), h:Math.max(1, Math.round(h))};
}
// Resolución adaptable: si el juego va lento varios segundos (celular con poca GPU: el costo es pintar
// píxeles), la resolución INTERNA baja a 75% y después a 60%; el pixel art se amplía nítido
// (image-rendering: pixelated). Medido en el Reino Micelial: dibujo 15 ms -> 2,5 ms, 30 -> 60 FPS.
// ?res=0.75 la fija (pruebas); en pruebas automatizadas no se adapta sola salvo con ?resadapt=1.
const RES_LEVELS = [1, 0.75, 0.6];
const _resQ = new URLSearchParams(location.search);
const RES = { i:0, slowMs:0, fastMs:0, flips:0, lock:false,
  fixed: _resQ.has("res") ? Math.max(0.4, Math.min(1, parseFloat(_resQ.get("res"))||1)) : null,
  auto: !(navigator.webdriver && !_resQ.has("resadapt")) };
function resScale(){ return RES.fixed!=null ? RES.fixed : RES_LEVELS[RES.i]; }
function _dprNow(){ return Math.min(window.devicePixelRatio||1, 2)*resScale(); }
function resAdapt(dt, playing){
  if(RES.fixed!=null || !RES.auto || !playing) { RES.slowMs = RES.fastMs = 0; return; }
  const ema = typeof vfxFrameEma==="number" ? vfxFrameEma : 16;
  if(ema > 24){ RES.slowMs += dt; RES.fastMs = 0; } else if(ema < 17.5){ RES.fastMs += dt; RES.slowMs = 0; } else { RES.slowMs = Math.max(0, RES.slowMs - dt); RES.fastMs = 0; }
  if(RES.slowMs > 2500 && RES.i < RES_LEVELS.length-1){ RES.i++; RES.slowMs = 0; RES.flips++; if(RES.flips >= 4) RES.lock = true; resize(true); }
  else if(RES.fastMs > 9000 && RES.i > 0 && !RES.lock){ RES.i--; RES.fastMs = 0; resize(true); }
}
function resize(force){
  const b = _viewportBox(), dpr = _dprNow();
  if(!force && b.w===VW && b.h===VH && dpr===DPR) return false;
  VW = b.w; VH = b.h; DPR = dpr;
  canvas.width = Math.round(VW*DPR); canvas.height = Math.round(VH*DPR);
  // relación exacta buffer/CSS en cada eje (sin redondeos que estiren un eje más que el otro)
  ctx.setTransform(canvas.width/VW, 0, 0, canvas.height/VH, 0, 0);
  // cambiar el tamaño del canvas reinicia el contexto: el suavizado vuelve a "true" y los
  // sprites de pixel art se ven borrosos. Se apaga de nuevo acá, siempre.
  ctx.imageSmoothingEnabled = false;
  CAM_ZOOM = computeCamZoom(VW, VH);
  CAM_Y_ANCHOR = camFitAnchor(VW, VH, CAM_ZOOM);
  try{ document.documentElement.style.setProperty("--cam-hero-y", Math.round(VH/2 - CAM_Y_ANCHOR) + "px"); }catch(e){} // carteles centrales (hud.css)
  return true;
}
// Chequeo por cuadro: si la caja real cambió y el navegador no avisó, se corrige.
function ensureCanvasSize(){
  if(canvas.clientWidth !== VW || canvas.clientHeight !== VH || _dprNow() !== DPR) resize();
}
window.addEventListener("resize", ()=>resize());
window.addEventListener("orientationchange", ()=>{ resize(); setTimeout(()=>resize(), 250); });
if(window.visualViewport) window.visualViewport.addEventListener("resize", ()=>resize());
// Chrome (sobre todo en Android, al volver de otra app con poca memoria de GPU) puede perder el contexto 2D y
// recuperarlo solo: vuelve con la transformación en cero y el suavizado prendido (pixel art borroso y fuera
// de escala hasta el próximo cambio de tamaño). Al recuperarlo se reaplica todo.
canvas.addEventListener("contextrestored", ()=>resize(true));
document.addEventListener("fullscreenchange", ()=>{ resize(); setTimeout(()=>resize(), 250); });
resize(true);
