"use strict";
/* ============================================================
   js/data/pricing.js — UNA SOLA FUENTE DE VERDAD DE LOS PRECIOS BASE (oro y Brasas ✦)
   Datos y funciones puras, sin DOM, sin guardado y sin red: el navegador lo carga antes de js/data/champions.js y el
   servidor (server/wallet.js) ejecuta ESTE MISMO archivo en un contexto aislado. Así el cliente solo MUESTRA lo que el
   servidor DECIDE, y tools/collection/pricing-sync.js verifica que coinciden.
   Política (docs/economy/PRECIOS.md):
     · CAMPEONES: siempre se compran con ORO (nunca con Brasas). Ascensión: precio de oro propio por campeón.
     · BRASAS ✦: solo apariencia (skins, cromas y paquetes de apariencia). Nunca poder.
     · Un precio global del juego que no está acá (equipo, talentos, Mística) sigue en su sistema, siempre en oro.
   Los precios del Game Master (cosmeticPrices / championPrices, ver docs/production/operations.md) siguen pudiendo
   cambiar el ORO; las Brasas las fija únicamente este archivo.
   ============================================================ */
var PRICING = {
  version: 1,
  gold: {
    champion: 2500,                  // STANDARD, FAMILY, Portadores y Expedición
    // Ascensión: oro propio según lo que cuesta ganarlo (js/systems/ascension-unlocks.js). Siempre se pueden ganar jugando.
    ascension: { khepri: 8000, bront: 9000, velmira: 10000, aurelia: 12000, saelis: 12000, vhal: 13000, oriel: 14000 },
    ascensionDefault: 9000,          // una Ascensión nueva sin fila propia
    cosmetic: { set: 9000, autor: 12000 }   // el croma (paleta) conserva su precio propio en oro (CROMA_SKINS[id].price)
  },
  // Brasas ✦ por escalón. "croma": cambio de paleta · "set": skin de una colección (también se gana reuniendo el set)
  // · "autor": skin independiente con diseño propio (solo se compra).
  brasas: { croma: 300, set: 800, autor: 1200 },  // ✦ (1 ✦ ≈ US$ 0,01 en el pack base: ver server/premium-packs.json)
  // Colección de un guardián: todas sus apariencias que todavía no tenés, con descuento por cantidad (ahorro calculado
  // contra la suma de los precios sueltos de ESAS piezas; no hay precio "tachado" inventado).
  collection: { minPieces: 2, offPct: { 2: 15, 3: 20 } },
  // Pack de bienvenida: además de las Brasas, regala 3 elecciones de campeón STANDARD (se compran con oro: 3 × 2500).
  // Elegibles: solo categoría STANDARD publicada (nunca Ascensión, Fundadores, Evento ni Familia). Los decide el servidor.
  welcome: { pack: "brasas_bienvenida", champions: 3, category: "STANDARD" }
};

// Escalón de una apariencia: "set" si es una skin de colección, "autor" si es una skin independiente, "croma" si es paleta.
function pricingCosmeticTier(isSetSkin, cromaDef){
  if(isSetSkin) return "set";
  if(!cromaDef) return null;
  return (cromaDef.appearanceType === "skin" || cromaDef.authoredPacks) ? "autor" : "croma";
}
function pricingBrasas(tier){ return Object.prototype.hasOwnProperty.call(PRICING.brasas, tier) ? PRICING.brasas[tier] : 0; }
// Oro de una apariencia. El croma usa su precio propio (fallbackGold = el de su definición).
function pricingCosmeticGold(tier, fallbackGold){
  return tier === "set" || tier === "autor" ? PRICING.gold.cosmetic[tier] : (Number.isSafeInteger(fallbackGold) ? fallbackGold : 0);
}
// Oro de un campeón: Ascensión con precio propio; el resto, el general.
function pricingChampionGold(id, category){
  if(category === "ASCENSION") return Object.prototype.hasOwnProperty.call(PRICING.gold.ascension, id) ? PRICING.gold.ascension[id] : PRICING.gold.ascensionDefault;
  return PRICING.gold.champion;
}
// Colección: prices = precios sueltos (✦) de las piezas que faltan. -> {n, sum, offPct, price, save} (price = sum si no aplica).
function pricingCollection(prices){
  const n = prices.length, sum = prices.reduce((a, b) => a + b, 0);
  if(n < PRICING.collection.minPieces) return { n, sum, offPct: 0, price: sum, save: 0 };
  const keys = Object.keys(PRICING.collection.offPct).map(Number).sort((a, b) => a - b);
  let off = 0; for(const k of keys) if(n >= k) off = PRICING.collection.offPct[k];
  const price = Math.round(sum * (100 - off) / 100 / 10) * 10;
  return { n, sum, offPct: off, price, save: sum - price };
}
