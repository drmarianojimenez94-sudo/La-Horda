#!/usr/bin/env node
'use strict';
// ⚡ JUGAR YA de punta a punta con el relay REAL: (1) un jugador solo abre una sala pública y puede empezar con BOTs rotulados;
// (2) el segundo jugador que toca JUGAR YA se une a esa sala (humanos primero); (3) sin servidor online arranca solo con bots.
// Uso: NODE_PATH=/opt/node-tools/node_modules:server/node_modules node tools/net/quick-play.js  (SITE=http://127.0.0.1:8813)
const {chromium}=require('playwright'),{spawn}=require('node:child_process'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const SITE=process.env.SITE||'http://127.0.0.1:8813',PORT=18993,delay=ms=>new Promise(r=>setTimeout(r,ms));
const data=fs.mkdtempSync(path.join(os.tmpdir(),'horda-qp-'));
const relay=spawn(process.execPath,['server/relay.js'],{cwd:path.resolve(__dirname,'../..'),env:{...process.env,PORT:String(PORT),ACCOUNT_DATA_DIR:data,DATABASE_URL:''},stdio:'ignore'});
(async()=>{
 for(let i=0;i<60;i++){try{if((await fetch('http://127.0.0.1:'+PORT+'/health')).ok)break}catch{}await delay(100)}
 const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});let checks=0;const ok=(c,m)=>{assert(c,m);checks++;};
 async function player(name,server){
  const ctx=await b.newContext({viewport:{width:844,height:390}});const p=await ctx.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(SITE+'/index.html?lazy=0'+(server?'&server='+encodeURIComponent('ws://127.0.0.1:'+PORT):''));
  await p.waitForFunction(()=>typeof assetsAllReady==='function'&&assetsAllReady()&&typeof quickPlayStart==='function');
  await p.evaluate(n=>{save.champions.mago.unlocked=true;save.champions.tanque.unlocked=true;save.starterChosen=true;save.starterSkinPending=false;save.tut=Object.assign(save.tut||{},{training:1});save.firstRun=null;selectedClass=n==='B'?'tanque':'mago';persist();netSetPlayerName(n);setState('modeselect');},name);
  return {p,ctx,errors};
 }
 try{
  // ---- A abre sala ----
  const A=await player('A',true);
  await A.p.click('#mode-quickplay-btn');
  await A.p.waitForFunction(()=>netInRoom()&&net.role==='host',null,{timeout:20000});
  await A.p.waitForFunction(()=>{const e=document.getElementById('qp-bar');return e&&/Empezar ya/.test(e.innerText);},null,{timeout:10000});
  ok(await A.p.locator('#qp-bar').isVisible(),'barra de búsqueda visible');
  const txt=await A.p.locator('#qp-bar').innerText();ok(/BOT/.test(txt)&&/Empezar ya/.test(txt)&&/Cancelar/.test(txt),'la barra dice que los vacíos son BOTs '+txt);
  await delay(1300); // el relay guarda la lista de salas 1 s
  const rooms=await (await fetch('http://127.0.0.1:'+PORT+'/api/rooms')).json();ok(rooms.rooms.length===1&&rooms.rooms[0].humans===1,'sala pública con 1 humano '+JSON.stringify(rooms));
  // ---- B toca JUGAR YA y se une a la sala de A ----
  const B=await player('B',true);
  await B.p.click('#mode-quickplay-btn');
  await B.p.waitForFunction(()=>netInRoom()&&net.role==='guest',null,{timeout:20000});
  ok(true,'B se unió como invitado (humanos primero)');
  await A.p.waitForFunction(()=>netHumanCount()===2,null,{timeout:10000});
  await A.p.waitForFunction(()=>{const e=document.getElementById('qp-bar');return e&&/2 jugadores/.test(e.innerText);},null,{timeout:5000}).catch(()=>{});
  const bar2=await A.p.evaluate(()=>{const e=document.getElementById('qp-bar');return e?e.innerText:'(sin barra) state='+state+' busy='+QP.busy+' humans='+netHumanCount();});
  ok(bar2.includes('2 jugadores'),'A ve 2 jugadores: '+bar2);
  const rooms2=await (await fetch('http://127.0.0.1:'+PORT+'/api/rooms')).json();ok(rooms2.rooms.length===1,'B no creó otra sala');
  // ---- A empieza con B listo: 2 humanos + 2 bots rotulados ----
  await B.p.evaluate(()=>{netSendLoadout(true);netSend({t:'update',ready:true});});
  await A.p.waitForFunction(()=>netNotReady().length===0,null,{timeout:10000});
  // con todos los humanos listos, JUGAR YA empieza solo (no hace falta tocar "Empezar ya")
  await A.p.waitForFunction(()=>state==='playing'&&netMatch,null,{timeout:60000});
  const g=await A.p.evaluate(()=>({kinds:netMatch.slots.map(s=>s.kind),labels:heroes.map(h=>heroLabel(h)),prefLeft:netPublicPref()}));
  ok(g.kinds.filter(k=>k==='human').length===2&&g.kinds.filter(k=>k==='bot').length===2,'2 humanos + 2 bots '+JSON.stringify(g.kinds));
  ok(g.labels.filter(l=>/^BOT · /.test(l)).length===2,'los bots se rotulan "BOT · Clase" '+JSON.stringify(g.labels));
  ok(g.prefLeft===false,'la preferencia "pública" del jugador se restituye');
  ok(await A.p.evaluate(()=>!document.getElementById('qp-bar')),'la barra desaparece al empezar');
  assert.deepEqual(A.errors,[],'A sin errores');assert.deepEqual(B.errors,[],'B sin errores');
  await A.ctx.close();await B.ctx.close();
  // ---- C sin servidor: arranca solo con bots ----
  const C=await player('C',false);
  await C.p.evaluate(()=>{NET_CONFIG.serverUrl='';});
  ok(await C.p.evaluate(()=>!netAvailable()),'sin servidor online');
  await C.p.click('#mode-quickplay-btn');
  for(let i=0;i<20&&await C.p.evaluate(()=>state!=='playing');i++){ // la presentación del Hechicero puede pedir un toque
    await C.p.evaluate(()=>{const b=document.querySelector('#run-intro-go,#run-intro button,.run-intro-go');if(b)b.click();});await delay(500);}
  const s=await C.p.evaluate(()=>({state,bots:allies.filter(a=>a.isBot).length,net:!!netMatch}));
  ok(s.state==='playing'&&s.bots>=1&&!s.net,'sin servidor: partida con bots '+JSON.stringify(s));
  assert.deepEqual(C.errors,[],'C sin errores');await C.ctx.close();
  console.log(`PASS quick-play: ${checks} checks (sala pública, humanos primero, bots rotulados, sin servidor)`);
 }finally{await b.close();relay.kill();fs.rmSync(data,{recursive:true,force:true});}
})().catch(e=>{console.error(e.message||e);relay.kill();process.exit(1);});
