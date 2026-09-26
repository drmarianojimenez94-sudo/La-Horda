const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright');
const path = require('path'); const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ args:['--no-sandbox'] });
  const CASES = [["glaciar","mago"],["coloso","tanque"],["sepulturero","nigromante"],["sepulturero","guerrero"],["tempestad","axiom"],["berserker","segador"],["guardian","tanque"],["alba","soporte"],["cazador","cazadora"],["arcano","mago"],["laberinto","musashi"],["lucifer","guerrero"]];
  for(const [setId, cls] of CASES){
    const page = await (await browser.newContext()).newPage();
    const errors=[]; page.on('pageerror', e => errors.push(e.message+' '+(e.stack||'').split('\n')[1]));
    await page.goto((process.env.GAME_URL || 'http://127.0.0.1:8000/index.html'), { waitUntil:'load' });
    for(let i=0;i<300;i++){ const ok = await page.evaluate(()=>{ const b=document.getElementById('title-continue-btn'); return b && !b.disabled; }); if(ok) break; await sleep(100); }
    await page.addScriptTag({ path: path.join(__dirname, 'autopilot.js') });
    const r = await page.evaluate(([setId, cls])=>{
      for(const k in save.champions){ save.champions[k].level=25; }
      const champ = save.champions[cls]; save.stash = []; champ.equipment = mkEquipment();
      for(const pid of setPieceIds(setId)){ const it = makeDesignedItem(pid); addItemToInventory(cls, it); equipItem(cls, it.uid); }
      invalidatePassiveCache();
      __AP.start(cls, setId==="laberinto"?"laberinto":"bosque", 6);
      const log = {}; const t0 = runElapsedMs;
      const watch = ()=>{ const h = player; for(const k of ["_storm","_stormReady","_colossus","_oath","_alba","_albaReady","_berserkT","_arcaneT","_reso","_focus","_momentum","_guardDRT"]) if(h[k]) log[k] = Math.max(log[k]||0, typeof h[k]==="boolean"?1:Math.round(h[k])); log.eliteSk = Math.max(log.eliteSk||0, (h.skeletons||[]).filter(s=>s.elite).length); log.sk = Math.max(log.sk||0,(h.skeletons||[]).length); log.frag = Math.max(log.frag||0, ...enemies.map(e=>e._frag||0), 0); };
      if(setId==="berserker"){ player.hp = player.maxHp*0.5; }
      for(let i=0;i<40;i++){ __AP.sim(1500); watch(); if(setId==="berserker" && i===5){ player.hp = player.maxHp*0.35; damageHero(player, player.maxHp*0.08, null); watch(); } if(setId==="lucifer" && i===2) player.hp = player.maxHp*0.45; if(state!=="playing" && state!=="buff") break; }
      return {count:equippedSetCount(cls,setId), full:setFull(player,setId), bonuses:activeSetBonusEffects(cls).length, state, log};
    }, [setId, cls]);
    console.log(setId.padEnd(12), cls.padEnd(11), JSON.stringify(r), errors.slice(0,2).join(' | '));
    await page.context().close();
  }
  await browser.close();
})();
