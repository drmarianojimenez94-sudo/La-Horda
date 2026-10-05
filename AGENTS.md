# La Horda — incorporación de campeones

Al crear, importar o registrar cualquier campeón nuevo:

1. Leer `BALANCE_CAMPEONES.md` y `docs/balance/champion-entry-reference.json`. Comparar con la media de su rol, no con el promedio global.
2. Registrar la clase y sus módulos antes de `js/systems/champion-entry-balance.js` en `index.html`. Este módulo normaliza automáticamente estadísticas iniciales y crecimiento del campeón nuevo. No tocar `knownChampions` para evitar el ajuste o las pruebas.
3. Ejecutar `node tools/balance/check-entry-reference.js` y `node tools/balance/entry-gate.js`. El gate detecta clases que no están en el roster de referencia y simula tres partidas de 150 segundos por candidato. Si falla, ajustar el kit y repetir; no declarar el campeón balanceado ni integrarlo como aprobado.
4. Agregar pruebas específicas de sus habilidades, invocaciones, duración, límite de entidades, limpieza, jefes y cooperativo. El normalizador de estadísticas no mide daño por ticks, pasivas, curación, control o transformaciones.
5. Mantener los archivos de referencia JSON y JS sincronizados. Registrar resultados y cambios en el documento. Incorporar un candidato a `knownChampions` solamente después de validar su kit y actualizar expresamente la versión de referencia y sus medias; no hacerlo en la misma PR que lo presenta para saltarse el gate.
4b. Pasar el **filtro de habilidades** (`node tools/bible/ability-gate.js --strict`, reglas en `docs/bible/ABILITY_GATE.md`): una habilidad de área, otra distinta que dañe a varios, una de potenciación o cura, una definitiva que sume 3 categorías o más, efecto visual en todas y **premarcado** en toda habilidad que apunte (perfil en `AIM_PROFILES` o `ACTION_AIM_PROFILES`). Usar `kitBuff`/`kitFx` de `js/champions/kit-shared.js` para potenciaciones y efectos.
6. Las skins son cosméticas: no alterar estadísticas por colores, auras o efectos. Respetar `docs/ART_BIBLE.md` y su visual gate.

El workflow `Champion entry balance` ejecuta la verificación en pushes y pull requests. Para impedir merges con el check en rojo en GitHub, configurar ese check como requerido en la protección de `main`; sin protección, GitHub informa el fallo pero permite que un administrador lo omita.

7. Completar el contrato de `tools/factory/cli.js` para campeones nuevos y leer `docs/production/PRODUCTION_BIBLES.md`. `STRUCTURAL_PASS` no sustituye las simulaciones, la revisión de arte/audio ni pruebas reales de multiplayer y performance. Un manifiesto incompleto nunca se registra automáticamente.
