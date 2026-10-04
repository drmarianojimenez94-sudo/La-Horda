'use strict';
const assert=require('assert/strict'),http=require('http'),fs=require('fs'),os=require('os'),path=require('path');
const {create,hashPassword}=require('./accounts');
async function run(){
 const dirs=[],apps=[],servers=[];let checks=0;
 async function start(dir,options={}){
  const app=create({dataDir:dir,databaseUrl:'',log:()=>{},originAllowed:()=>true,...options});apps.push(app);await app.ready;
  const server=http.createServer((req,res)=>{if(!app.handle(req,res)){res.writeHead(404);res.end('{}');}});servers.push(server);await new Promise(r=>server.listen(0,'127.0.0.1',r));
  return {app,async api(method,url,body,token,status=200){const r=await fetch('http://127.0.0.1:'+server.address().port+url,{method,headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body)});const data=await r.json();assert.equal(r.status,status,url+JSON.stringify(data));checks++;return data;}};
 }
 const original=process.env.ADMIN_USERS;delete process.env.ADMIN_USERS;
 try{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'horda-owner-'));dirs.push(dir);
  const seed=create({dataDir:dir,databaseUrl:'',adminUsers:'',log:()=>{}});await seed.ready;
  const nano=await seed.store.createUser({user:'NanoGM',userKey:'nanogm',name:'NanoGM',createdAt:Date.now(),lastLogin:0,passHash:await hashPassword('fixture-password')});await seed.close();
  const a=await start(dir);
  const token=(await a.api('POST','/api/login',{user:'NanoGM',pass:'fixture-password'})).token;
  assert.equal((await a.api('GET','/api/gm/status',undefined,token)).role,'OWNER');
  assert.equal((await a.api('GET','/api/admin/status',undefined,token)).admin,true);
  await a.api('GET','/api/gm/dashboard',undefined,token);
  await a.api('GET','/server/operator-config.json',undefined,null,404);
  a.app.store.persistent=true;assert.match(a.app.healthLine(),/ARCHIVO EN DISCO PERSISTENTE/);assert.doesNotMatch(a.app.healthLine(),/Postgres/);
  // Binding uses the original ID, not a mutable display name.
  await a.app.store.updateUser(nano.id,{name:'Another display name'});assert.equal((await a.api('GET','/api/gm/status',undefined,token)).owner,true);
  const other=(await a.api('POST','/api/register',{user:'other',pass:'other-password'},null,201)).token;
  await a.api('PUT','/api/profile',{name:'NanoGM'},other);
  assert.equal((await a.api('GET','/api/gm/status',undefined,other)).owner,false);
  const empty=fs.mkdtempSync(path.join(os.tmpdir(),'horda-owner-empty-'));dirs.push(empty);const b=await start(empty);
  await b.api('POST','/api/register',{user:'NanoGM',pass:'attacker-password'},null,403);
  await b.api('POST','/api/register',{user:'nanogm',pass:'attacker-password'},null,403);
  const guest=(await b.api('POST','/api/register',{user:'ordinary',pass:'ordinary-password'},null,201)).token;
  await b.api('GET','/api/gm/dashboard',undefined,guest,403);
  const explicit=await start(empty,{adminUsers:'ordinary'});assert.equal((await explicit.api('GET','/api/gm/status',undefined,guest)).owner,true);
  const disabled=await start(empty,{adminUsers:''});assert.equal((await disabled.api('GET','/api/gm/status',undefined,guest)).owner,false);
  const excluded=await start(dir,{adminUsers:''});
  const excludedToken=(await excluded.api('POST','/api/login',{user:'NanoGM',pass:'fixture-password'})).token;
  assert.equal((await excluded.api('GET','/api/gm/status',undefined,excludedToken)).reason,'OWNER_EXCLUDED');
  await excluded.api('GET','/api/gm/dashboard',undefined,excludedToken,403);
  await b.app.store.createUser({user:'NanoGM',userKey:'nanogm',name:'NanoGM',createdAt:Date.now(),passHash:await hashPassword('fixture-password')});
  const lateToken=(await b.api('POST','/api/login',{user:'NanoGM',pass:'fixture-password'})).token;
  assert.equal((await b.api('GET','/api/gm/status',undefined,lateToken)).reason,'OWNER_NOT_BOUND');
  await b.api('GET','/api/gm/dashboard',undefined,lateToken,403);
  console.log('PASS owner policy: '+checks+' HTTP checks + immutable ID / fail-closed / health assertions');
 }finally{
  if(original===undefined)delete process.env.ADMIN_USERS;else process.env.ADMIN_USERS=original;
  for(const server of servers)await new Promise(r=>server.close(r));for(const app of apps)await app.close();for(const dir of dirs)fs.rmSync(dir,{recursive:true,force:true});
 }
}
run().catch(e=>{console.error(e);process.exitCode=1;});
