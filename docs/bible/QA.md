# QA — validadores, simulaciones y qué significa cada resultado

| Herramienta | Qué valida | Cómo se corre | Salida |
|---|---|---|---|
| `tools/bible/champion-validator.js` | Todos los campeones registrados: identidad (nombre/título/lore/origen/frase), rol, pasiva, kit, talentos, set, skins, sprite visible (dibujo real), metadata de habilidades y **cast real** de cada habilidad en el motor | `node tools/bible/champion-validator.js [--strict]` (`ONLY=tanque,mago` para filtrar) | `docs/bible/generated/champion-audit.json` + `CHAMPION_AUDIT.md` |
| `tools/quality/test-combat-language.js` | Números de DoT/escudo: agrupación, tope, prioridad, glifos sin color | `node tools/quality/test-combat-language.js` | PASS/FAIL |
| `tools/quality/test-floating-text.js` | Pool de números flotantes: multitud de 70, prioridad, sin superposición | idem | PASS/FAIL |
| `tools/balance/entry-gate.js` | Gate de balance de campeones nuevos (3 partidas × 150 s por candidato) | ver AGENTS.md | JSON |
| `tools/vfx/audit-combat.js` | VFX/HUD de combate, firmas de campeón, red | ver cabecera | `docs/vfx/` |

## Validador de campeones: cómo mide una habilidad

Medición **diferencial**: se corre la misma partida dos veces con el mismo RNG sembrado (control sin
cast y con cast), 280 cuadros (~4,5 s), aliados aturdidos para que solo reciban. La diferencia es el
efecto real de la habilidad: daño atribuido al jugador, enemigos con estados nuevos, aliados curados/
escudados/potenciados, cambios en el propio héroe, entidades creadas (proyectiles, zonas, invocaciones).
También cuenta llamadas VFX, SFX, números/avisos y eventos replicados a invitados.

**Canario**: antes de auditar, reemplaza el kit de Aldric por un `kind` inexistente; el validador debe
marcar las 4 habilidades sin efecto. Si no lo hace, la corrida falla (evita un validador decorativo).

## Estados

- Chequeo: `PASS` / `WARNING` (falta algo recomendado) / `FAIL` (incumple el estándar).
- Campeón: `PASS` (sin FAIL ni WARNING) · `PASS*` (solo WARNING) · `FIX` (FAIL corregible) ·
  `REDRAW` (falta VFX o arte) · `REWORK` (≥ 2 habilidades sin efecto) · `REJECT` (no carga).
- **PASS automático no es aprobación** de diseño, arte, diversión ni balance competitivo.
