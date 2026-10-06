/* Integration: real renderer / engine, deterministic action checkpoints, save isolation.
 * Browser defaults to installed Playwright; CHROME overrides executable. */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const size of [{width:844,height:390},{width:667,height:375}]){
   const page=await browser.newPage({viewport:size});const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto((process.env.SITE||'http://127.0.0.1:8805')+'/?lazy=0');
   await page.waitForFunction(()=>typeof alphaTrainingStart==='function'&&typeof renderMainMenu==='function');
   const initial=await page.evaluate(()=>{setState('mainmenu');renderMainMenu();persistNow();return JSON.stringify(save);});
   const trainBox=await page.locator('#alpha-onboarding [data-train]').boundingBox();assert(trainBox.height>=40,'training touch target too small');
   assert.equal(await page.evaluate(()=>alphaTrainingStart()),true);
   await page.waitForTimeout(700);
   assert.deepEqual(await page.evaluate(()=>({active:ALPHA_TRAINING.active,arena:currentArena,alive:player.alive,solo:heroes.length})),{active:true,arena:'training',alive:true,solo:1});
   {const stored=await page.evaluate(()=>localStorage.getItem(SAVE_KEY));
    // si falla, nombrar los campos que cambiaron (el guardado entero no entra en el log de CI)
    if(stored!==initial){const d=[];(function cmp(x,y,p){if(JSON.stringify(x)===JSON.stringify(y))return;if(x&&y&&typeof x==='object'&&typeof y==='object'){for(const k of new Set([...Object.keys(x),...Object.keys(y)]))cmp(x[k],y[k],p+'.'+k);}else d.push(p+': '+JSON.stringify(x)+' -> '+JSON.stringify(y));})(JSON.parse(initial),JSON.parse(stored||'null'),'save');
     assert.fail('training wrote the real save ('+size.width+'): '+d.slice(0,12).join(' | '));}}
   await page.screenshot({path:'/tmp/horda-training-'+size.width+'.png'});
   const results=await page.evaluate(()=>{
    const step=()=>ALPHA_TRAINING_STEPS[ALPHA_TRAINING.step].id;
    const advance=()=>{alphaTrainingTick(10);alphaTrainingTick(1400);return step();};
    const out=[];
    alphaTrainingTick(7000);out.push(advance()); // paso 1: la misión (SOBREVIVIR) se lee y sigue sola
    player.x+=220;out.push(advance());
    enemies.forEach(e=>{e.lastHitBy=player;killEnemy(e);});out.push(advance());
    useSkill(0);out.push(advance());
    abilityInspectorOpen(1,document.getElementById('btn-s2'));abilityInspectorClose();out.push(advance());
    player.cds[0]=0;player.energy=player.maxEnergy;useSkill(0);out.push(advance());
    useUltimate();out.push(advance());
    {const d=ALPHA_TRAINING.danger;player.x=d.x+d.r+60;player.y=d.y;alphaTrainingTick(2000);out.push(advance());}
    if(!ALPHA_TRAINING.potion)throw Error('steps '+JSON.stringify(out)+' '+JSON.stringify(ALPHA_TRAINING.metrics)+' cds '+JSON.stringify(player.cds));player.x=ALPHA_TRAINING.potion.x;player.y=ALPHA_TRAINING.potion.y;updatePotions(16);out.push(advance());
    enemies.forEach(e=>{e.lastHitBy=player;killEnemy(e);});out.push(advance());
    groundLootPick(ALPHA_TRAINING.loot);out.push(advance());
    tacticalPanelOpen();out.push(advance());
    reviveHero(ALPHA_TRAINING.ally,player);out.push(advance());
    enemies.forEach(e=>{e.lastHitBy=player;killEnemy(e);});alphaTrainingTick(10);alphaTrainingTick(1400);
    return {out,complete:save.tut.training,active:ALPHA_TRAINING.active,state};
   });
   assert.deepEqual(results.out,['move','attack','skill','inspect','cooldown','ultimate','danger','potion','xp','loot','tactical','revive','objective']);
   assert.equal(results.complete,1);assert.equal(results.active,false);assert.equal(results.state,'mainmenu');
   const restored=JSON.parse(await page.evaluate(()=>JSON.stringify(save)));const before=JSON.parse(initial);delete restored.tut;delete before.tut;assert.deepEqual(restored,before,'training altered campaign data');
   // Exit / reload never stores rehearsal loot or xp. Pausing must preserve tutorial.
   await page.evaluate(()=>{alphaTrainingStart();setState('paused');});
   assert.equal(await page.evaluate(()=>ALPHA_TRAINING.active),true);
   await page.evaluate(()=>{setState('playing');save.gold=987654;persistNow();alphaTrainingExit(false);});
   assert.notEqual(await page.evaluate(()=>save.gold),987654);
   await page.evaluate(()=>{alphaTrainingStart();ALPHA_TRAINING.elapsed=299999;alphaTrainingTick(2);});
   assert.equal(await page.evaluate(()=>ALPHA_TRAINING.active),true,'learning must not time out');
   await page.evaluate(()=>alphaTrainingExit(false));
   await page.evaluate(()=>alphaGuideOpen());
   assert.equal(await page.locator('#alpha-guide section').count(),10);
   const box=await page.locator('#alpha-guide').boundingBox();assert(box.x>=0&&box.y>=0&&box.x+box.width<=size.width&&box.y+box.height<=size.height);
   const sequence=await page.evaluate(()=>{
    document.getElementById('alpha-guide').close();
    const confirmed={};const ordered=[];
    for(let n=1;n<=10;n++){const lesson=alphaOnboardingLesson(10,confirmed);ordered.push(lesson.level);confirmed[lesson.level]=1;}
    if(alphaOnboardingLesson(10,confirmed)!==null)throw Error('completed guide repeats');
    if(alphaOnboardingLesson(1,{1:1})!==null)throw Error('future lessons shown early');
    save.tut.onboarding={};save.champions[selectedClass].level=10;renderMainMenu();
    const card=document.getElementById('alpha-onboarding');if(card.dataset.lesson!=='1')throw Error('XP jump skipped guidance');
    card.querySelector('[data-understood]').click();if(card.dataset.lesson!=='2')throw Error('acknowledgement did not advance');
    return ordered;
   });
   assert.deepEqual(sequence,[1,2,3,4,5,6,7,8,9,10]);
   assert.deepEqual(errors,[]);
   console.log('PASS training '+size.width+'x'+size.height+' real engine/actions, all 14 steps, save isolation, pause/exit/no time limit, guide bounds');
   await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
