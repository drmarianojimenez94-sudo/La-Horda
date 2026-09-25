# VISUAL_ART_REWORK — Consistencia visual V1

**Dirección de arte oficial: MODERN RETRO DARK FANTASY PIXEL ART.**
Retro en la representación (pixel art 2D, contorno oscuro, alfa nítido, paleta contenida);
moderno en animación, VFX, iluminación, telegraphs y feedback. Los VFX pueden ser más fluidos
que los personajes (glow, partículas, estelas), el personaje no cambia de diseño entre cuadros.

Cómo se revisó: una hoja de contacto con los 10 campeones × 13 estados (idle, caminar de
lado/abajo/arriba, ataque, dos lanzamientos, daño, ulti, forma demoníaca, muerte) dibujados por
el mismo código del juego y a la escala real del iPhone, más 22 enemigos/jefes × 5 estados
(idle, caminar, ataque, golpe leve y fuerte).

---

## Reglas del lenguaje visual (para arte nuevo)

| Regla | Valor |
|---|---|
| Altura en pantalla de un campeón | ≈ 66–70 unidades de mundo (el juego escala cada set a eso) |
| Alfa | 0 o 255, sin bordes semitransparentes (se ven borrosos al escalar) |
| Contorno | 1 px oscuro (el color vecino oscurecido, casi negro), en todo el roster |
| Fondo | ninguno: sin halo del fondo original, sin agujeros dentro del cuerpo |
| Recorte | el personaje completo dentro del cuadro: sin cortes rectos, sin pedazos del cuadro vecino, sin líneas de grilla ni texto |
| Diseño entre animaciones | misma silueta, ropa, arma, colores y proporciones en idle/walk/attack/cast/hit/death/ulti |
| Dibujo | vecino más cercano siempre (el juego ya lo garantiza, ver `t_camera.js`) |
| VFX | pueden tener glow y suavidad; van en capas propias, no pintados dentro del cuerpo |

Verificación automática de los sprites normalizados: `python3 tools/art/normalize_sprites.py --check`.

---

## A — FIX AUTOMÁTICO SEGURO (corregido)

| Qué | Dónde | Arreglo |
|---|---|---|
| Sprites borrosos por suavizado | todo el juego | el contexto del canvas volvía a suavizar al redimensionar; ahora siempre vecino más cercano |
| Jefes/subjefes casi blancos toda la pelea | destello de golpe (Minotauro, Jinete, Mago, Leviatán, Kraken, Guardián…) | destello tenue para jefes/subjefes (`animfx.js`) |
| Musashi: ataque básico con medio cuerpo | `musashi/basic1-3.png` (cortados por el borde) | el tajo usa los cuadros completos `basic4`, `basic5` |
| Nigromante: ataque básico cortado + línea de grilla | `nigromante/basic1-4.png` | usa `basic5` (único completo) recortado al cuerpo, sin el proyectil pintado |
| Soporte: el lanzamiento cambiaba de dibujo | `soporte/atlas.png` cuadros 3–5 | lanzar usa sus propios cuadros de reposo/caminata + el efecto de lanzamiento |

## B — NORMALIZABLE (corregido con `tools/art/normalize_sprites.py`, mismo dibujo)

| Campeón | Problema | Arreglo |
|---|---|---|
| Nigromante (+ demonio, gólem, esqueletos) | halo gris/blanco del fondo alrededor de toda la silueta; bordes semitransparentes | halo quitado, alfa nítido, contorno oscuro de 1 px |
| Sylva (+ lobo) | agujeros dentro del cuerpo ("comida por polillas"), pedazos del cuadro vecino en el ataque | agujeros rellenados con el color vecino, fragmentos quitados, contorno |
| Musashi | agujeros en piernas/kimono, píxeles sueltos sobre la cabeza, fragmentos del tajo | idem |
| Segador | salpicado claro en el borde, alfa semitransparente | halo quitado, alfa nítido, contorno |
| Axiom | sin contorno (no coincidía con el resto), píxeles sueltos | contorno + fragmentos. **Sin** quitar halo: su capa blanca/plateada es diseño |

Los originales quedan en el historial de git (commit anterior a "Visual consistency V1").

---

## C — REQUIERE ARTE NUEVO (se mantiene el original por ahora)

No se rediseñó ningún campeón. Estos puntos necesitan que un artista entregue cuadros nuevos
**con el mismo diseño aprobado**:

| # | Personaje | Animación / cuadro | Problema |
|---|---|---|---|
| C1 | **Roster (decisión de dirección)** | todos | Conviven **dos familias de proporción**: chibi (Tanque, Asesino, Mago, Soporte: cabeza grande) y heroica/realista (Segador, Axiom, Profeta, Musashi, Sylva, Nigromante). Ambas quedan ahora con el mismo contorno/alfa/escala, pero la proporción no se puede unificar sin redibujar. **Recomendación:** elegir una familia para todo arte futuro. |
| C2 | Nigromante | `idle.png`, `idleA1`, `walk1/2`, `walkA*` | la capa está **cortada en línea recta** por el borde derecho del recorte original |
| C3 | Nigromante | `basic1-4.png` | cortados por el borde izquierdo (hoy no se usan: el ataque usa `basic5`) |
| C4 | Nigromante | `castSkeleton1-3`, `castGolem1-2` | el cuadro muestra **la invocación en lugar del Nigromante** (el cuerpo desaparece mientras invoca) |
| C5 | Nigromante | pintado general | render más "ilustración" (sombreado suave, mucho detalle) que el resto; es el más alejado del pixel art |
| C6 | Soporte | atlas cuadros 3–5 (lanzar) | otro dibujo (cara, bastón, halo blanco). Falta el lanzamiento en el estilo de su idle |
| C7 | Soporte, Tanque, Asesino | daño y muerte | no tienen cuadros propios (usan reposo/caída genérica) |
| C8 | Musashi | `basic1-3.png` | medio cuerpo cortado (hoy no se usan) |
| C9 | Musashi | `thousand1-4`, `ronin*` | el tajo/VFX viene pintado dentro del cuadro con borde recto (debería ser capa de VFX aparte) |
| C10 | Axiom | `cast_*` | el escudo azul está cortado por el borde derecho |
| C11 | Axiom, Segador | `death_*` | el cuerpo tendido se ve recortado en triángulo |
| C12 | Profeta | caminata vs idle | la caminata usa una pose más chica/distinta; mismo diseño pero menos detalle |
| C13 | Kraken Joven | todos | salpicado rosa/blanco de alto contraste en el borde, más "ruidoso" que el resto de los enemigos |

Prioridad sugerida: C2 y C4 (Nigromante, muy visibles), C6 (Soporte), después C1 (decisión).
