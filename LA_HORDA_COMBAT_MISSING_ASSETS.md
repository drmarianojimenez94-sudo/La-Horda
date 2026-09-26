# LA HORDA — Assets faltantes del combate, botín y sistemas nuevos

> Complementa `LA_HORDA_MISSING_ASSETS.md` (arenas y jefes). Acá está solo lo que piden los sistemas de esta
> etapa: gore, impactos, roles enemigos, destructibles, cofre, proyectiles por campeón, evolución de habilidades,
> Nigromante y UI nueva. **Regla:** todo lo marcado PROCEDURAL se dibuja hoy con código en pixel art nítido (sin
> blur ni antialias), en el mismo estilo que los props de Arena Identity, para que la mecánica se juegue y se
> pruebe. No es arte final, pero tampoco es un placeholder feo: si nunca llegara el arte definitivo, se ve bien.
>
> **Estados:** `PROCEDURAL` (dibujado con código, jugable) · `REUSED` (reusa arte existente) · `MISSING`.
> **Escala:** 1 px de arte = 2 unidades de mundo. Un campeón mide ≈ 65 u (≈ 32–36 px). Perspectiva 3/4 cenital.

## Prefijo común para TODOS los prompts

Copiar al principio de cada prompt:

```
MODERN RETRO DARK FANTASY PIXEL ART, crisp pixel edges, no blur, no anti-aliasing, transparent background,
coherent silhouette readable at small size, 3/4 top-down view matching a mobile action-RPG horde game,
limited palette (max 16 colors per sprite), 1px dark outline (#0e0907) on the outer silhouette, soft top-left
light, no text, no watermark, no drop shadow baked in (the game draws its own ground shadow).
```

## Resumen

| ID | Prioridad | Sistema | Asset | Estado | Dónde se usa |
|---|---|---|---|---|---|
| CH-01 | **P0** | Botín | Cofre del final de arena (7 rarezas: cerrado, temblando, abriéndose, abierto) | PROCEDURAL | `js/ui/loot-ceremony.js` |
| GO-01 | **P0** | Gore | Manchas de suelo por material (sangre, icor, hueso, escarcha, ceniza, esporas) | PROCEDURAL | `js/rendering/gore.js` (`addDecal`) |
| GO-02 | P1 | Gore | Trozos desmembrados por material (6 × 4 piezas) | PROCEDURAL | `goreChunks` |
| GO-03 | P1 | Gore | Overlays de muerte: congelado (estatua), carbonizado, electrocutado | PROCEDURAL (filtro + horneado) | `vfxDrawDying`, `_bakeCorpse` |
| RO-01 | **P0** | Roles enemigos | 9 insignias de rol (rombo) + anillo de suelo | PROCEDURAL (glifo en rombo) | `drawEnemyRoleMarks` |
| BR-01 | P1 | Destructibles | 7 objetos × (intacto, a punto de estallar, restos) | PROCEDURAL (pixel en código) | `js/systems/breakables.js` |
| PR-01 | P1 | Identidad | Proyectiles por campeón (9 formas × 3 frames) | PROCEDURAL | `drawProjStyle` |
| EV-01 | P1 | Evolución | Destello "Forma final" por campeón (12) | REUSED (partículas + anillo del color del campeón) | `skillEvoOnCast` |
| ST-01 | P2 | Estados | Íconos/overlays: mojado, descarga, marca, marchitar, aturdido | PROCEDURAL | `entities.js` |
| NI-01 | P1 | Nigromante | Cosecha de Almas (cono), gólem de carne ×3 pieles, pips de almas | PARTIAL (gólem reusa el sprite existente con tinte) | `nigromante.js`, `hud.js` |
| UI-01 | P2 | HUD | Botón de curación de emergencia (lista / urgente / gastada) | PROCEDURAL (✚ con CSS) | `#btn-emerg` |
| UI-02 | P2 | Ritmo | Flecha de oleada en el borde | PROCEDURAL | `pacingDrawWarn` |
| IT-01 | P1 | Objetos | Íconos de Legendarios con nombre (24), Míticos (8) y Únicos (3) | MISSING (usan el ícono genérico del tipo) | inventario, cofre, recetario |

---

## Fichas

### CH-01 — Cofre del final de arena
- **Estado:** PROCEDURAL. `js/ui/loot-ceremony.js` dibuja un cofre pixel con haz de luz del color de la rareza.
- **Tamaño:** 48×40 px por frame. **Frames:** cerrado 1, temblando 4 (loop), abriéndose 6, abierto 2 (loop de brillo).
- **Variantes por rareza** (cambia el metal y las gemas, no la forma): Común (hierro gris), Raro (bronce + gema azul),
  Muy raro (plata + gema violeta), Legendario (oro + gema naranja), Mítico (oro oscuro con runas rojas),
  Set (bronce verdoso con hojas), Único (obsidiana con grietas de luz blanca).
- **Pivot:** centro de la base. **FPS:** 10 (abrirse), 6 (temblar/brillo).
- **Filename / destino:** `chest/{rareza}.png` (tira horizontal) → `assets/ui/loot/`.
- **Integración:** reemplazar `drawChest()` por `drawImage` del frame; el haz y las partículas se quedan en código.
- **Prompt:**
```
[PREFIJO] A heavy wooden treasure chest with metal bands, closed, facing the camera at 3/4 top-down angle,
48x40 pixels per frame, horizontal sprite strip of 13 frames: 1 closed, 4 shaking (lid rattling, small dust
puffs), 6 opening (lid swinging up, light spilling from inside), 2 open idle (inner glow pulsing). Rarity
variant: {LEGENDARY: gold bands, orange gem on the lock, warm orange inner light}. Dark fantasy mood, worn wood,
rivets, no characters.
```

### GO-01 — Manchas de suelo por material
- **Estado:** PROCEDURAL (`addDecal`: charcos y salpicaduras en código). Presupuesto: 90 manchas en celular, 170 en escritorio.
- **Materiales:** sangre roja (humanoides/bestias), icor verde (plantas/hongos), polvo de hueso (esqueletos),
  esquirlas de escarcha (hielo), ceniza (muerte por fuego), esporas violetas (Micelial).
- **Tamaño:** 32×20 px, 4 variantes por material (charco, salpicadura, goteo, arrastre). Estáticas.
- **Destino:** `assets/vfx/gore/decals_{material}.png` (4 frames en tira).
- **Integración:** `addDecal(x, y, color, dark, kind, scale)` elige la variante por `kind`; mantener el fundido y el tope.
- **Prompt:**
```
[PREFIJO] Top-down ground decal set, 4 variants in a horizontal strip, 32x20 pixels each: a blood pool,
a directional splatter, small drips, a drag smear. Material: {dark red blood}. Flat on the floor, slightly
glossy highlights, no gore chunks, readable but not photorealistic, dark fantasy.
```

### GO-02 — Trozos desmembrados
- **Estado:** PROCEDURAL (`goreChunks`: rectángulos pixel con rotación). Solo en muertes de impacto nivel 3–4.
- **Tamaño:** 8×8 px, 4 piezas por material (hueso, carne, fragmento de armadura, trozo de planta/hongo/hielo).
- **Destino:** `assets/vfx/gore/chunks_{material}.png`.
- **Prompt:**
```
[PREFIJO] 4 tiny gore chunk sprites, 8x8 pixels each, horizontal strip: a bone shard, a flesh chunk,
a broken armor piece, a {frozen ice fragment}. Stylized, not realistic, suitable for a fast arcade horde game,
each readable as it spins through the air.
```

### GO-03 — Overlays de muerte especial
- **Estado:** PROCEDURAL. Carbonizado = el cuerpo con `brightness/saturate` (horneado en el cadáver, con tope de
  cuerpos filtrados por cuadro). Congelado y electrocutado = tinte + destellos.
- **Tamaño:** capas de 48×48 px que se dibujan encima del cuerpo: costra de hielo (estatua), grietas de brasa,
  arcos eléctricos (3 frames).
- **Destino:** `assets/vfx/deaths/{frozen,charred,shock}.png`.
- **Prompt:**
```
[PREFIJO] Overlay layer to put on top of a dead monster sprite, 48x48 pixels: {a shell of cracked blue ice
covering the silhouette like a statue, with bright white edges}. Only the overlay, transparent everywhere
else, center-bottom pivot.
```

### RO-01 — Insignias de rol enemigo
- **Estado:** PROCEDURAL: rombo oscuro con borde y un glifo unicode del color del rol (✚ ☠ ◎ ⛨ ⛓ ⌖ ✸ ⚑ ✦) y un
  anillo de suelo. Legible, pero un ícono pixel se lee mejor en celular.
- **Roles y color:** Sanador (verde `#5ae678`), Resucitador (violeta `#b478ff`), Invocador (naranja `#ff963c`),
  Protector (celeste `#78beff`), Carcelero (gris acero `#c8c8d2`), Cazador (rojo `#ff5050`), Suicida (naranja
  fuego `#ff7828`), Comandante (dorado `#ffd250`), Artillero (rojo salmón `#ff6e5a`).
- **Tamaño:** 14×14 px por ícono, 9 en una tira. Sin fondo (el rombo lo sigue dibujando el código).
- **Destino:** `assets/ui/roles/role_icons.png`.
- **Integración:** en `drawEnemyRoleMarks` reemplazar el `fillText(C.ico)` por `drawImage` del ícono correspondiente.
- **Prompt:**
```
[PREFIJO] 9 tiny UI glyph icons, 14x14 pixels each, horizontal strip, bold single-color shapes with a 1px
dark outline: healing cross (green), skull (violet), summoning circle (orange), tower shield (light blue),
chain link (steel grey), crosshair (red), exploding spark (fire orange), war banner (gold), falling meteor
(salmon red). Must read instantly at 14px on a phone screen.
```

### BR-01 — Objetos destructibles
- **Estado:** PROCEDURAL en `js/systems/breakables.js` (`aidArt`), mismo estilo que los props de arena.
- **Objetos:** urna de brasas (Infernal), cristal de escarcha (Gélida), ánfora de agua (Acuática), vaina de
  espinas (Ruinas), jarrón funerario (Laberinto), barril de pólvora (Fortaleza), vaina de esporas (Micelial).
- **Tamaño:** 20–22×24–28 px. **Estados:** intacto (1), a punto de estallar (3 frames de temblor con grietas
  luminosas), restos en el suelo (1, estático).
- **Destino:** `assets/props/breakables/{arena}.png` (5 frames en tira).
- **Integración:** `_brkArt(kind)` devuelve la imagen; el temblor y el brillo ya están en `drawBreakable`.
- **Prompt:**
```
[PREFIJO] A destructible prop for a dark fantasy arena, {an ember urn: dark clay pot with glowing orange coals
inside}, 22x26 pixels per frame, horizontal strip of 5 frames: 1 intact, 3 about-to-burst (cracks glowing,
slight bulge), 1 broken debris pile on the ground. Center-bottom pivot, reads clearly as "explosive" from
a distance.
```

### PR-01 — Proyectiles por campeón
- **Estado:** PROCEDURAL (`drawProjStyle`): flecha (Cazadora), daga (Asesino, Musashi, Eren), orbe (Mago),
  destello (Soporte), medialuna (Segador), glifo (Axiom), runa (Profeta), alma (Nigromante), bala con humo
  (Libertador), bala pesada (Tanque). La estela y el brillo quedan en código.
- **Tamaño:** 12×12 px, 3 frames de loop (8 fps), orientados hacia la derecha (el código rota).
- **Destino:** `assets/vfx/projectiles/{estilo}.png`.
- **Prompt:**
```
[PREFIJO] A small magic projectile sprite pointing right, 12x12 pixels per frame, 3-frame loop, horizontal
strip: {a spectral green soul wisp with a tiny skull face and a wavy tail}. Bright core, 2-3 color ramp,
designed to be rotated in code and to read over busy dark backgrounds.
```

### EV-01 — Destello de "Forma final"
- **Estado:** REUSED: anillo de choque + partículas de la paleta del campeón + texto "★ FORMA FINAL".
- **Pedido:** un sprite de 64×64 px, 8 frames sin loop, por campeón (12), del color de su `glow`.
- **Destino:** `assets/vfx/evolution/final_{campeón}.png`. **Integración:** `vfxSprite` en `skillEvoOnCast` cuando `final`.
- **Prompt:**
```
[PREFIJO] A one-shot power-up burst effect, 64x64 pixels per frame, 8 frames, horizontal strip: a ring of
{teal digital glyphs} expanding and breaking into square sparks, centered, fading to nothing by the last
frame. Themed for {Axiom, a cyber-arcane champion}.
```

### ST-01 — Íconos/overlays de estados
- **Estado:** PROCEDURAL (gotas para mojado, chispas para descarga, marca y marchitar como aro de color).
- **Pedido:** 5 íconos de 10×10 px para mostrar sobre la barra de vida: mojado, descarga, marca, marchitar, aturdido.
- **Destino:** `assets/ui/status/status_icons.png`.
- **Prompt:**
```
[PREFIJO] 5 tiny status icons, 10x10 pixels each, horizontal strip: water drop (wet, blue), lightning bolt
(shocked, yellow), hunter's mark target (red), withering skull-leaf (green-black), spinning stars (stunned,
white). Readable at 10px.
```

### NI-01 — Nigromante (sistemas nuevos)
- **Estado:** PARTIAL. El gólem usa el sprite existente con tinte por piel (carne, fuego, hielo). La Cosecha de
  Almas es un cono de partículas. Los pips de almas son rectángulos CSS.
- **Pedido:** (a) cono de Cosecha de Almas: 96×64 px, 6 frames; (b) gólem de carne con 3 pieles (carne cosida,
  brasa, escarcha): 48×56 px, idle 4 / caminar 6 / golpe 5 / salto-aplastar 6; (c) pip de alma 6×10 (vacío/lleno).
- **Destino:** `assets/sprites/champions/nigromante/{harvest,golem_flesh,golem_fire,golem_ice}.png`.
- **Prompt (gólem):**
```
[PREFIJO] A hulking flesh golem stitched together from corpses, 48x56 pixels per frame, 3/4 top-down, animation
strips: idle 4 frames, walk 6, punch 5, leap-and-slam 6. Skin variant: {burning: cracks with embers, charred
flesh, orange glow}. Grotesque but not gory, dark fantasy, bulky readable silhouette.
```

### UI-01 — Botón de curación de emergencia
- **Estado:** PROCEDURAL (círculo del HUD con ✚; estados lista, urgente con latido, gastada en gris).
- **Pedido:** ícono 20×20 px en 3 estados (lista, urgente, gastada). **Destino:** `assets/ui/hud/emergency_heal.png`.

### UI-02 — Flecha de oleada
- **Estado:** PROCEDURAL (flecha roja en el borde de la pantalla). **Pedido:** 16×16 px, 2 frames (pulso).

### IT-01 — Íconos de objetos con nombre
- **Estado:** MISSING: los 24 Legendarios con nombre, 8 Míticos de receta y 3 Únicos usan el ícono genérico de
  su tipo con el marco de la rareza.
- **Pedido:** 24×24 px por ícono; Míticos y Únicos con un aura de 2 frames.
- **Destino:** `assets/ui/items/named/{designId}.png`. **Integración:** `itemCardHTML` usa el ícono si existe.
- **Prompt:**
```
[PREFIJO] An RPG inventory item icon, 24x24 pixels, {a legendary two-handed scythe named "Guadaña de la Cosecha
Roja": blood-red blade, bone handle, faint red aura}, centered, fills the square, readable at 24px.
```
