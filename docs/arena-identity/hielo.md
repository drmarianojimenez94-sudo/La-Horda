# Arena de Hielo

- **Lugar en la campaña:** 5ª (desde que llegó el Reino Micelial)
- **Roster:** Lobo Ártico → Gólem de Hielo → Dragoncito → Ángel de Hielo → Demonio de Hielo y Fuego
- **Subjefe:** Tundraverx, Dragón de Hielo (nivel 6)
- **Jefe:** Mago de Hielo y Cristal → Ángel Caído (2 fases)
- **Peligro propio:** Nova gélida, escarcha acumulable
- **Regla creciente:** Frío Creciente
- **Código propio:** bloques en `update.js`, `boss-skills.js` (Muro de Hielo), `aidBuildHielo`

Esta arena usa el camino de siempre del motor (bloques por arena dentro de los archivos comunes):
no se migró al registro `ARENA_DEFS` para no arriesgar su comportamiento. Desde Alpha 0.1 su
**identidad propia** vive en una **extensión** (`ARENA_EXT`, ver abajo) que solo agrega cosas encima
(nunca toca geometría, subjefes ni navegación). La regresión determinista (`tools/regression/t_det.js`)
ya no da igual que antes en esta arena **a propósito**: hay mecánicas nuevas. Si en el futuro se migra, basta con mover
sus bloques a `js/arenas/hielo/` y registrar los mismos ganchos que usa La Fortaleza.

## Modificación futura (anotada, todavía NO implementada)

- **El Hielo es la "pared" de la campaña:** en las pruebas con jugadores reales es donde se
  acumulan muchas derrotas seguidas. Revisar su curva (roster, Nova gélida, Frío Creciente,
  jefe en 2 fases) para que siga siendo un salto de dificultad sin volverse un muro. Pendiente
  de definir con el diseño.

## Identidad propia (Alpha 0.1) — `js/arenas/hielo/hie-cold.js` · "moverse es sobrevivir"

| Mecánica | Qué hace |
|---|---|
| **Frío por quietud** | Tras 1 s quieto (menos de 30 u/s) el medidor sube 10/s (× regla Frío Creciente, +3 % por carga; ×0,6 en el nivel 1); moverse lo baja 22/s. Lleno → **una carga de escarcha** y vuelve a 45. El frío **solo** llega hasta 2 cargas (30 % de lentitud): nunca congela por sí mismo; congelar lo terminan los enemigos. |
| **Braseros** | 4 fijos en el anillo interior con zona de calor visible (150 u): el frío baja 65/s y la escarcha se derrite el doble de rápido. Duran 48-64 s y se **apagan**. |
| **Encender** | Acción contextual (🔥, 1,4 s) o **fuego**: un Muro de Fuego, un proyectil que quema o el Cataclismo cerca lo prenden al instante. |
| **Legibilidad** | Escarcha que crece a los pies, medidor ❄ sobre el jugador, borde de pantalla helado con mucho frío, zona de calor punteada que parpadea antes de apagarse. |

- **Bots:** con frío se mueven en círculo alrededor de su objetivo o van al brasero encendido (gancho `botNudge`); encienden braseros si al equipo le hace falta.
- **Red:** estado de braseros y frío de cada héroe en `hieNetState()`.
- **Pruebas:** `HIE.*`, `ENV.muro_de_fuego_enciende_el_brasero` y `ARENA=hielo t_identity_net.js`.
- Ver "Modificación futura" arriba: la pared de dificultad sigue siendo un tema de balance abierto (ver `LA_HORDA_PLAYTEST_REPORT.md`).
- **Calibración:** la primera versión (13/s, congelaba sola, braseros de 38-52 s) hizo del Hielo un muro todavía peor en la campaña simulada (Cazadora: 22 intentos contra 9 antes). Se suavizó a los valores de arriba. Ver `LA_HORDA_PLAYTEST_REPORT.md`.
