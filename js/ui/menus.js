"use strict";
/* ============================================================
   js/ui/menus.js
   Menús: botones del título y menú principal, tienda, ficha de campeón, selección
   de arena y Sala previa a la partida (equipamiento reutilizable por campeón).
   ============================================================ */

/* ============================================================
   MENU BUTTONS
   ============================================================ */
// Los navegadores exigen un gesto humano para dejar sonar audio — no hay forma de saltear
// eso desde el código. Para no depender de que el toque justo caiga en un botón puntual,
// se engancha al primerísimo toque/click en CUALQUIER parte de la pantalla, apenas se abre
// el juego (funciona una sola vez; "once:true" saca el listener solo después de usarlo).
document.addEventListener("pointerdown", startMusic, {once:true, capture:true});
document.addEventListener("touchstart", startMusic, {once:true, capture:true});
document.addEventListener("click", startMusic, {once:true, capture:true});
document.getElementById("title-continue-btn").addEventListener("click", ()=>{
  startMusic();
  setState("mainmenu");
  renderMainMenu();
});
document.getElementById("mute-btn").addEventListener("click", ()=>{
  setAudioEnabled(!audioEnabled);
});
document.getElementById("mainmenu-jugar-btn").addEventListener("click", ()=>{
  setState("modeselect");
});
document.getElementById("mainmenu-back-btn").addEventListener("click", ()=>{
  setState("title");
});
document.getElementById("mainmenu-tienda-btn").addEventListener("click", ()=>{
  setState("shop"); renderShop();
});
document.getElementById("shop-back-btn").addEventListener("click", ()=>{
  setState("mainmenu"); renderMainMenu();
});
document.getElementById("champdetail-back-btn").addEventListener("click", ()=>{
  setState("shop"); renderShop();
});
// PLAYTEST V1: bono único de 2.000 de oro para cada jugador (una sola vez por guardado, nunca
// se repite: queda marcado en save.playtestV1Bonus).
const PLAYTEST_V1_GOLD = 2000;
let playtestBonusJustGranted = false;
// OJO: se llama desde main.js DESPUÉS de loadSave() (antes de eso `save` es el guardado vacío por
// defecto y persistirlo pisaría el progreso real del jugador).
function grantPlaytestV1Bonus(){
  try{
    if(save.playtestV1Bonus) return;
    save.playtestV1Bonus = true;
    save.gold = (save.gold||0) + PLAYTEST_V1_GOLD;
    playtestBonusJustGranted = true;
    persist();
  }catch(e){}
}
function renderMainMenu(){
  if(playtestBonusJustGranted && typeof showNetToast==="function"){ playtestBonusJustGranted = false; showNetToast("🎁 Playtest V1: recibiste 2.000 de oro"); }
  const el = document.getElementById("mainmenu-gold-line");
  if(el) el.innerHTML = `Oro: <b>${save.gold}</b> &nbsp;·&nbsp; Gemas: <b>${save.gems||0}</b>`;
}
// Vista previa animada genérica: cualquier <canvas class="champ-anim" data-class-key="..."> visible
// dibuja al campeón con su arte real (drawChampFigure) caminando. Un solo bucle para toda la UI;
// se apaga solo cuando no queda ninguno visible.
let champAnimLoopRunning = false;
function startChampAnimLoop(){
  if(champAnimLoopRunning) return;
  champAnimLoopRunning = true;
  function tick(){
    const list = [...document.querySelectorAll("canvas.champ-anim")].filter(c=>c.offsetParent!==null);
    if(!list.length){ champAnimLoopRunning = false; return; }
    const t = performance.now()%100000;
    for(const cvs of list){
      const g = cvs.getContext("2d");
      g.clearRect(0,0,cvs.width,cvs.height);
      drawChampFigure(g, cvs.dataset.classKey, cvs.width/2, cvs.height*0.92, cvs.height/40, 1, t, true);
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
function fmtGold(n){ return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "."); }
// Tienda: catálogo de campeones (CHAMPION_CATALOG) con el personaje animado, precio y estado.
// Tocar una tarjeta abre su ficha (renderChampDetail), que tiene la compra real si está bloqueado.
function renderShop(){
  document.getElementById("shop-gold-line").innerHTML = `Oro: <b>${fmtGold(save.gold)}</b> &nbsp;·&nbsp; Gemas: <b>${save.gems||0}</b>`;
  const grid = document.getElementById("shop-champ-grid");
  if(!grid) return;
  grid.innerHTML = CHAMPION_CATALOG.map(c=>{
    const cls = CLASSES[c.id], champ = save.champions[c.id], owned = champ.unlocked;
    return `<button class="gallery-card shop-champ-card ${owned?"":"locked"}" data-champ="${c.id}">
      <canvas class="champ-anim shop-champ-anim" width="96" height="96" data-class-key="${c.id}" style="background:${cls.color}1c;"></canvas>
      <div class="gallery-card-name">${cls.name}</div>
      <div class="gallery-card-price">🪙 ${fmtGold(c.priceGold)}</div>
      ${owned ? `<div class="shop-owned">✔ Tuyo · Nv. ${champ.level}</div>` : `<div class="shop-owned locked">🔒 Bloqueado</div>`}
    </button>`;
  }).join("");
  grid.querySelectorAll(".shop-champ-card").forEach(card=>{
    card.addEventListener("click", ()=>{
      renderChampDetail(card.getAttribute("data-champ"));
      setState("champdetail");
    });
  });
  startChampAnimLoop();
}
// Ficha individual: si está bloqueado, muestra precio y botón funcional de desbloqueo real
// (descuenta oro de verdad y persiste); si no, muestra sus datos de progreso reales.
function renderChampDetail(champId){
  const body = document.getElementById("champdetail-body");
  if(!body) return;
  const catEntry = CHAMPION_CATALOG.find(c=>c.id===champId);
  const cls = CLASSES[champId];
  const champ = save.champions[champId];
  const locked = !champ.unlocked;
  let html = `
    <div class="cd-header">
      <canvas class="champ-anim cd-anim" width="84" height="84" data-class-key="${champId}" style="background:${cls.color}1c;"></canvas>
      <div>
        <div class="cd-title">${cls.name}</div>
        <div class="cd-role">${cls.role}</div>
      </div>
    </div>
    <div class="cd-section"><div class="cd-section-title">Historia</div>${catEntry.lore}</div>`;
  if(locked){
    const canAfford = save.gold >= catEntry.priceGold;
    html += `
      <div class="cd-section cd-unlock-box">
        <div>🔒 Campeón bloqueado</div>
        <div class="cd-unlock-price">${fmtGold(catEntry.priceGold)} 🪙</div>
        ${canAfford
          ? `<button class="btn wide" id="cd-unlock-btn">Desbloquear</button>`
          : `<div style="font-size:0.72rem; color:var(--text-dim);">Tenés ${save.gold} oro — te faltan ${catEntry.priceGold-save.gold}.</div>`}
      </div>`;
  } else {
    const need = xpToNext(champ.level);
    html += `
      <div class="cd-section cd-owned-line">✔ Ya es tuyo &nbsp;·&nbsp; Precio en tienda: <b>${fmtGold(catEntry.priceGold)} 🪙</b></div>`;
    html += `
      <div class="cd-section">
        <div class="cd-section-title">Progreso</div>
        <div class="cd-stat-row"><span>Nivel</span><b>${champ.level}</b></div>
        <div class="cd-stat-row"><span>XP</span><b>${champ.xp} / ${need}</b></div>
      </div>
      <div class="cd-section">
        <div class="cd-section-title">Estadísticas base</div>
        <div class="cd-stat-row"><span>Vida</span><b>${cls.baseHP}</b></div>
        <div class="cd-stat-row"><span>Daño</span><b>${cls.baseDmg}</b></div>
        <div class="cd-stat-row"><span>Velocidad</span><b>${cls.baseSpeed}</b></div>
      </div>
      <div class="cd-section">
        <div class="cd-section-title">Habilidades</div>
        ${cls.skills.map(s=>`<div class="cd-stat-row"><span>${s.ico} ${s.name}</span></div>`).join("")}
        <div class="cd-stat-row"><span>${cls.ultimate.ico} ${cls.ultimate.name} <i>(definitiva)</i></span></div>
      </div>
      <div class="cd-section">
        <div class="cd-section-title">Equipamiento</div>
        <div class="cd-stat-row"><span>⚔ Arma</span><b>${(equippedItem(champId,"arma")||{}).name||"—"}</b></div>
        <div class="cd-stat-row"><span>🪖 Casco</span><b>${(equippedItem(champId,"casco")||{}).name||"—"}</b></div>
        <div class="cd-stat-row"><span>🛡 Escudo</span><b>${(equippedItem(champId,"escudo")||{}).name||"—"}</b></div>
      </div>`;
  }
  body.innerHTML = html;
  const unlockBtn = document.getElementById("cd-unlock-btn");
  if(unlockBtn){
    unlockBtn.addEventListener("click", ()=>{
      if(save.gold < catEntry.priceGold) return;
      save.gold -= catEntry.priceGold;
      champ.unlocked = true;
      persist();
      renderChampDetail(champId);
    });
  }
  startChampAnimLoop();
}
document.getElementById("mode-arena-btn").addEventListener("click", ()=>{
  setState("arenaselect"); renderArenaGrid();
});
// DEMO: forzado a desbloqueada para poder probarla sin tener que ganarle antes a la
// Infernal cada vez. save.divineArenaUnlocked se sigue guardando de verdad igual (ver
// onBossDefeated) -no se perdió nada de esa lógica-, esto es solo un interruptor de
// exhibición: para la versión real, cambiar el "true" de acá por
// "ARENA_ORDER.every(a=>save.arenasCleared[a])".
function isDivinaUnlocked(){ return true; }
document.getElementById("divina-back-btn").addEventListener("click", ()=>{
  setState("arenaselect"); renderArenaGrid();
});
document.getElementById("divina-explore-btn").addEventListener("click", ()=>{
  startDivinaExploration();
});
document.getElementById("modeselect-back-btn").addEventListener("click", ()=>{
  setState("mainmenu"); renderMainMenu();
});
document.getElementById("arenaselect-back-btn").addEventListener("click", ()=>{
  setState("modeselect");
});
// Tarjetas de selección de arena: por ahora todas desbloqueadas (demo). isArenaUnlocked()
// ya deja el gancho listo para cuando haya que empezar a exigir progreso.
function renderArenaGrid(){
  const grid = document.getElementById("arena-grid");
  if(!grid) return;
  const normalCards = ARENA_ORDER.map(key=>{
    const a = ARENA_MODS[key];
    const unlocked = isArenaUnlocked(key);
    const selected = currentArena===key;
    return `<button class="arena-card ${selected?"selected":""} ${unlocked?"":"locked"}" data-arena="${key}" ${unlocked?"":"disabled"}>
      ${selected?'<span class="arena-card-badge">ELEGIDA</span>':""}
      <div class="arena-card-icon">${unlocked?a.icon:"🔒"}</div>
      <div class="arena-card-title">${a.label}</div>
      <div class="arena-card-desc">${unlocked?a.desc:"Todavía no desbloqueada."}</div>
    </button>`;
  }).join("");
  // Arena Divina: la más difícil de todas, va DESPUÉS de la Infernal en esta misma grilla
  // (no es un modo de juego separado por ahora) — se desbloquea al completar las 4 arenas
  // normales. isDivinaUnlocked() está forzado a true en la demo, ver esa función.
  const divinaUnlocked = isDivinaUnlocked();
  const divinaCard = `<button class="arena-card divina ${divinaUnlocked?"":"locked"}" data-arena="divina" ${divinaUnlocked?"":"disabled"}>
      <span class="arena-card-badge" style="color:#d9a8ff; border-color:#7a4fae; background:rgba(122,79,174,0.16);">LA MÁS DIFÍCIL</span>
      <div class="arena-card-icon">${divinaUnlocked?"👁":"🔒"}</div>
      <div class="arena-card-title">Arena Divina</div>
      <div class="arena-card-desc">${divinaUnlocked?"Asedio 4 contra 4: derribá las torres y el castillo enemigo antes que a los tuyos.":"Completá las 4 arenas para desbloquearla."}</div>
    </button>`;
  grid.innerHTML = normalCards + divinaCard;
  grid.querySelectorAll(".arena-card:not(.locked)").forEach(card=>{
    card.addEventListener("click", ()=>{
      const key = card.getAttribute("data-arena");
      if(key==="divina"){ setState("divina"); return; }
      currentArena = key;
      updateMenuBrandSub();
      setState("menu"); renderChampGrid(); renderSaveLine();
    });
  });
}
function updateMenuBrandSub(){
  const el = document.getElementById("menu-brand-sub");
  if(el) el.textContent = `HORDE SURVIVAL · ${(ARENA_MODS[currentArena]||{}).label||""}`.toUpperCase();
}
document.getElementById("start-btn").addEventListener("click", ()=>{
  // B1: dentro de una sala online la elección de campeón vuelve a la misma sala
  if(netInRoom()){
    setState("prep"); renderPrepSummary();
    if(net.role==="guest") netSendLoadout(true);
    else netSend({t:"update", champ:selectedClass, level:save.champions[selectedClass].level});
    return;
  }
  lobbyAllies = pickLobbyAllies(selectedClass);
  setState("prep");
  renderPrepSummary();
  // Multijugador -> Crear sala: al llegar a la sala se crea sola (con la arena y el campeón elegidos)
  if(netLobby.autoCreate){ netLobby.autoCreate = false; const cb = document.getElementById("net-create-btn"); if(cb) cb.click(); }
});
document.getElementById("menu-back-btn").addEventListener("click", ()=>{
  setState("arenaselect"); renderArenaGrid();
});
document.getElementById("prep-back-btn").addEventListener("click", ()=>{
  if(netInRoom()){
    if(net.role==="host" && netHumanCount()>1 && !confirm("¿Salir? La sala se cierra para tus amigos.")) return;
    netLeaveRoom();
  }
  lobbyAllies = null;
  setState("menu"); renderChampGrid(); renderSaveLine();
});
document.getElementById("prep-start-btn").addEventListener("click", ()=>{
  try{
    if(netInRoom()){
      if(net.role!=="host") return; // el anfitrión decide cuándo comenzar
      if(netDuplicateChamps().length){ netRenderLobbyBar(); return; }
      if(!isArenaUnlocked(currentArena)){ alert("Esa arena todavía no la desbloqueaste."); return; }
      const nr = netNotReady();
      if(nr.length && !confirm(`${nr.map(s=>s.name).join(", ")} todavía no ${nr.length>1?"están":"está"} LISTO. ¿Comenzar igual?`)) return;
      netHostStartGame();
      return;
    }
    startRun(1);
  }catch(err){
    console.error("Error al arrancar la partida:", err);
    alert("No se pudo arrancar la partida:\n"+(err.message||err)+"\n\n"+(err.stack||"").split("\n").slice(0,4).join("\n"));
  }
});
// SALA (lobby) antes de entrar a la arena: 4 lugares -pensada para multijugador; hoy el lugar 1 es
// el jugador y los otros 3 los ocupan bots, uno por cada rol que falta, igual que siempre-, y
// debajo el equipamiento completo del campeón elegido. "Comenzar" arranca la partida con ESE equipo.
function renderPrepSummary(){
  const a = ARENA_MODS[currentArena]||{};
  document.getElementById("lobby-title").textContent = "Sala · " + (a.label||"Arena");
  netRenderLobbyBar();
  if(netInRoom()){
    // B1: sala online real: lugares en tiempo real (vos, amigos, esperando)
    document.getElementById("lobby-sub").textContent = `4 lugares · ${netHumanCount()} conectado${netHumanCount()===1?"":"s"} · los libres serán bots al comenzar`;
    netRenderLobbySlots();
    const box = document.getElementById("prep-summary");
    const cls = CLASSES[selectedClass], champ = save.champions[selectedClass];
    box.innerHTML = `<div class="lobby-equip-title">${cls.name} · Nv. ${champ.level}</div><div class="lobby-note">Preparate acá: en partida no se puede cambiar el equipo ni los talentos.</div>`;
    renderPrepTabs();
    if(net.role==="guest") netSendLoadout(false);
    return;
  }
  const sb = document.getElementById("prep-start-btn"); if(sb){ sb.disabled = false; sb.textContent = "Comenzar"; }
  document.getElementById("lobby-sub").textContent = "4 lugares · los lugares libres los ocupan bots (o tus amigos, con una sala online)";
  const slots = document.getElementById("lobby-slots");
  const team = [selectedClass, ...(lobbyAllies||[])];
  const ROLE_LABEL = {tanque:"Tanque", asesino:"Asesino", mago:"Mago", soporte:"Soporte"};
  slots.innerHTML = [0,1,2,3].map(i=>{
    const key = team[i];
    if(!key) return `<div class="lobby-slot empty"><div class="lobby-empty">＋</div><div class="lobby-name">Esperando jugador…</div></div>`;
    const cls = CLASSES[key], lv = save.champions[key].level, you = i===0;
    return `<div class="lobby-slot ${you?"you":""}">
      <div class="lobby-tag ${you?"you":"bot"}">${you?"VOS":"BOT"}</div>
      <canvas class="champ-anim lobby-anim" width="88" height="88" data-class-key="${key}" style="background:${cls.color}1c;"></canvas>
      <div class="lobby-name">${cls.name}</div>
      <div class="lobby-meta">${ROLE_LABEL[cls.roleCategory]||""}</div>
      <div class="lobby-meta">Nv. ${lv}</div>
      <div class="lobby-ready">✔ Listo</div>
    </div>`;
  }).join("");
  const box = document.getElementById("prep-summary");
  const cls = CLASSES[selectedClass], champ = save.champions[selectedClass];
  box.innerHTML = `<div class="lobby-equip-title">${cls.name} · Nv. ${champ.level}</div><div class="lobby-note">Preparate acá: en partida no se puede cambiar el equipo ni los talentos.</div>`;
  renderPrepTabs();
  startChampAnimLoop();
}
let prepCompareOpenUid = null; // qué tarjeta tiene la comparación abierta, en esta pantalla
// Equipamiento de un campeón (equipar/desequipar/comparar/vender/descartar/fusionar). Es el
// ÚNICO lugar donde se cambian objetos: la Sala antes de la partida y la ficha de Mis Campeones.
// En partida no se puede (el juego es multijugador: no va a haber pausa para equiparse).
// rerender: qué volver a dibujar después de un cambio (la pantalla que contiene el panel).
function renderPrepInventory(){
  renderChampInventory(document.getElementById("prep-inventory-panel"), selectedClass, renderPrepSummary);
}
function renderChampInventory(panel, classKey, rerender){
  if(!panel) return;
  const champ = save.champions[classKey];
  champ.inventory = champ.inventory || [];
  champ.equipment = Object.assign(mkEquipment(), champ.equipment||{});

  let html = renderEquipmentGridHTML(classKey, "prep-unequip");
  html += renderSetPanelHTML(classKey);

  const full = champ.inventory.length >= INVENTORY_CAPACITY;
  html += `<div class="inv-capacity">Inventario: ${champ.inventory.length}/${INVENTORY_CAPACITY}${full?" — lleno":""}</div>`;
  html += renderFusionHTML(classKey, "prep-fuse");

  if(!champ.inventory.length){
    html += '<div class="inv-empty">Todavía no tenés objetos para este campeón. Se obtienen al derrotar subjefes y al jefe final.</div>';
  } else {
    html += '<div class="inv-list">';
    champ.inventory.slice().reverse().forEach(it=>{
      const rm = RARITY_META[it.rarity];
      const equipped = champ.equipment[it.type] === it.uid;
      const passiveNames = it.passives.map(p=>p.name);
      if(it.mythicPassive) passiveNames.push("★ "+it.mythicPassive.name);
      const passiveTxt = passiveNames.join(", ");
      const comparing = prepCompareOpenUid === it.uid;
      html += `<div class="inv-card ${it.set?"set-item":""}" data-prep-compare="${it.uid}" style="border-left-color:${it.set?"#3ddc71":rm.color};">
        <span class="item-icon">${it.icon}</span>
        <div class="item-meta">
          <div class="item-name" style="color:${it.set?"#3ddc71":rm.color};">${it.name}${it.set?' <span class="set-badge">SET</span>':""}</div>
          <div class="item-stat">${rm.label} · +${Math.round(it.value*100)}% ${ITEM_TYPES[it.type].statLabel}</div>
          ${it.desc ? `<div class="item-desc">${it.desc}</div>` : ""}
          ${passiveTxt ? `<div class="item-passives">${passiveTxt}</div>` : ""}
          ${(!equipped && comparing) ? compareItemsHTML(classKey, it) : ""}
          <div class="vic-item-actions">
            <button data-prep-sell="${it.uid}">Vender (+${SELL_VALUE[it.rarity]||10}o)</button>
            <button data-prep-discard="${it.uid}">Descartar</button>
          </div>
        </div>
        <button data-prep-equip="${it.uid}" class="${equipped?"equipped":""}">${equipped?"Equipado":"Equipar"}</button>
      </div>`;
    });
    html += '</div>';
  }
  html += `<button class="inv-debug-btn prep-debug-gen" ${full?"disabled":""}>[Prueba] Generar objeto al azar — para testear sin esperar a derrotar un subjefe</button>`;
  panel.innerHTML = html;

  panel.querySelectorAll(".inv-card").forEach(card=>{
    card.addEventListener("click", (ev)=>{
      if(ev.target.closest("button")) return;
      const uid = card.getAttribute("data-prep-compare");
      prepCompareOpenUid = (prepCompareOpenUid===uid) ? null : uid;
      rerender();
    });
  });
  panel.querySelectorAll("[data-prep-equip]").forEach(btn=>{
    btn.addEventListener("click", (ev)=>{
      ev.stopPropagation();
      equipItem(classKey, btn.getAttribute("data-prep-equip"));
      prepCompareOpenUid = null;
      rerender();
    });
  });
  panel.querySelectorAll("[data-prep-unequip]").forEach(btn=>{
    btn.addEventListener("click", (ev)=>{
      ev.stopPropagation();
      unequipItem(classKey, btn.getAttribute("data-prep-unequip"));
      rerender();
    });
  });
  panel.querySelectorAll("[data-prep-sell]").forEach(btn=>{
    btn.addEventListener("click", (ev)=>{
      ev.stopPropagation();
      if(!confirm("¿Vender este objeto? No se puede deshacer.")) return;
      sellItem(classKey, btn.getAttribute("data-prep-sell"));
      prepCompareOpenUid = null;
      rerender();
      renderSaveLine();
    });
  });
  panel.querySelectorAll("[data-prep-discard]").forEach(btn=>{
    btn.addEventListener("click", (ev)=>{
      ev.stopPropagation();
      if(!confirm("¿Descartar este objeto sin recompensa? No se puede deshacer.")) return;
      discardItem(classKey, btn.getAttribute("data-prep-discard"));
      prepCompareOpenUid = null;
      rerender();
    });
  });
  panel.querySelectorAll("[data-prep-fuse]").forEach(btn=>{
    btn.addEventListener("click", (ev)=>{
      ev.stopPropagation();
      handleFuseClick(classKey, btn.getAttribute("data-prep-fuse"));
      rerender();
    });
  });
  const prepDbg = panel.querySelector(".prep-debug-gen");
  if(prepDbg) prepDbg.addEventListener("click", ()=>{
    const type = rollItemType(classKey);
    const rarity = RARITIES[Math.floor(Math.random()*RARITIES.length)];
    const item = makeItem(type, rarity, classKey);
    addItemToInventory(classKey, item);
    rerender();
  });
}
function netBackToRoomIfAny(){
  // B1: al terminar una partida online, "volver a la sala" mantiene el mismo código
  netCancelAutoReturn();
  if(netLobby.roomGone && !netInRoom()){ netLobby.roomGone = false; netMatch = null; setState("mainmenu"); renderMainMenu(); return true; }
  if(!netMatch && !netInRoom()) return false;
  netFinishMatch();
  if(netInRoom()){ setState("prep"); renderPrepSummary(); return true; }
  return false;
}
document.getElementById("retry-btn").addEventListener("click", ()=>{
  if(netBackToRoomIfAny()) return;
  if(currentArena==="divina"){ startDivinaExploration(); return; }
  startRun(1);
});
function netLeaveAfterMatch(){
  // "Salir de la sala" / "Cerrar la sala y salir" desde los resultados
  netCancelAutoReturn();
  const gone = netLobby.roomGone; netLobby.roomGone = false;
  if(netMatch || netInRoom()){ netFinishMatch(); if(netInRoom()) netLeaveRoom(); return true; }
  return gone;
}
document.getElementById("menu-btn-1").addEventListener("click", ()=>{
  if(net.role==="host" && netHumanCount()>1 && !confirm("¿Cerrar la sala? Tus amigos vuelven al menú.")) return;
  if(netLeaveAfterMatch()){ setState("mainmenu"); renderMainMenu(); return; }
  if(currentArena==="divina"){ setState("divina"); return; }
  setState("menu"); renderChampGrid(); renderSaveLine();
});
document.getElementById("again-btn").addEventListener("click", ()=>{ if(netBackToRoomIfAny()) return; startRun(1); });
document.getElementById("menu-btn-2").addEventListener("click", ()=>{
  if(net.role==="host" && netHumanCount()>1 && !confirm("¿Cerrar la sala? Tus amigos vuelven al menú.")) return;
  if(netLeaveAfterMatch()){ setState("mainmenu"); renderMainMenu(); return; }
  setState("menu"); renderChampGrid(); renderSaveLine();
});
