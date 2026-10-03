'use strict';
const {chromium}=require('playwright'),fs=require('fs');
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||chromium.executablePath(),args:['--no-sandbox']});try{
 const p=await b.newPage({viewport:{width:1100,height:1400}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:8806');await p.waitForFunction(()=>typeof EXPEDITION!=='undefined'&&Object.keys(EXPEDITION).every(k=>CHAMP_PACK[k]?.ready));
 await p.evaluate(()=>{cromaLoadAll();});await p.waitForFunction(()=>Object.values(CROMA_SKINS).filter(d=>EXPEDITION[d.champ]).every(d=>Object.values(d.packs).every(k=>CHAMP_PACK[k]?.ready)));
 const result=await p.evaluate(()=>{
  const checks=[],previews={},check=(name,ok)=>checks.push({name,ok:!!ok});state='prep';save.gold=100000;save.collection={};save.cosmeticUnlocks={};
  for(const k of Object.keys(EXPEDITION)){
   const rec=save.champions[k],before=JSON.stringify([rec.level,rec.equipment,rec.talents,CLASSES[k]]);check(k+' starts locked at level 1',!rec.unlocked&&rec.level===1);
   const id=k+'_skin',set='exp_'+k,cid=k+'_croma';check(k+' buy and equip real skin',cromaBuy(id).ok&&cromaEquip(k,id)&&activeSetSkinId({classKey:k})===id);
   check(k+' rejects wrong champion',!cromaEquip(k,Object.keys(EXPEDITION).find(q=>q!==k)+'_skin'));
   for(const slot of Object.keys(SET_DB[set].pieces))save.collection[set+'_'+slot]={n:1};check(k+' set grant',cosmeticUnlockCompletedSet(set)&&skinCosmeticEquip(k,set));
   const count=Object.keys(save.cosmeticUnlocks).length;cosmeticUnlockCompletedSet(set);check(k+' grant idempotent',Object.keys(save.cosmeticUnlocks).length===count);
   save.collection={};check(k+' set stays after sale',skinOwnedFull(set)&&skinCosmeticEquip(k,set));
   check(k+' croma buys/equips',cromaBuy(cid).ok&&cromaEquip(k,cid));
   check(k+' cosmetic cannot change combat',JSON.stringify([rec.level,rec.equipment,rec.talents,CLASSES[k]])===before);
   const P=CHAMP_PACK[CROMA_SKINS[cid].packs[k]],c=document.createElement('canvas');c.width=P.fw;c.height=P.fh;const g=c.getContext('2d');g.drawImage(P.atlas,0,0,P.fw,P.fh,0,0,P.fw,P.fh);previews[k]=c.toDataURL();
   check(k+' croma changes palette only',P.cosmeticChangedPixels>0&&P.fw===CHAMP_PACK[k].fw&&P.refH===CHAMP_PACK[k].refH);
   skinCosmeticEquip(k,set);
  }persist();
  selectedClass='tanque';currentArena='bosque';startRun(1);state='paused';
  const cvs=document.createElement('canvas');cvs.id='ex-review';cvs.width=1040;cvs.height=1240;document.body.appendChild(cvs);cvs.style.cssText='position:fixed;inset:0;z-index:999999';const g=cvs.getContext('2d');g.fillStyle='#3c4141';g.fillRect(0,0,cvs.width,cvs.height);g.imageSmoothingEnabled=false;g.fillStyle='white';g.font='14px monospace';g.fillText('Tanque master + ORIGINAL / SKIN / SET / CROMA, same scale, no VFX',20,20);
  const saved=ctx;ctx=g;animNow=1000;const keys=['tanque',...Object.keys(EXPEDITION)];
  keys.forEach((k,row)=>{g.fillStyle='white';g.fillText(k,4,80+row*106);const variants=k==='tanque'?[null,null,null,null]:[null,k+'_skin','exp_'+k,k+'_croma'];variants.forEach((v,col)=>{for(let dir=0;dir<2;dir++){const h=makeHero(k,true,0,0);h._codexSkin=v;h.x=145+col*230+dir*90;h.y=110+row*106;h.fx=dir?0:1;h.fy=dir?-1:0;h.moving=false;h.attackAnim=0;h.hurtTimer=0;drawHeroBody(h,h.scale,false,false);}});});ctx=saved;
  return {checks,previews};
 });
 for(const [k,data] of Object.entries(result.previews))fs.writeFileSync('assets/sprites/champions/'+k+'/croma-preview.png',Buffer.from(data.split(',')[1],'base64'));
 await p.locator('#ex-review').screenshot({path:'docs/expedition/visual-roster.png'});
 await p.reload();await p.waitForFunction(()=>typeof EXPEDITION!=='undefined');result.checks.push(...await p.evaluate(()=>Object.keys(EXPEDITION).map(k=>({name:k+' set persists across reload',ok:!!save.cosmeticUnlocks['exp_'+k]&&skinOwnedFull('exp_'+k)&&save.champions[k].cosmeticSkin==='exp_'+k}))));
 fs.writeFileSync('docs/expedition/cosmetics-results.json',JSON.stringify({checks:result.checks,errors},null,2));console.log(JSON.stringify({checks:result.checks.length,failed:result.checks.filter(c=>!c.ok),errors}));if(errors.length||result.checks.some(c=>!c.ok))process.exitCode=1;
 }finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
