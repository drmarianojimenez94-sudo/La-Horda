# VISUAL_ASSET_MANIFEST — LA HORDA VISUAL GATE

Estado de cada entidad visual importante contra `docs/ART_BIBLE.md` (Master Reference: el
Caballero/Tanque). `PASS` = coincide con la Art Bible. `FIX` = defecto técnico corregido sin
rediseñar. `REDRAW` = pertenece a otra dirección artística o el arte fuente es demasiado chico
para leerse — ver `docs/ART_REPLACEMENT_QUEUE.md`.

Método: hoja de contacto (Roster Visual Test) de los 10 campeones × 6 estados y de ~30
enemigos/jefes × 3 estados, misma escala/fondo/iluminación, sin VFX, generada con el propio
motor de dibujo del juego (`tools/art/../..` capturas en la sesión de auditoría), más escaneo
técnico (`tools/art/scan_sprites.py`).

## 1. Campeones (prioridad máxima — son lo que más tiempo mira el jugador)

| Campeón | Estado | Problema | Acción |
|---|---|---|---|
| Tanque | **PASS** | — es el Master Reference | Mantener |
| Guerrero (Asesino) | **PASS** | Misma familia chibi que la referencia | Mantener |
| Mago | **PASS** | Misma familia chibi | Mantener |
| Soporte | **PASS** | Misma familia chibi | Mantener |
| Segador Olvidado | **PASS** (redraw integrado) | — hoja nueva, FIX técnico al recortar | Mantener |
| Axiom | **REDRAW** | Proporciones altas, armadura muy detallada/pintada | Hoja nueva pendiente (próxima entrega) |
| La Profeta | **PASS** (redraw integrado) | — hoja nueva, FIX técnico al recortar | Mantener |
| Musashi | **PASS** (redraw integrado) | — hoja nueva, FIX técnico al recortar | Mantener |
| La Cazadora (antes "Sylva") | **PASS** (redraw integrado) | — hoja nueva, FIX técnico al recortar | Mantener |
| Nigromante | **REDRAW** | Tinta/pintado, proporciones altas; frames cortados por el borde | Hoja nueva pendiente (próxima entrega) |

**Conclusión del roster:** 8 de 10 campeones ya son de la misma familia chibi del Master Reference
(Roster Visual Test + prueba en partida real junto a bots Tanque/Mago/Soporte). Quedan Axiom y
Nigromante, con hoja nueva anunciada.

### Redraw integrado (hojas "La Horda — estilo oficial")
Recortadas con `tools/art/redraw/` desde `art-source/redraw/` → un atlas por entidad en
`assets/sprites/.../v2/atlas.png`. FIX aplicado (solo técnico): fondo cuadriculado rasterizado,
rótulos, divisores de celda, sombras de piso pintadas, halo de glow sobre gris (el glow se convirtió
en brillo translúcido, no se borró). Cuerpo por estado: idle, caminar ↓/←/→/↑ (izquierda con sus
propios cuadros, no espejo), ataque básico, lanzamiento de habilidad (hab. 1 "preparación" de cada
hoja), golpe, muerte; La Cazadora además "Apuntando" mientras carga Flecha Perforante.
- **Mapeo por el código, no por los títulos de la hoja:** cualquier habilidad usa la pose de
  lanzamiento; los VFX de cada habilidad siguen siendo los del código (no se reemplazaron).
- **No integrado a propósito:** cuadros de VFX/impacto de las hojas (el juego ya los tiene), summons
  que no existen en el código (esqueletos del Segador, ángel/espada/espíritu de La Profeta), las
  posturas de Musashi (vienen dibujadas ~15% más grandes que su cuerpo: saltaría de tamaño) y la
  escena del tatami (panel con fondo opaco; la arena de duelo existente se mantiene).
- **Arte viejo apagado para no mezclar estilos:** banners `musashiRoninImpact`/`musashiFinish` y
  `sylvaPiercingCrit` (dibujaban al Musashi/Sylva viejos); la estela de Paso Fantasma ahora es una
  copia translúcida del cuerpo nuevo. Los PNG viejos quedan solo como respaldo si el atlas no carga.
- **La Profeta:** la hoja nueva cambia pelo (claro) y arma (báculo dorado en vez de hojas turquesa):
  es arte entregado por el equipo como canon, se integró tal cual.

### FIX aplicados a campeones REDRAW (mientras no hay arte nuevo, no deben verse peor)
- Nigromante: halo del fondo quitado, agujeros rellenados, alfa nítido, contorno 1px (sprint anterior).
- Musashi, Sylva: agujeros y fragmentos de frames vecinos limpiados, contorno 1px.
- Segador, Axiom: halo/fragmentos limpiados, contorno 1px.
- Musashi/Nigromante: el ataque básico usa solo los cuadros completos (los cortados por el borde quedaron descartados, ver `js/rendering/champion-sprites.js`).
- Soporte: el lanzamiento ya no salta a un dibujo distinto (cuadros 3–5 del atlas eran otro arte).

## 2. Bosses / jefes finales de arena

| Jefe | Arena | Estado | Nota |
|---|---|---|---|
| Jinete Sin Cabeza | Bosque | **PASS** | familia "boss pintado", permitida por más detalle/escala (Art Bible §9) |
| Mago de Hielo y Cristal | Hielo | **PASS** | ídem — se transforma en Ángel Caído |
| Ángel Caído de Hielo | Hielo (fase 2) | **PASS** | ídem |
| Minotauro | Laberinto | **PASS** | ídem |
| Leviatán | Acuática | **PASS** | muy detallado (serpiente/dragón segmentado); consistente como boss-tier |
| Demonio Mayor | Infernal | **PASS** | ídem; comparable en espíritu a la referencia "Diablo Prime" enviada |

## 3. Subjefes / élites

| Entidad | Arena | Estado | Nota |
|---|---|---|---|
| Guardián del Laberinto | Laberinto | **PASS** | boss-tier pintado |
| Kraken Joven | Acuática | **PASS** | boss-tier pintado, algo "ruidoso" en el borde pero legible |
| Dragón de Hielo (Tundraverx) | Hielo | **PASS** | |
| Esfinge | Laberinto | **PASS (FIX)** | halo limpiado |
| Druida de Arena | Laberinto | **PASS (FIX)** | halo limpiado |
| Medusa | Laberinto | **PASS (FIX)** | halo limpiado |
| Doppelgänger — Guerrero/Arquera/Pícaro/Clérigo | Bosque | **PASS (FIX)** | redraw integrado (antes "Dobladores"). Mapeo por mecánica: guerrero→Caballero, pícaro→Guerrero, arquera→Arquero, clérigo→Soporte; el Doppelgänger Mago de la hoja no se usó (no existe en el código). Sin fila de "golpe" en la hoja: usa idle + el destello de golpe del motor. Residual menor: tinte translúcido dentro del arco del Arquero (es el glow del dibujo) |
| Ángel de Hielo y Cristal | Hielo | **PASS (FIX)** | halo limpiado, es pálido por diseño (hielo), no confundir con halo |
| Golem de Hielo | Hielo | **PASS (FIX)** | tenía un parche gris grande de fondo, quitado |
| Demonio de Hielo y Fuego | Hielo | **PASS (FIX)** | ídem, era el más afectado (parche gris visible detrás del personaje) |
| Tiburón Blanco | Acuática | **PASS (FIX)** | halo menor |
| Dama del Bosque | Bosque | **PASS (FIX)** | redraw integrado: idle/caminar/ataque/golpe/muerte. Sigue siendo élite ranged (no se le agregaron las habilidades de jefa que sugiere la hoja: látigo, invocación, tormenta, forma espectral) |

## 4. Enemigos comunes / normales

| Entidad | Estado | Nota |
|---|---|---|
| Esqueleto, Zombi, Demonio Menor, Gólem, Demonio Hechicero (Infernal) | **PASS** | familia simple, consistente entre sí y con el tono chibi |
| Esqueleto Cornudo | **PASS (FIX)** | fragmentos de recorte limpiados |
| Duende del Bosque | **PASS (FIX)** | halo visible (blanco alrededor de cuernos/brazo) limpiado en las 16 poses |
| Lobo Ártico, Escorpión Gigante, Gólem de Piedra | **PASS (FIX)** | halo limpiado; quedan residuos menores (ver §6) |
| Dragón de Hielo bebé (Dragoncito) | **PASS** | |
| Ent, Bestia del Bosque, Enjambre de Hadas, Cù-Sìth | **PASS** | |
| Tiburón Joven, Medusa Eléctrica, Cangrejo Acorazado, Sirena Abisal, Anguila Eléctrica | **PASS** | familia Arena Acuática, consistente |

## 5. Invocaciones (summons)

| Entidad | Campeón | Estado | Nota |
|---|---|---|---|
| Esqueleto guerrero/mago | Nigromante | **PASS** | arte propio, ya normalizado |
| Gólem del Nigromante | Nigromante | **PASS** | |
| Forma Demonio (Encarnación del Abismo) | Nigromante | **PASS** | |
| Lobo Espectral | Sylva | **PASS** | |
| Guardianes de Cristal | Mago de Hielo (jefe) | **PASS** | reusa el gólem de hielo |

## 6. Residuales menores (no bloquean, quedan para un futuro pase técnico)

Halos pequeños (16–50px, muy por debajo del umbral que se ve a simple vista) en: Axiom
(idle/walk, ~10 frames), Musashi (`ronin2`, `thousand4`, `ultiFinish/Portal` — sin tocar
`ghost1-4`: es la estela translúcida de Paso Fantasma, VFX intencional, no un halo), La Profeta
(`atlas.png`), Soporte (`atlas.png`), Cazadora (fragmentos chicos en `atk*`), Lobo Ártico,
Esfinge, Gólem de Piedra, Ángel de Hielo, Gólem de Hielo, Tiburón Blanco. Ninguno es visible a la
escala de juego; se dejan documentados para cuando se toque cada asset por otro motivo. **No**
se tocó `champions/{tanque,guerrero,mago,soporte}/atlas.png` (Master Reference y su familia): se
detectó algo de antialiasing normal, pero no hay motivo para arriesgar el asset canon.

## 7. Assets cargados pero nunca dibujados (fuera del alcance del Visual Gate)

Ninguno detectado en esta pasada: se verificó que `medusa`, `druida_arena`, `escorpion_gigante`,
`golem_piedra`, `esfinge`, `cu_sith` (con `visualAlias` en `ENEMY_BASE`, dato legado) sí tienen
arte real propio cableado (`REAL_ANIM_ATLASES`/`ICE_REAL`) que se dibuja antes de llegar al
alias — el campo `visualAlias` en esos casos ya no se usa, es dato muerto pero inofensivo.
