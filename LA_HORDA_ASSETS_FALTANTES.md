# LA HORDA — Assets faltantes (totales y parciales)

> Generado con `python3 tools/art/missing_list.py`. Canon de cada entidad: `LA_HORDA_SPRITE_CANON.md`.

## Regla de producción

- ChatGPT no recuerda la imagen anterior: **no se puede pedir un cuadro suelto**. Cada pedido es la **hoja completa** de la entidad (lo que ya existe + lo que falta), adjuntando su canon.
- Al llegar, la hoja nueva pasa el Artgate y **reemplaza el set entero** (no se mezclan frames de dos hojas).
- Formato: fondo transparente, sin textos ni recuadros, grilla pareja, pies alineados, vistas de perfil mirando a la derecha.

## Resumen

| Tipo | Cantidad |
|---|---|
| Faltantes totales (no existe arte) | 9 grupos |
| Faltantes parciales (hay canon, faltan animaciones) | 17 entidades |
| Resueltos en este pase | 12 |

## Faltantes TOTALES

| ID | Prioridad | Qué | Dónde | Hoja completa a pedir | Referencia | Notas |
|---|---|---|---|---|---|---|
| GUA-ELF | P0 | Guardián Élfico (uno de los Cuatro) | Ruinas del Bosque · Guardián | idle 4 · caminar abajo/perfil/arriba 4 c/u · ataque 4 · 2 habilidades 4 c/u · hurt 2 · muerte 6 · retrato 64×64 | mural de los Cuatro (docs) + hoja 12 del Mago Gélido como referencia de escala y estilo de Guardián | Único Guardián sin arte. Será GUARDIAN_CANON al llegar. |
| SKIN-SET | P1 | Skins de set (12 de campeón + universales) | Todas | ver docs/assets_faltantes/skins_sets/ (una ficha por set con la hoja completa y su prompt) | atlas canon de cada campeón | 12 hojas mínimas + 11 universales prioritarias. |
| ITEM-ICON | P2 | Íconos finales de objetos (169) | UI | ver LA_HORDA_ITEM_ASSET_MANIFEST.md | — | Hoy se usan íconos procedurales provisorios. |
| ARENA-CM | P2 | Ciudad Maldita (arena completa) | Arena en desarrollo | set de arena: piso, muros, props, enemigos, jefe | — |  |
| ARENA-AB | P2 | Abismo (arena completa + Entidad del Abismo) | Arena en desarrollo | set de arena + jefe | — |  |
| ARENA-MP | P2 | Minas Profundas (arena completa + Devoraluz) | Arena en desarrollo | set de arena + jefe | — |  |
| DIV-01 | P2 | Arena Divina: 5 Pruebas + Reflejos Oscuros | Modo en desarrollo | enemigos y props de las Pruebas | — |  |
| PROPS | P1 | Props de mecánicas de arena (hoy dibujados por código) | Varias | Fisura infernal (INF-01) · escarcha a los pies (HIE-02) · runa del menhir, maleza, raíces (BOS-01..03) · corriente, chorro, charco (ACU-01..03) · sellos (LAB-01) · íconos de acción (UI-01) · mural de los Cuatro (NAR-03) | fichas en LA_HORDA_MISSING_ASSETS.md | Cada prop es una hoja propia con todos sus estados. |
| SET-AURA | P3 | Auras de set (23) y VFX de procs (31) | Todas | ver LA_HORDA_ITEM_ASSET_MANIFEST.md | — | Opcional: hoy funcionan con efectos de código. |

## Faltantes PARCIALES (canon elegido, incompleto)

| Entidad | Canon a adjuntar | Ya tiene | Falta |
|---|---|---|---|
| Mago de Hielo y Cristal (GUARDIÁN) | `art-source/hielo_jefes/mago_hielo_cristal_sheet.png` | idle, caminar, básico, lanza, nova, canalización, encierro, muro, muerte | **hurt 2 · caminar de frente y de espaldas 4 c/u** |
| Ángel Caído de Hielo | `art-source/hielo_jefes/angel_caido_hielo_sheet.png` | idle, caminar, ataque, vuelo, alas, tormenta, transformación, aura, congelación, muerte | **caminar de espaldas 4 · golpe descendente limpio (sin la estela pegada)** |
| Jinete Sin Cabeza | `art-source/hielo_jefes/jefes_I1_I4_sheet.png (fila I1)` | galope de perfil, ataque, muerte, frente | **hurt 2 · Resurrección Eterna 4 · espalda 4** |
| Tundraverx | `art-source/hielo_jefes/jefes_I1_I4_sheet.png (fila I4)` | caminar de perfil, aliento, muerte, frente | **hurt 2 · espalda 4 · nova (pose de golpe al suelo) 4** |
| Servo de Cristal / Cristal Volador | `hoja 12 (filas de esbirros)` | idle, caminar/moverse, ataque, muerte | **hurt 2 (ambos)** |
| Gólem de Piedra | `art-source/pack_canon/img1 (Gólem de piedra)` | frente, perfiles, espalda, caminar, golpe | **hurt 2 · muerte 4-6** |
| Gólem del Infernal (de fuego) | `art-source/pack_canon/img3 (Gólem de Fuego)` | idle/caminar, ataque (1 pose), muerte | **hurt 2 · ataque cuerpo a cuerpo 3-4 · caminar de perfil** |
| Cù-Sìth | `art-source/pack_canon/img3 (Cù-Sìth)` | corrida, mordida, hurt, muerte | **idle propio 4 · vistas de frente/espaldas** |
| Enjambre de Hadas | `art-source/pack_canon/img2_hielo_menores.png (Hadas)` | idle/vuelo, direcciones, ataque, muerte | **hurt 2** |
| Esfinge · Medusa · Druida de Arena | `walk-strip.png ACTUAL de cada uno (NO las muertes de la IMG 1: son otro diseño)` | caminar de perfil | **ataque 4 · hurt 2 · muerte 4 · vistas de frente/espaldas** |
| Tanque · Asesino · Mago · Soporte (campeones originales) | `atlas.png actual de cada uno (el Tanque es la referencia maestra)` | idle/caminar 4 direcciones, ataque | **cast · hurt · muerte (el paquete original no los traía)** |
| Nigromante | `nigromante/v2/atlas.png` | set completo | **idle limpio (hoy hay cuadros con restos) · Demonio Nigromántico: golpe al suelo** |
| Musashi | `musashi/v2/atlas.png` | set completo | **primer cuadro del básico (se descartó por roto)** |
| Lobo Espectral (Cazadora) | `arte actual del lobo` | idle/ataque | **carrera 4** |
| Duende del Bosque / Zombi | `packs actuales (idle1.png, walk1.png...)` | set completo con 1 ataque | **Duende: 2º ataque · Zombi: ataque propio (hoy usa la embestida)** |
| Madre Espora | `art-source/micelial (atlas recortado)` | retrato animado por partes | **frames completos del cuerpo** |
| Brasero de hielo (HIE-01) | `brasero infernal actual` | reusa el brasero infernal | **versión de hielo: encendido (loop) · apagado · encendiéndose** |

### Prompts de hoja completa (parciales)

**Mago de Hielo y Cristal (GUARDIÁN)** — adjuntar `art-source/hielo_jefes/mago_hielo_cristal_sheet.png`

```
Full sprite sheet of Mago de Hielo y Cristal (GUARDIÁN) for LA HORDA — the EXACT SAME design as the attached reference (same body, proportions, palette, weapon, height). ALL animations in ONE sheet, one row per animation: idle 4 · caminar abajo/perfil/arriba 4 c/u · básico 4 · lanza 4 · nova 4 · canalización 4 · encierro 4 · muro 4 · hurt 2 · muerte 6. dark-fantasy detailed 16-bit pixel art, same grammar as LA HORDA (1px dark outline, 2-3 flat tones per color, limited palette, crisp alpha), transparent background, uniform grid, feet on the same baseline, side views facing right, NO text, NO labels, NO frames, NO grid lines, NO background panels.
```

**Ángel Caído de Hielo** — adjuntar `art-source/hielo_jefes/angel_caido_hielo_sheet.png`

```
Full sprite sheet of Ángel Caído de Hielo for LA HORDA — the EXACT SAME design as the attached reference (same body, proportions, palette, weapon, height). ALL animations in ONE sheet, one row per animation: idle 4 · caminar abajo/perfil/arriba 4 c/u · ataque 4 · vuelo 4 · golpe descendente 4 · alas 4 · tormenta 4 · transformación 6 · aura 4 · congelación 4 · hurt 2 · muerte 8. dark-fantasy detailed 16-bit pixel art, same grammar as LA HORDA (1px dark outline, 2-3 flat tones per color, limited palette, crisp alpha), transparent background, uniform grid, feet on the same baseline, side views facing right, NO text, NO labels, NO frames, NO grid lines, NO background panels.
```

**Jinete Sin Cabeza** — adjuntar `art-source/hielo_jefes/jefes_I1_I4_sheet.png (fila I1)`

```
Full sprite sheet of Jinete Sin Cabeza for LA HORDA — the EXACT SAME design as the attached reference (same body, proportions, palette, weapon, height). ALL animations in ONE sheet, one row per animation: galope perfil 4 · galope de frente 4 · galope de espaldas 4 · ataque (guadaña) 4 · lanzar calabaza 4 · hurt 2 · Resurrección Eterna 6 · muerte 6. dark-fantasy detailed 16-bit pixel art, same grammar as LA HORDA (1px dark outline, 2-3 flat tones per color, limited palette, crisp alpha), transparent background, uniform grid, feet on the same baseline, side views facing right, NO text, NO labels, NO frames, NO grid lines, NO background panels.
```

**Tundraverx** — adjuntar `art-source/hielo_jefes/jefes_I1_I4_sheet.png (fila I4)`

```
Full sprite sheet of Tundraverx for LA HORDA — the EXACT SAME design as the attached reference (same body, proportions, palette, weapon, height). ALL animations in ONE sheet, one row per animation: caminar perfil 4 · caminar frente 4 · caminar espaldas 4 · aliento 4 · nova 4 · hurt 2 · muerte 6. dark-fantasy detailed 16-bit pixel art, same grammar as LA HORDA (1px dark outline, 2-3 flat tones per color, limited palette, crisp alpha), transparent background, uniform grid, feet on the same baseline, side views facing right, NO text, NO labels, NO frames, NO grid lines, NO background panels.
```

**Servo de Cristal / Cristal Volador** — adjuntar `hoja 12 (filas de esbirros)`

```
Full sprite sheet of Servo de Cristal / Cristal Volador for LA HORDA — the EXACT SAME design as the attached reference (same body, proportions, palette, weapon, height). ALL animations in ONE sheet, one row per animation: servo: idle 4 · caminar 4 · ataque 4 · hurt 2 · muerte 4 — volador: idle 4 · moverse 4 · disparo 4 · hurt 2 · muerte 4. dark-fantasy detailed 16-bit pixel art, same grammar as LA HORDA (1px dark outline, 2-3 flat tones per color, limited palette, crisp alpha), transparent background, uniform grid, feet on the same baseline, side views facing right, NO text, NO labels, NO frames, NO grid lines, NO background panels.
```

**Gólem de Piedra** — adjuntar `art-source/pack_canon/img1 (Gólem de piedra)`

```
Full sprite sheet of Gólem de Piedra for LA HORDA — the EXACT SAME design as the attached reference (same body, proportions, palette, weapon, height). ALL animations in ONE sheet, one row per animation: idle frente/perfil/espalda 4 c/u · caminar 4 · golpe 4 · hurt 2 · muerte 6. dark-fantasy detailed 16-bit pixel art, same grammar as LA HORDA (1px dark outline, 2-3 flat tones per color, limited palette, crisp alpha), transparent background, uniform grid, feet on the same baseline, side views facing right, NO text, NO labels, NO frames, NO grid lines, NO background panels.
```

**Gólem del Infernal (de fuego)** — adjuntar `art-source/pack_canon/img3 (Gólem de Fuego)`

```
Full sprite sheet of Gólem del Infernal (de fuego) for LA HORDA — the EXACT SAME design as the attached reference (same body, proportions, palette, weapon, height). ALL animations in ONE sheet, one row per animation: idle 4 · caminar perfil 4 · caminar frente/espaldas 4 c/u · puñetazo 4 · hurt 2 · muerte 4. dark-fantasy detailed 16-bit pixel art, same grammar as LA HORDA (1px dark outline, 2-3 flat tones per color, limited palette, crisp alpha), transparent background, uniform grid, feet on the same baseline, side views facing right, NO text, NO labels, NO frames, NO grid lines, NO background panels.
```

**Cù-Sìth** — adjuntar `art-source/pack_canon/img3 (Cù-Sìth)`

```
Full sprite sheet of Cù-Sìth for LA HORDA — the EXACT SAME design as the attached reference (same body, proportions, palette, weapon, height). ALL animations in ONE sheet, one row per animation: idle 4 · corrida perfil 4 · corrida frente/espaldas 4 c/u · mordida 4 · hurt 2 · muerte 4. dark-fantasy detailed 16-bit pixel art, same grammar as LA HORDA (1px dark outline, 2-3 flat tones per color, limited palette, crisp alpha), transparent background, uniform grid, feet on the same baseline, side views facing right, NO text, NO labels, NO frames, NO grid lines, NO background panels.
```

**Enjambre de Hadas** — adjuntar `art-source/pack_canon/img2_hielo_menores.png (Hadas)`

```
Full sprite sheet of Enjambre de Hadas for LA HORDA — the EXACT SAME design as the attached reference (same body, proportions, palette, weapon, height). ALL animations in ONE sheet, one row per animation: idle/vuelo 4 · direcciones 4 · ataque 4 · hurt 2 · muerte 4. dark-fantasy detailed 16-bit pixel art, same grammar as LA HORDA (1px dark outline, 2-3 flat tones per color, limited palette, crisp alpha), transparent background, uniform grid, feet on the same baseline, side views facing right, NO text, NO labels, NO frames, NO grid lines, NO background panels.
```

**Esfinge · Medusa · Druida de Arena** — adjuntar `walk-strip.png ACTUAL de cada uno (NO las muertes de la IMG 1: son otro diseño)`

```
Full sprite sheet of Esfinge · Medusa · Druida de Arena for LA HORDA — the EXACT SAME design as the attached reference (same body, proportions, palette, weapon, height). ALL animations in ONE sheet, one row per animation: por cada uno: idle 4 · caminar perfil/frente/espaldas 4 c/u · ataque 4 · hurt 2 · muerte 4 — mismo diseño que el actual. dark-fantasy detailed 16-bit pixel art, same grammar as LA HORDA (1px dark outline, 2-3 flat tones per color, limited palette, crisp alpha), transparent background, uniform grid, feet on the same baseline, side views facing right, NO text, NO labels, NO frames, NO grid lines, NO background panels.
```

**Tanque · Asesino · Mago · Soporte (campeones originales)** — adjuntar `atlas.png actual de cada uno (el Tanque es la referencia maestra)`

```
Full sprite sheet of Tanque · Asesino · Mago · Soporte (campeones originales) for LA HORDA — the EXACT SAME design as the attached reference (same body, proportions, palette, weapon, height). ALL animations in ONE sheet, one row per animation: hoja completa con el layout estándar de campeón (ver docs/assets_faltantes/skins_sets/ para la lista: idle 4 dir, caminar 4 dir, ataque 4, cast 3, hurt 4, muerte 6). dark-fantasy detailed 16-bit pixel art, same grammar as LA HORDA (1px dark outline, 2-3 flat tones per color, limited palette, crisp alpha), transparent background, uniform grid, feet on the same baseline, side views facing right, NO text, NO labels, NO frames, NO grid lines, NO background panels.
```

**Nigromante** — adjuntar `nigromante/v2/atlas.png`

```
Full sprite sheet of Nigromante for LA HORDA — the EXACT SAME design as the attached reference (same body, proportions, palette, weapon, height). ALL animations in ONE sheet, one row per animation: hoja completa del Nigromante (mismo layout del atlas v2) + hoja completa del Demonio Nigromántico. dark-fantasy detailed 16-bit pixel art, same grammar as LA HORDA (1px dark outline, 2-3 flat tones per color, limited palette, crisp alpha), transparent background, uniform grid, feet on the same baseline, side views facing right, NO text, NO labels, NO frames, NO grid lines, NO background panels.
```

**Musashi** — adjuntar `musashi/v2/atlas.png`

```
Full sprite sheet of Musashi for LA HORDA — the EXACT SAME design as the attached reference (same body, proportions, palette, weapon, height). ALL animations in ONE sheet, one row per animation: hoja completa de Musashi con el layout del atlas v2. dark-fantasy detailed 16-bit pixel art, same grammar as LA HORDA (1px dark outline, 2-3 flat tones per color, limited palette, crisp alpha), transparent background, uniform grid, feet on the same baseline, side views facing right, NO text, NO labels, NO frames, NO grid lines, NO background panels.
```

**Lobo Espectral (Cazadora)** — adjuntar `arte actual del lobo`

```
Full sprite sheet of Lobo Espectral (Cazadora) for LA HORDA — the EXACT SAME design as the attached reference (same body, proportions, palette, weapon, height). ALL animations in ONE sheet, one row per animation: hoja completa del lobo: idle 4 · carrera 4 · mordida 4 · aparición 4 · desaparición 4. dark-fantasy detailed 16-bit pixel art, same grammar as LA HORDA (1px dark outline, 2-3 flat tones per color, limited palette, crisp alpha), transparent background, uniform grid, feet on the same baseline, side views facing right, NO text, NO labels, NO frames, NO grid lines, NO background panels.
```

**Duende del Bosque / Zombi** — adjuntar `packs actuales (idle1.png, walk1.png...)`

```
Full sprite sheet of Duende del Bosque / Zombi for LA HORDA — the EXACT SAME design as the attached reference (same body, proportions, palette, weapon, height). ALL animations in ONE sheet, one row per animation: hoja completa de cada uno con el mismo diseño actual. dark-fantasy detailed 16-bit pixel art, same grammar as LA HORDA (1px dark outline, 2-3 flat tones per color, limited palette, crisp alpha), transparent background, uniform grid, feet on the same baseline, side views facing right, NO text, NO labels, NO frames, NO grid lines, NO background panels.
```

**Madre Espora** — adjuntar `art-source/micelial (atlas recortado)`

```
Full sprite sheet of Madre Espora for LA HORDA — the EXACT SAME design as the attached reference (same body, proportions, palette, weapon, height). ALL animations in ONE sheet, one row per animation: ver BOSS-06 en LA_HORDA_MISSING_ASSETS.md. dark-fantasy detailed 16-bit pixel art, same grammar as LA HORDA (1px dark outline, 2-3 flat tones per color, limited palette, crisp alpha), transparent background, uniform grid, feet on the same baseline, side views facing right, NO text, NO labels, NO frames, NO grid lines, NO background panels.
```

**Brasero de hielo (HIE-01)** — adjuntar `brasero infernal actual`

```
Full sprite sheet of Brasero de hielo (HIE-01) for LA HORDA — the EXACT SAME design as the attached reference (same body, proportions, palette, weapon, height). ALL animations in ONE sheet, one row per animation: hoja completa del brasero de hielo. dark-fantasy detailed 16-bit pixel art, same grammar as LA HORDA (1px dark outline, 2-3 flat tones per color, limited palette, crisp alpha), transparent background, uniform grid, feet on the same baseline, side views facing right, NO text, NO labels, NO frames, NO grid lines, NO background panels.
```

## Resueltos en este pase (ya integrados y probados en partida)

- ~~Mago de Hielo y Cristal (BOSS-01)~~ ✅
- ~~Ángel Caído (BOSS-02)~~ ✅
- ~~Jinete Sin Cabeza (BOSS-03)~~ ✅
- ~~Minotauro completo (BOSS-05, IMG 9)~~ ✅
- ~~Tundraverx (I4)~~ ✅
- ~~Dragoncito de Hielo~~ ✅
- ~~Ángel de Hielo y Cristal élite~~ ✅
- ~~Enjambre de Hadas (salvo hurt)~~ ✅
- ~~Cù-Sìth (salvo idle)~~ ✅
- ~~Gólem de Cristal + esbirros~~ ✅
- ~~El Hechicero (NAR-01, sprint H1)~~ ✅
- ~~Demonio de la Horda (NAR-02): resuelto con el Demonio Mayor como forma final (H5)~~ ✅
