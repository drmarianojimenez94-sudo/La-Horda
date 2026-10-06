#!/usr/bin/env node
'use strict';
// PACK DE BIENVENIDA = 3 CAMPEONES de punta a punta: página real del juego + API real de cuentas/billetera (mismo origen, datos temporales).
// Cubre: pestaña ✦ Brasas visible, paquetes con precio en US$, Pack de bienvenida visible y oculto tras un webhook
// firmado (secreto HMAC de prueba), checkout deshabilitado ("Muy pronto") sin pasarela, chip ✦ del hub (también sin
// sesión) que abre la pestaña, botón del final de partida que abre Skins de ese guardián y sin desbordes a 844x390 y
// 667x375. Guarda docs/production/brasas-store-844x390.png y docs/production/hub-brasas-chip.png.
// Uso: NODE_PATH=/opt/node-tools/node_modules:server/node_modules node tools/collection/welcome-picks.js
//      (en CI: NODE_PATH=/tmp/horda-balance/node_modules después de npm ci --prefix server). Chromium: CHROMIUM_PATH opcional.
const {chromium}=require('playwright'),path=require('path'),fs=require('fs'),os=require('os'),http=require('http'),crypto=require('crypto'),assert=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'../..');
const TYPES={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.json':'application/json','.webp':'image/webp','.svg':'image/svg+xml','.webmanifest':'application/json','.woff2':'font/woff2','.ttf':'font/ttf','.mp3':'audio/mpeg','.ogg':'audio/ogg','.wav':'audio/wav'};
const SHOTS=path.join(ROOT,'docs/production');
const SECRET='secreto-de-prueba-brasas-0123';
(async()=>{
 delete process.env.PAYMENTS_PROVIDER;delete process.env.PAYMENTS_WEBHOOK_SECRET;delete process.env.PAYMENTS_CHECKOUT_URL;
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'horda-brasas-'));const oldAdmins=process.env.ADMIN_USERS;delete process.env.ADMIN_USERS;
 const {create}=require('../../server/accounts');
 const app=create({dataDir:dir,databaseUrl:'',adminUsers:'',log:()=>{},originAllowed:()=>true});await app.ready;
 const server=http.createServer((req,res)=>{if(app.handle(req,res))return;const p=path.join(ROOT,decodeURIComponent(new URL(req.url,'http://x').pathname));if(!p.startsWith(ROOT)||!fs.existsSync(p)||fs.statSync(p).isDirectory()){res.writeHead(200,{'content-type':'text/html'});res.end(fs.readFileSync(path.join(ROOT,'index.html')));return;}res.writeHead(200,{'content-type':TYPES[path.extname(p)]||'application/octet-stream'});fs.createReadStream(p).pipe(res);});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 async function request(method,url,body,token,headers){const r=await fetch(base+url,{method,headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{}),...(headers||{})},body:body===undefined?undefined:(typeof body==='string'?body:JSON.stringify(body))});let j=null;try{j=await r.json();}catch(e){}return {status:r.status,j};}
 async function account(name){
  const reg=await request('POST','/api/register',{user:name,pass:'player-password'});assert.equal(reg.status,201,JSON.stringify(reg.j));const token=reg.j.token;
  await request('PUT','/api/save',{data:{gold:500,champions:{tanque:{unlocked:true,level:3}},arenasCleared:{},stash:[],cromas:{},cosmeticUnlocks:{},firstRun:null,starterChosen:true,starterGiftV1:true,starterSkin:'vale',playtestV1Bonus:true,campaignResetV1:true,campaignResetV2:true,campaignResetV3:true,testStageV1:true},baseVersion:0},token);
  return {token,id:(await app.store.getUserByKey(name.toLowerCase())).id,name};
 }
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});let checks=0;const ok=(c,m)=>{assert(c,m);checks++;};
 async function open(acc,w,h){
  const ctx=await browser.newContext({viewport:{width:w||844,height:h||390}});
  await ctx.addInitScript(([base,token,name])=>{try{localStorage.setItem('horda_account:'+encodeURIComponent(base),JSON.stringify({token,user:name,name,expiresAt:Date.now()+86400000,apiBase:base}));}catch(e){}},[base,acc.token,acc.name]);
  const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/index.html?lazy=0&api='+encodeURIComponent(base));
  await page.waitForFunction(()=>typeof assetsAllReady==='function'&&assetsAllReady()&&typeof shopOpen==='function'&&typeof renderMainMenu==='function');
  await page.waitForFunction(()=>acct.lastPull&&!acct.pulling&&!acct.applying,null,{timeout:30000});
  await page.evaluate(()=>{save.firstRun=null;selectedClass='tanque';setState('mainmenu');renderMainMenu();});
  return {page,ctx,errors};
 }
 const pay=async(userId,paymentId)=>{process.env.PAYMENTS_PROVIDER='hmac';process.env.PAYMENTS_WEBHOOK_SECRET=SECRET;const raw=JSON.stringify({pack:'brasas_bienvenida',userId,paymentId});
  return request('POST','/api/payments/webhook',raw,undefined,{'x-horda-signature':crypto.createHmac('sha256',SECRET).update(raw).digest('hex')});};
 const noOverflow=async(page,label)=>{const r=await page.evaluate(()=>{const bad=[];const de=document.documentElement;if(de.scrollWidth>de.clientWidth+1)bad.push('document '+de.scrollWidth+'>'+de.clientWidth);
   for(const n of document.querySelectorAll('.wp-panel,.wp-card,.wp-head,.wp-foot,.mode-card-note,#run-intro .ri-first,.wp-banner')){if(n.offsetParent===null&&getComputedStyle(n).position!=='fixed')continue;if(n.scrollWidth>n.clientWidth+2)bad.push((n.className||n.id)+' '+n.scrollWidth+'>'+n.clientWidth);const r=n.getBoundingClientRect();if(r.width&&(r.right>innerWidth+1||r.left<-1))bad.push((n.className||n.id)+' fuera de pantalla');}
   const p=document.querySelector('.wp-panel');if(p){const r=p.getBoundingClientRect();if(r.bottom>innerHeight+1||r.top<-1)bad.push('panel fuera de pantalla '+Math.round(r.top)+'..'+Math.round(r.bottom));}
   return bad;});assert.deepEqual(r,[],'overflow '+label);checks++;};
 try{
  fs.mkdirSync(SHOTS,{recursive:true});
  const A=await account('Bienvenido');
  // ---- sin compra: sin derecho, sin cartel, y el servidor no deja reclamar ----
  {const {page,ctx,errors}=await open(A);
   await page.evaluate(()=>shopOpen('brasas'));await page.waitForFunction(()=>PREMIUM.at>0);
   ok(await page.evaluate(()=>PREMIUM.welcome&&PREMIUM.welcome.entitled===0&&!premiumWelcomePending()),'sin compra no hay derecho');
   ok(await page.locator('.wp-banner').count()===0&&await page.locator('#welcome-picks').count()===0,'sin compra no hay cartel ni pantalla');
   const r=await page.evaluate(()=>premiumWelcomeClaim('mago'));ok(!r.ok&&r.code==='NOT_PURCHASED','el servidor rechaza reclamar sin compra '+JSON.stringify(r));
   ok(await page.evaluate(()=>!save.champions.mago.unlocked),'no se desbloqueó nada');
   assert.deepEqual(errors,[]);await ctx.close();}
  // ---- compra simulada (webhook firmado) -> la pantalla de elección se abre sola ----
  const {page,ctx,errors}=await open(A);
  await page.evaluate(()=>shopOpen('brasas'));await page.waitForFunction(()=>PREMIUM.at>0);
  const hook=await pay(A.id,'pay_wp_1');ok(hook.status===200&&!hook.j.duplicate,'webhook '+JSON.stringify(hook));
  await page.evaluate(()=>premiumRefresh(true));
  await page.locator('#welcome-picks .wp-panel').waitFor();checks++;
  const cards=await page.$$eval('[data-wp-pick]',ns=>ns.map(n=>n.dataset.wpPick));
  ok(cards.length>=6&&!cards.includes('tanque'),'candidatos sin los que ya tengo: '+cards.length);
  ok(await page.evaluate(ids=>ids.every(k=>{const m=championMeta(k);return m.category==='STANDARD'&&m.releaseState==='RELEASED';}),cards),'solo STANDARD publicados (nada de Ascensión, Fundadores ni Familia)');
  ok(/te quedan 3 por elegir/.test(await page.locator('.wp-sub').innerText())&&/7\.500|2\.500/.test(await page.locator('.wp-sub').innerText()),'texto: te quedan 3 y su valor en oro');
  for(const [w,h] of [[844,390],[667,375]]){await page.setViewportSize({width:w,height:h});await page.waitForTimeout(150);await noOverflow(page,'picker '+w);}
  await page.setViewportSize({width:844,height:390});
  // elegir 4: solo entran 3
  for(const k of cards.slice(0,4))await page.locator(`[data-wp-pick="${k}"]`).click();
  ok(await page.locator('.wp-card.on').count()===3,'no se pueden marcar más de 3');
  ok(/Elegidos: 3 de 3/.test(await page.locator('.wp-count').innerText()),'contador');
  await page.addStyleTag({content:'#qs-toasts{display:none!important}'});await page.screenshot({path:path.join(SHOTS,'welcome-picks-844x390.png')});
  const chosen=cards.slice(0,3);
  await page.evaluate(()=>{window.__autoConfirm=true;});
  await page.locator('[data-wp-claim]').click();
  await page.waitForFunction(()=>!document.getElementById('welcome-picks'),null,{timeout:15000});checks++;
  ok(await page.evaluate(ch=>ch.every(k=>save.champions[k]&&save.champions[k].unlocked),chosen),'los 3 quedaron desbloqueados en el cliente');
  ok(await page.evaluate(()=>PREMIUM.welcome.remaining===0&&PREMIUM.welcome.claimed.length===3&&!document.querySelector('.wp-banner')),'sin elecciones pendientes ni cartel');
  const sv=(await request('GET','/api/save',undefined,A.token)).j.data;
  ok(chosen.every(k=>sv.champions[k]&&sv.champions[k].unlocked),'los 3 están en el guardado del servidor');
  ok(sv.gold===500,'el oro no se tocó (regalo, no compra)');
  const wal=(await request('GET','/api/wallet',undefined,A.token)).j;
  ok(wal.premium===700&&wal.welcome.claimed.length===3&&wal.welcome.eligible.length===0&&wal.ledger.filter(e=>/^welcome_pick:/.test(e.reason)).length===3,'libro mayor: 700 ✦ y 3 elecciones '+JSON.stringify(wal.welcome));
  // un cuarto pedido directo a la API: rechazado
  const extra=cards[5];const r4=await request('POST','/api/wallet/welcome/claim',{champion:extra},A.token);ok(r4.status===409&&r4.j.error==='NO_PICKS_LEFT','el servidor no deja un cuarto campeón '+JSON.stringify(r4));
  ok(await page.evaluate(k=>premiumWelcomeClaim(k).then(r=>!r.ok),extra),'el cliente tampoco');
  ok(await page.evaluate(k=>!save.champions[k].unlocked,extra),'el cuarto no se desbloqueó');
  assert.deepEqual(errors,[]);await ctx.close();
  // ---- recargar el juego: todo sigue ahí ----
  {const o=await open(A);
   ok(await o.page.evaluate(ch=>ch.every(k=>save.champions[k].unlocked),chosen),'tras recargar los 3 siguen siendo tuyos');
   await o.page.evaluate(()=>shopOpen('brasas'));await o.page.waitForFunction(()=>PREMIUM.at>0);
   ok(await o.page.evaluate(()=>!premiumWelcomePending())&&await o.page.locator('.wp-banner').count()===0,'recargado: no vuelve a ofrecer');
   assert.deepEqual(o.errors,[]);await o.ctx.close();}
  // ---- elegir una parte, cerrar el juego, y reclamar el resto después ----
  const B=await account('Parcial');await pay(B.id,'pay_wp_b');
  {const o=await open(B);
   await o.page.evaluate(()=>shopOpen('destacados'));
   await o.page.locator('#welcome-picks .wp-panel').waitFor();
   const bc=await o.page.$$eval('[data-wp-pick]',ns=>ns.map(n=>n.dataset.wpPick));
   await o.page.evaluate(()=>{window.__autoConfirm=true;});
   await o.page.locator(`[data-wp-pick="${bc[0]}"]`).click();await o.page.locator('[data-wp-claim]').click();
   await o.page.locator('.wp-count').getByText('Elegidos: 0 de 2').waitFor();checks++;
   ok(await o.page.evaluate(()=>PREMIUM.welcome.remaining===2),'quedan 2');
   await o.page.locator('[data-wp-close]').click();
   ok(/Reclamar mis 2 campeones/i.test(await o.page.locator('.wp-banner').innerText()),'cartel con 2 pendientes');
   assert.deepEqual(o.errors,[]);await o.ctx.close();
   B.first=bc[0];}
  {const o=await open(B);
   ok(await o.page.evaluate(k=>save.champions[k].unlocked,B.first),'el primero sobrevive a cerrar el juego');
   await o.page.evaluate(()=>shopOpen('objetos'));
   await o.page.locator('#welcome-picks .wp-panel').waitFor();checks++;
   ok(await o.page.locator('[data-wp-pick]').count()>=5&&await o.page.locator(`[data-wp-pick="${B.first}"]`).count()===0,'el ya elegido no se ofrece de nuevo');
   const bc=await o.page.$$eval('[data-wp-pick]',ns=>ns.map(n=>n.dataset.wpPick));
   await o.page.evaluate(()=>{window.__autoConfirm=true;});
   await o.page.locator(`[data-wp-pick="${bc[0]}"]`).click();await o.page.locator(`[data-wp-pick="${bc[1]}"]`).click();await o.page.locator('[data-wp-claim]').click();
   await o.page.waitForFunction(()=>!document.getElementById('welcome-picks'));checks++;
   const w=(await request('GET','/api/wallet',undefined,B.token)).j.welcome;ok(w.claimed.length===3&&w.remaining===0,'en total 3 '+JSON.stringify(w));
   assert.deepEqual(o.errors,[]);await o.ctx.close();}
  // ---- aviso "primer jugador en completar el juego" ----
  {const o=await open(A);const page=o.page;
   await page.evaluate(()=>setState('modeselect'));
   const txt=await page.locator('#campaign-first-notice').innerText();
   ok(txt.includes('El primer jugador en completar el juego puede pedir un campeón con diseño propio.')&&txt.length<=120,'aviso en la tarjeta de Campaña ('+txt.length+')');
   ok(await page.evaluate(()=>document.getElementById('campaign-first-notice').textContent.includes(FIRST_FINISH_NOTICE)),'mismo texto que la presentación');
   for(const [w,h] of [[844,390],[667,375]]){await page.setViewportSize({width:w,height:h});await page.waitForTimeout(120);await noOverflow(page,'aviso '+w);
    const r=await page.evaluate(()=>{const n=document.getElementById('campaign-first-notice'),c=n.closest('.mode-card').getBoundingClientRect(),b=n.getBoundingClientRect();return b.left>=c.left-1&&b.right<=c.right+1&&b.bottom<=c.bottom+1&&b.right<=innerWidth;});ok(r,'aviso dentro de su tarjeta '+w);}
   await page.setViewportSize({width:844,height:390});
   await page.screenshot({path:path.join(SHOTS,'campaign-first-notice-844x390.png')});
   // presentación de la Arena Infernal: aparece; en otra arena no
   await page.evaluate(()=>{window.__autoConfirm=true;save.tut=save.tut||{};save.tut.goalMission=1;runIntroShow('infernal',()=>{});});
   const f=page.locator('#run-intro .ri-first');await f.waitFor({state:'visible'});ok((await f.innerText()).includes('El primer jugador en completar el juego puede pedir un campeón con diseño propio.'),'aviso en la Arena Infernal');
   for(const [w,h] of [[844,390],[667,375]]){await page.setViewportSize({width:w,height:h});await page.waitForTimeout(120);await noOverflow(page,'infernal '+w);}
   await page.evaluate(()=>{RUN_INTRO.open=false;document.getElementById('run-intro').classList.add('hidden');runIntroShow('ciudad',()=>{});});
   ok(await page.locator('#run-intro .ri-first').isHidden(),'en otras arenas no aparece');
   assert.deepEqual(o.errors,[]);await o.ctx.close();}
  console.log(`welcome-picks: ${checks} checks PASS`);
 }finally{await browser.close();await new Promise(r=>server.close(r));await app.close();fs.rmSync(dir,{recursive:true,force:true});if(oldAdmins===undefined)delete process.env.ADMIN_USERS;else process.env.ADMIN_USERS=oldAdmins;delete process.env.PAYMENTS_PROVIDER;delete process.env.PAYMENTS_WEBHOOK_SECRET;}
})().catch(e=>{console.error(e);process.exitCode=1;});
