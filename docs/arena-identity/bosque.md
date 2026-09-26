# Ruinas del Bosque

- **Lugar en la campaña:** 1ª
- **Roster:** Duende del Bosque, Enjambre de Hadas → Bestia, Cù-Sìth → Dama del Bosque, Ent
- **Subjefe:** Los 4 Dobladores (nivel 9)
- **Jefe:** Jinete Sin Cabeza (2 vidas: Resurrección Eterna)
- **Peligro propio:** Regeneración enemiga · niebla
- **Regla creciente:** Raíces Voraces
- **Código propio:** `spawnPoolForBosque` (spawning.js), `aidBuildBosque` (arena-identity.js), Dobladores en `update.js`, Jinete en `run.js`/`boss-patterns.js`

Esta arena usa el camino de siempre del motor (bloques por arena dentro de los archivos comunes):
no se migró al registro `ARENA_DEFS` para no arriesgar su comportamiento. Desde Alpha 0.1 su
**identidad propia** vive en una **extensión** (`ARENA_EXT`, ver abajo) que solo agrega cosas encima
(nunca toca geometría, subjefes ni navegación). La regresión determinista (`tools/regression/t_det.js`)
ya no da igual que antes en esta arena **a propósito**: hay mecánicas nuevas. Si en el futuro se migra, basta con mover
sus bloques a `js/arenas/bosque/` y registrar los mismos ganchos que usa La Fortaleza.

## Identidad propia (Alpha 0.1) — `js/arenas/bosque/bos-ruins.js` · "el bosque te caza, las piedras te recuerdan"

| Mecánica | Qué hace | Cómo se juega |
|---|---|---|
| **Runas de los menhires** | 4 de los 8 menhires guardan una runa que se carga sola (32 s; la primera ~12 s). Cargada brilla y se activa con la **acción contextual** (✚ / E): raíces atrapan (2,2 s) y lastiman (20 % de la vida) a todos los enemigos en 280 u. Élites/subjefes 0,9 s y 6 %; el jefe apenas se frena (0,35 s, 1,5 %). | Llevar la horda a una piedra cargada. Primera lección de "usar el escenario". |
| **Emboscadas** | Desde el nivel 2, cada 36-50 s la maleza se sacude alrededor del equipo (2,6 s: hojas que tiemblan, "!", ojos, crujido) y salta una jauría (bestias / Cù-Sìth si ya salen). Nunca con subjefe o jefe vivos. | Alejarse de la maleza que tiembla o esperar con un área. **Fuego** sobre la maleza la quema: los que salen, salen ardiendo. |
| **Tutorial jugable** | La voz del Hechicero (`js/systems/tutorial.js`): moverse → atacar → habilidad en la primera partida; runas y emboscadas cuando aparecen. | Nada que leer antes de jugar. |

- **Bots:** activan una runa cargada cuando hay 4+ enemigos alrededor.
- **Red:** cargas de las runas y emboscadas en `bosNetState()`.
- **Pruebas:** `BOS.*`, `TUT.*` y `ENV.el_fuego_quema_la_maleza_de_la_emboscada` en `tools/identity/t_identity.js`.
- **Divergencia con el documento de diseño (anotada, no cambiada):** el documento pide "Guardián Élfico / Bestia" como jefes; el juego tiene al Jinete Sin Cabeza y a los 4 Dobladores. No se reemplazó contenido canon existente.
- **EN DESARROLLO:** ocultamiento de los héroes en la maleza (propuesto, no implementado).
