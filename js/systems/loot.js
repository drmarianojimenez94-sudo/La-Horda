"use strict";
/* ============================================================
   js/systems/loot.js
   Botín del final de la partida (tablas en js/data/loot.js):
     rollLoot()          -> PURA: decide cuántos objetos y de qué categoría/set/pieza, y cómo
                            queda la protección contra la mala suerte. No toca el guardado:
                            la usa también la simulación de balance.
     grantEndOfRunLoot() -> la de verdad: tira el botín con el guardado actual, crea los objetos,
                            los guarda en el inventario y actualiza la protección.
     reforgeSetDuplicates() -> 2 piezas repetidas de un set -> 1 pieza que te falta de ese set.
   ============================================================ */
function _pick(weights, rng){
  let total = 0; for(const k in weights) total += Math.max(0, weights[k]);
  if(total <= 0) return null;
  let r = rng()*total;
  for(const k in weights){ r -= Math.max(0, weights[k]); if(r <= 0) return k; }
  return Object.keys(weights)[0];
}
// Pesos finales por categoría para una arena + calificación + protección (+ derrota).
function lootTierWeights(arena, grade, pity, defeat){
  const base = ARENA_LOOT[arena] || ARENA_LOOT.ciudad;
  const g = GRADE_LOOT[grade] || GRADE_LOOT.A;
  const df = typeof diffLootFactor==="function" ? diffLootFactor() : 1; // Pesadilla/Infierno: mejor rareza
  const w = {};
  for(const t of LOOT_TIERS){
    let v = base[t] * Math.pow(g.factor * df, TIER_EXP[t]);
    if(pity && LOOT_PITY[t]) v *= 1 + Math.min(LOOT_PITY[t].cap, LOOT_PITY[t].step*(pity[t]||0));
    if(defeat && (t==="legendario" || t==="set" || t==="mitico" || t==="unico")) v *= DEFEAT_LOOT.highTierMult;
    w[t] = v;
  }
  return w;
}
// Piso de rareza: lo que iba a salir por debajo de `floor` SUBE a `floor` (su peso pasa a esa categoría).
// Las categorías de arriba no cambian su probabilidad: el piso no regala Legendarios, solo saca la basura.
// "Por debajo" = orden de fuerza TIER_ORDER (común < raro < muy raro < legendario < mítico < set < único).
function lootApplyFloor(w, floor){
  if(!floor || typeof TIER_ORDER==="undefined" || TIER_ORDER[floor]===undefined || w[floor]===undefined) return w;
  for(const t in w) if(t!==floor && (TIER_ORDER[t]||0) < TIER_ORDER[floor]){ w[floor] += w[t]; w[t] = 0; }
  return w;
}
// Nivel de objeto (item-identity.js, ITEM_ILVL_*) de lo que cae en una arena: su número en la campaña;
// lo que no tiene número (Arena Divina) cae con el tope.
function lootItemLevelFor(arena){
  const n = typeof campaignNumber==="function" ? campaignNumber(arena) : 0;
  return Math.max(1, Math.min(ITEM_ILVL_MAX, n > 0 ? n : ITEM_ILVL_MAX));
}
// owned: Set de designIds que el guardián ya tiene (inventario), para elegir set/pieza.
function _rollSetPiece(arena, owned, rng, classKey){
  const aw = SET_ARENA_WEIGHTS[arena] || SET_ARENA_WEIGHTS.infernal;
  const sw = {};
  for(const id in aw){
    if(!SET_DB[id]) continue;
    const has = setPieceIds(id).some(p=>owned.has(p));
    sw[id] = aw[id] * (has ? SET_OWNED_BIAS : 1);
  }
  for(const id in SET_DB){
    const ch = SET_DB[id].champion; if(!ch) continue;
    const has = setPieceIds(id).some(p=>owned.has(p));
    sw[id] = (ch===classKey ? SET_CHAMPION_BIAS : SET_OTHER_CHAMP_W) * (has ? SET_OWNED_BIAS : 1);
  }
  const setId = _pick(sw, rng);
  if(!setId) return null;
  const pw = {};
  for(const pid of setPieceIds(setId)) pw[pid] = owned.has(pid) ? 1 : SET_MISSING_PIECE_BIAS;
  const designId = _pick(pw, rng);
  return {setId, designId, type: DESIGNED_ITEMS[designId].type};
}
// o = {arena, grade, victory, runLevel, subjefes, owned:Set, pity:{legendario,set,mitico}, rng}
function rollLoot(o){
  const rng = o.rng || Math.random;
  const pity = Object.assign({legendario:0, set:0, mitico:0, unico:0}, o.pity||{});
  const owned = o.owned || new Set();
  let n = 0, grade = o.grade, defeat = !o.victory;
  if(o.victory){
    const g = GRADE_LOOT[grade] || GRADE_LOOT.A;
    const extra = Math.min(0.95, g.extra + 0.10*(o.subjefes||0));
    n = 1 + (rng() < extra ? 1 : 0);
    if(n===2 && rng() < extra*0.5) n = 3;
    n = Math.min(LOOT_MAX_ITEMS, n);
  } else {
    if((o.runLevel||0) >= DEFEAT_LOOT.minLevel && rng() < DEFEAT_LOOT.chance) n = 1;
    if(grade==="A" || grade==="S" || grade==="S+") grade = DEFEAT_LOOT.gradeCap;
  }
  const items = [], got = {};
  for(let i=0;i<n;i++){
    // o.floor: piso de rareza del PRIMER objeto (el cofre de victoria, LOOT_VICTORY_FLOOR)
    const w = lootTierWeights(o.arena, grade, pity, defeat);
    if(i===0 && o.floor) lootApplyFloor(w, o.floor);
    const tier = _pick(w, rng);
    got[tier] = true;
    if(tier==="set"){
      const sp = _rollSetPiece(o.arena, owned, rng, o.classKey);
      if(sp){ items.push({tier, setId:sp.setId, designId:sp.designId, type:sp.type}); owned.add(sp.designId); continue; }
      items.push({tier:"legendario"}); got.legendario = true; continue;
    }
    items.push({tier});
  }
  // protección: solo cuenta victorias; se reinicia la categoría que cayó
  const pityAfter = Object.assign({}, pity);
  if(o.victory) for(const t in LOOT_PITY) pityAfter[t] = got[t] ? 0 : (pity[t]||0) + 1;
  return {items, pity:pityAfter, grade};
}
// Elige un guardián para un objeto "de guardián": el que jugás (CROSS_DROP_OWN_CHAMP) o cualquier otro.
function _crossChamp(classKey, candidates){
  if(!candidates.length) return null;
  if(candidates.includes(classKey) && Math.random() < CROSS_DROP_OWN_CHAMP) return classKey;
  return candidates[(Math.random()*candidates.length)|0];
}
function _weightedPick(list, wfn){ const w = {}; list.forEach((x,i)=> w[i] = wfn(x)); const k = _pick(w, Math.random); return k===null ? null : list[+k]; }
// Legendario con nombre: pesa la afinidad de la arena y, más, si te falta para una receta empezada.
function _rollNamedLegendary(arena, owned){
  const ids = Object.keys(NAMED_LEGENDARIES);
  const started = new Set();
  for(const m in MYTHIC_RECIPES){ const r = MYTHIC_RECIPES[m]; if(r.some(id=>owned.has(id))) r.forEach(id=>started.add(id)); }
  return _weightedPick(ids, id=>{
    const a = (NAMED_LEGENDARIES[id].arenas||{})[arena] || 0.6;
    return a * (started.has(id) && !owned.has(id) ? RECIPE_MISSING_BIAS : 1);
  });
}
// Legendarios que cambian la build (legendaries.js, BUILD_LEGENDARIES): desde la arena 3 de la campaña
// (y siempre en la Horda Infinita, en Pesadilla/Infierno y en la Arena Divina). Los que no tenés pesan más.
function buildLegendAllowed(arena){
  if(typeof BUILD_LEGENDARIES==="undefined") return false;
  if(typeof endlessOn==="function" && endlessOn()) return true;
  if(typeof diffCurrent==="function" && diffCurrent()!=="normal") return true;
  const n = typeof campaignNumber==="function" ? campaignNumber(arena || currentArena) : 0;
  return n===0 || n >= BUILD_LEGEND_MIN_ARENA;
}
function _rollBuildLegendary(arena, owned){
  return _weightedPick(Object.keys(BUILD_LEGENDARIES), id=>((BUILD_LEGENDARIES[id].arenas||{})[arena] || 1) * (owned && owned.has(id) ? 0.3 : 1));
}
function _rollChampionDesigned(classKey, rarity){
  const pool = Object.values(DESIGNED_ITEMS).filter(d=>d.champion && d.rarity===rarity && !d.set && !d.named);
  const champs = [...new Set(pool.map(d=>d.champion))];
  const ch = _crossChamp(classKey, champs); if(!ch) return null;
  const mine = pool.filter(d=>d.champion===ch);
  return mine[(Math.random()*mine.length)|0].id;
}
// Convierte la especificación en un objeto real del juego (puede ser de otro guardián: botín cruzado).
// Los objetos con nombre (legendarios, míticos, sets, Únicos) conservan su identidad fija y suman 1-2
// afijos al azar (js/systems/affixes.js); los procedurales ya nacen con los suyos en makeItem.
function materializeLoot(spec, classKey, arena){
  const it = _materializeLootBase(spec, classKey, arena);
  if(it && it.designed && !Array.isArray(it.affixes) && typeof rollItemAffixes==="function") rollItemAffixes(it);
  if(it) it.ilvl = lootItemLevelFor(arena || currentArena); // lo que cae en una arena más alta nace mejor
  return it;
}
function _materializeLootBase(spec, classKey, arena){
  arena = arena || currentArena;
  if(spec.tier==="set") return makeDesignedItem(spec.designId);
  const type = spec.type || rollItemType(classKey);
  const owned = ownedDesignIds();
  if(spec.tier==="legendario"){
    if(spec.build || (buildLegendAllowed(arena) && Math.random() < LEGEND_SOURCE_BUILD)){ const id = _rollBuildLegendary(arena, owned); if(id) return makeDesignedItem(id); }
    const r = Math.random();
    if(r < LEGEND_SOURCE.named){ const id = _rollNamedLegendary(arena, owned); if(id) return makeDesignedItem(id); }
    else if(r < LEGEND_SOURCE.named + LEGEND_SOURCE.champion){ const id = _rollChampionDesigned(classKey, "legendario"); if(id) return makeDesignedItem(id); }
    return makeItem(type, "legendario", classKey, {arena});
  }
  if(spec.tier==="mitico"){
    if(Math.random() < MYTHIC_SOURCE.recipe){
      const id = _weightedPick(Object.keys(RECIPE_MYTHICS), id=>(RECIPE_MYTHICS[id].arenas||{})[arena] || 0.6);
      if(id) return makeDesignedItem(id);
    }
    const id = _rollChampionDesigned(classKey, "mitico"); if(id) return makeDesignedItem(id);
    return makeDesignedItem(Object.keys(RECIPE_MYTHICS)[0]);
  }
  if(spec.tier==="unico"){
    const ids = Object.keys(UNIQUE_DESIGNS);
    const byChamp = {}; ids.forEach(id=>{ (byChamp[UNIQUE_DESIGNS[id].champion] = byChamp[UNIQUE_DESIGNS[id].champion]||[]).push(id); });
    const ch = _crossChamp(classKey, Object.keys(byChamp));
    const list = byChamp[ch] || ids;
    return makeDesignedItem(list[(Math.random()*list.length)|0]);
  }
  return makeItem(type, spec.tier, classKey, {arena});
}
// designIds de todo lo que tiene la cuenta (inventario compartido).
function ownedDesignIds(){
  return new Set(stashItems().filter(it=>it.designId).map(it=>it.designId));
}
// Botín real al terminar la partida. perf = computePerformance(player).
function grantEndOfRunLoot(classKey, perf, victory){
  save.lootPity = Object.assign({legendario:0, set:0, mitico:0, unico:0}, save.lootPity||{});
  const res = rollLoot({arena:currentArena, grade:perf.grade, victory, runLevel, subjefes:subjefesDefeated,
    owned:ownedDesignIds(), pity:save.lootPity, classKey, floor: victory ? LOOT_VICTORY_FLOOR : null});
  save.lootPity = res.pity;
  // primera victoria de la campaña: el primer objeto es una mejora segura para una ranura vacía
  const gift = firstWinLootDue(victory) ? firstWinLootSpec(classKey) : null;
  if(gift){ save.firstWinLoot = true; if(res.items.length) res.items[0] = gift; else res.items.push(gift); }
  const items = []; let inventoryFull = false;
  for(const spec of res.items){
    const it = materializeLoot(spec, classKey, currentArena);
    // inventario lleno: la regla del reciclaje (ground-loot.js) — un Común/Raro se recicla en polvo de Gema
    const room = typeof stashMakeRoomFor==="function" ? stashMakeRoomFor(it) : {ok:!stashFull()};
    if(!room.ok){ inventoryFull = true; break; }
    if(room.self){ inventoryFull = true; continue; }
    it.lootTier = spec.tier;
    // Pesadilla/Infierno: el objeto cae con nivel (lo mismo que subirlo con Gemas)
    const lb = typeof diffItemLevelBonus==="function" ? diffItemLevelBonus() : 0;
    if(lb > 0) it.level = Math.min(ITEM_MAX_LEVEL, itemLevel(it) + lb);
    addItemToInventory(classKey, it);
    items.push(it);
  }
  const gems = grantRunGems(currentArena, res.grade, victory, runLevel); // Gemas: solo para mejorar objetos
  persist();
  return {items, inventoryFull, grade:res.grade, gems};
}
// ¿Esta victoria es la PRIMERA de la cuenta en la campaña? (una sola vez; ni la Horda Infinita ni la Divina)
function firstWinLootDue(victory){
  if(!victory || save.firstWinLoot) return false;
  if(typeof endlessOn==="function" && endlessOn()) return false;
  if(typeof divinaMode!=="undefined" && divinaMode) return false;
  if(!(typeof campaignNumber==="function" && campaignNumber(currentArena) > 0)) return false;
  // guardados que ya ganaron antes de esta regla: nada (la victoria actual ya marcó su arena como superada,
  // y las estadísticas de desafíos todavía no la contaron: se cierran después del cofre)
  const cleared = Object.keys(save.arenasCleared||{}).filter(a=>save.arenasCleared[a] && a!==currentArena);
  let wins = 0; try{ if(typeof questsState==="function") wins = (questsState().stats||{}).wins|0; }catch(e){}
  if(cleared.length || wins > 0){ save.firstWinLoot = "previa"; return false; }
  return true;
}
// Objeto de la primera victoria: Muy Raro para la primera ranura vacía (FIRST_WIN_LOOT.slotOrder) o, si no
// hay ninguna vacía, para la de menor stat relativo a su tabla.
function firstWinLootSpec(classKey){
  const order = FIRST_WIN_LOOT.slotOrder.filter(t=>ITEM_TYPES[t]);
  let type = order.find(t=>!equippedItem(classKey, t));
  if(!type){
    const rel = t=>{ const it = equippedItem(classKey, t); return it ? itemStat(it)/RARITY_VALUES[t].legendario : 0; };
    type = order.slice().sort((a,b)=>rel(a)-rel(b))[0];
  }
  return {tier:FIRST_WIN_LOOT.tier, type, firstWin:true};
}
// Categoría visible de un objeto (SET es verde aunque su poder base sea de legendario).
function itemTier(it){ return it.set ? "set" : (LOOT_TIER_META[it.rarity] ? it.rarity : "comun"); }

/* ---------------- duplicados de set ---------------- */
// Piezas repetidas (no equipadas) de un set y piezas que faltan.
function setDuplicateInfo(classKey, setId){
  const inv = stashItems(), eq = new Set(inv.filter(it=>itemEquippedBy(it.uid)).map(it=>it.uid));
  const byId = {};
  for(const it of inv){ if(it.set===setId) (byId[it.designId] = byId[it.designId]||[]).push(it); }
  const dupes = [];
  for(const id in byId){
    const list = byId[id].slice().sort((a,b)=> (eq.has(a.uid)?1:0) - (eq.has(b.uid)?1:0));
    // conserva una de cada pieza (la equipada si la hay); el resto son duplicados usables
    list.slice(0, list.length-1).forEach(it=>{ if(!eq.has(it.uid)) dupes.push(it); });
  }
  const missing = setPieceIds(setId).filter(id=>!byId[id]);
  return {dupes, missing};
}
function reforgeSetDuplicates(classKey, setId){
  const info = setDuplicateInfo(classKey, setId);
  if(info.dupes.length < 2) return {ok:false, reason:"Necesitás 2 piezas repetidas de este set"};
  if(!info.missing.length) return {ok:false, reason:"Ya tenés todas las piezas de este set"};
  const used = info.dupes.slice(0,2);
  used.forEach(it=>removeItemFromInventory(classKey, it.uid, false));
  const id = info.missing[(Math.random()*info.missing.length)|0];
  const it = makeDesignedItem(id); it.lootTier = "set";
  const il = Math.min(...used.map(itemIlvl)); if(il > 1) it.ilvl = il; // conserva el nivel de objeto (el menor de las dos)
  if(typeof rollItemAffixes==="function") rollItemAffixes(it);
  addItemToInventory(classKey, it);
  persist();
  return {ok:true, item:it};
}
