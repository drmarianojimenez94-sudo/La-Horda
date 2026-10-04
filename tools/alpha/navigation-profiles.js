"use strict";
// Adversarial navigation on the real app. Complements training, collection and four-client gates.
const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage']}),page=await browser.newPage({viewport:{width:667,height:375}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.goto(process.env.SITE||'http://127.0.0.1:8805');await page.waitForFunction(()=>typeof alphaTrainingStart==='function'&&assetsAllReady());
 await page.evaluate(()=>{titleContinue();setState('mainmenu');renderMainMenu();});
 const audit=await page.evaluate(()=>{
  const result=[];
  function verify(label){const bad=[...document.querySelectorAll('.screen:not(.hidden) a')].filter(e=>getComputedStyle(e).color==='rgb(0, 0, 238)');if(bad.length)throw Error(label+': unthemed hyperlink');result.push(label);}
  // Explorer opens every codex section, original champion pages and all shop tabs.
  openCodex();for(const section of CODEX_SECTIONS){codexGo('list',section.id,section.label);verify('explorer:'+section.id);codexBack();}
  for(const champion of CHAMPION_CATALOG){codexGo('champ',champion.id,champion.id);verify('collector:'+champion.id);codexBack();}
  codexBack();document.getElementById('mainmenu-tienda-btn').click();verify('explorer:shop');document.getElementById('shop-back-btn').click();
  // Fast exit while timers/previews exist, repeated input and abrupt back navigation.
  for(let n=0;n<30;n++){
   openCodex();codexGo('champ',CHAMPION_CATALOG[n%CHAMPION_CATALOG.length].id,'Campeón');codexBack();codexBack();
   if(n%5===0){alphaTrainingStart();alphaTrainingExit(false);if(ALPHA_TRAINING.active)throw Error('training did not exit');}
   document.getElementById('mainmenu-tienda-btn').click();document.getElementById('shop-back-btn').click();
  }
  verify('chaotic:30 rapid navigation cycles');if(state!=='mainmenu')throw Error('lost navigation');
  persistNow();return {result,raw:localStorage.getItem(SAVE_KEY)};
 });
 await page.reload();await page.waitForFunction(()=>typeof alphaTrainingStart==='function');assert.equal(await page.evaluate(()=>localStorage.getItem(SAVE_KEY)),audit.raw,'reload changed progression');
 await page.setViewportSize({width:390,height:844});assert.equal(await page.locator('#rotate-overlay').isVisible(),true);await page.setViewportSize({width:844,height:390});assert.equal(await page.locator('#rotate-overlay').isVisible(),false);
 assert.deepEqual(errors,[]);await browser.close();console.log('PASS navigation profiles: '+audit.result.length+' checkpoints, 30 adversarial cycles, reload, rotate. Novice=specific training gate; multiplayer=four-client gate.');
})().catch(e=>{console.error(e);process.exit(1);});
