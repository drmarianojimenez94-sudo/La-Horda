# Arena Acuática

- **Lugar en la campaña:** 2ª
- **Roster:** Tiburón Joven → Medusa Eléctrica → Cangrejo Acorazado → Sirena Abisal → Anguila → Tiburón Blanco (élite)
- **Subjefe:** Kraken Joven (nivel 6)
- **Jefe:** Leviatán (3 vidas, ronda el borde)
- **Peligro propio:** Corriente Profunda (empuja, no daña)
- **Regla creciente:** Presión Abisal
- **Código propio:** `js/arenas/acuatica.js`, bloques por tipo en `update.js`, `spawnPoolForAcuatica`

Esta arena usa el camino de siempre del motor (bloques por arena dentro de los archivos comunes):
no se migró al registro `ARENA_DEFS` para no arriesgar su comportamiento, que está fijado por la
regresión determinista (`tools/regression/t_det.js`). Si en el futuro se migra, basta con mover
sus bloques a `js/arenas/acuatica/` y registrar los mismos ganchos que usa La Fortaleza.
