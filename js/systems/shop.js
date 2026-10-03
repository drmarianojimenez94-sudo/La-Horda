"use strict";
/* ============================================================
   js/systems/shop.js
   TIENDA DE OBJETOS: ofertas que cambian una vez por día (fecha local). Complementa el botín,
   no lo reemplaza: pocas ofertas, precios altos, nunca Míticos ni Únicos (esos se ganan).
     - 2 Raros (~300) · 2 Muy Raros (~1.100) · 1 espacio "destacado" que un día de cada tres trae
       un Legendario con nombre (~5.000, lo mismo que un guardián); los demás días, otro Muy Raro.
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
   CATÁLOGO DE LA TIENDA (alfa)
   Fuente única: DESIGNED_ITEMS (legendarios con nombre, objetos de guardián y piezas de set) + los
   26 arquetipos procedurales (ITEM_NOUNS) en cada rareza que puede salir en el botín.
   Auditoría pre-alfa: antes TODO costaba 1.000 (etapa de prueba) y con el regalo de 10.000 de oro
   se compraba el mejor equipo del juego en 2 minutos. Ahora el precio va por rareza, y los
   MÍTICOS (se fabrican con receta) y los ÚNICOS (solo botín) ya no se venden: siguen siendo metas.
   ============================================================ */
const SHOP_TEST_MODE = true;
const SHOP_PRICES = {
  base: { comun:150, raro:400, muyraro:900, legendario:2500 }, // arquetipos, por rareza
  campeon: 1500,      // objetos propios de un guardián
  legendario: 3000,   // legendarios con nombre
  set: 1200           // cada pieza de set (una skin = su set completo)
};
const SHOP_TEST_PRICE = SHOP_PRICES.set; // precio por pieza de set (lo usan "comprar lo que falta" y las skins)
const SHOP_ARCHETYPE_TIERS = ["comun", "raro", "muyraro", "legendario"];
function shopPriceOf(entry, tier){
  if(!entry) return 0;
  if(entry.kind==="archetype") return SHOP_PRICES.base[tier] || SHOP_PRICES.base.raro;
  return SHOP_PRICES[entry.cat] || SHOP_PRICES.campeon;
}
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
  const designed = Object.keys(DESIGNED_ITEMS).map(id=>({key:"d:"+id, kind:"designed", id, cat:shopCategoryOf(DESIGNED_ITEMS[id])}))
    .filter(e=>e.cat!=="mitico" && e.cat!=="unico" && !DESIGNED_ITEMS[e.id].mythic && DESIGNED_ITEMS[e.id].rarity!=="unico" && DESIGNED_ITEMS[e.id].rarity!=="mitico" && !DESIGNED_ITEMS[e.id].buildPower); // los que cambian la build solo caen
  designed.forEach(e=>{ e.price = shopPriceOf(e); });
  const base = [];
  for(const type of EQUIP_SLOT_TYPES) for(const noun of (ITEM_NOUNS[type]||[])) base.push({key:"a:"+type+":"+noun, kind:"archetype", type, noun, cat:"base", price:SHOP_PRICES.base.raro});
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
// priceOverride: precio de una oferta del día (vitrina); sin él, el de lista.
function shopBuyCatalog(key, tier, priceOverride){
  if(typeof state!=="undefined" && state==="playing") return {ok:false, reason:"La tienda se usa fuera de la partida"};
  const entry = shopCatalog().find(e=>e.key===key);
  if(!entry) return {ok:false, reason:"Ese objeto no existe"};
  if(entry.kind==="archetype" && !SHOP_ARCHETYPE_TIERS.includes(tier)) return {ok:false, reason:"Categoría inválida"};
  const price = priceOverride!=null ? priceOverride : shopPriceOf(entry, tier);
  if((save.gold||0) < price) return {ok:false, reason:`No te alcanza el oro (tenés ${save.gold||0}, cuesta ${price})`};
  if(stashFull()) return {ok:false, reason:`Tu inventario está lleno (${INVENTORY_CAPACITY}/${INVENTORY_CAPACITY}): vendé o descartá algo`};
  const it = entry.kind==="designed" ? makeDesignedItem(entry.id) : makeItem(entry.type, tier, null, {noun:entry.noun});
  it.bought = true;
  save.gold -= price;
  addItemToInventory(null, it);
  persist();
  return {ok:true, item:it};
}
function shopBuyChampion(id, priceOverride){
  const cat = CHAMPION_CATALOG.find(c=>c.id===id), champ = save.champions[id];
  if(!cat || !champ) return {ok:false, reason:"Ese guardián no existe"};
  if(champ.unlocked) return {ok:false, reason:"Ya es tuyo"};
  const price = priceOverride!=null ? priceOverride : cat.priceGold;
  if((save.gold||0) < price) return {ok:false, reason:`No te alcanza el oro (tenés ${save.gold||0}, cuesta ${price})`};
  save.gold -= price; champ.unlocked = true; save.starterChosen = true;
  persist();
  return {ok:true};
}
// Piezas de un set que el jugador todavía no tiene (para "comprar lo que falta")
function shopSetMissing(setId){ const owned = ownedDesignIds(); return setPieceIds(setId).filter(id=>!owned.has(id)); }

/* ---------------- Apariencias de colección ----------------
   Reunir el set o recibir un regalo desbloquea su apariencia. Elegirla cambia
   exclusivamente el aspecto: las piezas y bonificaciones se gestionan en Equipo.
   Los perfiles antiguos conservan la apariencia automática del set equipado
   hasta que el jugador elige una apariencia explícita. */
function skinSetChamp(setId){
  const sk = typeof SET_SKINS!=="undefined" && SET_SKINS[setId]; if(!sk) return null;
  return sk.champ || setPieceIds(setId).map(p=>(DESIGNED_ITEMS[p]||{}).champion).find(Boolean) || null;
}
// Guardianes TUYOS que pueden llevar la skin.
function skinCompatibleChamps(setId){
  const c = skinSetChamp(setId);
  return Object.keys(save.champions).filter(k=>save.champions[k].unlocked!==false && CLASSES[k] && (!c || c===k));
}
function skinOwnedFull(setId){ return !!(save.cosmeticUnlocks && save.cosmeticUnlocks[setId]) || (typeof cosmeticSetCollected==="function" && cosmeticSetCollected(setId)) || shopSetMissing(setId).length === 0; }
function skinIsActiveOn(setId, k){ return typeof champSkinId==="function" ? champSkinId(k) === setId : false; }
// Selecciona la apariencia sin equipar piezas ni alterar estadísticas.
function skinEquipOn(setId, k){
  if(!save.champions[k] || !skinOwnedFull(setId)) return false;
  if(typeof state!=="undefined" && state==="playing") return false;
  // Selecting an appearance must never replace equipment or grant combat power.
  return typeof skinCosmeticEquip==="function" && skinCosmeticEquip(k, setId);
}
// Después de comprar: {equipped, target, choices}. choices = guardianes posibles cuando es ambiguo.
function skinAutoEquip(setId){
  if(!skinOwnedFull(setId)) return {equipped:false, target:null, choices:[]};
  const comp = skinCompatibleChamps(setId);
  let target = null;
  if(typeof selectedClass!=="undefined" && comp.includes(selectedClass)) target = selectedClass;
  else if(comp.length === 1) target = comp[0];
  if(!target) return {equipped:false, target:null, choices:comp};
  return {equipped:skinEquipOn(setId, target), target, choices:comp};
}

/* ============================================================
   VITRINA DE LA TIENDA: DESTACADO + OFERTAS DEL DÍA
   Rotación diaria DETERMINÍSTICA: la semilla es la fecha local (shopDayKey), así que todos los jugadores
   ven la misma vitrina el mismo día y no cambia al recargar. Se renueva a la medianoche.
   - Destacado: una skin de set (su set completo, como paquete) o un guardián, con descuento. El orden
     del día es fijo; si ya tenés el primero, pasa al siguiente de la lista.
   - 4 ofertas: objetos del catálogo (legendarios con nombre, de guardián, básicos Muy Raros o
     Legendarios) con 15-30 % de descuento; cada una se compra una vez por día.
   Todo se paga con ORO ganado jugando (nada de poder se compra con dinero real). Míticos y Únicos
   siguen fuera de la tienda.
   ============================================================ */
const SHOP_DEAL_OFF = [15, 20, 25, 30];
const SHOP_DEALS_PER_DAY = 4;
// MONEDA PREMIUM: estructura lista y APAGADA. Si algún día existe será SOLO cosmética (skins, marcos,
// efectos) y nunca dará poder. No hay pasarela de pago: mientras enabled sea false no se muestra ni
// cobra nada, y ningún precio del juego la usa (currency:"gold" en todas las ofertas).
const SHOP_PREMIUM = {enabled:false, id:"brasas", name:"Brasas", icon:"✦", cosmeticOnly:true};
function _shopShuffle(arr, rng){ const a = arr.slice(); for(let i=a.length-1;i>0;i--){ const j = (rng()*(i+1))|0; const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
function _shopDisc(base, off){ return Math.max(10, Math.round(base*(1-off/100)/10)*10); }
let _shopShowcaseCache = null;
function shopDailyShowcase(){
  const day = shopDayKey();
  if(!_shopShowcaseCache || _shopShowcaseCache.day !== day){
    const rng = _shopRng("vitrina-"+day);
    const skins = typeof SET_SKINS!=="undefined" ? Object.keys(SET_SKINS).filter(id=>SET_DB[id]) : [];
    const pool = _shopShuffle(skins.map(id=>({kind:"skin", id})).concat(CHAMPION_CATALOG.map(c=>({kind:"champ", id:c.id}))), rng);
    const featOff = SHOP_DEAL_OFF[(rng()*SHOP_DEAL_OFF.length)|0];
    const cands = _shopShuffle(shopCatalog().filter(e=>e.cat==="legendario" || e.cat==="campeon" || e.cat==="base"), rng);
    const deals = [], perCat = {};
    for(const e of cands){
      if(deals.length >= SHOP_DEALS_PER_DAY) break;
      if((perCat[e.cat]||0) >= 2) continue;
      perCat[e.cat] = (perCat[e.cat]||0) + 1;
      const tier = e.kind==="archetype" ? (rng() < 0.35 ? "legendario" : "muyraro") : undefined;
      const off = SHOP_DEAL_OFF[(rng()*SHOP_DEAL_OFF.length)|0];
      const base = shopPriceOf(e, tier);
      deals.push({id:"of"+deals.length, key:e.key, tier, base, off, price:_shopDisc(base, off), currency:"gold"});
    }
    _shopShowcaseCache = {day, pool, featOff, deals};
  }
  const sc = _shopShowcaseCache;
  const owned = f => f.kind==="skin" ? skinOwnedFull(f.id) : !!(save.champions[f.id]||{}).unlocked;
  const f = sc.pool.find(x=>!owned(x)) || sc.pool[0] || null;
  let featured = null;
  if(f){
    const base = f.kind==="skin" ? shopSetMissing(f.id).length*SHOP_TEST_PRICE : (CHAMPION_CATALOG.find(c=>c.id===f.id)||{}).priceGold||0;
    featured = {kind:f.kind, id:f.id, off:sc.featOff, base, price:base ? _shopDisc(base, sc.featOff) : 0, owned:owned(f), currency:"gold"};
  }
  return {day:sc.day, featured, deals:sc.deals};
}
function _shopDealsState(){
  const day = shopDayKey();
  if(!save.shopDeals || save.shopDeals.day !== day) save.shopDeals = {day, bought:{}};
  return save.shopDeals;
}
function shopDealBought(id){ return !!_shopDealsState().bought[id]; }
// Minutos que faltan para que se renueve la vitrina (medianoche local).
function shopMinutesToRenew(){ const n = new Date(), m = new Date(n.getFullYear(), n.getMonth(), n.getDate()+1); return Math.max(1, Math.ceil((m - n)/60000)); }
function shopBuyDeal(id){
  const d = shopDailyShowcase().deals.find(x=>x.id===id);
  if(!d) return {ok:false, reason:"Esa oferta ya no está"};
  if(shopDealBought(id)) return {ok:false, reason:"Ya aprovechaste esta oferta hoy: mañana hay otras"};
  const r = shopBuyCatalog(d.key, d.tier, d.price);
  if(r.ok){ _shopDealsState().bought[id] = true; persist(); }
  return r;
}
// Destacado del día: el guardián o la skin (su set completo, las piezas que falten) con descuento.
function shopBuyFeatured(){
  const f = shopDailyShowcase().featured;
  if(!f || f.owned) return {ok:false, reason:"Ya es tuyo"};
  if(typeof state!=="undefined" && state==="playing") return {ok:false, reason:"La tienda se usa fuera de la partida"};
  if(f.kind==="champ") return Object.assign(shopBuyChampion(f.id, f.price), {kind:"champ", id:f.id});
  const miss = shopSetMissing(f.id);
  if(!miss.length) return {ok:false, reason:"Ya tenés el set completo"};
  if((save.gold||0) < f.price) return {ok:false, reason:`No te alcanza el oro (tenés ${save.gold||0}, cuesta ${f.price})`};
  if(stashUsedSlots() + miss.length > INVENTORY_CAPACITY) return {ok:false, reason:`No entran las ${miss.length} piezas en tu inventario (${stashUsedSlots()}/${INVENTORY_CAPACITY}): vendé o descartá algo`};
  for(const p of miss){ const it = makeDesignedItem(p); if(!it) continue; it.bought = true; addItemToInventory(null, it); }
  save.gold -= f.price;
  persist();
  return {ok:true, kind:"skin", id:f.id, n:miss.length};
}
