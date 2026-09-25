"use strict";
/* ============================================================
   js/systems/rewards.js
   Evaluación de desempeño por rol y generador de recompensas.
   ============================================================ */

/* ============================================================
   FASE 2 — EVALUACIÓN DE DESEMPEÑO POR ROL + GENERADOR DE RECOMPENSAS
   ============================================================
   Cadena de responsabilidad, tal como pide el diseño:
     DESEMPEÑO (stats acumuladas durante la partida, ver hero.stats)
       -> PUNTUACIÓN (computeRoleScore: normalizada 0-100, distinta fórmula por rol)
         -> GENERADOR DE RECOMPENSAS (generateReward: la puntuación solo influye en
            las PROBABILIDADES de rareza; nunca la garantiza)
   Cada paso es independiente del siguiente: se puede cambiar la fórmula de puntaje sin
   tocar el generador de recompensas, y viceversa.
   ============================================================ */

// Suma curación (bruta y efectiva) y detecta si el objetivo estaba en peligro (<35% vida)
// y quedó a salvo: eso cuenta como "aliado salvado" para el puntaje del Curador.
function trackHeal(caster, target, amount){
  if(!caster || !caster.stats || !target) return;
  const before = target.hp;
  const after = Math.min(target.maxHp, before + amount);
  const restored = Math.max(0, after - before);
  caster.stats.healDone += amount;
  caster.stats.healEffective += restored;
  setsOnHeal(caster, restored);
  const danger = target.maxHp*0.35;
  if(before < danger && after >= danger) caster.stats.alliesSaved++;
}
// Aplica una curación de "amount" a target y, si quien cura tiene el talento correspondiente
// (overheal_shield_pct: Sanadora/Segador/Sanadora-Profeta), convierte lo que se hubiera
// desperdiciado por estar ya en vida máxima en un escudo para el objetivo -mismo criterio que
// ya usa el robo de vida del propio golpeador, ver damageEnemy-.
function applyHealOverheal(caster, target, amount){
  amount *= arenaRuleHealMult();
  const before = target.hp;
  target.hp = Math.min(target.maxHp, target.hp + amount);
  const overheal = amount - (target.hp-before);
  if(overheal>0 && caster.classKey){
    const shieldPct = passiveSum(caster.classKey, "overheal_shield_pct");
    if(shieldPct>0) target.shield = Math.min(target.maxHp*0.5, (target.shield||0) + overheal*shieldPct);
  }
}
// Cada ~1s, si el Tanque tiene 2+ enemigos cerca, suma un "tick" de presencia/control de área.
function sampleTankPresence(h, dt){
  if(perfRoleOf(h.classKey)!=="tanque") return; // Tanque y Segador (rol tanque), jugador o bot
  h.stats.statSampleTimer -= dt;
  if(h.stats.statSampleTimer>0) return;
  h.stats.statSampleTimer = 1000;
  let nearby = 0;
  for(const e of enemies){ if(e.alive && distance(h,e)<170) nearby++; }
  if(nearby>=2) h.stats.presenceTicks++;
}
// Devuelve un puntaje 0-100 normalizado para un héroe según la fórmula de su rol.
function computeRoleScore(hero){
  const cfg = SCORE_CONFIG[hero.classKey];
  if(!cfg || !hero.stats) return 0;
  let total = 0;
  for(const c of cfg){
    const raw = hero.stats[c.stat] || 0;
    total += Math.min(1, raw/c.ref) * c.weight;
  }
  return Math.round(total*100);
}
function rollRarity(score){
  const t = Math.max(0, Math.min(1, (score||0)/100));
  const weights = {};
  let total = 0;
  RARITIES.forEach(r=>{
    weights[r] = RARITY_WEIGHTS_LOW[r]*(1-t) + RARITY_WEIGHTS_HIGH[r]*t;
    total += weights[r];
  });
  let roll = Math.random()*total;
  for(const r of RARITIES){ roll -= weights[r]; if(roll<=0) return r; }
  return RARITIES[0];
}
function rollItemType(classKey){
  const w = CHAMP_ITEM_AFFINITY[classKey];
  const fallback = {arma:1/6,escudo:1/6,casco:1/6,pechera:1/6,guantes:1/6,botas:1/6};
  const weights = w || fallback;
  let roll = Math.random();
  for(const type of EQUIP_SLOT_TYPES){
    roll -= weights[type];
    if(roll<=0) return type;
  }
  return "arma";
}
// Legendario/Mítico: en vez de una fórmula procedural ("Espada legendaria +50%"), se elige
// entre los objetos DISEÑADOS a mano de esa rareza (sección 12) -si por algún motivo no hay
// ninguno disponible para el campeón+rareza+tipo pedido, cae de vuelta a lo procedural para
// nunca dejar al jugador sin recompensa-.
function rollDesignedItem(classKey, rarity, preferredType){
  const pool = designedItemsFor(classKey).filter(d=>d.rarity===rarity);
  if(!pool.length) return null;
  const sameType = pool.filter(d=>d.type===preferredType);
  const chosen = (sameType.length ? sameType : pool)[Math.floor(Math.random()*(sameType.length?sameType.length:pool.length))];
  return makeDesignedItem(chosen.id);
}
// Une los pasos: puntaje -> rareza (con azar) -> tipo relevante para el campeón -> objeto
// (diseñado a mano si es legendario/mítico, procedural si es común/raro/muy raro).
function generateReward(classKey, score){
  const rarity = rollRarity(score);
  const type = rollItemType(classKey);
  if(rarity==="legendario" || rarity==="mitico"){
    const designed = rollDesignedItem(classKey, rarity, type);
    if(designed) return designed;
  }
  return makeItem(type, rarity, classKey);
}
