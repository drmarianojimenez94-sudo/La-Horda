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
  soul_harvest:     {type:"cone"},                       // Nigromante: cono que arranca almas (aimDir)
  // Nigromante: con el gólem ya en pie, "¡Aplasta!" lo hace saltar a un punto; sin gólem se invoca al lado propio
  summon_golem:     {type:"point", r:()=>110, range:()=>320, when:c=>!!(c && c.golem && !c.nigroDemonForm)},
  chain:            {type:"target", range:()=>340},
  overwrite_nova:   {type:"target", range:sk=>sk.range||300},
  bleed_hit:        {type:"target", range:(sk,cls)=>cls.basicRange+70},
  triple_hit:       {type:"target", range:(sk,cls)=>cls.basicRange+50},
  ronin_slash:      {type:"target"},
  ghost_step:       {type:"target"},
  // El Libertador / Eren
  sm_bayonet:       {type:"dash", w:30},
  sm_san_lorenzo:   {type:"dash", w:64},
  eren_hook:        {type:"dash", w:24},
  // Retumbar: 6 pasos de 0,52 s a 95 u/s, unas 300 u de recorrido (EREN_CFG.retumbar)
  titan_retumbar:   {type:"dash", w:120, range:()=>{ const R = typeof EREN_CFG!=="undefined" && EREN_CFG.retumbar; return R ? R.steps*R.stepMs/1000*R.speed : 300; }}
};
// Kits por ACCIÓN (Ascensión y Expedición comparten un "kind" genérico y se distinguen por sk.action): cada acción
// declara su forma con los mismos topes de radio/alcance que usa su runtime (ascensionCast / expeditionCast), así el
// premarcado muestra exactamente dónde cae. Las que no están acá salen alrededor del campeón (sin apuntar).
const _ascR = sk => Math.min(240, sk.radius||100), _ascRange = sk => Math.min(420, sk.range||200);
const _exR = sk => Math.min(230, sk.radius||100), _exRange = sk => Math.min(400, sk.range||200);
const ACTION_AIM_PROFILES = {
  // Ascensión
  "ascension:sentence":{type:"line", w:26, range:_ascRange}, "ascension:edict":{type:"point", r:_ascR, range:_ascRange},
  "ascension:invert":{type:"dash", w:30, move:true, range:_ascRange},
  "ascension:current":{type:"line", w:40, range:_ascRange}, "ascension:pressure":{type:"point", r:_ascR, range:_ascRange},
  "ascension:ride":{type:"dash", w:44, range:sk=>Math.min(340,_ascRange(sk))},
  "ascension:prism":{type:"point", r:_ascR, range:_ascRange}, "ascension:refract":{type:"line", w:24, range:_ascRange},
  "ascension:luminal":{type:"dash", w:30, move:true, range:_ascRange}, "ascension:cathedral":{type:"point", r:()=>140, range:()=>200},
  "ascension:swarm_send":{type:"point", r:_ascR, range:_ascRange}, "ascension:elytra":{type:"dash", w:36, range:sk=>Math.min(220,_ascRange(sk))},
  "ascension:mask_throw":{type:"line", w:30, range:_ascRange}, "ascension:face_swap":{type:"dash", w:30, range:sk=>Math.min(140,_ascRange(sk))},
  "ascension:star_bolt":{type:"line", w:24, range:_ascRange}, "ascension:well":{type:"point", r:_ascR, range:_ascRange},
  "ascension:orbit":{type:"point", r:()=>60, range:_ascRange}, "ascension:collapse":{type:"point", r:_ascR, range:_ascRange},
  "ascension:plate_throw":{type:"line", w:32, range:_ascRange}, "ascension:plate_wall":{type:"line", w:52, range:()=>110},
  "ascension:portal":{type:"point", r:()=>38, range:_ascRange}, "ascension:rift_step":{type:"dash", w:30, move:true, range:_ascRange},
  "ascension:great_rift":{type:"point", r:_ascR, range:_ascRange},
  "ascension:feather_fan":{type:"cone", range:_ascRange}, "ascension:feather_sky":{type:"point", r:_ascR, range:_ascRange},
  // Expedición
  "expedition:needles":{type:"cone", range:_exRange}, "expedition:seam":{type:"dash", w:30, range:sk=>Math.min(150,_exRange(sk))},
  "expedition:ash_step":{type:"dash", w:30, range:sk=>Math.min(150,_exRange(sk))}, "expedition:shards":{type:"cone", range:_exRange},
  "expedition:reflect":{type:"dash", w:30, range:sk=>Math.min(150,_exRange(sk))}, "expedition:cross":{type:"line", w:28, range:_exRange},
  "expedition:guard":{type:"cone", range:()=>120}, "expedition:counter":{type:"cone", range:_exRange},
  "expedition:roots":{type:"line", w:30, range:_exRange}, "expedition:discord":{type:"cone", range:_exRange},
  "expedition:pierce":{type:"line", w:20, range:_exRange}, "expedition:swarm":{type:"point", r:_exR, range:_exRange},
  "expedition:hive_sky":{type:"point", r:_exR, range:_exRange}, "expedition:pollen":{type:"point", r:_exR, range:_exRange},
  "expedition:furnace":{type:"cone", range:_exRange}, "expedition:trench":{type:"line", w:30, range:_exRange},
  "expedition:mound":{type:"point", r:_exR, range:_exRange}, "expedition:ink_line":{type:"line", w:22, range:_exRange}
};
function aimKindKey(sk){ return sk && (sk.kind==="ascension" || sk.kind==="expedition") ? sk.kind+":"+sk.action : sk && sk.kind; }
// caster (opcional): algunas se apuntan solo en cierto estado (el gólem ya invocado); sin caster, el del jugador.
function aimProfileOf(sk, caster){
  const p = sk ? AIM_PROFILES[sk.kind] || ACTION_AIM_PROFILES[aimKindKey(sk)] || null : null;
  if(p && p.when){ const c = caster || (typeof player!=="undefined" ? player : null); if(!p.when(c)) return null; }
  return p;
}
// Multiplicador de área/alcance real de la habilidad (maestría + talentos), el mismo que usa castAbility.
function aimAreaMult(classKey, idx){
  const m = effectiveMasteryFor(classKey, idx);
  const t = talentSkillMods(classKey, idx);
  return masteryAreaMult(m) * (1 + (t.areaMult||0));
}
function aimRangeOf(caster, sk, idx){
  const prof = aimProfileOf(sk, caster); if(!prof) return 0;
  const area = aimAreaMult(caster.classKey, idx);
  if(prof.range) return prof.range(sk, caster.cls) * (prof.type==="target" ? 1 : area);
  return (sk.range||200) * area;
}
const _AIM_RANK_W = {normal:1, subelite:1.5, elite:3, subjefe:5, jefe:6};
// Crystal Wars keeps opponents outside `enemies`; use the same side-aware list as damage.
function aimHostiles(caster){return divinaMode?portadorEnemies(caster):enemies;}
function aimNearestHostile(caster,range){
  let best=null,nearest=Infinity;
  for(const e of aimHostiles(caster)){
    if(!e.alive||(e.isDuelLocked&&e.duelOwner!==caster))continue;
    const d=Math.hypot(e.x-caster.x,e.y-caster.y);
    if(d<nearest&&(!range||d<=range)){best=e;nearest=d;}
  }
  return best;
}
// Punto con más enemigos (ponderados por rango) dentro del alcance. null si no hay nadie cerca.
function bestClusterPoint(caster, range, radius){
  const cand = [];
  for(const e of aimHostiles(caster)){
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
  caster._lastAimPt = p;                  // lo usa la etiqueta "terrain" (js/systems/terrain-tags.js)
  return p;
}
// Dirección de una habilidad direccional (línea, abanico, carga).
function aimDir(caster, range){
  if(caster.aim && caster.aim.dx!==undefined){ caster.fx = caster.aim.dx; caster.fy = caster.aim.dy; }
  else {
    const t = aimNearestHostile(caster, range||300);
    if(t) _faceTo(caster, t.x, t.y);
  }
  return {x:caster.fx, y:caster.fy};
}
// Enemigo elegido para una habilidad dirigida: el más cercano al punto apuntado, o el más cercano al lanzador.
function aimTarget(caster, range){
  if(caster.aim && caster.aim.x!==undefined){
    let best = null, bd = Infinity;
    for(const e of aimHostiles(caster)){
      if(!e.alive || (e.isDuelLocked && e.duelOwner!==caster)) continue;
      if(Math.hypot(e.x-caster.x, e.y-caster.y) > range + (e.radius||20)) continue;
      const d = Math.hypot(e.x-caster.aim.x, e.y-caster.aim.y) - (e.radius||20);
      if(d < bd){ bd = d; best = e; }
    }
    if(best) return best;
  }
  return aimNearestHostile(caster, range);
}
