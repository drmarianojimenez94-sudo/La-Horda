'use strict';
/* Coliseo (motor real) por la interfaz: hub → Coliseo → elegir campeón → torneo con el HUD real (mismos botones de habilidad) →
 * marcador de cuatro equipos y mapa de los dos fosos legibles → si caés, barra de espectador (cámara a otro luchador, "otro duelo") →
 * resultado con la tabla → revancha → abandonar → vuelta al hub con el guardado intacto. */
const {chromium}=require('playwright');const {spawn}=require('node:child_process');const path=require('node:path');const assert=require('node:assert/strict');
const PORT=8906,root=path.resolve(__dirname,'../..');
const srv=spawn('python3',['-m','http.server',String(PORT)],{cwd:root,stdio:'ignore'});
const FIX={tut:{training:1},starterChosen:true,starterGiftV1:true,starterSkin:'vale',playtestV1Bonus:true,campaignResetV1:true,campaignResetV2:true};
(async()=>{
 for(let i=0;i<60;i++){try{if((await fetch(`http://127.0.0.1:${PORT}/index.html`)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
 for(const [w,h] of [[844,390],[667,375]]){
  const ctx=await b.newContext({viewport:{width:w,height:h},hasTouch:true});await ctx.addInitScript(f=>{try{localStorage.setItem('laHordaSave_v1',JSON.stringify(f));}catch(e){}},FIX);
  const p=await ctx.newPage(),errs=[];p.on('pageerror',e=>errs.push(e.message));if(process.env.THROTTLE){const cdp=await ctx.newCDPSession(p);await cdp.send('Emulation.setCPUThrottlingRate',{rate:Number(process.env.THROTTLE)});}
  await p.goto(`http://127.0.0.1:${PORT}/index.html?lazy=0`);await p.waitForFunction(()=>typeof setState==='function'&&typeof renderMainMenu==='function'&&typeof colStart==='function',null,{timeout:60000});
  await p.evaluate(()=>{save.tut=save.tut||{};save.tut.training=1;persistNow();setState('mainmenu');renderMainMenu();});
  const before=await p.evaluate(()=>localStorage.getItem('laHordaSave_v1'));
  await p.evaluate(()=>document.getElementById('hub-coliseum-btn').scrollIntoView({block:'center'}));await p.click('#hub-coliseum-btn');
  await p.waitForSelector('#crystalwars-screen:not(.hidden) #practice');
  assert(await p.locator('#champ option').count()>=30,'roster completo');
  await p.selectOption('#champ','guerrero');await p.click('#practice');
  await p.waitForFunction(()=>state==='playing'&&lanesOn()&&LN.mode==='coliseo',null,{timeout:20000});
  const hud=await p.evaluate(()=>({skills:['btn-s1','btn-s2','btn-s3','btn-ult','btn-basic'].map(id=>{const e=document.getElementById(id),r=e&&e.getBoundingClientRect();return !!r&&r.width>0;}),teams:document.querySelectorAll('.col-team').length,map:!!document.querySelector('.col-map canvas'),pill:document.getElementById('hud-level').parentElement.textContent,heroes:heroes.length}));
  assert(hud.skills.every(Boolean),w+': HUD de campaña completo '+JSON.stringify(hud));assert.equal(hud.teams,4,'cuatro equipos en el marcador');assert(hud.map,'mapa de los dos fosos');assert.match(hud.pill,/Ronda/);assert.equal(hud.heroes,8);
  const small=await p.evaluate(()=>[...document.querySelectorAll('#col-hud *')].filter(e=>{const r=e.getBoundingClientRect(),cs=getComputedStyle(e);return r.width>0&&r.height>0&&cs.display!=='none'&&[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim().length>1)&&parseFloat(cs.fontSize)<14;}).map(e=>e.className+':'+e.textContent.trim().slice(0,12)));
  assert.deepEqual(small,[],w+': letra menor a 14 px: '+small.join(','));
  // pasa la cuenta regresiva y el jugador cae en plena pelea → espectador
  await p.waitForFunction(()=>LN.col.phase==='fight',null,{timeout:30000});
  await p.evaluate(()=>{player.invulnTimer=0;damageHero(player,99999,{isPvp:true,from:null});});
  await p.waitForSelector('.col-spec:not(.hidden)',{timeout:5000});
  const sb=await p.evaluate(()=>[...document.querySelectorAll('.col-spec button')].map(b=>{const r=b.getBoundingClientRect();return {h:r.height,w:r.width};}));assert(sb.length===3&&sb.every(x=>x.h>=48&&x.w>=48),w+': botones de espectador >= 48 px '+JSON.stringify(sb));
  assert.equal(await p.evaluate(()=>document.getElementById('downed-overlay').classList.contains('hidden')),true,'sin el cartel de revivir de la campaña');
  const s0=await p.evaluate(()=>CAM_SUBJECT&&CAM_SUBJECT.classKey);assert(s0,'la cámara sigue a otro luchador');
  await p.click('.col-next');const s1=await p.evaluate(()=>LN.col.spec.classKey+LN.col.spec.team);await p.click('.col-pit');
  const pit=await p.evaluate(()=>({spec:LN.col.spec.pit,mine:player.pit}));assert.notEqual(pit.spec,pit.mine,'"otro duelo" salta al otro foso');
  assert.equal(await p.evaluate(()=>CAM_SUBJECT===LN.col.spec),true);
  // el guardado real no se tocó
  assert.equal(await p.evaluate(()=>localStorage.getItem('laHordaSave_v1')),before,'la partida no escribe el guardado real');
  // final rápido: el equipo 1 gana el torneo
  await p.evaluate(()=>{LN.team[1].points=COL.WIN_POINTS-1;colResolve(0,1);LN.col.res[1]||colResolve(1,2);LN.col.phase='inter';LN.col.t0=LN.t-COL.INTER_MS;});
  await p.waitForSelector('#col-result:not(.hidden)',{timeout:12000});
  assert.equal(await p.locator('#col-result tbody tr').count(),4,'tabla con los cuatro equipos');assert.match(await p.textContent('#col-result h2'),/[AÁ]MBAR GANA/);
  assert.equal(await p.evaluate(()=>CAM_SUBJECT),null,'cámara de vuelta a vos al terminar');
  // revancha
  await p.click('#col-result .ln-again');await p.waitForFunction(()=>state==='playing'&&lanesOn()&&LN.mode==='coliseo'&&LN.col.round===1,null,{timeout:20000});
  // abandonar por la pausa
  await p.click('#pause-btn');await p.waitForFunction(()=>state==='paused',null,{timeout:20000});
  for(let attempt=0;attempt<3;attempt++){
    // (como haría una persona: si el diálogo no respondió, se vuelve a intentar; queda registrado)
    if(!(await p.evaluate(()=>gameDialogIsOpen())))await p.click('#quit-btn');await p.waitForTimeout(400);   // (el diálogo ignora clics en sus primeros 250 ms, a propósito)
    await p.getByRole('button',{name:'Abandonar',exact:true}).click();
    try{await p.waitForFunction(()=>state==='mainmenu'&&!lanesOn(),null,{timeout:8000});break;}
    catch(e){const d=await p.evaluate(()=>({state,lanes:lanesOn(),dialog:typeof gameDialogIsOpen==='function'&&gameDialogIsOpen(),pauseHidden:document.getElementById('pause-screen').classList.contains('hidden')}));console.log('REINTENTO abandonar',attempt+1,JSON.stringify(d),'errs='+errs.join(' | '));if(attempt===2)throw new Error('no volvió al menú: '+JSON.stringify(d));}
  }
  assert.equal(await p.evaluate(()=>localStorage.getItem('laHordaSave_v1')),before,'guardado intacto al volver');
  assert.equal(await p.evaluate(()=>document.getElementById('col-hud').style.display==='none'||document.getElementById('col-hud').classList.contains('hidden')),true,'el HUD del Coliseo se oculta');
  assert.deepEqual(errs,[],'sin errores de página: '+errs.join(' | '));console.log(`PASS coliseo flow ${w}x${h}`);await ctx.close();
 }
 await b.close();srv.kill();
})().catch(e=>{console.error(e);srv.kill();process.exit(1);});
