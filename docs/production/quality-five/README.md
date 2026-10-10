# Cinco campeones: taller visual, no lanzamiento

Estado: **DRAFT / NO PUBLICADOS**. Ninguna receta de este directorio instala campeones
ni concede skins. Solciju tiene un primer runtime ejecutable únicamente mediante la
fixture de pruebas; Brakk, Veyra, Morveth y Aelith todavía no tienen kits propios.

## Taller de Solciju — 10 de octubre UTC

`js/champions/quality-five/solciju.js` implementa fermentación, vino de área, dos barricas
temporizadas, brindis y Gran Reserva. Tres transformaciones ordinarias y tres maestrías
distintas se prueban con el sistema real de talentos. Árbol ordinario: 33 puntos, presupuesto
máximo: 30. El registro de pruebas está exclusivamente en `tools/quality-five/register-fixture.js`;
el juego publicado no carga ninguno de estos módulos ni desbloquea el candidato.

Repetir con Playwright disponible y `CHROMIUM_PATH` si corresponde:

```
node tools/quality-five/functional.js
node tools/balance/check-entry-reference.js
node tools/balance/entry-gate.js --workshop-solciju
node --test tools/factory/test.js
node tools/factory/cli.js validate docs/production/quality-five/solciju.contract.json
```

El último comando debe seguir informando INCOMPLETE: el contrato fue creado con la fábrica,
pero arte final, audio, cosméticos, sets, balance completo y multiplayer de dos clientes
siguen pendientes. Las pruebas funcionales verifican seis niveles, daño, temporizadores,
limpieza, talentos, maestrías, recursos y serialización; no equivalen a aprobación comercial.
El entry gate del taller ejecuta además todos los candidatos existentes con los mismos
umbrales y semillas, sin modificar `knownChampions`.

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
