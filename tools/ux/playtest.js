// Scripted experience profiles, not people or age prediction. Gearless arena-level runs.
//   node tools/ux/playtest.js [phase=after]        env: ARENAS=a,b  SEEDS=3 (partidas por perfil y arena)  SHARDS=3 (navegadores en paralelo)
// Con una sola semilla por casilla cada resultado es una moneda al aire; con SEEDS≥3 la tarjeta mide tasas.
// Cada fila registra QUÉ mató al jugador y sus 3 mayores fuentes de daño, para ajustar sin adivinar.
let chromium;try{({chromium}=require('playwright'));}catch(e){({chromium}=require(process.env.PLAYWRIGHT_MODULE||'/opt/node22/lib/node_modules/playwright'));}
const {spawn}=require('child_process'),fs=require('fs'),path=require('path');
const phase=process.argv[2]||'after',port=phase==='before'?'8808':'8807',server=spawn('python3',['-m','http.server',port,'--bind','127.0.0.1'],{stdio:'ignore',cwd:phase==='before'?(process.env.BASELINE_DIR||process.cwd()):process.cwd()});process.on('exit',()=>server.kill());
const SEEDS=Math.max(1,+process.env.SEEDS||3),SHARDS=Math.max(1,+process.env.SHARDS||3);
const PROFILES=process.env.PROFILES?JSON.parse(process.env.PROFILES):[{name:'aprendiz',skill:.45,reaction:650},{name:'ocasional',skill:.7,reaction:400},{name:'habitual',skill:.9,reaction:220}];
// SAME_SEED=1: la misma semilla para todos los perfiles (aísla el efecto de habilidad/reacción del azar de la partida).
// CLASS=x: todos los perfiles juegan con ese guardián (por defecto: habitual con Eren, el resto con el Mago).
const SAME_SEED=!!process.env.SAME_SEED, CLASS=process.env.CLASS||null;
const HOOK=()=>{if(window.__PT)return;const PT=window.__PT={reset(){PT.killer=null;PT.dmg={};}};PT.reset();
  const dh=window.damageHero;window.damageHero=function(h,amount,src){const hp0=h.hp,a0=h.alive;const r=dh(h,amount,src);
    if(h===player){const k=src&&src.type?src.type:(src&&src.from&&src.from.type?src.from.type+'(proj)':(src&&src.kind?'kind:'+src.kind:'fn:'+((new Error().stack||'').split('\n').slice(2,4).map(x=>(x.trim().split(' ')[1]||'?')).join('<'))));
      PT.dmg[k]=(PT.dmg[k]||0)+Math.max(0,hp0-h.hp);if(a0&&!h.alive)PT.killer=k+' L'+runLevel;}return r;};};
async function openPage(browser){const p=await browser.newPage();await p.addInitScript(()=>{window.__campaignMode=true;});await p.goto('http://127.0.0.1:'+port);
  await p.waitForFunction(()=>typeof assetsAllReady==='function'&&assetsAllReady(),null,{timeout:180000});
  await p.addScriptTag({path:path.resolve('tools/playtest/autopilot.js')});await p.evaluate(require('../fortaleza/sim-helpers.js'));await p.evaluate(HOOK);return p;}
(async()=>{await new Promise(r=>setTimeout(r,500));const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});
const errors=[],results=[];const pages=[];for(let i=0;i<SHARDS;i++){const p=await openPage(browser);p.on('pageerror',e=>errors.push(e.message));pages.push(p);}
const maps=process.env.ARENAS?process.env.ARENAS.split(','):await pages[0].evaluate(()=>ARENA_ORDER);
const jobs=[];for(let seed=0;seed<SEEDS;seed++)for(const arena of maps)for(const profile of PROFILES)jobs.push({arena,profile,seed});
const save=()=>fs.writeFileSync(`docs/ux/playtest-${phase}.json`,JSON.stringify({method:`${maps.length} arenas x 3 scripted experience profiles x ${SEEDS} seeds; expected level; no gear; 900s cap`,results:[...results].sort((a,b)=>maps.indexOf(a.arena)-maps.indexOf(b.arena)||PROFILES.findIndex(p=>p.name===a.profile)-PROFILES.findIndex(p=>p.name===b.profile)||a.seed-b.seed),errors},null,2));
async function worker(p){for(let job;(job=jobs.shift());){
 const row=await p.evaluate(({arena,profile,seed,phase,same,cls})=>{
  __AP.on=false;state='menu';netMatch=null;divinaMode=false;diffSetSelected('normal');__PT.reset();
  // semilla 0 = la fórmula histórica (comparable con corridas anteriores)
  let n=(arena.length*7919+(same?0:profile.reaction)+seed*104729)|0||1;Math.random=()=>{n^=n<<13;n^=n>>>17;n^=n<<5;return (n>>>0)/4294967296;};
  for(const [k,c]of Object.entries(save.champions)){c.unlocked=true;c.level=DIFF.arenaLevel[arena]||1;c.xp=0;c.equipment=mkEquipment();c.talents=mkTalentState();c.treeBonus=0;let budget=Math.min(30,c.level-1);const ms=[...c.skillMastery,c.ultMastery];ms.forEach(m=>{m.alloc=0;m.useLvl=1;m.useXp=0;});for(let i=0;i<budget;i++)ms[i%4].alloc++;c.talentPoints=0;}
  save.relics={hp:0,dmg:0,def:0,vel:0};selectedClass=cls||(profile.name==='habitual'?'eren':'mago');save.duoReserve=selectedClass==='mago'?'eren':'mago';currentArena=arena;lobbyAllies=['tanque','soporte','guerrero'];
  __AP.skill=profile.skill;__AP.reaction=profile.reaction;__AP.err=null;
  // Before is the original single-card and Normal multipliers, same bots and seed.
  const norm=DIFF_TIERS.normal,orig={hp:norm.hp,dmg:norm.dmg,bossDmg:norm.bossDmg,spawn:norm.spawn};
  if(phase==='before')Object.assign(norm,{hp:1,dmg:1,bossDmg:1,spawn:1});
  __AP.start(selectedClass,arena,1);if(phase==='before')heroes.forEach(h=>h._duoReserve=null);
  let ms=0;while(ms<900000&&['playing','buff'].includes(state)){const out=__AP.sim(1000,40);ms+=out.t||1000;}
  const top=Object.entries(__PT.dmg).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k,v])=>k+' '+Math.round(v));
  Object.assign(norm,orig);const r={arena,profile:profile.name,seed,level:DIFF.arenaLevel[arena],phase,result:state,seconds:Math.round(ms/1000),wave:runLevel,kills,reserveUsed:!!player._duoUsed,active:player.classKey,boss:boss?{type:boss.type,hp:Math.round(boss.hp),max:boss.maxHp}:null,killer:__PT.killer,topDamage:top,autopilotError:__AP.err};__AP.on=false;clearRunTimers();state='menu';return r;
 },{arena:job.arena,profile:job.profile,seed:job.seed,phase,same:SAME_SEED,cls:CLASS});results.push(row);save();console.log(JSON.stringify(row));}}
await Promise.all(pages.map(worker));
await browser.close();server.kill();if(errors.length||results.some(r=>r.autopilotError))process.exitCode=1;
})().catch(e=>{console.error(e);server.kill();process.exit(1)});
