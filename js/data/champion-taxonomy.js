"use strict";
/* ============================================================
   js/data/champion-taxonomy.js
   Champion categories, release state and acquisition rules. Pure data plus pure helpers:
   the browser loads it after js/data/champions.js and the server executes the same file in a
   vm context (server/entitlements.js), so no DOM, save or network access belongs here.

   Adding a category = one row in CHAMPION_CATEGORIES. Store, Codex, starter, admin and server
   read these flags; nothing compares champion ids by hand.
   ============================================================ */
var CHAMPION_CATEGORIES = {
  STANDARD: {label:"Standard", badge:"", order:0, visibleInStore:true, purchasable:true, grantable:true,
    competitiveAllowed:true, adminOnly:false, founderPresence:false, specialLobbyPresentation:false, starterEligible:true, balanceProfile:"standard"},
  FAMILY:   {label:"Family", badge:"FAMILIA", order:1, visibleInStore:true, purchasable:true, grantable:true,
    competitiveAllowed:true, adminOnly:false, founderPresence:false, specialLobbyPresentation:false, starterEligible:true, balanceProfile:"standard"},
  // Founders: canonical, non-commercial, outside normal progression and NEVER transferable. Ownership is
  // computed by the server from operator config (FOUNDER_ENTITLEMENT); it is not grantable from admin UI.
  FOUNDER:  {label:"Founder", badge:"FOUNDER", order:2, visibleInStore:true, purchasable:false, grantable:false,
    competitiveAllowed:false, adminOnly:false, founderPresence:true, specialLobbyPresentation:true, starterEligible:false, balanceProfile:"founder",
    showcasePrice:9999, storeNotice:"ESTE CAMPEÓN NO SE COMPRA. SE CONCEDE.", inspectNotice:"Campeón de Fundador. Solo puede ser concedido por el sistema."},
  // ASCENSIÓN: campeones especiales (más fuertes y mejor logrados). Se ven SIEMPRE en Guardianes (bloqueados si no
  // son tuyos); se ganan con logros de campaña y modos (js/systems/ascension-unlocks.js) o se compran por 9000 de oro.
  ASCENSION:{label:"Ascensión", badge:"ASCENSIÓN", order:1.5, visibleInStore:true, purchasable:true, grantable:true,
    competitiveAllowed:true, adminOnly:false, founderPresence:false, specialLobbyPresentation:false, starterEligible:false, balanceProfile:"ascension", priceGold:9000},
  // EVENT: availability comes from CHAMPION_EVENT_WINDOWS (dates live in data, never in code).
  EVENT:    {label:"Event", badge:"EVENTO", order:3, visibleInStore:true, purchasable:false, grantable:true,
    competitiveAllowed:true, adminOnly:false, founderPresence:false, specialLobbyPresentation:false, starterEligible:false, balanceProfile:"standard"},
  DEV:      {label:"Dev", badge:"DEV", order:4, visibleInStore:false, purchasable:false, grantable:true,
    competitiveAllowed:false, adminOnly:true, founderPresence:false, specialLobbyPresentation:false, starterEligible:false, balanceProfile:"exempt"},
  TESTER:   {label:"Tester", badge:"TESTER", order:5, visibleInStore:false, purchasable:false, grantable:true,
    competitiveAllowed:false, adminOnly:false, founderPresence:false, specialLobbyPresentation:false, starterEligible:false, balanceProfile:"standard"}
};

// DRAFT/INTERNAL: Test Lab only. TESTING: playable by owners/grantees, hidden from public store.
// RELEASED: normal. DISABLED: not selectable outside Test Lab; ownership data is preserved.
var CHAMPION_RELEASE_STATES = ["DRAFT", "INTERNAL", "TESTING", "RELEASED", "DISABLED"];

// Grant origins recorded by the server ledger.
var GRANT_ORIGINS = ["ADMIN_GRANT", "EVENT_REWARD", "PROGRESSION", "PURCHASE", "FOUNDER_ENTITLEMENT"];

// Per-champion overrides. Missing champions are STANDARD / RELEASED / PURCHASE (safe default for old data).
// founderKey binds a FOUNDER champion to server/operator-config.json "founders".<founderKey>.
var CHAMPION_TAXONOMY = {
  myla:  {category:"FAMILY"},
  ynara: {category:"FAMILY"},
  nano_gm: {category:"FOUNDER", founderKey:"nano", releaseState:"TESTING", acquisitionType:"FOUNDER_ENTITLEMENT"},
  facu_gm: {category:"FOUNDER", founderKey:"facu", releaseState:"TESTING", acquisitionType:"FOUNDER_ENTITLEMENT"},
  // Ascensión: visibles siempre; se ganan o se compran (ver la categoría ASCENSION). Su arte lo pintó El Pintor
  // (tools/art/painter) y pasa los gates de estilo y escala. artPending:true vuelve a dejar a un campeón como CONCEPTO
  // (bloqueado: ni compra ni logro ni concesión) mientras su arte no pase esos gates.
  aurelia:  {category:"ASCENSION"},
  khepri:   {category:"ASCENSION"},
  velmira:  {category:"ASCENSION"},
  vhal:     {category:"ASCENSION"},
  bront:    {category:"ASCENSION"},
  oriel:    {category:"ASCENSION"}
};

// EVENT infrastructure. Example shape (no event champion exists yet):
// some_id: {visible:true, start:"2026-12-01T00:00:00Z", end:"2026-12-31T23:59:59Z", purchasableDuringEvent:true,
//           specialPrice:1800, grantable:true, keepAfterEvent:true, exclusiveSkin:"skin_id", challengeReward:"challenge_id"}
var CHAMPION_EVENT_WINDOWS = {};

function championMeta(id){
  var row = Object.prototype.hasOwnProperty.call(CHAMPION_TAXONOMY, id) ? CHAMPION_TAXONOMY[id] : {};
  var category = Object.prototype.hasOwnProperty.call(CHAMPION_CATEGORIES, row.category) ? row.category : "STANDARD";
  var c = CHAMPION_CATEGORIES[category];
  var releaseState = CHAMPION_RELEASE_STATES.indexOf(row.releaseState) >= 0 ? row.releaseState : "RELEASED";
  var out = {id:id, category:category, releaseState:releaseState, acquisitionType:row.acquisitionType || (c.purchasable ? "PURCHASE" : "GRANT"), founderKey:row.founderKey || null, artPending:!!row.artPending};
  for(var k in c) if(!(k in out)) out[k] = c[k];
  // Arte pendiente: el campeón se exhibe como concepto y nadie puede conseguirlo hasta que su arte se apruebe.
  if(out.artPending){ out.purchasable = false; out.grantable = false; }
  return out;
}
function championEventWindow(id, now){
  var w = CHAMPION_EVENT_WINDOWS[id]; if(!w) return null;
  var start = Date.parse(w.start), end = Date.parse(w.end);
  return {config:w, active:isFinite(start) && isFinite(end) && now >= start && now < end};
}
// Public availability for a viewer who does not own the champion.
function championAvailability(id, now){
  var m = championMeta(id), released = m.releaseState === "RELEASED";
  var visible = released && m.visibleInStore, purchasable = released && m.purchasable;
  // Fundadores: vitrina pública desde TESTING (se muestran con su sello, no con un sprite sin aprobar).
  if(m.category === "FOUNDER") visible = m.visibleInStore && (released || m.releaseState === "TESTING");
  if(m.category === "EVENT"){
    var w = championEventWindow(id, now == null ? Date.now() : now);
    visible = released && !!(w && w.config.visible !== false && (w.active || w.config.visible === "always"));
    purchasable = released && !!(w && w.active && w.config.purchasableDuringEvent);
  }
  return {visible:visible, purchasable:purchasable, showcaseOnly:visible && !purchasable, meta:m};
}
// Can a player use an owned champion outside Test Lab?
function championPlayable(id){ var s = championMeta(id).releaseState; return s === "RELEASED" || s === "TESTING"; }
// Ownership must come from the server ledger, never from a client purchase.
// DISABLED keeps existing ownership untouched (disabling must never wipe progress).
function championRequiresServerGrant(id){ var m = championMeta(id); return !m.purchasable || m.category === "EVENT" || ["DRAFT","INTERNAL","TESTING"].indexOf(m.releaseState) >= 0; }
// Bots, rivales y rellenos automáticos: solo campeones publicados y comunes (nunca Fundadores ni internos).
function championBotEligible(id){ var m = championMeta(id); return m.releaseState === "RELEASED" && (m.category === "STANDARD" || m.category === "FAMILY"); }
// Rankings y modos competitivos.
function championCompetitive(id){ var m = championMeta(id); return !!m.competitiveAllowed && m.releaseState === "RELEASED"; }
// Progresión normal (logros de colección, contadores del Códice, desafíos): sin Fundadores ni sin publicar.
function championInProgression(id){ var m = championMeta(id); return m.category !== "FOUNDER" && m.category !== "DEV" && m.releaseState === "RELEASED"; }
function championsByCategory(ids){
  var out = {}; for(var i = 0; i < ids.length; i++){ var c = championMeta(ids[i]).category; (out[c] || (out[c] = [])).push(ids[i]); }
  return out;
}
