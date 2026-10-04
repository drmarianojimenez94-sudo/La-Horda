# Guerra de Cristales — primera versión jugable

Estado: prototipo Alpha para entrenamiento y salas privadas. No es una temporada clasificatoria ni un lanzamiento comercial. Implementado a partir de main d1ae0d6.

## Cómo entrar

La Horda → Multijugador / Modos → Guerra de Cristales. También se puede abrir `crystal-wars.html` en el mismo alojamiento estático del juego.

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

`index.html` añade una tarjeta y `js/ui/menus.js` abre el modo conservando una eventual URL de servidor de prueba. La simulación vive en `js/modes/crystal-wars/` y la presentación en `crystal-wars.html` y `css/crystal-wars.css`.

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
