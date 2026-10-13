'use strict';
/* ¿Cómo se juega?: se abre desde el menú principal, explica el objetivo del modo, no desborda y se cierra. */
const assert=require('node:assert/strict'),{chromium}=require('playwright');
const base=process.env.SITE||'http://127.0.0.1:8813';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});
 try{
  for(const viewport of [{width:667,height:375},{width:844,height:390},{width:1366,height:768}]){
   const ctx=await browser.newContext({viewport,hasTouch:viewport.width<1000,isMobile:viewport.width<1000});
   const p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
   await p.goto(base+'/index.html');
   await p.evaluate(()=>{window.__accountTest=true;});
   await p.locator('#title-continue-btn').click();
   await p.getByRole('button',{name:/invitado/i}).click();
   await p.locator('.starter-card[data-champ="tanque"]').click();
   await p.locator('#starter-yes-btn').click();
   await p.locator('#alpha-training-panel').waitFor({state:'visible'});
   await p.getByRole('button',{name:'Saltar tutorial',exact:true}).click();
   await p.locator('#mainmenu-screen').waitFor({state:'visible',timeout:20000});
   assert.match(await p.locator('.brand-sub').first().textContent(),/SOBREVIV/i,'la portada dice el objetivo');
   await p.locator('#hub-howto-btn').click();
   await p.locator('#howto').waitFor({state:'visible'});
   const r=await p.evaluate(()=>{const c=document.querySelector('#howto .howto-card'),b=document.querySelector('#howto .btn');const bb=b.getBoundingClientRect();
     return {steps:document.querySelectorAll('#howto .howto-step').length,title:document.querySelector('#howto .howto-title').textContent,
       fits:c.getBoundingClientRect().bottom<=innerHeight+1&&c.getBoundingClientRect().right<=innerWidth+1,hOverflow:c.scrollWidth>c.clientWidth,btnH:bb.height};});
   assert.equal(r.steps,4);assert.match(r.title,/HORDA/);assert.equal(r.fits,true,'entra en pantalla (o se desplaza)');assert.equal(r.hOverflow,false,'sin texto cortado a los costados');assert(r.btnH>=40,'botón táctil');
   assert.match(await p.locator('#howto').textContent(),/Sobrevivir/);
   await p.locator('#howto [data-howto-close]').click();
   assert.equal(await p.locator('#howto').isHidden(),true);
   assert.deepEqual(errors,[]);await ctx.close();
   console.log('PASS how-to-play '+viewport.width+'x'+viewport.height);
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
