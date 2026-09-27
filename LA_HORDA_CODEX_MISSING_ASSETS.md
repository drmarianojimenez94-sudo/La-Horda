# LA HORDA — Assets faltantes del Códice

> Solo lo que **realmente falta** para el Códice (`LA_HORDA_CODEX.md`). Todo lo que el juego ya tiene se usa:
> sprites, animaciones con nombre, VFX, el retrato de la Madre Espora y las capturas reales de las arenas.
> Mientras falte un asset, el Códice dibuja una versión digna con el arte real: la forma del efecto sale de
> los datos de la habilidad y el sprite del juego queda como ilustración. Nada es placeholder feo, pero nada
> de esto es arte final.
>
> **Ya registrado en otros documentos (no se repite acá):**
> - frames completos de la Madre Espora: `LA_HORDA_MISSING_ASSETS.md` BOSS-06;
> - cast, hurt y muerte de los campeones originales: `LA_HORDA_ASSETS_FALTANTES.md`;
> - skins de set: `docs/assets_faltantes/skins_sets/`;
> - retratos del Hechicero: `LA_HORDA_COMBAT_MISSING_ASSETS.md` HS-01 y HS-04.
>
> **No se listan:**
> - El Forjador: es una voz de la historia, no una entidad ni una entrada del Códice.
> - El Que Mora Debajo: *nunca se muestra entero* por diseño, y su ojo real ya es la ilustración correcta.

## Prefijo común para TODOS los prompts

```
MODERN RETRO DARK FANTASY PIXEL ART, 16-bit, crisp pixel edges, no blur, no anti-aliasing, gothic atmosphere,
limited palette (max 24 colors), 1px dark outline (#0e0907) on outer silhouettes, soft top-left light,
no text, no watermark, no UI frame. Same art grammar as LA HORDA (3/4 top-down action RPG).
```

- **Sprites y VFX:** agregar `transparent background, uniform grid, one frame per cell, no grid lines`.
- **Ilustraciones y panorámicas:** agregar `full-bleed painted pixel scene, dark vignette at the edges`.

## Resumen

| ID | Prioridad | Entidad | Tipo | Estado hoy en el Códice |
|---|---|---|---|---|
| CX-ILU-01…17 | **P1** | Los 17 jefes | Ilustración de ficha (key art) | Sprite real del jefe sobre el escenario de su arena |
| CX-PAN-01 | **P1** | Ciudad Maldita | Panorámica de arena | Escenario ambiental (brasas y niebla) sin imagen |
| CX-PAN-02 | P2 | Minas Profundas | Panorámica de arena | Escenario ambiental sin imagen |
| CX-VFX-01 | P1 | Tanque | VFX de 4 habilidades | Forma procedural (giro, carga, onda) |
| CX-VFX-02 | P1 | Mago | VFX de 3 habilidades | Muro, cadena y cataclismo procedurales (la Nova usa VFX real) |
| CX-VFX-03 | P2 | Soporte | VFX de 1 habilidad | Aura procedural |
| CX-VFX-04 | P2 | Segador Olvidado | VFX de 2 habilidades | Aura procedural |
| CX-VFX-05 | P1 | La Profeta | VFX de 4 habilidades | Formas procedurales |
| CX-VFX-06 | P2 | Nigromante | VFX de 1 habilidad | Cono procedural |
| CX-VFX-07 | P2 | Eren | VFX de 2 habilidades | Aura procedural sobre su animación real |
| CX-ANI-01 | P1 | Dobladores (4) | Animaciones de habilidad | Solo tienen idle, caminar, ataque, golpe y muerte |
| CX-HD-01…07 | P2 | Criaturas del Abismo + Carcelero | Atlas en resolución completa | Atlas real con celdas de 44–77 px: se ve borroso ampliado |

---

## 1. Ilustraciones de jefe (CX-ILU)

Las fichas de jefe son las más grandes del Códice y hoy usan el sprite de combate como ilustración.
Todas comparten estas especificaciones:

| Campo | Valor |
|---|---|
| **TIPO** | Ilustración de ficha (key art) |
| **ASSET FALTANTE** | Ilustración grande del jefe en su arena |
| **ANIMACIÓN FALTANTE** | Opcional: loop de respiración o ambiente de 4 frames |
| **FRAMES** | 1 estática (o 4 en loop, 6 fps) |
| **DIMENSIONES** | 320×200 px de arte nativo, entregado ×2 (640×400) sin suavizado → `assets/ui/codex/bosses/<id>.png` |
| **USO** | Fondo del escenario de `codexBossHtml`. La preview animada del sprite real queda encima o al lado. **Respeta spoilers:** las formas `hidden` y los jefes con `veil` solo se muestran si están DERROTADOS. Integrarla requiere sumar un campo `art` en `CODEX_BOSS_LORE` y dibujarlo como fondo (hoy no existe). |

| ID | ENTIDAD | PROMPT (después del prefijo) |
|---|---|---|
| CX-ILU-01 | Dragón de la Forja (subjefe, Fábrica) | `A colossal steampunk bronze dragon born in a furnace, riveted plates glowing orange at the seams, steam venting from its jaws, inside a gigantic dark factory with chains and molten channels, low heroic camera angle.` |
| CX-ILU-02 | Caballero de la Armadura Oxidada (jefe, Fábrica) | `The last lord of an endless prison-factory, a towering knight whose armor rusted shut with him inside, red glow through the visor slits, huge rusted greatsword and tower shield, iron cages and conveyor chains behind, oppressive red light.` |
| CX-ILU-03 | Los Cuatro Reflejos / Dobladores (subjefe, Bosque) | `Four corrupted reflections of fallen heroes (a warrior, an archer, a rogue, a cleric) standing in a ring of standing stones in a rotten sacred forest, their bodies made of dark mirror-like shadow with glowing green eyes, mist between the menhirs.` |
| CX-ILU-04 | Guardián Ancestral (1.er Guardián, Bosque) | `An ancient elven guardian with antlers of living wood and a staff of runes, protecting a circle of inverted runes in a sacred forest, green crystal glowing in his chest, noble but weary.` Forma furia (`hidden`): `same guardian in fury, bark cracked, red runes, thorns erupting around him`. |
| CX-ILU-05 | Micelio Primigenio (subjefe, Reino Fúngico) | `A giant body stitched together from fallen corpses and roots, mushroom caps growing on its shoulders, violet spores drifting, inside a living fungal cavern.` |
| CX-ILU-06 | Madre Espora (jefe, Reino Fúngico) | `A monstrous fungal mother embedded in the center of a living cavern, the whole kingdom growing out of her, bioluminescent magenta and cyan mushroom caps, root-arms spread wide, a pulsing heart hidden in her torso.` (Usar `mother/mp_full.png` como referencia de diseño exacto.) |
| CX-ILU-07 | Tundraverx, Soberano de Hielo (subjefe, Hielo) | `The oldest ice dragon asleep on a frozen mountain pass, crystalline scales, frost breath curling, an ice cathedral in the distance under an eternal winter sky.` |
| CX-ILU-08 | Mago Gélido (2.º Guardián, Hielo) | `A lonely ice mage guardian in a crystal cathedral, robes frozen stiff, a blue crystal floating above his hand, frost spreading from his feet.` Forma `hidden`: `the same mage transformed into a fallen ice angel with frozen wings and a cracked halo`. |
| CX-ILU-09 | Kraken Joven (subjefe, Acuática) | `A young kraken coiling around sunken ruins, still small enough to fit the arena, curious menacing eyes, bioluminescent suckers, murky green-blue water.` |
| CX-ILU-10 | Leviatán (jefe, Acuática) | `The Leviathan, the kraken of legends, circling drowned ruins under a sea that should not exist, gigantic eye in the dark water, reality bending in ripples, tentacles framing the scene.` |
| CX-ILU-11 | Guardián del Laberinto (3.er Guardián, Laberinto) | `A stone sentinel guardian merged with the walls of a sand labyrinth, half man half moving masonry, a sand-colored crystal in his chest, statues watching.` |
| CX-ILU-12 | Minotauro (jefe, Laberinto) | `A massive minotaur, the corrupted final form of the labyrinth guardian, stone fused into his hide, great axe, dust storm in shifting corridors.` |
| CX-ILU-13 | Carcelero del Vacío (subjefe, Abismo) | `A jailer of the void binding floating lovecraftian ruins together with enormous chains, hooded, chains anchored to broken plazas over a bottomless abyss.` |
| CX-ILU-14 | El Que Mora Debajo (jefe, Abismo) | `A single colossal violet eye opening in the depths of an abyssal pit, tentacles rising between broken platforms, never showing its full body.` |
| CX-ILU-15 | Hechicero Supremo (subjefe, Infernal) · `veil` | `A golden sorcerer with wings of light standing in the heart of a hellish dimension, warm and trustworthy at first glance, but his shadow on the burning floor has too many wings.` |
| CX-ILU-16 | Ángel Corrompido → Gólem de Cuerpos → Rey de la Horda (jefe final) · `veil` + `hidden` | Tríptico de 3 paneles del mismo tamaño: `(1) the sorcerer revealed as a corrupted angel holding four fused crystals; (2) a golem made of countless bodies; (3) the Demon King of the Horde on a throne of fissures`. |
| CX-ILU-17 | Jinete Sin Cabeza (jefe, Arena Divina) | `A headless horseman of the old road legends, flaming neck, spectral hunting horse, lantern, galloping between divine castle towers.` |

## 2. Panorámicas de arena (CX-PAN)

Las 9 arenas jugables usan capturas reales del juego (`tools/codex/capture_arenas.js`). Las dos arenas
*en construcción* no se pueden jugar, así que no se pueden capturar.

### CX-PAN-01 — Ciudad Maldita
- **ENTIDAD:** Arena 01 · Ciudad Maldita (prólogo, en construcción)
- **TIPO:** Panorámica de arena
- **ASSET FALTANTE:** Imagen panorámica del capítulo
- **ANIMACIÓN FALTANTE:** —
- **FRAMES:** 1
- **DIMENSIONES:** 480×210 px nativo, entregado ×2 (960×420) → `assets/ui/codex/arenas/ciudad.jpg`
- **USO:** Portada del capítulo en ARENAS y fondo de la ficha. `codexArenaHtml` hoy no muestra imagen en
  estado `soon`: al llegar el asset hay que permitirla también en ese estado.
- **PROMPT:** `[PREFIJO] + top-down 3/4 view of a walled medieval city square the night after a horde attack,
  broken barricades, burning braziers, a cracked fountain, smoke rising, violet light leaking from a fresh scar in
  the ground, empty streets, melancholic and ominous.`

### CX-PAN-02 — Minas Profundas
- **ENTIDAD:** Minas Profundas (en construcción, entre la Acuática y el Laberinto)
- **TIPO:** Panorámica de arena
- **ASSET FALTANTE:** Imagen panorámica del capítulo
- **ANIMACIÓN FALTANTE:** —
- **FRAMES:** 1
- **DIMENSIONES:** 480×210 px nativo, entregado ×2 (960×420) → `assets/ui/codex/arenas/minas.jpg`
- **USO:** Igual que CX-PAN-01.
- **PROMPT:** `[PREFIJO] + top-down 3/4 view of forgotten mine galleries, wooden supports, rails and abandoned carts,
  pools of lantern light surrounded by deep darkness, glittering crystal veins, remains of earlier crystal
  seekers, claustrophobic.`

## 3. VFX de habilidades de campeón (CX-VFX)

Las demos de habilidad usan VFX real cuando existe:

- Libertador y Eren: `SE_FX`.
- Asesino, Axiom y la Nova del Mago: hojas por celdas.
- Cazadora: trampa, lluvia y Lobo Espectral.
- Musashi: Rōnin, fantasma y portal.
- Soporte, Segador y Nigromante: `VFX_SPR_EXTRA`.

Estas habilidades **no tienen ningún sprite de efecto** ni en la partida ni en el Códice: se dibujan con código.
Todas comparten estas especificaciones:

| Campo | Valor |
|---|---|
| **TIPO** | VFX de habilidad (tira horizontal) |
| **FRAMES** | 8 a 12 por efecto, 16 fps, sin loop salvo que se indique |
| **DIMENSIONES** | Celdas de 128×128 px (efectos de área: 192×128), tira horizontal → `assets/vfx/<campeón>/<efecto>.png` |
| **USO** | Demo de la habilidad en la ficha del campeón: clave `vfx` en `CODEX_SKILL_FX`. Los efectos de combate pueden usar el mismo asset. |

| ID | ENTIDAD | ASSET / ANIMACIÓN FALTANTE | PROMPT (después del prefijo + `transparent background, horizontal strip`) |
|---|---|---|---|
| CX-VFX-01 | Tanque | Torbellino (loop de 8), Embestida (estela + impacto, 10), Grito de Guerra (onda azul, 10), Grito Provocador (onda dorada + marca de provocación, 12) | `steel whirlwind slash ring loop; dust charge trail ending in a heavy shield impact burst; blue concentric war-cry shockwave; golden taunting roar shockwave with a red target sigil` |
| CX-VFX-02 | Mago | Muro de Fuego (loop de 8, 192×128), Cadena de Relámpago (arco + chispazo de impacto, 8), Cataclismo Elemental (meteoro de fuego + estallido de hielo, 12) | `a wall of roaring fire flames loop; forked yellow chain lightning arc and impact spark; a fire meteor crashing into an ice explosion, elemental cataclysm` |
| CX-VFX-03 | Soporte | Bendición de Guerra (aura roja ascendente, 10) | `a crimson holy war blessing aura rising with sword-shaped sparks` |
| CX-VFX-04 | Segador Olvidado | Armadura de la Furia (armadura de sangre que se cierra, 10), Último Aliento (estallido rojo al borde de la muerte, 10) | `blood-red spectral armor plates forming around a body; desperate crimson last-stand burst with ghostly scythe silhouettes` |
| CX-VFX-05 | La Profeta | Destino Restaurado (reloj de runas que rebobina, 12), Visión del Inmortal (ojo dorado + escudo breve, 10), Danza del Augurio (anillo giratorio aturdidor, loop de 8), Ascensión del Elegido (columna de luz celeste, 12) | `a turquoise rune clock rewinding with healing light; a golden all-seeing eye with a brief protective shell; a spinning ring of prophetic runes that stuns; a pale-cyan pillar of ascension light with feathers` |
| CX-VFX-06 | Nigromante | Cosecha de Almas (cono de almas verdes aspiradas, 10) | `a cone of green wailing souls being ripped out and pulled toward the caster` |
| CX-VFX-07 | Eren | Instinto de Supervivencia (aura naranja + vapor, loop de 8), ¡Avancen! (estandarte y onda de avance, 10) | `orange survival-instinct aura with rising steam loop; a charging banner shockwave rallying allies forward` |

## 4. Dobladores — animaciones de habilidad (CX-ANI-01)

- **ENTIDAD:** Doblador Guerrero, Doblador Arquera, Doblador Pícaro, Doblador Clérigo (subjefe grupal del Bosque).
- **TIPO:** Animación de sprite (se suma al atlas `assets/sprites/bosses/bosque/doblador_*/v2/atlas.png`).
- **ASSET FALTANTE:** Filas nuevas en el mismo atlas.
- **ANIMACIÓN FALTANTE:** El atlas trae solo `idle, walk, atk, hit, death`. Falta una habilidad por doblador:
  - Guerrero: tajo giratorio.
  - Arquera: disparo triple.
  - Pícaro: desvanecerse y reaparecer.
  - Clérigo: curar a los demás.
- **FRAMES:** 6 por habilidad.
- **DIMENSIONES:** celda de 58×61 px, igual que el atlas actual, 8 columnas.
- **USO:** Demos de las habilidades en la ficha de JEFES y `packSet` en combate.
- **PROMPT:** `[PREFIJO] + transparent background + sprite sheet rows extending the attached doppelganger atlas
  (same design, same cell size 58x61, feet on the same baseline): row 1 warrior spinning sword slash (6), row 2
  archer firing three arrows in a fan (6), row 3 rogue dissolving into shadow smoke and reappearing (6), row 4
  cleric raising a green-glowing holy symbol healing (6). Corrupted mirror-shadow palette, green eyes.`

## 5. Atlas del Abismo en resolución completa (CX-HD)

- **Problema:** los atlas del Abismo se recortaron de hojas pintadas en celdas chicas, de 44 a 77 px con cuerpos de
  29 a 56 px (`js/assets/abismo-meta.js`). En partida se ven bien. En la ficha del Códice se amplían ×4–×6 y se
  ven borrosos, mientras que las criaturas de otras arenas, en pixel art nativo, siguen nítidas.
- **Pedido:** repetir la misma hoja al doble de resolución, con el mismo diseño, la misma grilla de 8 columnas, las
  mismas filas y el mismo orden de cuadros. Así se reemplaza el PNG sin tocar código: se duplican `w/h/refH`.

| Campo | Valor |
|---|---|
| **TIPO** | Atlas de sprite (reemplazo en alta) |
| **ASSET FALTANTE** | `atlas.png` al doble de resolución |
| **USO** | Ficha del Bestiario o de JEFES (y la partida, sin cambios de lógica) |
| **PROMPT** | `[PREFIJO] + transparent background + redraw the attached sprite sheet at 2x resolution, EXACT same design, same grid (8 columns), same rows and frame order, feet on the same baseline, crisp native pixel art (not upscaled)` |

| ID | ENTIDAD | Celda actual | DIMENSIONES pedidas | ANIMACIÓN (sin cambios, mismas filas) |
|---|---|---|---|---|
| CX-HD-01 | Errante del Abismo (`ab_errante`) | 56×75 | 112×150 por celda | idle, walk (4 dir.), atk, strong, hit, death |
| CX-HD-02 | Acechador (`ab_acechador`) | 60×69 | 120×138 | idle, walk, run, leap, claw, emerge, death |
| CX-HD-03 | Heraldo (`ab_heraldo`) | 54×77 | 108×154 | idle, float, cast, orb, zone, death |
| CX-HD-04 | Devorador (`ab_devorador`) | 60×72 | 120×144 | idle, walk, atk, stomp, death |
| CX-HD-05 | Tejedor (`ab_tejedor`) | 50×66 | 100×132 | idle, walk, cast, weave, net, death |
| CX-HD-06 | Jinete Sin Cabeza del Abismo (`ab_jinete`) — **el más afectado** | 56×44 | 112×88 | idle, prep, charge, impact, turn, death |
| CX-HD-07 | Carcelero del Vacío (`ab_carcelero`, subjefe) | 53×46 | 106×92 | idle, chain, drag, slam, break, death |
