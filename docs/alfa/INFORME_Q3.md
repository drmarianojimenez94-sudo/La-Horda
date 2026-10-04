# Informe Q3 — Online y servidor (alfa Comic Con)

## En pocas palabras

- **Guía para vos, clic por clic:** `docs/ALFA_PASOS_DEL_DUENO.md`. Cómo comprobar el servidor, crear la
  base de datos gratis, cargar **todas** las variables del servidor (incluidas 4 especiales para el wifi
  de la Comic Con), actualizar el servidor, mantenerlo despierto y qué hacer si algo falla ese día.
- **Ojo:** el juego publicado hoy usa el servidor **Fondal** (`fondalstudios.com`, alojado en Fly.io), no
  el de Render; Render quedó como "servidor anterior". La guía explica los dos.
- Lo más importante antes del evento: abrir `https://fondalstudios.com/la-horda/red/api/health` y ver
  `"persistent":true`, y cargar las variables del evento (paso B.3 de la guía).

## Reparaciones ("antes pasaba X → ahora Y")

1. **El servidor se reinicia con amigos en la Sala** → antes el invitado quedaba en una sala "fantasma"
   (la pantalla seguía igual pero la sala ya no existía) con el cartel "No existe ninguna sala con ese
   código. Revisá que esté bien escrito". **Ahora** sale con un aviso claro ("La sala ya no existe: el
   servidor se reinició o el anfitrión la cerró. Pedile al anfitrión el código nuevo") y el anfitrión lee
   "Se cortó la conexión con el servidor… Tocá «Crear sala online» para armar otra".
2. **El servidor se reinicia en plena partida** → antes el invitado veía la pantalla congelada, sin
   explicación, hasta 2 minutos, y a veces "Error: NO_ROOM". **Ahora** ve "📡 Reconectando con la partida…
   (intento N de 8)" y, en segundos, "El servidor se reinició" con el botón al menú. El anfitrión sigue
   jugando (sus amigos pasan a bots).
3. **El anfitrión bloquea el celular** → antes la pantalla del invitado se congelaba sin aviso. **Ahora**
   dice "⏳ Esperando al anfitrión… (su conexión está lenta o bloqueó el celular)".
4. **Despertar el servidor al abrir el juego** → estaba programado pero nunca corría. **Ahora** el servidor
   empieza a despertar apenas se abre el juego, mientras el jugador elige.
5. **Servidor sin base de datos que se reinicia** → antes: "Tu sesión venció, entrá de nuevo" y al entrar
   "Usuario o contraseña incorrectos" (su cuenta se había borrado). **Ahora** se explica: "El servidor de
   prueba se reinició y borró las cuentas. Tu progreso sigue en este dispositivo: creá la cuenta de nuevo
   (con el mismo nombre) y se sube sola."
6. **Servidor viejo (sin actualizar)** → antes: errores rojos en la consola, "Sin conexión" engañoso en
   cuentas, "No existe." en el ranking y la oferta de intercambio colgada para siempre en "Esperando que
   acepte…" con Cancelar apagado. **Ahora** cada cosa dice "todavía no está disponible en el servidor", sin
   errores, y el resto (salas, partida) anda.
7. **Ranking y salas abiertas con el servidor dormido** → antes "Sin conexión" a los 12–30 s. **Ahora**
   "Despertando el servidor… (la primera vez puede tardar hasta un minuto)" y espera lo necesario.
8. **Wifi compartido de la Comic Con** → el servidor frena "por dirección de Internet" y en un evento todos
   comparten una (con lo normal, después de 10 cuentas nuevas en una hora nadie más podía crear cuenta).
   Además, en Fly.io el servidor no veía la dirección real de nadie: **todos los jugadores del mundo**
   compartían el mismo cupo, y la lista de "Salas abiertas" tampoco la veía en Render. **Ahora** lee la
   dirección real en Fly.io y Render, y los cupos se suben con variables (guía, B.3).
9. **La Alpha principal (fondalstudios.com) rechazada** → con una lista vieja de páginas permitidas,
   "Crear sala" fallaba desde la página principal. **Ahora** esa página se acepta siempre.
10. **Servidor con disco que sobrevive (Fly.io)** → decía "sin base de datos" y el juego avisaba "servidor
    de prueba" aunque guardara bien. **Ahora** se declara con `DATA_PERSISTENT=1` (en Fly.io se asume).
11. **Guardado que no se puede leer** → antes, si el juego no podía leer el guardado, lo reemplazaba en
    silencio por uno vacío y el próximo guardado **pisaba el progreso real** (y con cuenta, también en la
    nube). **Ahora** deja una copia intacta, muestra el error en la consola y no escribe encima.
12. **Pruebas automáticas que fallaban en main** (`accounts.js`, `leaderboard.js`, `e2e.js`, salas
    públicas…) → no eran bugs del online: el alfa ahora obliga al entrenamiento la primera vez (por eso "B
    quedaba en Entrando…": en realidad estaba entrenando), las cuentas se guardan por servidor (la prueba
    del ranking usaba la clave vieja: todos quedaban invitados, tabla vacía) y main sacó el "dúo" con
    campeón de reserva. Se actualizaron las pruebas.

## Pendiente (y por qué)

- **No pude entrar a Render, Fly.io ni a los servidores reales** desde esta máquina: la guía está hecha
  con el código. Que el servidor principal conteste en `…/la-horda/red/api/health` y cómo se llama la app
  en Fly.io quedan **NO VERIFICADOS EN RUNTIME**.
- `tools/net-test/accounts.js` falla a veces (3 de 7 corridas) en el último paso, "volver después de
  cerrar la pestaña": el dispositivo arranca con un guardado sin guardianes y muestra la elección del
  regalo. La nube sí tiene el progreso correcto (se recupera al entrar). No encontré la causa (no es que
  el guardado no se pueda leer: lo descarté con el arreglo 11); la prueba deja el diagnóstico para
  seguirlo. Es un paso con 4 "dispositivos" y conflictos encadenados; un jugador normal no hace eso.
- Si el **anfitrión** pierde la conexión, la sala se cierra para todos (el servidor le guarda el lugar a
  los invitados, no al anfitrión). Cambiarlo es un sistema nuevo: no para mañana.
- Un jugador con progreso viejo en la nube que entra desde un celular nuevo pasa por el entrenamiento
  obligatorio (lo puede saltear). Es decisión del onboarding (Q1).
- Observé que un relay quieto gastaba CPU con la máquina sin memoria; no lo pude medir aislado (la
  máquina compartida llegó a 16 GB usados). NO VERIFICADO.

## Pruebas corridas (sobre la base integrada final)

- Servidor, sin navegador: `server/test-relay.js`, `test-accounts.js`, `test-trades.js`,
  `test-game-master.js` (127 controles), `test-owner-policy.js`, `test-founders.js` (106),
  `test-presence.js`, `test-admin.js`, `test-owner-recovery.js`, `tools/alpha/account-environments.js`,
  `tools/alpha/services-test.js`: **todas OK**.
- Con navegadores (clientes independientes, relay real):
  - `e2e.js 2` (2 humanos): **OK** 51/51 · `e2e.js 4 --fifth` (4 humanos + un 5º rechazado): **OK** 72/72.
  - `public_rooms.js`: **OK** 22/22 · `trade.js`: **OK** 24/24 · `leaderboard.js`: **OK** 20/20.
  - `server_restart.js` (nueva; celular 844×390 táctil: dormido, reinicio en sala y en partida, SOLO sin
    servidor): **OK** 24/24 · `old_server.js` (nueva; relays viejos v0 y v1): **OK**.
  - `accounts.js`: 38/39, con la falla intermitente de arriba.
  - `disconnect.js`, `coldstart.js`: OK (antes de los últimos merges).
- No corrí esta vez `boons_coop`, `difficulty_net`, `ground_loot_coop`, `synergies_coop`, `lobby_*`,
  `next_arena` (quedaron actualizadas con el entrenamiento marcado; la máquina estuvo sin memoria varias
  horas).

## Nota de mi área para el alfa: 7/10

Lo que se juega (crear sala, unirse por código o enlace, salas públicas, jugar, reconectar, intercambio,
ranking) anda en las pruebas y ahora los cortes del servidor se explican bien. Resta: el servidor real no
lo pude verificar, depende de que la base de datos y las variables del evento estén cargadas, y queda la
falla intermitente de la prueba de cuentas.

## Detalle técnico

Commits (rama `worktree-agent-ab4729bed5e703600`): `258fb5f` prueba de reinicio · `ef54863` reconexión sin
sala fantasma + aviso "Reconectando…" · `d5c984a` servidor viejo detectado por /health, cuentas borradas
explicadas · `4aef5c8` NO_ROOM unificado · `21013cc` ranking/intercambio con servidor viejo, despertar al
abrir · `ad5b4cf` DATA_PERSISTENT, fondalstudios.com permitido · `11ac13a` IP real detrás del proxy,
API_MAX_IP/ROOMS_MAX_IP · `e473ec6`/`0b51ee2` guía del dueño · `685cb46`/`21c7311` pruebas al día con
main · `565c5e0` guardado ilegible no se pisa, e2e sin "dúo".

- `js/net/net-core.js`: `joinSeq` + `_awaitingJoin` (la reconexión espera un `joined` nuevo; antes
  terminaba al instante porque `net.room` seguía puesto); `NET_ROOM_GONE`/`_netGiveUp("room_gone")`;
  NO_ROOM ignorado; `netCaps`/`netCapsProbe`/`netApiMissing` (/health dice si hay /api); `_netWarmAt = -1e9`.
- `js/net/net-lobby.js`: `netClosedText(reason, role)`. `js/net/net-game.js`: `netMatch.lastRxAt`,
  `netConnRefresh` (#net-conn, estilo en `css/menus.css`), cartel "El servidor se reinició".
- `js/net/account.js`: `NO_API` sin pedir; `ACCOUNT_RESET_MSG`; pista en BAD_CREDENTIALS sin base.
- `js/net/leaderboard.js`, `net-rooms.js`, `net-trade.js`: servidor viejo (404/NO_API, timeout de 8 s de la
  oferta), "Despertando el servidor…".
- `server/accounts.js`: `DATA_PERSISTENT`/`filePersistent()`, `API_MAX_IP`, TRUST_PROXY automático en
  Fly.io, `fly-client-ip`, `clientIp` exportado. `server/relay.js`: `ROOMS_MAX_IP`, IP real en /api/rooms,
  fondalstudios.com en ALWAYS_ALLOWED. `render.yaml`: ALLOWED_ORIGINS.
- `js/storage/save.js`: `saveLoadFailed` (copia `laHordaSave_v1_noCargo`, persistNow no escribe).
- Pruebas: nuevas `tools/net-test/server_restart.js` (proxy que imita a Render: retiene conexiones mientras
  despierta), `tools/net-test/old_server.js` (relays de 3bb85e4 y 3c5156a sacados con `git show`);
  actualizadas `accounts.js`, `leaderboard.js`, `e2e.js` y el resto de `tools/net-test/*` (entrenamiento).
