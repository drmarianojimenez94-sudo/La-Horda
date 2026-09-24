"use strict";
/* ============================================================
   js/assets/preload.js
   Pantalla de título: "Toca para continuar" queda deshabilitado (mostrando el % de carga)
   hasta que TODAS las imágenes del juego terminaron de bajar. Antes el arte venía adentro
   del index.html, así que el título solo aparecía con todo cargado; ahora el título aparece
   enseguida y este paso conserva la garantía de que nunca se entra a jugar con sprites a
   medio cargar. No cambia nada más: al terminar, el botón vuelve a su texto original.
   ============================================================ */
(function(){
  const btn = document.getElementById("title-continue-btn");
  if(!btn || typeof ASSET_MANIFEST === "undefined") return;
  const label = btn.textContent;
  const total = ASSET_MANIFEST.length;
  let settled = 0;
  function refresh(){
    if(settled >= total){ btn.textContent = label; btn.disabled = false; return; }
    btn.textContent = "Cargando… " + Math.floor(settled*100/total) + "%";
  }
  btn.disabled = true;
  for(const src of ASSET_MANIFEST){
    const im = new Image();
    im.onload = ()=>{ settled++; refresh(); };
    im.onerror = ()=>{ settled++; console.error("No se pudo cargar la imagen:", src); refresh(); };
    im.src = src;
  }
  refresh();
})();
