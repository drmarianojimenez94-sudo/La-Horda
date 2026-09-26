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
