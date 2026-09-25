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
  const base = ARENA_LOOT[arena] || ARENA_LOOT.bosque;
  const g = GRADE_LOOT[grade] || GRADE_LOOT.A;
  const w = {};
  for(const t of LOOT_TIERS){
    let v = base[t] * Math.pow(g.factor, TIER_EXP[t]);
    if(pity && LOOT_PITY[t]) v *= 1 + Math.min(LOOT_PITY[t].cap, LOOT_PITY[t].step*(pity[t]||0));
    if(defeat && (t==="legendario" || t==="set" || t==="mitico")) v *= DEFEAT_LOOT.highTierMult;
    w[t] = v;
  }
  return w;
}
// owned: Set de designIds que el campeón ya tiene (inventario), para elegir set/pieza.
function _rollSetPiece(arena, owned, rng){
  const aw = SET_ARENA_WEIGHTS[arena] || SET_ARENA_WEIGHTS.infernal;
  const sw = {};
  for(const id in aw){
    if(!SET_DB[id]) continue;
    const has = setPieceIds(id).some(p=>owned.has(p));
    sw[id] = aw[id] * (has ? SET_OWNED_BIAS : 1);
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
  const pity = Object.assign({legendario:0, set:0, mitico:0}, o.pity||{});
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
    const tier = _pick(lootTierWeights(o.arena, grade, pity, defeat), rng);
    got[tier] = true;
    if(tier==="set"){
      const sp = _rollSetPiece(o.arena, owned, rng);
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
// Convierte la especificación en un objeto real del juego para ese campeón.
function materializeLoot(spec, classKey){
  if(spec.tier==="set") return makeDesignedItem(spec.designId);
  const type = spec.type || rollItemType(classKey);
  if(spec.tier==="legendario" || spec.tier==="mitico"){
    // la mitad de las veces, un objeto diseñado a mano del campeón (si tiene de esa rareza)
    if(Math.random() < 0.5){ const d = rollDesignedItem(classKey, spec.tier, type); if(d && !d.set) return d; }
  }
  return makeItem(type, spec.tier, classKey);
}
function ownedDesignIds(classKey){
  const inv = (save.champions[classKey] && save.champions[classKey].inventory) || [];
  return new Set(inv.filter(it=>it.designId).map(it=>it.designId));
}
// Botín real al terminar la partida. perf = computePerformance(player).
function grantEndOfRunLoot(classKey, perf, victory){
  save.lootPity = save.lootPity || {legendario:0, set:0, mitico:0};
  const res = rollLoot({arena:currentArena, grade:perf.grade, victory, runLevel, subjefes:subjefesDefeated,
    owned:ownedDesignIds(classKey), pity:save.lootPity});
  save.lootPity = res.pity;
  const items = []; let inventoryFull = false;
  for(const spec of res.items){
    const champ = save.champions[classKey];
    if((champ.inventory||[]).length >= INVENTORY_CAPACITY){ inventoryFull = true; break; }
    const it = materializeLoot(spec, classKey);
    it.lootTier = spec.tier;
    addItemToInventory(classKey, it);
    items.push(it);
  }
  persist();
  return {items, inventoryFull, grade:res.grade};
}
// Categoría visible de un objeto (SET es verde aunque su poder base sea de legendario).
function itemTier(it){ return it.set ? "set" : (LOOT_TIER_META[it.rarity] ? it.rarity : (it.rarity==="unico" ? "mitico" : "comun")); }

/* ---------------- duplicados de set ---------------- */
// Piezas repetidas (no equipadas) de un set y piezas que faltan.
function setDuplicateInfo(classKey, setId){
  const champ = save.champions[classKey]; if(!champ) return {dupes:[], missing:[]};
  const inv = champ.inventory||[], eq = new Set(Object.values(champ.equipment||{}));
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
  info.dupes.slice(0,2).forEach(it=>removeItemFromInventory(classKey, it.uid, false));
  const id = info.missing[(Math.random()*info.missing.length)|0];
  const it = makeDesignedItem(id); it.lootTier = "set";
  addItemToInventory(classKey, it);
  persist();
  return {ok:true, item:it};
}
