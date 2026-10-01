"use strict";
// Cosmetic cast identities: no damage, random numbers, collision or gameplay timers.
// One compact network event per cast. Fixed pool, deterministic drawing, no blur.
const CHAMPION_SIGNATURES = {
  tanque:['shield','#89caff'], guerrero:['blades','#ff7971'], mago:['star','#d6a0ff'],
  soporte:['wings','#93ffc3'], segador:['scythe','#ff595e'], axiom:['glitch','#65ffe4'],
  profeta:['eye','#e3b0ff'], musashi:['blades','#f1dcab'], cazadora:['arrows','#b0ed78'],
  nigromante:['skull','#83efb5'], libertador:['sun','#9fe9ff'], eren:['blades','#ffb575'],
  myla:['drops','#ffc2dd'], brasa:['gear','#ffcb78'], eslabon:['chain','#d3dff5'],
  morwen:['drops','#cc99ff'], farolero:['sun','#ffe592'], iria:['triangle','#b9b3ff']
};
const SIGNATURE_MAX = 32;
const championSignatures = Array.from({length:SIGNATURE_MAX},()=>({on:false}));
function vfxChampionSignature(x,y,key,slot,ult,angle){
  if(!Number.isFinite(x)||!Number.isFinite(y)||!inView(x,y,140)) return;
  let s=championSignatures.find(s=>!s.on);
  if(!s){ if(!ult)return; s=championSignatures.find(s=>!s.ult); if(!s)return; }
  Object.assign(s,{on:true,x,y,key,slot,radius:0,ult:!!ult,angle:Number.isFinite(angle)?angle:0,t:0,dur:ult?850:460});
}
function championSignaturesUpdate(dt){for(const s of championSignatures)if(s.on){s.t+=dt;if(s.t>=s.dur)s.on=false;}}
function championSignaturesReset(){for(const s of championSignatures)s.on=false;}
function drawChampionSignatures(){
  ctx.save();ctx.globalCompositeOperation='source-over';ctx.lineJoin='round';ctx.lineCap='round';
  for(const s of championSignatures){
    if(!s.on||!inView(s.x,s.y,s.radius?s.radius+40:140))continue;
    if(s.key==='__cone'){
      const q=s.t/s.dur;
      ctx.save();ctx.translate(s.x,s.y);ctx.rotate(s.angle);ctx.globalAlpha=(1-q)*.85;
      ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,s.radius,-s.arc,s.arc);ctx.closePath();
      ctx.strokeStyle='#141c2c';ctx.lineWidth=7;ctx.stroke();ctx.strokeStyle=s.color;ctx.lineWidth=3;ctx.stroke();
      for(let i=-2;i<=2;i++){
        const a=i*s.arc/3;
        ctx.beginPath();ctx.moveTo(Math.cos(a)*s.radius*.2,Math.sin(a)*s.radius*.2);
        ctx.lineTo(Math.cos(a)*s.radius*.85,Math.sin(a)*s.radius*.85);
        ctx.strokeStyle=s.color;ctx.lineWidth=5;ctx.stroke();ctx.strokeStyle='#fff9e8';ctx.lineWidth=1;ctx.stroke();
      }
      ctx.restore();continue;
    }
    if(s.key==='__frost'){
      const q=s.t/s.dur,r=s.radius;ctx.save();ctx.translate(s.x,s.y);ctx.globalAlpha=(1-q)*.9;
      ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);
      for(let i=0;i<6;i++){const a=i*Math.PI/3,dx=Math.cos(a),dy=Math.sin(a);ctx.moveTo(dx*r*.18,dy*r*.18);ctx.lineTo(dx*r*.9,dy*r*.9);for(const side of [-1,1]){ctx.moveTo(dx*r*.65,dy*r*.65);ctx.lineTo(dx*r*.48-dy*r*.16*side,dy*r*.48+dx*r*.16*side);}}
      ctx.strokeStyle='#152b45';ctx.lineWidth=7;ctx.stroke();ctx.strokeStyle='#86d9ff';ctx.lineWidth=4;ctx.stroke();ctx.strokeStyle='#efffff';ctx.lineWidth=1;ctx.stroke();ctx.restore();continue;
    }
    const [shape,color]=CHAMPION_SIGNATURES[s.key]||['star','#e6d6ff'];
    const q=s.t/s.dur,calm=typeof JUICE!=='undefined'&&JUICE.reduceMotion;
    const r=(s.ult?48:25)*(calm?1:0.8+0.2*Math.min(1,q*5));
    ctx.save();ctx.translate(s.x,s.y-(s.ult?84:62));
    ctx.globalAlpha=Math.min(1,(1-q)*3)*(s.ult?0.95:0.85);
    // A small airborne crest identifies the caster; it never pretends to be a damage radius.
    const path=()=>{
      ctx.beginPath();
      if(shape==='shield'){ctx.moveTo(-r*.7,-r*.7);ctx.lineTo(r*.7,-r*.7);ctx.lineTo(r*.6,r*.3);ctx.lineTo(0,r);ctx.lineTo(-r*.6,r*.3);ctx.closePath();}
      else if(shape==='triangle'){for(let i=0;i<3;i++){const a=-Math.PI/2+i*Math.PI*2/3;ctx[i?'lineTo':'moveTo'](Math.cos(a)*r,Math.sin(a)*r);}ctx.closePath();}
      else if(shape==='eye'){ctx.ellipse(0,0,r,r*.5,0,0,Math.PI*2);ctx.moveTo(r*.25,0);ctx.arc(0,0,r*.25,0,Math.PI*2);}
      else if(shape==='drops'){for(let i=-1;i<=1;i++){const x=i*r*.65,y=Math.abs(i)*r*.3;ctx.moveTo(x,y-r*.65);ctx.quadraticCurveTo(x+r*.5,y+r*.3,x,y+r*.5);ctx.quadraticCurveTo(x-r*.5,y+r*.3,x,y-r*.65);}}
      else if(shape==='chain'){for(let i=-1;i<=1;i++){ctx.moveTo(i*r*.65+r*.38,0);ctx.ellipse(i*r*.65,0,r*.38,r*.6,i*.35,0,Math.PI*2);}}
      else if(shape==='glitch'){for(let i=0;i<3;i++)ctx.rect(-r+i*r*.2,-r+i*r*.65,r*1.5,r*.35);}
      else if(shape==='blades'||shape==='arrows'){for(let i=-1;i<=1;i+=2){ctx.moveTo(i*r*.85,r*.8);ctx.lineTo(-i*r*.8,-r*.8);ctx.lineTo(-i*r*.25,-r*.7);}}
      else if(shape==='scythe'){ctx.moveTo(-r*.5,r);ctx.lineTo(r*.25,-r);ctx.quadraticCurveTo(r*1.4,-r*.7,r*.75,r*.6);ctx.quadraticCurveTo(r*.65,-r*.3,r*.25,-r*.6);}
      else if(shape==='wings'){for(let i of [-1,1]){ctx.moveTo(0,r*.5);ctx.quadraticCurveTo(i*r*1.2,r*.1,i*r,-r*.8);ctx.lineTo(i*r*.35,-r*.1);}ctx.moveTo(-r*.2,0);ctx.lineTo(r*.2,0);ctx.moveTo(0,-r*.25);ctx.lineTo(0,r*.5);}
      else if(shape==='skull'){ctx.arc(0,-r*.2,r*.65,Math.PI*.15,Math.PI*2.85);ctx.lineTo(-r*.35,r*.8);ctx.lineTo(r*.35,r*.8);ctx.closePath();ctx.moveTo(-r*.35,-r*.15);ctx.lineTo(-r*.1,0);ctx.moveTo(r*.35,-r*.15);ctx.lineTo(r*.1,0);}
      else {const n=shape==='gear'?24:shape==='sun'?16:8;for(let i=0;i<n;i++){const a=i*Math.PI*2/n-Math.PI/2,rr=r*(i%2?.55:1);ctx[i?'lineTo':'moveTo'](Math.cos(a)*rr,Math.sin(a)*rr);}ctx.closePath();}
    };
    path();ctx.strokeStyle='#171322';ctx.lineWidth=7;ctx.stroke();ctx.strokeStyle=color;ctx.lineWidth=4;ctx.stroke();ctx.strokeStyle='#fff5e9';ctx.lineWidth=1;ctx.stroke();
    // Three pips distinguish normal skill slots; an ultimate has a crown of five rays.
    ctx.strokeStyle=color;ctx.lineWidth=3;
    if(s.ult){for(let i=-2;i<=2;i++){ctx.beginPath();ctx.moveTo(i*12,-r-9);ctx.lineTo(i*15,-r-19+Math.abs(i)*3);ctx.stroke();}}
    else for(let i=0;i<=Math.min(2,s.slot||0);i++)ctx.fillStyle=color,ctx.fillRect((i-(s.slot||0)/2)*8-2,r+9,4,4);
    ctx.restore();
  }ctx.restore();
}
// Frost nova's true circular footprint: six crystalline rays, readable at talent zero.
function vfxFrostCrown(x,y,r){
  if(!Number.isFinite(r)||r<=0||!inView(x,y,r+40))return;
  const s=championSignatures.find(s=>!s.on);
  if(s)Object.assign(s,{on:true,x,y,key:'__frost',radius:r,ult:false,t:0,dur:650});
  for(let i=0;i<6;i++){
    const a=i*Math.PI/3;
    vfxSprite('fxIceCrystal',0,x+Math.cos(a)*r*.8,y+Math.sin(a)*r*.8,42,650,null,.18,false,.8);
  }
}
function vfxSkillCone(x,y,r,angle,arc,color){
  if(!Number.isFinite(r)||r<=0||!inView(x,y,r+40))return;
  const s=championSignatures.find(s=>!s.on);
  if(s)Object.assign(s,{on:true,x,y,key:'__cone',radius:r,angle,arc,color,ult:false,t:0,dur:420});
}
