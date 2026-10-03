const {chromium}=require('playwright'),{spawn}=require('child_process'),fs=require('fs');
const server=spawn('python3',['-m','http.server','8805'],{stdio:'ignore'});process.on('exit',()=>server.kill());
(async()=>{await new Promise(r=>setTimeout(r,500));const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});const p=await b.newPage({viewport:{width:844,height:390}}),errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error'||(m.type()==='warning'&&m.text().startsWith('boon')))errors.push(m.text());});await p.goto('http://127.0.0.1:8805');await p.waitForFunction(()=>typeof assetsAllReady==='function'&&assetsAllReady());
const checks=await p.evaluate(()=>{
 const out=[],ok=(name,pass,extra)=>out.push({name,ok:!!pass,...extra});
 for(const c of Object.values(save.champions)){c.unlocked=true;c.level=20;}
 selectedClass='mago';save.duoReserve='eren';currentArena='ciudad';divinaMode=false;titleContinue();ok('Intro ends in menu',state==='mainmenu');
 firstRunStart();ok('First-run path ends in menu',state==='mainmenu');
 for(const key of Object.keys(CLASSES)){
  setState('prep');selectedClass=key;save.duoReserve=key==='eren'?'mago':'eren';lobbyAllies=['soporte','tanque','guerrero'].filter(k=>k!==key&&k!==save.duoReserve);startRun(1);clearRunTimers();
  const h=player;h.alive=false;duoUpdate();ok('No reserve handoff '+key,player===h&&!h.alive&&h.classKey===key&&!duoPending(h));
  joyVec={x:1,y:0};const x=h.x;updateControlledHero(500);ok('Dead cannot move '+key,h.x===x&&!h.moving);
  const by=allies[0];by.x=h.x+10;by.y=h.y;by._revHold=0;by.alive=true;for(const a of allies.slice(1))a.alive=false;
  updateRevives(2500);by.invulnTimer=0;damageHero(by,1,{x:by.x+10,y:by.y});by.stunTimer=1000;updateRevives(2499);ok('Revive not early '+key,!h.alive&&h._reviveT===4999);updateRevives(1);ok('Five second revive after hit '+key,h.alive&&h.classKey===key&&h.hp>0);
  setState('mainmenu');ok('Return keeps selected champion '+key,selectedClass===key&&duoValid());
 }
 for(const key of Object.keys(PORTADOR_BOON_KITS)){
  setState('prep');selectedClass=key;save.duoReserve='eren';startRun(1);clearRunTimers();
  for(const boon of boonsForChamp(key))for(let rarity=0;rarity<3;rarity++){
   player.boons={[boon.id]:rarity};player.shield=0;champFx=[];particles=[];clearRunTimers();const skill=boon.skill==='ult'?player.cls.ultimate:player.cls.skills[boon.skill];const rec=boonCastBegin(player,skill);boonCastEnd(rec,1,1);ok(boon.id+' rarity '+rarity,!!rec&&(champFx.length>0||player.shield>0||runTimers.length>0));
  }
 }
 for(const key of Object.keys(CLASSES))ok('Complete guide '+key,[...CLASSES[key].skills,CLASSES[key].ultimate].every(s=>s.desc&&championGuideHTML(key).includes(guideEsc(s.desc))));
 setState('prep');selectedClass='tanque';save.duoReserve='eren';startRun(1);const L=netBuildLoadout();ok('Only one champion in loadout',L.champ==='tanque'&&!L.reserve);ok('Stale reserve ignored',duoKeys().length===1&&duoKeys()[0]==='tanque');
 let itemTicks=0;const priorTimer=updateItemProcTimers;updateItemProcTimers=(hero,dt)=>{if(hero===allies[0])itemTicks++;priorTimer(hero,dt);};player.alive=false;updateControlledHero(100);updateItemProcTimers=priorTimer;ok('Dead host does not freeze team equipment timers',itemTicks===1);
 return out;
});
for(const [w,h]of [[844,390],[667,375],[390,844],[1280,800]]){await p.setViewportSize({width:w,height:h});await p.evaluate(()=>{setState('prep');selectedClass='mago';save.duoReserve='eren';renderPrepSummary();});await p.waitForTimeout(2500);await p.locator('[data-duo="0"]').scrollIntoViewIfNeeded();await p.screenshot({path:`docs/ux/duo-${w}.png`});if(w>600&&h<500)checks.push({name:`Selectors clear of footer ${w}`,ok:await p.evaluate(()=>[...document.querySelectorAll("[data-duo]")].every(el=>el.getBoundingClientRect().bottom<=document.getElementById("prep-start-btn").getBoundingClientRect().top))});checks.push({name:`Layout ${w}`,ok:await p.evaluate(()=>document.getElementById('prep-screen').scrollWidth<=innerWidth+1)});}
fs.writeFileSync('docs/ux/functional-results.json',JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({total:checks.length,failed:checks.filter(c=>!c.ok),errors},null,2));await b.close();server.kill();if(errors.length||checks.some(c=>!c.ok))process.exitCode=1;})().catch(e=>{console.error(e);server.kill();process.exit(1)});
