'use strict';
const assert=require('node:assert/strict'),{chromium}=require('playwright');
const base=process.env.SITE||'http://127.0.0.1:8813';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});
 try{
  for(const viewport of [{width:740,height:360},{width:844,height:390},{width:1366,height:768}]){
   const context=await browser.newContext({viewport,hasTouch:viewport.width<1000,isMobile:viewport.width<1000});
   const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
   await p.goto(base+'/crystal-wars.html?room=ABC123&server=ws://127.0.0.1:1');
   await p.waitForURL('**/index.html?**');
   assert.equal(new URL(p.url()).searchParams.get('room'),'ABC123');
   // Explicitly enter as a guest; no test-mode bypass of the production account gate.
   await p.evaluate(()=>{window.__accountTest=true;});
   await p.locator('#title-continue-btn').click();
   await p.getByRole('button',{name:/invitado/i}).click();
   await p.locator('.starter-card[data-champ="tanque"]').click();
   await p.locator('#starter-yes-btn').click();
   await p.locator('#alpha-training-panel').waitFor({state:'visible'});
   assert.equal(await p.evaluate(()=>ALPHA_TRAINING.active),true);
   const before=await p.evaluate(()=>JSON.parse(localStorage.getItem(SAVE_KEY)));
   assert.equal(Object.values(before.champions).filter(c=>c.unlocked).length,1);
   assert.equal(before.champions.tanque.level,1);assert.equal(before.gold,0);
   assert.equal(await p.evaluate(()=>HordaOnboarding.storedReady()),false);
   assert.deepEqual(await p.evaluate(()=>ARENA_ORDER.filter(a=>isArenaUnlocked(a))),['ciudad']);
   await p.screenshot({path:`docs/public-alpha/first-run-${viewport.width}.png`});
   // Reload is not equivalent to a deliberate skip or completion.
   await p.reload();await p.locator('#title-continue-btn').click();
   await p.locator('#alpha-training-panel').waitFor({state:'visible'});
   await p.getByRole('button',{name:'Saltar tutorial',exact:true}).click();
   await p.waitForURL('**/crystal-wars.html?**');
   assert.equal(new URL(p.url()).searchParams.get('room'),'ABC123');
   assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('laHordaSave_v1')).tut.trainingSkipped),1);
   assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('laHordaSave_v1')).tut.training),undefined);
   await p.goto(base+'/index.html');await p.locator('#title-continue-btn').click();
   await p.locator('#mainmenu-screen').waitFor({state:'visible'});
   assert.equal(await p.evaluate(()=>ALPHA_TRAINING.active),false);
   assert.deepEqual(errors,[]);await context.close();
   console.log('PASS '+viewport.width+': account gate, first champion, level 1, first arena, automatic training, reload, explicit skip, crystal invitation return');
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
