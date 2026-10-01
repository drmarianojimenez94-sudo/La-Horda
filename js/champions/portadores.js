"use strict";
// Autoridad: solo update() del anfitrión modifica estas entidades. Las referencias
// a héroes viajan por el serializador existente; no se guardan closures ni Maps.
let portadorObjects = [];
let portadorNextId = 1;
const PORTADOR_LIMIT = 48;
function portadorReset(){ portadorObjects=[]; portadorNextId=1; }
function portadorOwned(h,kind){ return portadorObjects.filter(o=>o.owner===h && o.kind===kind && o.life>0); }
function portadorSet(h,n){ return setN(h,PORTADORES[h.classKey].set)>=n; }
function portadorMaster(h,b){ const st=talentState(h.classKey); return st && st.mastery===h.classKey+"_"+b; }
function portadorWith(h,fn){ return h.isRemote && typeof netWithHero==="function" ? netWithHero(h,fn) : fn(); }
function portadorPoint(h,range,r){
  const p=aimPoint(h,range,r),o={x:p.x,y:p.y,radius:18};
  clampToArena(o); resolveWallCollision(o);
  if((arenaHas("heroReachable") && !arenaHook("heroReachable",h,o)) || (currentArena==="abismo" && abS && !abSafeAt(o.x,o.y))) return {x:h.x,y:h.y};
  return {x:o.x,y:o.y};
}
function portadorAdd(h,kind,p,life,extra){
  if(portadorObjects.length>=PORTADOR_LIMIT){ const i=portadorObjects.findIndex(o=>o.life<=0 || !o.owner || !o.owner.alive); if(i>=0) portadorObjects.splice(i,1); else return null; }
  const o=Object.assign({id:portadorNextId++,kind,owner:h,x:p.x,y:p.y,life,maxLife:life,tick:0},extra||{});
  portadorObjects.push(o); return o;
}
function portadorLimit(h,kind,n){ const a=portadorOwned(h,kind); while(a.length>=n) a.shift().life=0; }
function portadorEnemies(h){
  if(divinaMode){const side=divinaEnemies.includes(h)?"enemy":"player";return (side==="player"?divinaEnemies:heroes).concat(divinaMinions.filter(e=>e.side!==side),divinaStructures.filter(e=>e.side!==side)).filter(e=>e.alive);}
  return enemies.filter(e=>e.alive && !(e.isDuelLocked && e.duelOwner!==h));
}
function portadorPull(h,e){
  if(isBossRank(e) || (divinaMode && divinaStructures.includes(e)))return;
  const old={x:e.x,y:e.y},d=distance(h,e)||1,px=Math.min(135,Math.max(0,d-75));
  e.x-=(e.x-h.x)/d*px;e.y-=(e.y-h.y)/d*px;clampToArena(e);resolveWallCollision(e);
  if((arenaHas("heroReachable") && !arenaHook("heroReachable",old,e)) || (currentArena==="abismo" && abS && !abSafeAt(e.x,e.y))){e.x=old.x;e.y=old.y;}
}
function portadorKnock(e,dx,dy,px,ms){if(e.cineT>0 || (divinaMode && divinaStructures.includes(e)))return;seKnock(e,dx,dy,px,ms);}
function portadorSlow(h,e,pct,ms){
  if(!e.alive || e.cineT>0) return;
  const p=isBossRank(e)?Math.min(0.12,pct):pct;
  const fresh=!(e.slowTimer>0);
  e.slowAmt=Math.max(e.slowAmt||0,p); e.slowTimer=Math.max(e.slowTimer||0,ms);
  if(fresh && h.stats) h.stats.enemiesControlled++;
  if(h.classKey==="eslabon" && !(h.portCounterUntil>runElapsedMs)){h.portCounterTimer=1600;h.portCounterUntil=runElapsedMs+2200;}
}
function portadorHit(h,e,dmg,proc){
  if(!e.alive)return;
  if(divinaMode){const kind=divinaStructures.includes(e)?"structure":divinaMinions.includes(e)?"minion":"champ";divinaDealDamage({kind,ref:e},dmg,h);}
  else damageEnemy(e,dmg,{src:h,fromProc:!!proc});
}
function portadorArea(h,p,r,dmg){ for(const e of portadorEnemies(h)) if(distance(e,p)<=r+(e.radius||0)) portadorHit(h,e,dmg); }
function portadorCone(h,range,arc,fn){ const d=aimDir(h,range); vfxSkillCone(h.x,h.y,range,Math.atan2(d.y,d.x),arc,h.cls.glow); for(const e of portadorEnemies(h)){ const x=e.x-h.x,y=e.y-h.y,l=Math.hypot(x,y)||1; if(l<=range+(e.radius||0) && (x*d.x+y*d.y)/l>=Math.cos(arc)) fn(e,d); } }
function portadorShield(h,pct,ms,src){
  if(!h.alive || h.fused) return;
  const before=h.shield||0,cap=h.maxHp*0.3;
  h.shield=Math.max(before,Math.min(cap,before+h.maxHp*pct)); h.shieldTimer=Math.max(h.shieldTimer||0,ms);
  if(h.shield>before && src.stats){ src.stats.buffsGranted++; }
}
function portadorCue(h,p,r){ vfxShock(p.x,p.y,8,r,hexToRgb(h.cls.glow),380,h===player?1:0); }
function portadorTurret(h,p,life,dmg){
  portadorLimit(h,"turret",2);
  const hp=h.maxHp*0.45;
  return portadorAdd(h,"turret",p,life,{hp,maxHp:hp,build:500,dmg,range:320,hitTimer:0,attackTimer:300});
}
function portadorResin(h,e,which,duration,dmg){
  if(e.cineT>0) return;
  const slot=heroes.indexOf(h),M=e._portMarks||(e._portMarks={}),m=M[slot]||(M[slot]={resin:0,salt:0});
  m[which]=runElapsedMs+duration;
  e.portResinUntil=which==="resin"?m.resin:e.portResinUntil;
  e.portSaltUntil=which==="salt"?m.salt:e.portSaltUntil;
  if(m.resin>runElapsedMs && m.salt>runElapsedMs){
    m.resin=m.salt=0; e.portResinUntil=e.portSaltUntil=0;
    h.portResidue=Math.min(5,(h.portResidue||0)+1);
    const blast=dmg*(portadorMaster(h,0)?2.4:2.0);
    portadorHit(h,e,blast); if(e.alive) seVuln(e,isBossRank(e)?0.08:0.16,2200);
    portadorCue(h,e,65);
    if(portadorSet(h,3) && !(h.portRefundUntil>runElapsedMs)){h.energy=Math.min(h.maxEnergy,h.energy+8);h.portRefundUntil=runElapsedMs+1500;}
    const a=portadorOwned(h,"alembic").find(z=>distance(z,e)<=z.r);
    if(a && !(h.portEchoUntil>runElapsedMs)){ h.portEchoUntil=runElapsedMs+650; for(const o of portadorEnemies(h)) if(o!==e && distance(o,e)<85) portadorHit(h,o,blast*0.3,true); }
  }
}

function portadorCast(h,sk,isUlt,dmg,area,dur,power){
  const branch=h.cls.skills.indexOf(sk);if(branch>=0 && portadorMaster(h,branch)){power*=1.15;dmg*=1.15;area*=1.1;dur*=1.1;}
  const range=(sk.range||200)*area,r=(sk.radius||100)*area,life=(sk.duration||4000)*dur;
  h.portCastState=isUlt?"ultimate":"cast";
  h.portCastUntil=runElapsedMs+(isUlt?650:420); h.attackAnim=Math.max(h.attackAnim,isUlt?650:420);
  if(h.classKey==="brasa") h.portPressure=Math.min(3,(h.portPressure||0)+1);
  const p=()=>portadorPoint(h,range,r);
  switch(sk.kind){
    case "my_tower": {portadorTurret(h,p(),life,dmg);break;}
    case "my_splash": {const q=p();portadorArea(h,q,r,dmg);portadorLimit(h,"yogurt",3);portadorAdd(h,"yogurt",q,life,{r,dmg:dmg*0.2});portadorCue(h,q,r);break;}
    case "my_bubble": {portadorShield(h,(portadorSet(h,3)?0.24:0.18)*power,life,h);h.slowTimer=0;portadorCue(h,h,45);break;}
    case "my_tantrum": {portadorLimit(h,"tantrum",1);portadorAdd(h,"tantrum",h,life,{r,dmg:dmg*(portadorSet(h,4)?1.15:1)});portadorCue(h,h,r);break;}

    case "br_turret": { const q=p(); portadorTurret(h,q,life,dmg); portadorCue(h,q,40); break; }
    case "br_purge": {
      const pressure=h.portPressure||0;h.portPressure=0;
      portadorCone(h,range,0.85,(e,d)=>{portadorHit(h,e,dmg*(1+pressure*0.12));portadorKnock(e,d.x,d.y,55,200);portadorSlow(h,e,0.35,1200);});
      if(portadorMaster(h,1)) portadorAdd(h,"steam",h,2000,{r:100,dmg:dmg*0.2});
      portadorCue(h,h,range*0.65); break;
    }
    case "br_dismantle": {
      const t=portadorOwned(h,"turret").sort((a,b)=>distance(a,h)-distance(b,h))[0];
      if(t){t.life=0;h.cds[0]=Math.max(0,h.cds[0]-Math.min(6500,3500*power));if(portadorSet(h,3)) portadorAdd(h,"steam",t,2200,{r:90,dmg:h.baseDmg*0.4});}
      h.portSpeedTimer=life; h.portSpeedBonus=Math.min(0.5,0.25*power); if(portadorMaster(h,2)) portadorShield(h,0.08*power,life,h); break;
    }
    case "br_overclock": {
      if(!portadorOwned(h,"turret").length) portadorTurret(h,{x:h.x+35,y:h.y},life,h.baseDmg*runStats.dmgMult*0.65*power);
      h.portOverclockTimer=life;h.portOverclockPower=power;h.portCooldownTimer=0;for(const t of portadorOwned(h,"turret")) t.life=Math.max(t.life,life+2000); break;
    }
    case "es_hook": {
      const q=portadorPoint(h,range,0),e=divinaMode?portadorEnemies(h).filter(e=>distance(h,e)<range).sort((a,b)=>distance(a,q)-distance(b,q))[0]:aimTarget(h,range); if(!e) break;
      const origin={x:e.x,y:e.y};portadorHit(h,e,dmg);portadorSlow(h,e,0.25,1200);
      if(e.alive && !isBossRank(e) && !(e.cineT>0)){
        portadorPull(h,e);
      }
      portadorAdd(h,"hook",origin,350,{bx:h.x,by:h.y});
      if(h.portDoubleHook && portadorSet(h,4)){h.portDoubleHook=false; const second=portadorEnemies(h).find(o=>o!==e && !isBossRank(o) && !isEliteRank(o) && distance(o,h)<range);if(second){portadorHit(h,second,dmg*0.55);portadorPull(h,second);portadorSlow(h,second,0.4,1500);}}
      break;
    }
    case "es_line": {
      const q=p(),d=aimDir(h,range),half=100*area;
      portadorLimit(h,"chain",1);portadorAdd(h,"chain",q,life,{ax:q.x-d.y*half,ay:q.y+d.x*half,bx:q.x+d.y*half,by:q.y-d.x*half,r:22,dmg});break;
    }
    case "es_guard": {
      const candidates=heroes.filter(a=>a!==h && a.alive && !a.fused && distance(a,h)<range);
      const q=h.aim && h.aim.x!==undefined?h.aim:h;
      candidates.sort((a,b)=>h.aim?distance(a,q)-distance(b,q):a.hp/a.maxHp-b.hp/b.maxHp);
      h.portWardSlot=candidates.length?heroes.indexOf(candidates[0]):-1;
      h.portGuardTimer=life;h.portGuardBudget=h.maxHp*Math.min(0.7,(portadorMaster(h,0)?0.5:0.35)*power);h.portGuardRange=range;
      if(!candidates.length) h.portCounterTimer=life;
      if(h.stats) h.stats.buffsGranted++;break;
    }
    case "es_ring": h.portRingTimer=life;h.portRingR=r;h.portRingDmg=dmg;h.portRingTick=0;break;
    case "mo_resin": {
      const q=p();const duration=life*(portadorOwned(h,"alembic").some(a=>distance(a,q)<a.r)?1.4:1);
      for(const e of portadorEnemies(h)) if(distance(e,q)<r){portadorHit(h,e,dmg);if(e.alive){portadorResin(h,e,"resin",duration,dmg);portadorSlow(h,e,0.3,1800);}}
      if(h.portDoubleFlask){h.portDoubleFlask=false;const extra={x:q.x+65,y:q.y};portadorArea(h,extra,r*0.6,dmg*0.35);portadorCue(h,extra,r*0.6);}
      portadorCue(h,q,r);break;
    }
    case "mo_salt": portadorCone(h,range,0.9,e=>{portadorHit(h,e,dmg);if(e.alive) portadorResin(h,e,"salt",life,dmg);});portadorCue(h,h,r);break;
    case "mo_distill": {
      const n=h.portResidue||0;h.portResidue=0;portadorShield(h,(0.06+n*0.025)*power,life,h);h.slowTimer=0;h.slowAmt=0;h.burnTimer=0;
      if(portadorSet(h,4)) h.portDoubleFlask=true;
      if(portadorMaster(h,1)) for(const a of heroes) if(a!==h && a.alive && distance(a,h)<130) portadorShield(a,0.05*power,life,h);
      break;
    }
    case "mo_alembic": portadorLimit(h,"alembic",1);portadorAdd(h,"alembic",p(),life,{r,dmg});break;
    case "fa_lantern": portadorLimit(h,"lantern",1);portadorAdd(h,"lantern",p(),life,{r,shieldPct:0.016*power});break;
    case "fa_flash": portadorCone(h,range,0.85,e=>{portadorHit(h,e,dmg);portadorSlow(h,e,0.35,1500);if(!isBossRank(e) && !(e.cineT>0))e.stunTimer=Math.max(e.stunTimer||0,450);});portadorCue(h,h,r);break;
    case "fa_path": {
      const q=p();portadorLimit(h,"path",1);portadorAdd(h,"path",h,life,{bx:q.x,by:q.y,r,envReduction:Math.min(0.3,0.15*power)});
      if(portadorMaster(h,2)) portadorShield(h,0.06*power,life,h);break;
    }
    case "fa_vigil": h.portVigilTimer=life;h.portVigilR=r;h.portVigilPower=power;h.portVigilTick=0;break;
    case "ir_anchor": portadorLimit(h,"anchor",3);portadorAdd(h,"anchor",p(),life,{r});break;
    case "ir_tension": {
      h.portTensionTimer=life;h.portTensionDmg=dmg;
      if(portadorOwned(h,"anchor").length<2){portadorArea(h,h,r,dmg);for(const e of portadorEnemies(h))if(distance(h,e)<r)portadorSlow(h,e,0.35,1600);}
      break;
    }
    case "ir_cut": {
      const a=portadorOwned(h,"anchor"),q=p();a.sort((u,v)=>distance(u,q)-distance(v,q));const node=a[0];
      if(!node){portadorArea(h,q,r,dmg*0.6);portadorCue(h,q,r);break;}
      const links=portadorLinks(h).filter(l=>l.a.id===node.id || l.b.id===node.id);
      for(const e of portadorEnemies(h))if(distance(e,node)<r || links.some(l=>seSegDist(e.x,e.y,l.a.x,l.a.y,l.b.x,l.b.y)<28))portadorHit(h,e,dmg);
      node.life=0;portadorCue(h,node,r);
      if(portadorSet(h,3))portadorShield(h,0.06*power,3000,h);
      if(portadorSet(h,4) && h.portTriangleTimer>0 && !h.portTriangleCut && portadorOwned(h,"triangle").some(t=>(t.anchorIds||[]).includes(node.id))){h.portTriangleCut=true;portadorArea(h,node,110,dmg*0.3);}
      break;
    }
    case "ir_triangle": {
      const nodes=portadorOwned(h,"anchor");
      const valid=nodes.length===3 && nodes.every((n,i)=>distance(n,nodes[(i+1)%3])<400) && Math.abs(portadorCross(nodes[0],nodes[1],nodes[2]))>1500;
      const pts=valid?nodes.map(n=>({x:n.x,y:n.y})):[{x:h.x,y:h.y-r*0.65},{x:h.x-r*0.6,y:h.y+r*0.4},{x:h.x+r*0.6,y:h.y+r*0.4}];
      portadorLimit(h,"triangle",1);portadorAdd(h,"triangle",h,life,{ax:pts[0].x,ay:pts[0].y,bx:pts[1].x,by:pts[1].y,cx:pts[2].x,cy:pts[2].y,dmg,anchorIds:valid?nodes.map(n=>n.id):[]});
      h.portTriangleTimer=life;h.portTriangleCut=false;break;
    }
  }
}
function portadorLinks(h){ const a=portadorOwned(h,"anchor"),out=[];for(let i=1;i<a.length;i++)if(distance(a[i-1],a[i])<400)out.push({a:a[i-1],b:a[i]});return out; }
function portadorCross(a,b,c){ return (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x); }
function portadorInside(e,o){const a={x:o.ax,y:o.ay},b={x:o.bx,y:o.by},c={x:o.cx,y:o.cy},x=portadorCross(a,b,e),y=portadorCross(b,c,e),z=portadorCross(c,a,e);return !((x<0||y<0||z<0)&&(x>0||y>0||z>0));}
function portadorShareDamage(h,dmg,src){
  // Solo una transferencia por golpe; nunca cadenas de Custodia ni daño gratuito
  // redirigido hacia un guardián inmune, fusionado, colgado o fuera de alcance.
  for(const g of heroes){
    if(g===h || !g.alive || g.classKey!=="eslabon" || !(g.portGuardTimer>0) || heroes[g.portWardSlot]!==h || !(g.portGuardBudget>0) || distance(g,h)>g.portGuardRange || g.invulnTimer>0 || g.fused || g.abHang) continue;
    const share=Math.min(dmg*0.25,g.portGuardBudget);g.portGuardBudget-=share;
    damageHero(g,share,src,true); if(g.stats)g.stats.protectedDamage=(g.stats.protectedDamage||0)+share;
    g.portProtected=(g.portProtected||0)+share;
    if(portadorSet(g,4) && g.portProtected>=g.maxHp*0.3){g.portProtected=0;g.portDoubleHook=true;}
    return dmg-share;
  }
  return dmg;
}
function portadorTakenMult(h,src){
  let m=1;if(h.portCounterTimer>0)m*=0.88;
  for(const g of heroes)if(g.alive && g.classKey==="eslabon" && g.portRingTimer>0 && distance(g,h)<g.portRingR){m*=0.85;break;}
  const lantern=portadorObjects.some(o=>o.kind==="lantern" && o.life>0 && o.owner.alive && distance(h,o)<o.r);
  if(lantern)m*=0.92;
  if(!src || !src.type){const paths=portadorObjects.filter(o=>o.kind==="path" && o.life>0 && o.owner.alive && seSegDist(h.x,h.y,o.x,o.y,o.bx,o.by)<o.r);if(paths.length)m*=1-Math.max(...paths.map(o=>o.envReduction||0.15));}
  return m;
}
function portadorSpeedMult(h){
  let m=h.portSpeedTimer>0?1+(h.portSpeedBonus||0.25):1;if(h.portRingTimer>0)m*=0.8;
  if(heroes.some(g=>g!==h && g.alive && g.classKey==="farolero" && distance(g,h)<230 && h.moving && ((g.x-h.x)*(h.portMoveDX||0)+(g.y-h.y)*(h.portMoveDY||0))>0))m*=1.08;
  return m;
}
function portadorBasicPower(h,amount,opts){
  if(h && h.classKey==="brasa" && opts.fromBasic && (h.portPressure||0)>=3){
    h.portPressure=0;portadorCone(h,120,0.8,e=>damageEnemy(e,amount*0.3,{src:h,fromProc:true}));portadorCue(h,h,90);return amount*1.35;
  }
  return amount;
}
function portadorLightAt(x,y){
  let light=0;
  for(const o of portadorObjects) if(o.kind==="lantern" && o.life>0 && o.owner && o.owner.alive){const d=Math.hypot(x-o.x,y-o.y);if(d<o.r)light=Math.max(light,0.24*(1-d/o.r));}
  for(const h of heroes)if(h.alive && h.portVigilTimer>0){const d=Math.hypot(x-h.x,y-h.y);if(d<90)light=Math.max(light,0.24*(1-d/90));}
  // Consume poca luz; apagones de antorcha y oscuridad especial siguen cortándola.
  if(typeof mnS!=="undefined" && mnS && heroes.some((h,i)=>distance(h,{x,y})<25 && mnS.torch[i]>0)) return 0;
  return light;
}
function updatePortadorHero(h,dt){
  h.portMoveDX=h._portPrevX===undefined?0:h.x-h._portPrevX;h.portMoveDY=h._portPrevY===undefined?0:h.y-h._portPrevY;h._portPrevX=h.x;h._portPrevY=h.y;
  if(!PORTADORES[h.classKey])return;
  h.portMasteryBranch=[0,1,2].findIndex(b=>portadorMaster(h,b));
  const wasGuard=h.portGuardTimer>0,wasClock=h.portOverclockTimer>0;
  for(const key of ["portSpeedTimer","portCounterTimer","portGuardTimer","portRingTimer","portVigilTimer","portTensionTimer","portTriangleTimer","portOverclockTimer","portCooldownTimer"])if(h[key]>0)h[key]=Math.max(0,h[key]-dt);
  if(!h.alive){for(const o of portadorObjects)if(o.owner===h)o.life=0;h.portGuardTimer=h.portRingTimer=h.portVigilTimer=h.portTensionTimer=0;return;}
  if(wasGuard && !(h.portGuardTimer>0) && portadorSet(h,3)){const a=heroes[h.portWardSlot];if(a && a.alive)portadorShield(a,0.05,2500,h);}
  if(wasClock && !(h.portOverclockTimer>0))h.portCooldownTimer=2000;
  if(h.portRingTimer>0){h.portRingTick=(h.portRingTick||0)-dt;if(h.portRingTick<=0){h.portRingTick=650;portadorWith(h,()=>{for(const e of portadorEnemies(h))if(distance(h,e)<h.portRingR){portadorHit(h,e,h.portRingDmg);const d=distance(h,e)||1;portadorKnock(e,(e.x-h.x)/d,(e.y-h.y)/d,25,0);portadorSlow(h,e,0.25,700);}});}}
  if(h.portVigilTimer>0){h.portVigilTick=(h.portVigilTick||0)-dt;if(h.portVigilTick<=0){h.portVigilTick=1300;for(const a of heroes)if(a.alive && distance(a,h)<h.portVigilR)portadorShield(a,0.035*h.portVigilPower,2200,h);}}
  if(h.portTensionTimer>0){h.portTensionTick=(h.portTensionTick||0)-dt;if(h.portTensionTick<=0){h.portTensionTick=550;const links=portadorLinks(h);portadorWith(h,()=>{for(const e of portadorEnemies(h))if(links.some(l=>seSegDist(e.x,e.y,l.a.x,l.a.y,l.b.x,l.b.y)<24)){portadorHit(h,e,h.portTensionDmg);portadorSlow(h,e,portadorMaster(h,0)?0.5:0.35,800);seVuln(e,0.08,1500);}});}}
  if(h.classKey==="farolero" && portadorSet(h,4) && h.portVigilTimer>0 && !(h.portSetPulseUntil>runElapsedMs) && ((h.stats.shieldAbsorbed||0)-(h.portSetAbsorbed||0))>=h.maxHp*0.2){h.portSetAbsorbed=h.stats.shieldAbsorbed;h.portSetPulseUntil=runElapsedMs+2500;for(const a of heroes)if(a.alive && distance(a,h)<h.portVigilR)portadorShield(a,0.02,2200,h);}
}
function updatePortadorObjects(dt){
  for(const o of portadorObjects){
    o.life-=dt;const h=o.owner;if(!h || !h.alive || !heroes.includes(h)){o.life=0;continue;}if(o.life<=0)continue;
    if(currentArena==="abismo" && abS && !abWalkable(o.x,o.y)){o.life=0;continue;}
    if(o.kind==="tantrum"){o.x=h.x;o.y=h.y;}
    o.tick-=dt;
    portadorWith(h,()=>{
      if(o.kind==="turret"){
        if(o.build>0){o.build-=dt;return;}o.attackTimer-=dt;o.hitTimer-=dt;
        if(o.hitTimer<=0){const threats=portadorEnemies(h).filter(e=>distance(e,o)<65);if(threats.length){o.hp-=Math.min(o.maxHp*0.3,threats.reduce((s,e)=>s+(e.dmg||5)*0.35,0));o.hitTimer=850;}}
        if(o.hp<=0){o.life=0;portadorCue(h,o,45);return;}
        if(h.portCooldownTimer>0)return;
        if(o.attackTimer<=0){const e=portadorEnemies(h).filter(e=>distance(e,o)<o.range && (!arenaHas("heroReachable") || arenaHook("heroReachable",o,e))).sort((a,b)=>distance(a,o)-distance(b,o))[0];if(e){const boosted=h.portOverclockTimer>0;if(h.classKey==="myla")portadorSlow(h,e,0.25,1000);portadorHit(h,e,o.dmg*(boosted?1+Math.min(1.5,0.5*(h.portOverclockPower||1)):1));o.attackTimer=boosted?460:850;portadorAdd(h,"shot",o,160,{bx:e.x,by:e.y});}else o.attackTimer=150;}
        if(portadorSet(h,4) && h.portOverclockTimer>0 && o.tick<=0){o.tick=900;const pair=portadorOwned(h,"turret");if(pair.length===2 && pair[0]===o)for(const e of portadorEnemies(h))if(seSegDist(e.x,e.y,pair[0].x,pair[0].y,pair[1].x,pair[1].y)<22)portadorHit(h,e,o.dmg*0.4,true);}
      }else if(o.tick<=0){o.tick=600;
        if(o.kind==="chain")for(const e of portadorEnemies(h))if(seSegDist(e.x,e.y,o.ax,o.ay,o.bx,o.by)<o.r+(e.radius||0)){portadorHit(h,e,o.dmg);portadorSlow(h,e,0.45,850);}
        if(o.kind==="tantrum"){for(const e of portadorEnemies(h))if(distance(o,e)<o.r+(e.radius||0)){portadorHit(h,e,o.dmg);portadorSlow(h,e,0.35,850);}portadorCue(h,o,o.r);}
        if(o.kind==="yogurt")for(const e of portadorEnemies(h))if(distance(o,e)<o.r){portadorHit(h,e,o.dmg);portadorSlow(h,e,0.4,850);}
        if(o.kind==="steam")for(const e of portadorEnemies(h))if(distance(o,e)<o.r){portadorHit(h,e,o.dmg);portadorSlow(h,e,0.3,850);}
        if(o.kind==="alembic")for(const e of portadorEnemies(h))if(distance(o,e)<o.r){portadorHit(h,e,o.dmg);const m=e._portMarks && e._portMarks[heroes.indexOf(h)];if(m)for(const key of ["resin","salt"])if(m[key]>runElapsedMs)m[key]=Math.max(m[key],runElapsedMs+1500);}
        if(o.kind==="triangle")for(const e of portadorEnemies(h))if(portadorInside(e,o)){portadorHit(h,e,o.dmg);portadorSlow(h,e,0.35,800);}
        if(o.kind==="lantern")for(const a of heroes)if(a.alive && distance(o,a)<o.r)portadorShield(a,o.shieldPct,1800,h);
        if(o.kind==="path")for(const a of heroes)if(a.alive && seSegDist(a.x,a.y,o.x,o.y,o.bx,o.by)<o.r){a.slowTimer=Math.max(0,(a.slowTimer||0)-300);if(portadorSet(h,3) && !(a.portPathShieldUntil>runElapsedMs)){a.portPathShieldUntil=runElapsedMs+4500;portadorShield(a,0.025,1800,h);}}
      }
    });
  }
  portadorObjects=portadorObjects.filter(o=>o.life>0);
}
function botPortador(h,cdMult){
  const foes=portadorEnemies(h).filter(e=>distance(e,h)<360);if(!foes.length)return;
  const target=foes.sort((a,b)=>(isBossRank(b)?1000:0)-(isBossRank(a)?1000:0) || distance(a,h)-distance(b,h))[0];
  h.aim={x:target.x,y:target.y};
  let order=[0,1,2];
  if(h.classKey==="myla")order=portadorOwned(h,"turret").length<2?[0,1,2]:h.hp/h.maxHp<0.5?[2,1]:[1];
  if(h.classKey==="brasa"){const t=portadorOwned(h,"turret");order=t.length<2?[0,1]:h.hp/h.maxHp<0.4?[2,1]:[1];if(order[0]===0)h.aim={x:h.x+(target.x-h.x)*0.3,y:h.y+(target.y-h.y)*0.3};}
  if(h.classKey==="eslabon")order=heroes.some(a=>a!==h && a.alive && a.hp/a.maxHp<0.65)?[2,0,1]:[0,1];
  if(h.classKey==="morwen")order=h.hp/h.maxHp<0.55?[2,0,1]:foes.some(e=>{const m=e._portMarks && e._portMarks[heroes.indexOf(h)];return m && m.resin>runElapsedMs;})?[1,0]:[0,1];
  if(h.classKey==="farolero")order=portadorOwned(h,"lantern").length?[1,2]:[0,1];
  if(h.classKey==="iria"){const a=portadorOwned(h,"anchor");order=a.length<3?[0,1]:h.portTensionTimer>0?[2]:[1];if(order[0]===0){const angle=a.length*2.094;h.aim={x:h.x+Math.cos(angle)*100,y:h.y+Math.sin(angle)*100};}}
  if(h.ultCharge>=h.ultMax && h.ultCd<=0 && runLevel>=ULT_MIN_ARENA_LEVEL && (foes.length>=3 || isBossRank(target))){castAbility(h,h.cls.ultimate,true);h.ultCharge=0;h.ultCd=ultCooldownFor(h,h.cls.ultimate.cd,cdMult);h.aim=null;return;}
  for(const idx of order){const sk=h.cls.skills[idx];if(h.cds[idx]>0 || h.energy<sk.cost)continue;h.energy-=sk.cost;h.cds[idx]=sk.cd*1.1*cdMultFor(sk,masteryOf(h.classKey,idx))*cdMult*arenaMods().heroCdMult*arenaRuleCdMult()*talentSkillCdMult(h.classKey,idx);castAbility(h,sk,false,idx);break;}
  h.aim=null;
}
