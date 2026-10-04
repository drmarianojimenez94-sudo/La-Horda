#!/usr/bin/env node
'use strict';
// DOM integration contract: route authorization, form payloads, XSS and landscape overflow.
const {chromium}=require('playwright');
const path=require('path');
const assert=require('node:assert/strict');
async function realIntegration(browser){
 const fs=require('fs'),os=require('os'),http=require('http');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'horda-gm-ui-'));
 const oldAdmin=process.env.ADMIN_USERS;process.env.ADMIN_USERS='owner';
 const app=require('../../server/accounts').create({dataDir:dir,databaseUrl:'',originAllowed:()=>true,log:()=>{}});
 let server,page;
 try{
  await app.ready;
  server=http.createServer((req,res)=>{
   if(req.url.startsWith('/api/')){app.handle(req,res);return;}
   res.writeHead(200,{'content-type':'text/html'});res.end('<!doctype html><html lang="es"><meta charset="utf-8"><title>GM integration</title><body><div id="hub-options"></div></body></html>');
  });await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
  async function request(method,url,body,token){const r=await fetch(base+url,{method,headers:{'content-type':'application/json',origin:base,...(token?{authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body)});const j=await r.json();assert(r.ok,url+' '+JSON.stringify(j));return j;}
  const owner=(await request('POST','/api/register',{user:'owner',pass:'UI-test-owner-9988'})).token;
  const player=(await request('POST','/api/register',{user:'uitester',pass:'UI-test-player-9988'})).token;
  const save={gold:123,champions:{tanque:{unlocked:true,level:12,xp:80,equipment:{}}},stash:[],cromas:{},cosmeticUnlocks:{}};
  for(const token of [owner,player])await request('PUT','/api/save',{data:save,baseVersion:0},token);
  page=await browser.newPage({viewport:{width:667,height:375}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base);await page.addStyleTag({path:path.resolve(__dirname,'../../css/game-master.css')});
  await page.evaluate(token=>{window.acct={session:{user:'owner',token}};window.accountFetch=async(method,url,body)=>{const r=await fetch(url,{method,headers:{authorization:'Bearer '+acct.session.token,'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,j:await r.json()};};},owner);
  await page.addScriptTag({path:path.resolve(__dirname,'../../js/ui/admin.js')});await page.getByRole('button',{name:'Entrar como Game Master',exact:true}).click();await page.getByRole('heading',{name:'Alpha en vivo'}).waitFor();
  await page.getByRole('button',{name:'Configuración',exact:true}).click();await page.locator('select[name=kind]').selectOption('itemPrices');const priceId=await page.locator('select[name=id]').inputValue();assert(priceId);await page.locator('input[name=price]').fill('77');await page.getByRole('button',{name:'Guardar precio en oro'}).click();await page.getByText('Precio en oro actualizado.',{exact:true}).waitFor();assert.equal((await request('GET','/api/gm/config',undefined,owner)).config.itemPrices[priceId],77);
  await page.locator('input[name=xp]').fill('2');await page.getByRole('button',{name:'Guardar configuración normal'}).click();await page.getByText('Configuración normal guardada.',{exact:true}).waitFor();assert.equal((await request('GET','/api/gm/config',undefined,owner)).config.itemPrices[priceId],77);
  await page.getByRole('button',{name:'Eventos',exact:true}).click();
  await page.locator('input[name=name]').fill('Evento de integración UI');await page.locator('select[name=boss]').selectOption('minotauro');
  const setId=await page.locator('select[name=setId] option').nth(1).getAttribute('value');const cosmeticId=await page.locator('select[name=cosmeticId] option').nth(1).getAttribute('value');
  await page.locator('select[name=setId]').selectOption(setId);await page.locator('select[name=cosmeticId]').selectOption(cosmeticId);
  await page.getByRole('button',{name:'Guardar evento',exact:true}).click();await page.getByRole('heading',{name:'Evento de integración UI',exact:true}).waitFor();
  let event=(await request('GET','/api/gm/events',undefined,owner)).events[0];assert.equal(event.boss,'minotauro');assert.equal(event.set,setId);assert.equal(event.cosmetic,cosmeticId);assert.deepEqual(event.arenas,['laberinto']);assert.equal(event.wave,10);if(process.env.GM_UI_SCREENSHOT)await page.screenshot({path:process.env.GM_UI_SCREENSHOT});
  await page.getByRole('button',{name:'Editar evento',exact:true}).click();await page.locator('input[name=name]').fill('Evento editado UI');await page.getByRole('button',{name:'Guardar evento',exact:true}).click();await page.getByRole('heading',{name:'Evento editado UI',exact:true}).waitFor();
  event=(await request('GET','/api/gm/events',undefined,owner)).events[0];assert.equal(event.name,'Evento editado UI');
  await page.getByRole('button',{name:'Finalizar evento',exact:true}).click();await page.getByText('Evento finalizado; configuración normal conservada.',{exact:true}).waitFor();assert.equal((await request('GET','/api/gm/events',undefined,owner)).events[0].enabled,false);
  await page.getByRole('button',{name:'Jugadores',exact:true}).click();await page.locator('input[name=user]').fill('uitester');await page.getByRole('button',{name:'Buscar jugador'}).click();await page.getByRole('button',{name:/uitester · uitester/i}).click();
  const detail=page.locator('.gm-card').first();await detail.locator('select[name=cosmeticId]').selectOption(cosmeticId);await detail.getByRole('button',{name:'Regalar cosmético',exact:true}).click();await page.getByText(/Regalos entregados: 1/).waitFor();assert.equal((await request('GET','/api/save',undefined,player)).data.cosmeticUnlocks[cosmeticId],true);
  await page.getByRole('button',{name:'Reinicios',exact:true}).click();await page.locator('select[name=resetScope]').selectOption('all');await page.locator('input[name=gold]').check();await page.getByRole('button',{name:'Previsualizar reinicio',exact:true}).click();await page.getByText('Cuentas afectadas: 2',{exact:true}).waitFor();
  await page.locator('input[name=confirmation]').fill('REINICIAR 2 CUENTAS');await page.getByRole('button',{name:'Confirmar reinicio de los datos seleccionados'}).click();await page.getByText('Cuentas reiniciadas y respaldadas: 2. Conflictos: 0.',{exact:true}).waitFor();
  for(const token of [owner,player])assert.equal((await request('GET','/api/save',undefined,token)).data.gold,0);
  assert.equal(fs.readdirSync(dir).filter(n=>n.startsWith('operation-snapshot-')).length,2);
  for(const width of [667,844,1440]){await page.setViewportSize({width,height:width===1440?900:390});for(const tab of ['Resumen','Configuración','Eventos','Noticias y chat','Jugadores','Reinicios','Registro']){await page.getByRole('button',{name:tab,exact:true}).click();await page.waitForFunction(()=>[...document.querySelectorAll('[data-gm-tab]')].every(b=>!b.disabled));assert(await page.locator('#game-master').evaluate(n=>n.scrollWidth<=n.clientWidth+1),'real overflow '+tab+' '+width);}}
  assert.deepEqual(errors,[]);console.log('Game Master real API/browser: PASS (gold prices+preservation, boss/set/reward event, edit/cancel, gift, batch reset+snapshots, all tabs landscape).');
 }finally{await page?.close();if(server)await new Promise(r=>server.close(r));await app.close();fs.rmSync(dir,{recursive:true,force:true});if(oldAdmin===undefined)delete process.env.ADMIN_USERS;else process.env.ADMIN_USERS=oldAdmin;}
}

(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:667,height:375}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setContent('<div id="hub-options"></div>');
 await page.addStyleTag({path:path.resolve(__dirname,'../../css/game-master.css')});
 await page.evaluate(()=>{
  window.acct={session:{user:'test'}};window.requests=[];window.allow=true;
  window.accountFetch=async(method,url,body)=>{requests.push({method,url,body});if(url==='/api/gm/status')return {status:allow?200:403,j:allow?{owner:true,role:'OWNER'}:{msg:'OWNER requerido'}};
   const data={
    '/api/gm/cosmetics':{cosmetics:[{id:'test_skin',name:'Test skin',type:'skin'}]},
    '/api/gm/catalog':{arenas:['bosque'],enemies:['slime'],bosses:['minotauro'],bossArenaMap:{minotauro:'bosque'},sets:['test_set']},
    '/api/gm/dashboard':{accounts:3,online:2,metrics:{total:{tutorial_completed:1},dimensions:{champion:{tank:2}}},audit:[],notes:[]},
    '/api/gm/config':{version:4,config:{itemPrices:{fixture:99},xp:2,gold:1,drop:1,difficulty:1,enemyHp:1,enemyDamage:1,bossHp:1,eliteRate:1,spawnRate:1}},
    '/api/gm/events':{events:[]},'/api/chat':{messages:[{id:'m1',name:'<img src=x onerror=alert(1)>',text:'<script>alert(1)</script>'}]},
    '/api/gm/players?q=test':{players:[{user:'test',name:'Tester'}]},
    '/api/admin/profile':{user:'test',version:4,champions:[{key:'tank',level:12,unlocked:true}]},
    '/api/gm/reset/preview':{token:'preview-token',confirmation:'REINICIAR test',accounts:1},
    '/api/gm/reset/confirm':{ok:true},'/api/gm/gift':{granted:1,conflicts:0,missingSave:0}
   };return {status:200,j:data[url]||{ok:true}};
  };
 });
 await page.addScriptTag({path:path.resolve(__dirname,'../../js/ui/admin.js')});
 await page.getByRole('button',{name:'Entrar como Game Master',exact:true}).click();
 await page.waitForSelector('#game-master');
 await page.getByRole('heading',{name:'Alpha en vivo'}).waitFor();
 assert.equal(await page.locator('.gm-stat').first().innerText(),'2\nEn línea ahora');
 await page.getByRole('button',{name:'Configuración',exact:true}).click();
 await page.locator('input[name=xp]').fill('3');
 await page.getByRole('button',{name:'Guardar configuración normal'}).click();
 assert(await page.evaluate(()=>requests.some(r=>r.method==='PUT'&&r.url==='/api/gm/config'&&r.body.version===4&&r.body.config.xp===3&&r.body.config.itemPrices.fixture===99)));
 await page.getByRole('button',{name:'Eventos',exact:true}).click();
 await page.locator('input[name=name]').fill('Invasión');
 await page.locator('input[name=startsAt]').fill('2026-10-02T10:00');
 await page.locator('input[name=endsAt]').fill('2026-10-05T10:00');
 await page.locator('select[name=enemies]').selectOption('slime');
 await page.locator('select[name=boss]').selectOption('minotauro');await page.locator('select[name=setId]').selectOption('test_set');await page.locator('select[name=cosmeticId]').selectOption('test_skin');assert.equal(await page.locator('input[name=wave]').inputValue(),'10');assert(await page.locator('select[name=arenas]').isDisabled());
 await page.getByRole('button',{name:'Guardar evento',exact:true}).click();
 assert(await page.evaluate(()=>requests.some(r=>r.url==='/api/gm/events'&&r.method==='POST'&&r.body.enemies[0]==='slime'&&r.body.multipliers.xp===1&&r.body.boss==='minotauro'&&r.body.set==='test_set'&&r.body.cosmetic==='test_skin'&&r.body.arenas[0]==='bosque'&&typeof r.body.start==='number')));
 await page.getByRole('button',{name:'Noticias y chat',exact:true}).click();
 await page.getByRole('button',{name:'Fijar este mensaje'}).waitFor();
 assert.equal(await page.locator('#game-master img,#game-master script').count(),0);
 await page.getByRole('button',{name:'Fijar este mensaje'}).click();
 assert(await page.evaluate(()=>requests.some(r=>r.url==='/api/gm/chat/pin'&&r.body.id==='m1')));
 await page.getByRole('button',{name:'Jugadores',exact:true}).click();
 await page.locator('input[name=user]').fill('test');await page.getByRole('button',{name:'Buscar jugador'}).click();
 await page.getByRole('button',{name:'Tester · test'}).click();
 await page.locator('input[name=gold]').check();await page.getByRole('button',{name:'Previsualizar reinicio'}).click();
 await page.locator('input[name=confirmation]').fill('wrong');await page.getByRole('button',{name:'Confirmar reinicio de los datos seleccionados'}).click();
 assert.equal(await page.evaluate(()=>requests.filter(r=>r.url==='/api/gm/reset/confirm').length),0);
 await page.locator('input[name=confirmation]').fill('REINICIAR test');await page.getByRole('button',{name:'Confirmar reinicio de los datos seleccionados'}).click();
 assert(await page.evaluate(()=>requests.some(r=>r.url==='/api/gm/reset/confirm'&&r.body.token==='preview-token')));
 await page.getByRole('button',{name:'Reinicios',exact:true}).click();await page.locator('select[name=resetScope]').selectOption('all');await page.locator('input[name=gold]').check();await page.getByRole('button',{name:'Previsualizar reinicio'}).click();assert(await page.evaluate(()=>requests.some(r=>r.url==='/api/gm/reset/preview'&&r.body.user==='all')));
 for(const width of [667,844,1440]){await page.setViewportSize({width,height:width===1440?900:390});assert(await page.locator('#game-master').evaluate(n=>n.scrollWidth<=n.clientWidth+1),'horizontal overflow '+width);}
 await page.getByRole('button',{name:'Entrar como jugador',exact:true}).click();await page.waitForSelector('#game-master',{state:'detached'});
 await page.evaluate(()=>{allow=false;location.hash='game-master';});await page.getByRole('alert').waitFor();assert.equal(await page.locator('#game-master').count(),0);
 assert.deepEqual(errors,[]);await realIntegration(browser);await browser.close();console.log('Game Master UI: PASS (owner route, API payloads, XSS, reset confirmation, 667/844/1440 overflow).');
})().catch(e=>{console.error(e);process.exit(1);});
