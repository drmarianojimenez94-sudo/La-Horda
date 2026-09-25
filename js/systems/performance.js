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
const PERF_GRADES = [
  {g:"S+", min:88, color:"#ff5ad2"},
  {g:"S",  min:76, color:"#ffcf3a"},
  {g:"A",  min:61, color:"#6fdc8c"},
  {g:"B",  min:44, color:"#4fa8f0"},
  {g:"C",  min:0,  color:"#b8a898"}
];
// Convierte una proporción del equipo en 0..1: `lo` = nada destacable, `hi` = excelente.
const _band = (v, lo, hi) => Math.max(0, Math.min(1, (v - lo)/(hi - lo)));
// Cada componente: [etiqueta, peso, función(ctx) -> 0..1]
const PERF_ROLES = {
  tanque: [
    ["Daño mitigado y absorbido", 0.30, c => _band(c.share("tankLoad"), 0.3, 0.62)],
    ["Amenazas controladas",      0.20, c => _band(c.perMin("enemiesControlled") + c.perMin("presenceTicks")*0.25 + c.perMin("ccApplied")*0.15, 5, 22)],
    ["Protección de aliados",     0.16, c => _band(c.perMin("protectTicks"), 14, 46)],
    ["Revivir",                   0.10, c => c.reviveScore()],
    ["Supervivencia",             0.12, c => c.survival()],
    ["Participación en el jefe",  0.12, c => c.bossPart()]
  ],
  soporte: [
    ["Curación efectiva",         0.30, c => _band(c.healRatio(), 0.02, 0.16)],
    ["Escudos y potenciaciones",  0.14, c => _band(c.perMin("buffsGranted") + c.perMin("shieldGivenPct")*0.5, 0.8, 6)],
    ["Revivir",                   0.14, c => c.reviveScore()],
    ["Aliados salvados",          0.12, c => _band(c.perMin("alliesSaved"), 0.03, 0.4)],
    ["Supervivencia",             0.18, c => c.survival()],
    ["Participación",             0.12, c => Math.max(c.bossPart(), _band(c.share("dmgDealt"), 0.06, 0.2))]
  ],
  asesino: [
    ["Daño útil",                 0.22, c => _band(c.share("dmgDealt"), 0.15, 0.42)],
    ["Daño a élites y jefes",     0.28, c => _band(c.share("dmgToPriority"), 0.15, 0.42)],
    ["Bajas prioritarias",        0.18, c => _band(c.share("priorityKills"), 0.14, 0.45)],
    ["Participación en el jefe",  0.12, c => c.bossPart()],
    ["Supervivencia",             0.20, c => c.survival()]
  ],
  mago: [
    ["Daño útil",                 0.22, c => _band(c.share("dmgDealt"), 0.14, 0.4)],
    ["Área (enemigos por habilidad)", 0.18, c => _band(c.ratio("abilityHits", "skillCasts"), 1.4, 3.6)],
    ["Bajas múltiples",           0.12, c => _band(c.perMin("multiKills"), 0.5, 4)],
    ["Control",                   0.10, c => _band(c.perMin("ccApplied"), 1.5, 14)],
    ["Aporte contra élites/jefes", 0.18, c => _band(c.share("dmgToPriority"), 0.12, 0.38)],
    ["Supervivencia",             0.20, c => c.survival()]
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
    survival: () => { const up = Math.min(1, (s.aliveMs||0)/Math.max(1, runElapsedMs||1)); return Math.max(0, up - 0.22*(s.downs||0)); },
    bossPart: () => (s.bossFightSecs||0) > 5 ? Math.min(1, (s.bossTime||0)/(s.bossFightSecs*0.7)) : 0.6
  };
  const role = perfRoleOf(h.classKey);
  const parts = PERF_ROLES[role].map(([label, w, fn])=>{ const v = Math.max(0, Math.min(1, fn(ctx)||0)); return {label, weight:w, value:v}; });
  const score = Math.round(parts.reduce((t,p)=>t + p.value*p.weight, 0)*100);
  const g = gradeOf(score);
  return {role, score, grade:g.g, color:g.color, parts};
}
function _tankLoad(o){ const s = o.stats; return (s.mitigated||0) + (s.shieldAbsorbed||0) + (s.dmgTaken||0)*0.5; }
