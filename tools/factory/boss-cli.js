#!/usr/bin/env node
'use strict';
/* BOSS FACTORY — CLI (docs/bible/BOSS_BIBLE.md §6). Sin navegador: lee las fichas con vm.
     node tools/factory/boss-cli.js list                       tabla de jefes: arena, nivel, ganchos, diseño, arte
     node tools/factory/boss-cli.js check                      valida todas las fichas (estructura); código ≠ 0 si hay FAIL
     node tools/factory/boss-cli.js new <tipo> <arena> <jefe|subjefe> <nivel>
                                                               escribe docs/production/bosses/<tipo>.md (no sobrescribe):
                                                               esqueleto de ficha, checklist de la Definition of Done y
                                                               plantilla de encargo de arte con el formato de la casa.
   Lo que la CLI NO hace: inventar la mecánica, el arte ni la aprobación. La pelea real la mide
   tools/bible/boss-validator.js; el arte, tools/art/arena_lineup.js y el Visual Gate humano. */
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const ROOT = path.resolve(__dirname, '../..');
function load() {
  const c = {console}; vm.createContext(c);
  for (const f of ['js/arenas/common/arena-blueprints.js', 'js/arenas/common/boss-blueprints.js']) {
    const src = fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/^(const|let) /mg, 'var ');
    try { vm.runInContext(src, c, {filename: f}); } catch (e) { if (!/is not defined/.test(e.message)) throw e; }
  }
  return c;
}
const [cmd, ...args] = process.argv.slice(2);
const C = load();
if (!C.BOSS_BLUEPRINTS) { console.error('no se pudo leer BOSS_BLUEPRINTS'); process.exit(2); }
const B = C.BOSS_BLUEPRINTS;
if (cmd === 'list' || !cmd) {
  const rows = Object.entries(B).map(([t, b]) => {
    const m = k => b.hooks.filter(h => h.mode === k).length;
    return [b.arena, String(b.rank === 'jefe' ? 10 : b.level), t, `${m('auto')}a/${m('player')}p/${m('phase')}f`, b.status.grade, b.art.grade + (b.art.brief ? ' ' + b.art.brief : '')];
  });
  const head = ['arena', 'nivel', 'tipo', 'ganchos', 'diseño', 'arte'];
  const w = head.map((h, i) => Math.max(h.length, ...rows.map(r => r[i].length)));
  console.log(head.map((h, i) => h.padEnd(w[i])).join('  '));
  for (const r of rows) console.log(r.map((v, i) => v.padEnd(w[i])).join('  '));
  console.log(`\n${rows.length} fichas · ${rows.filter(r => r[4] === 'PASS').length} diseño PASS · ${rows.filter(r => r[5].startsWith('REDRAW')).length} arte REDRAW`);
} else if (cmd === 'check') {
  let fails = 0;
  for (const t of Object.keys(B)) {
    const issues = C.validateBossBlueprint(t);
    for (const i of issues) { if (i.level === 'FAIL') fails++; console.log(`${i.level.padEnd(7)} ${t}: ${i.msg}`); }
  }
  console.log(fails ? `${fails} FAIL` : `OK: ${Object.keys(B).length} fichas sin FAIL (la pelea real: node tools/bible/boss-validator.js)`);
  process.exitCode = fails ? 1 : 0;
} else if (cmd === 'new') {
  const [type, arena, rank, level] = args;
  if (!type || !arena || !['jefe', 'subjefe'].includes(rank) || !(+level >= 1 && +level <= 10)) { console.error('uso: new <tipo> <arena> <jefe|subjefe> <nivel 1-10>'); process.exit(2); }
  if (!/^[a-z][a-z0-9_]*$/.test(type)) { console.error('tipo: minúsculas, números y _'); process.exit(2); }
  if (B[type]) { console.error(`ya existe una ficha para ${type}`); process.exit(2); }
  const A = C.ARENA_BLUEPRINTS && C.ARENA_BLUEPRINTS[arena];
  if (!A) { console.error(`arena desconocida: ${arena} (ARENA_BLUEPRINTS)`); process.exit(2); }
  const out = path.join(ROOT, 'docs/production/bosses', type + '.md');
  if (fs.existsSync(out)) { console.error(`ya existe ${path.relative(ROOT, out)} (no se sobrescribe)`); process.exit(2); }
  fs.mkdirSync(path.dirname(out), {recursive: true});
  const md = `# ${type} — candidato a ${rank} (${arena}, nivel ${rank === 'jefe' ? 10 : level})

> Generado por \`node tools/factory/boss-cli.js new\`. **INCOMPLETO** hasta que cada casilla tenga evidencia.

## La arena que lo define
- Decisión de la arena: ${A.decision}
- Mecánica principal: ${A.primary ? A.primary.name + ' — ' + A.primary.rule : '—'}
- Peligro: ${A.hazard ? A.hazard.name + ' — ' + A.hazard.effect : '—'}
- Pregunta obligatoria: ¿qué parte de ESTA arena es su escudo y qué parte es la llave para abrirlo? (BOSS_BIBLE §3.1)

## Ficha (pegar en js/arenas/common/boss-blueprints.js y completar)
\`\`\`js
  ${type}:{arena:"${arena}", rank:"${rank}", level:${rank === 'jefe' ? 10 : +level}, name:"TODO",
    fantasy:"TODO: la fantasía en una frase",
    rule:"TODO: LA regla que aprende el jugador",
    hooks:[
      {id:"${type}.TODO_auto", mode:"auto", uses:"TODO: parte de la arena", effect:"TODO: qué hace el jefe con ella (pasa sola en la pelea)"},
      {id:"${type}.TODO_llave", mode:"player", uses:"TODO", effect:"TODO: qué hace el jugador → EXPUESTO"}],
    counterplay:["TODO"],
    presentation:{entrance:"TODO", titleCard:true, death:"TODO"},
    art:{src:"assets/sprites/${rank === 'jefe' ? 'bosses' : 'arenas'}/${arena}/${type}/atlas.png", brief:"TODO", grade:"REDRAW", why:"sin arte: encargar la hoja"},
    status:{grade:"REWORK", why:"candidato nuevo"}},
\`\`\`

## Definition of Done
- [ ] \`ENEMY_BASE.${type}\` (vida, daño, radio) y spawn en el nivel ${rank === 'jefe' ? 10 : level} de ${arena}
- [ ] Mecánica firma en \`js/arenas/${arena}/\`: escudo + llave, telegraph en el piso (punto fijo), anti-kite según su alcance
- [ ] \`bossArenaEvent("${type}.<gancho>", e)\` en cada interacción real
- [ ] Fases: \`bossPhase\` + \`bossHudPhase\` + banner; cartel de entrada (\`bossTitleCard\`); consejos (\`ARENA_BOSS_TIPS\` / \`BOSS_DESIGNS\`)
- [ ] Multijugador: el anfitrión decide; el estado de arena que cambia viaja por el estado de red de la arena; nunca apuntar al \`player\` local
- [ ] \`node tools/factory/boss-cli.js check\` sin FAIL
- [ ] \`node tools/bible/boss-validator.js --strict\`: aparece, avisa, se lo daña, ganchos auto disparados
- [ ] Caso propio en \`tools/bosses/t_boss_arena_hooks.js\` por cada gancho player/phase (comprobar el EFECTO)
- [ ] Arte: hoja encargada (abajo), recortada con \`tools/art/redraw/\`, densidad ≤ ×2,5 con \`node tools/art/arena_lineup.js --report\`, Visual Gate humano
- [ ] \`docs/bible/AUDIT_LOG.md\` y \`BOSS_BIBLE.md\` §4 actualizados

## Encargo de arte (formato de docs/ART_COMMISSION_BRIEF.md)
| Campo | Valor |
|---|---|
| Arena | ${arena} |
| Rango | ${rank} |
| Rol en combate | TODO |
| Paleta | TODO (4–6 colores + contorno; tomar la de la arena) |
| Celda | 192×192 px (personaje ≈150–170 px de alto: más tamaño y detalle que un campeón, **nunca píxeles más gruesos**) |
| Entrega | \`${type}_1.png\` … una fila por estado (quieto+caminar, ataques firma, golpe recibido + muerte) |

Prompt base: "Hoja de sprites para un videojuego. PERSONAJE: … PALETA: … ESTA IMAGEN: … Formato: UNA sola fila de N cuadros,
celdas iguales de 192×192 px separadas por 1 px, fondo transparente o magenta plano #FF00FF… Estilo: pixel art 16-bit de
fantasía oscura, detallado, píxeles nítidos, sin antialiasing, paleta limitada, contorno oscuro de 1 píxel, luz arriba a la
izquierda, vista cenital 3/4." (copiar el bloque completo de una ficha existente, p. ej. R-01).
`;
  fs.writeFileSync(out, md);
  console.log(`escrito ${path.relative(ROOT, out)} — candidato INCOMPLETO (no se registra en el juego).`);
} else { console.error('comandos: list | check | new'); process.exitCode = 2; }
