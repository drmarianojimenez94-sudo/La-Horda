'use strict';
// Briefing pre-arena + micro-tutorial jugable del Reino Fúngico (Arena Bible §7):
//  - cada arena con ficha muestra mecánica, peligro (con aviso), jefe y botín destacado (piezas ✓/?).
//  - Reino Fúngico, primera vez: aparece un núcleo de práctica; los pasos avanzan SOLO cuando el jugador
//    lo hace (ver la colonia, entrar al territorio y sentir la lentitud, romper el núcleo, ver la retirada);
//    queda guardado y la segunda partida no lo repite; "saltar" también lo guarda.
const assert=require('node:assert/strict'),{spawn}=require('node:child_process'),path=require('node:path');
let chromium;try{({chromium}=require('playwright'));}catch(e){({chromium}=require('/opt/node22/lib/node_modules/playwright'));}
const ROOT=path.resolve(__dirname,'../..'),PORT=+(process.env.BRIEF_PORT||8836);
const server=spawn('python3',['-m','http.server',String(PORT),'--bind','127.0.0.1'],{cwd:ROOT,stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 await sleep(500);
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||chromium.executablePath(),args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:844,height:390}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${PORT}/`,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof runIntroShow==='function'&&typeof arenaTutTick==='function'&&typeof micSpawnNucleo==='function',null,{timeout:120000});
  // 1) briefing de todas las arenas con ficha
  const brief=await page.evaluate(()=>ARENA_ORDER.map(a=>{runIntroShow(a,()=>{});RUN_INTRO.pages=[];RUN_INTRO.prologue=false;runIntroFill(document.getElementById('run-intro'),a,ARENA_BRIEF[a]);
    const el=document.querySelector('#run-intro .abr');const r={a,cells:el?el.querySelectorAll('.abr-cell').length:0,txt:el?el.innerText:'',pieces:el?el.querySelectorAll('.abr-piece').length:0};
    RUN_INTRO.open=false;document.getElementById('run-intro').classList.add('hidden');return r;}));
  for(const b of brief){assert.equal(b.cells,4,`${b.a}: 4 briefing cells`);assert(/AVISO/i.test(b.txt),`${b.a}: hazard telegraph shown`);assert(b.pieces>=4,`${b.a}: featured set pieces`);}
  // 2) micro-tutorial fúngico, primera vez
  const r=await page.evaluate(async()=>{
   for(const ck in save.champions){const s=save.champions[ck];s.unlocked=true;s.level=20;}
   save.tut=save.tut||{};save.tut.basics=1;save.tut.b_move=save.tut.b_attack=save.tut.b_skill=1;if(save.tut.arena)delete save.tut.arena.micelial;
   selectedClass='mago';currentArena='micelial';lobbyAllies=['tanque','soporte','guerrero'];netMatch=null;startRun(1);setState('playing');
   enemies=enemies.filter(e=>e.structure);spawnTimer=1e9;for(const h of heroes)h.hp=h.maxHp=1e7;
   const step=n=>{for(let i=0;i<n;i++){update(16);tutTick();}};
   const log=[];const cur=()=>ARENA_TUT.arena?ARENA_BLUEPRINTS.micelial.tutorial.steps[ARENA_TUT.step]?.id:null;
   step(140); // entrada (1,8 s)
   const nuc=enemies.find(e=>e._tut);log.push(['spawned',!!nuc,cur(),TUT.key]);
   // no avanza solo: 3 s lejos del núcleo
   player.x=nuc.x+900;player.y=nuc.y;clampToArena(player);step(60);log.push(['far',cur()]);
   // se acerca: ve la colonia
   const p=micPointNear(nuc.x,nuc.y,nuc.nuc.rr+80,nuc.nuc.rr+120,20);player.x=p.x;player.y=p.y;step(200);log.push(['saw',cur(),JSON.stringify({saw:ARENA_TUT.data&&ARENA_TUT.data.saw,alive:nuc.alive,d:Math.hypot(nuc.x-player.x,nuc.y-player.y),rr:nuc.nuc.rr,st:state,t:ARENA_TUT.stepT})]);
   // entra al territorio: lentitud
   player.x=nuc.x+20;player.y=nuc.y+30;for(let i=0;i<80;i++){player.x=nuc.x+20;player.y=nuc.y+30;update(16);tutTick();}log.push(['slowed',cur(),player.slowAmt>0]);
   // rompe el núcleo
   damageEnemy(nuc,1e9,{src:player});step(30);log.push(['killed',cur(),micS.recede.length]);
   step(200);log.push(['done',ARENA_TUT.arena,arenaTutorialSeen('micelial')]);
   // segunda partida: no se repite
   startRun(1);setState('playing');enemies=enemies.filter(e=>e.structure);spawnTimer=1e9;step(200);log.push(['again',enemies.some(e=>e._tut),ARENA_TUT.arena]);
   // saltar también guarda
   delete save.tut.arena.micelial;startRun(1);setState('playing');step(140);const hadNuc=enemies.some(e=>e._tut);arenaTutSkip();log.push(['skip',hadNuc,arenaTutorialSeen('micelial'),ARENA_TUT.arena]);
   state='menu';return log;});
  const L=Object.fromEntries(r.map(x=>[x[0],x.slice(1)]));
  assert.equal(L.spawned[0],true,'practice nucleus spawned');assert.equal(L.spawned[1],'colony');assert.equal(L.spawned[2],'atut_micelial_colony','Hechicero says the step');
  assert.equal(L.far[0],'colony','does not advance without the player doing it');
  assert.equal(L.saw[0],'spores','seeing the colony advances: '+L.saw[1]);
  assert.equal(L.slowed[1],true,'infection slows the hero');assert.equal(L.slowed[0],'nest','feeling the slow advances');
  assert.equal(L.killed[0],'recede','breaking the nest advances');assert(L.killed[1]>=1,'infection recedes');
  assert.deepEqual(L.done,[null,true],'completed and persisted');
  assert.deepEqual(L.again,[false,null],'not repeated');
  assert.deepEqual(L.skip,[true,true,null],'skip persists');
  // 3) Gélida e Infernal: lecciones jugables propias (la factory no es de una sola arena)
  const r2=await page.evaluate(()=>{
   const step=n=>{for(let i=0;i<n;i++){update(16);tutTick();}};const cur=a=>ARENA_TUT.arena===a?ARENA_BLUEPRINTS[a].tutorial.steps[ARENA_TUT.step]?.id:null;
   const begin=a=>{if(save.tut.arena)delete save.tut.arena[a];selectedClass='mago';currentArena=a;lobbyAllies=['tanque','soporte','guerrero'];startRun(1);setState('playing');enemies=[];spawnTimer=1e9;for(const h of heroes)h.hp=h.maxHp=1e7;step(140);};
   const out={};
   begin('hielo');const br=ARENA_TUT.data&&ARENA_TUT.data.br;out.h0=[cur('hielo'),br&&br.lit];
   step(60);out.h1=cur('hielo'); // sin moverse no avanza
   for(let i=0;i<60;i++){player.x+=8;clampToArena(player);update(16);tutTick();}out.h2=cur('hielo');
   hieLight(br,'fire');step(30);out.h3=[ARENA_TUT.arena,arenaTutorialSeen('hielo')];
   begin('infernal');const f=ARENA_TUT.data&&ARENA_TUT.data.f;out.i0=[cur('infernal'),!!f];
   step(60);out.i1=cur('infernal');f.done=true;step(30);out.i2=[ARENA_TUT.arena,arenaTutorialSeen('infernal')];
   state='menu';return out;});
  assert.deepEqual(r2.h0,['cold',false],'Gélida: lesson starts with an extinguished brazier');
  assert.equal(r2.h1,'cold','Gélida: standing still does not advance');assert.equal(r2.h2,'brazier','Gélida: moving advances');
  assert.deepEqual(r2.h3,[null,true],'Gélida: lighting the brazier completes and persists');
  assert.deepEqual(r2.i0,['fissure',true],'Infernal: practice fissure opened');assert.equal(r2.i1,'fissure','Infernal: waits for the player');
  assert.deepEqual(r2.i2,[null,true],'Infernal: closing completes and persists');
  assert.deepEqual(errors,[]);
  console.log('PASS arena briefing (10 arenas: mechanic, hazard+telegraph, boss, featured set) + micro-tutorials fúngico/gélida/infernal (teach→do→confirm, persisted, skip)');
 }finally{await browser.close();server.kill();}
})().catch(e=>{console.error(e);server.kill();process.exitCode=1;});
