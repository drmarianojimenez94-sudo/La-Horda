"use strict";
/* ============================================================
   js/main.js
   Arranque del juego: carga el guardado, arma los menús, muestra el título y
   prende el loop principal. Es el ÚLTIMO script que se carga (ver index.html).
   ============================================================ */

/* ============================================================
   INIT
   ============================================================ */
loadSave();
grantPlaytestV1Bonus();  // bono único de 2.000 de oro (sobre el guardado REAL, recién cargado)
netRestoreLastChamp();   // el último campeón elegido
renderChampGrid();
renderSaveLine();
updateMenuBrandSub();
setState("title");
requestAnimationFrame(loop);
