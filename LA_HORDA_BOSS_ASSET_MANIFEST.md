# LA HORDA — BOSS ASSET MANIFEST (pass de identidad de jefes)

Estado del arte de cada jefe y de las piezas nuevas de sus reglas:

| Estado | Significado |
|---|---|
| **EXISTENTE** | Arte real integrado. |
| **INCOMPLETO** | Se usa arte real prestado de otra pieza, o un dibujo procedural digno. Se ve bien, pero merece arte propio. |
| **FALTANTE** | No hay arte y se resolvió con dibujo procedural. |

No quedan placeholders feos en pantalla: lo marcado INCOMPLETO o FALTANTE ya se ve bien en
partida, pero merece arte dedicado.

**Estilo común de los prompts:** *dark fantasy 16-bit pixel art, limited palette, strong
silhouette, readable at 64–128 px, transparent background, sprite sheet grid, consistent top-down
3/4 view, no text.*

Prioridades: **P0** se nota en partida hoy · **P1** mejora clara · **P2** pulido.

---

## 01 · El Presentador (Ciudad)

| Pieza | Estado | Nota |
|---|---|---|
| Presentador (3 actos, cast, muerte) | EXISTENTE | Hoja de la Ciudad. |
| Cometa del «Gran Número» | INCOMPLETO | FX de la Ciudad (`cmFire` / `cmPreBolt`) más estela procedural. |
| Cometa reflejado | INCOMPLETO | Procedural. |

- **P1 — Cometa:** *"flaming theatrical comet shaped like a burning star with a ribbon tail, 6-frame loop + 5-frame impact burst, crimson and gold, dark fantasy 16-bit pixel art, transparent"*

## 02 · Caballero de la Armadura Oxidada + Dragón de la Forja (Fábrica)

| Pieza | Estado | Nota |
|---|---|---|
| Caballero, Dragón (vuelo, aliento, bombardeo) | EXISTENTE | |
| Sobrecalentamiento de la armadura (oscuro → rojo → incandescente) | INCOMPLETO | Brillo procedural sobre el sprite. |
| Shock térmico (vapor + armadura que se quiebra) | INCOMPLETO | Partículas de vapor y chispas. |
| Válvula de vapor (acción ABRIR VÁLVULA) | EXISTENTE | Rejillas de vapor de la cámara. |
| Dragón huyendo herido (nivel 6) | INCOMPLETO | Se reusa el ciclo de vuelo. |

- **P1 — Armadura en tres estados de calor:** *"rusted plate-armor knight, same pose, 3 heat states: dark iron, glowing red seams, white-hot incandescent with molten cracks, dark fantasy 16-bit pixel art, transparent"*
- **P1 — Shock térmico:** *"steam explosion hitting molten armor, armor plates cracking and flying off, 8 frames, white steam and orange sparks, dark fantasy 16-bit pixel art"*
- **P2 — Dragón herido en huida:** *"wounded mechanical steampunk dragon fleeing upward, smoking wing, leaking embers, 6 frames"*

## 03 · Guardián Ancestral → Bestia del Bosque (Ruinas)

| Pieza | Estado |
|---|---|
| Guardián, Bestia, transformación, runas (4 estados) | EXISTENTE |
| Escudo de raíces sobre el jefe | INCOMPLETO (hojas procedurales) |

- **P2 — Escudo de raíces:** *"shield of twisting glowing corrupted roots wrapping a giant elf guardian, 6-frame loop, sickly green and red, dark fantasy 16-bit pixel art, transparent"*

## 04 · Madre Espora (Fúngico)

| Pieza | Estado | Nota |
|---|---|---|
| Madre por partes, núcleos, nubes, alucinaciones | EXISTENTE | |
| Raíces de la RED (núcleo → Madre) | INCOMPLETO | Raíz procedural con flujo punteado. |
| Corazón micelial abierto (ventana) | INCOMPLETO | Halo procedural sobre la fase "heart". |

- **P1 — Raíz-tendón:** *"thick pulsing mycelium root tendon, tileable horizontal segment 64x24 with 4-frame pulse, magenta glow veins, dark fantasy 16-bit pixel art"*
- **P1 — Corazón abierto:** *"giant fungal heart exposed in an opened chest of spores, beating 6 frames, pink-violet glow, dark fantasy 16-bit pixel art"*

## 05 · Mago Gélido → Demonio Gélido (Gélida)

| Pieza | Estado | Nota |
|---|---|---|
| Mago (cast, nova, canal, muro), Demonio (cuerpo del Ángel Caído de Hielo) | EXISTENTE | |
| **Foco de Hielo** | INCOMPLETO | Aguja `bsAngelPillar_1` + cristal flotante `bsMagoCrystal`. |
| Brasero congelado por el Mago | INCOMPLETO | Brasero apagado más escarcha procedural. |
| Coraza de escarcha / derretido | INCOMPLETO | Vapor procedural. |

- **P1 — Foco de Hielo:** *"ice focus obelisk with floating rotating crystal, idle 6 frames + shatter 8 frames, pale blue glow, dark fantasy 16-bit pixel art, transparent"*
- **P2 — Brasero congelado:** *"stone brazier encased in ice, flame frozen, 3 frames of frost spreading"*
- **P2 — Demonio derritiéndose:** *"ice demon armor melting near fire, steam and dripping, 6 frames overlay"*

## 06 · Leviatán (Acuática)

| Pieza | Estado | Nota |
|---|---|---|
| Leviatán (cabeza, embestida, espiral, fases, muerte) | EXISTENTE | |
| **Tentáculos** | INCOMPLETO | Frames reales del Kraken Joven (`tent_01..06`). Falta una variante por función. |
| Agarre (tentáculo enroscado en un guardián) | INCOMPLETO | Anillo procedural. |
| Núcleo expuesto al salir a respirar | INCOMPLETO | Se reusa el sprite con la ventana del HUD. |

- **P1 — Tentáculos por función:** *"giant sea-monster tentacle rising from water, three variants: SLAM (club-tipped, raised), GRAB (hooked, curling), CURRENT (fin-edged, spinning water), idle 4 frames + action 6 frames each, purple-crimson with suckers, dark fantasy 16-bit pixel art, transparent"*
- **P1 — Agarre:** *"tentacle coiled around a small armored hero, squeezing 4 frames"*
- **P2 — Núcleo:** *"leviathan surfacing, glowing core in throat exposed, 6 frames"*

## 07 · Minotauro (Laberinto)

| Pieza | Estado | Nota |
|---|---|---|
| Minotauro (hoja real), muros del laberinto | EXISTENTE | |
| **Pared agrietada** | FALTANTE | Grietas naranjas procedurales. |
| Pared derrumbándose | INCOMPLETO | Partículas de roca. |

- **P0 — Pared agrietada:** *"sandstone labyrinth wall segment with glowing orange cracks, tileable horizontal and vertical pieces, plus 8-frame collapse into rubble, dark fantasy 16-bit pixel art"*

## 08 · El Que Mora Debajo (Abismo)

| Pieza | Estado |
|---|---|
| Ojo / jefe, tentáculos, plataformas (4 estados), Jinete | EXISTENTE (`LA_HORDA_ABISMO_ASSETS.md`) |
| Ojo abierto (ventana) | INCOMPLETO (halo del HUD) |

- **P2 — Ojo abierto:** *"colossal abyssal eye in a pit, dilating pupil, 6 frames, violet"*

## 09 · Cerbero (Minas "EL DESCENSO")

| Pieza | Estado | Nota |
|---|---|---|
| Cerbero (idle, walk, run, lanzallamas, pisotón, mordida, aullido, daño, muerte) | EXISTENTE | Frames chicos (≈54×67): **se ven en bloque al escalar.** |
| Cadenas (tensas, rotura, caída, restos) | EXISTENTE | Hoja extra integrada. |
| Portal Infernal (6 etapas) | EXISTENTE | Hoja extra integrada. |
| Cerbero expuesto (sombras separadas) | INCOMPLETO | Fantasmas procedurales. |

- **P0 — Cerbero en alta resolución:** *"three-headed hellhound Cerberus (physical, fire, shadow heads), full animation set idle/walk/run/flamethrower/stomp/triple-bite/howl/hurt/death, 8–16 frames each, frame size 192x192, dark fantasy 16-bit pixel art, transparent"*

## 10 · Hechicero Supremo → Rey de la Horda (Infernal)

| Pieza | Estado | Nota |
|---|---|---|
| Hechicero (subjefe), Golem de Cuerpos | EXISTENTE | |
| Ángel Corrompido | INCOMPLETO | Recoloreado del Hechicero, más alas y cristales procedurales (HS-01b). |
| Rey de la Horda | INCOMPLETO | Cuerpo del Demonio Mayor. |
| **Focos de Convergencia** (Ancestral / Escarcha / Piedra / Hechicero) | INCOMPLETO | Aguja de cristal teñida por color. |
| **Fisuras de la Horda** (HORDA / VIDA / PIEL) | INCOMPLETO | Fisura procedural más etiqueta. |

- **P0 — Ángel Corrompido:** *"fallen angel sorcerer with torn crimson corrupted wings and four orbiting crystals, idle/cast/attack/hit/death, 128x128, dark fantasy 16-bit pixel art"*
- **P1 — Rey de la Horda:** *"demon king forged from the horde, crown of horns, body of fused corpses and lava, idle/attack/roar/death, 192x192"*
- **P1 — Focos de Convergencia:** *"four crystal foci obelisks: green nature, pale ice, amber stone, gold holy, each idle 6 frames + shatter 8 frames"*
- **P2 — Fisura con sigilo de poder:** *"hellish ground fissure with a glowing sigil above: summoning horns / life heart / armor shield, 3 variants, 6-frame loop"*

---

## Resumen por prioridad

| Prioridad | Piezas |
|---|---|
| **P0** | Cerbero en alta resolución · Pared agrietada del Laberinto · Ángel Corrompido |
| **P1** | Cometa del Presentador · Armadura en 3 estados de calor + shock térmico · Raíces de la red y corazón micelial · Foco de Hielo · Tentáculos por función + agarre · Rey de la Horda · Focos de Convergencia |
| **P2** | Todo lo demás (escudo de raíces, brasero congelado, derretido, ojo abierto, fisuras con sigilo, Dragón herido, núcleo del Leviatán) |
