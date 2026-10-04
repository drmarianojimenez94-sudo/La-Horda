'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {create,verifyPassword}=require('./accounts'),{recoverOwner}=require('./recover-owner');
(async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'horda-recovery-'));
 try{
  const opts={dataDir:dir,databaseUrl:'',adminUsers:'NanoGM'};
  await assert.rejects(recoverOwner('short',opts));
  await assert.rejects(recoverOwner('secure-new-password',{...opts,adminUsers:''}));
  assert.equal((await recoverOwner('secure-new-password',opts)).created,true);
  let app=create({...opts,log:()=>{}});await app.ready;
  const u=await app.store.getUserByKey('nanogm'),id=u.id;
  assert(await verifyPassword('secure-new-password',u.passHash));
  await app.store.putSave(id,JSON.stringify({gold:77}),{gold:77},0,false);
  await app.store.createSession({tokenHash:'a'.repeat(64),userId:id,createdAt:Date.now(),expiresAt:Date.now()+99999});
  await app.close();
  assert.equal((await recoverOwner('another-secure-password',opts)).created,false);
  app=create({...opts,log:()=>{}});await app.ready;
  const after=await app.store.getUserByKey('nanogm');
  assert.equal(after.id,id);assert(await verifyPassword('another-secure-password',after.passHash));
  assert.equal(await app.store.getSession('a'.repeat(64)),null);
  assert.equal(JSON.parse((await app.store.getSave(id)).data).gold,77);
  await app.close();console.log('PASS operator recovery: reserved account provisioning, same ID/save, password rotation, session revocation, fail-closed overrides');
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1});
