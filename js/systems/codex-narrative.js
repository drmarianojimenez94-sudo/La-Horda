"use strict";
/* ============================================================
   js/systems/codex-narrative.js
   EL CÓDICE COMO EJE NARRATIVO — lógica de disparo, omisión y persistencia del Libro de la Horda.
   Sin DOM: solo lee/escribe save.codexBook y decide cuándo toca mostrar algo. Los textos están en
   js/data/codex-book-text.js y el visor animado en js/ui/codex/codex-book.js.

   Qué se muestra y cuándo (todo es local, nunca viaja por la red):
     1. INTRODUCCIÓN grande: una sola vez, al terminar la elección del primer campeón (starter-select.js).
     2. FRAGMENTOS: uno por arena de la campaña, se ganan al completarla y aparecen en la pantalla de
        victoria (story.js); quedan siempre releíbles en Códice › El Libro.
     3. CARGA CORTA: una página de libro antes de entrar a una arena de campaña en solitario
        (run-intro.js), como mucho BOOK_SHORT_MAX veces por arena, apagable.
   Reglas que no se rompen:
     - NUNCA bloquea: siempre hay "Saltar", Esc o tocar; omitir cuenta como visto.
     - Nunca arranca por sí sola dentro de una sala/partida online ni jugando (no frena a nadie).
     - Todo se puede revisitar desde el Códice.
   Guardado: save.codexBook = {v, introSeen, introAt, frag:{arena:ts}, shortCount:{arena:n}, shortOff}.
   Guardados anteriores: ver codexBookMigrate (no pierde nada; quien ya tenía campeón no ve la intro
   a la fuerza, y las arenas ya superadas quedan como fragmentos "leídos" pero releíbles).
   ============================================================ */
const CODEX_BOOK_V = 1;
const BOOK_SHORT_MAX = 3;      // veces que la carga corta se muestra sola por arena
const BOOK_PAGE_MIN_MS = 600;  // un toque apurado no saltea una página sin leer (el botón Saltar sí corta)

function codexBookDefault(){ return {v:CODEX_BOOK_V, introSeen:false, introAt:0, frag:{}, shortCount:{}, shortOff:false}; }
function _cbObj(o){ return o && typeof o==="object" && !Array.isArray(o) ? o : {}; }
// Normaliza lo que haya guardado (o nada) sin perder campos desconocidos. `raw` = el guardado leído del disco.
function codexBookMigrate(raw){
  raw = _cbObj(raw);
  const cur = raw.codexBook;
  if(cur && typeof cur==="object"){
    const out = Object.assign(codexBookDefault(), cur);
    out.v = CODEX_BOOK_V; out.introSeen = !!out.introSeen; out.introAt = +out.introAt || 0; out.shortOff = !!out.shortOff;
    out.frag = Object.assign({}, _cbObj(cur.frag));
    out.shortCount = {}; const sc = _cbObj(cur.shortCount); for(const k in sc) out.shortCount[k] = Math.max(0, sc[k]|0);
    return out;
  }
  // Guardado de antes del Libro: no se fuerza la gran introducción a quien ya tiene guardián o ya jugó.
  const out = codexBookDefault();
  const champs = _cbObj(raw.champions);
  const hasChamp = !!raw.starterChosen || Object.keys(champs).some(k=>champs[k] && champs[k].unlocked);
  const cleared = _cbObj(raw.arenasCleared);
  out.introSeen = hasChamp || Object.keys(cleared).some(a=>cleared[a]);
  // las arenas que ya superó cuentan como fragmentos ya "vistos" (siguen releíbles en el Códice)
  for(const a of Object.keys(cleared)) if(cleared[a] && typeof BOOK_FRAGMENTS!=="undefined" && BOOK_FRAGMENTS[a]) out.frag[a] = 1;
  return out;
}
function codexBookSave(){
  if(typeof save==="undefined" || !save) return codexBookDefault();
  const cb = save.codexBook;
  if(!cb || typeof cb!=="object" || cb.v!==CODEX_BOOK_V || typeof cb.frag!=="object" || !cb.frag || typeof cb.shortCount!=="object" || !cb.shortCount)
    save.codexBook = codexBookMigrate({codexBook:cb});
  return save.codexBook;
}
function _cbPersist(){ try{ if(typeof persist==="function") persist(); }catch(e){} }

// Las pruebas automáticas viejas (navigator.webdriver) siguen el camino de antes, sin libro por iniciativa propia: igual que el
// regalo inicial (starter-gift.js) y el primer arranque. Las que miden el libro definen window.__codexBook = true (o __firstRun / ?primera=1).
function codexBookAutoEnabled(){
  try{
    if(typeof window==="undefined") return true;
    if(window.__codexBook===false) return false;
    if(window.__codexBook) return true;
    if(window.__firstRun || (typeof location!=="undefined" && /[?&]primera=1\b/.test(location.search))) return true;
    return !(typeof navigator!=="undefined" && navigator.webdriver);
  }catch(e){ return true; }
}
// ¿Se puede mostrar algo por iniciativa propia? No dentro de una sala/partida ni en modos que no usan el guardado real.
function codexBookCanAuto(){
  if(!codexBookAutoEnabled()) return false;
  try{
    if(typeof state!=="undefined" && (state==="playing" || state==="paused")) return false;
    if(typeof netInRoom==="function" && netInRoom()) return false;
    if(typeof netMatch!=="undefined" && netMatch) return false;
    if(typeof lanesOn==="function" && lanesOn()) return false;
    if(typeof testLabActive==="function" && testLabActive()) return false;
  }catch(e){ return false; }
  return true;
}

/* ---------------- 1. introducción ---------------- */
function codexBookIntroPages(){ return BOOK_INTRO_PAGES.map(p=>Object.assign({}, p)); }
// opts.joinsRoom: el flujo que sigue es entrar a la sala de otro: no se demora a nadie, queda para el Códice.
function codexBookIntroDue(opts){
  if(codexBookSave().introSeen) return false;
  if(opts && opts.joinsRoom) return false;
  return codexBookCanAuto();
}
function codexBookMarkIntro(){
  const cb = codexBookSave(); if(cb.introSeen) return;
  cb.introSeen = true; cb.introAt = Date.now(); _cbPersist();
}

/* ---------------- 2. fragmentos ---------------- */
function codexBookHasFragment(arena){ return typeof BOOK_FRAGMENTS!=="undefined" && !!BOOK_FRAGMENTS[arena]; }
function codexBookFragmentUnlocked(arena){
  return codexBookHasFragment(arena) && !!(typeof save!=="undefined" && save.arenasCleared && save.arenasCleared[arena]);
}
function codexBookFragmentPages(arena){
  const F = codexBookHasFragment(arena) ? BOOK_FRAGMENTS[arena] : null; if(!F) return null;
  const num = typeof campaignNumberLabel==="function" ? campaignNumberLabel(arena) : "";
  const pages = [
    {kicker:"FRAGMENTO" + (num ? " · ARENA " + num : ""), title:F.title, text:F.lore, art:"arena:" + arena},
    {kicker:"LO QUE APRENDISTE", title:F.topicTitle, text:F.lesson, art:F.topicArt}
  ];
  return pages.concat((F.extra || []).map(p=>Object.assign({}, p)));
}
function codexBookFragmentSeen(arena){ return !!codexBookSave().frag[arena]; }
function codexBookMarkFragment(arena){
  if(!codexBookHasFragment(arena)) return;
  const cb = codexBookSave(); if(cb.frag[arena] && cb.frag[arena]!==1) return;
  cb.frag[arena] = Date.now(); _cbPersist();
}
// Fragmentos ya ganados y todavía sin abrir (insignia "NUEVO" en el Códice). Los de saves viejos (valor 1) no cuentan.
function codexBookUnread(){
  const cb = codexBookSave();
  return Object.keys(BOOK_FRAGMENTS).filter(a=>codexBookFragmentUnlocked(a) && !cb.frag[a]);
}
function codexBookFragmentCount(){ return Object.keys(BOOK_FRAGMENTS).filter(codexBookFragmentUnlocked).length; }

/* ---------------- 3. carga corta ---------------- */
function codexBookShortPages(arena){
  const line = typeof BOOK_SHORT_LINES!=="undefined" ? BOOK_SHORT_LINES[arena] : null; if(!line) return null;
  const num = typeof campaignNumberLabel==="function" ? campaignNumberLabel(arena) : "";
  const label = (typeof ARENA_MODS!=="undefined" && ARENA_MODS[arena] && ARENA_MODS[arena].label) || arena;
  return [{kicker:num ? "ARENA " + num : "ARENA", title:String(label).toUpperCase(), text:line, art:"arena:" + arena}];
}
function codexBookShortDue(arena){
  const cb = codexBookSave();
  if(cb.shortOff || !BOOK_SHORT_LINES[arena]) return false;
  if(typeof endlessOn==="function" && endlessOn()) return false;
  if(typeof divinaMode!=="undefined" && divinaMode) return false;
  if((cb.shortCount[arena]|0) >= BOOK_SHORT_MAX) return false;
  return codexBookCanAuto();
}
function codexBookShortMark(arena){ const cb = codexBookSave(); cb.shortCount[arena] = (cb.shortCount[arena]|0) + 1; _cbPersist(); }
function codexBookSetShortOff(off){ codexBookSave().shortOff = !!off; _cbPersist(); }

/* ---------------- cobertura: ¿el recorrido enseña todo? ---------------- */
// Devuelve los temas cubiertos por los fragmentos de las arenas de la campaña y los que faltan.
function codexBookCoverage(){
  const topics = Object.keys(BOOK_FRAGMENTS).map(a=>BOOK_FRAGMENTS[a].topic);
  return {topics, missing:BOOK_REQUIRED_TOPICS.filter(t=>!topics.includes(t))};
}
