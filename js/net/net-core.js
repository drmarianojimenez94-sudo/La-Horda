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
function netNormalizeServer(value){
  try{
    const u=new URL(String(value||""));
    if(!["ws:","wss:"].includes(u.protocol)||u.username||u.password||u.search||u.hash) return "";
    if(location.protocol==="https:" && u.protocol!=="wss:" && !["localhost","127.0.0.1","[::1]"].includes(u.hostname)) return "";
    return u.href.replace(/\/+$/,"");
  }catch(e){ return ""; }
}
function netInitialServer(){
  try{
    const q=new URLSearchParams(location.search).get("server");
    if(q) return netNormalizeServer(q);
    const stored=localStorage.getItem("horda_server");
    if(stored) return netNormalizeServer(stored);
  }catch(e){}
  return netNormalizeServer(NET_CONFIG.serverUrl);
}
function netServerUrl(){ return net.serverOverride ? netNormalizeServer(net.serverOverride) : netInitialServer(); }
function netEnvironment(url){
  const value=netNormalizeServer(url||netServerUrl());
  if(value==="wss://fondalstudios.com/la-horda/red") return {kind:"primary",label:"FONDAL · ALPHA PRINCIPAL"};
  if(value==="wss://la-horda-relay.onrender.com") return {kind:"legacy",label:"RENDER · SERVIDOR ANTERIOR"};
  return {kind:"test",label:"PRUEBAS · SERVIDOR MANUAL"};
}
function netEnvironmentHTML(){
  const env=netEnvironment(), escape=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  return `<div class="net-environment"><b>${env.label}</b><span>${escape(netServerUrl())}</span>${env.kind!=="primary"?'<a class="btn secondary small" href="https://fondalstudios.com/la-horda/jugar/">IR A LA ALPHA PRINCIPAL</a>':''}</div>`;
}
function netAvailable(){ return !!netServerUrl(); }
// Despierta al servidor apenas se entra a la pre-sala (en el plan gratuito se duerme tras 15 min
// sin uso y tarda ~1 minuto en arrancar): así, para cuando tocás "Crear sala", ya está listo.
let _netWarmAt = 0;
// Se despierta también apenas abre el juego: mientras el jugador elige guardián y arena (~1 min),
// el servidor ya está arrancando.
setTimeout(()=>{ try{ if(netAvailable()) netWarmup(); }catch(e){} }, 1500);
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
// Conexión con reintentos. En el plan gratuito (Render) el servidor se duerme sin uso: mientras
// arranca, rechaza o corta las conexiones. Antes eso era un "Falló la conexión" al primer intento;
// ahora se reintenta solo durante hasta ~100 s (despertándolo de nuevo en cada intento) y onTick
// avisa cuántos segundos lleva, para mostrar "Despertando el servidor… 23 s".
const NET_CONNECT_BUDGET_MS = 100000;
function _netConnectOnce(url, maxMs){
  return new Promise((resolve, reject)=>{
    net.status = "connecting";
    let ws;
    try{ ws = new WebSocket(url); }catch(e){ net.status = "error"; reject(e); return; }
    net.ws = ws;
    const timer = setTimeout(()=>{ if(ws.readyState!==1){ try{ ws.onclose = null; ws.close(); }catch(e){} net.status = "closed"; if(net.ws===ws) net.ws = null; reject(new Error("tiempo agotado")); } }, maxMs);
    ws.onopen = ()=>{ clearTimeout(timer); net.status = "open"; net.lastPongAt = performance.now(); netLog("CONNECTED", {url});
      // Identidad de cuenta (Fundador): el relay la verifica con el servidor de cuentas; opcional.
      const tok = typeof accountPresenceToken==="function" ? accountPresenceToken(url) : null;
      if(tok){ try{ ws.send(JSON.stringify({t:"identify", token:tok})); }catch(e){} }
      resolve();
      _netEmit("open"); }; // p.ej. terminar un intercambio que quedó a mitad (js/net/net-trade.js)
    ws.onerror = ()=>{ netLog("NETWORK_ERROR", {where:"socket"}); };
    ws.onclose = (ev)=>{
      clearTimeout(timer);
      net.lastClose = { code: ev && ev.code, reason: ev && ev.reason, at: performance.now() };
      const wasOpen = net.status==="open" && net.ws===ws;
      if(net.ws===ws){ net.status = "closed"; net.ws = null; }
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
function netConnect(onTick, budgetMs){
  const url = netServerUrl();
  if(!url) return Promise.reject(new Error("Servidor online no configurado"));
  if(net.ws && net.ws.readyState===1) return Promise.resolve();
  if(typeof navigator!=="undefined" && navigator.onLine===false) return Promise.reject(new Error("No hay conexión a Internet"));
  if(net._connecting) return net._connecting; // un solo intento en curso
  const budget = budgetMs || NET_CONNECT_BUDGET_MS;
  const t0 = performance.now(); let attempt = 0;
  const tick = onTick ? setInterval(()=>{ try{ onTick(Math.round((performance.now()-t0)/1000), attempt); }catch(e){} }, 1000) : 0;
  net._connecting = (async ()=>{
    try{
      for(;;){
        attempt++;
        const left = budget - (performance.now()-t0);
        try{ await _netConnectOnce(url, Math.max(4000, Math.min(30000, left))); return; }
        catch(e){
          if(performance.now()-t0 + 2500 >= budget) throw new Error("el servidor no respondió. Probá de nuevo en un minuto");
          netLog("RECONNECT", {connectAttempt:attempt, err:String(e && e.message || e)});
          _netWarmAt = -1e9; netWarmup();
          await new Promise(r=>setTimeout(r, Math.min(4000, 1000 + 700*attempt)));
        }
      }
    }finally{ if(tick) clearInterval(tick); net._connecting = null; }
  })();
  return net._connecting;
}
// Texto para el botón mientras conecta: primero "Conectando…", y si tarda, que se entienda por qué.
function netConnectLabel(secs){
  return secs < 4 ? "Conectando…" : `Despertando el servidor… ${secs} s (puede tardar hasta 1 minuto)`;
}
function _netHandle(m){
  switch(m.t){
    case "pong": net.ping = Math.round(performance.now() - m.c); net.lastPongAt = performance.now(); if(typeof netDebugRefresh==="function") netDebugRefresh(); return;
    case "joined":
      net.slot = m.slot; net.role = m.host ? "host" : "guest"; net.room = m.room; net.code = m.room.code;
      net.reconnectAttempts = 0;
      if(typeof netChatReset==="function") netChatReset(m.chat); // historial corto del chat de la sala
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
    case "chat": _netEmit("chat", m.m); return;
    case "trade": _netEmit("trade", m); return;   // intercambio en la sala (js/net/net-trade.js)
    case "rooms": _netEmit("rooms", m.list); return; // salas públicas (js/net/net-rooms.js)
    case "identified": net.identity = { founder: m.founder || null }; _netEmit("identified", m); return;
    case "presence": if(typeof founderPresenceShow==="function") founderPresenceShow(m.scope, m.founders, net.code); _netEmit("presence", m); return;
    case "closed":
      netLog(m.reason==="host_left" ? "HOST_LEFT" : "ROOM_CLOSED", {reason:m.reason});
      const role = net.role;
      _netReset();
      _netEmit("closed", m.reason, role);
      return;
    case "error":
      if(m.code==="NO_ROOM" && !net.room) return; // un relay viejo no conoce "identify": no es un error de sala
      if(m.code==="CHAMP_NOT_OWNED"){ _netEmit("chatError", m.code); return; }
      if(/^CHAT_/.test(m.code||"")){ _netEmit("chatError", m.code); return; } // anti-spam del chat: aviso chico, no un error de red
      if(m.trade || /^(TRADE_|ROOMS_)/.test(m.code||"")){ _netEmit("tradeError", m); return; } // intercambio / lista de salas: no es un error de la sala
      if(!net.room) net._joinError = m; // crear/unirse espera esto para explicar por qué no se pudo (_netAwaitJoin)
      if(m.code==="ROOM_FULL") netLog("ROOM_FULL"); else netLog("NETWORK_ERROR", {code:m.code});
      _netEmit("error", m);
      return;
  }
}
function _netReset(){
  net.role = null; net.slot = -1; net.room = null; net.code = null; net.wantReconnect = false;
  // si estaba esperando el arte para entrar a la partida (net-game.js: netGuestHoldStart), se cancela
  if(typeof netLobby!=="undefined" && netLobby.heldStart){ netLobby.heldStart = null; if(typeof netGuestLoadingUI==="function") netGuestLoadingUI(null); }
}
// Por qué se cortó la conexión antes de tener sala: texto claro para el cartel.
function netCloseExplanation(){
  const c = net.lastClose || {};
  if(c.code===1008 && /origin/.test(c.reason||"")) return "el servidor no acepta conexiones desde esta página (dirección no autorizada en el servidor)";
  if(c.code===1008) return "el servidor rechazó la conexión (" + (c.reason||"política") + ")";
  if(c.code===1006 || !c.code) return "se cortó la conexión con el servidor (red inestable o el servidor se reinició)";
  return "el servidor cerró la conexión (código " + c.code + (c.reason ? ", " + c.reason : "") + ")";
}
// Crear/unirse no termina al mandar el pedido: espera la respuesta REAL del servidor (la sala, un
// error con motivo o que corte). Antes, si el servidor cortaba (p. ej. página no autorizada), el
// botón quedaba en "Conectando…" y no aparecía ningún cartel.
function _netAwaitJoin(ms){
  return new Promise((resolve, reject)=>{
    const t0 = performance.now();
    const iv = setInterval(()=>{
      if(net.room && net.role){ clearInterval(iv); resolve(); return; }
      if(net._joinError){ const m = net._joinError; net._joinError = null; clearInterval(iv);
        const e = new Error((typeof NET_ERRORS!=="undefined" && NET_ERRORS[m.code]) || m.msg || m.code); e.handled = true; e.code = m.code; reject(e); return; }
      if(!net.ws || net.ws.readyState > 1){ clearInterval(iv); reject(new Error(netCloseExplanation())); return; }
      if(performance.now() - t0 > ms){ clearInterval(iv); reject(new Error("el servidor no respondió al pedido de sala")); }
    }, 100);
  });
}
async function netCreateRoom(arena, champ, level, onTick){
  await netConnect(onTick);
  net._joinError = null;
  // public / diff: salas públicas (un relay viejo ignora los campos y la sala queda privada)
  const pub = typeof netPublicPref==="function" && netPublicPref();
  const diff = typeof diffEffective==="function" ? diffEffective(arena) : "normal";
  netSend({t:"create", protocol:NET_PROTOCOL, build:NET_CONFIG.build, arena, champ, level, name:netPlayerName(), clientId:netClientId(), public:!!pub, diff});
  await _netAwaitJoin(15000);
}
async function netJoinRoom(code, champ, level, onTick, budgetMs){
  await netConnect(onTick, budgetMs);
  net._joinError = null;
  net.code = String(code||"").toUpperCase();
  netSend({t:"join", protocol:NET_PROTOCOL, build:NET_CONFIG.build, code:net.code, champ, level, name:netPlayerName(), clientId:netClientId()});
  await _netAwaitJoin(15000);
}
function netLeaveRoom(){
  if(net.role) netSend({t:"leave"}); // sin sala (p.ej. un "unirse" rechazado) no hay nada que avisar
  _netReset();
  try{ if(net.ws){ net.ws.onmessage = null; net.ws.close(); } }catch(e){}
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
    netJoinRoom(net.code, selectedClass, (save.champions[selectedClass]||{}).level||1, null, 12000).catch(()=> netTryReconnect());
  }, delay);
}
