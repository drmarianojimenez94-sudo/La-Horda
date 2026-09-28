// Curva de la CAMPAÑA (XP de guardián): con qué nivel se termina cada arena con la XP de victoria VIEJA
// (40 × puntaje × (1 + puntaje/100), igual en todas las arenas) y con la NUEVA (victoryXpFor en
// js/systems/progression.js: 0,5-1,4 niveles al nivel ESPERADO de la arena). Carga el código real del
// juego (xpToNext, victoryXpFor, VICTORY_XP_REF) en Node, sin navegador.
//   XP de bajas por arena: la medida por tools/balance/campaign_runs.js (RUNS=runs.jsonl); se escala con
//   el multiplicador de XP por nivel del grupo (setupRunDifficulty: 1 + 0,022 por nivel, tope ×2,5).
//   Derrotas: DEFEATS por arena (por defecto 0,5), cada una con la mitad de la XP de bajas de una partida
//   (las 3 primeras de la cuenta no se castigan; las demás pierden el 50 % de lo ganado).
// usage: RUNS=runs.jsonl [DEFEATS=0.5] node tools/balance/xp_curve.js
const fs = require('fs'); const path = require('path'); const vm = require('vm');
const ROOT = path.join(__dirname, '..', '..');
const ctx = { console, location: { search: '' }, window: { addEventListener() {} }, URLSearchParams, Math };
vm.createContext(ctx);
for (const f of ['js/data/arenas.js', 'js/systems/progression.js']) {
  try { vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f }); } catch (e) { if (!/is not defined/.test(e.message)) throw e; }
}
const G = k => vm.runInContext(`typeof ${k}!=="undefined" ? ${k} : undefined`, ctx);
const xpToNext = G('xpToNext'), victoryXpFor = G('victoryXpFor'), ORDER = G('CAMPAIGN_ORDER');
if (!xpToNext || !ORDER) { console.error('no se pudo cargar progression.js / arenas.js'); process.exit(1); }
const runs = {};
if (process.env.RUNS) for (const l of fs.readFileSync(process.env.RUNS, 'utf8').split('\n')) { try { const r = JSON.parse(l.trim()); if (r.arena && r.killXp) runs[r.arena] = r; } catch (e) {} }
const lvXp = L => 1 + Math.min(1.5, Math.max(0, L - 1) * 0.022);
const killXpAt = (a, L) => { const r = runs[a]; if (!r) return null; return r.killXp * lvXp(L) / lvXp(r.lvl); };
const oldVictory = s => Math.round(40 * s * (1 + s / 100));
const DEF = +(process.env.DEFEATS || 0.5);
function grant(st, amt) { st.xp += amt; while (st.xp >= xpToNext(st.lv)) { st.xp -= xpToNext(st.lv); st.lv++; } }
function sim(score, mode) {
  const st = { lv: 1, xp: 0 }, rows = []; let defeats = 0;
  for (const a of ORDER) {
    const k = killXpAt(a, st.lv); if (k === null) { rows.push(a + ':?'); continue; }
    const lv0 = st.lv;
    // derrotas antes de ganar (fraccionarias: se reparte la XP esperada)
    const dxp = k * 0.5 * DEF * (defeats < 3 ? 1 : 0.5); defeats += DEF; grant(st, dxp);
    grant(st, k);
    const lvBefore = st.lv + st.xp / xpToNext(st.lv);
    const v = mode === 'old' ? oldVictory(score) : victoryXpFor(a, score, st.lv, 'normal');
    grant(st, v);
    const lvAfter = st.lv + st.xp / xpToNext(st.lv);
    rows.push(`${a}:${lv0}→${lvAfter.toFixed(1)} (victoria +${(lvAfter - lvBefore).toFixed(1)} nv)`);
  }
  return { final: st.lv, rows };
}
console.log('XP de bajas medida:', Object.fromEntries(Object.entries(runs).map(([a, r]) => [a, { lvl: r.lvl, killXp: r.killXp }])));
for (const score of [45, 70, 90]) for (const mode of ['old', 'new']) {
  if (mode === 'new' && !victoryXpFor) continue;
  const r = sim(score, mode);
  console.log(`\n[${mode === 'old' ? 'VIEJA' : 'NUEVA'}] puntaje ${score} · derrotas/arena ${DEF} → nivel final ${r.final}`);
  console.log('  ' + r.rows.join('\n  '));
}
