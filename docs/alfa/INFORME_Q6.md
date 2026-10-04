# INFORME Q6 — Arte técnico (sin arte nuevo)

Equipo Q6: escala de los sprites, luz por arena, sombras de piso, contraste figura-fondo y diferenciar los
cuerpos prestados de la Acuática. Todo con código y derivando del arte que ya existe (sin dibujar nada nuevo).

Detalle técnico y tablas completas: `docs/alfa/q6_arte_tecnico.md`. Capturas antes/después: `docs/alfa/q6/`.

## Qué cambió para el jugador (antes → ahora)

1. **Los héroes y el mundo parecían de dos juegos distintos.** Antes, en una misma pantalla, un píxel del arte
   del Caballero, el Asesino o el Mago ocupaba 0,3 píxeles de pantalla (arte fino achicado, con bordes que se
   cortan y titilan al caminar) mientras los monstruos iban a 1,5 y los jefes a 2,6 → ahora los héroes se
   dibujan desde una versión reducida y filtrada de su propio arte y quedan en ~1,1, igual que los 30 héroes
   nuevos de la expedición. La diferencia de tamaño de píxel entre el actor más fino y el más grueso de cada
   pantalla bajó de ×7,0 a ×3,0 (mediana de 30 pantallas).
2. **Algunos monstruos y jefes se veían "en bloques".** Antes el Verdugo, el Campanero, el Acechante y el Perro
   de la Ciudad y el Devoraluz de las Minas se veían más pixelados que un jefe (3,1-3,5), Cerbero en bloques de
   6 píxeles, el Minotauro como una mancha de ruido y el Leviatán a 4,4 → ahora ningún común pasa de ~3, Cerbero
   bajó a 5,0 (sigue siendo el más grande de su arena), Minotauro a 3,0 y el Leviatán un 20 % más chico. Las
   zonas de golpe (hitbox) NO cambiaron: solo el dibujo.
3. **Faltaba la luz "estilo Diablo".** Antes solo las Minas y el apagón de la Ciudad tenían oscuridad con radio
   de luz → ahora las otras 9 arenas tienen una penumbra suave en el piso con luz alrededor de cada héroe y de
   los braseros/antorchas. Va DEBAJO de los avisos de peligro, la lava, los monstruos y los proyectiles: nada que
   haya que esquivar queda tapado, y los monstruos resaltan más sobre el piso oscuro. Si el juego va lento
   varios segundos (con la resolución ya al mínimo) la penumbra se apaga sola.
4. **Sombras desparejas.** Antes cada actor tenía una elipse negra de borde duro, y algunos tipos una segunda
   sombra extra → ahora todos (héroes, monstruos, jefes, invocaciones, pociones) tienen la misma sombra suave con
   un núcleo más oscuro bajo los pies: se ven apoyados en el piso.
5. **La Acuática parecía hecha con monstruos de otras arenas.** Antes 5 de sus 6 comunes eran cuerpos de otras
   arenas apenas recoloreados (el esqueleto cornudo, la araña, el demonio de hielo, el acechador, la medusa) →
   ahora cada uno tiene paleta propia de agua (verde-ahogado, cian-abisal, caparazón oxidado, medusa eléctrica que
   late con brillo propio, sirena turquesa), un contorno de agua que late y una pequeña variación de tamaño entre
   individuos para que la horda no parezca clonada.
6. **En el Campamento Veda era una mancha violeta.** Antes se dibujaba a ×3,4 (bloques de casi 7 píxeles) y se
   perdía en el fondo → ahora va a ×2,2, con más contraste y un borde de luz de la fogata (también el herrero),
   a la altura del héroe.

## Lo que quedó pendiente (y por qué)

- **Cerbero (5,0) y el Morador del Abismo (hasta 5,9) siguen en bloques grandes.** Su arte mide ~36 px de alto
  y su zona de golpe es enorme: achicarlos más los dejaría más chicos que el área que pega. Hace falta arte de
  mayor resolución (prohibido para el alfa).
- **Decorado ampliado** (estatua de la Ciudad ×5, farol ×3,2, piezas de 20 px a ×2,9): lo dejé casi igual para
  no mover colisiones ni el mapa; solo achiqué el farol. Una "grilla única" para todo el mundo (dibujarlo a
  baja resolución) mejoraría más, pero es un cambio de render grande para la víspera del alfa.
- **El Presentador usa el cuerpo del Mago Gélido** y el **Golem de Cuerpos** el gólem de cristal: es un choque de
  historia (lo señaló el crítico), no de escala; no lo toqué.
- **Rendimiento:** la máquina de pruebas estuvo con carga 35-40 (otros equipos), así que los tiempos absolutos
  no sirven. Medí A/B en la misma página (capas de Q6 prendidas y apagadas, intercaladas): ver la tabla del
  documento técnico. NO VERIFICADO en un teléfono físico.

## Pruebas corridas

| Prueba | Resultado |
|---|---|
| `tools/alfa/q6_pixel_scale.js` (nueva: mide el tamaño de píxel en 10 arenas × oleada/plantel/jefe + los 37 héroes) | antes/después guardado en `docs/alfa/q6/*.json`, sin errores de página |
| `tools/art/roster_gate.js` (Roster Art Gate del dueño, 113 apariencias) | 0 fallas (con mipmaps restringidos al lienzo del juego) |
| `tools/regression/t_juice.js` | pasa |
| `tools/regression/t_hit_react.js` | pasa |
| `tools/art/t_body_swaps.js` | (en curso al escribir este borrador) |
| `tools/items/t_camp.js` | (en curso al escribir este borrador) |

## Nota de mi área para el alfa: 6,5 / 10

Sube desde el 6,0 del crítico: los héroes y el mundo ya comparten el tamaño de píxel, hay luz común, sombras
iguales y la Acuática tiene identidad. No llega a 7,5 porque Cerbero, el Morador y parte del decorado siguen
en bloques grandes, y eso solo se arregla con arte de más resolución.

---

## Detalle técnico

- `js/rendering/art-direction.js` (nuevo): `ARENA_LIGHT` + `drawArenaLight()` (máscara a 1/4 de la vista,
  textura radial cacheada, `destination-out`, se llama en `render()` después de `drawAcuaAmbience()` y antes de
  `drawHazardZones()`), autoapagado por rendimiento (`arenaLightPerf`), `drawShadow()` común (sprite radial
  cacheado + núcleo), `artMipDraw()` (mipmaps por halvings con suavizado alto y alfa binario, elegido para que
  el píxel quede entre 0,7 y 1,4 de pantalla; solo si `ctx.canvas === canvas`), `ART_SCALE_CAP` (Leviatán 0,8).
  Interruptores: `?luz=0`, `?sombra=0`, `?mip=0`, `?tope=0` o `Q6_ART.*`.
- `js/rendering/anim-atlas.js`: `drawAnimFrame` y `drawAnimFrameSized` usan `artMipDraw`.
- `js/rendering/entities.js`: tope por tipo alrededor de `drawEnemyBody` (solo dibujo); sombra común.
- `js/rendering/pixel-sprites.js`: la `drawShadow` vieja pasa a art-direction.js.
- `js/data/body-swaps.js`: campos `pal` (mapa de degradé), `aura` (contorno derivado de la silueta) y `sizeVar`
  para los 5 de la Acuática. `js/rendering/enemy-sprites.js`: dibujo del contorno, brillo de la medusa y
  `packSizeVar` (WeakMap, no viaja por la red).
- Tablas de alto: `CM_HMUL` (verdugo 2,9→2,6, campanero 2,9→2,6, acechante 2,8→2,65, perro 2,3→2,25),
  `MN_HMUL` (cerbero 3,2→2,6, devoraluz 3,4→3,25), minotauro 2,7→2,5, farol de la Ciudad 96→84.
- `js/systems/camp.js`: `px` por personaje (Veda 2,2, herrero 1,75), contraste de Veda y `campRim()`.
- `tools/alfa/q6_pixel_scale.js`: medición (intercepta `drawImage` dentro de `render()`), capturas `.webp`,
  `--perf`, `--ab`.

Commits: ver `git log --oneline` con prefijo "Q6:" (lista en el mensaje final).
