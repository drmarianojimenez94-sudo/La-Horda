"use strict";
/* ============================================================
   js/net/net-game.js
   LA HORDA — B1 COOPERATIVE PLAYTEST: UNA sola partida compartida.

   ANFITRIÓN (host autoritativo):
   - Corre la simulación de siempre (update/enemigos/oleadas/bots/jefes). Los héroes de los
     invitados son héroes normales marcados isRemote: en vez de la IA de bot, los mueve la
     posición que reporta su dueño (validada) y ejecutan sus habilidades con EXACTAMENTE el
     mismo código que el jugador local (se "presta" la variable player por un instante:
     netWithHero).
   - ~15 veces por segundo manda a todos un snapshot con deltas (solo lo que cambió) de héroes,
     enemigos, proyectiles, zonas, pociones, etc., más los efectos visuales/sonidos del cuadro.
   INVITADO:
   - No simula: reconstruye el mundo con los snapshots, interpola lo ajeno, predice su propio
     movimiento (se siente instantáneo) y manda sus intenciones (mover, atacar, habilidad,
     ulti, revivir, subir habilidad, elegir refuerzo).
   Progresión: cada jugador gana XP/oro/objetos en SU propio guardado (el anfitrión le avisa
   qué ganó); el anfitrión nunca guarda datos de un invitado.
   ============================================================ */
let netMatch = null;
const NET_SNAP_MS = 66, NET_INPUT_MS = 50, NET_KEYFRAME_MS = 10000;
const NET_PERSONAL_SFX = new Set(["levelup","potion","deny","hurt","hurtHeavy"]);
function netIsHost(){ return !!(netMatch && netMatch.role==="host"); }
function netIsGuest(){ return !!(netMatch && netMatch.role==="guest"); }
function netSendToHost(d){ return netSend({t:"msg", d}); }
function netBroadcast(d){ return netSend({t:"msg", d}); }
function netSendTo(slot, d){ return netSend({t:"msg", to:slot, d}); }

/* ---------------- utilidades ---------------- */
// RNG con semilla: el escenario (muros del Laberinto, decorados) sale IDÉNTICO en todos.
function netWithSeed(seed, fn){
  const orig = Math.random; let s = (seed>>>0) || 1;
  Math.random = ()=>{ s ^= s<<13; s>>>=0; s ^= s>>>17; s ^= s<<5; s>>>=0; return s/4294967296; };
  try{ return fn(); } finally { Math.random = orig; }
}
// Presta la identidad de "jugador local" a un héroe remoto mientras se ejecuta fn (habilidades,
// temporizadores, refuerzos): así sus acciones usan el mismo código probado que las del jugador.
function netWithHero(h, fn){
  const s = {player, joyVec, basicHeld, runStats, facing};
  const n = h._net;
  player = h; joyVec = {x:0, y:0}; basicHeld = !!(n && n.basic && h.alive); runStats = n ? n.runStats : runStats; facing = {x:h.fx||0, y:h.fy||1};
  try{ return fn(); }
  finally { player = s.player; joyVec = s.joyVec; basicHeld = s.basicHeld; runStats = s.runStats; facing = s.facing; }
}
function netHumanSlots(){ return netMatch ? netMatch.slots.filter(s=>s.kind==="human") : []; }
function netIsHumanChamp(k){ return !!(netMatch && netMatch.slots.some(s=>s.kind==="human" && s.slot!==0 && s.champ===k)); }
function netSlotName(i){ const s = netMatch && netMatch.slots[i]; return s ? s.name : ""; }

/* ---------------- serialización con referencias ---------------- */
const NET_SKIP_KEYS = new Set(["cls","_ap","_net","_tx","_ty","_s","hitSet","onHit","fn","_spdAt","_hx","_hy","_tk",
  // internos de la IA/navegación del anfitrión: el invitado no los usa
  "_navT","_nmx","_nmy","_navBlocked","_tgt","_tgtT","_dangerT","atkCd","recentDamage","_hitSfxAt","_hurtSfxAt","_setFrame","path",
  // estado de animación que calcula el propio renderizador de cada cliente
  "_an",
  // revivir: el candado/progreso viaja (_reviveBy/_reviveT/_reviveDur); esto es interno del anfitrión
  "_revTouchAt","_revHold",
  // acción contextual: el progreso viaja en el estado de la arena; esto es interno del anfitrión
  "_ctxHold","_ctxGoal","_ctxGoalT","_ctxProgT","_ctxBestD","_ctxUnstick","_ctxSide",
  // Gélida: el frío viaja en el estado de la arena; esto es interno del anfitrión / de la IA
  "_cold","_stillT","_cx","_cy","_hieWarm","_hieSide","_coldHits",
  // La Fortaleza: forma caminable cacheada (se recalcula en cada cliente) e internos del anfitrión
  "_fs","_strT","_fortStranded","_ux","_uy","_ut","_stk"]);
// Se mandan solo en los snapshots completos (cada ~4 s y al terminar): cambian todo el tiempo y
// solo hacen falta para la pantalla final (estadísticas de rendimiento).
const NET_KEYFRAME_ONLY = new Set(["stats"]);
// El invitado anima estos solo: no hace falta mandarlos cuadro a cuadro.
const NET_LOCAL_ANIM = new Set(["animT","phase"]);
// Temporizadores que bajan solos: el invitado los descuenta y el anfitrión solo manda cuando el
// valor real se aparta de lo previsto (se reinició, se cortó, etc.).
const NET_TIMER_RE = /(Timer|Cd|^life|^attackAnim|^hitFlash)$/;
const NET_UP_TIMERS = new Set(["sylvaChargeTimer","_reviveT","_dyingP","spinTick","stormTick"]);
function netIsDownTimer(k){ return NET_TIMER_RE.test(k) && !NET_UP_TIMERS.has(k); }
let _netHeroIdx = new Map(), _netEntId = new WeakMap(), _netNextId = 1;
function netIdOf(o){ let id = _netEntId.get(o); if(id===undefined){ id = _netNextId++; _netEntId.set(o, id); } return id; }
function netSer(v, depth){
  if(v===null) return null;
  const t = typeof v;
  if(t==="number"){ if(!isFinite(v)) return null; return Number.isInteger(v) ? v : Math.round(v*100)/100; }
  if(t==="string" || t==="boolean") return v;
  if(t!=="object") return undefined;
  if(depth>0){ const hi = _netHeroIdx.get(v); if(hi!==undefined) return {$h:hi}; }
  if(depth>0){ const eid = _netEntId.get(v); if(eid!==undefined && v.type!==undefined && v.maxHp!==undefined) return {$e:eid}; }
  if(depth>=4) return undefined;
  if(Array.isArray(v)){
    const out = [], n = Math.min(v.length, 60);
    for(let i=0;i<n;i++){ const s = netSer(v[i], depth+1); out.push(s===undefined ? null : s); }
    return out;
  }
  const proto = Object.getPrototypeOf(v);
  if(proto!==Object.prototype && proto!==null) return undefined; // Set, Map, imágenes, canvas...
  const o = {};
  for(const k in v){ if(NET_SKIP_KEYS.has(k)) continue; const s = netSer(v[k], depth+1); if(s!==undefined) o[k] = s; }
  return o;
}
function netDecode(v, inline){
  if(v===null || typeof v!=="object") return v;
  if(v.$h!==undefined) return heroes[v.$h] || null;
  if(v.$e!==undefined){ const e = netMatch && netMatch.ents.get(v.$e); if(e) return e; if(inline && v.$o) return netRestore(netDecode(v.$o)); return null; }
  if(Array.isArray(v)) return v.map(x=>netDecode(x, inline));
  const o = {}; for(const k in v) o[k] = netDecode(v[k], inline); return netRestore(o);
}
function netRestore(o){ if(o && o.classKey && CLASSES[o.classKey] && o.maxEnergy!==undefined) o.cls = CLASSES[o.classKey]; return o; }

/* ---------------- colecciones sincronizadas ---------------- */
const NET_COLLS = {
  enemies:           [()=>enemies, a=>{ enemies = a; }],
  projectiles:       [()=>projectiles, a=>{ projectiles = a; }],
  potions:           [()=>potions, a=>{ potions = a; }],
  fireWalls:         [()=>fireWalls, a=>{ fireWalls = a; }],
  traps:             [()=>traps, a=>{ traps = a; }],
  axiomZones:        [()=>axiomZones, a=>{ axiomZones = a; }],
  sylvaRainZones:    [()=>sylvaRainZones, a=>{ sylvaRainZones = a; }],
  hazardZones:       [()=>hazardZones, a=>{ hazardZones = a; }],
  bossStrikes:       [()=>bossStrikes, a=>{ bossStrikes = a; }],
  iceWalls:          [()=>iceWalls, a=>{ iceWalls = a; }],
  activeAxiomVfx:    [()=>activeAxiomVfx, a=>{ activeAxiomVfx = a; }],
  musashiAfterimages:[()=>musashiAfterimages, a=>{ musashiAfterimages = a; }],
  champFx:           [()=>champFx, a=>{ champFx = a; }], // El Libertador / Eren: zonas, avisos de pisada, jinetes, escarcha
  breakables:        [()=>breakables, a=>{ breakables = a; }] // urnas, barriles, ánforas que estallan contra la horda
};
// Estado global de la partida (no-entidades) que los invitados necesitan para HUD/dibujo.
const NET_GLOBALS = {
  runLevel:[()=>runLevel, v=>{ runLevel = v; }], runWave:[()=>runWave, v=>{ runWave = v; }],
  levelTimer:[()=>levelTimer, v=>{ levelTimer = v; }], levelDuration:[()=>levelDuration, v=>{ levelDuration = v; }],
  kills:[()=>kills, v=>{ kills = v; }], bossActive:[()=>bossActive, v=>{ bossActive = v; }],
  boss:[()=>boss, v=>{ boss = v; }], activeChampion:[()=>activeChampion, v=>{ activeChampion = v; }],
  subjefesDefeated:[()=>subjefesDefeated, v=>{ subjefesDefeated = v; }], screenShake:[()=>screenShake, v=>{ screenShake = v; }],
  axiomForceQuitFlash:[()=>axiomForceQuitFlash, v=>{ axiomForceQuitFlash = v; }], axiomFreezeTimer:[()=>axiomFreezeTimer, v=>{ axiomFreezeTimer = v; }],
  runElapsedMs:[()=>runElapsedMs, v=>{ runElapsedMs = v; }], levelClearing:[()=>levelClearing, v=>{ levelClearing = v; }],
  arenaRuleBossStacks:[()=>arenaRuleBossStacks, v=>{ arenaRuleBossStacks = v; }], arenaRuleBossTimer:[()=>arenaRuleBossTimer, v=>{ arenaRuleBossTimer = v; }],
  acuaCurrent:[()=>acuaCurrent, v=>{ acuaCurrent = v; }], runEnding:[()=>runEnding, v=>{ runEnding = v; }],
  // estado propio de la arena (La Fortaleza: puertas, puentes, trampas, redes, Caballero, Dragón)
  arenaState:[()=>arenaHook("netState"), v=>{ if(v) arenaHook("applyNetState", v); }]
};

/* ---------------- eventos visuales/sonoros (se graban en el anfitrión, se repiten en los invitados) ---------------- */
const NET_EVENT_FNS = ["floatText","showBanner","playSfx","vfxBurst","vfxConverge","vfxShock","vfxTelegraph","vfxSprite","vfxShake",
  "vfxOnDeath","flashScreen","pushChainBolt","pushSpark","pushAsesinoFx","bossHudShow","bossHudHide","bossHudHint","bossHudPhase",
  "setMusicMode","updateArenaRuleChip","drawAxiomVfxBurst","arenaTitleCard","addDecal","goreChunks","vfxCastFlash","crystalAward"];
const NET_INLINE_EVENTS = new Set(["vfxOnDeath","bossHudShow"]); // su entidad puede no haber llegado nunca al invitado
const NET_ORIG = {};
let _netRecDepth = 0, _netEvents = [];
function netHookEvents(){
  for(const name of NET_EVENT_FNS){
    const orig = window[name];
    if(typeof orig!=="function" || NET_ORIG[name]) continue;
    NET_ORIG[name] = orig;
    window[name] = function(...args){
      if(_netRecDepth===0 && netMatch && netMatch.role==="host" && netMatch.recording){
        if(!(name==="playSfx" && NET_PERSONAL_SFX.has(args[0]))) netRecord(name, args);
      }
      _netRecDepth++;
      try{ return orig.apply(this, args); } finally { _netRecDepth--; }
    };
  }
}
function netRecord(name, args, to){
  if(_netEvents.length > 260) return;
  const inline = NET_INLINE_EVENTS.has(name);
  const a = args.map(x=>{
    if(inline && x && typeof x==="object" && x.type!==undefined){
      const id = _netEntId.get(x);
      const sent = id!==undefined && netMatch.last.enemies && netMatch.last.enemies.has(id);
      return sent ? {$e:id} : {$e:(id===undefined ? netIdOf(x) : id), $o:netSer(x, 0)};
    }
    const s = netSer(x, 1); return s===undefined ? null : s;
  });
  _netEvents.push(to===undefined ? [name, a] : [name, a, to]);
}
// Ejecuta fn sin transmitirlo a los invitados (cosas que solo ve el anfitrión: sus números de daño).
function netQuiet(fn){ _netRecDepth++; try{ return fn(); } finally { _netRecDepth--; } }
// Nombre de los amigos sobre su personaje (solo en partidas online).
function netDrawNameTags(){
  if(!netMatch || !heroes) return;
  ctx.save();
  ctx.font = "bold 13px monospace"; ctx.textAlign = "center";
  heroes.forEach((h,i)=>{
    const s = netMatch.slots && netMatch.slots[i];
    if(!s || s.kind!=="human" || h===player) return;
    const y = h.y - 74;
    const label = `P${i+1} ${s.name}`;
    ctx.fillStyle = "rgba(0,0,0,0.55)"; const w = ctx.measureText(label).width + 10;
    ctx.fillRect(h.x - w/2, y - 12, w, 16);
    ctx.fillStyle = h.alive ? (NET_SLOT_COLORS[i]||"#8fe0ff") : "#ff9a7a";
    ctx.fillText(label, h.x, y);
  });
  ctx.restore();
}
// Evento para UN jugador (sus números de daño, su pantalla roja al recibir un golpe, su XP...).
function netEmitTo(slot, name, args){ if(netIsHost()) netRecord(name, args||[], slot); }
function netPlayEvent(ev){
  const [name, rawArgs, to] = ev;
  if(to!==undefined && to!==netMatch.mySlot) return;
  const args = rawArgs.map(a=>netDecode(a, true));
  try{
    switch(name){
      case "xp": { const lv = grantXP(selectedClass, args[0]); if(lv) netLog("LEVEL_UP", {level:save.champions[selectedClass].level}); return; }
      case "gold": grantGold(args[0]); return;
      case "hurt": registerPlayerHurt(args[0], {x:args[1], y:args[2]}); return;
      case "useXp": gainSkillUseXp(selectedClass, args[0]); return;
    }
    const f = NET_ORIG[name] || window[name];
    if(typeof f==="function") f.apply(null, args);
  }catch(e){ /* un efecto que no se pudo reproducir no debe cortar la partida */ }
}

/* =====================================================================
   ANFITRIÓN
   ===================================================================== */
const NET_ROLE_ORDER = ["tanque","asesino","mago","soporte"];
function netPickBots(humanChamps, n){
  const roles = new Set(humanChamps.map(k=>CLASSES[k] && CLASSES[k].roleCategory));
  const out = [];
  const free = k=> !humanChamps.includes(k) && !out.includes(k);
  // primero los roles que faltan (como siempre); después cualquiera libre
  for(const role of NET_ROLE_ORDER){
    if(out.length>=n) break;
    if(roles.has(role)) continue;
    const pool = Object.keys(CLASSES).filter(k=>free(k) && CLASSES[k].roleCategory===role);
    if(pool.length) out.push(pool[(Math.random()*pool.length)|0]);
  }
  while(out.length<n){
    const pool = Object.keys(CLASSES).filter(free);
    if(!pool.length) break;
    out.push(pool[(Math.random()*pool.length)|0]);
  }
  return out;
}
// Datos de campeón que manda cada invitado (solo lo que el anfitrión necesita para simularlo:
// nivel, habilidades, talentos y los objetos EQUIPADOS; nunca el resto del inventario).
function netBuildLoadout(){
  const k = selectedClass, c = save.champions[k];
  const eq = Object.assign(mkEquipment(), c.equipment||{});
  const items = itemPoolFor(k).filter(it=>Object.values(eq).includes(it.uid));
  return {champ:k, level:c.level, xp:c.xp, talentPoints:c.talentPoints||0,
    skillMastery:c.skillMastery, ultMastery:c.ultMastery, talents:c.talents||mkTalentState(), equipment:eq, items};
}
function netLoadoutRecord(L){
  const rec = mkChampion(true);
  rec.level = L.level|0 || 1; rec.xp = L.xp||0; rec.talentPoints = L.talentPoints|0;
  if(Array.isArray(L.skillMastery)) rec.skillMastery = [0,1,2].map(i=>Object.assign(mkMastery(), L.skillMastery[i]||{}));
  if(L.ultMastery) rec.ultMastery = Object.assign(mkMastery(), L.ultMastery);
  if(L.talents) rec.talents = Object.assign(mkTalentState(), L.talents);
  rec.loadoutItems = Array.isArray(L.items) ? L.items.slice(0, 6) : []; // sus objetos equipados (ver itemPoolFor)
  rec.equipment = Object.assign(mkEquipment(), L.equipment||{});
  return rec;
}
// Mientras dura la partida, save.champions[campeón del invitado] apunta a SU loadout (así toda
// la simulación -stats, maestrías, talentos, objetos- usa sus datos reales). El guardado del
// anfitrión nunca lo ve: netPersistView entrega los datos originales al escribir.
function netApplyGuestLoadouts(){
  netMatch.backups = {};
  for(const s of netMatch.slots){
    if(s.kind!=="human" || s.slot===0) continue;
    const L = netMatch.loadouts[s.slot];
    netMatch.backups[s.champ] = save.champions[s.champ];
    const rec = L && L.champ===s.champ ? netLoadoutRecord(L) : netLoadoutRecord({level:s.level||1});
    save.champions[s.champ] = rec;
  }
}
function netRestoreBackups(){
  if(!netMatch || !netMatch.backups) return;
  for(const k in netMatch.backups) save.champions[k] = netMatch.backups[k];
  netMatch.backups = null;
  invalidatePassiveCache && invalidatePassiveCache();
}
function netPersistView(s){
  if(!netMatch || !netMatch.backups) return s;
  const champs = Object.assign({}, s.champions);
  for(const k in netMatch.backups) champs[k] = netMatch.backups[k];
  return Object.assign({}, s, {champions:champs});
}
function netHostStartGame(){
  const room = net.room; if(!room) return false;
  const humans = room.slots.map((s,i)=>s && s.connected ? Object.assign({slot:i}, s) : null);
  const humanChamps = humans.filter(Boolean).map(s=> s.slot===0 ? selectedClass : s.champ);
  const bots = netPickBots(humanChamps, 4 - humanChamps.length);
  const slots = [0,1,2,3].map(i=>{
    const s = humans[i];
    if(s) return {slot:i, kind:"human", champ: i===0 ? selectedClass : s.champ, name:s.name, level:s.level};
    return {slot:i, kind:"bot", champ:bots.shift(), name:"BOT"};
  });
  const seed = (Math.random()*0x7fffffff)|0 || 7;
  netMatch = {role:"host", mySlot:0, seed, slots, arena:currentArena, loadouts:(netLobby.loadouts||{}),
    backups:null, recording:false, lastSnapAt:0, lastKeyAt:0, snapN:0, last:{}, lastG:{}, lastH:[{},{},{},{}], ents:new Map(),
    buffPicks:null, ended:false, startedAt:performance.now()};
  netSend({t:"start"});
  netLobby.matches++;
  netApplyGuestLoadouts();
  lobbyAllies = slots.slice(1).map(s=>s.champ);
  startRun(1);
  // héroes: índice = slot
  _netHeroIdx = new Map(); heroes.forEach((h,i)=>_netHeroIdx.set(h, i));
  heroes.forEach((h,i)=>{
    const s = slots[i]; h._netSlot = i; h.netName = s.name;
    if(s.kind==="human" && i!==0){
      const rs = freshRunStats();
      rs.critChance += passiveSum(h.classKey, "crit_chance_add");
      rs.critMult = (rs.critMult||1.8) + passiveSum(h.classKey, "crit_mult_add");
      h.isRemote = true;
      h._net = {runStats:rs, basic:false, in:null, posAuth:1, px:h.x, py:h.y, lastAt:performance.now(), connected:true};
    }
  });
  netMatch.recording = true;
  const start = netStartMessage();
  netBroadcast(start);
  netLog("GAME_START", {arena:currentArena, humans:humanChamps.length, bots:4-humanChamps.length});
  return true;
}
function netStartMessage(){
  return {k:"start", arena:currentArena, seed:netMatch.seed, slots:netMatch.slots, snap:netBuildSnapshot(true)};
}
// Cada cuadro, en update(): héroes de los invitados.
function netHostUpdateRemotes(dt){
  const now = performance.now();
  for(const h of heroes){
    if(!h.isRemote || !h._net) continue;
    const n = h._net, inp = n.in;
    // ¿algo lo movió desde el cuadro pasado (empujón, embestida, tirón, fusión, duelo)? -> el
    // anfitrión manda: el invitado se corrige a esta posición (posAuth nuevo).
    if(Math.hypot(h.x-n.px, h.y-n.py) > 2) n.posAuth++;
    const canMove = h.alive && !(h.stunTimer>0) && !h.fused && !(axiomFreezeTimer>0 && axiomFreezeCaster!==h) && !h.duelActive && !heroMoveLocked(h);
    if(inp){
      h.fx = inp.fx; h.fy = inp.fy;
      if(canMove && inp.pa===n.posAuth){
        const d = Math.hypot(inp.x-h.x, inp.y-h.y);
        const allowed = (h._spd||h.baseSpeed||200) * ((now-n.lastAt)/1000 + 0.35) + 40;
        if(d <= allowed){ h.x = inp.x; h.y = inp.y; clampToArena(h); resolveWallCollision(h); n.lastAt = now; }
        else { n.posAuth++; n.lastAt = now; } // movimiento imposible: se lo corrige
      }
    }
    netWithHero(h, ()=> updateControlledHero(dt));
    h.moving = !!(inp && inp.mv) && canMove;
    if(h.moving) h.animT += dt;
    h._netPA = n.posAuth;
    h._spd = h.baseSpeed * n.runStats.speedMult * arenaRuleSpeedMult() * setSpeedMult(h) * (1-Math.min(0.8,h.slowAmt||0)) * (canMove?1:0) * (h.sylvaCharging?0.55:1) * heroSpeedMult(h);
    n.px = h.x; n.py = h.y;
  }
  if(player) player._spd = player.baseSpeed * runStats.speedMult * arenaRuleSpeedMult() * setSpeedMult(player) * (1-Math.min(0.8,player.slowAmt||0)) * heroSpeedMult(player);
}
// TEAM WIPE (derrota compartida): todos los humanos ACTIVOS (conectados) están caídos y no hay
// ningún revivir de un humano en curso. Mientras quede un humano activo en pie, la partida sigue.
// (Un invitado desconectado no cuenta: su héroe lo maneja un bot hasta que vuelva.)
function netTeamWiped(){
  let aliveHumans = 0, reviving = false;
  heroes.forEach((h,i)=>{
    const s = netMatch.slots[i]; if(!s || s.kind!=="human") return;
    const active = i===0 || !!(h._net && h._net.connected);
    if(active && h.alive) aliveHumans++;
    if(!h.alive && h._reviveBy && h._reviveBy.alive && h._reviveT>0) reviving = true;
  });
  return aliveHumans===0 && !reviving;
}
function netHostCheckDefeat(){
  if(!netIsHost() || runEnding) return;
  if(netTeamWiped()){
    runEnding = true; // corta aparición de enemigos, refuerzos y revivir (ver update/updateRevives)
    netLog("TEAM_WIPE", {level:runLevel});
    showBanner("TEAM WIPE — todo el equipo cayó");
    runLater(650, ()=>{ if(state==="playing") showGameOverScreen(); });
  }
}
// Mensajes de los invitados
function netHostOnMsg(from, d){
  if(!d || !netMatch) { if(d && d.k==="loadout") netLobby.loadouts[from] = d.L; return; }
  if(d.k==="loadout"){ netLobby.loadouts[from] = d.L; return; }
  const h = heroes && heroes[from];
  if(!h || !h._net) return;
  const n = h._net;
  switch(d.k){
    case "in": n.in = d; n.basic = !!d.b; return;
    case "cast":
      if(state!=="playing" || !h.alive) return;
      netWithHero(h, ()=>{ if(useSkill(d.idx|0, d.aim||null)) netEmitTo(from, "useXp", [d.idx|0]); });
      return;
    case "ult": if(state==="playing" && h.alive) netWithHero(h, ()=> useUltimate()); return;
    case "pact": if(state==="playing" && h.alive) nigroTogglePact(h); return; // Nigromante invitado
    case "emerg": emergUse(h); return; // curación de emergencia del invitado
    case "sylva":
      if(state!=="playing" || !h.alive) return;
      netWithHero(h, ()=>{ if(d.on) sylvaChargeStart(); else sylvaChargeRelease(d.aim||null); });
      return;
    case "revive": // el invitado mantiene (on:1) o suelta (on:0) el botón; el progreso es del anfitrión (updateRevives)
      if(!d.on){ h._revHold = -1; cancelRevivesBy(h); return; }
      if(heroes[d.slot|0] && heroes[d.slot|0]!==h) h._revHold = d.slot|0;
      return;
    case "ctx": ctxNetMsg(h, d); return; // acción contextual: mantener (on:1) / soltar (on:0)
    case "invest": investTalentPoint(h.classKey, d.idx==="ult" ? "ult" : (d.idx|0)); return;
    case "buff": netHostBuffPicked(from, d.id); return;
    case "needFull": netSendTo(from, netStartMessage()); return;
    case "quit":
      n.connected = false; h.isRemote = false; h._revHold = -1; h._ctxHold = null; cancelRevivesBy(h); // lo sigue un bot hasta el final
      showBanner(`${h.netName||h.cls.name} abandonó la partida (lo controla un bot)`);
      return;
  }
}
// Cambios de la sala en plena partida: desconexiones / reconexiones.
function netHostOnRoom(room){
  if(!netMatch || netMatch.ended) return;
  heroes.forEach((h,i)=>{
    if(i===0 || !netMatch.slots[i] || netMatch.slots[i].kind!=="human" || !h._net) return;
    const s = room.slots[i];
    const connected = !!(s && s.connected);
    if(!connected && h._net.connected){
      h._net.connected = false; h.isRemote = false; h._revHold = -1; h._ctxHold = null;
      cancelRevivesBy(h); // desconectarse interrumpe su revivir (el bot, si quiere, empieza de cero)
      showBanner(`${h.netName} se desconectó — lo controla un bot`);
    } else if(connected && !h._net.connected){
      h._net.connected = true; h.isRemote = true; h._net.in = null; h._net.posAuth++;
      showBanner(`${h.netName} volvió a la partida`);
      netSendTo(i, netStartMessage());
    }
  });
}
// Refuerzos entre niveles: cada humano elige el suyo; la partida sigue cuando eligieron todos.
function netHostOpenBuffs(){
  netMatch.buffPicks = {};
  netMatch.buffDeadline = performance.now() + 30000;
  for(const s of netMatch.slots){
    if(s.kind!=="human" || s.slot===0) continue;
    const h = heroes[s.slot];
    if(!h || !h._net || !h._net.connected){ netMatch.buffPicks[s.slot] = "skip"; continue; }
    const opts = [...BUFF_POOL].sort(()=>Math.random()-0.5).slice(0,3).map(b=>b.id);
    netMatch.buffPicks[s.slot] = null;
    netMatch["buffOpts"+s.slot] = opts;
    netSendTo(s.slot, {k:"buffs", opts, level:runLevel});
  }
}
function netHostBuffPicked(slot, id){
  if(!netMatch.buffPicks || netMatch.buffPicks[slot]!==null) return;
  const opts = netMatch["buffOpts"+slot] || [];
  const b = BUFF_POOL.find(x=>x.id===id && opts.includes(x.id)) || BUFF_POOL.find(x=>x.id===opts[0]);
  const h = heroes[slot];
  if(b && h) netWithHero(h, ()=>{ b.apply(runStats); refreshEquippedStats(); });
  netMatch.buffPicks[slot] = b ? b.id : "skip";
  netHostTryResume();
}
function netHostPickedLocal(){ if(netMatch.buffPicks) netMatch.buffPicks[0] = "done"; netHostTryResume(); }
function netHostTryResume(){
  const p = netMatch.buffPicks; if(!p || p[0]!=="done") { netBuffWaitingText(); return; }
  const pending = Object.keys(p).filter(k=>p[k]===null);
  if(pending.length && performance.now() < netMatch.buffDeadline){ netBuffWaitingText(pending); return; }
  for(const k of pending) netHostBuffPicked(k|0, null); // se acabó el tiempo: refuerzo automático
  netMatch.buffPicks = null;
  runLevel++;
  heroes.forEach((h,i)=>{ const s = netMatch.slots[i]; if(s && s.kind==="human" && h.alive){ h.hp = Math.min(h.maxHp, h.hp + h.maxHp*0.25); h.energy = h.maxEnergy; } });
  beginLevel();
  setState("playing");
  netBroadcast({k:"resume"});
}
function netBuffWaitingText(pending){
  const t = document.getElementById("buff-title");
  if(!t || !netMatch || !netMatch.buffPicks || netMatch.buffPicks[0]!=="done") return;
  const who = (pending || Object.keys(netMatch.buffPicks).filter(k=>netMatch.buffPicks[k]===null)).map(k=>netSlotName(k|0)).join(", ");
  t.textContent = who ? `Esperando que elijan: ${who}…` : "¡Listo!";
}
setInterval(()=>{ if(netIsHost() && netMatch.buffPicks && performance.now() > netMatch.buffDeadline) netHostTryResume(); }, 1000);

/* ---------------- snapshots (anfitrión) ---------------- */
function _netDeltaOf(lastMap, obj, full){
  const d = {}; let any = false;
  const now = performance.now();
  const fresh = full || !lastMap.__sent;
  for(const k in obj){
    if(NET_SKIP_KEYS.has(k)) continue;
    if(!fresh && (NET_KEYFRAME_ONLY.has(k) || NET_LOCAL_ANIM.has(k))) continue;
    const raw = obj[k];
    if(typeof raw==="number" && netIsDownTimer(k)){
      // temporizador que baja: se manda solo si se aparta de lo que el invitado ya predice
      const L = lastMap[k];
      if(!fresh && L && typeof L==="object" && L.t!==undefined){
        const pred = Math.max(0, L.v - (now - L.t));
        if(Math.abs(Math.max(0, raw) - pred) < 140) continue;
      }
      const v = Math.round(raw);
      lastMap[k] = {v, t:now}; d[k] = v; any = true;
      continue;
    }
    // posición y orientación: 1 decimal alcanza (y cambia menos seguido)
    const v = (typeof raw==="number" && (k==="x"||k==="y"||k==="fx"||k==="fy")) ? (isFinite(raw) ? Math.round(raw*10)/10 : 0) : netSer(raw, 1);
    if(v===undefined) continue;
    const j = (v!==null && typeof v==="object") ? JSON.stringify(v) : v;
    if(fresh || lastMap[k]!==j){ lastMap[k] = j; d[k] = v; any = true; }
  }
  lastMap.__sent = 1;
  return any ? d : null;
}
function netBuildSnapshot(full){
  const M = netMatch;
  const snap = {k:"s", n:++M.snapN};
  if(full){ M.last = {}; M.lastG = {}; M.lastH = [{},{},{},{}]; snap.full = 1; }
  // ids para referencias: todos los enemigos vivos tienen id antes de serializar
  for(const e of enemies) netIdOf(e);
  // globales
  const g = {};
  for(const k in NET_GLOBALS){
    const v = netSer(NET_GLOBALS[k][0](), 1), j = (v!==null && typeof v==="object") ? JSON.stringify(v) : v;
    if(full || M.lastG[k]!==j){ M.lastG[k] = j; g[k] = v===undefined ? null : v; }
  }
  snap.g = g;
  // héroes (índice = slot)
  snap.h = heroes.map((h,i)=> _netDeltaOf(M.lastH[i], h, full));
  // colecciones
  snap.c = {};
  for(const name in NET_COLLS){
    const arr = NET_COLLS[name][0]() || [];
    const last = M.last[name] || (M.last[name] = new Map());
    const seen = new Set(), u = [];
    for(const o of arr){
      if(name==="enemies" && !o.alive) continue;
      const id = netIdOf(o); seen.add(id);
      let lm = last.get(id); if(!lm){ lm = {}; last.set(id, lm); }
      const d = _netDeltaOf(lm, o, full);
      if(d) u.push([id, d]);
    }
    const r = [];
    for(const id of last.keys()) if(!seen.has(id)){ r.push(id); last.delete(id); }
    if(u.length || r.length || full) snap.c[name] = {u, r};
  }
  // partículas nuevas (efímeras: se mandan una vez y cada invitado las anima)
  const p = [];
  for(const pt of particles){ if(pt._s) continue; pt._s = 1; if(p.length < 90){ const s = netSer(pt, 1); if(s) p.push(s); } }
  if(p.length) snap.p = p;
  if(_netEvents.length){ snap.v = _netEvents; _netEvents = []; }
  return snap;
}
function netHostTick(){
  const now = performance.now();
  if(state!=="playing" && state!=="buff") return;
  if(now - netMatch.lastSnapAt < NET_SNAP_MS) return;
  netMatch.lastSnapAt = now;
  const key = now - netMatch.lastKeyAt > NET_KEYFRAME_MS;
  if(key) netMatch.lastKeyAt = now;
  const snap = netBuildSnapshot(key);
  const str = JSON.stringify({t:"msg", d:snap});
  if(str.length > 240000){ snap.p = []; snap.v = []; }
  netMatch.lastSnapBytes = str.length;
  netBroadcast(snap);
}

/* =====================================================================
   INVITADO
   ===================================================================== */
function netGuestStartRun(msg){
  // reconexión = misma sala y la partida anterior NO había terminado (si terminó, es una nueva)
  const reconnecting = !!(netMatch && netMatch.role==="guest" && netMatch.code===net.code && !netMatch.ended);
  netMatch = {role:"guest", mySlot:net.slot, seed:msg.seed, slots:msg.slots, arena:msg.arena, code:net.code,
    ents:new Map(), colls:{}, lastInAt:0, posAuth:-1, pendingFull:false, started:true, ended:false,
    runStartMarked: reconnecting ? true : false};
  currentArena = msg.arena;
  const mine = msg.slots[net.slot];
  if(mine) selectedClass = mine.champ;
  if(!reconnecting) markRunStartProgress(selectedClass);
  clearRunTimers(); resetRunTransients(); runEnding = false; kills = 0; runElapsedMs = 0; subjefesDefeated = 0; screenShake = 0;
  runStats = freshRunStats();
  iceWalls.length = 0; bossStrikes.length = 0;
  enemies = []; projectiles = []; particles = []; embers = []; potions = []; fireWalls = []; traps = []; chainFX = []; sparkFX = []; asesinoFx = []; axiomZones = []; sylvaRainZones = [];
  hazardZones = []; activeAxiomVfx = []; musashiAfterimages = [];
  acuaFish = []; acuaBubbles = []; acuaBubbleTimer = 0; acuaCurrent = {active:false, dx:0, dy:0, timer:0};
  vfxResetRun(); resetFeedback(); bossHudHide(); boss = null; bossActive = false; activeChampion = null;
  levelClearing = 0; levelTimer = 0; levelDuration = 1;
  // héroes en orden de slot; el propio es "player"
  heroes = msg.slots.map((s,i)=>{ const h = makeHero(s.champ, s.kind==="bot", 0, 0); h._netSlot = i; h.netName = s.name; return h; });
  player = heroes[net.slot];
  allies = heroes.filter(h=>h!==player);
  _netHeroIdx = new Map(); heroes.forEach((h,i)=>_netHeroIdx.set(h, i));
  for(const h of heroes) resetSetRunState(h);
  partyBuilt = false;
  if(floorPatterns[currentArena]){ floorPattern = floorPatterns[currentArena]; } else { buildFloorTile(); }
  if(!SPRITES.guerrero){ buildSprites(); }
  if(arenaHas("guestStart")) arenaHook("guestStart");
  netWithSeed(msg.seed, ()=> buildArenaDecor());
  for(let i=0;i<60;i++) embers.push(spawnEmber());
  updateAbilityButtons();
  if(typeof resetSkillLevelUI==="function") resetSkillLevelUI();
  const hudArenaEl = document.getElementById("hud-arena");
  if(hudArenaEl) hudArenaEl.textContent = (ARENA_MODS[currentArena]||{}).label || "";
  netApplySnapshot(msg.snap);
  if(typeof setMusicMode==="function") setMusicMode("wave", runLevel);
  setState("playing");
  netLog(reconnecting ? "RECONNECT" : "GAME_START", {arena:currentArena, slot:net.slot});
}
function netApplySnapshot(s){
  const M = netMatch;
  if(!s) return;
  if(s.full){ /* keyframe: reemplaza todo lo que haya */ }
  // 1) crear objetos nuevos (para que las referencias cruzadas se resuelvan)
  const colls = s.c || {};
  for(const name in colls){
    const map = M.colls[name] || (M.colls[name] = new Map());
    for(const [id] of colls[name].u) if(!map.has(id)){ const o = {_new:1}; map.set(id, o); if(name==="enemies") M.ents.set(id, o); }
  }
  // 2) globales
  const g = s.g || {};
  for(const k in g){ const setter = NET_GLOBALS[k]; if(setter) setter[1](netDecode(g[k])); }
  // 3) héroes
  (s.h||[]).forEach((d,i)=>{
    if(!d) return;
    const h = heroes[i]; if(!h) return;
    const own = h===player;
    for(const k in d){
      if(own && k==="x"){ h._hx = d.x; continue; }
      if(own && k==="y"){ h._hy = d.y; continue; }
      if(own && (k==="fx"||k==="fy"||k==="moving"||k==="animT"||k==="sylvaCharging")) continue;
      if(!own && (k==="x"||k==="y")){ if(k==="x") h._tx = d.x; else h._ty = d.y; continue; }
      if(!own && k==="animT") continue;
      h[k] = netDecode(d[k]);
      if(typeof d[k]==="number" && netIsDownTimer(k)) (h._tk || (h._tk = new Set())).add(k);
    }
    // posición propia: solo se corrige cuando el anfitrión dice que la movió él (posAuth nuevo)
    if(own && d._netPA!==undefined && d._netPA!==M.posAuth){ M.posAuth = d._netPA; if(h._hx!==undefined){ h.x = h._hx; h.y = h._hy; } }
    if(!own && h._tx!==undefined && (h._first===undefined)){ h.x = h._tx; h.y = h._ty; h._first = 1; }
    h.cls = heroClsOf(h); // Eren transformado usa el kit del titán
  });
  // 4) colecciones: campos
  for(const name in colls){
    const map = M.colls[name];
    for(const [id, d] of colls[name].u){
      const o = map.get(id);
      const interp = name==="enemies";
      for(const k in d){
        if(interp && (k==="x"||k==="y")){ if(k==="x") o._tx = d.x; else o._ty = d.y; if(o._new){ o[k] = d[k]; } continue; }
        if(interp && k==="animT" && !o._new) continue;
        o[k] = netDecode(d[k]);
        if(typeof d[k]==="number" && netIsDownTimer(k)) (o._tk || (o._tk = new Set())).add(k);
      }
      delete o._new;
    }
  }
  // 5) efectos del cuadro (antes de sacar a los muertos: su animación de muerte los necesita)
  if(s.v) for(const ev of s.v) netPlayEvent(ev);
  // 6) bajas
  for(const name in colls){
    const map = M.colls[name];
    for(const id of colls[name].r){ map.delete(id); if(name==="enemies") M.ents.delete(id); }
    NET_COLLS[name][1]([...map.values()]);
  }
  // 7) partículas nuevas
  if(s.p) for(const pt of s.p){ const o = netDecode(pt); o._s = 1; particles.push(o); }
  allies = heroes.filter(h=>h!==player);
}
function netGuestOnMsg(from, d){
  if(!d) return;
  switch(d.k){
    case "start": netGuestStartRun(d); return;
    case "s":
      if(!netMatch || netMatch.role!=="guest"){ if(!netMatch) netSendToHost({k:"needFull"}); return; }
      netApplySnapshot(d); return;
    case "buffs": netGuestShowBuffs(d); return;
    case "resume": if(netIsGuest() && state==="buff") setState("playing"); return;
    case "end": netGuestEnd(d); return;
  }
}
// Cada cuadro del invitado (reemplaza a update(): no hay simulación local de la partida).
function netGuestUpdate(dt){
  runElapsedMs += dt;
  vfxFrame(dt); vfxUpdate(dt); updateGore(dt); updateFloatTexts(dt);
  if(screenShake>0) screenShake = Math.max(0, screenShake - dt*0.03);
  const me = player;
  // predicción del movimiento propio: responde al instante; el anfitrión solo lo corrige si
  // algo externo lo movió (posAuth) o si el movimiento no fue posible.
  if(me){
    me.moving = false;
    const spd = me._spd===undefined ? me.baseSpeed : me._spd;
    if(me.alive && Math.hypot(joyVec.x,joyVec.y) > 0.08){
      const l = Math.hypot(joyVec.x, joyVec.y);
      facing = {x:joyVec.x/l, y:joyVec.y/l};
      me.fx = facing.x; me.fy = facing.y;
      if(spd>0){
        me.x += joyVec.x*spd*dt/1000; me.y += joyVec.y*spd*dt/1000;
        clampToArena(me); resolveWallCollision(me);
        me.moving = !me.fused; me.animT += dt;
      }
    }
    if(me.sylvaCharging) me.sylvaChargeTimer = (me.sylvaChargeTimer||0) + dt;
  }
  const k = Math.min(1, dt/90);
  for(const h of heroes){
    if(h===me) continue;
    if(h._tx!==undefined){
      const dx = h._tx-h.x, dy = h._ty-h.y;
      if(Math.abs(dx)+Math.abs(dy) > 400){ h.x = h._tx; h.y = h._ty; } else { h.x += dx*k; h.y += dy*k; }
    }
    if(h.moving) h.animT += dt;
  }
  for(const e of enemies){
    if(e._tx!==undefined){
      const dx = e._tx-e.x, dy = e._ty-e.y;
      if(Math.abs(dx)+Math.abs(dy) > 500){ e.x = e._tx; e.y = e._ty; } else { e.x += dx*k; e.y += dy*k; }
    }
    e.animT = (e.animT||0) + dt;
    if(e.skillAnim) e.skillAnim.t += dt;
    if(e.fxAnim) e.fxAnim.t += dt;
  }
  for(const p of projectiles){ if(p.vx!==undefined){ p.x += p.vx*dt/1000; p.y += p.vy*dt/1000; } }
  // temporizadores que el anfitrión no manda cuadro a cuadro (ver netIsDownTimer)
  for(const h of heroes) netTickTimers(h, dt);
  for(const name in netMatch.colls){ for(const o of netMatch.colls[name].values()) netTickTimers(o, dt); }
  for(const p of potions){ p.phase = (p.phase||0) + dt/240; }
  stepParticles(dt);
  for(const em of embers){ em.y += em.vy*dt/1000; em.phase += dt/1000; if(em.y < player.y-700) em.y = player.y+700; }
  updateAcuaAmbience && updateAcuaAmbience(dt);
  aidAmbUpdate && aidAmbUpdate(dt);
  if(arenaHas("guestUpdate")) arenaHook("guestUpdate", dt); // animación de mecanismos propios
  netGuestSendInput(false);
  updateBossHud(dt);
  updateHUD();
}
function netTickTimers(o, dt){
  if(!o || !o._tk) return;
  for(const k of o._tk){ const v = o[k]; if(typeof v==="number" && v>0) o[k] = Math.max(0, v-dt); }
}
function netGuestSendInput(force){
  const now = performance.now();
  if(!force && now - netMatch.lastInAt < NET_INPUT_MS) return;
  netMatch.lastInAt = now;
  const me = player; if(!me) return;
  netSendToHost({k:"in", x:Math.round(me.x*10)/10, y:Math.round(me.y*10)/10, fx:Math.round(me.fx*100)/100, fy:Math.round(me.fy*100)/100,
    mv:me.moving?1:0, b:basicHeld?1:0, pa:netMatch.posAuth});
}
// Acciones del invitado -> intención al anfitrión (llamadas desde useSkill/useUltimate/etc.)
function netGuestCast(idx, aim){
  if(idx===0 && erenHookCanRedirect(player)){ netSendToHost({k:"cast", idx, aim: aim ? {x:Math.round(aim.x), y:Math.round(aim.y), dx:aim.dx, dy:aim.dy} : null}); return true; }
  const sk = player.cls.skills[idx];
  if(!player.alive || !sk || player.cds[idx]>0 || player.energy < sk.cost) return false;
  netSendToHost({k:"cast", idx, aim: aim ? {x:Math.round(aim.x), y:Math.round(aim.y), dx:aim.dx, dy:aim.dy} : null});
  return true;
}
function netGuestShowBuffs(d){
  setState("buff");
  document.getElementById("buff-title").textContent = `Nivel ${d.level} superado — elige tu refuerzo`;
  const cards = document.getElementById("buff-cards");
  cards.innerHTML = "";
  (d.opts||[]).forEach(id=>{
    const b = BUFF_POOL.find(x=>x.id===id); if(!b) return;
    const el = document.createElement("div");
    el.className = "buff-card";
    el.innerHTML = `<div class="ico">${b.ico}</div><div class="buff-name">${b.name}</div><div class="buff-desc">${b.desc}</div>`;
    el.addEventListener("click", ()=>{
      netSendToHost({k:"buff", id});
      cards.innerHTML = `<div class="net-wait">Elegiste <b>${b.name}</b>. Esperando al resto del equipo…</div>`;
    });
    cards.appendChild(el);
  });
}
function netGuestEnd(d){
  if(!netMatch || netMatch.ended) return;
  if(d.snap) netApplySnapshot(d.snap);
  netMatch.ended = true;
  if(d.victory){
    // la arena cuenta como superada para el invitado solo si ya la tenía desbloqueada: el
    // multijugador no sirve para saltearse la campaña.
    if(isArenaUnlocked(currentArena)){
      save.arenasCleared = save.arenasCleared || {};
      save.arenasCleared[currentArena] = true;
    }
    grantGold(80);
    persist();
    showVictoryScreen();
  } else {
    showGameOverScreen();
  }
}

/* =====================================================================
   FIN DE PARTIDA / SALIDA
   ===================================================================== */
// El anfitrión llama esto justo antes de mostrar su pantalla de victoria/derrota.
function netHostAnnounceEnd(victory){
  if(!netIsHost() || netMatch.ended) return;
  netMatch.ended = true;
  const snap = netBuildSnapshot(true);
  netBroadcast({k:"end", victory:!!victory, snap});
  netLog(victory ? "GAME_VICTORY" : "GAME_DEFEAT");
}
// Después de cerrar las pantallas de fin: se restauran los datos del anfitrión y la sala vuelve
// a esperar (mismo código de invitación).
function netFinishMatch(){
  if(!netMatch) return;
  const wasHost = netIsHost();
  netRestoreBackups();
  netMatch = null;
  persistNow();
  if(wasHost && net.room) netSend({t:"lobby"});
}
function netQuitMatch(){
  if(!netMatch) return;
  if(netIsGuest()){ netSendToHost({k:"quit"}); }
  const wasHost = netIsHost();
  netRestoreBackups();
  netMatch = null;
  if(wasHost){ netLeaveRoom(); } // el anfitrión se va: la sala se cierra para todos
  else { netLeaveRoom(); }
}
// Conexión perdida / sala cerrada en plena partida
function netOnMatchClosed(reason, role){
  if(!netMatch) return;
  if(netIsHost()){
    // se cayó el servidor: la partida sigue en este dispositivo, los invitados pasan a bots
    for(const h of heroes){ if(h._net){ h._net.connected = false; h.isRemote = false; } }
    showBanner("Conexión perdida: seguís jugando, tus amigos pasan a ser bots");
    netMatch.role = "host-offline";
    return;
  }
  // invitado: el anfitrión se fue o no hubo forma de reconectar
  netMatch = null;
  clearRunTimers();
  setState("gameover");
  document.getElementById("go-title").textContent = reason==="host_left" ? "El anfitrión se desconectó" : "Se perdió la conexión";
  document.getElementById("go-stats").textContent = "La partida terminó";
  document.getElementById("go-progress").innerHTML = "La XP y el oro que ganaste hasta ahora ya quedaron guardados (sin castigo).";
  document.getElementById("retry-btn").classList.add("hidden");
}

// Llamado por el loop después de update(): el anfitrión manda el estado y controla la derrota.
function netTick(dt){
  if(!netMatch) return;
  if(netMatch.role==="host"){ netHostTick(); if(state==="playing") netHostCheckDefeat(); }
}
netHookEvents();
