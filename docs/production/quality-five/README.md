# Cinco campeones: taller visual, no lanzamiento

Estado: **DRAFT / NO PUBLICADOS**. Ninguna receta de este directorio instala campeones
ni concede skins. Solciju, Veyra y Brakk tienen runtimes ejecutables únicamente mediante
fixtures de pruebas; Morveth y Aelith todavía no tienen kits propios.

## Taller de Solciju — 10 de octubre UTC

`js/champions/quality-five/solciju.js` implementa fermentación, vino de área, dos barricas
temporizadas, brindis y Gran Reserva. Tres transformaciones ordinarias y tres maestrías
distintas se prueban con el sistema real de talentos. Árbol ordinario: 33 puntos, presupuesto
máximo: 30. El registro de pruebas está exclusivamente en `tools/quality-five/register-fixture.js`;
el juego publicado no carga ninguno de estos módulos ni desbloquea el candidato.

Repetir con Playwright disponible y `CHROMIUM_PATH` si corresponde:

```
node tools/quality-five/functional.js
node tools/quality-five/online.js
node tools/balance/check-entry-reference.js
node tools/balance/entry-gate.js --workshop-solciju
node tools/balance/entry-gate.js --workshop-quality
ONLY=solciju,veyra node tools/bible/ability-gate.js --strict --workshop-quality
node --test tools/factory/test.js
node tools/factory/cli.js validate docs/production/quality-five/solciju.contract.json
```

El último comando debe seguir informando INCOMPLETE: el contrato fue creado con la fábrica,
pero arte final, audio, cosméticos, sets, balance completo y multiplayer de dos clientes
siguen pendientes. Las pruebas funcionales verifican seis niveles, daño, temporizadores,
limpieza, talentos, maestrías, recursos y serialización; no equivalen a aprobación comercial.
El entry gate del taller ejecuta además todos los candidatos existentes con los mismos
umbrales y semillas, sin modificar `knownChampions`.

## Veyra y validación conjunta

Veyra incorpora corte con sangrado de tres pulsos, desplazamiento que respeta paredes,
pacto que consume vida actual y definitiva que consume heridas. Pasiva de riesgo por
debajo de 40% de vida. Tres transformaciones desde nivel 40 y tres decisiones de maestría
desde nivel 90; los árboles siguen costando 33 puntos ordinarios frente a 30 disponibles.

`functional-results.json`: suite conjunta con 132 comprobaciones, incluidas ejecuciones
breves en las diez arenas. No representa campañas completas ni QA en teléfonos físicos.
`solciju-functional.json` y `solciju-entry-results.json` conservan la primera medición aislada.
`ability/ability-gate.json`: Ability Gate diferencial estricto de ambos candidatos, PASS;
el canario sin efectos sigue siendo rechazado. `online-results.json`: relay local real,
dos navegadores aislados, ambos candidatos como invitado, efectos atribuidos al dueño y
limpieza al morir. No prueba el servidor de producción, reconexión ni teléfonos físicos.
Arte, audio, cosméticos y sets siguen pendientes. Los contratos de fábrica se mantienen
INCOMPLETE honestamente. El workflow `Five champion workshop` repite los gates técnicos
sin habilitar candidatos en el catálogo público.

Calibración anterior del taller: 66 simulaciones de 150 s, 22 candidatos técnicos, cero
violaciones del techo. Solciju: daño medio 8.494 y supervivencia 3/3; Veyra: 4.291 y 3/3.
Referencias de rol: mago 15.000, asesino 12.877. El gate comprueba sobrepotencia y errores;
estos resultados bajos requieren revisar alcance, frecuencia efectiva y desempeño solo
antes de ajustar números. No son evidencia de balance competitivo 8/10.

La implementación detectó un defecto compartido: el autoapuntado no consultaba rivales de
Arena Divina. Corrección integrada mediante PR #80 en `18f6b7ba48dd69696f75efaf005e44a387667a1d`,
con CI completo, Safari y PostgreSQL aprobados; los candidatos quedan
en el taller del PR #78. No atribuir a un candidato las aprobaciones de los campeones existentes.

Aelith: diseño rechazado por similitud con Sira (cuerpo y cabeza de `sira_skin`/`sira_set`).
Rediseño pendiente de cabello, vestimenta y silueta; el atlas actual no se aprueba ni instala.

## Producción reproducible

`python3 tools/factory/produce-quality-five.py`

Usa `tools/factory/cli.js paint` y la forja existente. Produce diez atlas y sus previews
bajo `tools/art/painter/out/`, además de `candidates.png` y `manifest.json` aquí.
El manifiesto guarda SHA-256 del atlas y separa resultado numérico de aprobación visual.
Los atlas son reproducibles desde las recetas y los donantes versionados; no se instalan.

Tres elementos nuevos reutilizables: barrica portátil, sombrero de micelio y reloj de
arena. El control de elementos pasa; hay avisos de escala (especialmente sombrero),
que requieren revisión en escena. No se han bajado umbrales para producir un PASS.

## Revisión del 9 de octubre de 2026

- Primeros intercambios automáticos de cabezas: rechazados por dobles rostros en Brakk
  y Morveth. La versión actual conserva cabeza y cuerpo del mismo donante también en muerte.
- Morveth alternativo inicial: rechazado por métrica de color; se ajustó el diseño, sin
  cambiar el rango del gate.
- Barrica inicial: rechazo por invadir línea de pies; corregida geometría y repetido gate.
- Los diez atlas actuales pasan el gate numérico. **Esto no es Art Gate PASS**.
- Pendiente: diferenciación suficiente respecto de los donantes del roster, revisión
  de las 36 celdas animadas, alfa/contornos, consistencia de identidad de cada skin,
  integración a escala real frente al Caballero, cuatro direcciones y prueba móvil.
- Revisar especialmente Brakk Glacial (todavía necesita arquitectura de hielo), la
  Viuda (necesita luto reconocible) y Relojera del Vacío (halo no basta como identidad).

La hoja de contacto muestra frente/perfil/espalda, no sustituye revisión animada.
No publicar estos prototipos como contenido ya disponible ni atribuirles balance aprobado.

## Fallo histórico del Balance Gate — causa investigada el 10/10

Tras limitar el básico de Veyra a doce víctimas, la repetición completa registró una
violación en Saelis: daño medio 10.368,17 frente al techo 9.781,695. Cero errores JS.
Solciju (8.218,78) y Veyra (5.471,67) siguen por debajo de sus techos y sobrevivieron 3/3.
El fallo original permanece en el historial del PR #78; el reporte actual corresponde a la nueva ejecución después del arreglo de audio.
Las envolturas nuevas no alteran intencionalmente el kit de Saelis; la causa de la variación
no está aislada. El RNG global también es consumido por efectos, como documenta la
referencia. Pendiente: reproducción controlada en contextos frescos y comparación con main;
No se modificaron techos ni se nerfeó Saelis; ver resolución debajo.

## Nuevo estudio de Aelith

`node tools/factory/cli.js paint aelith_study` genera `aelith-study.png` (copia de la hoja
para revisión). Usa abrigo de Dariel y cabeza trenzada de Orsa, con paleta propia: ya no usa
el cuerpo/cabello de Sira. Primera paleta rechazada por 877 colores; la pintura que conserva
variación de luz/croma pasó el mismo gate numérico, sin cambiar umbrales.
**Revisión visual: RECHAZADA para publicación**. La fila final conserva la cabeza de Dariel:
el ensamblador no intercambia cabezas en muerte. Resolver continuidad en esas cuatro celdas,
arma temporal propia y escala antes de sustituir la receta principal. No es la skin final.

## Pausa del taller — prioridad solicitada: Guerra de Cristales

El diagnóstico `node tools/balance/diagnose-entry.js saelis` completó 18 muestras en contextos nuevos (producción, módulos sin registrar, taller; dos repeticiones por semilla). Hay variación incluso en producción: no prueba causalidad de los candidatos. `entry-diagnostic.json` es diagnóstico, no aprobación; se preserva el último fallo del gate completo. El protocolo compartido está en `tools/balance/run-entry-simulation.js`, sin cambiar semillas ni umbrales. Próximo paso al retomar: aislar azar/tiempo del motor, y luego repetir el gate completo. El usuario pidió priorizar selección, visión simultánea y ritmo de Cristales.

Corrección de alcance (10/10): los tests históricos rotulados «Crystal Wars» en `solciju-functional.json` usaban `divinaMode` y ejercitaban Arena Divina. No acreditan compatibilidad con el motor separado de Guerra de Cristales (`js/modes/crystal-wars`). Los nombres de las pruebas actuales se corrigieron.

## Reanudación y causa aislada — 10/10

El PR #81 de Cristales se integró a main (`072150f`). Se retomó el bloqueo de balance:
`playSfx` consumía el RNG de combate y omitía voces según el reloj real del audio.
Congelar performance.now por sí solo no resolvió la variación. Se aisló el azar de audio,
incluidos cuatro callbacks de arenas; arreglo de producción en PR #82.

Último gate completo del taller con ese arreglo: **PASS**, 66 simulaciones de 150 s,
22 candidatos, cero errores y cero violaciones. Medias: {'saelis': 8929.92, 'solciju': 8665.53, 'veyra': 4936.1}.
`workshop-entry-results.json` contiene esa ejecución. El diagnóstico de reloj fijo
es diagnóstico, no aprobación. El reloj fijo es optativo en el helper; el gate
normal conserva su protocolo, semillas, candidatos y techos.

Esto cierra el fallo reproducido de audio, pero no convierte al taller en un lanzamiento:
arte/skins, Morveth/Aelith y pruebas completas de modos siguen pendientes.

## Brakk — runtime de taller

Muros destructibles con colisión contra enemigos comunes, torretas destructibles de seis
ráfagas, reparación y Demolición final (sacrifica construcciones, golpea, ralentiza y
escuda). Los aliados atraviesan sus muros para evitar encierros; los jefes pueden
destruirlos y no son desplazados. Pasiva: 8% de mitigación cerca de una construcción propia.
Límite: dos muros y dos torretas, doce víctimas de básico y seis ráfagas por torreta.

Tres transformaciones: muro más ancho de menor duración; ráfaga penetrante; protección
de aliados. Tres maestrías: escombros prolongados, cura de emergencia, escudo compartido.
Árbol ordinario de 33 puntos frente a 30 disponibles. Códice e historia en el fixture.
No tiene aún arte, audio, skin ni Set aprobados: el contrato generado con la fábrica
se mantiene **INCOMPLETE** y `index.html` no carga al campeón.

`brakk-functional-results.json`: 76 comprobaciones PASS a niveles 1/39/40/60/90/99,
colisión real, destrucción, pasiva, talentos, maestrías, recursos, snapshots, limpieza y
ejecuciones breves en las diez arenas. No equivale a diez campañas completas.
Ability Gate estricto: Solciju/Veyra/Brakk PASS; canario sin efectos rechazado.
`online-results.json`: nueve comprobaciones PASS con relay real y dos navegadores,
incluidos construcción y lanzamiento de Brakk invitado, réplica del dueño y limpieza.
No prueba Guerras de Cristales, servidor oficial ni reconexión.

Reproducir: `node tools/quality-five/brakk-functional.js`,
`node tools/quality-five/online.js`,
`ONLY=solciju,veyra,brakk node tools/bible/ability-gate.js --strict --workshop-quality`,
`node tools/balance/entry-gate.js --workshop-quality`.

Última ejecución con Brakk: **69 simulaciones PASS**, 41 clases técnicas, 23 candidatos de referencia, cero errores y cero violaciones. Brakk: daño medio 4290.15, supervivencia 3/3. Es calibración de admisión en Bosque, no balance competitivo completo.
