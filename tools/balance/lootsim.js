// Monte Carlo del botín con el código real del juego (rollLoot). usage: node lootsim.js [N]
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const N = +(process.argv[2]||20000);
  const browser = await chromium.launch({ args:['--no-sandbox'] });
  const page = await (await browser.newContext()).newPage();
  await page.goto((process.env.GAME_URL || 'http://127.0.0.1:8000/index.html'), { waitUntil:'load' });
  await sleep(800);
  const res = await page.evaluate((N)=>{
    let seed = 12345; const rng = ()=>{ seed = (seed*1664525 + 1013904223) >>> 0; return seed/4294967296; };
    const ARENAS = ["bosque","acuatica","hielo","laberinto","infernal"], GRADES = ["C","B","A","S","S+"];
    const out = {perVictory:{}, farm:{}};
    // 1) por victoria (con protección activa, como en el juego)
    for(const a of ARENAS) for(const g of GRADES){
      let pity = {}, items = 0, cnt = {comun:0,raro:0,muyraro:0,legendario:0,set:0,mitico:0}, vLeg=0, vSet=0, vMit=0;
      for(let i=0;i<N;i++){
        const r = rollLoot({arena:a, grade:g, victory:true, subjefes:2, owned:new Set(), pity, rng});
        pity = r.pity; items += r.items.length;
        const has = {}; for(const it of r.items){ cnt[it.tier]++; has[it.tier]=1; }
        vLeg += has.legendario?1:0; vSet += has.set?1:0; vMit += has.mitico?1:0;
      }
      const pct = {}; for(const k in cnt) pct[k] = +(100*cnt[k]/items).toFixed(2);
      out.perVictory[a+"|"+g] = {itemsPerWin:+(items/N).toFixed(2), pct, pLeg:+(100*vLeg/N).toFixed(1), pSet:+(100*vSet/N).toFixed(1), pMit:+(100*vMit/N).toFixed(2)};
    }
    // 2) un jugador que "farmea" una arena: victorias hasta el 1er legendario/set/mítico y hasta completar
    //    su primer set (con reforja de repetidas). Grado típico A/S mezclado.
    const gradeMix = ()=>{ const x = rng(); return x<0.10?"B":(x<0.55?"A":(x<0.88?"S":"S+")); };
    for(const a of ARENAS){
      const RUNS = 1500, stats = {firstLeg:[], firstSet:[], firstMit:[], fullSet:[], fullTarget:[]};
      for(let r=0;r<RUNS;r++){
        let pity = {}, owned = new Set(), dupes = {}, v = 0, fl=0, fs=0, fm=0, full=0, target=0;
        const targetSet = Object.entries(SET_ARENA_WEIGHTS[a]).sort((x,y)=>y[1]-x[1])[0][0];
        while(v < 3000 && (!full || !target || !fl || !fs || !fm)){
          v++;
          const res = rollLoot({arena:a, grade:gradeMix(), victory:true, subjefes:2, owned:new Set(owned), pity, rng});
          pity = res.pity;
          for(const it of res.items){
            if(it.tier==="legendario" && !fl) fl=v;
            if(it.tier==="mitico" && !fm) fm=v;
            if(it.tier==="set"){ if(!fs) fs=v; if(owned.has(it.designId)) dupes[it.setId]=(dupes[it.setId]||0)+1; owned.add(it.designId); }
          }
          // reforja: 2 repetidas -> 1 faltante
          for(const sid in dupes){ while(dupes[sid]>=2){ const miss = setPieceIds(sid).filter(p=>!owned.has(p)); if(!miss.length) break; dupes[sid]-=2; owned.add(miss[0]); } }
          const complete = sid => setPieceIds(sid).every(p=>owned.has(p));
          if(!full && Object.keys(SET_DB).some(complete)) full = v;
          if(!target && complete(targetSet)) target = v;
        }
        stats.firstLeg.push(fl||3000); stats.firstSet.push(fs||3000); stats.firstMit.push(fm||3000); stats.fullSet.push(full||3000); stats.fullTarget.push(target||3000);
      }
      const med = arr => { const s = arr.slice().sort((x,y)=>x-y); return s[Math.floor(s.length/2)]; };
      const p90 = arr => { const s = arr.slice().sort((x,y)=>x-y); return s[Math.floor(s.length*0.9)]; };
      out.farm[a] = {}; for(const k in stats) out.farm[a][k] = {median:med(stats[k]), p90:p90(stats[k])};
      out.farm[a].targetSet = Object.entries(SET_ARENA_WEIGHTS[a]).sort((x,y)=>y[1]-x[1])[0][0];
    }
    return out;
  }, N);
  console.log(JSON.stringify(res));
  await browser.close();
})();
