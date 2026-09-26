# Arena Identity — qué es común y qué es de cada arena

Esta carpeta ordena las arenas para que agregar una nueva no obligue a tocar el motor. El código
de las 6 arenas anteriores **no se movió** (moverlo no aportaba nada y arriesgaba su
comportamiento, que está cubierto por la regresión determinista); lo que cambió es que ahora hay
un **registro** con ganchos, y la Arena III (La Fortaleza Sin Fin) es la primera construida
enteramente sobre él.

## Lo COMÚN (motor; no se toca para agregar una arena)

| Sistema | Dónde |
|---|---|
| Niveles, oleadas por tiempo, cierre de nivel, jefe del nivel 10 | `js/systems/waves.js`, `js/core/update.js` |
| Aparición y escalado de enemigos | `js/enemies/spawning.js`, `js/systems/difficulty.js` (`DIFF`) |
| Director de jefes (fases, rotaciones) y piezas de kit (telegraphs, golpes diferidos) | `js/skills/boss-patterns.js`, `js/skills/boss-skills.js` (`bossWindup`, `bossStrike`, `bossHitHero`) |
| Avisos en el piso que los bots esquivan | `vfxTelegraph` en `js/rendering/vfx.js`, `botDangerVec` en `js/ai/bot-brain.js` |
| Navegación (campo de flujo sobre grilla) | `js/ai/navigation.js` |
| Bots por rol, revivir | `js/ai/bot-brain.js`, `js/ai/allies.js` |
| Red host-autoritativa (snapshots, eventos) | `js/net/net-game.js` |
| HUD de jefe y guía de aparición | `js/ui/boss-hud.js` |
| Reglas crecientes, desbloqueo en orden | `js/arenas/arena-rules.js` |
| Datos de arena (dificultad, orden, botín) | `js/data/arenas.js`, `js/data/loot.js` |
| **Registro de arenas** (`ARENA_DEFS`, `arenaHook`, `arenaTitleCard`, `ARENA_BOSS_TIPS`, `ARENA_SFX`) | `js/arenas/common/arena-registry.js` |

## Lo PROPIO de cada arena

| Arena | Orden | Código propio | Ficha |
|---|---|---|---|
| Ruinas del Bosque | 1 | bloques en `update.js`/`spawning.js`, `aidBuildBosque` + **`js/arenas/bosque/`** (`ARENA_EXT`) | [bosque.md](bosque.md) |
| Arena Acuática | 2 | `js/arenas/acuatica.js` + bloques en `update.js` + **`js/arenas/acuatica/`** (`ARENA_EXT`) | [acuatica.md](acuatica.md) |
| **La Fortaleza Sin Fin** | **3** | **`js/arenas/fortaleza/`** (registrada en `ARENA_DEFS`) | [fortaleza.md](fortaleza.md) |
| **El Reino Micelial** | **4** | **`js/arenas/micelial/`** (registrada en `ARENA_DEFS`) | [micelial.md](micelial.md) |
| Arena de Hielo | 5 | bloques en `update.js`/`boss-skills.js`, `aidBuildHielo` + **`js/arenas/hielo/`** (`ARENA_EXT`) | [hielo.md](hielo.md) |
| Laberinto Maldito | 6 | muros en `collision.js`, `aidLabyrinthLayout` + **`js/arenas/laberinto/`** (`ARENA_EXT`) | [laberinto.md](laberinto.md) |
| Arena Infernal | 7 | `aidBuildInfernal`, pozos de lava en `hazards.js` + **`js/arenas/infernal/`** (`ARENA_EXT`) | [infernal.md](infernal.md) |
| Arena Divina (modo aparte) | — | `js/arenas/divina.js`, `js/rendering/divina.js` | [divina.md](divina.md) |

## Extensiones de identidad (`ARENA_EXT`, Alpha 0.1)

Las 5 arenas del camino de siempre recibieron **identidad jugable propia** sin migrarlas: cada una
registra `ARENA_EXT.<clave>` con ganchos que **solo agregan** (runStart, guestStart, beginLevel,
update, guestUpdate, placeSpawn, ctxTargets, botNudge, botDanger, drawGround, pushTall/drawTall,
drawTop, drawScreen, netState/applyNetState). `arenaDef()` no ve las extensiones, así que la
geometría, los subjefes y la navegación de siempre quedan intactos.

Sistemas comunes nuevos que usan:

| Sistema | Dónde | Qué da |
|---|---|---|
| **Acción contextual** | `js/systems/context-actions.js` | Un solo botón "usar" (el de Revivir: revivir tiene prioridad; tecla E). Objetivos que pone la arena (`ctxTargets`), progreso host-autoritativo, mensaje de red `ctx`, cooperar acelera, bots con `ctxBotObjective` (+ camino por la grilla), aviso y barra en el mundo. |
| **Etiquetas ambientales** | `js/systems/env-tags.js` | `envEmit(tag, x, y)` desde las habilidades y `envOn(tag, arena, fn)` en cada arena (fuego → braseros/maleza, hielo → fisuras, rayo → charcos). |
| **Tutorial jugable** | `js/systems/tutorial.js` | La voz del Hechicero: cada concepto se enseña una vez, jugando (`tutSay` / `tutDone`, guardado en `save.tut`). |

| Arena | Mecánica propia |
|---|---|
| Ruinas | runas de los menhires (usar el escenario) + emboscadas con aviso |
| Acuática | corrientes (lineal, remolino, anillo, chorro) + charcos conductores |
| Gélida | frío por quietud + braseros (moverse es sobrevivir) |
| Laberinto | sellos I-II-III en orden (resolver) |
| Infernal | fisuras-portal que crecen: ¿mato o cierro? |

Pruebas: `tools/identity/t_identity.js` (80 chequeos) y `tools/identity/t_identity_net.js`
(`ARENA=infernal|hielo|acuatica|laberinto|bosque`, 2 a 4 jugadores reales por el relay).

## Cómo agregar una arena nueva

1. Crear `js/arenas/<clave>/` con sus datos, mecánicas, enemigos y dibujo (ver `fortaleza/` como
   plantilla: `*-data.js`, `*-map.js`, `*-enemies.js`, `*-bosses.js`, `*-render.js`, `*-arena.js`).
2. Registrarla: `ARENA_DEFS.<clave> = { ...ganchos... }` (todos opcionales, lista abajo).
3. Datos: `ARENA_MODS.<clave>` y su lugar en `ARENA_ORDER` (`js/data/arenas.js`), `ARENA_RULES`
   (`js/arenas/arena-rules.js`), `ARENA_LOOT` / `SET_ARENA_WEIGHTS` (`js/data/loot.js`),
   `DIFF.bossDmgPct` / `DIFF.bossHpType` (`js/systems/difficulty.js`).
4. Enemigos: sumar sus fichas a `ENEMY_BASE` desde el archivo de datos de la arena y su arte con
   `enemyAtlasPackLoad` (atlas con los pies alineados). Sus imágenes van a `ASSET_MANIFEST`.
5. Agregar los `<script>` en `index.html` (después de `js/arenas/hazards.js`).
6. Pruebas propias en `tools/<clave>/` y correr la regresión (`tools/regression`).

### Ganchos (`ARENA_DEFS[arena]`)

`runStart`, `guestStart`, `beginLevel`, `update(dt)`, `guestUpdate(dt)`, `clamp(ent)`,
`inside(x,y,m)`, `navBounds` (dato), `navBlocked(x,y)`, `spawnPool(level)`,
`spawnIntervalMult()`, `placeSpawn(e, atBoss, champ)`, `subBossLevels` (dato), `holdLevel()`,
`enemyTarget(e)`, `enemyAI[tipo](e,dt,tgt,dist)`, `enemyKilled(e)`, `afterEnemies()`, `botDanger(x,y,pad)`,
`heroReachable(a,b)`, `botRegroup(h,t)`, `buildDecor()`, `drawWorld(now)`, `pushTall()`,
`drawTall(it,now)`, `drawTop()`, `drawScreen()`, `drawProjectile(p)`, `netState()`,
`applyNetState(s)`, `drawEnemyBody(e)`, `bossDefeated(boss)`, `botTarget(h,range)`, `camLift()`. La descripción de cada uno está al principio de
`js/arenas/common/arena-registry.js`. Si una arena no define un gancho, el motor hace exactamente
lo de siempre.

## Identidad y curva de dificultad (cada arena se siente distinta)

| Arena | Identidad | Roster | Peligro propio |
|---|---|---|---|
| Bosque | entrada, horda débil y numerosa; **el bosque caza** | duendes, hadas, bestias | regeneración enemiga, niebla, **emboscadas; runas a favor** |
| Acuática | ruinas hundidas; **el agua decide** | tiburones, medusas, cangrejos | **zonas de corriente, chorros, charcos conductores** |
| **Fortaleza** | **la fortaleza es un enemigo más: recorrido por sectores** | **pesado: subélites y élites desde temprano, menos enemigos por minuto** | **puentes que se reconfiguran + Ciclo Mecánico de trampas** |
| **Reino Micelial** | **el escenario crece, madura y muere; el mapa es el jefe** | **colonia: masa + emboscada + tanque + tiradores que se plantan + jaurías + chamán de apoyo** | **Núcleos Miceliales (infección que frena y genera colonia), nubes de esporas, partes de la Madre** |
| Hielo | **moverse es sobrevivir** | lobos, gólems, ángeles | novas gélidas, lentitud creciente, **frío por quietud; braseros** |
| Laberinto | muros, pasillos; **se resuelve** | escorpiones, gólems, medusas | sismos, maná escaso, **sellos en orden** |
| Infernal | la final; **¿mato o cierro?** | demonios | ignición, curación reducida, **fisuras-portal** |
