"use strict";
/* ============================================================
   js/systems/champion-sets.js
   Comportamiento de los SETS DE CAMPEÓN (datos en js/data/champion-sets.js). Se engancha a los
   mismos eventos que los sets universales (js/systems/set-effects.js: setsOnHit/Kill/Cast/Hurt,
   updateSets) y a unos pocos puntos del kit de cada campeón (Paso Perfecto, Trampa del Bosque,
   Giro del Presagio, básico de Musashi, forma titánica de Eren...). Todo con tope o enfriamiento.
   ============================================================ */
const _normalish = e => e.rank==="normal" || e.rank==="subelite" || e.rank==="elite";

/* ---------------- lectura desde las fórmulas ---------------- */
function champSetDamageMult(h, e, opts){
  let m = 1;
  if(h._elemSwapT > 0 && !opts.fromBasic) m *= 1.25;           // Convergencia 3
  if(h._tide) m *= 1 + 0.03*h._tide;                            // Marea Roja 4
  return m;
}
function champSetCritBonus(h, e, opts){
  if(!h || !h.classKey) return null;
  // Sombra Nocturna 3: habilidades contra sangrantes = crítico asegurado
  if(!opts.fromBasic && e.bleedTimer>0 && setN(h, "nocturno") >= 3) return {chance:1, mult:0};
  // La Manada 3: flechas contra la presa atrapada = crítico
  if(opts.fromBasic && h.classKey==="cazadora" && e===h.huntTarget && e.stunTimer>0 && setN(h, "manada") >= 3) return {chance:1, mult:0};
  return null;
}
function champSetLifesteal(h){ return h && h._tide ? 0.015*h._tide : 0; }
// Furia generada (Segador: Marea Roja 2 · Eren: Legión 2)
function setFuryMult(h){
  if(!h || !h.classKey) return 1;
  if(h.classKey==="segador" && setN(h, "marea") >= 2) return 1.2;
  if(h.classKey==="eren" && setN(h, "legion") >= 2) return 1.15;
  return 1;
}
function champSetTitanDurMult(h){ return setN(h, "legion") >= 4 ? 1.3 : 1; }

/* ---------------- eventos ---------------- */
function champSetsOnHit(h, e, dmg, crit, opts){
  const c = heroSetCounts(h); if(!c) return;
  const fromBasic = !!opts.fromBasic;
  // Baluarte 3: habilidades del Tanque empujan y hacen tambalear
  if((c.baluarte||0) >= 3 && !fromBasic && h.classKey==="tanque" && e.alive && _normalish(e)){
    e.stunTimer = Math.min(Math.max(e.stunTimer||0, 0) + 250, 1600);
    const dx = e.x-h.x, dy = e.y-h.y, d = Math.hypot(dx,dy)||1; e.x += dx/d*18; e.y += dy/d*18;
  }
  // Baluarte 4: cada 3er básico (por golpe, no por enemigo) = pisotón sísmico
  if((c.baluarte||0) >= 4 && fromBasic && h.classKey==="tanque" && runElapsedMs !== h._bsSwingAt){
    h._bsSwingAt = runElapsedMs; h._bsN = (h._bsN||0) + 1;
    if(h._bsN >= 3){ h._bsN = 0; baluarteQuake(h); }
  }
  // Convergencia 4: fuego + hielo + rayo en 4 s
  if((c.convergencia||0) >= 4 && h.classKey==="mago" && e.alive && !opts.fromProc){
    const now = runElapsedMs;
    if(opts.burn) e._cvF = now;
    if(opts.slow && !fromBasic) e._cvI = now;
    if(opts.chain) e._cvL = now;
    const fresh = t => t!==undefined && now - t < 4000;
    if(fresh(e._cvF) && fresh(e._cvI) && fresh(e._cvL)){ e._cvF = e._cvI = e._cvL = undefined; convergenceBurst(h, e); }
  }
  // Marea Roja 3: con más de 50% de Furia, los básicos sangran
  if((c.marea||0) >= 3 && fromBasic && h.classKey==="segador" && h.energy > h.maxEnergy*0.5 && e.alive){
    e.bleedTimer = Math.max(e.bleedTimer||0, 2600); e.bleedDmg = Math.max(e.bleedDmg||0, _setBase(h)*0.22);
  }
  // Granadero 3: el fusil aturde
  if((c.granadero||0) >= 3 && fromBasic && h.classKey==="libertador" && !h.smMounted && e.alive && _normalish(e)) e.stunTimer = Math.max(e.stunTimer||0, 400);
  // La Manada 4: con el lobo presente, las flechas contra la Presa rebotan
  if((c.manada||0) >= 4 && fromBasic && h.classKey==="cazadora" && h.wolf && e===h.huntTarget && _setReady(h, "packBounce", 150)){
    const near = enemies.filter(o=>o.alive && o!==e && Math.hypot(o.x-e.x, o.y-e.y) < 200).sort((a,b)=>Math.hypot(a.x-e.x,a.y-e.y)-Math.hypot(b.x-e.x,b.y-e.y)).slice(0,2);
    for(const o of near){ pushChainBolt(e.x, e.y-12, o.x, o.y-10, 10, 200); damageEnemy(o, dmg*0.6, {src:h, fromProc:true}); }
  }
  if(!opts.fromProc) e._lastFromBasic = fromBasic;
}
function champSetsOnKill(h, e){
  const c = heroSetCounts(h); if(!c) return;
  // Sombra Nocturna 4: bajas prioritarias = sigilo + reinicia Triple Golpe
  if((c.nocturno||0) >= 4 && h.classKey==="guerrero" && (e.rank==="elite" || e.rank==="subjefe")){
    h.stealthTimer = Math.max(h.stealthTimer||0, 1500);
    if(h.cds) h.cds[1] = 0;
    for(const o of enemies) if(o.target===h) o.target = null;
    vfxBurst(h.x, h.y-18, 12, "shadow", 120, 400, 3, h===player?2:1, -20, 0);
    _setMsg(h, "¡SOMBRA!");
  }
  // Marea Roja 4: bajas con poca vida suman Sangre
  if((c.marea||0) >= 4 && h.classKey==="segador" && h.hp < h.maxHp*0.5){
    const was = h._tide||0; h._tide = Math.min(10, was + 1);
    if(h._tide===10 && was<10) _setMsg(h, "¡TAJO DE LA MUERTE LISTO!");
  }
  // Acceso Raíz 4: infectados por Sobrescribir contagian al morir
  if((c.sistema||0) >= 4 && h.classKey==="axiom" && e._overwriteBy===h){
    const near = enemies.filter(o=>o.alive && o!==e && Math.hypot(o.x-e.x, o.y-e.y) < 170).slice(0,2);
    for(const o of near){ o.bleedTimer = Math.max(o.bleedTimer||0, 2600); o.bleedDmg = Math.max(o.bleedDmg||0, _setBase(h)*0.3); o._overwriteBy = h; drawAxiomVfxBurst(o.x, o.y, "overwrite"); }
    if(h.cds) h.cds[0] = Math.max(0, (h.cds[0]||0) - 1000);
  }
  // Granadero 4: disparo de fusil que mata = recarga instantánea
  if((c.granadero||0) >= 4 && h.classKey==="libertador" && !h.smMounted && e._lastFromBasic && _setReady(h, "reload", 120)){
    h.basicCd = Math.min(h.basicCd||0, 60);
    if(h===player) floatText(h.x, h.y-58, "¡RECARGA!", "crit");
  }
  // Legión 4: transformado, cada baja cura 2%
  if((c.legion||0) >= 4 && h.classKey==="eren" && h.erenTitan){ h.hp = Math.min(h.maxHp, h.hp + h.maxHp*0.02*arenaRuleHealMult()); }
}
function champSetsOnCast(h, sk, isUlt){
  const c = heroSetCounts(h); if(!c) return;
  // Convergencia 3: cambiar de elemento potencia
  if((c.convergencia||0) >= 3 && sk.element && ["fire","ice","lightning"].includes(sk.element)){
    if(h._lastElem && h._lastElem !== sk.element){ h._elemSwapT = 4000; _setMsg(h, "¡CAMBIO DE ELEMENTO!"); }
    h._lastElem = sk.element;
  }
  // Bendición del Custodio 3: los buffs también curan
  if((c.custodio||0) >= 3 && (sk.kind==="team_atk_buff" || sk.kind==="team_shield_buff")){
    for(const a of heroes){ if(!a.alive || distance(a,h) > (sk.radius||260)) continue; a.regenTimer = Math.max(a.regenTimer||0, 3000); a.regenPerSec = Math.max(a.regenPerSec||0, a.maxHp*0.06); }
  }
  // Acceso Raíz 3: el Teletransporte deja un glitch donde estabas
  if((c.sistema||0) >= 3 && sk.kind==="teleport_blink"){
    const gx = h.x, gy = h.y;
    vfxTelegraph({x:gx, y:gy, r:90, dur:700, rgb:"70,240,210"});
    runLater(700, ()=>{
      for(const o of enemies){ if(!o.alive || Math.hypot(o.x-gx, o.y-gy) > 90) continue; damageEnemy(o, _setBase(h)*1.1, {src:h, fromProc:true, slow:0.4, slowDur:1500}); }
      drawAxiomVfxBurst(gx, gy, "teleport_out"); vfxShock(gx, gy, 8, 90, "70,240,210", 300, h===player?1:0);
    });
  }
  // Marea Roja 4: Tajo de la Muerte
  if((c.marea||0) >= 4 && sk.kind==="cone_slash" && (h._tide||0) >= 10){
    h._tide = 0;
    const R = 260;
    for(const o of enemies){
      if(!o.alive) continue;
      const dx = o.x-h.x, dy = o.y-h.y, d = Math.hypot(dx,dy)||1;
      if(d > R || (dx/d)*h.fx + (dy/d)*h.fy < 0.2) continue;
      if(_normalish(o) && o.hp < o.maxHp*0.3){ damageEnemy(o, o.hp+1, {src:h, fromProc:true, critChanceOverride:0}); continue; }
      damageEnemy(o, _setBase(h)*2.2, {src:h, fromProc:true, bleed:true, bleedDur:3000});
    }
    vfxShock(h.x+h.fx*100, h.y+h.fy*100, 20, R*0.7, "220,40,40", 420, 2);
    vfxBurst(h.x+h.fx*80, h.y+h.fy*80-10, 20, "blood", 220, 460, 3.5, h===player?2:1, -20, 0);
    if(h===player){ vfxShake(6); playSfx("heavy"); floatText(h.x, h.y-60, "¡TAJO DE LA MUERTE!", "crit"); }
  }
}
// El que recibe el golpe: Ángel Guardián (Custodio 4) de cualquier soporte cercano con el set completo.
function champSetsOnHurt(h, dmgFinal){
  if(h.hp <= 0 || h.hp > h.maxHp*0.3) return;
  for(const s of heroes){
    if(!s.alive || setN(s, "custodio") < 4 || distance(s,h) > 400) continue;
    if(h._angelAt!==undefined && runElapsedMs - h._angelAt < 15000) continue;
    h._angelAt = runElapsedMs;
    h.shield = Math.min(h.maxHp*0.5, (h.shield||0) + h.maxHp*0.25); h.shieldTimer = Math.max(h.shieldTimer||0, 3000);
    h._guardDRT = Math.max(h._guardDRT||0, 3000);
    vfxShock(h.x, h.y-10, 10, 56, "255,235,160", 420, 2); vfxBurst(h.x, h.y-30, 10, "holy", 90, 500, 3, 1, -40, 0);
    if(h===player || s===player) floatText(h.x, h.y-62, "¡ÁNGEL GUARDIÁN!", "heal");
    if(s.stats){ s.stats.alliesSaved = (s.stats.alliesSaved||0) + 1; }
    break;
  }
}
// Profecía Cumplida (Profeta 4): salva de un golpe letal a un aliado cercano.
function champSetPreventDeath(h){
  for(const p of heroes){
    if(!p.alive) continue; // (incluye a la propia Profeta)
    if(setN(p, "profecia") < 4 || distance(p,h) > 380) continue;
    if(p._prophecyAt!==undefined && runElapsedMs - p._prophecyAt < 40000) continue;
    p._prophecyAt = runElapsedMs;
    h.hp = 1; h.invulnTimer = Math.max(h.invulnTimer||0, 1500);
    vfxShock(h.x, h.y-10, 10, 70, "120,240,220", 520, 2); vfxBurst(h.x, h.y-30, 14, "spirit", 110, 600, 3, 2, -40, 0);
    if(h===player || p===player) floatText(h.x, h.y-62, "¡PROFECÍA CUMPLIDA!", "heal");
    if(p.stats) p.stats.alliesSaved = (p.stats.alliesSaved||0) + 1;
    return true;
  }
  return false;
}
// La Profeta: cada Giro del Presagio (Profecía 3)
function champSetOnPresagio(h){
  if(setN(h, "profecia") < 3) return;
  for(const a of heroes){ if(!a.alive || distance(a,h) > 180) continue; const amt = a.maxHp*0.04; trackHeal(h, a, amt); applyHealOverheal(h, a, amt); }
  vfxShock(h.x, h.y, 10, 180, "120,240,220", 320, h===player?1:0);
}
// Musashi: Paso Perfecto (Errante 3) e Iaijutsu (Errante 4)
function champSetOnPerfectStep(h){ if(setN(h, "errante") >= 3 && h.cds){ h.cds[0] = 0; _setMsg(h, "¡CORTE LISTO!"); } }
function champSetIaijutsu(h){
  if(setN(h, "errante") < 4) return false;
  const ready = runElapsedMs - (h._lastBasicAt||-1e9) >= 1200;
  h._lastBasicAt = runElapsedMs;
  return ready;
}
function iaijutsuLine(h, dmg, skip){
  for(const o of enemies){
    if(!o.alive || o===skip) continue;
    const dx = o.x-h.x, dy = o.y-h.y, along = dx*h.fx + dy*h.fy;
    if(along < 0 || along > 160) continue;
    if(Math.abs(dx*h.fy - dy*h.fx) > (o.radius||20)+14) continue;
    damageEnemy(o, dmg, {src:h, fromProc:true, forceCrit:true, critMultOverride:(runStats.critMult||1.8)+1.5});
  }
  vfxShock(h.x+h.fx*80, h.y+h.fy*80, 4, 60, "200,230,255", 220, h===player?2:1);
  if(h===player) floatText(h.x, h.y-58, "¡IAI!", "crit");
}
// Cazadora: trampa (Manada 3) y presa acorralada (Manada 4)
function champSetOnTrapRoot(h, e){ if(h && setN(h, "manada") >= 3 && e.alive && e!==h.huntTarget) sylvaAddTrack(h, e, 1); }
function champSetOnCornered(h){ if(setN(h, "manada") >= 4){ sylvaSummonWolf(h, 6000); _setMsg(h, "¡LA MANADA!"); } }
// Eren: gancho que corta a 3+ (Legión 3)
function champSetOnHookEnd(h, hits){ if(hits >= 3 && setN(h, "legion") >= 3 && h.cds && h.cds[0]>0){ h.cds[0] *= 0.5; _setMsg(h, "¡GANCHO LISTO!"); } }

/* ---------------- efectos ---------------- */
function baluarteQuake(h){
  const big = h.growTimer > 0;
  const R = big ? 220 : 120, d = _setBase(h)*1.2;
  for(const o of enemies){
    if(!o.alive || distance(o,h) > R) continue;
    damageEnemy(o, d, {src:h, fromProc:true, knockback:true});
    if(o.rank==="normal" || o.rank==="subelite") o.stunTimer = Math.max(o.stunTimer||0, 600);
  }
  vfxShock(h.x, h.y, 10, R, "170,200,235", 380, h===player?2:1);
  vfxBurst(h.x, h.y+4, big?16:10, "rock", 150, 320, 3.5, h===player?1:0, -10, 0);
  if(h===player){ vfxShake(big?5:3); playSfx("heavy"); }
}
function convergenceBurst(h, e){
  if(!_setReady(h, "converge", 300)) return;
  const R = 130, d = _setBase(h)*2.5;
  for(const o of enemies){
    if(!o.alive || Math.hypot(o.x-e.x, o.y-e.y) > R) continue;
    damageEnemy(o, d, {src:h, fromProc:true, burn:true});
    if(o.rank!=="jefe" && o.rank!=="subjefe"){ o.stunTimer = Math.max(o.stunTimer||0, 1000); o.frozenTimer = Math.max(o.frozenTimer||0, 1000); }
  }
  vfxShock(e.x, e.y, 10, R, "255,140,60", 380, 2);
  vfxShock(e.x, e.y, 16, R*0.8, "160,220,255", 460, 2);
  vfxBurst(e.x, e.y-16, 12, "ember", 170, 420, 3.5, h===player?1:0, -30, 0);
  vfxBurst(e.x, e.y-16, 12, "ice", 170, 420, 3.5, h===player?1:0, -30, 0);
  vfxBurst(e.x, e.y-16, 8, "shock", 170, 300, 3, 0, -30, 1);
  if(h===player){ vfxShake(5); playSfx("boom"); floatText(e.x, e.y-50, "¡CONVERGENCIA!", "crit"); }
}
function updateChampionSets(h, dt){
  if(h._elemSwapT > 0) h._elemSwapT -= dt;
}
