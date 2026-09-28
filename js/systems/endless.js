"use strict";
/* ============================================================
   js/systems/endless.js
   LA HORDA INFINITA — supervivencia por rondas (datos y balance: js/data/endless.js).
   Reusa TODO lo que ya existe: las diez arenas con sus mapas, roster, élites, subjefes, jefes y
   reglas; el refuerzo entre niveles; el botín (rarezas, familias por arena, protección contra la
   mala suerte); las acciones contextuales (rescates) y la red host-autoritativa.
   Cómo se engancha (una línea en cada lugar, siempre con `endlessOn()`):
     startRun (run.js)            -> endlessOnRunStart: nivel del tramo
     beginLevel (waves.js)        -> endlessBeginLevel: duración, cartel "RONDA N", rescate
     beginLevelClear (waves.js)   -> endlessOnRoundClear: puntaje, cofre de jefe
     scaleBossStats (waves.js)    -> endlessScaleBoss
     spawnEnemy (spawning.js)     -> endlessOnSpawn: curva sin techo + economía del modo
     update (update.js)           -> endlessUpdate / ritmo / grupos / endlessHoldLevel
     killEnemy (combat.js)        -> endlessOnKill: puntaje
     finishBossVictory (run.js)   -> endlessBossDown: el jefe cae y la ronda se cierra (sin victoria de campaña)
     openBuffChoice / red         -> refuerzos del modo con SINERGIAS
     showGameOverScreen           -> endlessEndRun: resultados, récords, botín final
   Cooperativo: el anfitrión decide rondas, arena, mutadores y rescates; los invitados reciben el
   estado por NET_GLOBALS.endless (mismo canal de snapshots) y cada uno cobra SU botín en su guardado.
   Estadísticas para logros (T6): window 'horda-stat' {k, v} (endless_start, endless_round,
   endless_boss, endless_rescue, endless_synergy, endless_score, endless_end).
   ============================================================ */
let endlessActive = false;   // la partida en curso es de la Horda Infinita
let endlessPending = false;  // se eligió el modo: la Sala arranca una partida infinita
let endlessRescues = [];     // objetivos de rescate (acción contextual) — viajan por red
function endlessOn(){ return endlessActive; }
// Bandera global para otros sistemas (p.ej. la narrativa: sin Crónicas/actos de campaña en este modo).
try{ Object.defineProperty(window, "endlessMode", {get:()=>endlessActive, configurable:true}); }catch(e){}

// Estado de la partida (lo decide el anfitrión; lo que ve el invitado llega por la red).
const EN = {
  id:0, round:1, score:0, mutators:[], week:"", arenas:[], stintArena:null, stintKind:"sub", baseLevel:1,
  bossKills:0, rescues:0, rescueFails:0, ended:false, rng:null, rescueAt:-1, rescueSeq:0, prevArena:null,
  endReason:"", synergies:0,
  local:null // lo propio de ESTE jugador (botín, oro y XP ganados): no viaja
};

/* ---------------- utilidades ---------------- */
function _enMulberry(seed){ let a = seed>>>0; return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a>>>15, 1 | a); t = t + Math.imul(t ^ t>>>7, 61 | t) ^ t; return ((t ^ t>>>14)>>>0)/4294967296; }; }
function _enHash(str){ let h = 2166136261; for(let i=0;i<str.length;i++){ h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h>>>0; }
// Semana ISO (UTC) de una fecha: "2026-W40".
function endlessWeekKey(date){
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7; d.setUTCDate(d.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const wk = Math.ceil(((d - y0)/86400000 + 1)/7);
  return d.getUTCFullYear() + "-W" + String(wk).padStart(2, "0");
}
// Mutadores de la semana: 2 distintos, determinísticos (todos juegan la misma semana).
function endlessWeeklyMutators(date){
  const key = endlessWeekKey(date || new Date());
  const rng = _enMulberry(_enHash("horda-infinita/" + key));
  const ids = ENDLESS_MUTATOR_IDS.slice(), out = [];
  while(out.length < 2 && ids.length) out.push(ids.splice((rng()*ids.length)|0, 1)[0]);
  return {key, ids:out};
}
function endlessHas(m){ return EN.mutators.indexOf(m) >= 0; }
function endlessScoreMult(){ let k = 1; for(const m of EN.mutators) k *= (ENDLESS_MUTATORS[m]||{}).scoreMult || 1; return k; }
function endlessStat(k, v){ try{ window.dispatchEvent(new CustomEvent("horda-stat", {detail:{k, v}})); }catch(e){} }
function endlessSave(){
  if(!save.endless || typeof save.endless!=="object") save.endless = {};
  const S = save.endless;
  S.runs = S.runs||0; S.best = S.best || {score:0, round:0}; S.byGuardian = S.byGuardian || {}; S.week = S.week || {key:"", score:0, round:0};
  return S;
}
function endlessUnlocked(){
  if(typeof PLAYTEST_UNLOCK_ALL!=="undefined" && PLAYTEST_UNLOCK_ALL) return true;
  return !!(save && save.arenasCleared && save.arenasCleared[ENDLESS_CFG.unlockArena]);
}
// para el hub (js/ui/hub.js): cómo se abre el modo mientras está con candado
function endlessLockText(){ return "Completá la Arena 02 (Fábrica Sin Fin) para desbloquearla."; }
function _enTotalXp(k){ const c = save.champions[k]; if(!c) return 0; let t = c.xp||0; for(let l=1;l<c.level;l++) t += xpToNext(l); return t; }
function endlessRoundMinutes(){ return (runElapsedMs||0)/60000; }
function endlessIsBossRound(r){ return ((r||EN.round) - 1) % ENDLESS_CFG.roundsPerArena === ENDLESS_CFG.roundsPerArena - 1; }

/* ---------------- tramos y arenas ("la Cicatriz te lleva") ---------------- */
function endlessPlanStint(k){
  const kind = (k % 2 === 1) ? "boss" : "sub";
  const hi = Math.min(CAMPAIGN_ORDER.length - 1, 1 + 2*k);
  let pool = CAMPAIGN_ORDER.slice(0, hi + 1).filter(a=>ARENA_MODS[a] && !ARENA_MODS[a].comingSoon);
  if(kind==="boss"){ const bp = pool.filter(a=>ENDLESS_BOSS_ARENAS.indexOf(a) >= 0); pool = bp.length ? bp : ENDLESS_BOSS_ARENAS.slice(); }
  if(pool.length > 1 && EN.prevArena) pool = pool.filter(a=>a!==EN.prevArena);
  let tot = 0; const w = pool.map(a=>{ const v = EN.arenas.indexOf(a) >= 0 ? 1 : 3; tot += v; return v; });
  let r = EN.rng()*tot, pick = pool[0];
  for(let i=0;i<pool.length;i++){ r -= w[i]; if(r <= 0){ pick = pool[i]; break; } }
  EN.stintArena = pick; EN.stintKind = kind;
  EN.baseLevel = kind==="boss" ? LEVEL_COUNT - (ENDLESS_CFG.roundsPerArena - 1) : Math.max(1, (ENDLESS_SUB_LEVEL[pick]||6) - (ENDLESS_CFG.roundsPerArena - 1));
  EN.arenas.push(pick);
  return pick;
}
function endlessLevelForRound(r){ return EN.baseLevel + ((r - 1) % ENDLESS_CFG.roundsPerArena); }

/* ---------------- arranque ---------------- */
// Prepara el estado del modo (antes de startRun / netHostStartGame): mutadores, primera arena.
function endlessBeginRun(){
  const wk = endlessWeeklyMutators(new Date());
  EN.id = ((Math.random()*1e9)|0) + 1;
  EN.rng = _enMulberry(EN.id ^ 0x9e3779b9);
  EN.round = 1; EN.score = 0; EN.mutators = wk.ids.slice(); EN.week = wk.key; EN.arenas = [];
  EN.bossKills = 0; EN.rescues = 0; EN.rescueFails = 0; EN.ended = false; EN.rescueAt = -1; EN.prevArena = null; EN.endReason = ""; EN.synergies = 0;
  if(EN.returnArena===undefined || !endlessActive) EN.returnArena = currentArena;
  endlessRescues = [];
  endlessActive = true;
  currentArena = endlessPlanStint(0);
  endlessLocalReset();
  return currentArena;
}
function endlessLocalReset(){
  EN.local = {id:EN.id, cls:selectedClass, gold0:save.gold||0, xp0:_enTotalXp(selectedClass), lvl0:(save.champions[selectedClass]||{}).level||1,
    gems0:save.gems||0, loot:[], full:false, done:false};
}
// startRun(): justo después de armar runStats. Fija el nivel del tramo (la curva la pone la ronda).
function endlessOnRunStart(){
  runLevel = endlessLevelForRound(EN.round);
  if(!EN.local || EN.local.id!==EN.id) endlessLocalReset();
  endlessRescues = [];
  endlessStat("endless_start", EN.round);
  runLater(400, ()=>{ if(endlessOn()) endlessArenaCard(true); });
}
function endlessArenaCard(first){
  const A = ARENA_MODS[currentArena]||{};
  const muts = EN.mutators.map(m=>ENDLESS_MUTATORS[m].icon + " " + ENDLESS_MUTATORS[m].name).join(" · ");
  if(typeof arenaTitleCard==="function")
    arenaTitleCard(first ? "HORDA INFINITA" : "LA CICATRIZ TE LLEVA", `${A.icon||""} ${A.label||currentArena}`, first ? `Semana ${EN.week.split("-W")[1]} · ${muts}` : `Ronda ${EN.round} · ${EN.stintKind==="boss" ? "el jefe de la arena espera" : "contené a la Horda"}`, 3600);
}

/* ---------------- rondas ---------------- */
function endlessRoundDuration(r){
  const C = ENDLESS_CFG;
  return Math.round(Math.min(C.roundMsMax, C.roundMs + C.roundMsPerRound*Math.min(r, 12)) * (endlessHas("dense") ? 0.8 : 1));
}
// beginLevel(): después del cartel de nivel (lo reemplaza).
function endlessBeginLevel(){
  levelDuration = endlessRoundDuration(EN.round);
  const boss = endlessIsBossRound();
  showBanner(boss ? (EN.stintKind==="boss" ? `RONDA ${EN.round} — EL JEFE DE LA ARENA` : `RONDA ${EN.round} — SUBJEFE`) : `RONDA ${EN.round}`);
  // rescate de esta ronda (no en la de jefe: ahí se pelea)
  const chance = endlessHas("rifts") ? 1 : ENDLESS_CFG.rescueChance;
  EN.rescueAt = (!boss && EN.round >= 2 && !netIsGuest() && EN.rng() < chance) ? levelDuration*(0.2 + EN.rng()*0.35) : -1;
  endlessRescues = endlessRescues.filter(t=>!t.done && t.t > 0);
}
function endlessHoldLevel(){
  if(!endlessIsBossRound()) return false;
  if(runLevel===LEVEL_COUNT) return false; // ronda de jefe: al terminar el tiempo sale el jefe (startBossFight)
  return enemies.some(e=>e.alive && (e.rank==="subjefe" || e.rank==="jefe"));
}
// beginLevelClear(): la ronda quedó contenida.
function endlessOnRoundClear(){
  const C = ENDLESS_CFG.score;
  const pts = Math.round(C.roundClear * EN.round * endlessScoreMult());
  EN.score += pts;
  endlessStat("endless_round", EN.round);
  if(endlessIsBossRound()){
    EN.bossKills++;
    endlessStat("endless_boss", EN.round);
    if(ENDLESS_CFG.chestEveryBoss){ const kind = EN.stintKind==="boss" ? "boss" : "sub"; runLater(900, ()=> endlessAwardChest(kind)); }
  }
  endlessRescues = [];
}
// finishBossVictory(): el jefe de la arena cayó -> la ronda se cierra (no es una victoria de campaña).
function endlessBossDown(){
  bossActive = false;
  if(typeof setMusicMode==="function") setMusicMode("wave", runLevel);
  if(state==="playing" && !levelClearing && !runEnding) beginLevelClear();
}
// Después de elegir refuerzo: próxima ronda (y, cada 5, próxima arena).
function endlessAdvance(){
  EN.round++;
  if((EN.round - 1) % ENDLESS_CFG.roundsPerArena === 0){
    EN.prevArena = currentArena;
    const next = endlessPlanStint(Math.floor((EN.round - 1) / ENDLESS_CFG.roundsPerArena));
    endlessEnterArena(next);
    return;
  }
  runLevel = endlessLevelForRound(EN.round);
  beginLevel();
}
// Cambio de arena en plena partida: los héroes (con sus refuerzos, vida y objetos) pasan por la Cicatriz.
function endlessEnterArena(key){
  currentArena = key;
  runLevel = endlessLevelForRound(EN.round);
  resetRunTransients();
  runEnding = false; if(typeof _arenaExitDone!=="undefined") _arenaExitDone = false;
  arenaHazardTimer = 6000; screenShake = 0;
  const hudArenaEl = document.getElementById("hud-arena");
  if(hudArenaEl) hudArenaEl.textContent = (ARENA_MODS[currentArena]||{}).label || "";
  iceWalls.length = 0; bossStrikes.length = 0; if(typeof guardReset==="function") guardReset();
  enemies = []; projectiles = []; particles = []; potions = []; fireWalls = []; traps = []; chainFX = []; sparkFX = []; asesinoFx = []; axiomZones = []; sylvaRainZones = [];
  acuaFish = []; acuaBubbles = []; acuaBubbleTimer = 0; acuaCurrent = {active:false, dx:0, dy:0, timer:0};
  if(typeof vfxResetRun==="function") vfxResetRun();
  if(typeof resetMythicPowers==="function") resetMythicPowers();
  if(typeof resetEnemyRoles==="function") resetEnemyRoles();
  resetBreakables();
  hazardZones = []; arenaRuleTimer = 8000; resetArenaRule();
  bossHudHide();
  endlessRescues = [];
  heroes.forEach((h, i)=>{
    const ang = (i/heroes.length)*Math.PI*2 + Math.PI/4, d = i===0 ? 0 : 70;
    h.x = Math.cos(ang)*d; h.y = Math.sin(ang)*d;
    if(!h.alive){ h.alive = true; h.hp = Math.round(h.maxHp*0.5); h._reviveT = 0; h._reviveBy = null; }
    h.slowAmt = 0; h.slowTimer = 0; h.stunTimer = 0; h.burnTimer = 0; h.fused = false; h.abHang = null; h._ctxHold = null; h._ctxGoal = null;
  });
  setupRunDifficulty();
  if(floorPatterns[currentArena]){ floorPattern = floorPatterns[currentArena]; } else { buildFloorTile(); }
  if(netMatch) netWithSeed(netMatch.seed, ()=> buildArenaDecor()); else buildArenaDecor();
  embers = []; for(let i=0;i<60;i++) embers.push(spawnEmber());
  if(arenaHas("runStart")) arenaHook("runStart");
  beginLevel();
  runLater(300, ()=>{ if(endlessOn()) endlessArenaCard(false); });
  if(netIsHost()) netBroadcast(netStartMessage()); // los invitados arman la arena nueva (mismo mensaje que al empezar)
}

/* ---------------- dificultad sin techo ---------------- */
function endlessHpCurve(){ const C = ENDLESS_CFG; return (1 + C.hpPerRound*(EN.round-1)) * (1 + C.hpPerMin*endlessRoundMinutes()); }
function endlessDmgCurve(){ const C = ENDLESS_CFG; return (1 + C.dmgPerRound*(EN.round-1)) * (1 + C.dmgPerMin*endlessRoundMinutes()); }
function endlessBossHp(){ const C = ENDLESS_CFG; return Math.max(0.4, C.bossHpBase + C.bossHpPerRound*(EN.round-5)) * (endlessHas("furious") ? 1.3 : 1); }
function endlessBossDmg(){ const C = ENDLESS_CFG; return Math.max(0.6, C.bossDmgBase + C.bossDmgPerRound*(EN.round-5)) * (endlessHas("furious") ? 1.2 : 1); }
function _enStochRound(v){ const f = Math.floor(v); return f + (Math.random() < v - f ? 1 : 0); }
// spawnEnemy(): la ronda manda (se reemplaza el escalado por nivel del tramo) + economía del modo.
function endlessOnSpawn(e, atBoss, champion){
  const C = ENDLESS_CFG, rk = e.rank;
  if(rk==="jefe"){ /* scaleBossStats -> endlessScaleBoss */ }
  else if(rk==="subjefe"){
    e.hp = e.maxHp = Math.max(1, Math.round(e.maxHp*endlessBossHp()));
    e.dmg = Math.round(e.dmg*endlessBossDmg());
  } else {
    const lvlHp = 1 + (runLevel-1)*0.17, lvlDmg = 1 + (runLevel-1)*(arenaMods().enemyDmgPerWave||0);
    let hp = endlessHpCurve()/lvlHp;
    if(endlessHas("swarm")) hp *= 0.7;
    let alive = 0; for(const o of enemies) if(o.alive) alive++;
    if(alive > C.aliveCap) hp *= 1 + C.condenseHp; // la horda se condensa (tope de rendimiento, no de dificultad)
    e.hp = e.maxHp = Math.max(1, Math.round(e.maxHp*hp));
    e.dmg = Math.max(1, Math.round(e.dmg*endlessDmgCurve()/lvlDmg));
    if(endlessHas("fast_horde")) e.speed *= 1.22;
  }
  const grow = 1 + C.lootGrowthPerRound*(EN.round-1);
  e.gold = _enStochRound((e.gold||0)*C.goldMult*grow);
  e.xp = Math.max(0, Math.round((e.xp||0)*C.xpMult*grow));
}
function endlessScaleBoss(e){
  e.hp = e.maxHp = Math.max(1, Math.round(e.maxHp*endlessBossHp()));
  e.dmg = Math.round(e.dmg*endlessBossDmg());
}
function endlessSpawnIntervalMult(){
  const C = ENDLESS_CFG;
  let k = 1/(1 + C.spawnPerRound*(EN.round-1) + C.spawnPerMin*endlessRoundMinutes());
  if(endlessHas("fast_horde")) k *= 0.85;
  if(endlessHas("swarm")) k *= 0.7;
  if(endlessHas("dense")) k *= 0.85;
  return k;
}
function endlessExtraBurst(){
  let alive = 0; for(const o of enemies) if(o.alive) alive++;
  if(alive >= ENDLESS_CFG.aliveCap) return 0;
  return Math.floor((EN.round - 1)/ENDLESS_CFG.burstEvery) + (endlessHas("swarm") && EN.round >= 3 ? 1 : 0);
}
// Élites: probabilidad extra de rol que crece por ronda (asintótica, sin techo duro) y más a la vez.
function endlessRoleChance(base){
  const C = ENDLESS_CFG;
  const extra = C.eliteMax*(1 - Math.exp(-(EN.round-1)/C.eliteTau));
  return Math.min(0.95, (base + extra) * (endlessHas("elites_x2") ? 2 : 1));
}
function endlessRoleMaxBonus(){ return Math.floor(EN.round/5) + (endlessHas("elites_x2") ? 2 : 0); }
function endlessNoHeal(){ return endlessHas("no_potions"); }

/* ---------------- puntaje ---------------- */
function endlessOnKill(e){
  const C = ENDLESS_CFG.score;
  let p = C[e.rank] || C.comun;
  if(e.role) p += C.role;
  EN.score += Math.round(p * (1 + C.roundMult*(EN.round-1)) * endlessScoreMult());
}

/* ---------------- refuerzos con SINERGIAS ---------------- */
function endlessBuffPool(){
  return BUFF_POOL.filter(b=>ENDLESS_BUFF_EXCLUDE.indexOf(b.id) < 0 && !(b.id==="potion" && endlessHas("no_potions")));
}
// Pista de sinergia en la carta (para el jugador de ESTE cliente).
function endlessBuffHint(b){
  const tags = ENDLESS_BUFF_TAGS[b.id] || [];
  if(!tags.length || !player) return "";
  const have = player._enTags || {};
  return `<div class="en-syn-hint">` + tags.map(t=>{ const S = ENDLESS_SYNERGIES[t], n = have[t]||0; if(!S) return "";
    const next = n >= 2 ? `${S.name} II` : `${S.name}`;
    return `<span class="en-syn-chip ${n>=1?"hot":""}">${S.icon} ${next} ${Math.min(3, n+1)}/${n >= 2 ? 3 : 2}</span>`; }).join("") + `</div>`;
}
// El héroe h eligió el refuerzo id (runStats ya es el suyo: netWithHero en los invitados).
function endlessOnBuffPicked(h, id){
  if(!h) return;
  const tags = ENDLESS_BUFF_TAGS[id] || [];
  const T = h._enTags || (h._enTags = {});
  for(const t of tags){
    T[t] = (T[t]||0) + 1;
    const S = ENDLESS_SYNERGIES[t]; if(!S) continue;
    const n = T[t];
    if(n===2 || n===3){
      (n===2 ? S.a1 : S.a2)(runStats);
      EN.synergies++;
      showBanner(`¡SINERGIA ${n===3?"II":"I"}: ${S.name.toUpperCase()}! (${heroLabel(h)})`);
      floatText(h.x, h.y-50, `${S.icon} ${n===2 ? S.t1 : S.t2}`, "heal");
      endlessStat("endless_synergy", n);
    }
  }
  refreshEquippedStats();
}
function endlessOpenBuffChoice(){
  setState("buff");
  document.getElementById("buff-title").textContent = `Ronda ${EN.round} contenida — elegí un refuerzo`;
  const cards = document.getElementById("buff-cards");
  cards.innerHTML = "";
  // 2 genéricos con sus sinergias de la Horda + 1 refuerzo que transforma una habilidad del guardián
  // (el mismo pool de la campaña, js/data/boons.js: dura toda la corrida, igual que los genéricos)
  const opts = boonBuildOffers(player, endlessBuffPool(), true);
  opts.forEach(opt=>{
    const b = boonParseOpt(opt) ? null : BUFF_POOL.find(x=>x.id===opt);
    const el = document.createElement("div");
    el.className = buffOptClass(opt);
    el.innerHTML = buffOptHTML(opt, player, b ? endlessBuffHint(b) : "");
    el.addEventListener("click", ()=>{
      if(state!=="buff") return;
      buffApplyOpt(player, opt);
      if(b) endlessOnBuffPicked(player, b.id);
      if(netIsHost()){ cards.innerHTML = `<div class="net-wait">Elegiste <b>${buffOptName(opt)}</b>.</div>`; netHostPickedLocal(); return; }
      player.hp = Math.min(player.maxHp, player.hp + player.maxHp*ENDLESS_CFG.hpRefillOnRound);
      player.energy = player.maxEnergy;
      setState("playing");
      endlessAdvance();
    });
    cards.appendChild(el);
  });
  if(typeof buffOwnedRefresh==="function") buffOwnedRefresh(player);
  if(netIsHost()) netHostOpenBuffs();
}

/* ---------------- botín ---------------- */
// Un objeto del sistema de siempre: tabla de la arena actual, calificación según la ronda y (si
// usePity) la protección contra la mala suerte, que avanza como una victoria.
function endlessRollItem(grade, arena, usePity){
  if(typeof lootTierWeights!=="function" || !player) return null;
  const L = EN.local || {}; if(stashFull()){ L.full = true; return null; }
  save.lootPity = Object.assign({legendario:0, set:0, mitico:0, unico:0}, save.lootPity||{});
  const pity = usePity ? save.lootPity : null;
  const tier = _pick(lootTierWeights(arena, grade, pity, false), Math.random) || "comun";
  let spec = {tier};
  if(tier==="set"){ const sp = _rollSetPiece(arena, ownedDesignIds(), Math.random, selectedClass); spec = sp ? {tier, setId:sp.setId, designId:sp.designId, type:sp.type} : {tier:"legendario"}; }
  if(usePity) for(const t in LOOT_PITY) save.lootPity[t] = (t===spec.tier) ? 0 : (save.lootPity[t]||0) + 1;
  const it = materializeLoot(spec, selectedClass, arena);
  it.lootTier = spec.tier;
  addItemToInventory(selectedClass, it);
  if(L.loot) L.loot.push(it);
  persist();
  const tm = LOOT_TIER_META[itemTier(it)] || {};
  if(player) floatText(player.x, player.y-70, `${tm.label||""}: ${it.name}`, "heal");
  if(typeof playSfx==="function") playSfx(TIER_ORDER && TIER_ORDER[itemTier(it)] >= 3 ? "clear" : "ready");
  return it;
}
// Cofre de jefe/subjefe o de final: para ESTE jugador y (anfitrión) para cada invitado.
function endlessAwardChest(kind){
  const C = ENDLESS_CFG, grade = endlessGradeForRound(EN.round), arena = currentArena;
  // subjefe: a veces es un "cofre menor" (oro + gema) en vez de un objeto; el del jefe trae objeto seguro
  if(kind==="sub" && Math.random() >= C.subChestItemChance){
    const g = Math.round(C.minorChestGold + C.minorChestGoldPerRound*EN.round);
    heroes.forEach(h=>{ if(h===player) grantGold(g); else if(h.isRemote) netEmitTo(h._netSlot, "gold", [g]); });
    save.gems = (save.gems||0) + 1; persist();
    if(netIsHost()) netRecord("endlessGuestReward", [{k:"gem"}]);
    showBanner(`COFRE MENOR DE LA CICATRIZ: +${g} de oro y +1 gema`);
    return;
  }
  const it = endlessRollItem(grade, arena, true);
  showBanner(it ? `COFRE DE LA CICATRIZ: ${it.name}` : "COFRE DE LA CICATRIZ (inventario lleno)");
  if(netIsHost()) netRecord("endlessGuestReward", [{k:"item", grade, arena, pity:1, why:kind}]);
}
// Invitado: recompensa decidida por el anfitrión, cobrada en SU guardado.
function endlessGuestReward(r){
  if(!r || !netIsGuest()) return;
  if(r.k==="item") endlessRollItem(r.grade, r.arena, !!r.pity);
  else if(r.k==="gem"){ save.gems = (save.gems||0) + 1; persist(); }
}

/* ---------------- rescates: Cofre de la Cicatriz / Cristal corrupto ---------------- */
const EN_CORRUPT_PAL = {dark:"#3a0f2a", mid:"#b0306a", light:"#ff9ac8"};
function _enRescueSpot(){
  const alive = heroes.filter(h=>h.alive); const base = alive.length ? alive[(Math.random()*alive.length)|0] : player;
  const [d0, d1] = ENDLESS_CFG.rescueDist;
  for(let t=0;t<80;t++){
    const a = Math.random()*Math.PI*2, d = d0 + Math.random()*(d1-d0);
    const p = {x:base.x + Math.cos(a)*d, y:base.y + Math.sin(a)*d*0.8, radius:20};
    clampToArena(p); resolveWallCollision(p); clampToArena(p);
    if(typeof aidInside==="function" && !aidInside(p.x, p.y, 40)) continue;
    if(typeof aidBlocked==="function" && aidBlocked(p.x, p.y, 36)) continue;
    if(Math.hypot(p.x-base.x, p.y-base.y) < d0*0.6) continue;
    return p;
  }
  return null;
}
function endlessSpawnRescue(){
  const p = _enRescueSpot(); if(!p) return;
  const kind = (EN.rescueSeq % 2 === 0) ? "en_chest" : "en_crystal";
  const ms = Math.round(ENDLESS_CFG.rescueMs * (endlessHas("rifts") ? 0.7 : 1));
  endlessRescues.push({id:"enr" + (++EN.rescueSeq), kind, x:Math.round(p.x), y:Math.round(p.y), r:ENDLESS_CFG.rescueR, prog:0, dur:ENDLESS_CFG.rescueHoldMs, t:ms, tmax:ms, h:58});
  showBanner(kind==="en_chest" ? "¡UN COFRE DE LA CICATRIZ! Llegá antes que la Horda" : "¡UN CRISTAL CORRUPTO! Purificalo a tiempo");
  if(typeof playSfx==="function") playSfx("ready");
}
function endlessRescueDone(t, users){
  const r = EN.round, C = ENDLESS_CFG;
  EN.rescues++;
  EN.score += Math.round(C.score.rescue * (1 + C.score.roundMult*(r-1)) * endlessScoreMult());
  endlessStat("endless_rescue", EN.rescues);
  vfxShock(t.x, t.y, 10, 120, t.kind==="en_chest" ? "255,210,110" : "255,130,200", 700, 2);
  if(t.kind==="en_chest"){
    const g = Math.round(C.rescueGold + C.rescueGoldPerRound*r);
    heroes.forEach((h, i)=>{ const s = netMatch && netMatch.slots[i]; if(h===player) grantGold(g); else if(h.isRemote) netEmitTo(h._netSlot, "gold", [g]); });
    floatText(t.x, t.y-40, `+${g} 🪙`, "heal");
    for(let i=0;i<2;i++){ if(!endlessNoHeal()) dropPotion(t.x, t.y, "heal"); dropPotion(t.x, t.y, "mana"); }
    if(Math.random() < C.rescueItemChance + C.rescueItemPerRound*r){
      const grade = endlessGradeForRound(Math.max(1, r - 3));
      endlessRollItem(grade, currentArena, false);
      if(netIsHost()) netRecord("endlessGuestReward", [{k:"item", grade, arena:currentArena, pity:0, why:"rescue"}]);
    }
    showBanner("¡COFRE RESCATADO!");
  } else {
    const xp = Math.round(C.rescueXp + C.rescueXpPerRound*r);
    heroes.forEach(h=>{
      if(h.alive){ h.hp = Math.min(h.maxHp, h.hp + h.maxHp*0.35); h.energy = h.maxEnergy; }
      if(h===player) grantXP(player.classKey, xp); else if(h.isRemote) netEmitTo(h._netSlot, "xp", [xp]);
    });
    floatText(t.x, t.y-40, `+${xp} XP`, "heal");
    if(Math.random() < C.rescueGemChance){
      save.gems = (save.gems||0) + 1; persist();
      if(EN.local) EN.local.gemsRescue = (EN.local.gemsRescue||0) + 1;
      if(netIsHost()) netRecord("endlessGuestReward", [{k:"gem"}]);
      floatText(t.x, t.y-64, "+1 ◆", "heal");
    }
    showBanner("¡CRISTAL PURIFICADO! El equipo se recupera");
  }
}
function endlessRescueFail(t){
  EN.rescueFails++;
  showBanner(t.kind==="en_chest" ? "La Horda se llevó el cofre…" : "El cristal se corrompió del todo…");
  vfxShock(t.x, t.y, 10, 140, "160,40,90", 800, 2);
  // castigo: dos élites salen de donde estaba
  for(let i=0;i<2;i++){
    const e = spawnEnemy(pickFromPool(spawnPoolFor(runLevel)), false);
    e.x = t.x + (Math.random()-0.5)*60; e.y = t.y + (Math.random()-0.5)*60; clampToArena(e);
    const pool = (typeof ROLE_POOL_BY_ARENA!=="undefined" && ROLE_POOL_BY_ARENA[currentArena]) || null;
    if(pool && pool.length && typeof applyRole==="function") applyRole(e, pool[(Math.random()*pool.length)|0]);
  }
}
if(typeof CTX_KINDS!=="undefined"){
  CTX_KINDS.en_chest = {label:"Abrir", icon:"🗝", color:"#ffcf5c", decay:0.3, maxBots:1, farOk:true,
    pointer:()=>true, botWorth:()=>1.6, onComplete:(t, users)=> endlessRescueDone(t, users)};
  CTX_KINDS.en_crystal = {label:"Purificar", icon:"✦", color:"#ff7ac8", decay:0.3, maxBots:1, farOk:true,
    pointer:()=>true, botWorth:()=>1.6, onComplete:(t, users)=> endlessRescueDone(t, users)};
}
function endlessCtxTargets(){ return (endlessActive && endlessRescues.length) ? endlessRescues : null; }

/* ---------------- cada cuadro (anfitrión / partida local) ---------------- */
function endlessUpdate(dt){
  if(!endlessActive || runEnding) return;
  if(EN.rescueAt >= 0 && levelTimer >= EN.rescueAt && !bossActive && !levelClearing){ EN.rescueAt = -1; endlessSpawnRescue(); }
  for(let i=endlessRescues.length-1;i>=0;i--){
    const t = endlessRescues[i];
    if(t.done){ t.fade = (t.fade||0) + dt; if(t.fade > 1200) endlessRescues.splice(i, 1); continue; }
    t.t -= dt;
    if(t.t <= 0){ endlessRescues.splice(i, 1); endlessRescueFail(t); }
  }
}

/* ---------------- dibujo en el mundo ---------------- */
let _enChestCv = null;
function endlessDrawWorld(){
  if(!endlessActive || !endlessRescues.length || typeof ctx==="undefined") return;
  const now = (typeof animNow!=="undefined" ? animNow : performance.now())/1000;
  for(const t of endlessRescues){
    if(!inView(t.x, t.y, 120)) continue;
    const left = Math.max(0, t.t/t.tmax), urgent = !t.done && t.t < 5000;
    ctx.save();
    // anillo de tiempo en el piso
    if(!t.done){
      ctx.globalAlpha = urgent ? 0.55 + 0.35*Math.sin(now*12) : 0.7;
      ctx.strokeStyle = urgent ? "#ff5a4a" : (t.kind==="en_chest" ? "#ffcf5c" : "#ff7ac8");
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(t.x, t.y, t.r+10, (t.r+10)*0.62, 0, -Math.PI/2, -Math.PI/2 + Math.PI*2*left); ctx.stroke();
      ctx.globalAlpha = 0.25; ctx.fillStyle = "#000";
      ctx.beginPath(); ctx.ellipse(t.x, t.y+4, 26, 10, 0, 0, Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha = t.done ? Math.max(0, 1 - (t.fade||0)/1200) : 1;
    if(t.kind==="en_chest"){
      if(!_enChestCv && typeof drawLootChest==="function"){ _enChestCv = document.createElement("canvas"); _enChestCv.width = 68; _enChestCv.height = 56; drawLootChest(_enChestCv, 3, 0, null, 0); }
      if(_enChestCv){ ctx.imageSmoothingEnabled = false; ctx.drawImage(_enChestCv, Math.round(t.x - 34), Math.round(t.y - 48 - (t.done ? Math.min(20, (t.fade||0)/40) : 0))); }
      if(!t.done){ ctx.globalAlpha = 0.35 + 0.25*Math.sin(now*4); ctx.fillStyle = "rgba(255,210,90,0.5)"; ctx.fillRect(Math.round(t.x-2), Math.round(t.y-70 - 6*Math.sin(now*3)), 4, 10); }
    } else if(typeof crystalDrawGem==="function"){
      const bob = Math.sin(now*2.4)*4;
      if(!t.done){ ctx.globalAlpha = 0.35; ctx.fillStyle = "rgba(255,90,170,0.6)"; ctx.beginPath(); ctx.ellipse(t.x, t.y, 22, 9, 0, 0, Math.PI*2); ctx.fill(); ctx.globalAlpha = 1; }
      crystalDrawGem(ctx, t.x, t.y - 34 + bob, 15, t.done ? (typeof CRYSTAL_JUICIO!=="undefined" ? CRYSTAL_JUICIO : EN_CORRUPT_PAL) : EN_CORRUPT_PAL, now*1.6, ctx.globalAlpha);
    }
    // segundos que quedan
    if(!t.done){
      ctx.globalAlpha = 1; ctx.fillStyle = urgent ? "#ff8a7a" : "#fff"; ctx.font = pxFont(12); ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(Math.ceil(t.t/1000) + "s", t.x, t.y + t.r*0.62 + 14);
    }
    ctx.restore();
  }
}

/* ---------------- HUD ---------------- */
let _enHudKey = "";
function endlessHudTick(){
  const lvl = document.getElementById("hud-level"), span = lvl && lvl.parentElement;
  let chip = document.getElementById("hud-endless");
  if(!endlessActive){
    if(chip){ chip.remove(); _enHudKey = ""; }
    if(span && span.dataset.enHidden){ span.style.display = ""; delete span.dataset.enHidden; }
    return;
  }
  if(span && !span.dataset.enHidden){ span.style.display = "none"; span.dataset.enHidden = "1"; }
  if(!chip && span && span.parentElement){
    chip = document.createElement("span"); chip.id = "hud-endless";
    span.parentElement.insertBefore(chip, span);
  }
  if(!chip) return;
  const key = EN.round + "|" + EN.score + "|" + EN.mutators.join(",") + "|" + kills;
  if(key===_enHudKey) return;
  _enHudKey = key;
  const boss = endlessIsBossRound();
  chip.innerHTML = `<b class="en-inf">∞</b> Ronda <b>${EN.round}</b>${boss ? ' <span class="en-boss">☠</span>' : ""} · <b>${EN.score.toLocaleString("es-AR")}</b> pts · Bajas <b>${kills}</b> <span class="en-muts" title="${EN.mutators.map(m=>ENDLESS_MUTATORS[m].name).join(" · ")}">${EN.mutators.map(m=>ENDLESS_MUTATORS[m].icon).join("")}</span>`;
}

/* ---------------- red (mismo canal de snapshots) ---------------- */
function endlessNetGet(){
  // claves con prefijo "en": las arenas agregan nombres cortos a NET_SKIP_KEYS (p.ej. "sc" en la Ciudad)
  if(!endlessActive) return 0;
  return {enId:EN.id, enR:EN.round, enSc:EN.score, enMu:EN.mutators.join(","), enWk:EN.week, enAr:EN.arenas.join(","), enSk:EN.stintKind, enBl:EN.baseLevel,
    enBk:EN.bossKills, enRs:EN.rescues, enRf:EN.rescueFails, enSy:EN.synergies,
    enRq:endlessRescues.map(t=>({id:t.id, kind:t.kind, x:t.x, y:t.y, r:t.r, prog:Math.round(t.prog||0), dur:t.dur, t:Math.round(t.t), tmax:t.tmax, h:t.h, done:t.done?1:0, fade:Math.round(t.fade||0)}))};
}
function endlessNetSet(v){
  if(!v){ if(netIsGuest()) endlessActive = false; endlessRescues = []; return; }
  const fresh = v.enId !== EN.id;
  endlessActive = true;
  EN.id = v.enId; EN.round = v.enR|0; EN.score = v.enSc|0; EN.mutators = v.enMu ? String(v.enMu).split(",") : []; EN.week = v.enWk || "";
  EN.arenas = v.enAr ? String(v.enAr).split(",") : []; EN.stintKind = v.enSk || "sub"; EN.baseLevel = v.enBl|0 || 1;
  EN.bossKills = v.enBk|0; EN.rescues = v.enRs|0; EN.rescueFails = v.enRf|0; EN.synergies = v.enSy|0;
  endlessRescues = (v.enRq||[]).map(t=>Object.assign({}, t, {done:!!t.done}));
  if(fresh){ EN.ended = false; if(netIsGuest()) endlessLocalReset(); }
}
if(typeof NET_GLOBALS!=="undefined") NET_GLOBALS.endless = [endlessNetGet, endlessNetSet];

/* ---------------- fin de partida y resultados ---------------- */
function endlessEndRun(reason){
  if(EN.ended) { endlessShowResults(); return; }
  EN.ended = true; EN.endReason = reason || "defeat";
  const L = EN.local || (endlessLocalReset(), EN.local);
  const round = EN.round, grade = endlessGradeForRound(round);
  // cofre final según la ronda alcanzada (cada jugador, en su guardado)
  if(!L.done){
    L.done = true;
    // cuanto más aguantaste, más trae el cofre final (gemas desde la ronda 8; un objeto desde la 10, otro desde la 20 y otro desde la 30)
    const nEnd = ENDLESS_CFG.endChestItems.filter(r=>round >= r).length;
    for(let i=0;i<nEnd;i++) endlessRollItem(grade, currentArena, i===0);
    L.gemsEnd = round >= 10 ? runGemReward(currentArena, grade, true, runLevel) : (round >= ENDLESS_CFG.endChestMinRound ? 1 : 0);
    if(L.gemsEnd) save.gems = (save.gems||0) + L.gemsEnd;
    // récords
    const S = endlessSave(), cls = L.cls || selectedClass;
    S.runs++;
    const g = S.byGuardian[cls] || (S.byGuardian[cls] = {score:0, round:0, runs:0});
    g.runs = (g.runs||0) + 1;
    L.newGuardian = EN.score > (g.score||0); L.newGlobal = EN.score > (S.best.score||0);
    if(L.newGuardian) g.score = EN.score;
    if(round > (g.round||0)) g.round = round;
    if(L.newGlobal) S.best = {score:EN.score, round, cls, week:EN.week, arenas:EN.arenas.slice(), at:Date.now()};
    if(round > (S.best.roundMax||0)) S.best.roundMax = round;
    if(S.week.key !== EN.week) S.week = {key:EN.week, score:0, round:0};
    L.newWeek = EN.score > (S.week.score||0);
    if(L.newWeek){ S.week.score = EN.score; S.week.round = round; }
    S.last = {score:EN.score, round, cls, at:Date.now()};
    L.goldGained = (save.gold||0) - L.gold0;
    L.xpGained = Math.max(0, _enTotalXp(cls) - L.xp0);
    L.lvl1 = (save.champions[cls]||{}).level || L.lvl0;
    L.gemsGained = (save.gems||0) - L.gems0;
    L.timeMs = runElapsedMs||0;
    persist(); if(typeof persistNow==="function") persistNow();
    // logros / desafíos / XP de cuenta (T6): la partida cuenta como jugada (siempre termina en derrota o abandono)
    if(typeof questsOnRunEnd==="function"){ try{ L.questSum = questsOnRunEnd(false, {abandon:EN.endReason==="quit", endless:true}) || L.questSum; }catch(e){ console.error(e); } }
    endlessStat("endless_score", EN.score);
    endlessStat("endless_end", round);
    // ranking semanal (js/net/leaderboard.js): con cuenta se manda; sin cuenta queda local con aviso
    if(typeof lbAfterRun==="function"){ try{ lbAfterRun(L); }catch(e){ console.error(e); } }
  }
  endlessRescues = [];
  endlessShowResults();
}
function _enScreen(){
  let el = document.getElementById("endless-screen");
  if(el) return el;
  el = document.createElement("div");
  el.id = "endless-screen"; el.className = "screen hidden";
  const host = (document.getElementById("gameover-screen")||{}).parentElement || document.body;
  host.appendChild(el);
  if(typeof screens!=="undefined") screens.endless = el;
  return el;
}
function _enFmt(n){ return Math.round(n||0).toLocaleString("es-AR"); }
function endlessShowResults(){
  const el = _enScreen(), L = EN.local || {};
  setState("endless");
  const online = !!(netMatch || (typeof netInRoom==="function" && netInRoom()));
  const guest = online && typeof net!=="undefined" && net.role==="guest";
  const S = endlessSave(), cls = L.cls || selectedClass, G = S.byGuardian[cls] || {};
  const secs = Math.floor((L.timeMs||0)/1000);
  const arenas = EN.arenas.map(a=>`<span class="en-arena-chip">${(ARENA_MODS[a]||{}).icon||""} ${(ARENA_MODS[a]||{}).label||a}</span>`).join("");
  const muts = EN.mutators.map(m=>`<span class="en-mut-chip" title="${ENDLESS_MUTATORS[m].desc}">${ENDLESS_MUTATORS[m].icon} ${ENDLESS_MUTATORS[m].name}</span>`).join("");
  const loot = (L.loot||[]).map(it=>{ const tm = LOOT_TIER_META[itemTier(it)]||{}; return `<div class="en-loot-item" style="--tc:${tm.color||"#ddd"}">${typeof itemIconHTML==="function" ? itemIconHTML(it) : ""}<span class="en-loot-name" style="color:${tm.color||"#ddd"}">${it.name}</span><span class="en-loot-tier">${tm.label||""}</span></div>`; }).join("");
  const badge = (on, txt)=> on ? `<span class="en-new">${txt}</span>` : "";
  el.innerHTML = `<div class="en-res">
    <div class="en-res-kicker">HORDA INFINITA · SEMANA ${(EN.week||"").split("-W")[1]||""}</div>
    <div class="en-res-title">${EN.endReason==="quit" ? "Contención abandonada" : "La Horda siguió avanzando"}</div>
    <div class="en-res-big"><div><span>Ronda</span><b>${EN.round}</b></div><div><span>Puntaje</span><b>${_enFmt(EN.score)}</b></div></div>
    <div class="en-res-badges">${badge(L.newGlobal, "¡NUEVO RÉCORD GLOBAL!")}${badge(L.newGuardian && !L.newGlobal, `¡Récord de ${(CLASSES[cls]||{}).name||cls}!`)}${badge(L.newWeek && !L.newGlobal && !L.newGuardian, "¡Mejor de la semana!")}</div>
    <div class="en-lb-line hidden" id="en-lb-line"></div>
    ${L.questSum ? `<div class="qs-run-sum"><b>🏆 DESAFÍOS</b><span>+${L.questSum.xp} XP de cuenta</span>${L.questSum.pass ? `<span>Pase Nv. ${L.questSum.pass.level}${L.questSum.passUp > 0 ? " ▲" : ""}</span>` : ""}${L.questSum.chal > 0 ? `<span>${L.questSum.chal} desafío${L.questSum.chal>1?"s":""} ✔</span>` : ""}${L.questSum.ach > 0 ? `<span>${L.questSum.ach} logro${L.questSum.ach>1?"s":""} ✔</span>` : ""}</div>` : ""}
    <div class="en-res-btns">
      ${guest ? "" : `<button class="btn en-again" id="en-again-btn">⟳ UNA MÁS</button>`}
      <button class="btn secondary" id="en-back-btn">${online ? (guest ? "VOLVER A LA SALA" : "Volver a la sala") : "Volver al menú"}</button>
      ${online ? `<button class="btn secondary" id="en-leave-btn">${guest ? "Salir de la sala" : "Cerrar la sala y salir"}</button>` : ""}
    </div>
    <div class="en-res-sub">Botín juntado</div>
    <div class="en-res-loot">${loot || `<div class="en-loot-empty">${EN.round < 5 ? "Sin cofres todavía: el primero llega al vencer al subjefe de la ronda 5; desde la ronda 10, también el cofre final." : "El inventario estaba lleno o la suerte no acompañó."}</div>`}${L.full ? `<div class="en-loot-empty" style="color:#ff9a7a;">Tu inventario llegó al máximo: algunas recompensas no se pudieron guardar.</div>` : ""}</div>
    <div class="en-res-muts">${muts}</div>
    <div class="res-rows en-res-rows">
      <div class="res-row"><span>Tiempo</span><b>${Math.floor(secs/60)}:${String(secs%60).padStart(2,"0")}</b></div>
      <div class="res-row"><span>Bajas</span><b>${_enFmt(kills)}</b></div>
      <div class="res-row"><span>Jefes y subjefes vencidos</span><b>${EN.bossKills}</b></div>
      <div class="res-row"><span>Rescates</span><b>${EN.rescues}${EN.rescueFails ? ` <small>(${EN.rescueFails} perdidos)</small>` : ""}</b></div>
      <div class="res-row"><span>Sinergias activadas</span><b>${EN.synergies}</b></div>
      <div class="res-row"><span>Oro ganado</span><b>+${_enFmt(L.goldGained)} 🪙</b></div>
      <div class="res-row"><span>XP de ${(CLASSES[cls]||{}).name||""}</span><b>+${_enFmt(L.xpGained)}${L.lvl1 > L.lvl0 ? ` · ¡Nv. ${L.lvl1}!` : ""}</b></div>
      ${L.gemsGained ? `<div class="res-row"><span>Gemas</span><b>+${L.gemsGained} ◆</b></div>` : ""}
      <div class="res-row"><span>Récord de ${(CLASSES[cls]||{}).name||cls}</span><b>${_enFmt(G.score)} · ronda ${G.round||0}</b></div>
      <div class="res-row"><span>Récord global</span><b>${_enFmt(S.best.score)} · ronda ${S.best.round||0}</b></div>
    </div>
    <div class="en-res-sub">Arenas recorridas</div><div class="en-res-arenas">${arenas}</div>
</div>`;
  if(typeof _lbRenderRunLine==="function") _lbRenderRunLine(); // "Puesto #N esta semana" (o el aviso para invitados)
  const again = document.getElementById("en-again-btn");
  if(again) again.addEventListener("click", endlessOneMore);
  document.getElementById("en-back-btn").addEventListener("click", ()=>{
    endlessFinish();
    endlessPending = true; // la Sala / la elección de guardián siguen en modo infinito
    if(typeof netBackToRoomIfAny==="function" && netBackToRoomIfAny()) return;
    setState("menu"); if(typeof renderChampGrid==="function") renderChampGrid(); if(typeof renderSaveLine==="function") renderSaveLine();
  });
  const leave = document.getElementById("en-leave-btn");
  if(leave) leave.addEventListener("click", ()=>{
    endlessFinish(); endlessPending = false;
    if(typeof netLeaveAfterMatch==="function") netLeaveAfterMatch();
    setState("mainmenu"); if(typeof renderMainMenu==="function") renderMainMenu();
  });
}
// Sale del modo (vuelve la arena de campaña que estaba elegida).
function endlessFinish(){
  endlessActive = false; endlessRescues = [];
  if(EN.returnArena && ARENA_ORDER.indexOf(EN.returnArena) >= 0) currentArena = EN.returnArena;
  EN.returnArena = undefined;
  endlessHudTick();
}
// "Una más" en un toque: mismo guardián, mismo equipo (y en la sala, los mismos amigos).
function endlessOneMore(){
  const inRoom = typeof netInRoom==="function" && netInRoom();
  if(inRoom && net.role!=="host") return;
  if(netMatch) netFinishMatch();
  const ret = EN.returnArena;
  endlessActive = false;
  endlessBeginRun();
  EN.returnArena = ret;
  try{
    if(typeof netInRoom==="function" && netInRoom() && net.role==="host") netHostStartGame();
    else startRun(1);
  }catch(err){ console.error("Error al arrancar la Horda Infinita:", err); }
}
function endlessQuitFromPause(){
  const st0 = state;
  const msg = netIsHost() ? "Sos el anfitrión: si terminás, la partida termina para todos. ¿Terminar la contención y ver los resultados?" : "¿Terminar la contención? Te llevás el puntaje, el botín juntado y lo que te toque por la ronda alcanzada (sin castigo).";
  gameConfirm(msg, {okText:"Terminar", cancelText:"Seguir jugando", danger:true}).then(ok=>{
    if(!ok || state!==st0 || !player) return;
    document.getElementById("pause-screen").classList.add("hidden");
    if(netIsGuest()){ netQuitMatch(); endlessEndRun("quit"); return; }
    runEnding = true;
    if(netIsHost()) netHostAnnounceEnd(false);
    endlessEndRun("quit");
  });
}

/* ---------------- entrada al modo (selector actual, sin rediseñar menús) ---------------- */
window.endlessOpen = function(){
  if(!endlessUnlocked()){ if(typeof showNetToast==="function") showNetToast("Completá la Arena 02 (Fábrica Sin Fin) para desbloquear la Horda Infinita."); return false; }
  endlessPending = true;
  const b = document.getElementById("menu-brand-sub");
  setState("menu");
  if(typeof renderChampGrid==="function") renderChampGrid();
  if(typeof renderSaveLine==="function") renderSaveLine();
  if(b) b.textContent = "HORDA INFINITA · " + endlessWeeklyMutators().ids.map(m=>ENDLESS_MUTATORS[m].name).join(" · ").toUpperCase();
  return true;
};
function endlessRefreshModeCard(){
  const sel = document.getElementById("modeselect-screen"); if(!sel) return;
  let card = document.getElementById("mode-endless-btn");
  const M = window.GAME_MODE_REGISTRY && window.GAME_MODE_REGISTRY.endless;
  if(!card){
    card = document.createElement("button");
    card.className = "mode-card"; card.id = "mode-endless-btn";
    const arena = document.getElementById("mode-arena-btn");
    if(arena && arena.nextSibling) sel.insertBefore(card, arena.nextSibling); else sel.appendChild(card);
    card.addEventListener("click", ()=> window.endlessOpen());
  }
  const open = endlessUnlocked(), S = endlessSave(), wk = endlessWeeklyMutators();
  card.classList.toggle("locked", !open);
  const rec = S.best && S.best.score ? ` · Récord: ${_enFmt(S.best.score)} (ronda ${S.best.round})` : "";
  card.innerHTML = `<div class="mode-card-icon">${open ? "∞" : "🔒"}</div><div class="mode-card-title">Horda Infinita</div>
    <div class="mode-card-desc">${open ? (M ? M.desc : "") + `<br><span class="en-card-week">Esta semana: ${wk.ids.map(m=>ENDLESS_MUTATORS[m].icon + " " + ENDLESS_MUTATORS[m].name).join(" · ")}${rec}</span>` : (M ? M.lockedDesc : "")}</div>`;
}
// Sala en modo infinito: el lugar de la arena muestra la semana (las arenas las elige la Cicatriz).
function endlessDecoratePrep(){
  if(!endlessPending) return;
  const t = document.getElementById("lobby-title"); if(t) t.textContent = "Sala · Horda Infinita";
  const box = document.getElementById("lobby-arena"); if(!box) return;
  const wk = endlessWeeklyMutators(), S = endlessSave(), G = S.byGuardian[selectedClass] || {};
  const guest = typeof netInRoom==="function" && netInRoom() && net.role==="guest";
  box.classList.remove("hidden");
  box.innerHTML = `<div class="la-head">HORDA INFINITA <span class="la-by">· ${guest ? "la arranca el anfitrión" : "la Cicatriz elige las arenas"}</span></div>
    <div class="la-desc">∞ Rondas sin fin: cada 5, un jefe o subjefe y la Cicatriz te lleva a otra arena. Semana ${wk.key.split("-W")[1]}: ${wk.ids.map(m=>`<b title="${ENDLESS_MUTATORS[m].desc}">${ENDLESS_MUTATORS[m].icon} ${ENDLESS_MUTATORS[m].name}</b>`).join(" · ")}.</div>
    <div class="la-desc">Récord con ${(CLASSES[selectedClass]||{}).name||""}: <b>${_enFmt(G.score)}</b> (ronda ${G.round||0}) · Global: <b>${_enFmt(S.best.score)}</b> (ronda ${S.best.round||0})${typeof lbOpen==="function" ? ` <button type="button" class="btn secondary small lb-open-btn" id="en-prep-rank">🏆 Ranking</button>` : ""}</div>`;
  box._html = "endless";
  const rk = document.getElementById("en-prep-rank"); if(rk) rk.addEventListener("click", ev=>{ ev.stopPropagation(); lbOpen({guardian:""}); });
}
function endlessStartFromPrep(){
  const online = typeof netInRoom==="function" && netInRoom();
  if(online){
    if(net.role!=="host") return;
    if(netDuplicateChamps().length){ netRenderLobbyBar(); return; }
    const go = ()=>{
      if(!netInRoom() || net.role!=="host" || state!=="prep") return;
      const sb = document.getElementById("prep-start-btn");
      if(typeof assetsAllReady==="function" && !assetsAllReady()){
        if(sb){ sb.disabled = true; sb.textContent = "Preparando la arena… " + assetsRestPct() + "%"; }
        whenAssetsReady(()=>{ if(sb){ sb.disabled = false; sb.textContent = "Comenzar"; } go(); }, pct=>{ if(sb) sb.textContent = "Preparando la arena… " + pct + "%"; });
        return;
      }
      endlessBeginRun();
      try{ netHostStartGame(); }catch(err){ console.error(err); gameAlert("No se pudo arrancar la partida:\n"+(err.message||err)); }
    };
    const nr = netNotReady();
    if(nr.length){ gameConfirm(`${nr.map(s=>s.name).join(", ")} todavía no ${nr.length>1?"están":"está"} LISTO. ¿Comenzar igual?`, {okText:"Comenzar"}).then(ok=>{ if(ok) go(); }); return; }
    go(); return;
  }
  endlessBeginRun();
  try{ startRun(1); }catch(err){ console.error("Error al arrancar la Horda Infinita:", err); }
}
// Enganches al menú actual SIN tocar sus archivos (el menú se está rediseñando aparte).
(function endlessWireMenus(){
  if(typeof setState==="function"){
    const _setState = setState;
    setState = function(s){
      if(s==="modeselect" || s==="arenaselect" || s==="mainmenu" || s==="title" || s==="divina") endlessPending = false;
      const r = _setState.apply(this, arguments);
      if(s==="modeselect") endlessRefreshModeCard();
      return r;
    };
  }
  if(typeof renderPrepSummary==="function"){
    const _rps = renderPrepSummary;
    renderPrepSummary = function(){ const r = _rps.apply(this, arguments); endlessDecoratePrep(); return r; };
  }
  if(typeof renderLobbyArena==="function"){
    const _rla = renderLobbyArena;
    renderLobbyArena = function(){ if(endlessPending){ endlessDecoratePrep(); return; } return _rla.apply(this, arguments); };
  }
  const sb = document.getElementById("prep-start-btn");
  if(sb) sb.addEventListener("click", ev=>{ if(!endlessPending) return; ev.stopImmediatePropagation(); try{ endlessStartFromPrep(); }catch(err){ console.error(err); } }, true);
  const mb = document.getElementById("menu-back-btn");
  if(mb) mb.addEventListener("click", ev=>{ if(!endlessPending) return; ev.stopImmediatePropagation(); endlessPending = false; setState("modeselect"); }, true);
  endlessRefreshModeCard();
})();
