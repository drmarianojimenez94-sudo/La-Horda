'use strict';
const {chromium}=require('playwright');
const fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const reportPath=path.join(root,'docs/production/quality-five/temporal-plague-functional-results.json');
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
  const absent=await page.evaluate(()=>!CLASSES.morveth&&!CLASSES.aelith&&!CHAMPION_CATALOG.some(c=>['morveth','aelith'].includes(c.id)));
  for(const k of ['morveth','aelith']){await page.addScriptTag({path:path.join(root,'js/champions/quality-five/'+k+'.js')});await page.addScriptTag({path:path.join(root,'tools/quality-five/register-'+k+'-fixture.js')});}
  const checks=await page.evaluate(()=>{
   const out=[],check=(name,ok,details)=>out.push({name,ok:!!ok,...(details?{details}:{})});
   function start(key='morveth',level=1){
    netMatch=null;divinaMode=false;save.stash=[];save.relics={hp:0,dmg:0,def:0,vel:0};
    for(const k in save.champions){Object.assign(save.champions[k],{unlocked:true,level,equipment:{},inventory:[],talents:{nodes:{},mastery:null,masteryNodes:{}}});save.champions[k].skillMastery=[0,1,2].map(()=>mkMastery());save.champions[k].ultMastery=mkMastery();}
    selectedClass=key;currentArena='bosque';lobbyAllies=['tanque','soporte','mago'];startRun(3);enemies=[];spawnTimer=1e9;arenaHazardTimer=1e9;levelTimer=0;runStats.critChance=0;player.fx=1;player.fy=0;return player;
   }
   function enemy(dx=40,rank='normal'){const e=spawnEnemy('esqueleto');Object.assign(e,{x:player.x+dx,y:player.y,hp:1e7,maxHp:1e7,dmg:0,speed:0,rank});return e;}
   function cast(i){castAbility(player,i==='ult'?player.cls.ultimate:player.cls.skills[i],i==='ult',i==='ult'?undefined:i);}
   function tick(ms){for(let t=0;t<ms;t+=50){runElapsedMs+=50;for(const h of heroes)updatePortadorHero(h,50);updatePortadorObjects(50);}}
   for(const key of ['morveth','aelith'])for(const level of [1,39,40,60,90,99]){
    start(key,level);let es=[enemy(20),enemy(35),enemy(50)];cast(0);tick(1000);check(key+' L'+level+' first skill hits crowd',es.every(e=>e.hp<1e7));
    const before=es.map(e=>e.hp);cast(1);check(key+' L'+level+' second skill hits crowd',es.every((e,i)=>e.hp<before[i]));
    player.hp=player.maxHp/2;cast(2);check(key+' L'+level+' utility armor',player._kitArmorUntil>runElapsedMs);
    const hp=es[0].hp;cast('ult');tick(1300);check(key+' L'+level+' ultimate damage control and protection',es[0].hp<hp&&es[0].slowAmt>0&&(key==='morveth'?player._kitArmorUntil>runElapsedMs:player.shield>0));
   }
   start();let es=Array.from({length:20},(_,i)=>enemy(30+i));for(const e of es)morvethInfect(player,e,3);check('infection budget twelve',morvethInfections(player).length===12);tick(3100);check('infections expire after three ticks',!morvethInfections(player).length);
   for(const last of [false,true]){
    start();const e=enemy(),near=[enemy(45),enemy(50),enemy(55),enemy(60)];morvethInfect(player,e,10000);const m=morvethInfections(player)[0];m.left=last?1:3;e.hp=1;tick(1000);
    check('contagion on '+(last?'last':'first')+' lethal tick',!e.alive&&morvethInfections(player).length===3&&morvethInfections(player).every(x=>x.generation===1));
    for(const x of morvethInfections(player))x.target.hp=1;tick(1000);check('secondary contagion cannot chain '+last,!morvethInfections(player).length&&near[3].hp===1e7);
   }
   start();for(let i=0;i<8;i++)cast(0);check('mushroom cap three',portadorOwned(player,'mor_mushroom').length===3);let o=portadorOwned(player,'mor_mushroom')[0];const e=enemy();e.x=o.x;e.y=o.y;e.dmg=1e6;tick(2700);check('enemy destroys mushroom',o.hp<=0&&o.life===0);
   start();cast(0);o=portadorOwned(player,'mor_mushroom')[0];player.x=o.x;player.y=o.y;player.hp=player.maxHp/2;cast(2);check('symbiosis consumes own nearby mushroom',o.life===0&&player.hp>player.maxHp/2);
   start('aelith');es=[enemy(30),enemy(45)];cast(0);o=portadorOwned(player,'ael_echo')[0];const hp=es[0].hp;aelithUpdateObject(o,o.life-1);check('echo cannot detonate early',es[0].hp===hp);aelithUpdateObject(o,1);check('echo detonates at deadline',es[0].hp<hp);const after=es[0].hp;aelithUpdateObject(o,99999);check('echo never repeats after expiry',es[0].hp===after);
   start('aelith');for(let i=0;i<9;i++)cast(0);check('echo cap two',portadorOwned(player,'ael_echo').length===2);
   player.cds=[3000,1200,800];player.ultCd=15000;player.aelithSeconds=2;cast(0);check('passive cooldown floors and current skill exclusion',player.cds[0]===3000&&player.cds[1]===1000&&player.cds[2]===800&&player.ultCd===15000);
   start('aelith');cast(2);const due=player.aelithDebtUntil;runElapsedMs=due-1;updatePortadorHero(player,0);check('debt not early',!(player.slowTimer>0));runElapsedMs=due;updatePortadorHero(player,0);check('debt arrives once',player.slowTimer===800&&player.aelithDebtUntil===0);
   for(const key of ['morveth','aelith']){
    for(const level of [39,40,60,90,99]){
     start(key,level);save.champions[key].talents.nodes[key+'_t0transform']=1;enemy();cast(0);o=portadorOwned(player,key==='morveth'?'mor_mushroom':'ael_echo')[0];
     if(key==='morveth'){tick(1000);check(key+' L'+level+' roots gate',(enemies[0].slowAmt>0)===(level>=40));}
     else check(key+' L'+level+' echo delay gate',(o.life>1200)===(level>=40));
    }
    start(key,60);save.champions[key].talents.nodes[key+'_t1transform']=1;enemy();cast(1);check(key+' second transformation',key==='morveth'?enemies[0].slowAmt>0:portadorOwned(player,'ael_echo').length===1);
    start(key,60);save.champions[key].talents.nodes[key+'_t2transform']=1;for(const h of heroes){h.x=player.x;h.y=player.y;h.hp=h.maxHp/2;}cast(2);check(key+' shared utility protects team',heroes.every(h=>h._kitArmorUntil>runElapsedMs));
    const rival=heroes.pop();rival.x=player.x+30;rival.y=player.y;rival._kitArmorUntil=0;rival.invulnTimer=0;rival.hp=rival.maxHp;divinaEnemies=[rival];divinaMinions=[];divinaStructures=[];divinaMode=true;cast(2);check(key+' utility excludes PvP rivals',!rival._kitArmorUntil);const rivalHP=rival.hp;cast(1);check(key+' damages PvP rivals',rival.hp<rivalHP);divinaMode=false;divinaEnemies=[];
    for(const level of [60,90,99]){start(key,level);Object.assign(save.champions[key].talents,{mastery:key+'_1',masteryNodes:{[key+'_t1master']:1}});for(const h of heroes){h.x=player.x;h.y=player.y;h.hp=h.maxHp/2;}const ally=heroes[1],before=ally.hp;cast('ult');tick(1300);check(key+' L'+level+' heal mastery gate',(ally.hp>before)===(level>=90));}
    start(key,90);Object.assign(save.champions[key].talents,{mastery:key+'_0',masteryNodes:{[key+'_t0master']:1}});enemy();cast(0);cast('ult');check(key+' first mastery',key==='morveth'?!portadorOwned(player,'mor_mushroom').length:portadorOwned(player,'ael_echo').length===2);
    start(key,90);Object.assign(save.champions[key].talents,{mastery:key+'_2',masteryNodes:{[key+'_t2master']:1}});cast('ult');tick(1300);check(key+' third mastery',key==='morveth'?player.shield>0:portadorSpeedMult(player)>1);
    start(key);const boss=enemy(40,'jefe');cast('ult');tick(1300);check(key+' boss slow cap',boss.slowAmt>0&&boss.slowAmt<=.12);
    start(key);player.energy=0;useSkill(0);check(key+' energy required',!portadorOwned(player,key==='morveth'?'mor_mushroom':'ael_echo').length);player.energy=player.maxEnergy;useSkill(0);const energy=player.energy;useSkill(0);check(key+' cooldown required',player.energy===energy&&player.cds[0]>0);
    start(key);cast(0);cast('ult');player.alive=false;tick(50);check(key+' death cleanup',!portadorObjects.some(o=>o.owner===player&&o.life>0));
    start(key);cast(0);player.fused=true;tick(50);check(key+' fusion cleanup',!portadorObjects.some(o=>o.owner===player&&o.life>0));
    start(key,99);check(key+' ordinary tree cannot be filled',TALENT_TREES[key].nodes.reduce((s,n)=>s+n.maxRank*n.cost,0)>treePointsAvailable(key));
    start(key);enemy();cast(0);cast(1);const alpha=ctx.globalAlpha;drawPortadorGround();check(key+' canvas restored',ctx.globalAlpha===alpha);
    _netHeroIdx=new Map(heroes.map((h,i)=>[h,i]));netMatch={snapN:0,last:{},lastG:{},lastH:[{},{},{},{}]};const snap=netBuildSnapshot(true,true);check(key+' snapshot owner and bounded state',snap.c.portadorObjects.u.some(([id,o])=>o[key]&&o.owner.$h===0)&&JSON.stringify(snap).length<300000&&!JSON.stringify(snap).includes('morvethInfections'));netMatch=null;
    resetRunTransients();check(key+' reset cleanup',portadorObjects.length===0);
    for(const arena of ['bosque','ciudad','fortaleza','micelial','hielo','acuatica','laberinto','abismo','minas','infernal']){start(key,20);currentArena=arena;startRun(3);for(let i=0;i<3;i++)cast(i);cast('ult');tick(1000);check(key+' arena '+arena,Number.isFinite(player.hp)&&portadorObjects.filter(o=>o[key]).every(o=>Number.isFinite(o.x)&&Number.isFinite(o.life)));}
   }
   return out;
  });
  checks.unshift({name:'not published in roster',ok:absent});
  const status=errors.length||checks.some(x=>!x.ok)?'FAIL':'PASS';
  fs.writeFileSync(reportPath,JSON.stringify({status,scope:'Morveth and Aelith workshop engine tests; not art, balance or multiplayer approval',checks,errors},null,2)+'\n');
  console.log(JSON.stringify({status,checks:checks.length,failed:checks.filter(x=>!x.ok),errors}));if(status==='FAIL')process.exitCode=1;
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{fs.writeFileSync(reportPath,JSON.stringify({status:'FAIL',error:e.message})+'\n');console.error(e);process.exitCode=1;});
