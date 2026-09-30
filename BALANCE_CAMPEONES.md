# Referencia de balance de campeones — La Horda

Fecha: 30/09/2026. Base del trabajo: `72a6cb701d9ee159153b72f14299c63804cf2741`.

## Criterio

Comparar campeones por rol y utilidad: un soporte no necesita el DPS de un mago y un tanque no necesita el alcance de una tiradora. El objetivo es mantener opciones viables y diferencias de identidad. Los cosméticos no modifican daño, defensa, alcance ni recargas; los bonus de sets sí son parte del equipamiento.

Este archivo es la referencia para futuras tandas. Cambiar los datos en `js/data/champions.js`, `js/data/portadores.js` o `js/data/champion-tuning.js`, repetir las pruebas y actualizar esta tabla. Evitar multiplicadores globales para resolver problemas de un solo campeón.

## Estadísticas de nivel 1, sin objetos

DPS básico nominal = daño base × 1000 / recarga. Es orientativo: no incluye críticos, armadura, proyectiles perdidos, combos, pasivas, transformaciones ni crecimiento por nivel.

| Campeón | Rol | Vida | Daño base | Defensa | Velocidad | Alcance | Recarga básica ms | DPS nominal |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| Tanque | Tanque | 150 | 9 | 18% | 150 | 78 | 620 | 14.5 |
| Asesino | Asesino / tirador | 120 | 13 | 10% | 175 | 64 | 420 | 31.0 |
| Mago | Mago | 95 | 11 | 6% | 155 | 340 | 560 | 19.6 |
| Soporte | Soporte | 105 | 7 | 12% | 165 | 320 | 600 | 11.7 |
| Segador Olvidado | Tanque | 192 | 12 | 22% | 138 | 88 | 640 | 18.8 |
| Axiom | Mago | 92 | 13 | 5% | 158 | 340 | 540 | 24.1 |
| La Profeta | Soporte | 114 | 8 | 14% | 168 | 82 | 520 | 15.4 |
| Musashi | Asesino / tirador | 100 | 11 | 6% | 176 | 60 | 260 | 42.3 |
| La Cazadora | Asesino / tirador | 86 | 9 | 5% | 185 | 300 | 420 | 21.4 |
| Nigromante | Mago | 98 | 9 | 7% | 150 | 320 | 480 | 18.8 |
| El Libertador | Asesino / tirador | 120 | 24 | 10% | 160 | 380 | 1450 | 16.6 |
| Eren | Asesino / tirador | 128 | 11 | 8% | 178 | 84 | 380 | 28.9 |
| Myla | Mago | 100 | 8 | 8% | 162 | 320 | 560 | 14.3 |
| Brasa | Mago | 108 | 10 | 9% | 156 | 310 | 580 | 17.2 |
| El Eslabón | Tanque | 164 | 9 | 20% | 145 | 85 | 650 | 13.8 |
| Morwen | Mago | 96 | 10 | 7% | 164 | 300 | 540 | 18.5 |
| El Farolero | Soporte | 124 | 8 | 13% | 162 | 90 | 590 | 13.6 |
| Iria | Mago | 100 | 10 | 7% | 160 | 320 | 560 | 17.9 |

## Protocolo de las simulaciones

- Motor real en Chromium, sin sustituir las fórmulas de combate.
- 18 campeones × 3 semillas (117, 431 y 991): 54 partidas, horizonte de 150 segundos por partida.
- Bosque, arranque en nivel de arena 1; campeones de nivel 20, sin equipo y con cuatro puntos asignados por habilidad y definitiva. Reliquias reiniciadas.
- Autopiloto existente `tools/balance/autopilot.js`: movimiento, básicos, habilidades, definitiva, selección de buffs y resurrección.
- Equipo: Tanque, Soporte y Mago; si el jugador ocupa uno de esos roles, ese compañero se sustituye por Asesino. Esto evita duplicar exactamente al jugador, pero los equipos no son idénticos entre todos los casos.
- 3 partidas adicionales de Myla después del último ajuste. Total de esta tanda: 57 simulaciones de campaña.
- 98 comprobaciones funcionales: lanzamiento de poderes, talentos, sets, límite de entidades, resistencia de jefes, snapshots, reset, muerte y pruebas de los seis portadores en las diez arenas.

Las semillas fijan el azar de cada simulación, pero los efectos visuales y el tiempo de cuadros pueden consumir azar entre bloques. Son pruebas reproducibles del procedimiento, no replays idénticos bit a bit. Tres muestras por campeón no bastan para demostrar balance competitivo ni la dificultad de toda la campaña.

## Resultados medidos

Daño = daño registrado del jugador, acumulado hasta acabar o llegar al horizonte. Bajas = bajas del grupo, no bajas personales. Sobrevive = jugador con vida al finalizar; no significa victoria de campaña. Para Myla se muestran las tres partidas finales; los otros campeones corresponden a la comparación inicial.

| Campeón | Daño medio jugador | Bajas medias grupo | Con vida al final | Nivel medio arena |
|---|---:|---:|---:|---:|
| Tanque | 11,329 | 489.0 | 3/3 | 5.0 |
| Asesino | 10,908 | 496.3 | 3/3 | 5.0 |
| Mago | 16,567 | 474.0 | 2/3 | 4.7 |
| Soporte | 4,979 | 496.3 | 3/3 | 5.0 |
| Segador Olvidado | 9,895 | 501.7 | 3/3 | 5.0 |
| Axiom | 12,984 | 506.7 | 3/3 | 5.0 |
| La Profeta | 6,908 | 504.7 | 3/3 | 5.0 |
| Musashi | 9,908 | 471.7 | 2/3 | 4.7 |
| La Cazadora | 15,598 | 497.3 | 3/3 | 5.0 |
| Nigromante | 17,223 | 512.3 | 3/3 | 5.0 |
| El Libertador | 10,264 | 502.7 | 3/3 | 5.0 |
| Eren | 17,710 | 514.7 | 3/3 | 5.0 |
| Myla | 18,886 | 508.0 | 3/3 | 5.0 |
| Brasa | 13,169 | 498.7 | 2/3 | 5.0 |
| El Eslabón | 10,286 | 487.0 | 3/3 | 5.0 |
| Morwen | 13,110 | 504.0 | 2/3 | 5.0 |
| El Farolero | 7,676 | 500.7 | 3/3 | 5.0 |
| Iria | 13,063 | 500.0 | 3/3 | 5.0 |

## Myla: ajuste aplicado

Myla es una maga de control sostenido, no una sanadora ni una copia del Mago elemental. Se desbloquea como regalo de alfa al migrar perfiles; no reinicia oro, héroes ni progreso.

| Parámetro | Diseño inicial | Versión integrada |
|---|---:|---:|
| Daño base | 10 | 8 |
| Torre, multiplicador por disparo | 0,65 | 0,50 |
| Yogurazo, multiplicador inicial | 1,10 | 1,00 |
| BERRINCHE, multiplicador por pulso | 0,65 | 0,55 |
| Vida / defensa | 100 / 8% | 100 / 8% |

La comparación intermedia daba a Myla unos 20.740 de daño medio con daño base 9, frente a 16.567 del Mago y 17.223 del Nigromante. Su escudo y control justificaron bajar más el daño. En las tres partidas finales promedió unos 18.886 y sobrevivió 3/3. El Mago superviviente promedió unos 17.635 en sus dos muestras que llegaron al horizonte. La muestra es pequeña: esta es una calibración inicial, no una afirmación de equivalencia estadística.

### Kit final, valores base

- Básico: disparo de yogur; alcance 320, recarga 560 ms.
- **Torre de Yogur:** coste 32, recarga 9 s, duración 12 s. Máximo dos. Dispara cada 850 ms, tiene vida y los enemigos pueden destruirla. Ralentiza 25% por 1 s; jefes limitados a 12%.
- **Yogurazo:** coste 28, recarga 6,2 s, alcance 280, radio 95. Daño inicial ×1,0 y charco de 3,6 s; cada pulso inflige 20% del daño inicial. Máximo tres charcos. Ralentiza 40%; jefes limitados a 12%.
- **Burbuja Cremosa:** coste 26, recarga 10 s, escudo 18% de vida máxima por 4,5 s y limpieza de ralentización. Con tres piezas del set: 24%. El límite general de escudo es 30%.
- **BERRINCHE:** recarga 34 s, duración 6,5 s, radio 180. Cada 600 ms inflige ×0,55; el área sigue a Myla. Ralentiza 35% con resistencia de jefes. Se muestra en pañales, con una escala visual ×1,35, animación de llanto, sonido sintetizado y salpicaduras. La escala visual no cambia su hitbox. Máximo un berrinche. Al morir o reiniciar, desaparece.
- Maestrías, talentos y mods de arena pueden alterar estos valores. Se conserva el piso existente de recarga de definitiva y su bloqueo de autocarga.
- Set **Merienda Mágica:** dos piezas +8% daño de habilidades; tres mejoran Burbuja; cuatro +15% daño de BERRINCHE. Skin: Yogur de Arándanos.

## Decisiones sobre el resto del roster

Se mantienen sus estadísticas en esta tanda. Ningún error de ejecución apareció en las 54 simulaciones. Las diferencias de daño por rol, supervivencia y comportamiento del autopiloto no justifican nerfs o buffs generales con solo tres muestras. Mago, Musashi, Brasa y Morwen terminaron una muestra con el jugador caído: revisar su supervivencia en más arenas antes de aumentar defensa. Eren y Nigromante deben compararse incluyendo transformaciones e invocaciones; los soportes necesitan medir supervivencia del grupo, curación, protección y resurrecciones, además del daño.

Próximo protocolo recomendado: al menos 10 semillas por rol, Bosque + Minas + Infernal, pruebas solo y cooperativas, builds sin set y con set, distintos niveles, y telemetría real de jugadores. Priorizar tiempo para eliminar élites/jefes, daño recibido, tiempo caído y recursos; no igualar a todos por DPS.

## Skins de los nuevos campeones

Se conserva el dibujo existente. Recoloreo al cargar, con caché y alfa intacto; aura y partículas en render y efectos tintados al lanzar. El mismo atlas se usa en previews y partida. Las tarjetas estáticas reciben un único personaje completo, encuadrado con margen, sin mostrar la hoja entera.

| Campeón | Skin | Paleta |
|---|---|---|
| Brasa | Aurora de Cobre | violeta y fucsia |
| El Eslabón | Cadenas Esmeralda | turquesa y esmeralda |
| Morwen | Destilación Carmesí | carmesí y rosa |
| El Farolero | Sol del Alba | ámbar y dorado |
| Iria | Seda Celeste | azul y cian |
| Myla | Yogur de Arándanos | lila y violeta |

Visual gate: PASS tras alinear cuadros, normalizar escala y limpiar alfa de los dos atlas nuevos. Cuatro direcciones, izquierda por espejo, contorno oscuro, sin suavizado. Las seis skins pasaron comprobaciones de recoloreo y alfa binario; tienda y render sin errores. Comparaciones: [skins](docs/portadores/myla-skins-visual.png) y [BERRINCHE](docs/portadores/myla-berrinche-visual.png).

## Evidencia y cómo repetir

- [Estadísticas completas](docs/portadores/champion-balance-stats.json).
- [54 partidas comparativas](docs/portadores/roster-balance-results.json).
- [Myla final + 98 checks](docs/portadores/myla-simulation-results.json).
- [Prueba multijugador](docs/portadores/myla-online-results.json).
- [Validación de skins](docs/portadores/myla-visual-results.json).

Desde la raíz del repositorio, con Python 3, Node, Playwright y Chromium instalados:

```sh
node tools/balance/roster-reference.js
node tools/portadores/test-myla.js
node tools/portadores/visual-myla-skins.js
npm --prefix server install
node tools/portadores/online-myla.js
```

`CHROMIUM_PATH` permite indicar un ejecutable disponible. Los tests montan servidores locales y los cierran al terminar. La prueba online utiliza el relay real y dos clientes; verifica skills y definitiva solicitadas por invitado, propiedad de entidades y skin equipada. Las salidas JSON deben quedar sin errores y sin comprobaciones fallidas.

## Marco automático de entrada para futuros campeones

La versión 1 fija una referencia aprobada de 18 campeones. Un campeón nuevo no modifica por sí mismo estas medias. Las medias globales no se usan: se compara cada candidato con su rol.

| Rol | Vida media | Daño base medio | DPS básico medio | Vida efectiva media | Defensa media | Velocidad media | Daño medio simulado 150 s |
|---|---:|---:|---:|---:|---:|---:|---:|
| asesino | 110.8 | 13.6 | 28.0 | 120.5 | 7.8% | 174.8 | 12,877 |
| mago | 98.4 | 10.1 | 18.6 | 105.9 | 7.0% | 157.9 | 15,000 |
| soporte | 114.3 | 7.7 | 13.5 | 131.5 | 13.0% | 165.0 | 6,521 |
| tanque | 168.7 | 10.0 | 15.7 | 211.4 | 20.0% | 144.3 | 10,503 |

Fuentes de máquina: `docs/balance/champion-entry-reference.json` y su copia de runtime `js/data/champion-balance-reference.js`; el test exige que coincidan. Vida efectiva = vida / (1 − defensa), aproximación sin escudos ni curación.

**Ajuste automático:** `js/systems/champion-entry-balance.js`, cargado antes de iniciar el juego, detecta cualquier clave nueva en `CLASSES`. Conserva íntegros los 18 campeones aprobados. Para un candidato acota vida, defensa, velocidad, DPS y crecimiento a los intervalos del rol: mínimo observado ×0,9 y máximo observado ×1,1. Si faltan valores numéricos usa la media del rol.

Además limita un presupuesto compuesto: 40% vida efectiva / media del rol + 45% DPS básico / media del rol + 15% velocidad / media del rol. El techo es 1,15. Si un candidato excede ese techo, reduce proporcionalmente vida y daño; así no puede entrar simultáneamente con todas las estadísticas al máximo. Las recargas básicas inválidas reciben un valor seguro. Se registra cada cambio en `CHAMPION_ENTRY_BALANCE`. Estos límites son un punto de entrada automático, no una garantía de equilibrio de cualquier mecánica imaginable.

**Validación automática:** el workflow `Champion entry balance` corre en pushes y PRs. `tools/balance/entry-gate.js` detecta candidatos fuera de `knownChampions`, simula tres partidas de 150 s por nuevo campeón y falla ante errores, valores no finitos, falta de lanzamientos o daño medio superior al 135% de la referencia de su rol. No modifica automáticamente habilidades ni declara balance perfecto; el autor debe corregir el kit y repetir. Conserva un reporte JSON como artifact. El test de la referencia también prueba los presupuestos con candidatos artificiales extremos en los cuatro roles.

**Regla para futuras incorporaciones:** seguir `AGENTS.md`, cargar los registros antes del normalizador y ejecutar ambos checks. Añadir tests particulares de invocaciones, pasivas, control, curación y transformación. No añadir el candidato a `knownChampions` en la misma PR para evitar el ajuste o la simulación. Actualizar esa lista y las medias solo en una revisión explícita posterior del marco.

Para que GitHub impida físicamente un merge con el control en rojo, `Champion entry balance / entry-reference` debe ser requerido por la protección de `main`. Este cambio añade el workflow y las reglas del repositorio; no configura protección administrativa.

Comandos adicionales:

```sh
node tools/balance/check-entry-reference.js
node tools/balance/entry-gate.js
```

Validación del marco: los cuatro candidatos artificiales extremos respetaron el presupuesto. Un candidato nuevo de prueba, basado en el kit del Mago, fue detectado, normalizado y simulado con tres semillas: PASS. Evidencia: [entry-self-test-results.json](docs/balance/entry-self-test-results.json). El fixture solo existe durante `node tools/balance/entry-gate.js --self-test`; no se incorpora al roster del juego.
