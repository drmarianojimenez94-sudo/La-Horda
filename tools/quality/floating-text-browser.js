'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||chromium.executablePath(),args:['--no-sandbox']});try{
 const p=await b.newPage({viewport:{width:667,height:375},hasTouch:true}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(process.env.SITE||'http://127.0.0.1:8805');await p.waitForFunction(()=>assetsAllReady());
 const r=await p.evaluate(()=>{
  save.starterChosen=true;for(const s of Object.values(save.champions)){s.unlocked=true;s.level=20;}selectedClass='mago';save.duoReserve='eren';currentArena='bosque';lobbyAllies=['tanque','soporte','guerrero'];startRun(1);state='paused';
  for(const f of floatTexts)f.on=false;
  for(let i=0;i<70;i++)floatText(player.x+(i%7)*8-24,player.y-70+Math.floor(i/7)*4,'143','crit','ice',{});
  floatText(player.x,player.y-60,'¡PELIGRO!','warn');
  const times=[];for(let i=0;i<240;i++){const a=performance.now();drawFloatTexts();times.push(performance.now()-a);}times.sort((a,b)=>a-b);
  let overlap=false;for(let i=0;i<_ftRectCount;i++)for(let j=i+1;j<_ftRectCount;j++){const a=_ftRects[i],b=_ftRects[j];if(a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y)overlap=true;}
  render();return{labels:floatTexts.filter(f=>f.on).length,drawn:_ftRectCount,overlap,avgMs:times.reduce((a,b)=>a+b,0)/times.length,p95Ms:times[Math.floor(times.length*.95)],samples:times.length};
 });
 assert.equal(r.overlap,false);assert(r.drawn>0&&r.drawn<20);assert(r.avgMs<4&&r.p95Ms<8,'desktop headless text-budget exceeded');assert.deepEqual(errors,[]);
 if(process.env.QA_SHOT)await p.screenshot({path:process.env.QA_SHOT});console.log(JSON.stringify(r));
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
