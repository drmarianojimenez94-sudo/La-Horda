# LA HORDA — Auditoría de Artgate (hojas nuevas)

## Hojas analizadas

- **H12** — art-source/hielo_jefes/mago_hielo_cristal_sheet.png (12 · Mago de Hielo y Cristal + Gólem de Cristal + esbirros)
- **H13** — art-source/hielo_jefes/angel_caido_hielo_sheet.png (13 · Ángel Caído de Hielo)
- **HMI** — art-source/hielo_jefes/minotauro_sheet.png (Minotauro de capa roja + fuego)
- **HI4** — art-source/hielo_jefes/jefes_I1_I4_sheet.png (I1 Jinete · I2 Mago · I3 Ángel · I4 Tundraverx, versión resumida)
- **P79** — art-source/pack_canon/img7_img9_profeta_nigro_minotauro.png (IMG 7 reexports Profeta/Nigromante · IMG 9 Minotauro)
- **P56** — art-source/pack_canon/img5_img6_campeones_b_vfx.png (IMG 5 campeones B y ajustes · IMG 6 VFX)
- **P34** — art-source/pack_canon/img3_img4_bosque_campeones_a.png (IMG 3 bosque y elementales · IMG 4 campeones A)
- **P13** — art-source/pack_canon/img1_img3_laberinto_hielo_bosque.png (IMG 1 laberinto · IMG 2 y 3 versiones cortas)
- **P2** — art-source/pack_canon/img2_hielo_menores.png (IMG 2 hielo menores, versión completa)

## Canon seleccionado y reemplazos

| Entidad | Decisión | Canon | Alternativas descartadas |
|---|---|---|---|
| Mago de Hielo y Cristal (GUARDIÁN: el Mago Gélido, uno de los Cuatro) | CANONICAL_SET · REPLACE_FULL_SET | art-source/hielo_jefes/mago_hielo_cristal_sheet.png → assets/sprites/bosses/hielo/mago_hielo_cristal/v2/atlas.png | jefes_I1_I4 fila I2 → DUPLICATE (mismo diseño, menos animaciones) · static.png → reemplazado |
| Guardián Élfico Ancestral (GUARDIÁN) → jefe del Bosque "Guardián Ancestral Corrompido" | CANONICAL_SET (BUGFIX 01) | art-source/guardian_elfico/guardian_elfico_ancestral.png → .../bosses/bosque/guardian_ancestral/atlas.png (+ atlas_furia.png) | — |
| Ángel Caído de Hielo (jefe de Hielo, fase 2) | CANONICAL_SET · REPLACE_FULL_SET | art-source/hielo_jefes/angel_caido_hielo_sheet.png → .../angel_caido_hielo/v2/atlas.png | fila I3 → DUPLICATE · gárgola → reemplazada (el nombre pide un ángel) |
| Jinete Sin Cabeza (jefe del Bosque) | CANON_SELECTED_BUT_INCOMPLETE · REPLACE_FULL_SET | art-source/hielo_jefes/jefes_I1_I4_sheet.png fila I1 → .../jinete_sin_cabeza/v2/atlas.png | static.png → reemplazado |
| Minotauro (jefe del Laberinto) | CANONICAL_SET · REPLACE_FULL_SET | art-source/pack_canon/img7_img9 · IMG 9 → assets/sprites/bosses/laberinto/minotauro/v3/atlas.png | walk-strip → reemplazado (sin ataque ni muerte) · minotauro_sheet cuerpo → REJECT_INCONSISTENT (otro diseño, incompleto) · IMG 1 muerte → REJECT_INCONSISTENT (otro diseño) |
| Tundraverx, Soberano de Hielo (élite/jefe intermedio) | CANON_SELECTED_BUT_INCOMPLETE · REPLACE_FULL_SET | jefes_I1_I4_sheet.png fila I4 → assets/sprites/enemies/hielo/dragon_hielo/v2/atlas.png | static.png → reemplazado |
| Gólem de Cristal (guardián invocado por el Mago) | CANONICAL_SET (entidad nueva) | hoja 12 → assets/sprites/enemies/hielo/golem_cristal/atlas.png | variantes → no se usan (el Hielo ya tiene su paleta) |
| Servo de Cristal / Cristal Volador (esbirros del Mago) | CANONICAL_SET (entidades nuevas) | hoja 12 → .../cristal_servo y .../cristal_volador | — |
| Dragoncito de Hielo (élite) | CANONICAL_SET · REPLACE_FULL_SET | P2 (IMG 2 completa) → assets/sprites/enemies/hielo/dragoncito_hielo/v2/atlas.png | P13 → DUPLICATE · static.png → reemplazado |
| Ángel de Hielo y Cristal (élite) | CANONICAL_SET · REPLACE_FULL_SET | P2 (IMG 2 completa) → assets/sprites/enemies/hielo/angel_hielo/v2/atlas.png | P13 → DUPLICATE · static.png → reemplazado |
| Enjambre de Hadas (minions del Bosque) | CANONICAL_SET · REPLACE_FULL_SET | P2 (IMG 2 completa) → assets/sprites/enemies/bosque/enjambre_hadas/v2/atlas.png | P13 → DUPLICATE · variantes → no se usan |
| Cù-Sìth (élite del Bosque) | CANONICAL_SET · REPLACE_FULL_SET | P34 (IMG 3 con hurt) → assets/sprites/enemies/bosque/cu_sith/v2/atlas.png | P13 → DUPLICATE · static.png → reemplazado |
| Gólem del Infernal ("Gólem") | CANON_SELECTED_BUT_INCOMPLETE · REPLACE_FULL_SET | P34 IMG 3 "Gólem de Fuego" → assets/sprites/enemies/infernal/golem/v2/atlas.png | gris → reemplazado |
| Gólem de Piedra (subjefe del Laberinto) | CANON_SELECTED_BUT_INCOMPLETE · REPLACE_FULL_SET | P13 IMG 1 → assets/sprites/enemies/laberinto/golem_piedra/v2/atlas.png | walk-strip → reemplazado |

## Conservados (el actual es mejor o está completo)

| Entidad | Decisión | Canon | Qué se descartó y por qué |
|---|---|---|---|
| Guardián del Laberinto (GUARDIÁN) | USE (sin cambios) | assets/sprites/bosses/laberinto/guardian_laberinto/ (Pack 3, integrado antes) | — |
| El Hechicero (GUARDIÁN, sin revelar) | USE (sin cambios) | assets/sprites/bosses/infernal/hechicero/atlas.png (integrado en H1) | — |
| Gólem de Hielo | USE (se conserva) | assets/sprites/enemies/hielo/golem_hielo/ (Pack 3) | variante → DUPLICATE (menos animaciones; y el Hielo ya tiene el Gólem de Cristal azul oscuro: con la variante habría dos gólems iguales) |
| Dama del Bosque (jefa) | USE (se conserva) | assets/sprites/enemies/bosque/dama_bosque/v2/atlas.png (redraw RD6) | P34 → REJECT_INCONSISTENT (otro diseño: cambiaría la identidad de una jefa ya completa) |
| Esfinge · Medusa · Druida de Arena (Laberinto) | USE (se conservan) | walk-strip.png actuales | las 3 muertes → REJECT_INCONSISTENT: Esfinge con alas azules (la actual no tiene), Medusa de piel verde (la actual es de piel clara), Druida con astas (el actual es encapuchado). Mezclarlas sería un Frankenstein. |
| Tanque (Caballero) (campeón) | USE (se conserva) · lo nuevo: PARTIAL_USE (solo VFX) | assets/sprites/champions/tanque/atlas.png (referencia maestra de la biblia de arte) | P34 IMG 4 Tanque → REJECT_INCONSISTENT: es otro diseño de personaje (proporciones realistas, otra cara/ropa/arma) frente al roster chibi de 13 campeones, y no trae las vistas de espaldas/izquierda que usa el juego. Cambiar uno solo rompe el roster. |
| Asesino / Segador Olvidado (campeón) | USE (se conserva) · lo nuevo: PARTIAL_USE (solo VFX) | guerrero/atlas.png y segador/v2/atlas.png | P34 IMG 4 Asesino → REJECT_INCONSISTENT: es otro diseño de personaje (proporciones realistas, otra cara/ropa/arma) frente al roster chibi de 13 campeones, y no trae las vistas de espaldas/izquierda que usa el juego. Cambiar uno solo rompe el roster. |
| Soporte (Curador) (campeón) | USE (se conserva) · lo nuevo: PARTIAL_USE (solo VFX) | soporte/atlas.png | P34 IMG 4 Soporte → REJECT_INCONSISTENT: es otro diseño de personaje (proporciones realistas, otra cara/ropa/arma) frente al roster chibi de 13 campeones, y no trae las vistas de espaldas/izquierda que usa el juego. Cambiar uno solo rompe el roster. |
| La Profeta (campeón) | USE (se conserva) · lo nuevo: PARTIAL_USE (solo VFX) | profeta/v2/atlas.png (redraw RD3) | P56 IMG 5 Profeta + P79 IMG 7 reexports → REJECT_INCONSISTENT: es otro diseño de personaje (proporciones realistas, otra cara/ropa/arma) frente al roster chibi de 13 campeones, y no trae las vistas de espaldas/izquierda que usa el juego. Cambiar uno solo rompe el roster. |
| La Cazadora (Sylva) (campeón) | USE (se conserva) · lo nuevo: PARTIAL_USE (solo VFX) | cazadora/v2/atlas.png (redraw RD5) | P56 IMG 5 Sylva → REJECT_INCONSISTENT: es otro diseño de personaje (proporciones realistas, otra cara/ropa/arma) frente al roster chibi de 13 campeones, y no trae las vistas de espaldas/izquierda que usa el juego. Cambiar uno solo rompe el roster. |
| Musashi (campeón) | USE (se conserva) · lo nuevo: PARTIAL_USE (solo VFX) | musashi/v2/atlas.png | P56 ajuste de ataque básico → REJECT_INCONSISTENT: es otro diseño de personaje (proporciones realistas, otra cara/ropa/arma) frente al roster chibi de 13 campeones, y no trae las vistas de espaldas/izquierda que usa el juego. Cambiar uno solo rompe el roster. |
| Nigromante (campeón) | USE (se conserva) · lo nuevo: PARTIAL_USE (solo VFX) | nigromante/v2/atlas.png | P56 idle limpio · P79 Demon Soul Slash · demonio slam → REJECT_INCONSISTENT: es otro diseño de personaje (proporciones realistas, otra cara/ropa/arma) frente al roster chibi de 13 campeones, y no trae las vistas de espaldas/izquierda que usa el juego. Cambiar uno solo rompe el roster. |
| Duende · Zombi · Lobo Espectral · Demonio Nigromántico (ajustes) | USE (se conservan) | packs actuales | → REJECT_INCONSISTENT: los "ajustes" vienen redibujados con otro diseño (otra paleta/anatomía) y mezclarlos con el set actual cambia al personaje a mitad de animación. |

## VFX

| Origen | Contenido | Decisión |
|---|---|---|
| Minotauro (IMG 9) | onda sísmica, impacto de hacha, polvo/rocas, traza de embestida, aura de furia | USE — reemplazan al fuego/lava de minotauro_sheet (el canon trae los suyos) |
| Mago Gélido (hoja 12) | lanza de cristal, estallido, runa, impacto, muro, cristal flotante | USE |
| Ángel Caído (hoja 13) | nova, pilar, runa, estallido, impacto, muros | USE (nova en Alas de Ventisca; el resto en biblioteca) |
| Dragoncito / Ángel élite / Hadas (IMG 2) | proyectiles e impactos de hielo | USE con su entidad |
| Gólem de Fuego (IMG 3) | proyectil, impacto | USE con su entidad |
| Gólem de Piedra (IMG 1) | impacto de rocas | USE con su entidad |
| IMG 6 Mago (Nova anular, Cataclismo) | anillo de nova 14 cuadros · cataclismo 16 cuadros | PARTIAL_USE — biblioteca; no se engancharon a habilidades en este pase |
| IMG 6 VFX globales | impacto físico/mágico, auras buff/debuff, teletransporte, curación, explosión elemental, congelación, rayo, círculo rúnico, bolas, partículas | PARTIAL_USE — biblioteca; pendiente asignar sin repetir identidades |
| IMG 4 VFX Caballero/Asesino/Soporte | traza de espada, onda sísmica, torbellino, cortes, curación, sacrificio, resurrección | PARTIAL_USE — sin cuerpo nuevo; pendientes de asignar |
| IMG 7 Profeta | halos del Destino, ojos de la Visión, cartas de la Danza, luz de la Ascensión | PARTIAL_USE — encajan con sus habilidades; pendientes de asignar |
| minotauro_sheet (fuego/lava) | estela de fuego, anillo de lava | REJECT — no es el canon del Minotauro (se retiró de producción) |

## Guardianes definidos como canon

- **Mago de Hielo y Cristal (GUARDIÁN: el Mago Gélido, uno de los Cuatro)** — art-source/hielo_jefes/mago_hielo_cristal_sheet.png → assets/sprites/bosses/hielo/mago_hielo_cristal/v2/atlas.png (CANONICAL_SET · REPLACE_FULL_SET)
- **Guardián del Laberinto (GUARDIÁN)** — assets/sprites/bosses/laberinto/guardian_laberinto/ (Pack 3, integrado antes) (USE (sin cambios))
- **Guardián Élfico Ancestral (GUARDIÁN) → jefe del Bosque "Guardián Ancestral Corrompido"** — art-source/guardian_elfico/guardian_elfico_ancestral.png → .../bosses/bosque/guardian_ancestral/atlas.png (+ atlas_furia.png) (CANONICAL_SET (BUGFIX 01))
- **El Hechicero (GUARDIÁN, sin revelar)** — assets/sprites/bosses/infernal/hechicero/atlas.png (integrado en H1) (USE (sin cambios))

## Animaciones todavía faltantes (del canon elegido)

- **Mago de Hielo y Cristal (GUARDIÁN: el Mago Gélido, uno de los Cuatro):** hurt dedicado (hoy usa un cuadro de la nova) · vista de espaldas/frente al caminar (la hoja trae espalda y perfil sueltos, sin ciclo)
- **Guardián del Laberinto (GUARDIÁN):** habilidades propias con arte (hoy efectos de código)
- **Guardián Élfico Ancestral (GUARDIÁN) → jefe del Bosque "Guardián Ancestral Corrompido":** caminar de perfil izquierdo propio (se espeja el derecho; el recorte izquierdo 1 salió roto) · hurt propio (usa un cuadro de idle) · el panel dice 4 cuadros de caminata y dibuja 3
- **Ángel Caído de Hielo (jefe de Hielo, fase 2):** vista de espaldas animada (hay 1 cuadro) · golpe descendente (el recorte trae la estela pegada; no se usa)
- **Jinete Sin Cabeza (jefe del Bosque):** hurt · pose de "Resurrección Eterna" · espalda animada
- **Tundraverx, Soberano de Hielo (élite/jefe intermedio):** hurt · espalda animada
- **Servo de Cristal / Cristal Volador (esbirros del Mago):** hurt (ambos)
- **Enjambre de Hadas (minions del Bosque):** hurt
- **Cù-Sìth (élite del Bosque):** idle propio (usa la corrida)
- **Gólem del Infernal ("Gólem"):** hurt · ataque cuerpo a cuerpo de 3+ cuadros
- **Gólem de Piedra (subjefe del Laberinto):** hurt · muerte
- **Esfinge · Medusa · Druida de Arena (Laberinto):** muerte 4 · ataque · hurt
- **Tanque (Caballero) (campeón):** según ficha del campeón
- **Asesino / Segador Olvidado (campeón):** según ficha del campeón
- **Soporte (Curador) (campeón):** según ficha del campeón
- **La Profeta (campeón):** según ficha del campeón
- **La Cazadora (Sylva) (campeón):** según ficha del campeón
- **Musashi (campeón):** según ficha del campeón
- **Nigromante (campeón):** según ficha del campeón
- **Duende · Zombi · Lobo Espectral · Demonio Nigromántico (ajustes):** Duende: 2º ataque · Zombi: ataque propio · Lobo: carrera · Demonio: golpe al suelo (pedidos viejos)

## Problemas encontrados durante la integración

- Las hojas con fondo liso oscuro no se pueden recortar con un umbral de color: el halo azul de los personajes de hielo es casi del mismo tono que el fondo. Se resolvió con una máscara por cuadro (u2net) y, para muertes/partículas, con la máscara directa + alfa de brillo.
- Las hojas del pack de canon traen cada cuadro dentro de una celda más clara: con celdas parejas se recorta celda por celda; con celdas irregulares, por figuras con un fondo estimado en una ventana ancha.
- Algunos cuadros vienen con la estela del golpe pegada al cuerpo (golpe descendente del Ángel, ataque 2 del Gólem de Cristal): se usan los cuadros limpios y la estela queda para biblioteca.
- Los "ajustes" de campeones y enemigos existentes vienen redibujados con otro diseño: no se integran (no Frankenstein) y se vuelven a pedir como hoja completa.
- Varias hojas tienen versiones repetidas (IMG 2 e IMG 3 aparecen dos veces): se usa la más completa y la otra queda como DUPLICATE.
