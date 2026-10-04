'use strict';
// Stress for Ascension/FAMILY VFX: 150-enemy horde, every ability + ultimate cast repeatedly for 6 s of
// real rendering per champion. Reports p50/p95 frame time, live entities and heap. Headless Chromium is
// not a phone: numbers are relative regression evidence, not device certification.
// Usage: ENTRY_BASE_URL=http://127.0.0.1:8750 node tools/ascension/performance.js
const {chromium}=require('playwright'),fs=require('node:fs');
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||chromium.executablePath(),args:['--no-sandbox','--enable-precise-memory-info']});try{
 const p=await b.newPage({viewport:{width:844,height:390}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(process.env.ENTRY_BASE_URL||'http://127.0.0.1:8806');await p.waitForFunction(()=>typeof ASCENSION!=='undefined'&&assetsAllReady());
 const rows=[];
 for(const k of [...Object.keys(ASCENSION_KEYS()),'myla','ynara'])rows.push(await p.evaluate(async k=>{
  for(const c in save.champions)Object.assign(save.champions[c],{unlocked:true,level:20});save.champions[k]||=mkChampion(true);
  selectedClass=k;currentArena='bosque';lobbyAllies=['tanque','soporte','mago'];startRun(3);enemies=[];spawnTimer=1e9;arenaHazardTimer=1e9;
  for(let i=0;i<150;i++){const e=spawnEnemy('esqueleto');Object.assign(e,{x:player.x+Math.cos(i)*(80+i*2),y:player.y+Math.sin(i*1.3)*(60+i),hp:1e7,maxHp:1e7,dmg:0});}
  document.querySelectorAll('.screen').forEach(s=>s.classList.add('hidden'));
  const frames=[];let last=performance.now(),maxObjs=0,maxFam=0;const t0=last;
  await new Promise(res=>{const tick=now=>{frames.push(now-last);last=now;
   if(frames.length%20===1){player.cds=[0,0,0];player.energy=999;for(let i=0;i<3;i++)castAbility(player,player.cls.skills[i],false,i);if(frames.length%120===1)castAbility(player,player.cls.ultimate,true);}
   maxObjs=Math.max(maxObjs,portadorObjects.filter(o=>o.life>0).length);if(typeof famPool!=='undefined')maxFam=Math.max(maxFam,famPool.filter(x=>x.on).length);
   if(now-t0<6000)requestAnimationFrame(tick);else res();};requestAnimationFrame(tick);});
  const s=frames.slice(5).sort((a,b)=>a-b),q=f=>Math.round(s[Math.floor(s.length*f)]*10)/10;
  const out={champion:k,frames:s.length,p50:q(.5),p95:q(.95),maxObjects:maxObjs,maxFamilyParticles:maxFam,heapMB:performance.memory?Math.round(performance.memory.usedJSHeapSize/1048576):null,swarm:k==='khepri'?Math.round(player.asState.swarm):undefined};
  setState('paused');return out;},k));
 for(const r of rows)console.log(JSON.stringify(r));
 const bad=rows.filter(r=>r.maxObjects>64||r.maxFamilyParticles>180||!(r.p95>0));
 fs.mkdirSync('docs/founders',{recursive:true});fs.writeFileSync('docs/founders/performance-results.json',JSON.stringify({note:'Headless Chromium, 150 enemies, repeated casts; relative evidence only (not a device test).',rows,errors},null,2)+'\n');
 if(errors.length||bad.length){console.error(JSON.stringify({errors,bad}));process.exitCode=1;}
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
function ASCENSION_KEYS(){return {nano_gm:1,facu_gm:1,aurelia:1,khepri:1,velmira:1,vhal:1,bront:1,oriel:1};}
