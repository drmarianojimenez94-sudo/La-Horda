# Pruebas de La Fortaleza Sin Fin (herramienta de desarrollo, no es parte del juego)

```bash
python3 -m http.server 8771 &                       # desde la raíz del repo
(cd server && PORT=8799 node relay.js &)             # solo para las pruebas en red

node tools/fortaleza/t_fortaleza.js /tmp/fort        # 41 chequeos: geometría, puentes con gente encima,
                                                     # aislamiento y reconexión, fin de nivel con el puente
                                                     # moviéndose, puertas, 5 trampas, director, 6 enemigos,
                                                     # Dragón, Caballero (fases, puerta, rezagados), rendimiento
node tools/fortaleza/t_fortaleza_net.js 1 /tmp/fn    # cooperativo 2 jugadores (1 invitado)
node tools/fortaleza/t_fortaleza_net.js 3 /tmp/fn    # cooperativo 4 jugadores (3 invitados)
node tools/fortaleza/run_full.js 1 guerrero 1        # partida COMPLETA 1+3 bots, modo dios (¿se puede terminar?)
CLVL=20 node tools/fortaleza/run_full.js 0 guerrero 1  # partida completa real (sin ayudas)
node tools/fortaleza/compare.js fortaleza 10 100 1   # presión de oleadas vs otras arenas
node tools/fortaleza/smoke.js /tmp/fs                # capturas de cada sector
```

`sim-helpers.js` se inyecta en la página: detiene el loop real y avanza `update()` a mano
(sin dibujar), con un piloto automático que pelea y recorre la ruta del mapa sector por sector.
Mide: héroes/enemigos fuera de lo caminable, NaN, enemigos trabados, máximos de entidades,
trampas disparadas, reconfiguraciones, fases del Caballero, estados del Dragón y bots lejos.
