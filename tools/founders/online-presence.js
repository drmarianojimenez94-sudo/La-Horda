'use strict';
// Founder presence on the REAL relay with three browsers (NanoGM host, FacuGM, plain guest):
// verified identity, lobby banners (single and grouped), FOUNDER badge, arena banner, cosmetic meeting,
// grant-only champion gating, and no repeated banner on reconnect.
const {chromium}=require('playwright'),{spawn}=require('node:child_process'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'../..'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'horda-founders-online-'));
const WEB=8831,RELAY=8832,API='http://127.0.0.1:'+RELAY;let browser,servers=[];
(async()=>{
 const {create,hashPassword}=require('../../server/accounts');const seed=create({dataDir:dir,databaseUrl:'',adminUsers:'',log:()=>{}});await seed.ready;
 for(const u of ['NanoGM','FacuGM','Invitado1'])await seed.store.createUser({user:u,userKey:u.toLowerCase(),name:u,createdAt:Date.now(),lastLogin:Date.now(),passHash:await hashPassword('fixture-password')});await seed.close();
 servers=[spawn('python3',['-m','http.server',String(WEB)],{cwd:ROOT,stdio:'ignore'}),spawn(process.execPath,['server/relay.js'],{cwd:ROOT,env:{...process.env,PORT:String(RELAY),DATABASE_URL:'',DATA_DIR:dir,ALLOWED_ORIGINS:'http://127.0.0.1:'+WEB,FOUNDERS_JSON:JSON.stringify({nano:{account:'NanoGM'},facu:{account:'FacuGM'}})},stdio:'ignore'})];
 for(let i=0;i<40;i++){try{if((await fetch(API+'/api/health')).ok)break;}catch(e){}await new Promise(r=>setTimeout(r,250));}
 const token=async u=>(await (await fetch(API+'/api/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({user:u,pass:'fixture-password'})})).json()).token;
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});const errors=[],checks=[],check=(name,ok,details)=>{checks.push({name,ok:!!ok,...(details!==undefined?{details}:{})});};
 async function client(user,champ){
  const t=await token(user),ctx=await browser.newContext({viewport:{width:844,height:390},isMobile:true,hasTouch:true});
  await ctx.addInitScript(([api,t,user])=>{localStorage.setItem('horda_account:'+encodeURIComponent(api),JSON.stringify({token:t,user,name:user,expiresAt:Date.now()+864e5,apiBase:api}));localStorage.setItem('horda_name',user);},[API,t,user]);
  const p=await ctx.newPage();p.on('pageerror',e=>errors.push(user+': '+e.message));
  await p.goto(`http://127.0.0.1:${WEB}/?server=${encodeURIComponent('ws://127.0.0.1:'+RELAY)}`);await p.waitForFunction(()=>typeof assetsAllReady==='function'&&assetsAllReady());
  await p.evaluate(champ=>{window.__presence=[];netOn('presence',m=>__presence.push(m));save.starterChosen=true;save.tut={training:1};for(const c of Object.values(save.champions)){c.unlocked=true;c.level=15;}selectedClass=champ;currentArena='ciudad';setState('prep');renderPrepSummary();},champ);
  return p;
 }
 const nano=await client('NanoGM','nano_gm'),facu=await client('FacuGM','facu_gm'),guest=await client('Invitado1','tanque');
 const pres=p=>p.evaluate(()=>__presence.map(m=>m.scope+':'+m.founders.map(f=>f.key).join('+')));
 // 1) Nano and Facu arrive together -> ONE grouped lobby banner.
 await nano.evaluate(()=>netCreateRoom(currentArena,selectedClass,15));const code=await nano.evaluate(()=>net.code);
 await facu.evaluate(code=>netJoinRoom(code,selectedClass,15),code);
 await nano.waitForFunction(()=>__presence.length>=1,null,{timeout:8000});await facu.waitForFunction(()=>__presence.length>=1,null,{timeout:8000});
 check('grouped lobby banner for simultaneous founders',JSON.stringify(await pres(nano))==='["lobby:nano+facu"]',await pres(nano));
 check('banner text: LOS GAME MASTERS HAN ENTRADO EN EL LOBBY',/LOS GAME MASTERS HAN ENTRADO EN EL LOBBY/.test(await facu.evaluate(()=>document.getElementById('founder-presence')?.textContent||'')));
 check('identity verified by relay',await nano.evaluate(()=>net.identity&&net.identity.founder==='nano')&&await facu.evaluate(()=>net.identity&&net.identity.founder==='facu'));
 // 2) plain guest joins late: no new banner; sees both badges; cannot pick a founder champion.
 await guest.evaluate(code=>netJoinRoom(code,selectedClass,15),code);await guest.waitForFunction(()=>netHumanCount()===3);
 await guest.evaluate(()=>netRenderLobbySlots&&netRenderLobbySlots());await guest.waitForTimeout(1600);
 check('late guest triggers no founder banner',(await pres(nano)).length===1&&(await pres(guest)).length===0);
 check('relay marks founders in room (public data only)',await guest.evaluate(()=>JSON.stringify(net.room.slots.map(s=>s&&s.founder))==='["nano","facu","null",null]'.replace('"null"','null')));
 check('no private data in room state',await guest.evaluate(()=>!JSON.stringify(net.room).match(/token|email|userId|"id":/)));
 await guest.evaluate(()=>netSend({t:'update',champ:'nano_gm'}));await guest.waitForTimeout(500);
 check('guest cannot take a founder champion',await nano.evaluate(()=>net.room.slots[2].champ!=='nano_gm'));
 // 3) start: arena banner for both founders on every client, cosmetic meeting, champion integrity.
 for(const p of [facu,guest])await p.evaluate(()=>netSendLoadout(true));await nano.waitForFunction(()=>[1,2].every(i=>netDuoLoadoutValid(i)),null,{timeout:8000});
 await nano.evaluate(()=>netHostStartGame());for(const p of [nano,facu,guest])await p.waitForFunction(()=>netMatch&&state==='playing',null,{timeout:15000});
 for(const p of [nano,facu,guest])await p.waitForFunction(()=>__presence.some(m=>m.scope==='arena'),null,{timeout:8000});
 const arenas=await Promise.all([nano,facu,guest].map(p=>p.evaluate(()=>__presence.filter(m=>m.scope==='arena').map(m=>m.founders.map(f=>f.key).join('+')).join())));
 check('arena banner reaches host and guests',arenas.every(x=>x==='nano+facu'),arenas);
 check('heroes keep founder champions',await nano.evaluate(()=>heroes[0].classKey==='nano_gm'&&heroes[1].classKey==='facu_gm'));
 check('Nano + Facu cosmetic meeting fires once at start',await nano.evaluate(()=>!!ascFounderMeet));
 check('founder badge on ally HUD (verified)',await guest.evaluate(()=>heroes.filter(h=>h.netFounder).map(h=>h.netFounder).sort().join()==='facu,nano'));
 // 4) Facu reconnects mid-match: no repeated banner anywhere.
 const before=await Promise.all([nano,facu,guest].map(pres));
 await facu.evaluate(()=>{net.wantReconnect=true;net.ws.close();});
 await nano.waitForFunction(()=>net.room&&net.room.slots[1]&&!net.room.slots[1].connected,null,{timeout:15000});
 check('relay saw the founder disconnect',true);
 await facu.evaluate(()=>typeof netTryReconnect==='function'&&netTryReconnect());
 await nano.waitForFunction(()=>net.room&&net.room.slots[1]&&net.room.slots[1].connected,null,{timeout:20000});await nano.waitForTimeout(1600);
 check('founder identity restored after reconnect',await nano.evaluate(()=>net.room.slots[1].founder==='facu'));
 const after=await Promise.all([nano,facu,guest].map(pres));
 check('reconnect does not repeat banners',JSON.stringify(after)===JSON.stringify(before),{before,after});
 check('no page errors',errors.length===0,errors);
 fs.mkdirSync(path.join(ROOT,'docs/founders'),{recursive:true});fs.writeFileSync(path.join(ROOT,'docs/founders/online-presence-results.json'),JSON.stringify({checks,errors},null,2)+'\n');
 console.log(JSON.stringify({checks:checks.length,failed:checks.filter(c=>!c.ok)},null,1));if(checks.some(c=>!c.ok))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();servers.forEach(s=>s.kill());setTimeout(()=>fs.rmSync(dir,{recursive:true,force:true}),300);});
