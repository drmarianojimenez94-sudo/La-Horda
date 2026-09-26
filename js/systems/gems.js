"use strict";
/* ============================================================
   js/systems/gems.js
   GEMAS (alfa, a propósito simple): recurso raro que se gana JUGANDO y que tiene UNA sola función:
   subir el nivel de un objeto (Nv.1 → Nv.10, +4% de stats y pasivas numéricas por nivel).
   - Sin probabilidad de fallo, sin destrucción, sin pérdida de nivel: lo difícil es el COSTO.
   - No son moneda premium: no se compran, no se venden y no hay tienda de gemas. Una futura moneda
     premium tiene que ser otro campo del guardado, separado de éste (evitar pay-to-win).
   - Solo fuera de la partida (misma regla que equipar: no se cambia el equipo a mitad de una run).
   Tablas: item-identity.js (GEM_UPGRADE_BASE, GEM_UPGRADE_GROWTH, GEMS_PER_VICTORY...).
   ============================================================ */
function gemUpgradeCost(it){
  if(!it || itemLevel(it) >= ITEM_MAX_LEVEL) return null;
  const base = GEM_UPGRADE_BASE[itemTier(it)] || 1;
  return Math.ceil(base * Math.pow(GEM_UPGRADE_GROWTH, itemLevel(it) - 1));
}
// Costo total para llevar un objeto de su nivel actual al máximo (para mostrar el objetivo).
function gemCostToMax(it){ let n = 0; const c = Object.assign({}, it); while(itemLevel(c) < ITEM_MAX_LEVEL){ n += gemUpgradeCost(c); c.level = itemLevel(c) + 1; } return n; }
function upgradeItemLevel(uid){
  if(typeof state!=="undefined" && state==="playing") return {ok:false, reason:"Los objetos se mejoran fuera de la partida"};
  const it = findStashItem(uid);
  if(!it) return {ok:false, reason:"Objeto inexistente"};
  const cost = gemUpgradeCost(it);
  if(cost===null) return {ok:false, reason:"Ya está en el nivel máximo"};
  if((save.gems||0) < cost) return {ok:false, reason:`Te faltan gemas (${save.gems||0}/${cost})`};
  save.gems -= cost;
  it.level = itemLevel(it) + 1;
  invalidatePassiveCache();
  persist();
  if(typeof playSfx==="function") playSfx("crystal");
  return {ok:true, level:it.level, cost};
}
// Gemas del final de la partida: por arena (más en las difíciles) × calificación. Perder después
// del subjefe deja 1 (el esfuerzo cuenta un poco). Lo llama grantEndOfRunLoot (anfitrión e invitado).
function runGemReward(arena, grade, victory, reachedLevel){
  if(!victory) return (reachedLevel||0) >= DEFEAT_LOOT.minLevel ? GEMS_DEFEAT_AFTER_SUBBOSS : 0;
  return Math.max(1, Math.round((GEMS_PER_VICTORY[arena] || 2) * (GEMS_GRADE_MULT[grade] || 1)));
}
function grantRunGems(arena, grade, victory, reachedLevel){
  const n = runGemReward(arena, grade, victory, reachedLevel);
  if(n > 0){ save.gems = (save.gems||0) + n; }
  return n;
}
