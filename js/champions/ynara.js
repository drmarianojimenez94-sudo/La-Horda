"use strict";
// Host authority is shared with the existing portador entity scheduler/serializer.
function ynaraHeal(src,a,pct){
 if(!a.alive || a.fused)return;
 const before=a.hp;a.hp=Math.min(a.maxHp,a.hp+a.maxHp*pct*arenaRuleHealMult());
 if(src.stats)src.stats.healingDone=(src.stats.healingDone||0)+a.hp-before;
}
function ynaraCast(h,sk,dmg,area,dur,power){
 const r=(sk.radius||100)*area,life=(sk.duration||4000)*dur;
 if(sk.kind==="yn_gaze"){
  portadorCone(h,sk.range*area,.85,(e,d)=>{portadorHit(h,e,dmg);portadorSlow(h,e,.3,1500);if(!isBossRank(e)&&distance(e,h)<100)portadorKnock(e,d.x,d.y,35,180);});portadorCue(h,h,100);
 }else if(sk.kind==="yn_stroganoff"){
  portadorLimit(h,"stroganoff",1);portadorAdd(h,"stroganoff",portadorPoint(h,sk.range*area,r),Math.min(7200,life),{r,dmg,heal:Math.min(.016,.01*power)*(portadorSet(h,3)?1.1:1)});
 }else if(sk.kind==="yn_leave"){
  const origin={x:h.x,y:h.y},dir=aimDir(h,sk.range*area),range=Math.min(180,sk.range*area);
  // Sweep in small steps rather than teleport through walls or collapsed floors.
  for(let d=8;d<=range;d+=8){const q={x:origin.x+dir.x*d,y:origin.y+dir.y*d,radius:h.radius||18},old={x:q.x,y:q.y};clampToArena(q);resolveWallCollision(q);
   if(Math.hypot(q.x-old.x,q.y-old.y)>1 || (arenaHas("heroReachable")&&!arenaHook("heroReachable",h,q)) || (currentArena==="abismo"&&abS&&!abSafeAt(q.x,q.y)))break;
   h.x=q.x;h.y=q.y;
  }
  h.slowTimer=0;h.slowAmt=0;portadorLimit(h,"watercurtain",1);portadorAdd(h,"watercurtain",origin,Math.min(4000,life),{bx:h.x,by:h.y,r,dmg});
 }else if(sk.kind==="yn_patience"){
  portadorLimit(h,"patience",1);portadorAdd(h,"patience",h,Math.min(8000,life),{r,dmg,heal:Math.min(.012,.008*power),charges:0,chargeAt:0});portadorCue(h,h,r);
 }
}
function ynaraOnHit(h,amount){
 if(!(amount>0))return;
 if(h.classKey==="ynara"){
  h.ynQuiet=0;
  if(h.ynImmaculate && !(h.shield>0)){h.ynImmaculate=false;portadorWith(h,()=>portadorArea(h,h,90,h.baseDmg*.3));portadorCue(h,h,90);}
 }
 for(const o of portadorObjects)if(o.kind==="patience"&&o.life>0&&o.owner.alive&&distance(o.owner,h)<o.r&&runElapsedMs>=o.chargeAt){o.charges=Math.min(8,o.charges+1);o.chargeAt=runElapsedMs+400;}
}
function ynaraUpdateHero(h,dt){
 if(h.classKey!=="ynara")return;
 if(!h.alive){h.ynQuiet=0;h.ynImmaculate=false;return;}
 if(h.ynImmaculate&&!(h.shield>0)){h.ynImmaculate=false;h.ynQuiet=0;}
 h.ynQuiet=(h.ynQuiet||0)+dt;
 if(!h.ynImmaculate&&h.ynQuiet>=8000){portadorShield(h,.08,9000,h);h.ynImmaculate=true;h.ynQuiet=0;}
}
function ynaraUpdateObject(o,dt){
 if(!["stroganoff","watercurtain","patience"].includes(o.kind))return false;
 const h=o.owner;
 if(o.kind==="patience"){o.x=h.x;o.y=h.y;}
 if(currentArena==="abismo"&&abS&&!abWalkable(o.x,o.y)){o.life=0;return true;}
 if(o.life<=dt){
  if(o.kind==="patience")portadorWith(h,()=>{portadorArea(h,o,o.r,o.dmg*(3+Math.min(8,o.charges)*.35)*(portadorSet(h,4)?1.1:1));portadorCue(h,o,o.r);});
  o.life=0;return true;
 }
 o.life-=dt;o.tick-=dt;
 if(o.tick<=0){o.tick=600;portadorWith(h,()=>{
  for(const e of portadorEnemies(h)){
   const inside=o.kind==="watercurtain"?seSegDist(e.x,e.y,o.x,o.y,o.bx,o.by)<o.r:distance(e,o)<o.r;
   if(inside){portadorHit(h,e,o.dmg);if(o.kind==="watercurtain")portadorSlow(h,e,.3,800);}
  }
  if(o.heal)for(const a of heroes)if(distance(a,o)<o.r)ynaraHeal(h,a,o.heal);
 });}
 return true;
}
