'use strict';
// Pasivas de los campeones clásicos (CLASSIC_PASSIVES): cada una hace exactamente lo que dice su ficha.
const assert=require('node:assert/strict'),{spawn}=require('node:child_process'),path=require('node:path');
let chromium;try{({chromium}=require('playwright'));}catch(e){({chromium}=require('/opt/node22/lib/node_modules/playwright'));}
const ROOT=path.resolve(__dirname,'../..'),PORT=+(process.env.PASSIVE_PORT||8839);
const server=spawn('python3',['-m','http.server',String(PORT),'--bind','127.0.0.1'],{cwd:ROOT,stdio:'ignore'});
(async()=>{await new Promise(r=>setTimeout(r,500));
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||chromium.executablePath(),args:['--no-sandbox']});
 try{const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${PORT}/`,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>typeof CLASSIC_PASSIVES!=='undefined'&&typeof startRun==='function',null,{timeout:120000});
  const r=await page.evaluate(()=>{
   const out={};Math.random=()=>0.99; // sin críticos
   const run=k=>{for(const c in save.champions){const s=save.champions[c];s.unlocked=true;s.level=20;}selectedClass=k;currentArena='bosque';lobbyAllies=['tanque','soporte','mago','guerrero'].filter(x=>x!==k).slice(0,3);netMatch=null;startRun(3);setState('playing');enemies=[];spawnTimer=1e9;};
   const dummy=()=>{const e=spawnEnemy('esqueleto');Object.assign(e,{x:player.x+40,y:player.y,hp:1e6,maxHp:1e6,speed:0,dmg:0});return e;};
   // Aldric: aura -8% a aliados a < 200 u; nada fuera ni para él mismo
   run('soporte');const t=heroes.find(h=>h.classKey==='tanque');t.x=player.x+150;t.y=player.y;out.bastionIn=heroDmgTakenMult(player);t.x=player.x+260;out.bastionOut=heroDmgTakenMult(player);out.bastionSelf=classicBastionMult(t);
   // Kael: básico contra sangrante +15%
   run('guerrero');let e=dummy();damageEnemy(e,100,{src:player,fromBasic:true});const plain=1e6-e.hp;e.hp=1e6;e.bleedTimer=2000;e.bleedDmg=0.0001;damageEnemy(e,100,{src:player,fromBasic:true});out.predator=(1e6-e.hp)/plain;
   // Thalen: Vapor (fuego sobre congelado) -> bonus x1,5
   run('mago');e=dummy();e.frozenTimer=2000;const mg=reactionMult(e,100,{},player,2,'fire');run('soporte');e=dummy();e.frozenTimer=2000;const so=reactionMult(e,100,{},player,2,'fire');out.vaporMago=mg;out.vaporOther=so;
   // Elyra: curar a un aliado bajo 35% cura 25% más
   run('soporte');const a=heroes.find(h=>h!==player);a.hp=a.maxHp*0.2;let b0=a.hp;applyHealOverheal(player,a,50);const low=a.hp-b0;a.hp=a.maxHp*0.6;b0=a.hp;applyHealOverheal(player,a,50);out.grace=low/(a.hp-b0);
   // Axiom: bajas por habilidad devuelven 3 de energía, con tope 15/s; los básicos no
   run('axiom');player.energy=0;runElapsedMs+=2000;const deltas=[];for(let i=0;i<8;i++){const x=dummy();x.hp=x.maxHp=5;const e0=player.energy;damageEnemy(x,50,{src:player});deltas.push(Math.round((player.energy-e0)*100)/100);}
   out.recompile=deltas;runElapsedMs+=2000;{const x=dummy();x.hp=x.maxHp=5;const e0=player.energy;damageEnemy(x,50,{src:player,fromBasic:true});out.recompileBasic=player.energy-e0;}
   out.meta=['tanque','guerrero','mago','soporte','axiom'].map(k=>CLASSES[k].passive&&CLASSES[k].passive.name);
   state='menu';return out;});
  assert.equal(r.bastionIn,0.92);assert.equal(r.bastionOut,1);assert.equal(r.bastionSelf,1);
  assert(Math.abs(r.predator-1.15)<0.001,'Depredador +15%: '+r.predator);
  assert(Math.abs((r.vaporMago-1)/(r.vaporOther-1)-1.5)<0.001,'Maestro Elemental x1.5 del bonus: '+r.vaporMago+' vs '+r.vaporOther);
  assert(Math.abs(r.grace-1.25)<0.001,'Gracia del Alba +25%: '+r.grace);
  assert.deepEqual(r.recompile,[3,3,3,3,3,0,0,0],'Recompilar 3 por baja, tope 15/s');assert.equal(r.recompileBasic,0,'los básicos no recompilan');
  assert.deepEqual(r.meta,['Bastión','Depredador','Maestro Elemental','Gracia del Alba','Recompilar']);
  assert.deepEqual(errors,[]);
  console.log('PASS classic passives: Bastión aura, Depredador vs DoT, Maestro Elemental reactions, Gracia del Alba, Recompilar cap');
 }finally{await browser.close();server.kill();}
})().catch(e=>{console.error(e);server.kill();process.exitCode=1;});
