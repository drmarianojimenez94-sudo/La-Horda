"use strict";
/* ============================================================
   js/ui/menus.js
   Menús: botones del título y menú principal, tienda, ficha de guardián, selección
   de arena y Sala previa a la partida (equipamiento reutilizable por guardián).
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
  // modo campaña: la primera vez se elige el guardián de regalo
  if(needsStarterChampion()){ openStarterSelect(()=>{ setState("mainmenu"); renderMainMenu(); }); return; }
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
  if(typeof codexReturnTo!=="undefined") codexReturnTo = null;
  setState("shop"); renderShop();
});
// La Tienda y la ficha de compra vuelven al Códice si se abrieron desde ahí (codexReturnTo).
function _backToCodexIfAny(){
  if(typeof codexReturnTo==="undefined") return false;
  if(codexReturnTo==="prep"){ codexReturnTo = null; setState("prep"); renderPrepSummary(); return true; } // abierta desde la Sala
  if(codexReturnTo!=="codex") return false;
  codexReturnTo = null; setState("codex"); codexRender(); return true;
}
document.getElementById("shop-back-btn").addEventListener("click", ()=>{
  if(_backToCodexIfAny()) return;
  setState("mainmenu"); renderMainMenu();
});
document.getElementById("champdetail-back-btn").addEventListener("click", ()=>{
  if(_backToCodexIfAny()) return;
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
  // BUGFIX 01: aviso único del regalo de la etapa de prueba (10.000 de oro)
  if(save.startGoldNotice && typeof showNetToast==="function"){ save.startGoldNotice = false; persist(); showNetToast("🎁 Regalo de bienvenida: 10.000 de oro para la Tienda (guardianes, objetos y skins)."); }
  const el = document.getElementById("mainmenu-gold-line");
  if(el) el.innerHTML = `Oro: <b>${save.gold}</b> &nbsp;·&nbsp; Gemas: <b>${save.gems||0}</b>`;
}
// Vista previa animada genérica: cualquier <canvas class="champ-anim" data-class-key="..."> visible
// dibuja al guardián con su arte real (drawChampFigure) caminando. Un solo bucle para toda la UI;
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
      // data-skin: skin a mostrar ("" = ninguna). Sin el atributo, la del guardado local (tus guardianes).
      const ex = cvs.dataset.skin !== undefined ? {_codexSkin:cvs.dataset.skin || null} : undefined;
      g.clearRect(0,0,cvs.width,cvs.height);
      if(cvs.dataset.idle){
        // quieto y RESPIRANDO: animación de reposo + el pecho que sube y baja (cada uno a su ritmo)
        const ph = (cvs.dataset.classKey.length*1.7 + (cvs.dataset.ph||0)) % 6.283;
        const br = Math.sin(t/620 + ph);
        const bx = cvs.width/2, by = cvs.height*0.92;
        g.save(); g.translate(bx, by); g.scale(1 - 0.012*br, 1 + 0.028*br); g.translate(-bx, -by);
        drawChampFigure(g, cvs.dataset.classKey, bx, by, cvs.height/40, 1, t, false, ex);
        g.restore();
      } else drawChampFigure(g, cvs.dataset.classKey, cvs.width/2, cvs.height*0.92, cvs.height/40, 1, t, true, ex);
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
function fmtGold(n){ return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "."); }
// Tienda: ver js/ui/shop-ui.js (renderShop).
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
        <div>🔒 Guardián bloqueado</div>
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
// isDivinaUnlocked(): js/arenas/arena-rules.js (se abre al completar la Arena Infernal).
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
// Tarjetas de selección de arena en el ORDEN CANÓNICO (CAMPAIGN_ORDER): 01 → 10, después la Arena
// Divina (postgame) y el Coliseo (próximamente). Las arenas en construcción se muestran con su número
// pero no se pueden elegir; las bloqueadas dicen qué hay que completar.
function renderArenaGrid(){
  const grid = document.getElementById("arena-grid");
  if(!grid) return;
  ensurePlayableArena();
  const frontier = campaignFrontier();
  const normalCards = CAMPAIGN_ORDER.map(key=>{
    const a = ARENA_MODS[key], num = campaignNumberLabel(key);
    if(a.comingSoon){
      return `<button class="arena-card locked soon" data-arena="${key}" disabled>
      <span class="arena-card-badge soon">EN CONSTRUCCIÓN</span>
      <div class="arena-card-icon">${a.icon}</div>
      <div class="arena-card-title"><span class="arena-card-num">${num}</span> — ${a.label}</div>
      <div class="arena-card-desc">${a.desc}<br><i>Todavía no se puede jugar: la campaña sigue en la próxima arena.</i></div>
    </button>`;
    }
    const unlocked = isArenaUnlocked(key);
    const selected = currentArena===key;
    const fresh = save.justUnlockedArena===key;
    const i = ARENA_ORDER.indexOf(key), prev = i > 0 ? ARENA_ORDER[i-1] : null;
    const need = (save.arenasCleared||{})[prev] ? frontier : prev;
    return `<button class="arena-card ${selected?"selected":""} ${unlocked?"":"locked"} ${fresh?"fresh":""}" data-arena="${key}" ${unlocked?"":"disabled"}>
      ${selected?'<span class="arena-card-badge">ELEGIDA</span>':(fresh?'<span class="arena-card-badge fresh">¡NUEVA!</span>':"")}
      <div class="arena-card-icon">${unlocked?a.icon:"🔒"}</div>
      <div class="arena-card-title"><span class="arena-card-num">${num}</span> — ${a.label}</div>
      <div class="arena-card-desc">${unlocked?a.desc:`🔒 Completá <b>${(ARENA_MODS[need]||{}).label||"la arena anterior"}</b> para desbloquearla.`}</div>
      ${unlocked && save.arenasCleared[key] ? '<div class="arena-card-done">✔ Completada</div>' : ""}
    </button>`;
  }).join("");
  // Arena Divina: contenido POSTGAME, fuera de las diez arenas de la campaña. Se abre al completar
  // la Arena Infernal (isDivinaUnlocked, js/arenas/arena-rules.js). Después, el Coliseo (PvP) — próximamente.
  const divinaUnlocked = isDivinaUnlocked();
  const divinaCard = `<div class="arena-grid-sep">POSTGAME</div><button class="arena-card divina ${divinaUnlocked?"":"locked"}" data-arena="divina" ${divinaUnlocked?"":"disabled"}>
      <span class="arena-card-badge" style="color:#d9a8ff; border-color:#7a4fae; background:rgba(122,79,174,0.16);">POSTGAME</span>
      <div class="arena-card-icon">${divinaUnlocked?"👁":"🔒"}</div>
      <div class="arena-card-title">Arena Divina</div>
      <div class="arena-card-desc">${divinaUnlocked?"Las Cinco Pruebas Divinas: asedio 4 contra 4, derribá las torres y el castillo enemigo antes que a los tuyos.":"🔒 Completá la <b>Arena Infernal</b> para desbloquearla."}</div>
    </button>
    <button class="arena-card locked soon" data-arena="coliseo" disabled>
      <span class="arena-card-badge soon">PRÓXIMAMENTE</span>
      <div class="arena-card-icon">⚔</div>
      <div class="arena-card-title">Coliseo</div>
      <div class="arena-card-desc">Guardianes contra guardianes (PvP). Se abre después de las Pruebas Divinas.</div>
    </button>`;
  grid.innerHTML = normalCards + divinaCard;
  grid.querySelectorAll(".arena-card:not(.locked)").forEach(card=>{
    card.addEventListener("click", ()=>{
      const key = card.getAttribute("data-arena");
      if(save.justUnlockedArena===key){ save.justUnlockedArena = null; persist(); }
      if(key==="divina"){ setState("divina"); return; }
      currentArena = key;
      updateMenuBrandSub();
      setState("menu"); renderChampGrid(); renderSaveLine();
    });
  });
}
function updateMenuBrandSub(){
  ensurePlayableArena();
  const el = document.getElementById("menu-brand-sub");
  if(el) el.textContent = `SUPERVIVENCIA A LA HORDA · ${(ARENA_MODS[currentArena]||{}).label||""}`.toUpperCase();
}
document.getElementById("start-btn").addEventListener("click", ()=>{
  if(!save.champions[selectedClass] || !save.champions[selectedClass].unlocked){ if(typeof showNetToast==="function") showNetToast("Ese guardián está bloqueado: desbloquealo en la Tienda."); return; }
  // B1: dentro de una sala online la elección de guardián vuelve a la misma sala
  if(netInRoom()){
    setState("prep"); renderPrepSummary();
    if(net.role==="guest") netSendLoadout(true);
    else netSend({t:"update", champ:selectedClass, level:save.champions[selectedClass].level});
    return;
  }
  lobbyAllies = pickLobbyAllies(selectedClass);
  setState("prep");
  renderPrepSummary();
});
document.getElementById("menu-back-btn").addEventListener("click", ()=>{
  setState("arenaselect"); renderArenaGrid();
});
document.getElementById("prep-back-btn").addEventListener("click", ()=>{
  const go = ()=>{
    if(netInRoom()) netLeaveRoom();
    lobbyAllies = null;
    setState("menu"); renderChampGrid(); renderSaveLine();
  };
  if(netInRoom() && net.role==="host" && netHumanCount()>1){
    gameConfirm("¿Salir? La sala se cierra para tus amigos.", {okText:"Salir", danger:true}).then(ok=>{ if(ok) go(); });
    return;
  }
  go();
});
function _prepStartFailed(err){
  console.error("Error al arrancar la partida:", err);
  gameAlert("No se pudo arrancar la partida:\n"+(err.message||err)+"\n\n"+(err.stack||"").split("\n").slice(0,4).join("\n"));
}
document.getElementById("prep-start-btn").addEventListener("click", ()=>{
  lobbyNextArena = null; // la marca "SIGUIENTE" de la Sala dura hasta la próxima partida
  try{
    if(netInRoom()){
      if(net.role!=="host") return; // el anfitrión decide cuándo comenzar
      if(netDuplicateChamps().length){ netRenderLobbyBar(); return; }
      if(!isArenaUnlocked(currentArena)){ gameAlert("Esa arena todavía no la desbloqueaste."); return; }
      const nr = netNotReady();
      // arranque del anfitrión: espera al arte de las arenas (preload.js) y re-chequea la sala
      const hostStart = ()=>{
        if(!netInRoom() || net.role!=="host" || state!=="prep") return;
        if(netDuplicateChamps().length){ netRenderLobbyBar(); return; }
        if(typeof assetsAllReady==="function" && !assetsAllReady()){
          const sb = document.getElementById("prep-start-btn");
          if(sb){ sb.disabled = true; sb.textContent = "Preparando la arena… " + assetsRestPct() + "%"; }
          whenAssetsReady(()=>{ if(sb){ sb.disabled = false; sb.textContent = "Comenzar"; } hostStart(); },
            pct=>{ if(sb) sb.textContent = "Preparando la arena… " + pct + "%"; });
          return;
        }
        try{ netHostStartGame(); }catch(err){ _prepStartFailed(err); }
      };
      if(nr.length){
        gameConfirm(`${nr.map(s=>s.name).join(", ")} todavía no ${nr.length>1?"están":"está"} LISTO. ¿Comenzar igual?`, {okText:"Comenzar"}).then(ok=>{
          if(ok) hostStart(); // mientras estaba abierto el diálogo la sala pudo cambiar: hostStart re-chequea
        });
        return;
      }
      hostStart();
      return;
    }
    // el Hechicero presenta la arena antes de empezar (run-intro.js)
    runIntroShow(currentArena, ()=>{ try{ startRun(1); }catch(err){ console.error("Error al arrancar la partida:", err); } });
  }catch(err){
    _prepStartFailed(err);
  }
});
/* ---------------- ARENA DE LA SALA ----------------
   La arena se elige también DENTRO de la Sala (vos solo con bots, o el anfitrión de una sala online):
   así, después de ganar, se sigue a la próxima arena sin salir de la Sala ni perder el grupo, el
   equipo ni los bots. Los invitados ven la arena que eligió el anfitrión (nombre, ícono y reseña) y
   un aviso si todavía no la tienen desbloqueada (juegan igual, pero no les cuenta para la campaña:
   ver netGuestEnd). */
let lobbyNextArena = null; // la "siguiente" tras una victoria (se marca en la Sala hasta elegir otra)
function _lobbyArenaName(k){ const a = ARENA_MODS[k]||{}; const n = campaignNumberLabel(k); return (n ? n + " — " : "") + (a.label||k); }
function renderLobbyArena(){
  const box = document.getElementById("lobby-arena"); if(!box) return;
  const a = ARENA_MODS[currentArena];
  if(!a || ARENA_ORDER.indexOf(currentArena) < 0){ box.innerHTML = ""; box._html = ""; box.classList.add("hidden"); return; }
  box.classList.remove("hidden");
  const online = typeof netInRoom==="function" && netInRoom();
  const guest = online && net.role==="guest";
  let html;
  if(guest){
    const mine = isArenaUnlocked(currentArena), need = campaignFrontier();
    html = `<div class="la-head">ARENA <span class="la-by">· la elige el anfitrión</span></div>
      <div class="la-card" data-la-current="${currentArena}"><span class="la-ico">${a.icon||""}</span>
        <span class="la-txt"><b class="la-name">${_lobbyArenaName(currentArena)}</b><span class="la-desc">${a.desc||""}</span></span></div>
      ${mine ? "" : `<div class="la-warn" id="la-no-credit">⚠ Todavía no desbloqueaste esta arena: la jugás con el grupo, pero <b>no te cuenta para tu campaña</b>${need ? ` (primero completá ${_lobbyArenaName(need)})` : ""}.</div>`}`;
  } else {
    // abiertas + la próxima cerrada (para que se vea qué sigue)
    const firstLocked = ARENA_ORDER.find(k=>!isArenaUnlocked(k));
    const list = ARENA_ORDER.filter(k=>isArenaUnlocked(k) || k===firstLocked);
    const chips = list.map(k=>{
      const A = ARENA_MODS[k]||{}, open = isArenaUnlocked(k), sel = k===currentArena;
      const tag = !open ? "" : (k===lobbyNextArena ? `<span class="la-tag next">SIGUIENTE</span>` : (save.justUnlockedArena===k ? `<span class="la-tag">¡NUEVA!</span>` : ((save.arenasCleared||{})[k] ? `<span class="la-done">✔</span>` : "")));
      return `<button class="la-chip ${sel?"sel":""}" data-lobby-arena="${k}" ${open?"":"disabled"} aria-pressed="${sel}">${open?(A.icon||""):"🔒"} ${_lobbyArenaName(k)}${tag}</button>`;
    }).join("");
    let warn = "";
    if(online && typeof netLobby!=="undefined"){
      // invitados que no tienen esta arena abierta (su juego lo informa con el equipo: loadout.open)
      const out = (net.room ? net.room.slots : []).map((s,i)=>{ const L = i>0 && s && s.connected ? netLobby.loadouts[i] : null;
        return L && Array.isArray(L.open) && !L.open.includes(currentArena) ? s.name : null; }).filter(Boolean);
      if(out.length) warn = `<div class="la-warn" id="la-guest-no-credit">⚠ ${out.join(", ")} todavía no ${out.length>1?"tienen":"tiene"} esta arena desbloqueada: ${out.length>1?"juegan":"juega"} igual, pero no ${out.length>1?"les":"le"} cuenta para su campaña.</div>`;
    }
    html = `<div class="la-head">ARENA <span class="la-by">· ${online ? "tus amigos la ven al instante" : "tocá otra para cambiarla"}</span></div>
      <div class="la-strip">${chips}</div>
      <div class="la-desc">${a.icon||""} ${a.desc||""}</div>${warn}`;
  }
  if(box._html === html && box.innerHTML) return; // sin cambios: no reemplaza botones bajo el dedo
  box._html = html; box.innerHTML = html;
  box.querySelectorAll("[data-lobby-arena]").forEach(b=> b.addEventListener("click", ()=> pickLobbyArena(b.getAttribute("data-lobby-arena"))));
  const strip = box.querySelector(".la-strip"), sel = box.querySelector(".la-chip.sel");
  if(strip && sel) strip.scrollLeft = Math.max(0, sel.offsetLeft - strip.offsetLeft - 8); // la elegida, a la vista
}
function pickLobbyArena(key){
  if(typeof netInRoom==="function" && netInRoom() && net.role!=="host") return; // la elige el anfitrión
  if(!isArenaUnlocked(key) || key===currentArena) return;
  currentArena = key;
  if(save.justUnlockedArena===key){ save.justUnlockedArena = null; persist(); }
  updateMenuBrandSub();
  if(typeof netInRoom==="function" && netInRoom()) netSend({t:"update", arena:key});
  renderPrepSummary();
}
// SALA (lobby) antes de entrar a la arena: 4 lugares -pensada para multijugador; hoy el lugar 1 es
// el jugador y los otros 3 los ocupan bots, uno por cada rol que falta, igual que siempre-, y
// debajo el equipamiento completo del guardián elegido. "Comenzar" arranca la partida con ESE equipo.
function renderPrepSummary(){
  const a = ARENA_MODS[currentArena]||{};
  document.getElementById("lobby-title").textContent = "Sala · " + (a.label||"Arena");
  renderLobbyArena();
  netRenderLobbyBar();
  netRenderChat(); // chat de la sala (js/net/net-chat.js); se oculta solo fuera de una sala online
  if(netInRoom()){
    // B1: sala online real: lugares en tiempo real (vos, amigos, esperando)
    document.getElementById("lobby-sub").textContent = `4 lugares · ${netHumanCount()} conectado${netHumanCount()===1?"":"s"} · los libres serán bots al comenzar`;
    netRenderLobbySlots();
    const box = document.getElementById("prep-summary");
    const cls = CLASSES[selectedClass], champ = save.champions[selectedClass];
    box.innerHTML = `<div class="lobby-equip-title">${cls.name} · Nv. ${champ.level}</div><div class="lobby-note">Preparate acá: en partida no se puede cambiar el equipo ni los talentos.</div>${prepSkinsHTML()}`;
    bindPrepSkins(box);
    renderPrepTabs();
    if(net.role==="guest") netSendLoadout(false);
    else netHostBroadcastCos(false);
    return;
  }
  const sb = document.getElementById("prep-start-btn"); if(sb){ sb.disabled = false; sb.textContent = "Comenzar"; }
  document.getElementById("lobby-sub").textContent = "4 lugares · los lugares libres los ocupan bots (o tus amigos, con una sala online)";
  const slots = document.getElementById("lobby-slots");
  if(typeof netLobby!=="undefined") netLobby.slotsHTML = ""; // la vista solo reemplaza la de la sala online
  const team = [selectedClass, ...(lobbyAllies||[])];
  const ROLE_LABEL = {tanque:"Tanque", asesino:"Asesino", mago:"Mago", soporte:"Soporte"};
  slots.innerHTML = [0,1,2,3].map(i=>{
    const key = team[i];
    if(!key) return `<div class="lobby-slot empty"><div class="lobby-empty">＋</div><div class="lobby-name">Esperando jugador…</div></div>`;
    const cls = CLASSES[key], lv = save.champions[key].level, you = i===0;
    return `<div class="lobby-slot ${you?"you":""}">
      <div class="lobby-tag ${you?"you":"bot"}">${you?"VOS":"BOT"}</div>
      <canvas class="champ-anim lobby-anim" width="120" height="120" data-class-key="${key}" data-idle="1" data-ph="${i*1.3}" style="background:${cls.color}1c;"></canvas>
      <div class="lobby-name">${cls.name}</div>
      <div class="lobby-meta">${ROLE_LABEL[cls.roleCategory]||""}</div>
      <div class="lobby-meta">Nv. ${lv}</div>
      <div class="lobby-ready">✔ Listo</div>
    </div>`;
  }).join("");
  const box = document.getElementById("prep-summary");
  const cls = CLASSES[selectedClass], champ = save.champions[selectedClass];
  box.innerHTML = `<div class="lobby-equip-title">${cls.name} · Nv. ${champ.level}</div><div class="lobby-note">Preparate acá: en partida no se puede cambiar el equipo ni los talentos.</div>${prepSkinsHTML()}`;
  bindPrepSkins(box);
  renderPrepTabs();
  startChampAnimLoop();
}
// Skins del guardián elegido, en la Sala: ver cuál lleva, usar una que ya tiene o comprarla ahí mismo
// (se autoequipa). Cada jugador ve y cambia SOLO las suyas; los demás la ven por la sala (net-lobby.js).
function prepSkinsHTML(){
  if(typeof SET_SKINS==="undefined" || typeof skinSetChamp!=="function") return "";
  const k = selectedClass, ids = Object.keys(SET_SKINS).filter(id=>SET_DB[id] && (!skinSetChamp(id) || skinSetChamp(id)===k));
  if(!ids.length) return "";
  const chips = ids.map(id=>{
    const sk = SET_SKINS[id], on = skinIsActiveOn(id, k), full = skinOwnedFull(id), miss = shopSetMissing(id).length;
    const btn = on ? `<span class="prep-skin-on">✔ EQUIPADA</span>`
      : full ? `<button class="btn small" data-prep-skin-use="${id}">USAR</button>`
      : `<button class="btn small secondary" data-prep-skin-buy="${id}" ${save.gold < miss*SHOP_TEST_PRICE ? "disabled" : ""}>Comprar · 🪙 ${fmtGold(miss*SHOP_TEST_PRICE)}</button>`;
    return `<div class="prep-skin ${on?"on":""}"><canvas class="champ-anim prep-skin-anim" width="56" height="56" data-class-key="${k}" data-skin="${id}" data-idle="1"></canvas>
      <div class="prep-skin-info"><div class="prep-skin-name">${sk.name || SET_DB[id].name}</div><div class="prep-skin-sub">Set ${SET_DB[id].name}${full||on ? "" : ` · faltan ${miss} pieza${miss>1?"s":""}`}</div>${btn}</div></div>`;
  }).join("");
  return `<div class="prep-skins"><div class="prep-skins-title">🎨 Skins de ${CLASSES[k].name} <button class="btn small secondary" data-prep-shop>🛒 Tienda de skins</button></div><div class="prep-skins-list">${chips}</div></div>`;
}
function bindPrepSkins(box){
  const sh = box.querySelector("[data-prep-shop]");
  if(sh) sh.addEventListener("click", ()=>{ codexReturnTo = "prep"; shopTab = "skins"; setState("shop"); renderShop(); });
  box.querySelectorAll("[data-prep-skin-use]").forEach(b=> b.addEventListener("click", ()=>{
    const id = b.getAttribute("data-prep-skin-use");
    if(skinEquipOn(id, selectedClass)) _skinEquippedFeedback(id, selectedClass); else gameAlert("No se pudo equipar: revisá que tengas todas las piezas.");
    renderPrepSummary();
  }));
  box.querySelectorAll("[data-prep-skin-buy]").forEach(b=> b.addEventListener("click", ()=>{
    const id = b.getAttribute("data-prep-skin-buy");
    gameConfirm(`¿Comprar la skin ${SET_SKINS[id].name || SET_DB[id].name} (${shopSetMissing(id).length} piezas del set ${SET_DB[id].name})?`, {okText:"Comprar"}).then(ok=>{
      if(!ok) return;
      shopBuySkin(id);
      renderPrepSummary();
    });
  }));
}
let prepCompareOpenUid = null; // qué tarjeta tiene la comparación abierta, en esta pantalla
// Equipamiento de un guardián (equipar/desequipar/comparar/vender/descartar/fusionar). Es el
// ÚNICO lugar donde se cambian objetos: la Sala antes de la partida y la ficha de Mis Guardianes.
// En partida no se puede (el juego es multijugador: no va a haber pausa para equiparse).
// rerender: qué volver a dibujar después de un cambio (la pantalla que contiene el panel).
function renderPrepInventory(){
  renderChampInventory(document.getElementById("prep-inventory-panel"), selectedClass, renderPrepSummary);
}
// renderChampInventory (vista de objetos por guardián): js/ui/inventory-ui.js
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
  const go = ()=>{
    if(netLeaveAfterMatch()){ setState("mainmenu"); renderMainMenu(); return; }
    if(currentArena==="divina"){ setState("divina"); return; }
    setState("menu"); renderChampGrid(); renderSaveLine();
  };
  if(net.role==="host" && netHumanCount()>1){
    gameConfirm("¿Cerrar la sala? Tus amigos vuelven al menú.", {okText:"Cerrar sala", danger:true}).then(ok=>{ if(ok) go(); });
    return;
  }
  go();
});
document.getElementById("again-btn").addEventListener("click", ()=>{ if(netBackToRoomIfAny()) return; startRun(1); });
document.getElementById("menu-btn-2").addEventListener("click", ()=>{
  const go = ()=>{
    if(netLeaveAfterMatch()){ setState("mainmenu"); renderMainMenu(); return; }
    setState("menu"); renderChampGrid(); renderSaveLine();
  };
  if(net.role==="host" && netHumanCount()>1){
    gameConfirm("¿Cerrar la sala? Tus amigos vuelven al menú.", {okText:"Cerrar sala", danger:true}).then(ok=>{ if(ok) go(); });
    return;
  }
  go();
});

// Volumen de música / efectos en la pausa (audio.js los guarda en este navegador)
(function(){
  for(const [id, kind] of [["vol-music","music"],["vol-sfx","sfx"]]){
    const el = document.getElementById(id); if(!el) continue;
    el.value = Math.round((typeof audioVol!=="undefined" ? audioVol[kind] : 1)*100);
    el.addEventListener("input", ()=>{ if(typeof setAudioVolume==="function") setAudioVolume(kind, el.value/100); if(kind==="sfx" && typeof playSfx==="function") playSfx("ready"); /* muestra del volumen de efectos */ });
  }
})();
