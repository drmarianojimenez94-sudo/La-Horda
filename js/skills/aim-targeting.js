"use strict";
/* ============================================================
   js/skills/aim-targeting.js
   Hacia dónde / sobre qué cae cada habilidad. Si el jugador apuntó a mano (mantener el botón
   y arrastrar, ver js/core/aim.js) se usa exactamente ese punto; si no (toque rápido, o los
   bots), se elige solo el mejor objetivo: el grupo de enemigos más denso al alcance para las
   de área, el enemigo más cercano para las dirigidas. Antes las de área caían SIEMPRE al
   máximo alcance hacia donde miraba el personaje, aunque no hubiera nadie ahí.
   ============================================================ */

// Cómo se apunta cada tipo de habilidad (las que no están acá se lanzan sobre sí mismo, sin apuntar).
//   point: área en un punto (radio r)   dash: desplazamiento hasta un punto
//   line: disparo en línea (ancho w)     cone: corte en abanico     target: elige un enemigo
const AIM_PROFILES = {
  fire_wall:        {type:"point", r:sk=>sk.outerR},
  area_trap:        {type:"point", r:sk=>sk.radius},
  glitch_delay_nova:{type:"point", r:sk=>sk.radius},
  forest_trap:      {type:"point", r:sk=>sk.radius},
  hunter_rain:      {type:"point", r:sk=>sk.radius, range:sk=>sk.range||220},
  condemned_plague: {type:"point", r:sk=>sk.radius},
  teleport_blink:   {type:"dash", w:30, move:true},
  charge_drag:      {type:"dash", w:30},
  dash:             {type:"dash", w:28},
  piercing_shot:    {type:"line", w:16},
  projectile:       {type:"line", w:14},
  cone_slash:       {type:"cone"},
  chain:            {type:"target", range:()=>340},
  overwrite_nova:   {type:"target", range:sk=>sk.range||300},
  bleed_hit:        {type:"target", range:(sk,cls)=>cls.basicRange+70},
  triple_hit:       {type:"target", range:(sk,cls)=>cls.basicRange+50},
  ronin_slash:      {type:"target"},
  ghost_step:       {type:"target"}
};
function aimProfileOf(sk){ return sk ? AIM_PROFILES[sk.kind] || null : null; }
// Multiplicador de área/alcance real de la habilidad (maestría + talentos), el mismo que usa castAbility.
function aimAreaMult(classKey, idx){
  const m = effectiveMasteryFor(classKey, idx);
  const t = talentSkillMods(classKey, idx);
  return masteryAreaMult(m) * (1 + (t.areaMult||0));
}
function aimRangeOf(caster, sk, idx){
  const prof = aimProfileOf(sk); if(!prof) return 0;
  const area = aimAreaMult(caster.classKey, idx);
  if(prof.range) return prof.range(sk, caster.cls) * (prof.type==="target" ? 1 : area);
  return (sk.range||200) * area;
}
const _AIM_RANK_W = {normal:1, subelite:1.5, elite:3, subjefe:5, jefe:6};
// Punto con más enemigos (ponderados por rango) dentro del alcance. null si no hay nadie cerca.
function bestClusterPoint(caster, range, radius){
  const cand = [];
  for(const e of enemies){
    if(!e.alive || (e.isDuelLocked && e.duelOwner!==caster)) continue;
    const d = Math.hypot(e.x-caster.x, e.y-caster.y);
    if(d <= range + radius*0.6) cand.push(e);
  }
  if(!cand.length) return null;
  if(cand.length > 36){ cand.sort((a,b)=>Math.hypot(a.x-caster.x,a.y-caster.y)-Math.hypot(b.x-caster.x,b.y-caster.y)); cand.length = 36; }
  let best = null, bestScore = -1;
  for(const c of cand){
    let score = 0, sx = 0, sy = 0, sw = 0;
    for(const o of cand){
      if(Math.hypot(o.x-c.x, o.y-c.y) > radius) continue;
      const w = _AIM_RANK_W[o.rank]||1; score += w; sx += o.x*w; sy += o.y*w; sw += w;
    }
    if(score > bestScore){ bestScore = score; best = {x:sx/sw, y:sy/sw}; }
  }
  return best;
}
function _clampToRange(caster, p, range){
  const dx = p.x-caster.x, dy = p.y-caster.y, d = Math.hypot(dx,dy);
  if(d <= range || d < 0.01) return {x:p.x, y:p.y};
  return {x:caster.x + dx/d*range, y:caster.y + dy/d*range};
}
function _faceTo(caster, x, y){
  const dx = x-caster.x, dy = y-caster.y, l = Math.hypot(dx,dy);
  if(l > 0.5){ caster.fx = dx/l; caster.fy = dy/l; }
}
// Punto de impacto de una habilidad de área (y orientación del lanzador hacia él).
function aimPoint(caster, range, radius, moveMode){
  let p;
  if(caster.aim && caster.aim.x!==undefined) p = _clampToRange(caster, caster.aim, range);
  else if(moveMode) p = {x:caster.x + caster.fx*range, y:caster.y + caster.fy*range};
  else p = bestClusterPoint(caster, range, radius||70) || {x:caster.x + caster.fx*range*0.6, y:caster.y + caster.fy*range*0.6};
  if(moveMode || !(caster.aim && caster.aim.x!==undefined) ) p = _clampToRange(caster, p, range);
  _faceTo(caster, p.x, p.y);
  return p;
}
// Dirección de una habilidad direccional (línea, abanico, carga).
function aimDir(caster, range){
  if(caster.aim && caster.aim.dx!==undefined){ caster.fx = caster.aim.dx; caster.fy = caster.aim.dy; }
  else {
    const t = nearestEnemyTo(caster, range||300);
    if(t) _faceTo(caster, t.x, t.y);
  }
  return {x:caster.fx, y:caster.fy};
}
// Enemigo elegido para una habilidad dirigida: el más cercano al punto apuntado, o el más cercano al lanzador.
function aimTarget(caster, range){
  if(caster.aim && caster.aim.x!==undefined){
    let best = null, bd = Infinity;
    for(const e of enemies){
      if(!e.alive || (e.isDuelLocked && e.duelOwner!==caster)) continue;
      if(Math.hypot(e.x-caster.x, e.y-caster.y) > range + (e.radius||20)) continue;
      const d = Math.hypot(e.x-caster.aim.x, e.y-caster.aim.y) - (e.radius||20);
      if(d < bd){ bd = d; best = e; }
    }
    if(best) return best;
  }
  return nearestEnemyTo(caster, range);
}
