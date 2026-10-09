'use strict';
// Verify the transformation's body filter does not wrap every procedural wing/conduit stroke.
const assert=require('node:assert/strict'),{spawn}=require('node:child_process'),{chromium}=require('playwright');
const port=Number(process.env.NANO_RENDER_PORT||8854);
const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1'],{stdio:'ignore'});
(async()=>{let browser;try{
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||chromium.executablePath(),args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:844,height:390}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>{window.__campaignMode=true;});
 await page.goto(`http://127.0.0.1:${port}`);await page.waitForFunction(()=>typeof nanoMonster==='function'&&assetsAllReady());
 const result=await page.evaluate(()=>{
  for(const c of Object.values(save.champions))Object.assign(c,{unlocked:true,level:99});
  selectedClass='nano_gm';currentArena='bosque';lobbyAllies=[];startRun(0);state='paused';runElapsedMs=1000;
  const h=player;ascState(h).monsterUntil=8000;const wings=ascNanoWings,conduits=ascNanoConduits,drawImage=ctx.drawImage;
  const seen=[];ascNanoWings=function(...a){seen.push(['wings',ctx.filter]);return wings(...a);};
  ascNanoConduits=function(...a){seen.push(['conduits',ctx.filter]);return conduits(...a);};
  ctx.drawImage=function(...a){seen.push(['body',this.filter]);return drawImage.apply(this,a);};
  const checks=[];try{
   for(const skin of [0,1]){h.ascSkin=skin;save.champions.nano_gm.ascSkin=skin;seen.length=0;ctx.filter='none';drawHeroBody(h,2,false,false);
    checks.push({skin,bodyFiltered:seen.some(([kind,f])=>kind==='body'&&f.includes('grayscale')),wingsClear:seen.some(([kind,f])=>kind==='wings'&&f==='none'),conduitsClear:seen.some(([kind,f])=>kind==='conduits'&&f==='none'),restored:ctx.filter==='none'});
   }
   h.asState.monsterUntil=0;seen.length=0;drawHeroBody(h,2,false,false);
   checks.push({normalUnfiltered:seen.filter(([kind])=>kind==='body').every(([,f])=>f==='none'),restored:ctx.filter==='none'});
  }finally{ctx.drawImage=drawImage;ascNanoWings=wings;ascNanoConduits=conduits;ctx.filter='none';}
  return checks;
 });
 console.log(JSON.stringify({checks:result,errors},null,2));assert.ok(result.every(row=>Object.entries(row).every(([k,v])=>k==='skin'||v===true)));assert.deepEqual(errors,[]);
}finally{if(browser)await browser.close();server.kill();}})().catch(e=>{console.error(e);process.exitCode=1;server.kill();});
