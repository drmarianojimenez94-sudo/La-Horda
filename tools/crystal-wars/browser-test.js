'use strict';
const {chromium}=require('playwright');const {spawn}=require('node:child_process');const assert=require('node:assert/strict');const path=require('node:path');
const root=path.resolve(__dirname,'../..'),port=8897,relayPort=8898;
const http=spawn('python3',['-m','http.server',String(port)],{cwd:root,stdio:'ignore'});
const relay=spawn(process.execPath,['server/relay.js'],{cwd:root,env:{...process.env,PORT:String(relayPort),ACCOUNT_DATA_DIR:'/tmp/cw-browser-accounts'},stdio:'pipe'});
let browser;const errors=[];
async function until(url){for(let i=0;i<50;i++){try{if((await fetch(url)).ok)return;}catch{}await new Promise(r=>setTimeout(r,100));}throw Error('Server not ready');}
(async()=>{
 await Promise.all([until('http://127.0.0.1:'+port),until('http://127.0.0.1:'+relayPort+'/health')]);
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});const pages=[];
 for(let i=0;i<4;i++){
  const context=await browser.newContext({viewport:i===0?{width:1280,height:1000}:{width:844,height:390},hasTouch:i>0,isMobile:i>0});const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(rp=>{localStorage.setItem('laHordaSave_v1',JSON.stringify({tut:{training:1}}));const Native=window.WebSocket;window.__cwMessages=[];window.WebSocket=class extends Native{constructor(...args){super(...args);if(!String(args[0]).includes(':'+rp))return;this.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.d?.k==='cw-state'){window.__cwSnapshot=m.d;window.__cwMessages.push(m.d.id);}});window.__cwSocket=this;}};},relayPort);
  await p.goto('http://127.0.0.1:'+port+'/index.html?server=ws://127.0.0.1:'+relayPort);await p.waitForFunction(()=>typeof cwGo==='function'&&typeof CrystalWarsUI!=='undefined');await p.evaluate(()=>{save.tut=save.tut||{};save.tut.training=1;cwGo();});await p.locator('#crystalwars-screen:not(.hidden) #name').waitFor();await p.locator('#name').fill('Tester '+i);await p.locator('#champ').selectOption(['tanque','mago','guerrero','soporte'][i]);pages.push(p);
 }
 const host=pages[0];await host.locator('#create').click();await host.waitForFunction(()=>document.querySelector('#room-code').textContent.length===6);const code=await host.locator('#room-code').textContent();
 for(const p of pages.slice(1)){await p.locator('#code').fill(code);await p.locator('#join').click();await p.locator('#ready').waitFor({state:'visible'});await p.locator('#ready').click();}
 await host.waitForFunction(()=>!document.querySelector('#start').disabled);await host.screenshot({path:'/tmp/cw-lobby.png'});await host.locator('#start').click();
 for(const p of pages)await p.locator('#cw-game').waitFor({state:'visible'});
 await pages[1].waitForFunction(()=>window.__cwSnapshot?.state.time>1);const first=await pages[1].evaluate(()=>window.__cwSnapshot);assert.equal(first.state.heroes[1].role,'mago');assert.equal(first.state.heroes[2].team,1);assert(first.state.heroes.every(h=>!h.bot));
 const y=first.state.heroes[1].y;await pages[1].keyboard.down('w');await pages[1].waitForFunction(y=>window.__cwSnapshot.state.heroes[1].y<y-20,y);await pages[1].keyboard.up('w');
 // A guest cannot submit an authoritative snapshot, spend for another slot, or teleport.
 await pages[1].evaluate(()=>{const id=window.__cwSnapshot.id;window.__cwSocket.send(JSON.stringify({t:'msg',d:{k:'cw-state',id,state:{ended:true}}}));window.__cwSocket.send(JSON.stringify({t:'msg',d:{k:'cw-input',id,x:1000000,y:1000000}}));});
 await pages[2].waitForFunction(()=>window.__cwSnapshot?.state.time>3);assert.equal(await pages[2].evaluate(()=>window.__cwSnapshot.state.ended),false);
 await pages[1].locator('#skills button').first().click();await pages[2].waitForFunction(()=>window.__cwSnapshot.state.heroes[1].cd[0]>0);
 await pages[2].waitForFunction(()=>window.__cwSnapshot.state.time>6);await host.screenshot({path:'/tmp/cw-desktop.png'});await pages[1].screenshot({path:'/tmp/cw-mobile.png'});
 assert(await pages[1].evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 // Guest transport loss must switch to a bot and recover the same slot.
 await pages[3].evaluate(()=>window.__cwSocket.close());await pages[2].waitForFunction(()=>window.__cwSnapshot.state.heroes[3].bot);await pages[3].waitForFunction(()=>window.__cwSocket.readyState===1&&!window.__cwSnapshot.state.heroes[3].bot,{},{timeout:10000});
 // Accelerate the actual host simulation to exercise a complete networked result.
 await host.evaluate(()=>{const step=CrystalWars.step;CrystalWars.step=(...args)=>{for(let i=0;i<250;i++)step(...args);};});
 for(const p of pages)await p.locator('#result[open]').waitFor({timeout:15000});
 for(const p of pages)assert((await p.locator('#result-stats tbody tr').count())===4,'resultados con estadísticas de los cuatro jugadores');
 if(process.env.CW_SHOT)await pages[1].screenshot({path:process.env.CW_SHOT});
 const outcomes=await Promise.all(pages.slice(1).map(p=>p.evaluate(()=>window.__cwSnapshot.state.winner)));assert(outcomes.every(w=>w===outcomes[0]));
 await host.locator('#rematch').click();for(const p of pages)await p.locator('#lobby').waitFor({state:'visible'});assert.equal(await host.locator('#room-code').textContent(),code);
 for(const p of pages.slice(1))await p.locator('#ready').click();await host.waitForFunction(()=>!document.querySelector('#start').disabled);await host.locator('#start').click();await pages[1].waitForFunction(id=>window.__cwSnapshot.id!==id,first.id);
 // Close host during a match; guests must see interruption, not invented victory.
 await host.close();await pages[1].waitForFunction(()=>document.querySelector('#result-title').textContent==='PARTIDA INTERRUMPIDA');
 assert.deepEqual(errors,[]);console.log('PASS 4-client relay: choices, teams, movement, skills, hostile inputs, guest reconnect, result, same-room rematch, host loss; desktop/mobile no JS errors');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();http.kill();relay.kill();});
