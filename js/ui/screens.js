"use strict";
/* ============================================================
   js/ui/screens.js
   Cambio de pantallas (título, menús, partida, pausa...).
   ============================================================ */

/* ============================================================
   SCREEN / STATE MANAGEMENT
   ============================================================ */
const screens = {
  title: document.getElementById("title-screen"),
  mainmenu: document.getElementById("mainmenu-screen"),
  starter: document.getElementById("starter-screen"),
  codex: document.getElementById("codex-screen"),
  inventory: document.getElementById("inventory-screen"),
  champdetail: document.getElementById("champdetail-screen"),
  shop: document.getElementById("shop-screen"),
  modeselect: document.getElementById("modeselect-screen"),
  divina: document.getElementById("divina-screen"),
  arenaselect: document.getElementById("arenaselect-screen"),
  menu: document.getElementById("menu-screen"),
  prep: document.getElementById("prep-screen"),
  buff: document.getElementById("buffscreen"),
  gameover: document.getElementById("gameover-screen"),
  victory: document.getElementById("victory-screen"),
  paused: document.getElementById("pause-screen")
};
function setState(s){
  const prev = state;
  if(["mainmenu","prep","title","modeselect"].includes(s) && ["playing","paused","gameover","victory"].includes(prev)) duoRestoreLead();
  state = s;
  if(typeof AlphaServices!=="undefined") AlphaServices.onState(s, prev);
  if(typeof musicOnState==="function") musicOnState(s); // clima musical de cada pantalla
  if(s==="title" && typeof startTitleScene==="function") requestAnimationFrame(startTitleScene);
  if(s!=="playing" && typeof _persistTimer!=="undefined" && _persistTimer) persistNow();
  if(s!=="playing" && typeof inputResetAll==="function") inputResetAll(); // se esconden los controles: nada queda apretado (input.js)
  Object.values(screens).forEach(el=>el.classList.add("hidden"));
  const hud = document.getElementById("hud");
  const controls = document.getElementById("controls");
  const pauseBtn = document.getElementById("pause-btn");
  const muteBtn = document.getElementById("mute-btn");
  if(s==="playing"){
    hud.classList.remove("hidden"); controls.classList.remove("hidden"); pauseBtn.classList.remove("hidden");
    if(muteBtn) muteBtn.classList.remove("hidden");
  } else {
    if(s!=="paused"){ /* keep hud hidden on real exit states below */ }
    hud.classList.add("hidden"); controls.classList.add("hidden"); pauseBtn.classList.add("hidden");
    if(muteBtn) muteBtn.classList.add("hidden");
    if(screens[s]) screens[s].classList.remove("hidden");
  }
  if(s==="prep" && prev!=="prep" && typeof prepSecOnEnter==="function") prepSecOnEnter(prev); // pestaña de la Sala (prep-sections.js)
  if(document.getElementById("toast-stack")) toastStackHost(); // la columna de avisos se acomoda a la pantalla nueva
  if(typeof accountOnState==="function"){ try{ accountOnState(s); }catch(e){} } // CUENTAS: sincronizar al terminar la partida
  if(typeof campOnState==="function"){ try{ campOnState(s); }catch(e){} } // CAMPAMENTO entre arenas (camp.js): cooperativo, al volver a la Sala
}

/* ---------------- AVISOS APILADOS (toasts) ----------------
   Todos los avisos emergentes (showNetToast: js/net/net-lobby.js; logros, desafíos y pase: js/ui/quests-ui.js)
   van en UNA columna arriba a la derecha, uno debajo del otro, sin pisarse. Antes el del pase caía en el
   centro, encima del título de la victoria. En las pantallas de fin se corre abajo del resumen de
   desafíos; en partida, debajo de la Definitiva, sobre el minimapa (css/onboarding.css). */
function toastStackHost(){
  let h = document.getElementById("toast-stack");
  if(!h){ h = document.createElement("div"); h.id = "toast-stack"; h.setAttribute("aria-live", "polite"); (document.getElementById("stage") || document.body).appendChild(h); }
  h.classList.toggle("play", state==="playing");
  h.classList.toggle("end", state==="victory" || state==="gameover");
  return h;
}
