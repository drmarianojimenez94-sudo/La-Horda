"use strict";
/* ============================================================
   LA HORDA — INTERCAMBIO ENTRE JUGADORES DE LA MISMA SALA (sin plata real)

   Un jugador le DA un objeto de su inventario de cuenta a otro de su sala, en la Sala (nunca en
   partida). No hay oro, ni precio, ni nada que se compre: es un regalo entre compañeros.

   DISEÑO ANTIDUPLICACIÓN (el relay es el único que decide; cada guardado es de su jugador):
     offered ──accept──▶ accepted ──confirm──▶ delivering ──got──▶ committed ──applied──▶ applied
        │                   │                     │ (20 s sin "got")
        └── reject/cancel/salida/comienzo ────────┴──▶ aborted
   1. OFERTA: A manda el objeto completo. El relay lo valida (tamaño, que no sea ligado) y se lo
      muestra a B. Nadie tocó su guardado todavía.
   2. B ACEPTA (1ª confirmación) → A CONFIRMA (2ª). Recién ahí A saca el objeto de su inventario y
      lo guarda "en camino" (save.trades.esc: no se puede usar, vender ni volver a dar), y avisa.
   3. El relay se lo entrega a B, que lo guarda "por llegar" (save.trades.pend) y contesta "got".
   4. "got" es EL PUNTO DE COMMIT: el relay anota "committed" en su registro (en disco, ANTES de
      avisar a nadie). Desde ahí el objeto es de B: B lo pasa a su inventario con un uid NUEVO
      (derivado del id del intercambio: aplicar dos veces no duplica) y avisa "applied".
   5. Con "applied" el relay le avisa a A "done" y A borra su copia "en camino". El uid original
      queda QUEMADO: ofrecerlo otra vez (otra pestaña, un guardado viejo restaurado) se rechaza.
   Cortes de conexión:
   - Antes del commit: el intercambio se anula; A recupera su objeto, B tira lo que tenía "por
     llegar". Nadie pierde nada.
   - Después del commit: el relay recuerda el estado; cada uno, al volver a conectarse, pregunta
     ("status" el que da, "got" el que recibe, con la clave secreta de su lado) y termina su parte.
   - Si el relay ya no conoce el id (se borró su disco): los dos lo tratan como anulado (A recupera,
     B no recibe). El único caso de copia doble posible es ese, y solo si el disco se pierde entre
     "applied" y el aviso a A (queda en docs/MULTIPLAYER_B1.md).
   ============================================================ */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const TRADE_ITEM_MAX_BYTES = 8 * 1024;   // un objeto real pesa ~1-2 KB
const DELIVER_TIMEOUT_MS = parseInt(process.env.TRADE_DELIVER_TIMEOUT_MS || "20000", 10); // "delivering" sin "got" -> se anula (env: solo pruebas)
const OPEN_TIMEOUT_MS = 3 * 60 * 1000;   // una oferta sin respuesta se cae sola
const OFFER_MIN_GAP_MS = 1500, OFFER_BURST = 8, OFFER_BURST_MS = 60000;
const TRADE_MSGS_PER_MIN = 60;
const KEEP_FINAL_MS = 14 * 24 * 3600 * 1000;  // cuánto se recuerda un intercambio terminado
const MAX_BURNED = 20000;
const OPEN_STATES = ["offered", "accepted"];

// ¿Se puede dar este objeto? (mismas reglas que el cliente: js/net/net-trade.js tradeBoundReason)
function boundReason(it){
  if(!it || typeof it !== "object" || Array.isArray(it)) return "BAD_ITEM";
  if(typeof it.uid !== "string" || !it.uid || it.uid.length > 64) return "BAD_ITEM";
  if(typeof it.type !== "string" || typeof it.rarity !== "string") return "BAD_ITEM";
  if(it.rarity === "unico" || it.unique) return "BOUND_UNIQUE";
  if(it.set) return "BOUND_SET";
  if(typeof it.rerollIdx === "number" || (it.rerolls | 0) > 0) return "BOUND_MYSTIC";
  if(it.bound || it.placeholder) return "BOUND";
  return null;
}
// Copia limpia del objeto: sin "<" ">" ni caracteres de control en los textos, sin funciones ni
// anidado absurdo. El cliente vuelve a validar tipos y valores al recibirlo.
function cleanValue(v, depth){
  if(depth > 6) return undefined;
  if(typeof v === "string") return v.replace(/[<>\u0000-\u001f]/g, "").slice(0, 300);
  if(typeof v === "number") return Number.isFinite(v) ? v : 0;
  if(typeof v === "boolean" || v === null) return v;
  if(Array.isArray(v)) return v.slice(0, 24).map(x => cleanValue(x, depth + 1)).filter(x => x !== undefined);
  if(typeof v === "object"){
    const o = {}; let n = 0;
    for(const k of Object.keys(v)){
      if(++n > 60) break;
      if(k === "__proto__" || k === "constructor" || k === "prototype") continue;
      const c = cleanValue(v[k], depth + 1);
      if(c !== undefined) o[k.slice(0, 40)] = c;
    }
    return o;
  }
  return undefined;
}

function create(opts){
  const log = opts.log, send = opts.send;
  const dir = opts.dataDir;
  const file = dir ? path.join(dir, "trades.jsonl") : null;
  const trades = new Map();   // id -> trade
  const burned = new Map();   // uid original -> fecha en que se dio

  /* ---------- registro en disco (una línea JSON por cambio de estado) ---------- */
  function persist(t){
    if(!file) return;
    const line = JSON.stringify({ id: t.id, st: t.st, kA: t.kA, kB: t.kB, uid: t.uid, at: t.at, t: t.t }) + "\n";
    try{ fs.mkdirSync(dir, { recursive: true }); fs.appendFileSync(file, line); }
    catch(e){ log("TRADE_LEDGER_ERROR", { err: String(e.message || e) }); }
  }
  (function load(){
    if(!file) return;
    let txt = ""; try{ txt = fs.readFileSync(file, "utf8"); }catch(e){ return; }
    const now = Date.now();
    for(const line of txt.split("\n")){
      if(!line.trim()) continue;
      let r; try{ r = JSON.parse(line); }catch(e){ continue; }
      if(!r || typeof r.id !== "string") continue;
      if(r.st === "applied" && r.uid) burned.set(r.uid, r.t || now);
      trades.set(r.id, { id: r.id, st: r.st, kA: r.kA, kB: r.kB, uid: r.uid, at: r.at, t: r.t || now });
    }
    // lo que quedó a mitad al reiniciar: antes del commit se anula (nadie tocó nada definitivo)
    for(const t of trades.values()) if(OPEN_STATES.includes(t.st) || t.st === "delivering"){ t.st = "aborted"; t.t = now; }
    compact();
    log("TRADES_LOADED", { trades: trades.size, burned: burned.size });
  })();
  function compact(){
    const now = Date.now();
    for(const [id, t] of trades) if((t.st === "aborted" || t.st === "applied") && now - t.t > KEEP_FINAL_MS) trades.delete(id);
    if(burned.size > MAX_BURNED){ const drop = burned.size - MAX_BURNED; let i = 0; for(const k of burned.keys()){ if(i++ >= drop) break; burned.delete(k); } }
    if(!file) return;
    try{
      fs.mkdirSync(dir, { recursive: true });
      let out = "";
      for(const t of trades.values()) out += JSON.stringify({ id: t.id, st: t.st, kA: t.kA, kB: t.kB, uid: t.uid, at: t.at, t: t.t }) + "\n";
      // los uid quemados cuyo intercambio ya se olvidó siguen quemados
      const kept = new Set(); for(const t of trades.values()) if(t.st === "applied" && t.uid) kept.add(t.uid);
      for(const [uid, at] of burned) if(!kept.has(uid)) out += JSON.stringify({ id: "b_" + uid, st: "applied", uid, at, t: at }) + "\n";
      const tmp = file + ".tmp"; fs.writeFileSync(tmp, out); fs.renameSync(tmp, file);
    }catch(e){ log("TRADE_LEDGER_ERROR", { err: String(e.message || e) }); }
  }
  const sweeper = setInterval(() => {
    const now = Date.now();
    for(const t of trades.values()){
      if(OPEN_STATES.includes(t.st) && now - t.t > OPEN_TIMEOUT_MS) abort(t, "timeout");
      else if(t.st === "delivering" && now - t.t > DELIVER_TIMEOUT_MS) abort(t, "timeout");
    }
  }, 2000);
  if(sweeper.unref) sweeper.unref();
  const compacter = setInterval(compact, 6 * 3600 * 1000);
  if(compacter.unref) compacter.unref();

  function setSt(t, st){ t.st = st; t.t = Date.now(); persist(t); log("TRADE_" + st.toUpperCase(), { id: t.id.slice(0, 8), room: t.room }); }
  function tell(ws, obj){ if(ws) send(ws, Object.assign({ t: "trade" }, obj)); }
  function abort(t, why){
    if(!(OPEN_STATES.includes(t.st) || t.st === "delivering")) return;
    setSt(t, "aborted");
    tell(t.wsA, { op: "abort", id: t.id, why });
    tell(t.wsB, { op: "abort", id: t.id, why });
    t.item = null;
  }
  // Rate limit por conexión (además del de ofertas).
  function limited(ws){
    const now = Date.now();
    ws._trMsgs = (ws._trMsgs || []).filter(x => now - x < 60000);
    if(ws._trMsgs.length >= TRADE_MSGS_PER_MIN) return true;
    ws._trMsgs.push(now); return false;
  }
  function err(ws, code, id){ send(ws, { t: "error", code, trade: true, id: id || undefined }); }

  /* ---------- mensajes que NO necesitan sala: terminar un intercambio al volver ---------- */
  function handleLedger(ws, msg){
    const t = typeof msg.id === "string" ? trades.get(msg.id) : null;
    const k = String(msg.k || "");
    if(msg.op === "status"){ // el que dio pregunta cómo terminó (tiene el objeto "en camino")
      if(!t || t.kA !== k){ return tell(ws, { op: "unknown", id: msg.id }); }
      t.wsA = ws;
      if(t.st === "applied") return tell(ws, { op: "done", id: t.id });
      if(t.st === "aborted") return tell(ws, { op: "abort", id: t.id, why: "status" });
      if(OPEN_STATES.includes(t.st)){ abort(t, "giver_lost"); return; } // nunca llegó su confirmación
      return tell(ws, { op: "wait", id: t.id, st: t.st });
    }
    if(msg.op === "got" || msg.op === "applied" || msg.op === "refuse"){ // el que recibe
      if(!t || t.kB !== k){ return tell(ws, { op: "unknown", id: msg.id }); }
      t.wsB = ws;
      if(msg.op === "refuse"){ if(t.st === "delivering") abort(t, msg.why === "full" ? "full" : "refused"); else if(t.st === "aborted") tell(ws, { op: "abort", id: t.id }); return; }
      if(msg.op === "got"){
        if(t.st === "delivering") setSt(t, "committed");            // EL commit (ya escrito en disco)
        if(t.st === "committed" || t.st === "applied") return tell(ws, { op: "commit", id: t.id });
        return tell(ws, { op: "abort", id: t.id, why: "late" });
      }
      // applied
      if(t.st === "committed"){ setSt(t, "applied"); if(t.uid) burned.set(t.uid, Date.now()); tell(t.wsA, { op: "done", id: t.id }); t.item = null; }
      if(t.st === "applied") return tell(ws, { op: "ok", id: t.id });
      return tell(ws, { op: "abort", id: t.id });
    }
    return false;
  }

  /* ---------- mensajes dentro de la sala ---------- */
  // ctx: { room, slot, me, humanWs(slot) }
  function handleRoom(ws, msg, ctx){
    const { room, slot, me } = ctx;
    const t = typeof msg.id === "string" ? trades.get(msg.id) : null;
    switch(msg.op){
      case "offer": {
        if(room.state !== "lobby") return err(ws, "TRADE_NOT_LOBBY");
        const to = msg.to | 0, other = room.slots[to];
        if(to === slot || !other || !other.ws) return err(ws, "TRADE_NO_TARGET");
        const now = Date.now();
        ws._trOffers = (ws._trOffers || []).filter(x => now - x < OFFER_BURST_MS);
        if((ws._trLast && now - ws._trLast < OFFER_MIN_GAP_MS) || ws._trOffers.length >= OFFER_BURST) return err(ws, "TRADE_SLOW");
        let size = 0; try{ size = Buffer.byteLength(JSON.stringify(msg.item || null)); }catch(e){ size = 1e9; }
        if(size > TRADE_ITEM_MAX_BYTES) return err(ws, "TRADE_TOO_BIG");
        const bad = boundReason(msg.item);
        if(bad) return err(ws, bad === "BAD_ITEM" ? "TRADE_BAD_ITEM" : "TRADE_BOUND");
        if(burned.has(msg.item.uid)) return err(ws, "TRADE_BURNED");
        for(const x of trades.values()){
          if(!["offered", "accepted", "delivering", "committed"].includes(x.st)) continue;
          if(x.uid === msg.item.uid) return err(ws, "TRADE_BUSY_ITEM");
          if(x.room === room.code && OPEN_STATES.includes(x.st) && (x.from === slot || x.to === to || x.from === to || x.to === slot)) return err(ws, "TRADE_BUSY");
        }
        ws._trLast = now; ws._trOffers.push(now);
        const item = cleanValue(msg.item, 0);
        const tr = { id: crypto.randomBytes(12).toString("hex"), kA: crypto.randomBytes(12).toString("hex"), kB: crypto.randomBytes(12).toString("hex"),
          room: room.code, from: slot, to, uid: msg.item.uid, item, at: now, t: now, st: "offered", wsA: ws, wsB: other.ws };
        trades.set(tr.id, tr);
        log("TRADE_OFFERED", { id: tr.id.slice(0, 8), room: room.code, from: slot, to, bytes: size }); // sin el objeto
        tell(ws, { op: "sent", id: tr.id, k: tr.kA, to, toName: other.name, item });
        tell(other.ws, { op: "offer", id: tr.id, from: slot, fromName: me.name, item });
        return;
      }
      case "accept": {
        if(!t || t.room !== room.code || t.to !== slot || t.st !== "offered") return err(ws, "TRADE_GONE", msg.id);
        if(room.state !== "lobby") return abort(t, "started");
        setSt(t, "accepted"); t.wsB = ws;
        tell(t.wsA, { op: "accepted", id: t.id });
        tell(ws, { op: "accepting", id: t.id });
        return;
      }
      case "reject": case "cancel": {
        if(!t || t.room !== room.code || (t.to !== slot && t.from !== slot) || !OPEN_STATES.includes(t.st)) return err(ws, "TRADE_GONE", msg.id);
        return abort(t, msg.op === "reject" ? "rejected" : (t.from === slot ? "cancel_giver" : "cancel_taker"));
      }
      case "confirm": { // el que da ya guardó el objeto "en camino" en su guardado
        if(!t || t.room !== room.code || t.from !== slot || t.st !== "accepted" || String(msg.k || "") !== t.kA) return err(ws, "TRADE_GONE", msg.id);
        const other = room.slots[t.to];
        if(room.state !== "lobby" || !other || !other.ws) return abort(t, "gone");
        t.wsA = ws; t.wsB = other.ws;
        setSt(t, "delivering");
        tell(other.ws, { op: "deliver", id: t.id, k: t.kB, from: t.from, fromName: me.name, item: t.item });
        return;
      }
    }
    return err(ws, "TRADE_OP");
  }

  function handle(ws, msg, ctx){
    if(limited(ws)) return err(ws, "TRADE_SLOW");
    if(["status", "got", "applied", "refuse"].includes(msg.op)) return handleLedger(ws, msg);
    if(!ctx) return err(ws, "NO_ROOM");
    return handleRoom(ws, msg, ctx);
  }
  // Salida de la sala, expulsión o comienzo de la partida: se anulan las ofertas abiertas (antes
  // del commit el que da todavía no perdió nada; "delivering" sigue su curso hasta el got o el timeout).
  function roomEvent(code, slot){
    for(const t of trades.values()){
      if(t.room !== code || !OPEN_STATES.includes(t.st)) continue;
      if(slot === undefined || t.from === slot || t.to === slot) abort(t, slot === undefined ? "started" : "left");
    }
  }
  return { handle, roomEvent, trades, burned, boundReason, compact,
    close(){ clearInterval(sweeper); clearInterval(compacter); } };
}

module.exports = { create, boundReason, cleanValue, TRADE_ITEM_MAX_BYTES };
