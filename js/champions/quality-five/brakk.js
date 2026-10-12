'use strict';
// Workshop only. Constructors stay in the existing host-owned object lifecycle.
const BRAKK_KIT=[
 {name:'Muro de asedio',action:'brk_wall',cost:28,cd:8500,range:180,radius:65,duration:4500,dmgMult:.75,desc:'Levanta un muro destructible que daña al aparecer y bloquea enemigos durante 4,5 s. Máximo dos.'},
 {name:'Torreta de clavos',action:'brk_turret',cost:32,cd:10000,range:180,radius:45,duration:6000,dmgMult:.3,desc:'Construye una torreta destructible. Dispara seis ráfagas que dañan hasta tres enemigos cercanos. Máximo dos.'},
 {name:'Apuntalar',action:'brk_repair',cost:24,cd:12000,range:0,radius:160,duration:3000,dmgMult:0,desc:'Repara sus construcciones cercanas y obtiene 15% de armadura durante 3 s.'},
 {name:'Demolición final',action:'brk_final',cost:0,cd:36000,range:0,radius:180,duration:1800,dmgMult:1.4,desc:'Sacrifica construcciones cercanas, golpea y ralentiza enemigos y obtiene un escudo. No acumula daño por cada construcción.'}
].map(s=>({...s,kind:'expedition',ico:'▣'}));
function brakkFlag(h,i,f){return !!talentSkillMods(h.classKey,i).flags[f];}
function brakkOwned(h){return portadorObjects.filter(o=>o.brakk&&o.owner===h&&o.life>0&&o.hp>0);}
function brakkTargets(h,p,r){return exTargets(h,e=>distance(e,p)<=r+(e.radius||0));}
function brakkBuild(h,kind,p,life,data={}){
 portadorLimit(h,kind,2);portadorObjects=portadorObjects.filter(o=>o.life>0);
 const hp=h.maxHp*.22;
 return portadorAdd(h,kind,p,life,{brakk:true,hp,maxHp:hp,hitTimer:850,...data});
}
function brakkCast(h,sk,isUlt,dmg,area,dur){
 if(!h.alive||h.fused)return;
 const r=Math.min(220,sk.radius*area),life=Math.min(8000,sk.duration*dur);
 const p=sk.range?portadorPoint(h,Math.min(240,sk.range*area),r):h;
 h.portCastState=isUlt?'ultimate':'cast';h.portCastUntil=runElapsedMs+(isUlt?650:420);
 switch(sk.action){
  case 'brk_wall':{
   const d=aimDir(h,sk.range),gate=brakkFlag(h,0,'gate');
   brakkBuild(h,'brk_wall',p,gate?life*.65:life,{r:gate?Math.min(90,r*1.25):r,dx:-d.y,dy:d.x});
   for(const e of brakkTargets(h,p,r))exHit(h,e,dmg,true);
   break;
  }
  case 'brk_turret':brakkBuild(h,'brk_turret',p,life,{r,range:230,dmg,tick:1000,left:6,interval:life/6});break;
  case 'brk_repair':
   for(const o of brakkOwned(h))if(distance(h,o)<=r)o.hp=Math.min(o.maxHp,o.hp+o.maxHp*.35);
   for(const a of brakkFlag(h,2,'crew')?brakkAllies(h,r):[h])kitBuff(h,a,life,{armor:.15,label:'APUNTALADO'});
   if(brakkFlag(h,'ult','renew'))exHeal(h,h,.025);
   break;
  case 'brk_final':{
   const owned=brakkOwned(h).filter(o=>distance(h,o)<=r),n=owned.length;
   for(const o of owned)o.life=0;
   for(const e of brakkTargets(h,h,r)){exHit(h,e,dmg,true);portadorSlow(h,e,.3,life);}
   exShield(h,h,Math.min(.14,.06+n*.02),life);
   if(brakkFlag(h,'ult','bastion'))for(const a of brakkAllies(h,r))exShield(h,a,.06,life);
   if(brakkFlag(h,'ult','rubble'))for(const e of brakkTargets(h,h,r))portadorSlow(h,e,.3,Math.min(3500,life+1200));
   h._ultLockUntil=Math.max(h._ultLockUntil||0,runElapsedMs+life);break;
  }
 }
 kitFx(sk.action==='brk_repair'?'shield':'earth',p.x,p.y,r,{ult:!!isUlt});
}
function brakkAllies(h,r){const side=divinaMode&&divinaEnemies.includes(h)?divinaEnemies:heroes;return side.filter(a=>a.alive&&!a.fused&&distance(h,a)<=r);}
function brakkUpdate(o,dt){
 if(!o.brakk)return false;
 const h=o.owner;if(!h?.alive||h.fused||!heroes.includes(h)||o.hp<=0){o.life=0;return true;}
 if(currentArena==='abismo'&&abS&&!abWalkable(o.x,o.y)){o.life=0;return true;}
 const elapsed=Math.min(Math.max(0,dt),o.life);o.life=Math.max(0,o.life-elapsed);o.hitTimer-=elapsed;
 if(o.hitTimer<=0){
  const threats=brakkTargets(h,o,o.kind==='brk_wall'?o.r+24:65);
  if(threats.length)o.hp-=Math.min(o.maxHp*.35,threats.reduce((n,e)=>n+Math.max(1,e.dmg||5)*.35,0));
  o.hitTimer=850;
 }
 if(o.hp<=0){o.life=0;kitFx('earth',o.x,o.y,35);return true;}
 if(o.kind!=='brk_turret')return true;
 o.tick-=elapsed;
 while(o.left>0&&o.tick<=0){
  o.left--;o.tick+=o.interval;
  const target=brakkTargets(h,o,o.range).find(e=>!arenaHas('heroReachable')||arenaHook('heroReachable',o,e));
  if(!target)continue;
  const targets=brakkFlag(h,1,'pierce')?exTargets(h,e=>seSegDist(e.x,e.y,o.x,o.y,target.x,target.y)<18+(e.radius||0)):brakkTargets(h,target,o.r).slice(0,3);
  for(const e of targets)exHit(h,e,o.dmg,true);
  kitFxLine('spike',o.x,o.y,target.x,target.y,18);
 }
 return true;
}
// Enemy-only solid segments: allies may pass to prevent trapping teammates.
// Bosses are never displaced; they still attack and destroy the temporary wall.
let brakkResolvingCollision=false;
function brakkCollide(e){
 if(brakkResolvingCollision||!e?.alive||isBossRank(e)||(divinaMode&&divinaStructures.includes(e)))return;
 brakkResolvingCollision=true;try{
 for(const o of portadorObjects){
  if(o.kind!=='brk_wall'||o.life<=0||o.hp<=0||!o.owner?.alive||o.owner.fused||(divinaMode?!portadorEnemies(o.owner).includes(e):heroes.includes(e)||(e.isDuelLocked&&e.duelOwner!==o.owner)))continue;
  const x=e.x-o.x,y=e.y-o.y,l=x*o.dx+y*o.dy,n=-x*o.dy+y*o.dx,rr=e.radius||18;
  if(Math.abs(l)>o.r+rr||Math.abs(n)>=10+rr)continue;
  const before={x:e.x,y:e.y},push=(n>=0?1:-1)*(10+rr)-n;e.x-=o.dy*push;e.y+=o.dx*push;
  clampToArena(e);brkWallCollision(e);
  if((arenaHas('heroReachable')&&!arenaHook('heroReachable',before,e))||(currentArena==='abismo'&&abS&&!abSafeAt(e.x,e.y))){e.x=before.x;e.y=before.y;}
 }
 }finally{brakkResolvingCollision=false;}
}
const brkCast=expeditionCast;expeditionCast=function(h,sk,...args){return sk.action?.startsWith('brk_')?brakkCast(h,sk,...args):brkCast(h,sk,...args);};
const brkObjects=ynaraUpdateObject;ynaraUpdateObject=function(o,dt){return brakkUpdate(o,dt)||brkObjects(o,dt);};
const brkEnemyCollision=aidCollideEnemy;aidCollideEnemy=function(e){brkEnemyCollision(e);brakkCollide(e);};
const brkWallCollision=resolveWallCollision;resolveWallCollision=function(e){brkWallCollision(e);brakkCollide(e);};
const brkTaken=portadorTakenMult;portadorTakenMult=function(h,src){const m=brkTaken(h,src);return h.classKey==='brakk'&&brakkOwned(h).some(o=>distance(h,o)<=120)?m*.92:m;};
const brkHero=updatePortadorHero;updatePortadorHero=function(h,dt){brkHero(h,dt);if(h.classKey==='brakk'&&(!h.alive||h.fused))for(const o of portadorObjects)if(o.brakk&&o.owner===h)o.life=0;};
for(const action of ['brk_wall','brk_turret'])ACTION_AIM_PROFILES['expedition:'+action]={type:'point',r:sk=>Math.min(220,sk.radius),range:sk=>Math.min(240,sk.range)};
const brkGround=drawPortadorGround;drawPortadorGround=function(){brkGround();ctx.save();
 for(const o of portadorObjects){if(!o.brakk||o.life<=0||!o.owner?.alive)continue;
  ctx.strokeStyle='#cead7a';ctx.fillStyle='#504637';ctx.lineWidth=3;
  if(o.kind==='brk_wall'){ctx.beginPath();ctx.moveTo(o.x-o.dx*o.r,o.y-o.dy*o.r);ctx.lineTo(o.x+o.dx*o.r,o.y+o.dy*o.r);ctx.lineWidth=18;ctx.stroke();}
  else{ctx.fillRect(o.x-12,o.y-12,24,24);ctx.strokeRect(o.x-12,o.y-12,24,24);}
  ctx.fillStyle='#262627';ctx.fillRect(o.x-16,o.y-22,32,4);ctx.fillStyle='#a9c687';ctx.fillRect(o.x-16,o.y-22,32*Math.max(0,o.hp/o.maxHp),4);
 }ctx.restore();};
// A tank's melee sweep must not scale without a victim budget in dense waves.
let brkBasicOwner=null,brkBasicBudget=0;
const brkBasic=triggerBasic;triggerBasic=function(h){h=h||player;const owner=brkBasicOwner,budget=brkBasicBudget;if(h.classKey==='brakk'){brkBasicOwner=h;brkBasicBudget=12;}try{return brkBasic(h);}finally{brkBasicOwner=owner;brkBasicBudget=budget;}};
const brkDamage=damageEnemy;damageEnemy=function(e,amount,opts={}){if(brkBasicOwner&&opts.fromBasic&&opts.src===brkBasicOwner&&brkBasicBudget--<=0)return;return brkDamage(e,amount,opts);};
