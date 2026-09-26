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
    if(defeat && (t==="legendario" || t==="set" || t==="mitico" || t==="unico")) v *= DEFEAT_LOOT.highTierMult;
    w[t] = v;
  }
  return w;
}
// owned: Set de designIds que el campeón ya tiene (inventario), para elegir set/pieza.
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
    const tier = _pick(lootTierWeights(o.arena, grade, pity, defeat), rng);
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
// Elige un campeón para un objeto "de campeón": el que jugás (CROSS_DROP_OWN_CHAMP) o cualquier otro.
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
function _rollChampionDesigned(classKey, rarity){
  const pool = Object.values(DESIGNED_ITEMS).filter(d=>d.champion && d.rarity===rarity && !d.set && !d.named);
  const champs = [...new Set(pool.map(d=>d.champion))];
  const ch = _crossChamp(classKey, champs); if(!ch) return null;
  const mine = pool.filter(d=>d.champion===ch);
  return mine[(Math.random()*mine.length)|0].id;
}
// Convierte la especificación en un objeto real del juego (puede ser de otro campeón: botín cruzado).
function materializeLoot(spec, classKey, arena){
  arena = arena || currentArena;
  if(spec.tier==="set") return makeDesignedItem(spec.designId);
  const type = spec.type || rollItemType(classKey);
  const owned = ownedDesignIds();
  if(spec.tier==="legendario"){
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
    owned:ownedDesignIds(), pity:save.lootPity, classKey});
  save.lootPity = res.pity;
  const items = []; let inventoryFull = false;
  for(const spec of res.items){
    if(stashFull()){ inventoryFull = true; break; }
    const it = materializeLoot(spec, classKey, currentArena);
    it.lootTier = spec.tier;
    addItemToInventory(classKey, it);
    items.push(it);
  }
  const gems = grantRunGems(currentArena, res.grade, victory, runLevel); // Gemas: solo para mejorar objetos
  persist();
  return {items, inventoryFull, grade:res.grade, gems};
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
  info.dupes.slice(0,2).forEach(it=>removeItemFromInventory(classKey, it.uid, false));
  const id = info.missing[(Math.random()*info.missing.length)|0];
  const it = makeDesignedItem(id); it.lootTier = "set";
  addItemToInventory(classKey, it);
  persist();
  return {ok:true, item:it};
}
