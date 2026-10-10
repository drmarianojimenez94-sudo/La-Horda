'use strict';
// Development fixture, not a production champion registration.
{
 const k='aelith',base='mago';
 CLASSES[k]={...CLASSES[base],...{"name": "Aelith", "hudName": "Aelith", "role": "Maga temporal", "roleCategory": "mago", "color": "#bfa7dc", "glow": "#bfa7dc", "baseHP": 98, "baseDmg": 10, "baseDef": 0.07, "baseSpeed": 158, "basicRange": 300, "basicCd": 560, "hpGrowthMult": 0.75, "dmgGrowthMult": 1.1, "passive": {"name": "Segundos hurtados", "ico": "◷", "desc": "Cada tercer lanzamiento reduce 0,5 s las otras habilidades activas, sin bajar de 1 s ni alterar la definitiva."}},skills:AELITH_KIT.slice(0,3),ultimate:AELITH_KIT[3]};
 PORTADORES[k]={...CLASSES[k],...{"title": "La Ladrona de Segundos", "set": "quality_aelith", "branches": ["Ecos", "Fractura", "Préstamo"], "history": "Aelith reparaba relojes en una estación donde ningún tren volvía a tiempo. Tras la llegada de la Horda descubrió que los instantes perdidos seguían allí, suspendidos entre los dientes de los engranajes. Aprendió a soltarlos en ecos breves, incapaz de cambiar lo ocurrido. Cada aceleración exige una pausa después: roba segundos a su propio futuro, nunca una vida entera al pasado."}};
 CHAMPION_CATALOG.push({id:k,priceGold:CHAMPION_PRICE_GOLD,unlockedByDefault:false,lore:PORTADORES[k].history});
 save.champions[k]=mkChampion(false);CLASS_WEAPON_LABEL[k]='Reloj de bolsillo';SCORE_CONFIG[k]=SCORE_CONFIG[base];CHAMP_ITEM_AFFINITY[k]={...CHAMP_ITEM_AFFINITY[base]};
 PAL[k]={...PAL[base]};GRIDS[k]=GRIDS[base];ANIM_PROFILES[k]={...ANIM_PROFILES[base]};CHAMP_IDENTITY[k]={sig:'mark',proj:'exglyph'};
 CODEX_CHAMP_LORE[k]={origin:'ciudad',history:PORTADORES[k].history};HERO_VOICES[k]={pick:'Tengo un segundo.',win:'Justo a tiempo.',fall:'Se acabó…'};CODEX_SKILL_FX[k]=AELITH_KIT.map(()=>({color:[206,173,122],fx:'zone'}));
 const tree={masteryRequirement:8,nodes:[],masteries:{}};
 [["delayed", "Eco suspendido", "El eco tarda el doble y ralentiza 30% durante 1,4 s."], ["aftershock", "Segundo impacto", "Fractura deja un eco de 20% del daño en el extremo de la línea."], ["share", "Préstamo colectivo", "Comparte aceleración y deuda temporal con aliados cercanos."]].forEach(([flag,name,desc],b)=>{
  const branch=k+'_'+b,prefix=k+'_t'+b;
  for(let i=0;i<2;i++)tree.nodes.push({id:prefix+i,branch,type:'common',maxRank:4,cost:1,requires:i?prefix+'0':null,name:PORTADORES[k].branches[b]+' · '+(i?'Disciplina':'Técnica'),desc:'+3% por rango',rankDesc:r=>'+'+r*3+'%',mods:r=>[{targetSkill:b,key:i?'durationMult':'areaMult',value:.03*r}]});
  tree.nodes.push({id:prefix+'transform',branch,type:'special',maxRank:1,cost:3,requires:prefix+'1',name,desc,rankDesc:()=>desc,mods:()=>[{targetSkill:b,flag}]});
  const [mf,mn,md]=[["reprise", "Instante recuperado", "La definitiva repite una vez el último eco de Instante roto."], ["renew", "Tiempo de sanar", "Cada pulso de la definitiva sana 1% de vida a aliados."], ["haste", "Hora compartida", "Los pulsos de la definitiva aceleran 15% a aliados."]][b];
  tree.masteries[branch]={id:branch,branch,name:mn,desc:md,miniTree:[{id:prefix+'master',maxRank:1,cost:4,name:mn,desc:md,rankDesc:()=>md,mods:()=>[{targetSkill:'ult',flag:mf}]}]};
 });TALENT_TREES[k]=tree;CHAMPION_ENTRY_BALANCE.push(balanceChampionEntry(k,CLASSES[k],CHAMPION_BALANCE_REFERENCE));
}
