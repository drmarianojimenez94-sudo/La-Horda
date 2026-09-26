"use strict";
window.__T = {
  _id:1, _byId:{},
  spawn:(t,champ)=>{ const e=spawnEnemy(t,false,!!champ); const id=window.__T._id++; e.__id=id; window.__T._byId[id]=e; return id; },
  place:(i,dx,dy)=>{ const e=window.__T._byId[i]; e.x=player.x+dx; e.y=player.y+dy; },
  tank:(i)=>{ const e=window.__T._byId[i]; e.hp=e.maxHp=1e7; },
  enemies:()=>enemies.map(e=>({type:e.type,x:e.x,y:e.y,r:e.radius,hp:e.hp,alive:e.alive,rank:e.rank})),
  startBoss:()=>startBossFight(),
  bossInfo:()=>boss?{type:boss.type,hp:boss.hp,max:boss.maxHp,alive:boss.alive,phase:boss.acuaticaPhase||boss.bossPhase,wind:!!boss.bossWind,x:boss.x,y:boss.y}:null,
  hitBoss:(f)=>{ if(boss&&boss.alive) damageEnemy(boss, boss.hp*(f||1)+1, {src:player}); },
  setLevel:(n)=>{ runLevel=n; },
  god:()=>{ for(const h of heroes){ h.maxHp=h.hp=1e9; } },
  stun:(i,ms)=>{ window.__T._byId[i].stunTimer=ms; },
  hit:(i,a)=>{ const e=window.__T._byId[i]; if(e&&e.alive) damageEnemy(e,a,{src:player}); },
  get:(i)=>{ const e=window.__T._byId[i]; return e?{x:e.x,y:e.y,r:e.radius,alive:e.alive,hp:e.hp}:null; },
  renderCheck:(n)=>{ const out=[]; const list=enemies.filter(e=>e.alive).slice(0,40);
    const before=list.map(e=>[e.x,e.y,e.radius]);
    for(let k=0;k<n;k++){ for(const e of list){ if(e.alive) damageEnemy(e,0.5,{src:player, forceCrit:k%3===0}); } animDt=16; render(); }
    let moved=0; list.forEach((e,i)=>{ if(e.x!==before[i][0]||e.y!==before[i][1]||e.radius!==before[i][2]) moved++; });
    return {checked:list.length, moved}; },
  itemGen:(type,rarity)=>{ const it=makeItem(type,rarity,player.classKey); return addItemToInventory(player.classKey,it); },
  itemDesigned:(id)=>{ const it=makeDesignedItem(id); return it ? addItemToInventory(player.classKey,it) : null; },
  designedIds:()=>Object.keys(DESIGNED_ITEMS),
  designedFor:()=>designedItemsFor(player.classKey).map(d=>({id:d.id,type:d.type,rarity:d.rarity,set:d.set})),
  equip:(uid)=>{ equipItem(player.classKey,uid); refreshEquippedStats(); },
  unequip:(type)=>{ unequipItem(player.classKey,type); refreshEquippedStats(); },
  sell:(uid)=>sellItem(player.classKey,uid),
  discard:(uid)=>discardItem(player.classKey,uid),
  fuse:(uids)=>fuseItems(player.classKey,uids),
  fusableGroups:()=>fusableGroups(player.classKey).map(g=>({type:g[0].type,rarity:g[0].rarity,n:g.length,uids:g.map(i=>i.uid)})),
  inv:()=>({len:stashItems().length, items:stashItems().map(it=>({uid:it.uid,type:it.type,rarity:it.rarity,set:it.set||null,skillOvercap:it.skillOvercap||null,designed:!!it.designed})), equipment:Object.assign({},save.champions[player.classKey].equipment)}),
  overcap:(skillKey)=>itemSkillOvercap(player.classKey, skillKey===undefined?0:skillKey),
  setProgress:(setId)=>setProgressFor(player.classKey,setId),
  gold:()=>save.gold,
  genReward:(score)=>generateReward(player.classKey, score),
  talentPointsAdd:(n)=>{ save.champions[player.classKey].talentPoints += n; },
  talentBuy:(id)=>buyTalentNode(player.classKey,id),
  talentTree:()=>(TALENT_TREES[player.classKey]?TALENT_TREES[player.classKey].nodes.map(n=>n.id):[]),
  nigroState:()=>({skeletons:(player.skeletons||[]).length, golem: player.golem?{hp:player.golem.hp,skin:player.golem.skin}:null,
    demonForm:player.nigroDemonForm, demonTimer:player.nigroDemonTimer, energy:Math.round(player.energy!==undefined?player.energy:-1),
    cds: player.cds ? player.cds.map(c=>Math.round(c)) : null, ultCd: Math.round(player.ultCd||0)}),
  cursedEnemies:()=>enemies.filter(e=>e.alive&&e.cursed).map(e=>({type:e.type,curseTimer:Math.round(e.curseTimer),hp:Math.round(e.hp)})),
  forceCast:(idx)=>{ const sk=CLASSES[player.classKey].skills[idx]; castAbility(player, sk, false, idx); },
  forceUlt:()=>{ castAbility(player, CLASSES[player.classKey].ultimate, true, 3); },
  setEnergy:(n)=>{ player.energy=n; },
  setCds:(n)=>{ if(player.cds) player.cds=player.cds.map(()=>n); player.ultCd=n; },
  setDemonTimer:(ms)=>{ player.nigroDemonTimer = ms; },
  playerFacing:()=>({x:player.x,y:player.y,fx:player.fx,fy:player.fy}),
  lastPlagueRing:()=>{ const rs=particles.filter(p=>p.ring&&p.color==='#50e68c'); const r=rs[rs.length-1]; return r?{x:r.x,y:r.y,maxR:r.maxR}:null; },
  damagePlayer:(n)=>{ damageHero(player, n); },
  setDmgMult:(n)=>{ runStats.dmgMult=n; },
  diag:()=>({activeChampion: activeChampion?{type:activeChampion.type,hp:Math.round(activeChampion.hp),maxHp:activeChampion.maxHp,rank:activeChampion.rank,dmgTakenMult:activeChampion.dmgTakenMult}:null,
    bossActive, runLevel, playerStun: player.stunTimer, playerAlive: player.alive, spawnTimer: (typeof spawnTimer!=='undefined'?spawnTimer:null),
    heroesAlive: heroes.map(h=>({cls:h.classKey,alive:h.alive,stun:h.stunTimer})) }),
  restartRun:()=>{ startRun(1); },
  ev:(code)=>eval(code),
  killAll:()=>{ for(const e of enemies.slice()) if(e.alive && e!==boss){ e.hp=0; killEnemy(e);} },
  stats:()=>({enemies:enemies.length, particles:particles.length, vfx:vCount, dying:vfxDyingN, load:+vfxLoad.toFixed(2), crowd:animCrowd, shake:+screenShake.toFixed(1), teles:vfxTeles.filter(t=>t.on).length, sprites:vfxSprites.filter(t=>t.on).length,
    projectiles:projectiles.length, potions:potions.length, traps:traps.length, fireWalls:fireWalls.length, axiomZones:axiomZones.length, sylvaRain:sylvaRainZones.length,
    skeletonsTotal:heroes.reduce((s,h)=>s+((h.skeletons||[]).length),0), heap: performance.memory?Math.round(performance.memory.usedJSHeapSize/1048576):null }),
  player:()=>({x:player.x,y:player.y,hp:player.hp,alive:player.alive}),
  arena:()=>currentArena, state:()=>state,
};

window.__T.fnv = function(bytes){ let h = 0x811c9dc5; for (let i = 0; i < bytes.length; i++) { h ^= bytes[i]; h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16); };
window.__T.strHash = function(s){ let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16); };
window.__T._pixMemo = new WeakMap();
window.__T.pixHash = function(src){
  if (window.__T._pixMemo.has(src)) return window.__T._pixMemo.get(src);
  let out;
  try {
    const w = src.naturalWidth || src.width, h = src.naturalHeight || src.height;
    if (!w || !h) out = 'empty';
    else {
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const g = c.getContext('2d'); g.drawImage(src, 0, 0);
      out = w + 'x' + h + ':' + window.__T.fnv(g.getImageData(0, 0, w, h).data);
    }
  } catch (e) { out = 'err:' + e.name; }
  window.__T._pixMemo.set(src, out);
  return out;
};
window.__T.ser = function(v, path, seen, depth){
  const T = window.__T;
  if (v === null) return null;
  const t = typeof v;
  if (t === 'number') return Number.isFinite(v) ? v : String(v);
  if (t === 'string' || t === 'boolean') return v;
  if (t === 'undefined') return '@undef';
  if (t === 'bigint' || t === 'symbol') return '@' + t + ':' + String(v);
  if (t === 'function') return 'fn:' + (v.name || '') + ':' + T.strHash(Function.prototype.toString.call(v));
  if (seen.has(v)) return '@ref:' + seen.get(v);
  seen.set(v, path);
  if (typeof HTMLImageElement !== 'undefined' && v instanceof HTMLImageElement) return 'img:' + (v.complete ? T.pixHash(v) : 'loading');
  if (typeof HTMLCanvasElement !== 'undefined' && v instanceof HTMLCanvasElement) return 'canvas:' + T.pixHash(v);
  if (typeof OffscreenCanvas !== 'undefined' && v instanceof OffscreenCanvas) return 'offcanvas:' + v.width + 'x' + v.height;
  if (typeof CanvasRenderingContext2D !== 'undefined' && v instanceof CanvasRenderingContext2D) return 'ctx2d:' + (v.canvas && v.canvas.id);
  if (typeof Element !== 'undefined' && v instanceof Element) return 'dom:' + v.tagName + '#' + (v.id || '') + '.' + (typeof v.className === 'string' ? v.className : '');
  if (ArrayBuffer.isView(v)) return v.constructor.name + '[' + v.length + ']:' + T.fnv(new Uint8Array(v.buffer, v.byteOffset, v.byteLength));
  if (depth > 14) return '@deep';
  if (Array.isArray(v)) return v.map((x, i) => T.ser(x, path + '[' + i + ']', seen, depth + 1));
  if (v instanceof Map) return { '@map': Array.from(v.entries()).map(([k, x], i) => [T.ser(k, path + '<k' + i + '>', seen, depth + 1), T.ser(x, path + '<v' + i + '>', seen, depth + 1)]) };
  if (v instanceof Set) return { '@set': Array.from(v).map((x, i) => T.ser(x, path + '{' + i + '}', seen, depth + 1)) };
  if (v instanceof Promise) return '@promise';
  const proto = Object.getPrototypeOf(v);
  const cname = proto && proto !== Object.prototype && proto.constructor ? proto.constructor.name : null;
  if (cname && !['Object'].includes(cname) && /^(AudioContext|GainNode|OscillatorNode|BiquadFilterNode|AudioBufferSourceNode|DynamicsCompressorNode|DelayNode|ConvolverNode|AudioBuffer|WebKit)/.test(cname)) return '@' + cname;
  const o = {};
  if (cname) o['@class'] = cname;
  for (const k of Object.keys(v)) {
    let x; try { x = v[k]; } catch (e) { x = '@throws'; }
    o[k] = T.ser(x, path + '.' + k, seen, depth + 1);
  }
  return o;
};
window.__T.snapshot = function(names){
  const out = {}, seen = new Map();
  for (const n of names) {
    let v;
    try { v = window.__T.ev(n); } catch (e) { out[n] = '@unavailable:' + e.name; continue; }
    try { out[n] = window.__T.ser(v, n, seen, 0); } catch (e) { out[n] = '@serfail:' + e; }
  }
  return out;
};
window.__T.vendorSnapshot = function(){
  const seen = new Map(), out = {};
  for (const n of ['CadenaRelampagos', 'MuroFuego', 'CaballeritoHabilidades']) out[n] = window.__T.ser(globalThis[n], n, seen, 0);
  return out;
};
window.__T.canvasHash = function(){
  const c = canvas; const g = c.getContext('2d');
  return c.width + 'x' + c.height + ':' + window.__T.fnv(g.getImageData(0, 0, c.width, c.height).data);
};
window.__T.digest = function(){
  const r = x => (typeof x === 'number' ? (Number.isFinite(x) ? +x.toFixed(6) : String(x)) : x);
  const hs = (typeof heroes !== 'undefined' && heroes) ? heroes.map(h => [h.classKey, r(h.x), r(h.y), r(h.hp), r(h.maxHp), r(h.energy), !!h.alive, r(h.level || 0)]) : [];
  let ex = 0, ey = 0, ehp = 0; const types = {};
  for (const e of enemies) { ex += e.x; ey += e.y; ehp += e.hp; types[e.type] = (types[e.type] || 0) + (e.alive ? 1 : 0); }
  return {
    vt: window.__vt ? window.__vt() : null, rng: window.__rng.calls, state, runLevel, kills, levelTimer: r(levelTimer), spawnTimer: r(spawnTimer),
    heroes: hs, enemies: [enemies.length, r(ex), r(ey), r(ehp)], types,
    boss: boss ? [boss.type, r(boss.hp), !!boss.alive] : null,
    counts: [projectiles.length, particles.length, potions.length, traps.length, fireWalls.length, vCount, vfxSprites.filter(s => s.on).length, vfxDyingN],
    runStats: window.__T.strHash(JSON.stringify(runStats || null)),
    save: window.__T.strHash(JSON.stringify(save)),
    errs: window.__errors.length
  };
};
window.__T.setJoy = function(x, y){ joyVec = { x, y }; };
window.__T.startAs = function(cls, arena, level){ selectedClass = cls; currentArena = arena; divinaMode = false; startRun(level || 1); };
window.__T.startDivina = function(cls){ selectedClass = cls; startDivinaExploration(); };
