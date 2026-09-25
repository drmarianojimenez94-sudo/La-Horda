"use strict";
/* ============================================================
   js/systems/progression.js
   Progresión permanente: XP y niveles de campeón, oro, reliquias y castigo por
   abandonar la arena.
   ============================================================ */

// Curva de experiencia empinada a propósito: subir de nivel de personaje es permanente, así que
// cuesta cada vez más pasados los primeros niveles. Sin multiplicadores: la XP que se gana es la
// real de los enemigos y de la victoria. Calibrada con campañas simuladas desde cero (nivel 1,
// 6 arenas en orden, tools/playtest): quien juega bien termina la campaña cerca del nivel 40
// (unos 80.000 XP en total); quien pierde muchas partidas llega un poco más abajo, porque perder
// solo conserva la mitad de lo ganado.
function xpToNext(level){ return Math.round(200 + level*50 + Math.pow(level,2.3)*0.6); }
function grantXP(champKey, amount){
  const c = save.champions[champKey];
  c.xp += amount;
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
   Morir o abandonar antes del jefe final resta un porcentaje de la XP y del oro GANADOS EN
   ESA PARTIDA (no del total acumulado): perder duele, pero nunca te deja por debajo del nivel
   y del oro con los que entraste, así que no se puede quedar trabado retrocediendo.
   Calibrado con 360 partidas simuladas desde cero (0%, 25%, 35% y 50%, 3 campeones x 30
   partidas): con 50% ningún campeón perdió jamás un nivel y el ritmo para pasar arenas fue el
   mismo en todos los casos (el freno real es la dificultad de cada arena); lo que sí baja es
   la velocidad de subida (~Nv. 51-60 vs ~56-76 a las 30 partidas) y el oro juntado (-25/-50%).
   ============================================================ */
let ARENA_FAIL_PENALTY_PCT = 0.5; // let: las pruebas de balance (tools/playtest) lo varían para calibrar
let runStartXp = 0, runStartGold = 0;
function markRunStartProgress(champKey){
  runStartXp = totalXpForChamp(champKey);
  runStartGold = save.gold;
}
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
  // Si con el nivel nuevo hay más puntos invertidos en maestría de los que el nivel permite, se
  // retiran los que sobran (de la habilidad con más invertido) y vuelven como puntos sin gastar.
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
// Devuelve {beforeLevel, afterLevel, lostPct, xpLost, goldLost} para la pantalla de derrota
function applyArenaFailurePenalty(champKey){
  const c = save.champions[champKey];
  const beforeLevel = c.level, total = totalXpForChamp(champKey);
  const xpLost = Math.floor(Math.max(0, total - runStartXp) * ARENA_FAIL_PENALTY_PCT);
  if(xpLost > 0) setChampFromTotalXp(champKey, total - xpLost);
  const goldLost = Math.floor(Math.max(0, save.gold - runStartGold) * ARENA_FAIL_PENALTY_PCT);
  save.gold = Math.max(0, save.gold - goldLost);
  persist();
  return {beforeLevel, afterLevel:c.level, lostPct:Math.round(ARENA_FAIL_PENALTY_PCT*100), xpLost, goldLost};
}
function grantGold(n){ save.gold += n; persist(); }
function grantRelic(kind){ save.relics[kind] = Math.min(30, (save.relics[kind]||0)+1); persist(); }
