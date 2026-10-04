'use strict';
// Objetivos táctiles en partida (UX Bible §Botones táctiles): cada control visible >= 44x44 px CSS,
// sin superponerse con otro control, entero dentro de la pantalla; la ficha de long press y el panel
// táctico no tapan los controles de forma permanente. Viewports: iPhone 13 Pro (844x390), SE (667x375),
// Pro Max (932x430), Android común (800x360) y escritorio (1280x800).
const assert=require('node:assert/strict'),{spawn}=require('node:child_process'),path=require('node:path');
let chromium;try{({chromium}=require('playwright'));}catch(e){({chromium}=require('/opt/node22/lib/node_modules/playwright'));}
const ROOT=path.resolve(__dirname,'../..'),PORT=+(process.env.TOUCH_PORT||8838);
const server=spawn('python3',['-m','http.server',String(PORT),'--bind','127.0.0.1'],{cwd:ROOT,stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const IDS=['btn-basic','btn-s1','btn-s2','btn-s3','btn-ult','btn-emerg','btn-pact','btn-revive','pause-btn','mute-btn','joy-base'];
(async()=>{
 await sleep(500);
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||chromium.executablePath(),args:['--no-sandbox']});
 const report=[];let fails=0;
 try{
  for(const [width,height,mobile] of [[844,390,1],[667,375,1],[932,430,1],[800,360,1],[1280,800,0]]){
   const ctx=await browser.newContext({viewport:{width,height},isMobile:!!mobile,hasTouch:!!mobile,deviceScaleFactor:mobile?3:1});
   const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(`http://127.0.0.1:${PORT}/`,{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>typeof startRun==='function',null,{timeout:120000});
   for(const champ of ['mago','eren','nigromante']){
    const r=await page.evaluate(([champ,IDS])=>{
     for(const ck in save.champions){const s=save.champions[ck];s.unlocked=true;s.level=20;}
     selectedClass=champ;currentArena='bosque';lobbyAllies=['tanque','soporte','guerrero'];netMatch=null;startRun(3);setState('playing');updateHUD();
     const boxes=[];
     for(const id of IDS){const el=document.getElementById(id);if(!el)continue;const cs=getComputedStyle(el);if(cs.display==='none'||cs.visibility==='hidden'||el.classList.contains('hidden'))continue;const b=el.getBoundingClientRect();if(!b.width)continue;boxes.push({id,x:b.left,y:b.top,w:b.width,h:b.height});}
     return {boxes,vw:innerWidth,vh:innerHeight};
    },[champ,IDS]);
    const issues=[];
    for(const b of r.boxes){
     if(b.w<44||b.h<44)issues.push(`${b.id} ${Math.round(b.w)}x${Math.round(b.h)} < 44`);
     if(b.x<0||b.y<0||b.x+b.w>r.vw+0.5||b.y+b.h>r.vh+0.5)issues.push(`${b.id} fuera de pantalla`);
    }
    for(let i=0;i<r.boxes.length;i++)for(let j=i+1;j<r.boxes.length;j++){const a=r.boxes[i],b=r.boxes[j];
     const ox=Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x),oy=Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y);
     if(ox>2&&oy>2)issues.push(`${a.id} se superpone con ${b.id} (${Math.round(ox)}x${Math.round(oy)})`);}
    report.push({viewport:`${width}x${height}`,champ,controls:r.boxes.length,issues});
    if(issues.length){fails++;console.log(`FAIL ${width}x${height} ${champ}: ${issues.join('; ')}`);}
    else console.log(`PASS ${width}x${height} ${champ}: ${r.boxes.length} controles >= 44 px, sin superposición, dentro de pantalla`);
   }
   assert.deepEqual(errors,[]);
   await ctx.close();
  }
 }finally{await browser.close();server.kill();}
 if(fails)process.exitCode=1;
})().catch(e=>{console.error(e);server.kill();process.exitCode=1;});
