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
| C1 | **Segador Olvidado** | Campeón | 3 imágenes quietas (abajo/perfil/arriba, ~100×90 px), sin caminata ni ataque | **Caminata 4 frames × 3 vistas** (abajo, perfil derecha, arriba) + **ataque básico 4 frames** (perfil derecha; ideal también abajo y arriba) |
| C2 | **Axiom** | Campeón | 3 imágenes quietas (abajo/perfil/arriba, ~60×108 px) | **Caminata 4 frames × 3 vistas** + **ataque/cast 4 frames** (perfil derecha; ideal también abajo y arriba). Sus efectos de habilidades YA existen |
| C3 | **Duende del Bosque** | Ruinas del Bosque, común | Usa el sprite del Esqueleto (prestado) | Sprite propio: **caminata 4 frames** (perfil derecha; ideal también abajo y arriba) + **ataque 3 frames** |
| C4 | **Bestia del Bosque** | Ruinas del Bosque, subélite | Usa el sprite del Zombi (prestado) | Sprite propio: **caminata 4 frames** (perfil; ideal también abajo y arriba) + **ataque 3 frames** |
| C5 | **Guardián del Laberinto** | Laberinto Maldito, subjefe | Usa el sprite del Gólem (prestado) | Sprite propio: **caminata 4 frames** (perfil; ideal también abajo y arriba) + **golpe/slam 4 frames** |

---

## IMPORTANTE

| # | Entidad | Arena / rol | Hoy | A producir |
|---|---------|-------------|-----|------------|
| I1 | **Jinete Sin Cabeza** | Ruinas del Bosque, jefe final | 1 frame (54×50) | **Galope 4 frames** (perfil derecha) + **ataque 4 frames**. Opcional: pose de "Resurrección Eterna" (2 a 3 frames) |
| I2 | **Mago de Hielo y Cristal** | Hielo, jefe final (fase 1) | 1 frame (38×44). Los efectos de Ventisca, Nova y Armadura YA existen | **Caminata o flotación 4 frames** + **cast 3 frames** |
| I3 | **Ángel Caído de Hielo** | Hielo, jefe final (fase 2) | 1 frame (42×43) | **Vuelo/caminata 4 frames** + **ataque 4 frames** |
| I4 | **Tundraverx (Dragón de Hielo)** | Hielo, élite/jefe intermedio | 1 frame (39×38). El Aliento y la Nova (con el cuerpo incluido) YA existen | **Vuelo/caminata 4 frames** (perfil derecha) |
| I5 | **Doblador — Guerrero** | Bosque, subjefe | 1 frame (32×38) | **Caminata 4 frames** + **ataque 3 frames** |
| I6 | **Doblador — Arquera** | Bosque, subjefe | 1 frame (25×40) | **Caminata 4 frames** + **disparo 3 frames** |
| I7 | **Doblador — Pícaro** | Bosque, subjefe | 1 frame (30×40) | **Caminata 4 frames** + **ataque 3 frames** |
| I8 | **Doblador — Clérigo** | Bosque, subjefe | 1 frame (22×33) | **Caminata 4 frames** + **cast 3 frames** |
| I9 | **Minotauro** | Laberinto, jefe final | La tira real solo trae perfil caminando (derecha) y espalda (3 frames) | **Ataque 4 frames** (perfil derecha: embestida o hachazo) + **caminata de frente 4 frames** (vista abajo) |
| I10 | **Demonio Mayor — efectos** | Arena Infernal, jefe | El cuerpo tiene atlas real; el **aliento** y la **onda** se dibujan por código | **Aliento de fuego 4 a 6 frames** (efecto, dirección derecha) + **onda expansiva 4 frames** (anillo/golpe al suelo, vista cenital) |
| I11 | **Zombi** | Arena Infernal, común | Sprite dibujado por código (no es arte real) | **Caminata 4 frames** (perfil; ideal también espalda) + **ataque 2 frames** + **golpe recibido 1 frame** |
| I12 | **Esqueleto Cornudo** | Arena Infernal, subélite | Sprite dibujado por código | **Caminata 4 frames** (perfil; ideal también espalda) + **ataque 2 frames** |
| I13 | **Arena Divina — ruinas** | Estructuras | La torre y el castillo destruidos son rectángulos dibujados por código | **Torre destruida 1 frame** (~160×217, misma escala que la torre) + **Castillo destruido 1 frame** (~260×139). Opcional: derrumbe de 3 frames |

---

## POLISH

### Enemigos
| # | Entidad | A producir |
|---|---------|------------|
| P1 | **Escorpión Gigante** (Laberinto) | Hoja limpia: la actual trae casi todo fragmentos de recorte (solo sirven 3 a 4 frames). **Caminata 4 frames** perfil derecha + 3 frames de frente + **ataque de cola 3 frames** |
| P2 | **Gólem de Piedra** (Laberinto) | Mismo problema de recortes. **Caminata 4 frames** perfil derecha + 4 frames de frente + **golpe 3 frames** |
| P3 | **Esfinge** (Laberinto) | **Ataque 3 a 4 frames** (garra o aleteo, perfil derecha). Caminar en las 3 vistas ya existe |
| P4 | **Muertes del Laberinto** (Esfinge, Medusa, Druida, Minotauro) | **Muerte 4 frames** cada uno (hoy el sistema de VFX anima el sprite de caminata cayendo) |
| P5 | **Gólem de Hielo** | Caminata 4 + ataque 3 (hoy 1 frame, 91×92) |
| P6 | **Dragoncito de Hielo** | Vuelo 4 + ataque/escupitajo 3 (hoy 1 frame) |
| P7 | **Ángel de Hielo y Cristal** | Vuelo 4 + ataque 3 (hoy 1 frame, 122×105) |
| P8 | **Demonio de Hielo y Fuego** | Caminata 4 + ataque 3 (hoy 1 frame, 146×110). Ver también "No producir": lanzallamas y muro |
| P9 | **Enjambre de Hadas** | Aleteo en loop de 4 frames (hoy 1 frame) |
| P10 | **Cù-Sìth** | Carrera 4 + mordida 3 (hoy 1 frame) |
| P11 | **Ent** | Caminata 4 + golpe 3 (hoy 1 frame) |
| P12 | **Dama del Bosque** | Flotación 4 + cast 3 (hoy 1 frame) |
| P13 | **Gólem de fuego y de hielo** (invocación del Nigromante, según talento) | **Pose de ataque 1 frame** para cada uno (el de piedra ya la tiene) |

### Campeones
| # | Campeón | A producir |
|---|---------|------------|
| P14 | **Tanque** | Muerte 4 frames (terminando tendido) |
| P15 | **Asesino** (clave `guerrero`) | Muerte 4 frames |
| P16 | **Soporte** | Muerte 4 frames + **idle animado 3 a 4 frames** (hoy 1) + **golpe recibido 1 frame** |
| P17 | **Segador Olvidado** | Muerte 4 frames (además de C1) |
| P18 | **Axiom** | Muerte 4 frames (además de C2) |
| P19 | **La Profeta** | Muerte 4 frames |
| P20 | **Sylva** | Muerte 4 frames + **golpe recibido 1 frame** |

(Mago, Musashi y Nigromante ya tienen pose de muerte real.)

### Efectos de habilidades (hoy dibujados por código)
| # | Habilidad | A producir |
|---|-----------|------------|
| P21 | **Soporte**: curación y escudo | Burst de curación 4 a 6 frames + burbuja o escudo en loop de 4 frames |
| P22 | **Segador**: habilidades y "Segador de Almas" (ulti) | Tajo de guadaña 4 frames + efecto de ulti 6 frames |
| P23 | **Mago**: Nova de Escarcha y Cataclismo | Nova 5 a 6 frames (anillo cenital) + Cataclismo 6 frames (meteoro o impacto) |

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

- **CRÍTICO**: 5 entidades (2 campeones sin animación; 3 enemigos con arte prestado).
- **IMPORTANTE**: 13 ítems (3 jefes finales, 5 subjefes o élites, el Minotauro, los efectos del
  Demonio Mayor, 2 comunes dibujados por código y las ruinas de la Arena Divina).
- **POLISH**: 26 ítems (enemigos de un frame, muertes, efectos y 3 reexportaciones).
