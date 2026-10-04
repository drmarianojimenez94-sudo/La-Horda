'use strict';
// Marks and shape silhouettes remain visible at minimum particle settings and without audio.
function exGlyph(k,x,y,r,color){
 ctx.save();ctx.translate(x,y);ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=2;ctx.beginPath();
 switch(k){
 case 'vesper':for(const d of [-1,1]){ctx.moveTo(-r,d*r*.5);ctx.lineTo(r,-d*r*.5);}break;
 case 'nahir':ctx.moveTo(0,-r);ctx.lineTo(r*.7,0);ctx.lineTo(0,r);ctx.lineTo(-r*.7,0);ctx.closePath();break;
 case 'baltra':ctx.moveTo(-r,r*.5);ctx.quadraticCurveTo(-r,-r,r*.1,-r);ctx.quadraticCurveTo(r,-r,r,r*.5);ctx.closePath();ctx.moveTo(-r*.3,r*.8);ctx.lineTo(r*.3,r*.8);break;
 case 'maura':for(let i=0;i<5;i++){const a=i*Math.PI*2/5;ctx.moveTo(0,0);ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);}break;
 case 'dariel':ctx.moveTo(-r*.6,-r);ctx.lineTo(-r*.6,r);ctx.moveTo(r*.4,-r);ctx.lineTo(r*.4,r*.7);ctx.moveTo(-r*.6,-r);ctx.lineTo(r*.4,-r*.8);break;
 case 'orsa':ctx.moveTo(-r,0);ctx.lineTo(-r*.1,-r);ctx.lineTo(-r*.2,0);ctx.lineTo(r,0);ctx.lineTo(0,r);break;
 case 'tibor':for(let i=0;i<7;i++){const a=i*Math.PI/3;ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);}break;
 case 'zahra':ctx.moveTo(0,-r);ctx.lineTo(r*.65,r);ctx.lineTo(-r*.65,r);ctx.closePath();ctx.moveTo(0,0);ctx.lineTo(0,r*.7);break;
 case 'renko':ctx.rect(-r*.6,-r*.4,r*1.2,r*1.1);ctx.moveTo(0,-r);ctx.lineTo(0,-r*.4);break;
 case 'sira':ctx.moveTo(-r,0);ctx.lineTo(r,0);ctx.moveTo(0,-r);ctx.lineTo(0,r);ctx.rect(-r*.4,-r*.4,r*.8,r*.8);break;
 }ctx.stroke();ctx.restore();
}
function exDrawStrip(a,b,r,color){ctx.save();ctx.lineCap='round';ctx.globalAlpha*=.12;portadorDrawLine(a.x,a.y,b.x,b.y,color,Math.max(2,r*2));ctx.globalAlpha=1;portadorDrawLine(a.x,a.y,b.x,b.y,color,2);ctx.restore();}
const exOriginalGround=drawPortadorGround;drawPortadorGround=function(){exOriginalGround();ctx.save();
 for(const o of portadorObjects){if(!o.ex||o.life<=0||!o.owner?.alive)continue;const k=o.owner.classKey,c=o.owner.cls.glow;ctx.globalAlpha=.7;
  if(o.bx!==undefined)exDrawStrip(o,{x:o.bx,y:o.by},o.r,c);
  else if(o.points){for(let i=1;i<o.points.length;i++)exDrawStrip(o.points[i-1],o.points[i],o.r,c);}
  else{portadorDrawRing(o.x,o.y,o.r,c,false);exGlyph(k,o.x,o.y,Math.min(o.r*.3,18),c);
   if(o.kind==='ex_reflection'){ctx.globalAlpha=.45;drawChampPack(k,{...o.owner,x:o.x,y:o.y,_codexSet:'idle_down',_codexT:0},o.owner.scale||2,.45);}
   if(o.kind==='ex_swarm')for(let i=0;i<6;i++){const a=animNow/600+i*Math.PI/3;exGlyph('tibor',o.x+Math.cos(a)*o.r*.6,o.y+Math.sin(a)*o.r*.6,3,c);}
  }
 }
 for(const h of heroes){if(!exCandidate(h)||!h.alive)continue;const s=h.exState,c=h.cls.glow,q=h.exCue;if(q&&q.until>runElapsedMs){
  ctx.globalAlpha=.65;exGlyph(h.classKey,q.x,q.y-20,q.ult?23:13,c);
  if(['pierce','ink_line','roots','trench','cross'].includes(q.action))exDrawStrip(q,{x:q.bx,y:q.by},q.r,c);
  if(['bell','unpick','shear','refrain','discharge','burial'].includes(q.action))portadorDrawRing(q.x,q.y,q.r,c,false);
 }
 if(!s)continue;ctx.globalAlpha=1;ctx.font=pxFont(13);ctx.fillStyle=c;
 const label=h.classKey==='zahra'?Math.round(s.heat)+'°':h.classKey==='tibor'?Math.round(s.colony)+'%':h.classKey==='dariel'?'♪'.repeat(s.notes):h.classKey==='baltra'?'•'.repeat(s.vibration):h.classKey==='maura'?'•'.repeat(s.seeds):'';ctx.fillText(label,h.x-15,h.y-55);
 if(h.classKey==='sira')for(let i=1;i<s.route.length;i++)portadorDrawLine(s.route[i-1].x,s.route[i-1].y,s.route[i].x,s.route[i].y,c,2);
 if(s.guardUntil>runElapsedMs){ctx.beginPath();const a=Math.atan2(s.guardY,s.guardX);ctx.arc(h.x,h.y,27,a-Math.PI/3,a+Math.PI/3);ctx.strokeStyle=c;ctx.lineWidth=4;ctx.stroke();}
 }
 ctx.restore();};
