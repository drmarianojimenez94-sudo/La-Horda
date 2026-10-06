"use strict";
/* ============================================================
   js/systems/ascension-unlocks.js — CÓMO SE GANAN LOS CAMPEONES DE ASCENSIÓN
   Los campeones de la categoría ASCENSION (js/data/champion-taxonomy.js) se ven siempre en Guardianes,
   la Tienda y el Códice. Bloqueados, se consiguen de dos maneras:
     · con un logro de un modo distinto de juego (uno por campeón, tabla de abajo), o
     · comprándolos en la Tienda con oro (precio propio por campeón según lo difícil que es ganarlo: js/data/pricing.js).
   La comprobación corre al terminar cada partida (questsOnRunEnd) y al cargar el guardado (retroactivo: quien ya
   cumplió el logro antes de esta versión lo recibe al entrar). Nada de esto toca a los Fundadores.
   ============================================================ */
const ASCENSION_UNLOCKS = [
  {id:"aurelia", mode:"Campaña",        how:"Ganá la campaña: vencé al Rey de la Horda en la Arena Infernal.",
    check:s=>!!(s.arenasCleared && s.arenasCleared.infernal)},
  {id:"khepri",  mode:"Horda Infinita", how:"Llegá a la ronda 10 de la Horda Infinita.",
    check:s=>!!(s.endless && s.endless.best && ((s.endless.best.roundMax|0) >= 10 || (s.endless.best.round|0) >= 10))},
  {id:"velmira", mode:"Arena Divina",   how:"Derribá el castillo enemigo de la Arena Divina.",
    check:s=>((s.quests && s.quests.stats && s.quests.stats.divinaWins)|0) >= 1},
  {id:"vhal",    mode:"Pesadilla",      how:"Ganá 3 arenas en dificultad Pesadilla.",
    check:s=>Object.keys((s.diffCleared && s.diffCleared.pesadilla) || {}).length >= 3},
  {id:"bront",   mode:"Cooperativo",    how:"Ganá 3 arenas en cooperativo.",
    check:s=>((s.quests && s.quests.stats && s.quests.stats.coopWins)|0) >= 3},
  {id:"oriel",   mode:"Infierno",       how:"Ganá una arena en dificultad Infierno.",
    check:s=>Object.keys((s.diffCleared && s.diffCleared.infierno) || {}).length >= 1},
  {id:"saelis",  mode:"Sin caídas",     how:"Ganá 3 arenas sin caer ni una vez.",
    check:s=>((s.quests && s.quests.stats && s.quests.stats.deathless)|0) >= 3},
];
// Progreso hacia el logro: {have, need, pct} (los logros de "una vez" cuentan 0/1). Lo muestra la ficha del Códice.
const ASCENSION_PROGRESS = {
  aurelia:s=>({have:(s.arenasCleared && s.arenasCleared.infernal) ? 1 : 0, need:1}),
  khepri: s=>({have:Math.min(10, Math.max((s.endless && s.endless.best && (s.endless.best.roundMax|0)) || 0, (s.endless && s.endless.best && (s.endless.best.round|0)) || 0)), need:10}),
  velmira:s=>({have:Math.min(1, ((s.quests && s.quests.stats && s.quests.stats.divinaWins)|0)), need:1}),
  vhal:   s=>({have:Math.min(3, Object.keys((s.diffCleared && s.diffCleared.pesadilla) || {}).length), need:3}),
  bront:  s=>({have:Math.min(3, ((s.quests && s.quests.stats && s.quests.stats.coopWins)|0)), need:3}),
  oriel:  s=>({have:Math.min(1, Object.keys((s.diffCleared && s.diffCleared.infierno) || {}).length), need:1}),
  saelis: s=>({have:Math.min(3, ((s.quests && s.quests.stats && s.quests.stats.deathless)|0)), need:3})
};
function ascensionUnlockProgress(id, s){
  const f = ASCENSION_PROGRESS[id]; s = s || (typeof save !== "undefined" ? save : null);
  if(!f || !s) return null;
  let r = null; try{ r = f(s); }catch(e){ return null; }
  if(!r) return null;
  r.pct = Math.max(0, Math.min(100, Math.round(r.have / r.need * 100)));
  return r;
}
function ascensionUnlockOf(id){ return ASCENSION_UNLOCKS.find(u=>u.id===id) || null; }
// Texto corto para las tarjetas bloqueadas: "Se gana: … · o 🪙 <precio> en la Tienda".
function ascensionUnlockHint(id){
  const u = ascensionUnlockOf(id); if(!u) return "";
  const price = typeof shopChampionPrice === "function" ? shopChampionPrice(id) : pricingChampionGold(id, "ASCENSION");
  return `${u.mode}: ${u.how} · o 🪙 ${typeof fmtGold === "function" ? fmtGold(price) : price} en la Tienda`;
}
// Entrega los que ya se ganaron. silent=true al cargar (sin carteles en el título); devuelve los nuevos.
function ascensionCheckUnlocks(silent){
  if(typeof save === "undefined" || !save || !save.champions) return [];
  const got = [];
  for(const u of ASCENSION_UNLOCKS){
    if(typeof CLASSES === "undefined" || !CLASSES[u.id]) continue;
    if(typeof championMeta === "function" && championMeta(u.id).artPending) continue; // concepto: se libera cuando su arte se apruebe
    const c = save.champions[u.id] || (save.champions[u.id] = mkChampion(false));
    if(c.unlocked) continue;
    let ok = false; try{ ok = !!u.check(save); }catch(e){ ok = false; }
    if(!ok) continue;
    c.unlocked = true; got.push(u.id);
    if(!silent && typeof questsToast === "function")
      questsToast({kind:"ach", icon:"crown", tint:CLASSES[u.id].color || "#ffcf5c", head:"CAMPEÓN DE ASCENSIÓN DESBLOQUEADO", name:CLASSES[u.id].name, sub:u.how});
    else if(!silent && typeof showNetToast === "function") showNetToast(`✦ ${CLASSES[u.id].name} se unió a tus Guardianes`);
  }
  if(got.length && typeof persist === "function") persist();
  return got;
}
// Ganchos: al final de cada partida (todos los modos pasan por questsOnRunEnd) y al cargar.
if(typeof questsOnRunEnd === "function"){
  const _ascRunEnd = questsOnRunEnd;
  questsOnRunEnd = function(){ const r = _ascRunEnd.apply(this, arguments); ascensionCheckUnlocks(false); return r; };
}
if(typeof questsOnLoad === "function"){
  const _ascLoad = questsOnLoad;
  questsOnLoad = function(){ const r = _ascLoad.apply(this, arguments); ascensionCheckUnlocks(true); return r; };
}
// Si el guardado ya estaba cargado cuando llegó este archivo, revisar una vez.
ascensionCheckUnlocks(true);
