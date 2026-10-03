# La Horda — Alpha Autonomous Improvement Factory

Auditoría y entrega: 2 de octubre de 2026 (Argentina). Base real: `9cf4c70b584bbb3b803d718322b72b8aa12a7d32`, `main`. Rama inicial: `codex/alpha-improvement-factory`. Segunda iteración: `codex/alpha-completion`, desde `d939624f382d059c7d240af65911b92ca66b8c4c`.

## Resultado y alcance honesto

La segunda iteración cierra los pendientes funcionales reparables detectados en la primera entrega: eventos y recompensas, reset por lotes, precios, arte propio Myla/Ynara, cuentas separadas, autorización NanoGM, PostgreSQL real y regresión prolongada. La publicación efectiva en Fondal y la certificación de dispositivos físicos tienen límites externos explicitados abajo; no se presentan como realizadas. No se implementaron pagos, checkout, transacciones monetarias ni bloqueos por dinero. No se ejecutaron regalos, resets ni modificaciones de configuración contra cuentas reales.

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
- Selector Original / Skins / Cromas / Set con preview inmediato y prueba sin mutar progreso. Catálogo de 32 apariencias con lore, origen, colección y metadata comercial inactiva.
- Myla/Ynara tienen skins de Set con vestuario y accesorios propios, 46 poses utilizadas y dos poses rechazadas. Sus recolores anteriores se conservan como cromas separados y mantienen los derechos de los coleccionistas. Ver `art-source/alpha-set-skins/README.md`.
- Preview de Myla deja de mostrar el atlas entero. Fallback de tienda usa preview animado cuando falta thumbnail adecuado.
- Elegir apariencia ya no equipa objetos ni cambia estadísticas. Original, cromas y skins se sincronizan en loadouts con validación de ID/campeón.
- Coleccionar todas las piezas desbloquea permanentemente la apariencia, incluso si luego se venden; reconoce colección histórica. Regalos se integran al mismo desbloqueo cosmético.
- Ficha del Set informa piezas faltantes y afinidad de arenas basada en datos reales. No se añadieron probabilidades ni drops garantizados inventados.

### Entrenamiento y onboarding

Arena de entrenamiento sobre `startRun`, `update`, controles y kit real del mago: movimiento, ataque, habilidad, cooldown, definitiva, poción/vida, XP/nivel, loot y objetivo final. Nueve pasos enseñar/hacer/confirmar. A los cinco minutos termina sin fingir aprobación. Progreso temporal descartable; sólo conserva flags de tutorial completado. Pausa, salida y timeout probados.

Guía de niveles 1–10 dentro del Códice y consejos progresivos en el menú. No se rebajaron requisitos reales de maestría ni se afirma que todos los sistemas avanzados estén desbloqueados al nivel 10. La duración humana ideal de tres minutos requiere playtest; el límite técnico y los checkpoints sí se probaron.

Ampliación de cierre: los consejos pendientes se presentan de uno en uno y requieren «Entendido»; un salto de XP a nivel 10 no salta los niveles 2–9. La consulta del Códice sigue siendo libre. El estado se conserva en `save.tut.onboarding` y se actualiza al cambiar de campeón o volver al menú. Los botones de entrenamiento/guía tienen altura mínima de 40 px y texto mínimo de 11 px en landscape. Iniciar entrenamiento estando en sala online o sincronizando ahora informa por qué no está disponible.

`tools/alpha/training-player.js` ejecuta el perfil novato con joystick, ataque mantenido, habilidad, espera real de cooldown, definitiva y desplazamiento hasta poción/loot mediante eventos de puntero. No modifica posiciones, bajas ni recargas; completa las nueve lecciones sobre el motor real. El perfil es automatizado, no humano: su duración rápida no demuestra comprensión ni la duración ideal humana. `training-test.js` complementa ese recorrido con aislamiento del guardado, pausa, salida, timeout, límites del diálogo y orden completo de los diez consejos.

La auditoría `tools/audit/ui_layout.js` acepta `CHROMIUM_PATH` o `CHROME`, contempla el starter vigente y configura una reserva. El bloqueo acumulado quedó reparado: con `ONLY`, el arnés omitía la espera de las capturas y tocaba los diálogos antes de su protección de 250 ms, dejando la alerta sintética abierta. Ahora espera su disponibilidad real, verifica hit-testing y cierre, abre la sección avanzada y aborta ante errores de setup. El recorrido completo auditó 59 pantallas por dispositivo (118 en total) sin errores JavaScript. Las incidencias detectadas se corrigieron y revalidaron: selectores ≥40 px, controles Alpha dentro de Opciones, checkbox temático de 40 px y botón Listo siempre visible. La comprobación de botón primario del hub corresponde a JUGAR; los destinos secundarios dentro de Explorar siguen auditándose como contenido desplazable. Las revalidaciones dirigidas terminaron sin desbordes, objetivos táctiles pequeños, textos diminutos, primarios ocultos ni fuentes ajenas al tema. El recorrido limpio `tools/alpha/main-flow.js` sí pasó en 844×390 y 667×375: Jugar → selección real de reserva → introducción de arena → partida → pausa → reanudación, mediante controles de pantalla y sin errores JavaScript. Las capturas del HUD fueron revisadas. El perfil novato del entrenamiento también completó ambos tamaños usando controles reales (aproximadamente 35 segundos automatizados).

### Game Master y mundo Alpha

Ruta `#game-master`, acceso OWNER validado en cada endpoint del servidor usando `ADMIN_USERS`; no privilegios hardcodeados en frontend. Dashboard de cuentas, actividad, sesiones online estimadas, partidas, resultados, tutorial y dimensiones de producto. Se conserva el editor de niveles.

Configuración normal versionada y restauración de defaults. Nueve multiplicadores conectados al juego: XP, oro, drop, dificultad, vida/daño de enemigos, vida de bosses, frecuencia de élites y aparición. Eventos temporales por arena/oleada, enemigos normales/élite validados, anuncio, banner y multiplicadores. La expiración usa hora del servidor; nunca sobrescribe la configuración normal. El multiplicador efectivo se limita por seguridad a 0,1–20.

Eventos con nueve jefes compatibles a través de los directores nativos (arena correspondiente y oleada 10), Set perseguible y recompensa cosmética. Tickets autenticados, snapshot de condiciones al entrar, duración mínima, confirmación de victoria y concesión idempotente durable. Host e invitado reciben la confirmación incluso si el snapshot elimina el jefe muerto. La Alpha conserva autoridad de simulación del anfitrión; estos recibos no se presentan como anticheat competitivo.

Chat global autenticado con límites, texto seguro, marca OWNER y mensaje fijado. El CI detectó una pérdida de foco al enviar que impedía cerrar con Escape: se corrigió con captura de teclado activa sólo mientras el diálogo está abierto y restauración de foco. Noticias, banners y mensajes destacados programados. Polling acotado fuera del combate; las ventanas se limpian al cerrar. La administración puede regalar cosméticos existentes individualmente o a todas las cuentas con progreso, con reporte de conflictos y faltantes.

Reset de una cuenta por campos: progreso de campeones, arenas, oro, inventario, cosméticos y Códice. Vista previa, frase exacta, token de un uso con caducidad, respaldo durable previo y CAS. También admite selección de cuentas o lote global de hasta 100, preflight de versiones y snapshots de todas antes de mutar. Los resultados parciales se registran y nunca se anuncian como transacción atómica global. Inventarios heredados y maestría real se limpian; no se reviven desbloqueos por migraciones. Si se conserva el equipo/colección de un Set, su recompensa puede recuperarse: la vista previa lo advierte.

Persistencia file atómica y adaptador PostgreSQL con tablas aditivas. Backups separados del estado operativo para no reescribir megabytes en cada evento. PostgreSQL real aislado: PASS de esquema aditivo, autenticación, CAS entre pools, locks, rollback con snapshot y persistencia tras reinicio. Contratos, límites y despliegue: `docs/production/operations.md`.

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
| Colección | 32 apariencias, 7 historias; pureza, regalos, red y unlock tras venta PASS |
| VFX pools | 10.000 casts, prioridad, expiración y reset PASS |
| Audio | 49 checks PASS; sin clipping/NaN; p95 en partida 0,3 ms para SFX |
| Combate/VFX | 296 checks, 76 habilidades, 57 simulaciones × 150 s, cero excepciones |
| Stress | 18 checks; 58,2 FPS en Chromium headless 844×390, 30 enemigos; no certifica móvil real |
| Balance entrada | Referencia PASS; 19 registrados, 1 candidato, 3 simulaciones PASS |
| Servidor | Relay, cuentas, ranking y trades PASS; Game Master y seguridad 127 checks + 15 OWNER PASS |
| Editor niveles anterior | 15 comprobaciones PASS |
| UX existente | 218 checks PASS, sin errores en ejecución final |
| Cooperativo vigente | 4 clientes, 11 checks PASS |
| Entrenamiento | 844×390 y 667×375; nueve pasos, persistencia, pausa, salida y timeout PASS |
| Game Master UI | Permisos, payloads, XSS, confirmación y bounds 667/844/1440 PASS |
| Servicios Alpha | Offline, multiplicadores scoped, privacidad, opt-out, cola acotada, chat/noticias literal y orientación PASS |

Evidencia detallada de audio, simulaciones, perf y multiplayer: `docs/production/quality-evidence.md`. Los tests de navegador se ejecutaron con Chromium headless y API local o mock declarada. Se revisaron capturas representativas, no miles de imágenes redundantes. No son usuarios humanos ni dispositivos físicos.

Perfiles reproducibles: novato (`training-test`), explorador/speedrunner/caótico (`navigation-profiles`), coleccionista (`browser-collection`) y multiplayer (`tools/ux/online.js`). Incluyen salidas, reload, rotación, rechazos, conflictos y spam; no sólo caminos exitosos.

## Segunda iteración: cierre verificado y límites externos

| Sistema | Corrección y evidencia |
|---|---|
| Skins Myla/Ynara | Arte original en 46 poses; 2 rechazadas y fuera de animaciones. 67 checks de render/remap/legado; cromas conservadas, sin poder adicional. |
| Eventos | 9 controladores nativos simulados; tickets, rewards, reintentos, expiración, Set y host/guest probados. |
| Operaciones | 127 checks GM + 15 OWNER. Lotes con snapshots/CAS y cohortes por participación real o fecha de alta. |
| Economía | Precios efectivos en oro para objetos, campeones y cosméticos; paquetes atómicos y quote protegido frente a cambios durante confirmación. 26 assertions. |
| PostgreSQL | Instancia efímera real, dos pools, concurrencia y reinicio. Gate `server/test-postgres.js`, requiere DB localhost vacía `horda_test_*`; jamás usa DATABASE_URL productiva. |
| Onboarding | Guía no saltea pasos tras grandes saltos de XP. Entrenamiento por joystick/botones reales PASS 844×390 y 667×375; robot rápido ≈35 s, no estimación humana. |
| Legibilidad | Texto con rectángulos medidos, reserva de avisos y curación; 70 etiquetas concentradas sin solape, p95 0,2 ms en Chromium. |
| Multiplayer | Suite histórica reparada: 51 checks/2 jugadores y 72/4 jugadores con quinto rechazado. |
| Balance/soak | 48 muestras rol/arena/seed + 48 ciclos (120 min virtuales), sin excepciones/outliers de 2×; no se homogeneizan kits sin evidencia. |
| Cuentas | Tokens/API y CAS aislados por servidor; invitaciones no redirigen credenciales. Sesión antigua retenida sin resucitar logout. Regresión multidispositivo/offline/conflictos/beacon PASS. Regalos iniciales ya no crean falso conflicto. |

### Servidores y NanoGM

Verificación directa el 3 de octubre UTC / 2 de octubre Argentina:

- Principal: `https://fondalstudios.com/la-horda/jugar/`, relay `wss://fondalstudios.com/la-horda/red`. API informa `store:file`, `persistent:true`. Se sirve mediante Fly.io. No se asume que esos archivos sean compartidos con Render.
- Anterior: `wss://la-horda-relay.onrender.com`, servicio Render `srv-dara1grncjis73cml3jg`, PostgreSQL persistente. Sigue la rama histórica `claude/horda-latest-updates-gv4tlf`; se conserva explícitamente como entorno anterior, sin borrar cuentas.
- URLs manuales o túneles: categoría de pruebas visible. No se encontró una URL de túnel distinta; no se atribuye identidad/latencia a un servicio sin evidencia.
- `NET_CONFIG` ahora usa Fondal como principal. No hay fallback automático entre almacenes. La UI muestra el entorno y enlace a la Alpha principal; cuentas previas de Render no se transfieren silenciosamente.
- `server/operator-config.json` designa **NanoGM**, exclusivamente en servidor. Al arrancar se resuelve el ID de una cuenta ya existente; si falta, el acceso falla cerrado y el nombre no puede registrarse para capturar OWNER. ADMIN_USERS explícito conserva precedencia como configuración operativa.
- **Bloqueo de publicación real:** los conectores disponibles administran GitHub y Render; no ofrecen acceso al alojamiento Fly.io de Fondal. Se inspeccionaron servicios, fuentes disponibles e historial, sin hallar acceso administrativo ni configuración de despliegue de Fondal. No se inventaron credenciales, no se eliminó ningún servidor y no se cambió la base. El código de NanoGM queda listo para su siguiente despliegue, pero no se afirma que el servidor público ya lo haya activado.

### Límites que no se pueden certificar con este entorno

- iPhone/Android físicos: las pruebas de tamaños móviles, Chromium/WebKit y sesiones virtuales no miden temperatura ni rendimiento del hardware real. No hay dispositivo físico conectado.
- Balance competitivo: los muestreos detectan fallos y outliers evidentes; la tasa de victoria humana y retención se evalúan con la telemetría real de Alpha. No se fabrican resultados.
- Factory: scaffold, contratos, auditoría, importadores de arte y gates ejecutables; la generación artística se realiza con imagegen y revisión visual. No se promete que un scaffold produzca automáticamente un campeón terminado sin esos pasos.

## Reproducción y entrega

- `npm ci --prefix server && npm test --prefix server`
- `node tools/factory/test.js`
- `node tools/collection/check-collection.js`
- `node tools/alpha/services-test.js` y `node tools/alpha/account-environments.js`
- `node server/test-owner-policy.js`; PostgreSQL aislado: `HORDA_TEST_PG_URL=postgres://.../horda_test_operations node server/test-postgres.js`
- `python3 tools/art/alpha_set_skins/check.py` y `node tools/art/alpha_set_skins/browser.js`
- `node tools/quality/test-vfx-pools.js`
- `node tools/balance/check-entry-reference.js` y `node tools/balance/entry-gate.js`
- Servir repo en 8805; ejecutar tests `tools/alpha/*` de navegador y `tools/collection/browser-collection.js` con Playwright. `SITE` permite puerto alternativo, `CHROMIUM_PATH`/`CHROME` permiten ejecutable instalado.

El workflow existente incorpora los nuevos gates; no reemplaza los útiles. Commits por grupos coherentes y PR contra main; el SHA de merge se verifica externamente después del merge, no se inventa dentro de este documento antes de existir.
