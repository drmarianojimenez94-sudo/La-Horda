"use strict";
/* ============================================================
   js/skills/ability-registry.js
   CONTRATO UNIVERSAL DE HABILIDADES (Game Bible: docs/bible/CHAMPION_BIBLE.md §Habilidades).

   UNA SOLA FUENTE DE VERDAD: los valores viven en CLASSES (js/data/champions.js, portadores,
   expedición) y la presentación en CHAMPION_IDENTITY (js/data/champion-identity.js). Este
   archivo NO duplica nada: DERIVA una AbilityDefinition de esos datos para que HUD, inspector
   (long press), panel táctico, Códice y validadores lean exactamente lo mismo.

   AbilityDefinition = {
     id, championId, slot ("basic"|"passive"|0|1|2|"ult"), type ("basic"|"passive"|"skill"|"ultimate"),
     name, shortDescription, fullDescription, icon:{glyph, img},
     targetingType (TARGETING_LANGUAGE), shapeGlyph, damageType, cost, cooldown, duration, radius, range,
     statusEffects:[COMBAT_LANGUAGE keys], tags:[...], scaling:{dmgMult, healPct, ...}, kind
   }
   Overrides puntuales (sin duplicar valores): ABILITY_META[kind | "expedition:"+action].
   ============================================================ */
const ABILITY_META = {
  // targeting de las habilidades que se lanzan sin apuntado manual pero no son "sobre sí mismo"
  team_heal_aoe:{targeting:"self_aoe"}, team_atk_buff:{targeting:"self_aoe"}, team_shield_buff:{targeting:"self_aoe"},
  team_grand_buff:{targeting:"self_aoe"}, retro_heal:{targeting:"ally"}, brief_immunity:{targeting:"ally"},
  ascension_fusion:{targeting:"ally"}, spin_channel:{targeting:"self_aoe"}, frost_nova:{targeting:"self_aoe"},
  taunt_provoke:{targeting:"self_aoe"}, elemental_storm:{targeting:"self_aoe"}, self_spin_stun:{targeting:"self_aoe"},
  thousand_cuts:{targeting:"self_aoe"}, force_quit_ult:{targeting:"self_aoe"}, last_duel_ult:{targeting:"target"},
  sm_granaderos:{targeting:"self_aoe", status:["buff"]}, eren_advance:{targeting:"self_aoe", status:["buff"]},
  eren_instinct:{status:["buff"]}, war_cry:{status:["buff"]}, fury_armor:{status:["buff"]}, last_stand_burst:{status:["buff"]},
  berserker_ult:{status:["buff"]}, wild_hunt_ult:{status:["buff"]}, shadow_stealth:{status:["poison","bleed","invulnerable"]},
  abyss_incarnation_ult:{status:["buff"], tags:["transform"]}, eren_titan_ult:{status:["buff"], tags:["transform"]},
  summon_golem:{tags:["summon"]}, my_tower:{tags:["summon"], status:["slow"]}, br_turret:{tags:["summon"]},
  my_bubble:{status:["shield"]}, condemned_plague:{status:["curse","debuff","dot"]}, soul_harvest:{status:["slow"]},
  forest_trap:{status:["root"]}, area_trap:{tags:["trap"]}, fire_wall:{status:["burn","dot"]},
  glitch_delay_nova:{tags:["delayed"]}, hunter_rain:{tags:["delayed"]}, sm_bayonet:{status:["bleed"]},
  sm_san_lorenzo:{status:["stun","debuff"]}, sm_andes_ult:{status:["slow","stun","buff"], tags:["transform"]},
  teleport_blink:{status:["invulnerable"]}, ghost_step:{status:["buff"]}
};
const _AB_SHORT_MAX = 90;
function _abShort(desc){
  const s = String(desc||"").trim(); if(!s) return "";
  const first = s.split(/(?<=[.!?])\s|;\s|:\s/)[0].replace(/[.;:]$/,"");
  if(first.length <= _AB_SHORT_MAX) return first;
  const cut = first.slice(0, _AB_SHORT_MAX); return cut.slice(0, cut.lastIndexOf(" ")) + "…";
}
function _abMeta(sk){
  if(!sk) return {};
  return ABILITY_META[sk.kind==="expedition" ? "expedition:"+sk.action : sk.kind] || ABILITY_META[sk.kind] || {};
}
function _abTargeting(sk, meta){
  if(meta.targeting) return meta.targeting;
  const prof = typeof AIM_PROFILES!=="undefined" ? AIM_PROFILES[sk.kind] : null;
  if(prof) return prof.type;
  if(sk.kind==="piercing_shot") return "line";
  const r = sk.radius||sk.outerR||0, range = sk.range||0;
  if(sk.healPct || sk.shieldPct) return "self_aoe";
  if(r && range > r*1.3) return "point";
  if(r) return "self_aoe";
  if(range) return "line";
  return "self";
}
function _abDamageType(sk){
  if(sk.element==="heal") return "heal";
  if(["fire","ice","lightning","holy","arcane","poison","bleed"].includes(sk.element)) return sk.element;
  if(sk.kind && /plague|soul|glitch|overwrite|force_quit|abyss/.test(sk.kind)) return "arcane";
  if(sk.dmgMult || sk.strikeDmgMult || sk.totalHits) return "physical";
  return "none";
}
function _abStatus(sk, meta){
  const out = new Set(meta.status||[]);
  if(sk.stun || sk.eliteStunMs) out.add("stun");
  if(sk.freeze || sk.freezeDur || sk.novaFreeze) out.add("freeze");
  if(sk.slow || sk.slowDur) out.add("slow");
  if(sk.bleedDur || sk.bleedDmgMult) out.add("bleed");
  if(sk.poisonDmgMult) out.add("poison");
  if(sk.burn || (sk.element==="fire" && sk.tick)) out.add("burn");
  if(sk.rootDur) out.add("root");
  if(sk.kind==="taunt_provoke") out.add("taunt");
  if(sk.shieldPct) out.add("shield");
  if(sk.healPct || sk.healOnCastPct || sk.regenPct || sk.element==="heal") out.add("heal");
  if(sk.dmgBonus || sk.defBonus || sk.atkSpeedMult || sk.speedMult) out.add("buff");
  if(sk.defTakenPct) out.add("debuff");
  if(sk.tick || sk.bleedDur) out.add("dot");
  return [...out];
}
function _abTags(sk, targeting, status, isUlt, meta){
  const t = new Set(meta.tags||[]);
  if(isUlt) t.add("ultimate");
  if(["point","self_aoe","cone"].includes(targeting) || sk.radius || sk.jumps>1 || sk.chainRadius) t.add("aoe");
  if(targeting==="dash" || sk.kind==="teleport_blink") t.add("mobility");
  if(status.includes("heal")) t.add("heal");
  if(status.includes("shield")) t.add("shield");
  if(status.includes("buff")) t.add("buff");
  if(status.some(s=>["stun","freeze","slow","root","taunt"].includes(s))) t.add("cc");
  if(status.includes("dot")) t.add("dot");
  if(sk.dmgMult || sk.totalHits) t.add("damage");
  return [...t];
}
function abilityDefinitionFromSkill(championId, slot, sk){
  if(!sk) return null;
  const isUlt = slot==="ult", meta = _abMeta(sk);
  const targetingType = _abTargeting(sk, meta);
  const statusEffects = _abStatus(sk, meta);
  const img = (typeof SKILL_ICON_IMG!=="undefined" && SKILL_ICON_IMG[sk.name]) ? sk.name : null;
  const scaling = {};
  for(const f of ["dmgMult","finalMult","strikeDmgMult","healPct","shieldPct","dmgBonus","defBonus","totalHits","jumps"]) if(Number.isFinite(sk[f])) scaling[f] = sk[f];
  return {
    id: championId+":"+slot, championId, slot, type: isUlt ? "ultimate" : "skill", kind: sk.kind, action: sk.action||null,
    name: sk.name, shortDescription: _abShort(sk.desc), fullDescription: sk.desc||"",
    icon: {glyph: sk.ico||"", img},
    targetingType, shapeGlyph: (TARGETING_LANGUAGE[targetingType]||{}).glyph || "◉",
    damageType: _abDamageType(sk),
    cost: isUlt ? 0 : (sk.cost||0), cooldown: sk.cd||0, duration: sk.duration||sk.stealthDuration||0,
    radius: sk.radius||sk.outerR||0, range: sk.range||0,
    statusEffects, tags: _abTags(sk, targetingType, statusEffects, isUlt, meta), scaling
  };
}
// Todas las definiciones de un campeón: básico, pasiva, 3 habilidades y definitiva.
function championAbilityDefinitions(championId, cls){
  const c = cls || (typeof CLASSES!=="undefined" && CLASSES[championId]);
  if(!c) return [];
  const out = [];
  const basicDesc = (c.basicAttack && c.basicAttack.desc) || (c.ranged ? "Ataque básico a distancia." : "Ataque básico cuerpo a cuerpo.");
  out.push({id:championId+":basic", championId, slot:"basic", type:"basic", kind:"basic",
    name:(c.basicAttack && c.basicAttack.name) || "Ataque básico", shortDescription:_abShort(basicDesc), fullDescription:basicDesc,
    icon:{glyph:c.icon||"⚔", img:null}, targetingType: c.ranged ? "line" : (c.basicArc ? "cone" : "target"),
    shapeGlyph: c.ranged ? "→" : (c.basicArc ? "△" : "⌖"), damageType:"physical", cost:0, cooldown:c.basicCd||0, duration:0,
    radius:0, range:c.basicRange||0, statusEffects:[], tags:["damage"], scaling:{dmgMult:1}});
  if(c.passive) out.push({id:championId+":passive", championId, slot:"passive", type:"passive", kind:"passive",
    name:c.passive.name, shortDescription:_abShort(c.passive.desc), fullDescription:c.passive.desc||"",
    icon:{glyph:c.passive.ico||"∞", img:null}, targetingType:"passive", shapeGlyph:"∞", damageType:"none",
    cost:0, cooldown:0, duration:0, radius:0, range:0, statusEffects:[], tags:["passive"], scaling:{}});
  (c.skills||[]).forEach((sk,i)=>out.push(abilityDefinitionFromSkill(championId, i, sk)));
  if(c.ultimate) out.push(abilityDefinitionFromSkill(championId, "ult", c.ultimate));
  return out.filter(Boolean);
}
function abilityDefinition(championId, slot, cls){
  return championAbilityDefinitions(championId, cls).find(d=>d.slot===slot) || null;
}
// Valores efectivos en partida (maestría y talentos aplicados): lo que el jugador realmente lanza.
function abilityLiveValues(h, def){
  const out = {cooldownMs:def.cooldown, remainingMs:0, radius:def.radius, range:def.range, cost:def.cost, ready:true, reason:""};
  if(!h || !def) return out;
  try{
    if(typeof def.slot==="number"){
      const area = typeof aimAreaMult==="function" ? aimAreaMult(h.classKey, def.slot) : 1;
      out.radius = Math.round(def.radius*area);
      const sk = h.cls && h.cls.skills[def.slot];
      if(sk && typeof aimRangeOf==="function" && typeof aimProfileOf==="function" && aimProfileOf(sk, h)) out.range = Math.round(aimRangeOf(h, sk, def.slot));
      out.remainingMs = Math.max(0, (h.cds && h.cds[def.slot]) || 0);
      if(sk && h.energy < sk.cost){ out.ready = false; out.reason = h.cls.isFuryClass ? "Falta Furia" : "Falta energía"; }
    } else if(def.slot==="ult"){
      out.remainingMs = Math.max(0, h.ultCd||0);
      if(typeof runLevel!=="undefined" && typeof ULT_MIN_ARENA_LEVEL!=="undefined" && runLevel < ULT_MIN_ARENA_LEVEL){ out.ready = false; out.reason = "Se habilita en el nivel " + ULT_MIN_ARENA_LEVEL; }
      else if(Number.isFinite(h.ultCharge) && Number.isFinite(h.ultMax) && h.ultCharge < h.ultMax){ out.ready = false; out.reason = "Carga " + Math.floor(100*h.ultCharge/Math.max(1,h.ultMax)) + "%"; }
    }
    if(out.remainingMs > 0){ out.ready = false; out.reason = (out.remainingMs/1000).toFixed(1).replace(".", ",") + " s"; }
  }catch(e){ /* valores base: el inspector nunca rompe la partida */ }
  return out;
}
// Validación de metadata (la usa tools/bible/champion-validator.js y el panel de QA).
function validateAbilityDefinition(def){
  const issues = [];
  if(!def.name) issues.push({level:"FAIL", msg:"sin nombre"});
  if(!def.fullDescription) issues.push({level:"FAIL", msg:"sin descripción"});
  else if(def.fullDescription.length > (typeof CHAMPION_STANDARD!=="undefined" ? CHAMPION_STANDARD.abilityDescMax : 200)) issues.push({level:"WARNING", msg:"descripción larga ("+def.fullDescription.length+"): el tooltip usa shortDescription"});
  if(!def.icon.glyph && !def.icon.img) issues.push({level:"FAIL", msg:"sin ícono"});
  if((def.type==="skill" || def.type==="ultimate") && !(def.cooldown > 0) && def.kind!=="eren_rumbling_ult") issues.push({level:"FAIL", msg:"sin enfriamiento"});
  if(!TARGETING_LANGUAGE[def.targetingType]) issues.push({level:"FAIL", msg:"targeting desconocido"});
  for(const s of def.statusEffects) if(!COMBAT_LANGUAGE[s]) issues.push({level:"FAIL", msg:"estado sin lenguaje visual: "+s});
  return issues;
}
