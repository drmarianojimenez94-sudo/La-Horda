'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||chromium.executablePath(),args:['--no-sandbox']});
 try{
  const results=[];
  for(const [width,height] of [[667,375],[844,390]]){
   const page=await browser.newPage({viewport:{width,height}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto((process.env.FACTORY_BASE_URL||'http://127.0.0.1:8805')+'/index.html?dev=1');await page.waitForFunction(()=>typeof openHubOptions==='function');
   await page.evaluate(()=>{setState('mainmenu');openHubOptions();});
   await page.waitForTimeout(250);
   const close=await page.locator('#opt-close-btn').boundingBox();assert.ok(close.y>=0&&close.y+close.height<=height,'Listo is visible on opening without scroll');
   for(const selector of ['#alpha-chat-open','.alpha-privacy','#opt-close-btn']){
    await page.locator(selector).scrollIntoViewIfNeeded();
    const box=await page.locator(selector).evaluate(el=>{
     const panel=document.querySelector('#hub-options > .ui-modal-panel'),r=el.getBoundingClientRect(),p=panel.getBoundingClientRect();
     return{inside:el.parentElement===panel,left:r.left,right:r.right,top:r.top,bottom:r.bottom,pLeft:p.left,pRight:p.right,pTop:p.top,pBottom:p.bottom,hOverflow:panel.scrollWidth-panel.clientWidth};
    });
    assert.equal(box.inside,true,selector+' must be inside panel, not sibling of backdrop');
    assert.ok(box.left>=box.pLeft&&box.right<=box.pRight&&box.top>=box.pTop&&box.bottom<=box.pBottom,JSON.stringify({width,selector,box}));
    assert.ok(box.left>=0&&box.right<=width&&box.top>=0&&box.bottom<=height,selector+' fits viewport');
    assert.ok(box.hOverflow<=1,'panel does not overflow horizontally');
   }
   await page.locator('.alpha-privacy').scrollIntoViewIfNeeded();
   const checkbox=await page.locator('.alpha-privacy input').boundingBox();assert.ok(checkbox.width>=40&&checkbox.height>=40,'themed checkbox has a touch target');
   const before=await page.locator('.alpha-privacy input').isChecked();await page.locator('.alpha-privacy input').click();
   assert.equal(await page.locator('.alpha-privacy input').isChecked(),!before);
   await page.screenshot({path:'/tmp/horda-options-'+width+'.png'});
   assert.deepEqual(errors,[]);results.push({width,height,status:'PASS',screenshot:'/tmp/horda-options-'+width+'.png'});await page.close();
  }
  console.log(JSON.stringify(results,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
