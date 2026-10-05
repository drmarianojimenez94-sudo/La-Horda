#!/usr/bin/env node
'use strict';
// Compañeros del juego con identidad propia: en juego se muestran como cualquier jugador (nombre propio en el HUD, en los
// avisos y sobre el personaje; nunca "BOT"), con nombre único, estable por guardián durante la sesión y distinto al de un
// humano de la sala. La transparencia es general: el resultado de la partida avisa que hubo compañeros del juego.
// Uso: NODE_PATH=/opt/node-tools/node_modules node tools/alpha/bot-identity.js   (SITE=http://127.0.0.1:8813 opcional)
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const SITE=process.env.SITE||'http://127.0.0.1:8813';
(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
 const ctx=await b.newContext({viewport:{width:844,height:390}});const p=await ctx.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(SITE+'/index.html?lazy=0');
 await p.waitForFunction(()=>typeof assetsAllReady==='function'&&assetsAllReady()&&typeof startRun==='function'&&typeof botNameFor==='function');
 const r=await p.evaluate(async()=>{
  save.champions.mago.unlocked=true;save.starterChosen=true;save.tut=Object.assign(save.tut||{},{training:1});selectedClass='mago';persist();
  currentArena='ciudad';startRun(1);
  await new Promise(r=>setTimeout(r,600));
  const bots=allies.filter(a=>a.isBot);
  const out={n:bots.length,names:bots.map(a=>a.netName),labels:bots.map(heroLabel),rows:[...document.querySelectorAll('.ally-name')].map(n=>n.textContent.trim()),classes:bots.map(a=>a.classKey)};
  out.playerBot=isBotHero(player);out.disclosure=botDisclosureText();
  let threw=null;try{for(let i=0;i<3;i++)botDrawNameTags();}catch(e){threw=String(e);}out.threw=threw;
  // estable por guardián en la sesión
  out.stable=out.classes.map((k,i)=>botNameFor(k)===out.names[i]);
  // nunca repite el nombre de un humano
  const first=out.names[0];out.avoidsHuman=botNameFor('__otro__',[first])!==first;
  out.poolSize=BOT_NAME_POOL.length;out.longest=Math.max(...BOT_NAME_POOL.map(n=>n.length));
  return out;});
 assert(r.n>=1,'hay compañeros del juego '+JSON.stringify(r));
 assert(r.names.every(n=>n&&n!=='BOT'&&!/bot/i.test(n)),'nombres propios, sin "BOT": '+JSON.stringify(r.names));
 assert.equal(new Set(r.names.map(n=>n.toLowerCase())).size,r.names.length,'nombres únicos');
 assert.deepEqual(r.labels,r.names,'los avisos usan el nombre');
 assert(r.rows.length>=1&&r.rows.every((t,i)=>t.startsWith(r.names[i])&&!/bot/i.test(t)),'HUD: nombre · clase, sin BOT '+JSON.stringify(r.rows));
 assert(!r.playerBot,'el jugador no cuenta como compañero del juego');
 assert(r.stable.every(Boolean),'nombre estable por guardián');assert(r.avoidsHuman,'no repite el nombre de un humano');
 assert(/controlados por el juego/.test(r.disclosure),'aviso general disponible: '+r.disclosure);
 assert(r.poolSize>=100&&r.longest<=16,'pool amplio y nombres ≤ 16 caracteres');
 assert.equal(r.threw,null,'etiqueta sin errores');assert.deepEqual(errors,[],'sin errores de página');
 console.log('PASS bot-identity:',r.n,'compañeros →',r.names.join(', '));
 await b.close();
})().catch(e=>{console.error(e.message||e);process.exit(1);});
