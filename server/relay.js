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
   (host autoritativo); este servidor es un "cartero" liviano.

   CUENTAS (server/accounts.js): el mismo servidor atiende /api/* (crear cuenta, entrar, guardado
   en la nube). Con DATABASE_URL usa Postgres; sin eso, archivos en disco (se pierden al redeployar
   en el plan gratuito: /health lo avisa). Ver docs/ACCOUNTS_DEPLOY.md.

   Variables de entorno (todas opcionales):
     PORT             puerto HTTP/WebSocket (Render/Railway/Fly lo ponen solos)
     ALLOWED_ORIGINS  lista separada por comas de orígenes permitidos (ej:
                      "https://rawcdn.githack.com,https://raw.githack.com"). Vacío = cualquiera.
                      Si hay lista, siempre se suman el juego publicado y sus previews (ALWAYS_ALLOWED).
     MAX_ROOMS        tope de salas simultáneas (default 300)
     DATABASE_URL, DATA_DIR, ...  cuentas de usuario (ver server/accounts.js)
     SIM_LATENCY_MS   SOLO PRUEBAS: demora artificial de cada mensaje (default 0)

   SALAS PÚBLICAS: el anfitrión puede marcar su sala como pública ("create"/"update" con public:true).
   Las públicas que esperan en la Sala, no están llenas y tienen al anfitrión conectado se listan en
   GET /api/rooms[?build=B1-2] y con el mensaje {t:"rooms"}: arena, dificultad, humanos/4, rango de
   nivel y el nombre del anfitrión (nada más: ni ids de cliente, ni IPs, ni el chat). Con límite de
   pedidos por IP/conexión. Un cliente viejo nunca manda public: sus salas siguen siendo privadas.
   INTERCAMBIO dentro de la sala: server/trades.js ({t:"trade"}; diseño antiduplicación ahí).
   ============================================================ */
const http = require("http");
const crypto = require("crypto");
const path = require("path");
const { WebSocketServer } = require("ws");

const PROTOCOL = 1;             // debe coincidir con NET_PROTOCOL del cliente (js/net/net-core.js)
const MAX_HUMANS = 4;
const MAX_ROOMS = parseInt(process.env.MAX_ROOMS || "300", 10);
const MAX_MSG_BYTES = 256 * 1024;
const RECONNECT_GRACE_MS = 3 * 60 * 1000;   // un invitado caído conserva su lugar este tiempo
const ROOM_IDLE_MS = 45 * 60 * 1000;        // salas sin actividad se borran
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin 0/O/1/I para dictarlo sin errores
// Orígenes que SIEMPRE se aceptan si se configuró una lista: el juego publicado (GitHub Pages) y sus
// previews. Antes render.yaml solo permitía las previews de githack, y el juego publicado quedaba
// rechazado en silencio: "crear sala" no hacía nada (auditoría pre-alfa).
// La Alpha principal (fondalstudios.com, ver js/net/net-config.js) también: con una lista vieja en
// ALLOWED_ORIGINS, la página principal quedaba rechazada y "Crear sala" fallaba.
const ALWAYS_ALLOWED = ["https://fondalstudios.com", "https://drmarianojimenez94-sudo.github.io", "https://rawcdn.githack.com", "https://raw.githack.com"];
const ALLOWED_ENV = (process.env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
const ALLOWED = ALLOWED_ENV.length ? [...new Set(ALLOWED_ENV.concat(ALWAYS_ALLOWED))] : [];
// ¿Se acepta este origen? (lo usan el WebSocket y la API de cuentas). Coincidencia exacta; una
// entrada que termina en ":" o "*" vale como prefijo (ej. "http://localhost:" = cualquier puerto).
// Antes bastaba con que EMPEZARA igual, y "https://drmarianojimenez94-sudo.github.io.otro.com" pasaba.
function originAllowed(origin){
  if(!ALLOWED.length) return true;
  return ALLOWED.some(a => origin === a || (/[:*]$/.test(a) && origin.startsWith(a.replace(/\*$/, ""))));
}
// CHAT DE LA SALA: texto corto, anti-spam en el servidor y lista de palabras tapadas configurable
// (CHAT_BLOCKLIST="palabra1,palabra2"). El anfitrión puede silenciar a un jugador. El registro
// solo guarda metadatos (sala, lugar, largo, si se tapó algo): nunca el texto.
const CHAT_MAX_LEN = 120, CHAT_HISTORY = 20, CHAT_MIN_GAP_MS = 800, CHAT_BURST = 5, CHAT_BURST_MS = 10000, CHAT_DUP_MS = 20000;
const CHAT_BLOCK = (process.env.CHAT_BLOCKLIST || "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
function chatFilter(text){
  let out = text, hit = false;
  for(const w of CHAT_BLOCK){
    const re = new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    out = out.replace(re, m => { hit = true; return "*".repeat(m.length); });
  }
  return { text: out, hit };
}

const rooms = new Map(); // code -> room
// Salas públicas: lista cacheada 1 s, límite por IP (HTTP) y por conexión (WS), y tope de filas.
const ROOMS_LIST_MAX = 40, ROOMS_CACHE_MS = 1000, ROOMS_WS_MIN_GAP_MS = 900;
const ROOMS_HTTP_PER_10S = Math.max(5, parseInt(process.env.ROOMS_MAX_IP || "30", 10) || 30); // por IP (wifi compartido de un evento: más)
let _roomsCache = { at: 0, list: [] };
function publicRoomList(build){
  const now = Date.now();
  if(now - _roomsCache.at > ROOMS_CACHE_MS){
    const list = [];
    for(const r of rooms.values()){
      if(!r.pub || r.state !== "lobby") continue;
      const host = r.slots[0];
      if(!host || !host.ws) continue;
      const humans = humanCount(r);
      if(humans >= MAX_HUMANS) continue;
      const lv = r.slots.filter(Boolean).map(m => m.level | 0).filter(n => n > 0);
      list.push({ code: r.code, arena: r.arena, diff: r.diff || "normal", humans, max: MAX_HUMANS,
        lvMin: lv.length ? Math.min(...lv) : 1, lvMax: lv.length ? Math.max(...lv) : 1, host: host.name, _build: r.build, _t: r.created });
    }
    list.sort((a, b) => (b.humans - a.humans) || (b._t - a._t)); // las que ya tienen gente, primero
    _roomsCache = { at: now, list };
  }
  const b = clean(build, 40);
  return _roomsCache.list.filter(r => !b || !r._build || r._build === b).slice(0, ROOMS_LIST_MAX)
    .map(r => ({ code: r.code, arena: r.arena, diff: r.diff, humans: r.humans, max: r.max, lvMin: r.lvMin, lvMax: r.lvMax, host: r.host }));
}
const _roomsHits = new Map(); // ip -> {n, until}
function roomsRateOk(ip){
  const now = Date.now(); let e = _roomsHits.get(ip);
  if(!e || e.until <= now){ e = { n: 0, until: now + 10000 }; _roomsHits.set(ip, e); }
  if(_roomsHits.size > 5000) for(const [k, v] of _roomsHits) if(v.until <= now) _roomsHits.delete(k);
  return ++e.n <= ROOMS_HTTP_PER_10S;
}

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
    code: room.code, arena: room.arena, state: room.state, hostSlot: 0, protocol: PROTOCOL, pub: !!room.pub, diff: room.diff || "",
    slots: room.slots.map((m, i) => m ? { slot: i, name: m.name, champ: m.champ, level: m.level, ready: !!m.ready,
      connected: !!m.ws, host: i === 0, muted: !!m.muted, founder: m.founder || null } : null)
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
  trades.roomEvent(room.code);
  log("ROOM_CLOSED", { code: room.code, reason });
}
function humanCount(room){ return room.slots.filter(Boolean).length; }

function handle(ws, msg){
  const room = ws._room ? rooms.get(ws._room) : null;
  const me = room ? room.slots[ws._slot] : null;
  switch(msg.t){
    case "ping": send(ws, { t: "pong", c: msg.c }); return;
    case "rooms": { // lista de salas públicas (también en GET /api/rooms)
      const now = Date.now();
      if(ws._roomsAt && now - ws._roomsAt < ROOMS_WS_MIN_GAP_MS) return send(ws, { t: "error", code: "ROOMS_SLOW" });
      ws._roomsAt = now;
      return send(ws, { t: "rooms", list: publicRoomList(msg.build) });
    }
    case "trade": // intercambio (server/trades.js): terminar uno pendiente no necesita sala
      if(typeof msg.op !== "string") return;
      return trades.handle(ws, msg, room && me ? { room, slot: ws._slot, me } : null);
    case "create": {
      if(msg.protocol !== PROTOCOL) return send(ws, { t: "error", code: "VERSION", msg: "Versión distinta del servidor" });
      if(room) return send(ws, { t: "error", code: "ALREADY_IN_ROOM" });
      if(rooms.size >= MAX_ROOMS) return send(ws, { t: "error", code: "SERVER_FULL" });
      const code = newCode();
      if(!code) return send(ws, { t: "error", code: "SERVER_FULL" });
      const r = { code, arena: clean(msg.arena, 24), build: clean(msg.build, 40), state: "lobby",
        slots: [null, null, null, null], touched: Date.now(), created: Date.now(), chat: [],
        pub: msg.public === true, diff: clean(msg.diff, 12) };
      const hostChamp = clean(msg.champ, 24);
      r.slots[0] = { ws, clientId: clean(msg.clientId, 64), name: clean(msg.name, 24) || "Anfitrión",
        champ: presence.champAllowed(ws, hostChamp) ? hostChamp : "", level: msg.level|0, ready: true, lostAt: 0, founder: presence.memberFounder(ws) };
      rooms.set(code, r);
      ws._room = code; ws._slot = 0;
      log("ROOM_CREATED", { code, arena: r.arena, pub: r.pub });
      send(ws, { t: "joined", slot: 0, host: true, room: publicRoom(r) });
      presence.joined(r, r.slots[0]);
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
        if(msg.champ && presence.champAllowed(ws, clean(msg.champ, 24))) m.champ = clean(msg.champ, 24);
        m.founder = presence.memberFounder(ws); // reconnect: identity refreshed, banner NOT repeated
        ws._room = code; ws._slot = slot;
        r.touched = Date.now();
        log("RECONNECT", { code, slot });
        send(ws, { t: "joined", slot, host: false, reconnect: true, room: publicRoom(r), chat: r.chat.slice(-CHAT_HISTORY) });
        broadcastRoom(r);
        return;
      }
      if(r.state !== "lobby") return send(ws, { t: "error", code: "STARTED", msg: "La partida ya comenzó" });
      slot = r.slots.findIndex((m, i) => i > 0 && !m);
      if(slot < 0 || humanCount(r) >= MAX_HUMANS){ log("ROOM_FULL", { code }); return send(ws, { t: "error", code: "ROOM_FULL", msg: "SALA COMPLETA" }); }
      const joinChamp = clean(msg.champ, 24);
      r.slots[slot] = { ws, clientId: cid, name: clean(msg.name, 24) || ("Jugador " + (slot + 1)),
        champ: presence.champAllowed(ws, joinChamp) ? joinChamp : "", level: msg.level|0, ready: false, lostAt: 0, founder: presence.memberFounder(ws) };
      ws._room = code; ws._slot = slot;
      r.touched = Date.now();
      log("ROOM_JOINED", { code, slot });
      send(ws, { t: "joined", slot, host: false, room: publicRoom(r), chat: r.chat.slice(-CHAT_HISTORY) });
      broadcastRoom(r);
      presence.joined(r, r.slots[slot]);
      return;
    }
  }
  if(!room || !me) return send(ws, { t: "error", code: "NO_ROOM" });
  room.touched = Date.now();
  switch(msg.t){
    case "update": {
      if(room.state === "lobby"){
        if(msg.champ !== undefined){ const c = clean(msg.champ, 24); if(presence.champAllowed(ws, c)) me.champ = c; else send(ws, { t: "error", code: "CHAMP_NOT_OWNED" }); }
        if(msg.level !== undefined) me.level = msg.level|0;
        if(msg.name !== undefined) me.name = clean(msg.name, 24) || me.name;
        // el anfitrión puede cambiar la arena desde la sala (entre partidas); en partida no se toca
        if(msg.arena !== undefined && ws._slot === 0){
          const a = clean(msg.arena, 24) || room.arena;
          if(a !== room.arena) log("ROOM_ARENA", { code: room.code, arena: a });
          room.arena = a;
        }
        // sala pública / dificultad elegida: solo el anfitrión (un cliente viejo no los manda)
        if(ws._slot === 0 && msg.public !== undefined){ room.pub = msg.public === true; log("ROOM_PUBLIC", { code: room.code, pub: room.pub }); }
        if(ws._slot === 0 && msg.diff !== undefined) room.diff = clean(msg.diff, 12);
      } else if(msg.champ !== undefined && ws._slot > 0){
        // un invitado que ya volvió a la sala mientras el anfitrión mira los resultados
        if(presence.champAllowed(ws, clean(msg.champ, 24))) me.champ = clean(msg.champ, 24);
        if(msg.level !== undefined) me.level = msg.level|0;
      }
      if(msg.ready !== undefined) me.ready = room.state === "lobby" ? !!msg.ready : false; // LISTO solo cuenta en la sala
      if(ws._slot === 0) me.ready = true; // el anfitrión siempre está listo: decide cuándo comenzar
      broadcastRoom(room);
      return;
    }
    case "start": {
      if(ws._slot !== 0) return send(ws, { t: "error", code: "NOT_HOST" });
      // quienes perdieron la conexión antes de comenzar no ocupan un lugar en la partida
      room.slots.forEach((m, i) => { if(i > 0 && m && !m.ws) room.slots[i] = null; });
      room.state = "playing";
      trades.roomEvent(room.code); // en partida no se intercambia: las ofertas abiertas se anulan
      log("GAME_START", { code: room.code, humans: humanCount(room) });
      broadcastRoom(room);
      presence.started(room);
      return;
    }
    case "lobby": { // el anfitrión vuelve la sala al estado de espera (fin de partida)
      if(ws._slot !== 0) return send(ws, { t: "error", code: "NOT_HOST" });
      room.state = "lobby";
      // opcional: la arena de la próxima partida (tras una victoria, la siguiente de la campaña) viaja
      // en el mismo mensaje, así los invitados ven la sala y la arena nueva en una sola actualización.
      // Un cliente viejo no lo manda (y uno viejo que lo recibe ignora el campo): sigue todo igual.
      if(msg.arena !== undefined) room.arena = clean(msg.arena, 24) || room.arena;
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
    case "chat": {
      if(me.muted) return send(ws, { t: "error", code: "CHAT_MUTED" });
      const raw = clean(msg.text, CHAT_MAX_LEN).replace(/\s+/g, " ").trim();
      if(!raw) return;
      const now = Date.now();
      me.chatTimes = (me.chatTimes || []).filter(t => now - t < CHAT_BURST_MS);
      if((me.chatLast && now - me.chatLast < CHAT_MIN_GAP_MS) || me.chatTimes.length >= CHAT_BURST) return send(ws, { t: "error", code: "CHAT_SLOW" });
      if(me.chatLastText === raw.toLowerCase() && now - me.chatLast < CHAT_DUP_MS) return send(ws, { t: "error", code: "CHAT_DUP" });
      me.chatLast = now; me.chatLastText = raw.toLowerCase(); me.chatTimes.push(now);
      const f = chatFilter(raw);
      const entry = { from: ws._slot, name: me.name, text: f.text, at: now, founder: me.founder || null };
      room.chat.push(entry); if(room.chat.length > CHAT_HISTORY) room.chat.shift();
      const str = JSON.stringify({ t: "chat", m: entry });
      for(const m of room.slots) if(m && m.ws) sendRaw(m.ws, str);
      log("CHAT", { code: room.code, slot: ws._slot, len: raw.length, masked: f.hit });
      return;
    }
    case "mute": {
      if(ws._slot !== 0) return send(ws, { t: "error", code: "NOT_HOST" });
      const i = msg.slot|0, m = room.slots[i];
      if(i > 0 && m){ m.muted = !!msg.on; log("CHAT_MUTE", { code: room.code, slot: i, on: m.muted }); broadcastRoom(room); }
      return;
    }
    case "kick": {
      if(ws._slot !== 0) return;
      const i = msg.slot|0;
      if(i > 0 && room.slots[i]){ trades.roomEvent(room.code, i); const m = room.slots[i]; if(m.ws){ send(m.ws, { t: "closed", reason: "kicked" }); m.ws._room = null; } room.slots[i] = null; broadcastRoom(room); }
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
  trades.roomEvent(room.code, slot);
  if(room.state === "lobby" || why === "left"){ room.slots[slot] = null; }
  else { m.ws = null; m.lostAt = Date.now(); } // en partida: conserva el lugar para reconectar
  log("PLAYER_DISCONNECTED", { code: room.code, slot, why });
  broadcastRoom(room);
}

// FOUNDERS_JSON (opcional): {"nano":{"account":"NanoGM"},"facu":{"accountId":123}} reemplaza la sección
// "founders" de operator-config.json, igual que ADMIN_USERS para el owner (pruebas o despliegue).
let foundersOverride; try{ if(process.env.FOUNDERS_JSON) foundersOverride = JSON.parse(process.env.FOUNDERS_JSON); }catch(e){ log("FOUNDER_POLICY", { error: "FOUNDERS_JSON inválido" }); }
const accounts = require("./accounts.js").create({ log, originAllowed, founders: foundersOverride });
const presence = require("./presence.js").create({
  resolve: token => accounts.presence(token),
  requiresGrant: champ => require("./entitlements.js").isChampion(champ) && require("./entitlements.js").taxonomy().requiresGrant(champ),
  broadcast: (room, obj) => { const str = JSON.stringify(obj); for(const m of room.slots) if(m && m.ws) sendRaw(m.ws, str); }
});
const trades = require("./trades.js").create({ log, send, dataDir: process.env.DATA_DIR || path.join(__dirname, "data") });
function roomsHttp(req, res){
  const origin = req.headers.origin || "";
  const h = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff", "vary": "Origin" };
  if(origin && !originAllowed(origin)){ res.writeHead(403, h); res.end('{"error":"ORIGIN"}'); return; }
  h["access-control-allow-origin"] = origin || "*";
  if(req.method === "OPTIONS"){ h["access-control-allow-methods"] = "GET, OPTIONS"; res.writeHead(204, h); res.end(); return; }
  if(req.method !== "GET"){ res.writeHead(405, h); res.end('{"error":"METHOD"}'); return; }
  const ip = accounts.clientIp(req); // la IP real (detrás del proxy de Render/Fly todos parecían la misma)
  if(!roomsRateOk(ip)){ h["retry-after"] = "10"; res.writeHead(429, h); res.end('{"error":"TOO_MANY"}'); return; }
  let build = ""; try{ build = new URL(req.url, "http://x").searchParams.get("build") || ""; }catch(e){}
  res.writeHead(200, h); res.end(JSON.stringify({ protocol: PROTOCOL, rooms: publicRoomList(build) }));
}
const server = http.createServer((req, res) => {
  const p = req.url.split("?")[0];
  if(p === "/api/rooms" || p === "/api/rooms/") return roomsHttp(req, res); // salas públicas (antes que las cuentas)
  if(accounts.handle(req, res)) return; // /api/* (cuentas y guardado en la nube)
  if(p === "/" || p === "/health"){
    res.writeHead(200, { "content-type": "text/plain; charset=utf-8", "access-control-allow-origin": "*", "cache-control": "no-store" });
    res.end(`LA HORDA relay OK · protocolo ${PROTOCOL} · salas ${rooms.size}\n${accounts.healthLine()}\n`);
    return;
  }
  res.writeHead(404); res.end();
});
const wss = new WebSocketServer({ server, maxPayload: MAX_MSG_BYTES });
wss.on("connection", (ws, req) => {
  const origin = req.headers.origin || "";
  if(!originAllowed(origin)){
    // se avisa el motivo antes de cortar, para que el juego pueda mostrarlo
    log("NETWORK_ERROR", { origin_rejected: origin });
    try{ ws.send(JSON.stringify({ t:"error", code:"ORIGIN", origin })); }catch(e){}
    ws.close(1008, "origin"); return;
  }
  ws._alive = true;
  ws.on("pong", () => { ws._alive = true; });
  // Messages are processed in order; "identify" (account session -> public founder identity) is async,
  // so later messages wait for it. Identity is optional: guests keep playing exactly as before.
  ws._queue = Promise.resolve();
  ws.on("message", (buf) => {
    let msg; try{ msg = JSON.parse(buf.toString()); }catch(e){ return; }
    if(!msg || typeof msg.t !== "string") return;
    ws._queue = ws._queue.then(async () => {
      if(msg.t === "identify"){
        const id = await presence.identify(ws, msg.token);
        send(ws, { t: "identified", founder: id ? id.founder : null });
        const room = ws._room ? rooms.get(ws._room) : null, me = room ? room.slots[ws._slot] : null;
        if(me && me.ws === ws){ const had = me.founder; me.founder = presence.memberFounder(ws); if(!presence.champAllowed(ws, me.champ)) me.champ = ""; broadcastRoom(room); if(me.founder && !had && room.state === "lobby") presence.joined(room, me); }
        return;
      }
      handle(ws, msg);
    }).catch(e => log("NETWORK_ERROR", { err: String(e && e.message || e) }));
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
module.exports = { server, rooms, chatFilter, accounts, originAllowed, trades, publicRoomList };
