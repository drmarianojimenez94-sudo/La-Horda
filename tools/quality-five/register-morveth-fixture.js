'use strict';
// Development fixture, not a production champion registration.
{
 const k='morveth',base='mago';
 CLASSES[k]={...CLASSES[base],...{"name": "Morveth", "hudName": "Morveth", "role": "Mago invocador", "roleCategory": "mago", "color": "#a4c56a", "glow": "#a4c56a", "baseHP": 96, "baseDmg": 8.5, "baseDef": 0.07, "baseSpeed": 152, "basicRange": 300, "basicCd": 600, "hpGrowthMult": 0.75, "dmgGrowthMult": 1.1, "passive": {"name": "Contagio terminal", "ico": "◷", "desc": "Cuando muere un enemigo infectado contagia hasta tres vecinos. Los contagios secundarios no vuelven a propagarse."}},skills:MORVETH_KIT.slice(0,3),ultimate:MORVETH_KIT[3]};
 PORTADORES[k]={...CLASSES[k],...{"title": "El Jardinero de la Peste", "set": "quality_morveth", "branches": ["Huerto", "Contagio", "Simbiosis"], "history": "Morveth cuidaba el jardín de un hospital sitiado. Cuando las medicinas se agotaron, descubrió un micelio capaz de retener la infección en sus raíces. Ahora transporta aquel cultivo en una urna agrietada. Sus hongos necesitan tiempo y terreno para extenderse; arrancarlos deja al jardinero expuesto. No busca una cura perfecta, sino impedir que la próxima cosecha sean los vivos."}};
 CHAMPION_CATALOG.push({id:k,priceGold:CHAMPION_PRICE_GOLD,unlockedByDefault:false,lore:PORTADORES[k].history});
 save.champions[k]=mkChampion(false);CLASS_WEAPON_LABEL[k]='Urna de cultivo';SCORE_CONFIG[k]=SCORE_CONFIG[base];CHAMP_ITEM_AFFINITY[k]={...CHAMP_ITEM_AFFINITY[base]};
 PAL[k]={...PAL[base]};GRIDS[k]=GRIDS[base];ANIM_PROFILES[k]={...ANIM_PROFILES[base]};CHAMP_IDENTITY[k]={sig:'mark',proj:'exglyph'};
 CODEX_CHAMP_LORE[k]={origin:'ciudad',history:PORTADORES[k].history};HERO_VOICES[k]={pick:'La tierra recuerda.',win:'Todavía hay vida.',fall:'Otra estación…'};CODEX_SKILL_FX[k]=MORVETH_KIT.map(()=>({color:[206,173,122],fx:'zone'}));
 const tree={masteryRequirement:8,nodes:[],masteries:{}};
 [["roots", "Raíces febriles", "Los pulsos del hongo ralentizan 20% durante 0,8 s."], ["choke", "Esporas asfixiantes", "Exhalación también ralentiza 25% durante 1,5 s."], ["share", "Red simbiótica", "Simbiosis también cura y protege aliados cercanos."]].forEach(([flag,name,desc],b)=>{
  const branch=k+'_'+b,prefix=k+'_t'+b;
  for(let i=0;i<2;i++)tree.nodes.push({id:prefix+i,branch,type:'common',maxRank:4,cost:1,requires:i?prefix+'0':null,name:PORTADORES[k].branches[b]+' · '+(i?'Disciplina':'Técnica'),desc:'+3% por rango',rankDesc:r=>'+'+r*3+'%',mods:r=>[{targetSkill:b,key:i?'durationMult':'areaMult',value:.03*r}]});
  tree.nodes.push({id:prefix+'transform',branch,type:'special',maxRank:1,cost:3,requires:prefix+'1',name,desc,rankDesc:()=>desc,mods:()=>[{targetSkill:b,flag}]});
  const [mf,mn,md]=[["harvest", "Cosecha final", "El jardín consume hongos cercanos para infligir una explosión por hongo."], ["renew", "Vida entre ruinas", "Cada pulso del jardín sana 1% de vida a aliados."], ["shelter", "Micelio protector", "Cada pulso del jardín escuda aliados por 4% de vida."]][b];
  tree.masteries[branch]={id:branch,branch,name:mn,desc:md,miniTree:[{id:prefix+'master',maxRank:1,cost:4,name:mn,desc:md,rankDesc:()=>md,mods:()=>[{targetSkill:'ult',flag:mf}]}]};
 });TALENT_TREES[k]=tree;CHAMPION_ENTRY_BALANCE.push(balanceChampionEntry(k,CLASSES[k],CHAMPION_BALANCE_REFERENCE));
}
