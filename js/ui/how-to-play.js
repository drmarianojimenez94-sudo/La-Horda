"use strict";
/* ============================================================
   js/ui/how-to-play.js
   ¿CÓMO SE JUEGA? — guía corta que se puede abrir SIEMPRE (menú principal y pausa), con lo esencial del modo actual.
   Reseña de jugadores: nadie entendía qué tenía que hacer. La tarjeta de misión de la primera arena se mostraba una sola vez;
   esta guía es la misma idea, sin límite. Solo explica: no cambia reglas, daño ni recompensas. Lenguaje simple.
   ============================================================ */
const HOWTO_STEPS = {
  campana:[
    {ic:"🎯", t:"Tu objetivo", x:"Sobrevivir a la horda con tu equipo. Cada nivel dura un ratito: aguantá hasta que el reloj llegue a cero. En el nivel 10 aparece un jefe: derrotalo y ganás la arena."},
    {ic:"🕹️", t:"Moverte y atacar", x:"El joystick de abajo a la izquierda mueve a tu héroe. El botón grande de ATAQUE pega; las habilidades están alrededor y la definitiva (ULT) se carga peleando."},
    {ic:"✨", t:"Cada nivel, una mejora", x:"Al subir de nivel elegís una carta. Leé el título: te da más daño, vida, velocidad o un poder nuevo. Elegir bien es lo que te hace aguantar más."},
    {ic:"❤️", t:"Cuidate y cuidá a los tuyos", x:"La barra roja es tu vida. Si un compañero cae, mantené ✚ a su lado para levantarlo. Perdés si caen todos a la vez."}
  ],
  cristales:[
    {ic:"🎯", t:"Tu objetivo", x:"Destruí el cristal enemigo antes de que destruyan el tuyo. Para llegar a él tenés que derribar las torres de uno de los tres carriles."},
    {ic:"⚔️", t:"Tu horda pelea por vos", x:"Cada ratito sale una oleada de monstruos de tu base por cada carril. Acompañala, protegela y pegale a los héroes rivales que se acerquen."},
    {ic:"🃏", t:"Cada nivel, una carta de horda", x:"Cuando sube de nivel el líder de tu equipo se elige una carta que mejora a TU HORDA: más vida, más daño, más monstruos o gigantes."},
    {ic:"🪙", t:"Oro y tienda", x:"Matar monstruos y torres da oro. Volvé a tu base (botón de volver o tecla B) para comprar objetos. Matar al Dragón o al Rey Coloso da ventajas al equipo."}
  ],
  coliseo:[
    {ic:"🎯", t:"Tu objetivo", x:"Ganá duelos 2 contra 2. El primer equipo que llega a 3 puntos se queda con el torneo."},
    {ic:"⏱️", t:"Cada ronda", x:"Primero hay unos segundos de preparación. Después se pelea; si pasa mucho tiempo el anillo del suelo se cierra y obliga a pelear."},
    {ic:"💀", t:"Si caés", x:"No revivís en la ronda: mirás a tu equipo desde la cámara de espectador hasta que termina."}
  ]
};
function howtoModeKey(){
  if(typeof lanesOn==="function" && lanesOn()) return LN.mode==="coliseo" ? "coliseo" : "cristales";
  return "campana";
}
function howtoClose(){
  const el = document.getElementById("howto"); if(el) el.classList.add("hidden");
}
function howtoOpen(mode){
  const key = HOWTO_STEPS[mode] ? mode : howtoModeKey();
  let el = document.getElementById("howto");
  if(!el){
    el = document.createElement("div"); el.id = "howto"; el.className = "hidden"; el.setAttribute("role","dialog"); el.setAttribute("aria-label","Cómo se juega");
    document.body.appendChild(el);
    el.addEventListener("click", e=>{ if(e.target === el || e.target.closest("[data-howto-close]")) howtoClose(); });
  }
  const steps = HOWTO_STEPS[key];
  const names = {campana:"la Horda", cristales:"Guerra de Cristales", coliseo:"el Coliseo"};
  el.innerHTML = '<div class="howto-card"><div class="howto-title">¿CÓMO SE JUEGA ' + names[key].toUpperCase() + '?</div><div class="howto-list">' +
    steps.map((s,i)=>'<div class="howto-step"><span class="howto-ic" aria-hidden="true">' + s.ic + '</span><div><b>' + (i+1) + '. ' + s.t + '</b><p>' + s.x + '</p></div></div>').join("") +
    '</div><button class="btn wide" data-howto-close>Entendido</button></div>';
  el.classList.remove("hidden");
}
(function(){
  const bind = (id, mode)=>{ const b = document.getElementById(id); if(b) b.addEventListener("click", ()=>howtoOpen(mode)); };
  bind("hub-howto-btn", "campana");
  bind("pause-howto-btn");
  document.addEventListener("keydown", e=>{ if(e.key === "Escape") howtoClose(); });
})();
