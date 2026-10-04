'use strict';
const {chromium}=require('playwright');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await b.newPage({viewport:{width:844,height:390}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.SE_BASE_URL||'http://127.0.0.1:8805/',{waitUntil:'load'});
 await page.waitForFunction(()=>typeof shopConfiguredPrice==='function');
 const catalog=await page.evaluate(()=>({sets:Object.keys(SET_DB).sort(),itemPrices:shopCatalog().map(e=>e.key).sort(),championPrices:CHAMPION_CATALOG.map(c=>c.id).sort(),cosmeticPrices:cosmeticCatalog().map(c=>c.id).sort()}));
 const dest=path.resolve(__dirname,'../../docs/production/shop-catalog.json');
 if(process.argv.includes('--write-catalog')){fs.writeFileSync(dest,JSON.stringify(catalog,null,2)+'\n');console.log('catalog written',catalog.itemPrices.length,catalog.championPrices.length,catalog.cosmeticPrices.length);}
 else assert.deepEqual(JSON.parse(fs.readFileSync(dest,'utf8')),catalog,'Regenerate pricing catalog when playable catalog changes');
 const results=await page.evaluate(()=>{
   const checks=[];const check=(name,ok)=>checks.push({name,ok});
   let prices={item:{},cosmetic:{},champion:{}};
   AlphaServices.goldPrice=(kind,id,fallback)=>Object.prototype.hasOwnProperty.call(prices[kind],id)?prices[kind][id]:fallback;
   save.gold=100000; save.stash=[];save.collection={};save.cosmeticUnlocks={};state='shop';
   const piece=setPieceIds('baluarte')[0],key='d:'+piece,entry=shopCatalog().find(e=>e.key===key);
   check('default',shopPriceOf(entry)===1200);
   prices.item[key]=123;
   let before=save.gold,result=shopBuyCatalog(key);check('single debits exact configured',result.ok&&save.gold===before-123);
   prices.item[key]=0;before=save.gold;result=shopBuyCatalog(key);check('zero price supported',result.ok&&save.gold===before);
   for(const bad of [-1,NaN,Infinity,'5']){prices.item[key]=bad;check('invalid configuration falls back '+String(bad),shopPriceOf(entry)===1200);}
   prices.item[key]=123; before=save.gold;result=shopBuyCatalog(key,null,-10);check('negative transaction rejected',!result.ok&&save.gold===before);
   const stale=shopPriceOf(entry);prices.item[key]=124;before=save.gold;result=shopBuyCatalog(key,null,null,stale);check('stale item quote rejected',!result.ok&&save.gold===before);
   prices.champion.tanque=234;save.champions.tanque.unlocked=false;before=save.gold;result=shopBuyChampion('tanque');check('champion exact configured',result.ok&&save.gold===before-234);
   save.champions.tanque.unlocked=false;before=save.gold;result=shopBuyChampion('tanque',null,999);check('stale champion quote rejected',!result.ok&&save.gold===before&&!save.champions.tanque.unlocked);
   save.champions.tanque.unlocked=true;
   prices.cosmetic.tanque_ancestral=345;delete save.cromas.tanque_ancestral;before=save.gold;result=cromaBuy('tanque_ancestral');check('croma exact configured',result.ok&&save.gold===before-345);
   delete save.cromas.tanque_ancestral;before=save.gold;result=cromaBuy('tanque_ancestral',999);check('stale croma quote rejected',!result.ok&&save.gold===before&&!cromaOwned('tanque_ancestral'));
   save.stash=[];save.collection={};save.cosmeticUnlocks={};prices.item={};prices.cosmetic.baluarte=800;
   before=save.gold;result=shopBuySetBundle('baluarte',true,null,999);check('stale skin quote rejected',!result.ok&&save.gold===before&&stashItems().length===0);
   check('skin full quote',shopSkinPrice('baluarte')===800);
   // regla vigente (js/systems/premium.js): la skin es SOLO apariencia y tiene precio propio; tener piezas no lo cambia
   addItemToInventory(null,makeDesignedItem(piece));check('skin price ignores owned pieces',shopSkinPrice('baluarte')===800);
   const missing0=shopSetMissing('baluarte').length;
   before=save.gold;result=shopBuySetBundle('baluarte',true);check('skin purchase is appearance only',result.ok&&save.gold===before-800&&!!save.cosmeticUnlocks.baluarte&&shopSetMissing('baluarte').length===missing0);
   save.stash=[];save.collection={};save.cosmeticUnlocks={};prices.cosmetic={};prices.item[key]=123;
   check('equipment bundle sum (skin keeps its own 9000 price)',shopSetPrice('baluarte')===3723&&shopSkinPrice('baluarte')===SKIN_PRICE_GOLD);
   save.gold=100;before=JSON.stringify({stash:save.stash,gold:save.gold});result=shopBuySetBundle('baluarte',false);check('insufficient bundle atomic',!result.ok&&JSON.stringify({stash:save.stash,gold:save.gold})===before);
   save.gold=100000;save.stash=Array.from({length:INVENTORY_CAPACITY-1},(_,i)=>({uid:'dummy'+i}));before=JSON.stringify({stash:save.stash,gold:save.gold});result=shopBuySetBundle('baluarte',false);check('full inventory atomic',!result.ok&&JSON.stringify({stash:save.stash,gold:save.gold})===before);
   save.stash=[];prices.item=Object.fromEntries(setPieceIds('baluarte').map(id=>['d:'+id,10000000]));prices.cosmetic={};check('large bundle sum never becomes free',shopSetPrice('baluarte')===40000000);
   save.stash=[];prices.item={};const deals=shopDailyShowcase().deals;const deal=deals[0];prices.item[deal.key]=1000;
   const newDeal=shopDailyShowcase().deals[0];check('cached offers reprice',newDeal.key===deal.key&&newDeal.base===1000&&newDeal.price===_shopDisc(1000,newDeal.off));
   before=save.gold;result=shopBuyDeal(newDeal.id);check('deal exact configured debit',result.ok&&save.gold===before-newDeal.price);
   prices.item[deal.key]=0;check('free discount remains free',shopDailyShowcase().deals[0].price===0);
   check('small discount never raises price',_shopDisc(2,15)<=2);
   save.cosmeticUnlocks={};save.collection={};save.stash=[];prices.cosmetic.baluarte=777;
   shopTab='skins';renderShop();check('skin UI uses effective quote',document.querySelector('[data-skin-card="baluarte"]')?.textContent.includes(fmtGold(shopSkinPrice('baluarte'))));
   return checks;
 });
 console.log(JSON.stringify(results));assert.ok(results.every(x=>x.ok));assert.deepEqual(errors,[]);await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
