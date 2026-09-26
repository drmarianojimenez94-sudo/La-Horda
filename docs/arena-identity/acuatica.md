# Arena Acuática

- **Lugar en la campaña:** 2ª
- **Roster:** Tiburón Joven → Medusa Eléctrica → Cangrejo Acorazado → Sirena Abisal → Anguila → Tiburón Blanco (élite)
- **Subjefe:** Kraken Joven (nivel 6)
- **Jefe:** Leviatán (3 vidas, ronda el borde)
- **Peligro propio:** Corriente Profunda (empuja, no daña)
- **Regla creciente:** Presión Abisal
- **Código propio:** `js/arenas/acuatica.js`, bloques por tipo en `update.js`, `spawnPoolForAcuatica`

Esta arena usa el camino de siempre del motor (bloques por arena dentro de los archivos comunes):
no se migró al registro `ARENA_DEFS` para no arriesgar su comportamiento. Desde Alpha 0.1 su
**identidad propia** vive en una **extensión** (`ARENA_EXT`, ver abajo) que solo agrega cosas encima
(nunca toca geometría, subjefes ni navegación). La regresión determinista (`tools/regression/t_det.js`)
ya no da igual que antes en esta arena **a propósito**: hay mecánicas nuevas. Si en el futuro se migra, basta con mover
sus bloques a `js/arenas/acuatica/` y registrar los mismos ganchos que usa La Fortaleza.

## Identidad propia (Alpha 0.1) — `js/arenas/acuatica/acu-currents.js` · "el agua decide hacia dónde vas"

| Zona | Qué hace | Desde |
|---|---|---|
| **Lineal** | Franja (440×110) que arrastra a 78 u/s en una dirección (chevrones animados). | nivel 1 |
| **Remolino** | Tira hacia el centro girando (r 150). | nivel 2 |
| **Charco conductor** | Cada 7,5-10,5 s avisa (círculo amarillo, 1,2 s) y descarga: héroes 5 % de vida + lentitud; enemigos 12 % + aturdimiento (jefe 1,5 %). La Cadena Eléctrica de la anguila salta más lejos si el primer golpeado está en un charco. Un **rayo** del Mago sobre un enemigo en el charco lo descarga contra los enemigos. | nivel 3 |
| **Anillo** | Corriente circular alrededor del centro de la arena. | nivel 4 |
| **Chorro** | Boca que avisa (línea, 1,1 s) y empuja 150 u a todo lo que esté en la línea. | nivel 5 |

- Las corrientes empujan **héroes y enemigos** (enemigos al 60 %; jefes/subjefes no). La disposición cambia en cada nivel.
- **Red:** el invitado aplica las corrientes a su propio campeón (predicción) y el anfitrión no lo corrige a cada cuadro. Esto también arregla la Corriente Profunda de siempre, que antes generaba correcciones en cadena en los invitados.
- **Bots:** evitan el ojo del remolino; los avisos de chorros y charcos ya los esquivan.
- **Pruebas:** `ACU.*`, `ENV.cadena_de_relampago_conduce_en_el_charco` y `ARENA=acuatica t_identity_net.js`.
- **Divergencia (anotada):** el documento pone al Kraken como jefe; el juego lo tiene como subjefe (Leviatán es el jefe). No se cambió.
