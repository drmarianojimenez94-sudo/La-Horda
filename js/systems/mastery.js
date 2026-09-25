"use strict";
/* ============================================================
   js/systems/mastery.js
   Maestría de habilidades: nivel de uso, puntos invertidos y multiplicadores.
   ============================================================ */

/* ============================================================
   MAESTRÍA DE HABILIDADES
   - Nivel de USO (useLvl): sube solo, de forma orgánica, cada vez que se lanza la habilidad.
     Es permanente, pero SOLO otorga un incremento MÍNIMO de daño (o efecto). No toca duración,
     área ni saltos de cadena.
   - Nivel de TALENTO (alloc): se invierte manualmente con puntos ganados al subir de nivel de
     personaje. Es el que hace crecer duración, área, saltos de cadena, reduce el cooldown y
     aporta la parte grande del daño/efecto.
   ============================================================ */
const TALENT_MAX = 10;      // tope de puntos de talento invertibles por habilidad
const ULT_MIN_ARENA_LEVEL = 5; // la ulti no está disponible hasta este nivel de la arena
const USE_LVL_CAP = 40;     // tope de niveles de uso (crecimiento lento, siempre mínimo)
const ULT_POINTS_MIN_LEVEL = 20; // la ulti queda en su nivel base hasta que el campeón llega a este nivel
function masteryOf(classKey, idx){
  const c = save.champions[classKey];
  return idx==="ult" ? c.ultMastery : c.skillMastery[idx];
}
function allocLevel(m){ return Math.min(TALENT_MAX, m.alloc); }
// OVERCAP de objetos (sección 14): legendarios/míticos pueden declarar skillOvercap:{0:1,"ult":1}
// para sumar niveles EFECTIVOS de una habilidad puntual sin tocar los puntos permanentes
// invertidos (m.alloc real no cambia; esto es una copia usada solo para calcular poder/tier en
// combate). Tope defensivo total +3 para que ningún stack de objetos vuelva una habilidad base
// en algo absurdamente por encima de lo que el árbol de talentos ya permite.
function itemSkillOvercap(classKey, skillKey){
  if(!classKey) return 0;
  let bonus = 0;
  EQUIP_SLOT_TYPES.forEach(type=>{
    const it = equippedItem(classKey, type);
    if(it && it.skillOvercap && it.skillOvercap[skillKey]) bonus += it.skillOvercap[skillKey];
  });
  return Math.max(0, Math.min(3, bonus));
}
function effectiveMasteryFor(classKey, skillKey){
  const real = masteryOf(classKey, skillKey);
  const bonus = itemSkillOvercap(classKey, skillKey);
  return bonus>0 ? Object.assign({}, real, {alloc: real.alloc+bonus}) : real;
}
function usePowerMult(m){ return 1 + Math.max(0, Math.min(USE_LVL_CAP, m.useLvl-1))*0.012; } // +1.2%/nivel de uso, mínimo y permanente
// Curvas de talento (alloc 0-10) CUADRÁTICAS en vez de lineales: los primeros puntos ya se
// notan, pero el salto entre nivel y nivel crece cada vez más — a nivel 10 la habilidad debe
// sentirse transformada, no "un poco mejor". El progreso es lento (cuesta ganar puntos) mucho
// más marcado en cada paso, tal como se pidió.
function allocPowerMult(m){ const a=allocLevel(m); return 1 + a*0.09 + a*a*0.012; }   // x1 -> x3.1 de nv.0 a nv.10
function masteryPowerMult(m){ return usePowerMult(m) * allocPowerMult(m); }
function masteryCdMult(m){ const a=allocLevel(m); return 1 - Math.min(0.55, a*0.02 + a*a*0.0025); } // hasta -55% cd
// Solo para el Teletransporte de Axiom: a diferencia del resto de las habilidades (tope de
// -55% de cd), esta debe llegar a tener prácticamente nada de cooldown en el nivel máximo.
function masteryTeleportCdMult(m){ const a=allocLevel(m); return 1 - Math.min(0.94, a*0.06 + a*a*0.0034); } // hasta -94% cd
function cdMultFor(sk, m){ return sk.kind==="teleport_blink" ? masteryTeleportCdMult(m) : masteryCdMult(m); }
function masteryAreaMult(m){ const a=allocLevel(m); return 1 + a*0.05 + a*a*0.006; }  // x1 -> x2.1 de área
function masteryDurationMult(m){ const a=allocLevel(m); return 1 + a*0.055 + a*a*0.007; } // x1 -> x2.25 de duración
function masteryJumpBonus(m){ return Math.floor(allocLevel(m)/2); } // +1 salto de cadena cada 2 puntos (antes cada 3)
function useXpThreshold(useLvl){ return 6 + useLvl*3; }
function gainSkillUseXp(classKey, idx){
  const m = masteryOf(classKey, idx);
  if(m.useLvl-1 >= USE_LVL_CAP) return;
  m.useXp += 1;
  const need = useXpThreshold(m.useLvl);
  if(m.useXp >= need){ m.useXp -= need; m.useLvl += 1; }
  persist();
}
// Motivo por el que no se puede subir una habilidad (o null si se puede).
function skillInvestLockReason(classKey, idx){
  const champ = save.champions[classKey];
  if(!champ) return "?";
  const m = idx==="ult" ? champ.ultMastery : champ.skillMastery[idx];
  if(allocLevel(m) >= TALENT_MAX) return "MÁX";
  if(idx==="ult" && champ.level < ULT_POINTS_MIN_LEVEL) return `La ulti se sube desde el nivel ${ULT_POINTS_MIN_LEVEL}`;
  if(champ.talentPoints<=0) return "Sin puntos";
  return null;
}
function investTalentPoint(classKey, idx){
  if(skillInvestLockReason(classKey, idx)) return false;
  const champ = save.champions[classKey];
  const m = idx==="ult" ? champ.ultMastery : champ.skillMastery[idx];
  m.alloc += 1; champ.talentPoints -= 1;
  persist();
  if(typeof onSkillInvested==="function") onSkillInvested(classKey, idx);
  return true;
}
// Sugerencia de qué subir (botón + resaltado en la partida): la ulti apenas se habilita si está
// por debajo del resto, si no la habilidad menos subida (a igualdad, la de menor número).
function suggestedSkillInvest(classKey){
  const champ = save.champions[classKey];
  if(!champ || champ.talentPoints<=0) return null;
  const opts = [0,1,2,"ult"].filter(idx=>!skillInvestLockReason(classKey, idx));
  if(!opts.length) return null;
  const lvl = idx=> allocLevel(idx==="ult" ? champ.ultMastery : champ.skillMastery[idx]);
  const minSkill = Math.min(...[0,1,2].map(lvl));
  if(opts.includes("ult") && lvl("ult") <= minSkill) return "ult";
  let best = null;
  for(const idx of opts){ if(idx==="ult") continue; if(best===null || lvl(idx) < lvl(best)) best = idx; }
  return best===null ? opts[0] : best;
}
// IA de los aliados (bots): reparte sus puntos de talento entre las 3 habilidades y la ulti,
// priorizando siempre la que menos invertida está, para que terminen con una build pareja
// en vez de dejar puntos sin gastar (el jugador sigue invirtiendo los suyos a mano).
function autoInvestTalentPoints(classKey){
  const champ = save.champions[classKey];
  if(!champ) return;
  while(champ.talentPoints>0){
    const options = [0,1,2,"ult"].filter(idx=>!skillInvestLockReason(classKey, idx));
    let best = options[0], bestLvl = Infinity;
    for(const idx of options){
      const m = idx==="ult" ? champ.ultMastery : champ.skillMastery[idx];
      const lvl = allocLevel(m);
      if(lvl < bestLvl){ bestLvl = lvl; best = idx; }
    }
    if(bestLvl >= TALENT_MAX) break; // ya está todo al máximo
    investTalentPoint(classKey, best);
  }
}
