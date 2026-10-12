'use strict';
// Workshop runtime, host authoritative. No production registration here.
const MORVETH_KIT=[
 {name:'Huerto maldito',action:'mor_plant',cost:28,cd:8000,range:260,radius:85,duration:6000,dmgMult:.22,desc:'Planta un hongo destructible que libera seis pulsos de esporas. Máximo tres hongos.'},
 {name:'Exhalación de peste',action:'mor_spores',cost:24,cd:6000,range:210,radius:35,duration:3000,dmgMult:.8,desc:'Daña un abanico e infecta a sus víctimas durante tres pulsos.'},
 {name:'Simbiosis',action:'mor_symbiosis',cost:26,cd:12000,range:0,radius:150,duration:3000,dmgMult:0,desc:'Obtiene 15% de armadura y sana 2% de vida. Consume un hongo cercano para sanar 4% en total.'},
 {name:'Jardín de la peste',action:'mor_garden',cost:0,cd:36000,range:250,radius:165,duration:4000,dmgMult:.3,desc:'Cuatro pulsos infectan, dañan y ralentizan. Los aliados dentro del jardín reciben protección.'}
].map(s=>({...s,kind:'expedition',ico:'♧'}));
function morvethFlag(h,i,f){return !!talentSkillMods(h.classKey,i).flags[f];}
function morvethTargets(h,p,r){return exTargets(h,e=>distance(e,p)<=r+(e.radius||0));}
function morvethAllies(h,p,r){const team=divinaMode&&divinaEnemies.includes(h)?divinaEnemies:heroes;return team.filter(a=>a.alive&&!a.fused&&distance(a,p)<=r);}
function morvethInfections(h){return h.morvethInfections||(h.morvethInfections=[]);}
function morvethInfect(h,e,dmg,generation=0){
 if(!e.alive||e.cineT>0)return;
 const list=morvethInfections(h),old=list.find(m=>m.target===e);
 if(old){old.left=3;old.dmg=Math.max(old.dmg,dmg);return;}
 if(list.length>=12)list.shift();
 list.push({target:e,dmg,left:3,tick:1000,generation});
}
function morvethSpread(h,m){
 if(m.generation!==0||m.spread)return;
 m.spread=true;for(const e of morvethTargets(h,m.target,95).slice(0,3))morvethInfect(h,e,m.dmg*.7,1);kitFx('dark',m.target.x,m.target.y,95);
}
function morvethHit(h,e,dmg,infect=true){exHit(h,e,dmg,true);if(infect)morvethInfect(h,e,dmg*.12);}
function morvethObject(h,kind,p,life,data,cap){portadorLimit(h,kind,cap);portadorObjects=portadorObjects.filter(o=>o.life>0);return portadorAdd(h,kind,p,life,{morveth:true,...data});}
function morvethCast(h,sk,isUlt,dmg,area,dur){
 if(!h.alive||h.fused)return;
 const r=Math.min(220,sk.radius*area),life=Math.min(8000,sk.duration*dur),p=sk.range&&sk.action!=='mor_spores'?portadorPoint(h,Math.min(330,sk.range*area),r):h;
 h.portCastState=isUlt?'ultimate':'cast';h.portCastUntil=runElapsedMs+(isUlt?650:420);
 switch(sk.action){
  case 'mor_plant':{const hp=h.maxHp*.2;morvethObject(h,'mor_mushroom',p,life,{r,dmg,hp,maxHp:hp,hitTimer:850,left:6,tick:1000,interval:life/6},3);break;}
  case 'mor_spores':exCone(h,Math.min(280,sk.range*area),dmg,e=>{morvethInfect(h,e,dmg*.12);if(morvethFlag(h,1,'choke'))portadorSlow(h,e,.25,1500);});break;
  case 'mor_symbiosis':{
   const mushroom=portadorOwned(h,'mor_mushroom').find(o=>distance(h,o)<=r);if(mushroom)mushroom.life=0;
   for(const a of morvethFlag(h,2,'share')?morvethAllies(h,h,r):[h]){exHeal(h,a,mushroom?.04:.02);kitBuff(h,a,life,{armor:.15,label:'SIMBIOSIS'});}break;
  }
  case 'mor_garden':
   morvethObject(h,'mor_garden',p,life,{r,dmg,left:4,tick:life/4,interval:life/4},1);
   if(morvethFlag(h,'ult','harvest'))for(const o of portadorOwned(h,'mor_mushroom'))if(distance(o,p)<=r){o.life=0;for(const e of morvethTargets(h,o,o.r))morvethHit(h,e,dmg*.4);}
   h._ultLockUntil=Math.max(h._ultLockUntil||0,runElapsedMs+life);break;
 }
 kitFx(sk.action==='mor_symbiosis'?'shield':'dark',p.x,p.y,sk.action==='mor_spores'?100:r,{ult:!!isUlt});
}
function morvethUpdateObject(o,dt){
 if(!o.morveth)return false;
 const h=o.owner;if(!h?.alive||h.fused||!heroes.includes(h)){o.life=0;return true;}
 if(currentArena==='abismo'&&abS&&!abWalkable(o.x,o.y)){o.life=0;return true;}
 const elapsed=Math.min(Math.max(0,dt),o.life);o.life=Math.max(0,o.life-elapsed);
 if(o.kind==='mor_mushroom'){
  o.hitTimer-=elapsed;if(o.hitTimer<=0){const threats=morvethTargets(h,o,65);o.hp-=Math.min(o.maxHp*.35,threats.reduce((n,e)=>n+Math.max(1,e.dmg||5)*.35,0));o.hitTimer=850;}
  if(o.hp<=0){o.life=0;return true;}
 }
 o.tick-=elapsed;
 while(o.left>0&&o.tick<=0){o.left--;o.tick+=o.interval;
  for(const e of morvethTargets(h,o,o.r)){
   morvethHit(h,e,o.dmg);
   if(o.kind==='mor_garden')portadorSlow(h,e,.3,1200);
   if(o.kind==='mor_mushroom'&&morvethFlag(h,0,'roots'))portadorSlow(h,e,.2,800);
  }
  if(o.kind==='mor_garden')for(const a of morvethAllies(h,o,o.r)){
   kitBuff(h,a,1200,{armor:.1,label:'MICELIO'});
   if(morvethFlag(h,'ult','renew'))exHeal(h,a,.01);
   if(morvethFlag(h,'ult','shelter'))exShield(h,a,.04,1200);
  }
  kitFx('dark',o.x,o.y,o.r);
 }
 return true;
}
const morCast=expeditionCast;expeditionCast=function(h,sk,...args){return sk.action?.startsWith('mor_')?morvethCast(h,sk,...args):morCast(h,sk,...args);};
const morObject=ynaraUpdateObject;ynaraUpdateObject=function(o,dt){return morvethUpdateObject(o,dt)||morObject(o,dt);};
const morHero=updatePortadorHero;updatePortadorHero=function(h,dt){morHero(h,dt);if(h.classKey!=='morveth')return;
 if(!h.alive||h.fused){h.morvethInfections=[];for(const o of portadorObjects)if(o.owner===h&&o.morveth)o.life=0;return;}
 const list=morvethInfections(h),hostile=portadorEnemies(h);
 // Snapshot prevents a corpse's new infections ticking again in this same update.
 for(const m of [...list]){
  if(!m.target.alive){
   if(m.left>0)morvethSpread(h,m);
   m.left=0;continue;
  }
  if(!hostile.includes(m.target)){m.left=0;continue;}
  m.tick-=Math.max(0,dt);while(m.left>0&&m.tick<=0){m.tick+=1000;m.left--;exHit(h,m.target,m.dmg,true);if(!m.target.alive){morvethSpread(h,m);m.left=0;break;}}
 }
 h.morvethInfections=list.filter(m=>m.left>0);
};
NET_SKIP_KEYS.add('morvethInfections');
ACTION_AIM_PROFILES['expedition:mor_spores']={type:'cone',range:sk=>Math.min(280,sk.range)};
for(const a of ['mor_plant','mor_garden'])ACTION_AIM_PROFILES['expedition:'+a]={type:'point',r:sk=>Math.min(220,sk.radius),range:sk=>Math.min(330,sk.range)};
const morGround=drawPortadorGround;drawPortadorGround=function(){morGround();ctx.save();for(const o of portadorObjects){if(!o.morveth||o.life<=0||!o.owner?.alive)continue;
 portadorDrawRing(o.x,o.y,o.r,'#a4c56a',false);
 if(o.kind==='mor_mushroom'){ctx.fillStyle='#d6c1a0';ctx.fillRect(o.x-3,o.y-9,6,14);ctx.fillStyle='#7c476b';ctx.beginPath();ctx.ellipse(o.x,o.y-9,14,8,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#c3d581';ctx.fillRect(o.x-12,o.y-22,24*Math.max(0,o.hp/o.maxHp),3);}
 }ctx.restore();};
