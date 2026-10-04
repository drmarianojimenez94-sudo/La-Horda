# Alpha: evidencia de audio, VFX y cooperativo

## Alcance y preservación

Auditoría del código actual, no una certificación retrospectiva de reportes históricos. Se conserva la mezcla existente: compresor/limitador maestro, techo de seguridad, música compuesta por arena y fase, ducking para eventos importantes, prioridad de SFX, variación por material y límites de voces/nodos. La existencia de estos controles no demuestra por sí sola calidad perceptiva ni rendimiento en iPhone físico.

Se preservan pools VFX fijos (720 partículas, 96 telegraphs, 40 sprites, 24 flashes de impacto, 10 de lanzamiento), degradación adaptativa de partículas secundarias y reserva para efectos críticos. No se reemplazan componentes correctos.

Multiplayer ya dispone de sala por código, loadout propio por invitado, sincronización de apariencia, retorno a lobby, chat de sala y suites de reconexión. No se reescribió el transporte por preferencia de implementación.

## Defectos reproducidos y corregidos

1. **Una definitiva perdía su flash de lanzamiento con el pool saturado.** Reproducción: diez `vfxCastFlash` normales seguidos de una definitiva producían cero flashes de definitiva. Se recicla el flash normal más avanzado; si todo son definitivas, el más avanzado. Un ataque normal nunca desplaza una definitiva. El pool permanece en diez elementos, sin crecimiento.
2. **Feedback de la arena anterior sobrevivía al reset.** `vfxResetRun` limpiaba partículas/sprites pero no `fxCasts`, `fxFlashes` ni el estado de glow. Se agregó un reset explícito dentro del ciclo de limpieza existente. Evita destellos en posiciones de la partida previa.

## Evidencia ejecutada

- `node tools/quality/test-vfx-pools.js`: PASS. Código real cargado en VM, 10.000 lanzamientos, prioridad de definitiva, reserva de partículas críticas, máximo de 720 partículas, expiración y limpieza entre partidas. Assets de sprites sustituidos por objetos vacíos: este test no certifica sus dibujos.
- `node tools/balance/check-entry-reference.js`: PASS. Sincronización de referencia, presupuestos por los cuatro roles, roster conocido intacto y rechazo de rol inválido.

## Límites de esta evidencia

Un VM no mide FPS, mixing perceptivo, render ni latencia cooperativa. Los gates de navegador se registran abajo cuando se ejecutan; no atribuirles PASS por tener scripts presentes. Pendiente validación física de Safari/iPhone y Android, altavoces/auriculares y red móvil. No se cambiaron valores de balance a partir de una prueba estática.

## Gates en Chromium ejecutados

Entorno: Chromium headless de escritorio, viewport emulado; no equivale a hardware iPhone. Suite original `tools/audio/t_audio_mix.js` con HTTP local y navegador instalado en `/tmp`:

- **49 checks PASS, cero fallos**. Combate pico −1,4 dBFS, RMS −15,6 dBFS; estrés pico −1,2 dBFS, RMS −10,5 dBFS. Sin clipping/NaN.
- Estrés: máximo 131 fuentes vivas, 22 al final, cero fuentes sin parada. Sin crecimiento entre mitades.
- Cuatro SFX por frame: promedio 0,2 ms; p95 0,5 ms. Partida real: promedio 0,05 ms; p95 0,3 ms. Música boss→victoria validada. Silencio/volumen cero verificados.
- Decisión: preservar motor de audio; no reemplazar sonidos sin evidencia de necesidad. La escucha perceptiva humana queda pendiente.

`tools/vfx/audit-combat.js` ejecutado mediante copia temporal que cambia solamente el directorio de resultados y el navegador:

- **296 checks PASS, 76 habilidades, 57 simulaciones de 150 segundos (3 seeds × 19 campeones), cero excepciones**.
- Pools, replicación numérica de firmas, retención de casts bajo saturación de eventos, definitivas, limpieza, HUD y pausa/audio aprobados por esos checks.
- Nueve capturas: Mago/Nigromante/Eren en 667×375, 844×390 y 1280×800. Inspección directa de Mago 667×375 y Eren 844×390: controles dentro de pantalla y amenazas distinguibles. La primera pasada detectó números de daño superpuestos con 70 enemigos; quedó reparado y revalidado en la fase de cierre detallada abajo.
- Las simulaciones muestran integridad del motor, no establecen por sí solas win rates ni balance competitivo; no se normalizaron kits automáticamente por esta muestra.

`node server/test-relay.js`: **38 checks PASS**, cero fallos, protocolo de salas incluido retorno/siguiente arena.

## Stress y gates adicionales

- `tools/portadores/stress.js`: **18 checks PASS**, 30 enemigos, 58,2 FPS observados durante ~2,5 s en Chromium headless; techo de 48 entidades respetado. Muestreo corto, no ensayo térmico/móvil ni soak prolongado.
- `tools/balance/entry-gate.js`: **PASS**, 19 registrados, 1 candidato no presente en el roster histórico, 3 simulaciones; ninguna violación ni error. Salida escrita en `/tmp`, sin sobrescribir referencias.
- `tools/ux/online.js`: **11 checks PASS**, cuatro clientes independientes, ocho campeones por dúos. Handoff host/guest, controles posteriores, entrada de reservas, muerte definitiva y retorno al lobby sin errores.
- La primera pasada de `tools/net-test/e2e.js` detectó fixtures obsoletos: sección avanzada cerrada, inventario inicial saturado y ausencia de reservas. Se modernizó completamente en la fase de cierre, sin alterar gameplay para satisfacerla; resultados finales abajo.
- `tools/ux/functional.js`: **218 checks PASS, cero errores**, ejecución final con relay local aislado y las llamadas automáticas de servicios de Alpha desactivadas para WebDriver. Cuatro viewports: 844×390, 667×375, 390×844 y 1280×800. La pasada previa contra URL de producción sufrió un error de certificado en `/api/world`; no se ignoró ni se atribuyó al gameplay. Se repitió con dependencia local y listener de respuestas HTTP.


## Cierre de pendientes reparables: legibilidad y QA prolongado

### Números de daño

Causa: agrupación por objetivo y tres desplazamientos fijos de 15 unidades no tenían en cuenta el tamaño del texto crítico, el zoom ni la posición animada. En AoE con muchos objetivos coexistían decenas de números legibles individualmente pero superpuestos.

Se conserva el pool de 70, la suma por objetivo, colores elementales, pop y caducidad. El render mide el ancho real y reserva rectángulos separados con hasta tres posiciones cercanas. Avisos, daño recibido y curación reservan lugar antes que críticos y daño común. Una etiqueta sin espacio conserva su valor y puede reaparecer cuando se libera lugar; no cambia el daño ni la simulación. Rectángulos preasignados, sin asignar objetos por frame. La admisión al pool también respeta prioridad: spam de críticos no puede expulsar advertencias/curaciones existentes (regresión de 200 críticos validada).

- `node tools/quality/test-floating-text.js`: PASS, prioridades, 70 etiquetas concentradas, cero solapes, suma de daño intacta, zoom 0,5/1/2, expiración.
- `tools/quality/floating-text-browser.js`: PASS en Chromium real 667×375. Caso extremo con 70 etiquetas en una zona pequeña: 3 dibujadas sin solapamiento. 240 muestras: media 0,117 ms, p95 0,2 ms. No equivale a medición en iPhone físico.
- Regresión `tools/vfx/audit-combat.js --quick`: 296 checks, 76 habilidades, cero fallos/errores. Captura Mago 667×375 con 70 enemigos inspeccionada: avisos y números separados.

### Suite multiplayer histórica reparada

`tools/net-test/e2e.js` ahora prepara guardados de prueba limpios, líder/reserva distintos por cliente y abre la sección avanzada mediante su control visible. Comprueba el handoff a reserva vigente en lugar del revive eliminado del diseño. Usa `CHROMIUM_PATH` cuando se proporciona. Espera resultado de conexión o error explícito, con timeout de 30 s, sin exigir que cuatro navegadores bajo simulación concurrente respondan antes de seis segundos.

- 2 humanos: **51 checks PASS**.
- 4 humanos y quinto rechazado: **72 checks PASS**.
- Equipo real en lobby, chat y mute, movimiento sincronizado, habilidades, fuego amigo, XP y guardados propios, entrada de reserva, cura de emergencia una vez, elección de mejoras, jefe con fases, victoria, regreso y revancha. Cero errores de página.

### Muestreo por rol/arena y sesiones repetidas

`tools/quality/role-arena-soak.js`, reproducible con `SITE`, `CHROMIUM_PATH` y `QA_OUT`:

- 48 simulaciones de 90 s: 2 campeones por rol × Ciudad/Micelial/Minas × 2 seeds. Nivel 20, sin equipo/talentos, misma asignación inicial de maestría.
- 48 ciclos de 150 s en el mismo navegador: 12 ciclos por representante de rol, alternando tres arenas, 30 minutos virtuales por rol y **120 minutos virtuales totales**. Sin recargar entre ciclos.
- Cero excepciones, HP/daño finitos, máximo de 720 partículas y 48 objetos respetado. Cada reset dejó partículas/flashes/casts en cero. DOM entre 1317–1345 según campeón/arena, sin crecimiento sostenido observado; máximo de un temporizador pendiente al muestrear. No demuestra ausencia de todo leak de heap ni sustituye soak térmico en hardware.

| Rol | Campeón | DPS medio de la muestra |
|---|---|---:|
| Tanque | Tanque | 34,9 |
| Tanque | Eslabón | 28,6 |
| Asesino | Guerrero | 29,9 |
| Asesino | Eren | 42,5 |
| Mago | Mago | 49,9 |
| Mago | Iria | 36,7 |
| Soporte | Soporte | 16,1 |
| Soporte | Farolero | 21,0 |

La comparación relevante es dentro del mismo rol y arena: ratios de medias entre 1,01 y 1,79; ningún candidato superó el disparador de revisión de 2× de este muestreo. No se cambian kits ante diferencias que pueden depender de utilidad/arena; Soporte además curó una media de 105,5 HP efectivos por muestra. Son muestras tempranas de integridad y detección de outliers, no win rates humanos ni certificación de equilibrio de todos los campeones contra todos los jefes.


## Auditoría móvil acumulada cerrada

`tools/audit/ui_layout.js` completó 59 pantallas en 844×390 y 59 en 667×375, sin errores JavaScript. Se preservó el recorrido completo hasta partida/pausa/resultados; no se sustituyó por un arranque directo.

El fallo previo de setup era del arnés: con `ONLY`, `snap()` omitía su demora y el toque llegaba ~200 ms después de abrir un diálogo; el producto evita cierres accidentales durante 250 ms. La alerta sintética seguía abierta e interceptaba Comenzar. El arnés ahora espera las protecciones de diálogo/prólogo explícitamente, utiliza taps con hit-testing y verifica que el diálogo cerró. Los errores de preparación ya no se silencian.

Primera pasada completa: 10 incidencias agrupadas (selectores de dúo de 38 px, checkbox de 13 px y un destino secundario tratado como primario), cero overflow/texto diminuto/fuentes ajenas. Las reparaciones de CSS/Options se validaron de forma dirigida en ambos tamaños. Opciones además obtuvo un cierre fijo visible desde el comienzo del panel desplazable. Resultado final combinado: ninguna incidencia pendiente de esa auditoría. El último recorrido dirigido de Opciones terminó `SUMMARY issues=0 (elementos=0) fonts=0`, sin errores; menú/preparación/HUD habían pasado en la revalidación anterior. Esto continúa siendo emulación de viewport en Chromium, no certificación de dispositivos físicos.
