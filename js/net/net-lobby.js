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
const netLobby = { loadouts:{}, pendingJoin:null, loadoutTimer:null, lastError:"" };
const NET_ROLE_LABEL = {tanque:"Tanque", asesino:"Asesino", mago:"Mago", soporte:"Soporte"};
const NET_ERRORS = {
  ROOM_FULL:"SALA COMPLETA: ya hay 4 jugadores.", NOT_FOUND:"No existe esa sala (¿el anfitrión la cerró?).",
  STARTED:"La partida de esa sala ya comenzó.", VERSION:"Tu versión del juego es distinta a la del servidor. Recargá la página.",
  BUILD:"El anfitrión tiene otra versión del juego. Abran los dos el mismo enlace.", SERVER_FULL:"El servidor está lleno, probá en un rato.",
  HOST_RECONNECT:"El anfitrión no puede volver a entrar a su sala."
};

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
      bar.innerHTML = `<div class="net-row">${nameInput}<span class="net-off">🌐 Online: servidor no configurado todavía (ver docs/MULTIPLAYER_B1.md). Podés jugar con 3 bots.</span></div>`;
    } else {
      bar.innerHTML = `<div class="net-row">${nameInput}<button class="btn small" id="net-create-btn">🌐 Crear sala online</button></div>
        <div class="net-hint">Creá una sala para invitar hasta 3 amigos. Si no invitás a nadie, jugás con bots como siempre.</div>
        ${netLobby.lastError ? `<div class="net-err">${netLobby.lastError}</div>` : ""}`;
    }
  } else if(net.role==="host"){
    const url = netInviteUrl();
    const dup = netDuplicateChamps();
    bar.innerHTML = `<div class="net-row">${nameInput}<span class="net-code">SALA <b>${net.code}</b></span>
        <button class="btn small" id="net-copy-btn">📋 Copiar enlace</button>
        ${navigator.share ? `<button class="btn small" id="net-share-btn">📨 Invitar</button>` : ""}
        <button class="btn secondary small" id="net-close-btn">Cerrar sala</button></div>
      <div class="net-hint">Mandá el enlace a tus amigos (hasta 3). Aparecen acá en tiempo real. Cuando quieras, COMENZAR: los lugares libres los ocupan bots.</div>
      <div class="net-link">${url}</div>
      ${dup.length ? `<div class="net-err">Hay campeones repetidos (${dup.map(k=>CLASSES[k].name).join(", ")}): cada jugador tiene que usar uno distinto.</div>` : ""}
      ${netLobby.lastError ? `<div class="net-err">${netLobby.lastError}</div>` : ""}`;
  } else {
    const me = net.room.slots[net.slot] || {};
    const dup = netDuplicateChamps();
    bar.innerHTML = `<div class="net-row">${nameInput}<span class="net-code">SALA <b>${net.code}</b> · Anfitrión: ${(net.room.slots[0]||{}).name||"?"}</span>
        <button class="btn small ${me.ready?"ready-on":""}" id="net-ready-btn">${me.ready ? "✔ LISTO" : "Marcar LISTO"}</button>
        <button class="btn secondary small" id="net-champ-btn">Cambiar campeón</button>
        <button class="btn secondary small" id="net-leave-btn">Salir de la sala</button></div>
      <div class="net-hint">Prepará tu equipo. El anfitrión decide cuándo comenzar.</div>
      ${dup.length ? `<div class="net-err">Tu campeón ya lo usa otro jugador: tocá "Cambiar campeón".</div>` : ""}`;
  }
  const ni = document.getElementById("net-name-input");
  if(ni) ni.addEventListener("change", ()=>{ netSetPlayerName(ni.value); });
  const c = document.getElementById("net-create-btn");
  if(c) c.addEventListener("click", async ()=>{
    if(!isArenaUnlocked(currentArena)){ netLobby.lastError = "Esa arena todavía no la desbloqueaste."; netRenderLobbyBar(); return; }
    c.disabled = true; c.textContent = "Conectando… (si el servidor dormía, hasta 1 minuto)"; netLobby.lastError = "";
    const ni2 = document.getElementById("net-name-input"); if(ni2) netSetPlayerName(ni2.value);
    try{ await netCreateRoom(currentArena, selectedClass, save.champions[selectedClass].level); }
    catch(e){ netLobby.lastError = "No se pudo conectar al servidor online: "+(e.message||e); netLog("NETWORK_ERROR", {create:String(e.message||e)}); netRenderLobbyBar(); }
  });
  const cp = document.getElementById("net-copy-btn");
  if(cp) cp.addEventListener("click", ()=> netCopy(netInviteUrl(), cp));
  const sh = document.getElementById("net-share-btn");
  if(sh) sh.addEventListener("click", ()=>{ navigator.share({title:"LA HORDA", text:`Sumate a mi sala de LA HORDA (${(ARENA_MODS[currentArena]||{}).label||""})`, url:netInviteUrl()}).catch(()=>{}); });
  const cl = document.getElementById("net-close-btn");
  if(cl) cl.addEventListener("click", ()=>{ if(confirm("¿Cerrar la sala? Los jugadores conectados vuelven al menú.")){ netLeaveRoom(); renderPrepSummary(); } });
  const rd = document.getElementById("net-ready-btn");
  if(rd) rd.addEventListener("click", ()=>{ const me = net.room.slots[net.slot]||{}; netSendLoadout(true); netSend({t:"update", ready:!me.ready}); });
  const ch = document.getElementById("net-champ-btn");
  if(ch) ch.addEventListener("click", ()=>{ setState("menu"); renderChampGrid(); renderSaveLine(); });
  const lv = document.getElementById("net-leave-btn");
  if(lv) lv.addEventListener("click", ()=>{ netLeaveRoom(); setState("mainmenu"); renderMainMenu(); });
}
function netCopy(text, btn){
  const done = ()=>{ if(btn){ const t = btn.textContent; btn.textContent = "✔ Copiado"; setTimeout(()=>{ btn.textContent = t; }, 1600); } };
  if(navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(text).then(done).catch(()=>{ prompt("Copiá este enlace:", text); }); }
  else prompt("Copiá este enlace:", text);
}
// Lugares de la sala (reemplaza la vista "vos + 3 bots" cuando hay una sala online).
function netRenderLobbySlots(){
  const slots = document.getElementById("lobby-slots"); if(!slots || !net.room) return;
  slots.innerHTML = [0,1,2,3].map(i=>{
    const s = net.room.slots[i];
    if(!s) return `<div class="lobby-slot empty"><div class="lobby-empty">＋</div><div class="lobby-name">Esperando jugador…</div><div class="lobby-meta">al comenzar: BOT</div></div>`;
    const you = i===net.slot, key = you ? selectedClass : s.champ;
    const cls = CLASSES[key] || CLASSES.guerrero;
    const lv = you ? save.champions[selectedClass].level : s.level;
    const tag = i===0 ? "HOST" : (you ? "VOS" : "AMIGO");
    const st = !s.connected ? `<div class="lobby-ready off">⚠ Sin conexión</div>` : (i===0 ? `<div class="lobby-ready">● Conectado</div>` : (s.ready ? `<div class="lobby-ready">✔ Listo</div>` : `<div class="lobby-ready wait">● Conectado</div>`));
    return `<div class="lobby-slot ${you?"you":""}">
      <div class="lobby-tag ${you?"you":(i===0?"host":"friend")}">${tag}</div>
      <canvas class="champ-anim lobby-anim" width="88" height="88" data-class-key="${key}" style="background:${cls.color}1c;"></canvas>
      <div class="lobby-name">${s.name}</div>
      <div class="lobby-meta">${cls.name} · ${NET_ROLE_LABEL[cls.roleCategory]||""}</div>
      <div class="lobby-meta">Nv. ${lv||1}</div>
      ${st}
    </div>`;
  }).join("");
  const startBtn = document.getElementById("prep-start-btn");
  if(startBtn){
    if(net.role==="host"){
      const dup = netDuplicateChamps().length>0;
      startBtn.disabled = dup;
      startBtn.textContent = `Comenzar (${netHumanCount()} ${netHumanCount()===1?"jugador":"jugadores"} + ${4-netHumanCount()} bots)`;
      startBtn.classList.remove("hidden");
    } else {
      startBtn.textContent = "Esperando que el anfitrión comience…";
      startBtn.disabled = true;
    }
  }
  startChampAnimLoop();
}
// El invitado le manda al anfitrión los datos de su campeón (solo lo equipado) cada vez que
// cambian en la pre-sala: así entra a la partida con ESE equipo.
function netSendLoadout(now){
  if(net.role!=="guest" || !net.room) return;
  clearTimeout(netLobby.loadoutTimer);
  const go = ()=>{ netSendToHost({k:"loadout", L:netBuildLoadout()}); netSend({t:"update", champ:selectedClass, level:save.champions[selectedClass].level}); };
  if(now) go(); else netLobby.loadoutTimer = setTimeout(go, 250);
}

/* ---------------- eventos de red ---------------- */
netOn("joined", (m)=>{
  netLobby.lastError = "";
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
  if(state==="prep") renderPrepSummary();
  if(typeof netDebugRefresh==="function") netDebugRefresh();
});
netOn("msg", (from, d)=>{
  if(net.role==="host") netHostOnMsg(from, d);
  else netGuestOnMsg(from, d);
});
netOn("closed", (reason, role)=>{
  if(netMatch && (state==="playing" || state==="buff" || state==="paused")){ netOnMatchClosed(reason, role); return; }
  netMatch = null;
  netLobby.lastError = reason==="host_left" ? "El anfitrión cerró la sala." : (reason==="kicked" ? "Te sacaron de la sala." : "Se perdió la conexión con la sala.");
  if(state==="prep" || state==="menu"){
    if(role==="guest"){ setState("mainmenu"); renderMainMenu(); showNetToast(netLobby.lastError); }
    else renderPrepSummary();
  }
});
netOn("error", (m)=>{
  netLobby.lastError = NET_ERRORS[m.code] || ("Error: "+(m.msg||m.code));
  if(state==="prep") netRenderLobbyBar();
  const tj = document.getElementById("title-join-status");
  if(tj) tj.textContent = netLobby.lastError;
  showNetToast(netLobby.lastError);
});
function showNetToast(text){
  let t = document.getElementById("net-toast");
  if(!t){ t = document.createElement("div"); t.id = "net-toast"; document.body.appendChild(t); }
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
  btn.addEventListener("click", async ()=>{
    if(btn.disabled) return;
    try{ startMusic(); }catch(e){}
    const inp = document.querySelector("#title-join-name input");
    if(inp) netSetPlayerName(inp.value);
    btn.disabled = true; btn.textContent = "Conectando… (hasta 1 minuto si el servidor dormía)";
    try{
      await netJoinRoom(code, selectedClass, (save.champions[selectedClass]||{}).level||1);
    }catch(e){
      if(status) status.textContent = "No se pudo conectar: "+(e.message||e);
      netLog("NETWORK_ERROR", {join:String(e.message||e)});
    }
    btn.disabled = false; btn.textContent = `Unirse a la sala ${code}`;
  });
})();
