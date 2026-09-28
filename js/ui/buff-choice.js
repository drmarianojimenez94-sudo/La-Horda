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
  const pool = [...BUFF_POOL].sort(()=>Math.random()-0.5).slice(0,3);
  pool.forEach(b=>{
    const el = document.createElement("div");
    el.className = "buff-card";
    el.innerHTML = `<div class="ico">${b.ico}</div><div class="buff-name">${b.name}</div><div class="buff-desc">${b.desc}</div>`;
    el.addEventListener("click", ()=>{
      b.apply(runStats);
      refreshEquippedStats(); // refuerzos de vida máxima (Vitalidad, Baluarte, Cañón de Cristal) aplican ya, no recién en la próxima partida
      // B1: en cooperativo cada humano elige el suyo; se sigue cuando eligieron todos
      if(netIsHost()){ cards.innerHTML = `<div class="net-wait">Elegiste <b>${b.name}</b>.</div>`; netHostPickedLocal(); return; }
      runLevel++;
      player.hp = Math.min(player.maxHp, player.hp + player.maxHp*0.25);
      player.energy = player.maxEnergy;
      beginLevel();
      setState("playing");
    });
    cards.appendChild(el);
  });
  if(netIsHost()) netHostOpenBuffs();
}
