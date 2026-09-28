"use strict";
// Prueba de protocolo (sin navegador) de SALAS PÚBLICAS e INTERCAMBIO (server/trades.js) contra el
// relay real, levantado como proceso aparte (así se puede reiniciar y ver que el registro sobrevive).
// Uso: node test-trades.js   (PORT=8796 para otro puerto; usa una carpeta temporal como DATA_DIR)
const { spawn } = require("child_process");
const fs = require("fs"), os = require("os"), path = require("path"), http = require("http");
const WebSocket = require("ws");
const PORT = process.env.PORT || "8796";
const URL = "ws://127.0.0.1:" + PORT;
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), "horda-trades-"));
let fails = 0, relay = null;
const check = (name, ok, extra) => { console.log((ok ? "PASS " : "FAIL ") + name + (extra !== undefined ? "  " + JSON.stringify(extra).slice(0, 300) : "")); if(!ok) fails++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
function startRelay(){
  return new Promise(res => {
    relay = spawn(process.execPath, [path.join(__dirname, "relay.js")], { env: Object.assign({}, process.env, { PORT, DATA_DIR: DATA, TRADE_DELIVER_TIMEOUT_MS: "1500" }), stdio: ["ignore", "pipe", "inherit"] });
    relay.stdout.on("data", b => { if(/RELAY_LISTENING/.test(b.toString())) res(); });
  });
}
function stopRelay(){ return new Promise(r => { relay.on("exit", r); relay.kill(); }); }
function client(){
  return new Promise(res => {
    const ws = new WebSocket(URL); const inbox = [];
    ws.on("message", b => inbox.push(JSON.parse(b.toString())));
    ws.on("open", () => res({ ws, inbox, send: o => ws.send(JSON.stringify(o)),
      wait: (pred, ms = 2500) => new Promise((ok, ko) => { const t0 = Date.now(); (function poll(){ const i = inbox.findIndex(pred); if(i >= 0) return ok(inbox.splice(i, 1)[0]); if(Date.now() - t0 > ms) return ko(new Error("timeout")); setTimeout(poll, 10); })(); }),
      clear: () => { inbox.length = 0; },
      none: async (pred, ms = 400) => { await sleep(ms); return !inbox.some(pred); } }));
  });
}
const getRooms = (q) => new Promise((ok, ko) => http.get(`http://127.0.0.1:${PORT}/api/rooms${q || ""}`, r => { let b = ""; r.on("data", d => b += d); r.on("end", () => ok({ status: r.statusCode, body: b ? JSON.parse(b) : null, cors: r.headers["access-control-allow-origin"] })); }).on("error", ko));
const item = (uid, extra) => Object.assign({ uid, type: "arma", rarity: "legendario", name: "Hoja de <b>Karzul</b>", level: 3, value: 0.5, affixes: [{ id: "crit", v: 0.05 }], passives: [] }, extra || {});
const T = (op, o) => Object.assign({ t: "trade", op }, o || {});

(async () => {
  await startRelay();
  /* ---------------- SALAS PÚBLICAS ---------------- */
  const A = await client();
  A.send({ t: "create", protocol: 1, arena: "bosque", name: "Ana", champ: "mago", level: 12, clientId: "A", build: "b1", public: true, diff: "pesadilla" });
  const ja = await A.wait(m => m.t === "joined"); const code = ja.room.code;
  const P = await client(); // sala privada de un cliente viejo (no manda public)
  P.send({ t: "create", protocol: 1, arena: "hielo", name: "Viejo", champ: "tanque", level: 3, clientId: "P", build: "b1" });
  await P.wait(m => m.t === "joined");
  let r = await getRooms("?build=b1");
  check("rooms.http_lista_solo_publicas", r.status === 200 && r.body.rooms.length === 1 && r.body.rooms[0].code === code, r.body);
  const e0 = r.body.rooms[0] || {};
  check("rooms.campos", e0.arena === "bosque" && e0.diff === "pesadilla" && e0.humans === 1 && e0.max === 4 && e0.lvMin === 12 && e0.lvMax === 12 && e0.host === "Ana", e0);
  check("rooms.sin_datos_sensibles", !JSON.stringify(r.body).match(/clientId|"A"|build|chat|ws/), r.body);
  check("rooms.cors", r.cors === "*", r.cors);
  r = await getRooms("?build=otra");
  check("rooms.filtra_por_build", r.body.rooms.length === 0);
  const B = await client();
  B.send({ t: "join", protocol: 1, code, name: "Beto", champ: "musashi", level: 20, clientId: "B", build: "b1" });
  await B.wait(m => m.t === "joined");
  await sleep(1100);
  r = await getRooms("");
  check("rooms.rango_nivel", r.body.rooms[0] && r.body.rooms[0].humans === 2 && r.body.rooms[0].lvMin === 12 && r.body.rooms[0].lvMax === 20, r.body.rooms[0]);
  B.send({ t: "rooms" });
  const wr = await B.wait(m => m.t === "rooms");
  check("rooms.ws", wr.list.length === 1 && wr.list[0].code === code);
  B.send({ t: "rooms" });
  check("rooms.ws_rate_limit", (await B.wait(m => m.t === "error")).code === "ROOMS_SLOW");
  // el anfitrión la hace privada y vuelve a pública
  A.send({ t: "update", public: false }); await sleep(1100);
  check("rooms.privada_no_aparece", (await getRooms("")).body.rooms.length === 0);
  A.send({ t: "update", public: true }); await sleep(1100);
  check("rooms.vuelve_a_publica", (await getRooms("")).body.rooms.length === 1);
  // un invitado no puede cambiarla
  B.send({ t: "update", public: false }); await sleep(1100);
  check("rooms.invitado_no_la_cambia", (await getRooms("")).body.rooms.length === 1);

  /* ---------------- INTERCAMBIO ---------------- */
  // objetos ligados: rechazados por el relay
  for(const [n, it] of [["unico", item("u1", { rarity: "unico" })], ["set", item("u2", { set: "errante" })], ["mistica", item("u3", { rerollIdx: 1, rerolls: 1 })]]){
    A.send(T("offer", { to: 1, item: it }));
    const e = await A.wait(m => m.t === "error");
    check("trade.ligado_rechazado." + n, e.code === "TRADE_BOUND", e);
    await sleep(1600); // anti-spam de ofertas
  }
  A.send(T("offer", { to: 1, item: item("big", { junk: "x".repeat(9000) }) }));
  check("trade.limite_de_tamano", (await A.wait(m => m.t === "error")).code === "TRADE_TOO_BIG");
  await sleep(1600);
  A.send(T("offer", { to: 0, item: item("x1") }));
  check("trade.no_a_si_mismo", (await A.wait(m => m.t === "error")).code === "TRADE_NO_TARGET");
  await sleep(1600);
  // flujo completo: oferta -> acepta -> confirma -> entrega -> got (commit) -> applied -> done
  A.send(T("offer", { to: 1, item: item("it_7_abc") }));
  const sent = await A.wait(m => m.t === "trade" && m.op === "sent");
  const offer = await B.wait(m => m.t === "trade" && m.op === "offer");
  check("trade.oferta_llega", offer.id === sent.id && offer.fromName === "Ana" && offer.item.uid === "it_7_abc", offer);
  check("trade.texto_saneado", !/[<>]/.test(offer.item.name), offer.item.name);
  check("trade.sin_clave_del_otro", !offer.k && !!sent.k);
  A.send(T("offer", { to: 1, item: item("it_8") })); await sleep(50);
  // (anti-spam o "ocupado": cualquiera de los dos frena la segunda oferta)
  const busy = await A.wait(m => m.t === "error");
  check("trade.una_oferta_a_la_vez", /TRADE_(BUSY|SLOW)/.test(busy.code), busy);
  B.send(T("accept", { id: offer.id }));
  await A.wait(m => m.t === "trade" && m.op === "accepted" && m.id === sent.id);
  A.send(T("confirm", { id: sent.id, k: "mala" }));
  check("trade.confirm_con_clave_mala", (await A.wait(m => m.t === "error")).code === "TRADE_GONE");
  A.send(T("confirm", { id: sent.id, k: sent.k }));
  const del = await B.wait(m => m.t === "trade" && m.op === "deliver");
  check("trade.entrega", del.id === sent.id && del.item.uid === "it_7_abc" && !!del.k);
  check("trade.a_no_termina_antes_del_commit", await A.none(m => m.t === "trade" && m.op === "done"));
  B.send(T("got", { id: del.id, k: del.k }));
  await B.wait(m => m.t === "trade" && m.op === "commit");
  A.send(T("status", { id: sent.id, k: sent.k }));
  const wst = await A.wait(m => m.t === "trade" && (m.op === "wait" || m.op === "done"));
  check("trade.commit_sin_applied_espera", wst.op === "wait" && wst.st === "committed", wst);
  B.send(T("applied", { id: del.id, k: del.k }));
  await B.wait(m => m.t === "trade" && m.op === "ok");
  const done = await A.wait(m => m.t === "trade" && m.op === "done");
  check("trade.done_al_que_da", done.id === sent.id);
  B.clear();
  B.send(T("got", { id: del.id, k: del.k }));
  check("trade.got_repetido_idempotente", (await B.wait(m => m.t === "trade")).op === "commit");
  await sleep(1600);
  A.send(T("offer", { to: 1, item: item("it_7_abc") }));
  check("trade.uid_quemado", (await A.wait(m => m.t === "error")).code === "TRADE_BURNED");

  // rechazo
  await sleep(1600); A.clear(); B.clear();
  A.send(T("offer", { to: 1, item: item("it_9") }));
  const o2 = await B.wait(m => m.t === "trade" && m.op === "offer");
  B.send(T("reject", { id: o2.id }));
  const ab2 = await A.wait(m => m.t === "trade" && m.op === "abort");
  check("trade.rechazo", ab2.id === o2.id && ab2.why === "rejected", ab2);

  // corte en "delivering": B nunca manda got -> se anula a los 1,5 s (prueba) y el got tardío no vale
  await sleep(1600); A.clear(); B.clear();
  A.send(T("offer", { to: 1, item: item("it_10") }));
  const s3 = await A.wait(m => m.t === "trade" && m.op === "sent");
  const o3 = await B.wait(m => m.t === "trade" && m.op === "offer");
  B.send(T("accept", { id: o3.id })); await A.wait(m => m.t === "trade" && m.op === "accepted");
  A.send(T("confirm", { id: s3.id, k: s3.k }));
  const d3 = await B.wait(m => m.t === "trade" && m.op === "deliver");
  const ab3 = await A.wait(m => m.t === "trade" && m.op === "abort", 4000);
  check("trade.timeout_sin_got_anula", ab3.why === "timeout");
  B.send(T("got", { id: d3.id, k: d3.k }));
  B.clear(); B.send(T("got", { id: d3.id, k: d3.k }));
  check("trade.got_tardio_rechazado", (await B.wait(m => m.t === "trade" && m.id === d3.id)).op === "abort");

  // oferta abierta y el invitado se va: se anula
  await sleep(1600); A.clear(); B.clear();
  A.send(T("offer", { to: 1, item: item("it_11") }));
  const o4 = await B.wait(m => m.t === "trade" && m.op === "offer");
  B.send({ t: "leave" });
  const ab4 = await A.wait(m => m.t === "trade" && m.op === "abort");
  check("trade.salida_anula", ab4.id === o4.id && ab4.why === "left", ab4);

  // commit y corte antes de "applied": el relay se reinicia y el registro sobrevive
  B.send({ t: "join", protocol: 1, code, name: "Beto", champ: "musashi", level: 20, clientId: "B", build: "b1" });
  await B.wait(m => m.t === "joined");
  await sleep(1600); A.clear(); B.clear();
  A.send(T("offer", { to: 1, item: item("it_12") }));
  const s5 = await A.wait(m => m.t === "trade" && m.op === "sent");
  const o5 = await B.wait(m => m.t === "trade" && m.op === "offer");
  B.send(T("accept", { id: o5.id })); await A.wait(m => m.t === "trade" && m.op === "accepted");
  A.send(T("confirm", { id: s5.id, k: s5.k }));
  const d5 = await B.wait(m => m.t === "trade" && m.op === "deliver");
  B.send(T("got", { id: d5.id, k: d5.k })); await B.wait(m => m.t === "trade" && m.op === "commit");
  // y otro que queda "accepted" (A escondió el objeto pero su confirm no llegó) para ver que se anula
  await sleep(1600); A.clear(); B.clear();
  A.send(T("offer", { to: 1, item: item("it_13") }));
  const s6 = await A.wait(m => m.t === "trade" && m.op === "sent");
  const o6 = await B.wait(m => m.t === "trade" && m.op === "offer");
  B.send(T("accept", { id: o6.id })); await A.wait(m => m.t === "trade" && m.op === "accepted");
  for(const c of [A, B, P]) c.ws.close();
  await stopRelay(); await startRelay();
  const A2 = await client(), B2 = await client();
  A2.send(T("status", { id: s5.id, k: s5.k }));
  check("reinicio.commit_recordado", (await A2.wait(m => m.t === "trade")).op === "wait");
  B2.send(T("got", { id: d5.id, k: d5.k }));
  check("reinicio.b_termina", (await B2.wait(m => m.t === "trade")).op === "commit");
  B2.send(T("applied", { id: d5.id, k: d5.k }));
  await B2.wait(m => m.t === "trade" && m.op === "ok");
  await A2.wait(m => m.t === "trade" && m.op === "done"); // aviso directo al aplicar B
  A2.send(T("status", { id: s5.id, k: s5.k }));
  check("reinicio.a_termina", (await A2.wait(m => m.t === "trade")).op === "done");
  A2.send(T("status", { id: s6.id, k: s6.k }));
  const ab6 = await A2.wait(m => m.t === "trade");
  check("reinicio.abierto_se_anula", ab6.op === "abort", ab6);
  A2.send(T("status", { id: "nada", k: "x" }));
  const unk = await A2.wait(m => m.t === "trade");
  check("trade.id_desconocido", unk.op === "unknown", unk);
  A2.send(T("status", { id: s5.id, k: d5.k }));
  check("trade.clave_del_otro_no_sirve", (await A2.wait(m => m.t === "trade")).op === "unknown");
  // el uid quemado sobrevive al reinicio
  A2.send({ t: "create", protocol: 1, arena: "bosque", name: "Ana", champ: "mago", level: 12, clientId: "A", build: "b1" });
  await A2.wait(m => m.t === "joined");
  B2.send({ t: "join", protocol: 1, code: (await (async () => { A2.send({ t: "update" }); return (await A2.wait(m => m.t === "room")).room.code; })()), name: "Beto", champ: "musashi", level: 20, clientId: "B2", build: "b1" });
  await B2.wait(m => m.t === "joined");
  A2.send(T("offer", { to: 1, item: item("it_7_abc") }));
  check("reinicio.uid_sigue_quemado", (await A2.wait(m => m.t === "error")).code === "TRADE_BURNED");
  // límite de pedidos HTTP por IP
  let last = 0; for(let i = 0; i < 35; i++) last = (await getRooms("")).status;
  check("rooms.http_rate_limit", last === 429, last);
  for(const c of [A2, B2]) c.ws.close();
  await stopRelay();
  fs.rmSync(DATA, { recursive: true, force: true });
  console.log(fails ? `FAILS ${fails}` : "OK");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); try{ relay && relay.kill(); }catch(x){} process.exit(2); });
