'use strict';
// Development fixture, not a production champion registration.
{
 const k='veyra',base='guerrero';
 CLASSES[k]={...CLASSES[base],name:'Veyra',hudName:'Veyra',role:'Asesina de riesgo',roleCategory:'asesino',color:'#ab3459',glow:'#ab3459',baseHP:95,baseDmg:11,baseDef:.06,baseSpeed:178,basicRange:70,basicCd:450,hpGrowthMult:.8,dmgGrowthMult:1,skills:VEYRA_KIT.slice(0,3),ultimate:VEYRA_KIT[3],passive:{name:'Al filo',ico:'◇',desc:'Sus habilidades y sangrados infligen 15% más daño cuando tiene menos de 40% de vida.'}};
 PORTADORES[k]={...CLASSES[k],title:'La Última Herida',set:'quality_veyra',branches:['Herida','Paso','Pacto'],history:'Veyra regresó del campo de batalla con una herida que ningún sanador logró cerrar. Aprendió a escuchar su pulso y a moverse en el silencio entre dos latidos. No busca una muerte gloriosa: persigue a quienes comercian con la vida de otros. Cada pacto con su propia sangre le concede un instante de ventaja y le recuerda que sobrevivir también puede ser una forma de venganza.'};
 CHAMPION_CATALOG.push({id:k,priceGold:CHAMPION_PRICE_GOLD,unlockedByDefault:false,lore:PORTADORES[k].history});
 save.champions[k]=mkChampion(false);CLASS_WEAPON_LABEL[k]='Hojas de sangría';SCORE_CONFIG[k]=SCORE_CONFIG[base];CHAMP_ITEM_AFFINITY[k]={...CHAMP_ITEM_AFFINITY[base]};
 PAL[k]={...PAL[base]};GRIDS[k]=GRIDS[base];ANIM_PROFILES[k]={...ANIM_PROFILES[base]};CHAMP_IDENTITY[k]={sig:'mark',proj:'exglyph'};
 CODEX_CHAMP_LORE[k]={origin:'ciudad',history:PORTADORES[k].history};HERO_VOICES[k]={pick:'Todavía late.',win:'Hoy no fue la última.',fall:'Un latido más.'};CODEX_SKILL_FX[k]=VEYRA_KIT.map(()=>({color:[171,52,89],fx:'zone'}));
 const tree={masteryRequirement:8,nodes:[],masteries:{}};
 [['lance','Incisión recta','El corte se convierte en una línea penetrante.'],['escape','Paso protegido','El desplazamiento otorga 15% de armadura por 1,5 s.'],['cleanse','Romper ataduras','Pacto elimina la ralentización actual.']].forEach(([flag,name,desc],b)=>{
  const branch=k+'_'+b,prefix=k+'_t'+b;
  for(let i=0;i<2;i++)tree.nodes.push({id:prefix+i,branch,type:'common',maxRank:4,cost:1,requires:i?prefix+'0':null,name:PORTADORES[k].branches[b]+' · '+(i?'Disciplina':'Técnica'),desc:'+3% por rango',rankDesc:r=>'+'+r*3+'%',mods:r=>[{targetSkill:b,key:i?'durationMult':'areaMult',value:.03*r}]});
  tree.nodes.push({id:prefix+'transform',branch,type:'special',maxRank:1,cost:3,requires:prefix+'1',name,desc,rankDesc:()=>desc,mods:()=>[{targetSkill:b,flag}]});
  const [mf,mn,md]=[
   ['reopen','Cicatriz abierta','La definitiva reaplica un sangrado ligero a las heridas que consume.'],
   ['lastEscape','Último paso','La definitiva otorga 20% de velocidad durante 1,8 s.'],
   ['bloodShield','Sangre coagulada','La definitiva convierte heridas consumidas en escudo, hasta 12% de vida.']
  ][b];
  tree.masteries[branch]={id:branch,branch,name:mn,desc:md,miniTree:[{id:prefix+'master',maxRank:1,cost:4,name:mn,desc:md,rankDesc:()=>md,mods:()=>[{targetSkill:'ult',flag:mf}]}]};
 });
 TALENT_TREES[k]=tree;CHAMPION_ENTRY_BALANCE.push(balanceChampionEntry(k,CLASSES[k],CHAMPION_BALANCE_REFERENCE));
}
