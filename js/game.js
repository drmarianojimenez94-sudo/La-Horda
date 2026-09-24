"use strict";
/* ============================================================
   js/game.js
   Código del juego que todavía no fue separado en módulos propios.
   ============================================================ */

// Curva de experiencia MUY empinada a propósito: subir de nivel de personaje es permanente,
// así que debe costar un esfuerzo enorme, sobre todo pasados los primeros niveles.
function xpToNext(level){ return Math.round(80 + level*55 + Math.pow(level,2.3)*4); }
// ⚠️ MULTIPLICADOR TEMPORAL DE TESTEO: mientras se está explorando/balanceando el juego, toda la
// XP ganada se multiplica x100 para poder ver progresión y desbloqueos rápido. Antes de publicar
// una build real, volver este valor a 1 para que la curva dura de arriba tenga efecto real.
const DEV_XP_MULT = 100;
function grantXP(champKey, amount){
  const c = save.champions[champKey];
  c.xp += amount * DEV_XP_MULT;
  let leveled = false;
  while(c.level < 99 && c.xp >= xpToNext(c.level)){
    c.xp -= xpToNext(c.level);
    c.level++;
    c.talentPoints = (c.talentPoints||0) + 1;
    leveled = true;
  }
  persist();
  if(leveled) playSfx("levelup");
  return leveled;
}

/* ============================================================
   CASTIGO POR NO TERMINAR LA ARENA
   Morir o abandonar antes del jefe final resta el 50% de toda la XP acumulada del
   campeón (recalculando su nivel hacia abajo si corresponde). Los puntos de talento sin
   gastar se recortan para que nunca queden más de los que el nuevo nivel permite; lo que
   ya se invirtió en maestría (alloc) NO se revierte, tal como pediste.
   ============================================================ */
const ARENA_FAIL_PENALTY_PCT = 0.5;
function totalXpForChamp(champKey){
  const c = save.champions[champKey];
  let total = 0;
  for(let lv=1; lv<c.level; lv++) total += xpToNext(lv);
  return total + c.xp;
}
function setChampFromTotalXp(champKey, totalXp){
  const c = save.champions[champKey];
  let lv = 1, remaining = Math.max(0, totalXp);
  while(lv < 99){
    const need = xpToNext(lv);
    if(remaining < need) break;
    remaining -= need; lv++;
  }
  c.level = lv; c.xp = remaining;
  const maxAllowed = Math.max(0, lv-1);
  // Si con el nivel nuevo (más bajo, por el castigo de arena) hay más puntos invertidos en
  // maestría de los que el nivel permite, se retiran los que sobran -siempre de la
  // habilidad con más invertido, para mantener la build pareja- y vuelven como puntos de
  // talento sin gastar para poder reinvertirlos. El retroceso SÍ vuelve, como pediste.
  const allocRefs = [...c.skillMastery, c.ultMastery];
  let spentAlloc = allocRefs.reduce((s,m)=>s+m.alloc,0);
  while(spentAlloc > maxAllowed){
    let best = allocRefs[0];
    for(const m of allocRefs) if(m.alloc > best.alloc) best = m;
    if(best.alloc<=0) break;
    best.alloc--; spentAlloc--;
  }
  c.talentPoints = Math.max(0, maxAllowed - spentAlloc);
}
// Devuelve {before, after, lost} para poder mostrarlo en la pantalla de derrota
function applyArenaFailurePenalty(champKey){
  const c = save.champions[champKey];
  const before = {level:c.level, xp:totalXpForChamp(champKey), gold:save.gold};
  const penalized = Math.floor(before.xp * (1-ARENA_FAIL_PENALTY_PCT));
  setChampFromTotalXp(champKey, penalized);
  const goldLost = Math.floor(save.gold * ARENA_FAIL_PENALTY_PCT);
  save.gold = Math.max(0, save.gold - goldLost);
  persist();
  return {beforeLevel:before.level, afterLevel:c.level, lostPct:Math.round(ARENA_FAIL_PENALTY_PCT*100), goldLost};
}

/* ============================================================
   MAESTRÍA DE HABILIDADES
   - Nivel de USO (useLvl): sube solo, de forma orgánica, cada vez que se lanza la habilidad.
     Es permanente, pero SOLO otorga un incremento MÍNIMO de daño (o efecto). No toca duración,
     área ni saltos de cadena.
   - Nivel de TALENTO (alloc): se invierte manualmente con puntos ganados al subir de nivel de
     personaje. Es el que hace crecer duración, área, saltos de cadena, reduce el cooldown y
     aporta la parte grande del daño/efecto.
   ============================================================ */
const TALENT_MAX = 10;      // tope de puntos de talento invertibles por habilidad
const ULT_MIN_ARENA_LEVEL = 5; // la ulti no está disponible hasta este nivel de la arena
const USE_LVL_CAP = 40;     // tope de niveles de uso (crecimiento lento, siempre mínimo)
function masteryOf(classKey, idx){
  const c = save.champions[classKey];
  return idx==="ult" ? c.ultMastery : c.skillMastery[idx];
}
function allocLevel(m){ return Math.min(TALENT_MAX, m.alloc); }
// OVERCAP de objetos (sección 14): legendarios/míticos pueden declarar skillOvercap:{0:1,"ult":1}
// para sumar niveles EFECTIVOS de una habilidad puntual sin tocar los puntos permanentes
// invertidos (m.alloc real no cambia; esto es una copia usada solo para calcular poder/tier en
// combate). Tope defensivo total +3 para que ningún stack de objetos vuelva una habilidad base
// en algo absurdamente por encima de lo que el árbol de talentos ya permite.
function itemSkillOvercap(classKey, skillKey){
  if(!classKey) return 0;
  let bonus = 0;
  EQUIP_SLOT_TYPES.forEach(type=>{
    const it = equippedItem(classKey, type);
    if(it && it.skillOvercap && it.skillOvercap[skillKey]) bonus += it.skillOvercap[skillKey];
  });
  return Math.max(0, Math.min(3, bonus));
}
function effectiveMasteryFor(classKey, skillKey){
  const real = masteryOf(classKey, skillKey);
  const bonus = itemSkillOvercap(classKey, skillKey);
  return bonus>0 ? Object.assign({}, real, {alloc: real.alloc+bonus}) : real;
}
function usePowerMult(m){ return 1 + Math.max(0, Math.min(USE_LVL_CAP, m.useLvl-1))*0.012; } // +1.2%/nivel de uso, mínimo y permanente
// Curvas de talento (alloc 0-10) CUADRÁTICAS en vez de lineales: los primeros puntos ya se
// notan, pero el salto entre nivel y nivel crece cada vez más — a nivel 10 la habilidad debe
// sentirse transformada, no "un poco mejor". El progreso es lento (cuesta ganar puntos) mucho
// más marcado en cada paso, tal como se pidió.
function allocPowerMult(m){ const a=allocLevel(m); return 1 + a*0.09 + a*a*0.012; }   // x1 -> x3.1 de nv.0 a nv.10
function masteryPowerMult(m){ return usePowerMult(m) * allocPowerMult(m); }
function masteryCdMult(m){ const a=allocLevel(m); return 1 - Math.min(0.55, a*0.02 + a*a*0.0025); } // hasta -55% cd
// Solo para el Teletransporte de Axiom: a diferencia del resto de las habilidades (tope de
// -55% de cd), esta debe llegar a tener prácticamente nada de cooldown en el nivel máximo.
function masteryTeleportCdMult(m){ const a=allocLevel(m); return 1 - Math.min(0.94, a*0.06 + a*a*0.0034); } // hasta -94% cd
function cdMultFor(sk, m){ return sk.kind==="teleport_blink" ? masteryTeleportCdMult(m) : masteryCdMult(m); }
function masteryAreaMult(m){ const a=allocLevel(m); return 1 + a*0.05 + a*a*0.006; }  // x1 -> x2.1 de área
function masteryDurationMult(m){ const a=allocLevel(m); return 1 + a*0.055 + a*a*0.007; } // x1 -> x2.25 de duración
function masteryJumpBonus(m){ return Math.floor(allocLevel(m)/2); } // +1 salto de cadena cada 2 puntos (antes cada 3)
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
function useXpThreshold(useLvl){ return 6 + useLvl*3; }
function gainSkillUseXp(classKey, idx){
  const m = masteryOf(classKey, idx);
  if(m.useLvl-1 >= USE_LVL_CAP) return;
  m.useXp += 1;
  const need = useXpThreshold(m.useLvl);
  if(m.useXp >= need){ m.useXp -= need; m.useLvl += 1; }
  persist();
}
function investTalentPoint(classKey, idx){
  const champ = save.champions[classKey];
  if(champ.talentPoints<=0) return;
  const m = idx==="ult" ? champ.ultMastery : champ.skillMastery[idx];
  if(allocLevel(m) >= TALENT_MAX) return;
  m.alloc += 1; champ.talentPoints -= 1;
  persist();
  renderMasteryPanel();
}
// IA de los aliados (bots): reparte sus puntos de talento entre las 3 habilidades y la ulti,
// priorizando siempre la que menos invertida está, para que terminen con una build pareja
// en vez de dejar puntos sin gastar (el jugador sigue invirtiendo los suyos a mano).
function autoInvestTalentPoints(classKey){
  const champ = save.champions[classKey];
  if(!champ) return;
  while(champ.talentPoints>0){
    const options = [0,1,2,"ult"];
    let best = options[0], bestLvl = Infinity;
    for(const idx of options){
      const m = idx==="ult" ? champ.ultMastery : champ.skillMastery[idx];
      const lvl = allocLevel(m);
      if(lvl < bestLvl){ bestLvl = lvl; best = idx; }
    }
    if(bestLvl >= TALENT_MAX) break; // ya está todo al máximo
    investTalentPoint(classKey, best);
  }
}
// IA de los aliados: si tienen objetos sin equipar en su inventario PERMANENTE (ganado en
// partidas anteriores jugando esa clase), se ponen el mejor disponible en cada ranura vacía.
// Nunca toca una ranura que el jugador ya haya elegido a mano.
function autoEquipBest(classKey){
  const champ = save.champions[classKey];
  if(!champ) return;
  champ.equipment = Object.assign(mkEquipment(), champ.equipment||{});
  EQUIP_SLOT_TYPES.forEach(type=>{
    if(champ.equipment[type]) return;
    const candidates = (champ.inventory||[]).filter(it=>it.type===type);
    if(!candidates.length) return;
    candidates.sort((a,b)=> rarityIndex(b.rarity)-rarityIndex(a.rarity) || b.value-a.value);
    champ.equipment[type] = candidates[0].uid;
  });
  persist();
}
function renderMasteryPanel(){
  const panel = document.getElementById("mastery-panel");
  if(!panel || !player) return;
  const classKey = player.classKey;
  const cls = CLASSES[classKey];
  const champ = save.champions[classKey];
  const items = cls.skills.map((sk,i)=>({sk, idx:i, m:champ.skillMastery[i]}))
    .concat([{sk:cls.ultimate, idx:"ult", m:champ.ultMastery}]);
  let html = `<div class="talent-points">Puntos de talento disponibles: <b>${champ.talentPoints}</b></div><div class="mastery-list">`;
  items.forEach(({sk,idx,m})=>{
    const tLvl = allocLevel(m);
    const tMaxed = tLvl>=TALENT_MAX;
    const need = useXpThreshold(m.useLvl);
    const usePct = Math.min(100, m.useXp/need*100);
    const canInvest = champ.talentPoints>0 && !tMaxed;
    const statNow = skillStatLine(sk, m);
    const nextM = {useXp:0, useLvl:m.useLvl, alloc: Math.min(TALENT_MAX, m.alloc+1)};
    const statNext = tMaxed ? "" : `<span class="mastery-next"> → ${skillStatLine(sk, nextM)}</span>`;
    const useBonusPct = Math.round((usePowerMult(m)-1)*100);
    const iconImg = SKILL_ICON_IMG[sk.name];
    const iconHtml = iconImg ? `<img src="${iconImg}" style="width:100%;height:100%;object-fit:contain;image-rendering:pixelated;">` : sk.ico;
    html += `
      <div class="mastery-row">
        <div class="mastery-icon">${iconHtml}</div>
        <div class="mastery-info">
          <div class="mastery-name"><span>${sk.name}</span><span class="mastery-lvl">${tMaxed?"Talento MÁX":"Talento "+tLvl+"/"+TALENT_MAX}</span></div>
          <div class="mastery-bar-track"><div class="mastery-bar-fill" style="width:${usePct}%"></div></div>
          <div class="mastery-stats"><b>${statNow}</b>${statNext}</div>
          <div class="mastery-use">Uso Nv. ${m.useLvl} · +${useBonusPct}% daño permanente por práctica</div>
        </div>
        <button class="mastery-plus ${canInvest?"ready":""}" ${canInvest?"":"disabled"} data-idx="${idx}">+</button>
      </div>`;
  });
  html += "</div>";
  panel.innerHTML = html;
  panel.querySelectorAll(".mastery-plus.ready").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const raw = btn.getAttribute("data-idx");
      investTalentPoint(classKey, raw==="ult" ? "ult" : parseInt(raw));
    });
  });
}
// Nombre legible de a qué habilidad/ulti apunta un nodo (para mostrar "afecta: X" en su fila).
function talentSkillLabel(classKey, targetSkill){
  if(targetSkill===undefined) return "";
  const cls = CLASSES[classKey];
  if(targetSkill==="ult") return cls.ultimate.name;
  return cls.skills[targetSkill] ? cls.skills[targetSkill].name : "";
}
function renderTalentNodeRow(classKey, node, rank, lockReason, isMastery){
  const maxed = rank>=node.maxRank;
  const locked = !!lockReason && lockReason!=="MÁX";
  const targets = [];
  try{
    const sample = node.mods(Math.max(1,rank||1))||[];
    sample.forEach(m=>{ if(m.targetSkill!==undefined){ const l=talentSkillLabel(classKey,m.targetSkill); if(l && !targets.includes(l)) targets.push(l); } });
  }catch(e){}
  const nextDesc = maxed ? "" : `<div class="mastery-next">Próximo rango: ${node.rankDesc(rank+1)}</div>`;
  const curDesc = rank>0 ? `<div class="mastery-stats"><b>Actual:</b> ${node.rankDesc(rank)}</div>` : "";
  const typeLabel = node.type==="special" ? "Especial" : (isMastery ? "Maestría" : "Común");
  const reasonHtml = (locked && lockReason) ? `<div class="talent-lock-reason">🔒 ${lockReason}</div>` : "";
  const btnCls = (!locked && !maxed) ? "ready" : "";
  const rowCls = ["talent-row","mastery-row"];
  if(locked) rowCls.push("locked");
  if(node.type==="special") rowCls.push("special");
  if(maxed) rowCls.push("maxed");
  return `
    <div class="${rowCls.join(" ")}" data-node="${node.id}" data-mastery="${isMastery?"1":"0"}">
      <div class="mastery-icon">${maxed?"✔":(node.type==="special"?"★":"•")}</div>
      <div class="mastery-info">
        <div class="mastery-name"><span>${node.name} <span class="talent-badge${node.type==="special"?" special":""}">${typeLabel}</span></span><span class="mastery-lvl">${rank}/${node.maxRank}</span></div>
        <div class="mastery-use">${node.desc}${targets.length?` (afecta: ${targets.join(", ")})`:""}</div>
        ${curDesc}
        ${nextDesc}
        ${reasonHtml}
      </div>
      <button class="mastery-plus ${btnCls}" ${btnCls?"":"disabled"} data-node="${node.id}" data-mastery="${isMastery?"1":"0"}">${maxed?"✔":"+"}</button>
    </div>`;
}
function renderTalentsPanel(){
  const panel = document.getElementById("talents-panel");
  if(!panel || !player) return;
  const classKey = player.classKey;
  const champ = save.champions[classKey];
  const tree = talentTreeFor(classKey);
  if(!tree){ panel.innerHTML = `<div class="talent-lock-banner">Esta clase todavía no tiene árbol de talentos.</div>`; return; }
  let html = `<div class="talent-points">Nivel ${champ.level} · Puntos de talento disponibles: <b>${champ.talentPoints}</b></div>`;
  if(champ.level < TALENT_TREE_MIN_LEVEL){
    html += `<div class="talent-lock-banner">🔒 Los talentos se desbloquean en el nivel ${TALENT_TREE_MIN_LEVEL} (te faltan ${TALENT_TREE_MIN_LEVEL-champ.level} niveles). Podés inspeccionar todo el árbol y planificar tu build desde ahora.</div>`;
  }
  const branches = [...new Set(tree.nodes.map(n=>n.branch))];
  const st = talentState(classKey);
  branches.forEach(branch=>{
    const inv = branchInvestment(classKey, branch);
    html += `<div class="talent-branch-title"><span>${branch.replace(/_/g," ")}</span><span class="inv">${inv} pts. invertidos</span></div>`;
    tree.nodes.filter(n=>n.branch===branch).forEach(node=>{
      const rank = st.nodes[node.id]||0;
      const reason = talentNodeLockReason(classKey, node);
      html += renderTalentNodeRow(classKey, node, rank, reason, false);
    });
  });
  // ---- Maestría ----
  html += `<div class="mastery-section"><div class="talent-branch-title"><span>Maestría (nivel ${TALENT_MASTERY_MIN_LEVEL}+)</span></div>`;
  const options = masteryOptionsFor(classKey);
  if(!st.mastery){
    options.forEach(m=>{
      const canPick = canPickMastery(classKey, m.id);
      const reason = masteryLockReason(classKey, m.id);
      html += `<div class="mastery-choice-card ${canPick?"eligible":""}">
        <div class="mc-name">${m.name}</div>
        <div class="mc-desc">${m.desc}</div>
        ${canPick ? `<button class="btn wide mastery-pick-btn" data-mastery-id="${m.id}">Elegir Maestría (permanente)</button>` : `<div class="talent-lock-reason">🔒 ${reason}</div>`}
      </div>`;
    });
  } else {
    const chosen = tree.masteries[st.mastery];
    html += `<div class="mastery-choice-card eligible"><div class="mc-name">${chosen.name} ✔</div><div class="mc-desc">${chosen.desc}</div></div>`;
    chosen.miniTree.forEach(node=>{
      const rank = st.masteryNodes[node.id]||0;
      const reason = masteryMiniLockReason(classKey, node);
      html += renderTalentNodeRow(classKey, node, rank, reason, true);
    });
    const others = options.filter(m=>m.id!==st.mastery);
    if(others.length){
      html += `<div class="talent-lock-reason" style="margin-top:6px;">Maestrías bloqueadas permanentemente: ${others.map(m=>m.name).join(", ")}</div>`;
    }
  }
  html += "</div>";
  panel.innerHTML = html;
  panel.querySelectorAll(".mastery-plus.ready").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const nodeId = btn.getAttribute("data-node");
      const isMastery = btn.getAttribute("data-mastery")==="1";
      const buyFn = isMastery ? buyMasteryNode : buyTalentNode;
      let res = buyFn(classKey, nodeId, false);
      if(res.needsConfirm){
        const node = isMastery ? masteryMiniNodeById(classKey, nodeId) : talentNodeById(classKey, nodeId);
        const msg = isMastery
          ? `Vas a invertir un punto de Maestría en "${node.name}". Esta decisión es permanente. ¿Deseas continuar?`
          : `"${node.name}" es una elección irreversible: bloqueará permanentemente su alternativa. ¿Deseas continuar?`;
        if(confirm(msg)) res = buyFn(classKey, nodeId, true);
        else return;
      }
      if(res.ok) renderTalentsPanel();
      else if(res.reason) alert(res.reason);
    });
  });
  panel.querySelectorAll(".mastery-pick-btn").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const masteryId = btn.getAttribute("data-mastery-id");
      let res = pickMastery(classKey, masteryId, false);
      if(res.needsConfirm){
        const m = tree.masteries[masteryId];
        if(confirm(`Vas a convertirte en "${m.name}". Esta decisión es PERMANENTE: las otras dos Maestrías quedarán bloqueadas para siempre en este campeón. ¿Deseas continuar?`)){
          res = pickMastery(classKey, masteryId, true);
        } else return;
      }
      if(res.ok) renderTalentsPanel();
      else if(res.reason) alert(res.reason);
    });
  });
}
// Resumen numérico de una habilidad para un objeto de maestría dado (real o hipotético, para
// previsualizar el próximo nivel de talento sin mutar el estado guardado).
function skillStatLine(sk, m){
  const POWER = masteryPowerMult(m), AREA = masteryAreaMult(m), DUR = masteryDurationMult(m);
  const powerLabel = sk.dmgMult ? "Daño" : (sk.healPct||sk.hpBonusPct||sk.shieldPct) ? "Efecto" : null;
  const parts = powerLabel ? [`${powerLabel} ×${POWER.toFixed(2)}`] : [];
  if(sk.duration) parts.push(`Dur. ${(sk.duration*DUR/1000).toFixed(1)}s`);
  if(sk.radius) parts.push(`Área ${Math.round(sk.radius*AREA)}px`);
  if(sk.range) parts.push(`Alcance ${Math.round(sk.range*AREA)}px`);
  if(sk.jumps) parts.push(`Saltos ${sk.jumps + masteryJumpBonus(m)}`);
  return parts.join(" · ");
}
function grantGold(n){ save.gold += n; persist(); }
function grantRelic(kind){ save.relics[kind] = Math.min(30, (save.relics[kind]||0)+1); persist(); }
function weaponLabelFor(classKey){ return CLASS_WEAPON_LABEL[classKey] || ITEM_TYPES.arma.label; }

function rarityIndex(r){ return RARITIES.indexOf(r); }
// Cuenta piezas del set X equipadas por el campeón (0 si no tiene ninguna).
function equippedSetCount(champKey, setId){
  let n = 0;
  EQUIP_SLOT_TYPES.forEach(type=>{ const it = equippedItem(champKey, type); if(it && it.set===setId) n++; });
  return n;
}
// Todos los bonus de set (de cualquier set) actualmente ACTIVOS para un campeón, listos para
// concatenar en equippedPassives(). Se recalcula siempre en caliente a partir de lo equipado
// -nunca queda un bonus "fantasma" al desequipar una pieza, sección 8-.
function activeSetBonusEffects(champKey){
  const out = [];
  for(const setId in SET_DB){
    const set = SET_DB[setId];
    const count = equippedSetCount(champKey, setId);
    set.thresholds.forEach(th=>{
      if(count >= th.count) (th.mods()||[]).forEach(m=>out.push(m));
    });
  }
  return out;
}
// Estado de un set para la UI (sección 8): piezas equipadas + qué umbrales están activos/bloqueados.
function setProgressFor(champKey, setId){
  const set = SET_DB[setId];
  const count = equippedSetCount(champKey, setId);
  return {set, count, total:Object.keys(set.pieces).length,
    thresholds: set.thresholds.map(th=>({count:th.count, desc:th.desc, active:count>=th.count}))};
}
// Sets con al menos 1 pieza equipada por el campeón (para mostrar en el panel de equipamiento).
function activeSetIdsFor(champKey){
  return Object.keys(SET_DB).filter(id=>equippedSetCount(champKey,id)>0);
}
// Instancia un objeto DISEÑADO (legendario/mítico real, o pieza de set) a partir de su ficha:
// stats garantizados por RARITY_VALUES (igual que un objeto procedural) + su identidad propia.
function makeDesignedItem(designId){
  const d = DESIGNED_ITEMS[designId];
  if(!d) return null;
  const meta = RARITY_META[d.rarity];
  const value = RARITY_VALUES[d.type][d.rarity];
  const mythicPassive = d.rarity==="mitico" ? instancePassive(rollFrom(PASSIVE_DB_MYTHIC,1)[0]) : null;
  const passives = (d.effectMods||[]).map((m,i)=>({id:d.id+"_eff"+i, name:d.passiveNames[i]||"Pasiva", desc:"", condition:"siempre", effect:m.effect, value:m.value}));
  return {
    uid: "it_"+(ITEM_UID_SEQ++)+"_"+Date.now().toString(36),
    type:d.type, rarity:d.rarity, designed:true, designId:d.id,
    name:d.name, icon:ITEM_TYPES[d.type].icon, statKey:d.type, value,
    passives, mythicPassive,
    champion:d.champion, set:d.set||null,
    skillMods: d.skillMods||null, skillOvercap: d.skillOvercap||null,
    placeholder:false,
    desc: `${d.lore} · +${Math.round(value*100)}% ${ITEM_TYPES[d.type].statLabel}${d.set?` · Set: ${SET_DB[d.set].name}`:""}${(d.skillMods||d.skillOvercap)?" · Modifica una habilidad":""}`
  };
}
// IDs de objetos diseñados disponibles para un campeón (los suyos + las piezas de set
// universales, champion:null). Se usan al generar recompensas de rareza legendario/mítico.
function designedItemsFor(classKey){
  return Object.values(DESIGNED_ITEMS).filter(d=> d.champion===null || d.champion===classKey);
}
function rollFrom(arr, n){
  const pool = arr.slice();
  const out = [];
  for(let i=0;i<n && pool.length;i++){
    const idx = Math.floor(Math.random()*pool.length);
    out.push(pool.splice(idx,1)[0]);
  }
  return out;
}
// Instancia una pasiva concreta (con su valor ya calculado) a partir de una entrada del catálogo
function instancePassive(def){
  return {id:def.id, name:def.name, desc:def.desc, condition:def.condition, effect:def.effect,
    value: Math.round(def.valueBase*1000)/1000};
}
let ITEM_UID_SEQ = 1;
// Genera un objeto nuevo 100% a partir de datos (sin casos especiales por objeto).
// type: "arma"|"casco"|"escudo" · rarity: una de RARITIES · champKey: compatible con ese campeón (o null = cualquiera)
function makeItem(type, rarity, champKey){
  const meta = RARITY_META[rarity];
  const value = RARITY_VALUES[type][rarity];
  const passiveDefs = rollFrom(PASSIVE_DB, meta.passives);
  const passives = passiveDefs.map(instancePassive);
  const mythicPassive = (rarity==="mitico"||rarity==="unico") ? instancePassive(rollFrom(PASSIVE_DB_MYTHIC,1)[0]) : null;
  const isPlaceholder = rarity==="unico"; // los únicos reales se diseñan a mano más adelante
  const clsName = champKey && CLASSES[champKey] ? CLASSES[champKey].name : "cualquier campeón";
  const uniqueWord = type==="arma" ? "Única" : "Único";
  return {
    uid: "it_"+(ITEM_UID_SEQ++)+"_"+Date.now().toString(36),
    type, rarity,
    name: isPlaceholder ? `[PLACEHOLDER] ${ITEM_TYPES[type].label} ${uniqueWord} de ${clsName}` : `${meta.label} ${ITEM_TYPES[type].label} de ${clsName}`,
    icon: ITEM_TYPES[type].icon,
    statKey: type, value,
    passives, mythicPassive,
    champion: champKey || null,
    placeholder: isPlaceholder,
    desc: isPlaceholder
      ? "Objeto ÚNICO de prueba: la estructura funciona, pero el diseño final de este objeto se hará a mano más adelante."
      : `+${Math.round(value*100)}% ${ITEM_TYPES[type].statLabel}${passives.length?` · ${passives.length} pasiva${passives.length>1?"s":""}`:""}${mythicPassive?" · 1 pasiva mítica":""}.`
  };
}
// Devuelve el objeto equipado en una ranura de un campeón (o null)
function equippedItem(champKey, type){
  const champ = save.champions[champKey];
  const uid = champ.equipment && champ.equipment[type];
  if(!uid) return null;
  return (champ.inventory||[]).find(it=>it.uid===uid) || null;
}
// Junta todas las pasivas (normales + míticas + el % garantizado de pechera/guantes/botas +
// bonus de set activos) de los 6 ítems equipados de un campeón.
function equippedPassives(champKey){
  const list = [];
  EQUIP_SLOT_TYPES.forEach(type=>{
    const it = equippedItem(champKey, type);
    if(!it) return;
    (it.passives||[]).forEach(p=>list.push(p));
    if(it.mythicPassive) list.push(it.mythicPassive);
    const guaranteedEffect = SLOT_GUARANTEED_EFFECT[type];
    if(guaranteedEffect) list.push({id:"slot_"+type, name:ITEM_TYPES[type].label, effect:guaranteedEffect, value:it.value});
  });
  activeSetBonusEffects(champKey).forEach(p=>list.push(p));
  return list;
}
// Suma el valor de todas las pasivas equipadas que coincidan con un efecto dado (p.ej. "dmg_mult").
function passiveSum(champKey, effect){
  // Objeto equipado + talentos permanentes: mismo balde, mismo formato {effect,value} -así
  // TODA fórmula que ya consultaba pasivas de objeto (daño, cd, crítico, def, lifesteal, etc.)
  // automáticamente respeta también los talentos, sin que esa fórmula se entere de que existen.
  const talents = champKey ? talentPassives(champKey) : [];
  return equippedPassives(champKey).concat(talents).filter(p=>p.effect===effect).reduce((s,p)=>s+p.value,0);
}
// Sobrecarga Mítica: bonus de daño/velocidad mientras la vida esté por debajo del 50%.
function mythicExecuteBonus(h){
  if(!h.hp || !h.maxHp || h.hp >= h.maxHp*0.5) return 0;
  return equippedPassives(h.classKey).filter(p=>p.effect==="mythic_execute").reduce((s,p)=>s+p.value,0);
}
function equipItem(champKey, uid){
  const champ = save.champions[champKey];
  const item = (champ.inventory||[]).find(it=>it.uid===uid);
  if(!item) return;
  champ.equipment[item.type] = uid; // reemplaza lo que hubiera en esa ranura, sin duplicar bonificación
  persist();
}
function unequipItem(champKey, type){
  const champ = save.champions[champKey];
  champ.equipment[type] = null;
  persist();
}
function addItemToInventory(champKey, item){
  const champ = save.champions[champKey];
  champ.inventory = champ.inventory || [];
  if(champ.inventory.length >= INVENTORY_CAPACITY) return null; // inventario lleno
  champ.inventory.push(item);
  persist();
  return item;
}
// Quita el objeto del inventario (y lo desequipa primero si estaba puesto). "gold" indica si
// además otorga oro (vender) o no (descartar, sin recompensa, solo para liberar espacio ya).
function removeItemFromInventory(champKey, uid, grantGoldReward){
  const champ = save.champions[champKey];
  const idx = (champ.inventory||[]).findIndex(it=>it.uid===uid);
  if(idx===-1) return null;
  const item = champ.inventory[idx];
  Object.keys(champ.equipment).forEach(slot=>{ if(champ.equipment[slot]===uid) champ.equipment[slot]=null; });
  champ.inventory.splice(idx,1);
  if(grantGoldReward){ save.gold += SELL_VALUE[item.rarity]||10; }
  persist();
  return item;
}
function sellItem(champKey, uid){ return removeItemFromInventory(champKey, uid, true); }
function discardItem(champKey, uid){ return removeItemFromInventory(champKey, uid, false); }

// Fusión (sección 18): 3 objetos GENÉRICOS (sin nombre propio, sin set) del mismo tipo+rareza
// se combinan en 1 objeto procedural de la rareza siguiente. Los objetos diseñados a mano
// (legendarios/míticos con lore) y los de set NUNCA se fusionan -son demasiado específicos
// para "promediarse"-, y ÚNICO nunca sale de acá (sección 6): ni como entrada consumible más
// allá de mitico, ni como resultado.
function canFuseGroup(items){
  if(items.length!==3) return {ok:false, reason:"Elegí exactamente 3 objetos"};
  const [a,b,c] = items;
  if(!a || !b || !c) return {ok:false, reason:"Objeto inexistente"};
  if(a.type!==b.type || b.type!==c.type) return {ok:false, reason:"Deben ser del mismo tipo de equipamiento"};
  if(a.rarity!==b.rarity || b.rarity!==c.rarity) return {ok:false, reason:"Deben ser de la misma rareza"};
  if(a.rarity==="unico" || a.rarity==="mitico") return {ok:false, reason:"Esta rareza no se puede fusionar más"};
  if(a.designed || b.designed || c.designed) return {ok:false, reason:"Los objetos con nombre propio (legendarios/míticos/set) no se fusionan"};
  const nextRarity = RARITIES[rarityIndex(a.rarity)+1];
  return {ok:true, nextRarity, type:a.type};
}
function fuseItems(classKey, uids){
  const champ = save.champions[classKey];
  if(!champ || uids.length!==3) return {ok:false, reason:"Elegí exactamente 3 objetos"};
  const items = uids.map(u=>(champ.inventory||[]).find(it=>it.uid===u));
  const check = canFuseGroup(items);
  if(!check.ok) return check;
  uids.forEach(u=>removeItemFromInventory(classKey, u, false));
  const fused = makeItem(check.type, check.nextRarity, classKey);
  addItemToInventory(classKey, fused);
  return {ok:true, item:fused};
}
// Agrupa el inventario por tipo+rareza para ofrecer fusión de a 3 (solo grupos fusionables).
function fusableGroups(classKey){
  const champ = save.champions[classKey];
  const groups = {};
  (champ.inventory||[]).forEach(it=>{
    if(it.designed || it.rarity==="unico" || it.rarity==="mitico") return;
    const key = it.type+"|"+it.rarity;
    (groups[key] = groups[key]||[]).push(it);
  });
  return Object.values(groups).filter(g=>g.length>=3);
}

// Recalcula en caliente las estadísticas del héroe que se está jugando ahora mismo cuando
// el jugador equipa/desequipa algo desde la pausa (sin reconstruir el héroe ni tocar su HP actual).
function refreshEquippedStats(){
  if(!player) return;
  const base = computePlayerStats(player.classKey);
  player.baseDmg = base.dmg;
  player.def = base.def;
  player.baseSpeed = base.speed*(player.isBot?0.95:1)*arenaMods().heroSpeedMult;
  // Vida máxima: si sube (pechera nueva, etc.), la vida ACTUAL sube en la misma proporción del
  // aumento (no se rellena gratis a tope); si baja, la vida actual se recorta si hiciera falta.
  const newMaxHp = Math.round(base.hp * runStats.hpMult);
  if(newMaxHp !== player.maxHp){
    const hpDiff = newMaxHp - player.maxHp;
    player.maxHp = newMaxHp;
    player.hp = Math.max(1, Math.min(player.maxHp, player.hp + hpDiff));
  }
  const newItemMaxShield = Math.round(player.maxHp * (base.shieldPct||0));
  const diff = newItemMaxShield - (player.itemMaxShield||0);
  player.itemMaxShield = newItemMaxShield;
  player.itemShield = Math.max(0, Math.min(newItemMaxShield, (player.itemShield||0) + Math.max(0,diff)));
}

// Pestaña "Inventario"/"Equipamiento": ranuras equipadas + lista de objetos del campeón.
let compareOpenUid = null; // qué tarjeta tiene la comparación abierta

// Foto completa de las estadísticas RESULTANTES de un campeón (sección 5: "qué gano y qué
// pierdo"). Se apoya en las mismas fórmulas reales de combate (computePlayerStats/passiveSum),
// nunca en una copia aparte -así la comparación nunca puede mentir respecto de lo que pasa en
// partida-. energyRegen/critChance parten de sus bases reales (cls.energyRegen, 0.04 de
// runStats) para que el número mostrado sea el efectivo, no solo el bonus.
function snapshotChampStats(classKey){
  const base = computePlayerStats(classKey);
  const cls = CLASSES[classKey];
  return {
    dmg: Math.round(base.dmg),
    hp: base.hp,
    def: Math.round((1-(1-Math.min(0.6,base.def))*(1-Math.min(0.5,passiveSum(classKey,"def_add"))))*1000)/10,
    shield: Math.round(base.hp*(base.shieldPct||0)),
    atkspeed: Math.round((1+passiveSum(classKey,"atkspeed_mult"))*1000)/10,
    movespeed: Math.round(base.speed),
    cdr: Math.round(Math.min(0.6,Math.max(0,passiveSum(classKey,"cd_mult")))*1000)/10,
    lifesteal: Math.round(passiveSum(classKey,"lifesteal_add")*1000)/10,
    healMult: Math.round(passiveSum(classKey,"heal_mult")*1000)/10,
    critChance: Math.round((0.04+passiveSum(classKey,"crit_chance_add"))*1000)/10,
    critMult: Math.round((1.8+passiveSum(classKey,"crit_mult_add"))*100)/100,
    energy: Math.round(cls.energyMax*(1+passiveSum(classKey,"energy_mult")))
  };
}
const STAT_ROWS = [
  {key:"dmg",       label:"Daño",                 fmt:v=>Math.round(v)},
  {key:"hp",        label:"Vida máxima",          fmt:v=>Math.round(v)},
  {key:"def",       label:"Defensa",              fmt:v=>v+"%"},
  {key:"shield",    label:"Escudo (casco+escudo)",fmt:v=>Math.round(v)},
  {key:"atkspeed",  label:"Velocidad de ataque",  fmt:v=>v+"%"},
  {key:"movespeed", label:"Velocidad de movimiento", fmt:v=>Math.round(v)},
  {key:"cdr",       label:"Reducción de cooldown",fmt:v=>v+"%"},
  {key:"lifesteal", label:"Robo de vida",         fmt:v=>v+"%"},
  {key:"healMult",  label:"Curación realizada",   fmt:v=>(v>=0?"+":"")+v+"%"},
  {key:"critChance",label:"Prob. crítico",        fmt:v=>v+"%"},
  {key:"critMult",  label:"Daño crítico",         fmt:v=>"x"+v},
  {key:"energy",    label:"Recurso máximo",       fmt:v=>Math.round(v)}
];
// Compara "lo que hay ahora" contra "lo que pasaría si equipo `candidate`": equipa
// hipotéticamente (sin persistir), toma la foto, y desequipa -mismo criterio que ya usa
// talentModsSignature para invalidar su caché automáticamente-.
function compareItemsFull(classKey, candidate){
  const champ = save.champions[classKey];
  const prevUid = champ.equipment[candidate.type];
  const before = snapshotChampStats(classKey);
  champ.equipment[candidate.type] = candidate.uid;
  const after = snapshotChampStats(classKey);
  champ.equipment[candidate.type] = prevUid;
  return {before, after};
}
function compareItemsHTML(classKey, candidate){
  const { before, after } = compareItemsFull(classKey, candidate);
  const rows = STAT_ROWS.map(r=>{
    const b = before[r.key], a = after[r.key];
    if(Math.abs(a-b) < 0.001) return null; // no mostrar filas sin cambio, para no saturar la tarjeta
    const cls = a>b ? "up" : "down";
    const arrow = a>b ? "▲" : "▼";
    return `<div class="compare-line ${cls}">${r.label}: ${r.fmt(b)} → ${r.fmt(a)} ${arrow}</div>`;
  }).filter(Boolean).join("");
  const current = equippedItem(classKey, candidate.type);
  const curPassives = current ? (current.passives.length + (current.mythicPassive?1:0)) : 0;
  const newPassives = candidate.passives.length + (candidate.mythicPassive?1:0);
  const passiveDiff = newPassives - curPassives;
  const skillModNote = candidate.skillMods ? `<div class="compare-line up">Modifica una habilidad puntual (ver descripción)</div>` : "";
  const setNote = candidate.set ? (()=>{
    const beforeCount = equippedSetCount(classKey, candidate.set);
    const champ = save.champions[classKey]; const prevUid = champ.equipment[candidate.type];
    champ.equipment[candidate.type] = candidate.uid;
    const afterCount = equippedSetCount(classKey, candidate.set);
    champ.equipment[candidate.type] = prevUid;
    return `<div class="compare-line ${afterCount>beforeCount?"up":"neutral"}">Set "${SET_DB[candidate.set].name}": ${beforeCount} → ${afterCount} piezas</div>`;
  })() : "";
  return `<div class="item-compare">
      <div class="compare-col-title">Si equipás esto, cambia:</div>
      ${rows || '<div class="compare-line neutral">Sin cambios en estadísticas base</div>'}
      <div class="compare-line ${passiveDiff>0?"up":(passiveDiff<0?"down":"neutral")}">Pasivas: ${curPassives} → ${newPassives}</div>
      ${skillModNote}${setNote}
    </div>`;
}
// Grilla de las 6 ranuras equipadas (sección 3/4), compartida por Pausa->Inventario y por la
// pantalla de Equipamiento previa a la arena -misma estructura de datos, mismo HTML-.
// unequipAttr es el nombre del atributo data- que usa cada pantalla para su propio handler
// (difieren porque unequipItem debe refrescar cosas distintas según haya o no partida en curso).
function renderEquipmentGridHTML(classKey, unequipAttr){
  let html = '<div class="inv-slots">';
  EQUIP_SLOT_TYPES.forEach(type=>{
    const it = equippedItem(classKey, type);
    const meta = ITEM_TYPES[type];
    const label = type==="arma" ? weaponLabelFor(classKey) : meta.label;
    if(it){
      const rm = RARITY_META[it.rarity];
      const borderColor = it.set ? "#3ddc71" : rm.color;
      html += `<div class="inv-slot filled ${it.set?"set-item":""}" style="border-color:${borderColor};">
        <span class="slot-icon">${it.icon}</span>
        <span style="color:${borderColor}; font-weight:700;">${label}</span>
        <span class="slot-item-name">${it.name}${it.set?' <span class="set-badge">SET</span>':""}</span>
        <button data-${unequipAttr}="${type}">Quitar</button>
      </div>`;
    } else {
      html += `<div class="inv-slot"><span class="slot-icon">${meta.icon}</span><span>${label}</span><span class="slot-item-name">vacío</span></div>`;
    }
  });
  html += '</div>';
  return html;
}
// Panel de progreso de sets (sección 7/8): solo se muestran los sets con al menos 1 pieza
// puesta, y cada umbral se recalcula en caliente -nunca queda un bonus fantasma-.
function renderSetPanelHTML(classKey){
  const activeIds = activeSetIdsFor(classKey);
  if(!activeIds.length) return "";
  let html = '<div class="set-panel">';
  activeIds.forEach(setId=>{
    const prog = setProgressFor(classKey, setId);
    const rm = RARITY_META[prog.set.rarity];
    html += `<div class="set-title" style="color:${rm.color};">${prog.set.name} — ${prog.count}/${prog.total} piezas</div>`;
    prog.thresholds.forEach(th=>{
      html += `<div class="set-thr ${th.active?"active":""}">(${th.count}) ${th.desc}</div>`;
    });
  });
  html += '</div>';
  return html;
}
// Barra de fusión (sección 18): agrupa lo fusionable y ofrece un botón por grupo. fuseAttr
// distingue el data- atributo entre las dos pantallas que la usan (igual que unequipAttr).
function renderFusionHTML(classKey, fuseAttr){
  const groups = fusableGroups(classKey);
  if(!groups.length) return "";
  let html = '<div class="fuse-bar"><div class="set-title">Fusión disponible — 3 iguales → siguiente rareza</div>';
  groups.forEach(g=>{
    const sample = g[0];
    const meta = ITEM_TYPES[sample.type];
    const rm = RARITY_META[sample.rarity];
    const nextRm = RARITY_META[RARITIES[rarityIndex(sample.rarity)+1]];
    html += `<div class="fuse-row">
      <span>${meta.icon} ${meta.label} <span style="color:${rm.color}">${rm.label}</span> x${g.length} → <span style="color:${nextRm.color}">${nextRm.label}</span></span>
      <button data-${fuseAttr}="${sample.type}|${sample.rarity}">Fusionar 3</button>
    </div>`;
  });
  html += '</div>';
  return html;
}
// Maneja el click de un botón de fusión: toma el grupo type|rarity, usa las 3 primeras
// unidades disponibles y ejecuta la fusión real (fuseItems ya valida todo de nuevo por las dudas).
function handleFuseClick(classKey, groupKey){
  const [type, rarity] = groupKey.split("|");
  const champ = save.champions[classKey];
  const uids = (champ.inventory||[]).filter(it=>it.type===type && it.rarity===rarity && !it.designed).slice(0,3).map(it=>it.uid);
  if(uids.length!==3) return;
  const result = fuseItems(classKey, uids);
  if(!result.ok) alert(result.reason||"No se pudo fusionar.");
}
function renderInventoryPanel(){
  const panel = document.getElementById("inventory-panel");
  if(!panel || !player) return;
  const classKey = player.classKey;
  const champ = save.champions[classKey];
  champ.inventory = champ.inventory || [];
  champ.equipment = Object.assign(mkEquipment(), champ.equipment||{});

  let html = renderEquipmentGridHTML(classKey, "unequip");
  html += renderSetPanelHTML(classKey);

  const full = champ.inventory.length >= INVENTORY_CAPACITY;
  html += `<div class="inv-capacity">Inventario: ${champ.inventory.length}/${INVENTORY_CAPACITY}${full?" — lleno":""}</div>`;
  html += renderFusionHTML(classKey, "fuse");

  if(!champ.inventory.length){
    html += '<div class="inv-empty">Todavía no tenés objetos. Se obtienen al derrotar subjefes y al jefe final.</div>';
  } else {
    html += '<div class="inv-list">';
    champ.inventory.slice().reverse().forEach(it=>{
      const rm = RARITY_META[it.rarity];
      const equipped = champ.equipment[it.type] === it.uid;
      const passiveNames = it.passives.map(p=>p.name);
      if(it.mythicPassive) passiveNames.push("★ "+it.mythicPassive.name);
      const passiveTxt = passiveNames.join(", ");
      const comparing = compareOpenUid === it.uid;
      html += `<div class="inv-card ${it.set?"set-item":""}" data-compare-toggle="${it.uid}" style="border-left-color:${it.set?"#3ddc71":rm.color};">
        <span class="item-icon">${it.icon}</span>
        <div class="item-meta">
          <div class="item-name" style="color:${it.set?"#3ddc71":rm.color};">${it.name}${it.set?' <span class="set-badge">SET</span>':""}</div>
          <div class="item-stat">${rm.label} · +${Math.round(it.value*100)}% ${ITEM_TYPES[it.type].statLabel}</div>
          ${it.desc ? `<div class="item-desc">${it.desc}</div>` : ""}
          ${passiveTxt ? `<div class="item-passives">${passiveTxt}</div>` : ""}
          ${(!equipped && comparing) ? compareItemsHTML(classKey, it) : ""}
          <div class="vic-item-actions">
            <button data-sell="${it.uid}">Vender (+${SELL_VALUE[it.rarity]||10}o)</button>
            <button data-discard="${it.uid}">Descartar</button>
          </div>
        </div>
        <button data-equip="${it.uid}" class="${equipped?"equipped":""}">${equipped?"Equipado":"Equipar"}</button>
      </div>`;
    });
    html += '</div>';
  }

  html += `<button class="inv-debug-btn" id="inv-debug-gen" ${full?"disabled":""}>[Prueba] Generar objeto al azar — para testear sin esperar a derrotar un subjefe</button>`;

  panel.innerHTML = html;

  panel.querySelectorAll(".inv-card").forEach(card=>{
    card.addEventListener("click", (ev)=>{
      if(ev.target.closest("button")) return; // los botones tienen su propio manejador
      const uid = card.getAttribute("data-compare-toggle");
      compareOpenUid = (compareOpenUid===uid) ? null : uid;
      renderInventoryPanel();
    });
  });
  panel.querySelectorAll("[data-equip]").forEach(btn=>{
    btn.addEventListener("click", (ev)=>{
      ev.stopPropagation();
      equipItem(classKey, btn.getAttribute("data-equip"));
      refreshEquippedStats();
      compareOpenUid = null;
      renderInventoryPanel();
      renderStatsPanel();
    });
  });
  panel.querySelectorAll("[data-unequip]").forEach(btn=>{
    btn.addEventListener("click", (ev)=>{
      ev.stopPropagation();
      unequipItem(classKey, btn.getAttribute("data-unequip"));
      refreshEquippedStats();
      renderInventoryPanel();
      renderStatsPanel();
    });
  });
  panel.querySelectorAll("[data-sell]").forEach(btn=>{
    btn.addEventListener("click", (ev)=>{
      ev.stopPropagation();
      const uid = btn.getAttribute("data-sell");
      if(!confirm("¿Vender este objeto? No se puede deshacer.")) return;
      sellItem(classKey, uid);
      refreshEquippedStats();
      compareOpenUid = null;
      renderInventoryPanel();
      renderStatsPanel();
      renderSaveLine();
    });
  });
  panel.querySelectorAll("[data-discard]").forEach(btn=>{
    btn.addEventListener("click", (ev)=>{
      ev.stopPropagation();
      const uid = btn.getAttribute("data-discard");
      if(!confirm("¿Descartar este objeto sin recompensa? No se puede deshacer.")) return;
      discardItem(classKey, uid);
      refreshEquippedStats();
      compareOpenUid = null;
      renderInventoryPanel();
      renderStatsPanel();
    });
  });
  panel.querySelectorAll("[data-fuse]").forEach(btn=>{
    btn.addEventListener("click", (ev)=>{
      ev.stopPropagation();
      handleFuseClick(classKey, btn.getAttribute("data-fuse"));
      refreshEquippedStats();
      renderInventoryPanel();
      renderStatsPanel();
    });
  });
  const dbg = document.getElementById("inv-debug-gen");
  if(dbg) dbg.addEventListener("click", ()=>{
    const type = rollItemType(classKey);
    const rarity = RARITIES[Math.floor(Math.random()*RARITIES.length)];
    const item = makeItem(type, rarity, classKey);
    addItemToInventory(classKey, item);
    renderInventoryPanel();
  });
}

// Fase 4: pestaña "Estadísticas" — desglosa base del campeón vs. bonus de objetos equipados.
function renderStatsPanel(){
  const panel = document.getElementById("stats-panel");
  if(!panel || !player) return;
  const classKey = player.classKey;
  const cls = CLASSES[classKey];
  const champ = save.champions[classKey];
  const lvl = champ.level;
  const baseDmgNoItem = cls.baseDmg + (lvl-1)*0.95;
  const baseHpVal = Math.round(cls.baseHP + (lvl-1)*7.5);
  const weapon = equippedItem(classKey, "arma");
  const helmet = equippedItem(classKey, "casco");
  const shieldIt = equippedItem(classKey, "escudo");
  const full = computePlayerStats(classKey); // ya incluye reliquias + bonus de objetos
  const shieldAmount = Math.round(full.hp * (full.shieldPct||0));

  panel.innerHTML = `
    <div class="stat-block">
      <div class="stat-block-title">Daño</div>
      <div class="stat-row"><span>Base (Nv. ${lvl})</span><b>${Math.round(baseDmgNoItem)}</b></div>
      <div class="stat-row highlight"><span>Arma equipada</span><b>${weapon ? `+${Math.round(weapon.value*100)}% — ${weapon.name}` : "sin equipar"}</b></div>
      <div class="stat-row total"><span>Daño final</span><b>${Math.round(full.dmg)}</b></div>
    </div>
    <div class="stat-block">
      <div class="stat-block-title">Vida y escudo</div>
      <div class="stat-row"><span>Vida máxima</span><b>${baseHpVal}</b></div>
      <div class="stat-row highlight"><span>Casco equipado</span><b>${helmet ? `+${Math.round(helmet.value*100)}% — ${helmet.name}` : "sin equipar"}</b></div>
      <div class="stat-row highlight"><span>Escudo equipado</span><b>${shieldIt ? `+${Math.round(shieldIt.value*100)}% — ${shieldIt.name}` : "sin equipar"}</b></div>
      <div class="stat-row total"><span>Escudo permanente</span><b>${shieldAmount}</b></div>
    </div>
    <div class="stat-block">
      <div class="stat-block-title">Otros</div>
      <div class="stat-row"><span>Defensa</span><b>${Math.round(full.def*100)}%</b></div>
      <div class="stat-row"><span>Velocidad</span><b>${Math.round(full.speed)}</b></div>
      <div class="stat-row"><span>Puntos de talento disponibles</span><b>${champ.talentPoints}</b></div>
    </div>
    ${classKey==="musashi" ? renderMusashiRoninStatsBlock(player) : ""}`;
}
// Bloque propio de Musashi en Estadísticas (sección 26): progresión INTRAPARTIDA, se reinicia
// cada partida nueva -por eso lee directo de player.stats.duelVictories, no de `save`-.
function renderMusashiRoninStatsBlock(h){
  const v = (h.stats && h.stats.duelVictories) || 0;
  const dmgPct = Math.round(v*5);
  const critPct = Math.round(musashiRoninCritChanceBonus(v)*1000)/10;
  const critDmgPct = Math.round(v*10);
  return `<div class="stat-block">
      <div class="stat-block-title">Senda del Rōnin</div>
      <div class="stat-row"><span>Victorias de Duelo</span><b>${v}</b></div>
      <div class="stat-row"><span>Daño acumulado</span><b>+${dmgPct}%</b></div>
      <div class="stat-row"><span>Probabilidad crítica acumulada</span><b>+${critPct}%</b></div>
      <div class="stat-row"><span>Daño crítico acumulado</span><b>+${critDmgPct}%</b></div>
    </div>`;
}

/* ============================================================
   FASE 2 — EVALUACIÓN DE DESEMPEÑO POR ROL + GENERADOR DE RECOMPENSAS
   ============================================================
   Cadena de responsabilidad, tal como pide el diseño:
     DESEMPEÑO (stats acumuladas durante la partida, ver hero.stats)
       -> PUNTUACIÓN (computeRoleScore: normalizada 0-100, distinta fórmula por rol)
         -> GENERADOR DE RECOMPENSAS (generateReward: la puntuación solo influye en
            las PROBABILIDADES de rareza; nunca la garantiza)
   Cada paso es independiente del siguiente: se puede cambiar la fórmula de puntaje sin
   tocar el generador de recompensas, y viceversa.
   ============================================================ */

// Suma curación (bruta y efectiva) y detecta si el objetivo estaba en peligro (<35% vida)
// y quedó a salvo: eso cuenta como "aliado salvado" para el puntaje del Curador.
function trackHeal(caster, target, amount){
  if(!caster || !caster.stats || !target) return;
  const before = target.hp;
  const after = Math.min(target.maxHp, before + amount);
  const restored = Math.max(0, after - before);
  caster.stats.healDone += amount;
  caster.stats.healEffective += restored;
  const danger = target.maxHp*0.35;
  if(before < danger && after >= danger) caster.stats.alliesSaved++;
}
// Aplica una curación de "amount" a target y, si quien cura tiene el talento correspondiente
// (overheal_shield_pct: Sanadora/Segador/Sanadora-Profeta), convierte lo que se hubiera
// desperdiciado por estar ya en vida máxima en un escudo para el objetivo -mismo criterio que
// ya usa el robo de vida del propio golpeador, ver damageEnemy-.
function applyHealOverheal(caster, target, amount){
  const before = target.hp;
  target.hp = Math.min(target.maxHp, target.hp + amount);
  const overheal = amount - (target.hp-before);
  if(overheal>0 && caster.classKey){
    const shieldPct = passiveSum(caster.classKey, "overheal_shield_pct");
    if(shieldPct>0) target.shield = Math.min(target.maxHp*0.5, (target.shield||0) + overheal*shieldPct);
  }
}
// Cada ~1s, si el Tanque tiene 2+ enemigos cerca, suma un "tick" de presencia/control de área.
function sampleTankPresence(h, dt){
  if(h.classKey!=="tanque") return;
  h.stats.statSampleTimer -= dt;
  if(h.stats.statSampleTimer>0) return;
  h.stats.statSampleTimer = 1000;
  let nearby = 0;
  for(const e of enemies){ if(e.alive && distance(h,e)<170) nearby++; }
  if(nearby>=2) h.stats.presenceTicks++;
}
// Devuelve un puntaje 0-100 normalizado para un héroe según la fórmula de su rol.
function computeRoleScore(hero){
  const cfg = SCORE_CONFIG[hero.classKey];
  if(!cfg || !hero.stats) return 0;
  let total = 0;
  for(const c of cfg){
    const raw = hero.stats[c.stat] || 0;
    total += Math.min(1, raw/c.ref) * c.weight;
  }
  return Math.round(total*100);
}
function rollRarity(score){
  const t = Math.max(0, Math.min(1, (score||0)/100));
  const weights = {};
  let total = 0;
  RARITIES.forEach(r=>{
    weights[r] = RARITY_WEIGHTS_LOW[r]*(1-t) + RARITY_WEIGHTS_HIGH[r]*t;
    total += weights[r];
  });
  let roll = Math.random()*total;
  for(const r of RARITIES){ roll -= weights[r]; if(roll<=0) return r; }
  return RARITIES[0];
}
function rollItemType(classKey){
  const w = CHAMP_ITEM_AFFINITY[classKey];
  const fallback = {arma:1/6,escudo:1/6,casco:1/6,pechera:1/6,guantes:1/6,botas:1/6};
  const weights = w || fallback;
  let roll = Math.random();
  for(const type of EQUIP_SLOT_TYPES){
    roll -= weights[type];
    if(roll<=0) return type;
  }
  return "arma";
}
// Legendario/Mítico: en vez de una fórmula procedural ("Espada legendaria +50%"), se elige
// entre los objetos DISEÑADOS a mano de esa rareza (sección 12) -si por algún motivo no hay
// ninguno disponible para el campeón+rareza+tipo pedido, cae de vuelta a lo procedural para
// nunca dejar al jugador sin recompensa-.
function rollDesignedItem(classKey, rarity, preferredType){
  const pool = designedItemsFor(classKey).filter(d=>d.rarity===rarity);
  if(!pool.length) return null;
  const sameType = pool.filter(d=>d.type===preferredType);
  const chosen = (sameType.length ? sameType : pool)[Math.floor(Math.random()*(sameType.length?sameType.length:pool.length))];
  return makeDesignedItem(chosen.id);
}
// Une los pasos: puntaje -> rareza (con azar) -> tipo relevante para el campeón -> objeto
// (diseñado a mano si es legendario/mítico, procedural si es común/raro/muy raro).
function generateReward(classKey, score){
  const rarity = rollRarity(score);
  const type = rollItemType(classKey);
  if(rarity==="legendario" || rarity==="mitico"){
    const designed = rollDesignedItem(classKey, rarity, type);
    if(designed) return designed;
  }
  return makeItem(type, rarity, classKey);
}

function freshRunStats(){
  // Demo: daño de todos los héroes +10% (multiplicador global, fácil de revertir a 1 después)
  return { dmgMult:1.10, hpMult:1, speedMult:1, cdMult:1, lifesteal:0, energyRegenMult:1, critChance:0.04, critMult:1.8, defBonus:0, potionRateMult:1 };
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

/* ============================================================
   MENU: champion select
   ============================================================ */
function renderChampGrid(){
  const grid = document.getElementById("champ-grid");
  grid.innerHTML = "";
  Object.keys(CLASSES).forEach(key=>{
    const cls = CLASSES[key];
    const champ = save.champions[key];
    const card = document.createElement("div");
    card.className = "champ-card" + (key===selectedClass ? " selected":"");
    card.innerHTML = `
      <canvas class="champ-preview" width="104" height="104" style="background:${cls.color}22;" data-class-key="${key}"></canvas>
      <div class="champ-name">${cls.name}</div>
      <div class="champ-role">${cls.role}</div>
      <div class="champ-lvl">Nv. ${champ.level}</div>
    `;
    card.addEventListener("click", ()=>{ selectedClass = key; renderChampGrid(); });
    grid.appendChild(card);
  });
  startChampPreviewLoop();
}
// Previsualización animada de cada campeón en la grilla de selección: en vez de un ícono
// fijo, dibuja al personaje real de costado (mirando a la derecha) con su propio ciclo de
// caminata, reusando el mismo arte/atlas que se ve en la partida -no un dibujo aparte-.
// Para eso se pisa momentáneamente la variable global `ctx` (el resto del juego dibuja
// siempre sobre el canvas principal) para que apunte al canvas chiquito de la tarjeta.
let champPreviewLoopRunning = false;
function drawChampionPreviewFrame(cvs, key){
  const cls = CLASSES[key];
  if(!cls) return;
  const pctx = cvs.getContext("2d");
  pctx.clearRect(0,0,cvs.width,cvs.height);
  const fake = {
    x: cvs.width/2, y: cvs.height*0.86, fx:1, fy:0, moving:true,
    animT: performance.now()%100000, attackAnim:0, hurtTimer:0,
    classKey:key, cls, scale:2.0, radius:24,
    colossalTimer:0, growTimer:0, spinTimer:0, stealthTimer:0
  };
  const saved = ctx;
  ctx = pctx;
  try{
    if(key==="mago") drawMagoAtlas(fake, 2.0, 1);
    else if(key==="soporte") drawSoporteAtlas(fake, 2.0, 1);
    else if(key==="segador") drawSegadorReal(fake, 2.0, 1);
    else if(key==="axiom") drawAxiomReal(fake, 2.0, 1);
    else if(key==="profeta") drawProfetaAtlas(fake, 2.0, 1);
    else if(key==="musashi" && drawMusashiReal(fake, 2.0, 1)){
      // Musashi: vista previa con su sprite real (idle), igual que en partida.
    }
    else if(key==="cazadora" && drawSylvaReal(fake, 2.0, 1)){
      // Sylva: vista previa con su sprite real (idle), igual que en partida.
    }
    else if(key==="nigromante" && drawNigromanteReal(fake, 2.0, 1)){
      // Nigromante: vista previa con su sprite real (idle), igual que en partida.
    }
    else if(DIR_ATLASES[key]) drawDirAtlasHero(DIR_ATLASES[key], fake, 2.0, 1);
    else {
      // Campeones sin atlas de bitmap propio usan el sprite procedural genérico (GRIDS/PAL,
      // ver buildSprites) -mismo camino que ya usa drawHero() para la partida real-. BUG real
      // encontrado en testing: buildSprites()
      // hasta ahora solo se llamaba de forma perezosa desde startRun(), así que en la
      // PRIMERA visita a la pantalla de selección (antes de arrancar cualquier partida)
      // SPRITES todavía no existía y la vista previa quedaba en negro. Mismo guard perezoso
      // que ya usa startRun(), disparado acá también.
      if(!SPRITES[key]) buildSprites();
      const img = heroFrame(fake);
      if(img){
        drawOutline(SPRITES[key], fake.x, fake.y, 2.0, false);
        drawSprite(img, fake.x, fake.y, 2.0, false);
      }
    }
  } finally {
    ctx = saved;
  }
}
function startChampPreviewLoop(){
  if(champPreviewLoopRunning) return;
  champPreviewLoopRunning = true;
  function tick(){
    const grid = document.getElementById("champ-grid");
    if(!grid || grid.offsetParent===null){ champPreviewLoopRunning = false; return; }
    grid.querySelectorAll(".champ-preview").forEach(cvs=>{
      drawChampionPreviewFrame(cvs, cvs.dataset.classKey);
    });
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
function renderSaveLine(){
  const totalRelics = Object.values(save.relics).reduce((a,b)=>a+b,0);
  document.getElementById("save-line").innerHTML =
    `Oro: <b>${save.gold}</b> &nbsp;·&nbsp; Reliquias permanentes: <b>${totalRelics}</b><br>El progreso se intenta guardar solo en este dispositivo/navegador — si lo abrís desde otro lugar (u otro navegador no lo conserva), usá el código de guardado de abajo.`;
}

function updateAbilityButtons(){
  const cls = CLASSES[selectedClass];
  const map = [["btn-s1",cls.skills[0]], ["btn-s2",cls.skills[1]], ["btn-s3",cls.skills[2]], ["btn-ult",cls.ultimate]];
  map.forEach(([id, sk])=>{
    const el = document.getElementById(id);
    if(!el) return;
    const icoEl = el.querySelector(".ico");
    const labelEl = el.querySelector("div:last-child");
    if(icoEl) icoEl.textContent = sk.ico;
    if(labelEl && id!=="btn-ult") labelEl.textContent = sk.name.split(" ")[0];
    el.title = sk.name + " — " + sk.desc;
  });
}

function beginLevel(){
  runWave = 1;
  levelDuration = 22000 + runLevel*2600;
  levelTimer = 0;
  spawnTimer = 0;
  bossActive = false;
  boss = null;
  midBossSpawned = false;
  activeChampion = null;
  showBanner(runLevel===LEVEL_COUNT ? "NIVEL 10 — EL JEFE DESPIERTA" : `NIVEL ${runLevel}`);
}
let midBossSpawned = false;
let activeChampion = null; // subjefe/jefe activo: mientras exista, se detiene la aparición normal de monstruos

/* ============================================================
   INPUT: joystick + buttons
   ============================================================ */
const joyBase = document.getElementById("joy-base");
const joyKnob = document.getElementById("joy-knob");
const joyZone = document.getElementById("joyzone");
let joyActive=false, joyId=null, joyVec={x:0,y:0};
const JOY_MAX = 36;
const JOY_CENTER = 25; // (92-42)/2: centra el knob dentro de la base más chica

function joyCenter(){
  const r = joyBase.getBoundingClientRect();
  return {x:r.left+r.width/2, y:r.top+r.height/2};
}
joyZone.addEventListener("pointerdown", e=>{
  joyActive = true; joyId = e.pointerId;
  updateJoy(e);
  joyZone.setPointerCapture(e.pointerId);
});
joyZone.addEventListener("pointermove", e=>{ if(joyActive && e.pointerId===joyId) updateJoy(e); });
function endJoy(e){ if(e.pointerId===joyId){ joyActive=false; joyId=null; joyVec={x:0,y:0}; joyKnob.style.transform=`translate(${JOY_CENTER}px,${JOY_CENTER}px)`; } }
joyZone.addEventListener("pointerup", endJoy);
joyZone.addEventListener("pointercancel", endJoy);

function updateJoy(e){
  const c = joyCenter();
  let dx = e.clientX-c.x, dy = e.clientY-c.y;
  const dist = Math.hypot(dx,dy);
  const clamped = Math.min(dist, JOY_MAX);
  const ang = Math.atan2(dy,dx);
  const kx = Math.cos(ang)*clamped, ky = Math.sin(ang)*clamped;
  joyKnob.style.transform = `translate(${JOY_CENTER+kx}px,${JOY_CENTER+ky}px)`;
  joyVec = { x: clamped/JOY_MAX*Math.cos(ang), y: clamped/JOY_MAX*Math.sin(ang) };
}

function bindAbilityButton(el, handler){
  el.addEventListener("pointerdown", e=>{ e.preventDefault(); handler(); });
}
bindAbilityButton(document.getElementById("btn-basic"), ()=> triggerBasic(player));
bindAbilityButton(document.getElementById("btn-s1"), ()=> {
  // Sylva — Flecha Perforante se dispara al soltar el botón (ver listeners de carga más abajo),
  // no al apretarlo: para ella este disparo instantáneo genérico queda anulado.
  if(player.classKey==="cazadora" && player.cls.skills[0].kind==="piercing_shot") return;
  useSkill(0);
});
bindAbilityButton(document.getElementById("btn-s2"), ()=> useSkill(1));
bindAbilityButton(document.getElementById("btn-s3"), ()=> useSkill(2));
bindAbilityButton(document.getElementById("btn-ult"), ()=> useUltimate());

let basicHeld = false;
const basicBtn = document.getElementById("btn-basic");
basicBtn.addEventListener("pointerdown", ()=> basicHeld=true);
basicBtn.addEventListener("pointerup", ()=> basicHeld=false);
basicBtn.addEventListener("pointercancel", ()=> basicHeld=false);

// Sylva — Flecha Perforante: única habilidad "mantener apretado para cargar" del juego, así que
// se resuelve con un listener dedicado sobre el mismo botón #btn-s1 en vez de generalizar
// bindAbilityButton para todos los campeones (ver useSylvaPiercingShot).
const s1Btn = document.getElementById("btn-s1");
function sylvaChargeStart(e){
  if(player.classKey!=="cazadora" || !player.alive || state!=="playing") return;
  const sk = player.cls.skills[0];
  if(sk.kind!=="piercing_shot") return;
  if(player.cds[0]>0 || player.energy < sk.cost) return;
  e.preventDefault();
  player.sylvaCharging = true;
  player.sylvaChargeTimer = 0;
}
function sylvaChargeRelease(){
  if(player.classKey!=="cazadora" || !player.sylvaCharging) return;
  player.sylvaCharging = false;
  useSylvaPiercingShot(player, player.sylvaChargeTimer);
  player.sylvaChargeTimer = 0;
}
s1Btn.addEventListener("pointerdown", sylvaChargeStart);
s1Btn.addEventListener("pointerup", sylvaChargeRelease);
s1Btn.addEventListener("pointercancel", sylvaChargeRelease);

/* ---- Botón dedicado de revivir (cerca de las habilidades) ---- */
const REVIVE_BTN_HOLD_MS = 1300; // demo: 1.3s en vez de 2s
let reviveBtnHoldRaf = null, reviveBtnHoldStart = 0, reviveBtnTarget = null;
function nearestDownedAlly(){
  if(divinaMode) return null; // la muerte es definitiva en el asedio: nadie revive a nadie
  let best = null, bestD = Infinity;
  for(const a of allies){
    if(a.alive) continue;
    const d = distance(player, a);
    if(d < REVIVE_RANGE && d < bestD){ bestD = d; best = a; }
  }
  return best;
}
function stopReviveBtnHold(){
  if(reviveBtnHoldRaf) cancelAnimationFrame(reviveBtnHoldRaf);
  reviveBtnHoldRaf = null;
  const btn = document.getElementById("btn-revive");
  if(btn){
    btn.dataset.holding = "0";
    btn.classList.remove("holding");
    const ico = btn.querySelector(".ico");
    if(ico) ico.textContent = "✚";
  }
  reviveBtnTarget = null;
}
function reviveBtnTick(){
  if(!reviveBtnTarget || reviveBtnTarget.alive || distance(player, reviveBtnTarget) >= REVIVE_RANGE){ stopReviveBtnHold(); return; }
  const elapsed = performance.now() - reviveBtnHoldStart;
  const btn = document.getElementById("btn-revive");
  const ico = btn ? btn.querySelector(".ico") : null;
  if(ico) ico.textContent = Math.ceil((REVIVE_BTN_HOLD_MS-elapsed)/1000)+"s";
  if(elapsed >= REVIVE_BTN_HOLD_MS){
    stopReviveBtnHold();
    tryReviveAlly(reviveBtnTarget);
    return;
  }
  reviveBtnHoldRaf = requestAnimationFrame(reviveBtnTick);
}
const reviveBtn = document.getElementById("btn-revive");
reviveBtn.addEventListener("pointerdown", (ev)=>{
  ev.stopPropagation();
  const target = nearestDownedAlly();
  if(!target) return;
  reviveBtnTarget = target;
  reviveBtnHoldStart = performance.now();
  reviveBtn.dataset.holding = "1";
  reviveBtn.classList.add("holding");
  reviveBtnHoldRaf = requestAnimationFrame(reviveBtnTick);
});
["pointerup","pointercancel","pointerleave"].forEach(evt=>{
  reviveBtn.addEventListener(evt, (ev)=>{ ev.stopPropagation(); stopReviveBtnHold(); });
});
// Muestra/oculta el botón según si hay algún aliado caído al alcance ahora mismo
function updateReviveBtn(){
  const btn = document.getElementById("btn-revive");
  if(!btn) return;
  const hasTarget = !!nearestDownedAlly();
  btn.classList.toggle("ready", hasTarget);
  if(!hasTarget && btn.dataset.holding==="1") stopReviveBtnHold();
}

document.getElementById("pause-btn").addEventListener("click", ()=>{
  if(state==="playing"){ setState("paused"); renderMasteryPanel(); renderTalentsPanel(); renderInventoryPanel(); renderStatsPanel(); }
});
document.getElementById("resume-btn").addEventListener("click", ()=> setState("playing"));
document.getElementById("quit-btn").addEventListener("click", ()=>{
  if(divinaMode){
    divinaMode = false;
    setState("divina");
    return;
  }
  if(!confirm("¿Abandonar la arena? Vas a perder el 50% de la XP acumulada del campeón y el 50% de tu oro, igual que si perdieras.")) return;
  applyArenaFailurePenalty(player.classKey);
  setState("menu"); renderChampGrid(); renderSaveLine();
});
document.querySelectorAll(".pause-tab").forEach(tab=>{
  tab.addEventListener("click", ()=>{
    document.querySelectorAll(".pause-tab").forEach(t=>t.classList.remove("active"));
    tab.classList.add("active");
    const which = tab.dataset.tab;
    document.getElementById("mastery-panel").classList.toggle("hidden", which!=="skills");
    document.getElementById("talents-panel").classList.toggle("hidden", which!=="talents");
    document.getElementById("inventory-panel").classList.toggle("hidden", which!=="inventory");
    document.getElementById("stats-panel").classList.toggle("hidden", which!=="stats");
    if(which==="talents") renderTalentsPanel();
    if(which==="inventory") renderInventoryPanel();
    if(which==="stats") renderStatsPanel();
  });
});

/* ============================================================
   SCREEN / STATE MANAGEMENT
   ============================================================ */
const screens = {
  title: document.getElementById("title-screen"),
  mainmenu: document.getElementById("mainmenu-screen"),
  gallery: document.getElementById("gallery-screen"),
  champdetail: document.getElementById("champdetail-screen"),
  shop: document.getElementById("shop-screen"),
  modeselect: document.getElementById("modeselect-screen"),
  divina: document.getElementById("divina-screen"),
  arenaselect: document.getElementById("arenaselect-screen"),
  menu: document.getElementById("menu-screen"),
  prep: document.getElementById("prep-screen"),
  buff: document.getElementById("buffscreen"),
  gameover: document.getElementById("gameover-screen"),
  victory: document.getElementById("victory-screen"),
  paused: document.getElementById("pause-screen")
};
function setState(s){
  state = s;
  Object.values(screens).forEach(el=>el.classList.add("hidden"));
  const hud = document.getElementById("hud");
  const controls = document.getElementById("controls");
  const pauseBtn = document.getElementById("pause-btn");
  const muteBtn = document.getElementById("mute-btn");
  if(s==="playing"){
    hud.classList.remove("hidden"); controls.classList.remove("hidden"); pauseBtn.classList.remove("hidden");
    if(muteBtn) muteBtn.classList.remove("hidden");
  } else {
    if(s!=="paused"){ /* keep hud hidden on real exit states below */ }
    hud.classList.add("hidden"); controls.classList.add("hidden"); pauseBtn.classList.add("hidden");
    if(muteBtn) muteBtn.classList.add("hidden");
    if(screens[s]) screens[s].classList.remove("hidden");
  }
}

/* ============================================================
   MENU BUTTONS
   ============================================================ */
// Los navegadores exigen un gesto humano para dejar sonar audio — no hay forma de saltear
// eso desde el código. Para no depender de que el toque justo caiga en un botón puntual,
// se engancha al primerísimo toque/click en CUALQUIER parte de la pantalla, apenas se abre
// el juego (funciona una sola vez; "once:true" saca el listener solo después de usarlo).
document.addEventListener("pointerdown", startMusic, {once:true, capture:true});
document.addEventListener("touchstart", startMusic, {once:true, capture:true});
document.addEventListener("click", startMusic, {once:true, capture:true});
document.getElementById("title-continue-btn").addEventListener("click", ()=>{
  startMusic();
  setState("mainmenu");
  renderMainMenu();
});
document.getElementById("mute-btn").addEventListener("click", ()=>{
  setAudioEnabled(!audioEnabled);
});
document.getElementById("mainmenu-jugar-btn").addEventListener("click", ()=>{
  setState("modeselect");
});
document.getElementById("mainmenu-back-btn").addEventListener("click", ()=>{
  setState("title");
});
document.getElementById("mainmenu-campeones-btn").addEventListener("click", ()=>{
  setState("gallery"); renderGallery();
});
document.getElementById("mainmenu-tienda-btn").addEventListener("click", ()=>{
  setState("shop");
  document.getElementById("shop-gold-line").innerHTML = `Oro: <b>${save.gold}</b> &nbsp;·&nbsp; Gemas: <b>${save.gems||0}</b>`;
});
document.getElementById("shop-back-btn").addEventListener("click", ()=>{
  setState("mainmenu"); renderMainMenu();
});
document.getElementById("gallery-back-btn").addEventListener("click", ()=>{
  setState("mainmenu"); renderMainMenu();
});
document.getElementById("champdetail-back-btn").addEventListener("click", ()=>{
  setState("gallery"); renderGallery();
});
function renderMainMenu(){
  const el = document.getElementById("mainmenu-gold-line");
  if(el) el.innerHTML = `Oro: <b>${save.gold}</b> &nbsp;·&nbsp; Gemas: <b>${save.gems||0}</b>`;
}
// Galería de Campeones: recorre CHAMPION_CATALOG (no una lista fija en el HTML), así que
// agregar un campeón nuevo -bloqueado o no- no requiere tocar esta función.
function renderGallery(){
  const grid = document.getElementById("gallery-grid");
  if(!grid) return;
  grid.innerHTML = CHAMPION_CATALOG.map(c=>{
    const cls = CLASSES[c.id];
    const champ = save.champions[c.id];
    const locked = !champ.unlocked;
    return `<button class="gallery-card ${locked?"locked":""}" data-champ="${c.id}" style="color:${cls?cls.color:"#fff"};">
      ${locked ? '<span class="gallery-card-lock">🔒</span>' : ''}
      <div class="gallery-card-icon">${cls?cls.icon:"❓"}</div>
      <div class="gallery-card-name" style="color:var(--text);">${cls?cls.name:c.id}</div>
      <div class="gallery-card-role">${cls?cls.role:""}</div>
      ${locked
        ? `<div class="gallery-card-price">🔒 Precio: ${c.priceGold} oro</div>`
        : `<div class="gallery-card-lvl">Nv. ${champ.level}</div>`}
    </button>`;
  }).join("");
  grid.querySelectorAll(".gallery-card").forEach(card=>{
    card.addEventListener("click", ()=>{
      renderChampDetail(card.getAttribute("data-champ"));
      setState("champdetail");
    });
  });
}
// Ficha individual: si está bloqueado, muestra precio y botón funcional de desbloqueo real
// (descuenta oro de verdad y persiste); si no, muestra sus datos de progreso reales.
function renderChampDetail(champId){
  const body = document.getElementById("champdetail-body");
  if(!body) return;
  const catEntry = CHAMPION_CATALOG.find(c=>c.id===champId);
  const cls = CLASSES[champId];
  const champ = save.champions[champId];
  const locked = !champ.unlocked;
  let html = `
    <div class="cd-header">
      <div class="cd-icon" style="color:${cls.color};">${cls.icon}</div>
      <div>
        <div class="cd-title">${cls.name}</div>
        <div class="cd-role">${cls.role}</div>
      </div>
    </div>
    <div class="cd-section"><div class="cd-section-title">Historia</div>${catEntry.lore}</div>`;
  if(locked){
    const canAfford = save.gold >= catEntry.priceGold;
    html += `
      <div class="cd-section cd-unlock-box">
        <div>🔒 Campeón bloqueado</div>
        <div class="cd-unlock-price">${catEntry.priceGold} 🪙</div>
        ${canAfford
          ? `<button class="btn wide" id="cd-unlock-btn">Desbloquear</button>`
          : `<div style="font-size:0.72rem; color:var(--text-dim);">Tenés ${save.gold} oro — te faltan ${catEntry.priceGold-save.gold}.</div>`}
      </div>`;
  } else {
    const need = xpToNext(champ.level);
    html += `
      <div class="cd-section">
        <div class="cd-section-title">Progreso</div>
        <div class="cd-stat-row"><span>Nivel</span><b>${champ.level}</b></div>
        <div class="cd-stat-row"><span>XP</span><b>${champ.xp} / ${need}</b></div>
      </div>
      <div class="cd-section">
        <div class="cd-section-title">Estadísticas base</div>
        <div class="cd-stat-row"><span>Vida</span><b>${cls.baseHP}</b></div>
        <div class="cd-stat-row"><span>Daño</span><b>${cls.baseDmg}</b></div>
        <div class="cd-stat-row"><span>Velocidad</span><b>${cls.baseSpeed}</b></div>
      </div>
      <div class="cd-section">
        <div class="cd-section-title">Habilidades</div>
        ${cls.skills.map(s=>`<div class="cd-stat-row"><span>${s.ico} ${s.name}</span></div>`).join("")}
        <div class="cd-stat-row"><span>${cls.ultimate.ico} ${cls.ultimate.name} <i>(definitiva)</i></span></div>
      </div>
      <div class="cd-section">
        <div class="cd-section-title">Equipamiento</div>
        <div class="cd-stat-row"><span>⚔ Arma</span><b>${(equippedItem(champId,"arma")||{}).name||"—"}</b></div>
        <div class="cd-stat-row"><span>🪖 Casco</span><b>${(equippedItem(champId,"casco")||{}).name||"—"}</b></div>
        <div class="cd-stat-row"><span>🛡 Escudo</span><b>${(equippedItem(champId,"escudo")||{}).name||"—"}</b></div>
      </div>`;
  }
  body.innerHTML = html;
  const unlockBtn = document.getElementById("cd-unlock-btn");
  if(unlockBtn){
    unlockBtn.addEventListener("click", ()=>{
      if(save.gold < catEntry.priceGold) return;
      save.gold -= catEntry.priceGold;
      champ.unlocked = true;
      persist();
      renderChampDetail(champId);
    });
  }
}
document.getElementById("mode-arena-btn").addEventListener("click", ()=>{
  setState("arenaselect"); renderArenaGrid();
});
// DEMO: forzado a desbloqueada para poder probarla sin tener que ganarle antes a la
// Infernal cada vez. save.divineArenaUnlocked se sigue guardando de verdad igual (ver
// onBossDefeated) -no se perdió nada de esa lógica-, esto es solo un interruptor de
// exhibición: para la versión real, cambiar el "true" de acá por
// "ARENA_ORDER.every(a=>save.arenasCleared[a])".
function isDivinaUnlocked(){ return true; }
document.getElementById("divina-back-btn").addEventListener("click", ()=>{
  setState("arenaselect"); renderArenaGrid();
});
document.getElementById("divina-explore-btn").addEventListener("click", ()=>{
  startDivinaExploration();
});
document.getElementById("modeselect-back-btn").addEventListener("click", ()=>{
  setState("mainmenu"); renderMainMenu();
});
document.getElementById("arenaselect-back-btn").addEventListener("click", ()=>{
  setState("modeselect");
});
// Tarjetas de selección de arena: por ahora todas desbloqueadas (demo). isArenaUnlocked()
// ya deja el gancho listo para cuando haya que empezar a exigir progreso.
function renderArenaGrid(){
  const grid = document.getElementById("arena-grid");
  if(!grid) return;
  const normalCards = ARENA_ORDER.map(key=>{
    const a = ARENA_MODS[key];
    const unlocked = isArenaUnlocked(key);
    const selected = currentArena===key;
    return `<button class="arena-card ${selected?"selected":""} ${unlocked?"":"locked"}" data-arena="${key}" ${unlocked?"":"disabled"}>
      ${selected?'<span class="arena-card-badge">ELEGIDA</span>':""}
      <div class="arena-card-icon">${unlocked?a.icon:"🔒"}</div>
      <div class="arena-card-title">${a.label}</div>
      <div class="arena-card-desc">${unlocked?a.desc:"Todavía no desbloqueada."}</div>
    </button>`;
  }).join("");
  // Arena Divina: la más difícil de todas, va DESPUÉS de la Infernal en esta misma grilla
  // (no es un modo de juego separado por ahora) — se desbloquea al completar las 4 arenas
  // normales. isDivinaUnlocked() está forzado a true en la demo, ver esa función.
  const divinaUnlocked = isDivinaUnlocked();
  const divinaCard = `<button class="arena-card divina ${divinaUnlocked?"":"locked"}" data-arena="divina" ${divinaUnlocked?"":"disabled"}>
      <span class="arena-card-badge" style="color:#d9a8ff; border-color:#7a4fae; background:rgba(122,79,174,0.16);">LA MÁS DIFÍCIL</span>
      <div class="arena-card-icon">${divinaUnlocked?"👁":"🔒"}</div>
      <div class="arena-card-title">Arena Divina</div>
      <div class="arena-card-desc">${divinaUnlocked?"Asedio 4 contra 4: derribá las torres y el castillo enemigo antes que a los tuyos.":"Completá las 4 arenas para desbloquearla."}</div>
    </button>`;
  grid.innerHTML = normalCards + divinaCard;
  grid.querySelectorAll(".arena-card:not(.locked)").forEach(card=>{
    card.addEventListener("click", ()=>{
      const key = card.getAttribute("data-arena");
      if(key==="divina"){ setState("divina"); return; }
      currentArena = key;
      updateMenuBrandSub();
      setState("menu"); renderChampGrid(); renderSaveLine();
    });
  });
}
function updateMenuBrandSub(){
  const el = document.getElementById("menu-brand-sub");
  if(el) el.textContent = `HORDE SURVIVAL · ${(ARENA_MODS[currentArena]||{}).label||""}`.toUpperCase();
}
document.getElementById("start-btn").addEventListener("click", ()=>{
  setState("prep");
  renderPrepSummary();
});
document.getElementById("menu-back-btn").addEventListener("click", ()=>{
  setState("arenaselect"); renderArenaGrid();
});
document.getElementById("prep-back-btn").addEventListener("click", ()=>{
  setState("menu"); renderChampGrid(); renderSaveLine();
});
document.getElementById("prep-start-btn").addEventListener("click", ()=>{
  try{
    startRun(1);
  }catch(err){
    console.error("Error al arrancar la partida:", err);
    alert("No se pudo arrancar la partida:\n"+(err.message||err)+"\n\n"+(err.stack||"").split("\n").slice(0,4).join("\n"));
  }
});
// Pantalla breve antes de entrar a la arena: resumen del campeón elegido y su equipamiento
// actual, con la opción de volver atrás a elegir otro. Los objetos/preajustes de partida en
// sí se administran desde Pausa → Inventario, tal como ya existe.
function renderPrepSummary(){
  const box = document.getElementById("prep-summary");
  if(!box) return;
  const cls = CLASSES[selectedClass];
  const champ = save.champions[selectedClass];
  box.innerHTML = `
    <div class="prep-row">
      <div class="prep-icon" style="color:${cls.color};">${cls.icon}</div>
      <div>
        <div class="prep-title">${cls.name} — Nv. ${champ.level}</div>
        <div class="prep-sub">${cls.role}</div>
      </div>
    </div>`;
  renderPrepInventory();
}
let prepCompareOpenUid = null; // qué tarjeta tiene la comparación abierta, en esta pantalla
// Pestaña de equipamiento previa a entrar a la arena: mismo comportamiento que Pausa →
// Inventario (equipar/desequipar/comparar/vender/descartar), pero sobre selectedClass en vez
// de player.classKey, porque acá todavía no existe una partida en curso.
function renderPrepInventory(){
  const panel = document.getElementById("prep-inventory-panel");
  if(!panel) return;
  const classKey = selectedClass;
  const champ = save.champions[classKey];
  champ.inventory = champ.inventory || [];
  champ.equipment = Object.assign(mkEquipment(), champ.equipment||{});

  let html = renderEquipmentGridHTML(classKey, "prep-unequip");
  html += renderSetPanelHTML(classKey);

  const full = champ.inventory.length >= INVENTORY_CAPACITY;
  html += `<div class="inv-capacity">Inventario: ${champ.inventory.length}/${INVENTORY_CAPACITY}${full?" — lleno":""}</div>`;
  html += renderFusionHTML(classKey, "prep-fuse");

  if(!champ.inventory.length){
    html += '<div class="inv-empty">Todavía no tenés objetos para este campeón. Se obtienen al derrotar subjefes y al jefe final.</div>';
  } else {
    html += '<div class="inv-list">';
    champ.inventory.slice().reverse().forEach(it=>{
      const rm = RARITY_META[it.rarity];
      const equipped = champ.equipment[it.type] === it.uid;
      const passiveNames = it.passives.map(p=>p.name);
      if(it.mythicPassive) passiveNames.push("★ "+it.mythicPassive.name);
      const passiveTxt = passiveNames.join(", ");
      const comparing = prepCompareOpenUid === it.uid;
      html += `<div class="inv-card ${it.set?"set-item":""}" data-prep-compare="${it.uid}" style="border-left-color:${it.set?"#3ddc71":rm.color};">
        <span class="item-icon">${it.icon}</span>
        <div class="item-meta">
          <div class="item-name" style="color:${it.set?"#3ddc71":rm.color};">${it.name}${it.set?' <span class="set-badge">SET</span>':""}</div>
          <div class="item-stat">${rm.label} · +${Math.round(it.value*100)}% ${ITEM_TYPES[it.type].statLabel}</div>
          ${it.desc ? `<div class="item-desc">${it.desc}</div>` : ""}
          ${passiveTxt ? `<div class="item-passives">${passiveTxt}</div>` : ""}
          ${(!equipped && comparing) ? compareItemsHTML(classKey, it) : ""}
          <div class="vic-item-actions">
            <button data-prep-sell="${it.uid}">Vender (+${SELL_VALUE[it.rarity]||10}o)</button>
            <button data-prep-discard="${it.uid}">Descartar</button>
          </div>
        </div>
        <button data-prep-equip="${it.uid}" class="${equipped?"equipped":""}">${equipped?"Equipado":"Equipar"}</button>
      </div>`;
    });
    html += '</div>';
  }
  html += `<button class="inv-debug-btn" id="prep-debug-gen" ${full?"disabled":""}>[Prueba] Generar objeto al azar — para testear sin esperar a derrotar un subjefe</button>`;
  panel.innerHTML = html;

  panel.querySelectorAll(".inv-card").forEach(card=>{
    card.addEventListener("click", (ev)=>{
      if(ev.target.closest("button")) return;
      const uid = card.getAttribute("data-prep-compare");
      prepCompareOpenUid = (prepCompareOpenUid===uid) ? null : uid;
      renderPrepInventory();
    });
  });
  panel.querySelectorAll("[data-prep-equip]").forEach(btn=>{
    btn.addEventListener("click", (ev)=>{
      ev.stopPropagation();
      equipItem(classKey, btn.getAttribute("data-prep-equip"));
      prepCompareOpenUid = null;
      renderPrepSummary();
    });
  });
  panel.querySelectorAll("[data-prep-unequip]").forEach(btn=>{
    btn.addEventListener("click", (ev)=>{
      ev.stopPropagation();
      unequipItem(classKey, btn.getAttribute("data-prep-unequip"));
      renderPrepSummary();
    });
  });
  panel.querySelectorAll("[data-prep-sell]").forEach(btn=>{
    btn.addEventListener("click", (ev)=>{
      ev.stopPropagation();
      if(!confirm("¿Vender este objeto? No se puede deshacer.")) return;
      sellItem(classKey, btn.getAttribute("data-prep-sell"));
      prepCompareOpenUid = null;
      renderPrepSummary();
      renderSaveLine();
    });
  });
  panel.querySelectorAll("[data-prep-discard]").forEach(btn=>{
    btn.addEventListener("click", (ev)=>{
      ev.stopPropagation();
      if(!confirm("¿Descartar este objeto sin recompensa? No se puede deshacer.")) return;
      discardItem(classKey, btn.getAttribute("data-prep-discard"));
      prepCompareOpenUid = null;
      renderPrepSummary();
    });
  });
  panel.querySelectorAll("[data-prep-fuse]").forEach(btn=>{
    btn.addEventListener("click", (ev)=>{
      ev.stopPropagation();
      handleFuseClick(classKey, btn.getAttribute("data-prep-fuse"));
      renderPrepSummary();
    });
  });
  const prepDbg = document.getElementById("prep-debug-gen");
  if(prepDbg) prepDbg.addEventListener("click", ()=>{
    const type = rollItemType(classKey);
    const rarity = RARITIES[Math.floor(Math.random()*RARITIES.length)];
    const item = makeItem(type, rarity, classKey);
    addItemToInventory(classKey, item);
    renderPrepSummary();
  });
}
document.getElementById("retry-btn").addEventListener("click", ()=>{
  if(currentArena==="divina"){ startDivinaExploration(); return; }
  startRun(1);
});
document.getElementById("menu-btn-1").addEventListener("click", ()=>{
  if(currentArena==="divina"){ setState("divina"); return; }
  setState("menu"); renderChampGrid(); renderSaveLine();
});
document.getElementById("again-btn").addEventListener("click", ()=> startRun(1));
document.getElementById("menu-btn-2").addEventListener("click", ()=>{ setState("menu"); renderChampGrid(); renderSaveLine(); });

/* ============================================================
   AUDIO — música ambiental ORIGINAL (compuesta acá, sintetizada con Web Audio API;
   NO es una reproducción de ninguna pista existente) + efectos breves.
   Inspirada en el clima de "cuerda desafinada que se va afinando": cada nota del pad
   arranca unos centavos desafinada y converge a su tono real en un par de segundos,
   sobre un drone grave sostenido. Todo generado por osciladores, nada de audio grabado.
   ============================================================ */
let audioCtx = null, masterGain = null, musicGain = null, sfxGain = null;
let audioEnabled = true, musicStarted = false, musicLoopTimer = null, padOscs = [];
function initAudio(){
  if(audioCtx){
    if(audioCtx.state==="suspended") audioCtx.resume().catch(()=>{});
    return;
  }
  try{
    audioCtx = new (window.AudioContext||window.webkitAudioContext)();
    masterGain = audioCtx.createGain(); masterGain.gain.value = audioEnabled?1:0;
    masterGain.connect(audioCtx.destination);
    musicGain = audioCtx.createGain(); musicGain.gain.value = 0.32;
    musicGain.connect(masterGain);
    sfxGain = audioCtx.createGain(); sfxGain.gain.value = 0.55;
    sfxGain.connect(masterGain);
    // En iPhone/Safari (y algunos Android) el contexto arranca "suspendido" por política
    // del navegador: sin este resume() explícito, ningún sonido se escucha nunca, aunque
    // el código de arriba no tire ningún error. Tiene que llamarse durante el mismo toque
    // del usuario que crea el contexto, por eso va acá adentro.
    if(audioCtx.state==="suspended") audioCtx.resume().catch(()=>{});
  }catch(e){ console.error("No se pudo crear el audio:", e); audioCtx = null; }
}
function setAudioEnabled(on){
  audioEnabled = on;
  if(audioCtx && audioCtx.state==="suspended") audioCtx.resume().catch(()=>{});
  if(masterGain) masterGain.gain.setTargetAtTime(on?1:0, audioCtx.currentTime, 0.05);
  const btn = document.getElementById("mute-btn");
  if(btn) btn.textContent = on ? "🔊" : "🔇";
}
// Una "cuerda" que arranca desafinada y converge a su tono real en ~2.5s, como un
// instrumento acordándose en vivo. Se llama repetidas veces con variaciones (ver startMusic).
function playDetuneString(baseFreq, startDetuneCents, duration, delay){
  if(!audioCtx) return;
  const t0 = audioCtx.currentTime + (delay||0);
  const osc = audioCtx.createOscillator();
  osc.type = "sawtooth";
  const filt = audioCtx.createBiquadFilter();
  filt.type = "lowpass"; filt.frequency.value = 850; filt.Q.value = 0.6;
  const g = audioCtx.createGain();
  osc.connect(filt); filt.connect(g); g.connect(musicGain);
  const detuneMult = Math.pow(2, startDetuneCents/1200);
  osc.frequency.setValueAtTime(baseFreq*detuneMult, t0);
  osc.frequency.exponentialRampToValueAtTime(baseFreq, t0+2.3);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(0.45, t0+0.5);
  g.gain.linearRampToValueAtTime(0.22, t0+2.3);
  g.gain.linearRampToValueAtTime(0.0001, t0+duration);
  osc.start(t0); osc.stop(t0+duration+0.1);
}
function startMusic(){
  initAudio();
  if(!audioCtx){
    showBanner("🔇 El navegador bloqueó el audio");
    return;
  }
  // Diagnóstico visible: mostrar el estado real del audio ~400ms después de intentar
  // resumirlo (le da tiempo a resume() a resolver), para saber de verdad qué está pasando
  // en vez de seguir adivinando arreglos a ciegas.
  setTimeout(()=>{
    if(audioCtx.state==="running") showBanner("🔊 Audio activo");
    else showBanner("🔇 Audio: "+audioCtx.state+" (avisame este mensaje)");
  }, 400);
  if(musicStarted) return;
  musicStarted = true;
  const root = 55; // La grave, drone sostenido de fondo
  [root, root*1.5, root*2].forEach((f,i)=>{
    const osc = audioCtx.createOscillator();
    osc.type = "sine"; osc.frequency.value = f;
    const g = audioCtx.createGain(); g.gain.value = i===0 ? 0.09 : 0.04;
    osc.connect(g); g.connect(musicGain);
    osc.start(); padOscs.push(osc);
  });
  const notes = [220.00, 246.94, 261.63, 293.66]; // clima menor/frigio oscuro
  // Un solo track continuo: DOS voces de "cuerda desafinándose" que se van turnando sin
  // pausas entre sí (apenas una termina, ya hay otra sonando, a veces superpuestas), para
  // que la inquietud sea constante en vez de un evento esporádico cada tantos segundos.
  function cycleVoice(delayMs){
    if(!musicStarted) return;
    const n = notes[(Math.random()*notes.length)|0];
    const dur = 4.5 + Math.random()*2.5;
    playDetuneString(n, -65-Math.random()*45, dur, 0);
    if(Math.random()<0.35) playDetuneString(n*0.5, -50-Math.random()*30, dur+0.6, 0.4);
    musicLoopTimer = setTimeout(()=>cycleVoice(0), (dur*1000) - 900 + Math.random()*600);
  }
  cycleVoice(0);
  setTimeout(()=>cycleVoice(0), 2600); // segunda voz arrancando desfasada, para que se crucen
}
// Efectos breves, todos sintetizados (sin archivos de audio externos)
function playSfx(type){
  if(!audioCtx) return;
  const t0 = audioCtx.currentTime;
  if(type==="potion"){
    const osc = audioCtx.createOscillator(); const g = audioCtx.createGain();
    osc.type="sine"; osc.frequency.setValueAtTime(520,t0); osc.frequency.exponentialRampToValueAtTime(880,t0+0.18);
    g.gain.setValueAtTime(0.0001,t0); g.gain.linearRampToValueAtTime(0.35,t0+0.03); g.gain.exponentialRampToValueAtTime(0.0001,t0+0.22);
    osc.connect(g); g.connect(sfxGain); osc.start(t0); osc.stop(t0+0.25);
  } else if(type==="levelup" || type==="victory"){
    const notes = type==="victory" ? [392,523.25,659.25,783.99,1046.5] : [523.25,659.25,783.99,1046.5];
    notes.forEach((f,i)=>{
      const o=audioCtx.createOscillator(), gg=audioCtx.createGain();
      o.type="triangle"; o.frequency.value=f;
      gg.gain.setValueAtTime(0.0001,t0+i*0.1);
      gg.gain.linearRampToValueAtTime(0.3,t0+i*0.1+0.02);
      gg.gain.exponentialRampToValueAtTime(0.0001,t0+i*0.1+0.5);
      o.connect(gg); gg.connect(sfxGain); o.start(t0+i*0.1); o.stop(t0+i*0.1+0.52);
    });
  } else if(type==="cast"){
    const osc = audioCtx.createOscillator(); const g = audioCtx.createGain();
    const filt = audioCtx.createBiquadFilter(); filt.type="lowpass"; filt.frequency.value=1800;
    osc.type="sawtooth"; osc.frequency.setValueAtTime(260,t0); osc.frequency.exponentialRampToValueAtTime(520,t0+0.15);
    g.gain.setValueAtTime(0.0001,t0); g.gain.linearRampToValueAtTime(0.26,t0+0.02); g.gain.exponentialRampToValueAtTime(0.0001,t0+0.22);
    osc.connect(filt); filt.connect(g); g.connect(sfxGain); osc.start(t0); osc.stop(t0+0.24);
  } else if(type==="ult"){
    const osc = audioCtx.createOscillator(); const g = audioCtx.createGain();
    osc.type="sawtooth"; osc.frequency.setValueAtTime(85,t0); osc.frequency.exponentialRampToValueAtTime(42,t0+0.6);
    g.gain.setValueAtTime(0.0001,t0); g.gain.linearRampToValueAtTime(0.48,t0+0.08); g.gain.exponentialRampToValueAtTime(0.0001,t0+0.7);
    osc.connect(g); g.connect(sfxGain); osc.start(t0); osc.stop(t0+0.72);
  } else if(type==="hurt"){
    const osc = audioCtx.createOscillator(); const g = audioCtx.createGain();
    osc.type="square"; osc.frequency.setValueAtTime(160,t0); osc.frequency.exponentialRampToValueAtTime(50,t0+0.1);
    g.gain.setValueAtTime(0.32,t0); g.gain.exponentialRampToValueAtTime(0.0001,t0+0.13);
    osc.connect(g); g.connect(sfxGain); osc.start(t0); osc.stop(t0+0.14);
  } else if(type==="hit"){
    const osc = audioCtx.createOscillator(); const g = audioCtx.createGain();
    osc.type="triangle"; osc.frequency.setValueAtTime(320,t0); osc.frequency.exponentialRampToValueAtTime(90,t0+0.08);
    g.gain.setValueAtTime(0.22,t0); g.gain.exponentialRampToValueAtTime(0.0001,t0+0.09);
    osc.connect(g); g.connect(sfxGain); osc.start(t0); osc.stop(t0+0.1);
  } else if(type==="crit"){
    const osc = audioCtx.createOscillator(); const g = audioCtx.createGain();
    osc.type="sawtooth"; osc.frequency.setValueAtTime(500,t0); osc.frequency.exponentialRampToValueAtTime(180,t0+0.1);
    g.gain.setValueAtTime(0.3,t0); g.gain.exponentialRampToValueAtTime(0.0001,t0+0.12);
    osc.connect(g); g.connect(sfxGain); osc.start(t0); osc.stop(t0+0.13);
  }
}

function showBanner(text){
  const b = document.getElementById("center-banner");
  b.textContent = text;
  b.classList.remove("show"); void b.offsetWidth; b.classList.add("show");
}

function damageEnemy(e, amount, opts){
  opts = opts || {};
  const src = opts.src || player;
  let dmg = amount * (e.dmgTakenMult||1) * (e.curseDefTakenMult||1);
  // Cangrejo Acorazado (Arena Acuática): defensa frontal alta, muy vulnerable por detrás -e.fx/
  // e.fy ya apuntan hacia donde está mirando (su objetivo actual), así que compara contra eso
  // en vez de armar un sistema de facing nuevo-.
  if(e.type==="cangrejo_acorazado" && src){
    const cdx=e.x-src.x, cdy=e.y-src.y, cl=Math.hypot(cdx,cdy)||1;
    const facing = (cdx/cl)*(e.fx||0) + (cdy/cl)*(e.fy||0);
    if(facing > 0.4) dmg *= 0.4;
    else if(facing < -0.4) dmg *= 1.35;
  }
  // Kraken Joven (Arena Acuática): golpear al Kraken mientras tiene a alguien agarrado acorta
  // el agarre -"liberarse mediante daño", reusando el stunTimer del agarrado en vez de armar un
  // hitbox de tentáculo aparte-.
  if(e.type==="kraken_joven" && e.grabbedHero && e.grabbedHero.alive){
    e.grabbedHero.stunTimer = Math.max(0, (e.grabbedHero.stunTimer||0) - dmg*4);
  }
  // critChanceOverride/critMultOverride (Musashi): su probabilidad/daño crítico cambian golpe
  // a golpe según Concentración y Senda del Rōnin (ver musashiCombatMods), algo que el sistema
  // genérico runStats.critChance/critMult -fijo para toda la partida- no puede representar.
  // Sin overrides, el comportamiento de siempre queda idéntico.
  const critChance = opts.critChanceOverride!==undefined ? opts.critChanceOverride : runStats.critChance;
  const critMult = opts.critMultOverride!==undefined ? opts.critMultOverride : (runStats.critMult||1.8);
  const crit = opts.forceCrit || Math.random() < critChance;
  if(crit) dmg *= critMult;
  e.hp -= dmg;
  e.hitFlash = 90;
  if(src && src.stats){
    src.stats.dmgDealt += dmg;
    if(e.rank==="jefe" || e.rank==="subjefe") src.stats.dmgToBoss += dmg;
    if(!opts.fromBasic) src.stats.abilityHits = (src.stats.abilityHits||0)+1;
  }
  e.lastHitBy = src;
  if(src===player || Math.random()<0.35) floatText(e.x, e.y-20, Math.round(dmg), crit?"crit":null);
  if(src===player && (!player._hitSfxAt || performance.now()-player._hitSfxAt>90)){
    player._hitSfxAt = performance.now();
    playSfx(crit ? "crit" : "hit");
  }
  vfxHit(e, src, opts, crit);
  // Antes cargaba con el 10% del daño ya escalado por maestría/nivel/buffs, así que al final
  // de la partida (con el daño multiplicado varias veces) un solo golpe llenaba casi toda la
  // barra. Ahora se normaliza contra el daño BASE del propio héroe: siempre hacen falta más o
  // menos la misma cantidad de golpes para cargar la ulti, sin importar cuánto haya escalado.
  src.ultCharge = Math.min(src.ultMax, (src.ultCharge||0) + (dmg/Math.max(1,src.baseDmg))*2.6);
  if(opts.burn){ e.burnTimer = 2600; e.burnDmg = amount*0.12; }
  if(opts.bleed){ e.bleedTimer = opts.bleedDur||3000; e.bleedDmg = amount*0.16; }
  if(opts.slow){ e.slowTimer = opts.slowDur||2000; e.slowAmt = opts.slow; }
  if(opts.stun){ e.stunTimer = opts.stun; }
  if(opts.knockback){
    const ang = Math.atan2(e.y-src.y, e.x-src.x);
    e.x += Math.cos(ang)*46; e.y += Math.sin(ang)*46;
  }
  if(opts.pull){
    const ang = Math.atan2(src.y-e.y, src.x-e.x);
    e.x += Math.cos(ang)*36; e.y += Math.sin(ang)*36;
  }
  if(runStats.lifesteal>0 && opts.fromBasic){
    src.hp = Math.min(src.maxHp, src.hp + dmg*runStats.lifesteal);
  }
  const passiveLifesteal = (src.buffLifesteal||0) + (src.classKey ? passiveSum(src.classKey,"lifesteal_add") : 0);
  if(passiveLifesteal>0){
    const healAmt = dmg*passiveLifesteal, before = src.hp;
    src.hp = Math.min(src.maxHp, src.hp + healAmt);
    // Talento "exceso de curación -> escudo" (Segador/Sanadora): lo que el robo de vida no pudo
    // curar por estar ya en vida máxima se convierte en un escudo, en vez de perderse sin más.
    const overheal = healAmt - (src.hp-before);
    if(overheal>0 && src.classKey){
      const shieldPct = passiveSum(src.classKey, "overheal_shield_pct");
      if(shieldPct>0) src.shield = Math.min(src.maxHp*0.5, (src.shield||0) + overheal*shieldPct);
    }
  }
  if(src.buffBleedOnHit && opts.fromBasic){
    e.bleedTimer = Math.max(e.bleedTimer, 2400); e.bleedDmg = Math.max(e.bleedDmg||0, dmg*0.18);
  }
  // Pasiva "Descarga": probabilidad de electrocutar al golpear (objetos con effect:onhit_proc)
  if(src && src.classKey && opts.fromBasic){
    const procChance = passiveSum(src.classKey,"onhit_proc");
    if(procChance>0 && Math.random()<procChance){
      damageEnemy(e, dmg*0.6, {src, forceCrit:false});
      e.stunTimer = Math.max(e.stunTimer||0, 260);
      pushSpark("impacto", e.x, e.y, 50, 300);
    }
  }
  // Segador Olvidado: golpear también genera Furia (además de recibir daño, ver damageHero)
  if(src && src.classKey==="segador"){
    const genMult = src.furyArmorTimer>0 ? (src.furyGenMult||1) : 1;
    src.energy = Math.min(src.maxEnergy, src.energy + dmg*0.11*genMult);
  }
  // Sylva: cada golpe de básico contra el mismo objetivo suma Rastreo (Instinto de Caza,
  // sección 8) -se engancha acá en vez de en el punto de disparo porque su básico es un
  // proyectil que impacta más tarde, y este es el único lugar que ve el impacto real-.
  if(src && src.classKey==="cazadora"){
    if(opts.fromBasic) sylvaAddTrack(src, e, 1);
    // Cacería Salvaje: golpear a la Presa mientras dura la ultimate acorta el cooldown de las
    // 3 habilidades no-ultimate (Lobo Espectral incluido, ya que también llega con src=caster).
    if(src.wildHuntTimer>0 && src.huntTarget===e){
      const cdrAmt = CLASSES.cazadora.ultimate.cdrOnHit||0;
      for(let i=0;i<src.cds.length;i++) src.cds[i] = Math.max(0, (src.cds[i]||0)-cdrAmt);
    }
  }
  if(e.hp<=0 && e.alive){ killEnemy(e); }
}

function killEnemy(e){
  e.alive = false;
  // Nigromante — Plaga de los Condenados: el contagio al morir un maldito tiene que dispararse
  // sin importar QUÉ lo mató (antes solo se llamaba desde el tick de daño de la propia maldición,
  // así que un maldito rematado por un golpe normal -el caso más común en la práctica- nunca
  // contagiaba a nadie). Acá se dispara siempre, una sola vez, para cualquier causa de muerte.
  if(e.cursed) nigromantePlagueDeathSpread(e);
  // Musashi: si el que murió era la Marca de Duelo de alguien, hay que limpiarla siempre -
  // nunca debe quedar apuntando a un cadáver-. Si murió DENTRO de un Último Duelo activo con
  // él, es la condición de victoria real (Golpe de Gracia + Senda del Rōnin, ver
  // musashiHandleDuelWin/updateLastDuel); si no, es una marca perdida por una causa externa
  // (otro héroe lo remató primero) y simplemente se limpia sin recompensa.
  if(e.isDuelLocked && e.duelOwner && e.duelOwner.duelActive && e.duelOwner.duelOpponent===e){
    musashiHandleDuelWin(e.duelOwner, e);
  } else {
    for(const h of heroes){ if(h.duelTarget===e){ musashiClearMark(h); } }
  }
  // Sylva: si la Presa muere, la marca se limpia (sección 8, "cambiar de objetivo empieza un
  // nuevo Rastreo" -acá el cambio es forzado porque ya no hay a quién rastrear-).
  for(const h of heroes){ if(h.huntTarget===e){ sylvaClearTrack(h); } }
  kills++;
  if(e.rank==="subjefe") subjefesDefeated++;
  if(e.lastHitBy && e.lastHitBy.stats) e.lastHitBy.stats.kills++;
  if(e.lastHitBy && e.lastHitBy.classKey==="segador"){
    const seg = e.lastHitBy;
    // Último Aliento (pasivo): matar con poca vida recupera un poco de HP
    if(seg.hp < seg.maxHp*0.5){
      const healAmt = seg.maxHp*0.03;
      seg.hp = Math.min(seg.maxHp, seg.hp+healAmt);
      floatText(seg.x, seg.y-30, "+"+Math.round(healAmt), "heal");
    }
    // Segador de Almas (ulti): cada baja durante la ulti prolonga su duración
    if(seg.berserkTimer>0){
      seg.berserkTimer += seg.berserkExtendMs;
      seg.buffTimer += seg.berserkExtendMs;
    }
  }
  if(activeChampion === e) activeChampion = null;
  // Ahora la XP la gana quien dio el golpe final, sea el jugador o un aliado — así los
  // bots también suben de nivel durante la partida, simulando a otros jugadores.
  if(e.lastHitBy && e.lastHitBy.classKey){
    const leveledUp = grantXP(e.lastHitBy.classKey, e.xp);
    if(leveledUp && e.lastHitBy!==player) autoInvestTalentPoints(e.lastHitBy.classKey);
  } else {
    grantXP(player.classKey, e.xp);
  }
  if(Math.random()<0.6) grantGold(e.gold);
  if(e.dropsItem && Math.random()<0.42){
    const kinds = ["hp","dmg","def","vel"];
    grantRelic(kinds[Math.floor(Math.random()*kinds.length)]);
    floatText(e.x, e.y-40, "¡Objeto!", "heal");
  }
  // Pociones de vida
  let potionChance = 0.09;
  if(e.rank==="subelite") potionChance = 0.16;
  if(e.rank==="elite") potionChance = 0.30;
  if(e.rank==="subjefe") potionChance = 1.0;
  if(e.rank==="jefe") potionChance = 1.0;
  potionChance = Math.min(1, potionChance * (runStats.potionRateMult||1));
  if(Math.random() < potionChance){
    const n = (e.rank==="subjefe"||e.rank==="jefe") ? 3 : 1;
    for(let i=0;i<n;i++){
      potions.push({x:e.x+(Math.random()-0.5)*40, y:e.y+(Math.random()-0.5)*40, life:22000, phase:Math.random()*6, type:"heal"});
    }
  }
  // Pociones de energía/maná: caen con más frecuencia que las de vida, ya que ahora las
  // habilidades cuestan bastante más recurso.
  let manaPotionChance = Math.min(1, potionChance * 1.6);
  if(Math.random() < manaPotionChance){
    const n = (e.rank==="subjefe"||e.rank==="jefe") ? 3 : 1;
    for(let i=0;i<n;i++){
      potions.push({x:e.x+(Math.random()-0.5)*40, y:e.y+(Math.random()-0.5)*40, life:22000, phase:Math.random()*6, type:"mana"});
    }
  }
  if(e===boss){
    onBossDefeated();
  }
  // DEATH: si sigue muerto (un jefe con fases revive dentro de onBossDefeated), su propio
  // cuerpo hace la animación de muerte; si el pool está lleno, cae al "cadáver" de siempre.
  if(!e.alive && !vfxOnDeath(e) && inView(e.x, e.y, 100)){
    particles.push({x:e.x, y:e.y, life:420, maxLife:420, corpse:true, spriteType:e.type, scale:e.scale, flip:e.fx<-0.12});
  }
}

function damageHero(h, amount){
  if(!h || !h.alive) return;
  if(h.invulnTimer>0) return; // p.ej. la breve transición del Teletransporte de Axiom
  if(h.stats) h.stats.dmgTaken += amount; // daño bruto recibido, antes de mitigación/escudo
  const defBonus = (h===player) ? runStats.defBonus : 0;
  const passiveDef = h.classKey ? Math.min(0.5, passiveSum(h.classKey,"def_add")) : 0; // "Piel de Brasa"
  let dmg = amount * (1 - h.def) * (1 - defBonus) * (1-(h.buffDefMult?(1-h.buffDefMult):0)) * (1-passiveDef);
  if(h.shield>0){
    const absorbed = Math.min(h.shield, dmg);
    h.shield -= absorbed;
    dmg -= absorbed;
  }
  if(dmg>0 && h.itemShield>0){
    const absorbed = Math.min(h.itemShield, dmg);
    h.itemShield -= absorbed;
    dmg -= absorbed;
  }
  // Guardián Mítico: si el golpe deja el escudo en 0, genera un escudo de emergencia una vez
  // por partida (objetos con effect:mythic_emergency_shield).
  if(dmg>0 && h.shield<=0 && h.itemShield<=0 && !h.emergencyShieldUsed && h.classKey){
    const guardianVal = equippedPassives(h.classKey).filter(p=>p.effect==="mythic_emergency_shield").reduce((s,p)=>s+p.value,0);
    if(guardianVal>0){
      h.itemShield = h.maxHp*guardianVal;
      h.itemMaxShield = Math.max(h.itemMaxShield||0, h.itemShield);
      h.emergencyShieldUsed = true;
      const absorbed = Math.min(h.itemShield, dmg);
      h.itemShield -= absorbed; dmg -= absorbed;
      if(h===player) floatText(h.x, h.y-50, "¡ESCUDO DE EMERGENCIA!", "crit");
    }
  }
  h.hp -= dmg;
  // Historial de daño reciente (solo lo consume Destino Restaurado, de La Profeta): guarda
  // el daño YA mitigado, con timestamp, y se poda a los pocos segundos para no crecer sin
  // límite en partidas largas -ver el filtrado por ventana de tiempo en castAbility.
  if(dmg>0.5){
    if(!h.recentDamage) h.recentDamage = [];
    h.recentDamage.push({amount:dmg, t:performance.now()});
    if(h.recentDamage.length>20) h.recentDamage.shift();
  }
  if(dmg>0.5) h.hurtTimer = 160;
  if(dmg>0.5 && h===player && (!player._hurtSfxAt || performance.now()-player._hurtSfxAt>220)){
    player._hurtSfxAt = performance.now();
    playSfx("hurt");
  }
  // Segador Olvidado: recibir daño genera Furia (más si tiene activa la Armadura de la Furia)
  if(h.classKey==="segador" && amount>0.5){
    const furyMult = h.furyArmorTimer>0 ? 1.6 : 1;
    h.energy = Math.min(h.maxEnergy, h.energy + amount*0.16*furyMult);
    // Nivel 4 de la Armadura de la Furia: una parte del daño recibido se convierte en poder
    // ofensivo mientras la Furia esté activa (tope prudente para que no se descontrole).
    if(h.furyArmorTimer>0 && h.furyConvertPct>0){
      h.furyPower = Math.min(h.maxHp*0.4, (h.furyPower||0) + amount*h.furyConvertPct);
      h.buffDmgMult = Math.max(h.buffDmgMult||1, 1 + Math.min(0.35, h.furyPower/Math.max(1,h.maxHp)));
    }
  }
  if(dmg>0.5 && h.stormTimer>0){
    for(const e of enemies){
      if(!e.alive) continue;
      if(distance(h,e) <= 95) damageEnemy(e, h.baseDmg*runStats.dmgMult*0.6, {src:h, burn:true});
    }
    particles.push({x:h.x,y:h.y, life:300, ring:true, maxLife:300, maxR:80, color:"#ff6a3d"});
    for(let i=0;i<5;i++){
      const a = Math.random()*Math.PI*2;
      particles.push({x:h.x, y:h.y, vx:Math.cos(a)*60, vy:Math.sin(a)*60-10, life:260, color:"#ff8a3d"});
    }
  }
  if(dmg>0.5){
    if(h===player) floatText(h.x, h.y-30, "-"+Math.round(dmg));
    vfxBurst(h.x, h.y-20, 3, "blood", 80, 200, 3, h===player?2:1, -20, 0);
  }
  if(h.hp<=0){
    h.hp = 0;
    if(h===player){ onPlayerDeath(); }
    else {
      h.alive = false;
      showBanner(`${h.cls.name} ha caído`);
      for(let i=0;i<12;i++) particles.push({x:h.x,y:h.y, vx:(Math.random()-0.5)*160, vy:(Math.random()-0.5)*160, life:500, color:h.cls.color});
      if(h.isBossChamp) vfxOnDeath(h); // jefe divino (entidad tipo enemigo): muerte con su sprite
    }
  }
}
function nearestHeroTo(x, y){
  let best=null, bestD=Infinity;
  for(const h of heroes){
    if(!h.alive || h.stealthTimer>0) continue;
    const d = Math.hypot(h.x-x, h.y-y);
    if(d<bestD){ bestD=d; best=h; }
  }
  return best;
}
function nearestEnemyTo(ent, range){
  let best=null, bestD=Infinity;
  for(const e of enemies){
    if(!e.alive) continue;
    // Musashi: mientras un enemigo está adentro de un Último Duelo, nadie más que su propio
    // dueño puede "verlo" como objetivo -así ningún aliado/otro héroe intenta perseguirlo
    // hasta la arena de bolsillo, aislamiento real de la sección 15-.
    if(e.isDuelLocked && e.duelOwner!==ent) continue;
    const d = distance(ent,e);
    if(d<bestD && (!range||d<=range)){ bestD=d; best=e; }
  }
  return best;
}

/* ============================================================
   POCIONES DE VIDA
   ============================================================ */
function updatePotions(dt){
  for(const p of potions){
    p.life -= dt;
    p.phase += dt/240;
    for(const h of heroes){
      if(!h.alive) continue;
      if(p.type==="mana"){
        if(Math.hypot(h.x-p.x, h.y-p.y) < 46 && h.energy < h.maxEnergy){
          const amt = h.maxEnergy*0.4;
          h.energy = Math.min(h.maxEnergy, h.energy + amt);
          floatText(h.x, h.y-34, "+"+Math.round(amt), "heal");
          particles.push({x:p.x, y:p.y, life:300, ring:true, maxLife:300, maxR:38, color:"#7ec8ff"});
          p.life = 0;
          if(h===player) playSfx("potion");
          break;
        }
      } else if(Math.hypot(h.x-p.x, h.y-p.y) < 46 && h.hp < h.maxHp){
        const amt = h.maxHp*0.28;
        h.hp = Math.min(h.maxHp, h.hp + amt);
        floatText(h.x, h.y-34, "+"+Math.round(amt), "heal");
        particles.push({x:p.x, y:p.y, life:300, ring:true, maxLife:300, maxR:38, color:"#ff5f7a"});
        p.life = 0;
        if(h===player) playSfx("potion");
        break;
      }
    }
  }
  potions = potions.filter(p=>p.life>0);
}

function startBossFight(){
  bossActive = true;
  enemies = enemies.filter(e=>e.rank==="subjefe"); // deja en pie a cualquier campeón activo
  const bossType = currentArena==="hielo" ? "mago_hielo_cristal" : (currentArena==="bosque" ? "jinete_sin_cabeza" : (currentArena==="laberinto" ? "minotauro" : (currentArena==="acuatica" ? "leviatan" : "demonio_mayor")));
  boss = spawnEnemy(bossType, true);
  boss.hp = boss.maxHp = Math.round(ENEMY_BASE[bossType].hp * (1+ (save.champions[player.classKey].level)*0.01));
  boss.breathCd = 3800; boss.waveCd = 6500; boss.regenUsed = false; boss.regenTimer = 0;
  if(bossType==="mago_hielo_cristal"){
    boss.novaCd = 4000; boss.ventiscaCd = 6200; boss.armorCd = 8500; boss.armorTimer = 0; boss.skillAnim = null;
  }
  if(bossType==="leviatan"){
    // El Leviatán ronda el borde del escenario en vez de perseguir de cerca -"no necesita
    // entrar completamente en pantalla"- y ataca con embestidas/coletazos/oleadas telegrafiados.
    const spawnAng = Math.random()*Math.PI*2;
    boss.x = Math.cos(spawnAng)*LEVIATAN_ORBIT_R; boss.y = Math.sin(spawnAng)*LEVIATAN_ORBIT_R;
    boss.orbitAngle = spawnAng; boss.biteCd = 3400; boss.chargeCd = 8000; boss.tailCd = 6200; boss.waveCd2 = 9000;
    boss.acuaticaPhase = 1;
  }
  boss.bossPhase = 1;
  showBanner(currentArena==="hielo" ? "EL MAGO DE HIELO DESPIERTA" : (currentArena==="bosque" ? "EL JINETE SIN CABEZA DESPIERTA" : (currentArena==="laberinto" ? "EL MINOTAURO DESPIERTA" : (currentArena==="acuatica" ? "¡EL LEVIATÁN EMERGE DE LAS PROFUNDIDADES!" : "EL DEMONIO MAYOR DESPIERTA"))));
}

/* ============================================================
   BUFF CHOICE
   ============================================================ */
function openBuffChoice(){
  setState("buff");
  document.getElementById("buff-title").textContent = `Nivel ${runLevel} superado — elige un refuerzo`;
  const cards = document.getElementById("buff-cards");
  cards.innerHTML = "";
  const pool = [...BUFF_POOL].sort(()=>Math.random()-0.5).slice(0,3);
  pool.forEach(b=>{
    const el = document.createElement("div");
    el.className = "buff-card";
    el.innerHTML = `<div class="ico">${b.ico}</div><div class="buff-name">${b.name}</div><div class="buff-desc">${b.desc}</div>`;
    el.addEventListener("click", ()=>{
      b.apply(runStats);
      runLevel++;
      player.hp = Math.min(player.maxHp, player.hp + player.maxHp*0.25);
      player.energy = player.maxEnergy;
      beginLevel();
      setState("playing");
    });
    cards.appendChild(el);
  });
}

/* ============================================================
   END SCREENS
   ============================================================ */
function showGameOverScreen(divinaOutcome){
  setState("gameover");
  const title = document.getElementById("go-title");
  const retryBtn = document.getElementById("retry-btn");
  if(divinaMode || divinaOutcome){
    divinaMode = false;
    if(divinaOutcome==="victory"){
      title.textContent = "¡Castillo enemigo destruido!";
      title.style.color = "#7dffa0";
      retryBtn.textContent = `Seguir — Nivel ${divinaLevel}`;
      document.getElementById("go-stats").textContent = `Arena Divina · Nivel superado`;
      document.getElementById("go-progress").innerHTML =
        `<b style="color:#7dffa0;">¡VICTORIA! Tu equipo derribó las dos torres y el castillo enemigo.</b><br>La Arena Divina te espera en el Nivel ${divinaLevel}.`;
    } else if(divinaOutcome==="castle"){
      title.textContent = "Tu castillo ha caído";
      title.style.color = "#c62828";
      retryBtn.textContent = `Reintentar — Nivel ${divinaLevel}`;
      document.getElementById("go-stats").textContent = `Arena Divina · Nivel ${divinaLevel}`;
      document.getElementById("go-progress").innerHTML =
        `<b style="color:#ff8a6a;">Los 4 campeones divinos destruyeron tu castillo.</b><br><b style="color:#d29aff;">Esto es un prototipo de combate: no se te descontó XP ni oro.</b>`;
    } else {
      title.textContent = "Tu equipo ha caído";
      title.style.color = "#c62828";
      retryBtn.textContent = `Reintentar — Nivel ${divinaLevel}`;
      document.getElementById("go-stats").textContent = `Arena Divina · Nivel ${divinaLevel}`;
      document.getElementById("go-progress").innerHTML =
        `Tu equipo cayó ante los 4 campeones divinos.<br><b style="color:#d29aff;">Esto es un prototipo de combate: no se te descontó XP ni oro.</b>`;
    }
    return;
  }
  title.textContent = "La Horda te ha consumido";
  title.style.color = "#c62828";
  retryBtn.textContent = "Reintentar desde el Nivel 1";
  const penalty = applyArenaFailurePenalty(player.classKey);
  document.getElementById("go-stats").textContent = `Nivel ${runLevel} · ${kills} bajas`;
  document.getElementById("go-progress").innerHTML =
    `${CLASSES[player.classKey].name} ahora en Nv. <b>${save.champions[player.classKey].level}</b> &nbsp;·&nbsp; Oro total: <b>${save.gold}</b><br>Sin puntos de control: la próxima incursión comienza en el Nivel 1.<br>
    <b style="color:#ff8a6a;">No terminaste la arena: perdiste el ${penalty.lostPct}% de la XP acumulada${penalty.afterLevel<penalty.beforeLevel?` (bajaste de Nv. ${penalty.beforeLevel} a Nv. ${penalty.afterLevel})`:""} y ${penalty.goldLost} de oro.</b>`;
}
/* ============================================================
   FASE 3 — PANTALLA DE VICTORIA COMPLETA
   Secuencia: VICTORIA -> EVALUACIÓN -> RECOMPENSAS -> XP/RECURSOS -> CONTINUAR
   Independiente de la pantalla de pausa. Reutiliza tal cual la Fase 1 (ítems/equipar)
   y la Fase 2 (puntaje/generador) sin duplicar nada de esa lógica.
   ============================================================ */
const STAT_LABELS = {
  dmgTaken:"Daño recibido", enemiesControlled:"Enemigos controlados", presenceTicks:"Presencia en zona",
  kills:"Enemigos eliminados", dmgDealt:"Daño total infligido", dmgToBoss:"Daño a jefes/subjefes",
  abilityHits:"Golpes de habilidad", healEffective:"Curación efectiva", alliesSaved:"Aliados salvados",
  revives:"Aliados revividos", buffsGranted:"Buffs otorgados"
};
let victoryData = null; // se arma una sola vez al entrar a la pantalla; los pasos solo lo muestran
let victoryStep = 0;

function buildVictoryData(){
  const classKey = player.classKey;
  const score = computeRoleScore(player);
  // Cantidad de recompensas: 1 objeto por cada subjefe derrotado en esta partida (la arena
  // tiene 3) + 2 o 3 objetos del jefe final (al azar), ya que llegar a la victoria implica
  // haber derrotado al jefe. El puntaje de desempeño sigue influyendo en la CALIDAD (rareza)
  // de cada uno de esos objetos, no en la cantidad.
  const bossRewardCount = 2 + (Math.random()<0.5 ? 1 : 0); // 2 o 3
  const rewardCount = subjefesDefeated + bossRewardCount;
  const rewards = [];
  let inventoryFull = false;
  for(let i=0;i<rewardCount;i++){
    const champ = save.champions[classKey];
    if((champ.inventory||[]).length >= INVENTORY_CAPACITY){ inventoryFull = true; break; }
    const item = generateReward(classKey, score);
    addItemToInventory(classKey, item); // guarda de verdad en el inventario permanente
    rewards.push(item);
  }
  const partyScores = heroes.map(h=>({classKey:h.classKey, name:CLASSES[h.classKey].name, icon:CLASSES[h.classKey].icon,
    color:CLASSES[h.classKey].color, score:computeRoleScore(h), isPlayer: h===player}));
  // Bonus de XP por completar la arena: además de la XP ganada pelea a pelea, la victoria en
  // sí misma da un extra que crece cada vez más rápido cuanto mejor el desempeño — así sacarse
  // el máximo puntaje (ya bastante difícil, ver SCORE_CONFIG) vale mucho la pena de verdad.
  const victoryXpBonus = Math.round(20 * score * (1 + score/100));
  grantXP(classKey, victoryXpBonus);
  return {
    classKey, score, rewards, partyScores, inventoryFull, victoryXpBonus,
    kills, gold: save.gold,
    level: save.champions[classKey].level,
    stats: player.stats
  };
}

const VICTORY_STEPS = [
  // 0. VICTORIA
  function(){
    document.getElementById("victory-step-title").textContent = "¡Victoria!";
    return `<div class="vic-sub">Arena Infernal — Completada</div>
      <div class="vic-role-line">Jugaste como <b>${CLASSES[victoryData.classKey].name}</b></div>
      <div class="vic-sub">Bajas totales: <b style="color:var(--text);">${victoryData.kills}</b> &nbsp;·&nbsp; Nivel de campeón: <b style="color:var(--text);">${victoryData.level}</b></div>`;
  },
  // 1. EVALUACIÓN DEL DESEMPEÑO
  function(){
    document.getElementById("victory-step-title").textContent = "Evaluación del desempeño";
    const cfg = SCORE_CONFIG[victoryData.classKey] || [];
    let rows = cfg.map(c=>{
      const raw = Math.round((victoryData.stats[c.stat]||0));
      return `<div class="score-row"><span class="score-row-label">${STAT_LABELS[c.stat]||c.stat}</span><span class="score-row-val">${raw}</span></div>`;
    }).join("");
    let partyRows = victoryData.partyScores.map(p=>`
      <div class="vic-party-row">
        <div class="vp-icon" style="color:${p.color}; background:${p.color}22; border:1px solid ${p.color};">${p.icon}</div>
        <div class="vp-name">${p.name}${p.isPlayer?" (vos)":""}</div>
        <div class="vp-score">${p.score}/100</div>
      </div>`).join("");
    return `
      <div class="vic-role-line">Rol evaluado: <b>${CLASSES[victoryData.classKey].name}</b></div>
      <div class="score-big">${victoryData.score}<span>/100</span></div>
      <div class="score-bar-track"><div class="score-bar-fill" style="width:${victoryData.score}%;"></div></div>
      ${rows}
      <div class="vic-party-title">Todo el equipo</div>
      ${partyRows}`;
  },
  // 2. RECOMPENSAS / OBJETOS OBTENIDOS
  function(){
    document.getElementById("victory-step-title").textContent = "Recompensas";
    let cards = victoryData.rewards.map(item=>{
      const rm = RARITY_META[item.rarity];
      const passiveNames = item.passives.map(p=>p.name);
      if(item.mythicPassive) passiveNames.push("★ "+item.mythicPassive.name);
      const equipped = save.champions[victoryData.classKey].equipment[item.type] === item.uid;
      const color = item.set ? "#3ddc71" : rm.color;
      return `<div class="inv-card ${item.set?"set-item":""}" style="border-left-color:${color}; margin-bottom:8px;">
        <span class="item-icon">${item.icon}</span>
        <div class="item-meta">
          <div class="item-name" style="color:${color};">${item.name}${item.set?' <span class="set-badge">SET</span>':""}</div>
          <div class="item-stat">${rm.label} · +${Math.round(item.value*100)}% ${ITEM_TYPES[item.type].statLabel}</div>
          ${item.desc?`<div class="item-desc">${item.desc}</div>`:""}
          ${passiveNames.length?`<div class="item-passives">${passiveNames.join(", ")}</div>`:""}
          <div class="vic-item-actions">
            <button class="primary" data-vic-equip="${item.uid}" ${equipped?"disabled":""}>${equipped?"Equipado":"Equipar"}</button>
            <button data-vic-keep="${item.uid}">Guardar en inventario</button>
          </div>
        </div>
      </div>`;
    }).join("");
    const fullNote = victoryData.inventoryFull ? `<div class="vic-reward-note" style="color:#ff9a7a;">Tu inventario llegó al máximo (${INVENTORY_CAPACITY} objetos) — algunas recompensas no se pudieron guardar. Liberá espacio desde Pausa → Inventario.</div>` : "";
    return `<div class="vic-reward-note">Objeto${victoryData.rewards.length>1?"s":""} obtenido${victoryData.rewards.length>1?"s":""} según tu desempeño (${victoryData.score}/100) — ya está guardado en tu inventario permanente, elegí si lo equipás ahora.</div>${fullNote}${cards}`;
  },
  // 3. XP / RECURSOS
  function(){
    document.getElementById("victory-step-title").textContent = "XP y recursos";
    const champ = save.champions[victoryData.classKey];
    const need = Math.round(40 + champ.level*16 + champ.level*champ.level*0.6);
    const pct = Math.min(100, Math.round(champ.xp/need*100));
    return `
      <div class="vic-xp-row"><span>Campeón</span><b>${CLASSES[victoryData.classKey].name}</b></div>
      <div class="vic-xp-row"><span>Bonus de XP por victoria (desempeño ${victoryData.score}/100)</span><b style="color:var(--ember3);">+${victoryData.victoryXpBonus}</b></div>
      <div class="vic-xp-row"><span>Nivel actual</span><b>${champ.level}</b></div>
      <div class="score-bar-track"><div class="score-bar-fill" style="width:${pct}%;"></div></div>
      <div class="vic-sub" style="margin-top:-6px;">${champ.xp} / ${need} XP para el próximo nivel</div>
      <div class="vic-xp-row"><span>Oro total</span><b>${victoryData.gold}</b></div>
      <div class="vic-xp-row"><span>Objetos en inventario</span><b>${(champ.inventory||[]).length}</b></div>`;
  }
];

function renderVictoryStep(){
  const body = document.getElementById("victory-step-body");
  body.innerHTML = VICTORY_STEPS[victoryStep]();
  const nextBtn = document.getElementById("victory-next-btn");
  const isLast = victoryStep === VICTORY_STEPS.length-1;
  nextBtn.textContent = isLast ? "Continuar" : "Continuar";
  nextBtn.classList.toggle("hidden", false);
  document.getElementById("again-btn").classList.toggle("hidden", !isLast);
  document.getElementById("menu-btn-2").classList.toggle("hidden", !isLast);
  if(isLast) nextBtn.classList.add("hidden");

  body.querySelectorAll("[data-vic-equip]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      equipItem(victoryData.classKey, btn.getAttribute("data-vic-equip"));
      renderVictoryStep();
    });
  });
  body.querySelectorAll("[data-vic-keep]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      btn.textContent = "Guardado ✓"; btn.disabled = true;
    });
  });
}

function showVictoryScreen(){
  setState("victory");
  playSfx("victory");
  victoryData = buildVictoryData();
  victoryStep = 0;
  renderVictoryStep();
}
document.getElementById("victory-next-btn").addEventListener("click", ()=>{
  if(victoryStep < VICTORY_STEPS.length-1){ victoryStep++; renderVictoryStep(); }
});

/* ============================================================
   HUD UPDATE
   ============================================================ */
function updateHUD(){
  updateReviveBtn(); // antes nunca se llamaba: el botón quedaba inactivo para siempre
  // Barra de vida con escudo: la capacidad total de referencia es vida máx + escudo máx
  // de ítems (fijo por equipamiento), así el segmento de escudo nunca se sale de la barra
  // y, si no hay escudo equipado, se comporta exactamente igual que antes (sin regresión).
  const pCap = player.maxHp + (player.itemMaxShield||0);
  const pShieldTotal = (player.shield||0) + (player.itemShield||0);
  const pShieldPct = Math.max(0, Math.min(100, pShieldTotal/pCap*100));
  const pHpPct = Math.max(0, Math.min(100-pShieldPct, player.hp/pCap*100));
  document.getElementById("hp-shield-fill").style.width = pShieldPct+"%";
  const hpFillEl = document.getElementById("hp-fill");
  hpFillEl.style.left = pShieldPct+"%";
  hpFillEl.style.width = pHpPct+"%";
  document.getElementById("en-fill").style.width = (player.energy/player.maxEnergy*100)+"%";
  const plevelEl = document.getElementById("plevel");
  const champMastery = talentState(player.classKey).mastery;
  const tree = talentTreeFor(player.classKey);
  // Emblema de Maestría junto al nivel (sección 18): reconocible por fuera, pero no expone el
  // árbol de talentos completo -solo el nombre de la Maestría elegida, nada más-.
  const emblemHtml = (champMastery && tree && tree.masteries[champMastery]) ? ` <span class="mastery-emblem" title="Maestría: ${tree.masteries[champMastery].name}">★</span>` : "";
  plevelEl.innerHTML = `${CLASSES[player.classKey].name} · Nv. ${save.champions[player.classKey].level}${emblemHtml}`;
  document.getElementById("hud-level").textContent = Math.min(runLevel,10);
  document.getElementById("hud-kills").textContent = kills;
  const totalSec = Math.floor((runElapsedMs||0)/1000);
  document.getElementById("hud-timer").textContent = Math.floor(totalSec/60)+":"+String(totalSec%60).padStart(2,"0");
  document.getElementById("atk-badge").classList.toggle("hidden", player.atkAuraTimer<=0);
  document.getElementById("shield-badge").classList.toggle("hidden", player.shieldAuraTimer<=0);
  // Musashi: Concentración (0/10, sección 26) y Victorias de Duelo -discreto, no satura el HUD-.
  const musashiHudEl = document.getElementById("musashi-hud");
  if(player.classKey==="musashi"){
    musashiHudEl.classList.remove("hidden");
    const concRow = document.getElementById("musashi-conc-row");
    concRow.textContent = `Concentración ${player.concentration||0}/${MUSASHI_CONC_MAX}`;
    concRow.classList.toggle("perfect", (player.concentration||0)>=MUSASHI_CONC_MAX);
    document.getElementById("musashi-victories-val").textContent = (player.stats&&player.stats.duelVictories)||0;
  } else {
    musashiHudEl.classList.add("hidden");
  }
  // Sylva: Rastreo (0/5, Presa Acorralada resaltada) e Impulso (0/10, "bloqueado" durante
  // Cacería Salvaje) -mismo criterio discreto que el HUD de Musashi-.
  const sylvaHudEl = document.getElementById("sylva-hud");
  if(player.classKey==="cazadora"){
    sylvaHudEl.classList.remove("hidden");
    const trackRow = document.getElementById("sylva-track-row");
    trackRow.textContent = `Rastreo ${Math.round(player.trackStacks||0)}/5`;
    trackRow.classList.toggle("cornered", (player.trackStacks||0)>=5);
    const momRow = document.getElementById("sylva-momentum-row");
    const momShown = player.wildHuntTimer>0 ? 10 : Math.floor(player.momentum||0);
    momRow.textContent = `Impulso ${momShown}/10${player.wildHuntTimer>0?" 🔒":""}`;
    momRow.classList.toggle("locked", player.wildHuntTimer>0);
  } else {
    sylvaHudEl.classList.add("hidden");
  }
  // Nigromante: cantidad de esqueletos vivos / máximo actual, estado del gólem, y cuenta
  // regresiva de la Encarnación del Abismo mientras esté transformado.
  const nigroHudEl = document.getElementById("nigromante-hud");
  if(player.classKey==="nigromante"){
    nigroHudEl.classList.remove("hidden");
    const maxCount = nigromanteMaxSkeletons(masteryOf("nigromante", 0));
    document.getElementById("nigro-skeleton-val").textContent = `${player.skeletons.length}/${maxCount}`;
    const golemRow = document.getElementById("nigro-golem-row");
    document.getElementById("nigro-golem-val").textContent = player.golem ? "Activo" : "Inactivo";
    golemRow.classList.toggle("active", !!player.golem);
    const demonRow = document.getElementById("nigro-demon-row");
    if(player.nigroDemonForm){
      demonRow.classList.remove("hidden");
      document.getElementById("nigro-demon-val").textContent = Math.ceil(player.nigroDemonTimer/1000)+"s";
    } else {
      demonRow.classList.add("hidden");
    }
  } else {
    nigroHudEl.classList.add("hidden");
  }
  const pct = bossActive ? 100 : Math.min(100, levelTimer/levelDuration*100);
  document.getElementById("wave-timer-bar").style.width = pct+"%";

  const ultPct = player.ultCharge/player.ultMax*100;
  document.getElementById("ult-ring").style.background = `conic-gradient(var(--ult) ${ultPct*3.6}deg, #2a1c10 0deg)`;
  const ultBtn = document.getElementById("btn-ult");
  const ultReady = player.ultCharge>=player.ultMax && player.ultCd<=0 && runLevel>=ULT_MIN_ARENA_LEVEL;
  ultBtn.classList.toggle("ready", ultReady);
  ultBtn.classList.toggle("locked", runLevel<ULT_MIN_ARENA_LEVEL);

  renderParty();

  [["btn-s1",0],["btn-s2",1],["btn-s3",2]].forEach(([id,idx])=>{
    const el = document.getElementById(id);
    let overlay = el.querySelector(".cd-overlay");
    const cd = player.cds[idx];
    if(cd>0){
      if(!overlay){ overlay = document.createElement("div"); overlay.className="cd-overlay"; el.appendChild(overlay); }
      overlay.textContent = Math.ceil(cd/1000);
    } else if(overlay){ overlay.remove(); }
  });
}

let partyBuilt = false;
function renderParty(){
  const wrap = document.getElementById("party");
  if(!wrap) return;
  if(!partyBuilt || wrap.children.length !== allies.length){
    wrap.innerHTML = "";
    allies.forEach((a,i)=>{
      const row = document.createElement("div");
      row.className = "ally-row";
      row.id = "ally-row-"+i;
      row.innerHTML = `
        <div class="ally-badge" style="color:${a.cls.color};background:${a.cls.color}22;">${a.cls.icon}</div>
        <div class="ally-meta">
          <div class="ally-name">${a.cls.name}</div>
          <div class="ally-hp-track"><div class="ally-hp-fill shield-seg" id="ally-shieldbar-${i}"></div><div class="ally-hp-fill" id="ally-hp-${i}"></div></div>
        </div>
        <span class="status-badge atk hidden" id="ally-atk-${i}">⚔</span>
        <span class="status-badge shield hidden" id="ally-shield-${i}">🛡</span>`;
      wrap.appendChild(row);
    });
    partyBuilt = true;
  }
  allies.forEach((a,i)=>{
    const fill = document.getElementById("ally-hp-"+i);
    const shieldFill = document.getElementById("ally-shieldbar-"+i);
    const row = document.getElementById("ally-row-"+i);
    const aCap = a.maxHp + (a.itemMaxShield||0);
    const aShieldTotal = (a.shield||0) + (a.itemShield||0);
    const aShieldPct = Math.max(0, Math.min(100, aShieldTotal/aCap*100));
    const aHpPct = Math.max(0, Math.min(100-aShieldPct, a.hp/aCap*100));
    if(shieldFill) shieldFill.style.width = aShieldPct+"%";
    if(fill){ fill.style.left = aShieldPct+"%"; fill.style.width = aHpPct+"%"; }
    if(row) row.classList.toggle("down", !a.alive);
    const atkB = document.getElementById("ally-atk-"+i);
    const shB = document.getElementById("ally-shield-"+i);
    if(atkB) atkB.classList.toggle("hidden", a.atkAuraTimer<=0);
    if(shB) shB.classList.toggle("hidden", a.shieldAuraTimer<=0);
  });
}
