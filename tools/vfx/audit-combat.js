/* Real-engine VFX/HUD regression. Run from the repository root. */
const {chromium}=require('playwright');
const fs=require('fs'),{spawn}=require('child_process');
const out='docs/vfx',server=spawn('python3',['-m','http.server','8798','--bind','127.0.0.1'],{stdio:'ignore'});
process.on('exit',()=>server.kill());
(async()=>{
 let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||chromium.executablePath(),args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:844,height:390},hasTouch:true}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8798');
  await page.waitForFunction(()=>typeof CHAMPION_SIGNATURES!=='undefined'&&Object.keys(PORTADORES).every(k=>CHAMP_PACK[k].ready));
  await page.addScriptTag({path:'tools/balance/autopilot.js'});
  const roster=await page.evaluate(()=>Object.keys(CLASSES)),checks=[],skills=[];
  fs.mkdirSync(out,{recursive:true});
  for(const key of roster){
   const result=await page.evaluate(k=>{
    const checks=[],skills=[];
    const check=(name,ok,detail)=>checks.push({name:k+': '+name,ok:!!ok,detail});
    function start(){
     netMatch=null;save.stash=[];save.relics={hp:0,dmg:0,def:0,vel:0};
     for(const c in save.champions){const s=save.champions[c];s.unlocked=true;s.level=20;s.xp=0;s.equipment={};s.inventory=[];s.talents={nodes:{},mastery:null,masteryNodes:{}};s.skillMastery=[0,1,2].map(()=>({...mkMastery(),alloc:0}));s.ultMastery={...mkMastery(),alloc:0};}
     selectedClass=k;currentArena='bosque';lobbyAllies=['tanque','soporte','mago'];startRun(3);
     enemies=[];spawnTimer=1e9;arenaHazardTimer=1e9;player.fx=1;player.fy=0;state='paused';
     for(let i=0;i<10;i++){const e=spawnEnemy('esqueleto');Object.assign(e,{x:player.x+40+i*16,y:player.y+(i%3-1)*26,hp:1e7,maxHp:1e7,speed:0,baseSpeed:0,dmg:0});}
     for(let i=0;i<allies.length;i++){allies[i].x=player.x-35-i*24;allies[i].y=player.y+15;allies[i].hp*=.5;}
    }
    for(const slot of [0,1,2,'ult']){
     start();player.aim={x:player.x+110,y:player.y};
     const sk=slot==='ult'?player.cls.ultimate:player.cls.skills[slot];
     castAbility(player,sk,slot==='ult',slot==='ult'?undefined:slot);
     updateHUD();vfxUpdate(80);render();
     skills.push({champion:k,slot,name:sk.name,kind:sk.kind,signature:championSignatures.some(s=>s.on&&s.key===k)});
     check(sk.name+' finite',Number.isFinite(player.hp)&&enemies.every(e=>Number.isFinite(e.hp)));
     check(sk.name+' signature',championSignatures.some(s=>s.on&&s.key===k));
    }
    start();
    netHookEvents();netMatch={role:'host',recording:true};_netEvents=[];
    vfxChampionSignature(player.x,player.y,k,0,true,0);
    vfxFrostCrown(player.x,player.y,120);vfxSkillCone(player.x,player.y,100,0,.8,'#ffffff');
    const events=JSON.parse(JSON.stringify(_netEvents));netMatch=null;championSignaturesReset();
    for(const [name,args]of events)if(['vfxChampionSignature','vfxFrostCrown','vfxSkillCone'].includes(name))window[name](...args);
    check('network numeric replay',events.filter(e=>['vfxChampionSignature','vfxFrostCrown','vfxSkillCone'].includes(e[0])).length===3&&championSignatures.filter(s=>s.on).length===3);
    netMatch={role:'host',recording:true};_netEvents=Array.from({length:300},()=>['playSfx',[]]);
    vfxChampionSignature(player.x,player.y,k,0,true,0);
    check('cast retained under network cosmetic saturation',_netEvents.length===301&&_netEvents[300][0]==='vfxChampionSignature');
    netMatch=null;_netEvents=[];
    championSignaturesReset();for(let i=0;i<200;i++)vfxChampionSignature(player.x,player.y,k,0,false,0);
    check('bounded pool',championSignatures.length===32&&championSignatures.filter(s=>s.on).length===32);
    vfxChampionSignature(player.x,player.y,k,0,true,0);check('ultimate gets priority',championSignatures.some(s=>s.on&&s.ult));
    championSignaturesUpdate(1000);check('expiration',championSignatures.every(s=>!s.on));
    vfxChampionSignature(player.x,player.y,k,0,true,0);vfxResetRun();check('reset',championSignatures.every(s=>!s.on));
    return {checks,skills};
   },key);
   checks.push(...result.checks);skills.push(...result.skills);
  }
  const layouts=[];
  for(const size of [{width:844,height:390},{width:667,height:375},{width:1280,height:800}]){
   await page.setViewportSize(size);
   for(const key of ['mago','nigromante','eren']){
    const layout=await page.evaluate(k=>{
     netMatch=null;selectedClass=k;currentArena='bosque';lobbyAllies=['tanque','soporte','guerrero'];startRun(3);state='paused';
     runLevel=4;enemies=[];spawnTimer=1e9;arenaHazardTimer=1e9;
     for(let i=0;i<70;i++){const a=i*2.399,r=65+(i%9)*28,e=spawnEnemy('esqueleto');Object.assign(e,{x:player.x+Math.cos(a)*r,y:player.y+Math.sin(a)*r,hp:1e4,maxHp:1e4});}
     for(const h of allies){h.x=player.x+100;h.y=player.y+60;}
     player.aim={x:player.x+110,y:player.y};
     if(k==='mago')for(const i of [0,1,2])castAbility(player,player.cls.skills[i],false,i);
     if(k==='mago')updateFireWalls(150);
     // Clear stale announcements from the preceding test, not gameplay controls.
     HUDTXT.q=[];HUDTXT.cur='';HUDTXT.until=0;document.getElementById('center-banner').classList.remove('show');
     updateHUD();hudStackLayout();vfxUpdate(100);render();
     const ids=['player-status','party','boss-hud','pause-btn','mute-btn','btn-basic','btn-s1','btn-s2','btn-s3','btn-ult','btn-emerg','btn-pact','ult-meter'];
     const rects=ids.map(id=>{const el=document.getElementById(id),r=el.getBoundingClientRect(),s=getComputedStyle(el);return{id,x:r.x,y:r.y,w:r.width,h:r.height,visible:r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'&&+s.opacity>0,background:s.backgroundColor};});
     const top=document.querySelector('#hud .top').getBoundingClientRect();
     const party=document.getElementById('party');
     return{champion:k,width:innerWidth,height:innerHeight,rects,top:{x:top.x,y:top.y,w:top.width,h:top.height},partyClipped:party.scrollHeight>party.clientHeight+1};
    },key);
    layouts.push(layout);
    const visible=layout.rects.filter(r=>r.visible);
    checks.push({name:`${key} ${size.width}: required HUD visible`,ok:['player-status','party','pause-btn','mute-btn','btn-basic','btn-s1','btn-s2','btn-s3','btn-ult','btn-emerg','ult-meter'].every(id=>visible.some(r=>r.id===id))});
    checks.push({name:`${key} ${size.width}: controls in viewport`,ok:visible.every(r=>r.x>=0&&r.y>=0&&r.x+r.w<=size.width+1&&r.y+r.h<=size.height+1)});
    checks.push({name:`${key} ${size.width}: party unclipped`,ok:!layout.partyClipped});
    await page.screenshot({path:`${out}/hud-${key}-${size.width}.png`});
   }
  }
  await page.evaluate(()=>{setState('playing');});
  await page.locator('#pause-btn').click();
  checks.push({name:'pause remains usable',ok:await page.evaluate(()=>state==='paused')});
  await page.locator('#resume-btn').click();
  checks.push({name:'resume remains usable',ok:await page.evaluate(()=>state==='playing')});
  const audioBefore=await page.evaluate(()=>audioEnabled);
  await page.locator('#mute-btn').click();
  checks.push({name:'sound toggle preserves state and accessible label',ok:await page.evaluate(before=>audioEnabled!==before&&document.getElementById('mute-btn').getAttribute('aria-pressed')===String(audioEnabled),audioBefore)});
  await page.evaluate(()=>{state='paused';});
  const runs=[];
  if(!process.argv.includes('--quick'))for(const key of roster)for(const seed of [117,431,991]){
   const r=await page.evaluate(([k,seed])=>{
    let n=seed;Math.random=()=>{n=(1664525*n+1013904223)>>>0;return n/4294967296;};
    netMatch=null;save.stash=[];save.relics={hp:0,dmg:0,def:0,vel:0};
    for(const c in save.champions){const s=save.champions[c];s.unlocked=true;s.level=20;s.xp=0;s.equipment={};s.inventory=[];s.talents={nodes:{},mastery:null,masteryNodes:{}};s.skillMastery=[0,1,2].map(()=>({...mkMastery(),alloc:4}));s.ultMastery={...mkMastery(),alloc:4};}
    lobbyAllies=['tanque','soporte','mago'].map(c=>c===k?'guerrero':c);
    __AP.start(k,'bosque',1);__AP.sim(150000,33.333);__AP.on=false;
    const r={champion:k,seed,damage:player.stats.dmgDealt,alive:player.alive,hp:player.hp,casts:player.stats.skillCasts,error:__AP.err||null};setState('paused');return r;
   },[key,seed]);runs.push(r);console.log(JSON.stringify(r));
  }
  const report={checks,skills,layouts,runs,errors};
  fs.writeFileSync(`${out}/${process.argv.includes('--quick')?'combat-visual-results.json':'combat-results.json'}`,JSON.stringify(report,null,2));
  console.log(JSON.stringify({checks:checks.length,skills:skills.length,runs:runs.length,failed:checks.filter(c=>!c.ok),errors}));
  if(errors.length||checks.some(c=>!c.ok)||runs.some(r=>r.error||!Number.isFinite(r.damage)))process.exitCode=1;
 }finally{if(browser)await browser.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
