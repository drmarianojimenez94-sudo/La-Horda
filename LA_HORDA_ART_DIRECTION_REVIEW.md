# LA HORDA — Review de Dirección de Arte (crítica fuerte)

> Escrita como director del departamento de arte visual, con la vara de un juego que quiere salir como
> indie y competir con juegos comerciales grandes, y después convertirse en un MOBA.
> Basada en capturas reales del juego en celular horizontal (844×390, DPR 2): las 7 arenas, el jefe final,
> los gólems, y **las 48 habilidades de los 12 campeones en Nv. 1/3/5/7/10** (hojas en
> `docs/playtest/evolucion/`, herramienta `tools/playtest/shot_evolution.js`).
> Capturas de esta review: `docs/playtest/review/`.

---

## 0. Veredicto en una página

**Hoy La Horda es un prototipo con sistemas de juego comercial y una imagen de juego amateur.** El código
tiene profundidad real (reacciones, roles, jefes con fases, red, evolución de habilidades), pero la
pantalla no lo vende: en una captura cualquiera, un jugador nuevo no distingue en 2 segundos quién es él,
qué le va a pegar y qué acaba de hacer su habilidad. Esa es la vara de Hades, Brotato o Wild Rift, y hoy
no la pasamos.

| Área | Nota (1–10) | Referencia comercial | Qué nos separa |
|---|---|---|---|
| Lectura del combate (figura/fondo) | **5** | Hades 9, Vampire Survivors 8 | Pisos con mucho detalle, enemigos del mismo valor que el piso, texto flotante encima de todo |
| Coherencia de estilo de sprites | **4** | Dead Cells 9 | Densidades de píxel y luz distintas entre campeones, enemigos y jefes |
| Identidad de arenas | **6** (antes 4) | Hades 9 | Mejoraron con muros y color propio, pero son pisos repetidos + utilería, no lugares pintados |
| VFX de habilidades | **6** | Diablo IV 9, LoL 9 | El Mago y la Soporte escalan bien; el Asesino y la Cazadora casi no cambian del Nv.1 al 7 |
| Jefes | **6** | Diablo IV 9 | Buenas mecánicas, pocas animaciones (poses estáticas que se deslizan), el ángel final es un recoloreo |
| HUD / UI móvil | **4** | Wild Rift 9, Brawl Stars 9 | El HUD tapa ~27% de la pantalla; emojis como íconos; 3 familias tipográficas |
| Animación | **4** | Hades 9 | Muchos enemigos con 1–4 cuadros; "respirar" hecho con escala; faltan anticipación e impacto por cuadro |
| Preparación para MOBA | **3** | Wild Rift, Battlerite | Sin lenguaje de color aliado/enemigo, telegraphs sin dueño, siluetas que no se leen a distancia |

**Lo que sí está a nivel y no hay que tocar:** el pipeline de recorte de hojas (ya probado con 12 campeones
y 3 jefes), el sistema de evolución Nv.3/5/7/10, el pase de contraste de efectos (sombra + color + núcleo
blanco), el Reino Micelial como arena pintada (es el modelo a seguir), la pantalla previa con el Hechicero
y la estructura de lore de los Cuatro Guardianes.

---

## 1. Los 12 problemas más graves (ordenados por impacto)

### P1 — No hay una regla de densidad de píxel: el juego parece hecho con piezas de juegos distintos
**Qué veo.** El Hechicero y el Golem de Cuerpos tienen detalle de ilustración; los campeones son sprites
chicos y limpios; los esqueletos del Laberinto tienen otra paleta y otro contorno; el Kraken y el Leviatán
otra luz. En `arena_laberinto.jpg` los golems de piedra (enemigos) tienen más ruido que los campeones.
**Por qué importa.** Es lo primero que un jugador de Steam/tienda nota en un tráiler: "assets mezclados".
Dead Cells o Blasphemous se ven caros porque TODO respeta la misma grilla y el mismo contorno.
**Arreglo.** Regla en `docs/ART_BIBLE.md`: 1 píxel de arte = 2 unidades de mundo para personajes y
enemigos (jefes: la misma densidad, más grandes, nunca más detalle por píxel); contorno oscuro de 1 px en
todo lo que se mueve; luz de arriba a la izquierda. Pasar los atlas existentes por el pipeline con
reducción a esa grilla + cuantización de paleta por arena. **Costo:** 2–3 días de código (herramienta) +
revisar hoja por hoja.

### P2 — El HUD se come la pantalla de un celular
**Qué veo.** Panel de vida arriba a la izquierda, ficha de la arena debajo, lista de aliados debajo de eso,
barra de pausa/sonido, ulti arriba a la derecha y 5 botones grandes abajo a la derecha: **~27% de la
pantalla** tapada (medido en 844×390). En la Fortaleza y el Micelial hay enemigos debajo de los paneles.
**Referencia.** Wild Rift y Brawl Stars: ≤15% de HUD, paneles translúcidos, aliados como retratos chicos.
**Arreglo.** (a) La ficha de la arena se vuelve un chip de una línea arriba al centro; (b) aliados = 3
retratos de 28 px con anillo de vida; (c) botones de habilidad −20% de tamaño en arco alrededor del ataque;
(d) la ulti se mueve al arco (hoy está duplicada: recuadro arriba + botón "ULT"). **Costo:** 1–2 días.

### P3 — Texto flotante encima del combate
**Qué veo.** "NIVEL 4 · Raíces Voraces ×3" en el medio de la pantalla sobre los personajes; "¡SIGILO!",
"¡TRIPLE GOLPE!", "Necesitás una Marca de Duelo activa", "+VIDA MÁX", números de daño apilados
(`-11 -15 -21`). En hordas grandes la mitad de la información es texto.
**Referencia.** Hades: el nombre de la habilidad nunca aparece; el número de daño es chico y opcional.
**Arreglo.** Carteles solo en la franja superior (18% de alto); nombres de habilidad fuera del mundo (el
botón ya lo dice); números agregados por objetivo (uno que sube en vez de cinco); opción "números de daño:
todos / críticos / ninguno". **Costo:** 1 día.

### P4 — Las arenas son pisos con textura repetida, no lugares
**Qué veo.** En las 6 arenas que no son el Micelial se nota la baldosa repetida y el mismo "plato" central
(la rueda de sol del Laberinto, el pentagrama de la Infernal). Con los muros nuevos (este pase) ya hay
estructura, pero sigue siendo utilería sobre un patrón.
**Referencia.** Hades: cada cámara es una composición pintada con luz, recorrido y fondo.
**Arreglo.** Repetir la receta del Micelial en todas: **un mapa pintado por arena** (1536×1024, vista 3/4)
+ capa de utilería separada + los muros de `arena-blocks.js` alineados con lo pintado. Pido el arte en la
sección 6. **Costo de código:** medio día por arena cuando llega el arte.

### P5 — No hay modelo de luz
**Qué veo.** Todo está iluminado igual; lo único que "brilla" son los efectos aditivos, que al apilarse se
queman a blanco. Los braseros de la Fortaleza y la lava de la Infernal no iluminan a nadie.
**Arreglo.** Capa de luz por arena: viñeta multiplicativa + charcos de luz cálida alrededor de braseros,
lava y cristales (sprites de luz baratos, ya existe `glowSprite`) + los personajes cerca de una fuente
reciben un borde de ese color. Tope de brillo aditivo por zona. **Costo:** 2 días.

### P6 — Animación insuficiente para el nivel de detalle del arte
**Qué veo.** Muchos enemigos con 1–4 cuadros; el Golem de Cuerpos tiene 3 poses y se desliza; el
Hechicero no tiene cuadro de "golpe recibido" propio; varios campeones "respiran" con escala.
**Referencia.** Hades: 6–8 cuadros de caminar, anticipación (2 cuadros) → impacto (1 cuadro sostenido) →
recuperación. Sin eso, el golpe no pesa aunque haya hit-stop.
**Arreglo.** Lista priorizada de animaciones (sección 6) y, mientras tanto, regla de código: todo ataque
de jefe tiene 1 cuadro de anticipación sostenido ≥120 ms (el sistema de telegraph ya lo permite).

### P7 — Enemigos que se pierden en su propio piso
**Qué veo.** Esqueletos rojizos sobre la lava de la Infernal (`arena_infernal.jpg`); demonios oscuros sobre
el empedrado oscuro de la Fortaleza; hongos violeta sobre el piso violeta del Micelial.
**Arreglo.** Borde de 1 px claro (o de color complementario al piso) para enemigos en arenas oscuras,
calculado por arena como ya hacemos con `FX_CONTRAST_UNDER`. Sombra de contacto más oscura en pisos claros
(Gélida). **Costo:** medio día.

### P8 — El lenguaje de color de los avisos no está unificado (bloqueante para MOBA)
**Qué veo.** Los avisos de jefe usan la paleta de cada jefe (dorado, celeste, verde, violeta); algunas
habilidades del jugador dejan anillos rojos (Asesino, Grito Provocador) que se confunden con peligro.
**Referencia.** League of Legends / Wild Rift: rojo = me daña, azul/verde = aliado, siempre.
**Arreglo.** Regla: **peligro enemigo = relleno rojo-naranja con borde que late**, el color temático del
jefe solo como detalle interior; habilidades del jugador **nunca** en rojo puro (se desplazan a su color de
campeón). En PvP: aliados celeste, enemigos rojo, sin excepciones. **Costo:** 1 día + revisar jefes.

### P9 — Íconos con emoji y tres tipografías
**Qué veo.** Botones con 🩸 ⚔ 🌀 ☾ ◈ ✚; cada sistema operativo los dibuja distinto, y se ven baratos.
Mezcla de *Press Start 2P*, *VT323* y una serif en el HUD.
**Arreglo.** Set de 48 íconos de habilidad a medida (pedido en sección 6) + una tipografía de display pixel
y una legible para texto largo. **Costo de código:** medio día.

### P10 — El Asesino y la Cazadora no se vuelven más espectaculares al subir de nivel
**Qué veo (hojas `guerrero.jpg`, `cazadora.jpg`).** Corte Sangrante, Triple Golpe, Flecha Perforante y
Trampa del Bosque se ven prácticamente iguales del Nv.1 al Nv.5. El Mago (`mago.jpg`), la Soporte
(`soporte.jpg`) y el Nigromante (`nigromante.jpg`, la Plaga) sí escalan de forma clara.
**Qué hice en este pase.** Firma de nivel en TODO lanzamiento (sello → chispas → columna → corona),
impacto en el enemigo que crece con el nivel, capas replicadas en `tieredBurstVFX` (antes el cooperativo
no las veía) y sello de buffs más fuerte. Mejora visible, pero **no alcanza**: esas 4 habilidades
necesitan su propio arte por hito (ej. el Corte deja una cicatriz de sangre en el piso en Nv.5 y un tajo
doble en Nv.7; la Flecha Perforante deja estela y en Nv.7 se parte en 3). **Costo:** 1–2 días de código
por campeón + arte.

### P11 — El jefe final no tiene arte propio
**Qué veo (`final_angel.jpg`).** El Ángel Corrompido funciona (alas dibujadas, cristales orbitando,
recoloreo carmesí), pero es el sprite del Hechicero teñido. Es el momento más importante del juego.
**Arreglo.** Arte real (HS-01b en `LA_HORDA_COMBAT_MISSING_ASSETS.md`). Las imágenes del ángel con alas y
del ángel corrompido que mencionaste **no llegaron**: mandalas y las integro sobre el mismo sistema.

### P12 — Paneles y menús genéricos
Pantallas de inventario, tienda y talentos con cajas marrones planas y el mismo borde. Para un juego que
quiere vender cosméticos y temporadas, la UI de colección es la vidriera. Pedido: un kit de UI (marcos por
rareza, fondos por pantalla, botones con estado) antes de la versión de tienda.

---

## 2. Crítica por arena (con lo hecho en este pase)

| Arena | Identidad hoy | Lo bueno | Lo que falla | Próximo paso |
|---|---|---|---|---|
| **Ruinas del Bosque** | Media | Menhires, raíces, ahora muros de piedra con musgo y bordes rotos | Piso de baldosa repetida, verde uniforme sin luz | Mapa pintado con claro de bosque, rayos de luz entre árboles |
| **Acuática** | Media-alta | Corrientes con flechas que ahora se leen como agua (antes parecían letras "L"), muros de coral | Piso de piedra oscura demasiado contrastado; los corales de fondo parecen recortes | Cáusticas de luz animadas en el piso; paleta teal más estrecha |
| **Fortaleza** | Media | Empedrado rehecho (antes era ruido), banderas, lava abajo | Enemigos oscuros sobre piso oscuro; demasiado marrón | Luz de braseros (P5) y borde claro en enemigos (P7) |
| **Micelial** | **Alta** | Mapa pintado; gradación nueva: el agua bioluminiscente es el único color vivo (`micelial_antes_despues.jpg`) | Sigue siendo el más cargado; el violeta de la infección tapa enemigos violeta | Reducir detalle en caminos jugables del mapa (pedido de arte) |
| **Gélida** | Media-alta | Nieve + estalagmitas, muros de hielo nuevos | Piso claro que quema los efectos (compensado con sombra de contraste) | Viento/ventisca como capa, no como partículas sueltas |
| **Laberinto** | Media | Muros reales (ya existían), obeliscos | El plato de sol central domina todas las capturas; mismo tono beige que los personajes | Bajar contraste del plato, variar el piso por zona del laberinto |
| **Infernal** | Media-alta | Grietas de lava, pentagrama, pozos de lava ahora orgánicos (antes cuadrados), muros de obsidiana | Enemigos rojos sobre rojo; el pentagrama compite con los avisos de jefe | Borde claro en enemigos; avisos de jefe fuera del rojo del piso (P8) |

---

## 3. Crítica de las habilidades (playtest con talentos al máximo)

Método: cada habilidad lanzada sola contra 7 enemigos quietos, captura a los ~260 ms, en Nv. 1/3/5/7/10
(en Nv.10 se lanza 3 veces para ver la Forma Final). Hojas en `docs/playtest/evolucion/`.

| Campeón | Escala visual 1→10 | Mejor habilidad | Peor | Nota |
|---|---|---|---|---|
| Mago | **Muy buena** | Cadena de Relámpagos (de 3 saltos a una tormenta) | Nova de Escarcha (el anillo casi no crece) | Modelo a seguir |
| Soporte | **Muy buena** | Bendición de Guerra / Escudo Sagrado (sellos que crecen) | — | Legible y elegante |
| Nigromante | Buena | Plaga de los Condenados (la nube crece mucho) | Gólem de Carne (depende de cadáveres) | Ahora con 4 gólems elementales |
| Tanque | Buena (tras este pase) | Grito Provocador (anillos + columna + corona) | Embestida (se mueve, poco rastro) | Grito de Guerra mejoró con el sello |
| Libertador | Buena | Bayoneta | Granaderos (siempre igual) | — |
| Segador | Media | Tajo | Último Aliento (siempre igual) | — |
| Profeta | Media | Danza del Augurio | Visión del Inmortal | — |
| Eren | Media | Equipo de Maniobras | ¡Avancen! | — |
| Musashi | Media | Paso Fantasma | Último Duelo (sin marca no pasa nada) | — |
| Axiom | Media | Error 404 | Force Quit (tiñe la pantalla igual en todos los niveles) | — |
| Cazadora | **Baja** | Lluvia de la Cazadora (crece bien) | Flecha Perforante, Trampa | Ver P10 |
| Asesino | **Baja** | Trampa de Área | Corte Sangrante, Triple Golpe, Pestilencia | Ver P10 |

Otros hallazgos del playtest:
- **Bug grave corregido:** los gólems de Fuego y de Hielo **nunca se aplicaban** (las banderas de talento
  con texto se guardaban como `true`). Ahora sí, con su arte real.
- Cuando una habilidad falla por requisito (Último Duelo sin marca, Gólem sin cadáveres) igual se ve el
  destello de lanzamiento: debería verse un "no" (destello gris + sonido de negación).
- La Forma Final (Nv.10) se anuncia con texto; debería anunciarse con el efecto (ya hay corona y columna).

---

## 4. Benchmarks y cómo usarlos

| Juego | Qué copiar (la idea, no el arte) |
|---|---|
| **Hades** | Composición de cada cámara, figura/fondo, animación con anticipación e impacto, UI mínima |
| **Diablo IV / Diablo II Resurrected** | Presentación de jefes (entrada, cambio de fase), ángeles y demonios, lenguaje de luz y sombra |
| **Vampire Survivors / Brotato** | Legibilidad con 200 enemigos: enemigos de valor medio, jugador y proyectiles con valor extremo |
| **Wild Rift / Brawl Stars** | HUD móvil (≤15%), botones en arco, lenguaje de color aliado/enemigo, siluetas legibles a distancia |
| **Battlerite / Eternal Return** | VFX de MOBA vista cenital: cada habilidad tiene forma clara en el piso antes y después del golpe |

---

## 5. Hoja de ruta visual (prioridades)

**P0 — antes de mostrarlo a nadie (1–2 semanas de código + arte pedido):**
1. HUD móvil a ≤15% (P2) y texto fuera del combate (P3).
2. Lenguaje de color de avisos (P8) y borde claro en enemigos por arena (P7).
3. Arte del Ángel Corrompido (HS-01b) y de los gólems Tormenta/Plaga (NG-01).
4. Íconos de habilidades a medida (P9).

**P1 — para el lanzamiento indie:**
5. Mapas pintados por arena (P4) y capa de luz (P5).
6. Regla de densidad de píxel y reproceso de atlas (P1).
7. Evolución propia para Asesino y Cazadora (P10).
8. Animaciones de jefes (Golem de Cuerpos, transformaciones HS-02/HS-03).

**P2 — camino a MOBA:**
9. Colores de equipo obligatorios en todo efecto; presupuesto de VFX por campeón (nadie tapa la pantalla).
10. Siluetas legibles a 1/2 de zoom; cámara PvP; indicador de dueño en cada aviso.
11. Kit de UI de colección/tienda (P12).

---

## 6. Lo que necesito de vos (arte), en orden

1. **Ángel con alas y Ángel Corrompido** (las imágenes que mencionaste; no llegaron). Prompt HS-01b.
2. **Gólem animado y sus especializaciones elementales** (tampoco llegaron). Prompt NG-01.
3. **Mapa pintado por arena** (Bosque, Acuática, Fortaleza, Gélida, Laberinto, Infernal), 1536×1024, vista 3/4,
   con los caminos jugables más lisos que los bordes (el Micelial es la referencia, pero con menos detalle en el centro).
4. **48 íconos de habilidad** (12 campeones × 4), 64×64, fondo transparente, silueta legible a 32 px.
5. **Animaciones del Golem de Cuerpos** y **transformaciones del final** (HS-02, HS-03).
6. **Tileset de muros por arena** (hoy los muros son procedurales: funcionan, pero con arte real ganan mucho).

Formato: hoja PNG con fondo transparente o damero (ya tengo recortador), cuadros del mismo tamaño, una fila
por animación.
