# La Horda — Alpha Autonomous Improvement Factory

Auditoría y entrega: 2 de octubre de 2026 (Argentina). Base real: `9cf4c70b584bbb3b803d718322b72b8aa12a7d32`, `main`. Rama: `codex/alpha-improvement-factory`.

## Resultado y alcance honesto

Esta entrega implementa una base transversal de producción, colección, aprendizaje y operación, con correcciones verificadas. **No equivale a aprobar los 36 apartados completos de la misión**. Los pendientes artísticos, de eventos avanzados, balance competitivo y dispositivos físicos están explícitos abajo. No se implementaron pagos, checkout, transacciones monetarias ni bloqueos por dinero. No se ejecutaron regalos, resets ni modificaciones de configuración contra cuentas reales.

## Auditoría inicial y componentes preservados

| Sistema | Clasificación inicial | Decisión y evidencia |
|---|---|---|
| Audio | Bueno, con arquitectura avanzada | Preservar mezcla, prioridades, límite de voces, ducking y música por arena. 49 checks posteriores aprobados; no atribuir 10/10 perceptivo sin escucha humana. |
| VFX | Bueno con dos bugs reproducibles | Preservar pools y presupuestos; reparar prioridad de definitiva y limpieza entre arenas. |
| Códice | Bueno pero inconsistente | Preservar renderer data-driven, spoilers, descubrimiento, previews reales y carga diferida. Corregir historias y colección. |
| Cuentas/guardado | Bueno, sensible | Preservar hashes, sesiones, CAS y stores. Extender operaciones separadas del progreso; sin migración destructiva. |
| Multiplayer | Bueno | Preservar host autoritativo, códigos, bots, loadouts y retorno. Añadir selección cosmética independiente compatible con catálogo. |
| Balance | Bueno como referencia de entrada | Reutilizar referencia por rol y simulaciones. No homogeneizar ni cambiar números sin evidencia. |
| Tutorial | Contextual útil, entrenamiento ausente | Conservar consejos existentes y añadir entrenamiento con motor real. |
| Administración | Básica | Preservar editor de niveles y construir Game Master protegido. |
| Arte | Mixto | Consolidar estándar existente; clasificar honestamente recolores. No reemplazar arte aprobado por cambios arbitrarios. |

No se inventan calificaciones 10/10: los componentes excelentes en su alcance medido se preservan, con límites de la evidencia identificados.

## Implementación

### Producción y fábrica

`docs/production/PRODUCTION_BIBLES.md` consolida Champion, Enemy, Ability, VFX, Audio, UI, HUD, Cosmetic y Set Bible, enlazando Art/Lore existentes. `AGENTS.md` y Art Bible exigen los gates y recogen la autorización expresa de REDRAW sin alterar identidad arbitrariamente.

`tools/factory/cli.js` crea un contrato de campeón sin sobrescribir archivos, valida los requisitos y orquesta gates existentes. Sus 18 tests cubren huérfanos, lore, clasificación, estadísticas cosméticas, herramienta contra hordas, atlas/frames, límites, evidencia, pagos y rutas inseguras. **El scaffold no genera automáticamente arte terminado ni implementa un kit**; un `STRUCTURAL_PASS` no equivale a release. Auditor runtime: 19 campeones registrados, cero incidencias estructurales; ver `docs/production/roster-audit.json`.

### Colección, Códice y Sets

- Causa de historias duplicadas: `portadores.js` asignaba la misma historia a catálogo y lore; la ficha imprimía ambos campos. Se deduplica contenido normalizado en el renderer, conservando textos distintos; no se oculta por CSS. Siete fichas afectadas, gate de regresión.
- Selector Original / Skins / Cromas / Set con preview inmediato y prueba sin mutar progreso. Catálogo de 30 apariencias con lore, origen, colección y metadata comercial inactiva.
- Myla/Ynara usan recolores de atlas base: se presentan como **cromas de Set**, no como nuevas skins de gran rareza. El diseño propio sigue pendiente.
- Preview de Myla deja de mostrar el atlas entero. Fallback de tienda usa preview animado cuando falta thumbnail adecuado.
- Elegir apariencia ya no equipa objetos ni cambia estadísticas. Original, cromas y skins se sincronizan en loadouts con validación de ID/campeón.
- Coleccionar todas las piezas desbloquea permanentemente la apariencia, incluso si luego se venden; reconoce colección histórica. Regalos se integran al mismo desbloqueo cosmético.
- Ficha del Set informa piezas faltantes y afinidad de arenas basada en datos reales. No se añadieron probabilidades ni drops garantizados inventados.

### Entrenamiento y onboarding

Arena de entrenamiento sobre `startRun`, `update`, controles y kit real del mago: movimiento, ataque, habilidad, cooldown, definitiva, poción/vida, XP/nivel, loot y objetivo final. Nueve pasos enseñar/hacer/confirmar. A los cinco minutos termina sin fingir aprobación. Progreso temporal descartable; sólo conserva flags de tutorial completado. Pausa, salida y timeout probados.

Guía de niveles 1–10 dentro del Códice y consejos progresivos en el menú. No se rebajaron requisitos reales de maestría ni se afirma que todos los sistemas avanzados estén desbloqueados al nivel 10. La duración humana ideal de tres minutos requiere playtest; el límite técnico y los checkpoints sí se probaron.

### Game Master y mundo Alpha

Ruta `#game-master`, acceso OWNER validado en cada endpoint del servidor usando `ADMIN_USERS`; no privilegios hardcodeados en frontend. Dashboard de cuentas, actividad, sesiones online estimadas, partidas, resultados, tutorial y dimensiones de producto. Se conserva el editor de niveles.

Configuración normal versionada y restauración de defaults. Nueve multiplicadores conectados al juego: XP, oro, drop, dificultad, vida/daño de enemigos, vida de bosses, frecuencia de élites y aparición. Eventos temporales por arena/oleada, enemigos normales/élite validados, anuncio, banner y multiplicadores. La expiración usa hora del servidor; nunca sobrescribe la configuración normal. El multiplicador efectivo se limita por seguridad a 0,1–20.

**Jefe arbitrario, Set específico y recompensa automática de evento están deshabilitados explícitamente** y el servidor rechaza esos campos con 422. Requieren integrar controladores y concesión idempotente de recompensas. No se simula su funcionamiento guardando formularios sin efecto.

Chat global autenticado con límites, texto seguro, marca OWNER y mensaje fijado. Noticias, banners y mensajes destacados programados. Polling acotado fuera del combate; las ventanas se limpian al cerrar. La administración puede regalar cosméticos existentes individualmente o a todas las cuentas con progreso, con reporte de conflictos y faltantes.

Reset de una cuenta por campos: progreso de campeones, arenas, oro, inventario, cosméticos y Códice. Vista previa, frase exacta, token de un uso con caducidad, respaldo durable previo y CAS. No hay botón de reset global. Inventarios heredados y maestría real se limpian; no se reviven desbloqueos por migraciones. Si se conserva el equipo/colección de un Set, su recompensa puede recuperarse: la vista previa lo advierte.

Persistencia file atómica y adaptador PostgreSQL con tablas aditivas. Backups separados del estado operativo para no reescribir megabytes en cada evento. PostgreSQL no se validó contra una instancia real. Contratos, límites y despliegue: `docs/production/operations.md`.

### Telemetría y privacidad

Contadores agregados independientes de saves, con fecha/build/versión/Alpha. Se instrumentan pantallas, partidas/resultados/abandono, pasos de entrenamiento, habilidades, talentos, equipo, drops, pickups y apariencias. No se guardan nombres, email, IP, tokens, texto del chat ni stacks de errores en telemetría. ID de sesión efímero sólo en memoria para online; opt-out visible. Los datos son declarados por el cliente, no autoridad competitiva ni conteos de personas únicas. Las dimensiones cuentan eventos, no necesariamente partidas únicas.

La automatización (`navigator.webdriver`) no consulta configuración de producción ni envía métricas, salvo opt-in del test con API simulada. Evita contaminar la Alpha con QA. Sin servidor, el juego conserva multiplicadores neutros y funciona offline.

### Game feel y performance

Definitivas reciclan el flash ordinario más avanzado bajo saturación; ataques normales nunca desplazan definitivas. Se limpian flashes/glow al cambiar de partida. Pools permanecen acotados. Audio preservado tras medición de clipping, nodos, coste y silencio.

Landscape existente conservado; nuevas superficies usan tokens del UI kit y se ocultan ante aviso de rotación. No se rediseña gameplay portrait. Build multiplayer actualizado para separar clientes anteriores.

## Validación ejecutada

| Gate | Resultado / interpretación |
|---|---|
| Factory | 18 tests PASS; 19 registros runtime sin incidencias |
| Colección | 30 apariencias, 7 historias; pureza, regalos, red y unlock tras venta PASS |
| VFX pools | 10.000 casts, prioridad, expiración y reset PASS |
| Audio | 49 checks PASS; sin clipping/NaN; p95 en partida 0,3 ms para SFX |
| Combate/VFX | 296 checks, 76 habilidades, 57 simulaciones × 150 s, cero excepciones |
| Stress | 18 checks; 58,2 FPS en Chromium headless 844×390, 30 enemigos; no certifica móvil real |
| Balance entrada | Referencia PASS; 19 registrados, 1 candidato, 3 simulaciones PASS |
| Servidor | Relay, cuentas, ranking y trades PASS; Game Master y seguridad 84 checks PASS |
| Editor niveles anterior | 15 comprobaciones PASS |
| UX existente | 218 checks PASS, sin errores en ejecución final |
| Cooperativo vigente | 4 clientes, 11 checks PASS |
| Entrenamiento | 844×390 y 667×375; nueve pasos, persistencia, pausa, salida y timeout PASS |
| Game Master UI | Permisos, payloads, XSS, confirmación y bounds 667/844/1440 PASS |
| Servicios Alpha | Offline, multiplicadores scoped, privacidad, opt-out, cola acotada, chat/noticias literal y orientación PASS |

Evidencia detallada de audio, simulaciones, perf y multiplayer: `docs/production/quality-evidence.md`. Los tests de navegador se ejecutaron con Chromium headless y API local o mock declarada. Se revisaron capturas representativas, no miles de imágenes redundantes. No son usuarios humanos ni dispositivos físicos.

Perfiles reproducibles: novato (`training-test`), explorador/speedrunner/caótico (`navigation-profiles`), coleccionista (`browser-collection`) y multiplayer (`tools/ux/online.js`). Incluyen salidas, reload, rotación, rechazos, conflictos y spam; no sólo caminos exitosos.

## Pendientes y límites: causa, impacto, intento y siguiente acción

| Pendiente | Causa / impacto | Evidencia e intento | Siguiente acción |
|---|---|---|---|
| Skins reales Myla/Ynara y redraw general | Atlas recoloreados; no hay reinterpretación completa | Catálogo detecta `cromaOf`, clasifica y usa preview honesto | Producir atlas con canon, animaciones y Visual Gate; no prometer asset ausente |
| Eventos con bosses/recompensas | Controladores especiales por arena y concesión idempotente faltantes | IDs auditados; campos deshabilitados y backend 422 | Integrar un evento completo por controlador y probar cierre/reintento/recompensa |
| Reset masivo, auras y cohortes | Alcance destructivo y catálogos no completos | Reset individual respaldado, regalos globales con conflictos | Batch con preview global, snapshot y recuperación; catálogo real de auras |
| Precios por objeto configurables | Tienda tiene varios caminos de compra/descuento | No se expone una perilla sin cobertura completa | Unificar precio efectivo y probar todos los caminos, sin pagos |
| Balance competitivo/autocorrección | Muestras de integridad no estiman win rate robusto | Gates existentes y 57 sims, sin cambios arbitrarios de kits | Estratificar por rol/arena/semilla y comparar resultados antes de ajustar |
| UI/HUD de todo el juego | Superficies heredadas extensas; daño superpuesto en hordas grandes | 218 checks y muestreo visual; persiste ruido de números con 70 enemigos | Agrupación contextual de daño y revisión visual de todos los estados |
| iPhone/Android físicos y partidas largas | Runtime disponible es Chromium desktop | Viewports 667/844, stress medido y pools acotados | Safari/Android real, térmica, memoria y sesiones prolongadas |
| PostgreSQL real | Sin instancia de pruebas conectada | Adaptador con transacción/row lock; file integrado | CI con Postgres efímero antes de certificar store productivo |
| Telemetría fina y retención | Eventos agregados, sin cohortes/personas persistentes | Funnel agregado, dimensiones y opt-out | Analizar datos reales Alpha, definir cohortes mínimas sin PII |
| Factory generativa completa | Contratos/gates no producen arte/animación final por sí mismos | Scaffold seguro y validación de evidencia | Añadir productores especializados conservando gates humanos/visuales |
| Test multiplayer histórico | Selectores/flujo previo a dúos obsoletos | Intento documentado; suite vigente de 4 clientes PASS | Migrar suite histórica, conservando escenarios aún relevantes |

## Reproducción y entrega

- `npm ci --prefix server && npm test --prefix server`
- `node tools/factory/test.js`
- `node tools/collection/check-collection.js`
- `node tools/alpha/services-test.js`
- `node tools/quality/test-vfx-pools.js`
- `node tools/balance/check-entry-reference.js` y `node tools/balance/entry-gate.js`
- Servir repo en 8805; ejecutar tests `tools/alpha/*` de navegador y `tools/collection/browser-collection.js` con Playwright. `SITE` permite puerto alternativo, `CHROMIUM_PATH`/`CHROME` permiten ejecutable instalado.

El workflow existente incorpora los nuevos gates; no reemplaza los útiles. Commits por grupos coherentes y PR contra main; el SHA de merge se verifica externamente después del merge, no se inventa dentro de este documento antes de existir.
