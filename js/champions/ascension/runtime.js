'use strict';
/* ============================================================
   js/champions/ascension/runtime.js — kits de la expansión Ascensión.
   Simulación del anfitrión (host-authoritative) sobre los sistemas existentes: portadorObjects
   (serializado por js/net/net-game.js), exHit/exSafeStep de la Expedición, damageEnemy (respeta
   cinemáticas y reglas de encuentro de jefes) y limpieza al morir/salir.
   Reglas de seguridad para Fundadores y definitivas:
   - Ejecutar solo comunes "normales" (ascCanExecute): nunca élites, jefes, estructuras ni objetivos.
   - Daño a jefes/subjefes con techo por lanzamiento (ascBossCap): no saltea fases ni scripts.
   - Empujes y atracciones validados (ascSafeMove): nadie queda fuera de la arena ni en zonas inalcanzables.
   ============================================================ */
const ascCandidate=h=>!!(h&&ASCENSION[h.classKey]);
const ASC_MASKS=['inspiration','terror','silence','protection'];
const ASC_FLOW=['current','pressure','wave'];
function ascState(h){return h.asState||(h.asState={light:0,dark:0,lastAff:null,regentUntil:0,regentCdUntil:0,tide:0,tideNext:null,tideUntil:0,highTideUntil:0,bigNext:false,swarm:20,mask:0,empowered:false,plateAt:0,citadelUntil:0,eclipseUntil:0,rideLeft:0,massTick:0,triTick:0,castN:0});}
function ascNow(){return runElapsedMs;}
function ascTargets(h,test,cap=16){return portadorEnemies(h).filter(e=>!(e.cineT>0)&&test(e)).sort((a,b)=>distance(h,a)-distance(h,b)).slice(0,cap);}
function ascCanExecute(e){return !!e&&e.alive&&(e.rank==='normal'||!e.rank)&&!e.structure&&!e.objective&&!(e.cineT>0)&&!e.isDuelLocked&&!(divinaMode);}
function ascMovable(e){return !!e&&e.alive&&!isBossRank(e)&&!e.structure&&!e.objective&&!(e.cineT>0)&&!(divinaMode&&divinaStructures.includes(e));}
// Techo de daño por lanzamiento contra jefes: frac de vida máxima, acumulado por id de lanzamiento.
function ascBossCap(e,dmg,castId,frac){
 if(!isBossRank(e))return dmg;
 const T=e._ascCap||(e._ascCap={});for(const k in T)if(T[k].at<ascNow()-15000)delete T[k];
 const row=T[castId]||(T[castId]={n:0,at:ascNow()}),room=Math.max(0,(e.maxHp||e.hp)*frac-row.n),out=Math.min(dmg,room);row.n+=out;return out;
}
function ascHit(h,e,dmg,castId,frac=.07,proc=false){if(!e.alive||e.cineT>0)return;const d=castId?ascBossCap(e,dmg,castId,frac):dmg;if(d>0)exHit(h,e,d,proc);}
function ascExecute(h,e){if(ascCanExecute(e))portadorWith(h,()=>damageEnemy(e,e.hp+1,{src:h,fromProc:true,execute:true}));}
// Mueve un enemigo hacia (dx,dy)*px solo si el destino es válido; si no, queda donde estaba.
function ascSafeMove(e,dx,dy,px){
 if(!ascMovable(e))return false;const k=isEliteRank(e)?.45:1,old={x:e.x,y:e.y};
 e.x+=dx*px*k;e.y+=dy*px*k;clampToArena(e);resolveWallCollision(e);
 if((arenaHas('heroReachable')&&!arenaHook('heroReachable',old,e))||(currentArena==='abismo'&&abS&&!abSafeAt(e.x,e.y))){e.x=old.x;e.y=old.y;return false;}
 return true;
}
function ascPullTo(e,p,px){const d=distance(e,p);if(d<8)return;ascSafeMove(e,(p.x-e.x)/d,(p.y-e.y)/d,Math.min(px,d-6));}
function ascObject(h,kind,p,life,data={},limit=4){portadorLimit(h,'as_'+kind,limit);const own=portadorObjects.filter(o=>o.owner===h&&o.life>0);if(own.length>=12)own[0].life=0;portadorObjects=portadorObjects.filter(o=>o.life>0);return portadorAdd(h,'as_'+kind,p,Math.min(12000,Math.max(1,life)),{asc:true,r:40,...data});}
function ascOwned(h,kind){return portadorOwned(h,'as_'+kind);}
function ascAllies(h,p,r){return heroes.filter(a=>a.alive&&!a.fused&&distance(a,p)<r);}
function ascLine(h,a,b,r,fn,cap){for(const e of ascTargets(h,e=>seSegDist(e.x,e.y,a.x,a.y,b.x,b.y)<=r+(e.radius||0),cap))fn(e);}
function ascArea(h,p,r,fn,cap){for(const e of ascTargets(h,e=>distance(e,p)<=r+(e.radius||0),cap))fn(e);}
function ascTeleport(h,p){if(!p)return false;const o={x:p.x,y:p.y,radius:h.radius||18};clampToArena(o);resolveWallCollision(o);
 if((arenaHas('heroReachable')&&!arenaHook('heroReachable',h,o))||(currentArena==='abismo'&&abS&&!abSafeAt(o.x,o.y)))return false;h.x=o.x;h.y=o.y;return true;}
function ascCue(h,action,extra={}){const dir=aimDir(h,200);h.asCue={action,x:h.x,y:h.y,angle:Math.atan2(dir.y,dir.x),until:ascNow()+(extra.ult?900:420),...extra};}

/* ---------------- Nano GM: Autoridad del GM ---------------- */
function nanoRegent(h){return ascState(h).regentUntil>ascNow();}
function nanoEnterRegent(h,ms,force){const s=ascState(h);if(!force&&s.regentCdUntil>ascNow())return;s.regentUntil=ascNow()+ms;s.regentCdUntil=ascNow()+20000;s.light=0;s.dark=0;ascCue(h,'regent',{ult:true});if(typeof playSfx==='function')playSfx('asc_regent');}
function nanoAffinity(h,sk){
 const s=ascState(h);let aff=sk.affinity;
 if(aff==='swap')aff=s.lastAff==='light'?'dark':'light';
 if(aff==='light'||aff==='dark'){s[aff]=Math.min(3,s[aff]+(s.lastAff&&s.lastAff!==aff?2:1));s.lastAff=aff;}
 if(!nanoRegent(h)&&s.light>=2&&s.dark>=2)nanoEnterRegent(h,8000);
 return nanoRegent(h)?'both':aff;
}
/* ---------------- Facu GM: Mente de Marea ---------------- */
function facuFlow(h,sk){
 const s=ascState(h),flow=sk.affinity==='wave'?'wave':sk.affinity;if(!ASC_FLOW.includes(flow))return 1;
 if(s.tideUntil>ascNow()&&s.tideNext===flow){s.tide=Math.min(3,s.tide+1);
  const next=ASC_FLOW[(ASC_FLOW.indexOf(flow)+1)%3],idx=h.cls.skills.findIndex(k=>k.affinity===next||(next==='wave'&&k.affinity==='wave'));
  if(idx>=0&&h.cds&&h.cds[idx]>0)h.cds[idx]*=.85;
 }else if(s.tide>0){s.tide=0;exShield(h,h,.03,2500);}
 s.tideNext=ASC_FLOW[(ASC_FLOW.indexOf(flow)+1)%3];s.tideUntil=ascNow()+6000;
 const mult=1+.2*s.tide;
 if(s.tide>=3){s.highTideUntil=ascNow()+8000;s.bigNext=true;s.tide=0;ascCue(h,'high_tide',{ult:true});if(typeof playSfx==='function')playSfx('asc_hightide');}
 return mult;
}
/* ---------------- Velmira: máscaras ---------------- */
function velmiraApply(h,target,isEnemy,power){
 const mask=ASC_MASKS[ascState(h).mask],t=ascNow();
 if(isEnemy){
  if(mask==='terror'){portadorSlow(h,target,.4,1500);const d=distance(target,h)||1;ascSafeMove(target,(target.x-h.x)/d,(target.y-h.y)/d,30*power);}
  else if(mask==='silence'){target._ascSilenceUntil=Math.max(target._ascSilenceUntil||0,t+2500);if(isEliteRank(target))target.stunTimer=Math.max(target.stunTimer||0,250);}
 }else{
  if(mask==='inspiration'){target.portSpeedTimer=Math.max(target.portSpeedTimer||0,3000);target.portSpeedBonus=.2;target._ascInspireUntil=t+3000;}
  else if(mask==='protection')exShield(h,target,.06*power,3000);
 }
}
/* ---------------- lanzamiento ---------------- */
function ascensionCast(h,sk,isUlt,dmg,area,dur,power){
 if(!h.alive||h.fused)return;
 const s=ascState(h),k=h.classKey,castId=k+':'+(++s.castN)+':'+ascNow();
 let r=Math.min(isUlt?480:240,(sk.radius||100)*area),range=Math.min(420,(sk.range||200)*area),life=Math.min(9000,(sk.duration||2400)*dur);
 const dir=aimDir(h,range||200),end={x:h.x+dir.x*range,y:h.y+dir.y*range},origin={x:h.x,y:h.y},point=()=>portadorPoint(h,range,r);
 if(s.empowered&&sk.action!=='face_swap'){dmg*=1.3;power*=1.3;s.empowered=false;}
 let big=1;
 if(k==='facu_gm'&&!isUlt){const m=facuFlow(h,sk);dmg*=m;power*=m;if(s.bigNext&&s.highTideUntil>ascNow()){big=2;r*=2;s.bigNext=false;}}
 let aff=k==='nano_gm'?nanoAffinity(h,sk):null;if(k==='nano_gm'&&nanoRegent(h)){dmg*=1.2;r*=1.15;}
 ascCue(h,sk.action,{ult:!!isUlt,r,range,bx:end.x,by:end.y});
 if(typeof playSfx==='function')playSfx('asc_'+k+(isUlt?'_ult':'_cast'));
 h.portCastState=isUlt?'ultimate':'cast';h.portCastUntil=ascNow()+(isUlt?700:420);
 if(isUlt)h._ultLockUntil=Math.max(h._ultLockUntil||0,ascNow()+Math.min(life,2500));
 switch(sk.action){
 // ---- Nano GM ----
 case 'sentence':{const both=aff==='both';
  ascLine(h,h,end,sk.radius,e=>{ascHit(h,e,dmg);seVuln(e,.15,4000);e._ascSentencedUntil=ascNow()+4000;if(e.alive&&ascCanExecute(e)&&e.hp/e.maxHp<.22)ascExecute(h,e);});
  if(both)for(const a of heroes)if(a.alive&&seSegDist(a.x,a.y,h.x,h.y,end.x,end.y)<60)exShield(h,a,.04,3000);break;}
 case 'edict':ascObject(h,'edict',point(),life,{r,dmg:dmg*.35,both:aff==='both',tick:0},2);break;
 case 'invert':{const dest=point(),eff=aff==='both'?'both':aff;
  ascObject(h,'rune',origin,700,{r:sk.radius*area,dmg,eff,tick:600},2);
  if(ascTeleport(h,dest)&&(eff==='light'||eff==='both'))for(const a of ascAllies(h,h,150)){exHeal(h,a,.06);exShield(h,a,.04,2500);}
  break;}
 case 'judgement':ascObject(h,'judgement',{x:h.x,y:h.y},2600,{r,dmg,castId,fired:false},1);h._ascLiftUntil=ascNow()+2600;break;
 // ---- Facu GM ----
 case 'current':ascObject(h,'current',origin,life,{bx:end.x,by:end.y,dx:dir.x,dy:dir.y,r:sk.radius*area*big,dmg:dmg*.25,tick:0,hitTick:0},2);break;
 case 'pressure':{const p=point();ascArea(h,p,r,e=>{ascPullTo(e,p,isEliteRank(e)?50:120);ascHit(h,e,dmg);portadorSlow(h,e,.35,1500);},20);ascCue(h,'pressure',{x:p.x,y:p.y,r});break;}
 case 'ride':s.rideLeft=Math.min(340,range);s.rideDX=dir.x;s.rideDY=dir.y;s.rideDmg=dmg;s.rideR=sk.radius*area*big;s.rideHit=new Set();s.rideAllies=new Set();s.rideLast={x:h.x,y:h.y};break;
 case 'ocean':ascObject(h,'ocean',{x:h.x,y:h.y},4200,{r,dmg,castId,dx:dir.x,dy:dir.y,fired:false,tick:0,hitTick:0},1);h._ascLiftUntil=ascNow()+4200;break;
 // ---- Aurelia ----
 case 'prism':{const p=point();ascObject(h,'node',p,life,{r:16},3);ascArea(h,p,sk.radius*area,e=>ascHit(h,e,dmg));break;}
 case 'refract':{const nodes=ascOwned(h,'node');ascLine(h,h,end,sk.radius*area,e=>ascHit(h,e,dmg));
  for(const n of nodes)if(seSegDist(n.x,n.y,h.x,h.y,end.x,end.y)<40){const t=ascTargets(h,e=>distance(e,n)<260,1)[0];if(t){ascHit(h,t,dmg*.6);n.beamTo={x:t.x,y:t.y,until:ascNow()+300};}}
  break;}
 case 'luminal':{const nodes=ascOwned(h,'node').sort((a,b)=>distance(b,h)-distance(a,h)),dest=nodes[0]?{x:nodes[0].x,y:nodes[0].y}:point();
  ascObject(h,'node',origin,9000*dur,{r:16},3);if(ascTeleport(h,dest))ascArea(h,h,sk.radius*area,e=>ascHit(h,e,dmg));break;}
 case 'cathedral':{let nodes=ascOwned(h,'node').slice(-3);const c=portadorPoint(h,200,140);
  if(nodes.length<3){for(const n of nodes)n.life=0;nodes=[0,1,2].map(i=>{const a=-Math.PI/2+i*2.094,p={x:c.x+Math.cos(a)*140,y:c.y+Math.sin(a)*140,radius:16};clampToArena(p);return ascObject(h,'node',p,life+500,{r:16},3);}).filter(Boolean);}
  const [A,B,C]=nodes;if(A&&B&&C)ascObject(h,'cathedral',{x:(A.x+B.x+C.x)/3,y:(A.y+B.y+C.y)/3},life,{ax:A.x,ay:A.y,bx:B.x,by:B.y,cx:C.x,cy:C.y,r,dmg,castId,tick:0},1);
  break;}
 // ---- Khepri ----
 case 'swarm_send':{const p=point();ascObject(h,'swarm',{x:h.x,y:h.y},life+700,{r,dmg:dmg*(.25+s.swarm/60*.5),tx:p.x,ty:p.y,tick:0,phase:'go'},1);break;}
 case 'carapace':{const used=Math.min(15,s.swarm);s.swarm-=used;exShield(h,h,Math.min(.14,.03+.006*used),life);ascCue(h,'carapace',{n:used});break;}
 case 'elytra':{const a={x:h.x,y:h.y};exDash(h,dir,Math.min(220,range));ascLine(h,a,h,sk.radius*area,e=>ascHit(h,e,dmg*(1+s.swarm/120)));break;}
 case 'eclipse':s.eclipseUntil=ascNow()+life;ascObject(h,'eclipse',{x:h.x,y:h.y},life,{r,dmg:dmg*(.6+s.swarm/100),tick:0,castId},1);break;
 // ---- Velmira ----
 case 'mask_throw':ascLine(h,h,end,sk.radius*area,e=>{ascHit(h,e,dmg);velmiraApply(h,e,true,power);});
  for(const a of heroes)if(a.alive&&seSegDist(a.x,a.y,h.x,h.y,end.x,end.y)<50)velmiraApply(h,a,false,power);break;
 case 'chorus':ascArea(h,h,r,e=>{ascHit(h,e,dmg);velmiraApply(h,e,true,power);});for(const a of ascAllies(h,h,r))velmiraApply(h,a,false,power);break;
 case 'face_swap':s.mask=(s.mask+1)%4;s.empowered=true;exDash(h,dir,Math.min(140,range));ascArea(h,h,sk.radius*area,e=>ascHit(h,e,dmg));break;
 case 'theatre':ascObject(h,'theatre',{x:h.x,y:h.y},life,{r,dmg,act:-1,actMs:life/4,castId},1);break;
 // ---- Vhal ----
 case 'star_bolt':ascLine(h,h,end,sk.radius*area,e=>{ascHit(h,e,dmg);ascMass(e,1);});break;
 case 'well':ascObject(h,'well',point(),life,{r,dmg,tick:0,massTick:0},2);break;
 case 'orbit':{const c=point(),a0=Math.atan2(h.y-c.y,h.x-c.x),rad=Math.max(60,Math.min(160,distance(h,c))),pts=[{x:h.x,y:h.y}];
  for(let i=1;i<=8;i++){const a=a0+i*Math.PI/8,p={x:c.x+Math.cos(a)*rad,y:c.y+Math.sin(a)*rad};if(!exSafeStep(h,p))break;pts.push({x:h.x,y:h.y});}
  ascObject(h,'trail',pts[0],1800,{points:pts,r:sk.radius*area,dmg,hit:false},2);break;}
 case 'collapse':ascObject(h,'collapse',point(),life,{r,dmg,castId,tick:0,fired:false},1);break;
 // ---- Bront ----
 case 'plate_throw':ascLine(h,h,end,sk.radius*area,e=>ascHit(h,e,dmg));ascObject(h,'plate',end,12000,{r:34},4);break;
 case 'plate_wall':{const c={x:h.x+dir.x*90,y:h.y+dir.y*90},px=-dir.y,py=dir.x,half=Math.min(110,range/2);
  ascObject(h,'wall',c,life,{ax:c.x-px*half,ay:c.y-py*half,bx:c.x+px*half,by:c.y+py*half,r:sk.radius*area,dmg,tick:0},3);break;}
 case 'ram':{const a={x:h.x,y:h.y};exDash(h,dir,Math.min(200,range));ascLine(h,a,h,sk.radius*area,e=>{ascHit(h,e,dmg);if(isEliteRank(e))e.stunTimer=Math.max(e.stunTimer||0,300);else ascSafeMove(e,dir.x,dir.y,60);});break;}
 case 'citadel':{s.citadelUntil=ascNow()+life;for(const o of ascOwned(h,'wall'))o.life=0;const R=r;
  for(let i=0;i<4;i++){const a=i*Math.PI/2,c={x:h.x+Math.cos(a)*R,y:h.y+Math.sin(a)*R},px=-Math.sin(a),py=Math.cos(a);ascObject(h,'wall',c,life,{ax:c.x-px*R*.7,ay:c.y-py*R*.7,bx:c.x+px*R*.7,by:c.y+py*R*.7,r:24,dmg:dmg,tick:0,citadel:true},4);}
  ascObject(h,'keep',{x:h.x,y:h.y},life,{r:R},1);break;}
 // ---- Oriel ----
 case 'portal':{for(const o of ascOwned(h,'portal'))o.life=0;const pair=ascNow(),b=point();
  ascObject(h,'portal',origin,life,{r:38,pair,side:0,tick:0},2);ascObject(h,'portal',b,life,{r:38,pair,side:1,tick:0},2);break;}
 case 'rift_echo':{const ps=ascOwned(h,'portal');const at=ps.length?ps:[h];for(const p of at){ascArea(h,p,r,e=>ascHit(h,e,dmg));for(const a of ascAllies(h,p,r))exHeal(h,a,.03);}ascCue(h,'rift_echo',{points:at.map(p=>({x:p.x,y:p.y}))});break;}
 case 'rift_step':{const ps=ascOwned(h,'portal').sort((a,b)=>distance(b,h)-distance(a,h)),dest=ps[0]?{x:ps[0].x,y:ps[0].y}:point();
  ascObject(h,'scar',origin,2500,{r:sk.radius*area,dmg:dmg*.4,tick:0},2);if(ascTeleport(h,dest))ascArea(h,h,60,e=>ascHit(h,e,dmg*.6));break;}
 case 'great_rift':ascObject(h,'great',point(),life,{r,dmg,tick:0,echoes:0,castId},1);break;
 }
}
function ascMass(e,n){if(!e.alive)return;const m=e._ascMass&&e._ascMass.until>ascNow()?e._ascMass.n:0;e._ascMass={n:Math.min(5,m+n),until:ascNow()+8000};}
function ascMassOf(e){return e._ascMass&&e._ascMass.until>ascNow()?e._ascMass.n:0;}

/* ---------------- objetos ---------------- */
function ascUpdateObject(o,dt){
 if(!o.asc)return false;const h=o.owner,s=ascState(h),t=ascNow();
 if(h.fused||!h.alive){o.life=0;return true;}
 if(['eclipse','keep'].includes(o.kind.slice(3))){o.x=h.x;o.y=h.y;}
 const old=o.life;o.life=Math.max(0,o.life-dt);o.tick=(o.tick||0)-dt;const age=(o.maxLife||0)-o.life;
 portadorWith(h,()=>{switch(o.kind){
 case 'as_edict':if(o.tick<=0){o.tick=500;for(const a of ascAllies(h,o,o.r)){exShield(h,a,.03,1200);exHeal(h,a,.012);}ascArea(h,o,o.r,e=>{portadorSlow(h,e,.2,700);if(o.both)ascHit(h,e,o.dmg);});}break;
 case 'as_rune':if(old>0&&o.life===0&&(o.eff==='dark'||o.eff==='both'))ascArea(h,o,o.r,e=>ascHit(h,e,o.dmg));break;
 case 'as_judgement':
  if(age<700){ascArea(h,o,o.r,e=>{if(!isBossRank(e))e.stunTimer=Math.max(e.stunTimer||0,200);},40);}
  else if(!o.fired){o.fired=true;
   for(const a of heroes)if(a.alive&&!a.fused){const before=a.hp;a.hp=Math.min(a.maxHp,a.hp+a.maxHp*.25*arenaRuleHealMult());if(h.stats)h.stats.healingDone=(h.stats.healingDone||0)+a.hp-before;exShield(h,a,.15,6000);a.portSpeedTimer=Math.max(a.portSpeedTimer||0,6000);a.portSpeedBonus=.2;}
   ascArea(h,o,o.r,e=>{if(ascCanExecute(e)&&e.hp/e.maxHp<=.45)ascExecute(h,e);else ascHit(h,e,isBossRank(e)?o.dmg:o.dmg*(isEliteRank(e)?1.6:1.2),o.castId,.07);},60);
   nanoEnterRegent(h,8000,true);if(typeof playSfx==='function')playSfx('asc_judgement');
  }break;
 case 'as_current':o.hitTick=(o.hitTick||0)-dt;
  if(o.tick<=0){o.tick=120;ascLine(h,o,{x:o.bx,y:o.by},o.r,e=>ascSafeMove(e,o.dx,o.dy,9),24);for(const a of heroes)if(a.alive&&seSegDist(a.x,a.y,o.x,o.y,o.bx,o.by)<o.r+20){a.portSpeedTimer=Math.max(a.portSpeedTimer||0,600);a.portSpeedBonus=.25;}}
  if(o.hitTick<=0){o.hitTick=500;ascLine(h,o,{x:o.bx,y:o.by},o.r,e=>ascHit(h,e,o.dmg));}break;
 case 'as_ocean':
  if(age>=1000&&age<3400){o.hitTick=(o.hitTick||0)-dt;if(o.tick<=0){o.tick=180;ascArea(h,o,o.r,e=>ascPullTo(e,o,isEliteRank(e)?7:16),60);}
   if(o.hitTick<=0){o.hitTick=600;ascArea(h,o,o.r,e=>ascHit(h,e,o.dmg*.3,o.castId,.08),60);}}
  else if(age>=3400&&!o.fired){o.fired=true;ascArea(h,o,o.r+40,e=>{ascHit(h,e,o.dmg,o.castId,.08);ascSafeMove(e,o.dx,o.dy,90);},60);for(const a of heroes)if(a.alive)exShield(h,a,.1,4000);if(typeof playSfx==='function')playSfx('asc_wave');}
  break;
 case 'as_node':break;
 case 'as_cathedral':if(o.tick<=0){o.tick=700;for(const e of ascTargets(h,e=>portadorInside(e,o)||distance(e,o)<o.r*.5,40))ascHit(h,e,o.dmg,o.castId,.06);for(const a of heroes)if(a.alive&&(portadorInside(a,o)||distance(a,o)<o.r*.5))exHeal(h,a,.015);}break;
 case 'as_swarm':{const T={x:o.tx,y:o.ty},d=distance(o,T);
  if(o.phase==='go'){const step=Math.min(d,dt*.42);if(d>4){o.x+=(T.x-o.x)/d*step;o.y+=(T.y-o.y)/d*step;}else o.phase='hold';}
  if(o.life<700&&o.phase!=='back'){o.phase='back';}
  if(o.phase==='back'){const dh=distance(o,h);if(dh>4){const st=Math.min(dh,dt*.5);o.x+=(h.x-o.x)/dh*st;o.y+=(h.y-o.y)/dh*st;}}
  else if(o.tick<=0){o.tick=300;ascArea(h,o,o.r,e=>ascHit(h,e,o.dmg),12);}
  break;}
 case 'as_eclipse':if(o.tick<=0){o.tick=400;ascArea(h,o,o.r,e=>ascHit(h,e,o.dmg,o.castId,.06),20);}if(old>0&&o.life===0)s.swarm=60;break;
 case 'as_theatre':{const act=Math.min(3,Math.floor(age/o.actMs));if(act!==o.act){o.act=act;const saved=s.mask;s.mask=act;
   ascArea(h,o,o.r,e=>{ascHit(h,e,o.dmg,o.castId,.06);velmiraApply(h,e,true,1.2);},30);for(const a of ascAllies(h,o,o.r))velmiraApply(h,a,false,1.2);s.mask=saved;}
  break;}
 case 'as_well':o.massTick=(o.massTick||0)-dt;if(o.tick<=0){o.tick=200;ascArea(h,o,o.r,e=>ascPullTo(e,o,6*(1+ascMassOf(e)*.3)),30);}
  if(o.massTick<=0){o.massTick=500;ascArea(h,o,o.r,e=>{ascHit(h,e,o.dmg);if(Math.random()<.5)ascMass(e,1);},30);}break;
 case 'as_trail':if(!o.hit){o.hit=true;const pts=o.points;for(const e of ascTargets(h,e=>pts.slice(1).some((p,i)=>seSegDist(e.x,e.y,pts[i].x,pts[i].y,p.x,p.y)<o.r)))
  {ascHit(h,e,o.dmg);ascMass(e,1);}}break;
 case 'as_collapse':
  if(age<1500){if(o.tick<=0){o.tick=500;ascArea(h,o,120,e=>ascHit(h,e,o.dmg*.3,o.castId,.08));}}
  else if(age<3700){if(o.tick<=0){o.tick=200;ascArea(h,o,320,e=>ascPullTo(e,o,isEliteRank(e)?5:14),40);}}
  else if(!o.fired){o.fired=true;let mass=0;ascArea(h,o,o.r,e=>{mass+=ascMassOf(e);},40);const mult=Math.min(3,1+.15*mass);
   ascArea(h,o,o.r,e=>{ascHit(h,e,o.dmg*mult,o.castId,.08);if(e._ascMass)e._ascMass.n=0;},40);if(typeof playSfx==='function')playSfx('asc_collapse');}
  break;
 case 'as_plate':ascArea(h,o,o.r+6,e=>portadorSlow(h,e,.3,500),8);break;
 case 'as_wall':if(o.tick<=0){o.tick=500;ascLine(h,{x:o.ax,y:o.ay},{x:o.bx,y:o.by},o.r,e=>{ascHit(h,e,o.dmg*.45);portadorSlow(h,e,.6,700);},20);}break;
 case 'as_keep':if(o.tick<=0){o.tick=1000;for(const a of ascAllies(h,o,o.r))exHeal(h,a,.01);}break;
 case 'as_portal':{const other=ascOwned(h,'portal').find(p=>p.pair===o.pair&&p!==o);
  if(other)for(const a of heroes)if(a.alive&&!a.fused&&distance(a,o)<o.r&&!(a._ascPortalAt>t)){if(ascTeleport(a,{x:other.x,y:other.y})){a._ascPortalAt=t+1300;exShield(h,a,.05,3000);a.portSpeedTimer=Math.max(a.portSpeedTimer||0,3000);a.portSpeedBonus=.2;}}
  if(o.tick<=0){o.tick=600;ascArea(h,o,o.r+8,e=>{ascHit(h,e,h.baseDmg?h.baseDmg*.5:4);const d=distance(e,o)||1;ascSafeMove(e,(e.x-o.x)/d,(e.y-o.y)/d,50);},8);}
  break;}
 case 'as_scar':if(o.tick<=0){o.tick=500;ascArea(h,o,o.r,e=>ascHit(h,e,o.dmg));}break;
 case 'as_great':if(o.tick<=0){o.tick=600;ascArea(h,o,o.r,e=>{ascHit(h,e,o.dmg*.35,o.castId,.07);portadorSlow(h,e,.35,800);},40);
   if(o.echoes<6&&age>400){o.echoes++;const tgt=ascTargets(h,e=>distance(e,o)<o.r,1)[0];if(tgt){ascHit(h,tgt,o.dmg*1.2,o.castId,.07);o.echo={x:tgt.x,y:tgt.y,until:t+500,champ:o.echoes};}}}
  break;
 }});
 return true;
}
const ascOriginalObject=ynaraUpdateObject;ynaraUpdateObject=function(o,dt){return ascUpdateObject(o,dt)||ascOriginalObject(o,dt);};

/* ---------------- héroe: pasivas, desplazamientos, limpieza ---------------- */
const ascOriginalHero=updatePortadorHero;updatePortadorHero=function(h,dt){ascOriginalHero(h,dt);if(!ascCandidate(h))return;const s=ascState(h),t=ascNow();
 // apariencia del propio jugador en el héroe (el anfitrión la replica a los invitados en el snapshot)
 if(h===player&&save.champions[h.classKey])h.ascSkin=save.champions[h.classKey].ascSkin|0;
 if(!h.alive||h.fused){for(const o of portadorObjects)if(o.owner===h&&o.asc)o.life=0;for(const e of enemies){if(e._ascMass&&h.classKey==='vhal')delete e._ascMass;}s.rideLeft=0;s.regentUntil=0;s.eclipseUntil=0;s.citadelUntil=0;s.highTideUntil=0;return;}
 // Cabalgar la Ola: desplazamiento fluido en ~0,5 s, validado paso a paso.
 if(s.rideLeft>0){const step=Math.min(s.rideLeft,dt*.62);let moved=0;
  while(moved<step){const st=Math.min(6,step-moved);if(!exSafeStep(h,{x:h.x+s.rideDX*st,y:h.y+s.rideDY*st})){s.rideLeft=0;break;}moved+=st;}
  s.rideLeft=Math.max(0,s.rideLeft-step);
  portadorWith(h,()=>{for(const e of ascTargets(h,e=>distance(e,h)<s.rideR+(e.radius||0)&&!s.rideHit.has(e),12)){s.rideHit.add(e);ascHit(h,e,s.rideDmg);const side=((e.x-h.x)*-s.rideDY+(e.y-h.y)*s.rideDX)>=0?1:-1;ascSafeMove(e,-s.rideDY*side,s.rideDX*side,45);portadorSlow(h,e,.3,1200);}});
  for(const a of heroes)if(a!==h&&a.alive&&distance(a,h)<60&&!s.rideAllies.has(a)){s.rideAllies.add(a);exShield(h,a,.05,3000);}
  if(distance(s.rideLast,h)>40||s.rideLeft===0){ascObject(h,'foam',{x:s.rideLast.x,y:s.rideLast.y},2000,{bx:h.x,by:h.y,r:26},6);s.rideLast={x:h.x,y:h.y};}
 }
 for(const o of ascOwned(h,'foam'))if(o.tick<=0){o.tick=400;portadorWith(h,()=>ascLine(h,o,{x:o.bx,y:o.by},o.r,e=>portadorSlow(h,e,.3,800),10));}
 // Aurelia: Convergencia (triángulo de tres nodos).
 if(h.classKey==='aurelia'){s.triTick-=dt;const n=ascOwned(h,'node').slice(-3);if(n.length===3&&s.triTick<=0&&!ascOwned(h,'cathedral').length){s.triTick=500;const triId='tri:'+heroes.indexOf(h)+':'+Math.floor(ascNow()/10000);const tri={ax:n[0].x,ay:n[0].y,bx:n[1].x,by:n[1].y,cx:n[2].x,cy:n[2].y};
  portadorWith(h,()=>{for(const e of ascTargets(h,e=>portadorInside(e,tri),20)){ascHit(h,e,h.baseDmg*1.1||8,triId,.03);portadorSlow(h,e,.25,600);}});}}
 // Vhal: Masa Crítica.
 if(h.classKey==='vhal'){s.massTick-=dt;if(s.massTick<=0){s.massTick=600;const heavy=enemies.filter(e=>e.alive&&ascMassOf(e)>=3).slice(0,6);for(const m of heavy)for(const e of ascTargets(h,e=>e!==m&&distance(e,m)<110,8))ascPullTo(e,m,6);}}
 // Bront: Ciudadela inmóvil.
 if(s.citadelUntil>t){h.vx=0;h.vy=0;}
};
const ascOriginalTaken=portadorTakenMult;portadorTakenMult=function(h,src){let m=ascOriginalTaken(h,src);const t=ascNow();
 for(const o of portadorObjects){if(!o.asc||o.life<=0||!o.owner?.alive)continue;
  if(o.kind==='as_edict'&&distance(h,o)<o.r)m*=.85;
  else if(o.kind==='as_plate'&&distance(h,o)<70)m*=.88;
  else if(o.kind==='as_keep'&&distance(h,o)<o.r)m*=.8;
  else if(o.kind==='as_great'&&distance(h,o)<o.r)m*=.8;}
 const s=h.asState;if(s){if(s.regentUntil>t)m*=.85;if(s.eclipseUntil>t)m*=.4;if(s.citadelUntil>t)m*=.6;if(s.rideLeft>0)m*=.7;}
 return m;};
const ascOriginalSpeed=portadorSpeedMult;portadorSpeedMult=function(h){let m=ascOriginalSpeed(h);const s=h.asState;if(s){if(s.citadelUntil>ascNow())m*=0;if(s.highTideUntil>ascNow())m*=1.15;}return m;};
const ascOriginalHurt=damageHero;damageHero=function(h,amount,src,transferred){
 if(src&&src._ascSilenceUntil>ascNow())amount*=.75;
 const out=ascOriginalHurt(h,amount,src,transferred);
 if(h&&h.classKey==='bront'&&h.alive){const s=ascState(h);if(s.plateAt<ascNow()){s.plateAt=ascNow()+2500;const a=Math.random()*6.283;ascObject(h,'plate',{x:h.x+Math.cos(a)*40,y:h.y+Math.sin(a)*40},12000,{r:34},4);}}
 return out;};
const ascOriginalDamage=damageEnemy;damageEnemy=function(e,amount,opts={}){const h=opts.src;
 if(h&&h._ascInspireUntil>ascNow()&&!opts.execute)amount*=1.12;
 if(h&&h.classKey==='facu_gm'&&opts.fromBasic&&h.asState&&h.asState.highTideUntil>ascNow()&&!opts.fromProc){const res=ascOriginalDamage(e,amount,opts);portadorWith(h,()=>ascArea(h,e,60,x=>{if(x!==e)ascHit(h,x,amount*.35,null,.07,true);},4));return res;}
 return ascOriginalDamage(e,amount,opts);};
const ascOriginalKill=killEnemy;killEnemy=function(e){const out=ascOriginalKill(e);for(const h of heroes)if(h.alive&&h.classKey==='khepri'&&distance(h,e)<260){const s=ascState(h);s.swarm=Math.min(60,s.swarm+3);}return out;};
NET_SKIP_KEYS.add('_ascCap');NET_SKIP_KEYS.add('rideHit');NET_SKIP_KEYS.add('rideAllies');

/* ---------------- Nano + Facu: reacción cosmética al empezar juntos ---------------- */
let ascFounderMeet=null;
function founderArenaInteraction(){
 ascFounderMeet=null;const n=heroes.find(h=>h.classKey==='nano_gm'),f=heroes.find(h=>h.classKey==='facu_gm');
 if(!n||!f)return false;ascFounderMeet={a:n,b:f,until:ascNow()+1800,start:ascNow()};
 if(typeof showBanner==='function')showBanner('La luz y la marea se reconocen');return true;
}
