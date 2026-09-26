"use strict";
/* ============================================================
   js/systems/tutorial.js
   TUTORIAL JUGABLE — la voz del Hechicero.

   No hay pantallas de tutorial: el Hechicero habla (un cuadro chico arriba, sin bloquear nada)
   cuando hace falta y cada concepto se enseña UNA vez, jugando. Lo aprendido se guarda en
   save.tut[concepto] (persistente): no se repite en la próxima partida.
   - Básicos (la primera partida, en orden): moverse -> atacar -> habilidad.
   - Conceptos que aparecen cuando pasan: revivir (el primer caído), runas y emboscadas (Ruinas),
     fisuras (Infernal), frío y braseros (Gélida)... Las arenas llaman a tutSay().
   Cada cliente tiene el suyo (en cooperativo, cada jugador ve sus propios consejos).
   El Hechicero NO revela nada de la historia: es un guía que sabe más de lo que dice.
   Retrato: provisorio (sin arte todavía; ver LA_HORDA_MISSING_ASSETS.md).
   ============================================================ */
const TUT = { key:null, until:0, goal:null, basicsStep:0, moved:0, lx:null, ly:null, k0:0, r0:0, reviveAt:0 };
function tutFlags(){ if(!save.tut) save.tut = {}; return save.tut; }
function tutSeen(key){ return !!tutFlags()[key]; }
function tutMark(key){ if(!tutSeen(key)){ tutFlags()[key] = 1; persist(); } }
// Muestra una línea del Hechicero (si ese concepto no se enseñó todavía). `goal` = el objetivo
// concreto ("Mantené ✚..."). `ms` = cuánto queda si nadie lo cumple (después se da por visto).
function tutSay(key, text, goal, ms){
  if(tutSeen(key) || (TUT.key && TUT.key!==key && performance.now() < TUT.until - 1500)) return false;
  const el = document.getElementById("tut-panel"); if(!el) return false;
  el.querySelector(".tut-text").textContent = text;
  const g = el.querySelector(".tut-goal"); g.textContent = goal ? "▶ " + goal : ""; g.classList.remove("done");
  el.classList.remove("hidden", "show"); void el.offsetWidth; el.classList.add("show");
  TUT.key = key; TUT.goal = goal || null; TUT.until = performance.now() + (ms || 9000);
  return true;
}
// El jugador hizo lo que se pedía: tilde, se guarda y se va.
function tutDone(key){
  tutMark(key);
  if(TUT.key!==key) return;
  const el = document.getElementById("tut-panel"); if(!el) return;
  const g = el.querySelector(".tut-goal"); if(TUT.goal){ g.textContent = "✓ " + TUT.goal; g.classList.add("done"); }
  TUT.until = Math.min(TUT.until, performance.now() + 1300);
}
function tutHide(){
  const el = document.getElementById("tut-panel");
  if(el){ el.classList.remove("show"); el.classList.add("hidden"); }
  if(TUT.key && !TUT.goal) tutMark(TUT.key); // los consejos sin objetivo se dan por vistos al mostrarse
  TUT.key = null; TUT.goal = null;
}
function tutReset(){ TUT.basicsStep = 0; TUT.moved = 0; TUT.lx = null; TUT.k0 = 0; TUT.r0 = 0; tutHide(); }
// Cada cuadro desde updateHUD (anfitrión e invitado).
function tutTick(){
  if(state!=="playing" || !player){ if(TUT.key) tutHide(); return; }
  if(TUT.run !== runStats){ TUT.run = runStats; tutReset(); } // partida nueva
  const now = performance.now();
  if(TUT.key && now > TUT.until){
    // un objetivo básico que nadie cumplió queda pendiente (vuelve a aparecer), el resto se da por visto
    if(!TUT.key.startsWith("b_")) tutMark(TUT.key);
    tutHide();
  }
  const st = player.stats || {};
  // ---- básicos, en orden, en la primera partida ----
  if(!tutSeen("basics")){
    if(TUT.lx===null){ TUT.lx = player.x; TUT.ly = player.y; TUT.k0 = st.kills||0; }
    TUT.moved += Math.hypot(player.x-TUT.lx, player.y-TUT.ly); TUT.lx = player.x; TUT.ly = player.y;
    if(!tutSeen("b_move")){
      if(!TUT.key) tutSay("b_move", "Ah… otro que despierta. Caminá. Estas piedras recuerdan los pasos de todos.", "Movete con el joystick", 14000);
      if(TUT.moved > 260) tutDone("b_move");
    } else if(!tutSeen("b_attack")){
      if(!TUT.key) tutSay("b_attack", "Ellos también despertaron. No preguntes por qué: defendete.", "Mantené Ataque para pelear", 16000);
      if((st.kills||0) > TUT.k0) tutDone("b_attack");
    } else if(!tutSeen("b_skill")){
      if(!TUT.key) tutSay("b_skill", "Tu cuerpo guarda más que acero. Usalo.", "Tocá una habilidad (mantené y arrastrá para apuntar)", 16000);
      if(player.cds && player.cds.some(c=>c>0)) tutDone("b_skill");
    } else {
      tutMark("basics");
      tutSay("b_end", "Bien. Seguí. Todavía no es hora de que sepas lo que sé.", null, 5000);
    }
  }
  // ---- revivir: la primera vez que cae un compañero ----
  if(!tutSeen("revive") && TUT.key!=="revive" && player.alive && heroes.some(h=>h!==player && !h.alive))
    tutSay("revive", "Nadie cae del todo mientras alguien lo sostenga.", "Mantené ✚ junto al caído para revivirlo", 12000);
  if(TUT.key==="revive" && (st.revives||0) > 0) tutDone("revive");
}
