# La Horda — Lista de sprites a producir

Sale de la auditoría de sprites (commit `07ca5bc`). Incluye **solo** el arte que falta de
verdad. Lo que ya fue entregado pero todavía no está integrado figura aparte, al final
(sección "No producir"), para no hacerlo dos veces.

Prioridades:
- **CRÍTICO**: la entidad no tiene arte propio (usa el de otro monstruo) o no puede mostrar su
  acción principal (camina o ataca con imágenes quietas).
- **IMPORTANTE**: jefes y subjefes, o enemigos muy vistos, con un solo frame o dibujados por código.
- **POLISH**: muertes, golpes recibidos, efectos de habilidades y reexportaciones de arte que ya existe.

---

## Especificación técnica (vale para todo)

Así lo consume el código hoy; respetarlo permite integrarlo sin retocar nada:

- **PNG con fondo transparente**, sin texto, etiquetas, bordes de panel ni restos de frames vecinos.
- **Pixel art**, sin suavizado (el juego dibuja con `imageSmoothingEnabled = false`).
- **Un frame por archivo** (`nombre_accion_01.png`, `_02`…) **o una tira horizontal** de
  celdas del mismo tamaño. En las tiras, los **pies de todos los frames a la misma altura**
  (anclaje abajo-centro), para que la caminata no salte.
- **Vistas**: abajo (de frente), perfil y arriba (de espaldas). **El perfil tiene que mirar a
  la DERECHA**: la izquierda la genera el juego espejando. No hace falta vista izquierda.
- **Escala**: el juego reescala cada sprite al radio de la entidad (unas 2.6 a 2.9 veces el
  radio de alto). Lo importante es que **todos los frames de una misma entidad tengan la misma
  escala y el mismo tamaño de celda**. Como referencia de resolución, lo ya integrado mide entre
  90 y 120 px de alto para campeones y jefes y entre 30 y 100 px para enemigos comunes.
- **Cantidad de frames**: caminata de 4 (6 como máximo), ataque de 3 a 4 con el impacto en el
  frame 2 o 3, muerte de 4 a 5 terminando tendido en el piso, golpe recibido de 1.

Dónde se integra en el código (`index.html`):
- Enemigos con frame único → `ICE_REAL_IMG` / `drawIceRealSprite`.
- Enemigos con tira → `REAL_ANIM_DEF` + `REAL_ANIM_SETS` / `drawRealAnimSprite`.
- Enemigos con grilla de 4 direcciones → `ENEMY_ATLAS_IMG` / `drawEnemyAtlas`.
- Segador → `SEGADOR_REAL_IMG`; Axiom → `AXIOM_REAL_IMG`.
- Muerte de campeones → `FALLEN_REAL` / `drawFallenHero`.
- Efectos de suelo o encima de la entidad → `VFX_SPR_EXTRA` / `vfxSprite`.

---

## CRÍTICO

| # | Entidad | Arena / rol | Hoy | A producir |
|---|---------|-------------|-----|------------|
| C1 | ~~**Segador Olvidado**~~ ✅ | Campeón | **Integrado con el diseño nuevo del Pack 1** (parca violeta): quieto, caminar, ataque, cast, golpe y muerte en 3 direcciones. Habilidades sin cambios | Opcional: rehacer los frames de muerte intermedios (venían partidos) |
| C2 | ~~**Axiom**~~ ✅ | Campeón | **Integrado con el diseño nuevo del Pack 1** (paladín dorado): quieto, caminar, ataque, cast y muerte en 3 direcciones. Habilidades sin cambios | Opcional: golpe recibido y más frames de cast (los del pack venían partidos) |
| C3 | ~~**Duende del Bosque**~~ ✅ | Ruinas del Bosque, común | **Integrado** (Pack 2, commit de este sprint): caminar 5, idle 3, ataque 4, golpe 1, muerte 3 | Opcional: rehacer ataque/golpe/muerte (varios frames venían partidos por la grilla y se descartaron) |
| C4 | ~~**Bestia del Bosque**~~ ✅ | Ruinas del Bosque, subélite | **Integrado** (sprint de integración visual): se reconstruyó cada fila del Pack 2 uniendo las celdas partidas por la grilla. Idle 4, caminar 5, ataque 3, golpe 1, muerte 4 | Opcional: vistas de frente/espalda |
| C5 | ~~**Guardián del Laberinto**~~ ✅ | Laberinto Maldito, subjefe | **Integrado** (Pack 3): idle 3, caminar 4, ataque 5, golpe 2, muerte 5. Habilidades sin cambios | Opcional: vistas de frente/espalda (el pack solo trae perfil 3/4) |

---

## Revisión de los Packs 1 y 2 (generados con ChatGPT)

Se revisaron los 541 recortes. Venían de hojas JPEG con grilla y texto, así que muchos frames
quedaron con líneas de grilla, restos de celdas vecinas, halos grises o el cuerpo partido.

- **Integrado:** Duende del Bosque (ver C3). Se limpió automáticamente y se descartaron los
  frames partidos.
- **Integrado a pedido tuyo — Segador y Axiom con diseño nuevo:** se cambió solo la apariencia y
  las animaciones (ver C1/C2). Las habilidades, su lógica y sus efectos siguen iguales. Los VFX
  del Pack 1 (golpe sagrado, barrera temporal, pulso cronal, nova oscura, corte sinfonal,
  cataclismo) no se usaron porque no corresponden a ninguna de sus habilidades.
- **No integrado — enemigos que no existen en el juego:** araña gigante, arquero, druida
  corrompido, escorpión del bosque, espíritu, lobo sombrío, planta carnívora y treant
  ancestral. Además el treant viene con los frames desalineados.
- **No integrado — calidad:** Bestia del Bosque (C4) y Jinete (I1), ver sus filas.

Para una próxima tanda con ChatGPT (o cualquier generador), pedí **PNG con transparencia real
(sin tablero de ajedrez ni fondo blanco), un frame por archivo, sin textos ni grilla**, y el
**mismo diseño** que el sprite actual (pasale la imagen existente como referencia).

## Revisión de los Packs 3, 4 y 5 (generados con ChatGPT)

Los recortes por celda del zip **no se pudieron usar**: la grilla asumía 6 columnas por fila,
pero las hojas traen entre 4 y 7, así que casi todos los frames venían partidos o mezclados con
el vecino. Se recortó todo de nuevo desde las hojas de referencia (`PACK_N_REFERENCE_SHEET.png`),
quitando el fondo oscuro del panel y las sombras suaves y separando los frames uno por uno.
Los sprites miden unos 45 a 60 px de alto, en línea con el resto del arte del juego.

- **Integrado (entidades sin arte propio):** Guardián del Laberinto (C5), Zombi (I11) y
  Esqueleto Cornudo (I12).
- **Integrado (reemplazo de sprites de 1 solo frame):** Gólem de Hielo (P5), Demonio de Hielo
  y Fuego (P8) y Ent (P11, con el Treant Ancestral). **Dos cambian de diseño**, el Demonio y el
  Ent (ver sus filas): si preferís el aspecto anterior, se vuelve atrás por entidad.
- **No integrado — el juego ya tiene arte real completo y el diseño del pack es otro:**
  Minotauro (el del pack es rojo con armadura y hacha; el actual es marrón con capa),
  Escorpión (violeta en el pack, azul oscuro en el juego), Gólem de Arena (dorado; el Gólem de
  Piedra actual es gris verdoso), Esfinge (alas plateadas; la actual es toda dorada), Demonio
  Mayor, Kraken, Leviatán y Anguila Eléctrica (los actuales son más grandes y detallados).
- **No integrado — calidad:** Dragón de Hielo (Tundraverx, I4). Los frames de caminar miran a
  la izquierda y los de golpe a la derecha, y el tamaño salta de un frame a otro.
- **No integrado — no existen en el juego:** todo el Pack 5 (Ángel Guardián, Serafín Caído,
  Titán de Luz, Demonio Divino, Criaturas Celestiales, Soldado Celestial, Sombra Corrupta,
  Elemental Divino), además de las torres y castillos celestial e infernal (la Arena Divina ya
  tiene los suyos). Las ruinas (I13) no vienen en el pack.
- **VFX de habilidades de los packs:** no se usaron. Son un solo frame cada uno (no animación)
  y las habilidades que ilustran ya tienen su efecto en el juego.

## Sprint de integración visual (auditoría completa)

- **Corregidos:** Escorpión (el perfil mezclaba frames que miraban a lados opuestos), Tiburón
  Blanco (idle2 de otra toma, se veía gigante), Kraken (tamaño que "latía" entre frames),
  Anguila y Leviatán (recortes con restos de hoja), Demonio de Hielo (lanza del frame vecino),
  Soporte (atlas con huecos transparentes en cara/manto, líneas de grilla y cuadriculado),
  La Profeta (caminata más chica que el idle, restos de guadaña), Musashi, Segador, Axiom,
  Nigromante y Sylva (líneas de grilla y fragmentos de frames vecinos), Lobo Espectral (texto de
  la hoja incrustado), esqueletos invocados, VFX de Axiom (traían al Axiom viejo dibujado adentro).
- **Recortes descartados por rotos** (se usa otro frame del mismo set): Musashi basic1,
  Nigromante idleA2–A5, esqueleto walk2 y mageAtk, lobo run, Demonio Nigromántico "slam"
  (trae un cartel de texto de la hoja).
- **Pendientes de arte** (se ven bien, pero conviene rehacer): Nigromante — ciclo de idle limpio;
  Demonio Nigromántico — golpe al suelo; Lobo Espectral — carrera; Musashi — primer frame del
  básico; los VFX de Axiom se recortaron con máscara y pueden tener un hueco suave donde estaba
  el personaje viejo.


| # | Entidad | Arena / rol | Hoy | A producir |
|---|---------|-------------|-----|------------|
| I1 | **Jinete Sin Cabeza** | Ruinas del Bosque, jefe final | 1 frame (54×50) | **Galope 4 frames** (perfil derecha) + **ataque 4 frames**. Opcional: pose de "Resurrección Eterna" (2 a 3 frames) — *El Pack 2 trae otro diseño (caballo negro con cabeza en llamas) distinto del Jinete actual (caballo pálido), con halos grises y cortes: no se integró.* |
| I2 | **Mago de Hielo y Cristal** | Hielo, jefe final (fase 1) | 1 frame (38×44). Los efectos de Ventisca, Nova y Armadura YA existen | **Caminata o flotación 4 frames** + **cast 3 frames** |
| I3 | **Ángel Caído de Hielo** | Hielo, jefe final (fase 2) | 1 frame (42×43) | **Vuelo/caminata 4 frames** + **ataque 4 frames** |
| I4 | **Tundraverx (Dragón de Hielo)** | Hielo, élite/jefe intermedio | 1 frame (39×38). El Aliento y la Nova (con el cuerpo incluido) YA existen | **Vuelo/caminata 4 frames** (perfil derecha) |
| I5 | **Doblador — Guerrero** | Bosque, subjefe | 1 frame (32×38) | **Caminata 4 frames** + **ataque 3 frames** |
| I6 | **Doblador — Arquera** | Bosque, subjefe | 1 frame (25×40) | **Caminata 4 frames** + **disparo 3 frames** |
| I7 | **Doblador — Pícaro** | Bosque, subjefe | 1 frame (30×40) | **Caminata 4 frames** + **ataque 3 frames** |
| I8 | **Doblador — Clérigo** | Bosque, subjefe | 1 frame (22×33) | **Caminata 4 frames** + **cast 3 frames** |
| I9 | **Minotauro** | Laberinto, jefe final | La tira real solo trae perfil caminando (derecha) y espalda (3 frames) | **Ataque 4 frames** (perfil derecha: embestida o hachazo) + **caminata de frente 4 frames** (vista abajo) |
| I10 | **Demonio Mayor — efectos** | Arena Infernal, jefe | El cuerpo tiene atlas real; el **aliento** y la **onda** se dibujan por código | **Aliento de fuego 4 a 6 frames** (efecto, dirección derecha) + **onda expansiva 4 frames** (anillo/golpe al suelo, vista cenital) |
| I11 | ~~**Zombi**~~ ✅ | Arena Infernal, común | **Integrado** (Pack 4): idle 4, caminar 3, ataque 3, golpe 1, muerte 3. *La fila "attack" del pack dibuja otra criatura (con cuernos y lanza): se usaron como ataque los frames de embestida de la fila "hit"* | Opcional: ataque propio (mordida/zarpazo) con el mismo diseño |
| I12 | ~~**Esqueleto Cornudo**~~ ✅ | Arena Infernal, subélite | **Integrado** (Pack 4): idle 4, caminar 4, ataque 3, golpe 2, muerte 3 | — |
| I13 | ~~**Arena Divina — ruinas**~~ ✅ | Estructuras | **Resuelto**: las torres/castillos usan ahora el arte del Pack 5 por facción (celestial tu lado, infernal el rival) y la ruina se genera del mismo sprite (base quebrada, chamuscada, con escombros) | Opcional: derrumbe animado de 3 frames |

---

## Pack de VFX propio (dibujado a mano, sin IA de imágenes)

El pack `LA_HORDA_sprites_reparados.zip` que mandaste desde otra IA resultó no tener trabajo
real: de 433 frames comparados byte a byte contra el arte ya integrado, 427 eran idénticos, 4
eran el mismo frame del Nigromante solo reescalado (misma pose) y 1 (Musashi `basic1`) era en
realidad su propio `idle` de espalda mal etiquetado. No había ninguna pose nueva para los ~13
jefes/subjefes de un solo frame que son el pedido central. No se integró nada de ese zip.

Tampoco hay en esta sesión un generador de imágenes ni acceso a Canva: no puedo dibujar un
campeón nuevo de 16px con la profundidad del arte pintado existente. Lo que sí es un trabajo
genuino y de calidad consistente es un **pack de efectos (VFX)** dibujado con formas
vectoriales propias (Python/PIL, supersampleado 4x + glow aditivo real, bajado con LANCZOS) en
vez de pixel-art de bordes duros -mismo look pintado/suave que el arte real ya existente
(`soulFireProj`, `ronin4`, etc.)-, embebido en `index.html` como el resto del arte del juego
(sin dependencias externas ni scripts que cargar en cada sesión):

- **`ice_crystal`** y **`frost_rune`**: esquirla de hielo facetada y runa nórdica angular,
  reemplazan/acompañan el rombo y las marcas de tick dibujadas por código en Nova de Escarcha
  y Cataclismo del Mago (niveles altos de talento).
- **`scythe_slash`** (4 frames): tajo en arco carmesí que sigue el ángulo real del golpe, para
  el Tajo del Segador.
- **`soul_reap_burst`** (5 frames): vórtice oscuro con una calavera emergiendo, para "Segador
  de Almas" (ulti).
- **`holy_heal_burst`** (4 frames): pilar de luz dorado con una cruz, uno por aliado curado en
  Curación de Área y Bendición Suprema del Soporte.
- **`holy_shield_bubble`** (4 frames, loop perfecto): burbuja hexagonal de energía sobre el
  aliado mientras dura el escudo de equipo.
- **`water_splash`** (4 frames): salpicadura con anillo expansivo y gotas, en cada golpe a un
  enemigo acuático (Arena Acuática).

Todo esto es una capa visual **encima** de habilidades que ya funcionan (no cambia daño, área,
cooldown ni ningún número de balance) y quedó probado con Playwright sin errores de consola en
los 3 campeones tocados (Mago, Segador, Soporte) y en un golpe acuático real.

**Sigue haciendo falta tu ayuda** para lo que esta técnica no puede resolver: las poses nuevas
de personajes/jefes de los ítems CRÍTICO/IMPORTANTE de más arriba (Bestia del Bosque, jefes de
Hielo/Bosque/Laberinto, etc.) necesitan arte pintado real, no formas vectoriales.

---

## POLISH

### Enemigos
| # | Entidad | A producir |
|---|---------|------------|
| P1 | **Escorpión Gigante** (Laberinto) | Hoja limpia: la actual trae casi todo fragmentos de recorte (solo sirven 3 a 4 frames). **Caminata 4 frames** perfil derecha + 3 frames de frente + **ataque de cola 3 frames** |
| P2 | **Gólem de Piedra** (Laberinto) | Mismo problema de recortes. **Caminata 4 frames** perfil derecha + 4 frames de frente + **golpe 3 frames** |
| P3 | **Esfinge** (Laberinto) | **Ataque 3 a 4 frames** (garra o aleteo, perfil derecha). Caminar en las 3 vistas ya existe |
| P4 | **Muertes del Laberinto** (Esfinge, Medusa, Druida, Minotauro) | **Muerte 4 frames** cada uno (hoy el sistema de VFX anima el sprite de caminata cayendo) |
| P5 | ~~**Gólem de Hielo**~~ ✅ | **Integrado** (Pack 4): idle 2, caminar 3, ataque 4, golpe 2, muerte 4 |
| P6 | **Dragoncito de Hielo** | Vuelo 4 + ataque/escupitajo 3 (hoy 1 frame) |
| P7 | **Ángel de Hielo y Cristal** | Vuelo 4 + ataque 3 (hoy 1 frame, 122×105) |
| P8 | ~~**Demonio de Hielo y Fuego**~~ ✅ | **Integrado** (Pack 4, "Demonio de Hielo"): idle 3, caminar 3, ataque 3, golpe 2, muerte 4. **Cambio de diseño:** el pack es un demonio de hielo celeste; el anterior era oscuro con cuernos rojos y hacha. Lanzallamas y Muro de Hielo siguen iguales |
| P9 | **Enjambre de Hadas** | Aleteo en loop de 4 frames (hoy 1 frame) |
| P10 | **Cù-Sìth** | Carrera 4 + mordida 3 (hoy 1 frame) |
| P11 | ~~**Ent**~~ ✅ | **Integrado** con el "Treant Ancestral" del Pack 3: idle 4, caminar 4, ataque 4, golpe 2, muerte 5. **Cambio de diseño:** más grande y frondoso que el Ent anterior |
| P12 | **Dama del Bosque** | Flotación 4 + cast 3 (hoy 1 frame) |
| P13 | **Gólem de fuego y de hielo** (invocación del Nigromante, según talento) | **Pose de ataque 1 frame** para cada uno (el de piedra ya la tiene) |

### Campeones
| # | Campeón | A producir |
|---|---------|------------|
| P14 | **Tanque** | Muerte 4 frames (terminando tendido) |
| P15 | **Asesino** (clave `guerrero`) | Muerte 4 frames |
| P16 | **Soporte** | Muerte 4 frames + **idle animado 3 a 4 frames** (hoy 1) + **golpe recibido 1 frame** |
| P17 | ~~**Segador Olvidado**~~ ✅ | Muerte integrada (Pack 1) |
| P18 | ~~**Axiom**~~ ✅ | Muerte integrada (Pack 1) |
| P19 | **La Profeta** | Muerte 4 frames |
| P20 | **Sylva** | Muerte 4 frames + **golpe recibido 1 frame** |

(Mago, Musashi y Nigromante ya tienen pose de muerte real.)

### Efectos de habilidades (hoy dibujados por código)
| # | Habilidad | A producir |
|---|-----------|------------|
| P21 | ~~**Soporte**: curación y escudo~~ ✅ | **Resuelto** (ver "Pack de VFX propio" más abajo): pilar de luz + cruz 4 frames y burbuja hexagonal en loop 4 frames |
| P22 | ~~**Segador**: Tajo del Segador y "Segador de Almas" (ulti)~~ ✅ | **Resuelto**: tajo en arco 4 frames (sigue el ángulo real del golpe) y vórtice de almas con calavera 5 frames |
| P23 | **Mago**: Nova de Escarcha y Cataclismo | Parcial ✅: cristal de hielo y runa nórdica reales (reemplazan/acompañan el rombo y las marcas de tick dibujados por código en los niveles altos de talento). Falta: anillo cenital propio de la Nova y un efecto de impacto propio para el Cataclismo (hoy usa rayos encadenados, no un meteoro) |

### Reexportaciones de arte que YA existe (no hay que dibujar, solo exportar limpio)
| # | Material | Problema | Qué hace falta |
|---|----------|----------|----------------|
| P24 | **La Profeta: láminas de habilidades** (Destino Restaurado, Visión del Inmortal, Danza del Augurio, Ascensión del Elegido) | Son láminas de presentación con fondo oscuro y texto | Exportar cada efecto por separado, con fondo transparente y en frames sueltos |
| P25 | **Nigromante: `demon_soul_slash`** | Trae incrustado el texto "…ADES EN FORMA DEM…" | Mismo frame, sin el texto |
| P26 | **Lobo Glacial (pack completo)** | Los recortes traen etiquetas ("down_1", "left_2"…) y pedazos de frames vecinos | Reexportar cada frame limpio (idle, walk ×4 direcciones, attack, hurt, death, charge, howl/aura, swipe, summon, vfx) |

---

## No producir: ya entregado (actualizado tras el sprint de integración, commit `afdd233`)

Este arte ya está en los zips que mandaste. Lo tachado ✅ ya se integró (sin cambios de
gameplay/balance); el resto sigue disponible para un próximo sprint, **no hay que producirlo
de nuevo**:

- **Musashi**: ✅ `ronin_01-04` (Corte del Rōnin), ✅ `ghost_01-04` (Paso Fantasma, además
  corrigió un bug: la habilidad nunca dibujaba sus estelas), ✅ `thousand_01-04` (Mil Cortes),
  ✅ `ulti_portal` y ✅ `ulti_finish` (banners de Último Duelo). Sin integrar: `walk` (no
  hay un estado de movimiento distinto donde usarlo), `ulti_cast`, `ulti_faceoff`.
- **Sylva**: ✅ `piercing_top_01/02` (carga y disparo de Flecha Perforante) y ✅
  `piercing_bottom_02` recortado (impacto crítico sobre la Presa), ✅ `rain_top_01`
  (Lluvia de la Cazadora), ✅ `trap_top_01` (crecimiento de la Trampa del Bosque). Sin
  integrar: `piercing_bottom_01` (escena de perforar varios enemigos, más compleja de
  recortar), ataque rápido (`rapid_attack_01/02`), movimiento (`movement_*`: esquivar,
  correr, saltar -sin una habilidad propia donde encajarlos-), `ultimate_01`.
- **Nigromante**: ✅ `idle_01-05` y ✅ `walk_01-06` (ciclos reales, antes 1 y 2 frames), ✅ 2
  de los `summon_skeleton_01-09` (materialización) y ✅ 1 de los `summon_golem_01-04`, ✅ 2
  de los `skeleton_variant_01-08` (caminata del esqueleto guerrero invocado). Sin integrar:
  `sprint_01-06` (no hay un estado de "correr" distinto de caminar), `damage_death_01-05`
  (ya tenía pose de muerte real de un sprint anterior), el resto de `summon_skeleton`/
  `summon_golem`/`skeleton_variant`, `plague_01-09` (pose de cast del propio Nigromante,
  distinta de los `ground1-3` ya integrados antes).
- **Arena Acuática**: ✅ 4 de los ~68 recortes (segundo frame de idle para tiburón joven,
  tiburón blanco, cangrejo y medusa). Sin integrar: el resto (~64), incluida la muerte del
  tiburón con sangre y variantes de ataque de cangrejo/medusa/sirena.
- **Demonio de Hielo y Fuego**: sin integrar. `lanzallamas_1-4`, `muro_1-4`, `estalactitas`
  son habilidades que hoy no existen en el juego: usarlas implica diseñar una habilidad
  nueva para un enemigo existente (cambio de gameplay/balance), no solo cablear arte. Se
  evaluó en este sprint y se decidió no tocarlo sin tu confirmación explícita.
- **Demonio Nigromántico**: `demon_colossus_slam` y `demon_soul_slash` (el tajo) siguen sin
  integrar: son recortes con un texto de rótulo ("…DEMONÍACA…"/"…FORMA DEM…") pegado
  encima que ocupa casi todo el ancho -no se puede recortar sin perder la pose-, necesitan
  una reexportación limpia tuya (ver P25 más arriba). `demon_soul_fire_cast` y
  `demon_soul_fire_projectile` sí se integraron (✅) como pose de cast y destello
  decorativo de la Plaga mientras el Nigromante está transformado.

---

## Resumen de conteo

- **CRÍTICO**: queda 1 de 5 (Bestia del Bosque, C4). Resueltos: Segador, Axiom, Duende y
  Guardián del Laberinto.
- **IMPORTANTE**: quedan 11 de 13. Resueltos: Zombi y Esqueleto Cornudo. Pendientes: los 3 jefes
  finales de un frame, Tundraverx, los 4 Dobladores, el Minotauro, los efectos del Demonio Mayor
  y las ruinas de la Arena Divina.
- **POLISH**: quedan 21 de 26. Resueltos: muertes del Segador y de Axiom, Gólem de Hielo, Demonio
  de Hielo y Fuego y Ent.
