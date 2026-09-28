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
// mastery/masteryNodes son independientes por guardián, cambiar de guardián nunca comparte esto.
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
    talents: mkTalentState(),
    croma:null}; // croma equipada (cosmético, js/systems/cromas.js)
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
    gold:TEST_START_GOLD, gems:0, // oro inicial: regalo único de la etapa de prueba (ver testStageReset) · GEMAS: recurso ganado jugando, SOLO para subir el nivel de objetos (js/systems/gems.js). No es moneda premium: una futura moneda premium va en otro campo.
    divineArenaUnlocked:false, // se pone true de verdad al completar las 5 arenas normales
    arenasCleared:{bosque:false, acuatica:false, fortaleza:false, micelial:false, hielo:false, abismo:false, laberinto:false, infernal:false},
    fortalezaMigrated:true, // (ver loadSave: solo los guardados de antes de la Fortaleza conservan el Hielo abierto)
    micelialMigrated:true,  // idem para el Reino Micelial (4ta arena, antes del Hielo)
    abismoMigrated:true,    // idem para la Arena del Abismo (antes del Laberinto): save.legacyLabOpen
    codex:{seen:{}, kills:{}},  // Códice: criaturas vistas y derrotadas (js/ui/codex/codex-track.js)
    campaignV2:true,        // ORDEN CANÓNICO de la campaña (ver loadSave: migración de arenas abiertas y cristales)
    ciudadV1:true,          // la Ciudad Maldita (Arena 01) pasó a ser jugable (ver loadSave: nadie pierde la arena que ya tenía abierta)
    talentTreeV2:true,      // el árbol de talentos tiene su propia bolsa desde el nivel 5 (ver talentTreeV2Migrate)
    minasV1:true,           // las Minas Profundas (Arena 09) pasaron a ser jugables y la campaña se reordenó (ver minasV1Migrate)
    legacyOpenArenas:[],    // arenas que un guardado viejo ya tenía abiertas antes del orden canónico
    campaignResetV1:true,   // modo campaña: ver campaignReset() en loadSave
    campaignResetV2:true,   // 2do reinicio (antes de la prueba con amigos): mismo mecanismo, versión nueva
    campaignResetV3:true,   // 3er reinicio (antes de la prueba real con un amigo): idem
    testStageV1:true,       // BUGFIX 01: reinicio de la etapa de prueba (nivel 1, bloqueados, solo la Arena 1, 10.000 de oro UNA vez)
    startGoldNotice:false,  // aviso del regalo inicial pendiente de mostrar (se muestra una vez y se apaga)
    starterChosen:false,    // todavía no eligió su guardián de regalo (pantalla "Tu primer guardián")
    firstRun:null,          // PRIMER ARRANQUE CORTO (js/ui/hub.js): "jugando" en la primera partida, "hub" hasta tocar JUGAR
    playtestV1Bonus:true,   // el bono de 2.000 de oro del playtest anterior ya no se da en la campaña
    relics:{hp:0,dmg:0,def:0,vel:0}, // permanent small stat items found from élite+ enemies
    lootPity:{legendario:0, set:0, mitico:0, unico:0}, // protección suave contra la mala suerte (oculta), ver js/data/loot.js
    stash:[], stashV1:true, affixV1:true, // inventario de la CUENTA (30 espacios, compartido por los guardianes): ver js/systems/items.js
    crystals:{ancestral:false, escarcha:false, piedra:false}, // cristales de los Guardianes (js/systems/crystals.js)
    collection:{},          // objetos con nombre propio / sets / míticos / únicos descubiertos alguna vez (catálogo)
    cromas:{},              // cromas compradas (cosméticas, oro del juego): {id:true}; la equipada va en champions[k].croma (js/systems/cromas.js)
    shop:null,              // ofertas de objetos del día (js/systems/shop.js)
    quests:null,            // logros, desafíos, pase de temporada y perfil (js/systems/quests.js: questsNormalize completa los campos)
    // DIFICULTADES (js/systems/difficulty-tiers.js): arenas superadas en Pesadilla / Infierno (Normal es
    // arenasCleared), la elegida en la Sala y las derrotas de la cuenta (las 3 primeras no se castigan)
    diffCleared:{pesadilla:{}, infierno:{}}, diffSelected:"normal", defeatCount:0,
    recycleDust:0           // RECICLAJE (js/systems/ground-loot.js): fracción de Gema juntada al reciclar Comunes/Raros con el inventario lleno
  };
}
// ETAPA DE PRUEBA (BUGFIX 01): cada perfil empieza con 10.000 de oro UNA sola vez para probar tienda,
// guardianes, objetos y sets. Va en el guardado nuevo (defaultSave) o se da en el reinicio de la etapa
// (testStageReset, marcado con testStageV1): recargar, reconectar, morir o cambiar de arena no lo repite
// porque el oro se lee siempre del guardado persistido.
const TEST_START_GOLD = 10000;
let save = defaultSave();
// MODO PRUEBA (pedido para seguir probando): todos los guardianes liberados y todas las arenas de la
// campaña abiertas, en guardados nuevos y viejos. No toca niveles, oro, objetos ni talentos.
// Para volver al modo campaña normal, poner esto en false. (Las pruebas automáticas de la campaña
// lo apagan definiendo window.__campaignMode antes de cargar la página.)
// BUGFIX 01: apagado. La campaña es secuencial (solo la Arena 1 abierta) y los guardianes se compran.
const PLAYTEST_UNLOCK_ALL = false;
function applyPlaytestUnlock(){
  if(!PLAYTEST_UNLOCK_ALL) return;
  let changed = !save.starterChosen;
  for(const k in save.champions){ if(!save.champions[k].unlocked){ save.champions[k].unlocked = true; changed = true; } }
  save.starterChosen = true;
  if(changed) persist();
}
// MODO DESARROLLADOR (auditoría pre-alfa): los regalos de prueba de abajo (nivel 90, todas las arenas,
// todas las skins) ya NO se dan a cualquier perfil nuevo: un jugador que recibe el enlace por primera vez
// juega la campaña real (guardián de regalo, Arena 01, nivel 1). Los perfiles que ya los recibieron los
// conservan (quedan marcados en el guardado). Para darlos en un perfil nuevo: abrir el juego con ?dev=1
// (queda recordado en ese navegador; ?dev=0 lo apaga).
function laHordaDevMode(){
  if(typeof window==="undefined" || window.__campaignMode) return false;
  try{
    const q = new URLSearchParams(location.search).get("dev");
    if(q==="1") localStorage.setItem("laHordaDev", "1"); else if(q==="0") localStorage.removeItem("laHordaDev");
    return localStorage.getItem("laHordaDev")==="1";
  }catch(e){ return false; }
}
// PEDIDO DEL USUARIO (al terminar la prueba de la Ciudad Maldita): TODAS las arenas abiertas (también la
// Divina) y TODOS los guardianes liberados en nivel 90, UNA sola vez por perfil (testUnlock90V1). Los puntos
// de talento de esos niveles se suman igual que al subir jugando (1 por nivel); no se tocan objetos, oro
// ni lo que ya estaba completado. Las pruebas automáticas de campaña lo saltean (window.__campaignMode).
function applyTestUnlock90(){
  if(save.testUnlock90V1 || !laHordaDevMode()) return;
  for(const k in save.champions){
    const c = save.champions[k];
    c.unlocked = true;
    if((c.level||1) < 90){ c.talentPoints = (c.talentPoints||0) + (90 - (c.level||1)); c.level = 90; c.xp = 0; }
  }
  save.starterChosen = true;
  save.legacyOpenArenas = ARENA_ORDER.slice();
  save.divineArenaUnlocked = true;
  save.testUnlock90V1 = true;
  persist();
}
// PEDIDO DEL USUARIO: todas las skins compradas y puestas, UNA sola vez por perfil (testSkinsV1).
// Una skin es su set completo (nunca se vende suelta): se agregan como compradas las piezas que falten
// de cada set con arte y se equipan en su guardián, igual que al comprarla en la Tienda. Las piezas
// equipadas no ocupan lugar en el inventario, así que entran aunque esté lleno.
function applyTestSkins(){
  if(save.testSkinsV1 || !laHordaDevMode()) return;
  if(typeof SET_SKINS==="undefined" || typeof makeDesignedItem!=="function" || typeof skinEquipOn!=="function") return;
  for(const id in SET_SKINS){
    const k = skinSetChamp(id);
    if(!k || !save.champions[k]) continue;
    for(const p of shopSetMissing(id)){
      const it = makeDesignedItem(p); if(!it) continue;
      it.bought = true;
      stashItems().push(it);
      if(typeof collectionRegister==="function") collectionRegister(it);
    }
    skinEquipOn(id, k);
  }
  save.testSkinsV1 = true;
  persist();
}
function loadSave(){
  try{ _loadSaveInner(); }finally{ applyPlaytestUnlock(); applyTestUnlock90(); applyTestSkins();
    // logros/desafíos/pase: completa los campos que falten (guardados viejos) y rota los desafíos del día
    if(typeof questsOnLoad==="function") questsOnLoad(); }
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
        // Object.assign no pisa "unlocked" si el guardián ya estaba guardado de antes sin ese
        // campo -> las partidas viejas conservan sus guardianes ya jugados como desbloqueados.
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
      save.cromas = (parsed.cromas && typeof parsed.cromas==="object") ? Object.assign({}, parsed.cromas) : {};
      // La Fortaleza (3ra arena) llegó después: un guardado viejo que ya había superado la
      // Acuática tenía abierto el Hielo, y lo conserva (una sola vez, al cargar por primera vez).
      // MODO CAMPAÑA: la prueba de campaña arranca de cero para todos -todos los guardianes a
      // nivel 1, sin talentos ni maestría, bloqueados (se elige uno de regalo y el resto se
      // compra), campaña y oro en cero-. Los objetos se conservan. El guardado anterior queda
      // copiado entero en localStorage (SAVE_KEY + "_antesDeCampania") por si hay que volver
      // atrás. campaignResetV2/V3 son reinicios siguientes (mismo mecanismo, flag nueva cada
      // vez): sirven para volver a arrancar de cero a quien ya jugó con la flag anterior puesta
      // (ej. antes de una prueba real con amigos) sin tocar a un guardado recién creado, que ya
      // nace con todas las flags en true. Si hace falta otro reinicio más, agregar campaignResetV4
      // igual (acá, en defaultSave() y en campaignReset()).
      if(!parsed.campaignResetV3){ campaignReset(raw); }
      if(!parsed.testStageV1){ testStageReset(raw); }
      if(!parsed.fortalezaMigrated){ save.fortalezaMigrated = true; if(save.arenasCleared.acuatica && !save.arenasCleared.fortaleza) save.legacyHieloOpen = true; }
      // El Reino Micelial llegó como 4ta arena (entre la Fortaleza y el Hielo): quien ya había superado
      // la Fortaleza tenía el Hielo abierto, y lo conserva (una sola vez).
      if(!parsed.micelialMigrated){ save.micelialMigrated = true; if(save.arenasCleared.fortaleza && !save.arenasCleared.micelial) save.legacyHieloOpen = true; }
      // La Arena del Abismo llegó entre el Hielo y el Laberinto: quien ya había superado el Hielo tenía el
      // Laberinto abierto y lo conserva; quien ya había terminado la campaña conserva la Arena Divina.
      if(!parsed.abismoMigrated){ save.abismoMigrated = true; if(save.arenasCleared.hielo && !save.arenasCleared.abismo) save.legacyLabOpen = true; }
      // ORDEN CANÓNICO (campaignV2): las arenas cambian de ORDEN, no de ID (un guardado nunca lee otra
      // arena como completada). Lo que el guardado ya tenía abierto con el orden anterior lo conserva
      // (save.legacyOpenArenas); lo nuevo se abre por la frontera del orden canónico. Los cristales
      // pasan a los Guardianes canónicos (Bosque, Gélida, Laberinto): la Madre Espora ya no es Guardiana.
      if(!parsed.campaignV2){ campaignV2Migrate(parsed); persist(); }
      // La Ciudad Maldita (Arena 01) se volvió jugable: pasa a ser la frontera de la campaña. Quien ya había
      // avanzado conserva abierta la arena que tenía como frontera (y todo lo que ya había superado).
      if(!parsed.ciudadV1){ ciudadV1Migrate(); persist(); }
      // Las Minas Profundas se volvieron jugables como Arena 09 (Laberinto 07 · Abismo 08 · Minas 09 · Infernal 10):
      // quien ya tenía abierta una arena la conserva (en particular la Infernal para quien ya superó el Abismo).
      if(!parsed.minasV1){ minasV1Migrate(); persist(); }
      // TALENTOS TEMPRANOS (talentTreeV2): el árbol pasó a tener su propia bolsa de puntos (desde el
      // nivel 5, ver treePointsEarned en talents.js). Nadie pierde nada: lo que se había gastado en el
      // árbol vuelve a la bolsa del kit, los nodos comprados quedan y los puntos del árbol se dan
      // retroactivos según el nivel (si gastó más de lo que hoy daría su nivel, la diferencia queda
      // en treeBonus para que nunca quede "debiendo").
      if(!parsed.talentTreeV2){ talentTreeV2Migrate(); persistNow(); } // ya mismo (no con demora): recargar antes nunca devuelve dos veces
      save.gems = parsed.gems || 0;
      save.recycleDust = Math.max(0, Math.min(0.99, +parsed.recycleDust || 0));
      // dificultades: guardados de antes no las tienen (todo en Normal); forma segura siempre
      const dc = (parsed.diffCleared && typeof parsed.diffCleared==="object") ? parsed.diffCleared : {};
      save.diffCleared = {pesadilla:Object.assign({}, dc.pesadilla||{}), infierno:Object.assign({}, dc.infierno||{})};
      if(!["normal","pesadilla","infierno"].includes(save.diffSelected)) save.diffSelected = "normal";
      save.defeatCount = Math.max(0, parsed.defeatCount|0);
      // Si hubo migración de rareza, se escribe de vuelta ya mismo: si no, el localStorage
      // se queda con las claves viejas hasta la próxima mutación (equipar/vender/etc.), y una
      // sesión que solo mira sin tocar nada perdería el arreglo al cerrar el navegador.
      if(needsRarityMigration) persist();
    } else {
      save.startGoldNotice = true; persist(); // perfil nuevo: el regalo ya viene en defaultSave; queda guardado desde ya
    }
  }catch(e){ save = defaultSave(); }
}
function talentTreeV2Migrate(){
  save.talentTreeV2 = true;
  if(typeof treePointsSpent!=="function") return;
  for(const k in save.champions){
    const c = save.champions[k];
    const spent = treePointsSpent(k);
    if(spent <= 0) continue;
    c.talentPoints = (c.talentPoints||0) + spent;
    c.treeBonus = Math.max(0, spent - treePointsEarned(c.level||1));
  }
}
// Inventario de la cuenta (stashV1): antes cada guardián tenía su propio inventario. Se juntan todos
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
  // equipo que apunte a objetos inexistentes -> vacío; un objeto en dos guardianes -> se queda en el primero
  const used = new Set();
  for(const k in save.champions){
    const eq = save.champions[k].equipment;
    for(const sl in eq){ const uid = eq[sl]; if(!uid) continue; if(!seen.has(uid) || used.has(uid)) eq[sl] = null; else used.add(uid); }
  }
  save.stash = stash;
  save.collection = Object.assign({}, parsed.collection||{});
  save.lootPity = Object.assign({legendario:0, set:0, mitico:0, unico:0}, parsed.lootPity||{});
  if(!parsed.stashV1){ save.stashV1 = true; for(const it of stash) if(typeof collectionRegister==="function") collectionRegister(it, true); persist(); }
  // Afijos al azar (js/systems/affixes.js): los objetos de antes quedan válidos (mismo uid, nombre, nivel
  // y equipo) y reciben sus afijos según su rareza, siempre los mismos para el mismo objeto.
  if(!parsed.affixV1 && typeof migrateAffixesV1==="function"){ migrateAffixesV1(stash); save.affixV1 = true; persist(); }
}
function campaignV2Migrate(parsed){
  const cleared = save.arenasCleared || {}, old = LEGACY_ARENA_ORDER_V1;
  const oldOpen = k=>{ const i = old.indexOf(k); if(i===0) return true; if(k==="hielo" && save.legacyHieloOpen) return true;
    if(k==="laberinto" && save.legacyLabOpen) return true; return i > 0 && !!cleared[old[i-1]]; };
  const anyCleared = old.some(k=>cleared[k]);   // un perfil sin nada completado arranca como uno nuevo (solo la frontera)
  save.legacyOpenArenas = anyCleared ? old.filter(k=>!cleared[k] && oldOpen(k) && ARENA_ORDER.includes(k)) : [];
  // Arena Divina: quien ya la tenía (campaña terminada con el orden anterior) la conserva
  if(cleared.infernal) save.divineArenaUnlocked = true;
  const c = Object.assign({}, (parsed && parsed.crystals) || {});
  save.crystalsLegacyV1 = c;                                   // registro del estado anterior
  save.crystals = {ancestral: !!cleared.bosque, escarcha: !!(c.escarcha || cleared.hielo), piedra: !!(c.piedra || cleared.laberinto)};
  save.campaignV2 = true;
}
function ciudadV1Migrate(){
  save.ciudadV1 = true;
  const cleared = save.arenasCleared || {};
  if(!Object.keys(cleared).some(k=>cleared[k])) return;             // perfil sin nada completado: arranca por la Ciudad
  const oldFrontier = ARENA_ORDER.filter(k=>k!=="ciudad" && k!=="minas").find(k=>!cleared[k]);
  save.legacyOpenArenas = Array.isArray(save.legacyOpenArenas) ? save.legacyOpenArenas : [];
  if(oldFrontier && !save.legacyOpenArenas.includes(oldFrontier)) save.legacyOpenArenas.push(oldFrontier);
}
// Orden de campaña ANTES de que las Minas fueran jugables (las Minas estaban "en construcción").
const MINAS_PREV_ORDER = ["ciudad","fortaleza","bosque","micelial","hielo","acuatica","laberinto","abismo","infernal"];
function minasV1Migrate(){
  save.minasV1 = true;
  const cleared = save.arenasCleared || {};
  save.legacyOpenArenas = Array.isArray(save.legacyOpenArenas) ? save.legacyOpenArenas : [];
  // lo que estaba abierto con el orden anterior sigue abierto (la frontera vieja; lo superado ya cuenta)
  const oldFrontier = MINAS_PREV_ORDER.find(k=>!cleared[k]);
  if(oldFrontier && !save.legacyOpenArenas.includes(oldFrontier)) save.legacyOpenArenas.push(oldFrontier);
  // perfiles con TODAS las arenas abiertas (desbloqueo de prueba): también la nueva
  if(save.testUnlock90V1 && !save.legacyOpenArenas.includes("minas")) save.legacyOpenArenas.push("minas");
}
function campaignReset(raw){
  try{ if(!localStorage.getItem(SAVE_KEY+"_antesDeCampania")) localStorage.setItem(SAVE_KEY+"_antesDeCampania", raw); }catch(e){}
  for(const k in save.champions){
    const c = save.champions[k];
    c.level = 1; c.xp = 0; c.talentPoints = 0; c.unlocked = false;
    c.skillMastery = [mkMastery(), mkMastery(), mkMastery()]; c.ultMastery = mkMastery();
    c.talents = mkTalentState(); c.treeBonus = 0;
  }
  save.gold = 0;
  save.arenasCleared = defaultSave().arenasCleared;
  save.diffCleared = {pesadilla:{}, infierno:{}}; save.diffSelected = "normal";
  save.crystals = defaultSave().crystals;
  save.legacyHieloOpen = false; save.legacyLabOpen = false; save.fortalezaMigrated = true; save.micelialMigrated = true; save.abismoMigrated = true;
  save.campaignV2 = true; save.legacyOpenArenas = []; save.ciudadV1 = true; save.minasV1 = true;
  save.divineArenaUnlocked = false;
  save.starterChosen = false; save.lastChamp = null;
  save.playtestV1Bonus = true;
  save.campaignResetV1 = true;
  save.campaignResetV2 = true;
  save.campaignResetV3 = true;
  save.testStageV1 = true;
  persist();
}
// BUGFIX 01 — reinicio de la etapa de prueba (una sola vez por perfil, marcado con testStageV1):
// guardianes a nivel 1 y bloqueados (se elige UNO de regalo, el resto se compra), solo la Arena 1
// abierta, inventario y equipo vacíos y 10.000 de oro. El guardado anterior queda copiado en
// localStorage (SAVE_KEY + "_antesDeEtapaPrueba").
function testStageReset(raw){
  try{ if(!localStorage.getItem(SAVE_KEY+"_antesDeEtapaPrueba")) localStorage.setItem(SAVE_KEY+"_antesDeEtapaPrueba", raw); }catch(e){}
  campaignReset(raw);
  for(const k in save.champions) save.champions[k].equipment = mkEquipment();
  save.stash = []; save.gems = 0; save.relics = defaultSave().relics;
  save.lootPity = defaultSave().lootPity; save.shop = null;
  save.gold = TEST_START_GOLD;
  save.testStageV1 = true; save.startGoldNotice = true;
  persist();
}
// ¿Tiene que elegir todavía su guardián de regalo? Solo mientras no tenga ningún guardián propio
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
  // B1: mientras el anfitrión simula a un invitado, su guardián usa los datos del invitado;
  // netPersistView escribe siempre los datos propios del anfitrión.
  const data = (typeof netPersistView==="function") ? netPersistView(save) : save;
  try{ localStorage.setItem(SAVE_KEY, JSON.stringify(data)); }catch(e){ /* storage unavailable, continue in-memory */ }
  // CUENTAS: avisa que el guardado cambió (se sube a la nube con demora: js/net/account.js)
  if(typeof accountOnPersist==="function"){ try{ accountOnPersist(); }catch(e){} }
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
