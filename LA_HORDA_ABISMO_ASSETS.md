# LA HORDA — Arena del Abismo · Arte usado y faltantes

Qué arte real usa hoy la arena, qué se resolvió por código y qué conviene producir.
**Regla de producción:** ChatGPT no recuerda la imagen anterior, así que nunca se pide "el cuadro que
falta": se pide la **HOJA COMPLETA** de la entidad (todas sus animaciones, las que ya existen y las
nuevas) adjuntando como referencia la hoja oficial (`art-source/abismo/*.png`). Al llegar, la hoja
nueva reemplaza el set entero y se recorta con `tools/art/abismo/extract.py`.

## Lo que ya está integrado (de las 4 hojas oficiales)

| Entidad / pieza | Fuente | Estado en partida |
|---|---|---|
| Errante, Acechador, Heraldo, Devorador, Tejedor, Jinete, Carcelero | `abismo_enemigos_1/2.png` | atlas con idle, caminar (3 vistas si la hoja las trae), ataque, habilidad propia, golpe, muerte |
| 42 efectos (impactos, orbe, zona, fractura, estelas, cadenas, rayo, fragmentos, succión, tentáculos…) | las 4 hojas | `VFX_SPR_EXTRA` / `bossSheetFx` |
| Ojo (idle, parpadeo, daño, abrir, muerte), mandíbula (5 estados), tentáculo grande, segmentos | `abismo_jefe_morador.png` | jefe armado por partes |
| Portal activo / cerrado, altar, pilares, núcleo | `abismo_mapa.png` | piezas altas del mapa |
| Texturas de piedra, carne, tentáculo, estados de plataforma | `abismo_mapa.png` | piso procedural texturado |

Resuelto por código (sin placeholders feos): caras laterales con estalactitas, grietas por estado,
aviso de derrumbe, reconstrucción, vacío con paralaje y ruinas lejanas, cadenas del Carcelero,
filamentos del Tejedor, flechas de carga del Jinete, manos y reloj del colgado, minimapa.

---

## ABYSS_MISSING_ASSETS

Prioridad: **P0** = se nota en cada partida · **P1** = mejora clara · **P2** = pulido.

Estilo común a TODOS los prompts (pegar al final de cada uno):
> dark-fantasy lovecraftian detailed 16-bit pixel art, same grammar as the attached LA HORDA reference
> sheet (1px dark outline, 2-3 flat tones per color, limited palette of bruised violets, bone greys,
> deep teal shadows and sickly magenta glows, crisp alpha), NO sci-fi, NO neon, transparent background,
> uniform grid, every frame the same cell size, feet on the same baseline, side views facing right,
> NO text, NO labels, NO frame borders, NO grid lines, NO background panels.

### ENVIRONMENT

| ID | Prioridad | Qué | Por qué |
|---|---|---|---|
| AB-ENV-01 | P1 | Hoja de tiles de plataforma (tapa, borde, cara lateral, estalactitas, 3 estados de grieta, derrumbe en 6 frames, reconstrucción en 6 frames) | Hoy el piso usa un recorte de 49×105 px repetido y el derrumbe es una transformación por código |
| AB-ENV-02 | P1 | Portal del vacío a mayor resolución (inactivo, activo 6 frames en loop, apertura 6 frames) | el recorte actual es de 89×86 px (se ve borroso a 150 px de alto) |
| AB-ENV-03 | P2 | Fondo del vacío en 3 capas (niebla lejana, ruinas flotantes, niebla cercana) | hoy es procedural |
| AB-ENV-04 | P2 | Pilar de anclaje con argolla y cadena rota (entero / roto) | hoy se usa el pilar genérico |

**Prompt AB-ENV-01 (hoja completa):**
> A complete tileset sheet for floating ancient ruins above an endless void, top-down 3/4 view like the
> attached map. Row 1: 8 seamless stone floor tiles 64x64 (carved flagstones, faint violet void veins).
> Row 2: 8 edge tiles 64x64 (straight, inner corner, outer corner, curved edge) showing the cracked lip.
> Row 3: 8 side-face tiles 64x96 showing the cliff wall under the platform with hanging stalactites.
> Row 4: the same floor tile in 3 damage states (cracked, critical with glowing violet fissures,
> crumbling with missing chunks) x2 variants. Row 5: a 128x96 platform piece collapsing into the void,
> 6 frames. Row 6: the same piece rebuilding from floating fragments with arcane light, 6 frames.

**Prompt AB-ENV-02:**
> A sprite sheet of a void portal carved in ancient stone standing on a round dais, 192x192 per frame.
> Row 1: dormant portal (dark, cold) 1 frame + closed variant 1 frame. Row 2: active portal loop, 6
> frames (swirling violet void inside the arch, drifting motes). Row 3: opening, 6 frames (the void
> tears open from the center).

**Prompt AB-ENV-03:**
> Three horizontal parallax background layers for an endless abyss under floating ruins, 1536x512
> each, stacked vertically: (1) far layer: deep violet fog with barely visible colossal silhouettes;
> (2) middle layer: small broken floating ruins and pillars, dark with faint rim light; (3) near layer:
> thin drifting void mist with sparse glowing motes. Tileable left-right.

### ENEMIES

| ID | Prioridad | Qué | Por qué |
|---|---|---|---|
| AB-EN-01..06 | **P0** | Hoja completa de cada enemigo a 128 px de alto por frame | los recortes actuales miden 29-56 px de alto y se escalan 2-4x en partida (se ven gruesos) |
| AB-EN-07 | P1 | Vistas de frente/espalda del Jinete y del Tejedor | hoy caminan con la vista de perfil |
| AB-EN-08 | P1 | Hurt de 2 frames y muerte de 6 para los 6 | hoy hay 1 frame de golpe y 3-4 de muerte |

**Prompt AB-EN-01 — Errante del Vacío (hoja completa):**
> A complete animation sheet for "Errante del Vacío", a gaunt hunched humanoid wanderer of the abyss
> with grey hair, torn dark robes and void-corrupted skin, same design as the attached reference,
> 128x128 per frame. Row 1: idle 4. Row 2: walk side 6. Row 3: walk front (down) 6. Row 4: walk back
> (up) 6. Row 5: basic claw attack 5. Row 6: heavy telegraphed overhead blow 6 (clear wind-up pose,
> then a strong impact that would knock a hero back). Row 7: hurt 2. Row 8: death 6 (collapses into void dust).

**Prompt AB-EN-02 — Acechador del Borde:**
> A complete animation sheet for "Acechador del Borde", a fast violet quadruped predator with long
> claws that crawls along cliff edges, same design as the attached reference, 128x96 per frame.
> Row 1: idle crouched 4. Row 2: run side 6. Row 3: run front 6. Row 4: run back 6. Row 5: climbing up
> over a ledge (emerge) 5. Row 6: leap wind-up 3 + leap airborne 3 + landing impact 2. Row 7: claw
> attack 5. Row 8: hurt 2. Row 9: death 6.

**Prompt AB-EN-03 — Heraldo del Ojo:**
> A complete animation sheet for "Heraldo del Ojo", a floating hooded cultist whose face is a single
> glowing eye, same design as the attached reference, 128x160 per frame. Row 1: float idle 4. Row 2:
> float move side 6. Row 3: move front 6. Row 4: move back 6. Row 5: cast orb 8 (the eye charges a slow
> violet orb and releases it). Row 6: summon gravity zone 4. Row 7: hurt 2. Row 8: death 6.

**Prompt AB-EN-04 — Devorador de Piedra:**
> A complete animation sheet for "Devorador de Piedra", a massive hunched stone-eating brute made of
> fused rubble and flesh, same design as the attached reference, 192x192 per frame. Row 1: idle 4.
> Row 2: heavy walk side 6 (each step cracks the floor). Row 3: walk front 6. Row 4: walk back 6.
> Row 5: punch 5. Row 6: ground stomp 6 (big wind-up, both fists smash the floor). Row 7: hurt 2.
> Row 8: death 6 (crumbles into rocks).

**Prompt AB-EN-05 — Tejedor del Vacío:**
> A complete animation sheet for "Tejedor del Vacío", a spider-like weaver of the abyss with pale
> violet limbs that spins glowing filaments, same design as the attached reference, 128x128 per frame.
> Row 1: idle 4. Row 2: walk side 6. Row 3: walk front 6. Row 4: walk back 6. Row 5: weave filament 8
> (raises front legs, a glowing thread stretches out). Row 6: bite attack 4. Row 7: hurt 2. Row 8: death 6.

**Prompt AB-EN-06 — Jinete Sin Cabeza:**
> A complete animation sheet for "Jinete Sin Cabeza", a headless armored rider on a skeletal black
> void horse, same design as the attached reference, 192x160 per frame. Row 1: idle 4. Row 2: trot side
> 6. Row 3: trot front 6. Row 4: trot back 6. Row 5: charge wind-up 6 (horse rears, rider points the
> lance). Row 6: full-speed charge 8. Row 7: impact 6. Row 8: turn around / exhausted 6. Row 9: hurt 2.
> Row 10: death 6.

### SUB-BOSS — El Carcelero del Vacío

| ID | Prioridad | Qué | Por qué |
|---|---|---|---|
| AB-SB-01 | **P0** | Hoja completa del Carcelero a 384 px de alto | el recorte actual mide 37 px de alto y se escala ~5,6x |
| AB-SB-02 | P1 | Pieza de cadena (eslabón, tramo, cadena rota, gancho) | hoy la cadena es procedural |

**Prompt AB-SB-01:**
> A complete animation sheet for "El Carcelero del Vacío", a colossal hunched jailer of the abyss
> wrapped in rusted chains that are anchored to the ruins, huge hands, a caged skull-like head with a
> violet glow, same design as the attached reference, 384x384 per frame. Row 1: idle (chains taut) 4.
> Row 2: heavy walk side 6. Row 3: walk front 6. Row 4: walk back 6. Row 5: chain strike 8 (whips a
> chain forward in a straight line). Row 6: chain sweep 8 (spins chains around him). Row 7: hook throw
> and drag 8 (throws a hooked chain, then pulls). Row 8: ground slam 6. Row 9: breaking one of his own
> chains 8 (roars as a chain snaps). Row 10: rising from below the ruins 6. Row 11: hurt 2.
> Row 12: death 8 (all chains snap, he sinks into the void).

**Prompt AB-SB-02:**
> A small sprite sheet of rusted dark-iron chain pieces, 64x64 per frame: single link (2 angles),
> straight chain segment, sagging chain segment, broken chain end, iron hook, chain anchored to a stone
> ring, violet void glow variant of the link.

### BOSS — El Que Mora Debajo

| ID | Prioridad | Qué | Por qué |
|---|---|---|---|
| AB-BO-01 | **P0** | Ojo a escala de jefe (idle, parpadeo, daño, abierto/vulnerable, rayo, muerte) | el ojo actual es de ~60 px y se escala 3-4x |
| AB-BO-02 | **P0** | Mandíbula bajo el pozo con transparencia real (cerrada, preparación, abrir, succión, cierre) | hoy es un recorte rectangular con máscara |
| AB-BO-03 | P1 | Tentáculo de combate (surgir, idle, preparación, aplastar, daño, hundirse/morir) | hoy es 1 pose inclinada por código |
| AB-BO-04 | P1 | Siluetas gigantes para el fondo de la fase 3 (cuerpo, tentáculos lejanos) | hoy se reutiliza el tentáculo grande |

**Prompt AB-BO-01 + 02 + 03 (UNA hoja completa del jefe):**
> A complete boss sheet for "El Que Mora Debajo", a colossal lovecraftian abyss entity that is never
> fully shown, same design as the attached reference. SECTION A — the eye emerging from a mass of
> violet flesh at the rim of a pit, 256x256 per frame: idle 6, blink 5, hurt 5, eye wide open and
> vulnerable 5, charging a gravity ray 6, death (eye closes and sinks) 6. SECTION B — the giant jaw
> seen from above inside the pit, 512x256 per frame, fully transparent around it: closed 1, preparing
> (lips pulling back) 4, opening 4, sucking inward loop 4, closing 4. SECTION C — a combat tentacle
> bursting out of a platform edge, 160x320 per frame: rise 6, idle sway 6, wind-up 4, slam down 6,
> hurt 2, sink / death 6.

**Prompt AB-BO-04:**
> Two very large dark silhouettes for the background of a final boss phase, 1024x768 each: (1) the
> immense body of an abyss entity seen from far below the ruins (only rims of violet light, a huge
> closed eye, ridges of flesh); (2) a ring of 6 colossal tentacles rising from the void around the
> arena. Low contrast, meant to sit behind the gameplay.

### VFX

| ID | Prioridad | Qué | Por qué |
|---|---|---|---|
| AB-FX-01 | P1 | Derrumbe de plataforma (polvo y piedras que caen, 8 frames) | hoy son partículas genéricas |
| AB-FX-02 | P1 | Reconstrucción (fragmentos que suben con luz arcana, 8 frames) | hoy partículas + contorno |
| AB-FX-03 | P2 | Caída al vacío (estela violeta hacia abajo, 6 frames) | hoy el cuerpo se hunde por código |
| AB-FX-04 | P2 | Rescate (destello de manos que suben, 6 frames) | hoy partículas "holy" |

**Prompt AB-FX (una hoja):**
> A VFX sprite sheet for an abyss arena, 192x192 per frame, additive-friendly glows on transparent
> background: Row 1: platform collapse, dust and rocks falling into darkness, 8 frames. Row 2: platform
> rebuilding, stone fragments rising with pale arcane light, 8 frames. Row 3: a body falling into the
> void leaving a violet streak, 6 frames. Row 4: rescue flash, two hands pulling up with a warm light, 6 frames.

### TELEGRAPHS

| ID | Prioridad | Qué | Por qué |
|---|---|---|---|
| AB-TG-01 | P2 | Runa de derrumbe (borde de plataforma que se agrieta en rojo, loop 6) | hoy línea punteada roja procedural (legible) |
| AB-TG-02 | P2 | Aviso de mandíbula (anillo de dientes en el piso, 6) | hoy anillo procedural |

**Prompt AB-TG:**
> A telegraph decal sheet seen from above, 256x128 per frame, transparent: Row 1: a cracking red-violet
> rune line along a stone edge that pulses faster, 6 frames. Row 2: a ring of spectral teeth on the
> floor closing toward the center, 6 frames. Flat decals, no perspective shadow.

### PROJECTILES

| ID | Prioridad | Qué | Por qué |
|---|---|---|---|
| AB-PR-01 | P1 | Orbe del Heraldo (vuelo 6, estallido 6) a 64 px | el actual es de 3 frames chicos |
| AB-PR-02 | P2 | Fragmento del jefe (caída 4, impacto 4) | hoy se usa `abMorShards` |

**Prompt AB-PR:**
> A projectile sheet, 64x64 per frame: Row 1: a slow violet void orb with an eye-like core, flying loop
> 6 frames. Row 2: the orb bursting into a gravity swirl 6 frames. Row 3: a falling shard of dark stone
> wrapped in violet light 4 frames. Row 4: shard impact 4 frames.

### UI

| ID | Prioridad | Qué | Por qué |
|---|---|---|---|
| AB-UI-01 | P1 | Ícono RESCATAR (manos) 64 px, 2 estados | hoy emoji 🤝 |
| AB-UI-02 | P2 | Íconos de minimapa (portal, ancla, jefe) 16 px | hoy formas simples |

**Prompt AB-UI:**
> A small UI icon sheet in pixel art, 64x64 per frame, transparent: (1) two hands clasping to pull
> someone up, idle; (2) same, highlighted/pressed; then 16x16 minimap icons: void portal, chain anchor,
> abyss eye (boss), skull (sub-boss).

---

## Orden recomendado de producción

1. **AB-SB-01** (Carcelero) y **AB-BO-01..03** (jefe): son lo que más se escala hoy.
2. **AB-EN-01..06** (una hoja por enemigo).
3. AB-ENV-01, AB-ENV-02, AB-PR-01, AB-UI-01.
4. El resto (P2).
