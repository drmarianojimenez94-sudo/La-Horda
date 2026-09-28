"use strict";
/* ============================================================
   js/ui/prep-sections.js
   PESTAÑAS DE LA SALA: "Equipo · Arena · Sala online". Antes la Sala mostraba todo junto la primera vez
   (arena, nombre, crear sala, unirse con código, los 4 lugares, equipo, skins, talentos): demasiado.
   - Los 4 lugares (#lobby-slots) se ven siempre: son el equipo con el que entrás.
   - Cada parte de la Sala lleva data-part="equipo|arena|online" (index.html) y se muestra solo con su
     pestaña (#prep-screen[data-sec], css/onboarding.css). No se mueve ni se renombra ningún id.
   - La pestaña se elige sola al entrar: en una sala online (o si entraste por código o enlace) → Sala
     online; después de ganar, con la próxima arena marcada → Arena; si no → Equipo. Al volver de elegir
     guardián, de la Tienda o del Códice se queda donde estabas.
   - Al entrar a una sala online estando en la Sala (crear / unirse) se abre sola la pestaña Sala online.
   - prepSecReveal(el): abre la pestaña que contiene a `el` (la usan las pruebas antes de tocar algo, como
     haría el jugador, y los clics hechos por código sobre una parte plegada).
   ============================================================ */
const PREP_SECS = ["equipo", "arena", "online"];
let prepSec = "equipo";
let _prepSecRoom = null; // código de la sala online para la que ya se abrió sola la pestaña

function prepSecSet(sec){
  if(!PREP_SECS.includes(sec)) return;
  prepSec = sec;
  const scr = document.getElementById("prep-screen"); if(!scr) return;
  scr.dataset.sec = sec;
  scr.querySelectorAll("[data-prep-sec]").forEach(b=>{
    const on = b.getAttribute("data-prep-sec")===sec;
    b.classList.toggle("active", on); b.setAttribute("aria-selected", on ? "true" : "false");
  });
}
// Al entrar a la Sala desde afuera (menú, resultados, Modos…): la pestaña que corresponde.
function prepSecOnEnter(prev){
  if(["menu","shop","codex","champdetail","inventory","account"].includes(prev)){ prepSecSet(prepSec); return; } // volvés de un paso intermedio
  const online = typeof netInRoom==="function" && netInRoom();
  _prepSecRoom = online ? net.code : null;
  let sec = "equipo";
  if(online || (typeof netLobby!=="undefined" && (netLobby.pendingJoin || netLobby.lastError))) sec = "online";
  else if(typeof lobbyNextArena!=="undefined" && lobbyNextArena) sec = "arena";
  prepSecSet(sec);
}
// En cada dibujo de la Sala: rótulos de las pestañas y la pestaña online al entrar a una sala.
function prepSecSync(){
  const online = typeof netInRoom==="function" && netInRoom();
  if(online && _prepSecRoom!==net.code){ _prepSecRoom = net.code; prepSecSet("online"); }
  if(!online) _prepSecRoom = null;
  const scr = document.getElementById("prep-screen"); if(scr && !scr.dataset.sec) prepSecSet(prepSec);
  const A = (typeof ARENA_MODS!=="undefined" && ARENA_MODS[currentArena]) || {};
  const num = typeof campaignNumberLabel==="function" ? campaignNumberLabel(currentArena) : "";
  const al = document.getElementById("prep-sec-arena");
  if(al) al.textContent = "Arena" + (num ? " " + num : "") + (A.label ? " · " + A.label : "");
  const warn = !!document.querySelector("#lobby-arena .la-warn");
  const ab = document.querySelector('[data-prep-sec="arena"]'); if(ab) ab.classList.toggle("warn", warn);
  const ol = document.getElementById("prep-sec-online");
  if(ol) ol.textContent = online ? `Sala ${net.code||""} · ${netHumanCount()}/4` : "Sala online";
  const ob = document.querySelector('[data-prep-sec="online"]'); if(ob) ob.classList.toggle("live", online);
}
function prepSecReveal(el){
  if(typeof el==="string") el = document.querySelector(el);
  const part = el && el.closest ? el.closest("#prep-screen [data-part]") : null;
  if(part && part.getAttribute("data-part")!==prepSec) prepSecSet(part.getAttribute("data-part"));
  return !!part;
}
(function(){
  const scr = document.getElementById("prep-screen"); if(!scr) return;
  scr.querySelectorAll("[data-prep-sec]").forEach(b=> b.addEventListener("click", ()=>{
    prepSecSet(b.getAttribute("data-prep-sec"));
    if(typeof playSfx==="function") playSfx("ready");
  }));
  // un clic hecho por código sobre algo de una pestaña plegada (p.ej. "CREAR SALA" desde Multijugador) la abre
  scr.addEventListener("click", e=>{ if(!e.isTrusted) prepSecReveal(e.target); }, true);
  prepSecSet("equipo");
})();
