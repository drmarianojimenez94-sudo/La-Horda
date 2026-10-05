#!/usr/bin/env node
'use strict';
// TIENDA ✦ BRASAS de punta a punta: página real del juego + API real de cuentas/billetera (mismo origen, datos temporales).
// Cubre: pestaña ✦ Brasas visible, paquetes con precio en US$, Pack de bienvenida visible y oculto tras un webhook
// firmado (secreto HMAC de prueba), checkout deshabilitado ("Muy pronto") sin pasarela, chip ✦ del hub (también sin
// sesión) que abre la pestaña, botón del final de partida que abre Skins de ese guardián y sin desbordes a 844x390 y
// 667x375. Guarda docs/production/brasas-store-844x390.png y docs/production/hub-brasas-chip.png.
// Uso: NODE_PATH=/opt/node-tools/node_modules:server/node_modules node tools/collection/brasas-store.js
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
 const reg=await request('POST','/api/register',{user:'Brasero',pass:'player-password'});assert.equal(reg.status,201,JSON.stringify(reg.j));const token=reg.j.token;
 const champs={tanque:{unlocked:true,level:3},mago:{unlocked:true,level:3},arquero:{unlocked:true,level:2}};
 await request('PUT','/api/save',{data:{gold:500,champions:champs,arenasCleared:{},stash:[],cromas:{},cosmeticUnlocks:{},firstRun:null},baseVersion:0},token);
 const userId=(await app.store.getUserByKey('brasero')).id;assert(Number.isSafeInteger(userId),'user id');
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});let checks=0;const ok=(c,m)=>{assert(c,m);checks++;};
 async function open(logged,w,h){
  const ctx=await browser.newContext({viewport:{width:w||844,height:h||390}});
  if(logged)await ctx.addInitScript(([base,token])=>{try{localStorage.setItem('horda_account:'+encodeURIComponent(base),JSON.stringify({token,user:'Brasero',name:'Brasero',expiresAt:Date.now()+86400000,apiBase:base}));}catch(e){}},[base,token]);
  const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/index.html?lazy=0&api='+encodeURIComponent(base));
  await page.waitForFunction(()=>typeof assetsAllReady==='function'&&assetsAllReady()&&typeof shopOpen==='function'&&typeof renderMainMenu==='function');
  // perfil fuera de la primera partida, con guardianes propios (para la tira "¿Qué compro con Brasas?")
  await page.evaluate(c=>{for(const k of Object.keys(c)){save.champions[k]=Object.assign(save.champions[k]||{},c[k]);}save.firstRun=null;selectedClass='tanque';setState('mainmenu');renderMainMenu();},champs);
  return {page,ctx,errors};
 }
 const noOverflow=async(page,label)=>{const r=await page.evaluate(()=>{const bad=[];const de=document.documentElement;if(de.scrollWidth>de.clientWidth+1)bad.push('document '+de.scrollWidth+'>'+de.clientWidth);
   for(const sel of ['#shop-screen','#shop-panel','#shop-tabs','.hub-top','.brasas-head','.brasas-packs','.brasas-what','.brasas-pack.welcome','.shop-skin-focus'])for(const n of document.querySelectorAll(sel)){if(n.offsetParent===null)continue;if(n.scrollWidth>n.clientWidth+1)bad.push(sel+' '+n.scrollWidth+'>'+n.clientWidth);}
   for(const n of document.querySelectorAll('.brasas-pack, .brasas-what-card, .shop-tab, #hub-premium-btn')){if(n.offsetParent===null)continue;const r=n.getBoundingClientRect();if(r.right>innerWidth+1||r.left<-1)bad.push((n.className||n.id)+' fuera de pantalla '+Math.round(r.left)+'..'+Math.round(r.right));if(n.scrollWidth>n.clientWidth+2)bad.push((n.className||n.id)+' texto desborda');}
   return bad;});assert.deepEqual(r,[],'overflow '+label);checks++;};
 try{
  // ---- sin sesión: chip "✦ —" visible, abre ✦ Brasas con "Iniciá sesión" ----
  {const {page,ctx,errors}=await open(false);
   const chip=page.locator('#hub-premium-btn');await chip.waitFor({state:'visible'});ok(/✦\s*—/.test(await chip.innerText()),'chip sin sesión '+await chip.innerText());
   await chip.click();ok(await page.evaluate(()=>state==='shop'&&shopTab==='brasas'),'chip abre Brasas');
   await page.locator('.brasas-status').getByText('Iniciá sesión para comprar Brasas.').waitFor();checks++;
   ok(await page.locator('[data-brasas-buy]').count()===0,'sin sesión no hay compra');
   await page.getByText('Las Brasas solo compran apariencia. Nunca poder.').waitFor();checks++;
   assert.deepEqual(errors,[]);await ctx.close();}

  // ---- con sesión ----
  const {page,ctx,errors}=await open(true);
  await page.waitForFunction(()=>PREMIUM.at>0,null,{timeout:15000});
  ok(await page.locator('#hub-premium-btn').isVisible(),'chip visible con sesión');
  ok(/✦\s*0/.test(await page.locator('#hub-premium-btn').innerText()),'saldo 0 en el chip');
  ok(await page.locator('#hub-badge-offer').isVisible(),'OFERTA en la ficha Tienda');
  ok(await page.evaluate(()=>shopDailyShowcase().deals.length>0),'hay ofertas del día');
  fs.mkdirSync(SHOTS,{recursive:true});await page.addStyleTag({content:'#qs-toasts{display:none!important}'});await page.screenshot({path:path.join(SHOTS,'hub-brasas-chip.png')});
  await page.locator('#hub-premium-btn').click();
  await page.locator('.shop-tab[data-shop-tab="brasas"].on').waitFor();checks++;
  await page.locator('[data-brasas-pack="brasas_bienvenida"]').waitFor();checks++;
  const prices=await page.$$eval('.brasas-packs .brasas-pack',ns=>ns.map(n=>({id:n.dataset.brasasPack,price:n.querySelector('.brasas-pack-price').textContent.trim(),amt:n.querySelector('.brasas-pack-amt').textContent.trim(),bonus:(n.querySelector('.brasas-bonus')||{}).textContent||''})));
  assert.deepEqual(prices.map(p=>p.price),['US$ 4,99','US$ 9,99','US$ 24,99','US$ 49,99'],JSON.stringify(prices));checks++;
  ok(prices[2].bonus.includes('+250')&&prices[3].bonus.includes('+750')&&prices[2].amt.includes('2.750'),'bonus visible '+JSON.stringify(prices));
  const wtxt=await page.locator('[data-brasas-pack="brasas_bienvenida"]').innerText();ok(/US\$ 4,99/.test(wtxt)&&/1\.200/.test(wtxt)&&/\+200/.test(wtxt)&&/UNA SOLA VEZ/i.test(wtxt),'bienvenida '+wtxt);
  // pagos sin pasarela: "Muy pronto", deshabilitado, sin compras simuladas
  ok(await page.locator('[data-brasas-buy]').count()===0,'sin botón de compra activo');
  const soon=page.locator('[data-brasas-soon]');ok(await soon.count()===5&&await soon.first().isDisabled()&&(await soon.first().innerText()).includes('Muy pronto'),'Muy pronto deshabilitado');
  await page.locator('[data-brasas-soon-note]').getByText('Los pagos todavía no están conectados',{exact:false}).waitFor();checks++;
  const co=await page.evaluate(()=>premiumCheckout('brasas_1000'));ok(!co.ok&&co.soon&&/todavía no están conectados/.test(co.reason),'checkout 501 '+JSON.stringify(co));
  ok((await page.locator('.brasas-what .brasas-what-card').count())===3,'tres skins de ejemplo');
  for(const [w,h] of [[844,390],[667,375]]){await page.setViewportSize({width:w,height:h});await page.waitForTimeout(150);await noOverflow(page,'brasas '+w);
   if(w===844){await page.addStyleTag({content:'#qs-toasts{display:none!important}'});await page.screenshot({path:path.join(SHOTS,'brasas-store-844x390.png')});}}
  await page.setViewportSize({width:844,height:390});
  // un webhook firmado acredita el Pack de bienvenida: el servidor deja de ofrecerlo
  process.env.PAYMENTS_PROVIDER='hmac';process.env.PAYMENTS_WEBHOOK_SECRET=SECRET;
  const raw=JSON.stringify({pack:'brasas_bienvenida',userId,paymentId:'pay_browser_welcome'});
  const sig=crypto.createHmac('sha256',SECRET).update(raw).digest('hex');
  const hook=await request('POST','/api/payments/webhook',raw,undefined,{'x-horda-signature':sig});ok(hook.status===200&&!hook.j.duplicate,'webhook '+JSON.stringify(hook));
  const again=await request('POST','/api/payments/webhook',JSON.stringify({pack:'brasas_bienvenida',userId,paymentId:'pay_browser_welcome_2'}),undefined,{'x-horda-signature':crypto.createHmac('sha256',SECRET).update(JSON.stringify({pack:'brasas_bienvenida',userId,paymentId:'pay_browser_welcome_2'})).digest('hex')});
  ok(again.status===200&&again.j.alreadyBought===true,'segundo pago de bienvenida no acredita');
  await page.evaluate(()=>premiumRefresh(true));
  await page.locator('[data-brasas-pack="brasas_bienvenida"]').waitFor({state:'detached'});checks++;
  ok(/1\.200/.test(await page.locator('.brasas-bal').innerText()),'saldo 1.200');
  ok(await page.locator('[data-brasas-buy]').count()===4,'con pasarela: botones Comprar');
  delete process.env.PAYMENTS_PROVIDER;delete process.env.PAYMENTS_WEBHOOK_SECRET;
  await page.evaluate(()=>premiumRefresh(true));await page.locator('[data-brasas-soon]').first().waitFor();checks++;
  // otras pestañas siguen andando
  for(const t of ['destacados','campeones','objetos','skins','brasas']){await page.locator(`.shop-tab[data-shop-tab="${t}"]`).click();ok(await page.evaluate(t=>shopTab===t,t),'tab '+t);}
  ok(!(await page.locator('#shop-panel').innerText()).includes('set completo'),'sin textos de set completo');
  await page.locator('.shop-tab[data-shop-tab="destacados"]').click();
  ok(!(await page.locator('#shop-panel').innerText()).includes('PAQUETES DE SKINS'),'sin PAQUETES DE SKINS');
  // ---- final de partida: "Ver apariencias de <guardián>" abre Skins de ese guardián ----
  const champ=await page.evaluate(()=>['tanque','mago','arquero'].find(k=>premiumChampSkinIds(k).length));assert(champ,'algún guardián con skins sin comprar');
  await page.evaluate(k=>{setState('gameover');document.getElementById('go-progress').innerHTML='Oro total: <b>500</b>'+endSkinsLinkHTML(k);},champ);
  const endBtn=page.locator(`#gameover-screen [data-end-skins="${champ}"]`);await endBtn.waitFor({state:'visible'});
  ok((await endBtn.innerText()).startsWith('Ver apariencias de '),'texto del botón');
  ok(await page.locator('#retry-btn').isVisible()&&await page.locator('#menu-btn-1').isVisible(),'no bloquea el flujo');
  await endBtn.click();
  ok(await page.evaluate(k=>state==='shop'&&shopTab==='skins'&&shopSkinFocus===k,champ),'abre Skins con foco');
  await page.locator(`.shop-skin-focus[data-skin-focus="${champ}"]`).waitFor();checks++;
  const foreign=await page.evaluate(k=>[...document.querySelectorAll('#shop-panel [data-skin-card]')].filter(n=>skinSetChamp(n.dataset.skinCard)!==k).length+[...document.querySelectorAll('#shop-panel [data-croma-card]')].filter(n=>CROMA_SKINS[n.dataset.cromaCard].champ!==k).length,champ);
  ok(foreign===0,'solo apariencias de '+champ);
  for(const [w,h] of [[844,390],[667,375]]){await page.setViewportSize({width:w,height:h});await page.waitForTimeout(100);await noOverflow(page,'skins foco '+w);}
  await page.locator('#shop-skin-focus-clear').click();ok(await page.evaluate(()=>shopSkinFocus===null),'Ver todas');
  // un guardián sin skins pendientes no muestra el botón; online tampoco
  ok(await page.evaluate(()=>endSkinsLinkHTML('no_existe')===''),'sin guardián no hay botón');
  // hub sin desbordes en ambos tamaños
  await page.evaluate(()=>{setState('mainmenu');renderMainMenu();});
  for(const [w,h] of [[844,390],[667,375]]){await page.setViewportSize({width:w,height:h});await page.waitForTimeout(100);await noOverflow(page,'hub '+w);
   const r=await page.evaluate(()=>{const a=document.getElementById('hub-premium-btn').getBoundingClientRect(),b=document.getElementById('hub-profile-btn').getBoundingClientRect();return {overlap:a.left<b.right-1,inView:a.right<=innerWidth};});ok(!r.overlap&&r.inView,'chip ✦ no se superpone '+w+' '+JSON.stringify(r));}
  assert.deepEqual(errors,[]);await ctx.close();
  console.log(`brasas-store: ${checks} checks PASS`);
 }finally{await browser.close();await new Promise(r=>server.close(r));await app.close();fs.rmSync(dir,{recursive:true,force:true});if(oldAdmins===undefined)delete process.env.ADMIN_USERS;else process.env.ADMIN_USERS=oldAdmins;delete process.env.PAYMENTS_PROVIDER;delete process.env.PAYMENTS_WEBHOOK_SECRET;}
})().catch(e=>{console.error(e);process.exitCode=1;});
