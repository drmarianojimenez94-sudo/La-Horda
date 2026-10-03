"use strict";
// Operational state is separate from player saves. File writes are atomic; PostgreSQL
// serializes mutations with a row lock. No payment or privileged client-side flag.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const rbac = require('./rbac');
const BOSS_ARENAS=Object.freeze({guardian_ancestral:'bosque',mago_hielo_cristal:'hielo',minotauro:'laberinto',leviatan:'acuatica',caballero:'fortaleza',madre_espora:'micelial',cm_presentador:'ciudad',ab_morador:'abismo',mn_cerbero:'minas'});
const PRICE_KEYS=['itemPrices','cosmeticPrices','championPrices'];
let SHOP_CATALOG;
function shopCatalog(){return SHOP_CATALOG||(SHOP_CATALOG=JSON.parse(fs.readFileSync(path.join(__dirname,'../docs/production/shop-catalog.json'),'utf8')));}
const DEFAULTS = Object.freeze({itemPrices:Object.freeze({}),cosmeticPrices:Object.freeze({}),championPrices:Object.freeze({}),xp:1,gold:1,drop:1,difficulty:1,enemyHp:1,enemyDamage:1,bossHp:1,eliteRate:1,spawnRate:1});
const EVENTS = new Set(['start','login','menu','tutorial_started','tutorial_completed','arena_started','death','abandon','victory','next_arena','ability','talent','equipment','set','drop','codex','skin','croma','multiplayer','error','heartbeat','level_up','pickup','tutorial_step','tutorial_step_complete','tutorial_abandoned','tutorial_skipped']);
const RESET_FIELDS = ['championProgress','arenas','gold','inventory','cosmetics','codex'];
const clone = x=>JSON.parse(JSON.stringify(x));
function fail(code, status=400){const e=new Error(code);e.status=status;throw e;}
function text(s,n=250){if(typeof s!=='string')return '';return s.normalize('NFC').replace(/[<>\u0000-\u001f\u007f]/g,'').trim().slice(0,n);}
function id(s){return typeof s==='string'&&!['__proto__','constructor','prototype'].includes(s)&&/^[a-zA-Z0-9_-]{1,64}$/.test(s)?s:'';}
function ids(v){if(v===undefined)return [];if(!Array.isArray(v)||v.length>20||v.some(x=>!id(x)))fail('BAD_IDS');return [...new Set(v)];}
function initial(){return {version:0,config:{...DEFAULTS},events:[],messages:[],chat:[],pinned:null,audit:[],snapshots:[],previews:[],metrics:{total:{},days:{},dimensions:{}}};}
function stateOf(s){s=s||initial();s.eventRuns=s.eventRuns||{};s.eventClaims=s.eventClaims||{};s.eventParticipants=s.eventParticipants||{};s.resetBatches=s.resetBatches||{};return s;}
// owner = acting account id (field name kept for existing log rows); actor = its login handle.
function audit(s,owner,action,details,now){s.audit.push({at:now,owner:owner.id,actor:owner.user,action,...details});s.audit=s.audit.slice(-5000);}
function multipliers(v,partial=false){
 if(!v||typeof v!=='object'||Array.isArray(v))fail('BAD_CONFIG');
 const out=partial?{}:{...DEFAULTS};
 for(const [k,n] of Object.entries(v)){
  if(PRICE_KEYS.includes(k)){
   if(partial||!n||typeof n!=='object'||Array.isArray(n)||Object.keys(n).length>500)fail('BAD_PRICE_CONFIG');
   out[k]={};for(const [key,price] of Object.entries(n)){if(!shopCatalog()[k].includes(key)||!Number.isSafeInteger(price)||price<0||price>10000000)fail('BAD_PRICE_CONFIG');out[k][key]=price;}continue;
  }
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
 for(const f of ['croma-skins-meta.js','set-skins-meta.js','portadores-meta.js','ynara-meta.js','complete-set-skins-meta.js','alpha-set-skins-meta.js']){
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
 const game=vm.runInContext('({arenas:Object.keys(ARENA_MODS),enemies:Object.keys(ENEMY_BASE).filter(k=>["normal","elite"].includes(ENEMY_BASE[k].rank)&&!ENEMY_BASE[k].structure),bosses:Object.keys(ENEMY_BASE).filter(k=>ENEMY_BASE[k].rank==="jefe"||ENEMY_BASE[k].rank==="subjefe")})',c);
 game.bossArenaMap={...BOSS_ARENAS};game.bosses=Object.keys(BOSS_ARENAS);game.sets=[...shopCatalog().sets];game.priceCatalog=Object.fromEntries(PRICE_KEYS.map(k=>[k,[...shopCatalog()[k]]]));return game;
}
function routes(ctx){
 const {getStore,auth,send,err,readBody,summarize,now,isOwner}=ctx;
 let gameCatalog;const gameplay=()=>gameCatalog||(gameCatalog=gameplayCatalog());
 let cosmeticCatalog;const cosmetics=()=>cosmeticCatalog||(cosmeticCatalog=catalog());
 const online=new Map(),rate=new Map();
 function throttle(key,max,window=60000){const t=now();for(const [k,r] of rate)if(r.until<=t)rate.delete(k);let r=rate.get(key);if(!r){r={n:0,until:t+window};rate.set(key,r);}if(++r.n>max)fail('RATE_LIMIT',429);}
 async function mutate(fn){return getStore().gmUpdate(async (raw,writeSnapshot)=>{const s=stateOf(raw);const value=await fn(s,writeSnapshot);return {state:s,value};});}
 async function read(){return stateOf(await getStore().gmRead());}
 const result={};
 function route(method,url,role,fn){result[method+' '+url]=async(req,res,ip)=>{
  try{
   let user=null;if(role){const a=await auth(req);if(!a.user)fail('NO_SESSION',401);user=a.user;
    // Permission names come from server/rbac.js; checked on every request against server state.
    if(role==='owner'&&!isOwner(user))fail('FORBIDDEN',403);
    if(rbac.PERMISSIONS.includes(role)&&!rbac.can(user,await read(),isOwner,role))fail('FORBIDDEN',403);}
   const body=method==='GET'?{}:await readBody(req,32768);
   const value=await fn({req,user,body,ip});send(req,res,200,value);
  }catch(e){if(e.status)return err(req,res,e.status,e.message,e.message);throw e;}
 };}
 route('GET','/api/gm/status','user',async({user})=>{
  const base=typeof ctx.ownerAccess==='function'?ctx.ownerAccess(user):({owner:isOwner(user),role:isOwner(user)?'OWNER':null});
  const roles=rbac.rolesOf(user,await read(),isOwner),founder=ctx.founderOf?ctx.founderOf(user):null;
  return {...base,role:base.role||roles[0]||null,roles,permissions:rbac.permissionsOf(roles),founder};
 });
 route('GET','/api/world',null,async()=>{const s=await read(),t=now();return {version:s.version,normalConfig:s.config,config:{...s.config},events:s.events.filter(e=>active(e,t)),messages:s.messages.filter(e=>active(e,t)),serverTime:t};});
 route('GET','/api/gm/config','MANAGE_CONFIG',async()=>{const s=await read();return {version:s.version,config:s.config,defaults:DEFAULTS};});
 for(const [method,url,defaults] of [['PUT','/api/gm/config',false],['POST','/api/gm/config/defaults',true]])route(method,url,'MANAGE_CONFIG',async({user,body})=>{
  const config=defaults?{...DEFAULTS}:multipliers(body.config);
  return mutate(s=>{if(body.version!==s.version)fail('CONFLICT',409);s.config=config;s.version++;audit(s,user,defaults?'config.defaults':'config.update',{},now());return {version:s.version,config:s.config};});
 });
 route('GET','/api/gm/events','MANAGE_EVENTS',async()=>({events:(await read()).events}));
 route('POST','/api/gm/events','MANAGE_EVENTS',async({user,body:b})=>{
  if(!text(b.name,80))fail('BAD_NAME');
  if(b.enabled!==undefined&&typeof b.enabled!=='boolean')fail('BAD_ENABLED');
  const entry={id:b.id?id(b.id):crypto.randomUUID(),name:text(b.name,80),description:text(b.description,1000),...schedule(b,now()),enabled:b.enabled!==false,
   arenas:ids(b.arenas),wave:b.wave??1,boss:id(b.boss),enemies:ids(b.enemies),
   multipliers:multipliers(b.multipliers||{},true),set:id(b.set),cosmetic:id(b.cosmetic),announcement:text(b.announcement,400),banner:image(b.banner)};
  if(!entry.id||!Number.isInteger(entry.wave)||entry.wave<1||entry.wave>10)fail('BAD_EVENT');
  if(entry.cosmetic&&!cosmetics()[entry.cosmetic])fail('BAD_COSMETIC');
  const game=gameplay();if(entry.arenas.some(x=>!game.arenas.includes(x))||entry.enemies.some(x=>!game.enemies.includes(x))||(entry.boss&&!game.bosses.includes(entry.boss)))fail('BAD_GAMEPLAY_ID');
  if(entry.set&&!game.sets.includes(entry.set))fail('BAD_SET');
  if(entry.boss&&(entry.arenas.length!==1||entry.arenas[0]!==game.bossArenaMap[entry.boss]||entry.wave!==10))fail('BOSS_ARENA_MISMATCH');
  for(const field of ['boss','set','cosmetic'])if(b[field]&&!id(b[field]))fail('BAD_EVENT');
  return mutate(s=>{const old=s.events.findIndex(e=>e.id===entry.id);if(old<0&&s.events.length>=100)fail('EVENT_LIMIT');if(old>=0)s.events[old]=entry;else s.events.push(entry);s.version++;audit(s,user,'event.save',{id:entry.id},now());return {event:entry,version:s.version};});
 });
 route('GET','/api/gm/messages','MANAGE_EVENTS',async()=>({messages:(await read()).messages}));
 route('POST','/api/gm/messages','MANAGE_EVENTS',async({user,body:b})=>{
  if(!['news','banner','global'].includes(b.type)||!text(b.text,1000))fail('BAD_MESSAGE');
  if(b.enabled!==undefined&&typeof b.enabled!=='boolean')fail('BAD_ENABLED');
  const entry={id:b.id?id(b.id):crypto.randomUUID(),type:b.type,text:text(b.text,1000),image:image(b.image),...schedule(b,now()),enabled:b.enabled!==false};if(!entry.id)fail('BAD_ID');
  return mutate(s=>{const n=s.messages.findIndex(x=>x.id===entry.id);if(n<0&&s.messages.length>=100)fail('MESSAGE_LIMIT');if(n>=0)s.messages[n]=entry;else s.messages.push(entry);audit(s,user,'message.save',{id:entry.id},now());return {message:entry};});
 });
 route('GET','/api/chat','user',async()=>{const s=await read();return {messages:s.chat.slice(-80),pinned:s.chat.find(m=>m.id===s.pinned)||null};});
 route('POST','/api/chat','user',async({user,body})=>{
  throttle('chat:'+user.id,8,10000);if(typeof body.text!=='string'||body.text.length>500||!text(body.text,400))fail('BAD_MESSAGE');
  const message={id:crypto.randomUUID(),name:text(user.name||user.user,32),text:text(body.text,400),owner:isOwner(user),at:now()};
  return mutate(s=>{s.chat.push(message);s.chat=s.chat.slice(-200);return {message};});
 });
 route('POST','/api/gm/chat/pin','MANAGE_EVENTS',async({user,body})=>mutate(s=>{if(body.id!==null&&!s.chat.some(m=>m.id===body.id))fail('NOT_FOUND',404);s.pinned=body.id;audit(s,user,'chat.pin',{id:body.id},now());return {ok:true};}));
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
 route('GET','/api/gm/dashboard','VIEW_USERS',async()=>{
  const s=await read(),users=await getStore().listUsers(),t=now();for(const [k,v]of online)if(t-v.at>120000)online.delete(k);
  const total=s.metrics.total,utcDay=Date.UTC(new Date(t).getUTCFullYear(),new Date(t).getUTCMonth(),new Date(t).getUTCDate());
  return {accounts:users.length,online:online.size,activeMatchesEstimate:[...online.values()].filter(x=>x.playing).length,
   usersToday:users.filter(u=>u.lastLogin>=utcDay).length,usersWeek:users.filter(u=>u.lastLogin>=t-7*86400000).length,usersMonth:users.filter(u=>u.lastLogin>=t-30*86400000).length,
   matches:total.arena_started||0,victories:total.victory||0,defeats:total.death||0,abandons:total.abandon||0,averageDurationMs:total.durationSamples?Math.round(total.durationMs/total.durationSamples):0,
   tutorialStarted:total.tutorial_started||0,tutorialCompleted:total.tutorial_completed||0,metrics:s.metrics,audit:s.audit.slice(-100),notes:['Online: sesiones con actividad en 120 segundos; partidas activas estimadas, no salas únicas.','Telemetría declarada por cliente: análisis de producto, no autoridad competitiva.','Usuarios: cuentas con último login reciente; no visitantes anónimos únicos.']};
 });
 route('GET','/api/gm/catalog','VIEW_USERS',async()=>gameplay());
 route('GET','/api/gm/cosmetics','VIEW_USERS',async()=>({cosmetics:Object.values(cosmetics())}));
 route('GET','/api/gm/players','VIEW_USERS',async({req})=>{const q=text(new URL(req.url,'http://x').searchParams.get('q'),40).toLowerCase();const users=await getStore().listUsers();return {players:users.filter(u=>!q||u.user.toLowerCase().includes(q)).slice(0,100).map(u=>({user:u.user,name:u.name,createdAt:u.createdAt,lastLogin:u.lastLogin}))};});
 route('POST','/api/gm/gift','GRANT_CONTENT',async({user,body})=>{
  const cosmetic=Object.hasOwn(cosmetics(),body.cosmetic)?cosmetics()[body.cosmetic]:null;if(!cosmetic)fail('BAD_COSMETIC');
  const users=await selectTargets(body);if(!users.length)fail('NOT_FOUND',404);
  await mutate(s=>{audit(s,user,'gift.start',{cosmetic:cosmetic.id,count:users.length},now());return null;});
  let granted=0,conflicts=0,missingSave=0;for(const target of users){const saved=await getStore().getSave(target.id);if(!saved){missingSave++;continue;}const d=JSON.parse(saved.data);d.cosmeticUnlocks={...d.cosmeticUnlocks,[cosmetic.id]:true};if(cosmetic.type==='croma')d.cromas={...d.cromas,[cosmetic.id]:true};
   const r=await getStore().putSave(target.id,JSON.stringify(d),summarize(d),saved.version,false);if(r.ok)granted++;else conflicts++;
  }
  await mutate(s=>{audit(s,user,'gift.complete',{cosmetic:cosmetic.id,granted,conflicts,missingSave},now());return null;});return {granted,conflicts,missingSave};
 });
 async function selectTargets(body){
  if(body.user==='all')return getStore().listUsers();
  if(body.cohort){
   const users=await getStore().listUsers();
   if(body.cohort.eventId){const participants=(await read()).eventParticipants[body.cohort.eventId];if(!participants)fail('NO_PARTICIPANTS',404);return users.filter(u=>participants.includes(u.id));}
   if(Number.isSafeInteger(body.cohort.createdBefore)&&body.cohort.createdBefore>0&&body.cohort.createdBefore<=now())return users.filter(u=>u.createdAt<=body.cohort.createdBefore);
   fail('BAD_COHORT');
  }
  const names=body.users===undefined?[body.user]:body.users;
  if(!Array.isArray(names)||!names.length||names.length>100||names.some(n=>typeof n!=='string'||!n.trim()))fail('BAD_TARGETS');
  const unique=[...new Set(names.map(n=>n.normalize('NFC').toLowerCase()))],out=[];
  for(const name of unique){const target=await getStore().getUserByKey(name);if(!target)fail('NOT_FOUND',404);out.push(target);}return out;
 }
 route('POST','/api/gm/reset/preview','EDIT_USER_PROGRESS',async({user,body})=>{
  if(!Array.isArray(body.fields)||!body.fields.length||body.fields.some(f=>!RESET_FIELDS.includes(f)))fail('BAD_FIELDS');
  const targets=await selectTargets(body);if(targets.length>100)fail('BATCH_LIMIT',413);
  const players=[];let missingSave=0;
  for(const target of targets){const saved=await getStore().getSave(target.id);if(!saved){missingSave++;continue;}players.push({target:target.id,user:target.user,version:saved.version});}
  if(!players.length)fail('NO_SAVE',404);
  const single=body.user!=='all'&&!body.users&&!body.cohort&&players.length===1;
  const token=crypto.randomBytes(24).toString('hex'),confirmation=single?'REINICIAR '+players[0].user:'REINICIAR '+players.length+' CUENTAS';
  const preview={token,owner:user.id,players,fields:[...new Set(body.fields)],expires:now()+5*60000,confirmation,single};
  await mutate(s=>{s.previews=s.previews.filter(p=>p.expires>now()).slice(-99);s.previews.push(preview);return null;});
  return {token,confirmation,fields:preview.fields,accounts:players.length,missingSave,players:players.map(p=>({user:p.user,version:p.version})),version:single?players[0].version:undefined,expires:preview.expires,warnings:[...(preview.fields.includes('cosmetics')?['Los Sets completos conservados en inventario o historial de colección permiten volver a obtener su skin. Este reset no borra piezas ni colección.']:[]),...(!single?['Cada cuenta usa CAS y snapshot. Si una escritura falla, se informa resultado parcial por cuenta; no se reintenta a ciegas.']:[])]};
 });
 route('POST','/api/gm/reset/confirm','EDIT_USER_PROGRESS',async({user,body})=>{
  const prepared=await mutate(async (s,writeSnapshot)=>{
   const idx=s.previews.findIndex(p=>p.token===body.token&&p.owner===user.id);if(idx<0)fail('BAD_PREVIEW');const preview=s.previews[idx];
   if(preview.expires<=now()||body.confirmation!==preview.confirmation)fail('BAD_CONFIRMATION');
   const players=preview.players||[{target:preview.target,user:preview.user,version:preview.version}],loaded=[];
   // Preflight every frozen version before any destructive operation; stale batch changes nothing.
   for(const p of players){const saved=await getStore().getSave(p.target);if(!saved||saved.version!==p.version)fail('CONFLICT',409);loaded.push({...p,data:saved.data});}
   const bytes=s.snapshots.reduce((n,x)=>n+(x.bytes||0),0)+loaded.reduce((n,x)=>n+Buffer.byteLength(x.data),0);if(bytes>20*1024*1024)fail('SNAPSHOT_CAPACITY',409);
   for(const p of loaded){const snapshot={id:crypto.randomUUID(),userId:p.target,version:p.version,at:now(),data:p.data};await writeSnapshot(snapshot);p.snapshot=snapshot.id;s.snapshots.push({id:snapshot.id,userId:p.target,version:p.version,at:now(),bytes:Buffer.byteLength(p.data)});}
   const batchId=crypto.randomUUID();s.resetBatches[batchId]={id:batchId,owner:user.id,at:now(),fields:preview.fields,results:loaded.map(p=>({user:p.user,target:p.target,status:'prepared',snapshot:p.snapshot,baseVersion:p.version}))};
   s.previews.splice(idx,1);audit(s,user,'reset.prepared',{batchId,count:loaded.length,fields:preview.fields},now());return {batchId,loaded,fields:preview.fields,single:preview.single!==false&&loaded.length===1};
  });
  const results=[];
  for(const p of prepared.loaded){
   let row;
   try{const data=resetData(JSON.parse(p.data),prepared.fields),put=await getStore().putSave(p.target,JSON.stringify(data),summarize(data),p.version,false);row={user:p.user,target:p.target,status:put.ok?'completed':'conflict',version:put.version||null,snapshot:p.snapshot};}
   catch{row={user:p.user,target:p.target,status:'failed',version:null,snapshot:p.snapshot};}
   results.push(row);
   await mutate(s=>{const batch=s.resetBatches[prepared.batchId];const i=batch.results.findIndex(r=>r.target===p.target);batch.results[i]=row;return null;});
  }
  const completed=results.filter(r=>r.status==='completed').length,conflicts=results.filter(r=>r.status==='conflict').length;
  await mutate(s=>{s.resetBatches[prepared.batchId].finishedAt=now();audit(s,user,'reset.complete',{batchId:prepared.batchId,completed,conflicts,failed:results.length-completed-conflicts},now());return null;});
  if(prepared.single&&results[0].status==='conflict')fail('CONFLICT',409);
  return {ok:completed===results.length,batchId:prepared.batchId,completed,conflicts,results:results.map(({target,...r})=>r),...(prepared.single?{version:results[0].version,snapshot:results[0].snapshot}:{})};
 });
 route('GET','/api/gm/reset/batches','EDIT_USER_PROGRESS',async({user})=>({batches:Object.values((await read()).resetBatches).filter(b=>b.owner===user.id).slice(-50).map(b=>({...b,results:b.results.map(({target,...r})=>r)}))}));
 route('POST','/api/events/start','user',async({user,body})=>{
  throttle('event-start:'+user.id,12);
  if(!id(body.eventId)||!gameplay().arenas.includes(body.arena))fail('BAD_EVENT');
  return mutate(s=>{
   const event=s.events.find(e=>e.id===body.eventId);if(!event||!active(event,now()))fail('EVENT_INACTIVE',409);
   if(event.arenas.length&&!event.arenas.includes(body.arena))fail('BAD_ARENA');
   // Tickets bind the accepted event revision. Editing an event never changes an in-flight reward.
   const ticket=crypto.randomBytes(24).toString('hex'),started=now(),minDurationMs=Math.max(15000,event.wave*5000);
   for(const [key,run] of Object.entries(s.eventRuns))if(run.expires<started)delete s.eventRuns[key];
   if(Object.keys(s.eventRuns).length>=5000)fail('RUN_CAPACITY',429);
   const previousRuns=Object.entries(s.eventRuns).filter(([,run])=>run.userId===user.id&&run.event.id===event.id&&!run.completed).sort((a,b)=>b[1].started-a[1].started);
   for(const [key] of previousRuns.slice(2))delete s.eventRuns[key]; // keep last three tickets including this start for delayed completion retries
   s.eventRuns[ticket]={userId:user.id,event:clone(event),arena:body.arena,started,minDurationMs,expires:Math.min(started+6*3600000,event.end+3600000),completed:false};
   const participants=s.eventParticipants[event.id]||(s.eventParticipants[event.id]=[]);if(!participants.includes(user.id))participants.push(user.id);
   return {ticket,event:clone(event),minDurationMs,expires:s.eventRuns[ticket].expires,alreadyCompleted:!!s.eventClaims[event.id+':'+user.id]};
  });
 });
 route('POST','/api/events/complete','user',async({user,body})=>{
  throttle('event-complete:'+user.id,30);
  if(typeof body.ticket!=='string'||! /^[a-f0-9]{48}$/.test(body.ticket))fail('BAD_TICKET');
  return mutate(async s=>{
   const run=s.eventRuns[body.ticket];if(!run||run.userId!==user.id)fail('BAD_TICKET',404);
   const claimKey=run.event.id+':'+user.id,previous=s.eventClaims[claimKey];
   if(previous?.completed)return {ok:true,alreadyGranted:true,granted:false,cosmetic:previous.cosmetic,cosmeticType:cosmetics()[previous.cosmetic]?.type||null,baseVersion:previous.baseVersion??null,saveVersion:previous.saveVersion??null};
   if(run.expires<now()||now()-run.started<run.minDurationMs)fail('INVALID_RUN_DURATION',409);
   if(body.outcome!=='victory'||!Number.isInteger(body.wave)||body.wave<run.event.wave||body.wave>10)fail('OBJECTIVE_INCOMPLETE',422);
   const bossMatches=body.bossDefeated===run.event.boss||(run.event.boss==='mago_hielo_cristal'&&body.bossDefeated==='angel_caido_hielo');
   if(run.event.boss&&!bossMatches)fail('BOSS_INCOMPLETE',422);
   const cosmeticId=previous?.cosmetic||run.event.cosmetic||'';let saveVersion=null,baseVersion=null,cosmeticType=null;
   if(cosmeticId){
    const cosmetic=cosmetics()[cosmeticId];if(!cosmetic)fail('CATALOG_CHANGED',409);cosmeticType=cosmetic.type;
    const saved=await getStore().getSave(user.id);if(!saved)fail('NO_SAVE',409);
    baseVersion=saved.version;const data=JSON.parse(saved.data);data.cosmeticUnlocks={...data.cosmeticUnlocks,[cosmetic.id]:true};if(cosmetic.type==='croma')data.cromas={...data.cromas,[cosmetic.id]:true};
    const put=await getStore().putSave(user.id,JSON.stringify(data),summarize(data),saved.version,false);if(!put.ok)fail('CONFLICT',409);saveVersion=put.version;
   }
   // Boolean ownership is itself idempotent if process failure occurs between save and receipt.
   s.eventClaims[claimKey]={userId:user.id,eventId:run.event.id,cosmetic:cosmeticId,baseVersion,saveVersion,completed:true,completedAt:now()};run.completed=true;
   return {ok:true,granted:!!cosmeticId,alreadyGranted:false,cosmetic:cosmeticId,cosmeticType,saveVersion,baseVersion};
  });
 });
 require('./admin-users').routes({route,mutate,read,audit,fail,text,getStore,summarize,now,isOwner,founders:ctx.founders||(()=>({})),cosmetics,gameplay,shopCatalog});
 return result;
}
module.exports={routes,DEFAULTS,EVENTS,RESET_FIELDS,multipliers,resetData,catalog,gameplayCatalog,stateOf,audit};
