'use strict';
// Panel táctico: en partida sola pausa; en multijugador NO pausa (la simulación sigue avanzando), se
// abre semitransparente, muestra el kit completo con enfriamientos en vivo y se cierra tocando el fondo.
const assert=require('node:assert/strict'),{spawn}=require('node:child_process'),path=require('node:path');
let chromium;try{({chromium}=require('playwright'));}catch(e){({chromium}=require('/opt/node22/lib/node_modules/playwright'));}
const ROOT=path.resolve(__dirname,'../..'),PORT=+(process.env.TACTICAL_PORT||8835);
const server=spawn('python3',['-m','http.server',String(PORT),'--bind','127.0.0.1'],{cwd:ROOT,stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 await sleep(500);
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||chromium.executablePath(),args:['--no-sandbox']});
 try{
  for(const [width,height] of [[844,390],[667,375]]){
   const page=await browser.newPage({viewport:{width,height}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(`http://127.0.0.1:${PORT}/`,{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>typeof startRun==='function'&&typeof tacticalPanelOpen==='function',null,{timeout:120000});
   for(const key of ['musashi','vesper']){
    await page.evaluate(k=>{for(const ck in save.champions){const s=save.champions[ck];s.unlocked=true;s.level=20;}selectedClass=k;currentArena='bosque';lobbyAllies=['tanque','soporte','mago'];netMatch=null;startRun(3);setState('playing');},key);
    // partida sola: pausa
    await page.click('#pause-btn');await sleep(150);
    let r=await page.evaluate(()=>({state,cards:document.querySelectorAll('#tactical-panel .ab-card').length,vis:!document.getElementById('pause-screen').classList.contains('hidden'),txt:document.getElementById('tactical-panel').innerText}));
    assert.equal(r.state,'paused','single-player pauses');assert(r.vis);
    assert(r.cards>=5,`${key}: basic + passive + 3 skills + ult cards (${r.cards})`);
    assert(/Definitiva/i.test(r.txt)&&/Estados/i.test(r.txt)&&/Talentos/i.test(r.txt)&&/Equipo/i.test(r.txt),'sections present');
    await page.click('#resume-btn');await sleep(100);
    assert.equal(await page.evaluate(()=>state),'playing');
   }
   // multijugador simulado (anfitrión): no pausa, la partida avanza y el enfriamiento baja en vivo
   await page.evaluate(()=>{netMatch={role:'host'};player.cds[1]=6000;});
   await page.click('#pause-btn');await sleep(100);
   const a=await page.evaluate(()=>({state,t:runElapsedMs,live:document.getElementById('pause-screen').classList.contains('tactical-live'),title:document.querySelector('#pause-screen .arena-title').textContent,cd:document.getElementById('tactical-panel').innerText.match(/⏳ ([0-9,]+) s/)}));
   await sleep(1200);
   const b=await page.evaluate(()=>({state,t:runElapsedMs,cd:document.getElementById('tactical-panel').innerText.match(/⏳ ([0-9,]+) s/)}));
   assert.equal(a.state,'playing','multiplayer does not pause');assert(a.live,'semi-transparent live mode');assert.equal(a.title,'Panel táctico');
   assert(b.t>a.t+500,'simulation keeps running while panel is open');
   assert(a.cd&&b.cd&&parseFloat(b.cd[1].replace(',','.'))<parseFloat(a.cd[1].replace(',','.')),'cooldown updates live');
   await page.mouse.click(4,height/2);await sleep(100);
   assert(await page.evaluate(()=>document.getElementById('pause-screen').classList.contains('hidden')),'tap background closes');
   await page.evaluate(()=>{netMatch=null;});
   assert.deepEqual(errors,[]);
   console.log(`PASS ${width}x${height} tactical panel: single pauses, multiplayer live/no pause, live cooldowns, kit cards, close`);
   await page.close();
  }
 }finally{await browser.close();server.kill();}
})().catch(e=>{console.error(e);server.kill();process.exitCode=1;});
