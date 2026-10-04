# BOSS BIBLE — jefes, subjefes y la Boss Factory

Regla de la casa: **JEFE + ARENA = ENCUENTRO.** Un jefe que podría pelear igual en cualquier arena está incompleto.
Cada jefe es la última lección de su arena: usa lo que la arena enseñó y lo vuelve contra el jugador, o deja que el
jugador lo vuelva contra él.

Fuente de datos: `js/arenas/common/boss-blueprints.js` (`BOSS_BLUEPRINTS`, 23 fichas: 14 jefes/formas y 9 subjefes).
Evidencia: `docs/bible/generated/BOSS_AUDIT.md` (pelea real) y `docs/bible/generated/ENEMY_ART_AUDIT.md` (arte a escala).

## 1. Ficha obligatoria (BossDefinition)

| Campo | Qué es | Ejemplo (Kraken Joven) |
|---|---|---|
| `arena`, `rank`, `level` | dónde y cuándo | acuática · subjefe · nivel 6 |
| `fantasy` | la fantasía en una frase | "pesca con el agua" |
| `rule` | LA regla que el jugador aprende | "atraelo a un charco cargado antes de la descarga" |
| `hooks[]` | la relación con la arena, medible (ver §2) | `kraken_joven.corriente` (auto), `kraken_joven.charco` (player) |
| `counterplay[]` | qué hace el jugador para ganar (no "pegar más") | pararse junto al charco y salir a último momento |
| `presentation` | entrada, cartel grande, muerte | cartel "SUBJEFE" |
| `art` | fuente, cuerpo prestado, encargo, grado PASS/FIX/REDRAW | FIX: densidad ×2,6 |
| `status` | auditoría de diseño PASS/FIX/REWORK | PASS |
| `after?` | forma que llega después de vencer a otra | Ángel Gélido después del Mago |

`validateBossBlueprint(tipo)` valida la estructura. Una ficha en PASS sin ningún gancho es FAIL.

## 2. Ganchos con la arena (`bossArenaEvent`)

Cada interacción real jefe↔arena llama a `bossArenaEvent("<tipo>.<gancho>", e)` (`js/systems/boss-arena-hooks.js`).
Solo cuenta; no cambia el juego. Los modos de cada gancho:

- **auto**: pasa sola en una pelea real (el jefe usa la arena). `boss-validator.js` la **exige**. Si la ficha la promete
  y la pelea real no la produce, es FAIL: un documento no puede decir más que el código.
- **player**: la provoca una decisión del jugador (purificar, sellar, atraer). La informa el validador y la prueba
  `tools/bosses/t_boss_arena_hooks.js`, comprobando el efecto (EXPUESTO, daño), no solo el contador.
- **phase**: depende de llegar a una fase de vida (marea, ovación, colapso). Se informa.

## 3. Reglas de diseño

1. **Escudo + llave.** El patrón que mejor funciona en el juego: la arena le da un escudo (runas, núcleos, tentáculos,
   grietas, focos, braseros) y la misma arena es la llave para abrirlo (contener, cortar, sellar, llevarlo al fuego). Al
   abrirlo: `bossExpose` (EXPUESTO, aturdido, ×1,5–1,8).
2. **Telegraph siempre en el piso** y en un punto fijo cuando el golpe es a un lugar. Un círculo que persigue al héroe
   solo se esquiva alejándose (lo arreglamos en el Kraken).
3. **Anti-kite que mida lo que el jefe puede alcanzar**, no un radio fijo: Cerbero encadenado dejaba un anillo seguro
   entre su alcance y el anti-kite (lo encontró el validador; arreglado).
4. **Cada fase se nota**: banner + rugido + `bossHudPhase` + `bossPhase` (la capa de fase de la música la lee).
5. **Cartel grande** al entrar (`arenaTitleCard` / `bossTitleCard`): todos los jefes y subjefes con ficha lo tienen.
6. **Multijugador**: el anfitrión decide; el estado de arena que cambia (corrientes, fisuras, runas, pilares) viaja por
   el estado de red de la arena. Nunca apuntar al `player` local: usar el objetivo del director.
7. **Arte** (`docs/ART_BIBLE.md` §9): los jefes pueden tener más tamaño, detalle y VFX, **no píxeles más gruesos**. Densidad
   ≥ ×4 la típica del roster = REDRAW (ver §5).

## 4. Estado por jefe

Ver `generated/BOSS_AUDIT.md` (se regenera). Resumen de esta auditoría (octubre 2026):

| Arena | Jefe / subjefe | Antes | Ahora |
|---|---|---|---|
| Acuática | Kraken Joven | perseguidor genérico; agarre sin aviso; tentáculo que perseguía | **Pesca con el agua**: refuerzos por la corriente, charco cargado = EXPUESTO, golpes en punto fijo, agarre con aviso |
| Acuática | Leviatán | tentáculos con roles; ignoraba corrientes; embestida al jugador local | + **MAREA** (corrientes invertidas, charcos cargados), tentáculo conductor; embestida al objetivo real; poses de mordida/embestida visibles |
| Laberinto | Guardián del Laberinto | pisotón + rocas genéricos | **Laberinto de Piedra**: anillo de pilares; su pisotón los derriba y queda EXPUESTO |
| Fábrica | Caballero | las trampas nunca lo tocaban | + **su propia máquina**: las trampas que despierta lo dañan y aturden |
| Infernal | Hechicero Supremo | ignoraba la arena (fisuras pausadas) | **Grieta Conjurada**: abre fisuras reales, se alimenta de ellas, sellarlas lo expone |
| Ruinas | Doppelgängers | genéricos, sin barra ni cartel | **Ecos de las runas**: atados a menhires, contener la runa los expone; cartel grande |
| Minas | Cerbero | anillo seguro en el acto 1 | anti-kite según su alcance |
| Minas | Titán de Piedra | nunca mostraba su barra grande | barra y consejos |
| Infernal | Rey de la Horda | HUD con epíteto y consejos del Demonio Mayor suelto | HUD de la forma actual (`designKey`) |
| Varias | Minotauro, Guardián, Jinete… | música de fase fija en 1 | `bossPhase` sigue la fase |

## 5. Arte de jefes

- Medición: `node tools/art/arena_lineup.js --report` dibuja todo a escala real junto al Caballero y compara la densidad
  contra la mediana del roster de campeones (0,95 u/px).
- **REDRAW por densidad**: Titán de Piedra (×5,0) y Cerbero (×5,4). Encargos: `docs/ART_COMMISSION_BRIEF.md` §R
  (R-01 nuevo, F-01 sube de prioridad).
- **REDRAW por cuerpo prestado** (ya documentados en P0): Presentador, Maestro, Tramoyista, Dama, Carcelero del Vacío,
  Gólem de Cuerpos; F-02 (Ángel Corrompido recoloreado).
- **FIX aplicado**: alfa 0/255 en los atlas del Hechicero (y su recoloreado del Ángel Corrompido).
- Lo que este repo NO hace: generar arte. La fábrica (`tools/art/redraw/`) recorta y arma las hojas que se encargan;
  la herramienta mide. Ningún asset generado automáticamente es PASS sin el Visual Gate humano.

## 6. Cómo fabricar un jefe nuevo

`node tools/factory/boss-cli.js new <tipo> <arena> <jefe|subjefe> <nivel>` escribe `docs/production/bosses/<tipo>.md`
(esqueleto de ficha con la arena que lo define, Definition of Done y plantilla de encargo de arte; nunca sobrescribe ni
registra nada en el juego). `list` muestra el estado de todas las fichas y `check` las valida sin navegador (en el CI).

1. Ficha en `BOSS_BLUEPRINTS` (todos los campos, ganchos con su modo) + relación general en `ARENA_BLUEPRINTS[arena].boss`.
2. Mecánica firma en un archivo de la arena (`js/arenas/<arena>/<arena>-<jefe>.js`): escudo + llave, telegraphs,
   `bossArenaEvent` en cada interacción real.
3. Entrada (`bossTitleCard` o cartel propio), fases (`bossPhase`, `bossHudPhase`), consejos (`ARENA_BOSS_TIPS` o
   `BOSS_DESIGNS`), voz (`js/data/story-text.js`).
4. Arte: hoja encargada con el formato de `docs/ART_COMMISSION_BRIEF.md`, recortada con `tools/art/redraw/`, medida con
   `arena_lineup.js` (≤ ×2,5) y Visual Gate humano.
5. Pruebas: `node tools/bible/boss-validator.js --strict` (aparece, avisa, se lo daña, ganchos auto) y un caso propio
   en `tools/bosses/t_boss_arena_hooks.js` para cada gancho player/phase.

## 7. Pendiente (honesto)

- **Tundraverx** (subjefe de la Arena Gélida, nivel 6) es un élite "campeón" sin ficha: no usa braseros ni el frío.
  Próximo candidato a la Boss Factory.
- **Formas encadenadas** (Ángel Gélido, Gólem de Cuerpos, Rey de la Horda, Dama del Telón): el validador no las alcanza
  en su ventana; sus ganchos auto/player se cubren con pruebas directas o quedan informados.
- **Arte**: los REDRAW (Titán, Cerbero y los cuerpos prestados) esperan las hojas encargadas; la herramienta solo mide.
- Abanicos de proyectiles sin aviso en el Presentador, el Maestro y la Madre Espora (heredado; no se tocó).
- Prueba cooperativa específica de las mecánicas nuevas (hoy: estado sincronizado por las vías existentes de cada arena
  y regresión con `t_identity_net`).
