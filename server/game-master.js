"use strict";
// Operational state is separate from player saves. File writes are atomic; PostgreSQL
// serializes mutations with a row lock. No payment or privileged client-side flag.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const {allowed} = require('./admin-levels');
const DEFAULTS = Object.freeze({xp:1,gold:1,drop:1,difficulty:1,enemyHp:1,enemyDamage:1,bossHp:1,eliteRate:1,spawnRate:1});
const EVENTS = new Set(['start','login','menu','tutorial_started','tutorial_completed','arena_started','death','abandon','victory','next_arena','ability','talent','equipment','set','drop','codex','skin','croma','multiplayer','error','heartbeat','level_up','pickup','tutorial_step','tutorial_step_complete','tutorial_abandoned']);
const RESET_FIELDS = ['championProgress','arenas','gold','inventory','cosmetics','codex'];
const clone = x=>JSON.parse(JSON.stringify(x));
function fail(code, status=400){const e=new Error(code);e.status=status;throw e;}
function text(s,n=250){if(typeof s!=='string')return '';return s.normalize('NFC').replace(/[<>\u0000-\u001f\u007f]/g,'').trim().slice(0,n);}
function id(s){return typeof s==='string'&&!['__proto__','constructor','prototype'].includes(s)&&/^[a-zA-Z0-9_-]{1,64}$/.test(s)?s:'';}
function ids(v){if(v===undefined)return [];if(!Array.isArray(v)||v.length>20||v.some(x=>!id(x)))fail('BAD_IDS');return [...new Set(v)];}
function initial(){return {version:0,config:{...DEFAULTS},events:[],messages:[],chat:[],pinned:null,audit:[],snapshots:[],previews:[],metrics:{total:{},days:{},dimensions:{}}};}
function stateOf(s){return s||initial();}
function audit(s,owner,action,details,now){s.audit.push({at:now,owner:owner.id,action,...details});s.audit=s.audit.slice(-2000);}
function multipliers(v,partial=false){
 if(!v||typeof v!=='object'||Array.isArray(v))fail('BAD_CONFIG');
 const out=partial?{}:{...DEFAULTS};
 for(const [k,n] of Object.entries(v)){
  if(!Object.hasOwn(DEFAULTS,k)||typeof n!=='number'||!Number.isFinite(n)||n<0.1||n>(k==='xp'||k==='gold'?20:10))fail('BAD_CONFIG');out[k]=n;
 }return out;
}
function schedule(b,now){
 const start=b.start===undefined?now:Number(b.start),end=Number(b.end);
 if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||end<=start||end-start>366*86400000)fail('BAD_SCHEDULE');
 return {start,end};
}
function image(s){if(!s)return '';if(typeof s!=='string'||s.length>1000)fail('BAD_IMAGE');if(/^\/?assets\/[a-zA-Z0-9_./-]+$/.test(s)&&!s.includes('..'))return s;try{const u=new URL(s);if(u.protocol==='https:'&&!u.username&&!u.password)return u.href;}catch{}fail('BAD_IMAGE');}
function active(x,now){return x.enabled!==false&&x.start<=now&&x.end>now;}
function catalog(){
 // Execute only trusted repository metadata in a restricted context, never request text.
 const c={CROMA_SKINS:{},SET_SKINS:{},champPackLoadAtlas:()=>{},champPackCloneAtlas:()=>{}};vm.createContext(c);
 for(const f of ['croma-skins-meta.js','set-skins-meta.js','portadores-meta.js','ynara-meta.js','complete-set-skins-meta.js']){
  const source=fs.readFileSync(path.join(__dirname,'../js/assets',f),'utf8');
  vm.runInContext(source,c,{timeout:1000,filename:f});
 }
 const out={};for(const [key,v] of Object.entries(c.CROMA_SKINS))out[key]={id:key,name:v.name,champion:v.champ,type:'croma'};
 for(const [key,v] of Object.entries(c.SET_SKINS))out[key]={id:key,name:v.name,champion:v.champ||null,type:'skin'};
 return out;
}
function resetData(data,fields){
 const d=clone(data);
 for(const field of fields){
  if(field==='championProgress')for(const c of Object.values(d.champions||{})){
   c.level=1;c.xp=0;c.talentPoints=0;c.treeBonus=0;c.talents={nodes:{},picks:{},mastery:null,masteryNodes:{}};
   for(const m of [...(c.skillMastery||[]),c.ultMastery].filter(Boolean)){m.alloc=0;m.useXp=0;m.useLvl=1;delete m.xp;delete m.level;}
  }
  if(field==='arenas'){d.arenasCleared={};d.legacyOpenArenas=[];d.divineArenaUnlocked=false;d.diffCleared={pesadilla:{},infierno:{}};d.diffSelected='normal';d.crystals={};d.legacyHieloOpen=false;d.legacyLabOpen=false;for(const flag of ['fortalezaMigrated','micelialMigrated','abismoMigrated','campaignV2','ciudadV1','minasV1'])d[flag]=true;}
  if(field==='gold')d.gold=0;
  if(field==='inventory'){d.stash=[];for(const c of Object.values(d.champions||{})){c.equipment={arma:null,escudo:null,casco:null,pechera:null,guantes:null,botas:null};delete c.inventory;delete c._legacyInventory;}}
  if(field==='cosmetics'){d.cromas={};d.cosmeticUnlocks={};for(const c of Object.values(d.champions||{})){c.croma=null;c.appearance=null;c.cosmeticSkin='';}}
  if(field==='codex')d.codex={seen:{},kills:{}};
 }return d;
}
function gameplayCatalog(){
 const c={};vm.createContext(c);
 for(const f of ['arenas.js','enemies.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/data',f),'utf8'),c,{timeout:1000});
 for(const f of ['ciudad/cm-data.js','abismo/ab-data.js','micelial/mic-data.js','fortaleza/fort-data.js','minas/mn-data.js','hielo/hie-boss.js','infernal/inf-hechicero.js','infernal/inf-boss.js']){
  const src=fs.readFileSync(path.join(__dirname,'../js/arenas',f),'utf8');
  const blocks=[...src.matchAll(/Object\.assign\(ENEMY_BASE,\s*\{[\s\S]*?^\}\);/gm),...src.matchAll(/ENEMY_BASE\.[a-z_]+\s*=\s*\{[\s\S]*?\};/g)];
  for(const block of blocks)vm.runInContext(block[0],c,{timeout:1000,filename:f});
 }
 return vm.runInContext('({arenas:Object.keys(ARENA_MODS),enemies:Object.keys(ENEMY_BASE).filter(k=>["normal","elite"].includes(ENEMY_BASE[k].rank)&&!ENEMY_BASE[k].structure),bosses:Object.keys(ENEMY_BASE).filter(k=>ENEMY_BASE[k].rank==="jefe"||ENEMY_BASE[k].rank==="subjefe")})',c);
}
function routes(ctx){
 const {getStore,auth,send,err,readBody,summarize,now}=ctx;
 let gameCatalog;const gameplay=()=>gameCatalog||(gameCatalog=gameplayCatalog());
 let cosmeticCatalog;const cosmetics=()=>cosmeticCatalog||(cosmeticCatalog=catalog());
 const online=new Map(),rate=new Map();
 function throttle(key,max,window=60000){const t=now();for(const [k,r] of rate)if(r.until<=t)rate.delete(k);let r=rate.get(key);if(!r){r={n:0,until:t+window};rate.set(key,r);}if(++r.n>max)fail('RATE_LIMIT',429);}
 async function mutate(fn){return getStore().gmUpdate(async (raw,writeSnapshot)=>{const s=stateOf(raw);const value=await fn(s,writeSnapshot);return {state:s,value};});}
 async function read(){return stateOf(await getStore().gmRead());}
 const result={};
 function route(method,url,role,fn){result[method+' '+url]=async(req,res,ip)=>{
  try{
   let user=null;if(role){const a=await auth(req);if(!a.user)fail('NO_SESSION',401);user=a.user;if(role==='owner'&&!allowed(user))fail('FORBIDDEN',403);}
   const body=method==='GET'?{}:await readBody(req,32768);
   const value=await fn({req,user,body,ip});send(req,res,200,value);
  }catch(e){if(e.status)return err(req,res,e.status,e.message,e.message);throw e;}
 };}
 route('GET','/api/gm/status','user',async({user})=>({owner:allowed(user),role:allowed(user)?'OWNER':null}));
 route('GET','/api/world',null,async()=>{const s=await read(),t=now();return {version:s.version,normalConfig:s.config,config:{...s.config},events:s.events.filter(e=>active(e,t)),messages:s.messages.filter(e=>active(e,t)),serverTime:t};});
 route('GET','/api/gm/config','owner',async()=>{const s=await read();return {version:s.version,config:s.config,defaults:DEFAULTS};});
 for(const [method,url,defaults] of [['PUT','/api/gm/config',false],['POST','/api/gm/config/defaults',true]])route(method,url,'owner',async({user,body})=>{
  const config=defaults?{...DEFAULTS}:multipliers(body.config);
  return mutate(s=>{if(body.version!==s.version)fail('CONFLICT',409);s.config=config;s.version++;audit(s,user,defaults?'config.defaults':'config.update',{},now());return {version:s.version,config:s.config};});
 });
 route('GET','/api/gm/events','owner',async()=>({events:(await read()).events}));
 route('POST','/api/gm/events','owner',async({user,body:b})=>{
  if(!text(b.name,80))fail('BAD_NAME');
  if(b.enabled!==undefined&&typeof b.enabled!=='boolean')fail('BAD_ENABLED');
  if(b.boss||b.set||b.cosmetic)fail('UNSUPPORTED_EVENT_REWARD_BOSS',422);
  const entry={id:b.id?id(b.id):crypto.randomUUID(),name:text(b.name,80),description:text(b.description,1000),...schedule(b,now()),enabled:b.enabled!==false,
   arenas:ids(b.arenas),wave:b.wave??1,boss:id(b.boss),enemies:ids(b.enemies),
   multipliers:multipliers(b.multipliers||{},true),set:id(b.set),cosmetic:id(b.cosmetic),announcement:text(b.announcement,400),banner:image(b.banner)};
  if(!entry.id||!Number.isInteger(entry.wave)||entry.wave<1||entry.wave>400)fail('BAD_EVENT');
  if(entry.boss||entry.set||entry.cosmetic)fail('UNSUPPORTED_EVENT_REWARD_BOSS',422);
  if(entry.cosmetic&&!cosmetics()[entry.cosmetic])fail('BAD_COSMETIC');
  const game=gameplay();if(entry.arenas.some(x=>!game.arenas.includes(x))||entry.enemies.some(x=>!game.enemies.includes(x))||(entry.boss&&!game.bosses.includes(entry.boss)))fail('BAD_GAMEPLAY_ID');
  if(entry.set&&!cosmetics()[entry.set])fail('BAD_SET');
  return mutate(s=>{const old=s.events.findIndex(e=>e.id===entry.id);if(old<0&&s.events.length>=100)fail('EVENT_LIMIT');if(old>=0)s.events[old]=entry;else s.events.push(entry);s.version++;audit(s,user,'event.save',{id:entry.id},now());return {event:entry,version:s.version};});
 });
 route('GET','/api/gm/messages','owner',async()=>({messages:(await read()).messages}));
 route('POST','/api/gm/messages','owner',async({user,body:b})=>{
  if(!['news','banner','global'].includes(b.type)||!text(b.text,1000))fail('BAD_MESSAGE');
  if(b.enabled!==undefined&&typeof b.enabled!=='boolean')fail('BAD_ENABLED');
  const entry={id:b.id?id(b.id):crypto.randomUUID(),type:b.type,text:text(b.text,1000),image:image(b.image),...schedule(b,now()),enabled:b.enabled!==false};if(!entry.id)fail('BAD_ID');
  return mutate(s=>{const n=s.messages.findIndex(x=>x.id===entry.id);if(n<0&&s.messages.length>=100)fail('MESSAGE_LIMIT');if(n>=0)s.messages[n]=entry;else s.messages.push(entry);audit(s,user,'message.save',{id:entry.id},now());return {message:entry};});
 });
 route('GET','/api/chat','user',async()=>{const s=await read();return {messages:s.chat.slice(-80),pinned:s.chat.find(m=>m.id===s.pinned)||null};});
 route('POST','/api/chat','user',async({user,body})=>{
  throttle('chat:'+user.id,8,10000);if(typeof body.text!=='string'||body.text.length>500||!text(body.text,400))fail('BAD_MESSAGE');
  const message={id:crypto.randomUUID(),name:text(user.name||user.user,32),text:text(body.text,400),owner:allowed(user),at:now()};
  return mutate(s=>{s.chat.push(message);s.chat=s.chat.slice(-200);return {message};});
 });
 route('POST','/api/gm/chat/pin','owner',async({user,body})=>mutate(s=>{if(body.id!==null&&!s.chat.some(m=>m.id===body.id))fail('NOT_FOUND',404);s.pinned=body.id;audit(s,user,'chat.pin',{id:body.id},now());return {ok:true};}));
 route('POST','/api/telemetry',null,async({body:b,ip})=>{
  throttle('telemetry:'+ip,60);
  if(!Array.isArray(b.events)||b.events.length>30||!b.events.length)fail('BAD_EVENTS');
  const aliases={run_started:'arena_started',defeat:'death',skill:'ability'};
  const rows=b.events.map(raw=>{
   const e={build:b.build,version:b.version,alpha:b.alpha,...raw,name:aliases[raw?.name]||raw?.name};
   if(!e||!EVENTS.has(e.name))fail('BAD_EVENT');const row={name:e.name};
   for(const k of ['champion','arena','skin','croma','ability','talent','equipment','set','drop','build','version','alpha','multiplayer','errorCode','step'])if(e[k]!==undefined){if(!id(String(e[k])))fail('BAD_DIMENSION');row[k]=String(e[k]);}
   for(const k of ['durationMs','level','wave'])if(e[k]!==undefined){if(!Number.isFinite(e[k])||e[k]<0||e[k]>86400000)fail('BAD_VALUE');row[k]=e[k];}
   return row;
  });
  // Ephemeral session identifiers never touch persistent storage or account IDs.
  const t=now();for(const [k,v] of online)if(t-v.at>120000)online.delete(k);
  if(typeof b.session==='string'&&/^[a-f0-9]{32}$/.test(b.session)&&online.size<10000){const old=online.get(b.session);const playing=rows.reduce((v,e)=>e.name==='arena_started'?true:['victory','death','abandon'].includes(e.name)?false:v,old?.playing||false);online.set(b.session,{at:t,playing});}
  await mutate(s=>{
   const day=new Date(t).toISOString().slice(0,10),daily=s.metrics.days[day]||(s.metrics.days[day]={});
   for(const e of rows){s.metrics.total[e.name]=(s.metrics.total[e.name]||0)+1;daily[e.name]=(daily[e.name]||0)+1;
    if(e.durationMs&&['victory','death','abandon'].includes(e.name)){s.metrics.total.durationMs=(s.metrics.total.durationMs||0)+e.durationMs;s.metrics.total.durationSamples=(s.metrics.total.durationSamples||0)+1;}
    for(const k of ['champion','arena','skin','croma','set','build','version','alpha','errorCode','step'])if(e[k]){const bucket=s.metrics.dimensions[k]||(s.metrics.dimensions[k]={});const key=k==='step'?e.name+':'+e[k]:e[k];if(Object.hasOwn(bucket,key)||Object.keys(bucket).length<500)bucket[key]=(bucket[key]||0)+1;}
   }
   const days=Object.keys(s.metrics.days).sort();while(days.length>400)delete s.metrics.days[days.shift()];return null;
  });return {ok:true,accepted:rows.length};
 });
 route('GET','/api/gm/dashboard','owner',async()=>{
  const s=await read(),users=await getStore().listUsers(),t=now();for(const [k,v]of online)if(t-v.at>120000)online.delete(k);
  const total=s.metrics.total,utcDay=Date.UTC(new Date(t).getUTCFullYear(),new Date(t).getUTCMonth(),new Date(t).getUTCDate());
  return {accounts:users.length,online:online.size,activeMatchesEstimate:[...online.values()].filter(x=>x.playing).length,
   usersToday:users.filter(u=>u.lastLogin>=utcDay).length,usersWeek:users.filter(u=>u.lastLogin>=t-7*86400000).length,usersMonth:users.filter(u=>u.lastLogin>=t-30*86400000).length,
   matches:total.arena_started||0,victories:total.victory||0,defeats:total.death||0,abandons:total.abandon||0,averageDurationMs:total.durationSamples?Math.round(total.durationMs/total.durationSamples):0,
   tutorialStarted:total.tutorial_started||0,tutorialCompleted:total.tutorial_completed||0,metrics:s.metrics,audit:s.audit.slice(-100),notes:['Online: sesiones con actividad en 120 segundos; partidas activas estimadas, no salas únicas.','Telemetría declarada por cliente: análisis de producto, no autoridad competitiva.','Usuarios: cuentas con último login reciente; no visitantes anónimos únicos.']};
 });
 route('GET','/api/gm/catalog','owner',async()=>gameplay());
 route('GET','/api/gm/cosmetics','owner',async()=>({cosmetics:Object.values(cosmetics())}));
 route('GET','/api/gm/players','owner',async({req})=>{const q=text(new URL(req.url,'http://x').searchParams.get('q'),40).toLowerCase();const users=await getStore().listUsers();return {players:users.filter(u=>!q||u.user.toLowerCase().includes(q)).slice(0,100).map(u=>({user:u.user,name:u.name,createdAt:u.createdAt,lastLogin:u.lastLogin}))};});
 route('POST','/api/gm/gift','owner',async({user,body})=>{
  const cosmetic=Object.hasOwn(cosmetics(),body.cosmetic)?cosmetics()[body.cosmetic]:null;if(!cosmetic)fail('BAD_COSMETIC');
  const users=body.user==='all'?await getStore().listUsers():[await getStore().getUserByKey(String(body.user||'').normalize('NFC').toLowerCase())].filter(Boolean);if(!users.length)fail('NOT_FOUND',404);
  await mutate(s=>{audit(s,user,'gift.start',{cosmetic:cosmetic.id,count:users.length},now());return null;});
  let granted=0,conflicts=0,missingSave=0;for(const target of users){const saved=await getStore().getSave(target.id);if(!saved){missingSave++;continue;}const d=JSON.parse(saved.data);d.cosmeticUnlocks={...d.cosmeticUnlocks,[cosmetic.id]:true};if(cosmetic.type==='croma')d.cromas={...d.cromas,[cosmetic.id]:true};
   const r=await getStore().putSave(target.id,JSON.stringify(d),summarize(d),saved.version,false);if(r.ok)granted++;else conflicts++;
  }
  await mutate(s=>{audit(s,user,'gift.complete',{cosmetic:cosmetic.id,granted,conflicts,missingSave},now());return null;});return {granted,conflicts,missingSave};
 });
 route('POST','/api/gm/reset/preview','owner',async({user,body})=>{
  if(!Array.isArray(body.fields)||!body.fields.length||body.fields.some(f=>!RESET_FIELDS.includes(f)))fail('BAD_FIELDS');
  // Explicit single-player scope avoids accidental mass reset; bulk gift is separate.
  const target=await getStore().getUserByKey(String(body.user||'').normalize('NFC').toLowerCase());if(!target)fail('NOT_FOUND',404);const saved=await getStore().getSave(target.id);if(!saved)fail('NO_SAVE',404);
  const token=crypto.randomBytes(24).toString('hex'),confirmation='REINICIAR '+target.user;
  const preview={token,owner:user.id,target:target.id,user:target.user,version:saved.version,fields:[...new Set(body.fields)],expires:now()+5*60000,confirmation};
  await mutate(s=>{s.previews=s.previews.filter(p=>p.expires>now()).slice(-99);s.previews.push(preview);return null;});return {token,confirmation,fields:preview.fields,accounts:1,version:saved.version,expires:preview.expires,warnings:preview.fields.includes('cosmetics')?['Los Sets completos conservados en inventario o historial de colección permiten volver a obtener su skin. Este reset no borra piezas ni colección.']:[]};
 });
 route('POST','/api/gm/reset/confirm','owner',async({user,body})=>{
  // Consume once before the CAS. Snapshot is durably stored before changing progress.
  const p=await mutate(async (s,writeSnapshot)=>{
   const idx=s.previews.findIndex(p=>p.token===body.token&&p.owner===user.id);if(idx<0)fail('BAD_PREVIEW');const p=s.previews[idx];
   if(p.expires<=now()||body.confirmation!==p.confirmation)fail('BAD_CONFIRMATION');
   const saved=await getStore().getSave(p.target);if(!saved||saved.version!==p.version)fail('CONFLICT',409);
   const bytes=s.snapshots.reduce((n,x)=>n+(x.bytes||0),0);if(bytes+Buffer.byteLength(saved.data)>20*1024*1024)fail('SNAPSHOT_CAPACITY',409);
   const snapshot={id:crypto.randomUUID(),userId:p.target,version:saved.version,at:now(),data:saved.data};await writeSnapshot(snapshot);s.snapshots.push({id:snapshot.id,userId:p.target,version:saved.version,at:now(),bytes:Buffer.byteLength(saved.data)});s.previews.splice(idx,1);audit(s,user,'reset.prepared',{target:p.target,fields:p.fields,snapshot:snapshot.id},now());return {...p,data:JSON.parse(saved.data),snapshot:snapshot.id};
  });
  const d=resetData(p.data,p.fields),r=await getStore().putSave(p.target,JSON.stringify(d),summarize(d),p.version,false);
  await mutate(s=>{audit(s,user,r.ok?'reset.complete':'reset.conflict',{target:p.target,snapshot:p.snapshot},now());return null;});
  if(!r.ok)fail('CONFLICT',409);return {ok:true,version:r.version,snapshot:p.snapshot};
 });
 return result;
}
module.exports={routes,DEFAULTS,EVENTS,RESET_FIELDS,multipliers,resetData,catalog,gameplayCatalog};
