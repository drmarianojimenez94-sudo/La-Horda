'use strict';
/* ============================================================
   js/champions/ascension/render.js — VFX de Ascensión (capas propias, Art Bible §7).
   Presupuesto: fxBudget() reduce todo lo decorativo con "Reducir efectos intensos"; los telegraphs
   (anillos, líneas y zonas reales) se dibujan siempre. Sin shadowBlur; nada se asigna por partícula
   salvo el enjambre de Khepri (pool fijo de 60 por héroe, sin crecer).
   Lectura sin color: Luz = plumas/óvalos, Sombra = esquirlas/rombos; máscaras con siluetas distintas.
   ============================================================ */
const ASC_SKIN_PROFILES={
 nano_gm:[{light:'#fff4d6',dark:'#1b1124',edge:'#e8c56a',rune:'#fff4d6'},{light:'#ffe08a',dark:'#0d0a12',edge:'#ffb300',rune:'#ffd34d',halo:true}],
 facu_gm:[{foam:'#e9fdff',sea:'#2fd3c6',deep:'#06243a',glow:'#7ff3ff'},{foam:'#d9c8ff',sea:'#7a3cff',deep:'#05030f',glow:'#b48cff',bone:true}]
};
function ascSkinOf(h){const n=h===player&&save&&save.champions[h.classKey]?(save.champions[h.classKey].ascSkin|0):(h.ascSkin|0);const p=ASC_SKIN_PROFILES[h.classKey];return p?p[Math.min(n,p.length-1)]:null;}
const ascT=()=>animNow/1000;
function ascLift(h){const until=h._ascLiftUntil||0;if(until<=runElapsedMs)return 0;const total=h.classKey==='facu_gm'?4200:2600,left=until-runElapsedMs,el=total-left;return 16*Math.max(0,Math.min(1,el/300,left/300));}

/* ---------------- Nano: alas asimétricas y conductos tatuados ---------------- */
function ascNanoWings(h,scale,alpha){
 const s=h.asState||{},P=ascSkinOf(h),regent=s.regentUntil>runElapsedMs,ult=h._ascLiftUntil>runElapsedMs,casting=h.portCastUntil>runElapsedMs;
 const open=ult||regent?1:casting?.75:.45,flap=Math.sin(ascT()*(ult?7:2.4))*.08;
 const lightW=open*(s.lastAff==='light'||regent||ult?1:.75),darkW=open*(s.lastAff==='dark'||regent||ult?1:.75);
 ctx.save();ctx.globalAlpha=alpha*(ult||regent?.92:.55);ctx.translate(h.x,h.y-30*scale-ascLift(h));ctx.scale(scale,scale);
 // ala de LUZ (izquierda): plumas ovaladas superpuestas
 ctx.save();ctx.scale(-1,1);ctx.rotate(-flap);
 for(let i=0;i<5;i++){const a=-.25-i*.22,L=(14+i*4)*lightW*1.6;ctx.save();ctx.rotate(a);ctx.beginPath();ctx.ellipse(L*.55,0,L*.6,3.2,0,0,Math.PI*2);ctx.fillStyle=P.light;ctx.fill();ctx.strokeStyle=P.edge;ctx.lineWidth=.8;ctx.stroke();ctx.restore();}
 ctx.restore();
 // ala de SOMBRA (derecha): esquirlas angulosas
 ctx.save();ctx.rotate(flap);
 for(let i=0;i<5;i++){const a=-.25-i*.22,L=(14+i*4)*darkW*1.6;ctx.save();ctx.rotate(a);ctx.beginPath();ctx.moveTo(2,-2.5);ctx.lineTo(L,-1);ctx.lineTo(L*.8,3);ctx.lineTo(3,2.5);ctx.closePath();ctx.fillStyle=P.dark;ctx.fill();ctx.strokeStyle=P.edge;ctx.lineWidth=.8;ctx.stroke();ctx.restore();}
 ctx.restore();
 if(P.halo||regent){ctx.globalAlpha*=.8;ctx.beginPath();ctx.arc(0,-6,9,0,Math.PI*2);ctx.strokeStyle=P.edge;ctx.lineWidth=1.5;ctx.stroke();if(regent){ctx.beginPath();ctx.arc(0,-6,9,Math.PI*.5,Math.PI*1.5);ctx.fillStyle=P.light;ctx.globalAlpha*=.35;ctx.fill();}}
 ctx.restore();
}
function ascNanoConduits(h,scale,alpha){
 const P=ascSkinOf(h),s=h.asState||{},n=fxBudget(s.regentUntil>runElapsedMs?10:5),t=ascT(),lift=ascLift(h);
 ctx.save();ctx.globalAlpha=alpha*.85;
 for(let i=0;i<n;i++){const ph=(t*1.3+i/n)%1,side=i%2?1:-1,x=h.x+side*(9+Math.sin(i+t*3)*2)*scale/2,y=h.y-(10+ph*30)*scale/2-lift;
  ctx.globalAlpha=alpha*(1-ph);
  if(side<0){ctx.fillStyle=P.rune;ctx.beginPath();ctx.ellipse(x,y,2,1,t+i,0,Math.PI*2);ctx.fill();}
  else{ctx.fillStyle=P.dark;ctx.fillRect(x-1,y-2,2,4);ctx.fillStyle=P.edge;ctx.fillRect(x-1,y-2,2,1);}}
 ctx.restore();
}
/* ---------------- Facu: manto de agua, corona de corrientes, leviatán ---------------- */
function ascFacuMantle(h,scale,alpha){
 const P=ascSkinOf(h),s=h.asState||{},t=ascT(),high=s.highTideUntil>runElapsedMs,ult=h._ascLiftUntil>runElapsedMs,lift=ascLift(h),k=ult?1.6:high?1.25:1;
 ctx.save();ctx.translate(h.x,h.y-26*scale-lift);ctx.scale(scale,scale);ctx.globalAlpha=alpha*.55;
 // manto: dos lenguas de agua que caen de los hombros y ondulan
 for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(side*5,-6);
  for(let i=1;i<=6;i++){const y=-6+i*4.5*k,x=side*(6+i*2.2*k)+Math.sin(t*3+i*.9)*1.6;ctx.lineTo(x,y);}
  ctx.lineTo(side*3,18*k);ctx.closePath();ctx.fillStyle=P.sea;ctx.fill();ctx.strokeStyle=P.foam;ctx.lineWidth=.8;ctx.stroke();}
 // corona de corrientes: arcos que giran sobre la cabeza
 ctx.globalAlpha=alpha*.8;ctx.strokeStyle=P.glow;ctx.lineWidth=1.2;
 for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(0,-16,7+i*2.5,t*(1.5+i*.4)+i*2,t*(1.5+i*.4)+i*2+1.6);ctx.stroke();}
 if(P.bone){ctx.fillStyle='#e8e0d0';for(let i=-2;i<=2;i++){ctx.beginPath();ctx.moveTo(i*3,-19);ctx.lineTo(i*3+1,-25-Math.abs(i));ctx.lineTo(i*3+2,-19);ctx.fill();}}
 // gotas en órbita (bioluminiscencia)
 const n=fxBudget(high||ult?8:4);ctx.fillStyle=P.glow;for(let i=0;i<n;i++){const a=t*2+i*6.283/n;ctx.globalAlpha=alpha*(.5+.5*Math.sin(t*4+i));ctx.beginPath();ctx.arc(Math.cos(a)*14*k,-4+Math.sin(a)*6*k,1.2,0,Math.PI*2);ctx.fill();}
 ctx.restore();
}
function ascLeviathan(x,y,t,alpha,P){
 // silueta abisal: cuerpo largo en S con aletas y un ojo; trazo único, sin física
 ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y);ctx.strokeStyle=P.deep;ctx.lineWidth=26;ctx.lineCap='round';
 ctx.beginPath();for(let i=0;i<=24;i++){const u=i/24,px=(u-.5)*520,py=Math.sin(u*6+t*1.4)*38-u*40;if(!i)ctx.moveTo(px,py);else ctx.lineTo(px,py);}ctx.stroke();
 ctx.lineWidth=2;ctx.strokeStyle=P.glow;ctx.globalAlpha=alpha*.6;ctx.stroke();
 const hx=260,hy=Math.sin(6+t*1.4)*38-40;ctx.fillStyle=P.glow;ctx.globalAlpha=alpha;ctx.beginPath();ctx.arc(hx-14,hy-4,3.5,0,Math.PI*2);ctx.fill();
 ctx.restore();
}
/* ---------------- máscaras de Velmira (formas distintas, no solo color) ---------------- */
function ascMaskShape(kind,x,y,r,alpha,fill){
 ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y);ctx.fillStyle=fill||'#f3d1ff';ctx.strokeStyle='#1a0f1f';ctx.lineWidth=Math.max(1,r*.12);
 ctx.beginPath();ctx.ellipse(0,0,r*.8,r,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#1a0f1f';
 // ojos
 for(const s of [-1,1]){ctx.beginPath();if(kind==='terror')ctx.ellipse(s*r*.3,-r*.15,r*.16,r*.24,0,0,Math.PI*2);else if(kind==='silence')ctx.rect(s*r*.3-r*.15,-r*.2,r*.3,r*.06);else ctx.ellipse(s*r*.3,-r*.18,r*.15,r*.1,s*.3,0,Math.PI*2);ctx.fill();}
 // boca
 ctx.beginPath();ctx.lineWidth=Math.max(1,r*.12);
 if(kind==='inspiration'){ctx.arc(0,r*.2,r*.35,.2,Math.PI-.2);ctx.stroke();}
 else if(kind==='terror'){ctx.ellipse(0,r*.4,r*.18,r*.3,0,0,Math.PI*2);ctx.fill();}
 else if(kind==='silence'){ctx.moveTo(-r*.3,r*.35);ctx.lineTo(r*.3,r*.35);ctx.stroke();for(let i=-1;i<=1;i++){ctx.moveTo(i*r*.15,r*.25);ctx.lineTo(i*r*.15,r*.45);}ctx.stroke();}
 else {ctx.rect(-r*.5,-r*.5,r,r*.25);ctx.fill();ctx.moveTo(0,-r);ctx.lineTo(0,r*.7);ctx.stroke();}
 ctx.restore();
}
/* ---------------- Khepri: enjambre visible (pool fijo) ---------------- */
const ascSwarmPools=new WeakMap();
function ascSwarmDraw(h){
 const s=h.asState||{},pool=ascSwarmPools.get(h)||(ascSwarmPools.set(h,[]),ascSwarmPools.get(h)),n=Math.min(60,fxBudget(Math.round(s.swarm||0)));
 const obj=portadorObjects.find(o=>o.owner===h&&o.kind==='as_swarm'&&o.life>0),ecl=portadorObjects.find(o=>o.owner===h&&o.kind==='as_eclipse'&&o.life>0);
 const tgt=obj?{x:obj.x,y:obj.y,r:obj.phase==='back'?16:Math.max(30,obj.r*.6)}:ecl?{x:h.x,y:h.y,r:ecl.r*.85}:{x:h.x,y:h.y-10,r:26};
 while(pool.length<n)pool.push({x:h.x+(Math.random()-.5)*20,y:h.y+(Math.random()-.5)*20,vx:0,vy:0,ph:Math.random()*6.28});
 const t=ascT(),dt=1/60;ctx.save();
 for(let i=0;i<n;i++){const b=pool[i],a=b.ph+t*(1.2+(i%5)*.15),gx=tgt.x+Math.cos(a)*tgt.r*(.4+(i%7)/10),gy=tgt.y+Math.sin(a*1.3)*tgt.r*.6*(.4+(i%5)/8);
  b.vx+=(gx-b.x)*6*dt;b.vy+=(gy-b.y)*6*dt;b.vx*=.86;b.vy*=.86;b.x+=b.vx*dt*8;b.y+=b.vy*dt*8;
  const flap=Math.sin(t*30+i)>0;ctx.fillStyle=i%9===0?'#c8f27a':'#1e3b2c';ctx.beginPath();ctx.ellipse(b.x,b.y,2.2,1.5,Math.atan2(b.vy,b.vx),0,Math.PI*2);ctx.fill();
  if(flap){ctx.fillStyle='rgba(200,242,122,.45)';ctx.fillRect(b.x-2,b.y-2,4,1);}}
 ctx.restore();
}
/* ---------------- dibujo del héroe ---------------- */
const ascOriginalDrawPortador=drawPortador;drawPortador=function(h,scale,alpha){
 if(!ascCandidate(h))return ascOriginalDrawPortador(h,scale,alpha);
 const k=h.classKey,lift=ascLift(h);
 if(k==='nano_gm')ascNanoWings(h,scale,alpha);
 if(k==='facu_gm')ascFacuMantle(h,scale,alpha);
 if(k==='velmira'){const s=h.asState||{};for(let i=0;i<4;i++){const a=Math.PI*(1.15+i*.23),cur=i===(s.mask|0);ascMaskShape(ASC_MASKS[i],h.x+Math.cos(a)*20,h.y-38*scale/2+Math.sin(a)*14-8,cur?7:4.5,alpha*(cur?.95:.55),cur?'#f3d1ff':'#b48cc8');}}
 if(k==='aurelia'){const t=ascT();ctx.save();ctx.globalAlpha=alpha*.85;ctx.fillStyle='#fff1b8';ctx.strokeStyle='#8a5a00';for(let i=0;i<3;i++){const a=t*1.4+i*2.094,x=h.x+Math.cos(a)*18,y=h.y-34+Math.sin(a)*6;ctx.beginPath();ctx.moveTo(x,y-5);ctx.lineTo(x+3,y);ctx.lineTo(x,y+5);ctx.lineTo(x-3,y);ctx.closePath();ctx.fill();ctx.stroke();}ctx.restore();}
 if(k==='oriel'){const t=ascT();ctx.save();ctx.globalAlpha=alpha*.7;ctx.strokeStyle='#ffd0dc';ctx.lineWidth=1.5;for(const side of [-1,1]){ctx.beginPath();ctx.ellipse(h.x+side*18,h.y-26,4,9,side*.3+Math.sin(t*2)*.1,0,Math.PI*2);ctx.stroke();}ctx.restore();}
 const out=lift?ascOriginalDrawPortador(Object.assign(Object.create(h),{y:h.y-lift}),scale,alpha):ascOriginalDrawPortador(h,scale,alpha);
 if(k==='nano_gm')ascNanoConduits(h,scale,alpha);
 if(k==='vhal'){const t=ascT(),n=fxBudget(7);ctx.save();ctx.fillStyle='#d9e1ff';for(let i=0;i<n;i++){ctx.globalAlpha=alpha*(.35+.65*Math.abs(Math.sin(t*2+i*1.7)));ctx.fillRect(h.x-8+((i*37)%17),h.y-36+((i*23)%26),1.5,1.5);}ctx.restore();}
 if(k==='bront'){const t=ascT(),cit=(h.asState||{}).citadelUntil>runElapsedMs;ctx.save();ctx.globalAlpha=alpha*(.6+.4*Math.sin(t*3));ctx.fillStyle='#bfe8ff';ctx.beginPath();ctx.moveTo(h.x,h.y-30);ctx.lineTo(h.x+4,h.y-24);ctx.lineTo(h.x,h.y-18);ctx.lineTo(h.x-4,h.y-24);ctx.closePath();ctx.fill();
  ctx.globalAlpha=alpha*.8;ctx.fillStyle='#8aa4b8';ctx.strokeStyle='#1a2733';for(let i=0;i<(cit?4:2);i++){const a=t*(cit?.5:1.1)+i*Math.PI/(cit?2:1),x=h.x+Math.cos(a)*24,y=h.y-22+Math.sin(a)*8;ctx.fillRect(x-4,y-3,8,6);ctx.strokeRect(x-4,y-3,8,6);}ctx.restore();}
 return out;
};
/* ---------------- capa de suelo: zonas, objetos, telegraphs ---------------- */
function ascRing(x,y,r,c,w=2,a=.8){ctx.save();ctx.globalAlpha*=a;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.strokeStyle='#0b0e16';ctx.lineWidth=w+3;ctx.stroke();ctx.strokeStyle=c;ctx.lineWidth=w;ctx.stroke();ctx.restore();}
function ascFill(x,y,r,c,a){ctx.save();ctx.globalAlpha*=a;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=c;ctx.fill();ctx.restore();}
const ascOriginalGround=drawPortadorGround;drawPortadorGround=function(){ascOriginalGround();ctx.save();const t=ascT();
 for(const o of portadorObjects){if(!o.asc||o.life<=0||!o.owner)continue;const h=o.owner,c=h.cls.glow,age=(o.maxLife||0)-o.life,fade=Math.min(1,o.life/300,age/150+.2);ctx.globalAlpha=fade;
  switch(o.kind){
  case 'as_edict':{const P=ascSkinOf(h);ascFill(o.x,o.y,o.r,P.light,.12);ascRing(o.x,o.y,o.r,P.edge,2);ctx.strokeStyle=P.edge;ctx.lineWidth=1.5;const q=o.r*.45;ctx.save();ctx.translate(o.x,o.y);ctx.rotate(t*.3);ctx.strokeRect(-q,-q,q*2,q*2);ctx.rotate(Math.PI/4);ctx.strokeRect(-q*.7,-q*.7,q*1.4,q*1.4);ctx.restore();if(o.both)ascRing(o.x,o.y,o.r*.8,P.dark,3,.7);break;}
  case 'as_rune':{const P=ascSkinOf(h),dark=o.eff!=='light';ctx.save();ctx.translate(o.x,o.y);ctx.rotate(t*2);ctx.fillStyle=dark?P.dark:P.light;ctx.strokeStyle=P.edge;ctx.beginPath();for(let i=0;i<4;i++){const a=i*Math.PI/2;ctx.lineTo(Math.cos(a)*14,Math.sin(a)*14);ctx.lineTo(Math.cos(a+.785)*5,Math.sin(a+.785)*5);}ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();ascRing(o.x,o.y,o.r*(age/700),dark?P.dark:P.light,2);break;}
  case 'as_judgement':{const P=ascSkinOf(h),ang=Math.atan2(h.aim?h.aim.y-h.y:1,h.aim?h.aim.x-h.x:0)+Math.PI/2,R=o.r;
   ctx.save();ctx.translate(o.x,o.y);ctx.rotate(ang);ctx.globalAlpha=fade*(age<700?age/700*.5:.35);
   ctx.beginPath();ctx.arc(0,0,R,Math.PI/2,Math.PI*1.5);ctx.closePath();ctx.fillStyle=P.light;ctx.fill();
   ctx.beginPath();ctx.arc(0,0,R,-Math.PI/2,Math.PI/2);ctx.closePath();ctx.fillStyle=P.dark;ctx.fill();
   ctx.globalAlpha=fade;ctx.strokeStyle=P.edge;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,-R);ctx.lineTo(0,R);ctx.stroke();ctx.restore();
   ascRing(o.x,o.y,R,P.edge,3);if(o.fired&&age<1300)ascRing(o.x,o.y,R*Math.min(1,(age-700)/500),'#ffffff',4,.8);break;}
  case 'as_current':{const L=Math.hypot(o.bx-o.x,o.by-o.y)||1,n=Math.floor(L/26);ctx.save();ctx.globalAlpha=fade*.2;ctx.lineCap='round';ctx.strokeStyle='#2fd3c6';ctx.lineWidth=o.r*2;ctx.beginPath();ctx.moveTo(o.x,o.y);ctx.lineTo(o.bx,o.by);ctx.stroke();
   ctx.globalAlpha=fade*.9;ctx.strokeStyle='#e9fdff';ctx.lineWidth=2;for(let i=0;i<n;i++){const u=((i+t*2.5)%n)/n,x=o.x+(o.bx-o.x)*u,y=o.y+(o.by-o.y)*u,a=Math.atan2(o.dy,o.dx);ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.beginPath();ctx.moveTo(-5,-6);ctx.lineTo(3,0);ctx.lineTo(-5,6);ctx.stroke();ctx.restore();}ctx.restore();break;}
  case 'as_foam':{ctx.save();ctx.globalAlpha=fade*.5;ctx.strokeStyle='#e9fdff';ctx.lineWidth=o.r*1.2;ctx.lineCap='round';ctx.setLineDash([4,7]);ctx.beginPath();ctx.moveTo(o.x,o.y);ctx.lineTo(o.bx,o.by);ctx.stroke();ctx.restore();break;}
  case 'as_ocean':{const P=ascSkinOf(h),rise=Math.min(1,age/1000),fall=Math.min(1,o.life/600);ctx.save();ctx.globalAlpha=.45*rise*fall;ctx.fillStyle=P.deep;ctx.beginPath();ctx.arc(o.x,o.y,o.r*1.6,0,Math.PI*2);ctx.fill();
   ctx.globalAlpha=.4*rise*fall;ctx.strokeStyle=P.glow;ctx.lineWidth=2;for(let i=0;i<fxBudget(5);i++){const rr=(o.r*1.5)*((t*.25+i/5)%1);ctx.beginPath();ctx.arc(o.x,o.y,rr,t+i,t+i+4.2);ctx.stroke();}
   if(age>1000&&age<3400){ascLeviathan(o.x,o.y+o.r*.35,t,.22*rise*fall,P);ctx.globalAlpha=.6*fall;ctx.strokeStyle=P.foam;ctx.lineWidth=3;for(let i=0;i<3;i++){const a=t*2.2+i*2.094;ctx.beginPath();ctx.arc(o.x,o.y,o.r*.3+i*30,a,a+1.4);ctx.stroke();}}
   if(age>=3200){const u=Math.min(1,(age-3200)/700),px=-o.dy,py=o.dx,cx=o.x+o.dx*(u*2-1)*o.r,cy=o.y+o.dy*(u*2-1)*o.r;ctx.globalAlpha=.75*(1-Math.max(0,u-.8)*5);ctx.strokeStyle=P.foam;ctx.lineWidth=14;ctx.beginPath();ctx.moveTo(cx-px*o.r,cy-py*o.r);ctx.quadraticCurveTo(cx+o.dx*30,cy+o.dy*30,cx+px*o.r,cy+py*o.r);ctx.stroke();ctx.lineWidth=5;ctx.strokeStyle=P.sea;ctx.stroke();}
   ctx.restore();ascRing(o.x,o.y,o.r,P.glow,2,.6);break;}
  case 'as_node':{ctx.save();ctx.translate(o.x,o.y-6);ctx.rotate(Math.sin(t+o.id)*.2);ctx.fillStyle='#fff1b8';ctx.strokeStyle='#8a5a00';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(0,-12);ctx.lineTo(7,0);ctx.lineTo(0,12);ctx.lineTo(-7,0);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();ascRing(o.x,o.y,12,'#f2c14e',1.5,.6);
   if(o.beamTo&&o.beamTo.until>runElapsedMs)portadorDrawLine(o.x,o.y,o.beamTo.x,o.beamTo.y,'#fff1b8',3);break;}
  case 'as_cathedral':{const rise=Math.min(1,age/600);ctx.save();ctx.globalAlpha=fade*.18*rise;ctx.fillStyle='#fff1b8';ctx.beginPath();ctx.moveTo(o.ax,o.ay);ctx.lineTo(o.bx,o.by);ctx.lineTo(o.cx,o.cy);ctx.closePath();ctx.fill();ctx.globalAlpha=fade*rise;ctx.strokeStyle='#f2c14e';ctx.lineWidth=3;ctx.stroke();
   const H=90*rise;for(const [x,y] of [[o.ax,o.ay],[o.bx,o.by],[o.cx,o.cy]]){ctx.fillStyle='rgba(255,241,184,.35)';ctx.fillRect(x-6,y-H,12,H);ctx.strokeRect(x-6,y-H,12,H);ctx.beginPath();ctx.moveTo(x-9,y-H);ctx.lineTo(x,y-H-18);ctx.lineTo(x+9,y-H);ctx.stroke();}
   ctx.beginPath();ctx.moveTo(o.ax,o.ay-H);ctx.lineTo(o.x,o.y-H-50*rise);ctx.lineTo(o.bx,o.by-H);ctx.moveTo(o.x,o.y-H-50*rise);ctx.lineTo(o.cx,o.cy-H);ctx.stroke();
   ctx.globalAlpha=fade*.6;ctx.beginPath();ctx.arc(o.x,o.y-H-50*rise,10,0,Math.PI*2);ctx.stroke();ctx.restore();break;}
  case 'as_eclipse':ascFill(o.x,o.y,o.r,'#0b1a12',.35);ascRing(o.x,o.y,o.r,'#c8f27a',2,.7);break;
  case 'as_swarm':if(o.phase!=='back')ascRing(o.x,o.y,o.r,'#3fae8a',1.5,.45);break;
  case 'as_theatre':{const acts=['inspiration','terror','silence','protection'],act=Math.max(0,o.act);ascRing(o.x,o.y,o.r,'#c06bd8',2.5,.8);
   ctx.save();ctx.globalAlpha=fade*.15;ctx.fillStyle='#3a0f2a';ctx.beginPath();ctx.arc(o.x,o.y,o.r,0,Math.PI*2);ctx.fill();ctx.restore();
   for(let i=0;i<4;i++){const a=-Math.PI/2+i*Math.PI/2,cur=i===act,x=o.x+Math.cos(a)*o.r*.65,y=o.y+Math.sin(a)*o.r*.65-(cur?30:10);ascMaskShape(acts[i],x,y,cur?34:16,fade*(cur?.85:.35),cur?'#f3d1ff':'#9c7cb0');}break;}
  case 'as_well':{ascFill(o.x,o.y,o.r,'#0c0f2a',.3);for(let i=0;i<3;i++){const rr=o.r*(1-((t*.6+i/3)%1));ascRing(o.x,o.y,rr,'#6f7cf2',1.5,.5);}break;}
  case 'as_trail':{ctx.save();ctx.globalAlpha=fade*.7;for(let i=1;i<o.points.length;i++)portadorDrawLine(o.points[i-1].x,o.points[i-1].y,o.points[i].x,o.points[i].y,'#d9e1ff',2);ctx.restore();break;}
  case 'as_collapse':{const P={glow:'#d9e1ff'};
   if(age<1500){const rr=20+age/1500*45;ascFill(o.x,o.y,rr,'#fff4d6',.5);ascRing(o.x,o.y,rr+6,'#ffd27a',3);ascRing(o.x,o.y,120,'#6f7cf2',1.5,.5);}
   else if(age<3700){const u=(age-1500)/2200;ascFill(o.x,o.y,26-u*10,'#000000',.95);ascRing(o.x,o.y,28,P.glow,2);
    ctx.save();ctx.translate(o.x,o.y);ctx.scale(1,.4);ctx.strokeStyle='#ffb36b';ctx.lineWidth=3;for(let i=0;i<fxBudget(4);i++){ctx.globalAlpha=fade*.6;ctx.beginPath();ctx.arc(0,0,40+i*16,t*(3-i*.5),t*(3-i*.5)+3.6);ctx.stroke();}ctx.restore();ascRing(o.x,o.y,320,'#6f7cf2',1.5,.35);}
   else{const u=Math.min(1,(age-3700)/500);ascRing(o.x,o.y,o.r*u,'#ffffff',6,1-u);ascFill(o.x,o.y,o.r*u,'#d9e1ff',.25*(1-u));}break;}
  case 'as_plate':{ctx.save();ctx.translate(o.x,o.y);ctx.fillStyle='#8aa4b8';ctx.strokeStyle='#1a2733';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-12,-6);ctx.lineTo(12,-6);ctx.lineTo(9,7);ctx.lineTo(-9,7);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#bfe8ff';ctx.fillRect(-2,-3,4,4);ctx.restore();ascRing(o.x,o.y,70,'#bfe8ff',1,.25);break;}
  case 'as_wall':{const L=Math.hypot(o.bx-o.ax,o.by-o.ay)||1,n=Math.max(2,Math.floor(L/20)),rise=Math.min(1,age/250);ctx.save();ctx.fillStyle='#6f8798';ctx.strokeStyle='#1a2733';ctx.lineWidth=2;
   for(let i=0;i<=n;i++){const x=o.ax+(o.bx-o.ax)*i/n,y=o.ay+(o.by-o.ay)*i/n,H=(o.citadel?26:18)*rise;ctx.fillRect(x-9,y-H,18,H);ctx.strokeRect(x-9,y-H,18,H);if(o.citadel&&i%2===0){ctx.fillRect(x-5,y-H-6,10,6);ctx.strokeRect(x-5,y-H-6,10,6);}}ctx.restore();break;}
  case 'as_keep':ascRing(o.x,o.y,o.r,'#bfe8ff',2,.6);ascFill(o.x,o.y,o.r,'#bfe8ff',.06);break;
  case 'as_portal':{const other=portadorObjects.find(p=>p.asc&&p.kind==='as_portal'&&p.pair===o.pair&&p!==o&&p.life>0);ctx.save();ctx.translate(o.x,o.y);ctx.rotate(t*1.5*(o.side?-1:1));ctx.strokeStyle='#e05a7a';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(0,0,o.r*.6,o.r,0,0,Math.PI*2);ctx.stroke();
   ctx.strokeStyle='#ffd0dc';ctx.lineWidth=1.5;ctx.beginPath();for(let i=0;i<6;i++){const a=i*1.047;ctx.moveTo(Math.cos(a)*o.r*.3,Math.sin(a)*o.r*.5);ctx.lineTo(Math.cos(a)*o.r*.55,Math.sin(a)*o.r*.9);}ctx.stroke();ctx.restore();
   if(other&&o.side===0){ctx.save();ctx.globalAlpha=fade*.18;ctx.setLineDash([3,9]);portadorDrawLine(o.x,o.y,other.x,other.y,'#ffd0dc',2);ctx.restore();}break;}
  case 'as_scar':{ctx.save();ctx.strokeStyle='#e05a7a';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(o.x-o.r*.6,o.y-8);ctx.lineTo(o.x-o.r*.1,o.y+4);ctx.lineTo(o.x+o.r*.2,o.y-6);ctx.lineTo(o.x+o.r*.6,o.y+6);ctx.stroke();ctx.restore();break;}
  case 'as_great':{ctx.save();ctx.globalAlpha=fade*.3;ctx.fillStyle='#2a0612';ctx.beginPath();ctx.ellipse(o.x,o.y,o.r,o.r*.55,0,0,Math.PI*2);ctx.fill();ctx.restore();
   ctx.save();ctx.globalAlpha=fade;ctx.strokeStyle='#e05a7a';ctx.lineWidth=3;ctx.beginPath();for(let i=0;i<=16;i++){const u=i/16,x=o.x+(u-.5)*o.r*1.8,y=o.y+Math.sin(u*11+t*3)*10*(1-Math.abs(u-.5)*2);if(!i)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.stroke();ctx.restore();
   if(o.echo&&o.echo.until>runElapsedMs){const roster=['tanque','guerrero','musashi','cazadora','segador','eren'],k=roster[o.echo.champ%roster.length];ctx.save();ctx.globalAlpha=.45;try{drawChampPack(k,{x:o.echo.x,y:o.echo.y,classKey:k,_codexSet:'attack_down',_codexT:(500-(o.echo.until-runElapsedMs))/500},2,.45);}catch(e){}ctx.restore();ascRing(o.echo.x,o.echo.y,22,'#ffd0dc',2,.8);}
   ascRing(o.x,o.y,o.r,'#e05a7a',2,.5);break;}
  }
 }
 ctx.globalAlpha=1;
 for(const h of heroes){if(!ascCandidate(h)||!h.alive)continue;
  if(h.classKey==='khepri')ascSwarmDraw(h);
  const q=h.asCue;if(q&&q.until>runElapsedMs){const a=Math.min(1,(q.until-runElapsedMs)/300);ctx.globalAlpha=a;
   if(['sentence','refract','star_bolt','mask_throw','plate_throw'].includes(q.action)&&q.bx!==undefined){ctx.save();ctx.globalAlpha=a*.85;portadorDrawLine(q.x,q.y,q.bx,q.by,q.action==='sentence'?'#1b1124':h.cls.glow,q.action==='sentence'?6:3);if(q.action==='sentence')portadorDrawLine(q.x,q.y,q.bx,q.by,'#e8c56a',1);ctx.restore();}
   if(['chorus','pressure','rift_echo'].includes(q.action)){if(q.points)for(const p of q.points)ascRing(p.x,p.y,q.r||120,h.cls.glow,2,a);else ascRing(q.x,q.y,q.r||120,h.cls.glow,3,a);}
   if(q.action==='regent'||q.action==='high_tide'){ascRing(h.x,h.y,40+(1-a)*60,q.action==='regent'?'#e8c56a':'#7ff3ff',3,a);}
   ctx.globalAlpha=1;}
  // indicador de recurso legible (forma + número)
  const s=h.asState;if(!s)continue;ctx.font='11px monospace';ctx.fillStyle=h.cls.glow;let label='';
  if(h.classKey==='nano_gm')label=s.regentUntil>runElapsedMs?'◐ REGENTE':'○'.repeat(s.light)+' ◆'.repeat(s.dark);
  else if(h.classKey==='facu_gm')label=s.highTideUntil>runElapsedMs?'≋ MAREA ALTA':'~'.repeat(s.tide)+(s.tideNext?' →'+({current:'C',pressure:'P',wave:'O'})[s.tideNext]:'');
  else if(h.classKey==='khepri')label='✱'+Math.round(s.swarm);
  else if(h.classKey==='velmira')label=['☺','☠','✕','⛨'][s.mask|0]+(s.empowered?'+':'');
  if(label)ctx.fillText(label,h.x-18,h.y-58);
 }
 ctx.restore();
};
/* ---------------- capa superior: Juicio (desaturación) y encuentro Nano + Facu ---------------- */
const ascOriginalTop=drawPortadorTop;drawPortadorTop=function(){ascOriginalTop();
 const j=portadorObjects.find(o=>o.asc&&o.kind==='as_judgement'&&o.life>0);
 if(j){const age=(j.maxLife||0)-j.life,a=Math.min(1,age/250,j.life/400)*(JUICE.reduceFx?.5:1);ctx.save();
  ctx.globalAlpha=.55*a;ctx.globalCompositeOperation='saturation';ctx.fillStyle='#808080';ctx.fillRect(j.x-2400,j.y-2400,4800,4800);
  ctx.globalCompositeOperation='source-over';ctx.globalAlpha=(age<700?.35:.15)*a;ctx.fillStyle='#05030a';ctx.fillRect(j.x-2400,j.y-2400,4800,4800);ctx.restore();}
 if(ascFounderMeet&&ascFounderMeet.until>runElapsedMs){const m=ascFounderMeet,u=(runElapsedMs-m.start)/1800,cx=(m.a.x+m.b.x)/2,cy=(m.a.y+m.b.y)/2-20,n=fxBudget(18);ctx.save();
  for(let i=0;i<n;i++){const from=i%2?m.a:m.b,p=Math.min(1,u*1.4+(i%5)*.03),x=from.x+(cx-from.x)*p+Math.sin(i+u*9)*8,y=from.y-30+(cy-from.y+30)*p;ctx.globalAlpha=1-Math.max(0,u-.7)*3;
   if(i%2){ctx.fillStyle=i%4===1?'#fff4d6':'#1b1124';ctx.fillRect(x-1.5,y-3,3,6);}else{ctx.fillStyle='#7ff3ff';ctx.beginPath();ctx.arc(x,y,2.2,0,Math.PI*2);ctx.fill();}}
  if(u>.55){const v=(u-.55)/.45;ascRing(cx,cy,10+v*60,'#e8c56a',3,1-v);ascRing(cx,cy,6+v*44,'#7ff3ff',2,1-v);}
  ctx.restore();}
};
