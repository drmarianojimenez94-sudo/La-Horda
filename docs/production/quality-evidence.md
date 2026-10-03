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
- Nueve capturas: Mago/Nigromante/Eren en 667×375, 844×390 y 1280×800. Inspección directa de Mago 667×375 y Eren 844×390: controles dentro de pantalla y amenazas distinguibles. Con 70 enemigos simultáneos los números de daño aún se superponen; no se certifica legibilidad perfecta de todo combate.
- Las simulaciones muestran integridad del motor, no establecen por sí solas win rates ni balance competitivo; no se normalizaron kits automáticamente por esta muestra.

`node server/test-relay.js`: **38 checks PASS**, cero fallos, protocolo de salas incluido retorno/siguiente arena.

## Stress y gates adicionales

- `tools/portadores/stress.js`: **18 checks PASS**, 30 enemigos, 58,2 FPS observados durante ~2,5 s en Chromium headless; techo de 48 entidades respetado. Muestreo corto, no ensayo térmico/móvil ni soak prolongado.
- `tools/balance/entry-gate.js`: **PASS**, 19 registrados, 1 candidato no presente en el roster histórico, 3 simulaciones; ninguna violación ni error. Salida escrita en `/tmp`, sin sobrescribir referencias.
- `tools/ux/online.js`: **11 checks PASS**, cuatro clientes independientes, ocho campeones por dúos. Handoff host/guest, controles posteriores, entrada de reservas, muerte definitiva y retorno al lobby sin errores.
- La suite histórica `tools/net-test/e2e.js` no completó su flujo: intentaba tocar un control de equipamiento dentro de `details.prep-advanced` cerrado y luego utilizaba preparación de inventario anterior a dúos. No se contabiliza como aprobada ni se alteró gameplay para satisfacerla. Se ejecutó la suite cooperativa vigente `tools/ux/online.js`; queda pendiente modernizar la suite histórica completa.
- `tools/ux/functional.js`: **218 checks PASS, cero errores**, ejecución final con relay local aislado y las llamadas automáticas de servicios de Alpha desactivadas para WebDriver. Cuatro viewports: 844×390, 667×375, 390×844 y 1280×800. La pasada previa contra URL de producción sufrió un error de certificado en `/api/world`; no se ignoró ni se atribuyó al gameplay. Se repitió con dependencia local y listener de respuestas HTTP.
