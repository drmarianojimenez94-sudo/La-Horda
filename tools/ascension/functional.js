'use strict';
// Kit tests for the Ascension expansion (2 FOUNDER + 7 ASCENSION) on the real engine.
// Usage: ENTRY_BASE_URL=http://127.0.0.1:8750 node tools/ascension/functional.js  (serve the repo first)
const {chromium}=require('playwright'),fs=require('node:fs');
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||chromium.executablePath(),args:['--no-sandbox']});try{const p=await b.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(process.env.ENTRY_BASE_URL||'http://127.0.0.1:8806');await p.waitForFunction(()=>typeof ASCENSION!=='undefined'&&typeof CHAMPION_ENTRY_BALANCE!=='undefined');
 const checks=await p.evaluate(()=>{
 const out=[],check=(name,ok,details)=>out.push({name,ok:!!ok,...(details!==undefined?{details}:{})});
 function start(k,arena='bosque',level=1){netMatch=null;save.champions[k]||=mkChampion(false);save.stash=[];save.relics={hp:0,dmg:0,def:0,vel:0};for(const c in save.champions){Object.assign(save.champions[c],{unlocked:true,level,equipment:{},inventory:[],talents:{nodes:{},mastery:null,masteryNodes:{}}});save.champions[c].skillMastery=[0,1,2].map(()=>mkMastery());save.champions[c].ultMastery=mkMastery();}
  selectedClass=k;currentArena=arena;lobbyAllies=['tanque','soporte','mago'];startRun(3);enemies=[];spawnTimer=1e9;arenaHazardTimer=1e9;levelTimer=0;player.fx=1;player.fy=0;player.aim={x:player.x+60,y:player.y};runStats.critChance=0;return player;}
 function enemy(dx=40,rank='normal',dy=0){const e=spawnEnemy('esqueleto');Object.assign(e,{x:player.x+dx,y:player.y+dy,hp:1e7,maxHp:1e7,dmg:0,speed:0,rank});return e;}
 function cast(i){castAbility(player,i==='ult'?player.cls.ultimate:player.cls.skills[i],i==='ult',i==='ult'?undefined:i);}
 function tick(ms){for(let t=0;t<ms;t+=50){runElapsedMs+=50;for(const h of heroes)updatePortadorHero(h,50);updatePortadorObjects(50);}}
 function inBounds(e){const c={x:e.x,y:e.y,radius:e.radius||12};clampToArena(c);return Math.abs(c.x-e.x)<1e-6&&Math.abs(c.y-e.y)<1e-6;}
 const own=()=>portadorObjects.filter(o=>o.owner===player&&o.asc&&o.life>0);
 const capped={nano_gm:.07,facu_gm:.08,aurelia:.06,khepri:.06,velmira:.06,vhal:.08,oriel:.07,saelis:.06};
 for(const k of Object.keys(ASCENSION)){
  check(k+' registered with taxonomy',!!CLASSES[k]&&!!PORTADORES[k]&&championMeta(k).category===(ASCENSION[k].founder?'FOUNDER':'ASCENSION'));
  check(k+' kit 3 skills + ultimate with descriptions',CLASSES[k].skills.length===3&&!!CLASSES[k].ultimate&&[...CLASSES[k].skills,CLASSES[k].ultimate].every(s=>s.desc&&s.cd>0));
  start(k);const es=[enemy(25),enemy(30,'normal',10),enemy(45,'normal',-10)];for(let i=0;i<3;i++)cast(i);cast('ult');tick(4500);
  check(k+' level 1 horde damage',es.filter(e=>e.hp<1e7).length>=2,es.map(e=>1e7-e.hp));
  for(let n=0;n<15;n++){for(let i=0;i<3;i++)cast(i);cast('ult');}
  check(k+' bounded entities',own().length<=12,own().length);
  check(k+' finite state',Number.isFinite(player.hp)&&Number.isFinite(player.x)&&Number.isFinite(player.y));
  start(k);const boss=enemy(30,'jefe');boss.maxHp=boss.hp=2000;const pos={x:boss.x,y:boss.y};cast('ult');tick(8000);
  check(k+' boss never displaced or stunned',boss.x===pos.x&&boss.y===pos.y&&!(boss.stunTimer>0)&&!(boss.slowAmt>.12));
  check(k+' boss alive (no one-shot)',boss.alive&&boss.hp>0);
  if(capped[k])check(k+' ultimate respects boss damage cap',2000-boss.hp<=2000*capped[k]+1,2000-boss.hp);
  start(k);const elite=enemy(30,'elite');elite.hp=elite.maxHp*.05;cast('ult');tick(8000);check(k+' elites never executed',elite.alive);
  start(k);cast('ult');for(let i=0;i<3;i++)cast(i);tick(13000);check(k+' timed objects expire',own().length===0||own().every(o=>o.kind==='as_node'||o.kind==='as_plate'),own().map(o=>o.kind));
  start(k);for(let i=0;i<3;i++)cast(i);cast('ult');player.hp=0;player.alive=false;tick(100);check(k+' cleanup on death',own().length===0);
  for(const arena of ['ciudad','fortaleza','bosque','micelial','hielo','acuatica','laberinto','abismo','minas','infernal']){start(k,arena,20);const crowd=[enemy(30),enemy(-60),enemy(120,'elite'),enemy(0,'normal',90)];for(let i=0;i<3;i++)cast(i);cast('ult');for(let i=0;i<30;i++)update(33);tick(4500);
   check(k+' arena '+arena+' bounds + finite',crowd.every(e=>!e.alive||inBounds(e))&&Number.isFinite(player.hp)&&Number.isFinite(player.x)&&inBounds(player)&&portadorObjects.length<=64);}
 }
 // ---- Nano GM ----
 start('nano_gm');cast(0);cast(1);cast(0);check('Nano alternation enters Forma del Regente',ascState(player).regentUntil>runElapsedMs);
 const rs=ascState(player).regentCdUntil;start('nano_gm');ascState(player).regentCdUntil=runElapsedMs+5000;cast(0);cast(1);cast(0);check('Nano regent internal cooldown',!(ascState(player).regentUntil>runElapsedMs));
 start('nano_gm');let low=enemy(80),el=enemy(90,'elite');low.hp=low.maxHp*.2;el.hp=el.maxHp*.1;player.aim={x:player.x+200,y:player.y};cast(0);check('Nano executes sentenced commons only',!low.alive&&el.alive);
 start('nano_gm');const obj=enemy(70);obj.objective=true;obj.hp=obj.maxHp*.1;const ally=heroes.find(h=>h!==player);ally.hp=ally.maxHp*.3;ally.x=player.x+30;ally.y=player.y;cast('ult');tick(800);
 check('Nano judgement restores allies',ally.hp>ally.maxHp*.5);check('Nano judgement never executes objectives',obj.alive);check('Nano judgement enters Regent',ascState(player).regentUntil>runElapsedMs);
 // ---- Facu GM ----
 start('facu_gm');player.cds=[0,0,0];cast(0);cast(1);check('Facu tide rises in order',ascState(player).tide===1);cast(2);check('Facu tide chain 2',ascState(player).tide===2);cast(0);check('Facu Marea Alta at 3',ascState(player).highTideUntil>runElapsedMs);
 start('facu_gm');cast(0);cast(2);check('Facu wrong order resets to low tide',ascState(player).tide===0);
 start('facu_gm');const x0=player.x;player.aim={x:player.x+400,y:player.y};cast(2);tick(800);check('Facu rides the wave fluidly and bounded',player.x-x0>100&&player.x-x0<=345,player.x-x0);
 start('facu_gm');const oldResolve=resolveWallCollision,wall=player.x+60,from=player.x;resolveWallCollision=q=>{oldResolve(q);if(q.x>wall&&q.x<wall+30)q.x=wall;};player.aim={x:player.x+400,y:player.y};cast(2);tick(800);resolveWallCollision=oldResolve;check('Facu ride stops at walls',player.x<=wall+1&&player.x>from);
 start('facu_gm');const pulled=[enemy(300),enemy(-280),enemy(0,'normal',260)];cast('ult');tick(3300);const center=portadorObjects.find(o=>o.kind==='as_ocean');check('Facu ocean drags the horde to the centre',pulled.every(e=>distance(e,center)<260),pulled.map(e=>Math.round(distance(e,center))));tick(1200);check('Facu ocean leaves nobody out of bounds',pulled.every(inBounds));
 // ---- STANDARD ----
 start('aurelia');for(let i=0;i<6;i++){player.aim={x:player.x+60+i*30,y:player.y+(i%2?40:-40)};cast(0);}check('Aurelia node cap 3',ascOwned(player,'node').length===3);
 const n=ascOwned(player,'node'),inside=enemy(0);inside.x=(n[0].x+n[1].x+n[2].x)/3;inside.y=(n[0].y+n[1].y+n[2].y)/3;tick(1100);check('Aurelia Convergencia triangle damages',inside.hp<1e7);
 start('khepri');for(let i=0;i<40;i++){const e=enemy(20);killEnemy(e);}check('Khepri swarm fed and capped',ascState(player).swarm===60);cast(1);check('Khepri carapace consumes swarm',ascState(player).swarm===45&&player.shield>0);cast(0);check('Khepri swarm leaves Khepri',ascOwned(player,'swarm').length===1);
 start('velmira');const m0=ascState(player).mask;cast(2);check('Velmira face swap cycles and empowers',ascState(player).mask===(m0+1)%4&&ascState(player).empowered);
 ascState(player).mask=2;const sil=enemy(60);cast(1);check('Velmira silence mask applied',sil._ascSilenceUntil>runElapsedMs);
 start('vhal');const mv=enemy(80);for(let i=0;i<9;i++){player.aim={x:mv.x,y:mv.y};cast(0);}check('Vhal mass capped at 5',ascMassOf(mv)===5);
 start('bront');for(let i=0;i<10;i++){player.invulnTimer=0;damageHero(player,1,{x:player.x+40,y:player.y,type:'esqueleto'});tick(2600);}check('Bront plates capped at 4',ascOwned(player,'plate').length<=4&&ascOwned(player,'plate').length>=3);
 cast('ult');check('Bront citadel roots',portadorSpeedMult(player)===0);tick(7100);check('Bront citadel ends',portadorSpeedMult(player)>0);
 start('oriel');player.aim={x:player.x+250,y:player.y};cast(0);const pair=ascOwned(player,'portal');const mate=heroes.find(h=>h!==player);mate.x=pair[0].x;mate.y=pair[0].y;mate._ascPortalAt=0;tick(100);check('Oriel portal moves allies',distance(mate,pair[1])<45);
 // ---- Saelis ----
 start('saelis');player.aim={x:player.x+200,y:player.y};cast(0);check('Saelis fan leaves 5 feathers',ascOwned(player,'feather').length===5);
 for(let i=0;i<4;i++){player.cds=[0,0,0];player.energy=player.energyMax;cast(0);}check('Saelis feathers capped at 8',ascOwned(player,'feather').length===8);
 start('saelis');player.aim={x:player.x+200,y:player.y};cast(0);tick(400);const fth=ascOwned(player,'feather')[0],mate2=heroes.find(h=>h!==player);mate2._ascBlessUntil=0;mate2.x=fth.x;mate2.y=fth.y;tick(100);
 check('Saelis ally absorbs a feather and is blessed',fth.life===0&&mate2._ascBlessUntil>runElapsedMs&&mate2.portSpeedTimer>0);
 const tgt=enemy(80);const hpB=tgt.hp;portadorWith(mate2,()=>damageEnemy(tgt,100,{src:mate2}));const blessedHit=hpB-tgt.hp;const hpC=tgt.hp;mate2._ascBlessUntil=0;portadorWith(mate2,()=>damageEnemy(tgt,100,{src:mate2}));
 check('Saelis blessing adds damage',blessedHit>hpC-tgt.hp,[blessedHit,hpC-tgt.hp]);
 start('saelis');player.aim={x:player.x+120,y:player.y};cast(0);const far=enemy(140,'normal',30),before=far.hp,nF=ascOwned(player,'feather').filter(f=>distance(f,player)<360).length;player.cds=[0,0,0];cast(1);
 check('Saelis updraft fires nearby feathers',nF>0&&ascOwned(player,'feather').length===5-nF&&far.hp<before,[nF,before-far.hp]);
 start('saelis');player.aim={x:player.x+200,y:player.y};cast(0);player.cds=[4000,4000,0];const nR=ascOwned(player,'feather').length;cast(2);
 check('Saelis recall returns every feather and shortens cooldowns',ascOwned(player,'feather').length===0&&player.cds[0]===Math.max(0,4000-200*nR),player.cds);
 start('saelis');player.aim={x:player.x+150,y:player.y};cast('ult');const sky=ascOwned(player,'sky')[0];check('Saelis sky opens',!!sky);tick(5200);check('Saelis sky leaves six feathers',ascOwned(player,'feather').length===6);
 start('saelis');player.aim={x:player.x+200,y:player.y};cast(0);tick(400);const own1=ascOwned(player,'feather')[0];player._ascBlessUntil=0;player.x=own1.x;player.y=own1.y;tick(100);check('Saelis never blesses herself',own1.life>0&&!(player._ascBlessUntil>runElapsedMs));
 // ---- network snapshot ----
 start('facu_gm');cast('ult');start;_netHeroIdx=new Map(heroes.map((h,i)=>[h,i]));netMatch={snapN:0,last:{},lastG:{},lastH:[{},{},{},{}]};const snap=netBuildSnapshot(true,true);
 check('snapshot keeps construct owner',snap.c.portadorObjects.u.every(([id,o])=>o.owner&&o.owner.$h===0));check('bounded serializable snapshot',JSON.stringify(snap).length<300000);
 netMatch=null;setState('paused');return out;});
 fs.mkdirSync('docs/founders',{recursive:true});fs.writeFileSync('docs/founders/functional-results.json',JSON.stringify({checks,errors},null,2));
 console.log(JSON.stringify({checks:checks.length,failed:checks.filter(c=>!c.ok),errors}));if(errors.length||checks.some(c=>!c.ok))process.exitCode=1;}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
