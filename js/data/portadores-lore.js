"use strict";
for(const k in PORTADORES){
  const p=PORTADORES[k];
  // Procedural hit/flash masks remain available while the real atlas loads.
  const fallback=p.roleCategory==="tanque"?"tanque":p.roleCategory==="soporte"?"soporte":"mago";
  PAL[k]=Object.assign({},PAL[fallback]);GRIDS[k]=GRIDS[fallback];
  CODEX_CHAMP_LORE[k]={origin:p.origin,history:p.history};
  HERO_VOICES[k]={pick:p.voices[0],win:p.voices[1],fall:p.voices[2]};
  ANIM_PROFILES[k]={speed:p.roleCategory==="tanque"?0.85:1,weight:p.roleCategory==="tanque"?1.5:0.9,amp:0.5,recoil:0.8,lunge:p.ranged?3:9,cast:1.2,impact:1.1,particle:k==="farolero"?"holy":k==="morwen"?"necro":"spark",basic:p.ranged?"ranged":"melee",tier:"full"};
  CHAMP_IDENTITY[k]={sig:k==="eslabon"?"stagger":k==="morwen"?"wither":"mark",proj:k==="brasa"?"bullet":k==="iria"?"rune":"glyph"};
}
Object.assign(AIM_PROFILES,{
  my_tower:{type:"point",r:()=>40},my_splash:{type:"point",r:sk=>sk.radius},
  br_turret:{type:"point",r:()=>40},br_purge:{type:"cone"},es_hook:{type:"target"},es_line:{type:"point",r:()=>80},es_guard:{type:"point",r:()=>30},
  mo_resin:{type:"point",r:sk=>sk.radius},mo_salt:{type:"cone"},mo_alembic:{type:"point",r:sk=>sk.radius},
  fa_lantern:{type:"point",r:sk=>sk.radius},fa_flash:{type:"cone"},fa_path:{type:"line",w:42},
  ir_anchor:{type:"point",r:()=>30},ir_cut:{type:"point",r:sk=>sk.radius}
});

const PORTADOR_PASSIVES={
 myla:{name:"Yogur Pegajoso",ico:"●",desc:"Los disparos de sus torres ralentizan brevemente. Los jefes reciben una ralentización reducida."},
 brasa:{name:"Presión",ico:"♨",desc:"Las habilidades acumulan hasta tres cargas. El siguiente básico con tres cargas descarga un cono pequeño y consume la presión."},
 eslabon:{name:"Contrapeso",ico:"⛓",desc:"Controlar a un enemigo concede 12% de resistencia durante 1,6 s, con 2,2 s de recarga interna. No acumula resistencia."},
 morwen:{name:"Reactivos",ico:"⚗",desc:"Resina y Catalizador reaccionan una sola vez, se consumen y dejan un residuo. Conserva hasta cinco residuos para Destilación."},
 farolero:{name:"Seguir la Luz",ico:"☼",desc:"Aliados a menos de 230 unidades que se mueven hacia el Farolero ganan 8% de velocidad. No se acumula con otros faroleros."},
 iria:{name:"Trama",ico:"⌁",desc:"Hasta tres anclas se unen en orden, con un máximo de 400 unidades por hilo. Tensión activa su daño y control; no son paredes."}
};
for(const k in PORTADORES){
 CLASSES[k].passive=PORTADOR_PASSIVES[k];
 CODEX_CHAMP_EXTRA_ANIMS[k]=[{label:"Definitiva",set:"ultimate_down"},{label:"Caída",set:"death_down"}];
 CODEX_SKILL_FX[k]=PORTADORES[k].skills.concat(PORTADORES[k].ultimate).map(sk=>({color:hexToRgb(PORTADORES[k].glow),fx:/hook|line/.test(sk.kind)?"chain":/turret|anchor|lantern/.test(sk.kind)?"summon":/purge|salt|flash/.test(sk.kind)?"cone":/guard|distill|dismantle|vigil/.test(sk.kind)?"buff":"zone"}));
}
