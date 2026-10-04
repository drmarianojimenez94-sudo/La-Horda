"use strict";
/* ============================================================
   js/net/net-rooms.js
   SALAS ABIERTAS: la lista de salas PÚBLICAS del servidor (server/relay.js, GET /api/rooms) en
   MULTIJUGADOR (pantalla de modos). Cada fila: arena, dificultad, jugadores/4, rango de nivel y
   el anfitrión; UNIRSE entra con un toque (el mismo camino que "Unirse con código").
   - Se refresca sola cada pocos segundos mientras la pantalla está abierta (y con ↻).
   - En el hub, el botón MULTIJUGADOR dice cuántas hay abiertas.
   - El anfitrión marca su sala como pública en la Sala (pestaña Sala online: js/net/net-lobby.js).
   - Un servidor viejo (sin /api/rooms) no rompe nada: la tarjeta avisa y el resto sigue igual.
   ============================================================ */
const netRooms = { list:null, at:-1e9, busy:false, err:"", hubAt:-1e9, hubCount:-1, unsupported:false };
const NET_ROOMS_EVERY_MS = 6000, NET_ROOMS_HUB_EVERY_MS = 30000;

function _roomsEsc(s){ return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
function netRoomsUrl(){
  const u = netServerUrl(); if(!u) return "";
  const b = typeof NET_CONFIG!=="undefined" && NET_CONFIG.build ? "?build=" + encodeURIComponent(NET_CONFIG.build) : "";
  return u.replace(/^ws/, "http").replace(/\/+$/, "") + "/api/rooms" + b;
}
// Pide la lista (una a la vez). Devuelve la lista o null si falló.
async function netFetchRooms(){
  const url = netRoomsUrl(); if(!url) return null;
  if(netRooms.busy) return netRooms.list;
  netRooms.busy = true; netRooms.at = performance.now(); // también si falla: no reintenta en cada segundo
  let t=0;
  try{
    // servidor viejo sin /api (net-core.js: netCaps): ni se pide (404 sin CORS = error en la consola)
    if(typeof netCapsProbe==="function" && netCaps.api===null) await netCapsProbe();
    if(typeof netApiMissing==="function" && netApiMissing()){ netRooms.unsupported = true; netRooms.err = ""; netRooms.list = []; return []; }
    const ctl = typeof AbortController!=="undefined" ? new AbortController() : null;
    t = ctl ? setTimeout(()=>ctl.abort(), 12000) : 0;
    const r = await fetch(url, {cache:"no-store", signal: ctl ? ctl.signal : undefined});
    if(url!==netRoomsUrl())return null;
    if(r.status===404){ netRooms.unsupported = true; netRooms.err = ""; netRooms.list = []; return []; }
    if(r.status===429){ netRooms.err = "Muchos pedidos seguidos: esperá unos segundos."; return netRooms.list; }
    if(!r.ok) throw new Error("HTTP " + r.status);
    const j = await r.json();
    netRooms.unsupported = false; netRooms.err = "";
    netRooms.list = Array.isArray(j.rooms) ? j.rooms.slice(0, 40) : [];
    return netRooms.list;
  }catch(e){
    netRooms.err = "No se pudo consultar el servidor (puede estar despertando: probá en un minuto).";
    return null;
  }finally{ clearTimeout(t); netRooms.busy = false; }
}
function _roomRowHTML(r){
  const A = (typeof ARENA_MODS!=="undefined" && ARENA_MODS[r.arena]) || {};
  const num = typeof campaignNumberLabel==="function" ? campaignNumberLabel(r.arena) : "";
  const T = (typeof DIFF_TIERS!=="undefined" && DIFF_TIERS[r.diff]) || null;
  const diff = T ? `<span class="mr-diff" style="color:${T.color}">${T.label}</span>` : "";
  const lv = r.lvMin===r.lvMax ? `Nv. ${r.lvMin|0}` : `Nv. ${r.lvMin|0}–${r.lvMax|0}`;
  const code = String(r.code||"").replace(/[^A-Z0-9]/g, "");
  return `<div class="mr-row" data-room-code="${code}">
    <span class="mr-ico">${A.icon||"⚔"}</span>
    <span class="mr-main"><span class="mr-arena">${num ? num + " · " : ""}${_roomsEsc(A.label||r.arena||"Arena")}</span> ${diff}
      <span class="mr-sub">Anfitrión: <b>${_roomsEsc(r.host)}</b> · ${lv}</span></span>
    <span class="mr-count" title="Jugadores">👥 ${r.humans|0}/${r.max|0||4}</span>
    <button class="btn small net-join-go mr-join" data-room-join="${code}">UNIRSE</button>
  </div>`;
}
function netRenderRoomsList(){
  const box = document.getElementById("mode-rooms-list"); if(!box) return;
  const st = document.getElementById("mode-rooms-status");
  let html = "", msg = "";
  if(!netAvailable()) msg = "El modo online no está configurado en esta versión.";
  else if(netRooms.unsupported) msg = "Las salas abiertas todavía no están disponibles en el servidor: entrá con el código de tu amigo.";
  else if(netRooms.list===null) msg = netRooms.err || (netRooms.busy && performance.now() - netRooms.at > 4000 ? "Despertando el servidor… (la primera vez puede tardar hasta un minuto)" : "Buscando salas…");
  else if(!netRooms.list.length) msg = netRooms.err || "No hay salas públicas abiertas ahora. Creá una y marcala 🌍 Pública en la Sala.";
  else { html = netRooms.list.map(_roomRowHTML).join(""); msg = netRooms.err; }
  if(box._html !== html){ box._html = html; box.innerHTML = html; }
  if(st) st.textContent = msg;
  const n = document.getElementById("mode-rooms-n");
  if(n) n.textContent = netRooms.list && netRooms.list.length ? `(${netRooms.list.length})` : "";
}
async function netRefreshRooms(){
  if(!netAvailable()){ netRenderRoomsList(); return; }
  netRenderRoomsList();
  await netFetchRooms();
  netRenderRoomsList();
  netRenderHubRooms();
}
// Hub: "🌍 N salas abiertas" debajo de MULTIJUGADOR.
function netRenderHubRooms(){
  const sub = document.querySelector("#mainmenu-jugar-btn .hub-tile-sub"); if(!sub) return;
  if(!sub.dataset.base) sub.dataset.base = sub.textContent;
  const n = netRooms.list ? netRooms.list.length : 0;
  sub.textContent = n ? `🌍 ${n} sala${n===1?"":"s"} abierta${n===1?"":"s"}` : sub.dataset.base;
  sub.classList.toggle("hub-rooms-live", n>0);
}
// Unirse con un toque desde la lista.
async function netJoinPublicRoom(code, btn){
  const nm = document.getElementById("mode-join-name"); if(nm) netSetPlayerName(nm.value);
  const go = async ()=>{
    const ok = await netJoinWithCode(code, btn, "UNIRSE");
    if(!ok) netRefreshRooms(); // ya se llenó o empezó: la lista se pone al día
  };
  // modo campaña: si todavía no eligió su guardián de regalo, primero eso y después entra
  if(typeof needsStarterChampion==="function" && needsStarterChampion()){
    openStarterSelect(()=>{ setState("modeselect"); netRenderModeJoin(); go(); });
    return;
  }
  go();
}
(function netSetupRooms(){
  const box = document.getElementById("mode-rooms-list");
  if(box) box.addEventListener("click", (e)=>{
    const b = e.target.closest("[data-room-join]"); if(!b || b.disabled) return;
    netJoinPublicRoom(b.getAttribute("data-room-join"), b);
  });
  const rf = document.getElementById("mode-rooms-refresh");
  if(rf) rf.addEventListener("click", ()=>{ netRooms.list = netRooms.list || null; netRefreshRooms(); });
  const jugar = document.getElementById("mainmenu-jugar-btn");
  if(jugar) jugar.addEventListener("click", ()=> setTimeout(netRefreshRooms, 0));
  // refresco solo mientras se mira la pantalla de modos (y, más espaciado, en el hub)
  setInterval(()=>{
    if(typeof state==="undefined" || !netAvailable() || document.hidden) return;
    const now = performance.now();
    if(state==="modeselect" && netRooms.busy && netRooms.list===null) netRenderRoomsList(); // "Despertando el servidor…"
    if(state==="modeselect" && now - netRooms.at > NET_ROOMS_EVERY_MS && !netRooms.busy) netRefreshRooms();
    else if(state==="mainmenu" && now - netRooms.hubAt > NET_ROOMS_HUB_EVERY_MS && !netRooms.busy){ netRooms.hubAt = now; netFetchRooms().then(netRenderHubRooms); }
  }, 1000);
  netRenderRoomsList();
})();
