"use strict";
/* ============================================================
   js/systems/talents.js
   Talentos: compra de nodos, maestrías y cálculo de modificadores.
   ============================================================ */

// Reducción de cooldown que aportan los TALENTOS a una habilidad puntual (idx 0/1/2 o "ult").
// Tope defensivo propio (independiente del piso global de pasivas de objeto, ~0.4): ningún
// árbol de talentos puede por sí solo bajar más de un 35% el cooldown de una habilidad, así
// nunca compite con el piso duro de Teletransporte (ver TELEPORT_MIN_CD_MS) ni permite un
// build que deje cualquier otra habilidad en cooldown ~0 apilando nodos.
function talentSkillCdMult(classKey, skillKey){
  if(!classKey) return 1;
  const t = talentSkillMods(classKey, skillKey);
  return 1 + Math.max(-0.35, Math.min(0, t.cdMult||0));
}

/* ============================================================
   TALENTOS Y MAESTRÍAS (permanentes por campeón)
   ============================================================
   Arquitectura data-driven: TALENT_TREES[classKey] = {masteryRequirement, nodes:[...], masteries:{...}}
   define TODO el contenido; el motor de abajo (compra/validación/aplicación) es genérico y no
   sabe nada de ningún campeón en particular -agregar/balancear un talento es tocar solo su
   entrada de datos, nunca esta sección-.

   Moneda: reutiliza exactamente save.champions[classKey].talentPoints, la MISMA que ya reparte
   grantXP() (1 por nivel de campeón) y que investTalentPoint() ya gasta en subir de 0 a
   TALENT_MAX(10) cada una de las 4 ranuras del kit (3 habilidades + ulti, hasta 40 puntos en
   total). El árbol de talentos y la Maestría compiten por ESA MISMA bolsa de puntos -no crean
   una moneda nueva-, simplemente se vuelven comprables recién a partir de cierto nivel de
   personaje (ver minLevel de cada nodo/Maestría).

   Nodo: {id, branch, type:"common"|"special", maxRank, cost, requires:id|null,
          exclusiveWith:id|null, minLevel, name, desc, rankDesc(rank), mods(rank)}
   `mods(rank)` devuelve un array de efectos, cada uno de:
     - {effect, value}                      -> bucket GLOBAL, se suma vía passiveSum (dmg_mult,
                                                skilldmg_mult, cd_mult, def_add, atkspeed_mult,
                                                lifesteal_add, heal_mult, hp_mult, speed_mult,
                                                energy_mult, crit_chance_add, crit_mult_add)
     - {targetSkill, key, value}             -> bucket POR HABILIDAD (0/1/2/"ult"), key one of
                                                powerMult/areaMult/durationMult/cdMult/jumpBonus
     - {targetSkill, flag, value}            -> bandera puntual que un case de castAbility (o
                                                triggerBasic) consulta a mano (ver talentFlag()).
   Maestría: TALENT_TREES[classKey].masteries[masteryId] = {id, branch, name, desc, miniTree:[...]}
   mismo formato de nodo para miniTree, con minLevel:90 implícito.
   ============================================================ */
const TALENT_MASTERY_MIN_LEVEL = 90;
const TALENT_TREE_MIN_LEVEL = 40;
const TELEPORT_MIN_CD_MS = 1500; // piso duro: ni maestría ni talentos bajan Teletransporte de acá
const TELEPORT_CHARGE_RECHARGE_MS = 9000;

function talentTreeFor(classKey){ return TALENT_TREES[classKey] || null; }
function talentState(classKey){
  const c = save.champions[classKey];
  if(!c) return mkTalentState();
  if(!c.talents) c.talents = mkTalentState();
  return c.talents;
}
function talentRank(classKey, id){ return talentState(classKey).nodes[id] || 0; }
function talentAllNodes(classKey){
  const tree = talentTreeFor(classKey);
  return tree ? tree.nodes : [];
}
function talentNodeById(classKey, id){ return talentAllNodes(classKey).find(n=>n.id===id) || null; }
// Suma de rangos comprados en TODOS los nodos (comunes+especiales) de una rama: es el requisito
// para desbloquear la Maestría de esa rama (sección 15/16 del diseño).
function branchInvestment(classKey, branch){
  return talentAllNodes(classKey).filter(n=>n.branch===branch).reduce((s,n)=> s+talentRank(classKey,n.id), 0);
}
// Motivo de bloqueo de un nodo común/especial, o null si YA se puede comprar/subir de rango.
function talentNodeLockReason(classKey, node){
  const champ = save.champions[classKey];
  const st = talentState(classKey);
  const rank = st.nodes[node.id] || 0;
  if(rank >= node.maxRank) return "MÁX";
  if(champ.level < (node.minLevel||TALENT_TREE_MIN_LEVEL)) return `Requiere nivel ${node.minLevel||TALENT_TREE_MIN_LEVEL}`;
  if(node.exclusiveWith && (st.nodes[node.exclusiveWith]||0) > 0){
    const other = talentNodeById(classKey, node.exclusiveWith);
    return `Bloqueado: ya elegiste "${other?other.name:node.exclusiveWith}"`;
  }
  if(node.requires){
    const req = talentNodeById(classKey, node.requires);
    const reqRank = st.nodes[node.requires] || 0;
    if(!req || reqRank < req.maxRank) return `Requiere "${req?req.name:node.requires}" al máximo`;
  }
  if(champ.talentPoints < (node.cost||1)) return `Sin puntos suficientes (necesita ${node.cost||1}, tenés ${champ.talentPoints})`;
  return null;
}
// needsConfirm: true si esta compra es una decisión irreversible que debe confirmarse antes
// (nodo especial que abre una bifurcación exclusiva -sección 8-). El llamador (UI) debe volver
// a invocar con confirmed:true recién después de que el jugador confirme.
function buyTalentNode(classKey, id, confirmed){
  const node = talentNodeById(classKey, id);
  if(!node) return {ok:false, reason:"Talento inexistente"};
  const reason = talentNodeLockReason(classKey, node);
  if(reason) return {ok:false, reason};
  const isFirstPickOfExclusive = node.type==="special" && node.exclusiveWith && (talentState(classKey).nodes[id]||0)===0;
  if(isFirstPickOfExclusive && !confirmed) return {ok:false, needsConfirm:true};
  const champ = save.champions[classKey];
  const st = talentState(classKey);
  champ.talentPoints = Math.max(0, champ.talentPoints - (node.cost||1)); // nunca negativo (defensa extra, ver sección 34/38)
  st.nodes[id] = (st.nodes[id]||0) + 1;
  persist();
  return {ok:true};
}
function masteryOptionsFor(classKey){
  const tree = talentTreeFor(classKey);
  return tree && tree.masteries ? Object.values(tree.masteries) : [];
}
function canPickMastery(classKey, masteryId){
  const champ = save.champions[classKey];
  const tree = talentTreeFor(classKey);
  if(!champ || !tree || !tree.masteries || !tree.masteries[masteryId]) return false;
  if(talentState(classKey).mastery) return false; // ya eligió una, permanente (sección 15)
  if(champ.level < TALENT_MASTERY_MIN_LEVEL) return false;
  const m = tree.masteries[masteryId];
  return branchInvestment(classKey, m.branch) >= (tree.masteryRequirement||10);
}
function masteryLockReason(classKey, masteryId){
  const champ = save.champions[classKey];
  const tree = talentTreeFor(classKey);
  const m = tree && tree.masteries ? tree.masteries[masteryId] : null;
  if(!m) return "Maestría inexistente";
  const st = talentState(classKey);
  if(st.mastery === masteryId) return null;
  if(st.mastery) return `Ya elegiste la Maestría "${tree.masteries[st.mastery].name}"`;
  if(champ.level < TALENT_MASTERY_MIN_LEVEL) return `Requiere nivel ${TALENT_MASTERY_MIN_LEVEL}`;
  const need = tree.masteryRequirement||10, have = branchInvestment(classKey, m.branch);
  if(have < need) return `Requiere ${need} puntos invertidos en la rama "${m.branch}" (llevás ${have})`;
  return null;
}
// Elegir Maestría es SIEMPRE una decisión irreversible (sección 8): el llamador debe confirmar.
function pickMastery(classKey, masteryId, confirmed){
  if(!canPickMastery(classKey, masteryId)) return {ok:false, reason: masteryLockReason(classKey, masteryId)};
  if(!confirmed) return {ok:false, needsConfirm:true};
  talentState(classKey).mastery = masteryId;
  persist();
  return {ok:true};
}
function masteryMiniNodeById(classKey, id){
  const tree = talentTreeFor(classKey);
  const st = talentState(classKey);
  if(!tree || !tree.masteries || !st.mastery) return null;
  const m = tree.masteries[st.mastery];
  return m && m.miniTree ? (m.miniTree.find(n=>n.id===id) || null) : null;
}
function masteryMiniLockReason(classKey, node){
  const champ = save.champions[classKey];
  const st = talentState(classKey);
  const rank = st.masteryNodes[node.id] || 0;
  if(rank >= node.maxRank) return "MÁX";
  if(champ.level < TALENT_MASTERY_MIN_LEVEL) return `Requiere nivel ${TALENT_MASTERY_MIN_LEVEL}`;
  if(node.exclusiveWith && (st.masteryNodes[node.exclusiveWith]||0) > 0){
    const tree = talentTreeFor(classKey), m = tree.masteries[st.mastery];
    const other = m.miniTree.find(n=>n.id===node.exclusiveWith);
    return `Bloqueado: ya elegiste "${other?other.name:node.exclusiveWith}"`;
  }
  if(node.requires){
    const tree = talentTreeFor(classKey), m = tree.masteries[st.mastery];
    const req = m.miniTree.find(n=>n.id===node.requires);
    const reqRank = st.masteryNodes[node.requires] || 0;
    if(!req || reqRank < req.maxRank) return `Requiere "${req?req.name:node.requires}" al máximo`;
  }
  if(champ.talentPoints < (node.cost||1)) return `Sin puntos suficientes (necesita ${node.cost||1}, tenés ${champ.talentPoints})`;
  return null;
}
function buyMasteryNode(classKey, id, confirmed){
  const node = masteryMiniNodeById(classKey, id);
  if(!node) return {ok:false, reason:"Talento de Maestría inexistente"};
  const reason = masteryMiniLockReason(classKey, node);
  if(reason) return {ok:false, reason};
  if(!confirmed) return {ok:false, needsConfirm:true}; // toda compra de Maestría se confirma (sección 8)
  const champ = save.champions[classKey];
  const st = talentState(classKey);
  champ.talentPoints = Math.max(0, champ.talentPoints - (node.cost||1)); // nunca negativo (defensa extra, ver sección 34/38)
  st.masteryNodes[id] = (st.masteryNodes[id]||0) + 1;
  persist();
  return {ok:true};
}

// ---- Aplicación de efectos: recorre TODO lo comprado (árbol + maestría) una sola vez y junta
// los mods de cada nodo en dos baldes (globales vía passiveSum / por habilidad vía
// talentSkillMods), sin que ninguna fórmula de combate necesite saber qué talento existe.
function talentPurchasedNodesWithRank(classKey){
  const out = [];
  const st = talentState(classKey);
  for(const node of talentAllNodes(classKey)){
    const rank = st.nodes[node.id]||0;
    if(rank>0) out.push({node, rank});
  }
  const tree = talentTreeFor(classKey);
  if(tree && tree.masteries && st.mastery){
    const m = tree.masteries[st.mastery];
    if(m && m.miniTree){
      for(const node of m.miniTree){
        const rank = st.masteryNodes[node.id]||0;
        if(rank>0) out.push({node, rank});
      }
    }
  }
  return out;
}
const TALENT_MODS_CACHE = {}; // classKey -> {sig, global:[], bySkill:{...}}  (invalida por firma de compras+equipo)
function talentModsSignature(classKey){
  const st = talentState(classKey);
  const champ = save.champions[classKey];
  // El equipo también aporta mods por-habilidad (legendarios/míticos, sección 13): si cambia
  // qué está equipado, la firma cambia y el caché se recalcula -si no, un ítem recién puesto
  // no se notaría hasta la próxima compra de talento-.
  const equipSig = champ && champ.equipment ? EQUIP_SLOT_TYPES.map(t=>champ.equipment[t]||"").join(",") : "";
  return JSON.stringify([st.nodes, st.mastery, st.masteryNodes, equipSig]);
}
// Aplica un array de mods (formato común a nodos de talento e ítems legendarios/míticos) a los
// baldes global/bySkill -única lógica de aplicación, para no duplicarla entre ambas fuentes.
function applyModsArray(mods, global, bySkill){
  for(const mod of (mods||[])){
    if(!mod) continue;
    if(mod.targetSkill!==undefined){
      const bucket = bySkill[mod.targetSkill];
      if(!bucket) continue;
      if(mod.flag!==undefined){
        // Banderas numéricas (%, cantidad de cargas, etc.) se SUMAN si dos fuentes distintas
        // (árbol + Maestría + ítem, por ejemplo) tocan la misma bandera; una bandera puramente
        // booleana (sin valor numérico) simplemente se activa.
        if(typeof mod.value==="number") bucket.flags[mod.flag] = (bucket.flags[mod.flag]||0) + mod.value;
        else bucket.flags[mod.flag] = true;
      }
      else if(mod.key!==undefined) bucket[mod.key] = (bucket[mod.key]||0) + mod.value;
    } else if(mod.effect!==undefined){
      global.push({effect:mod.effect, value:mod.value});
    }
  }
}
function computeTalentMods(classKey){
  const global = [];
  const bySkill = {0:{powerMult:0,areaMult:0,durationMult:0,cdMult:0,jumpBonus:0,flags:{}},
                   1:{powerMult:0,areaMult:0,durationMult:0,cdMult:0,jumpBonus:0,flags:{}},
                   2:{powerMult:0,areaMult:0,durationMult:0,cdMult:0,jumpBonus:0,flags:{}},
                   "ult":{powerMult:0,areaMult:0,durationMult:0,cdMult:0,jumpBonus:0,flags:{}}};
  for(const {node, rank} of talentPurchasedNodesWithRank(classKey)){
    let mods = [];
    try{ mods = node.mods ? (node.mods(rank)||[]) : []; }catch(e){ mods = []; }
    applyModsArray(mods, global, bySkill);
  }
  // Ítems legendarios/míticos diseñados a mano (sección 13): su campo `skillMods`, si lo
  // tienen, usa el MISMO formato que los nodos de talento -ninguna fórmula nueva-.
  EQUIP_SLOT_TYPES.forEach(type=>{
    const it = equippedItem(classKey, type);
    if(it && it.skillMods) applyModsArray(it.skillMods, global, bySkill);
  });
  // Tope defensivo: la reducción de cooldown GLOBAL (bucket "cd_mult", consumido por
  // passiveSum) que aportan los talentos nunca supera 35% combinada (sección 12/38).
  let cdSum = 0;
  const filtered = [];
  for(const g of global){
    if(g.effect==="cd_mult"){ cdSum += g.value; continue; }
    filtered.push(g);
  }
  if(cdSum!==0) filtered.push({effect:"cd_mult", value:Math.min(0.35, Math.max(0,cdSum))});
  return {global: filtered, bySkill};
}
function talentMods(classKey){
  if(!classKey) return {global:[], bySkill:{}};
  const sig = talentModsSignature(classKey);
  const cached = TALENT_MODS_CACHE[classKey];
  if(cached && cached.sig===sig) return cached;
  const fresh = computeTalentMods(classKey);
  fresh.sig = sig;
  TALENT_MODS_CACHE[classKey] = fresh;
  return fresh;
}
// Lista de {effect,value} al estilo de las pasivas de objeto: se concatena dentro de
// passiveSum() (ver más abajo) para que CUALQUIER fórmula que ya consulte pasivas de objeto
// consulte también los talentos, sin tocar esa fórmula.
function talentPassives(classKey){ return talentMods(classKey).global; }
// Modificadores de una habilidad puntual (0/1/2/"ult"): potencia (daño Y curación, ver
// castAbility), área, duración, cooldown (además del tope de talentSkillCdMult) y saltos de
// cadena/propagación, más banderas puntuales para transformaciones especiales/Maestría.
function talentSkillMods(classKey, skillKey){
  const key = skillKey===undefined ? 0 : skillKey;
  return talentMods(classKey).bySkill[key] || {powerMult:0,areaMult:0,durationMult:0,cdMult:0,jumpBonus:0,flags:{}};
}

// Teletransporte de Axiom con cargas (sección 12/37): una carga bancada se gasta SIN tocar el
// cooldown principal (permite encadenar 2-3 teleports), y ese cooldown principal SIEMPRE
// respeta el piso TELEPORT_MIN_CD_MS pase lo que pase con maestría/talentos/objetos -así nunca
// vuelve a existir un build de cooldown ~0 como el que había antes de este sistema-.
function resolveTeleportCd(h, computedCd){
  const floored = Math.max(TELEPORT_MIN_CD_MS, computedCd);
  if((h.teleportChargesBanked||0) > 0){
    h.teleportChargesBanked -= 1;
    if(h.teleportChargeTimer<=0) h.teleportChargeTimer = TELEPORT_CHARGE_RECHARGE_MS;
    return 0;
  }
  return floored;
}
