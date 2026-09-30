"use strict";
// Sprite states share host attackAnim, so guests animate the same casts locally.
function drawPortador(h,scale,alpha){
 if(typeof portadorCosmeticAura==="function")portadorCosmeticAura(h,scale);
 if(h.classKey==="myla" && portadorOwned(h,"tantrum").length)return drawChampPack("myla_berrinche",h,scale*1.35,alpha);
 return drawChampPack(h.classKey,h,scale,alpha);
}
function portadorDrawLine(ax,ay,bx,by,color,width){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(bx,by);ctx.stroke();}
function portadorDrawRing(x,y,r,color,fill){ctx.beginPath();ctx.ellipse(x,y,r,r,0,0,Math.PI*2);if(fill){ctx.fillStyle=color;ctx.fill();}else{ctx.strokeStyle=color;ctx.lineWidth=2;ctx.stroke();}}
function drawPortadorGround(){
 ctx.save();
 for(const o of portadorObjects){if(o.life<=0 || !o.owner)continue;const color=(typeof portadorCosmetic==="function" && portadorCosmetic(o.owner)?.tint)||o.owner.cls.glow;
  if(o.kind==="chain")portadorDrawLine(o.ax,o.ay,o.bx,o.by,"#dbd6bc",4);
  if(o.kind==="path"){ctx.globalAlpha=.18;portadorDrawLine(o.x,o.y,o.bx,o.by,color,o.r*2);ctx.globalAlpha=.8;portadorDrawLine(o.x,o.y,o.bx,o.by,color,2);}
  if(["lantern","alembic","steam","yogurt","tantrum"].includes(o.kind)){ctx.globalAlpha=.09;portadorDrawRing(o.x,o.y,o.r,color,true);ctx.globalAlpha=.6;portadorDrawRing(o.x,o.y,o.r,color,false);}
  if(o.kind==="triangle"){ctx.globalAlpha=.13;ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(o.ax,o.ay);ctx.lineTo(o.bx,o.by);ctx.lineTo(o.cx,o.cy);ctx.closePath();ctx.fill();ctx.globalAlpha=.85;ctx.strokeStyle=color;ctx.lineWidth=3;ctx.stroke();}
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
