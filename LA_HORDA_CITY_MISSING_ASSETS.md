# LA HORDA — CIUDAD MALDITA · ASSETS FALTANTES

La Ciudad Maldita (Arena 01) es **jugable de punta a punta usando solamente el arte de las 4 hojas oficiales**
(`art-source/ciudad/`), recortado con `tools/art/ciudad/extract.py`. No hay placeholders feos: donde una hoja
no alcanzaba, se usó la pieza más cercana de la misma hoja o se dibujó por código con la paleta de la hoja
(por ejemplo, techos y paredes con patrones de sus texturas).

Esta lista es lo que **falta producir** para que la arena llegue al nivel final. Cada entrada tiene un prompt
listo para generar. El estilo de todos los prompts es el mismo que el de las hojas:
*modern dark fantasy pixel art, 16-bit, crisp pixels, sin antialiasing, fondo transparente (PNG con alfa),
paleta rojo sangre / púrpura / piedra fría / luz de farol ámbar.*

**Formato de entrega (para que el recortador lo tome solo):** PNG con alfa real (sin fondo a cuadros),
cuadros de igual tamaño en fila, sin texto ni etiquetas dentro de la grilla, 1 px de separación.

Campos de cada entrada: **ID · Categoría · Estado · Dónde se usa · Tamaño / frames · Prioridad · Prompt**.
Estados: **FALTA** (no existe), **PARCIAL** (existe pero incompleto), **LIMPIEZA** (existe pero hay que limpiarlo),
**REFERENCIA** (la hoja lo muestra solo como referencia, no como sprite usable).

---

## 1. PERSONAJES — ciclos de animación completos

Las grillas de 8 direcciones de las hojas traen **un solo cuadro por estado y dirección**. Por eso hoy la
caminata alterna 2 cuadros (caminar + quieto). Los paneles de ataques sí traen secuencias reales y ya se usan.

| ID | Estado | Dónde se usa | Tamaño / frames | Prioridad |
|---|---|---|---|---|
| CM-A01 Saqueador · caminata | PARCIAL | enemigo común (niveles 1-10) | 48×48 · 8 cuadros × 3 vistas (frente, perfil, espalda) | ALTA |
| CM-A02 Raptor · caminata y carrera con civil | PARCIAL | secuestrador | 48×48 · 8 cuadros × 3 vistas | ALTA |
| CM-A03 Verdugo · caminata | PARCIAL | asedio | 72×72 · 8 cuadros × 3 vistas | ALTA |
| CM-A04 Plañidera · flotar | PARCIAL | a distancia | 48×72 · 8 cuadros × 3 vistas | MEDIA |
| CM-A05 Acechante · correr | PARCIAL | tejados | 48×48 · 8 cuadros × 3 vistas | MEDIA |
| CM-A06 Campanero · caminata | PARCIAL | soporte | 72×72 · 8 cuadros × 3 vistas | MEDIA |
| CM-A07 Sectario · caminata | PARCIAL | común | 48×48 · 8 cuadros × 3 vistas | MEDIA |
| CM-A08 Perro · correr | PARCIAL | enjambre | 48×48 · 8 cuadros × 3 vistas | MEDIA |
| CM-A09 Espectro · flotar | PARCIAL | fantasma | 48×48 · 8 cuadros × 3 vistas | BAJA |
| CM-A10 Maestro · caminata | PARCIAL | subjefe nivel 9 | 48×72 · 8 cuadros × 3 vistas | ALTA |
| CM-A11 Tramoyista · caminata | PARCIAL | subjefe nivel 9 | 72×96 · 8 cuadros × 3 vistas | ALTA |
| CM-A12 Dama del Telón · caminata | PARCIAL | subjefe nivel 9 | 48×72 · 8 cuadros × 3 vistas | ALTA |
| CM-A13 Presentador fases 1 y 2 · caminata | PARCIAL | jefe final | 72×96 · 8 cuadros × 3 vistas por fase | ALTA |

**Prompt (plantilla; reemplazar `<NOMBRE>` y `<DESCRIPCIÓN>`):**
> Pixel art sprite sheet, modern dark fantasy, 16-bit, crisp pixels, no antialiasing, transparent background.
> `<NOMBRE>`: `<DESCRIPCIÓN tomada de la hoja: p. ej. "saqueador maldito, capucha raída roja, cuchillo oxidado, piel gris">`.
> Walk cycle, 8 frames per row, 3 rows: front view, right side view, back view. Same character size in every frame,
> feet on the same baseline, 48×48 px cells, 1 px gap, no text, no grid lines, no background.

---

## 2. EL PRESENTADOR — forma verdadera (Acto III)

| ID | Estado | Dónde se usa | Tamaño / frames | Prioridad |
|---|---|---|---|---|
| CM-P01 Forma verdadera: quieto / caminata / ataque / lanzamiento / daño | REFERENCIA | Acto III | 128×160 · 6 cuadros por estado, perfil derecho | ALTA |
| CM-P02 Ovación final (canalización 3 s) | FALTA | Acto III | 128×160 · 8 cuadros en bucle | ALTA |
| CM-P03 Retrato para diálogos | FALTA | carteles del jefe | 96×96 · 1 cuadro + 1 hablando | MEDIA |

En la hoja la forma verdadera es un **collage superpuesto entre filas** (no se puede separar en cuadros).
Hoy el Acto III usa la grilla chica de la fase 3 + la secuencia de transformación y la muerte de 12 cuadros.

**Prompt CM-P01:**
> Pixel art boss sprite sheet, modern dark fantasy, 16-bit, crisp pixels, transparent background.
> "El Presentador — true form": a towering showman demon made of torn red velvet curtains, tangled crimson
> tendrils and a cracked porcelain grin under a tall top hat; purple and blood-red palette with gold trim.
> 5 rows (idle, walk, attack, cast, hurt), 6 frames each, right side view, 128×160 px cells, 1 px gap,
> same baseline and scale in every frame, no text, no background.

**Prompt CM-P02:**
> Same character. "Final ovation" channel: arms raised to a phantom audience, curtains flaring, red spotlight
> glow pulsing from the chest, 8-frame seamless loop, 128×160 px cells, transparent background.

---

## 3. CIVILES

| ID | Estado | Dónde se usa | Tamaño / frames | Prioridad |
|---|---|---|---|---|
| CM-C01 Aldeano / mujer / niño · caminata frente y espalda | PARCIAL | escolta (hoy solo perfil) | 32×48 · 8 cuadros × 2 vistas × 3 civiles | ALTA |
| CM-C02 Escondido (agachado, temblando) | FALTA | estado HIDDEN / IDLE con peligro | 32×48 · 4 cuadros × 3 civiles | ALTA |
| CM-C03 Cargado por el Raptor (pose colgando) | FALTA | estado KIDNAPPED (hoy usa "caída") | 32×48 · 4 cuadros × 3 civiles | MEDIA |
| CM-C04 Pánico (brazos arriba, corriendo) | PARCIAL | estado PANIC (hoy usa "correr") | 32×48 · 6 cuadros × 3 civiles | MEDIA |
| CM-C05 Entrando al refugio (de espaldas, se desvanece) | FALTA | estado RESCUED | 32×48 · 6 cuadros × 3 civiles | BAJA |
| CM-C06 Variantes extra (anciano, herrero, monja) | FALTA | variedad en la ciudad | 32×48 · set completo como la hoja | BAJA |

**Prompt CM-C02:**
> Pixel art, modern dark fantasy, 16-bit, crisp pixels, transparent background. Frightened medieval
> villager (`adult man with brown tunic` / `woman with apron and headscarf` / `small boy with blue shirt`)
> crouched and hugging their knees, trembling, 4-frame loop, 32×48 px cells, 1 px gap, no text.

---

## 4. ESCENARIO (vista superior oblicua)

La hoja del mapa es **isométrica y de referencia**: el mapa general no se puede cortar en tiles para una
vista superior. Se usan sus muestras de textura (calle, adoquín, tierra, escombros, techo, pared exterior e
interior, puerta, ventana, muralla) como patrones. Falta un tileset propio para este ángulo de cámara.

| ID | Estado | Dónde se usa | Tamaño / frames | Prioridad |
|---|---|---|---|---|
| CM-T01 Techos de tejas: tile + bordes + cumbrera + chimenea | PARCIAL | todas las casas | tiles 32×32, 9-slice | ALTA |
| CM-T02 Cara de pared exterior con ventanas y puerta abierta | PARCIAL | frente de las casas | tiles 32×64 | ALTA |
| CM-T03 Techo dañado / con agujeros / en llamas (3 estados) | FALTA | estructuras DAÑADA y CRÍTICA | tiles 32×32 por estado | ALTA |
| CM-T04 Ruinas de edificio derrumbado | FALTA | estructura DESTRUIDA | 256×160 · 2 variantes | ALTA |
| CM-T05 Muebles de interior (mesa, cama, alacena, chimenea, alfombra) | FALTA | interiores | 32–64 px, 1 cuadro c/u | MEDIA |
| CM-T06 Refugio / Capilla / Torre de Vigía / Campanario (edificios propios) | FALTA | estructuras | 256×256 c/u · 4 estados | ALTA |
| CM-T07 Puerta de Evacuación (reja arriba / abajo / rota) | PARCIAL | estructura crítica | 340×150 · 3 estados | ALTA |
| CM-T08 Estatua maldita con fuente (vista superior) | PARCIAL | plaza central | 200×220 · 4 cuadros de agua | MEDIA |
| CM-T09 Escenario de la catedral (tablas, telón, reflectores) | FALTA | pelea del Presentador | 900×420 | ALTA |
| CM-T10 Rejilla de cloaca, campana en el piso, farol, barricada | PARCIAL | props de gameplay | 48–96 px | MEDIA |

**Prompt CM-T01 / T02:**
> Top-down 3/4 view pixel art tileset, modern dark fantasy medieval city, 16-bit, crisp pixels.
> Dark red clay roof tiles with ridge line, chimney and eave edges; stone house wall face with lit amber
> windows and an open wooden door. 32×32 tiles (walls 32×64), seamless, 9-slice ready, transparent
> background, cold stone and blood-red palette, no text.

**Prompt CM-T06:**
> Top-down 3/4 view pixel art building, modern dark fantasy: "Refugio" — a barricaded stone hall with a green
> lantern over the door (safe zone). 4 states in a row: intact, damaged (cracks, missing tiles), critical
> (fire on the roof, smoke), destroyed (collapsed ruin). 256×256 px each, transparent background, no text.

**Prompt CM-T09:**
> Top-down 3/4 view pixel art, a grim theater stage in front of a cursed gothic cathedral: dark wooden planks,
> torn red velvet curtains on both sides, footlights and two red spotlights, 900×420 px, transparent background.

---

## 5. EFECTOS (VFX)

| ID | Estado | Dónde se usa | Tamaño / frames | Prioridad |
|---|---|---|---|---|
| CM-V01 Indicador de secuestro (flecha / grillete sobre el Raptor) | FALTA | Raptor con civil | 32×32 · 4 cuadros | MEDIA |
| CM-V02 Destello de rescate (escudo verde que sube) | FALTA | +1 RESCATADO | 64×64 · 8 cuadros | MEDIA |
| CM-V03 Cono de reflector (Marca del espectáculo) | PARCIAL | Presentador / Dama | 128×256 · 6 cuadros | MEDIA |
| CM-V04 Telón a pantalla completa (apagón y final) | FALTA | transiciones del nivel 9 y la muerte del jefe | 960×540 · 12 cuadros | MEDIA |
| CM-V05 Zona segura en el piso (anillo verde con runas) | FALTA | refugios y puerta | 256×180 · 8 cuadros en bucle | BAJA |

**Prompt CM-V04:**
> Pixel art full-screen transition, heavy red velvet theater curtain falling from top to bottom with gold
> fringe, 12 frames, 960×540 px, crisp pixels, transparent background where the curtain has not reached.

---

## 6. INTERFAZ

| ID | Estado | Dónde se usa | Tamaño | Prioridad |
|---|---|---|---|---|
| CM-U01 Íconos: rescatado, perdido, en peligro, te siguen | FALTA (hoy emoji) | panel de rescate | 24×24 | MEDIA |
| CM-U02 Íconos de estructura por estado (refugio, capilla, puerta, torre) | FALTA (hoy emoji) | fila de estructuras | 24×24 × 4 estados | MEDIA |
| CM-U03 Botón RESCATAR (ícono de mano / persona) | FALTA (hoy emoji) | acción contextual | 48×48 | BAJA |

**Prompt CM-U01:**
> Pixel art UI icon set, 24×24 px each, dark fantasy: a small villager silhouette with a green check (rescued),
> a grave cross (lost), a red exclamation triangle (in danger), a villager with an arrow (following).
> Crisp pixels, 1 px dark outline, transparent background.

---

## 7. AUDIO (hoy todo es sintetizado en `ARENA_SFX`)

| ID | Estado | Dónde se usa | Prioridad |
|---|---|---|---|
| CM-S01 Campana grande (tañido largo) y campanazo cortado | FALTA | Campanero | ALTA |
| CM-S02 Grito de la Plañidera | FALTA | pánico | ALTA |
| CM-S03 Aplausos / público espectral / risa del Presentador | FALTA | nivel 9 y jefe | ALTA |
| CM-S04 Voces de civiles ("¡Ayuda!", "¡Te sigo!", sollozos) | FALTA | rescate | MEDIA |
| CM-S05 Frases del Presentador (6 líneas cortas, voz grave teatral) | FALTA | jefe final | MEDIA |
| CM-S06 Derrumbe de edificio | FALTA | estructura destruida | MEDIA |

**Prompt de voz CM-S05:** voz masculina grave y teatral, tono de maestro de ceremonias burlón, reverberación
de sala vacía. Líneas: «¿Me escuchan? Excelente. Entonces empecemos.» · «¡Un aplauso para mis ayudantes!» ·
«Ahora… la verdadera función.» · «¡De pie para la ovación final!» · «No… todavía no bajen el telón…» ·
«Los salvaste a todos… qué final tan aburrido. Tan… hermoso.»

---

## 8. Lo que ya se usa de las hojas (para no pedirlo de nuevo)

- **Enemigos (9):** grillas de 8 direcciones (quieto, caminar, ataques, daño, muerte) + todos los paneles de ataque.
- **Civiles (3):** quieto (10), caminar (7–10), correr (10), herido (3–5), caída (3–5), muerte (8–9).
- **Subjefes (3) y Presentador (3 fases):** grillas + teletransporte, golpe, arrastre, derribo, lanzamiento,
  invocación, espejismos, transformación (12) y muerte (12).
- **Efectos:** impactos, sangre, onda y zona de pánico, lágrimas, trayectoria y polvo de tejado, ondas e
  invocación de campana, símbolos, explosión y fuego del sectario, salpicadura y cloaca, proyectil/drenado/
  posesión/desintegración del espectro, marca/zona del Maestro, decorado, telón, zona oscura, proyectiles y
  explosión de la Dama, proyectiles, telón del caos, marca del espectáculo, espectadores y explosión final.
- **Mapa:** texturas (calle, adoquín, tierra, escombros, puente, muralla, techo, pared exterior e interior,
  puerta, ventana), props de la leyenda (fuente, estatua, farol, fogata, escombros, árbol, valla, reja, barril,
  columna, arco, trampa, zona de spawn, evento), pilares del escenario (8) y la ilustración del mapa para el Códice.
