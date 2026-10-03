'use strict';
const assert=require('node:assert/strict'),{chromium}=require('playwright'),{spawn}=require('node:child_process');
const server=spawn('python3',['-m','http.server','8796'],{stdio:'ignore'});process.on('exit',()=>server.kill());
(async()=>{
 await new Promise(r=>setTimeout(r,400));
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||chromium.executablePath(),args:['--no-sandbox']});
 try{
 const page=await browser.newPage({viewport:{width:844,height:390}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://fondalstudios.com/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}));
 await page.goto('http://127.0.0.1:8796');await page.waitForFunction(()=>typeof accountStartFresh==='function');
 const result=await page.evaluate(async()=>{
  const checks=[];function check(name,ok){checks.push({name,ok:!!ok});}
  setState('mainmenu');save=defaultSave();persistNow();loadSave();
  check('normal load never grants level 40',Object.values(save.champions).every(c=>c.level===1));
  check('normal load preserves catalog defaults',CHAMPION_CATALOG.every(c=>save.champions[c.id].unlocked===c.unlockedByDefault));
  const old=defaultSave();for(const c of Object.values(old.champions))Object.assign(c,{level:40,unlocked:true,playtestLevel40V1:true});old.starterChosen=true;old.gold=234;
  localStorage.setItem(SAVE_KEY,JSON.stringify(old));loadSave();check('legacy progress retained until explicit reset',save.gold>=234&&save.champions.tanque.level===40);
  const beforeGold=save.gold;
  acct.session={user:'NanoGM',name:'NanoGM',token:'a'.repeat(64),apiBase:accountApiBase()};acct.sync={user:'nanogm',version:7,dirty:true};
  acct.conflict={cloud:{version:8,data:old},local:old,localRaw:JSON.stringify(old),shown:false};
  let cloud=old,version=8,conflict=false,puts=0;
  accountFetch=async(method,path,body)=>{
   if(path==='/api/gm/status')return {status:200,j:{owner:true,role:'OWNER'}};
   if(path==='/api/gm/catalog')return {status:200,j:{arenas:[],enemies:[],bosses:[]}};
   if(path==='/api/gm/cosmetics')return {status:200,j:{cosmetics:[]}};
   if(path==='/api/gm/dashboard')return {status:200,j:{metrics:{},notes:[]}};
   if(path==='/api/save'&&method==='GET')return {status:200,j:{version,data:cloud,updatedAt:Date.now()}};
   if(path==='/api/save'&&method==='PUT'){puts++;check('reset uses CAS without force',body.baseVersion===version&&!body.force);if(conflict)return {status:409,j:{}};cloud=body.data;return {status:200,j:{version:++version,updatedAt:Date.now()}};}
   return {status:200,j:{}};
  };
  _acctShowConflict();await new Promise(r=>setTimeout(r,30));
  check('owner can reach admin during conflict',[...document.querySelectorAll('.acc-body button')].some(b=>b.textContent==='Entrar al panel de administración'&&!b.hidden));
  [...document.querySelectorAll('.acc-body button')].find(b=>b.textContent==='Entrar al panel de administración').click();
  await new Promise(r=>setTimeout(r,60));check('admin opens while progress remains unresolved',!!document.getElementById('game-master')&&!!acct.conflict);
  location.hash='';await new Promise(r=>setTimeout(r,30));
  check('conflict can change account',[...document.querySelectorAll('.acc-body button')].some(b=>b.textContent==='Cambiar de cuenta'));
  conflict=true;check('concurrent change refuses reset',!await accountStartFresh());check('failed reset keeps local save',save.gold===beforeGold);
  conflict=false;check('explicit reset succeeds',await accountStartFresh());
  check('cloud and device match',JSON.stringify(cloud.champions)===JSON.stringify(JSON.parse(localStorage.getItem(SAVE_KEY)).champions));
  check('reset clears conflict',!acct.conflict);
  check('cloud level 1, locked, starter pending',Object.values(cloud.champions).every(c=>c.level===1&&!c.unlocked)&&!cloud.starterChosen);
  check('account identity preserved',acct.session.user==='NanoGM');
  check('both backups retained',Object.keys(localStorage).some(k=>k.startsWith(SAVE_KEY+'_nubeAntesDeReinicio_'))&&Object.keys(localStorage).some(k=>k.startsWith(SAVE_KEY+'_antesDeReinicio_')));
  loadSave();check('reload cannot restore level 40',Object.values(save.champions).every(c=>c.level===1));
  const originalSet=Storage.prototype.setItem;
  Storage.prototype.setItem=function(k,v){if(k.startsWith(SAVE_KEY+'_antesDeReinicio_'))throw new DOMException('full','QuotaExceededError');return originalSet.call(this,k,v);};
  try{check('backup failure refuses cloud deletion',!await accountStartFresh()&&puts===2);}finally{Storage.prototype.setItem=originalSet;}
  check('reset uploads attempted',puts===2);
  const fixtureFetch=accountFetch;let permission='down';
  accountFetch=async(...args)=>args[1]==='/api/gm/status' ? permission==='down' ? {status:503,j:{}} : permission==='excluded' ? {status:200,j:{owner:false,reason:'OWNER_EXCLUDED'}} : permission==='player' ? {status:200,j:{owner:false,reason:'PLAYER'}} : fixtureFetch(...args) : fixtureFetch(...args);
  accountLogin=async()=>{_acctSetSession({token:'b'.repeat(64),user:{user:'NanoGM',name:'NanoGM'}});return {ok:true};};
  let continued=0;acct.after=()=>continued++;acct.conflict=null;_acctRenderAuth('login');
  document.getElementById('acc-user').value='NanoGM';document.getElementById('acc-pass').value='fixture-password';
  await _acctSubmit(false);await new Promise(r=>setTimeout(r,40));
  check('NanoGM login offers admin and player instead of auto continuing',acct.view==='profile'&&continued===0&&[...document.querySelectorAll('.acc-body button')].some(b=>b.textContent==='Continuar como jugador'));
  const adminButton=[...document.querySelectorAll('.acc-body button')].find(b=>b.textContent==='Entrar al panel de administración');
  check('NanoGM button survives server startup failure',adminButton&&!adminButton.hidden);
  check('startup error is explained in profile',document.querySelector('.acc-body').textContent.includes('está arrancando'));
  adminButton.click();await new Promise(r=>setTimeout(r,40));
  check('server outage cannot open privileged UI',!document.getElementById('game-master')&&document.querySelector('.gm-denied').textContent.includes('está arrancando'));
  permission='excluded';gameMasterOpen();await new Promise(r=>setTimeout(r,40));
  check('missing OWNER reports server configuration',!document.getElementById('game-master')&&document.querySelectorAll('.gm-denied').length===1&&document.querySelector('.gm-denied').textContent.includes('ADMIN_USERS'));
  permission='owner';gameMasterOpen();await new Promise(r=>setTimeout(r,60));
  check('retry opens panel after server confirms OWNER',!!document.getElementById('game-master'));
  location.hash='';await new Promise(r=>setTimeout(r,30));
  permission='player';acct.session={user:'ordinary',name:'ordinary',token:'c'.repeat(64)};_acctRenderProfile();await new Promise(r=>setTimeout(r,30));
  check('ordinary player has no admin shortcut',[...document.querySelectorAll('.acc-body button')].filter(b=>b.textContent==='Entrar al panel de administración').every(b=>b.hidden));
  return checks;
 });
 console.log(JSON.stringify(result));assert(result.every(r=>r.ok));assert.deepEqual(errors,[]);
 console.log('PASS cloud recovery: actual game load, explicit backed-up reset, CAS, owner shortcut, account isolation');
 }finally{await browser.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1});
