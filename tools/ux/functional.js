'use strict';
// Current single-champion contract. Historical reserve/handoff assertions are invalid.
const {chromium}=require('playwright'),{spawn}=require('node:child_process'),fs=require('node:fs');
const server=spawn('python3',['-m','http.server','8805'],{stdio:'ignore'});let browser;
(async()=>{await new Promise(r=>setTimeout(r,500));browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});const p=await browser.newPage({viewport:{width:844,height:390}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:8805');await p.waitForFunction(()=>typeof assetsAllReady==='function'&&assetsAllReady());
const checks=await p.evaluate(()=>{
 const out=[],ok=(name,pass)=>out.push({name,ok:!!pass});
 for(const c of Object.values(save.champions)){c.unlocked=true;c.level=20;}
 save.tut={training:1};selectedClass='mago';save.duoReserve='eren';currentArena='ciudad';divinaMode=false;titleContinue();ok('Completed onboarding reaches menu',state==='mainmenu');
 for(const key of Object.keys(CLASSES)){
  setState('prep');selectedClass=key;lobbyAllies=['soporte','tanque','guerrero'].filter(k=>k!==key);startRun(1);clearRunTimers();
  const h=player;h.alive=false;duoUpdate();ok('No automatic champion swap '+key,player===h&&!h.alive&&h.classKey===key&&!duoPending(h));
  joyVec={x:1,y:0};const x=h.x;updateControlledHero(500);ok('Dead cannot move '+key,h.x===x&&!h.moving);
  reviveHero(h,allies[0]);ok('Revival keeps chosen champion '+key,h.alive&&h.classKey===key);
  setState('mainmenu');ok('Return preserves champion '+key,selectedClass===key&&duoValid());
 }
 for(const key of Object.keys(PORTADOR_BOON_KITS)){
  setState('prep');selectedClass=key;startRun(1);clearRunTimers();
  for(const boon of boonsForChamp(key))for(let rarity=0;rarity<3;rarity++){
   player.boons={[boon.id]:rarity};player.shield=0;champFx=[];particles=[];clearRunTimers();const skill=boon.skill==='ult'?player.cls.ultimate:player.cls.skills[boon.skill];const rec=boonCastBegin(player,skill);boonCastEnd(rec,1,1);ok(boon.id+' rarity '+rarity,!!rec&&(champFx.length>0||player.shield>0||runTimers.length>0));
  }
 }
 setState('prep');selectedClass='mago';save.champions.farolero.unlocked=false;duoChoose(1,'farolero');ok('Obsolete reserve selection cannot grant champion',!save.champions.farolero.unlocked&&selectedClass==='mago');
 for(const key of Object.keys(CLASSES))ok('Complete guide '+key,[...CLASSES[key].skills,CLASSES[key].ultimate].every(s=>s.desc&&championGuideHTML(key).includes(guideEsc(s.desc))));
 setState('prep');selectedClass='tanque';lobbyAllies=['soporte','mago','guerrero'];startRun(1);player.alive=false;
 let itemTicks=0;const prior=updateItemProcTimers;updateItemProcTimers=(h,dt)=>{if(h===allies[0])itemTicks++;prior(h,dt);};updateControlledHero(100);updateItemProcTimers=prior;ok('Dead host does not freeze team equipment timers',itemTicks===1);
 setState('prep');const L=netBuildLoadout();ok('Network loadout has no reserve',L.reserve==null&&L.champ==='tanque');return out;
});
for(const [w,h]of [[844,390],[667,375],[390,844],[1280,800]]){await p.setViewportSize({width:w,height:h});await p.evaluate(()=>{setState('prep');selectedClass='mago';renderPrepSummary();});await p.waitForTimeout(300);checks.push({name:'Only one champion selector '+w,ok:await p.locator('[data-duo]').count()===1});checks.push({name:'Layout '+w,ok:await p.evaluate(()=>document.getElementById('prep-screen').scrollWidth<=innerWidth+1)});}
fs.writeFileSync('docs/ux/functional-results.json',JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({total:checks.length,failed:checks.filter(c=>!c.ok),errors},null,2));if(errors.length||checks.some(c=>!c.ok))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{if(browser)await browser.close();server.kill()});
