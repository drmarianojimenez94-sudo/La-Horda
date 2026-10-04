# Ocho nuevos diseños de skins de set

| Campeón | Set | Skin |
|---|---|---|
| Tanque | Baluarte Inquebrantable | El Último Juramento |
| Nigromante | Réquiem | Rey Sin Tumba |
| Libertador | Uniforme del Granadero | Granadero del Alba |
| Brasa | Último Turno | Maquinista de la Caldera |
| Eslabón | Juramento Roto | Carcelero de Puertas Abiertas |
| Morwen | Vidrio Negro | Destiladora del Silencio |
| Farolero | Lumbre Persistente | Vigía de la Última Expedición |
| Iria | Hilo del Umbral | Tejedora de los Tres Caminos |

Cada cuerpo tiene 54 poses: reposo, caminata, ataque, lanzamiento, golpe,
muerte y ultimate en frente, perfil y espalda. La vista izquierda se espeja
como en los sprites base. El Libertador agrega 18 poses montadas.

Los tres campeones sin skin reciben su primer diseño. Los cinco Portadores
reemplazan sus variantes de paleta por trajes ilustrados independientes.
Las nueve skins anteriores permanecen registradas: los 17 campeones tienen skin.

Se activan al equipar el set principal completo, con las reglas actuales.
También aparecen en Códice → campeón → Skins, con preview propio.
No cambian estadísticas, radios, tiempos ni mecánicas. Las invocaciones,
la forma demoníaca del Nigromante y los efectos externos conservan su arte actual.
Las animaciones especiales a pie del Libertador resuelven a poses del nuevo atlas.

## Producción y validación

Las fuentes originales generadas están en `art-source/complete-skins` y sus
referencias y dirección artística en `manifest.json`. `build.py` extrae las nueve
siluetas de cada columna antes de alinear los pies: evita cortar armas cuando
la grilla generada tiene pequeños desplazamientos. Produce atlas RGBA de
576×864, celdas 96×96 y alfa binario; no recolorea los diseños.

Reconstrucción: `python3 tools/art/complete_skins/build.py`.

Validación: servir el juego y ejecutar `tools/art/complete_skins/check.js`
con `SE_BASE_URL`, `PLAYWRIGHT_MODULE` y `PLAYWRIGHT_EXECUTABLE_PATH` según el entorno.
Comprueba 37 condiciones de cobertura, remapeo, dibujo, fases del Libertador
y regreso al arte base. La auditoría existente `tools/art/skin_audit.js`
comprueba las vistas y estados de los ocho cuerpos.
