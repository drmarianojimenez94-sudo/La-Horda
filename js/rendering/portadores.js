"use strict";
// Sprite states share host attackAnim, so guests animate the same casts locally.
function drawPortador(h,scale,alpha){
 if(!window.ART_GATE_NO_VFX){ if(typeof portadorCosmeticAura==="function")portadorCosmeticAura(h,scale);
 ynaraDrawWings(h,scale,alpha); }
 if(h.classKey==="myla" && portadorOwned(h,"tantrum").length)return drawChampPack("myla_berrinche",h,scale*1.35,alpha);
 return drawChampPack(h.classKey,h,scale,alpha);
}
function ynaraDrawWings(h,scale,alpha){
 if(h.classKey==="ynara" && portadorOwned(h,"patience").length){
  ctx.save();ctx.globalAlpha=alpha;ctx.translate(h.x,h.y-34*scale);ctx.scale(scale,scale);
  for(const side of [-1,1]){ctx.save();ctx.scale(side,1);ctx.beginPath();ctx.moveTo(3,6);ctx.lineTo(24,-22);ctx.lineTo(37,-30);ctx.lineTo(32,-8);ctx.lineTo(25,4);ctx.lineTo(12,12);ctx.closePath();ctx.fillStyle="#fff8ed";ctx.fill();ctx.strokeStyle="#58445b";ctx.lineWidth=1;ctx.stroke();ctx.strokeStyle="#c6c2d4";for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(10,7-i*4);ctx.lineTo(29,-5-i*6);ctx.stroke();}ctx.restore();}
  ctx.restore();
 }
}
function portadorDrawLine(ax,ay,bx,by,color,width){ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(bx,by);if(width<=5){ctx.strokeStyle='#101827';ctx.lineWidth=width+4;ctx.stroke();}ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}
function portadorDrawRing(x,y,r,color,fill){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);if(fill){ctx.fillStyle=color;ctx.fill();}else{ctx.strokeStyle='#101827';ctx.lineWidth=7;ctx.stroke();ctx.strokeStyle=color;ctx.lineWidth=3;ctx.stroke();}}
function drawPortadorGround(){
 ctx.save();
 for(const o of portadorObjects){if(o.life<=0 || !o.owner)continue;const color=(typeof portadorCosmetic==="function" && portadorCosmetic(o.owner)?.tint)||o.owner.cls.glow;
  if(o.kind==="chain")portadorDrawLine(o.ax,o.ay,o.bx,o.by,"#dbd6bc",4);
  if(o.kind==="path" || o.kind==="watercurtain"){ctx.globalAlpha=.18;portadorDrawLine(o.x,o.y,o.bx,o.by,color,o.r*2);ctx.globalAlpha=.8;portadorDrawLine(o.x,o.y,o.bx,o.by,color,2);}
  if(["lantern","alembic","steam","yogurt","tantrum","stroganoff","patience"].includes(o.kind)){ctx.globalAlpha=.09;portadorDrawRing(o.x,o.y,o.r,color,true);ctx.globalAlpha=.6;portadorDrawRing(o.x,o.y,o.r,color,false);}
  if(o.kind==="triangle"){ctx.globalAlpha=.13;ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(o.ax,o.ay);ctx.lineTo(o.bx,o.by);ctx.lineTo(o.cx,o.cy);ctx.closePath();ctx.fill();ctx.globalAlpha=.85;ctx.strokeStyle=color;ctx.lineWidth=3;ctx.stroke();}
  // Each persistent zone gets its own silhouette, not only another faint colored circle.
  if(['lantern','alembic','yogurt','steam'].includes(o.kind)){
   ctx.globalAlpha=.8;const n=o.kind==='alembic'?6:8;
   for(let i=0;i<n;i++){
    const a=i*Math.PI*2/n,x=o.x+Math.cos(a)*o.r*.86,y=o.y+Math.sin(a)*o.r*.86;
    ctx.fillStyle='#111827';ctx.fillRect(x-4,y-4,8,8);ctx.fillStyle=color;
    if(o.kind==='lantern'){ctx.fillRect(x-1,y-5,2,10);ctx.fillRect(x-5,y-1,10,2);}
    else if(o.kind==='yogurt'){ctx.fillRect(x-2,y-2,4,5);ctx.fillRect(x-1,y-4,2,2);}
    else if(o.kind==='alembic'){ctx.beginPath();ctx.moveTo(x,y-4);ctx.lineTo(x+4,y);ctx.lineTo(x,y+4);ctx.lineTo(x-4,y);ctx.closePath();ctx.fill();}
    else {ctx.fillRect(x-3,y-1,6,2);ctx.fillRect(x-1,y-4,2,2);}
   }
  }
  ctx.globalAlpha=1;
 }
 for(const h of heroes){if(!h.alive || !PORTADORES[h.classKey])continue;
  for(const l of portadorLinks(h)){ctx.globalAlpha=h.portTensionTimer>0?.9:.3;portadorDrawLine(l.a.x,l.a.y,l.b.x,l.b.y,h.cls.glow,h.portTensionTimer>0?3:1);}
  if(h.portRingTimer>0 || h.portVigilTimer>0){ctx.globalAlpha=.12;portadorDrawRing(h.x,h.y,h.portRingTimer>0?h.portRingR:h.portVigilR,h.cls.glow,true);ctx.globalAlpha=.7;portadorDrawRing(h.x,h.y,h.portRingTimer>0?h.portRingR:h.portVigilR,h.cls.glow,false);}
  if(h.portGuardTimer>0 && heroes[h.portWardSlot] && heroes[h.portWardSlot].alive){const a=heroes[h.portWardSlot];ctx.globalAlpha=.6;portadorDrawLine(h.x,h.y,a.x,a.y,h.cls.glow,2);}
 }
 ctx.restore();
}
function drawPortadorTop(){
 ctx.save();ctx.imageSmoothingEnabled=false;
 for(const o of portadorObjects){if(o.life<=0 || !o.owner)continue;const c=(typeof portadorCosmetic==="function" && portadorCosmetic(o.owner)?.tint)||o.owner.cls.glow;
  if(o.kind==="stroganoff"){
   ctx.fillStyle="#34283c";ctx.fillRect(o.x-16,o.y-9,32,12);ctx.fillStyle="#fff8ed";ctx.fillRect(o.x-14,o.y-8,28,9);ctx.fillStyle="#c88345";ctx.fillRect(o.x-11,o.y-7,22,6);ctx.fillStyle="#f0c78b";for(let i=0;i<5;i++)ctx.fillRect(o.x-10+i*4,o.y-6+(i%2)*2,3,3);
   ctx.fillStyle="#fff0f7";for(let i=0;i<3;i++){const t=((animNow/1000+i*.3)%1);ctx.globalAlpha=1-t;ctx.fillRect(o.x-8+i*7,o.y-12-t*20,3,5);}ctx.globalAlpha=1;
  }
  if(o.kind==="patience"){ctx.fillStyle=c;for(let i=0;i<o.charges;i++)ctx.fillRect(o.x-28+i*8,o.y-82,5,4);}
  if(o.kind==="tantrum"){
   const age=(o.maxLife-o.life)/1000;
   if(state==="playing" && typeof playMylaCry==="function" && (!o._cryAt || animNow-o._cryAt>850)){o._cryAt=animNow;playMylaCry();}
   for(let i=0;i<12;i++){const angle=i*Math.PI/6+age*2,r=20+((age*130+i*17)%o.r);ctx.fillStyle=i%2?"#fff1e1":"#e99abb";ctx.fillRect(o.x+Math.cos(angle)*r-3,o.y+Math.sin(angle)*r-14,6,6);}
  }
  if(o.kind==="shot" || o.kind==="hook"){ctx.globalAlpha=Math.min(1,o.life/160);portadorDrawLine(o.x,o.y-14,o.bx,o.by-14,c,o.kind==="shot"?2:4);ctx.globalAlpha=1;}
  if(o.kind==="turret" && o.owner.classKey==="myla"){
   ctx.fillStyle="#372535";ctx.fillRect(o.x-17,o.y-44,34,44);
   ctx.fillStyle="#e99abb";ctx.fillRect(o.x-14,o.y-39,28,37);
   ctx.fillStyle="#fff1e1";ctx.fillRect(o.x-12,o.y-44,24,10);ctx.fillRect(o.x-16,o.y-31,32,7);ctx.fillRect(o.x-16,o.y-17,32,7);
   ctx.fillStyle="#b7628b";ctx.fillRect(o.x-4,o.y-7,8,7);
   ctx.fillStyle="#372535";ctx.fillRect(o.x-15,o.y-50,30,3);ctx.fillStyle="#e99abb";ctx.fillRect(o.x-15,o.y-50,30*Math.max(0,o.hp/o.maxHp),3);
  }
  if(o.kind==="turret" && o.owner.classKey!=="myla"){
   ctx.fillStyle="#201a22";ctx.fillRect(o.x-14,o.y-12,28,14);ctx.fillRect(o.x-12,o.y-5,5,10);ctx.fillRect(o.x+7,o.y-5,5,10);
   ctx.fillStyle="#ae7850";ctx.fillRect(o.x-10,o.y-22,20,17);ctx.fillStyle="#e5bd75";ctx.fillRect(o.x-14,o.y-25,29,7);ctx.fillStyle=c;ctx.fillRect(o.x+7,o.y-22,13,5);
   ctx.fillStyle="#261d25";ctx.fillRect(o.x-15,o.y-31,30,3);ctx.fillStyle=o.owner.portOverclockTimer>0?"#ff9355":"#85b587";ctx.fillRect(o.x-15,o.y-31,30*Math.max(0,o.hp/o.maxHp),3);
   if(o.owner.portOverclockTimer>0){
    ctx.strokeStyle='#171b29';ctx.lineWidth=6;ctx.beginPath();ctx.arc(o.x,o.y-12,25,0,Math.PI*2);ctx.stroke();
    ctx.strokeStyle='#ffd36c';ctx.lineWidth=3;ctx.stroke();
    ctx.fillStyle='#fff2bf';for(let i=0;i<4;i++){const a=i*Math.PI/2;ctx.fillRect(o.x+Math.cos(a)*28-2,o.y-12+Math.sin(a)*28-2,4,4);}
   }
  }
  if(o.kind==="lantern" || o.kind==="alembic"){
   ctx.fillStyle="#272135";ctx.fillRect(o.x-8,o.y-20,16,20);ctx.fillRect(o.x-10,o.y-24,20,4);ctx.fillStyle=c;ctx.fillRect(o.x-5,o.y-16,10,11);ctx.fillStyle="#fff4cd";ctx.fillRect(o.x-2,o.y-14,3,6);
  }
  if(o.kind==="anchor"){ctx.strokeStyle=c;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(o.x,o.y-13);ctx.lineTo(o.x+9,o.y-4);ctx.lineTo(o.x,o.y+5);ctx.lineTo(o.x-9,o.y-4);ctx.closePath();ctx.stroke();}
 }
 for(const h of heroes){if(!h.alive || !PORTADORES[h.classKey])continue;
  const count=h.classKey==="brasa"?(h.portPressure||0):h.classKey==="morwen"?(h.portResidue||0):h.classKey==="iria"?portadorOwned(h,"anchor").length:0;
  ctx.fillStyle=h.cls.glow;for(let i=0;i<count;i++)ctx.fillRect(h.x-count*4+i*8,h.y-72,5,4);
  if(h.portMasteryBranch>=0){ctx.strokeStyle=h.cls.glow;ctx.lineWidth=1;ctx.beginPath();ctx.arc(h.x,h.y-37,12+h.portMasteryBranch*3,0,Math.PI*2);ctx.stroke();}
 }
 for(const e of enemies)if(e.alive && (e.portResinUntil>runElapsedMs || e.portSaltUntil>runElapsedMs)){ctx.fillStyle=e.portResinUntil>runElapsedMs?"#c482d3":"#f1e7ba";ctx.fillRect(e.x-3,e.y-(e.radius||20)-13,6,6);}
 ctx.restore();
}
