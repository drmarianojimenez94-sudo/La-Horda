"use strict";
/* ============================================================
   js/ui/end-screens.js
   Pantallas de fin: game over y secuencia de victoria.
   ============================================================ */

/* ============================================================
   END SCREENS
   ============================================================ */
function showGameOverScreen(divinaOutcome){
  if(netIsHost()) netHostAnnounceEnd(false); // B1: la derrota es de todo el equipo
  setState("gameover");
  const title = document.getElementById("go-title");
  const retryBtn = document.getElementById("retry-btn");
  retryBtn.classList.remove("hidden");
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
  retryBtn.textContent = netMatch ? "VOLVER AL LOBBY" : "Reintentar desde el Nivel 1";
  if(netMatch) netOnEndScreen(false); else netEndLabels();
  const penalty = applyArenaFailurePenalty(player.classKey);
  // Derrota: la performance igual se muestra, y a veces hay un objeto de consuelo (ver DEFEAT_LOOT)
  const perf = computePerformance(player);
  const loot = grantEndOfRunLoot(player.classKey, perf, false);
  const lootLine = loot.items.length ? loot.items.map(it=>{ const tm = LOOT_TIER_META[itemTier(it)]; return `<b style="color:${tm.color};">${it.name}</b>`; }).join(", ") : (runLevel>=DEFEAT_LOOT.minLevel ? "inventario lleno" : `sin botín (desde el nivel ${DEFEAT_LOOT.minLevel} te llevás un objeto aunque pierdas)`);
  document.getElementById("go-stats").innerHTML = `Nivel ${runLevel} · ${kills} bajas · Performance <b style="color:${perf.color};">${perf.grade}</b>`;
  document.getElementById("go-progress").innerHTML =
    `${CLASSES[player.classKey].name} ahora en Nv. <b>${save.champions[player.classKey].level}</b> &nbsp;·&nbsp; Oro total: <b>${save.gold}</b><br>Sin puntos de control: la próxima incursión comienza en el Nivel 1.<br>
    Botín: ${lootLine}<br>
    <b style="color:#ff8a6a;">No terminaste la arena: perdiste el ${penalty.lostPct}% de lo ganado en esta partida (${penalty.xpLost} de XP${penalty.afterLevel<penalty.beforeLevel?`, volviste a Nv. ${penalty.afterLevel}`:""} y ${penalty.goldLost} de oro).</b>`;
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

const ROLE_LABEL = {tanque:"Tanque", soporte:"Soporte", asesino:"Asesino / daño a un objetivo", mago:"Mago / área"};
function buildVictoryData(){
  const classKey = player.classKey;
  const perf = computePerformance(player);
  const loot = grantEndOfRunLoot(classKey, perf, true);
  const partyScores = heroes.map(h=>{ const p = computePerformance(h); return {classKey:h.classKey, name:CLASSES[h.classKey].name, icon:CLASSES[h.classKey].icon,
    color:CLASSES[h.classKey].color, score:p.score, grade:p.grade, gradeColor:p.color, isPlayer: h===player}; });
  // Bonus de XP por completar la arena: crece más rápido cuanto mejor el desempeño. Es lo que
  // separa a quien juega bien (pocas derrotas) en la curva de la campaña (ver xpToNext).
  const victoryXpBonus = Math.round(40 * perf.score * (1 + perf.score/100));
  grantXP(classKey, victoryXpBonus);
  return {
    classKey, perf, score:perf.score, rewards:loot.items, partyScores, inventoryFull:loot.inventoryFull, victoryXpBonus, arena: currentArena,
    kills, gold: save.gold, subjefes: subjefesDefeated,
    level: save.champions[classKey].level,
    stats: player.stats
  };
}
// Tarjeta de un objeto obtenido, con presentación según su categoría (común simple … mítico máximo).
function lootCardHTML(item, classKey, idx){
  const tier = itemTier(item), tm = LOOT_TIER_META[tier];
  const passiveTxt = itemPassivesHTML(item);
  const equipped = save.champions[classKey].equipment[item.type] === item.uid;
  let setLine = "";
  if(item.set){
    const S = SET_DB[item.set], owned = ownedDesignIds(), total = setPieceCount(item.set);
    const have = setPieceIds(item.set).filter(id=>owned.has(id)).length;
    setLine = `<div class="loot-set-line">SET: ${S.name} · ${have}/${total} piezas${have<total?` · te falta${total-have>1?"n":""} ${total-have}`:" · ¡COMPLETO!"}</div>`;
  }
  return `<div class="loot-card tier-${tier}" style="--tc:${tm.color}; animation-delay:${idx*0.9}s" data-tier="${tier}">
    <div class="loot-tier">${tm.label}${item.set?"":""}</div>
    <div class="loot-main"><span class="item-icon">${item.icon}</span>
      <div class="item-meta">
        <div class="item-name" style="color:${tm.color};">${item.name}</div>
        <div class="item-stat">+${Math.round(item.value*100)}% ${ITEM_TYPES[item.type].statLabel}</div>
        ${setLine}
        ${passiveTxt?`<div class="item-passives">${passiveTxt}</div>`:""}
        <div class="vic-item-actions">
          ${canEquipItem(classKey, item) ? `<button class="primary" data-vic-equip="${item.uid}" ${equipped?"disabled":""}>${equipped?"Equipado":"Equipar"}</button>` : `<button disabled>Para ${CLASSES[item.champion].name}</button>`}
          <button data-vic-keep="${item.uid}">Guardar</button>
        </div>
      </div></div>
  </div>`;
}
const LOOT_TIER_SFX = {comun:null, raro:"ready", muyraro:"heal", legendario:"clear", set:"shield", mitico:"bigKill"};
function revealLootSfx(body){
  body.querySelectorAll(".loot-card").forEach((el, i)=>{
    const t = el.getAttribute("data-tier");
    setTimeout(()=>{
      if(state!=="victory" && state!=="gameover") return;
      const sfx = LOOT_TIER_SFX[t]; if(sfx) playSfx(sfx);
      if(t==="set") setTimeout(()=>playSfx("clear"), 160);
      if(t==="mitico" || t==="legendario") document.getElementById("victory-screen").classList.add("loot-flash-"+t);
      setTimeout(()=>document.getElementById("victory-screen").classList.remove("loot-flash-legendario","loot-flash-mitico"), 900);
    }, i*900 + 250);
  });
}

const VICTORY_STEPS = [
  // 0. RESULTADO
  function(){
    document.getElementById("victory-step-title").textContent = "¡Victoria!";
    const A = ARENA_MODS[victoryData.arena]||{};
    return `<div class="vic-sub">${A.label||"Arena"} — Completada</div>
      <div class="res-rows">
        <div class="res-row"><span>Resultado</span><b style="color:#7dffa0;">VICTORIA</b></div>
        <div class="res-row"><span>Arena</span><b>${A.label||"—"}</b></div>
        <div class="res-row"><span>Dificultad</span><b>${ARENA_LOOT_LABEL[victoryData.arena]||"—"}</b></div>
        <div class="res-row"><span>Campeón</span><b>${CLASSES[victoryData.classKey].name} · Nv. ${victoryData.level}</b></div>
        <div class="res-row"><span>Bajas</span><b>${victoryData.kills}</b></div>
      </div>`;
  },
  // 1. PERFORMANCE
  function(){
    document.getElementById("victory-step-title").textContent = "Performance";
    const P = victoryData.perf;
    const rows = P.parts.map(p=>`<div class="perf-row"><span class="perf-label">${p.label}</span>
      <div class="perf-bar"><i style="width:${Math.round(p.value*100)}%"></i></div></div>`).join("");
    const partyRows = victoryData.partyScores.map(p=>`
      <div class="vic-party-row">
        <div class="vp-icon" style="color:${p.color}; background:${p.color}22; border:1px solid ${p.color};">${p.icon}</div>
        <div class="vp-name">${p.name}${p.isPlayer?" (vos)":""}</div>
        <div class="vp-score" style="color:${p.gradeColor}; font-weight:700;">${p.grade}</div>
      </div>`).join("");
    return `<div class="perf-grade" style="--gc:${P.color}">${P.grade}</div>
      <div class="vic-role-line">Rol: <b>${ROLE_LABEL[P.role]||P.role}</b> · ${P.score}/100</div>
      <div class="perf-note">Se mide lo que aporta tu rol, comparado con tu equipo.</div>
      ${rows}
      <div class="vic-party-title">Todo el equipo</div>
      ${partyRows}`;
  },
  // 2. BONUS DE RECOMPENSA + BOTÍN
  function(){
    document.getElementById("victory-step-title").textContent = "Recompensas";
    const P = victoryData.perf, G = GRADE_LOOT[P.grade];
    const bonusPct = Math.round((Math.pow(G.factor, 1.5) - 1)*100);
    const A = ARENA_MODS[victoryData.arena]||{};
    // una sola línea: el protagonista es el cofre
    const summary = `<div class="loot-summary-line"><b style="color:${P.color};">${P.grade}</b> · ${A.label||"—"} · <span style="color:#7dffa0;">Victoria</span> ·
        <span style="color:${bonusPct>=0?"#ffcf5c":"#b8a898"};">${bonusPct>=0?"+":""}${bonusPct}% rarezas altas${victoryData.subjefes?` · +${victoryData.subjefes*10}% objeto extra`:""}</span>
        <div class="loot-summary-note">La calificación mejora las probabilidades, nunca garantiza.</div></div>`;
    const fullNote = victoryData.inventoryFull ? `<div class="vic-reward-note" style="color:#ff9a7a;">Tu inventario llegó al máximo (${INVENTORY_CAPACITY} espacios): algunas recompensas no se pudieron guardar.</div>` : "";
    if(!victoryData._revealed) return `${summary}${fullNote}<div class="chest-host"></div>`; // la ceremonia del cofre (js/ui/loot-ceremony.js)
    const cards = victoryData.rewards.slice().sort((a,b)=>TIER_ORDER[itemTier(a)]-TIER_ORDER[itemTier(b)]).map((item, i)=>lootCardHTML(item, victoryData.classKey, i)).join("");
    return `${summary}${fullNote}<div class="loot-reveal">${cards || '<div class="vic-reward-note">El cofre vino vacío esta vez.</div>'}</div>`;
  },
  // 3. XP / RECURSOS
  function(){
    document.getElementById("victory-step-title").textContent = "XP y recursos";
    const champ = save.champions[victoryData.classKey];
    const need = xpToNext(champ.level);
    const pct = Math.min(100, Math.round(champ.xp/need*100));
    return `
      <div class="vic-xp-row"><span>Campeón</span><b>${CLASSES[victoryData.classKey].name}</b></div>
      <div class="vic-xp-row"><span>Bonus de XP por victoria (performance ${victoryData.perf.grade})</span><b style="color:var(--ember3);">+${victoryData.victoryXpBonus}</b></div>
      <div class="vic-xp-row"><span>Nivel actual</span><b>${champ.level}</b></div>
      <div class="score-bar-track"><div class="score-bar-fill" style="width:${pct}%;"></div></div>
      <div class="vic-sub" style="margin-top:-6px;">${champ.xp} / ${need} XP para el próximo nivel</div>
      <div class="vic-xp-row"><span>Oro total</span><b>${victoryData.gold}</b></div>
      <div class="vic-xp-row"><span>Inventario de la cuenta</span><b>${stashUsedSlots()}/${INVENTORY_CAPACITY}</b></div>`;
  }
];

function renderVictoryStep(){
  const body = document.getElementById("victory-step-body");
  body.innerHTML = VICTORY_STEPS[victoryStep]();
  const bindLootButtons = (root)=>{
    root.querySelectorAll("[data-vic-equip]").forEach(btn=> btn.addEventListener("click", ()=>{ equipItem(victoryData.classKey, btn.getAttribute("data-vic-equip")); btn.textContent = "Equipado"; btn.disabled = true; }));
    root.querySelectorAll("[data-vic-keep]").forEach(btn=> btn.addEventListener("click", ()=>{ btn.textContent = "Guardado ✓"; btn.disabled = true; }));
  };
  if(victoryStep===2){
    const host = body.querySelector(".chest-host");
    if(host){
      const C = runLootCeremony(host, victoryData.rewards, victoryData.perf.grade, ()=>{ victoryData._revealed = true; });
      C._bindCard = bindLootButtons;
      if(!victoryData.rewards.length) setTimeout(()=>{ const r = host.querySelector(".chest-items"); if(r) r.innerHTML = '<div class="vic-reward-note">El cofre vino vacío esta vez.</div>'; }, 2200);
    } else body.classList.add("loot-shown"); // al volver a dibujar: sin repetir la revelación
  } else body.classList.remove("loot-shown");
  const nextBtn = document.getElementById("victory-next-btn");
  const isLast = victoryStep === VICTORY_STEPS.length-1;
  nextBtn.textContent = isLast ? "Continuar" : "Continuar";
  nextBtn.classList.toggle("hidden", false);
  document.getElementById("again-btn").textContent = (netMatch || netInRoom()) ? "VOLVER AL LOBBY" : "Volver a entrar";
  netEndLabels();
  document.getElementById("again-btn").classList.toggle("hidden", !isLast);
  document.getElementById("menu-btn-2").classList.toggle("hidden", !isLast);
  if(isLast) nextBtn.classList.add("hidden");

  if(victoryStep!==2 || !body.querySelector(".chest-host")) bindLootButtons(body);
}

function showVictoryScreen(){
  if(netIsHost()) netHostAnnounceEnd(true); // B1: todos terminan la misma partida
  setState("victory");
  playSfx("victory");
  victoryData = buildVictoryData();
  victoryStep = 0;
  renderVictoryStep();
  if(netMatch) netOnEndScreen(true);
}
document.getElementById("victory-next-btn").addEventListener("click", ()=>{
  if(victoryStep < VICTORY_STEPS.length-1){ victoryStep++; renderVictoryStep(); }
});
