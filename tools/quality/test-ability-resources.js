'use strict';
// Complements the differential Ability Gate: exercise public cast entrypoints, not direct handlers.
const assert=require('node:assert/strict'),{spawn}=require('node:child_process'),{chromium}=require('playwright');
const PORT=Number(process.env.RESOURCE_GATE_PORT||8847);
const server=spawn('python3',['-m','http.server',String(PORT),'--bind','127.0.0.1'],{stdio:'ignore'});
(async()=>{let browser;try{
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||chromium.executablePath(),args:['--no-sandbox']});
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.__campaignMode=true;});
 await page.goto(`http://127.0.0.1:${PORT}/`);await page.waitForFunction(()=>typeof startRun==='function'&&typeof CHAMPION_ENTRY_BALANCE!=='undefined');
 const result=await page.evaluate(()=>{
  const checks=[],exceptions=[];const check=(name,ok,detail)=>checks.push({name,ok:!!ok,detail});
  const keys=Object.keys(CLASSES).filter(k=>CLASSES[k].skills?.length===3);
  for(const k of keys)for(const level of [1,39,40,60,90,99]){
   netMatch=null;save.champions[k]||=mkChampion(false);save.stash=[];save.relics={hp:0,dmg:0,def:0,vel:0};
   for(const c of Object.values(save.champions)){Object.assign(c,{level,unlocked:true,equipment:{},talents:mkTalentState(),treeBonus:0});c.skillMastery=[mkMastery(),mkMastery(),mkMastery()];c.ultMastery=mkMastery();}
   selectedClass=k;currentArena='bosque';lobbyAllies=[];startRun(0);state='playing';enemies=[];spawnTimer=1e9;runLevel=ULT_MIN_ARENA_LEVEL;
   const aim={x:player.x+80,y:player.y,dx:1,dy:0};
   for(let i=0;i<3;i++){
    // Negative controls precede casts, before transformation/redirect exceptions are activated.
    player.cds=[0,0,0];player.energy=0;const cost=player.cls.skills[i].cost;
    if(cost>0){const before=player.energy;check(`${k}/${level}/${i}: insufficient energy`,useSkill(i,aim)===false&&player.energy===before);}
    player.energy=10000;player.cds[i]=5000;
    check(`${k}/${level}/${i}: cooldown blocks`,useSkill(i,aim)===false&&player.energy===10000&&player.cds[i]===5000);
   }
   player.cds=[0,0,0];player.energy=10000;player.alive=false;
   check(`${k}/${level}: dead cannot cast`,useSkill(0,aim)===false&&player.energy===10000);player.alive=true;
   state='paused';check(`${k}/${level}: paused cannot cast`,useSkill(0,aim)===false);state='playing';
   for(let i=0;i<3;i++){
    player.cds=[0,0,0];player.energy=10000;const ok=useSkill(i,aim);
    if(ok===false){exceptions.push({champion:k,level,slot:i,reason:'kit state blocks action'});continue;}
    check(`${k}/${level}/${i}: finite positive cooldown`,Number.isFinite(player.cds[i])&&player.cds[i]>0,player.cds[i]);
    check(`${k}/${level}/${i}: finite bounded resource`,Number.isFinite(player.energy)&&player.energy>=0&&player.energy<=10000,player.energy);
   }
   if(k!=='eren'){
    player.ultCharge=player.ultMax;player.ultCd=5000;useUltimate();
    check(`${k}/${level}: ultimate respects cooldown`,player.ultCharge===player.ultMax&&player.ultCd===5000);
   } else exceptions.push({champion:k,level,reason:'transformed ultimate has a separate fury contract'});
   resetRunTransients();state='menu';
  }
  return {champions:keys.length,checks:checks.length,failed:checks.filter(x=>!x.ok),exceptions};
 });
 console.log(JSON.stringify({...result,errors},null,2));assert.deepEqual(result.failed,[]);assert.deepEqual(errors,[]);
}finally{if(browser)await browser.close();server.kill();}})().catch(e=>{console.error(e);process.exitCode=1;server.kill();});
