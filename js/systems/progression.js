"use strict";
/* ============================================================
   js/systems/progression.js
   Progresión permanente: XP y niveles de guardián, oro, reliquias y castigo por
   abandonar la arena.
   ============================================================ */

// Curva de experiencia: RÁPIDA al comienzo (los primeros 10 niveles cuestan la mitad que antes: el
// jugador siente crecer a su guardián partida a partida) y cada vez MÁS LENTA (término cúbico): se
// cruza con la curva anterior cerca del nivel 35 y el nivel 60 cuesta el doble. No hay un nivel
// final "objetivo": el final de la campaña cae donde caiga (ver LA_HORDA_PROGRESSION_ECONOMY_REPORT.md),
// y el endgame pide mucho más esfuerzo. Sin multiplicadores: XP real de enemigos y victorias.
function xpToNext(level){ return Math.round(90 + level*26 + 0.16*Math.pow(level,3)); }
// MODO DEV (solo para probar, NO es el ritmo del juego): ?devxp=5 en la URL multiplica toda la XP de
// guardián (1–20). Muestra un cartel fijo "DEV XP ×N" para que nunca se confunda con el juego real.
const DEV_XP_MULT = (()=>{ try{ const v = parseFloat(new URLSearchParams(location.search).get("devxp")); return v > 1 ? Math.min(20, v) : 1; }catch(e){ return 1; } })();
if(DEV_XP_MULT > 1) window.addEventListener("DOMContentLoaded", ()=>{ const b = document.createElement("div"); b.id = "dev-xp-badge"; b.textContent = "DEV XP ×" + DEV_XP_MULT;
  b.style.cssText = "position:fixed;left:50%;bottom:2px;transform:translateX(-50%);z-index:9999;font:10px monospace;color:#ffd24a;background:rgba(0,0,0,0.6);padding:1px 6px;border-radius:4px;pointer-events:none"; document.body.appendChild(b); });
function grantXP(champKey, amount){
  const c = save.champions[champKey];
  amount = Math.round(amount*DEV_XP_MULT);
  c.xp += amount;
  let leveled = false;
  while(c.level < 99 && c.xp >= xpToNext(c.level)){
    c.xp -= xpToNext(c.level);
    c.level++;
    c.talentPoints = (c.talentPoints||0) + 1;
    leveled = true;
  }
  persist();
  if(leveled){ playSfx("levelup"); if(typeof juiceLevelUp==="function") juiceLevelUp(champKey, c.level); } // destello + aro dorado en partida (juice.js)
  return leveled;
}

/* ============================================================
   CASTIGO POR NO TERMINAR LA ARENA  (con perdón para las primeras derrotas: ver más abajo)
   Morir o abandonar antes del jefe final resta un porcentaje de la XP y del oro GANADOS EN
   ESA PARTIDA (no del total acumulado): perder duele, pero nunca te deja por debajo del nivel
   y del oro con los que entraste, así que no se puede quedar trabado retrocediendo.
   Calibrado con 360 partidas simuladas desde cero (0%, 25%, 35% y 50%, 3 guardianes x 30
   partidas): con 50% ningún guardián perdió jamás un nivel y el ritmo para pasar arenas fue el
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
  // (El árbol de talentos tiene su propia bolsa, derivada del nivel: treePointsAvailable en
  // talents.js. Bajar de nivel no le saca nodos; solo tarda más en dar el próximo punto.)
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
// PRIMERAS DERROTAS SIN CASTIGO (reseña #11): perder el 50 % y bajar de nivel en la primera arena
// espantaba al que recién empieza. No se castiga en la primera arena de la campaña (en Normal: ahí se
// aprende) ni en las primeras FAIL_FORGIVE_FIRST derrotas de la cuenta, en cualquier arena. Después,
// como siempre. Las derrotas se cuentan en save.defeatCount (también las perdonadas y los abandonos).
const FAIL_FORGIVE_FIRST = 3;
// null = se castiga; si no, el motivo del perdón ("arena" o "primeras")
function arenaFailureForgiveReason(){
  const first = typeof ARENA_ORDER!=="undefined" ? ARENA_ORDER[0] : "ciudad";
  const tier = typeof diffCurrent==="function" ? diffCurrent() : "normal";
  if(currentArena===first && tier==="normal") return "arena";
  if((save.defeatCount||0) < FAIL_FORGIVE_FIRST) return "primeras";
  return null;
}
// Devuelve {beforeLevel, afterLevel, lostPct, xpLost, goldLost, forgiven, forgivenLeft} para la pantalla de derrota
function applyArenaFailurePenalty(champKey){
  const c = save.champions[champKey];
  const forgiven = arenaFailureForgiveReason();
  save.defeatCount = (save.defeatCount||0) + 1;
  if(forgiven){
    persist();
    return {beforeLevel:c.level, afterLevel:c.level, lostPct:0, xpLost:0, goldLost:0, forgiven,
      forgivenLeft: Math.max(0, FAIL_FORGIVE_FIRST - save.defeatCount)};
  }
  const beforeLevel = c.level, total = totalXpForChamp(champKey);
  const xpLost = Math.floor(Math.max(0, total - runStartXp) * ARENA_FAIL_PENALTY_PCT);
  if(xpLost > 0) setChampFromTotalXp(champKey, total - xpLost);
  const goldLost = Math.floor(Math.max(0, save.gold - runStartGold) * ARENA_FAIL_PENALTY_PCT);
  save.gold = Math.max(0, save.gold - goldLost);
  persist();
  return {beforeLevel, afterLevel:c.level, lostPct:Math.round(ARENA_FAIL_PENALTY_PCT*100), xpLost, goldLost, forgiven:null, forgivenLeft:0};
}
function grantGold(n){ save.gold += n; persist(); }
function grantRelic(kind){ save.relics[kind] = Math.min(30, (save.relics[kind]||0)+1); persist(); }
