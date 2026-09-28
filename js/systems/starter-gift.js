"use strict";
/* ============================================================
   js/systems/starter-gift.js
   REGALO INICIAL (alfa, pedido del dueño): UN guardián + UNA skin para ese guardián. Nada de oro
   (el regalo de 10.000 se sacó: ver ORO INICIAL en js/storage/save.js).
   Camino (pantalla "Tu primer guardián", js/ui/starter-select.js):
     1. elegís el guardián de regalo (grantStarterChampion) → save.starterSkinPending = true;
     2. elegís UNA de sus skins (las de set con arte, SET_SKINS, y sus cromas, CROMA_SKINS): queda tuya
        y equipada (starterSkinGrant). "Elegir después" o un guardián sin skins → un VALE de skin.
     3. sigue el primer arranque corto (a la Ciudad Maldita).
   Si cerrás el juego entre 1 y 2, al volver a entrar vas directo a la skin (needsStarterSkin).
   VALE DE SKIN (save.skinVoucher): se canjea UNA vez en la Tienda por cualquier skin o croma (el precio
   queda cubierto). Lo reciben también los guardados de antes del regalo (starterGiftMigrate, save.js).
   Reglas: todo es del juego (nunca plata real). Una skin de set se ve con su set COMPLETO (regla canónica),
   así que regalarla es regalar las piezas que faltan de ese set; la croma es cosmética pura.
   Las pruebas automáticas viejas (webdriver) siguen el camino de antes (guardián solo), como el primer
   arranque corto: las que miden el camino nuevo definen window.__starterGift, window.__firstRun o ?primera=1.
   ============================================================ */
function starterGiftEnabled(){
  try{
    if(window.__starterGift === false) return false;
    if(window.__starterGift) return true;
    if(typeof firstRunEnabled === "function") return firstRunEnabled();
    return !navigator.webdriver;
  }catch(e){ return true; }
}
// ¿Eligió el guardián de regalo y le falta la skin?
function needsStarterSkin(){
  return !!(save && save.starterSkinPending) && !needsStarterChampion() && starterGiftEnabled();
}
// Skins que se pueden regalar para el guardián `k`: las de set con arte de ese guardián (o universales)
// que todavía no tenés completas, y sus cromas que no tenés. {id, kind:"set"|"croma", name, lore, preview, pieces}
function starterSkinOptions(k){
  if(!CLASSES[k]) return [];
  const out = [];
  if(typeof CROMA_SKINS !== "undefined" && typeof cromaIdsFor === "function"){
    for(const id of cromaIdsFor(k)){
      if(cromaOwned(id)) continue;
      const d = CROMA_SKINS[id], C = (typeof CROMA_CRYSTALS !== "undefined" && CROMA_CRYSTALS[d.crystal]) || {};
      out.push({id, kind:"croma", name:d.name, lore:d.lore || "", preview:d.preview, color:C.color || "#ccc", tag:`Croma · ${C.short || d.crystal} · solo cosmética`, pieces:0});
    }
  }
  if(typeof SET_SKINS !== "undefined" && typeof SET_DB !== "undefined"){
    for(const id of Object.keys(SET_SKINS)){
      if(!SET_DB[id]) continue;
      const c = skinSetChamp(id); if(c && c !== k) continue;
      const miss = shopSetMissing(id); if(!miss.length) continue;
      const sk = SET_SKINS[id], n = setPieceIds(id).length;
      out.push({id, kind:"set", name:sk.name || SET_DB[id].name, lore:SET_DB[id].lore || SET_DB[id].theme || "", preview:sk.preview || sk.src,
        color:typeof SET_COLOR !== "undefined" ? SET_COLOR : "#3ddc71", tag:`Skin de set · trae las ${n} piezas de ${SET_DB[id].name}`, pieces:miss.length});
    }
  }
  return out;
}
// Da la skin `id` (de set o croma) y la deja equipada en `k`, sin cobrar. Lo usan el regalo y el vale.
// {ok, kind, equipped, reason}
function _giftSkin(k, id){
  if(typeof state !== "undefined" && state === "playing") return {ok:false, reason:"Se elige fuera de la partida"};
  if(typeof CROMA_SKINS !== "undefined" && CROMA_SKINS[id]){
    const d = CROMA_SKINS[id];
    if(cromaOwned(id)) return {ok:false, reason:"Esa croma ya es tuya"};
    save.cromas = Object.assign({}, save.cromas, {[id]:true});
    const ch = save.champions[d.champ];
    const equipped = !!(ch && ch.unlocked && cromaEquip(d.champ, id));
    persistNow();
    return {ok:true, kind:"croma", equipped, champ:d.champ};
  }
  if(typeof SET_SKINS !== "undefined" && SET_SKINS[id] && typeof SET_DB !== "undefined" && SET_DB[id]){
    const miss = shopSetMissing(id);
    if(!miss.length) return {ok:false, reason:"Ya tenés esa skin"};
    if(stashUsedSlots() + miss.length > INVENTORY_CAPACITY) return {ok:false, reason:`No entran las ${miss.length} piezas en tu inventario (${stashUsedSlots()}/${INVENTORY_CAPACITY}): vendé o descartá algo`};
    for(const p of miss){ const it = makeDesignedItem(p); if(!it) continue; it.bought = true; it.gift = true; addItemToInventory(null, it); }
    const c = skinSetChamp(id) || k;
    const equipped = !!(c && save.champions[c] && save.champions[c].unlocked && skinEquipOn(id, c));
    persistNow();
    return {ok:true, kind:"set", equipped, champ:c, n:miss.length};
  }
  return {ok:false, reason:"Esa skin no existe"};
}
// Regalo inicial: la skin elegida para el guardián de regalo `k`.
function starterSkinGrant(k, id){
  if(!starterSkinOptions(k).some(o=>o.id === id)) return {ok:false, reason:"Esa skin no es de este guardián"};
  const r = _giftSkin(k, id);
  if(!r.ok) return r;
  save.starterSkinPending = false; save.starterSkin = id;
  persistNow();
  return r;
}
// Regalo inicial sin skin (guardián sin skins todavía, o "Elegir después"): un vale para la Tienda.
function starterSkinVoucher(){
  save.starterSkinPending = false; save.starterSkin = "vale";
  save.skinVoucher = (save.skinVoucher|0) + 1;
  persistNow();
  return save.skinVoucher;
}
function skinVoucherCount(){ return Math.max(0, save.skinVoucher|0); }
// ¿Se puede canjear el vale por `id`? (croma que no tenés, o skin de set que no tenés completa)
function skinVoucherCanRedeem(id){
  if(!skinVoucherCount()) return false;
  if(typeof CROMA_SKINS !== "undefined" && CROMA_SKINS[id]) return !cromaOwned(id);
  if(typeof SET_SKINS !== "undefined" && SET_SKINS[id] && typeof SET_DB !== "undefined" && SET_DB[id]) return shopSetMissing(id).length > 0;
  return false;
}
// Canjea un vale por la skin/croma `id` (el precio queda cubierto). Se equipa si el guardián es tuyo.
function skinVoucherRedeem(id){
  if(!skinVoucherCount()) return {ok:false, reason:"No tenés vales de skin"};
  if(!skinVoucherCanRedeem(id)) return {ok:false, reason:"Esa ya es tuya"};
  const d = (typeof CROMA_SKINS !== "undefined" && CROMA_SKINS[id]) || null;
  const k = d ? d.champ : (skinSetChamp(id) || (typeof selectedClass !== "undefined" ? selectedClass : null));
  const r = _giftSkin(k, id);
  if(!r.ok) return r;
  save.skinVoucher = skinVoucherCount() - 1;
  save.skinVoucherNotice = false;
  persistNow();
  return r;
}
