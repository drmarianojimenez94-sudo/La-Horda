# ARENA 09 — Minas Profundas

> *"La luz es territorio."*

Arena 09 de la campaña canónica: la última antes de la Arena Infernal. El descenso por una mina que baja hasta
la puerta del Infierno.
- **Identidad: LA LUZ ES TERRITORIO.** Cada fuente encendida es terreno ganado; la oscuridad es una amenaza de
  verdad (+15 % de daño recibido, emboscadas), pero nunca es negro total.
- **Jefes:** el **Titán de Piedra** es el subjefe del nivel 8 y **Cerbero, Guardián del Umbral Infernal**, el
  jefe del nivel 10. Cerbero **no es** uno de los Cuatro Guardianes.
- **Cierre:** matar a Cerbero **no** termina la arena. Se abre el **Portal Infernal** y la partida termina
  cuando un jugador humano lo **atraviesa**.

Informe completo: [`LA_HORDA_MINES_IMPLEMENTATION_REPORT.md`](../../LA_HORDA_MINES_IMPLEMENTATION_REPORT.md) ·
Assets faltantes: [`LA_HORDA_MINES_MISSING_ASSETS.md`](../../LA_HORDA_MINES_MISSING_ASSETS.md).

## Ficha

| | |
|---|---|
| Lugar en la campaña | 09 (después del Abismo, antes de la Infernal) |
| Sectores | Mina Superior −40 m (niv. 1-2) · Galerías −120 m (3-4) · Vetas Profundas −240 m (5-6) · Mina Corrompida −380 m (7) · Profundidades −520 m (8-9) · Umbral Infernal −666 m (10) |
| Roster | Esclavo Enlazado, Insecto de Cristal, Acechador Ciego, Minero Corrompido, Escupidor de Oscuridad, Consumidor Luminoso |
| Evento élite | Devoraluz (niveles 6, 7 y 9): elige una luz, viaja, avisa, la devora y pasa a la siguiente |
| Subjefe | Titán de Piedra (nivel 8, el nivel no avanza mientras viva) |
| Jefe | Cerbero (3 actos: encadenado · cadenas rotas al 66 % · furia al 33 %) |
| Peligro propio | La Oscuridad (fuentes que se apagan, zonas de oscuridad, antorchas sofocadas) |
| Regla creciente | La Oscuridad Avanza: las luces pierden energía más rápido y la Horda golpea +3 % por nivel de regla |
| Acción contextual | ENCENDER (mantener 1,3 s; se corta con un golpe fuerte) · ATRAVESAR EL UMBRAL (solo humanos, 0,9 s) |

## Archivos

| Qué | Dónde |
|---|---|
| Datos: sectores, luces, balance (`MN_CFG`), fichas | `js/arenas/minas/mn-data.js` |
| Estado, colisión, navegación, descenso, apariciones | `js/arenas/minas/mn-map.js` |
| Luz, ENCENDER / ATRAVESAR, máscara de oscuridad | `js/arenas/minas/mn-light.js` |
| IA de los 6 enemigos + Devoraluz, oleadas | `js/arenas/minas/mn-enemies.js` |
| Titán, Cerbero, Portal Infernal | `js/arenas/minas/mn-bosses.js` |
| Dibujo, HUD de luz, minimapa | `js/arenas/minas/mn-render.js` |
| Registro en `ARENA_DEFS`, atlas, sonidos, guías de jefe, bots, red | `js/arenas/minas/mn-arena.js` |
| Hojas fuente (oficiales, del usuario) | `art-source/minas/{enemigos1,enemigos2,jefes,mapa}.png` |
| Recorte | `tools/art/minas/extract.py` → `assets/sprites/arenas/minas/`, `assets/vfx/minas/`, `js/assets/minas-meta.js` · pisos: `tools/art/minas/floor.py` |
| Pruebas | `tools/minas/smoke.js` (29) · `tools/net-test/minas_coop.js` (12) |

## Enganches nuevos al motor (genéricos, para cualquier arena)
- **`defeatOutcome:"exit"`** en la ficha de un jefe, más **`completeArenaByExit()`** (`js/core/run.js`): la
  arena termina por una salida y no por la muerte del jefe. Hay un solo cierre, con candado.
- **`heroDmgTakenMult(h)`**: multiplicador de daño recibido por arena (`js/systems/combat.js`).
