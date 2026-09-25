"use strict";
/* ============================================================
   js/systems/items.js
   Sistema de objetos: creación, equipar, inventario, vender, fusionar, sets y pasivas.
   ============================================================ */

// IA de los aliados: si tienen objetos sin equipar en su inventario PERMANENTE (ganado en
// partidas anteriores jugando esa clase), se ponen el mejor disponible en cada ranura vacía.
// Nunca toca una ranura que el jugador ya haya elegido a mano.
function autoEquipBest(classKey){
  const champ = save.champions[classKey];
  if(!champ) return;
  champ.equipment = Object.assign(mkEquipment(), champ.equipment||{});
  EQUIP_SLOT_TYPES.forEach(type=>{
    if(champ.equipment[type]) return;
    const candidates = (champ.inventory||[]).filter(it=>it.type===type);
    if(!candidates.length) return;
    candidates.sort((a,b)=> rarityIndex(b.rarity)-rarityIndex(a.rarity) || b.value-a.value);
    champ.equipment[type] = candidates[0].uid;
  });
  persist();
}
function weaponLabelFor(classKey){ return CLASS_WEAPON_LABEL[classKey] || ITEM_TYPES.arma.label; }

function rarityIndex(r){ return RARITIES.indexOf(r); }
// Cuenta piezas del set X equipadas por el campeón (0 si no tiene ninguna).
function equippedSetCount(champKey, setId){
  let n = 0;
  EQUIP_SLOT_TYPES.forEach(type=>{ const it = equippedItem(champKey, type); if(it && it.set===setId) n++; });
  return n;
}
// Todos los bonus de set (de cualquier set) actualmente ACTIVOS para un campeón, listos para
// concatenar en equippedPassives(). Se recalcula siempre en caliente a partir de lo equipado
// -nunca queda un bonus "fantasma" al desequipar una pieza, sección 8-.
function activeSetBonusEffects(champKey){
  const out = [];
  for(const setId in SET_DB){
    const set = SET_DB[setId];
    const count = equippedSetCount(champKey, setId);
    set.thresholds.forEach(th=>{
      if(count >= th.count) (th.mods()||[]).forEach(m=>out.push(m));
    });
  }
  return out;
}
// Estado de un set para la UI (sección 8): piezas equipadas + qué umbrales están activos/bloqueados.
function setProgressFor(champKey, setId){
  const set = SET_DB[setId];
  const count = equippedSetCount(champKey, setId);
  return {set, count, total:Object.keys(set.pieces).length,
    thresholds: set.thresholds.map(th=>({count:th.count, desc:th.desc, active:count>=th.count}))};
}
// Sets con al menos 1 pieza equipada por el campeón (para mostrar en el panel de equipamiento).
function activeSetIdsFor(champKey){
  return Object.keys(SET_DB).filter(id=>equippedSetCount(champKey,id)>0);
}
// Instancia un objeto DISEÑADO (legendario/mítico real, o pieza de set) a partir de su ficha:
// stats garantizados por RARITY_VALUES (igual que un objeto procedural) + su identidad propia.
function makeDesignedItem(designId){
  const d = DESIGNED_ITEMS[designId];
  if(!d) return null;
  const meta = RARITY_META[d.rarity];
  const value = RARITY_VALUES[d.type][d.rarity];
  const mythicPassive = d.rarity==="mitico" ? instancePassive(rollFrom(PASSIVE_DB_MYTHIC,1)[0]) : null;
  const passives = (d.effectMods||[]).map((m,i)=>({id:d.id+"_eff"+i, name:d.passiveNames[i]||"Pasiva", desc:"", condition:"siempre", effect:m.effect, value:m.value}));
  return {
    uid: "it_"+(ITEM_UID_SEQ++)+"_"+Date.now().toString(36),
    type:d.type, rarity:d.rarity, designed:true, designId:d.id,
    name:d.name, icon:ITEM_TYPES[d.type].icon, statKey:d.type, value,
    passives, mythicPassive,
    champion:d.champion, set:d.set||null,
    skillMods: d.skillMods||null, skillOvercap: d.skillOvercap||null,
    placeholder:false,
    desc: `${d.lore} · +${Math.round(value*100)}% ${ITEM_TYPES[d.type].statLabel}${d.set?` · Set: ${SET_DB[d.set].name}`:""}${(d.skillMods||d.skillOvercap)?" · Modifica una habilidad":""}`
  };
}
// IDs de objetos diseñados disponibles para un campeón (los suyos + las piezas de set
// universales, champion:null). Se usan al generar recompensas de rareza legendario/mítico.
function designedItemsFor(classKey){
  return Object.values(DESIGNED_ITEMS).filter(d=> d.champion===null || d.champion===classKey);
}
function rollFrom(arr, n){
  const pool = arr.slice();
  const out = [];
  for(let i=0;i<n && pool.length;i++){
    const idx = Math.floor(Math.random()*pool.length);
    out.push(pool.splice(idx,1)[0]);
  }
  return out;
}
// Instancia una pasiva concreta (con su valor ya calculado) a partir de una entrada del catálogo
function instancePassive(def){
  return {id:def.id, name:def.name, desc:def.desc, condition:def.condition, effect:def.effect,
    value: Math.round(def.valueBase*1000)/1000};
}
let ITEM_UID_SEQ = 1;
// Genera un objeto nuevo 100% a partir de datos (sin casos especiales por objeto).
// type: "arma"|"casco"|"escudo" · rarity: una de RARITIES · champKey: compatible con ese campeón (o null = cualquiera)
function makeItem(type, rarity, champKey){
  const meta = RARITY_META[rarity];
  const value = RARITY_VALUES[type][rarity];
  const passiveDefs = rollFrom(PASSIVE_DB, meta.passives);
  const passives = passiveDefs.map(instancePassive);
  const mythicPassive = (rarity==="mitico"||rarity==="unico") ? instancePassive(rollFrom(PASSIVE_DB_MYTHIC,1)[0]) : null;
  const isPlaceholder = rarity==="unico"; // los únicos reales se diseñan a mano más adelante
  const clsName = champKey && CLASSES[champKey] ? CLASSES[champKey].name : "cualquier campeón";
  const uniqueWord = type==="arma" ? "Única" : "Único";
  return {
    uid: "it_"+(ITEM_UID_SEQ++)+"_"+Date.now().toString(36),
    type, rarity,
    name: isPlaceholder ? `[PLACEHOLDER] ${ITEM_TYPES[type].label} ${uniqueWord} de ${clsName}` : `${meta.label} ${ITEM_TYPES[type].label} de ${clsName}`,
    icon: ITEM_TYPES[type].icon,
    statKey: type, value,
    passives, mythicPassive,
    legendProc: LEGEND_PROC_POWER[rarity] ? LEGEND_PROC_IDS[(Math.random()*LEGEND_PROC_IDS.length)|0] : undefined,
    champion: champKey || null,
    placeholder: isPlaceholder,
    desc: isPlaceholder
      ? "Objeto ÚNICO de prueba: la estructura funciona, pero el diseño final de este objeto se hará a mano más adelante."
      : `+${Math.round(value*100)}% ${ITEM_TYPES[type].statLabel}${passives.length?` · ${passives.length} pasiva${passives.length>1?"s":""}`:""}${mythicPassive?" · 1 pasiva mítica":""}.`
  };
}
// Devuelve el objeto equipado en una ranura de un campeón (o null)
function equippedItem(champKey, type){
  const champ = save.champions[champKey];
  const uid = champ.equipment && champ.equipment[type];
  if(!uid) return null;
  return (champ.inventory||[]).find(it=>it.uid===uid) || null;
}
// Junta todas las pasivas (normales + míticas + el % garantizado de pechera/guantes/botas +
// bonus de set activos) de los 6 ítems equipados de un campeón.
function equippedPassives(champKey){
  const list = [];
  EQUIP_SLOT_TYPES.forEach(type=>{
    const it = equippedItem(champKey, type);
    if(!it) return;
    const mult = it.designed ? 1 : (PASSIVE_RARITY_MULT[it.rarity]||1);
    (it.passives||[]).forEach(p=>list.push(mult===1 ? p : {id:p.id, name:p.name, effect:p.effect, value:p.value*mult}));
    if(it.mythicPassive) list.push(it.mythicPassive);
    const guaranteedEffect = SLOT_GUARANTEED_EFFECT[type];
    if(guaranteedEffect) list.push({id:"slot_"+type, name:ITEM_TYPES[type].label, effect:guaranteedEffect, value:it.value});
  });
  activeSetBonusEffects(champKey).forEach(p=>list.push(p));
  return list;
}
// Suma el valor de todas las pasivas equipadas que coincidan con un efecto dado (p.ej. "dmg_mult").
// Caché por cuadro: passiveSum se consulta decenas de veces por cada golpe (daño, crítico,
// robo de vida, cooldown...) y antes rearmaba la lista de objetos+talentos en cada consulta.
// Ahora se arma una vez por campeón y por cuadro (update() llama a invalidatePassiveCache), y
// también al equipar/comprar talentos fuera de la partida.
let _passiveFrame = 1;
const _passiveCache = {};
function invalidatePassiveCache(){ _passiveFrame++; }
function _passiveBucket(champKey){
  let c = _passiveCache[champKey];
  if(c && c.frame===_passiveFrame) return c;
  c = _passiveCache[champKey] = {frame:_passiveFrame, sums:{}, procs:null};
  // Objeto equipado + talentos permanentes: mismo balde, mismo formato {effect,value} -así
  // TODA fórmula que ya consultaba pasivas de objeto (daño, cd, crítico, def, lifesteal, etc.)
  // automáticamente respeta también los talentos, sin que esa fórmula se entere de que existen.
  const all = equippedPassives(champKey).concat(talentPassives(champKey));
  for(const p of all) c.sums[p.effect] = (c.sums[p.effect]||0) + p.value;
  return c;
}
function passiveSum(champKey, effect){
  if(!champKey || !save || !save.champions[champKey]) return 0;
  return _passiveBucket(champKey).sums[effect] || 0;
}
// Poder legendario de un objeto (ver LEGEND_PROCS): el guardado en el objeto si lo tiene, o uno
// determinístico según su uid para objetos anteriores a este sistema.
function legendProcOf(it){
  if(!it || !LEGEND_PROC_POWER[it.rarity]) return null;
  if(it.legendProc && LEGEND_PROCS[it.legendProc]) return it.legendProc;
  let h = 0; const s = String(it.uid||it.name||"");
  for(let i=0;i<s.length;i++) h = (h*31 + s.charCodeAt(i)) >>> 0;
  return LEGEND_PROC_IDS[h % LEGEND_PROC_IDS.length];
}
// Poderes legendarios activos de un campeón: {procId: potencia} (se suman si dos objetos
// traen el mismo). Mismo caché por cuadro que passiveSum.
function heroProcs(champKey){
  if(!champKey || !save || !save.champions[champKey]) return null;
  const c = _passiveBucket(champKey);
  if(!c.procs){
    c.procs = {};
    EQUIP_SLOT_TYPES.forEach(type=>{
      const it = equippedItem(champKey, type);
      const id = legendProcOf(it);
      if(id) c.procs[id] = (c.procs[id]||0) + LEGEND_PROC_POWER[it.rarity];
    });
  }
  return c.procs;
}
// Texto de pasivas para la UI (inventario, recompensas): con su valor REAL (ya multiplicado por
// la rareza del objeto) y el poder legendario, si lo tiene.
const PASSIVE_PCT_EFFECTS = {dmg_mult:1, atkspeed_mult:1, cd_mult:1, lifesteal_add:1, heal_mult:1, def_add:1, skilldmg_mult:1, onhit_proc:1,
  hp_mult:1, speed_mult:1, crit_chance_add:1, crit_mult_add:1, energy_mult:1, overheal_shield_pct:1, mythic_execute:1, mythic_emergency_shield:1};
function itemPassivesHTML(it){
  const mult = it.designed ? 1 : (PASSIVE_RARITY_MULT[it.rarity]||1);
  const parts = (it.passives||[]).map(p=> PASSIVE_PCT_EFFECTS[p.effect] ? `${p.name} +${Math.round(p.value*mult*100)}%` : p.name);
  if(it.mythicPassive) parts.push("★ "+it.mythicPassive.name);
  let html = parts.join(" · ");
  const proc = legendProcOf(it);
  if(proc) html += `${html?"<br>":""}<span class="item-proc">✦ ${LEGEND_PROCS[proc].name}: ${LEGEND_PROCS[proc].desc}</span>`;
  return html;
}
// Sobrecarga Mítica: bonus de daño/velocidad mientras la vida esté por debajo del 50%.
function mythicExecuteBonus(h){
  if(!h.hp || !h.maxHp || h.hp >= h.maxHp*0.5 || !h.classKey) return 0;
  return passiveSum(h.classKey, "mythic_execute");
}
function equipItem(champKey, uid){
  const champ = save.champions[champKey];
  const item = (champ.inventory||[]).find(it=>it.uid===uid);
  if(!item) return;
  champ.equipment[item.type] = uid; // reemplaza lo que hubiera en esa ranura, sin duplicar bonificación
  invalidatePassiveCache();
  persist();
}
function unequipItem(champKey, type){
  const champ = save.champions[champKey];
  champ.equipment[type] = null;
  invalidatePassiveCache();
  persist();
}
function addItemToInventory(champKey, item){
  const champ = save.champions[champKey];
  champ.inventory = champ.inventory || [];
  if(champ.inventory.length >= INVENTORY_CAPACITY) return null; // inventario lleno
  champ.inventory.push(item);
  persist();
  return item;
}
// Quita el objeto del inventario (y lo desequipa primero si estaba puesto). "gold" indica si
// además otorga oro (vender) o no (descartar, sin recompensa, solo para liberar espacio ya).
function removeItemFromInventory(champKey, uid, grantGoldReward){
  const champ = save.champions[champKey];
  const idx = (champ.inventory||[]).findIndex(it=>it.uid===uid);
  if(idx===-1) return null;
  const item = champ.inventory[idx];
  Object.keys(champ.equipment).forEach(slot=>{ if(champ.equipment[slot]===uid) champ.equipment[slot]=null; });
  champ.inventory.splice(idx,1);
  if(grantGoldReward){ save.gold += SELL_VALUE[item.rarity]||10; }
  persist();
  return item;
}
function sellItem(champKey, uid){ return removeItemFromInventory(champKey, uid, true); }
function discardItem(champKey, uid){ return removeItemFromInventory(champKey, uid, false); }

// Fusión (sección 18): 3 objetos GENÉRICOS (sin nombre propio, sin set) del mismo tipo+rareza
// se combinan en 1 objeto procedural de la rareza siguiente. Los objetos diseñados a mano
// (legendarios/míticos con lore) y los de set NUNCA se fusionan -son demasiado específicos
// para "promediarse"-, y ÚNICO nunca sale de acá (sección 6): ni como entrada consumible más
// allá de mitico, ni como resultado.
function canFuseGroup(items){
  if(items.length!==3) return {ok:false, reason:"Elegí exactamente 3 objetos"};
  const [a,b,c] = items;
  if(!a || !b || !c) return {ok:false, reason:"Objeto inexistente"};
  if(a.type!==b.type || b.type!==c.type) return {ok:false, reason:"Deben ser del mismo tipo de equipamiento"};
  if(a.rarity!==b.rarity || b.rarity!==c.rarity) return {ok:false, reason:"Deben ser de la misma rareza"};
  if(a.rarity==="unico" || a.rarity==="mitico") return {ok:false, reason:"Esta rareza no se puede fusionar más"};
  if(a.designed || b.designed || c.designed) return {ok:false, reason:"Los objetos con nombre propio (legendarios/míticos/set) no se fusionan"};
  const nextRarity = RARITIES[rarityIndex(a.rarity)+1];
  return {ok:true, nextRarity, type:a.type};
}
function fuseItems(classKey, uids){
  const champ = save.champions[classKey];
  if(!champ || uids.length!==3) return {ok:false, reason:"Elegí exactamente 3 objetos"};
  const items = uids.map(u=>(champ.inventory||[]).find(it=>it.uid===u));
  const check = canFuseGroup(items);
  if(!check.ok) return check;
  uids.forEach(u=>removeItemFromInventory(classKey, u, false));
  const fused = makeItem(check.type, check.nextRarity, classKey);
  addItemToInventory(classKey, fused);
  return {ok:true, item:fused};
}
// Agrupa el inventario por tipo+rareza para ofrecer fusión de a 3 (solo grupos fusionables).
function fusableGroups(classKey){
  const champ = save.champions[classKey];
  const groups = {};
  (champ.inventory||[]).forEach(it=>{
    if(it.designed || it.rarity==="unico" || it.rarity==="mitico") return;
    const key = it.type+"|"+it.rarity;
    (groups[key] = groups[key]||[]).push(it);
  });
  return Object.values(groups).filter(g=>g.length>=3);
}

// Recalcula en caliente las estadísticas del héroe que se está jugando ahora mismo cuando
// el jugador equipa/desequipa algo desde la pausa (sin reconstruir el héroe ni tocar su HP actual).
function refreshEquippedStats(){
  if(!player) return;
  const base = computePlayerStats(player.classKey);
  player.baseDmg = base.dmg;
  player.def = base.def;
  player.baseSpeed = base.speed*(player.isBot?0.95:1)*arenaMods().heroSpeedMult;
  // Vida máxima: si sube (pechera nueva, etc.), la vida ACTUAL sube en la misma proporción del
  // aumento (no se rellena gratis a tope); si baja, la vida actual se recorta si hiciera falta.
  const newMaxHp = Math.round(base.hp * runStats.hpMult);
  if(newMaxHp !== player.maxHp){
    const hpDiff = newMaxHp - player.maxHp;
    player.maxHp = newMaxHp;
    player.hp = Math.max(1, Math.min(player.maxHp, player.hp + hpDiff));
  }
  const newItemMaxShield = Math.round(player.maxHp * (base.shieldPct||0));
  const diff = newItemMaxShield - (player.itemMaxShield||0);
  player.itemMaxShield = newItemMaxShield;
  player.itemShield = Math.max(0, Math.min(newItemMaxShield, (player.itemShield||0) + Math.max(0,diff)));
}
