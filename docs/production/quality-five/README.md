# Cinco campeones: taller visual, no lanzamiento

Estado: **DRAFT / NO JUGABLES**. Ninguna receta de este directorio instala campeones,
registra habilidades ni concede skins. Solciju, Brakk, Veyra, Morveth y Aelith aún
necesitan sus kits, pasivas, talentos transformadores, lore, Códice y pruebas de red.

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
