"use strict";
/* ============================================================
   js/systems/shop.js
   TIENDA DE OBJETOS: ofertas que cambian una vez por día (fecha local). Complementa el botín,
   no lo reemplaza: pocas ofertas, precios altos, nunca Míticos ni Únicos (esos se ganan).
     - 2 Raros (~300) · 2 Muy Raros (~1.100) · 1 espacio "destacado" que un día de cada tres trae
       un Legendario con nombre (~5.000, lo mismo que un campeón); los demás días, otro Muy Raro.
   Las ofertas se generan al primer ingreso del día y se guardan en save.shop (así no cambian al
   recargar). Estructura pensada para crecer (monedas premium, cosméticos, intercambio) sin rehacer:
   una oferta es {id, item, price, currency, sold}.
   >>> Precios: SHOP_PRICE.
   ============================================================ */
const SHOP_PRICE = {raro:[260, 360], muyraro:[950, 1300], legendario:[4600, 5600]};
const SHOP_LEGEND_DAY_CHANCE = 1/3;
function shopDayKey(d){ d = d || new Date(); return d.getFullYear()+"-"+(d.getMonth()+1)+"-"+d.getDate(); }
// RNG con semilla (el día) para que dos jugadores vean ofertas parecidas el mismo día.
function _shopRng(seedStr){ let h = 2166136261; for(let i=0;i<seedStr.length;i++){ h ^= seedStr.charCodeAt(i); h = Math.imul(h, 16777619); } return ()=>{ h = Math.imul(h ^ (h>>>15), 2246822507); h = Math.imul(h ^ (h>>>13), 3266489909); h ^= h>>>16; return (h>>>0)/4294967296; }; }
function _withRng(rng, fn){ const r = Math.random; Math.random = rng; try{ return fn(); } finally { Math.random = r; } }
function shopState(){
  const day = shopDayKey();
  if(!save.shop || save.shop.day !== day) save.shop = generateShopOffers(day);
  return save.shop;
}
function generateShopOffers(day){
  const rng = _shopRng("horda-"+day);
  const price = (tier)=>{ const [a,b] = SHOP_PRICE[tier]; return Math.round((a + (b-a)*rng())/10)*10; };
  const offers = [];
  const push = (tier, item)=> offers.push({id:"of"+offers.length, tier, item, price:price(tier), currency:"gold", sold:false});
  _withRng(rng, ()=>{
    const types = EQUIP_SLOT_TYPES.slice();
    const pickType = ()=> types[(rng()*types.length)|0];
    push("raro", makeItem(pickType(), "raro", null));
    push("raro", makeItem(pickType(), "raro", null));
    push("muyraro", makeItem(pickType(), "muyraro", null));
    push("muyraro", makeItem(pickType(), "muyraro", null));
    if(rng() < SHOP_LEGEND_DAY_CHANCE){
      const ids = Object.keys(NAMED_LEGENDARIES);
      push("legendario", makeDesignedItem(ids[(rng()*ids.length)|0]));
    } else push("muyraro", makeItem(pickType(), "muyraro", null));
  });
  return {day, offers};
}
function shopBuy(offerId){
  const st = shopState();
  const of = st.offers.find(o=>o.id===offerId);
  if(!of || of.sold) return {ok:false, reason:"Esa oferta ya no está"};
  if(save.gold < of.price) return {ok:false, reason:"No te alcanza el oro"};
  if(stashFull()) return {ok:false, reason:"Tu inventario está lleno (30/30)"};
  save.gold -= of.price;
  const it = Object.assign({}, of.item, {uid:"it_"+(ITEM_UID_SEQ++)+"_"+Date.now().toString(36), bought:true});
  addItemToInventory(null, it);
  of.sold = true;
  persist();
  return {ok:true, item:it};
}

/* ============================================================
   CATÁLOGO COMPLETO DE PRUEBA (BUGFIX 01)
   Etapa de prueba: TODO objeto del juego está en la tienda y cuesta lo mismo (SHOP_TEST_PRICE), y
   todos los campeones cuestan CHAMPION_PRICE_GOLD. Fuente única: DESIGNED_ITEMS (legendarios con
   nombre, míticos, únicos, objetos de campeón y piezas de set) + los 26 arquetipos procedurales
   (ITEM_NOUNS) en cada categoría que puede salir en el botín. Nada se regala: se compra con oro.
   Para cerrar la prueba: SHOP_TEST_MODE = false (vuelven las ofertas del día de arriba).
   ============================================================ */
const SHOP_TEST_MODE = true;
const SHOP_TEST_PRICE = 1000;
const SHOP_ARCHETYPE_TIERS = ["comun", "raro", "muyraro", "legendario", "mitico"];
// Categoría de tienda de un objeto diseñado (una sola por objeto: no hay dos definiciones)
function shopCategoryOf(d){
  if(d.set) return "set";
  if(d.unique || d.rarity==="unico") return "unico";
  if(d.mythic || d.rarity==="mitico") return d.champion ? "campeon" : "mitico";
  if(d.named) return "legendario";
  return "campeon";
}
let _shopCatalog = null;
function shopCatalog(){
  if(_shopCatalog) return _shopCatalog;
  const designed = Object.keys(DESIGNED_ITEMS).map(id=>({key:"d:"+id, kind:"designed", id, cat:shopCategoryOf(DESIGNED_ITEMS[id]), price:SHOP_TEST_PRICE}));
  const base = [];
  for(const type of EQUIP_SLOT_TYPES) for(const noun of (ITEM_NOUNS[type]||[])) base.push({key:"a:"+type+":"+noun, kind:"archetype", type, noun, cat:"base", price:SHOP_TEST_PRICE});
  return (_shopCatalog = designed.concat(base));
}
// Objeto de muestra (para la tarjeta y la ficha): mismo objeto que se entrega al comprar, sin uid de inventario
const _shopPreviewCache = {};
function shopPreviewItem(entry, tier){
  const k = entry.key + "|" + (tier||"");
  if(_shopPreviewCache[k]) return _shopPreviewCache[k];
  let it;
  if(entry.kind==="designed") it = makeDesignedItem(entry.id);
  else it = makeItem(entry.type, tier || "raro", null, {noun:entry.noun, family: tier==="muyraro"||tier==="legendario"||tier==="mitico" ? "caza" : undefined});
  it.roll = 1; it.uid = "preview_" + k;
  return (_shopPreviewCache[k] = it);
}
function shopOwnedCount(entry){
  if(entry.kind==="designed") return stashItems().filter(it=>it.designId===entry.id).length;
  return stashItems().filter(it=>!it.designed && it.type===entry.type && it.noun===entry.noun).length;
}
function shopBuyCatalog(key, tier){
  if(typeof state!=="undefined" && state==="playing") return {ok:false, reason:"La tienda se usa fuera de la partida"};
  const entry = shopCatalog().find(e=>e.key===key);
  if(!entry) return {ok:false, reason:"Ese objeto no existe"};
  if(entry.kind==="archetype" && !SHOP_ARCHETYPE_TIERS.includes(tier)) return {ok:false, reason:"Categoría inválida"};
  if((save.gold||0) < entry.price) return {ok:false, reason:`No te alcanza el oro (tenés ${save.gold||0}, cuesta ${entry.price})`};
  if(stashFull()) return {ok:false, reason:`Tu inventario está lleno (${INVENTORY_CAPACITY}/${INVENTORY_CAPACITY}): vendé o descartá algo`};
  const it = entry.kind==="designed" ? makeDesignedItem(entry.id) : makeItem(entry.type, tier, null, {noun:entry.noun});
  it.bought = true;
  save.gold -= entry.price;
  addItemToInventory(null, it);
  persist();
  return {ok:true, item:it};
}
function shopBuyChampion(id){
  const cat = CHAMPION_CATALOG.find(c=>c.id===id), champ = save.champions[id];
  if(!cat || !champ) return {ok:false, reason:"Ese campeón no existe"};
  if(champ.unlocked) return {ok:false, reason:"Ya es tuyo"};
  if((save.gold||0) < cat.priceGold) return {ok:false, reason:`No te alcanza el oro (tenés ${save.gold||0}, cuesta ${cat.priceGold})`};
  save.gold -= cat.priceGold; champ.unlocked = true; save.starterChosen = true;
  persist();
  return {ok:true};
}
// Piezas de un set que el jugador todavía no tiene (para "comprar lo que falta")
function shopSetMissing(setId){ const owned = ownedDesignIds(); return setPieceIds(setId).filter(id=>!owned.has(id)); }
