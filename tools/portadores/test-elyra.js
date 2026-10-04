const {chromium}=require('playwright'),fs=require('fs'),{spawn}=require('child_process');
const server=spawn('python3',['-m','http.server','8798'],{stdio:'ignore'});process.on('exit',()=>server.kill());
(async()=>{await new Promise(r=>setTimeout(r,400));const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||chromium.executablePath(),args:['--no-sandbox']});try{
 const page=await browser.newPage({viewport:{width:844,height:390},isMobile:true,hasTouch:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:8798');await page.waitForFunction(()=>CHAMP_PACK.soporte?.ready);
 const checks=await page.evaluate(()=>{
  const out=[],check=(name,ok)=>out.push({name,ok:!!ok});
  function start(k='soporte',arena='bosque'){netMatch=null;save.stash=[];for(const c in save.champions)Object.assign(save.champions[c],{unlocked:true,level:20,equipment:{},inventory:[],talents:{nodes:{},mastery:null,masteryNodes:{}},skillMastery:[0,1,2].map(()=>({...mkMastery(),alloc:0})),ultMastery:{...mkMastery(),alloc:0}});selectedClass=k;currentArena=arena;lobbyAllies=k==='soporte'?['tanque','guerrero','mago']:['soporte','guerrero','mago'];startRun(3);setState('paused');enemies=[];spawnTimer=1e9;arenaHazardTimer=1e9;return player;}
  function enemy(dx,rank='normal'){const e=spawnEnemy('esqueleto');Object.assign(e,{x:player.x+dx,y:player.y,hp:1e7,maxHp:1e7,speed:0,dmg:0,rank});return e;}
  const cast=()=>castAbility(player,player.cls.skills[0],false,0);
  start();player.hp=player.maxHp*.5;const ally=heroes[1];ally.x=player.x;ally.y=player.y;ally.hp=ally.maxHp*.5;const e1=enemy(50),e2=enemy(-50),boss=enemy(100,'jefe'),far=enemy(190),edge=enemy(160);const bx=boss.x;cast();
  check('heals self and ally',player.hp>player.maxHp*.5&&ally.hp>ally.maxHp*.5);
  check('healing capped',player.hp<=player.maxHp&&ally.hp<=ally.maxHp);
  check('multi target pulse',e1.hp<1e7&&e2.hp<1e7);
  check('offensive boundary',edge.hp<1e7&&far.hp===1e7);
  check('boss damaged without displacement',boss.hp<1e7&&boss.x===bx);
  start();heroes[1].alive=false;heroes[1].hp=0;cast();check('does not resurrect',heroes[1].hp===0&&!heroes[1].alive);
  start();const scaled=enemy(175);save.champions.soporte.skillMastery[0].alloc=10;cast();check('mastery expands radius',scaled.hp<1e7);
  start('tanque');const bot=heroes.find(h=>h.classKey==='soporte');bot.x=player.x;bot.y=player.y;bot.cds=[0,1e6,1e6];bot.energy=bot.cls.energyMax;const target=enemy(50);botTryAbilities(bot);check('healthy bot attacks',bot.cds[0]>0&&target.hp<1e7);
  start('tanque');const idle=heroes.find(h=>h.classKey==='soporte');idle.cds=[0,1e6,1e6];idle.energy=idle.cls.energyMax;const en=idle.energy;botTryAbilities(idle);check('no bot waste without enemies',idle.energy===en);
  for(const [key,name] of [['tanque','Aldric'],['guerrero','Kael'],['mago','Thalen'],['soporte','Elyra']])check('identity '+key,CLASSES[key].name.includes(name)&&CLASSES[key].hudName===name&&CHAMPION_CATALOG.find(c=>c.id===key).lore.includes(name));
  for(const d of ['down','side','left','up'])check('four walk/cast frames '+d,CHAMP_PACK.soporte.sets['walk_'+d].length===4&&CHAMP_PACK.soporte.sets['cast_'+d].length===4);
  for(const arena of ['bosque','hielo','laberinto','acuatica','fortaleza','micelial','ciudad','abismo','minas','infernal']){start('soporte',arena);const e=enemy(60);cast();check('arena '+arena,e.hp<1e7&&Number.isFinite(player.hp));}
  start();particles=[];cast();_netHeroIdx=new Map(heroes.map((h,i)=>[h,i]));netMatch={snapN:0,last:{},lastG:{},lastH:[{},{},{},{}]};const snap=netBuildSnapshot(true,false);check('pulse VFX serialize',JSON.stringify(snap).includes('ffe7a5'));netMatch=null;startRun(3);check('run reset clears pulse',!particles.some(p=>p.color==='#ffe7a5'));setState('title');const c=document.getElementById('title-canvas');_titleCast=null;_titleSetup(c);check('Elyra marches in foreground',_titleCast.some(h=>h.key==='soporte'&&h.row===2));check('new art shared by title and game',CHAMP_PACK.soporte.atlas.src.endsWith('/soporte/v2/atlas.png'));return out;
 });
 await page.waitForTimeout(1000);fs.mkdirSync('docs/elyra',{recursive:true});await page.screenshot({path:'docs/elyra/title-mobile.png'});
 await page.addScriptTag({path:'tools/balance/autopilot.js'});const runs=[];
 for(const seed of [117,431,991])runs.push(await page.evaluate(seed=>{let n=seed;Math.random=()=>{n=(1664525*n+1013904223)>>>0;return n/4294967296;};netMatch=null;save.stash=[];save.relics={hp:0,dmg:0,def:0,vel:0};for(const c in save.champions)Object.assign(save.champions[c],{level:20,xp:0,equipment:{},inventory:[],talents:{nodes:{},mastery:null,masteryNodes:{}},skillMastery:[0,1,2].map(()=>({...mkMastery(),alloc:4})),ultMastery:{...mkMastery(),alloc:4}});lobbyAllies=['tanque','guerrero','mago'];__AP.start('soporte','bosque',1);const sim=__AP.sim(150000,33.333);__AP.on=false;const result={seed,sim,damage:player.stats.dmgDealt,heal:player.stats.healDone,error:__AP.err};setState('paused');return result;},seed));
 const ref=JSON.parse(fs.readFileSync('docs/balance/champion-entry-reference.json'));const mean=runs.reduce((s,r)=>s+r.damage,0)/runs.length,ceiling=ref.roles.soporte.simulation.meanDamage150s*1.35;
 const result={checks,runs,errors,mean,ceiling};fs.writeFileSync('docs/elyra/functional-results.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));if(errors.length||checks.some(c=>!c.ok)||runs.some(r=>r.error)||mean>ceiling)process.exitCode=1;
 }finally{await browser.close();server.kill();}})().catch(e=>{console.error(e);process.exitCode=1});
