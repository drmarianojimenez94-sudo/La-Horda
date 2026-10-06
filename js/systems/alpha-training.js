"use strict";
/* Training uses the production engine, inputs, mage kit, potions, XP and loot.
 * Only the learning flags survive. Never write the temporary save to disk/cloud.
 * Load after core/boot and optional engine extensions. */
const ALPHA_GUIDE = Object.freeze([
  {level:1, title:"Primeros pasos", text:"Movete con el joystick. Mantené Ataque para golpear al enemigo cercano. Las marcas del suelo avisan ataques: salí antes del impacto. La Arena de entrenamiento permite practicar sin perder progreso."},
  {level:2, title:"Vida, energía y XP", text:"Rojo es vida; azul es energía. Caminá sobre pociones cuando te falte ese recurso. Derrotar enemigos concede XP al campeón. El nivel del campeón permanece; la oleada pertenece a esta partida."},
  {level:3, title:"Botín y equipo", text:"Recogé los objetos del suelo. Revisá Equipamiento antes de la siguiente arena: compará estadísticas y elegí piezas para tu rol. El color indica rareza, no garantiza que la pieza sea mejor para vos."},
  {level:4, title:"Códice y apariencias", text:"El Códice reúne campeones, enemigos, habilidades y colecciones. Probá apariencias desde su ficha. Una skin cambia el aspecto; un croma cambia principalmente la paleta. Ninguno mejora estadísticas."},
  {level:5, title:"Talentos", text:"Revisá el árbol de talentos de tu campeón. Los puntos y requisitos se muestran en cada nodo. Elegí mejoras que acompañen tu forma de jugar; no necesitás distribuirlos todos a ciegas."},
  {level:6, title:"Sets", text:"Las piezas verdes pertenecen a Sets. Consultá piezas faltantes y origen para elegir qué arena repetir. La apariencia de Set es cosmética; los efectos del equipo se describen aparte."},
  {level:7, title:"Fusión", text:"Revisá la fusión en Equipamiento: usá duplicados compatibles y comprobá el resultado antes de confirmar. Conservá las piezas que necesitás para tu Set."},
  {level:8, title:"Multijugador", text:"Creá una sala o ingresá su código. Prepará campeón, equipo, talentos y apariencia antes de estar listo. El anfitrión comienza la partida. Mantené ✚ junto a un aliado caído para revivirlo."},
  {level:9, title:"Galería y colección", text:"Visitá la galería para comparar skins y cromas. Durante Alpha las apariencias habilitadas para pruebas no requieren dinero real. Revisá el origen de cada recompensa en el Códice."},
  {level:10, title:"Maestría y siguiente objetivo", text:"Consultá los requisitos de maestría del campeón: aprender el sistema no elimina sus requisitos. Elegí un Set, una arena o una habilidad para practicar. Volvé a esta Guía cuando lo necesites."}
]);
const ALPHA_TRAINING = {active:false, step:0, elapsed:0, phaseTime:0, doneAt:0, snapshot:null, metrics:{}};
function alphaFirstRunContinue(){
  if(typeof acct!=='undefined'&&(acct.applying||acct.pulling||acct.conflict)){
    showNetToast('Esperá a que termine la sincronización de tu cuenta.');return;
  }
  if(needsStarterChampion() || needsStarterSkin()){
    openStarterSelect(alphaFirstRunContinue);return;
  }
  setState('mainmenu');renderMainMenu();
  if(!HordaOnboarding.ready(save)){alphaTrainingStart();return;}
  alphaOnboardingDestination();
}
function alphaOnboardingDestination(){
  const q=new URLSearchParams(location.search);
  if((q.get('next')!=='crystal-wars'&&q.get('cw')!=='1')||!HordaOnboarding.ready(save))return;
  if(state==='crystalwars'||typeof cwGo!=='function')return;
  const link={};for(const key of ['room','server'])if(q.has(key))link[key]=q.get(key);
  cwGo(link); // Guerra de Cristales es una pantalla del juego (js/ui/menus.js)
}
function alphaTrainingSkip(){
  if(!ALPHA_TRAINING.active)return;
  alphaTrainingRestore(false,true);
  save.tut=save.tut||{};save.tut.trainingSkipped=1;persistNow();
  setState('mainmenu');renderMainMenu();alphaOnboardingDestination();
}
const ALPHA_TRAINING_STEPS = Object.freeze([
  {id:"goal", title:"1 · Tu misión: SOBREVIVIR", text:"En el juego te rodea una horda de monstruos. Tu misión es una sola: SOBREVIVIR. Cada nivel dura un ratito; cuando el reloj llega a cero, los monstruos caen. Se pierde si todos los guardianes del equipo caen. Primero practiquemos.", target:"Leé la misión (se sigue sola)"},
  {id:"move", title:"2 · Movimiento", text:"Practicamos con Thalen; después volvés a tu campeón. Usá el joystick de abajo a la izquierda para moverte.", target:"Movete por la arena"},
  {id:"attack", title:"3 · Ataque básico", text:"Mantené el botón Ataque de la derecha. Tu mago dispara al enemigo cercano. Derrotá al esqueleto.", target:"Derrotá al enemigo con Ataque"},
  {id:"skill", title:"4 · Habilidades", text:"Las habilidades pegan mucho más que el ataque. Tocá una. Si la mantenés y arrastrás, elegís dónde cae.", target:"Lanzá una habilidad"},
  {id:"inspect", title:"5 · Consultar una habilidad", text:"¿Qué hace cada botón? MANTENÉ apretada una habilidad sin arrastrar: aparece su ficha y NO se lanza. Soltá para cerrarla.", target:"Mantené una habilidad para leer su ficha"},
  {id:"cooldown", title:"6 · Recarga", text:"El barrido del botón y el número indican cuánto falta. Esperá a que se llene el MISMO botón que usaste recién (el que está resaltado) y tocalo otra vez.", target:"Volvé a usar la habilidad cuando recargue"},
  {id:"ultimate", title:"7 · Definitiva", text:"La definitiva (botón ★) se carga peleando y se habilita avanzada la arena. Te la cargué: usala contra el grupo.", target:"Lanzá tu definitiva"},
  {id:"danger", title:"8 · Peligro", text:"Una marca roja en el piso avisa un golpe: cuando se llena, pega. Salí de la marca antes de que se llene.", target:"Esquivá el golpe marcado"},
  {id:"potion", title:"9 · Vida y pociones", text:"La barra roja es tu vida. La reduje para practicar: caminá sobre la poción roja a tu derecha. Las azules recuperan energía.", target:"Recogé la poción roja"},
  {id:"xp", title:"10 · Experiencia y nivel", text:"Derrotar enemigos da XP. Te falta muy poco: derrotá otro esqueleto y mirá subir el nivel del campeón (es permanente; el nivel de la arena es solo de esta partida).", target:"Derrotá al esqueleto y subí de nivel"},
  {id:"loot", title:"11 · Botín", text:"Los enemigos pueden dejar equipo. Acercate al objeto luminoso para recogerlo. Después podrás equiparlo fuera de la arena.", target:"Recogé el objeto"},
  {id:"tactical", title:"12 · Panel táctico", text:"Tocá ❚❚ arriba a la derecha: el Panel táctico muestra tu kit, recargas, estados y equipo. Sola pausa; en multijugador la partida SIGUE. Cerralo con Continuar.", target:"Abrí el Panel táctico y volvé"},
  {id:"revive", title:"13 · Reanimar", text:"Elyra cayó. Parate a su lado y MANTENÉ ✚ (unos 5 s). Un golpe no te corta; soltar o alejarte, sí.", target:"Mantené ✚ junto a Elyra hasta revivirla"},
  {id:"objective", title:"14 · Resumen final", text:"Última prueba: derrotá a estos tres enemigos. Recordá: en cada arena SOBREVIVÍS 10 niveles (aguantás hasta que el reloj llegue a cero), en el 10 vences a un jefe y, si caen todos tus guardianes, perdés.", target:"Derrotá a los tres enemigos"}
]);
function alphaTrainingActive(){return ALPHA_TRAINING.active;}
function alphaTrainingEmit(event, extra){ window.dispatchEvent(new CustomEvent("horda-alpha",{detail:Object.assign({event,mode:"training"},extra||{})})); }
function alphaGuideHTML(){ return '<div class="alpha-guide-list">'+ALPHA_GUIDE.map(g=>`<section><h3>Nivel ${g.level} · ${g.title}</h3><p>${g.text}</p></section>`).join('')+'</div>'; }
function alphaGuideOpen(){
  if(ALPHA_TRAINING.active) return;
  let el=document.getElementById('alpha-guide');
  if(!el){el=document.createElement('dialog');el.id='alpha-guide';el.className='alpha-guide';el.innerHTML='<header><h2>CÓDICE · GUÍA DEL HECHICERO</h2><button type="button" data-close>Cerrar</button></header>'+alphaGuideHTML()+'<button type="button" data-train>ARENA DE ENTRENAMIENTO · 3 minutos</button>';document.body.appendChild(el);el.querySelector('[data-close]').onclick=()=>el.close();el.querySelector('[data-train]').onclick=()=>{el.close();alphaTrainingStart();};}
  if(!el.open) el.showModal();
}
function alphaTrainingPanel(){
  let el=document.getElementById('alpha-training-panel'); if(el) return el;
  el=document.createElement('aside');el.id='alpha-training-panel';el.className='alpha-training-panel hidden';
  el.innerHTML='<div><strong></strong><span class="alpha-training-clock"></span><button type="button" aria-label="Saltar tutorial">Saltar tutorial</button></div><p></p><b class="alpha-training-goal" aria-live="polite"></b>';
  el.querySelector('button').onclick=alphaTrainingSkip;document.body.appendChild(el);return el;
}
function alphaTrainingSpawn(n){
  ALPHA_TRAINING.foes=[];
  for(let i=0;i<n;i++){const e=spawnEnemy('esqueleto',false,false);ALPHA_TRAINING.foes.push(e);e.x=player.x+100+i*40;e.y=player.y+(i-1)*35;e.hp=e.maxHp=30;e.dmg=1;e.speed=14;e.xp=ALPHA_TRAINING_STEPS[ALPHA_TRAINING.step].id==='xp'?150:0;}
}
function alphaTrainingEnterStep(){
  const t=ALPHA_TRAINING,s=ALPHA_TRAINING_STEPS[t.step];t.phaseTime=0;t.doneAt=0;t.metrics={x:player.x,y:player.y,distance:0,kills:player.stats.kills||0,casts:player.stats.skillCasts||0,ult:player.ultCd||0,level:save.champions.mago.level,loot:0};
  enemies=[];projectiles=[];potions=[];groundLootReset();
  document.querySelectorAll('.alpha-training-target').forEach(el=>el.classList.remove('alpha-training-target'));
  const ids={move:'joy-base',attack:'btn-basic',skill:'btn-s1',inspect:'btn-s2',cooldown:'btn-s'+((t.lastSkill||0)+1),ultimate:'btn-ult',danger:'joy-base',potion:'joy-base',xp:'btn-basic',loot:'joy-base',tactical:'pause-btn',revive:'btn-revive',objective:'btn-basic'},target=document.getElementById(ids[s.id]);if(target)target.classList.add('alpha-training-target');
  if(['attack','skill','cooldown','xp','objective'].includes(s.id)) alphaTrainingSpawn(s.id==='objective'?3:1);
  if(s.id==='ultimate'){runLevel=Math.max(runLevel,ULT_MIN_ARENA_LEVEL);player.ultCharge=player.ultMax;player.ultCd=0;alphaTrainingSpawn(3);}
  if(s.id==='potion'){player.hp=player.maxHp*.45;dropPotion(player.x+110,player.y,'heal');t.potion=potions[potions.length-1];t.potion.life=300000;}
  if(s.id==='xp')save.champions.mago.xp=xpToNext(save.champions.mago.level)-1;
  if(s.id==='loot')t.loot=groundLootDrop(player.x+70,player.y,'B',1,'ciudad','training',false);
  if(s.id==='danger')alphaTrainingDanger();
  if(s.id==='revive')alphaTrainingDowned();
  const arenaLabel=document.getElementById('hud-arena');if(arenaLabel)arenaLabel.textContent='Entrenamiento';
  const el=alphaTrainingPanel();el.classList.remove('hidden');el.querySelector('strong').textContent=s.title;el.querySelector('p').textContent=s.text;el.querySelector('.alpha-training-goal').textContent='▶ '+s.target;
  alphaTrainingEmit('tutorial_step',{step:s.id});
}
// Peligro: un golpe marcado en el piso (vfxTelegraph real) sobre el jugador; si al llenarse ya salió, aprendió.
function alphaTrainingDanger(){
  const t=ALPHA_TRAINING,r=95,delay=1900;
  t.danger={x:player.x,y:player.y,r,at:t.phaseTime+delay};
  bossStrike(player.x,player.y,r,delay,Math.round(player.maxHp*0.06),'slam');
}
// Reanimar: una aliada caída de verdad (héroe del motor) y un esqueleto que pega poco mientras revivís.
function alphaTrainingDowned(){
  const t=ALPHA_TRAINING,a=makeHero('soporte',true,player.x+130,player.y+10);
  a.alive=false;a.hp=0;allies.push(a);heroes.push(a);t.ally=a;
  const e=spawnEnemy('esqueleto',false,false);e.x=a.x+60;e.y=a.y;e.hp=e.maxHp=9999;e.dmg=1;e.speed=40;e.xp=0;
}
function alphaTrainingSatisfied(id,m,h){
  if(id==='goal') return ALPHA_TRAINING.phaseTime>=7000;
  if(id==='move') return m.distance>=200;
  if(id==='attack') return (h.stats.kills||0)>m.kills;
  if(id==='skill') return (h.stats.skillCasts||0)>m.casts;
  if(id==='cooldown') return m.recast===true;
  if(id==='ultimate') return h.ultCd>0;
  if(id==='potion') return m.potionPicked===true;
  if(id==='xp') return m.newLevel>m.level;
  if(id==='loot') return m.loot>0||ALPHA_TRAINING.phaseTime>=20000; // si el objeto quedó inalcanzable (lava, pared), el paso se da por hecho a los 20 s
  if(id==='objective') return !!ALPHA_TRAINING.foes&&ALPHA_TRAINING.foes.length>=3&&ALPHA_TRAINING.foes.every(e=>!e.alive); // el equipo cuenta: Elyra también pelea
  if(id==='inspect') return m.inspected===true;
  if(id==='danger') return m.dodged===true;
  if(id==='tactical') return m.tactical===true;
  if(id==='revive') return !!(ALPHA_TRAINING.ally&&ALPHA_TRAINING.ally.alive);
  return false;
}
function alphaTrainingTick(dt){
  const t=ALPHA_TRAINING;if(!t.active||state!=='playing')return;
  t.elapsed+=dt;t.phaseTime+=dt;
  // Learning has no time limit. Only completion or an explicit skip unlocks modes.
  const s=ALPHA_TRAINING_STEPS[t.step],m=t.metrics;
  m.distance+=Math.hypot(player.x-m.x,player.y-m.y);m.x=player.x;m.y=player.y;
  m.newLevel=save.champions.mago.level;
  m.potionPicked=!!t.potion&&t.potion.life<=0&&player.hp>player.maxHp*.5;
  if(s.id==='danger'&&t.danger&&t.phaseTime>=t.danger.at){const out=Math.hypot(player.x-t.danger.x,player.y-t.danger.y)>t.danger.r+(player.radius||18)*0.5;t.danger=null;if(out)m.dodged=true;else{showNetToast&&showNetToast('¡Te alcanzó! Salí de la marca antes de que se llene.');alphaTrainingDanger();}}
  const el=alphaTrainingPanel();el.querySelector('.alpha-training-clock').textContent='Sin límite';
  if(!t.doneAt&&alphaTrainingSatisfied(s.id,m,player)){t.doneAt=t.phaseTime;el.querySelector('.alpha-training-goal').textContent='✓ Completado';alphaTrainingEmit('tutorial_step_complete',{step:s.id});}
  if(t.doneAt&&t.phaseTime-t.doneAt>1300){t.step++;if(t.step===ALPHA_TRAINING_STEPS.length)alphaTrainingExit(true);else alphaTrainingEnterStep();}
}
function alphaTrainingStart(){
  if(ALPHA_TRAINING.active||!['mainmenu','codex','modeselect'].includes(state))return false;
  if(netMatch||(typeof netInRoom==='function'&&netInRoom())){if(typeof showNetToast==='function')showNetToast('Salí de la sala multijugador antes de entrar al entrenamiento.');return false;}
  if(typeof acct!=='undefined'&&(acct.applying||acct.pulling||acct.conflict)){if(typeof showNetToast==='function')showNetToast('Esperá a que termine la sincronización de tu cuenta.');return false;}
  persistNow();
  const t=ALPHA_TRAINING;t.snapshot={save,selectedClass,currentArena,divinaMode,lobbyAllies,endlessActive,endlessPending};t.active=true;t.step=0;t.elapsed=0;
  save=defaultSave();save.champions.mago.unlocked=true;selectedClass='mago';currentArena='training';divinaMode=false;endlessActive=false;endlessPending=false;lobbyAllies=null;
  try{startRun(1);allies=[];heroes=[player];enemies=[];bossActive=true;midBossSpawned=true;levelDuration=1e9;levelTimer=0;tutHide();alphaTrainingEnterStep();alphaTrainingEmit('tutorial_started');return true;}
  catch(err){alphaTrainingExit(false);throw err;}
}
function alphaTrainingRestore(completed,skipped=false){
  const t=ALPHA_TRAINING;if(!t.active)return;
  const snap=t.snapshot;
  clearRunTimers();resetRunTransients();basicHeld=false;
  save=snap.save;selectedClass=snap.selectedClass;currentArena=snap.currentArena;divinaMode=snap.divinaMode;lobbyAllies=snap.lobbyAllies;endlessActive=snap.endlessActive;endlessPending=snap.endlessPending;
  t.active=false;t.snapshot=null;enemies=[];allies=[];heroes=[];player=null;bossActive=false;runEnding=false;
  alphaTrainingPanel().classList.add('hidden');document.querySelectorAll('.alpha-training-target').forEach(el=>el.classList.remove('alpha-training-target'));
  if(completed){save.tut=save.tut||{};save.tut.training=1;save.tut.basics=1;save.tut.b_move=save.tut.b_attack=save.tut.b_skill=1;persistNow();}
  alphaTrainingEmit(completed?'tutorial_completed':skipped?'tutorial_skipped':'tutorial_abandoned',{step:t.step,duration:Math.round(t.elapsed/1000)});
}
function alphaTrainingExit(completed,message){
  if(!ALPHA_TRAINING.active)return;alphaTrainingRestore(completed);setState('mainmenu');renderMainMenu();
  if(typeof showNetToast==='function')showNetToast(message||(completed?'Entrenamiento completado. Tu próxima aventura: Arena 1.':'Entrenamiento cerrado. Tu progreso se conserva.'));
  if(completed)alphaOnboardingDestination();
}
function alphaOnboardingLesson(level,seen){
  const available=ALPHA_GUIDE.filter(g=>g.level<=Math.max(1,Math.min(10,level||1)));
  return available.find(g=>!seen[g.level])||null;
}
function alphaOnboardingMenu(){
  if(ALPHA_TRAINING.active)return;
  const host=document.querySelector('.hub-modes');if(!host)return;
  let card=document.getElementById('alpha-onboarding');
  if(!card){
    card=document.createElement('section');card.id='alpha-onboarding';
    card.innerHTML='<button type="button" data-train>ARENA DE ENTRENAMIENTO · 3 min</button><details><summary></summary><p></p><div class="alpha-onboarding-actions"><button type="button" data-guide>Consultar Guía</button><button type="button" data-understood>Entendido</button></div></details>';
    host.appendChild(card);card.querySelector('[data-train]').onclick=alphaTrainingStart;card.querySelector('[data-guide]').onclick=alphaGuideOpen;
    card.querySelector('[data-understood]').onclick=()=>{
      const level=Number(card.dataset.lesson);if(!level)return;
      save.tut=save.tut||{};save.tut.onboarding=save.tut.onboarding||{};save.tut.onboarding[level]=1;persist();
      alphaTrainingEmit('guide_lesson_acknowledged',{level});alphaOnboardingMenu();
    };
  }
  const c=save.champions[selectedClass]||{},level=Math.max(1,Math.min(10,c.level||1)),seen=(save.tut&&save.tut.onboarding)||{},g=alphaOnboardingLesson(level,seen);
  card.dataset.lesson=g?String(g.level):'';
  card.querySelector('summary').textContent=g?`El Hechicero · Nivel ${g.level}: ${g.title}`:'El Hechicero · Guía al día';
  card.querySelector('p').textContent=g?g.text:'Ya revisaste los consejos disponibles para este campeón. Podés volver a consultar la Guía cuando quieras.';
  card.querySelector('[data-understood]').hidden=!g;
  card.querySelector('[data-train]').textContent=save.tut&&save.tut.training?'REPETIR ENTRENAMIENTO · 3 min':'ARENA DE ENTRENAMIENTO · 3 min';
}
(function installAlphaTraining(){
  ARENA_MODS.training=Object.assign({},ARENA_MODS.bosque,{label:'Arena de entrenamiento',enemyRegenPct:0,hazard:null,heroDmgMult:1});
  if(typeof FLOOR_THEME!=='undefined')FLOOR_THEME.training=FLOOR_THEME.bosque;
  const persistBase=persist,persistNowBase=persistNow,updateBase=update,stateBase=setState,tutBase=tutTick,menuBase=renderMainMenu;
  renderMainMenu=function(){const r=menuBase.apply(this,arguments);alphaOnboardingMenu();return r;};
  persist=function(){if(!ALPHA_TRAINING.active)return persistBase.apply(this,arguments);};
  persistNow=function(){if(!ALPHA_TRAINING.active)return persistNowBase.apply(this,arguments);};
  update=function(dt){if(ALPHA_TRAINING.active){bossActive=true;levelTimer=0;player.hp=Math.max(player.hp,player.maxHp*.2);player.energy=player.maxEnergy;}const r=updateBase.apply(this,arguments);alphaTrainingTick(dt);return r;};
  setState=function(s){if(ALPHA_TRAINING.active&&!['playing','paused'].includes(s))alphaTrainingRestore(false);const r=stateBase.apply(this,arguments);if(s==='mainmenu')alphaOnboardingMenu();return r;};
  tutTick=function(){if(!ALPHA_TRAINING.active)return tutBase.apply(this,arguments);};
  const skillBase=useSkill,ultimateBase=useUltimate;
  const stepIdx=id=>ALPHA_TRAINING_STEPS.findIndex(x=>x.id===id);
  useSkill=function(){if(ALPHA_TRAINING.active&&ALPHA_TRAINING.step<stepIdx('skill'))return false;return skillBase.apply(this,arguments);};
  useUltimate=function(){if(ALPHA_TRAINING.active&&ALPHA_TRAINING.step<stepIdx('ultimate'))return;return ultimateBase.apply(this,arguments);};
  const castBase=castAbility;castAbility=function(h,sk,isUlt,idx){const before=h&&h.stats?h.stats.skillCasts||0:0;const r=castBase.apply(this,arguments);if(ALPHA_TRAINING.active&&h===player&&!isUlt&&(h.stats.skillCasts||0)>before){const t=ALPHA_TRAINING;if(ALPHA_TRAINING_STEPS[t.step].id==='skill')t.lastSkill=idx===undefined?0:idx;if(ALPHA_TRAINING_STEPS[t.step].id==='cooldown'&&(idx===undefined?0:idx)===t.lastSkill)t.metrics.recast=true;}return r;};
  const lootBase=groundLootPick;groundLootPick=function(g){const r=lootBase.apply(this,arguments);if(r&&ALPHA_TRAINING.active)ALPHA_TRAINING.metrics.loot++;return r;};
  if(typeof abilityInspectorOpen==='function'){const ib=abilityInspectorOpen;abilityInspectorOpen=function(){const r=ib.apply(this,arguments);if(r&&ALPHA_TRAINING.active)ALPHA_TRAINING.metrics.inspected=true;return r;};}
  if(typeof tacticalPanelOpen==='function'){const tb=tacticalPanelOpen;tacticalPanelOpen=function(){const r=tb.apply(this,arguments);if(ALPHA_TRAINING.active)ALPHA_TRAINING.metrics.tactical=true;return r;};}
  window.alphaGuideOpen=alphaGuideOpen;window.alphaGuideHTML=alphaGuideHTML;window.alphaTrainingStart=alphaTrainingStart;
  alphaOnboardingMenu();
})();
