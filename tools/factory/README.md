# Champion Factory

Pipeline de incorporación, sin generación ficticia de arte ni cambios silenciosos del roster.

```sh
node tools/factory/cli.js new guardian docs/production/guardian.json
node tools/factory/cli.js validate docs/production/guardian.json
node --test tools/factory/test.js
node tools/factory/cli.js gate reference
node tools/factory/cli.js gate all
```

`new` no sobrescribe archivos. Completar concepto, kit y referencias al código real; producir arte y previews usando el estilo de `docs/ART_BIBLE.md`. Completar revisión de estilo con reviewer/evidencia y SHA-256 del atlas (la huella impide reutilizar una aprobación de otro atlas por accidente). PNG: se valida encabezado/grilla, no decodificación ni contenido de cada frame. Revisar visualmente thumbnails, clipping y animación. `validate` devuelve **INCOMPLETE** o **STRUCTURAL_PASS**, nunca permiso de merge. Un archivo de evidencia existente no demuestra que la prueba pasó: ejecutar gates sobre el commit candidato.

Los gates reutilizan herramientas de balance, visual, audio, red y FPS. Requieren Playwright/browser y, según script, servidor local: consultar sus cabeceras. Se ejecutan en serie para evitar colisiones de puertos existentes. `all` se detiene ante el primer fallo y devuelve código no cero. No modificar `knownChampions` para saltar normalización/entrada.

El contrato exige tres skills + ultimate, horda útil, talentos/maestría/Códice, atlas/previews, skin/croma/Set, lore de apariencia, límites de entidades y evidencias. Tiene rechazo de huérfanos, recolors clasificados como skins, referencias rotas, cambio de estadísticas por cosmético, frame grid incompatible y recompensa de Set inválida. No puede inferir calidad de lore, arte o game feel de JSON. Registros existentes no se convierten automáticamente a este contrato; el retrofit debe conservar identidad y usar evidencia real.

Flujo: generar → completar → implementar → validar contrato → test específico de kit → simular → revisar visual/audio → medir performance → probar cooperativo → reparar → repetir → aprobar. El pipeline no autoescribe código de habilidades ni assets; automatiza tareas repetibles y hace explícitos los huecos del paquete. Los manifiestos de candidatos incompletos no se registran en runtime.

Auditoría del roster actual (servidor local ya levantado):

```sh
FACTORY_BASE_URL=http://127.0.0.1:8750 node tools/factory/audit-roster.js docs/production/roster-audit.json
```

Lee registros inicializados, incluidos módulos tardíos, y detecta kits incompletos, descripciones/cooldowns ausentes, lore, talentos y Sets faltantes. La detección de AoE por radio/cadenas es solamente un indicio: requiere simulación de gameplay. El informe no convierte registros heredados en paquetes aprobados.

Prueba de eventos sobre motor real (API y reloj simulados, no reemplaza tests server):

```sh
FACTORY_BASE_URL=http://127.0.0.1:8805 node tools/factory/event-runtime.js
```

Los eventos con jefe seleccionan el encuentro nativo de su arena (nueve directores aprobados, nivel 10), no trasplantan controladores contextuales a mapas incompatibles. Hielo exige derrotar la forma final. El Set configurado dirige tiradas de Set y garantiza una pieza al derrotar al jefe durante el evento. La recompensa cosmética requiere ticket de cuenta, victoria final y validación temporal/objetivo del servidor; tiene retry en Resultados y propiedad idempotente. Los recibos ya ganados sobreviven a recargas en una cola local de hasta 20 por servidor/cuenta (sin sesión ni token); se restauran al entrar y se eliminan al confirmar, invalidarse o vencer. `node tools/alpha/event-receipts-test.js` prueba persistencia, cambios de cuenta/servidor y reintentos. Esto no es anticheat autoritativo: la simulación Alpha sigue en el cliente/host. El servidor valida permisos, catálogo, cuenta, ticket y repetición. Los multiplicadores temporales expiran sin sobrescribir configuración normal.
