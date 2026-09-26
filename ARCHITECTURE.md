# La Horda — Arquitectura

Guía para ubicar cada cosa del juego. No hace falta saber programar para leerla: cada sección
dice **qué archivo abrir** y **qué buscar adentro**.

---

## 1. La idea general en 30 segundos

- `index.html` es solo el "esqueleto": el HTML de los menús, la lista de hojas de estilo y la
  lista de scripts **en orden**.
- `css/` tiene el aspecto (colores, menús, HUD, paneles).
- `assets/` tiene todo el arte (PNG). Antes estaba metido en `index.html` en base64; ahora son
  archivos normales que se pueden abrir y reemplazar.
- `js/` tiene el código, separado por sistema (datos, dibujo, combate, campeones, arenas, UI…).
- `js/main.js` arranca el juego y es **el último** script en cargarse.

No hay frameworks, bundlers ni paso de "build": el navegador lee los archivos tal cual. Sirve
igual desde GitHub Pages, un servidor local o abriendo `index.html` con doble clic.

---

## 2. Cómo se carga el juego (y por qué importa el orden)

`index.html` carga los scripts uno detrás de otro. Todos comparten el mismo espacio de nombres:
una función definida en `js/systems/combat.js` (por ejemplo `damageEnemy`) se puede usar desde
cualquier otro archivo, **tal como pasaba cuando todo estaba en un solo archivo**.

El orden solo importa para el código que se ejecuta **en el momento de cargar** (tablas de datos
que usan otras tablas, carga de imágenes, botones que se conectan). Las funciones que se llaman
mientras jugás pueden estar en cualquier archivo. El orden actual está verificado
automáticamente (ver `docs/MODULARIZATION_REPORT.md`):

```
1. js/assets/asset-manifest.js, js/assets/preload.js   lista de imágenes + barra de carga del título
2. js/vendor/*                                         módulos de efectos de terceros (rayo, muro de fuego, caballero)
3. js/data/*                                           TABLAS DE DATOS Y BALANCE
4. js/core/constants.js, utils.js                      constantes y utilidades
5. js/storage/save.js                                  guardado (localStorage)
6. js/core/canvas.js, state.js                         canvas y estado de la partida
7. js/assets/*-sprites.js, ui-icons.js                 carga de imágenes
8. js/rendering/*                                      todo lo que DIBUJA
9. js/systems/*                                        progresión, talentos, objetos, combate, oleadas...
10. js/champions/*, js/skills/*                        mecánicas de campeones y habilidades
11. js/enemies/*, js/arenas/*, js/ai/*                 aparición de enemigos, arenas, IA
12. js/audio/*, js/storage/save-code.js, js/ui/*, js/core/input.js   sonido, menús, HUD, controles
13. js/core/run.js, update.js, loop.js                 partida, simulación de cada cuadro y loop
14. js/main.js                                         ARRANQUE (siempre último)
```

**Regla práctica:** si agregás un archivo nuevo, sumalo a `index.html` en la zona de su carpeta.
Si agregás solo funciones (no tablas ni código suelto), el lugar exacto no importa.

---

## 3. Carpetas

```
index.html                  esqueleto HTML de todas las pantallas + lista de CSS y scripts
css/
  base.css                  colores, fuentes, cuerpo de la página, canvas
  menus.css                 título, modos, galería, ficha de campeón, tienda, arenas, preparación
  hud.css                   HUD en partida, aliados, avisos, joystick y botones
  panels.css                pausa (habilidades, talentos, inventario, estadísticas) y victoria
  overlays.css              "girá el teléfono", elección de refuerzo, varios
assets/
  sprites/champions/<campeón>/      sprites reales de cada campeón (y sus invocaciones)
  sprites/enemies/<arena>/<tipo>/   enemigos comunes, sub-élite y élite
  sprites/bosses/<arena>/<tipo>/    subjefes y jefes
  sprites/arenas/divina/            torres y castillos de la Arena Divina
  vfx/<grupo>/                      efectos de habilidades y jefes
  ui/skill-icons/                   íconos de habilidades
js/
  data/        TABLAS: campeones, talentos, objetos, recompensas, arenas, enemigos, refuerzos,
               Arena Divina, pixel art de respaldo
  core/        constantes, utilidades, canvas, estado de la partida, controles, inicio/fin de
               partida, simulación por cuadro (update), loop principal
  storage/     guardado en localStorage y código de exportación/importación
  assets/      carga de imágenes (una "variable READY" por imagen) y precarga del título
  rendering/   dibujo: cámara, animación por atlas, sprites de campeones y enemigos, efectos,
               VFX, AnimFX, escenario de cada arena, Arena Divina, entidades, render()
  systems/     progresión (XP/nivel/oro), maestría, talentos, objetos, recompensas,
               estadísticas del héroe, combate, pociones, niveles/oleadas
  champions/   creación de héroes + mecánicas propias de cada campeón
  skills/      motor de habilidades (castAbility), VFX por nivel de talento, habilidades de jefes
  enemies/     qué enemigos aparecen en cada arena y cómo se crean
  arenas/      reglas, armado del escenario, colisiones, Acuática, peligros, Arena Divina
  ai/          navegación (esquivar muros) e IA de los aliados
  audio/       música y efectos de sonido (sintetizados, sin archivos de audio)
  ui/          pantallas, menús, selección de campeón, HUD, paneles de pausa, fin de partida
  vendor/      módulos de efectos de terceros, sin modificar
  main.js      arranque
```

Cada archivo empieza con un comentario que dice qué hay adentro.

Nombres internos que conviene saber: el **Asesino** se llama `guerrero` en el código y **Sylva**
se llama `cazadora`. Las carpetas de assets usan esos nombres internos.

---

## 4. Flujo principal

1. `js/main.js` carga el guardado (`loadSave`), arma los menús y muestra el título.
2. `js/assets/preload.js` deja "Toca para continuar" deshabilitado (con %) hasta que baja todo
   el arte.
3. Menús (`js/ui/menus.js`, `js/ui/champion-select.js`): elegís modo, arena y campeón, y pasás
   a la **Sala** (4 lugares; equipamiento, árbol de talentos y habilidades del campeón). Fuera de
   la partida también está **Mis Campeones** (`js/ui/champions-hub.js`) con lo mismo por campeón.
   Objetos y talentos se cambian SOLO ahí (el juego es multijugador: en partida no hay pausa);
   las habilidades se suben en partida con los "+" del HUD (`js/ui/hud.js`).
   **Multijugador cooperativo B1** (`js/net/`, servidor en `server/`): la pre-sala puede crear
   una sala online real (hasta 4 humanos); el anfitrión simula la única partida y los invitados
   la reciben y mandan sus intenciones. Ver `docs/MULTIPLAYER_B1.md`.
4. **Comenzar** → `startRun()` en `js/core/run.js` crea al jugador y los 3 aliados
   (`js/champions/hero-factory.js`), arma el escenario (`js/arenas/arena-identity.js`) y arranca
   el nivel (`beginLevel` en `js/systems/waves.js`). La Arena Divina entra por
   `startDivinaExploration()`.
5. Cada cuadro, `loop()` (`js/core/loop.js`) llama a:
   - `update(dt)` (`js/core/update.js`): movimiento, IA, oleadas, jefes, colisiones, efectos
     con duración. Desde ahí se llama a cada sistema (combate, campeones, arenas…).
   - `render()` (`js/rendering/renderer.js`): dibuja escenario, entidades, efectos y overlays.
6. Al terminar un nivel: elección de refuerzo (`js/ui/buff-choice.js`). Nivel 10: jefe
   (`startBossFight` en `js/systems/waves.js`). Al vencerlo: `onBossDefeated` →
   pantalla de victoria (`js/ui/end-screens.js`). Si caés: `onPlayerDeath` → game over.
7. El progreso permanente (XP, oro, talentos, objetos) se guarda con `persist()`
   (`js/storage/save.js`).

---

## 5. Dónde modificar el balance

| Qué | Archivo | Qué buscar |
|---|---|---|
| Vida/daño/defensa/velocidad/energía de cada campeón | `js/data/champions.js` | `CLASSES.<campeón>` (`baseHP`, `baseDmg`, `baseDef`, `baseSpeed`...) |
| Costo, cooldown, daño, radio, duración de habilidades | `js/data/champions.js` | `skills: [...]` y `ultimate:` de cada campeón |
| Talentos | `js/data/talent-trees.js` | `TALENT_TREES.<campeón>` |
| Enemigos, élites y jefes (vida, daño, XP, oro) | `js/data/enemies.js` | `ENEMY_BASE.<tipo>` |
| Qué enemigos salen en cada arena | `js/enemies/spawning.js` | `spawnPoolFor...` |
| Dificultad de cada arena | `js/data/arenas.js` | `ARENA_MODS` |
| Duración de cada nivel | `js/systems/waves.js` | `levelDuration` en `beginLevel()` |
| Objetos, rarezas, pasivas, sets, legendarios | `js/data/items.js` | `RARITY_VALUES`, `PASSIVE_DB`, `SET_DB`, `DESIGNED_ITEMS` |
| Puntaje por rol y rareza de recompensas | `js/data/rewards.js` | `SCORE_CONFIG`, `RARITY_WEIGHTS_*` |
| Refuerzos entre niveles | `js/data/buffs.js` | `BUFF_POOL` |
| Arena Divina | `js/data/divina.js` | `DIVINA_*` |
| Curva de XP, castigo por abandonar | `js/systems/progression.js` | `xpToNext`, `ARENA_FAIL_PENALTY_PCT` |
| Maestría de habilidades | `js/systems/mastery.js` | `TALENT_MAX`, `useXpThreshold` |
| Radio de arena, niveles por arena, cámara | `js/core/constants.js` | `ARENA_RADIUS`, `LEVEL_COUNT`, `CAM_ZOOM` |

| Dificultad general (según el poder real del equipo), tope por golpe, vida/daño de jefes | `js/systems/difficulty.js` | `DIFF` |
| Regla creciente de cada arena (debuffs por nivel y durante el jefe) | `js/arenas/arena-rules.js` | `ARENA_RULES`, `arenaRule*Mult()` |
| Fases, rotaciones y ataques de cada jefe + guía de 3 consejos | `js/skills/boss-patterns.js` | `BOSS_DESIGNS`, `BOSS_ATTACKS` |
| Consejos de los subjefes | `js/ui/boss-hud.js` | `SUBBOSS_TIPS` |
| Disparo de cada familia de enemigos a distancia | `js/enemies/ranged-styles.js` | `RANGED_STYLE` |
| Pasivas de objetos por rareza, efectos únicos de legendarios | `js/data/items.js` | `PASSIVE_RARITY_MULT`, `LEGEND_PROCS`, `LEGEND_PROC_POWER` |
| Apuntado de habilidades (alcance, tipo de previsualización) | `js/skills/aim-targeting.js` | `AIM_PROFILES` |
| Música por modo, efectos, prioridades | `js/audio/audio.js` | `MUSIC_MODES`, `SFX_CFG` |
| Botín por arena/calificación, cantidad, protección contra la mala suerte, afinidad de sets | `js/data/loot.js` | `ARENA_LOOT`, `GRADE_LOOT`, `LOOT_PITY`, `SET_ARENA_WEIGHTS` |
| Calificación personal por rol (C/B/A/S/S+) | `js/systems/performance.js` | `PERF_ROLES`, `PERF_GRADES` |
| Sets (piezas, bonus 2/3/completo) y su comportamiento en combate | `js/data/sets.js`, `js/systems/set-effects.js` | `SET_DB`, `set*` hooks |
| Viewport del juego / escala de cámara | `js/core/constants.js`, `js/core/canvas.js` | `VIEW_WORLD_SHORT`, `VIEW_WORLD_LONG_MAX` |
| Roles enemigos (sanador, invocador, suicida...): chance por nivel, pool por arena, topes | `js/enemies/enemy-roles.js` | `ROLE_CFG`, `ROLE_CHANCE_BY_LEVEL`, `ROLE_POOL_BY_ARENA` |
| Ritmo del nivel (oleada, respiro, clímax) y curación de emergencia | `js/systems/pacing.js` | `PACE_PHASES`, `PACE_SURGE`, `EMERG_CFG` |
| Reacciones entre estados y resistencias por arena/tipo | `js/systems/reactions.js` | `REACTION_CFG`, `ENEMY_ARENA_RESIST`, `ENEMY_TYPE_RESIST` |
| Evolución de habilidades (Nv. 3/5/7/10) y proyectil de cada campeón | `js/systems/skill-evolution.js` | `EVO_CFG`, `CHAMP_IDENTITY` |
| Objetos destructibles del escenario | `js/systems/breakables.js` | `BRK_CFG` |
| Gore: presupuesto de manchas y cadáveres | `js/rendering/gore.js` | `GORE_BUDGET` |
| Impacto por nivel (hit-stop, retroceso, tambaleo) | `js/rendering/feedback.js` | `IMPACT_*`, `IMPACT_WEIGHT` |
| Legendarios con nombre, Míticos de receta, Únicos | `js/data/legendaries.js` | `NAMED_LEGENDARIES`, `RECIPE_MYTHICS`, `UNIQUE_DESIGNS` |
| Sets por campeón | `js/data/champion-sets.js`, `js/systems/champion-sets.js` | `CHAMPION_SETS` |
| Precio de campeón, venta de objetos, inventario | `js/data/champions.js`, `js/data/items.js` | `CHAMPION_PRICE_GOLD`, `SELL_VALUE`, `INVENTORY_CAPACITY` |
| Tienda diaria de objetos | `js/systems/shop.js` | ofertas del día |
| Chat de la Sala (anti-spam, historial, palabras tapadas) | `server/relay.js`, `js/net/net-chat.js` | `CHAT_*`, `NET_CHAT_QUICK` |

Modo campaña: ya no hay multiplicador de XP de prueba (`DEV_XP_MULT` se eliminó) ni un "nivel objetivo"
al terminar la campaña: `xpToNext(L) = 90 + 26·L + 0,16·L³` es rápida al principio y lenta al final
(medido con `tools/playtest/campaign.js`, ver `LA_HORDA_PROGRESSION_ECONOMY_REPORT.md`). Campeón de
regalo al empezar (`js/ui/starter-select.js`), el resto en la Tienda a `CHAMPION_PRICE_GOLD` (5.000); el
reinicio a nivel 1 es `campaignResetV1` en `js/storage/save.js`. El inventario es de la CUENTA
(`save.stash`, 30 lugares, migración `stashV1`) y cada campeón equipa desde ahí.

### Game feel (dónde está cada cosa)

- `js/rendering/feedback.js` — hit-stop, cámara lenta, impacto por nivel (liviano → jefe),
  viñeta y flechas de dirección del daño recibido, flechas a élites/jefes fuera de pantalla.
- `js/rendering/effects.js` — textos flotantes en canvas (con pool).
- `js/core/aim.js` — botones 1/2/3: tocar = automático, mantener = previsualizar,
  arrastrar = elegir; `drawAimPreview()`.
- `js/ui/hud.js` — estados de los botones (listo / activo / enfriamiento / sin recurso).
- `js/ui/boss-hud.js` — barra grande del jefe, fases, estado, aviso del ataque en curso, guía.
- `js/systems/item-procs.js` — efectos únicos de los legendarios en combate.
- `js/systems/mythic-powers.js` — poderes de los Míticos y comportamiento de los Únicos.
- `js/rendering/gore.js` — manchas, trozos, cadáveres (horneados en un canvas chico) y muertes por tipo.
- `js/enemies/enemy-roles.js` — roles enemigos + insignia/anillo + flecha en el borde para los de apoyo.
- `js/systems/pacing.js` — oleada con aviso de dirección, respiro, clímax; botón de curación de emergencia.
- `js/systems/skill-evolution.js` — Firma/Ímpetu/Resonancia/Forma final y la forma de cada proyectil.
- `js/systems/breakables.js` — urnas, barriles, ánforas... que estallan contra la horda (sin fuego amigo).
- `js/ui/loot-ceremony.js` — cofre con ceremonia por rareza; `js/ui/inventory-ui.js` — Mi Inventario,
  recetario y colección.
- `js/net/net-chat.js` — chat de la Sala (el anti-spam real vive en `server/relay.js`).
- `js/arenas/infernal/inf-hechicero.js` — el Hechicero Supremo: subjefe del nivel 9 de la Infernal (huye al caer)
  y jefe final en 3 formas (Ángel Corrompido con los poderes de los 4 Guardianes → Golem de Cuerpos → Demonio Mayor —
  Forma Final, diseño `demonio_final`). Arte recortado con `tools/art/hechicero/`.
- `js/ui/run-intro.js` — pantalla previa a la partida: el Hechicero angelical (alas de luz en canvas) y la ficha
  clara de la arena (`ARENA_BRIEF`: qué es, qué te mata, qué te ayuda, objetivo).
- `js/rendering/fx-contrast.js` — pase de contraste de efectos: sombra de contraste por arena, modo brillo del
  primitivo de sprites (`FX_GLOW`), destello de lanzamiento y estrella de impacto.
- `js/systems/crystals.js` — los Cristales de los Guardianes (lore en `LA_HORDA_LORE.md`): premio al vencer a la
  Madre Espora, al Mago de Hielo y al Guardián del Laberinto, ceremonia (el cristal vuela al jugador), guardado en
  `save.crystals`, diálogo del Hechicero y fila de cristales en la pantalla previa. Test `tools/items/t_crystals.js`.
- `js/champions/nigro-elements.js` — gólem elemental del Nigromante (Maestría "Maestro de Gólems": Fuego, Hielo,
  Tormenta o Plaga, excluyentes): multiplicadores, efecto por golpe, rastro de brasas, arte provisorio recoloreado y
  aura por elemento (también en la forma demoníaca). `exclusiveWith` de un nodo acepta una lista de ids.
  Test `tools/items/t_nigro_elements.js`.
- `js/arenas/arena-blocks.js` — muros y bloques de las arenas abiertas (Ruinas, Acuática, Gélida, Infernal):
  distribución por arena (`ARENA_BLOCK_LAYOUTS`, misma estructura que `labyrinthWalls`, así colisión y navegación
  los usan sin cambios), estilo por arena (`WALL_STYLES`, horneado a canvas) y transparencia cuando un héroe queda
  detrás. `aidBlocked(x,y,pad)` es la consulta "¿está libre?" para quien ubique cosas en el piso.
  Gradación del mapa del Reino Micelial: `tools/art/micelial/grade_map.py`.
- `js/ai/bot-brain.js` — bots por rol, esquivar avisos, revivir entre ellos, marcador de caído.
- `js/ui/title-scene.js` — ejército de héroes de la pantalla de título.
- `js/systems/loot.js` — botín del cofre del jefe (`rollLoot` pura, `grantEndOfRunLoot`) y reforja
  de piezas repetidas de set. Simulación: `tools/balance/`.
- **Arte — LA HORDA VISUAL GATE (regla permanente):** antes de integrar cualquier sprite/asset
  visual nuevo (campeón, enemigo, invocación, jefe), clasificarlo contra `docs/ART_BIBLE.md`
  (Master Reference: el Caballero/Tanque). Si el status no es PASS, no se integra al set visual
  de producción — ver el propio `docs/ART_BIBLE.md` §8 para PASS/FIX/REDRAW/REJECT. Estado
  actual del roster: `docs/VISUAL_ASSET_MANIFEST.md`. Pedido exacto de arte nuevo (campeones y
  subjefes en REDRAW): `docs/ART_REPLACEMENT_QUEUE.md`. Escaneo técnico reproducible (halo,
  alfa, fragmentos — nunca decide estilo, eso lo decide una persona mirando la referencia):
  `python3 tools/art/scan_sprites.py [--dir carpeta] [--apply]`. Hojas nuevas de arte → atlas:
  `python3 tools/art/redraw/build_all.py` (fuente en `art-source/redraw/`). Auditoría/normalización
  previa (sprint anterior): `VISUAL_ART_REWORK.md`, `tools/art/normalize_sprites.py` (`--check`).
- Playtest automatizado (sin tocar el juego): `tools/playtest/` — `make_jobs.py` + `campaign.js`
  corren partidas completas con un piloto automático (resultado, nivel alcanzado, qué te mata, jefe,
  botín) para comparar balance antes/después de un cambio.
- Timers de la partida: usar `runLater(ms, fn)` (`js/core/run.js`) en vez de `setTimeout`; se
  cancelan solos al abandonar o reiniciar.

---

## 6. Cómo agregar un campeón

1. **Datos** — `js/data/champions.js`: una fila en `CHAMPION_CATALOG` (id, precio, lore) y
   una entrada en `CLASSES` (estadísticas, rol, 3 habilidades + ulti). Cada habilidad tiene un
   `kind` (tipo de efecto).
2. **Talentos** — `js/data/talent-trees.js`: `TALENT_TREES.<id> = {...}`.
3. **Recompensas** — `js/data/rewards.js`: `SCORE_CONFIG.<id>` (cómo se puntúa su rol) y su
   fila en `CHAMP_ITEM_AFFINITY`. `js/data/items.js`: `CLASS_WEAPON_LABEL`.
4. **Arte** — PNG en `assets/sprites/champions/<id>/`, cargados en
   `js/assets/champion-sprites.js` (patrón: `new Image()`, bandera `READY`, `.src = "assets/..."`),
   y las rutas sumadas a `js/assets/asset-manifest.js`.
5. **Dibujo** — una función `draw<Nombre>Real(h, escala, alpha)` en
   `js/rendering/champion-sprites.js` y su rama en `drawHeroBody()`
   (`js/rendering/entities.js`) y en la vista previa de `js/ui/champion-select.js`.
   Personalidad de animación: `ANIM_PROFILES` en `js/rendering/animfx.js`.
6. **Habilidades** — si usa `kind` nuevos, agregar el `case` en `castAbility()`
   (`js/skills/abilities.js`). Si reutiliza `kind` existentes, no hace falta código.
7. **Mecánicas propias** (recursos, invocaciones, marcas…) — un archivo nuevo en
   `js/champions/<id>.js` y su llamada por cuadro dentro de `update()` (`js/core/update.js`).
8. **Bots** — cómo usa sus habilidades cuando es aliado: `botTryAbilities()` en
   `js/ai/allies.js`.
9. **HUD especial** (opcional) — `js/ui/hud.js` + su HTML en `index.html`.

Si falta el arte real, el juego dibuja un pixel art de respaldo desde `js/data/pixel-art.js`.

## 7. Cómo agregar un enemigo

1. `js/data/enemies.js`: entrada en `ENEMY_BASE` (vida, daño, velocidad, rango
   `normal/subelite/elite/subjefe/jefe`, XP, oro).
2. `js/enemies/spawning.js`: sumarlo al `spawnPoolFor<Arena>()` que corresponda.
3. Arte en `assets/sprites/enemies/<arena>/<tipo>/` (o `bosses/`), cargado en
   `js/assets/enemy-sprites.js` y listado en `js/assets/asset-manifest.js`.
4. Dibujo en `js/rendering/enemy-sprites.js` (hay varios motores: atlas, "packs" por pose,
   sprite estático) y su rama en `drawEnemyBody()` (`js/rendering/entities.js`).
5. Personalidad de animación/material de partículas: `ANIM_PROFILES` en
   `js/rendering/animfx.js`.
6. Si es jefe con habilidades: `js/skills/boss-skills.js`.

## 8. Cómo agregar una habilidad

1. En `js/data/champions.js`, dentro de `skills` o `ultimate` del campeón: nombre, ícono,
   costo, cooldown, `kind` y sus números.
2. Si el `kind` es nuevo: un `case "<kind>":` en `castAbility()` (`js/skills/abilities.js`).
   Para los efectos visuales escalonados por talento hay helpers en `js/skills/ability-vfx.js`
   (`tieredBurstVFX`, etc.) y el sistema de VFX en `js/rendering/vfx.js`.
3. Talentos que la modifican: `js/data/talent-trees.js` (se leen con `talentSkillMods`).
4. Uso por bots: `js/ai/allies.js`.

## 9. Cómo agregar una arena

**Camino recomendado (desde la Arena III):** carpeta propia `js/arenas/<clave>/` registrada en
`ARENA_DEFS` (`js/arenas/common/arena-registry.js`), sin tocar el motor: ver
`docs/arena-identity/README.md` y, como ejemplo completo, `js/arenas/fortaleza/`. El camino
clásico de abajo es el que siguen las 5 arenas originales.

1. `js/data/arenas.js`: entrada en `ARENA_MODS` (nombre, modificadores) y en `ARENA_ORDER`.
2. `js/enemies/spawning.js`: su `spawnPoolFor...` y que `spawnPoolFor()` la use.
3. Escenario: `aidBuild<Arena>()` en `js/arenas/arena-identity.js`, estilo en `AID_STYLE`
   (`js/rendering/arena.js`), props procedurales en `js/rendering/arena-props.js`, ambiente en
   `js/rendering/arena-ambience.js`, peligros en `js/arenas/hazards.js`.
4. Jefe del nivel 10: `startBossFight()` en `js/systems/waves.js`.
5. Guardado: `arenasCleared` en `defaultSave()` (`js/storage/save.js`).

## 10. Cómo agregar sprites o VFX

- **Sprite de personaje/enemigo:** ver pasos 4–5 de las secciones 6 y 7.
- **Efecto con imágenes** (explosión, tajo, splash): PNG en `assets/vfx/<grupo>/`, cargado en
  `js/assets/vfx-sprites.js`, registrado en `VFX_SPR_EXTRA` (`js/rendering/vfx.js`) y lanzado
  con `vfxSprite("<clave>", ...)`.
- **Siempre** sumar la ruta nueva a `js/assets/asset-manifest.js` (así el título espera a que
  cargue).
- Los PNG se usan tal cual: no hace falta convertirlos ni pasarlos a base64.

## 11. Guardado

- Clave de `localStorage`: `laHordaSave_v1` (sin cambios: las partidas guardadas antes de la
  modularización cargan igual).
- `loadSave()` (`js/storage/save.js`) completa campos que falten y migra partidas viejas
  (rareza de objetos, talentos, equipamiento). **Si cambia la forma del save, agregar la
  migración ahí** en vez de invalidar partidas.
- Exportar/importar progreso como código: `js/storage/save-code.js`.

## 12. Probar

- Preview por commit (iPhone): `https://rawcdn.githack.com/drmarianojimenez94-sudo/La-Horda/<commit>/index.html`
- Local: `python3 -m http.server 8000` en la carpeta del repo → `http://localhost:8000`.
- Batería de regresión automática: `tools/regression/` (ver su README).
- Sistemas de esta etapa: `tools/items/` (`t_items`, `t_nigromante`, `t_reactions`, `t_roles`, `t_pacing`,
  `t_evolution`, `t_collision`, `t_breakables`, `t_perf_exploits`, `t_hpbonus`, `t_hechicero`), `server/test-relay.js` (protocolo y chat).
- Balance con el código real: `tools/balance/lootsim2.js` (botín por carrera), `tools/playtest/campaign.js`
  (campañas y matrices con piloto automático).
