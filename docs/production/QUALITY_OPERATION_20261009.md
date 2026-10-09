# La Horda — operación de calidad, 9 de octubre de 2026

## Estado verificable

Auditoría inicial de main: `82fe9af06cff48f9069dbed340f5fa8e772bd055`.
PR #73 y #75 ya integrados; #74 abierto. El repositorio tiene 38 campeones registrados,
fábrica, Art Bible, balance por rol y medición dinámica de habilidades existentes.
No se duplicaron esos motores. Esta ejecución **no completa el alcance comercial**.

- **#76:** migración de talentos corregida respecto de #74; no hay reinicios históricos
  automáticos por faltar banderas; perfiles nuevos versionados; respaldo de nodos viejos;
  maestría y sus compras preservadas; caché invalida al cruzar 40 y 90; puntos limitados
  a nivel 99; respec devuelve solo nodos ordinarios. Pruebas reales de guardado/nube.
- **#77:** fábrica ejecuta Talent/Ability/resource/passive gates; gate artístico rechaza
  imágenes vacías, corruptas, tamaño incorrecto y cualquiera de las 36 celdas ausente.
  Modo global estricto propaga fallos. Regresiones de Expedición e Ynara actualizadas
  para exigir talentos bloqueados antes de 40, no para habilitarlos prematuramente.
  La lista ejecutable de gates queda separada de la evidencia versionada de manifiestos
  schema 1; los diez contratos existentes conservan sus requisitos originales.
- **#78, draft:** diez recetas artísticas y tres elementos reutilizables, reproducibles
  por fábrica. Sin integración a catálogo, sin habilidades nuevas, sin Art Gate aprobado.

Consultar GitHub para el estado final de merges; este archivo documenta evidencia,
no usa la mera existencia de un PR como prueba de integración.

## Pruebas ejecutadas localmente

| Verificación | Resultado y alcance |
|---|---|
| Talent Gate | PASS: niveles 1/39/40/60/90/99, recarga, migración one-shot, nube y respec |
| Factory contract | 27/27; incluye controles negativos y compatibilidad de evidencia schema 1 |
| Referencia de balance | PASS, sin cambiar knownChampions |
| Balance Gate | PASS: 38 registrados, 20 candidatos existentes, 60 simulaciones de 150 s |
| Ability Gate diferencial | 38 campeones, cero FAIL nuevos, cero page errors; clásicos con INFO |
| Recursos de habilidades | 3.366 checks, cero fallos; excepciones por estados de kits explícitas |
| Pasivas clásicas | PASS: aura, sangrado, reacción elemental, cura y tope de energía |
| Ascensión | 225/225: kits, arenas, jefes, invocaciones, límites y limpieza |
| Expedición | 254/254 tras corregir expectativas de talentos previas a #73 |
| Ynara | 38/38 tras exigir bloqueo de talento a nivel 20 y activación en 40 |
| Nube y NanoGM | PASS: 26 checks en navegador, CAS, respaldos, conflicto, owner y fallos de servidor |
| Multijugador UX | PASS, sin errores de página; cuatro loadouts de campeón único |
| Guerras de Cristales | PASS: cuatro clientes, equipos, movimiento, habilidades, entradas hostiles, reconexión, revancha y pérdida de host |
| Servidor | npm test PASS: relay, cuentas, intercambios, GM, owner, fundadores, presencia y billetera |
| Estilo numérico | PASS del roster cubierto; formatos ajenos omitidos explícitamente |
| Art Gate completo | NO APROBADO para los cinco nuevos; falta revisión animada y escala real |

Evidencia seleccionada en `docs/quality/2026-10-09/`. Chromium local 153 headless;
CI usa la versión declarada en el workflow. WebKit/PostgreSQL de #76 pasan en CI;
la suite completa debe seguirse hasta su resultado final. Emulación ≠ iPhone físico.

## Rendimiento: corrección en PR #79

Estrés local de Ascensión: 150 enemigos, seis segundos de lanzamiento repetido por
campeón, viewport 844×390. Diez campeones, sin errores de página. NanoGM: p50 99,9 ms,
p95 116,6 ms; FacuGM: p95 33,3 ms; los otros ocho: p95 16,7–16,8 ms.
El script pasa sus límites de entidades/partículas, pero no exige un presupuesto de FPS.
Por ello **no equivale a aprobar rendimiento**. NanoGM repitió p95 100,1 ms después
de otro campeón. Aislamiento: quitar composición del escenario no ayudó; limitar el
filtro al sprite (sin repetirlo por cada trazo de alas/conductos) dio p95 33,4 ms.
PR #79 implementa esa corrección: estrés completo repetido, p50 16,7 ms / p95 33,4 ms,
225/225 controles funcionales y prueba de ambas apariencias/contexto gráfico pasan.
Revisión visual realizada. Integración pendiente de CI. Evidencia antes/después en
`docs/quality/2026-10-09/performance.json` y `performance-after.json`. No son mediciones
de teléfono físico ni garantizan 60 FPS sostenidos.

## Producción y seguridad

El cliente apunta a `wss://fondalstudios.com/la-horda/red` y presenta como alpha principal
`https://fondalstudios.com/la-horda/jugar/`. Render `la-horda-relay.onrender.com` está
identificado en código como legado. No se cambiaron endpoints, infraestructura, permisos,
cuentas, guardados reales, billeteras ni secretos. El chequeo HTTP al servidor canónico
agotó 20 segundos desde este entorno: **estado real y sesión NanoGM no confirmados**.
Las pruebas locales de NanoGM no se presentan como login a producción.

Observación: el workflow `Live check` sigue apuntando al relay legado. Antes de modificarlo,
confirmar accesibilidad y qué pruebas crean estado en producción; añadir monitoreo canónico
solo de lectura. No redirigir tests con escrituras a cuentas reales indiscriminadamente.

## Economía

IDs conservados: `brasas`, SKUs y endpoints intactos. Tests de billetera 65/65: propiedad,
firmas, idempotencia, repetición, paquetes y compras. `server/payments.js` mantiene pagos
apagados por defecto; no se configuró proveedor ni se activaron cobros. El adaptador HMAC
existente no sustituye integración ni conciliación con un proveedor real.

Éter ✦ queda como propuesta de marca, sin migrar identificadores. Si se adopta, cambiar solo
etiquetas de presentación, agregar prueba de billeteras antiguas y mantener IDs persistentes.
Los precios de `premium-packs.json` son precios internos sugeridos, **no una investigación
de mercado realizada en esta sesión**. Revisar cosméticos por oro, paquete de bienvenida,
retención y percepción de equidad antes de aprobar economía comercial. Ningún poder exclusivo
se agregó ni se activaron campañas pagadas.

## Evaluación provisional de preparación (no calificación de diversión)

Escala 0–100: 100 exige implementación, pruebas funcionales, regresión, producción y prueba
representativa con jugadores/dispositivos. Son juicios técnicos limitados a lo observado.

| Sistema | Estimación | Brecha principal |
|---|---:|---|
| Persistencia | 75 | Producción y más historiales reales no verificados |
| Talent Gate | 70 | Transformaciones profundas y previsualización para todo el roster |
| Ability Gate | 70 | Duraciones, todas las pasivas y PvP exhaustivo aún faltan |
| Fábrica artística | 60 | Los números no certifican identidad; revisión animada y escala |
| Cinco campeones nuevos | 15 | Solo producción visual candidata; ningún kit nuevo jugable |
| Multijugador | 75 | Cuatro clientes locales pasan; falta red móvil real y carga prolongada |
| UI/onboarding | 65 | Regresiones móviles parciales; falta estudio de uso y retención |
| Game Master | 75 | RBAC/owner local probado; acceso de NanoGM real no comprobado |
| Monetización comercial | 25 | Proveedor, revisión legal, conciliación y mercado pendientes |
| Comunidad | 20 | Plan preparado; canales y operaciones no publicados |
| Rendimiento físico | 0 | Sin evaluación en dispositivo físico; 0 es ausencia de validación |

No existe una nota global defendible de 10/10 a partir de estas pruebas.

## Backlog ordenado para retomar sin repetir

1. Cerrar CI de #76/#77 y resolver cualquier fallo; merge con SHA esperado y smoke posterior.
   #74 queda sustituido por #76, no volver a aplicar su migración destructiva de maestrías.
2. Cinco kits completos con pasivas y tres ramas transformadoras. Implementar primero
   Solciju (fermentación, barricas, vino maldito, Gran Reserva); luego Brakk, Veyra, Morveth,
   Aelith. Pruebas de daño, duración, cooldown, límites por dueño, muerte, arena y red.
3. Completar identidad visual de las diez recetas de #78, animación y escala frente al
   Caballero; solo después integrar atlas, Códice, maestrías y catálogo. No convertir DRAFT
   a RELEASED para eludir balance ni usar knownChampions como excepción.
4. Auditar presupuesto del árbol: transformaciones accesibles con 30 puntos máximos,
   requisitos, opciones irreversibles y previsualización de cambios por campeón.
5. Confirmar despliegue canónico, almacenamiento durable y NanoGM con sesión autorizada.
   Antes de cualquier restauración o migración real, verificar respaldos.
6. QA iPhone 13 Pro físico, Android y desktop: FPS p95, memoria, calor, pantallas verticales,
   carga lenta, pestaña suspendida, desconexión. PvP/cooperativo con red real y bots.
7. Economía y antifraude de producción; mantener cobros apagados hasta autorización específica.
8. Activar plan comunitario de `COMMUNITY_ALPHA_20261009.md` cuando haya canales verificados.
