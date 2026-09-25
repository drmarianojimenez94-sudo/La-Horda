"use strict";
/* ============================================================
   LA HORDA — B1 COOPERATIVE PLAYTEST · servidor de salas + relay WebSocket

   Qué hace:
   - Salas (rooms) de hasta 4 jugadores HUMANOS, con código corto para invitar.
   - Slot 0 = anfitrión (host). Los invitados ocupan el primer slot libre (1..3).
   - Estado de cada integrante: nombre, campeón, listo, conectado.
   - Al comenzar la partida la sala se CIERRA a nuevos jugadores (solo pueden volver los
     que ya estaban, con su mismo clientId: reconexión).
   - Reenvía mensajes entre el anfitrión y los invitados (inputs de los invitados hacia el
     anfitrión; estado de la partida del anfitrión hacia todos).

   Qué NO hace: no simula el juego. La única simulación la corre el navegador del anfitrión
   (host autoritativo); este servidor es un "cartero" liviano, sin base de datos ni secretos.

   Variables de entorno (todas opcionales):
     PORT             puerto HTTP/WebSocket (Render/Railway/Fly lo ponen solos)
     ALLOWED_ORIGINS  lista separada por comas de orígenes permitidos (ej:
                      "https://rawcdn.githack.com,https://raw.githack.com"). Vacío = cualquiera.
     MAX_ROOMS        tope de salas simultáneas (default 300)
     SIM_LATENCY_MS   SOLO PRUEBAS: demora artificial de cada mensaje (default 0)
   ============================================================ */
const http = require("http");
const crypto = require("crypto");
const { WebSocketServer } = require("ws");

const PROTOCOL = 1;             // debe coincidir con NET_PROTOCOL del cliente (js/net/net-core.js)
const MAX_HUMANS = 4;
const MAX_ROOMS = parseInt(process.env.MAX_ROOMS || "300", 10);
const MAX_MSG_BYTES = 256 * 1024;
const RECONNECT_GRACE_MS = 3 * 60 * 1000;   // un invitado caído conserva su lugar este tiempo
const ROOM_IDLE_MS = 45 * 60 * 1000;        // salas sin actividad se borran
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin 0/O/1/I para dictarlo sin errores
const ALLOWED = (process.env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);

const rooms = new Map(); // code -> room

function log(ev, data){ console.log(new Date().toISOString(), ev, data ? JSON.stringify(data) : ""); }
function newCode(){
  for(let tries = 0; tries < 50; tries++){
    let c = "";
    const bytes = crypto.randomBytes(6);
    for(let i = 0; i < 6; i++) c += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
    if(!rooms.has(c)) return c;
  }
  return null;
}
function clean(s, max){ return String(s == null ? "" : s).replace(/[<>\u0000-\u001f]/g, "").slice(0, max); }
function publicRoom(room){
  return {
    code: room.code, arena: room.arena, state: room.state, hostSlot: 0, protocol: PROTOCOL,
    slots: room.slots.map((m, i) => m ? { slot: i, name: m.name, champ: m.champ, level: m.level, ready: !!m.ready,
      connected: !!m.ws, host: i === 0 } : null)
  };
}
// Solo para pruebas: SIM_LATENCY_MS demora todo lo que sale del servidor (simula Internet).
const SIM_LATENCY = parseInt(process.env.SIM_LATENCY_MS || "0", 10);
function sendRaw(ws, str){
  if(!ws || ws.readyState !== 1) return;
  if(SIM_LATENCY > 0){ setTimeout(() => { if(ws.readyState === 1){ try{ ws.send(str); }catch(e){} } }, SIM_LATENCY); return; }
  try{ ws.send(str); }catch(e){}
}
function send(ws, obj){ sendRaw(ws, JSON.stringify(obj)); }
function broadcastRoom(room){
  const msg = JSON.stringify({ t: "room", room: publicRoom(room) });
  for(const m of room.slots) if(m && m.ws) sendRaw(m.ws, msg);
}
function closeRoom(room, reason){
  for(const m of room.slots){
    if(m && m.ws){ send(m.ws, { t: "closed", reason }); m.ws._room = null; }
  }
  rooms.delete(room.code);
  log("ROOM_CLOSED", { code: room.code, reason });
}
function humanCount(room){ return room.slots.filter(Boolean).length; }

function handle(ws, msg){
  const room = ws._room ? rooms.get(ws._room) : null;
  const me = room ? room.slots[ws._slot] : null;
  switch(msg.t){
    case "ping": send(ws, { t: "pong", c: msg.c }); return;
    case "create": {
      if(msg.protocol !== PROTOCOL) return send(ws, { t: "error", code: "VERSION", msg: "Versión distinta del servidor" });
      if(room) return send(ws, { t: "error", code: "ALREADY_IN_ROOM" });
      if(rooms.size >= MAX_ROOMS) return send(ws, { t: "error", code: "SERVER_FULL" });
      const code = newCode();
      if(!code) return send(ws, { t: "error", code: "SERVER_FULL" });
      const r = { code, arena: clean(msg.arena, 24), build: clean(msg.build, 40), state: "lobby",
        slots: [null, null, null, null], touched: Date.now(), created: Date.now() };
      r.slots[0] = { ws, clientId: clean(msg.clientId, 64), name: clean(msg.name, 24) || "Anfitrión",
        champ: clean(msg.champ, 24), level: msg.level|0, ready: true, lostAt: 0 };
      rooms.set(code, r);
      ws._room = code; ws._slot = 0;
      log("ROOM_CREATED", { code, arena: r.arena });
      send(ws, { t: "joined", slot: 0, host: true, room: publicRoom(r) });
      return;
    }
    case "join": {
      if(msg.protocol !== PROTOCOL) return send(ws, { t: "error", code: "VERSION", msg: "Versión distinta del servidor" });
      if(room) return send(ws, { t: "error", code: "ALREADY_IN_ROOM" });
      const code = clean(msg.code, 12).toUpperCase();
      const r = rooms.get(code);
      if(!r) return send(ws, { t: "error", code: "NOT_FOUND" });
      if(r.build && msg.build && r.build !== clean(msg.build, 40)) return send(ws, { t: "error", code: "BUILD", msg: "El anfitrión usa otra versión del juego" });
      const cid = clean(msg.clientId, 64);
      // reconexión: mismo clientId que ya tenía un lugar en esta sala
      let slot = cid ? r.slots.findIndex(m => m && m.clientId === cid) : -1;
      if(slot === 0) return send(ws, { t: "error", code: "HOST_RECONNECT", msg: "El anfitrión no puede volver a entrar a su propia sala" });
      if(slot > 0){
        const m = r.slots[slot];
        if(m.ws && m.ws !== ws){ send(m.ws, { t: "closed", reason: "replaced" }); m.ws._room = null; }
        m.ws = ws; m.lostAt = 0;
        if(msg.champ) m.champ = clean(msg.champ, 24);
        ws._room = code; ws._slot = slot;
        r.touched = Date.now();
        log("RECONNECT", { code, slot });
        send(ws, { t: "joined", slot, host: false, reconnect: true, room: publicRoom(r) });
        broadcastRoom(r);
        return;
      }
      if(r.state !== "lobby") return send(ws, { t: "error", code: "STARTED", msg: "La partida ya comenzó" });
      slot = r.slots.findIndex((m, i) => i > 0 && !m);
      if(slot < 0 || humanCount(r) >= MAX_HUMANS){ log("ROOM_FULL", { code }); return send(ws, { t: "error", code: "ROOM_FULL", msg: "SALA COMPLETA" }); }
      r.slots[slot] = { ws, clientId: cid, name: clean(msg.name, 24) || ("Jugador " + (slot + 1)),
        champ: clean(msg.champ, 24), level: msg.level|0, ready: false, lostAt: 0 };
      ws._room = code; ws._slot = slot;
      r.touched = Date.now();
      log("ROOM_JOINED", { code, slot });
      send(ws, { t: "joined", slot, host: false, room: publicRoom(r) });
      broadcastRoom(r);
      return;
    }
  }
  if(!room || !me) return send(ws, { t: "error", code: "NO_ROOM" });
  room.touched = Date.now();
  switch(msg.t){
    case "update": {
      if(room.state === "lobby"){
        if(msg.champ !== undefined) me.champ = clean(msg.champ, 24);
        if(msg.level !== undefined) me.level = msg.level|0;
        if(msg.name !== undefined) me.name = clean(msg.name, 24) || me.name;
      }
      if(msg.ready !== undefined) me.ready = !!msg.ready;
      if(ws._slot === 0) me.ready = true; // el anfitrión siempre está listo: decide cuándo comenzar
      broadcastRoom(room);
      return;
    }
    case "start": {
      if(ws._slot !== 0) return send(ws, { t: "error", code: "NOT_HOST" });
      // quienes perdieron la conexión antes de comenzar no ocupan un lugar en la partida
      room.slots.forEach((m, i) => { if(i > 0 && m && !m.ws) room.slots[i] = null; });
      room.state = "playing";
      log("GAME_START", { code: room.code, humans: humanCount(room) });
      broadcastRoom(room);
      return;
    }
    case "lobby": { // el anfitrión vuelve la sala al estado de espera (fin de partida)
      if(ws._slot !== 0) return send(ws, { t: "error", code: "NOT_HOST" });
      room.state = "lobby";
      room.slots.forEach((m, i) => { if(m){ if(i > 0) m.ready = false; if(i > 0 && !m.ws) room.slots[i] = null; } });
      broadcastRoom(room);
      return;
    }
    case "msg": {
      // relay: los invitados solo le hablan al anfitrión; el anfitrión a uno o a todos
      const str = JSON.stringify({ t: "msg", from: ws._slot, d: msg.d });
      if(ws._slot !== 0){ const h = room.slots[0]; if(h && h.ws) sendRaw(h.ws, str); return; }
      if(typeof msg.to === "number"){ const m = room.slots[msg.to]; if(m && m.ws) sendRaw(m.ws, str); return; }
      for(let i = 1; i < room.slots.length; i++){ const m = room.slots[i]; if(m && m.ws) sendRaw(m.ws, str); }
      return;
    }
    case "kick": {
      if(ws._slot !== 0) return;
      const i = msg.slot|0;
      if(i > 0 && room.slots[i]){ const m = room.slots[i]; if(m.ws){ send(m.ws, { t: "closed", reason: "kicked" }); m.ws._room = null; } room.slots[i] = null; broadcastRoom(room); }
      return;
    }
    case "leave": { leave(ws, "left"); return; }
  }
}

function leave(ws, why){
  const room = ws._room ? rooms.get(ws._room) : null;
  if(!room) return;
  const slot = ws._slot, m = room.slots[slot];
  ws._room = null;
  if(!m || m.ws !== ws) return;
  if(slot === 0){ closeRoom(room, "host_left"); return; }
  if(room.state === "lobby" || why === "left"){ room.slots[slot] = null; }
  else { m.ws = null; m.lostAt = Date.now(); } // en partida: conserva el lugar para reconectar
  log("PLAYER_DISCONNECTED", { code: room.code, slot, why });
  broadcastRoom(room);
}

const server = http.createServer((req, res) => {
  if(req.url === "/" || req.url === "/health"){
    res.writeHead(200, { "content-type": "text/plain; charset=utf-8", "access-control-allow-origin": "*" });
    res.end(`LA HORDA relay OK · protocolo ${PROTOCOL} · salas ${rooms.size}\n`);
    return;
  }
  res.writeHead(404); res.end();
});
const wss = new WebSocketServer({ server, maxPayload: MAX_MSG_BYTES });
wss.on("connection", (ws, req) => {
  const origin = req.headers.origin || "";
  if(ALLOWED.length && !ALLOWED.some(a => origin === a || origin.startsWith(a))){ ws.close(1008, "origin"); return; }
  ws._alive = true;
  ws.on("pong", () => { ws._alive = true; });
  ws.on("message", (buf) => {
    let msg; try{ msg = JSON.parse(buf.toString()); }catch(e){ return; }
    if(!msg || typeof msg.t !== "string") return;
    try{ handle(ws, msg); }catch(e){ log("NETWORK_ERROR", { err: String(e && e.message || e) }); }
  });
  ws.on("close", () => leave(ws, "closed"));
  ws.on("error", () => {});
});
// latidos: detecta conexiones muertas (iPhone que bloquea la pantalla, cambio de red...)
setInterval(() => {
  for(const ws of wss.clients){
    if(!ws._alive){ try{ ws.terminate(); }catch(e){} continue; }
    ws._alive = false; try{ ws.ping(); }catch(e){}
  }
  const now = Date.now();
  for(const room of [...rooms.values()]){
    if(now - room.touched > ROOM_IDLE_MS){ closeRoom(room, "idle"); continue; }
    let changed = false;
    room.slots.forEach((m, i) => { if(i > 0 && m && !m.ws && m.lostAt && now - m.lostAt > RECONNECT_GRACE_MS){ room.slots[i] = null; changed = true; } });
    if(changed) broadcastRoom(room);
  }
}, 15000);

const PORT = parseInt(process.env.PORT || "8787", 10);
server.listen(PORT, () => log("RELAY_LISTENING", { port: PORT, protocol: PROTOCOL, allowed: ALLOWED }));
module.exports = { server, rooms };
