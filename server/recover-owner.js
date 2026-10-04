'use strict';
// Operator-only CLI. Never exposed through HTTP; needs the production database/volume.
const {create,hashPassword}=require('./accounts');
const {ownerAccount}=require('./operator-config.json');
async function recoverOwner(password, options={}){
 if(typeof password!=='string'||password.length<12||password.length>128||password.toLowerCase()===ownerAccount.toLowerCase())throw Error('La contraseña nueva debe tener entre 12 y 128 caracteres.');
 const databaseUrl=options.databaseUrl ?? process.env.DATABASE_URL;
 const dataDir=options.dataDir ?? process.env.DATA_DIR;
 if(!databaseUrl&&!dataDir)throw Error('Usá DATABASE_URL de producción o DATA_DIR del volumen persistente. No se crea una base local accidental.');
 const admins=options.adminUsers ?? process.env.ADMIN_USERS;
 if(admins!==undefined&&!String(admins).split(',').some(x=>x.trim().toLowerCase()===ownerAccount.toLowerCase()))throw Error('ADMIN_USERS excluye a NanoGM. Quitá ese override o incluí NanoGM antes de recuperar.');
 const app=create({databaseUrl:databaseUrl||'',dataDir,adminUsers:'',log:()=>{}});
 try{
  await app.ready;
  if(app.info().status!=='ready')throw Error('La base no está disponible.');
  const key=ownerAccount.toLowerCase();
  let user=await app.store.getUserByKey(key);
  const created=!user, passHash=await hashPassword(password);
  if(user)await app.store.updateUser(user.id,{passHash});
  else user=await app.store.createUser({user:ownerAccount,userKey:key,name:ownerAccount,email:null,passHash,createdAt:Date.now(),lastLogin:0});
  await app.store.deleteUserSessions(user.id);
  return {created,user:ownerAccount};
 }finally{await app.close();}
}
if(require.main===module){
 (async()=>{
  if(process.stdin.isTTY)throw Error('Pasá la contraseña por stdin, nunca como argumento ni dentro del repositorio.');
  let raw='';for await(const chunk of process.stdin){raw+=chunk;if(raw.length>256)throw Error('Entrada demasiado larga.');}
  const result=await recoverOwner(raw.replace(/\r?\n$/,''));
  console.log(`Cuenta ${result.user} ${result.created?'creada':'recuperada'}. Sesiones anteriores revocadas. Reiniciá el relay y entrá con la nueva contraseña.`);
 })().catch(()=>{console.error('No se pudo recuperar la cuenta. Revisá la configuración de producción, ADMIN_USERS y una contraseña de 12–128 caracteres.');process.exitCode=1;});
}
module.exports={recoverOwner};
