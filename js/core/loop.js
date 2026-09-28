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
    ensureCanvasSize(); // iOS a veces no avisa el cambio de tamaño: se verifica la caja real
    const k = state==="playing" ? gameTimeScale(dt) : 1;
    update(dt*k);
    if(typeof netTick==="function") netTick(dt); // B1: estado compartido / derrota del equipo
    updateFeedback(dt);
    render();
    resAdapt(dt, state==="playing"); // resolución adaptable (js/core/canvas.js)
  }catch(err){
    // Antes: un error sin capturar acá frenaba requestAnimationFrame para siempre y la
    // pantalla quedaba congelada en negro sin ningún aviso. Ahora se atrapa, se muestra
    // un aviso arriba (para poder diagnosticarlo) y el loop sigue en el próximo frame.
    // Un error a mitad del dibujo deja el ctx.save() de la cámara sin su restore: el zoom y el
    // desplazamiento se acumulaban cuadro a cuadro y el mundo salía volando de la pantalla (quedaba
    // solo el HUD). Se limpia la pila de estados del contexto y se vuelve a la escala base.
    try{
      if(typeof ctx.reset==="function"){ ctx.reset(); ctx.setTransform(canvas.width/VW, 0, 0, canvas.height/VH, 0, 0); ctx.imageSmoothingEnabled = false; }
      else resize(true);
    }catch(e){}
    if(String(err) !== lastLoopError){
      lastLoopError = String(err);
      console.error("Error en el loop del juego:", err);
      showBanner("⚠ "+String(err.message||err).slice(0,80));
    }
  }
  requestAnimationFrame(loop);
}
