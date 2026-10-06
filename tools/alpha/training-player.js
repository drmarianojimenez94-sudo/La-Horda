/* Live novice profile: gameplay exclusively through production pointer controls.
 * State reads locate targets; no killEnemy, cooldown editing, teleport or trainingTick. */
const assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
try{const page=await browser.newPage({viewport:{width:Number(process.env.WIDTH)||844,height:Number(process.env.HEIGHT)||(process.env.WIDTH==='667'?375:390)}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto((process.env.SITE||'http://127.0.0.1:8805')+'/?lazy=0');await page.waitForFunction(()=>typeof alphaTrainingStart==='function');
const began=Date.now();
await page.evaluate(()=>{setState('mainmenu');renderMainMenu();});await page.locator('#alpha-onboarding [data-train]').click();
const stage=()=>page.evaluate(()=>ALPHA_TRAINING.active?ALPHA_TRAINING_STEPS[ALPHA_TRAINING.step].id:'done');
const until=async(id,ms=25000)=>{try{await page.waitForFunction(want=>(ALPHA_TRAINING.active?ALPHA_TRAINING_STEPS[ALPHA_TRAINING.step].id:'done')===want,id,{timeout:ms});}catch(e){const st=await page.evaluate(()=>({step:ALPHA_TRAINING.active?ALPHA_TRAINING_STEPS[ALPHA_TRAINING.step].id:'done',metrics:ALPHA_TRAINING.metrics,danger:ALPHA_TRAINING.danger,ally:ALPHA_TRAINING.ally&&{alive:ALPHA_TRAINING.ally.alive,x:ALPHA_TRAINING.ally.x,y:ALPHA_TRAINING.ally.y,revT:ALPHA_TRAINING.ally._reviveT},player:{x:player.x,y:player.y,alive:player.alive,hp:player.hp},state}));throw Error('stuck waiting for '+id+': '+JSON.stringify(st));}console.log('PASS novice reached '+id);};
async function hold(id,ms){const b=await page.locator(id).boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();try{await page.waitForTimeout(ms);}finally{await page.mouse.up();}}
const joy=await page.locator('#joy-base').boundingBox(),center={x:joy.x+joy.width/2,y:joy.y+joy.height/2};
await until('move',12000); // paso 1: la misión se lee sola (7 s)
await page.mouse.move(center.x,center.y);await page.mouse.down();await page.mouse.move(center.x+36,center.y);await page.waitForTimeout(2000);await page.mouse.up();await until('attack');
await hold('#btn-basic',4000);await until('skill');
await page.locator('#btn-s1').click();await until('inspect');
await hold('#btn-s2',900);await until('cooldown');
await page.waitForFunction(()=>player.cds[0]<=0);await page.locator('#btn-s1').click();await until('ultimate');
await page.locator('#btn-ult').click();await until('danger');
// esquivar: caminar con el joystick fuera de la marca roja antes de que se llene
await page.mouse.move(center.x,center.y);await page.mouse.down();await page.mouse.move(center.x,center.y-40);await page.waitForTimeout(1500);await page.mouse.up();
await until('potion',15000);
async function moveToPickup(kind,next){for(let n=0;n<35&&(await stage())===kind;n++){const v=await page.evaluate(k=>{const p=k==='potion'?ALPHA_TRAINING.potion:ALPHA_TRAINING.loot;return {x:p.x-player.x,y:p.y-player.y};},kind);const len=Math.hypot(v.x,v.y);if(len<25){await page.waitForTimeout(1500);continue;}await page.mouse.move(center.x,center.y);await page.mouse.down();await page.mouse.move(center.x+v.x/len*36,center.y+v.y/len*36);await page.waitForTimeout(150);await page.mouse.up();}await until(next);}
await moveToPickup('potion','xp');await hold('#btn-basic',4000);await until('loot');await moveToPickup('loot','tactical');
await page.locator('#pause-btn').click();await page.waitForTimeout(400);await page.locator('#resume-btn').click();await until('revive');
// caminar hasta Elyra y mantener el botón de reanimar
for(let n=0;n<30;n++){const v=await page.evaluate(()=>({x:ALPHA_TRAINING.ally.x-player.x,y:ALPHA_TRAINING.ally.y-player.y}));const len=Math.hypot(v.x,v.y);if(len<70)break;await page.mouse.move(center.x,center.y);await page.mouse.down();await page.mouse.move(center.x+v.x/len*40,center.y+v.y/len*40);await page.waitForTimeout(Math.min(600,len*4));await page.mouse.up();}
await hold('#btn-revive',5800);await until('objective');
await hold('#btn-basic',6500);await until('done');
assert.equal(await page.evaluate(()=>save.tut.training),1);assert.deepEqual(errors,[]);console.log('PASS live novice '+Math.round((Date.now()-began)/1000)+'s: actual movement, attack, long-press inspect, cooldown, ultimate, telegraph dodge, pickups, XP, loot, tactical panel, revive and objective via pointer inputs');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
