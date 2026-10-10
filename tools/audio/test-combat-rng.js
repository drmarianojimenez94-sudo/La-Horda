'use strict';
// With identical simulation clocks, a real engine replay must not depend on mute.
const assert=require('node:assert/strict'),{spawn}=require('node:child_process'),{chromium}=require('playwright');
const server=spawn('python3',['-m','http.server','8798'],{stdio:'ignore'});
(async()=>{let browser;try{
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||chromium.executablePath(),args:['--no-sandbox']});
 const runs=[];
 for(const muted of [false,true]){
  const context=await browser.newContext();try{
   await context.addInitScript(m=>localStorage.setItem('horda_mute',m?'1':'0'),muted);
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:8798');await page.waitForFunction(()=>typeof CHAMPION_ENTRY_BALANCE!=='undefined');
   await page.addScriptTag({path:'tools/balance/autopilot.js'});
   const result=await page.evaluate(()=>{
    const originalNow=performance.now;performance.now=()=>__AP.clock;
    try {
    let n=117;Math.random=()=>{n=(1664525*n+1013904223)>>>0;return n/4294967296;};
    netMatch=null;save.stash=[];save.relics={hp:0,dmg:0,def:0,vel:0};
    for(const c of Object.values(save.champions)){Object.assign(c,{unlocked:true,level:20,xp:0,equipment:{},inventory:[],talents:{nodes:{},mastery:null,masteryNodes:{}}});c.skillMastery=[0,1,2].map(()=>({...mkMastery(),alloc:4}));c.ultMastery={...mkMastery(),alloc:4};}
    lobbyAllies=['tanque','soporte','mago'];__AP.start('saelis','bosque',1);__AP.sim(60000,33.333);__AP.on=false;setState('paused');
    return {damage:player.stats.dmgDealt,hp:player.hp,casts:player.stats.skillCasts,kills,rng:n,error:__AP.err||null};
    } finally { performance.now=originalNow; }
   });assert.deepEqual(errors,[]);assert.equal(result.error,null);assert(result.damage>0);runs.push(result);
  }finally{await context.close();}
 }
 assert.deepEqual(runs[0],runs[1],'mute changed combat, kills or the next random roll');
 console.log('PASS real-engine 60s replay: sound on/off has identical damage, HP, casts, kills and combat RNG',JSON.stringify(runs[0]));
}finally{if(browser)await browser.close();server.kill();}})().catch(e=>{console.error(e);process.exitCode=1;});
