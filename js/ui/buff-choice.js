"use strict";
/* ============================================================
   js/ui/buff-choice.js
   Pantalla de elección de refuerzo al superar un nivel.
   ============================================================ */

/* ============================================================
   BUFF CHOICE
   ============================================================ */
// Nota al pie: el texto viejo ("se decide por voto del equipo") era falso en las dos modalidades. En
// cooperativo cada humano elige SU refuerzo y se sigue cuando eligieron todos; solo, los bots no eligen.
function buffNoteRefresh(){
  const n = document.getElementById("vote-note"); if(!n) return;
  const coop = typeof netMatch!=="undefined" && !!netMatch;
  n.textContent = coop ? "Cada jugador elige su propio refuerzo; la partida sigue cuando eligieron todos." : "El refuerzo dura hasta el final de esta incursión.";
}
function openBuffChoice(){
  if(typeof endlessOn==="function" && endlessOn()){ endlessOpenBuffChoice(); return; } // Horda Infinita: refuerzos con sinergias (js/systems/endless.js)
  setState("buff");
  buffNoteRefresh();
  document.getElementById("buff-title").textContent = `Nivel ${runLevel} superado — elegí un refuerzo`;
  if(typeof campaignStoryOnBuff==="function") campaignStoryOnBuff(); // prólogo pendiente del cooperativo
  const cards = document.getElementById("buff-cards");
  cards.innerHTML = "";
  // 3 cartas: 1-2 refuerzos que TRANSFORMAN una habilidad del guardián (js/data/boons.js; un dúo
  // habilitado sale primero) mezclados con los genéricos de siempre.
  const opts = boonBuildOffers(player, BUFF_POOL, false);
  opts.forEach(opt=>{
    const el = document.createElement("div");
    el.className = buffOptClass(opt);
    el.innerHTML = buffOptHTML(opt, player);
    el.addEventListener("click", ()=>{
      if(state!=="buff") return;
      buffApplyOpt(player, opt); // genérico: runStats + refreshEquippedStats (la vida máxima aplica ya) · refuerzo: player.boons
      // B1: en cooperativo cada humano elige el suyo; se sigue cuando eligieron todos
      if(netIsHost()){ cards.innerHTML = `<div class="net-wait">Elegiste <b>${buffOptName(opt)}</b>.</div>`; netHostPickedLocal(); return; }
      runLevel++;
      player.hp = Math.min(player.maxHp, player.hp + player.maxHp*0.25);
      player.energy = player.maxEnergy;
      beginLevel();
      setState("playing");
    });
    cards.appendChild(el);
  });
  buffOwnedRefresh(player);
  if(netIsHost()) netHostOpenBuffs();
}
// Debajo de las cartas: los refuerzos de habilidad que ya tiene este héroe (la build de la incursión).
function buffOwnedRefresh(h){
  const cards = document.getElementById("buff-cards"); if(!cards || !cards.parentNode) return;
  let el = document.getElementById("boon-owned");
  if(!el){ el = document.createElement("div"); el.id = "boon-owned"; cards.parentNode.insertBefore(el, cards.nextSibling); }
  el.innerHTML = boonOwnedLineHTML(h);
}
