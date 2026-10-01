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
  const h=player;h.boons={old:2};h.cds=[800,800,800];portadorObjects.push({owner:h,kind:'test'});h.alive=false;duoUpdate();
  ok('Handoff '+key,player===h&&h.alive&&h.classKey===save.duoReserve&&h._duoUsed&&h.cds.every(x=>x===0)&&!h.boons&&h.invulnTimer===2500&&!portadorObjects.some(o=>o.owner===h));
  joyVec={x:1,y:0};h.alive=false;const x=h.x;updateControlledHero(500);ok('Dead cannot move '+key,h.x===x&&!h.moving);reviveHero(h,allies[0]);ok('No revive '+key,!h.alive);
  setState('mainmenu');ok('Return restores first card '+key,selectedClass===key&&duoValid());
 }
 setState('prep');selectedClass='mago';save.duoReserve='eren';lobbyAllies=['soporte','tanque','guerrero'];startRun(1);clearRunTimers();let called=false;runCastOwner=player;runLater(100,()=>{called=true;});runCastOwner=null;player.alive=false;duoUpdate();updateRunTimers(200);ok('Old delayed cast canceled',!called);onPlayerDeath();ok('Second death ends solo run',runEnding&&!duoPending(player));updateRunTimers(1000);startRun(1);ok('Retry restores original pair',player.classKey==='mago'&&player._duoReserve==='eren'&&!player._duoUsed);
 for(const key of Object.keys(PORTADOR_BOON_KITS)){
  setState('prep');selectedClass=key;save.duoReserve='eren';startRun(1);clearRunTimers();
  for(const boon of boonsForChamp(key))for(let rarity=0;rarity<3;rarity++){
   player.boons={[boon.id]:rarity};player.shield=0;champFx=[];particles=[];clearRunTimers();const skill=boon.skill==='ult'?player.cls.ultimate:player.cls.skills[boon.skill];const rec=boonCastBegin(player,skill);boonCastEnd(rec,1,1);ok(boon.id+' rarity '+rarity,!!rec&&(champFx.length>0||player.shield>0||runTimers.length>0));
  }
 }
 for(const key of Object.keys(CLASSES))ok('Complete guide '+key,[...CLASSES[key].skills,CLASSES[key].ultimate].every(s=>s.desc&&championGuideHTML(key).includes(guideEsc(s.desc))));
 const L=netBuildLoadout();ok('Reserve has own full loadout',L.reserve.champ==='eren'&&Array.isArray(L.reserve.skillMastery)&&!!L.reserve.equipment);
 return out;
});
for(const [w,h]of [[844,390],[667,375],[390,844],[1280,800]]){await p.setViewportSize({width:w,height:h});await p.evaluate(()=>{setState('prep');selectedClass='mago';save.duoReserve='eren';renderPrepSummary();});await p.screenshot({path:`docs/ux/duo-${w}.png`});checks.push({name:`Layout ${w}`,ok:await p.evaluate(()=>document.getElementById('prep-screen').scrollWidth<=innerWidth+1)});}
fs.writeFileSync('docs/ux/functional-results.json',JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({total:checks.length,failed:checks.filter(c=>!c.ok),errors},null,2));await b.close();server.kill();if(errors.length||checks.some(c=>!c.ok))process.exitCode=1;})().catch(e=>{console.error(e);server.kill();process.exit(1)});
