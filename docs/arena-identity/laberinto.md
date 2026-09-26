# Laberinto Maldito

- **Lugar en la campaña:** 6ª
- **Roster:** Escorpión Gigante → Gólem de Piedra → Medusa, Druida de Arena → Esfinge
- **Subjefe:** Guardián del Laberinto (nivel 6)
- **Jefe:** Minotauro
- **Peligro propio:** Muros reales (colisión + navegación), sismos, maná escaso
- **Regla creciente:** Muros que se Cierran
- **Código propio:** `collision.js` (muros), `aidLabyrinthLayout`, `spawnPoolForLaberinto`

Esta arena usa el camino de siempre del motor (bloques por arena dentro de los archivos comunes):
no se migró al registro `ARENA_DEFS` para no arriesgar su comportamiento. Desde Alpha 0.1 su
**identidad propia** vive en una **extensión** (`ARENA_EXT`, ver abajo) que solo agrega cosas encima
(nunca toca geometría, subjefes ni navegación). La regresión determinista (`tools/regression/t_det.js`)
ya no da igual que antes en esta arena **a propósito**: hay mecánicas nuevas. Si en el futuro se migra, basta con mover
sus bloques a `js/arenas/laberinto/` y registrar los mismos ganchos que usa La Fortaleza.

## Identidad propia (Alpha 0.1) — `js/arenas/laberinto/lab-seals.js` · "el Laberinto se resuelve"

| Mecánica | Qué hace |
|---|---|
| **Sellos I · II · III** | Desde el nivel 2 aparecen 3 placas numeradas, a 380+ u entre sí, en lugares libres de muros. Se activan con la acción contextual (◈, 1,1 s). |
| **En orden** | I → II → III antes de 40 s desde el primero: **el Laberinto cede**: la horda queda aturdida 1,5 s y lenta 6 s, el equipo se cura 15 % y cae una poción. |
| **Orden equivocado** | Rocas con aviso sobre ese sello y todo vuelve a cero. Si vence la ventana, vuelve a cero sin castigo. |
| **Ritmo** | Un juego nuevo cada 26-36 s; nunca con subjefe o jefe vivos. Cuenta regresiva bajo el jugador. |

- **Bots:** solo tocan el sello que sigue en el orden y llegan por el camino de la grilla de navegación (`ctxNavDir`), sin trabarse contra los muros.
- **Pruebas:** `LAB.*` en `t_identity.js`.
