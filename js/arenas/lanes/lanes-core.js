"use strict";
/* ============================================================
   js/arenas/lanes/lanes-core.js
   GUERRA DE CRISTALES en el MOTOR REAL — lógica de la partida (estilo Wild Rift en 2D). Mapa de tres carriles (lanes-data.js).
   Cada equipo tiene 9 torres (3 por carril) y un cristal; se derriban en orden dentro de cada carril y el cristal se expone
   cuando cae la torre inhibidora de cualquiera.
   - PvP: cada héroe tiene un AVATAR dentro de `enemies` (entidad invisible que sigue al héroe). Como todas las habilidades de la
     campaña golpean a `enemies`, el PvP funciona con TODOS los campeones sin tocar sus kits: el daño que recibe el avatar se pasa
     al héroe real (ver lanesSync). Las estructuras funcionan igual.
   - Cada habilidad se lanza viendo solo a su equipo en `heroes` y solo a sus rivales en `enemies` (lanesTeamCall).
   - La HORDA de cada equipo (lanes-minions.js) avanza sola por los tres carriles; las cartas de nivel la potencian.
   - Experiencia, niveles y volver a la base: lanes-levels.js. Selva y objetivos épicos: lanes-jungle.js. Bots: lanes-bots.js.
   Todo corre en el anfitrión (o en la partida local). El estado de la partida (LN) NO toca el guardado real: se juega con un
   guardado temporal normalizado (sin cuenta ni equipo) que se descarta al salir.
   ============================================================ */
let LN = null;
const LANES_BIG = 1e9;                 // vida de los avatares: nunca mueren; lo que pierden se le pasa al héroe/estructura
function lanesOn(){ return !!LN; }
function lanesRand(){ const s = LN.rng = (Math.imul(LN.rng, 1664525) + 1013904223) >>> 0; return s / 4294967296; }
function lanesIsHuman(h){ return !!h && !(h.isBot || h.netName === "BOT"); }

/* ---------------- entrada y salida ---------------- */
// Cambia al guardado TEMPORAL normalizado y crea el estado de la partida. `role`: "solo" | "host" | "guest" | "lobby".
function lanesBegin(role, seed, mode){
  if(LN){ LN.role = role === "lobby" ? LN.role : role; LN.lobby = role === "lobby"; return LN; } // ya estaba en la Sala (guardado temporal puesto)
  if(typeof persistNow==="function") persistNow();   // el progreso real se guarda ANTES de usar el temporal
  const snap = {save, selectedClass, currentArena, lobbyAllies, endlessActive, endlessPending, divinaMode};
  LN = {snap, mode:mode || "cw", role:role||"solo", lobby:role === "lobby", rng:((seed||((Math.random()*4294967295)>>>0))>>>0)||7, t:0, ended:true, winner:-1, team:[], shots:[], feed:[], wave:0, size:5};
  save = defaultSave();
  for(const id in save.champions){ const c = save.champions[id]; c.level = LN.mode === "coliseo" ? 10 : LANES.LEVEL0; c.xp = 0; c.unlocked = true; }   // (el Coliseo: todos al nivel 10; Guerra de Cristales: nivel 3 y suben en la partida)
  save.tut = {training:1, basics:1, b_move:1, b_attack:1, b_skill:1, goalMission:1}; // sin tutoriales dentro de la partida
  divinaMode = false; endlessActive = false; endlessPending = false;
  LN.team = LN.mode === "coliseo" ? colNewTeams() : [lanesNewTeam(0), lanesNewTeam(1)];
  lanesWrap();
  return LN;
}
// Devuelve TODO al estado anterior (guardado real incluido), sin cambiar de pantalla.
function lanesRestore(){
  if(!LN) return;
  const snap = LN.snap; LN = null;
  lanesUnwrap();
  if(typeof colCleanup==="function") colCleanup();
  try{ clearRunTimers(); resetRunTransients(); }catch(e){}
  save = snap.save; selectedClass = snap.selectedClass; currentArena = snap.currentArena; lobbyAllies = snap.lobbyAllies;
  endlessActive = snap.endlessActive; endlessPending = snap.endlessPending; divinaMode = snap.divinaMode;
  enemies = []; allies = []; heroes = []; player = null; bossActive = false; runEnding = false;
  if(typeof invalidatePassiveCache==="function") invalidatePassiveCache();
  if(typeof lanesHudHide==="function") lanesHudHide();
}
// opts: {champ, mate:[...], rivals:[...], seed, size}. Devuelve true si arrancó. Partida local contra bots (por defecto 5 contra 5).
function lanesStart(opts){
  if(LN || (typeof ALPHA_TRAINING!=="undefined" && ALPHA_TRAINING.active)) return false;
  opts = opts || {};
  const size = Math.max(2, Math.min(5, opts.size || 5));
  const roster = Object.keys(CLASSES).filter(k=>championBotEligible(k));
  const mine = opts.champ && CLASSES[opts.champ] ? opts.champ : (CLASSES[selectedClass] ? selectedClass : roster[0]);
  const taken = [mine];
  const pick = (want)=>{ if(want && CLASSES[want] && !taken.includes(want)){ taken.push(want); return want; }
    const pool = roster.filter(k=>!taken.includes(k)); const k = pool[(Math.random()*pool.length)|0]; taken.push(k); return k; };
  const asArr = v=>Array.isArray(v) ? v : (v ? [v] : []);
  const mates = [], foes = [];
  for(let i = 0; i < size - 1; i++) mates.push(pick(asArr(opts.mate)[i]));
  for(let i = 0; i < size; i++) foes.push(pick(asArr(opts.rivals)[i]));
  lanesBegin("solo", opts.seed);
  LN.size = size; LN.setup = {mine, mate:mates, rivals:foes, size};
  selectedClass = mine; currentArena = "convergencia"; lobbyAllies = [...mates, ...foes];
  try{ startRun(LANES.RUNLEVEL); }
  catch(err){ console.error("Guerra de Cristales no pudo arrancar:", err); lanesRestore(); throw err; }
  return true;
}
// Vuelve al estado anterior. `toState`: pantalla a la que volver.
function lanesStop(toState){
  if(!LN) return;
  lanesRestore();
  if(toState){ setState(toState); if(toState==="mainmenu" && typeof renderMainMenu==="function") renderMainMenu(); }
}

/* ---------------- equipos y estructuras ---------------- */
// S[l*3 + k] = torre k (0 exterior, 1 interior, 2 inhibidora) del carril l; S[9] = cristal.
function lanesNewStruct(team, kind, l, k){
  const crystal = kind === "crystal", p = crystal ? laneCrystalPos(team) : laneTowerPos(team, l, k);
  const hp = crystal ? LANES.CRYSTAL_HP : LANES.TOWER_HP[k];
  return {isStruct:true, kind, lane:crystal ? -1 : l, order:crystal ? 3 : k, team, x:p.x, y:p.y, radius:crystal ? LANES.CRYSTAL_R : LANES.TOWER_R,
    hp, maxHp:hp, alive:true, ward:0, hitFlash:0, atkAt:0, stunTimer:0, slowTimer:0, burnTimer:0, bleedTimer:0, shield:0};
}
function lanesNewTeam(team){
  const S = []; for(let l = 0; l < 3; l++) for(let k = 0; k < 3; k++) S.push(lanesNewStruct(team, "tower", l, k)); S.push(lanesNewStruct(team, "crystal", -1, 0));
  return {team, repairAt:0, wardAt:0, sendAt:0, kills:0, sent:0, assist:0, pk:0, tk:0, wave:0, nextWave:LANES.FIRST_WAVE_MS,
    cards:{}, taken:0, cardLevel:LANES.LEVEL0, mods:lanesModsOf({}), offer:null, offerAt:0, pendingCards:0, buffs:{dragon:0, rey:0}, superWaves:0, S};
}
function lanesCrystal(team){ return LN.team[team].S[9]; }
function lanesTower(team, l, k){ return LN.team[team].S[l * 3 + k]; }
// La estructura que le toca derribar a la horda que avanza por el carril `l` contra el equipo `team`.
function lanesFrontIn(team, l){ for(let k = 0; k < 3; k++){ const s = lanesTower(team, l, k); if(s.alive) return s; } const c = lanesCrystal(team); return c.alive ? c : null; }
function lanesExposed(s){
  const T = LN.team[s.team];
  if(s.kind === "crystal") return T.S.some(x=>x.kind === "tower" && x.order === 2 && !x.alive);   // se expone cuando cae una inhibidora
  for(let k = 0; k < s.order; k++) if(lanesTower(s.team, s.lane, k).alive) return false;
  return true;
}
function lanesTowersAlive(team){ let n = 0; for(const s of LN.team[team].S) if(s.alive && s.kind === "tower") n++; return n; }

/* ---------------- arranque de la partida (gancho runStart) ---------------- */
const LANES_ROLE_LANES = [1, 2, 2, 0, -1];   // carril preferido de cada integrante del equipo (para los bots): medio, abajo, abajo, arriba, selva
function lanesRunStart(){
  const L = LN; if(!L) return;
  L.t = 0; L.wave = 0; L.ended = false; L.winner = -1; L.shots = []; L.feed = []; L.spawnCtx = null;
  L.team = [lanesNewTeam(0), lanesNewTeam(1)]; runLevel = LANES.RUNLEVEL;
  levelDuration = 1e12; levelTimer = 0; midBossSpawned = true; // el motor no cierra niveles ni genera jefes
  const half = Math.ceil(heroes.length / 2), slot = [0, 0];
  heroes.forEach((h, k)=>{
    h.team = h.lane = (L.assignment && L.assignment[k] != null) ? L.assignment[k] : (k < half ? 0 : 1);
    h.ln = LANES_ROLE_LANES[slot[h.team]++ % LANES_ROLE_LANES.length]; h._lnProxy = null; h.dead_t = 0;
    h._qualityFiveSlot = k; h.mlvl = LANES.LEVEL0; h.mxp = 0; h._shopAt = null; h._recall = null; h._lnBuff = null; h.gold = LANES.START_GOLD; h.itAtk = h.itHp = h.itSpd = h.itSiege = h.itRegen = 0; h._spd0 = null;
    lanesApplyLevel(h, LANES.LEVEL0, true);
    const r = laneRally(h.team); h.x = r.x + (Math.random() - 0.5) * 120; h.y = r.y + (Math.random() - 0.5) * 120;
  });
  lanesJungleInit();
  document.getElementById("hud-arena") && (document.getElementById("hud-arena").textContent = "Guerra de Cristales");
  lanesSync(0);
  if(typeof lanesHudShow==="function") lanesHudShow();
  showBanner("¡DERRIBÁ LAS TORRES Y EL CRISTAL RIVAL!");
}

/* ---------------- geometría ---------------- */
function lanesClamp(ent){
  if(!ent.lanesProxy)aidCollideEnemy(ent);
  const b = laneBox(), r = (ent.radius || 18) * 0.5 + 6;
  ent.x = Math.max(b.x0 + r, Math.min(b.x1 - r, ent.x));
  ent.y = Math.max(b.y0 + r + 30, Math.min(b.y1 - r, ent.y));
}
function lanesInside(x, y, m){ return x > m && x < LANES.W - m && y > m && y < LANES.H - m; }
// Carril más cercano a un punto
function lanesLaneOf(x, y){ let bl = 1, bd = 1e12; for(let l = 0; l < 3; l++){ const d = laneProject(l, x, y).d; if(d < bd){ bd = d; bl = l; } } return bl; }

/* ---------------- equipos de las habilidades ---------------- */
// Equipo de quien golpea: héroe, criatura, torre o invocación (que apunta a su dueño).
function lanesTeamOf(src){
  let s = src, n = 0;
  while(s && n++ < 4){ if(s.team != null) return s.team; s = s.owner || s.src || s.caster || s.from || s.summoner; }
  return null;
}
// ¿Esta entidad de `enemies` es hostil para el equipo `team`? (la selva, equipo 2, es hostil para todos)
function lanesHostileTo(team, e){ return e.team == null || e.team !== team; }
let _lnWrapped = null;
function lanesWrap(){
  if(_lnWrapped) return;
  const ca = castAbility, tb = triggerBasic;
  _lnWrapped = {ca, tb};
  castAbility = function(caster){ const a = arguments; return lanesTeamCall(caster, ()=>ca.apply(this, a)); };
  triggerBasic = function(caster){ const a = arguments; return lanesTeamCall(caster || player, ()=>tb.apply(this, a)); };
}
function lanesUnwrap(){ if(!_lnWrapped) return; castAbility = _lnWrapped.ca; triggerBasic = _lnWrapped.tb; _lnWrapped = null; }
// Mientras `caster` lanza algo, `heroes`/`allies` son solo su equipo y `enemies` solo sus rivales: curas, escudos y
// áreas de TODAS las habilidades quedan del lado correcto sin tocar ningún kit.
function lanesTeamCall(caster, fn){
  const L = LN;
  if(!L || L.inCast || !caster || caster.team == null) return fn();
  L.inCast = true; L.cur = caster;
  if(caster._recall) caster._recall = null;   // lanzar cualquier cosa corta el regreso a la base
  const H = heroes, E = enemies, A = allies, t = caster.team;
  const hs = H.filter(h=>h.team === t), es = E.filter(e=>lanesHostileTo(t, e)), as = A.filter(a=>a.team === t);
  heroes = hs; enemies = es; allies = as;
  try{ return fn(); }
  finally{
    const seen = new Set(E); for(const e of enemies) if(!seen.has(e)) E.push(e);   // lo que la habilidad haya creado (invocaciones hostiles, etc.)
    heroes = H; enemies = E; allies = A; L.inCast = false; L.cur = null;
  }
}

/* ---------------- avatares (PvP) y estructuras como objetivos ---------------- */
function lanesMkProxy(kind, lnRef, team){
  const e = {type:"esqueleto", name:lnRef.name || "", rank:"normal", x:lnRef.x, y:lnRef.y, radius:lnRef.radius || 18, hp:LANES_BIG, maxHp:LANES_BIG, dmg:0, speed:0, color:"#000",
    ranged:false, range:0, projSpeed:0, atkCd:0, xp:0, gold:0, dropsItem:false, slowTimer:0, slowAmt:0, burnTimer:0, burnDmg:0, bleedTimer:0, bleedDmg:0, stunTimer:0, hitFlash:0,
    fx:0, fy:1, animT:0, attackAnim:0, scale:1, target:null, alive:true, lanesProxy:true, kind, team, lnRef, noLoot:true};
  enemies.push(e); return e;
}
// Pasa al héroe/estructura lo que perdió su avatar desde el último cuadro y lo deja otra vez en vida plena.
function lanesSync(dt){
  const L = LN; if(!L) return;
  for(const h of heroes){
    let P = h._lnProxy;
    if(!h.alive){ if(P) P.alive = false; continue; }
    if(!P || !P.alive){ P = h._lnProxy = lanesMkProxy("hero", h, h.team); }
    const lost = LANES_BIG - P.hp;
    if(lost > 0.01){
      const from = P.lastHitBy, atk = from && from.team != null ? from : null;
      // limitador de ráfaga: ningún héroe pierde más del 40 % de su vida por PvP en un segundo (hay kits de mucha ráfaga)
      const W = h._pvpW || (h._pvpW = {t:L.t, sum:0}); if(L.t - W.t > 1000){ W.t = L.t; W.sum = 0; }
      const dmg = Math.min(lost * LANES.PVP_DMG, Math.max(0, h.maxHp * LANES.PVP_BURST - W.sum)); W.sum += dmg;
      if(dmg > 0){ if(h._recall) h._recall = null; damageHero(h, dmg, {isPvp:true, from:atk || from, team:lanesTeamOf(from)}); }
      if(!h.alive && !h.dead_t){ h._lnKiller = lanesTeamOf(from); h._lnKillerHero = from && from.classKey ? from : null; }
      P.hp = LANES_BIG;
    }
    if(P.stunTimer > 0){ h.stunTimer = Math.max(h.stunTimer || 0, P.stunTimer); P.stunTimer = 0; }   // control: se le pasa al héroe real
    if(P.slowTimer > 0){ h.slowTimer = Math.max(h.slowTimer || 0, P.slowTimer); h.slowAmt = Math.max(h.slowAmt || 0, P.slowAmt || 0); P.slowTimer = 0; P.slowAmt = 0; }
    for(const k of ["burn", "bleed", "poison"]){ if(P[k + "Timer"] > 0){ damageHero(h, (P[k + "Dmg"] || 0) * P[k + "Timer"] / 1000 * LANES.PVP_DMG * 0.5, {isPvp:true, from:P.lastHitBy}); P[k + "Timer"] = 0; } }
    P.x = h.x; P.y = h.y; P.radius = Math.max(16, h.radius || 18); P.hitFlash = 0; P.frozenTimer = 0;
  }
  for(const T of L.team) for(const s of (T.S || [])){
    let P = s._lnProxy;
    if(!s.alive){ if(P) P.alive = false; continue; }
    if(!P || !P.alive){ P = s._lnProxy = lanesMkProxy("struct", s, s.team); P.x = s.x; P.y = s.y; P.radius = s.radius + 6; P.kindOf = s.kind; }
    const lost = LANES_BIG - P.hp;
    if(lost > 0.01){ lanesStructDamage(s, lost, lanesTeamOf(P.lastHitBy)); P.hp = LANES_BIG; }
    P.stunTimer = 0; P.slowTimer = 0; P.burnTimer = 0; P.bleedTimer = 0; P.poisonTimer = 0; P.hitFlash = 0;
  }
}
// Gancho de damageEnemy: ¿este golpe no cuenta? (fuego amigo, estructuras protegidas)
function lanesBlocksDamage(e, src){
  const L = LN; if(!L) return false;
  if(L.ended && (e.lanesProxy || e.team != null)) return true;
  const st = lanesTeamOf(src);
  if(st != null && e.team != null && st === e.team) return true;
  if(L.mode === "coliseo") return colBlocksDamage(e);                  // Coliseo: sin golpes en la cuenta regresiva ni después de terminar tu duelo
  if(e.lanesProxy && e.kind === "struct" && !lanesExposed(e.lnRef)){ e.lnRef.hitFlash = 160; return true; }  // torre/cristal protegidos
  return false;
}
// Gancho de damageEnemy: bendiciones de equipo/campamento sobre el daño de salida de un héroe
function lanesDmgMult(e, src){
  const L = LN, h = src && src.classKey ? src : null; if(!L || !h || h.team == null || L.mode === "coliseo") return 1;
  let m = 1; const T = L.team[h.team];
  if(T && T.buffs && T.buffs.dragon > L.t) m *= 1.10;
  if(h._lnBuff && h._lnBuff.until > L.t) m *= h._lnBuff.dmg;
  if(h.itAtk) m *= 1 + 0.09 * h.itAtk;
  if(h.itSiege && e.lanesProxy && e.kind === "struct") m *= 1 + 0.25 * h.itSiege;
  return m;
}
// Gancho de damageHero: la horda propia no le pega a su equipo
function lanesBlocksHeroDamage(h, src){
  if(!src || src === h || src.isPvp) return false;
  const st = lanesTeamOf(src);
  return st != null && st === h.team;
}

/* ---------------- daño a estructuras ---------------- */
// Golpe de una criatura (damageHero con la estructura como objetivo)
function lanesHitStruct(s, amount, src){
  if(!LN || LN.ended || !s.alive) return;
  lanesStructDamage(s, amount * ((src && src.siegeMult) || 1), src && src.team != null ? src.team : null);
}
function lanesStructDamage(s, amount, byTeam){
  const L = LN; if(!L || L.ended || !s.alive || amount <= 0) return;
  if(s.ward > 0){ const a = Math.min(s.ward, amount); s.ward -= a; amount -= a; }
  if(amount > 0){ s.hp = Math.max(0, s.hp - amount); s.hitFlash = 200; }
  if(s.hp <= 0) lanesStructDown(s, byTeam);
}
function lanesStructDown(s, byTeam){
  const L = LN; s.alive = false; s.hp = 0; if(s._lnProxy) s._lnProxy.alive = false;
  const foe = 1 - s.team;
  if(s.kind === "crystal"){ lanesFinish(foe, "cristal"); return; }
  L.team[foe].tk++; lanesGrantGold(foe, LANES.GOLD_TOWER);
  lanesGrantXP(foe, s.x, s.y, LANES.XP_TOWER);
  const name = s.order === 0 ? "exterior" : s.order === 1 ? "interior" : "inhibidora";
  lanesFeed((s.team ? "Ámbar" : "Zafiro") + ": cayó su torre " + name + " (" + LANE_NAMES[s.lane].toLowerCase() + ")", foe);
  showBanner("¡TORRE " + name.toUpperCase() + " " + (s.team ? "ÁMBAR" : "ZAFIRO") + " DERRIBADA!");
  if(s.order === 2) showBanner("¡CRISTAL " + (s.team ? "ÁMBAR" : "ZAFIRO") + " EXPUESTO!");
  if(typeof playSfx === "function") try{ playSfx("boom"); }catch(e){}
  for(let i = 0; i < 18; i++) particles.push({x:s.x + (Math.random() - 0.5) * 60, y:s.y + (Math.random() - 0.5) * 60, vx:(Math.random() - 0.5) * 240, vy:-Math.random() * 200, life:700, color:i % 2 ? "#cfd8e4" : "#ff9a4a"});
}
function lanesFeed(text, team){ const L = LN; L.feed.push({t:L.t, text, team}); if(L.feed.length > 5) L.feed.shift(); }

/* ---------------- economía y compras (oro de cada héroe) ---------------- */
function lanesAddGold(h, n){ if(h && n) h.gold = Math.max(0, Math.min(LANES.MAX_GOLD, (h.gold || 0) + n)); }
function lanesGrantGold(team, n){ for(const h of heroes) if(h.team === team && h.alive) lanesAddGold(h, n); }
function lanesAtShop(h){ if(!h) return false; if(!h.alive) return true; const c = laneCrystalPos(h.team); return Math.hypot(h.x - c.x, h.y - c.y) < LANES.SHOP_RADIUS; }
function lanesShopOpen(){ return !!LN && !LN.ended; }
function lanesWeakest(team){ let best = null; for(const s of LN.team[team].S) if(s.alive && s.hp < s.maxHp && (!best || s.maxHp - s.hp > best.maxHp - best.hp)) best = s; return best; }
function lanesWardTarget(team){ let best = null; for(const s of LN.team[team].S) if(s.alive && lanesExposed(s) && s.ward < 200 && (!best || s.hp / s.maxHp < best.hp / best.maxHp)) best = s; return best; }
const _lnHas = (o, k)=>Object.prototype.hasOwnProperty.call(o, k);
// ¿Puede `buyer` comprar `key`? Pedidos de equipo (LANES.SHOP) u objetos ("item:atk"…). Un invitado puede mandar cualquier texto ("__proto__"…).
function lanesCanBuy(team, key, buyer){
  const L = LN, T = L && L.team[team]; key = String(key);
  if(!T || L.ended || !buyer || !buyer.alive && !lanesAtShop(buyer)) return false;
  if(key.indexOf("item:") === 0){
    const id = key.slice(5); if(!_lnHas(LANES_ITEMS, id)) return false;
    const it = LANES_ITEMS[id], tier = buyer[it.field] || 0;
    return tier < 3 && lanesAtShop(buyer) && (buyer.gold || 0) >= it.costs[tier];
  }
  const it = _lnHas(LANES.SHOP, key) ? LANES.SHOP[key] : null; if(!it) return false;
  if((buyer.gold || 0) < it.cost) return false;
  if(key === "repair" && (!lanesWeakest(team) || L.t < T.repairAt)) return false;
  if(key === "ward" && (L.t < T.wardAt || !lanesWardTarget(team))) return false;
  if((key === "swarm" || key === "brute") && L.t < T.sendAt) return false;
  return true;
}
function lanesBuy(team, key, buyer){
  if(typeof lanesNetBuyRequest==="function" && lanesNetBuyRequest(key)) return true; // invitado: lo decide el anfitrión
  key = String(key);
  if(!lanesCanBuy(team, key, buyer)) return false;
  const L = LN, T = L.team[team];
  if(key.indexOf("item:") === 0){
    const it = LANES_ITEMS[key.slice(5)], tier = buyer[it.field] || 0;
    lanesAddGold(buyer, -it.costs[tier]); buyer[it.field] = tier + 1; lanesApplyLevel(buyer, buyer.mlvl, false);
    if(typeof playSfx === "function") try{ playSfx("pickup"); }catch(e){}
    if(buyer === player) showBanner(it.name + " nivel " + (tier + 1) + " ✓");
    return true;
  }
  const it = LANES.SHOP[key];
  lanesAddGold(buyer, -it.cost);
  const ln = buyer.x != null ? lanesLaneOf(buyer.x, buyer.y) : 1;
  if(key === "repair"){ const s = lanesWeakest(team); s.hp = Math.min(s.maxHp, s.hp + 260); T.repairAt = L.t + it.cd; }
  else if(key === "ward"){ const s = lanesWardTarget(team); s.ward = Math.max(s.ward, 200); T.wardAt = L.t + it.cd; }
  else { T.sendAt = L.t + it.cd; T.sent++; lanesSendNow(team, key, ln); }
  if(buyer.stats) buyer.stats.buys = (buyer.stats.buys || 0) + 1;
  if(typeof playSfx === "function") try{ playSfx("pickup"); }catch(e){}
  if(buyer === player) showBanner(key === "swarm" || key === "brute" ? "¡Mandaste refuerzos por el carril " + LANE_NAMES[ln].toLowerCase() + "!" : it.name + " ✓");
  return true;
}

/* ---------------- cartas de horda (una por cada nuevo nivel máximo del equipo) ---------------- */
function lanesHumansOf(team){ return heroes.filter(h=>h.team === team && lanesIsHuman(h)); }
function lanesOffer(T){
  const L = LN, avail = Object.keys(LANES_CARDS).filter(id=>(T.cards[id] || 0) < LANES_CARDS[id].max), pick = [];
  while(pick.length < 3 && avail.length) pick.push(avail.splice((lanesRand() * avail.length) | 0, 1)[0]);
  if(!pick.length){ T.pendingCards = 0; return; }
  T.offer = pick; T.offerAt = L.t;
  if(lanesHumansOf(T.team).length) showBanner("¡NUEVA CARTA DE HORDA! Elegí una");
}
// Elige la carta `idx` de la oferta del equipo. Devuelve true si se aplicó.
function lanesPickCard(team, idx){
  const L = LN, T = L && L.team[team];
  if(!T || !T.offer || L.ended) return false;
  const id = T.offer[idx | 0]; if(!id) return false;
  T.cards[id] = (T.cards[id] || 0) + 1; T.taken++; T.mods = lanesModsOf(T.cards); T.offer = null;
  lanesFeed((team ? "Ámbar" : "Zafiro") + " potenció su horda: " + LANES_CARDS[id].name, team);
  if(lanesHumansOf(team).length) showBanner(LANES_CARDS[id].name + " ✓");
  return true;
}
function lanesCardTick(){
  const L = LN;
  for(const T of L.team){
    if(!T.offer && T.pendingCards > 0 && T.taken < LANES.MAX_CARDS){ T.pendingCards--; lanesOffer(T); }
    if(T.offer){
      const humans = lanesHumansOf(T.team).length, wait = humans ? LANES.CARD_AUTO_MS : 2500 + (T.team * 700);
      if(L.t - T.offerAt >= wait) lanesPickCard(T.team, (lanesRand() * T.offer.length) | 0);
    }
  }
}

/* ---------------- torres ---------------- */
function lanesTowerTick(s){
  const L = LN; if(!s.alive || s.kind !== "tower" || L.t < s.atkAt) return;
  const foe = 1 - s.team, R = LANES.TOWER_RANGE, dmg = LANES.TOWER_DMG * (1 + Math.floor(L.t / 90000) * 0.1);
  let tgt = null, bd = R;
  for(const e of enemies){ if(!e.alive || e.lanesProxy || e.team !== foe) continue; const d = Math.hypot(e.x - s.x, e.y - s.y); if(d < bd){ bd = d; tgt = e; } }
  if(tgt){
    s.atkAt = L.t + LANES.TOWER_CD; tgt.hp -= dmg * 3; tgt.hitFlash = 120; L.shots.push({x1:s.x, y1:s.y - 70, x2:tgt.x, y2:tgt.y - 14, t:L.t, team:s.team});
    if(tgt.hp <= 0){ tgt.lastHitBy = null; tgt._killTeam = s.team; tgt.noLoot = true; killEnemy(tgt); }
    return;
  }
  let hero = null; bd = R;
  for(const h of heroes){ if(!h.alive || h.team !== foe || h.stealthTimer > 0) continue; const d = Math.hypot(h.x - s.x, h.y - s.y); if(d < bd){ bd = d; hero = h; } }
  if(hero){
    s.atkAt = L.t + LANES.TOWER_CD; L.shots.push({x1:s.x, y1:s.y - 70, x2:hero.x, y2:hero.y - 14, t:L.t, team:s.team});
    if(hero._recall) hero._recall = null;
    damageHero(hero, dmg, {isPvp:true, from:s, team:s.team});
    if(!hero.alive && !hero.dead_t){ hero._lnKiller = s.team; hero._lnKillerHero = null; }
  }
}

/* ---------------- ciclo de la partida (gancho update) ---------------- */
function lanesRespawnMs(h){ return Math.min(45000, LANES.RESPAWN_MS + (h.mlvl || 1) * LANES.RESPAWN_PER_LEVEL + Math.floor(LN.t / 60000) * LANES.RESPAWN_PER_MIN); }
function lanesUpdate(dt){
  const L = LN; if(!L || L.ended) return;
  L.t += dt;
  lanesSync(dt);
  if(L.ended) return;
  for(const T of L.team) if(L.t >= T.nextWave) lanesWaveStart(T);
  lanesJungleTick(dt);
  lanesCardTick();
  for(const T of L.team) for(const s of T.S){ if(s.hitFlash > 0) s.hitFlash -= dt; lanesTowerTick(s); if(L.ended) return; }
  for(let i = L.shots.length - 1; i >= 0; i--) if(L.t - L.shots[i].t > 220) L.shots.splice(i, 1);
  lanesMinionsTick(dt);
  lanesHeroTick(dt);
  // Eclipse: los dos cristales se apagan cada vez más rápido (aunque sus torres sigan en pie)
  if(L.t >= LANES.ECLIPSE_MS){ const k = 5 * (1 + (L.t - LANES.ECLIPSE_MS) / 60000) * dt / 1000; for(const T of L.team) lanesStructDamage(T.S[9], k, null); }
  if(!L.ended && L.t >= LANES.TIME_LIMIT_MS){
    const sc = t=>lanesTowersAlive(t) * 10000 + L.team[t].S[9].hp, a = sc(0), b = sc(1);
    lanesFinish(Math.abs(a - b) < 1 ? -1 : (a > b ? 0 : 1), "tiempo");
  }
}

/* ---------------- final ---------------- */
function lanesFinish(winnerTeam, why){
  const L = LN; if(!L || L.ended) return;
  L.ended = true; L.winner = winnerTeam; L.why = why; runEnding = true;
  for(const e of enemies) if(e.alive) e.alive = false;
  enemies = enemies.filter(e=>e.alive);
  if(typeof netIsHost==="function" && netIsHost()) netHostAnnounceEnd(winnerTeam === 0);
  showBanner(winnerTeam === -1 ? "¡EMPATE!" : (winnerTeam === (player && player.team) ? "¡VICTORIA!" : "CRISTAL CAÍDO"));
  setTimeout(()=>{ if(LN === L && typeof lanesShowResult === "function") lanesShowResult(); }, 1600);
}
function lanesNoRevive(a, by){ return !!LN && LN.mode === "coliseo"; } // Coliseo competitivo: en ninguna fase se revive; solo hay reaparición por temporizador (lanesHeroTick)
function lanesOnPlayerDeath(){ if(LN && LN.mode === "coliseo") return; /* reaparece solo (lanesHeroTick): nunca hay derrota por caer */ showBanner("Caíste · volvés en " + Math.round((LN && player && player._respawnAt ? Math.max(0, player._respawnAt - LN.t) : LANES.RESPAWN_MS) / 1000) + " s"); }

ARENA_DEFS.convergencia = {
  key:"convergencia",
  subBossLevels:[],
  navBounds:{x0:0, y0:0, x1:LANES.W, y1:LANES.H},
  runStart:lanesRunStart,
  update:lanesUpdate,
  clamp:lanesClamp,
  inside:lanesInside,
  placeSpawn:lanesPlaceSpawn,
  enemyTarget:lanesEnemyTarget,
  enemyKilled:lanesEnemyKilled,
  botTarget:lanesBotTarget,
  ownSpawns:()=>true,
  holdLevel:()=>true,
  afterEnemies:()=>{ for(const e of enemies) if(e.alive) lanesClamp(e); }
};
