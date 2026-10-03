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
  amount = Math.round(amount*DEV_XP_MULT*(typeof alphaWorldMultiplier==="function"?alphaWorldMultiplier("xp"):1));
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
   XP DE VICTORIA (reseña §6.4 #12): antes era 40 × puntaje × (1 + puntaje/100), IGUAL en todas las
   arenas: +5554 al ganar la Ciudad (Nv. 18 → 23 de golpe) y los talentos de los escalones 4-5 llegaban
   en la arena 2. Ahora se mide en NIVELES al nivel ESPERADO de la arena (VICTORY_XP_REF: el nivel con el
   que un jugador que va bien le gana al jefe): de 0,5 niveles (puntaje 0) a 1,4 (puntaje 100 o más).
   Se paga al nivel esperado, no al tuyo: si venís atrasado te empuja un poco más; si volvés a una arena
   fácil con un guardián alto, casi no sube. Pesadilla/Infierno multiplican (XP ×1,6 / ×2,3) con tope de
   1,5 niveles. Calibrado con tools/balance/xp_curve.js (XP de bajas medida con campaign_runs.js) para
   que la campaña siga terminando cerca del nivel 40.
   ============================================================ */
const VICTORY_XP_CFG = {
  minLevels:0.5, maxLevels:1.4, capLevels:1.5,
  // nivel esperado al vencer al jefe de cada arena (Normal; en Pesadilla/Infierno se suma su lvlOffset)
  ref:{ciudad:9, fortaleza:14, bosque:18, micelial:22, hielo:25, acuatica:28, laberinto:31, abismo:33, minas:35, infernal:37, divina:34}
};
function victoryXpFor(arena, score, playerLevel, diffKey){
  const C = VICTORY_XP_CFG;
  let ref = C.ref[arena] || playerLevel || 1;
  let mult = 1;
  if(diffKey && diffKey!=="normal" && typeof diffTier==="function"){ const T = diffTier(diffKey); ref += T.lvlOffset||0; mult = T.xp||1; }
  ref = Math.max(1, Math.min(98, ref));
  const k = Math.max(0, Math.min(1, (score||0)/100));
  const levels = Math.min(C.capLevels, (C.minLevels + (C.maxLevels - C.minLevels)*k) * mult);
  return Math.round(xpToNext(ref) * levels);
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
function grantGold(n){ save.gold += Math.round(n*(typeof alphaWorldMultiplier==="function"?alphaWorldMultiplier("gold"):1)); persist(); }
function grantRelic(kind){ save.relics[kind] = Math.min(30, (save.relics[kind]||0)+1); persist(); }
