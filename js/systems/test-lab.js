"use strict";
/* ============================================================
   js/systems/test-lab.js — GM / TEST LAB
   Sesión de TEST distinta del PROGRESO REAL: congela una copia del guardado, bloquea toda escritura
   (persistNow), arma el escenario en memoria y al volver al menú restaura la copia intacta. Permite
   probar cualquier campeón (STANDARD, FAMILY, FOUNDER, EVENT, DEV, TESTER y DRAFT/INTERNAL/TESTING)
   sin poseerlo. El permiso TEST_CONTENT se valida en el servidor (/api/gm/testlab/start) y, aunque
   un cliente manipulado abra el laboratorio, el servidor sanea la propiedad de esos campeones al guardar.
   ============================================================ */
let _testLab = null;
function testLabActive(){ return !!_testLab; }
function testLabChampions(){
  return Object.keys(CLASSES).filter(k=>save.champions[k] || PORTADORES[k] || CHAMPION_CATALOG.some(c=>c.id===k)).map(k=>{
    const m = championMeta(k); return {id:k, name:CLASSES[k].name, category:m.category, releaseState:m.releaseState};
  }).sort((a,b)=>CHAMPION_CATEGORIES[a.category].order-CHAMPION_CATEGORIES[b.category].order || a.name.localeCompare(b.name));
}
function testLabSkins(k){
  const out = [["", "Original"]];
  if(typeof ASCENSION_SKINS!=="undefined" && ASCENSION_SKINS[k]) ASCENSION_SKINS[k].forEach((s,i)=>out.push(["asc:"+(i+1), s.name+" (perfil VFX)"]));
  if(typeof SET_SKINS!=="undefined") for(const [id,s] of Object.entries(SET_SKINS)) if(s.champ===k) out.push(["set:"+id, s.name||id]);
  if(typeof CROMA_SKINS!=="undefined") for(const [id,s] of Object.entries(CROMA_SKINS)) if(s.champ===k) out.push(["croma:"+id, s.name||id]);
  return out;
}
// cfg: {champion, skin, level, talents:"none"|"max", arena, difficulty, equipment:"none"|"set", startLevel, mods:{enemyHp, spawnRate}}
function testLabStart(cfg){
  if(_testLab) testLabEnd();
  const k = cfg.champion; if(!CLASSES[k]) throw Error("Campeón inválido");
  if(typeof net!=="undefined" && net.role) throw Error("Salí de la sala online antes de abrir una sesión de test.");
  _testLab = {snapshot: JSON.stringify(save), cfg, started: Date.now()};
  const c = save.champions[k] || (save.champions[k] = mkChampion(false));
  const level = Math.max(1, Math.min(99, cfg.level|0 || 1));
  Object.assign(c, {unlocked:true, level, xp:0});
  c.talentPoints = 0; c.talents = {nodes:{}, picks:{}, mastery:null, masteryNodes:{}};
  if(cfg.talents === "max" && TALENT_TREES[k]){ const T = TALENT_TREES[k]; for(const n of T.nodes) c.talents.nodes[n.id] = n.maxRank; const first = Object.keys(T.masteries||{})[0]; if(first){ c.talents.mastery = first; for(const n of T.masteries[first].miniTree||[]) c.talents.masteryNodes[n.id] = n.maxRank; } }
  c.skillMastery = [0,1,2].map(()=>Object.assign(mkMastery(), {alloc:Math.min(4, Math.floor(level/5))})); c.ultMastery = Object.assign(mkMastery(), {alloc:Math.min(4, Math.floor(level/5))});
  c.equipment = {arma:null, escudo:null, casco:null, pechera:null, guantes:null, botas:null};
  if(cfg.equipment === "set"){ const S = Object.values(CHAMPION_SETS||{}).find(s=>s.champion===k); if(S) for(const slot in S.pieces){ const it = makeDesignedItem(S.id+"_"+slot); stashItems().push(it); c.equipment[slot] = it.uid; } }
  c.croma = null; c.cosmeticSkin = ""; c.ascSkin = 0;
  const skin = String(cfg.skin||"");
  if(skin.startsWith("asc:")) c.ascSkin = Number(skin.slice(4))|0;
  else if(skin.startsWith("croma:")) c.croma = skin.slice(6);
  else if(skin.startsWith("set:")) c.cosmeticSkin = skin.slice(4);
  if(typeof DIFF_TIERS!=="undefined" && DIFF_TIERS[cfg.difficulty]) save.diffSelected = cfg.difficulty;
  selectedClass = k; currentArena = ARENA_MODS[cfg.arena] ? cfg.arena : "bosque";
  _testLab.mods = cfg.mods || {};
  testLabBadge(true);
  if(typeof invalidatePassiveCache==="function") invalidatePassiveCache();
  startRun(Math.max(1, Math.min(10, cfg.startLevel|0 || 1)));
  return true;
}
function testLabEnd(){
  if(!_testLab) return false;
  const snap = _testLab.snapshot; _testLab = null;
  try{ const restored = JSON.parse(snap); for(const key of Object.keys(save)) delete save[key]; Object.assign(save, restored); }catch(e){}
  if(typeof invalidatePassiveCache==="function") invalidatePassiveCache();
  if(typeof ensureOwnedSelection==="function") ensureOwnedSelection();
  testLabBadge(false);
  return true;
}
function testLabBadge(on){
  let el = document.getElementById("testlab-badge");
  if(!on){ if(el) el.remove(); return; }
  if(!el){ el = document.createElement("div"); el.id = "testlab-badge"; el.className = "testlab-badge"; el.setAttribute("role","status"); document.body.appendChild(el); }
  el.textContent = "SESIÓN DE TEST · el progreso NO se guarda";
}
// Modificadores de la sesión (solo multiplican, nunca persisten).
function testLabEnemyMods(){ return _testLab && _testLab.mods ? _testLab.mods : null; }
(function(){
  if(typeof setState !== "function") return;
  const original = setState;
  setState = function(s){ if(_testLab && ["mainmenu","title","modeselect","prep"].includes(s)) testLabEnd(); return original.apply(this, arguments); };
})();
