'use strict';
// Workshop runtime. No production registration until all champion gates pass.
const VEYRA_KIT=[
 {name:'Abrir la herida',action:'vey_cut',cost:22,cd:5500,range:130,radius:35,duration:3000,dmgMult:.85,desc:'Corta en abanico y provoca tres pulsos de sangrado.'},
 {name:'Paso escarlata',action:'vey_dash',cost:28,cd:8000,range:145,radius:28,duration:3000,dmgMult:.65,desc:'Se desplaza sin atravesar muros y hiere a quienes cruza.'},
 {name:'Pacto de dolor',action:'vey_pact',cost:20,cd:12000,range:0,radius:80,duration:3000,dmgMult:0,desc:'Sacrifica 8% de su vida actual para ganar 25% de velocidad y 10% de armadura durante 3 s.'},
 {name:'La última herida',action:'vey_final',cost:0,cd:34000,range:0,radius:145,duration:1400,dmgMult:1.4,desc:'Daña y ralentiza a enemigos cercanos. Recupera 2% de vida y consume sangrados para sanar 1% adicional por herida, hasta 6% total.'}
].map(s=>({...s,kind:'expedition',ico:'✦'}));
function veyraFlag(h,i,name){return !!talentSkillMods(h.classKey,i).flags[name];}
function veyraBleeds(h){return h.veyraBleeds||(h.veyraBleeds=[]);}
function veyraBleed(h,e,dmg){
 if(!e.alive||e.cineT>0)return;
 const list=veyraBleeds(h),old=list.find(b=>b.target===e);
 // Refresh duration instead of stacking infinitely; preserve the next tick deadline.
 if(old){old.left=3;old.dmg=Math.max(old.dmg,dmg);return;}
 if(list.length>=12)list.shift();
 list.push({target:e,left:3,tick:1000,dmg});
}
function veyraHit(h,e,dmg,bleed=true){
 portadorWith(h,()=>portadorHit(h,e,dmg*(h.hp/h.maxHp<.4?1.15:1),true));
 if(bleed)veyraBleed(h,e,dmg*.12);
}
function veyraCast(h,sk,isUlt,dmg,area,dur){
 if(!h.alive||h.fused)return;
 const r=Math.min(200,sk.radius*area),range=Math.min(180,sk.range*area),life=Math.min(5000,sk.duration*dur);
 const origin={x:h.x,y:h.y},dir=range?aimDir(h,range):{x:h.fx,y:h.fy},end={x:h.x+dir.x*range,y:h.y+dir.y*range};
 h.portCastState=isUlt?'ultimate':'cast';h.portCastUntil=runElapsedMs+(isUlt?650:420);
 switch(sk.action){
  case 'vey_cut':
   if(veyraFlag(h,0,'lance'))for(const e of exTargets(h,e=>seSegDist(e.x,e.y,h.x,h.y,end.x,end.y)<=r+(e.radius||0)))veyraHit(h,e,dmg);
   else for(const e of exTargets(h,e=>{const d=distance(h,e)||1;return d<=range+(e.radius||0)&&((e.x-h.x)*dir.x+(e.y-h.y)*dir.y)/d>=Math.cos(.85);}))veyraHit(h,e,dmg);
   break;
  case 'vey_dash':
   exDash(h,dir,range);
   for(const e of exTargets(h,e=>seSegDist(e.x,e.y,origin.x,origin.y,h.x,h.y)<=r+(e.radius||0)))veyraHit(h,e,dmg);
   if(veyraFlag(h,1,'escape'))kitBuff(h,h,1500,{armor:.15,label:'EVASIÓN'});
   break;
  case 'vey_pact':
   h.hp=Math.max(1,h.hp*.92);kitBuff(h,h,life,{speed:.25,armor:.1,label:'PACTO'});
   if(veyraFlag(h,2,'cleanse')){h.slowAmt=0;h.slowTimer=0;}
   break;
  case 'vey_final':{
   let consumed=0;const list=veyraBleeds(h);
   for(const e of exTargets(h,e=>distance(h,e)<=r+(e.radius||0))){
    const mark=list.find(b=>b.target===e&&b.left>0);
    veyraHit(h,e,dmg*(mark?1.2:1),false);portadorSlow(h,e,.3,life);
    if(mark){mark.left=0;consumed++;}
    if(mark&&veyraFlag(h,'ult','reopen'))veyraBleed(h,e,dmg*.08);
   }
   exHeal(h,h,Math.min(.06,.02+consumed*.01));
   if(veyraFlag(h,'ult','lastEscape'))kitBuff(h,h,1800,{speed:.2,label:'ÚLTIMO PASO'});
   if(veyraFlag(h,'ult','bloodShield')&&consumed)exShield(h,h,Math.min(.12,consumed*.02),2000);
   h._ultLockUntil=Math.max(h._ultLockUntil||0,runElapsedMs+life);break;
  }
 }
 if(sk.action==='vey_dash')kitFxLine('slash',origin.x,origin.y,h.x,h.y,r);
 else kitFx(sk.action==='vey_pact'?'shield':'slash',h.x,h.y,isUlt?r:Math.max(r,range),{ult:!!isUlt});
}
const veyOriginalCast=expeditionCast;
expeditionCast=function(h,sk,...args){return sk.action?.startsWith('vey_')?veyraCast(h,sk,...args):veyOriginalCast(h,sk,...args);};
const veyOriginalHero=updatePortadorHero;
updatePortadorHero=function(h,dt){veyOriginalHero(h,dt);if(h.classKey!=='veyra')return;
 if(!h.alive||h.fused){h.veyraBleeds=[];return;}
 const hostile=portadorEnemies(h);
 for(const b of veyraBleeds(h)){
  if(!b.target.alive||!hostile.includes(b.target)){b.left=0;continue;}
  b.tick-=Math.max(0,dt);
  while(b.left>0&&b.tick<=0){b.tick+=1000;b.left--;if(!(b.target.cineT>0))veyraHit(h,b.target,b.dmg,false);}
 }
 h.veyraBleeds=veyraBleeds(h).filter(b=>b.left>0);
};
NET_SKIP_KEYS.add('veyraBleeds');
ACTION_AIM_PROFILES['expedition:vey_cut']={type:'cone',range:sk=>Math.min(180,sk.range)};
ACTION_AIM_PROFILES['expedition:vey_dash']={type:'dash',w:28,range:sk=>Math.min(180,sk.range)};
const veyOriginalAim=aimProfileOf;
aimProfileOf=function(sk,h){
 if(sk?.action==='vey_cut'&&h&&veyraFlag(h,0,'lance'))return {type:'line',w:sk.radius,range:s=>Math.min(180,s.range)};
 return veyOriginalAim(sk,h);
};
