"use strict";
/* ============================================================
   js/ui/buff-choice.js
   Pantalla de elección de refuerzo al superar un nivel.
   ============================================================ */

/* ============================================================
   BUFF CHOICE
   ============================================================ */
function openBuffChoice(){
  setState("buff");
  document.getElementById("buff-title").textContent = `Nivel ${runLevel} superado — elige un refuerzo`;
  const cards = document.getElementById("buff-cards");
  cards.innerHTML = "";
  const pool = [...BUFF_POOL].sort(()=>Math.random()-0.5).slice(0,3);
  pool.forEach(b=>{
    const el = document.createElement("div");
    el.className = "buff-card";
    el.innerHTML = `<div class="ico">${b.ico}</div><div class="buff-name">${b.name}</div><div class="buff-desc">${b.desc}</div>`;
    el.addEventListener("click", ()=>{
      b.apply(runStats);
      runLevel++;
      player.hp = Math.min(player.maxHp, player.hp + player.maxHp*0.25);
      player.energy = player.maxEnergy;
      beginLevel();
      setState("playing");
    });
    cards.appendChild(el);
  });
}
