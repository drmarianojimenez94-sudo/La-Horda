"use strict";
// Prueba de protocolo del relay (sin navegador): anfitrión + 3 invitados, el 5º rechazado por
// SALA COMPLETA, bloqueo al comenzar, reconexión con el mismo clientId, reenvío de mensajes y
// cierre de la sala cuando se va el anfitrión.  Uso: node test-relay.js
process.env.PORT = process.env.PORT || "8799";
const { server } = require("./relay.js");
const WebSocket = require("ws");
const URL = "ws://127.0.0.1:" + process.env.PORT;
let fails = 0;
const check = (name, ok, extra) => { console.log((ok ? "PASS " : "FAIL ") + name + (extra !== undefined ? "  " + JSON.stringify(extra) : "")); if(!ok) fails++; };
function client(){
  return new Promise(res => {
    const ws = new WebSocket(URL); const inbox = [];
    ws.on("message", b => inbox.push(JSON.parse(b.toString())));
    ws.on("open", () => res({ ws, inbox, send: o => ws.send(JSON.stringify(o)),
      wait: (pred, ms = 2000) => new Promise((ok, ko) => { const t0 = Date.now(); (function poll(){ const i = inbox.findIndex(pred); if(i >= 0) return ok(inbox.splice(i, 1)[0]); if(Date.now() - t0 > ms) return ko(new Error("timeout")); setTimeout(poll, 10); })(); }) }));
  });
}
(async () => {
  await new Promise(r => setTimeout(r, 200));
  const host = await client();
  host.send({ t: "create", protocol: 1, arena: "bosque", name: "Mariano", champ: "tanque", level: 5, clientId: "H", build: "b1" });
  const created = await host.wait(m => m.t === "joined");
  const code = created.room.code;
  check("create.room_code", /^[A-Z2-9]{6}$/.test(code), code);
  check("create.host_slot0", created.slot === 0 && created.host);
  const guests = [];
  const names = ["Facundo", "Daniel", "Tercero"];
  for(let i = 0; i < 3; i++){
    const g = await client();
    g.send({ t: "join", protocol: 1, code, name: names[i], champ: ["mago", "guerrero", "soporte"][i], level: 3, clientId: "G" + i, build: "b1" });
    const j = await g.wait(m => m.t === "joined" || m.t === "error");
    check(`join.guest${i + 1}_slot`, j.t === "joined" && j.slot === i + 1, j.slot);
    guests.push(g);
  }
  const hostView = await host.wait(m => m.t === "room" && m.room.slots.filter(Boolean).length === 4);
  check("room.host_sees_4", hostView.room.slots.map(s => s && s.name).join(",") === "Mariano,Facundo,Daniel,Tercero", hostView.room.slots.map(s => s && s.name));
  const fifth = await client();
  fifth.send({ t: "join", protocol: 1, code, name: "Quinto", champ: "axiom", clientId: "X", build: "b1" });
  const e5 = await fifth.wait(m => m.t === "error");
  check("join.fifth_room_full", e5.code === "ROOM_FULL", e5);
  const wrong = await client();
  wrong.send({ t: "join", protocol: 1, code: "ZZZZZZ", name: "x", clientId: "Y" });
  check("join.not_found", (await wrong.wait(m => m.t === "error")).code === "NOT_FOUND");
  // ready
  guests[0].send({ t: "update", ready: true });
  const rr = await host.wait(m => m.t === "room" && m.room.slots[1] && m.room.slots[1].ready);
  check("ready.synced", !!rr);
  // relay: invitado -> anfitrión, anfitrión -> todos, anfitrión -> uno
  guests[1].send({ t: "msg", d: { k: "in", x: 1 } });
  const toHost = await host.wait(m => m.t === "msg");
  check("relay.guest_to_host", toHost.from === 2 && toHost.d.k === "in");
  host.send({ t: "msg", d: { k: "snap", n: 7 } });
  const got = await Promise.all(guests.map(g => g.wait(m => m.t === "msg" && m.d.k === "snap")));
  check("relay.host_broadcast", got.every(m => m.d.n === 7 && m.from === 0));
  host.send({ t: "msg", to: 3, d: { k: "only3" } });
  const o3 = await guests[2].wait(m => m.t === "msg" && m.d.k === "only3");
  check("relay.host_to_one", !!o3);
  let leaked = false; try{ await guests[0].wait(m => m.t === "msg" && m.d.k === "only3", 300); leaked = true; }catch(e){}
  check("relay.not_leaked", !leaked);
  // chat de la sala: llega a todos, se sanea, anti-spam, repetidos, historial al reconectar, silenciar
  for (const c of [host, ...guests]) c.inbox.length = 0;
  guests[0].send({ t: "chat", text: "  hola   <b>equipo</b>  " });
  const ch = await Promise.all([host, ...guests].map(c => c.wait(m => m.t === "chat")));
  check("chat.llega_a_todos_y_saneado", ch.every(m => m.m.text === "hola bequipo/b" && m.m.from === 1 && m.m.name === "Facundo"), ch[0].m);
  guests[0].send({ t: "chat", text: "otra" });
  check("chat.anti_spam_intervalo", (await guests[0].wait(m => m.t === "error")).code === "CHAT_SLOW");
  await new Promise(r => setTimeout(r, 850));
  guests[0].send({ t: "chat", text: "HOLA bequipo/b" });
  check("chat.repetido_bloqueado", (await guests[0].wait(m => m.t === "error")).code === "CHAT_DUP");
  guests[1].send({ t: "chat", text: "x".repeat(400) });
  const long = await host.wait(m => m.t === "chat" && m.m.from === 2);
  check("chat.largo_maximo_120", long.m.text.length === 120);
  let burst = 0; for (let i = 0; i < 7; i++){ guests[2].send({ t: "chat", text: "m" + i }); await new Promise(r => setTimeout(r, 820)); }
  await new Promise(r => setTimeout(r, 100)); burst = host.inbox.filter(m => m.t === "chat" && m.m.from === 3).length;
  check("chat.rafaga_maxima_5_en_10s", burst === 5, burst);
  host.send({ t: "mute", slot: 1, on: true });
  await host.wait(m => m.t === "room" && m.room.slots[1] && m.room.slots[1].muted);
  await new Promise(r => setTimeout(r, 850));
  guests[0].send({ t: "chat", text: "me silenciaron?" });
  check("chat.silenciado_por_el_anfitrion", (await guests[0].wait(m => m.t === "error")).code === "CHAT_MUTED");
  guests[1].send({ t: "mute", slot: 3, on: true });
  check("chat.solo_el_anfitrion_silencia", (await guests[1].wait(m => m.t === "error")).code === "NOT_HOST");
  host.send({ t: "mute", slot: 1, on: false });
  await host.wait(m => m.t === "room" && m.room.slots[1] && !m.room.slots[1].muted);
  // start: sala bloqueada
  host.send({ t: "start" });
  await host.wait(m => m.t === "room" && m.room.state === "playing");
  guests[2].ws.close(); // se cae Tercero en plena partida
  const lost = await host.wait(m => m.t === "room" && m.room.slots[3] && !m.room.slots[3].connected);
  check("disconnect.slot_kept", !!lost);
  fifth.send({ t: "join", protocol: 1, code, name: "Quinto", clientId: "X", build: "b1" });
  check("join.locked_after_start", ["STARTED", "ROOM_FULL"].includes((await fifth.wait(m => m.t === "error")).code));
  const back = await client();
  back.send({ t: "join", protocol: 1, code, name: "Tercero", clientId: "G2", build: "b1" });
  const rj = await back.wait(m => m.t === "joined" || m.t === "error");
  check("reconnect.same_slot", rj.t === "joined" && rj.slot === 3 && rj.reconnect, rj);
  check("chat.historial_al_reconectar", Array.isArray(rj.chat) && rj.chat.length >= 3 && rj.chat.length <= 20, rj.chat && rj.chat.length);
  // en partida, LISTO no cuenta (se marca en la sala)
  guests[1].send({ t: "update", ready: true });
  const rp = await host.wait(m => m.t === "room" && m.room.slots[2]);
  check("ready.ignored_while_playing", rp.room.slots[2].ready === false, rp.room.slots[2]);
  // fin de partida: la MISMA sala vuelve a esperar, todos siguen, LISTO en NO
  host.inbox.length = 0; guests[0].inbox.length = 0;
  host.send({ t: "lobby" });
  const lb = await host.wait(m => m.t === "room" && m.room.state === "lobby");
  check("lobby.same_room_back", lb.room.code === code && lb.room.slots.filter(Boolean).length === 4, lb.room.slots.map(s => s && s.name));
  check("lobby.ready_reset", lb.room.slots.slice(1).every(s => s && s.ready === false));
  // el anfitrión cambia la arena desde la sala; un invitado no puede
  guests[0].send({ t: "update", arena: "infernal" });
  host.send({ t: "update", arena: "acuatica" });
  const ar = await guests[0].wait(m => m.t === "room" && m.room.arena === "acuatica");
  check("lobby.host_changes_arena", !!ar);
  check("lobby.guest_cannot_change_arena", ar.room.arena === "acuatica");
  // y se puede volver a comenzar con los mismos jugadores
  host.send({ t: "start" });
  const again = await host.wait(m => m.t === "room" && m.room.state === "playing");
  check("lobby.restart_same_players", again.room.slots.filter(Boolean).length === 4);
  // el anfitrión se va: la sala se cierra para todos
  host.ws.close();
  const closed = await Promise.all([guests[0], guests[1], back].map(g => g.wait(m => m.t === "closed")));
  check("host_left.room_closed", closed.every(m => m.reason === "host_left"));
  console.log("SUMMARY", JSON.stringify({ fails }));
  server.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.log("FAIL exception", e.message); process.exit(1); });
