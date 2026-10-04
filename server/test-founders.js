'use strict';
// Founder entitlements, save sanitization, RBAC and admin user routes. Fresh temp dir, never DATABASE_URL.
const assert=require('assert/strict'),http=require('http'),fs=require('fs'),os=require('os'),path=require('path');
const {create,hashPassword}=require('./accounts');
const ent=require('./entitlements');
async function run(){
 const original=process.env.ADMIN_USERS;delete process.env.ADMIN_USERS;
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'horda-founders-'));let checks=0,app,server;
 try{
  // Taxonomy: categories are data, defaults safe for old champions.
  assert.equal(ent.taxonomy().meta('tanque').category,'STANDARD');assert.equal(ent.taxonomy().meta('tanque').releaseState,'RELEASED');
  assert.equal(ent.taxonomy().meta('myla').category,'FAMILY');assert.equal(ent.taxonomy().meta('ynara').category,'FAMILY');
  assert.equal(ent.taxonomy().meta('nano_gm').category,'FOUNDER');assert.equal(ent.taxonomy().meta('facu_gm').category,'FOUNDER');
  assert.equal(ent.taxonomy().meta('nano_gm').purchasable,false);assert.equal(ent.taxonomy().meta('nano_gm').grantable,false);
  assert.equal(ent.taxonomy().requiresGrant('tanque'),false);assert.equal(ent.taxonomy().requiresGrant('myla'),false);assert.equal(ent.taxonomy().requiresGrant('nano_gm'),true);checks+=11;
  // Ascensión: categoría propia, arte aprobado: se compra (9000) o se gana; el cliente decide como con STANDARD.
  assert.equal(ent.taxonomy().meta('aurelia').category,'ASCENSION');assert.equal(ent.taxonomy().meta('aurelia').artPending,false);
  assert.equal(ent.taxonomy().meta('aurelia').purchasable,true);assert.equal(ent.taxonomy().requiresGrant('aurelia'),false);checks+=4;
  // Fixture: 'aurelia' hace de campeón INTERNAL concedible en el resto de esta prueba (concesión y revocación desde el
  // panel), sin depender de si su arte ya se aprobó.
  {const T=ent.taxonomy(),meta0=T.meta,rg0=T.requiresGrant;T.meta=id=>id==='aurelia'?Object.assign(meta0(id),{category:'STANDARD',releaseState:'INTERNAL',artPending:false,grantable:true,purchasable:true}):meta0(id);T.requiresGrant=id=>id==='aurelia'||rg0(id);}

  const seed=create({dataDir:dir,databaseUrl:'',adminUsers:'',log:()=>{}});await seed.ready;
  const nano=await seed.store.createUser({user:'NanoGM',userKey:'nanogm',name:'NanoGM',createdAt:Date.now(),lastLogin:0,passHash:await hashPassword('fixture-password')});
  const facu=await seed.store.createUser({user:'FacuGM',userKey:'facugm',name:'Facu GM',createdAt:Date.now(),lastLogin:0,passHash:await hashPassword('fixture-password')});
  await seed.close();
  // Facu bound by immutable id; Nano by login handle resolved once.
  app=create({dataDir:dir,databaseUrl:'',log:()=>{},originAllowed:()=>true,roles:{},founders:{nano:{account:'NanoGM'},facu:{accountId:facu.id}}});await app.ready;
  server=http.createServer((q,s)=>{if(!app.handle(q,s)){s.writeHead(404);s.end('{}');}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base='http://127.0.0.1:'+server.address().port;
  async function api(method,url,body,token,status=200){const r=await fetch(base+url,{method,headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body)});const j=await r.json();assert.equal(r.status,status,method+' '+url+' '+JSON.stringify(j));checks++;return j;}
  const login=async u=>(await api('POST','/api/login',{user:u,pass:'fixture-password'})).token;
  const nanoT=await login('NanoGM'),facuT=await login('FacuGM');
  const player=(await api('POST','/api/register',{user:'player1',pass:'player-password'},null,201)).token;
  const other=(await api('POST','/api/register',{user:'player2',pass:'player-password'},null,201)).token;

  // Status: founder identity separate from admin permissions.
  let st=await api('GET','/api/gm/status',undefined,nanoT);assert.equal(st.role,'OWNER');assert.deepEqual(st.founder,{key:'nano',champion:'nano_gm'});assert.ok(st.permissions.includes('MANAGE_ROLES'));
  st=await api('GET','/api/gm/status',undefined,facuT);assert.deepEqual(st.founder,{key:'facu',champion:'facu_gm'});assert.deepEqual(st.permissions,[]);assert.equal(st.owner,false);
  st=await api('GET','/api/gm/status',undefined,player);assert.equal(st.founder,null);assert.deepEqual(st.permissions,[]);

  // Manipulated client: "buys" Nano GM / Facu GM / an INTERNAL champion by editing its save.
  const forged={gold:999999,champions:{tanque:{unlocked:true,level:3},nano_gm:{unlocked:true,level:40},facu_gm:{unlocked:true},aurelia:{unlocked:true}}};
  const put=await api('PUT','/api/save',{data:forged,baseVersion:0},player);
  assert.equal(put.enforced.length,3);
  let got=await api('GET','/api/save',undefined,player);
  assert.equal(got.data.champions.nano_gm.unlocked,false);assert.equal(got.data.champions.facu_gm.unlocked,false);assert.equal(got.data.champions.aurelia.unlocked,false);
  assert.equal(got.data.champions.tanque.unlocked,true);assert.equal(got.data.gold,999999); // STANDARD purchases stay client-authoritative (documented risk)
  // Beacon path enforces the same rule.
  const beacon=await api('POST','/api/save-beacon',{token:player,data:{...forged},baseVersion:got.version},null);assert.equal(beacon.enforced.length,3);

  // Founders receive their champion automatically and exclusively, even after a display-name change.
  await api('PUT','/api/save',{data:{champions:{tanque:{unlocked:true}}},baseVersion:0},nanoT);
  got=await api('GET','/api/save',undefined,nanoT);assert.equal(got.data.champions.nano_gm.unlocked,true);assert.equal(got.data.champions.facu_gm?.unlocked||false,false);assert.equal(got.version,1);
  await api('PUT','/api/profile',{name:'Otro nombre'},nanoT);
  got=await api('GET','/api/save',undefined,nanoT);assert.equal(got.data.champions.nano_gm.unlocked,true);
  // Nano cannot hold Facu's founder by editing its own save.
  const nanoForge=await api('PUT','/api/save',{data:{...got.data,champions:{...got.data.champions,facu_gm:{unlocked:true}}},baseVersion:got.version},nanoT);
  assert.deepEqual(nanoForge.enforced,[{id:'facu_gm',unlocked:false}]);
  // Facu without a save still gets it from the first upload.
  const facuPut=await api('PUT','/api/save',{data:{champions:{}},baseVersion:0},facuT);assert.deepEqual(facuPut.enforced,[{id:'facu_gm',unlocked:true}]);
  // Impersonation by display name gives nothing.
  await api('PUT','/api/profile',{name:'Facu GM'},other);assert.equal((await api('GET','/api/gm/status',undefined,other)).founder,null);

  // Normal users cannot reach any admin endpoint.
  const ids=await api('GET','/api/gm/users',undefined,nanoT);assert.ok(ids.total>=4);
  const p1=ids.users.find(u=>u.user==='player1');assert.ok(p1&&p1.summary);
  const founderRow=ids.users.find(u=>u.user==='FacuGM');assert.equal(founderRow.founder.key,'facu');
  for(const [m,u,b] of [['GET','/api/gm/users'],['GET','/api/gm/user?id='+p1.id],['GET','/api/gm/user/save?id='+p1.id],['POST','/api/gm/user/champion',{id:p1.id,champion:'myla',action:'grant'}],
   ['POST','/api/gm/user/currency',{id:p1.id,value:5}],['POST','/api/gm/roles',{id:p1.id,roles:['ADMIN'],confirm:true}],['GET','/api/gm/audit'],['POST','/api/gm/testlab/start',{champion:'nano_gm'}],
   ['POST','/api/admin/level',{user:'player1',champion:'tanque',level:5}],['POST','/api/admin/profile',{user:'player1'}],['GET','/api/gm/dashboard']])await api(m,u,b,player,403);
  // Founder identity alone grants no admin power.
  await api('GET','/api/gm/users',undefined,facuT,403);

  // Sheet + grants.
  let sheet=await api('GET','/api/gm/user?id='+p1.id,undefined,nanoT);
  assert.equal(sheet.gold,999999);assert.equal(sheet.champions.find(c=>c.id==='nano_gm').grantable,false);
  await api('POST','/api/gm/user/champion',{id:p1.id,champion:'nano_gm',action:'grant',baseVersion:sheet.save.version},nanoT,403);
  await api('POST','/api/gm/user/champion',{id:p1.id,champion:'facu_gm',action:'grant',baseVersion:sheet.save.version},nanoT,403);
  await api('POST','/api/gm/user/champion',{id:p1.id,champion:'facu_gm',action:'revoke',confirm:true,baseVersion:sheet.save.version},nanoT,403);
  await api('POST','/api/gm/user/champion',{id:p1.id,champion:'../x',action:'grant',baseVersion:sheet.save.version},nanoT,400);
  await api('POST','/api/gm/user/champion',{id:p1.id,champion:'myla',action:'grant',baseVersion:0},nanoT,409);
  let r=await api('POST','/api/gm/user/champion',{id:p1.id,champion:'myla',action:'grant',reason:'regalo',baseVersion:sheet.save.version},nanoT);
  r=await api('POST','/api/gm/user/champion',{id:p1.id,champion:'aurelia',action:'grant',reason:'tester',baseVersion:r.version},nanoT);
  got=await api('GET','/api/save',undefined,player);assert.equal(got.data.champions.myla.unlocked,true);assert.equal(got.data.champions.aurelia.unlocked,true);
  // Granted unreleased champion survives the client's next upload; revoke needs confirmation.
  await api('PUT','/api/save',{data:got.data,baseVersion:got.version},player);
  await api('POST','/api/gm/user/champion',{id:p1.id,champion:'aurelia',action:'revoke',baseVersion:got.version+1},nanoT,428);
  r=await api('POST','/api/gm/user/champion',{id:p1.id,champion:'aurelia',action:'revoke',confirm:true,reason:'fin test',baseVersion:got.version+1},nanoT);
  got=await api('GET','/api/save',undefined,player);assert.equal(got.data.champions.aurelia.unlocked,false);
  const forged2=await api('PUT','/api/save',{data:{...got.data,champions:{...got.data.champions,aurelia:{unlocked:true}}},baseVersion:got.version},player);assert.deepEqual(forged2.enforced,[{id:'aurelia',unlocked:false}]);

  // Currency: lowering requires confirmation; bounds validated.
  sheet=await api('GET','/api/gm/user?id='+p1.id,undefined,nanoT);
  await api('POST','/api/gm/user/currency',{id:p1.id,value:-1,baseVersion:sheet.save.version},nanoT,400);
  await api('POST','/api/gm/user/currency',{id:p1.id,value:100,baseVersion:sheet.save.version},nanoT,428);
  r=await api('POST','/api/gm/user/currency',{id:p1.id,value:100,confirm:true,reason:'corrección',baseVersion:sheet.save.version},nanoT);assert.equal(r.gold,100);
  r=await api('POST','/api/gm/user/arena',{id:p1.id,arena:'bosque',cleared:true,baseVersion:r.version},nanoT);
  await api('POST','/api/gm/user/arena',{id:p1.id,arena:'nope',cleared:true,baseVersion:r.version},nanoT,400);
  r=await api('POST','/api/gm/user/level',{id:p1.id,champion:'tanque',level:10,baseVersion:r.version},nanoT);
  await api('POST','/api/gm/user/mailbox',{id:p1.id,kind:'item',ref:'not-an-item',baseVersion:r.version},nanoT,400);
  r=await api('POST','/api/gm/user/repair',{id:p1.id,baseVersion:r.version},nanoT);
  sheet=await api('GET','/api/gm/user?id='+p1.id,undefined,nanoT);assert.equal(sheet.arenasCleared.bosque,true);assert.equal(sheet.champions.find(c=>c.id==='tanque').level,10);

  // Roles: owner assigns ADMIN; ADMIN cannot manage roles; owner role immutable.
  const p2=ids.users.find(u=>u.user==='player2');
  await api('POST','/api/gm/roles',{id:p2.id,roles:['ADMIN']},nanoT,428);
  await api('POST','/api/gm/roles',{id:p2.id,roles:['ADMIN'],confirm:true},nanoT);
  await api('GET','/api/gm/users',undefined,other);
  await api('POST','/api/gm/roles',{id:p1.id,roles:['ADMIN'],confirm:true},other,403);
  await api('POST','/api/gm/roles',{id:nano.id,roles:[],confirm:true},nanoT,403);
  await api('POST','/api/gm/roles',{id:p2.id,roles:['OWNER'],confirm:true},nanoT,400);
  // Admin (non-founder) still cannot grant Founders.
  sheet=await api('GET','/api/gm/user?id='+p1.id,undefined,other);
  await api('POST','/api/gm/user/champion',{id:p1.id,champion:'nano_gm',action:'grant',baseVersion:sheet.save.version},other,403);
  await api('POST','/api/gm/roles',{id:p2.id,roles:[],confirm:true},nanoT);
  await api('GET','/api/gm/users',undefined,other,403);

  // Audit: server-side, filterable, read-only.
  const audit=await api('GET','/api/gm/audit?target='+p1.id,undefined,nanoT);
  const actions=audit.entries.map(e=>e.action);
  for(const a of ['champion.grant','champion.revoke','currency.set','arena.unlock','level.set','user.repair'])assert.ok(actions.includes(a),a);
  const g=audit.entries.find(e=>e.action==='currency.set');assert.equal(g.before,999999);assert.equal(g.after,100);assert.equal(g.actor,'NanoGM');
  assert.ok((await api('GET','/api/gm/audit?action=roles',undefined,nanoT)).entries.length>=2);
  await api('POST','/api/gm/audit',{},nanoT,404);
  const founders=await api('GET','/api/gm/founders',undefined,nanoT);assert.deepEqual(founders.founders.map(f=>[f.key,f.bound]).sort(),[['facu',true],['nano',true]]);
  // Test Lab can open any category, including FOUNDER, without ownership.
  assert.equal((await api('POST','/api/gm/testlab/start',{champion:'facu_gm',arena:'bosque'},nanoT)).meta.category,'FOUNDER');

  // Relay presence: public data only.
  const pres=await app.presence(facuT);assert.deepEqual(pres.founder,{key:'facu',champion:'facu_gm'});assert.ok(pres.grantOnly.includes('facu_gm'));assert.equal(pres.id,undefined);assert.equal(pres.email,undefined);
  assert.equal(await app.presence('f'.repeat(64)),null);assert.equal(await app.presence('x'),null);checks+=4;

  // Unbound founder: never guessed, never auto-created.
  const unbound=create({dataDir:dir,databaseUrl:'',log:()=>{},founders:{nano:{account:'NanoGM'},facu:{account:'facu gm'}}});await unbound.ready;
  assert.equal((await unbound.presence(facuT)).founder,null);await unbound.close();checks++;

  // Shipped operator-config: FacuGM is the Facu founder and holds the static ADMIN role (never OWNER).
  const cfg=require('./operator-config.json');assert.equal(cfg.founders.facu.account,'FacuGM');assert.deepEqual(cfg.roles.FacuGM,['ADMIN']);checks+=2;
  const shipped=create({dataDir:dir,databaseUrl:'',log:()=>{},originAllowed:()=>true});await shipped.ready;
  const s2=http.createServer((q,r)=>{if(!shipped.handle(q,r)){r.writeHead(404);r.end('{}');}});await new Promise(r=>s2.listen(0,'127.0.0.1',r));
  const b2='http://127.0.0.1:'+s2.address().port;
  async function api2(method,url,body,token,status=200){const r=await fetch(b2+url,{method,headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body)});const j=await r.json();assert.equal(r.status,status,method+' '+url+' '+JSON.stringify(j));checks++;return j;}
  try{
   const fT=(await api2('POST','/api/login',{user:'FacuGM',pass:'fixture-password'})).token;
   st=await api2('GET','/api/gm/status',undefined,fT);
   assert.deepEqual(st.founder,{key:'facu',champion:'facu_gm'});assert.ok(st.roles.includes('ADMIN'));assert.ok(!st.roles.includes('OWNER'));
   assert.ok(st.permissions.includes('VIEW_USERS'));assert.ok(!st.permissions.includes('MANAGE_ROLES'));assert.equal(st.owner,false);checks+=6;
   assert.equal((await api2('GET','/api/admin/status',undefined,fT)).admin,true);
   await api2('GET','/api/gm/users',undefined,fT);
   await api2('POST','/api/gm/roles',{id:1,roles:['ADMIN']},fT,403);
   // Facu cannot hand FOUNDER champions out either.
   await api2('POST','/api/gm/user/champion',{id:1,champion:'nano_gm',action:'grant',confirm:true},fT,403);
  }finally{await new Promise(r=>s2.close(r));await shipped.close();}

  // Reserved founder/role names: nobody can take them without the server-side signup code.
  const dir2=fs.mkdtempSync(path.join(os.tmpdir(),'horda-founders-signup-'));
  const fresh=create({dataDir:dir2,databaseUrl:'',log:()=>{},originAllowed:()=>true,founderSignupCode:'codigo-secreto-123'});await fresh.ready;
  const s3=http.createServer((q,r)=>{if(!fresh.handle(q,r)){r.writeHead(404);r.end('{}');}});await new Promise(r=>s3.listen(0,'127.0.0.1',r));
  const b3='http://127.0.0.1:'+s3.address().port;
  async function api3(method,url,body,token,status=200){const r=await fetch(b3+url,{method,headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body)});const j=await r.json();assert.equal(r.status,status,method+' '+url+' '+JSON.stringify(j));checks++;return j;}
  try{
   await api3('POST','/api/register',{user:'facugm',pass:'player-password'},null,403);
   await api3('POST','/api/register',{user:'FacuGM',pass:'player-password',signupCode:'incorrecto'},null,403);
   const reg=await api3('POST','/api/register',{user:'FacuGM',pass:'player-password',signupCode:'codigo-secreto-123'},null,201);
   // Bound immediately (no restart needed): founder champion + ADMIN.
   st=await api3('GET','/api/gm/status',undefined,reg.token);assert.deepEqual(st.founder,{key:'facu',champion:'facu_gm'});assert.ok(st.roles.includes('ADMIN'));checks+=2;
  }finally{await new Promise(r=>s3.close(r));await fresh.close();fs.rmSync(dir2,{recursive:true,force:true});}
  console.log('PASS founders + admin RBAC: '+checks+' checks');
 }finally{
  if(original===undefined)delete process.env.ADMIN_USERS;else process.env.ADMIN_USERS=original;
  if(server)await new Promise(r=>server.close(r));if(app)await app.close();fs.rmSync(dir,{recursive:true,force:true});
 }
}
run().catch(e=>{console.error(e);process.exitCode=1;});
