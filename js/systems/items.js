"use strict";
/* ============================================================
   js/systems/items.js
   Sistema de objetos: creación, equipar, inventario, vender, fusionar, sets y pasivas.
   INVENTARIO DE LA CUENTA: los objetos viven en save.stash (30 espacios, compartidos por todos
   los campeones: el botín es CRUZADO, podés ganar objetos de cualquier campeón). Cada campeón
   guarda en `equipment` los uid de lo que lleva puesto; lo equipado no ocupa espacio.
   Compatibilidad: los objetos genéricos y las piezas de set sirven a cualquiera; los diseñados
   para un campeón (champion:"mago", Únicos...) solo a ese campeón.
   Durante una partida en red, el registro del invitado trae sus propios objetos equipados
   (champ.loadoutItems) y se usan esos en vez del inventario del anfitrión.
   ============================================================ */

// Todos los objetos de la cuenta (o los del loadout de un invitado, en red).
function itemPoolFor(champKey){
  const c = champKey && save.champions[champKey];
  if(c && Array.isArray(c.loadoutItems)) return c.loadoutItems;
  if(!Array.isArray(save.stash)) save.stash = [];
  return save.stash;
}
function stashItems(){ if(!Array.isArray(save.stash)) save.stash = []; return save.stash; }
function findStashItem(uid){ return stashItems().find(it=>it.uid===uid) || null; }
// Qué campeón lleva puesto un objeto (o null).
function itemEquippedBy(uid){
  if(!uid) return null;
  for(const k in save.champions){ const eq = save.champions[k].equipment; if(eq && Object.values(eq).includes(uid)) return k; }
  return null;
}
function stashUsedSlots(){ return stashItems().filter(it=>!itemEquippedBy(it.uid)).length; }
function stashFull(){ return stashUsedSlots() >= INVENTORY_CAPACITY; }
// ¿Este campeón puede usar este objeto? Genéricos y sets: todos. Diseñados de campeón: solo él.
function canEquipItem(champKey, it){
  if(!it) return false;
  if(it.designed && it.champion && it.champion!==champKey) return false;
  return true;
}
// Bots: solo se ponen, en ranuras vacías, objetos diseñados PARA su campeón que nadie use (el
// inventario es de la cuenta: nunca le sacan un objeto genérico al jugador).
function autoEquipBest(classKey){
  const champ = save.champions[classKey];
  if(!champ) return;
  champ.equipment = Object.assign(mkEquipment(), champ.equipment||{});
  let changed = false;
  EQUIP_SLOT_TYPES.forEach(type=>{
    if(champ.equipment[type]) return;
    const candidates = stashItems().filter(it=>it.type===type && it.designed && it.champion===classKey && !itemEquippedBy(it.uid));
    if(!candidates.length) return;
    candidates.sort((a,b)=> rarityIndex(b.rarity)-rarityIndex(a.rarity) || b.value-a.value);
    champ.equipment[type] = candidates[0].uid; changed = true;
  });
  if(changed) persist();
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
  const value = RARITY_VALUES[d.type][d.rarity];
  const mythicPassive = (d.rarity==="mitico" && !d.mythic) ? instancePassive(rollFrom(PASSIVE_DB_MYTHIC,1)[0]) : null;
  const passives = (d.effectMods||[]).map((m,i)=>({id:d.id+"_eff"+i, name:d.passiveNames[i]||"Pasiva", desc:"", condition:"siempre", effect:m.effect, value:m.value}));
  const extra = d.set ? ` · Set: ${SET_DB[d.set].name}` : (d.mythic ? ` · ${MYTHIC_POWERS[d.mythic].name}` : (d.unique ? ` · ${UNIQUE_POWERS[d.unique].name}` : ""));
  return {
    uid: "it_"+(ITEM_UID_SEQ++)+"_"+Date.now().toString(36),
    type:d.type, rarity:d.rarity, designed:true, designId:d.id,
    name:d.name, epithet:d.epithet||null, icon:ITEM_TYPES[d.type].icon, statKey:d.type, value,
    passives, mythicPassive,
    champion:d.champion, set:d.set||null, element:d.element||null,
    legendProc:d.legendProc||undefined, mythic:d.mythic||null, unique:d.unique||null,
    skillMods: d.skillMods||null, skillOvercap: d.skillOvercap||null,
    placeholder:false,
    desc: `${d.lore} · +${Math.round(value*100)}% ${ITEM_TYPES[d.type].statLabel}${extra}${(d.skillMods||d.skillOvercap)?" · Modifica una habilidad":""}`
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
function _pickFrom(arr){ return arr[(Math.random()*arr.length)|0]; }
function _genderize(q, noun){ return q.replace("{o}", ITEM_NOUN_FEM[noun] ? (ITEM_NOUN_PLURAL[noun] ? "as" : "a") : (ITEM_NOUN_PLURAL[noun] ? "os" : "o")); }
// Nombre de un objeto procedural: "Yelmo Templado", "Hoja de Karzul, del Golpe Sísmico"...
function proceduralItemName(type, rarity, proc){
  const noun = _pickFrom(ITEM_NOUNS[type] || [ITEM_TYPES[type].label]);
  if(ITEM_QUALITY[rarity]) return noun + " " + _genderize(_pickFrom(ITEM_QUALITY[rarity]), noun);
  const proper = _pickFrom(LEGEND_PROPER_NAMES);
  return proc && LEGEND_PROC_EPITHET[proc] ? `${noun} de ${proper}, ${LEGEND_PROC_EPITHET[proc]}` : `${noun} de ${proper}`;
}
// Genera un objeto nuevo 100% a partir de datos (sin casos especiales por objeto). Los objetos
// procedurales son UNIVERSALES (cualquier campeón los puede usar): champKey solo queda como dato.
function makeItem(type, rarity, champKey){
  const meta = RARITY_META[rarity];
  const value = RARITY_VALUES[type][rarity];
  const passiveDefs = rollFrom(PASSIVE_DB, meta.passives);
  const passives = passiveDefs.map(instancePassive);
  const mythicPassive = (rarity==="mitico"||rarity==="unico") ? instancePassive(rollFrom(PASSIVE_DB_MYTHIC,1)[0]) : null;
  const legendProc = LEGEND_PROC_POWER[rarity] ? LEGEND_PROC_IDS[(Math.random()*LEGEND_PROC_IDS.length)|0] : undefined;
  return {
    uid: "it_"+(ITEM_UID_SEQ++)+"_"+Date.now().toString(36),
    type, rarity,
    name: proceduralItemName(type, rarity, legendProc),
    icon: ITEM_TYPES[type].icon,
    statKey: type, value,
    passives, mythicPassive,
    legendProc,
    champion: null,
    placeholder: false,
    desc: `+${Math.round(value*100)}% ${ITEM_TYPES[type].statLabel}${passives.length?` · ${passives.length} pasiva${passives.length>1?"s":""}`:""}${mythicPassive?" · 1 pasiva mítica":""}.`
  };
}
// Devuelve el objeto equipado en una ranura de un campeón (o null)
function equippedItem(champKey, type){
  const champ = save.champions[champKey];
  const uid = champ && champ.equipment && champ.equipment[type];
  if(!uid) return null;
  return itemPoolFor(champKey).find(it=>it.uid===uid) || null;
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
  if(!it || it.set || !LEGEND_PROC_POWER[it.rarity]) return null; // las piezas de set valen por el set
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
// Poderes míticos (MYTHIC_POWERS) y Único (UNIQUE_POWERS) equipados: {myth_x:1} / "uniq_x". Mismo caché.
function heroMythics(champKey){
  if(!champKey || !save || !save.champions[champKey]) return null;
  const c = _passiveBucket(champKey);
  if(!c.myths){
    c.myths = {}; c.unique = null;
    EQUIP_SLOT_TYPES.forEach(type=>{
      const it = equippedItem(champKey, type); if(!it) return;
      if(it.mythic) c.myths[it.mythic] = 1;
      if(it.unique && UNIQUE_POWERS[it.unique] && UNIQUE_POWERS[it.unique].champion===champKey) c.unique = it.unique;
    });
  }
  return c.myths;
}
function heroUnique(champKey){ if(!heroMythics(champKey)) return null; return _passiveBucket(champKey).unique; }
// Texto de pasivas para la UI (inventario, recompensas): con su valor REAL (ya multiplicado por
// la rareza del objeto) y el poder legendario, si lo tiene.
const PASSIVE_PCT_EFFECTS = {dmg_mult:1, atkspeed_mult:1, cd_mult:1, lifesteal_add:1, heal_mult:1, def_add:1, skilldmg_mult:1, onhit_proc:1,
  hp_mult:1, speed_mult:1, crit_chance_add:1, crit_mult_add:1, energy_mult:1, overheal_shield_pct:1, mythic_execute:1, mythic_emergency_shield:1,
  missinghp_dmg_bonus:1, res_physical:1, res_fire:1, res_ice:1, res_lightning:1};
function itemPassivesHTML(it){
  const mult = it.designed ? 1 : (PASSIVE_RARITY_MULT[it.rarity]||1);
  const parts = (it.passives||[]).map(p=> PASSIVE_PCT_EFFECTS[p.effect] ? `${p.name} +${Math.round(p.value*mult*100)}%` : p.name);
  if(it.mythicPassive) parts.push("★ "+it.mythicPassive.name);
  let html = parts.join(" · ");
  const proc = legendProcOf(it);
  if(proc) html += `${html?"<br>":""}<span class="item-proc">✦ ${LEGEND_PROCS[proc].name}: ${LEGEND_PROCS[proc].desc}</span>`;
  if(it.mythic && MYTHIC_POWERS[it.mythic]) html += `<br><span class="item-mythic">★ ${MYTHIC_POWERS[it.mythic].name}: ${MYTHIC_POWERS[it.mythic].desc}</span>`;
  if(it.unique && UNIQUE_POWERS[it.unique]) html += `<br><span class="item-unique">◆ ${UNIQUE_POWERS[it.unique].name}: ${UNIQUE_POWERS[it.unique].desc}</span>`;
  if(it.designed && it.rarity==="legendario" && typeof recipesUsing==="function"){
    const r = recipesUsing(it.designId);
    if(r.length) html += `<br><span class="item-recipe">⚗ Parte de la receta de <b>${DESIGNED_ITEMS[r[0]].name}</b></span>`;
  }
  return html;
}
// Sobrecarga Mítica: bonus de daño/velocidad mientras la vida esté por debajo del 50%.
function mythicExecuteBonus(h){
  if(!h.hp || !h.maxHp || h.hp >= h.maxHp*0.5 || !h.classKey) return 0;
  return passiveSum(h.classKey, "mythic_execute");
}
// Equipar: si otro campeón lo tenía puesto, se lo saca (un objeto está en un solo campeón).
function equipItem(champKey, uid){
  const champ = save.champions[champKey];
  const item = itemPoolFor(champKey).find(it=>it.uid===uid);
  if(!item || !canEquipItem(champKey, item)) return false;
  champ.equipment = Object.assign(mkEquipment(), champ.equipment||{});
  const other = itemEquippedBy(uid);
  if(other && other!==champKey){ const eq = save.champions[other].equipment; for(const sl in eq) if(eq[sl]===uid) eq[sl] = null; }
  champ.equipment[item.type] = uid; // reemplaza lo que hubiera en esa ranura, sin duplicar bonificación
  invalidatePassiveCache();
  persist();
  return true;
}
function unequipItem(champKey, type){
  const champ = save.champions[champKey];
  champ.equipment[type] = null;
  invalidatePassiveCache();
  persist();
}
// Guarda un objeto en el inventario de la cuenta (NO lo equipa). champKey queda por compatibilidad
// con el código que ya lo pasaba; el objeto es de la cuenta, no de ese campeón.
function addItemToInventory(champKey, item){
  if(!item) return null;
  if(stashFull()) return null; // inventario lleno
  stashItems().push(item);
  if(typeof collectionRegister==="function") collectionRegister(item);
  persist();
  return item;
}
function sellValueOf(item){ return item ? (item.set ? SELL_VALUE_SET_PIECE : (SELL_VALUE[item.rarity]||0)) : 0; }
// Quita el objeto del inventario (y lo desequipa de quien lo tenga). "gold" indica si además
// otorga oro (vender) o no (descartar, sin recompensa, solo para liberar espacio ya).
function removeItemFromInventory(champKey, uid, grantGoldReward){
  const inv = stashItems();
  const idx = inv.findIndex(it=>it.uid===uid);
  if(idx===-1) return null;
  const item = inv[idx];
  for(const k in save.champions){ const eq = save.champions[k].equipment; if(!eq) continue; for(const sl in eq) if(eq[sl]===uid) eq[sl] = null; }
  inv.splice(idx,1);
  if(grantGoldReward){ save.gold += sellValueOf(item); }
  invalidatePassiveCache();
  persist();
  return item;
}
function sellItem(champKey, uid){ const it = findStashItem(uid); if(it && it.rarity==="unico") return null; return removeItemFromInventory(champKey, uid, true); }
function discardItem(champKey, uid){ return removeItemFromInventory(champKey, uid, false); }

// Fusión (sección 18): 3 objetos GENÉRICOS (sin nombre propio, sin set) del mismo tipo+rareza
// se combinan en 1 objeto procedural de la rareza siguiente. Los objetos diseñados a mano
// (legendarios/míticos con lore) y los de set NUNCA se fusionan -son demasiado específicos
// para "promediarse"-, y ÚNICO nunca sale de acá (sección 6): ni como entrada consumible más
// allá de mitico, ni como resultado.
// Solo basura -> algo mejor: Común x3 -> Raro, Raro x3 -> Muy Raro. Nunca Legendario ni más (los
// Míticos se fabrican con RECETAS de 3 legendarios específicos; los Únicos no se fabrican).
const FUSE_MAX_INPUT_RARITY = "raro";
function canFuseGroup(items){
  if(items.length!==3) return {ok:false, reason:"Elegí exactamente 3 objetos"};
  const [a,b,c] = items;
  if(!a || !b || !c) return {ok:false, reason:"Objeto inexistente"};
  if(a.type!==b.type || b.type!==c.type) return {ok:false, reason:"Deben ser del mismo tipo de equipamiento"};
  if(a.rarity!==b.rarity || b.rarity!==c.rarity) return {ok:false, reason:"Deben ser de la misma rareza"};
  if(rarityIndex(a.rarity) > rarityIndex(FUSE_MAX_INPUT_RARITY)) return {ok:false, reason:"Solo se fusionan Comunes y Raros"};
  if(a.designed || b.designed || c.designed) return {ok:false, reason:"Los objetos con nombre propio no se fusionan"};
  const nextRarity = RARITIES[rarityIndex(a.rarity)+1];
  return {ok:true, nextRarity, type:a.type};
}
function fuseItems(classKey, uids){
  if(uids.length!==3) return {ok:false, reason:"Elegí exactamente 3 objetos"};
  const items = uids.map(u=>findStashItem(u));
  const check = canFuseGroup(items);
  if(!check.ok) return check;
  uids.forEach(u=>removeItemFromInventory(classKey, u, false));
  const fused = makeItem(check.type, check.nextRarity, classKey);
  addItemToInventory(classKey, fused);
  return {ok:true, item:fused};
}
// Agrupa el inventario (sin lo equipado) por tipo+rareza para ofrecer fusión de a 3.
function fusableGroups(classKey){
  const groups = {};
  stashItems().forEach(it=>{
    if(it.designed || rarityIndex(it.rarity) > rarityIndex(FUSE_MAX_INPUT_RARITY) || itemEquippedBy(it.uid)) return;
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
