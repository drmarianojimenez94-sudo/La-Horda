# Auditoría integral de apariencias — 3 de octubre de 2026

Base auditada: `5ea759d` de main. 19 campeones, 32 apariencias registradas en el catálogo real. Se revisaron los atlas cargados, no solo las ilustraciones de las tarjetas.

## Resultado

- 13 recolores puros: reemplazados por 13 diseños independientes, 312 poses de cuerpo + 24 de caballería + 12 de berrinche = 348 cuadros.
- 19 skins con vestuario/silueta propios: preservadas. Cinco recibían un recoloreado procedural posterior; se desactiva mediante `preserveAuthoredArt` en el registro y su generador.
- No se elimina ninguna compra: se mantienen los IDs, `save.cromas`, selección, precio de oro y derechos históricos de Myla/Ynara. La presentación ahora distingue SKIN de CROMA mediante `appearanceType`.
- Sin cambios en habilidades, daño, radios, estadísticas, talentos ni equipamiento.

## Recolores reemplazados

| ID | Antes | Diseño nuevo | Gate |
|---|---|---|---|
| `tanque_ancestral` | Recolor puro | Armadura de corteza, hombreras de raíces, escudo roble y espada de hoja | PASS |
| `tanque_juicio` | Recolor puro | Armadura catedralicia, casco abierto coronado y escudo de balanza | PASS |
| `nigromante_escarcha` | Recolor puro | Sudario invernal, collar de piel, costillas óseas y urna entre astas | PASS |
| `nigromante_piedra` | Recolor puro | Abrigo de excavación, máscara funeraria elevada, llaves y tablillas | PASS |
| `libertador_escarcha` | Recolor puro | Poncho andino, bicornio de piel, polainas y caballo con alforjas | PASS |
| `libertador_ancestral` | Recolor puro | Sombrero de campaña, capa exploradora, bandoleras y montura de monte | PASS |
| `segador_escarcha` | Recolor puro | Máscara de hierro, hombros de hielo, capucha de piel y guadaña tallada | PASS |
| `musashi_ancestral` | Recolor puro | Armadura lamelar, capa de paja, kasa a la espalda y dos filos de jade | PASS |
| `profeta_ancestral` | Recolor puro | Corona de ramas, velo de hojas, amuletos de bellota y báculo semilla | PASS |
| `cazadora_escarcha` | Recolor puro | Capucha de ave polar, manto de plumas, botas de piel y arco de asta | PASS |
| `axiom_piedra` | Recolor puro | Manto geométrico, placas grabadas, tocado mecánico y báculo hexagonal | PASS |
| `myla_arandanos` | Recolor puro | Boina de arándano, vestido de pétalos, cesta y cucharita | PASS |
| `ynara_celeste` | Recolor puro | Gafas de vuelo, chaqueta alada, pañuelo y botiquín de rescate | PASS |

## Skins preservadas

| IDs | Clasificación visual | Decisión |
|---|---|---|
| `manada`, `errante`, `legion`, `sistema`, `profecia`, `marea`, `nocturno` | Diseños propios elaborados: ropa, armas y siluetas diferentes de la base | Conservar los atlas existentes. Sus ilustraciones promocionales son más detalladas que los sprites; no son evidencia de recolor. |
| `convergencia`, `custodio` | Diseño propio ornamental con alas y vestimenta | Conservar. |
| `baluarte`, `granadero` | Diseño propio relativamente sencillo: armadura/escudo y uniforme ceremonial | Conservar; sencillez no equivale a recolor. |
| `requiem` | Diseño propio: corona, ropa funeraria y báculo | Conservar. |
| `ultimo_turno`, `juramento_roto`, `vidrio_negro`, `lumbre_persistente`, `hilo_umbral` | Diseños propios que eran recoloreados de nuevo al cargar | Conservar dibujos y restaurar sus paletas autorales y nombres. |
| `merienda_magica`, `santa_paciencia` | Diseños propios recientes: pastelera y médica de santuario | Conservar; sus variantes históricas independientes se rediseñan arriba. |

## Validación

- `tools/art/unique_skins/check.js`: 1.881 comprobaciones, cero fallos, cero errores de página. Atlas propios, cuadros activos no vacíos, alfa binario, cuatro orientaciones, dibujo, clasificación, compra histórica, loadout de todos los IDs y estadísticas iguales.
- `tools/items/t_cromas.js`: compra, propiedad, precio, selección, guardado, rechazo de IDs ajenos/inexistentes, loadout, tienda y Códice; PASS. Aserciones actualizadas para las skins con grilla propia y silueta distinta.
- `tools/collection/browser-collection.js`: filtros, preview sin cambios en guardado, pureza cosmética y fuentes de sets; PASS en 844×390 y 667×375.
- `tools/collection/check-collection.js` y `tools/balance/check-entry-reference.js`: PASS.
- Inspección de carga/marcha/carga de caballería/desmontaje y berrinche con el renderer real: 13 rutas, PASS.
- Gate visual manual PASS de las 13 skins nuevas; evidencia en las imágenes adjuntas.

Límites: las pruebas se ejecutaron en Chromium de escritorio con viewports móviles; no se afirma prueba en iPhone físico ni una nueva partida multijugador con dispositivos reales. Se verificó el contrato de loadout de todos los IDs. Las skins existentes preservadas no reciben una nueva certificación artística global.

## Reconstrucción

`python3 tools/art/unique_skins/build.py` importa las fuentes conservadas en `art-source/unique-skins`. Solo segmenta siluetas dibujadas, limpia alfa, escala uniformemente por vecino más cercano y alinea pies. Los tres primeros diseños generados con filas adicionales seleccionan explícitamente frente/perfil/espalda en `manifest.json`; no se inventan cuadros.

`PLAYWRIGHT_EXECUTABLE_PATH=/ruta/chromium SE_BASE_URL=http://127.0.0.1:8788 node tools/art/unique_skins/check.js` regenera evidencia y valida contratos. El workflow de PR incorpora esta comprobación.

Los atlas se cargan a pedido y usan metadata propia. `CROMA_SKINS` sigue siendo el nombre interno por compatibilidad del guardado; la UI muestra Skin y el catálogo informa `SKIN`. Los generadores históricos pueden reproducir las fuentes antiguas sin revertir el override final `unique-skins-meta.js`.
