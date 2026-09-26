# Laberinto Maldito

- **Lugar en la campaña:** 6ª
- **Roster:** Escorpión Gigante → Gólem de Piedra → Medusa, Druida de Arena → Esfinge
- **Subjefe:** Guardián del Laberinto (nivel 6)
- **Jefe:** Minotauro
- **Peligro propio:** Muros reales (colisión + navegación), sismos, maná escaso
- **Regla creciente:** Muros que se Cierran
- **Código propio:** `collision.js` (muros), `aidLabyrinthLayout`, `spawnPoolForLaberinto`

Esta arena usa el camino de siempre del motor (bloques por arena dentro de los archivos comunes):
no se migró al registro `ARENA_DEFS` para no arriesgar su comportamiento, que está fijado por la
regresión determinista (`tools/regression/t_det.js`). Si en el futuro se migra, basta con mover
sus bloques a `js/arenas/laberinto/` y registrar los mismos ganchos que usa La Fortaleza.
