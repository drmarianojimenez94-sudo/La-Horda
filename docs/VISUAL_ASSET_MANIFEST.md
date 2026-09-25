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
| Segador Olvidado | **REDRAW** | Proporciones "heroicas" pintadas (no chibi), densidad de píxel y sombreado incompatibles con la referencia | Ver cola de reemplazo |
| Axiom | **REDRAW** | Ídem — armadura muy detallada, proporciones altas | Ver cola de reemplazo |
| La Profeta | **REDRAW** | Ídem — estilo más ilustrado/anime, proporciones altas | Ver cola de reemplazo |
| Musashi | **REDRAW** | Ídem — proporciones adultas realistas | Ver cola de reemplazo |
| Sylva (Cazadora) | **REDRAW** | Ídem — proporciones adultas realistas | Ver cola de reemplazo |
| Nigromante | **REDRAW** | Ídem — tinta/pintado, proporciones altas; además cortado por el borde en varios frames (ver abajo) | Ver cola de reemplazo |

**Conclusión del roster:** el juego tiene HOY dos familias de proporción conviviendo (chibi:
Tanque/Guerrero/Mago/Soporte — y "heroica pintada": los otros 6). La Art Bible fija la chibi
como canon porque es la del Master Reference. Esto es lo que un jugador nuevo notaría primero
("no parecen del mismo juego"): 6 de 10 campeones necesitan redibujarse para unificar.

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
| Doblador — Guerrero/Arquera/Pícaro/Clérigo (los 4 "Dobladores") | Bosque | **REDRAW** | fuente muy chica (22–32px) y borrosa incluso ampliada — ver cola |
| Ángel de Hielo y Cristal | Hielo | **PASS (FIX)** | halo limpiado, es pálido por diseño (hielo), no confundir con halo |
| Golem de Hielo | Hielo | **PASS (FIX)** | tenía un parche gris grande de fondo, quitado |
| Demonio de Hielo y Fuego | Hielo | **PASS (FIX)** | ídem, era el más afectado (parche gris visible detrás del personaje) |
| Tiburón Blanco | Acuática | **PASS (FIX)** | halo menor |
| Dama del Bosque | Bosque | **REDRAW** | fuente de 20×31px, ilegible incluso ampliada — ver cola |

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
