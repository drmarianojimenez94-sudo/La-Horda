'use strict';
/* GAME BIBLE AUTO-SINCRONIZADA: genera docs/bible/generated/CHAMPION_REFERENCE.md y ARENA_REFERENCE.md
   desde los DATOS REALES del juego cargado (CHAMPION_IDENTITY + ability-registry + ARENA_BLUEPRINTS +
   SET_ARENA_WEIGHTS). Separado de los documentos de diseño: estos archivos no se editan a mano.
   Uso: node tools/bible/build-reference.js */
const fs = require('node:fs'), path = require('node:path'), {spawn} = require('node:child_process');
let chromium; try { ({chromium} = require('playwright')); } catch (e) { ({chromium} = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const ROOT = path.resolve(__dirname, '../..'), PORT = +(process.env.BIBLE_PORT || 8833), OUT = path.join(ROOT, 'docs/bible/generated');
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], {cwd: ROOT, stdio: 'ignore'});
(async () => {
  await new Promise(r => setTimeout(r, 600));
  const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || chromium.executablePath(), args: ['--no-sandbox']});
  try {
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${PORT}/`, {waitUntil: 'domcontentloaded', timeout: 120000});
    await page.waitForFunction(() => typeof championAbilityDefinitions === 'function' && typeof ARENA_BLUEPRINTS !== 'undefined', null, {timeout: 120000});
    const data = await page.evaluate(() => ({
      champions: Object.keys(CLASSES).map(k => ({k, name: CLASSES[k].name, role: CLASSES[k].roleCategory, roleText: CLASSES[k].role, tagline: CLASSES[k].tagline || '',
        origin: (CODEX_CHAMP_LORE[k] || {}).origin || '', defs: championAbilityDefinitions(k).map(d => ({slot: d.slot, name: d.name, short: d.shortDescription, shape: d.shapeGlyph, targeting: d.targetingType, cd: d.cooldown, status: d.statusEffects.map(s => COMBAT_LANGUAGE[s].glyph + ' ' + COMBAT_LANGUAGE[s].label)}))})),
      arenas: Object.keys(ARENA_BLUEPRINTS).map(k => { const b = arenaBlueprint(k); return {k, n: b.number, name: b.name, fantasy: b.fantasy, decision: b.decision, primary: b.primary, secondary: b.secondary, hazard: b.hazard, boss: b.boss, subBoss: b.subBoss || null, objectives: b.objectives, loot: b.loot, sets: arenaLootSets(k, 3).map(s => s.name), tier: (typeof ARENA_LOOT_LABEL !== 'undefined' && ARENA_LOOT_LABEL[k]) || '', grade: b.status.grade, why: b.status.why, tut: (b.tutorial.steps || []).map(s => s.id)}; })
    }));
    const C = ['# Referencia de campeones (AUTO-GENERADO)', '', '> `node tools/bible/build-reference.js` desde `CHAMPION_IDENTITY` + `js/skills/ability-registry.js`. No editar a mano.', ''];
    const SL = {basic: 'Básico', passive: 'Pasiva', 0: 'H1', 1: 'H2', 2: 'H3', ult: 'Definitiva'};
    for (const c of data.champions) {
      C.push(`## ${c.name} \`${c.k}\` — ${c.role}`, '', `*${c.tagline}* · Origen: ${c.origin}`, '', c.roleText, '', '| Ranura | Habilidad | Forma | Enfriamiento | Estados | Resumen |', '|---|---|---|---|---|---|');
      for (const d of c.defs) C.push(`| ${SL[d.slot]} | ${d.name} | ${d.shape} ${d.targeting} | ${d.cd ? (d.cd / 1000).toFixed(1).replace('.', ',') + ' s' : '—'} | ${d.status.join(', ') || '—'} | ${d.short.replace(/\|/g, '/')} |`);
      C.push('');
    }
    const A = ['# Referencia de arenas (AUTO-GENERADO)', '', '> `node tools/bible/build-reference.js` desde `ARENA_BLUEPRINTS` + `SET_ARENA_WEIGHTS`. No editar a mano.', ''];
    for (const a of data.arenas.sort((x, y) => (x.n || 99) - (y.n || 99))) {
      A.push(`## ${a.n ? String(a.n).padStart(2, '0') + ' · ' : ''}${a.name} \`${a.k}\` — diseño: ${a.grade}`, '', `**Fantasía:** ${a.fantasy}`, '', `**Decisión propia:** ${a.decision}`, '',
        `- **Mecánica principal:** ${a.primary.name} — ${a.primary.rule}`, ...a.secondary.map(s => `- **Secundaria:** ${s.name} — ${s.rule}`),
        `- **Peligro:** ${a.hazard.name} — ${a.hazard.effect.replace(/\.$/, '')}. Aviso: ${a.hazard.telegraph}.`,
        `- **Objetivos:** ${a.objectives.map(o => o.text).join(' · ')}`,
        a.subBoss ? `- **Subjefe:** ${a.subBoss.name}${a.subBoss.level ? ' (nivel ' + a.subBoss.level + ')' : ''}` : '',
        `- **Jefe:** ${a.boss.name} — usa la arena: ${a.boss.arena}; examina: ${a.boss.teaches}.`,
        `- **Botín:** ${a.loot.focus}. Sets de afinidad: ${a.sets.join(', ') || '—'}. Tier: ${a.tier}.`,
        `- **Micro-tutorial:** ${a.tut.join(' → ') || '—'}`, `- **Estado:** ${a.why}`, '');
    }
    fs.mkdirSync(OUT, {recursive: true});
    fs.writeFileSync(path.join(OUT, 'CHAMPION_REFERENCE.md'), C.filter(l => l !== null).join('\n') + '\n');
    fs.writeFileSync(path.join(OUT, 'ARENA_REFERENCE.md'), A.filter(l => l !== '' || true).join('\n') + '\n');
    console.log(`reference: ${data.champions.length} champions, ${data.arenas.length} arenas`);
  } finally { await browser.close(); server.kill(); }
})().catch(e => { console.error(e); process.exitCode = 1; server.kill(); });
