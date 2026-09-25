"use strict";
/* ============================================================
   js/systems/hero-stats.js
   Cálculo de estadísticas del héroe (clase + nivel + reliquias + objetos).
   ============================================================ */

function freshRunStats(){
  // Demo: daño de todos los héroes +10% (multiplicador global, fácil de revertir a 1 después)
  return { dmgMult:1.10, hpMult:1, speedMult:1, cdMult:1, lifesteal:0, energyRegenMult:1, critChance:0.04, critMult:1.8, defBonus:0, potionRateMult:1,
    atkSpeedMult:1, goldMult:1, xpMult:1, executeBonus:0, eliteDmgMult:1, thorns:0, regenPct:0, ultChargeMult:1 };
}

function relicBonus(kind){ return (save.relics[kind]||0)*0.015; } // 1.5% per relic, capped by relic cap

function computePlayerStats(classKey, levelOverride){
  const cls = CLASSES[classKey];
  const champ = save.champions[classKey];
  const lvl = levelOverride || champ.level;
  // Progresión al subir de nivel: cada clase crece distinto en vida/daño, para que se note su
  // identidad (el Mago gana más daño por nivel que vida, el Tanque al revés, etc.)
  const hpG = cls.hpGrowthMult!==undefined ? cls.hpGrowthMult : 1;
  const dmgG = cls.dmgGrowthMult!==undefined ? cls.dmgGrowthMult : 1;
  const hp = Math.round((cls.baseHP + (lvl-1)*7.5*hpG) * (1+relicBonus('hp')));
  let dmg = (cls.baseDmg + (lvl-1)*0.95*dmgG) * (1+relicBonus('dmg'));
  const def = Math.min(0.6, cls.baseDef + (lvl-1)*0.0016 + relicBonus('def'));
  const speed = cls.baseSpeed * (1+relicBonus('vel'));
  // Objetos equipados: el arma suma % de daño directo; casco + escudo suman su % de escudo
  // cada uno por separado (no son necesariamente iguales). Pechera/guantes/botas otorgan su %
  // garantizado como pasiva sintética (hp_mult/atkspeed_mult/speed_mult, ver
  // SLOT_GUARANTEED_EFFECT) que ya viene sumada en passiveSum -por eso se aplica acá con la
  // MISMA fórmula que usa makeHero, en vez de leer item.value de nuevo-.
  const weapon = equippedItem(classKey, "arma");
  const helmet = equippedItem(classKey, "casco");
  const shieldItem = equippedItem(classKey, "escudo");
  const weaponDmgPct = weapon ? weapon.value : 0;
  const shieldPct = (helmet ? helmet.value : 0) + (shieldItem ? shieldItem.value : 0);
  dmg = dmg * (1 + weaponDmgPct);
  const hpFinal = Math.round(hp * (1 + passiveSum(classKey,"hp_mult")));
  const speedFinal = speed * (1 + passiveSum(classKey,"speed_mult"));
  return {hp:hpFinal, dmg, def, speed:speedFinal, shieldPct};
}
