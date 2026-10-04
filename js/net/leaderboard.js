"use strict";
/* ============================================================
   js/net/leaderboard.js
   RANKING SEMANAL DE LA HORDA INFINITA (servidor: server/accounts.js, /api/leaderboard).
   - Tabla global de la semana (la misma semana ISO en UTC de los mutadores): top 50, el mejor de cada
     cuenta, con filtro por guardián y la semana pasada. Cualquiera la ve (también un invitado).
   - Al terminar una partida de la Horda Infinita (endlessEndRun -> lbAfterRun): con cuenta, se manda el
     puntaje y los resultados dicen "Puesto #N esta semana"; sin cuenta, el récord queda local (como
     siempre, en save.endless) con el aviso "Creá una cuenta para entrar al ranking". Sin conexión, queda
     pendiente (el mejor) y se reintenta al volver al menú o al abrir el ranking.
   - Recompensa de fin de semana, SOLO COSMÉTICA (títulos y marcos del perfil, js/data/quests.js): al
     abrir el juego con cuenta, se mira tu puesto de la semana que cerró y se entrega una vez
     (save.endless.lbClaimed[semana]). Nada de esto da poder.
   Pantalla: lbOpen({guardian}) desde la tarjeta de la Horda Infinita del hub, la Sala en modo infinito
   y los resultados. Estado para pruebas: window.__lb.
   ============================================================ */
const LB_REWARDS = [
  {max:1,  title:"lb_campeon", frame:"cicatriz", label:"Puesto #1"},
  {max:10, title:"lb_elite",   frame:"cicatriz", label:"Top 10"},
  {max:50, title:"lb_contenedor",               label:"Top 50"}
];
const LB = { data:null, week:"", guardian:"", loading:false, err:"", el:null, claimTried:false };
window.__lb = LB;

function _lbEsc(s){ return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c])); }
function _lbFmt(n){ return Math.round(n||0).toLocaleString("es-AR"); }
function _lbTime(ms){ const s = Math.floor((ms||0)/1000); return Math.floor(s/60) + ":" + String(s%60).padStart(2, "0"); }
function _lbLogged(){ try{ return typeof accountState==="function" && accountState().logged; }catch(e){ return false; } }
function _lbCan(){ return typeof accountAvailable==="function" && accountAvailable() && typeof accountFetch==="function"; }
function lbWeekNow(){ return typeof endlessWeekKey==="function" ? endlessWeekKey(new Date()) : ""; }
function lbWeekPrev(){ return typeof endlessWeekKey==="function" ? endlessWeekKey(new Date(Date.now() - 7*86400000)) : ""; }
function _lbWeekNum(k){ return String(k||"").split("-W")[1] || ""; }
function _lbStore(){
  const S = typeof endlessSave==="function" ? endlessSave() : (save.endless = save.endless || {});
  if(!S.lbClaimed || typeof S.lbClaimed!=="object") S.lbClaimed = {};
  return S;
}
function _lbClassName(k){ return (typeof CLASSES!=="undefined" && CLASSES[k] && CLASSES[k].name) || k; }
function _lbClassIco(k){ return (typeof CLASSES!=="undefined" && CLASSES[k] && CLASSES[k].icon) || "⚔"; }
function _lbLeft(ms){
  if(!(ms > 0)) return "";
  const h = Math.floor(ms/3600000), d = Math.floor(h/24);
  return d >= 1 ? `${d} d ${h%24} h` : h >= 1 ? `${h} h ${Math.floor(ms/60000)%60} min` : `${Math.max(1, Math.floor(ms/60000))} min`;
}

/* ---------------- envío al terminar una partida ---------------- */
async function _lbSubmit(entry){
  if(typeof championCompetitive==="function" && entry && entry.guardian && !championCompetitive(entry.guardian)) return { status: 403, j: { error: "NOT_COMPETITIVE", msg: "Ese campeón no participa del ranking." } };
  const r = await accountFetch("POST", "/api/leaderboard/submit", entry, { timeout: 20000 });
  return r;
}
// Lo llama endlessEndRun (una vez por partida). L = EN.local (lo de ESTE jugador).
function lbAfterRun(L){
  if(!L || L.lb) return;
  const entry = { score: Math.max(0, Math.round(EN.score||0)), round: EN.round|0, guardian: L.cls || selectedClass,
    week: EN.week || lbWeekNow(), durationMs: Math.max(0, Math.round(L.timeMs||0)) };
  L.lb = { st: "guest", entry };
  if(!_lbLogged()){ _lbRenderRunLine(); return; }
  if(!_lbCan() || entry.score <= 0){ L.lb.st = entry.score <= 0 ? "zero" : "offline"; _lbRenderRunLine(); return; }
  L.lb.st = "sending"; _lbRenderRunLine();
  _lbSubmit(entry).then(r => {
    if(r.status === 200 && r.j.ok){ L.lb = Object.assign(L.lb, { st:"ok", rank:r.j.rank, total:r.j.total, improved:r.j.improved, gRank:r.j.guardianRank, gTotal:r.j.guardianTotal }); _lbClearPending(entry); }
    else if(r.status === 401){ L.lb.st = "noauth"; }
    else if(r.status === 404){ L.lb.st = "unsupported"; _lbKeepPending(entry); } // servidor viejo: se manda cuando lo actualicen
    else { L.lb.st = "rejected"; L.lb.msg = (r.j && r.j.msg) || "El servidor no aceptó el puntaje."; }
    _lbRenderRunLine();
  }).catch((e) => { L.lb.st = e && e.code === "NO_API" ? "unsupported" : "offline"; _lbKeepPending(entry); _lbRenderRunLine(); });
}
// Sin conexión: queda pendiente el mejor de la semana (se manda al volver al menú o al abrir el ranking).
function _lbKeepPending(entry){
  const S = _lbStore(), p = S.lbPending;
  if(!p || p.week !== entry.week || entry.score > p.score){
    let user = ""; try{ user = accountState().user || ""; }catch(e){}
    S.lbPending = Object.assign({ user }, entry);
    try{ persist(); }catch(e){}
  }
}
function _lbClearPending(entry){
  const S = _lbStore();
  if(S.lbPending && (!entry || (S.lbPending.week === entry.week && S.lbPending.score <= entry.score))){ delete S.lbPending; try{ persist(); }catch(e){} }
}
async function lbFlushPending(){
  const S = _lbStore(), p = S.lbPending;
  if(!p || LB.flushing || !_lbLogged() || !_lbCan()) return false;
  let user = ""; try{ user = accountState().user || ""; }catch(e){}
  // de otra cuenta o de una semana que ya cerró: se descarta (el récord local sigue en save.endless)
  if((p.user && p.user.toLowerCase() !== user.toLowerCase()) || (p.week !== lbWeekNow() && p.week !== lbWeekPrev())){ _lbClearPending(); return false; }
  LB.flushing = true;
  try{
    const r = await _lbSubmit({ score:p.score, round:p.round, guardian:p.guardian, week:p.week, durationMs:p.durationMs });
    if(r.status !== 429 && r.status !== 404) _lbClearPending(); // 404: servidor viejo, se manda cuando lo actualicen // aceptado, rechazado o semana cerrada: no se reintenta más
    return r.status === 200;
  }catch(e){ return false; }
  finally{ LB.flushing = false; }
}
// Línea de los resultados: "Puesto #N esta semana" o el aviso para invitados.
function _lbRenderRunLine(){
  const box = document.getElementById("en-lb-line"); if(!box) return;
  const L = EN.local || {}, s = L.lb || { st: "guest" };
  const btn = `<button class="btn secondary small lb-open-btn" id="en-lb-open" type="button">🏆 Ver ranking</button>`;
  let html = "";
  if(s.st === "ok") html = `<span class="lb-rank-big">Puesto <b>#${s.rank}</b> esta semana</span><span class="lb-rank-sub">de ${_lbFmt(s.total)}${s.gRank ? ` · #${s.gRank} con ${_lbEsc(_lbClassName(s.entry.guardian))}` : ""}${s.improved ? "" : " · tu mejor marca sigue siendo otra"}</span>`;
  else if(s.st === "sending") html = `<span class="lb-rank-sub">Enviando tu puntaje al ranking…</span>`;
  else if(s.st === "offline") html = `<span class="lb-rank-sub">Sin conexión: tu puntaje se manda al ranking cuando vuelva la red.</span>`;
  else if(s.st === "rejected") html = `<span class="lb-rank-sub lb-warn">${_lbEsc(s.msg)}</span>`;
  else if(s.st === "unsupported") html = `<span class="lb-rank-sub">${LB_NOT_ON_SERVER} Tu récord queda en este dispositivo.</span>`;
  else if(s.st === "zero") html = `<span class="lb-rank-sub">Sin puntaje esta vez: no entra al ranking.</span>`;
  else html = `<span class="lb-rank-sub">Tu récord queda en este dispositivo.</span><button class="btn small lb-acc-btn" id="en-lb-acc" type="button">Creá una cuenta para entrar al ranking</button>`;
  box.innerHTML = html + btn;
  box.classList.remove("hidden");
  const o = document.getElementById("en-lb-open"); if(o) o.addEventListener("click", () => lbOpen({ guardian: "" }));
  const a = document.getElementById("en-lb-acc"); if(a) a.addEventListener("click", () => { if(typeof window.accountOpen==="function") window.accountOpen(); });
}

/* ---------------- recompensa de fin de semana (solo cosmética) ---------------- */
function lbRewardFor(rank){ if(!(rank > 0)) return null; return LB_REWARDS.find(r => rank <= r.max) || null; }
function lbGrantWeekly(week, rank){
  const S = _lbStore();
  if(S.lbClaimed[week] !== undefined) return null;
  S.lbClaimed[week] = rank|0;
  const R = lbRewardFor(rank);
  if(R && typeof questsGrant==="function"){
    questsGrant({ title: R.title, frame: R.frame }, true);
    const names = [R.title && QUEST_TITLES[R.title] ? `título «${QUEST_TITLES[R.title].name}»` : "", R.frame && QUEST_FRAMES[R.frame] ? `marco ${QUEST_FRAMES[R.frame].name}` : ""].filter(Boolean).join(" y ");
    if(typeof questsToast==="function") questsToast({ kind:"pass", icon:"crown", tint:"#d9a8ff", head:`RANKING · SEMANA ${_lbWeekNum(week)} · PUESTO #${rank}`, name:`¡Ganaste el ${names}! (DESAFÍOS → Perfil)` });
    else if(typeof showNetToast==="function") showNetToast(`Ranking semana ${_lbWeekNum(week)}: puesto #${rank}. ¡Ganaste el ${names}!`);
  }
  try{ persist(); }catch(e){}
  return R;
}
// Con cuenta y red: una vez por sesión, se mira tu puesto de la semana que cerró.
async function lbCheckWeeklyReward(){
  if(LB.claimTried || !_lbLogged() || !_lbCan()) return null;
  const week = lbWeekPrev(), S = _lbStore();
  if(!week || S.lbClaimed[week] !== undefined){ LB.claimTried = true; return null; }
  LB.claimTried = true;
  try{
    const r = await accountFetch("GET", "/api/leaderboard?limit=1&week=" + encodeURIComponent(week), undefined, { timeout: 20000 });
    if(r.status !== 200 || !r.j || !r.j.me) { LB.claimTried = false; return null; }
    return lbGrantWeekly(week, r.j.me.rank|0) || { none: true };
  }catch(e){ LB.claimTried = false; return null; }
}

/* ---------------- pantalla del ranking ---------------- */
function _lbEl(){
  if(LB.el && document.body.contains(LB.el)) return LB.el;
  const el = document.createElement("div");
  el.id = "lb-screen"; el.className = "ui-modal hidden"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", "Ranking de la Horda Infinita");
  el.innerHTML = `<div class="ui-modal-back" data-lb-close></div><div class="ui-panel ui-modal-panel lb-panel"></div>`;
  document.body.appendChild(el);
  el.querySelector("[data-lb-close]").addEventListener("click", lbClose);
  LB.el = el;
  return el;
}
function lbClose(){ if(LB.el) LB.el.classList.add("hidden"); }
function lbOpen(opts){
  opts = opts || {};
  const el = _lbEl();
  LB.week = opts.week || lbWeekNow();
  LB.guardian = opts.guardian !== undefined ? opts.guardian : LB.guardian || "";
  el.classList.remove("hidden");
  _lbRender();
  lbFlushPending().finally(() => { lbLoad(); lbCheckWeeklyReward(); });
  if(typeof playSfx==="function") playSfx("ready");
}
// Servidor viejo (sin /api/leaderboard): antes la tabla decía "No existe." (el 404 crudo del servidor).
const LB_NOT_ON_SERVER = "El ranking todavía no está disponible en el servidor.";
async function lbLoad(){
  LB.loading = true; LB.err = ""; LB.loadT0 = performance.now(); _lbRender();
  // plan gratis: el servidor dormido tarda ~1 minuto en contestar; mientras tanto se dice por qué
  clearTimeout(LB.loadTick); LB.loadTick = setTimeout(() => { if(LB.loading) _lbRender(); }, 4100); // un solo redibujo (no le saca los botones de abajo del dedo)
  if(!_lbCan()){ LB.loading = false; LB.err = "El ranking necesita conexión con el servidor."; _lbRender(); return; }
  const q = "?week=" + encodeURIComponent(LB.week) + (LB.guardian ? "&guardian=" + encodeURIComponent(LB.guardian) : "");
  const want = q;
  try{
    // con sesión va el token (para "me"); si se venció, se reintenta sin él
    let r = await accountFetch("GET", "/api/leaderboard" + q, undefined, { timeout: 90000, auth: _lbLogged() });
    if(r.status === 401) r = await accountFetch("GET", "/api/leaderboard" + q, undefined, { timeout: 90000, auth: false });
    if(want !== "?week=" + encodeURIComponent(LB.week) + (LB.guardian ? "&guardian=" + encodeURIComponent(LB.guardian) : "")) return; // cambió el filtro mientras tanto
    if(r.status === 200 && r.j && Array.isArray(r.j.entries)){ LB.data = r.j; LB.err = ""; }
    else if(r.status === 404){ LB.data = null; LB.err = LB_NOT_ON_SERVER; }
    else { LB.data = null; LB.err = (r.j && r.j.msg) || "No se pudo cargar el ranking."; }
  }catch(e){ LB.data = null; LB.err = e && e.code === "NO_API" ? LB_NOT_ON_SERVER : e && e.code === "TIMEOUT" ? "El servidor no respondió: probá de nuevo en un minuto." : "Sin conexión con el servidor: probá de nuevo en un rato."; }
  LB.loading = false; _lbRender();
}
function _lbGuardianChips(){
  const keys = typeof CLASSES!=="undefined" ? Object.keys(CLASSES).filter(k=>!CLASSES[k].hidden && championCompetitive(k)) : [];
  const chip = (k, txt) => `<button type="button" class="lb-chip${LB.guardian===k ? " on" : ""}" data-lb-g="${_lbEsc(k)}">${txt}</button>`;
  return chip("", "Todos") + keys.map(k => chip(k, `${_lbClassIco(k)} ${_lbEsc(_lbClassName(k))}`)).join("");
}
function _lbRender(){
  const el = LB.el; if(!el) return;
  const panel = el.querySelector(".lb-panel");
  const cur = lbWeekNow(), prev = lbWeekPrev(), D = LB.data && LB.data.week === LB.week ? LB.data : null;
  const logged = _lbLogged(), S = _lbStore();
  const left = D && LB.week === cur ? _lbLeft(D.endsAt - Date.now()) : "";
  let body;
  if(LB.loading && !D) body = `<div class="lb-empty">${performance.now() - (LB.loadT0||0) > 4000 ? "Despertando el servidor… (la primera vez puede tardar hasta un minuto)" : "Cargando el ranking…"}</div>`;
  else if(LB.err && !D) body = `<div class="lb-empty lb-warn">${_lbEsc(LB.err)}</div>`;
  else if(D && !D.entries.length) body = `<div class="lb-empty">${LB.week === cur ? "Nadie entró todavía esta semana. ¡La tabla es tuya!" : "Nadie entró al ranking esa semana."}</div>`;
  else if(D) body = `<div class="lb-list" role="table">${D.entries.map(e => `<div class="lb-row${e.me ? " me" : ""}${e.rank <= 3 ? " top" + e.rank : ""}" role="row">
      <span class="lb-pos">#${e.rank}</span><span class="lb-name">${_lbEsc(e.name)}</span>
      <span class="lb-g" title="${_lbEsc(_lbClassName(e.guardian))}">${_lbClassIco(e.guardian)}<i>${_lbEsc(_lbClassName(e.guardian))}</i></span>
      <span class="lb-score">${_lbFmt(e.score)}</span><span class="lb-round">R${e.round}</span><span class="lb-time">${_lbTime(e.durationMs)}</span></div>`).join("")}</div>`;
  else body = "";
  let mine = "";
  if(D && D.me && D.me.rank > 0 && !D.entries.some(e=>e.me)) mine = `<div class="lb-row me lb-mine"><span class="lb-pos">#${D.me.rank}</span><span class="lb-name">${_lbEsc(D.me.name)}</span><span class="lb-g">${_lbClassIco(D.me.guardian)}<i>${_lbEsc(_lbClassName(D.me.guardian))}</i></span><span class="lb-score">${_lbFmt(D.me.score)}</span><span class="lb-round">R${D.me.round}</span><span class="lb-time">${_lbTime(D.me.durationMs)}</span></div>`;
  else if(D && logged && D.me && !D.me.rank) mine = `<div class="lb-note">Todavía no entraste ${LB.week === cur ? "esta semana" : "esa semana"}${LB.guardian ? " con " + _lbEsc(_lbClassName(LB.guardian)) : ""}.</div>`;
  const local = (S.week && S.week.key === cur && S.week.score) ? `Tu mejor de esta semana en este dispositivo: <b>${_lbFmt(S.week.score)}</b> (ronda ${S.week.round||0}).` : "";
  const guest = logged ? "" : `<div class="lb-guest"><span>Como invitado ves la tabla, pero tus récords quedan en este dispositivo.${local ? " " + local : ""}</span><button type="button" class="btn small" id="lb-acc-btn">Creá una cuenta para entrar al ranking</button></div>`;
  const rewards = `<div class="lb-rewards">Al cerrar la semana (solo cosmético): <b>Top 50</b> título «${_lbEsc((QUEST_TITLES.lb_contenedor||{}).name||"")}» · <b>Top 10</b> título «${_lbEsc((QUEST_TITLES.lb_elite||{}).name||"")}» y marco ${_lbEsc((QUEST_FRAMES.cicatriz||{}).name||"")} · <b>#1</b> «${_lbEsc((QUEST_TITLES.lb_campeon||{}).name||"")}».</div>`;
  panel.innerHTML = `<div class="lb-head"><div class="ui-panel-title">🏆 Ranking · Horda Infinita</div><button type="button" class="ui-icon-btn lb-x" data-lb-close aria-label="Cerrar">✕</button></div>
    <div class="lb-tabs"><button type="button" class="lb-tab${LB.week===cur ? " on" : ""}" data-lb-w="${cur}">Esta semana (${_lbWeekNum(cur)})</button><button type="button" class="lb-tab${LB.week===prev ? " on" : ""}" data-lb-w="${prev}">Semana pasada</button>${left ? `<span class="lb-left">cierra en ${left}</span>` : ""}</div>
    <div class="lb-chips">${_lbGuardianChips()}</div>
    ${body}${mine}${guest}${rewards}`;
  panel.querySelectorAll("[data-lb-close]").forEach(b => b.addEventListener("click", lbClose));
  panel.querySelectorAll("[data-lb-w]").forEach(b => b.addEventListener("click", () => { if(LB.week === b.dataset.lbW) return; LB.week = b.dataset.lbW; LB.data = null; lbLoad(); }));
  panel.querySelectorAll("[data-lb-g]").forEach(b => b.addEventListener("click", () => { if(LB.guardian === b.dataset.lbG) return; LB.guardian = b.dataset.lbG; LB.data = null; lbLoad(); }));
  const acc = panel.querySelector("#lb-acc-btn"); if(acc) acc.addEventListener("click", () => { lbClose(); if(typeof window.accountOpen==="function") window.accountOpen(); });
}

/* ---------------- enganches ---------------- */
window.lbOpen = lbOpen;
(function lbWire(){
  const b = document.getElementById("hub-endless-rank-btn");
  if(b) b.addEventListener("click", ev => { ev.stopPropagation(); lbOpen({ guardian: "" }); });
  // al volver al menú con cuenta: pendientes y recompensa de la semana que cerró
  const tryBg = () => { if(_lbLogged()){ lbFlushPending(); lbCheckWeeklyReward(); } };
  window.addEventListener("account-change", ev => { if(ev && ev.detail && ev.detail.logged && !ev.detail.syncing) tryBg(); });
  setTimeout(tryBg, 4000);
  document.addEventListener("keydown", ev => { if(ev.key === "Escape" && LB.el && !LB.el.classList.contains("hidden")) lbClose(); });
})();
