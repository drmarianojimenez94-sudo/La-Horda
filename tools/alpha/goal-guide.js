/* El objetivo (SOBREVIVIR) debe estar siempre a la vista: cartel fijo, misión previa (una vez),
 * motivo de la derrota y resumen al ganar la primera arena. Motor real. */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage({viewport:{width:844,height:390}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto((process.env.SITE||'http://127.0.0.1:8805')+'/?lazy=0');
  await page.waitForFunction(()=>typeof startRun==='function'&&typeof goalChipText==='function');
  const r=await page.evaluate(()=>{
   const out={};
   save.champions.mago.unlocked=true;selectedClass='mago';currentArena='ciudad';
   // misión previa: dos páginas la primera vez, ninguna la segunda
   out.mission1=goalMissionPages().length;out.mission2=goalMissionPages().length;
   out.missionTitle=GOAL_MISSION_PAGES[0].title;
   startRun(1);
   updateHUD();
   const chip=document.getElementById('goal-chip');
   out.chip=chip.textContent;out.chipHidden=chip.classList.contains('hidden');
   out.chipCiudad=/proteg/.test(chip.textContent);
   levelTimer=levelDuration-5000;out.chipLeft=goalChipText();
   runLevel=10;out.chipBoss=goalChipText();
   runLevel=3;player.alive=false;out.chipDown=goalChipText();player.alive=true;
   out.whyHtml=goalDefeatHtml(7);
   out.recap=goalVictoryRecapHtml({});
   return out;
  });
  assert.equal(r.mission1,2);assert.equal(r.mission2,0);assert.match(r.missionTitle,/SOBREVIVIR/);
  assert.equal(r.chipHidden,false);assert.match(r.chip,/OBJETIVO: sobrevivir/);assert.ok(r.chipCiudad);
  assert.match(r.chipLeft,/0:05$/);assert.match(r.chipBoss,/jefe/);assert.match(r.chipDown,/levantarte/);
  assert.match(r.whyHtml,/nivel 7 de 10/);assert.match(r.recap,/sobreviviste/);
  await page.screenshot({path:process.env.SHOT||'/tmp/goal-chip.png'});
  assert.deepEqual(errors,[]);
  console.log('PASS goal guide: cartel fijo, misión una vez, motivo de derrota, resumen');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
