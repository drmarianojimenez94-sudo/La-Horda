# Partidas simuladas por perfil: qué miden y qué no (2026-10)

`node tools/ux/playtest.js score` juega cada arena con tres perfiles guionados (aprendiz, ocasional, habitual) del piloto
automático (`tools/playtest/autopilot.js`). No son personas: los perfiles solo difieren en **cuándo esquivan** un aviso
(`skill`, `reaction`). Todo lo demás (kiting, habilidades, pociones, revivir) es igual.

## Experimento con la misma semilla (docs/ux/playtest-exp.json, no versionado)

`ARENAS=ciudad,fortaleza,bosque,hielo,laberinto,infernal SEEDS=3 SAME_SEED=1 CLASS=mago node tools/ux/playtest.js exp`

| Perfil | Victorias (Mago, misma semilla) |
|---|---|
| aprendiz | 9/18 |
| ocasional | 9/18 |
| habitual | 12/18 |

Conclusiones:
- La corrida de la tarjeta daba ocasional 16/30 < aprendiz 22/30. No era el juego: la semilla dependía del tiempo de
  reacción del perfil (cada perfil jugaba otra partida) y el habitual juega con Eren. Con la misma semilla y el mismo
  guardián, aprendiz y ocasional quedan iguales: **este piloto no distingue bien esos dos perfiles**. La métrica
  "la habilidad importa" de la tarjeta mide sobre todo ruido de semilla entre esos dos.
- Hecho real del juego: el Mago, al nivel esperado y **sin equipo**, gana ~50 % en Fortaleza, Bosque, Gélida e
  Infernal. Si eso es la dificultad buscada para Normal es una decisión de diseño (no se tocó el balance).

## Pendiente
- Un modelo de jugador más humano (uso de habilidades, puntería, pociones y posicionamiento distintos por perfil) para
  que los perfiles midan habilidad y no solo reflejos.
- Más semillas por casilla: con 3 la tasa por perfil tiene ±15 pp de error.
