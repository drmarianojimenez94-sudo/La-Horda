const {chromium}=require('playwright'),{spawn}=require('child_process'),fs=require('fs');
const server=process.env.ENTRY_BASE_URL?null:spawn('python3',['-m','http.server','8796'],{stdio:'ignore'});
(async()=>{let browser;try{
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||chromium.executablePath(),args:['--no-sandbox']});const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(process.env.ENTRY_BASE_URL||'http://127.0.0.1:8796');await page.waitForFunction(()=>typeof CHAMPION_ENTRY_BALANCE!=='undefined');
 // Explicit workshop load: same normalization, seeds and ceilings as released candidates.
 // Does not remove the existing candidates or add anything to knownChampions.
 if(process.argv.includes('--workshop-solciju')||process.argv.includes('--workshop-quality')){
  await page.addScriptTag({path:'js/champions/quality-five/solciju.js'});
  await page.addScriptTag({path:'tools/quality-five/register-fixture.js'});
 }
 if(process.argv.includes('--workshop-quality')){
  await page.addScriptTag({path:'js/champions/quality-five/veyra.js'});
  await page.addScriptTag({path:'tools/quality-five/register-veyra-fixture.js'});
  await page.addScriptTag({path:'js/champions/quality-five/brakk.js'});
  await page.addScriptTag({path:'tools/quality-five/register-brakk-fixture.js'});
 }
 if(process.argv.includes('--self-test'))await page.evaluate(()=>{
  const key='__entry_fixture',R=CHAMPION_BALANCE_REFERENCE.roles.mago;
  CLASSES[key]={...CLASSES.mago,name:'Entry test fixture',baseHP:R.hp.mean,baseDmg:R.basicDPS.mean*.85*CLASSES.mago.basicCd/1000,baseDef:R.defense.mean,baseSpeed:R.speed.mean,hpGrowthMult:R.hpGrowth.mean,dmgGrowthMult:R.damageGrowth.mean};
  CHAMPION_ENTRY_BALANCE.push(balanceChampionEntry(key,CLASSES[key],CHAMPION_BALANCE_REFERENCE));
  save.champions[key]=JSON.parse(JSON.stringify(save.champions.mago));
  SCORE_CONFIG[key]=SCORE_CONFIG.mago;CHAMP_ITEM_AFFINITY[key]=CHAMP_ITEM_AFFINITY.mago;
  PAL[key]=PAL.mago;GRIDS[key]=GRIDS.mago;SPRITES[key]=SPRITES.mago;
 });
 const entries=await page.evaluate(()=>CHAMPION_ENTRY_BALANCE);if(entries.some(e=>e.error||(!e.existing&&e.budgetAfter>(e.ceiling||1.15)+1e-6)))throw Error('entry budget invalid');
 await page.addScriptTag({path:'tools/balance/autopilot.js'});const runs=[];
 for(const entry of entries.filter(e=>!e.existing))for(const seed of [117,431,991]){
  const result=await require('./run-entry-simulation')(page,entry.key,seed);runs.push(result);
 }
 const ref=JSON.parse(fs.readFileSync('docs/balance/champion-entry-reference.json','utf8')),violations=[];
 for(const entry of entries.filter(e=>!e.existing)){
  const rs=runs.filter(r=>r.key===entry.key),mean=rs.reduce((s,r)=>s+r.damage,0)/rs.length,ceiling=ref.roles[entry.role].simulation.meanDamage150s*(entry.profile&&ref.profiles&&ref.profiles[entry.profile]?ref.profiles[entry.profile].simulationCeilingMultiplier:1.35);
  if(rs.some(r=>r.error||!Number.isFinite(r.hp)||!Number.isFinite(r.damage)||r.casts<1)||mean>ceiling)violations.push({key:entry.key,mean,ceiling,reason:'simulation outside entry benchmark'});
 }
 fs.mkdirSync('docs/balance',{recursive:true});fs.writeFileSync(process.argv.includes('--workshop-quality')?'docs/production/quality-five/workshop-entry-results.json':process.argv.includes('--workshop-solciju')?'docs/production/quality-five/solciju-entry-results.json':process.argv.includes('--self-test')?'docs/balance/entry-self-test-results.json':'docs/balance/entry-gate-results.json',JSON.stringify({entries,runs,violations,errors},null,2));
 if(errors.length||violations.length)throw Error(JSON.stringify({errors,violations}));console.log(JSON.stringify({registered:entries.length,newChampions:entries.filter(e=>!e.existing).length,simulations:runs.length,status:'PASS'}));
 }finally{if(browser)await browser.close();if(server)server.kill();}})().catch(e=>{console.error(e);process.exitCode=1;});
