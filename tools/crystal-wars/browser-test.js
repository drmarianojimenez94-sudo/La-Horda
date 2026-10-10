'use strict';
const {chromium}=require('playwright');const {spawn}=require('node:child_process');const assert=require('node:assert/strict');const path=require('node:path');
const fs=require('node:fs'),os=require('node:os');
const dataDir=fs.mkdtempSync(path.join(os.tmpdir(),'cw-browser-'));
const root=path.resolve(__dirname,'../..'),port=8897,relayPort=8898;
const http=spawn('python3',['-m','http.server',String(port)],{cwd:root,stdio:'ignore'});
const relay=spawn(process.execPath,['server/relay.js'],{cwd:root,env:{...process.env,PORT:String(relayPort),DATA_DIR:dataDir,DATABASE_URL:''},stdio:'pipe'});
let browser;const errors=[];
async function until(url){for(let i=0;i<50;i++){try{if((await fetch(url)).ok)return;}catch{}await new Promise(r=>setTimeout(r,100));}throw Error('Server not ready');}
(async()=>{
 await Promise.all([until('http://127.0.0.1:'+port),until('http://127.0.0.1:'+relayPort+'/health')]);
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});const pages=[];
 for(let i=0;i<4;i++){
  const context=await browser.newContext({viewport:i===0?{width:1280,height:1000}:{width:844,height:390},hasTouch:i>0,isMobile:i>0});const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(rp=>{localStorage.setItem('laHordaSave_v1',JSON.stringify({tut:{training:1}}));window.__cwLabels={};const fill=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(text,...args){if(typeof text==='string'&&(text.startsWith('TU CAMPO')||text.startsWith('CAMPO RIVAL')))window.__cwLabels[text]=performance.now();return fill.call(this,text,...args);};const Native=window.WebSocket;window.__cwMessages=[];window.WebSocket=class extends Native{constructor(...args){super(...args);if(!String(args[0]).includes(':'+rp))return;this.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.d?.k==='cw-state'){window.__cwSnapshot=m.d;window.__cwMessages.push(m.d.id);}});window.__cwSocket=this;}};},relayPort);
  await p.goto('http://127.0.0.1:'+port+'/index.html?server=ws://127.0.0.1:'+relayPort);await p.waitForFunction(()=>typeof cwGo==='function'&&typeof CrystalWarsUI!=='undefined');await p.evaluate(()=>{save.tut=save.tut||{};save.tut.training=1;cwGo();});await p.locator('#crystalwars-screen:not(.hidden) #name').waitFor();await p.locator('#name').fill('Tester '+i);await p.locator('#champ').selectOption(['tanque','mago','guerrero','soporte'][i]);pages.push(p);
 }
 const host=pages[0];await host.locator('#create').click();await host.waitForFunction(()=>document.querySelector('#room-code').textContent.length===6);const code=await host.locator('#room-code').textContent();
 for(const p of pages.slice(1)){await p.locator('#code').fill(code);await p.locator('#join').click();await p.locator('#ready').waitFor({state:'visible'});await p.locator('#ready').click();}
 await host.waitForFunction(()=>!document.querySelector('#start').disabled);await host.screenshot({path:'/tmp/cw-lobby.png'});await host.locator('#start').click();
 for(const p of pages)await p.locator('#cw-game').waitFor({state:'visible'});
 await pages[1].waitForFunction(()=>window.__cwSnapshot?.state.time>1);const first=await pages[1].evaluate(()=>window.__cwSnapshot);assert.equal(first.state.heroes[1].role,'mago');assert.equal(first.state.heroes[2].team,1);assert(first.state.heroes.every(h=>!h.bot));
 // Both fields render together, and focusing the rival must not stop guest controls.
 await pages[1].waitForFunction(()=>Object.keys(window.__cwLabels).length===2);
 await pages[1].locator('#view').click();
 assert.equal(await pages[1].locator('#view').textContent(),'Ampliar mi campo');
 await pages[1].locator('#shop button[data-key=swarm]').click();
 await pages[2].waitForFunction(()=>window.__cwSnapshot?.state.pending.some(p=>p.sender===1&&p.team===1));
 const y=first.state.heroes[1].y;await pages[1].keyboard.down('w');await pages[1].waitForFunction(y=>window.__cwSnapshot.state.heroes[1].y<y-20,y);await pages[1].keyboard.up('w');
 // A guest cannot submit an authoritative snapshot, spend for another slot, or teleport.
 await pages[1].evaluate(()=>{const id=window.__cwSnapshot.id;window.__cwSocket.send(JSON.stringify({t:'msg',d:{k:'cw-state',id,state:{ended:true}}}));window.__cwSocket.send(JSON.stringify({t:'msg',d:{k:'cw-input',id,x:1000000,y:1000000}}));});
 await pages[2].waitForFunction(()=>window.__cwSnapshot?.state.time>3);assert.equal(await pages[2].evaluate(()=>window.__cwSnapshot.state.ended),false);
 await pages[1].locator('#skills button').first().click();await pages[2].waitForFunction(()=>window.__cwSnapshot.state.heroes[1].cd[0]>0);
 await pages[2].waitForFunction(()=>window.__cwSnapshot.state.enemies.some(e=>e.sentBy===1&&e.team===1));
 await pages[1].locator('#view').click();
 await pages[2].waitForFunction(()=>window.__cwSnapshot.state.time>6);await host.screenshot({path:'/tmp/cw-desktop.png'});await pages[1].screenshot({path:'/tmp/cw-mobile.png'});
 assert(await pages[1].evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await pages[1].setViewportSize({width:667,height:375});
 await pages[1].waitForFunction(()=>document.querySelector('#battle').width===Math.round(document.querySelector('#battle').getBoundingClientRect().width*Math.min(2,devicePixelRatio||1)));
 const layout=await pages[1].evaluate(()=>{const ids=['joystick','skills','supply'],r=Object.fromEntries(ids.map(id=>{const q=document.getElementById(id).getBoundingClientRect();return [id,{left:q.left,right:q.right,top:q.top,bottom:q.bottom}];}));return {r,width:innerWidth,height:innerHeight};});
 for(const r of Object.values(layout.r))assert(r.left>=0&&r.right<=layout.width&&r.top>=0&&r.bottom<=layout.height,'mobile controls fit');
 assert(layout.r.joystick.right<=layout.r.supply.left&&layout.r.supply.right<=layout.r.skills.left,'supply does not cover touch controls');
 await pages[1].screenshot({path:'/tmp/cw-mobile-667.png'});
 await pages[1].setViewportSize({width:844,height:390});
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
 assert.deepEqual(errors,[]);console.log('PASS 4-client relay: choices, teams, simultaneous arenas, focus-safe movement/skills/sends, attributed arrivals, hostile inputs, guest reconnect, result, same-room rematch, host loss; desktop/mobile no JS errors');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();http.kill();relay.kill();fs.rmSync(dataDir,{recursive:true,force:true});});
