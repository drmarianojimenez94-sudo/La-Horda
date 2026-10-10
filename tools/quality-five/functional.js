'use strict';
const {chromium}=require('playwright');
const fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
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
  const absent=await page.evaluate(()=>!CLASSES.solciju&&!CHAMPION_CATALOG.some(c=>c.id==='solciju'));
  await page.addScriptTag({path:path.join(root,'js/champions/quality-five/solciju.js')});
  await page.addScriptTag({path:path.join(root,'tools/quality-five/register-fixture.js')});
  const checks=await page.evaluate(()=>{
   const out=[],check=(name,ok,details)=>out.push({name,ok:!!ok,...(details?{details}:{})});
   function start(level=1){
    netMatch=null;divinaMode=false;save.stash=[];save.relics={hp:0,dmg:0,def:0,vel:0};
    for(const k in save.champions){Object.assign(save.champions[k],{unlocked:true,level,equipment:{},inventory:[],talents:{nodes:{},mastery:null,masteryNodes:{}}});save.champions[k].skillMastery=[0,1,2].map(()=>mkMastery());save.champions[k].ultMastery=mkMastery();}
    selectedClass='solciju';currentArena='bosque';lobbyAllies=['tanque','soporte','mago'];startRun(3);enemies=[];spawnTimer=1e9;arenaHazardTimer=1e9;levelTimer=0;runStats.critChance=0;player.fx=1;player.fy=0;return player;
   }
   function enemy(dx=30,rank='normal'){const e=spawnEnemy('esqueleto');Object.assign(e,{x:player.x+dx,y:player.y,hp:1e7,maxHp:1e7,dmg:0,speed:0,rank});return e;}
   function cast(i){castAbility(player,i==='ult'?player.cls.ultimate:player.cls.skills[i],i==='ult',i==='ult'?undefined:i);}
   function tick(ms){for(let t=0;t<ms;t+=50){runElapsedMs+=50;for(const h of heroes)updatePortadorHero(h,50);updatePortadorObjects(50);}}
   for(const level of [1,39,40,60,90,99]){
    start(level);let es=[enemy(20),enemy(35),enemy(50)];cast(0);check('L'+level+' wine area damage',es.every(e=>e.hp<1e7));
    const before=es.map(e=>e.hp);cast(1);tick(2300);check('L'+level+' cask telegraph delays damage',es.every((e,i)=>e.hp===before[i]));tick(100);check('L'+level+' cask damages multiple enemies',es.every((e,i)=>e.hp<before[i]));
    player.hp=player.maxHp/2;const hp=player.hp;cast(2);check('L'+level+' toast heals and protects',player.hp>hp&&player._kitArmorUntil>runElapsedMs);
    cast('ult');tick(4100);check('L'+level+' ultimate damages/slows/protects',es.every(e=>e.slowAmt>0)&&heroes.some(h=>h._kitArmorUntil>runElapsedMs));
    check('L'+level+' finite stats',Number.isFinite(player.hp)&&Number.isFinite(player.energy));
   }
   start();let e=enemy();for(let i=0;i<8;i++)damageEnemy(e,1,{src:player,fromBasic:true});check('passive caps at three',solcijuMark(player,e).n===3);cast(0);check('passive consumes ripe marks and slows',solcijuMark(player,e).n===1&&e.slowAmt>0);tick(5100);check('marks expire',solcijuMark(player,e).n===0);
   solcijuMark(player,e,2);solcijuMark(heroes[1],e,1);check('marks isolated by owner',solcijuMark(player,e).n===2&&solcijuMark(heroes[1],e).n===1);
   start();e=enemy(30,'jefe');solcijuMark(player,e,3);cast(0);cast('ult');tick(4100);check('boss slow capped at 12 percent',e.slowAmt<=.120001&&e.slowAmt>0);
   start();e=enemy();const hp=e.hp;for(let i=0;i<20;i++)cast(1);check('two casks maximum',portadorOwned(player,'sol_cask').length===2);check('replacing casks does not detonate',e.hp===hp);tick(2500);const after=e.hp;tick(4000);check('casks explode only once',e.hp===after&&after<hp);
   start();e=enemy();for(let i=0;i<20;i++)cast('ult');check('one reserve maximum',portadorOwned(player,'sol_reserve').length===1);tick(10000);check('all constructs expire',!portadorObjects.some(o=>o.solciju));
   start();e=enemy();cast(1);cast('ult');player.alive=false;tick(50);check('death clears constructs',!portadorObjects.some(o=>o.solciju&&o.life>0));check('death clears owner marks',!e._solMarks||!e._solMarks[0]);
   start();cast(1);player.fused=true;tick(50);check('fusion clears constructs',!portadorObjects.some(o=>o.solciju&&o.life>0));
   for(const level of [39,40,60,90,99]){
    start(level);save.champions.solciju.talents.nodes.solciju_t0transform=1;enemy();cast(0);check('L'+level+' transformation gate',!!portadorOwned(player,'sol_lees').length===(level>=40));
   }
   start(60);save.champions.solciju.talents.nodes.solciju_t2transform=1;for(const h of heroes){h.x=player.x;h.y=player.y;h.hp=h.maxHp/2;}cast(2);check('hospitality heals allies',heroes.every(h=>h.hp>h.maxHp/2));
   start(60);save.champions.solciju.talents.nodes.solciju_t1transform=1;enemy();cast(1);tick(2500);check('cellar transforms cask into protection',player._kitArmorUntil>runElapsedMs);
   for(const level of [60,90,99]){start(level);Object.assign(save.champions.solciju.talents,{mastery:'solciju_2',masteryNodes:{solciju_t2master:1}});check('L'+level+' mastery flag gate',solcijuFlag(player,'ult','reserveHeal')===(level>=90));}
   start(90);Object.assign(save.champions.solciju.talents,{mastery:'solciju_0',masteryNodes:{solciju_t0master:1}});e=enemy();cast('ult');tick(1000);check('concentrated reserve adds two marks',solcijuMark(player,e).n===2);
   start(90);Object.assign(save.champions.solciju.talents,{mastery:'solciju_1',masteryNodes:{solciju_t1master:1}});e=enemy();cast(1);cast('ult');check('cellar mastery detonates owned casks',e.hp<1e7&&portadorOwned(player,'sol_cask').length===0);
   start(90);Object.assign(save.champions.solciju.talents,{mastery:'solciju_2',masteryNodes:{solciju_t2master:1}});player.hp=player.maxHp/2;enemy();cast('ult');tick(1000);check('restorative reserve actually heals',player.hp>player.maxHp/2);
   start();enemy();cast(1);cast('ult');const alpha=ctx.globalAlpha;drawPortadorGround();check('persistent cues restore canvas state',ctx.globalAlpha===alpha);
   start(60);save.champions.solciju.talents.nodes.solciju_t2transform=1;
   const rival=heroes.pop();rival.x=player.x+35;rival.y=player.y;rival.hp=rival.maxHp/2;rival.invulnTimer=0;
   divinaEnemies=[rival];divinaMinions=[];divinaStructures=[];divinaMode=true;
   player.basicCd=0;triggerBasic(player);check('Crystal Wars basic applies fermentation',solcijuMark(player,rival).n===1);
   const rivalHP=rival.hp;cast(2);check('hospitality never heals rival',rival.hp===rivalHP&&!(rival._kitArmorUntil>runElapsedMs));
   cast(0);check('Crystal Wars wine damages opponent',rival.hp<rivalHP);divinaMode=false;divinaEnemies=[];
   start(99);check('talent points cannot complete tree',TALENT_TREES.solciju.nodes.reduce((n,x)=>n+x.cost*x.maxRank,0)>treePointsAvailable('solciju'));
   start();enemy();player.cds=[0,0,0];player.energy=player.maxEnergy;const en=player.energy;useSkill(0);const spent=player.energy;useSkill(0);check('cooldown prevents duplicate spend',spent<en&&player.energy===spent&&player.cds[0]>0);
   start();enemy();cast(1);_netHeroIdx=new Map(heroes.map((h,i)=>[h,i]));netMatch={snapN:0,last:{},lastG:{},lastH:[{},{},{},{}]};const snap=netBuildSnapshot(true,true);check('snapshot retains construct owner',snap.c.portadorObjects.u.some(([id,o])=>o.solciju&&o.owner.$h===0));check('snapshot serializable and bounded',JSON.stringify(snap).length<300000);netMatch=null;
   resetRunTransients();check('reset clears objects',portadorObjects.length===0);setState('paused');return out;
  });
  checks.unshift({name:'not registered in production',ok:absent});
  const result={status:errors.length||checks.some(c=>!c.ok)?'FAIL':'PASS',scope:'Solciju workshop runtime, not release approval',checks,errors};
  fs.writeFileSync(path.join(root,'docs/production/quality-five/solciju-functional.json'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify({status:result.status,checks:checks.length,failed:checks.filter(c=>!c.ok),errors}));if(result.status==='FAIL')process.exitCode=1;
 }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
