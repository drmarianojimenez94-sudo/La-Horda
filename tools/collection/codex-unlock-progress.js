#!/usr/bin/env node
'use strict';
// Códice: la ficha de un campeón bloqueado de Ascensión dice cómo se gana y cuánto falta (0/3 → 2/3), y desaparece al tenerlo.
// Uso: NODE_PATH=/opt/node-tools/node_modules node tools/collection/codex-unlock-progress.js  (SITE=http://127.0.0.1:8813)
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const SITE=process.env.SITE||'http://127.0.0.1:8813';
(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
 const p=await (await b.newContext({viewport:{width:844,height:390}})).newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(SITE+'/index.html?lazy=0');
 await p.waitForFunction(()=>typeof assetsAllReady==='function'&&assetsAllReady()&&typeof codexRender==='function');
 const open=key=>p.evaluate(k=>{codexStack=[{view:'list',id:'campeones',label:'GUARDIANES'},{view:'champ',id:k,label:k}];codexChampTab='ficha';setState('codex');codexRender(true);const h=document.getElementById('cx-unlock-hint');return h?{text:h.innerText,now:(h.querySelector('[role=progressbar]')||{getAttribute:()=>null}).getAttribute('aria-valuenow')}:null;},key);
 await p.evaluate(()=>{save.champions.mago.unlocked=true;save.starterChosen=true;save.diffCleared=save.diffCleared||{};save.diffCleared.pesadilla={ciudad:1,bosque:1};persist();});
 let r=await open('vhal');
 assert(r&&/Pesadilla/.test(r.text)&&/2 \/ 3/.test(r.text)&&/67%/.test(r.text)&&r.now==='2','vhal 2/3: '+JSON.stringify(r));
 await p.evaluate(()=>{save.diffCleared.pesadilla={};persist();});
 r=await open('vhal');assert(/0 \/ 3/.test(r.text),'vhal 0/3: '+JSON.stringify(r));
 r=await open('aurelia');assert(r&&/0 \/ 1/.test(r.text),'aurelia 0/1');
 r=await open('mago');assert.equal(r,null,'un campeón base no muestra el bloque');
 await p.evaluate(()=>{save.champions.vhal.unlocked=true;persist();});
 r=await open('vhal');assert.equal(r,null,'ya desbloqueado: sin bloque');
 const fits=await p.evaluate(()=>{const e=document.documentElement;return e.scrollWidth<=e.clientWidth+1;});assert(fits,'sin desborde horizontal');
 assert.deepEqual(errors,[],'sin errores');
 console.log('PASS codex-unlock-progress: ficha bloqueada muestra cómo y cuánto falta');
 await b.close();
})().catch(e=>{console.error(e.message||e);process.exit(1);});
