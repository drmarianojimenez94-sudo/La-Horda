"use strict";
/* ============================================================
   js/net/net-chat.js
   CHAT DE LA SALA (online). Simple y pensado para el celular:
   - frases rápidas de un toque (no hace falta abrir el teclado),
   - texto libre de hasta 120 caracteres,
   - el anti-spam real vive en el servidor (server/relay.js: intervalo mínimo, ráfaga máxima,
     repetidos, palabras tapadas); acá solo se refleja (botón en espera, aviso),
   - el anfitrión puede silenciar a alguien tocando su nombre (base para moderación),
   - historial corto: quien entra o se reconecta ve lo último.
   Vive en su propio contenedor (#net-chat) para que las actualizaciones de la sala no borren
   lo que uno está escribiendo. Solo en la Sala: durante la partida no distrae.
   ============================================================ */
const NET_CHAT_QUICK = ["¡Listo!", "Esperen un toque", "¡Vamos!", "Cambio de campeón", "¿Quién tanquea?", "gg"];
const NET_CHAT_MAX = 120;
const netChat = { log: [], unread: 0, open: true, sendAt: 0 };

function _chatEsc(s){ return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
function netChatReset(list){ netChat.log = (list || []).slice(-20); netChat.unread = 0; }
function netChatSend(text){
  text = String(text || "").replace(/\s+/g, " ").trim().slice(0, NET_CHAT_MAX);
  if(!text || !netInRoom()) return false;
  const now = performance.now();
  if(now - netChat.sendAt < 800){ netChatNotice("Más despacio…"); return false; }
  netChat.sendAt = now;
  netSend({t:"chat", text});
  return true;
}
function netChatNotice(t){
  const el = document.getElementById("net-chat-notice"); if(!el) return;
  el.textContent = t; clearTimeout(el._t); el._t = setTimeout(()=>{ el.textContent = ""; }, 2200);
}
function _chatLineHTML(m){
  const col = NET_SLOT_COLORS[m.from] || "#ccc";
  const mine = m.from === net.slot;
  const canMute = net.role === "host" && m.from > 0;
  return `<div class="nc-line ${mine ? "mine" : ""}"><b class="nc-name" style="color:${col}" ${canMute ? `data-mute="${m.from}" title="Tocá para silenciar/activar"` : ""}>${_chatEsc(m.name)}</b> ${_chatEsc(m.text)}</div>`;
}
// Arma el panel una sola vez; después solo refresca la lista (no pisa el cuadro de texto).
function netRenderChat(){
  const box = document.getElementById("net-chat"); if(!box) return;
  const show = netInRoom() && state === "prep";
  box.classList.toggle("hidden", !show);
  if(!show) return;
  if(!box._built){
    box._built = true;
    box.innerHTML = `<div class="nc-head"><span>💬 Chat de la sala</span><button class="nc-toggle" id="net-chat-toggle">–</button></div>
      <div class="nc-body" id="net-chat-body">
        <div class="nc-log" id="net-chat-log"></div>
        <div class="nc-quick">${NET_CHAT_QUICK.map(q=>`<button class="nc-chip" data-q="${_chatEsc(q)}">${_chatEsc(q)}</button>`).join("")}</div>
        <div class="nc-row"><input id="net-chat-input" maxlength="${NET_CHAT_MAX}" placeholder="Escribí algo…" autocomplete="off" enterkeyhint="send"><button class="btn small" id="net-chat-send">Enviar</button></div>
        <div class="nc-notice" id="net-chat-notice"></div>
      </div>`;
    const inp = document.getElementById("net-chat-input");
    const go = ()=>{ if(netChatSend(inp.value)) inp.value = ""; };
    document.getElementById("net-chat-send").addEventListener("click", go);
    inp.addEventListener("keydown", (e)=>{ if(e.key === "Enter"){ e.preventDefault(); go(); } });
    box.querySelectorAll("[data-q]").forEach(b=> b.addEventListener("click", ()=> netChatSend(b.getAttribute("data-q"))));
    document.getElementById("net-chat-toggle").addEventListener("click", ()=>{ netChat.open = !netChat.open; netChat.unread = 0; netRenderChat(); });
    document.getElementById("net-chat-log").addEventListener("click", (e)=>{
      const t = e.target.closest("[data-mute]"); if(!t || net.role !== "host") return;
      const i = +t.getAttribute("data-mute"), s = net.room && net.room.slots[i]; if(!s) return;
      netSend({t:"mute", slot:i, on:!s.muted});
      netChatNotice(s.muted ? `${s.name} puede volver a escribir` : `${s.name} silenciado`);
    });
  }
  document.getElementById("net-chat-body").classList.toggle("hidden", !netChat.open);
  const tg = document.getElementById("net-chat-toggle");
  tg.textContent = netChat.open ? "–" : (netChat.unread ? `+ (${netChat.unread})` : "+");
  const log = document.getElementById("net-chat-log");
  const muted = net.room && net.room.slots[net.slot] && net.room.slots[net.slot].muted;
  log.innerHTML = netChat.log.length ? netChat.log.map(_chatLineHTML).join("") : `<div class="nc-empty">Todavía nadie escribió. Probá una frase rápida.</div>`;
  log.scrollTop = log.scrollHeight;
  const inp = document.getElementById("net-chat-input"), send = document.getElementById("net-chat-send");
  inp.disabled = !!muted; send.disabled = !!muted;
  inp.placeholder = muted ? "El anfitrión te silenció" : "Escribí algo…";
  box.querySelectorAll("[data-q]").forEach(b=>{ b.disabled = !!muted; });
}
function netChatOnMessage(m){
  netChat.log.push(m); if(netChat.log.length > 20) netChat.log.shift();
  if(!netChat.open && m.from !== net.slot) netChat.unread++;
  if(m.from !== net.slot && state === "prep") playSfx("ready");
  netRenderChat();
}
netOn("chat", netChatOnMessage);
netOn("chatError", (code)=>{
  netChatNotice(code === "CHAT_SLOW" ? "Más despacio: esperá un segundo." : code === "CHAT_DUP" ? "Ese mensaje ya lo mandaste." : code === "CHAT_MUTED" ? "El anfitrión te silenció." : "No se pudo enviar.");
});
