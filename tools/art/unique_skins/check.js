// Real-renderer regression: legacy ownership, own metadata, every facing/state, auxiliary forms.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs=require('fs'),path=require('path');
const OUT=process.env.SKIN_AUDIT_OUT || '/tmp/horda-skins/check';
(async()=>{
 fs.mkdirSync(OUT,{recursive:true});
 const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH,args:['--no-sandbox']});
 try {
  const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.SE_BASE_URL || 'http://127.0.0.1:8788');
  await page.waitForFunction(()=>typeof cosmeticCatalog==='function'&&typeof makeHero==='function');
  await page.evaluate(()=>cromaLoadAll());
  await page.waitForFunction(()=>Object.values(CROMA_SKINS).every(d=>d._built&&Object.values(d.packs).every(k=>CHAMP_PACK[k]?.ready)));
  const result=await page.evaluate(()=>{
   const checks=[],check=(name,ok)=>checks.push({name,ok:!!ok});
   check('32 catalog entries',cosmeticCatalog().length===32);
   check('13 independent authored designs',Object.values(CROMA_SKINS).filter(d=>d.appearanceType==='skin').length===13);
   check('all set skins retain source art',Object.values(SET_SKINS).every(d=>Object.values(d.packs).every(k=>!CHAMP_PACK[k].cosmeticApplied)));
   selectedClass='tanque';currentArena='bosque';startRun(1);state='paused';
   const cv=document.createElement('canvas');cv.width=1050;cv.height=Object.keys(CROMA_SKINS).length*140;const g=cv.getContext('2d');g.fillStyle='#242732';g.fillRect(0,0,cv.width,cv.height);
   const originalCtx=ctx,now=animNow;
   const audit=[];let row=0;
   for(const [id,d] of Object.entries(CROMA_SKINS)){
    const h=makeHero(d.champ,true,0,0);h._codexSkin=id;
    check(id+' classified as skin',cosmeticMetadata(id).type==='SKIN'&&cosmeticAppearanceKind(id)==='skin');
    check(id+' uses authored body',setSkinPackKey(h,d.champ)===d.packs[d.champ]);
    for(const [base,key] of Object.entries(d.packs)){
     const P=CHAMP_PACK[key];check(key+' independent metadata',!P.cromaOf&&P.ready&&P.atlas.src.includes('/skins/'));
     const p=document.createElement('canvas');p.width=P.atlas.naturalWidth;p.height=P.atlas.naturalHeight;const q=p.getContext('2d',{willReadFrequently:true});q.drawImage(P.atlas,0,0);
     const pixels=q.getImageData(0,0,p.width,p.height).data;check(key+' binary alpha',pixels.every((v,i)=>i%4!==3||v===0||v===255));
     for(const [name,arr] of Object.entries(P.sets))for(const raw of arr){
      const n=raw<0?~raw:raw,x=n%P.cols*P.fw,y=Math.floor(n/P.cols)*P.fh;
      check(key+' '+name+' '+n+' nonempty',y+P.fh<=p.height&&x+P.fw<=p.width&&q.getImageData(x,y,P.fw,P.fh).data.some((v,i)=>i%4===3&&v===255));
     }
     if(base===d.champ){
      for(const st of ['idle','walk','attack','cast','hit','death'])for(const [dir,left] of [['down',false],['side',false],['side',true],['up',false]]){
       const pick=champPackSet(P,st,dir,{_pleft:left});check(id+' '+st+' '+dir+' '+left,!!pick&&pick.arr.length>0);
      }
      const r=champPackSet(P,'walk','side',{_pleft:false}),l=champPackSet(P,'walk','side',{_pleft:true});check(id+' left mirrors right',((r.arr[0]<0)!==r.flip)!==((l.arr[0]<0)!==l.flip));
     }
    }
    g.fillStyle='#fff';g.font='13px monospace';g.fillText(id,8,row*140+17);
    const samples=[['Original','down','idle',null],['Frente','down','idle',id],['Perfil','side','walk',id],['Izquierda','side','left',id],['Espalda','up','walk',id],['Ataque','down','attack',id],['Cast','side','cast',id],['Caída','down','death',id]];
    samples.forEach(([label,dir,st,skin],i)=>{
     const hero=makeHero(d.champ,true,0,0);hero._codexSkin=skin;hero.fx=dir==='side'?(st==='left'?-1:1):0;hero.fy=dir==='up'?-1:dir==='down'?1:0;hero._pdir=dir;hero._pleft=st==='left';hero.alive=true;hero.moving=st==='walk'||st==='left';hero.animT=140;hero.attackAnim=st==='attack'||st==='cast'?160:0;hero._aDur=300;hero._aPrev=160;hero._packCastUntil=st==='cast'?Infinity:0;animNow=10000;
     const cc=document.createElement('canvas');cc.width=120;cc.height=112;const gg=cc.getContext('2d');gg.translate(60,105);gg.scale(1.25,1.25);gg.imageSmoothingEnabled=false;ctx=gg;
     if(st==='death'){hero._deadAt=9700;drawFallenHero(hero);}else drawHeroBody(hero,hero.scale,false,false);
     check(id+' rendered '+label,gg.getImageData(0,0,120,112).data.some((v,j)=>j%4===3&&v>0));ctx=originalCtx;
     g.drawImage(cc,i*130,row*140+22);g.fillStyle='#abb6c9';g.font='11px monospace';g.fillText(label,i*130+32,row*140+136);
    });
    // Existing purchase/equip IDs remain valid; cosmetic action must not alter equipment.
    state='paused';const saved=JSON.stringify(save.champions[d.champ]);save.champions[d.champ].unlocked=true;save.cromas[id]=true;
    const equipment=JSON.stringify(save.champions[d.champ].equipment),gold=save.gold;
    check(id+' equip with legacy ownership',cromaEquip(d.champ,id)&&cromaEquippedId(d.champ)===id);
    check(id+' preserves gold/equipment',save.gold===gold&&JSON.stringify(save.champions[d.champ].equipment)===equipment);
    const loadout=netBuildLoadout(d.champ), remote=netLoadoutRecord(loadout);
    check(id+' remote loadout keeps appearance',loadout.croma===id&&loadout.skin===id&&remote.croma===id);
    const foreign=netLoadoutRecord({...loadout,croma:'no_existe',skin:'no_existe'});check(id+' rejects invalid remote ID',!foreign.croma);
    const plain=makeHero(d.champ,true,0,0);cromaEquip(d.champ,null);const baseHero=makeHero(d.champ,true,0,0);
    check(id+' same gameplay stats',['maxHp','dmg','def','speed','maxEnergy','radius'].every(k=>plain[k]===baseHero[k]));
    save.champions[d.champ]=JSON.parse(saved);
    audit.push({id,name:d.name,theme:d.visualTheme,packs:d.packs});row++;
   }
   ctx=originalCtx;animNow=now;
   return {checks,audit,png:cv.toDataURL('image/png'),catalog:cosmeticCatalog()};
  });
  fs.writeFileSync(path.join(OUT,'roster.png'),Buffer.from(result.png.split(',')[1],'base64'));delete result.png;
  result.errors=errors;fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(result,null,2));
  const failed=result.checks.filter(c=>!c.ok);console.log(JSON.stringify({checks:result.checks.length,failed,errors,output:OUT},null,2));if(failed.length||errors.length)process.exitCode=1;
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
