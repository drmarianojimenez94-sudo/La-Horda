'use strict';
/* Regresión: un jugador nuevo (guardado local vacío o cuenta recién creada) nunca queda con un guardián
 * bloqueado elegido (antes: el Asesino, clave "guerrero", el valor inicial de selectedClass). Primero recibe
 * su guardián de regalo (por defecto el Mago, ya marcado en "Tu primer guardián") y entra al entrenamiento.
 * También cubre "Borrar progreso y empezar de cero": vuelve al guardián de regalo, no al menú con uno bloqueado.
 *
 * Uso: NODE_PATH=/opt/node-tools/node_modules node tools/alpha/new-account-starter.js
 *   SITE=http://127.0.0.1:PUERTO  sitio estático ya servido (si falta, levanta python3 -m http.server).
 *   La parte de cuentas levanta server/relay.js (necesita el módulo "ws": server/node_modules o NODE_PATH).
 *   Si el relay no arranca, esa parte se informa como SKIP (REQUIRE_CLOUD=1 la vuelve obligatoria). */
const assert=require('node:assert/strict'),{chromium}=require('playwright'),{spawn}=require('node:child_process');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const root=path.resolve(__dirname,'..','..');
const children=[];process.on('exit',()=>children.forEach(c=>{try{c.kill();}catch(e){}}));
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function up(url,ms){const t=Date.now();while(Date.now()-t<ms){try{const r=await fetch(url);if(r.status<500)return true;}catch(e){}await wait(150);}return false;}

// Estado que nunca puede darse: un guardián elegido que no es tuyo, salvo el Mago por defecto mientras
// todavía no hay ninguno propio (antes de elegir el de regalo).
async function look(p){return p.evaluate(()=>{const owned=Object.keys(save.champions).filter(k=>save.champions[k].unlocked);
 return {state,selectedClass,owned,training:ALPHA_TRAINING.active,hub:(document.getElementById('hub-play-champ')||{}).textContent||''};});}
function assertSane(s,label){
 if(s.training){assert.equal(s.selectedClass,'mago',label+': training uses the mage');return;}
 if(s.owned.length) assert.ok(s.owned.includes(s.selectedClass),`${label}: selected ${s.selectedClass} is not owned (${s.owned})`);
 else assert.equal(s.selectedClass,'mago',`${label}: no champion yet, default must be the mage (got ${s.selectedClass})`);
}
async function pickStarter(p,champ,label){
 await p.locator('#starter-screen').waitFor({state:'visible'});
 // sin elección explícita: el Mago ya viene marcado y el cartel de confirmar a la vista
 assert.equal(await p.locator('.starter-card.sel').getAttribute('data-champ'),'mago',label+': mage preselected');
 assert.ok(await p.locator('#starter-confirm').isVisible(),label+': confirm visible for the default');
 assertSane(await look(p),label+' starter screen');
 if(champ!=='mago') await p.locator(`.starter-card[data-champ="${champ}"]`).click();
 await p.locator('#starter-yes-btn').click();
 await p.locator('#alpha-training-panel').waitFor({state:'visible'});
 const s=await look(p);assertSane(s,label+' tutorial');assert.equal(s.training,true,label+': tutorial starts after the gift');
 await p.getByRole('button',{name:'Saltar tutorial',exact:true}).click();
 await p.waitForFunction(()=>state==='mainmenu');
 const m=await look(p);assertSane(m,label+' menu');
 assert.deepEqual(m.owned,[champ],label+': exactly one gifted champion');assert.equal(m.selectedClass,champ,label+': gifted champion selected');
 assert.match(m.hub,new RegExp((await p.evaluate(k=>CLASSES[k].name,champ)).split(',')[0]),label+': hub shows the gifted champion');
}

(async()=>{
 let site=process.env.SITE;
 if(!site){const port=8000+Math.floor(Math.random()*900)+40;children.push(spawn('python3',['-m','http.server',String(port)],{cwd:root,stdio:'ignore'}));site='http://127.0.0.1:'+port;assert.ok(await up(site+'/index.html',8000),'static server');}
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  // 1) guardado local nuevo, como invitado: Mago por defecto (un toque) y también eligiendo otro
  for(const champ of ['mago','tanque']){
   const ctx=await browser.newContext({viewport:{width:844,height:390}}),p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
   await p.route('https://fondalstudios.com/**',r=>r.fulfill({status:200,headers:{'access-control-allow-origin':'*'},contentType:'application/json',body:'{}'}));
   await p.goto(site+'/index.html');await p.waitForFunction(()=>typeof alphaFirstRunContinue==='function'&&typeof save!=='undefined');
   assertSane(await look(p),'fresh boot');
   await p.evaluate(()=>{window.__accountTest=true;});
   await p.locator('#title-continue-btn').click();
   await p.getByRole('button',{name:/invitado/i}).click();
   await pickStarter(p,champ,'guest '+champ);
   // al recargar sigue el mismo guardián
   await p.reload();await p.waitForFunction(()=>typeof alphaFirstRunContinue==='function');
   assert.equal(await p.evaluate(()=>selectedClass),champ,'reload keeps the gifted champion');
   assert.deepEqual(errors,[]);await ctx.close();
   console.log('PASS fresh local save → gift '+champ+' (mage preselected) → tutorial → menu with an owned champion');
  }
  // 2) cuenta nueva en un servidor local (sin base de datos) + "empezar de cero"
  const port=9100+Math.floor(Math.random()*500),data=fs.mkdtempSync(path.join(os.tmpdir(),'horda-starter-'));
  const env={...process.env,PORT:String(port),DATA_DIR:data,ACCOUNT_DATA_DIR:data,DATABASE_URL:''};
  const relay=spawn(process.execPath,['server/relay.js'],{cwd:root,env,stdio:'ignore'});children.push(relay);
  if(!await up(`http://127.0.0.1:${port}/api/health`,10000)){
   if(process.env.REQUIRE_CLOUD==='1') throw Error('relay did not start (install server deps or set NODE_PATH with "ws")');
   console.log('SKIP cloud account cases: server/relay.js did not start (needs the "ws" module)');return;
  }
  const ctx=await browser.newContext({viewport:{width:844,height:390}}),p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(`${site}/index.html?server=ws://127.0.0.1:${port}`);await p.waitForFunction(()=>typeof accountStartFresh==='function'&&typeof save!=='undefined');
  await p.evaluate(()=>{window.__accountTest=true;});
  await p.locator('#title-continue-btn').click();
  await p.locator('[data-acc-tab="register"]').click();
  await p.fill('#acc-user','n'+Date.now().toString(36).slice(-8));await p.fill('#acc-pass','secret123');await p.fill('#acc-pass2','secret123');
  await p.locator('#acc-submit').click();
  await pickStarter(p,'soporte','new account');
  await p.waitForFunction(()=>!acct.uploading&&!acct.pulling&&acct.sync&&!acct.sync.dirty,null,{timeout:15000}).catch(()=>{});
  await p.evaluate(()=>accountUpload&&accountUpload('test'));
  const cloud=await p.evaluate(async()=>(await accountFetch('GET','/api/save')).j.data);
  assert.deepEqual(Object.keys(cloud.champions).filter(k=>cloud.champions[k].unlocked),['soporte'],'cloud save owns only the gifted champion');
  console.log('PASS new cloud account → gift soporte → tutorial → menu; cloud owns exactly that champion');
  // reinicio explícito: de vuelta al guardián de regalo (nunca el menú con Elyra bloqueada elegida)
  await p.evaluate(()=>{gameConfirm=async()=>true;accountOpen();});
  await p.getByRole('button',{name:/empezar de cero/i}).click();
  await p.waitForFunction(()=>!Object.values(save.champions).some(c=>c.unlocked),null,{timeout:15000});
  await p.waitForTimeout(300);
  const after=await look(p);assertSane(after,'after start fresh');
  assert.equal(after.state,'starter','start fresh goes back to the starter gift, not to the menu');
  await pickStarter(p,'mago','after start fresh');
  assert.deepEqual(errors,[]);await ctx.close();
  console.log('PASS start fresh → starter gift again (mage default) → tutorial → menu with an owned champion');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>children.forEach(c=>{try{c.kill();}catch(e){}}));
