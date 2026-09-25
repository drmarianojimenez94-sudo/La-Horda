# Arena Divina

- **Lugar en la campaña:** modo aparte (asedio 4v4)
- **Roster:** Resumen de TODO lo peleado: toma cualquier enemigo no jefe de `ENEMY_BASE` (desde la Arena III incluye a los de la Fortaleza, salvo el Engendro)
- **Subjefe:** Campeones divinos rivales
- **Jefe:** Jefes finales de cada bioma (nivel 6)
- **Peligro propio:** Torres y castillos
- **Regla creciente:** —
- **Código propio:** `js/arenas/divina.js`, `js/rendering/divina.js`, `js/data/divina.js`

Esta arena usa el camino de siempre del motor (bloques por arena dentro de los archivos comunes):
no se migró al registro `ARENA_DEFS` para no arriesgar su comportamiento, que está fijado por la
regresión determinista (`tools/regression/t_det.js`). Si en el futuro se migra, basta con mover
sus bloques a `js/arenas/divina/` y registrar los mismos ganchos que usa La Fortaleza.
