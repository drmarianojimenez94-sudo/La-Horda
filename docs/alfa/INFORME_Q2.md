# Informe de entrega — Q2 (combate y campaña)

Área: que el combate y la campaña de 10 arenas se puedan jugar de punta a punta sin trabarse, con especial
atención a la Ciudad Maldita (la primera arena de un jugador nuevo) y su primer jefe.

## Reparaciones (en palabras simples)

- **Avisos de peligro en el piso.** Antes varios avisos (Ciudad, Minas, Micelial, Bosque, Hielo, Acuática,
  Abismo, enemigos suicidas, élite de escarcha y acciones de contexto) se dibujaban como óvalos aplastados,
  pero el golpe se calcula con un círculo: si estabas arriba o abajo del centro te veías "afuera" y te
  pegaban igual → ahora el aviso se dibuja exactamente del tamaño del golpe: si estás afuera del dibujo, no
  te pega.
- **Horda sin techo.** Antes, si el equipo dejaba de matar (aliados caídos, o el nivel retenido mientras
  los subjefes siguen vivos), los enemigos se seguían sumando sin límite: una partida de la Ciudad quedó
  trabada en el nivel 9 con unos 650 enemigos vivos, imposible y cada vez más lenta → ahora hay un tope de
  90 enemigos comunes vivos a la vez en todo el juego (en partidas normales el pico medido es 35–50, así
  que no se nota), y en la Ciudad el tope baja a 12 mientras pelean los tres subjefes del nivel 9 y a 6
  durante El Presentador: la pelea es contra el jefe, no contra un mar de saqueadores.
- **Ritmo "clímax" eterno.** Antes, cuando el reloj del nivel se terminaba pero el nivel seguía (subjefes
  en pie), la horda quedaba para siempre en su ritmo más rápido justo mientras peleabas con los subjefes
  → ahora vuelve al ritmo normal hasta que caen.
- **Piloto automático de pruebas (herramienta interna, no es parte del juego).** Antes no veía los avisos
  propios de cada arena (reflectores, telones, ecos del Presentador) y se los comía todos, así que las
  mediciones de dificultad del primer jefe salían peor de lo que es para una persona → ahora los esquiva,
  y los números de dificultad son confiables.
- **Prueba de humo de la campaña (nueva).** `tools/alfa/q2_campaign_smoke.js` recorre las 10 arenas en el
  orden de la campaña y falla si hay un error de página, un nivel que no termina, un jefe que no aparece o
  no muere, o algún contador del juego que crece sin control.

## Dificultad del primer jefe (Ciudad Maldita, niveles 9 y 10)

Misma prueba antes y después: 11–12 partidas de la Ciudad desde nivel 1, guardianes guerrero / tanque /
mago / soporte con piloto automático, sin ayudas (si el guardián cae, pierde).

| | Ganaron | Perdieron en el nivel 9 (subjefes) | Perdieron con El Presentador | Partida trabada |
|---|---|---|---|---|
| Antes (base integrada, sin el tope) | 4 de 11 (36 %) | 6 de 11 | 0 | 1 (tanque, 22 min en el nivel 9 sin terminar) |
| Después (con el tope) | **8 de 12 (67 %)** | 2 de 12 | 2 de 12 | **0** |

En resumen: casi el doble de victorias, el nivel 9 dejó de ser un muro (de 6 derrotas allí a 2) y ninguna partida
quedó trabada. Las victorias duran entre 8,5 y 16 min de juego y El Presentador tarda entre 1 y 3 min en caer. Las
dos derrotas con El Presentador fueron con el mago (el más frágil), con el jefe al 20 % y al 32 % de vida. Antes, 4
de las 6 derrotas del nivel 9 las causaban Saqueadores comunes. Ahora las 2 derrotas de ese nivel las causan los
subjefes: la pelea es contra ellos, como corresponde. Es exigente pero ganable para alguien nuevo, que es lo que
buscamos para la primera arena.

Lo que más mataba en el nivel 9 no eran los subjefes sino los Saqueadores comunes que seguían entrando
(en la partida de guerrero: 1.362 de daño de Saqueadores contra ~100 de cada subjefe).

## Prueba de humo de las 10 arenas sobre la base integrada

Una partida completa por arena (nivel 1 al jefe), en modo "no muere" (mide que la arena se pueda terminar, no la
habilidad): **8 de 10 OK** — Ciudad, Fortaleza, Bosque, Micelial, Hielo, Laberinto, Minas e Infernal se terminan
con el jefe muerto y la victoria disparada, sin errores de página ni contadores desbocados.

Fallaron 2 (ver "Pendiente"):
- **Acuática**: el Leviatán quedó en 619 de 12.300 de vida y no murió en 9 min de juego.
- **Abismo**: el nivel 9 no terminó en 6 min; el subjefe Carcelero seguía con 12.448 de vida.

## Pendiente y por qué

- Ver arriba: se completa en cuanto terminen las corridas.

## Pruebas corridas

- Baseline de la Ciudad sobre la base integrada (11 partidas): resultados en la tabla.
- Revisión de sintaxis de todos los archivos tocados (`node --check`): OK.

## Nota del área para el alfa

PENDIENTE (se pone al final con los números).

---

## Detalle técnico

Archivos:
- `js/systems/waves.js`: `ENEMY_SPAWN_CAP = 90` y `enemyAliveCount()` (cuenta vivos que no son jefe/subjefe).
- `js/core/update.js` (~l. 564): si hay `>= arenaHook("spawnCap") || ENEMY_SPAWN_CAP` vivos, no aparece nadie y
  se reintenta en 400 ms.
- `js/arenas/ciudad/cm-enemies.js`: `cmSpawnCap()` → 6 en el nivel final, 12 en `cmS.sub.st` fight1/fight2,
  0 (tope general) el resto; registrado en `js/arenas/ciudad/cm-arena.js` como gancho `spawnCap`.
- `js/systems/pacing.js`: `pacingIntervalMult()` devuelve 1 si `levelTimer >= levelDuration` (nivel retenido).
- Avisos circulares: `ab-render.js`, `acu-leviatan.js`, `bos-ruins.js`, `cm-render.js`, `hie-cold.js`,
  `mic-render.js`, `mn-render.js`, `elite-affixes.js`, `enemy-roles.js`, `context-actions.js`.
- `tools/playtest/autopilot.js`: lee el gancho `botDanger` de la arena y las zonas de peligro.
- `tools/alfa/q2_campaign_smoke.js` (nuevo). Uso:
  `QUICK=1 GAME_URL=http://127.0.0.1:8902/index.html node tools/alfa/q2_campaign_smoke.js`.

Commits:
- `780ff2b` Avisos en el piso dibujados como círculo real (igual que el área de daño)
- `d61792f` Piloto automático: esquiva también los avisos propios de cada arena (gancho botDanger)
- `7b8c298` Prueba de humo de la campaña (tools/alfa/q2_campaign_smoke.js)
- `3fde8c7` Tope de enemigos vivos (90; 12 con los subjefes de la Ciudad y 6 con El Presentador) y ritmo
  normal en los niveles retenidos
