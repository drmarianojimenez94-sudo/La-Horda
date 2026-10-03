"use strict";
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('fs');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:844,height:390}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.goto(process.env.SITE||'http://127.0.0.1:8805');await page.waitForFunction(()=>typeof AlphaServices!=='undefined'&&typeof assetsAllReady==='function'&&assetsAllReady());
 await page.evaluate(()=>{
  window.__alphaServicesTest=true;accountAvailable=()=>true;acct.session={token:'local-test',user:'Tester'};
  window._chat=[];window._sent=[];
  accountFetch=async(method,path,body)=>{
   _sent.push({method,path,body});
   if(path==='/api/world')return{status:200,j:{serverTime:Date.now(),normalConfig:{xp:2,gold:3,drop:2,difficulty:1,enemyHp:1,enemyDamage:1,bossHp:1,eliteRate:1,spawnRate:1},events:[{name:'Prueba',description:'Evento de QA',start:Date.now()-1000,end:Date.now()+60000,enabled:true,arenas:['ciudad'],wave:1,multipliers:{xp:2},enemies:['esqueleto']}],messages:[{id:'news',text:'<img src=x onerror=alert(1)>',type:'news',start:Date.now()-1000,end:Date.now()+60000}]}};
   if(path==='/api/chat'&&method==='POST'){_chat.push({id:'one',name:'Owner',owner:true,text:body.text});return{status:200,j:{message:_chat.at(-1)}};}
   if(path==='/api/chat')return{status:200,j:{messages:_chat,pinned:null}};
   return{status:200,j:{}};
  };
  titleContinue();setState('mainmenu');renderMainMenu();
 });
 await page.evaluate(()=>AlphaServices.refreshWorld());assert.equal(await page.locator('#alpha-news img').count(),0);assert.ok((await page.locator('#alpha-news').innerText()).includes('<img'));
 for(const [width,height] of [[844,390],[667,375],[1280,800]]){
  await page.setViewportSize({width,height});await page.evaluate(()=>AlphaServices.openChat());await page.locator('.alpha-chat input').fill('Hola <b>Horda</b>');await page.locator('.alpha-chat button[type=submit]').click();await page.waitForFunction(()=>document.querySelector('.alpha-chat [data-messages]').textContent.includes('Hola'));
  assert.equal(await page.locator('.alpha-chat [data-messages] p b').count(),1);assert.equal(await page.locator('.alpha-chat .alpha-owner').count(),1);
  const box=await page.locator('.alpha-chat').boundingBox();assert.ok(box.x>=0&&box.y>=0&&box.x+box.width<=width+1&&box.y+box.height<=height+1);assert.equal(await page.locator('.alpha-chat').evaluate(el=>el.scrollWidth<=el.clientWidth+1),true);
  if(width===667){fs.mkdirSync('/tmp/horda-alpha-services',{recursive:true});await page.screenshot({path:'/tmp/horda-alpha-services/chat-667.png'});}
  // Deliberately move focus out of the dialog, as disabling Submit can do.
  await page.evaluate(()=>document.activeElement?.blur());
  await page.keyboard.press('Escape');await page.waitForSelector('.alpha-chat',{state:'detached'});assert.equal(await page.locator('.alpha-chat').count(),0);await page.evaluate(()=>{_chat=[];});
 }
 await page.evaluate(()=>{currentArena='ciudad';runLevel=1;});assert.equal(await page.evaluate(()=>alphaWorldMultiplier('xp')),4);
 await page.evaluate(()=>{currentArena='hielo';});assert.equal(await page.evaluate(()=>alphaWorldMultiplier('xp')),2);
 await page.setViewportSize({width:390,height:844});assert.equal(await page.locator('#rotate-overlay').isVisible(),true);
 await page.evaluate(()=>{AlphaServices.emit('skin',{champion:'mago',cosmetic:'arcano'});AlphaServices.emit('skill',{champion:'mago',skill:'ult'});});await page.evaluate(()=>AlphaServices.flush());
 assert.ok(await page.evaluate(()=>_sent.some(r=>r.path==='/api/telemetry'&&r.body.events.some(e=>e.skin==='arcano'))));assert.deepEqual(errors,[]);
 console.log('PASS Alpha browser: literal news/chat text, owner distinction, 3 viewports, escape, landscape, scoped events, telemetry hooks');await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
