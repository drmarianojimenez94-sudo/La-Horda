'use strict';
// Test fixture only. Never included by production index; does not persist unlocks.
{
 const k='solciju',base='mago';
 CLASSES[k]={...CLASSES[base],name:'Solciju',hudName:'Solciju',role:'Maga de control',roleCategory:'mago',color:'#923951',glow:'#923951',baseHP:98,baseDmg:10,baseDef:.07,baseSpeed:157,basicRange:300,basicCd:560,hpGrowthMult:.8,dmgGrowthMult:1.0,skills:SOLCIJU_KIT.slice(0,3),ultimate:SOLCIJU_KIT[3],passive:{name:'Fermentación',ico:'◇',desc:'Básicos y vino añaden hasta tres marcas por objetivo durante 5 s. El siguiente impacto de vino las consume para infligir 25% más daño y ralentizar.'}};
 PORTADORES[k]={...CLASSES[k],title:'La Enóloga',set:'quality_solciju',branches:['Fermentación','Barricas','Brindis'],history:'Solciju conservaba las últimas cosechas de una ciudad que ya nadie recordaba. Cuando la peste alcanzó sus bodegas, descubrió que el vino retenía algo más que años: atrapaba las maldiciones de quienes lo bebían. Ahora recorre las ruinas con una reserva que jamás ofrece por cortesía. Dice detestar la compañía, pero siempre guarda una copa para quien sobreviva a su lado.'};
 CHAMPION_CATALOG.push({id:k,priceGold:CHAMPION_PRICE_GOLD,unlockedByDefault:false,lore:PORTADORES[k].history});
 save.champions[k]=mkChampion(false);CLASS_WEAPON_LABEL[k]='Copa maldita';SCORE_CONFIG[k]=SCORE_CONFIG[base];CHAMP_ITEM_AFFINITY[k]={...CHAMP_ITEM_AFFINITY[base]};
 PAL[k]={...PAL[base]};GRIDS[k]=GRIDS[base];ANIM_PROFILES[k]={...ANIM_PROFILES[base]};CHAMP_IDENTITY[k]={sig:'mark',proj:'exglyph'};
 CODEX_CHAMP_LORE[k]={origin:'ciudad',history:PORTADORES[k].history};HERO_VOICES[k]={pick:'No pienso brindar por ustedes.',win:'Al menos no arruinaron la cosecha.',fall:'Qué mal año.'};
 CODEX_SKILL_FX[k]=SOLCIJU_KIT.map(()=>({color:[146,57,81],fx:'zone'}));
 const tree={masteryRequirement:8,nodes:[],masteries:{}};
 const specs=[['Fermentación','lees','Poso maldito','Vino maldito deja dos pulsos de daño durante 2 s.'],['Barricas','cellar','Bodega protectora','Al estallar, las barricas otorgan armadura a aliados cercanos.'],['Brindis','hospitality','Hospitalidad improbable','Brindis también cura y protege a aliados cercanos.']];
 specs.forEach(([name,flag,title,desc],b)=>{
   const branch=k+'_'+b,prefix=k+'_t'+b;
   for(let i=0;i<2;i++)tree.nodes.push({id:prefix+i,branch,type:'common',maxRank:4,cost:1,requires:i?prefix+'0':null,name:name+' · '+(i?'Alcance':'Técnica'),desc:'+3% por rango.',rankDesc:r=>'+'+r*3+'%',mods:r=>[{targetSkill:b,key:i?'areaMult':'durationMult',value:.03*r}]});
   tree.nodes.push({id:prefix+'transform',branch,type:'special',maxRank:1,cost:3,requires:prefix+'1',name:title,desc,rankDesc:()=>desc,mods:()=>[{targetSkill:b,flag}]});
   const [masterFlag,masterName,masterDesc]=[
     ['concentrate','Reserva concentrada','Gran Reserva añade una marca adicional por pulso.'],
     ['cellarRelease','Abrir la bodega','Gran Reserva detona inmediatamente tus barricas dentro del área.'],
     ['reserveHeal','Reserva reparadora','Cada pulso de Gran Reserva cura 1% de vida a los aliados en su área.']
   ][b];
   tree.masteries[branch]={id:branch,branch,name:name+' · Gran maestría',desc:'Decisión permanente desde nivel 90. Abre una transformación de Gran Reserva.',miniTree:[{id:prefix+'master',maxRank:1,cost:4,name:masterName,desc:masterDesc,rankDesc:()=>masterDesc,mods:()=>[{targetSkill:'ult',flag:masterFlag}]}]};
 });
 // 33 ordinary points required; the level-99 budget is 30.
 TALENT_TREES[k]=tree;
 CHAMPION_ENTRY_BALANCE.push(balanceChampionEntry(k,CLASSES[k],CHAMPION_BALANCE_REFERENCE));
}
