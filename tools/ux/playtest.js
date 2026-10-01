// Scripted experience profiles, not people or age prediction. Gearless arena-level runs.
const {chromium}=require('playwright'),{spawn}=require('child_process'),fs=require('fs'),path=require('path');
const phase=process.argv[2]||'after',port=phase==='before'?'8808':'8807',server=spawn('python3',['-m','http.server',port],{stdio:'ignore',cwd:phase==='before'?(process.env.BASELINE_DIR||process.cwd()):process.cwd()});process.on('exit',()=>server.kill());
(async()=>{await new Promise(r=>setTimeout(r,500));const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});const p=await browser.newPage();await p.addInitScript(()=>{window.__campaignMode=true;});await p.goto('http://127.0.0.1:'+port);await p.waitForFunction(()=>typeof assetsAllReady==='function'&&assetsAllReady());await p.addScriptTag({path:path.resolve('tools/playtest/autopilot.js')});await p.evaluate(require('../fortaleza/sim-helpers.js'));const errors=[];p.on('pageerror',e=>errors.push(e.message));const maps=process.env.ARENAS?process.env.ARENAS.split(','):await p.evaluate(()=>ARENA_ORDER),results=[];
for(const arena of maps)for(const profile of [{name:'aprendiz',skill:.45,reaction:650},{name:'ocasional',skill:.7,reaction:400},{name:'habitual',skill:.9,reaction:220}]){
 const row=await p.evaluate(({arena,profile,phase})=>{
  __AP.on=false;state='menu';netMatch=null;divinaMode=false;diffSetSelected('normal');
  let n=arena.length*7919+profile.reaction;Math.random=()=>{n^=n<<13;n^=n>>>17;n^=n<<5;return (n>>>0)/4294967296;};
  for(const [k,c]of Object.entries(save.champions)){c.unlocked=true;c.level=DIFF.arenaLevel[arena]||1;c.xp=0;c.equipment=mkEquipment();c.talents=mkTalentState();c.treeBonus=0;let budget=Math.min(30,c.level-1);const ms=[...c.skillMastery,c.ultMastery];ms.forEach(m=>{m.alloc=0;m.useLvl=1;m.useXp=0;});for(let i=0;i<budget;i++)ms[i%4].alloc++;c.talentPoints=0;}
  save.relics={hp:0,dmg:0,def:0,vel:0};selectedClass=profile.name==='habitual'?'eren':'mago';save.duoReserve=selectedClass==='mago'?'eren':'mago';currentArena=arena;lobbyAllies=['tanque','soporte','guerrero'];
  __AP.skill=profile.skill;__AP.reaction=profile.reaction;__AP.err=null;
  // Before is the original single-card and Normal multipliers, same bots and seed.
  const norm=DIFF_TIERS.normal,orig={hp:norm.hp,dmg:norm.dmg,bossDmg:norm.bossDmg,spawn:norm.spawn};
  if(phase==='before')Object.assign(norm,{hp:1,dmg:1,bossDmg:1,spawn:1});
  __AP.start(selectedClass,arena,1);if(phase==='before')heroes.forEach(h=>h._duoReserve=null);
  let ms=0;while(ms<900000&&['playing','buff'].includes(state)){const out=__AP.sim(1000,40);ms+=out.t||1000;}
  Object.assign(norm,orig);const r={arena,profile:profile.name,level:DIFF.arenaLevel[arena],phase,result:state,seconds:Math.round(ms/1000),wave:runLevel,kills,reserveUsed:!!player._duoUsed,active:player.classKey,boss:boss?{type:boss.type,hp:Math.round(boss.hp),max:boss.maxHp}:null,autopilotError:__AP.err};__AP.on=false;clearRunTimers();state='menu';return r;
 },{arena,profile,phase});results.push(row);fs.writeFileSync(`docs/ux/playtest-${phase}.json`,JSON.stringify({method:'10 arenas x 3 scripted experience profiles; one seed per profile/arena; expected level; no gear; 900s cap',results,errors},null,2));console.log(JSON.stringify(row));
}
await browser.close();server.kill();if(errors.length||results.some(r=>r.autopilotError))process.exitCode=1;
})().catch(e=>{console.error(e);server.kill();process.exit(1)});
