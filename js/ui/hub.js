"use strict";
/* ============================================================
   js/ui/hub.js
   MENÚ PRINCIPAL tipo "hub": lo frecuente a un toque y nada escondido.
   - JUGAR (grande): continúa la campaña. Va directo a la Sala con la PRÓXIMA arena (la frontera de
     la campaña; si ya la completaste toda, la última que jugaste) y tu guardián, con los bots de
     siempre. Desde la Sala se cambia la arena, el guardián o se abre una sala online.
   - GUARDIANES: colección + equipo + talentos + maestría + skins de cada guardián en un solo lugar
     (la ficha del Códice abierta en la pestaña Equipo del guardián que estás usando).
   - HORDA INFINITA (modo supervivencia) debajo de JUGAR, junto al Modo Campaña: aparece cuando existe
     window.endlessOpen (con candado mientras no esté desbloqueado).
   - TIENDA (vitrina con ofertas del día), MULTIJUGADOR (unirse con código / crear sala / Modo Campaña
     por arena / Horda Infinita), CÓDICE y DESAFÍOS (aparece cuando existe window.questsOpen).
   - Arriba, el chip de PERFIL (nombre, nivel de cuenta y oro): abre window.accountOpen() si existe
     (cuentas); si no, las Opciones. Se redibuja con el evento "account-change".
   - OPCIONES: nombre, volumen y código de guardado (antes solo estaban en la selección de guardián).
   ============================================================ */
let prepReturnTo = null; // "mainmenu" si a la Sala se entró con JUGAR (su "‹ Menú" vuelve al hub)

// La arena que continúa la campaña: la frontera; con la campaña completa, la que se venía jugando.
function hubNextArena(){
  const f = campaignFrontier();
  if(f) return f;
  if(ARENA_ORDER.includes(currentArena)) return currentArena;
  return ARENA_ORDER[ARENA_ORDER.length-1];
}
function _hubAccount(){
  try{ return typeof window.accountState==="function" ? (window.accountState() || null) : null; }catch(e){ return null; }
}
function renderHub(){
  if(typeof ensureOwnedSelection==="function") ensureOwnedSelection();
  const k = selectedClass, cls = CLASSES[k] || {}, ch = save.champions[k] || {};
  const acc = _hubAccount();
  // perfil: nombre y nivel de la cuenta si hay cuenta; si no, el nombre de la sala y el avance de la campaña
  const name = (acc && (acc.name || acc.displayName || acc.username)) || (typeof netPlayerName==="function" ? netPlayerName() : "Jugador");
  const cleared = ARENA_ORDER.filter(a=>(save.arenasCleared||{})[a]).length;
  const lvl = acc && (acc.level || acc.accountLevel);
  const set = (id, v)=>{ const el = document.getElementById(id); if(el) el.textContent = v; };
  set("hub-profile-name", name);
  set("hub-profile-lvl", lvl ? `Nv. de cuenta ${lvl}` : `Campaña ${cleared}/${ARENA_ORDER.length}`);
  set("hub-gold", "🪙 " + fmtGold(save.gold||0));
  // JUGAR: próxima arena + guardián
  const next = hubNextArena(), A = ARENA_MODS[next] || {}, num = campaignNumberLabel(next);
  const done = !campaignFrontier();
  set("hub-play-kicker", done ? "MODO CAMPAÑA ✔" : "MODO CAMPAÑA");
  set("hub-play-arena", `${A.icon||"⚔"} ${num ? num + " · " : ""}${A.label||next}`);
  set("hub-play-champ", cls.name ? `con ${cls.name} · Nv. ${ch.level||1}` : "");
  document.querySelectorAll("#mainmenu-screen canvas.champ-anim").forEach(c=>{ c.dataset.classKey = k; });
  // insignias: puntos de talento sin gastar, ofertas nuevas del día, desafíos
  const pts = ch.talentPoints || 0, bg = document.getElementById("hub-badge-guard");
  if(bg){ bg.textContent = pts ? `+${pts} PTS` : ""; bg.classList.toggle("hidden", !pts); }
  const bs = document.getElementById("hub-badge-shop");
  if(bs) bs.classList.toggle("hidden", typeof shopDayKey!=="function" || save.shopDealsSeen === shopDayKey());
  renderEndlessCards();
  const q = document.getElementById("mainmenu-quests-btn");
  if(q) q.classList.toggle("hidden", typeof window.questsOpen!=="function");
  const grid = document.getElementById("hub-grid");
  if(grid) grid.classList.toggle("hub-grid-6", !!q && !q.classList.contains("hidden"));
  startChampAnimLoop();
}
function hubPlay(){
  if(typeof needsStarterChampion==="function" && needsStarterChampion()){ openStarterSelect(()=>{ setState("mainmenu"); renderMainMenu(); }); return; }
  if(!ensureOwnedSelection()) return;
  if(typeof netInRoom==="function" && netInRoom()){ setState("prep"); renderPrepSummary(); return; }
  currentArena = hubNextArena();
  if(save.justUnlockedArena===currentArena){ save.justUnlockedArena = null; persist(); }
  updateMenuBrandSub();
  lobbyAllies = pickLobbyAllies(selectedClass);
  prepReturnTo = "mainmenu";
  setState("prep"); renderPrepSummary();
  if(typeof playSfx==="function") playSfx("ready");
}
// GUARDIANES: el guardián que estás usando, en la pestaña Equipo (la colección queda a un toque: "‹ Atrás").
function openGuardians(tab){
  if(typeof codexReturnTo!=="undefined") codexReturnTo = null;
  ensureOwnedSelection();
  codexStack = [{view:"list", id:"campeones", label:"GUARDIANES"}];
  codexChampTab = tab || "equipo";
  const k = selectedClass;
  if(save.champions[k] && save.champions[k].unlocked) codexStack.push({view:"champ", id:k, label:(CLASSES[k]||{}).name || k});
  setState("codex"); codexRender(true);
  if(typeof playSfx==="function") playSfx("ready");
}

/* ---------------- HORDA INFINITA (modo supervivencia, otro módulo) ----------------
   Contrato: window.endlessOpen() abre el modo. Opcionales: window.endlessUnlocked() -> bool, o
   window.endlessState() -> {unlocked, lockText}; window.endlessLockText() -> "cómo se desbloquea".
   Sin endlessOpen las tarjetas no se muestran; bloqueado, se ven con candado y dicen cómo se abre. */
function endlessInfo(){
  if(typeof window.endlessOpen!=="function") return null;
  let unlocked = true, hint = "";
  try{
    if(typeof window.endlessUnlocked==="function") unlocked = !!window.endlessUnlocked();
    else if(typeof window.endlessState==="function"){ const st = window.endlessState() || {}; if("unlocked" in st) unlocked = !!st.unlocked; hint = st.lockText || st.hint || ""; }
    if(!hint && typeof window.endlessLockText==="function") hint = window.endlessLockText() || "";
  }catch(e){}
  return {unlocked, hint: hint || "Se desbloquea avanzando en el Modo Campaña."};
}
function renderEndlessCards(){
  const info = endlessInfo();
  for(const [btn, lock, txt, open] of [["hub-endless-btn","hub-endless-lock","hub-endless-sub","Supervivencia sin fin"],["mode-endless-btn","mode-endless-lock","mode-endless-desc","Supervivencia: oleadas sin fin, cada vez más duras. ¿Hasta dónde llegás?"]]){
    const b = document.getElementById(btn); if(!b) continue;
    b.classList.toggle("hidden", !info);
    if(!info) continue;
    b.classList.toggle("locked", !info.unlocked);
    const l = document.getElementById(lock); if(l) l.classList.toggle("hidden", info.unlocked);
    const t = document.getElementById(txt); if(t) t.textContent = info.unlocked ? open : info.hint;
  }
}
function openEndless(){
  const info = endlessInfo(); if(!info) return;
  if(!info.unlocked){ if(typeof showNetToast==="function") showNetToast("🔒 Horda Infinita: " + info.hint); return; }
  try{ window.endlessOpen(); }catch(e){ console.error("Horda Infinita:", e); }
}
document.getElementById("hub-endless-btn").addEventListener("click", openEndless);
document.getElementById("mode-endless-btn").addEventListener("click", openEndless);
document.getElementById("mainmenu-jugar-btn").addEventListener("click", ()=> setTimeout(renderEndlessCards, 0));

document.getElementById("hub-play-btn").addEventListener("click", hubPlay);
document.getElementById("mainmenu-guardianes-btn").addEventListener("click", ()=> openGuardians());
// DESAFÍOS: el botón lleva [data-quests-open]; el sistema de desafíos (quests-ui.js) atiende ese toque
// (delegado en document) y le pone el contador en .qs-badge. Acá no se engancha otro click.
document.getElementById("hub-profile-btn").addEventListener("click", ()=>{
  if(typeof window.accountOpen==="function") window.accountOpen(); else openHubOptions();
});
document.getElementById("hub-options-btn").addEventListener("click", openHubOptions);
// cuentas: el chip se redibuja cuando cambia la sesión o el perfil
for(const t of [window, document]) t.addEventListener("account-change", ()=>{ if(state==="mainmenu") renderHub(); });

/* ---------------- MULTIJUGADOR: crear sala en la próxima arena ---------------- */
document.getElementById("mode-create-btn").addEventListener("click", ()=>{
  hubPlay();
  prepReturnTo = null; // desde la Sala online, "volver" es a elegir guardián, como siempre
  const c = document.getElementById("net-create-btn");
  if(c && !c.disabled) c.click();
  else if(typeof showNetToast==="function") showNetToast("El modo online no está disponible en esta versión: jugás con 3 bots.");
});

/* ---------------- OPCIONES ---------------- */
function openHubOptions(){
  const box = document.getElementById("hub-options"); if(!box) return;
  const nm = document.getElementById("opt-name");
  if(nm) nm.value = typeof netPlayerName==="function" && netPlayerName()!=="Jugador" ? netPlayerName() : "";
  for(const [id, kind] of [["opt-vol-music","music"],["opt-vol-sfx","sfx"]]){
    const el = document.getElementById(id); if(el) el.value = Math.round((typeof audioVol!=="undefined" ? audioVol[kind] : 1)*100);
  }
  box.classList.remove("hidden");
}
function closeHubOptions(){
  const box = document.getElementById("hub-options"); if(!box || box.classList.contains("hidden")) return;
  const nm = document.getElementById("opt-name");
  if(nm && typeof netSetPlayerName==="function" && nm.value.trim()) netSetPlayerName(nm.value);
  box.classList.add("hidden");
  if(state==="mainmenu") renderHub();
}
(function(){
  const box = document.getElementById("hub-options"); if(!box) return;
  box.querySelectorAll("[data-opt-close]").forEach(b=> b.addEventListener("click", closeHubOptions));
  for(const [id, kind, pauseId] of [["opt-vol-music","music","vol-music"],["opt-vol-sfx","sfx","vol-sfx"]]){
    const el = document.getElementById(id); if(!el) continue;
    el.addEventListener("input", ()=>{
      if(typeof setAudioVolume==="function") setAudioVolume(kind, el.value/100);
      if(kind==="sfx" && typeof playSfx==="function") playSfx("ready");
      const p = document.getElementById(pauseId); if(p) p.value = el.value; // la pausa muestra lo mismo
    });
  }
  // el código de guardado usa los mismos botones de siempre (js/storage/save-code.js)
  document.getElementById("opt-export-btn").addEventListener("click", ()=>{ const b = document.getElementById("export-save-btn"); if(b) b.click(); });
  document.getElementById("opt-import-btn").addEventListener("click", ()=>{ const b = document.getElementById("import-save-btn"); if(b) b.click(); });
})();
