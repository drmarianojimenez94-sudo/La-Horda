"use strict";
/* ============================================================
   js/systems/progression.js
   Progresión permanente: XP y niveles de campeón, oro, reliquias y castigo por
   abandonar la arena.
   ============================================================ */

// Curva de experiencia MUY empinada a propósito: subir de nivel de personaje es permanente,
// así que debe costar un esfuerzo enorme, sobre todo pasados los primeros niveles.
function xpToNext(level){ return Math.round(80 + level*55 + Math.pow(level,2.3)*4); }
// ⚠️ MULTIPLICADOR TEMPORAL DE TESTEO: mientras se está explorando/balanceando el juego, toda la
// XP ganada se multiplica x100 para poder ver progresión y desbloqueos rápido. Antes de publicar
// una build real, volver este valor a 1 para que la curva dura de arriba tenga efecto real.
const DEV_XP_MULT = 100;
function grantXP(champKey, amount){
  const c = save.champions[champKey];
  c.xp += amount * DEV_XP_MULT;
  let leveled = false;
  while(c.level < 99 && c.xp >= xpToNext(c.level)){
    c.xp -= xpToNext(c.level);
    c.level++;
    c.talentPoints = (c.talentPoints||0) + 1;
    leveled = true;
  }
  persist();
  if(leveled) playSfx("levelup");
  return leveled;
}

/* ============================================================
   CASTIGO POR NO TERMINAR LA ARENA
   Morir o abandonar antes del jefe final resta el 50% de toda la XP acumulada del
   campeón (recalculando su nivel hacia abajo si corresponde). Los puntos de talento sin
   gastar se recortan para que nunca queden más de los que el nuevo nivel permite; lo que
   ya se invirtió en maestría (alloc) NO se revierte, tal como pediste.
   ============================================================ */
const ARENA_FAIL_PENALTY_PCT = 0.5;
function totalXpForChamp(champKey){
  const c = save.champions[champKey];
  let total = 0;
  for(let lv=1; lv<c.level; lv++) total += xpToNext(lv);
  return total + c.xp;
}
function setChampFromTotalXp(champKey, totalXp){
  const c = save.champions[champKey];
  let lv = 1, remaining = Math.max(0, totalXp);
  while(lv < 99){
    const need = xpToNext(lv);
    if(remaining < need) break;
    remaining -= need; lv++;
  }
  c.level = lv; c.xp = remaining;
  const maxAllowed = Math.max(0, lv-1);
  // Si con el nivel nuevo (más bajo, por el castigo de arena) hay más puntos invertidos en
  // maestría de los que el nivel permite, se retiran los que sobran -siempre de la
  // habilidad con más invertido, para mantener la build pareja- y vuelven como puntos de
  // talento sin gastar para poder reinvertirlos. El retroceso SÍ vuelve, como pediste.
  const allocRefs = [...c.skillMastery, c.ultMastery];
  let spentAlloc = allocRefs.reduce((s,m)=>s+m.alloc,0);
  while(spentAlloc > maxAllowed){
    let best = allocRefs[0];
    for(const m of allocRefs) if(m.alloc > best.alloc) best = m;
    if(best.alloc<=0) break;
    best.alloc--; spentAlloc--;
  }
  c.talentPoints = Math.max(0, maxAllowed - spentAlloc);
}
// Devuelve {before, after, lost} para poder mostrarlo en la pantalla de derrota
function applyArenaFailurePenalty(champKey){
  const c = save.champions[champKey];
  const before = {level:c.level, xp:totalXpForChamp(champKey), gold:save.gold};
  const penalized = Math.floor(before.xp * (1-ARENA_FAIL_PENALTY_PCT));
  setChampFromTotalXp(champKey, penalized);
  const goldLost = Math.floor(save.gold * ARENA_FAIL_PENALTY_PCT);
  save.gold = Math.max(0, save.gold - goldLost);
  persist();
  return {beforeLevel:before.level, afterLevel:c.level, lostPct:Math.round(ARENA_FAIL_PENALTY_PCT*100), goldLost};
}
function grantGold(n){ save.gold += n; persist(); }
function grantRelic(kind){ save.relics[kind] = Math.min(30, (save.relics[kind]||0)+1); persist(); }
