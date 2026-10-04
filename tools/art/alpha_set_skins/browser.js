'use strict';
const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await b.newPage({viewport:{width:1024,height:620}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.SE_BASE_URL||'http://127.0.0.1:8805');
 await page.waitForFunction(()=>['skin_merienda_magica','skin_merienda_magica_berrinche','skin_santa_paciencia'].every(k=>CHAMP_PACK[k]?.ready)&&SET_SKINS.merienda_magica.preserveAuthoredArt);
 const checks=await page.evaluate(()=>{
  const results=[];let originalCtx=ctx;const c=document.createElement('canvas');c.width=200;c.height=200;ctx=c.getContext('2d');
  for(const [key,id,excluded]of [['myla','merienda_magica',17],['ynara','santa_paciencia',11]]){
   const def=SET_SKINS[id];results.push([key+' authored name retained',/Pastelera|Guardiana/.test(def.name)]);
   results.push([key+' true skin classification',cosmeticMetadata(id).type==='SKIN DE SET'&&!cosmeticMetadata(id).artPending]);
   for(const pack of Object.values(def.packs)){
    const P=CHAMP_PACK[pack];results.push([pack+' not procedural recolor',!P.cosmeticApplied&&!P.cromaOf]);
    const frames=[...new Set(Object.values(P.sets).flat().map(n=>n<0?~n:n))];
    results.push([pack+' excluded pose never referenced',!frames.includes(excluded)]);
    for(const frame of frames){ctx.clearRect(0,0,200,200);champPackDrawFrame(P,frame,100,170,1,false,1);results.push([pack+' frame '+frame+' renders',ctx.getImageData(0,0,200,200).data.some((v,i)=>i%4===3&&v)]);}
   }
   save.cosmeticUnlocks=Object.assign({},save.cosmeticUnlocks,{[id]:true});
   results.push([key+' old croma entitlement retained',cromaOwned(key==='myla'?'myla_arandanos':'ynara_celeste')]);
  }
  ctx=originalCtx;
  const overlay=document.createElement('div');overlay.id='skin-qa';overlay.style.cssText='position:fixed;inset:0;z-index:99999;background:#16100e;color:#ebdabd;display:grid;grid-template-columns:repeat(4,1fr);gap:10px;padding:18px;font:16px monospace';
  document.body.appendChild(overlay);
  for(const [key,id,croma]of [['myla','merienda_magica','myla_arandanos'],['ynara','santa_paciencia','ynara_celeste']]){
   for(const [label,k,skin]of [['MASTER','tanque',null],['ORIGINAL',key,null],['SKIN DE SET',key,id],['CROMA CONSERVADA',key,croma]]){
    const box=document.createElement('div');box.style.cssText='border:1px solid #775236;padding:5px;text-align:center;overflow:hidden';box.textContent=label+' · '+k;const cv=document.createElement('canvas');cv.width=220;cv.height=230;cv.style.cssText='width:100%;height:230px;image-rendering:pixelated';box.appendChild(cv);overlay.appendChild(box);codexPreview(cv,{kind:'champ',key:k,skin,anim:'walk',bg:'none'});
   }
  }
  return results;
 });
 await page.waitForTimeout(600);
 if(process.env.SKIN_QA_SCREENSHOT)await page.screenshot({path:process.env.SKIN_QA_SCREENSHOT});
 assert.ok(checks.every(x=>x[1]),JSON.stringify(checks.filter(x=>!x[1])));assert.deepEqual(errors,[]);console.log('PASS new skins browser: '+checks.length+' checks; real frame rendering, remap, original/croma coexistence');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
