'use strict';
// Workshop only: deliberately absent from index.html until production gates pass.
// Loaded by tools/quality-five/functional.js into the real game engine.
const SOLCIJU_KIT = [
  {name:'Vino maldito',action:'sol_wine',cost:24,cd:6200,range:300,radius:85,duration:1800,dmgMult:.9,desc:'Salpica vino en un área y añade una marca de fermentación.'},
  {name:'Barrica añeja',action:'sol_cask',cost:30,cd:8500,range:240,radius:100,duration:2400,dmgMult:1.3,desc:'Coloca una barrica que estalla tras 2,4 s. Máximo dos; reemplazar una no la detona.'},
  {name:'Brindis a solas',action:'sol_toast',cost:26,cd:11000,range:0,radius:120,duration:3000,dmgMult:0,desc:'Obtiene 15% de armadura durante 3 s y recupera 4% de vida máxima.'},
  {name:'Gran Reserva',action:'sol_reserve',cost:0,cd:36000,range:280,radius:160,duration:4000,dmgMult:.35,desc:'Cuatro pulsos de vino dañan y ralentizan enemigos. Protege a aliados dentro del área.'}
].map(s=>({...s,kind:'expedition',ico:'✦'}));

function solcijuMark(h,e,add=0){
  const slot=heroes.indexOf(h);
  if(slot<0)return {n:0,until:0};
  const marks=e._solMarks||(e._solMarks={});
  const m=marks[slot]||(marks[slot]={n:0,until:0});
  if(m.until<=runElapsedMs)m.n=0;
  if(add&&e.alive&&!(e.cineT>0)){m.n=Math.min(3,m.n+add);m.until=runElapsedMs+5000;}
  return m;
}
function solcijuFlag(h,i,flag){return !!talentSkillMods(h.classKey,i).flags[flag];}
function solcijuTargets(h,p,r){return portadorEnemies(h).filter(e=>!(e.cineT>0)&&distance(e,p)<=r+(e.radius||0)).sort((a,b)=>distance(a,p)-distance(b,p)).slice(0,12);}
function solcijuHit(h,e,dmg,mark=true){
  const m=solcijuMark(h,e),ripe=m.n===3;
  if(ripe)m.n=0;
  portadorWith(h,()=>portadorHit(h,e,dmg*(ripe?1.25:1),true));
  if(e.alive){if(ripe)portadorSlow(h,e,.35,1200);if(mark)solcijuMark(h,e,1);}
}
function solcijuObject(h,kind,p,life,data,cap){
  portadorLimit(h,kind,cap);
  portadorObjects=portadorObjects.filter(o=>o.life>0);
  return portadorAdd(h,kind,p,life,{solciju:true,...data});
}
function solcijuAllies(h,p,r){
  // Never buff opponents in Crystal Wars, even if they share the heroes array.
  const team=divinaMode&&divinaEnemies.includes(h)?divinaEnemies:heroes;
  return team.filter(a=>a.alive&&!a.fused&&distance(a,p)<=r);
}
function solcijuCast(h,sk,isUlt,dmg,area,dur){
  if(!h.alive||h.fused)return;
  const r=Math.min(230,sk.radius*area),life=Math.min(6000,sk.duration*dur);
  const p=sk.range?portadorPoint(h,Math.min(400,sk.range*area),r):h;
  h.portCastState=isUlt?'ultimate':'cast';h.portCastUntil=runElapsedMs+(isUlt?650:420);
  if(isUlt)h._ultLockUntil=Math.max(h._ultLockUntil||0,runElapsedMs+life);
  switch(sk.action){
    case 'sol_wine':
      for(const e of solcijuTargets(h,p,r))solcijuHit(h,e,dmg);
      if(solcijuFlag(h,0,'lees'))solcijuObject(h,'sol_lees',p,2000,{r,dmg:dmg*.15,left:2,interval:1000,tick:1000},2);
      break;
    case 'sol_cask':
      solcijuObject(h,'sol_cask',p,life,{r,dmg},2);break;
    case 'sol_toast':{
      const share=solcijuFlag(h,2,'hospitality');
      for(const a of share?solcijuAllies(h,h,r):[h]){
        kitBuff(h,a,life,{armor:.15,label:'BRINDIS'});
        exHeal(h,a,.04);
      }
      break;
    }
    case 'sol_reserve':
      if(solcijuFlag(h,'ult','cellarRelease'))for(const o of portadorOwned(h,'sol_cask'))if(distance(o,p)<=r)solcijuUpdate(o,o.life);
      solcijuObject(h,'sol_reserve',p,life,{r,dmg,left:4,interval:life/4,tick:life/4},1);break;
  }
  kitFx(sk.action==='sol_toast'?'shield':'dark',p.x,p.y,r,{ult:!!isUlt});
}
function solcijuUpdate(o,dt){
  if(!o.solciju)return false;
  const h=o.owner;
  if(!h||!h.alive||h.fused||!heroes.includes(h)){o.life=0;return true;}
  if(currentArena==='abismo'&&abS&&!abWalkable(o.x,o.y)){o.life=0;return true;}
  const elapsed=Math.min(Math.max(0,dt),o.life);o.life=Math.max(0,o.life-elapsed);
  if(o.kind==='sol_cask'){
    if(o.life===0){
      for(const e of solcijuTargets(h,o,o.r))solcijuHit(h,e,o.dmg);
      kitFx('dark',o.x,o.y,o.r);
      if(solcijuFlag(h,1,'cellar'))for(const a of solcijuAllies(h,o,o.r))kitBuff(h,a,2000,{armor:.1,label:'BODEGA'});
    }
    return true;
  }
  o.tick-=elapsed;
  while(o.left>0&&o.tick<=0){
    o.left--;o.tick+=o.interval;
    for(const e of solcijuTargets(h,o,o.r)){
      solcijuHit(h,e,o.dmg,o.kind==='sol_reserve');
      if(o.kind==='sol_reserve'&&solcijuFlag(h,'ult','concentrate'))solcijuMark(h,e,1);
      if(o.kind==='sol_reserve')portadorSlow(h,e,.25,1100);
    }
    if(o.kind==='sol_reserve'){
      for(const a of solcijuAllies(h,o,o.r))kitBuff(h,a,1200,{armor:.1,label:'RESERVA'});
      if(solcijuFlag(h,'ult','reserveHeal'))for(const a of solcijuAllies(h,o,o.r))exHeal(h,a,.01);
    }
    kitFx('dark',o.x,o.y,o.r);
  }
  return true;
}
// Reuse the established cast/object dispatchers; no change to other champions.
const solOriginalCast=expeditionCast;
expeditionCast=function(h,sk,...args){return sk.action?.startsWith('sol_')?solcijuCast(h,sk,...args):solOriginalCast(h,sk,...args);};
const solOriginalObject=ynaraUpdateObject;
ynaraUpdateObject=function(o,dt){return solcijuUpdate(o,dt)||solOriginalObject(o,dt);};
const solOriginalDamage=damageEnemy;
damageEnemy=function(e,amount,opts={}){
  const h=opts.src,before=e.hp,result=solOriginalDamage(e,amount,opts);
  if(h?.classKey==='solciju'&&opts.fromBasic&&!opts.fromProc&&e.hp<before&&e.alive&&!(e.cineT>0))solcijuMark(h,e,1);
  return result;
};
const solOriginalHero=updatePortadorHero;
updatePortadorHero=function(h,dt){solOriginalHero(h,dt);if(h.classKey==='solciju'&&(!h.alive||h.fused)){
  for(const o of portadorObjects)if(o.owner===h&&o.solciju)o.life=0;
  for(const e of portadorEnemies(h))if(e._solMarks)delete e._solMarks[heroes.indexOf(h)];
}};
NET_SKIP_KEYS.add('_solMarks');
// Crystal Wars basics bypass damageEnemy. Track only the synchronous basic hit,
// so spell/proc damage cannot accidentally generate an extra passive stack.
let solBasicOwner=null;
const solOriginalBasic=triggerBasic;
triggerBasic=function(h){h=h||player;const previous=solBasicOwner;
  if(divinaMode&&h.classKey==='solciju')solBasicOwner=h;
  try{return solOriginalBasic(h);}finally{solBasicOwner=previous;}
};
const solOriginalDivinaDamage=divinaDealDamage;
divinaDealDamage=function(target,amount,src){
  const before=target.ref.hp,result=solOriginalDivinaDamage(target,amount,src);
  if(src===solBasicOwner&&src?.classKey==='solciju'&&target.ref.hp<before&&target.ref.alive)solcijuMark(src,target.ref,1);
  return result;
};
for(const action of ['sol_wine','sol_cask','sol_reserve'])ACTION_AIM_PROFILES['expedition:'+action]={type:'point',r:sk=>Math.min(230,sk.radius),range:sk=>Math.min(400,sk.range)};
// Persistent ground cues remain readable with particles/audio disabled.
const solOriginalGround=drawPortadorGround;
drawPortadorGround=function(){solOriginalGround();ctx.save();
  for(const o of portadorObjects){
    if(!o.solciju||o.life<=0||!o.owner?.alive)continue;
    ctx.globalAlpha=.75;portadorDrawRing(o.x,o.y,o.r,'#d69aae',false);
    if(o.kind==='sol_cask'){
      ctx.fillStyle='#623c2b';ctx.strokeStyle='#f0d3a0';ctx.lineWidth=2;
      ctx.fillRect(o.x-9,o.y-15,18,22);ctx.strokeRect(o.x-9,o.y-15,18,22);
      ctx.beginPath();ctx.arc(o.x,o.y,16,-Math.PI/2,-Math.PI/2+Math.PI*2*(1-o.life/o.maxLife));ctx.stroke();
    }else{ctx.fillStyle='#923951';ctx.globalAlpha=.12;ctx.beginPath();ctx.arc(o.x,o.y,o.r,0,Math.PI*2);ctx.fill();}
  }
  ctx.restore();
};
