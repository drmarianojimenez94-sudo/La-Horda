# Pruebas del multijugador cooperativo (B1)

Clientes de Chromium **independientes** (cada uno con su propio guardado y su propia conexión)
contra el servidor real `server/relay.js`, todo en esta máquina.

```bash
python3 -m http.server 8771 &                       # el juego (desde la raíz del repo)
(cd server && npm install && PORT=8799 node relay.js &)
node server/test-relay.js                           # protocolo del servidor (sin navegador)
node server/test-accounts.js                        # CUENTAS: API /api (registro, login, límite, guardado con versión)
SITE=http://127.0.0.1:8771 RELAY_PORT=8812 node tools/net-test/accounts.js
                                                    # CUENTAS en navegadores (levanta su propio servidor): invitado sin red,
                                                    #   crear cuenta, sesión recordada, sync entre dos navegadores, conflicto,
                                                    #   clave incorrecta, límite de intentos, cola sin conexión, beacon al cerrar
SITE=http://127.0.0.1:8771 RELAY_PORT=8812 node tools/net-test/leaderboard.js
                                                    # RANKING SEMANAL de la Horda Infinita (levanta su propio servidor): invitado
                                                    #   ve la tabla y su récord queda local, puesto en resultados, orden y filtro por
                                                    #   guardián, puntaje imposible rechazado, pendiente sin conexión, recompensa
node tools/net-test/e2e.js 1                        # solo (1 humano + 3 bots)
node tools/net-test/e2e.js 2                        # 2 humanos + 2 bots
node tools/net-test/e2e.js 3                        # 3 humanos + 1 bot
node tools/net-test/e2e.js 4 --fifth                # 4 humanos y un 5º rechazado (SALA COMPLETA)
node tools/net-test/disconnect.js                   # caída/reconexión, abandono, anfitrión que se va
node tools/net-test/campaign-gate.js                # la campaña no se saltea con salas online
SITE=http://127.0.0.1:8771 RELAY=ws://127.0.0.1:8799 node tools/net-test/next_arena.js
                                                    # siguiente arena sin salir de la Sala: victoria -> misma sala con la
                                                    #   próxima arena elegida, el anfitrión la cambia en la Sala y el invitado
                                                    #   la ve en vivo (aviso si no le cuenta para la campaña); y solo
node tools/net-test/loop.js 3                       # PLAYTEST V1 (P0): ciclo completo con 4 jugadores:
                                                    #   campeón de regalo, Arena -> Sala -> Unirse pegando enlace/código,
                                                    #   campeón en la sala, REVIVE 1-5, team wipe ->
                                                    #   misma sala, reintentar x3 sin degradación
node tools/net-test/lobby_code_skins.js desktop     # PRE-ALFA: A crea sala (escritorio) · B en iPhone horizontal:
node tools/net-test/lobby_code_skins.js mobile      #   UNIRSE CON CÓDIGO (validación, inexistente, llena), COPIAR CÓDIGO,
                                                    #   sin bucle de re-render, scroll táctil (Sala, Tienda, Inventario,
                                                    #   selección, modales), skin comprada autoequipada y visible para
                                                    #   todos, partida, revivir, reconexión, recarga, enlace
node tools/net-test/soak.js 60 laberinto nigromante,musashi,axiom,profeta   # resistencia
BOSS=1 node tools/net-test/soak.js 25 hielo musashi,profeta                 # jefes
node tools/net-test/shots.js /tmp/capturas          # capturas anfitrión / invitado
```

Latencia de Internet simulada: `PORT=8798 SIM_LATENCY_MS=120 node server/relay.js` y
`RELAY=ws://127.0.0.1:8798 node tools/net-test/e2e.js 3`.
