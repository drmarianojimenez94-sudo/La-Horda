'use strict';
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async()=>{
 const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH || undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page = await browser.newPage({viewport:{width:844,height:390}});
 const errors=[]; page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.SE_BASE_URL || 'http://127.0.0.1:8805/',{waitUntil:'load'});
 await page.waitForFunction(()=>typeof codexChampHtml==='function' && typeof cosmeticCatalog==='function');
 const audit = await page.evaluate(()=>{
   // Champion Bible: la frase de catálogo (tagline) y la historia del Códice son textos distintos;
   // la ficha muestra la historia una sola vez.
   const duplicated = CHAMPION_CATALOG.filter(c=>CODEX_CHAMP_LORE[c.id] && c.lore === CODEX_CHAMP_LORE[c.id].history).map(c=>c.id);
   const failures=[];
   for(const c of CHAMPION_CATALOG){
     codexChampTab='ficha';const html=codexChampHtml(c.id);const hist=(CODEX_CHAMP_LORE[c.id]||{}).history;
     if(hist && html.split(_cxEsc(hist)).length!==2) failures.push(c.id);
   }
   return {duplicated,failures,catalog:cosmeticCatalog().length};
 });
 assert.deepEqual(audit.duplicated,[]); assert.deepEqual(audit.failures,[]);
 for(const [width,height] of [[844,390],[667,375]]){
   await page.setViewportSize({width,height});
   await page.evaluate(()=>{for(const k in save.champions)save.champions[k].unlocked=true;openCodex();codexLink('champ:tanque');codexChampTab='skins';codexRender();});
   await page.click('[data-appearance-filter="croma"]');
   assert.equal(await page.locator('[data-appearance-kind="croma"]:visible').count(),0);
   assert.ok(await page.locator('#cx-appearance-empty').isVisible());
   await page.click('[data-appearance-filter="skin"]');
   assert.ok(await page.locator('[data-appearance-kind="skin"]:visible').count()>=2);
   assert.ok(await page.locator('[data-appearance-kind="set"]:visible').count());
   const pure = await page.evaluate(()=>{const before=JSON.stringify(save);document.querySelector('[data-appearance-kind="skin"] [data-appearance-preview]').click();return JSON.stringify(save)===before;});
   assert.equal(pure,true, 'Preview must not mutate save');
   assert.ok(await page.evaluate(()=>!!CODEX_PV.get(document.querySelector('.cx-stage-pv')).spec.skin));
   await page.click('[data-appearance-filter="set"]');
   assert.equal(await page.locator('[data-appearance-kind="skin"]:visible').count(),0);
   await page.click('[data-appearance-filter="all"]');
   if(process.env.COLLECTION_SCREENSHOTS) await page.screenshot({path:process.env.COLLECTION_SCREENSHOTS+"/collection-"+width+".png"});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
   await page.evaluate(()=>codexLink('set:baluarte'));
   assert.ok((await page.locator('#codex-body').innerText()).includes('Dónde conseguirlo'));
 }
 const cosmetic = await page.evaluate(()=>{
   const c=save.champions.tanque;
   save.cosmeticUnlocks={baluarte:true};
   const power=()=>JSON.stringify({equipment:c.equipment,stash:save.stash,level:c.level,baseHP:CLASSES.tanque.baseHP,baseDmg:CLASSES.tanque.baseDmg,gold:save.gold});
   const before=power();
   const ok=skinEquipOn('baluarte','tanque');
   const active=activeSetSkinId({classKey:'tanque'});
   const loadout=netBuildLoadout('tanque');
   const record=netLoadoutRecord(loadout);
   const rejected=netLoadoutRecord({...loadout,champ:'mago'});
   const unknown=netLoadoutRecord({...loadout,cosmeticSkin:'constructor'});
   const pure=before===power();
   skinCosmeticEquip('tanque',null);
   return {ok,active,transported:record.cosmeticSkin,rejected:rejected.cosmeticSkin||null,unknown:unknown.cosmeticSkin||null,pure,original:activeSetSkinId({classKey:'tanque'})};
 });
 const art = await page.evaluate(()=>({myla:cosmeticMetadata('merienda_magica').artPending,ynara:cosmeticMetadata('santa_paciencia').artPending,tanque:cosmeticMetadata('baluarte').artPending}));
 assert.deepEqual(art,{myla:false,ynara:false,tanque:false});
 const shopGift = await page.evaluate(()=>{
   shopTab='skins'; setState('shop'); renderShop();
   const card=document.querySelector('[data-skin-card="baluarte"]');
   return !!card && !card.querySelector('[data-skin-buy]') && !!card.querySelector('[data-skin-equip]');
 });
 assert.equal(shopGift,true,'Gifted appearance must be usable in shop without buying equipment');
 assert.deepEqual(cosmetic,{ok:true,active:'baluarte',transported:'baluarte',rejected:null,unknown:null,pure:true,original:null});
 const permanent = await page.evaluate(()=>{
   delete save.cosmeticUnlocks.baluarte;
   for(const id of setPieceIds('baluarte')) delete save.collection[id];
   const partial = !skinOwnedFull('baluarte');
   for(const id of setPieceIds('baluarte')) addItemToInventory(null,makeDesignedItem(id));
   const unlocked = save.cosmeticUnlocks.baluarte===true;
   for(const it of [...stashItems()].filter(it=>it.set==='baluarte')) sellItem(null,it.uid);
   skinCosmeticEquip('tanque',null);
   const before=JSON.stringify(save.champions.tanque.equipment);
   const equipped=skinEquipOn('baluarte','tanque');
   const unchanged=before===JSON.stringify(save.champions.tanque.equipment);
   delete save.cosmeticUnlocks.baluarte; // legacy profile with discovered pieces only
   const migrated=skinOwnedFull('baluarte');
   return {partial,unlocked,equipped,unchanged,migrated,missing:shopSetMissing('baluarte').length};
 });
 assert.deepEqual(permanent,{partial:true,unlocked:true,equipped:true,unchanged:true,migrated:true,missing:4});
 assert.deepEqual(errors,[]);
 console.log('PASS collection browser',JSON.stringify(audit),'844x390 and 667x375 filters/preview/purity/set sources');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
