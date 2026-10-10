'use strict';
// Temporal echoes stay at the cast point. No route recording or teleport copy of Sira.
const AELITH_KIT=[
 {name:'Instante roto',action:'ael_echo',cost:25,cd:6500,range:290,radius:75,duration:800,dmgMult:1,desc:'Daña un área y deja un eco que repite 30% del daño tras 0,8 s. Máximo dos ecos.'},
 {name:'Fractura de segundos',action:'ael_fracture',cost:27,cd:8000,range:260,radius:26,duration:1800,dmgMult:.8,desc:'Abre una línea que daña y ralentiza a sus enemigos durante 1,8 s.'},
 {name:'Tiempo prestado',action:'ael_haste',cost:24,cd:12000,range:0,radius:140,duration:3000,dmgMult:0,desc:'Gana 25% de velocidad y 10% de armadura durante 3 s. Después sufre 15% de lentitud durante 0,8 s.'},
 {name:'La hora imposible',action:'ael_hour',cost:0,cd:37000,range:260,radius:170,duration:3600,dmgMult:.4,desc:'Tres pulsos dañan y ralentizan enemigos. Escuda a aliados dentro del círculo.'}
].map(s=>({...s,kind:'expedition',ico:'◷'}));
function aelithFlag(h,i,f){return !!talentSkillMods(h.classKey,i).flags[f];}
function aelithTargets(h,p,r){return exTargets(h,e=>distance(e,p)<=r+(e.radius||0));}
function aelithAllies(h,p,r){const team=divinaMode&&divinaEnemies.includes(h)?divinaEnemies:heroes;return team.filter(a=>a.alive&&!a.fused&&distance(a,p)<=r);}
function aelithObject(h,kind,p,life,data,cap=2){portadorLimit(h,kind,cap);portadorObjects=portadorObjects.filter(o=>o.life>0);return portadorAdd(h,kind,p,life,{aelith:true,...data});}
function aelithEcho(h,p,r,dmg,delay=800){return aelithObject(h,'ael_echo',p,delay,{r,dmg});}
function aelithCast(h,sk,isUlt,dmg,area,dur){
 if(!h.alive||h.fused)return;
 const r=Math.min(220,sk.radius*area),life=Math.min(6000,sk.duration*dur),p=sk.range&&sk.action!=='ael_fracture'?portadorPoint(h,Math.min(350,sk.range*area),r):h;
 h.portCastState=isUlt?'ultimate':'cast';h.portCastUntil=runElapsedMs+(isUlt?650:420);
 const idx=h.cls.skills.indexOf(sk);
 // Every third cast borrows half a second from other active skill cooldowns only.
 h.aelithSeconds=((h.aelithSeconds||0)+1)%3;
 if(h.aelithSeconds===0&&h.cds)for(let i=0;i<3;i++)if(i!==idx&&h.cds[i]>1000)h.cds[i]=Math.max(1000,h.cds[i]-500);
 switch(sk.action){
  case 'ael_echo':
   for(const e of aelithTargets(h,p,r))exHit(h,e,dmg,true);
   h.aelithLastEcho={x:p.x,y:p.y,r,dmg:dmg*.3};
   aelithEcho(h,p,r,dmg*.3,aelithEchoDelay(h,life));break;
  case 'ael_fracture':{
   const hit=e=>portadorSlow(h,e,.35,life);
   const d=aimDir(h,sk.range),end={x:h.x+d.x*Math.min(330,sk.range*area),y:h.y+d.y*Math.min(330,sk.range*area)};exLine(h,h,end,r,dmg,hit);kitFxLine('rune',h.x,h.y,end.x,end.y,r);
   if(aelithFlag(h,1,'aftershock'))aelithEcho(h,end,60,dmg*.2,800);break;
  }
  case 'ael_haste':
   for(const a of aelithFlag(h,2,'share')?aelithAllies(h,h,r):[h]){kitBuff(h,a,life,{speed:.25,armor:.1,label:'ACELERADO'});a.aelithDebtUntil=Math.max(a.aelithDebtUntil||0,runElapsedMs+life);}break;
  case 'ael_hour':
   aelithObject(h,'ael_hour',p,life,{r,dmg,left:3,tick:life/3,interval:life/3},1);
   if(aelithFlag(h,'ult','reprise')&&h.aelithLastEcho)aelithEcho(h,h.aelithLastEcho,h.aelithLastEcho.r,h.aelithLastEcho.dmg,800);
   h._ultLockUntil=Math.max(h._ultLockUntil||0,runElapsedMs+life);break;
 }
 kitFx(sk.action==='ael_haste'?'wind':'rune',p.x,p.y,sk.action==='ael_fracture'?90:r,{ult:!!isUlt});
}
function aelithEchoDelay(h,life){return aelithFlag(h,0,'delayed')?Math.min(2400,life*2):life;}
function aelithUpdateObject(o,dt){
 if(!o.aelith)return false;
 const h=o.owner;if(!h?.alive||h.fused||!heroes.includes(h)){o.life=0;return true;}
 if(currentArena==='abismo'&&abS&&!abWalkable(o.x,o.y)){o.life=0;return true;}
 const elapsed=Math.min(Math.max(0,dt),o.life),wasAlive=o.life>0;o.life=Math.max(0,o.life-elapsed);
 if(o.kind==='ael_echo'){
  if(wasAlive&&o.life===0){for(const e of aelithTargets(h,o,o.r)){exHit(h,e,o.dmg,true);if(aelithFlag(h,0,'delayed'))portadorSlow(h,e,.3,1400);}kitFx('rune',o.x,o.y,o.r);}return true;
 }
 o.tick-=elapsed;while(o.left>0&&o.tick<=0){o.left--;o.tick+=o.interval;
  for(const e of aelithTargets(h,o,o.r)){exHit(h,e,o.dmg,true);portadorSlow(h,e,.45,1300);}
  for(const a of aelithAllies(h,o,o.r)){exShield(h,a,.05,1400);if(aelithFlag(h,'ult','renew'))exHeal(h,a,.01);if(aelithFlag(h,'ult','haste'))kitBuff(h,a,1300,{speed:.15,label:'OTRO SEGUNDO'});}
  kitFx('rune',o.x,o.y,o.r);
 }return true;
}
const aelCast=expeditionCast;expeditionCast=function(h,sk,...args){return sk.action?.startsWith('ael_')?aelithCast(h,sk,...args):aelCast(h,sk,...args);};
const aelObject=ynaraUpdateObject;ynaraUpdateObject=function(o,dt){return aelithUpdateObject(o,dt)||aelObject(o,dt);};
const aelHero=updatePortadorHero;updatePortadorHero=function(h,dt){aelHero(h,dt);
 if(!h.alive||h.fused){h.aelithDebtUntil=0;if(h.classKey==='aelith'){h.aelithSeconds=0;h.aelithLastEcho=null;for(const o of portadorObjects)if(o.aelith&&o.owner===h)o.life=0;}return;}
 if(h.aelithDebtUntil>0&&runElapsedMs>=h.aelithDebtUntil){h.aelithDebtUntil=0;h.slowAmt=Math.max(h.slowAmt||0,.15);h.slowTimer=Math.max(h.slowTimer||0,800);}
};
for(const action of ['ael_echo','ael_hour'])ACTION_AIM_PROFILES['expedition:'+action]={type:'point',r:sk=>Math.min(220,sk.radius),range:sk=>Math.min(350,sk.range)};
ACTION_AIM_PROFILES['expedition:ael_fracture']={type:'line',w:26,range:sk=>Math.min(330,sk.range)};
const aelGround=drawPortadorGround;drawPortadorGround=function(){aelGround();ctx.save();for(const o of portadorObjects){if(!o.aelith||o.life<=0||!o.owner?.alive)continue;portadorDrawRing(o.x,o.y,o.r,'#bfa7dc',false);ctx.strokeStyle='#eed5a4';ctx.lineWidth=2;const angle=-Math.PI/2+(1-o.life/o.maxLife)*Math.PI*2;ctx.beginPath();ctx.moveTo(o.x,o.y);ctx.lineTo(o.x+Math.cos(angle)*o.r*.7,o.y+Math.sin(angle)*o.r*.7);ctx.stroke();}ctx.restore();};
