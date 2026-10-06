"use strict";
/* ============================================================
   js/ui/goal-guide.js
   OBJETIVO CLARO — "sobrevivir". Reseña de jugadores: nadie entendía qué había que hacer.
   Todo en lenguaje simple (pensado para que lo entienda un chico de 10 años):
   - Cartel fijo en el HUD (#goal-chip) que dice QUÉ hacer ahora y cuánto falta.
   - Tarjeta de MISIÓN antes de la primera arena (páginas de la ficha del Hechicero).
   - Motivo de la derrota ("por qué perdí") y resumen al ganar la primera arena.
   Solo lee estado del juego; no cambia reglas, daño ni recompensas.
   ============================================================ */
const GOAL_LEVELS = 10;
// Páginas de la tarjeta de misión (la primera vez que se entra a una arena de campaña).
const GOAL_MISSION_PAGES = [
  {who:"EL HECHICERO", title:"TU MISIÓN: SOBREVIVIR",
   text:"Vas a pelear contra una horda de monstruos. Tu único trabajo es seguir con vida. Cada nivel dura un ratito: aguantá hasta que el reloj llegue a cero y los monstruos caen solos."},
  {who:"EL HECHICERO", title:"CÓMO SE GANA Y CÓMO SE PIERDE",
   text:"Se gana aguantando 10 niveles; en el último aparece un jefe: derrotalo y ganás la arena. Se pierde si caen todos los guardianes de tu equipo. Si un compañero cae, mantené ✚ a su lado para levantarlo."}
];
function goalNeedsMission(){
  if(typeof save==="undefined" || !save) return false;
  if((typeof divinaMode!=="undefined" && divinaMode) || (typeof endlessOn==="function" && endlessOn())) return false;
  const t = save.tut || {};
  return !t.goalMission;
}
function goalMissionPages(){
  if(!goalNeedsMission()) return [];
  save.tut = save.tut || {}; save.tut.goalMission = 1;
  return GOAL_MISSION_PAGES.map(p=>Object.assign({}, p));
}
// Texto del cartel fijo según el momento de la partida (null = no mostrar).
function goalChipText(){
  if(typeof state==="undefined" || state!=="playing" || !player) return null;
  if(typeof ALPHA_TRAINING!=="undefined" && ALPHA_TRAINING.active) return null;
  if(typeof endlessOn==="function" && endlessOn()) return null;
  if(typeof divinaMode!=="undefined" && divinaMode) return null;
  if(!player.alive) return "Caíste · un compañero puede levantarte";
  if(typeof runEnding!=="undefined" && runEnding) return null;
  const civ = currentArena==="ciudad" ? " y protegé la ciudad" : "";
  if(bossActive || runLevel>=GOAL_LEVELS) return "OBJETIVO: ¡derrotá al jefe!" + (civ ? "" : "");
  const left = Math.max(0, Math.ceil((levelDuration - levelTimer)/1000));
  const mm = Math.floor(left/60) + ":" + String(left%60).padStart(2,"0");
  return "OBJETIVO: sobrevivir" + civ + " · " + mm;
}
function goalChipTick(){
  const el = document.getElementById("goal-chip"); if(!el) return;
  const t = goalChipText();
  el.classList.toggle("hidden", t===null);
  if(t!==null && el.textContent!==t) el.textContent = t;
}
// Por qué se perdió (derrota normal de campaña).
function goalDefeatWhy(){
  if(typeof currentArena!=="undefined" && currentArena==="ciudad" && typeof CM_STRUCTS!=="undefined" && typeof cmS!=="undefined" && cmS && cmS.st &&
     !CM_STRUCTS.some((q,j)=>q.critical && cmS.st[j].st!==CM_ST.DESTROYED))
    return "Cayeron todas las estructuras importantes de la ciudad, y por eso se terminó la partida.";
  const n = typeof heroes!=="undefined" ? heroes.length : 1;
  return n>1 ? "Todos los guardianes de tu equipo se quedaron sin vida a la vez. Si un compañero cae, mantené ✚ a su lado para levantarlo antes de que caigan todos."
             : "Te quedaste sin vida. La barra roja es tu vida: cuando se vacía, perdés.";
}
function goalDefeatHtml(level){
  return `<div class="go-why"><b>¿Qué pasó?</b> ${goalDefeatWhy()}<br><b>Llegaste al nivel ${level} de ${GOAL_LEVELS}.</b> Probá de nuevo: cada intento te acerca al jefe.</div>`;
}
// Resumen al ganar la primera arena: todo lo que hay que saber, en pocas líneas.
function goalVictoryRecapHtml(data){
  if(!data) return "";
  return `<div class="go-recap"><b>¡Lo lograste: sobreviviste!</b>
    <ul>
      <li><b>El juego:</b> aguantar con vida hasta que el reloj de cada nivel llegue a cero.</li>
      <li><b>10 niveles:</b> en el último hay un jefe. Lo derrotaste y ganaste la arena.</li>
      <li><b>Ganaste:</b> experiencia (tu guardián sube de nivel), oro y objetos.</li>
      <li><b>Ahora:</b> la próxima arena es más difícil. Podés equiparte y mejorar a tu guardián antes de entrar.</li>
    </ul></div>`;
}
