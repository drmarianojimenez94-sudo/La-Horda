"use strict";
/* ============================================================
   js/net/quick-play.js — ⚡ JUGAR YA
   Cold-start: un solo jugador tiene que poder empezar una partida de cuatro YA, sin esperar una sala llena.
   Orden (los humanos siempre tienen prioridad sobre los bots):
     1. hay una sala pública con lugar → se une (el anfitrión decide cuándo empieza);
     2. si no, abre una sala pública y espera unos segundos a que llegue gente;
     3. al terminar la espera arranca con lo que haya: los lugares vacíos los ocupan BOTS, siempre rotulados
        "BOT · Clase" (nunca se hacen pasar por personas). Se puede empezar antes o cancelar en cualquier momento.
   Sin servidor online, arranca solo con bots. Reutiliza hubPlay / netCreateRoom / netJoinPublicRoom / el botón Comenzar.
   ============================================================ */
const QUICKPLAY_WAIT_MS = 8000, QUICKPLAY_JOIN_EXTRA_MS = 12000; // cada humano que entra se lleva un margen para elegir guardián y marcar LISTO
const QP = { busy:false, timer:0, endAt:0, prevPub:null, el:null, humans:1 };

// La mejor sala pública a la que unirse: con lugar, con una arena que ya abriste, y del nivel más parecido.
function quickPlayPickRoom(list, myLevel){
  if(!Array.isArray(list)) return null;
  let best = null, bestScore = Infinity;
  for(const r of list){
    if(!r || !r.code || (r.humans|0) >= ((r.max|0) || 4)) continue;
    if(typeof isArenaUnlocked==="function" && !isArenaUnlocked(r.arena)) continue;
    const mid = ((r.lvMin|0) + (r.lvMax|0)) / 2;
    const score = Math.abs(mid - myLevel) - (r.humans|0) * 2; // más gente = más humanos juntos
    if(score < bestScore){ best = r; bestScore = score; }
  }
  return best;
}
function _qpBar(html){
  if(!QP.el){
    const d = document.createElement("div");
    d.id = "qp-bar"; d.className = "qp-bar"; d.setAttribute("role", "status"); d.setAttribute("aria-live", "polite");
    document.body.appendChild(d); QP.el = d;
    d.addEventListener("click", e=>{
      if(e.target.closest("[data-qp-now]")) quickPlayGoNow();
      else if(e.target.closest("[data-qp-cancel]")) quickPlayCancel(true);
    });
  }
  QP.el.innerHTML = html;
}
function _qpClear(){
  clearInterval(QP.timer); QP.timer = 0; QP.endAt = 0;
  if(QP.el){ QP.el.remove(); QP.el = null; }
  if(QP.prevPub!==null){ if(typeof netSetPublicPref==="function") netSetPublicPref(QP.prevPub); QP.prevPub = null; }
}
function quickPlayCancel(leave){
  const was = QP.busy; QP.busy = false; _qpClear();
  if(was && leave && typeof netInRoom==="function" && netInRoom() && net.role==="host"){ try{ netLeaveRoom(); }catch(e){} if(typeof renderPrepSummary==="function") renderPrepSummary(); }
}
function quickPlayGoNow(){
  const alone = typeof netHumanCount==="function" ? netHumanCount() <= 1 : true;
  _qpClear(); QP.busy = false;
  if(typeof state==="undefined" || state!=="prep") return;
  const btn = document.getElementById("prep-start-btn"); if(btn && !btn.disabled) btn.click();
  if(alone && typeof showNetToast==="function") showNetToast("Tus compañeros son BOTs. Si entra alguien, se suma en la próxima partida.");
}
function _qpTick(){
  if(!QP.busy) return;
  if(typeof state==="undefined" || state!=="prep" || (typeof netInRoom==="function" && !netInRoom())){ quickPlayCancel(false); return; }
  const humans = netHumanCount();
  if(humans > QP.humans) QP.endAt = Math.max(QP.endAt, performance.now() + QUICKPLAY_JOIN_EXTRA_MS);
  QP.humans = humans;
  const left = Math.max(0, Math.ceil((QP.endAt - performance.now()) / 1000));
  _qpBar(`<span class="qp-txt">⚡ ${humans>1 ? humans + " jugadores en la sala" : "Buscando compañeros"}… empieza en <b>${left}</b> s${humans<4 ? " · los lugares vacíos los ocupan <b>BOTs</b>" : ""}</span>
    <button class="btn small" data-qp-now>Empezar ya</button><button class="btn small secondary" data-qp-cancel>Cancelar</button>`);
  // todos los humanos listos (o 4 humanos): no hace falta esperar más
  if(humans >= 4 || left <= 0 || (humans > 1 && typeof netNotReady=="function" && netNotReady().length===0)) quickPlayGoNow();
}
async function quickPlayStart(){
  if(QP.busy) return;
  if(typeof netInRoom==="function" && netInRoom()){ hubPlay(); return; }
  QP.busy = true;
  hubPlay(); // guardián de regalo si falta, arena siguiente, bots de la sala en solitario
  if(typeof state==="undefined" || state!=="prep"){ QP.busy = false; return; } // se fue a elegir su guardián de regalo
  if(typeof netAvailable!=="function" || !netAvailable()){ QP.busy = false; quickPlayGoNow(); return; }
  _qpBar(`<span class="qp-txt">⚡ Buscando una sala…</span><button class="btn small secondary" data-qp-cancel>Cancelar</button>`);
  let list = null;
  try{ list = await netFetchRooms(); }catch(e){ list = null; }
  if(!QP.busy) return; // canceló mientras buscaba
  const lvl = (save.champions[selectedClass] || {}).level || 1;
  const room = quickPlayPickRoom(list, lvl);
  if(room){
    _qpClear(); QP.busy = false;
    const ok = await netJoinPublicRoom(room.code, null);
    if(ok!==false && typeof netInRoom==="function" && netInRoom()) return;
    QP.busy = true; // la sala se llenó/empezó justo: crea la propia
  }
  QP.prevPub = typeof netPublicPref==="function" ? netPublicPref() : false; if(typeof netSetPublicPref==="function") netSetPublicPref(true);
  try{
    await netCreateRoom(currentArena, selectedClass, lvl, null);
  }catch(e){
    if(!(e && e.handled) && typeof showNetToast==="function") showNetToast("No se pudo abrir la sala: jugás con bots.");
    try{ netLeaveRoom(); }catch(x){}
    QP.busy = false; _qpClear(); if(typeof renderPrepSummary==="function") renderPrepSummary(); quickPlayGoNow(); return;
  }
  if(!QP.busy){ try{ netLeaveRoom(); }catch(e){} return; }
  if(typeof netRenderLobbyBar==="function") netRenderLobbyBar();
  QP.endAt = performance.now() + QUICKPLAY_WAIT_MS; QP.humans = 1;
  clearInterval(QP.timer); QP.timer = setInterval(_qpTick, 250); _qpTick();
}
(function(){
  for(const id of ["mode-quickplay-btn", "hub-quickplay-btn"]){
    const b = document.getElementById(id); if(b) b.addEventListener("click", ()=>{ quickPlayStart(); });
  }
})();
