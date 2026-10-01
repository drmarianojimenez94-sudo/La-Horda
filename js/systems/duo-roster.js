"use strict";
// A hero slot keeps its identity across both cards, including network references.
function duoEnabled(){ return !divinaMode; }
function duoKeys(){ return [selectedClass, save.duoReserve]; }
function duoValid(){ const [a,b]=duoKeys(); return a!==b && !!(CLASSES[a]&&CLASSES[b]&&save.champions[a].unlocked&&save.champions[b].unlocked); }
function duoPending(h){ return duoEnabled() && !!(h && h._duoReserve && !h._duoUsed); }
let duoProgress = {};
function duoInitRun(){
  duoProgress={};
  for(const k of duoKeys()) if(CLASSES[k]) duoProgress[k]=totalXpForChamp(k);
  const taken=new Set(heroes.map(h=>h.classKey));
  if(netMatch) for(const s of netMatch.slots) if(s.reserve) taken.add(s.reserve);
  if(save.duoReserve) taken.add(save.duoReserve);
  heroes.forEach((h,i)=>{
    const slot=netMatch && netMatch.slots[i];
    let key=slot ? slot.reserve : (h===player ? save.duoReserve : null);
    if(!key && h.isBot){ const pool=Object.keys(CLASSES).filter(k=>!taken.has(k)); key=pool.find(k=>CLASSES[k].roleCategory===h.cls.roleCategory)||pool[0]; }
    if(key===h.classKey || !CLASSES[key]) key=null;
    if(key) taken.add(key);
    h._duoStart=h.classKey; h._duoReserve=key; h._duoUsed=false; h._duoSpawn={x:h.x,y:h.y};
  });
}
function duoRestoreLead(){
  if(player && CLASSES[player._duoStart]){ selectedClass=player._duoStart; netRememberChamp(selectedClass); if(netInRoom()) netSend({t:"update",champ:selectedClass}); }
}
function duoHandoff(h){
  const key=h._duoReserve; if(!duoPending(h)) return false;
  const old=h.classKey;
  if(h.duelActive) exitLastDuel(h,"lose");
  for(const a of heroes){ if(a.ascensionFusedWith===h){ a.ascensionFusedWith=null; a.ascensionTimer=0; } if(h.ascensionFusedWith===a) a.fused=false; }
  if(axiomFreezeCaster===h){ axiomFreezeTimer=0; axiomFreezeCaster=null; }
  // Turrets, delayed cuts and spell zones must not keep acting with the new kit.
  for(const arr of [portadorObjects,champFx,projectiles,fireWalls,traps,axiomZones,sylvaRainZones,musashiSecondCuts]){
    for(let i=arr.length-1;i>=0;i--) if(arr[i].owner===h||arr[i].src===h||arr[i].caster===h) arr.splice(i,1);
  }
  const anchor=heroes.find(a=>a!==h&&a.alive)||h._duoSpawn;
  const kept={}; for(const k of ["stats","_net","_netSlot","isRemote","netName","_duoStart","_duoReserve","_duoSpawn","_res"]) kept[k]=h[k];
  const create=()=>makeHero(key,h.isBot,anchor.x,anchor.y);
  const fresh=h.isRemote?netWithHero(h,create):create();
  for(const k of Object.keys(h)) delete h[k];
  Object.assign(h,fresh,kept,{_duoUsed:true,invulnTimer:2500});
  resetSetRunState(h); clampToArena(h); resolveWallCollision(h);
  const rs=h.isRemote?h._net.runStats:runStats;
  if(h===player || h.isRemote){
  rs.critChance+=passiveSum(key,"crit_chance_add")-passiveSum(old,"crit_chance_add");
  rs.critMult+=passiveSum(key,"crit_mult_add")-passiveSum(old,"crit_mult_add");
  }
  if(h._net){ h._net.in=null; h._net.basic=false; h._net.posAuth++; }
  if(netIsHost()){ netMatch.slots[h._netSlot].champ=key; netMatch.lastH[h._netSlot]={}; netMatch.lastKeyAt=0; }
  if(h===player){ selectedClass=key; runStartXp=duoProgress[key]??totalXpForChamp(key); updateAbilityButtons(); resetSkillLevelUI(); joyVec={x:0,y:0}; showBanner(`${h.cls.name} entra · última carta`); }
  return true;
}
function duoUpdate(){ if(!duoEnabled()) return; for(const h of heroes) if(!h.alive&&duoPending(h)) duoHandoff(h); }
function duoChoose(index,key){
  if(!CLASSES[key] || !save.champions[key]) return;
  if(!save.champions[key].unlocked){ if(index!==1||save.duoGiftClaimed) return; save.champions[key].unlocked=true; save.duoGiftClaimed=true; }
  if(index===0){ const old=selectedClass; selectedClass=key; if(save.duoReserve===key) save.duoReserve=old; netRememberChamp(key); if(netInRoom()) netSend({t:"update",champ:key}); }
  else save.duoReserve=key;
  lobbyAllies=pickLobbyAllies(selectedClass); persist();
  if(netInRoom()){ netSend({t:"update",ready:false}); if(net.role==="guest") netSendLoadout(true); }
  renderPrepSummary();
}
function renderDuoPicker(){
  const box=document.getElementById("duo-picker"); if(!box) return;
  const keys=duoKeys();
  box.innerHTML=`<h3>Tus dos héroes</h3><p>Al caer el primero entra el segundo automáticamente. Dos caídas y quedás fuera.</p><div class="duo-cards">${keys.map((key,i)=>`<article class="duo-card"><b>${i?"2 · Reserva":"1 · Inicial"}</b>${CLASSES[key]?`<canvas class="champ-anim" width="104" height="104" data-class-key="${key}" data-idle="1"></canvas><strong>${guideEsc(CLASSES[key].name)}</strong><small>${guideEsc(CLASSES[key].role)}</small><details><summary>Ver habilidades</summary>${championGuideHTML(key)}</details>`:'<strong>Elegí tu reserva</strong>'}<label>${i?"Cambiar reserva":"Cambiar inicial"}<select data-duo="${i}"><option value="">Elegir héroe…</option>${Object.keys(CLASSES).filter(k=>(save.champions[k].unlocked || (i===1&&!save.duoGiftClaimed))&&k!==keys[1-i]).map(k=>`<option value="${k}">${guideEsc(CLASSES[k].name)}${save.champions[k].unlocked?"":" · regalo"}</option>`).join("")}</select></label></article>`).join("")}</div>${duoValid()?"":"<p>Elegí dos héroes distintos para empezar. Tu primera reserva bloqueada es gratis.</p>"}`;
  box.querySelectorAll("[data-duo]").forEach(el=>el.onchange=()=>duoChoose(+el.dataset.duo,el.value)); startChampAnimLoop();
}
function duoHud(){
  let el=document.getElementById("duo-hud"); if(!el){el=document.createElement("div");el.id="duo-hud";document.body.appendChild(el);}
  el.hidden=!(state==="playing"&&duoEnabled()&&player&&player._duoReserve);
  if(!el.hidden) el.textContent=player._duoUsed ? "2/2 · Último héroe" : `1/2 · Reserva: ${CLASSES[player._duoReserve].name}`;
}
