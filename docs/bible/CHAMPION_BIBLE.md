# Champion Bible

Datos: presentación en `js/data/champion-identity.js` (`CHAMPION_IDENTITY`, `CHAMPION_STANDARD`);
valores en `CLASSES` (`js/data/champions.js`, `js/data/portadores.js`, `js/champions/expedition/`);
contrato de habilidades derivado en `js/skills/ability-registry.js`. Auditoría automática:
[`generated/CHAMPION_AUDIT.md`](generated/CHAMPION_AUDIT.md).

## 1. Nombre y título

| Campo | Regla | Ejemplo |
|---|---|---|
| `name` | Nombre propio, 1–2 palabras. Lo lee el HUD. Sin artículo salvo que el lore lo exija (el Segador no recuerda su nombre). | `Aldric`, `San Martín` |
| `title` | Epíteto con artículo en minúscula + sustantivo con mayúscula. Describe fantasía, no estadística. | `el Último Bastión` |
| Menús | `"Nombre, título"` (generado: `championDisplayName`) | `Aldric, el Último Bastión` |
| Clave interna | No cambia nunca (guardados): `tanque`, `guerrero`, `cazadora`… | — |

Renombres canónicos (2026-10, ver AUDIT_LOG): La Profeta → **Ismara, la Profeta Ciega**; La Cazadora →
**Sylva, la Cazadora del Bosque** (el nombre ya existía en el código); Nigromante → **Ilvar, el Señor de las
Criptas**; El Libertador → **San Martín, el Libertador**; El Eslabón → **Garren, el Eslabón**; El Farolero →
**Tobías, el Farolero**; Segador Olvidado → **Segador, el Olvidado**. Todos los demás recibieron título.

## 2. Lore

- **Frase de catálogo (`tagline`)**: 1 frase, 40–130 caracteres, **empieza con el nombre** ("Aldric sostiene…"). Fantasía jugable, no biografía.
- **Origen**: lugar legible del mundo (nunca una clave interna como `ciudad`).
- **Historia del Códice (`lore`)**: 3–4 frases, **260–480 caracteres**. Estructura:
  **herida** (qué le hizo la Horda o el mundo) → **don** (cómo eso se volvió su forma de pelear) →
  **motivo** (por qué sigue). Tono: sobrio, concreto, español rioplatense neutro, segunda lectura
  posible. Sin humor de guiño salvo campeones cuya fantasía lo es (Myla).
- Conexión obligatoria con el mundo: al menos un lugar canónico (Ciudad Maldita, arenas, Cicatriz,
  Cuatro Guardianes, Hechicero Supremo). Canon del mundo: `docs/lore/LA_HORDA_LORE_BIBLE.md`.

## 3. Roles (`roleCategory`)

| Rol | Promesa | Referencia de balance |
|---|---|---|
| `tanque` | Sostener la línea, controlar, proteger | `docs/balance/champion-entry-reference.json` (media por rol, nunca global) |
| `asesino` | Daño concentrado, movilidad, ejecución | idem |
| `mago` | Área, control elemental, invocaciones | idem |
| `soporte` | Curar, escudar, potenciar | idem |

`role` (texto) dice en una frase cómo se juega. Un campeón puede ser híbrido en texto, nunca en categoría.

## 4. Kit

Básico + pasiva + 3 habilidades + definitiva. Cada pieza tiene un **verbo distinto** (no dos "daño en
área alrededor"). La pasiva solo se documenta si existe en el código (nunca texto sin mecánica).

Pasivas de los clásicos (2026-10, `CLASSIC_PASSIVES` en `js/data/champion-tuning.js`): de identidad,
condicionales y chicas —refuerzan el verbo del campeón, no suben DPS plano:

| Campeón | Pasiva | Efecto | Feedback |
|---|---|---|---|
| Aldric | Bastión | Aliados a < 200 u reciben 8 % menos daño | anillo punteado bajo Aldric mientras protege a alguien; chip ▲ en el panel táctico |
| Kael | Depredador | Básicos +15 % contra enemigos que sangran o están envenenados | números de su básico más grandes sobre objetivos con ◆/☣ |
| Thalen | Maestro Elemental | El bonus de las reacciones que provoca (Vapor, Quiebre, Conducción) ×1,5 | etiqueta de reacción existente |
| Elyra | Gracia del Alba | Curar a un aliado bajo 35 % de vida cura 25 % más | número de curación + |
| Axiom | Recompilar | Cada baja por habilidad devuelve 3 de energía (tope 15/s) | barra de energía |

Medición: `tools/balance/known-champion-sim.js` antes/después (`docs/balance/classic-passives-results.json`):
todos muy debajo del techo por rol, supervivencia igual; diferencias de daño dentro del ruido (±10 %).

### Contrato `AbilityDefinition` (derivado, no duplicado)

`id, championId, slot, type, name, shortDescription, fullDescription, icon{glyph,img}, targetingType,
shapeGlyph, damageType, cost, cooldown, duration, radius, range, statusEffects[], tags[], scaling{}`.

- `shortDescription` se deriva de la primera oración de `desc` (≤ 90 caracteres). **No** existe
  `descriptionMobile` ni `descriptionNew`: se escribe una sola `desc` (≤ 200 caracteres recomendado).
- `targetingType` sale de `AIM_PROFILES` (lo mismo que usa el apuntado real) o de `ABILITY_META`.
- `statusEffects` deben existir en `COMBAT_LANGUAGE` (si no, FAIL).
- Para agregar metadata que no se deduce de los valores: `ABILITY_META[kind]` (targeting/status/tags).

### Ciclo visual obligatorio de una habilidad

`CAST → TRAVEL/DEPLOY → IMPACT → EFFECT → END`. Una habilidad nunca es solo `enemy.hp -= x`:
debe tener VFX de lanzamiento (`vfxChampionSignature` como mínimo), impacto legible, estado visible
mientras dura (lenguaje de `VISUAL_COMBAT_BIBLE.md`) y SFX. El validador lo comprueba en runtime.

### Cooldowns

Habilidades 2,5–16 s; definitivas 28–45 s. Movilidad pura puede bajar a 2,5 s. Una definitiva se
habilita desde `ULT_MIN_ARENA_LEVEL` y se carga con `ultCharge`.

## 5. VFX / SFX / animación

Arte y paleta: `docs/ART_BIBLE.md`. Firma por campeón: `CHAMPION_SIGNATURES`. Las skins son
cosméticas: nunca cambian estadísticas, hitbox ni recargas (AGENTS.md §6).

## 6. Definition of Done — Habilidad

PASS solo cuando: funciona · identidad · comunica qué hace · VFX · feedback de impacto · ícono ·
descripción · tooltip/inspector (long press) · aparece en el panel táctico · cooldown y targeting
comprensibles · estados comunicados · balance validado (`tools/balance/entry-gate.js`) · mobile ·
multijugador (eventos replicados) · sin errores. Lo automatizable lo mide
`tools/bible/champion-validator.js`; balance, arte y diversión requieren revisión humana.

## 7. Definition of Done — Campeón

Nombre y título según §1 · lore en banda · rol claro · silueta reconocible · kit con identidad ·
habilidades legibles · definitiva memorable · VFX coherentes · balance razonable por rol · talentos ·
UI completa · assets completos · mobile · multijugador · supera el validador sin FAIL.

## 8. Cómo crear un campeón (pipeline)

1. Concepto + rol → `tools/factory/cli.js` (contrato) y `docs/production/PRODUCTION_BIBLES.md`.
2. Datos en `CLASSES` + fila en `CHAMPION_IDENTITY` (nombre, título, tagline, origen, lore, básico, pasiva).
3. Registrar antes de `js/systems/champion-entry-balance.js` (AGENTS.md).
4. `ABILITY_META` solo si el targeting/estados no se deducen.
5. `node tools/bible/champion-validator.js` → sin FAIL. `node tools/balance/entry-gate.js` → PASS.
6. Pruebas propias de sus mecánicas (AGENTS.md §4). Actualizar esta Bible si se agregó una regla.
