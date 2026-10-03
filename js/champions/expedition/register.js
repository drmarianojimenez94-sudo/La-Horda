'use strict';
// Workshop only. Called before champion-entry-balance, after the normal save load.
for(const [k,p] of Object.entries(EXPEDITION)){
 const [hp,dmg,def,speed,range,basic,ranged]=p.stats,base=p.role==='asesino'?'guerrero':p.role;
 const all=p.skills.map(([name,action,cost,cd,range,radius,duration,dmgMult,desc])=>({name,action,kind:'expedition',ico:'✦',cost,cd,range,radius,duration,dmgMult,desc}));
 const q={name:p.name,title:p.title,role:p.fantasy,roleCategory:p.role,color:p.color,glow:p.color,hp,dmg,def,speed,range,basic,ranged,weapon:p.weapon,set:'exp_'+k,skills:all.slice(0,3),ultimate:all[3],history:p.history,origin:p.arena,branches:all.slice(0,3).map(s=>s.name),voices:p.voices};PORTADORES[k]=q;
 CLASSES[k]={name:p.name,hudName:p.name,icon:'✦',role:q.role,roleCategory:p.role,color:p.color,glow:p.color,baseHP:hp,baseDmg:dmg,baseDef:def,baseSpeed:speed,energyMax:110,energyRegen:10,hpGrowthMult:p.role==='tanque'?1.4:p.role==='soporte'?1.15:.8,dmgGrowthMult:p.role==='mago'||p.role==='asesino'?1.1:.8,basicRange:range,basicCd:basic,basicArc:!ranged,ranged,skills:q.skills,ultimate:q.ultimate,noDivinaFoe:true,passive:{name:p.passive[0],desc:p.passive[1],ico:'◇'}};
 CHAMPION_CATALOG.push({id:k,priceGold:CHAMPION_PRICE_GOLD,unlockedByDefault:true,lore:p.history});save.champions[k] ||= mkChampion(true);
 CLASS_WEAPON_LABEL[k]=p.weapon;SCORE_CONFIG[k]=SCORE_CONFIG[base];CHAMP_ITEM_AFFINITY[k]={...CHAMP_ITEM_AFFINITY[base]};
 // Clearly labelled borrowed workshop silhouettes. No art approval is claimed.
 PAL[k]={...PAL[base]};GRIDS[k]=GRIDS[base];
 CODEX_CHAMP_LORE[k]={origin:p.arena,history:p.history};HERO_VOICES[k]={pick:p.voices[0],win:p.voices[1],fall:p.voices[2]};
 ANIM_PROFILES[k]={...ANIM_PROFILES[base],basic:ranged?'ranged':'melee'};CHAMP_IDENTITY[k]={sig:'mark',proj:'glyph'};CODEX_SKILL_FX[k]=all.map(()=>({color:hexToRgb(p.color),fx:'zone'}));
 const tree={masteryRequirement:8,nodes:[],masteries:{}};
 q.skills.forEach((sk,b)=>{
  const branch=k+'_'+b,pref=k+'_t'+b,powerKey=['reflect','brace','mound'].includes(sk.action)?'durationMult':sk.action==='retrace'?'areaMult':'powerMult';
  [['a',powerKey,.05],['b',sk.action==='brace'?'durationMult':'areaMult',.05],['c','cdMult',-.03]].forEach(([s,key,value],i)=>tree.nodes.push({id:pref+s,branch,type:'common',maxRank:3,cost:1,requires:i?pref+['a','b'][i-1]:null,name:sk.name+' · '+['Técnica','Extensión','Disciplina'][i],desc:(value*100)+'% '+key+' por rango',rankDesc:r=>(value*r*100)+'% '+key,mods:r=>[{targetSkill:b,key,value:value*r}]}));
  tree.masteries[branch]={id:branch,branch,name:sk.name+' Mayor',desc:'+10% al efecto de la rama; habilita miniárbol.',miniTree:[{id:pref+'m1',maxRank:2,cost:4,requires:null,name:'Técnica',desc:'+5% por rango',rankDesc:r=>'+'+r*5+'%',mods:r=>[{targetSkill:b,key:powerKey,value:.05*r}]},{id:pref+'m2',maxRank:2,cost:4,requires:null,name:'Legado',desc:'+5% poder de definitiva por rango',rankDesc:r=>'+'+r*5+'%',mods:r=>[{targetSkill:'ult',key:'powerMult',value:.05*r}]}]};
 });TALENT_TREES[k]=tree;
 const id=q.set,S={id,champion:k,name:p.setName,theme:p.fantasy,aura:hexToRgb(p.color),full:id,lore:p.history,rarity:'legendario',pieces:{arma:p.weapon,casco:'Insignia de '+p.name,pechera:'Vestidura de '+p.name,botas:'Pasos de '+p.name},thresholds:[{count:2,desc:'+5% vida',mods:()=>[{effect:'hp_mult',value:.05}]},{count:3,desc:'+4% daño de habilidades',mods:()=>[{effect:'skilldmg_mult',value:.04}]},{count:4,desc:'−4% recargas',mods:()=>[{effect:'cd_mult',value:.04}]}]};
 CHAMPION_SETS[id]=SET_DB[id]=S;for(const type in S.pieces){const key=id+'_'+type;DESIGNED_ITEMS[key]={id:key,champion:k,type,rarity:'legendario',set:id,name:S.pieces[type],lore:S.lore,passiveNames:[]};}
}
