#!/usr/bin/env node
'use strict';
// Champion Factory — duplicity analysis. Compares each candidate against the WHOLE registered roster
// (base, portadores, expedition and other candidates) on role, fantasy/kit vocabulary and mechanic
// tags, plus explicit forbidden themes. Reads the real runtime registry from the served game.
// Usage: FACTORY_BASE_URL=http://127.0.0.1:8750 node tools/factory/duplicity.js [id,id,...]
// Writes docs/founders/duplicity-report.json. Exit 1 if any candidate is DUPLICATE or hits a forbidden theme.
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path');
const TAGS={
 summon:/torre|torreta|invoca|golem|esqueleto|lobo|reflejo|eco de/,swarm:/enjambre|escarabaj|abeja|colmena|nube de/,thread:/hilo|costura|cose|hilv|puntada|aguja/,
 mirror:/espejo|reflej/,gravity:/gravedad|masa|atrae|atracci|singularidad|órbita|orbita|colapso/,portal:/portal|cicatriz|grieta|umbral/,mask:/máscara|mascara|rostro|teatro/,
 geometry:/nodo|prisma|triángulo|triangulo|geométr|geometr|refrac/,water:/ola|marea|agua|océano|oceano|corriente|espuma/,lightdark:/luz|sombra|oscuridad|juicio|sentencia/,
 fortify:/placa|muralla|muro|fortific|ciudadela|bastión|bastion/,bell:/campana|tañido/,fire:/fuego|brasa|ceniza|horno|calor/,ice:/hielo|escarcha|helad/,nature:/raíz|raiz|semilla|espina|zarza|bosque/,
 music:/nota|concierto|marcha|canto|melod/,heal:/cura|sana|restaur|regenera/,shield:/escudo|protege|guardia|custodia/,dash:/salta|carga|embestida|desplaza|traslad|paso|cabalga/,
 execute:/ejecut/,mark:/marca|sentenci|puntada/,chain:/cadena|enlace|grillete/,time:/tiempo|reloj|destino|profec/,alchemy:/resina|frasco|catalizador|destil/,yogurt:/yogur/,turret:/torre|torreta/
};
// Word-start boundary (accent-aware) so 'ola' does not match 'solar' nor 'paso' match 'colapso'.
for(const k of Object.keys(TAGS))TAGS[k]=new RegExp('(?<!\\p{L})(?:'+TAGS[k].source+')','u');
const FORBIDDEN={velmira:/\b(hilo|hilos|destino|costura|costuras|coser|puntada)\b/};
const STOP=new Set('de la el los las un una y en a con por que se su sus del al lo o para es como más mas sin sobre cada entre hasta cuando ya no le les'.split(' '));
const tokens=s=>new Set(String(s||'').toLowerCase().normalize('NFC').replace(/[^\p{L}\s]/gu,' ').split(/\s+/).filter(w=>w.length>3&&!STOP.has(w)));
const jacc=(a,b)=>{const i=[...a].filter(x=>b.has(x)).length,u=new Set([...a,...b]).size;return u?i/u:0;};
const tagsOf=text=>new Set(Object.entries(TAGS).filter(([,re])=>re.test(text)).map(([k])=>k));
(async()=>{
 const base=process.env.FACTORY_BASE_URL||'http://127.0.0.1:8750';const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
 try{
  const p=await b.newPage();await p.goto(base);await p.waitForFunction(()=>typeof CLASSES!=='undefined'&&typeof CHAMPION_ENTRY_BALANCE!=='undefined');
  if(process.argv.includes('--workshop-quality'))for(const k of ['solciju','veyra','brakk','morveth','aelith']){await p.addScriptTag({path:path.resolve(__dirname,'../../js/champions/quality-five/'+k+'.js')});await p.addScriptTag({path:path.resolve(__dirname,'../quality-five/'+(k==='solciju'?'register-fixture.js':'register-'+k+'-fixture.js'))});}
  const roster=await p.evaluate(()=>Object.keys(CLASSES).map(k=>{const c=CLASSES[k],P=typeof PORTADORES!=='undefined'?PORTADORES[k]:null,A=typeof ASCENSION!=='undefined'?ASCENSION[k]:null;
   const skills=[...(c.skills||[]),c.ultimate].filter(Boolean);
   return {id:k,name:c.name,role:c.roleCategory,title:(P&&P.title)||'',fantasy:[c.role,(A&&A.fantasy)||'',(A&&A.silhouette)||'',c.passive?c.passive.name+' '+c.passive.desc:''].join(' '),
    kit:skills.map(s=>s.name+' '+(s.desc||'')).join(' '),category:typeof championMeta==='function'?championMeta(k).category:'STANDARD'};}));
  const ids=(process.argv[2]||'nano_gm,facu_gm,aurelia,khepri,velmira,vhal,bront,oriel').split(',');
  const report=[];let failed=false;
  for(const id of ids){const c=roster.find(r=>r.id===id);if(!c){report.push({id,error:'not registered'});failed=true;continue;}
   const ct=tokens(c.fantasy+' '+c.kit+' '+c.title),cg=tagsOf((c.fantasy+' '+c.kit).toLowerCase());
   const pairs=roster.filter(r=>r.id!==id).map(r=>{const rt=tokens(r.fantasy+' '+r.kit+' '+r.title),rg=tagsOf((r.fantasy+' '+r.kit).toLowerCase());
    const text=jacc(ct,rt),tags=jacc(cg,rg),score=.35*text+.45*tags+.2*(r.role===c.role?1:0);return {other:r.id,score:+score.toFixed(3),text:+text.toFixed(3),tags:+tags.toFixed(3),sharedTags:[...cg].filter(x=>rg.has(x))};}).sort((a,b)=>b.score-a.score);
   const top=pairs[0],verdict=top.score>=.45?'DUPLICATE':top.score>=.32?'REVIEW':'DISTINCT';
   const forbidden=FORBIDDEN[id]&&FORBIDDEN[id].test((c.fantasy+' '+c.kit).toLowerCase())?String((c.fantasy+' '+c.kit).toLowerCase().match(FORBIDDEN[id])[0]):null;
   if(verdict==='DUPLICATE'||forbidden)failed=true;
   report.push({id,role:c.role,category:c.category,tags:[...cg],verdict,forbidden,nearest:pairs.slice(0,3)});}
  const roles={};for(const r of roster.filter(r=>r.category!=='FOUNDER'))roles[r.role]=(roles[r.role]||0)+1;
  const out={generatedAt:new Date().toISOString(),method:'score = 0.35·Jaccard(vocabulario) + 0.45·Jaccard(etiquetas de mecánica) + 0.2·mismo rol; DUPLICATE ≥ 0.45, REVIEW ≥ 0.32',rosterSize:roster.length,roleDistribution:roles,report};
  const output=path.resolve(__dirname,process.argv.includes('--workshop-quality')?'../../docs/production/quality-five/duplicity-report.json':'../../docs/founders/duplicity-report.json');fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(out,null,2)+'\n');
  for(const r of report)console.log(`${r.id.padEnd(9)} ${String(r.verdict).padEnd(9)} nearest=${r.nearest?r.nearest.map(n=>n.other+':'+n.score).join(', '):r.error}${r.forbidden?' FORBIDDEN:'+r.forbidden:''}`);
  console.log('role distribution (non-founder):',JSON.stringify(roles));
  if(failed)process.exitCode=1;
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
