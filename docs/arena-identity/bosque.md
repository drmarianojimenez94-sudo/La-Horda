# Ruinas del Bosque

- **Lugar en la campaña:** 1ª
- **Roster:** Duende del Bosque, Enjambre de Hadas → Bestia, Cù-Sìth → Dama del Bosque, Ent
- **Subjefe:** Los 4 Dobladores (nivel 9)
- **Jefe:** Jinete Sin Cabeza (2 vidas: Resurrección Eterna)
- **Peligro propio:** Regeneración enemiga · niebla
- **Regla creciente:** Raíces Voraces
- **Código propio:** `spawnPoolForBosque` (spawning.js), `aidBuildBosque` (arena-identity.js), Dobladores en `update.js`, Jinete en `run.js`/`boss-patterns.js`

Esta arena usa el camino de siempre del motor (bloques por arena dentro de los archivos comunes):
no se migró al registro `ARENA_DEFS` para no arriesgar su comportamiento, que está fijado por la
regresión determinista (`tools/regression/t_det.js`). Si en el futuro se migra, basta con mover
sus bloques a `js/arenas/bosque/` y registrar los mismos ganchos que usa La Fortaleza.
