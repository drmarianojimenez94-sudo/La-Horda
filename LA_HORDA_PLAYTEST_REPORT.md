# LA HORDA — Playtest Report (Alpha 0.1)

> Rama `claude/horda-latest-updates-gv4tlf`. Todo lo de abajo se **ejecutó** en Chromium sin GPU (Playwright) dentro del
> contenedor. Hay dos tipos de jugador:
> - **Bots / piloto automático:** simulación de un jugador competente (`tools/playtest/autopilot.js`), bots del juego y
>   pruebas dirigidas.
> - **Humanos:** ninguno. Todo lo que depende de sensaciones humanas o de un celular real está marcado
>   **HUMAN TEST REQUIRED**.
> Sin puntajes inventados: solo conteos y resultados medidos.

## Pase nocturno: combate, progresión, botín y economía (lo más reciente)

Detalle en `LA_HORDA_COMBAT_AUDIT.md`, `LA_HORDA_GAMEFEEL_REPORT.md` y `LA_HORDA_PROGRESSION_ECONOMY_REPORT.md`.

### Pruebas automáticas (todas en verde)

| Prueba | Resultado |
|---|---|
| Regresión funcional (menús, partida, guardados, celular) | **91/91** |
| `tools/items/`: objetos, Nigromante, reacciones, roles (15), ritmo (14), evolución (12), colisiones (7), destructibles (9), calificación (8), vida temporal del Tanque (4) | **0 fallas** |
| Identidad de arenas (`t_identity`) · Fortaleza (41/41) · Micelial | **OK** |
| Relay + chat (`server/test-relay.js`) | **0 fallas** |
| Red real e2e: 2 humanos, y 4 humanos + 5º rechazado | **0 fallas** |

Dos tests eran aleatorios y se volvieron deterministas: sellos del Laberinto en bolsillos inalcanzables (1 de
cada 7) y el Protector cuando salía un crítico.

### Dificultad: ¿se rompió algo? (A/B contra la versión base, mismas partidas)

Matriz de 12 campeones × Ruinas/Fortaleza/Infernal, campeones nivel 10 y 20, equipo automático, 1 partida por celda:

| Versión | Victorias | Ruinas | Fortaleza | Infernal |
|---|---|---|---|---|
| Base (antes del pase) | 5/36 | 3/12 | 2/12 | 0/12 |
| Nueva, tanda 1 | 11/36 | 4/12 | 4/12 | 3/12 |
| Nueva, tanda 2 | 8/36 | 3/12 | 3/12 | 2/12 |

No se volvió más difícil. Por campeón (tandas nuevas juntas): Segador 5/6, Eren 4/6, Soporte 4/6, Libertador 2/6,
Profeta 2/6; Axiom, Cazadora, Guerrero, Mago y Nigromante 0/6. Con 1 partida por celda las diferencias
individuales son ruido; lo firme es que no hay regresión.

**Fortaleza, primeros niveles (Axiom y Musashi nivel 10, 8 partidas):** muertes en los niveles 1–2: base 3/8 →
0/8 con el aviso nuevo de la picada del Dragón de Bronce. Nivel medio alcanzado: 3,5 → 4,1.

### Campaña desde cero (piloto automático, 31–40 partidas por campeón, 0 errores de página)

| Campeón | Partidas para terminar | Nivel al terminar | 5.000 de oro en la partida | Intentos en la Gélida | Arena más dura |
|---|---|---|---|---|---|
| Tanque | 11 | 35 | 7 | 2 | Ruinas (4, con nivel 1) |
| Mago | 10 | 39 | 6 | 1 | Laberinto (3) |
| Cazadora | 15 | 39 | 7 | 1 | Laberinto (6) |

**Corrección de lecturas anteriores:** las campañas simuladas de Alpha 0.1 (más abajo) mostraban "el Hielo es la
pared" (0/20, 1/22). Este pase encontró dos causas: el piloto **nunca gastaba los puntos de talento** (un jugador
real sí, con el botón del HUD) y un **bug real** del Tanque (vida máxima que bajaba hasta quedar negativa al elegir
refuerzos con el Grito de Guerra activo). Arreglado lo segundo y corregido el piloto, la Gélida sale en 1–2 intentos.
A/B justa (nivel 31): sin ajustes 9/12, con los avisos de 0,9 s del Demonio de Hielo y Fuego 9/12. Se quedó el
cambio de legibilidad y se quitó el tope de demonios que solo la facilitaba.

### HUMAN TEST REQUIRED (lo que ninguna simulación contesta)

- La Gélida en 2–4 intentos **para una persona** (el piloto esquiva perfecto).
- El Laberinto con personajes frágiles a distancia (la Cazadora necesitó 6).
- Hit-stop del crítico en celulares de 60 Hz, duración de la ceremonia del cofre y comodidad del chat con una mano.

## Cómo se jugó

| Herramienta | Qué hace | Resultado |
|---|---|---|
| `tools/identity/t_identity.js` | 81 chequeos de las mecánicas nuevas: acción contextual, fisuras, frío y braseros, runas y emboscadas, corrientes, sellos, etiquetas ambientales y tutorial. Incluye **partidas reales** de los niveles 2 a 5 en cada arena. | **81/81** |
| `tools/identity/t_identity_net.js` | Cooperativo real con el relay: Infernal con **4 jugadores** (11/11); Gélida (8/8), Acuática (6/6), Laberinto (6/6) y Ruinas (5/5) con 2 jugadores. | **36/36** |
| `tools/identity/shots.js` | Capturas en pantalla de celular (844×390) de cada arena con su mecánica activa. | revisadas a ojo |
| `tools/playtest/campaign.js` (progresión) | Campaña completa desde un guardado vacío con piloto automático: Tanque, Mago y Cazadora. | ver abajo |
| `tools/playtest/campaign.js` (A/B) | Versión vieja (`main`) contra la nueva, mismas partidas: Hielo con campeones de nivel 30 e Infernal con campeones de nivel 36. | ver abajo |
| Regresión | Funcional de menús y partida (91/91), Fortaleza (41/41), Micelial (OK), ciclo cooperativo de 4 navegadores ×3 rondas (102 chequeos, 0 fallas), gate de campaña (0 fallas), e2e de 2 humanos (0 fallas). | **verde** |

## Campaña simulada (piloto automático, guardado vacío)

Primera versión de las mecánicas, **antes** de los arreglos de bots y del frío descritos más abajo.

| Campeón | Partidas | Ruinas | Acuática | Fortaleza | Micelial | Hielo | Laberinto | Infernal | Nivel final |
|---|---|---|---|---|---|---|---|---|---|
| Tanque | 29 | 1/5 | 1/2 | 1/1 | 1/1 | **0/20** | — | — | 32 |
| Mago | 25 | 1/6 | 1/1 | 1/1 | 1/1 | 1/7 | 1/1 | 5/8 | 46 |
| Cazadora | 34 | 1/3 | 1/1 | 1/1 | 1/1 | **1/22** | 1/1 | 3/5 | 46 |

Cada celda es victorias sobre intentos. 0 errores de página en 88 partidas.

**Lectura:**

1. **Ruinas** necesita menos intentos que antes. La simulación previa, con la curva de XP anterior, pedía 8 y 9 intentos al Mago y a la Cazadora; ahora son 6 y 3. Las runas ayudan a la horda temprana.
2. **Laberinto** se pasa al primer intento en los tres casos. Los sellos resueltos aturden a la horda y curan.
3. **El Hielo es la pared.** Ya lo era antes de Alpha 0.1 (está anotado en `docs/arena-identity/hielo.md`). La primera versión del frío y de los bots lo empeoró; ver el A/B.

## A/B contra la versión vieja (`main`)

| Arena · nivel de campeón | Vieja | Nueva | Nota |
|---|---|---|---|
| **Hielo · 30** (Tanque/Mago/Cazadora × 6) | **10/18** (T 3/6 · M 6/6 · C 1/6) | **7/18** (T 4/6 · M 2/6 · C 1/6) | Versión final: frío suave y bots arreglados. |
| Hielo · 30 (Cazadora × 8, lote previo) | 3/8 | 2/8 (1ª versión) → 1/8 (frío suave, bots sin arreglar) | |
| **Infernal · 36** (T/M/C × 3) | 5/9 | **7/9** | Las fisuras no empeoraron la arena final: dejan pociones y aturden al sellarse. |

**Qué se hizo con el Hielo** (bucle diagnosticar → corregir → volver a probar):

1. **Frío más suave.** El frío por sí solo nunca congela (máximo 2 cargas), sube más lento y los braseros duran más.
2. **Bots selectivos.**
   - **Antes:** salían a encender braseros aunque no hiciera falta (valor 0,5 siempre) y a los sellos siempre, y dejaban solo al jugador.
   - **Ahora:**
     - Valor mínimo de 1 para ir a un objetivo.
     - Correa de 700 u respecto del jugador.
     - Un solo bot por brasero, sello o runa.
     - El brasero solo se enciende si hace falta.
3. **Bots que no se alejan de la pelea por el frío.** "Girar para no enfriarse" sacaba a los cuerpo a cuerpo del rango: dejaban de tanquear. Eso explicaba la caída del Mago como jugador.
4. **Medición instrumentada** (partidas completas con piloto automático): el frío por quietud se activó **0 veces** en todos los héroes. En la versión vieja, el Mago sin equipo también muere en los niveles 5-7 por proyectiles (`dragoncito_hielo`, `angel_hielo`).

**Conclusión honesta:** con n = 18 por lado, 10/18 contra 7/18 **no es concluyente**. La diferencia está dentro del ruido y el frío casi no actúa sobre el piloto automático.
Lo que sí es seguro es que **el Hielo sigue siendo la pared de la campaña** (≈40-55 % a nivel 30, contra ≈100 % en las arenas 1-4). Es un problema de balance **previo** que queda como pendiente de diseño. No se tocaron sus números de fondo (roster, Nova, jefe) para no mezclar cambios.

---

## Por arena

### 1. Ruinas del Bosque

| | |
|---|---|
| Runs | 3 progresiones completas (14 intentos en total) + partidas de los niveles 2-4 en `t_identity` + red 2 jugadores |
| Champions / composición | Tanque, Mago, Cazadora + 3 bots de roles distintos |
| Duración | ≈ 5 min por partida (promedio de la simulación: 300-360 s) |
| Resultado | Se pasa en 3-6 intentos desde el nivel 1 de cuenta |
| Mechanics probadas | Runas (carga, activación con el botón real, atrapa y lastima alrededor, el jefe apenas se frena, recarga), emboscadas (aviso de 2,6 s, jauría desde la maleza, nunca en el nivel 1 ni con subjefe), fuego que quema la maleza, bots que usan runas con horda, tutorial del Hechicero (moverse → atacar → habilidad, revivir con prioridad, y conceptos de combate cuando aparecen: recarga, daño recibido, energía, élites, jefes, refuerzo; no se repite) |
| No probadas | Tutorial con una persona real (claridad del texto y del ritmo); "ocultamiento" de los héroes en la maleza (**EN DESARROLLO**, no implementado) |
| Bugs | Corregido: el daño de la runa se multiplicaba por crítico y por procs → ahora es daño ambiental fijo |
| Arena Identity | **Sí:** "el bosque caza (emboscadas), las piedras recuerdan (runas)" |
| Arena Mastery | Sobrevivir a la emboscada → reconocer la maleza que tiembla → **llevar la horda a una runa cargada** |
| Difficulty | Primera arena; la runa facilita la horda temprana |
| Legibility | Buena en las capturas: glifo en el menhir, círculo de alcance punteado, "!" y ojos en la maleza |
| Boss | Jinete Sin Cabeza sin cambios. No se reemplazó por el Guardián Élfico del documento: no existe arte |
| Bots | Activan la runa si hay 4+ enemigos (probado) |
| Multiplayer | Runas y emboscadas iguales en host e invitado; el invitado activa la runa (probado) |
| Performance | update ≈ 0,6 ms/cuadro con ~50 enemigos (Chromium sin GPU, con otras simulaciones en paralelo) |
| Assets | Runa y maleza PROVISORIAS (BOS-01, BOS-02) |
| Recomendación | HUMAN TEST: ¿se entiende la runa sin leer? ¿La emboscada se siente justa? |

### 2. Arena Acuática

| | |
|---|---|
| Runs | Progresión (4 intentos) + partidas de los niveles 2-5 + red 2 jugadores |
| Resultado | Se pasa al primer o segundo intento |
| Mechanics probadas | Corriente lineal (arrastra héroes y enemigos; los jefes no se mueven), remolino (tira y gira), anillo, chorro (avisa en línea y empuja 150 u), charco (avisa y descarga: a los enemigos les pega fuerte y los aturde, al héroe poco), anguila que salta más lejos en un charco, Cadena de Relámpago que conduce en el charco, bots que evitan el ojo del remolino |
| No probadas | Sensación de control con el pulgar mientras te arrastra una corriente (**HUMAN TEST REQUIRED**, celular real) |
| Bugs | **Corregido (previo a Alpha 0.1):** la Corriente Profunda de siempre empujaba a los invitados desde el anfitrión y generaba correcciones de posición en cadena. Ahora el invitado se empuja solo (predicción). Probado: `sin_correcciones_en_cadena` |
| Arena Identity | **Sí:** "el agua decide hacia dónde vas" |
| Arena Mastery | Sobrevivir a las corrientes → usarlas para moverse → **arrastrar la horda a un charco antes de la descarga** |
| Legibility | Chevrones con borde oscuro (se mejoraron después de la primera captura), espirales del remolino, charco amarillo cuando carga |
| Boss | Leviatán sin cambios (el documento pedía al Kraken como jefe; acá el Kraken es subjefe, anotado) |
| Multiplayer | Zonas iguales en todos; el invitado es arrastrado y el anfitrión no lo corrige (probado) |
| Assets | Corrientes, chorro y charco PROVISORIOS (ACU-01..03) |

### 3. La Fortaleza Sin Fin

Sin cambios en esta fase: ya tenía identidad propia (puentes, Ciclo Mecánico). Regresión 41/41. Progresión: 1/1 en los tres campeones.

### 4. El Reino Micelial

Sin cambios de gameplay en esta fase. Su prueba se ajustó al modo campaña (el modo prueba hacía fallar el chequeo de guardado viejo).
`t_micelial` pasa. Un chequeo (`BOTS.vuelven_a_la_zona_segura`) falló una vez y pasó al repetirlo: es intermitente porque `botDangerVec` suma avisos aleatorios que siguen activos. **Flake preexistente**, no tocado.
Progresión: 1/1 en los tres campeones.

### 5. Arena Gélida

| | |
|---|---|
| Runs | 49 intentos en la progresión (1ª versión) + 44 del A/B + partidas de los niveles 2-4 + red 2 jugadores |
| Mechanics probadas | Frío por quietud (tras 1 s; nivel 1 más suave; el frío solo nunca congela), moverse calienta, brasero que calienta y derrite la escarcha, se apaga, se enciende con el botón real, Muro de Fuego y proyectiles que queman lo encienden, bots que encienden cuando hace falta, bots que no abandonan la pelea |
| Bugs corregidos | 1) El calor que derretía la escarcha podía dejar las cargas "colgadas" (el temporizador bajaba a 0 sin reiniciarlas). 2) Bots que se alejaban de la pelea (ver el A/B). 3) Frío demasiado punitivo (ver el A/B). |
| Arena Identity | **Sí** para un humano que se planta: medidor ❄, escarcha a los pies, borde helado, zona de calor. **Débil** en la simulación: el piloto casi nunca se queda quieto |
| Arena Mastery | Sobrevivir → no plantarse → **pelear cerca de un brasero y reencenderlo con fuego** |
| Difficulty | **La pared de la campaña (previo).** Ver el A/B |
| Boss | Mago de Hielo y Cristal → Ángel Caído: sin cambios; su arte es un solo frame (BOSS-01/02) |
| Multiplayer | Braseros y frío iguales; el invitado quieto se enfría; el invitado enciende y todos lo ven (probado) |
| Recomendación | Revisar la curva del Hielo con diseño (roster de proyectiles, Nova, jefe) **antes** de tocar el frío otra vez |

### 6. Laberinto Maldito

| | |
|---|---|
| Runs | Progresión (1/1 en Mago y Cazadora) + partidas de los niveles 2-4 + red 2 jugadores |
| Mechanics probadas | 3 sellos separados y libres de muros, el I se enciende, un orden equivocado castiga con rocas y reinicia, los tres en orden resuelven (aturdido, lento, cura, poción), la ventana de 40 s vence, sin sellos con subjefe, bots que resuelven en orden, flecha en el borde hacia el siguiente sello |
| Bugs corregidos | **Bots trabados contra las puntas de los muros** al ir a un sello. Tres rondas de diagnóstico: camino por la grilla, obstáculos inflados una celda y avance medido por el camino. De ~2/3 a 5/5 en la prueba y 38/38 distribuciones aleatorias |
| Arena Identity | **Sí:** "el Laberinto se resuelve" |
| Arena Mastery | Ver los sellos → aprender el orden → **separar al equipo o llevar la horda entre sellos** |
| Multiplayer | Sellos iguales; el invitado enciende el I y todos lo ven (probado) |
| Assets | Sello PROVISORIO (LAB-01) |

### 7. Arena Infernal

| | |
|---|---|
| Runs | Progresión (Mago 5/8, Cazadora 3/5) + A/B de 9 partidas por versión + partidas de los niveles 2-5 + red **4 jugadores** |
| Mechanics probadas | Fisuras (aviso, 3 etapas, 30-55 % de la aparición sale de ellas, escupen demonios, erupción telegrafiada), cerrar con el botón real (calor, reacción a mitad, sellado con aturdimiento y poción), soltar decae, alejarse corta, cooperar acelera, bajan una etapa entre niveles, Nova de Escarcha enfría, bots que cierran (máximo 2 por fisura, nunca rodeados), mural de los Cuatro, "Tres cayeron" |
| No probadas | La decisión humana "¿mato o cierro?" bajo presión (**HUMAN TEST REQUIRED**) |
| Difficulty | A/B 5/9 → 7/9: no la empeoró |
| Boss | Demonio Mayor sin cambios. El jefe final Hechicero → Demonio de la Horda **no existe** (sin arte ni canon: NAR-01, NAR-02) |
| Multiplayer | 4 jugadores: fisura igual en todos, el invitado cierra, el anfitrión lleva el progreso, soltar corta (probado) |

### 8-10. Ciudad Maldita, Abismo, Minas Profundas — **EN DESARROLLO**

No existen en el juego ni hay arte en el repositorio. No se simularon ni se fingieron. Ver `LA_HORDA_MISSING_ASSETS.md` (ARENA-CM, ARENA-AB, ARENA-MP).

### Arena Divina

El modo actual (asedio con torres) no se tocó. Las **5 Pruebas** del documento y el "Coliseo — próximamente" están **EN DESARROLLO**.

---

## Auditoría de retención — ¿por qué jugaría otra partida?

| Motivo | Estado |
|---|---|
| Builds / items / sets / talentos / maestría | Existen de antes (sistemas completos) |
| **Mastery de arena** | **Nuevo:** cada una de las 5 arenas del camino de siempre tiene algo que aprender y usar a favor (runas, corrientes, braseros, sellos, fisuras) |
| Loot | Existe (protección contra la mala suerte, sets por arena) |
| Narrativa | **Nuevo:** el Hechicero habla poco; aparecen "Tres cayeron" y el mural de los Cuatro. El jefe final y el twist **no están** (sin arte) |
| Momento "ya entendí todo" | Riesgo en las arenas 1-4, que se pasan en 1-2 intentos a nivel de campaña, mientras que el Hielo es un muro. **La curva está despareja** |

## Claridad de combate

- **Qué hice:** números de daño y feedback de impacto de siempre. Las acciones contextuales muestran una barra circular en el mundo, el porcentaje en el botón y un cartel al completarse.
- **Qué me pegó:** los avisos de siempre. Lo nuevo usa `vfxTelegraph` y `bossStrike`, que los bots ya saben esquivar.
- **Qué consecuencia tuvo:**
  - **Frío:** medidor, escarcha y borde.
  - **Calor al cerrar una fisura:** brasas sobre el héroe.
  - **Descarga del charco:** rayos y "¡Descarga! ×N".
- **Pendiente:** íconos de estado sobre los enemigos (ver la matriz de habilidades).

## Recomendaciones (ordenadas)

1. **HUMAN TEST** de los primeros 10 minutos (Ruinas) con alguien que no conozca el juego: ¿el Hechicero alcanza? ¿Se entiende el botón contextual?
2. **Diseño:** decidir la curva del Hielo, que era la pared antes de esta fase y lo sigue siendo.
3. **Arte P0:** el Hechicero y el Demonio de la Horda, para poder hacer el final de la campaña.
4. Probar en un celular real: el botón contextual arriba al centro, ¿tapa algo importante al cerrar una fisura?
