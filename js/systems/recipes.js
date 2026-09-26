"use strict";
/* ============================================================
   js/systems/recipes.js
   RECETAS DE MÍTICOS y COLECCIÓN.
   - Un Mítico de receta (RECIPE_MYTHICS) se fabrica con sus 3 Legendarios ESPECÍFICOS (nunca con
     3 cualquiera). Los ingredientes se consumen (si alguno estaba equipado, se desequipa).
   - Los Únicos NO se fabrican.
   - Colección (save.collection): registra cada objeto con nombre propio, pieza de set, Mítico y
     Único que la cuenta tuvo alguna vez (aunque después lo venda): es el catálogo "descubierto".
   Estructura pensada para crecer (crafting, intercambio, casa de subastas): todo se refiere por
   designId (qué objeto es) y uid (qué ejemplar es); una receta es {resultado, ingredientes[]}.
   ============================================================ */

// Registra un objeto en la colección de la cuenta. silent: sin marcar "nuevo" (migraciones).
function collectionRegister(it, silent){
  if(!it) return;
  if(!save.collection) save.collection = {};
  const key = it.designId || (it.rarity==="legendario" ? "proc_leg" : null);
  if(!key) return;
  const c = save.collection[key] || (save.collection[key] = {n:0, first:Date.now()});
  c.n++;
  if(!silent) c.isNew = true;
}
function collectionHas(designId){ return !!(save.collection && save.collection[designId]); }

// Progreso de una receta: qué ingredientes tenés (en el inventario de la cuenta, equipados o no).
function recipeProgress(mythicId){
  const ids = MYTHIC_RECIPES[mythicId] || [];
  const inv = stashItems();
  const parts = ids.map(id=>{
    const have = inv.find(it=>it.designId===id && !it._reserved) || null;
    return {id, name:DESIGNED_ITEMS[id].name, type:DESIGNED_ITEMS[id].type, have:!!have, uid:have ? have.uid : null,
      equippedBy: have ? itemEquippedBy(have.uid) : null, seen: collectionHas(id)};
  });
  const n = parts.filter(p=>p.have).length;
  return {mythicId, name:DESIGNED_ITEMS[mythicId].name, parts, n, total:ids.length, ready:n===ids.length, owned:collectionHas(mythicId)};
}
// Todas las recetas, las más cercanas a completarse primero (3/3 -> 2/3 -> 1/3 -> 0/3).
function sortedRecipes(){
  return Object.keys(MYTHIC_RECIPES).map(recipeProgress).sort((a,b)=> b.n-a.n || a.name.localeCompare(b.name));
}
// Fabrica el Mítico: consume los 3 legendarios específicos y agrega el Mítico al inventario.
function craftMythic(mythicId){
  const p = recipeProgress(mythicId);
  if(!p.ready) return {ok:false, reason:`Faltan ${p.total-p.n} de ${p.total} legendarios`};
  for(const part of p.parts) removeItemFromInventory(null, part.uid, false);
  const it = makeDesignedItem(mythicId);
  it.lootTier = "mitico"; it.crafted = true;
  stashItems().push(it); // siempre entra: los 3 ingredientes liberaron espacio
  collectionRegister(it);
  persist();
  return {ok:true, item:it};
}
// Legendarios con nombre del inventario que forman parte de alguna receta (para la UI).
function recipeIngredientsOwned(){
  const set = new Set(); Object.values(MYTHIC_RECIPES).forEach(r=>r.forEach(id=>set.add(id)));
  return stashItems().filter(it=>set.has(it.designId));
}
