#!/usr/bin/env node
'use strict';
/* LA HORDA — TARJETA DE CALIDAD 0-100 POR ASPECTO (docs/quality/SCORECARD.md).
   Lee SOLO evidencia producida por herramientas del repo (docs/quality/evidence/*.log, las auditorías de la Bible y
   las partidas simuladas de docs/ux/playtest-score.json) y aplica fórmulas EXPLÍCITAS, que el informe muestra junto al
   número crudo. Nada se puntúa sin evidencia: un aspecto sin datos queda "SIN MEDIR" (no suma ni resta).
   Lo que una máquina no puede medir (si la música suena bien, si el arte es lindo) NO se inventa: se lista aparte
   como "juicio humano pendiente" y la tarjeta lo dice.
   Uso: node tools/quality/scorecard.js            (después de bash tools/quality/collect-evidence.sh) */
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const ROOT = path.resolve(__dirname, '../..'), EV = path.join(ROOT, 'docs/quality/evidence'), OUT = path.join(ROOT, 'docs/quality');
const read = f => { try { return fs.readFileSync(f, 'utf8'); } catch (e) { return null; } };
const json = f => { const s = read(f); try { return s ? JSON.parse(s) : null; } catch (e) { return null; } };
const log = n => read(path.join(EV, n + '.log'));
const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
const lin = (v, bad, good) => clamp(100 * (v - bad) / (good - bad));            // bad→0, good→100 (sirve en ambos sentidos)
const band = (v, lo, hi, slope) => v < lo ? clamp(100 - (lo - v) * slope) : v > hi ? clamp(100 - (v - hi) * slope) : 100;
// cuenta PASS/FAIL de una herramienta con el formato del repo ("PASS …" / "FAIL …" / exit=N)
function passRatio(n) {
  const s = log(n); if (s === null) return null;
  const pass = (s.match(/^\s*(PASS|✓)\b/mg) || []).length, fail = (s.match(/^\s*(FAIL|✗)\b/mg) || []).length;
  const exit = +((s.match(/exit=(\d+)/) || [])[1] || 0);
  if (!pass && !fail) return {ratio: exit ? 0 : 1, pass: exit ? 0 : 1, fail: exit ? 1 : 0, exit};
  return {ratio: pass / (pass + fail), pass, fail, exit};
}
const metrics = [];   // [{aspect, name, score, weight, raw, formula}]
const M = (aspect, name, score, weight, raw, formula) => { if (score === null || score === undefined || Number.isNaN(score)) metrics.push({aspect, name, score: null, weight, raw: raw === undefined ? 'sin evidencia' : raw, formula}); else metrics.push({aspect, name, score: Math.round(score), weight, raw, formula}); };

/* ---------- JUGABILIDAD (partidas simuladas con perfiles humanos) ---------- */
const play = json(path.join(ROOT, 'docs/ux/playtest-score.json'));
const rows = play && play.results || [];
const byProf = p => rows.filter(r => r.profile === p);
const winRate = rs => rs.length ? rs.filter(r => r.result === 'victory').length / rs.length : null;
const TARGET = {aprendiz: [0.5, 0.8], ocasional: [0.7, 0.95], habitual: [0.9, 1]};
for (const [p, [lo, hi]] of Object.entries(TARGET)) {
  const w = winRate(byProf(p));
  M('Jugabilidad', `victorias del perfil ${p}`, w === null ? null : band(w, lo, hi, 250), 1, w === null ? undefined : `${Math.round(w * 100)} % (${byProf(p).filter(r => r.result === 'victory').length}/${byProf(p).length})`, `objetivo ${lo * 100}–${hi * 100} %; −2,5 pts por punto porcentual afuera`);
}
if (rows.length) {
  const a = winRate(byProf('aprendiz')), o = winRate(byProf('ocasional')), h = winRate(byProf('habitual'));
  const mono = (h >= o ? 50 : 0) + (o >= a ? 50 : 0);
  M('Jugabilidad', 'la habilidad importa (habitual ≥ ocasional ≥ aprendiz)', mono, 1, `${Math.round(h * 100)} / ${Math.round(o * 100)} / ${Math.round(a * 100)} %`, '50 pts por cada escalón respetado');
  const tout = rows.filter(r => r.result !== 'victory' && r.result !== 'gameover').length;
  M('Jugabilidad', 'partidas que no terminan (tope 900 s)', clamp(100 - tout * 25), 1, `${tout}/${rows.length}`, '−25 por partida trabada');
  const secs = rows.filter(r => r.result === 'victory').map(r => r.seconds).sort((x, y) => x - y), med = secs.length ? secs[secs.length >> 1] : null;
  M('Jugabilidad', 'duración de una arena ganada (mediana)', med === null ? null : band(med, 360, 780, 0.25), 0.5, med === null ? undefined : med + ' s', 'objetivo 6–13 min; −0,25 pts por segundo afuera');
  const errs = (play.errors || []).length + rows.filter(r => r.autopilotError).length;
  M('Jugabilidad', 'errores durante las partidas', clamp(100 - errs * 20), 1, String(errs), '−20 por error');
}

/* ---------- JEFES (Boss Factory + pelea real) ---------- */
const boss = json(path.join(ROOT, 'docs/bible/generated/boss-audit.json'));
if (boss && boss.bosses) {
  const B = boss.bosses, sc = {PASS: 100, 'PASS*': 85, FIX: 40, REWORK: 0};
  M('Jefes', 'validación en pelea real', B.reduce((s, b) => s + (sc[b.status] || 0), 0) / B.length, 1.5, B.map(b => b.status).reduce((o, s) => (o[s] = (o[s] || 0) + 1, o), {}), 'PASS 100 · PASS* 85 · FIX 40 · REWORK 0');
  const auto = B.flatMap(b => b.hooks.filter(h => h.mode === 'auto' && !(b.checks || []).some(c => /forma posterior|modo propio/.test(c.detail))));
  M('Jefes', 'ganchos "auto" con su arena disparados', auto.length ? 100 * auto.filter(h => h.n > 0).length / auto.length : null, 1, `${auto.filter(h => h.n > 0).length}/${auto.length}`, '% de ganchos que la pelea real produce');
  M('Jefes', 'diseño (fichas PASS)', 100 * B.filter(b => b.design === 'PASS').length / B.length, 1, `${B.filter(b => b.design === 'PASS').length}/${B.length}`, '% de fichas con diseño PASS');
}
M('Jefes', 'pruebas de efecto (t_boss_arena_hooks)', passRatio('boss_hooks') && passRatio('boss_hooks').ratio * 100, 1, passRatio('boss_hooks') ? `${passRatio('boss_hooks').pass} PASS / ${passRatio('boss_hooks').fail} FAIL` : undefined, '% de pruebas que pasan');

/* ---------- ARENAS ---------- */
const arena = json(path.join(ROOT, 'docs/bible/generated/arena-audit.json'));
if (arena && arena.arenas) {
  const A = arena.arenas, sc = {PASS: 100, WARNING: 85, FAIL: 0};
  M('Arenas', 'validador de arenas (colisión, telegraphs, ficha, exploración)', A.reduce((s, a) => s + (sc[a.status] ?? 50), 0) / A.length, 1.5, A.map(a => a.status).reduce((o, s) => (o[s] = (o[s] || 0) + 1, o), {}), 'PASS 100 · WARNING 85 · FAIL 0');
}
if (rows.length) {
  const ar = [...new Set(rows.map(r => r.arena))], rates = ar.map(a => winRate(rows.filter(r => r.arena === a)));
  const ok = rates.filter(w => w >= 1 / 3 && w <= 1).length;
  M('Arenas', 'ninguna arena es un muro (gana ≥ 1 de 3 perfiles)', 100 * ok / ar.length, 1, ar.map((a, i) => `${a} ${Math.round(rates[i] * 100)}%`).join(' · '), '% de arenas ganables por al menos un tercio de los perfiles');
}

/* ---------- ARTE ---------- */
const dens = json(path.join(ROOT, 'docs/bible/generated/art/density.json'));
if (dens && dens.density) {
  const all = Object.values(dens.density).flat().filter(o => o.rank !== 'campeón' && o.vsChampion > 0);
  const ok = all.filter(o => o.vsChampion < 2.5).length, bad = all.filter(o => o.vsChampion >= 4).length;
  M('Arte', 'densidad de píxel coherente con los campeones (< ×2,5)', 100 * ok / all.length, 1, `${ok}/${all.length} tipos; ${bad} en REDRAW (≥ ×4)`, '% de tipos de enemigo/jefe con densidad < ×2,5 la del roster');
}
try {
  const c = {console}; vm.createContext(c);
  for (const f of ['js/arenas/common/arena-blueprints.js', 'js/arenas/common/boss-blueprints.js']) { try { vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/^(const|let) /mg, 'var '), c); } catch (e) {} }
  const BB = Object.values(c.BOSS_BLUEPRINTS || {});
  if (BB.length) M('Arte', 'jefes con arte propio y a la densidad del juego', 100 * BB.filter(b => b.art.grade !== 'REDRAW').length / BB.length, 1, `${BB.filter(b => b.art.grade !== 'REDRAW').length}/${BB.length} (REDRAW = cuerpo prestado o densidad ≥ ×4)`, '% de fichas de jefe sin REDRAW');
} catch (e) {}
const champ = json(path.join(ROOT, 'docs/bible/generated/champion-audit.json'));
if (champ && champ.champions) M('Arte', 'campeones: sprites y animaciones (validador)', 100 * champ.champions.filter(x => x.status === 'PASS').length / champ.champions.length, 1, `${champ.champions.filter(x => x.status === 'PASS').length}/${champ.champions.length}`, '% de campeones PASS en el validador');
M('Arte', 'proyectiles con identidad propia', passRatio('projectiles') && passRatio('projectiles').ratio * 100, 0.5, passRatio('projectiles') ? `${passRatio('projectiles').pass} PASS / ${passRatio('projectiles').fail} FAIL` : undefined, '% de pruebas que pasan');

/* ---------- AUDIO (técnico) ---------- */
for (const [n, label, w] of [['audio_mix', 'mezcla, identidad por arena/jefe/fase, costo (t_audio_mix)', 1.5], ['audio_levels', 'niveles en partida: picos, RMS, silencios', 1]]) {
  const r = passRatio(n); M('Audio', label, r && r.ratio * 100, w, r ? `${r.pass} PASS / ${r.fail} FAIL` : undefined, '% de comprobaciones que pasan');
}

/* ---------- HUD Y PRESENTACIÓN ---------- */
{ const s = log('ui_layout'); const m = s && s.match(/SUMMARY\s+issues=(\d+)(?:\s+fonts=(\d+))?/); M('HUD y presentación', '59 pantallas × 2 teléfonos: botones chicos, desbordes, letra diminuta, fuentes', m ? clamp(100 - (+m[1]) * 2 - (+(m[2] || 0)) * 2) : null, 1.5, m ? `issues=${m[1]} fonts=${m[2] || 0}` : undefined, '100 − 2 por problema'); }
{ const s = log('center_text'); const m = s && s.match(/SUMMARY[^\n]*/); let sc = null;
  if (m) { const big = +((m[0].match(/maxBig=(\d+)/) || [])[1] || 0), ov = +((m[0].match(/overlaps=(\d+)/) || [])[1] || 0), lc = +((m[0].match(/lootCenter=(\d+)/) || [])[1] || 0); sc = clamp(100 - Math.max(0, big - 2) * 20 - ov * 15 - lc * 10); }
  M('HUD y presentación', 'texto grande encimado en los momentos más cargados', sc, 1, m ? m[0].replace(/^SUMMARY\s*/, '') : undefined, '−20 por texto grande de más (>2), −15 por superposición, −10 por botín al centro'); }
for (const [n, label] of [['menu_taps', 'toques para las acciones comunes'], ['touch_targets', 'controles táctiles ≥ 44 px, en pantalla'], ['text_overflow', 'texto dentro de su marco'], ['functional', '290 contratos de interfaz (revivir, guías, layout)']]) {
  const r = passRatio(n); M('HUD y presentación', label, r && r.ratio * 100, 1, r ? `${r.pass} PASS / ${r.fail} FAIL${r.exit ? ' · exit ' + r.exit : ''}` : undefined, '% de comprobaciones que pasan');
}

/* ---------- MODOS DE JUEGO ---------- */
for (const [n, label] of [['crystal_sim', 'Guerra de Cristales: simulación (partidas completas de bots)'], ['crystal_hub', 'Guerra de Cristales: integrada al hub, ida y vuelta'], ['endless', 'Horda Infinita: rondas, jefes cada 5, mutadores, recompensa'], ['online', 'cooperativo real por el relay (4 clientes)']]) {
  const r = passRatio(n); M('Modos de juego', label, r && r.ratio * 100, 1, r ? `${r.pass} PASS / ${r.fail} FAIL` : undefined, '% de comprobaciones que pasan');
}
if (rows.length) { const h = winRate(byProf('habitual')); M('Modos de juego', 'campaña completa ganable por un jugador habitual', h * 100, 1, Math.round(h * 100) + ' %', '% de arenas ganadas por el perfil habitual'); }

/* ---------- RENDIMIENTO ---------- */
const fps = ['fps_infernal', 'fps_ciudad', 'fps_micelial'].map(n => { const s = log(n); const m = s && s.match(/\{[^\n]*"fpsMed"[^\n]*\}/); try { return m ? JSON.parse(m[0]) : null; } catch (e) { return null; } }).filter(Boolean);
if (fps.length) {
  const worst = fps.reduce((a, b) => a.fpsMed < b.fpsMed ? a : b);
  M('Rendimiento', 'FPS (mediana) con la horda más grande, CPU ×4 más lenta', lin(worst.fpsMed, 20, 55), 1.5, fps.map(f => `${f.arena} ${f.fpsMed} fps (p95 ${f.p95} ms, ${f.slowPct}% lentos, ${f.maxEnemies} enemigos)`).join(' · '), 'peor arena: 20 fps → 0, 55 fps → 100');
  M('Rendimiento', 'cuadros lentos (> 33 ms)', lin(worst.slowPct, 25, 2), 1, worst.slowPct + ' %', '25 % → 0, 2 % → 100');
}
{ const r = passRatio('loadtime'); M('Rendimiento', 'carga en 4G simulado (portada, MB, tiempo a jugar)', r && r.ratio * 100, 1, r ? `${r.pass} PASS / ${r.fail} FAIL` : undefined, '% de comprobaciones que pasan'); }

/* ---------- AGREGADO ---------- */
const ASPECTS = [['Jugabilidad', 20], ['Jefes', 12], ['Arenas', 12], ['Arte', 14], ['Audio', 10], ['HUD y presentación', 14], ['Modos de juego', 10], ['Rendimiento', 8]];
const aspect = {};
for (const [a, w] of ASPECTS) {
  const ms = metrics.filter(m => m.aspect === a && m.score !== null);
  aspect[a] = {weight: w, score: ms.length ? Math.round(ms.reduce((s, m) => s + m.score * m.weight, 0) / ms.reduce((s, m) => s + m.weight, 0)) : null, measured: ms.length, total: metrics.filter(m => m.aspect === a).length};
}
const measured = ASPECTS.filter(([a]) => aspect[a].score !== null);
const overall = measured.length ? Math.round(measured.reduce((s, [a, w]) => s + aspect[a].score * w, 0) / measured.reduce((s, [, w]) => s + w, 0)) : null;
const HUMAN = ['Si la música y los efectos SUENAN bien (son sintetizados; la tarjeta solo mide mezcla, niveles e identidad)',
  'Si el arte es lindo y coherente a la vista (la tarjeta mide densidad, arte propio y validadores técnicos)',
  'Sensación en un teléfono real (todo se midió en Chromium emulado)', 'Diversión y ritmo percibidos por personas'];
const rep = {generatedBy: 'tools/quality/scorecard.js', date: new Date().toISOString().slice(0, 10), overall, target: 90, aspects: aspect, metrics, humanJudgementPending: HUMAN};
fs.mkdirSync(OUT, {recursive: true});
fs.writeFileSync(path.join(OUT, 'scorecard.json'), JSON.stringify(rep, null, 1) + '\n');
const bar = v => v === null ? 'SIN MEDIR' : `**${v}**`;
const L = ['# Tarjeta de calidad (AUTO-GENERADO)', '', `> \`node tools/quality/scorecard.js\` sobre la evidencia de \`bash tools/quality/collect-evidence.sh\` (${rep.date}). Objetivo: **90/100** en cada aspecto. Cada nota sale de una fórmula visible sobre un número crudo medido por una herramienta del repo. Lo que necesita juicio humano no se puntúa (ver abajo).`, '',
  `## Total ponderado: ${bar(overall)} / 100`, '', '| Aspecto | Peso | Nota | Métricas medidas |', '|---|---|---|---|'];
for (const [a, w] of ASPECTS) L.push(`| ${a} | ${w} | ${bar(aspect[a].score)} | ${aspect[a].measured}/${aspect[a].total} |`);
for (const [a] of ASPECTS) {
  L.push('', `## ${a} — ${bar(aspect[a].score)}`, '', '| Métrica | Nota | Medido | Fórmula |', '|---|---|---|---|');
  for (const m of metrics.filter(m => m.aspect === a)) L.push(`| ${m.name} | ${m.score === null ? 'SIN MEDIR' : m.score} | ${typeof m.raw === 'object' ? JSON.stringify(m.raw) : m.raw} | ${m.formula} |`);
}
L.push('', '## Juicio humano pendiente (no se puntúa)', '', ...HUMAN.map(h => '- ' + h));
fs.writeFileSync(path.join(OUT, 'SCORECARD.md'), L.join('\n') + '\n');
console.log(`TOTAL ${overall}/100 · ` + ASPECTS.map(([a]) => `${a} ${aspect[a].score ?? '—'}`).join(' · '));
