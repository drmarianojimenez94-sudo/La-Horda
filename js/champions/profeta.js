"use strict";
/* ============================================================
   js/champions/profeta.js
   La Profeta: Presagio y combo.
   ============================================================ */

// La Profeta — Danza del Presagio / Giro del Presagio (ver triggerBasic más abajo).
const PROFETA_PRESAGIO_MAX = 4; // golpes básicos consecutivos para disparar el giro extra
const PROFETA_COMBO_WINDOW_MS = 1500; // si deja de golpear este tiempo, el contador se reinicia (ver updateAllies/update)
function triggerPresagioSpin(caster, basicDmg){
  const R = 105;
  const spinBonus = caster.classKey ? (talentSkillMods(caster.classKey, 0).flags.presagioSpinBonus||0) : 0;
  const dmg = basicDmg * (1.6+spinBonus);
  for(const e of enemies){
    if(!e.alive) continue;
    if(distance(caster,e) <= R) damageEnemy(e, dmg, {src:caster});
  }
  caster.profetaSpinFxTimer = 480;
  particles.push({x:caster.x,y:caster.y, life:420, maxLife:420, spin:true, radius:R*0.85, color:"#8fffe0"});
  particles.push({x:caster.x,y:caster.y, life:380, ring:true, maxLife:380, maxR:R, color:"#eafff8"});
  if(caster===player) floatText(caster.x, caster.y-46, "¡GIRO DEL PRESAGIO!", "crit");
  playSfx("cast");
}
