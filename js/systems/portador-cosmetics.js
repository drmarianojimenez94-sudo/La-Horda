"use strict";
// Cosmetic-only palettes. Recolor once on load; gameplay and alpha masks are unchanged.
const PORTADOR_COSMETICS={
 santa_paciencia:{name:"Ynara — Guardia Celeste",colors:["#273d72","#5884bc","#a0d9ed","#f4fcff"],tint:"#b8eaff"},
 ultimo_turno:{name:"Brasa — Aurora de Cobre",colors:["#442078","#863bca","#e067ff","#ffe3ff"],tint:"#dc64ff"},
 juramento_roto:{name:"Eslabón — Cadenas Esmeralda",colors:["#084857","#078b86","#36e4bd","#c7fff2"],tint:"#36e4bd"},
 vidrio_negro:{name:"Morwen — Destilación Carmesí",colors:["#561543","#a52874","#fa529e","#ffd6ed"],tint:"#fa529e"},
 lumbre_persistente:{name:"Farolero — Sol del Alba",colors:["#6c3013","#bf681a","#ffbd36","#fff1b0"],tint:"#ffbd36"},
 hilo_umbral:{name:"Iria — Seda Celeste",colors:["#123479","#2267c5","#42cdfc","#d8faff"],tint:"#42cdfc"},
 merienda_magica:{name:"Myla — Yogur de Arándanos",colors:["#432479","#8057c7","#c19aff","#f0e5ff"],tint:"#c19aff"}
};
function portadorCosmetic(h){
 const d=activeSetSkin(h);if(!d)return null;
 return Object.entries(PORTADOR_COSMETICS).find(([id])=>SET_SKINS[id]===d)?.[1]||null;
}
function portadorCosmeticAura(h,scale){
 const C=portadorCosmetic(h);if(!C)return;
 const t=animNow/1000,r=17*scale/2;
 ctx.save();ctx.globalAlpha=0.65;ctx.strokeStyle=C.tint;ctx.lineWidth=2;
 ctx.beginPath();ctx.ellipse(h.x,h.y-2,r,r*.38,0,0,Math.PI*2);ctx.stroke();
 for(let i=0;i<5;i++){const a=t*.6+i*Math.PI*2/5;ctx.fillStyle=C.colors[2+(i%2)];ctx.fillRect(Math.round(h.x+Math.cos(a)*r)-1,Math.round(h.y-10-(t*17+i*11)%50),3,3);}
 ctx.restore();
}
function portadorRecolorAtlas(P,C){
 const im=P.atlas,c=document.createElement("canvas");c.width=im.naturalWidth;c.height=im.naturalHeight;
 const g=c.getContext("2d",{willReadFrequently:true});g.drawImage(im,0,0);const I=g.getImageData(0,0,c.width,c.height),D=I.data;
 const colors=C.colors.map(x=>_hexRgb(x));let changed=0;
 for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){
  const i=(y*c.width+x)*4;if(!D[i+3])continue;
  const R=D[i],G=D[i+1],B=D[i+2],lum=.2126*R+.7152*G+.0722*B;
  if(lum<34)continue; // dark contour
  const fx=(x%P.fw)/P.fw,fy=(y%P.fh)/P.fh;
  if(fx>.27&&fx<.73&&fy<.48&&R>G*1.12&&G>B*1.12)continue; // face / brown hair
  const rgb=colors[lum<90?0:lum<150?1:lum<208?2:3];
  for(let j=0;j<3;j++)D[i+j]=rgb[j];changed++;
 }
 g.putImageData(I,0,0);P.cosmeticChangedPixels=changed;
 return c;
}
function portadorCosmeticPreview(P,C){
 const v=P.sets.idle_down[0],f=document.createElement("canvas");f.width=P.fw;f.height=P.fh;
 const g=f.getContext("2d",{willReadFrequently:true});g.drawImage(P.atlas,(v%P.cols)*P.fw,Math.floor(v/P.cols)*P.fh,P.fw,P.fh,0,0,P.fw,P.fh);
 const D=g.getImageData(0,0,P.fw,P.fh).data;let x0=P.fw,y0=P.fh,x1=0,y1=0;
 for(let y=0;y<P.fh;y++)for(let x=0;x<P.fw;x++)if(D[(y*P.fw+x)*4+3]){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
 const out=document.createElement("canvas");out.width=200;out.height=200;const q=out.getContext("2d");q.imageSmoothingEnabled=false;
 const w=x1-x0+1,h=y1-y0+1,s=Math.min(148/w,154/h);
 q.strokeStyle=C.tint;q.lineWidth=3;q.beginPath();q.ellipse(100,179,44,10,0,0,Math.PI*2);q.stroke();
 q.drawImage(f,x0,y0,w,h,Math.round(100-w*s/2),Math.round(176-h*s),Math.round(w*s),Math.round(h*s));
 return out.toDataURL();
}
for(const [id,C] of Object.entries(PORTADOR_COSMETICS)){
 const d=SET_SKINS[id];if(!d)continue;d.name=C.name;
 SKIN_FX_PLAN[id]={tint:C.tint};
 for(const key of Object.values(d.packs||{})){
  const P=CHAMP_PACK[key];if(!P)continue;
  const apply=()=>{
   if(P.cosmeticApplied)return;P.cosmeticApplied=true;
   const c=portadorRecolorAtlas(P,C),im=new Image();P.ready=false;
   im.onload=()=>{P.atlas=im;P.ready=true;P.footX=null;if(key!==d.packs[d.champ])return;d.preview=portadorCosmeticPreview(P,C);document.querySelectorAll('img[data-portador-skin="'+id+'"]').forEach(el=>{el.src=d.preview;});};
   im.src=c.toDataURL();
  };
  if(P.ready)apply();else{const prev=P.atlas.onload;P.atlas.onload=e=>{if(prev)prev(e);apply();};}
 }
}
// VFX use the existing wrappers, so colored casts and basic projectiles reach guests.
(function(){const cast=window.castAbility;window.castAbility=function(h,sk,ult,idx){
 const result=cast.apply(this,arguments),C=portadorCosmetic(h);
 if(C){const q=/turret|splash|anchor|lantern|alembic/.test(sk.kind)?aimPoint(h,sk.range||200,sk.radius||60):h;
 vfxShock(q.x,q.y,8,ult?110:55,hexToRgb(C.tint),ult?650:360,0);
 vfxBurst(q.x,q.y-15,ult?16:7,"t_"+C.tint,90,500,3,2,-20,0);}
 return result;
};})();
