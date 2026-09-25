// usage: node perfsim.js <cls,cls,..> <arena> <champLevel>
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright');
const path = require('path'); const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const [clsList, arena, lvl] = [process.argv[2].split(','), process.argv[3], +process.argv[4]];
  const browser = await chromium.launch({ args:['--no-sandbox'] });
  for(const cls of clsList){
    const page = await (await browser.newContext({viewport:{width:844,height:390}})).newPage();
    const errors=[]; page.on('pageerror', e => errors.push(e.message));
    await page.goto((process.env.GAME_URL || 'http://127.0.0.1:8000/index.html'), { waitUntil:'load' });
    for(let i=0;i<300;i++){ const ok = await page.evaluate(()=>{ const b=document.getElementById('title-continue-btn'); return b && !b.disabled; }); if(ok) break; await sleep(100); }
    await page.addScriptTag({ path: path.join(__dirname, 'autopilot.js') });
    const r = await page.evaluate(([c,a,l])=>{
      for(const k in save.champions){ save.champions[k].level=l; const al=Math.min(10,Math.floor(l/4)); save.champions[k].skillMastery.forEach(m=>m.alloc=al); save.champions[k].ultMastery.alloc=al; }
      __AP.start(c,a,1);
      let perfs = null; const orig = window.computePerformance;
      for(let i=0;i<150;i++){ const o = __AP.sim(5000); if(!perfs && (state==='victory'||state==='gameover'||runEnding)) {} if(o.state!=='playing' && o.state!=='buff') break; }
      perfs = heroes.map(h=>{ const p = computePerformance(h); return {cls:h.classKey, role:p.role, score:p.score, grade:p.grade, parts:p.parts.map(x=>Math.round(x.value*100)).join('/')}; });
      return {state, runLevel, perfs, vic: victoryData ? {grade:victoryData.perf.grade, loot:victoryData.rewards.map(it=>itemTier(it))} : null};
    }, [cls, arena, lvl]);
    console.log(JSON.stringify({cls, arena, ...r, errors:errors.slice(0,2)}));
    await page.context().close();
  }
  await browser.close();
})();
