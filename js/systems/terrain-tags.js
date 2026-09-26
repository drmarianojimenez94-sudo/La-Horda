"use strict";
/* ============================================================
   js/systems/terrain-tags.js
   Etiqueta de entorno "terrain": DAÑO ESTRUCTURAL de las habilidades (metadata por TIPO de
   habilidad, nunca por campeón). Hoy la escucha la Arena del Abismo (agrieta / derrumba
   plataformas); cualquier arena futura puede escucharla con envOn("terrain", key, fn).
   - Se emite DESPUÉS de castAbility en el punto apuntado (caster._lastAimPt, que guarda aimPoint)
     o sobre el propio lanzador (at:"self": golpes que caen donde está el héroe).
   - Una habilidad puede traer su propia metadata en la ficha: sk.terrain = {dmg, r, at}.
   - Mientras un héroe cuelga del borde no puede actuar; si está enganchado por el Carcelero,
     usar una habilidad lo suelta (h.abHookBreak).
   ============================================================ */
const SKILL_TERRAIN = {
  // golpes pesados de área
  elemental_storm:       {dmg:30, r:190},
  last_stand_burst:      {dmg:30, r:150, at:"self"},
  berserker_ult:         {dmg:40, r:180, at:"self"},
  overwrite_nova:        {dmg:22, r:140, at:"self"},
  charge_drag:           {dmg:20, r:100, at:"self"},
  summon_golem:          {dmg:18, r:100},
  abyss_incarnation_ult: {dmg:42, r:210, at:"self"},
  // cargas y artillería
  sm_san_lorenzo:        {dmg:22, r:120, at:"self"},
  sm_andes_ult:          {dmg:36, r:210},
  // el titán
  titan_sismo:           {dmg:34, r:170, at:"self"},
  titan_terremoto:       {dmg:52, r:240, at:"self"},
  titan_retumbar:        {dmg:28, r:150},
  eren_rumbling_ult:     {dmg:60, r:270, at:"self"},
  eren_titan_ult:        {dmg:30, r:170, at:"self"}
};
function skillTerrainOf(sk){ return (sk && (sk.terrain || SKILL_TERRAIN[sk.kind])) || null; }

const _terrainCastOrig = castAbility;
castAbility = function(caster, sk, isUlt, idx){
  if(caster && caster.abHang) return;                       // colgado del borde: no actúa
  if(caster && caster.abHook) caster.abHookBreak = true;   // una habilidad rompe el gancho
  const T = skillTerrainOf(sk);
  if(caster && T) caster._lastAimPt = null;
  const r = _terrainCastOrig.apply(this, arguments);
  if(caster && T && typeof envEmit==="function"){
    const p = (T.at!=="self" && caster._lastAimPt) ? caster._lastAimPt : caster;
    envEmit("terrain", p.x, p.y, caster, {r:T.r, dmg:T.dmg, kind:sk.kind});
  }
  return r;
};
const _terrainUseSkillOrig = useSkill;
useSkill = function(idx, aim){ if(player && player.abHang) return false; return _terrainUseSkillOrig.apply(this, arguments); };
const _terrainBasicOrig = triggerBasic;
triggerBasic = function(caster){ const c = caster || player; if(c && c.abHang) return; return _terrainBasicOrig.apply(this, arguments); };
const _terrainUltOrig = useUltimate;
useUltimate = function(){ if(player && player.abHang) return; return _terrainUltOrig.apply(this, arguments); };
