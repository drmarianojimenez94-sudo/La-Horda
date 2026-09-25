"use strict";
/* ============================================================
   js/net/net-debug.js
   Panel de desarrollo B1 (ocultable): sala, rol, lugar, conexión, ping, humanos/bots, arena,
   nivel, entidades sincronizadas, errores, reintentos y el registro de eventos de red.
   Se abre con el botón "B1" (arriba a la izquierda) o agregando ?debug=1 a la URL.
   ============================================================ */
let _netDbgOpen = false, _netDbgLast = 0;
function netDebugToggle(on){
  _netDbgOpen = on===undefined ? !_netDbgOpen : !!on;
  const p = document.getElementById("net-debug-panel");
  if(p) p.classList.toggle("hidden", !_netDbgOpen);
  netDebugRefresh(true);
}
function netDebugRefresh(force){
  if(!_netDbgOpen) return;
  const now = performance.now();
  if(!force && now - _netDbgLast < 400) return;
  _netDbgLast = now;
  const p = document.getElementById("net-debug-panel"); if(!p) return;
  const humans = net.room ? net.room.slots.filter(s=>s && s.connected).length : (netMatch ? 0 : 1);
  const synced = netMatch ? (netMatch.role==="guest" ? [...(netMatch.colls ? Object.values(netMatch.colls) : [])].reduce((a,m)=>a+m.size,0) : Object.values(netMatch.last||{}).reduce((a,m)=>a+(m.size||0),0)) : 0;
  const rows = [
    ["Build", "LA HORDA — B1 COOPERATIVE PLAYTEST · "+NET_CONFIG.build],
    ["Servidor", netServerUrl() || "(no configurado)"],
    ["Conexión", net.status + (net.ping ? " · ping "+net.ping+" ms" : "")],
    ["Sala", net.code || "—"],
    ["Rol / lugar", (net.role||"solo") + (net.slot>=0 ? " · slot "+(net.slot+1) : "")],
    ["Humanos / bots", humans + " / " + (4-humans)],
    ["Arena", (ARENA_MODS[currentArena]||{}).label || currentArena],
    ["Nivel", (typeof runLevel==="number" ? runLevel : "—") + (state ? " · "+state : "")],
    ["Entidades sync", netMatch ? synced + (netMatch.lastSnapBytes ? " · snapshot "+Math.round(netMatch.lastSnapBytes/1024)+" KB" : "") : "—"],
    ["Reintentos", net.reconnectAttempts],
    ["Errores", net.errors.length ? net.errors.slice(-3).join(" | ") : "—"]
  ];
  p.innerHTML = `<div class="nd-head"><b>B1 · red</b><button id="nd-close">✕</button></div>` +
    rows.map(r=>`<div class="nd-row"><span>${r[0]}</span><span>${String(r[1]).replace(/</g,"&lt;")}</span></div>`).join("") +
    `<div class="nd-log">${net.logs.slice(-14).map(l=>`<div>${l.replace(/</g,"&lt;")}</div>`).join("")}</div>`;
  const c = document.getElementById("nd-close"); if(c) c.onclick = ()=> netDebugToggle(false);
}
(function(){
  const b = document.getElementById("net-debug-btn");
  if(b) b.addEventListener("click", ()=> netDebugToggle());
  try{ if(new URLSearchParams(location.search).get("debug")==="1") setTimeout(()=>netDebugToggle(true), 300); }catch(e){}
  setInterval(()=>{ if(_netDbgOpen) netDebugRefresh(); }, 1000);
})();
