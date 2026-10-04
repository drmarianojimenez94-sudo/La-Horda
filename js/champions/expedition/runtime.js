'use strict';
// Host-authoritative champion kits; use existing combat, entity lifecycle and network serializer.
const exCandidate=h=>!!(h&&EXPEDITION[h.classKey]);
function exState(h){return h.exState||(h.exState={notes:0,seeds:0,vibration:0,heat:0,colony:100,route:[]});}
function exTargets(h,test){return portadorEnemies(h).filter(e=>!(e.cineT>0)&&test(e)).sort((a,b)=>distance(h,a)-distance(h,b)).slice(0,12);}
function exHit(h,e,dmg,proc=false){if(e.alive&&!(e.cineT>0))portadorWith(h,()=>portadorHit(h,e,dmg,proc));}
function exArea(h,p,r,dmg,fn){for(const e of exTargets(h,e=>distance(e,p)<=r+(e.radius||0))){exHit(h,e,dmg);if(fn&&e.alive)fn(e);}}
function exLine(h,a,b,r,dmg,fn){for(const e of exTargets(h,e=>seSegDist(e.x,e.y,a.x,a.y,b.x,b.y)<=r+(e.radius||0))){exHit(h,e,dmg);if(fn&&e.alive)fn(e);}}
function exCone(h,range,dmg,fn){const d=aimDir(h,range);for(const e of exTargets(h,e=>{const l=distance(h,e)||1;return l<=range+(e.radius||0)&&((e.x-h.x)*d.x+(e.y-h.y)*d.y)/l>=Math.cos(.85);})){exHit(h,e,dmg);if(fn&&e.alive)fn(e);}vfxSkillCone(h.x,h.y,range,Math.atan2(d.y,d.x),.85,h.cls.glow);}
function exMark(h,e,add=0){const M=e._exMarks||(e._exMarks={}),slot=heroes.indexOf(h),m=M[slot]||(M[slot]={n:0,until:0});if(m.until<=runElapsedMs)m.n=0;if(add){m.n=Math.min(3,m.n+add);m.until=runElapsedMs+5000;}return m;}
function exOwned(h,kind){return portadorOwned(h,'ex_'+kind);}
function exObject(h,kind,p,life,data={},limit=1){portadorLimit(h,'ex_'+kind,limit);portadorObjects=portadorObjects.filter(o=>o.life>0);const own=portadorObjects.filter(o=>o.owner===h);if(own.length>=8)own[0].life=0;portadorObjects=portadorObjects.filter(o=>o.life>0);return portadorAdd(h,'ex_'+kind,p,Math.min(9000,Math.max(1,life)),{ex:true,r:40,...data});}
function exShield(src,h,pct,ms){if(!h.alive||h.fused)return;const before=h.shield||0;h.shield=Math.max(before,Math.min(h.maxHp*.2,h.maxHp*pct));h.shieldTimer=Math.max(h.shieldTimer||0,ms);if(h.shield>before&&src.stats)src.stats.buffsGranted++;}
function exHeal(src,h,pct){if(!h.alive||h.fused)return;const old=h.hp;h.hp=Math.min(h.maxHp,h.hp+h.maxHp*Math.min(.08,pct)*arenaRuleHealMult());if(src.stats)src.stats.healingDone=(src.stats.healingDone||0)+h.hp-old;}
function exSafeStep(h,q){const prev={x:h.x,y:h.y},pos={x:q.x,y:q.y,radius:h.radius||18};clampToArena(pos);resolveWallCollision(pos);if(distance(pos,q)>1||(arenaHas('heroReachable')&&!arenaHook('heroReachable',prev,pos))||(currentArena==='abismo'&&abS&&!abSafeAt(pos.x,pos.y)))return false;h.x=pos.x;h.y=pos.y;return true;}
function exDash(h,d,len){let moved=0;while(moved<Math.min(180,len)){const step=Math.min(6,len-moved);if(!exSafeStep(h,{x:h.x+d.x*step,y:h.y+d.y*step}))break;moved+=step;}return moved;}
function exPulse(h,kind,life,r,dmg,total,extra={}){const interval=life/total;return exObject(h,kind,h,life,{r,dmg,total,left:total,tick:1,interval,...extra});}
function exRoute(h){return exState(h).route.filter(p=>runElapsedMs-p.at<=4000).slice(-12);}
function exRouteHit(h,points,r,dmg){for(const e of exTargets(h,e=>points.slice(1).some((p,i)=>seSegDist(e.x,e.y,points[i].x,points[i].y,p.x,p.y)<=r+(e.radius||0))))exHit(h,e,dmg);}
function exDischarge(h,r,dmg){const used=new Set();for(const e of exTargets(h,e=>distance(h,e)<r&&exMark(h,e).n>0)){if(used.size>=12)break;if(used.has(e))continue;const n=exMark(h,e).n;exMark(h,e).n=0;used.add(e);exHit(h,e,dmg*(1+n*.2));for(const a of exTargets(h,a=>a!==e&&!used.has(a)&&distance(a,e)<85).slice(0,2)){if(used.size>=12)break;used.add(a);exHit(h,a,dmg*.25,true);}}}
function expeditionCast(h,sk,isUlt,dmg,area,dur,power){
 if(!h.alive||h.fused)return;
 const s=exState(h),idx=h.cls.skills.indexOf(sk),master=idx>=0&&portadorMaster(h,idx);
 if(master){if(['reflect','brace','mound'].includes(sk.action))dur*=1.1;else if(sk.action==='retrace')area*=1.1;else {dmg*=1.1;power*=1.1;}}
 const r=Math.min(230,(sk.radius||100)*area),range=Math.min(400,(sk.range||200)*area),life=Math.min(9000,(sk.duration||2400)*dur),dir=aimDir(h,range),point=()=>portadorPoint(h,range,r),end={x:h.x+dir.x*range,y:h.y+dir.y*range},origin={x:h.x,y:h.y};
 h.exCue={action:sk.action,x:h.x,y:h.y,bx:end.x,by:end.y,r,range,angle:Math.atan2(dir.y,dir.x),until:runElapsedMs+(isUlt?650:350),ult:!!isUlt};
 if(typeof playSfx==='function')playSfx('ex_'+h.classKey+(isUlt?'_ult':'_cast'));
 h.portCastState=isUlt?'ultimate':'cast';h.portCastUntil=runElapsedMs+(isUlt?650:420);
 if(isUlt)h._ultLockUntil=Math.max(h._ultLockUntil||0,runElapsedMs+life);
 if(h.classKey==='zahra'&&s.heat>=60)dmg*=1.15;
 if(h.classKey==='dariel'){if(s.last!==sk.action)s.notes=Math.min(3,s.notes+1);s.last=sk.action;}
 switch(sk.action){
 case 'needles':exCone(h,range,dmg,e=>exMark(h,e,1));break;
 case 'seam':case 'ash_step':exDash(h,dir,Math.min(150,range));exObject(h,'line',origin,life,{bx:h.x,by:h.y,r,dmg,interval:life/4,tick:1,left:4},2);if(sk.action==='ash_step')s.heat=Math.min(100,s.heat+25);break;
 case 'unpick':for(const e of exTargets(h,e=>distance(h,e)<r)){const m=exMark(h,e),n=m.n;m.n=0;exHit(h,e,dmg*(1+n*.2));}break;
 case 'last_stitch':exPulse(h,'stitch',life,r,dmg,4);break;
 case 'shards':exCone(h,range,dmg);break;
 case 'reflect':exDash(h,dir,Math.min(150,range));exObject(h,'reflection',origin,life,{r:25},3);break;
 case 'cross':{const refs=exOwned(h,'reflection').slice(0,3),a={x:h.x,y:h.y};for(const e of exTargets(h,e=>[a,...refs].some(p=>seSegDist(e.x,e.y,p.x,p.y,end.x,end.y)<r+(e.radius||0)))){let mult=seSegDist(e.x,e.y,a.x,a.y,end.x,end.y)<r+(e.radius||0)?1:0;for(const p of refs)if(seSegDist(e.x,e.y,p.x,p.y,end.x,end.y)<r+(e.radius||0))mult+=.25;exHit(h,e,dmg*Math.min(1.75,mult));}break;}
 case 'gallery':for(const o of exOwned(h,'reflection'))o.life=0;for(let i=0;i<3;i++){const a=i*Math.PI*2/3,aim=h.aim;h.aim={x:h.x+Math.cos(a)*100,y:h.y+Math.sin(a)*100};const p=point();h.aim=aim;exObject(h,'reflection',p,life,{r:25},3);}break;
 case 'bell':exArea(h,h,r,dmg*(1+s.vibration*.12));s.vibration=0;break;
 case 'guard':s.guardUntil=runElapsedMs+life;s.guardX=dir.x;s.guardY=dir.y;break;
 case 'counter':exCone(h,range,dmg*(1+s.vibration*.12),e=>portadorSlow(h,e,.3,1200));s.vibration=0;break;
 case 'toll':exPulse(h,'toll',life,r,dmg,3);break;
 case 'roots':exLine(h,h,end,r,dmg,e=>portadorSlow(h,e,.3,1400));exObject(h,'thorns',point(),Math.min(3000,life),{r:70,dmg:0},2);break;
 case 'bark':exShield(h,h,Math.min(.15,.1*power),life);exObject(h,'bark',h,life,{r,dmg});break;
 case 'shear':exArea(h,h,r,dmg);exHeal(h,h,s.seeds*.01);s.seeds=0;break;
 case 'walking_forest':exPulse(h,'forest',life,r,dmg,6);break;
 case 'discord':exCone(h,range,dmg,e=>{e.exDiscordUntil=runElapsedMs+1500;e.exDiscordPct=isBossRank(e)?.04:.08;});break;
 case 'march':for(const a of heroes)if(a.alive&&distance(a,h)<r){exShield(h,a,.04,life);a.exMarchUntil=runElapsedMs+life;}break;
 case 'refrain':exArea(h,h,r,dmg);for(const a of heroes)if(distance(a,h)<r)exHeal(h,a,.01+s.notes*.006);s.notes=0;break;
 case 'concert':exPulse(h,'concert',life,r,dmg,6);break;
 case 'pierce':exLine(h,h,end,r,dmg,e=>exMark(h,e,1));break;
 case 'brace':s.braceUntil=runElapsedMs+life;s.shots=3;break;
 case 'discharge':exDischarge(h,r,dmg);break;
 case 'storm':exPulse(h,'storm',life,r,dmg,4,{range});break;
 case 'swarm':case 'hive_sky':if(isUlt)s.colony=100;exObject(h,'swarm',point(),life,{r,dmg,tick:1,interval:600,left:Math.min(12,Math.ceil(life/600))});break;
 case 'recall':{const cloud=exOwned(h,'swarm')[0];if(cloud){exLine(h,cloud,h,r,dmg);cloud.life=0;s.colony=Math.min(100,s.colony+20);}exShield(h,h,cloud?.07:.03,3000);break;}
 case 'pollen':{const p=point();exArea(h,p,r,dmg,e=>portadorSlow(h,e,.25,1200));const cloud=exOwned(h,'swarm')[0];if(cloud){cloud.x=p.x;cloud.y=p.y;}break;}
 case 'furnace':exCone(h,range,dmg);s.heat=Math.min(100,s.heat+30);break;
 case 'quench':exShield(h,h,.04+s.heat*.0008,3000);s.heat=0;for(const o of exOwned(h,'line'))if(distance(h,o)<range)o.life=0;break;
 case 'vent':exPulse(h,'vent',life,r,dmg*(1+s.heat*.004),4);s.heat=0;break;
 case 'trench':exLine(h,h,end,r,dmg,e=>portadorSlow(h,e,.3,1500));exObject(h,'soil',point(),life,{r:65},3);break;
 case 'mound':exObject(h,'mound',point(),life,{r});break;
 case 'burial':{const soil=exOwned(h,'soil');exArea(h,h,r,dmg*(1+soil.length*.2));for(const o of soil)o.life=0;break;}
 case 'faults':exPulse(h,'faults',life,r,dmg,3);break;
 case 'ink_line':exLine(h,h,end,r,dmg);break;
 case 'retrace':{const route=exRoute(h).reverse();let moved=0;outer:for(const p of route){while(distance(h,p)>6){const l=distance(h,p),d={x:(p.x-h.x)/l,y:(p.y-h.y)/l};if(moved+6>Math.min(200,range)||!exSafeStep(h,{x:h.x+d.x*6,y:h.y+d.y*6}))break outer;moved+=6;}}s.route=[];break;}
 case 'erase':{const points=exRoute(h);if(points.length>1)exRouteHit(h,points,r,dmg);else exArea(h,h,80,dmg);s.route=[];break;}
 case 'atlas':{let points=exRoute(h);if(points.length<2)points=[{x:h.x,y:h.y-80},{x:h.x+80,y:h.y},{x:h.x,y:h.y+80},{x:h.x-80,y:h.y},{x:h.x,y:h.y-80}];exPulse(h,'atlas',life,r,dmg,3,{points});break;}
 }
 if(s.heat>=100){s.heat=0;s.recoverUntil=runElapsedMs+1800;}
}
function exUpdateObject(o,dt){
 if(!o.ex)return false;const h=o.owner,s=exState(h),oldLife=o.life;
 if(h.fused){o.life=0;return true;}
 if(['stitch','toll','bark','forest','concert','storm','vent','faults'].includes(o.kind.slice(3))){o.x=h.x;o.y=h.y;}
 if(currentArena==='abismo'&&abS&&!abWalkable(o.x,o.y)){o.life=0;return true;}
 o.life=Math.max(0,o.life-dt);
 if(o.kind==='ex_bark'){if(oldLife>0&&o.life===0)exArea(h,h,o.r,o.dmg);return true;}
 if(!o.left)return true;o.tick-=Math.min(dt,oldLife);
 while(o.tick<=0&&o.left>0){o.tick+=o.interval;o.left--;const last=o.left===0;
  switch(o.kind){
   case 'ex_line':exLine(h,o,{x:o.bx,y:o.by},o.r,o.dmg);break;
   case 'ex_stitch':for(const e of exTargets(h,e=>distance(e,h)<o.r)){const m=exMark(h,e),n=last?m.n:0;if(last)m.n=0;exHit(h,e,o.dmg*(1+n*.2));}break;
   case 'ex_toll':exArea(h,h,o.r,o.dmg,e=>{if(last&&!isBossRank(e)){const d=distance(e,h)||1;portadorKnock(e,(e.x-h.x)/d,(e.y-h.y)/d,25,180);}});break;
   case 'ex_forest':exArea(h,h,o.r,o.dmg,e=>portadorSlow(h,e,.25,650));break;
   case 'ex_concert':if(o.left%2)exArea(h,h,o.r,o.dmg);else for(const a of heroes)if(distance(a,h)<o.r){exHeal(h,a,.01);exShield(h,a,.02,1400);}break;
   case 'ex_storm':if(last)exDischarge(h,o.r,o.dmg);else exCone(h,o.range,o.dmg,e=>exMark(h,e,1));break;
   case 'ex_swarm':if(s.colony<8){o.life=0;o.left=0;break;}s.colony-=8;exArea(h,o,o.r,o.dmg);break;
   case 'ex_vent':exArea(h,h,o.r,o.dmg);break;
   case 'ex_faults':exArea(h,h,o.r,o.dmg,e=>{if(last&&!isBossRank(e))e.stunTimer=Math.max(e.stunTimer||0,300);});break;
   case 'ex_atlas':exRouteHit(h,o.points,o.r,o.dmg);break;
  }
 }
 return true;
}
const exOriginalObject=ynaraUpdateObject;ynaraUpdateObject=function(o,dt){return exUpdateObject(o,dt)||exOriginalObject(o,dt);};
const exOriginalHero=updatePortadorHero;updatePortadorHero=function(h,dt){exOriginalHero(h,dt);if(!exCandidate(h))return;const s=exState(h);
 if(!h.alive||h.fused){for(const o of portadorObjects)if(o.owner===h)o.life=0;for(const e of enemies)if(e._exMarks)delete e._exMarks[heroes.indexOf(h)];h.exState=null;h.exMarchUntil=0;return;}
 s.heat=Math.max(0,s.heat-dt*.0015);if(!exOwned(h,'swarm').length)s.colony=Math.min(100,s.colony+dt*.009);
 if(h.classKey==='sira'){s.route=exRoute(h);const last=s.route[s.route.length-1];if(last&&(distance(last,h)>75||(arenaHas('heroReachable')&&!arenaHook('heroReachable',last,h))))s.route=[];if(!s.route.length||distance(s.route[s.route.length-1],h)>=16)s.route.push({x:h.x,y:h.y,at:runElapsedMs});s.route=s.route.slice(-12);}
};
const exOriginalTaken=portadorTakenMult;portadorTakenMult=function(h,src){let m=exOriginalTaken(h,src);const s=h.exState;if(s&&s.guardUntil>runElapsedMs&&src&&Number.isFinite(src.x)){const d=distance(h,src)||1;if(((src.x-h.x)*s.guardX+(src.y-h.y)*s.guardY)/d>.5)m*=.75;}if(portadorObjects.some(o=>o.kind==='ex_mound'&&o.life>0&&o.owner.alive&&distance(o,h)<o.r))m*=.92;return m;};
const exOriginalSpeed=portadorSpeedMult;portadorSpeedMult=function(h){let m=exOriginalSpeed(h),s=h.exState;if(h.exMarchUntil>runElapsedMs)m*=1.08;if(s?.guardUntil>runElapsedMs)m*=.8;if(s?.braceUntil>runElapsedMs&&s.shots>0)m*=.75;return m;};
const exOriginalHurt=damageHero;damageHero=function(h,amount,src,transferred){const before=h.hp+(h.shield||0);if(src?.exDiscordUntil>runElapsedMs)amount*=1-src.exDiscordPct;const out=exOriginalHurt(h,amount,src,transferred);if(h.classKey==='baltra'&&h.alive&&h.hp+(h.shield||0)<before){const s=exState(h);if(!(s.vibAt>runElapsedMs)){s.vibration=Math.min(5,s.vibration+1);s.vibAt=runElapsedMs+500;}}return out;};
let exBasicOwner=null,exBasicBudget=0;
const exOriginalBasic=triggerBasic;triggerBasic=function(h){h=h||player;const owner=exBasicOwner,budget=exBasicBudget;if(exCandidate(h)&&!h.cls.ranged){exBasicOwner=h;exBasicBudget=12;}try{return exOriginalBasic(h);}finally{exBasicOwner=owner;exBasicBudget=budget;}};
const exOriginalDamage=damageEnemy;damageEnemy=function(e,amount,opts={}){const h=opts.src||player;if(!exCandidate(h)||opts.fromProc||e.cineT>0||!e.alive)return exOriginalDamage(e,amount,opts);const s=exState(h),before=e.hp;
 if(opts.fromBasic&&exBasicOwner===h&&exBasicBudget--<=0)return;
 if(h.classKey==='nahir'){const m=exMark(h,e),a=Math.atan2(h.y-e.y,h.x-e.x),diff=m.angle===undefined?0:Math.abs(Math.atan2(Math.sin(a-m.angle),Math.cos(a-m.angle)));if(diff>=Math.PI/3&&!(s.angleAt>runElapsedMs)){amount*=1.15;s.angleAt=runElapsedMs+900;}m.angle=a;}
 if(opts.fromBasic){if(['vesper','orsa'].includes(h.classKey))exMark(h,e,1);if(h.classKey==='orsa'&&s.braceUntil>runElapsedMs&&s.shots>0){amount*=1.25;s.shots--;}}
 const result=exOriginalDamage(e,amount,opts);
 if(e.hp<before){if(h.classKey==='maura'&&!(s.seedAt>runElapsedMs)){s.seeds=Math.min(5,s.seeds+1);s.seedAt=runElapsedMs+500;}
 if(h.classKey==='renko'&&opts.fromBasic&&!(s.soilAt>runElapsedMs)&&exOwned(h,'soil').some(o=>distance(e,o)<o.r)){s.soilAt=runElapsedMs+900;for(const a of exTargets(h,a=>distance(a,e)<70))exHit(h,a,amount*.25,true);}}
 return result;
};
let exDeathChain=false;const exOriginalKill=killEnemy;killEnemy=function(e){const owners=!exDeathChain?heroes.filter(h=>h.alive&&h.classKey==='vesper'&&exMark(h,e).n>0):[],p={x:e.x,y:e.y};const out=exOriginalKill(e);if(owners.length){exDeathChain=true;try{for(const h of owners)for(const a of exTargets(h,a=>a!==e&&distance(a,p)<75))exHit(h,a,h.baseDmg*.3,true);}finally{exDeathChain=false;}}return out;};
const exOriginalUse=useSkill;useSkill=function(idx,...args){if(player?.classKey==='zahra'&&exState(player).recoverUntil>runElapsedMs&&idx!==1)return;return exOriginalUse(idx,...args);};
const exOriginalBot=botPortador;botPortador=function(h,cd){if(h.classKey==='zahra'&&exState(h).recoverUntil>runElapsedMs)return;return exOriginalBot(h,cd);};
NET_SKIP_KEYS.add('_exMarks');

const exOriginalUlt=useUltimate;useUltimate=function(...args){if(player?.classKey==='zahra'&&exState(player).recoverUntil>runElapsedMs)return;return exOriginalUlt(...args);};
