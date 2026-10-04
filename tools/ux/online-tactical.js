'use strict';
// Panel táctico y long press en MULTIJUGADOR REAL (relay + anfitrión + invitado):
//  - el invitado abre ❚❚: su partida sigue ('playing'), el anfitrión sigue simulando y no se entera;
//  - el panel del invitado muestra SU kit con enfriamientos que bajan con la simulación del anfitrión;
//  - el long press del invitado no lanza nada y no manda intención de lanzamiento al anfitrión;
//  - el anfitrión abre su panel y tampoco pausa a nadie.
const assert=require('node:assert/strict'),{spawn}=require('node:child_process'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
let chromium;try{({chromium}=require('playwright'));}catch(e){({chromium}=require('/opt/node22/lib/node_modules/playwright'));}
const ROOT=path.resolve(__dirname,'../..'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'horda-tactical-online-'));
const servers=[spawn('python3',['-m','http.server','8840','--bind','127.0.0.1'],{cwd:ROOT,stdio:'ignore'}),spawn(process.execPath,['server/relay.js'],{cwd:ROOT,env:{...process.env,PORT:'8841',DATABASE_URL:'',ACCOUNT_DATA_DIR:dir},stdio:'ignore'})];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));let browser;
(async()=>{await sleep(800);browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||chromium.executablePath(),args:['--no-sandbox']});
 const errors=[],pages=[];
 for(const champ of ['tanque','mago']){const ctx=await browser.newContext({viewport:{width:844,height:390},isMobile:true,hasTouch:true});const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));
  await p.goto('http://127.0.0.1:8840/?server=ws%3A%2F%2F127.0.0.1%3A8841');await p.waitForFunction(()=>typeof assetsAllReady==='function'&&assetsAllReady(),null,{timeout:120000});
  await p.evaluate(champ=>{save.starterChosen=true;save.tut={training:1,basics:1};for(const c of Object.values(save.champions)){c.unlocked=true;c.level=15;}selectedClass=champ;currentArena='ciudad';setState('prep');renderPrepSummary();},champ);pages.push(p);}
 const [host,guest]=pages;
 await host.evaluate(()=>netCreateRoom(currentArena,selectedClass,15));const code=await host.evaluate(()=>net.code);
 await guest.evaluate(code=>netJoinRoom(code,selectedClass,15),code);await host.waitForFunction(()=>netHumanCount()===2,null,{timeout:30000});
 await guest.evaluate(()=>netSendLoadout(true));await host.waitForFunction(()=>netDuoLoadoutValid(1),null,{timeout:30000});
 await host.evaluate(()=>netHostStartGame());for(const p of pages)await p.waitForFunction(()=>netMatch&&state==='playing',null,{timeout:30000});
 await host.evaluate(()=>{setInterval(()=>{spawnTimer=1e9;levelTimer=0;},50);});
 // el invitado lanza una habilidad (Nova, sin apuntado) y abre el panel táctico
 const box=await guest.locator('#btn-s2').boundingBox();await guest.mouse.move(box.x+box.width/2,box.y+box.height/2);await guest.mouse.down();await sleep(60);await guest.mouse.up();
 await guest.waitForFunction(()=>player.cds[1]>0,null,{timeout:8000});
 const t0=await host.evaluate(()=>runElapsedMs);
 await guest.click('#pause-btn');await sleep(200);
 const g1=await guest.evaluate(()=>({state,live:document.getElementById('pause-screen').classList.contains('tactical-live'),vis:!document.getElementById('pause-screen').classList.contains('hidden'),cd:document.getElementById('tactical-panel').innerText.match(/⏳ ([0-9,]+) s/),name:document.querySelector('#tactical-panel .tp-name').textContent}));
 await sleep(1500);
 const g2=await guest.evaluate(()=>({state,cd:document.getElementById('tactical-panel').innerText.match(/⏳ ([0-9,]+) s/)}));
 const h1=await host.evaluate(()=>({state,t:runElapsedMs,paused:!document.getElementById('pause-screen').classList.contains('hidden')}));
 assert.equal(g1.state,'playing','guest panel does not pause the guest');assert(g1.live&&g1.vis,'guest sees live tactical panel');assert(/Thalen/.test(g1.name),'guest panel shows the guest champion: '+g1.name);
 assert.equal(h1.state,'playing','host keeps playing');assert(h1.t>t0+1000,'host simulation advanced while guest panel open');assert.equal(h1.paused,false,'host not paused');
 assert(g1.cd&&g2.cd&&parseFloat(g2.cd[1].replace(',','.'))<parseFloat(g1.cd[1].replace(',','.')),'guest cooldown counts down from host simulation');
 // long press del invitado: ficha, sin lanzar, sin intención al anfitrión
 await guest.click('#resume-btn');await sleep(150);
 const sent=await guest.evaluate(()=>{window.__sent=[];const o=netSendToHost;netSendToHost=function(m){window.__sent.push(m&&m.k);return o.apply(this,arguments);};return true;});
 const b3=await guest.locator('#btn-s3').boundingBox();await guest.evaluate(()=>{player.cds[2]=0;});
 await guest.mouse.move(b3.x+b3.width/2,b3.y+b3.height/2);await guest.mouse.down();await sleep(700);
 const insp=await guest.evaluate(()=>abilityInspectorIsOpen());await guest.mouse.up();await sleep(150);
 const after=await guest.evaluate(()=>({sent:window.__sent.filter(k=>k&&k!=='in'&&k!=='mv'&&k!=='ping'),cd:player.cds[2]}));
 assert.equal(insp,true,'guest long press opens the card');assert.equal(after.cd,0,'long press does not cast on guest');
 assert(!after.sent.some(k=>/cast|skill|sk/.test(String(k))),'no cast intent sent to host: '+JSON.stringify(after.sent));
 // el anfitrión abre su panel: no pausa al invitado
 const tg=await guest.evaluate(()=>runElapsedMs);await host.click('#pause-btn');await sleep(1200);
 const g3=await guest.evaluate(()=>({state,t:runElapsedMs}));const h3=await host.evaluate(()=>state);
 assert.equal(h3,'playing','host panel does not pause the host match');assert.equal(g3.state,'playing');assert(g3.t>tg+500,'guest keeps receiving the match');
 assert.deepEqual(errors,[]);
 console.log('PASS online tactical panel: guest/host panels never pause, live cooldowns from host, guest long press sends no cast');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();servers.forEach(s=>s.kill());setTimeout(()=>fs.rmSync(dir,{recursive:true,force:true}),200);});
