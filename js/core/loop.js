"use strict";
/* ============================================================
   js/core/loop.js
   Loop principal (requestAnimationFrame): calcula dt, llama a update() y render()
   y atrapa errores para que el juego no se congele.
   ============================================================ */

/* ============================================================
   MAIN LOOP
   ============================================================ */
let lastLoopError = null;
function loop(t){
  if(!lastTime) lastTime = t;
  let dt = t-lastTime; lastTime = t;
  dt = Math.min(dt, 48); // clamp for tab-switch lag
  try{
    // hit-stop / cámara lenta (ver js/rendering/feedback.js): solo frenan la simulación; la
    // animación de dibujo y los avisos en pantalla siguen con el reloj real.
    const k = state==="playing" ? gameTimeScale(dt) : 1;
    update(dt*k);
    updateFeedback(dt);
    render();
  }catch(err){
    // Antes: un error sin capturar acá frenaba requestAnimationFrame para siempre y la
    // pantalla quedaba congelada en negro sin ningún aviso. Ahora se atrapa, se muestra
    // un aviso arriba (para poder diagnosticarlo) y el loop sigue en el próximo frame.
    if(String(err) !== lastLoopError){
      lastLoopError = String(err);
      console.error("Error en el loop del juego:", err);
      showBanner("⚠ "+String(err.message||err).slice(0,80));
    }
  }
  requestAnimationFrame(loop);
}
