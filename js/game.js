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
function arenaMods(){ return ARENA_MODS[currentArena] || ARENA_MODS.bosque; }
function isArenaUnlocked(key){ return true; } // demo: todo desbloqueado. Acá va la condición real después.

// Copia de una paleta donde todo es blanco: sirve de silueta para el destello de impacto
function whitePal(pal){
  const out = {};
  Object.keys(pal).forEach(k=>{ out[k] = "#ffffff"; });
  return out;
}

// Silueta negra: se dibuja algo más grande detrás del sprite para darle contorno
function darkPal(pal){
  const out = {};
  Object.keys(pal).forEach(k=>{ out[k] = "#05060a"; });
  return out;
}

// Paleta filtrada que sólo pinta ciertas letras (equipo/heridas) en blanco y deja todo lo demás
// transparente: sirve para construir una capa extra de brillo pulsante sobre el sprite base.
function shinePal(pal, keys){
  const out = {};
  keys.forEach(k=>{ if(pal[k]) out[k] = "#ffffff"; });
  return out;
}
const SHINE_KEYS = {
  esqueleto:["h","s"], esqueleto_h:["h","s"], zombie:["w"],
  // Héroes: el brillo resalta el detalle mágico/metálico propio de cada clase (letras de las
  // paletas generadas para el rediseño de alta resolución)
  guerrero:["e","f","n"],  // brillo de ojos + filo de las dagas
  tanque:["e","n"],        // filo de la espada + acentos dorados del escudo/cinturón
  mago:["f","c"],          // orbe del bastón
  soporte:["d","p"],       // hoja luminosa del bastón sanador
  segador:["e","f"],       // ojos y aura carmesí, más intensos con Furia
  axiom:["e","f","n"]      // ojos, aura y cabello, todo con el mismo brillo cian intenso
};

// Al caminar hacia arriba sólo se ve la nuca: la cara y los ojos se pintan
// del color de la capucha/pelo, así el personaje se ve de espaldas.
const BACK_HEAD = {
  guerrero:"g", tanque:"f", mago:"h", soporte:"e",
  esqueleto:"a", esqueleto_h:"a", zombie:"n",
  demonio_menor:"b", golem:"b", demonio_mago:"t", demonio_mayor:"b"
};
// Letras que representan ojos/rostro a ocultar al ver al personaje de espaldas. Los 4 héroes
// nuevos usan paletas generadas por separado; los enemigos siguen con las letras clásicas.
const FACE_LETTERS = {
  guerrero:["e","f"], tanque:[], mago:[], soporte:[]
};
function backPal(pal, entityKey){
  const head = pal[BACK_HEAD[entityKey]] || pal.a || "#333333";
  const out = Object.assign({}, pal);
  const letters = FACE_LETTERS[entityKey] || ["s","t","g","w"];
  letters.forEach(k=>{ if(out[k]) out[k] = head; });
  return out;
}

function makeSpriteCanvas(rows, pal, opts){
  opts = opts||{};
  const res = opts.res || SPR;
  const amt = opts.amt || 1;   // magnitud de bob/lean/legShift, en píxeles de grilla (se duplica en sprites de mayor resolución)
  const c = document.createElement("canvas");
  c.width = res*SPR_PX; c.height = res*SPR_PX;
  const g = c.getContext("2d");
  const legRow = opts.legRow===undefined ? Math.round(res*0.75) : opts.legRow;
  for(let y=0;y<rows.length;y++){
    const row = rows[y];
    const bob = (opts.bob && y < legRow) ? -amt : 0;
    const lean = opts.lean ? opts.lean*amt : 0;
    const shift = (y >= legRow) ? ((opts.legShift||0)*amt) : lean;
    for(let x=0;x<row.length;x++){
      const ch = row[x];
      const col = pal[ch];
      if(ch==="." || !col) continue;
      g.fillStyle = col;
      g.fillRect((x+shift)*SPR_PX, (y+bob)*SPR_PX, SPR_PX, SPR_PX);
    }
  }
  return c;
}

const SPRITES = {};

/* ============================================================
   ANIM ATLAS — motor genérico de animación (PRUEBA PILOTO, ver auditoría)
   ============================================================
   El juego tenía ~11 sistemas de animación distintos, cada uno reinventado a mano
   cuando llegaba un pack de arte nuevo (Mago, Sanador, Tanque/Asesino, enemigos del
   Laberinto, habilidades de Axiom/Dragón/Demonio de Hielo, etc.), cada uno con su
   propio esquema de frames/fps/anchor/flip. Esto es el arranque de consolidarlos en
   UNA sola API reutilizable, migrando de a un campeón por vez para no romper nada.

   Esta capa es puro RENDER: no sabe nada de vida, daño, cooldowns ni reglas de juego.
   Cada campeón/enemigo sigue decidiendo por su cuenta "qué clip tocar ahora" (idle vs
   walk vs cast...) exactamente igual que antes -eso es lógica de juego, no de dibujo-,
   y se lo pasa a este motor como un simple string.

   Formato de una animación ("clip"):
     { frames:[{x,y,w,h,pivotX,pivotY?,hitbox?}], fps, loop, events?:{frameIdx:"nombre"} }
   - frames: recortes dentro del atlas PNG (mismo formato que ya usaban Mago/Sanador).
   - fps/loop: ritmo de reproducción, e si repite o se queda en el último frame.
   - events: dispara un evento por nombre la primera vez que la reproducción PASA por
     ese frame (p.ej. el instante exacto en que un ataque "conecta"), para poder
     enganchar partículas/sonido/screen-shake sin acoplar esa lógica al dibujo mismo.
   - hitbox (opcional, por frame): dato que el motor expone pero NO aplica solo -quien
     llama decide si lo usa para algo, las habilidades actuales siguen con su propio
     sistema de daño por radio/tiempo, sin depender de esto.
   ============================================================ */
// Índice de frame dentro de un clip para un instante animT (ms transcurridos en ese estado).
function animFrameIndex(clip, animT){
  const stepMs = 1000/clip.fps;
  let n = Math.floor((animT||0)/stepMs);
  return clip.loop ? n % clip.frames.length : Math.min(n, clip.frames.length-1);
}
// Dispara los eventos de frame definidos en el clip una sola vez por cruce de frame (no en
// cada llamada a render): `cursor` es un objeto {n} que el que llama conserva entre frames.
function animFireEvents(clip, n, cursor, onEvent){
  if(!clip.events || !onEvent || cursor.n===n) return;
  cursor.n = n;
  const ev = clip.events[n];
  if(ev) onEvent(ev, n);
}
// Dibuja el frame `n` de `clip`, anclado por pivotX/pivotY (por defecto: centrado horizontal,
// apoyado abajo -"bottom-center", igual que ya hacían Mago/Sanador a mano).
function drawAnimFrame(atlas, clip, n, x, y, drawScale, flip, alpha){
  const f = clip.frames[n];
  const s = (atlas.def.targetHeight * (drawScale/2.0)) / atlas.def.referenceHeight;
  const pivotX = f.pivotX!==undefined ? f.pivotX : f.w/2;
  const pivotY = f.pivotY!==undefined ? f.pivotY : f.h;
  ctx.save();
  ctx.globalAlpha = (alpha!==undefined ? alpha : 1)*ANIM_ALPHA_MUL;
  ctx.imageSmoothingEnabled = false;
  ctx.translate(x, y);
  ctx.scale(flip ? -1 : 1, 1);
  ctx.drawImage(atlas.img, f.x, f.y, f.w, f.h, -pivotX*s, -pivotY*s, f.w*s, f.h*s);
  ctx.restore();
}
// API de alto nivel: reproduce `clipName` para `entity` (necesita x,y,fx,animT) y lo dibuja.
// Devuelve false si el atlas todavía no cargó (mismo contrato que los drawXReal/drawXAtlas
// de siempre, para que el llamador pueda caer a un sprite de respaldo mientras tanto).
function drawAnimAtlas(atlas, clipName, entity, drawScale, alpha, onEvent){
  if(!atlas.ready()) return false;
  const clip = atlas.def.clips[clipName] || atlas.def.clips[atlas.def.defaultClip];
  const n = animFrameIndex(clip, entity.animT);
  if(onEvent){
    entity._animCursor = entity._animCursor || {};
    const cur = entity._animCursor[clipName] || (entity._animCursor[clipName] = {n:-1});
    animFireEvents(clip, n, cur, (ev)=>onEvent(ev, clipName, n));
  }
  // Un clip puede fijar su propio espejo (p.ej. "walk_left" reusa los frames de "walk_right"
  // espejados, sin importar hacia dónde mire el personaje); si no lo fija, se usa el criterio
  // de siempre (espejar según el signo de fx).
  const flip = clip.flip!==undefined ? clip.flip : (entity.fx < -0.12);
  drawAnimFrame(atlas, clip, n, entity.x, entity.y, drawScale, flip, alpha);
  return true;
}
// Envuelve una imagen YA existente (evita re-embeber el mismo PNG dos veces en base64).
function wrapAnimImage(img, readyGetter, def){ return { img, ready:readyGetter, def }; }
// Dibuja el frame `n` de `clip` con tamaño y ancla EXPLÍCITOS (ratio 0-1 del ancho/alto del
// propio dibujo, no un pivote en píxeles del atlas) — el criterio que ya usaban enemigos y
// efectos (tamaño proporcional al radio de colisión o al radio de una habilidad), a diferencia
// de drawAnimFrame (pivote fijo + targetHeight), el criterio de los sprites de campeones.
// Mismo animFrameIndex/animFireEvents de siempre por debajo: es el mismo reloj de animación.
function drawAnimFrameSized(img, clip, n, x, y, w, h, anchorXRatio, anchorYRatio, flip, alpha, rotation){
  const f = clip.frames[n];
  ctx.save();
  if(alpha!==undefined) ctx.globalAlpha = alpha*ANIM_ALPHA_MUL;
  ctx.imageSmoothingEnabled = false;
  ctx.translate(x, y);
  if(rotation) ctx.rotate(rotation); // p.ej. un segmento de rayo estirado entre dos puntos
  if(flip) ctx.scale(-1,1);
  ctx.drawImage(img, f.x, f.y, f.w, f.h, -w*anchorXRatio, -h*anchorYRatio, w, h);
  ctx.restore();
}
// Adaptador: arma clips a partir de una grilla uniforme (cols x celda de frameW x frameH)
// más un mapa de animaciones por índice de frame -mismo esquema que ya usaban, cada uno por
// su lado, ENEMY_ATLAS/SKILL_ATLAS/BOSS_FX/AXIOM_VFX/REAL_ANIM (ver auditoría).
function buildAnimDefFromGrid(cols, frameW, frameH, animDefs){
  const clips = {};
  for(const name in animDefs){
    const a = animDefs[name];
    clips[name] = {
      frames: a.frames.map(i => ({ x:(i%cols)*frameW, y:Math.floor(i/cols)*frameH, w:frameW, h:frameH })),
      fps:a.fps, loop:a.loop, flip:a.flip
    };
  }
  return { clips, defaultClip: Object.keys(clips)[0] };
}
// Un solo clip en tira horizontal (N frames de w x h, uno al lado del otro) — esquema que
// usaban, cada uno reinventado a mano, SKILL_ATLAS/BOSS_FX/AXIOM_VFX/REAL_ANIM: habilidades
// del Mago/Dragón/Demonio de Hielo, bursts de Axiom, ciclo de caminata del Laberinto.
function buildStripClip(frames, w, h, fps, loop, flip){
  const arr = [];
  for(let i=0;i<frames;i++) arr.push({x:i*w, y:0, w, h});
  return { frames: arr, fps: fps||20, loop: !!loop, flip };
}
// Variante para animaciones que normalizan la DURACIÓN total del ciclo en vez de un fps fijo
// (así una hoja de 6 frames y otra de 55 se ven igual de "rápidas" en pantalla) — el criterio
// que ya usaba REAL_ANIM para los monstruos del Laberinto.
function buildStripClipByDuration(frames, w, h, loopMs, flip){
  return buildStripClip(frames, w, h, frames/(loopMs/1000), true, flip);
}
// Cuenta de frames SIN recortar al último (a diferencia de animFrameIndex): sirve para saber
// si una animación sin loop ya terminó de reproducirse del todo, no solo mostrar su último
// frame congelado -lo que ya hacían a mano BOSS_FX/SKILL_ATLAS antes de esta migración.
function animRawFrameCount(clip, animT){ return Math.floor((animT||0)/(1000/clip.fps)); }
// Adaptador: convierte el esquema viejo (tabla de frames + índices por animación, el que ya
// usaban Mago/Sanador/Tanque/Asesino) al nuevo formato de clips, sin tocar ni un solo número
// de las coordenadas de recorte -son datos, cero riesgo de reescribirlos a mano de nuevo.
function buildAnimDefFromLegacy(legacy, targetHeight, events){
  const clips = {};
  for(const name in legacy.animations){
    const anim = legacy.animations[name];
    clips[name] = { frames: anim.frames.map(i=>legacy.frames[i]), fps:anim.fps, loop:anim.loop, flip:anim.flip, events: events && events[name] };
  }
  return { referenceHeight: legacy.referenceHeight, targetHeight, clips, defaultClip:"idle" };
}

/* ============================================================
   MAGO — sprites reales provistos por el usuario (atlas PNG + JSON)
   Reemplaza SOLO el dibujo del Mago; estadísticas, hitbox, controles
   y habilidades siguen exactamente igual que antes.

   PRUEBA PILOTO de migración al motor ANIM ATLAS de arriba: magoAtlasFrame/drawMagoAtlas/
   drawMagoFallen conservan exactamente la misma firma de siempre (los siguen llamando
   drawHero, la previsualización de campeones y el dibujo de cadáveres, sin cambios ahí),
   pero ahora delegan en el motor genérico en vez de tener su propia lógica de frames a
   mano. Se agrega además UN evento de ejemplo ("cast_release", en el clip "cast") que
   dispara una ráfaga de partículas en el momento exacto en que el Mago suelta el
   hechizo -puramente visual: el daño real de las habilidades lo sigue resolviendo
   castAbility con su propio timer, sin depender de esto para nada.
   ============================================================ */
const MAGO_ATLAS = {"image": "mago.png", "imageSize": [1254, 1254], "referenceHeight": 270, "anchor": "bottom-center", "frames": [{"x": 54, "y": 32, "w": 225, "h": 264, "pivotX": 111}, {"x": 362, "y": 33, "w": 223, "h": 263, "pivotX": 113}, {"x": 678, "y": 32, "w": 218, "h": 264, "pivotX": 107}, {"x": 987, "y": 32, "w": 220, "h": 264, "pivotX": 108}, {"x": 50, "y": 343, "w": 238, "h": 269, "pivotX": 115}, {"x": 364, "y": 347, "w": 227, "h": 265, "pivotX": 111}, {"x": 669, "y": 344, "w": 231, "h": 269, "pivotX": 116}, {"x": 982, "y": 346, "w": 232, "h": 266, "pivotX": 113}, {"x": 45, "y": 664, "w": 243, "h": 256, "pivotX": 120}, {"x": 358, "y": 621, "w": 228, "h": 299, "pivotX": 117}, {"x": 645, "y": 688, "w": 341, "h": 232, "pivotX": 120}, {"x": 996, "y": 665, "w": 213, "h": 255, "pivotX": 99}, {"x": 55, "y": 1009, "w": 221, "h": 209, "pivotX": 110}, {"x": 358, "y": 1038, "w": 213, "h": 183, "pivotX": 117}, {"x": 646, "y": 1042, "w": 245, "h": 179, "pivotX": 119}, {"x": 951, "y": 1110, "w": 276, "h": 111, "pivotX": 134}], "animations": {"idle": {"frames": [0, 1, 2, 3], "fps": 4, "loop": true}, "walk": {"frames": [4, 5, 6, 7], "fps": 8, "loop": true}, "cast": {"frames": [8, 9, 10, 11], "fps": 8, "loop": false}, "hurt": {"frames": [12], "fps": 6, "loop": false}, "death": {"frames": [12, 13, 14, 15], "fps": 6, "loop": false}}};
const MAGO_TARGET_HEIGHT = 70; // altura visible aproximada en unidades de mundo, a escala normal (drawScale=2.0)

// Definición + atlas del Mago en el formato nuevo, construida a partir de la misma tabla de
// frames/animaciones de siempre (MAGO_ATLAS) vía el adaptador -ni un número tocado a mano.
// El evento "cast_release" en el frame relativo 2 del clip "cast" (de 4 frames, a 8fps: cae
// justo antes de que termine la animación de lanzar) dispara una ráfaga de partículas; el
// daño real de la habilidad NO depende de esto, lo sigue resolviendo castAbility aparte.
const MAGO_ANIM_DEF = buildAnimDefFromLegacy(MAGO_ATLAS, MAGO_TARGET_HEIGHT, { cast: {2:"cast_release"} });
const MAGO_ANIM_ATLAS = wrapAnimImage(MAGO_IMG, ()=>MAGO_IMG_READY, MAGO_ANIM_DEF);

// Qué clip tocar según el estado actual del Mago (reposo/caminar/lanzar/daño) — esto sigue
// siendo decisión del propio campeón, el motor de animación no sabe nada de estas reglas.
function magoResolveClip(h){
  if(h.attackAnim>0) return "cast";
  if(h.hurtTimer>0) return "hurt";
  if(h.moving) return "walk";
  return "idle";
}
function magoCastReleaseFx(eventName, h){
  if(eventName!=="cast_release") return;
  const a = Math.random()*Math.PI*2;
  for(let i=0;i<6;i++){
    particles.push({x:h.x, y:h.y-40, vx:Math.cos(a+i)*70, vy:Math.sin(a+i)*70-30, life:280, color:h.cls.glow});
  }
}
// Dibuja al Mago usando el atlas real (vía el motor genérico de animación); misma firma que
// antes, así que drawHero/la previsualización de campeones no necesitan cambiar nada.
function drawMagoAtlas(h, drawScale, alpha){
  return drawAnimAtlas(MAGO_ANIM_ATLAS, magoResolveClip(h), h, drawScale, alpha, (ev)=>magoCastReleaseFx(ev,h));
}
// Cuadro final de la animación de muerte (mago caído, ya boca abajo en el propio arte)
function drawMagoFallen(h, alpha){
  if(!MAGO_IMG_READY) return false;
  const clip = MAGO_ANIM_DEF.clips.death;
  drawAnimFrame(MAGO_ANIM_ATLAS, clip, clip.frames.length-1, h.x, h.y, 2.0, h.fx < -0.12, alpha);
  return true;
}

/* ============================================================
   SANADOR (soporte) — sprites reales provistos por el usuario (atlas propio,
   armado a partir de recortes limpiados de fondo). Reemplaza SOLO el dibujo
   del Sanador; estadísticas, hitbox, controles y habilidades no cambian.
   No se recibieron frames de muerte limpios: el Sanador caído sigue usando
   el sprite procedural existente (fallback ya presente en el motor).
   ============================================================ */
const SOPORTE_ATLAS = {"image": "soporte_atlas.png", "imageSize": [818, 122], "referenceHeight": 114, "anchor": "bottom-center", "frames": [{"x": 4, "y": 4, "w": 147, "h": 114, "pivotX": 74}, {"x": 155, "y": 4, "w": 175, "h": 114, "pivotX": 88}, {"x": 334, "y": 4, "w": 130, "h": 114, "pivotX": 65}, {"x": 468, "y": 12, "w": 111, "h": 106, "pivotX": 56}, {"x": 583, "y": 12, "w": 114, "h": 106, "pivotX": 57}, {"x": 701, "y": 12, "w": 113, "h": 106, "pivotX": 56}], "animations": {"idle": {"frames": [0], "fps": 1, "loop": true}, "walk": {"frames": [0, 1, 2], "fps": 7, "loop": true}, "cast": {"frames": [3, 4, 5], "fps": 8, "loop": false}, "hurt": {"frames": [0], "fps": 6, "loop": false}}};
const SOPORTE_TARGET_HEIGHT = 70; // mismo criterio de tamaño en pantalla que el Mago

// Migrado al motor genérico AnimAtlas (ver más arriba, junto al Mago) — mismo esquema,
// misma técnica de adaptador sin tocar las coordenadas de recorte.
const SOPORTE_ANIM_DEF = buildAnimDefFromLegacy(SOPORTE_ATLAS, SOPORTE_TARGET_HEIGHT);
const SOPORTE_ANIM_ATLAS = wrapAnimImage(SOPORTE_IMG, ()=>SOPORTE_IMG_READY, SOPORTE_ANIM_DEF);
function soporteResolveClip(h){
  if(h.attackAnim>0) return "cast";
  if(h.hurtTimer>0) return "hurt";
  if(h.moving) return "walk";
  return "idle";
}
// Dibuja al Sanador usando su atlas real, anclado por los pies
function drawSoporteAtlas(h, drawScale, alpha){
  return drawAnimAtlas(SOPORTE_ANIM_ATLAS, soporteResolveClip(h), h, drawScale, alpha);
}

/* ============================================================
   CABALLERO (tanque) y ASESINO (guerrero) — sprites reales del usuario,
   atlas de 4 direcciones (abajo/derecha/arriba + espejo izquierda) con transparencia
   real. Mismo criterio que Mago/Sanador: reemplaza SOLO el dibujo, nada de
   estadísticas/hitbox/controles/habilidades. Sin frames de daño ni muerte en el
   paquete -> esos dos estados siguen el fallback ya existente en el motor.
   ============================================================ */
const TANQUE_ATLAS = {"image": "caballerito.png", "imageSize": [1024, 1536], "referenceHeight": 200, "frames": [{"x": 32, "y": 43, "w": 168, "h": 202, "pivotX": 93, "pivotY": 202}, {"x": 300, "y": 42, "w": 160, "h": 203, "pivotX": 85, "pivotY": 203}, {"x": 561, "y": 42, "w": 157, "h": 203, "pivotX": 84, "pivotY": 203}, {"x": 819, "y": 43, "w": 165, "h": 202, "pivotX": 86, "pivotY": 202}, {"x": 46, "y": 280, "w": 151, "h": 215, "pivotX": 79, "pivotY": 215}, {"x": 301, "y": 280, "w": 153, "h": 216, "pivotX": 84, "pivotY": 216}, {"x": 561, "y": 280, "w": 154, "h": 213, "pivotX": 84, "pivotY": 213}, {"x": 818, "y": 280, "w": 151, "h": 216, "pivotX": 87, "pivotY": 216}, {"x": 44, "y": 527, "w": 182, "h": 211, "pivotX": 81, "pivotY": 211}, {"x": 302, "y": 527, "w": 180, "h": 211, "pivotX": 83, "pivotY": 211}, {"x": 563, "y": 527, "w": 178, "h": 211, "pivotX": 82, "pivotY": 211}, {"x": 822, "y": 527, "w": 173, "h": 211, "pivotX": 83, "pivotY": 211}, {"x": 32, "y": 787, "w": 178, "h": 202, "pivotX": 93, "pivotY": 202}, {"x": 296, "y": 755, "w": 170, "h": 234, "pivotX": 89, "pivotY": 234}, {"x": 551, "y": 786, "w": 217, "h": 203, "pivotX": 94, "pivotY": 203}, {"x": 801, "y": 786, "w": 183, "h": 203, "pivotX": 104, "pivotY": 203}, {"x": 40, "y": 1023, "w": 209, "h": 204, "pivotX": 85, "pivotY": 204}, {"x": 311, "y": 994, "w": 159, "h": 228, "pivotX": 74, "pivotY": 228}, {"x": 557, "y": 1023, "w": 244, "h": 204, "pivotX": 88, "pivotY": 204}, {"x": 811, "y": 1023, "w": 197, "h": 200, "pivotX": 94, "pivotY": 200}, {"x": 43, "y": 1269, "w": 175, "h": 205, "pivotX": 82, "pivotY": 205}, {"x": 303, "y": 1237, "w": 179, "h": 239, "pivotX": 82, "pivotY": 239}, {"x": 553, "y": 1251, "w": 212, "h": 224, "pivotX": 92, "pivotY": 224}, {"x": 815, "y": 1268, "w": 185, "h": 208, "pivotX": 90, "pivotY": 208}], "animations": {"idle_down": {"frames": [0], "fps": 1, "loop": true, "flip": false}, "walk_down": {"frames": [0, 1, 2, 3], "fps": 8, "loop": true, "flip": false}, "attack_down": {"frames": [12, 13, 14, 15], "fps": 10, "loop": false, "flip": false}, "idle_right": {"frames": [4], "fps": 1, "loop": true, "flip": false}, "walk_right": {"frames": [4, 5, 6, 7], "fps": 8, "loop": true, "flip": false}, "attack_right": {"frames": [16, 17, 18, 19], "fps": 10, "loop": false, "flip": false}, "idle_up": {"frames": [8], "fps": 1, "loop": true, "flip": false}, "walk_up": {"frames": [8, 9, 10, 11], "fps": 8, "loop": true, "flip": false}, "attack_up": {"frames": [20, 21, 22, 23], "fps": 10, "loop": false, "flip": false}, "idle_left": {"frames": [4], "fps": 1, "loop": true, "flip": true}, "walk_left": {"frames": [4, 5, 6, 7], "fps": 8, "loop": true, "flip": true}, "attack_left": {"frames": [16, 17, 18, 19], "fps": 10, "loop": false, "flip": true}}};

const GUERRERO_ATLAS = {"image": "asesino.png", "imageSize": [1024, 1536], "referenceHeight": 220, "frames": [{"x": 58, "y": 23, "w": 168, "h": 228, "pivotX": 87, "pivotY": 228}, {"x": 303, "y": 25, "w": 172, "h": 226, "pivotX": 92, "pivotY": 226}, {"x": 548, "y": 23, "w": 171, "h": 228, "pivotX": 87, "pivotY": 228}, {"x": 795, "y": 25, "w": 173, "h": 226, "pivotX": 90, "pivotY": 226}, {"x": 45, "y": 276, "w": 189, "h": 217, "pivotX": 100, "pivotY": 217}, {"x": 289, "y": 276, "w": 191, "h": 217, "pivotX": 106, "pivotY": 217}, {"x": 530, "y": 276, "w": 191, "h": 217, "pivotX": 105, "pivotY": 217}, {"x": 788, "y": 276, "w": 185, "h": 217, "pivotX": 97, "pivotY": 217}, {"x": 58, "y": 522, "w": 172, "h": 225, "pivotX": 87, "pivotY": 225}, {"x": 297, "y": 520, "w": 178, "h": 228, "pivotX": 98, "pivotY": 228}, {"x": 548, "y": 520, "w": 176, "h": 228, "pivotX": 87, "pivotY": 228}, {"x": 794, "y": 521, "w": 173, "h": 229, "pivotX": 91, "pivotY": 229}, {"x": 31, "y": 772, "w": 223, "h": 220, "pivotX": 114, "pivotY": 220}, {"x": 276, "y": 777, "w": 216, "h": 225, "pivotX": 119, "pivotY": 225}, {"x": 535, "y": 772, "w": 216, "h": 221, "pivotX": 100, "pivotY": 221}, {"x": 777, "y": 777, "w": 221, "h": 222, "pivotX": 108, "pivotY": 222}, {"x": 47, "y": 1024, "w": 191, "h": 219, "pivotX": 98, "pivotY": 219}, {"x": 299, "y": 1023, "w": 193, "h": 226, "pivotX": 96, "pivotY": 226}, {"x": 524, "y": 1024, "w": 244, "h": 222, "pivotX": 111, "pivotY": 222}, {"x": 793, "y": 1024, "w": 190, "h": 225, "pivotX": 92, "pivotY": 225}, {"x": 41, "y": 1265, "w": 200, "h": 226, "pivotX": 104, "pivotY": 226}, {"x": 285, "y": 1270, "w": 194, "h": 224, "pivotX": 110, "pivotY": 224}, {"x": 524, "y": 1270, "w": 241, "h": 226, "pivotX": 111, "pivotY": 226}, {"x": 786, "y": 1266, "w": 196, "h": 230, "pivotX": 99, "pivotY": 230}], "animations": {"idle_down": {"frames": [0], "fps": 1, "loop": true, "flip": false}, "walk_down": {"frames": [0, 1, 2, 3], "fps": 8, "loop": true, "flip": false}, "attack_down": {"frames": [12, 13, 14, 15], "fps": 10, "loop": false, "flip": false}, "idle_right": {"frames": [4], "fps": 1, "loop": true, "flip": false}, "walk_right": {"frames": [4, 5, 6, 7], "fps": 8, "loop": true, "flip": false}, "attack_right": {"frames": [16, 17, 18, 19], "fps": 10, "loop": false, "flip": false}, "idle_up": {"frames": [8], "fps": 1, "loop": true, "flip": false}, "walk_up": {"frames": [8, 9, 10, 11], "fps": 8, "loop": true, "flip": false}, "attack_up": {"frames": [20, 21, 22, 23], "fps": 10, "loop": false, "flip": false}, "idle_left": {"frames": [4], "fps": 1, "loop": true, "flip": true}, "walk_left": {"frames": [4, 5, 6, 7], "fps": 8, "loop": true, "flip": true}, "attack_left": {"frames": [16, 17, 18, 19], "fps": 10, "loop": false, "flip": true}}};

// Registro genérico de "atlas de 4 direcciones" por clase: agregar una clase nueva de este
// tipo es sumar una entrada acá, sin escribir funciones nuevas.
// Migrado al motor genérico AnimAtlas. Cada entrada de DIR_ATLASES conserva los mismos
// campos de siempre (atlas/img/ready/targetHeight, por si algo más los lee) más el
// animAtlas ya armado -mismo adaptador que Mago/Sanador, esta vez con clips con sufijo de
// dirección (walk_right, attack_down, etc.) y su propio "flip" por clip para la izquierda.
const DIR_ATLASES = {
  tanque:   { atlas: TANQUE_ATLAS,   img: TANQUE_IMG,   ready: () => TANQUE_IMG_READY,   targetHeight: 66,
              animAtlas: wrapAnimImage(TANQUE_IMG, ()=>TANQUE_IMG_READY, buildAnimDefFromLegacy(TANQUE_ATLAS, 66)) },
  guerrero: { atlas: GUERRERO_ATLAS, img: GUERRERO_IMG, ready: () => GUERRERO_IMG_READY, targetHeight: 66,
              animAtlas: wrapAnimImage(GUERRERO_IMG, ()=>GUERRERO_IMG_READY, buildAnimDefFromLegacy(GUERRERO_ATLAS, 66)) }
};
// Resuelve la dirección visual (abajo/derecha/izquierda/arriba) a partir del vector de mirada
function dirAtlasDirection(h){
  if(Math.abs(h.fy) > Math.abs(h.fx)) return h.fy < 0 ? "up" : "down";
  return h.fx < 0 ? "left" : "right";
}
// Elige qué clip tocar según el estado actual del héroe. El paquete no trae frames de daño
// ni de muerte (aclarado en su propio LEEME): en esos casos se usa reposo/caminar, tal como
// indica la instrucción del paquete ("no reinterpretar el diseño").
function dirAtlasResolveClip(animAtlas, h){
  const dir = dirAtlasDirection(h);
  let state = "idle";
  if(h.attackAnim>0) state = "attack";
  else if(h.moving) state = "walk";
  const name = state+"_"+dir;
  return animAtlas.def.clips[name] ? name : "idle_"+dir;
}

/* ============================================================
   LA PROFETA — sanadora de apoyo cuerpo a cuerpo, sprites reales provistos por el
   usuario (arte recortado a mano por el propio paquete: "sprites_recortados"). Reemplaza
   SOLO el dibujo (mismo criterio que Mago/Sanador/Tanque/Asesino): estadísticas, hitbox,
   controles y habilidades se definen aparte en CLASSES.profeta / castAbility.

   El paquete original trae hojas de referencia/concepto (vistas de frente-espalda-lado,
   ilustraciones grandes por habilidad, progresión visual, detalle de arma, expresiones)
   que NO son sprites de juego recortables cuadro a cuadro -son arte de presentación, cada
   una con su propio texto de título horneado encima-. Lo único directamente utilizable como
   ciclo de animación real son las 5 hojas de acción (idle/caminando/corriendo/ataque
   básico "Danza del Ocho"/giro de carga completa) y los 4 íconos cuadrados de habilidad:
   de ahí sale este atlas. El resto (ilustraciones grandes, hoja de progresión, detalle del
   arma, expresiones en pixel) se usó como referencia de color/diseño para las partículas
   procedurales de sus habilidades -mismo criterio que ya usa el resto del roster (Mago,
   Tanque, etc.), que tampoco tiene sprites propios por habilidad-, no como recorte directo.
   Fondo oscuro del paquete removido por flood-fill (no era un solo color plano) + textos de
   título de cada hoja recortados, ambos pasos automáticos, cero retoque a mano de la ropa.
   ============================================================ */
// Limpieza (sprint de integración visual): sin fragmentos de guadaña del frame vecino ni
// líneas de grilla, y la caminata (1-3) reescalada 15% -venía dibujada más chica que el idle-.
const PROFETA_ATLAS_FRAMES = [
  {"x":0,"y":8,"w":52,"h":76},
  {"x":158,"y":13,"w":43,"h":71},
  {"x":316,"y":13,"w":49,"h":71},
  {"x":474,"y":17,"w":86,"h":67},
  {"x":632,"y":23,"w":64,"h":61},
  {"x":0,"y":104,"w":59,"h":64},
  {"x":158,"y":104,"w":69,"h":64},
  {"x":316,"y":104,"w":52,"h":64},
  {"x":474,"y":99,"w":85,"h":69},
  {"x":632,"y":84,"w":158,"h":84}
];
const PROFETA_ATLAS = {
  image: "profeta_atlas.png", referenceHeight: 84,
  frames: PROFETA_ATLAS_FRAMES,
  animations: {
    idle:   { frames:[0],       fps:4,  loop:true  },
    walk:   { frames:[1,3,2],   fps:6,  loop:true  },
    attack: { frames:[4,5,6,7], fps:12, loop:false },
    spin:   { frames:[8,9],     fps:7,  loop:false }
  }
};
const PROFETA_TARGET_HEIGHT = 68; // altura visible aprox. a escala normal (drawScale=2.0), mismo criterio que MAGO_TARGET_HEIGHT
const PROFETA_ANIM_DEF = buildAnimDefFromLegacy(PROFETA_ATLAS, PROFETA_TARGET_HEIGHT, {});
const PROFETA_ANIM_ATLAS = wrapAnimImage(PROFETA_IMG, ()=>PROFETA_IMG_READY, PROFETA_ANIM_DEF);
// Elige el clip según el estado actual: el "giro del Presagio" (combo del básico, ver
// triggerBasic) y el giro de la Danza del Augurio comparten el mismo clip visual "spin".
function profetaResolveClip(h){
  if(h.profetaSpinFxTimer>0) return "spin";
  if(h.attackAnim>0) return "attack";
  if(h.moving) return "walk";
  return "idle";
}
function drawProfetaAtlas(h, drawScale, alpha){
  return drawAnimAtlas(PROFETA_ANIM_ATLAS, profetaResolveClip(h), h, drawScale, alpha);
}


/* ============================================================
   ENEMIGOS — sprites reales del usuario (5 tipos: esqueleto, demonio_menor,
   demonio_mayor, demonio_mago, golem). Atlas reescalados y recomprimidos acá
   (quedaron ~1.9MB en vez de ~4.3MB) para no pasar el límite de tamaño del
   artifact publicado. Reemplaza SOLO el dibujo; vida, daño, IA y colisiones de
   estos enemigos no cambian. zombie y esqueleto_h no vinieron en este paquete,
   así que siguen con el sprite procedural de siempre.
   ============================================================ */
const ENEMY_ATLAS_FRAME = 119; // tamaño de cada celda en el atlas reescalado (4 cols x 6 filas)
const ENEMY_ATLAS_COLS = 4;
const ENEMY_ANIM_DEF = {
  caminar_abajo:     {frames:[0,1,2,3],     fps:8,  loop:true,  flip:false},
  caminar_derecha:   {frames:[4,5,6,7],     fps:8,  loop:true,  flip:false},
  caminar_arriba:    {frames:[8,9,10,11],   fps:8,  loop:true,  flip:false},
  caminar_izquierda: {frames:[4,5,6,7],     fps:8,  loop:true,  flip:true},
  atacar_abajo:      {frames:[12,13,14,15], fps:10, loop:false, flip:false},
  atacar_derecha:    {frames:[16,17,18,19], fps:10, loop:false, flip:false},
  atacar_arriba:     {frames:[20,21,22,23], fps:10, loop:false, flip:false},
  atacar_izquierda:  {frames:[16,17,18,19], fps:10, loop:false, flip:true}
};

// Lobo Ártico (Arena de Hielo, nivel 1): a diferencia de los 5 tipos de arriba (grilla
// compartida 119x119), esta hoja tiene su propia celda (ver ENEMY_ATLAS_GRID) porque los
// frames originales no eran cuadrados de 119px -- drawEnemyAtlas usa ENEMY_ATLAS_GRID[e.type]
// cuando existe, si no cae al tamaño global de siempre.
const ENEMY_ATLAS_GRID = { lobo_artico: {cols:4, w:96, h:105} };
// Dirección cardinal dominante a partir del vector de mirada del enemigo
function enemyAtlasDir(e){
  const fx = e.fx||0, fy = e.fy!==undefined?e.fy:1;
  if(Math.abs(fx) > Math.abs(fy)) return fx>0 ? "derecha" : "izquierda";
  return fy>0 ? "abajo" : "arriba";
}
// Un AnimAtlas por tipo, armado con el adaptador de grilla -mismo ENEMY_ANIM_DEF de siempre
// (compartido por los 6 tipos), con la celda global de 119x119 salvo que el tipo tenga la suya
// propia en ENEMY_ATLAS_GRID (caso del Lobo Ártico).
const ENEMY_ANIM_ATLASES = {};
for(const _t in ENEMY_ATLAS_IMG){
  const g = ENEMY_ATLAS_GRID[_t];
  ENEMY_ANIM_ATLASES[_t] = {
    img: ENEMY_ATLAS_IMG[_t], ready: ()=>ENEMY_ATLAS_READY[_t],
    def: buildAnimDefFromGrid(g?g.cols:ENEMY_ATLAS_COLS, g?g.w:ENEMY_ATLAS_FRAME, g?g.h:ENEMY_ATLAS_FRAME, ENEMY_ANIM_DEF)
  };
}
const SKILL_ATLAS_DEF = {
  ventisca: {frames:12, w:181, h:160},
  nova_hielo: {frames:12, w:181, h:145},
  armadura_hielo: {frames:12, w:181, h:160},
  nova_escarcha: {frames:1, w:190, h:252},
};
// Un AnimAtlas por tipo (tira horizontal) para las habilidades del Mago de Hielo y
// Cristal -mismo dato SKILL_ATLAS_DEF de siempre, ahora armando el clip una sola vez.
const SKILL_ATLASES = {};
for(const _k in SKILL_ATLAS_DEF){
  const d = SKILL_ATLAS_DEF[_k];
  SKILL_ATLASES[_k] = { img: SKILL_ATLAS_IMG[_k], ready:()=>SKILL_ATLAS_READY[_k], clip: buildStripClip(d.frames, d.w, d.h, 20, false) };
}
const BOSS_FX_DEF = {
  aliento_hielo: {frames:12, w:128, h:140},
  nova_hielo_dragon: {frames:12, w:256, h:162},
};
const REAL_ANIM_DEF = {
  golem_piedra: {frames:55, w:75, h:61},
  esfinge: {frames:31, w:82, h:72},
  medusa: {frames:33, w:79, h:72},
  druida_arena: {frames:30, w:81, h:70},
  escorpion_gigante: {frames:16, w:55, h:44},
  minotauro: {frames:20, w:81, h:74},
};
// Un AnimAtlas por tipo, tira horizontal (buildStripClip), para las habilidades del Dragón
// de Hielo -mismo dato BOSS_FX_DEF de siempre, ahora armando el clip una sola vez al cargar
// en vez de recalcular sx/sy a mano en cada draw().
const BOSS_FX_ATLASES = {};
for(const _k in BOSS_FX_DEF){
  const d = BOSS_FX_DEF[_k];
  BOSS_FX_ATLASES[_k] = { img: BOSS_FX_IMG[_k], ready:()=>BOSS_FX_READY[_k], clip: buildStripClip(d.frames, d.w, d.h, 16, false) };
}
// Ídem para los monstruos del Laberinto Maldito y el Minotauro, con la duración de ciclo
// normalizada (mismo criterio de siempre: 1100ms de vuelta completa sin importar cuántos
// frames traiga cada hoja).
const REAL_ANIM_ATLASES = {};
for(const _t in REAL_ANIM_DEF){
  const d = REAL_ANIM_DEF[_t];
  REAL_ANIM_ATLASES[_t] = { img: REAL_ANIM_IMG[_t], ready:()=>REAL_ANIM_READY[_t], clip: buildStripClipByDuration(d.frames, d.w, d.h, 1100) };
}
// Dibuja, REEMPLAZANDO por completo al sprite normal (a diferencia de drawBossSkillAnim, que
// se superpone), la animación de una habilidad del Dragón de Hielo: estas hojas ya traen al
// dragón dibujado adentro de cada frame (cuerpo + efecto juntos), así que mostrar el sprite
// normal AL MISMO TIEMPO duplicaría al dragón en pantalla. Devuelve true mientras la animación
// está en curso, para que drawEnemy no dibuje nada más encima.
function drawBossFxReplace(e){
  const fx = e.fxAnim;
  if(!fx) return false;
  const atlas = BOSS_FX_ATLASES[fx.name];
  if(!atlas || !atlas.ready()) return false;
  const clip = atlas.clip;
  if(animRawFrameCount(clip, fx.t) >= clip.frames.length){ e.fxAnim = null; return false; }
  const n = animFrameIndex(clip, fx.t);
  const f = clip.frames[0];
  const targetH = e.radius*2.6;
  const s = targetH/f.h;
  drawAnimFrameSized(atlas.img, clip, n, e.x, e.y, f.w*s, f.h*s, 0.5, 0.92, e.fx < -0.12, undefined);
  return true;
}

// Dibuja el ciclo de caminata real (N frames, con los pies ya anclados abajo al armar la
// hoja) para los monstruos propios del Laberinto Maldito y el Minotauro. La duración del
// ciclo completo es la misma para todos sin importar cuántos frames traiga cada hoja, para
// que no se vean más lentos o más rápidos entre sí por pura casualidad del arte (ver
// buildStripClipByDuration, que arma el clip con un fps ya calculado para eso).
// Estas tiras NO son un único ciclo: mezclan vistas de frente, de espalda, de perfil (algunas
// mirando a la izquierda y otras a la derecha), poses de ataque y recortes sueltos. Reproducir
// la tira entera como caminata hacía que el monstruo girara sobre sí mismo sin parar. Acá se
// separan los frames por vista (verificados uno por uno contra el arte): down/up/side, y
// sideNat dice hacia dónde mira el arte original de perfil (1 = derecha, -1 = izquierda).
// atk (opcional) = frames de ataque/cast reales; si no hay, el ataque lo marca AnimFX.
const REAL_ANIM_SETS = {
  minotauro:         { side:[8,9,10,11,12,13,14,15,16,17,18,19], sideNat:1, up:[4,5,6] },
  esfinge:           { down:[0,1,2,3], up:[4,5,7,8,9], side:[17,19,20,21], sideNat:1 },
  medusa:            { down:[0,1,2,3], up:[4,5,6,7,8], side:[20,21,22,23,24], sideNat:1, atk:[9,10,11,12] },
  druida_arena:      { down:[0,1,2,3], up:[4,5,6,7,8], side:[20,21,22,23,26,29], sideNat:1, atk:[9,10,11,12] },
  // perfil: solo frames que miran a la izquierda (antes se mezclaban 4 y 12, que miran a la derecha,
  // y el escorpión se daba vuelta a cada paso)
  escorpion_gigante: { down:[0,1,8], side:[5,6,7,6], sideNat:-1 },
  golem_piedra:      { down:[1], side:[24,26,28], sideNat:-1 },
};
for(const _t in REAL_ANIM_SETS){
  const d = REAL_ANIM_DEF[_t], set = REAL_ANIM_SETS[_t], atlas = REAL_ANIM_ATLASES[_t];
  if(!d || !atlas) continue;
  const mk = (idx, fps) => idx ? { frames: idx.map(i => ({x:i*d.w, y:0, w:d.w, h:d.h})), fps, loop:true } : null;
  atlas.dirClips = { down: mk(set.down, 7), up: mk(set.up, 7), side: mk(set.side, 9), atk: mk(set.atk, 10) };
  atlas.sideNat = set.sideNat;
}
function drawRealAnimSprite(e){
  const atlas = REAL_ANIM_ATLASES[e.type];
  if(!atlas || !atlas.ready()) return false;
  let clip = atlas.clip, flip = e.fx < -0.12;
  const dc = atlas.dirClips;
  if(dc){
    // vista según la dirección, con histéresis para que no parpadee en diagonales
    const ax = Math.abs(e.fx||0), ay = Math.abs(e.fy||0);
    let dir = e._rdir||0; // 0 perfil, 1 abajo, 2 arriba
    if(dir===0){ if(ay > ax*1.3) dir = e.fy>0 ? 1 : 2; }
    else if(ax > ay*1.3) dir = 0; else dir = e.fy>0 ? 1 : 2;
    e._rdir = dir;
    if(e.fx < -0.12) e._rfaceL = true; else if(e.fx > 0.12) e._rfaceL = false;
    if(e.attackAnim>0 && dc.atk){ clip = dc.atk; flip = false; }
    else if(dir===1 && dc.down){ clip = dc.down; flip = false; }
    else if(dir===2 && dc.up){ clip = dc.up; flip = false; }
    else { clip = dc.side; flip = atlas.sideNat>0 ? !!e._rfaceL : !e._rfaceL; }
  }
  const n = animFrameIndex(clip, e.animT);
  const f = clip.frames[0];
  const targetH = e.radius*2.6;
  const s = targetH/f.h;
  drawAnimFrameSized(atlas.img, clip, n, e.x, e.y, f.w*s, f.h*s, 0.5, 0.92, flip, undefined);
  return true;
}
const PACK_ANIM = {
  duende_bosque: { img:PACK_DUENDE_IMG, ready:PACK_DUENDE_READY,
    walk:["walk1","walk2","walk3","walk4","walk5"], idle:["idle1","idle2","idle3"],
    atk:["atk1","atk2","atk3","atk4"], hit:["hit1"], death:["death1","death2","death3"] },
  // Packs 3-4: Guardián del Laberinto (antes prestaba el Gólem), Zombi y Esqueleto Cornudo (antes
  // dibujados por código), y Gólem de Hielo / Demonio de Hielo / Ent (antes 1 solo frame).
  guardian_laberinto: { img:PACK_GUARDIAN_IMG, ready:PACK_GUARDIAN_READY,
    walk:["walk1", "walk2", "walk3", "walk4"], idle:["idle1", "idle2", "idle3", "idle2"],
    atk:["atk1", "atk2", "atk3", "atk4", "atk5"], hit:["hit1", "hit2"], death:["death1", "death2", "death3", "death4", "death5"] },
  zombie: { img:PACK_ZOMBI_IMG, ready:PACK_ZOMBI_READY,
    walk:["walk1", "walk2", "walk3", "walk2"], idle:["idle1", "idle2", "idle3", "idle4"],
    atk:["atk1", "atk2", "atk3"], hit:["hit1"], death:["death1", "death2", "death3"] },
  esqueleto_h: { img:PACK_ESQC_IMG, ready:PACK_ESQC_READY,
    walk:["walk1", "walk2", "walk3", "walk4"], idle:["idle1", "idle2", "idle3", "idle4"],
    atk:["atk1", "atk2", "atk3"], hit:["hit1", "hit2"], death:["death1", "death2", "death3"] },
  golem_hielo: { img:PACK_GOLEMH_IMG, ready:PACK_GOLEMH_READY,
    walk:["walk1", "walk2", "walk3", "walk2"], idle:["idle1", "idle2"],
    atk:["atk1", "atk2", "atk3", "atk4"], hit:["hit1", "hit2"], death:["death1", "death2", "death3", "death4"] },
  demonio_hielo_fuego: { img:PACK_DEMH_IMG, ready:PACK_DEMH_READY,
    walk:["walk1", "walk2", "walk3", "walk2"], idle:["idle1", "idle2", "idle3"],
    atk:["atk1", "atk2", "atk3"], hit:["hit1", "hit2"], death:["death1", "death2", "death3", "death4"] },
  // cuadrúpedo: más ancho que alto, así que se escala a menos alto que un humanoide del mismo radio
  bestia_bosque: { img:PACK_BESTIA_IMG, ready:PACK_BESTIA_READY, hMul:2.1,
    walk:["walk1","walk2","walk3","walk4","walk5"], idle:["idle1","idle2","idle3","idle4"],
    atk:["atk1","atk2","atk3"], hit:["hit1"], death:["death1","death2","death3","death4"] },
  ent: { img:PACK_TREANT_IMG, ready:PACK_TREANT_READY,
    walk:["walk1", "walk2", "walk3", "walk4"], idle:["idle1", "idle2", "idle3", "idle4"],
    atk:["atk1", "atk2", "atk3", "atk4"], hit:["hit1", "hit2"], death:["death1", "death2", "death3", "death4", "death5"] },
};
function drawPackSprite(e){
  const d = PACK_ANIM[e.type];
  if(!d || !d.ready.walk1) return false;
  let key;
  // el ataque arranca con distinta duración según el enemigo (260-500ms): se toma el valor inicial
  // de cada golpe como referencia para repartir los frames a lo largo de todo el golpe
  if(e.attackAnim > (e._pkAtkLast||0)) e._pkAtkMax = e.attackAnim;
  e._pkAtkLast = e.attackAnim;
  if(!e.alive){
    let i;
    if(e._dyingP != null) i = Math.floor(e._dyingP*d.death.length*1.25); // atado a la duración de la muerte
    else { if(!e._diedAt) e._diedAt = animNow; i = Math.floor((animNow-e._diedAt)/220); }
    key = d.death[Math.min(d.death.length-1, i)];
  } else if(e.attackAnim>0){
    const p = Math.max(0, Math.min(0.999, 1 - e.attackAnim/(e._pkAtkMax||280)));
    key = d.atk[Math.floor(p*d.atk.length)];
  } else if(e.hitFlash>55){
    key = d.hit[0];
  } else if(e.stunTimer>0){
    key = d.idle[Math.floor((e.animT||0)/220)%d.idle.length];
  } else {
    key = d.walk[Math.floor((e.animT||0)/120)%d.walk.length];
  }
  const img = d.img[key];
  if(!img || !d.ready[key]) return false;
  // misma escala para todos los frames (tomada del primer frame de caminata), así los recortes
  // de distinto alto -p.ej. la muerte tendido en el piso- no cambian de tamaño el personaje
  const s = e.radius*(d.hMul||2.6)/d.img.walk1.height;
  drawAnimFrameSized(img, {frames:[{x:0, y:0, w:img.width, h:img.height}]}, 0, e.x, e.y, img.width*s, img.height*s, 0.5, 0.92, e.fx < -0.12, undefined);
  return true;
}

// Dibuja el sprite real (frame único, con leve balanceo y espejo por dirección) para los
// tipos de Hielo/Bosque que ya tienen arte limpio pero un solo frame (sin ciclo de
// caminata). Devuelve false si no aplica, para que drawEnemy caiga al sprite prestado
// (visualAlias) en el resto de los casos.
// Migrado a drawAnimFrameSized (mismo primitivo que usan enemigos con atlas real): el
// "clip" de un solo frame se arma al vuelo -no hace falta tabla ni grilla para esto- y el
// balanceo (bob) queda como detalle propio de este wrapper, fuera del motor genérico.
function drawIceRealSprite(e){
  if(!ICE_REAL_READY[e.type]) return false;
  const img = ICE_REAL_IMG[e.type];
  const targetH = e.radius*2.6;
  const s = targetH/img.height;
  const bob = Math.sin((e.animT||0)/220)*2;
  const clip = { frames: [{x:0, y:0, w:img.width, h:img.height}] };
  drawAnimFrameSized(img, clip, 0, e.x, e.y+bob, img.width*s, img.height*s, 0.5, 0.92, e.fx < -0.12, undefined);
  return true;
}

// Dibuja, superpuesto sobre el jefe, el frame que corresponda de la animación de habilidad
// activa (Ventisca / Nova de Hielo / Armadura de Hielo del Mago de Hielo y Cristal). No
// devuelve nada: es un efecto encima del sprite normal, no un reemplazo.
function drawBossSkillAnim(e){
  const sk = e.skillAnim;
  if(!sk) return;
  const atlas = SKILL_ATLASES[sk.name];
  if(!atlas || !atlas.ready()) return;
  const clip = atlas.clip;
  // Con muy pocos frames (p.ej. la Nova de Escarcha, 1 sola imagen) la duración normal
  // (frames/fps) sería un parpadeo casi invisible, así que se sostiene un mínimo razonable.
  const holdMs = Math.max((1000/clip.fps)*clip.frames.length, clip.frames.length<=2 ? 450 : 0);
  if(sk.t >= holdMs){ e.skillAnim = null; return; }
  const n = animFrameIndex(clip, sk.t);
  const f = clip.frames[0];
  const targetH = e.radius*3.4;
  const s = targetH/f.h;
  drawAnimFrameSized(atlas.img, clip, n, e.x, e.y - e.radius*0.5, f.w*s, f.h*s, 0.5, 0.5, false, undefined);
}

// Arena Acuática: sprites reales para los 5 comunes + la élite (Tiburón Joven/Blanco, Medusa
// Eléctrica, Cangrejo Acorazado, Sirena Abisal). Mismo patrón de "una imagen por pose" que ya
// usan Musashi/Sylva/Nigromante -acá solo idle/ataque, alcanza para la escala de estos enemigos
// comunes-. La Anguila Eléctrica, el Kraken Joven y el Leviatán no pasan por acá: usan
// visualAlias a una silueta ya existente (ver ENEMY_BASE) como placeholder hasta tener arte propio.
// Segundo frame de idle (recortes reales adicionales del mismo pack, antes sin usar) para las
// 4 criaturas comunes que solo tenían una pose quieta: alternando de a poco (450ms) se ve un
// nado/pulso sutil en vez de quedar totalmente estáticas entre ataques.
// (el idle2 del Tiburón Blanco es otra toma -de cuerpo entero y más lejos- y al reescalarlo al alto
// del idle1 se veía gigante y pixelado: se deja fuera)
const ACUA_IDLE2 = { tiburon_joven:"tiburonJovenIdle2", cangrejo_acorazado:"cangrejoIdle2", medusa_electrica:"medusaIdle2" };
function drawAcuaticaReal(e){
  let idleKey, atkKey;
  if(e.type==="tiburon_joven"){ idleKey="tiburonJovenIdle"; atkKey="tiburonJovenAtk"; }
  else if(e.type==="tiburon_blanco"){ idleKey="tiburonBlancoIdle"; atkKey="tiburonBlancoAtk"; }
  else if(e.type==="cangrejo_acorazado"){ idleKey="cangrejoIdle"; atkKey="cangrejoAtk"; }
  else if(e.type==="medusa_electrica"){ idleKey="medusaIdle"; atkKey="medusaAtk"; }
  else if(e.type==="sirena_abisal"){ idleKey="sirenaIdle"; atkKey="sirenaAtk"; }
  else if(e.type==="anguila_electrica" || e.type==="kraken_joven" || e.type==="leviatan") return drawAcua2(e);
  else return false;
  if(!ACUA_READY[idleKey]) return false;
  const idleKey2 = ACUA_IDLE2[e.type];
  if(!(e.attackAnim>0) && idleKey2 && ACUA_READY[idleKey2] && Math.floor((e.animT||0)/450)%2===1) idleKey = idleKey2;
  const img = (e.attackAnim>0 && ACUA_READY[atkKey]) ? ACUA_IMG[atkKey] : ACUA_IMG[idleKey];
  const flip = e.fx < -0.12;
  const targetH = e.radius*2.6;
  const sc = targetH/img.height;
  const clip = { frames: [{x:0,y:0,w:img.width,h:img.height}] };
  drawAnimFrameSized(img, clip, 0, e.x, e.y, img.width*sc, img.height*sc, 0.5, 0.72, flip, e.hitFlash>60?0.6:1);
  return true;
}
function drawEnemyAtlas(e){
  const atlas = ENEMY_ANIM_ATLASES[e.type];
  if(!atlas || !atlas.ready()) return false;
  const dir = enemyAtlasDir(e);
  const state = e.attackAnim>0 ? "atacar" : "caminar";
  const clip = atlas.def.clips[state+"_"+dir];
  const n = animFrameIndex(clip, e.animT);
  const size = e.radius*2.7; // tamaño visual proporcional al radio de colisión ya existente
  const sizeH = size*(clip.frames[n].h/clip.frames[n].w);
  drawAnimFrameSized(atlas.img, clip, n, e.x, e.y, size, sizeH, 0.5, 0.85, clip.flip, undefined);
  return true;
}



/* ============================================================
   ASESINO — sprites reales de sus 4 habilidades (Pestilencia Sombría,
   Triple Golpe, Trampa de Área, Corte Sangrante). Atlas reescalados a 336x336
   (celda de 84px) para entrar en el límite de tamaño del artifact publicado.
   Reemplaza SOLO el dibujo; daño, área, cooldown y demás reglas no cambian.
   ============================================================ */
const ASESINO_HAB_ANIM = {"pestilencia": {"sigilo": {"frames": [0, 1, 2, 3], "fps": 10, "loop": false}, "emboscada": {"frames": [4, 5, 6, 7], "fps": 10, "loop": false}, "cadena": {"frames": [8, 9, 10, 11], "fps": 14, "loop": true}, "veneno": {"frames": [12], "fps": 10, "loop": false}, "sangrado": {"frames": [13], "fps": 10, "loop": false}, "impacto": {"frames": [14], "fps": 10, "loop": false}, "reposo": {"frames": [0], "fps": 10, "loop": false}}, "triple_golpe": {"combo": {"frames": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], "fps": 10, "loop": false}, "primer_corte": {"frames": [12], "fps": 10, "loop": false}, "segundo_corte": {"frames": [13], "fps": 10, "loop": false}, "corte_final": {"frames": [14], "fps": 10, "loop": false}, "reposo": {"frames": [0], "fps": 10, "loop": false}}, "trampa": {"colocar": {"frames": [0, 1, 2, 3], "fps": 10, "loop": false}, "desplegar": {"frames": [4, 5, 6, 7], "fps": 10, "loop": false}, "armada": {"frames": [7], "fps": 10, "loop": false}, "activar": {"frames": [8, 9, 10, 11], "fps": 10, "loop": false}, "atrapado": {"frames": [12, 13], "fps": 8, "loop": true}, "restos": {"frames": [14], "fps": 10, "loop": false}, "reposo": {"frames": [0], "fps": 10, "loop": false}}, "corte_sangrante": {"corte": {"frames": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], "fps": 12, "loop": false}, "arco": {"frames": [12], "fps": 10, "loop": false}, "sangrado": {"frames": [13, 14], "fps": 6, "loop": true}, "reposo": {"frames": [0], "fps": 10, "loop": false}}};
const ASESINO_HAB_FRAME = 84, ASESINO_HAB_COLS = 4;

// Migrado al motor genérico AnimAtlas: un atlas por habilidad (mismo criterio que
// ENEMY_ANIM_ATLASES), cada uno construido a partir de la misma tabla ASESINO_HAB_ANIM de
// siempre vía buildAnimDefFromGrid -ni un solo número de recorte cambia de manos-.
const ASESINO_HAB_ANIM_ATLASES = {};
for(const _sk in ASESINO_HAB_IMG){
  ASESINO_HAB_ANIM_ATLASES[_sk] = wrapAnimImage(ASESINO_HAB_IMG[_sk], ()=>ASESINO_HAB_READY[_sk],
    buildAnimDefFromGrid(ASESINO_HAB_COLS, ASESINO_HAB_FRAME, ASESINO_HAB_FRAME, ASESINO_HAB_ANIM[_sk]));
}
// Dibuja un cuadro de una animación de habilidad del Asesino en (x,y), centrado, tamaño en px.
function drawAsesinoHab(skill, anim, ageMs, x, y, size, flip){
  const atlas = ASESINO_HAB_ANIM_ATLASES[skill];
  if(!atlas || !atlas.ready()) return false;
  const clip = atlas.def.clips[anim];
  if(!clip) return false;
  const n = animFrameIndex(clip, ageMs);
  drawAnimFrameSized(atlas.img, clip, n, x, y, size, size, 0.5, 0.8, flip, undefined);
  return true;
}

function drawDirAtlasHero(entry, h, drawScale, alpha){
  return drawAnimAtlas(entry.animAtlas, dirAtlasResolveClip(entry.animAtlas, h), h, drawScale, alpha);
}
// Overlays de las 3 habilidades reales del Caballero (Torbellino/Estampida/Grito de Guerra):
// reemplazan momentáneamente el sprite de dirección mientras esas habilidades están activas.
// Solo dibuja; no toca daño, duración ni ninguna otra regla de combate.
function drawKnightAbilityFx(h, drawScale, alpha){
  if(typeof CaballeritoHabilidades==="undefined" || h.classKey!=="tanque") return false;
  const size = 120 * (drawScale/2.0);
  ctx.save();
  ctx.globalAlpha = alpha!==undefined ? alpha : 1;
  ctx.imageSmoothingEnabled = false;
  let drew = true;
  if(h.dashFxTimer>0){
    const age = (1050 - h.dashFxTimer)/1000;
    CaballeritoHabilidades.drawDash(ctx, age, h.x, h.y, size, h.dashFxFlip);
  } else if(h.spinTimer>0){
    const age = Math.max(0, (h.spinMaxTimer - h.spinTimer))/1000;
    CaballeritoHabilidades.draw(ctx, "torbellino", "activo", age, h.x, h.y, size);
  } else if(h.growTimer>0 && h.growMaxTimer>0){
    const age = Math.max(0, (h.growMaxTimer - h.growTimer))/1000;
    CaballeritoHabilidades.draw(ctx, "grito", "activo", age, h.x, h.y, size);
  } else {
    drew = false;
  }
  ctx.restore();
  return drew;
}

const ENEMY_SPRITE = {
  esqueleto:"esqueleto", zombie:"zombie", esqueleto_h:"esqueleto_h",
  demonio_menor:"demonio_menor", golem:"golem", demonio_mago:"demonio_mago",
  demonio_mayor:"demonio_mayor"
};
function buildSprites(){
  const mk = (gridKey, palKey, hi) => {
    const pal = PAL[palKey], grid = GRIDS[gridKey];
    const bpal = backPal(pal, palKey);
    const base = hi ? {res:32, legRow:24, amt:2} : {};
    const walkOpts = [base, Object.assign({}, base, {legShift:1, bob:true}), base, Object.assign({}, base, {legShift:-1, bob:true})];
    return {
      walk: walkOpts.map(o=>makeSpriteCanvas(grid, pal, o)),
      back: walkOpts.map(o=>makeSpriteCanvas(grid, bpal, o)),
      attack: GRIDS[gridKey+"_atk"]
        ? makeSpriteCanvas(GRIDS[gridKey+"_atk"], pal, base)
        : makeSpriteCanvas(grid, pal, Object.assign({}, base, {lean:1, bob:true})),
      hurt: makeSpriteCanvas(grid, pal, Object.assign({}, base, {lean:-1})),
      flash: makeSpriteCanvas(grid, whitePal(pal), base),
      outline: makeSpriteCanvas(grid, darkPal(pal), base)
    };
  };
  Object.keys(CLASSES).forEach(key=>{ SPRITES[key] = mk(key, key, true); });
  Object.keys(ENEMY_SPRITE).forEach(type=>{ SPRITES["enemy_"+type] = mk(ENEMY_SPRITE[type], ENEMY_SPRITE[type]); });
  // Capa extra de brillo pulsante: arma/equipo de los héroes y de los enemigos que aparecen al principio
  Object.keys(SHINE_KEYS).forEach(type=>{
    if(CLASSES[type]){
      SPRITES[type].shine = makeSpriteCanvas(GRIDS[type], shinePal(PAL[type], SHINE_KEYS[type]), {res:32, legRow:24, amt:2});
    } else {
      const gridKey = ENEMY_SPRITE[type], pal = PAL[gridKey];
      SPRITES["enemy_"+type].shine = makeSpriteCanvas(GRIDS[gridKey], shinePal(pal, SHINE_KEYS[type]), {});
    }
  });
}

// Dibuja la silueta oscura un poco más grande por detrás: da contorno al sprite
function drawOutline(sp, x, y, scale, flip){
  if(!sp || !sp.outline) return;
  ctx.save();
  ctx.globalAlpha = 0.75*ANIM_ALPHA_MUL;
  drawSprite(sp.outline, x, y, scale*1.07, flip);
  ctx.restore();
}

// Capa extra de luz: una silueta clara, muy sutil y desplazada hacia
// la esquina superior-izquierda, que le da al pixel art una sensación
// de bisel/profundidad sin tener que rehacer cada sprite a mano.
function drawRimLight(sp, x, y, scale, flip){
  if(!sp || !sp.flash) return;
  ctx.save();
  ctx.globalAlpha = 0.20*ANIM_ALPHA_MUL;
  drawSprite(sp.flash, x-1, y-2, scale, flip);
  ctx.restore();
}

function drawSprite(img, x, y, scale, flip, tint){
  const w = img.width/SPR_PX*scale, h = img.height/SPR_PX*scale;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(x, y);
  if(flip) ctx.scale(-1,1);
  ctx.drawImage(img, -w/2, -h*0.74, w, h);
  ctx.restore();
}

function drawShadow(x, y, rx){
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.beginPath();
  ctx.ellipse(x, y+4, rx, rx*0.38, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();
}

/* ============================================================
   ARENA INFERNAL — ESCENARIO PIXEL ART
   ============================================================ */
let floorPattern = null;
let lavaPools = [], floorDecor = [], braziers = [], wallBlocks = [], deadTrees = [], smokePuffs = [];

const FLOOR_THEME = {
  bosque:   { bg:"#0c1208", stoneR:46, stoneG:56,  stoneB:34,  joint:"rgba(6,10,4,0.85)",  dirt:"rgba(10,16,6,",   fleckA:"rgba(120,170,70,0.26)", fleckB:"rgba(180,220,120,0.16)" },
  hielo:    { bg:"#0d2038", stoneR:118,stoneG:158, stoneB:196, joint:"rgba(4,14,28,0.82)", dirt:"rgba(225,240,255,",fleckA:"rgba(170,220,255,0.32)", fleckB:"rgba(235,250,255,0.22)" },
  laberinto:{ bg:"#181022", stoneR:96, stoneG:78,  stoneB:64,  joint:"rgba(8,4,10,0.85)",  dirt:"rgba(120,70,150,",fleckA:"rgba(150,90,190,0.22)", fleckB:"rgba(90,60,140,0.16)" },
  infernal: { bg:"#0e0a09", stoneR:58, stoneG:39,  stoneB:31,  joint:"rgba(0,0,0,0.85)",   dirt:"rgba(0,0,0,",     fleckA:"rgba(200,75,20,0.22)",  fleckB:"rgba(255,160,65,0.14)" },
  divina:   { bg:"#150a24", stoneR:108,stoneG:84,  stoneB:140, joint:"rgba(10,4,20,0.85)", dirt:"rgba(200,140,255,",fleckA:"rgba(210,140,255,0.28)", fleckB:"rgba(140,230,200,0.20)" },
  // Arena sedimentada de ruinas hundidas: piedra grisácea con un tinte verde-azulado profundo
  // -distinta de la piedra fría/blanca del Hielo-, con vetas de coral/musgo bioluminiscente.
  acuatica: { bg:"#081a20", stoneR:52, stoneG:78,  stoneB:82,  joint:"rgba(2,10,12,0.85)", dirt:"rgba(20,70,60,",  fleckA:"rgba(70,200,180,0.26)", fleckB:"rgba(160,90,120,0.16)" }
};
let floorPatterns = {};
function buildFloorTile(){
  const theme = FLOOR_THEME[currentArena] || FLOOR_THEME.infernal;
  const S = 160;
  const t = document.createElement("canvas"); t.width = S; t.height = S;
  const g = t.getContext("2d");
  g.fillStyle = theme.bg; g.fillRect(0,0,S,S);

  // Placas de piedra irregulares (estilo roca resquebrajada, sin patrón de ladrillo)
  const seeds = [];
  for(let i=0;i<26;i++) seeds.push({x:Math.random()*S, y:Math.random()*S, tone:0.75+Math.random()*0.5});
  const step = 4;
  for(let y=0;y<S;y+=step){
    for(let x=0;x<S;x+=step){
      let best=null, bd=1e9, bd2=1e9;
      for(const s of seeds){
        // distancia envolvente para que el mosaico se repita sin costuras
        let dx = Math.abs(s.x-x); if(dx>S/2) dx = S-dx;
        let dy = Math.abs(s.y-y); if(dy>S/2) dy = S-dy;
        const d = dx*dx+dy*dy;
        if(d<bd){ bd2=bd; bd=d; best=s; } else if(d<bd2){ bd2=d; }
      }
      const edge = Math.sqrt(bd2)-Math.sqrt(bd);
      if(edge < 3){
        g.fillStyle = theme.joint;           // junta / grieta
      } else {
        const v = best.tone * (0.9 + Math.random()*0.2);
        const r = Math.round(theme.stoneR*v), gg = Math.round(theme.stoneG*v), b = Math.round(theme.stoneB*v);
        g.fillStyle = `rgb(${r},${gg},${b})`;
      }
      g.fillRect(x, y, step, step);
    }
  }

  // desgaste y suciedad (o escarcha, según la arena)
  for(let i=0;i<420;i++){
    g.fillStyle = `${theme.dirt}${0.08+Math.random()*0.22})`;
    g.fillRect((Math.random()*S)|0, (Math.random()*S)|0, 4, 4);
  }
  // Hielo: parches de escarcha más grandes y sólidos encima de la piedra, para que se note
  // de entrada que está todo congelado y no quede a medio camino entre piedra y hielo.
  if(currentArena==="hielo"){
    for(let i=0;i<14;i++){
      const cx=Math.random()*S, cy=Math.random()*S, r=10+Math.random()*16;
      g.fillStyle = `rgba(210,235,255,${0.10+Math.random()*0.12})`;
      g.beginPath(); g.arc(cx,cy,r,0,Math.PI*2); g.fill();
    }
    g.fillStyle = "rgba(180,220,255,0.06)";
    g.fillRect(0,0,S,S);
  }
  // Arena Acuática: parches de luz caústica (reflejo del agua) sobre la arena del fondo,
  // más un tinte azul profundo general para que se lea "bajo el agua" de entrada.
  if(currentArena==="acuatica"){
    for(let i=0;i<16;i++){
      const cx=Math.random()*S, cy=Math.random()*S, r=8+Math.random()*14;
      g.fillStyle = `rgba(140,230,220,${0.06+Math.random()*0.10})`;
      g.beginPath(); g.ellipse(cx,cy,r,r*0.5,Math.random()*Math.PI,0,Math.PI*2); g.fill();
    }
    g.fillStyle = "rgba(10,40,55,0.14)";
    g.fillRect(0,0,S,S);
  }
  // detalle atrapado entre las piedras: brasas (Infernal), cristales de escarcha (Hielo) o musgo luminoso (Bosque)
  for(let i=0;i<70;i++){
    const x=(Math.random()*S)|0, y=(Math.random()*S)|0;
    g.fillStyle = theme.fleckA; g.fillRect(x, y, 5, 3);
    g.fillStyle = theme.fleckB; g.fillRect(x+1, y+1, 3, 1);
  }
  floorPatterns[currentArena] = ctx.createPattern(t, "repeat");
  floorPattern = floorPatterns[currentArena];
}

/* ============================================================
   ARENA IDENTITY V1 — arte procedural de escenario (pixel art generado una sola vez en canvas
   offscreen y cacheado; en cada frame solo se hace drawImage de lo que está en cámara).
   Cada arena tiene su propio set de piezas: nada de esto es un recoloreo de otra arena.
   ============================================================ */
const AID_ART = {};
// Generador pseudoaleatorio con semilla: el mismo arte/distribución en cada partida de una arena
// (así el jugador aprende el escenario y los tests son reproducibles).
function aidRng(seed){ let s = seed>>>0 || 1; return ()=>{ s ^= s<<13; s>>>=0; s ^= s>>>17; s ^= s<<5; s>>>=0; return (s%100000)/100000; }; }
function aidArt(key, w, h, draw){
  if(AID_ART[key]) return AID_ART[key];
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d"); g.imageSmoothingEnabled = false;
  draw(g, w, h);
  AID_ART[key] = c;
  return c;
}
function aidPx(g, x, y, w, h, col){ g.fillStyle = col; g.fillRect(x|0, y|0, w|0, h|0); }
function aidShade(rgb, f){ return `rgb(${Math.min(255,rgb[0]*f)|0},${Math.min(255,rgb[1]*f)|0},${Math.min(255,rgb[2]*f)|0})`; }
// Mancha orgánica rellena (musgo, nieve, charcos): unión de círculos con borde pixelado
function aidBlob(g, cx, cy, rx, ry, col, rnd, n){
  g.fillStyle = col;
  for(let i=0;i<(n||9);i++){
    const a = rnd()*6.283, d = rnd()*0.55;
    const x = cx + Math.cos(a)*rx*d, y = cy + Math.sin(a)*ry*d;
    const r = (0.35+rnd()*0.45);
    g.beginPath(); g.ellipse(x|0, y|0, (rx*r)|0 || 1, (ry*r)|0 || 1, 0, 0, 6.283); g.fill();
  }
}

// ---------------- INFERNAL ----------------
function aidArtInfColumn(v){
  return aidArt("infColumn"+v, 30, 70, (g,w,h)=>{
    const rnd = aidRng(11+v*7);
    const top = 6 + (rnd()*14|0);           // altura a la que está quebrada
    aidPx(g, 4, h-8, 22, 8, "#1a1110");     // basa
    aidPx(g, 5, h-9, 20, 2, "#3a2622");
    for(let y=top; y<h-8; y++){
      const shade = 0.75 + 0.25*Math.sin(y*0.4);
      aidPx(g, 8, y, 14, 1, aidShade([104,70,58], shade));
      aidPx(g, 8, y, 3, 1, aidShade([150,98,74], shade));
      aidPx(g, 19, y, 3, 1, aidShade([200,80,30], shade*0.8));
    }
    // estrías verticales
    for(let x=11; x<19; x+=3) aidPx(g, x, top, 1, h-8-top, "rgba(0,0,0,0.35)");
    // borde quebrado irregular
    for(let x=8; x<22; x++){ const d = (rnd()*6)|0; aidPx(g, x, top-1, 1, d, "rgba(0,0,0,0)"); g.clearRect(x, top-2, 1, d+2); }
    // grietas con brasa
    for(let i=0;i<3;i++){
      let x = 10+(rnd()*10|0), y = top+6+(rnd()*(h-24-top)|0);
      for(let k=0;k<7;k++){ aidPx(g, x, y, 1, 1, k%2?"#ff7a2a":"#c7300f"); x += (rnd()*3|0)-1; y += 1; }
    }
    // escombros en la base
    for(let i=0;i<5;i++) aidPx(g, 2+(rnd()*24|0), h-4-(rnd()*3|0), 3, 2, i%2?"#2e1f1b":"#4a3128");
  });
}
function aidArtInfAltar(){
  return aidArt("infAltar", 64, 44, (g,w,h)=>{
    const rnd = aidRng(5);
    aidPx(g, 4, 20, 56, 22, "#140c0b");
    aidPx(g, 6, 18, 52, 20, "#3a2420");
    aidPx(g, 6, 18, 52, 4, "#5a3a30");
    aidPx(g, 6, 34, 52, 4, "#241612");
    // runas grabadas brillando
    for(let i=0;i<7;i++){ const x = 10+i*7; aidPx(g, x, 26, 3, 5, "#b3260c"); aidPx(g, x+1, 27, 1, 3, "#ff8a3a"); }
    // cráneo central con cuernos
    aidPx(g, 27, 6, 10, 10, "#d9ceb3"); aidPx(g, 29, 9, 2, 3, "#1a0a08"); aidPx(g, 33, 9, 2, 3, "#1a0a08");
    aidPx(g, 30, 14, 4, 2, "#8a7f6a");
    aidPx(g, 22, 4, 5, 2, "#d9ceb3"); aidPx(g, 20, 1, 3, 4, "#d9ceb3"); aidPx(g, 37, 4, 5, 2, "#d9ceb3"); aidPx(g, 41, 1, 3, 4, "#d9ceb3");
    // velas
    for(const x of [9, 16, 46, 53]){ aidPx(g, x, 12, 3, 7, "#cbb89a"); aidPx(g, x+1, 9, 1, 3, "#ffcf6a"); aidPx(g, x+1, 10, 1, 1, "#ff6a1a"); }
    // cadenas colgando a los costados
    for(const x of [3, 59]) for(let y=16; y<40; y+=3){ aidPx(g, x, y, 2, 2, "#6a6060"); aidPx(g, x, y+1, 1, 1, "#2a2424"); }
    for(let i=0;i<14;i++) aidPx(g, rnd()*60|0, 40+(rnd()*3|0), 2, 1, "#2a1a16");
  });
}
function aidArtInfStatue(){
  return aidArt("infStatue", 34, 62, (g,w,h)=>{
    aidPx(g, 6, h-10, 22, 10, "#1a1110"); aidPx(g, 7, h-11, 20, 2, "#3a2622");
    aidPx(g, 10, 22, 14, 30, "#5a3c32"); aidPx(g, 11, 22, 4, 30, "#8a5e4a"); aidPx(g, 22, 22, 2, 30, "#c0501e");
    aidPx(g, 12, 12, 10, 11, "#5a3c32"); aidPx(g, 13, 12, 3, 11, "#8a5e4a");
    // cuernos
    aidPx(g, 8, 6, 3, 8, "#1c1210"); aidPx(g, 6, 2, 3, 6, "#1c1210"); aidPx(g, 23, 6, 3, 8, "#1c1210"); aidPx(g, 25, 2, 3, 6, "#1c1210");
    // alas plegadas
    aidPx(g, 3, 20, 7, 22, "#3a2622"); aidPx(g, 24, 20, 7, 22, "#3a2622"); aidPx(g, 3, 20, 7, 1, "#8a5e4a"); aidPx(g, 24, 20, 7, 1, "#8a5e4a");
    // ojos encendidos
    aidPx(g, 14, 16, 2, 2, "#ff4a1a"); aidPx(g, 18, 16, 2, 2, "#ff4a1a");
    aidPx(g, 14, 34, 6, 2, "#b3260c");
  });
}
function aidArtInfBrazier(){
  return aidArt("infBrazier", 18, 26, (g,w,h)=>{
    aidPx(g, 3, 8, 12, 5, "#2a2222"); aidPx(g, 2, 7, 14, 2, "#5a4a44"); aidPx(g, 4, 12, 10, 2, "#161010");
    aidPx(g, 8, 13, 2, 9, "#2a2222"); aidPx(g, 4, 21, 10, 2, "#2a2222"); aidPx(g, 3, 23, 2, 3, "#161010"); aidPx(g, 13, 23, 2, 3, "#161010");
    aidPx(g, 4, 6, 10, 2, "#ff7a2a"); aidPx(g, 6, 5, 6, 1, "#ffd27a");
  });
}
function aidArtInfPentagram(){
  return aidArt("infPentagram", 280, 200, (g,w,h)=>{
    const cx = w/2, cy = h/2;
    g.fillStyle = "rgba(10,4,3,0.75)"; g.beginPath(); g.ellipse(cx, cy, 134, 94, 0, 0, 6.283); g.fill();
    g.strokeStyle = "#2a1410"; g.lineWidth = 6; g.beginPath(); g.ellipse(cx, cy, 128, 90, 0, 0, 6.283); g.stroke();
    g.strokeStyle = "#8a1e0c"; g.lineWidth = 3; g.beginPath(); g.ellipse(cx, cy, 120, 84, 0, 0, 6.283); g.stroke();
    g.beginPath(); g.ellipse(cx, cy, 100, 70, 0, 0, 6.283); g.stroke();
    // estrella de 5 puntas
    g.strokeStyle = "#c2310e"; g.lineWidth = 3; g.beginPath();
    for(let i=0;i<=5;i++){ const a = -Math.PI/2 + i*(Math.PI*4/5); const x = cx+Math.cos(a)*98, y = cy+Math.sin(a)*68; if(i===0) g.moveTo(x,y); else g.lineTo(x,y); }
    g.stroke();
    // glifos en el anillo
    g.fillStyle = "#ff6a2a";
    for(let i=0;i<16;i++){ const a = i/16*6.283; const x = cx+Math.cos(a)*110, y = cy+Math.sin(a)*77; g.fillRect(x-2, y-3, 4, 6); g.fillRect(x-3, y-1, 6, 2); }
  });
}
function aidArtInfFissure(v){
  return aidArt("infFissure"+v, 150, 60, (g,w,h)=>{
    const rnd = aidRng(40+v*13);
    let x = 6, y = h/2 + (rnd()-0.5)*16;
    const pts = [];
    while(x < w-6){ pts.push([x,y]); x += 8+rnd()*12; y += (rnd()-0.5)*16; y = Math.max(10, Math.min(h-10, y)); }
    const stroke = (col, lw)=>{ g.strokeStyle = col; g.lineWidth = lw; g.lineJoin = "round"; g.lineCap = "round"; g.beginPath(); pts.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1])); g.stroke(); };
    stroke("rgba(0,0,0,0.9)", 14); stroke("#5a0e04", 9); stroke("#d23a0c", 5); stroke("#ffb050", 2);
    for(const p of pts){ if(rnd()<0.5){ g.fillStyle = "#1a0806"; g.fillRect(p[0]-6+rnd()*4, p[1]+5, 5, 3); } }
  });
}
function aidArtScorch(v){
  return aidArt("scorch"+v, 90, 50, (g,w,h)=>{ const rnd = aidRng(70+v); aidBlob(g, w/2, h/2, 40, 20, "rgba(8,4,3,0.55)", rnd, 10); aidBlob(g, w/2, h/2, 20, 10, "rgba(20,8,4,0.5)", rnd, 6); });
}

// ---------------- HIELO ----------------
function aidArtIcePillar(v){
  return aidArt("icePillar"+v, 30, 80, (g,w,h)=>{
    const rnd = aidRng(90+v*5);
    // varias agujas de hielo de distinta altura
    const spikes = [[9,10,16],[4,26,10],[18,20,10],[13,36,8]];
    spikes.forEach(([x,top,wd],i)=>{
      for(let y=top; y<h-4; y++){
        const t = (y-top)/(h-4-top); const ww = Math.max(2, wd*Math.min(1, t*2.2));
        const x0 = x + (wd-ww)/2;
        aidPx(g, x0, y, ww, 1, i===0 ? "#6fb6e8" : "#5aa0d8");
        aidPx(g, x0, y, Math.max(1,ww*0.35), 1, "#cfeeff");
        aidPx(g, x0+ww-1, y, 1, 1, "#2d6aa0");
      }
    });
    aidPx(g, 2, h-5, 26, 5, "#e8f6ff"); aidPx(g, 4, h-6, 22, 2, "#ffffff");
    for(let i=0;i<6;i++) aidPx(g, 6+(rnd()*18|0), 20+(rnd()*50|0), 1, 3, "#ffffff");
  });
}
function aidArtIceCluster(v){
  return aidArt("iceCluster"+v, 44, 36, (g,w,h)=>{
    const rnd = aidRng(120+v*3);
    for(let i=0;i<6;i++){
      const x = 6+rnd()*30, top = 4+rnd()*18, wd = 4+rnd()*6;
      for(let y=top|0; y<h-3; y++){ const t=(y-top)/(h-3-top), ww=Math.max(1,wd*Math.min(1,t*2)); aidPx(g, x+(wd-ww)/2, y, ww, 1, "#7cc3ee"); aidPx(g, x+(wd-ww)/2, y, Math.max(1,ww*0.3), 1, "#e4f7ff"); }
    }
    aidPx(g, 2, h-4, 40, 4, "#dff2ff");
  });
}
function aidArtIceArch(){
  return aidArt("iceArch", 110, 80, (g,w,h)=>{
    // arco de piedra en ruinas atrapado en un bloque de hielo
    const st = "#6a6f7a", st2 = "#8a909a", st3 = "#40444c";
    aidPx(g, 14, 22, 16, 54, st); aidPx(g, 14, 22, 5, 54, st2); aidPx(g, 26, 22, 4, 54, st3);
    aidPx(g, 80, 30, 16, 46, st); aidPx(g, 80, 30, 5, 46, st2); aidPx(g, 92, 30, 4, 46, st3);
    for(let x=14; x<70; x++){ const y = 22 - Math.sin((x-14)/112*Math.PI)*16; aidPx(g, x, y, 1, 10, st); aidPx(g, x, y, 1, 2, st2); }
    for(let y=6; y<16; y+=3) aidPx(g, 66, y, 8, 2, st3); // arco partido
    // hielo envolvente
    g.fillStyle = "rgba(150,210,245,0.42)";
    g.beginPath(); g.moveTo(6,h-2); g.lineTo(10,30); g.lineTo(24,10); g.lineTo(52,2); g.lineTo(78,14); g.lineTo(102,26); g.lineTo(106,h-2); g.closePath(); g.fill();
    g.strokeStyle = "rgba(230,248,255,0.7)"; g.lineWidth = 1;
    g.beginPath(); g.moveTo(10,30); g.lineTo(24,10); g.lineTo(52,2); g.lineTo(78,14); g.lineTo(102,26); g.stroke();
    for(let i=0;i<8;i++){ aidPx(g, 20+i*10, 20+(i%3)*14, 1, 6, "rgba(255,255,255,0.8)"); }
    aidPx(g, 2, h-6, 106, 6, "#e8f6ff");
  });
}
function aidArtIceStatue(){
  return aidArt("iceStatue", 32, 66, (g,w,h)=>{
    aidPx(g, 6, h-9, 20, 9, "#5a5e68");
    aidPx(g, 10, 22, 12, 36, "#7a7e88"); aidPx(g, 10, 22, 4, 36, "#9aa0a8");
    aidPx(g, 11, 12, 10, 11, "#7a7e88"); aidPx(g, 11, 12, 3, 11, "#9aa0a8");
    aidPx(g, 6, 24, 4, 18, "#6a6e78"); aidPx(g, 22, 24, 4, 18, "#6a6e78");   // brazos
    aidPx(g, 23, 6, 2, 22, "#8a8e98"); aidPx(g, 21, 6, 6, 2, "#8a8e98");      // espada alzada
    g.fillStyle = "rgba(160,215,245,0.45)"; g.fillRect(3, 4, 26, h-6);
    g.fillStyle = "rgba(235,250,255,0.6)"; g.fillRect(4, 5, 2, h-10); g.fillRect(3, 4, 26, 2);
  });
}
function aidArtFrozenLake(){
  return aidArt("frozenLake", 300, 200, (g,w,h)=>{
    const rnd = aidRng(7);
    const cx=w/2, cy=h/2;
    g.fillStyle = "rgba(40,90,140,0.55)"; g.beginPath(); g.ellipse(cx,cy,146,96,0,0,6.283); g.fill();
    g.fillStyle = "rgba(120,190,235,0.55)"; g.beginPath(); g.ellipse(cx,cy-4,136,86,0,0,6.283); g.fill();
    g.fillStyle = "rgba(200,235,255,0.35)"; g.beginPath(); g.ellipse(cx-30,cy-24,60,22,-0.3,0,6.283); g.fill();
    // grietas del hielo
    g.strokeStyle = "rgba(245,252,255,0.75)"; g.lineWidth = 1.2;
    for(let i=0;i<9;i++){
      let x = cx+(rnd()-0.5)*40, y = cy+(rnd()-0.5)*30, a = rnd()*6.283; g.beginPath(); g.moveTo(x,y);
      for(let k=0;k<6;k++){ a += (rnd()-0.5)*0.9; x += Math.cos(a)*18; y += Math.sin(a)*12; g.lineTo(x,y); }
      g.stroke();
    }
    // borde de nieve
    g.strokeStyle = "rgba(240,250,255,0.9)"; g.lineWidth = 5; g.beginPath(); g.ellipse(cx,cy,142,93,0,0,6.283); g.stroke();
  });
}
function aidArtSnowDrift(v){
  return aidArt("snowDrift"+v, 110, 50, (g,w,h)=>{ const rnd = aidRng(200+v); aidBlob(g, w/2, h/2, 50, 20, "rgba(235,246,255,0.55)", rnd, 11); aidBlob(g, w/2, h/2-3, 30, 10, "rgba(255,255,255,0.55)", rnd, 6); });
}
function aidArtIceCrack(v){
  return aidArt("iceCrack"+v, 120, 70, (g,w,h)=>{
    const rnd = aidRng(300+v*9);
    g.strokeStyle = "rgba(10,40,70,0.8)"; g.lineWidth = 3;
    const draw = (x,y,a,n,lw)=>{ g.lineWidth = lw; g.beginPath(); g.moveTo(x,y); for(let k=0;k<n;k++){ a += (rnd()-0.5)*0.8; x += Math.cos(a)*10; y += Math.sin(a)*7; g.lineTo(x,y); if(rnd()<0.25 && lw>1) draw(x,y,a+(rnd()<0.5?1:-1),3,lw-1); } g.stroke(); };
    g.strokeStyle = "rgba(20,60,100,0.85)"; draw(10, h/2, 0, 10, 3);
    g.strokeStyle = "rgba(170,225,255,0.55)"; g.lineWidth = 1; draw(10, h/2-1, 0, 10, 1);
  });
}

// ---------------- BOSQUE ----------------
function aidArtMenhir(v){
  return aidArt("menhir"+v, 24, 60, (g,w,h)=>{
    const rnd = aidRng(400+v*11);
    const top = 4 + (rnd()*6|0);
    for(let y=top; y<h-4; y++){
      const t = (y-top)/(h-4-top); const ww = 10 + t*8 + Math.sin(y*0.3+v)*1.5;
      const x0 = (w-ww)/2;
      aidPx(g, x0, y, ww, 1, "#6a6a62"); aidPx(g, x0, y, 3, 1, "#8a8a80"); aidPx(g, x0+ww-3, y, 3, 1, "#46463f");
    }
    // espiral celta tallada, con brillo de runa
    const cx = w/2, cy = top+18;
    g.strokeStyle = "#9ae07a"; g.lineWidth = 1; g.beginPath();
    for(let a=0; a<12; a+=0.35){ const r = a*0.55; const x = cx+Math.cos(a)*r, y = cy+Math.sin(a)*r; if(a===0) g.moveTo(x,y); else g.lineTo(x,y); }
    g.stroke();
    // musgo
    for(let i=0;i<16;i++){ const y = top + (rnd()*(h-top-6)); const x = (w-14)/2 + rnd()*14; aidPx(g, x, y, 2+(rnd()*3|0), 2, rnd()<0.5?"#3f6a2a":"#5a8a36"); }
    aidPx(g, 2, h-5, 20, 5, "#2e4a22"); aidPx(g, 4, h-6, 16, 2, "#4a7a30");
  });
}
function aidArtAncientTree(v){
  return aidArt("ancientTree"+v, 100, 130, (g,w,h)=>{
    const rnd = aidRng(500+v*17);
    // raíces
    for(let i=0;i<6;i++){ const dir = i<3?-1:1; let x = w/2+dir*(4+i%3*3), y = h-18; g.strokeStyle = "#3a2618"; g.lineWidth = 4-(i%3); g.beginPath(); g.moveTo(x,y); for(let k=0;k<5;k++){ x += dir*(4+rnd()*5); y += 2+rnd()*2; g.lineTo(x,y); } g.stroke(); }
    // tronco grueso y retorcido
    for(let y=48; y<h-14; y++){
      const t = (y-48)/(h-62); const ww = 16 + t*12 + Math.sin(y*0.15)*2;
      const x0 = w/2 - ww/2 + Math.sin(y*0.06+v)*3;
      aidPx(g, x0, y, ww, 1, "#4a3222"); aidPx(g, x0, y, 4, 1, "#6a4a30"); aidPx(g, x0+ww-4, y, 4, 1, "#2a1a10");
      if(y%9===0) aidPx(g, x0+5, y, ww-10, 1, "#3a2618");
    }
    // copa: capas de follaje
    const blobs = [[50,34,40,26,"#1f3a1a"],[34,40,24,18,"#2a4a20"],[66,40,24,18,"#2a4a20"],[50,26,30,18,"#35602a"],[40,20,16,11,"#4a7a34"],[62,24,14,10,"#4a7a34"]];
    for(const [x,y,rx,ry,c] of blobs) aidBlob(g, x, y, rx, ry, c, rnd, 12);
    for(let i=0;i<40;i++){ aidPx(g, 14+rnd()*72, 6+rnd()*50, 2, 2, rnd()<0.5?"#6aa04a":"#8ac060"); }
    // musgos colgantes
    for(let i=0;i<7;i++){ const x = 20+rnd()*60; for(let y=44; y<50+rnd()*14; y++) aidPx(g, x, y, 1, 1, "#4a7a34"); }
  });
}
function aidArtCelticStatue(){
  return aidArt("celticStatue", 30, 64, (g,w,h)=>{
    aidPx(g, 5, h-8, 20, 8, "#4a4a44");
    aidPx(g, 12, 8, 6, h-16, "#727268"); aidPx(g, 12, 8, 2, h-16, "#90907f");
    aidPx(g, 4, 16, 22, 6, "#727268"); aidPx(g, 4, 16, 22, 2, "#90907f");
    g.strokeStyle = "#5a5a52"; g.lineWidth = 2; g.beginPath(); g.arc(15, 19, 9, 0, 6.283); g.stroke();
    g.strokeStyle = "#9ae07a"; g.lineWidth = 1; g.beginPath(); g.arc(15, 19, 4, 0, 6.283); g.stroke();
    for(let i=0;i<14;i++) aidPx(g, 6+Math.random()*18, 10+Math.random()*48, 2, 2, Math.random()<0.5?"#3f6a2a":"#5a8a36");
  });
}
function aidArtRuinArch(){
  return aidArt("ruinArch", 96, 80, (g,w,h)=>{
    const rnd = aidRng(61);
    const st = "#6e6c60", st2 = "#8c8a7c", st3 = "#4a4840";
    aidPx(g, 10, 20, 14, 58, st); aidPx(g, 10, 20, 4, 58, st2); aidPx(g, 20, 20, 4, 58, st3);
    aidPx(g, 72, 34, 14, 44, st); aidPx(g, 72, 34, 4, 44, st2); aidPx(g, 82, 34, 4, 44, st3);
    for(let x=10; x<60; x++){ const y = 20 - Math.sin((x-10)/100*Math.PI)*14; aidPx(g, x, y, 1, 9, st); aidPx(g, x, y, 1, 2, st2); }
    // enredaderas
    for(let i=0;i<5;i++){ let x = 12+rnd()*70, y = 8+rnd()*10; for(let k=0;k<22;k++){ aidPx(g, x, y, 2, 2, k%3?"#3f6a2a":"#6aa04a"); x += (rnd()-0.5)*3; y += 2; } }
    for(let i=0;i<10;i++) aidPx(g, 4+rnd()*88, h-4-rnd()*3, 4, 3, i%2?st3:st);
  });
}
function aidArtRitualCircle(){
  return aidArt("ritualCircle", 300, 210, (g,w,h)=>{
    const rnd = aidRng(3), cx=w/2, cy=h/2;
    g.fillStyle = "rgba(60,62,52,0.8)"; g.beginPath(); g.ellipse(cx,cy,142,98,0,0,6.283); g.fill();
    // losas en anillo
    for(let i=0;i<24;i++){ const a0 = i/24*6.283, a1 = (i+1)/24*6.283-0.03;
      g.fillStyle = i%2 ? "rgba(96,96,84,0.9)" : "rgba(84,84,72,0.9)";
      g.beginPath(); g.ellipse(cx,cy,140,96,0,a0,a1); g.ellipse(cx,cy,104,72,0,a1,a0,true); g.closePath(); g.fill(); }
    g.fillStyle = "rgba(54,56,46,0.95)"; g.beginPath(); g.ellipse(cx,cy,100,69,0,0,6.283); g.fill();
    // nudo celta / trisquel luminoso
    g.strokeStyle = "rgba(150,230,110,0.8)"; g.lineWidth = 3;
    for(let k=0;k<3;k++){ g.beginPath(); for(let a=0; a<9; a+=0.3){ const r=a*5; const ang = a + k*2.094; const x = cx+Math.cos(ang)*r, y = cy+Math.sin(ang)*r*0.69; if(a===0) g.moveTo(x,y); else g.lineTo(x,y); } g.stroke(); }
    g.strokeStyle = "rgba(120,200,90,0.55)"; g.lineWidth = 2; g.beginPath(); g.ellipse(cx,cy,122,84,0,0,6.283); g.stroke();
    // musgo que se come las losas
    for(let i=0;i<10;i++) aidBlob(g, cx+(rnd()-0.5)*260, cy+(rnd()-0.5)*170, 18, 10, "rgba(60,110,40,0.55)", rnd, 5);
  });
}
function aidArtMoss(v){
  return aidArt("moss"+v, 100, 54, (g,w,h)=>{ const rnd = aidRng(600+v); aidBlob(g, w/2, h/2, 46, 22, "rgba(52,96,36,0.55)", rnd, 12); aidBlob(g, w/2, h/2, 24, 12, "rgba(90,140,60,0.45)", rnd, 7);
    for(let i=0;i<12;i++) aidPx(g, 10+rnd()*80, 8+rnd()*38, 2, 2, rnd()<0.3?"#e8e070":(rnd()<0.5?"#d86ab0":"#9ad07a")); });
}
function aidArtRoots(v){
  return aidArt("roots"+v, 160, 80, (g,w,h)=>{
    const rnd = aidRng(700+v*3);
    for(let i=0;i<5;i++){
      let x = 4, y = 20+rnd()*40, a = (rnd()-0.5)*0.4, lw = 5-i*0.6;
      g.strokeStyle = "#2e1e12"; g.lineCap = "round";
      for(let k=0;k<14;k++){ const nx = x+Math.cos(a)*11, ny = y+Math.sin(a)*6; g.lineWidth = Math.max(1, lw*(1-k/16)); g.beginPath(); g.moveTo(x,y); g.lineTo(nx,ny); g.stroke();
        g.strokeStyle = "#4a3222"; g.lineWidth = Math.max(1, lw*(1-k/16)*0.4); g.beginPath(); g.moveTo(x,y-1); g.lineTo(nx,ny-1); g.stroke(); g.strokeStyle = "#2e1e12";
        x = nx; y = ny; a += (rnd()-0.5)*0.7; }
    }
  });
}
function aidArtStream(){
  return aidArt("stream", 420, 90, (g,w,h)=>{
    const pts=[]; for(let x=0;x<=w;x+=14) pts.push([x, h/2 + Math.sin(x/60)*16]);
    const band = (col, lw)=>{ g.strokeStyle = col; g.lineWidth = lw; g.lineJoin="round"; g.beginPath(); pts.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1])); g.stroke(); };
    band("rgba(30,40,24,0.9)", 40); band("rgba(40,90,90,0.9)", 30); band("rgba(70,140,140,0.6)", 16); band("rgba(180,230,220,0.35)", 3);
    // puente natural de raíces a mitad del arroyo
    const bx = w/2;
    for(let i=0;i<5;i++){ g.strokeStyle = i%2?"#4a3222":"#2e1e12"; g.lineWidth = 5; g.beginPath(); g.moveTo(bx-24+i*2, h/2-30); g.quadraticCurveTo(bx+i*3-6, h/2, bx-20+i*9, h/2+30); g.stroke(); }
    for(let i=0;i<8;i++){ g.fillStyle = "#3f6a2a"; g.fillRect(bx-26+i*6, h/2-6+(i%3)*4, 4, 3); }
  });
}

// ---------------- LABERINTO ----------------
function aidArtObelisk(){
  return aidArt("obelisk", 26, 90, (g,w,h)=>{
    aidPx(g, 3, h-8, 20, 8, "#5a4a32"); aidPx(g, 3, h-9, 20, 2, "#8a7450");
    for(let y=12; y<h-8; y++){ const t=(y-12)/(h-20); const ww = 8+t*6; const x0=(w-ww)/2; aidPx(g, x0, y, ww, 1, "#a88a5a"); aidPx(g, x0, y, 2, 1, "#c8a870"); aidPx(g, x0+ww-2, y, 2, 1, "#7a6040"); }
    g.fillStyle = "#e0c070"; g.beginPath(); g.moveTo(w/2, 2); g.lineTo(w/2+4, 12); g.lineTo(w/2-4, 12); g.closePath(); g.fill();
    // jeroglíficos
    for(let y=20; y<h-16; y+=7){ aidPx(g, w/2-2, y, 4, 1, "#5a4428"); aidPx(g, w/2-1, y+2, 2, 2, "#5a4428"); }
  });
}
function aidArtMinotaurChamber(){
  return aidArt("minoChamber", 420, 290, (g,w,h)=>{
    const cx=w/2, cy=h/2, rnd = aidRng(9);
    g.fillStyle = "rgba(60,44,28,0.9)"; g.beginPath(); g.ellipse(cx,cy,204,140,0,0,6.283); g.fill();
    // mosaico de losas radiales
    for(let i=0;i<32;i++){ const a0=i/32*6.283, a1=(i+1)/32*6.283-0.02; g.fillStyle = i%2?"rgba(150,118,72,0.85)":"rgba(128,100,62,0.85)";
      g.beginPath(); g.ellipse(cx,cy,196,134,0,a0,a1); g.ellipse(cx,cy,120,82,0,a1,a0,true); g.closePath(); g.fill(); }
    // disco solar y cuernos de toro (sello del Minotauro)
    g.fillStyle = "rgba(90,60,30,0.95)"; g.beginPath(); g.ellipse(cx,cy,116,80,0,0,6.283); g.fill();
    g.strokeStyle = "#e0b060"; g.lineWidth = 4; g.beginPath(); g.ellipse(cx,cy,70,48,0,0,6.283); g.stroke();
    for(let i=0;i<16;i++){ const a=i/16*6.283; g.beginPath(); g.moveTo(cx+Math.cos(a)*76, cy+Math.sin(a)*52); g.lineTo(cx+Math.cos(a)*104, cy+Math.sin(a)*71); g.stroke(); }
    g.strokeStyle = "#c89048"; g.lineWidth = 6;
    g.beginPath(); g.moveTo(cx-36, cy+6); g.quadraticCurveTo(cx-60, cy-40, cx-20, cy-46); g.stroke();
    g.beginPath(); g.moveTo(cx+36, cy+6); g.quadraticCurveTo(cx+60, cy-40, cx+20, cy-46); g.stroke();
    g.fillStyle = "#c89048"; g.beginPath(); g.ellipse(cx, cy+8, 26, 18, 0, 0, 6.283); g.fill();
    g.fillStyle = "#3a2410"; g.fillRect(cx-12, cy+2, 6, 5); g.fillRect(cx+6, cy+2, 6, 5);
    // grietas y arena acumulada
    g.strokeStyle = "rgba(20,12,6,0.7)"; g.lineWidth = 2;
    for(let i=0;i<8;i++){ let x=cx+(rnd()-0.5)*300, y=cy+(rnd()-0.5)*200; g.beginPath(); g.moveTo(x,y); for(let k=0;k<4;k++){ x+=(rnd()-0.5)*40; y+=(rnd()-0.5)*26; g.lineTo(x,y); } g.stroke(); }
    for(let i=0;i<6;i++) aidBlob(g, cx+(rnd()-0.5)*340, cy+(rnd()-0.5)*220, 30, 14, "rgba(200,170,110,0.35)", rnd, 6);
  });
}
function aidArtSandDrift(v){
  return aidArt("sandDrift"+v, 120, 50, (g,w,h)=>{ const rnd = aidRng(800+v); aidBlob(g, w/2, h/2, 54, 20, "rgba(196,160,100,0.35)", rnd, 10);
    g.strokeStyle = "rgba(230,200,140,0.35)"; g.lineWidth = 1; for(let i=0;i<4;i++){ g.beginPath(); g.moveTo(20+i*6, 14+i*6); g.quadraticCurveTo(60, 8+i*6, 100-i*6, 16+i*6); g.stroke(); } });
}
function aidArtBrokenTiles(v){
  return aidArt("brokenTiles"+v, 80, 50, (g,w,h)=>{ const rnd = aidRng(900+v);
    for(let i=0;i<9;i++){ const x=6+rnd()*60, y=6+rnd()*34, s=6+rnd()*8; aidPx(g, x, y, s, s*0.6, rnd()<0.5?"rgba(150,118,72,0.8)":"rgba(110,86,52,0.8)"); aidPx(g, x, y, s, 1, "rgba(200,170,110,0.6)"); } });
}

// ---------------- ACUÁTICA ----------------
function aidArtSunkColumn(v){
  return aidArt("sunkColumn"+v, 30, 76, (g,w,h)=>{
    const rnd = aidRng(1000+v*7);
    const top = 8 + (rnd()*20|0);
    aidPx(g, 3, h-8, 24, 8, "#3a5054"); aidPx(g, 4, h-9, 22, 2, "#6a8a8a");
    for(let y=top; y<h-8; y++){ aidPx(g, 8, y, 14, 1, "#7a9a98"); aidPx(g, 8, y, 3, 1, "#a0bcb8"); aidPx(g, 19, y, 3, 1, "#4a6664"); }
    for(let x=11; x<19; x+=3) aidPx(g, x, top, 1, h-8-top, "rgba(20,40,40,0.35)");
    for(let x=8; x<22; x++){ const d = (rnd()*5)|0; g.clearRect(x, top-1, 1, d+1); }
    // algas y percebes
    for(let i=0;i<14;i++) aidPx(g, 7+rnd()*16, top+rnd()*(h-top-10), 2, 3, rnd()<0.6?"#2e7a5a":"#4aa07a");
    for(let i=0;i<5;i++) aidPx(g, 7+rnd()*16, top+rnd()*(h-top-10), 2, 2, "#d88aa8");
  });
}
function aidArtTomb(){
  return aidArt("tomb", 56, 36, (g,w,h)=>{
    aidPx(g, 4, 12, 48, 22, "#34484a"); aidPx(g, 4, 10, 48, 6, "#5a7474"); aidPx(g, 4, 10, 48, 2, "#7a9696");
    aidPx(g, 8, 18, 40, 1, "#22302f"); for(let x=10; x<46; x+=6) aidPx(g, x, 22, 3, 6, "#22302f");
    // tapa corrida
    aidPx(g, 2, 6, 44, 6, "#4a6464"); aidPx(g, 2, 6, 44, 2, "#6a8888");
    aidPx(g, 20, 12, 10, 3, "#0a1414");
    for(let i=0;i<10;i++) aidPx(g, 4+Math.random()*48, 10+Math.random()*22, 2, 2, Math.random()<0.5?"#2e7a5a":"#c87aa0");
  });
}
function aidArtCoral(v){
  return aidArt("coral"+v, 44, 40, (g,w,h)=>{
    const rnd = aidRng(1100+v*5);
    const cols = [["#e0607a","#ff9aaa"],["#e08a3a","#ffc070"],["#8a5ae0","#c0a0ff"],["#3ab0a0","#8ae8d8"]][v%4];
    for(let i=0;i<6;i++){ let x = 8+rnd()*28, y = h-3, a = -Math.PI/2+(rnd()-0.5)*0.8; for(let k=0;k<7;k++){ aidPx(g, x, y, 3, 3, k%2?cols[0]:cols[1]); x += Math.cos(a)*4; y += Math.sin(a)*4; a += (rnd()-0.5)*0.7; if(rnd()<0.25){ aidPx(g, x+3, y, 2, 2, cols[1]); } } }
    aidPx(g, 4, h-3, 36, 3, "#4a5a50");
  });
}
function aidArtShipwreck(){
  return aidArt("shipwreck", 150, 80, (g,w,h)=>{
    const wood = "#4a3424", wood2 = "#6a4a30", wood3 = "#2a1c12";
    g.fillStyle = wood3; g.beginPath(); g.moveTo(8,h-6); g.quadraticCurveTo(20,30,70,24); g.lineTo(140,20); g.lineTo(144,h-6); g.closePath(); g.fill();
    for(let y=28; y<h-8; y+=6){ g.strokeStyle = y%12?wood:wood2; g.lineWidth = 4; g.beginPath(); g.moveTo(18,y+(h-y)*0.1); g.lineTo(140,y); g.stroke(); }
    for(let x=30; x<140; x+=18){ aidPx(g, x, 24, 3, h-30, wood3); }
    // mástil partido
    aidPx(g, 92, 2, 5, 26, wood2); aidPx(g, 88, 10, 14, 3, wood);
    // agujeros y algas
    aidPx(g, 60, 40, 14, 10, "#0a1418"); aidPx(g, 104, 44, 10, 8, "#0a1418");
    for(let i=0;i<24;i++) aidPx(g, 14+Math.random()*126, 24+Math.random()*44, 2, 3, Math.random()<0.6?"#2e7a5a":"#4aa07a");
    aidPx(g, 4, h-6, 144, 6, "#3a4e4a");
  });
}
function aidArtSunkTemple(){
  return aidArt("sunkTemple", 340, 230, (g,w,h)=>{
    const cx=w/2, cy=h/2, rnd = aidRng(13);
    g.fillStyle = "rgba(40,66,66,0.85)"; g.beginPath(); g.ellipse(cx,cy,164,110,0,0,6.283); g.fill();
    // mosaico hundido: ondas y un tritón/concha en el centro
    for(let r=0;r<5;r++){ g.strokeStyle = r%2?"rgba(90,150,150,0.7)":"rgba(60,110,110,0.7)"; g.lineWidth = 6; g.beginPath(); g.ellipse(cx,cy,150-r*24,100-r*16,0,0,6.283); g.stroke(); }
    g.fillStyle = "rgba(200,180,130,0.85)";
    for(let i=0;i<9;i++){ const a = -Math.PI + i/8*Math.PI; g.beginPath(); g.moveTo(cx, cy+20); g.lineTo(cx+Math.cos(a)*44, cy+Math.sin(a)*34); g.lineTo(cx+Math.cos(a+0.2)*44, cy+Math.sin(a+0.2)*34); g.closePath(); g.fill(); }
    // losas faltantes y arena encima
    for(let i=0;i<8;i++) aidBlob(g, cx+(rnd()-0.5)*260, cy+(rnd()-0.5)*170, 22, 12, "rgba(170,150,100,0.45)", rnd, 6);
    for(let i=0;i<10;i++) aidPx(g, cx+(rnd()-0.5)*260, cy+(rnd()-0.5)*170, 10, 6, "rgba(10,24,26,0.8)");
  });
}
function aidArtSandRipples(v){
  return aidArt("sandRipples"+v, 130, 60, (g,w,h)=>{ const rnd = aidRng(1200+v); aidBlob(g, w/2, h/2, 60, 24, "rgba(150,140,100,0.30)", rnd, 9);
    g.strokeStyle = "rgba(210,200,150,0.30)"; g.lineWidth = 1.5; for(let i=0;i<5;i++){ g.beginPath(); g.moveTo(14, 12+i*9); g.bezierCurveTo(40, 6+i*9, 80, 18+i*9, 116, 10+i*9); g.stroke(); }
    for(let i=0;i<4;i++){ aidPx(g, 20+rnd()*90, 10+rnd()*40, 4, 3, "#e8d8c0"); } });
}

// ---------------- DIVINA ----------------
function aidArtAngelStatue(){
  return aidArt("angelStatue", 40, 70, (g,w,h)=>{
    aidPx(g, 8, h-10, 24, 10, "#c8c0a8"); aidPx(g, 8, h-11, 24, 2, "#f0e8d0"); aidPx(g, 10, h-7, 20, 2, "#e0b050");
    aidPx(g, 16, 24, 8, 36, "#e8e0cc"); aidPx(g, 16, 24, 3, 36, "#fffaf0");
    aidPx(g, 16, 14, 8, 10, "#e8e0cc");
    // alas
    for(let i=0;i<14;i++){ aidPx(g, 14-i*0.7, 20+i, 3+i*0.4, 2, "#f4f0e4"); aidPx(g, 23+i*0.3, 20+i, 3+i*0.4, 2, "#f4f0e4"); }
    aidPx(g, 18, 8, 4, 2, "#ffd76a"); aidPx(g, 16, 6, 8, 1, "#ffd76a"); // halo
  });
}
function aidArtInfernalSpike(v){
  return aidArt("infSpike"+v, 30, 64, (g,w,h)=>{
    const rnd = aidRng(1300+v);
    for(let i=0;i<3;i++){ const x = 6+i*8+rnd()*3, top = 6+rnd()*20; for(let y=top|0; y<h-4; y++){ const t=(y-top)/(h-4-top), ww=Math.max(1, 7*Math.min(1,t*1.6)); aidPx(g, x+(7-ww)/2, y, ww, 1, "#2a1426"); aidPx(g, x+(7-ww)/2, y, 1, 1, "#5a2448"); } }
    for(let i=0;i<5;i++) aidPx(g, 8+rnd()*14, 20+rnd()*36, 1, 4, "#e02a3a");
    aidPx(g, 2, h-5, 26, 5, "#1a0c16");
  });
}

// ---------------- Estado del escenario (se rearma en buildArenaDecor en cada partida) ----------------
let aidProps = [];   // piezas altas: se ordenan por profundidad junto con las entidades
let aidDecals = [];  // piezas planas del suelo (debajo de todo)
let aidSolids = [];  // obstáculos reales (círculos) — solo los que el diseño marca como sólidos
let aidLights = [];  // charcos de luz aditiva (braseros, antorchas, cristales, runas)
let aidKelp = [];    // algas animadas (Acuática)
const AID_SCALE = 2; // 1 píxel del arte = 2 unidades de mundo (mismo grano que los sprites)
function aidInside(x, y, margin){
  // mismo octágono que clampToArena, con margen hacia adentro
  const nx = x/1.18, ny = y/0.82;
  return Math.hypot(nx, ny) < ARENA_RADIUS*0.94*Math.cos(Math.PI/8) - (margin||0);
}
function aidProp(img, x, y, opts){
  opts = opts || {};
  const s = opts.scale || AID_SCALE;
  const p = { img, x, y, w:img.width*s, h:img.height*s, ay: opts.ay===undefined ? 0.94 : opts.ay, flip: !!opts.flip, alpha: opts.alpha===undefined ? 1 : opts.alpha };
  aidProps.push(p);
  if(opts.solid) aidSolids.push({x, y:y+(opts.solidDy||0), r:opts.solid});
  if(opts.light) aidLights.push({x, y:y+(opts.light.dy||0), r:opts.light.r, rgb:opts.light.rgb, a:opts.light.a||0.5, flick:opts.light.flick||0, ph:Math.random()*6});
  return p;
}
function aidDecal(img, x, y, opts){
  opts = opts || {};
  const s = opts.scale || AID_SCALE;
  aidDecals.push({ img, x, y, w:img.width*s, h:img.height*s, alpha: opts.alpha===undefined ? 1 : opts.alpha, flip: !!opts.flip });
}
// Punto libre: dentro del octágono, lejos del centro (spawn de los héroes) y de los sólidos ya puestos
function aidFreeSpot(rnd, rMin, rMax, clearance, tries){
  for(let t=0;t<(tries||40);t++){
    const a = rnd()*6.283, r = rMin + rnd()*(rMax-rMin);
    const x = Math.cos(a)*r*1.18, y = Math.sin(a)*r*0.82;
    if(!aidInside(x, y, 60)) continue;
    if(aidSolids.some(s=>Math.hypot(s.x-x, s.y-y) < s.r+clearance)) continue;
    if(labyrinthWalls.some(w=>aidPointInWall(w, x, y, clearance))) continue;
    return {x, y};
  }
  return null;
}
function aidOnRing(rx, ry, a){ return {x:Math.cos(a)*rx*1.18, y:Math.sin(a)*ry*0.82}; }

// ---------------- Armado por arena ----------------
function aidBuild(){
  aidProps = []; aidDecals = []; aidSolids = []; aidLights = []; aidKelp = [];
  const A = currentArena;
  if(A==="infernal") aidBuildInfernal();
  else if(A==="hielo") aidBuildHielo();
  else if(A==="bosque") aidBuildBosque();
  else if(A==="laberinto") aidBuildLaberinto();
  else if(A==="acuatica") aidBuildAcuatica();
  else if(A==="divina") aidBuildDivina();
  aidNavBuild();
  aidAmbReset();
}
function aidBuildInfernal(){
  const rnd = aidRng(666);
  aidDecal(aidArtInfPentagram(), 0, 0, {scale:1.9});
  aidProp(aidArtInfAltar(), 0, -175, {solid:40, solidDy:-12, light:{r:150, rgb:"255,90,30", a:0.55, flick:0.25, dy:-40}});
  // columnas demoníacas quebradas: anillo irregular alrededor del altar (lectura de "coliseo caído")
  for(let i=0;i<9;i++){
    if(i===2 || i===6) continue; // huecos anchos para entrar/salir
    const a = i/9*6.283 + 0.2;
    const p = aidOnRing(520, 520, a);
    aidProp(aidArtInfColumn(i%4), p.x, p.y, {solid:20});
    if(i%2===0) aidProp(aidArtInfBrazier(), p.x+(Math.cos(a)>0?-44:44), p.y+20, {solid:12, light:{r:120, rgb:"255,120,40", a:0.55, flick:0.35, dy:-36}});
  }
  // estatuas de demonio en las diagonales, mirando al centro
  [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([sx,sy])=>{ const p = aidOnRing(780, 780, Math.atan2(sy, sx)); aidProp(aidArtInfStatue(), p.x, p.y, {solid:20, flip:sx>0, light:{r:70, rgb:"255,60,20", a:0.35, flick:0.2, dy:-90}}); });
  // fisuras de lava grandes (además de las venas finas de siempre) y quemaduras
  for(let i=0;i<9;i++){ const s = aidFreeSpot(rnd, 260, 860, 60); if(s){ aidDecal(aidArtInfFissure(i%4), s.x, s.y, {flip:rnd()<0.5}); aidLights.push({x:s.x, y:s.y, r:100, rgb:"255,90,20", a:0.3, flick:0.3, ph:rnd()*6, fissure:true}); } }
  for(let i=0;i<16;i++){ const s = aidFreeSpot(rnd, 180, 880, 20); if(s) aidDecal(aidArtScorch(i%5), s.x, s.y, {alpha:0.9}); }
}
function aidBuildHielo(){
  const rnd = aidRng(777);
  aidDecal(aidArtFrozenLake(), 0, 0, {scale:1.9});
  // ruina atrapada en el hielo (hito al norte): los dos pilares del arco son sólidos
  aidProp(aidArtIceArch(), 0, -330, {light:{r:140, rgb:"150,210,255", a:0.35, dy:-60}});
  aidSolids.push({x:-66, y:-338, r:18}, {x:66, y:-338, r:18});
  // tres glaciares: arcos de agujas de hielo que parten la arena en zonas
  [0.55, 2.65, 4.45].forEach((a0,gi)=>{
    for(let k=0;k<4;k++){
      const a = a0 + (k-1.5)*0.16;
      const p = aidOnRing(610+(k%2)*40, 610+(k%2)*40, a);
      aidProp(aidArtIcePillar((gi*4+k)%5), p.x, p.y, {solid:18, light: k===1 ? {r:110, rgb:"120,200,255", a:0.35, dy:-70} : null});
    }
  });
  // estatuas congeladas en las diagonales interiores
  [0.8, 2.35, 3.9, 5.5].forEach((a,i)=>{ const p = aidOnRing(420, 420, a); aidProp(aidArtIceStatue(), p.x, p.y, {solid:16, flip:i%2===1}); });
  // cristales bajos decorativos (sin colisión) y nieve acumulada / grietas
  for(let i=0;i<12;i++){ const s = aidFreeSpot(rnd, 250, 880, 40); if(s) aidProp(aidArtIceCluster(i%4), s.x, s.y, {light: i%3===0 ? {r:60, rgb:"160,220,255", a:0.3, dy:-20} : null}); }
  for(let i=0;i<18;i++){ const s = aidFreeSpot(rnd, 120, 900, 10); if(s) aidDecal(aidArtSnowDrift(i%5), s.x, s.y); }
  for(let i=0;i<12;i++){ const s = aidFreeSpot(rnd, 200, 880, 10); if(s) aidDecal(aidArtIceCrack(i%4), s.x, s.y, {flip:rnd()<0.5}); }
}
function aidBuildBosque(){
  const rnd = aidRng(333);
  aidDecal(aidArtRitualCircle(), 0, 0, {scale:1.9});
  // círculo de menhires alrededor del círculo ritual: el hito del bosque
  for(let i=0;i<8;i++){ const a = i/8*6.283 + Math.PI/8; const p = aidOnRing(300, 300, a);
    aidProp(aidArtMenhir(i%5), p.x, p.y, {solid:14, light: i%2===0 ? {r:70, rgb:"140,230,110", a:0.32, flick:0.15, dy:-40} : null}); }
  // árboles antiguos gigantes cerca del borde
  [0.3, 1.2, 2.1, 3.0, 3.9, 4.8, 5.6].forEach((a,i)=>{ const p = aidOnRing(730+(i%2)*60, 730+(i%2)*60, a); aidProp(aidArtAncientTree(i%3), p.x, p.y, {solid:26, flip:i%2===1}); });
  // ruinas: arco caído (pilares sólidos) y estatuas celtas
  aidProp(aidArtRuinArch(), -560, 250); aidSolids.push({x:-560-50, y:252, r:14}, {x:-560+52, y:252, r:14});
  aidProp(aidArtRuinArch(), 540, -300, {flip:true}); aidSolids.push({x:540-52, y:-298, r:14}, {x:540+50, y:-298, r:14});
  [[-300,-420],[330,430],[-760,-60]].forEach(([x,y])=>aidProp(aidArtCelticStatue(), x, y, {solid:14, light:{r:60, rgb:"140,230,110", a:0.28, dy:-38}}));
  // arroyo con puente natural de raíces (decorativo, se cruza caminando)
  aidDecal(aidArtStream(), 420, 470, {scale:1.5});
  for(let i=0;i<24;i++){ const s = aidFreeSpot(rnd, 160, 900, 10); if(s) aidDecal(aidArtMoss(i%6), s.x, s.y, {flip:rnd()<0.5}); }
  for(let i=0;i<10;i++){ const s = aidFreeSpot(rnd, 380, 900, 20); if(s) aidDecal(aidArtRoots(i%4), s.x, s.y, {flip:rnd()<0.5}); }
}
function aidBuildLaberinto(){
  const rnd = aidRng(222);
  aidDecal(aidArtMinotaurChamber(), 0, 0, {scale:1.7});
  // obeliscos en las cuatro esquinas de la cámara del Minotauro
  [[-240,-160],[240,-160],[-240,160],[240,160]].forEach(([x,y])=>aidProp(aidArtObelisk(), x, y, {solid:14, light:{r:90, rgb:"255,200,110", a:0.3, dy:-150}}));
  for(let i=0;i<18;i++){ const s = aidFreeSpot(rnd, 280, 900, 30); if(s) aidDecal(aidArtSandDrift(i%5), s.x, s.y, {flip:rnd()<0.5}); }
  for(let i=0;i<12;i++){ const s = aidFreeSpot(rnd, 300, 900, 30); if(s) aidDecal(aidArtBrokenTiles(i%4), s.x, s.y); }
  // antorchas en las puntas de los muros (luz cálida titilante)
  for(const w of labyrinthWalls){
    if(w.torch){ aidLights.push({x:w.torch.x, y:w.torch.y, r:150, rgb:"255,170,80", a:0.5, flick:0.35, ph:rnd()*6, torch:true}); }
  }
}
function aidBuildAcuatica(){
  const rnd = aidRng(444);
  aidDecal(aidArtSunkTemple(), 0, 0, {scale:1.8});
  // columnas hundidas alrededor del templo
  for(let i=0;i<7;i++){ if(i===3) continue; const a = i/7*6.283 - 0.3; const p = aidOnRing(390, 390, a); aidProp(aidArtSunkColumn(i%4), p.x, p.y, {solid:16}); }
  // tumbas / sarcófagos
  [[-640,-260],[700,-120],[-380,520],[420,560],[60,-640]].forEach(([x,y],i)=>aidProp(aidArtTomb(), x, y, {solid:26, flip:i%2===1, light: i%2===0 ? {r:70, rgb:"90,220,200", a:0.25, dy:-10} : null}));
  // barco hundido contra el borde
  aidProp(aidArtShipwreck(), -760, 470, {solid:46, solidDy:-16});
  aidSolids.push({x:-690, y:458, r:30}, {x:-830, y:470, r:30});
  // corales (decorativos) y algas que se mecen
  for(let i=0;i<16;i++){ const s = aidFreeSpot(rnd, 240, 900, 40); if(s) aidProp(aidArtCoral(i%4), s.x, s.y, {light: i%4===0 ? {r:60, rgb:"255,140,190", a:0.22, dy:-20} : null}); }
  for(let i=0;i<18;i++){ const s = aidFreeSpot(rnd, 260, 900, 30); if(s) aidKelp.push({x:s.x, y:s.y, h:60+rnd()*70, ph:rnd()*6, n:2+(rnd()*2|0)}); }
  for(let i=0;i<16;i++){ const s = aidFreeSpot(rnd, 150, 900, 10); if(s) aidDecal(aidArtSandRipples(i%5), s.x, s.y, {flip:rnd()<0.5}); }
}
function aidBuildDivina(){
  const rnd = aidRng(999);
  for(let i=0;i<10;i++){ const x = (i%2?1:-1)*(200+rnd()*820), y = 120+rnd()*560; if(Math.abs(x)>110 && aidInside(x,y,60)) aidDecal(aidArtCelRune(), x, y, {alpha:0.9}); }
  for(let i=0;i<10;i++){ const x = (i%2?1:-1)*(200+rnd()*820), y = -(120+rnd()*560); if(Math.abs(x)>110 && aidInside(x,y,60)) aidDecal(aidArtCorruptPool(i%4), x, y); }
  // Bando celestial (sur, el tuyo) y bando corrupto (norte, el rival): estatuas de ángel de un
  // lado, púas infernales del otro, siempre fuera de las calles por donde avanzan las oleadas.
  [[-560,430],[560,430],[-820,180],[820,180]].forEach(([x,y],i)=>aidProp(aidArtAngelStatue(), x, y, {solid:16, flip:x>0, light:{r:90, rgb:"255,220,140", a:0.3, dy:-80}}));
  [[-560,-430],[560,-430],[-820,-180],[820,-180]].forEach(([x,y],i)=>aidProp(aidArtInfernalSpike(i), x, y, {solid:16, flip:x>0, light:{r:80, rgb:"230,40,70", a:0.3, dy:-40}}));
}

// ---------------- Muros del Laberinto (diseñados, no al azar) ----------------
// Pasillos y cámaras de piedra en vez de tabiques sueltos: anillo interior que encierra la cámara
// del Minotauro (4 entradas), anillo exterior con entradas desfasadas (obliga a recorrer los
// pasillos) y espolones que arman plazas chicas / zonas de emboscada.
function aidLabyrinthLayout(){
  const T = 30; // grosor
  const H = (x0, x1, y, torch)=>({ x:(x0+x1)/2, y, len:Math.abs(x1-x0), thick:T, rot:0, axis:"h", torch: torch ? {x:torch<0?Math.min(x0,x1):Math.max(x0,x1), y:y-18} : null });
  const V = (x, y0, y1, torch)=>({ x, y:(y0+y1)/2, len:Math.abs(y1-y0), thick:T, rot:Math.PI/2, axis:"v", torch: torch ? {x, y:(torch<0?Math.min(y0,y1):Math.max(y0,y1))-18} : null });
  return [
    // anillo interior (cámara del Minotauro), entradas en el centro de cada lado
    H(-430,-120,-310,-1), H(120,430,-310,1), H(-430,-120,310,-1), H(120,430,310,1),
    V(-430,-310,-100), V(-430,100,310), V(430,-310,-100), V(430,100,310),
    // anillo exterior, entradas desfasadas respecto del interior
    H(-800,-440,-570,1), H(-220,220,-570), H(440,800,-570,-1),
    H(-800,-240,570,1), H(0,800,570,-1),
    V(-800,-570,-170,1), V(-800,170,570,-1),
    V(800,-570,-320,1), V(800,-110,570,-1),
    // espolones: plazas y zonas de emboscada entre los dos anillos
    V(0,-570,-430), H(-800,-620,0), H(620,800,-210), V(-230,430,570), V(600,330,570),
  ];
}
function aidPointInWall(w, x, y, pad){
  const hw = (w.axis==="v" ? w.thick : w.len)/2 + (pad||0), hh = (w.axis==="v" ? w.len : w.thick)/2 + (pad||0);
  return Math.abs(x-w.x) < hw && Math.abs(y-w.y) < hh;
}
function aidWallAABB(w){
  const ww = w.axis==="v" ? w.thick : w.len, hh = w.axis==="v" ? w.len : w.thick;
  return {x0:w.x-ww/2, y0:w.y-hh/2, x1:w.x+ww/2, y1:w.y+hh/2};
}
const AID_WALL_H = 46; // alto visual de los muros (la colisión es solo la planta)
function aidDrawWall(w, now){
  const b = aidWallAABB(w);
  const H = AID_WALL_H, W = b.x1-b.x0, D = b.y1-b.y0;
  ctx.save();
  // sombra proyectada hacia el sur
  ctx.fillStyle = "rgba(0,0,0,0.38)"; ctx.fillRect(b.x0+6, b.y1-4, W, 14);
  // cara frontal (lado sur, lo que se ve de frente en la vista 3/4)
  ctx.fillStyle = "#6a5234"; ctx.fillRect(b.x0, b.y1-H, W, H);
  ctx.fillStyle = "#57422a";
  for(let y=b.y1-H+10; y<b.y1; y+=12) ctx.fillRect(b.x0, y, W, 2);                 // hiladas de sillares
  for(let row=0; row<4; row++){ const off = row%2 ? 14 : 0; for(let x=b.x0+off; x<b.x1; x+=28) ctx.fillRect(x, b.y1-H+row*12, 2, 10); }
  // friso de meandro (greca) en la parte alta del frente
  ctx.fillStyle = "#b8904e"; ctx.fillRect(b.x0, b.y1-H, W, 5);
  ctx.fillStyle = "#3a2a18";
  for(let x=b.x0+2; x<b.x1-8; x+=12){ ctx.fillRect(x, b.y1-H+1, 8, 1); ctx.fillRect(x+7, b.y1-H+1, 1, 3); ctx.fillRect(x+3, b.y1-H+3, 5, 1); }
  // cara superior (toda la planta, desplazada hacia arriba el alto del muro)
  ctx.fillStyle = "#a88758"; ctx.fillRect(b.x0, b.y0-H, W, D);
  ctx.fillStyle = "#c4a06a"; ctx.fillRect(b.x0, b.y0-H, W, 3);
  ctx.fillStyle = "rgba(60,40,20,0.35)";
  for(let x=b.x0+20; x<b.x1-4; x+=40) ctx.fillRect(x, b.y0-H+4, 2, D-6);
  if(w.axis==="v") for(let y=b.y0-H+30; y<b.y1-H-4; y+=40) ctx.fillRect(b.x0+3, y, W-6, 2);
  // pilastras en las puntas
  for(const px of [b.x0, b.x1-12]){ ctx.fillStyle = "#7e6240"; ctx.fillRect(px, b.y1-H-6, 12, H+6); ctx.fillStyle = "#c8a46c"; ctx.fillRect(px, b.y1-H-8, 12, 4); }
  // antorcha
  if(w.torch){
    const f = 0.65+0.35*Math.sin(now*9+w.x*0.1);
    const tx = w.torch.x, ty = b.y1-H+14;
    ctx.fillStyle = "#3a2410"; ctx.fillRect(tx-2, ty, 4, 12);
    ctx.fillStyle = `rgba(255,${130+80*f|0},40,0.95)`; ctx.fillRect(tx-4, ty-8*f-4, 8, 8*f+4);
    ctx.fillStyle = "rgba(255,240,170,0.9)"; ctx.fillRect(tx-2, ty-5*f-2, 4, 5*f);
  }
  ctx.restore();
}

// ---------------- Dibujo ----------------
function aidDrawDecals(){
  for(const d of aidDecals){
    if(!inView(d.x, d.y, Math.max(d.w, d.h)*0.5+20)) continue;
    ctx.save();
    if(d.alpha!==1) ctx.globalAlpha = d.alpha;
    ctx.imageSmoothingEnabled = false;
    if(d.flip){ ctx.translate(d.x, d.y); ctx.scale(-1,1); ctx.drawImage(d.img, -d.w/2, -d.h/2, d.w, d.h); }
    else ctx.drawImage(d.img, d.x-d.w/2, d.y-d.h/2, d.w, d.h);
    ctx.restore();
  }
}
function aidDrawLights(now){
  if(!aidLights.length) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const rich = vfxLoad > 0.8; // con carga, solo las luces principales (braseros, altar, antorchas)
  for(const L of aidLights){
    if(!rich && L.a < 0.4) continue;
    if(!inView(L.x, L.y, L.r)) continue;
    const f = 1 - L.flick*0.5 + L.flick*0.5*Math.sin(now*(L.torch?11:3.2)+L.ph)*Math.sin(now*1.7+L.ph*2);
    ctx.globalAlpha = Math.max(0, L.a*f);
    const r = L.r*(0.92+0.08*f);
    ctx.drawImage(glowSprite(L.rgb), L.x-r, L.y-r*0.62, r*2, r*1.24);
  }
  ctx.restore();
}
function aidDrawProp(p){
  ctx.save();
  if(p.alpha!==1) ctx.globalAlpha = p.alpha;
  ctx.imageSmoothingEnabled = false;
  // sombra de contacto
  ctx.fillStyle = "rgba(0,0,0,0.32)";
  ctx.beginPath(); ctx.ellipse(p.x, p.y+2, p.w*0.34, Math.max(5, p.w*0.1), 0, 0, 6.283); ctx.fill();
  if(p.flip){ ctx.translate(p.x, p.y); ctx.scale(-1,1); ctx.drawImage(p.img, -p.w/2, -p.h*p.ay, p.w, p.h); }
  else ctx.drawImage(p.img, p.x-p.w/2, p.y-p.h*p.ay, p.w, p.h);
  ctx.restore();
}
function aidDrawKelp(k, now){
  ctx.save();
  ctx.lineCap = "round";
  for(let j=0;j<k.n;j++){
    const ox = (j-(k.n-1)/2)*8;
    ctx.strokeStyle = j%2 ? "rgba(40,120,80,0.85)" : "rgba(60,150,100,0.85)";
    ctx.lineWidth = 4-j*0.6;
    ctx.beginPath(); ctx.moveTo(k.x+ox, k.y);
    const segs = 6;
    for(let s=1;s<=segs;s++){ const t = s/segs; const sw = Math.sin(now*1.3 + k.ph + t*2.4 + j)*14*t; ctx.lineTo(k.x+ox+sw, k.y - k.h*t); }
    ctx.stroke();
  }
  ctx.restore();
}
// piezas altas que están en cámara → al orden por profundidad de render()
function aidPushTall(){
  for(const p of aidProps){ if(inView(p.x, p.y-p.h*0.5, Math.max(p.w, p.h))) _entPush(p.y, null, null, null, p); }
  for(const w of labyrinthWalls){ const b = aidWallAABB(w); if(inView(w.x, w.y, Math.max(b.x1-b.x0, b.y1-b.y0)*0.5+80)) _entPush(b.y1, null, null, null, w); }
  for(const k of aidKelp){ if(inView(k.x, k.y-k.h*0.5, k.h)) _entPush(k.y, null, null, null, k); }
  // Divina: torres y castillos se ordenan con los personajes (antes se dibujaban siempre debajo)
  if(currentArena==="divina") for(const s of divinaStructures){ if(inView(s.x, s.y, 200)) _entPush(s.y, null, null, null, {divStruct:s}); }
}
function aidDrawTall(it, now){
  if(it.divStruct){ const s = it.divStruct; if(s.type==="castle") drawDivinaCastle(s, now); else drawDivinaTower(s, now); return; }
  if(it.img) aidDrawProp(it);
  else if(it.axis) aidDrawWall(it, now);
  else if(it.h && it.n) aidDrawKelp(it, now);
}

// ---------------- Navegación de enemigos (campo de flujo) ----------------
// Antes los enemigos iban en línea recta al objetivo y atravesaban los muros del Laberinto. Ahora,
// en arenas con geometría real, se calcula cada ~0.3 s un campo de distancias (BFS en una grilla
// de 40 u) desde los héroes vivos; un enemigo sin línea de vista sigue el gradiente para rodear
// muros y obstáculos. Con vista directa sigue yendo derecho (mismo comportamiento de siempre).
// Los jefes (rank "jefe") no navegan ni chocan: embisten a través de todo y siempre llegan.
const AID_NAV = { cell:40, x0:-1340, y0:-940, W:67, H:47, on:false, blocked:null, dist:null, queue:null, t:0 };
function aidNavBuild(){
  const N = AID_NAV;
  N.on = !!(aidSolids.length || labyrinthWalls.length);
  if(!N.on) return;
  const n = N.W*N.H;
  if(!N.blocked){ N.blocked = new Uint8Array(n); N.dist = new Uint16Array(n); N.distP = new Uint16Array(n); N.queue = new Int32Array(n); }
  const pad = 20;
  for(let j=0;j<N.H;j++) for(let i=0;i<N.W;i++){
    const x = N.x0 + (i+0.5)*N.cell, y = N.y0 + (j+0.5)*N.cell;
    let b = !aidInside(x, y, 0);
    if(!b) for(const s of aidSolids){ if(Math.hypot(s.x-x, s.y-y) < s.r+pad){ b = true; break; } }
    if(!b) for(const w of labyrinthWalls){ if(aidPointInWall(w, x, y, pad)){ b = true; break; } }
    N.blocked[j*N.W+i] = b ? 1 : 0;
  }
  N.t = 0;
}
function aidNavCell(x, y){
  const N = AID_NAV;
  const i = Math.floor((x-N.x0)/N.cell), j = Math.floor((y-N.y0)/N.cell);
  if(i<0 || j<0 || i>=N.W || j>=N.H) return -1;
  return j*N.W+i;
}
function aidNavUpdate(dt){
  const N = AID_NAV;
  if(!N.on) return;
  N.t -= dt;
  if(N.t > 0) return;
  N.t = 300;
  aidNavBfs(N.dist, (seed)=>{
    for(const h of heroes) seed(h);
    if(divinaMode) for(const st of divinaStructures){ if(st.alive && st.side==="player") seed(st); }
  });
  aidNavBfs(N.distP, (seed)=>seed(player)); // campo aparte hacia el jugador: lo usan los aliados bot
}
function aidNavBfs(dist, seeder){
  const N = AID_NAV, INF = 65535;
  dist.fill(INF);
  let qh = 0, qt = 0;
  seeder((h)=>{ if(!h || !h.alive) return; const c = aidNavCell(h.x, h.y); if(c>=0 && dist[c]===INF){ dist[c] = 0; N.queue[qt++] = c; } });
  while(qh < qt){
    const c = N.queue[qh++], d = dist[c]+1;
    const i = c % N.W, j = (c - i)/N.W;
    if(i>0){ const k=c-1; if(!N.blocked[k] && dist[k]===INF){ dist[k]=d; N.queue[qt++]=k; } }
    if(i<N.W-1){ const k=c+1; if(!N.blocked[k] && dist[k]===INF){ dist[k]=d; N.queue[qt++]=k; } }
    if(j>0){ const k=c-N.W; if(!N.blocked[k] && dist[k]===INF){ dist[k]=d; N.queue[qt++]=k; } }
    if(j<N.H-1){ const k=c+N.W; if(!N.blocked[k] && dist[k]===INF){ dist[k]=d; N.queue[qt++]=k; } }
  }
}
const _aidDir = {x:0, y:0};
function aidNavDir(e, field){
  const N = AID_NAV;
  const D = field || N.dist;
  const c = aidNavCell(e.x, e.y);
  if(c<0) return null;
  const i = c % N.W, j = (c - i)/N.W;
  let best = -1, bd = D[c];
  if(N.blocked[c]) bd = 65534; // metido en el borde inflado de un obstáculo: salir hacia la mejor celda
  for(let dj=-1; dj<=1; dj++) for(let di=-1; di<=1; di++){
    if(!di && !dj) continue;
    const ii = i+di, jj = j+dj;
    if(ii<0 || jj<0 || ii>=N.W || jj>=N.H) continue;
    const k = jj*N.W+ii;
    if(N.blocked[k]) continue;
    // diagonal solo si no corta una esquina bloqueada
    if(di && dj && (N.blocked[j*N.W+ii] || N.blocked[jj*N.W+i])) continue;
    if(D[k] < bd){ bd = D[k]; best = k; }
  }
  if(best<0) return null;
  const bi = best % N.W, bj = (best - bi)/N.W;
  const tx = N.x0 + (bi+0.5)*N.cell, ty = N.y0 + (bj+0.5)*N.cell;
  const dx = tx-e.x, dy = ty-e.y, d = Math.hypot(dx, dy) || 1;
  _aidDir.x = dx/d; _aidDir.y = dy/d;
  return _aidDir;
}
// ¿Hay línea libre entre dos puntos? (muestreo sobre la grilla ya inflada)
function aidLineClear(x0, y0, x1, y1){
  const N = AID_NAV;
  const d = Math.hypot(x1-x0, y1-y0), steps = Math.ceil(d/(N.cell*0.75));
  for(let s=1; s<steps; s++){
    const t = s/steps, c = aidNavCell(x0+(x1-x0)*t, y0+(y1-y0)*t);
    if(c>=0 && N.blocked[c]) return false;
  }
  return true;
}
// Paso de movimiento genérico de un enemigo que persigue (reemplaza el "ir derecho" de siempre
// solo cuando la arena tiene geometría; si no, es exactamente el mismo movimiento de antes).
function aidEnemyStep(e, dx, dy, dist, spd, dt){
  let mx = dx/dist, my = dy/dist;
  if(AID_NAV.on && e.rank!=="jefe"){
    e._navT = (e._navT||0) - dt;
    if(e._navT <= 0){ e._navT = 180 + Math.random()*140; e._navBlocked = !aidLineClear(e.x, e.y, e.x+dx, e.y+dy); }
    if(e._navBlocked){ const d = aidNavDir(e); if(d){ mx = d.x; my = d.y; } }
    // suavizado del giro para que no zigzaguee entre celdas
    if(e._nmx===undefined){ e._nmx = mx; e._nmy = my; }
    e._nmx = e._nmx*0.72 + mx*0.28; e._nmy = e._nmy*0.72 + my*0.28;
    const l = Math.hypot(e._nmx, e._nmy) || 1; mx = e._nmx/l; my = e._nmy/l;
  }
  e.x += mx*spd*dt/1000; e.y += my*spd*dt/1000;
  if(AID_NAV.on && e.rank!=="jefe") aidCollideEnemy(e);
}
// Aliados bot: si no tienen línea libre hacia el jugador (muro/obstáculo en el medio) y se están
// moviendo para acercarse, siguen el campo de flujo del jugador en vez de empujar contra la pared.
function aidAllyDir(h, mx, my){
  if(!AID_NAV.on || !AID_NAV.distP) return null;
  h._navT = (h._navT||0) - 16;
  if(h._navT <= 0){ h._navT = 200; h._navBlocked = Math.hypot(player.x-h.x, player.y-h.y) > 90 && !aidLineClear(h.x, h.y, player.x, player.y); }
  if(!h._navBlocked) return null;
  // solo si el movimiento pedido va más o menos hacia el jugador (no al huir de un enemigo)
  const px = player.x-h.x, py = player.y-h.y, pl = Math.hypot(px,py)||1;
  if(mx*px/pl + my*py/pl < 0.2) return null;
  return aidNavDir(h, AID_NAV.distP);
}
// ---------------- Colisión ----------------
function aidResolveCircles(ent, k){
  if(!aidSolids.length) return;
  const rr = (ent.radius||18)*(k||0.8);
  for(const s of aidSolids){
    const dx = ent.x-s.x, dy = ent.y-s.y, min = s.r+rr, d2 = dx*dx+dy*dy;
    if(d2 < min*min){ const d = Math.sqrt(d2) || 0.01; ent.x = s.x + dx/d*min; ent.y = s.y + dy/d*min; }
  }
}
function aidResolveWalls(ent, k){
  if(!labyrinthWalls.length) return;
  const rad = (ent.radius||18)*(k||0.8);
  for(const w of labyrinthWalls){
    const hw = (w.axis==="v" ? w.thick : w.len)/2 + rad, hh = (w.axis==="v" ? w.len : w.thick)/2 + rad;
    const lx = ent.x-w.x, ly = ent.y-w.y;
    if(Math.abs(lx) < hw && Math.abs(ly) < hh){
      const ox = hw-Math.abs(lx), oy = hh-Math.abs(ly);
      if(ox < oy) ent.x = w.x + (lx>0 ? hw : -hw); else ent.y = w.y + (ly>0 ? hh : -hh);
    }
  }
}
function aidCollideEnemy(e){ aidResolveCircles(e, 0.8); aidResolveWalls(e, 0.7); }

// ---------------- Ambiente dinámico (pool fijo, presupuesto según carga) ----------------
const AID_AMB_MAX = 150;
const aidAmb = [];
for(let i=0;i<AID_AMB_MAX;i++) aidAmb.push({on:false, x:0, y:0, vx:0, vy:0, life:0, max:1, k:0, s:1, ph:0});
let aidAmbN = 0, aidEruptT = 0, aidWind = 0;
// presupuesto base por arena (se multiplica por vfxLoad: con hordas o FPS bajos, baja solo)
const AID_AMB_BUDGET = { infernal:70, hielo:120, bosque:60, laberinto:50, acuatica:60, divina:60 };
function aidAmbReset(){ for(const p of aidAmb) p.on = false; aidAmbN = 0; aidEruptT = 1500; }
// kinds: 1 ceniza, 2 copo de nieve, 3 ráfaga (línea de viento), 4 hoja, 5 luciérnaga, 6 polvo,
// 7 mota marina, 8 mota sagrada (dorada), 9 brasa infernal (divina norte)
function aidAmbSpawn(p, A, fresh){
  const hw = VW/2/CAM_ZOOM + 60, hh = VH/2/CAM_ZOOM + 60;
  const rx = player.x + (Math.random()*2-1)*hw, ry = player.y + (Math.random()*2-1)*hh;
  p.on = true; p.ph = Math.random()*6.283; p.x = rx; p.y = ry;
  if(A==="infernal"){ p.k = 1; p.vx = 8+Math.random()*10; p.vy = 14+Math.random()*16; p.s = 1.5+Math.random()*1.5; p.max = 5000+Math.random()*4000; }
  else if(A==="hielo"){ if(Math.random()<0.16){ p.k = 3; p.vx = 380+Math.random()*120; p.vy = 60+Math.random()*30; p.s = 26+Math.random()*30; p.max = 900; } else { p.k = 2; p.vx = 60+Math.random()*50; p.vy = 50+Math.random()*50; p.s = 1.5+Math.random()*2.2; p.max = 5000+Math.random()*4000; } }
  else if(A==="bosque"){ if(Math.random()<0.45){ p.k = 4; p.vx = 14+Math.random()*16; p.vy = 26+Math.random()*18; p.s = 2+Math.random()*2; p.max = 6000+Math.random()*3000; } else { p.k = 5; p.vx = (Math.random()-0.5)*14; p.vy = (Math.random()-0.5)*14; p.s = 2; p.max = 4000+Math.random()*3000; } }
  else if(A==="laberinto"){ p.k = 6; p.vx = 6+Math.random()*10; p.vy = (Math.random()-0.5)*6; p.s = 1+Math.random()*1.5; p.max = 5000+Math.random()*4000; }
  else if(A==="acuatica"){ p.k = 7; p.vx = (Math.random()-0.5)*8; p.vy = -4-Math.random()*8; p.s = 1+Math.random()*1.6; p.max = 6000+Math.random()*4000; }
  else if(A==="divina"){ if(ry > 0){ p.k = 8; p.vy = -18-Math.random()*20; } else { p.k = 9; p.vy = -24-Math.random()*22; } p.vx = (Math.random()-0.5)*10; p.s = 1.5+Math.random()*1.5; p.max = 3500+Math.random()*3000; }
  p.life = fresh ? p.max*Math.random() : p.max;
}
function aidAmbUpdate(dt){
  if(state!=="playing" || !player || player.duelActive) return;
  const A = currentArena;
  const budget = Math.round((AID_AMB_BUDGET[A]||0) * Math.max(0.3, Math.min(1, vfxLoad)));
  aidWind += dt/1000;
  const k = dt/1000;
  let n = 0;
  const hw = VW/2/CAM_ZOOM + 120, hh = VH/2/CAM_ZOOM + 120;
  for(const p of aidAmb){
    if(!p.on) continue;
    p.life -= dt;
    const gust = A==="hielo" ? (0.7+0.5*Math.sin(aidWind*0.4)) : 1;
    let wx = 0;
    if(p.k===4) wx = Math.sin(p.ph + p.life/500)*22;
    else if(p.k===5){ p.vx += (Math.random()-0.5)*40*k; p.vy += (Math.random()-0.5)*40*k; p.vx*=0.98; p.vy*=0.98; }
    else if(p.k===7) wx = Math.sin(p.ph + p.life/900)*6;
    p.x += (p.vx*gust + wx)*k; p.y += p.vy*k;
    if(p.life<=0 || n>=budget || Math.abs(p.x-player.x)>hw || Math.abs(p.y-player.y)>hh){ p.on = false; continue; }
    n++;
  }
  for(const p of aidAmb){ if(n>=budget) break; if(!p.on){ aidAmbSpawn(p, A, true); n++; } }
  aidAmbN = n;
  // Infernal: pequeñas erupciones de lava en fisuras cercanas (solo visual, prioridad baja)
  if(A==="infernal"){
    aidEruptT -= dt;
    if(aidEruptT<=0){
      aidEruptT = 1800+Math.random()*2200;
      const cand = aidLights.filter(L=>L.fissure && inView(L.x, L.y, 40));
      if(cand.length){ const L = cand[(Math.random()*cand.length)|0]; vfxBurst(L.x, L.y, 10, "ember", 150, 700, 3, 0, -120, 0); }
    }
  }
}
function aidAmbDraw(now){
  if(!aidAmbN || !player || player.duelActive) return;
  ctx.save();
  for(const p of aidAmb){
    if(!p.on) continue;
    const fade = Math.min(1, p.life/600, (p.max-p.life)/600+0.2);
    if(p.k===1){ ctx.globalAlpha = 0.55*fade; ctx.fillStyle = "#6a605a"; ctx.fillRect(p.x, p.y, p.s, p.s); }
    else if(p.k===2){ ctx.globalAlpha = 0.85*fade; ctx.fillStyle = "#f4fbff"; ctx.fillRect(p.x, p.y, p.s, p.s); }
    else if(p.k===3){ ctx.globalAlpha = 0.22*fade; ctx.strokeStyle = "#e8f6ff"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x-p.s, p.y-p.s*0.16); ctx.stroke(); }
    else if(p.k===4){ ctx.globalAlpha = 0.8*fade; ctx.fillStyle = (p.ph>3) ? "#c8a040" : "#7aa040"; const w = p.s*(0.5+0.5*Math.abs(Math.sin(p.ph+p.life/300))); ctx.fillRect(p.x, p.y, w+1, p.s); }
    else if(p.k===5){ const b = 0.5+0.5*Math.sin(now*3+p.ph*3); ctx.globalAlpha = 0.9*b*fade; ctx.fillStyle = "#e8ff90"; ctx.fillRect(p.x, p.y, 2, 2); ctx.globalAlpha = 0.25*b*fade; ctx.drawImage(glowSprite("200,255,120"), p.x-8, p.y-8, 16, 16); }
    else if(p.k===6){ ctx.globalAlpha = 0.35*fade; ctx.fillStyle = "#d8bc88"; ctx.fillRect(p.x, p.y, p.s, p.s); }
    else if(p.k===7){ ctx.globalAlpha = 0.45*fade; ctx.fillStyle = "#bff0ea"; ctx.fillRect(p.x, p.y, p.s, p.s); }
    else if(p.k===8){ ctx.globalAlpha = 0.8*fade; ctx.fillStyle = "#ffe8a0"; ctx.fillRect(p.x, p.y, p.s, p.s); }
    else if(p.k===9){ ctx.globalAlpha = 0.8*fade; ctx.fillStyle = p.ph>3 ? "#ff5a3a" : "#c02a50"; ctx.fillRect(p.x, p.y, p.s, p.s); }
  }
  ctx.restore();
}

// ---------------- Iluminación / color propio de cada arena (sobre el mundo, bajo el HUD) ----------------
function aidGrade(now){
  if(!player || player.duelActive) return;
  const A = currentArena;
  const hw = VW/2/CAM_ZOOM, hh = VH/2/CAM_ZOOM;
  const x0 = player.x - hw - 40, y0 = player.y - hh - 40, W = hw*2+80, H = hh*2+80;
  ctx.save();
  if(A==="infernal"){
    // calor que sube desde abajo + borde oscuro: hostil, pero sin teñir todo de rojo
    const g = ctx.createLinearGradient(0, y0+H, 0, y0);
    g.addColorStop(0, "rgba(120,30,8,0.20)"); g.addColorStop(0.45, "rgba(80,20,6,0.06)"); g.addColorStop(1, "rgba(0,0,0,0.10)");
    ctx.fillStyle = g; ctx.fillRect(x0, y0, W, H);
  } else if(A==="hielo"){
    ctx.fillStyle = "rgba(150,200,255,0.07)"; ctx.fillRect(x0, y0, W, H);
    // niebla baja que se desplaza con el viento
    ctx.globalCompositeOperation = "lighter";
    for(let i=0;i<3;i++){
      const fy = y0 + H*(0.35+i*0.25), fx = x0 + ((now*30*(1+i*0.3) + i*400) % (W+600)) - 300;
      const g = ctx.createRadialGradient(fx, fy, 10, fx, fy, 320);
      g.addColorStop(0, "rgba(200,225,245,0.10)"); g.addColorStop(1, "rgba(200,225,245,0)");
      ctx.fillStyle = g; ctx.fillRect(fx-320, fy-200, 640, 400);
    }
  } else if(A==="bosque"){
    ctx.fillStyle = "rgba(40,70,20,0.08)"; ctx.fillRect(x0, y0, W, H);
    // haces de luz que se cuelan entre las copas
    ctx.globalCompositeOperation = "lighter";
    for(let i=0;i<4;i++){
      const bx = x0 + W*(0.12+i*0.26) + Math.sin(now*0.2+i)*40;
      const a = 0.05+0.03*Math.sin(now*0.5+i*1.7);
      ctx.fillStyle = `rgba(230,240,160,${a})`;
      ctx.beginPath(); ctx.moveTo(bx, y0); ctx.lineTo(bx+70, y0); ctx.lineTo(bx+260, y0+H); ctx.lineTo(bx+150, y0+H); ctx.closePath(); ctx.fill();
    }
  } else if(A==="laberinto"){
    ctx.fillStyle = "rgba(90,60,20,0.07)"; ctx.fillRect(x0, y0, W, H);
    const g = ctx.createRadialGradient(player.x, player.y, hh*0.5, player.x, player.y, Math.max(hw,hh)*1.25);
    g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(10,6,2,0.45)");
    ctx.fillStyle = g; ctx.fillRect(x0, y0, W, H);
  } else if(A==="acuatica"){
    ctx.fillStyle = "rgba(10,70,90,0.12)"; ctx.fillRect(x0, y0, W, H);
    // haces de luz desde la superficie
    ctx.globalCompositeOperation = "lighter";
    for(let i=0;i<5;i++){
      const bx = x0 + W*(0.05+i*0.21) + Math.sin(now*0.35+i*2)*60;
      const a = 0.045+0.03*Math.sin(now*0.8+i*1.3);
      ctx.fillStyle = `rgba(150,230,240,${a})`;
      ctx.beginPath(); ctx.moveTo(bx, y0); ctx.lineTo(bx+50, y0); ctx.lineTo(bx+190, y0+H); ctx.lineTo(bx+110, y0+H); ctx.closePath(); ctx.fill();
    }
  } else if(A==="divina"){
    // norte corrupto (rojizo) / sur celestial (dorado), según dónde está la cámara
    const g = ctx.createLinearGradient(0, -900, 0, 900);
    g.addColorStop(0, "rgba(120,10,40,0.16)"); g.addColorStop(0.5, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(255,210,120,0.10)");
    ctx.fillStyle = g; ctx.fillRect(x0, y0, W, H);
  }
  ctx.restore();
}

// ---------------- Estilo de cada arena: terreno exterior, foso, muro perimetral y acentos ----------------
const AID_STYLE = {
  infernal: { outer:"#140b09", outerLines:"rgba(170,45,15,0.34)", rings:true,  moat:"lava", wall:["#0b0706","#3a2820","rgba(140,104,80,0.55)"], smoke:"80,66,62",    accent:"flame", trees:true,  veins:true,  floorDecor:true  },
  hielo:    { outer:"#1a2632", outerLines:"rgba(220,240,255,0.14)", rings:false, moat:"ice",  wall:["#0c1824","#7a9cbc","rgba(235,248,255,0.75)"], smoke:"215,232,248", accent:"ice", trees:true, veins:false, floorDecor:false },
  bosque:   { outer:"#060c05", outerLines:null, rings:false, moat:"moss", wall:["#0a1208","#4e5a40","rgba(120,170,80,0.45)"], smoke:"150,190,140", accent:"moss", trees:false, veins:false, floorDecor:false, canopy:true },
  laberinto:{ outer:"#15100a", outerLines:"rgba(210,170,110,0.10)", rings:false, moat:"none", wall:["#1a120a","#8a6a42","rgba(225,195,135,0.6)"], smoke:"180,150,100", accent:"torch", trees:false, veins:false, floorDecor:true },
  acuatica: { outer:"#030d14", outerLines:null, rings:false, moat:"bio",  wall:["#04121a","#2e5a5e","rgba(120,220,210,0.38)"], smoke:null, accent:"coral", trees:false, veins:false, floorDecor:false },
  divina:   { outer:"#0e0a1c", outerLines:null, rings:false, moat:"divina", wall:["#0a0612","#4a3a6a","rgba(220,190,255,0.5)"], smoke:null, accent:"divina", trees:false, veins:false, floorDecor:false },
};
function aidStyle(){ return AID_STYLE[currentArena] || AID_STYLE.infernal; }
let aidOuterBlobs = [];
function aidBuildOuter(){
  aidOuterBlobs = [];
  const st = aidStyle();
  if(!st.canopy && currentArena!=="hielo" && currentArena!=="acuatica") return;
  const rnd = aidRng(55);
  for(let i=0;i<70;i++){
    const a = i/70*6.283 + rnd()*0.05, r = ARENA_RADIUS*(1.06 + rnd()*0.35);
    aidOuterBlobs.push({x:Math.cos(a)*r*1.18, y:Math.sin(a)*r*0.82, r:70+rnd()*90, t:rnd()});
  }
}
function aidDrawOuter(now){
  const st = aidStyle();
  ctx.save();
  ctx.fillStyle = st.outer;
  ctx.fillRect(player.x-VW, player.y-VH, VW*2/CAM_ZOOM+ARENA_RADIUS*2, VH*2/CAM_ZOOM+ARENA_RADIUS*2);
  if(st.outerLines){
    ctx.strokeStyle = st.outerLines; ctx.lineWidth = 3;
    for(let i=0;i<14;i++){
      const a = i*0.449, r0 = ARENA_RADIUS*1.22, r1 = ARENA_RADIUS*1.9;
      ctx.beginPath(); ctx.moveTo(Math.cos(a)*r0*1.18, Math.sin(a)*r0*0.82); ctx.lineTo(Math.cos(a+0.08)*r1*1.18, Math.sin(a+0.08)*r1*0.82); ctx.stroke();
    }
  }
  // bosque: copas de árboles cerrando el claro; hielo: montículos de nieve; acuática: rocas del arrecife
  for(const b of aidOuterBlobs){
    if(!inView(b.x, b.y, b.r)) continue;
    if(currentArena==="bosque"){
      ctx.fillStyle = b.t<0.5 ? "#0f1d0c" : "#142610"; ctx.beginPath(); ctx.ellipse(b.x, b.y, b.r, b.r*0.72, 0, 0, 6.283); ctx.fill();
      ctx.fillStyle = "rgba(60,100,40,0.35)"; ctx.beginPath(); ctx.ellipse(b.x-b.r*0.2, b.y-b.r*0.2, b.r*0.5, b.r*0.34, 0, 0, 6.283); ctx.fill();
    } else if(currentArena==="hielo"){
      ctx.fillStyle = "rgba(200,222,240,0.55)"; ctx.beginPath(); ctx.ellipse(b.x, b.y, b.r, b.r*0.5, 0, 0, 6.283); ctx.fill();
      ctx.fillStyle = "rgba(245,252,255,0.45)"; ctx.beginPath(); ctx.ellipse(b.x-b.r*0.15, b.y-b.r*0.12, b.r*0.6, b.r*0.26, 0, 0, 6.283); ctx.fill();
    } else {
      ctx.fillStyle = "#0a1c24"; ctx.beginPath(); ctx.ellipse(b.x, b.y, b.r*0.8, b.r*0.55, 0, 0, 6.283); ctx.fill();
      ctx.fillStyle = "rgba(60,140,140,0.25)"; ctx.beginPath(); ctx.ellipse(b.x, b.y-b.r*0.2, b.r*0.5, b.r*0.2, 0, 0, 6.283); ctx.fill();
    }
  }
  ctx.restore();
}
// Foso pegado al muro: lava (Infernal), grieta helada (Hielo), zanja con musgo (Bosque),
// veta bioluminiscente tenue (Acuática), mitad corrupta / mitad sagrada (Divina); el Laberinto no tiene.
function aidDrawMoat(now){
  const st = aidStyle();
  if(st.moat==="none") return;
  ctx.save();
  octPath(ARENA_RADIUS); ctx.clip();
  if(st.moat==="lava"){
    const mvc = arenaVeinColors(0.6 + 0.25*Math.sin(now*1.8));
    ctx.strokeStyle = mvc.core; ctx.lineWidth = 26; octPath(ARENA_RADIUS*0.975); ctx.stroke();
    ctx.strokeStyle = mvc.bright; ctx.lineWidth = 10; octPath(ARENA_RADIUS*0.975); ctx.stroke();
    ctx.globalCompositeOperation = "lighter"; ctx.strokeStyle = mvc.glow; ctx.lineWidth = 80; octPath(ARENA_RADIUS*0.96); ctx.stroke();
  } else if(st.moat==="ice"){
    ctx.strokeStyle = "#0e2a44"; ctx.lineWidth = 30; octPath(ARENA_RADIUS*0.975); ctx.stroke();
    ctx.strokeStyle = "rgba(150,210,245,0.8)"; ctx.lineWidth = 6; octPath(ARENA_RADIUS*0.962); ctx.stroke();
    ctx.strokeStyle = "rgba(240,250,255,0.9)"; ctx.lineWidth = 2; octPath(ARENA_RADIUS*0.955); ctx.stroke();
  } else if(st.moat==="moss"){
    ctx.strokeStyle = "rgba(10,20,8,0.9)"; ctx.lineWidth = 34; octPath(ARENA_RADIUS*0.975); ctx.stroke();
    ctx.strokeStyle = "rgba(60,100,40,0.7)"; ctx.lineWidth = 12; octPath(ARENA_RADIUS*0.955); ctx.stroke();
  } else if(st.moat==="bio"){
    const p = 0.5+0.5*Math.sin(now*1.1);
    ctx.strokeStyle = "rgba(4,18,22,0.9)"; ctx.lineWidth = 30; octPath(ARENA_RADIUS*0.975); ctx.stroke();
    ctx.globalCompositeOperation = "lighter"; ctx.strokeStyle = `rgba(60,200,190,${0.10+0.08*p})`; ctx.lineWidth = 40; octPath(ARENA_RADIUS*0.96); ctx.stroke();
  } else if(st.moat==="divina"){
    ctx.strokeStyle = "rgba(10,6,18,0.9)"; ctx.lineWidth = 28; octPath(ARENA_RADIUS*0.975); ctx.stroke();
    ctx.globalCompositeOperation = "lighter";
    ctx.save(); ctx.beginPath(); ctx.rect(-2000,-2000,4000,2000); ctx.clip(); ctx.strokeStyle = "rgba(230,40,80,0.22)"; ctx.lineWidth = 50; octPath(ARENA_RADIUS*0.96); ctx.stroke(); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.rect(-2000,0,4000,2000); ctx.clip(); ctx.strokeStyle = "rgba(255,220,140,0.20)"; ctx.lineWidth = 50; octPath(ARENA_RADIUS*0.96); ctx.stroke(); ctx.restore();
  }
  ctx.restore();
}
function aidDrawWallRing(now){
  const st = aidStyle();
  ctx.save();
  const thick = currentArena==="laberinto" ? 40 : 30;
  ctx.strokeStyle = st.wall[0]; ctx.lineWidth = thick; octPath(ARENA_RADIUS); ctx.stroke();
  ctx.strokeStyle = st.wall[1]; ctx.lineWidth = thick-10; octPath(ARENA_RADIUS); ctx.stroke();
  ctx.strokeStyle = st.wall[2]; ctx.lineWidth = 5; octPath(ARENA_RADIUS*0.985); ctx.stroke();
  if(currentArena==="laberinto"){ ctx.strokeStyle = "rgba(60,40,20,0.8)"; ctx.setLineDash([4,10]); ctx.lineWidth = 12; octPath(ARENA_RADIUS); ctx.stroke(); ctx.setLineDash([]); }
  if(currentArena==="bosque"){ ctx.strokeStyle = "rgba(50,90,34,0.8)"; ctx.setLineDash([22,14]); ctx.lineWidth = 16; octPath(ARENA_RADIUS*0.995); ctx.stroke(); ctx.setLineDash([]); }
  if(currentArena==="hielo"){ ctx.strokeStyle = "rgba(245,252,255,0.85)"; ctx.setLineDash([30,12]); ctx.lineWidth = 8; octPath(ARENA_RADIUS*1.005); ctx.stroke(); ctx.setLineDash([]); }
  ctx.restore();
}
// Acento que trepa el muro en cada uno de los puntos de "braziers" (mismos puntos de siempre)
function aidDrawAccent(br, f, ox, oy, i){
  const A = aidStyle().accent;
  if(A==="moss"){
    // hongos luminosos
    if(i%2) return;
    const cols = ["#9ae07a","#e0d06a","#7ad0e0"][i%3];
    ctx.fillStyle = "#d8d0b8"; ctx.fillRect(br.x-1+ox*4, br.y-10+oy*4, 3, 10);
    ctx.fillStyle = cols; ctx.beginPath(); ctx.ellipse(br.x+ox*4, br.y-11+oy*4, 7, 4, 0, Math.PI, 0); ctx.fill();
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.12+0.1*f; ctx.drawImage(glowSprite("150,230,120"), br.x-30, br.y-40, 60, 60); ctx.restore();
  } else if(A==="torch"){
    // almenas de piedra y, cada tanto, una antorcha
    ctx.fillStyle = "#6a5234"; ctx.fillRect(br.x-7+ox*6, br.y-16+oy*6, 14, 16);
    ctx.fillStyle = "#b8904e"; ctx.fillRect(br.x-7+ox*6, br.y-18+oy*6, 14, 3);
    if(i%8===0){
      ctx.fillStyle = `rgba(255,${130+80*f|0},40,0.95)`; ctx.fillRect(br.x-4+ox*6, br.y-30-6*f+oy*6, 8, 10+6*f);
      ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.25+0.15*f; ctx.drawImage(glowSprite("255,170,80"), br.x-70, br.y-80, 140, 140); ctx.restore();
    }
  } else if(A==="coral"){
    if(i%2) return;
    const c = ["#e0607a","#e08a3a","#8a5ae0","#3ab0a0"][i%4];
    ctx.fillStyle = c;
    for(let k=0;k<3;k++){ ctx.fillRect(br.x-6+k*5+ox*4, br.y-8-k*3-(k%2)*4+oy*4, 3, 10+k*3); }
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.10+0.06*f; ctx.drawImage(glowSprite("90,220,210"), br.x-26, br.y-36, 52, 52); ctx.restore();
  } else if(A==="divina"){
    const north = br.y < 0;
    if(north){ ctx.fillStyle = "#2a1426"; ctx.beginPath(); ctx.moveTo(br.x-6, br.y+2); ctx.lineTo(br.x+ox*6, br.y-24-6*f); ctx.lineTo(br.x+6, br.y+2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = `rgba(230,40,70,${0.5+0.4*f})`; ctx.fillRect(br.x-1+ox*6, br.y-14+oy*2, 2, 6); }
    else { ctx.fillStyle = "#e8e0c8"; ctx.fillRect(br.x-3+ox*4, br.y-20+oy*4, 6, 20); ctx.fillStyle = "#e0b050"; ctx.fillRect(br.x-4+ox*4, br.y-23+oy*4, 8, 3);
      if(i%3===0){ ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.12+0.08*f; ctx.drawImage(glowSprite("255,220,140"), br.x-30, br.y-44, 60, 60); ctx.restore(); } }
  } else {
    return false; // flame / ice: se dibujan con el código de siempre
  }
  return true;
}
// Divina: el suelo se parte en dos facciones, con una calzada central y ramales a las torres
function aidArtCelRune(){
  return aidArt("celRune", 70, 50, (g,w,h)=>{ const cx=w/2, cy=h/2;
    g.strokeStyle = "rgba(255,215,120,0.8)"; g.lineWidth = 2; g.beginPath(); g.ellipse(cx,cy,32,22,0,0,6.283); g.stroke();
    g.beginPath(); g.ellipse(cx,cy,22,15,0,0,6.283); g.stroke();
    g.fillStyle = "rgba(160,220,255,0.8)"; for(let i=0;i<6;i++){ const a=i/6*6.283; g.fillRect(cx+Math.cos(a)*27-1, cy+Math.sin(a)*18.5-2, 3, 4); }
    g.fillStyle = "rgba(255,240,200,0.9)"; g.fillRect(cx-1, cy-8, 3, 16); g.fillRect(cx-6, cy-2, 13, 3); });
}
function aidArtCorruptPool(v){
  return aidArt("corruptPool"+v, 110, 60, (g,w,h)=>{ const rnd = aidRng(1400+v);
    aidBlob(g, w/2, h/2, 50, 24, "rgba(40,6,24,0.75)", rnd, 11); aidBlob(g, w/2, h/2, 26, 12, "rgba(110,10,50,0.6)", rnd, 6);
    g.strokeStyle = "rgba(230,40,70,0.7)"; g.lineWidth = 1.5;
    for(let i=0;i<5;i++){ let x=w/2, y=h/2, a=rnd()*6.283; g.beginPath(); g.moveTo(x,y); for(let k=0;k<5;k++){ a+=(rnd()-0.5)*0.8; x+=Math.cos(a)*9; y+=Math.sin(a)*5; g.lineTo(x,y); } g.stroke(); } });
}
function aidDrawDivinaGround(now){
  ctx.save();
  // tinte de cada mitad
  ctx.fillStyle = "rgba(60,4,28,0.38)"; ctx.fillRect(-1500,-1100,3000,1100);
  ctx.fillStyle = "rgba(255,240,205,0.22)"; ctx.fillRect(-1500,0,3000,1100);
  // calzada central (castillo a castillo) y ramales a las torres de base
  const road = (x0,y0,x1,y1,w)=>{ ctx.lineCap = "round"; ctx.strokeStyle = "rgba(10,8,16,0.55)"; ctx.lineWidth = w+14; ctx.beginPath(); ctx.moveTo(x0,y0); ctx.lineTo(x1,y1); ctx.stroke();
    ctx.strokeStyle = "rgba(120,110,140,0.55)"; ctx.lineWidth = w; ctx.stroke(); };
  road(0,-720,0,720,130);
  road(0,-470,-260,-560,70); road(0,-470,260,-560,70); road(0,470,-260,560,70); road(0,470,260,560,70);
  // losas: obsidiana quebrada al norte, mármol con ribete dorado al sur
  for(let y=-700; y<700; y+=36){
    const north = y < 0;
    ctx.fillStyle = north ? "rgba(30,12,30,0.5)" : "rgba(240,230,210,0.22)";
    ctx.fillRect(-60, y, 120, 2);
    if(!north && (y/36)%3===0){ ctx.fillStyle = "rgba(230,180,80,0.55)"; ctx.fillRect(-64, y, 4, 36); ctx.fillRect(60, y, 4, 36); }
    if(north && (y/36)%2===0){ ctx.fillStyle = "rgba(230,40,70,0.35)"; ctx.fillRect(-30+((y*7)%50), y+8, 18, 2); }
  }
  // frente de choque en el centro: la línea donde se encuentran las dos facciones
  const p = 0.5+0.5*Math.sin(now*2.2);
  ctx.globalCompositeOperation = "lighter";
  const g = ctx.createLinearGradient(0,-40,0,40);
  g.addColorStop(0, `rgba(230,40,80,${0.10+0.08*p})`); g.addColorStop(0.5, `rgba(255,240,220,${0.10+0.06*p})`); g.addColorStop(1, `rgba(255,210,120,${0.10+0.08*p})`);
  ctx.fillStyle = g; ctx.fillRect(-1300,-40,2600,80);
  ctx.restore();
}

// ---------------- Arena Divina: estructuras por facción (arte del Pack 5) ----------------
// Tu bando (sur) usa la Torre/Castillo Celestial; el rival (norte), la Torre/Castillo Infernal.
// Antes los dos bandos usaban exactamente el mismo sprite violeta. Estados: normal, golpeado
// (destello al recibir daño), dañado (humo y fuego según la vida que le queda) y destruido
// (ruina generada del mismo sprite: la base quebrada y oscurecida, con escombros).
function divinaFactionImg(s){
  const cel = s.side==="player";
  if(s.type==="castle") return cel ? DIVINA_FACTION_IMG.castle_cel : DIVINA_FACTION_IMG.castle_inf;
  const n = cel ? 4 : 3;
  const idx = ((Math.abs(Math.round(s.x*0.37+s.y*0.11)) % n) + 1);
  return DIVINA_FACTION_IMG[(cel ? "tower_cel_" : "tower_inf_") + idx];
}
const _divinaRuinCache = new Map();
function divinaRuinImg(img){
  let c = _divinaRuinCache.get(img);
  if(c) return c;
  const keep = Math.round(img.height*0.36);
  c = document.createElement("canvas"); c.width = img.width; c.height = keep + 6;
  const g = c.getContext("2d"); g.imageSmoothingEnabled = false;
  g.drawImage(img, 0, img.height-keep, img.width, keep, 0, 6, img.width, keep);
  // borde superior quebrado en dientes irregulares
  g.globalCompositeOperation = "destination-out";
  let x = 0; while(x < c.width){ const w = 3+Math.random()*7, d = 2+Math.random()*(keep*0.45); g.fillRect(x, 0, w, d); x += w; }
  // oscurecido y chamuscado
  g.globalCompositeOperation = "source-atop";
  g.fillStyle = "rgba(20,14,18,0.55)"; g.fillRect(0, 0, c.width, c.height);
  g.globalCompositeOperation = "source-over";
  // escombros al pie
  for(let i=0;i<Math.round(c.width/5);i++){ const rx = Math.random()*c.width, s = 2+Math.random()*4; g.fillStyle = Math.random()<0.5 ? "#2a2430" : "#4a4250"; g.fillRect(rx, c.height-3-Math.random()*6, s, s*0.7); }
  _divinaRuinCache.set(img, c);
  return c;
}
function divinaStructFx(s, now, topY){
  // humo y fuego progresivos según el daño (solo en cámara; prioridad baja: se recortan con carga)
  const pct = s.hp/(s.maxHp||1);
  if(!inView(s.x, s.y, 120)) return;
  if(pct < 0.6 && Math.random() < (0.6-pct)*0.18) vfxBurst(s.x+(Math.random()-0.5)*s.radius*1.2, topY+Math.random()*30, 1, "rock", 30, 1200, 4, 0, -50, 0);
  if(pct < 0.35 && Math.random() < 0.10) vfxBurst(s.x+(Math.random()-0.5)*s.radius, topY+20+Math.random()*30, 2, "ember", 60, 500, 3, 0, -80, 0);
}
function drawDivinaFactionStructure(s, now){
  const img = divinaFactionImg(s);
  if(!img || !img.complete || !img.width) return false;
  const castle = s.type==="castle";
  const targetH = castle ? 190 : (s.type==="midtower" ? 118 : 128);
  const sc = targetH/img.height;
  const clip = { frames:[{x:0, y:0, w:img.width, h:img.height}] };
  if(!s.alive){
    const ruin = divinaRuinImg(img);
    const rclip = { frames:[{x:0, y:0, w:ruin.width, h:ruin.height}] };
    ctx.save(); ctx.fillStyle = "rgba(0,0,0,0.45)"; ctx.beginPath(); ctx.ellipse(s.x, s.y+6, img.width*sc*0.42, castle?24:12, 0, 0, 6.283); ctx.fill(); ctx.restore();
    drawAnimFrameSized(ruin, rclip, 0, s.x, s.y, ruin.width*sc, ruin.height*sc, 0.5, 0.9, false, 1);
    if(inView(s.x, s.y, 100) && Math.random() < 0.05) vfxBurst(s.x+(Math.random()-0.5)*s.radius, s.y-ruin.height*sc*0.4, 1, "rock", 26, 1400, 4, 0, -40, 0);
    return true;
  }
  drawDivinaTeamAura(s.x, s.y+(castle?16:10), castle?130:46, castle?40:20, s.side, castle?1.2:1);
  // leve respiración de brillo en vez de alternar frames (el arte del pack es una sola pose)
  drawAnimFrameSized(img, clip, 0, s.x, s.y, img.width*sc, img.height*sc, 0.5, castle?0.86:0.92, false, 1);
  const since = animNow - (s._hitAt||-9999);
  if(since < 140){
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    drawAnimFrameSized(img, clip, 0, s.x, s.y, img.width*sc, img.height*sc, 0.5, castle?0.86:0.92, false, 0.55*(1-since/140));
    ctx.restore();
  }
  // grietas oscuras sobre la estructura dañada (se leen aun sin partículas)
  const pct = s.hp/(s.maxHp||1);
  if(pct < 0.5){
    const top = s.y - img.height*sc*(castle?0.86:0.92);
    ctx.save(); ctx.strokeStyle = `rgba(20,10,10,${0.35+0.4*(0.5-pct)})`; ctx.lineWidth = 2;
    const n = pct < 0.25 ? 5 : 3;
    for(let i=0;i<n;i++){ const cx = s.x + ((i*37)%70-35)*(castle?2:0.6), cy = top + img.height*sc*(0.35+((i*23)%40)/100);
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx+6, cy+10); ctx.lineTo(cx+2, cy+18); ctx.lineTo(cx+9, cy+28); ctx.stroke(); }
    ctx.restore();
    divinaStructFx(s, now, top + img.height*sc*0.25);
  }
  return true;
}

let aidLavaLayer = null;
function aidBuildLavaLayer(){
  aidLavaLayer = null;
  const st = aidStyle();
  if(!(st.veins && lavaPools.length) && !(st.floorDecor && floorDecor.length)) return;
  const k = 0.5, x0 = -1300, y0 = -900, w = 2600, h = 1800;
  const c = document.createElement("canvas"); c.width = w*k; c.height = h*k;
  const g = c.getContext("2d");
  g.scale(k, k); g.translate(-x0, -y0);
  // detalles secos del suelo (grietas, piedras, huesos): estáticos, se hornean acá
  if(st.floorDecor) for(const d of floorDecor){
    if(d.kind==="crack"){ g.strokeStyle = "rgba(0,0,0,0.45)"; g.lineWidth = 3; g.beginPath(); g.moveTo(d.x, d.y); g.lineTo(d.x+Math.cos(d.rot)*d.len, d.y+Math.sin(d.rot)*d.len); g.stroke(); }
    else if(d.kind==="rock"){ g.fillStyle = "rgba(0,0,0,0.55)"; g.fillRect(d.x, d.y, 12, 9); g.fillStyle = "rgba(96,72,60,0.85)"; g.fillRect(d.x+2, d.y, 9, 6); }
    else { g.save(); g.translate(d.x, d.y); g.rotate(d.rot); g.fillStyle = "rgba(188,176,150,0.30)"; g.fillRect(-7, -1, 14, 3);
      g.beginPath(); g.arc(-7, 0, 2.6, 0, Math.PI*2); g.fill(); g.beginPath(); g.arc(7, 0, 2.6, 0, Math.PI*2); g.fill(); g.restore(); }
  }
  aidLavaLayer = {c, k, x0, y0, w, h, lava: !!(st.veins && lavaPools.length)};
  if(!aidLavaLayer.lava) return;
  const vc = arenaVeinColors(0.7);
  g.lineCap = "round"; g.lineJoin = "round";
  g.beginPath(); for(const pool of lavaPools){ if(!pool.pts) continue; pool.pts.forEach((p,i)=> i===0 ? g.moveTo(p.x,p.y) : g.lineTo(p.x,p.y)); }
  g.strokeStyle = "rgba(0,0,0,0.85)"; g.lineWidth = 8; g.stroke();
  g.strokeStyle = vc.core; g.lineWidth = 4; g.stroke();
  g.strokeStyle = vc.bright; g.lineWidth = 1.5; g.stroke();
  g.globalCompositeOperation = "lighter"; g.strokeStyle = vc.glow; g.lineWidth = 21; g.stroke(); g.globalCompositeOperation = "source-over";
  g.beginPath(); for(const pool of lavaPools){ if(pool.blocks) for(const b of pool.blocks) g.rect(pool.x+b.x, pool.y+b.y, 10, 10); } g.fillStyle = vc.core; g.fill();
  g.beginPath(); for(const pool of lavaPools){ if(pool.blocks) for(const b of pool.blocks){ if(((b.x/10)+(b.y/10)) % 3 === 0) g.rect(pool.x+b.x+2, pool.y+b.y+2, 6, 6); } } g.fillStyle = vc.bright; g.fill();
  g.globalCompositeOperation = "lighter"; g.globalAlpha = 0.16;
  const gs = glowSprite("255,120,40"); for(const pool of lavaPools){ if(pool.blocks) g.drawImage(gs, pool.x-120, pool.y-120, 240, 240); }
}
function buildArenaDecor(){
  lavaPools = []; floorDecor = []; braziers = []; wallBlocks = []; deadTrees = []; smokePuffs = [];
  buildLabyrinthWalls(); // no hace nada si la arena actual no tiene muros

  // --- Venas de lava que recorren las losas del coliseo (menos que antes: ahora hay fisuras grandes) ---
  for(let i=0;i<28;i++){
    const ang = Math.random()*Math.PI*2;
    const rad = 260 + Math.random()*(ARENA_RADIUS-340);
    const pts = [];
    let cx = Math.cos(ang)*rad, cy = Math.sin(ang)*rad;
    let dir = Math.random()*Math.PI*2;
    const segs = 4 + (Math.random()*4|0);
    for(let s=0;s<segs;s++){
      pts.push({x:cx, y:cy});
      dir += (Math.random()-0.5)*1.5;
      const len = 18+Math.random()*30;
      cx += Math.cos(dir)*len; cy += Math.sin(dir)*len;
    }
    pts.push({x:cx, y:cy});
    lavaPools.push({pts, x:pts[0].x, y:pts[0].y, phase:Math.random()*Math.PI*2, w:2+Math.random()*2});
  }

  // --- Charcos de lava abiertos entre las losas ---
  for(let i=0;i<18;i++){
    const ang = Math.random()*Math.PI*2;
    const rad = 360 + Math.random()*(ARENA_RADIUS-480);
    const cx = Math.cos(ang)*rad, cy = Math.sin(ang)*rad;
    const blocks = [];
    const w = 3 + (Math.random()*3|0), h = 2 + (Math.random()*2|0);
    for(let bx=-w; bx<=w; bx++){
      for(let by=-h; by<=h; by++){
        if((bx*bx)/(w*w) + (by*by)/(h*h) <= 1 + Math.random()*0.2){
          blocks.push({x:bx*10, y:by*10});
        }
      }
    }
    lavaPools.push({x:cx, y:cy, blocks, phase:Math.random()*Math.PI*2});
  }

  // --- Huesos, rocas y grietas secas en el suelo ---
  for(let i=0;i<150;i++){
    const ang = Math.random()*Math.PI*2;
    const rad = 150 + Math.random()*(ARENA_RADIUS-230);
    floorDecor.push({
      x:Math.cos(ang)*rad, y:Math.sin(ang)*rad,
      kind: Math.random()<0.45 ? "crack" : (Math.random()<0.6 ? "rock" : "bone"),
      len: 10+Math.random()*24, rot: Math.random()*Math.PI
    });
  }

  // --- Árboles muertos apoyados contra el borde del coliseo ---
  const treeCount = 8;
  for(let i=0;i<treeCount;i++){
    const ang = (i/treeCount)*Math.PI*2 + 0.4 + (Math.random()-0.5)*0.35;
    const rad = ARENA_RADIUS*0.70 + Math.random()*120;
    deadTrees.push({
      x:Math.cos(ang)*rad, y:Math.sin(ang)*rad,
      h: 46+Math.random()*26, lean:(Math.random()-0.5)*0.55,
      branches: 3+(Math.random()*3|0), seed:Math.random()*10,
      burning: true, phase:Math.random()*6
    });
  }

  // --- Humo/calor ascendente ---
  for(let i=0;i<11;i++){
    const ang = Math.random()*Math.PI*2;
    const rad = Math.random()*(ARENA_RADIUS-80);
    smokePuffs.push({x:Math.cos(ang)*rad, y:Math.sin(ang)*rad, r:60+Math.random()*80, phase:Math.random()*10});
  }

  // --- Llamas y púas a lo largo del muro octogonal ---
  const flameCount = 120;
  for(let i=0;i<flameCount;i++){
    const t = i/flameCount;
    const p = octPoint(ARENA_RADIUS, t*Math.PI*2);
    braziers.push({x:p.x, y:p.y, phase:Math.random()*6, spike:(i%5===0), h:10+Math.random()*10});
  }
  // Arena Identity V1: cada arena conserva solo lo que es suyo (lava y coliseo quemado son de la
  // Infernal; el Hielo se queda con pocos árboles muertos congelados) y suma su propio escenario.
  const st = aidStyle();
  if(!st.veins) lavaPools = [];
  if(!st.trees) deadTrees = []; else if(currentArena==="hielo") deadTrees = deadTrees.slice(0, 4);
  if(!st.smoke) smokePuffs = [];
  aidBuildOuter();
  aidBuild();
  aidBuildLavaLayer();
}

// Punto sobre el perímetro de un octágono alargado (como el coliseo de referencia)
function octPoint(R, ang){
  const N = 8, rot = Math.PI/8;
  const a = ang - rot;
  const seg = Math.floor(a/(Math.PI*2/N));
  const a0 = seg*(Math.PI*2/N)+rot, a1 = (seg+1)*(Math.PI*2/N)+rot;
  const p0 = {x:Math.cos(a0)*R*1.18, y:Math.sin(a0)*R*0.82};
  const p1 = {x:Math.cos(a1)*R*1.18, y:Math.sin(a1)*R*0.82};
  const t = (ang - a0)/(a1 - a0);
  return {x:p0.x+(p1.x-p0.x)*t, y:p0.y+(p1.y-p0.y)*t};
}

function octPath(R){
  ctx.beginPath();
  const N = 8;
  for(let i=0;i<N;i++){
    const a = i*(Math.PI*2/N)+Math.PI/8;
    const x = Math.cos(a)*R*1.18, y = Math.sin(a)*R*0.82;
    if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  }
  ctx.closePath();
}

function inView(x, y, pad){
  pad = pad || 140;
  const hw = VW/2/CAM_ZOOM + pad, hh = VH/2/CAM_ZOOM + pad;
  return Math.abs(x-player.x) < hw && Math.abs(y-player.y) < hh;
}

function drawDeadTree(t){
  const now = performance.now()/1000;
  ctx.save();
  ctx.translate(t.x, t.y);
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.beginPath(); ctx.ellipse(0, 4, 16, 6, 0, 0, Math.PI*2); ctx.fill();

  // brasas al pie del tronco (solo tiene sentido en la Infernal)
  if(t.burning && currentArena==="infernal"){
    const f = 0.6+0.4*Math.sin(now*5+t.phase);
    ctx.fillStyle = `rgba(255,${110+70*f|0},30,0.75)`;
    ctx.fillRect(-9, -2, 18, 5);
    ctx.fillStyle = `rgba(255,220,130,${0.35*f+0.2})`;
    ctx.fillRect(-5, -1, 10, 3);
  }

  const barkDark = currentArena==="hielo" ? "#182226" : "#1a100b";
  const barkLight = currentArena==="hielo" ? "#324450" : "#33211a";
  ctx.strokeStyle = barkDark; ctx.lineWidth = 6; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(0, 2); ctx.lineTo(t.lean*18, -t.h); ctx.stroke();
  ctx.strokeStyle = barkLight; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-1, 2); ctx.lineTo(t.lean*18-1, -t.h); ctx.stroke();

  const nb = t.branches;
  for(let i=0;i<nb;i++){
    const along = 0.32 + (i/nb)*0.6;
    const bx = t.lean*18*along, by = 2-(t.h+4)*along;
    const dir = (i%2===0) ? 1 : -1;
    const len = 12+((t.seed*7+i*5)%14);
    ctx.strokeStyle = barkDark; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx+dir*len, by-len*0.8); ctx.stroke();
    ctx.strokeStyle = barkLight; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx+dir*len, by-len*0.8); ctx.stroke();
    // ramita secundaria
    ctx.strokeStyle = barkDark; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(bx+dir*len*0.6, by-len*0.48);
    ctx.lineTo(bx+dir*len*1.1, by-len*0.35);
    ctx.stroke();
    if(currentArena==="bosque"){
      // follaje vivo: un manojo de hojas en la punta de cada rama (acá NO están muertos)
      ctx.fillStyle = "rgba(60,120,45,0.55)";
      ctx.beginPath(); ctx.ellipse(bx+dir*len*1.1, by-len*0.35, 7, 5, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = "rgba(110,190,80,0.45)";
      ctx.beginPath(); ctx.ellipse(bx+dir*len*1.1-2, by-len*0.35-2, 4, 3, 0, 0, Math.PI*2); ctx.fill();
    } else if(currentArena==="hielo"){
      // carámbano colgando de la rama
      ctx.fillStyle = "rgba(190,225,245,0.55)";
      ctx.beginPath();
      ctx.moveTo(bx+dir*len*1.05, by-len*0.32);
      ctx.lineTo(bx+dir*len*1.05+2, by-len*0.32+9);
      ctx.lineTo(bx+dir*len*1.05-2, by-len*0.32+9);
      ctx.closePath(); ctx.fill();
    }
  }
  // resplandor sobre el tronco: rojizo (Infernal), escarcha (Hielo) o nada (Bosque, ya tiene follaje)
  if(currentArena==="hielo"){
    ctx.strokeStyle = "rgba(180,220,255,0.28)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(1, 2); ctx.lineTo(t.lean*18+1, -t.h); ctx.stroke();
  } else if(currentArena!=="bosque"){
    ctx.strokeStyle = "rgba(255,90,40,0.18)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(1, 2); ctx.lineTo(t.lean*18+1, -t.h); ctx.stroke();
  }
  ctx.restore();
}

// Colores de las venas/charcos luminosos del suelo, según el tema de la arena actual:
// fuego (Infernal), grietas de hielo (Hielo) o musgo luminoso (Bosque).
function arenaVeinColors(pulse){
  if(currentArena==="hielo"){
    return {
      core:   `rgba(60,${150+40*pulse|0},220,0.95)`,
      bright: `rgba(180,${220+30*pulse|0},255,${0.5*pulse+0.3})`,
      glow:   `rgba(120,200,255,${0.18*pulse})`,
      pool0:  `rgba(140,210,255,${0.26*pulse})`,
      pool1:  "rgba(140,210,255,0)"
    };
  }
  if(currentArena==="bosque"){
    return {
      core:   `rgba(40,${120+40*pulse|0},30,0.95)`,
      bright: `rgba(140,${220+30*pulse|0},90,${0.5*pulse+0.3})`,
      glow:   `rgba(110,220,90,${0.16*pulse})`,
      pool0:  `rgba(120,220,100,${0.22*pulse})`,
      pool1:  "rgba(120,220,100,0)"
    };
  }
  if(currentArena==="laberinto"){
    // Vetas de oro/arena viva en la piedra, no fuego: identidad greco-egipcia-desértica del
    // Laberinto (sección "IDENTIDAD DE ARENAS"), separada del tema infernal que antes heredaba
    // por defecto.
    return {
      core:   `rgba(180,${140+40*pulse|0},60,0.95)`,
      bright: `rgba(240,${210+30*pulse|0},150,${0.5*pulse+0.3})`,
      glow:   `rgba(230,190,110,${0.16*pulse})`,
      pool0:  `rgba(230,190,110,${0.22*pulse})`,
      pool1:  "rgba(230,190,110,0)"
    };
  }
  if(currentArena==="acuatica"){
    // Vetas bioluminiscentes azul-verdosas en las ruinas hundidas -no fuego ni hielo,
    // identidad propia de la Arena Acuática (sección "IDENTIDAD VISUAL")-.
    return {
      core:   `rgba(30,${140+50*pulse|0},170,0.95)`,
      bright: `rgba(120,${230+25*pulse|0},220,${0.5*pulse+0.3})`,
      glow:   `rgba(90,220,210,${0.18*pulse})`,
      pool0:  `rgba(90,220,210,${0.24*pulse})`,
      pool1:  "rgba(90,220,210,0)"
    };
  }
  // Infernal (por defecto)
  return {
    core:   `rgba(190,${40+35*pulse|0},10,0.95)`,
    bright: `rgba(255,${150+60*pulse|0},50,${0.5*pulse+0.3})`,
    glow:   `rgba(255,120,40,${0.15*pulse})`,
    pool0:  `rgba(255,120,40,${0.22*pulse})`,
    pool1:  "rgba(255,120,40,0)"
  };
}

function drawArena(){
  const now = performance.now()/1000;

  // Musashi — Último Duelo: mientras la cámara sigue a `player` dentro de la arena de
  // bolsillo, se dibuja el dojo en vez del coliseo real (que además está a decenas de miles
  // de píxeles de distancia -no se vería nada útil igual-). Si el que está en duelo es un
  // aliado/bot, la cámara sigue centrada en `player` como siempre y esto ni se ejecuta.
  if(player.duelActive){ drawLastDuelArena(player); return; }
  const st = aidStyle();

  // ---------- Terreno exterior propio de cada arena ----------
  aidDrawOuter(now);

  // ---------- Plataforma ----------
  ctx.save();
  octPath(ARENA_RADIUS);
  ctx.clip();

  if(floorPattern){ ctx.fillStyle = floorPattern; ctx.fillRect(-ARENA_RADIUS*1.3,-ARENA_RADIUS*1.3,ARENA_RADIUS*2.6,ARENA_RADIUS*2.6); }
  else { ctx.fillStyle="#1d130e"; ctx.fillRect(-ARENA_RADIUS*1.3,-ARENA_RADIUS*1.3,ARENA_RADIUS*2.6,ARENA_RADIUS*2.6); }

  if(st.rings){
    // Infernal: coliseo caído -nervaduras octogonales concéntricas y radios de piedra-
    ctx.strokeStyle = "rgba(20,13,10,0.75)"; ctx.lineWidth = 9;
    [0.45, 0.72, 0.92].forEach(f=>{ octPath(ARENA_RADIUS*f); ctx.stroke(); });
    ctx.strokeStyle = "rgba(96,72,56,0.35)"; ctx.lineWidth = 2;
    [0.45, 0.72, 0.92].forEach(f=>{ octPath(ARENA_RADIUS*f); ctx.stroke(); });
    ctx.strokeStyle = "rgba(20,13,10,0.7)"; ctx.lineWidth = 7;
    for(let i=0;i<8;i++){
      const a = i*(Math.PI*2/8)+Math.PI/8;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a)*ARENA_RADIUS*0.30*1.18, Math.sin(a)*ARENA_RADIUS*0.30*0.82);
      ctx.lineTo(Math.cos(a)*ARENA_RADIUS*1.18, Math.sin(a)*ARENA_RADIUS*0.82);
      ctx.stroke();
    }
  }
  if(currentArena==="divina") aidDrawDivinaGround(now);

  // ---------- Piezas planas propias de la arena (hitos, fisuras, nieve, musgo, arena...) ----------
  aidDrawDecals();

  // (los detalles secos del suelo de la Infernal y el Laberinto van horneados en aidLavaLayer)
  // ---------- Lava (solo la Infernal): capa pre-renderizada una vez (ver aidBuildLavaLayer) ----------
  if(aidLavaLayer){
    const L = aidLavaLayer, hw = VW/2/CAM_ZOOM + 40, hh = VH/2/CAM_ZOOM + 40;
    const wx0 = Math.max(L.x0, player.x-hw), wy0 = Math.max(L.y0, player.y-hh);
    const wx1 = Math.min(L.x0+L.w, player.x+hw), wy1 = Math.min(L.y0+L.h, player.y+hh);
    if(wx1 > wx0 && wy1 > wy0){
      const sx = (wx0-L.x0)*L.k, sy = (wy0-L.y0)*L.k, sw = (wx1-wx0)*L.k, sh = (wy1-wy0)*L.k;
      ctx.save(); ctx.imageSmoothingEnabled = false;
      ctx.drawImage(L.c, sx, sy, sw, sh, wx0, wy0, wx1-wx0, wy1-wy0);
      if(L.lava && vfxLoad > 0.7){ // latido de la lava: segunda pasada aditiva tenue
        ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.18+0.14*Math.sin(now*2);
        ctx.drawImage(L.c, sx, sy, sw, sh, wx0, wy0, wx1-wx0, wy1-wy0);
      }
      ctx.restore();
    }
  }

  // ---------- Árboles muertos (quemados en la Infernal, congelados en el Hielo) ----------
  if(st.trees) for(const tr of deadTrees){
    if(!inView(tr.x, tr.y, 90)) continue;
    drawDeadTree(tr);
  }

  // ---------- Luces del escenario (braseros, antorchas, cristales, runas) ----------
  aidDrawLights(now);

  // ---------- Niebla / humo / polvo en suspensión (color propio de cada arena) ----------
  if(st.smoke) for(const s of smokePuffs){
    if(!inView(s.x, s.y, s.r+40)) continue;
    const drift = Math.sin(now*0.5 + s.phase)*22;
    ctx.save(); ctx.globalAlpha = 0.13; ctx.drawImage(glowSprite(st.smoke), s.x+drift-s.r, s.y-s.r, s.r*2, s.r*2); ctx.restore();
  }

  // ---------- Viñeta ----------
  const vg = ctx.createRadialGradient(0,0,ARENA_RADIUS*0.30,0,0,ARENA_RADIUS*1.15);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(0,0,0,0.70)");
  ctx.fillStyle = vg; ctx.fillRect(-ARENA_RADIUS*1.3,-ARENA_RADIUS*1.3,ARENA_RADIUS*2.6,ARENA_RADIUS*2.6);
  ctx.restore();

  // ---------- Foso y muro perimetral (material propio de cada arena) ----------
  aidDrawMoat(now);
  aidDrawWallRing(now);
  const mvc = arenaVeinColors(0.6 + 0.25*Math.sin(now*1.8));
  if(st.moat==="lava"){ ctx.save(); ctx.strokeStyle = mvc.bright; ctx.lineWidth = 3; octPath(ARENA_RADIUS*0.955); ctx.stroke(); ctx.restore(); }

  // ---------- Acentos del borde: llamas y púas (Infernal), esquirlas (Hielo), hongos (Bosque),
  // almenas y antorchas (Laberinto), corales (Acuática), púas / agujas doradas (Divina) ----------
  let bi = 0;
  for(const br of braziers){
    bi++;
    if(vfxLoad < 0.8 && (bi&1)) continue; // con carga, la mitad de los acentos del borde
    if(!inView(br.x, br.y, 120)) continue;
    const f = 0.55 + 0.45*Math.sin(now*7 + br.phase);
    const outAng = Math.atan2(br.y, br.x);
    const ox = Math.cos(outAng), oy = Math.sin(outAng);
    if(aidDrawAccent(br, f, ox, oy, bi)) continue;

    if(br.spike && currentArena==="infernal"){
      ctx.save();
      ctx.translate(br.x, br.y);
      ctx.rotate(outAng + Math.PI/2);
      ctx.fillStyle = "#0e0907";
      ctx.beginPath();
      ctx.moveTo(-7, 6); ctx.lineTo(0, -30); ctx.lineTo(7, 6);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#3a2820";
      ctx.beginPath();
      ctx.moveTo(-4, 4); ctx.lineTo(0, -25); ctx.lineTo(4, 4);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    const h = br.h*(0.8+0.5*f);
    if(currentArena==="hielo"){
      ctx.fillStyle = `rgba(40,110,170,0.92)`;
      ctx.fillRect(br.x-6+ox*4, br.y-h*0.7+oy*4, 12, h);
      ctx.fillStyle = `rgba(${110+60*f|0},200,255,0.95)`;
      ctx.fillRect(br.x-4+ox*4, br.y-h*0.9+oy*4, 8, h*0.85);
      ctx.fillStyle = `rgba(230,250,255,${0.65*f+0.3})`;
      ctx.fillRect(br.x-2+ox*4, br.y-h*0.75+oy*4, 4, h*0.5);
      if(bi%3===0){
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = 0.10*f+0.05;
        ctx.drawImage(glowSprite("120,200,255"), br.x-80, br.y-80, 160, 160);
        ctx.restore();
      }
    } else {
      ctx.fillStyle = `rgba(210,45,12,0.92)`;
      ctx.fillRect(br.x-6+ox*4, br.y-h*0.7+oy*4, 12, h);
      ctx.fillStyle = `rgba(255,${115+65*f|0},25,0.95)`;
      ctx.fillRect(br.x-4+ox*4, br.y-h*0.9+oy*4, 8, h*0.85);
      ctx.fillStyle = `rgba(255,230,150,${0.65*f+0.3})`;
      ctx.fillRect(br.x-2+ox*4, br.y-h*0.75+oy*4, 4, h*0.5);
      if(bi%2===0){
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = 0.13*f+0.05;
        ctx.drawImage(glowSprite("255,120,40"), br.x-80, br.y-80, 160, 160);
        ctx.restore();
      }
    }
  }
}
let divinaStructures = [];
let divinaLevel = 1; // nivel de la Arena Divina: cada uno sube 10 niveles de personaje al equipo enemigo
let divinaEnemies = [];
// Los 4 roles de siempre (Tanque/Asesino/Mago/Soporte); si hay más de una clase en el mismo
// rol (como Tanque/Segador), se sortea cuál usa el equipo enemigo esta vez, igual que ya
// se hace para armar a tus propios aliados.
function pickDivinaTeamClasses(){
  const ROLE_ORDER = ["tanque","asesino","mago","soporte"];
  return ROLE_ORDER.map(role=>{
    const pool = Object.keys(CLASSES).filter(k=>CLASSES[k].roleCategory===role);
    return pool[(Math.random()*pool.length)|0];
  });
}
// Fase 3: arma el equipo enemigo "divino" -mismos campeones y habilidades de siempre, pero
// escalados al nivel que corresponde ("10 niveles de personaje por cada nivel de Arena
// Divina")- SIN tocar save.champions en ningún momento: usa el parámetro de nivel opcional
// de computePlayerStats/makeHero, así el nivel real del jugador queda intacto.
function spawnDivinaEnemyTeam(){
  // Nivel 6: en vez de otro equipo de campeones, el rival son los 4 jefes finales de las
  // arenas normales (ver makeDivinaBossChamp más arriba).
  if(divinaLevel===DIVINA_BOSS_LEVEL){
    divinaEnemies = DIVINA_BOSS_TYPES.map((type,i)=>{
      const ang = (i/DIVINA_BOSS_TYPES.length)*Math.PI*2;
      return makeDivinaBossChamp(type, Math.cos(ang)*90, -640+Math.sin(ang)*90);
    });
    return;
  }
  const lvl = Math.min(99, divinaLevel*10);
  const classes = pickDivinaTeamClasses();
  divinaEnemies = classes.map((k,i)=>{
    const ang = (i/classes.length)*Math.PI*2;
    const h = makeHero(k, true, Math.cos(ang)*70, -640+Math.sin(ang)*70, lvl, true);
    h.divinaAdvanceTarget = {x:0, y:700}; // hacia el castillo del jugador, al sur
    h.atkCd = 0;
    h.retreatTimer = 0;
    return h;
  });
}
// IA de Fase 3 (simple a propósito, como pide el diseño): mientras no tenga un héroe del
// jugador cerca, avanza hacia el castillo enemigo (el del jugador); si lo tiene cerca, se
// frena y pelea cuerpo a cuerpo. Todavía no distingue ataque/defensa/retirada -eso se afina
// en una pasada aparte- pero ya es un equipo de 4 que avanza y golpea de verdad.
function updateDivinaEnemies(dt){
  const aliveEnemyCount = divinaEnemies.filter(x=>x.alive).length;
  const aliveHeroCount = heroes.filter(p=>p.alive).length;
  for(const h of divinaEnemies){
    if(!h.alive) continue;
    if(h.hurtTimer>0) h.hurtTimer -= dt;
    if(h.atkCd>0) h.atkCd -= dt;
    // Fase 5: destellos sagrados subiendo alrededor del cuerpo, parte del aura divina
    // (más frecuentes cuanto más alto el nivel de la Arena Divina, mismo criterio del aura)
    if(Math.random() < 0.28*Math.min(2.2,1+(divinaLevel-1)*0.13)){
      particles.push({x:h.x+(Math.random()-0.5)*30, y:h.y+(Math.random()-0.5)*14, vx:(Math.random()-0.5)*10, vy:-30-Math.random()*20, life:600, color:Math.random()<0.6?"#ffe8a0":"#fff6d8"});
    }

    // --- RETIRADA: con poca vida y en desventaja numérica, se aleja hacia su propia base a
    // recuperar distancia en vez de seguir peleando a lo loco. No es invulnerable mientras
    // huye -sigue pudiendo recibir daño si lo alcanzan- pero no ataca ni avanza al frente.
    if(h.retreatTimer>0){
      h.retreatTimer -= dt;
      const dx = 0-h.x, dy = -680-h.y, l = Math.hypot(dx,dy)||1;
      h.fx = dx/l; h.fy = dy/l;
      if(l>40){
        h.x += (dx/l) * h.baseSpeed*0.95 * dt/1000;
        h.y += (dy/l) * h.baseSpeed*0.95 * dt/1000;
      }
      h.animT += dt;
      continue;
    }
    if(h.hp/h.maxHp < 0.22 && aliveEnemyCount < aliveHeroCount){
      h.retreatTimer = 2600;
      if(h===divinaEnemies[0] || true) floatText(h.x, h.y-40, "¡Retirada!", null);
      continue;
    }

    // --- DEFENSA: si alguna estructura PROPIA está siendo amenazada por un héroe o un minion
    // del jugador, prioriza volver a defenderla por sobre seguir avanzando a ciegas.
    const playerThreats = [...heroes.filter(p=>p.alive), ...divinaMinions.filter(m=>m.alive && m.side==="player")];
    let threatened = null, threatD = 240;
    for(const s of divinaStructures){
      if(!s.alive || s.side!=="enemy") continue;
      for(const p of playerThreats){
        const d = distance(p, s);
        if(d < threatD){ threatD = d; threatened = s; }
      }
    }

    // --- COMBATE: entre los héroes y minions del jugador al alcance, prioriza al más
    // vulnerable (menos vida), no siempre al más cercano sin criterio -tal como pedía el
    // diseño original- ahora también trabando combate con las oleadas, no solo con héroes.
    let target = null, bestScore = -Infinity;
    for(const p of playerThreats){
      const d = distance(h,p);
      if(d > 260) continue;
      const score = (1 - p.hp/p.maxHp)*180 - d; // vida baja pesa más que la cercanía
      if(score > bestScore){ bestScore = score; target = p; }
    }

    if(threatened && !target){
      // ATAQUE/DEFENSA: nadie cerca para pelear, pero la base propia está en peligro -> volver
      const dx = threatened.x-h.x, dy = threatened.y-h.y, l = Math.hypot(dx,dy)||1;
      h.fx = dx/l; h.fy = dy/l;
      if(l>50){ h.x += (dx/l)*h.baseSpeed*0.9*dt/1000; h.y += (dy/l)*h.baseSpeed*0.9*dt/1000; }
      h.animT += dt;
      continue;
    }

    if(target){
      const d = distance(h,target);
      const dx = target.x-h.x, dy = target.y-h.y, l = Math.hypot(dx,dy)||1;
      h.fx = dx/l; h.fy = dy/l;
      if(d > 46){
        h.x += (dx/l) * h.baseSpeed*0.85 * dt/1000;
        h.y += (dy/l) * h.baseSpeed*0.85 * dt/1000;
      } else if(h.atkCd<=0){
        h.atkCd = 1000;
        h.attackAnim = 190;
        if(target.classKey) damageHero(target, h.baseDmg*0.8); else damageDivinaMinion(target, h.baseDmg*0.8);
        spawnSlash(h);
      }
    } else {
      // sin ningún héroe tuyo cerca: si ya tienen una estructura tuya al alcance, la
      // atacan (misma regla de protección de torres que rige para el jugador). Si no,
      // avanzan -pero apuntando primero a alguna TORRE viva mientras el castillo siga
      // protegido, no directo al castillo, o nunca romperían la defensa de verdad.
      let nearestStruct = null, bestSD = 70;
      for(const s of divinaStructures){
        if(!s.alive || s.side!=="player") continue;
        const d = distance(h,s) - s.radius;
        if(d < bestSD){ bestSD = d; nearestStruct = s; }
      }
      if(nearestStruct){
        const dx = nearestStruct.x-h.x, dy = nearestStruct.y-h.y, l = Math.hypot(dx,dy)||1;
        h.fx = dx/l; h.fy = dy/l;
        if(h.atkCd<=0){
          h.atkCd = 1100;
          h.attackAnim = 190;
          damageDivinaStructure(nearestStruct, h.baseDmg*0.7, h);
        }
      } else {
        const aliveTower = divinaStructures.find(s=>s.alive && s.side==="player" && s.type==="tower");
        const goal = aliveTower || h.divinaAdvanceTarget;
        const dx = goal.x-h.x, dy = goal.y-h.y, l = Math.hypot(dx,dy)||1;
        if(l>20){
          h.fx = dx/l; h.fy = dy/l;
          h.x += (dx/l) * h.baseSpeed*0.55 * dt/1000;
          h.y += (dy/l) * h.baseSpeed*0.55 * dt/1000;
        }
      }
    }
    h.animT += dt;
  }
}
function buildDivinaStructures(){
  // Bug reportado: con daño plano fijo, las torres (600 HP) morían casi al instante contra un
  // equipo ya progresado -runStats.dmgMult crece con maestría/talentos/objetos durante toda la
  // partida, pero la vida de la estructura era un valor estático sin relación con eso-. Se
  // reusa partyLevelScale() (el mismo ajuste que ya usa spawnEnemy para que los enemigos de las
  // arenas normales no se vuelvan triviales en cuentas avanzadas) en vez de inventar una
  // fórmula de escalado nueva.
  const pls = partyLevelScale();
  divinaStructures = DIVINA_LAYOUT.map(s=>({
    ...s, maxHp:Math.round(s.hp*pls.hp), hp:Math.round(s.hp*pls.hp), alive:true, atkCd:0,
    radius: s.type==="castle" ? 95 : 40
  }));
}
// ¿Sigue protegido el castillo de este lado? (true mientras le quede alguna torre propia en pie)
function castleProtected(side){
  return divinaStructures.some(s=>s.type==="tower" && s.side===side && s.alive);
}
function damageDivinaStructure(s, amount, src){
  if(!s.alive) return;
  if(s.type==="castle" && castleProtected(s.side)){
    floatText(s.x, s.y-110, "¡Protegido!", null);
    particles.push({x:s.x,y:s.y-70, life:260, ring:true, maxLife:260, maxR:100, color:"#d29aff"});
    return;
  }
  s.hp = Math.max(0, s.hp - amount);
  s._hitAt = animNow; // destello de impacto (ver drawDivinaFactionStructure)
  floatText(s.x, s.y-(s.type==="castle"?150:110), Math.round(amount), null);
  if(s.hp<=0){
    s.alive = false;
    particles.push({x:s.x,y:s.y-40, life:700, ring:true, maxLife:700, maxR:s.radius+40, color:"#d29aff"});
    // OJO: antes esto chequeaba "if(type==='tower') ... else CASTILLO DESTRUIDO", así que una
    // torre intermedia (type:"midtower") caía en el else y terminaba la partida como si fuera
    // el castillo. Ahora se chequea el castillo explícitamente primero.
    if(s.type==="castle"){
      showBanner("¡CASTILLO DESTRUIDO!");
      if(s.side==="enemy"){
        divinaLevel++; // Fase 4: ganaste -> el próximo intento ya escala al nivel siguiente
        setTimeout(()=>{ showGameOverScreen("victory"); }, 900);
      } else {
        setTimeout(()=>{ showGameOverScreen("castle"); }, 900);
      }
    } else {
      showBanner(s.type==="midtower" ? "¡TORRE INTERMEDIA DESTRUIDA!" : "¡TORRE DESTRUIDA!");
      if(s.type==="tower" && !castleProtected(s.side)) setTimeout(()=>showBanner("¡CASTILLO VULNERABLE!"), 900);
    }
  }
}

// ============================================================
// ARENA DIVINA — combate por bando: unifica campeones, oleadas de minions y estructuras bajo
// una sola noción de "objetivo hostil", para que cualquier cosa que pelee en el asedio (tuya
// o del equipo enemigo) pueda trabar combate con lo que tenga cerca, no solo con los héroes
// (antes tus 3 aliados no atacaban NADA en la Arena Divina: ver triggerBasic/updateAllies).
// mySide "player" = vos (heroes); "enemy" = el equipo rival (divinaEnemies).
// ============================================================
function divinaHostiles(mySide, x, y, range, opts){
  opts = opts || {};
  const list = [];
  if(mySide==="player"){
    for(const h of divinaEnemies){ if(h.alive) list.push({kind:"champ", ref:h}); }
    for(const m of divinaMinions){ if(m.alive && m.side==="enemy") list.push({kind:"minion", ref:m}); }
    if(!opts.unitsOnly) for(const s of divinaStructures){ if(s.alive && s.side==="enemy") list.push({kind:"structure", ref:s}); }
  } else {
    for(const h of heroes){ if(h.alive) list.push({kind:"hero", ref:h}); }
    for(const m of divinaMinions){ if(m.alive && m.side==="player") list.push({kind:"minion", ref:m}); }
    if(!opts.unitsOnly) for(const s of divinaStructures){ if(s.alive && s.side==="player") list.push({kind:"structure", ref:s}); }
  }
  let best=null, bestD=Infinity;
  for(const it of list){
    const d = distance({x,y}, it.ref) - (it.ref.radius||0);
    if(d<=range && d<bestD){ bestD=d; best=it; }
  }
  return best;
}
function divinaDealDamage(target, amount, src){
  if(target.kind==="hero" || target.kind==="champ") damageHero(target.ref, amount);
  else if(target.kind==="minion") damageDivinaMinion(target.ref, amount, src);
  else if(target.kind==="structure") damageDivinaStructure(target.ref, amount, src);
}
// Proyectiles de estructura (pedido explícito: "que los básicos de las torres sean bolas
// grandes"): en vez de aplicar el daño al instante, la torre/castillo dispara una bola real
// (sprite proyectil_XX del usuario) que viaja hasta el objetivo y recién ahí impacta -mismo
// criterio que cualquier otro proyectil del juego, solo que persiguiendo un blanco en vez de
// una dirección fija, porque el objetivo puede seguir moviéndose mientras la bola viaja-.
let divinaStructProjectiles = [];
function updateDivinaStructuresCombat(dt){
  for(const s of divinaStructures){
    if(!s.alive) continue;
    if(s.atkCd>0){ s.atkCd -= dt; continue; }
    const range = s.type==="castle" ? 260 : 220;
    const hit = divinaHostiles(s.side, s.x, s.y, range, {unitsOnly:true});
    if(!hit) continue;
    s.atkCd = s.type==="castle" ? 900 : 1100;
    divinaStructProjectiles.push({
      x:s.x, y:s.y-(s.type==="castle"?90:80), target:hit, side:s.side, src:s,
      speed: 420, animT:0, life:1400
    });
  }
}
function updateDivinaStructProjectiles(dt){
  for(const p of divinaStructProjectiles){
    p.animT += dt; p.life -= dt;
    const t = p.target && p.target.ref;
    if(!t || !t.alive){ p.life = 0; continue; }
    const dx=t.x-p.x, dy=(t.y-14)-p.y, d=Math.hypot(dx,dy)||1;
    if(d <= 20){
      if(p.target.kind==="hero" || p.target.kind==="champ"){
        divinaTowerHitChampion(p.src, t);
      } else {
        divinaDealDamage(p.target, p.src.type==="castle" ? 46 : 30, p.src);
      }
      p.life = 0;
      continue;
    }
    p.x += dx/d*p.speed*dt/1000; p.y += dy/d*p.speed*dt/1000;
  }
  divinaStructProjectiles = divinaStructProjectiles.filter(p=>p.life>0);
}
function drawDivinaStructProjectiles(){
  for(const p of divinaStructProjectiles){
    if(DIVINA_PROJ_REAL_READY.frame1){
      const seq = ["frame1","frame2","frame3","frame4","frame5"];
      const key = seq[Math.floor(p.animT/60)%seq.length];
      const img = DIVINA_PROJ_REAL_READY[key] ? DIVINA_PROJ_REAL_IMG[key] : DIVINA_PROJ_REAL_IMG.frame1;
      const targetH = 34, sc = targetH/img.height;
      const clip = { frames: [{x:0,y:0,w:img.width,h:img.height}] };
      drawAnimFrameSized(img, clip, 0, p.x, p.y, img.width*sc, img.height*sc, 0.5, 0.5, false, 1);
    } else {
      ctx.save(); ctx.globalCompositeOperation="lighter";
      ctx.fillStyle = "rgba(210,150,255,0.85)";
      ctx.beginPath(); ctx.arc(p.x, p.y, 9, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }
  }
}
// Daño porcentual escalado de torres/castillo contra un campeón (sección de daño true, ignora
// defensa/escudos: es daño de asedio, no un golpe cuerpo a cuerpo más). Reusa el mismo bloque de
// manejo de muerte que damageHero (onPlayerDeath / caída de aliado) para no duplicar esa lógica
// mal, solo que sin pasar por la mitigación genérica.
function divinaTowerHitChampion(s, h){
  if(!h || !h.alive || h.invulnTimer>0) return;
  if(!s.hitTracker) s.hitTracker = new Map();
  const now = performance.now();
  let rec = s.hitTracker.get(h);
  if(!rec || now-rec.lastHit > DIVINA_TOWER_HIT_RESET_MS) rec = {count:0};
  rec.count++; rec.lastHit = now;
  s.hitTracker.set(h, rec);
  const pct = DIVINA_TOWER_HIT_PCTS[Math.min(rec.count-1, DIVINA_TOWER_HIT_PCTS.length-1)];
  const executing = pct>=1;
  const dmg = executing ? h.hp+1 : h.maxHp*pct;
  h.hp = Math.max(0, h.hp-dmg);
  h.hurtTimer = 160;
  floatText(h.x, h.y-30, executing ? "¡EJECUTADO!" : "-"+Math.round(dmg), executing?"crit":null);
  for(let i=0;i<(executing?10:4);i++) particles.push({x:h.x+(Math.random()-0.5)*10, y:h.y-20, vx:(Math.random()-0.5)*90, vy:(Math.random()-0.5)*90-20, life:200, color:"#ff5a5a"});
  if(h.hp<=0){
    h.hp = 0;
    s.hitTracker.delete(h); // una vida nueva empieza el conteo de impactos de cero
    if(h===player){ onPlayerDeath(); }
    else {
      h.alive = false;
      showBanner(`${h.cls.name} ha caído`);
      for(let i=0;i<12;i++) particles.push({x:h.x,y:h.y, vx:(Math.random()-0.5)*160, vy:(Math.random()-0.5)*160, life:500, color:h.cls.color});
      if(h.isBossChamp) vfxOnDeath(h); // jefe divino (entidad tipo enemigo): muerte con su sprite
    }
  }
}

// ---- Oleadas de minions: cada tanto salen refuerzos para LOS DOS bandos, con exactamente la
// misma composición para cada uno (mismo sorteo, tal como pediste). El roster sale de TODOS
// los enemigos comunes de las 4 arenas normales (Bosque/Hielo/Laberinto/Infernal), sin jefes
// ni subjefes -la Arena Divina como "resumen" de todo lo ya peleado, no monstruos propios-.
let divinaMinions = [];
let divinaWaveTimer = 0;
// Calculado perezosamente (no al cargar el script): ENEMY_BASE todavía no existe en este
// punto del archivo, así que un `const ... = Object.keys(ENEMY_BASE)` de nivel superior acá
// rompería el juego entero al arrancar (ReferenceError por TDZ).
let _divinaWavePoolCache = null;
function divinaWavePool(){
  if(!_divinaWavePoolCache){
    _divinaWavePoolCache = Object.keys(ENEMY_BASE).filter(k=>{
      const r = ENEMY_BASE[k].rank;
      return r!=="jefe" && r!=="subjefe";
    });
  }
  return _divinaWavePoolCache;
}
function pickDivinaWaveComposition(){
  const pool = divinaWavePool();
  const picks = [];
  for(let i=0;i<DIVINA_WAVE_SIZE;i++) picks.push(pool[(Math.random()*pool.length)|0]);
  return picks;
}
function makeDivinaMinion(type, side, x, y){
  const base = ENEMY_BASE[type];
  const lvlScale = Math.min(2.2, 1 + (divinaLevel-1)*0.12);
  return {
    type, side, rank: base.rank, alive:true,
    x, y, radius: base.radius, scale: base.scale*0.92,
    hp: Math.round(base.hp*lvlScale*1.4), maxHp: Math.round(base.hp*lvlScale*1.4),
    dmg: Math.round(base.dmg*lvlScale*1.2),
    speed: base.speed*0.9, color: base.color,
    ranged: base.ranged||false, range: base.range||0, projSpeed: base.projSpeed||0,
    atkCd:0, fx:0, fy: side==="enemy"?1:-1, animT:Math.random()*600, attackAnim:0, hitFlash:0,
    goal: side==="enemy" ? {x:0,y:700} : {x:0,y:-700}
  };
}
function spawnDivinaWave(){
  const picks = pickDivinaWaveComposition();
  picks.forEach((type,i)=>{
    const off = (i-(picks.length-1)/2)*46;
    divinaMinions.push(makeDivinaMinion(type, "enemy", off, -640));
    divinaMinions.push(makeDivinaMinion(type, "player", off, 640));
  });
  showBanner("¡Oleada de refuerzos!");
}
function updateDivinaMinions(dt){
  for(const m of divinaMinions){
    if(!m.alive) continue;
    if(m.atkCd>0) m.atkCd -= dt;
    if(m.hitFlash>0) m.hitFlash -= dt;
    if(m.attackAnim>0) m.attackAnim -= dt;
    const AGGRO = 220, atkRange = m.ranged ? m.range : (m.radius+30);
    const hit = divinaHostiles(m.side, m.x, m.y, AGGRO);
    if(hit){
      const t = hit.ref;
      const dx=t.x-m.x, dy=t.y-m.y, d=Math.hypot(dx,dy)||1;
      m.fx=dx/d; m.fy=dy/d;
      const stopDist = hit.kind==="structure" ? ((t.radius||0)+atkRange) : atkRange;
      if(d > stopDist){
        m.x += dx/d*m.speed*dt/1000; m.y += dy/d*m.speed*dt/1000;
      } else if(m.atkCd<=0){
        m.atkCd = m.ranged ? 1400 : 1000;
        m.attackAnim = 220;
        divinaDealDamage(hit, m.dmg, m);
      }
    } else {
      const dx=m.goal.x-m.x, dy=m.goal.y-m.y, d=Math.hypot(dx,dy)||1;
      if(d>20){ m.fx=dx/d; m.fy=dy/d; m.x += dx/d*m.speed*dt/1000; m.y += dy/d*m.speed*dt/1000; }
    }
    m.animT += dt;
  }
  divinaMinions = divinaMinions.filter(m=>m.alive);
}
function damageDivinaMinion(m, amount){
  if(!m.alive) return;
  m.hp -= amount;
  m.hitFlash = 90;
  floatText(m.x, m.y-20, Math.round(amount), null);
  if(m.hp<=0){
    m.alive = false;
    for(let i=0;i<6;i++) particles.push({x:m.x,y:m.y, vx:(Math.random()-0.5)*120, vy:(Math.random()-0.5)*120, life:360, color:m.color});
    vfxOnDeath(m); // muerte con su propio sprite (antes desaparecía en el acto), solo visual
  }
}

// ---- Colores de equipo: anillo bajo los pies de cada campeón (tuyo o rival) mientras estás
// en la Arena Divina, para distinguir a simple vista quién pelea para cada bando.
function drawDivinaTeamRing(ent, side){
  // Pedido explícito: "es un juego 2D, no alcanza un circulito" -además del anillo en el piso
  // (que sigue marcando bien la posición exacta) suma un halo de color detrás de todo el
  // cuerpo (drawDivinaTeamAura, mismo criterio que ya usan las estructuras).
  const r = ent.radius||24;
  drawDivinaTeamAura(ent.x, ent.y+r*0.5, r*1.5, r*0.9, side, 0.85);
  const col = side==="enemy" ? "#ff5a6a" : "#4ac8ff";
  const pulse = 0.6+0.4*Math.sin(performance.now()/260 + ent.x*0.01);
  ctx.save();
  ctx.globalAlpha = 0.5+0.25*pulse;
  ctx.strokeStyle = col; ctx.lineWidth = 2.2; ctx.shadowColor = col; ctx.shadowBlur = 6;
  ctx.beginPath(); ctx.ellipse(ent.x, ent.y+r*0.5, r*1.05, r*0.42, 0, 0, Math.PI*2); ctx.stroke();
  ctx.restore();
}
function makeDivinaBossChamp(type, x, y){
  const base = ENEMY_BASE[type];
  const scaleMult = 1 + Math.max(0, divinaLevel-DIVINA_BOSS_LEVEL)*0.12;
  return {
    type, rank: base.rank, isBossChamp:true, isDivineFoe:true, alive:true,
    x, y, radius: base.radius*1.15, scale: base.scale*1.05,
    hp: Math.round(base.hp*1.6*scaleMult), maxHp: Math.round(base.hp*1.6*scaleMult),
    dmg: Math.round(base.dmg*1.3*scaleMult), baseDmg: Math.round(base.dmg*1.3*scaleMult),
    speed: base.speed*0.85, baseSpeed: base.speed*0.85, def:0.12, classKey:null, stats:null,
    cls:{name:base.name, color:base.color},
    color: base.color, ranged: base.ranged||false, range: base.range||0, projSpeed: base.projSpeed||0,
    fx:0, fy:1, animT:Math.random()*600, attackAnim:0, hitFlash:0, hurtTimer:0, atkCd:0, retreatTimer:0,
    divinaAdvanceTarget: {x:0, y:700}
  };
}
function drawDivinaHpBar(s){
  const w = s.type==="castle" ? 130 : 56, h = 6, y = s.y - (s.type==="castle" ? 175 : 118);
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(s.x-w/2-1, y-1, w+2, h+2);
  ctx.fillStyle = s.side==="enemy" ? "#5a2a3a" : "#2a3a5a"; ctx.fillRect(s.x-w/2, y, w, h);
  const pct = Math.max(0, s.hp/s.maxHp);
  ctx.fillStyle = s.side==="enemy" ? "#e04a5a" : "#4a8ae0"; ctx.fillRect(s.x-w/2, y, w*pct, h);
  ctx.restore();
}
// Aura de equipo más visible que un simple anillo en el piso (pedido explícito: "no alcanza un
// circulito"): un halo de color detrás de todo el cuerpo, rojo para el bando rival y celeste
// para el propio. La usan tanto las estructuras (ver más abajo) como drawDivinaTeamRing (heroes/
// minions), así el criterio visual es el mismo en todas partes.
function drawDivinaTeamAura(x, y, rx, ry, side, strength){
  const col = side==="enemy" ? "255,90,100" : "80,200,255";
  const pulse = 0.65+0.35*Math.sin(performance.now()/300 + x*0.01);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const g = ctx.createRadialGradient(x, y, rx*0.15, x, y, rx*1.35);
  g.addColorStop(0, `rgba(${col},${(0.30+0.14*pulse)*strength})`);
  g.addColorStop(1, `rgba(${col},0)`);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(x, y, rx*1.35, ry*1.35, 0, 0, Math.PI*2); ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = 0.55+0.3*pulse;
  ctx.strokeStyle = `rgb(${col})`; ctx.lineWidth = 2.4; ctx.shadowColor = `rgb(${col})`; ctx.shadowBlur = 8;
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI*2); ctx.stroke();
  ctx.restore();
}
function drawDivinaTower(s, now){
  if(drawDivinaFactionStructure(s, now)){ if(s.alive) drawDivinaHpBar(s); return; }
  const {x,y} = s;
  if(!s.alive){
    ctx.save(); ctx.translate(x,y);
    ctx.fillStyle="rgba(0,0,0,0.5)"; ctx.beginPath(); ctx.ellipse(0,10,30,12,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="#241c30"; ctx.fillRect(-24,-8,48,18); ctx.fillRect(-16,-24,20,16); ctx.fillRect(6,-16,16,10);
    ctx.restore();
    return;
  }
  drawDivinaTeamAura(x, y+10, 46, 20, s.side, 1);
  if(DIVINA_TOWER_REAL_READY.frame1){
    const seq = ["frame1","frame2","frame3","frame4","frame5"];
    const key = seq[Math.floor(now*2.2 + x*0.02) % seq.length];
    const img = DIVINA_TOWER_REAL_READY[key] ? DIVINA_TOWER_REAL_IMG[key] : DIVINA_TOWER_REAL_IMG.frame1;
    const targetH = 128, sc = targetH/img.height;
    const clip = { frames: [{x:0,y:0,w:img.width,h:img.height}] };
    drawAnimFrameSized(img, clip, 0, x, y, img.width*sc, img.height*sc, 0.5, 0.92, false, 1);
    drawDivinaHpBar(s);
    return;
  }
  const pulse = 0.6+0.4*Math.sin(now*1.6 + x*0.01);
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.beginPath(); ctx.ellipse(0,10,30,12,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = "#2a2038"; ctx.fillRect(-26,-90,52,100);
  ctx.fillStyle = "#4a3a64"; ctx.fillRect(-22,-86,44,92);
  ctx.fillStyle = "#5e4a7e"; ctx.fillRect(-22,-86,44,14);
  for(let i=-2;i<=2;i++){ ctx.fillStyle="#3a2c54"; ctx.fillRect(i*9-4,-100,7,12); }
  ctx.fillStyle = `rgba(200,140,255,${0.7*pulse+0.3})`;
  ctx.beginPath(); ctx.arc(0,-96,6,0,Math.PI*2); ctx.fill();
  ctx.save(); ctx.globalCompositeOperation="lighter";
  const g = ctx.createRadialGradient(0,-96,2,0,-96,40);
  g.addColorStop(0, `rgba(210,150,255,${0.35*pulse})`); g.addColorStop(1,"rgba(210,150,255,0)");
  ctx.fillStyle=g; ctx.fillRect(-40,-136,80,80);
  ctx.restore();
  ctx.restore();
  drawDivinaHpBar(s);
}
function drawDivinaCastle(s, now){
  const {x,y} = s;
  const protectedNow = s.alive && castleProtected(s.side);
  if(drawDivinaFactionStructure(s, now)){
    if(protectedNow){
      ctx.save();
      const pulseS = 0.6+0.4*Math.sin(now*1.2);
      ctx.globalAlpha = 0.35+0.15*pulseS;
      ctx.strokeStyle = s.side==="player" ? "#ffe8a0" : "#ff7a9a"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(x, y-40, 110, 90, 0, 0, Math.PI*2); ctx.stroke();
      ctx.restore();
    }
    if(s.alive) drawDivinaHpBar(s);
    return;
  }
  if(!s.alive){
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle="rgba(0,0,0,0.5)"; ctx.beginPath(); ctx.ellipse(0,16,90,22,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="#1c1626"; ctx.fillRect(-70,-40,140,70);
    ctx.fillStyle="#120c1c"; ctx.fillRect(-40,-70,26,40); ctx.fillRect(10,-58,30,30);
    ctx.restore();
    return;
  }
  drawDivinaTeamAura(x, y+16, 130, 40, s.side, 1.2);
  if(DIVINA_CASTLE_REAL_READY.frame1){
    const key = Math.floor(now*1.4 + x*0.02) % 2 === 0 ? "frame1" : "frame2";
    const img = DIVINA_CASTLE_REAL_READY[key] ? DIVINA_CASTLE_REAL_IMG[key] : DIVINA_CASTLE_REAL_IMG.frame1;
    const targetH = 190, sc = targetH/img.height;
    const clip = { frames: [{x:0,y:0,w:img.width,h:img.height}] };
    drawAnimFrameSized(img, clip, 0, x, y, img.width*sc, img.height*sc, 0.5, 0.86, false, 1);
    if(protectedNow){
      ctx.save();
      const pulseS = 0.6+0.4*Math.sin(now*1.2);
      ctx.globalAlpha = 0.35+0.15*pulseS;
      ctx.strokeStyle = "#9fe8ff"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(x, y-40, 110, 90, 0, 0, Math.PI*2); ctx.stroke();
      ctx.restore();
    }
    drawDivinaHpBar(s);
    return;
  }
  ctx.save();
  ctx.translate(x, y);
  const pulse = 0.6+0.4*Math.sin(now*1.2);
  ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.beginPath(); ctx.ellipse(0,16,90,22,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = "#241c34"; ctx.fillRect(-90,-110,180,140);
  ctx.fillStyle = "#3c2e58"; ctx.fillRect(-84,-104,168,130);
  ctx.fillStyle = "#503c78"; ctx.fillRect(-84,-104,168,16);
  [-70,70].forEach(dx=>{
    ctx.fillStyle="#241c34"; ctx.fillRect(dx-16,-138,32,60);
    ctx.fillStyle="#4a3a6e"; ctx.fillRect(dx-12,-134,24,52);
    for(let i=-1;i<=1;i++){ ctx.fillStyle="#241c34"; ctx.fillRect(dx+i*8-3,-140,6,10); }
  });
  ctx.fillStyle = "#120c1c"; ctx.beginPath();
  ctx.moveTo(-24,30); ctx.lineTo(-24,-16); ctx.quadraticCurveTo(0,-40,24,-16); ctx.lineTo(24,30); ctx.closePath(); ctx.fill();
  ctx.fillStyle = `rgba(220,160,255,${0.55*pulse+0.35})`;
  ctx.beginPath(); ctx.ellipse(0,-70,16,10,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = "#150a24"; ctx.beginPath(); ctx.ellipse(0,-70,7,7,0,0,Math.PI*2); ctx.fill();
  ctx.save(); ctx.globalCompositeOperation="lighter";
  const g = ctx.createRadialGradient(0,-70,4,0,-70,90);
  g.addColorStop(0, `rgba(210,150,255,${0.3*pulse})`); g.addColorStop(1,"rgba(210,150,255,0)");
  ctx.fillStyle=g; ctx.fillRect(-90,-160,180,180);
  ctx.restore();
  // Escudo visible mientras el castillo esté protegido por sus torres
  if(protectedNow){
    ctx.save();
    ctx.globalAlpha = 0.35+0.15*pulse;
    ctx.strokeStyle = "#9fe8ff"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(0,-40,110,90,0,0,Math.PI*2); ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
  drawDivinaHpBar(s);
}

// Qué criaturas pueden aparecer en cada nivel de arena (dificultad creciente)
function spawnPoolFor(level){
  if(currentArena==="hielo") return spawnPoolForHielo(level);
  if(currentArena==="bosque") return spawnPoolForBosque(level);
  if(currentArena==="laberinto") return spawnPoolForLaberinto(level);
  if(currentArena==="acuatica") return spawnPoolForAcuatica(level);
  const pool = [{t:"esqueleto", w:10}];
  if(level >= 2) pool.push({t:"zombie", w:6});
  if(level >= 3) pool.push({t:"esqueleto_h", w:4});
  if(level >= 5) pool.push({t:"demonio_menor", w:4});
  if(level >= 6) pool.push({t:"demonio_mago", w:2});
  if(level >= 7) pool.push({t:"golem", w:2});
  // en niveles altos la chusma básica pierde peso frente a las criaturas mayores
  if(level >= 8){ pool[0].w = 5; }
  if(level >= 9){ pool[0].w = 3; }
  return pool;
}
// Laberinto Maldito: roster propio (Escorpión Gigante -> Gólem de Piedra -> Medusa ->
// Druida de Arena -> Esfinge), con arte real integrado. El Guardián (subjefe, nivel 6) y
// el Minotauro (jefe final) ya eran exclusivos de esta arena.
function spawnPoolForLaberinto(level){
  const pool = [{t:"escorpion_gigante", w:10}];
  if(level >= 2) pool.push({t:"golem_piedra", w:6});
  if(level >= 3) pool.push({t:"medusa", w:5});
  if(level >= 5) pool.push({t:"druida_arena", w:4});
  if(level >= 7) pool.push({t:"esfinge", w:3});
  if(level >= 8){ pool[0].w = 6; }
  return pool;
}
// Ruinas del Bosque: roster real (Duendes/Hadas -> Bestias/Cù-Sìth -> Ents/Dama del Bosque).
// El nivel 9 no aparece acá: ahí saltan los 4 Dobladores juntos (ver update()), y mientras
// estén vivos se corta la aparición normal, igual que con cualquier campeón/subjefe.
function spawnPoolForBosque(level){
  const pool = [{t:"duende_bosque", w:10}, {t:"enjambre_hadas", w:6}];
  if(level >= 3) pool.push({t:"bestia_bosque", w:5});
  if(level >= 4) pool.push({t:"cu_sith", w:4});
  if(level >= 6) pool.push({t:"dama_bosque", w:2});
  if(level >= 7) pool.push({t:"ent", w:2});
  if(level >= 8){ pool[0].w = 6; }
  return pool;
}
// Mismo criterio que la Arena Infernal (spawnPoolFor), con el roster de hielo. A diferencia
// de la Infernal (3 subjefes en niveles 4/7/9), acá hay un solo subjefe -Tundraverx- en el
// nivel 6 (ver la lista ARENA_SUBBOSS_LEVELS en beginLevel/update).
function spawnPoolForHielo(level){
  const pool = [{t:"lobo_artico", w:10}];
  if(level >= 2) pool.push({t:"golem_hielo", w:6});
  if(level >= 3) pool.push({t:"dragoncito_hielo", w:5});
  if(level >= 5) pool.push({t:"angel_hielo", w:4});
  if(level >= 6) pool.push({t:"demonio_hielo_fuego", w:3});
  if(level >= 8){ pool[0].w = 5; }
  if(level >= 9){ pool[0].w = 3; }
  return pool;
}
// Arena Acuática: roster propio, introducido de a poco tal como pide el diseño -tiburones
// solos, después +medusas, después +cangrejos, después +sirenas, después +anguilas, y recién
// en niveles altos el Tiburón Blanco (élite) se suma al pool común-. El Kraken Joven (subjefe,
// nivel 6) y el Leviatán (jefe final) no van acá: se manejan aparte, igual que en el resto de
// las arenas (ver subBossLevels/startBossFight).
function spawnPoolForAcuatica(level){
  const pool = [{t:"tiburon_joven", w:10}];
  if(level >= 2) pool.push({t:"medusa_electrica", w:6});
  if(level >= 3) pool.push({t:"cangrejo_acorazado", w:5});
  if(level >= 4) pool.push({t:"sirena_abisal", w:4});
  if(level >= 5) pool.push({t:"anguila_electrica", w:4});
  if(level >= 7) pool.push({t:"tiburon_blanco", w:2});
  if(level >= 8){ pool[0].w = 6; }
  return pool;
}
function pickFromPool(pool){
  let total = 0; for(const p of pool) total += p.w;
  let r = Math.random()*total;
  for(const p of pool){ r -= p.w; if(r <= 0) return p.t; }
  return pool[0].t;
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

/* ============================================================
   ENTITY FACTORY
   ============================================================ */
function makeHero(classKey, isBot, spawnX, spawnY, levelOverride, isDivineFoe){
  const base = computePlayerStats(classKey, levelOverride); // ya incluye hp_mult/speed_mult (talentos+objetos)
  const cls = CLASSES[classKey];
  // Energía sí se calcula acá aparte (computePlayerStats no la toca): talentos/objetos con
  // energy_mult, mismo balde {effect,value} de siempre, sumado UNA vez al crear el héroe (no
  // cambia a mitad de partida, a diferencia de dmg/cd/def/lifesteal que sí se leen en caliente).
  const tEnergy = 1 + passiveSum(classKey, "energy_mult");
  let maxHp = Math.round(base.hp * runStats.hpMult);
  if(isBot && !isDivineFoe) maxHp = Math.round(maxHp*1.15); // los aliados aguantan un poco más
  // Escudo PERMANENTE otorgado por casco+escudo equipados (distinto del escudo temporal de
  // habilidades: este no desaparece por timer, solo se consume con el daño y no regenera solo,
  // tal como pide el diseño ("no inventar regeneración si no existe").
  const itemMaxShield = Math.round(maxHp * (base.shieldPct||0));
  const teleportChargeMax = Math.max(0, Math.round(talentSkillMods(classKey, 2).flags.extraTeleportCharges||0));
  return {
    x:spawnX||0, y:spawnY||0, radius:24, scale:2.0,
    classKey, cls, isBot: !!isBot, isDivineFoe: !!isDivineFoe,
    maxHp, hp:maxHp,
    itemShield: itemMaxShield, itemMaxShield, emergencyShieldUsed:false,
    maxEnergy:Math.round(cls.energyMax*tEnergy), energy:Math.round(cls.energyMax*tEnergy),
    baseDmg: base.dmg * (isBot && !isDivineFoe ? 0.72 : 1), def:base.def, baseSpeed:base.speed*(isBot?0.95:1)*arenaMods().heroSpeedMult,
    // Axiom — Teletransporte con cargas (ver resolveTeleportCd): 0 cargas extra por defecto,
    // como siempre; solo campeones con el talento correspondiente arrancan con más de 1.
    teleportChargeMax, teleportChargesBanked: teleportChargeMax, teleportChargeTimer:0,
    ultCharge:0, ultMax:100,
    shield:0, shieldTimer:0,
    stunTimer:0,
    buffTimer:0, buffDmgMult:1, buffAtkSpeedMult:1, buffLifesteal:0, buffDefMult:1, buffBleedOnHit:false,
    regenTimer:0, regenPerSec:0, hurtTimer:0,
    spinTimer:0, spinMaxTimer:0, spinRadius:0, spinTick:0, spinTickInterval:0, spinDmg:0,
    spinDurationMult:1, colossalTimer:0, pendingHpBonus:0, growTimer:0, growScale:1, spinTier:1,
    stormTimer:0, stormMaxTimer:0, stormTick:0, stormTickInterval:0, stormRadius:0, stormDmg:0,
    stormNovaLeft:0, stormNovaInterval:0, stormNovaTimer:0, stormNovaDmg:0, stormNovaFreeze:0, stormNovaFreezeDur:0,
    furyArmorTimer:0, furyArmorMaxTimer:0, berserkTimer:0, berserkExtendMs:0, // Segador Olvidado
    furyPower:0, furyGenMult:1, furyConvertPct:0, furyAreaMult:1, furyFinalSlash:false, furyResistCC:false,
    dashFxTimer:0, dashFxFlip:false, growMaxTimer:0, // Tanque: overlays visuales de habilidades
    burnTimer:0, burnDmg:0, // quemadura ambiental (Arena Infernal)
    atkAuraTimer:0, shieldAuraTimer:0,
    sigilTimer:0, sigilMaxTimer:0, sigilRadius:0, sigilColor:"", sigilTier:1,
    stealthTimer:0, stealthPending:false,
    cds:[0,0,0], basicCd:0, ultCd:0,
    fx:0, fy:1, animT:0, moving:false, attackAnim:0,
    // La Profeta: combo del básico (Danza del Presagio), historial de daño reciente (para
    // Destino Restaurado) y estado de la Ascensión del Elegido (ver castAbility/triggerBasic).
    presagioCharges:0, presagioComboTimer:0, profetaSpinFxTimer:0, recentDamage:[],
    visionImmortalTimer:0, visionImmortalRegenPct:0,
    ascensionTimer:0, ascensionMaxTimer:0, ascensionFusedWith:null, fused:false,
    // Musashi — Marca de Duelo/Concentración (pasiva 1, sección "MUSASHI"): duelTarget es una
    // referencia directa al enemigo marcado (no un id: mientras esté vivo, es el mismo objeto
    // dentro de `enemies`); concentration va de 0 a MUSASHI_CONC_MAX y se resetea al cambiar
    // de objetivo. comboCharges/comboTimer son el combo de 3 golpes del básico (independiente
    // de la Concentración: el combo es "cuántos golpes seguidos", la Concentración es "cuánto
    // conoce a ESTE rival"). ghostStepCritTimer: ventana de crítico garantizado en el próximo
    // básico tras Paso Fantasma. duelActive/duelTimer/duelReturnX/Y/duelOpponent: estado del
    // Último Duelo en curso (ver enterLastDuel/updateLastDuel/exitLastDuel).
    duelTarget:null, concentration:0, comboCharges:0, comboTimer:0, ghostStepCritTimer:0,
    ghostStepCdBonusTimer:0, secondCutPending:0,
    duelActive:false, duelTimer:0, duelMaxTimer:0, duelReturnX:0, duelReturnY:0, duelOpponent:null, duelResult:null,
    // Sylva — Instinto de Caza (Presa/Rastreo, 0-5) e Impulso (0-10, sube moviéndose/atacando,
    // decae tras una breve gracia sin hacer ninguna de las dos cosas). huntTarget es la
    // referencia directa al enemigo marcado, igual mecanismo que duelTarget de Musashi pero
    // con su propia progresión (no comparten variable a propósito, sección 24 del pedido de
    // Musashi ya advertía "no mezclar sistemas en una sola variable", mismo criterio acá).
    huntTarget:null, trackStacks:0, momentum:0, momentumGraceTimer:0,
    sylvaCharging:false, sylvaChargeTimer:0, sylvaTrapBurstTimer:0, sylvaTrapBurstBonus:0,
    wildHuntTimer:0, wildHuntMaxTimer:0, wolf:null,
    // Nigromante:
    skeletons:[], golem:null, nigroCastKind:null, nigroGraveyard:[],
    nigroTransformTimer:0, nigroDemonForm:false, nigroDemonTimer:0, nigroDemonMaxTimer:0,
    nigroAbsorbedSkeletons:0, nigroAbsorbedGolem:false, nigroGolemSkin:"stone",
    // Fase 2 — evaluación de desempeño por rol: contadores que se acumulan durante la partida
    // y se usan al final para puntuar la contribución de cada campeón (ver computeRoleScore).
    // duelVictories: Senda del Rōnin (Musashi) -progresión INTRAPARTIDA, nunca permanente de
    // cuenta, se reinicia sola en cada partida nueva porque stats se recrea acá cada vez.
    stats:{dmgDealt:0, dmgToBoss:0, kills:0, abilityHits:0, healDone:0, healEffective:0,
      alliesSaved:0, revives:0, dmgTaken:0, enemiesControlled:0, presenceTicks:0, buffsGranted:0, statSampleTimer:0,
      duelVictories:0},
    alive:true
  };
}
function makePlayer(){ return makeHero(selectedClass, false, 0, 0); }

// Dificultad extra por progreso de CUENTA (no confundir con `runLevel`, el nivel de la
// arena EN esta partida: acá es el nivel permanente de los campeones que la están jugando,
// save.champions[classKey].level, el mismo que sube de nivel en nivel entre partidas). Una
// cuenta veterana con campeones muy subidos de nivel enfrenta una horda más numerosa, más
// resistente y que también da más experiencia -así seguir jugando con campeones ya fuertes
// no se vuelve trivial, y de paso el progreso tardío sigue rindiendo-. Techos prudentes en
// cada campo para que esto siga siendo jugable en cuentas muy avanzadas (no es un multiplicador
// libre sin límite). Devuelve 1 (neutral) si todavía no hay una partida en curso.
function partyLevelScale(){
  if(typeof heroes==="undefined" || !heroes || !heroes.length) return {hp:1, spawnRate:1, xp:1};
  const avgLevel = heroes.reduce((s,h)=> s + ((save.champions[h.classKey]||{}).level||1), 0) / heroes.length;
  const over = Math.max(0, avgLevel-1);
  return {
    hp: 1 + Math.min(1.2, over*0.018),        // hasta +120% de vida en cuentas muy avanzadas
    spawnRate: 1 - Math.min(0.35, over*0.01), // hasta -35% de intervalo entre apariciones (más enemigos por minuto)
    xp: 1 + Math.min(1.5, over*0.022)         // hasta +150% de experiencia por baja
  };
}
function spawnEnemy(type, atBoss, champion){
  const base = ENEMY_BASE[type];
  const scale = 1 + (runLevel-1)*0.17;
  const ang = Math.random()*Math.PI*2;
  const dist = Math.max(VW,VH)/2/DPR/CAM_ZOOM + 140 + Math.random()*100;
  const x = player.x + Math.cos(ang)*dist;
  const y = player.y + Math.sin(ang)*dist;
  const hpScale = atBoss ? scale*1.0 : scale;
  // Un "campeón" es una versión agrandada de una criatura, usada como subjefe
  const champHp = champion ? 5.5 : 1, champScale = champion ? 1.45 : 1;
  const pls = partyLevelScale(); // dificultad extra por nivel de cuenta de los héroes en la partida
  const e = {
    type, name: base.name, rank: champion ? "subjefe" : base.rank,
    x, y, radius: base.radius*champScale,
    hp: Math.round(base.hp*hpScale*champHp*pls.hp), maxHp: Math.round(base.hp*hpScale*champHp*pls.hp),
    dmg: Math.round(base.dmg*(1+(runLevel-1)*arenaMods().enemyDmgPerWave)*(champion?1.4:1)),
    speed: base.speed*(champion?0.9:1), color: base.color,
    ranged: base.ranged||false, range: base.range||0, projSpeed: base.projSpeed||0,
    atkCd:0, xp: Math.round(base.xp*(champion?7:1)*pls.xp), gold: base.gold*(champion?7:1),
    dropsItem: champion ? true : (base.dropsItem||false),
    slowTimer:0, slowAmt:0, burnTimer:0, burnDmg:0, bleedTimer:0, bleedDmg:0, stunTimer:0, hitFlash:0,
    fx:0, fy:1, animT:Math.random()*600, attackAnim:0,
    scale: base.scale*champScale,
    target:null,
    alive:true
  };
  // Cooldowns iniciales (con algo de variación al azar) de las habilidades propias de este
  // tipo — ver el bloque "Habilidades de..." correspondiente en el loop de enemigos.
  if(type==="dragon_hielo"){ e.alientoCd = 3000+Math.random()*1500; e.novaCd = 6000+Math.random()*1500; }
  if(type==="demonio_hielo_fuego"){ e.escarchaCd = 2500+Math.random()*2500; }
  enemies.push(e);
  // Un campeón (subjefe) detiene la aparición normal de monstruos mientras esté vivo,
  // salvo que se marque explícitamente como "caótico" (permite que sigan apareciendo).
  if(champion && !e.allowChaosSpawn) activeChampion = e;
  return e;
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

function floatText(x,y,text,cls){
  const el = document.createElement("div");
  el.className = "float-text" + (cls?(" "+cls):"");
  const sp = worldToScreen(x,y);
  el.style.left = sp.x+"px"; el.style.top = sp.y+"px";
  el.textContent = text;
  document.getElementById("floaters").appendChild(el);
  setTimeout(()=>el.remove(), 950);
}

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
// Anguila Eléctrica (Arena Acuática): Cadena Eléctrica — golpea al primer héroe alcanzado por
// la carga rápida y salta a héroes cercanos, incentivando al grupo a separarse en vez de
// agruparse contra ellas. Mismo patrón de salto por proximidad que ya usa el resto del juego
// (ver triggerTrap/chain), pero saltando entre HÉROES en vez de entre enemigos.
function applyEelChain(e, first){
  damageHero(first, e.dmg);
  if(acua2Ready("fxSpark")) vfxSprite("fxSpark", 0, first.x, first.y-18, 54, 240, null, 0.1, false, 0.5);
  particles.push({x:e.x,y:e.y, x2:first.x, y2:first.y, life:220, bolt:true, color:"#ffe86a"});
  const hitList = [first];
  let cur = first;
  for(let i=0;i<2 && cur;i++){
    let next=null, bd=Infinity;
    for(const h of [player,...allies]){
      if(!h.alive || hitList.includes(h)) continue;
      const d = distance(cur,h);
      if(d < 170 && d < bd){ bd=d; next=h; }
    }
    if(!next) break;
    damageHero(next, e.dmg*0.7);
    particles.push({x:cur.x,y:cur.y, x2:next.x, y2:next.y, life:220, bolt:true, color:"#ffe86a"});
    if(acua2Ready("fxBolt")) vfxSprite("fxBolt", 0, next.x, next.y-18, 60, 240, null, 0.1, false, 0.5);
    hitList.push(next); cur = next;
  }
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
   ALIADOS CONTROLADOS POR IA (los otros 3 campeones)
   ============================================================ */
function botTryAbilities(h){
  const passiveCdMult = Math.max(0.4, 1 - passiveSum(h.classKey,"cd_mult"));
  // Musashi (IA, sección 27): nunca desperdicia Último Duelo sin una Marca válida, y prioriza
  // objetivos valiosos (élite/subjefe/jefe) o una presa ya baja de vida (posibilidad real de
  // ejecución) en vez de tirarlo contra cualquier chusma en cuanto se carga.
  if(h.classKey==="musashi" && h.ultCharge >= h.ultMax && h.ultCd<=0 && runLevel >= ULT_MIN_ARENA_LEVEL){
    const t = h.duelTarget;
    const worthIt = t && t.alive && !t.isDuelLocked && (t.rank==="jefe"||t.rank==="subjefe"||t.rank==="elite" || t.hp/t.maxHp < 0.45);
    if(worthIt){
      castAbility(h, h.cls.ultimate, true);
      h.ultCharge = 0; h.ultCd = h.cls.ultimate.cd * masteryCdMult(masteryOf(h.classKey, "ult")) * passiveCdMult * arenaMods().heroCdMult * talentSkillCdMult(h.classKey, "ult");
      return;
    }
    // objetivo no vale la pena todavía: sigue acumulando Concentración con habilidades normales
  } else if(h.classKey==="cazadora" && h.ultCharge >= h.ultMax && h.ultCd<=0 && runLevel >= ULT_MIN_ARENA_LEVEL){
    // Sylva (IA): reserva Cacería Salvaje para grupos o para una Presa de alto valor, en vez
    // de gastarla contra un único enemigo débil.
    const nearCountUlt = enemies.filter(e=>e.alive && distance(h,e)<=260).length;
    const worthIt = nearCountUlt>=3 || (h.huntTarget && h.huntTarget.alive && (h.huntTarget.rank==="jefe"||h.huntTarget.rank==="subjefe"||h.huntTarget.rank==="elite"));
    if(worthIt){
      castAbility(h, h.cls.ultimate, true);
      h.ultCharge = 0; h.ultCd = h.cls.ultimate.cd * masteryCdMult(masteryOf(h.classKey, "ult")) * passiveCdMult * arenaMods().heroCdMult * talentSkillCdMult(h.classKey, "ult");
      return;
    }
  } else if(h.classKey==="nigromante" && h.ultCharge >= h.ultMax && h.ultCd<=0 && runLevel >= ULT_MIN_ARENA_LEVEL){
    // Nigromante (IA): reserva Encarnación del Abismo para amenazas grandes -sacrifica
    // temporalmente su ejército, así que no vale la pena tirarla contra chusma suelta-.
    const nearCountUlt = enemies.filter(e=>e.alive && distance(h,e)<=300).length;
    const bigThreat = enemies.some(e=>e.alive && (e.rank==="jefe"||e.rank==="subjefe") && distance(h,e)<=420);
    if(nearCountUlt>=4 || bigThreat){
      castAbility(h, h.cls.ultimate, true);
      h.ultCharge = 0; h.ultCd = h.cls.ultimate.cd * masteryCdMult(masteryOf(h.classKey, "ult")) * passiveCdMult * arenaMods().heroCdMult * talentSkillCdMult(h.classKey, "ult");
      return;
    }
  } else if(h.ultCharge >= h.ultMax && h.ultCd<=0 && runLevel >= ULT_MIN_ARENA_LEVEL){
    castAbility(h, h.cls.ultimate, true);
    h.ultCharge = 0; h.ultCd = h.cls.ultimate.cd * masteryCdMult(masteryOf(h.classKey, "ult")) * passiveCdMult * arenaMods().heroCdMult * talentSkillCdMult(h.classKey, "ult");
    return;
  }
  // Musashi (IA): prioridad simple en vez del orden aleatorio genérico -Paso Fantasma para
  // escapar con poca vida, Mil Cortes contra grupos, si no Corte del Rōnin para acumular
  // Concentración contra su Marca (sección 27: "mantener el mismo objetivo").
  if(h.classKey==="musashi"){
    const nearCount = enemies.filter(e=>e.alive && !(e.isDuelLocked&&e.duelOwner!==h) && distance(h,e)<=150).length;
    let priority = [0,1,2];
    if(h.hp/h.maxHp < 0.45) priority = [1,0,2];
    else if(nearCount>=3) priority = [2,0,1];
    else priority = [0,2,1];
    for(const idx of priority){
      const sk = h.cls.skills[idx];
      if(h.cds[idx]>0 || h.energy < sk.cost) continue;
      if(!nearestEnemyTo(h, 260) && !h.duelTarget) continue;
      h.energy -= sk.cost;
      h.cds[idx] = sk.cd * 1.1 * cdMultFor(sk, masteryOf(h.classKey, idx)) * passiveCdMult * arenaMods().heroCdMult * talentSkillCdMult(h.classKey, idx);
      if(sk.kind==="ghost_step" && h.duelActive) h.cds[idx] *= musashiGhostStepCdMult(h);
      castAbility(h, sk, false, idx);
      return;
    }
    return;
  }
  // Sylva (IA): Trampa del Bosque si algo cuerpo a cuerpo está encima, Lluvia de la Cazadora
  // contra grupos, si no Flecha Perforante (siempre disparada al máximo de carga: la IA no
  // necesita el detalle de mantener apretado el botón, ver useSylvaPiercingShot).
  if(h.classKey==="cazadora"){
    const nearCount = enemies.filter(e=>e.alive && distance(h,e)<=220).length;
    const meleeThreat = enemies.some(e=>e.alive && !e.ranged && distance(h,e)<=90);
    let priority;
    if(meleeThreat) priority = [1,0,2];
    else if(nearCount>=3) priority = [2,0,1];
    else priority = [0,1,2];
    for(const idx of priority){
      const sk = h.cls.skills[idx];
      if(h.cds[idx]>0 || h.energy < sk.cost) continue;
      if(!nearestEnemyTo(h, 320) && !h.huntTarget) continue;
      h.energy -= sk.cost;
      h.cds[idx] = sk.cd * 1.1 * cdMultFor(sk, masteryOf(h.classKey, idx)) * passiveCdMult * arenaMods().heroCdMult * talentSkillCdMult(h.classKey, idx);
      if(sk.kind==="piercing_shot") h.pendingChargeMs = SYLVA_CHARGE_MAX_MS;
      castAbility(h, sk, false, idx);
      return;
    }
    return;
  }
  // Nigromante (IA, sección 3 del diseño): mantener el ejército al máximo primero, invocar
  // gólem si no tiene, Plaga contra grupos, y si está transformado solo puede usar Plaga (las
  // otras dos quedan reemplazadas por las habilidades demoníacas del básico).
  if(h.classKey==="nigromante"){
    if(h.nigroDemonForm){
      const sk = h.cls.skills[2];
      if(h.cds[2]<=0 && h.energy>=sk.cost && nearestEnemyTo(h, sk.range||300)){
        h.energy -= sk.cost;
        h.cds[2] = sk.cd * 1.1 * cdMultFor(sk, masteryOf(h.classKey, 2)) * passiveCdMult * arenaMods().heroCdMult * talentSkillCdMult(h.classKey, 2);
        castAbility(h, sk, false, 2);
      }
      return;
    }
    const maxCount = nigromanteMaxSkeletons(masteryOf(h.classKey, 0));
    const nearCount = enemies.filter(e=>e.alive && distance(h,e)<=260).length;
    let priority = [];
    if(h.skeletons.length < maxCount) priority.push(0);
    if(!h.golem) priority.push(1);
    if(nearCount>=2) priority.push(2);
    for(const idx of priority){
      const sk = h.cls.skills[idx];
      if(h.cds[idx]>0 || h.energy < sk.cost) continue;
      if(idx===2 && !nearestEnemyTo(h, sk.range||300)) continue;
      h.energy -= sk.cost;
      h.cds[idx] = sk.cd * 1.1 * cdMultFor(sk, masteryOf(h.classKey, idx)) * passiveCdMult * arenaMods().heroCdMult * talentSkillCdMult(h.classKey, idx);
      castAbility(h, sk, false, idx);
      return;
    }
    return;
  }
  const order = [0,1,2].sort(()=>Math.random()-0.5);
  for(const idx of order){
    const sk = h.cls.skills[idx];
    if(h.cds[idx]>0 || h.energy < sk.cost) continue;
    const supportKinds = ["team_heal","sacrifice","team_regen","retro_heal","brief_immunity"];
    const isSupport = supportKinds.includes(sk.kind);
    const teamHurt = heroes.some(o=>o.alive && o.hp/o.maxHp<0.62);
    if(isSupport && !teamHurt) continue;
    if(!isSupport && !(divinaMode ? divinaHostiles("player", h.x, h.y, 300) : nearestEnemyTo(h, 300))) continue;
    h.energy -= sk.cost;
    h.cds[idx] = sk.cd * 1.1 * cdMultFor(sk, masteryOf(h.classKey, idx)) * passiveCdMult * arenaMods().heroCdMult * talentSkillCdMult(h.classKey, idx);
    if(sk.kind==="teleport_blink") h.cds[idx] = resolveTeleportCd(h, h.cds[idx]);
    if(sk.kind==="ghost_step" && h.duelActive) h.cds[idx] *= musashiGhostStepCdMult(h);
    castAbility(h, sk, false, idx);
    return;
  }
}

// Revive a un aliado caído si el jugador está lo bastante cerca
function tryReviveAlly(a){
  if(state!=="playing" || !a || a.alive) return;
  if(distance(player, a) >= REVIVE_RANGE) return;
  if(player.stats) player.stats.revives++;
  a.alive = true;
  a.hp = Math.max(1, Math.round(a.maxHp*0.4));
  a.stunTimer=0; a.shield=0; a.shieldTimer=0; a.itemShield = a.itemMaxShield||0;
  a.buffDmgMult=1; a.buffAtkSpeedMult=1; a.buffDefMult=1; a.buffLifesteal=0; a.buffBleedOnHit=false; a.buffTimer=0;
  a.regenTimer=0; a.regenPerSec=0;
  a.spinTimer=0; a.stormTimer=0; a.stealthTimer=0; a.stealthPending=false;
  a.colossalTimer=0; a.pendingHpBonus=0; a.atkAuraTimer=0; a.shieldAuraTimer=0; a.growTimer=0; a.growScale=1; a.sigilTimer=0;
  a.basicCd=0; a.cds=[0,0,0]; a.ultCd=0;
  a.presagioCharges=0; a.presagioComboTimer=0; a.profetaSpinFxTimer=0; a.recentDamage=[];
  a.visionImmortalTimer=0; a.ascensionTimer=0; a.ascensionMaxTimer=0; a.ascensionFusedWith=null; a.fused=false;
  a.moving=false; a.animT=0; a.attackAnim=0;
  for(let i=0;i<14;i++) particles.push({x:a.x,y:a.y, vx:(Math.random()-0.5)*90, vy:-40-Math.random()*70, life:650, color:"#8effb4"});
  particles.push({x:a.x,y:a.y, life:650, ring:true, maxLife:650, maxR:64, color:"#8effb4"});
  particles.push({x:a.x,y:a.y, life:650, maxLife:650, spin:true, radius:44, color:"#8effb4"});
  showBanner(`${a.cls.name} ha revivido`);
}

function updateAllies(dt){
  for(const h of allies){
    if(!h.alive) continue;
    if(axiomFreezeTimer>0 && h!==axiomFreezeCaster) continue; // Force Quit: nadie mas actua
    if(h.stunTimer>0){ h.stunTimer-=dt; continue; } // congelado (p.ej. Nova de Escarcha): no actúa
    h.basicCd = Math.max(0, h.basicCd-dt);
    for(let i=0;i<3;i++) h.cds[i] = Math.max(0, h.cds[i]-dt);
    h.ultCd = Math.max(0, h.ultCd-dt);
    h.energy = Math.min(h.maxEnergy, h.energy + h.cls.energyRegen*arenaMods().heroEnergyRegenMult*dt/1000);
    if(h.shieldTimer>0){ h.shieldTimer-=dt; if(h.shieldTimer<=0) h.shield=0; }
    if(h.stats) sampleTankPresence(h, dt);
    if(h.buffTimer>0){ h.buffTimer-=dt; if(h.buffTimer<=0){ h.buffDmgMult=1; h.buffAtkSpeedMult=1; h.buffLifesteal=0; h.buffDefMult=1; h.buffBleedOnHit=false; h.spinDurationMult=1; h.colossalTimer=0; if(h.pendingHpBonus){ h.maxHp-=h.pendingHpBonus; h.hp=Math.min(h.hp,h.maxHp); h.pendingHpBonus=0; } } }
    if(h.furyArmorTimer>0){
      h.furyArmorTimer -= dt;
      // Ojos y aura carmesí: partículas oscuras/rojas mientras dura la Armadura de la Furia
      if(Math.random()<0.55) particles.push({x:h.x+(Math.random()-0.5)*22, y:h.y-8+(Math.random()-0.5)*12, vx:(Math.random()-0.5)*14, vy:-16-Math.random()*12, life:320, color:Math.random()<0.5?"#c62828":"#1a1414"});
      if(h.furyArmorTimer<=0 && h.furyFinalSlash){ triggerFuryFinalSlash(h); h.furyFinalSlash=false; }
    }
    if(h.berserkTimer>0) h.berserkTimer -= dt;
    if(h.dashFxTimer>0) h.dashFxTimer -= dt;
    if(h.burnTimer>0){ h.burnTimer-=dt; h.hp = Math.max(0, h.hp - h.burnDmg*dt/1000); if(h.hp<=0 && h.alive){ h.alive=false; if(h===player) onPlayerDeath(); } }
    if(h.slowTimer>0){ h.slowTimer-=dt; if(h.slowTimer<=0) h.slowAmt=0; }
    if(h.invulnTimer>0) h.invulnTimer-=dt;
    if(h.teleportChargeTimer>0){
      h.teleportChargeTimer -= dt;
      if(h.teleportChargeTimer<=0 && h.teleportChargesBanked<h.teleportChargeMax){
        h.teleportChargesBanked++;
        h.teleportChargeTimer = h.teleportChargesBanked<h.teleportChargeMax ? TELEPORT_CHARGE_RECHARGE_MS : 0;
      }
    }
    // La Profeta: ver los mismos campos espejados en update() (jugador) más abajo -comentados
    // ahí con más detalle- para Danza del Presagio, Visión del Inmortal y Ascensión del Elegido.
    if(h.presagioComboTimer>0){ h.presagioComboTimer-=dt; if(h.presagioComboTimer<=0) h.presagioCharges=0; }
    if(h.profetaSpinFxTimer>0) h.profetaSpinFxTimer-=dt;
    // Musashi: ver los mismos campos espejados en update() (jugador) más abajo.
    if(h.comboTimer>0){ h.comboTimer-=dt; if(h.comboTimer<=0) h.comboCharges=0; }
    if(h.ghostStepCritTimer>0) h.ghostStepCritTimer-=dt;
    if(h.visionImmortalTimer>0){ h.visionImmortalTimer-=dt; if(h.visionImmortalTimer<=0){ h.regenTimer=Math.max(h.regenTimer||0,2000); h.regenPerSec=h.maxHp*(h.visionImmortalRegenPct||0.05); } }
    if(h.ascensionTimer>0){
      h.ascensionTimer -= dt;
      h.cds[0]=Math.min(h.cds[0],60); h.cds[1]=Math.min(h.cds[1],60); h.cds[2]=Math.min(h.cds[2],60); h.ultCd=Math.min(h.ultCd,60);
      if(h.ascensionTimer<=0) h.ascensionMaxTimer=0;
    }
    if(h.ascensionFusedWith){
      if(h.stealthTimer>0 && h.ascensionFusedWith.alive){ h.x=h.ascensionFusedWith.x; h.y=h.ascensionFusedWith.y; }
      else { h.ascensionFusedWith=null; h.fused=false; }
    }
    if(h.colossalTimer>0) h.colossalTimer -= dt;
    if(h.growTimer>0){ h.growTimer -= dt; if(h.growTimer<=0) h.growScale=1; }
    if(h.atkAuraTimer>0) h.atkAuraTimer -= dt;
    if(h.shieldAuraTimer>0) h.shieldAuraTimer -= dt;
    if(h.sigilTimer>0) h.sigilTimer -= dt;
    if(h.stealthTimer>0){
      h.stealthTimer -= dt;
      if(h.stealthTimer<=0 && h.stealthPending){ h.stealthPending=false; performShadowStrike(h); }
    }
    if(h.spinTimer>0){
      h.spinTimer -= dt; h.spinTick -= dt;
      if(h.spinTick<=0){
        h.spinTick = h.spinTickInterval;
        for(const e of enemies){
          if(!e.alive) continue;
          if(distance(h,e) <= h.spinRadius) damageEnemy(e, h.spinDmg, {src:h});
        }
        for(let i=0;i<4;i++) particles.push({x:h.x+(Math.random()-0.5)*24, y:h.y+(Math.random()-0.5)*24, vx:0, vy:-14, life:220, color:"#9fe3ff"});
      }
    }
    if(h.stormTimer>0){
      h.stormTimer -= dt; h.stormTick -= dt;
      // Armadura de fuego: aura de brasas constante mientras dura el Cataclismo (cosmético;
      // el bonus real de defensa ya se aplicó como buff al lanzar la habilidad)
      if(Math.random()<0.5) particles.push({x:h.x+(Math.random()-0.5)*20, y:h.y-10+(Math.random()-0.5)*10, vx:(Math.random()-0.5)*10, vy:-18-Math.random()*10, life:340, color:"#ff8a3d"});
      // Campo de hielo: cristales que emergen del suelo dentro del área
      if(Math.random()<0.10){
        const ca=Math.random()*Math.PI*2, cr=Math.random()*h.stormRadius;
        particles.push({x:h.x+Math.cos(ca)*cr, y:h.y+Math.sin(ca)*cr*0.55, life:700, maxLife:700, crystal:true, size:7+Math.random()*6, angle:Math.random()*Math.PI, color:"#bfe8ff"});
      }
      // 2ª y 3ª nova de hielo del Cataclismo, repartidas en el tiempo
      if(h.stormNovaLeft>0){
        h.stormNovaTimer -= dt;
        if(h.stormNovaTimer<=0){
          h.stormNovaTimer = h.stormNovaInterval;
          h.stormNovaLeft--;
          for(const e of enemies){
            if(!e.alive) continue;
            if(distance(h,e) <= h.stormRadius) damageEnemy(e, h.stormNovaDmg, {slow:h.stormNovaFreeze, slowDur:h.stormNovaFreezeDur, src:h});
          }
          frostNovaVFX(h, h.stormRadius*0.85, 8); // la ulti siempre se ve al máximo nivel visual
        }
      }
      if(h.stormTick<=0){
        h.stormTick = h.stormTickInterval;
        const near = enemies.filter(e=>e.alive && distance(h,e)<=h.stormRadius);
        if(near.length){
          const target = near[(Math.random()*near.length)|0];
          damageEnemy(target, h.stormDmg, {src:h, slow:0.3, slowDur:900});
          pushChainBolt(target.x, target.y-180, target.x, target.y, 30, 360);
          pushSpark("impacto", target.x, target.y, 60, 320);
          target.electrifiedTimer = 420; target.electrifiedSize = 60;
        }
      }
    }
    if(h.regenTimer>0){ h.regenTimer-=dt; h.hp = Math.min(h.maxHp, h.hp + (h.regenPerSec||0)*dt/1000); }
    if(h.attackAnim>0) h.attackAnim -= dt;
    if(h.hurtTimer>0) h.hurtTimer -= dt;

    // En la Arena Divina no hay nada en `enemies` (los monstruos comunes viven en
    // divinaMinions): sin esto, tus 3 aliados nunca encontraban a quién perseguir y se
    // quedaban solo siguiendo al jugador sin pelear.
    const divinaHit = divinaMode ? divinaHostiles("player", h.x, h.y, 620) : null;
    const target = divinaHit ? divinaHit.ref : nearestEnemyTo(h, 620);
    const desired = h.cls.ranged ? 190 : (h.cls.basicRange*0.7);
    let mx=0, my=0;
    // Si está herido, prioriza ir a buscar la poción más cercana (antes ningún aliado las
    // buscaba activamente: solo perseguían enemigos, así que en la práctica casi siempre
    // terminaba agarrándola quien estaba parado ahí al matar al enemigo).
    let seekPotion = null;
    if((h.hp < h.maxHp*0.75 || h.energy < h.maxEnergy*0.3) && potions.length){
      let bd = Infinity;
      for(const p of potions){
        if(p.type==="mana" && h.energy >= h.maxEnergy*0.3) continue;
        if(p.type!=="mana" && h.hp >= h.maxHp*0.75) continue;
        const d = distance(h,p);
        if(d < 420 && d < bd){ bd = d; seekPotion = p; }
      }
    }
    const leash = Math.hypot(h.x-player.x, h.y-player.y);
    if(seekPotion){
      const dx = seekPotion.x-h.x, dy = seekPotion.y-h.y, l = Math.hypot(dx,dy)||1;
      mx = dx/l; my = dy/l; h.fx = mx; h.fy = my;
    } else if(leash > 300){
      const dx = player.x-h.x, dy = player.y-h.y, l = Math.hypot(dx,dy)||1;
      mx = dx/l; my = dy/l;
    } else if(target){
      const dx = target.x-h.x, dy = target.y-h.y, l = Math.hypot(dx,dy)||1;
      if(l > desired+10){ mx = dx/l; my = dy/l; }
      else if(l < desired-40){ mx = -dx/l; my = -dy/l; }
      h.fx = dx/l; h.fy = dy/l;
    } else {
      const dx = player.x-h.x, dy = player.y-h.y, l = Math.hypot(dx,dy)||1;
      if(l > 120){ mx = dx/l; my = dy/l; }
    }
    for(const o of heroes){
      if(o===h || !o.alive) continue;
      const d = distance(h,o);
      if(d < 34 && d > 0.01){ mx += (h.x-o.x)/d*0.6; my += (h.y-o.y)/d*0.6; }
    }
    const ml = Math.hypot(mx,my);
    h.moving = ml > 0.05 && !h.fused;
    if(h.moving){
      mx/=ml; my/=ml;
      const nd = aidAllyDir(h, mx, my); if(nd){ mx = nd.x; my = nd.y; }
      const spd = h.baseSpeed * runStats.speedMult * (1-Math.min(0.8,h.slowAmt||0));
      h.x += mx*spd*dt/1000; h.y += my*spd*dt/1000;
      if(!target){ h.fx = mx; h.fy = my; }
      clampToArena(h);
      resolveWallCollision(h);
      h.animT += dt;
    }
    triggerBasic(h);
    if(Math.random() < dt/650) botTryAbilities(h);
  }
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

/* ============================================================
   MUROS DE FUEGO (Mago)
   ============================================================ */
function updateFireWalls(dt){
  for(const fw of fireWalls){
    fw.timer -= dt;
    fw.tick -= dt;
    if(fw.tick<=0){
      fw.tick = fw.tickInterval;
      for(const e of enemies){
        if(!e.alive) continue;
        const d = distance(fw, e);
        if(d >= fw.innerR && d <= fw.outerR){
          damageEnemy(e, fw.dmg, {src:fw.src, burn:true});
        }
      }
    }
  }
  fireWalls = fireWalls.filter(fw=>fw.timer>0);
}

/* ============================================================
   TRAMPA DE ÁREA (Asesino)
   ============================================================ */
function updateTraps(dt){
  for(const tr of traps){
    tr.timer -= dt;
    if(tr.armTime>0) tr.armTime -= dt;
    tr.phase = (tr.phase||0) + dt;
    if(tr.triggered || tr.armTime>0) continue;
    for(const e of enemies){
      if(!e.alive) continue;
      if(distance(tr,e) <= tr.radius){ triggerTrap(tr, e); break; }
    }
  }
  traps = traps.filter(tr=>tr.timer>0 && !tr.triggered);
}

/* ============================================================
   AXIOM — zonas con demora/agrupamiento (Error 404 y Bug de Colisión). Mismo patrón que
   traps/fireWalls (array propio, se actualiza cada frame, se filtra al vencer), separado del
   sistema de trampas del Asesino para no tocar nada de otro campeón.
   ============================================================ */
function updateAxiomZones(dt){
  for(const z of axiomZones){
    z.timer -= dt;
    if(z.mode==="pull" && z.timer>0){
      // Bug de Colisión: mientras dura, arrastra suavemente a los enemigos de la zona hacia
      // el centro (nunca los atraviesa del todo ni rompe colisiones reales de otros sistemas).
      for(const e of enemies){
        if(!e.alive) continue;
        const dx = z.x-e.x, dy = z.y-e.y, d = Math.hypot(dx,dy);
        if(d <= z.radius && d>4){
          e.x += (dx/d) * z.pullStrength * dt/1000;
          e.y += (dy/d) * z.pullStrength * dt/1000;
        }
      }
      if(Math.random()<0.4) particles.push({x:z.x+(Math.random()-0.5)*z.radius, y:z.y+(Math.random()-0.5)*z.radius*0.6, vx:0, vy:-10, life:260, color:"#4dffe6"});
    } else if(z.mode==="delay" && !z.exploded){
      if(Math.random()<0.35) particles.push({x:z.x+(Math.random()-0.5)*z.radius*1.6, y:z.y+(Math.random()-0.5)*z.radius*0.9, vx:(Math.random()-0.5)*20, vy:-14, life:220, color:"#4dffe6"});
    }
    if(z.timer<=0 && !z.exploded){
      z.exploded = true;
      for(const e of enemies){
        if(!e.alive) continue;
        if(distance(z,e) <= z.radius){
          damageEnemy(e, z.dmg, {src:z.src, knockback:z.knockback||0, slow:z.slow, slowDur:z.slowDur});
        }
      }
      particles.push({x:z.x,y:z.y, life:420, ring:true, maxLife:420, maxR:z.radius*1.3, color:"#4dffe6"});
      if(z.src===player) showBanner(z.bannerText||"");
    }
  }
  axiomZones = axiomZones.filter(z=>!z.exploded || z.timer > -400); // deja un instante el flash del estallido antes de sacarla
}
function drawAxiomZones(){
  for(const z of axiomZones){
    if(z.exploded) continue;
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = "#4dffe6"; ctx.lineWidth = 2;
    ctx.setLineDash([6,5]);
    ctx.beginPath(); ctx.arc(z.x, z.y, z.radius, 0, Math.PI*2); ctx.stroke();
    ctx.restore();
  }
}

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

function triggerTrap(tr, firstEnemy){
  tr.triggered = true;
  if(tr.kind==="forest_root"){
    particles.push({x:tr.x,y:tr.y, life:420, ring:true, maxLife:420, maxR:tr.radius*1.3, color:"#4a7a2e"});
    const caster = tr.src;
    for(const e of enemies){
      if(!e.alive || distance(tr,e) > tr.radius) continue;
      const isBossRank = e.rank==="jefe" || e.rank==="subjefe";
      const isEliteRank = e.rank==="elite" || e.rank==="subelite";
      if(isBossRank){
        // Los jefes no se pueden inmovilizar del todo: solo un ralentizado fuerte.
        e.slowTimer = Math.max(e.slowTimer||0, tr.rootDur); e.slowAmt = Math.max(e.slowAmt||0, 0.55);
      } else if(isEliteRank){
        e.stunTimer = Math.max(e.stunTimer||0, tr.rootDur*0.45);
      } else {
        e.stunTimer = Math.max(e.stunTimer||0, tr.rootDur);
      }
      if(caster && caster.classKey==="cazadora"){
        if(caster.huntTarget===e){ sylvaAddTrack(caster, e, 2); }
        caster.sylvaTrapBurstTimer = Math.max(caster.sylvaTrapBurstTimer||0, 2000);
        // Talento "Cacería Instantánea": activar una trampa durante Cacería Salvaje también
        // acorta el cooldown de las otras habilidades, igual que golpear a la Presa.
        if(caster.wildHuntTimer>0){
          const cdrMs = talentSkillMods(caster.classKey, "ult").flags.trapCdrBonusMs||0;
          if(cdrMs>0) for(let i=0;i<caster.cds.length;i++) caster.cds[i] = Math.max(0, (caster.cds[i]||0)-cdrMs);
        }
      }
    }
    return;
  }
  damageEnemy(firstEnemy, tr.dmg, {src:tr.src, stun:400});
  particles.push({x:tr.x,y:tr.y, life:420, ring:true, maxLife:420, maxR:tr.radius*1.4, color:"#8dffa0"});
  let hitList=[firstEnemy], cur=firstEnemy, curDmg=tr.dmg*0.75, px_=tr.x, py_=tr.y;
  for(let i=0;i<3 && cur;i++){
    particles.push({x:px_,y:py_, x2:cur.x, y2:cur.y, life:230, bolt:true, color:"#8dffa0"});
    let next=null, bd=Infinity;
    for(const e of enemies){
      if(!e.alive || hitList.includes(e)) continue;
      const d = distance(cur, e);
      if(d < tr.chainRadius && d<bd){ bd=d; next=e; }
    }
    if(!next) break;
    damageEnemy(next, curDmg, {src:tr.src});
    hitList.push(next); px_=cur.x; py_=cur.y; cur=next; curDmg*=0.8;
  }
}

/* ============================================================
   PESTILENCIA SOMBRÍA (golpe tras el sigilo del Asesino)
   ============================================================ */
function performShadowStrike(caster){
  const sk = caster.stealthSk || {};
  const t = nearestEnemyTo(caster, 280);
  if(!t){ caster.stealthSk = null; return; }
  const dmg = caster.baseDmg * runStats.dmgMult * (caster.buffDmgMult||1) * (sk.dmgMult||1);
  damageEnemy(t, dmg, {src:caster, forceCrit:true});
  damageEnemy(t, dmg, {src:caster, forceCrit:true});
  damageEnemy(t, dmg*(sk.finalMult||1.4), {src:caster, forceCrit:true});
  t.poisonTimer = sk.duration||3000; t.poisonDmg = dmg*(sk.poisonDmgMult||0.16);
  t.bleedTimer = Math.max(t.bleedTimer||0, sk.duration||3000); t.bleedDmg = Math.max(t.bleedDmg||0, dmg*(sk.bleedDmgMult||0.14));
  particles.push({x:t.x,y:t.y, life:420, ring:true, maxLife:420, maxR:52, color:"#8dffa0"});
  pushAsesinoFx("pestilencia", "emboscada", t.x, t.y, 100, 500, (t.x-caster.x)<0);
  if(caster===player) floatText(t.x, t.y-46, "¡PESTILENCIA!", "crit");
  // veneno encadenado a enemigos cercanos
  let hitList=[t], cur=t, curDmg=dmg*0.55, px_=caster.x, py_=caster.y;
  for(let i=0;i<3 && cur;i++){
    particles.push({x:px_,y:py_, x2:cur.x, y2:cur.y, life:250, bolt:true, color:"#8dffa0"});
    let next=null, bd=Infinity;
    for(const e of enemies){
      if(!e.alive || hitList.includes(e)) continue;
      const d = distance(cur, e);
      if(d < (sk.chainRadius||150) && d<bd){ bd=d; next=e; }
    }
    if(!next) break;
    damageEnemy(next, curDmg, {src:caster});
    next.poisonTimer = (sk.duration||3000)*0.85; next.poisonDmg = curDmg*0.14;
    pushAsesinoFx("pestilencia", "veneno", next.x, next.y, 60, 400, false);
    hitList.push(next); px_=cur.x; py_=cur.y; cur=next; curDmg*=0.75;
  }
  caster.stealthSk = null;
}

/* ============================================================
   ABILITIES (motor compartido por el jugador y los bots aliados)
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

/* ============================================================
   MUSASHI, EL ESPADACHÍN MALDITO — mecánicas propias
   ============================================================
   Todo lo específico de Musashi vive en este bloque (Marca de Duelo/Concentración, Senda
   del Rōnin, Último Duelo + arena de bolsillo aislada). El resto del combate (daño base,
   maestría, talentos, objetos) sigue pasando por las mismas funciones genéricas de siempre
   -musashiCombatMods() solo AGREGA sus propios bonus encima, nunca reemplaza el pipeline-.
   Constantes ajustables (sección 34 del pedido: "constantes fácilmente editables"):
   ============================================================ */
const MUSASHI_CONC_MAX = 10;
const MUSASHI_PERFECT_STEP_WINDOW = 220; // ms de anticipo para que Paso Fantasma cuente como Paso Perfecto
const MUSASHI_COMBO_WINDOW_MS = 1100;    // si dejó de golpear este tiempo, el combo de 3 golpes se reinicia
// "Arena de bolsillo" del Último Duelo: un lugar del mismo mundo de juego, MUY lejos de la
// arena real (así ninguna habilidad/ally/enemigo externo puede alcanzarlo por distancia, sin
// tener que tocar cada sistema de combate uno por uno) y con su propio radio, muchísimo más
// chico que ARENA_RADIUS (1050). Cada Último Duelo activo usa su propio "slot" para que dos
// duelos simultáneos (dos Musashi) no compartan el mismo espacio.
const MUSASHI_DUEL_POCKET_BASE = {x:60000, y:60000};
const MUSASHI_DUEL_POCKET_STEP = 4000;
const MUSASHI_DUEL_RADIUS = 150;
let musashiDuelSlotsUsed = 0;
let musashiAfterimages = [];   // estelas visuales de Paso Fantasma (puramente decorativas)
let musashiSecondCuts = [];    // corte demorado de Corte del Rōnin en Duelo Perfecto

// Concentración (0-10): tramos 1-3 dan daño, 4-6 dan probabilidad de crítico, 7-9 dan daño
// crítico, 10 activa Duelo Perfecto -sección 8 del pedido, fórmula exacta ahí especificada-.
function musashiConcentrationBonuses(conc){
  const c = Math.max(0, Math.min(MUSASHI_CONC_MAX, conc||0));
  return {
    dmgMult: 0.03 * Math.min(c,3),
    critChanceAdd: 0.02 * Math.min(Math.max(c-3,0),3),
    critMultAdd: 0.05 * Math.min(Math.max(c-6,0),3),
    perfect: c>=MUSASHI_CONC_MAX
  };
}
// Senda del Rōnin: bonus PERSISTENTE toda la partida por cada Victoria de Duelo (sección
// 19-23). El de crítico tiene rendimiento decreciente por victoria pero es acumulativo.
function musashiRoninCritChanceBonus(victories){
  let total = 0;
  for(let n=1;n<=victories;n++) total += (n<=10) ? (11-n) : 1;
  return total/100;
}
function musashiRoninBonuses(h){
  const v = (h.stats && h.stats.duelVictories) || 0;
  return { dmgMult: v*0.05, critChanceAdd: musashiRoninCritChanceBonus(v), critMultAdd: v*0.10 };
}
// Bonus temporales de Último Duelo (sección 16): se derivan en vivo de la config de la
// ultimate mientras duelActive sea true, así desaparecen solos al terminar el duelo -sin
// tener que "restaurar" nada a mano, ni arriesgarse a pisar otro buff genérico del héroe-.
function musashiDuelUltMods(h){
  if(!h.duelActive) return {speedMult:1, atkSpeedMult:1, dmgMult:1, critChanceBonus:0, critMultBonus:0, ghostStepCdMult:1};
  const u = CLASSES.musashi.ultimate;
  return {speedMult:u.speedMult, atkSpeedMult:u.atkSpeedMult, dmgMult:u.dmgMult, critChanceBonus:u.critChanceBonus, critMultBonus:u.critMultBonus, ghostStepCdMult:musashiGhostStepCdMult(h)};
}
// Talento "Duelo Fantasma" (Maestría Fantasma Eterno): reduce aún más el cooldown de Paso
// Fantasma mientras dura Último Duelo, por encima del recorte base de la ultimate.
function musashiGhostStepCdMult(h){
  const bonus = talentSkillMods(h.classKey, "ult").flags.ghostStepCdMultBonus||0;
  return Math.max(0.05, CLASSES.musashi.ultimate.ghostStepCdMult - bonus);
}
// Combina los 3 sistemas propios de Musashi (Concentración + Senda del Rōnin + buffs de
// Último Duelo) en un solo paquete, aplicado UNA sola vez sobre el daño/crítico base (sección
// 20: "evitar double-dipping"). Se usa en todos los puntos donde Musashi hace daño.
function musashiCombatMods(h){
  const conc = musashiConcentrationBonuses(h.concentration||0);
  const ronin = musashiRoninBonuses(h);
  const duel = musashiDuelUltMods(h);
  return {
    dmgMult: (1 + conc.dmgMult + ronin.dmgMult) * duel.dmgMult,
    critChance: Math.min(1, runStats.critChance + conc.critChanceAdd + ronin.critChanceAdd + duel.critChanceBonus),
    critMult: (runStats.critMult||1.8) + conc.critMultAdd + ronin.critMultAdd + duel.critMultBonus,
    perfect: conc.perfect
  };
}
// Marca de Duelo (sección 7): golpear a un objetivo nuevo lo marca y arranca la Concentración
// en `amount`; seguir golpeando al MISMO objetivo ya marcado simplemente suma. Cambiar de
// objetivo (golpear a otro distinto) reinicia todo -tal como pide el pedido-.
function musashiAddConcentration(h, target, amount){
  if(!target) return;
  if(h.duelTarget===target && h.duelTarget.alive){
    h.concentration = Math.min(MUSASHI_CONC_MAX, h.concentration + amount);
  } else {
    h.duelTarget = target;
    h.concentration = Math.min(MUSASHI_CONC_MAX, amount);
  }
}
function musashiClearMark(h){ h.duelTarget = null; h.concentration = 0; }
function musashiSpawnAfterimage(h){
  musashiAfterimages.push({x:h.x, y:h.y, fx:h.fx, fy:h.fy, classKey:h.classKey, life:240, maxLife:240});
}
// Procesa las estelas de Paso Fantasma y el corte demorado de Duelo Perfecto (mismo patrón que
// ya usa el resto del juego para efectos con demora -ver axiomZones-, nunca setTimeout: todo
// tiene que poder pausarse/acelerarse con el resto del loop de juego).
function updateMusashiFx(dt){
  for(const a of musashiAfterimages) a.life -= dt;
  musashiAfterimages = musashiAfterimages.filter(a=>a.life>0);
  if(musashiSecondCuts.length){
    for(const c of musashiSecondCuts) c.timer -= dt;
    const ready = musashiSecondCuts.filter(c=>c.timer<=0);
    musashiSecondCuts = musashiSecondCuts.filter(c=>c.timer>0);
    ready.forEach(c=>{
      if(c.target && c.target.alive && c.caster.alive){
        damageEnemy(c.target, c.dmg, {src:c.caster, critChanceOverride:c.critChance, critMultOverride:c.critMult});
        pushSpark("impacto", c.target.x, c.target.y, 40, 220);
        if(c.caster===player) floatText(c.target.x, c.target.y-30, "2º CORTE", "crit");
      }
    });
  }
}
// ---------------------------------------------------------------------------------------
// ÚLTIMO DUELO (sección 13-19): transporta a Musashi + su Marca a una "arena de bolsillo"
// aislada -ver comentario de MUSASHI_DUEL_POCKET_BASE-, deja a los demás jugadores en la
// arena real sin tocarlos, y los devuelve a su posición original al terminar.
// ---------------------------------------------------------------------------------------
function enterLastDuel(m, target, sk){
  const slot = musashiDuelSlotsUsed++;
  const pocket = {x: MUSASHI_DUEL_POCKET_BASE.x + slot*MUSASHI_DUEL_POCKET_STEP, y: MUSASHI_DUEL_POCKET_BASE.y};
  m.duelReturnX = m.x; m.duelReturnY = m.y;
  target._duelReturnX = target.x; target._duelReturnY = target.y;
  m.duelActive = true; m.duelOpponent = target; m.duelPocket = pocket;
  m.duelTimer = sk.duration; m.duelMaxTimer = sk.duration; m.duelGraceTimer = 0; m.duelResult = null;
  m.concentration = MUSASHI_CONC_MAX; // "obtiene inmediatamente 10 Concentración" (sección 16)
  m.duelTarget = target;
  m._preDuelBaseSpeed = m.baseSpeed;
  m.baseSpeed *= sk.speedMult;
  target.isDuelLocked = true; target.duelOwner = m;
  m.x = pocket.x - 70; m.y = pocket.y;
  target.x = pocket.x + 70; target.y = pocket.y;
  m.invulnTimer = Math.max(m.invulnTimer||0, 260);
  if(m===player) showBanner("¡ÚLTIMO DUELO!");
  playSfx("ult");
  particles.push({x:m.x,y:m.y, life:400, ring:true, maxLife:400, maxR:60, color:"#ff5c4a"});
  // Banner decorativo real (arte del zip de Musashi, antes sin usar): portal de entrada a la
  // arena de bolsillo, superpuesto arriba de los dos duelistas -no reemplaza su dibujo normal-.
  vfxSprite("musashiPortal", 0, pocket.x, pocket.y-46, 130, 700, null, 0.12, false, 0.7, 0);
}
function exitLastDuel(m, result){
  const target = m.duelOpponent;
  m.duelActive = false;
  m.duelResult = result;
  m.baseSpeed = m._preDuelBaseSpeed || m.baseSpeed;
  m.x = m.duelReturnX; m.y = m.duelReturnY;
  clampToArena(m);
  if(target){
    target.isDuelLocked = false; target.duelOwner = null;
    if(target.alive){ target.x = target._duelReturnX; target.y = target._duelReturnY; }
  }
  m.duelOpponent = null; m.duelTimer = 0; m.duelMaxTimer = 0;
  if(result!=="win") musashiClearMark(m); // en "win" el objetivo ya murió; no hay nada que limpiar
  if(m===player){
    if(result==="lose") showBanner("Duelo perdido");
    else if(result==="timeout") showBanner("Se acabó el tiempo del duelo");
  }
}
// Golpe de Gracia (sección 18): Musashi queda inmóvil un instante antes de que el duelo se dé
// por terminado de verdad -así la Victoria de Duelo se siente como un golpe final, no como un
// simple "enemigo murió, cerrar pantalla"-. Llamado desde killEnemy cuando el que muere es la
// Marca de Duelo de ALGUIEN que está en Último Duelo con él ahora mismo.
function musashiHandleDuelWin(m, target){
  // Talento "Golpe de Gracia Superior" (Maestría Filo Perfecto): el instante de victoria dura
  // más -más pantalla de shake, más tiempo de "presentación" antes de volver a la arena real-.
  const graceBonus = 1+(talentSkillMods(m.classKey, "ult").flags.graceStrikeBonus||0);
  m.duelGraceTimer = 650*graceBonus;
  m.stunTimer = Math.max(m.stunTimer||0, 650*graceBonus);
  screenShake = Math.max(screenShake, 6);
  if(m===player) floatText(m.x, m.y-50, "GOLPE DE GRACIA", "crit");
  // Banner decorativo real (antes sin usar), superpuesto sobre Musashi durante el mismo lapso
  // que ya dura el Golpe de Gracia (no alarga ni acorta nada de la mecánica existente).
  vfxSprite("musashiFinish", 0, m.x, m.y-40, 110, 650*graceBonus, m, 0.08, m.fx<-0.12, 0.7, 0);
}
// Se llama una vez por frame para cada héroe (ver update()): procesa el temporizador del
// duelo, la ventana del Golpe de Gracia, y mantiene a los dos participantes dentro del
// pequeño cuadrilátero -lejos de todo lo demás, que sigue su curso en la arena real-.
function updateLastDuel(h, dt){
  if(h.duelGraceTimer>0){
    h.duelGraceTimer -= dt;
    if(h.duelGraceTimer<=0){
      h.stats.duelVictories = (h.stats.duelVictories||0) + 1;
      if(h===player) showBanner("VICTORIA DE DUELO — SENDA DEL RŌNIN +"+h.stats.duelVictories);
      musashiClearMark(h);
      exitLastDuel(h, "win");
    }
    return;
  }
  if(!h.duelActive) return;
  if(!h.alive){ exitLastDuel(h, "lose"); return; }
  const target = h.duelOpponent;
  if(!target || !target.alive){ exitLastDuel(h, "win"); return; } // salvaguarda: no debería llegar acá sin pasar por musashiHandleDuelWin
  h.duelTimer -= dt;
  if(h.duelTimer<=0){ exitLastDuel(h, "timeout"); return; }
  const R = MUSASHI_DUEL_RADIUS, pocket = h.duelPocket;
  [h, target].forEach(ent=>{
    const dx=ent.x-pocket.x, dy=ent.y-pocket.y, d=Math.hypot(dx,dy);
    if(d>R){ const a=Math.atan2(dy,dx); ent.x=pocket.x+Math.cos(a)*R; ent.y=pocket.y+Math.sin(a)*R; }
  });
}
// Fondo del dojo del Último Duelo: plataforma cuadrada de madera oscura, torii y luna roja de
// fondo (referencia del material entregado), dibujado con las mismas primitivas de canvas que
// ya usa el resto de las arenas -nada de esto es arte de terceros, es 100% procedural-.
function drawLastDuelArena(m){
  const now = performance.now()/1000;
  const pocket = m.duelPocket;
  ctx.save();
  ctx.fillStyle = "#0a0508";
  ctx.fillRect(pocket.x-1400, pocket.y-1000, 2800, 2000);
  // luna roja + torii lejanos, puramente decorativos (no afectan colisión)
  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = "#7a1f1f";
  ctx.beginPath(); ctx.arc(pocket.x+220, pocket.y-260, 90, 0, Math.PI*2); ctx.fill();
  ctx.globalAlpha = 0.35; ctx.fillStyle="#3a1010";
  ctx.beginPath(); ctx.arc(pocket.x+220, pocket.y-260, 90, 0, Math.PI*2); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = "rgba(150,40,30,0.55)"; ctx.lineWidth = 10;
  ctx.beginPath(); ctx.moveTo(pocket.x-260,pocket.y-150); ctx.lineTo(pocket.x-260,pocket.y-40); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(pocket.x-190,pocket.y-150); ctx.lineTo(pocket.x-190,pocket.y-40); ctx.stroke();
  ctx.lineWidth = 14;
  ctx.beginPath(); ctx.moveTo(pocket.x-280,pocket.y-150); ctx.lineTo(pocket.x-170,pocket.y-150); ctx.stroke();
  // plataforma del dojo: cuadrado de madera, mucho más chico que la arena real
  const R = MUSASHI_DUEL_RADIUS*1.35;
  ctx.translate(pocket.x, pocket.y);
  ctx.fillStyle = "#241610";
  ctx.fillRect(-R,-R,R*2,R*2);
  ctx.strokeStyle = "rgba(0,0,0,0.6)"; ctx.lineWidth = 3;
  for(let i=-Math.floor(R/22);i<=Math.floor(R/22);i++){
    ctx.beginPath(); ctx.moveTo(i*22,-R); ctx.lineTo(i*22,R); ctx.stroke();
  }
  const pulse = 0.6+0.4*Math.sin(now*1.4);
  ctx.strokeStyle = `rgba(200,60,40,${0.5+0.3*pulse})`; ctx.lineWidth = 8;
  ctx.strokeRect(-R,-R,R*2,R*2);
  ctx.strokeStyle = "rgba(255,150,80,0.5)"; ctx.lineWidth = 2;
  ctx.strokeRect(-R+10,-R+10,R*2-20,R*2-20);
  // faroles en las 4 esquinas
  [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([sx,sy])=>{
    const lx=sx*(R-16), ly=sy*(R-16);
    const flicker = 0.6+0.4*Math.sin(now*5+sx*3+sy*2);
    ctx.fillStyle = `rgba(255,160,60,${0.5+0.4*flicker})`;
    ctx.beginPath(); ctx.arc(lx,ly,7,0,Math.PI*2); ctx.fill();
  });
  ctx.restore();
  // viñeta oscura para enmarcar el duelo
  const vg = ctx.createRadialGradient(pocket.x,pocket.y,R*0.4,pocket.x,pocket.y,R*2.6);
  vg.addColorStop(0,"rgba(0,0,0,0)"); vg.addColorStop(1,"rgba(0,0,0,0.75)");
  ctx.fillStyle = vg; ctx.fillRect(pocket.x-R*2.6,pocket.y-R*2.6,R*5.2,R*5.2);
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
  if(!wasCornered && h.trackStacks>=5 && h===player){
    floatText(h.x, h.y-46, "¡PRESA ACORRALADA!", "crit");
    particles.push({x:h.x,y:h.y, life:320, ring:true, maxLife:320, maxR:46, color:"#ffb84a"});
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

/* ============================================================
   NIGROMANTE — mecánicas propias (esqueletos, gólem, plaga/contagio, Encarnación del
   Abismo). Sigue el mismo patrón ya usado por Musashi (musashi*) y Sylva (sylva*): funciones
   dedicadas fuera del switch de castAbility, invocadas desde ahí y desde update()/updateAllies().
   ============================================================ */
const NIGRO_TRANSFORM_MS = 900;      // duración de la animación de transformación de la ultimate
const NIGRO_PLAGUE_CONTAGION_RADIUS = 140;
const NIGRO_SKELETON_LEASH = 700;    // si un esqueleto se aleja más que esto de su dueño, teletransporta de vuelta
const NIGRO_GOLEM_LEASH = 780;
const NIGRO_SKELETON_SEPARATION = 34; // evita que los esqueletos queden exactamente apilados

// Máximo de esqueletos vivos según cuánto se invirtió en Levantar Esqueletos (talento/maestría,
// igual criterio que ya usa area_trap con tierOf(allocLevel(mastery)) para su cantidad de trampas):
// 1->2, 3->3, 5->4, 7->5, 10->6 (sección 3 del diseño).
function nigromanteMaxSkeletons(mastery){
  const lvl = allocLevel(mastery);
  if(lvl>=10) return 6;
  if(lvl>=7) return 5;
  if(lvl>=5) return 4;
  if(lvl>=3) return 3;
  return 2;
}
// A partir de 5 esqueletos empiezan a aparecer Esqueletos Mago (a distancia); composición
// objetivo ~4 guerreros + 2 magos en el máximo, tal como pide el diseño.
function nigromanteSkeletonComposition(maxCount){
  if(maxCount>=6) return {warriors:4, mages:2};
  if(maxCount>=5) return {warriors:4, mages:1};
  return {warriors:maxCount, mages:0};
}
function nigromanteGolemSkin(h){
  const flags = talentSkillMods(h.classKey, 1).flags;
  return flags.golemSkin || "stone";
}
// Maldición de Plaga de los Condenados: DoT + más daño recibido + contagio limitado (gen tope,
// nunca se propaga infinito aunque el mapa esté lleno de enemigos apretados entre sí).
function nigromanteApplyCurse(e, src, dmgPerSec, defTakenPct, gen, durationMs, maxGen){
  if(!e || !e.alive) return;
  e.cursed = true;
  e.curseTimer = Math.max(e.curseTimer||0, durationMs);
  e.curseDmg = dmgPerSec;
  e.curseDefTakenMult = 1+defTakenPct;
  e.curseSrc = src;
  e.curseGen = gen||0;
  e.curseMaxGen = maxGen||0;
  e.curseContagionR = NIGRO_PLAGUE_CONTAGION_RADIUS * (1 + talentSkillMods(src&&src.classKey, 2).flags.contagionRadiusPct||0);
}
function nigromantePlagueDeathSpread(e){
  if(!e.cursed) return;
  const gen = e.curseGen||0;
  if(gen >= (e.curseMaxGen||0)) return;
  const r = e.curseContagionR || NIGRO_PLAGUE_CONTAGION_RADIUS;
  for(const o of enemies){
    if(o===e || !o.alive || o.cursed) continue;
    if(distance(e,o) <= r){
      nigromanteApplyCurse(o, e.curseSrc, e.curseDmg, (e.curseDefTakenMult||1)-1, gen+1, e.curseTimer>0?e.curseTimer: 2600, e.curseMaxGen);
    }
  }
}
// "Peste Negra" (Señor de la Plaga, talento final): se implementa subiendo en 1 el tope de
// generaciones de contagio (maxGen) al lanzar la Plaga -ver el case "condemned_plague"-, así
// nigromantePlagueDeathSpread ya permite una ronda extra de contagio sin duplicar esa lógica.

// ---- Esqueletos invocados: entidades livianas propias (no son "heroes"), mismo criterio que
// el Lobo Espectral de Sylva. IA deliberadamente simple (sección de rendimiento del diseño):
// un solo objetivo por esqueleto, recalculado cada cierto intervalo, no cada frame.
function spawnNigroSkeleton(h, type, mods){
  const baseHp = type==="mage" ? 46 : 62;
  const baseDmg = type==="mage" ? 7 : 9;
  const hpMult = 1+(mods.skeletonHpPct||0);
  const ang = Math.random()*Math.PI*2;
  const sx = h.x+Math.cos(ang)*40, sy = h.y+Math.sin(ang)*40;
  h.skeletons.push({
    owner:h, type, x:sx, y:sy, fx:1, fy:0,
    hp: baseHp*hpMult, maxHp: baseHp*hpMult, dmg: baseDmg, ranged: type==="mage",
    moving:false, attackAnim:0, hitFlash:0, atkCd:0, retargetCd:0, target:null, alive:true
  });
  // Ráfaga de materialización real (antes sin usar): el esqueleto emerge de la niebla verde.
  vfxSprite(type==="mage" ? "nigroSkeletonSpawnMage" : "nigroSkeletonSpawnWarrior", 0, sx, sy, 60, 340, null, 0.1, false, 0.92, 0);
}
function killNigroSkeleton(sk){
  sk.alive = false;
  particles.push({x:sk.x,y:sk.y, life:280, ring:true, maxLife:280, maxR:26, color:"#7ad48a"});
  if(sk.type==="mage") return;
}
function updateNigromanteSkeletons(h, dt){
  if(!h.skeletons.length) return;
  const mods = talentSkillMods(h.classKey, 0).flags;
  for(const sk of h.skeletons){
    if(!sk.alive) continue;
    if(sk.hitFlash>0) sk.hitFlash -= dt;
    if(sk.attackAnim>0) sk.attackAnim -= dt;
    if(sk.atkCd>0) sk.atkCd -= dt;
    sk.retargetCd -= dt;
    if(sk.retargetCd<=0 || !sk.target || !sk.target.alive){
      sk.retargetCd = 500+Math.random()*300;
      // Prioriza enemigos malditos (sección 3), si no el más cercano dentro de un radio razonable.
      // Reusa este mismo recorrido (en vez de sumar otro escaneo completo por frame) para una
      // vulnerabilidad simplificada: un enemigo que esté atacando y pegado a un esqueleto le
      // hace daño de refilón -así "pueden morir" sin convertirlos en un tipo de objetivo nuevo
      // dentro de toda la IA enemiga existente-.
      let best=null, bestScore=-Infinity;
      for(const e of enemies){
        if(!e.alive) continue;
        const d = distance(sk,e);
        if(e.attackAnim>0 && d <= (e.radius||20)+30){
          sk.hp -= (e.dmg||5); sk.hitFlash = 90;
        }
        if(d>520) continue;
        const score = (e.cursed?100000:0) - d;
        if(score>bestScore){ bestScore=score; best=e; }
      }
      sk.target = best;
      if(sk.hp<=0){ killNigroSkeleton(sk); h.nigroGraveyard.push({type:sk.type, timer:14000}); }
    }
    // Si se aleja demasiado del dueño o queda "trabado" fuera del mapa, vuelve de un salto.
    if(distance(sk, h) > NIGRO_SKELETON_LEASH || Math.hypot(sk.x,sk.y) > ARENA_RADIUS+400){
      const ang = Math.random()*Math.PI*2;
      sk.x = h.x+Math.cos(ang)*50; sk.y = h.y+Math.sin(ang)*50;
    }
    const target = sk.target;
    if(target){
      const dx=target.x-sk.x, dy=target.y-sk.y, d=Math.hypot(dx,dy)||1;
      sk.fx=dx/d; sk.fy=dy/d;
      const range = sk.ranged ? 260 : 44;
      if(d>range){
        sk.moving = true;
        const spd = sk.ranged ? 90 : 108;
        sk.x += sk.fx*spd*dt/1000; sk.y += sk.fy*spd*dt/1000;
      } else {
        sk.moving = false;
        if(sk.atkCd<=0){
          sk.atkCd = sk.ranged ? 1400 : 950;
          sk.attackAnim = 260;
          const dmgMult = 1+(mods.skeletonDmgPct||0);
          const finalDmg = sk.dmg*runStats.dmgMult*dmgMult*arenaMods().heroDmgMult;
          if(sk.ranged){
            projectiles.push({x:sk.x,y:sk.y-10, vx:sk.fx*300, vy:sk.fy*300, dmg:finalDmg, life:1100, radius:6, color:"#7ad48a", src:h});
          } else {
            damageEnemy(target, finalDmg, {src:h});
          }
        }
      }
    } else {
      // Sin objetivo: sigue de cerca al dueño en vez de quedarse plantado en cualquier lado.
      const dx=h.x-sk.x, dy=h.y-sk.y, d=Math.hypot(dx,dy)||1;
      if(d>90){ sk.fx=dx/d; sk.fy=dy/d; sk.moving=true; sk.x+=sk.fx*95*dt/1000; sk.y+=sk.fy*95*dt/1000; }
      else sk.moving=false;
    }
    // Separación mínima entre esqueletos (nunca exactamente apilados) y nunca bloquean al dueño.
    for(const other of h.skeletons){
      if(other===sk || !other.alive) continue;
      const d = distance(sk,other);
      if(d < NIGRO_SKELETON_SEPARATION && d>0.01){
        const push = (NIGRO_SKELETON_SEPARATION-d)/2;
        sk.x += (sk.x-other.x)/d*push; sk.y += (sk.y-other.y)/d*push;
      }
    }
  }
  h.skeletons = h.skeletons.filter(sk=>sk.alive);
  // Talento "Legión Eterna": los esqueletos caídos tienen una probabilidad de revivir solos
  // tras un tiempo, sin superar nunca el máximo permitido -un único intento por caída, nunca
  // reintentos indefinidos, para que el ejército no pueda crecer sin límite-.
  if(h.nigroGraveyard.length){
    const eternalLegion = !!mods.eternalLegion;
    const maxCount = nigromanteMaxSkeletons(masteryOf(h.classKey, 0));
    for(const grave of h.nigroGraveyard){
      grave.timer -= dt;
      if(grave.timer<=0){
        grave.done = true;
        if(eternalLegion && h.skeletons.length<maxCount && Math.random()<0.25){
          spawnNigroSkeleton(h, grave.type, mods);
        }
      }
    }
    h.nigroGraveyard = h.nigroGraveyard.filter(g=>!g.done);
  }
}

// ---- Gólem invocado: único (nunca se duplica -si ya hay uno, Crear Golem lo renueva/reposiciona).
function spawnOrRenewGolem(h){
  const mods = talentSkillMods(h.classKey, 1).flags;
  const skin = nigromanteGolemSkin(h);
  const baseHp = 260 * (1+(mods.golemHpPct||0)) * (skin==="ice"?1.2 : skin==="fire"?0.85 : 1);
  if(h.golem){
    // Ya existe: lo renueva (vida llena, reposiciona cerca del Nigromante) en vez de duplicarlo.
    h.golem.maxHp = baseHp; h.golem.hp = baseHp; h.golem.skin = skin;
    h.golem.x = h.x + h.fx*60; h.golem.y = h.y + h.fy*60;
    return;
  }
  h.golem = {
    owner:h, x:h.x+h.fx*60, y:h.y+h.fy*60, fx:h.fx||1, fy:h.fy||0,
    hp:baseHp, maxHp:baseHp, skin, moving:false, attackAnim:0, hitFlash:0, atkCd:0, retargetCd:0, target:null
  };
  // Ráfaga de materialización real (antes sin usar): el Golem emerge de la niebla verde.
  vfxSprite("nigroGolemSpawn", 0, h.golem.x, h.golem.y, 100, 420, null, 0.1, false, 0.94, 0);
}
function killNigroGolem(h){
  if(!h.golem) return;
  particles.push({x:h.golem.x,y:h.golem.y, life:420, ring:true, maxLife:420, maxR:50, color:"#8fae7a"});
  h.golem = null;
}
function updateNigromanteGolem(h, dt){
  const g = h.golem;
  if(!g) return;
  if(g.hitFlash>0) g.hitFlash -= dt;
  if(g.attackAnim>0) g.attackAnim -= dt;
  if(g.atkCd>0) g.atkCd -= dt;
  g.retargetCd -= dt;
  if(g.retargetCd<=0 || !g.target || !g.target.alive){
    g.retargetCd = 600+Math.random()*300;
    // Misma vulnerabilidad simplificada que los esqueletos (ver updateNigromanteSkeletons),
    // pero mitigada -es el tanque del ejército, no debería derretirse tan rápido como ellos-.
    let best=null, bestScore=-Infinity;
    for(const e of enemies){
      if(!e.alive) continue;
      const d = distance(g,e);
      if(e.attackAnim>0 && d <= (e.radius||20)+34){
        g.hp -= (e.dmg||5)*0.4; g.hitFlash = 90;
      }
      if(d>560) continue;
      const score = (e.cursed?100000:0) - d;
      if(score>bestScore){ bestScore=score; best=e; }
    }
    g.target = best;
    if(g.hp<=0){ killNigroGolem(h); return; }
  }
  if(distance(g, h) > NIGRO_GOLEM_LEASH || Math.hypot(g.x,g.y) > ARENA_RADIUS+400){
    g.x = h.x+h.fx*60; g.y = h.y+h.fy*60;
  }
  const mods = talentSkillMods(h.classKey, 1);
  const AREA_G = 1+(mods.flags.golemAreaBonus||0)+mods.areaMult;
  const range = 70*AREA_G;
  if(g.target){
    const dx=g.target.x-g.x, dy=g.target.y-g.y, d=Math.hypot(dx,dy)||1;
    g.fx=dx/d; g.fy=dy/d;
    if(d>range){ g.moving=true; g.x+=g.fx*66*dt/1000; g.y+=g.fy*66*dt/1000; }
    else {
      g.moving=false;
      if(g.atkCd<=0){
        g.atkCd = 1500;
        g.attackAnim = 320;
        const sk = CLASSES.nigromante.skills[1];
        const dmgMult = (1+mods.powerMult) * (g.skin==="fire"?1.25 : g.skin==="ice"?0.9 : 1);
        const finalDmg = h.baseDmg*runStats.dmgMult*sk.dmgMult*dmgMult*arenaMods().heroDmgMult;
        for(const e of enemies){
          if(!e.alive || distance(g,e) > range+18) continue;
          damageEnemy(e, finalDmg, {src:h, slow: g.skin==="ice"?0.35:undefined, slowDur: g.skin==="ice"?1500:undefined, burn: g.skin==="fire"?true:undefined});
        }
        particles.push({x:g.x,y:g.y, life:260, ring:true, maxLife:260, maxR:range, color: g.skin==="fire"?"#ff8a3d":g.skin==="ice"?"#9fe3ff":"#8fae7a"});
      }
    }
  } else {
    const dx=h.x-g.x, dy=h.y-g.y, d=Math.hypot(dx,dy)||1;
    if(d>110){ g.fx=dx/d; g.fy=dy/d; g.moving=true; g.x+=g.fx*70*dt/1000; g.y+=g.fy*70*dt/1000; }
    else g.moving=false;
  }
}

// ---- Encarnación del Abismo: absorbe temporalmente esqueletos+gólem y transforma al
// Nigromante en un demonio más grande y fuerte; al terminar, restaura el ejército (nunca lo
// destruye de forma permanente, tal como pide el diseño).
function nigromanteDemonMods(h){
  const ult = CLASSES.nigromante.ultimate;
  const armySize = (h.nigroAbsorbedSkeletons||0) + (h.nigroAbsorbedGolem?2:0);
  const scale = 1 + Math.min(0.6, armySize*0.08);
  return { hpMult: ult.hpMult*scale, dmgMult: ult.dmgMult*scale };
}
function enterAbyssForm(h, sk){
  h.nigroAbsorbedSkeletons = h.skeletons.filter(s=>s.alive).length;
  h.nigroAbsorbedGolem = !!h.golem;
  h.skeletons = [];
  h.golem = null;
  h.nigroDemonForm = true;
  h.nigroTransformTimer = NIGRO_TRANSFORM_MS;
  h.nigroDemonTimer = sk.duration;
  h.nigroDemonMaxTimer = sk.duration;
  const mods = nigromanteDemonMods(h);
  h._preDemonMaxHp = h.maxHp; h._preDemonHp = h.hp;
  h.maxHp = Math.round(h.maxHp*mods.hpMult);
  h.hp = Math.min(h.maxHp, h.hp + (h.maxHp-h._preDemonMaxHp));
  if(h===player) showBanner("¡ENCARNACIÓN DEL ABISMO!");
  particles.push({x:h.x,y:h.y, life:NIGRO_TRANSFORM_MS, ring:true, maxLife:NIGRO_TRANSFORM_MS, maxR:90, color:"#50e68c"});
}
function exitAbyssForm(h){
  if(!h.nigroDemonForm) return;
  h.nigroDemonForm = false;
  h.nigroTransformTimer = 0;
  if(h._preDemonMaxHp){
    const pct = h.hp/h.maxHp;
    h.maxHp = h._preDemonMaxHp;
    h.hp = Math.max(1, Math.round(h.maxHp*pct));
  }
  // Restaura el ejército absorbido -nunca lo destruye definitivamente-.
  const mastery = masteryOf(h.classKey, 0);
  const maxCount = nigromanteMaxSkeletons(mastery);
  const restoreCount = Math.min(maxCount, h.nigroAbsorbedSkeletons||0);
  const comp = nigromanteSkeletonComposition(restoreCount);
  const talentMods0 = talentSkillMods(h.classKey, 0).flags;
  for(let i=0;i<comp.warriors;i++) spawnNigroSkeleton(h, "warrior", talentMods0);
  for(let i=0;i<comp.mages;i++) spawnNigroSkeleton(h, "mage", talentMods0);
  if(h.nigroAbsorbedGolem) spawnOrRenewGolem(h);
  h.nigroAbsorbedSkeletons = 0; h.nigroAbsorbedGolem = false;
  if(h===player) showBanner("La Encarnación del Abismo ha terminado");
  particles.push({x:h.x,y:h.y, life:420, ring:true, maxLife:420, maxR:70, color:"#50e68c"});
}
function updateNigromanteDemonForm(h, dt){
  if(h.nigroTransformTimer>0) h.nigroTransformTimer -= dt;
  if(!h.nigroDemonForm) return;
  h.nigroDemonTimer -= dt;
  if(h.nigroDemonTimer<=0){ h.nigroDemonTimer=0; exitAbyssForm(h); }
}

function triggerBasic(caster){
  caster = caster || player;
  if(caster.basicCd>0 || !caster.alive) return;
  if(caster===player && state!=="playing") return;
  if(axiomFreezeTimer>0 && caster!==axiomFreezeCaster) return; // Force Quit: nadie mas actua
  if(caster.fused) return; // La Profeta fusionada (Ascensión del Elegido): no actúa ella misma
  const cls = caster.cls;
  const mythicBonus = mythicExecuteBonus(caster); // Sobrecarga Mítica: bonus si vida<50%
  const aspd = 1 + passiveSum(caster.classKey,"atkspeed_mult") + mythicBonus;

  // La Profeta — Danza del Presagio: su básico es siempre cuerpo a cuerpo (mismo criterio de
  // rango/objetivo que el resto de las clases melee) pero cada golpe acumula una carga de
  // "Presagio"; al llegar al máximo se dispara sola "Giro del Presagio" (triggerPresagioSpin)
  // y el contador se reinicia. Vive fuera del bloque genérico de abajo porque necesita su
  // propio contador por golpe, algo que ninguna otra clase usa en su básico.
  if(caster.classKey==="profeta" && !divinaMode){
    const target = nearestEnemyTo(caster, cls.basicRange);
    if(caster===player){
      caster.basicCd = cls.basicCd / (player.buffAtkSpeedMult * aspd);
    } else {
      if(!target) return;
      caster.basicCd = cls.basicCd * 1.15 / ((caster.buffAtkSpeedMult||1) * aspd);
    }
    if(target){ const dx=target.x-caster.x, dy=target.y-caster.y, l=Math.hypot(dx,dy)||1; caster.fx=dx/l; caster.fy=dy/l; }
    caster.attackAnim = 190;
    const dmg = caster.baseDmg * runStats.dmgMult * (caster.buffDmgMult||1) * arenaMods().heroDmgMult * (1 + passiveSum(caster.classKey,"dmg_mult") + mythicBonus);
    let hitSomething = false;
    for(const e of enemies){
      if(!e.alive) continue;
      if(distance(caster,e) <= cls.basicRange){
        damageEnemy(e, dmg, {fromBasic:true, src:caster});
        hitSomething = true;
      }
    }
    spawnSlash(caster);
    if(hitSomething){
      caster.presagioComboTimer = PROFETA_COMBO_WINDOW_MS;
      caster.presagioCharges = (caster.presagioCharges||0)+1;
      if(caster.presagioCharges >= PROFETA_PRESAGIO_MAX){
        caster.presagioCharges = 0;
        triggerPresagioSpin(caster, dmg);
      }
    }
    return;
  }

  // Musashi — combo de 3 golpes con el bokken (sección 6): golpe/golpe/golpe fuerte, siempre
  // single-target (a diferencia del básico "pega a todo lo que esté en rango" del resto del
  // roster cuerpo a cuerpo) porque su identidad es el duelo 1 contra 1, no el barrido de área.
  // Prioriza a su Marca de Duelo si está en rango; si no, ataca al enemigo más cercano -y ESE
  // pasa a ser la nueva Marca, section 7-.
  if(caster.classKey==="musashi" && !divinaMode){
    const target = (caster.duelTarget && caster.duelTarget.alive && distance(caster,caster.duelTarget)<=cls.basicRange)
      ? caster.duelTarget : nearestEnemyTo(caster, cls.basicRange);
    const duelMods = musashiDuelUltMods(caster);
    const totalAspd = aspd * duelMods.atkSpeedMult;
    if(caster===player){
      caster.basicCd = cls.basicCd / (player.buffAtkSpeedMult * totalAspd);
    } else {
      if(!target) return;
      caster.basicCd = cls.basicCd * 1.15 / ((caster.buffAtkSpeedMult||1) * totalAspd);
    }
    if(target){ const dx=target.x-caster.x, dy=target.y-caster.y, l=Math.hypot(dx,dy)||1; caster.fx=dx/l; caster.fy=dy/l; }
    caster.attackAnim = 190;
    if(caster.comboTimer<=0) caster.comboCharges = 0;
    const comboStep = (caster.comboCharges||0) % 3;
    const isStrongHit = comboStep===2;
    const mods = musashiCombatMods(caster);
    const baseDmg = caster.baseDmg * runStats.dmgMult * (caster.buffDmgMult||1) * arenaMods().heroDmgMult * (1 + passiveSum(caster.classKey,"dmg_mult") + mythicBonus);
    const finalDmg = baseDmg * (isStrongHit ? 1.6 : 1.0) * mods.dmgMult;
    let hitSomething = false;
    if(target && distance(caster,target) <= cls.basicRange){
      const critOpts = {fromBasic:true, src:caster, critChanceOverride: caster.ghostStepCritTimer>0 ? 1 : mods.critChance, critMultOverride: mods.critMult};
      damageEnemy(target, finalDmg, critOpts);
      caster.ghostStepCritTimer = 0; // el crítico garantizado de Paso Fantasma se consume con este golpe
      musashiAddConcentration(caster, target, 1);
      hitSomething = true;
      // Duelo Perfecto (10 cargas): los básicos generan un pequeño segundo corte demorado.
      if(mods.perfect){
        musashiSecondCuts.push({caster, target, dmg:finalDmg*0.3, critChance:mods.critChance, critMult:mods.critMult, timer:150});
      }
    }
    spawnSlash(caster);
    if(hitSomething){
      caster.comboCharges = (caster.comboCharges||0)+1;
      caster.comboTimer = MUSASHI_COMBO_WINDOW_MS;
      if(caster===player && isStrongHit) floatText(caster.x, caster.y-40, "¡GOLPE FUERTE!", "crit");
    }
    return;
  }

  // Sylva — flecha básica (sección 6/9): proyectil a distancia con auto-target normal, marca
  // Rastreo al impactar (ver el hook dentro de damageEnemy, no acá: el proyectil pega más
  // tarde). La velocidad de disparo real (Rastreo+Impulso) acorta attackAnim, así el combo de
  // sprites reales cicla más rápido solo -sin un sistema de animación aparte, sección 6-.
  if(caster.classKey==="cazadora" && !divinaMode){
    const mods = sylvaCombatMods(caster);
    const totalAspd = aspd * mods.atkSpeedMult;
    if(caster===player){
      caster.basicCd = cls.basicCd / (player.buffAtkSpeedMult * totalAspd);
    } else {
      const t = nearestEnemyTo(caster, cls.basicRange);
      if(!t) return;
      caster.basicCd = cls.basicCd * 1.15 / ((caster.buffAtkSpeedMult||1) * totalAspd);
    }
    const target = (caster.huntTarget && caster.huntTarget.alive && distance(caster,caster.huntTarget)<=cls.basicRange)
      ? caster.huntTarget : nearestEnemyTo(caster, cls.basicRange);
    let dx=caster.fx, dy=caster.fy;
    if(target){ dx=target.x-caster.x; dy=target.y-caster.y; const l=Math.hypot(dx,dy)||1; dx/=l; dy/=l; caster.fx=dx; caster.fy=dy; }
    caster.attackAnim = Math.max(70, 190/totalAspd);
    const dmg = caster.baseDmg * runStats.dmgMult * (caster.buffDmgMult||1) * arenaMods().heroDmgMult * (1 + passiveSum(caster.classKey,"dmg_mult") + mythicBonus) * mods.dmgMult;
    projectiles.push({x:caster.x, y:caster.y-14, vx:dx*480, vy:dy*480, dmg, life:750, radius:6, color:"#c8f0a8",
      fromBasic:true, pierce:false, src:caster, critChanceOverride: runStats.critChance+mods.critChanceAdd});
    spawnSlash(caster);
    return;
  }

  // Nigromante — Proyectil de Hueso: básico a distancia con auto-target, bonus de daño contra
  // enemigos afectados por su propia Plaga (sección 2). Reemplazado por "Garras del Abismo"
  // (cono cuerpo a cuerpo) mientras dure la Encarnación del Abismo (sección 6).
  if(caster.classKey==="nigromante" && !divinaMode){
    if(caster===player){
      caster.basicCd = cls.basicCd / (player.buffAtkSpeedMult * aspd);
    } else {
      const t = nearestEnemyTo(caster, caster.nigroDemonForm ? 90 : cls.basicRange);
      if(!t) return;
      caster.basicCd = cls.basicCd * 1.15 / ((caster.buffAtkSpeedMult||1) * aspd);
    }
    // Talento "Vínculo Profano": cada esqueleto vivo suma un poco de daño mágico propio.
    const skeletonAuraBonus = (talentSkillMods(caster.classKey, 0).flags.skeletonDmgAuraPct||0) * caster.skeletons.length;
    const dmgBase = caster.baseDmg * runStats.dmgMult * (caster.buffDmgMult||1) * arenaMods().heroDmgMult * (1 + passiveSum(caster.classKey,"dmg_mult") + mythicBonus + skeletonAuraBonus);
    if(caster.nigroDemonForm){
      // Garras del Abismo: cono corto cuerpo a cuerpo, golpea a todo lo que esté delante.
      const target = nearestEnemyTo(caster, 100);
      if(target){ const dx=target.x-caster.x, dy=target.y-caster.y, l=Math.hypot(dx,dy)||1; caster.fx=dx/l; caster.fy=dy/l; }
      caster.attackAnim = 220;
      const demonMods = nigromanteDemonMods(caster);
      const clawDmg = dmgBase * 1.5 * demonMods.dmgMult;
      for(const e of enemies){
        if(!e.alive || distance(caster,e) > 100) continue;
        const dx=e.x-caster.x, dy=e.y-caster.y, l=Math.hypot(dx,dy)||1;
        const dot = (dx/l)*caster.fx + (dy/l)*caster.fy;
        if(dot < 0.25) continue; // fuera del cono frontal
        damageEnemy(e, clawDmg, {fromBasic:true, src:caster});
      }
      spawnSlash(caster);
      return;
    }
    const target = nearestEnemyTo(caster, cls.basicRange);
    let dx=caster.fx, dy=caster.fy;
    if(target){ dx=target.x-caster.x; dy=target.y-caster.y; const l=Math.hypot(dx,dy)||1; dx/=l; dy/=l; caster.fx=dx; caster.fy=dy; }
    caster.attackAnim = 190;
    const cursedBonus = (target && target.cursed) ? 1.3 : 1.0;
    const dmg = dmgBase * cursedBonus;
    projectiles.push({x:caster.x, y:caster.y-14, vx:dx*440, vy:dy*440, dmg, life:900, radius:7, color:"#8ef0c8", fromBasic:true, pierce:false, src:caster});
    spawnSlash(caster);
    return;
  }

  if(divinaMode){
    // Bug corregido: antes SOLO el jugador atacaba en la Arena Divina (los 3 aliados no
    // hacían nada salvo caminar) porque acá abajo, para cualquier otro caster, se buscaba
    // target en `enemies` -que en la Arena Divina siempre está vacío-. Ahora cualquiera de
    // tu equipo (o del rival) busca objetivo entre campeones/minions/estructuras hostiles.
    const mySide = caster.isDivineFoe ? "enemy" : "player";
    const hit = divinaHostiles(mySide, caster.x, caster.y, cls.basicRange + 40);
    if(!hit) return;
    if(caster===player){
      caster.basicCd = cls.basicCd / (player.buffAtkSpeedMult * aspd);
    } else {
      caster.basicCd = cls.basicCd * 1.15 / ((caster.buffAtkSpeedMult||1) * aspd);
    }
    caster.attackAnim = 190;
    const dmg = caster.baseDmg * runStats.dmgMult * (caster.buffDmgMult||1) * furyMissingHpMult(caster) * arenaMods().heroDmgMult * (1 + passiveSum(caster.classKey,"dmg_mult") + mythicBonus);
    const dx=hit.ref.x-caster.x, dy=hit.ref.y-caster.y, l=Math.hypot(dx,dy)||1;
    caster.fx=dx/l; caster.fy=dy/l;
    divinaDealDamage(hit, dmg, caster);
    spawnSlash(caster);
    return;
  }

  if(caster===player){
    caster.basicCd = cls.basicCd / (player.buffAtkSpeedMult * aspd);
  } else {
    const t = nearestEnemyTo(caster, cls.basicRange);
    if(!t) return;
    caster.basicCd = cls.basicCd * 1.15 / ((caster.buffAtkSpeedMult||1) * aspd);
  }
  caster.attackAnim = 190;
  const dmg = caster.baseDmg * runStats.dmgMult * (caster.buffDmgMult||1) * furyMissingHpMult(caster) * arenaMods().heroDmgMult * (1 + passiveSum(caster.classKey,"dmg_mult") + mythicBonus);
  const bleedOpt = caster.buffBleedOnHit ? {bleed:true, bleedDur:2400} : {};
  if(cls.ranged){
    const target = nearestEnemyTo(caster, cls.basicRange);
    let dx=caster.fx, dy=caster.fy;
    if(target){ dx = target.x-caster.x; dy = target.y-caster.y; const l=Math.hypot(dx,dy)||1; dx/=l; dy/=l; caster.fx=dx; caster.fy=dy; }
    projectiles.push({x:caster.x,y:caster.y-14, vx:dx*420, vy:dy*420, dmg, life:900, radius:8, color:cls.glow, fromBasic:true, pierce:false, src:caster});
    // pequeño detalle de lanzamiento propio de cada clase con proyectil (llamita del Mago,
    // destello cálido del Sanador) para que el básico no se sienta tan genérico
    if(caster.classKey==="mago"){
      for(let i=0;i<3;i++){
        particles.push({x:caster.x+dx*10, y:caster.y-14+dy*10, vx:dx*60+(Math.random()-0.5)*40, vy:dy*60+(Math.random()-0.5)*40-14, life:220, color:i===0?"#ffb36a":"#ff6a3d"});
      }
    } else if(caster.classKey==="soporte"){
      for(let i=0;i<3;i++){
        const a = Math.random()*Math.PI*2;
        particles.push({x:caster.x+dx*10, y:caster.y-14+dy*10, vx:Math.cos(a)*30, vy:Math.sin(a)*30-20, life:260, color:i===0?"#fff2c0":"#ffe08a"});
      }
    }
  } else {
    const target = nearestEnemyTo(caster, cls.basicRange);
    if(target){ const dx=target.x-caster.x, dy=target.y-caster.y; const l=Math.hypot(dx,dy)||1; caster.fx=dx/l; caster.fy=dy/l; }
    for(const e of enemies){
      if(!e.alive) continue;
      if(distance(caster,e) <= cls.basicRange){
        damageEnemy(e, dmg, Object.assign({fromBasic:true, src:caster}, bleedOpt));
      }
    }
    spawnSlash(caster);
  }
}

function spawnSlash(caster){
  particles.push({x:caster.x+caster.fx*38, y:caster.y+caster.fy*38-10, vx:0, vy:0, life:140, slash:true, color:caster.cls.glow});
}

function useSkill(idx){
  if(!player.alive || state!=="playing") return;
  const sk = player.cls.skills[idx];
  if(player.cds[idx]>0 || player.energy < sk.cost) return;
  player.energy -= sk.cost;
  const passiveCdMult = Math.max(0.4, 1 - passiveSum(player.classKey,"cd_mult")); // "Mente Ágil"
  player.cds[idx] = sk.cd * runStats.cdMult * cdMultFor(sk, masteryOf(player.classKey, idx)) * passiveCdMult * arenaMods().heroCdMult * talentSkillCdMult(player.classKey, idx);
  if(sk.kind==="teleport_blink") player.cds[idx] = resolveTeleportCd(player, player.cds[idx]);
  if(sk.kind==="ghost_step" && player.duelActive) player.cds[idx] *= musashiGhostStepCdMult(player);
  gainSkillUseXp(player.classKey, idx);
  castAbility(player, sk, false, idx);
}

// Sylva — Flecha Perforante ya cargada (ver sylvaChargeRelease): mismo descuento de
// energía/cooldown que useSkill(0), pero pasando cuánto se mantuvo cargada para elegir el tier
// dentro del case "piercing_shot" de castAbility.
function useSylvaPiercingShot(caster, chargeMs){
  if(!caster.alive || state!=="playing") return;
  const idx = 0;
  const sk = caster.cls.skills[idx];
  if(caster.cds[idx]>0 || caster.energy < sk.cost) return;
  caster.energy -= sk.cost;
  const passiveCdMult = Math.max(0.4, 1 - passiveSum(caster.classKey,"cd_mult"));
  caster.cds[idx] = sk.cd * runStats.cdMult * cdMultFor(sk, masteryOf(caster.classKey, idx)) * passiveCdMult * arenaMods().heroCdMult * talentSkillCdMult(caster.classKey, idx);
  gainSkillUseXp(caster.classKey, idx);
  caster.pendingChargeMs = chargeMs;
  castAbility(caster, sk, false, idx);
}

function useUltimate(){
  if(!player.alive || state!=="playing") return;
  if(player.ultCharge < player.ultMax) return;
  if(player.ultCd > 0) return; // antes no se chequeaba: la ulti podía saltarse su propio enfriamiento
  if(runLevel < ULT_MIN_ARENA_LEVEL) return; // no disponible hasta cierto punto de la arena
  const ult = player.cls.ultimate;
  player.ultCharge = 0;
  const passiveCdMult = Math.max(0.4, 1 - passiveSum(player.classKey,"cd_mult"));
  player.ultCd = ult.cd * masteryCdMult(masteryOf(player.classKey, "ult")) * passiveCdMult * arenaMods().heroCdMult * talentSkillCdMult(player.classKey, "ult");
  gainSkillUseXp(player.classKey, "ult");
  castAbility(player, ult, true);
}

function elementColor(sk, fallback){
  if(sk.element==="fire") return "#ff6a3d";
  if(sk.element==="ice") return "#9fe3ff";
  if(sk.element==="lightning") return "#ffe36a";
  return fallback;
}

// Visuales de Nova de Escarcha que evolucionan con el nivel de maestría de la habilidad,
// siguiendo la progresión de referencia N1 (anillo simple) -> N4 (círculo rúnico completo).
function frostNovaVFX(caster, R, talentLevel){
  const tier = talentLevel>=7 ? 4 : talentLevel>=4 ? 3 : talentLevel>=2 ? 2 : 1;
  // N1: doble anillo de escarcha (siempre presente, crece con el área)
  particles.push({x:caster.x,y:caster.y, life:520, ring:true, maxLife:520, maxR:R, color:"#bfe8ff"});
  particles.push({x:caster.x,y:caster.y, life:680, ring:true, maxLife:680, maxR:R*0.55, color:"#eaffff"});
  // Escarcha ascendente base
  for(let i=0;i<12;i++){
    const a=Math.random()*Math.PI*2, r=Math.random()*R;
    particles.push({x:caster.x+Math.cos(a)*r, y:caster.y+Math.sin(a)*r*0.55, vx:0, vy:-8, life:520, color:"#eaffff"});
  }
  if(tier>=2){
    // N2: chispas de escarcha orbitando el anillo
    for(let i=0;i<16;i++){
      const a = (i/16)*Math.PI*2;
      particles.push({x:caster.x+Math.cos(a)*R*0.92, y:caster.y+Math.sin(a)*R*0.92*0.55, vx:Math.cos(a)*8, vy:Math.sin(a)*8*0.55-4, life:460, color:"#eaffff"});
    }
  }
  if(tier>=3){
    // N3: cristales de hielo que emergen del suelo (más un par de esquirlas reales)
    for(let i=0;i<8;i++){
      const a = Math.random()*Math.PI*2, r = Math.random()*R*0.85;
      particles.push({x:caster.x+Math.cos(a)*r, y:caster.y+Math.sin(a)*r*0.55, life:900, maxLife:900, crystal:true, size:9+Math.random()*9, angle:Math.random()*Math.PI, color:"#bfe8ff"});
    }
    if(newfxReady('iceCrystal')){
      for(let i=0;i<3;i++){
        const a = Math.random()*Math.PI*2, r = Math.random()*R*0.7;
        vfxSprite("fxIceCrystal", 0, caster.x+Math.cos(a)*r, caster.y+Math.sin(a)*r*0.55, 26+Math.random()*10, 900, null, 0.15, Math.random()<0.5, 0.92);
      }
    }
  }
  if(tier>=4){
    // N4: círculo rúnico completo bajo el mago, con un tercer anillo exterior
    particles.push({x:caster.x,y:caster.y, life:950, maxLife:950, runeRing:true, maxR:R*0.72, color:"#9fe3ff", count:12});
    particles.push({x:caster.x,y:caster.y, life:900, ring:true, maxLife:900, maxR:R*0.9, color:"#7ad0ff"});
    if(newfxReady('frostRune')){
      for(let i=0;i<6;i++){
        const a = (i/6)*Math.PI*2;
        vfxSprite("fxFrostRune", 0, caster.x+Math.cos(a)*R*0.72, caster.y+Math.sin(a)*R*0.72*0.55, 22, 950, null, 0.1, false, 0.5, 0, 0, 0, a+Math.PI/2);
      }
    }
  }
}
// Visuales del estallido inicial de Cataclismo Elemental (Ulti), escalonadas por nivel de talento:
// de un anillo de fuego simple a un círculo rúnico con esquirlas de hielo, como en la referencia.
function cataclysmVFX(caster, R, talentLevel){
  const tier = talentLevel>=7 ? 4 : talentLevel>=4 ? 3 : talentLevel>=2 ? 2 : 1;
  particles.push({x:caster.x,y:caster.y, life:520, ring:true, maxLife:520, maxR:R, color:"#ff6a3d"});
  particles.push({x:caster.x,y:caster.y, life:520, maxLife:520, spin:true, radius:R*0.6, color:"#9fe3ff"});
  if(tier>=2){
    for(let i=0;i<10;i++){
      const a=Math.random()*Math.PI*2, r=Math.random()*R;
      particles.push({x:caster.x+Math.cos(a)*r, y:caster.y+Math.sin(a)*r*0.55, vx:(Math.random()-0.5)*20, vy:-16-Math.random()*20, life:520, color:"#ffb36a"});
    }
  }
  if(tier>=3){
    for(let i=0;i<6;i++){
      const a=Math.random()*Math.PI*2, r=Math.random()*R*0.85;
      particles.push({x:caster.x+Math.cos(a)*r, y:caster.y+Math.sin(a)*r*0.55, life:900, maxLife:900, crystal:true, size:9+Math.random()*8, angle:Math.random()*Math.PI, color:"#bfe8ff"});
    }
    if(newfxReady('iceCrystal')){
      for(let i=0;i<2;i++){
        const a = Math.random()*Math.PI*2, r = Math.random()*R*0.7;
        vfxSprite("fxIceCrystal", 0, caster.x+Math.cos(a)*r, caster.y+Math.sin(a)*r*0.55, 24+Math.random()*10, 900, null, 0.15, Math.random()<0.5, 0.92);
      }
    }
  }
  if(tier>=4){
    particles.push({x:caster.x,y:caster.y, life:950, maxLife:950, runeRing:true, maxR:R*0.72, color:"#ffcf5c", count:12});
    particles.push({x:caster.x,y:caster.y, life:900, ring:true, maxLife:900, maxR:R*0.9, color:"#7ad0ff"});
  }
}
// Convierte un nivel de talento (0-10) en una de las 4 etapas visuales usadas en todo el juego
function tierOf(level){ return level>=9 ? 4 : level>=6 ? 3 : level>=3 ? 2 : 1; }
// Estallido genérico que escala en capas según el nivel de talento invertido en la habilidad:
// Nv.0-1: anillo simple · Nv.2-3: + chispas y segundo anillo · Nv.4-6: + esquirlas de poder ·
// Nv.7-10: + círculo rúnico completo. Sirve de base visual compartida para cualquier habilidad
// que no tenga ya su propia progresión temática (como Nova de Escarcha o Cataclismo).
function tieredBurstVFX(x, y, R, talentLevel, color, color2){
  const tier = talentLevel>=7 ? 4 : talentLevel>=4 ? 3 : talentLevel>=2 ? 2 : 1;
  particles.push({x,y, life:420, ring:true, maxLife:420, maxR:R, color});
  if(tier>=2){
    particles.push({x,y, life:520, ring:true, maxLife:520, maxR:R*0.6, color:color2||color});
    for(let i=0;i<8;i++){
      const a=Math.random()*Math.PI*2;
      particles.push({x, y, vx:Math.cos(a)*46, vy:Math.sin(a)*46-12, life:300, color});
    }
  }
  if(tier>=3){
    for(let i=0;i<5;i++){
      const a=Math.random()*Math.PI*2, r=Math.random()*R*0.7;
      particles.push({x:x+Math.cos(a)*r, y:y+Math.sin(a)*r*0.55, life:650, maxLife:650, crystal:true, size:7+Math.random()*6, angle:Math.random()*Math.PI, color});
    }
  }
  if(tier>=4){
    particles.push({x,y, life:750, maxLife:750, runeRing:true, maxR:R*0.62, color:color2||color, count:10});
  }
  return tier;
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
function castAbility(caster, sk, isUlt, idx){
  if(axiomFreezeTimer>0 && caster!==axiomFreezeCaster && sk.kind!=="force_quit_ult") return; // nadie mas actua mientras dura Force Quit
  if(caster.fused) return; // La Profeta fusionada (Ascensión del Elegido): no puede lanzar nada ella misma
  const skillKey = isUlt ? "ult" : (idx===undefined ? 0 : idx);
  // Overcap de objetos (sección 14): legendarios/míticos pueden sumar niveles EFECTIVOS de
  // habilidad sin tocar los puntos permanentes invertidos -por eso esto usa una copia
  // (effectiveMasteryFor), nunca masteryOf() a secas, que sigue siendo lo que ve la UI-.
  const mastery = effectiveMasteryFor(caster.classKey, skillKey);
  // Talentos de ESTA habilidad puntual (ver sección TALENTOS Y MAESTRÍAS más arriba): powerMult
  // se suma al mismo escalado que ya usa la maestría (afecta daño Y curación por igual, tal
  // como ya hacía POWER antes de que existieran talentos), área/duración se multiplican sobre
  // lo que ya calculaba la maestría, sin reemplazarlo.
  const tSkill = caster.classKey ? talentSkillMods(caster.classKey, skillKey) : {powerMult:0,areaMult:0,durationMult:0,jumpBonus:0,flags:{}};
  // La maestría de la habilidad escala daño/curación, área, duración y saltos de cadena
  const POWER = masteryPowerMult(mastery) * (1+tSkill.powerMult);
  const AREA = masteryAreaMult(mastery) * (1+tSkill.areaMult);
  const DUR = masteryDurationMult(mastery) * (1+tSkill.durationMult);
  const JUMP_BONUS = masteryJumpBonus(mastery) + (tSkill.jumpBonus||0);
  const passiveDmg = caster.classKey ? (passiveSum(caster.classKey,"dmg_mult") + passiveSum(caster.classKey,"skilldmg_mult") + mythicExecuteBonus(caster)) : 0;
  const dmg0 = caster.baseDmg * runStats.dmgMult * (caster.buffDmgMult||1) * (sk.dmgMult||0) * POWER * furyMissingHpMult(caster) * arenaMods().heroDmgMult * (1+passiveDmg);
  const dmgElem = sk.element==="fire" ? dmg0*arenaMods().fireDmgMult : sk.element==="ice" ? dmg0*arenaMods().iceDmgMult : dmg0;
  const dmg = dmgElem * (arenaMods().abilityDmgMult!==undefined ? arenaMods().abilityDmgMult : 1);
  if(caster===player){ showBanner((isUlt?"★ ":"")+sk.name); playSfx(isUlt?"ult":"cast"); }
  caster.attackAnim = isUlt ? 320 : 240;
  caster._animCastKind = isUlt ? 2 : 1; // el sistema de animación lo lee como CAST (ulti = CAST fuerte)
  // animaciones del Pack 1 (Segador/Axiom): pose de cast mientras dura este attackAnim; el Tajo
  // del Segador es un golpe de guadaña, así que usa la pose de ataque
  caster._packCastUntil = sk.kind==="cone_slash" ? 0 : animNow + caster.attackAnim;
  switch(sk.kind){

    case "placeholder": {
      // Se mantiene por si algún futuro campeón necesita un slot vacío temporal (ya no lo usa
      // Axiom, que tiene sus 4 habilidades reales más abajo).
      if(caster===player) floatText(caster.x, caster.y-50, "En desarrollo", null);
      break;
    }

    case "ronin_slash": {
      // Musashi — Corte del Rōnin: avanza y da un único corte fuerte y rápido. Golpear a la
      // Marca de Duelo (o crear una nueva si no había) da +2 Concentración; en Duelo Perfecto
      // (10 cargas) aparece un segundo corte demorado sobre el mismo rival (sección 9).
      const target = (caster.duelTarget && caster.duelTarget.alive) ? caster.duelTarget : nearestEnemyTo(caster, sk.range*AREA);
      if(!target){ if(caster===player) floatText(caster.x, caster.y-40, "Sin objetivo", null); break; }
      const dx0 = target.x-caster.x, dy0 = target.y-caster.y, dlen = Math.hypot(dx0,dy0)||1;
      caster.fx = dx0/dlen; caster.fy = dy0/dlen;
      const advance = Math.max(0, Math.min(sk.range*0.55*AREA, dlen-40));
      caster.x += caster.fx*advance; caster.y += caster.fy*advance;
      clampToArena(caster); resolveWallCollision(caster);
      const mods1 = musashiCombatMods(caster);
      if(distance(caster,target) <= sk.range*AREA + 40){
        const finalDmg = dmg * mods1.dmgMult;
        damageEnemy(target, finalDmg, {src:caster, critChanceOverride:mods1.critChance, critMultOverride:mods1.critMult});
        musashiAddConcentration(caster, target, 2);
        // Talento "Corte Gemelo": probabilidad de un segundo corte incluso fuera de Duelo Perfecto.
        if(mods1.perfect || Math.random()<(tSkill.flags.roninTwinCutChance||0)){
          musashiSecondCuts.push({caster, target, dmg:finalDmg*0.55, critChance:mods1.critChance, critMult:mods1.critMult, timer:220});
        }
        pushSpark("impacto", target.x, target.y, 60, 260);
        // Destello de impacto real (arte del zip de Musashi, antes sin usar), sobre el chispazo
        // genérico de pushSpark -no reemplaza nada, solo se suma-.
        vfxSprite("musashiRoninImpact", 0, target.x, target.y-10, 70, 220, null, 0.1, caster.fx<-0.12, 0.5, 0);
      }
      // Pose real de Musashi para el corte (windup->tajo->recuperación), reemplazando su cuerpo
      // normal durante la animación -antes esta habilidad no cambiaba en nada su sprite-.
      caster.musashiCastKind = "ronin"; caster.musashiCastDur = 260; caster.attackAnim = Math.max(caster.attackAnim, 260);
      spawnSlash(caster);
      break;
    }

    case "ghost_step": {
      // Musashi — Paso Fantasma: atraviesa al objetivo (Marca de Duelo si está en rango, si no
      // el más cercano) y aparece detrás; deja un afterimage y el próximo básico tiene crítico
      // garantizado. Paso Perfecto (sección 11): si algún enemigo cuerpo a cuerpo está a punto
      // de golpearlo (atkCd bajo, mismo umbral que usa la IA enemiga para decidir "ya puedo
      // pegar"), además evita ese golpe por completo y da +3 Concentración contra él -mezcla
      // de esquive+parry, ventana corta a propósito, no arma un sistema de parry genérico-.
      const target = (caster.duelTarget && caster.duelTarget.alive && distance(caster,caster.duelTarget)<=sk.range*AREA)
        ? caster.duelTarget : nearestEnemyTo(caster, sk.range*AREA);
      let perfectSource = null;
      // Talento "Instinto Filoso"/"Instinto Absoluto": ventana de Paso Perfecto más generosa.
      const perfectWindow = MUSASHI_PERFECT_STEP_WINDOW * (1+(tSkill.flags.perfectStepWindowPct||0));
      for(const e of enemies){
        if(!e.alive || e.ranged || (e.isDuelLocked && e.duelOwner!==caster)) continue;
        if(distance(caster,e) <= (e.radius+caster.radius+42) && e.atkCd!==undefined && e.atkCd<=perfectWindow){
          perfectSource = e; break;
        }
      }
      musashiSpawnAfterimage(caster);
      if(target){
        caster.x = target.x - caster.fx*40; caster.y = target.y - caster.fy*40;
        const dxg = target.x-caster.x, dyg = target.y-caster.y, lg = Math.hypot(dxg,dyg)||1;
        caster.fx = dxg/lg; caster.fy = dyg/lg;
      } else {
        caster.x += caster.fx*(sk.range*0.6*AREA); caster.y += caster.fy*(sk.range*0.6*AREA);
      }
      clampToArena(caster); resolveWallCollision(caster);
      caster.invulnTimer = Math.max(caster.invulnTimer||0, 220);
      caster.ghostStepCritTimer = 3200;
      if(perfectSource){
        caster.invulnTimer = Math.max(caster.invulnTimer, 340);
        // Talento "Instinto Perfecto": Concentración extra en un Paso Perfecto.
        musashiAddConcentration(caster, perfectSource, 3+(tSkill.flags.pasoPerfectoConcBonus||0));
        if(caster===player) floatText(caster.x, caster.y-46, "¡PASO PERFECTO!", "crit");
        particles.push({x:caster.x,y:caster.y, life:340, ring:true, maxLife:340, maxR:44, color:"#bfe4ff"});
      }
      musashiSpawnAfterimage(caster);
      break;
    }

    case "thousand_cuts": {
      // Musashi — Mil Cortes: ráfaga alrededor suyo, prioriza a la Marca de Duelo. Cuantos
      // menos enemigos haya cerca, mayor porción de los cortes converge sobre un único rival
      // -así funciona como AoE contra hordas y como nuke single-target contra un rival aislado-.
      const nearby = enemies.filter(e=>e.alive && !(e.isDuelLocked && e.duelOwner!==caster) && distance(caster,e)<=sk.radius*AREA);
      if(!nearby.length){ if(caster===player) floatText(caster.x,caster.y-40,"Sin enemigos cerca",null); break; }
      // Talento "Mil Cortes y Uno"/"Mil y Un Cortes": cortes adicionales repartidos.
      const totalHits = (sk.totalHits||10) + (tSkill.flags.extraHits||0);
      const mods2 = musashiCombatMods(caster);
      const perHitDmg = dmg * mods2.dmgMult;
      const focusTarget = (caster.duelTarget && caster.duelTarget.alive && nearby.includes(caster.duelTarget)) ? caster.duelTarget : null;
      const others = nearby.filter(e=>e!==focusTarget);
      const hitCounts = new Map();
      if(focusTarget){
        const focusShare = Math.max(0.25, 1 - others.length*0.12);
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
      let firstMark = null;
      hitCounts.forEach((n,e)=>{
        if(n<=0) return;
        for(let i=0;i<n;i++) damageEnemy(e, perHitDmg, {src:caster, critChanceOverride:mods2.critChance, critMultOverride:mods2.critMult});
        if(!firstMark) firstMark = e;
        pushSpark("impacto", e.x, e.y, 40, 200);
      });
      if(focusTarget) musashiAddConcentration(caster, focusTarget, 3);
      else if(firstMark) musashiAddConcentration(caster, firstMark, 1);
      particles.push({x:caster.x,y:caster.y, life:380, maxLife:380, spin:true, radius:sk.radius*AREA*0.9, color:"#bfe4ff"});
      // Pose real del remolino de cortes (reemplaza el cuerpo de Musashi durante la animación,
      // igual criterio que "ronin" arriba), sobre el anillo procedural que ya existía.
      caster.musashiCastKind = "thousand"; caster.musashiCastDur = 380; caster.attackAnim = Math.max(caster.attackAnim, 380);
      if(caster===player) floatText(caster.x, caster.y-50, "¡MIL CORTES!", null);
      break;
    }

    case "last_duel_ult": {
      // Musashi — Último Duelo: ver enterLastDuel/updateLastDuel/exitLastDuel para el ciclo de
      // vida completo (aislamiento, buffs temporales, Golpe de Gracia, Senda del Rōnin).
      const duelTarget = caster.duelTarget;
      if(!duelTarget || !duelTarget.alive || duelTarget.isDuelLocked){
        if(caster===player) floatText(caster.x, caster.y-46, "Necesitás una Marca de Duelo activa", null);
        break;
      }
      enterLastDuel(caster, duelTarget, sk);
      break;
    }

    case "piercing_shot": {
      // Sylva — Flecha Perforante: la carga (0 a SYLVA_CHARGE_MAX_MS) se decide afuera, en la
      // UI (ver sylvaChargeStart/Release + useSylvaPiercingShot) o la IA (que siempre dispara
      // al máximo, ver botTryAbilities); acá solo se resuelve el disparo ya cargado en 3 tiers.
      // Tier 3 perfora y aplica Hemorragia a la Presa; crítico garantizado si además está en
      // Presa Acorralada (5 cargas de Rastreo).
      const chargeMs = caster.pendingChargeMs || 0;
      caster.pendingChargeMs = 0;
      const tier = chargeMs >= SYLVA_CHARGE_MAX_MS*0.85 ? 3 : chargeMs >= SYLVA_CHARGE_MAX_MS*0.35 ? 2 : 1;
      const mods3 = sylvaCombatMods(caster);
      const target = (caster.huntTarget && caster.huntTarget.alive) ? caster.huntTarget : nearestEnemyTo(caster, sk.range*AREA);
      let dx3=caster.fx, dy3=caster.fy;
      if(target){ dx3=target.x-caster.x; dy3=target.y-caster.y; const l3=Math.hypot(dx3,dy3)||1; dx3/=l3; dy3/=l3; caster.fx=dx3; caster.fy=dy3; }
      const tierDmgMult = [0,1,1.5,2.3][tier];
      const finalDmg = dmg * tierDmgMult * mods3.dmgMult;
      const guaranteedCrit = tier===3 && mods3.cornered;
      projectiles.push({
        x:caster.x, y:caster.y-14, vx:dx3*640, vy:dy3*640, dmg:finalDmg, life:900, radius:7, color:"#e8f5c8",
        pierce: tier===3, hitSet:new Set(), src:caster,
        critChanceOverride: guaranteedCrit ? 1 : (runStats.critChance+mods3.critChanceAdd),
        critMultOverride: guaranteedCrit ? (runStats.critMult||1.8)*1.2 : undefined,
        onHit:(e)=>{
          if(tier>=2 && e===caster.huntTarget){
            // Talento "Hemorragia Profunda"/"Sangre de Presa": más daño y duración de Hemorragia.
            const bleedBonus = 1+(tSkill.flags.bleedBonusPct||0);
            e.bleedTimer = Math.max(e.bleedTimer||0, 3200*bleedBonus);
            e.bleedDmg = Math.max(e.bleedDmg||0, finalDmg*0.18*bleedBonus);
          }
          sylvaAddTrack(caster, e, tier);
          // Impacto crítico real sobre la Presa Acorralada (arte del zip, antes sin usar):
          // exactamente la misma condición que ya daba el crítico garantizado, solo visual.
          if(guaranteedCrit) vfxSprite("sylvaPiercingCrit", 0, e.x, e.y-10, 78, 260, null, 0.1, dx3<-0.12, 0.5, 0);
        }
      });
      spawnSlash(caster);
      // Pose real del disparo (reemplaza el combo básico durante un instante muy breve).
      caster.sylvaCastKind = "piercing"; caster.sylvaCastDur = 180; caster.attackAnim = Math.max(caster.attackAnim, 180);
      if(caster===player) floatText(caster.x, caster.y-40, tier===3?"¡Flecha Perforante MAX!":"Flecha Perforante", tier===3?"crit":null);
      break;
    }

    case "forest_trap": {
      // Sylva — Trampa del Bosque: reusa el sistema genérico de trampas (traps/updateTraps),
      // sumándole un nuevo kind:"forest_root" (ver triggerTrap) en vez de duplicar el sistema
      // que ya usa el Guerrero. Enraíza a enemigos normales, reduce la duración en élites y
      // solo ralentiza (nunca inmoviliza del todo) a subjefes/jefes.
      const tx3 = caster.x + caster.fx*(sk.range*AREA), ty3 = caster.y + caster.fy*(sk.range*AREA);
      // Talento "Impulso de Caza": guardado en el propio héroe (no en la trampa) porque el
      // impulso de velocidad se aplica sobre quien la colocó, sin importar quién la dispare.
      caster.sylvaTrapBurstBonus = tSkill.flags.trapBurstBonus||0;
      traps.push({x:tx3, y:ty3, radius:sk.radius*AREA, chainRadius:0, dmg:0, timer:9000, armTime:200,
        src:caster, triggered:false, phase:0, kind:"forest_root", rootDur:sk.rootDur*DUR});
      particles.push({x:tx3,y:ty3, life:500, ring:true, maxLife:500, maxR:sk.radius*AREA*0.9, color:"#4a7a2e"});
      if(caster===player) floatText(tx3, ty3-20, "Trampa colocada", null);
      break;
    }

    case "hunter_rain": {
      // Sylva — Lluvia de la Cazadora: AoE con demora que converge sobre la Presa si está en
      // el área (ver updateSylvaRainZones), mismo patrón que las zonas con demora de Axiom.
      const tx4 = caster.x + caster.fx*(sk.range||220)*AREA, ty4 = caster.y + caster.fy*(sk.range||220)*AREA;
      // Talento "Diluvio"/"Aljaba sin Fondo": impactos adicionales repartidos en la lluvia.
      const totalHitsRain = Math.round((sk.totalHits||12)*(1+ (POWER-1)*0.5)) + (tSkill.flags.extraHits||0);
      sylvaRainZones.push({x:tx4, y:ty4, radius:sk.radius*AREA, timer:900, exploded:false,
        dmg, totalHits:totalHitsRain, src:caster});
      if(caster===player) floatText(tx4, ty4-20, "¡LLUVIA DE LA CAZADORA!", null);
      break;
    }

    case "wild_hunt_ult": {
      // Sylva — Cacería Salvaje: fija el Impulso al máximo (no puede decaer mientras dure, ver
      // sylvaCombatMods/updateSylvaMomentum), aplica los bonus de la ultimate y convoca al Lobo
      // Espectral (ver spawnSylvaWolf/updateSylvaWolf/despawnSylvaWolf).
      caster.momentum = 10;
      caster.wildHuntTimer = sk.duration*DUR;
      caster.wildHuntMaxTimer = sk.duration*DUR;
      spawnSylvaWolf(caster);
      particles.push({x:caster.x,y:caster.y, life:480, ring:true, maxLife:480, maxR:80, color:"#c8f0a8"});
      if(caster===player) floatText(caster.x, caster.y-56, "¡CACERÍA SALVAJE!", "crit");
      break;
    }

    case "raise_skeletons": {
      // Nigromante — Levanta esqueletos permanentes hasta el máximo que permite la maestría de
      // esta habilidad (sección 3); si ya hay algunos vivos, solo completa los que falten -nunca
      // reemplaza ni duplica a los existentes-. No disponible transformado (sección 6).
      if(caster.nigroDemonForm){ if(caster===player) floatText(caster.x, caster.y-40, "No disponible transformado", null); break; }
      const maxCount = nigromanteMaxSkeletons(mastery);
      const comp = nigromanteSkeletonComposition(maxCount);
      const curWarriors = caster.skeletons.filter(s=>s.type==="warrior").length;
      const curMages = caster.skeletons.filter(s=>s.type==="mage").length;
      let spawned = 0;
      for(let i=curWarriors;i<comp.warriors;i++){ spawnNigroSkeleton(caster, "warrior", tSkill.flags); spawned++; }
      for(let i=curMages;i<comp.mages;i++){ spawnNigroSkeleton(caster, "mage", tSkill.flags); spawned++; }
      if(spawned===0){ if(caster===player) floatText(caster.x, caster.y-40, "Ejército al máximo", null); break; }
      caster.nigroCastKind = "skeleton";
      caster.attackAnim = Math.max(caster.attackAnim, 320);
      particles.push({x:caster.x,y:caster.y, life:400, ring:true, maxLife:400, maxR:60, color:"#7ad48a"});
      if(caster===player) floatText(caster.x, caster.y-50, "¡LEVANTAR ESQUELETOS!", null);
      break;
    }

    case "summon_golem": {
      // Nigromante — Crear Golem: único (spawnOrRenewGolem lo renueva/reposiciona si ya existe
      // en vez de duplicarlo). No disponible transformado (sección 6).
      if(caster.nigroDemonForm){ if(caster===player) floatText(caster.x, caster.y-40, "No disponible transformado", null); break; }
      spawnOrRenewGolem(caster);
      caster.nigroCastKind = "golem";
      caster.attackAnim = Math.max(caster.attackAnim, 320);
      particles.push({x:caster.x,y:caster.y, life:400, ring:true, maxLife:400, maxR:60, color:"#8fae7a"});
      if(caster===player) floatText(caster.x, caster.y-50, "¡CREAR GOLEM!", null);
      break;
    }

    case "condemned_plague": {
      // Nigromante — Plaga de los Condenados: maldice un área (DoT + más daño recibido); si un
      // maldito muere, contagia a los cercanos (nigromantePlagueDeathSpread), con un tope de
      // generaciones (maxGen) que "Peste Negra" sube en 1 -nunca una cadena infinita-. Sigue
      // disponible incluso transformado (sección 6).
      const tx = caster.x + caster.fx*(sk.range*AREA), ty = caster.y + caster.fy*(sk.range*AREA);
      const radius = sk.radius*AREA;
      const defPct = sk.defTakenPct + (tSkill.flags.defTakenBonusPct||0);
      const durationMs = sk.duration*DUR;
      const maxGen = 2 + (tSkill.flags.blackPlague?1:0);
      for(const e of enemies){
        if(!e.alive || Math.hypot(e.x-tx,e.y-ty) > radius) continue;
        nigromanteApplyCurse(e, caster, dmg*0.35, defPct, 0, durationMs, maxGen);
      }
      // Transformado (Encarnación del Abismo), el cast usa la pose real "soulFireCast" en vez
      // de caer en el ataque básico genérico -antes nigroCastKind nunca valía "demonSoulFire",
      // así que esa pose (arte real, limpia) quedaba sin usar-. Sin cambiar en nada la lógica
      // de la habilidad: mismo daño, mismo alcance, misma duración, transformado o no.
      caster.nigroCastKind = caster.nigroDemonForm ? "demonSoulFire" : "plague";
      caster.attackAnim = Math.max(caster.attackAnim, 320);
      particles.push({x:tx,y:ty, life:460, ring:true, maxLife:460, maxR:radius, color:"#50e68c"});
      // arte real de la plaga (3 frames embebidos que antes no se usaban), solo visual: ground1
      // (mucho más ancho que ground2/ground3) se muestra una sola vez como estallido inicial,
      // y ground2/ground3 quedan como la niebla que persiste en el suelo.
      if(NIGRO_PLAGUE_FX_READY.ground1) vfxSprite("nigroPlagueBurst", 0, tx, ty+radius*0.4, radius*1.05, 260, null, 0.05, caster.fx<-0.12, 0.85, 0);
      vfxSprite("nigroPlague", 0, tx, ty+radius*0.4, radius*0.95, 1500, null, 0.18, caster.fx<-0.12, 0.85, 5);
      // destello decorativo (arte real, no es un proyectil de verdad -no aplica daño ni viaja
      // con lógica propia-) sobre la mano del Nigromante transformado al momento del cast.
      if(caster.nigroDemonForm && NIGRO_DEMON_READY.soulFireProj) vfxSprite("nigroSoulFireFlare", 0, caster.x+caster.fx*22, caster.y-30, 34, 320, caster, 0.15, caster.fx<-0.12, 0.5, 0);
      if(caster===player) floatText(tx, ty-30, "¡PLAGA DE LOS CONDENADOS!", null);
      break;
    }

    case "abyss_incarnation_ult": {
      // Nigromante — Encarnación del Abismo: ver enterAbyssForm/updateNigromanteDemonForm/
      // exitAbyssForm para el ciclo de vida completo (absorción del ejército, transformación,
      // restauración automática al terminar).
      enterAbyssForm(caster, sk);
      break;
    }

    case "glitch_delay_nova": {
      // Axiom — Error 404: marca una zona; tras una demora, colapsa (daño + ralentización).
      const tx = caster.x + caster.fx*(sk.range*AREA), ty = caster.y + caster.fy*(sk.range*AREA);
      axiomZones.push({
        x:tx, y:ty, radius:sk.radius*AREA, timer:sk.delay, mode:"delay", exploded:false,
        dmg, slow:sk.slow, slowDur:sk.slowDur, src:caster, bannerText:"ERROR 404"
      });
      if(caster===player) floatText(tx, ty-30, "ERROR 404", null);
      drawAxiomVfxBurst(tx, ty, "err404");
      // Talento "Eco de Falla": un segundo colapso, más débil, sobre el mismo punto poco
      // después del primero (reusa el mismo mecanismo de zona con demora que ya existe).
      const echoPct = tSkill.flags.err404Echo;
      if(echoPct){
        axiomZones.push({
          x:tx, y:ty, radius:(sk.radius*AREA)*0.75, timer:sk.delay+450, mode:"delay", exploded:false,
          dmg: dmg*echoPct, slow:sk.slow*0.7, slowDur:sk.slowDur*0.6, src:caster, bannerText:null
        });
      }
      break;
    }

    case "overwrite_nova": {
      // Axiom — Sobrescribir: infecta al enemigo más cercano con código corrupto y el
      // contagio salta a los enemigos cercanos (más saltos y más daño al mejorar la
      // habilidad, vía JUMP_BONUS/POWER — mismo sistema que usa "Cadena de Relámpago").
      // Cada infectado además sigue sangrando código corrupto un rato (bleedTimer/bleedDmg).
      let cur = nearestEnemyTo(caster, sk.range||300);
      const hitList = [];
      let curDmg = dmg;
      let px_ = caster.x, py_ = caster.y-14;
      // Talentos "Ejecución Forzada"/"Ejecución Absoluta": umbral y multiplicador de ejecución
      // más altos (topeados para que nunca se vuelva un one-shot garantizado sin importar la vida).
      const execPct = Math.min(0.5, (sk.executePct||0) + (tSkill.flags.executePctBonus||0));
      const execMult = Math.min(4, (sk.executeMult||1) + (tSkill.flags.executeMultBonus||0));
      for(let i=0;i<(sk.jumps+JUMP_BONUS) && cur;i++){
        const isBoss = cur.rank==="jefe" || cur.rank==="subjefe" || cur.rank==="elite";
        let d2 = curDmg;
        if(!isBoss && (cur.hp/cur.maxHp) <= execPct) d2 *= execMult;
        damageEnemy(cur, d2, {src:caster});
        cur.bleedTimer = Math.max(cur.bleedTimer||0, (sk.bleedDur||2600)*DUR);
        cur.bleedDmg = Math.max(cur.bleedDmg||0, curDmg*(sk.bleedDmgMult||0.3));
        pushChainBolt(px_, py_, cur.x, cur.y, 16, 380);
        drawAxiomVfxBurst(cur.x, cur.y, "overwrite");
        hitList.push(cur);
        px_ = cur.x; py_ = cur.y;
        curDmg *= sk.falloff;
        let next=null, bd=Infinity;
        for(const e of enemies){
          if(!e.alive || hitList.includes(e)) continue;
          const d = distance(cur,e);
          if(d < (sk.jumpRange*AREA) && d < bd){ bd=d; next=e; }
        }
        cur = next;
      }
      if(caster===player) floatText(caster.x, caster.y-50, "SOBRESCRIBIR", null);
      break;
    }

    case "teleport_blink": {
      // Axiom — Teletransporte: se desplaza al instante en la dirección en la que mira.
      // Invulnerable solo durante la breve transición (no durante toda la animación), tal
      // como pide el diseño original. A niveles altos el cooldown cae hasta casi 0 (ver
      // masteryTeleportCdMult, usado en vez del masteryCdMult genérico solo para esta skill).
      drawAxiomVfxBurst(caster.x, caster.y, "teleport_out");
      caster.x += caster.fx*(sk.range*AREA);
      caster.y += caster.fy*(sk.range*AREA);
      clampToArena(caster);
      resolveWallCollision(caster);
      caster.invulnTimer = Math.max(caster.invulnTimer||0, sk.invulnDur||250);
      drawAxiomVfxBurst(caster.x, caster.y, "teleport_in");
      particles.push({x:caster.x,y:caster.y, life:260, ring:true, maxLife:260, maxR:36, color:"#5ac8ff"});
      // Talento "Recipiente Espejo"/"Blindaje de Tránsito": pequeño escudo al llegar -Axiom
      // sobrevive evitando el golpe, no volviéndose un tanque, por eso es un escudo chico y no
      // un buff de defensa permanente-.
      const shieldPct = tSkill.flags.teleportShieldPct;
      if(shieldPct) caster.shield = Math.max(caster.shield||0, caster.maxHp*shieldPct);
      break;
    }

    case "force_quit_ult": {
      // Axiom — Force Quit (definitiva): durante 4 segundos (colores invertidos en toda la
      // pantalla) nadie salvo Axiom puede moverse ni actuar -enemigos Y aliados incluidos- (ver
      // los chequeos de axiomFreezeTimer en updateAllies, el bucle de enemigos, triggerBasic y
      // castAbility). El golpe de daño en área recién se aplica al TERMINAR el congelamiento
      // (ver el bloque de axiomFreezeTimer<=0 en update()), centrado en dónde haya quedado
      // Axiom en ese momento -no en su posición al lanzarla-.
      const freezeDur = sk.freezeDuration || 4000;
      axiomForceQuitFlash = freezeDur; // inversión de color de toda la pantalla durante el congelamiento, ver render()
      axiomFreezeTimer = freezeDur;
      axiomFreezeCaster = caster;
      axiomForceQuitPending = {dmg, radius:sk.radius*AREA, eliteMult:sk.eliteMult};
      if(caster===player) showBanner("FORCE QUIT");
      drawAxiomVfxBurst(caster.x, caster.y, "forcequit");
      // Talento "Resistencia Absoluta" (Maestría Límites): defensa extra mientras dura el
      // congelamiento -Axiom sigue pudiendo moverse/atacar durante Force Quit, así que esto sí
      // importa, a diferencia de un buff de defensa que no se pudiera usar-.
      const fqDef = tSkill.flags.forceQuitDefBonus;
      if(fqDef){
        caster.buffDefMult = Math.min(caster.buffDefMult||1, 1-fqDef);
        caster.buffTimer = Math.max(caster.buffTimer||0, freezeDur);
      }
      break;
    }

    case "nova": {
      const col = elementColor(sk, caster.cls.glow);
      for(const e of enemies){
        if(!e.alive) continue;
        if(distance(caster,e) <= (sk.radius*AREA)){
          damageEnemy(e, dmg, {burn:sk.burn, slow:sk.slow, slowDur:(sk.slowDur*DUR), stun:sk.stun, knockback:sk.knockback, src:caster});
        }
      }
      particles.push({x:caster.x,y:caster.y, life:360, ring:true, maxLife:360, maxR:(sk.radius*AREA), color:col});
      if(sk.spin){ particles.push({x:caster.x,y:caster.y, life:420, maxLife:420, spin:true, radius:(sk.radius*AREA)*0.85, color:"#e8eef4"}); }
      if(sk.groundEffect){
        for(let i=0;i<8;i++) particles.push({x:caster.x+(Math.random()-0.5)*(sk.radius*AREA), y:caster.y+(Math.random()-0.5)*(sk.radius*AREA)*0.6,
          vx:(Math.random()-0.5)*40, vy:-20-Math.random()*30, life:500, color:"#8a6a4a"});
      }
      if(sk.cataclysm){
        let n=0;
        for(const e of enemies){
          if(n>=3 || !e.alive) continue;
          if(distance(caster,e) <= (sk.radius*AREA)){ particles.push({x:caster.x,y:caster.y,x2:e.x,y2:e.y, life:260, bolt:true, color:"#ffe36a"}); n++; }
        }
        particles.push({x:caster.x,y:caster.y, life:420, maxLife:420, spin:true, radius:(sk.radius*AREA)*0.6, color:"#9fe3ff"});
      }
      if(sk.selfBuff){ caster.buffDefMult = 1-sk.selfBuff.def; caster.buffTimer = Math.max(caster.buffTimer, sk.selfBuff.duration); }
      break;
    }

    case "shield": {
      caster.shield = caster.maxHp * (sk.shieldPct*POWER);
      caster.shieldTimer = (sk.duration*DUR);
      const col = elementColor(sk, "#8fd0ff");
      particles.push({x:caster.x,y:caster.y, life:400, ring:true, maxLife:400, maxR:34, color:col});
      break;
    }

    case "dash": {
      const dx=caster.fx, dy=caster.fy;
      const dist = (sk.range*AREA);
      const steps = 8;
      for(let i=1;i<=steps;i++){
        const px_ = caster.x+dx*dist*(i/steps), py_ = caster.y+dy*dist*(i/steps);
        for(const e of enemies){
          if(!e.alive) continue;
          if(Math.hypot(e.x-px_,e.y-py_) < e.radius+26){ damageEnemy(e, dmg, {knockback:sk.knockback, stun:sk.stun, src:caster}); }
        }
      }
      caster.x += dx*dist; caster.y += dy*dist;
      clampToArena(caster);
      particles.push({x:caster.x,y:caster.y, life:220, slash:true, color:caster.cls.glow});
      break;
    }

    case "projectile": {
      const col = elementColor(sk, "#8fd0ff");
      projectiles.push({x:caster.x,y:caster.y-14, vx:caster.fx*380, vy:caster.fy*380, dmg, life:1400, radius:10, color:col,
        pierce:sk.pierce, slow:sk.slow, burn:sk.burn, src:caster, hitSet:new Set()});
      break;
    }

    case "chain": {
      let cur = nearestEnemyTo(caster, 340);
      const hitList = [];
      let curDmg = dmg;
      let px_ = caster.x, py_ = caster.y-14;
      const chainTier = tierOf(allocLevel(mastery));
      const boltThickness = 26 + chainTier*14;     // más grueso e imponente cuanto más talento
      const sparkSize = 46 + chainTier*20;
      const electrifiedMs = 500 + chainTier*90;
      for(let i=0;i<(sk.jumps+JUMP_BONUS) && cur;i++){
        damageEnemy(cur, curDmg, {src:caster});
        pushChainBolt(px_, py_, cur.x, cur.y, boltThickness, 420);
        pushSpark("impacto", cur.x, cur.y, sparkSize, 340);
        cur.electrifiedTimer = electrifiedMs; cur.electrifiedSize = sparkSize;
        hitList.push(cur);
        px_ = cur.x; py_ = cur.y;
        curDmg *= sk.falloff;
        let next=null, bd=Infinity;
        for(const e of enemies){
          if(!e.alive || hitList.includes(e)) continue;
          const d = distance(cur,e);
          if(d < (sk.jumpRange*AREA) && d < bd){ bd=d; next=e; }
        }
        // Talento al máximo (nivel 9-10): "Ruptura" — al llegar al último salto posible de la
        // cadena, el objetivo final recibe una descarga extra (doble efecto), con un anillo
        // eléctrico mucho más grande. Inspirado en el estado E4 de referencia.
        if(!next && chainTier>=4 && cur && cur.alive){
          const ruptureTarget = cur, ruptureDmg = curDmg*0.9;
          setTimeout(()=>{ if(ruptureTarget.alive) damageEnemy(ruptureTarget, ruptureDmg, {src:caster}); }, 140);
          pushSpark("impacto", cur.x, cur.y, sparkSize*1.6, 460);
          for(let s=0;s<10;s++){
            const a = Math.random()*Math.PI*2;
            particles.push({x:cur.x, y:cur.y, vx:Math.cos(a)*70, vy:Math.sin(a)*70-16, life:340, color:"#ffe36a"});
          }
        }
        cur = next;
      }
      break;
    }

    case "bleed_hit": {
      const t = nearestEnemyTo(caster, caster.cls.basicRange+70);
      if(t){
        damageEnemy(t, dmg, {src:caster, bleed:true, bleedDur:(sk.bleedDur*DUR)});
        tieredBurstVFX(t.x, t.y, 30, allocLevel(mastery), "#c62828", "#ff6a5a");
        pushAsesinoFx("corte_sangrante", "corte", t.x, t.y, 90, 1000, caster.fx<0);
      }
      break;
    }

    case "double_hit": {
      const t = nearestEnemyTo(caster, caster.cls.basicRange+50);
      if(t){
        damageEnemy(t, dmg, {src:caster});
        damageEnemy(t, dmg, {src:caster});
        particles.push({x:t.x-6,y:t.y-4, life:150, slash:true, color:caster.cls.glow});
        particles.push({x:t.x+6,y:t.y+4, life:230, slash:true, color:caster.cls.glow});
      }
      break;
    }

    case "team_heal": {
      for(const h of heroes){
        if(!h.alive) continue;
        const amt = h.maxHp*(sk.healPct*POWER);
        h.hp = Math.min(h.maxHp, h.hp+amt);
        floatText(h.x, h.y-30, "+"+Math.round(amt), "heal");
      }
      particles.push({x:caster.x,y:caster.y, life:400, ring:true, maxLife:400, maxR:80, color:"#8effb4"});
      break;
    }

    case "sacrifice": {
      let target=null, lowRatio=1;
      for(const h of heroes){
        if(h===caster || !h.alive) continue;
        const r = h.hp/h.maxHp;
        if(r < lowRatio){ lowRatio=r; target=h; }
      }
      if(!target) target = caster;
      const selfCost = caster.maxHp*sk.selfCostPct;
      caster.hp = Math.max(1, caster.hp-selfCost);
      const amt = target.maxHp*(sk.healPct*POWER);
      target.hp = Math.min(target.maxHp, target.hp+amt);
      floatText(target.x, target.y-30, "+"+Math.round(amt), "heal");
      if(caster===player || target===player) floatText(caster.x, caster.y-30, "-"+Math.round(selfCost));
      particles.push({x:target.x,y:target.y, life:400, ring:true, maxLife:400, maxR:60, color:"#ff8fb0"});
      break;
    }

    case "team_regen": {
      for(const h of heroes){
        if(!h.alive) continue;
        h.regenTimer = Math.max(h.regenTimer||0, (sk.duration*DUR));
        h.regenPerSec = h.maxHp*(sk.regenPct*POWER);
      }
      particles.push({x:caster.x,y:caster.y, life:400, ring:true, maxLife:400, maxR:90, color:"#8effb4"});
      break;
    }

    case "team_buff": {
      for(const h of heroes){
        if(!h.alive) continue;
        const amt = h.maxHp*(sk.healPct*POWER);
        h.hp = Math.min(h.maxHp, h.hp+amt);
        h.regenTimer = Math.max(h.regenTimer||0, (sk.regenDuration*DUR));
        h.regenPerSec = h.maxHp*(sk.regenPct*POWER);
        h.buffDmgMult = sk.dmgMult;
        h.buffDefMult = 1-sk.defBonus;
        h.buffTimer = Math.max(h.buffTimer, (sk.duration*DUR));
        floatText(h.x, h.y-30, "+"+Math.round(amt), "heal");
      }
      particles.push({x:caster.x,y:caster.y, life:600, ring:true, maxLife:600, maxR:130, color:"#ffe08a"});
      particles.push({x:caster.x,y:caster.y, life:600, maxLife:600, spin:true, radius:110, color:"#ffe08a"});
      break;
    }

    case "fortress": {
      for(const e of enemies){
        if(!e.alive) continue;
        if(distance(caster,e) <= (sk.radius*AREA)){
          damageEnemy(e, dmg, {stun:sk.stun, pull:sk.pull, src:caster});
        }
      }
      caster.buffDefMult = 1-sk.selfDef;
      caster.buffTimer = Math.max(caster.buffTimer, (sk.duration*DUR));
      for(const h of heroes){
        if(h===caster || !h.alive) continue;
        if(distance(caster,h) <= (sk.radius*AREA)){
          h.buffDefMult = Math.min(h.buffDefMult||1, 1-sk.allyDef);
          h.buffTimer = Math.max(h.buffTimer, (sk.duration*DUR));
        }
      }
      particles.push({x:caster.x,y:caster.y, life:500, ring:true, maxLife:500, maxR:(sk.radius*AREA), color:"#ffcf5c"});
      particles.push({x:caster.x,y:caster.y, life:500, maxLife:500, spin:true, radius:(sk.radius*AREA)*0.72, color:"#ffcf5c"});
      break;
    }

    case "buff": {
      caster.buffDmgMult = sk.dmgMult; caster.buffAtkSpeedMult = sk.atkSpeedMult;
      caster.buffLifesteal = sk.lifesteal||0; caster.buffBleedOnHit = sk.bleedOnHit||false;
      caster.buffTimer = (sk.duration*DUR);
      particles.push({x:caster.x,y:caster.y, life:400, ring:true, maxLife:400, maxR:50, color:"#ff5a3d"});
      break;
    }

    case "spin_channel": {
      const dur = (sk.duration*DUR) * (caster.spinDurationMult||1);
      caster.spinTimer = dur; caster.spinMaxTimer = dur;
      caster.spinRadius = (sk.radius*AREA); caster.spinTick = 0; caster.spinTickInterval = sk.tick;
      caster.spinDmg = dmg;
      caster.spinTier = allocLevel(mastery)>=7 ? 4 : allocLevel(mastery)>=4 ? 3 : allocLevel(mastery)>=2 ? 2 : 1;
      tieredBurstVFX(caster.x, caster.y, (sk.radius*AREA), allocLevel(mastery), "#9fe3ff", "#cdeeff");
      break;
    }

    case "charge_drag": {
      const dx=caster.fx, dy=caster.fy, dist=(sk.range*AREA), steps=8;
      let hitEnemy = null;
      for(let i=1;i<=steps && !hitEnemy;i++){
        const px_=caster.x+dx*dist*(i/steps), py_=caster.y+dy*dist*(i/steps);
        for(const e of enemies){
          if(!e.alive) continue;
          if(Math.hypot(e.x-px_,e.y-py_) < e.radius+26){ hitEnemy=e; break; }
        }
      }
      // breve destello de carga antes de la estampida
      particles.push({x:caster.x,y:caster.y, life:180, ring:true, maxLife:180, maxR:34, color:"#9fe3ff"});
      caster.x += dx*dist; caster.y += dy*dist;
      clampToArena(caster);
      particles.push({x:caster.x,y:caster.y, life:260, slash:true, color:"#9fe3ff"});
      particles.push({x:caster.x-dx*40,y:caster.y-dy*40, life:280, bolt:true, x2:caster.x, y2:caster.y, color:"#cdeeff"});
      tieredBurstVFX(caster.x, caster.y, 40, allocLevel(mastery), "#9fe3ff", "#cdeeff");
      if(caster.classKey==="tanque"){ caster.dashFxTimer = 1050; caster.dashFxFlip = dx<0; }
      // Talento "Imparable": mientras dura el impacto de la Embestida, reduce el daño recibido
      // (breve ventana de resistencia durante la carga, no un buff permanente).
      const chargeDef = tSkill.flags.chargeDefBonus;
      if(chargeDef){
        caster.buffDefMult = Math.min(caster.buffDefMult||1, 1-chargeDef);
        caster.buffTimer = Math.max(caster.buffTimer||0, 500);
      }
      if(hitEnemy){
        damageEnemy(hitEnemy, dmg, {src:caster, stun:(sk.stun*DUR)});
        hitEnemy.draggedBy = caster; hitEnemy.dragTimer = (sk.dragTime*DUR);
      }
      break;
    }

    case "war_cry": {
      // Talento "Armadura Viviente": defensa extra si el Grito de Guerra se lanza con poca vida.
      const lowHpBonus = (caster.hp < caster.maxHp*0.3) ? (tSkill.flags.lowHpDefBonus||0) : 0;
      caster.buffDefMult = Math.min(caster.buffDefMult||1, 1-sk.defBonus-lowHpBonus);
      caster.buffTimer = Math.max(caster.buffTimer, (sk.duration*DUR));
      // Talento "Grito de Batalla"/"Grito Eterno": extiende la duración del próximo Torbellino.
      const spinExtend = tSkill.flags.warcryExtendsSpinPct;
      if(spinExtend) caster.spinDurationMult = Math.max(caster.spinDurationMult||1, 1+spinExtend);
      // Vida máxima temporal: se retira el bonus anterior (si lo hubiera) antes de aplicar el nuevo,
      // para que recastear el grito no acumule vida infinitamente.
      if(caster.pendingHpBonus){ caster.maxHp -= caster.pendingHpBonus; caster.hp = Math.min(caster.hp, caster.maxHp); caster.pendingHpBonus = 0; }
      const hpBonus = Math.round(caster.maxHp * (sk.hpBonusPct||0) * POWER);
      caster.maxHp += hpBonus; caster.hp += hpBonus; caster.pendingHpBonus = hpBonus;
      // Crecimiento visual: el caballero se agiganta levemente mientras dura el grito
      caster.growTimer = (sk.duration*DUR);
      caster.growMaxTimer = (sk.duration*DUR);
      caster.growScale = sk.growScale||1;
      caster.sigilTimer = caster.sigilMaxTimer = (sk.duration*DUR);
      caster.sigilRadius = 46; caster.sigilColor = "#8fd0ff"; caster.sigilTier = tierOf(allocLevel(mastery));
      particles.push({x:caster.x,y:caster.y, life:450, ring:true, maxLife:450, maxR:56, color:"#8fd0ff"});
      tieredBurstVFX(caster.x, caster.y, 56, allocLevel(mastery), "#8fd0ff", "#bfe0ff");
      floatText(caster.x, caster.y-42, "🛡", "heal");
      if(caster===player) floatText(caster.x, caster.y-58, "+VIDA MÁX", "heal");
      break;
    }

    case "taunt_provoke": {
      let taunted = 0;
      for(const e of enemies){
        if(!e.alive) continue;
        if(distance(caster,e) <= (sk.radius*AREA)){ e.tauntedBy = caster; e.tauntTimer = (sk.duration*DUR); taunted++; }
      }
      if(caster.stats) caster.stats.enemiesControlled += taunted;
      caster.buffDefMult = Math.min(caster.buffDefMult||1, 1-sk.defBonus);
      caster.buffTimer = Math.max(caster.buffTimer, (sk.duration*DUR));
      const hpBonus = Math.round(caster.maxHp*sk.hpBonusPct);
      caster.maxHp += hpBonus; caster.hp += hpBonus; caster.pendingHpBonus += hpBonus;
      caster.spinDurationMult = sk.spinMult;
      caster.colossalTimer = (sk.duration*DUR);
      caster.sigilTimer = caster.sigilMaxTimer = (sk.duration*DUR);
      caster.sigilRadius = (sk.radius*AREA)*0.5; caster.sigilColor = "#ff5a3d"; caster.sigilTier = tierOf(allocLevel(mastery));
      particles.push({x:caster.x,y:caster.y, life:700, ring:true, maxLife:700, maxR:(sk.radius*AREA), color:"#ff5a3d"});
      tieredBurstVFX(caster.x, caster.y, (sk.radius*AREA)*0.5, allocLevel(mastery), "#ff5a3d", "#ffb08a");
      if(caster===player) floatText(caster.x, caster.y-52, "¡PROVOCACIÓN!", "crit");
      break;
    }

    case "fire_wall": {
      const tx = caster.x + caster.fx*(sk.range*AREA), ty = caster.y + caster.fy*(sk.range*AREA);
      const twTier = allocLevel(mastery)>=7 ? 4 : allocLevel(mastery)>=4 ? 3 : allocLevel(mastery)>=2 ? 2 : 1;
      fireWalls.push({x:tx, y:ty, innerR:(sk.innerR*AREA), outerR:(sk.outerR*AREA), timer:(sk.duration*DUR), maxTimer:(sk.duration*DUR), tick:0, tickInterval:sk.tick, dmg, src:caster, tier:twTier});
      particles.push({x:tx,y:ty, life:500, warnRing:true, maxR:(sk.outerR*AREA), color:"#ff6a3d"});
      // Talento "Corazón Ígneo": mientras el muro esté en pie, +daño general (buff temporal
      // de siempre, se revierte solo cuando expira -y se renueva si se relanza el muro-).
      const wallDmgBonus = tSkill.flags.wallEmpowersAll;
      if(wallDmgBonus){
        caster.buffDmgMult = Math.max(caster.buffDmgMult||1, 1+wallDmgBonus);
        caster.buffTimer = Math.max(caster.buffTimer||0, sk.duration*DUR);
      }
      break;
    }

    case "frost_nova": {
      // Talento "Escarcha Paralizante": un breve aturdimiento real (no solo ralentización) muy
      // cerca del centro de la nova.
      const stunMs = tSkill.flags.frostNovaStunMs;
      const stunR = (sk.radius*AREA)*0.45;
      for(const e of enemies){
        if(!e.alive) continue;
        const d = distance(caster,e);
        if(d <= (sk.radius*AREA)){
          damageEnemy(e, dmg, {slow:sk.freeze, slowDur:(sk.freezeDur*DUR), stun: (stunMs && d<=stunR) ? stunMs : undefined, src:caster});
        }
      }
      frostNovaVFX(caster, (sk.radius*AREA), allocLevel(mastery));
      break;
    }

    case "elemental_storm": {
      // Nova de hielo #1 (inmediata): daño + congelamiento real en el área, no solo cosmético
      for(const e of enemies){
        if(!e.alive) continue;
        if(distance(caster,e) <= (sk.radius*AREA)){
          damageEnemy(e, dmg, {burn:sk.burn, slow:sk.slow, slowDur:2000, src:caster});
          damageEnemy(e, dmg*sk.novaDmgMult, {slow:sk.novaFreeze, slowDur:(sk.novaFreezeDur*DUR), src:caster});
        }
      }
      cataclysmVFX(caster, (sk.radius*AREA), 8); // la ulti siempre se ve al máximo nivel visual
      frostNovaVFX(caster, (sk.radius*AREA)*0.85, 8); // la ulti siempre se ve al máximo nivel visual
      const stormDur = (sk.duration*DUR);
      caster.stormTimer = stormDur; caster.stormMaxTimer = stormDur;
      caster.stormTick = 0; caster.stormTickInterval = sk.strikeInterval;
      caster.stormRadius = (sk.radius*AREA); caster.stormDmg = dmg*sk.strikeDmgMult;
      // 2 novas de hielo más, cada 1 segundo exacto (van 3 en total, la primera fue inmediata)
      caster.stormNovaLeft = sk.novaCount - 1;
      caster.stormNovaInterval = 1000;
      caster.stormNovaTimer = caster.stormNovaInterval;
      caster.stormNovaDmg = dmg*sk.novaDmgMult;
      caster.stormNovaFreeze = sk.novaFreeze;
      caster.stormNovaFreezeDur = (sk.novaFreezeDur*DUR);
      // Armadura de fuego: bonus real de defensa mientras dura el Cataclismo (se apoya en el
      // sistema de buffs ya existente, así se limpia solo cuando expira buffTimer).
      caster.buffDefMult = Math.min(caster.buffDefMult||1, 1-sk.armorDefBonus-(tSkill.flags.ultDefBonus||0));
      caster.buffTimer = Math.max(caster.buffTimer, stormDur);
      if(caster===player) floatText(caster.x, caster.y-52, "¡CATACLISMO!", "crit");
      break;
    }

    case "team_heal_aoe": {
      const healPassiveMult = 1 + passiveSum(caster.classKey,"heal_mult");
      for(const h of heroes){
        if(!h.alive || distance(caster,h) > (sk.radius*AREA)) continue;
        const amt = h.maxHp*(sk.healPct*POWER)*healPassiveMult;
        trackHeal(caster, h, amt);
        applyHealOverheal(caster, h, amt);
        floatText(h.x, h.y-30, "+"+Math.round(amt), "heal");
        if(newfxReady('holyHealBurst')) vfxSprite("fxHolyHealBurst", 0, h.x, h.y+2, 96, 480, h, 0, false, 0.95, 8);
      }
      particles.push({x:caster.x,y:caster.y, life:600, ring:true, maxLife:600, maxR:(sk.radius*AREA), color:"#7dffa0"});
      tieredBurstVFX(caster.x, caster.y, (sk.radius*AREA)*0.6, allocLevel(mastery), "#7dffa0", "#c8ffd8");
      break;
    }

    case "team_atk_buff": {
      let buffed = 0;
      for(const h of heroes){
        if(!h.alive || distance(caster,h) > (sk.radius*AREA)) continue;
        h.buffDmgMult = Math.max(h.buffDmgMult||1, 1+sk.dmgBonus);
        h.buffTimer = Math.max(h.buffTimer, (sk.duration*DUR));
        h.atkAuraTimer = (sk.duration*DUR);
        buffed++;
      }
      if(caster.stats && buffed>0) caster.stats.buffsGranted += buffed;
      caster.sigilTimer = caster.sigilMaxTimer = (sk.duration*DUR);
      caster.sigilRadius = (sk.radius*AREA)*0.6; caster.sigilColor = "#ff4a3d"; caster.sigilTier = tierOf(allocLevel(mastery));
      particles.push({x:caster.x,y:caster.y, life:600, ring:true, maxLife:600, maxR:(sk.radius*AREA), color:"#ff4a3d"});
      tieredBurstVFX(caster.x, caster.y, (sk.radius*AREA)*0.6, allocLevel(mastery), "#ff4a3d", "#ffb08a");
      // Talento "Ola de Consagración" (Exaltación): pequeña onda ofensiva secundaria, la
      // Sanadora sigue sin ser una atacante -es solo un extra sobre el buff, no su daño principal-.
      const novaPct = tSkill.flags.offensiveNovaPct;
      if(novaPct){
        const novaDmg = caster.baseDmg * runStats.dmgMult * novaPct;
        for(const e of enemies){
          if(e.alive && distance(caster,e) <= (sk.radius*AREA)) damageEnemy(e, novaDmg, {src:caster});
        }
      }
      break;
    }

    case "team_shield_buff": {
      let buffed = 0;
      // "Muralla Viviente": defensa extra para los aliados protegidos (no para la Sanadora en
      // sí, que ya tiene su propia rama Bastión para eso vía def_add genérico).
      const extraDef = tSkill.flags.shieldDefBonus||0;
      for(const h of heroes){
        if(!h.alive || distance(caster,h) > (sk.radius*AREA)) continue;
        h.buffDefMult = Math.min(h.buffDefMult||1, 1-sk.defBonus-extraDef);
        h.buffTimer = Math.max(h.buffTimer, (sk.duration*DUR));
        h.shield = Math.max(h.shield, h.maxHp*(sk.shieldPct*POWER));
        h.shieldTimer = Math.max(h.shieldTimer, (sk.duration*DUR));
        h.shieldAuraTimer = (sk.duration*DUR);
        buffed++;
      }
      if(caster.stats && buffed>0) caster.stats.buffsGranted += buffed;
      caster.sigilTimer = caster.sigilMaxTimer = (sk.duration*DUR);
      caster.sigilRadius = (sk.radius*AREA)*0.6; caster.sigilColor = "#5fb0ff"; caster.sigilTier = tierOf(allocLevel(mastery));
      particles.push({x:caster.x,y:caster.y, life:600, ring:true, maxLife:600, maxR:(sk.radius*AREA), color:"#5fb0ff"});
      tieredBurstVFX(caster.x, caster.y, (sk.radius*AREA)*0.6, allocLevel(mastery), "#5fb0ff", "#bfe0ff");
      break;
    }

    case "team_grand_buff": {
      let buffed = 0;
      const healPassiveMult2 = 1 + passiveSum(caster.classKey,"heal_mult");
      for(const h of heroes){
        if(!h.alive || distance(caster,h) > (sk.radius*AREA)) continue;
        const amt = h.maxHp*(sk.healPct*POWER)*healPassiveMult2;
        trackHeal(caster, h, amt);
        applyHealOverheal(caster, h, amt);
        h.buffDmgMult = Math.max(h.buffDmgMult||1, 1+sk.dmgBonus);
        h.buffDefMult = Math.min(h.buffDefMult||1, 1-sk.defBonus-(tSkill.flags.ultDefBonus||0));
        h.buffTimer = Math.max(h.buffTimer, (sk.duration*DUR));
        h.atkAuraTimer = (sk.duration*DUR);
        h.shieldAuraTimer = (sk.duration*DUR);
        floatText(h.x, h.y-30, "+"+Math.round(amt), "heal");
        if(newfxReady('holyHealBurst')) vfxSprite("fxHolyHealBurst", 0, h.x, h.y, 96, 480, h, 0, false, 0.95, 8);
        buffed++;
      }
      if(caster.stats && buffed>0) caster.stats.buffsGranted += buffed;
      caster.sigilTimer = caster.sigilMaxTimer = (sk.duration*DUR);
      caster.sigilRadius = (sk.radius*AREA)*0.55; caster.sigilColor = "#c88cff"; caster.sigilTier = tierOf(allocLevel(mastery));
      particles.push({x:caster.x,y:caster.y, life:800, ring:true, maxLife:800, maxR:(sk.radius*AREA), color:"#c88cff"});
      tieredBurstVFX(caster.x, caster.y, (sk.radius*AREA)*0.55, allocLevel(mastery), "#c88cff", "#ffcf5c");
      if(caster===player) floatText(caster.x, caster.y-52, "¡BENDICIÓN SUPREMA!", "crit");
      break;
    }

    case "triple_hit": {
      const t = nearestEnemyTo(caster, caster.cls.basicRange+50);
      if(t){
        damageEnemy(t, dmg, {src:caster});
        particles.push({x:t.x-6,y:t.y-8, life:150, slash:true, color:"#8fd0ff"});
        damageEnemy(t, dmg, {src:caster});
        particles.push({x:t.x,y:t.y-4, life:190, slash:true, color:"#ff9a4d"});
        // Talento "Golpe de Gracia"/"Ejecutor Nato": el golpe final es mucho más letal contra
        // enemigos ya muy heridos.
        const executeBonus = (t.hp/t.maxHp <= 0.30) ? (tSkill.flags.executeLowHpBonus||0) : 0;
        damageEnemy(t, dmg*(sk.finalMult+executeBonus), {src:caster, forceCrit:true});
        particles.push({x:t.x+4,y:t.y, life:280, slash:true, color:"#ff3b3b"});
        tieredBurstVFX(t.x, t.y, 42, allocLevel(mastery), "#ff3b3b", "#ffb08a");
        pushAsesinoFx("triple_golpe", "combo", t.x, t.y, 95, 1200, caster.fx<0);
        if(caster===player) floatText(t.x, t.y-42, "¡TRIPLE GOLPE!", "crit");
      }
      break;
    }

    case "area_trap": {
      const tx = caster.x + caster.fx*(sk.range*AREA), ty = caster.y + caster.fy*(sk.range*AREA);
      // Cantidad de trampas escala con el talento invertido: 1 en tier1, hasta 4 en tier4 (máx).
      // Se reparten en abanico perpendicular a la dirección de lanzamiento, cubriendo un paso
      // más ancho cuanto más trampas se colocan.
      // Talento "Campo Minado"/"Campo de Caza": trampas adicionales por lanzamiento, sumadas a
      // las que ya otorga la maestría de la habilidad.
      const trapTier = Math.min(8, tierOf(allocLevel(mastery)) + Math.round(tSkill.flags.extraTrapCount||0));
      const perpX = -caster.fy, perpY = caster.fx;
      const spacing = 46;
      for(let i=0;i<trapTier;i++){
        const off = (i - (trapTier-1)/2) * spacing;
        const px = tx + perpX*off, py = ty + perpY*off;
        traps.push({x:px, y:py, radius:(sk.radius*AREA), chainRadius:(sk.chainRadius*AREA), dmg, timer:(sk.duration*DUR), armTime:280, src:caster, triggered:false, phase:0});
        tieredBurstVFX(px, py, (sk.radius*AREA)*0.7, allocLevel(mastery), "#7dffa0", "#c8ffd8");
        pushAsesinoFx("trampa", "desplegar", px, py, 80, 700, false);
      }
      break;
    }

    case "shadow_stealth": {
      caster.stealthTimer = (sk.stealthDuration*DUR);
      caster.stealthPending = true;
      caster.stealthSk = sk;
      tieredBurstVFX(caster.x, caster.y, 50, allocLevel(mastery), "#4a3a5a", "#9a6ac7");
      pushAsesinoFx("pestilencia", "sigilo", caster.x, caster.y, 100, 500, caster.fx<0);
      if(caster===player) floatText(caster.x, caster.y-50, "¡SIGILO!", "heal");
      break;
    }

    case "cone_slash": {
      // Tajo del Segador: corte horizontal amplio frente al personaje, golpea varios enemigos.
      // Con la Armadura de la Furia en Nivel 5+, el área se recorta -30% a cambio del +50% de
      // daño que ya se aplica por buffDmgMult (ver case "fury_armor").
      const furyArea = caster.furyArmorTimer>0 ? (caster.furyAreaMult||1) : 1;
      const range = sk.range*AREA*furyArea;
      const halfArc = sk.arc;
      const facing = Math.atan2(caster.fy, caster.fx);
      const slashTier = tierOf(allocLevel(mastery));
      const maxHits = 3 + slashTier; // atraviesa más objetivos cuanto más talento
      let hitCount = 0;
      for(const e of enemies){
        if(!e.alive || hitCount>=maxHits) continue;
        const d = distance(caster,e);
        if(d > range) continue;
        const ang = Math.atan2(e.y-caster.y, e.x-caster.x);
        let diff = Math.abs(ang-facing);
        if(diff>Math.PI) diff = Math.PI*2-diff;
        if(diff <= halfArc/2){
          damageEnemy(e, dmg, {src:caster, knockback:sk.knockback});
          hitCount++;
        }
      }
      const midx = caster.x+caster.fx*range*0.55, midy = caster.y+caster.fy*range*0.55;
      tieredBurstVFX(midx, midy, range*0.55, allocLevel(mastery), "#c62828", "#ff8a7a");
      particles.push({x:caster.x, y:caster.y-14, x2:caster.x+caster.fx*range, y2:caster.y+caster.fy*range, life:240, bolt:true, color:"#ff5c4a"});
      // Arco de tajo real (dibujado a mano) siguiendo el ángulo exacto del golpe.
      if(newfxReady('scytheSlash')) vfxSprite("fxScytheSlash", 0, caster.x+caster.fx*range*0.1, caster.y+caster.fy*range*0.1-6, Math.min(120, Math.max(60, range*0.65)), 260, null, 0, false, 0.5, 15, 0, 0, facing);
      // Talento alto (nivel 9-10): onda de choque corta después del golpe
      if(slashTier>=4){
        const shockX=caster.x, shockY=caster.y, shockR=range*0.75, shockDmg=dmg*0.4;
        setTimeout(()=>{
          for(const e of enemies){
            if(!e.alive) continue;
            if(distance({x:shockX,y:shockY},e) <= shockR) damageEnemy(e, shockDmg, {src:caster});
          }
          particles.push({x:shockX,y:shockY, life:420, ring:true, maxLife:420, maxR:shockR, color:"#ff5c4a"});
        }, 170);
      }
      break;
    }

    case "fury_armor": {
      // Armadura de la Furia — progresión de 6 niveles (spec Berserk/Segador Olvidado):
      // N1 activa + visual básico | N2 +30% reducción de daño y resistencia a control |
      // N3 +200% generación de Furia por golpe | N4 10% del daño recibido -> poder ofensivo |
      // N5 +50% daño/-30% área | N6 Tajo Final al terminar, pushback máximo, visual máximo.
      const flvl = allocLevel(mastery);
      // Talento "Me Niego a Morir"/"Muro de Furia": reducción de daño extra con vida crítica.
      const lowHpBonus = (caster.hp < caster.maxHp*0.3) ? (tSkill.flags.lowHpDefBonus||0) : 0;
      const dmgReduction = Math.min(0.75, (flvl>=2 ? Math.max(sk.defBonus, 0.30) : sk.defBonus) + lowHpBonus);
      caster.buffDefMult = Math.min(caster.buffDefMult||1, 1-dmgReduction);
      // Talento "Banquete de Furia": robo de vida extra mientras la Armadura esté activa.
      caster.buffLifesteal = Math.max(caster.buffLifesteal||0, sk.lifestealBonus+(tSkill.flags.furyLifestealBonus||0));
      caster.buffTimer = Math.max(caster.buffTimer, (sk.duration*DUR));
      caster.furyArmorTimer = Math.max(caster.furyArmorTimer||0, (sk.duration*DUR));
      caster.furyArmorMaxTimer = (sk.duration*DUR);
      caster.furyResistCC = flvl>=2;
      caster.furyGenMult = flvl>=3 ? 3.0 : 1.0;
      caster.furyConvertPct = flvl>=4 ? 0.10 : 0;
      caster.furyPower = 0; // acumulado de daño convertido (N4), se resetea cada activación
      if(flvl>=5){
        caster.buffDmgMult = Math.max(caster.buffDmgMult||1, 1.50);
        caster.furyAreaMult = 0.70;
      } else {
        caster.furyAreaMult = 1.0;
      }
      caster.furyFinalSlash = flvl>=6;
      tieredBurstVFX(caster.x, caster.y, 46, allocLevel(mastery), "#c62828", "#ff5c4a");
      if(caster===player) floatText(caster.x, caster.y-50, "¡FURIA!"+(flvl>=6?" MÁXIMA":""), "crit");
      break;
    }

    case "last_stand_burst": {
      // Último Aliento (activación): intensifica el furor un rato y cura una porción al lanzarlo.
      // El pasivo real (más daño cuanto menos vida) corre todo el tiempo, ver furyMissingHpMult().
      caster.buffDmgMult = Math.max(caster.buffDmgMult||1, 1+sk.dmgBonus);
      caster.buffTimer = Math.max(caster.buffTimer, (sk.duration*DUR));
      const healAmt = caster.maxHp*sk.healOnCastPct;
      caster.hp = Math.min(caster.maxHp, caster.hp+healAmt);
      floatText(caster.x, caster.y-34, "+"+Math.round(healAmt), "heal");
      tieredBurstVFX(caster.x, caster.y, 40, allocLevel(mastery), "#8a1414", "#ff5c4a");
      if(caster===player) floatText(caster.x, caster.y-56, "¡ÚLTIMO ALIENTO!", "crit");
      break;
    }

    case "berserker_ult": {
      // Segador de Almas: Furia máxima, daño e impacto enormes, roba vida, resiste el control.
      // Cada baja durante la ulti prolonga su duración (ver killEnemy).
      caster.buffDmgMult = Math.max(caster.buffDmgMult||1, 1+sk.dmgBonus);
      caster.buffDefMult = Math.min(caster.buffDefMult||1, 1-sk.defBonus-(tSkill.flags.ultDefBonus||0));
      caster.buffLifesteal = Math.max(caster.buffLifesteal||0, sk.lifesteal+(tSkill.flags.ultLifestealBonus||0));
      caster.buffTimer = Math.max(caster.buffTimer, (sk.duration*DUR));
      caster.berserkTimer = (sk.duration*DUR);
      caster.berserkExtendMs = sk.killExtendMs;
      caster.furyArmorTimer = Math.max(caster.furyArmorTimer||0, (sk.duration*DUR));
      cataclysmVFX(caster, 90, allocLevel(mastery));
      // Vórtice de almas real (calavera emergiendo) sobre el instante del cast, además del
      // estallido genérico ya existente arriba.
      if(newfxReady('soulReapBurst')) vfxSprite("fxSoulReapBurst", 0, caster.x, caster.y-30, 150, 650, null, 0, false, 0.5, 8);
      if(caster===player) floatText(caster.x, caster.y-56, "¡SEGADOR DE ALMAS!", "crit");
      break;
    }

    case "retro_heal": {
      // La Profeta — Destino Restaurado: cura al instante al aliado más herido y, si está
      // gravemente herido (< gravePct de vida), además revierte una porción del daño que
      // recibió en los últimos `retroWindowMs` (ver el historial que arma damageHero).
      let target=null, lowRatio=1;
      for(const h of heroes){ if(!h.alive) continue; const r=h.hp/h.maxHp; if(r<lowRatio){ lowRatio=r; target=h; } }
      if(!target) target = caster;
      // "Precio del Destino" (rama Sacrificio): a cambio de curar más, le cuesta vida propia a
      // la Profeta -tope defensivo para que nunca pueda costar más del 40% de su vida actual ni
      // dejarla en 0-.
      const selfCostPct = Math.max(0, tSkill.flags.sacrificeSelfCostPct||0);
      const healBonusPct = tSkill.flags.sacrificeHealBonus||0;
      if(selfCostPct>0 && caster!==target){
        const cost = Math.min(caster.hp*0.4, caster.maxHp*selfCostPct);
        caster.hp = Math.max(1, caster.hp-cost);
        if(caster===player) floatText(caster.x, caster.y-40, "-"+Math.round(cost));
      }
      const healAmt = target.maxHp*(sk.healPct*POWER)*(1+healBonusPct);
      trackHeal(caster, target, healAmt);
      applyHealOverheal(caster, target, healAmt);
      floatText(target.x, target.y-30, "+"+Math.round(healAmt), "heal");
      if(lowRatio < (sk.gravePct||0.4) && target.recentDamage && target.recentDamage.length){
        const now = performance.now(), windowMs = sk.retroWindowMs||4500;
        let recovered = 0;
        for(const rec of target.recentDamage){ if(now-rec.t <= windowMs) recovered += rec.amount; }
        target.recentDamage = []; // se consume al revertirlo (y descarta lo viejo de paso)
        if(recovered>0){
          const retroAmt = recovered*(sk.retroPct*POWER);
          target.hp = Math.min(target.maxHp, target.hp+retroAmt);
          floatText(target.x, target.y-54, "+"+Math.round(retroAmt), "heal");
          if(target===player || caster===player) floatText(target.x, target.y-74, "¡DESTINO RESTAURADO!", "crit");
        }
      }
      particles.push({x:target.x,y:target.y, life:500, ring:true, maxLife:500, maxR:60, color:"#8fffe0"});
      tieredBurstVFX(target.x, target.y, 60, allocLevel(mastery), "#8fffe0", "#eafff8");
      break;
    }

    case "brief_immunity": {
      // La Profeta — Visión del Inmortal: un aliado CERCANO (no ella misma si hay otro
      // disponible) se vuelve inmune a daño y se le limpian los efectos negativos activos;
      // al terminar recibe una pequeña regeneración (ver el visionImmortalTimer en
      // update()/updateAllies()).
      let target=null, bd=sk.range||260;
      for(const h of heroes){ if(h===caster || !h.alive) continue; const d=distance(caster,h); if(d<=bd){ bd=d; target=h; } }
      if(!target) target = caster;
      const dur = sk.duration*DUR;
      target.invulnTimer = Math.max(target.invulnTimer||0, dur);
      target.stunTimer = 0; target.slowAmt = 0; target.slowTimer = 0; target.burnTimer = 0; target.bleedTimer = 0;
      target.visionImmortalTimer = Math.max(target.visionImmortalTimer||0, dur);
      target.visionImmortalRegenPct = sk.regenPct*POWER;
      particles.push({x:target.x,y:target.y, life:420, ring:true, maxLife:420, maxR:44, color:"#eafff8"});
      tieredBurstVFX(target.x, target.y, 44, allocLevel(mastery), "#bffff0", "#ffffff");
      if(target===player || caster===player) floatText(target.x, target.y-46, "¡VISIÓN DEL INMORTAL!", "crit");
      break;
    }

    case "self_spin_stun": {
      // La Profeta — Danza del Augurio: gira con su hoja, daño en área a su alrededor; a los
      // enemigos que estén MUY cerca (Rinner) además los aturde brevemente.
      const R = sk.radius*AREA, Rinner = sk.innerR*AREA*(1+(tSkill.flags.augurioStunRadiusPct||0));
      for(const e of enemies){
        if(!e.alive) continue;
        const d = distance(caster,e);
        if(d<=R) damageEnemy(e, dmg, {stun: d<=Rinner ? (sk.stun*DUR) : undefined, src:caster});
      }
      caster.profetaSpinFxTimer = 480;
      particles.push({x:caster.x,y:caster.y, life:420, maxLife:420, spin:true, radius:R*0.85, color:"#8fffe0"});
      tieredBurstVFX(caster.x, caster.y, R, allocLevel(mastery), "#8fffe0", "#eafff8");
      break;
    }

    case "ascension_fusion": {
      // La Profeta — Ascensión del Elegido: se acerca a un aliado y se fusiona con él
      // (invisible/invulnerable mientras dura, ver caster.fused en triggerBasic/castAbility/
      // update/updateAllies). El aliado recibe una curación enorme y un empoderamiento total
      // -daño, velocidad de ataque, resistencia, robo de vida y cooldowns casi nulos (ver el
      // ascensionTimer que fuerza los cds a un mínimo, en update()/updateAllies())-, todo por
      // los mismos campos buffDmgMult/buffAtkSpeedMult/buffDefMult/buffLifesteal/buffTimer de
      // siempre: cuando buffTimer expira, el motor YA sabe revertirlos solo (mismo código que
      // usa cualquier otro buff temporal del roster) -sin eso, "revertir todo con prolijidad"
      // hubiera significado reinventar ese reset a mano y arriesgarse a dejar algo pisado.
      let target=null, bd=Infinity;
      for(const h of heroes){ if(h===caster || !h.alive) continue; const d=distance(caster,h); if(d<bd){ bd=d; target=h; } }
      const dur = sk.duration*DUR;
      const fusing = !!target;
      if(!target) target = caster; // sin aliados vivos: se potencia a sí misma en vez de fusionarse
      const healAmt = target.maxHp*(sk.healPct*POWER);
      trackHeal(caster, target, healAmt);
      applyHealOverheal(caster, target, healAmt);
      // POWER (maestría + talentos de "Elegida") escala TODO el empoderamiento, no solo la
      // curación: la parte de bonus por encima de 1x de daño/velocidad, y el total de
      // defensa/robo de vida otorgados.
      target.buffDmgMult = Math.max(target.buffDmgMult||1, 1+(sk.dmgMult-1)*POWER);
      target.buffAtkSpeedMult = Math.max(target.buffAtkSpeedMult||1, 1+(sk.atkSpeedMult-1)*POWER);
      target.buffDefMult = Math.min(target.buffDefMult||1, 1-sk.defBonus*POWER);
      target.buffLifesteal = Math.max(target.buffLifesteal||0, sk.lifesteal*POWER);
      target.buffTimer = Math.max(target.buffTimer||0, dur);
      target.ascensionTimer = Math.max(target.ascensionTimer||0, dur);
      target.ascensionMaxTimer = dur;
      if(fusing){
        caster.x = target.x + (caster.x<target.x ? -1 : 1)*32;
        caster.y = target.y;
        clampToArena(caster);
        caster.stealthTimer = Math.max(caster.stealthTimer||0, dur);
        caster.invulnTimer = Math.max(caster.invulnTimer||0, dur);
        caster.fused = true;
        caster.ascensionFusedWith = target;
      }
      showBanner("¡ASCENSIÓN DEL ELEGIDO!");
      floatText(target.x, target.y-60, "+"+Math.round(healAmt), "heal");
      particles.push({x:target.x,y:target.y, life:700, ring:true, maxLife:700, maxR:90, color:"#eafff8"});
      particles.push({x:target.x,y:target.y, life:700, maxLife:700, runeRing:true, maxR:70, color:"#8fffe0", count:12});
      tieredBurstVFX(target.x, target.y, 90, 8, "#8fffe0", "#ffffff");
      break;
    }
  }
}

/* ============================================================
   UPDATE LOOP
   ============================================================ */
function clampToArena(ent){
  // Musashi: mientras dura un Último Duelo, tanto él como su rival están anclados a la arena
  // de bolsillo (ver updateLastDuel, que ya los mantiene dentro de MUSASHI_DUEL_RADIUS cada
  // frame) -si se dejara pasar por el recorte de acá abajo, los mandaría de vuelta de un tirón
  // al octágono principal, a decenas de miles de píxeles de donde están parados-.
  if(ent.duelActive || ent.isDuelLocked) return;
  // El coliseo es un octágono alargado: recortamos contra cada uno de sus 8 lados
  const R = ARENA_RADIUS*0.94, SX = 1.18, SY = 0.82;
  const nx = ent.x/SX, ny = ent.y/SY;
  const d = Math.hypot(nx, ny);
  const inradius = R*Math.cos(Math.PI/8);
  if(d > inradius){
    const ang = Math.atan2(ny, nx);
    const seg = Math.abs(((ang - Math.PI/8) % (Math.PI/4)) - Math.PI/8);
    const maxD = inradius/Math.cos(seg);
    if(d > maxD){
      ent.x = Math.cos(ang)*maxD*SX;
      ent.y = Math.sin(ang)*maxD*SY;
    }
  }
  if(!ent.cls && ent.rank && ent.rank!=="jefe" && AID_NAV.on) aidCollideEnemy(ent);
}

// ============================================================
// MUROS DEL LABERINTO MALDITO — bloquean el paso (solo en esta arena; en el resto,
// labyrinthWalls queda vacío y esto no hace nada). Son rectángulos rotados: se guarda su
// centro, largo, grosor y ángulo, y se resuelve la colisión pasando el punto al espacio
// local del muro (rotado a 0°) para un simple recorte de caja.
// ============================================================
let labyrinthWalls = [];
function buildLabyrinthWalls(){
  labyrinthWalls = [];
  if(!arenaMods().hasWalls) return;
  // Arena Identity V1: pasillos, cámaras y plazas diseñados (ver aidLabyrinthLayout) en vez de
  // tabiques al azar sobre anillos. Mismo formato {x,y,len,thick,rot} que usa la colisión.
  labyrinthWalls = aidLabyrinthLayout();
}
// Empuja a "ent" fuera de cualquier muro con el que se esté superponiendo
function resolveWallCollision(ent){
  resolveIceWalls(ent); // Muro de Hielo del Demonio de Hielo y Fuego (solo bloquea campeones)
  aidResolveCircles(ent, 0.9); // obstáculos sólidos del escenario (columnas, menhires, pilares...)
  if(!labyrinthWalls.length) return;
  const rad = ent.radius || 18;
  for(const w of labyrinthWalls){
    const dx = ent.x-w.x, dy = ent.y-w.y;
    const c = Math.cos(-w.rot), s = Math.sin(-w.rot);
    const lx = dx*c - dy*s, ly = dx*s + dy*c; // punto en el espacio local del muro
    const hw = w.len/2 + rad, hh = w.thick/2 + rad;
    if(Math.abs(lx) < hw && Math.abs(ly) < hh){
      const overlapX = hw - Math.abs(lx), overlapY = hh - Math.abs(ly);
      let pLx = lx, pLy = ly;
      if(overlapX < overlapY) pLx = lx>0 ? hw : -hw;
      else pLy = ly>0 ? hh : -hh;
      const cw = Math.cos(w.rot), sw = Math.sin(w.rot);
      ent.x = w.x + (pLx*cw - pLy*sw);
      ent.y = w.y + (pLx*sw + pLy*cw);
    }
  }
}

// Peligros ambientales periódicos, propios de cada arena (independientes del daño de los
// monstruos). Arena de Hielo: novas gélidas que avisan y después golpean/ralentizan.
// Arena Infernal: un héroe al azar se prende fuego y pierde vida un rato.
let acuaCurrent = {active:false, dx:0, dy:0, timer:0};
// Corriente Profunda (Arena Acuática): empuja a los 4 héroes por igual mientras dura, sin
// tocar sus controles -se suma después del movimiento normal, como un pequeño extra, nunca lo
// reemplaza-.
function updateAcuaCurrent(dt){
  if(!acuaCurrent.active) return;
  acuaCurrent.timer -= dt;
  if(acuaCurrent.timer<=0){ acuaCurrent.active=false; return; }
  const push = 34;
  for(const h of heroes){
    if(!h.alive) continue;
    h.x += acuaCurrent.dx*push*dt/1000;
    h.y += acuaCurrent.dy*push*dt/1000;
    clampToArena(h);
  }
}
// Ambientación de la Arena Acuática (peces, burbujas): puramente decorativa -sin hitbox, no
// reciben ni hacen daño, no bloquean jugadores-. Reduce su propia cantidad cuando hay muchos
// enemigos en pantalla (el combate siempre tiene prioridad sobre la decoración, pedido
// explícito), y se recicla en vez de acumularse sin límite.
let acuaFish = [], acuaBubbles = [], acuaBubbleTimer = 0;
function updateAcuaAmbience(dt){
  if(currentArena!=="acuatica" || state!=="playing") return;
  const loadFactor = Math.min(1, enemies.length/18);
  const maxFish = Math.round(14*(1-loadFactor*0.6));
  while(acuaFish.length < maxFish){
    const ang = Math.random()*Math.PI*2, r = 400+Math.random()*700;
    acuaFish.push({
      x: player.x+Math.cos(ang)*r, y: player.y+Math.sin(ang)*r,
      wander: Math.random()*Math.PI*2, speed: 18+Math.random()*22,
      size: 3+Math.random()*3, gold: Math.random()<0.35
    });
  }
  for(const f of acuaFish){
    f.wander += (Math.random()-0.5)*0.6*dt/1000;
    f.x += Math.cos(f.wander)*f.speed*dt/1000;
    f.y += Math.sin(f.wander)*f.speed*dt/1000;
    f._fx = Math.cos(f.wander);
  }
  acuaFish = acuaFish.filter(f=>distance(f, player) < 1400);

  acuaBubbleTimer -= dt;
  if(acuaBubbleTimer<=0 && acuaBubbles.length < 40*(1-loadFactor*0.5)){
    acuaBubbleTimer = 220 + Math.random()*260 + loadFactor*400;
    const ang = Math.random()*Math.PI*2, r = Math.random()*700;
    acuaBubbles.push({x:player.x+Math.cos(ang)*r, y:player.y+Math.sin(ang)*r+300, life:2600, maxLife:2600, size:2+Math.random()*3, wob:Math.random()*Math.PI*2});
  }
  for(const b of acuaBubbles){ b.life -= dt; b.y -= 26*dt/1000; b.wob += dt/260; b.x += Math.sin(b.wob)*8*dt/1000; }
  acuaBubbles = acuaBubbles.filter(b=>b.life>0);
}
function drawAcuaAmbience(){
  if(currentArena!=="acuatica") return;
  for(const f of acuaFish){
    if(!inView(f.x,f.y,40)) continue;
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = f.gold ? "#e8c85a" : "#7fb0d8";
    ctx.translate(f.x, f.y);
    if(f._fx<0) ctx.scale(-1,1);
    ctx.beginPath();
    ctx.moveTo(-f.size*2, 0); ctx.lineTo(f.size*1.4, -f.size); ctx.lineTo(f.size*1.4, f.size); ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-f.size*2,0); ctx.lineTo(-f.size*3.2, -f.size*0.8); ctx.lineTo(-f.size*3.2, f.size*0.8); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  for(const b of acuaBubbles){
    if(!inView(b.x,b.y,20)) continue;
    ctx.save();
    ctx.globalAlpha = Math.min(0.5, b.life/b.maxLife)*0.6;
    ctx.strokeStyle = "#cfeeff"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.size, 0, Math.PI*2); ctx.stroke();
    ctx.restore();
  }
}
function updateArenaHazards(dt){
  arenaHazardTimer -= dt;
  if(arenaHazardTimer > 0) return;
  const hz = arenaMods().hazard;
  if(hz==="nova_gelida"){
    arenaHazardTimer = 7000 + Math.random()*4000;
    const target = heroes[(Math.random()*heroes.length)|0];
    if(target && target.alive){
      const hx = target.x, hy = target.y, R = 115;
      particles.push({x:hx, y:hy, life:900, warnRing:true, maxLife:900, maxR:R, color:"#8fd0ff"});
      setTimeout(()=>{
        if(state!=="playing") return;
        for(const h of heroes){
          if(h.alive && Math.hypot(h.x-hx, h.y-hy) < R){
            h.hp = Math.max(0, h.hp - h.maxHp*0.06);
            if(h.hp<=0 && h.alive){ h.alive=false; if(h===player) onPlayerDeath(); }
            h.slowAmt = Math.max(h.slowAmt||0, 0.4); h.slowTimer = Math.max(h.slowTimer||0, 1500);
            if(h===player) floatText(h.x, h.y-40, "¡NOVA GÉLIDA!", "crit");
          }
        }
        frostNovaVFX({x:hx,y:hy}, R, 2);
      }, 900);
    }
  } else if(hz==="ignicion"){
    arenaHazardTimer = 8000 + Math.random()*4000;
    const target = heroes[(Math.random()*heroes.length)|0];
    if(target && target.alive){
      target.burnTimer = Math.max(target.burnTimer||0, 3000);
      target.burnDmg = Math.max(target.burnDmg||0, target.maxHp*0.025);
      particles.push({x:target.x, y:target.y, life:500, ring:true, maxLife:500, maxR:40, color:"#ff5a2a"});
      if(target===player) floatText(target.x, target.y-40, "¡TE PRENDISTE FUEGO!", "crit");
    }
  } else if(hz==="sismo"){
    // Sismo del Laberinto Maldito: a diferencia de los otros peligros (que golpean a uno solo
    // a la vez), esto sacude TODA la arena y golpea a los 4 héroes juntos, un poco cada uno.
    arenaHazardTimer = 9000 + Math.random()*5000;
    screenShake = Math.max(screenShake||0, 14);
    for(const h of heroes){
      if(!h.alive) continue;
      h.hp = Math.max(0, h.hp - h.maxHp*0.045);
      if(h.hp<=0 && h.alive){ h.alive=false; if(h===player) onPlayerDeath(); }
      if(h===player) floatText(h.x, h.y-40, "¡SISMO!", "crit");
      particles.push({x:h.x, y:h.y+10, life:400, ring:true, maxLife:400, maxR:34, color:"#c9a56a"});
    }
    for(let i=0;i<14;i++){
      const a = Math.random()*Math.PI*2, r = Math.random()*ARENA_RADIUS*0.8;
      particles.push({x:Math.cos(a)*r, y:Math.sin(a)*r*0.7, vx:0, vy:-14, life:500, color:"#8a7350"});
    }
  } else if(hz==="corriente_acuatica"){
    // Arena Acuática: a diferencia del resto de los peligros (que dañan), esto solo empuja
    // suavemente a los 4 héroes en una misma dirección durante un rato -pedido explícito: nunca
    // debe volverse incómodo ni sacarle claridad al combate, así que no hace daño ni controla-.
    arenaHazardTimer = 11000 + Math.random()*6000;
    const ang = Math.random()*Math.PI*2;
    acuaCurrent.active = true; acuaCurrent.dx = Math.cos(ang); acuaCurrent.dy = Math.sin(ang); acuaCurrent.timer = 3200;
    showBanner("Corriente Profunda");
    for(let i=0;i<10;i++){
      const r = Math.random()*ARENA_RADIUS;
      particles.push({x:player.x+Math.cos(ang)*r*0.3+(Math.random()-0.5)*400, y:player.y+Math.sin(ang)*r*0.3+(Math.random()-0.5)*400,
        vx:Math.cos(ang)*30, vy:Math.sin(ang)*30, life:1600, color:"#6fb0c8"});
    }
  }
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

/* ============================================================
   RENDER
   ============================================================ */
function drawTrap(tr){
  if(tr.kind==="forest_root" && SYLVA_TRAP_READY.f1){
    // Trampa del Bosque con su arte real (antes sin usar): crece en 4 etapas durante el
    // armado (200ms, antes esa ventana era directamente invisible) y queda en la última
    // pose mientras sigue activa, con el mismo fundido de salida que ya tenía el crosshair.
    const seq = ["f1","f2","f3","f4"];
    const growProgress = Math.max(0, Math.min(0.999, 1 - (tr.armTime||0)/200));
    const img = SYLVA_TRAP_IMG[seq[Math.floor(growProgress*seq.length)]];
    const fade = tr.timer < 1200 ? Math.max(0.2, tr.timer/1200) : 1;
    const s = 64/img.height;
    const clip = { frames: [{x:0, y:0, w:img.width, h:img.height}] };
    drawAnimFrameSized(img, clip, 0, tr.x, tr.y, img.width*s, img.height*s, 0.5, 0.85, false, fade);
    return;
  }
  if(tr.armTime>0) return; // invisible mientras se activa
  const now = performance.now()/1000;
  const pulse = 0.6+0.4*Math.sin(now*5);
  const fade = tr.timer < 1200 ? Math.max(0.2, tr.timer/1200) : 1;
  ctx.save();
  ctx.globalAlpha = fade*(0.55+0.25*pulse);
  ctx.translate(tr.x, tr.y);
  ctx.rotate(now*0.6);
  ctx.strokeStyle = "#7dffa0"; ctx.lineWidth = 2; ctx.shadowColor = "#7dffa0"; ctx.shadowBlur = 6;
  ctx.beginPath();
  for(let i=0;i<4;i++){
    const a = i*Math.PI/2;
    ctx.moveTo(0,0); ctx.lineTo(Math.cos(a)*14, Math.sin(a)*14);
  }
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0,-10); ctx.lineTo(10,0); ctx.lineTo(0,10); ctx.lineTo(-10,0); ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawFireWall(fw){
  const spawnProg = Math.min(1, (fw.maxTimer-fw.timer)/300);     // se forma en 300ms
  const fadeProg = fw.timer < 500 ? fw.timer/500 : 1;             // se apaga en los últimos 500ms
  const alpha = spawnProg * fadeProg;
  const mid = (fw.innerR+fw.outerR)/2;
  const thick = fw.outerR - fw.innerR;
  const now = performance.now()/1000;
  const tier = fw.tier || 1; // escala visual según el talento invertido en Muro de Fuego
  const ageSec = (fw.maxTimer-fw.timer)/1000;
  const dying = fw.timer < 350;
  ctx.save();
  ctx.globalAlpha = alpha;
  // Sprites reales del paquete "Muro de Fuego": se reparten llamas individuales a lo largo de
  // la circunferencia del anillo (la habilidad es un aro, no un muro recto). Más llamas y más
  // grandes cuanto mayor el talento invertido — así se nota mucho más al subir de nivel.
  const n = 7 + tier*5;
  const flameSize = (thick*0.95 + tier*7);
  const animName = dying ? "extincion" : (spawnProg<1 ? "formacion" : "activo");
  for(let i=0;i<n;i++){
    const a = (i/n)*Math.PI*2 + (dying?0:now*0.12);
    const fx = fw.x + Math.cos(a)*mid, fy = fw.y + Math.sin(a)*mid*0.62;
    const t = animName==="formacion" ? ageSec : (now + i*0.11);
    MuroFuego.draw(ctx, animName, t, fx, fy, flameSize);
  }
  if(tier>=3 && !dying){
    // resplandor cálido de fondo en niveles altos de talento
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const g = ctx.createRadialGradient(fw.x, fw.y, fw.innerR*0.5, fw.x, fw.y, fw.outerR+20+tier*5);
    g.addColorStop(0, "rgba(255,110,40,0.14)");
    g.addColorStop(1, "rgba(255,110,40,0)");
    ctx.fillStyle = g; ctx.fillRect(fw.x-fw.outerR-30, fw.y-fw.outerR-30, (fw.outerR+30)*2, (fw.outerR+30)*2);
    ctx.restore();
  }
  if(tier>=4 && !dying){
    // humo ascendente en los niveles más altos de talento
    for(let i=0;i<4;i++){
      const a = (i/4)*Math.PI*2 + now*0.15;
      const sx = fw.x+Math.cos(a)*mid, sy = fw.y+Math.sin(a)*mid*0.62 - 14 - ((now*24)%22);
      ctx.fillStyle = "rgba(150,150,150,0.22)";
      ctx.beginPath(); ctx.arc(sx, sy, 5, 0, Math.PI*2); ctx.fill();
    }
  }
  ctx.restore();
}

// Cadena de Relámpagos y ráfagas eléctricas: efectos con sprites reales (paquete CadenaRelampagos).
// pushChainBolt: un segmento de rayo entre dos puntos (un salto de la cadena).
// pushSpark: una animación puntual del mismo atlas (impacto, carga, aura "electrificado").
function pushChainBolt(x1,y1,x2,y2,thickness,durationMs){
  chainFX.push({x1,y1,x2,y2,thickness,start:performance.now(),duration:durationMs||420});
}
function pushSpark(name,x,y,size,durationMs){
  sparkFX.push({name,x,y,size,start:performance.now(),duration:durationMs||400});
}
function drawChainFX(){
  const now = performance.now();
  for(let i=chainFX.length-1;i>=0;i--){
    const f = chainFX[i];
    const age = now-f.start;
    if(age>f.duration){ chainFX.splice(i,1); continue; }
    CadenaRelampagos.drawLink(ctx, age/1000, {x:f.x1,y:f.y1}, {x:f.x2,y:f.y2}, f.thickness);
  }
  for(let i=sparkFX.length-1;i>=0;i--){
    const f = sparkFX[i];
    const age = now-f.start;
    if(age>f.duration){ sparkFX.splice(i,1); continue; }
    CadenaRelampagos.draw(ctx, f.name, age/1000, f.x, f.y, f.size);
  }
  for(let i=asesinoFx.length-1;i>=0;i--){
    const f = asesinoFx[i];
    const age = now-f.start;
    if(age>f.duration){ asesinoFx.splice(i,1); continue; }
    drawAsesinoHab(f.skill, f.anim, age, f.x, f.y, f.size, f.flip);
  }
}
// Empuja un efecto de habilidad real del Asesino (sprite) para que se dibuje unos instantes
function pushAsesinoFx(skill, anim, x, y, size, durationMs, flip){
  asesinoFx.push({skill, anim, x, y, size, start:performance.now(), duration:durationMs, flip:!!flip});
}

function drawPotion(p){
  const bob = Math.sin(p.phase)*3;
  const x = Math.round(p.x), y = Math.round(p.y+bob);
  const isMana = p.type==="mana";
  const liquid = isMana ? "#3f8fe0" : "#e0343f";
  const liquidHi = isMana ? "#7ec8ff" : "#ff8090";
  const glow = isMana ? "70,150,255" : "255,70,90";
  ctx.save();
  ctx.fillStyle = "#0e0608";
  ctx.fillRect(x-8, y-16, 16, 20);
  ctx.fillStyle = "#c9c2d6";
  ctx.fillRect(x-6, y-14, 12, 16);
  ctx.fillStyle = liquid;
  ctx.fillRect(x-4, y-8, 8, 9);
  ctx.fillStyle = liquidHi;
  ctx.fillRect(x-4, y-8, 3, 9);
  ctx.fillStyle = "#0e0608";
  ctx.fillRect(x-3, y-22, 6, 7);
  ctx.fillStyle = "#6b4a2a";
  ctx.fillRect(x-2, y-21, 4, 5);
  ctx.globalCompositeOperation = "lighter";
  const g = ctx.createRadialGradient(x, y-8, 2, x, y-8, 34);
  g.addColorStop(0, `rgba(${glow},0.22)`);
  g.addColorStop(1, `rgba(${glow},0)`);
  ctx.fillStyle = g; ctx.fillRect(x-34, y-42, 68, 68);
  ctx.restore();
}

function heroFrame(h){
  const sp = SPRITES[h.classKey];
  if(!sp) return null;
  if(h.attackAnim>0) return sp.attack;
  if(h.hurtTimer>0 && sp.hurt) return sp.hurt;
  // mirando hacia arriba se ve la espalda del personaje
  const set = (h.fy < -0.45 && sp.back) ? sp.back : sp.walk;
  if(!h.moving) return set[0];
  return set[Math.floor(h.animT/130)%4];
}

// Sello mágico persistente en el piso mientras dura un buff propio o de equipo: crece en
// complejidad según el nivel de talento, como en las hojas de referencia (Escudenzima/Bufenzima/
// Ulti-zima): hexágono simple -> + anillo interior -> + triángulo -> + nodos brillantes.
function drawGroundSigil(h){
  if(!(h.sigilTimer>0)) return;
  const t = performance.now()/1000;
  const R = h.sigilRadius||46;
  const tier = h.sigilTier||1;
  const col = h.sigilColor||"#8fd0ff";
  const fadeIn = Math.min(1, (h.sigilMaxTimer-h.sigilTimer)/250);
  const fadeOut = h.sigilTimer < 400 ? h.sigilTimer/400 : 1;
  ctx.save();
  ctx.globalAlpha = 0.4*fadeIn*fadeOut;
  ctx.translate(h.x, h.y+6);
  ctx.scale(1, 0.55);
  ctx.strokeStyle = col; ctx.lineWidth = 2;
  ctx.save();
  ctx.rotate(t*0.6);
  ctx.beginPath();
  for(let i=0;i<6;i++){
    const a=(i/6)*Math.PI*2, px=Math.cos(a)*R, py=Math.sin(a)*R;
    if(i===0) ctx.moveTo(px,py); else ctx.lineTo(px,py);
  }
  ctx.closePath(); ctx.stroke();
  ctx.restore();
  if(tier>=2){
    ctx.save();
    ctx.rotate(-t*1.1);
    ctx.beginPath(); ctx.arc(0,0,R*0.65,0,Math.PI*2); ctx.stroke();
    ctx.restore();
  }
  if(tier>=3){
    ctx.save();
    ctx.rotate(t*0.35);
    ctx.beginPath();
    for(let i=0;i<3;i++){
      const a=(i/3)*Math.PI*2, px=Math.cos(a)*R*0.85, py=Math.sin(a)*R*0.85;
      if(i===0) ctx.moveTo(px,py); else ctx.lineTo(px,py);
    }
    ctx.closePath(); ctx.stroke();
    ctx.restore();
  }
  if(tier>=4){
    ctx.save();
    ctx.rotate(t*0.6);
    for(let i=0;i<6;i++){
      const a=(i/6)*Math.PI*2, px=Math.cos(a)*R, py=Math.sin(a)*R;
      ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 6;
      ctx.beginPath(); ctx.arc(px,py,3,0,Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }
  ctx.restore();
}

// Fase 5 — Arena Divina: aura sagrada sobre los 4 enemigos "divinos". No toca su sprite (el
// mismo campeón, la misma silueta, tal como pide el diseño): solo agrega resplandor pulsante
// y un anillo de runas rotando bajo los pies, dibujado ANTES del sprite para que quede detrás.
function drawDivineAura(h){
  const now = performance.now()/1000;
  const pulse = 0.6+0.4*Math.sin(now*2.2 + h.x*0.01);
  // El aura crece con el nivel de la Arena Divina (y por lo tanto con el nivel de personaje
  // del equipo enemigo, 10 por nivel): en el nivel 10 (campeón nivel 100) debe notarse mucho
  // más grande e intensa que en el nivel 1. Tope en 2.5x para que no se descontrole.
  const lvlScale = Math.min(2.5, 1 + (divinaLevel-1)*0.17);
  const R = 58*lvlScale;
  ctx.save();
  ctx.translate(h.x, h.y-6);
  ctx.globalCompositeOperation = "lighter";
  const g = ctx.createRadialGradient(0,0,4,0,0,R);
  g.addColorStop(0, `rgba(255,230,150,${(0.32*pulse+0.14)*Math.min(1.6,lvlScale)})`);
  g.addColorStop(0.6, `rgba(255,200,100,${0.14*pulse*Math.min(1.6,lvlScale)})`);
  g.addColorStop(1, "rgba(255,200,100,0)");
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0,0,R,0,Math.PI*2); ctx.fill();
  // A partir de nivel 5 de Arena Divina, un segundo aro exterior más intenso -la escalada se
  // nota de un vistazo, no solo por el tamaño del resplandor principal.
  if(divinaLevel>=5){
    ctx.globalAlpha = 0.18+0.12*pulse;
    ctx.strokeStyle = "#ffcf5c"; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(0,0,R*0.72,0,Math.PI*2); ctx.stroke();
  }
  ctx.restore();
  // anillo de runas sagradas, rotando despacio bajo los pies (también crece con el nivel)
  ctx.save();
  ctx.translate(h.x, h.y+6);
  ctx.rotate(now*0.6);
  ctx.globalAlpha = 0.55+0.25*pulse;
  ctx.strokeStyle = "#ffe8a0"; ctx.lineWidth = 1.4*Math.min(1.8,lvlScale);
  ctx.beginPath(); ctx.ellipse(0,0,24*lvlScale,10*lvlScale,0,0,Math.PI*2); ctx.stroke();
  const nRunes = divinaLevel>=6 ? 9 : 6; // más runas en niveles altos
  for(let i=0;i<nRunes;i++){
    const a = (i/nRunes)*Math.PI*2;
    const rx = Math.cos(a)*24*lvlScale, ry = Math.sin(a)*10*lvlScale;
    ctx.save();
    ctx.translate(rx,ry); ctx.rotate(a+Math.PI/2);
    ctx.fillStyle = "#ffe8a0";
    ctx.fillRect(-1,-4*Math.min(1.6,lvlScale),2,8*Math.min(1.6,lvlScale)); // trazo simple tipo runa, nítido, sin blur
    ctx.restore();
  }
  ctx.restore();
}
// Dirección de la pose (abajo / perfil / arriba) con histéresis, para que no parpadee en diagonal.
function champPackDir(h){
  const fx = h.fx||0, fy = (h.fy===undefined ? 1 : h.fy), ax = Math.abs(fx), ay = Math.abs(fy);
  let dir = h._pdir || "down";
  if(dir==="side"){ if(ay > ax*1.3) dir = fy < 0 ? "up" : "down"; }
  else if(ax > ay*1.3) dir = "side";
  else dir = fy < -0.15 ? "up" : "down";
  h._pdir = dir;
  if(fx < -0.12) h._pleft = true; else if(fx > 0.12) h._pleft = false;
  return dir;
}
function champPackScale(P, h, drawScale){
  return h.radius*2.7*(drawScale/(h.scale||2.0))/P.sets.idle_down[0].height;
}
function drawChampPack(key, h, drawScale, alpha){
  const P = CHAMP_PACK[key];
  if(!P || !P.ready) return false;
  const dir = champPackDir(h);
  // detecta el comienzo de cada ataque/cast para conocer su duración real (varía con la velocidad de ataque)
  const a = h.attackAnim||0;
  if(a > (h._aPrev||0)+1) h._aDur = a;
  h._aPrev = a;
  let st, prog = null;
  if(h.hurtTimer>0){ st = "hit"; prog = 1 - h.hurtTimer/160; }
  else if(a>0){ st = animNow < (h._packCastUntil||0) ? "cast" : "attack"; prog = 1 - a/(h._aDur||a); }
  else st = h.moving ? "walk" : "idle";
  const arr = P.sets[st+"_"+dir] || P.sets["idle_"+dir];
  let n;
  if(prog!==null) n = Math.min(arr.length-1, Math.max(0, Math.floor(prog*arr.length)));
  else if(st==="walk") n = Math.floor((h.animT||0)/130) % arr.length;
  else n = Math.floor(animNow/230) % arr.length;
  const img = arr[n], s = champPackScale(P, h, drawScale);
  drawAnimFrameSized(img, {frames:[{x:0, y:0, w:img.width, h:img.height}]}, 0, h.x, h.y, img.width*s, img.height*s, 0.5, 0.94, dir==="side" && h._pleft, alpha);
  return true;
}
// Muerte con los frames reales (en vez del sprite de pie rotado): queda tendido semitransparente.
function drawChampPackDeath(h){
  const P = CHAMP_PACK[h.classKey];
  if(!P || !P.ready) return false;
  if(!h._deadAt){ h._deadAt = animNow; vfxBurst(h.x, h.y-20, 12, "blood", 120, 420, 3, 2, -30, 0); }
  const dir = h._pdir || "down", arr = P.sets["death_"+dir] || P.sets.death_down;
  const t = animNow - h._deadAt, n = Math.min(arr.length-1, Math.floor(t/170));
  const done = t > arr.length*170, alpha = done ? 0.55 : 1;
  const img = arr[n], s = champPackScale(P, h, h.scale||2.0);
  drawAnimFrameSized(img, {frames:[{x:0, y:0, w:img.width, h:img.height}]}, 0, h.x, h.y, img.width*s, img.height*s, 0.5, 0.94, dir==="side" && h._pleft, alpha);
  return true;
}

// Sprite real de un solo frame por dirección (abajo/derecha/arriba, espejado para
// izquierda) sin ciclo de caminata -Segador y Axiom (ver más abajo) tenían cada uno su
// propia copia idéntica de esta función; ahora es una sola, parametrizada por sus imágenes.
function draw3DirRealSprite(imgs, ready, h, drawScale, alpha){
  if(!ready.down || !ready.right || !ready.up) return false;
  const fx = h.fx||0, fy = h.fy||1;
  let img, flip = false;
  if(Math.abs(fy) >= Math.abs(fx)){
    img = fy < -0.15 ? imgs.up : imgs.down;
  } else {
    img = imgs.right;
    flip = fx < 0;
  }
  const targetH = h.radius*2.7*(drawScale/(h.scale||2.0));
  const s = targetH/img.height;
  const clip = { frames: [{x:0, y:0, w:img.width, h:img.height}] };
  drawAnimFrameSized(img, clip, 0, h.x, h.y, img.width*s, img.height*s, 0.5, 0.94, flip, alpha);
  return true;
}
function drawSegadorReal(h, drawScale, alpha){
  return drawChampPack("segador", h, drawScale, alpha) || draw3DirRealSprite(SEGADOR_REAL_IMG, SEGADOR_REAL_READY, h, drawScale, alpha);
}

// Selecciona y dibuja la pose real de Musashi según su estado (ancla abajo-centro, igual que
// el resto de sprites reales del roster vía drawAnimFrameSized). Si por lo que sea la imagen
// base (idle) no cargó todavía, devuelve false y drawHero() cae al sprite procedural de
// respaldo (GRIDS.musashi/PAL.musashi) en vez de dejar al personaje invisible.
function drawMusashiReal(h, drawScale, alpha){
  if(!MUSASHI_REAL_READY.idle) return false;
  let img;
  if(h.hurtTimer>0 && MUSASHI_REAL_READY.hurt){
    img = MUSASHI_REAL_IMG.hurt;
  } else if(h.attackAnim>0 && h.musashiCastKind==="ronin" && MUSASHI_REAL_READY.ronin1){
    // Corte del Rōnin: windup -> tajo -> recuperación (las 3 poses ya traen la silueta de
    // Musashi adentro del frame, igual que castSkeleton/castGolem del Nigromante: reemplazan
    // el cuerpo normal mientras dura, no se superponen).
    const seq = ["ronin1","ronin2","ronin3"];
    const progress = Math.max(0, Math.min(0.999, 1 - h.attackAnim/(h.musashiCastDur||260)));
    img = MUSASHI_REAL_IMG[seq[Math.floor(progress*seq.length)]];
  } else if(h.attackAnim>0 && h.musashiCastKind==="thousand" && MUSASHI_REAL_READY.thousand1){
    // Mil Cortes: las 4 poses ya traen el remolino de cortes alrededor de Musashi.
    const seq = ["thousand1","thousand2","thousand3","thousand4"];
    const progress = Math.max(0, Math.min(0.999, 1 - h.attackAnim/(h.musashiCastDur||400)));
    img = MUSASHI_REAL_IMG[seq[Math.floor(progress*seq.length)]];
  } else if(h.attackAnim>0 && MUSASHI_REAL_READY.basic1){
    // (basic1 venía cortado por el borde del recorte: el tajo arranca desde basic2)
    const seq = ["basic2","basic3","basic4","basic5"];
    const progress = Math.max(0, Math.min(0.999, 1 - h.attackAnim/190));
    const n = Math.floor(progress*seq.length);
    const key = seq[n] || seq[seq.length-1];
    img = MUSASHI_REAL_READY[key] ? MUSASHI_REAL_IMG[key] : MUSASHI_REAL_IMG.idle;
  } else if(h.moving && MUSASHI_REAL_READY.run1 && MUSASHI_REAL_READY.run2){
    img = (Math.floor((h.animT||0)/140)%2===0) ? MUSASHI_REAL_IMG.run1 : MUSASHI_REAL_IMG.run2;
  } else {
    img = MUSASHI_REAL_IMG.idle;
  }
  const flip = (h.fx||0) < -0.12;
  const targetH = h.radius*2.7*(drawScale/(h.scale||2.0));
  const s = targetH/img.height;
  const clip = { frames: [{x:0, y:0, w:img.width, h:img.height}] };
  drawAnimFrameSized(img, clip, 0, h.x, h.y, img.width*s, img.height*s, 0.5, 0.94, flip, alpha);
  return true;
}
// Estelas de Paso Fantasma (musashiAfterimages, ver musashiSpawnAfterimage): quedaban
// acumulándose en la lista pero nunca se dibujaban -bug real, la habilidad no mostraba nada
// distinto al cruzar al enemigo-. Arte real (ghost1, silueta borrosa) con fundido de salida.
function drawMusashiAfterimages(){
  if(!MUSASHI_REAL_READY.ghost1) return;
  const img = MUSASHI_REAL_IMG.ghost1;
  const s = 78/img.height; // mismo orden de tamaño que el cuerpo real de Musashi
  const clip = { frames: [{x:0, y:0, w:img.width, h:img.height}] };
  for(const a of musashiAfterimages){
    const alpha = Math.max(0, a.life/a.maxLife) * 0.55;
    if(alpha<=0.02) continue;
    drawAnimFrameSized(img, clip, 0, a.x, a.y, img.width*s, img.height*s, 0.5, 0.94, a.fx<-0.12, alpha);
  }
}


// Nigromante — cuerpo principal: mismo patron drawXReal que Musashi/Sylva (una imagen estatica
// por pose), con estados extra para las 3 animaciones de invocacion/plaga (h.nigroCastKind, se
// fija en cada case del switch de castAbility junto al attackAnim generico) y la secuencia de
// transformacion de la ultimate (h.nigroTransformTimer, ver enterAbyssForm).
function drawNigromanteReal(h, drawScale, alpha){
  if(!NIGRO_READY.idle) return false;
  let img;
  if(h.nigroTransformTimer>0 && NIGRO_READY.ultTransform1){
    const seq = ["ultTransform1","ultTransform2","ultTransform3","ultTransform4"];
    const progress = Math.max(0, Math.min(0.999, 1-h.nigroTransformTimer/NIGRO_TRANSFORM_MS));
    const key = seq[Math.floor(progress*seq.length)] || seq[seq.length-1];
    img = NIGRO_READY[key] ? NIGRO_IMG[key] : NIGRO_IMG.idle;
  } else if(h.hurtTimer>0 && NIGRO_READY.hurt){
    img = NIGRO_IMG.hurt;
  } else if(h.attackAnim>0 && h.nigroCastKind==="skeleton" && NIGRO_READY.castSkeleton1){
    const seq = ["castSkeleton1","castSkeleton2","castSkeleton3"];
    const progress = Math.max(0, Math.min(0.999, 1-h.attackAnim/320));
    img = NIGRO_IMG[seq[Math.floor(progress*seq.length)]];
  } else if(h.attackAnim>0 && h.nigroCastKind==="golem" && NIGRO_READY.castGolem1){
    const seq = ["castGolem1","castGolem2"];
    const progress = Math.max(0, Math.min(0.999, 1-h.attackAnim/320));
    img = NIGRO_IMG[seq[Math.floor(progress*seq.length)]];
  } else if(h.attackAnim>0 && h.nigroCastKind==="plague" && NIGRO_READY.castPlague1){
    const seq = ["castPlague1","castPlague2"];
    const progress = Math.max(0, Math.min(0.999, 1-h.attackAnim/320));
    img = NIGRO_IMG[seq[Math.floor(progress*seq.length)]];
  } else if(h.attackAnim>0 && NIGRO_READY.basic1){
    const seq = ["basic1","basic2","basic3","basic4","basic5"];
    const progress = Math.max(0, Math.min(0.999, 1-h.attackAnim/190));
    const key = seq[Math.floor(progress*seq.length)] || seq[seq.length-1];
    img = NIGRO_READY[key] ? NIGRO_IMG[key] : NIGRO_IMG.idle;
  } else if(h.moving && NIGRO_READY.walkA6){
    // Ciclo de caminata real de 6 frames (antes solo 2, walk1/walk2) -mismo zip, sin usar-.
    const seq = ["walkA1","walkA2","walkA3","walkA4","walkA5","walkA6"];
    img = NIGRO_IMG[seq[Math.floor((h.animT||0)/120)%seq.length]];
  } else if(h.moving && NIGRO_READY.walk1 && NIGRO_READY.walk2){
    img = (Math.floor((h.animT||0)/140)%2===0) ? NIGRO_IMG.walk1 : NIGRO_IMG.walk2;
  } else if(NIGRO_READY.idleA5){
    // Ciclo de idle real de 5 frames (antes un solo frame quieto) -mismo zip, sin usar-.
    // (idleA2-A5 traen pedazos del frame vecino -otro Nigromante y bastones sueltos-: el ciclo
    // queda con los dos frames limpios, misma pose y mismo bastón)
    const seq = ["idle","idleA1"];
    img = NIGRO_IMG[seq[Math.floor((h.animT||0)/420)%seq.length]];
  } else {
    img = NIGRO_IMG.idle;
  }
  const flip = (h.fx||0) < -0.12;
  const targetH = h.radius*2.7*(drawScale/(h.scale||2.0));
  const s = targetH/img.height;
  const clip = { frames: [{x:0, y:0, w:img.width, h:img.height}] };
  drawAnimFrameSized(img, clip, 0, h.x, h.y, img.width*s, img.height*s, 0.5, 0.94, flip, alpha);
  return true;
}
// Nigromante transformado — "Demonio Nigromántico" (Encarnación del Abismo). Reemplaza el
// dibujo normal mientras h.nigroDemonForm esté activo (ver enterAbyssForm/exitAbyssForm).
function drawNigromanteDemon(h, drawScale, alpha){
  if(!NIGRO_DEMON_READY.idle) return false;
  let img;
  if(h.attackAnim>0 && h.nigroCastKind==="demonSlam" && NIGRO_DEMON_READY.slam){
    // (el recorte "slam" trae el cartel de texto de la hoja y otro demonio al lado)
    img = NIGRO_DEMON_IMG.attack1;
  } else if(h.attackAnim>0 && h.nigroCastKind==="demonSoulFire" && NIGRO_DEMON_READY.soulFireCast){
    img = NIGRO_DEMON_IMG.soulFireCast;
  } else if(h.attackAnim>0 && NIGRO_DEMON_READY.attack1){
    img = (Math.floor((h.animT||0)/90)%2===0) ? NIGRO_DEMON_IMG.attack1 : NIGRO_DEMON_IMG.attack2;
  } else {
    img = NIGRO_DEMON_IMG.idle;
  }
  const flip = (h.fx||0) < -0.12;
  const targetH = h.radius*2.9*(drawScale/(h.scale||2.0));
  const s = targetH/img.height;
  const clip = { frames: [{x:0, y:0, w:img.width, h:img.height}] };
  drawAnimFrameSized(img, clip, 0, h.x, h.y, img.width*s, img.height*s, 0.5, 0.94, flip, alpha);
  return true;
}
// Pose real de muerte (cuerpo tendido) de Musashi y del Nigromante: arte que ya venía embebido
// pero nunca se mostraba (caían con el sprite de pie rotado). El recorte se limita al área útil
// del PNG, fuera quedan restos del corte original (una línea y un fragmento suelto).
const FALLEN_REAL = {
  musashi:    { img:()=>MUSASHI_REAL_READY.death && MUSASHI_REAL_IMG.death, clip:{ frames:[{x:26, y:56, w:114, h:38}] } },
  nigromante: { img:()=>NIGRO_READY.death && NIGRO_IMG.death, clip:{ frames:[{x:8, y:80, w:122, h:43}] } },
};
function drawRealFallen(h, alpha){
  const d = FALLEN_REAL[h.classKey]; if(!d) return false;
  const img = d.img(); if(!img) return false;
  const f = d.clip.frames[0];
  const w = h.radius*2.7, hh = w*f.h/f.w;
  drawAnimFrameSized(img, d.clip, 0, h.x, h.y, w, hh, 0.5, 0.85, (h.fx||0) < -0.12, alpha);
  return true;
}
// Campeón caído (propio o, en la Arena Divina, rival): reacción al golpe, caída de costado y
// queda tendido semitransparente, o la pose real de muerte cuando existe arte para eso.
function drawFallenHero(h){
  if(CHAMP_PACK[h.classKey] && drawChampPackDeath(h)) return; // Segador/Axiom: muerte con sus frames reales
  if(h.classKey==="mago" && drawMagoFallen(h, 0.5)) return; // el propio arte ya lo muestra boca abajo
  // DEATH del campeón con su propio sprite real: reacción al golpe, caída de costado y
  // queda tendido semitransparente (antes: siempre el sprite procedural, fuera cual fuera el arte).
  if(!h._deadAt){ h._deadAt = animNow; vfxBurst(h.x, h.y-20, 12, "blood", 120, 420, 3, 2, -30, 0); }
  const dp = Math.min(1, (animNow-h._deadAt)/620);
  const side = (h.fx||0) < -0.12 ? -1 : 1;
  const fall = _ease(Math.max(0, (dp-0.15)/0.85));
  // con pose real de muerte: el cuerpo que cae se funde con el arte tendido y queda ese
  const realFallen = !!(FALLEN_REAL[h.classKey] && FALLEN_REAL[h.classKey].img());
  if(realFallen && dp>=1){ drawRealFallen(h, 0.55); return; }
  ctx.save();
  ctx.translate(h.x - side*6*Math.sin(Math.min(1,dp/0.15)*Math.PI), h.y);
  ctx.rotate(-side*Math.PI/2*fall);
  ctx.translate(-h.x, -h.y);
  const m = ANIM_ALPHA_MUL;
  ANIM_ALPHA_MUL = realFallen ? 1-fall : 1-0.5*fall; ctx.globalAlpha = ANIM_ALPHA_MUL;
  drawHeroBody(h, h.scale, false, false);
  ANIM_ALPHA_MUL = m;
  ctx.restore();
  if(realFallen && fall>0) drawRealFallen(h, 0.55*fall);
}
// Esqueletos invocados (Levantar Esqueletos): entidades livianas propias (no son "heroes"),
// mismo criterio que el Lobo Espectral de Sylva -objeto simple con x/y/hp/IA, dibujado y
// actualizado aparte del pipeline de heroes/enemigos-.
function drawSkeletonMinion(sk){
  if(!NIGRO_SKEL_READY.warrior) return;
  const isMage = sk.type==="mage";
  let img;
  // (el recorte "mageAtk" mezcla pedazos de dos frames: atacando, el mago usa su pose normal
  // y el ataque se lee por el proyectil)
  if(sk.attackAnim>0){ img = isMage ? NIGRO_SKEL_IMG.mage : NIGRO_SKEL_IMG.warriorAtk; }
  else if(!isMage && sk.moving && NIGRO_SKEL_READY.walk1){
    // Pose real de caminata del esqueleto guerrero (el balanceo lo pone AnimFX). El recorte
    // "walk2" era medio esqueleto cortado por la grilla y no se usa.
    img = NIGRO_SKEL_IMG.walk1;
  }
  else { img = isMage ? NIGRO_SKEL_IMG.mage : NIGRO_SKEL_IMG.warrior; }
  const flip = (sk.fx||0) < -0.12;
  const targetH = 46;
  const s = targetH/img.height;
  const clip = { frames: [{x:0,y:0,w:img.width,h:img.height}] };
  drawShadow(sk.x, sk.y, 16);
  sk._animKey = "nigro_skel";
  const Pk = animPose(sk, animProfileOf(sk), false);
  ctx.save(); animApply(sk.x, sk.y, Pk);
  drawAnimFrameSized(img, clip, 0, sk.x, sk.y, img.width*s, img.height*s, 0.5, 0.92, flip, sk.hitFlash>0?0.6:1);
  ctx.restore();
  if(sk.hp<sk.maxHp){
    ctx.fillStyle="rgba(0,0,0,0.5)"; ctx.fillRect(sk.x-16,sk.y-targetH-10,32,4);
    ctx.fillStyle="#7ad48a"; ctx.fillRect(sk.x-16,sk.y-targetH-10,32*Math.max(0,sk.hp/sk.maxHp),4);
  }
}
// Gólem invocado (Crear Golem): único, con piel visual segun el talento de Maestro de Golems
// (piedra por defecto, fuego/hielo si el talento correspondiente fue elegido -ver
// nigromanteGolemSkin()-, coherente con que la eleccion tambien cambia la forma demoniaca).
function drawGolemReal(g){
  const skin = g.skin||"stone";
  const ready = skin==="fire" ? NIGRO_GOLEM_READY.fire : skin==="ice" ? NIGRO_GOLEM_READY.ice : NIGRO_GOLEM_READY.stone;
  if(!ready) return;
  const img = g.attackAnim>0 && skin==="stone" && NIGRO_GOLEM_READY.stoneAtk ? NIGRO_GOLEM_IMG.stoneAtk
    : (skin==="fire" ? NIGRO_GOLEM_IMG.fire : skin==="ice" ? NIGRO_GOLEM_IMG.ice : NIGRO_GOLEM_IMG.stone);
  const flip = (g.fx||0) < -0.12;
  const targetH = 96;
  const s = targetH/img.height;
  const clip = { frames: [{x:0,y:0,w:img.width,h:img.height}] };
  drawShadow(g.x, g.y, 34);
  g._animKey = "nigro_golem";
  const Pg = animPose(g, animProfileOf(g), false);
  ctx.save(); animApply(g.x, g.y, Pg);
  drawAnimFrameSized(img, clip, 0, g.x, g.y, img.width*s, img.height*s, 0.5, 0.94, flip, g.hitFlash>0?0.6:1);
  ctx.restore();
  if(g.hp<g.maxHp){
    ctx.fillStyle="rgba(0,0,0,0.5)"; ctx.fillRect(g.x-26,g.y-targetH-14,52,5);
    ctx.fillStyle="#8fae7a"; ctx.fillRect(g.x-26,g.y-targetH-14,52*Math.max(0,g.hp/g.maxHp),5);
  }
}

function drawSylvaReal(h, drawScale, alpha){
  if(!SYLVA_REAL_READY.idle) return false;
  let img;
  if(h.sylvaCharging && SYLVA_REAL_READY.chargeAim){
    // Flecha Perforante cargando (mantiene pulsado): antes no se veía nada distinto -bug real,
    // la habilidad "cargar" no mostraba ningún cambio en el cuerpo de Sylva-.
    img = SYLVA_REAL_IMG.chargeAim;
  } else if(h.attackAnim>0 && h.sylvaCastKind==="piercing" && SYLVA_REAL_READY.release1){
    // Disparo de Flecha Perforante ya soltada: 2 poses reales en vez de caer directo en el
    // combo básico (que no correspondía a esta habilidad).
    const seq = ["release1","release2"];
    const progress = Math.max(0, Math.min(0.999, 1 - h.attackAnim/(h.sylvaCastDur||180)));
    img = SYLVA_REAL_IMG[seq[Math.floor(progress*seq.length)]];
  } else if(h.attackAnim>0 && SYLVA_REAL_READY.atk1){
    const seq = ["atk1","atk2","atk3","atk4","atk5","atk6"];
    const progress = Math.max(0, Math.min(0.999, 1 - h.attackAnim/190));
    const key = seq[Math.floor(progress*seq.length)] || seq[seq.length-1];
    img = SYLVA_REAL_READY[key] ? SYLVA_REAL_IMG[key] : SYLVA_REAL_IMG.idle;
  } else if(h.moving && SYLVA_REAL_READY.run1 && SYLVA_REAL_READY.run2){
    img = (Math.floor((h.animT||0)/110)%2===0) ? SYLVA_REAL_IMG.run1 : SYLVA_REAL_IMG.run2;
  } else {
    img = SYLVA_REAL_IMG.idle;
  }
  const flip = (h.fx||0) < -0.12;
  const targetH = h.radius*2.7*(drawScale/(h.scale||2.0));
  const s = targetH/img.height;
  const clip = { frames: [{x:0, y:0, w:img.width, h:img.height}] };
  drawAnimFrameSized(img, clip, 0, h.x, h.y, img.width*s, img.height*s, 0.5, 0.94, flip, alpha);
  return true;
}
// Lobo Espectral (Cacería Salvaje): entidad liviana propia (no vive en `enemies` ni `heroes`,
// ver wolfState en makeHero/updateSylvaWolf), con su propio set de 4 poses reales.
function drawSpectralWolf(w){
  if(!WOLF_REAL_READY.idle) return;
  let img;
  if(w.biteTimer>0 && WOLF_REAL_READY.bite) img = WOLF_REAL_IMG.bite;
  else if(w.jumping && WOLF_REAL_READY.jump) img = WOLF_REAL_IMG.jump;
  // (el recorte "run" venía sin cabeza, cortado por la grilla: corriendo usa la pose de perfil)
  else img = WOLF_REAL_IMG.idle;
  const flip = (w.fx||0) < -0.12;
  // escala fija por píxel (la del idle original, 54px sobre 62): los recortes ya no traen el
  // texto de la hoja debajo, y así las 3 poses se ven del mismo tamaño
  const s = 54/62;
  const clip = { frames: [{x:0,y:0,w:img.width,h:img.height}] };
  drawShadow(w.x, w.y, 22);
  drawAnimFrameSized(img, clip, 0, w.x, w.y, img.width*s, img.height*s, 0.5, 0.95, flip, 0.92);
}
const AXIOM_VFX_DEF = {
  err404: {frames:13, w:120, h:160},
  overwrite: {frames:13, w:125, h:140},
  teleport_out: {frames:6, w:120, h:135},
  teleport_in: {frames:6, w:137, h:135},
  forcequit: {frames:13, w:120, h:145},
};
let activeAxiomVfx = [];
// Un AnimAtlas por tipo (tira horizontal) para los bursts de Axiom -mismo dato
// AXIOM_VFX_DEF de siempre, ahora armando el clip una sola vez al cargar.
const AXIOM_VFX_ATLASES = {};
for(const _k in AXIOM_VFX_DEF){
  const d = AXIOM_VFX_DEF[_k];
  AXIOM_VFX_ATLASES[_k] = { img: AXIOM_VFX_IMG[_k], ready:()=>AXIOM_VFX_READY[_k], clip: buildStripClip(d.frames, d.w, d.h) };
}
// (18 fps) sin importar cuántos frames traiga la hoja -mismo criterio que BOSS_FX/SKILL_ATLAS-.
function drawAxiomVfxBurst(x, y, key){
  const def = AXIOM_VFX_DEF[key];
  const life = def ? (def.frames/18)*1000 : 650;
  activeAxiomVfx.push({key, x, y, age:0, life});
}
function updateAxiomVfx(dt){
  for(const v of activeAxiomVfx) v.age += dt;
  activeAxiomVfx = activeAxiomVfx.filter(v=>v.age < v.life);
}
function drawAxiomVfxActive(){
  for(const v of activeAxiomVfx){
    const atlas = AXIOM_VFX_ATLASES[v.key];
    if(!atlas || !atlas.ready()) continue;
    const clip = atlas.clip;
    const f = clip.frames[0];
    const t = v.age/v.life;
    const alpha = t<0.15 ? t/0.15 : 1-((t-0.15)/0.85);
    const scale = 1 + t*0.25;
    const h2 = 90*scale, s = h2/f.h;
    const n = Math.min(clip.frames.length-1, Math.floor(t*clip.frames.length));
    drawAnimFrameSized(atlas.img, clip, n, v.x, v.y, f.w*s, f.h*s, 0.5, 0.5, false, Math.max(0,Math.min(1,alpha)));
  }
}

function drawAxiomReal(h, drawScale, alpha){
  return drawChampPack("axiom", h, drawScale, alpha) || draw3DirRealSprite(AXIOM_REAL_IMG, AXIOM_REAL_READY, h, drawScale, alpha);
}

/* ============================================================
   ANIMFX + VFX — sistema central de animación procedural y efectos visuales.
   Todo lo de acá transforma SOLO el dibujo (ctx.translate/rotate/scale y alpha):
   nunca toca x/y/radius/hp/cooldowns, así que hitboxes, colisiones y balance quedan
   exactamente iguales. Sobre sprites con hoja completa (atlas con caminata/ataque)
   las transformaciones se atenúan y actúan como complemento; sobre sprites estáticos
   o de pocas poses aportan todo el movimiento (respiración, pasos, ataques, golpes).
   ============================================================ */
let ANIM_ALPHA_MUL = 1;          // multiplicador de alpha para el cuerpo (lo respetan drawAnimFrame/Sized)
let animNow = 0, animDt = 16;    // reloj de render (ms) y dt del último frame
let animFlashBudget = 0;         // re-dibujados "lighter" de hit flash permitidos por frame
let animCrowd = 0;               // enemigos visibles el frame anterior (para LOD)
let _animCrowdCount = 0;

const ANIM_TIER = {
  // idle/walk/lean/attack = cuánto de cada preset se aplica según cuántos frames reales tiene el sprite
  full:    {idle:0.30, walk:0.0, lean:0.45, attack:0.45},
  walk:    {idle:0.40, walk:0.15, lean:0.6, attack:1.0},
  partial: {idle:0.70, walk:0.55, lean:0.8, attack:0.8},
  static:  {idle:1.0,  walk:1.0, lean:1.0, attack:1.0},
};
const ANIM_DEFAULT = {speed:1, weight:1, amp:1, recoil:1, lunge:8, cast:1, impact:1, particle:"spark", material:"flesh", basic:"melee", death:"fall", tier:null};
const ANIM_PROFILES = {
  // ---- campeones ----
  tanque:     {speed:0.8, weight:1.6, amp:0.7, recoil:1.2, lunge:12, cast:0.8, impact:1.5, particle:"spark",  basic:"melee",  tier:"full"},
  guerrero:   {speed:1.3, weight:0.8, amp:0.9, recoil:0.8, lunge:14, cast:0.8, impact:1.1, particle:"blood",  basic:"melee",  tier:"full"},
  mago:       {speed:0.9, weight:0.8, amp:0.5, recoil:0.4, lunge:2,  cast:1.6, impact:1.0, particle:"arcane", basic:"cast",   tier:"full"},
  soporte:    {speed:0.9, weight:0.9, amp:0.6, recoil:0.4, lunge:3,  cast:1.3, impact:0.9, particle:"holy",   basic:"cast",   tier:"full"},
  profeta:    {speed:1.0, weight:0.8, amp:0.6, recoil:0.5, lunge:4,  cast:1.4, impact:1.0, particle:"holy",   basic:"cast",   tier:"full"},
  segador:    {speed:0.85,weight:1.5, amp:0.9, recoil:1.3, lunge:16, cast:1.0, impact:1.5, particle:"blood",  basic:"melee",  tier:"static"},
  axiom:      {speed:1.1, weight:0.9, amp:0.6, recoil:0.6, lunge:4,  cast:1.4, impact:1.0, particle:"glitch", basic:"cast",   tier:"static"},
  musashi:    {speed:1.4, weight:0.8, amp:0.8, recoil:0.7, lunge:18, cast:0.9, impact:1.2, particle:"steel",  basic:"melee",  tier:"static"},
  cazadora:   {speed:1.2, weight:0.8, amp:0.8, recoil:1.0, lunge:4,  cast:1.0, impact:1.0, particle:"leaf",   basic:"ranged", tier:"static"},
  nigromante: {speed:0.8, weight:1.0, amp:0.45,recoil:0.5, lunge:3,  cast:1.5, impact:1.1, particle:"necro",  basic:"cast",   tier:"static"},
  // ---- invocaciones ----
  nigro_skel: {speed:1.4, weight:0.6, amp:1.1, lunge:8,  impact:0.8, particle:"bone", material:"bone", tier:"static"},
  nigro_golem:{speed:0.55,weight:2.4, amp:0.6, lunge:12, impact:2.0, particle:"rock", material:"rock", tier:"static"},
  // ---- enemigos (personalidad; el resto usa el default ajustado por rango/tamaño) ----
  esqueleto:          {speed:1.4, weight:0.6, amp:1.2, lunge:8,  impact:0.8, material:"bone",  death:"crumble"},
  esqueleto_h:        {speed:1.2, weight:0.9, amp:1.0, lunge:10, impact:1.0, material:"bone",  death:"frames"},
  zombie:             {speed:0.7, weight:1.2, amp:1.1, lunge:6,  impact:0.9, material:"rot", death:"frames"},
  demonio_menor:      {speed:1.3, weight:0.9, lunge:12, material:"ember"},
  demonio_mago:       {speed:0.9, cast:1.4, basic:"cast", material:"ember", particle:"ember"},
  demonio_mayor:      {speed:0.7, weight:2.2, amp:0.7, lunge:18, cast:1.5, impact:2.2, material:"ember", particle:"ember", death:"collapse"},
  golem:              {speed:0.55,weight:2.4, amp:0.6, lunge:14, impact:2.2, material:"rock",  death:"crumble"},
  lobo_artico:        {speed:1.5, weight:0.6, lunge:12, material:"flesh"},
  golem_hielo:        {speed:0.6, weight:2.0, amp:0.7, lunge:10, impact:1.8, material:"ice",   death:"frames"},
  dragoncito_hielo:   {speed:1.3, weight:0.6, basic:"ranged", material:"ice"},
  angel_hielo:        {speed:0.9, basic:"cast", cast:1.3, material:"ice", death:"dissolve"},
  demonio_hielo_fuego:{speed:1.0, weight:1.2, lunge:12, material:"ember", death:"frames"},
  dragon_hielo:       {speed:0.7, weight:2.0, amp:0.8, basic:"ranged", impact:1.8, material:"ice", death:"collapse"},
  mago_hielo_cristal: {speed:0.9, basic:"cast", cast:1.6, material:"ice", death:"dissolve"},
  angel_caido_hielo:  {speed:0.8, weight:2.0, basic:"cast", cast:1.7, impact:2.0, material:"ice", death:"collapse"},
  duende_bosque:      {speed:1.5, weight:0.5, amp:1.3, lunge:8, material:"leaf", death:"frames"},
  enjambre_hadas:     {speed:1.3, weight:0.3, amp:1.4, basic:"ranged", material:"spirit", death:"dissolve"},
  bestia_bosque:      {speed:1.3, weight:1.0, lunge:14, material:"flesh", death:"frames"},
  cu_sith:            {speed:1.4, weight:0.9, lunge:16, material:"spirit"},
  ent:                {speed:0.5, weight:2.4, amp:0.6, lunge:12, impact:2.0, material:"wood", death:"frames"},
  dama_bosque:        {speed:0.9, basic:"cast", cast:1.4, material:"spirit", death:"dissolve"},
  doblador_guerrero:  {speed:1.1, lunge:14, material:"spirit", death:"dissolve"},
  doblador_arquera:   {basic:"ranged", material:"spirit", death:"dissolve"},
  doblador_picaro:    {speed:1.5, weight:0.7, lunge:16, material:"spirit", death:"dissolve"},
  doblador_clerigo:   {basic:"cast", cast:1.3, material:"spirit", death:"dissolve"},
  jinete_sin_cabeza:  {speed:0.9, weight:2.0, lunge:20, impact:2.2, material:"shadow", particle:"shadow", death:"collapse"},
  escorpion_gigante:  {speed:1.4, weight:0.7, lunge:10, material:"chitin"},
  golem_piedra:       {speed:0.55,weight:2.2, lunge:12, impact:2.0, material:"rock", death:"crumble"},
  medusa:             {speed:1.0, basic:"ranged", material:"stone"},
  druida_arena:       {basic:"cast", cast:1.4, material:"sand"},
  esfinge:            {speed:0.9, weight:1.6, basic:"ranged", impact:1.6, material:"sand"},
  guardian_laberinto: {speed:0.6, weight:2.2, lunge:14, impact:2.1, material:"rock", death:"frames"},
  minotauro:          {speed:1.0, weight:1.9, amp:0.9, lunge:26, impact:2.4, material:"flesh", death:"collapse"},
  tiburon_joven:      {speed:1.4, weight:0.8, lunge:16, material:"water", death:"sink"},
  medusa_electrica:   {speed:0.7, weight:0.4, amp:1.4, basic:"cast", particle:"shock", material:"shock", death:"dissolve"},
  cangrejo_acorazado: {speed:0.8, weight:1.6, lunge:8, impact:1.5, material:"shell", death:"sink"},
  sirena_abisal:      {basic:"ranged", cast:1.3, material:"water", particle:"water", death:"sink"},
  anguila_electrica:  {speed:1.6, weight:0.5, amp:0.8, lunge:12, material:"shock", particle:"shock", death:"frames"},
  tiburon_blanco:     {speed:1.2, weight:1.4, lunge:20, impact:1.8, material:"water", death:"sink"},
  kraken_joven:       {speed:0.6, weight:2.3, amp:0.7, lunge:8, impact:2.0, material:"ink", particle:"ink", death:"frames"},
  leviatan:           {speed:0.8, weight:2.6, amp:0.5, lunge:24, impact:2.4, material:"water", particle:"water", death:"frames"},
};
// Paletas por tipo de partícula/material: colores de las chispas + color (r,g,b) del glow.
const VFX_PAL = {
  spark:["#ffd24a","#fff3b0","#ffffff","255,210,74"], blood:["#c81e1e","#8a1010","#ff5a5a","255,60,60"],
  arcane:["#b98cff","#7fd0ff","#ffffff","170,130,255"], holy:["#ffe79a","#fff6d0","#ffd24a","255,225,140"],
  glitch:["#4affd2","#ff4ad8","#ffffff","80,255,210"], steel:["#e8eef4","#9fb4c8","#ffffff","220,235,255"],
  leaf:["#8fd46a","#4a8a2e","#d8f0a0","150,220,110"], necro:["#5ae68c","#2e7a4a","#b98cff","90,230,140"],
  ember:["#ff6a2a","#ffb347","#ffd24a","255,120,40"], bone:["#ece4cc","#cfc4a4","#fffbe8","236,228,204"],
  rot:["#6d7d55","#8a9a4a","#3e4a2e","130,150,80"], rock:["#8a8a82","#6b6f52","#b0ae9c","170,170,160"],
  ice:["#bfe8ff","#8fd0ff","#ffffff","160,220,255"], flesh:["#b0402c","#e04a3a","#7a2a1e","230,80,60"],
  spirit:["#c9d8ff","#9fb0e0","#ffffff","200,215,255"], wood:["#8a6a42","#5a4a2e","#7a9a4a","150,120,70"],
  shadow:["#5a5a62","#2e2e38","#b0a0ff","140,120,200"], chitin:["#c99a4a","#8a6a2e","#e0c070","220,170,80"],
  stone:["#8a9a8a","#5a6a5a","#b0c0b0","160,180,160"], sand:["#e0c070","#c2a05a","#fff0c0","230,200,120"],
  water:["#7fd0e0","#cfeeff","#3a8aa0","120,210,230"], shock:["#ffe86a","#c9a8ff","#ffffff","255,232,106"],
  shell:["#b0402c","#ff8a5a","#e0c0a0","255,140,90"], ink:["#6a3a6e","#2a1a3a","#c98fe0","200,140,230"],
};

function animProfileOf(ent){
  if(ent._ap) return ent._ap;
  const key = (ent.classKey && ANIM_PROFILES[ent.classKey]) ? ent.classKey : (ent._animKey || ent.type);
  const src = ANIM_PROFILES[key] || {};
  const p = Object.assign({}, ANIM_DEFAULT, src);
  if(!src.basic && ent.ranged) p.basic = "ranged";
  if(!src.weight && ent.radius) p.weight = Math.max(0.6, Math.min(2.4, ent.radius/26));
  if(!p.tier){
    if(ENEMY_ANIM_ATLASES[ent.type]) p.tier = "full";
    else if(REAL_ANIM_ATLASES[ent.type]) p.tier = "walk";
    else if(ICE_REAL_IMG[ent.type]){ p.tier = "static"; p.hasBob = true; }
    else if(ACUA_ENEMY_TYPES[ent.type]) p.tier = "static";
    else p.tier = "partial";
  }
  p.T = ANIM_TIER[p.tier] || ANIM_TIER.static;
  p.sizeK = Math.max(0.7, Math.min(3, (ent.radius||24)/24));
  p.isBoss = ent.rank==="jefe" || ent.rank==="subjefe";
  ent._ap = p;
  return p;
}
const ACUA_ENEMY_TYPES = {tiburon_joven:1, tiburon_blanco:1, cangrejo_acorazado:1, medusa_electrica:1, sirena_abisal:1, anguila_electrica:1, kraken_joven:1, leviatan:1};

// Pose de trabajo reutilizada (sin allocations por frame).
const POSE = {ox:0, oy:0, sx:1, sy:1, rot:0, flash:0, glow:0, glowRgb:null};
function _ease(t){ return t<0?0:t>1?1:t*t*(3-2*t); }
function _easeOut(t){ t = t<0?0:t>1?1:t; return 1-(1-t)*(1-t); }
function _animState(ent){
  let an = ent._an;
  if(!an){
    an = ent._an = {lx:ent.x, ly:ent.y, spd:0, ph:Math.random()*6.28, pAtk:0, aDur:0, aKind:0, fired:false,
      pHit:0, hdx:0, hdy:0, sp:null, spT:0, spDur:0, spImpact:0.65, spFired:false, seed:Math.random()*100, lastSeen:0};
  }
  return an;
}
// Dispara una variante especial (jefes/élites): bossHeavyAttack, bossCast, bossCharge,
// bossGroundSlam, bossPhaseTransition. `impactAt` = fracción de la duración donde "pega".
function animTrigger(ent, kind, durMs, impactAt){
  const an = _animState(ent);
  an.sp = kind; an.spT = 0; an.spDur = durMs; an.spImpact = impactAt!==undefined ? impactAt : 0.65; an.spFired = false;
}
// Tipo de ataque según quién es: 1 melee, 2 ranged, 3 cast, 4 cast fuerte (ulti)
function _attackKind(ent, prof){
  if(ent._animCastKind){ const k = ent._animCastKind===2 ? 4 : 3; ent._animCastKind = 0; return k; }
  return prof.basic==="ranged" ? 2 : (prof.basic==="cast" ? 3 : 1);
}

function animPose(ent, prof, isHero){
  const P = POSE, an = _animState(ent), T = prof.T;
  P.ox = 0; P.oy = 0; P.sx = 1; P.sy = 1; P.rot = 0; P.flash = 0; P.glow = 0; P.glowRgb = null;
  const dt = state==="playing" ? animDt : 0;
  // velocidad real a partir del desplazamiento (sincroniza el paso con lo que se mueve de verdad)
  const mdx = ent.x-an.lx, mdy = ent.y-an.ly, md = Math.hypot(mdx,mdy);
  an.lx = ent.x; an.ly = ent.y;
  const inst = (md > 60 || animNow-an.lastSeen > 200) ? 0 : md/(Math.max(8,dt)/1000); // salto/teleport o recién visible -> ignorar
  an.lastSeen = animNow;
  an.spd = an.spd*0.7 + inst*0.3;
  const fx = ent.fx||0, fy = ent.fy!==undefined ? ent.fy : 1;
  const dirS = fx < -0.12 ? -1 : 1;
  const amp = prof.amp, K = prof.sizeK;
  const baseSpd = ent.speed || 160;
  const moving = an.spd > 12;
  const crowd = !isHero && !prof.isBoss && animCrowd > 70;

  // ---- IDLE / WALK ----
  if(moving){
    const stride = (ent.radius||22)*2.2*Math.sqrt(prof.weight);
    an.ph += (an.spd*dt/1000)/stride*Math.PI*2;
    const s = Math.sin(an.ph);
    const bob = Math.abs(s)*2.4*amp*T.walk*K/Math.pow(prof.weight,0.3);
    P.oy -= bob;
    if(prof.weight>1.4 && T.walk>0){ const land = 1-Math.abs(s); P.sy -= land*0.035*T.walk; P.sx += land*0.025*T.walk; }
    const lean = Math.min(1, an.spd/Math.max(40,baseSpd));
    P.rot += dirS*0.055*amp*T.lean*lean;
  } else if(!crowd){
    const t = animNow/1000*(Math.PI*2)/(1.7/prof.speed) + an.seed;
    const br = Math.sin(t);
    const k = T.idle*(prof.hasBob?0.35:1);
    P.sy += br*0.022*amp*k; P.sx -= br*0.011*amp*k;
    P.oy -= Math.max(0,br)*0.9*amp*k*K;
  }

  // ---- ataques (flanco de subida de attackAnim = golpe nuevo) ----
  const atk = ent.attackAnim||0;
  if(atk > an.pAtk + 1){
    const bossAtk = prof.isBoss && atk>=400 && !an.sp;
    if(bossAtk){ animTrigger(ent, ent.ranged||prof.basic!=="melee" ? "bossCast" : "bossHeavyAttack", atk+200, 0.35); an.aKind = 0; }
    else if(!an.sp){ an.aDur = atk; an.aKind = _attackKind(ent, prof); an.fired = false; }
  }
  an.pAtk = atk;
  if(an.aKind && atk>0 && an.aDur>0){
    const p = 1 - atk/an.aDur;
    const L = prof.lunge*K*T.attack;
    const W = Math.min(1.6, 0.6+0.4*prof.weight);
    let fwd = 0;
    if(an.aKind===1){ // MELEE: anticipación, retroceso, avance, impacto, recuperación
      if(p<0.15){ const a=p/0.15; fwd = -0.35*L*_ease(a); P.sx += 0.06*a*W; P.sy -= 0.07*a*W; }
      else if(p<0.35){ const a=(p-0.15)/0.2; fwd = -0.35*L + 1.35*L*_easeOut(a); P.sx -= 0.04; P.sy += 0.06; }
      else if(p<0.45){ fwd = L; P.sx += 0.07*prof.impact*0.6; P.sy -= 0.06*prof.impact*0.6;
        if(!an.fired){ an.fired = true; if(isHero || prof.isBoss) vfxBurst(ent.x+fx*(ent.radius||20), ent.y+fy*(ent.radius||20)*0.6-14, 3, prof.particle, 70, 180, 3, isHero?2:1, 0, 1); } }
      else { const a=(p-0.45)/0.55; fwd = L*(1-_ease(a)); }
    } else if(an.aKind===2){ // RANGED: preparación, carga, disparo, recoil, recuperación
      if(p<0.2){ const a=p/0.2; P.sy -= 0.04*a; P.oy += a; }
      else if(p<0.45){ const a=(p-0.2)/0.25; P.sx += 0.02*a; P.glow = 0.5*a; }
      else if(p<0.6){ const a=(p-0.45)/0.15; fwd = -prof.recoil*6*K*T.attack*_easeOut(a); P.glow = 0.5*(1-a);
        if(!an.fired){ an.fired = true; if(isHero) vfxBurst(ent.x+fx*16, ent.y+fy*10-18, 3, prof.particle, 60, 160, 2, 2, 0, 1); } }
      else { const a=(p-0.6)/0.4; fwd = -prof.recoil*6*K*T.attack*(1-_ease(a)); }
    } else { // CAST (3) / CAST fuerte (4): anticipación, acumulación, ejecución, partículas, recuperación
      const C = prof.cast*(an.aKind===4?1.5:(isHero && prof.basic==="cast" && an.aKind===3 && an.aDur<200 ? 0.5 : 1));
      if(p<0.2){ const a=p/0.2; P.sy -= 0.05*a*C*0.6; P.oy += a*1.2; }
      else if(p<0.55){ const a=(p-0.2)/0.35; P.oy -= 3*C*a; P.sy += 0.03*a*C; P.glow = 0.35+0.45*a*Math.min(1.4,C);
        if(isHero && Math.random()<0.5) vfxConverge(ent.x, ent.y-(ent.radius||20)*1.4, prof.particle, 26*C, 1); }
      else if(p<0.68){ const a=(p-0.55)/0.13; P.oy -= 3*C*(1-a*0.5); const pop = Math.sin(a*Math.PI)*0.06*C; P.sx += pop; P.sy += pop; P.glow = 0.8;
        if(!an.fired){ an.fired = true; vfxBurst(ent.x, ent.y-(ent.radius||20)*1.4, isHero?Math.round(6*C):3, prof.particle, 90*C, 300, 3, isHero?2:(prof.isBoss?1:0), -20, 0);
          if(isHero && an.aKind===4) vfxShock(ent.x, ent.y, 18, 70*C, VFX_PAL[prof.particle]?VFX_PAL[prof.particle][3]:"255,255,255", 380, 1); } }
      else { const a=(p-0.68)/0.32; P.oy -= 1.5*C*(1-_ease(a)); P.glow = 0.8*(1-a); }
      if(P.glow>0) P.glowRgb = (VFX_PAL[prof.particle]||VFX_PAL.spark)[3];
    }
    P.ox += fx*fwd; P.oy += fy*fwd*0.6;
    if(P.glow>0 && !P.glowRgb) P.glowRgb = (VFX_PAL[prof.particle]||VFX_PAL.spark)[3];
  } else if(atk<=0){ an.aKind = 0; ent._animCastKind = 0; }

  // ---- anticipación de habilidades con telegraph ya existentes (cargas, golpes al suelo, canto) ----
  if(ent.chargeTelegraph>0 || ent.chargeTelegraph2>0){
    const sh = (Math.random()-0.5)*1.6*K;
    P.ox += -fx*5*K + sh; P.oy += -fy*3*K; P.sx += 0.05; P.sy -= 0.06;
  } else if(ent.charging || ent.dashing || ent.charging2){
    P.sx += 0.10; P.sy -= 0.08; P.rot += dirS*0.08;
  }
  if(ent.slamTelegraph>0){ const a = 1-ent.slamTelegraph/600; P.oy -= 7*_ease(a)*K; P.sy += 0.05*a; }
  if(ent.dischargeTelegraph>0 || ent.songTelegraph>0 || ent.tentacleTelegraph>0 || ent.sweepTelegraph>0){
    P.glow = Math.max(P.glow, 0.55+0.25*Math.sin(animNow/60)); P.glowRgb = (VFX_PAL[prof.particle]||VFX_PAL.spark)[3];
    P.sy += 0.03*Math.sin(animNow/50);
  }

  // ---- variantes de jefe ----
  if(an.sp){
    an.spT += dt;
    const q = Math.min(1, an.spT/an.spDur), I = an.spImpact;
    const L = prof.lunge*K;
    const rgb = (VFX_PAL[prof.particle]||VFX_PAL.spark)[3];
    if(an.sp==="bossHeavyAttack"){
      if(q<I){ const a=_ease(q/I); P.rot -= dirS*0.12*a; P.oy -= 5*a*K; P.sx += 0.06*a; P.sy += 0.06*a; P.ox -= fx*L*0.3*a; }
      else if(q<I+0.12){ const a=(q-I)/0.12; P.ox += fx*L*1.4*_easeOut(a); P.oy += fy*L*0.8*_easeOut(a); P.rot += dirS*0.10; P.sx += 0.08; P.sy -= 0.08;
        if(!an.spFired){ an.spFired = true; vfxImpactHeavy(ent, prof, 0.8); } }
      else { const a=(q-I-0.12)/(1-I-0.12); P.ox += fx*L*1.4*(1-_ease(a)); P.oy += fy*L*0.8*(1-_ease(a)); }
    } else if(an.sp==="bossCast"){
      if(q<I){ const a=q/I; P.oy -= 7*_ease(a)*K; P.sy += 0.05*a; P.glow = 0.4+0.6*a+0.15*Math.sin(animNow/45); P.glowRgb = rgb;
        if(Math.random()<0.7) vfxConverge(ent.x, ent.y-(ent.radius||40)*1.2, prof.particle, 60*K, 2); }
      else if(q<I+0.12){ const a=(q-I)/0.12; P.oy -= 7*K*(1-a); const pop=Math.sin(a*Math.PI)*0.1; P.sx+=pop; P.sy+=pop; P.glow = 1; P.glowRgb = rgb;
        if(!an.spFired){ an.spFired = true; vfxBurst(ent.x, ent.y-(ent.radius||40), 16, prof.particle, 160, 420, 3, 2, -10, 0); vfxShock(ent.x, ent.y, (ent.radius||40)*0.5, (ent.radius||40)*2.6, rgb, 520, 2); } }
      else { const a=(q-I-0.12)/(1-I-0.12); P.glow = 1-a; P.glowRgb = rgb; }
    } else if(an.sp==="bossCharge"){
      if(q<I){ const a=q/I; P.ox -= fx*L*0.45*_ease(a) + (Math.random()-0.5)*2*K; P.oy -= fy*L*0.2*_ease(a); P.sx += 0.08*a; P.sy -= 0.08*a; }
      else { P.sx += 0.12; P.sy -= 0.1; P.rot += dirS*0.07; }
    } else if(an.sp==="bossGroundSlam"){
      if(q<I){ const a=_ease(q/I); P.oy -= 16*a*K; P.sx -= 0.04*a; P.sy += 0.08*a; }
      else if(q<I+0.08){ const a=(q-I)/0.08; P.oy -= 16*K*(1-a); P.sx += 0.16*a; P.sy -= 0.16*a;
        if(!an.spFired && a>0.6){ an.spFired = true; vfxImpactHeavy(ent, prof, 1); } }
      else { const a=(q-I-0.08)/(1-I-0.08); P.sx += 0.16*(1-_ease(a)); P.sy -= 0.16*(1-_ease(a)); }
    } else if(an.sp==="bossPhaseTransition"){
      P.ox += (Math.random()-0.5)*6*K*(1-q); P.oy += (Math.random()-0.5)*4*K*(1-q);
      const pul = Math.sin(q*Math.PI*10)*0.07*(1-q); P.sx += pul; P.sy += pul;
      P.flash = Math.max(P.flash, 0.7*(1-q)); P.glow = 1-q; P.glowRgb = rgb;
      if(!an.spFired){ an.spFired = true; vfxBurst(ent.x, ent.y-(ent.radius||40), 26, prof.particle, 200, 700, 4, 2, -20, 0);
        vfxShock(ent.x, ent.y, 10, (ent.radius||40)*3.2, rgb, 800, 2); vfxShake(10); }
    }
    if(q>=1) an.sp = null;
  }

  // ---- HIT: flash breve + knockback visual en la dirección del golpe ----
  const hitV = isHero ? (ent.hurtTimer||0) : (ent.hitFlash||0);
  const hitMax = isHero ? 160 : 90;
  if(hitV > an.pHit + 1){
    const src = isHero ? null : ent.lastHitBy;
    let hx = -fx, hy = -fy;
    if(src){ const dx2 = ent.x-src.x, dy2 = ent.y-src.y, dl = Math.hypot(dx2,dy2)||1; hx = dx2/dl; hy = dy2/dl; }
    an.hdx = hx; an.hdy = hy;
  }
  an.pHit = hitV;
  if(hitV>0){
    const h = hitV/hitMax;
    const kb = (isHero?4:6)*h*h*Math.min(1.4, 1.2/prof.weight)*K;
    P.ox += an.hdx*kb; P.oy += an.hdy*kb*0.6;
    P.sx += 0.05*h; P.sy -= 0.05*h;
    P.flash = Math.max(P.flash, Math.max(0, (h-0.35)/0.65)*(isHero?0.45:0.6));
  }

  // estela de velocidad (cargas, dashes, embestidas)
  if(an.spd > Math.max(300, baseSpd*2.2) && (isHero || prof.isBoss || !crowd)){
    vfxBurst(ent.x-fx*(ent.radius||20)*0.6, ent.y-fy*(ent.radius||20)*0.4-(ent.radius||20)*0.5, 1, prof.particle==="spark"?"spirit":prof.particle, 10, 260, (ent.radius||20)*0.35, isHero||prof.isBoss?1:0, 0, 2);
  }
  return P;
}
function animApply(x, y, P){
  ctx.translate(x+P.ox, y+P.oy);
  if(P.rot) ctx.rotate(P.rot);
  if(P.sx!==1 || P.sy!==1) ctx.scale(P.sx, P.sy);
  ctx.translate(-x, -y);
}

/* ---------------- VFX: pool de partículas (Structure-of-Arrays, sin allocations) ---------------- */
const VFX_MAX = 720;
const vX = new Float32Array(VFX_MAX), vY = new Float32Array(VFX_MAX), vVX = new Float32Array(VFX_MAX), vVY = new Float32Array(VFX_MAX);
const vLife = new Float32Array(VFX_MAX), vMax = new Float32Array(VFX_MAX), vSize = new Float32Array(VFX_MAX), vGrav = new Float32Array(VFX_MAX);
const vKind = new Uint8Array(VFX_MAX), vPrio = new Uint8Array(VFX_MAX);
const vCol = new Array(VFX_MAX).fill("#fff");
let vCount = 0;
let vfxLoad = 1, vfxFrameEma = 16;
// Límite dinámico: cuanto peor va el frame (FPS), menos partículas secundarias se emiten.
function vfxFrame(dt){
  animDt = dt;
  vfxFrameEma = vfxFrameEma*0.94 + dt*0.06;
  let target = vfxFrameEma<=18 ? 1 : (vfxFrameEma>=34 ? 0.3 : 1-(vfxFrameEma-18)/16*0.7);
  if(enemies.length>90) target *= 0.75;
  vfxLoad += (target-vfxLoad)*0.1;
}
// prio: 2 = jugador/jefe/ataque peligroso (siempre), 1 = importante, 0 = secundario (se recorta primero)
// kind: 0 cuadrado pixel, 1 glow aditivo, 2 estela (línea en la dirección de la velocidad)
function vfxBurst(x, y, n, pal, spd, life, size, prio, upBias, kind){
  if(prio<2){
    if(!inView(x, y, 80)) return;
    n = Math.round(n*(prio===1 ? Math.max(0.5,vfxLoad) : vfxLoad));
    if(n<=0) return;
  }
  const cols = VFX_PAL[pal] || VFX_PAL.spark;
  const cap = prio>=2 ? VFX_MAX : Math.floor(VFX_MAX*0.82*(prio===1?1:vfxLoad));
  for(let i=0;i<n;i++){
    if(vCount >= cap) return;
    const j = vCount++;
    const a = Math.random()*6.2832, s = spd*(0.35+Math.random()*0.65);
    vX[j] = x; vY[j] = y; vVX[j] = Math.cos(a)*s; vVY[j] = Math.sin(a)*s*0.7 + (upBias||0);
    vLife[j] = vMax[j] = life*(0.7+Math.random()*0.5); vSize[j] = size; vGrav[j] = kind===1 ? -8 : 60;
    vKind[j] = kind||0; vPrio[j] = prio; vCol[j] = cols[(Math.random()*3)|0];
  }
}
// Partículas que convergen hacia un punto (acumulación de energía de un cast)
function vfxConverge(x, y, pal, r, prio){
  if(prio<2 && !inView(x,y,60)) return;
  if(vCount >= VFX_MAX*0.85) return;
  const cols = VFX_PAL[pal] || VFX_PAL.spark;
  const j = vCount++, a = Math.random()*6.2832, d = r*(0.7+Math.random()*0.5), life = 260;
  vX[j] = x+Math.cos(a)*d; vY[j] = y+Math.sin(a)*d*0.7; vVX[j] = -Math.cos(a)*d/(life/1000); vVY[j] = -Math.sin(a)*d*0.7/(life/1000);
  vLife[j] = vMax[j] = life; vSize[j] = 2.5; vGrav[j] = 0; vKind[j] = 1; vPrio[j] = prio; vCol[j] = cols[(Math.random()*3)|0];
}
function vfxUpdateParticles(dt){
  const k = dt/1000;
  for(let i=0;i<vCount;){
    vLife[i] -= dt;
    if(vLife[i] <= 0){
      const l = --vCount;
      if(i!==l){ vX[i]=vX[l]; vY[i]=vY[l]; vVX[i]=vVX[l]; vVY[i]=vVY[l]; vLife[i]=vLife[l]; vMax[i]=vMax[l]; vSize[i]=vSize[l]; vGrav[i]=vGrav[l]; vKind[i]=vKind[l]; vPrio[i]=vPrio[l]; vCol[i]=vCol[l]; }
      continue;
    }
    vVY[i] += vGrav[i]*k; vVX[i] *= 0.985; vVY[i] *= 0.985;
    vX[i] += vVX[i]*k; vY[i] += vVY[i]*k;
    i++;
  }
}
const _glowCache = {};
function glowSprite(rgb){
  let c = _glowCache[rgb];
  if(c) return c;
  c = document.createElement("canvas"); c.width = c.height = 64;
  const g = c.getContext("2d"), gr = g.createRadialGradient(32,32,0,32,32,32);
  gr.addColorStop(0, `rgba(${rgb},1)`); gr.addColorStop(0.35, `rgba(${rgb},0.45)`); gr.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = gr; g.fillRect(0,0,64,64);
  _glowCache[rgb] = c;
  return c;
}
const _hexRgbCache = {};
function hexToRgb(hex){
  let r = _hexRgbCache[hex];
  if(r) return r;
  let h = String(hex||"#ffffff").replace("#","");
  if(h.length===3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
  const n = parseInt(h.slice(0,6),16);
  r = isNaN(n) ? "255,255,255" : `${(n>>16)&255},${(n>>8)&255},${n&255}`;
  _hexRgbCache[hex] = r;
  return r;
}
function vfxDrawParticles(){
  if(!vCount) return;
  for(let i=0;i<vCount;i++){
    if(vKind[i]!==0) continue;
    const a = vLife[i]/vMax[i];
    ctx.globalAlpha = a>0.5 ? 1 : a*2;
    ctx.fillStyle = vCol[i];
    const s = vSize[i]*(0.6+0.4*a);
    ctx.fillRect(vX[i]-s/2, vY[i]-s/2, s, s);
  }
  ctx.globalCompositeOperation = "lighter";
  for(let i=0;i<vCount;i++){
    if(vKind[i]===0) continue;
    const a = vLife[i]/vMax[i];
    if(vKind[i]===2){ // estela suave de velocidad
      const s = vSize[i]*(1+0.6*(1-a));
      ctx.globalAlpha = a*0.35;
      ctx.drawImage(glowSprite(hexToRgb(vCol[i])), vX[i]-s, vY[i]-s, s*2, s*2);
      continue;
    }
    const s = vSize[i]*4;
    ctx.globalAlpha = Math.min(1, a*1.4);
    ctx.fillStyle = vCol[i];
    ctx.fillRect(vX[i]-vSize[i]/2, vY[i]-vSize[i]/2, vSize[i], vSize[i]);
    ctx.globalAlpha = a*0.5;
    ctx.drawImage(glowSprite(hexToRgb(vCol[i])), vX[i]-s, vY[i]-s, s*2, s*2);
  }
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
}

/* ---------------- VFX: ondas de choque, telegraphs, sprites de efecto, screen shake ---------------- */
const VFX_SHOCK_MAX = 28, vfxShocks = [];
for(let i=0;i<VFX_SHOCK_MAX;i++) vfxShocks.push({on:false, x:0, y:0, r0:0, r1:0, t:0, dur:0, rgb:"255,255,255"});
function vfxShock(x, y, r0, r1, rgb, dur, prio){
  if(prio<2 && (!inView(x,y,r1) || vfxLoad<0.45)) return;
  let s = null;
  for(let i=0;i<VFX_SHOCK_MAX;i++){ if(!vfxShocks[i].on){ s = vfxShocks[i]; break; } }
  if(!s){ if(prio<2) return; s = vfxShocks[0]; }
  s.on = true; s.x = x; s.y = y; s.r0 = r0; s.r1 = r1; s.t = 0; s.dur = dur; s.rgb = rgb;
}
const VFX_TELE_MAX = 24, vfxTeles = [];
for(let i=0;i<VFX_TELE_MAX;i++) vfxTeles.push({on:false, x:0, y:0, r:0, t:0, dur:0, rgb:"255,70,50", shape:0, dx:1, dy:0, arc:0.8, len:0, follow:null, link:null, aimAt:null});
// Telegraph de zona peligrosa: shape 0 = círculo, 1 = cono (dx,dy,arc), 2 = línea (dx,dy,len, r = medio ancho).
// `follow` = entidad cuyo x/y sigue; `link` = entidad con bossWind cuyo progreso real sincroniza la barra.
function vfxTelegraph(o){
  let s = null;
  for(let i=0;i<VFX_TELE_MAX;i++){ if(!vfxTeles[i].on){ s = vfxTeles[i]; break; } }
  if(!s) s = vfxTeles[0];
  s.on = true; s.t = 0; s.dur = o.dur||700; s.r = o.r||100; s.rgb = o.rgb||"255,70,50"; s.shape = o.shape||0;
  s.dx = o.dx||1; s.dy = o.dy||0; s.arc = o.arc||0.8; s.len = o.len||0; s.follow = o.follow||null; s.link = o.link||null; s.aimAt = o.aimAt||null;
  s.x = o.x!==undefined ? o.x : (s.follow ? s.follow.x : 0); s.y = o.y!==undefined ? o.y : (s.follow ? s.follow.y : 0);
  return s;
}
const VFX_SPR_MAX = 40, vfxSprites = [];
for(let i=0;i<VFX_SPR_MAX;i++) vfxSprites.push({on:false, key:"", frame:0, x:0, y:0, h:0, t:0, dur:0, follow:null, grow:0.2, flip:false, anchorY:0.9, alpha:1, fps:0, vx:0, vy:0, ground:false, rot:0});
// Fuentes de frames para vfxSprite además de las de la Arena Acuática (ACUA2_IMG): arte real ya
// embebido que antes no tenía cómo mostrarse (p.ej. la Plaga del Nigromante en el suelo).
// `ground` = se dibuja bajo las entidades (efecto de suelo) en vez de encima.
const VFX_SPR_EXTRA = {
  // ground2/ground3 tienen proporciones parecidas (~2:1) y alternan sin "saltar" de tamaño; ground1
  // es un plano mucho más ancho (3.5:1) -por eso se muestra aparte (nigroPlagueBurst), una sola
  // vez al momento del cast, en vez de mezclado en este loop-.
  nigroPlague: { imgs:[NIGRO_PLAGUE_FX_IMG.ground2, NIGRO_PLAGUE_FX_IMG.ground3],
                 ready:()=>NIGRO_PLAGUE_FX_READY.ground2 && NIGRO_PLAGUE_FX_READY.ground3, ground:true },
  nigroPlagueBurst: { imgs:[NIGRO_PLAGUE_FX_IMG.ground1], ready:()=>NIGRO_PLAGUE_FX_READY.ground1, ground:true },
  // Destello decorativo sobre la mano del Nigromante transformado al castear la Plaga -no es un
  // proyectil real (no viaja ni aplica daño): solo el mismo frame quieto con fade, como cualquier
  // otro efecto de vfxSprite-.
  nigroSoulFireFlare: { imgs:[NIGRO_DEMON_IMG.soulFireProj], ready:()=>NIGRO_DEMON_READY.soulFireProj, ground:false },
  // Corte del Rōnin: destello de impacto real (antes solo el chispazo genérico de pushSpark).
  musashiRoninImpact: { imgs:[MUSASHI_REAL_IMG.ronin4], ready:()=>MUSASHI_REAL_READY.ronin4, ground:false },
  // Último Duelo: banners decorativos (no reemplazan el cuerpo de Musashi, van superpuestos
  // arriba de él) para la entrada a la arena de bolsillo y el instante del Golpe de Gracia.
  musashiPortal: { imgs:[MUSASHI_REAL_IMG.ultiPortal], ready:()=>MUSASHI_REAL_READY.ultiPortal, ground:false },
  musashiFinish: { imgs:[MUSASHI_REAL_IMG.ultiFinish], ready:()=>MUSASHI_REAL_READY.ultiFinish, ground:false },
  // Flecha Perforante: impacto crítico real sobre la Presa Acorralada (antes sin usar).
  sylvaPiercingCrit: { imgs:[SYLVA_REAL_IMG.piercingCrit], ready:()=>SYLVA_REAL_READY.piercingCrit, ground:false },
  // Materialización real al invocar esqueletos/Golem (antes sin usar).
  nigroSkeletonSpawnWarrior: { imgs:[NIGRO_SKEL_IMG.spawnWarrior], ready:()=>NIGRO_SKEL_READY.spawnWarrior, ground:false },
  nigroSkeletonSpawnMage: { imgs:[NIGRO_SKEL_IMG.spawnMage], ready:()=>NIGRO_SKEL_READY.spawnMage, ground:false },
  nigroGolemSpawn: { imgs:[NIGRO_GOLEM_IMG.spawn], ready:()=>NIGRO_GOLEM_READY.spawn, ground:false },
  // Pack de VFX propio (dibujado a mano vía formas vectoriales, no arte de campeón): cristal/runa
  // de hielo del Mago, tajo del Segador y su ulti, sanación/escudo del Soporte, salpicadura de agua.
  fxIceCrystal:      { imgs:NEWFX_IMG.iceCrystal,      ready:()=>newfxReady('iceCrystal'),      ground:false },
  fxFrostRune:       { imgs:NEWFX_IMG.frostRune,       ready:()=>newfxReady('frostRune'),       ground:false },
  fxScytheSlash:     { imgs:NEWFX_IMG.scytheSlash,     ready:()=>newfxReady('scytheSlash'),     ground:false },
  fxSoulReapBurst:   { imgs:NEWFX_IMG.soulReapBurst,   ready:()=>newfxReady('soulReapBurst'),   ground:false },
  fxHolyHealBurst:   { imgs:NEWFX_IMG.holyHealBurst,   ready:()=>newfxReady('holyHealBurst'),   ground:false },
  fxHolyShieldBubble:{ imgs:NEWFX_IMG.holyShieldBubble,ready:()=>newfxReady('holyShieldBubble'),ground:false },
  fxWaterSplash:     { imgs:NEWFX_IMG.waterSplash,     ready:()=>newfxReady('waterSplash'),     ground:false },
};
function vfxSprImgs(key){ const x = VFX_SPR_EXTRA[key]; return x ? x.imgs : ACUA2_IMG[key]; }
function vfxSprReady(key){ const x = VFX_SPR_EXTRA[key]; return x ? x.ready() : acua2Ready(key); }
// Efecto de sprite real (tentáculos, salpicaduras, olas, remolinos...) con crecimiento y fade.
function vfxSprite(key, frame, x, y, h, dur, follow, grow, flip, anchorY, fps, vx, vy, rot){
  if(!vfxSprReady(key)) return;
  let s = null;
  for(let i=0;i<VFX_SPR_MAX;i++){ if(!vfxSprites[i].on){ s = vfxSprites[i]; break; } }
  if(!s) return;
  s.on = true; s.key = key; s.frame = frame; s.x = x; s.y = y; s.h = h; s.t = 0; s.dur = dur; s.follow = follow||null;
  s.grow = grow===undefined ? 0.2 : grow; s.flip = !!flip; s.anchorY = anchorY===undefined ? 0.9 : anchorY; s.fps = fps||0; s.vx = vx||0; s.vy = vy||0;
  s.ground = !!(VFX_SPR_EXTRA[key] && VFX_SPR_EXTRA[key].ground);
  s.rot = rot||0; // opcional: para efectos direccionales (p.ej. un tajo que sigue el ángulo del golpe)
}
let vfxLastShakeAt = 0;
// Screen shake controlado: solo para golpes realmente importantes, con tope y enfriamiento.
function vfxShake(amount){
  if(animNow - vfxLastShakeAt < 280 && amount < 10) return;
  if(amount < screenShake*0.8) return;
  vfxLastShakeAt = animNow;
  screenShake = Math.min(16, Math.max(screenShake, amount));
}
function vfxImpactHeavy(ent, prof, strength){
  const rgb = (VFX_PAL[prof.material]||VFX_PAL.rock)[3];
  const R = (ent.radius||40);
  vfxShock(ent.x, ent.y, R*0.4, R*3.0*strength, rgb, 520, 2);
  vfxBurst(ent.x, ent.y-6, Math.round(14*strength), prof.material, 170, 420, 4, 2, -40, 0);
  if(player && distance(ent, player) < 520) vfxShake(5+5*strength);
}
function vfxUpdate(dt){
  vfxUpdateParticles(dt);
  for(let i=0;i<VFX_SHOCK_MAX;i++){ const s = vfxShocks[i]; if(s.on){ s.t += dt; if(s.t>=s.dur) s.on = false; } }
  for(let i=0;i<VFX_TELE_MAX;i++){
    const s = vfxTeles[i]; if(!s.on) continue;
    s.t += dt;
    if(s.follow){ if(s.follow.alive===false){ s.on = false; continue; } s.x = s.follow.x; s.y = s.follow.y; }
    if(s.aimAt){ const dx=s.aimAt.x-s.x, dy=s.aimAt.y-s.y, dl=Math.hypot(dx,dy)||1; s.dx=dx/dl; s.dy=dy/dl; }
    if(s.link){ if(!s.link.alive || !s.link.bossWind){ s.on = false; continue; } }
    else if(s.t>=s.dur) s.on = false;
  }
  for(let i=0;i<VFX_SPR_MAX;i++){
    const s = vfxSprites[i]; if(!s.on) continue;
    s.t += dt; s.x += s.vx*dt/1000; s.y += s.vy*dt/1000;
    if(s.follow){ if(s.follow.alive===false){ s.on = false; continue; } s.x = s.follow.x; s.y = s.follow.y; }
    if(s.t>=s.dur) s.on = false;
  }
  for(let i=0;i<vfxDyingN;i++){ vfxDying[i].t += dt; }
  let w = 0;
  for(let i=0;i<vfxDyingN;i++){ const d = vfxDying[i]; if(d.t < d.dur){ if(w!==i){ const tmp = vfxDying[w]; vfxDying[w] = d; vfxDying[i] = tmp; } w++; } else d.e = null; }
  vfxDyingN = w;
}
function vfxDrawGround(){
  for(let i=0;i<VFX_TELE_MAX;i++){
    const s = vfxTeles[i]; if(!s.on) continue;
    if(!inView(s.x, s.y, s.r + s.len + 40)) continue;
    const q = s.link && s.link.bossWind ? Math.min(1, s.link.bossWind.t/s.link.bossWind.dur) : Math.min(1, s.t/s.dur);
    const pulse = 0.5+0.5*Math.sin(animNow/70);
    ctx.save();
    ctx.translate(s.x, s.y+6);
    ctx.scale(1, 0.55);
    ctx.beginPath();
    if(s.shape===1){
      const ang = Math.atan2(s.dy, s.dx);
      ctx.moveTo(0,0); ctx.arc(0, 0, s.r, ang-s.arc, ang+s.arc); ctx.closePath();
    } else if(s.shape===2){
      const ang = Math.atan2(s.dy, s.dx);
      ctx.rotate(ang); ctx.rect(0, -s.r, s.len, s.r*2);
    } else {
      ctx.arc(0, 0, s.r, 0, Math.PI*2);
    }
    ctx.fillStyle = `rgba(${s.rgb},${0.10+0.10*q})`; ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = `rgba(${s.rgb},${0.55+0.35*pulse})`; ctx.stroke();
    // relleno que avanza: cuánto falta para el golpe
    ctx.beginPath();
    if(s.shape===1){ const ang = Math.atan2(s.dy, s.dx); ctx.moveTo(0,0); ctx.arc(0, 0, s.r*q, ang-s.arc, ang+s.arc); ctx.closePath(); }
    else if(s.shape===2){ ctx.rect(0, -s.r, s.len*q, s.r*2); }
    else ctx.arc(0, 0, s.r*q, 0, Math.PI*2);
    ctx.fillStyle = `rgba(${s.rgb},${0.16+0.14*q})`; ctx.fill();
    ctx.restore();
  }
  for(let i=0;i<VFX_SHOCK_MAX;i++){
    const s = vfxShocks[i]; if(!s.on) continue;
    const q = s.t/s.dur, e = _easeOut(q), r = s.r0 + (s.r1-s.r0)*e;
    ctx.strokeStyle = `rgba(${s.rgb},${(1-q)*0.85})`; ctx.lineWidth = 1+6*(1-q);
    ctx.beginPath(); ctx.ellipse(s.x, s.y+6, r, r*0.55, 0, 0, Math.PI*2); ctx.stroke();
  }
}
const _ONE_CLIP = {frames:[{x:0, y:0, w:1, h:1}]};
function drawImgSized(img, x, y, h, ax, ay, flip, alpha, rot){
  const s = h/img.height;
  const f = _ONE_CLIP.frames[0]; f.w = img.width; f.h = img.height;
  drawAnimFrameSized(img, _ONE_CLIP, 0, x, y, img.width*s, h, ax, ay, flip, alpha, rot);
}
function vfxDrawSprites(ground){
  for(let i=0;i<VFX_SPR_MAX;i++){
    const s = vfxSprites[i]; if(!s.on || s.ground!==!!ground) continue;
    if(!inView(s.x, s.y, s.h*2)) continue;
    const q = s.t/s.dur;
    const arr = vfxSprImgs(s.key);
    const idx = s.fps>0 ? Math.floor(s.t/1000*s.fps)%arr.length : Math.min(arr.length-1, s.frame);
    const img = arr[idx];
    const g = s.grow>0 ? _easeOut(Math.min(1, q/s.grow)) : 1;
    const a = q>0.7 ? (1-q)/0.3 : 1;
    drawImgSized(img, s.x, s.y, s.h*(0.35+0.65*g), 0.5, s.anchorY, s.flip, a*s.alpha, s.rot||0);
  }
}

/* ---------------- DEATH: el cuerpo real del enemigo (no un sprite genérico) cae / se desarma ---------------- */
const VFX_DYING_MAX = 40, vfxDying = [];
let vfxDyingN = 0;
for(let i=0;i<VFX_DYING_MAX;i++) vfxDying.push({e:null, t:0, dur:0, dx:0, dy:0, style:"fall", boss:false, side:1});
function vfxOnDeath(e){
  if(!ENEMY_BASE[e.type]) return false;
  const prof = animProfileOf(e);
  const boss = e.rank==="jefe";
  const big = boss || e.rank==="subjefe";
  const n = boss ? 36 : (e.rank==="subjefe" ? 22 : (e.rank==="elite" ? 14 : (e.rank==="subelite" ? 10 : 8)));
  vfxBurst(e.x, e.y-(e.radius||20)*0.6, n, prof.material, 140+(e.radius||20)*1.2, 460, big?4:3, big?2:0, -30, 0);
  if(big) vfxShock(e.x, e.y, (e.radius||40)*0.5, (e.radius||40)*3, (VFX_PAL[prof.material]||VFX_PAL.flesh)[3], 700, 2);
  if(!inView(e.x, e.y, (e.radius||20)*3+60) && !big) return false;
  let cap = VFX_DYING_MAX;
  if(!big && vfxLoad < 0.6) cap = 16;
  let slot = null;
  if(vfxDyingN < cap){ slot = vfxDying[vfxDyingN++]; }
  else if(big){ for(let i=0;i<vfxDyingN;i++){ if(!vfxDying[i].boss){ slot = vfxDying[i]; break; } } }
  if(!slot) return false;
  const src = e.lastHitBy;
  let dx = 0, dy = -1;
  if(src){ const ddx = e.x-src.x, ddy = e.y-src.y, dl = Math.hypot(ddx,ddy)||1; dx = ddx/dl; dy = ddy/dl; }
  slot.e = e; slot.t = 0; slot.boss = boss; slot.dx = dx; slot.dy = dy; slot.side = dx<0 ? -1 : 1;
  slot.style = boss && prof.death!=="frames" ? "boss" : prof.death;
  slot.dur = boss ? 2300 : (e.rank==="subjefe" ? 1300 : (prof.death==="frames" ? 900 : (vfxLoad<0.6 ? 380 : 560)));
  e.attackAnim = 0; e.fxAnim = null; e.skillAnim = null; e.hitFlash = 0;
  e._dyingP = 0;
  if(boss) vfxShake(12);
  return true;
}
function vfxDrawDying(){
  for(let i=0;i<vfxDyingN;i++){
    const d = vfxDying[i], e = d.e; if(!e) continue;
    const R = e.radius||20;
    if(!inView(e.x, e.y, R*4+80)) continue;
    const p = Math.min(1, d.t/d.dur);
    e._dyingP = p;
    let ox=0, oy=0, sx=1, sy=1, rot=0, alpha=1, flash=0;
    const react = d.boss ? 0.55 : 0.15;
    if(p<react){
      const a = p/react;
      ox = d.dx*6*(d.boss?0.3:1)*Math.sin(a*Math.PI); oy = d.dy*3*Math.sin(a*Math.PI);
      sx = 1+0.07*Math.sin(a*Math.PI); sy = 1-0.05*Math.sin(a*Math.PI);
      flash = d.boss ? (Math.sin(p*90)>0.3 ? 0.7 : 0.15) : 0.8*(1-a);
      if(d.boss){
        ox += (Math.random()-0.5)*8; oy += (Math.random()-0.5)*5;
        if(Math.random()<0.18){ const prof = animProfileOf(e); vfxBurst(e.x+(Math.random()-0.5)*R*1.6, e.y-Math.random()*R*1.8, 8, prof.material, 160, 380, 4, 2, -30, 1); }
        if(Math.random()<0.05) vfxShake(4);
      }
    } else {
      const a = (p-react)/(1-react);
      const ea = _ease(Math.min(1, a*1.6));
      switch(d.style){
        case "crumble": sy = 1-0.65*ea; sx = 1+0.2*ea; ox = (Math.random()-0.5)*2*(1-a); break;
        case "dissolve": oy = -12*ea; sx = 1-0.3*ea; sy = 1+0.15*ea; break;
        case "sink": oy = 14*ea; sy = 1-0.2*ea; break;
        case "frames": break;
        case "collapse": case "boss": sy = 1-0.5*ea; sx = 1+0.12*ea; oy = 4*ea; break;
        default: rot = d.side*1.35*ea; oy = 3*ea; break; // "fall": cae de costado según de dónde vino el golpe
      }
      alpha = d.style==="frames" ? (a<0.6 ? 1 : 1-(a-0.6)/0.4) : (a<0.35 ? 1 : 1-(a-0.35)/0.65);
      if(d.style==="dissolve" && Math.random()<0.3*vfxLoad){ const prof = animProfileOf(e); vfxBurst(e.x+(Math.random()-0.5)*R, e.y-Math.random()*R*1.5, 1, prof.material, 20, 500, 3, 0, -40, 1); }
      if(d.style==="sink" && Math.random()<0.25*vfxLoad){ vfxBurst(e.x+(Math.random()-0.5)*R, e.y-R*0.3, 1, "water", 12, 600, 2, 0, -50, 1); }
    }
    if(alpha<=0.01) continue;
    ctx.save();
    ctx.translate(e.x+ox, e.y+oy); if(rot) ctx.rotate(rot); ctx.scale(sx, sy); ctx.translate(-e.x, -e.y);
    const m = ANIM_ALPHA_MUL;
    ANIM_ALPHA_MUL = alpha; ctx.globalAlpha = alpha;
    drawEnemyBody(e);
    if(flash>0){
      ctx.globalCompositeOperation = "lighter";
      ANIM_ALPHA_MUL = flash*alpha; ctx.globalAlpha = flash*alpha;
      drawEnemyBody(e);
    }
    ANIM_ALPHA_MUL = m;
    ctx.restore();
  }
}
function vfxResetRun(){
  vCount = 0; vfxDyingN = 0;
  for(const s of vfxShocks) s.on = false;
  for(const s of vfxTeles) s.on = false;
  for(const s of vfxSprites) s.on = false;
}

// Golpe recibido por un enemigo: partículas según el tipo de daño (quemadura/hielo/sangrado)
// o el estilo del atacante, mezcladas con el material del que recibe.
function vfxHit(e, src, opts, crit){
  const prof = animProfileOf(e);
  const prio = (src===player || prof.isBoss) ? 2 : 0;
  let pal = opts.burn ? "ember" : (opts.slow ? "ice" : (opts.bleed ? "blood" : null));
  if(!pal){ const sp = src ? animProfileOf(src) : null; pal = sp && sp.particle ? sp.particle : "spark"; }
  const x = e.x, y = e.y-16;
  const n = crit ? 6 : 3;
  vfxBurst(x, y, Math.ceil(n*0.6), pal, crit?130:95, 200, crit?3.5:2.5, prio, -30, 0);
  vfxBurst(x, y, Math.max(1, Math.floor(n*0.5)), prof.material, 80, 220, 2.5, prio===2?1:0, -20, 0);
  if(crit) vfxBurst(x, y, 2, pal, 40, 180, 3, prio, 0, 1);
  if(crit && prio===2) vfxShock(e.x, e.y, 6, 26+(e.radius||20), "255,255,255", 220, 1);
  // Salpicadura real de agua en golpes a enemigos acuáticos (además de las partículas genéricas).
  if(prof.material==="water" && newfxReady('waterSplash')) vfxSprite("fxWaterSplash", 0, x, y+10, crit?58:40, 420, null, 0, false, 0.6, 10);
}

/* ---------------- Arena Acuática: sprites reales de Anguila Eléctrica, Kraken Joven y Leviatán ---------------- */
function acua2Ready(k){ const a = ACUA2_IMG[k]; return !!a && ACUA2_READY[k] >= a.length; }
function acua2Pick(k, i){ const a = ACUA2_IMG[k]; const n = a.length; return a[((i%n)+n)%n]; }
function drawAcua2(e){
  const t = e.animT||0;
  const dyingP = e._dyingP;
  const dying = e.alive===false && dyingP!==undefined;
  if(e.type==="anguila_electrica"){
    if(!acua2Ready("eelIdle")) return false;
    let img;
    if(dying && acua2Ready("eelDeath")) img = acua2Pick("eelDeath", Math.min(4, Math.floor(dyingP*5)));
    else if(e.dashing && acua2Ready("eelDash")) img = acua2Pick("eelDash", Math.floor(t/70));
    else if(e.attackAnim>0 && acua2Ready("eelAtk")) img = acua2Pick("eelAtk", 0);
    else if(e.hitFlash>50 && acua2Ready("eelHurt")) img = acua2Pick("eelHurt", 1); // el #0 es un recorte parcial de la cabeza
    else img = acua2Pick("eelIdle", Math.floor(t/130));
    const fx = e.fx||0, fy = e.fy||0, flip = fx < -0.12;
    let rot = flip ? Math.atan2(-fy, -fx) : Math.atan2(fy, fx);
    rot = Math.max(-0.55, Math.min(0.55, rot));
    const w = e.radius*4.4, h = w*img.height/img.width;
    drawImgSized(img, e.x, e.y-h*0.2, h, 0.5, 0.6, flip, undefined, rot);
    return true;
  }
  if(e.type==="kraken_joven"){
    if(!acua2Ready("krIdle")) return false;
    let img;
    if(dying && acua2Ready("krDeath")) img = acua2Pick("krDeath", Math.min(4, Math.floor(dyingP*5)));
    else if(e.hitFlash>50 && acua2Ready("krHurt")) img = acua2Pick("krHurt", Math.floor(t/110));
    else img = acua2Pick("krIdle", Math.floor(t/240));
    // escala fija tomada del primer idle: los recortes miden entre 47 y 64px de alto y, escalados
    // cada uno a su propio alto, el cuerpo "latía" de tamaño entre frames
    const ref = ACUA2_IMG.krIdle[0].height;
    drawImgSized(img, e.x, e.y, e.radius*2.5*img.height/ref, 0.5, 0.82, false, undefined);
    return true;
  }
  if(e.type==="leviatan"){
    if(!acua2Ready("levHead")) return false;
    const phase = e.acuaticaPhase||1;
    const fx = e.fx||0, fy = e.fy||0;
    const R = e.radius;
    // sombra enorme bajo la superficie: sugiere un cuerpo mucho más grande que lo que asoma
    ctx.save();
    ctx.globalAlpha = 0.28*ANIM_ALPHA_MUL;
    ctx.fillStyle = "#02121c";
    ctx.beginPath(); ctx.ellipse(e.x-fx*R*1.8, e.y-fy*R*0.9+10, R*3.4, R*1.1, Math.atan2(fy,fx)*0.35, 0, Math.PI*2); ctx.fill();
    ctx.restore();
    let img, nativeLeft = true, h = R*2.2;
    if(dying && acua2Ready("levDeath")){ img = acua2Pick("levDeath", Math.min(2, Math.floor(dyingP*3))); } // el #3 trae restos del fondo de la hoja
    else if(e.charging2 && acua2Ready("levDash")){ img = acua2Pick("levDash", Math.floor(t/90)); nativeLeft = false; }
    else if((e.biteTelegraph>0 || (e.attackAnim>0 && e._lastAtk==="bite")) && acua2Ready("levBite")){ img = acua2Pick("levBite", 0); nativeLeft = false; }
    else if(e.hitFlash>55 && acua2Ready("levHit")){ img = acua2Pick("levHit", 0); }
    else if(phase>=3 && acua2Ready("levP3")){ img = acua2Pick("levP3", 0); h = R*2.0; }
    else if(phase===2 && acua2Ready("levP2")){ img = acua2Pick("levP2", Math.floor(t/420)); }
    else img = acua2Pick("levHead", Math.floor(t/520));
    const flip = nativeLeft ? fx > 0.12 : fx < -0.12;
    // arcos del cuerpo que asoman detrás de la cabeza (fases 1-2), para que se lea gigante
    if(!dying && phase<3 && acua2Ready("levCoil")){
      const px = -fy, py = fx;
      for(let k=0;k<2;k++){
        const back = R*(1.7+k*1.5), wob = Math.sin(t/600+k*1.7)*R*0.35;
        const cimg = acua2Pick("levCoil", k);
        drawImgSized(cimg, e.x-fx*back+px*wob, e.y-fy*back*0.6+py*wob*0.5+8, R*(1.5-k*0.25), 0.5, 0.92, (k===1)!==flip, undefined);
      }
    }
    drawImgSized(img, e.x, e.y, h, 0.5, 0.86, flip, undefined);
    return true;
  }
  return false;
}
// Tentáculos/agarre del Kraken y ola del Leviatán dibujados sobre el mundo (no reemplazan al cuerpo).
function drawAcua2Overlays(){
  if(currentArena!=="acuatica") return;
  for(const e of enemies){
    if(!e.alive) continue;
    if(e.type==="kraken_joven" && e.grabbedHero && e.grabbedHero.alive && acua2Ready("krGrab")){
      const g = e.grabbedHero;
      const bob = Math.sin(animNow/140)*2;
      drawImgSized(acua2Pick("krGrab", 0), g.x+6, g.y+10+bob, 96, 0.5, 0.95, g.x<e.x, 0.95);
    }
  }
}

// Anticipación real para habilidades peligrosas de jefes que antes pegaban en el mismo frame
// en que se decidían: el daño, el área y el cooldown son los mismos de siempre; solo se
// inserta una ventana de aviso (telegraph + pose de carga) para que el jugador pueda reaccionar.
/* ============================================================
   HABILIDADES ESPECIALES DE JEFES Y SUBJEFES (+ Demonio de Hielo y Fuego)
   ------------------------------------------------------------
   Pedido explícito: ningún jefe/subjefe debería pelear solo con el ataque básico. Mismo
   criterio que los kits que ya existían (Demonio Mayor, Mago de Hielo, Dragón, Kraken,
   Leviatán): todo golpe fuerte se telegrafía (bossWindup + vfxTelegraph) antes de resolverse,
   con cooldowns propios en el enemigo. Sistemas genéricos reutilizables:
   - e.channel: ataque sostenido (Lanzallamas de Hielo) -daño periódico en un cono que gira
     despacio hacia el objetivo; el enemigo queda plantado mientras dura-.
   - e.bossCharge: embestida en línea recta (Minotauro, Jinete, Ángel Caído).
   - bossStrikes: golpes diferidos en un punto del suelo (estalactitas, rocas, calabazas,
     castigo sagrado): aviso circular y, al cumplirse la demora, daño en el área.
   - iceWalls: segmentos sólidos del Muro de Hielo -los campeones no los atraviesan
     (resolveWallCollision), nunca aparecen encima de un campeón-.
   - Escarcha (h.frostStacks): cada golpe helado suma una carga (ralentiza más y más); a las
     FROST_FREEZE_STACKS el campeón queda congelado un instante y las cargas se reinician.
   ============================================================ */
let iceWalls = [];
let bossStrikes = [];
const FROST_FREEZE_STACKS = 4;
const ICE_WALL_MAX = 30;
// Tipos con kit propio en updateBossSkills. Los subjefes "campeón" genéricos de la Arena
// Infernal (esqueleto_h / demonio_menor / golem agrandados) también reciben uno, pero solo
// cuando realmente son campeones (rank subjefe), nunca en su versión común.
const BOSS_SKILL_TYPES = {demonio_hielo_fuego:1, angel_caido_hielo:1, jinete_sin_cabeza:1, doblador_guerrero:1,
  doblador_arquera:1, doblador_picaro:1, doblador_clerigo:1, guardian_laberinto:1, minotauro:1,
  esqueleto_h:1, demonio_menor:1, golem:1};

// Los telegraphs de suelo se dibujan aplastados en vertical (perspectiva, ver vfxDrawGround):
// para que una línea/cono apunte en pantalla exactamente hacia donde va a pegar, la dirección
// que se le pasa se compensa por ese mismo aplastamiento.
function teleDir(dx, dy){ const ny = dy/0.55, l = Math.hypot(dx, ny)||1; return {dx:dx/l, dy:ny/l, k:l}; }

function addFrost(h, n){
  if(!h.alive || h.invulnTimer>0) return;
  h.frostStacks = (h.frostStacks||0) + n; h.frostTimer = 3200;
  h.slowAmt = Math.max(h.slowAmt||0, Math.min(0.6, 0.15*h.frostStacks));
  h.slowTimer = Math.max(h.slowTimer||0, 1800);
  if(h.frostStacks >= FROST_FREEZE_STACKS){
    h.frostStacks = 0; h.frostTimer = 0;
    h.stunTimer = Math.max(h.stunTimer||0, 1000);
    if(h===player) floatText(h.x, h.y-44, "¡CONGELADO!", "crit");
    vfxBurst(h.x, h.y-20, 14, "ice", 120, 420, 3, 2, -30, 0);
    vfxShock(h.x, h.y, 8, 46, "160,220,255", 380, 2);
  }
}
// Golpe de una habilidad de jefe sobre un campeón, con sus efectos de control opcionales.
function bossHitHero(h, dmg, o){
  if(!h || !h.alive) return;
  damageHero(h, dmg);
  if(!h.alive || h.invulnTimer>0 || !o) return;
  if(o.slow){ h.slowAmt = Math.max(h.slowAmt||0, o.slow); h.slowTimer = Math.max(h.slowTimer||0, o.slowDur||1500); }
  if(o.stun){ h.stunTimer = Math.max(h.stunTimer||0, o.stun); }
  if(o.knock && o.from){
    const dx = h.x-o.from.x, dy = h.y-o.from.y, d = Math.hypot(dx,dy)||1;
    h.x += dx/d*o.knock; h.y += dy/d*o.knock; clampToArena(h); resolveWallCollision(h);
  }
  if(o.frost) addFrost(h, o.frost);
  if(o.burn){ h.burnTimer = Math.max(h.burnTimer||0, 2400); h.burnDmg = Math.max(h.burnDmg||0, o.burn); }
}
function inBossCone(e, h, dx, dy, r, cosA){
  const hx = h.x-e.x, hy = h.y-e.y, hd = Math.hypot(hx,hy)||1;
  return hd <= r + (h.radius||18)*0.6 && (hx*dx + hy*dy)/hd >= cosA;
}
function bossSkillLabel(e, text){
  if(e.rank==="jefe") showBanner(text);
  else if(inView(e.x, e.y, 60)) floatText(e.x, e.y - e.radius*2.2, text, null);
}
const BOSS_STRIKE_RGB = {ice:"160,220,255", rock:"200,160,110", fire:"255,120,40", holy:"255,230,140"};
function bossStrike(x, y, r, delay, dmg, kind, o){
  if(bossStrikes.length >= 60) return;
  const c = {x, y}; clampToArena(c);
  bossStrikes.push({x:c.x, y:c.y, r, t:0, delay, dmg, kind, o:o||null});
  vfxTelegraph({shape:0, r, x:c.x, y:c.y, follow:null, dur:delay, rgb:BOSS_STRIKE_RGB[kind]||"255,70,50"});
}
// Posiciones del Muro de Hielo: una fila de segmentos perpendicular a la línea demonio->
// objetivo, del otro lado del objetivo (le corta la retirada y lo deja dentro del alcance del
// Lanzallamas). Se calculan al empezar el aviso y se vuelven a validar al levantarlo.
function iceWallPlan(e, tgt){
  const dx = tgt.x-e.x, dy = tgt.y-e.y, d = Math.hypot(dx,dy)||1, ux = dx/d, uy = dy/d;
  const cx = tgt.x + ux*72, cy = tgt.y + uy*72, N = 5, SP = 40, out = [];
  for(let i=0;i<N;i++){ const off = (i-(N-1)/2)*SP; out.push({x:cx - uy*off, y:cy + ux*off, ux, uy}); }
  return out;
}
function raiseIceWall(plan){
  const R = 22;
  for(const p of plan){
    if(iceWalls.length >= ICE_WALL_MAX) break;
    let x = p.x, y = p.y, ok = false;
    // nunca encima de un campeón: se corre hacia afuera hasta un lugar libre (o se descarta)
    for(let k=0; k<4 && !ok; k++){
      ok = true;
      for(const h of heroes){ if(h.alive && Math.hypot(h.x-x, h.y-y) < R + (h.radius||18) + 4){ ok = false; break; } }
      if(!ok){ x += p.ux*22; y += p.uy*22; }
    }
    if(!ok) continue;
    const c = {x, y}; clampToArena(c);
    iceWalls.push({x:c.x, y:c.y, r:R, life:6500, maxLife:6500, flip:Math.random()<0.5, img:(Math.random()<0.5?1:0)});
    vfxBurst(c.x, c.y-14, 6, "ice", 90, 300, 2.5, 0, -40, 0);
  }
}
// Empuja a un campeón fuera de los segmentos del Muro de Hielo (llamado desde resolveWallCollision).
function resolveIceWalls(ent){
  if(!iceWalls.length || !ent.classKey) return;
  const rad = ent.radius || 18;
  for(const w of iceWalls){
    const dx = ent.x-w.x, dy = ent.y-w.y, d = Math.hypot(dx,dy), m = w.r + rad;
    if(d < m){
      if(d > 0.01){ ent.x = w.x + dx/d*m; ent.y = w.y + dy/d*m; }
      else { ent.x = w.x + m; }
    }
  }
}

// Una vez por frame (desde update): escarcha de los campeones, golpes diferidos y muros.
function updateBossSkillWorld(dt){
  for(const h of heroes){ if(h.frostTimer>0){ h.frostTimer -= dt; if(h.frostTimer<=0) h.frostStacks = 0; } }
  if(bossStrikes.length){
    let w = 0;
    for(let i=0;i<bossStrikes.length;i++){
      const s = bossStrikes[i]; s.t += dt;
      if(s.t >= s.delay){
        const o = s.o ? Object.assign({from:s}, s.o) : null;
        for(const h of heroes){ if(h.alive && Math.hypot(h.x-s.x, h.y-s.y) <= s.r + (h.radius||18)*0.5) bossHitHero(h, s.dmg, o); }
        const pal = s.kind==="rock" ? "rock" : (s.kind==="fire" ? "ember" : (s.kind==="holy" ? "holy" : "ice"));
        vfxBurst(s.x, s.y-8, 12, pal, 150, 420, 3, 1, -60, 0);
        vfxShock(s.x, s.y, s.r*0.3, s.r*1.2, BOSS_STRIKE_RGB[s.kind]||"255,255,255", 360, 1);
        if(player && Math.hypot(player.x-s.x, player.y-s.y) < 420) vfxShake(s.kind==="rock" ? 5 : 3);
      } else bossStrikes[w++] = s;
    }
    bossStrikes.length = w;
  }
  if(iceWalls.length){
    let w = 0;
    for(let i=0;i<iceWalls.length;i++){
      const s = iceWalls[i]; s.life -= dt;
      if(s.life > 0) iceWalls[w++] = s;
      else vfxBurst(s.x, s.y-16, 10, "ice", 140, 380, 3, 0, -40, 0);
    }
    iceWalls.length = w;
  }
}

// ---- piezas de kit reutilizables ----
function skCircleSlam(e, R, windMs, mult, o, rgb, label, anim){
  bossWindup(e, windMs, anim||"bossGroundSlam", {shape:0, r:R, rgb}, ()=>{
    e.attackAnim = 500;
    const oo = Object.assign({from:e}, o||{});
    for(const h of heroes){ if(h.alive && distance(e,h) <= R + (h.radius||18)*0.5) bossHitHero(h, e.dmg*mult, oo); }
    vfxShock(e.x, e.y, e.radius*0.4, R, rgb, 480, 2);
    particles.push({x:e.x, y:e.y, life:520, ring:true, maxLife:520, maxR:R, color:"rgb("+rgb+")"});
  });
  if(label) bossSkillLabel(e, label);
}
function skCone(e, R, arc, windMs, mult, o, rgb, label, onResolve){
  const dx = e.fx, dy = e.fy, td = teleDir(dx, dy), cosA = Math.cos(arc);
  bossWindup(e, windMs, "bossHeavyAttack", {shape:1, r:R, dx:td.dx, dy:td.dy, arc, rgb}, ()=>{
    e.attackAnim = 500;
    const oo = Object.assign({from:e}, o||{});
    if(mult>0) for(const h of heroes){ if(h.alive && inBossCone(e, h, dx, dy, R, cosA)) bossHitHero(h, e.dmg*mult, oo); }
    for(let i=0;i<10;i++){
      const a = Math.atan2(dy,dx) + (Math.random()-0.5)*arc*2, sp = 120+Math.random()*R*1.4;
      particles.push({x:e.x, y:e.y-10, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp, life:320, color:"rgb("+rgb+")"});
    }
    if(onResolve) onResolve(dx, dy);
  });
  if(label) bossSkillLabel(e, label);
}
function skCharge(e, dist, maxLen, speed, mult, o, rgb, label){
  const dx = e.fx, dy = e.fy, len = Math.min(dist + 110, maxLen), td = teleDir(dx, dy);
  bossWindup(e, 850, "bossCharge", {shape:2, r:Math.max(26, e.radius*0.7), dx:td.dx, dy:td.dy, len:len*td.k, rgb}, ()=>{
    e.bossCharge = {dx, dy, speed, dur:len/speed*1000, t:0, hit:new Set(), mult, o:o||{}, rgb};
    animTrigger(e, "bossCharge", len/speed*1000 + 200, 0.2);
  });
  if(label) bossSkillLabel(e, label);
}
function skStrikes(e, pts, R, delay, mult, kind, o, label){
  for(const p of pts) bossStrike(p.x, p.y, R, delay, e.dmg*mult, kind, o);
  animTrigger(e, "bossCast", 700, 0.5);
  e.attackAnim = 400;
  if(label) bossSkillLabel(e, label);
}
function heroTargets(max){
  const out = [];
  for(const h of heroes){ if(h.alive) out.push(h); }
  for(let i=out.length-1;i>0;i--){ const j = (Math.random()*(i+1))|0; const t = out[i]; out[i] = out[j]; out[j] = t; }
  return max ? out.slice(0, max) : out;
}
function skCdInit(e, a, b, c){
  if(e.skA===undefined){ e.skA = a*(0.7+Math.random()*0.6); e.skB = b*(0.7+Math.random()*0.6); e.skC = c*(0.7+Math.random()*0.6); }
  e.skA -= dt_boss; e.skB -= dt_boss; e.skC -= dt_boss;
}
let dt_boss = 0;

// Llamado desde el loop de enemigos. Devuelve true si el enemigo está ocupado (canalizando o
// embistiendo): en ese caso no se mueve ni ataca de la forma normal este frame.
function updateBossSkills(e, dt, tgt, dist){
  dt_boss = dt;
  // --- ataque sostenido en curso (Lanzallamas de Hielo) ---
  if(e.channel){
    const c = e.channel; c.t += dt;
    const ta = Math.atan2(e.fy, e.fx), ca = Math.atan2(c.dy, c.dx);
    let da = ta - ca; while(da > Math.PI) da -= Math.PI*2; while(da < -Math.PI) da += Math.PI*2;
    const lim = c.turn*dt/1000, na = ca + Math.max(-lim, Math.min(lim, da));
    c.dx = Math.cos(na); c.dy = Math.sin(na);
    e.fx = c.dx; e.fy = c.dy;
    c.tick -= dt;
    if(c.tick <= 0){
      c.tick += c.tickMs;
      for(const h of heroes){ if(h.alive && inBossCone(e, h, c.dx, c.dy, c.r, c.cosA)) bossHitHero(h, e.dmg*c.mult, {frost:1}); }
    }
    e.attackAnim = Math.max(e.attackAnim, 150);
    if(c.t >= c.dur) e.channel = null;
    return true;
  }
  // --- embestida en curso ---
  if(e.bossCharge){
    const c = e.bossCharge; c.t += dt;
    const step = c.speed*dt/1000;
    e.x += c.dx*step; e.y += c.dy*step; clampToArena(e);
    e.fx = c.dx; e.fy = c.dy;
    for(const h of heroes){
      if(!h.alive || c.hit.has(h)) continue;
      if(Math.hypot(h.x-e.x, h.y-e.y) < e.radius*0.75 + (h.radius||18)){
        c.hit.add(h);
        bossHitHero(h, e.dmg*c.mult, Object.assign({from:e}, c.o));
        vfxBurst(h.x, h.y-16, 10, "spark", 160, 320, 3, 2, -40, 0);
      }
    }
    if(Math.random() < 0.6) particles.push({x:e.x - c.dx*e.radius*0.5 + (Math.random()-0.5)*e.radius, y:e.y + (Math.random()-0.5)*10, vx:-c.dx*40, vy:-20, life:320, color:"rgb("+c.rgb+")"});
    if(c.t >= c.dur){
      e.bossCharge = null;
      vfxShock(e.x, e.y, e.radius*0.3, e.radius*1.6, c.rgb, 360, 1);
      if(player && distance(e, player) < 500) vfxShake(4);
    }
    return true;
  }
  if(e.bossWind) return false;
  const t = e.type, jefe = e.rank==="jefe";

  if(t==="demonio_hielo_fuego"){
    // Lanzallamas de Hielo (A) + Muro de Hielo (B). La Nova de Escarcha sigue en su bloque.
    skCdInit(e, 5000, 7000, 0);
    if(e.skA<=0 && dist < 200){
      e.skA = 9000;
      const dx = e.fx, dy = e.fy, td = teleDir(dx, dy);
      bossWindup(e, 650, "bossCast", {shape:1, r:210, dx:td.dx, dy:td.dy, arc:0.5, rgb:"150,220,255"}, ()=>{
        e.channel = {dx, dy, t:0, dur:1600, r:210, cosA:Math.cos(0.5), tick:0, tickMs:200, mult:0.28, turn:0.9};
      });
      bossSkillLabel(e, "¡Lanzallamas de Hielo!");
    } else if(e.skB<=0 && dist < 320 && dist > 60){
      e.skB = 12500;
      const plan = iceWallPlan(e, tgt);
      for(const p of plan) vfxTelegraph({shape:0, r:22, x:p.x, y:p.y, follow:null, dur:550, rgb:"190,235,255"});
      bossWindup(e, 550, "bossCast", null, ()=>{ raiseIceWall(plan); });
      bossSkillLabel(e, "¡Muro de Hielo!");
    }
    return false;
  }

  if(t==="angel_caido_hielo"){
    // Lluvia de Estalactitas (A), Juicio Gélido -embestida- (B), Alas de Ventisca (C).
    skCdInit(e, 3000, 6000, 2500);
    const close = heroes.some(h=>h.alive && distance(e,h) < 120);
    if(e.skC<=0 && close){
      e.skC = 8000;
      skCircleSlam(e, 165, 550, 0.8, {knock:90, slow:0.45, slowDur:1800, frost:1}, "200,235,255", "¡Alas de Ventisca!", "bossCast");
    } else if(e.skA<=0 && dist < 650){
      e.skA = 7000;
      const pts = [];
      for(const h of heroTargets()) pts.push({x:h.x+(Math.random()-0.5)*30, y:h.y+(Math.random()-0.5)*30});
      for(let i=0;i<2;i++){ const a = Math.random()*Math.PI*2, r = 70+Math.random()*90; pts.push({x:tgt.x+Math.cos(a)*r, y:tgt.y+Math.sin(a)*r}); }
      skStrikes(e, pts, 60, 1250, 1.0, "ice", {slow:0.4, slowDur:1600, frost:1}, "¡Lluvia de Estalactitas!");
    } else if(e.skB<=0 && dist > 160 && dist < 540){
      e.skB = 9500;
      skCharge(e, dist, 580, 950, 1.4, {knock:70, frost:2}, "190,235,255", "¡Juicio Gélido!");
    }
    return false;
  }

  if(t==="jinete_sin_cabeza"){
    // Calabazas Ardientes (A), Carga Espectral (B), Llamada de la Cacería -invoca bestias- (C).
    skCdInit(e, 3000, 6500, 9000);
    const cdk = e.resurrected ? 0.8 : 1; // renacido: más agresivo
    if(e.skC<=0 && e.hp < e.maxHp*0.7 && enemies.length < 45){
      e.skC = 16000*cdk;
      bossWindup(e, 900, "bossCast", {shape:0, r:110, rgb:"255,150,60"}, ()=>{
        for(let i=0;i<3;i++){
          const a = (i/3)*Math.PI*2 + Math.random()*0.5, b = spawnEnemy("bestia_bosque", false, false);
          b.x = e.x + Math.cos(a)*(e.radius+50); b.y = e.y + Math.sin(a)*(e.radius+50); clampToArena(b);
          vfxBurst(b.x, b.y-10, 10, "ember", 120, 380, 3, 1, -40, 0);
        }
      });
      bossSkillLabel(e, "¡LLAMADA DE LA CACERÍA!");
    } else if(e.skB<=0 && dist > 150 && dist < 620){
      e.skB = 8500*cdk;
      skCharge(e, dist, 640, 1050, 1.5, {knock:90, stun:400}, "255,150,60", "¡CARGA ESPECTRAL!");
    } else if(e.skA<=0 && dist < 700){
      e.skA = 6500*cdk;
      const pts = heroTargets(3).map(h=>({x:h.x+(Math.random()-0.5)*24, y:h.y+(Math.random()-0.5)*24}));
      skStrikes(e, pts, 70, 1150, 1.0, "fire", {burn:e.dmg*0.15}, "¡CALABAZAS ARDIENTES!");
    }
    return false;
  }

  if(t==="doblador_guerrero"){
    skCdInit(e, 3500, 0, 0);
    if(e.skA<=0 && dist < 140){
      e.skA = 6000;
      skCone(e, 165, 0.85, 700, 1.4, {stun:500}, "220,220,230", "Golpe Sísmico");
    }
    return false;
  }
  if(t==="doblador_arquera"){
    skCdInit(e, 3000, 0, 0);
    if(e.skA<=0 && dist < 330){
      e.skA = 5500;
      skCone(e, 320, 0.4, 650, 0, null, "200,215,255", "Descarga de Flechas", (dx, dy)=>{
        const base = Math.atan2(dy, dx);
        for(let i=-2;i<=2;i++){
          const a = base + i*0.16;
          projectiles.push({x:e.x, y:e.y-10, vx:Math.cos(a)*340, vy:Math.sin(a)*340, dmg:e.dmg*0.7, life:1400, radius:6, color:"#c9d8ff", enemy:true});
        }
      });
    }
    return false;
  }
  if(t==="doblador_picaro"){
    skCdInit(e, 4000, 0, 0);
    if(e.skA<=0 && dist < 380 && dist > 80){
      e.skA = 7000;
      const dx = tgt.x-e.x, dy = tgt.y-e.y, d = Math.hypot(dx,dy)||1;
      const dest = {x:tgt.x + dx/d*48, y:tgt.y + dy/d*48}; clampToArena(dest);
      vfxTelegraph({shape:0, r:62, x:dest.x, y:dest.y, follow:null, dur:450, rgb:"140,120,200"});
      bossWindup(e, 450, "bossCast", null, ()=>{
        vfxBurst(e.x, e.y-14, 10, "shadow", 120, 360, 3, 0, -30, 0);
        e.x = dest.x; e.y = dest.y;
        vfxBurst(e.x, e.y-14, 12, "shadow", 140, 380, 3, 1, -30, 0);
        e.attackAnim = 400;
        for(const h of heroes){ if(h.alive && Math.hypot(h.x-e.x, h.y-e.y) < 62 + (h.radius||18)*0.5) bossHitHero(h, e.dmg*1.5, null); }
      });
      bossSkillLabel(e, "Paso Sombrío");
    }
    return false;
  }
  if(t==="doblador_clerigo"){
    skCdInit(e, 5000, 3000, 0);
    let hurt = false;
    for(const o of enemies){ if(o.alive && o.type.indexOf("doblador_")===0 && o.hp < o.maxHp*0.8 && distance(e,o) < 300){ hurt = true; break; } }
    if(e.skA<=0 && hurt){
      e.skA = 8000;
      bossWindup(e, 700, "bossCast", {shape:0, r:260, rgb:"255,230,140"}, ()=>{
        for(const o of enemies){
          if(!o.alive || o.type.indexOf("doblador_")!==0 || distance(e,o) > 300) continue;
          const heal = o.maxHp*0.2; o.hp = Math.min(o.maxHp, o.hp + heal);
          if(inView(o.x, o.y, 40)) floatText(o.x, o.y-40, "+"+Math.round(heal), null);
          vfxBurst(o.x, o.y-20, 8, "holy", 90, 420, 3, 0, -60, 0);
        }
      });
      bossSkillLabel(e, "Luz Restauradora");
    } else if(e.skB<=0 && dist < 420){
      e.skB = 6000;
      skStrikes(e, [{x:tgt.x, y:tgt.y}], 72, 950, 1.2, "holy", null, "Castigo Sagrado");
    }
    return false;
  }

  if(t==="guardian_laberinto"){
    // Pisotón Sísmico (A, cuerpo a cuerpo) + Rocas del Laberinto (B, a distancia).
    skCdInit(e, 3500, 5000, 0);
    if(e.skA<=0 && dist < 175){
      e.skA = 6500;
      skCircleSlam(e, 175, 800, 1.3, {stun:600, knock:40}, "200,170,120", "¡Pisotón Sísmico!");
    } else if(e.skB<=0 && dist > 120 && dist < 580){
      e.skB = 8000;
      const pts = [{x:tgt.x, y:tgt.y}];
      for(let i=0;i<2;i++){ const a = Math.random()*Math.PI*2; pts.push({x:tgt.x+Math.cos(a)*75, y:tgt.y+Math.sin(a)*75}); }
      skStrikes(e, pts, 66, 1150, 1.1, "rock", {knock:40}, "¡Rocas del Laberinto!");
    }
    return false;
  }

  if(t==="minotauro"){
    // Embestida (A), Hachazo Giratorio (B) y Furia (pasiva, una vez debajo del 50%).
    skCdInit(e, 4000, 3000, 0);
    if(!e.enraged && e.hp < e.maxHp*0.5){
      e.enraged = true; e.speed *= 1.35;
      animTrigger(e, "bossPhaseTransition", 1100);
      vfxShock(e.x, e.y, e.radius*0.4, e.radius*2.4, "255,90,60", 700, 2);
      showBanner("¡FURIA DEL MINOTAURO!");
    }
    const k = e.enraged ? 0.75 : 1;
    if(e.skB<=0 && dist < 190){
      e.skB = 6000*k;
      skCircleSlam(e, 195, 700, 1.3, {knock:70}, "255,140,90", "¡HACHAZO GIRATORIO!", "bossHeavyAttack");
    } else if(e.skA<=0 && dist > 150 && dist < 660){
      e.skA = 7500*k;
      skCharge(e, dist, 680, 1150, 1.6, {knock:110, stun:500}, "255,120,80", "¡EMBESTIDA!");
    }
    return false;
  }

  // --- subjefes "campeón" genéricos de la Arena Infernal (solo en su versión subjefe) ---
  if(e.rank!=="subjefe") return false;
  if(t==="esqueleto_h"){
    skCdInit(e, 3000, 6000, 0);
    if(e.skA<=0 && dist < 150){ e.skA = 6000; skCircleSlam(e, 150, 650, 1.3, {knock:50}, "236,228,204", "Tajo Giratorio", "bossHeavyAttack"); }
    else if(e.skB<=0 && dist > 140 && dist < 480){ e.skB = 8000; skCharge(e, dist, 500, 900, 1.3, {knock:70}, "236,228,204", "Embestida Ósea"); }
  } else if(t==="demonio_menor"){
    skCdInit(e, 3000, 5000, 0);
    if(e.skA<=0 && dist < 520){ e.skA = 6500; skStrikes(e, heroTargets(3).map(h=>({x:h.x, y:h.y})), 64, 1100, 1.1, "fire", {burn:e.dmg*0.12}, "Lluvia Infernal"); }
    else if(e.skB<=0 && dist < 160){ e.skB = 7000; skCircleSlam(e, 160, 700, 1.2, {burn:e.dmg*0.12}, "255,120,40", "Estallido Infernal", "bossCast"); }
  } else if(t==="golem"){
    skCdInit(e, 3500, 5500, 0);
    if(e.skA<=0 && dist < 180){ e.skA = 6500; skCircleSlam(e, 180, 800, 1.3, {stun:600}, "180,180,170", "Pisotón"); }
    else if(e.skB<=0 && dist > 120 && dist < 520){
      e.skB = 8500;
      const pts = [{x:tgt.x, y:tgt.y}]; for(let i=0;i<2;i++){ const a = Math.random()*Math.PI*2; pts.push({x:tgt.x+Math.cos(a)*70, y:tgt.y+Math.sin(a)*70}); }
      skStrikes(e, pts, 62, 1150, 1.1, "rock", {knock:30}, "Lanzar Rocas");
    }
  }
  return false;
}


// Un segmento del Muro de Hielo (se dibuja ordenado por profundidad junto a las entidades).
function drawIceWall(w){
  const age = w.maxLife - w.life, grow = Math.min(1, age/180), fade = w.life < 500 ? w.life/500 : 1;
  const img = ICE_WALL_IMG[w.img], ready = ICE_WALL_READY[w.img];
  drawShadow(w.x, w.y, w.r*1.1);
  if(ready){
    const h = 62*grow, s = h/img.height;
    ctx.save(); ctx.globalAlpha = fade;
    ctx.translate(w.x, w.y+4); if(w.flip) ctx.scale(-1,1);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, -img.width*s/2, -h, img.width*s, h);
    ctx.restore();
  } else {
    ctx.save(); ctx.globalAlpha = 0.85*fade; ctx.fillStyle = "#bfe8ff"; ctx.strokeStyle = "#ffffff";
    ctx.beginPath(); ctx.moveTo(w.x-w.r, w.y); ctx.lineTo(w.x, w.y-54*grow); ctx.lineTo(w.x+w.r, w.y); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
}
// Chorro del Lanzallamas de Hielo, golpes que caen (estalactitas/rocas/calabazas), encima de
// las entidades.
function drawBossSkillOverlay(){
  for(const e of enemies){
    if(!e.alive || !e.channel) continue;
    const c = e.channel;
    if(!inView(e.x, e.y, c.r+60)) continue;
    const ang = Math.atan2(c.dy, c.dx), ox = e.x + c.dx*e.radius*0.5, oy = e.y - e.radius*1.1;
    // zona real de daño (sector circular, sin el aplastamiento de los telegraphs de suelo)
    ctx.save(); ctx.globalAlpha = 0.16 + 0.06*Math.sin(animNow/60);
    ctx.fillStyle = "#9fdcff"; ctx.beginPath(); ctx.moveTo(e.x, e.y);
    ctx.arc(e.x, e.y, c.r, ang-0.5, ang+0.5); ctx.closePath(); ctx.fill(); ctx.restore();
    const fi = Math.floor(animNow/90)%3;
    if(FROST_BEAM_READY[fi]){
      const img = FROST_BEAM_IMG[fi], len = c.r*1.05, s = len/img.width, hh = img.height*s;
      const grow = Math.min(1, c.t/160), fade = c.dur - c.t < 200 ? (c.dur-c.t)/200 : 1;
      ctx.save(); ctx.globalAlpha = 0.95*fade; ctx.imageSmoothingEnabled = false;
      ctx.translate(ox, oy); ctx.rotate(ang); if(Math.abs(ang) > Math.PI/2) ctx.scale(1,-1);
      ctx.drawImage(img, 0, -hh/2, len*grow, hh);
      ctx.restore();
    }
  }
  for(const s of bossStrikes){
    if(!inView(s.x, s.y, 120)) continue;
    const q = Math.min(1, s.t/s.delay), fall = 260*(1-q*q), x = s.x, y = s.y - fall;
    ctx.save();
    if(s.kind==="ice"){
      ctx.fillStyle = "#dff4ff"; ctx.strokeStyle = "#6fb8e8"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x-9, y-34); ctx.lineTo(x+9, y-34); ctx.lineTo(x, y); ctx.closePath(); ctx.fill(); ctx.stroke();
    } else if(s.kind==="rock"){
      ctx.fillStyle = "#8a7a62"; ctx.strokeStyle = "#4a3e2e"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y-14, 15, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    } else if(s.kind==="fire"){
      const g = 24; ctx.globalCompositeOperation = "lighter";
      ctx.drawImage(glowSprite("255,120,40"), x-g, y-14-g, g*2, g*2);
      ctx.fillStyle = "#ff8a2a"; ctx.beginPath(); ctx.arc(x, y-14, 9, 0, Math.PI*2); ctx.fill();
    } else {
      const g = 30; ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = q;
      ctx.fillStyle = "rgba(255,235,150,0.8)"; ctx.fillRect(x-4, s.y-240, 8, 240);
      ctx.drawImage(glowSprite("255,230,140"), s.x-g, s.y-g, g*2, g*2);
    }
    ctx.restore();
  }
}

function bossWindup(e, ms, anim, tele, fn){
  e.bossWind = {t:0, dur:ms, fn};
  animTrigger(e, anim, ms+420, ms/(ms+420));
  if(tele){ tele.link = e; if(tele.follow===undefined) tele.follow = e; tele.dur = ms; vfxTelegraph(tele); }
}

function drawHero(h){
  const colossal = h.colossalTimer>0;
  const drawScale = colossal ? h.scale*1.55 : (h.growTimer>0 ? h.scale*(h.growScale||1) : h.scale);
  if(h._deadAt) h._deadAt = 0;
  const prof = animProfileOf(h);
  const P = animPose(h, prof, true);
  const lift = P.oy<0 ? Math.min(0.35, -P.oy/60) : 0;
  drawShadow(h.x, h.y, h.radius*(colossal?1.3:0.85)*(1-lift));
  if(divinaMode) drawDivinaTeamRing(h, h.isDivineFoe ? "enemy" : "player");
  if(h.isDivineFoe) drawDivineAura(h);
  drawGroundSigil(h);

  const spinning = h.spinTimer>0;
  const stealthed = h.stealthTimer>0;

  ctx.save();
  animApply(h.x, h.y, P);
  drawHeroBody(h, drawScale, spinning, stealthed);
  if(P.flash>0.02 && !stealthed){
    ctx.globalCompositeOperation = "lighter";
    const m = ANIM_ALPHA_MUL; ANIM_ALPHA_MUL = P.flash; ctx.globalAlpha = P.flash;
    drawHeroBody(h, drawScale, spinning, false);
    ANIM_ALPHA_MUL = m;
  }
  ctx.restore();
  if(P.glow>0.02 && P.glowRgb && !stealthed){
    const gr = h.radius*2.4*(0.7+0.5*P.glow);
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = Math.min(0.8, P.glow*0.65);
    ctx.drawImage(glowSprite(P.glowRgb), h.x+P.ox-gr, h.y+P.oy-h.radius*1.3-gr, gr*2, gr*2);
    ctx.restore();
  }
  drawHeroOverlays(h, colossal, spinning);
}
// Cuerpo del campeón según su arte real (atlas / poses recortadas / procedural de respaldo).
// Lo comparten el dibujo normal, el hit flash y la caída al morir.
function drawHeroBody(h, drawScale, spinning, stealthed){
  // El Mago usa su propio atlas de sprites (arte provisto por el usuario) en vez del sprite
  // procedural; el resto de las clases sigue exactamente igual que antes.
  if(h.classKey==="mago" && drawMagoAtlas(h, drawScale, stealthed?0.32:1)){
    // dibujado con éxito desde el atlas; nada más que hacer en este bloque
  } else if(h.classKey==="soporte" && drawSoporteAtlas(h, drawScale, stealthed?0.32:1)){
    // dibujado con éxito desde el atlas; nada más que hacer en este bloque
  } else if(h.classKey==="segador" && drawSegadorReal(h, drawScale, stealthed?0.32:1)){
    // Segador Olvidado ("Berserk"): dibujado con éxito desde su sprite real nuevo
  } else if(h.classKey==="axiom" && drawAxiomReal(h, drawScale, stealthed?0.32:1)){
    // Axiom: dibujado con éxito desde su sprite real
  } else if(h.classKey==="profeta" && drawProfetaAtlas(h, drawScale, h.fused ? 0.10 : (stealthed?0.32:1))){
    // La Profeta: dibujado con éxito desde su sprite real. Alpha casi 0 mientras está
    // "fused" (Ascensión del Elegido): fusionada con el aliado, prácticamente invisible.
  } else if(h.classKey==="musashi" && drawMusashiReal(h, drawScale, stealthed?0.32:1)){
    // Musashi: dibujado con éxito desde sus sprites reales recortados (idle/run/ataque/hurt).
  } else if(h.classKey==="cazadora" && drawSylvaReal(h, drawScale, stealthed?0.32:1)){
    // Sylva: dibujado con éxito desde sus sprites reales recortados.
  } else if(h.classKey==="nigromante" && h.nigroDemonForm && drawNigromanteDemon(h, drawScale, stealthed?0.32:1)){
    // Nigromante transformado (Encarnación del Abismo): Demonio Nigromántico.
  } else if(h.classKey==="nigromante" && drawNigromanteReal(h, drawScale, stealthed?0.32:1)){
    // Nigromante: dibujado con éxito desde sus sprites reales recortados.
  } else if(drawKnightAbilityFx(h, drawScale, stealthed?0.32:1)){
    // Caballero con Torbellino/Estampida/Grito activo: dibujado desde el paquete de habilidades
  } else if(DIR_ATLASES[h.classKey] && drawDirAtlasHero(DIR_ATLASES[h.classKey], h, drawScale, stealthed?0.32:1)){
    // Caballero (tanque) o Asesino (guerrero): dibujado con éxito desde su atlas de 4 direcciones
  } else {
  const img = spinning && SPRITES[h.classKey] ? SPRITES[h.classKey].attack : heroFrame(h);
  if(img){
    if(stealthed) ctx.globalAlpha = 0.32*ANIM_ALPHA_MUL;
    drawRimLight(SPRITES[h.classKey], h.x, h.y, drawScale, h.fx < -0.12);
    drawOutline(SPRITES[h.classKey], h.x, h.y, drawScale, h.fx < -0.12);
    drawSprite(img, h.x, h.y, drawScale, h.fx < -0.12);
    if(SPRITES[h.classKey].shine && !stealthed){
      // Capa extra de brillo: orbe/hoja/filo mágico o metálico propio de cada clase, pulsando
      const pulse = 0.5+0.5*Math.sin(performance.now()/460 + h.animT*0.02);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = (0.18+0.30*pulse)*ANIM_ALPHA_MUL;
      drawSprite(SPRITES[h.classKey].shine, h.x, h.y, drawScale, h.fx < -0.12);
      ctx.restore();
    }
    if(stealthed){
      ctx.globalAlpha = 1;
      const now = performance.now()/1000;
      for(let i=0;i<3;i++){
        const a = now*3+i*2.1, r = 18+((now*20+i*9)%16);
        ctx.strokeStyle = `rgba(120,90,160,${0.4-r/60})`; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(h.x, h.y, r, r*0.5, 0, 0, Math.PI*2); ctx.stroke();
      }
    }
  }
  else { ctx.fillStyle = h.cls.color; ctx.beginPath(); ctx.arc(h.x,h.y,h.radius,0,Math.PI*2); ctx.fill(); }
  }
}
// Auras, escudo, arma orbitando y barra de vida: fuera de la transformación de pose.
function drawHeroOverlays(h, colossal, spinning){
  if(h.atkAuraTimer>0 || h.shieldAuraTimer>0){
    // Aro de aura visible directamente sobre el personaje mientras dura un buff de equipo
    // (además del ícono del HUD), orbitando lentamente en sentidos opuestos según el buff.
    const t2 = performance.now()/1000;
    if(h.atkAuraTimer>0){
      ctx.save();
      ctx.globalAlpha = 0.5; ctx.strokeStyle = "#ff4a3d"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(h.x, h.y+4, h.radius*0.9, h.radius*0.42, 0, t2*2, t2*2+4.3); ctx.stroke();
      ctx.restore();
    }
    if(h.shieldAuraTimer>0){
      ctx.save();
      ctx.globalAlpha = 0.5; ctx.strokeStyle = "#5fb0ff"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(h.x, h.y+4, h.radius*1.02, h.radius*0.48, 0, -t2*2, -t2*2+4.3); ctx.stroke();
      ctx.restore();
      // Burbuja hexagonal real girando en loop (el aro fino de arriba queda como respaldo
      // mientras carga la imagen o si por algún motivo no está lista).
      if(newfxReady('holyShieldBubble')){
        const arr = NEWFX_IMG.holyShieldBubble;
        const idx = Math.floor(t2*3.2)%arr.length;
        ctx.save(); ctx.globalCompositeOperation = "lighter";
        drawImgSized(arr[idx], h.x, h.y-2, h.radius*2.3, 0.5, 0.5, false, 0.7, 0);
        ctx.restore();
      }
    }
  }

  if(spinning){
    // El caballero se queda de pie: lo que gira a su alrededor es la espada y el remolino de viento
    const t = performance.now()/1000;
    const prog = h.spinMaxTimer>0 ? Math.max(0, h.spinTimer/h.spinMaxTimer) : 1;
    const orbitR = h.radius*1.15;
    const bladeAngle = t*11;

    // remolino de viento (varios anillos: más capas cuanto más talento tiene Torbellino)
    const windRings = 2 + (h.spinTier||1);
    for(let i=0;i<windRings;i++){
      const a = t*7 + i*(6.28/windRings);
      ctx.save();
      ctx.globalAlpha = 0.55*prog + 0.15;
      ctx.strokeStyle = "#9fe3ff"; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(h.x, h.y, 24+i*11, a, a+1.7);
      ctx.stroke();
      ctx.restore();
    }

    // espada orbitando alrededor del cuerpo (no el cuerpo girando)
    ctx.save();
    ctx.translate(h.x, h.y);
    ctx.rotate(bladeAngle);
    ctx.translate(orbitR, 0);
    ctx.rotate(Math.PI/2);
    ctx.fillStyle = "#e8eef4"; ctx.shadowColor = "#9fe3ff"; ctx.shadowBlur = 6;
    ctx.fillRect(-2, -12, 4, 12);
    ctx.fillStyle = "#6b4a2a"; ctx.shadowBlur = 0;
    ctx.fillRect(-3, -14, 6, 3);
    ctx.restore();
    // motion trail de la espada (un segundo destello más atrás en el giro)
    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.translate(h.x, h.y);
    ctx.rotate(bladeAngle - 0.8);
    ctx.translate(orbitR, 0);
    ctx.rotate(Math.PI/2);
    ctx.fillStyle = "#9fe3ff";
    ctx.fillRect(-2, -12, 4, 12);
    ctx.restore();
  }

  if(colossal){
    ctx.save();
    const pulse = 0.5+0.5*Math.sin(performance.now()/160);
    ctx.strokeStyle = `rgba(255,90,60,${0.35+0.25*pulse})`; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(h.x, h.y+6, h.radius*1.6, h.radius*0.7, 0, 0, Math.PI*2); ctx.stroke();
    ctx.restore();
  }

  if(h.stormTimer>0){
    // armadura de fuego: aura roja pulsante con alguna chispa de hielo
    const now = performance.now()/1000;
    const pulse = 0.6+0.4*Math.sin(now*9);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const g = ctx.createRadialGradient(h.x, h.y-14, 4, h.x, h.y-14, 34);
    g.addColorStop(0, `rgba(255,110,40,${0.35*pulse+0.15})`);
    g.addColorStop(1, "rgba(255,110,40,0)");
    ctx.fillStyle = g; ctx.fillRect(h.x-34, h.y-48, 68, 68);
    ctx.restore();
    for(let i=0;i<3;i++){
      const a = now*4 + i*2.1;
      ctx.fillStyle = i===1 ? "rgba(190,230,255,0.85)" : "rgba(255,140,60,0.85)";
      ctx.fillRect(h.x+Math.cos(a)*20-2, h.y-14+Math.sin(a)*14-2, 4, 4);
    }
  }

  if(h.shield>0){
    ctx.strokeStyle = "rgba(143,208,255,0.75)"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(h.x, h.y-14, h.radius*(colossal?1.5:1)+10, 0, Math.PI*2); ctx.stroke();
  }
  if(h === player){
    // Anillo del jugador para no confundirlo con los aliados
    ctx.strokeStyle = "rgba(255,207,92,0.75)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(h.x, h.y+5, 20, 8, 0, 0, Math.PI*2); ctx.stroke();
  } else {
    // Indicador de clase + vida sobre el aliado
    const w = 34, top = h.y - 58;
    ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(h.x-w/2, top, w, 5);
    ctx.fillStyle = "#c62828"; ctx.fillRect(h.x-w/2, top, w*Math.max(0,h.hp/h.maxHp), 5);
    ctx.fillStyle = h.cls.color; ctx.fillRect(h.x-w/2-7, top-1, 6, 6);
  }
}

function drawEnemy(e){
  const prof = animProfileOf(e);
  const P = animPose(e, prof, false);
  const lift = P.oy<0 ? Math.min(0.35, -P.oy/60) : 0;
  drawShadow(e.x, e.y, e.radius*0.8*(1-lift));
  if(SHINE_KEYS[e.type]){
    // Sombra de contacto extra, más ajustada y oscura, para anclar mejor al suelo
    // a los enemigos que aparecen desde el principio del juego.
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.30)";
    ctx.beginPath();
    ctx.ellipse(e.x, e.y+3, e.radius*0.55, e.radius*0.2, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
  }
  if(e.rank!=="normal"){
    // aura sutil según el rango: marca la jerarquía normal < subélite < élite < subjefe < jefe
    // (se muestra siempre, venga el sprite del atlas real o del procedural de respaldo)
    const rankColor = e.rank==="jefe" ? "#ffb300" : (e.rank==="subjefe" ? "#ff8a3d" : (e.rank==="elite" ? "#ffe36a" : "#c9bd9c"));
    const pulse = 0.5+0.5*Math.sin(performance.now()/260 + e.animT);
    ctx.save();
    ctx.globalAlpha = 0.18+0.10*pulse;
    ctx.strokeStyle = rankColor; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(e.x, e.y+4, e.radius*1.15, e.radius*0.55, 0, 0, Math.PI*2); ctx.stroke();
    ctx.restore();
  }
  // Cuerpo con la pose del sistema de animación (solo transformación visual: la hitbox no se mueve).
  ctx.save();
  animApply(e.x, e.y, P);
  drawEnemyBody(e);
  if(P.flash>0.02 && (prof.isBoss || animFlashBudget-- > 0)){
    ctx.globalCompositeOperation = "lighter";
    const m = ANIM_ALPHA_MUL; ANIM_ALPHA_MUL = P.flash; ctx.globalAlpha = P.flash;
    drawEnemyBody(e);
    ANIM_ALPHA_MUL = m;
  }
  ctx.restore();
  if(P.glow>0.02 && P.glowRgb){
    const gr = e.radius*2.2*(0.7+0.5*P.glow);
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = Math.min(0.85, P.glow*0.7);
    ctx.drawImage(glowSprite(P.glowRgb), e.x+P.ox-gr, e.y+P.oy-e.radius*1.1-gr, gr*2, gr*2);
    ctx.restore();
  }
  drawBossSkillAnim(e);
  drawEnemyOverlays(e);
}
// Dibujo del cuerpo del enemigo según qué arte real tenga (sin sombra/estado/barras): lo
// comparten el dibujo normal, el hit flash y la animación de muerte.
function drawEnemyBody(e){
  if(drawBossFxReplace(e)){
    // habilidad del Dragón de Hielo en curso: reemplaza al sprite normal, no dibujar nada más
  } else if(drawAcuaticaReal(e)){
    // dibujado con éxito desde los sprites reales de la Arena Acuática (tiburones/medusa/cangrejo/sirena)
  } else if(drawRealAnimSprite(e)){
    // dibujado con éxito desde la hoja de animación real del Laberinto Maldito (o el Minotauro)
  } else if(drawPackSprite(e)){
    // dibujado con éxito desde los recortes reales del Pack 2 (Duende del Bosque)
  } else if(drawIceRealSprite(e)){
    // dibujado con éxito desde el sprite real limpiado a mano (Ángel/Lobo/Gólem/Demonio de Hielo)
  } else if(drawEnemyAtlas(e)){
    // dibujado con éxito desde el atlas real (esqueleto, demonio_menor/mayor/mago, golem)
  } else {
  const spriteKey = (ENEMY_BASE[e.type] && ENEMY_BASE[e.type].visualAlias) || e.type;
  const sp = SPRITES["enemy_"+spriteKey];
  let img = null;
  if(sp){
    if(e.attackAnim > 0) img = sp.attack;
    else if(e.hitFlash > 55 && sp.hurt) img = sp.hurt;   // retroceso al recibir daño
    else {
      const set = (e.fy < -0.45 && sp.back) ? sp.back : sp.walk;
      img = set[Math.floor(e.animT/150)%4];
    }
  }
  if(img){
    drawRimLight(sp, e.x, e.y, e.scale, e.fx < -0.12);
    drawOutline(sp, e.x, e.y, e.scale, e.fx < -0.12);
    drawSprite(img, e.x, e.y, e.scale, e.fx < -0.12);
    if(e.hitFlash>0 && sp.flash){
      ctx.save();
      ctx.globalAlpha = Math.min(0.42, e.hitFlash/200);
      drawSprite(sp.flash, e.x, e.y, e.scale, e.fx < -0.12);
      ctx.restore();
    }
    if(sp.shine){
      // Capa extra de brillo: destello metálico pulsante en arma/escudo (o herida palpitante en el zombi)
      const pulse2 = 0.5+0.5*Math.sin(performance.now()/480 + e.animT*0.02);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = (0.15+0.28*pulse2)*ANIM_ALPHA_MUL;
      drawSprite(sp.shine, e.x, e.y, e.scale, e.fx < -0.12);
      ctx.restore();
    }
  }
  }
}
// Estados, nombre y barra de vida: fuera de la transformación, para que no bailen con la pose.
function drawEnemyOverlays(e){
  if(e.armorTimer>0){
    // Armadura de Hielo activa: aura celeste pulsante mientras dura la reducción de daño
    const pulse = 0.55+0.45*Math.sin(performance.now()/150);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const g = ctx.createRadialGradient(e.x, e.y-e.radius*0.6, 4, e.x, e.y-e.radius*0.6, e.radius*1.7);
    g.addColorStop(0, `rgba(150,225,255,${0.34*pulse+0.14})`);
    g.addColorStop(1, "rgba(150,225,255,0)");
    ctx.fillStyle = g; ctx.fillRect(e.x-e.radius*1.7, e.y-e.radius*2.5, e.radius*3.4, e.radius*3.4);
    ctx.restore();
  }

  if(e.burnTimer>0){
    ctx.fillStyle = "rgba(255,120,30,0.5)";
    for(let i=0;i<3;i++){
      ctx.fillRect(e.x-8+i*8, e.y-e.radius-18-((performance.now()/90+i*7)%10), 4, 5);
    }
  }
  if(e.cursed && e.curseTimer>0){
    // Nigromante — Plaga de los Condenados: aura verdosa pulsante mientras dure la maldición
    // (mismo criterio visual que burn/poison de arriba, propio para no confundirla con ellos).
    const pulseC = 0.5+0.5*Math.sin(performance.now()/220);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = `rgba(80,230,140,${0.35+0.3*pulseC})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(e.x, e.y+2, e.radius*1.05, e.radius*0.5, 0, 0, Math.PI*2); ctx.stroke();
    ctx.fillStyle = `rgba(80,230,140,${0.18+0.14*pulseC})`;
    ctx.beginPath(); ctx.arc(e.x, e.y-e.radius*0.5, 3, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }
  if(e.slowAmt>0.7){
    // congelado: bloque de hielo translúcido sobre la criatura
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = "#bfe8ff";
    ctx.fillRect(e.x-e.radius*0.9, e.y-e.radius*1.7, e.radius*1.8, e.radius*1.9);
    ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.lineWidth = 1.5;
    ctx.strokeRect(e.x-e.radius*0.9, e.y-e.radius*1.7, e.radius*1.8, e.radius*1.9);
    ctx.beginPath();
    ctx.moveTo(e.x-e.radius*0.5, e.y-e.radius*1.3); ctx.lineTo(e.x+e.radius*0.3, e.y-e.radius*0.6);
    ctx.moveTo(e.x+e.radius*0.4, e.y-e.radius*1.5); ctx.lineTo(e.x-e.radius*0.2, e.y-e.radius*0.4);
    ctx.stroke();
    ctx.restore();
  } else if(e.slowAmt>0){
    ctx.strokeStyle = "#8fd0ff"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(e.x, e.y+4, e.radius, e.radius*0.4, 0, 0, Math.PI*2); ctx.stroke();
  }
  if(e.stunTimer>0){
    ctx.fillStyle = "#ffd24a";
    ctx.fillRect(e.x-10, e.y-e.radius-26, 4, 4);
    ctx.fillRect(e.x+2, e.y-e.radius-30, 4, 4);
  }
  if(e.bleedTimer>0){
    ctx.fillStyle = "rgba(200,20,20,0.55)";
    ctx.fillRect(e.x-6, e.y+e.radius*0.4, 3, 5);
    ctx.fillRect(e.x+3, e.y+e.radius*0.5, 3, 6);
  }
  if(e.poisonTimer>0){
    const bub = 0.5+0.5*Math.sin(performance.now()/140);
    ctx.fillStyle = `rgba(90,220,110,${0.4+0.3*bub})`;
    ctx.beginPath(); ctx.arc(e.x-5, e.y-e.radius*0.6, 2.2, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(e.x+4, e.y-e.radius*0.9, 1.8, 0, Math.PI*2); ctx.fill();
  }
  if(e.regenTimer>0){
    const pulse = 0.55+0.45*Math.sin(performance.now()/180);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const g = ctx.createRadialGradient(e.x, e.y-e.radius*0.6, 4, e.x, e.y-e.radius*0.6, e.radius*1.6);
    g.addColorStop(0, `rgba(70,220,110,${0.32*pulse+0.12})`);
    g.addColorStop(1, "rgba(70,220,110,0)");
    ctx.fillStyle = g; ctx.fillRect(e.x-e.radius*1.6, e.y-e.radius*2.4, e.radius*3.2, e.radius*3.2);
    ctx.restore();
  }
  if(e.rank==="jefe" || e.rank==="subjefe"){
    ctx.save();
    ctx.font = "bold 11px Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(0,0,0,0.8)";
    ctx.fillText(e.name, e.x+1, e.y-e.radius-21);
    ctx.fillStyle = "#ffcf5c";
    ctx.fillText(e.name, e.x, e.y-e.radius-22);
    ctx.restore();
  }
  const bw = Math.max(e.radius*2, 26);
  const by = e.y - e.radius - 14;
  ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(e.x-bw/2, by, bw, 5);
  ctx.fillStyle = (e.rank==="jefe"||e.rank==="subjefe") ? "#ffb300" : "#e04a3a";
  ctx.fillRect(e.x-bw/2, by, bw*Math.max(0,e.hp/e.maxHp), 5);
  if(e.electrifiedTimer>0){
    // Aura eléctrica real (sprite) de Cadena de Relámpagos mientras dura el efecto
    const age = (e.electrifiedSize!==undefined ? 1 : 0); // solo para evitar warnings; usa reloj global
    CadenaRelampagos.draw(ctx, "electrificado", performance.now()/1000, e.x, e.y-e.radius*0.3, e.electrifiedSize||70);
  }
}

const _entPool = [], _entList = [];
let _entN = 0;
function _entPush(y, e, h, w, p){
  let it = _entPool[_entN];
  if(!it){ it = _entPool[_entN] = {y:0, e:null, h:null, w:null, p:null}; }
  it.y = y; it.e = e; it.h = h; it.w = w||null; it.p = p||null; _entN++;
}
function _entSort(a, b){ return a.y-b.y; }
function drawProjectileFx(p){
  const rgb = hexToRgb(p.color);
  const r = Math.max(3, p.radius);
  const sp = Math.hypot(p.vx||0, p.vy||0)||1;
  const tl = Math.min(r*4, sp*0.05);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = 0.45;
  ctx.strokeStyle = p.color; ctx.lineWidth = Math.max(2, r*0.8);
  ctx.beginPath(); ctx.moveTo(p.x-(p.vx||0)/sp*tl, p.y-(p.vy||0)/sp*tl); ctx.lineTo(p.x, p.y); ctx.stroke();
  ctx.globalAlpha = 0.85;
  const g = r*2.6;
  ctx.drawImage(glowSprite(rgb), p.x-g, p.y-g, g*2, g*2);
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  if(p.sprite==="orb" && acua2Ready("fxOrb")){
    drawImgSized(acua2Pick("fxOrb",0), p.x, p.y, r*3.4, 0.5, 0.5, false, undefined, animNow/300);
  } else {
    ctx.fillStyle = p.color; ctx.fillRect(p.x-r/2, p.y-r/2, r, r);
    ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.fillRect(p.x-r/4, p.y-r/4, r/2, r/2);
  }
  ctx.restore();
}

function worldToScreen(x,y){
  return { x: VW/2 + (x-player.x)*CAM_ZOOM, y: (VH/2 - CAM_Y_ANCHOR) + (y-player.y)*CAM_ZOOM };
}

function render(){
  ctx.clearRect(0,0,VW,VH);
  if(state!=="playing" && state!=="paused") return;
  animNow = performance.now();
  ANIM_ALPHA_MUL = 1; // resguardo: si un frame anterior se cortó a mitad de un fade, no arrastra el alpha

  ctx.save();
  ctx.scale(CAM_ZOOM, CAM_ZOOM);
  const shakeX = screenShake>0 ? (Math.random()-0.5)*screenShake : 0;
  const shakeY = screenShake>0 ? (Math.random()-0.5)*screenShake : 0;
  ctx.translate(VW/2/CAM_ZOOM - player.x + shakeX, (VH/2 - CAM_Y_ANCHOR)/CAM_ZOOM - player.y + shakeY);

  // Escenario: suelo, lava, muros, braseros
  drawArena();

  // partículas flotantes ambientales: brasas (Infernal), copos (Hielo) o luciérnagas (Bosque)
  const emberColor = currentArena==="hielo" ? "220,240,255" : currentArena==="bosque" ? "170,230,120" : "255,150,60";
  if(currentArena==="infernal") for(const em of embers){
    if(!inView(em.x, em.y, 20)) continue;
    const flicker = 0.5+0.5*Math.sin(em.phase*3);
    ctx.fillStyle = `rgba(${emberColor},${em.a*flicker})`;
    ctx.fillRect(em.x, em.y, 2, 2);
  }
  drawAcuaAmbience();
  vfxDrawGround(); // telegraphs de zonas peligrosas + ondas de choque
  vfxDrawSprites(true); // efectos de sprite real "de suelo" (bajo las entidades)

  // anillos de habilidad en el suelo
  for(const pt of particles){
    if(pt.ring || pt.warnRing){
      const base = pt.maxLife || (pt.warnRing ? 850 : 360);
      const prog = Math.max(0, Math.min(1, 1-(pt.life/base)));
      const r = Math.max(0, pt.maxR*(pt.warnRing?0.9:prog));
      if(r <= 0) continue;
      ctx.strokeStyle = pt.warnRing ? "rgba(255,90,40,0.85)" : (pt.color+"cc");
      ctx.lineWidth = pt.warnRing?3:5;
      ctx.beginPath(); ctx.ellipse(pt.x,pt.y+6,r,r*0.55,0,0,Math.PI*2); ctx.stroke();
    }
  }

  // pociones en el suelo
  for(const p of potions){
    drawShadow(p.x, p.y, 9);
    drawPotion(p);
  }

  // muros de fuego del Mago
  for(const fw of fireWalls){
    drawFireWall(fw);
  }

  // trampas del Asesino
  for(const tr of traps){
    drawTrap(tr);
  }
  // zonas de Axiom (Error 404 / Bug de Colisión)
  drawAxiomZones();
  drawSylvaRainZones();
  drawAxiomVfxActive();

  // héroes caídos (se dibujan bajo los vivos); en la Arena Divina también los campeones rivales,
  // que antes desaparecían en el acto al morir
  for(const h of heroes){ if(!h.alive) drawFallenHero(h); }
  if(divinaMode){ for(const h of divinaEnemies){ if(!h.alive && !h.isBossChamp && h.classKey) drawFallenHero(h); } }

  // cuerpos de enemigos muriendo (debajo de los vivos)
  vfxDrawDying();

  // entidades ordenadas por profundidad (entradas reutilizadas: sin allocations por frame; los
  // enemigos fuera de cámara no se dibujan -no se veían igual- y eso libera mucho con hordas grandes)
  _entN = 0;
  _animCrowdCount = 0;
  for(const e of enemies){
    if(!e.alive) continue;
    if(!inView(e.x, e.y, e.rank==="jefe" ? e.radius*4 : Math.max(140, e.radius*3))) continue;
    _animCrowdCount++;
    _entPush(e.y, e, null);
  }
  for(const h of heroes){ if(h.alive) _entPush(h.y, null, h); }
  for(const w of iceWalls){ if(inView(w.x, w.y, 80)) _entPush(w.y, null, null, w); }
  if(!player.duelActive) aidPushTall(); // columnas, árboles, muros del Laberinto, estructuras de la Divina
  if(divinaMode){
    // Los campeones divinos son "héroes" (drawHero), salvo en el nivel de jefes (nivel 6),
    // donde son entidades tipo enemigo (drawEnemy) — ver makeDivinaBossChamp.
    for(const h of divinaEnemies){ if(h.alive){ if(h.isBossChamp) _entPush(h.y, h, null); else _entPush(h.y, null, h); } }
    for(const m of divinaMinions){ if(m.alive) _entPush(m.y, m, null); }
  }
  animCrowd = _animCrowdCount;
  animFlashBudget = animCrowd > 70 ? 12 : 30;
  _entList.length = _entN;
  for(let i=0;i<_entN;i++) _entList[i] = _entPool[i];
  const ents = _entList;
  ents.sort(_entSort);
  for(const it of ents){
    if(it.p){ aidDrawTall(it.p, animNow/1000); continue; }
    if(it.w){ drawIceWall(it.w); continue; }
    if(it.e){
      if(divinaMode && (it.e.isBossChamp || it.e.side)) drawDivinaTeamRing(it.e, it.e.side || "enemy");
      drawEnemy(it.e);
    } else {
      drawHero(it.h);
    }
  }
  for(const h of heroes){ if(h.wolf) drawSpectralWolf(h.wolf); }
  drawMusashiAfterimages();
  for(const h of heroes){
    if(h.golem) drawGolemReal(h.golem);
    if(h.skeletons && h.skeletons.length) for(const sk of h.skeletons) drawSkeletonMinion(sk);
  }
  drawAcua2Overlays();
  drawBossSkillOverlay();
  vfxDrawSprites();

  // proyectiles: núcleo + glow cacheado + estela (sin shadowBlur, que es caro en mobile)
  for(const p of projectiles){
    if(!inView(p.x, p.y, 60)) continue;
    drawProjectileFx(p);
  }
  if(divinaMode) drawDivinaStructProjectiles();

  // partículas
  for(const pt of particles){
    if(pt.corpse){
      const sp = SPRITES["enemy_"+pt.spriteType];
      const img = sp ? (sp.hurt || sp.walk[0]) : null;
      if(img){
        const prog = 1 - Math.max(0, pt.life/pt.maxLife);
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1-prog*1.15);
        ctx.translate(pt.x, pt.y);
        ctx.rotate((pt.flip?-1:1) * Math.min(1, prog*2.2) * Math.PI/2);  // cae de costado
        ctx.translate(0, Math.min(1, prog*2.2)*6);
        ctx.imageSmoothingEnabled = false;
        const w = img.width/SPR_PX*pt.scale*0.92, h = img.height/SPR_PX*pt.scale*0.92;
        ctx.drawImage(img, -w/2, -h*0.74, w, h);
        ctx.restore();
      }
    } else if(pt.bolt){
      ctx.save();
      ctx.globalAlpha = Math.max(0, pt.life/220);
      ctx.strokeStyle = pt.color; ctx.lineWidth = 3; ctx.shadowColor = pt.color; ctx.shadowBlur = 8;
      const dx = pt.x2-pt.x, dy = pt.y2-pt.y;
      ctx.beginPath(); ctx.moveTo(pt.x, pt.y-10);
      ctx.lineTo(pt.x+dx*0.33+(Math.random()-0.5)*14, pt.y-10+dy*0.33+(Math.random()-0.5)*14);
      ctx.lineTo(pt.x+dx*0.66+(Math.random()-0.5)*14, pt.y-10+dy*0.66+(Math.random()-0.5)*14);
      ctx.lineTo(pt.x2, pt.y2-10);
      ctx.stroke();
      ctx.restore();
    } else if(pt.spin){
      const prog = 1-(pt.life/pt.maxLife);
      const ang = prog*Math.PI*3.4;
      ctx.save();
      ctx.globalAlpha = Math.max(0, pt.life/pt.maxLife)*0.9;
      ctx.strokeStyle = pt.color; ctx.lineWidth = 3; ctx.shadowColor = pt.color; ctx.shadowBlur = 6;
      for(let k=0;k<2;k++){
        const a = ang + k*Math.PI;
        ctx.beginPath();
        ctx.moveTo(pt.x, pt.y);
        ctx.lineTo(pt.x+Math.cos(a)*pt.radius, pt.y+Math.sin(a)*pt.radius*0.6);
        ctx.stroke();
      }
      ctx.restore();
    } else if(pt.slash){
      ctx.strokeStyle = pt.color; ctx.lineWidth = 5; ctx.globalAlpha = pt.life/140;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, 30, 0, Math.PI*1.4); ctx.stroke();
      ctx.globalAlpha = 1;
    } else if(pt.crystal){
      // Esquirla de hielo que emerge del suelo: crece y luego se desvanece (N3 de la referencia)
      const prog = 1-(pt.life/pt.maxLife);
      const pop = Math.sin(Math.PI*Math.min(1,prog*1.3));
      ctx.save();
      ctx.globalAlpha = Math.max(0, pop);
      ctx.translate(pt.x, pt.y - pop*4);
      ctx.rotate(pt.angle);
      ctx.fillStyle = pt.color; ctx.shadowColor = pt.color; ctx.shadowBlur = 6;
      const s = pt.size*pop;
      ctx.beginPath();
      ctx.moveTo(0, -s); ctx.lineTo(s*0.4, 0); ctx.lineTo(0, s*0.6); ctx.lineTo(-s*0.4, 0);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.lineWidth = 1; ctx.stroke();
      ctx.restore();
    } else if(pt.runeRing){
      // Círculo rúnico completo bajo el mago (N4 de la referencia): marcas giratorias en un anillo
      const alpha = Math.max(0, pt.life/pt.maxLife);
      const rot = performance.now()/900;
      ctx.save();
      ctx.globalAlpha = alpha*0.85;
      ctx.strokeStyle = pt.color; ctx.shadowColor = pt.color; ctx.shadowBlur = 5;
      for(let i=0;i<pt.count;i++){
        const a = rot + (i/pt.count)*Math.PI*2;
        const rx = pt.x+Math.cos(a)*pt.maxR, ry = pt.y+Math.sin(a)*pt.maxR*0.55;
        ctx.save();
        ctx.translate(rx, ry); ctx.rotate(a+Math.PI/2);
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0,-5); ctx.lineTo(0,5); ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    } else if(!pt.ring && !pt.warnRing){
      ctx.fillStyle = pt.color; ctx.globalAlpha = Math.max(0, pt.life/420);
      ctx.fillRect(pt.x, pt.y, 3, 3);
      ctx.globalAlpha = 1;
    }
  }

  vfxDrawParticles(); // partículas del pool central (impactos, muertes, casts, estelas)

  drawChainFX(); // sprites reales de Cadena de Relámpagos (rayos + impactos), dentro de la cámara

  aidAmbDraw(animNow/1000); // ambiente de primer plano: ceniza, nieve, hojas, polvo, motas
  aidGrade(animNow/1000);   // luz/color propio de la arena (debajo del HUD)

  ctx.restore();
}
