# LA HORDA — ART BIBLE

Especificación operativa del lenguaje visual del juego. Para humanos y para agentes de IA
futuros. Si un cambio de arte no está cubierto acá, no se integra sin pasar antes por el
**VISUAL GATE** (sección 8).

## 1. Identidad visual oficial

**MODERN DARK-FANTASY PIXEL ART.** Retro en la representación, moderno en todo lo demás
(animación, VFX, habilidades, lectura en móvil). El juego debe leerse como pixel art diseñado
así a propósito, no como una ilustración reducida a PNG chico.

**SÍ:** pixel art construido como pixel art · siluetas claras · detalle controlado · animación y
VFX modernos · lectura inmediata en móvil.
**NO:** ilustración anime reducida · dibujo HD convertido a PNG chico · personajes
semi-realistas · mezcla de densidades de píxel · un campeón que parece de otro juego al lado de
otro · filtros que simulan pixel art sobre una ilustración que no lo es.

## 2. Master Reference: el Caballero (Tanque)

`assets/sprites/champions/tanque/atlas.png` (el mismo asset que ya juega en el rol Tanque) es la
**referencia oficial**. Define la gramática — no hay que copiar su armadura ni convertir a todos
en caballeros, sino que **todos deben parecer creados por el mismo equipo, para el mismo juego**:

| Rasgo | Regla (según el Caballero) |
|---|---|
| Proporción | chibi: cabeza grande (~40–45% de la altura total), cuerpo corto y simple |
| Altura en pantalla | ~66–70 unidades de mundo a escala normal (ver `VIEW_WORLD_SHORT`, `js/core/canvas.js`) |
| Contorno | 1 px oscuro, uniforme, en todo el roster |
| Sombreado | 2–3 tonos por color, sin degradados suaves ni pintura "airbrush" |
| Paleta | acotada por personaje (4–6 colores principales + contorno) |
| Alfa | nítido: 0 o 255, sin bordes semitransparentes |
| Dirección | 4 direcciones (abajo/derecha/arriba + espejo para izquierda), un frame de ataque propio por dirección |
| Formato técnico | un atlas PNG por campeón, grilla de frames, animaciones `idle_*`/`walk_*`/`attack_*` (ver `DIR_ATLASES`, `js/rendering/champion-sprites.js`) |

## 3. Agresividad sin romper el estilo

La oscuridad/agresividad de un campeón sale de su **silueta, postura, arma, armadura y
animación** — nunca de cambiar de familia artística ni de subir el realismo/resolución. Un
berserker se ve más brutal con hombros más anchos, un arma más grande y un tajo más violento,
manteniendo la misma densidad de píxel y el mismo contorno que el Caballero.

## 4. Personalidad por campeón

Cada campeón debe seguir siendo inmediatamente distinguible por **silueta y color**, no por
cambiar de técnica de dibujo:

| Campeón | Personalidad (mantenida en el redraw si aplica) |
|---|---|
| Tanque | heroico, sólido, protector — referencia |
| Guerrero (Asesino) | ágil, encapuchado, sigiloso |
| Mago | arcano, elegante, sombrero puntiagudo |
| Soporte | luminosa, protectora, báculo con brillo |
| Segador Olvidado | brutal, pesado, agresivo — más sangre/filo, no más realismo |
| Axiom | extraño, sobrenatural, geométrico |
| La Profeta | oscura, encorvada, inquietante |
| Musashi | disciplinado, silencioso, letal |
| Sylva (Cazadora) | ágil, natural, del bosque |
| Nigromante | oscuro, encorvado, inquietante |

## 5. Consistencia interna del personaje

Un mismo personaje **no puede cambiar de diseño** entre `idle / walk / run / attack / cast / hit
/ death / ultimate`. Se revisa: rostro, pelo, ropa, armadura, arma, colores, proporciones,
escala, densidad de píxel. Las animaciones pueden ser fluidas y modernas; el diseño no cambia.

## 6. Reglas técnicas de píxel

- Vecino más cercano siempre (el juego ya lo garantiza globalmente, ver `t_camera.js`); nunca
  suavizado en sprites de pixel art.
- Sin halos claros/grises del fondo original alrededor de la silueta.
- Sin fondos residuales, píxeles semitransparentes accidentales ni bordes de recorte.
- Sin contaminación de un frame vecino (recortes que traen un pedazo de otro personaje/frame).
- Transparencia limpia: alfa 0 o 255.

## 7. VFX

Los VFX **no** necesitan la misma densidad de píxel que los personajes: *pixel characters +
modern VFX* es la identidad moderna del juego. Permitido: glow, partículas, iluminación,
estelas, distorsión, flashes, telegraphs. Los VFX van en capas propias (partículas, sprites de
efecto) — nunca pintados dentro del cuerpo del personaje, y nunca deben cambiar el diseño del
personaje mientras están activos.

## 8. LA HORDA VISUAL GATE

**Todo asset nuevo se clasifica antes de integrarse.** Regla permanente:

> **BEFORE INTEGRATING ANY NEW VISUAL ASSET, RUN THE LA HORDA VISUAL GATE.**
> **IF STATUS != PASS, DO NOT MERGE THE ASSET INTO THE PRODUCTION VISUAL SET.**

| Status | Significa | Acción |
|---|---|---|
| **PASS** | Coincide con la Art Bible | Integrar |
| **FIX** | Problema técnico corregible sin rediseñar (halo, alfa, escala, pixel snapping, frames desalineados, paleta/contraste menor) | Corregir con `tools/art/scan_sprites.py`, validar de nuevo |
| **REDRAW REQUIRED** | Válido conceptualmente pero de otra dirección artística (anime, semi-realista, densidad de píxel incompatible, proporciones incompatibles, el diseño cambia entre frames) | **No** esconder con un filtro. **No** reemplazar automáticamente. Documentar en `docs/ART_REPLACEMENT_QUEUE.md` y esperar el arte nuevo |
| **REJECT** | Defectuoso o incorrecto conceptualmente | No integrar; conservar el asset anterior si existe |

**Regla de seguridad — sin excepciones:** ante un REDRAW, la IA no rediseña sola. No cambia
identidad, ropa, arma, colores principales, temática, silueta característica ni habilidades. Se
documenta qué hace falta; el arte nuevo lo produce una persona usando el diseño existente como
canon, y el recorte/integración técnica sí la hace la IA después.

**Herramientas del Gate:**
- `python3 tools/art/scan_sprites.py [--dir carpeta] [--apply]` — escaneo técnico (halo, alfa,
  fragmentos) sobre `assets/sprites/`. Solo detecta defectos técnicos, nunca decide estilo.
- **Roster Visual Test** — hoja de contacto de todos los campeones/enemigos importantes, misma
  escala/fondo/iluminación, sin VFX, para comparar contra el Master Reference. Pregunta
  obligatoria: *¿parecen personajes distintos del MISMO juego?* Si no, identificar el outlier —
  nunca degradar los assets buenos para igualarlos al malo. Reproducible con
  `node tools/art/roster_visual_test.js` (10 campeones) y `node tools/art/boss_visual_test.js`
  (enemigos/jefes), sirviendo el repo con `python3 -m http.server 8750` (ver cabecera de cada
  script para `REGRESSION_BASE_URL`).

## 9. Enemigos, élites y jefes

Misma gramática, pero **se permite más escala y detalle** cuanto más importante la entidad:

- Comunes: densidad de píxel simple, cercana a la de los campeones chibi.
- Élites/subjefes: algo más de detalle y tamaño.
- Jefes: pueden ser mucho más grandes, con más detalle, animaciones más complejas y VFX más
  espectaculares — mientras seamos capaces de decir que pertenecen al mismo universo visual (no
  a otro juego). Esto es intencional y ya está así en varios jefes/élites del juego (ver el
  audit).

## 10. Naming y organización

- `assets/sprites/champions/<clave>/` — un campeón por carpeta; `atlas.png` para el formato de
  grilla (`DIR_ATLASES`), o archivos sueltos por pose para el formato "sprite real" (`idle.png`,
  `walk1.png`, `atk1.png`, ...).
- `assets/sprites/enemies/<arena>/<tipo>/` y `assets/sprites/bosses/<arena>/<tipo>/` — mismo
  criterio, agrupado por arena.
- Un asset nuevo mantiene el nombre técnico (`ENEMY_BASE`/`CLASSES`) de la entidad que reemplaza.

## 11. Referencia de estilo enviada por el equipo

Además del Caballero, se recibieron 3 referencias que muestran el rango aceptable para
enemigos/jefes de distinta jerarquía (no son máster references formales, son ejemplos de
dirección): un mago de hielo chibi (mismo lenguaje que el Caballero, para casters comunes), un
espadachín oscuro y ensangrentado (dirección aceptable para un enemigo/subjefe agresivo — más
grande y detallado que un común, sin dejar de ser pixel art), y "Diablo Prime" (jefe final:
mucha más escala/detalle/VFX, permitido en la sección 9).
