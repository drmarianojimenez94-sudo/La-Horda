"use strict";
/* ============================================================
   js/champions/segador.js
   Segador Olvidado: mecánicas propias (Furia, Tajo Final).
   ============================================================ */

// Tajo Final de la Furia (Nivel 6 de la Armadura de la Furia del Segador Olvidado): se
// dispara solo, justo cuando termina la ventana de Furia. Empuje máximo, +150% de daño,
// visual de berserker al máximo.
function triggerFuryFinalSlash(caster){
  const R = 130;
  const dmg = caster.baseDmg * runStats.dmgMult * furyMissingHpMult(caster) * 2.5;
  for(const e of enemies){
    if(!e.alive) continue;
    if(distance(caster,e) <= R){
      damageEnemy(e, dmg, {src:caster, forceCrit:true, knockback:220});
    }
  }
  tieredBurstVFX(caster.x, caster.y, R, 10, "#ff2a2a", "#ffb36a");
  particles.push({x:caster.x,y:caster.y, life:600, ring:true, maxLife:600, maxR:R, color:"#ff3d1f"});
  for(let i=0;i<24;i++){
    const a = Math.random()*Math.PI*2;
    particles.push({x:caster.x, y:caster.y, vx:Math.cos(a)*180, vy:Math.sin(a)*180-20, life:500, color:Math.random()<0.5?"#ff3d1f":"#ffcf5c"});
  }
  if(caster===player) floatText(caster.x, caster.y-60, "¡TAJO FINAL!", "crit");
}
// Pasivo del Segador Olvidado (Último Aliento): cuanto menos vida le queda, más daño hace.
// Corre SIEMPRE, no solo cuando activa la habilidad 3 (esa es un burst extra encima de esto).
function furyMissingHpMult(h){
  if(h.classKey!=="segador" || !h.maxHp) return 1;
  const missingPct = 1 - Math.max(0,h.hp)/h.maxHp;
  // Talentos de la rama "Ira Carmesí" (missinghp_dmg_bonus) amplifican este mismo pasivo de
  // siempre en vez de crear uno nuevo -sigue siendo "cuanto menos vida, más daño", solo más fuerte-.
  const talentBonus = passiveSum(h.classKey, "missinghp_dmg_bonus");
  return 1 + missingPct*(0.9+talentBonus); // hasta +90% (+talentos) de daño con la vida en 0
}
