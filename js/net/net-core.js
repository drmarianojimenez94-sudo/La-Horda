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
  joinSeq:0,                      // cuántos "joined" llegaron (crear/unirse/reconectar esperan uno NUEVO)
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
// Se despierta también apenas abre el juego: mientras el jugador elige guardián y arena (~1 min),
// el servidor ya está arrancando.
setTimeout(()=>{ try{ if(netAvailable()) netWarmup(); }catch(e){} }, 1500);
function netWarmup(){
  const u = netServerUrl(); if(!u || performance.now() - _netWarmAt < 60000) return;
  _netWarmAt = performance.now();
  netCapsProbe(true);
}
// QUÉ SABE HACER EL SERVIDOR. Un relay viejo (antes de las cuentas) no tiene /api: pedirle /api/... daba
// un 404 sin permiso CORS = error rojo en la consola y carteles de "sin conexión" engañosos. /health lo
// tienen todas las versiones, con CORS abierto: si su texto no trae la línea "cuentas:", no hay /api
// (ni cuentas, ni ranking, ni salas públicas) y el juego lo dice claro sin pedírselo.
//   netCaps.api: true | false | null (todavía no se sabe: servidor dormido o sin red)
const netCaps = { api:null, at:0, url:"" };
let _netCapsP = null;
function netHttpBase(){ const u = netServerUrl(); return u ? u.replace(/^ws(s?):\/\//i, "http$1://").replace(/\/+$/, "") : ""; }
function netCapsProbe(force){
  const base = netHttpBase();
  if(!base) return Promise.resolve(netCaps);
  if(netCaps.url !== base){ netCaps.api = null; netCaps.at = 0; netCaps.url = base; _netCapsP = null; }
  if(_netCapsP) return _netCapsP;
  if(!force && netCaps.api !== null && performance.now() - netCaps.at < 300000) return Promise.resolve(netCaps);
  const ctl = typeof AbortController!=="undefined" ? new AbortController() : null;
  const t = setTimeout(()=>{ if(ctl) ctl.abort(); }, 90000); // plan gratis: despertar tarda ~1 minuto
  _netCapsP = fetch(base + "/health", {cache:"no-store", signal: ctl ? ctl.signal : undefined})
    .then(r => r.ok ? r.text() : null)
    .then(txt => { if(txt != null && netCaps.url === base){ netCaps.api = /cuentas:/.test(txt); netCaps.at = performance.now(); } return netCaps; })
    .catch(() => netCaps)
    .finally(() => { clearTimeout(t); _netCapsP = null; });
  return _netCapsP;
}
// ¿El servidor seguro NO tiene esta parte? (false mientras no se sepa: se intenta igual)
function netApiMissing(){ return netCaps.api === false && netCaps.url === netHttpBase(); }
const NET_NOT_ON_SERVER = "Esta función todavía no está disponible en el servidor (hay que actualizarlo).";
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
    ws.onopen = ()=>{ clearTimeout(timer); net.status = "open"; net.lastPongAt = performance.now(); netLog("CONNECTED", {url}); resolve();
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
      net.joinSeq++;
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
    case "closed":
      netLog(m.reason==="host_left" ? "HOST_LEFT" : "ROOM_CLOSED", {reason:m.reason});
      const role = net.role;
      _netReset();
      _netEmit("closed", m.reason, role);
      return;
    case "error":
      if(/^CHAT_/.test(m.code||"")){ _netEmit("chatError", m.code); return; } // anti-spam del chat: aviso chico, no un error de red
      if(m.trade || /^(TRADE_|ROOMS_)/.test(m.code||"")){ _netEmit("tradeError", m); return; } // intercambio / lista de salas: no es un error de la sala
      // respuesta a un mensaje de partida mandado sin sala (p. ej. el movimiento del invitado justo al
      // reconectarse, antes del "joined"): no es un motivo para el jugador ni la respuesta al "join"
      if(m.code==="NO_ROOM"){ netLog("NETWORK_ERROR", {code:m.code}); return; }
      if(!net.room || net._awaitingJoin) net._joinError = m; // crear/unirse espera esto para explicar por qué no se pudo (_netAwaitJoin)
      if(m.code==="ROOM_FULL") netLog("ROOM_FULL"); else netLog("NETWORK_ERROR", {code:m.code});
      // reconectando solo (netTryReconnect): el motivo lo resuelve la reconexión, sin el cartel de
      // "no existe ninguna sala con ese código… revisá que esté bien escrito" (el jugador no escribió nada)
      if(net.wantReconnect && net._awaitingJoin) return;
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
// Se espera un "joined" NUEVO (joinSeq): al reconectar, net.room todavía tiene la sala vieja y antes
// esto "terminaba" al instante aunque el servidor contestara que la sala ya no existe (se reinició):
// el invitado quedaba en una sala fantasma, con la pantalla congelada.
function _netAwaitJoin(ms){
  const seq0 = net.joinSeq;
  net._awaitingJoin = true;
  return new Promise((resolve, reject)=>{
    const t0 = performance.now();
    const iv = setInterval(()=>{
      if(net.joinSeq !== seq0 && net.room && net.role){ clearInterval(iv); resolve(); return; }
      if(net._joinError){ const m = net._joinError; net._joinError = null; clearInterval(iv);
        const e = new Error((typeof NET_ERRORS!=="undefined" && NET_ERRORS[m.code]) || m.msg || m.code); e.handled = true; e.code = m.code; reject(e); return; }
      if(!net.ws || net.ws.readyState > 1){ clearInterval(iv); reject(new Error(netCloseExplanation())); return; }
      if(performance.now() - t0 > ms){ clearInterval(iv); reject(new Error("el servidor no respondió al pedido de sala")); }
    }, 100);
  }).finally(()=>{ net._awaitingJoin = false; });
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
const NET_RECONNECT_TRIES = 8;
// La sala ya no está en el servidor (se reinició —Render plan gratis: se duerme o se redeploya y pierde la
// memoria— o el anfitrión la cerró mientras estabas desconectado): no tiene sentido seguir reintentando.
const NET_ROOM_GONE = ["NOT_FOUND","STARTED","ROOM_FULL","BUILD","VERSION","HOST_RECONNECT"];
function _netGiveUp(reason){
  const code = net.code;
  _netReset();
  try{ if(net.ws){ net.ws.onclose = null; net.ws.onmessage = null; net.ws.close(); } }catch(e){}
  net.ws = null; net.status = "off";
  netLog("NETWORK_ERROR", {reconnect:reason, code});
  _netEmit("closed", reason, "guest");
}
function netTryReconnect(){
  if(!net.wantReconnect || !net.code) return;
  if(net.reconnectAttempts >= NET_RECONNECT_TRIES){ _netGiveUp("connection_lost"); return; }
  net.reconnectAttempts++;
  netLog("RECONNECT", {attempt:net.reconnectAttempts});
  const delay = Math.min(8000, 800 * net.reconnectAttempts);
  setTimeout(()=>{
    if(!net.wantReconnect) return;
    netJoinRoom(net.code, selectedClass, (save.champions[selectedClass]||{}).level||1, null, 12000).catch((e)=>{
      if(!net.wantReconnect) return;
      if(e && NET_ROOM_GONE.includes(e.code)){ _netGiveUp("room_gone"); return; }
      netTryReconnect();
    });
  }, delay);
}
