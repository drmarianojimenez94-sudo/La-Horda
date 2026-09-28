"use strict";
/* ============================================================
   js/ui/quests-ui.js
   Pantalla DESAFÍOS (window.questsOpen()): desafíos diarios/semanales, logros, Pase de Temporada y
   perfil de la cuenta. También los avisos emergentes (cola, sin tapar el combate: arriba al centro,
   chicos, sin tocar; durante la pelea con un jefe esperan), el resumen de la partida en las
   pantallas de fin, el cofre de desafío y un acceso mínimo desde el menú principal (si el menú no
   trae ya su propio botón con [data-quests-open]).
   Los íconos son pixel art de 12×12 (QUEST_GLYPHS) pintados en canvas sobre una medalla del color
   de la categoría; el retrato del perfil usa el arte real del guardián (canvas.champ-anim).
   ============================================================ */

/* ---------------- íconos ---------------- */
const _qIconCache = {};
function _qShade(hex, f){
  const n = parseInt(hex.slice(1), 16); let r = n>>16, g = (n>>8)&255, b = n&255;
  const m = f >= 0 ? (c=>Math.round(c + (255-c)*f)) : (c=>Math.round(c*(1+f)));
  r = m(r); g = m(g); b = m(b);
  return "#" + ((1<<24) | (r<<16) | (g<<8) | b).toString(16).slice(1);
}
function _qGray(hex){ const n = parseInt(hex.slice(1), 16); const v = Math.round(((n>>16)*0.3 + ((n>>8)&255)*0.55 + (n&255)*0.15)*0.55 + 20); return "#" + ((1<<24)|(v<<16)|(v<<8)|v).toString(16).slice(1); }
function questsIconURL(glyph, tint, locked){
  const key = glyph + "|" + tint + "|" + (locked?1:0);
  if(_qIconCache[key]) return _qIconCache[key];
  const G = QUEST_GLYPHS[glyph] || QUEST_GLYPHS.star;
  const pal = {a:tint, b:_qShade(tint, -0.45), c:_qShade(tint, 0.45), k:"#0b0705", w:"#f2e3d3", y:"#ffcf5c", r:"#e0503a", g:"#8a8f96", s:"#d8dde2"};
  if(locked) for(const k in pal) pal[k] = _qGray(pal[k]);
  const cv = document.createElement("canvas"); cv.width = cv.height = 16;
  const g = cv.getContext("2d");
  // medalla: borde del color, fondo oscuro, esquinas recortadas (pixel)
  const ring = locked ? "#3a3430" : _qShade(tint, -0.35);
  g.fillStyle = ring; g.fillRect(1,0,14,16); g.fillRect(0,1,16,14);
  g.fillStyle = "#140c08"; g.fillRect(1,1,14,14);
  g.fillStyle = locked ? "#1c1714" : _qShade(tint, -0.78); g.fillRect(1,1,14,1); g.fillRect(1,1,1,14);
  for(let y=0;y<12;y++) for(let x=0;x<12;x++){
    const ch = (G[y]||"")[x];
    if(!ch || ch === ".") continue;
    g.fillStyle = pal[ch] || pal.a; g.fillRect(2+x, 2+y, 1, 1);
  }
  return (_qIconCache[key] = cv.toDataURL());
}
const _qCatColor = id => (QUEST_CATS.find(c=>c.id===id)||{color:"#ffcf5c"}).color;
function _qIco(glyph, tint, locked, cls){ return `<img class="qs-ico ${cls||""}" alt="" src="${questsIconURL(glyph, tint, locked)}">`; }
const _qEsc = s => String(s==null ? "" : s).replace(/[&<>"]/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
function _qFmtMs(ms){
  const m = Math.floor(ms/60000), h = Math.floor(m/60), d = Math.floor(h/24);
  if(d >= 1) return `${d} d ${h%24} h`;
  if(h >= 1) return `${h} h ${m%60} min`;
  return `${Math.max(1, m)} min`;
}

/* ---------------- avisos emergentes (cola) ---------------- */
const _qToasts = [];
let _qToastBusy = false;
function questsToast(t){
  if(_qToasts.length >= 10){ const last = _qToasts[_qToasts.length-1]; last.more = (last.more||0) + 1; return; }
  _qToasts.push(t);
  _qPumpToasts();
}
function _qToastHost(){
  let h = document.getElementById("qs-toasts");
  if(!h){ h = document.createElement("div"); h.id = "qs-toasts"; h.setAttribute("aria-live", "polite"); (document.getElementById("stage") || document.body).appendChild(h); }
  return h;
}
function _qPumpToasts(){
  if(_qToastBusy || !_qToasts.length) return;
  // en la pelea con un jefe no se distrae: el aviso espera a que termine
  if(typeof state !== "undefined" && state === "playing" && typeof bossActive !== "undefined" && bossActive){ setTimeout(_qPumpToasts, 700); return; }
  const t = _qToasts.shift(); _qToastBusy = true;
  const host = _qToastHost();
  host.classList.toggle("menu", !(typeof state !== "undefined" && state === "playing"));
  const el = document.createElement("div");
  el.className = "qs-toast qs-toast-" + (t.kind||"ach");
  const tint = t.tint || (t.cat ? _qCatColor(t.cat) : "#ffcf5c");
  el.style.setProperty("--qc", tint);
  el.innerHTML = `${_qIco(t.icon||"star", tint, false, "qs-toast-ico")}<div class="qs-toast-txt"><div class="qs-toast-head">${_qEsc(t.head||"")}</div><div class="qs-toast-name">${_qEsc(t.name||"")}</div>${t.sub ? `<div class="qs-toast-sub">${_qEsc(t.sub)}</div>` : ""}${t.more ? `<div class="qs-toast-sub">y ${t.more} más en DESAFÍOS</div>` : ""}</div>`;
  host.appendChild(el);
  if(typeof playSfx === "function"){ try{ playSfx(t.kind === "ach" ? "ready" : "heal"); }catch(e){} }
  requestAnimationFrame(()=>el.classList.add("show"));
  const playing = typeof state !== "undefined" && state === "playing";
  setTimeout(()=>{ el.classList.remove("show"); el.classList.add("out"); setTimeout(()=>{ el.remove(); _qToastBusy = false; _qPumpToasts(); }, 320); }, playing ? 2600 : 3200);
}

/* ---------------- resumen en las pantallas de fin ---------------- */
function questsShowRunSummary(sum){
  if(!sum || (state !== "victory" && state !== "gameover")) return;
  const scr = document.getElementById(state === "victory" ? "victory-screen" : "gameover-screen");
  if(!scr) return;
  let el = scr.querySelector(".qs-run-sum");
  if(!el){ el = document.createElement("div"); el.className = "qs-run-sum"; scr.appendChild(el); }
  const done = [];
  if(sum.chal > 0) done.push(`${sum.chal} desafío${sum.chal>1?"s":""} ✔`);
  if(sum.ach > 0) done.push(`${sum.ach} logro${sum.ach>1?"s":""} ✔`);
  el.innerHTML = `<b>🏆 DESAFÍOS</b><span>+${sum.xp} XP de cuenta</span><span>Pase Nv. ${sum.pass.level}${sum.passUp > 0 ? " ▲" : ""}</span>${done.length ? `<span>${done.join(" · ")}</span>` : ""}`;
}
// Al salir de la pantalla de fin, el resumen se va (la próxima partida arma el suyo).
function _qClearRunSummary(){ document.querySelectorAll(".qs-run-sum").forEach(e=>e.remove()); }

/* ---------------- pantalla ---------------- */
let questsTab = "desafios", questsCat = "todos", _qReturn = "mainmenu";
function _qScreen(){
  let el = document.getElementById("quests-screen");
  if(el) return el;
  el = document.createElement("div");
  el.id = "quests-screen"; el.className = "screen hidden";
  el.innerHTML = `<div class="qs-top">
      <button class="qs-back" id="quests-back-btn">‹ Volver</button>
      <div class="qs-brand">DESAFÍOS</div>
      <div class="qs-acc" id="quests-acc"></div>
    </div>
    <div class="hub-tabs qs-tabs" id="quests-tabs">
      <button class="hub-tab" data-qtab="desafios">Diarios</button>
      <button class="hub-tab" data-qtab="logros">Logros</button>
      <button class="hub-tab" data-qtab="pase">Pase</button>
      <button class="hub-tab" data-qtab="perfil">Perfil</button>
    </div>
    <div class="qs-body" id="quests-body"></div>`;
  (document.getElementById("stage") || document.body).appendChild(el);
  if(typeof screens !== "undefined") screens.quests = el;
  el.querySelector("#quests-back-btn").addEventListener("click", questsClose);
  el.querySelector("#quests-tabs").addEventListener("click", ev=>{ const b = ev.target.closest("[data-qtab]"); if(!b) return; questsTab = b.dataset.qtab; questsRender(); });
  el.querySelector("#quests-body").addEventListener("click", _qBodyClick);
  return el;
}
function questsOpen(tab){
  _qScreen();
  if(typeof state !== "undefined" && state !== "quests" && state !== "playing") _qReturn = state;
  if(tab) questsTab = tab;
  try{ questsEvaluate(false); }catch(e){}
  setState("quests");
  questsRender();
}
function questsClose(){
  const back = _qReturn && screens[_qReturn] ? _qReturn : "mainmenu";
  setState(back);
  if(back === "mainmenu" && typeof renderMainMenu === "function") renderMainMenu();
}
function questsRender(){
  const el = _qScreen();
  el.querySelectorAll("[data-qtab]").forEach(b=>b.classList.toggle("active", b.dataset.qtab === questsTab));
  const A = questsAccount(), q = questsState();
  el.querySelector("#quests-acc").innerHTML = `<span class="qs-acc-lv">Nv. ${A.level}</span><span class="qs-bar sm"><i style="width:${Math.round(100*A.into/Math.max(1,A.need))}%"></i></span><span class="qs-acc-gold">🪙 ${typeof fmtGold==="function" ? fmtGold(save.gold||0) : save.gold}</span>`;
  const body = el.querySelector("#quests-body");
  body.innerHTML = questsTab === "logros" ? _qAchHTML() : questsTab === "pase" ? _qPassHTML() : questsTab === "perfil" ? _qProfileHTML() : _qChalHTML();
  if(questsTab === "logros"){ for(const a of ACHIEVEMENTS) if(q.ach[a.id]) q.seen[a.id] = 1; persist(); }
  if(questsTab === "pase"){ const cur = body.querySelector(".qs-tier.cur"); const tr = body.querySelector(".qs-track"); if(cur && tr) tr.scrollLeft = Math.max(0, cur.offsetLeft - tr.clientWidth/2 + cur.offsetWidth/2); }
  if(questsTab === "perfil" && typeof startChampAnimLoop === "function") startChampAnimLoop();
  _qUpdateMenuBadge();
}
function _qBodyClick(ev){
  const b = ev.target.closest("button"); if(!b) return;
  if(b.dataset.qreroll !== undefined){ if(questsReroll(+b.dataset.qreroll)) questsRender(); return; }
  if(b.dataset.qcat){ questsCat = b.dataset.qcat; questsRender(); return; }
  if(b.dataset.qchest !== undefined){ questsOpenChestUI(); return; }
  if(b.dataset.qset){ const [kind, id] = b.dataset.qset.split(":"); if(questsSetCosmetic(kind, id)) questsRender(); return; }
}

// ---- Diarios y semanales ----
function _qChalCard(c, i, kind, V, canReroll){
  const T = questsChalText(c), p = questsChalProgress(c, V), pct = Math.round(100*p/Math.max(1,c.n));
  const tint = kind === "weekly" ? "#d29aff" : "#7fe0f0";
  const unit = c.stat === "minutes" ? " min" : "";
  return `<div class="qs-card${c.done ? " done" : ""}">
    ${_qIco(T.icon, tint, false)}
    <div class="qs-card-main"><div class="qs-name">${_qEsc(T.name)}${c.done ? ' <span class="qs-ok">✔</span>' : ""}</div>
      <div class="qs-desc">${_qEsc(T.desc)}</div>
      <div class="qs-bar"><i style="width:${pct}%"></i><span>${p}/${c.n}${unit}</span></div></div>
    <div class="qs-side"><div class="qs-rew">🪙 ${c.gold}</div>${canReroll && !c.done ? `<button class="qs-mini" data-qreroll="${i}" title="Cambiar este desafío (1 por día)" aria-label="Cambiar desafío">↻</button>` : ""}</div>
  </div>`;
}
function _qChalHTML(){
  const q = questsState(), V = questsView();
  const canReroll = (q.daily.rerolls|0) < 1;
  const chests = q.chests.length;
  const col = (kind, title, reset) => {
    const R = q[kind], bonus = CHALLENGE_BONUS[kind];
    return `<div class="qs-col"><div class="qs-h">${title}<span class="qs-reset">se renuevan en ${_qFmtMs(questsMsToReset(kind))}</span></div>
      ${R.list.map((c,i)=>_qChalCard(c, i, kind, V, kind === "daily" && canReroll)).join("")}
      <div class="qs-bonus${R.bonus ? " done" : ""}">${R.bonus ? "✔ " : ""}Completá los 3: <b>${questsRewardText(bonus)}</b></div></div>`;
  };
  return `${chests ? `<div class="qs-chestbar"><canvas class="qs-chest-mini" width="68" height="44" data-variant="${q.chests[0]}"></canvas><span>Tenés <b>${chests}</b> cofre${chests>1?"s":""} sin abrir</span><button class="btn qs-open" data-qchest>ABRIR</button></div>` : ""}
    <div class="qs-cols">${col("daily", "DIARIOS")}${col("weekly", "SEMANALES")}</div>
    <div class="qs-note">Se cumplen jugando normal, solo o en cooperativo (cada jugador suma a su cuenta). ${canReroll ? "Podés cambiar un desafío diario por día con ↻." : ""}</div>`;
}

// ---- Logros ----
function _qAchHTML(){
  const q = questsState(), V = questsView();
  const total = ACHIEVEMENTS.length, have = ACHIEVEMENTS.filter(a=>q.ach[a.id]).length;
  const cats = [{id:"todos", label:"Todos"}].concat(QUEST_CATS);
  const list = ACHIEVEMENTS.filter(a=>questsCat === "todos" || a.cat === questsCat);
  const chips = cats.map(c=>{ const n = c.id === "todos" ? have : ACHIEVEMENTS.filter(a=>a.cat===c.id && q.ach[a.id]).length, t = c.id === "todos" ? total : ACHIEVEMENTS.filter(a=>a.cat===c.id).length;
    return `<button class="qs-chip${questsCat===c.id?" on":""}" data-qcat="${c.id}" style="--qc:${c.color||"#ffcf5c"}">${_qEsc(c.label)} <i>${n}/${t}</i></button>`; }).join("");
  const cards = list.map(a=>{
    const got = !!q.ach[a.id], P = questsAchProgress(a, V), hide = a.secret && !got;
    const tint = a.tint || _qCatColor(a.cat), pct = Math.round(100*P.p/Math.max(1,P.goal));
    const isNew = got && !q.seen[a.id];
    return `<div class="qs-card ach${got ? " done" : ""}${hide ? " secret" : ""}">
      ${_qIco(hide ? "eye" : a.icon, tint, !got)}
      <div class="qs-card-main"><div class="qs-name">${hide ? "???" : _qEsc(a.name)}${isNew ? ' <span class="qs-new">¡NUEVO!</span>' : ""}</div>
        <div class="qs-desc">${hide ? "Logro secreto: seguí jugando para descubrirlo." : _qEsc(a.desc)}</div>
        ${got ? "" : hide ? "" : `<div class="qs-bar"><i style="width:${pct}%"></i><span>${P.p}/${P.goal}${a.unit ? " " + a.unit : ""}</span></div>`}</div>
      <div class="qs-side"><div class="qs-rew">${hide ? "?" : _qEsc(questsRewardText(a.reward))}</div></div>
    </div>`;
  }).join("");
  return `<div class="qs-h">LOGROS <span class="qs-reset">${have} de ${total}</span></div>
    <div class="qs-chips">${chips}</div><div class="qs-grid">${cards}</div>`;
}

// ---- Pase de temporada ----
function _qTierIcon(r){
  if(!r) return _qIco("star", "#8a8f96", true);
  if(r.chest) return `<canvas class="qs-chest-mini tier" width="48" height="36" data-variant="${r.chest}"></canvas>`;
  if(r.frame) return `<span class="qs-frame-sw" style="${_qFrameCss(r.frame)}"></span>`;
  if(r.emblem) return _qIco(QUEST_EMBLEMS[r.emblem].icon, QUEST_EMBLEMS[r.emblem].tint);
  if(r.title) return _qIco("scroll", "#ffcf5c");
  return _qIco("coin", "#ffcf5c");
}
function _qPassHTML(){
  const q = questsState(), S = questsSeason();
  const tiers = [];
  for(let l=1; l<=SEASON_DEF.levels; l++){
    const r = SEASON_REWARDS[l], got = l <= q.season.granted;
    tiers.push(`<div class="qs-tier${got ? " got" : ""}${l === S.level ? " cur" : ""}"><div class="qs-tier-n">${l}</div>${_qTierIcon(r)}<div class="qs-tier-t">${_qEsc(questsRewardText(r))}</div>${got ? '<div class="qs-tier-ok">✔</div>' : ""}</div>`);
  }
  const next = S.level < SEASON_DEF.levels ? SEASON_REWARDS[S.level+1] : null;
  return `<div class="qs-pass-head">
      <div class="qs-pass-name">${_qEsc(SEASON_DEF.name)}</div>
      <div class="qs-pass-lv">Nivel <b>${S.level}</b> / ${SEASON_DEF.levels}</div>
      <div class="qs-bar big"><i style="width:${S.need ? Math.round(100*S.into/S.need) : 100}%"></i><span>${S.need ? `${S.into} / ${S.need} XP` : "¡Pase completo!"}</span></div>
      <div class="qs-desc">${next ? `Próximo: <b>${_qEsc(questsRewardText(next))}</b> · ` : ""}La XP de cuenta sale de cada partida (más si ganás y con mejor nota), de los desafíos y de los logros. Pase gratuito: todo se gana jugando.</div>
    </div>
    <div class="qs-track">${tiers.join("")}</div>`;
}

// ---- Perfil ----
function _qFrameCss(id){
  const F = QUEST_FRAMES[id] || QUEST_FRAMES.madera;
  return `--f1:${F.c[0]};--f2:${F.c[1]};--f3:${F.c[2]};${F.glow ? `--fg:rgba(${F.glow},0.55);` : ""}`;
}
function _qEmblemHTML(q){
  const E = QUEST_EMBLEMS[q.emblem] || QUEST_EMBLEMS.guardian;
  const fav = questsFavChamp();
  const inner = (q.emblem === "guardian" && fav) ? `<canvas class="champ-anim qs-portrait-cv" data-class-key="${fav}" data-idle="1" width="96" height="96"></canvas>` : _qIco(E.icon || "shield", E.tint || "#ffcf5c", false, "qs-portrait-ico");
  const F = QUEST_FRAMES[q.frame] || {};
  return `<div class="qs-portrait${F.anim ? " anim" : ""}" style="${_qFrameCss(q.frame)}">${inner}</div>`;
}
function _qProfileHTML(){
  const q = questsState(), st = q.stats, A = questsAccount(), fav = questsFavChamp();
  const hours = st.timeMs/3600000;
  const stat = (l, v) => `<div class="qs-stat"><span>${l}</span><b>${v}</b></div>`;
  const favTxt = fav ? `${_qEsc(CLASSES[fav].name)}${(st.byChamp[fav]||{}).runs ? ` · ${(st.byChamp[fav]).runs} partidas` : ""}` : "—";
  const rows = ARENA_ORDER.map(a=>{ const b = st.byArena[a]; const nm = (ARENA_MODS[a]||{}).label || a;
    return `<div class="qs-arow"><span>${typeof campaignNumberLabel==="function" ? campaignNumberLabel(a) + " · " : ""}${_qEsc(nm)}</span><b>${b && b.grade ? `${b.grade} · ${b.best}` : b && b.runs ? `Nv. ${b.bestLevel}` : "—"}</b></div>`; }).join("");
  const chips = (kind, list, cur, names) => list.map(id=>`<button class="qs-chip${id===cur?" on":""}" data-qset="${kind}:${id}">${_qEsc(names[id].name)}</button>`).join("");
  return `<div class="qs-prof">
    <div class="qs-prof-card">${_qEmblemHTML(q)}
      <div class="qs-prof-id"><div class="qs-prof-title">${_qEsc(QUEST_TITLES[q.title].name)}</div>
        <div class="qs-prof-lv">Nivel de cuenta <b>${A.level}</b></div>
        <div class="qs-bar"><i style="width:${Math.round(100*A.into/Math.max(1,A.need))}%"></i><span>${A.into}/${A.need} XP</span></div>
        <div class="qs-desc">Logros ${Object.keys(q.ach).length}/${ACHIEVEMENTS.length} · Pase Nv. ${questsSeason().level}</div></div>
    </div>
    <div class="qs-stats">
      ${stat("Partidas", st.runs)}${stat("Victorias", st.wins)}${stat("Bajas", (typeof fmtGold==="function" ? fmtGold(st.kills) : st.kills))}
      ${stat("Jefes vencidos", st.bosses)}${stat("Subjefes", st.subjefes)}${stat("Horas", hours < 10 ? hours.toFixed(1).replace(".", ",") : Math.round(hours))}
      ${stat("Civiles rescatados", st.civ)}${stat("Fisuras cerradas", st.fis)}${stat("Cooperativo", st.coopRuns)}
      <div class="qs-stat wide"><span>Guardián favorito</span><b>${favTxt}</b></div>
    </div>
    <div class="qs-h">MEJOR PUNTAJE POR ARENA</div><div class="qs-arenas">${rows}</div>
    <div class="qs-h">TÍTULO</div><div class="qs-chips wrap">${chips("title", q.titles, q.title, QUEST_TITLES)}</div>
    <div class="qs-h">MARCO</div><div class="qs-chips wrap">${chips("frame", q.frames, q.frame, QUEST_FRAMES)}</div>
    <div class="qs-h">EMBLEMA</div><div class="qs-chips wrap">${chips("emblem", q.emblems, q.emblem, QUEST_EMBLEMS)}</div>
  </div>`;
}

/* ---------------- cofres ---------------- */
function _qDrawMiniChests(root){
  if(typeof drawLootChest !== "function") return;
  (root||document).querySelectorAll("canvas.qs-chest-mini").forEach(cv=>{ try{ drawLootChest(cv, +cv.dataset.variant||1, 0, null, 0); }catch(e){} });
}
function questsOpenChestUI(){
  const res = questsOpenChest(); if(!res) return;
  const ov = document.createElement("div"); ov.className = "qs-chest-ov";
  ov.innerHTML = `<div class="qs-chest-box"><div class="qs-h">${_qEsc(CHEST_NAMES[res.variant]||"Cofre")}</div>
    <canvas class="qs-chest-cv" width="204" height="150"></canvas><div class="qs-chest-items"></div>
    <button class="btn qs-chest-close">Cerrar</button></div>`;
  document.body.appendChild(ov);
  const cv = ov.querySelector(".qs-chest-cv"), list = ov.querySelector(".qs-chest-items");
  const best = res.items.reduce((m,it)=>Math.max(m, (typeof TIER_ORDER!=="undefined" ? TIER_ORDER[itemTier(it)] : 0)||0), 0);
  const bestTier = res.items.find(it=>TIER_ORDER[itemTier(it)] === best);
  const beam = bestTier && typeof CEREMONY_TIER !== "undefined" ? (CEREMONY_TIER[itemTier(bestTier)]||{}).beam : null;
  let t0 = performance.now(), opened = false, raf = 0;
  if(typeof playSfx === "function") try{ playSfx("chestDrop"); }catch(e){}
  const frame = now=>{
    if(!ov.isConnected){ cancelAnimationFrame(raf); return; }
    const t = now - t0;
    const shake = t < 700 ? Math.round(Math.sin(t/28)*Math.min(5, 1 + t/140)) : 0;
    const openT = Math.max(0, Math.min(1, (t - 700)/380));
    try{ drawLootChest(cv, res.variant, openT, openT > 0 ? (beam || "255,210,90") : null, shake); }catch(e){}
    if(openT >= 1 && !opened){ opened = true; if(typeof playSfx === "function") try{ playSfx("chestOpen"); }catch(e){} _qRevealChest(list, res); }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  ov.querySelector(".qs-chest-close").addEventListener("click", ()=>{ cancelAnimationFrame(raf); ov.remove(); questsRender(); });
}
function _qRevealChest(list, res){
  const rows = res.items.map(it=>{ const tm = LOOT_TIER_META[itemTier(it)] || {color:"#f2e3d3", label:""};
    return `<div class="qs-loot" style="--tc:${tm.color}">${typeof itemIconHTML === "function" ? itemIconHTML(it) : ""}<div><div class="qs-name" style="color:${tm.color}">${_qEsc(it.name)}</div><div class="qs-desc">${_qEsc(tm.label||"")}</div></div></div>`; });
  if(res.gold) rows.push(`<div class="qs-loot"><div class="qs-desc">Inventario lleno: <b>+${res.gold} de oro</b> en su lugar.</div></div>`);
  if(res.gems) rows.push(`<div class="qs-loot"><div class="qs-desc"><b style="color:#7fe8ff">+${res.gems} Gema${res.gems>1?"s":""}</b> para mejorar objetos.</div></div>`);
  list.innerHTML = rows.join("") + `<div class="qs-note">Lo encontrás en tu inventario (Sala o Códice).</div>`;
  if(res.items.length && typeof playSfx === "function"){ const tier = itemTier(res.items[0]); try{ playSfx((CEREMONY_TIER[tier]||{}).sfx || "lootCommon"); }catch(e){} }
}

/* ---------------- acceso desde el menú principal ---------------- */
// Si el menú ya tiene su botón (cualquier elemento con [data-quests-open]), se usa ese; si no, se agrega
// uno chico sobre "Volver" sin tocar el resto del menú.
function _qMenuButton(){
  const mm = document.getElementById("mainmenu-screen"); if(!mm) return;
  if(!document.querySelector("[data-quests-open]")){
    const b = document.createElement("button");
    b.className = "btn secondary"; b.id = "mainmenu-quests-btn"; b.setAttribute("data-quests-open", "");
    b.innerHTML = `🏆 DESAFÍOS <span class="qs-badge hidden"></span>`;
    const back = document.getElementById("mainmenu-back-btn");
    if(back) mm.insertBefore(b, back); else mm.appendChild(b);
  }
}
function _qUpdateMenuBadge(){
  const n = questsBadgeCount();
  document.querySelectorAll("[data-quests-open] .qs-badge").forEach(s=>{ s.textContent = n > 9 ? "9+" : String(n); s.classList.toggle("hidden", !n); });
}
document.addEventListener("click", ev=>{ const b = ev.target.closest && ev.target.closest("[data-quests-open]"); if(b){ ev.preventDefault(); questsOpen(); } });
// El badge y el aviso de logros ya ganados se refrescan solos (sin tocar renderMainMenu).
let _qPrevState = null;
setInterval(()=>{
  if(typeof state === "undefined" || typeof save === "undefined") return;
  if(state !== _qPrevState){
    if(_qPrevState === "victory" || _qPrevState === "gameover") _qClearRunSummary();
    _qPrevState = state;
    if(state === "mainmenu"){
      try{ questsEvaluate(false); }catch(e){}   // p.ej. un guardián recién comprado en la Tienda
      _qUpdateMenuBadge();
      if(QST.retroCount){ questsToast({kind:"ach", icon:"trophy", tint:"#ffcf5c", head:"LOGROS", name:`${QST.retroCount} logros ya ganados con tu progreso`, sub:"Miralos en DESAFÍOS"}); QST.retroCount = 0; }
    }
  }
}, 400);
_qMenuButton();
_qScreen();
// los cofres chicos se dibujan cuando aparecen en pantalla
new MutationObserver(()=>_qDrawMiniChests(document.getElementById("quests-screen"))).observe(document.getElementById("quests-screen"), {childList:true, subtree:true});
window.questsOpen = questsOpen;
