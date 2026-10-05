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
const NET_SKIP_KEYS = new Set(["_portPrevX","_portPrevY","portMoveDX","portMoveDY","_portMarks","cls","_ap","_net","_tx","_ty","_s","hitSet","onHit","fn","_spdAt","_hx","_hy","_tk",
  // internos de la IA/navegación del anfitrión: el invitado no los usa
  "_navT","_nmx","_nmy","_navBlocked","_kbRx","_kbRy","_tgt","_tgtT","_dangerT","atkCd","recentDamage","_hitSfxAt","_hurtSfxAt","_setFrame","path",
  // estado de animación que calcula el propio renderizador de cada cliente
  "_an",
  // atlas de guardianes (champion-sprites.js): vista/espejo, duración del ataque y relojes de render locales
  "_pdir","_pleft","_aPrev","_aDur","_deadAt","_pcuSeen","_pcuLocal",
  // revivir: el candado/progreso viaja (_reviveBy/_reviveT/_reviveDur); esto es interno del anfitrión
  "_revTouchAt","_revHold",
  // acción contextual: el progreso viaja en el estado de la arena; esto es interno del anfitrión
  "_ctxHold","_ctxGoal","_ctxGoalT","_ctxProgT","_ctxBestD","_ctxUnstick","_ctxSide",
  // Gélida: el frío viaja en el estado de la arena; esto es interno del anfitrión / de la IA
  "_cold","_stillT","_cx","_cy","_hieWarm","_hieSide","_coldHits",
  // La Fortaleza: forma caminable cacheada (se recalcula en cada cliente) e internos del anfitrión
  "_fs","_strT","_fortStranded","_ux","_uy","_ut","_stk",
  // estado propio del RENDERIZADOR de cada cliente (lo escribe el dibujo, no la simulación). Mandarlo pisaba
  // el del invitado: _deadAt/_diedAt vienen en el reloj del anfitrión (performance.now de OTRA página), así
  // que el guardián caído se veía parado/torcido o sin su animación de muerte; y la dirección del dibujo
  // (_pdir/_pleft/_rdir/_rfaceL) y la duración del golpe (_aPrev/_aDur/_pkAtk*) saltaban a la del anfitrión.
  "_deadAt","_diedAt","_pdir","_pleft","_rdir","_rfaceL","_aPrev","_aDur","_pkAtkLast","_pkAtkMax"]);
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
  portadorObjects:   [()=>portadorObjects, a=>{ portadorObjects = a; }],
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
  subjefesDefeated:[()=>subjefesDefeated, v=>{ subjefesDefeated = v; }], // (screenShake ya no viaja: cada pantalla tiembla con SUS eventos, ver juice.js)
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
  "setMusicMode","updateArenaRuleChip","drawAxiomVfxBurst","arenaTitleCard","addDecal","goreChunks","vfxCastFlash","vfxChampionSignature","vfxFrostCrown","vfxSkillCone","crystalAward","crystalSteal"];
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
// Eventos que no se pueden perder aunque el cuadro venga cargado (recompensas del invitado, muertes,
// avisos del jefe/arena). Antes TODO se cortaba a los 260 eventos por snapshot: en el barrido de fin
// de nivel (una muerte + una XP por enemigo y por invitado) el invitado perdía parte de su XP y los
// últimos enemigos desaparecían sin su muerte. Los cosméticos (números, chispas, sonidos) siguen con tope.
const NET_KEEP_EVENTS = new Set(["xp","gold","useXp","hurt","vfxOnDeath","bossHudShow","bossHudHide","bossHudPhase","bossHudHint",
  "showBanner","arenaTitleCard","crystalAward","crystalSteal","setMusicMode","updateArenaRuleChip",
  "vfxChampionSignature","vfxFrostCrown","vfxSkillCone",
  "groundLootDrop","endlessGuestReward"]); // botín del piso de cada invitado (ground-loot.js) y recompensas de la Horda Infinita
let _netRewardIdx = new Map(); // XP/oro del mismo invitado en el mismo snapshot: un solo evento con la suma
function netRecord(name, args, to){
  if((name==="xp" || name==="gold") && to!==undefined && typeof args[0]==="number"){
    const key = name + to + (args[1]||""), i = _netRewardIdx.get(key);
    if(i!==undefined && _netEvents[i]){ _netEvents[i][1][0] += args[0]; return; }
    _netRewardIdx.set(key, _netEvents.length); _netEvents.push([name, args.slice(), to]); return;
  }
  if(_netEvents.length > (NET_KEEP_EVENTS.has(name) ? 1200 : 260)) return;
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
  ctx.font = pxFont(14); ctx.textAlign = "center";
  heroes.forEach((h,i)=>{
    const s = netMatch.slots && netMatch.slots[i];
    if(!s || h===player || (s.kind!=="human" && s.kind!=="bot")) return;
    const y = h.y - 74;
    const label = s.kind==="bot" ? `BOT · ${h.cls ? (h.cls.hudName || h.cls.name) : ""}` : `P${i+1} ${s.name}`;
    ctx.fillStyle = "rgba(0,0,0,0.55)"; const w = ctx.measureText(label).width + 10;
    ctx.fillRect(h.x - w/2, y - 12, w, 16);
    ctx.fillStyle = h.alive ? (s.kind==="bot" ? "#c9c9c9" : (NET_SLOT_COLORS[i]||"#8fe0ff")) : "#ff9a7a";
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
      case "xp": { const lv = grantXP(args[1] || selectedClass, args[0]); if(lv) netLog("LEVEL_UP", {level:save.champions[selectedClass].level}); return; }
      case "gold": grantGold(args[0]); return;
      case "hurt": registerPlayerHurt(args[0], {x:args[1], y:args[2]}); return;
      case "useXp": gainSkillUseXp(args[1] || selectedClass, args[0]); return;
      case "vfxOnDeath":
        if(typeof codexNoteKill==="function" && args[0] && args[0].type && (!divinaMode || (ENEMY_BASE[args[0].type]||{}).rank==="jefe")) codexNoteKill(args[0].type); // Códice (invitado)
        // el anfitrión no manda a los muertos (sale de la lista): acá seguía "vivo" y la animación de muerte
        // usaba los cuadros de caminar/quieto en vez de los de muerte
        if(args[0] && typeof args[0]==="object"){ args[0].alive = false; args[0].hp = 0; }
        break;
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
    const pool = Object.keys(CLASSES).filter(k=>free(k) && CLASSES[k].roleCategory===role && championBotEligible(k));
    if(pool.length) out.push(pool[(Math.random()*pool.length)|0]);
  }
  while(out.length<n){
    const pool = Object.keys(CLASSES).filter(k=>free(k) && championBotEligible(k));
    if(!pool.length) break;
    out.push(pool[(Math.random()*pool.length)|0]);
  }
  return out;
}
// Datos de guardián que manda cada invitado (solo lo que el anfitrión necesita para simularlo:
// nivel, habilidades, talentos y los objetos EQUIPADOS; nunca el resto del inventario).
function netBuildLoadout(key,nested){
  const k = key || selectedClass, c = save.champions[k];
  const eq = Object.assign(mkEquipment(), c.equipment||{});
  const items = itemPoolFor(k).filter(it=>Object.values(eq).includes(it.uid));
  return {reserve:null, champ:k, level:c.level, xp:c.xp, talentPoints:c.talentPoints||0,
    skillMastery:c.skillMastery, ultMastery:c.ultMastery, talents:c.talents||mkTalentState(), equipment:eq, items,
    skin:(typeof champSkinId==="function" ? champSkinId(k) : null), // cosmético: la skin de SU guardado (sala)
    cosmeticSkin:(typeof cosmeticSkinEquippedId==="function" ? (cosmeticSkinEquippedId(k) || (c.cosmeticSkin==="" ? "" : null)) : null),
    croma:(typeof cromaEquippedId==="function" ? cromaEquippedId(k) : null), // cosmético: su croma (js/systems/cromas.js)
    crystal:(typeof resonanceChosen==="function" ? resonanceChosen() : null), // el cristal que lleva (crystal-resonance.js)
    open:ARENA_ORDER.filter(a=>isArenaUnlocked(a))}; // SUS arenas abiertas: el anfitrión avisa en la Sala si alguna no le cuenta para la campaña
}
function netLoadoutRecord(L){
  const rec = mkChampion(true);
  rec.level = L.level|0 || 1; rec.xp = L.xp||0; rec.talentPoints = L.talentPoints|0;
  if(Array.isArray(L.skillMastery)) rec.skillMastery = [0,1,2].map(i=>Object.assign(mkMastery(), L.skillMastery[i]||{}));
  if(L.ultMastery) rec.ultMastery = Object.assign(mkMastery(), L.ultMastery);
  if(L.talents) rec.talents = Object.assign(mkTalentState(), L.talents);
  rec.loadoutItems = Array.isArray(L.items) ? L.items.slice(0, 6) : []; // sus objetos equipados (ver itemPoolFor)
  rec.equipment = Object.assign(mkEquipment(), L.equipment||{});
  // su croma: solo un id que exista y sea de ese guardián (cosmético; la compra la valida SU juego)
  if(L.croma && typeof CROMA_SKINS!=="undefined" && CROMA_SKINS[L.croma] && CROMA_SKINS[L.croma].champ===L.champ) rec.croma = L.croma;
  // Cosmetic selection carries no equipment or modifiers. Validate catalog + champion.
  if(L.cosmeticSkin === "") rec.cosmeticSkin = "";
  else if(typeof L.cosmeticSkin === "string" && typeof SET_SKINS!=="undefined"){
    const d = Object.prototype.hasOwnProperty.call(SET_SKINS, L.cosmeticSkin) && SET_SKINS[L.cosmeticSkin];
    if(d && (!d.champ || d.champ===L.champ)) rec.cosmeticSkin = L.cosmeticSkin;
  }
  return rec;
}
// Mientras dura la partida, save.champions[guardián del invitado] apunta a SU loadout (así toda
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
    if(L && L.reserve && L.reserve.champ===s.reserve){ netMatch.backups[s.reserve]=save.champions[s.reserve]; save.champions[s.reserve]=netLoadoutRecord(L.reserve); }
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
  if(!duoValid() || netDuplicateChamps().length || humans.some(s=>s&&s.slot>0&&!netDuoLoadoutValid(s.slot))){ showNetToast("Cada jugador debe elegir un campeón, sin repetir entre jugadores."); return false; }
  const humanChamps = humans.filter(Boolean).map(s=>s.slot===0 ? selectedClass : s.champ);
  const bots = netPickBots(humanChamps, 4 - humans.filter(Boolean).length);
  const slots = [0,1,2,3].map(i=>{
    const s = humans[i];
    if(s) return {slot:i, kind:"human", champ: i===0 ? selectedClass : s.champ, name:s.name, level:s.level};
    return {slot:i, kind:"bot", champ:bots.shift(), name:"BOT"};
  });
  const seed = (Math.random()*0x7fffffff)|0 || 7;
  netMatch = {role:"host", mySlot:0, seed, slots, arena:currentArena, loadouts:(netLobby.loadouts||{}),
    diff: typeof diffEffective==="function" ? diffEffective(currentArena) : "normal", // la dificultad la elige el anfitrión
    backups:null, recording:false, lastSnapAt:0, lastKeyAt:0, snapN:0, last:{}, lastG:{}, lastH:[{},{},{},{}], ents:new Map(),
    buffPicks:null, ended:false, startedAt:performance.now()};
  netSend({t:"start"});
  netLobby.matches++; netLobby.lastArena = currentArena;
  netApplyGuestLoadouts();
  lobbyAllies = slots.slice(1).map(s=>s.champ);
  startRun(1);
  // héroes: índice = slot
  _netHeroIdx = new Map(); heroes.forEach((h,i)=>_netHeroIdx.set(h, i));
  heroes.forEach((h,i)=>{
    const s = slots[i]; h._netSlot = i; h.netName = s.name; h.netFounder = (net.room && net.room.slots[i] && net.room.slots[i].founder) || null; // verificado por el relay
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
  // lay: trazado al azar (js/arenas/arena-layouts.js) — lo decide el anfitrión
  return {k:"start", arena:currentArena, seed:netMatch.seed, diff:netMatch.diff || "normal", lay:(typeof mapLayoutOn==="function" && mapLayoutOn()) ? 1 : 0, slots:netMatch.slots, snap:netBuildSnapshot(true, true)};
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
      // la mirada sale del joystick solo mientras camina (igual que el jugador local): quieto, mira a
      // lo que ataca. Antes se pisaba cada cuadro con la del joystick y el guardián del invitado
      // parpadeaba entre su objetivo y la última dirección en que caminó con cada golpe.
      if(inp.mv){ h.fx = inp.fx; h.fy = inp.fy; }
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
// Defeat only when the whole team is down: living bots can revive humans.
function netTeamWiped(){
  return !heroes.some(h=>h.alive);
}
function netHostCheckDefeat(){
  if(!netIsHost() || runEnding) return;
  if(netTeamWiped()){
    runEnding = true; // corta aparición de enemigos, refuerzos y revivir (ver update/updateRevives)
    netLog("TEAM_WIPE", {level:runLevel});
    showBanner("TEAM WIPE — todo el equipo cayó");
    runLaterFlow(650, ()=>{ if(state==="playing") showGameOverScreen(); });
  }
}
// Mensajes de los invitados
// Apuntado a mano que manda el invitado (mantener y arrastrar el botón, js/core/aim.js): punto del mundo y
// dirección. Se valida antes de usarlo; si viene roto, la habilidad sale con el autoapuntado (como un toque).
function netAimSafe(a){
  if(!a || typeof a!=="object") return null;
  const x = +a.x, y = +a.y; let dx = +a.dx, dy = +a.dy;
  if(!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(dx) || !Number.isFinite(dy)) return null;
  const l = Math.hypot(dx, dy); if(l < 1e-3) return null;
  return {x, y, dx:dx/l, dy:dy/l};
}
function netHostOnMsg(from, d){
  if(d && d.k==="loadout"){
    netLobby.loadouts[from] = d.L;
    if(typeof skinFxPreloadIds==="function" && d.L) skinFxPreloadIds([d.L.skin]); // sus efectos de skin, antes de empezar
    if(typeof netHostBroadcastCos==="function") netHostBroadcastCos(false); // su skin, para todos
    if(!netMatch && typeof netRefreshLobby==="function") netRefreshLobby();
    return;
  }
  if(!d || !netMatch) return;
  const h = heroes && heroes[from];
  if(!h || !h._net) return;
  const n = h._net;
  switch(d.k){
    case "in": n.in = d; n.basic = !!d.b; return;
    case "cast":
      if(state!=="playing" || !h.alive) return;
      netWithHero(h, ()=>{ if(useSkill(d.idx|0, netAimSafe(d.aim))) netEmitTo(from, "useXp", [d.idx|0,h.classKey]); });
      return;
    case "ult":
      if(state==="playing" && h.alive){
        // la XP de uso de la ulti va al guardado del invitado (antes se sumaba solo a la copia de su
        // guardián en el anfitrión, que se descarta al terminar: la ulti nunca subía de uso en cooperativo)
        const u0 = h.ultCharge, c0 = h.ultCd||0;
        netWithHero(h, ()=> useUltimate());
        if(h.ultCharge < u0 || (h.ultCd||0) > c0) netEmitTo(from, "useXp", ["ult",h.classKey]);
      }
      return;
    case "pact": if(state==="playing" && h.alive) nigroTogglePact(h); return; // Nigromante invitado
    case "emerg": emergUse(h); return; // curación de emergencia del invitado
    case "sylva":
      if(state!=="playing" || !h.alive) return;
      if(d.cancel){ h.sylvaCharging = false; h.sylvaChargeTimer = 0; return; } // el invitado canceló el apuntado: no dispara
      netWithHero(h, ()=>{ if(d.on) sylvaChargeStart(); else sylvaChargeRelease(netAimSafe(d.aim)); });
      return;
    case "revive": if(duoEnabled()) return; // el invitado mantiene (on:1) o suelta (on:0) el botón; el progreso es del anfitrión (updateRevives)
      if(!d.on){ h._revHold = -1; cancelRevivesBy(h); return; }
      if(heroes[d.slot|0] && heroes[d.slot|0]!==h) h._revHold = d.slot|0;
      return;
    case "ctx": ctxNetMsg(h, d); return; // acción contextual: mantener (on:1) / soltar (on:0)
    case "invest": investTalentPoint(h.classKey, d.idx==="ult" ? "ult" : (d.idx|0)); return;
    case "buff": netHostBuffPicked(from, d.id); return;
    case "loading": // el invitado todavía baja el arte de la arena (netGuestHoldStart): lo maneja un bot hasta que entre
      if(n.connected){
        n.connected = false; n.loading = true; h.isRemote = false; h._revHold = -1; h._ctxHold = null; cancelRevivesBy(h);
        showBanner(`${h.netName||h.cls.name} está cargando la arena — lo maneja un bot`);
      }
      return;
    case "needFull":
      if(n.loading){ n.loading = false; n.connected = true; h.isRemote = true; n.in = null; n.posAuth++; showBanner(`${h.netName||h.cls.name} entró a la partida`); }
      netSendTo(from, netStartMessage()); return;
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
    if(h._net.loading){ if(!connected) h._net.loading = false; return; } // cargando el arte: entra con needFull
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
    // cartas armadas con SU guardián (h): 1-2 refuerzos que transforman sus habilidades + genéricos
    const endless = typeof endlessOn==="function" && endlessOn();
    const opts = boonBuildOffers(h, endless ? endlessBuffPool() : BUFF_POOL, endless);
    netMatch.buffPicks[s.slot] = null;
    netMatch["buffOpts"+s.slot] = opts;
    netSendTo(s.slot, {k:"buffs", opts, level:runLevel});
  }
}
function netHostBuffPicked(slot, id){
  if(!netMatch.buffPicks || netMatch.buffPicks[slot]!==null) return;
  const opts = netMatch["buffOpts"+slot] || [];
  const pick = opts.includes(id) ? id : opts[0]; // solo una de SUS cartas; sin elección (tiempo): la primera
  const h = heroes[slot];
  const ok = !!pick && !!h && (!!boonParseOpt(pick) || !!BUFF_POOL.find(x=>x.id===pick));
  if(ok) netWithHero(h, ()=>{ buffApplyOpt(h, pick); if(!boonParseOpt(pick) && typeof endlessOn==="function" && endlessOn()) endlessOnBuffPicked(h, pick); });
  netMatch.buffPicks[slot] = ok ? pick : "skip";
  netHostTryResume();
}
function netHostPickedLocal(){ if(netMatch.buffPicks) netMatch.buffPicks[0] = "done"; netHostTryResume(); }
function netHostTryResume(){
  const p = netMatch.buffPicks; if(!p || p[0]!=="done") { netBuffWaitingText(); return; }
  const pending = Object.keys(p).filter(k=>p[k]===null);
  if(pending.length && performance.now() < netMatch.buffDeadline){ netBuffWaitingText(pending); return; }
  for(const k of pending) netHostBuffPicked(k|0, null); // se acabó el tiempo: refuerzo automático
  netMatch.buffPicks = null;
  const endless = typeof endlessOn==="function" && endlessOn();
  if(!endless) runLevel++;
  heroes.forEach((h,i)=>{ const s = netMatch.slots[i]; if(s && s.kind==="human" && h.alive){ h.hp = Math.min(h.maxHp, h.hp + h.maxHp*0.25); h.energy = h.maxEnergy; } });
  if(endless){ setState("playing"); endlessAdvance(); } // Horda Infinita: próxima ronda (y cada 5, la Cicatriz a otra arena)
  else { beginLevel(); setState("playing"); }
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
      // temporizador que baja: se manda solo si se aparta de lo que el invitado ya predice, o si SUBIÓ
      // desde el snapshot anterior (se reinició). Antes solo contaba el apartamiento (>= 140 ms): un golpe
      // (hitFlash 90-180 ms, hurtTimer 160 ms) casi nunca llegaba y el invitado no veía el destello ni la
      // pose de dolor de enemigos, guardianes e invocaciones.
      const L = lastMap[k];
      if(!fresh && L && typeof L==="object" && L.t!==undefined){
        const rose = raw > L.r + 0.5; L.r = raw;
        const pred = Math.max(0, L.v - (now - L.t));
        if(!rose && Math.abs(Math.max(0, raw) - pred) < 140) continue;
      }
      const v = Math.round(raw);
      lastMap[k] = {v, t:now, r:raw}; d[k] = v; any = true;
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
function netBuildSnapshot(full, forOne){ // forOne: estado para UN invitado (entra/vuelve): no se lleva los eventos ni las partículas de todos
  const M = netMatch;
  const snap = {k:"s", n:++M.snapN};
  // el estado para UN invitado se arma con referencias propias: antes pisaba las del resto y el
  // siguiente snapshot le llegaba a los demás como diferencia contra un estado que nunca vieron
  // (enemigos nuevos sin tipo ni vida, bajas que no llegaban: fantasmas quietos hasta 10 s)
  const saved = forOne ? [M.last, M.lastG, M.lastH] : null;
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
  if(forOne){ M.last = saved[0]; M.lastG = saved[1]; M.lastH = saved[2]; return snap; }
  const p = [];
  for(const pt of particles){ if(pt._s) continue; pt._s = 1; if(p.length < 90){ const s = netSer(pt, 1); if(s) p.push(s); } }
  if(p.length) snap.p = p;
  if(_netEvents.length){ snap.v = _netEvents; _netEvents = []; _netRewardIdx = new Map(); }
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
  if(str.length > 240000){ snap.p = []; snap.v = (snap.v||[]).filter(ev=>NET_KEEP_EVENTS.has(ev[0])); } // lo cosmético se descarta; recompensas y muertes, no
  netMatch.lastSnapBytes = str.length;
  netBroadcast(snap);
}

/* =====================================================================
   INVITADO
   ===================================================================== */
function netGuestStartRun(msg){
  // reconexión = misma sala y la partida anterior NO había terminado (si terminó, es una nueva)
  const reconnecting = !!(netMatch && netMatch.role==="guest" && netMatch.code===net.code && !netMatch.ended);
  netMatch = {role:"guest", mySlot:net.slot, seed:msg.seed, slots:msg.slots, arena:msg.arena, code:net.code, diff:msg.diff || "normal", lay:!!msg.lay,
    ents:new Map(), colls:{}, lastInAt:0, posAuth:-1, pendingFull:false, started:true, ended:false,
    runStartMarked: reconnecting ? true : false};
  currentArena = msg.arena;
  const mine = msg.slots[net.slot];
  if(mine) selectedClass = mine.champ;
  if(!reconnecting) markRunStartProgress(selectedClass);
  if(typeof questsOnRunStart==="function") questsOnRunStart(reconnecting); // logros/desafíos del invitado: cuentan en SU guardado
  clearRunTimers(); resetRunTransients(); runEnding = false; if(typeof _arenaExitDone!=="undefined") _arenaExitDone = false; kills = 0; runElapsedMs = 0; subjefesDefeated = 0; screenShake = 0;
  runStats = freshRunStats();
  iceWalls.length = 0; bossStrikes.length = 0;
  enemies = []; projectiles = []; particles = []; embers = []; potions = []; fireWalls = []; traps = []; chainFX = []; sparkFX = []; asesinoFx = []; axiomZones = []; sylvaRainZones = [];
  hazardZones = []; activeAxiomVfx = []; musashiAfterimages = [];
  acuaFish = []; acuaBubbles = []; acuaBubbleTimer = 0; acuaCurrent = {active:false, dx:0, dy:0, timer:0};
  vfxResetRun(); resetFeedback(); bossHudHide(); if(typeof crystalReset==="function") crystalReset(); boss = null; bossActive = false; activeChampion = null;
  levelClearing = 0; levelTimer = 0; levelDuration = 1;
  // héroes en orden de slot; el propio es "player"
  heroes = msg.slots.map((s,i)=>{ const h = makeHero(s.champ, s.kind==="bot", 0, 0); h._netSlot = i; h.netName = s.name; h.netFounder = (net.room && net.room.slots[i] && net.room.slots[i].founder) || null; return h; });
  player = heroes[net.slot];
  duoInitRun();
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
  if(typeof diffHudMark==="function") diffHudMark();
  netApplySnapshot(msg.snap);
  if(typeof setMusicMode==="function") setMusicMode("wave", runLevel);
  setState("playing");
  netLog(reconnecting ? "RECONNECT" : "GAME_START", {arena:currentArena, slot:net.slot});
}
// El anfitrión arrancó y a este invitado todavía le falta bajar el arte de las arenas (segunda tanda de
// lazy-images.js: enemigos, jefes, escenarios, efectos). Entrar así era jugar con la horda dibujada con
// los sprites de respaldo, jefes invisibles y efectos que no aparecían (celular con datos móviles). Igual
// que la partida local, se espera a que esté todo: mientras tanto su guardián lo maneja un bot en el
// anfitrión ({k:"loading"}) y al terminar se pide el estado de ese momento ({k:"needFull"}).
function netGuestHoldStart(msg){
  const first = !netLobby.heldStart, newMatch = !first && netLobby.heldStart.seed!==msg.seed;
  netLobby.heldStart = msg; netLobby.heldCode = net.code;
  netGuestLoadingUI(assetsRestPct());
  if(first || newMatch) netSendToHost({k:"loading"}); // (otra partida mientras seguía cargando: que la sepa también)
  if(!first) return;
  whenAssetsReady(()=>{
    const m = netLobby.heldStart, code = netLobby.heldCode;
    netLobby.heldStart = null; netGuestLoadingUI(null);
    if(!m || net.role!=="guest" || !net.room || net.code!==code || (netMatch && netMatch.role==="guest" && !netMatch.ended)) return;
    netSendToHost({k:"needFull"});
  }, pct=>{ if(netLobby.heldStart) netGuestLoadingUI(pct); });
}
function netGuestLoadingUI(pct){
  let el = document.getElementById("net-loading");
  if(pct===null){ if(el) el.classList.add("hidden"); return; }
  if(!el){
    el = document.createElement("div"); el.id = "net-loading";
    el.innerHTML = `<div class="nl-title">¡La partida ya empezó!</div><div class="nl-pct"></div>` +
      `<div class="nl-sub">Tu guardián lo maneja un bot hasta que termine de bajar el arte de la arena.</div>`;
    document.body.appendChild(el);
  }
  el.classList.remove("hidden");
  el.querySelector(".nl-pct").textContent = "Preparando la arena… " + pct + " %";
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
    if(d.classKey && d.classKey!==h.classKey){ const keep={_duoStart:h._duoStart,_duoReserve:h._duoReserve,_duoSpawn:h._duoSpawn,_netSlot:h._netSlot,netName:h.netName}; const fresh=makeHero(d.classKey,h.isBot,d.x||h.x,d.y||h.y); for(const k of Object.keys(h)) delete h[k]; Object.assign(h,fresh,keep); if(own){ selectedClass=d.classKey; runStartXp=duoProgress[selectedClass]??totalXpForChamp(selectedClass); updateAbilityButtons(); resetSkillLevelUI(); } }
    for(const k in d){
      if(own && k==="x"){ h._hx = d.x; continue; }
      if(own && k==="y"){ h._hy = d.y; continue; }
      // quieto, la mirada propia la decide el anfitrión (se da vuelta hacia lo que ataca, como en solitario)
      if(own && (k==="fx"||k==="fy")){ if(!h.moving && typeof d[k]==="number") h[k] = d[k]; continue; }
      if(own && (k==="moving"||k==="animT"||k==="sylvaCharging")) continue;
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
      if(o._new && name==="enemies" && o.type && typeof codexNoteSeen==="function") codexNoteSeen(o.type); // Códice (invitado), igual que spawnEnemy en el anfitrión
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
    case "cos": netLobby.duos=d.duos||{}; netLobby.cos = d.m || {}; if(d.d) netLobby.diff = d.d; if(typeof skinFxPreloadIds==="function") skinFxPreloadIds(Object.values(netLobby.cos)); if(typeof netRefreshLobby==="function") netRefreshLobby(); return; // skins de la sala
    case "start":
      if(typeof assetsAllReady==="function" && !assetsAllReady()){ netGuestHoldStart(d); return; }
      netGuestStartRun(d); return;
    case "s":
      if(!netMatch || netMatch.role!=="guest"){ if(!netMatch && !netLobby.heldStart) netSendToHost({k:"needFull"}); return; }
      netMatch.lastRxAt = performance.now();
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
  // ceremonia del cristal de un Guardián (llega como evento crystalAward/crystalSteal): sin su reloj
  // el cristal quedaba congelado en el piso del jefe, sin volar al jugador ni cartel "◆ … n/3 ◆"
  if(typeof crystalTick==="function") crystalTick(dt);
  screenShakeDecay(dt); // curva exponencial con tope (juice.js)
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
  if(typeof groundLootTick==="function") groundLootTick(dt); // su propio botín del piso: lo levanta en su pantalla
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
  document.getElementById("buff-title").textContent = (typeof endlessOn==="function" && endlessOn()) ? `Ronda ${EN.round} contenida — elegí tu refuerzo` : `Nivel ${d.level} superado — elegí tu refuerzo`;
  if(typeof buffNoteRefresh==="function") buffNoteRefresh();
  if(typeof campaignStoryOnBuff==="function") campaignStoryOnBuff();
  const cards = document.getElementById("buff-cards");
  cards.innerHTML = "";
  (d.opts||[]).forEach(id=>{
    const pb = boonParseOpt(id), b = pb ? null : BUFF_POOL.find(x=>x.id===id);
    if(!pb && !b) return;
    const el = document.createElement("div");
    el.className = buffOptClass(id);
    // su héroe (player) trae sus refuerzos por el snapshot: mejoras y dúos se ven igual que en el anfitrión
    el.innerHTML = buffOptHTML(id, player, (b && typeof endlessOn==="function" && endlessOn()) ? endlessBuffHint(b) : "");
    el.addEventListener("click", ()=>{
      netSendToHost({k:"buff", id});
      cards.innerHTML = `<div class="net-wait">Elegiste <b>${buffOptName(id)}</b>. Esperando al resto del equipo…</div>`;
    });
    cards.appendChild(el);
  });
  if(typeof buffOwnedRefresh==="function") buffOwnedRefresh(player);
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
    // Pesadilla/Infierno: igual, solo si ya la tenía abierta en esta arena (difficulty-tiers.js)
    if(typeof diffMarkCleared==="function") diffMarkCleared(currentArena, netMatch.diff, diffArenaUnlocked(currentArena, netMatch.diff));
    grantGold(Math.round(80*(typeof diffGoldMult==="function" ? diffGoldMult() : 1)));
    persist();
    if(typeof AlphaServices!=="undefined")AlphaServices.acceptHostEventVictory(d.eventBossDefeated);
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
  netBroadcast({k:"end", victory:!!victory, snap, eventBossDefeated:victory&&typeof AlphaServices!=="undefined"?AlphaServices.confirmedBosses():[]});
  netLog(victory ? "GAME_VICTORY" : "GAME_DEFEAT");
}
// Después de cerrar las pantallas de fin: se restauran los datos del anfitrión y la sala vuelve
// a esperar (mismo código de invitación).
function netFinishMatch(){
  if(!netMatch) return;
  const wasHost = netIsHost();
  duoRestoreLead();
  netRestoreBackups();
  netMatch = null;
  persistNow();
  if(wasHost && net.room){
    // tras una victoria: la sala vuelve con la próxima arena elegida, en el mismo mensaje (relay nuevo)
    // y con un "update" (relay viejo, que ignora el campo del "lobby"). El anfitrión la puede cambiar.
    const next = netLobby.nextArena; netLobby.nextArena = null;
    if(next && isArenaUnlocked(next) && next!==currentArena){
      currentArena = next; lobbyNextArena = next;
      if(typeof updateMenuBrandSub==="function") updateMenuBrandSub();
      netSend({t:"lobby", arena:next}); netSend({t:"update", arena:next});
    } else netSend({t:"lobby"});
  }
}
function netQuitMatch(){
  if(!netMatch) return;
  if(netIsGuest()){ netSendToHost({k:"quit"}); }
  const wasHost = netIsHost();
  duoRestoreLead();
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
  document.getElementById("go-title").textContent = reason==="host_left" ? "El anfitrión se desconectó"
    : (reason==="room_gone" ? "El servidor se reinició" : "Se perdió la conexión con el servidor");
  document.getElementById("go-stats").textContent = reason==="room_gone" ? "La partida terminó: la sala ya no existe. El anfitrión puede crear una nueva." : "La partida terminó";
  document.getElementById("go-progress").innerHTML = "La XP y el oro que ganaste hasta ahora ya quedaron guardados (sin castigo).";
  if(typeof questsOnRunEnd==="function") questsOnRunEnd(false, {abandon:true}); // lo jugado cuenta para sus estadísticas
  document.getElementById("retry-btn").classList.add("hidden");
}

// Llamado por el loop después de update(): el anfitrión manda el estado y controla la derrota.
function netTick(dt){
  if(!netMatch) return;
  if(netMatch.role==="host"){ netHostTick(); if(state==="playing") netHostCheckDefeat(); }
}
netHookEvents();

/* =====================================================================
   AVISO DE CONEXIÓN (invitado): antes, si se cortaba el servidor o el anfitrión bloqueaba el celular, la
   pantalla del invitado quedaba congelada sin ninguna explicación durante hasta 2 minutos.
   ===================================================================== */
function netConnText(){
  if(net.wantReconnect && net.code){
    const n = Math.max(1, net.reconnectAttempts|0);
    return `📡 Reconectando con ${netIsGuest() ? "la partida" : "la sala"}… (intento ${n} de ${typeof NET_RECONNECT_TRIES!=="undefined" ? NET_RECONNECT_TRIES : 8})`;
  }
  if(netIsGuest() && (state==="playing" || state==="buff") && netMatch.lastRxAt && performance.now() - netMatch.lastRxAt > 3500)
    return "⏳ Esperando al anfitrión… (su conexión está lenta o bloqueó el celular)";
  return "";
}
function netConnRefresh(){
  const txt = netConnText();
  let el = document.getElementById("net-conn");
  if(!txt){ if(el && !el.classList.contains("hidden")) el.classList.add("hidden"); return; }
  if(!el){ el = document.createElement("div"); el.id = "net-conn"; el.setAttribute("role", "status"); el.setAttribute("aria-live", "polite"); document.body.appendChild(el); }
  if(el.textContent !== txt) el.textContent = txt;
  el.classList.remove("hidden");
}
setInterval(()=>{ try{ netConnRefresh(); }catch(e){} }, 500);
