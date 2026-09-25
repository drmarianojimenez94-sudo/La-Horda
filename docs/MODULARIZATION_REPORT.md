# Modularización Segura V1 — informe técnico

Rama: `claude/horda-latest-updates-gv4tlf`. Punto de partida: commit `6a549b0`
(último commit antes de este sprint; incluye el pack de VFX del sprint anterior, que tampoco
está mergeado todavía).

## 1. Resumen

| | Antes | Después |
|---|---|---|
| Archivos versionados | 5 | 624 (+ docs) |
| `index.html` | 31.123.304 bytes (31 MB) | 15.935 bytes (16 KB) |
| Código JS | 1 IIFE de 16.971 líneas + 3 módulos inline | 84 archivos en `js/` (17.915 líneas con cabeceras) |
| CSS | 1 bloque `<style>` | 5 archivos en `css/` |
| Arte | 533 PNG en base64 dentro del HTML (30,1 MB de texto) | 530 PNG en `assets/` (23 MB, bytes idénticos) |
| Memoria JS después de cargar | 55,7 MB | 3,5 MB |
| Título visible (servidor local) | ~1,5 s | ~0,4 s |
| Costo por cuadro (update+render) | igual | igual (diferencias dentro del ruido) |

El comportamiento del juego es **idéntico**: 33 partidas deterministas producen exactamente
el mismo estado y los mismos píxeles en pantalla antes y después (ver §6).

## 2. Auditoría previa

**Inventario.** `index.html` tenía: 1 `<style>` (630 líneas), 3 scripts "de terceros"
autocontenidos (Cadena de Relámpagos, Muro de Fuego, habilidades del Caballerito; exportan a
`globalThis`) y el juego: un único IIFE `"use strict"` con **2265 sentencias de primer nivel**
(527 funciones, 306 declaraciones de variables, 1420 sentencias sueltas, casi todas de carga
de imágenes) y **901 nombres** globales al IIFE.

**Mapa de dependencias.** Se analizó el código con un parser (acorn + eslint-scope): para cada
sentencia, qué variables lee/escribe **en el momento de cargar** (incluyendo funciones que se
ejecutan al cargar y callbacks que pueden dispararse durante la carga, como `onload` o
`setTimeout`), y qué efectos tiene (DOM, listeners, `Math.random`, `localStorage`, timers).
Con eso el orden de los 84 scripts se calcula automáticamente y se verifica que sea un grafo
**sin ciclos** (89 relaciones de orden entre archivos).

**Hallazgos:**
- *Variables globales*: los 901 nombres eran privados del IIFE. Ahora son globales
  compartidos entre scripts. Ninguno choca con propiedades de `window` (verificado en Chromium
  y contra la lista de globales propios de Safari/WebKit).
- *Funciones duplicadas*: ninguna declaración duplicada. Funciones parecidas:
  `nearestEnemy` (muerta, eliminada) vs `nearestEnemyTo`; 4 estilos distintos de cargador de
  imágenes (ver followups).
- *Dependencias circulares*: en tiempo de carga, ninguna. En ejecución hay llamadas mutuas
  entre sistemas (combate ↔ habilidades ↔ campeones), normal en esta arquitectura.
- *Dependencias accidentales*: el orden de registro de listeners del DOM y el arranque (INIT)
  dependen de que el HTML exista; se preservó su orden relativo.
- *Números mágicos*: la mayoría del balance está en tablas (`CLASSES`, `ENEMY_BASE`,
  `ARENA_MODS`…), pero quedan fórmulas con números dentro de la lógica (duración de nivel,
  escalado de enemigos, bonus de victoria) → followup.
- *Código muerto*: 13 funciones + 1 constante (§3).
- *Fallbacks viejos*: pixel art procedural y sprites de 3 direcciones de Segador/Axiom siguen
  como respaldo del arte real (§3).
- *Sistemas nuevos sobre viejos*: arreglo `particles` original + pool de VFX nuevo; motor
  AnimAtlas + dibujo procedural; Arena Identity V1 + piso original.
- *Assets duplicados*: 3 PNG repetidos byte a byte (2 frames de caminata del Nigromante y 1
  frame del muro de hielo) → se guardan una vez.
- *Timers/listeners*: un único loop `requestAnimationFrame`; listeners registrados una sola
  vez al cargar (los de paneles se crean sobre elementos que se regeneran, sin fugas);
  12 `setTimeout` de efectos con demora que no se cancelan al abandonar una partida (impacto
  prácticamente nulo, followup).
- *Funciones excesivamente grandes*: `castAbility` 1137 líneas, `update` 852,
  `updateBossSkills` 227, `triggerBasic` 220, `render` 214. Se movieron intactas (partirlas es
  reescribir) → followups.

## 3. Clasificación del código

- **ACTIVE**: todo lo demás (lo que se ejecuta al jugar).
- **LEGACY BUT REQUIRED** (se conserva): pixel art procedural (`js/data/pixel-art.js`,
  `js/rendering/pixel-sprites.js`) como respaldo de sprites reales; `SEGADOR_REAL_IMG` y
  `AXIOM_REAL_IMG` como respaldo de los packs animados; el arreglo `particles` original.
- **DEAD CODE** (eliminado en `34d8b14`): `masteryNodeRank`, `canBuyTalentNode`,
  `talentFlag`, `runeCirclePalette`, `drawRuneCircle`, `drawDivinaStructures`,
  `nearestEnemy`, `currentDmgMultiplier`, `isCrit`, `stopMusic`, `damagePlayer`,
  `livingHeroes`, `resetBossSkillWorld`, `PROFETA_SKILL_ICONS`. Criterio: ninguna referencia
  desde código alcanzable (análisis de alcance sobre todo el programa) ni en el HTML ni en los
  módulos de terceros. Sus 4 imágenes se conservan en
  `assets/sprites/champions/profeta/unused-skill-icons/`.
- **UNCERTAIN**: ninguno quedó sin clasificar.

## 4. Baseline (ANTES de tocar nada)

Sobre el commit `6a549b0`:
- Snapshot de carga: las 901 variables del juego, código de cada función (hash), píxeles de
  cada una de las 523 imágenes cargadas, CSS y DOM.
- 33 partidas deterministas (ver `tools/regression/README.md`), corridas **dos veces**:
  trazas idénticas → el harness es determinista.
- Batería de UI real: 94 chequeos, 94 PASS.
- Problemas preexistentes (no atribuibles a la migración, no se tocaron):
  - La victoria siempre dice "Arena Infernal — Completada" (texto fijo).
  - La fuente de Google Fonts no carga sin internet (en el sandbox de pruebas se ve el aviso de
    red; en un teléfono con internet carga normal).
  - `DEV_XP_MULT = 100` (multiplicador de prueba ya existente).
  - El navegador pide `/favicon.ico` y el sitio no tiene (404 inofensivo, igual que antes).

## 5. Estrategia

- **Scripts clásicos compartiendo el ámbito global**, no ES modules: así cada función y
  variable conserva su nombre y las ~cientos de asignaciones entre sistemas (`player = …`,
  `enemies = […]`, `state = …`) siguen funcionando sin reescribirse. Con ES modules un valor
  importado no se puede reasignar: habría que reescribir todo el estado → prohibido en este
  sprint (followup #4). Además funciona abriendo el archivo con doble clic.
- **Nada se editó a mano**: un pipeline toma el `index.html` original y (1) corta el CSS por
  secciones, (2) decodifica cada PNG a su archivo y reemplaza el literal por la ruta, (3) mueve
  los módulos de terceros, (4) quita el código muerto, (5) reparte cada sentencia original en
  su archivo según un mapa, preservando los comentarios y el orden relativo, y (6) calcula el
  orden de carga con las restricciones del §2. Los únicos cambios de código son los 4
  cargadores que antes concatenaban `'data:image/png;base64,'+src` (ahora reciben la ruta).
- **Único agregado**: `js/assets/preload.js`. Antes el título aparecía solo cuando todo el
  arte ya estaba (venía dentro del HTML). Ahora el título aparece enseguida y "Toca para
  continuar" queda deshabilitado con el % de carga hasta que bajan todas las imágenes; al
  terminar vuelve a su texto original. Así nunca se entra a jugar con sprites a medio cargar.

## 6. Commits y verificación por etapa

Cada etapa se generó completa, se instrumentó y se comparó contra el baseline antes de
commitear. "Snapshot" = 901 variables + píxeles de imágenes + CSS + DOM; "Det" = 33 partidas
deterministas (estado cada 30 cuadros + píxeles del canvas).

| Commit | Etapa | Snapshot | Det | Otros |
|---|---|---|---|---|
| `6eab7df` | CSS → `css/` | idéntico | — | reglas CSS combinadas idénticas |
| `2dcb645` | Arte → `assets/` + precarga | idéntico (salvo rutas) | 33/33 idénticos | UI 94/94 |
| `a824942` | Módulos de terceros → `js/vendor/` | idéntico | (cubierto por la siguiente) | |
| `34d8b14` | Código muerto eliminado | idéntico (salvo los 14 nombres) | 33/33 idénticos | |
| `7991c8b` | IIFE → `js/game.js` | idéntico | 33/33 idénticos | |
| `8bf3a4b` | `js/data/` | idéntico | 33/33 idénticos | |
| `f96b7c7` | `js/core/` + `js/main.js` | idéntico | 33/33 idénticos | |
| `22eae54` | `js/storage/` | idéntico | 33/33 idénticos | |
| `84a7afe` | `js/assets/` (registros) | idéntico | 33/33 idénticos | |
| `f6bba71` | `js/rendering/` | idéntico | 33/33 idénticos | |
| `842b6c9` | `js/champions/`, `js/skills/` | idéntico | 33/33 idénticos | |
| `4c7a946` | `js/arenas/`, `js/enemies/`, `js/ai/` | idéntico | 33/33 idénticos | |
| `e47963e` | `js/systems/` | idéntico | 33/33 idénticos | |
| `c373bfa` | `js/ui/`, `js/core/input.js`, `js/audio/` | idéntico | 33/33 idénticos | UI 94/94, saves, file://, caché, rendimiento |

## 7. Regresión final ANTES vs DESPUÉS

| Prueba | Resultado |
|---|---|
| Snapshot de carga (variables, funciones, píxeles de imágenes, CSS, DOM) | PASS — sin diferencias no esperadas |
| 10 campeones × 5 arenas (combate corto) | PASS — 10/10 idénticos |
| 10 campeones, partida larga con subida de nivel y refuerzo | PASS — 10/10 idénticos |
| Jefe final de cada arena (incl. Ángel Caído, Jinete, Minotauro, Demonio, Leviatán) hasta la victoria | PASS — 5/5 idénticos |
| Arena Divina (con y sin god mode) | PASS — 2/2 idénticos |
| Nigromante + invocaciones | PASS |
| Muerte natural → game over | PASS |
| Subida de nivel, elección de refuerzos | PASS |
| Revivir aliado | PASS |
| Objetos (recompensas, generar, equipar, fusionar), talentos, estadísticas, guardado | PASS — idénticos |
| UI real: menús, galería, tienda, 5 arenas por la interfaz, pausa y pestañas, talentos, inventario, muerte/reintento, 5 cambios de arena sin recargar | PASS — 94/94, mismos resultados que antes |
| Saves: viejos, corruptos, vacíos; save escrito por la versión vieja leído por la nueva y viceversa | PASS — 6/6, mismo estado y mismos bytes |
| iPhone emulado: vertical (aviso de girar), horizontal con toques reales (joystick, botones) | PASS |
| Abrir con doble clic (`file://`) | PASS |
| Servidor con caché de 10 min (como GitHub Pages): carga limpia, recarga (0 bytes transferidos), pestaña nueva | PASS |
| Errores de consola nuevos | ninguno |

## 8. Pendiente de verificar fuera del sandbox

- Safari real de iPhone (acá solo hay Chromium; se emuló viewport, touch y user agent). Por
  eso hace falta la prueba manual en el teléfono.
- Tiempo de carga con red móvil real: ahora son ~620 archivos (23 MB) en vez de 1 HTML de
  31 MB; con HTTP/2 debería ser igual o más rápido, y el título aparece antes.
