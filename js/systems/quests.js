"use strict";
/* ============================================================
   js/systems/quests.js
   RETENCIÓN Y PROGRESIÓN DE CUENTA (tablas en js/data/quests.js, pantalla en js/ui/quests-ui.js):
     · estadísticas de la cuenta (partidas, bajas, horas, mejor puntaje por arena, guardián favorito)
     · LOGROS (se chequean contra las estadísticas + el estado del guardado: arenas, cristales, Códice)
     · DESAFÍOS diarios y semanales: 3 + 3, elegidos por FECHA (misma semilla para todos, sin servidor)
     · XP de cuenta → NIVEL DE CUENTA y PASE DE TEMPORADA gratuito (30 niveles)
     · cofres (botín normal tirado con las tablas de siempre), títulos, marcos y emblemas del perfil
   Todo vive en save.quests (lo guarda persist() como el resto). Cooperativo: cada cliente cuenta SU
   partida con SU guardado (las pantallas de fin corren en cada uno: anfitrión e invitados), igual que
   la XP y el oro que viajan como eventos en js/net/net-game.js.
   Ganchos: questsOnLoad (loadSave) · questsOnRunStart (startRun / netGuestStartRun) ·
   questsOnRunEnd (pantallas de victoria / derrota / abandono) · questsLiveTick (1 vez por segundo).
   ============================================================ */

const QUESTS_V = 1;
function _qStatsDefault(){
  return {runs:0, wins:0, losses:0, bosses:0, kills:0, subjefes:0, civ:0, fis:0, revives:0, timeMs:0,
    coopRuns:0, coopWins:0, full4:false, deathless:0, gradeA:0, gradeS:0, gradeSP:0,
    resoWins:0, resoBy:{}, divinaWins:0, divinaBest:0, maxRunKills:0, fastWinMs:0,
    night:false, closeWin:false, perfectRescue:false, duel5:false,
    byChamp:{}, byArena:{}};
}
// Estado completo con valores por defecto (sirve para guardados viejos sin estos campos o a medias).
function questsNormalize(q){
  const fresh = !q || typeof q !== "object";
  q = fresh ? {} : q;
  const st = Object.assign(_qStatsDefault(), q.stats && typeof q.stats === "object" ? q.stats : {});
  for(const k of ["resoBy","byChamp","byArena"]) if(!st[k] || typeof st[k] !== "object") st[k] = {};
  const season = Object.assign({id:SEASON_DEF.id, xp:0, granted:0}, q.season||{});
  if(season.id !== SEASON_DEF.id) Object.assign(season, {id:SEASON_DEF.id, xp:0, granted:0}); // temporada nueva: el pase arranca de cero
  return {
    v: QUESTS_V,
    stats: st,
    ach: Object.assign({}, q.ach||{}),                       // id -> fecha de desbloqueo
    xp: Math.max(0, +q.xp||0),                              // XP de cuenta total (nunca baja)
    level: Math.max(1, q.level|0 || 1),                     // nivel de cuenta ya anunciado
    season,
    daily: q.daily && Array.isArray(q.daily.list) ? q.daily : {key:"", list:[], bonus:false, rerolls:0},
    weekly: q.weekly && Array.isArray(q.weekly.list) ? q.weekly : {key:"", list:[], bonus:false},
    chests: Array.isArray(q.chests) ? q.chests.filter(v=>QUEST_CHESTS[v]) : [],   // cofres sin abrir (variante)
    titles: Array.isArray(q.titles) ? q.titles.filter(t=>QUEST_TITLES[t]) : ["novato"],
    title: QUEST_TITLES[q.title] ? q.title : "novato",
    frames: Array.isArray(q.frames) ? q.frames.filter(f=>QUEST_FRAMES[f]) : ["madera"],
    frame: QUEST_FRAMES[q.frame] ? q.frame : "madera",
    emblems: Array.isArray(q.emblems) ? q.emblems.filter(e=>QUEST_EMBLEMS[e]) : ["guardian"],
    emblem: QUEST_EMBLEMS[q.emblem] ? q.emblem : "guardian",
    counts: Object.assign({daily:0, weekly:0, chests:0}, q.counts||{}),
    seen: Object.assign({}, q.seen||{}),                    // logros ya vistos en la pantalla (para el "¡NUEVO!")
    retro: fresh || !!q.retro                                // primer arranque con logros: se desbloquea lo ya hecho en silencio
  };
}
function questsState(){
  const q = save.quests;
  if(!q || q.v !== QUESTS_V || !q.stats || !q.daily || !Array.isArray(q.daily.list) || !q.weekly || !Array.isArray(q.weekly.list) || !q.season || !Array.isArray(q.titles) || !Array.isArray(q.chests))
    save.quests = questsNormalize(q);
  return save.quests;
}

/* ---------------- fecha (determinística, sin servidor) ---------------- */
// window.__questsNow (número o función) permite a las pruebas mover el reloj.
function questsNow(){
  const o = (typeof window !== "undefined") ? window.__questsNow : null;
  const t = typeof o === "function" ? o() : o;
  return t ? new Date(t) : new Date();
}
const _q2 = n => String(n).padStart(2, "0");
function questsDayKey(d){ d = d || questsNow(); return `${d.getFullYear()}-${_q2(d.getMonth()+1)}-${_q2(d.getDate())}`; }
// Semana ISO (lunes a domingo, hora local).
function questsWeekKey(d){
  d = d || questsNow();
  const t = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const wd = (t.getDay() + 6) % 7;            // lunes = 0
  t.setDate(t.getDate() - wd + 3);            // jueves de esa semana
  const y = t.getFullYear(), jan4 = new Date(y, 0, 4);
  const w = 1 + Math.round(((t - jan4)/86400000 - 3 + ((jan4.getDay() + 6) % 7))/7);
  return `${y}-S${_q2(w)}`;
}
// Milisegundos hasta el próximo cambio (medianoche / lunes 00:00).
function questsMsToReset(kind){
  const d = questsNow(), n = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
  if(kind === "weekly"){ const wd = (d.getDay() + 6) % 7; n.setDate(n.getDate() + (6 - wd)); }
  return Math.max(0, n - d);
}
function _qHash(s){ let h = 2166136261; for(let i=0;i<s.length;i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function _qRng(seed){ let s = seed >>> 0 || 1; return ()=>{ s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }

/* ---------------- vista de la cuenta ---------------- */
let QST = {run:null, lastTick:0, bossHeld:false};
// Lo que va de la partida en curso (se suma a la vista mientras no se cerró la partida).
function _qLiveRun(){
  const R = QST.run;
  if(!R || R.ended || typeof player === "undefined" || !player || !player.stats) return null;
  const s = player.stats;
  const civ = (currentArena === "ciudad" && typeof cmS !== "undefined" && cmS) ? (cmS.saved|0) : 0;
  return {kills:s.kills|0, fis:s.fissures|0, revives:s.revives|0, civ,
    subjefes:(typeof subjefesDefeated !== "undefined" ? subjefesDefeated|0 : 0), timeMs:R.timeMs};
}
function questsView(){
  const q = questsState(), st = q.stats, live = _qLiveRun() || {};
  const V = Object.assign({}, st);
  for(const k of ["kills","fis","revives","civ","subjefes","timeMs"]) V[k] = (st[k]||0) + (live[k]||0);
  V.maxRunKills = Math.max(st.maxRunKills||0, live.kills||0);
  V.minutes = Math.floor(V.timeMs/60000);
  V.cleared = save.arenasCleared || {};
  V.champs = save.champions || {};
  V.crystals = (typeof crystalsOwned === "function") ? crystalsOwned().length : 0;
  V.juicio = (typeof resonanceJuicioOpen === "function") && resonanceJuicioOpen();
  V.divinaOpen = (typeof isDivinaUnlocked === "function") ? isDivinaUnlocked() : !!save.divineArenaUnlocked;
  V.gold = save.gold||0;
  V.codexKills = (save.codex && save.codex.kills) || {};
  V.open = {}; for(const a of ARENA_ORDER) V.open[a] = (typeof isArenaUnlocked === "function") ? !!isArenaUnlocked(a) : false;
  return V;
}
const _qGoal = a => typeof a.goal === "function" ? a.goal() : a.goal;
function questsAchProgress(a, V){
  V = V || questsView();
  let p = 0; try{ p = +a.prog(V) || 0; }catch(e){ p = 0; }
  const g = _qGoal(a);
  return {p:Math.min(g, Math.max(0, Math.floor(p))), goal:g};
}
// Valor actual del contador de un desafío.
function _qChalStat(V, c){
  if(c.stat === "champRuns") return ((V.byChamp[c.champ]||{}).runs)||0;
  if(c.stat === "champWins") return ((V.byChamp[c.champ]||{}).wins)||0;
  if(c.stat === "distinctArenas" || c.stat === "distinctChamps") return (c.set||[]).length;
  return V[c.stat]||0;
}
function questsChalProgress(c, V){
  if(c.done) return c.n;
  const cur = _qChalStat(V || questsView(), c);
  const base = (c.stat === "distinctArenas" || c.stat === "distinctChamps") ? 0 : (c.base||0);
  return Math.max(0, Math.min(c.n, cur - base));
}
function questsChalText(c){
  const T = CHALLENGE_TEMPLATES.find(t=>t.id===c.tpl);
  const champName = c.champ && CLASSES[c.champ] ? CLASSES[c.champ].name : "";
  return {name:T ? T.name : c.tpl, desc:T ? T.desc(c.n, champName) : "", icon:T ? T.icon : "star"};
}

/* ---------------- rotación de desafíos ---------------- */
// Arma los 3 desafíos de una fecha. Misma fecha -> mismos desafíos (la semilla es la fecha); lo único
// que depende de la cuenta es qué se puede cumplir (un guardián propio, arenas abiertas).
function questsRoll(kind, key, V, exclude){
  V = V || questsView();
  const ix = kind === "weekly" ? 1 : 0;
  const rng = _qRng(_qHash(kind + ":" + key));
  const owned = CHAMPION_CATALOG.map(c=>c.id).filter(k=>V.champs[k] && V.champs[k].unlocked);
  const pool = CHALLENGE_TEMPLATES.filter(t=>t.n[ix] && (!t.avail || t.avail(V)) && (!t.champ || owned.length) && !(exclude||[]).includes(t.id));
  // barajado determinístico
  const order = pool.map(t=>({t, r:rng()})).sort((a,b)=>a.r-b.r).map(o=>o.t);
  const out = [];
  for(const t of order){
    if(out.length >= 3) break;
    if(t.champ && out.some(c=>c.champ)) continue;              // un solo desafío de guardián por rotación
    const c = {tpl:t.id, stat:t.stat, n:t.n[ix], gold:t.gold[ix], done:false};
    if(t.champ){ const all = CHAMPION_CATALOG.map(x=>x.id); let i = Math.floor(rng()*all.length);
      for(let k=0;k<all.length && !owned.includes(all[i]); k++) i = (i+1) % all.length; c.champ = all[i]; }
    if(c.stat === "distinctArenas" || c.stat === "distinctChamps") c.set = [];
    c.base = _qChalStat(V, c);
    out.push(c);
  }
  return out;
}
function questsEnsureRotation(){
  const q = questsState();
  const dk = questsDayKey(), wk = questsWeekKey();
  if(q.daily.key === dk && q.weekly.key === wk) return false;
  const V = questsView();
  let changed = false;
  if(q.daily.key !== dk){ q.daily = {key:dk, list:questsRoll("daily", dk, V), bonus:false, rerolls:0}; changed = true; }
  if(q.weekly.key !== wk){ q.weekly = {key:wk, list:questsRoll("weekly", wk, V), bonus:false}; changed = true; }
  if(changed) persist();
  return changed;
}
// Cambiar UN desafío diario sin completar (1 por día): sale otro de la misma semilla que no esté en la lista.
function questsReroll(i){
  const q = questsState(); questsEnsureRotation();
  const c = q.daily.list[i];
  if(!c || c.done || (q.daily.rerolls|0) >= 1) return false;
  const V = questsView();
  const alt = questsRoll("daily", q.daily.key + "#r", V, q.daily.list.map(x=>x.tpl));
  const pick = alt.find(x=>!(x.champ && q.daily.list.some((y,j)=>j!==i && y.champ)));
  if(!pick) return false;
  q.daily.list[i] = pick; q.daily.rerolls = (q.daily.rerolls|0) + 1;
  persist();
  return true;
}

/* ---------------- recompensas y XP ---------------- */
function _qToast(t){ if(typeof questsToast === "function") questsToast(t); }
function questsGrant(r, silent){
  if(!r) return;
  const q = questsState();
  if(r.gold){
    save.gold = (save.gold||0) + r.gold;
    // en plena partida el oro de un logro no entra en el castigo por perder (solo cuenta lo ganado peleando)
    if(typeof state !== "undefined" && state === "playing" && typeof runStartGold !== "undefined") runStartGold += r.gold;
  }
  if(r.gems) save.gems = (save.gems||0) + r.gems; // Gemas: solo mejoran objetos (gems.js), nunca se compran
  if(r.title && !q.titles.includes(r.title)) q.titles.push(r.title);
  if(r.frame && !q.frames.includes(r.frame)) q.frames.push(r.frame);
  if(r.emblem && !q.emblems.includes(r.emblem)) q.emblems.push(r.emblem);
  if(r.chest && QUEST_CHESTS[r.chest]) q.chests.push(r.chest);
  if(r.xp) questsAddXp(r.xp, silent);
}
function questsRewardText(r){
  if(!r) return "";
  const out = [];
  if(r.gold) out.push(`🪙 ${typeof fmtGold === "function" ? fmtGold(r.gold) : r.gold}`);
  if(r.gems) out.push(`◆ ${r.gems} Gema${r.gems>1?"s":""}`);
  if(r.chest) out.push(`📦 ${CHEST_NAMES[r.chest]}`);
  if(r.title) out.push(`Título «${QUEST_TITLES[r.title].name}»`);
  if(r.frame) out.push(`Marco ${QUEST_FRAMES[r.frame].name}`);
  if(r.emblem) out.push(`Emblema ${QUEST_EMBLEMS[r.emblem].name}`);
  if(r.xp) out.push(`+${r.xp} XP`);
  return out.join(" · ");
}
// Nivel (de pase o de cuenta) para una XP dada.
function questsLevelFor(xp, curve, cap){
  let lv = 1, rest = Math.max(0, xp);
  while((!cap || lv < cap) && rest >= curve(lv)){ rest -= curve(lv); lv++; }
  return {level:lv, into:rest, need:(cap && lv >= cap) ? 0 : curve(lv)};
}
function questsAccount(){ const q = questsState(); return questsLevelFor(q.xp, accountXpToNext, 0); }
function questsSeason(){ const q = questsState(); return questsLevelFor(q.season.xp, seasonXpToNext, SEASON_DEF.levels); }
// Pase: se entregan solas las recompensas de cada nivel alcanzado (el nivel 1 al empezar la temporada).
function _qSyncPass(silent){
  const q = questsState(), S = questsSeason();
  while(q.season.granted < S.level){
    q.season.granted++;
    const r = SEASON_REWARDS[q.season.granted];
    if(r) questsGrant(r, true);
    if(!silent && q.season.granted > 1) _qToast({kind:"pass", icon:"star", tint:"#ffcf5c", head:`PASE · NIVEL ${q.season.granted}`, name:questsRewardText(r) || "¡Nuevo nivel!"});
  }
}
function questsAddXp(n, silent){
  n = Math.round(n||0); if(n <= 0) return;
  const q = questsState();
  q.xp += n; q.season.xp += n;
  _qSyncPass(silent);
  // nivel de cuenta: títulos por nivel
  const A = questsAccount();
  if(A.level > q.level){
    q.level = A.level;
    for(const id in QUEST_TITLES){ const T = QUEST_TITLES[id]; if(T.accountLevel && A.level >= T.accountLevel && !q.titles.includes(id)) q.titles.push(id); }
    if(!silent) _qToast({kind:"level", icon:"crown", tint:"#ff7a2e", head:"NIVEL DE CUENTA", name:`¡Nivel ${A.level}!`});
  }
}

/* ---------------- evaluación ---------------- */
// Revisa logros y desafíos; entrega lo que se completó. silent: sin avisos (desbloqueo retroactivo).
function questsEvaluate(silent){
  const q = questsState();
  if(q.retro) _qRetro(q);
  questsEnsureRotation();
  const V = questsView();
  const got = [];
  for(const a of ACHIEVEMENTS){
    if(q.ach[a.id]) continue;
    const P = questsAchProgress(a, V);
    if(P.p < P.goal) continue;
    q.ach[a.id] = Date.now();
    got.push(a);
    questsGrant(a.reward, true);
    questsAddXp(QUEST_XP.achievement, silent);
    if(!silent) _qToast({kind:"ach", icon:a.icon, tint:a.tint, cat:a.cat, head:a.secret ? "LOGRO SECRETO" : "LOGRO DESBLOQUEADO", name:a.name, sub:questsRewardText(a.reward)});
  }
  for(const kind of ["daily","weekly"]){
    const R = q[kind];
    for(const c of R.list){
      if(c.done) continue;
      if(questsChalProgress(c, V) < c.n) continue;
      c.done = true; q.counts[kind]++;
      const T = questsChalText(c);
      questsGrant({gold:c.gold}, true);
      questsAddXp(QUEST_XP[kind], silent);
      if(!silent) _qToast({kind:"chal", icon:T.icon, tint:kind === "weekly" ? "#d29aff" : "#7fe0f0", head:kind === "weekly" ? "DESAFÍO SEMANAL" : "DESAFÍO DIARIO", name:T.name, sub:questsRewardText({gold:c.gold})});
    }
    if(!R.bonus && R.list.length && R.list.every(c=>c.done)){
      R.bonus = true;
      questsGrant(CHALLENGE_BONUS[kind], true);
      questsAddXp(QUEST_XP[kind + "All"], silent);
      if(!silent) _qToast({kind:"chal", icon:"trophy", tint:"#ffcf5c", head:kind === "weekly" ? "¡SEMANA COMPLETA!" : "¡DÍA COMPLETO!", name:questsRewardText(CHALLENGE_BONUS[kind])});
    }
  }
  return got;
}

/* ---------------- ciclo de la partida ---------------- */
function _qHumans(){
  if(typeof netMatch === "undefined" || !netMatch || !Array.isArray(netMatch.slots)) return 1;
  return Math.max(1, netMatch.slots.filter(s=>s && s.kind === "human").length);
}
// keep: reconexión del invitado a la MISMA partida (sigue contando la que ya estaba en curso).
function questsOnRunStart(keep){
  questsState();
  if(keep && QST.run && !QST.run.ended) return;
  const d = questsNow();
  QST.run = {t0:Date.now(), timeMs:0, champ:(typeof selectedClass !== "undefined" ? selectedClass : null), arena:currentArena,
    divina:!!(typeof divinaMode !== "undefined" && divinaMode), humans:_qHumans(), hour:d.getHours(), ended:false};
  QST.lastTick = performance.now();
}
// XP de cuenta de una partida terminada.
function questsRunXp(o){
  if(o.divina) return 60 + (o.victory ? 80 : 0);
  let xp = 30 + Math.min(150, Math.round((o.kills||0)*0.4)) + (o.level||1)*8;
  if(o.victory) xp += 100 + (QUEST_GRADE_XP[o.grade]||0);
  if(o.coop) xp += 25;
  return xp;
}
// Cierre de la partida (una sola vez). victory: ganó; opts.divina: Arena Divina; opts.abandon: se fue.
// Devuelve el resumen para la pantalla final (lo dibuja quests-ui.js).
function questsOnRunEnd(victory, opts){
  opts = opts || {};
  const R = QST.run;
  if(!R || R.ended) return null;
  if(state === "playing") _qTickTime();
  R.ended = true;
  const q = questsState(), st = q.stats;
  const acc0 = questsAccount().level, pass0 = questsSeason().level;
  const doneBefore = q.daily.list.concat(q.weekly.list).filter(c=>c.done).length;
  const achBefore = Object.keys(q.ach).length;
  const s = (player && player.stats) || {};
  const k = (player && player.classKey) || R.champ;
  const humans = Math.max(R.humans, _qHumans()), coop = humans >= 2;
  const divina = !!(opts.divina || R.divina);
  let grade = null, score = 0;
  if(!divina && typeof computePerformance === "function" && player){ try{ const P = computePerformance(player); grade = P.grade; score = P.score; }catch(e){} }
  // contadores
  st.runs++; if(victory) st.wins++; else st.losses++;
  const kills = s.kills|0;
  st.kills += kills; st.maxRunKills = Math.max(st.maxRunKills, kills);
  st.fis += s.fissures|0; st.revives += s.revives|0;
  if(!divina){ st.subjefes += (typeof subjefesDefeated !== "undefined" ? subjefesDefeated|0 : 0);
    if(currentArena === "ciudad" && typeof cmS !== "undefined" && cmS) st.civ += cmS.saved|0; }
  st.timeMs += R.timeMs;
  if(coop){ st.coopRuns++; if(victory) st.coopWins++; if(humans >= 4) st.full4 = true; }
  if(R.hour >= 0 && R.hour < 5) st.night = true;
  const bc = st.byChamp[k] = Object.assign({runs:0, wins:0, kills:0, timeMs:0}, st.byChamp[k]||{});
  bc.runs++; if(victory) bc.wins++; bc.kills += kills; bc.timeMs += R.timeMs;
  if(divina){
    if(victory) st.divinaWins++;
    if(typeof divinaLevel !== "undefined") st.divinaBest = Math.max(st.divinaBest, divinaLevel|0);
  } else {
    if(victory) st.bosses++;   // arena ganada = su jefe final cayó
    const a = currentArena, ba = st.byArena[a] = Object.assign({runs:0, wins:0, best:0, grade:"", bestLevel:0}, st.byArena[a]||{});
    ba.runs++; if(victory) ba.wins++;
    ba.bestLevel = Math.max(ba.bestLevel, typeof runLevel !== "undefined" ? runLevel|0 : 0);
    if(grade && victory && score >= ba.best){ ba.best = score; ba.grade = grade; }
    if(victory){
      const alive = !!(player && player.alive);
      if(alive && (s.downs|0) === 0) st.deathless++;
      if(grade === "S+" || grade === "S" || grade === "A") st.gradeA++;
      if(grade === "S+" || grade === "S") st.gradeS++;
      if(grade === "S+") st.gradeSP++;
      if(alive && player.maxHp && player.hp < player.maxHp*0.10) st.closeWin = true;
      if(!st.fastWinMs || R.timeMs < st.fastWinMs) st.fastWinMs = R.timeMs;
      if(a === "ciudad" && typeof cmS !== "undefined" && cmS && cmS.total > 0 && cmS.saved >= cmS.total && !cmS.lost) st.perfectRescue = true;
      const rk = (typeof resonanceChosen === "function") ? resonanceChosen() : null;
      if(rk){ st.resoWins++; st.resoBy[rk] = (st.resoBy[rk]||0) + 1; }
      // desafíos de "distintos": arenas / guardianes de ESTA semana
      for(const c of q.weekly.list.concat(q.daily.list)){
        if(c.done || !c.set) continue;
        const v = c.stat === "distinctArenas" ? a : k;
        if(!c.set.includes(v)) c.set.push(v);
      }
    }
  }
  if(k === "musashi" && (s.duelVictories|0) >= 5) st.duel5 = true;
  const xp = questsRunXp({divina, victory, kills, level:(typeof runLevel !== "undefined" ? runLevel : 1), grade, coop});
  questsAddXp(xp);
  questsEvaluate(false);
  persist();
  const sum = {xp, victory, coop, grade, accLevel:questsAccount().level, accUp:questsAccount().level > acc0,
    pass:questsSeason(), passUp:questsSeason().level - pass0,
    chal:q.daily.list.concat(q.weekly.list).filter(c=>c.done).length - doneBefore,
    ach:Object.keys(q.ach).length - achBefore, abandon:!!opts.abandon};
  QST.lastSummary = sum;
  if(typeof questsShowRunSummary === "function") questsShowRunSummary(sum);
  return sum;
}
function _qTickTime(){
  const now = performance.now();
  if(QST.run && !QST.run.ended) QST.run.timeMs += Math.max(0, Math.min(5000, now - QST.lastTick));
  QST.lastTick = now;
}
// Una vez por segundo: suma tiempo jugado y deja saltar logros/desafíos de contador en plena partida.
function questsLiveTick(){
  if(typeof state === "undefined" || typeof save === "undefined") return;
  if(state !== "playing" || !QST.run || QST.run.ended){ QST.lastTick = performance.now(); return; }
  _qTickTime();
  try{ questsEvaluate(false); }catch(e){}
}

/* ---------------- cofres ---------------- */
function _qChestArena(){
  const done = ARENA_ORDER.filter(a=>save.arenasCleared && save.arenasCleared[a]);
  return done.length ? done[done.length-1] : ARENA_ORDER[0];
}
function _qChestChamp(){
  const own = k => save.champions[k] && save.champions[k].unlocked;
  if(save.lastChamp && own(save.lastChamp)) return save.lastChamp;
  if(typeof selectedClass !== "undefined" && selectedClass && own(selectedClass)) return selectedClass;
  return Object.keys(save.champions).find(own) || CHAMPION_CATALOG[0].id;
}
// Abre el primer cofre pendiente: botín con las tablas normales (sin tocar la protección contra la mala
// suerte). Con el inventario lleno, cada objeto que no entra se paga en oro a su precio de VENTA (antes 150
// fijos: un Raro se vende a 8 y convenía abrir los cofres con el inventario lleno, reseña de economía B3).
function questsOpenChest(){
  const q = questsState();
  if(!q.chests.length) return null;
  const variant = q.chests.shift(), cfg = QUEST_CHESTS[variant];
  const arena = _qChestArena(), classKey = _qChestChamp();
  const items = []; let gold = 0, guard = 0, given = 0;
  while(given < cfg.items && guard++ < 6){
    const res = rollLoot({arena, grade:cfg.grade, victory:true, runLevel:LEVEL_COUNT, subjefes:0, owned:ownedDesignIds(), pity:{}, classKey});
    for(const spec of res.items){
      if(given >= cfg.items) break;
      const it = materializeLoot(spec, classKey, arena); if(!it) continue;
      given++;
      if(stashFull()){ gold += Math.max(1, sellValueOf(it)); continue; }
      it.lootTier = spec.tier;
      addItemToInventory(classKey, it);
      items.push(it);
    }
  }
  if(gold) save.gold = (save.gold||0) + gold;
  if(cfg.gems) save.gems = (save.gems||0) + cfg.gems;
  q.counts.chests++;
  persist();
  return {variant, items, gold, gems:cfg.gems, grade:cfg.grade};
}

/* ---------------- perfil ---------------- */
function questsFavChamp(){
  const bc = questsState().stats.byChamp; let best = null, n = -1;
  for(const k in bc) if(CLASSES[k] && (bc[k].runs||0) > n){ n = bc[k].runs; best = k; }
  return best || (save.lastChamp && CLASSES[save.lastChamp] ? save.lastChamp : null) || Object.keys(save.champions).find(k=>save.champions[k].unlocked) || null;
}
function questsSetCosmetic(kind, id){
  const q = questsState();
  const list = {title:q.titles, frame:q.frames, emblem:q.emblems}[kind];
  if(!list || !list.includes(id)) return false;
  q[kind] = id; persist(); return true;
}
// Cosas para reclamar/mirar (el punto del botón del menú): cofres sin abrir o logros nuevos sin ver.
function questsBadgeCount(){
  const q = questsState();
  return q.chests.length + Object.keys(q.ach).filter(id=>!q.seen[id]).length;
}

/* ---------------- arranque ---------------- */
// Lo llama loadSave (también al restaurar un código de guardado): normaliza, rota los desafíos del día y,
// si es la primera vez con logros, desbloquea en silencio lo que el guardado ya tenía hecho.
function questsOnLoad(){
  try{
    save.quests = questsNormalize(save.quests); // siempre completo: un guardado a medias (o de otra versión) no rompe nada
    const q = questsState();
    _qRetro(q);
    questsEnsureRotation();
    _qSyncPass(true);
    // lo que ya se cumple (guardado restaurado con un código, o traído de otro dispositivo) se entrega sin avisos
    const got = questsEvaluate(true);
    if(got.length) QST.retroCount = (QST.retroCount||0) + got.length;
    persist();
  }catch(e){ /* un guardado raro no puede frenar el arranque */ }
}
// Guardado de antes de los logros (o uno que llegó sin estos campos): lo que ya ganó cuenta -una victoria
// por arena completada- y los logros que ya cumple se desbloquean en silencio (un solo aviso en el menú).
// Se siembra ANTES de armar los desafíos del día, para que eso no los complete de golpe.
function _qRetro(q){
  if(!q.retro) return;
  q.retro = false;
  const st = q.stats, done = ARENA_ORDER.filter(a=>save.arenasCleared && save.arenasCleared[a]);
  for(const a of done){ const b = st.byArena[a] = Object.assign({runs:0, wins:0, best:0, grade:"", bestLevel:0}, st.byArena[a]||{}); b.wins = Math.max(1, b.wins); b.runs = Math.max(b.runs, b.wins); b.bestLevel = Math.max(b.bestLevel, LEVEL_COUNT); }
  st.wins = Math.max(st.wins, done.length); st.runs = Math.max(st.runs, st.wins); st.bosses = Math.max(st.bosses, done.length);
  questsEnsureRotation();
  const got = questsEvaluate(true);
  for(const a of got) q.seen[a.id] = 1;
  if(got.length) QST.retroCount = (QST.retroCount||0) + got.length;
}
if(typeof window !== "undefined" && !window.__questsTimer) window.__questsTimer = setInterval(questsLiveTick, 1000);
