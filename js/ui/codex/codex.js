"use strict";
/* ============================================================
   js/ui/codex/codex.js
   EL CÓDICE — uno de los tres pilares del menú (MODOS DE JUEGO · CÓDICE · TIENDA). Enciclopedia
   interactiva del mundo: GUARDIANES (con toda la gestión que antes era "Mis Guardianes": elegir,
   equipamiento, talentos, maestría, skins), BESTIARIO, JEFES y ARENAS, todo conectado entre sí.

   Arquitectura (data-driven): CODEX_SECTIONS define las secciones (sumar RELIQUIAS = sumar una
   fila); codexEntry(tipo, id) arma cada ficha desde los datos reales del juego + js/data/codex-content.js;
   los renderizadores son por TIPO (guardián / criatura / jefe / arena / set), nunca por entrada.
   Descubrimiento: DESCONOCIDO → DESCUBIERTO → DERROTADO (→ DOMINADO), desde save.codex (lo que se vio
   y se mató, js/ui/codex/codex-track.js) y el progreso real de la campaña (arenas completadas).
   Previews: CodexSpritePreview (codex-preview.js), siempre con el arte real.
   ============================================================ */
const CODEX_SECTIONS = [
  {id:"campeones", label:"GUARDIANES", icon:"🛡", blurb:"Tus héroes: historia, habilidades en acción, skins, equipo y talentos."},
  {id:"bestiario", label:"BESTIARIO", icon:"☠", blurb:"Las criaturas de cada arena: qué son, de dónde vienen y cómo pelean."},
  {id:"jefes",     label:"JEFES",     icon:"♛", blurb:"Guardianes, subjefes y jefes: fases, habilidades y su lugar en la historia."},
  {id:"arenas",    label:"ARENAS",    icon:"⛩", blurb:"La campaña capítulo por capítulo: el camino de las Cicatrices."}
  // Futuro: {id:"reliquias", label:"RELIQUIAS", icon:"✦", blurb:"..."} — sumar su lista/renderizador por tipo.
];
// Kills para DOMINAR una criatura (arquitectura lista; se muestra como sello).
const CODEX_MASTERY = {normal:60, subelite:30, elite:15, invocacion:40, estructura:20, apendice:10, subjefe:3, jefe:3};

let codexStack = [];          // navegación: [{view, id, sub, label}]
let codexChampTab = "ficha";   // pestaña de la ficha de guardián
let codexFilter = {bestiario:"todas", jefes:"todas"};

/* ============================================================
   DATOS: armado de entradas desde los sistemas reales
   ============================================================ */
function codexSave(){ if(!save.codex || typeof save.codex !== "object") save.codex = {seen:{}, kills:{}}; save.codex.seen = save.codex.seen || {}; save.codex.kills = save.codex.kills || {}; return save.codex; }
const _codexArenaOf = {};
function codexArenaOfType(type){
  if(_codexArenaOf[type]) return _codexArenaOf[type];
  for(const a in CODEX_ARENA_ROSTER) if(CODEX_ARENA_ROSTER[a].includes(type)) return (_codexArenaOf[type] = a);
  for(const b of CODEX_BOSSES) for(const f of b.forms) if(f.split("#")[0] === type) return (_codexArenaOf[type] = b.arena);
  return null;
}
function codexArenaName(a){ const m = ARENA_MODS[a]; return a==="divina" ? "Arena Divina" : (m ? m.label : a); }
function codexArenaTag(a){ const n = campaignNumberLabel(a); return n ? n + " · " + codexArenaName(a) : codexArenaName(a); }
function codexArenaCleared(a){ return !!(save.arenasCleared && save.arenasCleared[a]); }
function codexArenaOpen(a){
  if(a === "divina") return isDivinaUnlocked();
  if(ARENA_MODS[a] && ARENA_MODS[a].comingSoon) return false;
  return codexArenaCleared(a) || isArenaUnlocked(a);
}
function codexArenaState(a){ return ARENA_MODS[a] && ARENA_MODS[a].comingSoon ? "soon" : (codexArenaCleared(a) ? "cleared" : (codexArenaOpen(a) ? "open" : "locked")); }
function codexCreatureRank(type){ const s = CODEX_SPECIAL_RANK[type]; return s ? s.rank : ((ENEMY_BASE[type]||{}).rank || "normal"); }
function codexCreatureState(type){
  const C = codexSave(), k = C.kills[type] || 0, a = codexArenaOfType(type);
  if(k > 0 || (a && codexArenaCleared(a))) return k >= (CODEX_MASTERY[codexCreatureRank(type)] || 999) ? "mastered" : "defeated";
  return C.seen[type] ? "seen" : "unknown";
}
function codexBossDef(id){ return CODEX_BOSSES.find(b=>b.id===id) || null; }
function codexBossTypes(b){ return b.forms.map(f=>f.split("#")[0]); }
function codexBossState(b){
  const C = codexSave(), types = codexBossTypes(b);
  const kills = types.reduce((n, t)=>n + (C.kills[t]||0), 0);
  if(codexArenaCleared(b.arena) || ((b.role === "subjefe" || b.arena === "divina") && kills > 0) || (b.id === "hechicero_supremo" && codexArenaCleared("infernal")))
    return kills >= (CODEX_MASTERY[b.role] || 999) ? "mastered" : "defeated";
  if(types.some(t=>C.seen[t])) return "seen";
  return "unknown";
}
function codexKnown(state){ return state !== "unknown"; }
function codexFullyKnown(state){ return state === "defeated" || state === "mastered"; }
const CODEX_STATE_LABEL = {unknown:"Desconocido", seen:"Descubierto", defeated:"Derrotado", mastered:"Dominado"};
const CODEX_STATE_ICON = {unknown:"?", seen:"👁", defeated:"⚔", mastered:"★"};
// Tipo con paleta alternativa ("tipo#atlas"): preview de otra forma del mismo cuerpo.
function codexFormSpec(f){ const [t, atlas] = f.split("#"); return {type:t, atlas:atlas||null}; }
function codexBossFormName(b, i){
  const f = codexFormSpec(b.forms[i]);
  if(b.finalName && b.finalName[f.type]) return b.finalName[f.type];
  if(b.id === "guardian_ancestral" && i === 1) return "Bestia del Bosque";
  if(b.id === "mago_gelido" && i === 1) return "Demonio Gélido";
  return (ENEMY_BASE[f.type]||{}).name || f.type;
}
function codexBossName(b){
  if(b.id === "dobladores") return "Los Dobladores";
  if(b.id === "mago_gelido") return "Mago Gélido";
  if(b.id === "hechicero_final") return "Hechicero Supremo — Jefe Final";
  return (ENEMY_BASE[b.forms[0].split("#")[0]]||{}).name || b.id;
}
function codexBossTips(type){ return (typeof BOSS_DESIGNS!=="undefined" && BOSS_DESIGNS[type]) || (typeof SUBBOSS_TIPS!=="undefined" && SUBBOSS_TIPS[type]) || (typeof ARENA_BOSS_TIPS!=="undefined" && ARENA_BOSS_TIPS[type]) || null; }
// Nivel en que aparece cada criatura: se lee del pool real de la arena cuando se puede.
function codexFirstLevel(type){
  if(CODEX_FIRST_LEVEL[type]) return CODEX_FIRST_LEVEL[type];
  const a = codexArenaOfType(type); if(!a || a==="micelial" || a==="abismo") return null;
  const sa = currentArena;
  try{ currentArena = a; for(let lv = 1; lv <= 10; lv++){ const pool = spawnPoolFor(lv); if(pool && pool.some(p=>p.t===type)) return lv; } }catch(e){}
  finally{ currentArena = sa; }
  return null;
}
function codexCounts(){
  const cre = Object.values(CODEX_ARENA_ROSTER).flat();
  const cs = cre.map(codexCreatureState), bs = CODEX_BOSSES.map(codexBossState);
  const arenas = CAMPAIGN_ORDER.filter(a=>!ARENA_MODS[a].comingSoon);
  return {
    champs:[CHAMPION_CATALOG.filter(c=>save.champions[c.id] && save.champions[c.id].unlocked).length, CHAMPION_CATALOG.length],
    creatures:[cs.filter(codexKnown).length, cre.length, cs.filter(codexFullyKnown).length],
    bosses:[bs.filter(codexKnown).length, CODEX_BOSSES.length, bs.filter(codexFullyKnown).length],
    arenas:[arenas.filter(codexArenaCleared).length, arenas.length]
  };
}

/* ============================================================
   NAVEGACIÓN
   ============================================================ */
function openCodex(){
  codexStack = [{view:"home", label:"CÓDICE"}];
  setState("codex"); codexRender();
  if(typeof playSfx==="function") playSfx("ready");
}
function codexGo(view, id, label, sub){
  codexStack.push({view, id, label, sub});
  codexRender(true);
}
function codexBack(){
  if(codexStack.length > 1){ codexStack.pop(); codexRender(); }
  else { setState("mainmenu"); renderMainMenu(); }
}
function codexCrumbTo(i){ codexStack = codexStack.slice(0, i+1); codexRender(); }
function codexCur(){ return codexStack[codexStack.length-1]; }
// Destino de un vínculo cruzado ("tipo:id"): arma la etiqueta correcta para el rastro de migas.
function codexLink(target){
  const [view, id] = target.split(":");
  const sec = {champ:"campeones", creature:"bestiario", boss:"jefes", arena:"arenas", set:null}[view];
  // si el vínculo lleva a otra sección, el rastro pasa por esa sección (CÓDICE > ARENAS > ...)
  const inSec = codexStack.some(s=>s.view==="list" && s.id===sec);
  if(sec && !inSec){ codexStack = [codexStack[0], {view:"list", id:sec, label:CODEX_SECTIONS.find(s=>s.id===sec).label}]; }
  codexGo(view, id, codexLinkLabel(view, id));
}
function codexLinkLabel(view, id){
  if(view==="champ") return (CLASSES[id]||{}).name || id;
  if(view==="creature") return codexKnown(codexCreatureState(id)) ? ENEMY_BASE[id].name : "???";
  if(view==="boss"){ const b = codexBossDef(id); return b && codexKnown(codexBossState(b)) ? codexBossName(b) : "???"; }
  if(view==="arena") return codexArenaTag(id);
  if(view==="set") return (SET_DB[id]||{}).name || id;
  return id;
}

/* ============================================================
   RENDER
   ============================================================ */
function _cxEsc(s){ return String(s==null ? "" : s).replace(/[&<>"]/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c])); }
function codexRender(fresh){
  const body = document.getElementById("codex-body"); if(!body) return;
  const cur = codexCur();
  // migas + atrás
  const crumbs = document.getElementById("codex-crumbs");
  crumbs.innerHTML = codexStack.map((s, i)=> i < codexStack.length-1
    ? `<button class="cx-crumb" data-crumb="${i}">${_cxEsc(s.label)}</button><span class="cx-crumb-sep">›</span>`
    : `<span class="cx-crumb cur">${_cxEsc(s.label)}</span>`).join("");
  crumbs.querySelectorAll("[data-crumb]").forEach(b=>b.addEventListener("click", ()=>codexCrumbTo(+b.dataset.crumb)));
  document.getElementById("codex-back-btn").textContent = codexStack.length > 1 ? "‹ Atrás" : "‹ Menú";
  // limpia previews de la vista anterior
  body.querySelectorAll("canvas").forEach(cv=>codexPreviewDrop(cv));
  let html = "";
  if(cur.view === "home") html = codexHomeHtml();
  else if(cur.view === "list") html = codexListHtml(cur.id);
  else if(cur.view === "champ") html = codexChampHtml(cur.id);
  else if(cur.view === "creature") html = codexCreatureHtml(cur.id);
  else if(cur.view === "boss") html = codexBossHtml(cur.id);
  else if(cur.view === "arena") html = codexArenaHtml(cur.id);
  else if(cur.view === "set") html = codexSetHtml(cur.id);
  body.innerHTML = html;
  body.className = "cx-view cx-view-" + cur.view + (fresh ? " cx-enter" : "");
  body.scrollTop = 0;
  codexBind(body, cur);
}
// Engancha previews, vínculos y botones de la vista recién dibujada.
function codexBind(body, cur){
  body.querySelectorAll("canvas[data-pv]").forEach(cv=>{ try{ codexPreview(cv, JSON.parse(cv.dataset.pv)); }catch(e){} });
  body.querySelectorAll("[data-go]").forEach(el=>el.addEventListener("click", ev=>{ ev.stopPropagation(); codexLink(el.dataset.go); }));
  body.querySelectorAll("[data-sec]").forEach(el=>el.addEventListener("click", ()=>{
    const s = CODEX_SECTIONS.find(x=>x.id===el.dataset.sec); codexGo("list", s.id, s.label);
  }));
  body.querySelectorAll("[data-filter]").forEach(el=>el.addEventListener("click", ()=>{ codexFilter[cur.id] = el.dataset.filter; codexRender(); }));
  // navegación entre fichas de la misma lista (flechas y deslizar)
  const nav = body.querySelector(".cx-entry");
  if(nav){
    body.querySelectorAll("[data-step]").forEach(b=>b.addEventListener("click", ()=>codexStep(+b.dataset.step)));
    let sx = null, sy = null;
    nav.addEventListener("touchstart", e=>{ const t = e.touches[0]; sx = t.clientX; sy = t.clientY; }, {passive:true});
    nav.addEventListener("touchend", e=>{ if(sx===null) return; const t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy; sx = null;
      if(Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy)*1.6 && !e.target.closest(".cx-scroll-x")) codexStep(dx < 0 ? 1 : -1); }, {passive:true});
  }
  const inv = body.querySelector("#codex-inv-btn");
  if(inv) inv.addEventListener("click", ()=>{ codexReturnTo = "codex"; openMyInventory("objetos"); });
  if(cur.view === "champ") codexBindChamp(body, cur.id);
  if(cur.view === "creature" || cur.view === "boss") codexBindAnimChips(body);
}
// Lista (en orden) de la que forma parte la ficha actual, para ‹ › y deslizar.
function codexSiblings(cur){
  if(cur.view==="champ") return CHAMPION_CATALOG.map(c=>c.id);
  if(cur.view==="creature") return codexCreatureOrder();
  if(cur.view==="boss") return CODEX_BOSSES.map(b=>b.id);
  if(cur.view==="arena") return [...CAMPAIGN_ORDER, "divina"];
  return [];
}
function codexStep(d){
  const cur = codexCur(), list = codexSiblings(cur), i = list.indexOf(cur.id);
  if(i < 0 || !list.length) return;
  const id = list[(i + d + list.length) % list.length];
  cur.id = id; cur.label = codexLinkLabel(cur.view, id);
  codexRender(true);
}
function codexCreatureOrder(){ return CAMPAIGN_ORDER.concat(["divina"]).flatMap(a=>CODEX_ARENA_ROSTER[a] || []); }
function codexStepper(){ return `<div class="cx-stepper"><button class="cx-step" data-step="-1" aria-label="Anterior">‹</button><button class="cx-step" data-step="1" aria-label="Siguiente">›</button></div>`; }
function _pv(spec, cls){ return `<canvas class="${cls||"cx-pv"}" data-pv='${_cxEsc(JSON.stringify(spec)).replace(/'/g,"&#39;")}'></canvas>`; }
function _badge(state){ return `<span class="cx-state cx-state-${state}" title="${CODEX_STATE_LABEL[state]}">${CODEX_STATE_ICON[state]} ${CODEX_STATE_LABEL[state]}</span>`; }

/* ---------------- HOME ---------------- */
function codexHomeHtml(){
  const N = codexCounts();
  const owned = CHAMPION_CATALOG.filter(c=>save.champions[c.id] && save.champions[c.id].unlocked).map(c=>c.id);
  const heroes = owned.concat(CHAMPION_CATALOG.map(c=>c.id).filter(k=>!owned.includes(k))).slice(0, 3);
  // arte REAL de cada sección: guardianes, la criatura más reciente que conocés, un jefe conocido (o su silueta), una arena
  const knownCre = codexCreatureOrder().filter(t=>codexKnown(codexCreatureState(t)));
  const cre = knownCre.length ? knownCre[knownCre.length-1] : "esqueleto";
  const knownBoss = CODEX_BOSSES.filter(b=>codexKnown(codexBossState(b)));
  const boss = knownBoss.length ? knownBoss[knownBoss.length-1] : CODEX_BOSSES[1];
  const arenaImg = codexArenaImage(CAMPAIGN_ORDER.find(a=>codexArenaState(a)==="open") || "fortaleza");
  const card = (sec, art, count)=>`<button class="cx-home-card" data-sec="${sec.id}">
      <div class="cx-home-art">${art}</div>
      <div class="cx-home-txt"><div class="cx-home-title"><span class="cx-home-ico">${sec.icon}</span>${sec.label}</div>
      <div class="cx-home-blurb">${sec.blurb}</div><div class="cx-home-count">${count}</div></div></button>`;
  return `<div class="cx-home">
    <div class="cx-home-head"><div class="cx-home-brand">CÓDICE</div><div class="cx-home-sub">El archivo prohibido de la Horda · lo que viste, lo que venciste y lo que todavía te espera</div></div>
    <div class="cx-home-grid">
      ${card(CODEX_SECTIONS[0], `<div class="cx-home-trio">${heroes.map((k,i)=>_pv({kind:"champ", key:k, anim:i===1?"idle":"walk", bg:"none"}, "cx-pv cx-trio-"+i)).join("")}</div>`, `${N.champs[0]} / ${N.champs[1]} tuyos`)}
      ${card(CODEX_SECTIONS[1], _pv({kind:"enemy", key:cre, anim:"walk", arena:codexArenaOfType(cre), silhouette:!knownCre.length}), `${N.creatures[0]} / ${N.creatures[1]} descubiertas · ${N.creatures[2]} derrotadas`)}
      ${card(CODEX_SECTIONS[2], _pv(!knownBoss.length && boss.veil ? {kind:"ambient", arena:boss.arena, veil:true} : {kind:"enemy", forms:codexBossTypes(boss).slice(0,1), key:codexBossTypes(boss)[0], anim:"idle", arena:boss.arena, silhouette:!knownBoss.length}), `${N.bosses[0]} / ${N.bosses[1]} descubiertos · ${N.bosses[2]} derrotados`)}
      ${card(CODEX_SECTIONS[3], `<div class="cx-home-arena" style="background-image:url('${arenaImg}')"></div>${_pv({kind:"ambient", arena:"infernal", bg:"none"}, "cx-pv cx-amb")}`, `${N.arenas[0]} / ${N.arenas[1]} completadas`)}
    </div></div>`;
}
function codexArenaImage(a){ return `assets/ui/codex/arenas/${a}.jpg`; }

/* ---------------- LISTAS ---------------- */
function codexListHtml(sec){
  if(sec === "campeones") return codexChampListHtml();
  if(sec === "bestiario") return codexBestiaryHtml();
  if(sec === "jefes") return codexBossListHtml();
  if(sec === "arenas") return codexArenaListHtml();
  return "";
}
function codexChampListHtml(){
  const cards = CHAMPION_CATALOG.map(c=>{
    const cls = CLASSES[c.id], ch = save.champions[c.id], own = ch && ch.unlocked, sel = own && selectedClass===c.id;
    return `<button class="cx-card cx-champ-card ${own?"":"locked"} ${sel?"sel":""}" data-go="champ:${c.id}">
      ${_pv({kind:"champ", key:c.id, anim:"idle", bg:"none", fps:15}, "cx-pv cx-card-pv")}
      <div class="cx-card-name" style="color:${cls.color}">${_cxEsc(cls.name)}</div>
      <div class="cx-card-sub">${HUB_ROLE_LABEL[cls.roleCategory]||""} · ${own ? "Nv. " + ch.level : "🔒 Tienda"}</div>
      ${sel ? '<span class="cx-card-flag">EN JUEGO</span>' : ""}
    </button>`;
  }).join("");
  return `<div class="cx-list-head"><div class="cx-list-title">GUARDIANES</div>
      <button class="cx-btn" id="codex-inv-btn">🎒 Mi Inventario</button></div>
    <div class="cx-grid cx-grid-champs">${cards}</div>`;
}
function codexFilterBar(sec, arenas){
  const cur = codexFilter[sec] || "todas";
  return `<div class="cx-filters cx-scroll-x"><button class="cx-chip ${cur==="todas"?"on":""}" data-filter="todas">Todas</button>${arenas.map(a=>
    `<button class="cx-chip ${cur===a?"on":""} ${codexArenaOpen(a)||codexArenaCleared(a)?"":"dim"}" data-filter="${a}">${campaignNumberLabel(a) || "✦"} ${_cxEsc(codexArenaName(a))}</button>`).join("")}</div>`;
}
function codexBestiaryHtml(){
  const arenas = CAMPAIGN_ORDER.filter(a=>CODEX_ARENA_ROSTER[a]);
  const f = codexFilter.bestiario || "todas";
  const groups = arenas.filter(a=>f==="todas" || f===a).map(a=>{
    const cards = CODEX_ARENA_ROSTER[a].map(t=>{
      const st = codexCreatureState(t), known = codexKnown(st), rk = codexCreatureRank(t);
      return `<button class="cx-card cx-cre-card st-${st}" data-go="creature:${t}">
        ${_pv({kind:"enemy", key:t, anim:known?"walk":"idle", arena:a, silhouette:!known, bg:"none", fps:15}, "cx-pv cx-card-pv")}
        <div class="cx-card-name">${known ? _cxEsc(ENEMY_BASE[t].name) : "???"}</div>
        <div class="cx-card-sub"><span class="cx-rank cx-rank-${rk}">${CODEX_RANK_LABEL[rk]}</span></div>
        <span class="cx-card-st" title="${CODEX_STATE_LABEL[st]}">${CODEX_STATE_ICON[st]}</span>
      </button>`;
    }).join("");
    const n = CODEX_ARENA_ROSTER[a].filter(t=>codexKnown(codexCreatureState(t))).length;
    return `<div class="cx-group"><button class="cx-group-head" data-go="arena:${a}"><span class="cx-group-num">${campaignNumberLabel(a)}</span> ${_cxEsc(codexArenaName(a))} <span class="cx-group-count">${n}/${CODEX_ARENA_ROSTER[a].length}</span></button>
      <div class="cx-grid">${cards}</div></div>`;
  }).join("");
  return `<div class="cx-list-head"><div class="cx-list-title">BESTIARIO</div></div>${codexFilterBar("bestiario", arenas)}${groups}`;
}
function codexBossListHtml(){
  const arenas = [...new Set(CODEX_BOSSES.map(b=>b.arena))];
  const f = codexFilter.jefes || "todas";
  const cards = CODEX_BOSSES.filter(b=>f==="todas" || b.arena===f).map(b=>{
    const st = codexBossState(b), known = codexKnown(st), full = codexFullyKnown(st);
    const tips = codexBossTips(codexBossTypes(b)[0]);
    const L = CODEX_BOSS_LORE[b.id] || {};
    const spec = (!known && b.veil) ? {kind:"ambient", arena:b.arena, veil:true, bg:"none", fps:15}
      : b.group ? {kind:"group", forms:codexBossTypes(b), anim:"idle", arena:b.arena, silhouette:!known, bg:"none", fps:15}
      : {kind:"enemy", key:codexBossTypes(b)[0], anim:"idle", arena:b.arena, silhouette:!known, bg:"none", fps:15};
    return `<button class="cx-card cx-boss-card st-${st} ${b.guardian?"guardian":""}" data-go="boss:${b.id}">
      ${_pv(spec, "cx-pv cx-card-pv")}
      <div class="cx-card-name">${known ? _cxEsc(codexBossName(b)) : "???"}</div>
      <div class="cx-card-sub">${known ? _cxEsc((tips && tips.epithet) || L.title || "") : "Sin descubrir"}</div>
      <div class="cx-card-sub dim">${b.role==="jefe"?"Jefe":"Subjefe"} · ${_cxEsc(codexArenaTag(b.arena))}</div>
      ${b.guardian && (full || (known && b.id!=="hechicero_supremo" && b.id!=="hechicero_final")) ? `<span class="cx-card-flag guardian">GUARDIÁN ${["","I","II","III","IV"][b.guardian]}</span>` : ""}
      <span class="cx-card-st">${CODEX_STATE_ICON[st]}</span>
    </button>`;
  }).join("");
  return `<div class="cx-list-head"><div class="cx-list-title">JEFES</div></div>${codexFilterBar("jefes", arenas)}<div class="cx-grid cx-grid-boss">${cards}</div>`;
}
function codexArenaListHtml(){
  const list = [...CAMPAIGN_ORDER, "divina"].map(a=>{
    const st = codexArenaState(a), n = campaignNumberLabel(a);
    const label = {soon:"EN CONSTRUCCIÓN", cleared:"✔ COMPLETADA", open:"DISPONIBLE", locked:"🔒 BLOQUEADA"}[st];
    const L = CODEX_ARENA_LORE[a] || {};
    return `<button class="cx-chapter st-${st}" data-go="arena:${a}">
      <div class="cx-chapter-art" style="${st==="soon" ? "" : `background-image:url('${codexArenaImage(a)}')`}">${st==="soon" ? _pv({kind:"ambient", arena:a, bg:"none"}, "cx-pv cx-amb") : ""}</div>
      <div class="cx-chapter-num">${n || "✦"}</div>
      <div class="cx-chapter-txt"><div class="cx-chapter-name">${_cxEsc(codexArenaName(a))}</div>
        <div class="cx-chapter-line">${st==="locked" ? "Todavía no llegaste hasta acá." : _cxEsc(L.why || "")}</div></div>
      <div class="cx-chapter-st">${a==="divina" ? (st==="locked" ? "🔒 POSTGAME" : "POSTGAME") : label}</div>
    </button>`;
  }).join("");
  return `<div class="cx-list-head"><div class="cx-list-title">ARENAS — EL CAMINO DE LAS CICATRICES</div></div><div class="cx-chapters">${list}</div>`;
}

/* ---------------- ficha genérica: escenario + panel ---------------- */
function codexEntryHtml(stageHtml, panelHtml, extraCls){
  return `<div class="cx-entry ${extraCls||""}">
    <div class="cx-stage-col">${stageHtml}</div>
    <div class="cx-panel">${panelHtml}</div>
  </div>`;
}
function _sec(title, html, cls){ return html ? `<section class="cx-sec ${cls||""}"><h3 class="cx-sec-title">${title}</h3>${html}</section>` : ""; }
function _p(t){ return t ? `<p>${_cxEsc(t)}</p>` : ""; }
function _animChips(list){ return `<div class="cx-anim-chips cx-scroll-x">${list.map((a,i)=>`<button class="cx-chip ${i===0?"on":""}" data-anim='${_cxEsc(JSON.stringify(a.p)).replace(/'/g,"&#39;")}'>${_cxEsc(a.l)}</button>`).join("")}</div>`; }
function codexBindAnimChips(body){
  const cv = body.querySelector(".cx-stage-pv"); if(!cv) return;
  body.querySelectorAll("[data-anim]").forEach(b=>b.addEventListener("click", ()=>{
    body.querySelectorAll("[data-anim]").forEach(x=>x.classList.remove("on")); b.classList.add("on");
    codexPreviewSet(cv, JSON.parse(b.dataset.anim));
    if(typeof playSfx==="function" && JSON.parse(b.dataset.anim).anim==="skill") playSfx("cast");
  }));
}
function _statRow(k, v){ return `<div class="cx-stat"><span>${k}</span><b>${v}</b></div>`; }

/* ---------------- GUARDIÁN ---------------- */
function codexChampHtml(key){
  const cls = CLASSES[key], cat = CHAMPION_CATALOG.find(c=>c.id===key), ch = save.champions[key];
  const own = ch && ch.unlocked, L = CODEX_CHAMP_LORE[key] || {};
  const sel = own && selectedClass === key;
  const need = own ? xpToNext(ch.level) : 1, pct = own ? Math.min(100, Math.round(ch.xp/need*100)) : 0;
  const tabs = [["ficha","Ficha"],["equipo","Equipamiento"],["talentos","Talentos"],["habilidades","Maestría"]];
  const stage = `<div class="cx-stage">${_pv({kind:"champ", key, anim:"idle", arena:"champ"}, "cx-pv cx-stage-pv")}
      <div class="cx-stage-name" style="color:${cls.color}">${_cxEsc(cls.name)}</div></div>
    ${_animChips(codexChampAnimList(key))}
    <div class="cx-stage-actions">${own
      ? (sel ? `<div class="cx-active">✔ Tu guardián para jugar</div>` : `<button class="cx-btn primary" id="cx-pick-btn">Elegir para jugar</button>`)
      : `<button class="cx-btn primary" id="cx-buy-btn">🔒 Desbloquear en la Tienda · 🪙 ${fmtGold(cat.priceGold)}</button>`}</div>`;
  const head = `<div class="cx-panel-head">${codexStepper()}<div class="cx-kicker">${HUB_ROLE_LABEL[cls.roleCategory]||""}${own ? " · Nv. " + ch.level : ""}</div>
      <h2 class="cx-title" style="color:${cls.color}">${_cxEsc(cls.name)}</h2><div class="cx-subtitle">${_cxEsc(cls.role)}</div>
      ${own ? `<div class="cx-xp"><div style="width:${pct}%"></div></div><div class="cx-dim">${ch.xp} / ${need} XP · Puntos sin gastar: <b>${ch.talentPoints||0}</b></div>` : ""}
      <div class="cx-tabs">${tabs.map(([t,l])=>`<button class="cx-tab ${codexChampTab===t?"on":""} ${!own && t!=="ficha"?"dim":""}" data-ctab="${t}">${l}</button>`).join("")}</div></div>`;
  let panel = head;
  if(codexChampTab === "ficha" || !own){
    const sk = [...cls.skills, cls.ultimate];
    panel += _sec("¿Quién es?", `<blockquote class="cx-quote">«${_cxEsc(cat.lore)}»</blockquote>${L.origin ? `<div class="cx-origin">Origen: <b>${_cxEsc(L.origin)}</b></div>` : ""}${_p(L.history)}`, "lore");
    panel += _sec("Habilidades · tocá una para verla", `<div class="cx-skills">${sk.map((s, i)=>`<button class="cx-skill" data-skill="${i}">
        <span class="cx-skill-ico">${s.ico||"★"}</span><span class="cx-skill-txt"><b>${_cxEsc(s.name)}</b>${i===3?' <i class="cx-ult">Definitiva</i>':""}
        <span class="cx-skill-desc">${_cxEsc(s.desc||"")}</span><span class="cx-skill-num">${codexSkillNumbers(s, i===3)}</span></span></button>`).join("")}</div>`, "combat");
    panel += _sec("Estadísticas base", `<div class="cx-stats">${_statRow("Vida", cls.baseHP)}${_statRow("Daño", cls.baseDmg)}${_statRow("Defensa", Math.round((cls.baseDef||0)*100)+"%")}${_statRow("Velocidad", cls.baseSpeed)}${_statRow("Energía", cls.energyMax)}${_statRow("Alcance básico", cls.basicRange+" u")}</div>`, "combat");
    panel += _sec("Skins", codexChampSkinsHtml(key), "skins");
    const cset = Object.entries(typeof CHAMPION_SETS!=="undefined" ? CHAMPION_SETS : {}).find(([id, S])=>S.champion===key);
    if(cset) panel += _sec("Equipamiento propio", `<button class="cx-link-card" data-go="set:${cset[0]}"><b>${_cxEsc(cset[1].name)}</b><span>${_cxEsc(cset[1].theme||"")} · solo ${_cxEsc(cls.name)}</span></button>`);
  } else panel += `<div class="cx-hub-panel" id="cx-hub-panel"></div>`;
  return codexEntryHtml(stage, panel, "cx-entry-champ");
}
function codexChampAnimList(key){
  const P = CHAMP_PACK[key], list = [{l:"Quieto", p:{anim:"idle"}}, {l:"Caminar", p:{anim:"walk"}}, {l:"Ataque", p:{anim:"attack"}}];
  if(P && P.sets && P.sets.cast_side) list.push({l:"Hechizo", p:{anim:"cast"}});
  for(const a of (CODEX_CHAMP_EXTRA_ANIMS[key] || [])){ const PP = CHAMP_PACK[a.pack || key]; if(PP && (!PP.ready || PP.sets[a.set])) list.push({l:a.label, p:{anim:"set", set:a.set, pack:a.pack}}); }
  const cls = CLASSES[key];
  list.push({l:"★ " + cls.ultimate.name, p:{anim:"skill", skill:codexSkillFx(key, 3)}});
  return list;
}
// Demo de una habilidad: CODEX_SKILL_FX + lo que se deduce de sus datos reales (forma, color, elemento).
function codexSkillFx(key, i){
  const cls = CLASSES[key], sk = i === 3 ? cls.ultimate : cls.skills[i];
  const o = ((CODEX_SKILL_FX[key] || [])[i]) || {};
  let fx = o.fx;
  if(!fx){ const k = sk.kind || "";
    fx = i===3 ? "ult" : /heal/.test(k) ? "heal" : /summon|skeleton|granad/.test(k) ? "summon" : /charge|dash/.test(k) ? "charge" : /blink|teleport|step/.test(k) ? "blink"
      : /chain/.test(k) ? "chain" : /slash|cone|hit/.test(k) ? "cone" : /shot|proj|bolt/.test(k) ? "proj" : (sk.radius && sk.range) ? "zone" : sk.radius ? "nova" : sk.duration ? "buff" : "proj"; }
  const EL = {fire:"255,110,40", ice:"160,225,255", lightning:"255,230,110", heal:"120,255,160", atk:"255,120,90", shield:"140,200,255"};
  return Object.assign({}, o, {fx, color:o.color || EL[sk.element] || "255,190,110"});
}
function codexSkillNumbers(s, ult){
  const out = [];
  if(!ult && s.cost) out.push(`⚡ ${s.cost}`);
  if(s.cd) out.push(`⟳ ${(s.cd/1000).toFixed(s.cd%1000?1:0)} s`);
  if(s.dmgMult) out.push(`Daño ×${s.dmgMult}`);
  if(s.radius) out.push(`Área ${s.radius} u`);
  if(s.range) out.push(`Alcance ${s.range} u`);
  if(s.duration) out.push(`Dura ${(s.duration/1000).toFixed(1).replace(".0","")} s`);
  if(s.healPct) out.push(`Cura ${Math.round(s.healPct*100)}%`);
  return out.join(" · ");
}
function codexChampSkins(key){ return Object.keys(typeof SET_SKINS!=="undefined" ? SET_SKINS : {}).filter(id=>SET_SKINS[id].champ===key).concat(typeof cromaIdsFor==="function" ? cromaIdsFor(key) : []); }
// Chip de una CROMA (js/systems/cromas.js): cosmético suelto por oro, se usa/quita acá mismo.
function _cxCromaChip(key, id){
  const d = CROMA_SKINS[id], C = CROMA_CRYSTALS[d.crystal] || {label:d.crystal};
  const st = cromaIsEquipped(id) ? "✔ EQUIPADA" : (cromaOwned(id) ? "Comprada: usala" : `🪙 ${fmtGold(cromaPrice(id))}`);
  return `<button class="cx-skin" data-skin="${id}"><img src="${_cxEsc(d.preview)}" alt="" loading="lazy">
      <span class="cx-skin-name">${_cxEsc(d.name)}</span><span class="cx-skin-rar">Croma · ${_cxEsc(C.label)}</span><span class="cx-skin-st">${st}</span></button>`;
}
function codexChampSkinsHtml(key){
  const ids = codexChampSkins(key);
  const base = `<button class="cx-skin on" data-skin=""><span class="cx-skin-name">Apariencia base</span><span class="cx-skin-st">✔ Siempre disponible</span></button>`;
  if(!ids.length) return `<div class="cx-skins cx-scroll-x">${base}</div><div class="cx-dim">Sin skins todavía (arte pendiente: docs/assets_faltantes/skins_sets/).</div>`;
  return `<div class="cx-skins cx-scroll-x">${base}${ids.map(id=>{
    if(typeof isCromaId==="function" && isCromaId(id)) return _cxCromaChip(key, id);
    const sk = SET_SKINS[id], S = SET_DB[id] || {}, miss = typeof shopSetMissing==="function" ? shopSetMissing(id) : [];
    const full = typeof setFullCount==="function" ? setFullCount(id) : 4, eq = typeof equippedSetCount==="function" ? equippedSetCount(key, id) : 0;
    const stTxt = eq >= full ? "✔ EQUIPADA (set completo)" : (!miss.length ? "Tenés el set: equipalo" : `${full - miss.length}/${full} piezas`);
    return `<button class="cx-skin" data-skin="${id}"><img src="${_cxEsc(sk.preview || sk.src)}" alt="" loading="lazy">
      <span class="cx-skin-name">${_cxEsc(sk.name)}</span><span class="cx-skin-rar">Skin de set · ${_cxEsc(S.name || id)}</span><span class="cx-skin-st">${stTxt}</span></button>`;
  }).join("")}</div><div class="cx-skin-detail" id="cx-skin-detail"></div>`;
}
function codexBindChamp(body, key){
  const cv = body.querySelector(".cx-stage-pv"), own = save.champions[key] && save.champions[key].unlocked;
  codexBindAnimChips(body);
  body.querySelectorAll("[data-ctab]").forEach(b=>b.addEventListener("click", ()=>{
    if(!own && b.dataset.ctab !== "ficha"){ if(typeof showNetToast==="function") showNetToast(`${CLASSES[key].name} está bloqueado: desbloquealo en la Tienda.`); return; }
    codexChampTab = b.dataset.ctab; codexRender();
  }));
  body.querySelectorAll("[data-skill]").forEach(b=>b.addEventListener("click", ()=>{
    const i = +b.dataset.skill;
    body.querySelectorAll("[data-skill]").forEach(x=>x.classList.remove("on")); b.classList.add("on");
    body.querySelectorAll("[data-anim]").forEach(x=>x.classList.remove("on"));
    codexPreviewSet(cv, {anim:"skill", skill:codexSkillFx(key, i)});
    if(typeof playSfx==="function") playSfx("cast");
    if(window.innerWidth < window.innerHeight*1.1) cv.scrollIntoView({behavior:"smooth", block:"center"});
  }));
  body.querySelectorAll("[data-skin]").forEach(b=>b.addEventListener("click", ()=>{
    body.querySelectorAll("[data-skin]").forEach(x=>x.classList.remove("on")); b.classList.add("on");
    const id = b.dataset.skin || null;
    codexPreviewSet(cv, {skin:id, anim:"idle"});
    codexSkinDetail(body, key, id);
  }));
  const pick = body.querySelector("#cx-pick-btn");
  if(pick) pick.addEventListener("click", ()=>{ selectedClass = key; if(typeof netRememberChamp==="function") netRememberChamp(key); if(typeof playSfx==="function") playSfx("ready"); codexRender(); });
  const buy = body.querySelector("#cx-buy-btn");
  if(buy) buy.addEventListener("click", ()=>{ codexReturnTo = "codex"; renderChampDetail(key); setState("champdetail"); });
  // pestañas de gestión: los mismos paneles reales de siempre (equipo, árbol de talentos, maestría)
  const hub = body.querySelector("#cx-hub-panel");
  if(hub && own){
    const redraw = ()=>codexRender();
    hub.classList.toggle("tree-wide", codexChampTab==="talentos");
    if(codexChampTab === "talentos") renderTalentTree(hub, key, redraw);
    else if(codexChampTab === "habilidades") renderSkillsPanel(hub, key, redraw);
    else if(codexChampTab === "equipo") renderChampInventory(hub, key, redraw);
    startChampAnimLoop();
  }
}
function codexSkinDetail(body, key, id){
  const el = body.querySelector("#cx-skin-detail"); if(!el) return;
  if(!id){ el.innerHTML = ""; return; }
  if(typeof isCromaId==="function" && isCromaId(id)){ _cxCromaDetail(el, key, id); return; }
  const sk = SET_SKINS[id], S = SET_DB[id] || {}, miss = typeof shopSetMissing==="function" ? shopSetMissing(id) : [];
  const full = typeof setFullCount==="function" ? setFullCount(id) : 4, eq = typeof equippedSetCount==="function" ? equippedSetCount(key, id) : 0;
  let act;
  if(eq >= full) act = `<div class="cx-active">✔ Equipada: tenés el set completo puesto</div>`;
  else if(!miss.length) act = `<button class="cx-btn primary" id="cx-skin-equip">USAR · equipar el set completo</button>`;
  else act = `<button class="cx-btn" id="cx-skin-shop">Ver en la Tienda · te faltan ${miss.length} piezas</button>`;
  el.innerHTML = `<div class="cx-skin-box"><b>${_cxEsc(sk.name)}</b><div class="cx-dim">${_cxEsc(S.lore || "")}</div>
    <div class="cx-dim">Una skin de set nunca se vende suelta: aparece con el set COMPLETO puesto en ${_cxEsc(CLASSES[key].name)}.</div>${act}
    <button class="cx-link-card small" data-go="set:${id}"><b>${_cxEsc(S.name || id)}</b><span>ver el set</span></button></div>`;
  el.querySelectorAll("[data-go]").forEach(x=>x.addEventListener("click", ()=>codexLink(x.dataset.go)));
  const eqb = el.querySelector("#cx-skin-equip");
  if(eqb) eqb.addEventListener("click", ()=>{ codexEquipSet(key, id); codexRender(); });
  const shop = el.querySelector("#cx-skin-shop");
  if(shop) shop.addEventListener("click", ()=>{ codexReturnTo = "codex"; if(typeof shopTab!=="undefined") shopTab = "skins"; setState("shop"); renderShop(); }); // la Tienda REAL (no hay compra duplicada)
}
function _cxCromaDetail(el, key, id){
  const d = CROMA_SKINS[id], C = CROMA_CRYSTALS[d.crystal] || {label:d.crystal}, own = save.champions[key] && save.champions[key].unlocked;
  let act;
  if(cromaIsEquipped(id)) act = `<div class="cx-active">✔ Equipada${cromaHiddenBySet(key) ? " (la tapa la skin de set completo mientras lo lleves)" : ""}</div><button class="cx-btn" id="cx-croma-off">Quitar · volver a los colores de siempre</button>`;
  else if(cromaOwned(id)) act = own ? `<button class="cx-btn primary" id="cx-croma-on">USAR</button>` : `<div class="cx-dim">Conseguí a ${_cxEsc(CLASSES[key].name)} para usarla.</div>`;
  else act = `<button class="cx-btn primary" id="cx-croma-buy" ${save.gold < cromaPrice(id) ? "disabled" : ""}>Comprar · 🪙 ${fmtGold(cromaPrice(id))}</button>`;
  el.innerHTML = `<div class="cx-skin-box"><b>${_cxEsc(d.name)}</b><div class="cx-dim">${_cxEsc(d.lore)}</div>
    <div class="cx-dim">Croma del ${_cxEsc(C.label)}: la misma armadura con otra paleta. Cosmético puro (no da poder), se compra con oro del juego.</div>${act}</div>`;
  const on = el.querySelector("#cx-croma-on"), off = el.querySelector("#cx-croma-off"), buy = el.querySelector("#cx-croma-buy");
  if(on) on.addEventListener("click", ()=>{ if(cromaEquip(key, id) && typeof showNetToast==="function") showNetToast(`🎨 CROMA EQUIPADA · ${d.name}`); codexRender(); });
  if(off) off.addEventListener("click", ()=>{ cromaEquip(key, null); codexRender(); });
  if(buy) buy.addEventListener("click", ()=>{
    gameConfirm(`¿Comprar la croma ${d.name} por ${fmtGold(cromaPrice(id))} de oro?`, {okText:"Comprar"}).then(ok=>{
      if(!ok) return; const r = cromaBuy(id); if(!r.ok){ gameAlert(r.reason); return; }
      if(own) cromaEquip(key, id);
      if(typeof playSfx==="function") playSfx("levelup");
      if(typeof showNetToast==="function") showNetToast(`🎨 CROMA ${d.name}${own ? " · equipada" : " · comprada"}`);
      if(typeof renderSaveLine==="function") renderSaveLine();
      codexRender();
    });
  });
}
// USAR una skin = equipar las piezas del set que ya tenés (sistema real de equipo: equipItem).
function codexEquipSet(key, setId){
  const pool = typeof itemPoolFor==="function" ? itemPoolFor(key) : [];
  const bySlot = {};
  for(const it of pool){ if(it && it.set === setId && !bySlot[it.type]) bySlot[it.type] = it; }
  for(const type in bySlot) equipItem(key, bySlot[type].uid);
}
let codexReturnTo = null; // la Tienda / el Inventario vuelven al Códice si se abrieron desde acá

/* ---------------- CRIATURA ---------------- */
function codexCreatureHtml(type){
  const B = ENEMY_BASE[type], L = CODEX_CREATURES[type] || {}, a = codexArenaOfType(type);
  const st = codexCreatureState(type), known = codexKnown(st), full = codexFullyKnown(st), rk = codexCreatureRank(type);
  const lv = codexFirstLevel(type), sp = CODEX_SPECIAL_RANK[type];
  const anims = [{l:"Moverse", p:{anim:"walk"}}, {l:"Quieto", p:{anim:"idle"}}, {l:"Ataque", p:{anim:"attack"}}]
    .concat(full ? (L.anims || []).map(x=>({l:x.l, p:{anim:"set", set:x.s}})) : []);
  const stage = `<div class="cx-stage">${_pv({kind:"enemy", key:type, anim:known?"walk":"idle", arena:a, silhouette:!known}, "cx-pv cx-stage-pv")}</div>
    ${known ? _animChips(anims) : ""}`;
  let panel = `<div class="cx-panel-head">${codexStepper()}<div class="cx-kicker"><span class="cx-rank cx-rank-${rk}">${CODEX_RANK_LABEL[rk]}</span> ${known && L.family ? "· " + _cxEsc(L.family) : ""}</div>
    <h2 class="cx-title">${known ? _cxEsc(B.name) : "???"}</h2>${_badge(st)}
    <div class="cx-links"><button class="cx-link" data-go="arena:${a}">⛩ ${_cxEsc(codexArenaTag(a))}${lv ? " · desde el nivel " + lv : ""}</button>
    ${sp && sp.of ? (codexBossDef(sp.of) ? `<button class="cx-link" data-go="boss:${sp.of}">♛ ${_cxEsc(codexLinkLabel("boss", sp.of))}</button>` : `<button class="cx-link" data-go="creature:${sp.of}">☠ ${_cxEsc(codexLinkLabel("creature", sp.of))}</button>`) : ""}</div></div>`;
  if(!known){
    panel += _sec("Sin descubrir", `<p>Todavía no te cruzaste con esta criatura. Aparece en <b>${_cxEsc(codexArenaTag(a))}</b>${lv ? ", a partir del nivel " + lv : ""}.</p><p class="cx-dim">Encontrala para desbloquear su nombre y lo básico; derrotala para completar su ficha.</p>`, "lore");
    return codexEntryHtml(stage, panel, "cx-entry-cre");
  }
  panel += _sec("Lore", `<p>${_cxEsc(L.lore || "")}</p>${full ? `${L.origin ? `<div class="cx-origin">Origen: <b>${_cxEsc(L.origin)}</b></div>` : ""}${L.horde ? `<div class="cx-origin">Con la Horda: <b>${_cxEsc(L.horde)}</b></div>` : ""}` : `<p class="cx-dim">Derrotala para saber de dónde viene y a quién sirve.</p>`}`, "lore");
  let combat = `<p><b>Comportamiento:</b> ${_cxEsc(L.behavior || "")}</p>`;
  if(full){
    combat += (L.attacks && L.attacks.length ? `<div class="cx-attacks">${L.attacks.map(x=>`<div class="cx-attack">⚔ ${_cxEsc(x)}</div>`).join("")}</div>` : "")
      + (L.mech ? `<div class="cx-mech">✦ ${_cxEsc(L.mech)}</div>` : "")
      + `<div class="cx-stats">${_statRow("Vida base", B.hp)}${_statRow("Daño base", B.dmg)}${_statRow("Velocidad", B.speed)}${B.ranged ? _statRow("A distancia", (B.range||0) + " u") : _statRow("Cuerpo a cuerpo", "sí")}</div>`;
  } else combat += `<p class="cx-dim">Derrotala para ver sus ataques y mecánicas.</p>`;
  panel += _sec("Información de combate", combat, "combat");
  if(full) panel += _sec("Botín", `<div class="cx-stats">${_statRow("Oro", B.gold||0)}${_statRow("XP", B.xp||0)}${_statRow("Objetos", B.dropsItem ? "puede soltar" : "no")}${_statRow("Derrotadas", codexSave().kills[type]||0)}</div>`);
  return codexEntryHtml(stage, panel, "cx-entry-cre");
}

/* ---------------- JEFE ---------------- */
function codexBossHtml(id){
  const b = codexBossDef(id), L = CODEX_BOSS_LORE[id] || {};
  const st = codexBossState(b), known = codexKnown(st), full = codexFullyKnown(st);
  const types = codexBossTypes(b), nForms = full ? b.forms.length : Math.min(b.forms.length, b.hidden ? b.hidden : b.forms.length);
  const tips = codexBossTips(types[0]);
  const fspec = i => { const F = codexFormSpec(b.forms[i]); return {forms:[F.type], key:F.type, form:0, atlas:F.atlas}; };
  const baseSpec = (!known && b.veil) ? {kind:"ambient", arena:b.arena, veil:true}
    : b.group ? {kind:"group", forms:types, anim:"idle", arena:b.arena, silhouette:!known}
    : Object.assign({kind:"enemy", anim:"idle", arena:b.arena, silhouette:!known}, fspec(0));
  const anims = [{l:"Quieto", p:{anim:"idle"}}, {l:"Moverse", p:{anim:"walk"}}, {l:"Ataque", p:{anim:"attack"}}];
  if(!b.group) for(let i = 1; i < nForms; i++) anims.push({l:"Forma: " + codexBossFormName(b, i), p:Object.assign({anim:"idle"}, fspec(i))});
  const stage = `<div class="cx-stage cx-stage-boss">${_pv(baseSpec, "cx-pv cx-stage-pv")}${known ? `<div class="cx-stage-name">${_cxEsc(codexBossName(b))}</div>` : ""}</div>${known ? _animChips(anims) : ""}`;
  const guard = b.guardian && (full || (known && id!=="hechicero_supremo" && id!=="hechicero_final"));
  let panel = `<div class="cx-panel-head">${codexStepper()}<div class="cx-kicker">${b.role==="jefe"?"JEFE":"SUBJEFE"} · nivel ${b.level}${guard ? ` · <span class="cx-guardian">GUARDIÁN ${["","I","II","III","IV"][b.guardian]}</span>` : ""}</div>
    <h2 class="cx-title">${known ? _cxEsc(codexBossName(b)) : "???"}</h2>
    ${known ? `<div class="cx-subtitle">${_cxEsc(codexBossSubtitle(b, tips, L, full, guard))}</div>` : ""}${_badge(st)}
    <div class="cx-links"><button class="cx-link" data-go="arena:${b.arena}">⛩ ${_cxEsc(codexArenaTag(b.arena))}</button>${codexBossRelLinks(b, full)}</div></div>`;
  if(!known){
    panel += _sec("Sin descubrir", `<p>Una presencia te espera en <b>${_cxEsc(codexArenaTag(b.arena))}</b> (nivel ${b.level}).</p><p class="cx-dim">Enfrentalo para desbloquear su ficha. El Códice no adelanta lo que todavía no viste.</p>`, "lore");
    return codexEntryHtml(stage, panel, "cx-entry-boss");
  }
  const isGuardReveal = (id==="hechicero_supremo" || id==="hechicero_final") && !full;
  panel += _sec("Lore", `<p>${_cxEsc(L.lore||"")}</p>${full ? _p(L.history) : ""}${full && L.spoiler ? `<div class="cx-reveal"><b>La verdad</b>${_p(L.spoiler)}</div>` : (L.spoiler ? `<p class="cx-dim">Hay algo más sobre ${_cxEsc(codexBossName(b))}. Derrotalo para saberlo.</p>` : "")}`, "lore");
  panel += _sec("En la campaña", _p(isGuardReveal ? `Aparece en ${codexArenaTag(b.arena)}.` : L.campaign), "lore");
  const phases = (L.phases || []).filter(ph=>full || !ph.spoiler);
  panel += _sec(`Fases (${phases.length}${!full && (L.phases||[]).length > phases.length ? " + ?" : ""})`, phases.map((ph, i)=>`<div class="cx-phase"><span class="cx-phase-n">${i+1}</span><div><b>${_cxEsc(ph.name)}</b><div class="cx-dim">${_cxEsc(ph.desc)}</div></div></div>`).join(""), "combat");
  const abil = (L.abilities || []).filter(x=>full || !x.f);
  panel += _sec("Habilidades · tocá una para verla", `<div class="cx-skills">${abil.map((x, i)=>`<button class="cx-skill" data-anim='${_cxEsc(JSON.stringify(Object.assign({anim:"skill", skill:x.fx || {fx:"nova"}}, b.group ? {kind:"enemy", forms:[types[Math.min(types.length-1, i)]], key:types[Math.min(types.length-1, i)]} : fspec(x.f||0)))).replace(/'/g,"&#39;")}'>
      <span class="cx-skill-ico">✦</span><span class="cx-skill-txt"><b>${_cxEsc(x.name)}</b>${x.f ? ` <i class="cx-ult">${_cxEsc(codexBossFormName(b, x.f))}</i>` : ""}<span class="cx-skill-desc">${_cxEsc(x.desc)}</span></span></button>`).join("")}</div>`, "combat");
  if(tips && tips.tips && tips.tips.length) panel += _sec("Cómo sobrevivir", `<ul class="cx-tips">${tips.tips.map(t=>`<li>${_cxEsc(t)}</li>`).join("")}</ul>`, "combat");
  panel += _sec("Recompensas", codexBossRewardsHtml(b, full));
  return codexEntryHtml(stage, panel, "cx-entry-boss");
}
// Epíteto real del jefe + su título del Códice, sin repetir partes (y sin adelantar que es Guardián).
function codexBossSubtitle(b, tips, L, full, guard){
  const parts = [], ep = tips && tips.epithet;
  if(ep) parts.push(ep);
  for(const p of String(L.title || "").split(" · ")){
    if(!p || parts.includes(p)) continue;
    if(/Guardián/.test(p) && !(full || guard)) continue;
    parts.push(p);
  }
  return parts.join(" · ");
}
function codexBossRelLinks(b, full){
  const out = [];
  if(b.id === "guardian_laberinto" && full) out.push(`<button class="cx-link" data-go="boss:minotauro">♛ ${_cxEsc(codexLinkLabel("boss","minotauro"))}</button>`);
  if(b.id === "minotauro") out.push(`<button class="cx-link" data-go="boss:guardian_laberinto">♛ ${_cxEsc(codexLinkLabel("boss","guardian_laberinto"))}</button>`);
  if(b.id === "hechicero_supremo" && full) out.push(`<button class="cx-link" data-go="boss:hechicero_final">♛ ${_cxEsc(codexLinkLabel("boss","hechicero_final"))}</button>`);
  if(b.id === "hechicero_final") out.push(`<button class="cx-link" data-go="boss:hechicero_supremo">♛ ${_cxEsc(codexLinkLabel("boss","hechicero_supremo"))}</button>`);
  for(const t in CODEX_SPECIAL_RANK) if(CODEX_SPECIAL_RANK[t].of === b.id && codexKnown(codexCreatureState(t))) out.push(`<button class="cx-link" data-go="creature:${t}">☠ ${_cxEsc(ENEMY_BASE[t].name)}</button>`);
  return out.join("");
}
function codexBossRewardsHtml(b, full){
  const out = [];
  const crystal = typeof CRYSTAL_BY_ARENA!=="undefined" && b.role==="jefe" ? CRYSTAL_BY_ARENA[b.arena] : null;
  if(crystal && b.guardian && (full || b.id!=="hechicero_final")){ const D = CRYSTAL_DEFS[crystal]; out.push(`<div class="cx-reward crystal" style="--c:${D.rgb}">◆ <b>${_cxEsc(D.name)}</b><span>${typeof crystalHas==="function" && crystalHas(crystal) ? "✔ en tu poder" : "al completar la arena"}</span></div>`); }
  if(b.role === "jefe") out.push(`<div class="cx-reward">🪙 <b>Cofre final</b><span>objetos según tu desempeño</span></div>`);
  const L = CODEX_BOSS_LORE[b.id] || {};
  for(const lid of (L.rewards || [])){ const N = typeof NAMED_LEGENDARIES!=="undefined" && NAMED_LEGENDARIES[lid]; if(N) out.push(`<div class="cx-reward legend">✦ <b>${_cxEsc(N.name)}</b><span>legendario · ${_cxEsc(N.epithet || "")}</span></div>`); }
  const sets = codexArenaSets(b.arena).slice(0, 2);
  if(sets.length) out.push(`<div class="cx-reward-sets">${sets.map(id=>`<button class="cx-link-card small" data-go="set:${id}"><b>${_cxEsc(SET_DB[id].name)}</b><span>set · afinidad con esta arena</span></button>`).join("")}</div>`);
  return out.join("");
}

/* ---------------- ARENA ---------------- */
function codexArenaSets(a){
  const W = (typeof SET_ARENA_WEIGHTS!=="undefined" && SET_ARENA_WEIGHTS[a]) || {};
  return Object.keys(W).filter(id=>SET_DB[id]).sort((x, y)=>W[y]-W[x]);
}
function codexArenaLegends(a){
  if(typeof NAMED_LEGENDARIES==="undefined") return [];
  return Object.entries(NAMED_LEGENDARIES).filter(([id, N])=>N.arenas && (N.arenas[a]||0) >= 3).map(([id, N])=>N);
}
function codexArenaHtml(a){
  const st = codexArenaState(a), L = CODEX_ARENA_LORE[a] || {}, n = campaignNumberLabel(a);
  const open = st === "open" || st === "cleared", brief = (typeof ARENA_BRIEF!=="undefined" && ARENA_BRIEF[a]) || null;
  const story = (typeof CAMPAIGN_STORY!=="undefined" && CAMPAIGN_STORY[a]) || {};
  const stage = `<div class="cx-stage cx-stage-arena">${st==="soon" ? "" : `<div class="cx-arena-img" style="background-image:url('${codexArenaImage(a)}')"></div>`}${_pv({kind:"ambient", arena:a, bg:"none"}, "cx-pv cx-amb")}
      <div class="cx-arena-cap"><span class="cx-arena-num">${n ? "ARENA " + n : "POSTGAME"}</span><span class="cx-arena-name">${_cxEsc(story.title || codexArenaName(a).toUpperCase())}</span>${story.sub ? `<span class="cx-arena-sub">${_cxEsc(story.sub)}</span>` : ""}</div></div>`;
  const stLbl = {soon:"EN CONSTRUCCIÓN", cleared:"✔ COMPLETADA", open:"DISPONIBLE", locked:"🔒 BLOQUEADA"}[st];
  let panel = `<div class="cx-panel-head">${codexStepper()}<div class="cx-kicker">${n ? "CAPÍTULO " + n + " DE 10" : "POSTGAME"} · ${stLbl}</div><h2 class="cx-title">${_cxEsc(codexArenaName(a))}</h2>
    ${ARENA_MODS[a] && ARENA_MODS[a].desc ? `<div class="cx-subtitle">${_cxEsc(ARENA_MODS[a].desc)}</div>` : ""}</div>`;
  if(st === "locked"){
    panel += _sec("Lore", `<p>${_cxEsc(L.why || "")}</p><p class="cx-dim">Completá la arena anterior para saber qué te espera.</p>`, "lore");
    panel += _sec("Lo que vive acá", codexArenaRosterHtml(a) + codexArenaBossesHtml(a));
    return codexEntryHtml(stage, panel, "cx-entry-arena");
  }
  panel += _sec("Lore", `${_p(L.lore)}${_p(L.history)}${L.why ? `<div class="cx-origin">Por qué llegan los héroes: <b>${_cxEsc(L.why)}</b></div>` : ""}${L.objective ? `<div class="cx-origin">Objetivo: <b>${_cxEsc(L.objective)}</b></div>` : ""}`, "lore");
  if(st === "cleared" && story.scar) panel += _sec("La Cicatriz", `<div class="cx-reveal"><b>✦</b>${_p(story.scar)}</div>`, "lore");
  if(L.soon){ panel += _sec("En construcción", `<p>Esta arena todavía no se puede jugar: su historia se cuenta ${a==="ciudad" ? "como prólogo antes de la Fábrica Sin Fin" : "en los textos del descenso hacia el Laberinto"}.</p>`); return codexEntryHtml(stage, panel, "cx-entry-arena"); }
  if(L.mechanics) panel += _sec("Mecánicas exclusivas", `<div class="cx-attacks">${L.mechanics.map(x=>`<div class="cx-attack">✦ ${_cxEsc(x)}</div>`).join("")}</div>`, "combat");
  if(brief) panel += _sec("Peligros", `<div class="cx-mech">☠ ${_cxEsc(brief.kill)}</div><div class="cx-mech ok">✚ ${_cxEsc(brief.help)}</div>${L.hazards ? `<div class="cx-hazards">${L.hazards.map(h=>`<span class="cx-chip static">${_cxEsc(h)}</span>`).join("")}</div>` : ""}`, "combat");
  if(CODEX_ARENA_ROSTER[a]) panel += _sec("Criaturas", codexArenaRosterHtml(a));
  panel += _sec("Guardián · Subjefe · Jefe", codexArenaBossesHtml(a));
  const sets = codexArenaSets(a).slice(0, 4), legs = codexArenaLegends(a).slice(0, 4);
  const crystal = typeof CRYSTAL_BY_ARENA!=="undefined" ? CRYSTAL_BY_ARENA[a] : null;
  panel += _sec("Recompensas relacionadas", `${crystal ? `<div class="cx-reward crystal" style="--c:${CRYSTAL_DEFS[crystal].rgb}">◆ <b>${_cxEsc(CRYSTAL_DEFS[crystal].name)}</b><span>cristal del Guardián</span></div>` : ""}
    ${sets.length ? `<div class="cx-reward-sets">${sets.map(id=>`<button class="cx-link-card small" data-go="set:${id}"><b>${_cxEsc(SET_DB[id].name)}</b><span>${_cxEsc(SET_DB[id].theme || "set")}</span></button>`).join("")}</div>` : ""}
    ${legs.map(N=>`<div class="cx-reward legend">✦ <b>${_cxEsc(N.name)}</b><span>legendario · ${_cxEsc(N.epithet||"")}</span></div>`).join("")}`);
  return codexEntryHtml(stage, panel, "cx-entry-arena");
}
function codexArenaRosterHtml(a){
  const list = CODEX_ARENA_ROSTER[a] || []; if(!list.length) return "";
  return `<div class="cx-mini-grid">${list.map(t=>{ const s = codexCreatureState(t), k = codexKnown(s);
    return `<button class="cx-mini" data-go="creature:${t}">${_pv({kind:"enemy", key:t, anim:"idle", arena:a, silhouette:!k, bg:"none", fps:12}, "cx-pv cx-mini-pv")}<span>${k ? _cxEsc(ENEMY_BASE[t].name) : "???"}</span></button>`; }).join("")}</div>`;
}
function codexArenaBossesHtml(a){
  const list = CODEX_BOSSES.filter(b=>b.arena===a); if(!list.length) return "";
  return `<div class="cx-mini-grid boss">${list.map(b=>{ const s = codexBossState(b), k = codexKnown(s), types = codexBossTypes(b);
    const spec = (!k && b.veil) ? {kind:"ambient", arena:a, veil:true, bg:"none", fps:12} : b.group ? {kind:"group", forms:types, anim:"idle", arena:a, silhouette:!k, bg:"none", fps:12} : {kind:"enemy", key:types[0], anim:"idle", arena:a, silhouette:!k, bg:"none", fps:12};
    return `<button class="cx-mini boss" data-go="boss:${b.id}">${_pv(spec, "cx-pv cx-mini-pv")}<span>${k ? _cxEsc(codexBossName(b)) : "???"}</span><i>${b.role==="jefe"?"Jefe":"Subjefe"}${b.guardian && codexFullyKnown(s) ? " · Guardián" : ""}</i></button>`; }).join("")}</div>`;
}

/* ---------------- SET (contextual: desde jefes, arenas, guardianes, skins) ---------------- */
function codexSetHtml(id){
  const S = SET_DB[id]; if(!S) return "";
  const full = typeof setFullCount==="function" ? setFullCount(id) : 4, miss = typeof shopSetMissing==="function" ? shopSetMissing(id) : [];
  const champ = S.champion || (typeof CHAMPION_SETS!=="undefined" && CHAMPION_SETS[id] && CHAMPION_SETS[id].champion);
  const skin = typeof SET_SKINS!=="undefined" && SET_SKINS[id];
  const stage = `<div class="cx-stage">${champ ? _pv({kind:"champ", key:champ, anim:"idle", arena:"champ", skin:skin ? id : undefined}, "cx-pv cx-stage-pv") : `<div class="cx-set-emblem" style="--c:${S.aura||"61,220,113"}">✦</div>`}</div>`;
  const arenas = Object.keys(typeof SET_ARENA_WEIGHTS!=="undefined" ? SET_ARENA_WEIGHTS : {}).filter(a=>(SET_ARENA_WEIGHTS[a][id]||0) > 0);
  let panel = `<div class="cx-panel-head"><div class="cx-kicker">SET · ${full} piezas${champ ? " · solo " + _cxEsc(CLASSES[champ].name) : " · universal"}</div><h2 class="cx-title set">${_cxEsc(S.name)}</h2>
    <div class="cx-subtitle">${_cxEsc(S.theme || "")}</div><div class="cx-links">${champ ? `<button class="cx-link" data-go="champ:${champ}">🛡 ${_cxEsc(CLASSES[champ].name)}</button>` : ""}${arenas.map(a=>`<button class="cx-link" data-go="arena:${a}">⛩ ${_cxEsc(codexArenaTag(a))}</button>`).join("")}</div></div>`;
  panel += _sec("Lore", _p(S.lore), "lore");
  panel += _sec("Bonus", (S.thresholds||[]).map(th=>`<div class="cx-phase"><span class="cx-phase-n">${th.count}</span><div class="cx-dim">${_cxEsc(th.desc)}</div></div>`).join(""), "combat");
  panel += _sec("Tus piezas", `<p>${full - miss.length} de ${full}${skin ? " · con el set completo aparece la skin <b>" + _cxEsc(skin.name) + "</b>" : ""}.</p>`);
  return codexEntryHtml(stage, panel, "cx-entry-set");
}

/* ---------------- botones fijos ---------------- */
document.getElementById("mainmenu-codex-btn").addEventListener("click", openCodex);
document.getElementById("codex-back-btn").addEventListener("click", codexBack);
