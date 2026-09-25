# LA HORDA — B1 COOPERATIVE PLAYTEST

Primer multijugador cooperativo real: de 1 a 4 humanos en la misma partida, siempre 4
integrantes (los lugares libres los ocupan bots).

## Cómo se juega

1. MODO DE JUEGO → ARENA → elegís una arena **desbloqueada** → elegís campeón → **PRE-SALA**.
2. En la pre-sala preparás tu equipo (Equipamiento / Talentos / Habilidades: es el inventario
   real, lo que cambiás ahí es con lo que entrás).
3. **🌐 Crear sala online** → aparece el código (ej. `SALA QKL58J`) y **📋 Copiar enlace** /
   **📨 Invitar** (en iPhone abre el menú para compartir por WhatsApp).
4. Tu amigo abre el enlace → pone su nombre → **Unirse** → entra directo a TU pre-sala (la arena
   es la tuya). Prepara su equipo y marca **LISTO**.
5. Ves a cada amigo aparecer en su lugar en tiempo real (nombre, campeón, nivel, estado).
6. **Comenzar** cuando quieras: los lugares vacíos pasan a ser bots. Todos entran a la misma
   arena.

Sin crear sala, la pre-sala funciona igual que antes (vos + 3 bots) y no necesita Internet.

## Arquitectura (decisión y por qué)

**Anfitrión autoritativo + servidor relay WebSocket liviano.**

| Opción | Por qué no / por qué sí |
|---|---|
| WebRTC (P2P) | Con datos móviles (iPhone en 4G/5G) el NAT de la operadora casi siempre obliga a usar un servidor TURN, que cuesta y necesita credenciales; además igual hace falta un servidor de señalización. Más piezas, más fallas. |
| Lockstep determinista | El motor usa `Math.random` y trigonometría del navegador en todos lados: Safari y Chrome no dan exactamente los mismos números → desincronización. |
| **WebSocket relay + anfitrión autoritativo** ✔ | Una conexión `wss://` por el puerto 443 funciona en cualquier red (incluido iPhone con datos). El servidor es chico, sin estado de juego, sin base de datos ni secretos. El motor existente se reutiliza tal cual en el anfitrión. |

- `server/relay.js` (Node + `ws`): salas de hasta **4 humanos**, código corto, lugar 0 =
  anfitrión, estado de cada integrante (nombre, campeón, listo, conectado), **SALA COMPLETA** al
  5º, sala cerrada a nuevos al comenzar, reconexión al mismo lugar, reenvío de mensajes.
- **Una sola partida**: la simula el navegador del anfitrión (enemigos, oleadas, bots, daño,
  jefes y fases, victoria/derrota). Los héroes de los invitados son héroes normales que se
  mueven con la posición que reporta su dueño (validada: velocidad máxima, aturdido, etc.) y
  lanzan sus habilidades con **el mismo código** que el jugador local.
- Los invitados mandan **intenciones** (mover, básico, habilidad con su apuntado, ulti, carga de
  Sylva, revivir, subir habilidad, elegir refuerzo) y reciben ~15 veces por segundo un
  **snapshot con deltas** (solo lo que cambió: ~1,6–2,5 KB en pelea). Predicen su propio
  movimiento (responde al instante) e interpolan lo ajeno. Los efectos visuales, textos y
  sonidos del anfitrión se repiten en cada invitado.
- El escenario (muros del Laberinto, decorados) sale de una **semilla compartida**: idéntico.

## Reglas cooperativas

- **Fuego amigo apagado** en la Arena PvE (`MODE_RULES.arena_pve.friendlyFire = false`):
  ni básicos, proyectiles, áreas, invocaciones ni efectos de un aliado dañan a otro aliado.
  Curas, escudos, buffs y revivir no se tocan. Un modo PvP futuro solo cambia esa bandera.
- Caer no termina la partida mientras quede un humano en pie: te pueden revivir (humanos o
  bots). La derrota es cuando caen **todos los humanos**.
- Entre niveles **cada humano elige su refuerzo** (30 s; si no elige, uno automático).
- **Progresión de cada uno en su propio guardado**: XP y oro de lo que vos rematás, XP del
  fin de nivel, botín, bonus y castigo de derrota se aplican en tu dispositivo. El anfitrión
  nunca guarda datos de un invitado.
- **Campaña**: una partida nueva solo tiene abierta Ruinas del Bosque; cada arena se abre al
  superar la anterior (`ARENA_ORDER`). El anfitrión solo puede crear salas para arenas que
  tiene abiertas. Un invitado puede sumarse a la arena de un amigo, pero la victoria solo le
  cuenta como "superada" si él ya la tenía abierta (el multijugador no saltea la campaña).
- Cada humano usa un campeón distinto (si se repite, no se puede comenzar).
- En partida online **no hay pausa**: el menú se abre encima y la partida sigue.

## Desconexiones

- Invitado que pierde la conexión: un bot toma su héroe; el juego reintenta solo y, al volver,
  recupera el control en el mismo lugar (el servidor le guarda el lugar 3 minutos).
- Invitado que abandona: su héroe queda como bot hasta el final (él recibe el castigo de
  abandono en su guardado, como siempre).
- Anfitrión que se va: la partida termina para todos de forma segura ("El anfitrión se
  desconectó"), sin castigo; la XP ya ganada queda guardada. (No hay migración de anfitrión.)
- Si el anfitrión pierde la conexión al servidor, sigue jugando solo con bots.

## Panel de desarrollo

Botón **B1** arriba al centro (o `?debug=1` en la URL): sala, rol/lugar, conexión y ping,
humanos/bots, arena, nivel, entidades sincronizadas y tamaño del snapshot, reintentos, errores
y registro de eventos (ROOM_CREATED, ROOM_JOINED, ROOM_FULL, PLAYER_CONNECTED, PLAYER_READY,
PLAYER_DISCONNECTED, GAME_START, NETWORK_ERROR, RECONNECT...).

## Configuración

`js/net/net-config.js` → `serverUrl` (pública, sin secretos). Mientras esté vacía el modo
online aparece como "no configurado" y todo lo demás funciona igual. Para probar sin tocar
el archivo: agregar `?server=wss://...` a la URL del juego (los enlaces de invitación lo
copian solos).

## Desplegar el servidor (Render, plan gratuito)

1. Crear cuenta en https://render.com (se puede entrar con GitHub).
2. **New → Blueprint** → conectar el repositorio `La-Horda` → Render lee `render.yaml` y
   propone el servicio `la-horda-relay` (plan **Free**, carpeta `server/`).
3. **Apply**. Al terminar, el servicio tiene una dirección tipo
   `https://la-horda-relay.onrender.com` (abrirla debe decir `LA HORDA relay OK`).
4. La dirección del juego es la misma cambiando `https://` por `wss://`.

Plan gratuito: sin costo; se "duerme" tras 15 minutos sin uso y tarda ~1 minuto en despertar
(el juego lo despierta solo al entrar a la pre-sala y espera hasta 75 s al conectar); 750
horas de instancia por mes por workspace.

## Pruebas

Ver `tools/net-test/README.md` (1–4 humanos, 5º rechazado, desconexiones, campaña,
resistencia, jefes, latencia simulada). Lo que **no** se puede probar desde el entorno de
desarrollo: dispositivos reales en redes distintas (ver "Prueba manual" abajo).

## Prueba manual pendiente (dispositivos reales)

1. iPhone A con WiFi y teléfono B con datos móviles (redes distintas).
2. A: crear sala en Ruinas del Bosque, copiar enlace, mandarlo por WhatsApp.
3. B: abrir el enlace, unirse, marcar LISTO. A: ver a B en el lugar 2, comenzar.
4. Moverse los dos, usar habilidades, dejarse caer y revivirse, pasar de nivel (cada uno elige
   refuerzo), llegar al jefe y terminar la partida. Anotar el ping del panel B1.
