# LA HORDA — Encargo de arte para personajes (playtest y alfa)

> Para el dueño. Qué personajes no tienen arte completo para animarse, qué se hizo mientras tanto para que en el
> playtest nadie vea un personaje "tieso", y los **prompts listos para copiar** (uno por imagen) para pedir cada
> hoja a un artista o a ChatGPT. Ordenado por prioridad: primero lo que se ve en el playtest.

## Cómo quedó para el playtest

- **Reemplazos temporales (cuerpos prestados):** cada personaje de la tabla de abajo se dibuja con el cuerpo **completo** de otro
  personaje del juego que cumple el mismo papel, recoloreado con la paleta de su arena. La IA, las mecánicas, la vida y el daño
  son los del original; solo cambia el dibujo (y el nombre cuando el cuerpo nuevo ya no corresponde).
- **Todo está en un solo archivo:** `js/data/body-swaps.js`. Cuando llegue el arte nuevo de un personaje, se **borra su entrada**
  y vuelve solo a su dibujo y a su nombre original. Para comparar en vivo: abrir el juego con `?bodyswap=0` en la dirección.
- Medido con `tools/art/enemy_coverage.js` (antes y después): los 14 cuerpos prestados tienen caminata de 3 a 6 cuadros reales,
  ataque, golpe y muerte propios del donante, sin estados vacíos.

| # | Personaje (arena) | Problema hoy | Cuerpo prestado mientras tanto | Nombre en el juego |
|---|---|---|---|---|
| P0-01 | **El Presentador** (01 · Ciudad Maldita) | Arte de 32 px de alto dibujado a 4–5 veces: en pantalla se ve en bloques. Caminata de 2 cuadros. | Cuerpo del Mago de Hielo y Cristal (hoja completa) en carmesí y oro (acto I), violeta oscuro (acto II) y rojo fuego (acto III). Nombre sin cambios. | El Presentador |
| P0-02 | **La Dama del Telón** (01 · Ciudad Maldita) | Arte de 27 px de ancho dibujado a ~5 veces: se ve en bloques. Caminata de 2 cuadros. | Cuerpo de la Dama del Bosque (hoja completa) con los rojos llevados al carmesí del teatro. Nombre sin cambios. | La Dama del Telón |
| P0-03 | **Maestro de Ceremonias** (01 · Ciudad Maldita) | Arte de 22×70 px con el personaje de 24 px dibujado a 5 veces: bloques. Caminata de 2 cuadros. | Cuerpo de la Druida de Arena (tira completa del Laberinto) en carmesí oscuro. Nombre sin cambios. | Maestro de Ceremonias |
| P0-04 | **El Tramoyista** (01 · Ciudad Maldita) | Arte de 32×46 px dibujado a ~5 veces: bloques. Caminata de 2 cuadros. | Cuerpo del Autómata de Hierro (hoja completa de la Fábrica) en vino y hierro viejo. Nombre sin cambios. | El Tramoyista |
| P0-05 | **Tiburón Joven** (06 · Arena Acuática) | 2 cuadros quietos + 1 de ataque, sin golpe ni muerte; píxel grueso. | Cuerpo del Esqueleto Cornudo en verde agua y hueso: pasa a llamarse «Ahogado de las Ruinas». Al volver el arte, se borra la entrada y recupera su nombre. | Ahogado de las Ruinas |
| P0-06 | **Tiburón Blanco** (06 · Arena Acuática) | 1 cuadro quieto + 1 de ataque, sin golpe ni muerte. | Cuerpo del Demonio de Hielo en verde abisal: pasa a llamarse «Tritón de las Fosas». | Tritón de las Fosas |
| P0-07 | **Cangrejo Acorazado** (06 · Arena Acuática) | 2 cuadros quietos + 1 de ataque, sin golpe ni muerte; píxel grueso. | Cuerpo de la Araña Mecánica en rojo coral: pasa a llamarse «Cangrejo Araña». | Cangrejo Araña |
| P0-08 | **Medusa Eléctrica** (06 · Arena Acuática) | 2 cuadros quietos + 1 de ataque, sin golpe ni muerte. | Cuerpo del Acechador de Esporas (Reino Fúngico) en azul eléctrico. Nombre sin cambios. | Medusa Eléctrica |
| P0-09 | **Sirena Abisal** (06 · Arena Acuática) | 1 cuadro quieto + 1 de ataque, sin golpe ni muerte. | Cuerpo de la Medusa del Laberinto (mujer con cola de serpiente) en azul abisal. Nombre sin cambios. | Sirena Abisal |
| P0-10 | **Jinete Sin Cabeza (Abismo)** (08 · Abismo) | Caminar de 1 cuadro; el ataque es el mismo quieto. Arte a ~4 veces: bloques. | Cuerpo del Jinete Sin Cabeza de la Arena Divina (hoja completa) llevado al violeta del Abismo. Mismo personaje de leyenda: nombre sin cambios. | Jinete Sin Cabeza (Abismo) |
| P0-11 | **El Carcelero del Vacío** (08 · Abismo) | Caminar de 1 cuadro de perfil; arte de 37 px de alto dibujado a ~5,6 veces: bloques. | Cuerpo del Carcelero Deforme (hoja completa de la Fábrica) agrandado y en violeta del vacío. Nombre sin cambios. | El Carcelero del Vacío |
| P0-12 | **Golem de Cuerpos** (10 · Arena Infernal) | Hoja de 1 cuadro por estado (quieto = caminar = golpe); el ataque es otra pose fija. Se veía como una estatua deslizándose. | Cuerpo del Gólem de Cristal (hoja completa de la Arena Gélida) recoloreado a carne y sangre. Nombre sin cambios. | Golem de Cuerpos |
| P1-01 | **Esfinge** (07 · Laberinto) | Sin ninguna vista de ataque ni de golpe, y sin muerte en su diseño (la última hoja trajo otra esfinge). | Cuerpo del Cù-Sìth (hoja completa de las Ruinas) en oro y arena. Nombre sin cambios. | Esfinge |

**Se mantienen sin reemplazo** (tienen animación, solo les falta calidad o algún estado; reemplazarlos rompería algo central):
Cerbero (mecánicas de cadenas y tres cabezas, 8+ cuadros por estado), Ángel Corrompido (animación completa, recoloreado),
Rey de la Horda (le faltan golpe y muerte), Kraken Joven y Leviatán (tentáculos y reglas atadas al cuerpo), los comunes de la
Ciudad y del Abismo (caminata de 2 cuadros pero con ataque, golpe y muerte), Madre Espora y El Que Mora Debajo (se dibujan
por partes con el escenario). Sus fichas están al final (sección F).

## Cómo usar los prompts (ChatGPT u otra IA de imágenes)

1. **Primero** pegá el prompt **0 — Hoja de estilo** y guardá la imagen: es la referencia general del juego.
2. Para cada personaje, pegá los prompts **en orden** (1/N, 2/N...). Cada prompt pide **una sola imagen** con **una sola fila**
   de cuadros. Desde el prompt 2, **adjuntá la imagen 1 del mismo personaje** (y la hoja de estilo) y dejá la frase
   "usá la imagen anterior como referencia exacta": así sale el mismo personaje en todas.
3. Si la IA devuelve una imagen grande (1024 px o más), está bien: se reduce con "vecino más cercano" al tamaño de celda.
   Lo importante es que los cuadros estén en **una fila**, del **mismo tamaño**, con los **pies a la misma altura**.
4. Fondo: transparente. Si la IA no puede, magenta plano `#FF00FF` (se recorta solo). Nunca "ajedrez" pintado.
5. Entregá las imágenes con el nombre `<clave>_<n>.png` (por ejemplo `cm_presentador_3.png`); la clave está en cada ficha.

Convenciones del juego (`LA_HORDA_MISSING_ASSETS.md`): 1 px de arte = 2 unidades de mundo; un guardián mide ≈32–36 px de arte.
"Perfil" se dibuja mirando a la derecha y el juego lo espeja. Los tamaños de celda de abajo están al doble de esa escala
para que el personaje tenga detalle; el juego lo reduce.

### Prompt 0 — Hoja de estilo (referencia general)

```text
PROMPT 0 — HOJA DE ESTILO DE «LA HORDA»
Una lámina de referencia de estilo para un videojuego ARPG cooperativo de fantasía oscura. Mostrá, en una sola fila y del mismo tamaño,
cinco personajes de ejemplo parados de perfil mirando a la derecha: un guerrero con armadura gastada, una hechicera encapuchada, un
esqueleto con escudo, un demonio rojo menor y un gólem de piedra. Al lado, una tira de 8 muestras de color de la paleta general:
#0e0a12 (negro violáceo), #3a2a30 (sombra cálida), #7a2a2a (sangre), #c0503a (brasa), #e8c27a (oro viejo), #8a9a8a (piedra),
#4a78a8 (acero azul), #efe6d6 (hueso).
Vista cenital 3/4 (cámara desde arriba en diagonal), luz desde arriba a la izquierda, contorno oscuro de 1 píxel en todos los personajes,
sombras en 3–4 tonos por color, sin degradés suaves. Guerrero ≈64 px de alto; los demás a su escala relativa.
Fondo transparente (o magenta plano #FF00FF). Sin texto, sin números, sin marcos, sin escenario.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte.
```

<details><summary>English version</summary>

```text
PROMPT 0 — «LA HORDA» STYLE SHEET
A style reference plate for a dark-fantasy co-op ARPG. Show, in a single row and at the same scale, five example characters standing in
side view facing right: a warrior in worn armor, a hooded sorceress, a skeleton with a shield, a lesser red demon and a stone golem.
Next to them, a strip of 8 color swatches of the general palette: #0e0a12 (violet black), #3a2a30 (warm shadow), #7a2a2a (blood),
#c0503a (ember), #e8c27a (old gold), #8a9a8a (stone), #4a78a8 (steel blue), #efe6d6 (bone).
Top-down 3/4 view (camera from above at an angle), light from the top left, 1-pixel dark outline on every character, 3–4 shade steps per
color, no soft gradients. Warrior about 64 px tall; the rest at relative scale.
Transparent background (or flat magenta #FF00FF). No text, no numbers, no borders, no scenery.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette.
```

</details>

## P0 — Personajes reemplazados para el playtest (en orden de prioridad)

Orden de campaña, que es el orden en que se ven en el playtest: Ciudad (Arena 01), Acuática (06), Abismo (08) y el jefe final (10).

> Si hay que elegir **una sola** cosa para el playtest: la Ciudad (P0-01 a P0-04), porque es la primera arena que se juega.

### P0-01 · El Presentador — `cm_presentador`

| Campo | Valor |
|---|---|
| Arena | 01 · Ciudad Maldita |
| Rango | Jefe final de la arena (3 actos) |
| Rol en combate | A distancia (radio 40, velocidad 58): abanicos de proyectiles, reflectores que marcan, telones de fuego; se transforma dos veces. |
| Problema hoy | Arte de 32 px de alto dibujado a 4–5 veces: en pantalla se ve en bloques. Caminata de 2 cuadros. |
| Mientras tanto | Cuerpo del Mago de Hielo y Cristal (hoja completa) en carmesí y oro (acto I), violeta oscuro (acto II) y rojo fuego (acto III). Nombre sin cambios. |
| Paleta | #120a0e (negro), #3a1420 (vino oscuro), #8a1a2a (carmesí), #c02030 (rojo), #e8c27a (oro), #efe6d6 (hueso/guantes) |
| Celda | 96×128 px (personaje ≈110 px de alto) |
| Entrega | `cm_presentador_1.png` … `cm_presentador_10.png`, una fila por imagen |

**Descripción visual:** EL PRESENTADOR, el dueño del espectáculo de la Ciudad Maldita. Un maestro de ceremonias demoníaco, alto y flaco, con cara de calavera sonriente y ojos rojos, galera negra con cinta roja, levita carmesí larga con solapas doradas y chaleco negro, guantes blancos gastados y un bastón negro con un orbe rojo que brilla en la punta. Pose teatral, como si presentara un número.

**Planilla de animaciones** (estado × dirección × cuadros):

| Imagen | Estado | Dirección | Cuadros | Bucle |
|---|---|---|---|---|
| 1 | quieto, gira el bastón | perfil derecha (se espeja) | 4 | sí |
| 2 | caminar elegante | perfil derecha (se espeja) | 6 | sí |
| 3 | levanta el bastón | perfil derecha (se espeja) | 2 | no |
| 3 | abre los brazos y el orbe destella | perfil derecha (se espeja) | 2 | no |
| 3 | vuelve a la pose | perfil derecha (se espeja) | 2 | no |
| 4 | golpe recibido, se le ladea la galera | perfil derecha (se espeja) | 2 | no |
| 5 | se encorva, la levita se rasga y le crecen garras | perfil derecha (se espeja) | 6 | no |
| 6 | caminar encorvado, con garras, la galera rota | perfil derecha (se espeja) | 6 | sí |
| 7 | zarpazo con las dos garras | perfil derecha (se espeja) | 6 | no |
| 8 | espectro carmesí y violeta que flota, telas que ondulan, calavera con galera | perfil derecha (se espeja) | 6 | sí |
| 9 | abre los brazos y lanza energía roja | perfil derecha (se espeja) | 6 | no |
| 10 | se deshace en telas y humo rojo hasta desaparecer | perfil derecha (se espeja) | 8 | no |

```text
PROMPT 1/10 — El Presentador: acto I: quieto
Hoja de sprites para un videojuego. PERSONAJE: EL PRESENTADOR, el dueño del espectáculo de la Ciudad Maldita. Un maestro de ceremonias demoníaco, alto y flaco, con cara de calavera sonriente y ojos rojos, galera negra con cinta roja, levita carmesí larga con solapas doradas y chaleco negro, guantes blancos gastados y un bastón negro con un orbe rojo que brilla en la punta. Pose teatral, como si presentara un número.
PALETA: #120a0e (negro), #3a1420 (vino oscuro), #8a1a2a (carmesí), #c02030 (rojo), #e8c27a (oro), #efe6d6 (hueso/guantes).
ESTA IMAGEN: acto I: quieto, 4 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadros 1–4: quieto, gira el bastón.
Formato: UNA sola fila de 4 cuadros (4 columnas × 1 fila), celdas iguales de 96×128 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈110 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 1/10 — The Presenter: act I: idle
Sprite sheet for a video game. CHARACTER: THE PRESENTER, owner of the show of the Cursed City. A tall, thin demonic ringmaster with a grinning skull face and red eyes, a black top hat with a red band, a long crimson tailcoat with golden lapels and a black vest, worn white gloves and a black cane topped with a glowing red orb. Theatrical pose, as if introducing an act.
PALETTE: #120a0e (negro), #3a1420 (vino oscuro), #8a1a2a (carmesí), #c02030 (rojo), #e8c27a (oro), #efe6d6 (hueso/guantes).
THIS IMAGE: act I: idle, 4 frames, facing RIGHT, side view (the game mirrors it for the left). frames 1–4: idle, twirls the cane.
Format: ONE single row of 4 frames (4 columns × 1 row), equal 96×128 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 110 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 2/10 — El Presentador: acto I: caminar
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: EL PRESENTADOR, el dueño del espectáculo de la Ciudad Maldita. Un maestro de ceremonias demoníaco, alto y flaco, con cara de calavera sonriente y ojos rojos, galera negra con cinta roja, levita carmesí larga con solapas doradas y chaleco negro, guantes blancos gastados y un bastón negro con un orbe rojo que brilla en la punta. Pose teatral, como si presentara un número.
PALETA: #120a0e (negro), #3a1420 (vino oscuro), #8a1a2a (carmesí), #c02030 (rojo), #e8c27a (oro), #efe6d6 (hueso/guantes).
ESTA IMAGEN: acto I: caminar, 6 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadros 1–6: caminar elegante.
Formato: UNA sola fila de 6 cuadros (6 columnas × 1 fila), celdas iguales de 96×128 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈110 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 2/10 — The Presenter: act I: walk
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: THE PRESENTER, owner of the show of the Cursed City. A tall, thin demonic ringmaster with a grinning skull face and red eyes, a black top hat with a red band, a long crimson tailcoat with golden lapels and a black vest, worn white gloves and a black cane topped with a glowing red orb. Theatrical pose, as if introducing an act.
PALETTE: #120a0e (negro), #3a1420 (vino oscuro), #8a1a2a (carmesí), #c02030 (rojo), #e8c27a (oro), #efe6d6 (hueso/guantes).
THIS IMAGE: act I: walk, 6 frames, facing RIGHT, side view (the game mirrors it for the left). frames 1–6: elegant walk.
Format: ONE single row of 6 frames (6 columns × 1 row), equal 96×128 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 110 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 3/10 — El Presentador: acto I: lanzar abanico de proyectiles
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: EL PRESENTADOR, el dueño del espectáculo de la Ciudad Maldita. Un maestro de ceremonias demoníaco, alto y flaco, con cara de calavera sonriente y ojos rojos, galera negra con cinta roja, levita carmesí larga con solapas doradas y chaleco negro, guantes blancos gastados y un bastón negro con un orbe rojo que brilla en la punta. Pose teatral, como si presentara un número.
PALETA: #120a0e (negro), #3a1420 (vino oscuro), #8a1a2a (carmesí), #c02030 (rojo), #e8c27a (oro), #efe6d6 (hueso/guantes).
ESTA IMAGEN: acto I: lanzar abanico de proyectiles, 6 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadros 1–2: levanta el bastón; cuadros 3–4: abre los brazos y el orbe destella; cuadros 5–6: vuelve a la pose.
Formato: UNA sola fila de 6 cuadros (6 columnas × 1 fila), celdas iguales de 96×128 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈110 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 3/10 — The Presenter: act I: cast a fan of projectiles
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: THE PRESENTER, owner of the show of the Cursed City. A tall, thin demonic ringmaster with a grinning skull face and red eyes, a black top hat with a red band, a long crimson tailcoat with golden lapels and a black vest, worn white gloves and a black cane topped with a glowing red orb. Theatrical pose, as if introducing an act.
PALETTE: #120a0e (negro), #3a1420 (vino oscuro), #8a1a2a (carmesí), #c02030 (rojo), #e8c27a (oro), #efe6d6 (hueso/guantes).
THIS IMAGE: act I: cast a fan of projectiles, 6 frames, facing RIGHT, side view (the game mirrors it for the left). frames 1–2: raises the cane; frames 3–4: opens his arms, the orb flashes; frames 5–6: returns to pose.
Format: ONE single row of 6 frames (6 columns × 1 row), equal 96×128 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 110 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 4/10 — El Presentador: golpe recibido (acto I)
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: EL PRESENTADOR, el dueño del espectáculo de la Ciudad Maldita. Un maestro de ceremonias demoníaco, alto y flaco, con cara de calavera sonriente y ojos rojos, galera negra con cinta roja, levita carmesí larga con solapas doradas y chaleco negro, guantes blancos gastados y un bastón negro con un orbe rojo que brilla en la punta. Pose teatral, como si presentara un número.
PALETA: #120a0e (negro), #3a1420 (vino oscuro), #8a1a2a (carmesí), #c02030 (rojo), #e8c27a (oro), #efe6d6 (hueso/guantes).
ESTA IMAGEN: golpe recibido (acto I), 2 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadros 1–2: golpe recibido, se le ladea la galera.
Formato: UNA sola fila de 2 cuadros (2 columnas × 1 fila), celdas iguales de 96×128 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈110 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 4/10 — The Presenter: hurt (act I)
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: THE PRESENTER, owner of the show of the Cursed City. A tall, thin demonic ringmaster with a grinning skull face and red eyes, a black top hat with a red band, a long crimson tailcoat with golden lapels and a black vest, worn white gloves and a black cane topped with a glowing red orb. Theatrical pose, as if introducing an act.
PALETTE: #120a0e (negro), #3a1420 (vino oscuro), #8a1a2a (carmesí), #c02030 (rojo), #e8c27a (oro), #efe6d6 (hueso/guantes).
THIS IMAGE: hurt (act I), 2 frames, facing RIGHT, side view (the game mirrors it for the left). frames 1–2: hurt, his top hat tilts.
Format: ONE single row of 2 frames (2 columns × 1 row), equal 96×128 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 110 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 5/10 — El Presentador: transformación, primera mitad
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: EL PRESENTADOR, el dueño del espectáculo de la Ciudad Maldita. Un maestro de ceremonias demoníaco, alto y flaco, con cara de calavera sonriente y ojos rojos, galera negra con cinta roja, levita carmesí larga con solapas doradas y chaleco negro, guantes blancos gastados y un bastón negro con un orbe rojo que brilla en la punta. Pose teatral, como si presentara un número.
PALETA: #120a0e (negro), #3a1420 (vino oscuro), #8a1a2a (carmesí), #c02030 (rojo), #e8c27a (oro), #efe6d6 (hueso/guantes).
ESTA IMAGEN: transformación, primera mitad, 6 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadros 1–6: se encorva, la levita se rasga y le crecen garras.
Formato: UNA sola fila de 6 cuadros (6 columnas × 1 fila), celdas iguales de 96×128 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈110 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 5/10 — The Presenter: transformation, first half
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: THE PRESENTER, owner of the show of the Cursed City. A tall, thin demonic ringmaster with a grinning skull face and red eyes, a black top hat with a red band, a long crimson tailcoat with golden lapels and a black vest, worn white gloves and a black cane topped with a glowing red orb. Theatrical pose, as if introducing an act.
PALETTE: #120a0e (negro), #3a1420 (vino oscuro), #8a1a2a (carmesí), #c02030 (rojo), #e8c27a (oro), #efe6d6 (hueso/guantes).
THIS IMAGE: transformation, first half, 6 frames, facing RIGHT, side view (the game mirrors it for the left). frames 1–6: hunches over, the tailcoat tears and claws grow.
Format: ONE single row of 6 frames (6 columns × 1 row), equal 96×128 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 110 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 6/10 — El Presentador: acto II (transformado): caminar
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: EL PRESENTADOR, el dueño del espectáculo de la Ciudad Maldita. Un maestro de ceremonias demoníaco, alto y flaco, con cara de calavera sonriente y ojos rojos, galera negra con cinta roja, levita carmesí larga con solapas doradas y chaleco negro, guantes blancos gastados y un bastón negro con un orbe rojo que brilla en la punta. Pose teatral, como si presentara un número.
PALETA: #120a0e (negro), #3a1420 (vino oscuro), #8a1a2a (carmesí), #c02030 (rojo), #e8c27a (oro), #efe6d6 (hueso/guantes).
ESTA IMAGEN: acto II (transformado): caminar, 6 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadros 1–6: caminar encorvado, con garras, la galera rota. Mismo personaje, ahora más bestial: espalda encorvada, levita hecha jirones, garras largas.
Formato: UNA sola fila de 6 cuadros (6 columnas × 1 fila), celdas iguales de 96×128 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈110 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 6/10 — The Presenter: act II (transformed): walk
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: THE PRESENTER, owner of the show of the Cursed City. A tall, thin demonic ringmaster with a grinning skull face and red eyes, a black top hat with a red band, a long crimson tailcoat with golden lapels and a black vest, worn white gloves and a black cane topped with a glowing red orb. Theatrical pose, as if introducing an act.
PALETTE: #120a0e (negro), #3a1420 (vino oscuro), #8a1a2a (carmesí), #c02030 (rojo), #e8c27a (oro), #efe6d6 (hueso/guantes).
THIS IMAGE: act II (transformed): walk, 6 frames, facing RIGHT, side view (the game mirrors it for the left). frames 1–6: hunched walk with claws, broken top hat. Same character, now more bestial: hunched back, tattered tailcoat, long claws.
Format: ONE single row of 6 frames (6 columns × 1 row), equal 96×128 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 110 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 7/10 — El Presentador: acto II: zarpazo/lanzamiento
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: EL PRESENTADOR, el dueño del espectáculo de la Ciudad Maldita. Un maestro de ceremonias demoníaco, alto y flaco, con cara de calavera sonriente y ojos rojos, galera negra con cinta roja, levita carmesí larga con solapas doradas y chaleco negro, guantes blancos gastados y un bastón negro con un orbe rojo que brilla en la punta. Pose teatral, como si presentara un número.
PALETA: #120a0e (negro), #3a1420 (vino oscuro), #8a1a2a (carmesí), #c02030 (rojo), #e8c27a (oro), #efe6d6 (hueso/guantes).
ESTA IMAGEN: acto II: zarpazo/lanzamiento, 6 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadros 1–6: zarpazo con las dos garras.
Formato: UNA sola fila de 6 cuadros (6 columnas × 1 fila), celdas iguales de 96×128 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈110 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 7/10 — The Presenter: act II: claw / cast
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: THE PRESENTER, owner of the show of the Cursed City. A tall, thin demonic ringmaster with a grinning skull face and red eyes, a black top hat with a red band, a long crimson tailcoat with golden lapels and a black vest, worn white gloves and a black cane topped with a glowing red orb. Theatrical pose, as if introducing an act.
PALETTE: #120a0e (negro), #3a1420 (vino oscuro), #8a1a2a (carmesí), #c02030 (rojo), #e8c27a (oro), #efe6d6 (hueso/guantes).
THIS IMAGE: act II: claw / cast, 6 frames, facing RIGHT, side view (the game mirrors it for the left). frames 1–6: two-claw swipe.
Format: ONE single row of 6 frames (6 columns × 1 row), equal 96×128 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 110 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 8/10 — El Presentador: acto III (verdadera forma): flotar
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: EL PRESENTADOR, el dueño del espectáculo de la Ciudad Maldita. Un maestro de ceremonias demoníaco, alto y flaco, con cara de calavera sonriente y ojos rojos, galera negra con cinta roja, levita carmesí larga con solapas doradas y chaleco negro, guantes blancos gastados y un bastón negro con un orbe rojo que brilla en la punta. Pose teatral, como si presentara un número.
PALETA: #120a0e (negro), #3a1420 (vino oscuro), #8a1a2a (carmesí), #c02030 (rojo), #e8c27a (oro), #efe6d6 (hueso/guantes).
ESTA IMAGEN: acto III (verdadera forma): flotar, 6 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadros 1–6: espectro carmesí y violeta que flota, telas que ondulan, calavera con galera.
Formato: UNA sola fila de 6 cuadros (6 columnas × 1 fila), celdas iguales de 96×128 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈110 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 8/10 — The Presenter: act III (true form): float
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: THE PRESENTER, owner of the show of the Cursed City. A tall, thin demonic ringmaster with a grinning skull face and red eyes, a black top hat with a red band, a long crimson tailcoat with golden lapels and a black vest, worn white gloves and a black cane topped with a glowing red orb. Theatrical pose, as if introducing an act.
PALETTE: #120a0e (negro), #3a1420 (vino oscuro), #8a1a2a (carmesí), #c02030 (rojo), #e8c27a (oro), #efe6d6 (hueso/guantes).
THIS IMAGE: act III (true form): float, 6 frames, facing RIGHT, side view (the game mirrors it for the left). frames 1–6: a floating crimson-violet wraith, rippling cloth, skull with top hat.
Format: ONE single row of 6 frames (6 columns × 1 row), equal 96×128 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 110 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 9/10 — El Presentador: acto III: ataque (ovación)
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: EL PRESENTADOR, el dueño del espectáculo de la Ciudad Maldita. Un maestro de ceremonias demoníaco, alto y flaco, con cara de calavera sonriente y ojos rojos, galera negra con cinta roja, levita carmesí larga con solapas doradas y chaleco negro, guantes blancos gastados y un bastón negro con un orbe rojo que brilla en la punta. Pose teatral, como si presentara un número.
PALETA: #120a0e (negro), #3a1420 (vino oscuro), #8a1a2a (carmesí), #c02030 (rojo), #e8c27a (oro), #efe6d6 (hueso/guantes).
ESTA IMAGEN: acto III: ataque (ovación), 6 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadros 1–6: abre los brazos y lanza energía roja.
Formato: UNA sola fila de 6 cuadros (6 columnas × 1 fila), celdas iguales de 96×128 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈110 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 9/10 — The Presenter: act III: attack (ovation)
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: THE PRESENTER, owner of the show of the Cursed City. A tall, thin demonic ringmaster with a grinning skull face and red eyes, a black top hat with a red band, a long crimson tailcoat with golden lapels and a black vest, worn white gloves and a black cane topped with a glowing red orb. Theatrical pose, as if introducing an act.
PALETTE: #120a0e (negro), #3a1420 (vino oscuro), #8a1a2a (carmesí), #c02030 (rojo), #e8c27a (oro), #efe6d6 (hueso/guantes).
THIS IMAGE: act III: attack (ovation), 6 frames, facing RIGHT, side view (the game mirrors it for the left). frames 1–6: opens its arms and releases red energy.
Format: ONE single row of 6 frames (6 columns × 1 row), equal 96×128 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 110 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 10/10 — El Presentador: acto III: muerte
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: EL PRESENTADOR, el dueño del espectáculo de la Ciudad Maldita. Un maestro de ceremonias demoníaco, alto y flaco, con cara de calavera sonriente y ojos rojos, galera negra con cinta roja, levita carmesí larga con solapas doradas y chaleco negro, guantes blancos gastados y un bastón negro con un orbe rojo que brilla en la punta. Pose teatral, como si presentara un número.
PALETA: #120a0e (negro), #3a1420 (vino oscuro), #8a1a2a (carmesí), #c02030 (rojo), #e8c27a (oro), #efe6d6 (hueso/guantes).
ESTA IMAGEN: acto III: muerte, 8 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadros 1–8: se deshace en telas y humo rojo hasta desaparecer.
Formato: UNA sola fila de 8 cuadros (8 columnas × 1 fila), celdas iguales de 96×128 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈110 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 10/10 — The Presenter: act III: death
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: THE PRESENTER, owner of the show of the Cursed City. A tall, thin demonic ringmaster with a grinning skull face and red eyes, a black top hat with a red band, a long crimson tailcoat with golden lapels and a black vest, worn white gloves and a black cane topped with a glowing red orb. Theatrical pose, as if introducing an act.
PALETTE: #120a0e (negro), #3a1420 (vino oscuro), #8a1a2a (carmesí), #c02030 (rojo), #e8c27a (oro), #efe6d6 (hueso/guantes).
THIS IMAGE: act III: death, 8 frames, facing RIGHT, side view (the game mirrors it for the left). frames 1–8: unravels into cloth and red smoke until it vanishes.
Format: ONE single row of 8 frames (8 columns × 1 row), equal 96×128 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 110 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

### P0-02 · La Dama del Telón — `cm_dama`

| Campo | Valor |
|---|---|
| Arena | 01 · Ciudad Maldita |
| Rango | Subjefe (nivel 9) + sus Espejismos (copias traslúcidas) |
| Rol en combate | A distancia e invocación (radio 36, velocidad 62): telones en línea, zonas oscuras, espejismos y ecos; estalla al 30%. |
| Problema hoy | Arte de 27 px de ancho dibujado a ~5 veces: se ve en bloques. Caminata de 2 cuadros. |
| Mientras tanto | Cuerpo de la Dama del Bosque (hoja completa) con los rojos llevados al carmesí del teatro. Nombre sin cambios. |
| Paleta | #140a10 (negro), #4a1020 (vino), #9a1a2c (telón rojo), #d0303a (rojo vivo), #c8b8b0 (piel gris), #e0b050 (oro) |
| Celda | 96×128 px (personaje ≈110 px de alto) |
| Entrega | `cm_dama_1.png` … `cm_dama_4.png`, una fila por imagen |

**Descripción visual:** LA DAMA DEL TELÓN, subjefe de la Ciudad Maldita. Una mujer altísima y demacrada, piel gris pálida, corona de espinas doradas, un vestido que es un telón de teatro rojo y pesado que se arrastra y se abre en jirones, manos largas con uñas negras. Se mueve flotando, solemne, como bajando el telón sobre la ciudad.

**Planilla de animaciones** (estado × dirección × cuadros):

| Imagen | Estado | Dirección | Cuadros | Bucle |
|---|---|---|---|---|
| 1 | quieto, el telón ondula | perfil derecha (se espeja) | 4 | sí |
| 2 | avanza flotando, el vestido se arrastra | perfil derecha (se espeja) | 6 | sí |
| 3 | levanta un brazo | perfil derecha (se espeja) | 2 | no |
| 3 | baja el brazo con fuerza, el vestido se abre | perfil derecha (se espeja) | 2 | no |
| 3 | vuelve a la pose | perfil derecha (se espeja) | 2 | no |
| 4 | golpe recibido | perfil derecha (se espeja) | 2 | no |
| 4 | muerte: el telón la envuelve y cae vacío al piso | perfil derecha (se espeja) | 6 | no |

```text
PROMPT 1/4 — La Dama del Telón: quieto
Hoja de sprites para un videojuego. PERSONAJE: LA DAMA DEL TELÓN, subjefe de la Ciudad Maldita. Una mujer altísima y demacrada, piel gris pálida, corona de espinas doradas, un vestido que es un telón de teatro rojo y pesado que se arrastra y se abre en jirones, manos largas con uñas negras. Se mueve flotando, solemne, como bajando el telón sobre la ciudad.
PALETA: #140a10 (negro), #4a1020 (vino), #9a1a2c (telón rojo), #d0303a (rojo vivo), #c8b8b0 (piel gris), #e0b050 (oro).
ESTA IMAGEN: quieto, 4 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadros 1–4: quieto, el telón ondula.
Formato: UNA sola fila de 4 cuadros (4 columnas × 1 fila), celdas iguales de 96×128 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈110 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 1/4 — The Lady of the Curtain: idle
Sprite sheet for a video game. CHARACTER: THE LADY OF THE CURTAIN, sub-boss of the Cursed City. A very tall, gaunt woman with pale grey skin, a crown of golden thorns, a dress that is a heavy red theater curtain dragging and tearing into strips, long hands with black nails. She glides solemnly, as if lowering the curtain on the city.
PALETTE: #140a10 (negro), #4a1020 (vino), #9a1a2c (telón rojo), #d0303a (rojo vivo), #c8b8b0 (piel gris), #e0b050 (oro).
THIS IMAGE: idle, 4 frames, facing RIGHT, side view (the game mirrors it for the left). frames 1–4: idle, the curtain ripples.
Format: ONE single row of 4 frames (4 columns × 1 row), equal 96×128 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 110 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 2/4 — La Dama del Telón: caminar (flotando)
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: LA DAMA DEL TELÓN, subjefe de la Ciudad Maldita. Una mujer altísima y demacrada, piel gris pálida, corona de espinas doradas, un vestido que es un telón de teatro rojo y pesado que se arrastra y se abre en jirones, manos largas con uñas negras. Se mueve flotando, solemne, como bajando el telón sobre la ciudad.
PALETA: #140a10 (negro), #4a1020 (vino), #9a1a2c (telón rojo), #d0303a (rojo vivo), #c8b8b0 (piel gris), #e0b050 (oro).
ESTA IMAGEN: caminar (flotando), 6 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadros 1–6: avanza flotando, el vestido se arrastra.
Formato: UNA sola fila de 6 cuadros (6 columnas × 1 fila), celdas iguales de 96×128 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈110 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 2/4 — The Lady of the Curtain: walk (gliding)
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: THE LADY OF THE CURTAIN, sub-boss of the Cursed City. A very tall, gaunt woman with pale grey skin, a crown of golden thorns, a dress that is a heavy red theater curtain dragging and tearing into strips, long hands with black nails. She glides solemnly, as if lowering the curtain on the city.
PALETTE: #140a10 (negro), #4a1020 (vino), #9a1a2c (telón rojo), #d0303a (rojo vivo), #c8b8b0 (piel gris), #e0b050 (oro).
THIS IMAGE: walk (gliding), 6 frames, facing RIGHT, side view (the game mirrors it for the left). frames 1–6: glides forward, the dress drags.
Format: ONE single row of 6 frames (6 columns × 1 row), equal 96×128 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 110 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 3/4 — La Dama del Telón: conjuro: bajar el telón
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: LA DAMA DEL TELÓN, subjefe de la Ciudad Maldita. Una mujer altísima y demacrada, piel gris pálida, corona de espinas doradas, un vestido que es un telón de teatro rojo y pesado que se arrastra y se abre en jirones, manos largas con uñas negras. Se mueve flotando, solemne, como bajando el telón sobre la ciudad.
PALETA: #140a10 (negro), #4a1020 (vino), #9a1a2c (telón rojo), #d0303a (rojo vivo), #c8b8b0 (piel gris), #e0b050 (oro).
ESTA IMAGEN: conjuro: bajar el telón, 6 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadros 1–2: levanta un brazo; cuadros 3–4: baja el brazo con fuerza, el vestido se abre; cuadros 5–6: vuelve a la pose.
Formato: UNA sola fila de 6 cuadros (6 columnas × 1 fila), celdas iguales de 96×128 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈110 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 3/4 — The Lady of the Curtain: cast: drop the curtain
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: THE LADY OF THE CURTAIN, sub-boss of the Cursed City. A very tall, gaunt woman with pale grey skin, a crown of golden thorns, a dress that is a heavy red theater curtain dragging and tearing into strips, long hands with black nails. She glides solemnly, as if lowering the curtain on the city.
PALETTE: #140a10 (negro), #4a1020 (vino), #9a1a2c (telón rojo), #d0303a (rojo vivo), #c8b8b0 (piel gris), #e0b050 (oro).
THIS IMAGE: cast: drop the curtain, 6 frames, facing RIGHT, side view (the game mirrors it for the left). frames 1–2: raises one arm; frames 3–4: brings the arm down hard, the dress flares; frames 5–6: returns to pose.
Format: ONE single row of 6 frames (6 columns × 1 row), equal 96×128 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 110 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 4/4 — La Dama del Telón: golpe recibido y muerte
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: LA DAMA DEL TELÓN, subjefe de la Ciudad Maldita. Una mujer altísima y demacrada, piel gris pálida, corona de espinas doradas, un vestido que es un telón de teatro rojo y pesado que se arrastra y se abre en jirones, manos largas con uñas negras. Se mueve flotando, solemne, como bajando el telón sobre la ciudad.
PALETA: #140a10 (negro), #4a1020 (vino), #9a1a2c (telón rojo), #d0303a (rojo vivo), #c8b8b0 (piel gris), #e0b050 (oro).
ESTA IMAGEN: golpe recibido y muerte, 8 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadros 1–2: golpe recibido; cuadros 3–8: muerte: el telón la envuelve y cae vacío al piso.
Formato: UNA sola fila de 8 cuadros (8 columnas × 1 fila), celdas iguales de 96×128 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈110 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 4/4 — The Lady of the Curtain: hurt and death
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: THE LADY OF THE CURTAIN, sub-boss of the Cursed City. A very tall, gaunt woman with pale grey skin, a crown of golden thorns, a dress that is a heavy red theater curtain dragging and tearing into strips, long hands with black nails. She glides solemnly, as if lowering the curtain on the city.
PALETTE: #140a10 (negro), #4a1020 (vino), #9a1a2c (telón rojo), #d0303a (rojo vivo), #c8b8b0 (piel gris), #e0b050 (oro).
THIS IMAGE: hurt and death, 8 frames, facing RIGHT, side view (the game mirrors it for the left). frames 1–2: hurt; frames 3–8: death: the curtain wraps around her and falls empty to the floor.
Format: ONE single row of 8 frames (8 columns × 1 row), equal 96×128 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 110 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

### P0-03 · Maestro de Ceremonias — `cm_maestro`

| Campo | Valor |
|---|---|
| Arena | 01 · Ciudad Maldita |
| Rango | Subjefe (nivel 9, pelea junto al Tramoyista) |
| Rol en combate | A distancia y control (radio 32, velocidad 70): marca que estalla, zonas rojas, teletransporte. |
| Problema hoy | Arte de 22×70 px con el personaje de 24 px dibujado a 5 veces: bloques. Caminata de 2 cuadros. |
| Mientras tanto | Cuerpo de la Druida de Arena (tira completa del Laberinto) en carmesí oscuro. Nombre sin cambios. |
| Paleta | #120a0e (negro), #3a1420 (vino oscuro), #7a1624 (frac), #d02838 (ojo rojo), #d8c8b0 (hueso), #c8a060 (oro viejo) |
| Celda | 96×128 px (personaje ≈104 px de alto) |
| Entrega | `cm_maestro_1.png` … `cm_maestro_5.png`, una fila por imagen |

**Descripción visual:** El MAESTRO DE CEREMONIAS, ayudante del Presentador. Un hombre esquelético de sonrisa enorme y ojos rojos, galera alta con cinta roja, frac rojo oscuro con faldones largos y botones de hueso, pantalón a rayas negro y vino, y un bastón largo coronado por un ojo rojo brillante. Postura encorvada y teatral.

**Planilla de animaciones** (estado × dirección × cuadros):

| Imagen | Estado | Dirección | Cuadros | Bucle |
|---|---|---|---|---|
| 1 | quieto, apoya el bastón | perfil derecha (se espeja) | 4 | sí |
| 2 | caminar teatral, bastón adelante | perfil derecha (se espeja) | 6 | sí |
| 3 | apunta con el bastón y el ojo se enciende | perfil derecha (se espeja) | 6 | no |
| 4 | se hunde en humo rojo | perfil derecha (se espeja) | 3 | no |
| 4 | reaparece del humo | perfil derecha (se espeja) | 3 | no |
| 5 | golpe recibido, se le cae la galera | perfil derecha (se espeja) | 2 | no |
| 5 | muerte: se desploma y queda el bastón | perfil derecha (se espeja) | 6 | no |

```text
PROMPT 1/5 — Maestro de Ceremonias: quieto
Hoja de sprites para un videojuego. PERSONAJE: el MAESTRO DE CEREMONIAS, ayudante del Presentador. Un hombre esquelético de sonrisa enorme y ojos rojos, galera alta con cinta roja, frac rojo oscuro con faldones largos y botones de hueso, pantalón a rayas negro y vino, y un bastón largo coronado por un ojo rojo brillante. Postura encorvada y teatral.
PALETA: #120a0e (negro), #3a1420 (vino oscuro), #7a1624 (frac), #d02838 (ojo rojo), #d8c8b0 (hueso), #c8a060 (oro viejo).
ESTA IMAGEN: quieto, 4 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadros 1–4: quieto, apoya el bastón.
Formato: UNA sola fila de 4 cuadros (4 columnas × 1 fila), celdas iguales de 96×128 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈104 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 1/5 — Master of Ceremonies: idle
Sprite sheet for a video game. CHARACTER: the MASTER OF CEREMONIES, the Presenter's assistant. A skeletal man with a huge grin and red eyes, a tall top hat with a red band, a dark red tailcoat with long tails and bone buttons, black-and-wine striped trousers, and a long cane topped with a glowing red eye. Hunched, theatrical posture.
PALETTE: #120a0e (negro), #3a1420 (vino oscuro), #7a1624 (frac), #d02838 (ojo rojo), #d8c8b0 (hueso), #c8a060 (oro viejo).
THIS IMAGE: idle, 4 frames, facing RIGHT, side view (the game mirrors it for the left). frames 1–4: idle, leaning on the cane.
Format: ONE single row of 4 frames (4 columns × 1 row), equal 96×128 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 104 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 2/5 — Maestro de Ceremonias: caminar
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: el MAESTRO DE CEREMONIAS, ayudante del Presentador. Un hombre esquelético de sonrisa enorme y ojos rojos, galera alta con cinta roja, frac rojo oscuro con faldones largos y botones de hueso, pantalón a rayas negro y vino, y un bastón largo coronado por un ojo rojo brillante. Postura encorvada y teatral.
PALETA: #120a0e (negro), #3a1420 (vino oscuro), #7a1624 (frac), #d02838 (ojo rojo), #d8c8b0 (hueso), #c8a060 (oro viejo).
ESTA IMAGEN: caminar, 6 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadros 1–6: caminar teatral, bastón adelante.
Formato: UNA sola fila de 6 cuadros (6 columnas × 1 fila), celdas iguales de 96×128 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈104 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 2/5 — Master of Ceremonies: walk
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: the MASTER OF CEREMONIES, the Presenter's assistant. A skeletal man with a huge grin and red eyes, a tall top hat with a red band, a dark red tailcoat with long tails and bone buttons, black-and-wine striped trousers, and a long cane topped with a glowing red eye. Hunched, theatrical posture.
PALETTE: #120a0e (negro), #3a1420 (vino oscuro), #7a1624 (frac), #d02838 (ojo rojo), #d8c8b0 (hueso), #c8a060 (oro viejo).
THIS IMAGE: walk, 6 frames, facing RIGHT, side view (the game mirrors it for the left). frames 1–6: theatrical walk, cane forward.
Format: ONE single row of 6 frames (6 columns × 1 row), equal 96×128 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 104 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 3/5 — Maestro de Ceremonias: conjuro: marca
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: el MAESTRO DE CEREMONIAS, ayudante del Presentador. Un hombre esquelético de sonrisa enorme y ojos rojos, galera alta con cinta roja, frac rojo oscuro con faldones largos y botones de hueso, pantalón a rayas negro y vino, y un bastón largo coronado por un ojo rojo brillante. Postura encorvada y teatral.
PALETA: #120a0e (negro), #3a1420 (vino oscuro), #7a1624 (frac), #d02838 (ojo rojo), #d8c8b0 (hueso), #c8a060 (oro viejo).
ESTA IMAGEN: conjuro: marca, 6 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadros 1–6: apunta con el bastón y el ojo se enciende.
Formato: UNA sola fila de 6 cuadros (6 columnas × 1 fila), celdas iguales de 96×128 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈104 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 3/5 — Master of Ceremonies: cast: mark
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: the MASTER OF CEREMONIES, the Presenter's assistant. A skeletal man with a huge grin and red eyes, a tall top hat with a red band, a dark red tailcoat with long tails and bone buttons, black-and-wine striped trousers, and a long cane topped with a glowing red eye. Hunched, theatrical posture.
PALETTE: #120a0e (negro), #3a1420 (vino oscuro), #7a1624 (frac), #d02838 (ojo rojo), #d8c8b0 (hueso), #c8a060 (oro viejo).
THIS IMAGE: cast: mark, 6 frames, facing RIGHT, side view (the game mirrors it for the left). frames 1–6: points the cane and the eye lights up.
Format: ONE single row of 6 frames (6 columns × 1 row), equal 96×128 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 104 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 4/5 — Maestro de Ceremonias: teletransporte
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: el MAESTRO DE CEREMONIAS, ayudante del Presentador. Un hombre esquelético de sonrisa enorme y ojos rojos, galera alta con cinta roja, frac rojo oscuro con faldones largos y botones de hueso, pantalón a rayas negro y vino, y un bastón largo coronado por un ojo rojo brillante. Postura encorvada y teatral.
PALETA: #120a0e (negro), #3a1420 (vino oscuro), #7a1624 (frac), #d02838 (ojo rojo), #d8c8b0 (hueso), #c8a060 (oro viejo).
ESTA IMAGEN: teletransporte, 6 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadros 1–3: se hunde en humo rojo; cuadros 4–6: reaparece del humo.
Formato: UNA sola fila de 6 cuadros (6 columnas × 1 fila), celdas iguales de 96×128 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈104 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 4/5 — Master of Ceremonies: teleport
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: the MASTER OF CEREMONIES, the Presenter's assistant. A skeletal man with a huge grin and red eyes, a tall top hat with a red band, a dark red tailcoat with long tails and bone buttons, black-and-wine striped trousers, and a long cane topped with a glowing red eye. Hunched, theatrical posture.
PALETTE: #120a0e (negro), #3a1420 (vino oscuro), #7a1624 (frac), #d02838 (ojo rojo), #d8c8b0 (hueso), #c8a060 (oro viejo).
THIS IMAGE: teleport, 6 frames, facing RIGHT, side view (the game mirrors it for the left). frames 1–3: sinks into red smoke; frames 4–6: reappears from the smoke.
Format: ONE single row of 6 frames (6 columns × 1 row), equal 96×128 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 104 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 5/5 — Maestro de Ceremonias: golpe recibido y muerte
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: el MAESTRO DE CEREMONIAS, ayudante del Presentador. Un hombre esquelético de sonrisa enorme y ojos rojos, galera alta con cinta roja, frac rojo oscuro con faldones largos y botones de hueso, pantalón a rayas negro y vino, y un bastón largo coronado por un ojo rojo brillante. Postura encorvada y teatral.
PALETA: #120a0e (negro), #3a1420 (vino oscuro), #7a1624 (frac), #d02838 (ojo rojo), #d8c8b0 (hueso), #c8a060 (oro viejo).
ESTA IMAGEN: golpe recibido y muerte, 8 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadros 1–2: golpe recibido, se le cae la galera; cuadros 3–8: muerte: se desploma y queda el bastón.
Formato: UNA sola fila de 8 cuadros (8 columnas × 1 fila), celdas iguales de 96×128 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈104 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 5/5 — Master of Ceremonies: hurt and death
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: the MASTER OF CEREMONIES, the Presenter's assistant. A skeletal man with a huge grin and red eyes, a tall top hat with a red band, a dark red tailcoat with long tails and bone buttons, black-and-wine striped trousers, and a long cane topped with a glowing red eye. Hunched, theatrical posture.
PALETTE: #120a0e (negro), #3a1420 (vino oscuro), #7a1624 (frac), #d02838 (ojo rojo), #d8c8b0 (hueso), #c8a060 (oro viejo).
THIS IMAGE: hurt and death, 8 frames, facing RIGHT, side view (the game mirrors it for the left). frames 1–2: hurt, his hat falls; frames 3–8: death: collapses, only the cane remains.
Format: ONE single row of 8 frames (8 columns × 1 row), equal 96×128 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 104 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

### P0-04 · El Tramoyista — `cm_tramoyista`

| Campo | Valor |
|---|---|
| Arena | 01 · Ciudad Maldita |
| Rango | Subjefe (nivel 9, pelea junto al Maestro) |
| Rol en combate | Cuerpo a cuerpo pesado (radio 48, velocidad 52): golpe en cono, deja caer decorado, arma barricadas. |
| Problema hoy | Arte de 32×46 px dibujado a ~5 veces: bloques. Caminata de 2 cuadros. |
| Mientras tanto | Cuerpo del Autómata de Hierro (hoja completa de la Fábrica) en vino y hierro viejo. Nombre sin cambios. |
| Paleta | #141012 (negro), #4a3a3a (hierro viejo), #6a2a2a (cuero vino), #8a7a8a (piel gris violácea), #a07040 (madera), #c02a30 (rojo) |
| Celda | 128×128 px (personaje ≈112 px de alto) |
| Entrega | `cm_tramoyista_1.png` … `cm_tramoyista_4.png`, una fila por imagen |

**Descripción visual:** EL TRAMOYISTA, el que mueve el escenario del Presentador. Un bruto jorobado enorme, piel gris violácea llena de cicatrices, cara deforme con colmillos, que carga a la espalda un armazón de madera y hierro con poleas y sogas (la tramoya del teatro), delantal de cuero, brazos gigantes con vendas y un martillo de utilería. Camina pesado, arrastrando los nudillos.

**Planilla de animaciones** (estado × dirección × cuadros):

| Imagen | Estado | Dirección | Cuadros | Bucle |
|---|---|---|---|---|
| 1 | caminar pesado, la tramoya se balancea | perfil derecha (se espeja) | 6 | sí |
| 2 | levanta el martillo | perfil derecha (se espeja) | 2 | no |
| 2 | golpe en arco hacia adelante | perfil derecha (se espeja) | 2 | no |
| 2 | recupera | perfil derecha (se espeja) | 2 | no |
| 3 | tira de una soga con las dos manos | perfil derecha (se espeja) | 6 | no |
| 4 | golpe recibido | perfil derecha (se espeja) | 2 | no |
| 4 | muerte: cae de rodillas y la tramoya se le derrumba encima | perfil derecha (se espeja) | 6 | no |

```text
PROMPT 1/4 — El Tramoyista: caminar
Hoja de sprites para un videojuego. PERSONAJE: EL TRAMOYISTA, el que mueve el escenario del Presentador. Un bruto jorobado enorme, piel gris violácea llena de cicatrices, cara deforme con colmillos, que carga a la espalda un armazón de madera y hierro con poleas y sogas (la tramoya del teatro), delantal de cuero, brazos gigantes con vendas y un martillo de utilería. Camina pesado, arrastrando los nudillos.
PALETA: #141012 (negro), #4a3a3a (hierro viejo), #6a2a2a (cuero vino), #8a7a8a (piel gris violácea), #a07040 (madera), #c02a30 (rojo).
ESTA IMAGEN: caminar, 6 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadros 1–6: caminar pesado, la tramoya se balancea.
Formato: UNA sola fila de 6 cuadros (6 columnas × 1 fila), celdas iguales de 128×128 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈112 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 1/4 — The Stagehand: walk
Sprite sheet for a video game. CHARACTER: THE STAGEHAND, the one who moves the Presenter's stage. A huge hunchbacked brute with scarred violet-grey skin, a deformed tusked face, carrying on his back a wood-and-iron rig with pulleys and ropes (the theater's fly system), a leather apron, gigantic bandaged arms and a prop hammer. Heavy walk, knuckles dragging.
PALETTE: #141012 (negro), #4a3a3a (hierro viejo), #6a2a2a (cuero vino), #8a7a8a (piel gris violácea), #a07040 (madera), #c02a30 (rojo).
THIS IMAGE: walk, 6 frames, facing RIGHT, side view (the game mirrors it for the left). frames 1–6: heavy walk, the rig sways.
Format: ONE single row of 6 frames (6 columns × 1 row), equal 128×128 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 112 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 2/4 — El Tramoyista: golpe pesado
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: EL TRAMOYISTA, el que mueve el escenario del Presentador. Un bruto jorobado enorme, piel gris violácea llena de cicatrices, cara deforme con colmillos, que carga a la espalda un armazón de madera y hierro con poleas y sogas (la tramoya del teatro), delantal de cuero, brazos gigantes con vendas y un martillo de utilería. Camina pesado, arrastrando los nudillos.
PALETA: #141012 (negro), #4a3a3a (hierro viejo), #6a2a2a (cuero vino), #8a7a8a (piel gris violácea), #a07040 (madera), #c02a30 (rojo).
ESTA IMAGEN: golpe pesado, 6 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadros 1–2: levanta el martillo; cuadros 3–4: golpe en arco hacia adelante; cuadros 5–6: recupera.
Formato: UNA sola fila de 6 cuadros (6 columnas × 1 fila), celdas iguales de 128×128 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈112 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 2/4 — The Stagehand: heavy strike
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: THE STAGEHAND, the one who moves the Presenter's stage. A huge hunchbacked brute with scarred violet-grey skin, a deformed tusked face, carrying on his back a wood-and-iron rig with pulleys and ropes (the theater's fly system), a leather apron, gigantic bandaged arms and a prop hammer. Heavy walk, knuckles dragging.
PALETTE: #141012 (negro), #4a3a3a (hierro viejo), #6a2a2a (cuero vino), #8a7a8a (piel gris violácea), #a07040 (madera), #c02a30 (rojo).
THIS IMAGE: heavy strike, 6 frames, facing RIGHT, side view (the game mirrors it for the left). frames 1–2: raises the hammer; frames 3–4: forward arcing strike; frames 5–6: recovers.
Format: ONE single row of 6 frames (6 columns × 1 row), equal 128×128 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 112 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 3/4 — El Tramoyista: arrastrar decorado
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: EL TRAMOYISTA, el que mueve el escenario del Presentador. Un bruto jorobado enorme, piel gris violácea llena de cicatrices, cara deforme con colmillos, que carga a la espalda un armazón de madera y hierro con poleas y sogas (la tramoya del teatro), delantal de cuero, brazos gigantes con vendas y un martillo de utilería. Camina pesado, arrastrando los nudillos.
PALETA: #141012 (negro), #4a3a3a (hierro viejo), #6a2a2a (cuero vino), #8a7a8a (piel gris violácea), #a07040 (madera), #c02a30 (rojo).
ESTA IMAGEN: arrastrar decorado, 6 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadros 1–6: tira de una soga con las dos manos.
Formato: UNA sola fila de 6 cuadros (6 columnas × 1 fila), celdas iguales de 128×128 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈112 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 3/4 — The Stagehand: drag scenery
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: THE STAGEHAND, the one who moves the Presenter's stage. A huge hunchbacked brute with scarred violet-grey skin, a deformed tusked face, carrying on his back a wood-and-iron rig with pulleys and ropes (the theater's fly system), a leather apron, gigantic bandaged arms and a prop hammer. Heavy walk, knuckles dragging.
PALETTE: #141012 (negro), #4a3a3a (hierro viejo), #6a2a2a (cuero vino), #8a7a8a (piel gris violácea), #a07040 (madera), #c02a30 (rojo).
THIS IMAGE: drag scenery, 6 frames, facing RIGHT, side view (the game mirrors it for the left). frames 1–6: pulls a rope with both hands.
Format: ONE single row of 6 frames (6 columns × 1 row), equal 128×128 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 112 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 4/4 — El Tramoyista: golpe recibido y muerte
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: EL TRAMOYISTA, el que mueve el escenario del Presentador. Un bruto jorobado enorme, piel gris violácea llena de cicatrices, cara deforme con colmillos, que carga a la espalda un armazón de madera y hierro con poleas y sogas (la tramoya del teatro), delantal de cuero, brazos gigantes con vendas y un martillo de utilería. Camina pesado, arrastrando los nudillos.
PALETA: #141012 (negro), #4a3a3a (hierro viejo), #6a2a2a (cuero vino), #8a7a8a (piel gris violácea), #a07040 (madera), #c02a30 (rojo).
ESTA IMAGEN: golpe recibido y muerte, 8 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadros 1–2: golpe recibido; cuadros 3–8: muerte: cae de rodillas y la tramoya se le derrumba encima.
Formato: UNA sola fila de 8 cuadros (8 columnas × 1 fila), celdas iguales de 128×128 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈112 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 4/4 — The Stagehand: hurt and death
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: THE STAGEHAND, the one who moves the Presenter's stage. A huge hunchbacked brute with scarred violet-grey skin, a deformed tusked face, carrying on his back a wood-and-iron rig with pulleys and ropes (the theater's fly system), a leather apron, gigantic bandaged arms and a prop hammer. Heavy walk, knuckles dragging.
PALETTE: #141012 (negro), #4a3a3a (hierro viejo), #6a2a2a (cuero vino), #8a7a8a (piel gris violácea), #a07040 (madera), #c02a30 (rojo).
THIS IMAGE: hurt and death, 8 frames, facing RIGHT, side view (the game mirrors it for the left). frames 1–2: hurt; frames 3–8: death: falls to his knees and the rig collapses on him.
Format: ONE single row of 8 frames (8 columns × 1 row), equal 128×128 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 112 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

### P0-05 · Tiburón Joven — `tiburon_joven`

| Campo | Valor |
|---|---|
| Arena | 06 · Arena Acuática |
| Rango | Común (nivel 1+) |
| Rol en combate | Cuerpo a cuerpo rápido (radio 22, velocidad 132), en manada. |
| Problema hoy | 2 cuadros quietos + 1 de ataque, sin golpe ni muerte; píxel grueso. |
| Mientras tanto | Cuerpo del Esqueleto Cornudo en verde agua y hueso: pasa a llamarse «Ahogado de las Ruinas». Al volver el arte, se borra la entrada y recupera su nombre. |
| Paleta | #0e1a24 (azul noche), #24486a (lomo), #4a78a8 (azul acero), #dfe6ec (panza), #b04040 (encías) |
| Celda | 64×64 px (personaje ≈40 px de alto) |
| Entrega | `tiburon_joven_1.png` … `tiburon_joven_4.png`, una fila por imagen |

**Descripción visual:** Un TIBURÓN JOVEN de las ruinas hundidas: tiburón azul acero de lomo oscuro y panza blanca, cicatrices en el hocico, aletas con bordes rasgados, ojos vacíos, nada en círculos. Tamaño de un héroe acostado.

**Planilla de animaciones** (estado × dirección × cuadros):

| Imagen | Estado | Dirección | Cuadros | Bucle |
|---|---|---|---|---|
| 1 | nado de perfil, cola que empuja | perfil derecha (se espeja) | 6 | sí |
| 2 | prepara | perfil derecha (se espeja) | 1 | no |
| 2 | muerde / golpea hacia adelante | perfil derecha (se espeja) | 2 | no |
| 2 | recupera | perfil derecha (se espeja) | 1 | no |
| 3 | golpe recibido | perfil derecha (se espeja) | 1 | no |
| 3 | muerte: se da vuelta y se hunde | perfil derecha (se espeja) | 4 | no |
| 4 | de frente | frente | 4 | sí |
| 4 | de espaldas | frente | 4 | sí |

```text
PROMPT 1/4 — Tiburón Joven: nadar
Hoja de sprites para un videojuego. PERSONAJE: un TIBURÓN JOVEN de las ruinas hundidas: tiburón azul acero de lomo oscuro y panza blanca, cicatrices en el hocico, aletas con bordes rasgados, ojos vacíos, nada en círculos. Tamaño de un héroe acostado.
PALETA: #0e1a24 (azul noche), #24486a (lomo), #4a78a8 (azul acero), #dfe6ec (panza), #b04040 (encías).
ESTA IMAGEN: nadar, 6 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadros 1–6: nado de perfil, cola que empuja.
Formato: UNA sola fila de 6 cuadros (6 columnas × 1 fila), celdas iguales de 64×64 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈40 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 1/4 — Young Shark: swim
Sprite sheet for a video game. CHARACTER: a YOUNG SHARK from the sunken ruins: steel-blue shark with a dark back and white belly, scars on the snout, ragged fin edges, empty eyes, swimming in circles. About the length of a hero lying down.
PALETTE: #0e1a24 (azul noche), #24486a (lomo), #4a78a8 (azul acero), #dfe6ec (panza), #b04040 (encías).
THIS IMAGE: swim, 6 frames, facing RIGHT, side view (the game mirrors it for the left). frames 1–6: side swim, tail pushing.
Format: ONE single row of 6 frames (6 columns × 1 row), equal 64×64 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 40 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 2/4 — Tiburón Joven: ataque
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: un TIBURÓN JOVEN de las ruinas hundidas: tiburón azul acero de lomo oscuro y panza blanca, cicatrices en el hocico, aletas con bordes rasgados, ojos vacíos, nada en círculos. Tamaño de un héroe acostado.
PALETA: #0e1a24 (azul noche), #24486a (lomo), #4a78a8 (azul acero), #dfe6ec (panza), #b04040 (encías).
ESTA IMAGEN: ataque, 4 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadro 1: prepara; cuadros 2–3: muerde / golpea hacia adelante; cuadro 4: recupera.
Formato: UNA sola fila de 4 cuadros (4 columnas × 1 fila), celdas iguales de 64×64 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈40 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 2/4 — Young Shark: attack
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: a YOUNG SHARK from the sunken ruins: steel-blue shark with a dark back and white belly, scars on the snout, ragged fin edges, empty eyes, swimming in circles. About the length of a hero lying down.
PALETTE: #0e1a24 (azul noche), #24486a (lomo), #4a78a8 (azul acero), #dfe6ec (panza), #b04040 (encías).
THIS IMAGE: attack, 4 frames, facing RIGHT, side view (the game mirrors it for the left). frame 1: wind-up; frames 2–3: bites / strikes forward; frame 4: recovers.
Format: ONE single row of 4 frames (4 columns × 1 row), equal 64×64 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 40 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 3/4 — Tiburón Joven: golpe recibido y muerte
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: un TIBURÓN JOVEN de las ruinas hundidas: tiburón azul acero de lomo oscuro y panza blanca, cicatrices en el hocico, aletas con bordes rasgados, ojos vacíos, nada en círculos. Tamaño de un héroe acostado.
PALETA: #0e1a24 (azul noche), #24486a (lomo), #4a78a8 (azul acero), #dfe6ec (panza), #b04040 (encías).
ESTA IMAGEN: golpe recibido y muerte, 5 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadro 1: golpe recibido; cuadros 2–5: muerte: se da vuelta y se hunde.
Formato: UNA sola fila de 5 cuadros (5 columnas × 1 fila), celdas iguales de 64×64 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈40 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 3/4 — Young Shark: hurt and death
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: a YOUNG SHARK from the sunken ruins: steel-blue shark with a dark back and white belly, scars on the snout, ragged fin edges, empty eyes, swimming in circles. About the length of a hero lying down.
PALETTE: #0e1a24 (azul noche), #24486a (lomo), #4a78a8 (azul acero), #dfe6ec (panza), #b04040 (encías).
THIS IMAGE: hurt and death, 5 frames, facing RIGHT, side view (the game mirrors it for the left). frame 1: hurt; frames 2–5: death: turns belly-up and sinks.
Format: ONE single row of 5 frames (5 columns × 1 row), equal 64×64 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 40 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 4/4 — Tiburón Joven: nadar de frente y de espaldas
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: un TIBURÓN JOVEN de las ruinas hundidas: tiburón azul acero de lomo oscuro y panza blanca, cicatrices en el hocico, aletas con bordes rasgados, ojos vacíos, nada en círculos. Tamaño de un héroe acostado.
PALETA: #0e1a24 (azul noche), #24486a (lomo), #4a78a8 (azul acero), #dfe6ec (panza), #b04040 (encías).
ESTA IMAGEN: nadar de frente y de espaldas, 8 cuadros, DE FRENTE, caminando hacia la cámara. cuadros 1–4: de frente; cuadros 5–8: de espaldas.
Formato: UNA sola fila de 8 cuadros (8 columnas × 1 fila), celdas iguales de 64×64 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈40 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 4/4 — Young Shark: swim toward and away from camera
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: a YOUNG SHARK from the sunken ruins: steel-blue shark with a dark back and white belly, scars on the snout, ragged fin edges, empty eyes, swimming in circles. About the length of a hero lying down.
PALETTE: #0e1a24 (azul noche), #24486a (lomo), #4a78a8 (azul acero), #dfe6ec (panza), #b04040 (encías).
THIS IMAGE: swim toward and away from camera, 8 frames, FACING THE CAMERA, walking toward the viewer. frames 1–4: toward the camera; frames 5–8: away from the camera.
Format: ONE single row of 8 frames (8 columns × 1 row), equal 64×64 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 40 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

### P0-06 · Tiburón Blanco — `tiburon_blanco`

| Campo | Valor |
|---|---|
| Arena | 06 · Arena Acuática |
| Rango | Élite (niveles altos) |
| Rol en combate | Cuerpo a cuerpo rápido y pesado (radio 34, velocidad 112): embestida y mordida. |
| Problema hoy | 1 cuadro quieto + 1 de ataque, sin golpe ni muerte. |
| Mientras tanto | Cuerpo del Demonio de Hielo en verde abisal: pasa a llamarse «Tritón de las Fosas». |
| Paleta | #1a2228 (gris oscuro), #6a7a86 (gris lomo), #c8d2da (blanco sucio), #f0f4f6 (panza), #a03030 (encías) |
| Celda | 96×64 px (personaje ≈44 px de alto) |
| Entrega | `tiburon_blanco_1.png` … `tiburon_blanco_4.png`, una fila por imagen |

**Descripción visual:** El TIBURÓN BLANCO, el cazador favorito del Leviatán: un tiburón enorme gris pálido casi blanco, lomo marcado de cicatrices y arpones rotos clavados, mandíbula con varias filas de dientes, ojos negros.

**Planilla de animaciones** (estado × dirección × cuadros):

| Imagen | Estado | Dirección | Cuadros | Bucle |
|---|---|---|---|---|
| 1 | nado de perfil, poderoso | perfil derecha (se espeja) | 6 | sí |
| 2 | se echa atrás | perfil derecha (se espeja) | 1 | no |
| 2 | embiste con la boca abierta | perfil derecha (se espeja) | 2 | no |
| 2 | cierra la mordida | perfil derecha (se espeja) | 1 | no |
| 3 | golpe recibido | perfil derecha (se espeja) | 1 | no |
| 3 | muerte: se da vuelta y se hunde | perfil derecha (se espeja) | 4 | no |
| 4 | de frente | frente | 4 | sí |
| 4 | de espaldas | frente | 4 | sí |

```text
PROMPT 1/4 — Tiburón Blanco: nadar
Hoja de sprites para un videojuego. PERSONAJE: el TIBURÓN BLANCO, el cazador favorito del Leviatán: un tiburón enorme gris pálido casi blanco, lomo marcado de cicatrices y arpones rotos clavados, mandíbula con varias filas de dientes, ojos negros.
PALETA: #1a2228 (gris oscuro), #6a7a86 (gris lomo), #c8d2da (blanco sucio), #f0f4f6 (panza), #a03030 (encías).
ESTA IMAGEN: nadar, 6 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadros 1–6: nado de perfil, poderoso.
Formato: UNA sola fila de 6 cuadros (6 columnas × 1 fila), celdas iguales de 96×64 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈44 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 1/4 — Great White Shark: swim
Sprite sheet for a video game. CHARACTER: the GREAT WHITE SHARK, the Leviathan's favorite hunter: a huge pale grey, almost white shark, back covered in scars with broken harpoons stuck in it, jaws with several rows of teeth, black eyes.
PALETTE: #1a2228 (gris oscuro), #6a7a86 (gris lomo), #c8d2da (blanco sucio), #f0f4f6 (panza), #a03030 (encías).
THIS IMAGE: swim, 6 frames, facing RIGHT, side view (the game mirrors it for the left). frames 1–6: powerful side swim.
Format: ONE single row of 6 frames (6 columns × 1 row), equal 96×64 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 44 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 2/4 — Tiburón Blanco: embestida y mordida
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: el TIBURÓN BLANCO, el cazador favorito del Leviatán: un tiburón enorme gris pálido casi blanco, lomo marcado de cicatrices y arpones rotos clavados, mandíbula con varias filas de dientes, ojos negros.
PALETA: #1a2228 (gris oscuro), #6a7a86 (gris lomo), #c8d2da (blanco sucio), #f0f4f6 (panza), #a03030 (encías).
ESTA IMAGEN: embestida y mordida, 4 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadro 1: se echa atrás; cuadros 2–3: embiste con la boca abierta; cuadro 4: cierra la mordida.
Formato: UNA sola fila de 4 cuadros (4 columnas × 1 fila), celdas iguales de 96×64 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈44 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 2/4 — Great White Shark: charge and bite
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: the GREAT WHITE SHARK, the Leviathan's favorite hunter: a huge pale grey, almost white shark, back covered in scars with broken harpoons stuck in it, jaws with several rows of teeth, black eyes.
PALETTE: #1a2228 (gris oscuro), #6a7a86 (gris lomo), #c8d2da (blanco sucio), #f0f4f6 (panza), #a03030 (encías).
THIS IMAGE: charge and bite, 4 frames, facing RIGHT, side view (the game mirrors it for the left). frame 1: pulls back; frames 2–3: charges with open jaws; frame 4: snaps the jaws shut.
Format: ONE single row of 4 frames (4 columns × 1 row), equal 96×64 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 44 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 3/4 — Tiburón Blanco: golpe recibido y muerte
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: el TIBURÓN BLANCO, el cazador favorito del Leviatán: un tiburón enorme gris pálido casi blanco, lomo marcado de cicatrices y arpones rotos clavados, mandíbula con varias filas de dientes, ojos negros.
PALETA: #1a2228 (gris oscuro), #6a7a86 (gris lomo), #c8d2da (blanco sucio), #f0f4f6 (panza), #a03030 (encías).
ESTA IMAGEN: golpe recibido y muerte, 5 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadro 1: golpe recibido; cuadros 2–5: muerte: se da vuelta y se hunde.
Formato: UNA sola fila de 5 cuadros (5 columnas × 1 fila), celdas iguales de 96×64 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈44 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 3/4 — Great White Shark: hurt and death
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: the GREAT WHITE SHARK, the Leviathan's favorite hunter: a huge pale grey, almost white shark, back covered in scars with broken harpoons stuck in it, jaws with several rows of teeth, black eyes.
PALETTE: #1a2228 (gris oscuro), #6a7a86 (gris lomo), #c8d2da (blanco sucio), #f0f4f6 (panza), #a03030 (encías).
THIS IMAGE: hurt and death, 5 frames, facing RIGHT, side view (the game mirrors it for the left). frame 1: hurt; frames 2–5: death: turns belly-up and sinks.
Format: ONE single row of 5 frames (5 columns × 1 row), equal 96×64 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 44 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 4/4 — Tiburón Blanco: nadar de frente y de espaldas
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: el TIBURÓN BLANCO, el cazador favorito del Leviatán: un tiburón enorme gris pálido casi blanco, lomo marcado de cicatrices y arpones rotos clavados, mandíbula con varias filas de dientes, ojos negros.
PALETA: #1a2228 (gris oscuro), #6a7a86 (gris lomo), #c8d2da (blanco sucio), #f0f4f6 (panza), #a03030 (encías).
ESTA IMAGEN: nadar de frente y de espaldas, 8 cuadros, DE FRENTE, caminando hacia la cámara. cuadros 1–4: de frente; cuadros 5–8: de espaldas.
Formato: UNA sola fila de 8 cuadros (8 columnas × 1 fila), celdas iguales de 96×64 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈44 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 4/4 — Great White Shark: swim toward and away from camera
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: the GREAT WHITE SHARK, the Leviathan's favorite hunter: a huge pale grey, almost white shark, back covered in scars with broken harpoons stuck in it, jaws with several rows of teeth, black eyes.
PALETTE: #1a2228 (gris oscuro), #6a7a86 (gris lomo), #c8d2da (blanco sucio), #f0f4f6 (panza), #a03030 (encías).
THIS IMAGE: swim toward and away from camera, 8 frames, FACING THE CAMERA, walking toward the viewer. frames 1–4: toward the camera; frames 5–8: away from the camera.
Format: ONE single row of 8 frames (8 columns × 1 row), equal 96×64 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 44 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

### P0-07 · Cangrejo Acorazado — `cangrejo_acorazado`

| Campo | Valor |
|---|---|
| Arena | 06 · Arena Acuática |
| Rango | Común (niveles medios) |
| Rol en combate | Cuerpo a cuerpo lento y duro (radio 26, velocidad 42). |
| Problema hoy | 2 cuadros quietos + 1 de ataque, sin golpe ni muerte; píxel grueso. |
| Mientras tanto | Cuerpo de la Araña Mecánica en rojo coral: pasa a llamarse «Cangrejo Araña». |
| Paleta | #1a0c0a (negro), #6a1e18 (rojo oscuro), #b0402c (rojo cangrejo), #e08a5a (coral), #6a6a62 (hierro), #5a8a5a (alga) |
| Celda | 64×64 px (personaje ≈38 px de alto) |
| Entrega | `cangrejo_acorazado_1.png` … `cangrejo_acorazado_4.png`, una fila por imagen |

**Descripción visual:** Un CANGREJO ACORAZADO que creció dentro de la armadura de un soldado ahogado: caparazón rojo con placas de hierro oxidado y un casco hundido encajado encima, tenazas enormes, percebes y algas.

**Planilla de animaciones** (estado × dirección × cuadros):

| Imagen | Estado | Dirección | Cuadros | Bucle |
|---|---|---|---|---|
| 1 | camina de costado, patas alternadas | perfil derecha (se espeja) | 6 | sí |
| 2 | abre las tenazas | perfil derecha (se espeja) | 1 | no |
| 2 | cierra con fuerza hacia adelante | perfil derecha (se espeja) | 2 | no |
| 2 | recupera | perfil derecha (se espeja) | 1 | no |
| 3 | golpe recibido, se encoge | perfil derecha (se espeja) | 1 | no |
| 3 | muerte: se da vuelta panza arriba, patas que se cierran | perfil derecha (se espeja) | 4 | no |
| 4 | de frente | frente | 4 | sí |
| 4 | de espaldas | frente | 4 | sí |

```text
PROMPT 1/4 — Cangrejo Acorazado: caminar de costado
Hoja de sprites para un videojuego. PERSONAJE: un CANGREJO ACORAZADO que creció dentro de la armadura de un soldado ahogado: caparazón rojo con placas de hierro oxidado y un casco hundido encajado encima, tenazas enormes, percebes y algas.
PALETA: #1a0c0a (negro), #6a1e18 (rojo oscuro), #b0402c (rojo cangrejo), #e08a5a (coral), #6a6a62 (hierro), #5a8a5a (alga).
ESTA IMAGEN: caminar de costado, 6 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadros 1–6: camina de costado, patas alternadas.
Formato: UNA sola fila de 6 cuadros (6 columnas × 1 fila), celdas iguales de 64×64 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈38 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 1/4 — Armored Crab: sideways walk
Sprite sheet for a video game. CHARACTER: an ARMORED CRAB that grew inside the armor of a drowned soldier: red shell with rusted iron plates and a dented helmet wedged on top, huge pincers, barnacles and seaweed.
PALETTE: #1a0c0a (negro), #6a1e18 (rojo oscuro), #b0402c (rojo cangrejo), #e08a5a (coral), #6a6a62 (hierro), #5a8a5a (alga).
THIS IMAGE: sideways walk, 6 frames, facing RIGHT, side view (the game mirrors it for the left). frames 1–6: walks sideways, alternating legs.
Format: ONE single row of 6 frames (6 columns × 1 row), equal 64×64 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 38 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 2/4 — Cangrejo Acorazado: tenazazo
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: un CANGREJO ACORAZADO que creció dentro de la armadura de un soldado ahogado: caparazón rojo con placas de hierro oxidado y un casco hundido encajado encima, tenazas enormes, percebes y algas.
PALETA: #1a0c0a (negro), #6a1e18 (rojo oscuro), #b0402c (rojo cangrejo), #e08a5a (coral), #6a6a62 (hierro), #5a8a5a (alga).
ESTA IMAGEN: tenazazo, 4 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadro 1: abre las tenazas; cuadros 2–3: cierra con fuerza hacia adelante; cuadro 4: recupera.
Formato: UNA sola fila de 4 cuadros (4 columnas × 1 fila), celdas iguales de 64×64 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈38 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 2/4 — Armored Crab: pincer strike
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: an ARMORED CRAB that grew inside the armor of a drowned soldier: red shell with rusted iron plates and a dented helmet wedged on top, huge pincers, barnacles and seaweed.
PALETTE: #1a0c0a (negro), #6a1e18 (rojo oscuro), #b0402c (rojo cangrejo), #e08a5a (coral), #6a6a62 (hierro), #5a8a5a (alga).
THIS IMAGE: pincer strike, 4 frames, facing RIGHT, side view (the game mirrors it for the left). frame 1: opens the pincers; frames 2–3: snaps forward hard; frame 4: recovers.
Format: ONE single row of 4 frames (4 columns × 1 row), equal 64×64 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 38 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 3/4 — Cangrejo Acorazado: golpe recibido y muerte
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: un CANGREJO ACORAZADO que creció dentro de la armadura de un soldado ahogado: caparazón rojo con placas de hierro oxidado y un casco hundido encajado encima, tenazas enormes, percebes y algas.
PALETA: #1a0c0a (negro), #6a1e18 (rojo oscuro), #b0402c (rojo cangrejo), #e08a5a (coral), #6a6a62 (hierro), #5a8a5a (alga).
ESTA IMAGEN: golpe recibido y muerte, 5 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadro 1: golpe recibido, se encoge; cuadros 2–5: muerte: se da vuelta panza arriba, patas que se cierran.
Formato: UNA sola fila de 5 cuadros (5 columnas × 1 fila), celdas iguales de 64×64 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈38 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 3/4 — Armored Crab: hurt and death
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: an ARMORED CRAB that grew inside the armor of a drowned soldier: red shell with rusted iron plates and a dented helmet wedged on top, huge pincers, barnacles and seaweed.
PALETTE: #1a0c0a (negro), #6a1e18 (rojo oscuro), #b0402c (rojo cangrejo), #e08a5a (coral), #6a6a62 (hierro), #5a8a5a (alga).
THIS IMAGE: hurt and death, 5 frames, facing RIGHT, side view (the game mirrors it for the left). frame 1: hurt, retracts; frames 2–5: death: flips belly-up, legs curling in.
Format: ONE single row of 5 frames (5 columns × 1 row), equal 64×64 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 38 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 4/4 — Cangrejo Acorazado: caminar de frente y de espaldas
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: un CANGREJO ACORAZADO que creció dentro de la armadura de un soldado ahogado: caparazón rojo con placas de hierro oxidado y un casco hundido encajado encima, tenazas enormes, percebes y algas.
PALETA: #1a0c0a (negro), #6a1e18 (rojo oscuro), #b0402c (rojo cangrejo), #e08a5a (coral), #6a6a62 (hierro), #5a8a5a (alga).
ESTA IMAGEN: caminar de frente y de espaldas, 8 cuadros, DE FRENTE, caminando hacia la cámara. cuadros 1–4: de frente; cuadros 5–8: de espaldas.
Formato: UNA sola fila de 8 cuadros (8 columnas × 1 fila), celdas iguales de 64×64 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈38 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 4/4 — Armored Crab: walk toward and away from camera
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: an ARMORED CRAB that grew inside the armor of a drowned soldier: red shell with rusted iron plates and a dented helmet wedged on top, huge pincers, barnacles and seaweed.
PALETTE: #1a0c0a (negro), #6a1e18 (rojo oscuro), #b0402c (rojo cangrejo), #e08a5a (coral), #6a6a62 (hierro), #5a8a5a (alga).
THIS IMAGE: walk toward and away from camera, 8 frames, FACING THE CAMERA, walking toward the viewer. frames 1–4: toward the camera; frames 5–8: away from the camera.
Format: ONE single row of 8 frames (8 columns × 1 row), equal 64×64 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 38 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

### P0-08 · Medusa Eléctrica — `medusa_electrica`

| Campo | Valor |
|---|---|
| Arena | 06 · Arena Acuática |
| Rango | Común |
| Rol en combate | Cuerpo a cuerpo lento (radio 22, velocidad 50): descarga al contacto. |
| Problema hoy | 2 cuadros quietos + 1 de ataque, sin golpe ni muerte. |
| Mientras tanto | Cuerpo del Acechador de Esporas (Reino Fúngico) en azul eléctrico. Nombre sin cambios. |
| Paleta | #140a2a (violeta noche), #4a3a9a (violeta), #8a6fd8 (lavanda), #bfe0ff (luz), #ffe86a (rayo) |
| Celda | 64×80 px (personaje ≈52 px de alto) |
| Entrega | `medusa_electrica_1.png` … `medusa_electrica_3.png`, una fila por imagen |

**Descripción visual:** Una MEDUSA ELÉCTRICA cargada con la energía de los cristales perdidos: campana translúcida violeta y azul con venas de luz, tentáculos largos que chisporrotean con rayos amarillos, flota a media altura.

**Planilla de animaciones** (estado × dirección × cuadros):

| Imagen | Estado | Dirección | Cuadros | Bucle |
|---|---|---|---|---|
| 1 | la campana se contrae y se abre | perfil derecha (se espeja) | 6 | sí |
| 2 | se ilumina | perfil derecha (se espeja) | 1 | no |
| 2 | descarga, rayos en los tentáculos | perfil derecha (se espeja) | 2 | no |
| 2 | se apaga | perfil derecha (se espeja) | 1 | no |
| 3 | golpe recibido | perfil derecha (se espeja) | 1 | no |
| 3 | muerte: se apaga, se desinfla y cae | perfil derecha (se espeja) | 4 | no |

```text
PROMPT 1/3 — Medusa Eléctrica: flotar (pulso)
Hoja de sprites para un videojuego. PERSONAJE: una MEDUSA ELÉCTRICA cargada con la energía de los cristales perdidos: campana translúcida violeta y azul con venas de luz, tentáculos largos que chisporrotean con rayos amarillos, flota a media altura.
PALETA: #140a2a (violeta noche), #4a3a9a (violeta), #8a6fd8 (lavanda), #bfe0ff (luz), #ffe86a (rayo).
ESTA IMAGEN: flotar (pulso), 6 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadros 1–6: la campana se contrae y se abre.
Formato: UNA sola fila de 6 cuadros (6 columnas × 1 fila), celdas iguales de 64×80 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈52 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 1/3 — Electric Jellyfish: float (pulse)
Sprite sheet for a video game. CHARACTER: an ELECTRIC JELLYFISH charged with the energy of lost crystals: a translucent violet-blue bell with glowing veins, long tentacles crackling with yellow lightning, floating at mid height.
PALETTE: #140a2a (violeta noche), #4a3a9a (violeta), #8a6fd8 (lavanda), #bfe0ff (luz), #ffe86a (rayo).
THIS IMAGE: float (pulse), 6 frames, facing RIGHT, side view (the game mirrors it for the left). frames 1–6: the bell contracts and expands.
Format: ONE single row of 6 frames (6 columns × 1 row), equal 64×80 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 52 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 2/3 — Medusa Eléctrica: descarga
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: una MEDUSA ELÉCTRICA cargada con la energía de los cristales perdidos: campana translúcida violeta y azul con venas de luz, tentáculos largos que chisporrotean con rayos amarillos, flota a media altura.
PALETA: #140a2a (violeta noche), #4a3a9a (violeta), #8a6fd8 (lavanda), #bfe0ff (luz), #ffe86a (rayo).
ESTA IMAGEN: descarga, 4 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadro 1: se ilumina; cuadros 2–3: descarga, rayos en los tentáculos; cuadro 4: se apaga.
Formato: UNA sola fila de 4 cuadros (4 columnas × 1 fila), celdas iguales de 64×80 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈52 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 2/3 — Electric Jellyfish: discharge
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: an ELECTRIC JELLYFISH charged with the energy of lost crystals: a translucent violet-blue bell with glowing veins, long tentacles crackling with yellow lightning, floating at mid height.
PALETTE: #140a2a (violeta noche), #4a3a9a (violeta), #8a6fd8 (lavanda), #bfe0ff (luz), #ffe86a (rayo).
THIS IMAGE: discharge, 4 frames, facing RIGHT, side view (the game mirrors it for the left). frame 1: lights up; frames 2–3: discharges, lightning on the tentacles; frame 4: dims.
Format: ONE single row of 4 frames (4 columns × 1 row), equal 64×80 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 52 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 3/3 — Medusa Eléctrica: golpe recibido y muerte
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: una MEDUSA ELÉCTRICA cargada con la energía de los cristales perdidos: campana translúcida violeta y azul con venas de luz, tentáculos largos que chisporrotean con rayos amarillos, flota a media altura.
PALETA: #140a2a (violeta noche), #4a3a9a (violeta), #8a6fd8 (lavanda), #bfe0ff (luz), #ffe86a (rayo).
ESTA IMAGEN: golpe recibido y muerte, 5 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadro 1: golpe recibido; cuadros 2–5: muerte: se apaga, se desinfla y cae.
Formato: UNA sola fila de 5 cuadros (5 columnas × 1 fila), celdas iguales de 64×80 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈52 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 3/3 — Electric Jellyfish: hurt and death
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: an ELECTRIC JELLYFISH charged with the energy of lost crystals: a translucent violet-blue bell with glowing veins, long tentacles crackling with yellow lightning, floating at mid height.
PALETTE: #140a2a (violeta noche), #4a3a9a (violeta), #8a6fd8 (lavanda), #bfe0ff (luz), #ffe86a (rayo).
THIS IMAGE: hurt and death, 5 frames, facing RIGHT, side view (the game mirrors it for the left). frame 1: hurt; frames 2–5: death: goes dark, deflates and sinks.
Format: ONE single row of 5 frames (5 columns × 1 row), equal 64×80 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 52 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

### P0-09 · Sirena Abisal — `sirena_abisal`

| Campo | Valor |
|---|---|
| Arena | 06 · Arena Acuática |
| Rango | Común (nivel 4+) |
| Rol en combate | A distancia (radio 22, velocidad 70, alcance 280): canto / proyectil de agua. |
| Problema hoy | 1 cuadro quieto + 1 de ataque, sin golpe ni muerte. |
| Mientras tanto | Cuerpo de la Medusa del Laberinto (mujer con cola de serpiente) en azul abisal. Nombre sin cambios. |
| Paleta | #0a1420 (azul noche), #1e3a5a (cola), #3a5a8a (azul), #8ab8d8 (piel), #7fd0e0 (brillo), #1a1418 (pelo) |
| Celda | 64×80 px (personaje ≈56 px de alto) |
| Entrega | `sirena_abisal_1.png` … `sirena_abisal_3.png`, una fila por imagen |

**Descripción visual:** Una SIRENA ABISAL de las fosas: mujer de piel azul pálida con cola de pez larga y oscura, pelo negro que flota como algas, ojos blancos que brillan, aletas en los brazos, collar de perlas negras. Canta con la boca abierta.

**Planilla de animaciones** (estado × dirección × cuadros):

| Imagen | Estado | Dirección | Cuadros | Bucle |
|---|---|---|---|---|
| 1 | avanza ondulando la cola | perfil derecha (se espeja) | 6 | sí |
| 2 | toma aire | perfil derecha (se espeja) | 1 | no |
| 2 | canta y lanza una esfera de agua | perfil derecha (se espeja) | 2 | no |
| 2 | recupera | perfil derecha (se espeja) | 1 | no |
| 3 | golpe recibido | perfil derecha (se espeja) | 1 | no |
| 3 | muerte: se desploma y se disuelve en espuma | perfil derecha (se espeja) | 4 | no |

```text
PROMPT 1/3 — Sirena Abisal: deslizarse
Hoja de sprites para un videojuego. PERSONAJE: una SIRENA ABISAL de las fosas: mujer de piel azul pálida con cola de pez larga y oscura, pelo negro que flota como algas, ojos blancos que brillan, aletas en los brazos, collar de perlas negras. Canta con la boca abierta.
PALETA: #0a1420 (azul noche), #1e3a5a (cola), #3a5a8a (azul), #8ab8d8 (piel), #7fd0e0 (brillo), #1a1418 (pelo).
ESTA IMAGEN: deslizarse, 6 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadros 1–6: avanza ondulando la cola.
Formato: UNA sola fila de 6 cuadros (6 columnas × 1 fila), celdas iguales de 64×80 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈56 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 1/3 — Abyssal Siren: glide
Sprite sheet for a video game. CHARACTER: an ABYSSAL SIREN from the trenches: a pale blue-skinned woman with a long dark fish tail, black hair floating like seaweed, glowing white eyes, fins on her arms, a black pearl necklace. She sings with her mouth open.
PALETTE: #0a1420 (azul noche), #1e3a5a (cola), #3a5a8a (azul), #8ab8d8 (piel), #7fd0e0 (brillo), #1a1418 (pelo).
THIS IMAGE: glide, 6 frames, facing RIGHT, side view (the game mirrors it for the left). frames 1–6: moves forward undulating the tail.
Format: ONE single row of 6 frames (6 columns × 1 row), equal 64×80 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 56 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 2/3 — Sirena Abisal: canto / lanzar proyectil de agua
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: una SIRENA ABISAL de las fosas: mujer de piel azul pálida con cola de pez larga y oscura, pelo negro que flota como algas, ojos blancos que brillan, aletas en los brazos, collar de perlas negras. Canta con la boca abierta.
PALETA: #0a1420 (azul noche), #1e3a5a (cola), #3a5a8a (azul), #8ab8d8 (piel), #7fd0e0 (brillo), #1a1418 (pelo).
ESTA IMAGEN: canto / lanzar proyectil de agua, 4 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadro 1: toma aire; cuadros 2–3: canta y lanza una esfera de agua; cuadro 4: recupera.
Formato: UNA sola fila de 4 cuadros (4 columnas × 1 fila), celdas iguales de 64×80 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈56 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 2/3 — Abyssal Siren: song / cast a water projectile
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: an ABYSSAL SIREN from the trenches: a pale blue-skinned woman with a long dark fish tail, black hair floating like seaweed, glowing white eyes, fins on her arms, a black pearl necklace. She sings with her mouth open.
PALETTE: #0a1420 (azul noche), #1e3a5a (cola), #3a5a8a (azul), #8ab8d8 (piel), #7fd0e0 (brillo), #1a1418 (pelo).
THIS IMAGE: song / cast a water projectile, 4 frames, facing RIGHT, side view (the game mirrors it for the left). frame 1: breathes in; frames 2–3: sings and throws a water orb; frame 4: recovers.
Format: ONE single row of 4 frames (4 columns × 1 row), equal 64×80 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 56 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 3/3 — Sirena Abisal: golpe recibido y muerte
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: una SIRENA ABISAL de las fosas: mujer de piel azul pálida con cola de pez larga y oscura, pelo negro que flota como algas, ojos blancos que brillan, aletas en los brazos, collar de perlas negras. Canta con la boca abierta.
PALETA: #0a1420 (azul noche), #1e3a5a (cola), #3a5a8a (azul), #8ab8d8 (piel), #7fd0e0 (brillo), #1a1418 (pelo).
ESTA IMAGEN: golpe recibido y muerte, 5 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadro 1: golpe recibido; cuadros 2–5: muerte: se desploma y se disuelve en espuma.
Formato: UNA sola fila de 5 cuadros (5 columnas × 1 fila), celdas iguales de 64×80 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈56 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 3/3 — Abyssal Siren: hurt and death
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: an ABYSSAL SIREN from the trenches: a pale blue-skinned woman with a long dark fish tail, black hair floating like seaweed, glowing white eyes, fins on her arms, a black pearl necklace. She sings with her mouth open.
PALETTE: #0a1420 (azul noche), #1e3a5a (cola), #3a5a8a (azul), #8ab8d8 (piel), #7fd0e0 (brillo), #1a1418 (pelo).
THIS IMAGE: hurt and death, 5 frames, facing RIGHT, side view (the game mirrors it for the left). frame 1: hurt; frames 2–5: death: collapses and dissolves into foam.
Format: ONE single row of 5 frames (5 columns × 1 row), equal 64×80 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 56 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

### P0-10 · Jinete Sin Cabeza (Abismo) — `ab_jinete`

| Campo | Valor |
|---|---|
| Arena | 08 · Abismo |
| Rango | Élite (nivel 6+) |
| Rol en combate | Carga en línea (radio 34, velocidad 92): marca la trayectoria y embiste empujando a todo lo que toca. |
| Problema hoy | Caminar de 1 cuadro; el ataque es el mismo quieto. Arte a ~4 veces: bloques. |
| Mientras tanto | Cuerpo del Jinete Sin Cabeza de la Arena Divina (hoja completa) llevado al violeta del Abismo. Mismo personaje de leyenda: nombre sin cambios. |
| Paleta | #0e0a14 (negro), #2a1a3a (púrpura oscuro), #6040a0 (violeta), #b070ff (fuego violeta), #8a8a9a (acero), #c02030 (ojos) |
| Celda | 112×96 px (personaje ≈84 px de alto) |
| Entrega | `ab_jinete_1.png` … `ab_jinete_4.png`, una fila por imagen |

**Descripción visual:** El JINETE SIN CABEZA del Abismo: un caballero antiguo con armadura negra y púrpura, sin cabeza (del cuello sale una llama violeta), capa hecha jirones, una lanza larga con punta violeta brillante, montado en un caballo demoníaco negro de crines y cascos de fuego violeta, ojos rojos.

**Planilla de animaciones** (estado × dirección × cuadros):

| Imagen | Estado | Dirección | Cuadros | Bucle |
|---|---|---|---|---|
| 1 | galope de perfil | perfil derecha (se espeja) | 6 | sí |
| 2 | el caballo se para en dos patas y el jinete apunta la lanza | perfil derecha (se espeja) | 4 | no |
| 3 | carga a toda velocidad, lanza al frente | perfil derecha (se espeja) | 4 | no |
| 3 | impacto y frenada | perfil derecha (se espeja) | 2 | no |
| 4 | golpe recibido | perfil derecha (se espeja) | 1 | no |
| 4 | muerte: el caballo cae y jinete y montura se deshacen en fuego violeta | perfil derecha (se espeja) | 5 | no |

```text
PROMPT 1/4 — Jinete Sin Cabeza (Abismo): galope
Hoja de sprites para un videojuego. PERSONAJE: el JINETE SIN CABEZA del Abismo: un caballero antiguo con armadura negra y púrpura, sin cabeza (del cuello sale una llama violeta), capa hecha jirones, una lanza larga con punta violeta brillante, montado en un caballo demoníaco negro de crines y cascos de fuego violeta, ojos rojos.
PALETA: #0e0a14 (negro), #2a1a3a (púrpura oscuro), #6040a0 (violeta), #b070ff (fuego violeta), #8a8a9a (acero), #c02030 (ojos).
ESTA IMAGEN: galope, 6 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadros 1–6: galope de perfil.
Formato: UNA sola fila de 6 cuadros (6 columnas × 1 fila), celdas iguales de 112×96 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈84 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 1/4 — Headless Rider (Abyss): gallop
Sprite sheet for a video game. CHARACTER: the HEADLESS RIDER of the Abyss: an ancient knight in black and purple armor, headless (a violet flame rises from the neck), tattered cape, a long lance with a glowing violet tip, riding a black demonic horse with violet fire mane and hooves, red eyes.
PALETTE: #0e0a14 (negro), #2a1a3a (púrpura oscuro), #6040a0 (violeta), #b070ff (fuego violeta), #8a8a9a (acero), #c02030 (ojos).
THIS IMAGE: gallop, 6 frames, facing RIGHT, side view (the game mirrors it for the left). frames 1–6: side gallop.
Format: ONE single row of 6 frames (6 columns × 1 row), equal 112×96 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 84 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 2/4 — Jinete Sin Cabeza (Abismo): preparar la carga
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: el JINETE SIN CABEZA del Abismo: un caballero antiguo con armadura negra y púrpura, sin cabeza (del cuello sale una llama violeta), capa hecha jirones, una lanza larga con punta violeta brillante, montado en un caballo demoníaco negro de crines y cascos de fuego violeta, ojos rojos.
PALETA: #0e0a14 (negro), #2a1a3a (púrpura oscuro), #6040a0 (violeta), #b070ff (fuego violeta), #8a8a9a (acero), #c02030 (ojos).
ESTA IMAGEN: preparar la carga, 4 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadros 1–4: el caballo se para en dos patas y el jinete apunta la lanza.
Formato: UNA sola fila de 4 cuadros (4 columnas × 1 fila), celdas iguales de 112×96 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈84 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 2/4 — Headless Rider (Abyss): charge wind-up
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: the HEADLESS RIDER of the Abyss: an ancient knight in black and purple armor, headless (a violet flame rises from the neck), tattered cape, a long lance with a glowing violet tip, riding a black demonic horse with violet fire mane and hooves, red eyes.
PALETTE: #0e0a14 (negro), #2a1a3a (púrpura oscuro), #6040a0 (violeta), #b070ff (fuego violeta), #8a8a9a (acero), #c02030 (ojos).
THIS IMAGE: charge wind-up, 4 frames, facing RIGHT, side view (the game mirrors it for the left). frames 1–4: the horse rears up and the rider levels the lance.
Format: ONE single row of 4 frames (4 columns × 1 row), equal 112×96 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 84 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 3/4 — Jinete Sin Cabeza (Abismo): carga e impacto
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: el JINETE SIN CABEZA del Abismo: un caballero antiguo con armadura negra y púrpura, sin cabeza (del cuello sale una llama violeta), capa hecha jirones, una lanza larga con punta violeta brillante, montado en un caballo demoníaco negro de crines y cascos de fuego violeta, ojos rojos.
PALETA: #0e0a14 (negro), #2a1a3a (púrpura oscuro), #6040a0 (violeta), #b070ff (fuego violeta), #8a8a9a (acero), #c02030 (ojos).
ESTA IMAGEN: carga e impacto, 6 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadros 1–4: carga a toda velocidad, lanza al frente; cuadros 5–6: impacto y frenada.
Formato: UNA sola fila de 6 cuadros (6 columnas × 1 fila), celdas iguales de 112×96 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈84 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 3/4 — Headless Rider (Abyss): charge and impact
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: the HEADLESS RIDER of the Abyss: an ancient knight in black and purple armor, headless (a violet flame rises from the neck), tattered cape, a long lance with a glowing violet tip, riding a black demonic horse with violet fire mane and hooves, red eyes.
PALETTE: #0e0a14 (negro), #2a1a3a (púrpura oscuro), #6040a0 (violeta), #b070ff (fuego violeta), #8a8a9a (acero), #c02030 (ojos).
THIS IMAGE: charge and impact, 6 frames, facing RIGHT, side view (the game mirrors it for the left). frames 1–4: full-speed charge, lance forward; frames 5–6: impact and skid.
Format: ONE single row of 6 frames (6 columns × 1 row), equal 112×96 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 84 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 4/4 — Jinete Sin Cabeza (Abismo): golpe recibido y muerte
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: el JINETE SIN CABEZA del Abismo: un caballero antiguo con armadura negra y púrpura, sin cabeza (del cuello sale una llama violeta), capa hecha jirones, una lanza larga con punta violeta brillante, montado en un caballo demoníaco negro de crines y cascos de fuego violeta, ojos rojos.
PALETA: #0e0a14 (negro), #2a1a3a (púrpura oscuro), #6040a0 (violeta), #b070ff (fuego violeta), #8a8a9a (acero), #c02030 (ojos).
ESTA IMAGEN: golpe recibido y muerte, 6 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadro 1: golpe recibido; cuadros 2–6: muerte: el caballo cae y jinete y montura se deshacen en fuego violeta.
Formato: UNA sola fila de 6 cuadros (6 columnas × 1 fila), celdas iguales de 112×96 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈84 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 4/4 — Headless Rider (Abyss): hurt and death
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: the HEADLESS RIDER of the Abyss: an ancient knight in black and purple armor, headless (a violet flame rises from the neck), tattered cape, a long lance with a glowing violet tip, riding a black demonic horse with violet fire mane and hooves, red eyes.
PALETTE: #0e0a14 (negro), #2a1a3a (púrpura oscuro), #6040a0 (violeta), #b070ff (fuego violeta), #8a8a9a (acero), #c02030 (ojos).
THIS IMAGE: hurt and death, 6 frames, facing RIGHT, side view (the game mirrors it for the left). frame 1: hurt; frames 2–6: death: the horse falls and rider and mount dissolve into violet fire.
Format: ONE single row of 6 frames (6 columns × 1 row), equal 112×96 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 84 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

### P0-11 · El Carcelero del Vacío — `ab_carcelero`

| Campo | Valor |
|---|---|
| Arena | 08 · Abismo |
| Rango | Subjefe (nivel 9) |
| Rol en combate | Cuerpo a cuerpo gigante (radio 62, velocidad 48): golpe de cadena en línea, barrido, pisotón, gancho que arrastra. |
| Problema hoy | Caminar de 1 cuadro de perfil; arte de 37 px de alto dibujado a ~5,6 veces: bloques. |
| Mientras tanto | Cuerpo del Carcelero Deforme (hoja completa de la Fábrica) agrandado y en violeta del vacío. Nombre sin cambios. |
| Paleta | #0e0a12 (negro), #3a2a3a (hierro), #6a5a6a (piel gris morada), #7a2a4a (rojo oscuro), #b070ff (brillo violeta), #9a9aa6 (cadena) |
| Celda | 128×128 px (personaje ≈118 px de alto) |
| Entrega | `ab_carcelero_1.png` … `ab_carcelero_5.png`, una fila por imagen |

**Descripción visual:** EL CARCELERO DEL VACÍO, un gigante encadenado que mantiene unidas las ruinas del Abismo: cuerpo enorme de piel gris morada, yelmo de hierro con forma de jaula y una ranura que brilla violeta, grilletes en muñecas y cuello de los que cuelgan cadenas gruesas, taparrabos rojo oscuro, cadenas enrolladas en los brazos que usa como látigo.

**Planilla de animaciones** (estado × dirección × cuadros):

| Imagen | Estado | Dirección | Cuadros | Bucle |
|---|---|---|---|---|
| 1 | quieto, las cadenas cuelgan y se mecen | perfil derecha (se espeja) | 4 | sí |
| 2 | caminar pesado arrastrando cadenas | perfil derecha (se espeja) | 6 | sí |
| 3 | echa la cadena atrás | perfil derecha (se espeja) | 2 | no |
| 3 | la lanza hacia adelante en línea | perfil derecha (se espeja) | 2 | no |
| 3 | recoge | perfil derecha (se espeja) | 2 | no |
| 4 | levanta el pie | perfil derecha (se espeja) | 2 | no |
| 4 | pisa y el piso se agrieta | perfil derecha (se espeja) | 2 | no |
| 4 | recupera | perfil derecha (se espeja) | 2 | no |
| 5 | golpe recibido | perfil derecha (se espeja) | 2 | no |
| 5 | muerte: cae de rodillas y las cadenas se rompen | perfil derecha (se espeja) | 6 | no |

```text
PROMPT 1/5 — El Carcelero del Vacío: quieto
Hoja de sprites para un videojuego. PERSONAJE: EL CARCELERO DEL VACÍO, un gigante encadenado que mantiene unidas las ruinas del Abismo: cuerpo enorme de piel gris morada, yelmo de hierro con forma de jaula y una ranura que brilla violeta, grilletes en muñecas y cuello de los que cuelgan cadenas gruesas, taparrabos rojo oscuro, cadenas enrolladas en los brazos que usa como látigo.
PALETA: #0e0a12 (negro), #3a2a3a (hierro), #6a5a6a (piel gris morada), #7a2a4a (rojo oscuro), #b070ff (brillo violeta), #9a9aa6 (cadena).
ESTA IMAGEN: quieto, 4 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadros 1–4: quieto, las cadenas cuelgan y se mecen.
Formato: UNA sola fila de 4 cuadros (4 columnas × 1 fila), celdas iguales de 128×128 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈118 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 1/5 — The Void Jailer: idle
Sprite sheet for a video game. CHARACTER: THE VOID JAILER, a chained giant who holds the ruins of the Abyss together: huge body with purple-grey skin, a cage-shaped iron helm with a glowing violet slit, shackles on wrists and neck with thick chains hanging from them, a dark red loincloth, chains wrapped around the arms that he uses as whips.
PALETTE: #0e0a12 (negro), #3a2a3a (hierro), #6a5a6a (piel gris morada), #7a2a4a (rojo oscuro), #b070ff (brillo violeta), #9a9aa6 (cadena).
THIS IMAGE: idle, 4 frames, facing RIGHT, side view (the game mirrors it for the left). frames 1–4: idle, chains hang and sway.
Format: ONE single row of 4 frames (4 columns × 1 row), equal 128×128 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 118 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 2/5 — El Carcelero del Vacío: caminar
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: EL CARCELERO DEL VACÍO, un gigante encadenado que mantiene unidas las ruinas del Abismo: cuerpo enorme de piel gris morada, yelmo de hierro con forma de jaula y una ranura que brilla violeta, grilletes en muñecas y cuello de los que cuelgan cadenas gruesas, taparrabos rojo oscuro, cadenas enrolladas en los brazos que usa como látigo.
PALETA: #0e0a12 (negro), #3a2a3a (hierro), #6a5a6a (piel gris morada), #7a2a4a (rojo oscuro), #b070ff (brillo violeta), #9a9aa6 (cadena).
ESTA IMAGEN: caminar, 6 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadros 1–6: caminar pesado arrastrando cadenas.
Formato: UNA sola fila de 6 cuadros (6 columnas × 1 fila), celdas iguales de 128×128 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈118 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 2/5 — The Void Jailer: walk
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: THE VOID JAILER, a chained giant who holds the ruins of the Abyss together: huge body with purple-grey skin, a cage-shaped iron helm with a glowing violet slit, shackles on wrists and neck with thick chains hanging from them, a dark red loincloth, chains wrapped around the arms that he uses as whips.
PALETTE: #0e0a12 (negro), #3a2a3a (hierro), #6a5a6a (piel gris morada), #7a2a4a (rojo oscuro), #b070ff (brillo violeta), #9a9aa6 (cadena).
THIS IMAGE: walk, 6 frames, facing RIGHT, side view (the game mirrors it for the left). frames 1–6: heavy walk dragging chains.
Format: ONE single row of 6 frames (6 columns × 1 row), equal 128×128 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 118 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 3/5 — El Carcelero del Vacío: golpe de cadena
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: EL CARCELERO DEL VACÍO, un gigante encadenado que mantiene unidas las ruinas del Abismo: cuerpo enorme de piel gris morada, yelmo de hierro con forma de jaula y una ranura que brilla violeta, grilletes en muñecas y cuello de los que cuelgan cadenas gruesas, taparrabos rojo oscuro, cadenas enrolladas en los brazos que usa como látigo.
PALETA: #0e0a12 (negro), #3a2a3a (hierro), #6a5a6a (piel gris morada), #7a2a4a (rojo oscuro), #b070ff (brillo violeta), #9a9aa6 (cadena).
ESTA IMAGEN: golpe de cadena, 6 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadros 1–2: echa la cadena atrás; cuadros 3–4: la lanza hacia adelante en línea; cuadros 5–6: recoge.
Formato: UNA sola fila de 6 cuadros (6 columnas × 1 fila), celdas iguales de 128×128 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈118 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 3/5 — The Void Jailer: chain lash
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: THE VOID JAILER, a chained giant who holds the ruins of the Abyss together: huge body with purple-grey skin, a cage-shaped iron helm with a glowing violet slit, shackles on wrists and neck with thick chains hanging from them, a dark red loincloth, chains wrapped around the arms that he uses as whips.
PALETTE: #0e0a12 (negro), #3a2a3a (hierro), #6a5a6a (piel gris morada), #7a2a4a (rojo oscuro), #b070ff (brillo violeta), #9a9aa6 (cadena).
THIS IMAGE: chain lash, 6 frames, facing RIGHT, side view (the game mirrors it for the left). frames 1–2: swings the chain back; frames 3–4: whips it forward in a line; frames 5–6: pulls it back.
Format: ONE single row of 6 frames (6 columns × 1 row), equal 128×128 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 118 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 4/5 — El Carcelero del Vacío: pisotón
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: EL CARCELERO DEL VACÍO, un gigante encadenado que mantiene unidas las ruinas del Abismo: cuerpo enorme de piel gris morada, yelmo de hierro con forma de jaula y una ranura que brilla violeta, grilletes en muñecas y cuello de los que cuelgan cadenas gruesas, taparrabos rojo oscuro, cadenas enrolladas en los brazos que usa como látigo.
PALETA: #0e0a12 (negro), #3a2a3a (hierro), #6a5a6a (piel gris morada), #7a2a4a (rojo oscuro), #b070ff (brillo violeta), #9a9aa6 (cadena).
ESTA IMAGEN: pisotón, 6 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadros 1–2: levanta el pie; cuadros 3–4: pisa y el piso se agrieta; cuadros 5–6: recupera.
Formato: UNA sola fila de 6 cuadros (6 columnas × 1 fila), celdas iguales de 128×128 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈118 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 4/5 — The Void Jailer: stomp
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: THE VOID JAILER, a chained giant who holds the ruins of the Abyss together: huge body with purple-grey skin, a cage-shaped iron helm with a glowing violet slit, shackles on wrists and neck with thick chains hanging from them, a dark red loincloth, chains wrapped around the arms that he uses as whips.
PALETTE: #0e0a12 (negro), #3a2a3a (hierro), #6a5a6a (piel gris morada), #7a2a4a (rojo oscuro), #b070ff (brillo violeta), #9a9aa6 (cadena).
THIS IMAGE: stomp, 6 frames, facing RIGHT, side view (the game mirrors it for the left). frames 1–2: lifts a foot; frames 3–4: stomps, the floor cracks; frames 5–6: recovers.
Format: ONE single row of 6 frames (6 columns × 1 row), equal 128×128 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 118 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 5/5 — El Carcelero del Vacío: golpe recibido y muerte
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: EL CARCELERO DEL VACÍO, un gigante encadenado que mantiene unidas las ruinas del Abismo: cuerpo enorme de piel gris morada, yelmo de hierro con forma de jaula y una ranura que brilla violeta, grilletes en muñecas y cuello de los que cuelgan cadenas gruesas, taparrabos rojo oscuro, cadenas enrolladas en los brazos que usa como látigo.
PALETA: #0e0a12 (negro), #3a2a3a (hierro), #6a5a6a (piel gris morada), #7a2a4a (rojo oscuro), #b070ff (brillo violeta), #9a9aa6 (cadena).
ESTA IMAGEN: golpe recibido y muerte, 8 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadros 1–2: golpe recibido; cuadros 3–8: muerte: cae de rodillas y las cadenas se rompen.
Formato: UNA sola fila de 8 cuadros (8 columnas × 1 fila), celdas iguales de 128×128 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈118 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 5/5 — The Void Jailer: hurt and death
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: THE VOID JAILER, a chained giant who holds the ruins of the Abyss together: huge body with purple-grey skin, a cage-shaped iron helm with a glowing violet slit, shackles on wrists and neck with thick chains hanging from them, a dark red loincloth, chains wrapped around the arms that he uses as whips.
PALETTE: #0e0a12 (negro), #3a2a3a (hierro), #6a5a6a (piel gris morada), #7a2a4a (rojo oscuro), #b070ff (brillo violeta), #9a9aa6 (cadena).
THIS IMAGE: hurt and death, 8 frames, facing RIGHT, side view (the game mirrors it for the left). frames 1–2: hurt; frames 3–8: death: falls to his knees and the chains snap.
Format: ONE single row of 8 frames (8 columns × 1 row), equal 128×128 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 118 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

### P0-12 · Golem de Cuerpos — `golem_cuerpos`

| Campo | Valor |
|---|---|
| Arena | 10 · Arena Infernal |
| Rango | Jefe (2ª de las 3 formas del jefe final) |
| Rol en combate | Cuerpo a cuerpo lento y enorme (radio 78, velocidad 38): golpetazo en área, Manos de los Caídos, Nova Profana. |
| Problema hoy | Hoja de 1 cuadro por estado (quieto = caminar = golpe); el ataque es otra pose fija. Se veía como una estatua deslizándose. |
| Mientras tanto | Cuerpo del Gólem de Cristal (hoja completa de la Arena Gélida) recoloreado a carne y sangre. Nombre sin cambios. |
| Paleta | #1a0808 (negro sangre), #4a1216 (carne oscura), #8a2a2a (carne), #c0503a (herida viva), #d8c8a8 (hueso), #e8c27a (oro del sigilo) |
| Celda | 320×272 px (personaje ≈250 px de alto) |
| Entrega | `golem_cuerpos_1.png` … `golem_cuerpos_5.png`, una fila por imagen |

**Descripción visual:** El GOLEM DE CUERPOS, segunda forma del Hechicero Supremo en la pelea final. Una mole encorvada de tres veces el alto de un héroe, cosida con los cuerpos de todos los que cayeron en el camino: brazos, torsos y cráneos fundidos en una masa de carne oscura, atada con tendones rojos que brillan y cadenas rotas. Detrás de la cabeza lleva un halo de huesos en punta, como una corona de costillas, con el sigilo dorado del Hechicero en el pecho. Brazos enormes que casi tocan el piso, se mueve pesado.

**Planilla de animaciones** (estado × dirección × cuadros):

| Imagen | Estado | Dirección | Cuadros | Bucle |
|---|---|---|---|---|
| 1 | quieto, el pecho late y el halo vibra | perfil derecha (se espeja) | 4 | sí |
| 2 | caminar pesado, brazos balanceándose | perfil derecha (se espeja) | 6 | sí |
| 3 | levanta los brazos | perfil derecha (se espeja) | 2 | no |
| 3 | golpea el piso y queda agachado | perfil derecha (se espeja) | 2 | no |
| 4 | golpe recibido, se echa atrás | perfil derecha (se espeja) | 2 | no |
| 4 | muerte: se desarma en cuerpos que caen y quedan en un montón | perfil derecha (se espeja) | 6 | no |
| 5 | un montón de cuerpos se levanta y toma forma | perfil derecha (se espeja) | 4 | no |

```text
PROMPT 1/5 — Golem de Cuerpos: quieto (respira)
Hoja de sprites para un videojuego. PERSONAJE: el GOLEM DE CUERPOS, segunda forma del Hechicero Supremo en la pelea final. Una mole encorvada de tres veces el alto de un héroe, cosida con los cuerpos de todos los que cayeron en el camino: brazos, torsos y cráneos fundidos en una masa de carne oscura, atada con tendones rojos que brillan y cadenas rotas. Detrás de la cabeza lleva un halo de huesos en punta, como una corona de costillas, con el sigilo dorado del Hechicero en el pecho. Brazos enormes que casi tocan el piso, se mueve pesado.
PALETA: #1a0808 (negro sangre), #4a1216 (carne oscura), #8a2a2a (carne), #c0503a (herida viva), #d8c8a8 (hueso), #e8c27a (oro del sigilo).
ESTA IMAGEN: quieto (respira), 4 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadros 1–4: quieto, el pecho late y el halo vibra.
Formato: UNA sola fila de 4 cuadros (4 columnas × 1 fila), celdas iguales de 320×272 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈250 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 1/5 — Golem of Corpses: idle (breathing)
Sprite sheet for a video game. CHARACTER: the GOLEM OF CORPSES, second form of the Supreme Sorcerer in the final fight. A hunched colossus three times a hero's height, stitched together from the bodies of everyone who fell along the way: arms, torsos and skulls fused into a mass of dark flesh, bound with glowing red sinews and broken chains. Behind its head a halo of pointed bones like a crown of ribs, the Sorcerer's golden sigil set in its chest. Huge arms that almost drag on the floor, heavy movement.
PALETTE: #1a0808 (negro sangre), #4a1216 (carne oscura), #8a2a2a (carne), #c0503a (herida viva), #d8c8a8 (hueso), #e8c27a (oro del sigilo).
THIS IMAGE: idle (breathing), 4 frames, facing RIGHT, side view (the game mirrors it for the left). frames 1–4: idle, the chest pulses and the halo trembles.
Format: ONE single row of 4 frames (4 columns × 1 row), equal 320×272 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 250 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 2/5 — Golem de Cuerpos: caminar
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: el GOLEM DE CUERPOS, segunda forma del Hechicero Supremo en la pelea final. Una mole encorvada de tres veces el alto de un héroe, cosida con los cuerpos de todos los que cayeron en el camino: brazos, torsos y cráneos fundidos en una masa de carne oscura, atada con tendones rojos que brillan y cadenas rotas. Detrás de la cabeza lleva un halo de huesos en punta, como una corona de costillas, con el sigilo dorado del Hechicero en el pecho. Brazos enormes que casi tocan el piso, se mueve pesado.
PALETA: #1a0808 (negro sangre), #4a1216 (carne oscura), #8a2a2a (carne), #c0503a (herida viva), #d8c8a8 (hueso), #e8c27a (oro del sigilo).
ESTA IMAGEN: caminar, 6 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadros 1–6: caminar pesado, brazos balanceándose. Ciclo que se repite sin saltos.
Formato: UNA sola fila de 6 cuadros (6 columnas × 1 fila), celdas iguales de 320×272 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈250 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 2/5 — Golem of Corpses: walk cycle
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: the GOLEM OF CORPSES, second form of the Supreme Sorcerer in the final fight. A hunched colossus three times a hero's height, stitched together from the bodies of everyone who fell along the way: arms, torsos and skulls fused into a mass of dark flesh, bound with glowing red sinews and broken chains. Behind its head a halo of pointed bones like a crown of ribs, the Sorcerer's golden sigil set in its chest. Huge arms that almost drag on the floor, heavy movement.
PALETTE: #1a0808 (negro sangre), #4a1216 (carne oscura), #8a2a2a (carne), #c0503a (herida viva), #d8c8a8 (hueso), #e8c27a (oro del sigilo).
THIS IMAGE: walk cycle, 6 frames, facing RIGHT, side view (the game mirrors it for the left). frames 1–6: heavy walk, arms swinging. Seamless looping cycle.
Format: ONE single row of 6 frames (6 columns × 1 row), equal 320×272 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 250 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 3/5 — Golem de Cuerpos: golpetazo con los dos brazos
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: el GOLEM DE CUERPOS, segunda forma del Hechicero Supremo en la pelea final. Una mole encorvada de tres veces el alto de un héroe, cosida con los cuerpos de todos los que cayeron en el camino: brazos, torsos y cráneos fundidos en una masa de carne oscura, atada con tendones rojos que brillan y cadenas rotas. Detrás de la cabeza lleva un halo de huesos en punta, como una corona de costillas, con el sigilo dorado del Hechicero en el pecho. Brazos enormes que casi tocan el piso, se mueve pesado.
PALETA: #1a0808 (negro sangre), #4a1216 (carne oscura), #8a2a2a (carne), #c0503a (herida viva), #d8c8a8 (hueso), #e8c27a (oro del sigilo).
ESTA IMAGEN: golpetazo con los dos brazos, 4 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadros 1–2: levanta los brazos; cuadros 3–4: golpea el piso y queda agachado.
Formato: UNA sola fila de 4 cuadros (4 columnas × 1 fila), celdas iguales de 320×272 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈250 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 3/5 — Golem of Corpses: two-arm ground slam
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: the GOLEM OF CORPSES, second form of the Supreme Sorcerer in the final fight. A hunched colossus three times a hero's height, stitched together from the bodies of everyone who fell along the way: arms, torsos and skulls fused into a mass of dark flesh, bound with glowing red sinews and broken chains. Behind its head a halo of pointed bones like a crown of ribs, the Sorcerer's golden sigil set in its chest. Huge arms that almost drag on the floor, heavy movement.
PALETTE: #1a0808 (negro sangre), #4a1216 (carne oscura), #8a2a2a (carne), #c0503a (herida viva), #d8c8a8 (hueso), #e8c27a (oro del sigilo).
THIS IMAGE: two-arm ground slam, 4 frames, facing RIGHT, side view (the game mirrors it for the left). frames 1–2: raises both arms; frames 3–4: slams the ground and stays crouched.
Format: ONE single row of 4 frames (4 columns × 1 row), equal 320×272 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 250 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 4/5 — Golem de Cuerpos: golpe recibido y muerte
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: el GOLEM DE CUERPOS, segunda forma del Hechicero Supremo en la pelea final. Una mole encorvada de tres veces el alto de un héroe, cosida con los cuerpos de todos los que cayeron en el camino: brazos, torsos y cráneos fundidos en una masa de carne oscura, atada con tendones rojos que brillan y cadenas rotas. Detrás de la cabeza lleva un halo de huesos en punta, como una corona de costillas, con el sigilo dorado del Hechicero en el pecho. Brazos enormes que casi tocan el piso, se mueve pesado.
PALETA: #1a0808 (negro sangre), #4a1216 (carne oscura), #8a2a2a (carne), #c0503a (herida viva), #d8c8a8 (hueso), #e8c27a (oro del sigilo).
ESTA IMAGEN: golpe recibido y muerte, 8 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadros 1–2: golpe recibido, se echa atrás; cuadros 3–8: muerte: se desarma en cuerpos que caen y quedan en un montón.
Formato: UNA sola fila de 8 cuadros (8 columnas × 1 fila), celdas iguales de 320×272 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈250 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 4/5 — Golem of Corpses: hurt and death
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: the GOLEM OF CORPSES, second form of the Supreme Sorcerer in the final fight. A hunched colossus three times a hero's height, stitched together from the bodies of everyone who fell along the way: arms, torsos and skulls fused into a mass of dark flesh, bound with glowing red sinews and broken chains. Behind its head a halo of pointed bones like a crown of ribs, the Sorcerer's golden sigil set in its chest. Huge arms that almost drag on the floor, heavy movement.
PALETTE: #1a0808 (negro sangre), #4a1216 (carne oscura), #8a2a2a (carne), #c0503a (herida viva), #d8c8a8 (hueso), #e8c27a (oro del sigilo).
THIS IMAGE: hurt and death, 8 frames, facing RIGHT, side view (the game mirrors it for the left). frames 1–2: hurt, recoils backwards; frames 3–8: death: it falls apart into bodies that collapse into a pile.
Format: ONE single row of 8 frames (8 columns × 1 row), equal 320×272 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 250 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 5/5 — Golem de Cuerpos: se forma de los restos (entrada en escena)
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: el GOLEM DE CUERPOS, segunda forma del Hechicero Supremo en la pelea final. Una mole encorvada de tres veces el alto de un héroe, cosida con los cuerpos de todos los que cayeron en el camino: brazos, torsos y cráneos fundidos en una masa de carne oscura, atada con tendones rojos que brillan y cadenas rotas. Detrás de la cabeza lleva un halo de huesos en punta, como una corona de costillas, con el sigilo dorado del Hechicero en el pecho. Brazos enormes que casi tocan el piso, se mueve pesado.
PALETA: #1a0808 (negro sangre), #4a1216 (carne oscura), #8a2a2a (carne), #c0503a (herida viva), #d8c8a8 (hueso), #e8c27a (oro del sigilo).
ESTA IMAGEN: se forma de los restos (entrada en escena), 4 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadros 1–4: un montón de cuerpos se levanta y toma forma.
Formato: UNA sola fila de 4 cuadros (4 columnas × 1 fila), celdas iguales de 320×272 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈250 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 5/5 — Golem of Corpses: rises from the remains (entrance)
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: the GOLEM OF CORPSES, second form of the Supreme Sorcerer in the final fight. A hunched colossus three times a hero's height, stitched together from the bodies of everyone who fell along the way: arms, torsos and skulls fused into a mass of dark flesh, bound with glowing red sinews and broken chains. Behind its head a halo of pointed bones like a crown of ribs, the Sorcerer's golden sigil set in its chest. Huge arms that almost drag on the floor, heavy movement.
PALETTE: #1a0808 (negro sangre), #4a1216 (carne oscura), #8a2a2a (carne), #c0503a (herida viva), #d8c8a8 (hueso), #e8c27a (oro del sigilo).
THIS IMAGE: rises from the remains (entrance), 4 frames, facing RIGHT, side view (the game mirrors it for the left). frames 1–4: a pile of bodies rises and takes shape.
Format: ONE single row of 4 frames (4 columns × 1 row), equal 320×272 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 250 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

## P1 — Reemplazado, menos visible

### P1-01 · Esfinge — `esfinge`

| Campo | Valor |
|---|---|
| Arena | 07 · Laberinto |
| Rango | Élite (niveles altos) |
| Rol en combate | Élite pesado (radio 34, velocidad 92, a distancia 300): zarpazo, embestida y proyectil. |
| Problema hoy | Sin ninguna vista de ataque ni de golpe, y sin muerte en su diseño (la última hoja trajo otra esfinge). |
| Mientras tanto | Cuerpo del Cù-Sìth (hoja completa de las Ruinas) en oro y arena. Nombre sin cambios. |
| Paleta | #1e140a (sombra), #6a4a22 (arena oscura), #b3923f (arenisca), #e0c070 (oro), #f0e0b0 (lino), #ffb040 (ojos ámbar) |
| Celda | 96×80 px (personaje ≈64 px de alto) |
| Entrega | `esfinge_1.png` … `esfinge_3.png`, una fila por imagen |

**Descripción visual:** La ESFINGE del Laberinto: cuerpo de león de piedra arenisca dorada, alas plegadas de plumas color arena, cabeza de mujer encapuchada con un velo de lino y ojos que brillan ámbar, joyas de oro viejo en el cuello y las patas. Solemne y pesada.

**Planilla de animaciones** (estado × dirección × cuadros):

| Imagen | Estado | Dirección | Cuadros | Bucle |
|---|---|---|---|---|
| 1 | caminar felino de perfil | perfil derecha (se espeja) | 6 | sí |
| 2 | se alza | perfil derecha (se espeja) | 1 | no |
| 2 | zarpazo hacia adelante | perfil derecha (se espeja) | 2 | no |
| 2 | recupera | perfil derecha (se espeja) | 1 | no |
| 3 | golpe recibido | perfil derecha (se espeja) | 1 | no |
| 3 | muerte: se echa y se deshace en arena | perfil derecha (se espeja) | 4 | no |

```text
PROMPT 1/3 — Esfinge: caminar
Hoja de sprites para un videojuego. PERSONAJE: la ESFINGE del Laberinto: cuerpo de león de piedra arenisca dorada, alas plegadas de plumas color arena, cabeza de mujer encapuchada con un velo de lino y ojos que brillan ámbar, joyas de oro viejo en el cuello y las patas. Solemne y pesada.
PALETA: #1e140a (sombra), #6a4a22 (arena oscura), #b3923f (arenisca), #e0c070 (oro), #f0e0b0 (lino), #ffb040 (ojos ámbar).
ESTA IMAGEN: caminar, 6 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadros 1–6: caminar felino de perfil.
Formato: UNA sola fila de 6 cuadros (6 columnas × 1 fila), celdas iguales de 96×80 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈64 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 1/3 — Sphinx: walk
Sprite sheet for a video game. CHARACTER: the SPHINX of the Labyrinth: a golden sandstone lion body, folded sand-colored feathered wings, the head of a hooded woman with a linen veil and glowing amber eyes, old gold jewelry on the neck and paws. Solemn and heavy.
PALETTE: #1e140a (sombra), #6a4a22 (arena oscura), #b3923f (arenisca), #e0c070 (oro), #f0e0b0 (lino), #ffb040 (ojos ámbar).
THIS IMAGE: walk, 6 frames, facing RIGHT, side view (the game mirrors it for the left). frames 1–6: feline side walk.
Format: ONE single row of 6 frames (6 columns × 1 row), equal 96×80 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 64 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 2/3 — Esfinge: zarpazo
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: la ESFINGE del Laberinto: cuerpo de león de piedra arenisca dorada, alas plegadas de plumas color arena, cabeza de mujer encapuchada con un velo de lino y ojos que brillan ámbar, joyas de oro viejo en el cuello y las patas. Solemne y pesada.
PALETA: #1e140a (sombra), #6a4a22 (arena oscura), #b3923f (arenisca), #e0c070 (oro), #f0e0b0 (lino), #ffb040 (ojos ámbar).
ESTA IMAGEN: zarpazo, 4 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadro 1: se alza; cuadros 2–3: zarpazo hacia adelante; cuadro 4: recupera.
Formato: UNA sola fila de 4 cuadros (4 columnas × 1 fila), celdas iguales de 96×80 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈64 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 2/3 — Sphinx: claw swipe
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: the SPHINX of the Labyrinth: a golden sandstone lion body, folded sand-colored feathered wings, the head of a hooded woman with a linen veil and glowing amber eyes, old gold jewelry on the neck and paws. Solemn and heavy.
PALETTE: #1e140a (sombra), #6a4a22 (arena oscura), #b3923f (arenisca), #e0c070 (oro), #f0e0b0 (lino), #ffb040 (ojos ámbar).
THIS IMAGE: claw swipe, 4 frames, facing RIGHT, side view (the game mirrors it for the left). frame 1: rears; frames 2–3: forward claw swipe; frame 4: recovers.
Format: ONE single row of 4 frames (4 columns × 1 row), equal 96×80 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 64 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 3/3 — Esfinge: golpe recibido y muerte
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: la ESFINGE del Laberinto: cuerpo de león de piedra arenisca dorada, alas plegadas de plumas color arena, cabeza de mujer encapuchada con un velo de lino y ojos que brillan ámbar, joyas de oro viejo en el cuello y las patas. Solemne y pesada.
PALETA: #1e140a (sombra), #6a4a22 (arena oscura), #b3923f (arenisca), #e0c070 (oro), #f0e0b0 (lino), #ffb040 (ojos ámbar).
ESTA IMAGEN: golpe recibido y muerte, 5 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadro 1: golpe recibido; cuadros 2–5: muerte: se echa y se deshace en arena.
Formato: UNA sola fila de 5 cuadros (5 columnas × 1 fila), celdas iguales de 96×80 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈64 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 3/3 — Sphinx: hurt and death
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: the SPHINX of the Labyrinth: a golden sandstone lion body, folded sand-colored feathered wings, the head of a hooded woman with a linen veil and glowing amber eyes, old gold jewelry on the neck and paws. Solemn and heavy.
PALETTE: #1e140a (sombra), #6a4a22 (arena oscura), #b3923f (arenisca), #e0c070 (oro), #f0e0b0 (lino), #ffb040 (ojos ámbar).
THIS IMAGE: hurt and death, 5 frames, facing RIGHT, side view (the game mirrors it for the left). frame 1: hurt; frames 2–5: death: lies down and crumbles into sand.
Format: ONE single row of 5 frames (5 columns × 1 row), equal 96×80 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 64 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

## F — Faltantes que se mantienen (sin reemplazo)

Tienen animación suficiente para no verse tiesos; se listan para completar el encargo. Mismo formato: prompts de una fila.

### F-01 · Cerbero, Guardián del Umbral — `mn_cerbero`

| Campo | Valor |
|---|---|
| Arena | 09 · Minas Profundas |
| Rango | Jefe |
| Rol en combate | Jefe con 3 actos y cadenas atadas a la puerta (radio 58). |
| Por qué no se reemplazó | Se MANTIENE: tiene todas sus animaciones (caminar 8, lanzallamas 10, mordida 10, muerte 16) y sus mecánicas dependen del cuerpo (cadenas, tres cabezas). Solo es arte de baja resolución (≈54×67) escalado 5 veces. |
| Paleta | #0e0806 (negro), #3a1410 (carne quemada), #8a2a1a (rojo), #ff7a2a (fuego), #d8c8a8 (hueso), #5a5a62 (cadena) |
| Celda | 192×192 px (personaje ≈150 px de alto) |
| Entrega | `mn_cerbero_1.png` … `mn_cerbero_5.png`, una fila por imagen |

**Descripción visual:** CERBERO, el perro de tres cabezas que custodia la puerta al Infierno, parcialmente muerto: cabeza izquierda de bestia con cicatrices y hueso expuesto, cabeza central de fuego con la mandíbula fundida, cabeza derecha de sombra con ojos de humo; cuerpo musculoso negro y rojo con costillas a la vista, cadenas de hierro rotas en el cuello.

**Planilla de animaciones** (estado × dirección × cuadros):

| Imagen | Estado | Dirección | Cuadros | Bucle |
|---|---|---|---|---|
| 1 | caminar de perfil, las tres cabezas se mueven distinto | perfil derecha (se espeja) | 8 | sí |
| 2 | la cabeza central se echa atrás y escupe fuego en cono | perfil derecha (se espeja) | 8 | no |
| 3 | las tres cabezas muerden una tras otra | perfil derecha (se espeja) | 8 | no |
| 4 | pisotón con las patas delanteras | perfil derecha (se espeja) | 4 | no |
| 4 | aullido con las tres cabezas al cielo | perfil derecha (se espeja) | 4 | no |
| 5 | golpe recibido | perfil derecha (se espeja) | 2 | no |
| 5 | muerte: cae de costado y el fuego se apaga | perfil derecha (se espeja) | 6 | no |

```text
PROMPT 1/5 — Cerbero, Guardián del Umbral: caminar
Hoja de sprites para un videojuego. PERSONAJE: CERBERO, el perro de tres cabezas que custodia la puerta al Infierno, parcialmente muerto: cabeza izquierda de bestia con cicatrices y hueso expuesto, cabeza central de fuego con la mandíbula fundida, cabeza derecha de sombra con ojos de humo; cuerpo musculoso negro y rojo con costillas a la vista, cadenas de hierro rotas en el cuello.
PALETA: #0e0806 (negro), #3a1410 (carne quemada), #8a2a1a (rojo), #ff7a2a (fuego), #d8c8a8 (hueso), #5a5a62 (cadena).
ESTA IMAGEN: caminar, 8 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadros 1–8: caminar de perfil, las tres cabezas se mueven distinto.
Formato: UNA sola fila de 8 cuadros (8 columnas × 1 fila), celdas iguales de 192×192 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈150 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 1/5 — Cerberus, Warden of the Threshold: walk
Sprite sheet for a video game. CHARACTER: CERBERUS, the three-headed hound guarding the gate to Hell, partly dead: left head a scarred beast with exposed bone, center head of fire with a molten jaw, right head of shadow with smoke eyes; a muscular black and red body with visible ribs, broken iron chains on the neck.
PALETTE: #0e0806 (negro), #3a1410 (carne quemada), #8a2a1a (rojo), #ff7a2a (fuego), #d8c8a8 (hueso), #5a5a62 (cadena).
THIS IMAGE: walk, 8 frames, facing RIGHT, side view (the game mirrors it for the left). frames 1–8: side walk, the three heads move independently.
Format: ONE single row of 8 frames (8 columns × 1 row), equal 192×192 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 150 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 2/5 — Cerbero, Guardián del Umbral: lanzallamas
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: CERBERO, el perro de tres cabezas que custodia la puerta al Infierno, parcialmente muerto: cabeza izquierda de bestia con cicatrices y hueso expuesto, cabeza central de fuego con la mandíbula fundida, cabeza derecha de sombra con ojos de humo; cuerpo musculoso negro y rojo con costillas a la vista, cadenas de hierro rotas en el cuello.
PALETA: #0e0806 (negro), #3a1410 (carne quemada), #8a2a1a (rojo), #ff7a2a (fuego), #d8c8a8 (hueso), #5a5a62 (cadena).
ESTA IMAGEN: lanzallamas, 8 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadros 1–8: la cabeza central se echa atrás y escupe fuego en cono.
Formato: UNA sola fila de 8 cuadros (8 columnas × 1 fila), celdas iguales de 192×192 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈150 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 2/5 — Cerberus, Warden of the Threshold: flamethrower
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: CERBERUS, the three-headed hound guarding the gate to Hell, partly dead: left head a scarred beast with exposed bone, center head of fire with a molten jaw, right head of shadow with smoke eyes; a muscular black and red body with visible ribs, broken iron chains on the neck.
PALETTE: #0e0806 (negro), #3a1410 (carne quemada), #8a2a1a (rojo), #ff7a2a (fuego), #d8c8a8 (hueso), #5a5a62 (cadena).
THIS IMAGE: flamethrower, 8 frames, facing RIGHT, side view (the game mirrors it for the left). frames 1–8: the center head rears back and breathes a cone of fire.
Format: ONE single row of 8 frames (8 columns × 1 row), equal 192×192 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 150 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 3/5 — Cerbero, Guardián del Umbral: mordida triple
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: CERBERO, el perro de tres cabezas que custodia la puerta al Infierno, parcialmente muerto: cabeza izquierda de bestia con cicatrices y hueso expuesto, cabeza central de fuego con la mandíbula fundida, cabeza derecha de sombra con ojos de humo; cuerpo musculoso negro y rojo con costillas a la vista, cadenas de hierro rotas en el cuello.
PALETA: #0e0806 (negro), #3a1410 (carne quemada), #8a2a1a (rojo), #ff7a2a (fuego), #d8c8a8 (hueso), #5a5a62 (cadena).
ESTA IMAGEN: mordida triple, 8 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadros 1–8: las tres cabezas muerden una tras otra.
Formato: UNA sola fila de 8 cuadros (8 columnas × 1 fila), celdas iguales de 192×192 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈150 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 3/5 — Cerberus, Warden of the Threshold: triple bite
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: CERBERUS, the three-headed hound guarding the gate to Hell, partly dead: left head a scarred beast with exposed bone, center head of fire with a molten jaw, right head of shadow with smoke eyes; a muscular black and red body with visible ribs, broken iron chains on the neck.
PALETTE: #0e0806 (negro), #3a1410 (carne quemada), #8a2a1a (rojo), #ff7a2a (fuego), #d8c8a8 (hueso), #5a5a62 (cadena).
THIS IMAGE: triple bite, 8 frames, facing RIGHT, side view (the game mirrors it for the left). frames 1–8: the three heads bite one after another.
Format: ONE single row of 8 frames (8 columns × 1 row), equal 192×192 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 150 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 4/5 — Cerbero, Guardián del Umbral: pisotón y aullido
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: CERBERO, el perro de tres cabezas que custodia la puerta al Infierno, parcialmente muerto: cabeza izquierda de bestia con cicatrices y hueso expuesto, cabeza central de fuego con la mandíbula fundida, cabeza derecha de sombra con ojos de humo; cuerpo musculoso negro y rojo con costillas a la vista, cadenas de hierro rotas en el cuello.
PALETA: #0e0806 (negro), #3a1410 (carne quemada), #8a2a1a (rojo), #ff7a2a (fuego), #d8c8a8 (hueso), #5a5a62 (cadena).
ESTA IMAGEN: pisotón y aullido, 8 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadros 1–4: pisotón con las patas delanteras; cuadros 5–8: aullido con las tres cabezas al cielo.
Formato: UNA sola fila de 8 cuadros (8 columnas × 1 fila), celdas iguales de 192×192 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈150 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 4/5 — Cerberus, Warden of the Threshold: stomp and howl
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: CERBERUS, the three-headed hound guarding the gate to Hell, partly dead: left head a scarred beast with exposed bone, center head of fire with a molten jaw, right head of shadow with smoke eyes; a muscular black and red body with visible ribs, broken iron chains on the neck.
PALETTE: #0e0806 (negro), #3a1410 (carne quemada), #8a2a1a (rojo), #ff7a2a (fuego), #d8c8a8 (hueso), #5a5a62 (cadena).
THIS IMAGE: stomp and howl, 8 frames, facing RIGHT, side view (the game mirrors it for the left). frames 1–4: front-paw stomp; frames 5–8: howl with all three heads raised.
Format: ONE single row of 8 frames (8 columns × 1 row), equal 192×192 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 150 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 5/5 — Cerbero, Guardián del Umbral: golpe recibido y muerte
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: CERBERO, el perro de tres cabezas que custodia la puerta al Infierno, parcialmente muerto: cabeza izquierda de bestia con cicatrices y hueso expuesto, cabeza central de fuego con la mandíbula fundida, cabeza derecha de sombra con ojos de humo; cuerpo musculoso negro y rojo con costillas a la vista, cadenas de hierro rotas en el cuello.
PALETA: #0e0806 (negro), #3a1410 (carne quemada), #8a2a1a (rojo), #ff7a2a (fuego), #d8c8a8 (hueso), #5a5a62 (cadena).
ESTA IMAGEN: golpe recibido y muerte, 8 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadros 1–2: golpe recibido; cuadros 3–8: muerte: cae de costado y el fuego se apaga.
Formato: UNA sola fila de 8 cuadros (8 columnas × 1 fila), celdas iguales de 192×192 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈150 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 5/5 — Cerberus, Warden of the Threshold: hurt and death
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: CERBERUS, the three-headed hound guarding the gate to Hell, partly dead: left head a scarred beast with exposed bone, center head of fire with a molten jaw, right head of shadow with smoke eyes; a muscular black and red body with visible ribs, broken iron chains on the neck.
PALETTE: #0e0806 (negro), #3a1410 (carne quemada), #8a2a1a (rojo), #ff7a2a (fuego), #d8c8a8 (hueso), #5a5a62 (cadena).
THIS IMAGE: hurt and death, 8 frames, facing RIGHT, side view (the game mirrors it for the left). frames 1–2: hurt; frames 3–8: death: falls on its side and the fire goes out.
Format: ONE single row of 8 frames (8 columns × 1 row), equal 192×192 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 150 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

### F-02 · Ángel Corrompido — `angel_corrompido`

| Campo | Valor |
|---|---|
| Arena | 10 · Arena Infernal |
| Rango | Jefe (1ª forma del jefe final) |
| Rol en combate | A distancia con los poderes de los Cuatro (radio 46). |
| Por qué no se reemplazó | Se MANTIENE: tiene animación completa (el cuerpo del Hechicero recoloreado, con alas y cristales que dibuja el código). No está tieso; le falta identidad propia. |
| Paleta | #1a0a0e (negro), #8a1a2a (carmesí), #efe6d6 (túnica), #e8c27a (halo), #8ee07a (cristal verde), #bfe8ff (cristal celeste) |
| Celda | 128×128 px (personaje ≈112 px de alto) |
| Entrega | `angel_corrompido_1.png` … `angel_corrompido_4.png`, una fila por imagen |

**Descripción visual:** El ÁNGEL CORROMPIDO, primera forma del Hechicero Supremo: un hechicero alto de túnica blanca manchada de carmesí, alas rotas de plumas rojas y negras, un halo dorado agrietado, cuatro cristales que orbitan (verde, celeste, ámbar y oro blanco), cara serena y cruel.

**Planilla de animaciones** (estado × dirección × cuadros):

| Imagen | Estado | Dirección | Cuadros | Bucle |
|---|---|---|---|---|
| 1 | quieto flotando | perfil derecha (se espeja) | 4 | sí |
| 1 | avanzar flotando | perfil derecha (se espeja) | 4 | sí |
| 2 | levanta las manos y los cristales giran rápido | perfil derecha (se espeja) | 8 | no |
| 3 | golpe de ala hacia adelante | perfil derecha (se espeja) | 4 | no |
| 4 | golpe recibido | perfil derecha (se espeja) | 2 | no |
| 4 | muerte: las alas se deshacen en plumas | perfil derecha (se espeja) | 6 | no |

```text
PROMPT 1/4 — Ángel Corrompido: quieto y caminar
Hoja de sprites para un videojuego. PERSONAJE: el ÁNGEL CORROMPIDO, primera forma del Hechicero Supremo: un hechicero alto de túnica blanca manchada de carmesí, alas rotas de plumas rojas y negras, un halo dorado agrietado, cuatro cristales que orbitan (verde, celeste, ámbar y oro blanco), cara serena y cruel.
PALETA: #1a0a0e (negro), #8a1a2a (carmesí), #efe6d6 (túnica), #e8c27a (halo), #8ee07a (cristal verde), #bfe8ff (cristal celeste).
ESTA IMAGEN: quieto y caminar, 8 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadros 1–4: quieto flotando; cuadros 5–8: avanzar flotando.
Formato: UNA sola fila de 8 cuadros (8 columnas × 1 fila), celdas iguales de 128×128 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈112 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 1/4 — Corrupted Angel: idle and walk
Sprite sheet for a video game. CHARACTER: the CORRUPTED ANGEL, first form of the Supreme Sorcerer: a tall sorcerer in a white robe stained crimson, torn wings of red and black feathers, a cracked golden halo, four orbiting crystals (green, pale blue, amber and white gold), a serene, cruel face.
PALETTE: #1a0a0e (negro), #8a1a2a (carmesí), #efe6d6 (túnica), #e8c27a (halo), #8ee07a (cristal verde), #bfe8ff (cristal celeste).
THIS IMAGE: idle and walk, 8 frames, facing RIGHT, side view (the game mirrors it for the left). frames 1–4: floating idle; frames 5–8: gliding forward.
Format: ONE single row of 8 frames (8 columns × 1 row), equal 128×128 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 112 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 2/4 — Ángel Corrompido: conjuro
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: el ÁNGEL CORROMPIDO, primera forma del Hechicero Supremo: un hechicero alto de túnica blanca manchada de carmesí, alas rotas de plumas rojas y negras, un halo dorado agrietado, cuatro cristales que orbitan (verde, celeste, ámbar y oro blanco), cara serena y cruel.
PALETA: #1a0a0e (negro), #8a1a2a (carmesí), #efe6d6 (túnica), #e8c27a (halo), #8ee07a (cristal verde), #bfe8ff (cristal celeste).
ESTA IMAGEN: conjuro, 8 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadros 1–8: levanta las manos y los cristales giran rápido.
Formato: UNA sola fila de 8 cuadros (8 columnas × 1 fila), celdas iguales de 128×128 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈112 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 2/4 — Corrupted Angel: cast
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: the CORRUPTED ANGEL, first form of the Supreme Sorcerer: a tall sorcerer in a white robe stained crimson, torn wings of red and black feathers, a cracked golden halo, four orbiting crystals (green, pale blue, amber and white gold), a serene, cruel face.
PALETTE: #1a0a0e (negro), #8a1a2a (carmesí), #efe6d6 (túnica), #e8c27a (halo), #8ee07a (cristal verde), #bfe8ff (cristal celeste).
THIS IMAGE: cast, 8 frames, facing RIGHT, side view (the game mirrors it for the left). frames 1–8: raises both hands and the crystals spin fast.
Format: ONE single row of 8 frames (8 columns × 1 row), equal 128×128 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 112 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 3/4 — Ángel Corrompido: ataque
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: el ÁNGEL CORROMPIDO, primera forma del Hechicero Supremo: un hechicero alto de túnica blanca manchada de carmesí, alas rotas de plumas rojas y negras, un halo dorado agrietado, cuatro cristales que orbitan (verde, celeste, ámbar y oro blanco), cara serena y cruel.
PALETA: #1a0a0e (negro), #8a1a2a (carmesí), #efe6d6 (túnica), #e8c27a (halo), #8ee07a (cristal verde), #bfe8ff (cristal celeste).
ESTA IMAGEN: ataque, 4 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadros 1–4: golpe de ala hacia adelante.
Formato: UNA sola fila de 4 cuadros (4 columnas × 1 fila), celdas iguales de 128×128 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈112 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 3/4 — Corrupted Angel: attack
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: the CORRUPTED ANGEL, first form of the Supreme Sorcerer: a tall sorcerer in a white robe stained crimson, torn wings of red and black feathers, a cracked golden halo, four orbiting crystals (green, pale blue, amber and white gold), a serene, cruel face.
PALETTE: #1a0a0e (negro), #8a1a2a (carmesí), #efe6d6 (túnica), #e8c27a (halo), #8ee07a (cristal verde), #bfe8ff (cristal celeste).
THIS IMAGE: attack, 4 frames, facing RIGHT, side view (the game mirrors it for the left). frames 1–4: forward wing strike.
Format: ONE single row of 4 frames (4 columns × 1 row), equal 128×128 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 112 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 4/4 — Ángel Corrompido: golpe recibido y muerte
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: el ÁNGEL CORROMPIDO, primera forma del Hechicero Supremo: un hechicero alto de túnica blanca manchada de carmesí, alas rotas de plumas rojas y negras, un halo dorado agrietado, cuatro cristales que orbitan (verde, celeste, ámbar y oro blanco), cara serena y cruel.
PALETA: #1a0a0e (negro), #8a1a2a (carmesí), #efe6d6 (túnica), #e8c27a (halo), #8ee07a (cristal verde), #bfe8ff (cristal celeste).
ESTA IMAGEN: golpe recibido y muerte, 8 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadros 1–2: golpe recibido; cuadros 3–8: muerte: las alas se deshacen en plumas.
Formato: UNA sola fila de 8 cuadros (8 columnas × 1 fila), celdas iguales de 128×128 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈112 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 4/4 — Corrupted Angel: hurt and death
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: the CORRUPTED ANGEL, first form of the Supreme Sorcerer: a tall sorcerer in a white robe stained crimson, torn wings of red and black feathers, a cracked golden halo, four orbiting crystals (green, pale blue, amber and white gold), a serene, cruel face.
PALETTE: #1a0a0e (negro), #8a1a2a (carmesí), #efe6d6 (túnica), #e8c27a (halo), #8ee07a (cristal verde), #bfe8ff (cristal celeste).
THIS IMAGE: hurt and death, 8 frames, facing RIGHT, side view (the game mirrors it for the left). frames 1–2: hurt; frames 3–8: death: the wings burst into feathers.
Format: ONE single row of 8 frames (8 columns × 1 row), equal 128×128 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 112 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

### F-03 · Rey de la Horda (Demonio Mayor) — `demonio_mayor`

| Campo | Valor |
|---|---|
| Arena | 10 · Arena Infernal |
| Rango | Jefe (forma final) |
| Rol en combate | Forma final (radio 70). |
| Por qué no se reemplazó | Se MANTIENE: camina y ataca con arte real en 4 direcciones. Le faltan golpe y muerte propios (clona el caminar). |
| Paleta | #140806 (negro), #5a1410 (rojo oscuro), #b02a20 (rojo), #3a3a40 (hierro), #e0d0b0 (hueso), #ffd24a (ojos) |
| Celda | 119×119 px (personaje ≈100 px de alto) |
| Entrega | `demonio_mayor_1.png` … `demonio_mayor_1.png`, una fila por imagen |

**Descripción visual:** El REY DE LA HORDA: demonio gigante de piel roja oscura, cuernos de carnero enormes, armadura de hierro negro con púas, un hacha doble de hueso, cola larga, ojos amarillos.

**Planilla de animaciones** (estado × dirección × cuadros):

| Imagen | Estado | Dirección | Cuadros | Bucle |
|---|---|---|---|---|
| 1 | golpe recibido | perfil derecha (se espeja) | 2 | no |
| 1 | muerte: cae de rodillas y se desploma | perfil derecha (se espeja) | 5 | no |

```text
PROMPT 1/1 — Rey de la Horda (Demonio Mayor): golpe recibido y muerte
Hoja de sprites para un videojuego. PERSONAJE: el REY DE LA HORDA: demonio gigante de piel roja oscura, cuernos de carnero enormes, armadura de hierro negro con púas, un hacha doble de hueso, cola larga, ojos amarillos.
PALETA: #140806 (negro), #5a1410 (rojo oscuro), #b02a20 (rojo), #3a3a40 (hierro), #e0d0b0 (hueso), #ffd24a (ojos).
ESTA IMAGEN: golpe recibido y muerte, 7 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadros 1–2: golpe recibido; cuadros 3–7: muerte: cae de rodillas y se desploma.
Formato: UNA sola fila de 7 cuadros (7 columnas × 1 fila), celdas iguales de 119×119 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈100 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 1/1 — King of the Horde (Greater Demon): hurt and death
Sprite sheet for a video game. CHARACTER: the KING OF THE HORDE: a giant dark-red demon with huge ram horns, spiked black iron armor, a double-bladed bone axe, a long tail, yellow eyes.
PALETTE: #140806 (negro), #5a1410 (rojo oscuro), #b02a20 (rojo), #3a3a40 (hierro), #e0d0b0 (hueso), #ffd24a (ojos).
THIS IMAGE: hurt and death, 7 frames, facing RIGHT, side view (the game mirrors it for the left). frames 1–2: hurt; frames 3–7: death: falls to his knees and collapses.
Format: ONE single row of 7 frames (7 columns × 1 row), equal 119×119 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 100 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

### F-04 · Esqueleto — `esqueleto`

| Campo | Valor |
|---|---|
| Arena | 10 · Infernal / 05 · Gélida |
| Rango | Común / élite |
| Rol en combate | — |
| Por qué no se reemplazó | Se MANTIENE: camina y ataca con arte real; le faltan golpe y muerte propios (I-1). |
| Paleta | #1a1612 (sombra), #ece4cc (hueso), #8a5a2a (madera), #9fb4c8 (acero) |
| Celda | 119×119 px (personaje ≈90 px de alto) |
| Entrega | `esqueleto_1.png` … `esqueleto_1.png`, una fila por imagen |

**Descripción visual:** Un ESQUELETO con cuernos, escudo redondo de madera y espada corta, del atlas infernal (celda 119×119).

**Planilla de animaciones** (estado × dirección × cuadros):

| Imagen | Estado | Dirección | Cuadros | Bucle |
|---|---|---|---|---|
| 1 | golpe recibido | perfil derecha (se espeja) | 2 | no |
| 1 | muerte: cae y se desvanece | perfil derecha (se espeja) | 5 | no |

```text
PROMPT 1/1 — Esqueleto: golpe recibido y muerte
Hoja de sprites para un videojuego. PERSONAJE: un ESQUELETO con cuernos, escudo redondo de madera y espada corta, del atlas infernal (celda 119×119).
PALETA: #1a1612 (sombra), #ece4cc (hueso), #8a5a2a (madera), #9fb4c8 (acero).
ESTA IMAGEN: golpe recibido y muerte, 7 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadros 1–2: golpe recibido; cuadros 3–7: muerte: cae y se desvanece.
Formato: UNA sola fila de 7 cuadros (7 columnas × 1 fila), celdas iguales de 119×119 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈90 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 1/1 — Skeleton: hurt and death
Sprite sheet for a video game. CHARACTER: a horned SKELETON with a round wooden shield and a short sword, from the infernal atlas (119×119 cell).
PALETTE: #1a1612 (sombra), #ece4cc (hueso), #8a5a2a (madera), #9fb4c8 (acero).
THIS IMAGE: hurt and death, 7 frames, facing RIGHT, side view (the game mirrors it for the left). frames 1–2: hurt; frames 3–7: death: falls and fades.
Format: ONE single row of 7 frames (7 columns × 1 row), equal 119×119 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 90 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

### F-05 · Demonio Menor — `demonio_menor`

| Campo | Valor |
|---|---|
| Arena | 10 · Infernal / 05 · Gélida |
| Rango | Común / élite |
| Rol en combate | — |
| Por qué no se reemplazó | Se MANTIENE: camina y ataca con arte real; le faltan golpe y muerte propios (I-1). |
| Paleta | #1a0806 (sombra), #b0301a (rojo), #e05a2a (rojo claro), #e0d0b0 (hueso) |
| Celda | 119×119 px (personaje ≈90 px de alto) |
| Entrega | `demonio_menor_1.png` … `demonio_menor_1.png`, una fila por imagen |

**Descripción visual:** Un DEMONIO MENOR rojo, bajo y panzón, con cuernos cortos y una clava de hueso, del atlas infernal (celda 119×119).

**Planilla de animaciones** (estado × dirección × cuadros):

| Imagen | Estado | Dirección | Cuadros | Bucle |
|---|---|---|---|---|
| 1 | golpe recibido | perfil derecha (se espeja) | 2 | no |
| 1 | muerte: cae y se desvanece | perfil derecha (se espeja) | 5 | no |

```text
PROMPT 1/1 — Demonio Menor: golpe recibido y muerte
Hoja de sprites para un videojuego. PERSONAJE: un DEMONIO MENOR rojo, bajo y panzón, con cuernos cortos y una clava de hueso, del atlas infernal (celda 119×119).
PALETA: #1a0806 (sombra), #b0301a (rojo), #e05a2a (rojo claro), #e0d0b0 (hueso).
ESTA IMAGEN: golpe recibido y muerte, 7 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadros 1–2: golpe recibido; cuadros 3–7: muerte: cae y se desvanece.
Formato: UNA sola fila de 7 cuadros (7 columnas × 1 fila), celdas iguales de 119×119 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈90 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 1/1 — Lesser Demon: hurt and death
Sprite sheet for a video game. CHARACTER: a short, pot-bellied red LESSER DEMON with short horns and a bone club, from the infernal atlas (119×119 cell).
PALETTE: #1a0806 (sombra), #b0301a (rojo), #e05a2a (rojo claro), #e0d0b0 (hueso).
THIS IMAGE: hurt and death, 7 frames, facing RIGHT, side view (the game mirrors it for the left). frames 1–2: hurt; frames 3–7: death: falls and fades.
Format: ONE single row of 7 frames (7 columns × 1 row), equal 119×119 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 90 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

### F-06 · Demonio Hechicero — `demonio_mago`

| Campo | Valor |
|---|---|
| Arena | 10 · Infernal / 05 · Gélida |
| Rango | Común / élite |
| Rol en combate | — |
| Por qué no se reemplazó | Se MANTIENE: camina y ataca con arte real; le faltan golpe y muerte propios (I-1). |
| Paleta | #140a14 (sombra), #5a2a6a (violeta), #b0301a (piel roja), #ffb040 (llama) |
| Celda | 119×119 px (personaje ≈90 px de alto) |
| Entrega | `demonio_mago_1.png` … `demonio_mago_1.png`, una fila por imagen |

**Descripción visual:** Un DEMONIO HECHICERO de túnica violeta con capucha, piel roja y un báculo con una llama en la punta, del atlas infernal (celda 119×119).

**Planilla de animaciones** (estado × dirección × cuadros):

| Imagen | Estado | Dirección | Cuadros | Bucle |
|---|---|---|---|---|
| 1 | golpe recibido | perfil derecha (se espeja) | 2 | no |
| 1 | muerte: cae y se desvanece | perfil derecha (se espeja) | 5 | no |

```text
PROMPT 1/1 — Demonio Hechicero: golpe recibido y muerte
Hoja de sprites para un videojuego. PERSONAJE: un DEMONIO HECHICERO de túnica violeta con capucha, piel roja y un báculo con una llama en la punta, del atlas infernal (celda 119×119).
PALETA: #140a14 (sombra), #5a2a6a (violeta), #b0301a (piel roja), #ffb040 (llama).
ESTA IMAGEN: golpe recibido y muerte, 7 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadros 1–2: golpe recibido; cuadros 3–7: muerte: cae y se desvanece.
Formato: UNA sola fila de 7 cuadros (7 columnas × 1 fila), celdas iguales de 119×119 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈90 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 1/1 — Demon Sorcerer: hurt and death
Sprite sheet for a video game. CHARACTER: a DEMON SORCERER in a hooded violet robe, red skin and a staff with a flame on top, from the infernal atlas (119×119 cell).
PALETTE: #140a14 (sombra), #5a2a6a (violeta), #b0301a (piel roja), #ffb040 (llama).
THIS IMAGE: hurt and death, 7 frames, facing RIGHT, side view (the game mirrors it for the left). frames 1–2: hurt; frames 3–7: death: falls and fades.
Format: ONE single row of 7 frames (7 columns × 1 row), equal 119×119 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 90 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

### F-07 · Lobo Ártico — `lobo_artico`

| Campo | Valor |
|---|---|
| Arena | 10 · Infernal / 05 · Gélida |
| Rango | Común / élite |
| Rol en combate | — |
| Por qué no se reemplazó | Se MANTIENE: camina y ataca con arte real; le faltan golpe y muerte propios (I-1). |
| Paleta | #1a2430 (sombra), #cfe4ee (pelaje), #8fb4c8 (gris azul), #bfe8ff (ojos) |
| Celda | 119×119 px (personaje ≈90 px de alto) |
| Entrega | `lobo_artico_1.png` … `lobo_artico_1.png`, una fila por imagen |

**Descripción visual:** Un LOBO ÁRTICO blanco y celeste, pelaje erizado con escarcha, ojos celestes, del atlas infernal (celda 119×119).

**Planilla de animaciones** (estado × dirección × cuadros):

| Imagen | Estado | Dirección | Cuadros | Bucle |
|---|---|---|---|---|
| 1 | golpe recibido | perfil derecha (se espeja) | 2 | no |
| 1 | muerte: cae y se desvanece | perfil derecha (se espeja) | 5 | no |

```text
PROMPT 1/1 — Lobo Ártico: golpe recibido y muerte
Hoja de sprites para un videojuego. PERSONAJE: un LOBO ÁRTICO blanco y celeste, pelaje erizado con escarcha, ojos celestes, del atlas infernal (celda 119×119).
PALETA: #1a2430 (sombra), #cfe4ee (pelaje), #8fb4c8 (gris azul), #bfe8ff (ojos).
ESTA IMAGEN: golpe recibido y muerte, 7 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadros 1–2: golpe recibido; cuadros 3–7: muerte: cae y se desvanece.
Formato: UNA sola fila de 7 cuadros (7 columnas × 1 fila), celdas iguales de 119×119 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈90 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 1/1 — Arctic Wolf: hurt and death
Sprite sheet for a video game. CHARACTER: a white and pale blue ARCTIC WOLF, frost-bristled fur, pale blue eyes, from the infernal atlas (119×119 cell).
PALETTE: #1a2430 (sombra), #cfe4ee (pelaje), #8fb4c8 (gris azul), #bfe8ff (ojos).
THIS IMAGE: hurt and death, 7 frames, facing RIGHT, side view (the game mirrors it for the left). frames 1–2: hurt; frames 3–7: death: falls and fades.
Format: ONE single row of 7 frames (7 columns × 1 row), equal 119×119 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 90 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

### F-08 · Kraken Joven y Leviatán — `kraken_joven`

| Campo | Valor |
|---|---|
| Arena | 06 · Arena Acuática |
| Rango | Subjefe / jefe |
| Rol en combate | Jefes con tentáculos y mecánicas propias. |
| Por qué no se reemplazó | Se MANTIENEN (mecánicas atadas al cuerpo). Les faltan cuadros de ataque: el Kraken ataca con el quieto (I-4). |
| Paleta | #140a1a (sombra), #4a2a5a (violeta), #6a3a6e (violeta claro), #c98fe0 (ventosas), #ffd24a (ojos) |
| Celda | 128×96 px (personaje ≈70 px de alto) |
| Entrega | `kraken_joven_1.png` … `kraken_joven_1.png`, una fila por imagen |

**Descripción visual:** El KRAKEN JOVEN: pulpo gigante violeta y carmesí con ventosas claras, ojos amarillos enormes, ocho tentáculos que asoman del agua oscura.

**Planilla de animaciones** (estado × dirección × cuadros):

| Imagen | Estado | Dirección | Cuadros | Bucle |
|---|---|---|---|---|
| 1 | levanta dos tentáculos | perfil derecha (se espeja) | 2 | no |
| 1 | golpea hacia adelante | perfil derecha (se espeja) | 2 | no |

```text
PROMPT 1/1 — Kraken Joven y Leviatán: ataque con tentáculos
Hoja de sprites para un videojuego. PERSONAJE: el KRAKEN JOVEN: pulpo gigante violeta y carmesí con ventosas claras, ojos amarillos enormes, ocho tentáculos que asoman del agua oscura.
PALETA: #140a1a (sombra), #4a2a5a (violeta), #6a3a6e (violeta claro), #c98fe0 (ventosas), #ffd24a (ojos).
ESTA IMAGEN: ataque con tentáculos, 4 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadros 1–2: levanta dos tentáculos; cuadros 3–4: golpea hacia adelante.
Formato: UNA sola fila de 4 cuadros (4 columnas × 1 fila), celdas iguales de 128×96 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈70 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 1/1 — Young Kraken and Leviathan: tentacle attack
Sprite sheet for a video game. CHARACTER: the YOUNG KRAKEN: a giant violet and crimson octopus with pale suckers, huge yellow eyes, eight tentacles rising from dark water.
PALETTE: #140a1a (sombra), #4a2a5a (violeta), #6a3a6e (violeta claro), #c98fe0 (ventosas), #ffd24a (ojos).
THIS IMAGE: tentacle attack, 4 frames, facing RIGHT, side view (the game mirrors it for the left). frames 1–2: raises two tentacles; frames 3–4: slams forward.
Format: ONE single row of 4 frames (4 columns × 1 row), equal 128×96 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 70 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

### F-09 · Saqueador Maldito — `cm_saqueador`

| Campo | Valor |
|---|---|
| Arena | 01 · Ciudad Maldita |
| Rango | Común / subélite / élite |
| Rol en combate | — |
| Por qué no se reemplazó | Se MANTIENE (se mueve y ataca con arte real y tiene muerte). Es arte de 16–37 px dibujado a 2–3 veces con caminata de 2 cuadros (C-1): redibujar al doble. |
| Paleta | #1a1012 (sombra), #5a3a30 (ropa), #8a3030 (rojo), #a09088 (piel gris) |
| Celda | 64×80 px (personaje ≈60 px de alto) |
| Entrega | `cm_saqueador_1.png` … `cm_saqueador_4.png`, una fila por imagen |

**Descripción visual:** Un SAQUEADOR MALDITO: ciudadano corrompido, ropa de trabajo rota, piel grisácea con venas rojas, un cuchillo de carnicero y una bolsa de botín.

**Planilla de animaciones** (estado × dirección × cuadros):

| Imagen | Estado | Dirección | Cuadros | Bucle |
|---|---|---|---|---|
| 1 | caminar de perfil | perfil derecha (se espeja) | 6 | sí |
| 2 | ataque | perfil derecha (se espeja) | 4 | no |
| 3 | golpe recibido | perfil derecha (se espeja) | 1 | no |
| 3 | muerte | perfil derecha (se espeja) | 4 | no |
| 4 | de frente | frente | 4 | sí |
| 4 | de espaldas | frente | 4 | sí |

```text
PROMPT 1/4 — Saqueador Maldito: caminar
Hoja de sprites para un videojuego. PERSONAJE: un SAQUEADOR MALDITO: ciudadano corrompido, ropa de trabajo rota, piel grisácea con venas rojas, un cuchillo de carnicero y una bolsa de botín.
PALETA: #1a1012 (sombra), #5a3a30 (ropa), #8a3030 (rojo), #a09088 (piel gris).
ESTA IMAGEN: caminar, 6 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadros 1–6: caminar de perfil.
Formato: UNA sola fila de 6 cuadros (6 columnas × 1 fila), celdas iguales de 64×80 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈60 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 1/4 — Cursed Looter: walk
Sprite sheet for a video game. CHARACTER: a CURSED LOOTER: a corrupted citizen in torn work clothes, greyish skin with red veins, a butcher knife and a loot sack.
PALETTE: #1a1012 (sombra), #5a3a30 (ropa), #8a3030 (rojo), #a09088 (piel gris).
THIS IMAGE: walk, 6 frames, facing RIGHT, side view (the game mirrors it for the left). frames 1–6: side walk.
Format: ONE single row of 6 frames (6 columns × 1 row), equal 64×80 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 60 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 2/4 — Saqueador Maldito: ataque
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: un SAQUEADOR MALDITO: ciudadano corrompido, ropa de trabajo rota, piel grisácea con venas rojas, un cuchillo de carnicero y una bolsa de botín.
PALETA: #1a1012 (sombra), #5a3a30 (ropa), #8a3030 (rojo), #a09088 (piel gris).
ESTA IMAGEN: ataque, 4 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadros 1–4: ataque.
Formato: UNA sola fila de 4 cuadros (4 columnas × 1 fila), celdas iguales de 64×80 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈60 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 2/4 — Cursed Looter: attack
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: a CURSED LOOTER: a corrupted citizen in torn work clothes, greyish skin with red veins, a butcher knife and a loot sack.
PALETTE: #1a1012 (sombra), #5a3a30 (ropa), #8a3030 (rojo), #a09088 (piel gris).
THIS IMAGE: attack, 4 frames, facing RIGHT, side view (the game mirrors it for the left). frames 1–4: attack.
Format: ONE single row of 4 frames (4 columns × 1 row), equal 64×80 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 60 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 3/4 — Saqueador Maldito: golpe recibido y muerte
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: un SAQUEADOR MALDITO: ciudadano corrompido, ropa de trabajo rota, piel grisácea con venas rojas, un cuchillo de carnicero y una bolsa de botín.
PALETA: #1a1012 (sombra), #5a3a30 (ropa), #8a3030 (rojo), #a09088 (piel gris).
ESTA IMAGEN: golpe recibido y muerte, 5 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadro 1: golpe recibido; cuadros 2–5: muerte.
Formato: UNA sola fila de 5 cuadros (5 columnas × 1 fila), celdas iguales de 64×80 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈60 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 3/4 — Cursed Looter: hurt and death
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: a CURSED LOOTER: a corrupted citizen in torn work clothes, greyish skin with red veins, a butcher knife and a loot sack.
PALETTE: #1a1012 (sombra), #5a3a30 (ropa), #8a3030 (rojo), #a09088 (piel gris).
THIS IMAGE: hurt and death, 5 frames, facing RIGHT, side view (the game mirrors it for the left). frame 1: hurt; frames 2–5: death.
Format: ONE single row of 5 frames (5 columns × 1 row), equal 64×80 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 60 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 4/4 — Saqueador Maldito: caminar de frente y de espaldas
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: un SAQUEADOR MALDITO: ciudadano corrompido, ropa de trabajo rota, piel grisácea con venas rojas, un cuchillo de carnicero y una bolsa de botín.
PALETA: #1a1012 (sombra), #5a3a30 (ropa), #8a3030 (rojo), #a09088 (piel gris).
ESTA IMAGEN: caminar de frente y de espaldas, 8 cuadros, DE FRENTE, caminando hacia la cámara. cuadros 1–4: de frente; cuadros 5–8: de espaldas.
Formato: UNA sola fila de 8 cuadros (8 columnas × 1 fila), celdas iguales de 64×80 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈60 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 4/4 — Cursed Looter: walk toward and away from camera
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: a CURSED LOOTER: a corrupted citizen in torn work clothes, greyish skin with red veins, a butcher knife and a loot sack.
PALETTE: #1a1012 (sombra), #5a3a30 (ropa), #8a3030 (rojo), #a09088 (piel gris).
THIS IMAGE: walk toward and away from camera, 8 frames, FACING THE CAMERA, walking toward the viewer. frames 1–4: toward the camera; frames 5–8: away from the camera.
Format: ONE single row of 8 frames (8 columns × 1 row), equal 64×80 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 60 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

### F-10 · Perro del Albañal — `cm_perro`

| Campo | Valor |
|---|---|
| Arena | 01 · Ciudad Maldita |
| Rango | Común / subélite / élite |
| Rol en combate | — |
| Por qué no se reemplazó | Se MANTIENE (se mueve y ataca con arte real y tiene muerte). Es arte de 16–37 px dibujado a 2–3 veces con caminata de 2 cuadros (C-1): redibujar al doble. |
| Paleta | #140c0c (sombra), #6a3a3a (piel), #9a6a5a (carne), #e02020 (ojos) |
| Celda | 64×80 px (personaje ≈60 px de alto) |
| Entrega | `cm_perro_1.png` … `cm_perro_4.png`, una fila por imagen |

**Descripción visual:** Un PERRO DEL ALBAÑAL: perro deforme y flaco, sin pelo en partes, costillas marcadas, ojos rojos, baba.

**Planilla de animaciones** (estado × dirección × cuadros):

| Imagen | Estado | Dirección | Cuadros | Bucle |
|---|---|---|---|---|
| 1 | caminar de perfil | perfil derecha (se espeja) | 6 | sí |
| 2 | ataque | perfil derecha (se espeja) | 4 | no |
| 3 | golpe recibido | perfil derecha (se espeja) | 1 | no |
| 3 | muerte | perfil derecha (se espeja) | 4 | no |
| 4 | de frente | frente | 4 | sí |
| 4 | de espaldas | frente | 4 | sí |

```text
PROMPT 1/4 — Perro del Albañal: caminar
Hoja de sprites para un videojuego. PERSONAJE: un PERRO DEL ALBAÑAL: perro deforme y flaco, sin pelo en partes, costillas marcadas, ojos rojos, baba.
PALETA: #140c0c (sombra), #6a3a3a (piel), #9a6a5a (carne), #e02020 (ojos).
ESTA IMAGEN: caminar, 6 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadros 1–6: caminar de perfil.
Formato: UNA sola fila de 6 cuadros (6 columnas × 1 fila), celdas iguales de 64×80 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈60 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 1/4 — Sewer Hound: walk
Sprite sheet for a video game. CHARACTER: a SEWER HOUND: a thin deformed dog, patchy hairless skin, visible ribs, red eyes, drool.
PALETTE: #140c0c (sombra), #6a3a3a (piel), #9a6a5a (carne), #e02020 (ojos).
THIS IMAGE: walk, 6 frames, facing RIGHT, side view (the game mirrors it for the left). frames 1–6: side walk.
Format: ONE single row of 6 frames (6 columns × 1 row), equal 64×80 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 60 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 2/4 — Perro del Albañal: ataque
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: un PERRO DEL ALBAÑAL: perro deforme y flaco, sin pelo en partes, costillas marcadas, ojos rojos, baba.
PALETA: #140c0c (sombra), #6a3a3a (piel), #9a6a5a (carne), #e02020 (ojos).
ESTA IMAGEN: ataque, 4 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadros 1–4: ataque.
Formato: UNA sola fila de 4 cuadros (4 columnas × 1 fila), celdas iguales de 64×80 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈60 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 2/4 — Sewer Hound: attack
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: a SEWER HOUND: a thin deformed dog, patchy hairless skin, visible ribs, red eyes, drool.
PALETTE: #140c0c (sombra), #6a3a3a (piel), #9a6a5a (carne), #e02020 (ojos).
THIS IMAGE: attack, 4 frames, facing RIGHT, side view (the game mirrors it for the left). frames 1–4: attack.
Format: ONE single row of 4 frames (4 columns × 1 row), equal 64×80 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 60 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 3/4 — Perro del Albañal: golpe recibido y muerte
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: un PERRO DEL ALBAÑAL: perro deforme y flaco, sin pelo en partes, costillas marcadas, ojos rojos, baba.
PALETA: #140c0c (sombra), #6a3a3a (piel), #9a6a5a (carne), #e02020 (ojos).
ESTA IMAGEN: golpe recibido y muerte, 5 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadro 1: golpe recibido; cuadros 2–5: muerte.
Formato: UNA sola fila de 5 cuadros (5 columnas × 1 fila), celdas iguales de 64×80 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈60 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 3/4 — Sewer Hound: hurt and death
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: a SEWER HOUND: a thin deformed dog, patchy hairless skin, visible ribs, red eyes, drool.
PALETTE: #140c0c (sombra), #6a3a3a (piel), #9a6a5a (carne), #e02020 (ojos).
THIS IMAGE: hurt and death, 5 frames, facing RIGHT, side view (the game mirrors it for the left). frame 1: hurt; frames 2–5: death.
Format: ONE single row of 5 frames (5 columns × 1 row), equal 64×80 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 60 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 4/4 — Perro del Albañal: caminar de frente y de espaldas
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: un PERRO DEL ALBAÑAL: perro deforme y flaco, sin pelo en partes, costillas marcadas, ojos rojos, baba.
PALETA: #140c0c (sombra), #6a3a3a (piel), #9a6a5a (carne), #e02020 (ojos).
ESTA IMAGEN: caminar de frente y de espaldas, 8 cuadros, DE FRENTE, caminando hacia la cámara. cuadros 1–4: de frente; cuadros 5–8: de espaldas.
Formato: UNA sola fila de 8 cuadros (8 columnas × 1 fila), celdas iguales de 64×80 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈60 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 4/4 — Sewer Hound: walk toward and away from camera
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: a SEWER HOUND: a thin deformed dog, patchy hairless skin, visible ribs, red eyes, drool.
PALETTE: #140c0c (sombra), #6a3a3a (piel), #9a6a5a (carne), #e02020 (ojos).
THIS IMAGE: walk toward and away from camera, 8 frames, FACING THE CAMERA, walking toward the viewer. frames 1–4: toward the camera; frames 5–8: away from the camera.
Format: ONE single row of 8 frames (8 columns × 1 row), equal 64×80 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 60 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

### F-11 · Raptor — `cm_raptor`

| Campo | Valor |
|---|---|
| Arena | 01 · Ciudad Maldita |
| Rango | Común / subélite / élite |
| Rol en combate | — |
| Por qué no se reemplazó | Se MANTIENE (se mueve y ataca con arte real y tiene muerte). Es arte de 16–37 px dibujado a 2–3 veces con caminata de 2 cuadros (C-1): redibujar al doble. |
| Paleta | #120a0e (sombra), #3a2a30 (capucha), #a04040 (rojo), #c0b0a0 (garras) |
| Celda | 64×80 px (personaje ≈60 px de alto) |
| Entrega | `cm_raptor_1.png` … `cm_raptor_4.png`, una fila por imagen |

**Descripción visual:** Un RAPTOR: criatura encorvada de brazos largos y garras, capucha negra rasgada, que agarra civiles y se los lleva.

**Planilla de animaciones** (estado × dirección × cuadros):

| Imagen | Estado | Dirección | Cuadros | Bucle |
|---|---|---|---|---|
| 1 | caminar de perfil | perfil derecha (se espeja) | 6 | sí |
| 2 | ataque | perfil derecha (se espeja) | 4 | no |
| 3 | golpe recibido | perfil derecha (se espeja) | 1 | no |
| 3 | muerte | perfil derecha (se espeja) | 4 | no |
| 4 | de frente | frente | 4 | sí |
| 4 | de espaldas | frente | 4 | sí |

```text
PROMPT 1/4 — Raptor: caminar
Hoja de sprites para un videojuego. PERSONAJE: un RAPTOR: criatura encorvada de brazos largos y garras, capucha negra rasgada, que agarra civiles y se los lleva.
PALETA: #120a0e (sombra), #3a2a30 (capucha), #a04040 (rojo), #c0b0a0 (garras).
ESTA IMAGEN: caminar, 6 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadros 1–6: caminar de perfil.
Formato: UNA sola fila de 6 cuadros (6 columnas × 1 fila), celdas iguales de 64×80 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈60 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 1/4 — Raptor: walk
Sprite sheet for a video game. CHARACTER: a RAPTOR: a hunched creature with long arms and claws, a torn black hood, that grabs civilians and carries them away.
PALETTE: #120a0e (sombra), #3a2a30 (capucha), #a04040 (rojo), #c0b0a0 (garras).
THIS IMAGE: walk, 6 frames, facing RIGHT, side view (the game mirrors it for the left). frames 1–6: side walk.
Format: ONE single row of 6 frames (6 columns × 1 row), equal 64×80 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 60 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 2/4 — Raptor: ataque
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: un RAPTOR: criatura encorvada de brazos largos y garras, capucha negra rasgada, que agarra civiles y se los lleva.
PALETA: #120a0e (sombra), #3a2a30 (capucha), #a04040 (rojo), #c0b0a0 (garras).
ESTA IMAGEN: ataque, 4 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadros 1–4: ataque.
Formato: UNA sola fila de 4 cuadros (4 columnas × 1 fila), celdas iguales de 64×80 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈60 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 2/4 — Raptor: attack
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: a RAPTOR: a hunched creature with long arms and claws, a torn black hood, that grabs civilians and carries them away.
PALETTE: #120a0e (sombra), #3a2a30 (capucha), #a04040 (rojo), #c0b0a0 (garras).
THIS IMAGE: attack, 4 frames, facing RIGHT, side view (the game mirrors it for the left). frames 1–4: attack.
Format: ONE single row of 4 frames (4 columns × 1 row), equal 64×80 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 60 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 3/4 — Raptor: golpe recibido y muerte
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: un RAPTOR: criatura encorvada de brazos largos y garras, capucha negra rasgada, que agarra civiles y se los lleva.
PALETA: #120a0e (sombra), #3a2a30 (capucha), #a04040 (rojo), #c0b0a0 (garras).
ESTA IMAGEN: golpe recibido y muerte, 5 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadro 1: golpe recibido; cuadros 2–5: muerte.
Formato: UNA sola fila de 5 cuadros (5 columnas × 1 fila), celdas iguales de 64×80 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈60 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 3/4 — Raptor: hurt and death
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: a RAPTOR: a hunched creature with long arms and claws, a torn black hood, that grabs civilians and carries them away.
PALETTE: #120a0e (sombra), #3a2a30 (capucha), #a04040 (rojo), #c0b0a0 (garras).
THIS IMAGE: hurt and death, 5 frames, facing RIGHT, side view (the game mirrors it for the left). frame 1: hurt; frames 2–5: death.
Format: ONE single row of 5 frames (5 columns × 1 row), equal 64×80 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 60 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 4/4 — Raptor: caminar de frente y de espaldas
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: un RAPTOR: criatura encorvada de brazos largos y garras, capucha negra rasgada, que agarra civiles y se los lleva.
PALETA: #120a0e (sombra), #3a2a30 (capucha), #a04040 (rojo), #c0b0a0 (garras).
ESTA IMAGEN: caminar de frente y de espaldas, 8 cuadros, DE FRENTE, caminando hacia la cámara. cuadros 1–4: de frente; cuadros 5–8: de espaldas.
Formato: UNA sola fila de 8 cuadros (8 columnas × 1 fila), celdas iguales de 64×80 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈60 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 4/4 — Raptor: walk toward and away from camera
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: a RAPTOR: a hunched creature with long arms and claws, a torn black hood, that grabs civilians and carries them away.
PALETTE: #120a0e (sombra), #3a2a30 (capucha), #a04040 (rojo), #c0b0a0 (garras).
THIS IMAGE: walk toward and away from camera, 8 frames, FACING THE CAMERA, walking toward the viewer. frames 1–4: toward the camera; frames 5–8: away from the camera.
Format: ONE single row of 8 frames (8 columns × 1 row), equal 64×80 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 60 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

### F-12 · Verdugo — `cm_verdugo`

| Campo | Valor |
|---|---|
| Arena | 01 · Ciudad Maldita |
| Rango | Común / subélite / élite |
| Rol en combate | — |
| Por qué no se reemplazó | Se MANTIENE (se mueve y ataca con arte real y tiene muerte). Es arte de 16–37 px dibujado a 2–3 veces con caminata de 2 cuadros (C-1): redibujar al doble. |
| Paleta | #120a0a (sombra), #2a1a1a (capucha), #8a5a4a (piel), #7a2a2a (sangre), #8a8a90 (hacha) |
| Celda | 64×80 px (personaje ≈60 px de alto) |
| Entrega | `cm_verdugo_1.png` … `cm_verdugo_4.png`, una fila por imagen |

**Descripción visual:** Un VERDUGO colosal: capucha negra de verdugo, torso desnudo enorme lleno de cicatrices, hacha gigante, cadenas en la cintura.

**Planilla de animaciones** (estado × dirección × cuadros):

| Imagen | Estado | Dirección | Cuadros | Bucle |
|---|---|---|---|---|
| 1 | caminar de perfil | perfil derecha (se espeja) | 6 | sí |
| 2 | ataque | perfil derecha (se espeja) | 4 | no |
| 3 | golpe recibido | perfil derecha (se espeja) | 1 | no |
| 3 | muerte | perfil derecha (se espeja) | 4 | no |
| 4 | de frente | frente | 4 | sí |
| 4 | de espaldas | frente | 4 | sí |

```text
PROMPT 1/4 — Verdugo: caminar
Hoja de sprites para un videojuego. PERSONAJE: un VERDUGO colosal: capucha negra de verdugo, torso desnudo enorme lleno de cicatrices, hacha gigante, cadenas en la cintura.
PALETA: #120a0a (sombra), #2a1a1a (capucha), #8a5a4a (piel), #7a2a2a (sangre), #8a8a90 (hacha).
ESTA IMAGEN: caminar, 6 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadros 1–6: caminar de perfil.
Formato: UNA sola fila de 6 cuadros (6 columnas × 1 fila), celdas iguales de 64×80 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈60 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 1/4 — Executioner: walk
Sprite sheet for a video game. CHARACTER: a colossal EXECUTIONER: black executioner's hood, huge scarred bare torso, a giant axe, chains at the waist.
PALETTE: #120a0a (sombra), #2a1a1a (capucha), #8a5a4a (piel), #7a2a2a (sangre), #8a8a90 (hacha).
THIS IMAGE: walk, 6 frames, facing RIGHT, side view (the game mirrors it for the left). frames 1–6: side walk.
Format: ONE single row of 6 frames (6 columns × 1 row), equal 64×80 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 60 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 2/4 — Verdugo: ataque
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: un VERDUGO colosal: capucha negra de verdugo, torso desnudo enorme lleno de cicatrices, hacha gigante, cadenas en la cintura.
PALETA: #120a0a (sombra), #2a1a1a (capucha), #8a5a4a (piel), #7a2a2a (sangre), #8a8a90 (hacha).
ESTA IMAGEN: ataque, 4 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadros 1–4: ataque.
Formato: UNA sola fila de 4 cuadros (4 columnas × 1 fila), celdas iguales de 64×80 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈60 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 2/4 — Executioner: attack
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: a colossal EXECUTIONER: black executioner's hood, huge scarred bare torso, a giant axe, chains at the waist.
PALETTE: #120a0a (sombra), #2a1a1a (capucha), #8a5a4a (piel), #7a2a2a (sangre), #8a8a90 (hacha).
THIS IMAGE: attack, 4 frames, facing RIGHT, side view (the game mirrors it for the left). frames 1–4: attack.
Format: ONE single row of 4 frames (4 columns × 1 row), equal 64×80 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 60 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 3/4 — Verdugo: golpe recibido y muerte
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: un VERDUGO colosal: capucha negra de verdugo, torso desnudo enorme lleno de cicatrices, hacha gigante, cadenas en la cintura.
PALETA: #120a0a (sombra), #2a1a1a (capucha), #8a5a4a (piel), #7a2a2a (sangre), #8a8a90 (hacha).
ESTA IMAGEN: golpe recibido y muerte, 5 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadro 1: golpe recibido; cuadros 2–5: muerte.
Formato: UNA sola fila de 5 cuadros (5 columnas × 1 fila), celdas iguales de 64×80 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈60 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 3/4 — Executioner: hurt and death
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: a colossal EXECUTIONER: black executioner's hood, huge scarred bare torso, a giant axe, chains at the waist.
PALETTE: #120a0a (sombra), #2a1a1a (capucha), #8a5a4a (piel), #7a2a2a (sangre), #8a8a90 (hacha).
THIS IMAGE: hurt and death, 5 frames, facing RIGHT, side view (the game mirrors it for the left). frame 1: hurt; frames 2–5: death.
Format: ONE single row of 5 frames (5 columns × 1 row), equal 64×80 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 60 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 4/4 — Verdugo: caminar de frente y de espaldas
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: un VERDUGO colosal: capucha negra de verdugo, torso desnudo enorme lleno de cicatrices, hacha gigante, cadenas en la cintura.
PALETA: #120a0a (sombra), #2a1a1a (capucha), #8a5a4a (piel), #7a2a2a (sangre), #8a8a90 (hacha).
ESTA IMAGEN: caminar de frente y de espaldas, 8 cuadros, DE FRENTE, caminando hacia la cámara. cuadros 1–4: de frente; cuadros 5–8: de espaldas.
Formato: UNA sola fila de 8 cuadros (8 columnas × 1 fila), celdas iguales de 64×80 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈60 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 4/4 — Executioner: walk toward and away from camera
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: a colossal EXECUTIONER: black executioner's hood, huge scarred bare torso, a giant axe, chains at the waist.
PALETTE: #120a0a (sombra), #2a1a1a (capucha), #8a5a4a (piel), #7a2a2a (sangre), #8a8a90 (hacha).
THIS IMAGE: walk toward and away from camera, 8 frames, FACING THE CAMERA, walking toward the viewer. frames 1–4: toward the camera; frames 5–8: away from the camera.
Format: ONE single row of 8 frames (8 columns × 1 row), equal 64×80 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 60 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

### F-13 · Plañidera — `cm_planidera`

| Campo | Valor |
|---|---|
| Arena | 01 · Ciudad Maldita |
| Rango | Común / subélite / élite |
| Rol en combate | — |
| Por qué no se reemplazó | Se MANTIENE (se mueve y ataca con arte real y tiene muerte). Es arte de 16–37 px dibujado a 2–3 veces con caminata de 2 cuadros (C-1): redibujar al doble. |
| Paleta | #120a10 (sombra), #3a3040 (vestido), #c05060 (luz roja), #d8d0d8 (piel pálida) |
| Celda | 64×80 px (personaje ≈60 px de alto) |
| Entrega | `cm_planidera_1.png` … `cm_planidera_4.png`, una fila por imagen |

**Descripción visual:** Una PLAÑIDERA: espíritu de mujer con velo de luto negro y vestido largo gris, manos en la cara, lágrimas de luz roja, flota.

**Planilla de animaciones** (estado × dirección × cuadros):

| Imagen | Estado | Dirección | Cuadros | Bucle |
|---|---|---|---|---|
| 1 | caminar de perfil | perfil derecha (se espeja) | 6 | sí |
| 2 | ataque | perfil derecha (se espeja) | 4 | no |
| 3 | golpe recibido | perfil derecha (se espeja) | 1 | no |
| 3 | muerte | perfil derecha (se espeja) | 4 | no |
| 4 | de frente | frente | 4 | sí |
| 4 | de espaldas | frente | 4 | sí |

```text
PROMPT 1/4 — Plañidera: caminar
Hoja de sprites para un videojuego. PERSONAJE: una PLAÑIDERA: espíritu de mujer con velo de luto negro y vestido largo gris, manos en la cara, lágrimas de luz roja, flota.
PALETA: #120a10 (sombra), #3a3040 (vestido), #c05060 (luz roja), #d8d0d8 (piel pálida).
ESTA IMAGEN: caminar, 6 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadros 1–6: caminar de perfil.
Formato: UNA sola fila de 6 cuadros (6 columnas × 1 fila), celdas iguales de 64×80 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈60 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 1/4 — Mourner: walk
Sprite sheet for a video game. CHARACTER: a MOURNER: a female spirit in a black mourning veil and long grey dress, hands on her face, tears of red light, floating.
PALETTE: #120a10 (sombra), #3a3040 (vestido), #c05060 (luz roja), #d8d0d8 (piel pálida).
THIS IMAGE: walk, 6 frames, facing RIGHT, side view (the game mirrors it for the left). frames 1–6: side walk.
Format: ONE single row of 6 frames (6 columns × 1 row), equal 64×80 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 60 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 2/4 — Plañidera: ataque
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: una PLAÑIDERA: espíritu de mujer con velo de luto negro y vestido largo gris, manos en la cara, lágrimas de luz roja, flota.
PALETA: #120a10 (sombra), #3a3040 (vestido), #c05060 (luz roja), #d8d0d8 (piel pálida).
ESTA IMAGEN: ataque, 4 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadros 1–4: ataque.
Formato: UNA sola fila de 4 cuadros (4 columnas × 1 fila), celdas iguales de 64×80 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈60 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 2/4 — Mourner: attack
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: a MOURNER: a female spirit in a black mourning veil and long grey dress, hands on her face, tears of red light, floating.
PALETTE: #120a10 (sombra), #3a3040 (vestido), #c05060 (luz roja), #d8d0d8 (piel pálida).
THIS IMAGE: attack, 4 frames, facing RIGHT, side view (the game mirrors it for the left). frames 1–4: attack.
Format: ONE single row of 4 frames (4 columns × 1 row), equal 64×80 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 60 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 3/4 — Plañidera: golpe recibido y muerte
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: una PLAÑIDERA: espíritu de mujer con velo de luto negro y vestido largo gris, manos en la cara, lágrimas de luz roja, flota.
PALETA: #120a10 (sombra), #3a3040 (vestido), #c05060 (luz roja), #d8d0d8 (piel pálida).
ESTA IMAGEN: golpe recibido y muerte, 5 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadro 1: golpe recibido; cuadros 2–5: muerte.
Formato: UNA sola fila de 5 cuadros (5 columnas × 1 fila), celdas iguales de 64×80 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈60 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 3/4 — Mourner: hurt and death
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: a MOURNER: a female spirit in a black mourning veil and long grey dress, hands on her face, tears of red light, floating.
PALETTE: #120a10 (sombra), #3a3040 (vestido), #c05060 (luz roja), #d8d0d8 (piel pálida).
THIS IMAGE: hurt and death, 5 frames, facing RIGHT, side view (the game mirrors it for the left). frame 1: hurt; frames 2–5: death.
Format: ONE single row of 5 frames (5 columns × 1 row), equal 64×80 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 60 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 4/4 — Plañidera: caminar de frente y de espaldas
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: una PLAÑIDERA: espíritu de mujer con velo de luto negro y vestido largo gris, manos en la cara, lágrimas de luz roja, flota.
PALETA: #120a10 (sombra), #3a3040 (vestido), #c05060 (luz roja), #d8d0d8 (piel pálida).
ESTA IMAGEN: caminar de frente y de espaldas, 8 cuadros, DE FRENTE, caminando hacia la cámara. cuadros 1–4: de frente; cuadros 5–8: de espaldas.
Formato: UNA sola fila de 8 cuadros (8 columnas × 1 fila), celdas iguales de 64×80 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈60 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 4/4 — Mourner: walk toward and away from camera
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: a MOURNER: a female spirit in a black mourning veil and long grey dress, hands on her face, tears of red light, floating.
PALETTE: #120a10 (sombra), #3a3040 (vestido), #c05060 (luz roja), #d8d0d8 (piel pálida).
THIS IMAGE: walk toward and away from camera, 8 frames, FACING THE CAMERA, walking toward the viewer. frames 1–4: toward the camera; frames 5–8: away from the camera.
Format: ONE single row of 8 frames (8 columns × 1 row), equal 64×80 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 60 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

### F-14 · Acechante de los Tejados — `cm_acechante`

| Campo | Valor |
|---|---|
| Arena | 01 · Ciudad Maldita |
| Rango | Común / subélite / élite |
| Rol en combate | — |
| Por qué no se reemplazó | Se MANTIENE (se mueve y ataca con arte real y tiene muerte). Es arte de 16–37 px dibujado a 2–3 veces con caminata de 2 cuadros (C-1): redibujar al doble. |
| Paleta | #100a10 (sombra), #3a2040 (piel), #9a3040 (rojo), #c0b0c0 (garras) |
| Celda | 64×80 px (personaje ≈60 px de alto) |
| Entrega | `cm_acechante_1.png` … `cm_acechante_4.png`, una fila por imagen |

**Descripción visual:** Un ACECHANTE DE LOS TEJADOS: criatura flaca y ágil tipo gárgola sin alas, piel morada oscura, garras largas, se agazapa.

**Planilla de animaciones** (estado × dirección × cuadros):

| Imagen | Estado | Dirección | Cuadros | Bucle |
|---|---|---|---|---|
| 1 | caminar de perfil | perfil derecha (se espeja) | 6 | sí |
| 2 | ataque | perfil derecha (se espeja) | 4 | no |
| 3 | golpe recibido | perfil derecha (se espeja) | 1 | no |
| 3 | muerte | perfil derecha (se espeja) | 4 | no |
| 4 | de frente | frente | 4 | sí |
| 4 | de espaldas | frente | 4 | sí |

```text
PROMPT 1/4 — Acechante de los Tejados: caminar
Hoja de sprites para un videojuego. PERSONAJE: un ACECHANTE DE LOS TEJADOS: criatura flaca y ágil tipo gárgola sin alas, piel morada oscura, garras largas, se agazapa.
PALETA: #100a10 (sombra), #3a2040 (piel), #9a3040 (rojo), #c0b0c0 (garras).
ESTA IMAGEN: caminar, 6 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadros 1–6: caminar de perfil.
Formato: UNA sola fila de 6 cuadros (6 columnas × 1 fila), celdas iguales de 64×80 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈60 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 1/4 — Rooftop Stalker: walk
Sprite sheet for a video game. CHARACTER: a ROOFTOP STALKER: a thin, agile wingless gargoyle-like creature, dark purple skin, long claws, crouching.
PALETTE: #100a10 (sombra), #3a2040 (piel), #9a3040 (rojo), #c0b0c0 (garras).
THIS IMAGE: walk, 6 frames, facing RIGHT, side view (the game mirrors it for the left). frames 1–6: side walk.
Format: ONE single row of 6 frames (6 columns × 1 row), equal 64×80 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 60 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 2/4 — Acechante de los Tejados: ataque
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: un ACECHANTE DE LOS TEJADOS: criatura flaca y ágil tipo gárgola sin alas, piel morada oscura, garras largas, se agazapa.
PALETA: #100a10 (sombra), #3a2040 (piel), #9a3040 (rojo), #c0b0c0 (garras).
ESTA IMAGEN: ataque, 4 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadros 1–4: ataque.
Formato: UNA sola fila de 4 cuadros (4 columnas × 1 fila), celdas iguales de 64×80 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈60 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 2/4 — Rooftop Stalker: attack
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: a ROOFTOP STALKER: a thin, agile wingless gargoyle-like creature, dark purple skin, long claws, crouching.
PALETTE: #100a10 (sombra), #3a2040 (piel), #9a3040 (rojo), #c0b0c0 (garras).
THIS IMAGE: attack, 4 frames, facing RIGHT, side view (the game mirrors it for the left). frames 1–4: attack.
Format: ONE single row of 4 frames (4 columns × 1 row), equal 64×80 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 60 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 3/4 — Acechante de los Tejados: golpe recibido y muerte
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: un ACECHANTE DE LOS TEJADOS: criatura flaca y ágil tipo gárgola sin alas, piel morada oscura, garras largas, se agazapa.
PALETA: #100a10 (sombra), #3a2040 (piel), #9a3040 (rojo), #c0b0c0 (garras).
ESTA IMAGEN: golpe recibido y muerte, 5 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadro 1: golpe recibido; cuadros 2–5: muerte.
Formato: UNA sola fila de 5 cuadros (5 columnas × 1 fila), celdas iguales de 64×80 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈60 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 3/4 — Rooftop Stalker: hurt and death
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: a ROOFTOP STALKER: a thin, agile wingless gargoyle-like creature, dark purple skin, long claws, crouching.
PALETTE: #100a10 (sombra), #3a2040 (piel), #9a3040 (rojo), #c0b0c0 (garras).
THIS IMAGE: hurt and death, 5 frames, facing RIGHT, side view (the game mirrors it for the left). frame 1: hurt; frames 2–5: death.
Format: ONE single row of 5 frames (5 columns × 1 row), equal 64×80 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 60 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 4/4 — Acechante de los Tejados: caminar de frente y de espaldas
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: un ACECHANTE DE LOS TEJADOS: criatura flaca y ágil tipo gárgola sin alas, piel morada oscura, garras largas, se agazapa.
PALETA: #100a10 (sombra), #3a2040 (piel), #9a3040 (rojo), #c0b0c0 (garras).
ESTA IMAGEN: caminar de frente y de espaldas, 8 cuadros, DE FRENTE, caminando hacia la cámara. cuadros 1–4: de frente; cuadros 5–8: de espaldas.
Formato: UNA sola fila de 8 cuadros (8 columnas × 1 fila), celdas iguales de 64×80 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈60 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 4/4 — Rooftop Stalker: walk toward and away from camera
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: a ROOFTOP STALKER: a thin, agile wingless gargoyle-like creature, dark purple skin, long claws, crouching.
PALETTE: #100a10 (sombra), #3a2040 (piel), #9a3040 (rojo), #c0b0c0 (garras).
THIS IMAGE: walk toward and away from camera, 8 frames, FACING THE CAMERA, walking toward the viewer. frames 1–4: toward the camera; frames 5–8: away from the camera.
Format: ONE single row of 8 frames (8 columns × 1 row), equal 64×80 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 60 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

### F-15 · Sectario Fanático — `cm_sectario`

| Campo | Valor |
|---|---|
| Arena | 01 · Ciudad Maldita |
| Rango | Común / subélite / élite |
| Rol en combate | — |
| Por qué no se reemplazó | Se MANTIENE (se mueve y ataca con arte real y tiene muerte). Es arte de 16–37 px dibujado a 2–3 veces con caminata de 2 cuadros (C-1): redibujar al doble. |
| Paleta | #120808 (sombra), #b02020 (túnica), #e0d0c0 (máscara), #ffb040 (mecha) |
| Celda | 64×80 px (personaje ≈60 px de alto) |
| Entrega | `cm_sectario_1.png` … `cm_sectario_4.png`, una fila por imagen |

**Descripción visual:** Un SECTARIO FANÁTICO: túnica roja con capucha y máscara de teatro sonriente, bombas de pólvora atadas al pecho.

**Planilla de animaciones** (estado × dirección × cuadros):

| Imagen | Estado | Dirección | Cuadros | Bucle |
|---|---|---|---|---|
| 1 | caminar de perfil | perfil derecha (se espeja) | 6 | sí |
| 2 | ataque | perfil derecha (se espeja) | 4 | no |
| 3 | golpe recibido | perfil derecha (se espeja) | 1 | no |
| 3 | muerte | perfil derecha (se espeja) | 4 | no |
| 4 | de frente | frente | 4 | sí |
| 4 | de espaldas | frente | 4 | sí |

```text
PROMPT 1/4 — Sectario Fanático: caminar
Hoja de sprites para un videojuego. PERSONAJE: un SECTARIO FANÁTICO: túnica roja con capucha y máscara de teatro sonriente, bombas de pólvora atadas al pecho.
PALETA: #120808 (sombra), #b02020 (túnica), #e0d0c0 (máscara), #ffb040 (mecha).
ESTA IMAGEN: caminar, 6 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadros 1–6: caminar de perfil.
Formato: UNA sola fila de 6 cuadros (6 columnas × 1 fila), celdas iguales de 64×80 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈60 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 1/4 — Fanatic Cultist: walk
Sprite sheet for a video game. CHARACTER: a FANATIC CULTIST: a hooded red robe and a smiling theater mask, gunpowder bombs strapped to the chest.
PALETTE: #120808 (sombra), #b02020 (túnica), #e0d0c0 (máscara), #ffb040 (mecha).
THIS IMAGE: walk, 6 frames, facing RIGHT, side view (the game mirrors it for the left). frames 1–6: side walk.
Format: ONE single row of 6 frames (6 columns × 1 row), equal 64×80 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 60 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 2/4 — Sectario Fanático: ataque
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: un SECTARIO FANÁTICO: túnica roja con capucha y máscara de teatro sonriente, bombas de pólvora atadas al pecho.
PALETA: #120808 (sombra), #b02020 (túnica), #e0d0c0 (máscara), #ffb040 (mecha).
ESTA IMAGEN: ataque, 4 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadros 1–4: ataque.
Formato: UNA sola fila de 4 cuadros (4 columnas × 1 fila), celdas iguales de 64×80 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈60 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 2/4 — Fanatic Cultist: attack
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: a FANATIC CULTIST: a hooded red robe and a smiling theater mask, gunpowder bombs strapped to the chest.
PALETTE: #120808 (sombra), #b02020 (túnica), #e0d0c0 (máscara), #ffb040 (mecha).
THIS IMAGE: attack, 4 frames, facing RIGHT, side view (the game mirrors it for the left). frames 1–4: attack.
Format: ONE single row of 4 frames (4 columns × 1 row), equal 64×80 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 60 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 3/4 — Sectario Fanático: golpe recibido y muerte
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: un SECTARIO FANÁTICO: túnica roja con capucha y máscara de teatro sonriente, bombas de pólvora atadas al pecho.
PALETA: #120808 (sombra), #b02020 (túnica), #e0d0c0 (máscara), #ffb040 (mecha).
ESTA IMAGEN: golpe recibido y muerte, 5 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadro 1: golpe recibido; cuadros 2–5: muerte.
Formato: UNA sola fila de 5 cuadros (5 columnas × 1 fila), celdas iguales de 64×80 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈60 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 3/4 — Fanatic Cultist: hurt and death
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: a FANATIC CULTIST: a hooded red robe and a smiling theater mask, gunpowder bombs strapped to the chest.
PALETTE: #120808 (sombra), #b02020 (túnica), #e0d0c0 (máscara), #ffb040 (mecha).
THIS IMAGE: hurt and death, 5 frames, facing RIGHT, side view (the game mirrors it for the left). frame 1: hurt; frames 2–5: death.
Format: ONE single row of 5 frames (5 columns × 1 row), equal 64×80 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 60 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 4/4 — Sectario Fanático: caminar de frente y de espaldas
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: un SECTARIO FANÁTICO: túnica roja con capucha y máscara de teatro sonriente, bombas de pólvora atadas al pecho.
PALETA: #120808 (sombra), #b02020 (túnica), #e0d0c0 (máscara), #ffb040 (mecha).
ESTA IMAGEN: caminar de frente y de espaldas, 8 cuadros, DE FRENTE, caminando hacia la cámara. cuadros 1–4: de frente; cuadros 5–8: de espaldas.
Formato: UNA sola fila de 8 cuadros (8 columnas × 1 fila), celdas iguales de 64×80 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈60 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 4/4 — Fanatic Cultist: walk toward and away from camera
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: a FANATIC CULTIST: a hooded red robe and a smiling theater mask, gunpowder bombs strapped to the chest.
PALETTE: #120808 (sombra), #b02020 (túnica), #e0d0c0 (máscara), #ffb040 (mecha).
THIS IMAGE: walk toward and away from camera, 8 frames, FACING THE CAMERA, walking toward the viewer. frames 1–4: toward the camera; frames 5–8: away from the camera.
Format: ONE single row of 8 frames (8 columns × 1 row), equal 64×80 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 60 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

### F-16 · Campanero — `cm_campanero`

| Campo | Valor |
|---|---|
| Arena | 01 · Ciudad Maldita |
| Rango | Común / subélite / élite |
| Rol en combate | — |
| Por qué no se reemplazó | Se MANTIENE (se mueve y ataca con arte real y tiene muerte). Es arte de 16–37 px dibujado a 2–3 veces con caminata de 2 cuadros (C-1): redibujar al doble. |
| Paleta | #140c08 (sombra), #5a3a20 (hábito), #b06030 (bronce), #c0a080 (piel) |
| Celda | 64×80 px (personaje ≈60 px de alto) |
| Entrega | `cm_campanero_1.png` … `cm_campanero_4.png`, una fila por imagen |

**Descripción visual:** Un CAMPANERO: jorobado gordo con hábito marrón, una campana de bronce colgada a la espalda y un mazo.

**Planilla de animaciones** (estado × dirección × cuadros):

| Imagen | Estado | Dirección | Cuadros | Bucle |
|---|---|---|---|---|
| 1 | caminar de perfil | perfil derecha (se espeja) | 6 | sí |
| 2 | ataque | perfil derecha (se espeja) | 4 | no |
| 3 | golpe recibido | perfil derecha (se espeja) | 1 | no |
| 3 | muerte | perfil derecha (se espeja) | 4 | no |
| 4 | de frente | frente | 4 | sí |
| 4 | de espaldas | frente | 4 | sí |

```text
PROMPT 1/4 — Campanero: caminar
Hoja de sprites para un videojuego. PERSONAJE: un CAMPANERO: jorobado gordo con hábito marrón, una campana de bronce colgada a la espalda y un mazo.
PALETA: #140c08 (sombra), #5a3a20 (hábito), #b06030 (bronce), #c0a080 (piel).
ESTA IMAGEN: caminar, 6 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadros 1–6: caminar de perfil.
Formato: UNA sola fila de 6 cuadros (6 columnas × 1 fila), celdas iguales de 64×80 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈60 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 1/4 — Bell Ringer: walk
Sprite sheet for a video game. CHARACTER: a BELL RINGER: a fat hunchback in a brown habit, a bronze bell hanging on his back and a mallet.
PALETTE: #140c08 (sombra), #5a3a20 (hábito), #b06030 (bronce), #c0a080 (piel).
THIS IMAGE: walk, 6 frames, facing RIGHT, side view (the game mirrors it for the left). frames 1–6: side walk.
Format: ONE single row of 6 frames (6 columns × 1 row), equal 64×80 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 60 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 2/4 — Campanero: ataque
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: un CAMPANERO: jorobado gordo con hábito marrón, una campana de bronce colgada a la espalda y un mazo.
PALETA: #140c08 (sombra), #5a3a20 (hábito), #b06030 (bronce), #c0a080 (piel).
ESTA IMAGEN: ataque, 4 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadros 1–4: ataque.
Formato: UNA sola fila de 4 cuadros (4 columnas × 1 fila), celdas iguales de 64×80 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈60 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 2/4 — Bell Ringer: attack
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: a BELL RINGER: a fat hunchback in a brown habit, a bronze bell hanging on his back and a mallet.
PALETTE: #140c08 (sombra), #5a3a20 (hábito), #b06030 (bronce), #c0a080 (piel).
THIS IMAGE: attack, 4 frames, facing RIGHT, side view (the game mirrors it for the left). frames 1–4: attack.
Format: ONE single row of 4 frames (4 columns × 1 row), equal 64×80 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 60 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 3/4 — Campanero: golpe recibido y muerte
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: un CAMPANERO: jorobado gordo con hábito marrón, una campana de bronce colgada a la espalda y un mazo.
PALETA: #140c08 (sombra), #5a3a20 (hábito), #b06030 (bronce), #c0a080 (piel).
ESTA IMAGEN: golpe recibido y muerte, 5 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadro 1: golpe recibido; cuadros 2–5: muerte.
Formato: UNA sola fila de 5 cuadros (5 columnas × 1 fila), celdas iguales de 64×80 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈60 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 3/4 — Bell Ringer: hurt and death
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: a BELL RINGER: a fat hunchback in a brown habit, a bronze bell hanging on his back and a mallet.
PALETTE: #140c08 (sombra), #5a3a20 (hábito), #b06030 (bronce), #c0a080 (piel).
THIS IMAGE: hurt and death, 5 frames, facing RIGHT, side view (the game mirrors it for the left). frame 1: hurt; frames 2–5: death.
Format: ONE single row of 5 frames (5 columns × 1 row), equal 64×80 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 60 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 4/4 — Campanero: caminar de frente y de espaldas
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: un CAMPANERO: jorobado gordo con hábito marrón, una campana de bronce colgada a la espalda y un mazo.
PALETA: #140c08 (sombra), #5a3a20 (hábito), #b06030 (bronce), #c0a080 (piel).
ESTA IMAGEN: caminar de frente y de espaldas, 8 cuadros, DE FRENTE, caminando hacia la cámara. cuadros 1–4: de frente; cuadros 5–8: de espaldas.
Formato: UNA sola fila de 8 cuadros (8 columnas × 1 fila), celdas iguales de 64×80 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈60 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 4/4 — Bell Ringer: walk toward and away from camera
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: a BELL RINGER: a fat hunchback in a brown habit, a bronze bell hanging on his back and a mallet.
PALETTE: #140c08 (sombra), #5a3a20 (hábito), #b06030 (bronce), #c0a080 (piel).
THIS IMAGE: walk toward and away from camera, 8 frames, FACING THE CAMERA, walking toward the viewer. frames 1–4: toward the camera; frames 5–8: away from the camera.
Format: ONE single row of 8 frames (8 columns × 1 row), equal 64×80 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 60 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

### F-17 · Espectro Ciudadano — `cm_espectro`

| Campo | Valor |
|---|---|
| Arena | 01 · Ciudad Maldita |
| Rango | Común / subélite / élite |
| Rol en combate | — |
| Por qué no se reemplazó | Se MANTIENE (se mueve y ataca con arte real y tiene muerte). Es arte de 16–37 px dibujado a 2–3 veces con caminata de 2 cuadros (C-1): redibujar al doble. |
| Paleta | #0a1220 (sombra), #3a5a8a (azul), #7ab0e0 (celeste), #e0f0ff (brillo) |
| Celda | 64×80 px (personaje ≈60 px de alto) |
| Entrega | `cm_espectro_1.png` … `cm_espectro_4.png`, una fila por imagen |

**Descripción visual:** Un ESPECTRO CIUDADANO: alma traslúcida celeste de un vecino, ropa antigua deshilachada, boca abierta, sin piernas.

**Planilla de animaciones** (estado × dirección × cuadros):

| Imagen | Estado | Dirección | Cuadros | Bucle |
|---|---|---|---|---|
| 1 | caminar de perfil | perfil derecha (se espeja) | 6 | sí |
| 2 | ataque | perfil derecha (se espeja) | 4 | no |
| 3 | golpe recibido | perfil derecha (se espeja) | 1 | no |
| 3 | muerte | perfil derecha (se espeja) | 4 | no |
| 4 | de frente | frente | 4 | sí |
| 4 | de espaldas | frente | 4 | sí |

```text
PROMPT 1/4 — Espectro Ciudadano: caminar
Hoja de sprites para un videojuego. PERSONAJE: un ESPECTRO CIUDADANO: alma traslúcida celeste de un vecino, ropa antigua deshilachada, boca abierta, sin piernas.
PALETA: #0a1220 (sombra), #3a5a8a (azul), #7ab0e0 (celeste), #e0f0ff (brillo).
ESTA IMAGEN: caminar, 6 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadros 1–6: caminar de perfil.
Formato: UNA sola fila de 6 cuadros (6 columnas × 1 fila), celdas iguales de 64×80 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈60 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 1/4 — Citizen Wraith: walk
Sprite sheet for a video game. CHARACTER: a CITIZEN WRAITH: a translucent pale blue soul of a townsperson, frayed old clothes, open mouth, no legs.
PALETTE: #0a1220 (sombra), #3a5a8a (azul), #7ab0e0 (celeste), #e0f0ff (brillo).
THIS IMAGE: walk, 6 frames, facing RIGHT, side view (the game mirrors it for the left). frames 1–6: side walk.
Format: ONE single row of 6 frames (6 columns × 1 row), equal 64×80 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 60 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 2/4 — Espectro Ciudadano: ataque
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: un ESPECTRO CIUDADANO: alma traslúcida celeste de un vecino, ropa antigua deshilachada, boca abierta, sin piernas.
PALETA: #0a1220 (sombra), #3a5a8a (azul), #7ab0e0 (celeste), #e0f0ff (brillo).
ESTA IMAGEN: ataque, 4 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadros 1–4: ataque.
Formato: UNA sola fila de 4 cuadros (4 columnas × 1 fila), celdas iguales de 64×80 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈60 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 2/4 — Citizen Wraith: attack
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: a CITIZEN WRAITH: a translucent pale blue soul of a townsperson, frayed old clothes, open mouth, no legs.
PALETTE: #0a1220 (sombra), #3a5a8a (azul), #7ab0e0 (celeste), #e0f0ff (brillo).
THIS IMAGE: attack, 4 frames, facing RIGHT, side view (the game mirrors it for the left). frames 1–4: attack.
Format: ONE single row of 4 frames (4 columns × 1 row), equal 64×80 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 60 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 3/4 — Espectro Ciudadano: golpe recibido y muerte
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: un ESPECTRO CIUDADANO: alma traslúcida celeste de un vecino, ropa antigua deshilachada, boca abierta, sin piernas.
PALETA: #0a1220 (sombra), #3a5a8a (azul), #7ab0e0 (celeste), #e0f0ff (brillo).
ESTA IMAGEN: golpe recibido y muerte, 5 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadro 1: golpe recibido; cuadros 2–5: muerte.
Formato: UNA sola fila de 5 cuadros (5 columnas × 1 fila), celdas iguales de 64×80 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈60 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 3/4 — Citizen Wraith: hurt and death
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: a CITIZEN WRAITH: a translucent pale blue soul of a townsperson, frayed old clothes, open mouth, no legs.
PALETTE: #0a1220 (sombra), #3a5a8a (azul), #7ab0e0 (celeste), #e0f0ff (brillo).
THIS IMAGE: hurt and death, 5 frames, facing RIGHT, side view (the game mirrors it for the left). frame 1: hurt; frames 2–5: death.
Format: ONE single row of 5 frames (5 columns × 1 row), equal 64×80 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 60 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 4/4 — Espectro Ciudadano: caminar de frente y de espaldas
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: un ESPECTRO CIUDADANO: alma traslúcida celeste de un vecino, ropa antigua deshilachada, boca abierta, sin piernas.
PALETA: #0a1220 (sombra), #3a5a8a (azul), #7ab0e0 (celeste), #e0f0ff (brillo).
ESTA IMAGEN: caminar de frente y de espaldas, 8 cuadros, DE FRENTE, caminando hacia la cámara. cuadros 1–4: de frente; cuadros 5–8: de espaldas.
Formato: UNA sola fila de 8 cuadros (8 columnas × 1 fila), celdas iguales de 64×80 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈60 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 4/4 — Citizen Wraith: walk toward and away from camera
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: a CITIZEN WRAITH: a translucent pale blue soul of a townsperson, frayed old clothes, open mouth, no legs.
PALETTE: #0a1220 (sombra), #3a5a8a (azul), #7ab0e0 (celeste), #e0f0ff (brillo).
THIS IMAGE: walk toward and away from camera, 8 frames, FACING THE CAMERA, walking toward the viewer. frames 1–4: toward the camera; frames 5–8: away from the camera.
Format: ONE single row of 8 frames (8 columns × 1 row), equal 64×80 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 60 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

### F-18 · Errante del Vacío — `ab_errante`

| Campo | Valor |
|---|---|
| Arena | 08 · Abismo |
| Rango | Común / subélite / élite |
| Rol en combate | — |
| Por qué no se reemplazó | Se MANTIENE (se mueve y ataca con arte real). Caminata de 2 cuadros y arte a 1,3–2,4 veces (C-1): redibujar al doble. |
| Paleta | #0e0a12 (sombra), #3a2a3a (harapos), #8a4a6a (morado), #b070ff (grietas) |
| Celda | 80×80 px (personaje ≈64 px de alto) |
| Entrega | `ab_errante_1.png` … `ab_errante_3.png`, una fila por imagen |

**Descripción visual:** Un ERRANTE DEL VACÍO: cadáver alto y encorvado de los que cayeron al Abismo, harapos morados, piel gris, grietas violetas que brillan.

**Planilla de animaciones** (estado × dirección × cuadros):

| Imagen | Estado | Dirección | Cuadros | Bucle |
|---|---|---|---|---|
| 1 | caminar de perfil | perfil derecha (se espeja) | 6 | sí |
| 2 | ataque | perfil derecha (se espeja) | 4 | no |
| 3 | golpe recibido | perfil derecha (se espeja) | 1 | no |
| 3 | muerte | perfil derecha (se espeja) | 4 | no |

```text
PROMPT 1/3 — Errante del Vacío: caminar
Hoja de sprites para un videojuego. PERSONAJE: un ERRANTE DEL VACÍO: cadáver alto y encorvado de los que cayeron al Abismo, harapos morados, piel gris, grietas violetas que brillan.
PALETA: #0e0a12 (sombra), #3a2a3a (harapos), #8a4a6a (morado), #b070ff (grietas).
ESTA IMAGEN: caminar, 6 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadros 1–6: caminar de perfil.
Formato: UNA sola fila de 6 cuadros (6 columnas × 1 fila), celdas iguales de 80×80 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈64 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 1/3 — Void Wanderer: walk
Sprite sheet for a video game. CHARACTER: a VOID WANDERER: a tall hunched corpse of those who fell into the Abyss, purple rags, grey skin, glowing violet cracks.
PALETTE: #0e0a12 (sombra), #3a2a3a (harapos), #8a4a6a (morado), #b070ff (grietas).
THIS IMAGE: walk, 6 frames, facing RIGHT, side view (the game mirrors it for the left). frames 1–6: side walk.
Format: ONE single row of 6 frames (6 columns × 1 row), equal 80×80 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 64 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 2/3 — Errante del Vacío: ataque
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: un ERRANTE DEL VACÍO: cadáver alto y encorvado de los que cayeron al Abismo, harapos morados, piel gris, grietas violetas que brillan.
PALETA: #0e0a12 (sombra), #3a2a3a (harapos), #8a4a6a (morado), #b070ff (grietas).
ESTA IMAGEN: ataque, 4 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadros 1–4: ataque.
Formato: UNA sola fila de 4 cuadros (4 columnas × 1 fila), celdas iguales de 80×80 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈64 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 2/3 — Void Wanderer: attack
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: a VOID WANDERER: a tall hunched corpse of those who fell into the Abyss, purple rags, grey skin, glowing violet cracks.
PALETTE: #0e0a12 (sombra), #3a2a3a (harapos), #8a4a6a (morado), #b070ff (grietas).
THIS IMAGE: attack, 4 frames, facing RIGHT, side view (the game mirrors it for the left). frames 1–4: attack.
Format: ONE single row of 4 frames (4 columns × 1 row), equal 80×80 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 64 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 3/3 — Errante del Vacío: golpe recibido y muerte
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: un ERRANTE DEL VACÍO: cadáver alto y encorvado de los que cayeron al Abismo, harapos morados, piel gris, grietas violetas que brillan.
PALETA: #0e0a12 (sombra), #3a2a3a (harapos), #8a4a6a (morado), #b070ff (grietas).
ESTA IMAGEN: golpe recibido y muerte, 5 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadro 1: golpe recibido; cuadros 2–5: muerte.
Formato: UNA sola fila de 5 cuadros (5 columnas × 1 fila), celdas iguales de 80×80 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈64 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 3/3 — Void Wanderer: hurt and death
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: a VOID WANDERER: a tall hunched corpse of those who fell into the Abyss, purple rags, grey skin, glowing violet cracks.
PALETTE: #0e0a12 (sombra), #3a2a3a (harapos), #8a4a6a (morado), #b070ff (grietas).
THIS IMAGE: hurt and death, 5 frames, facing RIGHT, side view (the game mirrors it for the left). frame 1: hurt; frames 2–5: death.
Format: ONE single row of 5 frames (5 columns × 1 row), equal 80×80 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 64 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

### F-19 · Acechador del Borde — `ab_acechador`

| Campo | Valor |
|---|---|
| Arena | 08 · Abismo |
| Rango | Común / subélite / élite |
| Rol en combate | — |
| Por qué no se reemplazó | Se MANTIENE (se mueve y ataca con arte real). Caminata de 2 cuadros y arte a 1,3–2,4 veces (C-1): redibujar al doble. |
| Paleta | #0a0810 (sombra), #2a1a3a (cuerpo), #7a4ad0 (violeta), #d0a0ff (ojos) |
| Celda | 80×80 px (personaje ≈64 px de alto) |
| Entrega | `ab_acechador_1.png` … `ab_acechador_3.png`, una fila por imagen |

**Descripción visual:** Un ACECHADOR DEL BORDE: criatura de cuatro patas pegada al piso, cuerpo negro y violeta, garras de gancho, ojos violetas.

**Planilla de animaciones** (estado × dirección × cuadros):

| Imagen | Estado | Dirección | Cuadros | Bucle |
|---|---|---|---|---|
| 1 | caminar de perfil | perfil derecha (se espeja) | 6 | sí |
| 2 | ataque | perfil derecha (se espeja) | 4 | no |
| 3 | golpe recibido | perfil derecha (se espeja) | 1 | no |
| 3 | muerte | perfil derecha (se espeja) | 4 | no |

```text
PROMPT 1/3 — Acechador del Borde: caminar
Hoja de sprites para un videojuego. PERSONAJE: un ACECHADOR DEL BORDE: criatura de cuatro patas pegada al piso, cuerpo negro y violeta, garras de gancho, ojos violetas.
PALETA: #0a0810 (sombra), #2a1a3a (cuerpo), #7a4ad0 (violeta), #d0a0ff (ojos).
ESTA IMAGEN: caminar, 6 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadros 1–6: caminar de perfil.
Formato: UNA sola fila de 6 cuadros (6 columnas × 1 fila), celdas iguales de 80×80 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈64 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 1/3 — Edge Stalker: walk
Sprite sheet for a video game. CHARACTER: an EDGE STALKER: a low four-legged creature, black and violet body, hook claws, violet eyes.
PALETTE: #0a0810 (sombra), #2a1a3a (cuerpo), #7a4ad0 (violeta), #d0a0ff (ojos).
THIS IMAGE: walk, 6 frames, facing RIGHT, side view (the game mirrors it for the left). frames 1–6: side walk.
Format: ONE single row of 6 frames (6 columns × 1 row), equal 80×80 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 64 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 2/3 — Acechador del Borde: ataque
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: un ACECHADOR DEL BORDE: criatura de cuatro patas pegada al piso, cuerpo negro y violeta, garras de gancho, ojos violetas.
PALETA: #0a0810 (sombra), #2a1a3a (cuerpo), #7a4ad0 (violeta), #d0a0ff (ojos).
ESTA IMAGEN: ataque, 4 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadros 1–4: ataque.
Formato: UNA sola fila de 4 cuadros (4 columnas × 1 fila), celdas iguales de 80×80 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈64 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 2/3 — Edge Stalker: attack
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: an EDGE STALKER: a low four-legged creature, black and violet body, hook claws, violet eyes.
PALETTE: #0a0810 (sombra), #2a1a3a (cuerpo), #7a4ad0 (violeta), #d0a0ff (ojos).
THIS IMAGE: attack, 4 frames, facing RIGHT, side view (the game mirrors it for the left). frames 1–4: attack.
Format: ONE single row of 4 frames (4 columns × 1 row), equal 80×80 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 64 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 3/3 — Acechador del Borde: golpe recibido y muerte
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: un ACECHADOR DEL BORDE: criatura de cuatro patas pegada al piso, cuerpo negro y violeta, garras de gancho, ojos violetas.
PALETA: #0a0810 (sombra), #2a1a3a (cuerpo), #7a4ad0 (violeta), #d0a0ff (ojos).
ESTA IMAGEN: golpe recibido y muerte, 5 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadro 1: golpe recibido; cuadros 2–5: muerte.
Formato: UNA sola fila de 5 cuadros (5 columnas × 1 fila), celdas iguales de 80×80 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈64 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 3/3 — Edge Stalker: hurt and death
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: an EDGE STALKER: a low four-legged creature, black and violet body, hook claws, violet eyes.
PALETTE: #0a0810 (sombra), #2a1a3a (cuerpo), #7a4ad0 (violeta), #d0a0ff (ojos).
THIS IMAGE: hurt and death, 5 frames, facing RIGHT, side view (the game mirrors it for the left). frame 1: hurt; frames 2–5: death.
Format: ONE single row of 5 frames (5 columns × 1 row), equal 80×80 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 64 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

### F-20 · Heraldo del Ojo — `ab_heraldo`

| Campo | Valor |
|---|---|
| Arena | 08 · Abismo |
| Rango | Común / subélite / élite |
| Rol en combate | — |
| Por qué no se reemplazó | Se MANTIENE (se mueve y ataca con arte real). Caminata de 2 cuadros y arte a 1,3–2,4 veces (C-1): redibujar al doble. |
| Paleta | #0e0a14 (sombra), #4a2a6a (túnica), #b050ff (violeta), #ffe0ff (ojo) |
| Celda | 80×80 px (personaje ≈64 px de alto) |
| Entrega | `ab_heraldo_1.png` … `ab_heraldo_3.png`, una fila por imagen |

**Descripción visual:** Un HERALDO DEL OJO: figura encapuchada que flota, túnica violeta, un ojo enorme en el pecho que brilla.

**Planilla de animaciones** (estado × dirección × cuadros):

| Imagen | Estado | Dirección | Cuadros | Bucle |
|---|---|---|---|---|
| 1 | caminar de perfil | perfil derecha (se espeja) | 6 | sí |
| 2 | ataque | perfil derecha (se espeja) | 4 | no |
| 3 | golpe recibido | perfil derecha (se espeja) | 1 | no |
| 3 | muerte | perfil derecha (se espeja) | 4 | no |

```text
PROMPT 1/3 — Heraldo del Ojo: caminar
Hoja de sprites para un videojuego. PERSONAJE: un HERALDO DEL OJO: figura encapuchada que flota, túnica violeta, un ojo enorme en el pecho que brilla.
PALETA: #0e0a14 (sombra), #4a2a6a (túnica), #b050ff (violeta), #ffe0ff (ojo).
ESTA IMAGEN: caminar, 6 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadros 1–6: caminar de perfil.
Formato: UNA sola fila de 6 cuadros (6 columnas × 1 fila), celdas iguales de 80×80 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈64 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 1/3 — Herald of the Eye: walk
Sprite sheet for a video game. CHARACTER: a HERALD OF THE EYE: a floating hooded figure in a violet robe with a huge glowing eye on its chest.
PALETTE: #0e0a14 (sombra), #4a2a6a (túnica), #b050ff (violeta), #ffe0ff (ojo).
THIS IMAGE: walk, 6 frames, facing RIGHT, side view (the game mirrors it for the left). frames 1–6: side walk.
Format: ONE single row of 6 frames (6 columns × 1 row), equal 80×80 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 64 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 2/3 — Heraldo del Ojo: ataque
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: un HERALDO DEL OJO: figura encapuchada que flota, túnica violeta, un ojo enorme en el pecho que brilla.
PALETA: #0e0a14 (sombra), #4a2a6a (túnica), #b050ff (violeta), #ffe0ff (ojo).
ESTA IMAGEN: ataque, 4 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadros 1–4: ataque.
Formato: UNA sola fila de 4 cuadros (4 columnas × 1 fila), celdas iguales de 80×80 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈64 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 2/3 — Herald of the Eye: attack
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: a HERALD OF THE EYE: a floating hooded figure in a violet robe with a huge glowing eye on its chest.
PALETTE: #0e0a14 (sombra), #4a2a6a (túnica), #b050ff (violeta), #ffe0ff (ojo).
THIS IMAGE: attack, 4 frames, facing RIGHT, side view (the game mirrors it for the left). frames 1–4: attack.
Format: ONE single row of 4 frames (4 columns × 1 row), equal 80×80 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 64 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 3/3 — Heraldo del Ojo: golpe recibido y muerte
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: un HERALDO DEL OJO: figura encapuchada que flota, túnica violeta, un ojo enorme en el pecho que brilla.
PALETA: #0e0a14 (sombra), #4a2a6a (túnica), #b050ff (violeta), #ffe0ff (ojo).
ESTA IMAGEN: golpe recibido y muerte, 5 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadro 1: golpe recibido; cuadros 2–5: muerte.
Formato: UNA sola fila de 5 cuadros (5 columnas × 1 fila), celdas iguales de 80×80 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈64 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 3/3 — Herald of the Eye: hurt and death
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: a HERALD OF THE EYE: a floating hooded figure in a violet robe with a huge glowing eye on its chest.
PALETTE: #0e0a14 (sombra), #4a2a6a (túnica), #b050ff (violeta), #ffe0ff (ojo).
THIS IMAGE: hurt and death, 5 frames, facing RIGHT, side view (the game mirrors it for the left). frame 1: hurt; frames 2–5: death.
Format: ONE single row of 5 frames (5 columns × 1 row), equal 80×80 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 64 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

### F-21 · Devorador de Piedra — `ab_devorador`

| Campo | Valor |
|---|---|
| Arena | 08 · Abismo |
| Rango | Común / subélite / élite |
| Rol en combate | — |
| Por qué no se reemplazó | Se MANTIENE (se mueve y ataca con arte real). Caminata de 2 cuadros y arte a 1,3–2,4 veces (C-1): redibujar al doble. |
| Paleta | #100c10 (sombra), #4a3a3a (piedra), #8a6a5a (roca), #c060ff (brillo) |
| Celda | 80×80 px (personaje ≈64 px de alto) |
| Entrega | `ab_devorador_1.png` … `ab_devorador_3.png`, una fila por imagen |

**Descripción visual:** Un DEVORADOR DE PIEDRA: masa de ruinas vivientes, rocas fusionadas con una boca violeta brillante, brazos de piedra.

**Planilla de animaciones** (estado × dirección × cuadros):

| Imagen | Estado | Dirección | Cuadros | Bucle |
|---|---|---|---|---|
| 1 | caminar de perfil | perfil derecha (se espeja) | 6 | sí |
| 2 | ataque | perfil derecha (se espeja) | 4 | no |
| 3 | golpe recibido | perfil derecha (se espeja) | 1 | no |
| 3 | muerte | perfil derecha (se espeja) | 4 | no |

```text
PROMPT 1/3 — Devorador de Piedra: caminar
Hoja de sprites para un videojuego. PERSONAJE: un DEVORADOR DE PIEDRA: masa de ruinas vivientes, rocas fusionadas con una boca violeta brillante, brazos de piedra.
PALETA: #100c10 (sombra), #4a3a3a (piedra), #8a6a5a (roca), #c060ff (brillo).
ESTA IMAGEN: caminar, 6 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadros 1–6: caminar de perfil.
Formato: UNA sola fila de 6 cuadros (6 columnas × 1 fila), celdas iguales de 80×80 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈64 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 1/3 — Stone Devourer: walk
Sprite sheet for a video game. CHARACTER: a STONE DEVOURER: a mass of living ruins, fused rocks with a glowing violet maw, stone arms.
PALETTE: #100c10 (sombra), #4a3a3a (piedra), #8a6a5a (roca), #c060ff (brillo).
THIS IMAGE: walk, 6 frames, facing RIGHT, side view (the game mirrors it for the left). frames 1–6: side walk.
Format: ONE single row of 6 frames (6 columns × 1 row), equal 80×80 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 64 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 2/3 — Devorador de Piedra: ataque
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: un DEVORADOR DE PIEDRA: masa de ruinas vivientes, rocas fusionadas con una boca violeta brillante, brazos de piedra.
PALETA: #100c10 (sombra), #4a3a3a (piedra), #8a6a5a (roca), #c060ff (brillo).
ESTA IMAGEN: ataque, 4 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadros 1–4: ataque.
Formato: UNA sola fila de 4 cuadros (4 columnas × 1 fila), celdas iguales de 80×80 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈64 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 2/3 — Stone Devourer: attack
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: a STONE DEVOURER: a mass of living ruins, fused rocks with a glowing violet maw, stone arms.
PALETTE: #100c10 (sombra), #4a3a3a (piedra), #8a6a5a (roca), #c060ff (brillo).
THIS IMAGE: attack, 4 frames, facing RIGHT, side view (the game mirrors it for the left). frames 1–4: attack.
Format: ONE single row of 4 frames (4 columns × 1 row), equal 80×80 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 64 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 3/3 — Devorador de Piedra: golpe recibido y muerte
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: un DEVORADOR DE PIEDRA: masa de ruinas vivientes, rocas fusionadas con una boca violeta brillante, brazos de piedra.
PALETA: #100c10 (sombra), #4a3a3a (piedra), #8a6a5a (roca), #c060ff (brillo).
ESTA IMAGEN: golpe recibido y muerte, 5 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadro 1: golpe recibido; cuadros 2–5: muerte.
Formato: UNA sola fila de 5 cuadros (5 columnas × 1 fila), celdas iguales de 80×80 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈64 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 3/3 — Stone Devourer: hurt and death
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: a STONE DEVOURER: a mass of living ruins, fused rocks with a glowing violet maw, stone arms.
PALETTE: #100c10 (sombra), #4a3a3a (piedra), #8a6a5a (roca), #c060ff (brillo).
THIS IMAGE: hurt and death, 5 frames, facing RIGHT, side view (the game mirrors it for the left). frame 1: hurt; frames 2–5: death.
Format: ONE single row of 5 frames (5 columns × 1 row), equal 80×80 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 64 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

### F-22 · Tejedor del Vacío — `ab_tejedor`

| Campo | Valor |
|---|---|
| Arena | 08 · Abismo |
| Rango | Común / subélite / élite |
| Rol en combate | — |
| Por qué no se reemplazó | Se MANTIENE (se mueve y ataca con arte real). Caminata de 2 cuadros y arte a 1,3–2,4 veces (C-1): redibujar al doble. |
| Paleta | #0a0810 (sombra), #2a1a2a (cuerpo), #c060e0 (violeta), #f0c0ff (hilos) |
| Celda | 80×80 px (personaje ≈64 px de alto) |
| Entrega | `ab_tejedor_1.png` … `ab_tejedor_3.png`, una fila por imagen |

**Descripción visual:** Un TEJEDOR DEL VACÍO: araña grande de patas finas, cuerpo negro con marcas violetas, hilos de energía violeta.

**Planilla de animaciones** (estado × dirección × cuadros):

| Imagen | Estado | Dirección | Cuadros | Bucle |
|---|---|---|---|---|
| 1 | caminar de perfil | perfil derecha (se espeja) | 6 | sí |
| 2 | ataque | perfil derecha (se espeja) | 4 | no |
| 3 | golpe recibido | perfil derecha (se espeja) | 1 | no |
| 3 | muerte | perfil derecha (se espeja) | 4 | no |

```text
PROMPT 1/3 — Tejedor del Vacío: caminar
Hoja de sprites para un videojuego. PERSONAJE: un TEJEDOR DEL VACÍO: araña grande de patas finas, cuerpo negro con marcas violetas, hilos de energía violeta.
PALETA: #0a0810 (sombra), #2a1a2a (cuerpo), #c060e0 (violeta), #f0c0ff (hilos).
ESTA IMAGEN: caminar, 6 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadros 1–6: caminar de perfil.
Formato: UNA sola fila de 6 cuadros (6 columnas × 1 fila), celdas iguales de 80×80 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈64 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 1/3 — Void Weaver: walk
Sprite sheet for a video game. CHARACTER: a VOID WEAVER: a large thin-legged spider, black body with violet markings, strands of violet energy.
PALETTE: #0a0810 (sombra), #2a1a2a (cuerpo), #c060e0 (violeta), #f0c0ff (hilos).
THIS IMAGE: walk, 6 frames, facing RIGHT, side view (the game mirrors it for the left). frames 1–6: side walk.
Format: ONE single row of 6 frames (6 columns × 1 row), equal 80×80 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 64 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 2/3 — Tejedor del Vacío: ataque
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: un TEJEDOR DEL VACÍO: araña grande de patas finas, cuerpo negro con marcas violetas, hilos de energía violeta.
PALETA: #0a0810 (sombra), #2a1a2a (cuerpo), #c060e0 (violeta), #f0c0ff (hilos).
ESTA IMAGEN: ataque, 4 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadros 1–4: ataque.
Formato: UNA sola fila de 4 cuadros (4 columnas × 1 fila), celdas iguales de 80×80 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈64 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 2/3 — Void Weaver: attack
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: a VOID WEAVER: a large thin-legged spider, black body with violet markings, strands of violet energy.
PALETTE: #0a0810 (sombra), #2a1a2a (cuerpo), #c060e0 (violeta), #f0c0ff (hilos).
THIS IMAGE: attack, 4 frames, facing RIGHT, side view (the game mirrors it for the left). frames 1–4: attack.
Format: ONE single row of 4 frames (4 columns × 1 row), equal 80×80 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 64 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

```text
PROMPT 3/3 — Tejedor del Vacío: golpe recibido y muerte
Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros.
Hoja de sprites para un videojuego. PERSONAJE: un TEJEDOR DEL VACÍO: araña grande de patas finas, cuerpo negro con marcas violetas, hilos de energía violeta.
PALETA: #0a0810 (sombra), #2a1a2a (cuerpo), #c060e0 (violeta), #f0c0ff (hilos).
ESTA IMAGEN: golpe recibido y muerte, 5 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadro 1: golpe recibido; cuadros 2–5: muerte.
Formato: UNA sola fila de 5 cuadros (5 columnas × 1 fila), celdas iguales de 80×80 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈64 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 3/3 — Void Weaver: hurt and death
Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame.
Sprite sheet for a video game. CHARACTER: a VOID WEAVER: a large thin-legged spider, black body with violet markings, strands of violet energy.
PALETTE: #0a0810 (sombra), #2a1a2a (cuerpo), #c060e0 (violeta), #f0c0ff (hilos).
THIS IMAGE: hurt and death, 5 frames, facing RIGHT, side view (the game mirrors it for the left). frame 1: hurt; frames 2–5: death.
Format: ONE single row of 5 frames (5 columns × 1 row), equal 80×80 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 64 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

### F-23 · Escorpión Gigante — `escorpion_gigante`

| Campo | Valor |
|---|---|
| Arena | 07 · Laberinto |
| Rango | Común |
| Rol en combate | Cuerpo a cuerpo rápido en grupo. |
| Por qué no se reemplazó | Se MANTIENE (tiene caminar y ataque). Arte con ruido y sin golpe ni muerte (I-5). |
| Paleta | #1e140a (sombra), #8a6a2e (caparazón), #c99a4a (arena), #e0c070 (claro), #7ae060 (veneno) |
| Celda | 64×56 px (personaje ≈40 px de alto) |
| Entrega | `escorpion_gigante_1.png` … `escorpion_gigante_1.png`, una fila por imagen |

**Descripción visual:** Un ESCORPIÓN GIGANTE del desierto: caparazón color arena y ámbar, pinzas grandes, cola arqueada con aguijón que gotea veneno verde.

**Planilla de animaciones** (estado × dirección × cuadros):

| Imagen | Estado | Dirección | Cuadros | Bucle |
|---|---|---|---|---|
| 1 | golpe recibido | perfil derecha (se espeja) | 1 | no |
| 1 | muerte: se da vuelta, patas al aire | perfil derecha (se espeja) | 3 | no |

```text
PROMPT 1/1 — Escorpión Gigante: golpe recibido y muerte
Hoja de sprites para un videojuego. PERSONAJE: un ESCORPIÓN GIGANTE del desierto: caparazón color arena y ámbar, pinzas grandes, cola arqueada con aguijón que gotea veneno verde.
PALETA: #1e140a (sombra), #8a6a2e (caparazón), #c99a4a (arena), #e0c070 (claro), #7ae060 (veneno).
ESTA IMAGEN: golpe recibido y muerte, 4 cuadros, mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda). cuadro 1: golpe recibido; cuadros 2–4: muerte: se da vuelta, patas al aire.
Formato: UNA sola fila de 4 cuadros (4 columnas × 1 fila), celdas iguales de 64×56 px separadas por 1 px. Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). El personaje tiene el MISMO tamaño en todos los cuadros (≈40 px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.
Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).
```

<details><summary>English</summary>

```text
PROMPT 1/1 — Giant Scorpion: hurt and death
Sprite sheet for a video game. CHARACTER: a GIANT desert SCORPION: sand and amber carapace, large pincers, an arched tail with a stinger dripping green venom.
PALETTE: #1e140a (sombra), #8a6a2e (caparazón), #c99a4a (arena), #e0c070 (claro), #7ae060 (veneno).
THIS IMAGE: hurt and death, 4 frames, facing RIGHT, side view (the game mirrors it for the left). frame 1: hurt; frames 2–4: death: flips over, legs in the air.
Format: ONE single row of 4 frames (4 columns × 1 row), equal 64×56 px cells with a 1 px gap. Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). The character is the SAME size in every frame (about 40 px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.
Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).
```

</details>

---

Generado para la tarea T10 (playtest). Fuente de los datos: `js/data/body-swaps.js`, `tools/art/enemy_coverage.js`,
`LA_HORDA_MISSING_ASSETS.md` (sección "Actualización S5"), el Códice (`js/data/codex-content.js`) y la biblia de lore
(`docs/lore/LA_HORDA_LORE_BIBLE.md`).
