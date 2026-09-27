"use strict";
// LA HORDA — prueba del relay PUBLICADO (Render), sin navegador: lo que hace un teléfono al tocar
// "Crear sala" y otro al "Unirse con código", con el Origin del juego publicado.
//   1) despierta el servidor (/health) y mide cuánto tarda (plan gratuito dormido: hasta ~1 min)
//   2) A crea una sala · B se une con el código · A ve a B en la sala · B se va · A se va
//   3) informativo: una página no autorizada recibe el aviso ORIGIN (y no queda colgada)
// uso: node tools/net-test/live_relay.js   (env: RELAY, ORIGIN, BUILD)
// Corre en GitHub Actions (.github/workflows/live-relay.yml): desde el entorno de desarrollo el proxy
// no deja salir a onrender.com.
let WebSocket;
try { WebSocket = require("ws"); } catch (e) { WebSocket = require(require("path").join(__dirname, "../../server/node_modules/ws")); }
const RELAY = process.env.RELAY || "wss://la-horda-relay.onrender.com";
const ORIGIN = process.env.ORIGIN || "https://drmarianojimenez94-sudo.github.io";
const HEALTH = RELAY.replace(/^ws/, "http").replace(/\/$/, "") + "/health";
const BUILD = process.env.BUILD || "live-check";
let fails = 0;
const check = (n, ok, x) => { console.log((ok ? "PASS " : "FAIL ") + n + (x !== undefined ? "  " + JSON.stringify(x) : "")); if (!ok) fails++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));

function client(origin) {
  return new Promise((res, rej) => {
    const ws = new WebSocket(RELAY, { origin }); const inbox = []; let closed = null;
    const t = setTimeout(() => rej(new Error("connect timeout")), 20000);
    ws.on("message", b => { try { inbox.push(JSON.parse(b.toString())); } catch (e) {} });
    ws.on("close", (code, reason) => { closed = { code, reason: String(reason) }; });
    ws.on("error", e => { clearTimeout(t); rej(e); });
    ws.on("open", () => { clearTimeout(t); res({ ws, inbox, closed: () => closed, send: o => ws.send(JSON.stringify(o)),
      wait: (pred, ms = 8000) => new Promise((ok, ko) => { const t0 = Date.now(); (function poll() { const i = inbox.findIndex(pred); if (i >= 0) return ok(inbox.splice(i, 1)[0]); if (Date.now() - t0 > ms) return ko(new Error("timeout")); setTimeout(poll, 25); })(); }) }); });
  });
}

(async () => {
  const out = { relay: RELAY, origin: ORIGIN };
  // 1) despertar
  const t0 = Date.now(); let health = null;
  while (Date.now() - t0 < 150000) {
    try { const r = await fetch(HEALTH, { signal: AbortSignal.timeout(20000) }); if (r.ok) { health = (await r.text()).trim(); break; } } catch (e) {}
    await sleep(3000);
  }
  out.wakeMs = Date.now() - t0; out.health = health;
  check("health", !!health, { ms: out.wakeMs, health });
  if (!health) { console.log(JSON.stringify(out)); process.exit(1); }

  // 1b) diagnóstico: ¿circulan mensajes? ping → pong (con y sin Origin)
  for (const o of [ORIGIN, undefined]) {
    try {
      const p = await client(o); const tp = Date.now();
      p.send({ t: "ping", c: 7 });
      const pong = await p.wait(m => m.t === "pong", 15000).catch(() => null);
      console.log("INFO ping origin=" + (o || "(ninguno)") + " " + JSON.stringify({ pong: !!pong, ms: Date.now() - tp, inbox: p.inbox.slice(0, 3), closed: p.closed() }));
      try { p.ws.close(); } catch (e) {}
    } catch (e) { console.log("INFO ping origin=" + (o || "(ninguno)") + " connectError " + String(e && e.message || e)); }
  }

  // 2) crear sala + unirse con código (Origin del juego publicado)
  let a = null;
  try {
    a = await client(ORIGIN);
    const tc = Date.now();
    a.send({ t: "create", protocol: 1, build: BUILD, arena: "ciudad", champ: "tanque", level: 1, name: "Telefono A", clientId: "live-A-" + Date.now() });
    const ja = await a.wait(m => m.t === "joined" || m.t === "error", 20000);
    out.createMs = Date.now() - tc;
    check("create", ja.t === "joined" && ja.slot === 0 && /^[A-Z2-9]{4,8}$/.test(ja.room && ja.room.code || ""), ja.t === "joined" ? { code: ja.room.code, ms: out.createMs } : ja);
    if (ja.t === "joined") {
      const code = ja.room.code;
      const b = await client(ORIGIN);
      const tj = Date.now();
      b.send({ t: "join", protocol: 1, build: BUILD, code: code.toLowerCase(), champ: "mago", level: 1, name: "Telefono B", clientId: "live-B-" + Date.now() });
      const jb = await b.wait(m => m.t === "joined" || m.t === "error");
      out.joinMs = Date.now() - tj;
      check("join_by_code", jb.t === "joined" && jb.slot === 1, jb.t === "joined" ? { slot: jb.slot, ms: out.joinMs } : jb);
      const seen = await a.wait(m => m.t === "room" && m.room.slots.filter(Boolean).length === 2).catch(() => null);
      check("host_sees_guest", !!seen, seen && seen.room.slots.map(s => s && s.name));
      b.send({ t: "leave" });
      const left = await a.wait(m => m.t === "room" && m.room.slots.filter(Boolean).length === 1).catch(() => null);
      check("guest_leaves", !!left);
      a.send({ t: "leave" });
      await sleep(300); a.ws.close(); b.ws.close();
    }
  } catch (e) { check("create_join", false, { err: String(e && e.message || e), inbox: a && a.inbox.slice(0, 5), closed: a && a.closed() }); }

  // 3) informativo: origen no autorizado → aviso claro, sin colgarse
  try {
    const x = await client("https://ejemplo-no-autorizado.invalid");
    await sleep(2500);
    const err = x.inbox.find(m => m.t === "error");
    out.badOrigin = { error: err && err.code, closed: x.closed() };
    console.log("INFO bad_origin " + JSON.stringify(out.badOrigin) + (err ? "" : "  (el servidor publicado todavía no filtra orígenes o no manda el aviso)"));
    try { x.ws.close(); } catch (e) {}
  } catch (e) { out.badOrigin = { connectError: String(e && e.message || e) }; console.log("INFO bad_origin " + JSON.stringify(out.badOrigin)); }

  console.log(JSON.stringify(out));
  console.log("SUMMARY " + (fails ? "FAIL" : "OK") + " fails=" + fails);
  process.exit(fails ? 1 : 0);
})();
