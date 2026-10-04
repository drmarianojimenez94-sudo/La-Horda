'use strict';
// Instrumented engine smoke coverage, not a claim about human difficulty or completion.
const {chromium}=require('playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});try{
 const p=await b.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(process.env.SITE||'http://127.0.0.1:8813');await p.waitForFunction(()=>typeof assetsAllReady==='function'&&assetsAllReady());
 await p.addScriptTag({path:'tools/balance/autopilot.js'});
 const matrix=await p.evaluate(()=>{
  const results=[],jobs=[...CHAMPION_CATALOG.map(c=>({champ:c.id,arena:'ciudad'})),...ARENA_ORDER.filter(a=>a!=='ciudad').map(arena=>({champ:'tanque',arena}))];
  for(const job of jobs){
   let seed=431;Math.random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
   save=defaultSave();for(const c of Object.values(save.champions)){c.unlocked=true;c.level=20;c.skillMastery.forEach(m=>m.alloc=4);c.ultMastery.alloc=4;}
   save.starterChosen=true;save.legacyOpenArenas=ARENA_ORDER.slice();save.tut={training:1};netMatch=null;lobbyAllies=['mago','soporte','guerrero'];
   try{__AP.start(job.champ,job.arena,1);__AP.sim(90000,33.333);__AP.on=false;results.push({...job,state,level:runLevel,hp:player.hp,damage:player.stats.dmgDealt,casts:player.stats.skillCasts,error:__AP.err||null,finite:Number.isFinite(player.hp)&&Number.isFinite(player.stats.dmgDealt)});setState('paused');}
   catch(e){results.push({...job,error:String(e),finite:false});}
  }
  return {secondsPerScenario:90,level:20,seed:431,champions:CHAMPION_CATALOG.length,arenas:ARENA_ORDER,results};
 });
 const report={...matrix,errors};fs.mkdirSync('docs/public-alpha',{recursive:true});fs.writeFileSync('docs/public-alpha/content-matrix.json',JSON.stringify(report,null,2));
 assert.deepEqual(errors,[]);assert(matrix.results.every(r=>r.finite&&!r.error));console.log('PASS '+matrix.results.length+' engine scenarios: '+matrix.champions+' champions / '+matrix.arenas.length+' campaign arenas; 90 simulated seconds each, level 20. Not a full campaign or balance certification.');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
