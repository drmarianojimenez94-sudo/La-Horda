"use strict";
/* ============================================================
   js/systems/performance.js
   CALIFICACIÓN PERSONAL POR ROL (C · B · A · S · S+).
   Cada rol se mide por lo que su rol aporta, no por daño bruto: así un tanque o un soporte
   pueden sacar S+ igual que un asesino. Casi todo se mide como PARTE DEL EQUIPO (qué porción
   del daño a élites hiciste, cuánto del daño recibido por el equipo curaste, etc.) o por
   minuto: no depende de la arena, del nivel de los campeones ni de lo que duró la partida.
     TANQUE  — daño mitigado/absorbido, amenazas controladas, proteger aliados, revivir,
               supervivencia, participación en el jefe.
     SOPORTE — curación EFECTIVA (no cuenta lo que sobra), escudos/potenciaciones, revivir,
               aliados salvados, supervivencia, participación.
     ASESINO — daño útil, daño a élites/jefes, bajas prioritarias, supervivencia.
     MAGO    — daño útil, eficiencia en área (enemigos por habilidad), bajas múltiples,
               control, aporte contra élites/jefes, supervivencia.
   >>> Umbrales y pesos: PERF_ROLES / PERF_GRADES.
   ============================================================ */
// EXIGENTE: 100/100 es posible pero pide una partida casi perfecta en TODO lo que mide el rol
// (sin caídas, esquivando lo telegrafiado, aportando al equipo y al jefe). Calibrado con
// tools/balance/perfsim.js: el piloto automático "competente" queda en B/A.
const PERF_GRADES = [
  {g:"S+", min:93, color:"#ff5ad2"},
  {g:"S",  min:83, color:"#ffcf3a"},
  {g:"A",  min:67, color:"#6fdc8c"},
  {g:"B",  min:50, color:"#4fa8f0"},
  {g:"C",  min:0,  color:"#b8a898"}
];
// Convierte una proporción del equipo en 0..1: `lo` = nada destacable, `hi` = excelente.
const _band = (v, lo, hi) => Math.max(0, Math.min(1, (v - lo)/(hi - lo)));
// Cada componente: [etiqueta, peso, función(ctx) -> 0..1]
const PERF_ROLES = {
  tanque: [
    ["Daño mitigado y absorbido", 0.26, c => _band(c.share("tankLoad"), 0.32, 0.66)],
    ["Amenazas controladas",      0.18, c => _band(c.perMin("enemiesControlled") + c.perMin("presenceTicks")*0.25 + c.perMin("ccApplied")*0.15, 6, 26)],
    ["Protección de aliados",     0.14, c => _band(c.perMin("protectTicks"), 16, 50)],
    ["Revivir",                   0.08, c => c.reviveScore()],
    ["Supervivencia",             0.14, c => c.survival()],
    ["Mecánicas del jefe",        0.12, c => c.bossPart()],
    ["Esquivar lo telegrafiado",  0.08, c => c.avoidance()]
  ],
  soporte: [
    ["Curación efectiva",         0.26, c => _band(c.healRatio(), 0.03, 0.2)],
    ["Escudos y potenciaciones",  0.12, c => _band(c.perMin("buffsGranted") + c.perMin("shieldGivenPct")*0.5, 1, 7)],
    ["Revivir",                   0.12, c => c.reviveScore()],
    ["Aliados salvados",          0.12, c => _band(c.perMin("alliesSaved"), 0.05, 0.5)],
    ["Supervivencia",             0.16, c => c.survival()],
    ["Participación",             0.10, c => Math.max(c.bossPart(), _band(c.share("dmgDealt"), 0.08, 0.24))],
    ["Esquivar lo telegrafiado",  0.12, c => c.avoidance()]
  ],
  asesino: [
    ["Daño útil",                 0.20, c => _band(c.share("dmgDealt"), 0.18, 0.48)],
    ["Daño a élites y jefes",     0.24, c => _band(c.share("dmgToPriority"), 0.18, 0.48)],
    ["Bajas prioritarias",        0.16, c => _band(c.share("priorityKills"), 0.16, 0.5)],
    ["Mecánicas del jefe",        0.10, c => c.bossPart()],
    ["Supervivencia",             0.18, c => c.survival()],
    ["Esquivar lo telegrafiado",  0.12, c => c.avoidance()]
  ],
  mago: [
    ["Daño útil",                 0.20, c => _band(c.share("dmgDealt"), 0.16, 0.45)],
    ["Área (enemigos por habilidad)", 0.16, c => _band(c.ratio("abilityHits", "skillCasts"), 1.6, 4.2)],
    ["Bajas múltiples",           0.10, c => _band(c.perMin("multiKills"), 0.6, 5)],
    ["Control",                   0.08, c => _band(c.perMin("ccApplied"), 2, 16)],
    ["Aporte contra élites/jefes", 0.16, c => _band(c.share("dmgToPriority"), 0.14, 0.42)],
    ["Supervivencia",             0.18, c => c.survival()],
    ["Esquivar lo telegrafiado",  0.12, c => c.avoidance()]
  ]
};
function perfRoleOf(classKey){
  const r = CLASSES[classKey] && CLASSES[classKey].roleCategory;
  return PERF_ROLES[r] ? r : "asesino";
}
function gradeOf(score){ for(const g of PERF_GRADES) if(score >= g.min) return g; return PERF_GRADES[PERF_GRADES.length-1]; }

/* ---------------- recolección durante la partida ---------------- */
let teamDowns = 0; // veces que cayó alguien del equipo (para que "revivir" no castigue si nadie cayó)
function resetPerformanceRun(){ teamDowns = 0; }
function samplePerformance(h, dt){
  const s = h.stats; if(!s) return;
  if(h.alive) sampleTankPresence(h, dt);
  if(h.alive) s.aliveMs = (s.aliveMs||0) + dt;
  else if(!h._downCounted){ h._downCounted = true; s.downs = (s.downs||0) + 1; teamDowns++; }
  if(h.alive) h._downCounted = false;
  s._perfT = (s._perfT||0) + dt;
  if(s._perfT < 1000) return;
  s._perfT -= 1000;
  if(!h.alive) return;
  // pelea del jefe: cerca y vivo
  if(bossActive && boss && boss.alive && distance(h, boss) < 460) s.bossTime = (s.bossTime||0) + 1;
  if(bossActive) s.bossFightSecs = (s.bossFightSecs||0) + 1;
  // protección: un aliado con enemigos encima y vos a su lado (la presencia la mide sampleTankPresence)
  for(const a of heroes){
    if(a===h || !a.alive || distance(a,h) > 170) continue;
    if(enemies.some(e=>e.alive && distance(e,a) < 150)){ s.protectTicks = (s.protectTicks||0) + 1; break; }
  }
}
function trackKillPerformance(h, e){
  const s = h.stats; if(!s) return;
  if(e.rank!=="normal") s.priorityKills = (s.priorityKills||0) + 1;
  const now = runElapsedMs;
  if(now - (h._lastKillAt||-1e9) < 700) s.multiKills = (s.multiKills||0) + 1;
  h._lastKillAt = now;
}

/* ---------------- cálculo ---------------- */
function computePerformance(h){
  const s = h.stats || {};
  const party = heroes.filter(o=>o.stats);
  const sum = k => party.reduce((t,o)=>t + (k==="tankLoad" ? _tankLoad(o) : (o.stats[k]||0)), 0);
  const mine = k => k==="tankLoad" ? _tankLoad(h) : (s[k]||0);
  const mins = Math.max(1, (runElapsedMs||60000)/60000);
  const ctx = {
    share: k => { const t = sum(k); return t > 0 ? mine(k)/t : 0; },
    perMin: k => (s[k]||0)/mins,
    ratio: (a, b) => (s[a]||0)/Math.max(1, s[b]||0),
    healRatio: () => { const taken = party.reduce((t,o)=>t + (o.stats.dmgTaken||0), 0); return taken > 0 ? (s.healEffective||0)/taken : 0; },
    reviveScore: () => teamDowns <= 0 ? 0.75 : Math.min(1, 0.3 + 0.7*(s.revives||0)/Math.max(1, teamDowns*0.5)),
    // cada caída cuesta mucho (y morir del todo deja la supervivencia en 0)
    survival: () => { if(h===player && !h.alive) return 0; const up = Math.min(1, (s.aliveMs||0)/Math.max(1, runElapsedMs||1)); return Math.max(0, up - 0.35*(s.downs||0)); },
    // golpes con aviso en el suelo que igual te pegaron, por minuto y relativo a tu vida
    avoidance: () => 1 - _band((s.avoidableTaken||0)/Math.max(1, h.maxHp)/mins, 0.04, 0.5),
    bossPart: () => (s.bossFightSecs||0) > 5 ? Math.min(1, (s.bossTime||0)/(s.bossFightSecs*0.7)) : 0.6
  };
  const role = perfRoleOf(h.classKey);
  const parts = PERF_ROLES[role].map(([label, w, fn])=>{ const v = Math.max(0, Math.min(1, fn(ctx)||0)); return {label, weight:w, value:v}; });
  const score = Math.round(parts.reduce((t,p)=>t + p.value*p.weight, 0)*100);
  const g = gradeOf(score);
  return {role, score, grade:g.g, color:g.color, parts};
}
function _tankLoad(o){ const s = o.stats; return (s.mitigated||0) + (s.shieldAbsorbed||0) + (s.dmgTaken||0)*0.5; }
