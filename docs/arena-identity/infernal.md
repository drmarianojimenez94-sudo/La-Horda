# Arena Infernal

- **Lugar en la campaña:** 7ª (la final)
- **Roster:** Esqueleto → Zombi → Esqueleto H → Demonio Menor → Demonio Mago → Gólem
- **Subjefe:** Campeones de la horda (niveles 4, 7 y 9)
- **Jefe:** Demonio Mayor (regenera)
- **Peligro propio:** Ignición, habilidades más débiles, pozos de lava
- **Regla creciente:** Tierra Maldita
- **Código propio:** `spawnPoolFor`, `aidBuildInfernal`, `hazards.js`

Esta arena usa el camino de siempre del motor (bloques por arena dentro de los archivos comunes):
no se migró al registro `ARENA_DEFS` para no arriesgar su comportamiento, que está fijado por la
regresión determinista (`tools/regression/t_det.js`). Si en el futuro se migra, basta con mover
sus bloques a `js/arenas/infernal/` y registrar los mismos ganchos que usa La Fortaleza.
