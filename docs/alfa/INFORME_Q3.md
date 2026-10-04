# Informe Q3 — Online y servidor (alfa Comic Con)

## En pocas palabras

**Guía para vos:** `docs/ALFA_PASOS_DEL_DUENO.md`, clic por clic: cómo comprobar el servidor, crear la
base de datos gratis, cargar **todas** las variables (con 4 especiales para el wifi de la Comic Con),
actualizar el servidor, mantenerlo despierto y qué hacer si algo falla ese día.

## Reparaciones ("antes pasaba X → ahora Y")

1. **Servidor reiniciado con amigos en la sala** → antes el invitado quedaba en una sala "fantasma": la
   pantalla de la Sala seguía igual pero ya no existía, y le aparecía "No existe ninguna sala con ese
   código. Revisá que esté bien escrito". **Ahora** sale de la sala con un aviso claro ("La sala ya no
   existe: el servidor se reinició o el anfitrión la cerró. Pedile al anfitrión el código nuevo") y el
   anfitrión lee "Se cortó la conexión con el servidor… Tocá «Crear sala online» para armar otra".
2. **Servidor reiniciado en plena partida** → antes el invitado veía la pantalla congelada, sin
   explicación, hasta 2 minutos, y a veces un cartel crudo "Error: NO_ROOM". **Ahora** ve "📡 Reconectando
   con la partida… (intento N de 8)" y, si la sala ya no existe, en segundos un cartel "El servidor se
   reinició" con el botón para volver al menú. El anfitrión sigue jugando (sus amigos pasan a bots).
3. **Anfitrión que bloquea el celular** → antes la pantalla del invitado se congelaba sin aviso.
   **Ahora** dice "⏳ Esperando al anfitrión… (su conexión está lenta o bloqueó el celular)".
4. **Despertar el servidor al abrir el juego** → estaba programado pero nunca corría (un detalle del
   reloj). **Ahora** el servidor empieza a despertar apenas se abre el juego, mientras el jugador elige.
5. **Servidor sin base de datos que se reinicia** → antes el jugador leía "Tu sesión venció, entrá de
   nuevo" y al entrar "Usuario o contraseña incorrectos" (porque su cuenta se había borrado). **Ahora** se
   explica: "El servidor de prueba se reinició y borró las cuentas. Tu progreso sigue en este
   dispositivo: creá la cuenta de nuevo (con el mismo nombre) y se sube sola."
6. **Servidor viejo (sin actualizar)** → antes: errores rojos en la consola, "Sin conexión con el
   servidor" engañoso en cuentas, "No existe." en el ranking, y la oferta de intercambio quedaba para
   siempre en "Esperando que acepte…" con Cancelar apagado. **Ahora** cada cosa dice "todavía no está
   disponible en el servidor", sin errores, y el resto (salas, partida) anda.
7. **Ranking y salas abiertas con el servidor dormido** → antes "Sin conexión" a los 12–30 s. **Ahora**
   "Despertando el servidor… (la primera vez puede tardar hasta un minuto)" y espera lo necesario.
8. **Wifi compartido de la Comic Con** → el servidor frena "por dirección de Internet" y en un evento
   todos comparten una. En Fly.io (servidor principal) además el servidor no veía la dirección real de
   nadie: todos los jugadores del mundo compartían el mismo cupo. **Ahora** lee la dirección real
   automáticamente en Fly.io y Render, y los cupos se pueden subir con variables (en la guía).
9. **Página principal (fondalstudios.com) rechazada** → si el servidor tenía una lista vieja de páginas
   permitidas, "Crear sala" fallaba desde la Alpha principal. **Ahora** esa página se acepta siempre.
11. **Pruebas automáticas de cuentas y ranking que fallaban en main** → no eran bugs del juego: (a) el
    alfa ahora obliga al entrenamiento la primera vez y las pruebas no lo marcaban como hecho (por eso
    "B quedaba en Entrando…": en realidad estaba en el entrenamiento); (b) las cuentas ahora se guardan
    por servidor y la prueba del ranking usaba la clave vieja (todos quedaban como invitados: tabla
    vacía). Se actualizaron esas pruebas y las demás del online con el mismo detalle.
10. **Servidor con disco persistente (Fly.io)** → decía "sin base de datos" aunque guardara bien, y el
    juego avisaba "servidor de prueba". **Ahora** se declara con `DATA_PERSISTENT=1` (en Fly.io se asume).

## Pendiente (y por qué)

- **No pude entrar a Render, Fly.io ni a los servidores reales** desde esta máquina: la guía está
  basada en el código. Que el servidor principal responda en `…/la-horda/red/api/health` está
  **NO VERIFICADO EN RUNTIME**.
- Si el anfitrión pierde la conexión, la sala se cierra para todos (el servidor no le guarda el lugar al
  anfitrión como a los invitados). Cambiarlo es un sistema nuevo: no para mañana.
- `tools/net-test/accounts.js` falló 1 vez de 3 en "beacon.sin_conflicto_falso_al_volver" (al volver,
  el juego mostró la elección del regalo inicial en vez del menú). No pude reproducirlo de nuevo; dejé la
  prueba anotando qué guardianes y regalo tenía para encontrar la causa si se repite.
- Un jugador con progreso viejo en la nube que entra desde un celular nuevo es mandado al entrenamiento
  obligatorio (lo puede saltear). Es decisión del onboarding (Q1), no del online.

## Pruebas corridas

Sobre la base integrada final (rama de integración + main ff9054d):
- Servidor, sin navegador: `server/test-relay.js`, `test-accounts.js`, `test-trades.js`,
  `test-game-master.js` (127), `test-owner-policy.js`, `test-founders.js` (106), `test-presence.js`,
  `test-admin.js`, `test-owner-recovery.js`, `tools/alpha/account-environments.js`,
  `tools/alpha/services-test.js`: **todas OK**.

Con navegadores (celular 844×390 táctil, relay real), sobre main mergeado (antes del último merge de
integración, que no tocó el online):
- `tools/net-test/server_restart.js` (nueva: servidor dormido 15 s, reinicio en la sala, reinicio en
  partida, SOLO sin servidor): **OK**.
- `tools/net-test/old_server.js` (nueva: relays viejos v0 y v1 sacados del historial): **OK** (v0 y v1).
- `tools/net-test/leaderboard.js`: **OK** (antes 12 fallas: era la prueba).
- `tools/net-test/accounts.js`: **OK** en 2 de 3 corridas; 1 falla intermitente (ver Pendiente).
- `disconnect.js`, `coldstart.js`, `e2e.js 2`: OK antes del merge con main.

**NO pude correr** `e2e.js 2/4`, `public_rooms`, `trade` sobre la base integrada final: la máquina
compartida se quedó sin memoria (16 GB usados por los 7 equipos, carga 40–150 sobre 4 núcleos; ni
`node -e "console.log(1)"` arrancaba en 100 s y el sistema mató mi relay). Esas pruebas quedaron
actualizadas (marcan el entrenamiento hecho) y hay que correrlas cuando la máquina esté libre:
`bash` con `SITE=… RELAY=… node tools/net-test/e2e.js 2` (ver tools/net-test/README.md).

## Nota de mi área para el alfa: 7/10

Lo que se juega (crear sala, unirse, jugar, reconectar) es sólido y ahora los cortes del servidor se
explican bien. Resta: el servidor real no lo pude verificar y depende de que la base de datos y las
variables del evento estén cargadas.

## Detalle técnico

- `js/net/net-core.js`: `joinSeq` + `_awaitingJoin` (la reconexión espera un `joined` nuevo);
  `NET_ROOM_GONE`/`_netGiveUp("room_gone")`; NO_ROOM no es error de sala; `netCaps`/`netCapsProbe`
  (/health dice si hay /api); `_netWarmAt = -1e9`.
- `js/net/net-lobby.js`: `netClosedText(reason, role)`.
- `js/net/net-game.js`: `netMatch.lastRxAt`, `netConnRefresh` (#net-conn); cartel "El servidor se
  reinició". `css/menus.css`: estilo de #net-conn.
- `js/net/account.js`: `NO_API` sin pedir; `ACCOUNT_RESET_MSG`; pista en BAD_CREDENTIALS sin base.
- `js/net/leaderboard.js`, `js/net/net-rooms.js`, `js/net/net-trade.js`: servidor viejo, despertando.
- `server/accounts.js`: `DATA_PERSISTENT`/`filePersistent()`, `API_MAX_IP`, TRUST_PROXY automático en
  Fly.io, `fly-client-ip`, `clientIp` exportado. `server/relay.js`: `ROOMS_MAX_IP`, IP real en
  /api/rooms, fondalstudios.com en ALWAYS_ALLOWED. `render.yaml`: ALLOWED_ORIGINS.
