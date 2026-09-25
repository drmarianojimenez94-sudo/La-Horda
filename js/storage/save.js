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
    inventory:[], equipment:mkEquipment(),
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
    gold:0, gems:0, // gemas: preparado para el futuro, todavía sin tienda premium ni compras reales
    divineArenaUnlocked:false, // se pone true de verdad al completar las 5 arenas normales
    arenasCleared:{bosque:false, acuatica:false, hielo:false, laberinto:false, infernal:false},
    relics:{hp:0,dmg:0,def:0,vel:0}, // permanent small stat items found from élite+ enemies
    lootPity:{legendario:0, set:0, mitico:0} // protección suave contra la mala suerte (oculta), ver js/data/loot.js
  };
}
let save = defaultSave();
function loadSave(){
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
        merged.inventory = (loaded.inventory || []).map(it => needsRarityMigration ? migrateItemRarity(it) : it);
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
      save.relics = Object.assign(defaultSave().relics, parsed.relics||{});
      save.gems = parsed.gems || 0;
      // Si hubo migración de rareza, se escribe de vuelta ya mismo: si no, el localStorage
      // se queda con las claves viejas hasta la próxima mutación (equipar/vender/etc.), y una
      // sesión que solo mira sin tocar nada perdería el arreglo al cerrar el navegador.
      if(needsRarityMigration) persist();
    }
  }catch(e){ save = defaultSave(); }
}
// Durante la partida se guarda como mucho una vez cada 1.5 s: antes cada baja (XP + oro)
// serializaba el guardado completo -con los inventarios de los 10 campeones- y lo escribía en
// localStorage, varias veces por cuadro en las peleas grandes. Fuera de la partida (menús,
// pausa, fin de partida) se sigue guardando al instante, igual que siempre.
let _persistTimer = null;
function persistNow(){
  if(_persistTimer){ clearTimeout(_persistTimer); _persistTimer = null; }
  try{ localStorage.setItem(SAVE_KEY, JSON.stringify(save)); }catch(e){ /* storage unavailable, continue in-memory */ }
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
