'use strict';
// Estratificado por rol/arena y sesiones repetidas. No estima win rates humanos.
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path');
const SITE=process.env.SITE||'http://127.0.0.1:8805';
const OUT=process.env.QA_OUT||'/tmp/horda-role-arena-soak.json';
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||chromium.executablePath(),args:['--no-sandbox']});
try{
 const p=await b.newPage({viewport:{width:844,height:390}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(SITE);await p.waitForFunction(()=>typeof assetsAllReady==='function'&&assetsAllReady());
 await p.addScriptTag({path:path.join(__dirname,'../balance/autopilot.js')});
 const roster=await p.evaluate(()=>{const groups={};for(const [key,c]of Object.entries(CLASSES))(groups[c.roleCategory]||=[]).push(key);return Object.entries(groups).flatMap(([role,keys])=>[...new Set([keys[0],keys[keys.length-1]])].map(key=>({key,role})));});
 const jobs=roster.flatMap(c=>['ciudad','micelial','minas'].flatMap(arena=>[117,991].map(seed=>({...c,arena,seed,ms:90000}))));
 const runs=[];
 for(const job of jobs){
  const r=await p.evaluate(job=>{
   let seed=job.seed;Math.random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
   setState('mainmenu');netMatch=null;save.stash=[];save.duoReserve=Object.keys(CLASSES).find(k=>k!==job.key&&CLASSES[k].roleCategory===job.role);
   save.relics={hp:0,dmg:0,def:0,vel:0};
   for(const s of Object.values(save.champions)){s.unlocked=true;s.level=20;s.xp=0;s.equipment={};s.inventory=[];s.talents={nodes:{},mastery:null,masteryNodes:{}};s.skillMastery=[0,1,2].map(()=>({...mkMastery(),alloc:4}));s.ultMastery={...mkMastery(),alloc:4};}
   lobbyAllies=['tanque','soporte','mago','guerrero'].filter(k=>k!==job.key&&k!==save.duoReserve).slice(0,3);
   __AP.start(job.key,job.arena,1);const start=performance.now(),sim=__AP.sim(job.ms,33.333);__AP.on=false;
   const s=player.stats,r={...job,sim,wallMs:performance.now()-start,damage:s.dmgDealt,healing:s.healEffective||0,taken:s.dmgTaken||0,casts:s.skillCasts,card:player.classKey,error:__AP.err||null,finite:heroes.every(h=>Number.isFinite(h.hp)&&Number.isFinite(h.maxHp))&&enemies.every(e=>Number.isFinite(e.hp)),pools:{particles:vCount,text:floatTexts.length,objects:portadorObjects.length}};
   setState('paused');return r;
  },job);runs.push(r);console.log(JSON.stringify({sample:job.key,arena:job.arena,seed:job.seed,simMs:r.sim.t,damage:r.damage,error:r.error}));
 }
 const soak=[];
 // 12 ciclos de 150 s por cada rol: hasta 30 min simulados y cambios/reintentos sin recargar.
 for(const c of roster.filter((v,i,a)=>a.findIndex(x=>x.role===v.role)===i)){
  const cycles=[];
  for(let i=0;i<12;i++)cycles.push(await p.evaluate(([key,i])=>{
   setState('mainmenu');netMatch=null;selectedClass=key;save.duoReserve=Object.keys(CLASSES).find(k=>k!==key);lobbyAllies=pickLobbyAllies(key);
   __AP.start(key,['ciudad','micelial','minas'][i%3],1);const sim=__AP.sim(150000,33.333);__AP.on=false;
   const r={cycle:i,simMs:sim.t,state,finite:heroes.every(h=>Number.isFinite(h.hp)),error:__AP.err||null,dom:document.getElementsByTagName('*').length,particles:vCount,objects:portadorObjects.length,timers:runTimers.length};
   setState('mainmenu');vfxResetRun();r.afterReset={particles:vCount,casts:fxCasts.filter(f=>f.on).length,flashes:fxFlashes.filter(f=>f.on).length};return r;
  },[c.key,i]));
  soak.push({...c,cycles});console.log(JSON.stringify({soak:c,cycles:cycles.length,simMinutes:cycles.reduce((a,x)=>a+x.simMs,0)/60000}));
 }
 const failures=[];
 for(const r of runs)if(r.error||!r.finite||!Number.isFinite(r.damage)||r.pools.particles>720||r.pools.objects>48)failures.push(r);
 for(const s of soak)for(const c of s.cycles)if(c.error||!c.finite||c.particles>720||c.objects>48||Object.values(c.afterReset).some(Boolean))failures.push(c);
 const comparison={};
 for(const r of runs){const group=comparison[r.role+'/'+r.arena]||=( {} );(group[r.key]||=[]).push(r.damage/Math.max(1,r.sim.t/1000));}
 const balance=Object.entries(comparison).map(([group,byChampion])=>{const means=Object.fromEntries(Object.entries(byChampion).map(([key,values])=>[key,values.reduce((a,b)=>a+b,0)/values.length]));const values=Object.values(means);return{group,meanDps:means,ratio:Math.max(...values)/Math.max(1,Math.min(...values)),review:Math.max(...values)>2*Math.max(1,Math.min(...values))};});
 const report={roster,runs,soak,balance,errors,failures,interpretation:'Simulación acelerada sin render, sin extrapolar a FPS/hardware ni victoria humana; damage corresponde al slot de dúo.'};
 fs.writeFileSync(OUT,JSON.stringify(report,null,2));console.log(JSON.stringify({runs:runs.length,soakCycles:soak.reduce((a,s)=>a+s.cycles.length,0),errors,failures:failures.length}));
 if(errors.length||failures.length)process.exitCode=1;
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
