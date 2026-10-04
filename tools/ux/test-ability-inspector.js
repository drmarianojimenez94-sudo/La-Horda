'use strict';
// Long press de habilidades (UX Bible): toque = lanza; mantener = ficha sin lanzar; arrastrar tras la
// ficha = apunta y lanza; habilidad en enfriamiento = se puede consultar; definitiva igual; la ficha
// entra en pantalla en 844x390 (iPhone 13 Pro horizontal) y 667x375.
const assert=require('node:assert/strict'),{spawn}=require('node:child_process'),path=require('node:path');
let chromium;try{({chromium}=require('playwright'));}catch(e){({chromium}=require('/opt/node22/lib/node_modules/playwright'));}
const ROOT=path.resolve(__dirname,'../..'),PORT=+(process.env.INSPECT_PORT||8834);
const server=spawn('python3',['-m','http.server',String(PORT),'--bind','127.0.0.1'],{cwd:ROOT,stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 await sleep(500);
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||chromium.executablePath(),args:['--no-sandbox']});
 try{
  for(const [width,height] of [[844,390],[667,375]]){
   const page=await browser.newPage({viewport:{width,height}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(`http://127.0.0.1:${PORT}/`,{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>typeof startRun==='function'&&typeof abilityInspectorOpen==='function',null,{timeout:120000});
   const start=()=>page.evaluate(()=>{for(const ck in save.champions){const s=save.champions[ck];s.unlocked=true;s.level=20;}
     selectedClass='mago';currentArena='bosque';lobbyAllies=['tanque','soporte','guerrero'];startRun(3);setState('playing');
     enemies=[];spawnTimer=1e9;for(let i=0;i<4;i++){const e=spawnEnemy('esqueleto');Object.assign(e,{x:player.x+90+i*20,y:player.y,hp:1e7,maxHp:1e7,speed:0,dmg:0});}
     player.energy=1e4;player.cds=[0,0,0];player.ultCharge=player.ultMax;player.ultCd=0;runLevel=Math.max(runLevel,ULT_MIN_ARENA_LEVEL);});
   await start();
   const center=async id=>{const b=await page.locator('#'+id).boundingBox();return [b.x+b.width/2,b.y+b.height/2];};
   const st=()=>page.evaluate(()=>({open:abilityInspectorIsOpen(),vis:!document.getElementById('ability-inspector').classList.contains('hidden'),cd:[...player.cds],ult:player.ultCharge,rect:(()=>{const r=document.getElementById('ability-inspector').getBoundingClientRect();return [r.left,r.top,r.right,r.bottom];})()}));
   // 1) toque rápido en Nova (sin apuntado) -> lanza
   let [x,y]=await center('btn-s2');await page.mouse.move(x,y);await page.mouse.down();await sleep(60);await page.mouse.up();await sleep(80);
   let s=await st();assert(s.cd[1]>0,'tap casts self-cast ability');assert(!s.open);
   // 2) mantener Cadena (con apuntado) -> ficha, sin lanzar; soltar -> se cierra, sin lanzar
   [x,y]=await center('btn-s3');await page.mouse.move(x,y);await page.mouse.down();await sleep(700);
   s=await st();assert(s.open&&s.vis,'long press opens inspector');assert.equal(s.cd[2],0,'long press does not cast');
   assert(s.rect[0]>=0&&s.rect[1]>=0&&s.rect[2]<=width&&s.rect[3]<=height,`inspector inside viewport ${width}x${height}: ${s.rect}`);
   const html=await page.locator('#ability-inspector').innerText();assert(/Cadena de Relámpago/.test(html)&&/Enfriamiento/.test(html),'shows name and cooldown');
   await page.mouse.up();await sleep(80);s=await st();assert(!s.open,'release closes');assert.equal(s.cd[2],0,'release after inspect does not cast');
   // 3) mantener, luego arrastrar -> se cierra la ficha y lanza al soltar
   await page.mouse.move(x,y);await page.mouse.down();await sleep(650);assert((await st()).open);
   await page.mouse.move(x-50,y-10,{steps:5});s=await st();assert(!s.open,'drag closes inspector');
   await page.mouse.up();await sleep(80);s=await st();assert(s.cd[2]>0,'drag after inspect aims and casts');
   // 4) habilidad en enfriamiento: mantener consulta; toque no lanza
   await page.mouse.move(x,y);await page.mouse.down();await sleep(650);s=await st();assert(s.open,'inspect while on cooldown');
   assert(/⏳/.test(await page.locator('#ability-inspector').innerText()),'shows remaining cooldown');await page.mouse.up();await sleep(60);
   // 5) definitiva: mantener consulta sin gastar carga; toque lanza
   [x,y]=await center('btn-ult');const before=(await st()).ult;
   await page.mouse.move(x,y);await page.mouse.down();await sleep(650);s=await st();assert(s.open,'ult inspect');await page.mouse.up();await sleep(60);
   assert.equal((await st()).ult,before,'ult inspect keeps charge');
   await page.mouse.down();await sleep(50);await page.mouse.up();await sleep(80);assert.equal((await st()).ult,0,'ult tap casts');
   assert.deepEqual(errors,[]);
   console.log(`PASS ${width}x${height} ability inspector: tap, long press without cast, drag-to-aim, cooldown inspect, ultimate`);
   await page.close();
  }
 }finally{await browser.close();server.kill();}
})().catch(e=>{console.error(e);server.kill();process.exitCode=1;});
