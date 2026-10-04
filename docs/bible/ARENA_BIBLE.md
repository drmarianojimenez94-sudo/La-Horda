# Arena Bible

Datos: **`js/arenas/common/arena-blueprints.js`** (`ARENA_BLUEPRINTS`: la ArenaDefinition de cada arena)
+ ganchos de comportamiento en `ARENA_DEFS` / `ARENA_EXT` (`js/arenas/common/arena-registry.js`) + dificultad
en `ARENA_MODS` (`js/data/arenas.js`) + botín en `js/data/loot.js`. Fichas largas por arena: `docs/arena-identity/`.
Referencia autogenerada: [`generated/ARENA_REFERENCE.md`](generated/ARENA_REFERENCE.md). Auditoría
automática: [`generated/ARENA_AUDIT.md`](generated/ARENA_AUDIT.md).

## 1. Estándar de identidad (mínimo por arena)

1 identidad visual fuerte · 1 mecánica principal exclusiva · 1–2 secundarias · 1 hazard con telegraph ·
1 patrón de navegación · 1 interacción enemigo–escenario · 1 relación jefe–escenario · 1 identidad de botín.

**Pregunta obligatoria** (campo `decision`): *¿qué decisión toma el jugador acá que no tendría que tomar en
ninguna otra arena?* Si no hay buena respuesta: REWORK.

## 2. Ficha (ArenaDefinition)

`fantasy, decision, biome, navigation, primary{name,rule}, secondary[], hazard{name,effect,telegraph},
objectives[{id,text}], dynamic[], enemySynergy[], subBoss?, boss{type,name,phases,arena,teaches}, loot{focus},
tutorial{steps[{id,say,done}]}, geometry{solids?,gated?,fallable?,notes}, multiplayer, code, status{grade,why}`.
`validateArenaBlueprint(key)` marca FAIL si falta un campo, si un hazard no tiene telegraph, si un objetivo
no se explica, si el jefe no se relaciona con la arena o no existe en `ENEMY_BASE`.

## 3. Geometría: si se ve sólido, es sólido

- Todo lo que el arte pinta como pared, montículo, roca, tronco, estanque profundo o estructura grande
  **choca**. Las excepciones (agua baja, maleza) se comunican visualmente (transparencia, ondas) y se
  documentan en `geometry.notes`.
- Los sólidos pintados de un fondo se declaran en datos (ej.: `MIC_BG_SOLIDS`, en píxeles del fondo) y la
  arena los expone en `geometry.solids`; el validador sondea su interior y falla si se puede caminar.
- Pasos entre sólidos ≥ 55 u (un héroe mide 36). Nada de bolsillos: el área caminable es conexa salvo
  compuertas de progreso (`gated`). Caer al vacío solo donde la arena lo diseña (`fallable`).
- Bocas de aparición siempre libres (`micTunnelMouth`). Navegación (`navBlocked`) = misma colisión.

## 4. Hazards, objetivos y dinámica

Nada de daño invisible: cada hazard declara su `telegraph` (aviso visible antes del daño). Objetivos
permitidos: sobrevivir, defender, destruir nidos/núcleos, controlar territorio, activar mecanismos, cerrar
portales, limpiar corrupción, minijefes, combinaciones. Evitar escolta salvo razón fuerte (la Ciudad la
justifica: rescatar civiles ES su fantasía). La arena cambia durante la partida y ese cambio **modifica
decisiones** (no solo decorado).

## 5. Jefe + arena = encuentro

La arena enseña, el jefe examina. Cada jefe declara qué usa del escenario (`boss.arena`) y qué regla
aprendida pone a prueba (`boss.teaches`). Un jefe que es solo una barra de vida grande es REWORK.

## 6. Botín como identidad

El sabor de sets de cada arena vive en `SET_ARENA_WEIGHTS` y su tier en `ARENA_LOOT`; la ficha agrega
`loot.focus` (qué incentiva repetirla). El briefing muestra el set destacado con piezas ✓/? y dónde caen
las que faltan. Probabilidades razonables: pity suave (`LOOT_PITY`), sesgo a piezas faltantes.

## 7. Briefing, micro-tutorial y no repetir

Primera entrada: BRIEFING → ENTRADA → MICRO-TUTORIAL JUGABLE → PARTIDA REAL. El micro-tutorial enseña
SOLO la regla de la arena (lo general ya lo enseñó el tutorial inicial) y se guarda como visto.

## 8. Cómo crear una arena (pipeline de la factory)

1. Ficha en `ARENA_BLUEPRINTS` (identidad, decisión, mecánicas, hazard+telegraph, objetivos, jefe, botín, tutorial).
2. `ARENA_MODS` + lugar en `CAMPAIGN_ORDER`, `SET_ARENA_WEIGHTS`, `ARENA_LOOT`, `ARENA_BRIEF` (frases del Hechicero).
3. Carpeta `js/arenas/<clave>/` con ganchos en `ARENA_DEFS` (geometría propia) o `ARENA_EXT` (solo agrega).
4. Sólidos pintados en datos + `geometry.solids`.
5. `node tools/bible/arena-validator.js` → sin FAIL; revisar la lámina `generated/arenas/<clave>.webp`.
6. Pruebas propias de la mecánica y del cooperativo (`tools/identity/t_identity_net.js` como modelo).

## 9. Auditoría de diseño (2026-10)

| # | Arena | Decisión propia | Estado | Motivo |
|---|---|---|---|---|
| 01 | Ciudad Maldita | a quién salvar | PASS | rescate + estructuras + teatro del Presentador |
| 02 | Fábrica Sin Fin | cuándo cruzar | PASS | Ciclo Mecánico y puentes por sector |
| 03 | Ruinas Célticas | runas ahora o para la emboscada | PASS | runas + emboscadas; el jefe desborda las runas |
| 04 | Reino Fúngico | qué núcleo romper primero | PASS (Gold Standard) | geometría pintada = jugable, micro-tutorial, briefing con botín |
| 05 | Arena Gélida | moverse o pelear quieto | FIX | identidad clara; curva de dificultad sigue siendo la pared de la campaña |
| 06 | Arena Acuática | usar o resistir la corriente | PASS | corrientes + charcos conductores |
| 07 | Laberinto | sellos en orden bajo presión | PASS | resolver + Minotauro contra los muros |
| 08 | Abismo | qué plataforma sacrificar | PASS | terreno como recurso, rescate cooperativo |
| 09 | Minas Profundas | qué luz reencender | PASS | la luz es territorio; salida obligatoria |
| 10 | Infernal | ¿mato o cierro? | PASS | fisuras-portal; jefe narrativo en 3 formas |
| — | Arena Divina | asedio | FIX | Fase 1: escenario sin combate completo |

Estado del validador (2026-10-03): 8 PASS (Ciudad, Ruinas, Fúngico, Gélida, Acuática, Laberinto, Minas, Infernal) y
2 WARNING por diseño (Fábrica: sectores con compuertas; Abismo: colgado del borde). Arenas con decorado del coliseo
declaran `aidVisualSolids` (props grandes; los arcos con abertura se marcan `passThrough`); la Ciudad declara
`cmVisualSolids`; Fábrica, Abismo y Minas no tienen fondo pintado (`derived`: el dibujo sale de la geometría).

Cambios de geometría de esta auditoría: Gélida (el monolito de hielo del norte ahora choca); motor
(`aidResolveCircles` no empujaba a una entidad exactamente en el centro de un sólido); Reino Fúngico (montículos, racimos, pilares, estanque y trono
pintados ahora chocan; bocas de túnel corridas a zona libre) y coliseo octogonal (Ruinas, Gélida, Acuática,
Laberinto, Infernal: el límite real ya no excede las paredes dibujadas).
