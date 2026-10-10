// Shared real-engine protocol for the gate and diagnostic comparisons.
module.exports = async function runEntrySimulation(page, k, seed){
 return await page.evaluate(([k,seed])=>{
   let n=seed;Math.random=()=>{n=(1664525*n+1013904223)>>>0;return n/4294967296;};netMatch=null;save.stash=[];save.champions[k]||=mkChampion(false);save.relics={hp:0,dmg:0,def:0,vel:0};
   for(const c in save.champions){save.champions[c].unlocked=true;save.champions[c].level=20;save.champions[c].xp=0;save.champions[c].equipment={};save.champions[c].inventory=[];save.champions[c].talents={nodes:{},mastery:null,masteryNodes:{}};save.champions[c].skillMastery=[0,1,2].map(()=>({...mkMastery(),alloc:4}));save.champions[c].ultMastery={...mkMastery(),alloc:4};}
   lobbyAllies=['tanque','soporte','mago'].map(c=>c===k?'guerrero':c);__AP.start(k,'bosque',1);__AP.sim(150000,33.333);__AP.on=false;
   const out={key:k,seed,damage:player.stats.dmgDealt,alive:player.alive,hp:player.hp,casts:player.stats.skillCasts,error:__AP.err||null};setState('paused');return out;
  },[k,seed]);
};
