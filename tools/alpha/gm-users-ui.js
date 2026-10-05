#!/usr/bin/env node
'use strict';
// Admin rework end-to-end on the real game page + real accounts API (same origin, temp data dir):
// RBAC-filtered tabs, connected list, ONE gift dialog per user (champion grouped by category with Ascension first,
// skin, gold, Brasas, mailbox), user sheet revoke with confirmation, founder not grantable,
// currency confirmation, audit query, Test Lab non-persistence, and denial for normal players.
const {chromium}=require('playwright'),path=require('path'),fs=require('fs'),os=require('os'),http=require('http'),assert=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'../..');
const TYPES={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.json':'application/json','.webp':'image/webp','.svg':'image/svg+xml','.webmanifest':'application/json','.woff2':'font/woff2','.ttf':'font/ttf','.mp3':'audio/mpeg','.ogg':'audio/ogg','.wav':'audio/wav'};
(async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'horda-gm-users-'));const old=process.env.ADMIN_USERS;delete process.env.ADMIN_USERS;
 const {create,hashPassword}=require('../../server/accounts');
 const seed=create({dataDir:dir,databaseUrl:'',adminUsers:'',log:()=>{}});await seed.ready;
 for(const u of ['NanoGM','FacuGM'])await seed.store.createUser({user:u,userKey:u.toLowerCase(),name:u,createdAt:Date.now(),lastLogin:Date.now(),passHash:await hashPassword('fixture-password')});await seed.close();
 const app=create({dataDir:dir,databaseUrl:'',log:()=>{},originAllowed:()=>true,founders:{nano:{account:'NanoGM'},facu:{account:'FacuGM'}}});await app.ready;
 const server=http.createServer((req,res)=>{if(app.handle(req,res))return;const p=path.join(ROOT,decodeURIComponent(new URL(req.url,'http://x').pathname));if(!p.startsWith(ROOT)||!fs.existsSync(p)||fs.statSync(p).isDirectory()){const idx=path.join(ROOT,'index.html');res.writeHead(200,{'content-type':'text/html'});res.end(fs.readFileSync(idx));return;}res.writeHead(200,{'content-type':TYPES[path.extname(p)]||'application/octet-stream'});fs.createReadStream(p).pipe(res);});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 async function request(method,url,body,token,status=200){const r=await fetch(base+url,{method,headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body)});const j=await r.json();assert.equal(r.status,status,url+' '+JSON.stringify(j));return j;}
 const login=async u=>(await request('POST','/api/login',{user:u,pass:'fixture-password'})).token;
 const owner=await login('NanoGM'),player=(await request('POST','/api/register',{user:'jugador1',pass:'player-password'},null,201)).token;
 await request('PUT','/api/save',{data:{gold:500,champions:{tanque:{unlocked:true,level:4}},arenasCleared:{},stash:[],cromas:{},cosmeticUnlocks:{}},baseVersion:0},player);
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});let checks=0;
 async function open(token,user){
  const ctx=await browser.newContext({viewport:{width:844,height:390}});
  await ctx.addInitScript(([base,token,user])=>{try{localStorage.setItem('horda_account:'+encodeURIComponent(base),JSON.stringify({token,user,name:user,expiresAt:Date.now()+86400000,apiBase:base}));}catch(e){}window.__accountTest=false;},[base,token,user]);
  const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/index.html?api='+encodeURIComponent(base));await page.waitForFunction(()=>typeof assetsAllReady==='function'&&assetsAllReady()&&typeof testLabStart==='function');
  return {page,ctx,errors};
 }
 try{
  // ---- owner (NanoGM: OWNER + FOUNDER) ----
  const {page,errors}=await open(owner,'NanoGM');
  await page.evaluate(()=>{location.hash='game-master';});await page.getByRole('heading',{name:'Alpha en vivo'}).waitFor();checks++;
  for(const t of ['Usuarios','Registro','Test Lab','Regalos masivos','Reinicios'])assert.equal(await page.getByRole('button',{name:t,exact:true}).count(),1,t),checks++;
  await page.getByRole('button',{name:'Usuarios',exact:true}).click();
  // Conectados ahora: jugador1 subió su guardado hace instantes → aparece con «Regalar» directo.
  const onlineCard=page.locator('.gm-card').filter({has:page.getByRole('heading',{name:'Conectados ahora'})});
  await onlineCard.getByRole('button',{name:'Regalar a jugador1',exact:true}).waitFor();checks++;
  await page.getByRole('button',{name:'Buscar usuarios',exact:true}).click();
  await onlineCard.getByRole('button',{name:'Regalar a jugador1',exact:true}).click();
  const gift=page.getByRole('dialog',{name:'Regalar a jugador1'});await gift.waitFor();checks++;
  // Campeón: categorías con ASCENSIÓN primero; Fundadores visibles pero sin botón.
  const heads=await gift.locator('.gm-gift-cat h3').allInnerTexts();
  assert.equal(heads[0],'ASCENSIÓN');assert(heads.indexOf('STANDARD')<heads.indexOf('FAMILIA')&&heads.indexOf('FAMILIA')<heads.indexOf('FUNDADORES'),'category order '+heads);assert.equal(heads.at(-1),'FUNDADORES');checks+=3;
  assert.equal(await gift.getByRole('button',{name:/Regalar (Nano|Facu) GM/}).count(),0,'founder never grantable from UI');assert.equal(await gift.locator('.gm-cat-founder .gm-gift-state').filter({hasText:'No se regala'}).count(),2);checks+=2;
  const aurelia=gift.locator('.gm-gift-item').filter({hasText:'Aurelia'});assert.match(await aurelia.innerText(),/Bloqueado/);checks++;
  await gift.getByRole('button',{name:'Regalar Aurelia',exact:true}).click();await page.getByRole('alertdialog').getByText('bloqueado').waitFor();await page.getByRole('button',{name:'Cancelar',exact:true}).click();
  assert.notEqual((await request('GET','/api/save',undefined,player)).data.champions.aurelia?.unlocked,true,'cancel grants nothing');checks++;
  await gift.getByRole('button',{name:'Regalar Aurelia',exact:true}).click();await page.getByRole('button',{name:'Confirmar',exact:true}).click();await gift.getByText('Aurelia regalado a jugador1.').waitFor();
  assert.equal((await request('GET','/api/save',undefined,player)).data.champions.aurelia.unlocked,true);await aurelia.getByText('Ya lo tiene').waitFor();checks+=2;
  await gift.getByRole('button',{name:'Regalar Myla',exact:true}).click();await page.getByRole('alertdialog').getByText('Valor nuevo:').waitFor();await page.getByRole('button',{name:'Confirmar',exact:true}).click();
  await gift.getByText('Myla regalado a jugador1.').waitFor();assert.equal((await request('GET','/api/save',undefined,player)).data.champions.myla.unlocked,true);checks++;
  // Apariencia, oro, Brasas y buzón desde el mismo diálogo.
  const tab=t=>gift.locator('.gm-gift-tabs').getByRole('button',{name:t,exact:true}).click();
  await tab('Apariencia');const skin=await gift.locator('select').nth(1).inputValue();await gift.getByRole('button',{name:'Regalar apariencia'}).click();await page.getByRole('button',{name:'Confirmar',exact:true}).click();await gift.getByText(/regalada a jugador1/).waitFor();
  assert.equal((await request('GET','/api/save',undefined,player)).data.cosmeticUnlocks[skin],true);checks++;
  await tab('Oro');await gift.locator('input[name=giftGold]').fill('250');await gift.getByRole('button',{name:'Regalar oro'}).click();await page.getByRole('alertdialog').getByText('750').waitFor();await page.getByRole('button',{name:'Confirmar',exact:true}).click();
  await gift.getByText('Oro regalado: ahora tiene 750.').waitFor();assert.equal((await request('GET','/api/save',undefined,player)).data.gold,750);checks++;
  await tab('Brasas ✦');await gift.getByRole('button',{name:'Regalar Brasas'}).click();await gift.getByText('El motivo es obligatorio para las Brasas.').waitFor();
  await gift.getByLabel('Motivo (obligatorio)').fill('regalo alpha');await gift.getByRole('button',{name:'Regalar Brasas'}).click();await page.getByRole('button',{name:'Confirmar',exact:true}).click();await gift.getByText('Brasas regaladas: ahora tiene 1000 ✦.').waitFor();checks+=2;
  await tab('Objeto o set');await gift.getByRole('button',{name:'Enviar al buzón'}).click();await page.getByRole('button',{name:'Confirmar',exact:true}).click();await gift.getByText(/enviado al buzón de jugador1/).waitFor();
  assert.equal((await request('GET','/api/save',undefined,player)).data.adminMailbox.length,1);checks++;
  for(const [w,h] of [[667,375],[844,390]]){await page.setViewportSize({width:w,height:h});for(const t of ['Campeón','Apariencia','Oro','Brasas ✦','Objeto o set']){await tab(t);assert(await gift.locator('.gm-gift-body').evaluate(n=>n.scrollWidth<=n.clientWidth+1),'gift overflow '+t+' '+w);assert(await page.locator('#game-master').evaluate(n=>n.scrollWidth<=n.clientWidth+1),'shell overflow '+t+' '+w);checks++;}}
  await page.keyboard.press('Escape');await gift.waitFor({state:'detached'});checks++;
  // Ficha: revocar sigue con confirmación (el regalo vive en «Regalar»).
  await page.getByRole('button',{name:'Ver ficha de jugador1'}).first().click();await page.getByRole('heading',{name:'jugador1 · jugador1',exact:true}).waitFor();checks++;
  assert.equal(await page.getByRole('button',{name:/^Conceder /}).count(),0,'grant lives in the gift dialog');checks++;
  await page.getByRole('button',{name:'Revocar Myla',exact:true}).click();await page.getByRole('button',{name:'Cancelar',exact:true}).click();assert.equal((await request('GET','/api/save',undefined,player)).data.champions.myla.unlocked,true,'cancel keeps state');checks++;
  await page.getByRole('button',{name:'Revocar Myla',exact:true}).click();await page.getByRole('button',{name:'Confirmar',exact:true}).click();await page.getByText('Myla revocado.').waitFor();
  assert.equal((await request('GET','/api/save',undefined,player)).data.champions.myla.unlocked,false);checks++;
  const sheetGold=page.locator('form').filter({has:page.locator('select[name=field]')});await sheetGold.locator('input[name=value]').fill('100');await sheetGold.getByRole('button',{name:'Aplicar valor'}).click();
  await page.getByRole('alertdialog').getByText('750').waitFor();await page.getByRole('button',{name:'Confirmar',exact:true}).click();await page.getByText('Valor actualizado.').waitFor();
  assert.equal((await request('GET','/api/save',undefined,player)).data.gold,100);checks++;
  // Familia completa: un botón por grupo (cuenta lo que falta), confirmación, una sola ruta del servidor.
  await page.getByRole('button',{name:'Usuarios',exact:true}).click();await onlineCard.getByRole('button',{name:'Regalar a jugador1',exact:true}).click();await gift.waitFor();
  const famBtn=gift.getByRole('button',{name:'Regalar toda la Familia',exact:true});assert.match(await famBtn.innerText(),/le faltan 2/);assert.equal(await famBtn.isEnabled(),true);checks+=2;
  assert.equal(await gift.getByRole('button',{name:'Regalar todos los de Ascensión',exact:true}).count(),1);assert.equal(await gift.locator('.gm-cat-founder .gm-gift-bulk').count(),0);checks+=2;
  await famBtn.click();await page.getByRole('alertdialog').getByText(/Myla/).waitFor();await page.getByRole('button',{name:'Cancelar',exact:true}).click();
  assert.notEqual((await request('GET','/api/save',undefined,player)).data.champions.ynara?.unlocked,true,'cancel grants nothing');checks++;
  await famBtn.click();await page.getByRole('button',{name:'Confirmar',exact:true}).click();await gift.getByText(/regalados a jugador1\./).waitFor();
  {const d=(await request('GET','/api/save',undefined,player)).data;assert.equal(d.champions.myla.unlocked,true);assert.equal(d.champions.ynara.unlocked,true);checks+=2;}
  assert.match(await famBtn.innerText(),/ya los tiene todos/);assert.equal(await famBtn.isDisabled(),true);checks+=2;
  await page.keyboard.press('Escape');await gift.waitFor({state:'detached'});
  if(process.env.GM_GIFT_SHOTS){const dir=process.env.GM_GIFT_SHOTS;await page.setViewportSize({width:844,height:390});await page.getByRole('button',{name:'Usuarios',exact:true}).click();await onlineCard.getByRole('button',{name:'Regalar a jugador1',exact:true}).click();await gift.waitFor();await page.waitForTimeout(300);await page.screenshot({path:dir+'/gift-dialog-campeon-844x390.png'});await page.setViewportSize({width:667,height:375});await tab('Brasas ✦');await page.waitForTimeout(200);await page.screenshot({path:dir+'/gift-dialog-brasas-667x375.png'});await page.keyboard.press('Escape');await page.setViewportSize({width:844,height:390});}
  await page.getByRole('button',{name:'Registro',exact:true}).click();await page.getByText(/currency\.set/).first().waitFor();await page.getByText(/champion\.revoke/).first().waitFor();checks+=2;
  for(const w of [667,844,1440]){await page.setViewportSize({width:w,height:w===1440?900:390});for(const t of ['Usuarios','Registro','Test Lab']){await page.getByRole('button',{name:t,exact:true}).click();await page.waitForFunction(()=>[...document.querySelectorAll('[data-gm-tab]')].every(b=>!b.disabled));assert(await page.locator('#game-master').evaluate(n=>n.scrollWidth<=n.clientWidth+1),'overflow '+t+' '+w);checks++;}}
  // ---- Test Lab: Facu GM, not owned by NanoGM, session never persists ----
  await page.setViewportSize({width:844,height:390});await page.getByRole('button',{name:'Test Lab',exact:true}).click();
  const before=await page.evaluate(()=>localStorage.getItem(SAVE_KEY));
  await page.locator('select[name=category]').selectOption('FOUNDER');await page.locator('select[name=champion]').selectOption('facu_gm');
  await page.getByRole('button',{name:'Iniciar sesión de test',exact:true}).click();await page.waitForFunction(()=>state==='playing'&&player.classKey==='facu_gm'&&testLabActive());checks++;
  assert.equal(await page.locator('#testlab-badge').isVisible(),true);checks++;
  await page.evaluate(()=>{save.gold+=99999;persist();persistNow();});await page.waitForTimeout(300);
  assert.equal(await page.evaluate(()=>localStorage.getItem(SAVE_KEY)),before,'test session never writes progress');checks++;
  await page.evaluate(()=>{setState('mainmenu');});assert.equal(await page.evaluate(()=>testLabActive()),false);assert.equal(await page.locator('#testlab-badge').count(),0);
  assert.equal(await page.evaluate(()=>save.gold),JSON.parse(before).gold,'real progress restored');assert.equal(await page.evaluate(()=>!!save.champions.facu_gm&&save.champions.facu_gm.unlocked),false);checks+=4;
  const audit=await request('GET','/api/gm/audit?action=testlab',undefined,owner);assert.ok(audit.entries.some(e=>e.content==='facu_gm'));checks++;
  // Volver a la campaña: desde Opciones -> panel -> botón, termina en el hub con JUGAR visible.
  await page.evaluate(()=>{if(typeof openHubOptions==='function')openHubOptions();location.hash='game-master';});await page.locator('#game-master').waitFor();
  await page.getByRole('button',{name:'⟵ Volver a la campaña',exact:true}).click();
  await page.waitForFunction(()=>state==='mainmenu'&&!document.getElementById('game-master')&&document.getElementById('hub-options').classList.contains('hidden')&&location.hash==='');
  assert.equal(await page.locator('#hub-play-btn').isVisible(),true);checks++;
  assert.deepEqual(errors,[]);
  // ---- normal player: no panel, server denies ----
  const p2=await open(player,'jugador1');await p2.page.evaluate(()=>{location.hash='game-master';});await p2.page.locator('.gm-denied').waitFor();assert.equal(await p2.page.locator('#game-master').count(),0);checks++;
  await request('GET','/api/gm/users',undefined,player,403);checks++;
  console.log('PASS admin users/test lab UI: '+checks+' checks');
 }finally{await browser.close();await new Promise(r=>server.close(r));await app.close();fs.rmSync(dir,{recursive:true,force:true});if(old===undefined)delete process.env.ADMIN_USERS;else process.env.ADMIN_USERS=old;}
})().catch(e=>{console.error(e);process.exitCode=1;});
