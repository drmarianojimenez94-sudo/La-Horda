"use strict";
/* ============================================================
   js/net/net-core.js
   LA HORDA — B1 COOPERATIVE PLAYTEST: conexión con el servidor de salas (server/relay.js).

   Arquitectura (ver docs/MULTIPLAYER_B1.md):
   - Un servidor liviano (WebSocket) solo administra salas y reenvía mensajes.
   - El ANFITRIÓN corre la ÚNICA simulación de la partida (host autoritativo): enemigos,
     oleadas, bots, daño, jefes, victoria/derrota.
   - Los INVITADOS mandan sus intenciones (moverse, atacar, habilidades, revivir) y reciben el
     estado de la partida para dibujarlo (js/net/net-game.js).
   Sin conexión (o sin servidor configurado) el juego sigue siendo 100% local, como siempre.
   ============================================================ */
const NET_PROTOCOL = 1;
const NET_MAX_HUMANS = 4;
const net = {
  ws:null, status:"off",          // off | connecting | open | closed | error
  role:null,                      // null (solo) | "host" | "guest"
  slot:-1, room:null,             // room: estado público de la sala (slots, arena, estado)
  code:null, ping:0, lastPongAt:0,
  reconnectAttempts:0, wantReconnect:false,
  logs:[], errors:[],
  handlers:{}                     // room / msg / closed / error / joined
};
function netLog(ev, data){
  const line = new Date().toISOString().slice(11,19)+" "+ev+(data!==undefined?" "+JSON.stringify(data):"");
  net.logs.push(line); if(net.logs.length>80) net.logs.shift();
  if(ev==="NETWORK_ERROR"){ net.errors.push(line); if(net.errors.length>20) net.errors.shift(); }
  try{ console.log("[B1] "+line); }catch(e){}
  if(typeof netDebugRefresh==="function") netDebugRefresh();
}
function netServerUrl(){
  if(net.serverOverride) return net.serverOverride; // vino en un enlace pegado en Multijugador
  try{
    const q = new URLSearchParams(location.search).get("server");
    if(q) return q;
    const ls = localStorage.getItem("horda_server");
    if(ls) return ls;
  }catch(e){}
  return NET_CONFIG.serverUrl || "";
}
function netAvailable(){ return !!netServerUrl(); }
// Despierta al servidor apenas se entra a la pre-sala (en el plan gratuito se duerme tras 15 min
// sin uso y tarda ~1 minuto en arrancar): así, para cuando tocás "Crear sala", ya está listo.
let _netWarmAt = 0;
function netWarmup(){
  const u = netServerUrl(); if(!u || performance.now() - _netWarmAt < 60000) return;
  _netWarmAt = performance.now();
  try{ fetch(u.replace(/^ws/, "http").replace(/\/$/, "") + "/health", {mode:"no-cors", cache:"no-store"}).catch(()=>{}); }catch(e){}
}
function netClientId(){
  // Identidad anónima de este navegador: permite volver a la misma sala tras perder conexión.
  // sessionStorage: dos pestañas del mismo navegador cuentan como dos jugadores distintos.
  let id = null;
  try{ id = sessionStorage.getItem("horda_cid"); }catch(e){}
  if(!id){
    id = "c"+Math.random().toString(36).slice(2,10)+Date.now().toString(36).slice(-4);
    try{ sessionStorage.setItem("horda_cid", id); }catch(e){}
  }
  return id;
}
function netPlayerName(){
  let n = "";
  try{ n = localStorage.getItem("horda_name") || ""; }catch(e){}
  return n || "Jugador";
}
function netSetPlayerName(n){
  n = String(n||"").replace(/[<>]/g,"").trim().slice(0,16);
  try{ localStorage.setItem("horda_name", n); }catch(e){}
  if(net.status==="open" && net.room) netSend({t:"update", name:n||"Jugador"});
}
function netOn(ev, fn){ net.handlers[ev] = fn; }
function _netEmit(ev, a, b){ const f = net.handlers[ev]; if(f){ try{ f(a, b); }catch(e){ netLog("NETWORK_ERROR", {where:ev, err:String(e && e.message || e)}); console.error(e); } } }
function netSend(obj){
  if(!net.ws || net.ws.readyState!==1) return false;
  try{ net.ws.send(JSON.stringify(obj)); return true; }catch(e){ return false; }
}
function netConnect(){
  return new Promise((resolve, reject)=>{
    const url = netServerUrl();
    if(!url){ reject(new Error("Servidor online no configurado")); return; }
    if(net.ws && net.ws.readyState===1){ resolve(); return; }
    net.status = "connecting";
    let ws;
    try{ ws = new WebSocket(url); }catch(e){ net.status = "error"; reject(e); return; }
    net.ws = ws;
    // Hosting gratuito (Render): el servidor se duerme sin uso y tarda ~1 minuto en despertar.
    const timer = setTimeout(()=>{ if(ws.readyState!==1){ try{ ws.close(); }catch(e){} reject(new Error("No se pudo conectar al servidor (tiempo agotado)")); } }, 75000);
    ws.onopen = ()=>{ clearTimeout(timer); net.status = "open"; net.lastPongAt = performance.now(); netLog("CONNECTED", {url}); resolve(); };
    ws.onerror = ()=>{ netLog("NETWORK_ERROR", {where:"socket"}); };
    ws.onclose = ()=>{
      clearTimeout(timer);
      const wasOpen = net.status==="open";
      net.status = "closed"; net.ws = null;
      if(!wasOpen){ reject(new Error("No se pudo conectar al servidor")); return; }
      netLog("DISCONNECTED");
      _netEmit("socketClosed");
    };
    ws.onmessage = (ev)=>{
      let m; try{ m = JSON.parse(ev.data); }catch(e){ return; }
      _netHandle(m);
    };
  });
}
function _netHandle(m){
  switch(m.t){
    case "pong": net.ping = Math.round(performance.now() - m.c); net.lastPongAt = performance.now(); if(typeof netDebugRefresh==="function") netDebugRefresh(); return;
    case "joined":
      net.slot = m.slot; net.role = m.host ? "host" : "guest"; net.room = m.room; net.code = m.room.code;
      net.reconnectAttempts = 0;
      netLog(m.host ? "ROOM_CREATED" : (m.reconnect ? "RECONNECT" : "ROOM_JOINED"), {code:net.code, slot:m.slot});
      _netEmit("joined", m);
      _netEmit("room", m.room);
      return;
    case "room": {
      const before = net.room;
      net.room = m.room;
      // logs de altas/bajas/listos, sin repetir
      if(before) for(let i=0;i<4;i++){
        const a = before.slots[i], b = m.room.slots[i];
        if(!a && b) netLog("PLAYER_CONNECTED", {slot:i, name:b.name});
        else if(a && !b) netLog("PLAYER_DISCONNECTED", {slot:i, name:a.name});
        else if(a && b){
          if(a.connected && !b.connected) netLog("PLAYER_DISCONNECTED", {slot:i, name:b.name});
          if(!a.connected && b.connected) netLog("RECONNECT", {slot:i, name:b.name});
          if(!a.ready && b.ready && i>0) netLog("PLAYER_READY", {slot:i, name:b.name});
        }
      }
      _netEmit("room", m.room);
      return;
    }
    case "msg": _netEmit("msg", m.from, m.d); return;
    case "closed":
      netLog(m.reason==="host_left" ? "HOST_LEFT" : "ROOM_CLOSED", {reason:m.reason});
      const role = net.role;
      _netReset();
      _netEmit("closed", m.reason, role);
      return;
    case "error":
      if(m.code==="ROOM_FULL") netLog("ROOM_FULL"); else netLog("NETWORK_ERROR", {code:m.code});
      _netEmit("error", m);
      return;
  }
}
function _netReset(){
  net.role = null; net.slot = -1; net.room = null; net.code = null; net.wantReconnect = false;
}
async function netCreateRoom(arena, champ, level){
  await netConnect();
  netSend({t:"create", protocol:NET_PROTOCOL, build:NET_CONFIG.build, arena, champ, level, name:netPlayerName(), clientId:netClientId()});
}
async function netJoinRoom(code, champ, level){
  await netConnect();
  net.code = String(code||"").toUpperCase();
  netSend({t:"join", protocol:NET_PROTOCOL, build:NET_CONFIG.build, code:net.code, champ, level, name:netPlayerName(), clientId:netClientId()});
}
function netLeaveRoom(){
  netSend({t:"leave"});
  _netReset();
  try{ if(net.ws) net.ws.close(); }catch(e){}
  net.ws = null; net.status = "off";
}
function netInviteUrl(){
  if(!net.code) return "";
  const u = new URL(location.href);
  u.search = "";
  u.hash = "";
  u.searchParams.set("room", net.code);
  // si el servidor vino por la URL (pruebas), el invitado tiene que usar el mismo
  try{ const q = new URLSearchParams(location.search).get("server"); if(q) u.searchParams.set("server", q); }catch(e){}
  return u.toString();
}
function netRoomCodeFromUrl(){
  try{ const c = new URLSearchParams(location.search).get("room"); return c ? c.toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,8) : null; }catch(e){ return null; }
}
// Latido/ping: mide la latencia y detecta conexiones caídas (iPhone con pantalla bloqueada).
setInterval(()=>{
  if(net.status!=="open") return;
  netSend({t:"ping", c:performance.now()});
}, 3000);
// Reconexión automática del INVITADO en plena partida (el servidor le guarda el lugar unos minutos).
netOn("socketClosed", ()=>{
  if(net.role==="guest" && net.code){
    net.wantReconnect = true;
    netTryReconnect();
  } else if(net.role==="host"){
    const role = net.role; _netReset();
    _netEmit("closed", "connection_lost", role);
  }
});
function netTryReconnect(){
  if(!net.wantReconnect || !net.code) return;
  if(net.reconnectAttempts >= 8){ const code = net.code; _netReset(); _netEmit("closed", "connection_lost", "guest"); netLog("NETWORK_ERROR", {reconnect:"gave_up", code}); return; }
  net.reconnectAttempts++;
  netLog("RECONNECT", {attempt:net.reconnectAttempts});
  const delay = Math.min(8000, 800 * net.reconnectAttempts);
  setTimeout(()=>{
    if(!net.wantReconnect) return;
    netJoinRoom(net.code, selectedClass, (save.champions[selectedClass]||{}).level||1).catch(()=> netTryReconnect());
  }, delay);
}
