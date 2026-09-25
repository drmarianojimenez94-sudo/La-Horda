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
