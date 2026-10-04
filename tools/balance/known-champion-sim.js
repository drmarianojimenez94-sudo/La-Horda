'use strict';
/* Balance de campeones EXISTENTES (no pasa por el gate de entrada): mismas partidas que el gate
   (piloto automático real, Bosque, nivel 20, 3 semillas x 150 s) para comparar una versión contra otra
   y contra el techo por rol de docs/balance/champion-entry-reference.json (media x 1,35).
   Uso: KEYS=tanque,mago SITE=http://127.0.0.1:8771 node tools/balance/known-champion-sim.js [salida.json] */
const fs=require('node:fs'),path=require('node:path');
let chromium;try{({chromium}=require('playwright'));}catch(e){({chromium}=require('/opt/node22/lib/node_modules/playwright'));}
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||chromium.executablePath(),args:['--no-sandbox']});
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto((process.env.SITE||'http://127.0.0.1:8771')+'/',{waitUntil:'domcontentloaded',timeout:120000});
 await page.waitForFunction(()=>typeof startRun==='function'&&typeof CLASSES!=='undefined',null,{timeout:120000});
 await page.addScriptTag({path:path.join(__dirname,'autopilot.js')});
 const keys=(process.env.KEYS||'tanque,guerrero,mago,soporte,axiom').split(','),runs=[];
 for(const k of keys)for(const seed of [117,431,991]){
  runs.push(await page.evaluate(([k,seed])=>{
   let n=seed;Math.random=()=>{n=(1664525*n+1013904223)>>>0;return n/4294967296;};netMatch=null;save.stash=[];save.relics={hp:0,dmg:0,def:0,vel:0};
   for(const c in save.champions){const s=save.champions[c];s.unlocked=true;s.level=20;s.xp=0;s.equipment={};s.inventory=[];s.talents={nodes:{},mastery:null,masteryNodes:{}};s.skillMastery=[0,1,2].map(()=>({...mkMastery(),alloc:0}));s.ultMastery={...mkMastery(),alloc:0};}
   lobbyAllies=['tanque','soporte','mago'].map(c=>c===k?'guerrero':c);__AP.start(k,'bosque',1);__AP.sim(150000,33.333);__AP.on=false;
   const team=heroes.filter(h=>h!==player);
   const out={key:k,seed,damage:Math.round(player.stats.dmgDealt),alive:player.alive,hp:Math.round(player.hp),casts:player.stats.skillCasts,
    teamTaken:Math.round(team.reduce((s,h)=>s+(h.stats?h.stats.dmgTaken:0),0)),healing:Math.round(player.stats.healingDone||0),error:__AP.err||null};setState('paused');return out;
  },[k,seed]));
  process.stdout.write('.');
 }
 const ref=JSON.parse(fs.readFileSync(path.join(__dirname,'../../docs/balance/champion-entry-reference.json'),'utf8'));
 const roles=await page.evaluate(ks=>Object.fromEntries(ks.map(k=>[k,CLASSES[k].roleCategory])),keys);
 const summary=keys.map(k=>{const rs=runs.filter(r=>r.key===k),m=f=>Math.round(rs.reduce((s,r)=>s+r[f],0)/rs.length);
  const ceiling=Math.round(ref.roles[roles[k]].simulation.meanDamage150s*1.35);return {key:k,role:roles[k],meanDamage:m('damage'),ceiling,underCeiling:m('damage')<=ceiling,survived:rs.filter(r=>r.alive).length+'/'+rs.length,teamTaken:m('teamTaken'),healing:m('healing'),errors:rs.filter(r=>r.error).length};});
 console.log('\n'+JSON.stringify({summary,errors},null,1));
 if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify({site:process.env.SITE,summary,runs,errors},null,1)+'\n');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
