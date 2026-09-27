# LA HORDA — Missing Asset Manifest (Alpha 0.1)

> Relevado del repositorio (`assets/`, `art-source/`, `js/rendering/arena-props.js`, `js/assets/asset-manifest.js`) y de lo que las mecánicas nuevas
> necesitan. Antes de declarar algo "faltante" se buscó en archivos, carpetas, hojas, atlas y referencias.
> **Regla:** nada de lo marcado PROVISORIO es arte final. Se dibujó con código para que la mecánica se pueda jugar y probar
> hoy, sin inventar un asset definitivo mediocre.

**Escala común:** grilla de arte con 1 px = 2 unidades de mundo (`AID_SCALE = 2`). Un campeón mide unas 65 u (≈ 32–36 px de arte).
**Perspectiva:** 3/4 cenital, igual que los props del coliseo y los enemigos actuales.
**Estados posibles:** `MISSING` (no existe) · `PLACEHOLDER` (existe uno provisorio, procedural) · `EXISTS-NOT-INTEGRATED` (existe, no se usa) · `PARTIAL` (existe incompleto).

## Resumen

| ID | Prioridad | Arena | Asset | Estado |
|---|---|---|---|---|
| NAR-01 | **P0** | Todas (guía) / Infernal (jefe) | El Hechicero: retrato del guía + sprite de campaña + jefe final (forma cubierta) | MISSING (retrato PLACEHOLDER CSS) |
| NAR-02 | **P0** | Infernal (jefe final) | Demonio de la Horda (transformación final del Hechicero) | MISSING |
| NAR-03 | P1 | Infernal | Mural de los Cuatro (foreshadowing) | PLACEHOLDER |
| INF-01 | P1 | Infernal | Fisura: apertura, 3 etapas, cierre, sellado | PLACEHOLDER |
| HIE-01 | P1 | Gélida | Brasero de hielo: encendido (loop), apagado, encendiéndose | PARTIAL (reusa brasero Infernal + llama procedural) |
| HIE-02 | P2 | Gélida | Overlay de escarcha a los pies + icono de frío | PLACEHOLDER |
| BOS-01 | P1 | Ruinas | Runa del menhir: cargando / lista / disparo | PLACEHOLDER |
| BOS-02 | P1 | Ruinas | Maleza de emboscada (quieta, sacudiéndose, saltando, ardiendo) | PLACEHOLDER |
| BOS-03 | P2 | Ruinas | VFX de raíces élficas (atrapar) | PLACEHOLDER |
| ACU-01 | P1 | Acuática | Tiles/VFX de corriente: franja lineal, remolino, anillo | PLACEHOLDER |
| ACU-02 | P1 | Acuática | Boca de chorro + columna de agua | PLACEHOLDER |
| ACU-03 | P1 | Acuática | Charco conductor: reposo, cargando, descarga | PLACEHOLDER |
| LAB-01 | P1 | Laberinto | Sello de piedra I / II / III: apagado, encendido, error | PLACEHOLDER |
| UI-01 | P2 | HUD | Íconos de acción contextual (cerrar, encender, activar, sello) | PLACEHOLDER (emoji/glifos) |
| BOSS-01 | P1 | Gélida | Mago de Hielo y Cristal: animación completa | PARTIAL (solo `static.png`) |
| BOSS-02 | P1 | Gélida | Ángel Caído: animación completa | PARTIAL (solo `static.png`) |
| BOSS-03 | P1 | Ruinas | Jinete Sin Cabeza: animación completa | PARTIAL (solo `static.png`) |
| BOSS-04 | P2 | Ruinas | 4 Dobladores: animación completa | PARTIAL (`static.png` + `v2`) |
| BOSS-05 | P2 | Laberinto | Minotauro: ataque/embestida/muerte | PARTIAL (`static.png` + `walk-strip.png`) |
| BOSS-06 | P2 | Micelial | Madre Espora: frames completos | PARTIAL (retrato animado por partes; atlas recortado sin usar) |
| ARENA-CM | P2 | Ciudad Maldita | Set completo de arena | MISSING (arena EN DESARROLLO) |
| ARENA-AB | P2 | Abismo | Set completo de arena + Entidad del Abismo | MISSING (arena EN DESARROLLO) |
| ARENA-MP | P2 | Minas Profundas | Set completo de arena + Devoraluz | MISSING (arena EN DESARROLLO) |
| DIV-01 | P2 | Arena Divina | 5 Pruebas + Reflejos Oscuros | MISSING (el modo actual es el asedio; las Pruebas están EN DESARROLLO) |

Jefes auditados que **sí tienen** arte suficiente: Kraken Joven (idle/tent/grab/sweep/hurt/death), Leviatán (fases, embestida, muerte), Guardián del Laberinto (idle/walk/atk/hit/death), Demonio Mayor (atlas), Dragón de la Forja y Caballero (Fortaleza, atlas completos), Micelio Primigenio (Micelial).
"Guardián Élfico" y "Bestia del Bosque" como jefes **no existen** en el juego: en Ruinas el jefe es el Jinete y el subjefe son los Dobladores. La Bestia del Bosque existe como enemigo común (atlas completo). No se reemplazó contenido canon.

---

## Fichas (27 campos)

### NAR-01 — El Hechicero

1. **ID:** NAR-01
2. **Prioridad:** P0. Bloquea el jefe final narrativo y el retrato definitivo del guía.
3. **Arena:** todas (guía); Infernal (jefe final).
4. **Entidad:** El Hechicero, el cuarto Guardián. Hoy es solo una voz que guía. Es el primer jefe final antes de transformarse.
5. **Asset type:** retrato de diálogo + sprite de personaje (campaña) + sprite de jefe (forma cubierta, 3 etapas de "rotura").
6. **Nombre:** `hechicero`
7. **Estado:** MISSING. Retrato PLACEHOLDER hecho con CSS: una capucha con un ojo violeta (`#tut-panel .tut-face`).
8. **Motivo:** guía diegético del tutorial (`js/systems/tutorial.js`) y jefe final de la Infernal (documento de diseño, secciones 29 y 32). Sin arte no se implementó el jefe.
9. **Referencia canon:** no existe diseño canon en el repositorio. **Decisión de diseño pendiente del autor.** Hasta que exista un canon, no se rediseña: el placeholder es una capucha sin rasgos, igual que la cuarta silueta del mural (NAR-03).
10. **Archivo de referencia:** ninguno. Tomar tono y proporciones de `assets/sprites/champions/nigromante/` (túnicas, escala humanoide).
11. **Paleta:** negros violáceos `#0e0907` `#1a1024` `#3a2650`, detalles `#8a6aaa`, brillo del ojo `#c9a8ff`. Para la corrupción de las etapas de jefe: `#5a1a2a` y `#ff3a2a`.
12. **Tamaño:** campaña ≈ 34×40 px de arte. Jefe: 1,6× (≈ 56×64 px). Retrato: 64×64 px.
13. **Proporción:** humanoide, como los campeones (cabeza ≈ 1/5 del alto).
14. **Perspectiva:** 3/4 cenital, igual que los campeones.
15. **Direcciones:** 4 (abajo, arriba, izquierda, derecha; la derecha puede espejarse).
16. **Animaciones:** idle, walk, cast, hit, "revelación" (cae la capucha). Jefe: 3 etapas de rotura (cobertura intacta, grietas, deformación).
17. **Frames:** idle 4, walk 6, cast 6, hit 2, revelación 8, 4 frames de loop por etapa de rotura.
18. **Timing/FPS:** 8 fps (idle/walk), 10 fps (cast), 6 fps (revelación).
19. **Loop:** idle, walk y etapas sí; cast, hit y revelación no.
20. **Background:** transparente.
21. **Pivot:** centro de los pies.
22. **Hitbox:** radio de 18 u (campaña) y 40 u (jefe).
23. **VFX:** runas violetas al castear y fragmentos de cobertura al romperse.
24. **Telegraph:** los ataques de jefe usan los avisos comunes (`vfxTelegraph` / `bossStrike`). El arte solo necesita un pose de "carga" legible.
25. **Filename:** `hechicero/atlas.png` + `meta.json`; `hechicero/portrait.png`.
26. **Destination path:** `assets/sprites/bosses/infernal/hechicero/`.
27. **Integration notes:**
    - Retrato: reemplazar el `background` de `#tut-panel .tut-face` (`css/hud.css`).
    - Jefe: nuevo tipo en `ENEMY_BASE` + patrón en `js/skills/boss-patterns.js`. La IA "observa" (agrupamiento, rango, spam) sin trampas.

### NAR-02 — Demonio de la Horda

1. **ID:** NAR-02
2. **Prioridad:** P0. Es la forma final del jefe de la campaña.
3. **Arena:** Infernal.
4. **Entidad:** Demonio de la Horda, la transformación del Hechicero.
5. **Asset type:** sprite de jefe grande con transformación.
6. **Nombre:** `demonio_horda`
7. **Estado:** MISSING. El documento pide "utilizar diseño existente", pero no hay ningún diseño en el repositorio. El Demonio Mayor actual es otro personaje.
8. **Motivo:** final de la campaña (secciones 32 y 33).
9. **Referencia canon:** **la tiene que proveer el autor.** No se inventa.
10. **Archivo de referencia:** para escala y trazo, `assets/sprites/bosses/infernal/demonio_mayor/atlas.png`.
11. **Paleta:** la del canon que se provea. Mientras tanto, la de la Infernal: `#1a0b07` `#3a1810` `#ff5a14` `#ffb347` `#ffd27a`.
12. **Tamaño:** ≈ 2× el Demonio Mayor.
13. **Proporción:** la del canon.
14. **Perspectiva:** 3/4 cenital.
15. **Direcciones:** 1 (frente) o 2 (con espejo). Es un jefe estático o de poco desplazamiento.
16. **Animaciones:** transformación (desde el Hechicero), idle, 3 ataques, fisura, colapso/muerte.
17. **Frames:** transformación 12, idle 6, 8 por ataque, muerte 10.
18. **Timing/FPS:** 8–10 fps.
19. **Loop:** idle.
20. **Background:** transparente.
21. **Pivot:** base.
22. **Hitbox:** radio de 60–80 u.
23. **VFX:** fisuras que se abren, lava y ceniza. Reusa las fisuras de INF-01.
24. **Telegraph:** comunes.
25. **Filename:** `demonio_horda/atlas.png` + `meta.json`.
26. **Destination path:** `assets/sprites/bosses/infernal/demonio_horda/`.
27. **Integration notes:** mantener FISURAS + LAVA + DESCENSO + COLAPSO (sección 33). Puede reusar `inf-fissures.js` para las fisuras del jefe.

### NAR-03 — Mural de los Cuatro

1. **ID:** NAR-03
2. **Prioridad:** P1.
3. **Arena:** Infernal.
4. **Entidad:** mural o relieve tallado en el piso.
5. **Asset type:** decal (prop plano).
6. **Nombre:** `mural_cuatro`
7. **Estado:** PLACEHOLDER. `infArtMural()` en `js/arenas/infernal/inf-fissures.js`: 132×54 px procedural.
8. **Motivo:** foreshadowing del twist sin diálogo (sección 31).
9. **Referencia canon:** las cuatro figuras son el Mago Gélido (`assets/sprites/bosses/hielo/mago_hielo_cristal/static.png`), el Guardián Élfico (sin canon), el Guardián del Laberinto (`assets/sprites/bosses/laberinto/guardian_laberinto/idle1.png`) y la cuarta silueta encapuchada, sin rasgos (el Hechicero, sin revelar).
10. **Archivo de referencia:** los de arriba.
11. **Paleta:** piedra `#1a1210` `#2c211c` `#3e302a`, talla `#7a5f4e` `#9a7c66`, hendidura `#0e0907`, ojo de la cuarta figura `#c9a8ff`.
12. **Tamaño:** 132×54 px (se dibuja a 1,2× la escala de arte).
13. **Proporción:** 4 figuras iguales en ancho; la cuarta tallada más honda.
14. **Perspectiva:** cenital plana (decal en el piso).
15. **Direcciones:** 1.
16. **Animaciones:** ninguna. Opcional: el ojo de la cuarta figura parpadea (2 frames).
17. **Frames:** 1 (o 2).
18. **Timing/FPS:** —
19. **Loop:** —
20. **Background:** opaco (losa).
21. **Pivot:** centro.
22. **Hitbox:** ninguna (decorativo, no sólido).
23. **VFX:** ninguno.
24. **Telegraph:** —
25. **Filename:** `mural_cuatro.png`
26. **Destination path:** `assets/sprites/arenas/infernal/props/`.
27. **Integration notes:** reemplazar `infArtMural()` por la imagen cargada. La posición fija ya está resuelta (`infPlaceMural`).

### INF-01 — Fisura

1. **ID:** INF-01
2. **Prioridad:** P1.
3. **Arena:** Infernal.
4. **Entidad:** fisura-portal.
5. **Asset type:** decal animado + VFX.
6. **Nombre:** `fisura`
7. **Estado:** PLACEHOLDER. Grieta procedural con ramas y brillo aditivo (`infDrawGround`).
8. **Motivo:** mecánica "¿mato o cierro?".
9. **Referencia canon:** las grietas horneadas del piso de la Infernal (`aidArtInfFissure` en `js/rendering/arena-props.js`).
10. **Archivo de referencia:** captura `inf_fisura_etapa3` (tools/identity).
11. **Paleta:** `#1a0b07` (borde), `#ff5a14` (núcleo), `#ffdc78` (centro), boca `#12070a`.
12. **Tamaño:** etapa 1 ≈ 60×30 px, etapa 2 ≈ 80×40 px, etapa 3 ≈ 110×55 px.
13. **Proporción:** achatada 2:1 (piso en perspectiva).
14. **Perspectiva:** cenital 3/4 (en el piso).
15. **Direcciones:** 1 (variantes rotadas opcionales).
16. **Animaciones:** formándose (aviso), loop por etapa, crecer (transición), reaccionar, sellarse, cicatriz.
17. **Frames:** formándose 6, loop 4 por etapa, crecer 4, reaccionar 4, sellarse 8, cicatriz 1.
18. **Timing/FPS:** 8 fps (loops), 12 fps (sellarse).
19. **Loop:** loops por etapa.
20. **Background:** transparente.
21. **Pivot:** centro de la boca.
22. **Hitbox:** ninguna. El radio de uso lo define el código (46/62/80 + 44 u).
23. **VFX:** brasas que suben; demonios que emergen (los arrastra el código).
24. **Telegraph:** la erupción de etapa 3 usa `bossStrike` "fire".
25. **Filename:** `fisura/atlas.png` + `meta.json`.
26. **Destination path:** `assets/sprites/arenas/infernal/fisura/`.
27. **Integration notes:** reemplazar el dibujo de `infDrawGround`. El estado (`stage`, `warn`, `done`, `doneT`) ya viaja por red.

### HIE-01 — Brasero de hielo

1. **ID:** HIE-01
2. **Prioridad:** P1.
3. **Arena:** Gélida.
4. **Entidad:** brasero interactivo.
5. **Asset type:** prop alto (ordenado por profundidad) + llama animada.
6. **Nombre:** `brasero_hielo`
7. **Estado:** PARTIAL. Reusa el brasero de piedra de la Infernal (`aidArtInfBrazier`), una versión apagada procedural (`hieArtBrazierOff`) y una llama procedural.
8. **Motivo:** "moverse es sobrevivir": zona de calor, se apaga y se reenciende.
9. **Referencia canon:** `aidArtInfBrazier` (18×26 px).
10. **Archivo de referencia:** `js/rendering/arena-props.js`.
11. **Paleta:** piedra fría `#2a2e36` `#56606e`, escarcha `#cfe6ff`, llama `#e0501a` `#ffa23a` `#ffe08a`.
12. **Tamaño:** 18×26 px (se dibuja a 1,2×).
13. **Proporción:** bol sobre pie.
14. **Perspectiva:** 3/4.
15. **Direcciones:** 1.
16. **Animaciones:** encendido (loop), apagándose (cuando queda poco combustible), apagado, encendiéndose.
17. **Frames:** encendido 6, apagándose 4, apagado 1, encendiéndose 6.
18. **Timing/FPS:** 10 fps.
19. **Loop:** encendido y apagándose.
20. **Background:** transparente.
21. **Pivot:** base.
22. **Hitbox:** ninguna (no es sólido). La zona de calor es de 150 u.
23. **VFX:** chispas y humo al apagarse.
24. **Telegraph:** parpadeo de la zona de calor antes de apagarse (ya existe).
25. **Filename:** `brasero/atlas.png`.
26. **Destination path:** `assets/sprites/arenas/hielo/brasero/`.
27. **Integration notes:** reemplazar en `hieDrawTall`.

### BOS-01 — Runa del menhir

1. **ID:** BOS-01
2. **Prioridad:** P1.
3. **Arena:** Ruinas.
4. **Entidad:** runa tallada en el menhir.
5. **Asset type:** overlay sobre el prop existente.
6. **Nombre:** `runa_menhir`
7. **Estado:** PLACEHOLDER. Glifo ᛉ en píxeles, barra de carga y brillo aditivo (`bosDrawTall`).
8. **Motivo:** usar el escenario contra la horda (primera lección).
9. **Referencia canon:** el menhir existente (`aidArtMenhir`, 24×60 px, con espiral celta).
10. **Archivo de referencia:** `js/rendering/arena-props.js`.
11. **Paleta:** piedra `#6a6a62` `#8a8a80` `#46463f`; runa apagada `#3f7a2e`, lista `#b8ff9a` `#eaffdf`.
12. **Tamaño:** 14×24 px sobre el menhir.
13. **Proporción:** vertical.
14. **Perspectiva:** 3/4.
15. **Direcciones:** 1.
16. **Animaciones:** cargando (llenado en 8 pasos), lista (loop), disparo.
17. **Frames:** cargando 8, lista 4, disparo 6.
18. **Timing/FPS:** 6 fps (lista), 12 fps (disparo).
19. **Loop:** lista.
20. **Background:** transparente.
21. **Pivot:** centro del glifo.
22. **Hitbox:** ninguna.
23. **VFX:** raíces que brotan (BOS-03).
24. **Telegraph:** el círculo de alcance ya existe.
25. **Filename:** `runa/atlas.png`.
26. **Destination path:** `assets/sprites/arenas/bosque/runa/`.
27. **Integration notes:** `bosDrawTall`.

### BOS-02 — Maleza de emboscada

1. **ID:** BOS-02
2. **Prioridad:** P1.
3. **Arena:** Ruinas.
4. **Entidad:** arbusto que esconde enemigos.
5. **Asset type:** prop animado.
6. **Nombre:** `maleza_emboscada`
7. **Estado:** PLACEHOLDER (cuadraditos verdes que tiemblan, ojos amarillos).
8. **Motivo:** emboscadas siempre avisadas.
9. **Referencia canon:** vegetación del Bosque (`aidBuildBosque`).
10. **Archivo de referencia:** captura `bosque` (tools/identity/shots.js).
11. **Paleta:** `#2e5a24` `#3f7a2e` `#5a9a3a`, ojos `#ffe066`, fuego `#ff6a2a`.
12. **Tamaño:** ≈ 40×24 px.
13. **Proporción:** ancha y baja.
14. **Perspectiva:** 3/4.
15. **Direcciones:** 1.
16. **Animaciones:** temblando, ojos, estallido (salta la jauría), ardiendo.
17. **Frames:** temblando 4, ojos 2, estallido 6, ardiendo 6.
18. **Timing/FPS:** 12 fps.
19. **Loop:** temblando, ardiendo.
20. **Background:** transparente.
21. **Pivot:** base.
22. **Hitbox:** ninguna.
23. **VFX:** hojas volando.
24. **Telegraph:** el propio temblor + "!" (ya existe).
25. **Filename:** `maleza/atlas.png`.
26. **Destination path:** `assets/sprites/arenas/bosque/maleza/`.
27. **Integration notes:** `bosDrawGround` (sección de emboscadas).

### ACU-01 / ACU-02 / ACU-03 — Corrientes, chorro y charco conductor

1. **ID:** ACU-01, ACU-02, ACU-03
2. **Prioridad:** P1.
3. **Arena:** Acuática.
4. **Entidad:** zonas de agua.
5. **Asset type:** tiles animados en el piso + VFX.
6. **Nombre:** `corriente_lineal`, `remolino`, `anillo`, `chorro`, `charco_conductor`.
7. **Estado:** PLACEHOLDER: chevrones, espirales, arcos punteados, boca y charco dibujados con código.
8. **Motivo:** "el agua decide hacia dónde vas".
9. **Referencia canon:** VFX de agua existentes (`acua2`, `VFX_PAL.water`).
10. **Archivo de referencia:** captura `acuatica` (tools/identity/shots.js).
11. **Paleta:** `#7fd0e0` `#cfeeff` `#3a8aa0`; el charco con carga usa `#ffe86a` `#fff6c0`.
12. **Tamaño:** franja lineal en tiles de 32×32 px; remolino 150×120 px; boca 24×12 px; charco 108×86 px.
13. **Proporción:** achatada (perspectiva de piso).
14. **Perspectiva:** cenital 3/4.
15. **Direcciones:** 1 (la franja rota con el código).
16. **Animaciones:**
    - Flujo: loop.
    - Remolino: giro.
    - Boca: burbujeo y disparo.
    - Charco: reposo, cargando y descarga.
17. **Frames:** flujo 8, remolino 8, boca 4 + 6, charco 4 + 4 + 6.
18. **Timing/FPS:** 10 fps.
19. **Loop:** todas salvo la descarga y el disparo.
20. **Background:** transparente.
21. **Pivot:** centro.
22. **Hitbox:** la define el código.
23. **VFX:** burbujas y rayos.
24. **Telegraph:** chorro y charco usan `vfxTelegraph` (línea y círculo).
25. **Filename:** `corrientes/atlas.png`.
26. **Destination path:** `assets/sprites/arenas/acuatica/corrientes/`.
27. **Integration notes:** `acuDrawGround`.

### LAB-01 — Sello de piedra

1. **ID:** LAB-01
2. **Prioridad:** P1.
3. **Arena:** Laberinto.
4. **Entidad:** placa con número romano.
5. **Asset type:** decal con estados.
6. **Nombre:** `sello`
7. **Estado:** PLACEHOLDER (octógono con número contorneado).
8. **Motivo:** "el Laberinto se resuelve".
9. **Referencia canon:** piedra y arenisca del Laberinto (`aidLabyrinthLayout`, muros).
10. **Archivo de referencia:** captura `laberinto` (tools/identity/shots.js).
11. **Paleta:** `#2a241c` `#8a7350` `#c9a56a`, encendido `#ffd27a` `#fff0c0`, error `#ff6a4a`.
12. **Tamaño:** 48×32 px.
13. **Proporción:** octógono achatado.
14. **Perspectiva:** cenital.
15. **Direcciones:** 1.
16. **Animaciones:** apagado, encendiéndose, encendido (loop), error (destello rojo), resuelto.
17. **Frames:** 1 + 6 + 4 + 4 + 8.
18. **Timing/FPS:** 10 fps.
19. **Loop:** encendido.
20. **Background:** transparente.
21. **Pivot:** centro.
22. **Hitbox:** ninguna.
23. **VFX:** polvo y rocas (las rocas del error ya usan `bossStrike`).
24. **Telegraph:** —
25. **Filename:** `sello/atlas.png` (3 variantes de número).
26. **Destination path:** `assets/sprites/arenas/laberinto/sello/`.
27. **Integration notes:** `labDrawGround`.

### BOSS-01..03 — Jefes con un solo frame

1. **ID:** BOSS-01 (Mago de Hielo y Cristal), BOSS-02 (Ángel Caído), BOSS-03 (Jinete Sin Cabeza)
2. **Prioridad:** P1.
3. **Arena:** Gélida, Gélida y Ruinas.
4. **Entidad:** jefes finales de arena.
5. **Asset type:** atlas de animación.
6. **Nombre:** `mago_hielo_cristal`, `angel_caido_hielo`, `jinete_sin_cabeza`
7. **Estado:** PARTIAL. Solo `static.png`: hoy se animan con bob, tinte y efectos.
8. **Motivo:** "las transformaciones narrativamente importantes necesitan frames" (sección 55). El Mago Gélido es uno de los Cuatro.
9. **Referencia canon:** **preservar exactamente** los `static.png` actuales (ropa, silueta, colores, arma).
10. **Archivo de referencia:** `assets/sprites/bosses/<arena>/<jefe>/static.png`.
11. **Paleta:** la del `static.png`.
12. **Tamaño:** el del `static.png`.
13. **Proporción:** la del `static.png`.
14. **Perspectiva:** la misma.
15. **Direcciones:** 1 (con espejo).
16. **Animaciones:** idle, cast/ataque (2 variantes), hit, muerte. El Ángel Caído también necesita la transición de fase del Mago al Ángel.
17. **Frames:** idle 4, 6 por ataque, hit 2, muerte 8, transición 10.
18. **Timing/FPS:** 8–10 fps.
19. **Loop:** idle.
20. **Background:** transparente.
21. **Pivot:** base.
22. **Hitbox:** la actual (`ENEMY_BASE`).
23. **VFX:** hielo; llamas azules en el Jinete.
24. **Telegraph:** los existentes.
25. **Filename:** `atlas.png` + `meta.json` (el mismo formato de `enemyAtlasPackLoad`).
26. **Destination path:** la carpeta del jefe.
27. **Integration notes:** `ANIM_PROFILES` / `enemyAtlasPackLoad`, como el Micelial.

### Arenas EN DESARROLLO (P2, grupo)

- **ARENA-CM Ciudad Maldita.** Estructuras que defender, civiles y derrota si caen todas.
- **ARENA-AB Abismo.** Plataformas que colapsan, rescate de colgados, Jinete como cazador, Entidad del Abismo.
- **ARENA-MP Minas Profundas.** La luz es territorio, antorchas, Devoraluz.

No hay **nada** de arte de estas tres arenas en el repositorio (ni hojas, ni referencias). Cada una necesita, como la Fortaleza y el Micelial:
6 enemigos, subjefe, jefe, 2 fondos pintados y VFX propios. No se inventaron.

---

## READY-TO-GENERATE PROMPTS (P0 / P1)

> Copiar tal cual. Adjuntar siempre la imagen de referencia indicada cuando exista.

### P0 · NAR-01 — El Hechicero (guía + jefe)

```
LA HORDA — dark fantasy — detailed 16-bit pixel art sprite sheet, crisp pixel edges, no blur, no antialiasing, transparent background.
Character: "El Hechicero", a hooded sorcerer, the fourth ancient Guardian (never reveal the face: deep hood, only one faint violet eye glow).
Robes in near-black violet (#0e0907, #1a1024, #3a2650), trims #8a6aaa, eye glow #c9a8ff. Humanoid proportions matching the reference champion (head ≈ 1/5 of height).
preserve exact canonical design if a canon is provided; otherwise keep the silhouette minimal and faceless. consistent proportions, consistent palette, same camera perspective as reference (3/4 top-down, like the attached champion sprite).
Canvas grid: 1 pixel = 2 world units; character ≈ 34×40 px per frame.
Rows (4 directions: down, up, left, right): idle 4 frames, walk 6 frames, cast 6 frames, hit 2 frames.
Extra row (down only): "hood reveal" 8 frames — the hood falls back revealing only darkness and runes, no face.
Boss rows (down only, 1.6× scale ≈ 56×64 px): 3 "cracking" stages, 4-frame loop each — stage 1 intact, stage 2 cracks with red light (#ff3a2a) leaking, stage 3 deformations/shadow tendrils.
Also a separate 64×64 dialogue portrait: bust, hood, violet eye glow, dark background vignette optional.
complete uncropped sprites, clear spacing between frames (at least 4 px), feet aligned on a common baseline per row.
```

### P0 · NAR-02 — Demonio de la Horda

```
LA HORDA — dark fantasy — detailed 16-bit pixel art boss sprite sheet, crisp pixel edges, no blur, no antialiasing, transparent background.
Entity: "Demonio de la Horda", final transformation of El Hechicero. USE THE ATTACHED CANONICAL DESIGN — preserve exact canonical design (horns, anatomy, colors, silhouette). Do not redesign.
consistent proportions, consistent palette, same camera perspective as reference (3/4 top-down, like the attached Demonio Mayor sheet), about 2× the Demonio Mayor size.
Rows (front-facing, mirror allowed): transformation from the hooded sorcerer 12 frames, idle 6, attack A (slam) 8, attack B (fissure summon — ground cracks with lava #ff5a14/#ffb347) 8, attack C (sweep) 8, death/collapse 10.
complete uncropped sprites, clear spacing between frames, pivot at the base, consistent baseline.
```

### P1 · Mecánicas de arena (un pedido por grupo)

```
LA HORDA — dark fantasy — detailed 16-bit pixel art, crisp pixel edges, no blur, no antialiasing, transparent background, consistent proportions, consistent palette, same camera perspective as reference (3/4 top-down ground props like the attached arena screenshot), complete uncropped sprites, clear spacing between frames, preserve exact canonical design of the existing props shown.
Grid: 1 pixel = 2 world units.

[INFERNAL — FISURA] Ground fissure portal, flattened 2:1. Palette #1a0b07 edge, #ff5a14 core, #ffdc78 center, mouth #12070a.
Rows: forming 6 frames (60×30), stage-1 loop 4 (60×30), stage-2 loop 4 (80×40), stage-3 loop 4 (110×55), grow transition 4, react/spew 4, sealing 8 (glow collapses, stone stitches the crack), scar 1.

[GÉLIDA — BRASERO] Stone brazier 18×26 px, frosted cold stone (#2a2e36, #56606e, frost #cfe6ff). Rows: lit flame loop 6, dying 4, out 1 (frost on cold embers), igniting 6.

[RUINAS — RUNA + MALEZA] (a) Rune overlay 14×24 px for the attached menhir: charging fill 8 steps (#3f7a2e → #b8ff9a), ready loop 4 (glow #eaffdf), fire 6. (b) Ambush bush 40×24 px (#2e5a24, #3f7a2e, #5a9a3a): shaking loop 4, glowing eyes 2 (#ffe066), burst 6 (leaves flying), burning loop 6.

[ACUÁTICA — CORRIENTES] (a) Linear current floor tile 32×32 seamless flow loop 8 frames (#7fd0e0, #cfeeff). (b) Whirlpool 150×120 spin loop 8. (c) Jet vent 24×12: bubbling 4, blast 6 (water column). (d) Conductive puddle 108×86: idle 4, charging 4 (#ffe86a sparks), discharge 6.

[LABERINTO — SELLOS] Octagonal sandstone floor seal 48×32 (#2a241c, #8a7350, #c9a56a) with Roman numerals I, II, III (three variants). Rows per variant: off 1, lighting 6, lit loop 4 (#ffd27a, #fff0c0), error flash 4 (#ff6a4a), solved 8.

[INFERNAL — MURAL] Flat stone relief 132×54 (opaque slab #1a1210/#2c211c) with four carved figures side by side: the Frost Mage (attach mago_hielo_cristal/static.png), an Elven Guardian with antlers and bow, the Labyrinth Guardian with horned helm and shield (attach guardian_laberinto/idle1.png), and a fourth hooded faceless figure carved deeper with a faint violet eye (#c9a8ff). Cracks cross the slab.
```

### P1 · Jefes con un solo frame

```
LA HORDA — dark fantasy — detailed 16-bit pixel art boss animation sheet, crisp pixel edges, no blur, no antialiasing, transparent background.
preserve exact canonical design of the ATTACHED static sprite (same clothes, armor, face, silhouette, weapon, colors, anatomy) — only add frames, never reinvent.
consistent proportions, consistent palette, same camera perspective as reference, same pixel size as the attached static.png.
Rows: idle 4, attack A 6, attack B 6, hit 2, death 8. For "Ángel Caído": add a 10-frame transformation row from the attached Mago de Hielo y Cristal into the attached Ángel Caído.
complete uncropped sprites, clear spacing between frames, feet on a common baseline, pivot at the base.
Entities (one sheet each): Mago de Hielo y Cristal, Ángel Caído (hielo), Jinete Sin Cabeza.
```
