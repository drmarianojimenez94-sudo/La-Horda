# El Pintor — arte de campeones con el estilo del roster

`tools/art/painter/painter.py` pinta campeones nuevos **sin generador de imágenes**: trabaja sobre las hojas
**encargadas** del roster (los 10 de la Expedición con sus skins y sets: `tools/art/painter/donors.json`,
hoja de contacto en `tools/art/painter/donors.png`) y las transforma. No inventa trazos: por eso el resultado
tiene el mismo sombreado, contorno, proporciones y animación que el resto del juego.

## Del pedido al campeón (automático)
```
python3 tools/art/painter/suggest.py <id> "mago con capa roja que tira fuego, pelo blanco"   # ficha borrador
node tools/factory/cli.js paint <id>              # pinta + gate de estilo
node tools/factory/cli.js paint <id> --install    # además lo instala en el juego
node tools/art/roster_gate.js --write && node tools/art/roster_gate.js   # escala y pies (sirve el repo en ROSTER_BASE_URL)
```
`suggest.py` elige cuerpo y cabeza por las etiquetas de `donors.json` (`look`, `tags`, `gender`) y arma las rampas desde
las palabras de color ("capa roja", "pelo blanco", "armadura dorada"). Los efectos ("tira fuego") son del kit
(proyectil propio, VFX), no de la ropa. El borrador se mira (`out/<id>/sheet.png`) y se ajusta antes de instalar.
Ejemplo versionado: `specs/demo_fuego.json` (no instalado).

## Gates
- **Estilo** (`tools/art/painter/style_gate.py`, gate `style` de la fábrica): colores por cuadro, contorno, sombreado y
  detalle dentro del rango de las hojas encargadas (±15 %). El arte plano generado por código falla (30-45 colores por
  cuadro contra 1484-2535 del roster).
- **Escala y pies** (`tools/art/roster_gate.js`): igual que cualquier apariencia.

## Flujo
1. **Pedido → ficha.** Se escribe `tools/art/painter/specs/<id>.json` a partir de la idea ("capa roja que tira fuego").
2. **Ensamble.** `body` (cuerpo, ropa, arma y poses) de un donante + `head` (cara, pelo, tocado) de otro. La cabeza se
   detecta por la cara (bloque de piel) y se apoya en el mentón del cuerpo cuadro por cuadro; en ataques y lanzamientos
   se toma la cabeza del cuadro de caminar que mira hacia el mismo lado. En la muerte queda la cabeza del cuerpo,
   repintada con la rampa del pelo.
3. **Pintura.** Reglas en orden (cada una ve el resultado de la anterior):
   - selección: `part` (`head` | `body` | `all`), `hue: [desde, hasta]` en grados Lab + `minChroma`, `minL`/`maxL`,
     `materialsOf: "#hex"` + `take` (materiales de color parecido), `noSkin`.
   - pintura: `ramp: ["#oscuro", …, "#claro"]` (mapa de degradado: la luz de cada píxel elige su color; `gamma` < 1
     aclara) o `to: "#hex"` (corre el tono conservando la luz; `keepLight`, `contrast`, `chroma`).
   - los contornos (L ≤ 9) y los ojos quedan intactos (`keepDark`, `keepEyes`).
4. **Accesorios.** `"accessories": ["nombre" | {"module": "nombre", ...}]` → `tools/art/painter/accessories/<nombre>.py`
   con `draw(atlas, info, opts) -> atlas`. `info.frames[i]` = `{top, neckY, neckX, dir}` por cuadro.
5. **Salida.** `tools/art/painter/out/<id>/`: `atlas.png` (4×9, 112 px), `sheet.png` (8 cuadros ×3), `preview.png`,
   `report.json`.

```
python3 tools/art/painter/painter.py materials <donante>     # materiales de un donante (color, tono, croma, % cabeza)
python3 tools/art/painter/painter.py paint tools/art/painter/specs/<id>.json
```

## Reglas de arte
- Solo hojas encargadas son donantes. Nunca las generadas (Ascensión vieja, pixrig).
- Un campeón pintado no puede leerse como un croma del donante: cambia la cabeza **y** la paleta, y suma un
  accesorio o un arma propia cuando la silueta queda igual.
- Pasa el Roster Art Gate (escala y pies) y el gate de estilo antes de dejar de ser concepto (`artPending`).
