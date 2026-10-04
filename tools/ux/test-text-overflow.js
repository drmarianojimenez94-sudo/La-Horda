'use strict';
// UI CONSISTENCY: texto que se sale de su marco (UX Bible). Recorre las pantallas principales a 844x390 y
// 667x375 y busca (a) elementos con texto cuyo contenido desborda su caja sin recorte ni scroll, y (b) texto
// que sobresale del primer contenedor con borde/fondo visible. Uso: node tools/ux/test-text-overflow.js [--report]
const {spawn}=require('node:child_process'),path=require('node:path'),fs=require('node:fs');
let chromium;try{({chromium}=require('playwright'));}catch(e){({chromium}=require('/opt/node22/lib/node_modules/playwright'));}
const ROOT=path.resolve(__dirname,'../..'),PORT=+(process.env.OVERFLOW_PORT||8842);
const server=spawn('python3',['-m','http.server',String(PORT),'--bind','127.0.0.1'],{cwd:ROOT,stdio:'ignore'});
const SCREENS={
 mainmenu:"setState('mainmenu');renderMainMenu();",
 codex_home:"setState('codex');codexGo('home','home','Códice');",
 codex_champ:"setState('codex');codexGo('champ','eren','Eren');",
 codex_arena:"setState('codex');codexGo('arena','micelial','Reino');",
 codex_set:"setState('codex');codexGo('set',Object.keys(SET_DB)[0],'Set');",
 shop:"setState('shop');renderShop();",
 prep:"setState('prep');renderPrepSummary();",
 run_intro:"runIntroShow('micelial',()=>{});RUN_INTRO.pages=[];RUN_INTRO.prologue=false;runIntroFill(document.getElementById('run-intro'),'micelial',ARENA_BRIEF.micelial);",
 tactical:"selectedClass='libertador';currentArena='bosque';lobbyAllies=['tanque','soporte','mago'];startRun(3);setState('playing');document.getElementById('pause-btn').click();",
 hud:"selectedClass='nigromante';currentArena='minas';lobbyAllies=['tanque','soporte','mago'];startRun(3);setState('playing');updateHUD();"
};
(async()=>{await new Promise(r=>setTimeout(r,500));
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||chromium.executablePath(),args:['--no-sandbox']});
 const found=[];
 try{for(const [width,height] of [[844,390],[667,375]]){
  const page=await browser.newPage({viewport:{width,height}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${PORT}/`,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>typeof startRun==='function'&&typeof codexGo==='function',null,{timeout:120000});await page.waitForTimeout(1500);
  await page.evaluate(()=>{for(const c in save.champions){save.champions[c].unlocked=true;save.champions[c].level=20;}save.arenasCleared=Object.fromEntries(ARENA_ORDER.map(a=>[a,true]));save.starterChosen=true;save.tut={training:1,basics:1};});
  for(const [name,js] of Object.entries(SCREENS)){
   try{await page.evaluate(new Function(js));}catch(e){found.push({viewport:`${width}x${height}`,screen:name,error:e.message});continue;}
   await page.waitForTimeout(350);
   const issues=await page.evaluate(()=>{
    const out=[],vis=el=>{const cs=getComputedStyle(el);if(cs.display==='none'||cs.visibility==='hidden'||+cs.opacity===0)return false;const r=el.getBoundingClientRect();return r.width>0&&r.height>0;};
    const clipped=el=>{for(let a=el;a&&a!==document.body;a=a.parentElement){const cs=getComputedStyle(a);if(/(hidden|auto|scroll|clip)/.test(cs.overflowX+cs.overflow))return a;}return null;};
    const framed=el=>{for(let a=el.parentElement;a&&a!==document.body;a=a.parentElement){const cs=getComputedStyle(a);if(parseFloat(cs.borderLeftWidth)>0||(cs.backgroundColor!=='rgba(0, 0, 0, 0)'&&cs.backgroundColor!=='transparent'))return a;}return null;};
    for(const el of document.querySelectorAll('body *')){
     if(['SCRIPT','STYLE','CANVAS','svg','path','IMG','INPUT','SELECT','OPTION'].includes(el.tagName))continue;
     const own=[...el.childNodes].filter(n=>n.nodeType===3&&n.textContent.trim()).map(n=>n.textContent.trim()).join(' ');if(!own)continue;
     if(!vis(el))continue;const cs=getComputedStyle(el);
     // extensión REAL del texto (rectángulos de sus nodos de texto), no scrollWidth: un hijo con márgenes
     // negativos para agrandar su zona táctil no es texto desbordado
     const box=el.getBoundingClientRect();let tx0=Infinity,tx1=-Infinity;
     for(const n of el.childNodes){if(n.nodeType!==3||!n.textContent.trim())continue;const rg=document.createRange();rg.selectNodeContents(n);for(const q of rg.getClientRects()){tx0=Math.min(tx0,q.left);tx1=Math.max(tx1,q.right);}}
     const tover=Math.max(box.left-tx0,tx1-box.right);
     if(tover>2&&cs.textOverflow!=='ellipsis'&&!/(hidden|auto|scroll|clip)/.test(cs.overflowX)){out.push({kind:'desborda su caja',text:own.slice(0,50),cls:el.className&&String(el.className).slice(0,40),id:el.id,by:Math.round(tover)});continue;}
     const f=framed(el);if(!f)continue;const r=el.getBoundingClientRect(),fr=f.getBoundingClientRect(),c=clipped(el);
     if(c&&c!==el&&c.contains(f)===false&&f.contains(c))continue;
     const over=Math.max(fr.left-r.left,r.right-fr.right);
     if(over>3&&!(c&&c.contains(el)&&f.contains(c))){out.push({kind:'sale del marco',text:own.slice(0,50),cls:el.className&&String(el.className).slice(0,40),id:el.id,frame:(f.id||String(f.className).slice(0,30)),by:Math.round(over)});}
    }
    return out.slice(0,12);
   });
   for(const i of issues)found.push({viewport:`${width}x${height}`,screen:name,...i});
   await page.evaluate(()=>{try{if(typeof RUN_INTRO!=='undefined'&&RUN_INTRO.open){RUN_INTRO.open=false;document.getElementById('run-intro').classList.add('hidden');}document.getElementById('pause-screen').classList.add('hidden');}catch(e){}});
  }
  await page.close();
 }}finally{await browser.close();server.kill();}
 for(const f of found)console.log(`${f.viewport} ${f.screen.padEnd(12)} ${f.error?('ERROR '+f.error):(f.kind+' +'+f.by+'px: "'+f.text+'" ['+(f.id||f.cls||'')+']'+(f.frame?' en '+f.frame:''))}`);
 console.log(found.length?`${found.length} problemas`:'PASS text overflow: ninguna pantalla con texto fuera de su marco');
 if(process.argv.includes('--report'))fs.writeFileSync(path.join(ROOT,'docs/bible/generated/text-overflow.json'),JSON.stringify(found,null,1)+'\n');
 if(found.length&&!process.argv.includes('--report'))process.exitCode=1;
})().catch(e=>{console.error(e);server.kill();process.exitCode=1;});
