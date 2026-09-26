"use strict";
/* ============================================================
   js/storage/save.js
   Guardado permanente en localStorage: estructura del save, valores por defecto,
   carga con migración de partidas viejas y escritura.
   >>> Si cambia la forma del save, agregar la migración en loadSave().
   ============================================================ */

/* ============================================================
   SAVE / PERMANENT PROGRESSION
   ============================================================ */
const SAVE_KEY = "laHordaSave_v1";
// Maestría de una habilidad: nivel ganado por uso en combate (useLvl/useXp)
// + puntos de talento invertidos manualmente (alloc). Ambos se suman.
function mkMastery(){ return {useXp:0, useLvl:1, alloc:0}; }
// Talentos/Maestría (permanentes, ver sección "TALENTOS Y MAESTRÍAS" más abajo): nodes/picks/
// mastery/masteryNodes son independientes por campeón, cambiar de campeón nunca comparte esto.
function mkTalentState(){ return { nodes:{}, picks:{}, mastery:null, masteryNodes:{} }; }
// Nota: no puede iterar EQUIP_SLOT_TYPES acá (ese const se define más abajo en el archivo y
// defaultSave() ya corre en la carga inicial del módulo, antes de esa línea) -> las 6 ranuras
// van escritas a mano, en el mismo orden que ITEM_TYPES.
function mkEquipment(){
  return {arma:null, escudo:null, casco:null, pechera:null, guantes:null, botas:null};
}
function mkChampion(unlocked){
  return {level:1, xp:0, talentPoints:0, unlocked: unlocked!==false,
    skillMastery:[mkMastery(),mkMastery(),mkMastery()], ultMastery:mkMastery(),
    equipment:mkEquipment(), // uid de lo que lleva puesto; los objetos viven en save.stash (inventario de la cuenta)
    talents: mkTalentState()};
}
// Saves de antes del rediseño de rarezas usaban ["comun","magico","raro","legendario","mitico","unico"];
// "magico" pasó a llamarse "raro" y el viejo "raro" pasó a ser "muyraro" (ver RARITIES). Como
// "raro" es un string válido en AMBOS esquemas (con significado distinto), la única forma segura
// de no reinterpretar mal un objeto viejo es marcar el save con una versión de esquema: si el
// save cargado NO tiene esa marca, es de antes del cambio y se remapea completo; si ya la tiene,
// no se toca nada (evita corromper objetos nuevos que legítimamente son "raro").
const ITEM_SCHEMA_VERSION = 2;
const RARITY_KEY_MIGRATION_V1_TO_V2 = {magico:"raro", raro:"muyraro"};
function migrateItemRarity(it){
  if(it && RARITY_KEY_MIGRATION_V1_TO_V2[it.rarity]) it.rarity = RARITY_KEY_MIGRATION_V1_TO_V2[it.rarity];
  return it;
}
function defaultSave(){
  const champions = {};
  CHAMPION_CATALOG.forEach(c=>{ champions[c.id] = mkChampion(c.unlockedByDefault); });
  return {
    champions,
    itemSchemaV: ITEM_SCHEMA_VERSION,
    gold:0, gems:0, // GEMAS: recurso ganado jugando, SOLO para subir el nivel de objetos (js/systems/gems.js). No es moneda premium: una futura moneda premium va en otro campo.
    divineArenaUnlocked:false, // se pone true de verdad al completar las 5 arenas normales
    arenasCleared:{bosque:false, acuatica:false, fortaleza:false, micelial:false, hielo:false, laberinto:false, infernal:false},
    fortalezaMigrated:true, // (ver loadSave: solo los guardados de antes de la Fortaleza conservan el Hielo abierto)
    micelialMigrated:true,  // idem para el Reino Micelial (4ta arena, antes del Hielo)
    campaignResetV1:true,   // modo campaña: ver campaignReset() en loadSave
    campaignResetV2:true,   // 2do reinicio (antes de la prueba con amigos): mismo mecanismo, versión nueva
    campaignResetV3:true,   // 3er reinicio (antes de la prueba real con un amigo): idem
    starterChosen:false,    // todavía no eligió su campeón de regalo (pantalla "Tu primer campeón")
    playtestV1Bonus:true,   // el bono de 2.000 de oro del playtest anterior ya no se da en la campaña
    relics:{hp:0,dmg:0,def:0,vel:0}, // permanent small stat items found from élite+ enemies
    lootPity:{legendario:0, set:0, mitico:0, unico:0}, // protección suave contra la mala suerte (oculta), ver js/data/loot.js
    stash:[], stashV1:true, // inventario de la CUENTA (30 espacios, compartido por los campeones): ver js/systems/items.js
    crystals:{espora:false, escarcha:false, piedra:false}, // cristales de los Guardianes (js/systems/crystals.js)
    collection:{},          // objetos con nombre propio / sets / míticos / únicos descubiertos alguna vez (catálogo)
    shop:null               // ofertas de objetos del día (js/systems/shop.js)
  };
}
let save = defaultSave();
// MODO PRUEBA (pedido para seguir probando): todos los campeones liberados y todas las arenas de la
// campaña abiertas, en guardados nuevos y viejos. No toca niveles, oro, objetos ni talentos.
// Para volver al modo campaña normal, poner esto en false. (Las pruebas automáticas de la campaña
// lo apagan definiendo window.__campaignMode antes de cargar la página.)
const PLAYTEST_UNLOCK_ALL = !(typeof window!=="undefined" && window.__campaignMode);
function applyPlaytestUnlock(){
  if(!PLAYTEST_UNLOCK_ALL) return;
  let changed = !save.starterChosen;
  for(const k in save.champions){ if(!save.champions[k].unlocked){ save.champions[k].unlocked = true; changed = true; } }
  save.starterChosen = true;
  if(changed) persist();
}
function loadSave(){
  try{ _loadSaveInner(); }finally{ applyPlaytestUnlock(); }
}
function _loadSaveInner(){
  try{
    const raw = localStorage.getItem(SAVE_KEY);
    if(raw){
      const parsed = JSON.parse(raw);
      const needsRarityMigration = parsed.itemSchemaV !== ITEM_SCHEMA_VERSION;
      save = Object.assign(defaultSave(), parsed);
      save.itemSchemaV = ITEM_SCHEMA_VERSION;
      const defChamps = defaultSave().champions;
      save.champions = {};
      Object.keys(defChamps).forEach(k=>{
        const base = defChamps[k], loaded = (parsed.champions||{})[k] || {};
        // Object.assign no pisa "unlocked" si el campeón ya estaba guardado de antes sin ese
        // campo -> las partidas viejas conservan sus campeones ya jugados como desbloqueados.
        const merged = Object.assign({}, base, loaded);
        merged.skillMastery = [0,1,2].map(i => Object.assign(mkMastery(), (loaded.skillMastery||[])[i] || {}));
        merged.ultMastery = Object.assign(mkMastery(), loaded.ultMastery || {});
        merged._legacyInventory = (loaded.inventory || []).map(it => needsRarityMigration ? migrateItemRarity(it) : it);
        delete merged.inventory;
        merged.equipment = Object.assign(mkEquipment(), loaded.equipment || {});
        // Migración segura de saves viejos sin árbol de talentos: defaults vacíos, nunca
        // undefined (evita errores al leer nodes/picks/masteryNodes de una partida anterior).
        const loadedTalents = loaded.talents || {};
        merged.talents = {
          nodes: Object.assign({}, loadedTalents.nodes||{}),
          picks: Object.assign({}, loadedTalents.picks||{}),
          mastery: loadedTalents.mastery || null,
          masteryNodes: Object.assign({}, loadedTalents.masteryNodes||{})
        };
        save.champions[k] = merged;
      });
      migrateToAccountStash(parsed);
      save.relics = Object.assign(defaultSave().relics, parsed.relics||{});
      save.arenasCleared = Object.assign(defaultSave().arenasCleared, parsed.arenasCleared||{});
      save.crystals = Object.assign(defaultSave().crystals, parsed.crystals||{});
      // La Fortaleza (3ra arena) llegó después: un guardado viejo que ya había superado la
      // Acuática tenía abierto el Hielo, y lo conserva (una sola vez, al cargar por primera vez).
      // MODO CAMPAÑA: la prueba de campaña arranca de cero para todos -todos los campeones a
      // nivel 1, sin talentos ni maestría, bloqueados (se elige uno de regalo y el resto se
      // compra), campaña y oro en cero-. Los objetos se conservan. El guardado anterior queda
      // copiado entero en localStorage (SAVE_KEY + "_antesDeCampania") por si hay que volver
      // atrás. campaignResetV2/V3 son reinicios siguientes (mismo mecanismo, flag nueva cada
      // vez): sirven para volver a arrancar de cero a quien ya jugó con la flag anterior puesta
      // (ej. antes de una prueba real con amigos) sin tocar a un guardado recién creado, que ya
      // nace con todas las flags en true. Si hace falta otro reinicio más, agregar campaignResetV4
      // igual (acá, en defaultSave() y en campaignReset()).
      if(!parsed.campaignResetV3){ campaignReset(raw); }
      if(!parsed.fortalezaMigrated){ save.fortalezaMigrated = true; if(save.arenasCleared.acuatica && !save.arenasCleared.fortaleza) save.legacyHieloOpen = true; }
      // El Reino Micelial llegó como 4ta arena (entre la Fortaleza y el Hielo): quien ya había superado
      // la Fortaleza tenía el Hielo abierto, y lo conserva (una sola vez).
      if(!parsed.micelialMigrated){ save.micelialMigrated = true; if(save.arenasCleared.fortaleza && !save.arenasCleared.micelial) save.legacyHieloOpen = true; }
      save.gems = parsed.gems || 0;
      // Si hubo migración de rareza, se escribe de vuelta ya mismo: si no, el localStorage
      // se queda con las claves viejas hasta la próxima mutación (equipar/vender/etc.), y una
      // sesión que solo mira sin tocar nada perdería el arreglo al cerrar el navegador.
      if(needsRarityMigration) persist();
    }
  }catch(e){ save = defaultSave(); }
}
// Inventario de la cuenta (stashV1): antes cada campeón tenía su propio inventario. Se juntan todos
// en save.stash sin perder nada (aunque pase los 30 espacios: solo se frena el botín nuevo hasta
// vender/descartar). Los objetos procedurales pasan a ser universales. Los "Únicos de prueba"
// ([PLACEHOLDER]) se convierten en Legendarios: un Único real es un jackpot diseñado a mano.
function migrateToAccountStash(parsed){
  const stash = Array.isArray(parsed.stash) ? parsed.stash.filter(Boolean) : [];
  const seen = new Set(stash.map(it=>it.uid));
  for(const k in save.champions){
    const c = save.champions[k];
    for(const it of (c._legacyInventory||[])){ if(it && !seen.has(it.uid)){ stash.push(it); seen.add(it.uid); } }
    delete c._legacyInventory;
  }
  for(const it of stash){
    if(!it.designed) it.champion = null;
    if(it.placeholder && it.rarity==="unico"){
      it.rarity = "legendario"; it.placeholder = false; it.value = RARITY_VALUES[it.type].legendario; it.mythicPassive = null;
      it.name = (typeof proceduralItemName==="function") ? proceduralItemName(it.type, "legendario", it.legendProc) : "Legendario";
    }
  }
  // equipo que apunte a objetos inexistentes -> vacío; un objeto en dos campeones -> se queda en el primero
  const used = new Set();
  for(const k in save.champions){
    const eq = save.champions[k].equipment;
    for(const sl in eq){ const uid = eq[sl]; if(!uid) continue; if(!seen.has(uid) || used.has(uid)) eq[sl] = null; else used.add(uid); }
  }
  save.stash = stash;
  save.collection = Object.assign({}, parsed.collection||{});
  save.lootPity = Object.assign({legendario:0, set:0, mitico:0, unico:0}, parsed.lootPity||{});
  if(!parsed.stashV1){ save.stashV1 = true; for(const it of stash) if(typeof collectionRegister==="function") collectionRegister(it, true); persist(); }
}
function campaignReset(raw){
  try{ if(!localStorage.getItem(SAVE_KEY+"_antesDeCampania")) localStorage.setItem(SAVE_KEY+"_antesDeCampania", raw); }catch(e){}
  for(const k in save.champions){
    const c = save.champions[k];
    c.level = 1; c.xp = 0; c.talentPoints = 0; c.unlocked = false;
    c.skillMastery = [mkMastery(), mkMastery(), mkMastery()]; c.ultMastery = mkMastery();
    c.talents = mkTalentState();
  }
  save.gold = 0;
  save.arenasCleared = defaultSave().arenasCleared;
  save.crystals = defaultSave().crystals;
  save.legacyHieloOpen = false; save.fortalezaMigrated = true; save.micelialMigrated = true;
  save.divineArenaUnlocked = false;
  save.starterChosen = false; save.lastChamp = null;
  save.playtestV1Bonus = true;
  save.campaignResetV1 = true;
  save.campaignResetV2 = true;
  save.campaignResetV3 = true;
  persist();
}
// ¿Tiene que elegir todavía su campeón de regalo? Solo mientras no tenga ningún campeón propio
// (save.starterChosen queda como registro de que ya lo eligió).
function needsStarterChampion(){
  return !Object.keys(save.champions).some(k=>save.champions[k].unlocked);
}
// Durante la partida se guarda como mucho una vez cada 1.5 s: antes cada baja (XP + oro)
// serializaba el guardado completo -con los inventarios de los 10 campeones- y lo escribía en
// localStorage, varias veces por cuadro en las peleas grandes. Fuera de la partida (menús,
// pausa, fin de partida) se sigue guardando al instante, igual que siempre.
let _persistTimer = null;
function persistNow(){
  if(_persistTimer){ clearTimeout(_persistTimer); _persistTimer = null; }
  // B1: mientras el anfitrión simula a un invitado, su campeón usa los datos del invitado;
  // netPersistView escribe siempre los datos propios del anfitrión.
  const data = (typeof netPersistView==="function") ? netPersistView(save) : save;
  try{ localStorage.setItem(SAVE_KEY, JSON.stringify(data)); }catch(e){ /* storage unavailable, continue in-memory */ }
}
function persist(){
  if(typeof invalidatePassiveCache==="function") invalidatePassiveCache();
  if(typeof state!=="undefined" && state==="playing"){
    if(!_persistTimer) _persistTimer = setTimeout(persistNow, 1500);
    return;
  }
  persistNow();
}
window.addEventListener("pagehide", ()=>{ if(_persistTimer) persistNow(); });
document.addEventListener("visibilitychange", ()=>{ if(document.visibilityState==="hidden" && _persistTimer) persistNow(); });
