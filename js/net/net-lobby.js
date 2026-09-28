"use strict";
/* ============================================================
   js/net/net-lobby.js
   LA HORDA — B1: la PRE-SALA existente convertida en sala online real.
   - Anfitrión: "Crear sala online" -> código + "Copiar enlace"/"Invitar" -> ve a sus amigos
     aparecer en los lugares 2-4 en tiempo real -> COMENZAR cuando quiera (lo que falte, bots).
   - Invitado: abre el enlace (?room=CÓDIGO) -> "Unirse" -> entra directo a la pre-sala de esa
     arena (la arena es la del anfitrión) -> prepara su equipo -> LISTO -> espera el comienzo.
   Sin sala, la pre-sala funciona exactamente como antes (vos + 3 bots, sin conexión).
   ============================================================ */
const netLobby = { loadouts:{}, pendingJoin:null, loadoutTimer:null, lastError:"", matches:0, autoTimer:null, roomGone:false,
  lastLoadoutSig:"", cos:{}, cosSig:"", barHTML:"", slotsHTML:"", touching:false, pendingRefresh:false };
// Color de cada jugador (P1-P4): sala, nombres sobre el personaje y marcadores.
const NET_SLOT_COLORS = ["#ff7a2e","#3fa7ff","#4fd16a","#c77dff"];
const NET_ROLE_LABEL = {tanque:"Tanque", asesino:"Asesino", mago:"Mago", soporte:"Soporte"};
const NET_ERRORS = {
  ROOM_FULL:"SALA COMPLETA: ya hay 4 jugadores en esa sala.", NOT_FOUND:"No existe ninguna sala con ese código. Revisá que esté bien escrito (o el anfitrión ya la cerró).",
  ALREADY_IN_ROOM:"Ya estás en una sala: salí de esa primero.",
  STARTED:"La partida de esa sala ya comenzó.", VERSION:"Tu versión del juego es distinta a la del servidor. Recargá la página.",
  BUILD:"El anfitrión tiene otra versión del juego. Abran los dos el mismo enlace.", SERVER_FULL:"El servidor está lleno, probá en un rato.",
  HOST_RECONNECT:"El anfitrión no puede volver a entrar a su sala.",
  ORIGIN:"El servidor no acepta conexiones desde esta página (dirección no autorizada). Avisale al creador del juego."
};

function netNotReady(){ return net.room ? net.room.slots.filter((s,i)=> i>0 && s && s.connected && !s.ready) : []; }
function netInRoom(){ return !!(net.room && net.role); }
function netHumanCount(){ return net.room ? net.room.slots.filter(s=>s && s.connected).length : 1; }
function netDuplicateChamps(){
  if(!net.room) return [];
  const seen = {}, dup = [];
  net.room.slots.forEach((s,i)=>{ if(!s || !s.connected) return; const k = i===net.slot ? selectedClass : s.champ; if(seen[k]) dup.push(k); seen[k] = 1; });
  return dup;
}

/* ---------------- barra online de la pre-sala ---------------- */
function netRenderLobbyBar(){
  const bar = document.getElementById("net-bar"); if(!bar) return;
  if(netAvailable() && !netInRoom()) netWarmup();
  const nameVal = netPlayerName()==="Jugador" ? "" : netPlayerName();
  const nameInput = `<label class="net-name">Tu nombre <input id="net-name-input" maxlength="16" placeholder="Jugador" value="${nameVal.replace(/"/g,"")}"></label>`;
  if(!netInRoom()){
    if(!netAvailable()){
      bar._next = `<div class="net-row">${nameInput}<span class="net-off">🌐 Online: servidor no configurado todavía (ver docs/MULTIPLAYER_B1.md). Podés jugar con 3 bots.</span></div>`;
    } else {
      bar._next = `<div class="net-row">${nameInput}<button class="btn small" id="net-create-btn">🌐 Crear sala online</button></div>
        <div class="net-hint">Creá una sala para invitar hasta 3 amigos. Si no invitás a nadie, jugás con bots como siempre.</div>
        <div class="net-join-box">
          <div class="net-join-title">🔑 UNIRSE CON CÓDIGO</div>
          <div class="net-hint">¿Un amigo creó una sala? Escribí su código de 6 letras (o pegá su enlace): entrás a SU arena con el guardián que elegiste.</div>
          <div class="net-row"><input id="net-join-code" class="multi-input net-code-input" placeholder="Código (ej. QKL58J)" maxlength="200" autocomplete="off" autocorrect="off" spellcheck="false" autocapitalize="characters">
            <button class="btn small" id="net-paste-btn">📋 Pegar</button><button class="btn small net-join-go" id="net-join-btn">UNIRSE</button></div>
        </div>
        ${netLobby.lastError ? `<div class="net-err" id="net-join-status">${netLobby.lastError}</div>` : `<div class="net-err" id="net-join-status"></div>`}`;
    }
  } else if(net.role==="host"){
    const url = netInviteUrl();
    const dup = netDuplicateChamps();
    bar._next = `<div class="net-row">${nameInput}</div>
      <div class="net-room-code"><span class="net-room-code-lbl">CÓDIGO DE SALA</span><span class="net-room-code-val" id="net-room-code">${net.code}</span>
        <button class="btn small" id="net-copy-code-btn">📋 COPIAR CÓDIGO</button></div>
      <div class="net-row"><button class="btn small secondary" id="net-copy-btn">🔗 Copiar enlace</button>
        ${navigator.share ? `<button class="btn small" id="net-share-btn">📨 Invitar</button>` : ""}
        <button class="btn secondary small" id="net-close-btn">Cerrar sala</button></div>
      <div class="net-hint">Pasales el código <b>${net.code}</b> a tus amigos: en su juego van a MULTIJUGADOR → 🔑 UNIRSE CON CÓDIGO (o a su Sala) y lo escriben. También sirve el enlace. Aparecen acá en tiempo real. Cuando estén LISTOS, COMENZAR: los lugares libres los ocupan bots. La arena la cambiás arriba, sin cerrar la sala.</div>
      <div class="net-link">${url}</div>
      ${netChampStripHTML()}
      ${dup.length ? `<div class="net-err">Hay guardianes repetidos (${dup.map(k=>CLASSES[k].name).join(", ")}): cada jugador tiene que usar uno distinto.</div>` : ""}
      ${netLobby.lastError ? `<div class="net-err">${netLobby.lastError}</div>` : ""}`;
  } else {
    const me = net.room.slots[net.slot] || {};
    const dup = netDuplicateChamps();
    const hostBusy = net.room.state!=="lobby";
    bar._next = `<div class="net-row">${nameInput}<span class="net-code">SALA <b>${net.code}</b> · Anfitrión: ${(net.room.slots[0]||{}).name||"?"}</span>
        <button class="btn small ${me.ready?"ready-on":""}" id="net-ready-btn" ${hostBusy?"disabled":""}>${me.ready ? "✔ LISTO" : "Marcar LISTO"}</button>
        <button class="btn secondary small" id="net-leave-btn">Salir de la sala</button></div>
      <div class="net-hint">Elegí tu guardián y prepará tu equipo. La arena la elige el anfitrión (arriba ves cuál es).</div>
      ${hostBusy ? `<div class="net-wait-host">El anfitrión todavía está en la partida/resultados: cuando vuelva a la sala vas a poder marcar LISTO.</div>` : ""}
      ${netChampStripHTML()}
      ${dup.length ? `<div class="net-err">Tu guardián ya lo usa otro jugador: elegí otro.</div>` : ""}`;
  }
  if(!_netCommitHTML(bar, "barHTML")) return; // idéntica: los botones ya tienen sus eventos
  const ni = document.getElementById("net-name-input");
  if(ni) ni.addEventListener("change", ()=>{ netSetPlayerName(ni.value); });
  const c = document.getElementById("net-create-btn");
  if(c) c.addEventListener("click", async ()=>{
    if(!isArenaUnlocked(currentArena)){ netLobby.lastError = "Esa arena todavía no la desbloqueaste."; netRenderLobbyBar(); return; }
    c.disabled = true; c.textContent = netConnectLabel(0); netLobby.lastError = "";
    const ni2 = document.getElementById("net-name-input"); if(ni2) netSetPlayerName(ni2.value);
    try{ await netCreateRoom(currentArena, selectedClass, save.champions[selectedClass].level, secs=>{ if(c.isConnected) c.textContent = netConnectLabel(secs); }); }
    catch(e){ if(e && e.handled){ netRenderLobbyBar(); return; } // el motivo ya se mostró (error del servidor)
      netLobby.lastError = "No se pudo crear la sala: "+(e.message||e); netLog("NETWORK_ERROR", {create:String(e.message||e)}); try{ netLeaveRoom(); }catch(x){} netRenderLobbyBar(); showNetToast("⚠ No se pudo crear la sala: "+(e.message||e)); }
  });
  const jb = document.getElementById("net-join-btn");
  if(jb) jb.addEventListener("click", netJoinFromInput);
  const jc = document.getElementById("net-join-code");
  if(jc) jc.addEventListener("keydown", (e)=>{ if(e.key==="Enter") netJoinFromInput(); });
  const jp = document.getElementById("net-paste-btn");
  if(jp) jp.addEventListener("click", async ()=>{
    try{ const t = await navigator.clipboard.readText(); if(t && jc) jc.value = t.trim(); }
    catch(e){ if(jc) jc.focus(); showNetToast("Mantené apretado el cuadro y elegí Pegar."); }
  });
  const cc = document.getElementById("net-copy-code-btn");
  if(cc) cc.addEventListener("click", ()=> netCopy(net.code, cc, "Copiá este código:"));
  const cp = document.getElementById("net-copy-btn");
  if(cp) cp.addEventListener("click", ()=> netCopy(netInviteUrl(), cp));
  const sh = document.getElementById("net-share-btn");
  if(sh) sh.addEventListener("click", ()=>{ navigator.share({title:"LA HORDA", text:`Sumate a mi sala de LA HORDA (${(ARENA_MODS[currentArena]||{}).label||""})`, url:netInviteUrl()}).catch(()=>{}); });
  const cl = document.getElementById("net-close-btn");
  if(cl) cl.addEventListener("click", ()=>{ gameConfirm("¿Cerrar la sala? Los jugadores conectados vuelven al menú.", {okText:"Cerrar sala", danger:true}).then(ok=>{ if(ok){ netLeaveRoom(); renderPrepSummary(); } }); });
  const rd = document.getElementById("net-ready-btn");
  if(rd) rd.addEventListener("click", ()=>{
    const me = net.room.slots[net.slot]||{};
    if(!me.ready && netDuplicateChamps().includes(selectedClass)){ showNetToast("Ese guardián ya lo usa otro jugador: elegí otro."); return; }
    if(!me.ready && typeof assetsAllReady==="function" && !assetsAllReady()){ showNetToast("Esperá un momento: todavía se está cargando el arte de la arena (" + assetsRestPct() + "%)."); return; }
    netSendLoadout(true); netSend({t:"update", ready:!me.ready});
  });
  bar.querySelectorAll("[data-net-champ]").forEach(b=> b.addEventListener("click", ()=> netPickChamp(b.getAttribute("data-net-champ"))));
  const lv = document.getElementById("net-leave-btn");
  if(lv) lv.addEventListener("click", ()=>{ netLeaveRoom(); setState("mainmenu"); renderMainMenu(); });
}
function netCopy(text, btn, ask){
  ask = ask || "Copiá este enlace:";
  const done = ()=>{ if(btn){ const t = btn.textContent; btn.textContent = "✔ Copiado"; setTimeout(()=>{ if(btn.isConnected) btn.textContent = t; }, 1600); } showNetToast("✔ Copiado: " + text); };
  if(navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(text).then(done).catch(()=>{ prompt(ask, text); }); }
  else prompt(ask, text);
}
// Aplica el HTML armado en el._next solo si cambió (clave = dónde se recuerda el último). Así una
// actualización de la sala que no cambia nada visible no reemplaza los botones bajo el dedo (en
// iPhone eso cortaba el scroll y se "comía" los toques). Si se está escribiendo en un campo de adentro,
// se conserva el texto y el cursor.
function _netCommitHTML(el, key){
  const html = el._next; el._next = null;
  if(html == null) return true;
  if(netLobby[key] === html && el.innerHTML) return false;
  const a = document.activeElement, keep = a && el.contains(a) && a.id && (a.tagName==="INPUT" || a.tagName==="TEXTAREA")
    ? {id:a.id, v:a.value, s:a.selectionStart, e:a.selectionEnd} : null;
  el.innerHTML = html; netLobby[key] = html;
  if(keep){ const n = document.getElementById(keep.id); if(n){ n.value = keep.v; try{ n.focus({preventScroll:true}); n.setSelectionRange(keep.s, keep.e); }catch(e){} } }
  return true;
}
// Elegir guardián DENTRO de la sala (anfitrión e invitados): los que usa otro jugador salen
// deshabilitados. Cambiar de guardián te saca el LISTO (tenés que prepararte de nuevo).
function netTakenChamps(){
  const t = new Set();
  if(net.room) net.room.slots.forEach((s,i)=>{ if(s && s.connected && i!==net.slot) t.add(s.champ); });
  return t;
}
function netChampStripHTML(){
  const taken = netTakenChamps();
  const btns = Object.keys(CLASSES).filter(k=>save.champions[k] && save.champions[k].unlocked!==false).map(k=>{
    const c = CLASSES[k], lv = save.champions[k].level;
    return `<button class="net-champ ${k===selectedClass?"sel":""}" data-net-champ="${k}" ${taken.has(k)&&k!==selectedClass?"disabled":""} title="${c.name}">${c.icon||""} ${c.name} · ${lv}</button>`;
  }).join("");
  return `<div class="net-hint">Tu guardián:</div><div class="net-champs">${btns}</div>`;
}
function netPickChamp(k){
  if(!CLASSES[k] || !save.champions[k] || k===selectedClass) return;
  if(netTakenChamps().has(k)){ showNetToast("Ese guardián ya lo usa otro jugador."); return; }
  selectedClass = k; netRememberChamp(k);
  if(net.role==="guest"){ netSend({t:"update", ready:false}); netSendLoadout(true); }
  else netSend({t:"update", champ:k, level:save.champions[k].level});
  renderPrepSummary();
}
function netRememberChamp(k){ try{ save.lastChamp = k; persist(); }catch(e){} }
// Lugares de la sala (reemplaza la vista "vos + 3 bots" cuando hay una sala online).
function netRenderLobbySlots(){
  const slots = document.getElementById("lobby-slots"); if(!slots || !net.room) return;
  slots._next = [0,1,2,3].map(i=>{
    const s = net.room.slots[i];
    if(!s) return `<div class="lobby-slot empty"><div class="lobby-empty">＋</div><div class="lobby-name">Esperando jugador…</div><div class="lobby-meta">al comenzar: BOT</div></div>`;
    const you = i===net.slot, key = you ? selectedClass : s.champ, skin = you ? (champSkinId(selectedClass)||"") : (netSlotSkin(i)||"");
    const cls = CLASSES[key] || CLASSES.guerrero;
    const lv = you ? save.champions[selectedClass].level : s.level;
    const tag = `P${i+1} · ` + (i===0 ? "HOST" : (you ? "VOS" : "AMIGO"));
    const st = !s.connected ? `<div class="lobby-ready off">⚠ Sin conexión</div>` : (i===0 ? `<div class="lobby-ready">● Conectado</div>` : (s.ready ? `<div class="lobby-ready">✔ Listo</div>` : `<div class="lobby-ready wait">● Conectado</div>`));
    return `<div class="lobby-slot pc${i} ${you?"you":""}">
      <div class="lobby-tag p${i}">${tag}</div>
      <canvas class="champ-anim lobby-anim" width="120" height="120" data-class-key="${key}" data-skin="${skin}" data-idle="1" data-ph="${i*1.3}" style="background:${cls.color}1c;"></canvas>
      <div class="lobby-name" style="color:${NET_SLOT_COLORS[i]}">${s.name}</div>
      ${skin && (typeof skinDefOf==="function" ? skinDefOf(skin) : SET_SKINS[skin]) ? `<div class="lobby-skin">🎨 ${(typeof skinDefOf==="function" ? skinDefOf(skin) : SET_SKINS[skin]).name}</div>` : ""}
      <div class="lobby-meta">${cls.name} · ${NET_ROLE_LABEL[cls.roleCategory]||""}</div>
      <div class="lobby-meta">Nv. ${lv||1}</div>
      ${st}
    </div>`;
  }).join("");
  _netCommitHTML(slots, "slotsHTML");
  const startBtn = document.getElementById("prep-start-btn");
  if(startBtn){
    if(net.role==="host"){
      const dup = netDuplicateChamps().length>0;
      const waiting = netNotReady().length;
      startBtn.disabled = dup;
      const lbl = (ARENA_MODS[currentArena]||{}).label||"";
      const verb = netLobby.matches>0 ? (netLobby.lastArena===currentArena ? `Reintentar · ${lbl}` : `Comenzar · ${lbl}`) : "Comenzar";
      startBtn.textContent = `${verb} (${netHumanCount()} ${netHumanCount()===1?"jugador":"jugadores"} + ${4-netHumanCount()} bots)` + (waiting ? ` · faltan ${waiting} LISTO` : "");
      startBtn.classList.remove("hidden");
    } else {
      startBtn.textContent = "Esperando que el anfitrión comience…";
      startBtn.disabled = true;
    }
  }
  startChampAnimLoop();
}
// El invitado le manda al anfitrión los datos de su guardián (solo lo equipado) cada vez que
// cambian en la pre-sala: así entra a la partida con ESE equipo.
// Solo se manda si CAMBIÓ algo (o si se pide `now`): antes cada render de la sala mandaba el loadout,
// el servidor reenviaba la sala a todos, eso volvía a renderizar... un bucle de ~4 veces por segundo
// que reconstruía la Sala entera (en celular cortaba el scroll y se perdían toques).
function netSendLoadout(now){
  if(net.role!=="guest" || !net.room) return;
  clearTimeout(netLobby.loadoutTimer);
  const go = ()=>{
    const L = netBuildLoadout(), sig = JSON.stringify(L);
    if(!now && sig === netLobby.lastLoadoutSig) return;
    netLobby.lastLoadoutSig = sig;
    netSendToHost({k:"loadout", L});
    const me = net.room && net.room.slots[net.slot];
    if(now || !me || me.champ!==selectedClass || me.level!==save.champions[selectedClass].level)
      netSend({t:"update", champ:selectedClass, level:save.champions[selectedClass].level});
  };
  if(now) go(); else netLobby.loadoutTimer = setTimeout(go, 250);
}
/* ---------------- skins en la sala ----------------
   Cada guardado es de su jugador: la skin de un invitado la calcula SU juego (netBuildLoadout.skin) y el
   anfitrión la reparte a todos ({k:"cos"}). Nunca se deduce del guardado local para otro jugador. */
function champSkinId(k){
  if(!k || !save.champions[k] || typeof activeSetSkinId!=="function") return null;
  try{ return activeSetSkinId({classKey:k}) || null; }catch(e){ return null; }
}
function netSlotSkin(i){
  if(net.role==="host") return (netLobby.loadouts[i]||{}).skin || null;
  return (netLobby.cos||{})[i] || null;
}
function netHostBroadcastCos(force){
  if(net.role!=="host" || !net.room) return;
  const m = {};
  net.room.slots.forEach((s,i)=>{ if(!s) return; m[i] = i===0 ? champSkinId(selectedClass) : ((netLobby.loadouts[i]||{}).skin || null); });
  const sig = JSON.stringify([m, net.room.slots.map(s=>s ? !!s.connected : null)]);
  if(!force && sig === netLobby.cosSig) return;
  netLobby.cosSig = sig;
  netBroadcast({k:"cos", m});
}
// Refresco liviano de la sala ante cambios de red: solo título, barra y lugares (no el equipo, los
// talentos ni la tienda de skins, que no dependen de la sala). Si hay un dedo apoyado en la pantalla
// (scrolleando o tocando un botón), espera a que lo levante.
function netRefreshLobby(){
  if(state!=="prep") return;
  if(netLobby.touching){ netLobby.pendingRefresh = true; return; }
  netLobby.pendingRefresh = false;
  if(!netInRoom()){ renderPrepSummary(); return; }
  const a = ARENA_MODS[currentArena]||{};
  document.getElementById("lobby-title").textContent = "Sala · " + (a.label||"Arena");
  document.getElementById("lobby-sub").textContent = `4 lugares · ${netHumanCount()} conectado${netHumanCount()===1?"":"s"} · los libres serán bots al comenzar`;
  renderLobbyArena();
  netRenderLobbyBar();
  if(typeof prepSecSync==="function") prepSecSync(); // pestañas de la Sala (js/ui/prep-sections.js)
  if(typeof netRenderChat==="function") netRenderChat(); // silenciados/estado del chat (incremental: no reconstruye)
  netRenderLobbySlots();
}
(function netTrackTouches(){
  const scr = document.getElementById("prep-screen"); if(!scr) return;
  const down = ()=>{ netLobby.touching = true; clearTimeout(netLobby._touchT); netLobby._touchT = setTimeout(up, 4000); };
  const up = ()=>{ if(!netLobby.touching) return; netLobby.touching = false; clearTimeout(netLobby._touchT);
    if(netLobby.pendingRefresh) setTimeout(netRefreshLobby, 60); };
  scr.addEventListener("pointerdown", down, true);
  scr.addEventListener("touchstart", down, {capture:true, passive:true});
  for(const ev of ["pointerup","pointercancel","touchend","touchcancel"]) window.addEventListener(ev, up, {capture:true, passive:true});
  scr.addEventListener("scroll", ()=>{ if(netLobby.touching){ clearTimeout(netLobby._touchT); netLobby._touchT = setTimeout(up, 700); } }, {passive:true});
})();

/* ---------------- eventos de red ---------------- */
netOn("joined", (m)=>{
  netLobby.lastError = ""; netLobby.lastLoadoutSig = ""; netLobby.cosSig = ""; netLobby.barHTML = ""; netLobby.slotsHTML = "";
  if(!m.reconnect) netLobby.cos = {};
  _netSetJoinStatus("");
  if(m.host){ netLobby.loadouts = {}; }
  else {
    // el invitado entra directo a la pre-sala de la arena del anfitrión
    currentArena = m.room.arena || currentArena;
    if(!m.reconnect || !netMatch){
      lobbyAllies = null;
      setState("prep");
      renderPrepSummary();
    }
    netSendLoadout(true);
  }
});
netOn("room", (room)=>{
  if(netMatch && netIsHost()) netHostOnRoom(room);
  if(net.role==="guest" && !netIsGuestPlaying() && room.arena && room.arena!==currentArena){
    currentArena = room.arena;
    // en la Sala: aviso de la arena nueva que eligió el anfitrión (en los resultados se ve al volver)
    if(state==="prep" && ARENA_MODS[currentArena]) showNetToast(`El anfitrión eligió la arena ${_lobbyArenaName(currentArena)}` + (isArenaUnlocked(currentArena) ? "" : " (no te cuenta para la campaña: todavía no la desbloqueaste)"));
  }
  // el anfitrión volvió a la sala: los invitados que siguen en los resultados lo siguen solos
  if(net.role==="guest" && room.state==="lobby" && (state==="gameover" || state==="victory")) netStartAutoReturn(4, "El anfitrión volvió a la sala");
  if(net.role==="host") netHostBroadcastCos(false);
  if(state==="prep") netRefreshLobby();
  if(typeof netDebugRefresh==="function") netDebugRefresh();
});
netOn("msg", (from, d)=>{
  if(net.role==="host") netHostOnMsg(from, d);
  else netGuestOnMsg(from, d);
});
netOn("closed", (reason, role)=>{
  if(netMatch && (state==="playing" || state==="buff" || state==="paused")){ netOnMatchClosed(reason, role); return; }
  if(netMatch){ netRestoreBackups(); netMatch = null; persistNow(); }
  netCancelAutoReturn();
  if(state==="gameover" || state==="victory"){
    // estaba viendo los resultados: la sala ya no existe -> el botón lleva al menú
    netLobby.roomGone = true; netEndLabels();
    showNetToast(reason==="host_left" ? "El anfitrión cerró la sala." : "Se perdió la conexión con la sala.");
    return;
  }
  netLobby.lastError = reason==="host_left" ? "El anfitrión cerró la sala." : (reason==="kicked" ? "Te sacaron de la sala." : "Se perdió la conexión con la sala.");
  if(state==="prep" || state==="menu"){
    if(role==="guest"){ setState("mainmenu"); renderMainMenu(); showNetToast(netLobby.lastError); }
    else renderPrepSummary();
  }
});
netOn("error", (m)=>{
  netLobby.lastError = NET_ERRORS[m.code] || ("Error: "+(m.msg||m.code));
  // un intento de unirse que falló: la conexión queda abierta sin sala; se cierra para empezar limpio
  if(!netInRoom() && ["NOT_FOUND","ROOM_FULL","STARTED","BUILD","VERSION","HOST_RECONNECT"].includes(m.code)){ try{ netLeaveRoom(); }catch(e){} }
  if(state==="prep") netRenderLobbyBar();
  _netSetJoinStatus(netLobby.lastError, true);
  const tj = document.getElementById("title-join-status");
  if(tj) tj.textContent = netLobby.lastError;
  showNetToast(netLobby.lastError);
});
function showNetToast(text){
  let t = document.getElementById("net-toast");
  if(!t){
    t = document.createElement("div"); t.id = "net-toast";
    t.addEventListener("animationend", ()=> t.classList.remove("show")); // oculto no ocupa lugar en la columna
  }
  // en la columna de avisos de arriba a la derecha (toastStackHost, js/ui/screens.js), primero de todos
  const host = typeof toastStackHost==="function" ? toastStackHost() : document.body;
  if(t.parentNode!==host) host.insertBefore(t, host.firstChild);
  t.textContent = text; t.classList.remove("show"); void t.offsetWidth; t.classList.add("show");
}

/* ---------------- unirse desde el enlace (?room=CÓDIGO) ---------------- */
(function netSetupJoinFromUrl(){
  const code = netRoomCodeFromUrl();
  if(!code) return;
  netLobby.pendingJoin = code;
  const btn = document.getElementById("title-join-btn");
  const cont = document.getElementById("title-continue-btn");
  if(!btn) return;
  btn.textContent = `Unirse a la sala ${code}`;
  btn.classList.remove("hidden");
  const status = document.getElementById("title-join-status");
  if(status) status.textContent = netAvailable() ? "Te invitaron a jugar. Poné tu nombre y tocá Unirse." : "Este enlace necesita el servidor online (no configurado en esta versión).";
  if(netAvailable()) netWarmup();
  const nameBox = document.getElementById("title-join-name");
  if(nameBox){ nameBox.classList.remove("hidden"); const inp = nameBox.querySelector("input"); if(inp) inp.value = netPlayerName()==="Jugador" ? "" : netPlayerName(); }
  if(cont) cont.classList.add("secondary-join");
  // se habilita recién cuando terminó de cargar el arte (igual que "Toca para continuar")
  btn.disabled = true;
  const waitReady = setInterval(()=>{ if(cont && !cont.disabled){ btn.disabled = false; clearInterval(waitReady); } }, 200);
  btn.addEventListener("click", ()=>{
    if(btn.disabled) return;
    try{ startMusic(); }catch(e){}
    const inp = document.querySelector("#title-join-name input");
    if(inp) netSetPlayerName(inp.value);
    // modo campaña: un invitado nuevo también elige primero su guardián de regalo, y recién ahí entra
    if(typeof needsStarterChampion==="function" && needsStarterChampion()){ openStarterSelect(()=>{ setState("title"); doJoin(); }); return; }
    doJoin();
  });
  async function doJoin(){
    if(typeof ensureOwnedSelection==="function") ensureOwnedSelection();
    btn.disabled = true; btn.textContent = netConnectLabel(0);
    try{
      await netJoinRoom(code, selectedClass, (save.champions[selectedClass]||{}).level||1, secs=>{ btn.textContent = netConnectLabel(secs); });
    }catch(e){
      if(!(e && e.handled)){
        if(status) status.textContent = "No se pudo conectar: "+(e.message||e);
        netLog("NETWORK_ERROR", {join:String(e.message||e)});
        showNetToast("⚠ No se pudo unir: "+(e.message||e));
      }
    }
    btn.disabled = false; btn.textContent = `Unirse a la sala ${code}`;
  }
})();

/* ---------------- MULTIJUGADOR → 🔑 UNIRSE CON CÓDIGO ----------------
   Dos jugadores abren LA HORDA cada uno por su lado: uno crea la sala (Arena → Sala → Crear sala
   online) y le dicta el código al otro, que lo escribe acá y entra directo a esa Sala. */
function netRenderModeJoin(){
  const card = document.getElementById("mode-join-card"); if(!card) return;
  if(typeof ensureOwnedSelection==="function") ensureOwnedSelection();
  const nm = document.getElementById("mode-join-name");
  if(nm && document.activeElement!==nm) nm.value = netPlayerName()==="Jugador" ? "" : netPlayerName();
  const ch = document.getElementById("mode-join-champ"), c = CLASSES[selectedClass], sc = save.champions[selectedClass];
  if(ch) ch.innerHTML = c && sc && sc.unlocked ? `Entrás con <b>${c.name}</b> · Nv. ${sc.level} (lo podés cambiar en la Sala)` : "";
  if(!netAvailable()) _netSetJoinStatus("El modo online no está configurado en esta versión.", true);
  else netWarmup();
}
(function netSetupModeJoin(){
  const btn = document.getElementById("mode-join-btn"), inp = document.getElementById("mode-join-code");
  if(!btn || !inp) return;
  const go = ()=>{
    const nm = document.getElementById("mode-join-name"); if(nm) netSetPlayerName(nm.value);
    const v = inp.value;
    const pre = netValidateCode(v); if(pre.err){ _netSetJoinStatus(pre.err, true); inp.focus(); return; }
    inp.value = pre.code;
    // modo campaña: si todavía no eligió su guardián de regalo, primero eso y después entra
    if(typeof needsStarterChampion==="function" && needsStarterChampion()){
      openStarterSelect(()=>{ setState("modeselect"); netRenderModeJoin(); netJoinWithCode(pre.code, btn, "UNIRSE"); });
      return;
    }
    netJoinWithCode(v, btn, "UNIRSE");
  };
  btn.addEventListener("click", go);
  inp.addEventListener("keydown", (e)=>{ if(e.key==="Enter"){ e.preventDefault(); go(); } });
  inp.addEventListener("input", ()=>{ _netSetJoinStatus(""); });
  const nm = document.getElementById("mode-join-name");
  if(nm) nm.addEventListener("change", ()=> netSetPlayerName(nm.value));
  const paste = document.getElementById("mode-join-paste");
  if(paste) paste.addEventListener("click", async ()=>{
    try{ const t = await navigator.clipboard.readText(); if(t){ const v = netValidateCode(t); inp.value = v.code || t.trim(); } }
    catch(e){ inp.focus(); showNetToast("Mantené apretado el cuadro y elegí Pegar."); }
  });
  const jugar = document.getElementById("mainmenu-jugar-btn");
  if(jugar) jugar.addEventListener("click", ()=> setTimeout(netRenderModeJoin, 0));
  const back = document.getElementById("arenaselect-back-btn");
  if(back) back.addEventListener("click", ()=> setTimeout(netRenderModeJoin, 0));
  netRenderModeJoin();
})();

function netIsGuestPlaying(){ return !!(netMatch && netMatch.role==="guest" && !netMatch.ended); }

/* ---------------- LOOP DE LA SALA: partida -> resultados -> la MISMA sala ----------------
   Derrota (team wipe) o victoria -> resultados -> VOLVER AL LOBBY. El anfitrión vuelve (botón, o
   solo a los 20 s en una derrota) y la sala pasa a "esperando": los invitados que siguen en los
   resultados vuelven solos a los pocos segundos. Misma sala, mismo código, mismos jugadores y,
   tras una DERROTA, la misma arena; tras una VICTORIA, la sala vuelve con la próxima arena de la
   campaña ya elegida (el anfitrión la puede cambiar en la Sala: renderLobbyArena). LISTO vuelve a
   NO LISTO (lo resetea el servidor) y cada uno puede cambiar de guardián, equipo y talentos antes
   de marcar LISTO otra vez. */
function netEndLabels(){
  const online = !!(netMatch || netInRoom());
  const back = netLobby.roomGone ? "Volver al menú" : "VOLVER AL LOBBY";
  const r = document.getElementById("retry-btn"), a = document.getElementById("again-btn");
  const m1 = document.getElementById("menu-btn-1"), m2 = document.getElementById("menu-btn-2");
  if(online || netLobby.roomGone){
    if(r) r.textContent = back;
    if(a) a.textContent = back;
    const leave = netLobby.roomGone ? "Volver al menú" : (net.role==="host" ? "Cerrar la sala y salir" : "Salir de la sala");
    if(m1) m1.textContent = leave;
    if(m2) m2.textContent = leave;
  } else {
    if(m1) m1.textContent = "Volver al menú";
    if(m2) m2.textContent = "Volver al menú";
  }
}
function netCancelAutoReturn(){ if(netLobby.autoTimer){ clearInterval(netLobby.autoTimer); netLobby.autoTimer = null; } }
function netStartAutoReturn(secs, why){
  if(netLobby.autoTimer) return;
  let left = secs;
  if(why) showNetToast(why);
  const tick = ()=>{
    if(state!=="gameover" && state!=="victory"){ netCancelAutoReturn(); return; }
    const r = document.getElementById(state==="gameover" ? "retry-btn" : "again-btn");
    if(left<=0){ netCancelAutoReturn(); netBackToRoomIfAny(); return; }
    if(r) r.textContent = `VOLVER AL LOBBY (${left})`;
    left--;
  };
  tick();
  netLobby.autoTimer = setInterval(tick, 1000);
}
// Llamado al mostrar la pantalla de derrota/victoria de una partida online.
function netOnEndScreen(victory){
  netLobby.roomGone = false;
  // tras una victoria, el anfitrión vuelve a la sala con la PRÓXIMA arena ya elegida (netFinishMatch)
  netLobby.nextArena = (net.role==="host" && victory) ? nextCampaignArena(currentArena) : null;
  netEndLabels();
  if(net.role==="host" && !victory) netStartAutoReturn(20);
  // el invitado que llega tarde a los resultados y el anfitrión ya volvió: lo sigue
  if(net.role==="guest" && net.room && net.room.state==="lobby") netStartAutoReturn(4, "El anfitrión ya volvió a la sala");
}

/* ---------------- UNIRSE pegando el enlace o el código (desde la Sala) ----------------
   La única entrada al cooperativo es la Arena (modo campaña): Arena -> elegir arena -> guardián ->
   Sala. Ahí se crea la sala online o se pega el enlace/código de la sala de un amigo (también
   sigue andando abrir directamente el enlace de invitación: ver netSetupJoinFromUrl). */
// Acepta el enlace completo (…index.html?room=QKL58J[&server=…]), "SALA QKL58J" o el código solo.
function netParseInvite(txt){
  txt = String(txt||"").trim();
  if(!txt) return null;
  let code = null, server = null;
  const m = txt.match(/[?&#]room=([A-Za-z0-9]+)/);
  if(m){
    code = m[1];
    const sm = txt.match(/[?&]server=([^&#\s]+)/);
    if(sm){ try{ server = decodeURIComponent(sm[1]); }catch(e){} }
  } else {
    const c = txt.toUpperCase().replace(/^SALA\s*/, "").replace(/[^A-Z0-9]/g, "");
    if(c.length>=4 && c.length<=8) code = c;
  }
  if(!code) return null;
  return {code: code.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0,8), server};
}
// Valida lo escrito: {code, server} o {err:"motivo claro"}. Los códigos del servidor son 6 caracteres
// de ABCDEFGHJKLMNPQRSTUVWXYZ23456789 (sin 0/O/1/I, para dictarlos sin confusiones).
const NET_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function netValidateCode(raw){
  raw = String(raw||"").trim();
  if(!raw) return {err:"Escribí el código de la sala (6 letras y números, ej. QKL58J)."};
  if(/room=/i.test(raw)){ const inv = netParseInvite(raw); return inv ? inv : {err:"Ese enlace no tiene un código de sala válido."}; }
  const c = raw.toUpperCase().replace(/^SALA\s*/, "").replace(/[\s\-·.]/g, "");
  if(/[^A-Z0-9]/.test(c)) return {err:"El código solo lleva letras y números."};
  if(c.length !== 6) return {err:`El código tiene 6 caracteres (escribiste ${c.length}).`};
  const bad = [...c].filter(ch=>!NET_CODE_CHARS.includes(ch));
  if(bad.length) return {err:"Código inválido: los códigos no usan O, 0, I ni 1 (¿quisiste escribir otra letra?)."};
  return {code:c, server:null};
}
// Estado visible de las cajas de "unirse" (Sala y Modos de juego).
function _netSetJoinStatus(text, isErr){
  for(const id of ["net-join-status","mode-join-status"]){
    const el = document.getElementById(id); if(!el) continue;
    el.textContent = text || ""; el.classList.toggle("ok", !!text && !isErr);
  }
}
let _netJoinBusy = false;
// Unirse con un código o enlace (desde la Sala o desde MODOS DE JUEGO → UNIRSE CON CÓDIGO).
async function netJoinWithCode(raw, btn, label){
  if(_netJoinBusy) return false;
  const inv = netValidateCode(raw);
  if(inv.err){ _netSetJoinStatus(inv.err, true); return false; }
  if(inv.server) net.serverOverride = inv.server;
  if(!netAvailable()){ _netSetJoinStatus("El modo online no está configurado en esta versión.", true); return false; }
  if(typeof ensureOwnedSelection==="function") ensureOwnedSelection();
  if(!save.champions[selectedClass] || !save.champions[selectedClass].unlocked){ _netSetJoinStatus("Elegí primero un guardián tuyo.", true); return false; }
  if(netInRoom()) netLeaveRoom();
  netLobby.lastError = "";
  _netJoinBusy = true;
  if(btn){ btn.disabled = true; btn.textContent = "Conectando…"; }
  _netSetJoinStatus(`Buscando la sala ${inv.code}…`);
  let ok = true;
  try{ await netJoinRoom(inv.code, selectedClass, (save.champions[selectedClass]||{}).level||1, secs=>{ if(secs >= 4) _netSetJoinStatus(`Buscando la sala ${inv.code}… ${netConnectLabel(secs)}`); }); }
  catch(e){ ok = false; if(!(e && e.handled)){ _netSetJoinStatus("No se pudo unir: "+(e.message||e), true); netLog("NETWORK_ERROR", {join:String(e.message||e)}); showNetToast("⚠ No se pudo unir: "+(e.message||e)); } }
  _netJoinBusy = false;
  if(btn && btn.isConnected){ btn.disabled = false; btn.textContent = label || "UNIRSE"; }
  return ok;
}
async function netJoinFromInput(){
  const ni = document.getElementById("net-name-input"); if(ni) netSetPlayerName(ni.value);
  await netJoinWithCode((document.getElementById("net-join-code")||{}).value, document.getElementById("net-join-btn"), "UNIRSE");
}
// El guardián elegido la última vez (en la selección o la sala) queda recordado.
// Se llama desde main.js después de loadSave().
function netRestoreLastChamp(){
  try{
    const k = save.lastChamp;
    if(k && CLASSES[k] && save.champions[k] && save.champions[k].unlocked!==false) selectedClass = k;
    if(typeof ensureOwnedSelection==="function") ensureOwnedSelection();
  }catch(e){}
}
