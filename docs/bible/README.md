# LA HORDA — Game Bible

Fuente de verdad **viva** de diseño y producción. La leen humanos y agentes antes de crear o
modificar campeones, arenas, jefes, sets, VFX, HUD o tutoriales. Si el código cambia una regla de
esta carpeta, el mismo commit actualiza el documento.

| Documento | Qué define | Fuente de datos |
|---|---|---|
| [CHAMPION_BIBLE.md](CHAMPION_BIBLE.md) | Nombres, títulos, lore, roles, kit, contrato de habilidades, Definition of Done | `js/data/champion-identity.js`, `js/skills/ability-registry.js`, `CLASSES` |
| [ARENA_BIBLE.md](ARENA_BIBLE.md) | Ficha obligatoria de arena, Arena Factory, geometría, hazards, objetivos, briefing, micro-tutorial | `js/arenas/common/arena-blueprints.js`, `ARENA_DEFS` / `ARENA_EXT` |
| [BOSS_BIBLE.md](BOSS_BIBLE.md) | Jefe + arena = encuentro: ficha de jefe, ganchos medibles con la arena, Boss Factory, arte de jefes | `js/arenas/common/boss-blueprints.js`, `js/systems/boss-arena-hooks.js` |
| [VISUAL_COMBAT_BIBLE.md](VISUAL_COMBAT_BIBLE.md) | Lenguaje de combate: color + forma + movimiento; números flotantes; telegraphs | `js/data/combat-language.js` |
| [UX_BIBLE.md](UX_BIBLE.md) | HUD, long press, panel táctico, briefing, tutorial, touch targets | `js/ui/ability-inspector.js`, `js/ui/tactical-panel.js` |
| [QA.md](QA.md) | Validadores, simulaciones, cómo correrlos y qué significan PASS/WARNING/FAIL | `tools/bible/*` |
| [AUDIT_LOG.md](AUDIT_LOG.md) | Problema → decisión → implementación → validación → commit | — |
| `generated/` | **AUTO-GENERADO** desde datos reales. No editar a mano. | validadores |

Documentos de diseño previos que siguen vigentes y esta Bible referencia en vez de duplicar:
`docs/ART_BIBLE.md` (arte y visual gate), `docs/lore/LA_HORDA_LORE_BIBLE.md` (canon del mundo),
`docs/arena-identity/` (fichas largas por arena), `docs/production/PRODUCTION_BIBLES.md`
(contrato de la Champion Factory), `BALANCE_CAMPEONES.md` (balance por rol), `AGENTS.md`.

## Separación AUTO-GENERADO / DISEÑO

- `docs/bible/*.md` = decisiones de diseño (las escribe una persona/agente).
- `docs/bible/generated/*` = salida de herramientas (`node tools/bible/champion-validator.js`,
  `node tools/bible/arena-validator.js`, `node tools/bible/boss-validator.js`, `node tools/bible/build-reference.js`,
  `node tools/art/arena_lineup.js --report`). Se regeneran; nunca se editan.

## Reglas de oro

1. **Coherencia + identidad + gameplay + legibilidad + escalabilidad.**
2. **Una sola fuente de verdad**: un valor vive en un solo archivo de datos; UI, Códice, tooltip,
   inspector y panel táctico lo derivan.
3. **Si se ve sólido, es sólido.** Toda excepción se comunica visualmente.
4. **Nada de daño invisible.** Todo peligro tiene telegraph.
5. **Nunca solo color**: color + glifo/forma + movimiento.
6. **Multijugador desde el inicio**: el anfitrión decide; los invitados ven lo mismo.
7. **Mobile primero**: 844×390 (iPhone 13 Pro horizontal) es el viewport de referencia.
8. **No inventar éxito**: PASS automático ≠ aprobación de diseño. Distinguir IMPLEMENTED / TESTED /
   VALIDATED / COMMITTED / PUSHED / MERGED / DEPLOYED.
