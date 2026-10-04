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

## Elementos nuevos: la forja (`tools/art/painter/forge.py`)
Para piezas que **ningún donante tiene** (coronas, hombreras, capas, alas, halos, emblemas, bandas) ya no hace
falta escribir un módulo a medida: se crean **por datos** y se pintan con el mismo lenguaje del roster (volumen, luz
arriba-izquierda, contorno oscuro de 1 px, píxel nítido).

```
node tools/factory/cli.js element list                                   # biblioteca (tools/art/painter/elements/*.json)
node tools/factory/cli.js element new corona_de_hueso --kind crown        # parte de una plantilla
node tools/factory/cli.js element anchors --on sira                       # dónde caen los anclajes en un donante
node tools/factory/cli.js element preview corona_de_hueso --on sira       # hoja de contacto + gate
node tools/factory/cli.js element check                                   # gate de toda la biblioteca
```
Plantillas: `crown`, `pauldrons`, `cape`, `emblem`, `sash`, `halo`, `wings`.

**Un elemento** (`elements/<nombre>.json`):
- `layer`: `front` (encima del cuerpo), `behind` (detrás: solo donde el cuadro está vacío) u `onbody` (pintado sobre
  la figura: emblemas, bandas, tatuajes).
- `materials`: `{"metal": {"ramp": ["#oscuro", …, "#claro"], "outline": "#…", "round": .55, "jitter": .05}}`. La rampa
  necesita 3 tonos o más. El contorno tiene que ser oscuro: el gate de estilo lo exige.
- `shapes`: `ellipse` (`center`, `radius`, `angle`), `poly` (`points`), `rect` (`box`), `ring` (`center`, `radius`,
  `width`), `line` (`points`, `width`). Cada forma va anclada (`at`) a un punto que la forja **mide en cada cuadro**:
  `headTop`, `head`, `neck`, `shoulders`, `shoulderLeft`, `shoulderRight`, `shoulderFront`, `shoulderBack`,
  `chest`, `waist`, `feet`. Un punto puede anclarse a otra parte (`[x, y, "feet"]`), así una capa va de los hombros
  a los tobillos en cualquier cuerpo.
- Coordenadas en px de una cabeza de 24 px: se escalan con la cabeza del donante. `mirror` duplica la forma del
  otro lado del eje; de perfil la forma se da vuelta sola según hacia dónde mira el cuadro; `flipUp` la espeja de
  espaldas; `views` la limita a `down`/`side`/`up`; `group` une formas del mismo material en una sola pieza
  sombreada; `sway` hace oscilar el elemento con el paso.
- La pieza acompaña la animación (caminar, ataque, lanzamiento, definitiva) porque los anclajes salen del cuadro ya
  armado; la fila de muerte queda sin elementos salvo `"rows"`.

**Uso en una ficha:** `"accessories": [{"element": "alas_de_plumas"}, {"element": "hombreras_redondas",
"materials": {"shell": {"ramp": [...]}}, "scale": 0.9}]`. Las rampas se cambian por ficha (skins). Ejemplo
versionado: `specs/demo_forja.json` (no instalado; `docs/production/painter-forge-demo.png` compara `demo_fuego`
con la misma ficha más tres elementos).

**Gate de cada elemento** (sobre `baltra`, `sira` y `tibor`, cuerpos distintos): forma válida; dibuja en cada vista
pedida; no sale de la celda; no baja de la línea de pies; no es pintura plana; y la hoja resultante sigue dentro del
rango de estilo del roster. Si la pieza cambia la altura de cuerpo medida, avisa: después de instalar hay que correr
`roster_gate.js --write`, como con cualquier apariencia. Resultado en `docs/art-gate/element-gate.json`.

La forja es también la librería de dibujo compartida de los accesorios a medida (`bront_lib`, `khepri_lib` y
`vhal_lib` eran copias idénticas y ahora la reexportan). `python3 tools/art/painter/test_forge.py --regress`
comprueba el gate en casos negativos y que las 22 hojas instaladas se repintan idénticas.
