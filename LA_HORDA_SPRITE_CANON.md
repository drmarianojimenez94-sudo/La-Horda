# LA HORDA — Canon visual de sprites

> Generado con `python3 tools/art/canon_registry.py`. Una vez elegido el canon de una entidad, **toda animación futura se pide sobre ese canon** y no se mezclan frames de otra representación (regla NO FRANKENSTEIN).

Estética objetivo: dark-fantasy detailed 16-bit pixel art (ver `docs/ART_BIBLE.md`). Prioridad: ARTGATE → COHERENCIA → COMPLETITUD → LEGIBILIDAD → IDENTIDAD → INTEGRACIÓN.

## Guardianes (GUARDIAN_CANON)

### Mago de Hielo y Cristal (GUARDIÁN: el Mago Gélido, uno de los Cuatro)

```
ENTITY:               Mago de Hielo y Cristal (GUARDIÁN: el Mago Gélido, uno de los Cuatro)
CANON_ASSET:          art-source/hielo_jefes/mago_hielo_cristal_sheet.png → assets/sprites/bosses/hielo/mago_hielo_cristal/v2/atlas.png
STATUS:               CANONICAL_SET · REPLACE_FULL_SET
ARTGATE_STATUS:       PASS (probado en partida: legible sobre el hielo, silueta propia de corona de cristal + bastón)
AVAILABLE_ANIMATIONS: idle 4 · caminar 5 (perfil) · básico 3 · lanza 4 · nova 3 · canalización 4 · encierro de hielo 4 · muro 3 · muerte 3
MISSING_ANIMATIONS:   hurt dedicado (hoy usa un cuadro de la nova) · vista de espaldas/frente al caminar (la hoja trae espalda y perfil sueltos, sin ciclo)
VFX:                  lanza de cristal (proyectil real), runa bajo la Ventisca, estallido, impacto, muro, cristal flotante
ALTERNATIVE_ASSETS:   jefes_I1_I4_sheet.png fila I2 (versión resumida del mismo mago) · static.png viejo (1 cuadro)
REJECTED_ASSETS / REJECTION_REASON: jefes_I1_I4 fila I2 → DUPLICATE (mismo diseño, menos animaciones) · static.png → reemplazado
NOTES:                GUARDIAN_CANON. Toda animación futura del Mago Gélido se pide sobre esta hoja. El static.png queda solo como respaldo si el atlas no carga.
```

### Guardián del Laberinto (GUARDIÁN)

```
ENTITY:               Guardián del Laberinto (GUARDIÁN)
CANON_ASSET:          assets/sprites/bosses/laberinto/guardian_laberinto/ (Pack 3, integrado antes)
STATUS:               USE (sin cambios)
ARTGATE_STATUS:       PASS
AVAILABLE_ANIMATIONS: idle 3 · caminar 4 · ataque 5 · golpe 2 · muerte 5
MISSING_ANIMATIONS:   habilidades propias con arte (hoy efectos de código)
VFX:                  de código
ALTERNATIVE_ASSETS:   ninguna en este lote
REJECTED_ASSETS / REJECTION_REASON: —
NOTES:                GUARDIAN_CANON vigente. No vino arte nuevo.
```

### Guardián Élfico (GUARDIÁN)

```
ENTITY:               Guardián Élfico (GUARDIÁN)
CANON_ASSET:          — (no existe arte)
STATUS:               FALTA TOTAL
ARTGATE_STATUS:       —
AVAILABLE_ANIMATIONS: —
MISSING_ANIMATIONS:   set completo (idle, caminar 4 dir, ataque, 2 habilidades, hurt, muerte, retrato)
VFX:                  —
ALTERNATIVE_ASSETS:   —
REJECTED_ASSETS / REJECTION_REASON: —
NOTES:                Solo aparece en el mural de los Cuatro. Es el próximo Guardián a producir: una sola hoja completa.
```

### El Hechicero (GUARDIÁN, sin revelar)

```
ENTITY:               El Hechicero (GUARDIÁN, sin revelar)
CANON_ASSET:          assets/sprites/bosses/infernal/hechicero/atlas.png (integrado en H1)
STATUS:               USE (sin cambios)
ARTGATE_STATUS:       PASS
AVAILABLE_ANIMATIONS: idle 4 · caminar 12 · conjuro 8 · básico 4 · daño 5 · muerte 6 + Gólem de Cuerpos
MISSING_ANIMATIONS:   —
VFX:                  orbe, pilares, juicio, meteoros
ALTERNATIVE_ASSETS:   —
REJECTED_ASSETS / REJECTION_REASON: —
NOTES:                GUARDIAN_CANON vigente.
```

## Jefes, enemigos y campeones

### Ángel Caído de Hielo (jefe de Hielo, fase 2)

```
ENTITY:               Ángel Caído de Hielo (jefe de Hielo, fase 2)
CANON_ASSET:          art-source/hielo_jefes/angel_caido_hielo_sheet.png → .../angel_caido_hielo/v2/atlas.png
STATUS:               CANONICAL_SET · REPLACE_FULL_SET
ARTGATE_STATUS:       PASS (probado en partida)
AVAILABLE_ANIMATIONS: idle 4 · caminar 5 · ataque 4 · vuelo 4 · preparación 4 · alas 3 · tormenta 4 · transformación 5 · aura 4 · congelación 3 · recuperación 4 · muerte 8
MISSING_ANIMATIONS:   vista de espaldas animada (hay 1 cuadro) · golpe descendente (el recorte trae la estela pegada; no se usa)
VFX:                  nova (Alas de Ventisca), pilar, runa, estallido, impacto, muros
ALTERNATIVE_ASSETS:   jefes_I1_I4 fila I3 · static.png viejo (gárgola azul)
REJECTED_ASSETS / REJECTION_REASON: fila I3 → DUPLICATE · gárgola → reemplazada (el nombre pide un ángel)
NOTES:                Distinto del Ángel de Hielo élite: el jefe lleva espada y armadura; el élite, capucha y bastón.
```

### Jinete Sin Cabeza (jefe del Bosque)

```
ENTITY:               Jinete Sin Cabeza (jefe del Bosque)
CANON_ASSET:          art-source/hielo_jefes/jefes_I1_I4_sheet.png fila I1 → .../jinete_sin_cabeza/v2/atlas.png
STATUS:               CANON_SELECTED_BUT_INCOMPLETE · REPLACE_FULL_SET
ARTGATE_STATUS:       PASS (más oscuro y borroso que el resto: aceptable a su escala)
AVAILABLE_ANIMATIONS: galope de perfil 4 · ataque 3 · muerte 5 · frente 3
MISSING_ANIMATIONS:   hurt · pose de "Resurrección Eterna" · espalda animada
VFX:                  — (usa los de código: calabazas, guadaña)
ALTERNATIVE_ASSETS:   static.png (caballo pálido, 1 cuadro) · Pack 2 (caballo negro con cabeza en llamas, rechazado antes)
REJECTED_ASSETS / REJECTION_REASON: static.png → reemplazado
NOTES:                El diseño nuevo (llamas azules) reemplaza al caballo pálido.
```

### Minotauro (jefe del Laberinto)

```
ENTITY:               Minotauro (jefe del Laberinto)
CANON_ASSET:          art-source/pack_canon/img7_img9 · IMG 9 → assets/sprites/bosses/laberinto/minotauro/v3/atlas.png
STATUS:               CANONICAL_SET · REPLACE_FULL_SET
ARTGATE_STATUS:       PASS
AVAILABLE_ANIMATIONS: idle frente/derecha/espalda/izquierda 4 c/u · caminar 4 · carrera 4 · ataque básico 4 · golpe pesado 4 · golpe sísmico 4 · embestida 4 · hurt 2 · muerte 4
MISSING_ANIMATIONS:   —
VFX:                  onda sísmica, impacto de hacha, polvo/rocas, traza de embestida, aura de furia
ALTERNATIVE_ASSETS:   walk-strip.png (capa oscura, sin hacha) · minotauro_sheet.png (capa roja + hacha, solo frente/ataque) · IMG 1 muerte (marrón)
REJECTED_ASSETS / REJECTION_REASON: walk-strip → reemplazado (sin ataque ni muerte) · minotauro_sheet cuerpo → REJECT_INCONSISTENT (otro diseño, incompleto) · IMG 1 muerte → REJECT_INCONSISTENT (otro diseño)
NOTES:                El único set completo con las 4 direcciones: pasa a canon y se reemplaza TODO (cuerpo y efectos).
```

### Tundraverx, Soberano de Hielo (élite/jefe intermedio)

```
ENTITY:               Tundraverx, Soberano de Hielo (élite/jefe intermedio)
CANON_ASSET:          jefes_I1_I4_sheet.png fila I4 → assets/sprites/enemies/hielo/dragon_hielo/v2/atlas.png
STATUS:               CANON_SELECTED_BUT_INCOMPLETE · REPLACE_FULL_SET
ARTGATE_STATUS:       PASS
AVAILABLE_ANIMATIONS: caminar de perfil 4 · aliento 3 · muerte 5 · frente 2
MISSING_ANIMATIONS:   hurt · espalda animada
VFX:                  usa el aliento y la nova existentes
ALTERNATIVE_ASSETS:   static.png (dragón alado, 1 cuadro)
REJECTED_ASSETS / REJECTION_REASON: static.png → reemplazado
NOTES:                Diseño nuevo sin alas: el lore de la Esquirla pasó de "ala" a "cresta".
```

### Gólem de Cristal (guardián invocado por el Mago)

```
ENTITY:               Gólem de Cristal (guardián invocado por el Mago)
CANON_ASSET:          hoja 12 → assets/sprites/enemies/hielo/golem_cristal/atlas.png
STATUS:               CANONICAL_SET (entidad nueva)
ARTGATE_STATUS:       PASS
AVAILABLE_ANIMATIONS: idle 2 · caminar 4 · golpe 4 · pisotón 4 · lanzamiento 2 · carga 3 · muerte 5
MISSING_ANIMATIONS:   —
VFX:                  —
ALTERNATIVE_ASSETS:   variantes de color de la hoja (opcionales)
REJECTED_ASSETS / REJECTION_REASON: variantes → no se usan (el Hielo ya tiene su paleta)
NOTES:                Reemplaza al Gólem de Hielo como guardián del Mago.
```

### Servo de Cristal / Cristal Volador (esbirros del Mago)

```
ENTITY:               Servo de Cristal / Cristal Volador (esbirros del Mago)
CANON_ASSET:          hoja 12 → .../cristal_servo y .../cristal_volador
STATUS:               CANONICAL_SET (entidades nuevas)
ARTGATE_STATUS:       PASS
AVAILABLE_ANIMATIONS: servo: idle 3 · caminar 4 · ataque 2 · muerte 3 — volador: idle 3 · movimiento 4 · ataque 4 · muerte 4
MISSING_ANIMATIONS:   hurt (ambos)
VFX:                  cristal flotante al aparecer
ALTERNATIVE_ASSETS:   —
REJECTED_ASSETS / REJECTION_REASON: —
NOTES:                Nuevo patrón del Mago: Esbirros de Cristal (fases 2 y 3).
```

### Dragoncito de Hielo (élite)

```
ENTITY:               Dragoncito de Hielo (élite)
CANON_ASSET:          P2 (IMG 2 completa) → assets/sprites/enemies/hielo/dragoncito_hielo/v2/atlas.png
STATUS:               CANONICAL_SET · REPLACE_FULL_SET
ARTGATE_STATUS:       PASS
AVAILABLE_ANIMATIONS: vuelo 4 · ataque 3 · hurt 2 · muerte 4 · frente 4 · espalda 4
MISSING_ANIMATIONS:   —
VFX:                  proyectil de hielo, impacto
ALTERNATIVE_ASSETS:   P13 (IMG 2 corta: sin hurt/frente/espalda) · static.png (1 cuadro)
REJECTED_ASSETS / REJECTION_REASON: P13 → DUPLICATE · static.png → reemplazado
NOTES:                
```

### Ángel de Hielo y Cristal (élite)

```
ENTITY:               Ángel de Hielo y Cristal (élite)
CANON_ASSET:          P2 (IMG 2 completa) → assets/sprites/enemies/hielo/angel_hielo/v2/atlas.png
STATUS:               CANONICAL_SET · REPLACE_FULL_SET
ARTGATE_STATUS:       PASS
AVAILABLE_ANIMATIONS: vuelo 4 · ataque 3 · cast 4 · hurt 2 · muerte 4 · frente 4 · espalda 4
MISSING_ANIMATIONS:   —
VFX:                  proyectil de cristal, nova
ALTERNATIVE_ASSETS:   P13 (IMG 2 corta) · static.png (estatua con escudo, 1 cuadro)
REJECTED_ASSETS / REJECTION_REASON: P13 → DUPLICATE · static.png → reemplazado
NOTES:                
```

### Enjambre de Hadas (minions del Bosque)

```
ENTITY:               Enjambre de Hadas (minions del Bosque)
CANON_ASSET:          P2 (IMG 2 completa) → assets/sprites/enemies/bosque/enjambre_hadas/v2/atlas.png
STATUS:               CANONICAL_SET · REPLACE_FULL_SET
ARTGATE_STATUS:       PASS (hadas azules en el Bosque: se leen como magia fría, contrastan con el verde)
AVAILABLE_ANIMATIONS: idle/vuelo 4 · direcciones 4 · ataque 3 · muerte 4
MISSING_ANIMATIONS:   hurt
VFX:                  proyectil, estallido
ALTERNATIVE_ASSETS:   P13 (IMG 2 corta) · static.png (1 cuadro) · variantes de color
REJECTED_ASSETS / REJECTION_REASON: P13 → DUPLICATE · variantes → no se usan
NOTES:                
```

### Cù-Sìth (élite del Bosque)

```
ENTITY:               Cù-Sìth (élite del Bosque)
CANON_ASSET:          P34 (IMG 3 con hurt) → assets/sprites/enemies/bosque/cu_sith/v2/atlas.png
STATUS:               CANONICAL_SET · REPLACE_FULL_SET
ARTGATE_STATUS:       PASS
AVAILABLE_ANIMATIONS: corrida 4 · mordida 3 · hurt 2 · muerte 4
MISSING_ANIMATIONS:   idle propio (usa la corrida)
VFX:                  tajo de la mordida
ALTERNATIVE_ASSETS:   P13 (IMG 3 sin hurt) · static.png (1 cuadro)
REJECTED_ASSETS / REJECTION_REASON: P13 → DUPLICATE · static.png → reemplazado
NOTES:                
```

### Gólem del Infernal ("Gólem")

```
ENTITY:               Gólem del Infernal ("Gólem")
CANON_ASSET:          P34 IMG 3 "Gólem de Fuego" → assets/sprites/enemies/infernal/golem/v2/atlas.png
STATUS:               CANON_SELECTED_BUT_INCOMPLETE · REPLACE_FULL_SET
ARTGATE_STATUS:       PASS (identidad de arena: el gólem de lava se lee como Infernal; el gris era el mismo que el del Laberinto)
AVAILABLE_ANIMATIONS: idle/caminar 4 · ataque 2 · muerte 4
MISSING_ANIMATIONS:   hurt · ataque cuerpo a cuerpo de 3+ cuadros
VFX:                  proyectil de fuego, impacto
ALTERNATIVE_ASSETS:   atlas.png gris actual
REJECTED_ASSETS / REJECTION_REASON: gris → reemplazado
NOTES:                
```

### Gólem de Piedra (subjefe del Laberinto)

```
ENTITY:               Gólem de Piedra (subjefe del Laberinto)
CANON_ASSET:          P13 IMG 1 → assets/sprites/enemies/laberinto/golem_piedra/v2/atlas.png
STATUS:               CANON_SELECTED_BUT_INCOMPLETE · REPLACE_FULL_SET
ARTGATE_STATUS:       PASS
AVAILABLE_ANIMATIONS: frente 2 · perfil derecho 3 · espalda 2 · perfil izquierdo 3 · caminar 5 · golpe 3
MISSING_ANIMATIONS:   hurt · muerte
VFX:                  impacto de rocas
ALTERNATIVE_ASSETS:   walk-strip.png (caminar)
REJECTED_ASSETS / REJECTION_REASON: walk-strip → reemplazado
NOTES:                La muerte sigue siendo el derrumbe animado por código.
```

### Gólem de Hielo

```
ENTITY:               Gólem de Hielo
CANON_ASSET:          assets/sprites/enemies/hielo/golem_hielo/ (Pack 3)
STATUS:               USE (se conserva)
ARTGATE_STATUS:       PASS
AVAILABLE_ANIMATIONS: idle 2 · caminar 3 · ataque 4 · golpe 2 · muerte 4
MISSING_ANIMATIONS:   —
VFX:                  —
ALTERNATIVE_ASSETS:   P34 "Gólem de Hielo (variante)"
REJECTED_ASSETS / REJECTION_REASON: variante → DUPLICATE (menos animaciones; y el Hielo ya tiene el Gólem de Cristal azul oscuro: con la variante habría dos gólems iguales)
NOTES:                
```

### Dama del Bosque (jefa)

```
ENTITY:               Dama del Bosque (jefa)
CANON_ASSET:          assets/sprites/enemies/bosque/dama_bosque/v2/atlas.png (redraw RD6)
STATUS:               USE (se conserva)
ARTGATE_STATUS:       PASS
AVAILABLE_ANIMATIONS: idle 4 · caminar 4 · ataque 4 · golpe 4 · muerte 6
MISSING_ANIMATIONS:   —
VFX:                  de código
ALTERNATIVE_ASSETS:   P34 "Dama del Bosque" (druida verde con astas)
REJECTED_ASSETS / REJECTION_REASON: P34 → REJECT_INCONSISTENT (otro diseño: cambiaría la identidad de una jefa ya completa)
NOTES:                Sus VFX verdes (raíces, hojas) no combinan con la Dama roja/blanca: no se usan.
```

### Esfinge · Medusa · Druida de Arena (Laberinto)

```
ENTITY:               Esfinge · Medusa · Druida de Arena (Laberinto)
CANON_ASSET:          walk-strip.png actuales
STATUS:               USE (se conservan)
ARTGATE_STATUS:       PASS
AVAILABLE_ANIMATIONS: caminar de perfil
MISSING_ANIMATIONS:   muerte 4 · ataque · hurt
VFX:                  —
ALTERNATIVE_ASSETS:   P13 "Muertes - Arena Laberinto"
REJECTED_ASSETS / REJECTION_REASON: las 3 muertes → REJECT_INCONSISTENT: Esfinge con alas azules (la actual no tiene), Medusa de piel verde (la actual es de piel clara), Druida con astas (el actual es encapuchado). Mezclarlas sería un Frankenstein.
NOTES:                Hace falta la hoja completa de cada uno (mismo diseño que el actual) — ver lista de faltantes.
```

### Tanque (Caballero) (campeón)

```
ENTITY:               Tanque (Caballero) (campeón)
CANON_ASSET:          assets/sprites/champions/tanque/atlas.png (referencia maestra de la biblia de arte)
STATUS:               USE (se conserva) · lo nuevo: PARTIAL_USE (solo VFX)
ARTGATE_STATUS:       El canon actual PASS; la versión nueva REJECT_INCONSISTENT como cuerpo
AVAILABLE_ANIMATIONS: set completo de 4 direcciones (idle/caminar abajo, perfil, izquierda, arriba) + ataque, cast, hurt, muerte
MISSING_ANIMATIONS:   según ficha del campeón
VFX:                  nuevos disponibles: ver auditoría (VFX por campeón)
ALTERNATIVE_ASSETS:   P34 IMG 4 Tanque
REJECTED_ASSETS / REJECTION_REASON: P34 IMG 4 Tanque → REJECT_INCONSISTENT: es otro diseño de personaje (proporciones realistas, otra cara/ropa/arma) frente al roster chibi de 13 campeones, y no trae las vistas de espaldas/izquierda que usa el juego. Cambiar uno solo rompe el roster.
NOTES:                Si el equipo decide pasar TODO el roster al estilo realista, tiene que ser una hoja completa por campeón (las 4 direcciones), no campeón por campeón.
```

### Asesino / Segador Olvidado (campeón)

```
ENTITY:               Asesino / Segador Olvidado (campeón)
CANON_ASSET:          guerrero/atlas.png y segador/v2/atlas.png
STATUS:               USE (se conserva) · lo nuevo: PARTIAL_USE (solo VFX)
ARTGATE_STATUS:       El canon actual PASS; la versión nueva REJECT_INCONSISTENT como cuerpo
AVAILABLE_ANIMATIONS: set completo de 4 direcciones (idle/caminar abajo, perfil, izquierda, arriba) + ataque, cast, hurt, muerte
MISSING_ANIMATIONS:   según ficha del campeón
VFX:                  nuevos disponibles: ver auditoría (VFX por campeón)
ALTERNATIVE_ASSETS:   P34 IMG 4 Asesino
REJECTED_ASSETS / REJECTION_REASON: P34 IMG 4 Asesino → REJECT_INCONSISTENT: es otro diseño de personaje (proporciones realistas, otra cara/ropa/arma) frente al roster chibi de 13 campeones, y no trae las vistas de espaldas/izquierda que usa el juego. Cambiar uno solo rompe el roster.
NOTES:                Si el equipo decide pasar TODO el roster al estilo realista, tiene que ser una hoja completa por campeón (las 4 direcciones), no campeón por campeón.
```

### Soporte (Curador) (campeón)

```
ENTITY:               Soporte (Curador) (campeón)
CANON_ASSET:          soporte/atlas.png
STATUS:               USE (se conserva) · lo nuevo: PARTIAL_USE (solo VFX)
ARTGATE_STATUS:       El canon actual PASS; la versión nueva REJECT_INCONSISTENT como cuerpo
AVAILABLE_ANIMATIONS: set completo de 4 direcciones (idle/caminar abajo, perfil, izquierda, arriba) + ataque, cast, hurt, muerte
MISSING_ANIMATIONS:   según ficha del campeón
VFX:                  nuevos disponibles: ver auditoría (VFX por campeón)
ALTERNATIVE_ASSETS:   P34 IMG 4 Soporte
REJECTED_ASSETS / REJECTION_REASON: P34 IMG 4 Soporte → REJECT_INCONSISTENT: es otro diseño de personaje (proporciones realistas, otra cara/ropa/arma) frente al roster chibi de 13 campeones, y no trae las vistas de espaldas/izquierda que usa el juego. Cambiar uno solo rompe el roster.
NOTES:                Si el equipo decide pasar TODO el roster al estilo realista, tiene que ser una hoja completa por campeón (las 4 direcciones), no campeón por campeón.
```

### La Profeta (campeón)

```
ENTITY:               La Profeta (campeón)
CANON_ASSET:          profeta/v2/atlas.png (redraw RD3)
STATUS:               USE (se conserva) · lo nuevo: PARTIAL_USE (solo VFX)
ARTGATE_STATUS:       El canon actual PASS; la versión nueva REJECT_INCONSISTENT como cuerpo
AVAILABLE_ANIMATIONS: set completo de 4 direcciones (idle/caminar abajo, perfil, izquierda, arriba) + ataque, cast, hurt, muerte
MISSING_ANIMATIONS:   según ficha del campeón
VFX:                  nuevos disponibles: ver auditoría (VFX por campeón)
ALTERNATIVE_ASSETS:   P56 IMG 5 Profeta + P79 IMG 7 reexports
REJECTED_ASSETS / REJECTION_REASON: P56 IMG 5 Profeta + P79 IMG 7 reexports → REJECT_INCONSISTENT: es otro diseño de personaje (proporciones realistas, otra cara/ropa/arma) frente al roster chibi de 13 campeones, y no trae las vistas de espaldas/izquierda que usa el juego. Cambiar uno solo rompe el roster.
NOTES:                Si el equipo decide pasar TODO el roster al estilo realista, tiene que ser una hoja completa por campeón (las 4 direcciones), no campeón por campeón.
```

### La Cazadora (Sylva) (campeón)

```
ENTITY:               La Cazadora (Sylva) (campeón)
CANON_ASSET:          cazadora/v2/atlas.png (redraw RD5)
STATUS:               USE (se conserva) · lo nuevo: PARTIAL_USE (solo VFX)
ARTGATE_STATUS:       El canon actual PASS; la versión nueva REJECT_INCONSISTENT como cuerpo
AVAILABLE_ANIMATIONS: set completo de 4 direcciones (idle/caminar abajo, perfil, izquierda, arriba) + ataque, cast, hurt, muerte
MISSING_ANIMATIONS:   según ficha del campeón
VFX:                  nuevos disponibles: ver auditoría (VFX por campeón)
ALTERNATIVE_ASSETS:   P56 IMG 5 Sylva
REJECTED_ASSETS / REJECTION_REASON: P56 IMG 5 Sylva → REJECT_INCONSISTENT: es otro diseño de personaje (proporciones realistas, otra cara/ropa/arma) frente al roster chibi de 13 campeones, y no trae las vistas de espaldas/izquierda que usa el juego. Cambiar uno solo rompe el roster.
NOTES:                Si el equipo decide pasar TODO el roster al estilo realista, tiene que ser una hoja completa por campeón (las 4 direcciones), no campeón por campeón.
```

### Musashi (campeón)

```
ENTITY:               Musashi (campeón)
CANON_ASSET:          musashi/v2/atlas.png
STATUS:               USE (se conserva) · lo nuevo: PARTIAL_USE (solo VFX)
ARTGATE_STATUS:       El canon actual PASS; la versión nueva REJECT_INCONSISTENT como cuerpo
AVAILABLE_ANIMATIONS: set completo de 4 direcciones (idle/caminar abajo, perfil, izquierda, arriba) + ataque, cast, hurt, muerte
MISSING_ANIMATIONS:   según ficha del campeón
VFX:                  nuevos disponibles: ver auditoría (VFX por campeón)
ALTERNATIVE_ASSETS:   P56 ajuste de ataque básico
REJECTED_ASSETS / REJECTION_REASON: P56 ajuste de ataque básico → REJECT_INCONSISTENT: es otro diseño de personaje (proporciones realistas, otra cara/ropa/arma) frente al roster chibi de 13 campeones, y no trae las vistas de espaldas/izquierda que usa el juego. Cambiar uno solo rompe el roster.
NOTES:                Si el equipo decide pasar TODO el roster al estilo realista, tiene que ser una hoja completa por campeón (las 4 direcciones), no campeón por campeón.
```

### Nigromante (campeón)

```
ENTITY:               Nigromante (campeón)
CANON_ASSET:          nigromante/v2/atlas.png
STATUS:               USE (se conserva) · lo nuevo: PARTIAL_USE (solo VFX)
ARTGATE_STATUS:       El canon actual PASS; la versión nueva REJECT_INCONSISTENT como cuerpo
AVAILABLE_ANIMATIONS: set completo de 4 direcciones (idle/caminar abajo, perfil, izquierda, arriba) + ataque, cast, hurt, muerte
MISSING_ANIMATIONS:   según ficha del campeón
VFX:                  nuevos disponibles: ver auditoría (VFX por campeón)
ALTERNATIVE_ASSETS:   P56 idle limpio · P79 Demon Soul Slash · demonio slam
REJECTED_ASSETS / REJECTION_REASON: P56 idle limpio · P79 Demon Soul Slash · demonio slam → REJECT_INCONSISTENT: es otro diseño de personaje (proporciones realistas, otra cara/ropa/arma) frente al roster chibi de 13 campeones, y no trae las vistas de espaldas/izquierda que usa el juego. Cambiar uno solo rompe el roster.
NOTES:                Si el equipo decide pasar TODO el roster al estilo realista, tiene que ser una hoja completa por campeón (las 4 direcciones), no campeón por campeón.
```

### Duende · Zombi · Lobo Espectral · Demonio Nigromántico (ajustes)

```
ENTITY:               Duende · Zombi · Lobo Espectral · Demonio Nigromántico (ajustes)
CANON_ASSET:          packs actuales
STATUS:               USE (se conservan)
ARTGATE_STATUS:       PASS
AVAILABLE_ANIMATIONS: sets actuales
MISSING_ANIMATIONS:   Duende: 2º ataque · Zombi: ataque propio · Lobo: carrera · Demonio: golpe al suelo (pedidos viejos)
VFX:                  —
ALTERNATIVE_ASSETS:   P56 ajustes (duende ataque 1/2, zombi ataque, lobo carrera, demonio slam) · P79 Demon Soul Slash
REJECTED_ASSETS / REJECTION_REASON: → REJECT_INCONSISTENT: los "ajustes" vienen redibujados con otro diseño (otra paleta/anatomía) y mezclarlos con el set actual cambia al personaje a mitad de animación.
NOTES:                Se piden de nuevo como hoja completa del personaje (ver faltantes).
```

