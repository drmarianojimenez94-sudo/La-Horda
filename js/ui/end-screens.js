"use strict";
/* ============================================================
   js/ui/end-screens.js
   Pantallas de fin: game over y secuencia de victoria.
   ============================================================ */

/* ============================================================
   END SCREENS
   ============================================================ */
function showGameOverScreen(divinaOutcome){
  setState("gameover");
  const title = document.getElementById("go-title");
  const retryBtn = document.getElementById("retry-btn");
  if(divinaMode || divinaOutcome){
    divinaMode = false;
    if(divinaOutcome==="victory"){
      title.textContent = "¡Castillo enemigo destruido!";
      title.style.color = "#7dffa0";
      retryBtn.textContent = `Seguir — Nivel ${divinaLevel}`;
      document.getElementById("go-stats").textContent = `Arena Divina · Nivel superado`;
      document.getElementById("go-progress").innerHTML =
        `<b style="color:#7dffa0;">¡VICTORIA! Tu equipo derribó las dos torres y el castillo enemigo.</b><br>La Arena Divina te espera en el Nivel ${divinaLevel}.`;
    } else if(divinaOutcome==="castle"){
      title.textContent = "Tu castillo ha caído";
      title.style.color = "#c62828";
      retryBtn.textContent = `Reintentar — Nivel ${divinaLevel}`;
      document.getElementById("go-stats").textContent = `Arena Divina · Nivel ${divinaLevel}`;
      document.getElementById("go-progress").innerHTML =
        `<b style="color:#ff8a6a;">Los 4 campeones divinos destruyeron tu castillo.</b><br><b style="color:#d29aff;">Esto es un prototipo de combate: no se te descontó XP ni oro.</b>`;
    } else {
      title.textContent = "Tu equipo ha caído";
      title.style.color = "#c62828";
      retryBtn.textContent = `Reintentar — Nivel ${divinaLevel}`;
      document.getElementById("go-stats").textContent = `Arena Divina · Nivel ${divinaLevel}`;
      document.getElementById("go-progress").innerHTML =
        `Tu equipo cayó ante los 4 campeones divinos.<br><b style="color:#d29aff;">Esto es un prototipo de combate: no se te descontó XP ni oro.</b>`;
    }
    return;
  }
  title.textContent = "La Horda te ha consumido";
  title.style.color = "#c62828";
  retryBtn.textContent = "Reintentar desde el Nivel 1";
  const penalty = applyArenaFailurePenalty(player.classKey);
  document.getElementById("go-stats").textContent = `Nivel ${runLevel} · ${kills} bajas`;
  document.getElementById("go-progress").innerHTML =
    `${CLASSES[player.classKey].name} ahora en Nv. <b>${save.champions[player.classKey].level}</b> &nbsp;·&nbsp; Oro total: <b>${save.gold}</b><br>Sin puntos de control: la próxima incursión comienza en el Nivel 1.<br>
    <b style="color:#ff8a6a;">No terminaste la arena: perdiste el ${penalty.lostPct}% de la XP acumulada${penalty.afterLevel<penalty.beforeLevel?` (bajaste de Nv. ${penalty.beforeLevel} a Nv. ${penalty.afterLevel})`:""} y ${penalty.goldLost} de oro.</b>`;
}
/* ============================================================
   FASE 3 — PANTALLA DE VICTORIA COMPLETA
   Secuencia: VICTORIA -> EVALUACIÓN -> RECOMPENSAS -> XP/RECURSOS -> CONTINUAR
   Independiente de la pantalla de pausa. Reutiliza tal cual la Fase 1 (ítems/equipar)
   y la Fase 2 (puntaje/generador) sin duplicar nada de esa lógica.
   ============================================================ */
const STAT_LABELS = {
  dmgTaken:"Daño recibido", enemiesControlled:"Enemigos controlados", presenceTicks:"Presencia en zona",
  kills:"Enemigos eliminados", dmgDealt:"Daño total infligido", dmgToBoss:"Daño a jefes/subjefes",
  abilityHits:"Golpes de habilidad", healEffective:"Curación efectiva", alliesSaved:"Aliados salvados",
  revives:"Aliados revividos", buffsGranted:"Buffs otorgados"
};
let victoryData = null; // se arma una sola vez al entrar a la pantalla; los pasos solo lo muestran
let victoryStep = 0;

function buildVictoryData(){
  const classKey = player.classKey;
  const score = computeRoleScore(player);
  // Cantidad de recompensas: 1 objeto por cada subjefe derrotado en esta partida (la arena
  // tiene 3) + 2 o 3 objetos del jefe final (al azar), ya que llegar a la victoria implica
  // haber derrotado al jefe. El puntaje de desempeño sigue influyendo en la CALIDAD (rareza)
  // de cada uno de esos objetos, no en la cantidad.
  const bossRewardCount = 2 + (Math.random()<0.5 ? 1 : 0); // 2 o 3
  const rewardCount = subjefesDefeated + bossRewardCount;
  const rewards = [];
  let inventoryFull = false;
  for(let i=0;i<rewardCount;i++){
    const champ = save.champions[classKey];
    if((champ.inventory||[]).length >= INVENTORY_CAPACITY){ inventoryFull = true; break; }
    const item = generateReward(classKey, score);
    addItemToInventory(classKey, item); // guarda de verdad en el inventario permanente
    rewards.push(item);
  }
  const partyScores = heroes.map(h=>({classKey:h.classKey, name:CLASSES[h.classKey].name, icon:CLASSES[h.classKey].icon,
    color:CLASSES[h.classKey].color, score:computeRoleScore(h), isPlayer: h===player}));
  // Bonus de XP por completar la arena: además de la XP ganada pelea a pelea, la victoria en
  // sí misma da un extra que crece cada vez más rápido cuanto mejor el desempeño — así sacarse
  // el máximo puntaje (ya bastante difícil, ver SCORE_CONFIG) vale mucho la pena de verdad.
  const victoryXpBonus = Math.round(20 * score * (1 + score/100));
  grantXP(classKey, victoryXpBonus);
  return {
    classKey, score, rewards, partyScores, inventoryFull, victoryXpBonus,
    kills, gold: save.gold,
    level: save.champions[classKey].level,
    stats: player.stats
  };
}

const VICTORY_STEPS = [
  // 0. VICTORIA
  function(){
    document.getElementById("victory-step-title").textContent = "¡Victoria!";
    return `<div class="vic-sub">Arena Infernal — Completada</div>
      <div class="vic-role-line">Jugaste como <b>${CLASSES[victoryData.classKey].name}</b></div>
      <div class="vic-sub">Bajas totales: <b style="color:var(--text);">${victoryData.kills}</b> &nbsp;·&nbsp; Nivel de campeón: <b style="color:var(--text);">${victoryData.level}</b></div>`;
  },
  // 1. EVALUACIÓN DEL DESEMPEÑO
  function(){
    document.getElementById("victory-step-title").textContent = "Evaluación del desempeño";
    const cfg = SCORE_CONFIG[victoryData.classKey] || [];
    let rows = cfg.map(c=>{
      const raw = Math.round((victoryData.stats[c.stat]||0));
      return `<div class="score-row"><span class="score-row-label">${STAT_LABELS[c.stat]||c.stat}</span><span class="score-row-val">${raw}</span></div>`;
    }).join("");
    let partyRows = victoryData.partyScores.map(p=>`
      <div class="vic-party-row">
        <div class="vp-icon" style="color:${p.color}; background:${p.color}22; border:1px solid ${p.color};">${p.icon}</div>
        <div class="vp-name">${p.name}${p.isPlayer?" (vos)":""}</div>
        <div class="vp-score">${p.score}/100</div>
      </div>`).join("");
    return `
      <div class="vic-role-line">Rol evaluado: <b>${CLASSES[victoryData.classKey].name}</b></div>
      <div class="score-big">${victoryData.score}<span>/100</span></div>
      <div class="score-bar-track"><div class="score-bar-fill" style="width:${victoryData.score}%;"></div></div>
      ${rows}
      <div class="vic-party-title">Todo el equipo</div>
      ${partyRows}`;
  },
  // 2. RECOMPENSAS / OBJETOS OBTENIDOS
  function(){
    document.getElementById("victory-step-title").textContent = "Recompensas";
    let cards = victoryData.rewards.map(item=>{
      const rm = RARITY_META[item.rarity];
      const passiveNames = item.passives.map(p=>p.name);
      if(item.mythicPassive) passiveNames.push("★ "+item.mythicPassive.name);
      const equipped = save.champions[victoryData.classKey].equipment[item.type] === item.uid;
      const color = item.set ? "#3ddc71" : rm.color;
      return `<div class="inv-card ${item.set?"set-item":""}" style="border-left-color:${color}; margin-bottom:8px;">
        <span class="item-icon">${item.icon}</span>
        <div class="item-meta">
          <div class="item-name" style="color:${color};">${item.name}${item.set?' <span class="set-badge">SET</span>':""}</div>
          <div class="item-stat">${rm.label} · +${Math.round(item.value*100)}% ${ITEM_TYPES[item.type].statLabel}</div>
          ${item.desc?`<div class="item-desc">${item.desc}</div>`:""}
          ${passiveNames.length?`<div class="item-passives">${passiveNames.join(", ")}</div>`:""}
          <div class="vic-item-actions">
            <button class="primary" data-vic-equip="${item.uid}" ${equipped?"disabled":""}>${equipped?"Equipado":"Equipar"}</button>
            <button data-vic-keep="${item.uid}">Guardar en inventario</button>
          </div>
        </div>
      </div>`;
    }).join("");
    const fullNote = victoryData.inventoryFull ? `<div class="vic-reward-note" style="color:#ff9a7a;">Tu inventario llegó al máximo (${INVENTORY_CAPACITY} objetos) — algunas recompensas no se pudieron guardar. Liberá espacio desde Pausa → Inventario.</div>` : "";
    return `<div class="vic-reward-note">Objeto${victoryData.rewards.length>1?"s":""} obtenido${victoryData.rewards.length>1?"s":""} según tu desempeño (${victoryData.score}/100) — ya está guardado en tu inventario permanente, elegí si lo equipás ahora.</div>${fullNote}${cards}`;
  },
  // 3. XP / RECURSOS
  function(){
    document.getElementById("victory-step-title").textContent = "XP y recursos";
    const champ = save.champions[victoryData.classKey];
    const need = Math.round(40 + champ.level*16 + champ.level*champ.level*0.6);
    const pct = Math.min(100, Math.round(champ.xp/need*100));
    return `
      <div class="vic-xp-row"><span>Campeón</span><b>${CLASSES[victoryData.classKey].name}</b></div>
      <div class="vic-xp-row"><span>Bonus de XP por victoria (desempeño ${victoryData.score}/100)</span><b style="color:var(--ember3);">+${victoryData.victoryXpBonus}</b></div>
      <div class="vic-xp-row"><span>Nivel actual</span><b>${champ.level}</b></div>
      <div class="score-bar-track"><div class="score-bar-fill" style="width:${pct}%;"></div></div>
      <div class="vic-sub" style="margin-top:-6px;">${champ.xp} / ${need} XP para el próximo nivel</div>
      <div class="vic-xp-row"><span>Oro total</span><b>${victoryData.gold}</b></div>
      <div class="vic-xp-row"><span>Objetos en inventario</span><b>${(champ.inventory||[]).length}</b></div>`;
  }
];

function renderVictoryStep(){
  const body = document.getElementById("victory-step-body");
  body.innerHTML = VICTORY_STEPS[victoryStep]();
  const nextBtn = document.getElementById("victory-next-btn");
  const isLast = victoryStep === VICTORY_STEPS.length-1;
  nextBtn.textContent = isLast ? "Continuar" : "Continuar";
  nextBtn.classList.toggle("hidden", false);
  document.getElementById("again-btn").classList.toggle("hidden", !isLast);
  document.getElementById("menu-btn-2").classList.toggle("hidden", !isLast);
  if(isLast) nextBtn.classList.add("hidden");

  body.querySelectorAll("[data-vic-equip]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      equipItem(victoryData.classKey, btn.getAttribute("data-vic-equip"));
      renderVictoryStep();
    });
  });
  body.querySelectorAll("[data-vic-keep]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      btn.textContent = "Guardado ✓"; btn.disabled = true;
    });
  });
}

function showVictoryScreen(){
  setState("victory");
  playSfx("victory");
  victoryData = buildVictoryData();
  victoryStep = 0;
  renderVictoryStep();
}
document.getElementById("victory-next-btn").addEventListener("click", ()=>{
  if(victoryStep < VICTORY_STEPS.length-1){ victoryStep++; renderVictoryStep(); }
});
