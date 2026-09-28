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
   TALENTOS Y MAESTRÍAS (permanentes por guardián)
   ============================================================
   Arquitectura data-driven: TALENT_TREES[classKey] = {masteryRequirement, nodes:[...], masteries:{...}}
   define TODO el contenido; el motor de abajo (compra/validación/aplicación) es genérico y no
   sabe nada de ningún guardián en particular -agregar/balancear un talento es tocar solo su
   entrada de datos, nunca esta sección-.

   Moneda (TALENTOS TEMPRANOS, reseña del crítico #3): el árbol tiene SU PROPIA bolsa, separada de
   save.champions[classKey].talentPoints (esa sigue siendo la de las 4 ranuras del kit, que se suben
   con el "+" del HUD). Antes los dos compartían bolsa y el árbol recién se abría en el nivel 40, o
   sea al terminar la campaña: el jugador casual nunca veía una build. Ahora:
     - Puntos de árbol GANADOS = f(nivel) (treePointsEarned): el primero en el nivel 5, uno por nivel
       desde ahí y uno extra en cada nivel redondo (10, 20, 30...). Nivel 40 = 40 puntos.
     - Puntos GASTADOS = suma de costo×rango de lo comprado (árbol + mini-árbol de la Maestría).
     - Disponibles = ganados + treeBonus (migración) - gastados. Se DERIVA, no se guarda: perder
       nivel por la derrota y volver a subirlo nunca regala puntos dos veces.
     - Cada escalón de una rama se abre por nivel según su profundidad (TALENT_TIER_LEVELS): la
       build crece durante toda la campaña (con la curva de progression.js: ~nivel 19 al ganar la
       1ra arena, ~30 a mitad de campaña, ~40 al final).
   Migración (save.js, talentTreeV2): lo que un guardado viejo había gastado en el árbol se DEVUELVE
   a la bolsa del kit, los nodos comprados se conservan y, si gastó más de lo que hoy daría su nivel,
   la diferencia queda en treeBonus (nunca queda "debiendo").

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
const TALENT_TREE_MIN_LEVEL = 5;   // primer punto y primer escalón del árbol (antes 40)
// Nivel que abre cada escalón de una rama, según su profundidad (0 = nodo raíz de la rama).
const TALENT_TIER_LEVELS = [5, 8, 12, 18, 26];
// Puntos de árbol ganados a un nivel dado (el primero en el nivel 5; +1 extra en cada nivel redondo).
function treePointsEarned(level){
  level = level|0;
  if(level < TALENT_TREE_MIN_LEVEL) return 0;
  return (level - TALENT_TREE_MIN_LEVEL + 1) + Math.floor(level/10);
}
// Lo gastado en el árbol y en el mini-árbol de la Maestría (costo × rango).
function treePointsSpent(classKey){
  const tree = talentTreeFor(classKey);
  const c = save.champions[classKey];
  if(!tree || !c || !c.talents) return 0;
  const st = c.talents;
  let n = 0;
  for(const node of tree.nodes){ const r = (st.nodes||{})[node.id]||0; if(r>0) n += r*(node.cost||1); }
  if(tree.masteries){
    for(const m of Object.values(tree.masteries)){
      for(const node of (m.miniTree||[])){ const r = (st.masteryNodes||{})[node.id]||0; if(r>0) n += r*(node.cost||1); }
    }
  }
  return n;
}
function treePointsAvailable(classKey){
  const c = save.champions[classKey];
  if(!c) return 0;
  return Math.max(0, treePointsEarned(c.level) + (c.treeBonus||0) - treePointsSpent(classKey));
}
// Profundidad de un nodo en su rama (cadena de requires) -> nivel que lo abre. Un nodo con
// minLevel explícito en los datos lo respeta (ninguno lo trae hoy: lo decide el escalón).
const _TALENT_DEPTH = {};
function talentNodeDepth(classKey, node){
  const key = classKey+"|"+node.id;
  if(_TALENT_DEPTH[key]!==undefined) return _TALENT_DEPTH[key];
  let d = 0, cur = node, guard = 0;
  while(cur && cur.requires && guard++ < 12){ cur = talentNodeById(classKey, cur.requires); if(cur) d++; }
  return (_TALENT_DEPTH[key] = d);
}
function talentNodeMinLevel(classKey, node){
  if(node.minLevel) return node.minLevel;
  const d = talentNodeDepth(classKey, node);
  return TALENT_TIER_LEVELS[Math.min(d, TALENT_TIER_LEVELS.length-1)];
}
// Próximo escalón que se abre para este guardián (para la UI): {level, tier} o null.
function talentNextTierUnlock(classKey){
  const c = save.champions[classKey]; if(!c) return null;
  for(let i=0;i<TALENT_TIER_LEVELS.length;i++) if(c.level < TALENT_TIER_LEVELS[i]) return {level:TALENT_TIER_LEVELS[i], tier:i+1};
  return null;
}
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
  { const need = talentNodeMinLevel(classKey, node); if(champ.level < need) return `Requiere nivel ${need}`; }
  { const taken = [].concat(node.exclusiveWith||[]).find(x=>(st.nodes[x]||0) > 0); // exclusiveWith: id o lista de ids
    if(taken){ const other = talentNodeById(classKey, taken); return `Bloqueado: ya elegiste "${other?other.name:taken}"`; } }
  if(node.requires){
    const req = talentNodeById(classKey, node.requires);
    const reqRank = st.nodes[node.requires] || 0;
    if(!req || reqRank < req.maxRank) return `Requiere "${req?req.name:node.requires}" al máximo`;
  }
  { const have = treePointsAvailable(classKey); if(have < (node.cost||1)) return `Sin puntos de talento (necesita ${node.cost||1}, tenés ${have})`; }
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
  const st = talentState(classKey);
  st.nodes[id] = (st.nodes[id]||0) + 1; // el costo sale de la bolsa del árbol (derivada: treePointsAvailable)
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
  { const taken = [].concat(node.exclusiveWith||[]).find(x=>(st.masteryNodes[x]||0) > 0);
    if(taken){ const tree = talentTreeFor(classKey), m = tree.masteries[st.mastery]; const other = m.miniTree.find(n=>n.id===taken); return `Bloqueado: ya elegiste "${other?other.name:taken}"`; } }
  if(node.requires){
    const tree = talentTreeFor(classKey), m = tree.masteries[st.mastery];
    const req = m.miniTree.find(n=>n.id===node.requires);
    const reqRank = st.masteryNodes[node.requires] || 0;
    if(!req || reqRank < req.maxRank) return `Requiere "${req?req.name:node.requires}" al máximo`;
  }
  { const have = treePointsAvailable(classKey); if(have < (node.cost||1)) return `Sin puntos de talento (necesita ${node.cost||1}, tenés ${have})`; }
  return null;
}
function buyMasteryNode(classKey, id, confirmed){
  const node = masteryMiniNodeById(classKey, id);
  if(!node) return {ok:false, reason:"Talento de Maestría inexistente"};
  const reason = masteryMiniLockReason(classKey, node);
  if(reason) return {ok:false, reason};
  if(!confirmed) return {ok:false, needsConfirm:true}; // toda compra de Maestría se confirma (sección 8)
  const st = talentState(classKey);
  st.masteryNodes[id] = (st.masteryNodes[id]||0) + 1; // idem: bolsa del árbol
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
        else if(typeof mod.value==="string") bucket.flags[mod.flag] = mod.value; // elección (ej. golemSkin:"fire"); antes quedaba en true y el elemento nunca se aplicaba
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
  // Sinergias (al estilo Diablo II): los puntos de los nodos "fuente" potencian OTRA habilidad.
  // Mismo balde por habilidad que los nodos: ninguna fórmula de combate se entera.
  for(const syn of talentSynergies(classKey)){
    const v = talentSynergyValue(classKey, syn);
    if(v && bySkill[syn.skill]) bySkill[syn.skill][syn.key] = (bySkill[syn.skill][syn.key]||0) + v;
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

/* ---------------- SINERGIAS (datos en TALENT_SYNERGIES, js/data/talent-trees.js) ----------------
   Cada punto en los nodos fuente suma un porcentaje a otra habilidad: el árbol deja de ser 3 ramas
   sueltas y la build se arma cruzándolas ("+6% daño de Nova por punto en Voltaje"). Se leen del
   estado de talentos del guardián (save.champions[k].talents): en el cooperativo el anfitrión ya
   tiene ahí el loadout del invitado, así que cada héroe usa SUS puntos. */
function talentSynergies(classKey){ return (typeof TALENT_SYNERGIES!=="undefined" && TALENT_SYNERGIES[classKey]) || []; }
function talentSynergyPoints(classKey, syn){
  const st = talentState(classKey);
  return syn.from.reduce((s,id)=>s + ((st.nodes||{})[id]||0), 0);
}
function talentSynergyValue(classKey, syn){ return syn.per * talentSynergyPoints(classKey, syn); }
const TALENT_SYNERGY_WORD = {powerMult:"daño", areaMult:"área", durationMult:"duración", cdMult:"enfriamiento"};
function talentSynergySkillName(classKey, syn){
  const cls = CLASSES[classKey]; if(!cls) return "?";
  return syn.skill==="ult" ? cls.ultimate.name : (cls.skills[syn.skill] ? cls.skills[syn.skill].name : "?");
}
function talentSynergyFromNames(classKey, syn){
  const names = syn.from.map(id=>{ const n = talentNodeById(classKey, id); return n ? n.name : id; });
  return names.length > 1 ? names.slice(0, -1).join(", ") + " y " + names[names.length-1] : names[0];
}
function _synPct(v){ return Math.round(v*1000)/10; }
// "+6% daño de Nova de Escarcha por punto en Voltaje y Conductividad (ahora +18%)"
function talentSynergyText(classKey, syn, withNow){
  const word = syn.what || TALENT_SYNERGY_WORD[syn.key] || "efecto";
  const base = `+${_synPct(syn.per)}% ${word} de ${talentSynergySkillName(classKey, syn)} por punto en ${talentSynergyFromNames(classKey, syn)}`;
  if(withNow===false) return base;
  const now = talentSynergyValue(classKey, syn);
  return base + ` (ahora +${_synPct(now)}%)`;
}
// Sinergias que potencian una habilidad (0/1/2/"ult") -> líneas de texto para su tooltip.
function talentSynergiesForSkill(classKey, skillKey){
  return talentSynergies(classKey).filter(s=>s.skill===skillKey);
}
// Sinergias en las que participa un nodo (como fuente) -> para el tooltip del nodo.
function talentSynergiesFromNode(classKey, nodeId){
  return talentSynergies(classKey).filter(s=>s.from.includes(nodeId));
}
// Texto corto "Sinergias: ..." para el botón de habilidad del HUD y el panel de Habilidades.
function talentSynergySkillLine(classKey, skillKey){
  const L = talentSynergiesForSkill(classKey, skillKey);
  if(!L.length) return "";
  return "Sinergias: " + L.map(s=>{
    const word = s.what || TALENT_SYNERGY_WORD[s.key] || "efecto";
    return `+${_synPct(s.per)}% ${word} por punto en ${talentSynergyFromNames(classKey, s)} (ahora +${_synPct(talentSynergyValue(classKey, s))}%)`;
  }).join(" · ");
}

/* ---------------- RESPEC POR ORO ----------------
   Reiniciar el árbol de un guardián: devuelve TODO lo gastado (árbol + mini-árbol de la Maestría)
   a su bolsa -la bolsa se deriva de nivel + treeBonus - gastado, así que nunca se pierde un punto-.
   El primero es gratis; después cuesta según el nivel del guardián y cada reinicio encarece el
   siguiente. La Maestría elegida se conserva (es permanente por diseño). Solo fuera de partida. */
const TALENT_RESPEC_BASE = 100, TALENT_RESPEC_PER_LEVEL = 40, TALENT_RESPEC_GROWTH = 0.25, TALENT_RESPEC_MAX_STEPS = 8;
function talentRespecCount(classKey){ const c = save.champions[classKey]; return c ? (c.talentRespecs|0) : 0; }
function talentRespecCost(classKey){
  const c = save.champions[classKey]; if(!c) return 0;
  const n = c.talentRespecs|0;
  if(n <= 0) return 0; // el primero, gratis
  const raw = (TALENT_RESPEC_BASE + TALENT_RESPEC_PER_LEVEL*(c.level|0)) * (1 + TALENT_RESPEC_GROWTH*Math.min(n-1, TALENT_RESPEC_MAX_STEPS));
  return Math.round(raw/10)*10;
}
function talentRespecLockReason(classKey){
  const c = save.champions[classKey];
  if(!c) return "Guardián inexistente";
  if((typeof state!=="undefined" && (state==="playing" || state==="paused" || state==="buff")) || (typeof netMatch!=="undefined" && netMatch)) return "No se puede reiniciar durante una partida";
  if(treePointsSpent(classKey) <= 0) return "No hay puntos invertidos para reiniciar";
  const cost = talentRespecCost(classKey);
  if((save.gold||0) < cost) return `Oro insuficiente (cuesta ${cost}, tenés ${save.gold||0})`;
  return null;
}
// confirmed: la UI pregunta antes (gameConfirm) y recién después llama con true.
function talentRespec(classKey, confirmed){
  const reason = talentRespecLockReason(classKey);
  if(reason) return {ok:false, reason};
  const cost = talentRespecCost(classKey);
  if(!confirmed) return {ok:false, needsConfirm:true, cost, refund:treePointsSpent(classKey)};
  const c = save.champions[classKey], st = talentState(classKey);
  const before = treePointsAvailable(classKey) + treePointsSpent(classKey);
  save.gold -= cost;
  st.nodes = {}; st.picks = {}; st.masteryNodes = {};
  c.talentRespecs = (c.talentRespecs|0) + 1;
  delete TALENT_MODS_CACHE[classKey];
  if(typeof invalidatePassiveCache==="function") invalidatePassiveCache();
  persist();
  if(typeof net!=="undefined" && net && net.role==="guest" && typeof netSendLoadout==="function") netSendLoadout(true);
  return {ok:true, cost, points:treePointsAvailable(classKey), lost: before - treePointsAvailable(classKey)};
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
