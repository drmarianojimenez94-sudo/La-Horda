'use strict';
// Development fixture, not a production champion registration.
{
 const k='brakk',base='tanque';
 CLASSES[k]={...CLASSES[base],name:'Brakk',hudName:'Brakk',role:'Tanque constructor',roleCategory:'tanque',color:'#cead7a',glow:'#cead7a',baseHP:165,baseDmg:9,baseDef:.19,baseSpeed:140,basicRange:75,basicCd:650,hpGrowthMult:1.4,dmgGrowthMult:.8,skills:BRAKK_KIT.slice(0,3),ultimate:BRAKK_KIT[3],passive:{name:'Cimientos firmes',ico:'◇',desc:'Recibe 8% menos daño mientras permanece a 120 unidades de una construcción propia.'}};
 PORTADORES[k]={...CLASSES[k],title:'El Arquitecto del Fin',set:'quality_brakk',branches:['Muralla','Asedio','Refugio'],history:'Brakk calculó durante años las murallas de una ciudad que sus gobernantes decidieron abandonar. Cuando llegó la Horda, convirtió los planos de evacuación en fortificaciones y abrió rutas entre los derrumbes. Desde entonces construye refugios que sabe temporales: cada torre compra segundos y cada muro guarda una salida. Carga los nombres de quienes no logró salvar grabados en su martillo.'};
 CHAMPION_CATALOG.push({id:k,priceGold:CHAMPION_PRICE_GOLD,unlockedByDefault:false,lore:PORTADORES[k].history});
 save.champions[k]=mkChampion(false);CLASS_WEAPON_LABEL[k]='Martillo de obra';SCORE_CONFIG[k]=SCORE_CONFIG[base];CHAMP_ITEM_AFFINITY[k]={...CHAMP_ITEM_AFFINITY[base]};
 PAL[k]={...PAL[base]};GRIDS[k]=GRIDS[base];ANIM_PROFILES[k]={...ANIM_PROFILES[base]};CHAMP_IDENTITY[k]={sig:'mark',proj:'exglyph'};
 CODEX_CHAMP_LORE[k]={origin:'ciudad',history:PORTADORES[k].history};HERO_VOICES[k]={pick:'Primero, una salida.',win:'La estructura resistió.',fall:'Evacúen… ahora.'};CODEX_SKILL_FX[k]=BRAKK_KIT.map(()=>({color:[206,173,122],fx:'zone'}));
 const tree={masteryRequirement:8,nodes:[],masteries:{}};
 [['gate','Muralla ancha','El muro gana 25% de longitud pero pierde 35% de duración.'],['pierce','Clavos penetrantes','La torreta dispara en línea y atraviesa hasta doce objetivos.'],['crew','Cuadrilla protegida','Apuntalar también protege a aliados cercanos.']].forEach(([flag,name,desc],b)=>{
  const branch=k+'_'+b,prefix=k+'_t'+b;
  for(let i=0;i<2;i++)tree.nodes.push({id:prefix+i,branch,type:'common',maxRank:4,cost:1,requires:i?prefix+'0':null,name:PORTADORES[k].branches[b]+' · '+(i?'Disciplina':'Técnica'),desc:'+3% por rango',rankDesc:r=>'+'+r*3+'%',mods:r=>[{targetSkill:b,key:i?'durationMult':'areaMult',value:.03*r}]});
  tree.nodes.push({id:prefix+'transform',branch,type:'special',maxRank:1,cost:3,requires:prefix+'1',name,desc,rankDesc:()=>desc,mods:()=>[{targetSkill:b,flag}]});
  const [mf,mn,md]=[['rubble','Campo de escombros','Demolición prolonga 1,2 s la ralentización.'],['renew','Obra de emergencia','Apuntalar recupera 2,5% de vida máxima.'],['bastion','Último refugio','Demolición también escuda a aliados por 6% de su vida.']][b];
  tree.masteries[branch]={id:branch,branch,name:mn,desc:md,miniTree:[{id:prefix+'master',maxRank:1,cost:4,name:mn,desc:md,rankDesc:()=>md,mods:()=>[{targetSkill:'ult',flag:mf}]}]};
 });TALENT_TREES[k]=tree;CHAMPION_ENTRY_BALANCE.push(balanceChampionEntry(k,CLASSES[k],CHAMPION_BALANCE_REFERENCE));
}
