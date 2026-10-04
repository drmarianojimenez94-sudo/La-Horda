# Balance del botín, la calificación y los sets (herramienta de desarrollo)

No forma parte del juego. Corre el código REAL del juego en Chromium (Playwright) para medir.
Servir el repo (`python3 -m http.server 8000`) y opcionalmente `GAME_URL=http://127.0.0.1:8000/index.html`.

- `node lootsim.js [N]` — Monte Carlo del botín con `rollLoot()` (con protección contra la mala
  suerte activa): por arena × calificación, objetos por victoria, % por categoría, probabilidad
  de al menos un Legendario/Set/Mítico por victoria; y un jugador que "farmea" cada arena:
  victorias hasta el primer Legendario/Set/Mítico y hasta completar un set (con reforja).
- `node perfsim.js <campeón,campeón,...> <arena> <nivel>` — partidas completas con el piloto
  automático; califica a los 4 héroes (para ver que ningún rol tenga ventaja estructural).
- `node settest.js` — equipa cada set completo y verifica en combate que su comportamiento se
  dispara (fragmentos, onda, tormenta, frenesí, juramento, amanecer, presa, resonancia, impulso…).

Tablas que se tocan: `js/data/loot.js` (botín), `js/systems/performance.js` (calificación),
`js/data/sets.js` + `js/systems/set-effects.js` (sets).
- `node campaign_runs.js [arenas|todas] [clase] > runs.jsonl` — una partida por arena de la campaña con el
  piloto automático (jugador invulnerable, declarado) al nivel de entrada esperado: bajas por rango, élites
  con nombre, XP de bajas, XP de victoria, oro peleando y botín del piso.
- `RUNS=runs.jsonl node groundloot_econ.js x 3000` — Monte Carlo del botín del piso y del cofre con esas
  bajas: objetos por partida, legendarios que cambian la build y venta / oro peleando (objetivo <= 15 %).
- `RUNS=runs.jsonl node xp_curve.js` — curva de la campaña con la XP de victoria vieja y la nueva
  (`victoryXpFor`, js/systems/progression.js): nivel al terminar cada arena y niveles que da la victoria.
- `node q4_econ.js [raíz=repo] [N]` — economía del alfa (Q4) sin partidas, sirviendo el árbol desde el disco (sirve
  para medir un árbol viejo extraído de otro commit): qué cae por arena y por fuente, nivel de objeto, primeras
  mejoras de un perfil nuevo (con y sin el set regalado), set regalado vs. botín de 3 arenas, oro de la primera
  partida y de crucero por fuente, y partidas para comprar cada cosa de la tienda. Números: `docs/alfa/q4_economia.md`.
