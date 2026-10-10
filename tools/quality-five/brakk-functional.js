'use strict';
const {chromium}=require('playwright');
const fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const reportPath=path.join(root,'docs/production/quality-five/brakk-functional-results.json');
fs.writeFileSync(reportPath,JSON.stringify({status:'RUNNING',scope:'workshop, not release approval'})+'\n');
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]==='/'?'/index.html':req.url.split('?')[0]));
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return;}res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream');res.end(data);});
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||chromium.executablePath(),args:['--no-sandbox']});
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port);
  await page.waitForFunction(()=>typeof CHAMPION_ENTRY_BALANCE!=='undefined');
  const absent=await page.evaluate(()=>!CLASSES.brakk&&!CHAMPION_CATALOG.some(c=>c.id==='brakk'));
  await page.addScriptTag({path:path.join(root,'js/champions/quality-five/brakk.js')});
  await page.addScriptTag({path:path.join(root,'tools/quality-five/register-brakk-fixture.js')});
  const checks=await page.evaluate(()=>{
   const out=[],check=(name,ok,details)=>out.push({name,ok:!!ok,...(details?{details}:{})});
   function start(level=1,key='brakk'){
    netMatch=null;divinaMode=false;save.stash=[];save.relics={hp:0,dmg:0,def:0,vel:0};
    for(const k in save.champions){Object.assign(save.champions[k],{unlocked:true,level,equipment:{},inventory:[],talents:{nodes:{},mastery:null,masteryNodes:{}}});save.champions[k].skillMastery=[0,1,2].map(()=>mkMastery());save.champions[k].ultMastery=mkMastery();}
    selectedClass=key;currentArena='bosque';lobbyAllies=['tanque','soporte','mago'];startRun(3);enemies=[];spawnTimer=1e9;arenaHazardTimer=1e9;levelTimer=0;runStats.critChance=0;player.fx=1;player.fy=0;return player;
   }
   function enemy(dx=30,rank='normal'){const e=spawnEnemy('esqueleto');Object.assign(e,{x:player.x+dx,y:player.y,hp:1e7,maxHp:1e7,dmg:0,speed:0,rank});return e;}
   function cast(i){castAbility(player,i==='ult'?player.cls.ultimate:player.cls.skills[i],i==='ult',i==='ult'?undefined:i);}
   function tick(ms){for(let t=0;t<ms;t+=50){runElapsedMs+=50;for(const h of heroes)updatePortadorHero(h,50);updatePortadorObjects(50);}}
   for(const level of [1,39,40,60,90,99]){
    start(level);let es=[enemy(20),enemy(35),enemy(50)];cast(0);check('L'+level+' wall emergence hits crowd',es.every(e=>e.hp<1e7));
    const wall=portadorOwned(player,'brk_wall')[0];check('L'+level+' wall has finite health and lifetime',wall&&wall.hp>0&&wall.life<=8000);
    const before=es.map(e=>e.hp);cast(1);tick(500);check('L'+level+' turret windup',es.every((e,i)=>e.hp===before[i]));tick(6000);check('L'+level+' turret damages crowd then expires',es.every((e,i)=>e.hp<before[i])&&!brakkOwned(player).length);
    cast(0);const w=portadorOwned(player,'brk_wall')[0];w.hp=w.maxHp*.4;cast(2);check('L'+level+' repair heals construct and buffs armor',w.hp>w.maxHp*.4&&player._kitArmorUntil>runElapsedMs);
    const hp=es[0].hp;cast('ult');check('L'+level+' demolition damages slows shields and consumes',es[0].hp<hp&&es[0].slowAmt>0&&player.shield>0&&!brakkOwned(player).length);
   }
   start();const melee=Array.from({length:20},(_,i)=>enemy(20+i));player.basicCd=0;triggerBasic(player);check('basic twelve victim budget',melee.filter(e=>e.hp<1e7).length===12);
   start();let e=enemy();cast(0);let w=brakkOwned(player)[0];e.x=w.x;e.y=w.y;brakkCollide(e);check('wall actually displaces a hostile from segment',distance(e,w)>=e.radius+9);
   e.x=w.x;e.y=w.y;clampToArena(e);check('native clamp and dynamic collision do not recurse',Number.isFinite(e.x)&&Number.isFinite(e.y));
   const pos={x:player.x,y:player.y};player.x=w.x;player.y=w.y;brakkCollide(player);check('wall never traps its owner',player.x===w.x&&player.y===w.y);Object.assign(player,pos);
   e.rank='jefe';e.x=w.x;e.y=w.y;brakkCollide(e);check('wall does not displace bosses',e.x===w.x&&e.y===w.y);
   e.rank='normal';e.dmg=1e5;e.x=w.x;e.y=w.y;tick(2600);check('enemies destroy wall',w.hp<=0&&w.life===0);
   start();cast(0);w=brakkOwned(player)[0];player.x=w.x;player.y=w.y;const protectedMult=portadorTakenMult(player,null);player.x+=400;check('passive works only near own construction',protectedMult<portadorTakenMult(player,null)*.93);
   start();for(let i=0;i<20;i++){cast(0);cast(1);}check('construction cap four',brakkOwned(player).length===4);player.alive=false;tick(50);check('death clears construction',!brakkOwned(player).length);
   start();cast(1);player.fused=true;tick(50);check('fusion clears construction',!brakkOwned(player).length);
   start();e=enemy();cast(1);w=brakkOwned(player)[0];brakkUpdate(w,100000);const hp=e.hp;brakkUpdate(w,100000);check('delayed frame cannot create extra turret shots',e.hp===hp&&w.left===0);
   for(const level of [39,40,60,90,99]){start(level);save.champions.brakk.talents.nodes.brakk_t0transform=1;cast(0);w=brakkOwned(player)[0];check('L'+level+' wall tradeoff gated',(w.life<4500)===(level>=40));}
   start(60);save.champions.brakk.talents.nodes.brakk_t2transform=1;for(const h of heroes){h.x=player.x;h.y=player.y;}cast(2);check('crew protects nearby allies',heroes.every(h=>h._kitArmorUntil>runElapsedMs));
   start(60);save.champions.brakk.talents.nodes.brakk_t1transform=1;const crowd=Array.from({length:5},(_,i)=>enemy(30+i*10));cast(1);tick(1100);check('piercing turret changes target pattern',crowd.filter(x=>x.hp<1e7).length>=4);
   for(const level of [60,90,99]){start(level);Object.assign(save.champions.brakk.talents,{mastery:'brakk_2',masteryNodes:{brakk_t2master:1}});for(const h of heroes){h.x=player.x;h.y=player.y;}cast('ult');check('L'+level+' mastery allied shield gate',(heroes[1].shield>0)===(level>=90));}
   start(90);Object.assign(save.champions.brakk.talents,{mastery:'brakk_1',masteryNodes:{brakk_t1master:1}});player.hp=player.maxHp/2;cast(2);check('renew mastery actually heals',player.hp>player.maxHp/2);
   start(90);Object.assign(save.champions.brakk.talents,{mastery:'brakk_0',masteryNodes:{brakk_t0master:1}});e=enemy(30,'jefe');cast('ult');check('rubble extends slow while boss resistance holds',e.slowTimer>=3000&&e.slowAmt<=.12);
   start(60);save.champions.brakk.talents.nodes.brakk_t2transform=1;
   const rival=heroes.pop();rival.x=player.x+30;rival.y=player.y;rival.invulnTimer=0;rival.hp=rival.maxHp;
   divinaEnemies=[rival];divinaMinions=[];divinaStructures=[];divinaMode=true;
   cast(0);w=brakkOwned(player)[0];rival.x=w.x;rival.y=w.y;const old={x:rival.x,y:rival.y};brakkCollide(rival);check('Arena Divina rival collides with wall',rival.x!==old.x||rival.y!==old.y);
   rival.x=player.x+30;rival.y=player.y;const rivalHP=rival.hp;cast(2);check('crew never protects rival',!(rival._kitArmorUntil>runElapsedMs)&&rival.hp===rivalHP);
   cast('ult');check('Arena Divina demolition damages rival',rival.hp<rivalHP);
   cast(0);w=brakkOwned(player)[0];const structure={alive:true,x:w.x,y:w.y,radius:20};divinaStructures=[structure];brakkCollide(structure);check('wall cannot displace static PvP structures',structure.x===w.x&&structure.y===w.y);
   divinaMode=false;divinaEnemies=[];divinaStructures=[];
   start(99);check('ordinary tree cannot be completed',TALENT_TREES.brakk.nodes.reduce((s,n)=>s+n.maxRank*n.cost,0)>treePointsAvailable('brakk'));
   start();player.energy=0;useSkill(0);check('no energy no free construction',!brakkOwned(player).length);player.energy=player.maxEnergy;useSkill(0);const energy=player.energy;useSkill(0);check('cooldown stops duplicate construction',brakkOwned(player).length===1&&player.energy===energy&&player.cds[0]>0);
   start();cast(0);cast(1);const a=ctx.globalAlpha;drawPortadorGround();check('render restores canvas alpha',a===ctx.globalAlpha);
   _netHeroIdx=new Map(heroes.map((h,i)=>[h,i]));netMatch={snapN:0,last:{},lastG:{},lastH:[{},{},{},{}]};const snap=netBuildSnapshot(true,true);check('snapshot attributes builds to owner',snap.c.portadorObjects.u.some(([id,o])=>o.brakk&&o.owner.$h===0));check('snapshot bounded',JSON.stringify(snap).length<300000);netMatch=null;
   resetRunTransients();check('reset clears builds',portadorObjects.length===0);
   for(const arena of ['bosque','ciudad','fortaleza','micelial','hielo','acuatica','laberinto','abismo','minas','infernal']){start(20);currentArena=arena;startRun(3);for(let i=0;i<3;i++)cast(i);cast('ult');tick(1000);check('arena '+arena+' finite hero and builds',Number.isFinite(player.hp)&&brakkOwned(player).every(o=>Number.isFinite(o.x)&&Number.isFinite(o.hp)));}
   return out;
  });
  checks.unshift({name:'not published in roster',ok:absent});
  const status=errors.length||checks.some(x=>!x.ok)?'FAIL':'PASS';
  fs.writeFileSync(reportPath,JSON.stringify({status,scope:'Brakk workshop engine tests; not art, balance or multiplayer approval',checks,errors},null,2)+'\n');
  console.log(JSON.stringify({status,checks:checks.length,failed:checks.filter(x=>!x.ok),errors}));if(status==='FAIL')process.exitCode=1;
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{fs.writeFileSync(reportPath,JSON.stringify({status:'FAIL',error:e.message})+'\n');console.error(e);process.exitCode=1;});
