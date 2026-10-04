#!/usr/bin/env node
'use strict';
// Builds Champion Factory manifests (tools/factory/contracts.js) for the Ascension champions from the
// real kit data and validates them. Art, review and gate evidence stay EMPTY until commissioned atlases
// pass the Visual Gate: the expected result today is INCOMPLETE, never a fabricated STRUCTURAL_PASS.
// Usage: node tools/ascension/manifests.js   -> docs/production/ascension/<id>.json + validation.json
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
// Gate de estilo (tools/art/painter/style_gate.py): la evidencia solo vale si el reporte marca PASS para esta hoja.
const stylePass=src=>{try{const g=JSON.parse(require('fs').readFileSync('docs/art-gate/style-gate.json','utf8'));return !!(g.sheets&&g.sheets[src]&&g.sheets[src].pass);}catch(e){return false;}};
const {validate,scaffold,BUDGETS,taxonomy}=require('../factory/contracts');
const ROOT=path.resolve(__dirname,'../..'),OUT=path.join(ROOT,'docs/production/ascension');
const c={};vm.createContext(c);vm.runInContext(fs.readFileSync(path.join(ROOT,'js/champions/ascension/catalog.js'),'utf8')+';this.ASCENSION=ASCENSION;',c);
const PHASES={sentence:['Brazo oscuro se carga de runas','Decreto en línea','Daño + SENTENCIA; ejecución de comunes <22%','Grieta oscura y número de daño'],
 edict:['Brazo de luz dibuja un cuadrado','Ley de refugio en el suelo','Escudo, regeneración y −15% daño a aliados','Glifo cuadrado giratorio'],
 invert:['Runa bajo los pies','Traslado al punto','Runa opuesta: estallido o curación','Anillo que se expande'],
 judgement:['Pausa dramática y cambio de luz (0,7 s)','Arena dividida luz/oscuridad; alas desplegadas','Aliados restaurados, comunes ejecutados/devastados, jefes con techo','Desaturación y anillo blanco'],
 current:['Línea de espuma','Corriente 3,5 s','Arrastra comunes, acelera aliados','Chevrones que fluyen'],pressure:['Ondas convergentes','Implosión','Atrae comunes y frena','Anillo que colapsa'],
 ride:['Ola bajo los pies','Desplazamiento fluido ~0,5 s','Aparta enemigos, protege aliados','Estela de espuma'],ocean:['La arena se inunda (1 s)','Remolino y leviatán espectral','Ola final atraviesa el escenario','Espuma residual'],
};
const ids=Object.keys(c.ASCENSION),results={};fs.mkdirSync(OUT,{recursive:true});
for(const id of ids){
 const p=c.ASCENSION[id],meta=taxonomy().meta(id),category=meta.category,m=scaffold(id,category);
 Object.assign(m,{name:p.name,title:p.title,role:p.role,fantasy:p.fantasy,lore:p.history,personality:p.voices.join(' / '),silhouette:p.silhouette,stats:{hp:p.stats[0],damage:p.stats[1],speed:p.stats[3]}});
 const ab=(s,i)=>{const [name,action,cost,cd,range,radius,duration,dmg,desc]=s,ph=PHASES[action]||['Pose de cast y telegraph del área','Ejecución de '+name,desc,'Impacto propio y número de daño'];
  return {id:action,description:desc,cooldownMs:cd,maxTargets:i===3?60:20,hordeMechanism:radius>=60||action==='current'?'Área/línea con límite de objetivos y techo por lanzamiento contra jefes':'',anticipation:ph[0],execution:ph[1],impact:ph[2],feedback:ph[3],vfx:'js/champions/ascension/render.js',sfx:'asc_'+id+(i===3?'_ult':'_cast')};};
 m.kit={basic:{id:'basic',description:p.stats[6]?'Básico a distancia':'Básico cuerpo a cuerpo',cooldownMs:p.stats[5],maxTargets:1,hordeMechanism:'',anticipation:'Pose de ataque',execution:'Golpe básico',impact:'Daño único',feedback:'Número de daño',vfx:'existing basic VFX',sfx:'hit'},skills:p.skills.slice(0,3).map(ab),ultimate:ab(p.skills[3],3)};
 m.integration={runtime:'js/champions/ascension/runtime.js',codex:'js/champions/ascension/register.js',talents:'js/champions/ascension/register.js',mastery:'js/champions/ascension/register.js',set:category==='FOUNDER'?'':'js/champions/ascension/register.js',kitTest:'tools/ascension/functional.js'};
 if(category==='FOUNDER'){m.founderKey=meta.founderKey;m.integration.set='js/champions/ascension/register.js';}
 m.cosmetics=p.skins.map(([name,visualTheme,lore],i)=>({id:id+'_alt'+(i+1),type:'skin',champion:id,name,rarity:category==='FOUNDER'?'Fundador':'Épica',tagline:visualTheme,lore,visualTheme,unlockSource:category==='FOUNDER'?'FOUNDER_ENTITLEMENT':'alpha-test',collection:category==='FOUNDER'?'Los Regentes':'Ascensión',vfxProfile:'js/champions/ascension/render.js',visualChanges:['secondarySilhouette','accessory','vfx'],preview:'',availability:'alpha-test',premiumPrice:null}));
 if(category!=='FOUNDER')m.set={sourceArena:p.arena,pieces:['arma','casco','pechera','botas'],rewardCosmetic:'',rewardGrantsPower:false};
 m.budgets={particles:category==='FOUNDER'?96:64,summons:id==='oriel'?2:id==='khepri'?1:0,audioVoices:category==='FOUNDER'?4:3};
 // Arte GENERADO (tools/art/ascension_sprites.py): estructura completa, revisión visual humana PENDIENTE.
 // Arte instalado por El Pintor (tools/art/painter/install.py -> docs/art-gate/painter-installs.json); si no hay
 // instalación registrada, cae al inventario del generador anterior.
 const inst=JSON.parse(fs.readFileSync(path.join(ROOT,'docs/art-gate/painter-installs.json'),'utf8')),gen=JSON.parse(fs.readFileSync(path.join(ROOT,'docs/founders/generated-art.json'),'utf8'));
 const artOf=pk=>{const dir='assets/sprites/champions/'+id+(pk===id?'':'/skins/'+pk);const f=path.join(ROOT,dir,'atlas.png');
  if(inst[pk]&&fs.existsSync(f))return {atlas:dir+'/atlas.png',preview:dir+'/preview.png',sha256:require('node:crypto').createHash('sha256').update(fs.readFileSync(f)).digest('hex'),styleGate:inst[pk].styleGate};
  return gen[pk]||null;};
 const a0=artOf(id);
 if(a0)Object.assign(m.art,{atlas:a0.atlas,preview:a0.preview,directions:4,frameWidth:112,frameHeight:112,sha256:a0.sha256,animations:{idle:1,walk:4,attack:4,cast:4,hit:1,death:4,ultimate:4}});
 m.cosmetics.forEach((c,i)=>{const g=artOf(id+'_alt'+(i+1));if(g)c.preview=g.preview;});
 m.art.review={status:'PENDING',reviewer:'',evidence:'',note:'Arte generado por código; requiere revisión humana del Visual Gate (docs/ART_BIBLE.md §8).'};
 m.evidence={reference:'docs/balance/entry-gate-results.json',balance:'docs/balance/entry-gate-results.json',visuals:'docs/art-gate/roster-gate.json',audio:'',multiplayer:'docs/founders/online-presence-results.json',performance:'docs/founders/performance-results.json',style:stylePass('assets/sprites/champions/'+id+'/atlas.png')?'docs/art-gate/style-gate.json':''};
 const errors=validate(m);results[id]={category,releaseState:meta.releaseState,status:errors.length?'INCOMPLETE':'STRUCTURAL_PASS',errors};
 fs.writeFileSync(path.join(OUT,id+'.json'),JSON.stringify(m,null,2)+'\n');
}
fs.writeFileSync(path.join(OUT,'validation.json'),JSON.stringify({note:'INCOMPLETE is expected until commissioned art passes the Visual Gate (docs/founders/ART_BRIEFS.md). Manifests are never auto-registered.',results},null,2)+'\n');
for(const [id,r] of Object.entries(results))console.log(id.padEnd(9),r.category.padEnd(9),r.status,'·',r.errors.length,'pendientes:',[...new Set(r.errors.map(e=>e.split(':')[0].split(' ')[0]))].slice(0,6).join(', '));
