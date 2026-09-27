# LA HORDA — MINAS PROFUNDAS · ASSETS FALTANTES

Las Minas Profundas (Arena 09) se pueden **jugar de punta a punta usando solo el arte de las 4 hojas oficiales**
(`art-source/minas/{enemigos1,enemigos2,jefes,mapa}.png`), recortado con `tools/art/minas/extract.py`.
No hay placeholders feos:
- Cuando una hoja no alcanzaba, se usó la pieza más cercana de la misma hoja (por ejemplo, el brasero usa la
  lámpara que se apaga).
- Si tampoco había pieza, se dibujó por código con la paleta de la hoja: el Portal Infernal, las cadenas de
  Cerbero, la jaula del montacargas y el arco de la puerta del Umbral.
- Los pisos por sector se generan con `tools/art/minas/floor.py`: piedras Voronoi sin costuras, con las paletas
  del mapa.

Esta lista es lo que **falta producir** para que la arena llegue al nivel final. Cada entrada trae su prompt listo.
Estilo común a todos los prompts (el de las hojas):
*modern dark fantasy pixel art, 16-bit, crisp pixels, no antialiasing, transparent background (real PNG alpha);
paleta roca marrón/gris fría, luz de farol ámbar, cristal azul/violeta, brasas y fuego infernal rojo-naranja.*

**Formato de entrega** (así el recortador lo toma solo):
- PNG con alfa real, sin fondo a cuadros.
- Cuadros de igual tamaño en una fila, con 1 px de separación.
- Sin texto ni etiquetas dentro de la grilla.
- Los pies o la base de cada sprite sobre la misma línea.

Campos: **ID · Estado · Dónde se usa · Tamaño / frames · Prioridad**. Estados posibles:
- **FALTA:** no existe.
- **SUSTITUTO:** hoy se usa otra pieza o un dibujo por código.
- **PARCIAL:** existe pero incompleto.

Prioridad:
- **P0:** se ve en todas las partidas o en el cierre de la arena.
- **P1:** mejora clara de lectura o de acabado.

---

## P0 — lo que más se nota

| ID | Estado | Dónde se usa | Tamaño / frames | Prioridad |
|---|---|---|---|---|
| MN-A01 Portal Infernal · bucle abierto | SUSTITUTO (óvalo de fuego vectorial en `mn-render.js`) | cierre de la arena: objetivo "ATRAVIESA EL UMBRAL" | 128×192 · 8 cuadros en bucle | P0 |
| MN-A02 Portal Infernal · apertura | SUSTITUTO (el óvalo crece) | los 3,2 s tras la muerte de Cerbero | 128×192 · 10 cuadros | P0 |
| MN-A03 Portal Infernal · cruce (destello al atravesar) | FALTA | el instante de la victoria | 192×192 · 8 cuadros | P0 |
| MN-A04 Puerta del Umbral · cerrada / quebrándose / abierta | SUSTITUTO (arco dibujado + `puerta_mina` recoloreada) | fondo del sector Umbral | 320×224 · 1 + 6 + 1 cuadros | P0 |
| MN-A05 Cadenas de Cerbero · eslabón, ancla y rotura | SUSTITUTO (dibujadas por código) | Acto 1 de Cerbero (restricción) y paso al Acto 2 | eslabón 16×32 (tile vertical) · ancla 64×64 · rotura 96×96 × 6 cuadros | P0 |
| MN-A06 Lanzallamas de Cerbero · cono | PARCIAL (se estira `mnFlame` de la hoja) | ataque principal del jefe | 320×128 · inicio 3 + bucle 6 + fin 3 cuadros, apuntando a la derecha | P0 |
| MN-A07 Brasero · encendido / parpadeo / apagado | SUSTITUTO (`lampara_apaga_*`) | fuente de luz de los sectores profundos | 48×64 · 4 + 4 + 1 cuadros | P0 |
| MN-A08 Farol · parpadeo | PARCIAL (1 cuadro + oscurecido por código) | fuente de luz más común | 48×64 · 4 cuadros en bucle + 1 apagado | P0 |
| MN-A09 Masa de roca · autotile | PARCIAL (`tex_roca` se repite y parece ladrillo) | paredes y bloques de todos los sectores | 16 tiles de 32×32 (bordes, esquinas y relleno) · 3 paletas (marrón, gris-azul, basalto con brasas) | P0 |

**MN-A01 / A02 / A03 — Portal Infernal**
> Pixel art, modern dark fantasy, 16-bit, crisp pixels, transparent background. A vertical oval hellgate portal carved
> into black basalt: incandescent orange-yellow rim with licking flame tongues, inner vortex spiralling inward from deep
> red to a pitch-black core, ember sparks rising. (A01) seamless 8-frame idle loop, 128×192 cells. (A02) 10-frame opening
> sequence from a thin glowing crack to the full oval. (A03) 8-frame "crossing" flash: the vortex flares white-orange
> and collapses inward, 192×192 cells. 1 px gap, no text, no background.

**MN-A04 — Puerta del Umbral**
> Pixel art, modern dark fantasy, 16-bit, transparent background. A massive two-leaf iron-and-stone mine gate set in a
> basalt arch carved with glowing hell runes, chains across it. States: closed (1 frame), breaking open with cracks of
> red light and falling debris (6 frames), fully open with a hellish glow behind (1 frame). 320×224 cells, front view,
> 1 px gap, no text.

**MN-A05 — Cadenas de Cerbero**
> Pixel art, 16-bit, transparent background. Heavy rusted iron chain for a giant hellhound: (a) one vertical chain link
> tile 16×32 that tiles seamlessly; (b) a chain anchor bolted into a cracked stone floor, 64×64; (c) a chain snapping
> apart with sparks and red-hot fragments, 6 frames of 96×96. No text.

**MN-A06 — Lanzallamas de Cerbero**
> Pixel art, 16-bit, crisp pixels, transparent background. A wide cone of hellfire breath spreading to the right from a
> point on the left edge: bright yellow-white core, orange body, dark red smoky edges. 3 start frames (ignition),
> 6 seamless loop frames, 3 end frames (sputter out). 320×128 cells, 1 px gap, no text.

**MN-A07 / A08 — Fuentes de luz**
> Pixel art, 16-bit, transparent background, 48×64 cells, same baseline. (A07) an iron mine brazier on three legs:
> burning (4-frame loop), flickering and weak (4 frames), extinguished with a thin smoke wisp (1 frame). (A08) a hanging
> miner's oil lantern on a wooden post: warm amber flame, 4-frame flicker loop, plus 1 extinguished frame (dark glass).
> No text.

**MN-A09 — Autotile de roca**
> Pixel art, 16-bit, top-down 3/4 view, seamless. A 16-tile autotile set (32×32 each) for solid cave rock masses: fill,
> 4 edges, 4 outer corners, 4 inner corners, 3 variations of fill. Irregular natural rock, no bricks, no grid pattern,
> darker at the base, lighter at the top edge. Deliver 3 palettes: warm brown (upper mine), cold blue-grey (crystal
> veins), black basalt with ember cracks (depths). No text.

---

## P1 — acabado y lectura

| ID | Estado | Dónde se usa | Tamaño / frames | Prioridad |
|---|---|---|---|---|
| MN-B01 Cerbero · caminata por dirección | PARCIAL (solo perfil) | jefe | 192×160 · 6 cuadros × 3 vistas (frente, perfil, espalda) | P1 |
| MN-B02 Titán de Piedra · caminata por dirección | PARCIAL (solo perfil) | subjefe | 160×160 · 6 cuadros × 3 vistas | P1 |
| MN-B03 Enemigos comunes · caminata por dirección | PARCIAL (perfil) | Esclavo, Insecto, Acechador, Minero, Escupidor, Consumidor | 64×64 (Minero 96×96) · 6 cuadros × 3 vistas | P1 |
| MN-B04 Antorcha personal del guardián | SUSTITUTO (solo el círculo de luz) | cada guardián lleva luz propia | 16×32 · 4 cuadros en bucle + 1 "sofocada" (Escupidor) | P1 |
| MN-B05 Jaula del montacargas + cable | SUSTITUTO (dibujada por código) | entrada de cada sector (descenso) | 96×112 · 1 cuadro + 4 cuadros de bajada | P1 |
| MN-B06 Escombros del Titán | SUSTITUTO (roca de la hoja recortada) | derrumbes del Titán (bloquean y cubren) | 3 variantes de 64×48 | P1 |
| MN-B07 Pisos por sector | SUSTITUTO (procedurales `tex_piso_*`) | 6 sectores | 64×64 sin costuras × 6 (superior, galerías, vetas, corrompida, profundidades, umbral) | P1 |
| MN-B08 Íconos del HUD de luz | SUSTITUTO (emoji 🔥 / 🌑) | panel "Luces N/M · A OSCURAS" | 16×16 · encendida, parpadeo, apagada, a oscuras | P1 |
| MN-B09 Retrato de Cerbero para carteles | PARCIAL (recorte del cuerpo) | cartel de jefe y Códice | 96×96 · 1 quieto + 1 rugiendo | P1 |
| MN-B10 Carteles de sector | FALTA (texto sobre fondo) | cartel del descenso con profundidad | 480×96 · 6 placas de madera o hierro con el nombre del sector | P1 |

**MN-B01 / B02 / B03 — ciclos por dirección** (plantilla; reemplazar `<NOMBRE>` y `<DESCRIPCIÓN>`)
> Pixel art sprite sheet, modern dark fantasy, 16-bit, crisp pixels, no antialiasing, transparent background.
> `<NOMBRE>`: `<DESCRIPCIÓN tomada de la hoja; p. ej. "Cerbero, three-headed hellhound, molten cracks in black hide, chained collars">`.
> Walk cycle, 6 frames per row, 3 rows: front, right side, back. Same size in every frame, feet on the same
> baseline, `<CELDA>` cells, 1 px gap, no text, no grid lines.

**MN-B04 — Antorcha personal**
> Pixel art, 16-bit, transparent background. A small hand-held wooden torch with a bright flame, 16×32 cells: 4-frame
> flicker loop, plus 1 frame "smothered" (tiny ember and dark smoke). No text.

**MN-B05 — Jaula del montacargas**
> Pixel art, 16-bit, top-down 3/4 view, transparent background. A rusty iron mine elevator cage hanging from a thick
> cable with a pulley, 96×112. Plus 4 frames of the cage descending (moving down out of frame). No text.

**MN-B06 — Escombros**
> Pixel art, 16-bit, top-down 3/4, transparent background. Three piles of freshly collapsed cave rubble (boulders +
> dust), 64×48 each, warm brown rock. No text.

**MN-B07 — Pisos**
> Pixel art, 16-bit, top-down, seamless tileable 64×64 cave floor of irregular flat stones with dark joints. Six palettes:
> warm brown; neutral grey; blue-grey with blue crystal specks; violet with purple glowing specks; dark basalt with
> faint ember joints; blood-red basalt with bright ember joints. No text.

**MN-B08 — Íconos de luz**
> Pixel art, 16×16, transparent background: lit flame, weak flickering flame, extinguished wick with smoke, closed eye
> in darkness. Crisp, readable at 1×. No text.

**MN-B09 — Retrato de Cerbero**
> Pixel art portrait, 96×96, modern dark fantasy: the three heads of Cerbero, molten eyes, chains. Frame 1 idle,
> frame 2 roaring. Transparent background, no text.

**MN-B10 — Carteles de sector**
> Pixel art, 16-bit, 480×96 each, transparent background: six weathered mine signs (wood planks with iron bands; the
> last ones blackened and cracked with ember glow) with an empty center for text. No letters painted in.

---

## Audio (ganchos listos, sonido sintetizado hoy)

`js/arenas/minas/mn-arena.js` registra 32 ganchos en `ARENA_SFX`. Hoy suenan con el sintetizador del juego;
faltan archivos reales. Son todos P1:

| Grupo | Ganchos |
|---|---|
| Luz | `mnFlicker`, `mnExtinguish`, `mnRelight`, `mnSnuff` |
| Descenso | `mnElevator`, `mnRumble` |
| Enemigos | `mnChain`, `mnLeap`, `mnGrowl`, `mnGrunt`, `mnThrow`, `mnSpit`, `mnSpitHit`, `mnShard`, `mnRock` |
| Devoraluz | `mnDevour`, `mnDevHurt`, `mnDevEat`, `mnDevRoar`, `mnDevDeath`, `mnDevBreath` |
| Cerbero | `mnChains`, `mnTripleRoar`, `mnChainBreak`, `mnInhale`, `mnFlame`, `mnHowl`, `mnBite`, `mnCerbDeath` |
| Portal | `mnPortalOpen`, `mnPortalHum` (bucle), `mnPortalEnter` |

Formato: OGG/MP3 mono, 44,1 kHz, −14 LUFS, sin silencio al principio. Los bucles (`mnPortalHum`) deben
cerrar sin costura.
