#!/usr/bin/env node
'use strict';
// Honestidad de bots: en una partida con compañeros controlados por el juego, el HUD, los avisos y la etiqueta sobre
// el personaje los llaman "BOT · Clase"; los jugadores humanos no. Motor real, solo y con una sala simulada.
// Uso: NODE_PATH=/opt/node-tools/node_modules node tools/alpha/bot-labels.js   (SITE=http://127.0.0.1:8813 opcional)
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const SITE=process.env.SITE||'http://127.0.0.1:8813';
(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
 const ctx=await b.newContext({viewport:{width:844,height:390}});const p=await ctx.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(SITE+'/index.html?lazy=0');
 await p.waitForFunction(()=>typeof assetsAllReady==='function'&&assetsAllReady()&&typeof startRun==='function');
 const r=await p.evaluate(async()=>{
  save.champions.mago.unlocked=true;save.starterChosen=true;save.tut=Object.assign(save.tut||{},{training:1});selectedClass='mago';persist();
  currentArena='ciudad';startRun(1);
  await new Promise(r=>setTimeout(r,600));
  const bots=allies.filter(a=>a.isBot);
  const out={n:bots.length,labels:bots.map(heroLabel),rows:[...document.querySelectorAll('.ally-name')].map(n=>n.textContent.trim()),playerLabel:heroLabel(player),isBotPlayer:isBotHero(player)};
  // un compañero humano simulado (nombre propio) no se llama bot
  const fake={isBot:false,netName:'Ana',cls:bots[0]?bots[0].cls:player.cls};out.human=heroLabel(fake);out.humanIsBot=isBotHero(fake);
  let threw=null;try{for(let i=0;i<3;i++)botDrawNameTags();}catch(e){threw=String(e);}out.threw=threw;
  return out;});
 assert(r.n>=1,'hay compañeros bot '+JSON.stringify(r));
 assert(r.labels.every(l=>/^BOT · /.test(l)),'avisos: BOT · Clase '+JSON.stringify(r.labels));
 assert(r.rows.length>=1&&r.rows.every(t=>/^BOT · /.test(t)),'HUD: BOT · Clase '+JSON.stringify(r.rows));
 assert(!/BOT/.test(r.playerLabel)&&!r.isBotPlayer,'el jugador no es bot');
 assert.equal(r.human,'Ana');assert.equal(r.humanIsBot,false);assert.equal(r.threw,null,'etiqueta sin errores');
 assert.deepEqual(errors,[],'sin errores de página');
 console.log('PASS bot-labels:',r.n,'bots →',r.labels.join(', '));
 await b.close();
})().catch(e=>{console.error(e.message||e);process.exit(1);});
