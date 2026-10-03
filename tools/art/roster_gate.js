#!/usr/bin/env node
'use strict';
// LA HORDA — ROSTER ART GATE (docs/ART_BIBLE.md §2 y §8): el Caballero (tanque) es la referencia única.
// Renderiza CADA campeón y CADA apariencia (original, skins de Set, skins/cromas) con el propio motor
// (makeHero + drawHeroBody, sin VFX), en vista frente/perfil/espalda, y mide altura de cuerpo (filas con
// masa, sin puntas finas de armas), ancho y línea de pies.
//   --write   mide en crudo y genera js/data/champion-art-normalize.js (factores escala+apoyo por vista)
//   (default) verifica con la normalización activa: cuerpo ±4% y pies ±2 px del Caballero en todas las
//             vistas, + auditoría de presentación (nombre, título, largo de textos, duplicados).
// Escribe docs/art-gate/roster-gate.json y docs/art-gate/roster-sheet.png (hoja de contacto con líneas
// de referencia de cabeza y pies del Caballero). Uso: ROSTER_BASE_URL=http://127.0.0.1:8750 node tools/art/roster_gate.js [--write]
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path');
const ROOT=path.resolve(__dirname,'../..'),BASE=process.env.ROSTER_BASE_URL||'http://127.0.0.1:8750',WRITE=process.argv.includes('--write');
const TOL={height:.04,foot:2};
// Presentación: mismos campos y largos acotados para todo el roster.
const TEXT={cardLore:[80,170],history:[300,650],passive:[40,320],skill:[20,240]};
(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
 try{
  const p=await b.newPage({viewport:{width:1400,height:900}});const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(BASE+'/index.html');await p.waitForFunction(()=>typeof CHAMP_ART_NORMALIZE!=='undefined'&&assetsAllReady());
  // Precargar todas las apariencias (cromas/skins se cargan bajo demanda).
  await p.evaluate(()=>{if(typeof cromaLoadAll==='function')cromaLoadAll();for(const id in SET_SKINS)if(typeof skinDefOf==='function')skinDefOf(id);});
  await p.waitForFunction(()=>Object.values(CHAMP_PACK).every(P=>P.ready||P.failed),null,{timeout:60000}).catch(()=>{});
  await p.waitForTimeout(1500);
  const measureAll=(raw,table)=>p.evaluate(({raw,table})=>{
   window.ART_GATE_NO_VFX=true;window.ART_GATE_RAW=raw;if(table)CHAMP_ART_NORMALIZE=table;selectedClass='tanque';currentArena='bosque';startRun(1);state='paused';
   const N=260,cv=document.createElement('canvas');cv.width=N;cv.height=N;const g=cv.getContext('2d',{willReadFrequently:true}),saved=ctx;
   const VIEWS={front:h=>{h.fx=0;h.fy=1;},side:h=>{h.fx=1;h.fy=0;},up:h=>{h.fx=0;h.fy=-1;}};
   function measure(k,skin,view){
    animNow=0;const h=makeHero(k,true,0,0);Object.assign(h,{moving:false,animT:0,attackAnim:0,hurtTimer:0,_packCastUntil:0});if(skin&&skin.asc)h.ascSkin=skin.asc;else if(skin!==undefined)h._codexSkin=skin;VIEWS[view](h);
    g.clearRect(0,0,N,N);g.save();g.translate(N/2,N-40);g.imageSmoothingEnabled=false;ctx=g;
    try{h.x=0;h.y=0;drawHeroBody(h,h.scale,false,false);}catch(e){ctx=saved;g.restore();return {err:String(e.message)};}ctx=saved;g.restore();
    const d=g.getImageData(0,0,N,N).data,rows=new Array(N).fill(0);let x0=N,x1=-1,y0=N,y1=-1;
    for(let y=0;y<N;y++)for(let x=0;x<N;x++)if(d[(y*N+x)*4+3]>40){rows[y]++;if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}
    if(x1<0)return {empty:true};
    const max=Math.max(...rows),thr=max*.22;let b0=-1,b1=-1;for(let y=0;y<N;y++)if(rows[y]>=thr){if(b0<0)b0=y;b1=y;}
    return {body:b1-b0+1,full:y1-y0+1,w:x1-x0+1,foot:y1-(N-40)};
   }
   const out={};
   for(const k of Object.keys(CLASSES)){
    const looks=[['',undefined]];
    for(const [id,s] of Object.entries(SET_SKINS))if(s.champ===k)looks.push([id,id]);
    for(const [id,s] of Object.entries(CROMA_SKINS))if(s.champ===k)looks.push([id,id]);
    if(typeof ASCENSION_SKINS!=='undefined'&&ASCENSION_SKINS[k])ASCENSION_SKINS[k].forEach((_,i)=>looks.push([k+'_alt'+(i+1),{asc:i+1}]));
    for(const [id,skin] of looks){const key=id?k+'@'+id:k;out[key]={};for(const v of Object.keys(VIEWS))out[key][v]=measure(k,skin,v);}
   }
   // Presentación: textos de catálogo/Códice/fichas.
   const text={};
   for(const k of Object.keys(CLASSES)){const c=CLASSES[k],P=typeof PORTADORES!=='undefined'?PORTADORES[k]:null,cat=CHAMPION_CATALOG.find(x=>x.id===k),L=CODEX_CHAMP_LORE[k]||{};
    text[k]={name:c.name,title:(P&&P.title)||c.title||'',role:c.role||'',cardLore:cat?cat.lore:(P?'':''),history:L.history||'',passive:c.passive?c.passive.desc:'',skills:[...c.skills,c.ultimate].map(s=>s.desc||''),inCatalog:!!cat};}
   return {metrics:out,text};
  },{raw,table});
  const data=await measureAll(WRITE,null);
  const ref=data.metrics.tanque,refBody=Object.fromEntries(Object.entries(ref).map(([v,m])=>[v,m.body])),refFoot=Object.fromEntries(Object.entries(ref).map(([v,m])=>[v,m.foot]));
  // Altura de referencia única: la vista de frente del Caballero (todas las vistas se igualan a ella).
  const target=refBody.front,targetFoot=refFoot.front;
  if(WRITE){
   const rows={};
   for(const [key,views] of Object.entries(data.metrics)){const r={};for(const [v,m] of Object.entries(views)){if(!m.body)continue;const s=+(target/m.body).toFixed(4),dy=+(targetFoot-m.foot*s).toFixed(2);r[v]=[s,dy];}rows[key]=r;}
   // Refinamiento: la medición de masa no escala linealmente (re-muestreo de píxeles); se re-mide con los
   // factores aplicados y se corrige hasta converger.
   for(let pass=0;pass<4;pass++){
    const m2=(await measureAll(false,rows)).metrics;let off=0;
    for(const [key,views] of Object.entries(m2))for(const [v,m] of Object.entries(views)){const r=rows[key]&&rows[key][v];if(!r||!m.body)continue;
     if(Math.abs(m.body/target-1)>.02){r[0]=+(r[0]*target/m.body).toFixed(4);off++;}
     if(Math.abs(m.foot-targetFoot)>1){r[1]=+(r[1]+(targetFoot-m.foot)).toFixed(2);off++;}}
    console.log('refine pass',pass+1,'adjusted',off);if(!off)break;
   }
   const js='"use strict";\n// GENERADO por tools/art/roster_gate.js --write (no editar a mano). Factores [escala, corrección de pies]\n// por apariencia y vista para igualar el cuerpo al Caballero (tanque, '+target+' px de cuerpo a escala 2).\nvar CHAMP_ART_NORMALIZE = '+JSON.stringify(rows,null,0).replace(/\],"/g,'],"').replace(/\},"/g,'},\n"')+';\n';
   fs.writeFileSync(path.join(ROOT,'js/data/champion-art-normalize.js'),js);
   console.log('wrote factors for',Object.keys(rows).length,'appearances; reference body',target,'px, foot',targetFoot);
   return;
  }
  // ---- verificación ----
  const fails=[];
  for(const [key,views] of Object.entries(data.metrics))for(const [v,m] of Object.entries(views)){
   if(m.err||m.empty){fails.push({key,view:v,reason:m.err||'empty sprite'});continue;}
   const dh=m.body/target-1,df=m.foot-targetFoot;
   if(Math.abs(dh)>TOL.height||Math.abs(df)>TOL.foot)fails.push({key,view:v,body:m.body,target,foot:m.foot,targetFoot,dh:+dh.toFixed(3)});
  }
  // Presentación
  const tfails=[],seen=new Map(),inRange=(s,[a,z])=>s.length>=a&&s.length<=z;
  for(const [k,t] of Object.entries(data.text)){
   if(!t.inCatalog)continue; // INTERNAL: se audita igual al publicarse
   if(!t.name)tfails.push({k,reason:'sin nombre'});if(!t.title)tfails.push({k,reason:'sin título'});
   if(!inRange(t.cardLore,TEXT.cardLore))tfails.push({k,reason:`descripción de tarjeta ${t.cardLore.length} (esperado ${TEXT.cardLore.join('–')})`});
   if(!inRange(t.history,TEXT.history))tfails.push({k,reason:`historia ${t.history.length} (esperado ${TEXT.history.join('–')})`});
   if(t.passive&&!inRange(t.passive,TEXT.passive))tfails.push({k,reason:`pasiva ${t.passive.length}`});
   t.skills.forEach((s,i)=>{if(!inRange(s,TEXT.skill))tfails.push({k,reason:`habilidad ${i} ${s.length}`});});
   if(t.cardLore&&t.history&&(t.history.includes(t.cardLore)||t.cardLore===t.history))tfails.push({k,reason:'descripción de tarjeta duplicada dentro de la historia'});
   for(const [f,s] of [['cardLore',t.cardLore],['history',t.history],...t.skills.map((s,i)=>['skill'+i,s])]){if(!s)continue;const prev=seen.get(s);if(prev&&prev.k!==k)tfails.push({k,reason:`${f} duplicado de ${prev.k}.${prev.f}`});else seen.set(s,{k,f});}
  }
  // Hoja de contacto con referencia
  await p.evaluate(()=>{window.ART_GATE_RAW=false;window.ART_GATE_NO_VFX=true;});
  const sheet=await p.evaluate(({target,targetFoot})=>{
   const keys=Object.keys(CLASSES),CW=110,CH=130,cols=10,rows=Math.ceil(keys.length/cols)*1;
   const cv=document.createElement('canvas');cv.width=CW*cols;cv.height=CH*rows;cv.id='rg';cv.style.cssText='position:fixed;left:0;top:0;z-index:99999';document.body.appendChild(cv);
   const g=cv.getContext('2d'),saved=ctx;g.fillStyle='#3e4339';g.fillRect(0,0,cv.width,cv.height);
   keys.forEach((k,i)=>{const cx=(i%cols)*CW+CW/2,cy=Math.floor(i/cols)*CH+CH-22;
    g.strokeStyle='rgba(255,80,80,.7)';g.beginPath();g.moveTo(cx-50,cy+targetFoot-target);g.lineTo(cx+50,cy+targetFoot-target);g.stroke();
    g.strokeStyle='rgba(120,255,140,.7)';g.beginPath();g.moveTo(cx-50,cy+targetFoot);g.lineTo(cx+50,cy+targetFoot);g.stroke();
    const h=makeHero(k,true,0,0);Object.assign(h,{fx:0,fy:1,moving:false,attackAnim:0});g.save();g.translate(cx,cy);g.imageSmoothingEnabled=false;ctx=g;try{h.x=0;h.y=0;drawHeroBody(h,h.scale,false,false);}catch(e){}ctx=saved;g.restore();
    g.fillStyle='#fff';g.font='10px monospace';g.fillText(k,cx-48,cy+16);});
   return [cv.width,cv.height];},{target,targetFoot});
  await p.setViewportSize({width:Math.max(800,sheet[0]),height:Math.max(600,sheet[1])});
  fs.mkdirSync(path.join(ROOT,'docs/art-gate'),{recursive:true});
  await (await p.$('#rg')).screenshot({path:path.join(ROOT,'docs/art-gate/roster-sheet.png')});
  const report={reference:{champion:'tanque',bodyPx:target,foot:targetFoot,tolerance:TOL},appearances:Object.keys(data.metrics).length,scaleFailures:fails,presentationFailures:tfails,errors,metrics:data.metrics,text:data.text};
  fs.writeFileSync(path.join(ROOT,'docs/art-gate/roster-gate.json'),JSON.stringify(report,null,1)+'\n');
  console.log(JSON.stringify({appearances:report.appearances,scaleFailures:fails.length,presentationFailures:tfails.length,errors:errors.length}));
  for(const f of fails.slice(0,40))console.log('SCALE',JSON.stringify(f));for(const f of tfails.slice(0,80))console.log('TEXT',JSON.stringify(f));
  if(fails.length||tfails.length||errors.length)process.exitCode=1;
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
