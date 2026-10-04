'use strict';
// Actual browser engine/registries; only backend transport and elapsed wall clock are fixtures.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||chromium.executablePath(),args:['--no-sandbox']});
 try{
  const p=await browser.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(process.env.FACTORY_BASE_URL||process.env.SITE||'http://127.0.0.1:8805');
  await p.waitForFunction(()=>typeof AlphaServices!=='undefined'&&typeof SET_DB!=='undefined');
  const result=await p.evaluate(async()=>{
   window.__alphaServicesTest=true;
   accountAvailable=()=>true;accountUpload=async()=>true;
   let stamp=Date.now();const realDateNow=Date.now;Date.now=()=>stamp;
   const setId=Object.keys(SET_DB)[0],calls=[],rewards=[];
   acct.session={user:'event-test',name:'Fixture'};acct.sync={dirty:false};
   accountApplyEventReward=r=>rewards.push(r);
   const event={id:'factory-event',name:'Invasión QA',enabled:true,start:stamp-1,end:stamp+3600000,arenas:['laberinto'],wave:10,boss:'minotauro',set:setId,cosmetic:'fixture-skin',multipliers:{xp:2}};
   let events=[event];
   accountFetch=async(method,url,body)=>{
    calls.push({method,url,body});
    if(url==='/api/world')return{status:200,j:{normalConfig:{xp:1,championPrices:{tanque:17},itemPrices:{test:0},cosmeticPrices:{test:23}},events,messages:[],serverTime:stamp}};
    if(url==='/api/events/start')return{status:200,j:{ticket:'a'.repeat(48),event,minDurationMs:50000,expires:stamp+6*3600000}};
    if(url==='/api/events/complete')return{status:200,j:{ok:true,granted:true,cosmetic:'fixture-skin',cosmeticType:'skin',saveVersion:8}};
    return{status:200,j:{}};
   };
   await AlphaServices.refreshWorld();
   const prices=[AlphaServices.goldPrice('champion','tanque',100),AlphaServices.goldPrice('item','test',100),AlphaServices.goldPrice('cosmetic','test',100),AlphaServices.goldPrice('item','missing',100)];
   for(const key in save.champions){save.champions[key].unlocked=true;save.champions[key].level=20;}
   selectedClass='tanque';currentArena='laberinto';netMatch=null;divinaMode=false;lobbyAllies=['guerrero','mago','soporte'];
   AlphaServices.onState('prep');startRun(10);await new Promise(r=>setTimeout(r,10));
   const multiplier=AlphaServices.multiplier('xp');startBossFight();
   const nativeBoss={type:boss.type,event:boss.alphaEventId,hp:boss.hp};
   const rolled=_rollSetPiece('laberinto',new Set(),()=>0,'tanque');
   groundLoot=[];const originalRandom=Math.random;Math.random=()=>0.99;
   groundLootOnKill(boss);Math.random=originalRandom;
   const guaranteed=groundLoot.some(g=>g.item.set===setId&&g.tier==='set');
   boss.hp=0;killEnemy(boss);
   stamp+=60000;AlphaServices.onState('victory');await new Promise(r=>setTimeout(r,10));await AlphaServices.completeEvents();
   const completions=calls.filter(c=>c.url==='/api/events/complete').map(c=>c.body);
   await AlphaServices.completeEvents();const repeatCount=calls.filter(c=>c.url==='/api/events/complete').length;
   const hostConfirmed=AlphaServices.confirmedBosses();
   AlphaServices.onState('prep');startRun(10);await new Promise(r=>setTimeout(r,10));
   const realGuest=netIsGuest;netIsGuest=()=>true;netMatch={ended:false,diff:'normal'};boss=null;
   stamp+=60000;
   netGuestEnd({victory:true,eventBossDefeated:['caballero','unknown','minotauro']});
   await new Promise(r=>setTimeout(r,10));await AlphaServices.completeEvents();
   const guestCompletion=calls.filter(c=>c.url==='/api/events/complete').at(-1)?.body;
   const guestConfirmed=AlphaServices.confirmedBosses();netIsGuest=realGuest;netMatch=null;
   const incompatible=AlphaServices.bossEvent('minotauro','micelial');
   stamp=event.end+1;const expired=[AlphaServices.multiplier('xp'),AlphaServices.eventSet('laberinto',10)];
   // Native fungal controller, with genuine arena state, retains reveal/phase setup.
   events=[{...event,id:'fungal',arenas:['micelial'],boss:'madre_espora',start:stamp-1,end:stamp+3600000}];
   await AlphaServices.refreshWorld();AlphaServices.onState('prep');currentArena='micelial';startRun(10);micMotherRevealStart();
   const mother=micMotherEntity();const fungal={type:mother?.type,event:mother?.alphaEventId,dormant:mother?.micDormant,state:micS.mo.st};
   // Tutorial cannot inherit event farming or world multipliers.
   const originalTraining=window.alphaTrainingActive;alphaTrainingActive=()=>true;const tutorial=[AlphaServices.eventSet('micelial',10),AlphaServices.multiplier('xp')];alphaTrainingActive=originalTraining;
   const directors=[];
   for(const [type,arena] of Object.entries({guardian_ancestral:'bosque',mago_hielo_cristal:'hielo',minotauro:'laberinto',leviatan:'acuatica',caballero:'fortaleza',madre_espora:'micelial',cm_presentador:'ciudad',ab_morador:'abismo',mn_cerbero:'minas'})){
    events=[{...event,id:'director-'+arena,arenas:[arena],boss:type,start:stamp-1,end:stamp+3600000}];
    await AlphaServices.refreshWorld();AlphaServices.onState('prep');currentArena=arena;startRun(10);heroes=[player];allies=[];player.invulnTimer=1e9;player.basicCd=1e9;
    for(let frame=0;frame<1200;frame++){update(50);player.invulnTimer=1e9;}
    const entity=enemies.find(e=>e.type===type)||boss;
    directors.push({arena,expected:type,actual:entity?.type,event:entity?.alphaEventId,finite:!!entity&&Number.isFinite(entity.hp)&&Number.isFinite(entity.x)&&Number.isFinite(entity.y)});
   }
   Date.now=realDateNow;setState('paused');
   return{prices,multiplier,nativeBoss,rolled,guaranteed,completions,repeatCount,hostConfirmed,guestConfirmed,guestCompletion,rewards:rewards.length,incompatible,expired,fungal,tutorial,directors};
  });
  assert.deepEqual(result.prices,[17,0,23,100]);assert.equal(result.multiplier,2);
  assert.equal(result.nativeBoss.type,'minotauro');assert.equal(result.nativeBoss.event,'factory-event');assert.ok(result.nativeBoss.hp>0);
  assert.ok(result.rolled.setId);assert.equal(result.guaranteed,true);
  assert.equal(result.completions.length,1);assert.equal(result.completions[0].bossDefeated,'minotauro');assert.equal(result.repeatCount,1);assert.equal(result.rewards,2);assert.deepEqual(result.hostConfirmed,["minotauro"]);assert.deepEqual(result.guestConfirmed,["minotauro"]);assert.equal(result.guestCompletion.bossDefeated,"minotauro");
  assert.equal(result.incompatible,null);assert.deepEqual(result.expired,[1,null]);
  assert.deepEqual(result.fungal,{type:'madre_espora',event:'fungal',dormant:1,state:'reveal'});assert.deepEqual(result.tutorial,[null,1]);assert.deepEqual(errors,[]);for(const row of result.directors){assert.equal(row.actual,row.expected,JSON.stringify(row));assert.equal(row.event,"director-"+row.arena,JSON.stringify(row));assert.equal(row.finite,true);}
  fs.mkdirSync('docs/production',{recursive:true});fs.writeFileSync('docs/production/event-runtime-results.json',JSON.stringify({status:'PASS',scope:'real browser engine; mocked transport/time, not backend or device performance',result,errors},null,2)+'\n');
  console.log('PASS event runtime: nine native boss directors, host/guest completion, targeted+guaranteed Set, exact-once client completion, expiry, tutorial isolation, gold prices');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
