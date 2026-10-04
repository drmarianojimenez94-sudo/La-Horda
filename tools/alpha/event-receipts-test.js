'use strict';
// Real AlphaServices module, recreated against shared storage to model reload/logout.
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const code=fs.readFileSync('js/net/alpha-services.js','utf8');
const settle=()=>new Promise(resolve=>setImmediate(resolve));
const key=(base,user)=>'horda_event_receipts_v1:'+encodeURIComponent(base)+':'+encodeURIComponent(user.toLowerCase());
const BASE='https://one.example',clock={now:1700000000000};
function create(store,{user='alpha',base=BASE,mode='offline',ticket='a'.repeat(48)}={}){
 const calls=[],applied=[],notices=[],listeners={},config={base,mode,pending:null};
 class FakeDate extends Date{static now(){return clock.now;}}
 const ctx={crypto:require('node:crypto').webcrypto,Uint8Array,console,Date:FakeDate,performance:{now:()=>100},
  currentArena:'laberinto',runLevel:10,selectedClass:'tanque',setTimeout,clearTimeout,setInterval:()=>0,
  acct:{session:user?{user,token:'DO_NOT_SERIALIZE_AUTH_TOKEN',apiBase:base}:null,sync:{dirty:false}},
  accountApiBase:()=>config.base,accountAvailable:()=>true,accountUpload:async()=>true,accountApplyEventReward:r=>applied.push(r),showNetToast:m=>notices.push(m),
  localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},
  document:{hidden:false,getElementById:()=>null,querySelector:()=>null,addEventListener(){}},window:{addEventListener:(n,f)=>listeners[n]=f},
  accountFetch:async(method,path,body)=>{
   calls.push({path,body,user:ctx.acct.session?.user,base:config.base});
   const event={id:'invasion',name:'Invasión',enabled:true,start:clock.now-1,end:clock.now+3600000,arenas:['laberinto'],wave:10,boss:'minotauro',cosmetic:'cosmetic'};
   if(path==='/api/world')return{status:200,j:{events:[event],normalConfig:{},messages:[],serverTime:clock.now}};
   if(path==='/api/events/start')return{status:200,j:{ticket,event,minDurationMs:50000,expires:clock.now+6*3600000}};
   if(path==='/api/events/complete'){
    if(config.mode==='offline')throw Error('offline');
    if(config.mode==='defer')return new Promise(resolve=>{config.pending=resolve;});
    if(config.mode==='404')return{status:404,j:{code:'BAD_TICKET'}};
    if(config.mode==='409')return{status:409,j:{code:'CONFLICT'}};
    return{status:200,j:{ok:true,granted:true,cosmetic:'cosmetic',cosmeticType:'skin',saveVersion:2,baseVersion:1}};
   }
   return{status:200,j:{}};
  }};
 vm.createContext(ctx);vm.runInContext(code,ctx);const services=vm.runInContext('AlphaServices',ctx);
 return{ctx,services,calls,applied,notices,config,listeners};
}
async function earn(f){await settle();f.services.onState('playing');await settle();clock.now+=60000;f.services.enemyDefeated({type:'minotauro',alive:false,hp:0});f.services.onState('victory');await settle();}
(async()=>{
 const store=new Map(),first=create(store);await settle();first.services.onState('playing');await settle();
 assert.equal(JSON.stringify([...store.values()]).includes('a'.repeat(48)),false,'unearned start ticket is never persisted');
 clock.now+=60000;first.services.enemyDefeated({type:'minotauro',alive:false,hp:0});first.services.onState('victory');await settle();
 const earned=JSON.parse(store.get(key(BASE,'alpha')));assert.equal(earned.length,1);assert.equal(earned[0].bossDefeated,'minotauro');
 assert.deepEqual(Object.keys(earned[0]).sort(),['ticket','eventId','name','wave','bossDefeated','readyAt','expires'].sort());
 assert.equal(JSON.stringify([...store.values()]).includes('DO_NOT_SERIALIZE_AUTH_TOKEN'),false);assert.equal(JSON.stringify([...store.values()]).includes('"session"'),false);
 assert.equal(first.services.build,'alpha-completion-2');
 const other=create(store,{user:'beta',mode:'ok'});await settle();assert.equal(other.calls.some(c=>c.path==='/api/events/complete'),false,'other account cannot claim');
 const otherServer=create(store,{base:'https://two.example',mode:'ok'});await settle();assert.equal(otherServer.calls.some(c=>c.path==='/api/events/complete'),false,'other API cannot claim');
 const reload=create(store,{mode:'ok'});await settle();assert.equal(reload.applied.length,1,'reload automatically reclaims earned receipt');assert.deepEqual(JSON.parse(store.get(key(BASE,'alpha'))),[]);
 // Account change while a request is in flight must not apply or delete old-account reward.
 const races=new Map(),seed=create(races);await earn(seed);const race=create(races,{mode:'defer'});await settle();assert.ok(race.config.pending);
 race.ctx.acct.session={user:'beta',token:'OTHER_TOKEN'};race.listeners['account-change']();
 race.config.pending({status:200,j:{ok:true,granted:true,cosmetic:'cosmetic'}});await settle();assert.equal(race.applied.length,0);assert.equal(JSON.parse(races.get(key(BASE,'alpha'))).length,1);
 race.config.mode='ok';race.ctx.acct.session={user:'alpha',token:'NEW_AUTH_TOKEN'};race.listeners['account-change']();await settle();assert.equal(race.applied.length,1);assert.deepEqual(JSON.parse(races.get(key(BASE,'alpha'))),[]);
 // Temporary conflicts retain receipts; unknown/expired tickets terminate with feedback.
 const retryStore=new Map(),retrySeed=create(retryStore);await earn(retrySeed);const retry=create(retryStore,{mode:'409'});await settle();assert.equal(JSON.parse(retryStore.get(key(BASE,'alpha'))).length,1);
 retry.config.mode='ok';await retry.services.completeEvents();assert.deepEqual(JSON.parse(retryStore.get(key(BASE,'alpha'))),[]);
 const missingStore=new Map(),missingSeed=create(missingStore);await earn(missingSeed);const missing=create(missingStore,{mode:'404'});await settle();assert.deepEqual(JSON.parse(missingStore.get(key(BASE,'alpha'))),[]);assert.ok(missing.notices.some(n=>n.includes('no es válido')));
 const expiredStore=new Map(),expiredSeed=create(expiredStore);await earn(expiredSeed);clock.now+=7*3600000;const expired=create(expiredStore,{mode:'ok'});await settle();assert.equal(expired.calls.some(c=>c.path==='/api/events/complete'),false);assert.deepEqual(JSON.parse(expiredStore.get(key(BASE,'alpha'))),[]);assert.ok(expired.notices.some(n=>n.includes('venció')));
 const boundStore=new Map();boundStore.set(key(BASE,'alpha'),JSON.stringify(Array.from({length:25},(_,n)=>({ticket:n.toString(16).padStart(48,'0'),eventId:'event_'+n,name:'Fixture',wave:10,bossDefeated:null,readyAt:clock.now+60000,expires:clock.now+120000,token:'REMOVE_ME'}))));
 const bound=create(boundStore,{mode:'ok'});await settle();assert.equal(JSON.parse(boundStore.get(key(BASE,'alpha'))).length,20);assert.equal(boundStore.get(key(BASE,'alpha')).includes('REMOVE_ME'),false);assert.equal(bound.calls.some(c=>c.path==='/api/events/complete'),false,'minimum duration waits before request');
 const lostStore=new Map(),lost=create(lostStore);await settle();lost.services.onState('playing');await settle();lost.services.onState('gameover');await settle();assert.deepEqual(JSON.parse(lostStore.get(key(BASE,'alpha'))),[],'defeat does not persist a reward');
 console.log('PASS earned event receipts: offline reload, login, account/API isolation, in-flight switch, no tokens, bounded20, expiry/404, 409 retry, minimum time, no unearned claims, Alpha build tag');
})().catch(e=>{console.error(e);process.exitCode=1;});
