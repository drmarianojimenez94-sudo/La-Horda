# Cinco campeones: taller visual, no lanzamiento

Estado: **DRAFT / NO PUBLICADOS**. Ninguna receta de este directorio instala campeones
ni concede skins. Solciju y Veyra tienen un primer runtime ejecutable únicamente mediante
fixtures de pruebas; Brakk, Morveth y Aelith todavía no tienen kits propios.

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

`functional-results.json`: suite conjunta con 131 comprobaciones, incluidas ejecuciones
breves en las diez arenas. No representa campañas completas ni QA en teléfonos físicos.
`solciju-functional.json` y `solciju-entry-results.json` conservan la primera medición aislada.
`ability/ability-gate.json`: Ability Gate diferencial estricto de ambos candidatos, PASS;
el canario sin efectos sigue siendo rechazado. `online-results.json`: relay local real,
dos navegadores aislados, ambos candidatos como invitado, efectos atribuidos al dueño y
limpieza al morir. No prueba el servidor de producción, reconexión ni teléfonos físicos.
Arte, audio, cosméticos y sets siguen pendientes. Los contratos de fábrica se mantienen
INCOMPLETE honestamente. El workflow `Five champion workshop` repite los gates técnicos
sin habilitar candidatos en el catálogo público.

Última calibración del taller: 66 simulaciones de 150 s, 22 candidatos técnicos, cero
violaciones del techo. Solciju: daño medio 8.494 y supervivencia 3/3; Veyra: 4.291 y 3/3.
Referencias de rol: mago 15.000, asesino 12.877. El gate comprueba sobrepotencia y errores;
estos resultados bajos requieren revisar alcance, frecuencia efectiva y desempeño solo
antes de ajustar números. No son evidencia de balance competitivo 8/10.

La implementación detectó un defecto compartido: el autoapuntado no consultaba rivales de
Guerras de Cristales. Corrección aislada para producción en PR #80; los candidatos quedan
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
