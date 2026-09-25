"use strict";
/* ============================================================
   js/ui/hud.js
   HUD en partida: barras, aliados, botones de habilidad y avisos.
   ============================================================ */

function updateAbilityButtons(){
  const cls = CLASSES[selectedClass];
  const map = [["btn-s1",cls.skills[0]], ["btn-s2",cls.skills[1]], ["btn-s3",cls.skills[2]], ["btn-ult",cls.ultimate]];
  map.forEach(([id, sk])=>{
    const el = document.getElementById(id);
    if(!el) return;
    const icoEl = el.querySelector(".ico");
    const labelEl = el.querySelector("div:last-child");
    if(icoEl) icoEl.textContent = sk.ico;
    if(labelEl && id!=="btn-ult") labelEl.textContent = sk.name.split(" ")[0];
    el.title = sk.name + " — " + sk.desc;
  });
}

function showBanner(text){
  const b = document.getElementById("center-banner");
  b.textContent = text;
  b.classList.remove("show"); void b.offsetWidth; b.classList.add("show");
}

/* ============================================================
   HUD UPDATE
   ============================================================ */
function updateHUD(){
  updateReviveBtn(); // antes nunca se llamaba: el botón quedaba inactivo para siempre
  // Barra de vida con escudo: la capacidad total de referencia es vida máx + escudo máx
  // de ítems (fijo por equipamiento), así el segmento de escudo nunca se sale de la barra
  // y, si no hay escudo equipado, se comporta exactamente igual que antes (sin regresión).
  const pCap = player.maxHp + (player.itemMaxShield||0);
  const pShieldTotal = (player.shield||0) + (player.itemShield||0);
  const pShieldPct = Math.max(0, Math.min(100, pShieldTotal/pCap*100));
  const pHpPct = Math.max(0, Math.min(100-pShieldPct, player.hp/pCap*100));
  document.getElementById("hp-shield-fill").style.width = pShieldPct+"%";
  const hpFillEl = document.getElementById("hp-fill");
  hpFillEl.style.left = pShieldPct+"%";
  hpFillEl.style.width = pHpPct+"%";
  document.getElementById("en-fill").style.width = (player.energy/player.maxEnergy*100)+"%";
  const plevelEl = document.getElementById("plevel");
  const champMastery = talentState(player.classKey).mastery;
  const tree = talentTreeFor(player.classKey);
  // Emblema de Maestría junto al nivel (sección 18): reconocible por fuera, pero no expone el
  // árbol de talentos completo -solo el nombre de la Maestría elegida, nada más-.
  const emblemHtml = (champMastery && tree && tree.masteries[champMastery]) ? ` <span class="mastery-emblem" title="Maestría: ${tree.masteries[champMastery].name}">★</span>` : "";
  plevelEl.innerHTML = `${CLASSES[player.classKey].name} · Nv. ${save.champions[player.classKey].level}${emblemHtml}`;
  document.getElementById("hud-level").textContent = Math.min(runLevel,10);
  document.getElementById("hud-kills").textContent = kills;
  const totalSec = Math.floor((runElapsedMs||0)/1000);
  document.getElementById("hud-timer").textContent = Math.floor(totalSec/60)+":"+String(totalSec%60).padStart(2,"0");
  document.getElementById("atk-badge").classList.toggle("hidden", player.atkAuraTimer<=0);
  document.getElementById("shield-badge").classList.toggle("hidden", player.shieldAuraTimer<=0);
  // Musashi: Concentración (0/10, sección 26) y Victorias de Duelo -discreto, no satura el HUD-.
  const musashiHudEl = document.getElementById("musashi-hud");
  if(player.classKey==="musashi"){
    musashiHudEl.classList.remove("hidden");
    const concRow = document.getElementById("musashi-conc-row");
    concRow.textContent = `Concentración ${player.concentration||0}/${MUSASHI_CONC_MAX}`;
    concRow.classList.toggle("perfect", (player.concentration||0)>=MUSASHI_CONC_MAX);
    document.getElementById("musashi-victories-val").textContent = (player.stats&&player.stats.duelVictories)||0;
  } else {
    musashiHudEl.classList.add("hidden");
  }
  // Sylva: Rastreo (0/5, Presa Acorralada resaltada) e Impulso (0/10, "bloqueado" durante
  // Cacería Salvaje) -mismo criterio discreto que el HUD de Musashi-.
  const sylvaHudEl = document.getElementById("sylva-hud");
  if(player.classKey==="cazadora"){
    sylvaHudEl.classList.remove("hidden");
    const trackRow = document.getElementById("sylva-track-row");
    trackRow.textContent = `Rastreo ${Math.round(player.trackStacks||0)}/5`;
    trackRow.classList.toggle("cornered", (player.trackStacks||0)>=5);
    const momRow = document.getElementById("sylva-momentum-row");
    const momShown = player.wildHuntTimer>0 ? 10 : Math.floor(player.momentum||0);
    momRow.textContent = `Impulso ${momShown}/10${player.wildHuntTimer>0?" 🔒":""}`;
    momRow.classList.toggle("locked", player.wildHuntTimer>0);
  } else {
    sylvaHudEl.classList.add("hidden");
  }
  // Nigromante: cantidad de esqueletos vivos / máximo actual, estado del gólem, y cuenta
  // regresiva de la Encarnación del Abismo mientras esté transformado.
  const nigroHudEl = document.getElementById("nigromante-hud");
  if(player.classKey==="nigromante"){
    nigroHudEl.classList.remove("hidden");
    const maxCount = nigromanteMaxSkeletons(masteryOf("nigromante", 0));
    document.getElementById("nigro-skeleton-val").textContent = `${player.skeletons.length}/${maxCount}`;
    const golemRow = document.getElementById("nigro-golem-row");
    document.getElementById("nigro-golem-val").textContent = player.golem ? "Activo" : "Inactivo";
    golemRow.classList.toggle("active", !!player.golem);
    const demonRow = document.getElementById("nigro-demon-row");
    if(player.nigroDemonForm){
      demonRow.classList.remove("hidden");
      document.getElementById("nigro-demon-val").textContent = Math.ceil(player.nigroDemonTimer/1000)+"s";
    } else {
      demonRow.classList.add("hidden");
    }
  } else {
    nigroHudEl.classList.add("hidden");
  }
  const pct = bossActive ? 100 : Math.min(100, levelTimer/levelDuration*100);
  document.getElementById("wave-timer-bar").style.width = pct+"%";

  const ultPct = player.ultCharge/player.ultMax*100;
  document.getElementById("ult-ring").style.background = `conic-gradient(var(--ult) ${ultPct*3.6}deg, #2a1c10 0deg)`;
  const ultBtn = document.getElementById("btn-ult");
  const ultReady = player.ultCharge>=player.ultMax && player.ultCd<=0 && runLevel>=ULT_MIN_ARENA_LEVEL;
  ultBtn.classList.toggle("ready", ultReady);
  ultBtn.classList.toggle("locked", runLevel<ULT_MIN_ARENA_LEVEL);

  renderParty();

  [["btn-s1",0],["btn-s2",1],["btn-s3",2]].forEach(([id,idx])=>{
    const el = document.getElementById(id);
    let overlay = el.querySelector(".cd-overlay");
    const cd = player.cds[idx];
    if(cd>0){
      if(!overlay){ overlay = document.createElement("div"); overlay.className="cd-overlay"; el.appendChild(overlay); }
      overlay.textContent = Math.ceil(cd/1000);
    } else if(overlay){ overlay.remove(); }
  });
}

let partyBuilt = false;
function renderParty(){
  const wrap = document.getElementById("party");
  if(!wrap) return;
  if(!partyBuilt || wrap.children.length !== allies.length){
    wrap.innerHTML = "";
    allies.forEach((a,i)=>{
      const row = document.createElement("div");
      row.className = "ally-row";
      row.id = "ally-row-"+i;
      row.innerHTML = `
        <div class="ally-badge" style="color:${a.cls.color};background:${a.cls.color}22;">${a.cls.icon}</div>
        <div class="ally-meta">
          <div class="ally-name">${a.cls.name}</div>
          <div class="ally-hp-track"><div class="ally-hp-fill shield-seg" id="ally-shieldbar-${i}"></div><div class="ally-hp-fill" id="ally-hp-${i}"></div></div>
        </div>
        <span class="status-badge atk hidden" id="ally-atk-${i}">⚔</span>
        <span class="status-badge shield hidden" id="ally-shield-${i}">🛡</span>`;
      wrap.appendChild(row);
    });
    partyBuilt = true;
  }
  allies.forEach((a,i)=>{
    const fill = document.getElementById("ally-hp-"+i);
    const shieldFill = document.getElementById("ally-shieldbar-"+i);
    const row = document.getElementById("ally-row-"+i);
    const aCap = a.maxHp + (a.itemMaxShield||0);
    const aShieldTotal = (a.shield||0) + (a.itemShield||0);
    const aShieldPct = Math.max(0, Math.min(100, aShieldTotal/aCap*100));
    const aHpPct = Math.max(0, Math.min(100-aShieldPct, a.hp/aCap*100));
    if(shieldFill) shieldFill.style.width = aShieldPct+"%";
    if(fill){ fill.style.left = aShieldPct+"%"; fill.style.width = aHpPct+"%"; }
    if(row) row.classList.toggle("down", !a.alive);
    const atkB = document.getElementById("ally-atk-"+i);
    const shB = document.getElementById("ally-shield-"+i);
    if(atkB) atkB.classList.toggle("hidden", a.atkAuraTimer<=0);
    if(shB) shB.classList.toggle("hidden", a.shieldAuraTimer<=0);
  });
}
