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
  gallery: document.getElementById("gallery-screen"),
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
  state = s;
  if(typeof musicOnState==="function") musicOnState(s); // clima musical de cada pantalla
  if(s!=="playing" && typeof _persistTimer!=="undefined" && _persistTimer) persistNow();
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
}
