"use strict";
/* ============================================================
   js/core/anti-zoom.js
   Bloquea el zoom accidental de Safari/iOS (pellizco y doble toque).
   El HTML ya pide "user-scalable=no" y el CSS ya tiene "touch-action:none",
   pero iOS ignora ambos en ciertos casos (accesibilidad, doble toque
   rápido sobre un botón deshabilitado, etc.). Esto agrega los dos
   bloqueos que Apple recomienda para esos casos y que ninguna otra
   técnica cubre. No cambia gameplay, arte ni balance: solo evita que
   el navegador acerque la página entera (lo que se ve como si la
   "cámara" del juego se hubiera acercado).
   ============================================================ */
(function(){
  // Pellizco con dos dedos (eventos "gesture*" son específicos de WebKit/Safari).
  function blockGesture(e){ e.preventDefault(); }
  document.addEventListener("gesturestart", blockGesture, { passive:false });
  document.addEventListener("gesturechange", blockGesture, { passive:false });
  document.addEventListener("gestureend", blockGesture, { passive:false });

  // Doble toque rápido (el gesto estándar de "double-tap to zoom" de Safari):
  // dos toques sobre el MISMO elemento en poco tiempo (p. ej. tocar dos veces
  // seguidas el botón "Cargando…" mientras está deshabilitado). No alcanza con
  // mirar solo el tiempo: los menús se navegan con toques rápidos y sucesivos
  // sobre botones distintos que a veces caen en la misma zona de la pantalla
  // (el botón principal suele quedar centrado en cada pantalla); bloquear por
  // tiempo nada más frenaba esa navegación, porque el "click" de un botón se
  // sintetiza recién después del touchend. Exigir el mismo elemento cubre el
  // caso real (mismo botón, o el mismo canvas del juego) sin tocar toques
  // rápidos entre elementos distintos.
  let lastTouchEnd = 0, lastTarget = null;
  document.addEventListener("touchend", function(e){
    const now = Date.now();
    if (now - lastTouchEnd <= 350 && e.target === lastTarget) e.preventDefault();
    lastTouchEnd = now; lastTarget = e.target;
  }, { passive:false });
})();
