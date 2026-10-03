# QA — validadores, simulaciones y qué significa cada resultado

| Herramienta | Qué valida | Cómo se corre | Salida |
|---|---|---|---|
| `tools/bible/champion-validator.js` | Todos los campeones registrados: identidad (nombre/título/lore/origen/frase), rol, pasiva, kit, talentos, set, skins, sprite visible (dibujo real), metadata de habilidades y **cast real** de cada habilidad en el motor | `node tools/bible/champion-validator.js [--strict]` (`ONLY=tanque,mago` para filtrar) | `docs/bible/generated/champion-audit.json` + `CHAMPION_AUDIT.md` |
| `tools/bible/arena-validator.js` | Ficha de cada arena + grilla con la colisión real (bolsillos), "si se ve sólido es sólido", 120 apariciones reales, exploración agresiva (~29 s, bots que intentan salir del mapa, abrazar paredes, quedar atrapados) + canario | `node tools/bible/arena-validator.js [--strict]` (`ARENAS=micelial`) | `generated/arena-audit.json`, `ARENA_AUDIT.md`, láminas `generated/arenas/*.webp` |
| `tools/bible/boss-validator.js` | Pelea real por jefe Y subjefe (nivel de su ficha, bots invulnerables, azar con semilla, el jugador camina hacia el jefe): aparece, avisos (incluye los del piso de las Minas), patrones distintos, se lo puede dañar, no es trivial, ficha válida, **ganchos "auto" con su arena disparados** (FAIL si la ficha promete algo que el código no hace), botín | `node tools/bible/boss-validator.js [--strict]` | `generated/boss-audit.json`, `BOSS_AUDIT.md` |
| `tools/bosses/t_boss_arena_hooks.js` | 24 pruebas de efecto: ganchos "player"/"phase" (EXPUESTO, daño, estado de la arena), identidades nuevas de jefe y arreglos de la auditoría (HUD, música, objetivo de la embestida, anti-kite de Cerbero) | `node tools/bosses/t_boss_arena_hooks.js` | consola |
| `tools/factory/boss-cli.js` | Boss Factory sin navegador: `check` valida las 23 fichas (estructura), `list` el estado, `new` genera un candidato | `node tools/factory/boss-cli.js check` | consola |
| `tools/art/arena_lineup.js` | Arte de enemigos/jefes a escala real junto al Caballero; densidad de píxel contra la mediana del roster (≥ ×4 = REDRAW) | `node tools/art/arena_lineup.js --report` (servidor en `LINEUP_BASE_URL`) | `generated/ENEMY_ART_AUDIT.md`, `generated/art/` |
| `tools/bible/build-reference.js` | Genera la referencia de campeones y arenas desde los datos cargados | `node tools/bible/build-reference.js` | `generated/CHAMPION_REFERENCE.md`, `ARENA_REFERENCE.md` |
| `tools/ux/test-ability-inspector.js` · `test-tactical-panel.js` · `test-arena-briefing-tutorial.js` | Long press, panel táctico (sin pausa en multijugador), briefing y micro-tutorial fúngico | `node <archivo>` | PASS/FAIL |
| `tools/alpha/training-test.js` · `training-player.js` | Tutorial general de 13 pasos (motor real / novato con entrada táctil) | requieren servidor en 8805 | PASS/FAIL |
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

## Comparación contra la base (regresión honesta)

Cuando una prueba existente falla después de un cambio, se compara contra un worktree limpio:
`git worktree add /tmp/base HEAD` + servirlo en otro puerto + correr la misma prueba varias veces en ambos.
Solo cuentan como regresión las fallas que aparecen en la versión nueva y no en la base. Fallas conocidas
de base al 2026-10-03: `tools/micelial/t_micelial.js` → `MADRE.fase3_corazon_expuesto_y_vulnerable`,
`SAVE.guardado_viejo_conserva_el_hielo_y_abre_el_reino`, y a veces `PERF.dibujo_por_cuadro` (depende de la máquina).
