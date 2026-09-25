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
const netLobby = { loadouts:{}, pendingJoin:null, loadoutTimer:null, lastError:"", matches:0, autoTimer:null, roomGone:false };
// Color de cada jugador (P1-P4): sala, nombres sobre el personaje y marcadores.
const NET_SLOT_COLORS = ["#ff7a2e","#3fa7ff","#4fd16a","#c77dff"];
const NET_ROLE_LABEL = {tanque:"Tanque", asesino:"Asesino", mago:"Mago", soporte:"Soporte"};
const NET_ERRORS = {
  ROOM_FULL:"SALA COMPLETA: ya hay 4 jugadores.", NOT_FOUND:"No existe esa sala (¿el anfitrión la cerró?).",
  STARTED:"La partida de esa sala ya comenzó.", VERSION:"Tu versión del juego es distinta a la del servidor. Recargá la página.",
  BUILD:"El anfitrión tiene otra versión del juego. Abran los dos el mismo enlace.", SERVER_FULL:"El servidor está lleno, probá en un rato.",
  HOST_RECONNECT:"El anfitrión no puede volver a entrar a su sala."
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
      bar.innerHTML = `<div class="net-row">${nameInput}<span class="net-off">🌐 Online: servidor no configurado todavía (ver docs/MULTIPLAYER_B1.md). Podés jugar con 3 bots.</span></div>`;
    } else {
      bar.innerHTML = `<div class="net-row">${nameInput}<button class="btn small" id="net-create-btn">🌐 Crear sala online</button></div>
        <div class="net-hint">Creá una sala para invitar hasta 3 amigos. Si no invitás a nadie, jugás con bots como siempre.</div>
        <div class="net-join-box">
          <div class="net-hint"><b>¿Te invitaron?</b> Pegá el enlace o el código de la sala de tu amigo (entrás a SU arena, con el campeón que elegiste):</div>
          <div class="net-row"><input id="net-join-code" class="multi-input" placeholder="Enlace de invitación o código (ej. QKL58J)" autocomplete="off" autocapitalize="characters">
            <button class="btn small" id="net-paste-btn">📋 Pegar</button><button class="btn small" id="net-join-btn">Unirse</button></div>
        </div>
        ${netLobby.lastError ? `<div class="net-err" id="net-join-status">${netLobby.lastError}</div>` : `<div class="net-err" id="net-join-status"></div>`}`;
    }
  } else if(net.role==="host"){
    const url = netInviteUrl();
    const dup = netDuplicateChamps();
    const arenaOpts = ARENA_ORDER.filter(k=>isArenaUnlocked(k)).map(k=>`<option value="${k}" ${k===currentArena?"selected":""}>${(ARENA_MODS[k]||{}).label||k}</option>`).join("");
    bar.innerHTML = `<div class="net-row">${nameInput}<span class="net-code">SALA <b>${net.code}</b></span>
        <button class="btn small" id="net-copy-btn">📋 Copiar enlace</button>
        ${navigator.share ? `<button class="btn small" id="net-share-btn">📨 Invitar</button>` : ""}
        <button class="btn secondary small" id="net-close-btn">Cerrar sala</button></div>
      <div class="net-row"><label class="net-name net-arena">Arena <select id="net-arena-sel">${arenaOpts}</select></label></div>
      <div class="net-hint">Mandá el enlace (o el código <b>${net.code}</b>) a tus amigos: lo pegan en su Sala (Arena → elegir arena y campeón → Unirse). Aparecen acá en tiempo real. Cuando estén LISTOS, COMENZAR: los lugares libres los ocupan bots.</div>
      <div class="net-link">${url}</div>
      ${netChampStripHTML()}
      ${dup.length ? `<div class="net-err">Hay campeones repetidos (${dup.map(k=>CLASSES[k].name).join(", ")}): cada jugador tiene que usar uno distinto.</div>` : ""}
      ${netLobby.lastError ? `<div class="net-err">${netLobby.lastError}</div>` : ""}`;
  } else {
    const me = net.room.slots[net.slot] || {};
    const dup = netDuplicateChamps();
    const hostBusy = net.room.state!=="lobby";
    bar.innerHTML = `<div class="net-row">${nameInput}<span class="net-code">SALA <b>${net.code}</b> · Anfitrión: ${(net.room.slots[0]||{}).name||"?"}</span>
        <button class="btn small ${me.ready?"ready-on":""}" id="net-ready-btn" ${hostBusy?"disabled":""}>${me.ready ? "✔ LISTO" : "Marcar LISTO"}</button>
        <button class="btn secondary small" id="net-leave-btn">Salir de la sala</button></div>
      <div class="net-hint">Elegí tu campeón y prepará tu equipo. Arena: <b>${(ARENA_MODS[currentArena]||{}).label||""}</b> (la elige el anfitrión).</div>
      ${hostBusy ? `<div class="net-wait-host">El anfitrión todavía está en la partida/resultados: cuando vuelva a la sala vas a poder marcar LISTO.</div>` : ""}
      ${netChampStripHTML()}
      ${dup.length ? `<div class="net-err">Tu campeón ya lo usa otro jugador: elegí otro.</div>` : ""}`;
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
  const jb = document.getElementById("net-join-btn");
  if(jb) jb.addEventListener("click", netJoinFromInput);
  const jc = document.getElementById("net-join-code");
  if(jc) jc.addEventListener("keydown", (e)=>{ if(e.key==="Enter") netJoinFromInput(); });
  const jp = document.getElementById("net-paste-btn");
  if(jp) jp.addEventListener("click", async ()=>{
    try{ const t = await navigator.clipboard.readText(); if(t && jc) jc.value = t.trim(); }
    catch(e){ if(jc) jc.focus(); showNetToast("Mantené apretado el cuadro y elegí Pegar."); }
  });
  const cp = document.getElementById("net-copy-btn");
  if(cp) cp.addEventListener("click", ()=> netCopy(netInviteUrl(), cp));
  const sh = document.getElementById("net-share-btn");
  if(sh) sh.addEventListener("click", ()=>{ navigator.share({title:"LA HORDA", text:`Sumate a mi sala de LA HORDA (${(ARENA_MODS[currentArena]||{}).label||""})`, url:netInviteUrl()}).catch(()=>{}); });
  const cl = document.getElementById("net-close-btn");
  if(cl) cl.addEventListener("click", ()=>{ if(confirm("¿Cerrar la sala? Los jugadores conectados vuelven al menú.")){ netLeaveRoom(); renderPrepSummary(); } });
  const rd = document.getElementById("net-ready-btn");
  if(rd) rd.addEventListener("click", ()=>{
    const me = net.room.slots[net.slot]||{};
    if(!me.ready && netDuplicateChamps().includes(selectedClass)){ showNetToast("Ese campeón ya lo usa otro jugador: elegí otro."); return; }
    netSendLoadout(true); netSend({t:"update", ready:!me.ready});
  });
  bar.querySelectorAll("[data-net-champ]").forEach(b=> b.addEventListener("click", ()=> netPickChamp(b.getAttribute("data-net-champ"))));
  const as = document.getElementById("net-arena-sel");
  if(as) as.addEventListener("change", ()=>{
    if(!isArenaUnlocked(as.value)) return;
    currentArena = as.value; updateMenuBrandSub();
    netSend({t:"update", arena:currentArena});
    renderPrepSummary();
  });
  const lv = document.getElementById("net-leave-btn");
  if(lv) lv.addEventListener("click", ()=>{ netLeaveRoom(); setState("mainmenu"); renderMainMenu(); });
}
function netCopy(text, btn){
  const done = ()=>{ if(btn){ const t = btn.textContent; btn.textContent = "✔ Copiado"; setTimeout(()=>{ btn.textContent = t; }, 1600); } };
  if(navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(text).then(done).catch(()=>{ prompt("Copiá este enlace:", text); }); }
  else prompt("Copiá este enlace:", text);
}
// Elegir campeón DENTRO de la sala (anfitrión e invitados): los que usa otro jugador salen
// deshabilitados. Cambiar de campeón te saca el LISTO (tenés que prepararte de nuevo).
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
  return `<div class="net-hint">Tu campeón:</div><div class="net-champs">${btns}</div>`;
}
function netPickChamp(k){
  if(!CLASSES[k] || !save.champions[k] || k===selectedClass) return;
  if(netTakenChamps().has(k)){ showNetToast("Ese campeón ya lo usa otro jugador."); return; }
  selectedClass = k; netRememberChamp(k);
  if(net.role==="guest"){ netSend({t:"update", ready:false}); netSendLoadout(true); }
  else netSend({t:"update", champ:k, level:save.champions[k].level});
  renderPrepSummary();
}
function netRememberChamp(k){ try{ save.lastChamp = k; persist(); }catch(e){} }
// Lugares de la sala (reemplaza la vista "vos + 3 bots" cuando hay una sala online).
function netRenderLobbySlots(){
  const slots = document.getElementById("lobby-slots"); if(!slots || !net.room) return;
  slots.innerHTML = [0,1,2,3].map(i=>{
    const s = net.room.slots[i];
    if(!s) return `<div class="lobby-slot empty"><div class="lobby-empty">＋</div><div class="lobby-name">Esperando jugador…</div><div class="lobby-meta">al comenzar: BOT</div></div>`;
    const you = i===net.slot, key = you ? selectedClass : s.champ;
    const cls = CLASSES[key] || CLASSES.guerrero;
    const lv = you ? save.champions[selectedClass].level : s.level;
    const tag = `P${i+1} · ` + (i===0 ? "HOST" : (you ? "VOS" : "AMIGO"));
    const st = !s.connected ? `<div class="lobby-ready off">⚠ Sin conexión</div>` : (i===0 ? `<div class="lobby-ready">● Conectado</div>` : (s.ready ? `<div class="lobby-ready">✔ Listo</div>` : `<div class="lobby-ready wait">● Conectado</div>`));
    return `<div class="lobby-slot pc${i} ${you?"you":""}">
      <div class="lobby-tag p${i}">${tag}</div>
      <canvas class="champ-anim lobby-anim" width="120" height="120" data-class-key="${key}" data-idle="1" data-ph="${i*1.3}" style="background:${cls.color}1c;"></canvas>
      <div class="lobby-name" style="color:${NET_SLOT_COLORS[i]}">${s.name}</div>
      <div class="lobby-meta">${cls.name} · ${NET_ROLE_LABEL[cls.roleCategory]||""}</div>
      <div class="lobby-meta">Nv. ${lv||1}</div>
      ${st}
    </div>`;
  }).join("");
  const startBtn = document.getElementById("prep-start-btn");
  if(startBtn){
    if(net.role==="host"){
      const dup = netDuplicateChamps().length>0;
      const waiting = netNotReady().length;
      startBtn.disabled = dup;
      const verb = netLobby.matches>0 ? `Reintentar · ${(ARENA_MODS[currentArena]||{}).label||""}` : "Comenzar";
      startBtn.textContent = `${verb} (${netHumanCount()} ${netHumanCount()===1?"jugador":"jugadores"} + ${4-netHumanCount()} bots)` + (waiting ? ` · faltan ${waiting} LISTO` : "");
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
  if(net.role==="guest" && !netIsGuestPlaying() && room.arena && room.arena!==currentArena){ currentArena = room.arena; }
  // el anfitrión volvió a la sala: los invitados que siguen en los resultados lo siguen solos
  if(net.role==="guest" && room.state==="lobby" && (state==="gameover" || state==="victory")) netStartAutoReturn(4, "El anfitrión volvió a la sala");
  if(state==="prep") renderPrepSummary();
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
  btn.addEventListener("click", ()=>{
    if(btn.disabled) return;
    try{ startMusic(); }catch(e){}
    const inp = document.querySelector("#title-join-name input");
    if(inp) netSetPlayerName(inp.value);
    // modo campaña: un invitado nuevo también elige primero su campeón de regalo, y recién ahí entra
    if(typeof needsStarterChampion==="function" && needsStarterChampion()){ openStarterSelect(()=>{ setState("title"); doJoin(); }); return; }
    doJoin();
  });
  async function doJoin(){
    if(typeof ensureOwnedSelection==="function") ensureOwnedSelection();
    btn.disabled = true; btn.textContent = "Conectando… (hasta 1 minuto si el servidor dormía)";
    try{
      await netJoinRoom(code, selectedClass, (save.champions[selectedClass]||{}).level||1);
    }catch(e){
      if(status) status.textContent = "No se pudo conectar: "+(e.message||e);
      netLog("NETWORK_ERROR", {join:String(e.message||e)});
    }
    btn.disabled = false; btn.textContent = `Unirse a la sala ${code}`;
  }
})();

function netIsGuestPlaying(){ return !!(netMatch && netMatch.role==="guest" && !netMatch.ended); }

/* ---------------- LOOP DE LA SALA: partida -> resultados -> la MISMA sala ----------------
   Derrota (team wipe) o victoria -> resultados -> VOLVER AL LOBBY. El anfitrión vuelve (botón, o
   solo a los 20 s en una derrota) y la sala pasa a "esperando": los invitados que siguen en los
   resultados vuelven solos a los pocos segundos. Misma sala, mismo código, misma arena, mismos
   jugadores; LISTO vuelve a NO LISTO (lo resetea el servidor) y cada uno puede cambiar de
   campeón, equipo y talentos antes de marcar LISTO otra vez. */
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
  netEndLabels();
  if(net.role==="host" && !victory) netStartAutoReturn(20);
  // el invitado que llega tarde a los resultados y el anfitrión ya volvió: lo sigue
  if(net.role==="guest" && net.room && net.room.state==="lobby") netStartAutoReturn(4, "El anfitrión ya volvió a la sala");
}

/* ---------------- UNIRSE pegando el enlace o el código (desde la Sala) ----------------
   La única entrada al cooperativo es la Arena (modo campaña): Arena -> elegir arena -> campeón ->
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
async function netJoinFromInput(){
  const st = document.getElementById("net-join-status");
  const btn = document.getElementById("net-join-btn");
  const inv = netParseInvite((document.getElementById("net-join-code")||{}).value);
  if(!inv){ if(st) st.textContent = "Pegá el enlace de invitación o escribí el código de 6 letras."; return; }
  if(inv.server) net.serverOverride = inv.server;
  if(!netAvailable()){ if(st) st.textContent = "El modo online no está configurado en esta versión."; return; }
  const ni = document.getElementById("net-name-input"); if(ni) netSetPlayerName(ni.value);
  if(!save.champions[selectedClass] || !save.champions[selectedClass].unlocked){ if(st) st.textContent = "Elegí primero un campeón tuyo."; return; }
  if(netInRoom()) netLeaveRoom();
  netLobby.lastError = "";
  if(btn){ btn.disabled = true; btn.textContent = "Conectando… (hasta 1 minuto si el servidor dormía)"; }
  if(st) st.textContent = "";
  try{ await netJoinRoom(inv.code, selectedClass, (save.champions[selectedClass]||{}).level||1); }
  catch(e){ if(st) st.textContent = "No se pudo conectar: "+(e.message||e); netLog("NETWORK_ERROR", {join:String(e.message||e)}); }
  if(btn && btn.isConnected){ btn.disabled = false; btn.textContent = "Unirse"; }
}
// El campeón elegido la última vez (en la selección o la sala) queda recordado.
// Se llama desde main.js después de loadSave().
function netRestoreLastChamp(){
  try{
    const k = save.lastChamp;
    if(k && CLASSES[k] && save.champions[k] && save.champions[k].unlocked!==false) selectedClass = k;
    if(typeof ensureOwnedSelection==="function") ensureOwnedSelection();
  }catch(e){}
}
