"use strict";
/* ============================================================
   js/arenas/arena-rules.js
   Reglas de arena: modificadores activos, desbloqueo y la REGLA CRECIENTE de cada arena
   (un castigo propio que se intensifica con cada nivel y, durante la pelea con el jefe, cada
   45 segundos -para que ninguna pelea se estire sin presión-).
   ============================================================ */

function arenaMods(){ return ARENA_MODS[currentArena] || ARENA_MODS.bosque; }
// Campaña: la primera arena (Ruinas del Bosque) está abierta desde el comienzo y cada una de las
// siguientes se abre al superar la anterior, en el orden real de ARENA_ORDER. Un anfitrión solo
// puede crear una sala para una arena que tenga abierta (el multijugador no saltea la campaña).
function isArenaUnlocked(key){
  const i = ARENA_ORDER.indexOf(key);
  if(i <= 0) return i===0;
  const cleared = save.arenasCleared || {};
  // La Fortaleza se sumó como 3ra arena: quien ya tenía abierto el Hielo (Acuática superada ANTES
  // de que existiera) lo conserva (save.legacyHieloOpen, ver loadSave).
  if(key==="hielo" && save.legacyHieloOpen) return true;
  return !!cleared[ARENA_ORDER[i-1]];
}
// Reglas del MODO de juego (no de cada arena). Hoy todo es PvE: arenas de oleadas y Arena
// Divina (contra un equipo manejado por la IA). Un modo PvP futuro puede declarar
// friendlyFire:true sin tocar el resto del código.
const MODE_RULES = {
  arena_pve:{friendlyFire:false}
};
function modeRules(){ return MODE_RULES.arena_pve; }
// Si `src` es (o pertenece a) un héroe del equipo del jugador, devuelve ese héroe; si no, null.
// Cubre golpes directos, proyectiles (src.src), invocaciones (owner) y zonas (caster).
function allyAttackerOf(src){
  if(!src || typeof src!=="object" || typeof heroes==="undefined" || !heroes) return null;
  const cands = [src, src.src, src.owner, src.caster, src.from];
  for(const c of cands){ if(c && typeof c==="object" && heroes.includes(c)) return c; }
  return null;
}

// Regla creciente de cada arena. `stacks` = intensidad actual (0 en el nivel 1). Los números
// se leen en las fórmulas de siempre a través de las funciones arenaRule*Mult() de abajo.
const ARENA_RULES = {
  bosque:    {name:"Raíces Voraces",      icon:"🌿", summary:n=>`Raíces que atrapan · regeneración enemiga +${n*12}%`},
  acuatica:  {name:"Presión Abisal",      icon:"🌊", summary:n=>`Energía −${Math.round(n*4)}% · corrientes más fuertes`},
  hielo:     {name:"Frío Creciente",      icon:"❄", summary:n=>`Velocidad −${(n*2.2).toFixed(0)}% · enfriamientos +${(n*2.5).toFixed(0)}%`},
  laberinto: {name:"Muros que se Cierran",icon:"🗿", summary:n=>`Daño recibido +${Math.round(n*2.5)}% · derrumbes`},
  infernal:  {name:"Tierra Maldita",      icon:"🔥", summary:n=>`Curación −${Math.round(Math.min(50,n*5))}% · pozos de lava`},
  fortaleza: {name:"Engranajes Implacables", icon:"⚙", summary:n=>`Trampas +${n*5}% de daño · la Fortaleza acelera`}
};
let arenaRuleBossTimer = 0, arenaRuleBossStacks = 0;
function arenaRule(){ return (!divinaMode && ARENA_RULES[currentArena]) || null; }
function arenaRuleStacks(){
  if(!arenaRule() || typeof runLevel!=="number") return 0;
  return Math.max(0, runLevel-1) + arenaRuleBossStacks;
}
function arenaRuleCdMult(){ return currentArena==="hielo" && arenaRule() ? 1 + 0.025*arenaRuleStacks() : 1; }
function arenaRuleSpeedMult(){ return currentArena==="hielo" && arenaRule() ? Math.max(0.74, 1 - 0.022*arenaRuleStacks()) : 1; }
function arenaRuleEnergyRegenMult(){ return currentArena==="acuatica" && arenaRule() ? Math.max(0.55, 1 - 0.04*arenaRuleStacks()) : 1; }
function arenaRuleHealMult(){ return currentArena==="infernal" && arenaRule() ? Math.max(0.5, 1 - 0.05*arenaRuleStacks()) : 1; }
function arenaRuleDmgTakenMult(){ return currentArena==="laberinto" && arenaRule() ? 1 + 0.025*arenaRuleStacks() : 1; }
function arenaRuleEnemyRegenMult(){ return currentArena==="bosque" && arenaRule() ? 1 + 0.12*arenaRuleStacks() : 1; }
// Frecuencia de los peligros ambientales: más seguidos cuanto más intensa la regla.
function arenaRuleHazardIntervalMult(){ return Math.max(0.45, 1 - 0.06*arenaRuleStacks()); }

function resetArenaRule(){ arenaRuleBossTimer = 0; arenaRuleBossStacks = 0; updateArenaRuleChip(); }
// Durante la pelea con el jefe la regla se intensifica cada 45 s (máximo +4).
function updateArenaRuleBoss(dt){
  if(!bossActive || !arenaRule() || arenaRuleBossStacks >= 4) return;
  arenaRuleBossTimer += dt;
  if(arenaRuleBossTimer >= 45000){
    arenaRuleBossTimer = 0; arenaRuleBossStacks++;
    const r = arenaRule();
    showBanner(`${r.icon} ${r.name} se intensifica`);
    updateArenaRuleChip();
  }
}
function arenaRuleLevelText(){
  const r = arenaRule(); if(!r) return "";
  const n = arenaRuleStacks();
  return n>0 ? `${r.icon} ${r.name} ×${n}` : `${r.icon} ${r.name}`;
}
function updateArenaRuleChip(){
  const el = document.getElementById("arena-rule-chip");
  if(!el) return;
  const r = arenaRule();
  if(!r){ el.classList.add("hidden"); return; }
  const n = arenaRuleStacks();
  el.classList.remove("hidden");
  el.innerHTML = `<b>${r.icon} ${r.name}${n>0?` ×${n}`:""}</b>`;
  el.title = n>0 ? r.summary(n) : "Se intensifica con cada nivel";
}
