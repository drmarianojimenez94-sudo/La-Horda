# Guerra de Cristales — primera versión jugable

Estado: prototipo Alpha para entrenamiento y salas privadas. No es una temporada clasificatoria ni un lanzamiento comercial. Implementado a partir de main d1ae0d6.

## Cómo entrar

La Horda → Multijugador / Modos → Guerra de Cristales. Es una pantalla más de `index.html` (state `crystalwars`). Enlace directo: `index.html?cw=1&room=ABC123[&server=…]`; el viejo `crystal-wars.html` solo redirige ahí para no romper invitaciones.

1. Elegir nombre y campeón.
2. Entrenar con bots o crear una sala privada.
3. Compartir su enlace/código. Cada invitado elige su propio campeón y marca LISTO.
4. J1 y J2 forman Zafiro; J3 y J4 forman Ámbar. Con dos personas, ambas cooperan contra dos bots. Los espacios libres se completan con bots identificados.
5. El anfitrión inicia cuando los invitados están listos.

PC: WASD/flechas; habilidades 1–4. Táctil: joystick y cuatro botones. Básico automático. Observar al rival bloquea acciones hasta volver a la propia arena.

## Reglas implementadas

- Dos arenas separadas de 880 × 620, cristales de 1.200 HP.
- Diez minutos máximos; victoria por cristal destruido o mayor vida al finalizar. Empate explícito si coinciden.
- Oleadas simétricas cada 35 segundos; coloso cada tres oleadas. Límite de 75 enemigos por arena.
- Cinco segundos iniciales de preparación; siete segundos de suministros al inicio de cada oleada.
- 30 fragmentos iniciales, 10 por oleada, 1 por baja normal y 5 por coloso. Bolsa compartida por equipo, máximo 200.
- Reparación: 35 fragmentos, +180 HP, enfriamiento compartido de 15 segundos.
- Mejora: 45 fragmentos, +12% daño de equipo, máximo tres mejoras.
- Cinco acechadores: 25 fragmentos. Coloso: 55. Envío limitado por equipo, 10 segundos entre envíos, aviso de cinco segundos al rival.
- Caer resta 65 HP al propio cristal; regreso tras ocho segundos con protección temporal.
- Cuatro roles: tanque, asesino, mago y sanadora; cada uno tiene un kit propio del Coliseo con daño de área. Sus habilidades adaptadas están definidas en `simulation.js`; NO se afirma que sean las implementaciones completas de campaña.
- Sin nivel de cuenta, inventario, reservas de dúo ni bonificaciones permanentes. Sin premios, castigos, logros ni escrituras al guardado de campaña. Solo se persiste un identificador de reconexión en sessionStorage.

## Integración y decisiones

`index.html` contiene la pantalla `#crystalwars-screen` y la tarjeta; `js/ui/menus.js` (`cwGo`) la abre conservando una eventual URL de servidor de prueba, y `js/modes/crystal-wars/client.js` no carga nada hasta la primera apertura (`CrystalWarsUI.open/close`). La simulación vive en `js/modes/crystal-wars/` y la presentación en `crystal-wars.html` y `css/crystal-wars.css`.

Se reutilizan `NET_CONFIG.serverUrl`, el protocolo 1 de `server/relay.js`, los atlas de los cuatro campeones, la animación del esqueleto y la del gólem. El build `CW-1` separa sus salas de las de campaña; no requiere cambiar el servidor actual. Las salas son privadas. No se creó infraestructura adicional.

La simulación es controlada por el anfitrión, igual que el cooperativo existente. Los invitados envían intenciones de movimiento y acciones; nunca posiciones, daño, fragmentos ni resultados autoritativos. Se validan movimiento, índices, recursos, ventanas y cooldowns. Los snapshots viajan a 10 Hz, las entradas aproximadamente a 16 Hz y la simulación a 30 Hz. El resultado final se envía inmediatamente, incluso entre intervalos de snapshot.

El anfitrión aún es una fuente de confianza: este modelo NO es apropiado para premios monetarios, clasificaciones públicas verificadas ni anti-cheat competitivo. Eso exige simulación/validación en servidor. No hay migración de anfitrión. Su desconexión interrumpe la partida sin adjudicar victoria; el invitado desconectado se reemplaza por un bot y puede recuperar el mismo lugar. Al volver a la sala se conserva el código para la revancha.

## Validación reproducible

```sh
node tools/crystal-wars/test-simulation.js
npm ci --prefix server
# Requiere Playwright + Chromium instalados:
node tools/crystal-wars/browser-test.js
# CHROMIUM_PATH puede indicar un ejecutable alternativo.
```

- Diez pruebas de simulación: semillas reproducibles, oleadas equivalentes, normalización, economía y cooldowns, aviso de amenazas, separación de daño/curación, acciones inválidas, movimiento, resultados y ocho partidas completas.
- Ocho partidas de bots con semillas 1–8 terminaron en 475–600 segundos; máximo observado de 46 enemigos simultáneos. Esto prueba finalización y límites, no demuestra balance entre roles.
- Prueba real de navegador con cuatro contextos y relay local: selección, equipos, movimiento, habilidades, rechazo de estado falsificado, resultados compartidos, revancha, desconexión de anfitrión y diseño 390 × 844 sin desbordamiento horizontal.
- Revisión visual de capturas de escritorio y móvil; sin errores JavaScript en esa prueba.
- Referencias de balance de campaña sin cambios, verificadas con `tools/balance/check-entry-reference.js`.

## Límites de esta entrega y siguiente iteración

El campo es una arena funcional inicial con los assets disponibles. Los efectos y sonidos son básicos. No hay nuevas skins, tienda de dinero real, desafíos semanales ni telemetría de monetización en esta entrega. Se priorizó el modo que pidió el usuario.

Antes de ampliar a todo el roster: probar parejas de roles, igualar rendimiento de bots, ensayar latencia real desde celulares, probar Safari/iPhone físico y observar sesiones humanas completas. La prueba móvil actual es emulación de Chromium; no certifica Safari. El anfitrión debe mantener su pestaña activa: la suspensión del navegador pausa la simulación. La conexión de producción y el despliegue deben verificarse por separado de las pruebas locales.


## Integración al juego y presentación (octubre 2026)
- Tarjeta propia **CRISTALES** en el hub (antes solo se llegaba por Multijugador → modos) y entrada en
  `GAME_MODE_REGISTRY.crystalWars`. El enlace "‹ LA HORDA" vuelve **directo al hub** (`index.html?return=hub`), sin la portada.
- En celular horizontal el encabezado (con el botón de volver) ya no desaparece en el lobby: solo se oculta durante la partida.
- Arte del juego reutilizado, sin assets nuevos: piso de piedra de las Minas con viñeta, tres portales de la Horda del Abismo
  y el cristal del Ángel como cristal del equipo (recoloreado a ámbar para el rival; se agrieta por debajo del 50 %).
  Héroes más grandes (76 u) y tipografía pixel de La Horda (Press Start 2P para títulos, VT323 para el resto).
- Prueba: `node tools/crystal-wars/hub-integration.js` (844×390 y 667×375: tarjeta visible, ≥ 44 px, ida y vuelta al hub).


## Auditoría y mejoras de competitividad (CW-2, octubre 2026)

**Qué NO se pudo hacer:** el servidor de producción (`fondalstudios.com`) no es alcanzable desde el entorno de esta sesión (el proxy de salida devuelve 403 para ese dominio). La auditoría se hizo contra el MISMO `server/relay.js` ejecutado en local (4 clientes reales de navegador). Falta una prueba de punta a punta contra Fondal: publicar el build actual, redeplegar el relay y correr `node tools/crystal-wars/browser-test.js` con `?server=wss://fondalstudios.com/la-horda/red`. Para permitirlo desde esta sesión hay que agregar el dominio en *Allowed domains* del entorno.

**Hallazgos de la auditoría**
1. Balance de roles (bots, 660 partidas, línea base CW-1): Tanque 33 % y Sanadora 31 % de victorias contra Asesino 67 % y Mago 69 % — dos roles eran trampa.
2. Pocas partidas se resolvían: 14 % terminaban por tiempo; el que “más vida conservara” ganaba sin dramatismo.
3. Una sola estrategia de compra (defensiva) dominaba y enviar monstruos casi nunca valía la pena (política agresiva ~17–25 %).
4. Sin estadísticas ni cierre de partida: no se sabía quién aportó qué, ni había racha.
5. Pantalla de juego en celular horizontal (844×390): el marcador quedaba recortado y la arena ocupaba ~ una cuarta parte de la pantalla.
6. **Servidor:** el relay no limitaba mensajes por conexión: un invitado podía inundar al anfitrión (que simula la partida). Corregido.
7. Texto de reglas engañoso (“destruí el cristal rival”): nunca se ataca directamente al cristal rival; se presiona con envíos y caídas.

**Cambios (build `CW-2`)**
- Rebalance de roles (Tanque daño 44 / cadencia .55; Sanadora daño 29 / .5; Asesino 29; Mago 21).
- Nuevas decisiones de compra: **Barrera** (+150 de escudo al cristal, 40 ◆, enfriamiento 20 s) y **Furia** (+43 % de velocidad de ataque 20 s, 50 ◆). Costes de envíos ajustados (16 / 42 ◆) y mejora a 38 ◆.
- **Ayuda del cristal** (remontada): al comienzo de cada oleada el equipo que va 250 o más de vida abajo recibe +6 fragmentos.
- **Eclipse** a los 8 min: los dos cristales pierden vida cada vez más rápido; las partidas se resuelven (99–100 % terminan en cristal) con duración media ~8,4 min.
- Presión creciente: oleadas hasta 36 enemigos y daño enemigo +7 % por oleada.
- Estadísticas por jugador (daño, bajas, curación, caídas, envíos), estrella al mejor de cada equipo y racha/mejor racha local (solo partidas online; el entrenamiento contra bots no suma). Se guarda únicamente en `localStorage` (`cw-record`); no toca la cuenta ni la campaña.
- Celular horizontal: arena a pantalla completa con controles flotantes; los suministros aparecen solo durante la ventana de compra.
- Relay: cubeta de fichas por conexión (120 mensajes/s sostenidos, ráfaga 240); se descartan los excedentes y se corta tras 600 descartes. Prueba `server/test-relay.js` (inundación).
- Políticas de los bots (`balanced / economy / aggro / turtle`) sirven también para verificar que ninguna estrategia domine.

**Resultados medidos** (`node tools/crystal-wars/balance-gate.js`, partidas de bots): roles 49–53 %, políticas de compra 38–56 %, ventaja de lado 48 %, empates 0 %, 100 % terminan en cristal, 503 s de duración media. Es una puerta de CI.

**Límites honestos:** los bots son simples; miden el modo pero NO a jugadores humanos. No hay matchmaking, ranking verificado ni anti-cheat (el anfitrión sigue siendo de confianza; ver arriba). Las salas son privadas, así que sin amigos el modo no tiene cola pública. Próximos pasos propuestos: cola pública con relleno de bots, ranking por temporada con simulación en el servidor, partidas de 1 contra 1, y pruebas reales con 10+ personas.
