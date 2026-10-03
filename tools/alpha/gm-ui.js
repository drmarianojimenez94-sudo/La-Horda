#!/usr/bin/env node
'use strict';
// DOM integration contract: route authorization, form payloads, XSS and landscape overflow.
const {chromium}=require('playwright');
const path=require('path');
const assert=require('node:assert/strict');
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
    '/api/gm/catalog':{arenas:['bosque'],enemies:['slime'],bosses:[]},
    '/api/gm/dashboard':{accounts:3,online:2,metrics:{total:{tutorial_completed:1},dimensions:{champion:{tank:2}}},audit:[],notes:[]},
    '/api/gm/config':{version:4,config:{xp:2,gold:1,drop:1,difficulty:1,enemyHp:1,enemyDamage:1,bossHp:1,eliteRate:1,spawnRate:1}},
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
 assert(await page.evaluate(()=>requests.some(r=>r.method==='PUT'&&r.url==='/api/gm/config'&&r.body.version===4&&r.body.config.xp===3)));
 await page.getByRole('button',{name:'Eventos',exact:true}).click();
 await page.locator('input[name=name]').fill('Invasión');
 await page.locator('input[name=startsAt]').fill('2026-10-02T10:00');
 await page.locator('input[name=endsAt]').fill('2026-10-05T10:00');
 await page.locator('select[name=enemies]').selectOption('slime');
 assert(await page.locator('input[name=boss]').isDisabled());
 await page.getByRole('button',{name:'Crear evento',exact:true}).click();
 assert(await page.evaluate(()=>requests.some(r=>r.url==='/api/gm/events'&&r.method==='POST'&&r.body.enemies[0]==='slime'&&r.body.multipliers.xp===1&&typeof r.body.start==='number')));
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
 for(const width of [667,844,1440]){await page.setViewportSize({width,height:width===1440?900:390});assert(await page.locator('#game-master').evaluate(n=>n.scrollWidth<=n.clientWidth+1),'horizontal overflow '+width);}
 await page.getByRole('button',{name:'Entrar como jugador',exact:true}).click();await page.waitForSelector('#game-master',{state:'detached'});
 await page.evaluate(()=>{allow=false;location.hash='game-master';});await page.getByRole('alert').waitFor();assert.equal(await page.locator('#game-master').count(),0);
 assert.deepEqual(errors,[]);await browser.close();console.log('Game Master UI: PASS (owner route, API payloads, XSS, reset confirmation, 667/844/1440 overflow).');
})().catch(e=>{console.error(e);process.exit(1);});
