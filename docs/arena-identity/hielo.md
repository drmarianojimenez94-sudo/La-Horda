# Arena de Hielo

- **Lugar en la campaña:** 4ª
- **Roster:** Lobo Ártico → Gólem de Hielo → Dragoncito → Ángel de Hielo → Demonio de Hielo y Fuego
- **Subjefe:** Tundraverx, Dragón de Hielo (nivel 6)
- **Jefe:** Mago de Hielo y Cristal → Ángel Caído (2 fases)
- **Peligro propio:** Nova gélida, escarcha acumulable
- **Regla creciente:** Frío Creciente
- **Código propio:** bloques en `update.js`, `boss-skills.js` (Muro de Hielo), `aidBuildHielo`

Esta arena usa el camino de siempre del motor (bloques por arena dentro de los archivos comunes):
no se migró al registro `ARENA_DEFS` para no arriesgar su comportamiento, que está fijado por la
regresión determinista (`tools/regression/t_det.js`). Si en el futuro se migra, basta con mover
sus bloques a `js/arenas/hielo/` y registrar los mismos ganchos que usa La Fortaleza.
