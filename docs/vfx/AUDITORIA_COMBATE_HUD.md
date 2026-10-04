# Auditoría de habilidades, VFX y HUD

Base: `66a0296` de `main`, consultada el 1 de octubre de 2026. Roster: 18 campeones,
72 poderes base. Incluye registros, dispatch de habilidades, renderizadores de campeones,
zonas e invocaciones, pools de VFX, eventos de red y HUD/input. No es una auditoría de
seguridad del servidor ni de cada archivo de arte del repositorio.

## Hallazgos y criterios

1. La presencia de varios estallidos dependía demasiado del talento: a nivel inicial
   solo quedaban anillos y partículas discretas. Se refuerza su base; siguen creciendo con talentos.
2. El Muro de Fuego se dibujaba comprimido al 62% vertical, pero dañaba por distancia
   circular. Ahora tanto los límites como las llamas coinciden con el anillo real.
3. El Torbellino dibujaba remolinos pequeños independientes de su radio efectivo.
   Ahora sus arcos siguen `spinRadius`; el Cataclismo muestra tres arcos elementales
   siguiendo `stormRadius`, además de sus rayos, novas y armadura existentes.
4. Los nuevos campeones compartían círculos/líneas tenues. Se añaden contornos oscuros,
   siluetas de zona y conos de vapor/catalizador/luz en la dirección calculada por el poder.
5. Controles marrones y semitransparentes se confundían con escenarios cálidos. Ahora
   tienen superficie propia, bordes, relieve, colores de función y estados no solo cromáticos.
6. El HUD asumía alturas fijas. El cálculo usa altura real de vida, recursos y arena.
   En el Nigromante se corrigió un recorte de aliados detectado durante QA móvil.

Una habilidad vistosa debe comunicar quién lanzó, dónde actuó y qué identidad tiene.
Los sellos elevados son firmas cosméticas de lanzamiento, **no nuevas áreas de daño**.
Los enemigos conservan sus avisos peligrosos; no se añade un relleno opaco a toda la pantalla.

## Revisión por campeón

| Campeón | Habilidades de referencia / prioridad | Mejora aplicada |
|---|---|---|
| Tanque | Torbellino, gritos | Arcos al radio real; firma de escudo; estallidos base reforzados |
| Asesino | Corte Sangrante, Triple Golpe, Trampa | Se conservan sprites de impacto; firma de filos y estallidos más visibles desde talento 0 |
| Mago | Muro, Nova, Cadena, Cataclismo | Llamas y anillo correcto; cristal radial; rayo con núcleo y contraste; tres arcos de tormenta |
| Soporte | Curación, escudo, bendiciones | Firma alada y estallidos base reforzados; mantiene curación y escudos existentes |
| Segador | Tajo, furia, definitiva | Firma de guadaña y refuerzo de estallidos; conserva tajo y cosecha existentes |
| Axiom | Error 404, Reescritura, teleport, definitiva | Firma geométrica glitch; conserva zonas y movilidad, sin nuevas inmunidades |
| Profeta | Destino, Visión, Danza, Ascensión | Firma de ojo y estallidos base más claros; no altera fusión ni protección |
| Musashi | Corte, Paso Fantasma, Mil Cortes, Duelo | Firma de filos; conserva movilidad y arena de duelo |
| Cazadora | Flecha, trampa, lluvia, cacería | Firma de flechas; conserva lluvia persistente y lobo |
| Nigromante | Cosecha, gólem, plaga, transformación | Firma de cráneo; conserva invocaciones/plaga; recursos compactos y todos los aliados visibles |
| Libertador | Bayoneta, granaderos, montura, definitiva | Firma solar; conserva efectos propios y desplazamiento |
| Eren | Gancho, instinto, avance, titán | Firma de filos; preserva íntegramente gancho, avance y transformación |
| Myla | Yogurazo, Burbuja, Berrinche | Gotas como firma y marcadores de charco; conserva torre y transformación |
| Brasa | Purga, torreta, sobrecarga | Cono direccional de vapor; corona de sobrecarga en las torretas |
| Eslabón | Cadena, línea, Custodia, anillo | Firma de eslabones y líneas/aros con contraste |
| Morwen | Resina, Sal, Alambique | Cono de catalizador; firma de gotas y marcas geométricas del alambique |
| Farolero | Destello, senda, Vigilia | Cono de luz; firma solar; cruces de luz en la zona del farol |
| Iria | Anclas, Tensión, Corte, triángulo | Firma triangular; hilos con borde oscuro y anillos legibles |

No todos recibieron un kit nuevo: los efectos que ya tenían identidad se conservaron.
El refuerzo universal es una firma de lanzamiento, no un reemplazo del efecto funcional.
No se sustituyeron atlas de personajes ni se generaron nuevas ilustraciones: los añadidos
son dibujos Canvas en capas VFX, compatibles con la sección 7 de `docs/ART_BIBLE.md`.
El gate técnico y de estilo de personajes no se declara aprobado para assets que no se tocaron.

## HUD y controles

- Vida/escudo y energía arriba a la izquierda; recursos exclusivos de clase debajo.
- Arena, ronda, bajas, reloj y regla en un bloque compacto inmediatamente debajo.
- Aliados debajo, con modo compacto cuando la altura lo exige; sin quitar aliados.
- Pausa/sonido arriba a la derecha, blancos de 44px. Sonido usa texto y estado accesible,
  evitando glifos emoji ausentes en el navegador de pruebas.
- Carga de definitiva junto a los botones de combate. Jefe permanece arriba al centro.
- Ataque ámbar, poderes cian/lila/menta, definitiva dorada y curación verde.
- Recarga con barrido y segundos; falta de energía con borde discontinuo y símbolo;
  efecto activo con punto verde. Se corrigió la cifra de recarga vacía en el estado activo.
- Se conservan ataque, tres habilidades, ulti, revivir/acción contextual, cura, Pacto,
  joystick, pausa, sonido y botones de inversión de puntos. No cambia el mapeo de input.

## Balance y límites de verificación

Sin cambios en daño, costes, recargas, estadísticas, talentos, control ni movilidad.
Se respeta `BALANCE_CAMPEONES.md` y se mantiene intacta la referencia por rol.
El objetivo de esta tanda es lectura y sensación, no homogeneizar el DPS.

Se ejecutaron 54 simulaciones del motor real: 18 campeones × semillas 117/431/991,
150 segundos, Bosque, nivel 20, sin equipo y cuatro puntos por habilidad/ulti.
No hubo excepciones ni daño no finito. Son regresiones, **no una demostración de balance
competitivo**: solo tres muestras, una arena y un autopiloto. Los efectos aleatorios
existentes pueden consumir azar y alterar el recorrido de las semillas sin cambiar fórmulas.
No se sustituyen las medias aprobadas de referencia con estas muestras.

También: 72 lanzamientos base, 282 comprobaciones de VFX/HUD y 98 comprobaciones de
regresión de portadores/Myla (incluyen jefes, invocaciones, resets y diez arenas).
La validación nueva de red serializa y reproduce los tres eventos añadidos; **no es una
partida online de dos dispositivos**. Los perfiles móviles se prueban en Chromium con
844×390 y 667×375, más escritorio 1280×800; no sustituyen una prueba real en Safari/iOS.

Pools nuevos limitados a 32 efectos, con prioridad para definitivas, expiración y reset.
La firma sigue dibujándose aunque el presupuesto de partículas baje. Los tres eventos
nuevos se conservan frente al recorte de eventos cosméticos de red (con techo de seguridad).
Se respeta reducir
movimiento en el crecimiento de firmas y en animaciones nuevas del HUD. Falta medir FPS
en un iPhone real con cuatro jugadores y oleadas avanzadas; no se afirma una mejora de FPS.

## Evidencia y reproducción

- `combat-audit-results.json`: resumen consolidado.
- `combat-visual-results.json`: comprobaciones finales, geometría y lista de 72 habilidades.
- `combat-results.json`: 54 simulaciones (previas al ajuste final de compactación/sonido
  y culling/retención de eventos cosméticos; sin cambios posteriores en las fórmulas de juego).
- `myla-regression-results.json`: 98 checks y tres simulaciones adicionales de regresión.
- `hud-<campeón>-<ancho>.png`: capturas reales del juego con 70 enemigos.

```sh
node tools/balance/check-entry-reference.js
node tools/balance/entry-gate.js
node tools/vfx/audit-combat.js
node tools/vfx/audit-combat.js --quick
node tools/portadores/test-myla.js
cp docs/portadores/myla-simulation-results.json docs/vfx/myla-regression-results.json
node tools/vfx/summarize-results.js
```

Se necesita Playwright y Chromium. `CHROMIUM_PATH` selecciona un ejecutable existente.
El test de portadores actual escribe su salida en `docs/portadores`; en esta tanda se
copió la evidencia nueva a `docs/vfx` y se conservaron las referencias aprobadas originales.

Antes de integrar: revisar capturas, CI de la rama y una partida real en iPhone, especialmente
el HUD del Nigromante, el apuntado al arrastrar, revivir y los avisos de jefe.
