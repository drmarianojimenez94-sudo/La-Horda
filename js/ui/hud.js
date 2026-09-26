"use strict";
/* ============================================================
   js/ui/hud.js
   HUD en partida: barras, aliados, botones de habilidad y avisos.
   ============================================================ */

function updateAbilityButtons(){
  // el kit ACTIVO del héroe (Eren transformado muestra el del titán)
  const cls = (player && player.cls && player.classKey===selectedClass) ? player.cls : CLASSES[selectedClass];
  const map = [["btn-s1",cls.skills[0]], ["btn-s2",cls.skills[1]], ["btn-s3",cls.skills[2]], ["btn-ult",cls.ultimate]];
  map.forEach(([id, sk])=>{
    const el = document.getElementById(id);
    if(!el) return;
    const icoEl = el.querySelector(".ico");
    const labelEl = el.querySelector("div:not(.ico):not(.cd-overlay)");
    if(icoEl) icoEl.textContent = sk.ico;
    if(labelEl && id!=="btn-ult") labelEl.textContent = sk.name.split(" ")[0];
    el.title = sk.name + " — " + sk.desc;
  });
}

let _hudLastCls = null, _hudLastSe = null;
function showBanner(text){
  const b = document.getElementById("center-banner");
  b.textContent = text;
  // si la guía del jefe está en pantalla, el cartel baja un poco para no pisarla
  const intro = document.getElementById("boss-intro");
  b.classList.toggle("low", !!(intro && !intro.classList.contains("hidden")));
  b.classList.remove("show"); void b.offsetWidth; b.classList.add("show");
}

// Cooperativo: cuando caés, un cartel claro con quién te está reviviendo y cuánto le falta (el
// progreso es el real, el que lleva el anfitrión).
function updateDownedOverlay(){
  const el = document.getElementById("downed-overlay"); if(!el) return;
  const show = !!(netMatch && player && !player.alive && state==="playing" && !runEnding);
  el.classList.toggle("hidden", !show);
  if(!show) return;
  const by = player._reviveBy, prog = by && player._reviveT>0 ? Math.min(1, player._reviveT/(player._reviveDur||BOT_REVIVE_MS)) : 0;
  const alive = heroes.filter(h=>h.alive).length;
  document.getElementById("downed-sub").textContent = prog>0 ? `${heroLabel(by)} te está reviviendo… ${Math.round(prog*100)}%`
    : (alive ? "Tus aliados pueden revivirte: que se acerquen y mantengan ✚" : "Todo el equipo cayó");
  document.getElementById("downed-bar").style.width = Math.round(prog*100)+"%";
}
/* ============================================================
   HUD UPDATE
   ============================================================ */
function updateHUD(){
  updateReviveBtn(); // antes nunca se llamaba: el botón quedaba inactivo para siempre
  tutTick(); // la voz del Hechicero: cada concepto se enseña una vez, jugando (js/systems/tutorial.js)
  updateDownedOverlay();
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
  // El Libertador / Eren: indicadores propios (Disparo de Oficial, Cabral, montura / Furia,
  // Seguir Adelante, transformación, regeneración, El Retumbar, agotado). Solo se toca el DOM si cambió.
  if(player.cls !== _hudLastCls){ _hudLastCls = player.cls; updateAbilityButtons(); }
  const seHudEl = document.getElementById("se-hud");
  if(seHudEl){
    const html = player.classKey==="libertador" ? libertadorHudHtml(player) : player.classKey==="eren" ? erenHudHtml(player) : "";
    if(html !== _hudLastSe){ _hudLastSe = html; seHudEl.innerHTML = html; seHudEl.classList.toggle("hidden", !html); }
  }
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
  const ultReady = (player.ultCharge>=player.ultMax && player.ultCd<=0 && runLevel>=ULT_MIN_ARENA_LEVEL && !(player.classKey==="eren" && erenUltBlocked(player))) || !!player.erenRumblingReady;
  ultBtn.classList.toggle("ready", ultReady);
  ultBtn.classList.toggle("rumble", !!player.erenRumblingReady);
  ultBtn.classList.toggle("locked", runLevel<ULT_MIN_ARENA_LEVEL);

  renderParty();

  updateSkillButtonStates();
  updateSkillLevelUI();
}

/* Estados de los botones de habilidad: LISTA / ACTIVA / ENFRIAMIENTO / SIN RECURSO. Se leen de
   un vistazo (color del borde + barrido radial), sin tener que mirar números chicos en medio de
   la horda. Solo se toca el DOM cuando el estado cambia (el barrido usa una variable CSS). */
const _btnUi = {};
function skillEffectActive(p, sk){
  switch(sk.kind){
    case "spin_channel": return p.spinTimer>0;
    case "war_cry": return p.growTimer>0;
    case "fury_armor": return p.furyArmorTimer>0;
    case "last_stand_burst": return p.buffTimer>0 && (p.buffDmgMult||1)>1;
    case "team_atk_buff": return p.atkAuraTimer>0;
    case "team_shield_buff": return p.shieldAuraTimer>0;
    case "shadow_stealth": return p.stealthTimer>0;
    case "fire_wall": return fireWalls.some(w=>w.src===p);
    case "area_trap": case "forest_trap": return traps.some(t=>t.src===p && !t.triggered);
    case "condemned_plague": return enemies.some(e=>e.alive && e.cursed && e.curseTimer>0);
    case "elemental_storm": return p.stormTimer>0;
    case "taunt_provoke": return p.colossalTimer>0;
    case "berserker_ult": return p.berserkTimer>0;
    case "wild_hunt_ult": return p.wildHuntTimer>0;
    case "last_duel_ult": return !!p.duelActive;
    case "abyss_incarnation_ult": return !!p.nigroDemonForm;
    case "force_quit_ult": return axiomFreezeTimer>0 && axiomFreezeCaster===p;
    case "team_grand_buff": return p.atkAuraTimer>0 && p.shieldAuraTimer>0;
    case "ascension_fusion": return !!p.fused;
    case "summon_golem": return !!p.golem;
    default: return false;
  }
}
function _setBtnState(id, el, st, cdFrac, cdSec){
  let ui = _btnUi[id];
  if(!ui){
    let ov = el.querySelector(".cd-overlay");
    if(!ov){ ov = document.createElement("div"); ov.className = "cd-overlay"; el.insertBefore(ov, el.firstChild); }
    ui = _btnUi[id] = {st:"", ov, sec:-1, popUntil:0};
  }
  if(ui.st !== st){
    const wasWaiting = ui.st==="cd" || ui.st==="noen";
    el.classList.remove("ready","cd","noen","active");
    el.classList.add(st);
    if(st==="ready" && wasWaiting){
      el.classList.remove("ready-pop"); void el.offsetWidth; el.classList.add("ready-pop");
      playSfx("ready");
    }
    ui.st = st;
  }
  if(st==="cd"){
    el.style.setProperty("--cdp", cdFrac.toFixed(3));
    if(ui.sec !== cdSec){ ui.ov.textContent = cdSec; ui.sec = cdSec; }
  }
}
function updateSkillButtonStates(){
  if(!player) return;
  if(!player.cdTotal) player.cdTotal = [1,1,1];
  [["btn-s1",0],["btn-s2",1],["btn-s3",2]].forEach(([id,idx])=>{
    const el = document.getElementById(id); if(!el) return;
    const sk = player.cls.skills[idx], cd = player.cds[idx];
    let st;
    if(skillEffectActive(player, sk) && cd>0) st = "active";
    else if(cd>0) st = "cd";
    else if(player.energy < sk.cost) st = "noen";
    else st = "ready";
    _setBtnState(id, el, st, Math.min(1, cd/Math.max(1, player.cdTotal[idx]||cd)), Math.ceil(cd/1000));
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
          <div class="ally-name">${a.netName && a.netName!=="BOT" ? a.netName+" · "+a.cls.name : a.cls.name}</div>
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

/* ============================================================
   SUBIR HABILIDADES EN PARTIDA
   El juego es multijugador: no hay pausa para repartir puntos. Cuando el campeón tiene puntos
   sin gastar, aparece un "+" chico delante de cada botón de habilidad que se puede subir; el
   sugerido (suggestedSkillInvest) late en dorado. La ulti recién acepta puntos desde el nivel
   ULT_POINTS_MIN_LEVEL del campeón. Cada botón muestra además el nivel actual de la habilidad.
   ============================================================ */
const SKILL_PLUS_IDS = [["btn-s1",0],["btn-s2",1],["btn-s3",2],["btn-ult","ult"]];
let _skillLvlKey = "", _skillPlusHintShown = false;
function buildSkillPlusButtons(){
  const controls = document.getElementById("controls");
  if(!controls || document.getElementById("skill-plus-btn-0")) return;
  SKILL_PLUS_IDS.forEach(([btnId, idx])=>{
    const b = document.createElement("button");
    b.className = "skill-plus hidden"; b.id = "skill-plus-btn-"+idx; b.textContent = "+";
    b.setAttribute("data-idx", String(idx));
    b.title = "Subir esta habilidad";
    const go = (ev)=>{
      ev.preventDefault(); ev.stopPropagation();
      if(!player || state!=="playing") return;
      if(investTalentPoint(player.classKey, idx)){
        if(netIsGuest()) netSendToHost({k:"invest", idx}); // B1: el anfitrión aplica el mismo punto en la partida
        playSfx && playSfx("levelup");
        const btn = document.getElementById(btnId);
        if(btn){ btn.classList.remove("ready-pop"); void btn.offsetWidth; btn.classList.add("ready-pop"); }
      }
    };
    b.addEventListener("pointerdown", go);
    b.addEventListener("touchstart", (ev)=>{ ev.stopPropagation(); }, {passive:true});
    controls.appendChild(b);
    const lv = document.createElement("div");
    lv.className = "skill-lvl-pip"; lv.id = "skill-lvl-"+idx;
    const host = document.getElementById(btnId);
    if(host) host.appendChild(lv);
  });
}
function positionSkillPlusButtons(){
  SKILL_PLUS_IDS.forEach(([btnId, idx])=>{
    const host = document.getElementById(btnId), b = document.getElementById("skill-plus-btn-"+idx);
    if(!host || !b) return;
    const r = host.getBoundingClientRect();
    // "un poquito adelante" del botón: arriba a la izquierda, sin taparlo
    b.style.left = Math.round(r.left - 12) + "px";
    b.style.top = Math.round(r.top - 12) + "px";
  });
}
function onSkillInvested(){ _skillLvlKey = ""; if(state==="playing") updateSkillLevelUI(); }
function updateSkillLevelUI(){
  if(!player) return;
  const champ = save.champions[player.classKey]; if(!champ) return;
  const allocs = [0,1,2].map(i=>allocLevel(champ.skillMastery[i])).concat([allocLevel(champ.ultMastery)]);
  const key = player.classKey+"|"+champ.talentPoints+"|"+champ.level+"|"+allocs.join(",");
  if(key === _skillLvlKey) return;
  _skillLvlKey = key;
  buildSkillPlusButtons();
  positionSkillPlusButtons();
  const sug = suggestedSkillInvest(player.classKey);
  SKILL_PLUS_IDS.forEach(([btnId, idx], k)=>{
    const pip = document.getElementById("skill-lvl-"+idx);
    if(pip) pip.textContent = allocs[k] > 0 ? allocs[k] : "";
    const b = document.getElementById("skill-plus-btn-"+idx);
    if(!b) return;
    const can = !skillInvestLockReason(player.classKey, idx);
    b.classList.toggle("hidden", !can);
    b.classList.toggle("suggested", can && idx===sug);
  });
  if(champ.talentPoints>0 && sug!==null && !_skillPlusHintShown){
    _skillPlusHintShown = true;
    showBanner("¡Punto de habilidad! Tocá el + dorado para subirla");
  }
}
function resetSkillLevelUI(){ _skillLvlKey = ""; _skillPlusHintShown = false; }
window.addEventListener("resize", ()=>{ _skillLvlKey = ""; });
window.addEventListener("orientationchange", ()=>{ _skillLvlKey = ""; });
