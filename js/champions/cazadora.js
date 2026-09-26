"use strict";
/* ============================================================
   js/champions/cazadora.js
   Sylva, la Cazadora del Bosque (clave "cazadora"): Rastreo, Impulso,
   Lluvia de la Cazadora y Lobo Espectral.
   ============================================================ */

/* ============================================================
   SYLVA — Lluvia de la Cazadora (AoE con demora que converge en la Presa). Mismo patrón que
   axiomZones (array propio, se actualiza cada frame, se filtra al vencer) para no tocar nada
   del resto de campeones.
   ============================================================ */
function updateSylvaRainZones(dt){
  for(const z of sylvaRainZones){
    z.timer -= dt;
    if(Math.random()<0.4) particles.push({x:z.x+(Math.random()-0.5)*z.radius*1.6, y:z.y+(Math.random()-0.5)*z.radius*0.6-60, vx:0, vy:40, life:260, color:"#8fd45a"});
    if(z.timer<=0 && !z.exploded){
      z.exploded = true;
      const nearby = enemies.filter(e=>e.alive && distance(z,e)<=z.radius);
      if(nearby.length){
        const totalHits = z.totalHits||12;
        const focusTarget = (z.src.huntTarget && z.src.huntTarget.alive && nearby.includes(z.src.huntTarget)) ? z.src.huntTarget : null;
        const others = nearby.filter(e=>e!==focusTarget);
        const hitCounts = new Map();
        if(focusTarget){
          const focusShare = Math.max(0.3, 1 - others.length*0.12);
          const targetHits = Math.round(totalHits*focusShare);
          hitCounts.set(focusTarget, targetHits);
          let remaining = totalHits - targetHits;
          if(others.length){
            const base = Math.floor(remaining/others.length); let extra = remaining - base*others.length;
            others.forEach(e=>{ let n=base+(extra>0?1:0); if(extra>0) extra--; hitCounts.set(e,n); });
          }
        } else {
          const base = Math.floor(totalHits/nearby.length); let extra = totalHits - base*nearby.length;
          nearby.forEach(e=>{ let n=base+(extra>0?1:0); if(extra>0) extra--; hitCounts.set(e,n); });
        }
        let momentumGain = 0;
        hitCounts.forEach((n,e)=>{
          if(n<=0) return;
          for(let i=0;i<n;i++) damageEnemy(e, z.dmg, {src:z.src});
          momentumGain += 0.4;
          pushSpark("impacto", e.x, e.y, 34, 180);
        });
        if(z.src) z.src.momentum = Math.min(10, (z.src.momentum||0) + Math.min(2.5, momentumGain));
      }
      particles.push({x:z.x,y:z.y, life:420, ring:true, maxLife:420, maxR:z.radius*1.2, color:"#8fd45a"});
    }
  }
  sylvaRainZones = sylvaRainZones.filter(z=>!z.exploded || z.timer > -400);
}
function drawSylvaRainZones(){
  for(const z of sylvaRainZones){
    if(z.exploded) continue;
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = "#8fd45a"; ctx.lineWidth = 2;
    ctx.setLineDash([6,5]);
    ctx.beginPath(); ctx.arc(z.x, z.y, z.radius, 0, Math.PI*2); ctx.stroke();
    ctx.restore();
    // Arte real de la Lluvia de la Cazadora (antes sin usar), sumado sobre el telegraph
    // punteado que ya existía: flecha subiendo -> cayendo -> impacto en el suelo, en los
    // mismos 900ms de demora que ya tenía la habilidad (el daño se resuelve igual que antes).
    if(SYLVA_RAIN_READY.f1){
      const seq = ["f1","f2","f3"];
      const progress = Math.max(0, Math.min(0.999, 1 - z.timer/900));
      const img = SYLVA_RAIN_IMG[seq[Math.floor(progress*seq.length)]];
      const s = (z.radius*1.6)/img.height;
      const clip = { frames: [{x:0, y:0, w:img.width, h:img.height}] };
      drawAnimFrameSized(img, clip, 0, z.x, z.y, img.width*s, img.height*s, 0.5, 0.85, false, 0.85);
    }
  }
}

/* ============================================================
   SYLVA, LA CAZADORA DEL BOSQUE — mecánicas propias
   ============================================================
   Instinto de Caza (Presa/Rastreo 0-5) + Impulso (0-10, sube moviéndose/atacando, decae con
   gracia) son DOS sistemas separados que se combinan (sylvaCombatMods), igual criterio que ya
   usa Musashi (Concentración + Senda del Rōnin): nunca se mezclan en una sola variable.
   ============================================================ */
const SYLVA_MOMENTUM_GRACE_MS = 700;
const SYLVA_CHARGE_MAX_MS = 900; // tiempo de mantener pulsado Flecha Perforante para carga máxima
function sylvaTrackBonuses(stacks){
  const s = Math.max(0, Math.min(5, stacks||0));
  return { speedMult: 1+0.04*s, atkSpeedMult: 1+0.05*s, cornered: s>=5 };
}
function sylvaMomentumBonuses(momentum){
  const m = Math.max(0, Math.min(10, momentum||0));
  return { atkSpeedMult: 1+0.02*m, speedMult: 1+0.01*m };
}
// Combina Rastreo + Impulso (+ el máximo fijo de Impulso durante Cacería Salvaje) en un solo
// paquete, aplicado una sola vez sobre velocidad/daño/crítico -mismo criterio "sin
// double-dipping" que ya usa musashiCombatMods-.
function sylvaCombatMods(h){
  const track = sylvaTrackBonuses(h.trackStacks);
  const momVal = h.wildHuntTimer>0 ? 10 : h.momentum;
  const mom = sylvaMomentumBonuses(momVal);
  const ultMods = h.wildHuntTimer>0 ? CLASSES.cazadora.ultimate : null;
  const trapBurst = (h.sylvaTrapBurstTimer>0) ? 1.3+(h.sylvaTrapBurstBonus||0) : 1;
  return {
    speedMult: track.speedMult * mom.speedMult * trapBurst * (ultMods ? ultMods.speedMult : 1),
    atkSpeedMult: track.atkSpeedMult * mom.atkSpeedMult * (ultMods ? ultMods.atkSpeedMult : 1),
    dmgMult: 1 + (track.cornered ? 0.15 : 0),
    critChanceAdd: (track.cornered ? 0.25 : 0) + (ultMods ? ultMods.critChanceBonus : 0),
    rangeMult: ultMods ? ultMods.rangeMult : 1,
    cornered: track.cornered
  };
}
function sylvaAddTrack(h, target, amount){
  if(!target) return;
  const wasCornered = h.trackStacks>=5;
  if(h.huntTarget===target && h.huntTarget.alive){
    h.trackStacks = Math.min(5, h.trackStacks + amount);
  } else {
    h.huntTarget = target;
    h.trackStacks = Math.min(5, amount);
  }
  if(!wasCornered && h.trackStacks>=5){
    champSetOnCornered(h); // set La Manada
    if(h===player){
      floatText(h.x, h.y-46, "¡PRESA ACORRALADA!", "crit");
      particles.push({x:h.x,y:h.y, life:320, ring:true, maxLife:320, maxR:46, color:"#ffb84a"});
    }
  }
}
function sylvaClearTrack(h){ h.huntTarget = null; h.trackStacks = 0; }
// Impulso: sube mientras se mueve O ataca (con una breve gracia para no castigar micro-pausas),
// decae PROGRESIVAMENTE (no de golpe) si pasa ese tiempo sin ninguna de las dos cosas. Durante
// Cacería Salvaje queda fijo en el máximo (ver sylvaCombatMods, no hace falta tocarlo acá).
function updateSylvaMomentum(h, dt){
  if(h.sylvaCharging) h.sylvaChargeTimer = Math.min(SYLVA_CHARGE_MAX_MS, (h.sylvaChargeTimer||0)+dt);
  if(h.sylvaTrapBurstTimer>0) h.sylvaTrapBurstTimer -= dt;
  if(h.wildHuntTimer>0){
    h.wildHuntTimer -= dt;
    h.momentumGraceTimer = SYLVA_MOMENTUM_GRACE_MS;
    if(h.wildHuntTimer<=0){
      h.wildHuntTimer = 0;
      if(h===player) showBanner("Cacería Salvaje ha terminado");
      despawnSylvaWolf(h);
    }
    return;
  }
  const active = h.moving || (h.attackAnim>0) || h.sylvaCharging;
  if(active){
    h.momentumGraceTimer = SYLVA_MOMENTUM_GRACE_MS;
    const wasMaxed = h.momentum>=10;
    h.momentum = Math.min(10, h.momentum + dt*0.006);
    if(!wasMaxed && h.momentum>=10 && h===player){
      floatText(h.x, h.y-46, "¡IMPULSO MÁXIMO!", null);
    }
  } else {
    h.momentumGraceTimer -= dt;
    if(h.momentumGraceTimer<=0) h.momentum = Math.max(0, h.momentum - dt*0.0035);
  }
}
// Lobo Espectral (solo existe durante Cacería Salvaje): IA mínima a propósito (sección 28,
// "mantenerla simple") -persigue exclusivamente a la Presa, muerde al alcanzarla, se
// reasigna sola si la Presa muere-. No vive en `enemies` ni `heroes`: es un objeto liviano
// colgado del héroe (h.wolf), así no interfiere con ningún sistema genérico de esos arrays.
function spawnSylvaWolf(h){
  h.wolf = { x:h.x+30, y:h.y, fx:1, fy:0, moving:false, biteCd:0, biteTimer:0, jumping:false, animT:0 };
}
// Único "Luna Roja": el lobo aparece un rato al marcar una Presa nueva (fuera de la ulti).
function sylvaSummonWolf(h, ms){ if(!h.wolf) spawnSylvaWolf(h); h._uqWolfT = ms; }
function despawnSylvaWolf(h){
  if(h.wolf){ particles.push({x:h.wolf.x,y:h.wolf.y, life:320, ring:true, maxLife:320, maxR:34, color:"#5ad0c8"}); }
  h.wolf = null;
}
function updateSylvaWolf(h, dt){
  const w = h.wolf;
  if(!w) return;
  w.animT += dt;
  w.biteCd = Math.max(0, w.biteCd-dt);
  if(w.biteTimer>0) w.biteTimer -= dt;
  let target = (h.huntTarget && h.huntTarget.alive) ? h.huntTarget : nearestEnemyTo(h, 500);
  if(!target){ w.moving = false; return; }
  const dx = target.x-w.x, dy = target.y-w.y, d = Math.hypot(dx,dy)||1;
  w.fx = dx/d; w.fy = dy/d;
  if(d > 44){
    w.moving = true; w.jumping = d>160;
    const spd = 300;
    w.x += w.fx*spd*dt/1000; w.y += w.fy*spd*dt/1000;
  } else {
    w.moving = false; w.jumping = false;
    if(w.biteCd<=0){
      w.biteCd = 850; w.biteTimer = 240;
      // Talento "Jauría Espectral": el Lobo Espectral muerde con más fuerza.
      const wolfBonus = 1+(talentSkillMods(h.classKey, "ult").flags.wolfDmgBonus||0);
      const dmg = h.baseDmg * 1.1 * wolfBonus * runStats.dmgMult * arenaMods().heroDmgMult;
      damageEnemy(target, dmg, {src:h});
      target.slowTimer = Math.max(target.slowTimer||0, 1500); target.slowAmt = Math.max(target.slowAmt||0, 0.4);
      pushSpark("impacto", target.x, target.y, 40, 200);
    }
  }
}
