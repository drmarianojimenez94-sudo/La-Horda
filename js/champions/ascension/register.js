'use strict';
// Registro de la expansión Ascensión. Va ANTES de champion-entry-balance (normaliza estadísticas)
// y respeta js/data/champion-taxonomy.js: los INTERNAL no entran al catálogo público ni a las tiradas de
// Set; los FOUNDER entran como vitrina (no comprables) y sin Set (fuera de la progresión normal).
function ascensionTint(hex,toward,t){
 const a=hexToRgb(hex),b=hexToRgb(toward);if(!a||!b)return hex;
 const c=[a.r+(b.r-a.r)*t,a.g+(b.g-a.g)*t,a.b+(b.b-a.b)*t].map(v=>Math.round(v).toString(16).padStart(2,'0'));return '#'+c.join('');
}
// Proyectil propio de cada uno (skill-evolution.js drawProjStyle): ninguno comparte forma con otro guardián.
const ASCENSION_PROJ={nano_gm:'halfmoon',facu_gm:'wave',aurelia:'prism',khepri:'scarab',velmira:'mask',vhal:'comet',bront:'fist',oriel:'key'};
const ASCENSION_SKINS={};
const ASCENSION_PENDING_SETS={}; // Sets de campeones INTERNAL: se registran al pasar a RELEASED // apariencias alternativas (perfil de VFX hasta que llegue el atlas encargado)
for(const [k,p] of Object.entries(ASCENSION)){
 const [hp,dmg,def,speed,range,basic,ranged]=p.stats,base=p.role==='asesino'?'guerrero':p.role,meta=championMeta(k);
 const all=p.skills.map(([name,action,cost,cd,range,radius,duration,dmgMult,desc,affinity])=>({name,action,affinity,kind:'ascension',ico:'✦',cost,cd,range,radius,duration,dmgMult,desc}));
 const q={name:p.name,title:p.title,role:p.fantasy,roleCategory:p.role,color:p.color,glow:p.glow,hp,dmg,def,speed,range,basic,ranged,weapon:p.weapon,set:p.setName?'asc_'+k:null,skills:all.slice(0,3),ultimate:all[3],history:p.history,origin:p.arena,branches:all.slice(0,3).map(s=>s.name),voices:p.voices,founder:p.founder||null};
 PORTADORES[k]=q;
 CLASSES[k]={name:p.name,hudName:p.name,icon:p.founder?'♛':'✦',role:q.role,roleCategory:p.role,color:p.color,glow:p.glow,baseHP:hp,baseDmg:dmg,baseDef:def,baseSpeed:speed,energyMax:p.founder?130:110,energyRegen:p.founder?12:10,
  hpGrowthMult:p.role==='tanque'?1.4:p.role==='soporte'?1.15:.85,dmgGrowthMult:p.role==='mago'||p.role==='asesino'?1.1:.8,basicRange:range,basicCd:basic,basicArc:!ranged,ranged,skills:q.skills,ultimate:q.ultimate,noDivinaFoe:true,
  passive:{name:p.passive[0],desc:p.passive[1],ico:'◇'},category:meta.category};
 // Todos tienen fila en el guardado (bloqueada); el cargador la conserva y el servidor fuerza
 // unlocked:false para los no publicados que la cuenta no tenga concedidos.
 if(championPlayable(k))CHAMPION_CATALOG.push({id:k,priceGold:meta.showcasePrice||CHAMPION_PRICE_GOLD,unlockedByDefault:false,lore:p.history,category:meta.category});
 save.champions[k] ||= mkChampion(false);
 CLASS_WEAPON_LABEL[k]=p.weapon;SCORE_CONFIG[k]=SCORE_CONFIG[base];CHAMP_ITEM_AFFINITY[k]={...CHAMP_ITEM_AFFINITY[base]};
 // Sprite de respaldo con paleta propia: provisorio hasta el atlas encargado (no es arte aprobado).
 PAL[k]={};for(const [c,v] of Object.entries(PAL[base]))PAL[k][c]=c==='a'?v:ascensionTint(v,p.color,.5);GRIDS[k]=GRIDS[base];
 CODEX_CHAMP_LORE[k]={origin:p.arena,history:p.history};HERO_VOICES[k]={pick:p.voices[0],win:p.voices[1],fall:p.voices[2]};
 ANIM_PROFILES[k]={...ANIM_PROFILES[base],basic:ranged?'ranged':'melee'};CHAMP_IDENTITY[k]={sig:'mark',proj:ASCENSION_PROJ[k]||'glyph'};CODEX_SKILL_FX[k]=all.map(()=>({color:hexToRgb(p.color),fx:'zone'}));
 ASCENSION_SKINS[k]=p.skins.map(([name,visualTheme,lore],i)=>({id:k+'_alt'+(i+1),champ:k,name,visualTheme,lore,founderOnly:!!p.founder,status:'GENERATED_PENDING_REVIEW',pack:k+'_alt'+(i+1)}));
 const tree={masteryRequirement:8,nodes:[],masteries:{}};
 q.skills.forEach((sk,b)=>{
  const branch=k+'_'+b,pref=k+'_t'+b,label={powerMult:'potencia',durationMult:'duración',areaMult:'área',cdMult:'recarga'};
  [['a','powerMult',.05],['b','areaMult',.05],['c','cdMult',-.03]].forEach(([s,key,value],i)=>tree.nodes.push({id:pref+s,branch,type:'common',maxRank:3,cost:1,requires:i?pref+['a','b'][i-1]:null,name:sk.name+' · '+['Técnica','Extensión','Disciplina'][i],desc:(value*100)+'% '+label[key]+' por rango',rankDesc:r=>(value*r*100)+'% '+label[key],mods:r=>[{targetSkill:b,key,value:value*r}]}));
  tree.masteries[branch]={id:branch,branch,name:sk.name+' Mayor',desc:'+10% al efecto de la rama; habilita miniárbol.',miniTree:[{id:pref+'m1',maxRank:2,cost:4,requires:null,name:'Técnica',desc:'+5% por rango',rankDesc:r=>'+'+r*5+'%',mods:r=>[{targetSkill:b,key:'powerMult',value:.05*r}]},{id:pref+'m2',maxRank:2,cost:4,requires:null,name:'Legado',desc:'+5% poder de definitiva por rango',rankDesc:r=>'+'+r*5+'%',mods:r=>[{targetSkill:'ult',key:'powerMult',value:.05*r}]}]};
 });TALENT_TREES[k]=tree;
 if(!p.setName)continue; // Fundadores: sin Set ni piezas en el botín
 const id=q.set,S={id,champion:k,name:p.setName,theme:p.fantasy,aura:hexToRgb(p.color),full:id,sourceArena:p.arena,lore:p.history,rarity:'legendario',pieces:{arma:p.weapon,casco:'Insignia de '+p.name,pechera:'Vestidura de '+p.name,botas:'Pasos de '+p.name},thresholds:[{count:2,desc:'+5% vida',mods:()=>[{effect:'hp_mult',value:.05}]},{count:3,desc:'+4% daño de habilidades',mods:()=>[{effect:'skilldmg_mult',value:.04}]},{count:4,desc:'−4% recargas',mods:()=>[{effect:'cd_mult',value:.04}]}]};
 // Un campeón sin publicar no expone su Set en Tienda, Códice ni botín: queda pendiente hasta RELEASED.
 if(meta.releaseState!=='RELEASED'){ASCENSION_PENDING_SETS[id]=S;continue;}
 CHAMPION_SETS[id]=SET_DB[id]=S;SET_ARENA_WEIGHTS[p.arena][id]=1;
 for(const type in S.pieces){const key=id+'_'+type;DESIGNED_ITEMS[key]={id:key,champion:k,type,rarity:'legendario',set:id,name:S.pieces[type],lore:S.lore,passiveNames:[]};}
}
