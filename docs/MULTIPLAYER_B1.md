# LA HORDA — B1 COOPERATIVE PLAYTEST

Primer multijugador cooperativo real: de 1 a 4 humanos en la misma partida, siempre 4
integrantes (los lugares libres los ocupan bots).

## Cómo se juega

**Crear sala (anfitrión)**
1. MENÚ PRINCIPAL → **🌐 MULTIJUGADOR** → **Crear sala** → elegís una arena **desbloqueada** y tu
   campeón → la sala se crea sola (también se puede desde la PRE-SALA con **🌐 Crear sala online**).
2. Aparece el código (ej. `SALA QKL58J`), el enlace, **📋 Copiar enlace** y **📨 Invitar** (en
   iPhone abre el menú para compartir por WhatsApp).

**Unirse (invitado)** — dos formas:
- MENÚ PRINCIPAL → **🌐 MULTIJUGADOR** → elegís tu campeón → pegás **el enlace** o escribís **el
  código** (sirve `QKL58J`, `qkl58j` o `SALA QKL58J`) → **Unirse**.
- O abrís el enlace directamente → poné tu nombre → **Unirse a la sala**.

**En la sala** (todos): cada uno ve a los 4 lugares en tiempo real con su color **P1 naranja · P2
azul · P3 verde · P4 violeta**. Cada jugador **elige su campeón ahí mismo** (los que usa otro
jugador aparecen bloqueados), prepara su equipo (Equipamiento / Talentos / Habilidades) y marca
**LISTO**. El anfitrión puede cambiar la **arena** desde la sala. **Comenzar** muestra cuántos
faltan marcar LISTO (si igual quiere empezar, pide confirmación). Los lugares vacíos pasan a ser bots.

Sin crear sala, la pre-sala funciona igual que antes (vos + 3 bots) y no necesita Internet.

## El ciclo de la sala (PLAYTEST V1, P0)

`SALA → preparación → LISTO → partida → victoria/derrota → resultados → LA MISMA SALA → …`

- **Team wipe** = todos los humanos **activos** (conectados) están caídos y nadie está terminando
  de revivir a un humano. En ese momento se corta la partida (no aparecen más enemigos, no se
  abren refuerzos, se cancela todo revivir), todos ven la derrota y sus resultados, y cada uno
  guarda solo lo que corresponde (el castigo de derrota se aplica **una vez**, en su guardado).
  Mientras quede un humano activo en pie, **no** es derrota.
- **VOLVER AL LOBBY**: el anfitrión vuelve con el botón (o solo, a los 20 s en una derrota). Los
  invitados que siguen en los resultados **vuelven solos** a los 4 s; si alguno vuelve antes, lo
  espera en la sala ("el anfitrión todavía está en los resultados").
- Se conserva: la sala, el código/enlace, la conexión, los jugadores y sus lugares/colores,
  nombres, campeones, equipo, inventario, talentos, nivel, XP y oro, y **la misma arena**.
- Se reinicia: **LISTO vuelve a NO LISTO** para todos (lo resetea el servidor); cada uno puede
  cambiar campeón/equipo/talentos y marcar LISTO de nuevo. El botón pasa a **Reintentar · Arena**.
- Cada reintento es una **instancia nueva y limpia**: nivel 1, sin enemigos, proyectiles, zonas,
  trampas, invocaciones, jefes, oleadas, temporizadores ni refuerzos de la partida anterior
  (`resetRunTransients` + los reinicios de `startRun`).

## Revivir (autoritativo)

- Lo decide siempre el anfitrión (`updateRevives`, js/ai/allies.js). Mantener **✚ Revivir** =
  "estoy reviviendo a X"; el progreso (1,3 s humano, 2,4 s bot) lo lleva la simulación y lo ven
  todos igual: anillo de progreso y "↻ Nombre 60%" sobre el caído.
- **Un solo reanimador por caído** (candado): si otro ya lo está reviviendo, el botón no aparece
  para vos; nunca hay doble revivir ni doble vida.
- El botón solo aparece si es válido: vos en pie, el caído en rango, nadie más revíviéndolo y la
  partida en curso.
- **Se interrumpe** (vuelve a 0, sin "reviviendo" fantasma) si: soltás el botón, te alejás,
  caés, quedás aturdido, te desconectás, el caído deja de ser válido o la partida termina.
  **Recibir daño no interrumpe** (regla elegida para que revivir bajo presión sea posible).
- El que cae ve un cartel **CAÍSTE** con quién lo está reviviendo y cuánto falta.

## Playtest V1: 2.000 de oro

Cada jugador recibe **una sola vez** 2.000 de oro al abrir esta versión (queda marcado en su
guardado; recargar no lo repite).

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
- Caer no termina la partida mientras quede un humano activo en pie: te pueden revivir (humanos
  o bots). La derrota es el **team wipe** (ver arriba).
- Entre niveles **cada humano elige su refuerzo** (30 s; si no elige, uno automático).
- **Progresión de cada uno en su propio guardado**: XP y oro de lo que vos rematás, XP del
  fin de nivel, botín, bonus y castigo de derrota se aplican en tu dispositivo. El anfitrión
  nunca guarda datos de un invitado.
- **Campaña**: una partida nueva solo tiene abierta Ruinas del Bosque; cada arena se abre al
  superar la anterior (`ARENA_ORDER`). El anfitrión solo puede crear salas para arenas que
  tiene abiertas. Un invitado puede sumarse a la arena de un amigo, pero la victoria solo le
  cuenta como "superada" si él ya la tenía abierta (el multijugador no saltea la campaña).
- Cada humano usa un campeón distinto (en la sala, los ya elegidos aparecen bloqueados).
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
3. B: MULTIJUGADOR → pegar el enlace → Unirse (o abrir el enlace), elegir campeón en la sala,
   marcar LISTO. A: ver a B en P2 (azul), comenzar.
4. Moverse los dos, usar habilidades, dejarse caer y revivirse (mantener ✚), pasar de nivel (cada
   uno elige refuerzo). Anotar el ping del panel B1.
5. Dejarse caer los dos (team wipe) → derrota → A toca VOLVER AL LOBBY → B vuelve solo a la misma
   sala. Cambiar de campeón, LISTO, Reintentar. Repetir 2-3 veces sin recargar.
