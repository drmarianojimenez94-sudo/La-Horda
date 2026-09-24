# ARENA_ASSET_REQUIREMENTS.md — Identidad de Arenas

Este documento registra el trabajo de identidad visual/estructural de arenas que **no** se
resolvió en el pase actual, para que quede como lista de producción y no bloquee el desarrollo.
No se descargó ni se va a descargar arte de terceros con derechos: todo lo de acá se resuelve
con composición de assets propios, geometría/paleta nueva, o encargo de arte pixel-art 16-bit
coherente con el estilo ya existente (crisp, sin antialiasing, fondo transparente, misma escala
que los personajes).

## Diagnóstico honesto (test de "sacale el color")

Las 4 arenas de oleadas (`drawArena()` en `index.html`) comparten **la misma geometría base**:
un octágono con 3 anillos concéntricos, 8 radios de piedra, y un círculo de runas central de
260px de radio, siempre en el mismo lugar. La diferencia entre arenas hoy es, en su mayoría,
**paleta de color** (`arenaVeinColors()`) más un puñado de detalles puntuales (follaje vs.
carámbanos en los árboles, muros del Laberinto). Si se les saca el color, las 4 son
indistinguibles salvo el Laberinto (que sí tiene una diferencia estructural real: los muros de
`labyrinthWalls`/`resolveWallCollision`). Esto confirma el diagnóstico original: "arena
roja/azul/verde", no "lugares reconocibles distintos".

Lo que SÍ se corrigió en este pase (bajo riesgo, sin tocar colisión/pathfinding):
- `arenaVeinColors()`: el Laberinto ya no hereda la paleta de fuego del Infernal por defecto;
  ahora tiene su propio tono dorado/arena (identidad greco-egipcia-desértica).
- `drawRuneCircle()` (el altar central, siempre visible): ahora se pinta con una paleta por
  arena (`runeCirclePalette()`) — hielo/azul, bosque/verde, laberinto/dorado, infernal/fuego —
  en vez de fuego fijo en las 4 arenas.

Lo que sigue pendiente es un cambio de **geometría/estructura real**, no solo de paleta, y
requiere re-validar spawn/pathfinding/colisiones después de cada cambio (tal como pide el
pedido original) — por eso no se hizo en este pase sin diagnóstico y testing dedicado.

## Estado por arena

### Infernal (`infernal`)
- **Tiene hoy**: paleta de fuego, lava en grietas y charcos (`lavaPools`), árboles muertos con
  brasas en la base, círculo de runas ígneo.
- **Falta para identidad real**: geometría propia (columnas destruidas, altares, cadenas,
  braseros como obstáculos/decoración con volumen, no solo textura de piso); erupciones
  pequeñas periódicas; humo/ceniza con más presencia.
- **Assets pedidos**: `infernal_columna_rota` (estático, ~64x96px, transparente, 1 variante
  dañada/1 entera), `infernal_brasero` (animado, 4 frames, loop, ~32x48px), `infernal_cadena`
  (estático, decorativo, colgante).

### Gélida (`hielo`)
- **Tiene hoy**: paleta azul/hielo, carámbanos en árboles, hazard de nova gélida.
- **Falta para identidad real**: pilares/glaciares como landmarks, grietas de hielo que
  "revienten" con partículas, ventisca direccional, niebla fría con más cuerpo.
- **Assets pedidos**: `hielo_glaciar_pilar` (estático, ~80x140px), `hielo_cristal_cluster`
  (estático, 2-3 variantes de tamaño), partícula `hielo_viento` (loop direccional, cheap).

### Ruinas / Bosque Céltico (`bosque`)
- **Tiene hoy**: paleta verde/musgo, árboles con follaje vivo, círculo de runas ahora en verde.
- **Falta para identidad real**: menhires/círculo ritual como landmark (no solo el altar
  central genérico), raíces/puentes rotos, luciérnagas, más profundidad de vegetación.
- **Assets pedidos**: `celtico_menhir` (estático, 2 variantes, ~48x100px), `celtico_estatua`
  (estático, ~64x110px), partícula `luciernaga` (loop, 2-3 frames, additive blend).

### Laberinto (`laberinto`)
- **Tiene hoy**: la única con diferencia ESTRUCTURAL real (`labyrinthWalls`, 3 anillos con
  huecos aleatorios), ahora también con paleta dorada propia en vez de heredar la del Infernal.
- **Falta para identidad real**: que los muros SE LEAN como corredores/cámaras de un laberinto
  greco-egipcio (columnas, estatuas, zonas monumentales) en vez de paneles de madera sueltos;
  el Minotauro necesita una "cámara" reconocible como su zona, no solo aparecer en el centro
  genérico.
- **Assets pedidos**: `laberinto_columna` (estático, para reemplazar visualmente los muros
  actuales sin tocar su colisión), `laberinto_estatua_esfinge` (estático, landmark de
  orientación), retextura de `labyrinthWalls` para que luzcan piedra tallada en vez de madera.

### Acuática (`acuatica`)
- **No existe todavía en el código** (ni `ARENA_MODS.acuatica`, ni roster de enemigos, ni
  jefe, ni geometría). Construirla es equivalente a agregar una arena nueva completa: requiere
  su propio `spawnPoolForAcuatica`, subjefe(s), jefe final, hazard propio, geometría/colisión
  revisada para "sensación submarina", y todo el arte nuevo. Es la pieza de mayor esfuerzo de
  todo el pedido de identidad de arenas — deliberadamente NO se intentó construir a ciegas en
  este pase para no entregar una arena a medio terminar o con pathfinding sin validar.
- **Necesita (producción completa)**: piso de templo hundido/coral, decoración (algas, barcos
  hundidos, columnas, esqueletos), roster de enemigos temático, subjefe + jefe final propios,
  partículas (burbujas, peces de fondo con loops baratos, rayos de luz), paleta submarina.

### Divina (`divina`)
- **Estado actual**: existe una Fase 1 de exploración (`startDivinaExploration`,
  `drawDivinaStructures`) sin combate todavía, explícitamente marcada como "en construcción"
  en `ARENA_MODS.divina`. No se tocó en este pase: cualquier cambio de identidad ahí debería
  ir de la mano de cuando se construya el combate 4v4 real, no antes.

## Recomendación de secuencia (si se retoma esto en una sesión dedicada)

1. Laberinto: retexturar `labyrinthWalls` a piedra + agregar 1-2 landmarks estáticos. Menor
   riesgo (la colisión ya existe y está validada), mayor impacto (es la arena con más quejas).
2. Infernal/Gélida/Céltica: agregar 1-2 landmarks estáticos por arena (sin colisión, puramente
   decorativos) + 1 partícula ambiental barata nueva cada una.
3. Acuática: recién ahí, como arena nueva completa, con su propio ciclo de diseño/testing.
4. Cada cambio de geometría (no de paleta) DEBE re-validarse con el checklist ya usado en este
   proyecto: spawn fuera de muros, bots no atascados, sin zonas inaccesibles, cuellos de botella
   con la horda ampliada (más enemigos simultáneos que antes).
