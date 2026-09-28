# LA HORDA — Reseña de crítico (retro / indie), vara Diablo II = 100

> **Versión final.** Puntúa la rama integrada `claude/horda-latest-updates-gv4tlf` (cuentas, logros, desafíos,
> pase, juice, música compuesta, historia en tres actos, cromas) más las correcciones de esta rama.
> Primera versión: commit `2fc34a4`.

## Cómo se jugó

- **Aparatos:** iPhone 14 acostado (844×390, táctil, dpr 2), Pixel 7 acostado (emulación de Playwright) y
  escritorio 1440×810. Perfil nuevo desde el título, con toques reales: joystick y botones por
  `Input.dispatchTouchEvent`.
- **Partidas:**
  - Ciudad Maldita completa del nivel 1 al jefe, en tiempo real: primera derrota en el nivel 2 y después victoria
    con el Mago.
  - Jefes de las 10 arenas: el tramo largo con el piloto automático "jugador competente"
    (`tools/playtest/autopilot.js`); el final de cada arena, en tiempo real.
  - Sala de a dos, anfitrión e invitado, con el relay local (`tools/net-test/shots.js`).
  - Menús, Códice, Sala, talentos, refuerzos, cofre y derrota. En la rama integrada, además: cuentas (invitado),
    Desafíos/Pase, voces de jefe y últimas palabras.
- **Fuentes:** las fuentes pixel reales se sirvieron en local. Sin eso, Chromium dibuja todo en monoespaciada y
  las capturas mienten. Por la misma razón las fuentes ahora vienen con el juego (ver §4).
- **Qué no se pudo medir:**
  - **NOT VERIFIED:** el audio de oído (música compuesta, mezcla).
  - **NOT VERIFIED:** teléfonos físicos.
  - **NOT VERIFIED:** los FPS representativos. La máquina estaba compartida con carga 20-40 y midió 9-10 FPS en
    los tres aparatos, un número que no sirve para juzgar.

**Vara:**
- **Diablo II = 100** en cada categoría: el estándar de loot, builds, atmósfera, audio y rejugabilidad.
- **Diablo III** es la referencia de sensación de golpe, claridad y temporadas.
- **Diablo Immortal** es la referencia de controles táctiles.
- Hades, Dead Cells, Vampire Survivors, Enter the Gungeon, Children of Morta y Hyper Light Drifter sirven de
  contraste indie.
- Es otra escala que la de la auditoría de alfa (76/100). Allá se medía si el juego estaba "listo para
  mostrarse". Acá se mide contra el mejor ARPG de la historia.

---

## 1. Puntaje: **59 / 100** (rama integrada + esta rama)

Antes de la integración (main + mis arreglos): 55,5. El objetivo del dueño es 90 en esta escala. **Hoy no está
cerca.** Faltan sistemas y contenido, no solo pulido. El pulido suma entre 3 y 5 puntos como mucho. Ver §3.

| # | Categoría | Peso | Nota /10 | Contra Diablo II / III |
|---|---|---|---|---|
| 1 | Primera impresión | 3 | 6,5 | Desfile de guardianes con brasas: lindo. Pie en inglés ("B1 COOPERATIVE PLAYTEST"), cartel de 10.000 de oro y ficha de "Invitado" encima del logo. D2 abre con una cinemática y la música de Tristram. |
| 2 | Claridad / onboarding | 3 | 6,5 | El Hechicero enseña jugando, y eso está muy bien (a la altura de D3). Pero del título a la primera pelea hay 8 pantallas, y la Sala de la primera vez tiene sala online, código, equipo, skins, set y talentos a la vez. |
| 3 | Controles táctiles | 4 | 7,0 | Joystick y botones grandes, ataque automático al más cercano, "+" de talento en el botón. Comparable a Immortal en lo básico. Falta apuntar las habilidades con arrastre. |
| 4 | Combate / juice | 9 | 6,5 | La rama integrada suma hit-stop, números, racha y sacudida con curva. Se nota: pasa de 5,5 a 6,5. Contra D3, los enemigos comunes casi no reaccionan (sin retroceso ni desmembrado), y el primer jefe no amenaza: al Mago le sacó 9 de 179 de vida. |
| 5 | Variedad de enemigos | 4 | 6,5 | Cerca de 70 tipos, con élites de conducta propia. Por arena se ven 2-3 tipos a la vez; D2 mezcla 6-8 con modificadores (rápido, encantado, aura). |
| 6 | Jefes | 6 | 7,0 | 22 jefes y subjefes con fases, guía "Cómo sobrevivir" y, en la rama integrada, voz y últimas palabras. Es lo mejor del juego. Contra D2: poco daño real y el Leviatán o el Minotauro se sienten como sacos de golpes con un par de telegrafiados. |
| 7 | Identidad de arenas | 5 | 7,5 | Cada arena tiene su regla: civiles y estructuras, runas, luces de las Minas, plataformas del Abismo, frío y braseros. Mejor que las zonas de D3. El arte todavía mezcla resoluciones (Ciudad, Abismo). |
| 8 | Guardianes / builds | 9 | 5,0 | 12 guardianes con kit propio. **Los talentos se abren en el nivel 40**, los refuerzos entre niveles son "+20 % daño" y "+18 % vida", y no hay sinergias ni habilidades que cambien de forma el golpe. D2: árboles con sinergias, runas y equipo que define la build. D3: runas de habilidad. |
| 9 | Progresión / retención | 6 | 6,0 | La rama integrada suma logros, desafíos diarios y semanales y un pase. Sube de 5 a 6. Castigo del 50 % y bajar de nivel en la primera derrota de la primera arena. |
| 10 | Rejugabilidad / endgame | 6 | 4,5 | Después de la Infernal está la Arena Divina (el Coliseo dice "Próximamente"). No hay dificultades escaladas (Pesadilla o Infierno), ni mapas al azar, ni ladder o temporadas con reinicio. D2 se rejuega por años. |
| 11 | Economía | 3 | 4,5 | 10.000 de oro de regalo y guardianes a 2.500: el primer día se compran 4. El oro no tiene más salidas. |
| 12 | Loot | 9 | 4,5 | **Es el mayor agujero contra D2.** En partida no cae nada que se pueda leer (solo "¡Objeto!", una reliquia invisible). Todo va a un cofre al final. Los comunes tienen un solo atributo ("+16 % escudo"). Hay 60 legendarios y 11 sets en datos, pero el momento de ver un nombre dorado en el piso no existe. |
| 13 | UI / UX | 5 | 6,5 | Después de los arreglos de §4: HUD en una sola familia pixel, carteles legibles y victoria clara. Sigue la Sala sobrecargada y hay emojis como íconos (🏰 🌵 🎽 🧤). |
| 14 | Dirección de arte | 8 | 6,5 | Los guardianes, el Ángel Corrompido y la Madre Espora (en el Códice) tienen arte fuerte. En partida hay mezcla de escalas, pisos repetidos, la Madre Espora como mancha de ruido a 844×390 y torres con aguja de un color (corregido). D2 es un solo tono y un solo tamaño de píxel. |
| 15 | Audio | 5 | 4,0 | La rama integrada trae música compuesta como datos, con leitmotiv y director por intensidad, pero sigue siendo síntesis en el navegador. Contra Matt Uelmen no hay comparación. **NOT VERIFIED de oído.** |
| 16 | Narrativa | 5 | 6,0 | Integrada: tres actos, voces de jefe, Crónicas coleccionables, últimas palabras de cada Guardián y epílogo. Las frases son buenas ("Éramos cuatro… el cuarto no cayó: eligió quedarse del otro lado"). Faltan pueblo, NPC y ritmo entre actos: en D2, Deckard Cain y los pueblos hacen la mitad del trabajo. |
| 17 | Multijugador | 5 | 6,5 | Sala de 4 por código, bots de relleno, invitado que ve lo mismo que el anfitrión, reconexión. Sin partidas públicas, sin intercambio y sin chat en partida. D2 tenía Battle.net y el intercambio como economía. |
| 18 | Rendimiento | 2 | 6,5 | La auditoría previa medía fluidez aceptable. Esta sesión no puede medirla (máquina saturada). |
| 19 | Pulido / bugs | 3 | 6,0 | Sin errores de consola en todo el recorrido (salvo el túnel del proxy). Bugs visibles: textos que se pisan en la victoria (toast del pase sobre el título) y la aguja plana (corregida). |
| | **Total ponderado** | 100 | **59,1** | |

## 2. Lo que se vio jugando (capturas en `docs/critic/`, todas en WebP de menos de 100 KB)

| Captura | Qué muestra |
|---|---|
| `01_titulo_iphone` | Buen título; pie en inglés y en otra tipografía |
| `02_menu_regalo` | 10.000 de oro de regalo: la economía no arranca |
| `03_sala_primera_vez` | La Sala al entrar por primera vez: demasiadas cosas |
| `04_primera_pelea_camara` | En el teléfono, el jugador queda en el tercio de arriba, debajo de la barra de civiles, y abajo hay pantalla vacía |
| `05_antes_guia_jefe_tapa` / `06_despues_guia_jefe_abajo` | La guía del jefe tapaba al jefe; ahora va abajo (arreglado) |
| `07_victoria_ultimas_palabras` | Victoria con las últimas palabras arriba (arreglado; antes quedaban bajo el botón) |
| `08_despues_refuerzos` | Refuerzos en una fila con marco pixel (arreglado; el contenido sigue siendo "+%") |
| `09_antes_cofre_apretado` | El cofre apretaba la ficha del objeto en 160 px (arreglado) |
| `10_desafios_integrado` | Desafíos y pase de la rama integrada: bien hechos |
| `11_despues_codice` | Bestiario sin el mosaico borroso (arreglado) |
| `12_talentos_nivel40` | Talentos bloqueados hasta el nivel 40 |
| `13_madre_espora_ruido` | La Madre Espora en partida: una mancha de ruido |
| `14_sala_de_a_dos_invitado` | Invitado en plena pelea, HUD limpio |
| `15_juego_integrado_racha` | Juice integrado (RACHA ×5); la voz del Hechicero tapa la mitad de abajo |

---

## 3. Lista priorizada (35 problemas)

- **Tipo:** **C** = código, se puede arreglar ya. **A** = necesita arte o audio nuevo. **D** = decisión de diseño.
- **Impacto:** puntos estimados en esta escala (Diablo II = 100).
- **Dueño sugerido:**
  - T1: yo (crítica y pulido)
  - T2: cuentas
  - T3: menú, tienda y perfil
  - T4: juice
  - T5: guardianes y skins
  - T6: logros, desafíos y pase
  - T7: lógica y red
  - Diseño: el dueño
  - Arte: encargo

### A. Loot y builds: lo que separa a La Horda de Diablo (≈ +14 puntos si se hace todo)

| # | Problema | Dónde / cómo reproducir | Propuesta concreta | Pts | Tipo | Dueño |
|---|---|---|---|---|---|---|
| 1 | No cae botín legible en partida | Cualquier arena: solo "¡Objeto!" flotante (`combat.js`, `grantRelic`) | Soltar objetos reales en el piso desde élites y subjefes, con haz de luz por rareza (el haz dorado de D3), nombre al pasar y un toque para juntar. El cofre final queda como bonus | +4 | C (+A para el haz) | T7 + Diseño |
| 2 | Los comunes y raros tienen un solo atributo | Cofre: "Rodela Remendada +16 % escudo" | 2-4 afijos al azar por rareza (prefijo y sufijo como en D2), rango visible ("+12-18 %") y comparación ▲▼ con lo equipado | +3 | C | T7 / Diseño |
| 3 | Talentos bloqueados hasta el nivel 40 | Sala → Talentos (captura 12) | Primer punto en el nivel 5 y una rama nueva cada 10 niveles. Hoy el jugador casual no ve builds en toda la campaña | +2,5 | C / D | T5 |
| 4 | Refuerzos planos entre niveles | Pantalla de refuerzo | Refuerzos que cambian la habilidad ("Nova deja escarcha en el piso", "Tajo rebota"), con rareza y sinergias entre los tres, como las bendiciones de Hades | +3 | C | T5 |
| 5 | Sin palabras rúnicas, crafteo de afijos ni gemas con peso | Inventario | Engarces más runas que combinan en objetos con nombre, sin Únicos crafteables (regla del juego). Es el "chase" de D2 | +1,5 | C / D | Diseño |

### B. Combate y jefes

| # | Problema | Dónde | Propuesta | Pts | Tipo | Dueño |
|---|---|---|---|---|---|---|
| 6 | El primer jefe no amenaza | Ciudad nivel 10: el Presentador le sacó 9/179 al Mago en toda la pelea | Subir el daño de los telegrafiados (Ovación Final, reflectores) y bajar la vida para que la pelea dure 60-90 s | +1 | C | T4 / T7 |
| 7 | Los comunes casi no reaccionan al golpe | Cualquier horda | Retroceso por peso, parpadeo blanco de 1 cuadro en todos, cadáveres que vuelan con el golpe fuerte | +1,5 | C | T4 |
| 8 | Sin modificadores de élite al estilo D2 | Élites | Afijos de élite (rápido, encantado de fuego, aura, espejo) con nombre generado: "Grukk el Hambriento" | +1,5 | C | T7 |
| 9 | Cámara baja en el teléfono | 844×390: el jugador queda bajo la barra de la arena, abajo sobra (captura 04) | En pantallas bajas, anclar los pies 10-15 % más abajo (`CAM_Y_ANCHOR` según el alto) | +0,5 | C | T4 |
| 10 | La voz del Hechicero tapa la zona de pelea | Primeros niveles de cada arena (captura 15) | Cuadro más bajo y angosto, o arriba a la derecha; que se esconda solo al recibir daño | +0,5 | C | T1 / T4 |
| 11 | Primera derrota castigada con −50 % y baja de nivel | Morir en la Ciudad nivel 2 | Sin castigo en la Ciudad y en las primeras 3 derrotas; después, como hoy | +1 | D | Diseño / T7 |

### C. Rejugabilidad y progresión

| # | Problema | Dónde | Propuesta | Pts | Tipo | Dueño |
|---|---|---|---|---|---|---|
| 12 | No hay dificultades escaladas | Campaña terminada | Pesadilla e Infierno (×2,5 y ×6 de vida, resistencias, mejor botín), como D2 | +3 | C | T7 / Diseño |
| 13 | Mapas fijos | Todas las arenas | Variantes por semilla: distribución de edificios, runas y luces al azar dentro de la regla de la arena | +2 | C | Diseño |
| 14 | El Coliseo dice "Próximamente" | Selección de arena | Ocultarlo hasta que exista (un "Próximamente" en la alfa resta) | +0,3 | C | T3 |
| 15 | Temporada sin reinicio | Pase | Temporada con personajes nuevos y ranking de la Arena Divina | +1,5 | C / D | T6 |
| 16 | Economía rota por el regalo | Menú: 10.000 de oro, guardianes a 2.500 | Regalo = 1 guardián; el oro compra re-tiradas de afijos, engarces y cromas | +1 | D | T3 / T6 |

### D. Arte y audio (no se arregla con código)

| # | Problema | Dónde | Propuesta | Pts | Tipo | Dueño |
|---|---|---|---|---|---|---|
| 17 | Mezcla de resoluciones | Ciudad (techos, pisos) y Abismo | Rehacer pisos y techos al mismo tamaño de píxel que los guardianes (`LA_HORDA_MISSING_ASSETS.md` C-1, C-2) | +2 | A | Arte |
| 18 | La Madre Espora es una mancha de ruido en partida | Reino Fúngico, jefe (captura 13) | Retrato a menor escala o con contorno y paleta limitada; en el Códice se ve bien | +0,7 | A (o C: escala) | Arte |
| 19 | Audio sintetizado | Todo | Música grabada por arena (8-10 temas) y golpes y gritos grabados. Es lo que más separa del ambiente de D2 | +3 | A | Audio |
| 20 | Emojis como íconos | Refuerzos (🏰 🌵), equipo (🎽 🧤 👢), menú (📖 🪙), HUD de aliados | Íconos pixel 16×16 (hay 6 de habilidad en `assets/ui/skill-icons`; faltan el resto) | +1 | A (+C) | Arte / T3 |
| 21 | Íconos pixel de habilidad solo para 6 habilidades | Botones del HUD | Completar los ~48 que faltan (hoy el resto usa glifos ◆ ❄ 💀) | +0,7 | A | Arte |

### E. UI / UX y claridad

| # | Problema | Dónde | Propuesta | Pts | Tipo | Dueño |
|---|---|---|---|---|---|---|
| 22 | 8 pantallas del título a la primera pelea | Perfil nuevo | Primer arranque: título → guardián → directo a la Ciudad (sin Modos, Arenas ni Sala); la Sala aparece después de la primera victoria | +1 | C | T3 |
| 23 | Sala sobrecargada | Sala | Pestañas "Equipo · Sala online · Arena"; lo online colapsado | +0,7 | C | T3 |
| 24 | Pie del título en inglés y en otra fuente | Título | "LA HORDA — ALFA COOPERATIVA", en VT323 | +0,2 | C | T3 |
| 25 | El toast del pase tapa el título de la victoria | Victoria con subida del pase (`m_16_vic`) | Toasts arriba a la derecha, apilados con el de desafíos | +0,3 | C | T6 |
| 26 | La ficha de cuenta es chica y el "?" mide 9,6 px | Menú (`ui_layout`: 2 fallas) | Ficha de 40 px de alto y avatar con letra más grande | +0,1 | C | T2 |
| 27 | El tilde de "Reducir movimiento" mide 24 px | Pausa (`ui_layout`) | Toda la fila tocable (label de 40 px) | +0,1 | C | T4 |
| 28 | Nombres de guardián largos rompen el HUD | "Segador Olvidado · Nv. 15" | Arreglado con puntos suspensivos; mejor, nombre corto de HUD ("Segador") | +0,1 | C | T5 |
| 29 | La Sala mezcla Georgia con la fuente pixel | "Tu nombre", textos de ayuda de la Sala y el menú | Misma unificación que se hizo en el HUD y el fin de partida | +0,5 | C | T3 |

### F. Narrativa y multijugador

| # | Problema | Dónde | Propuesta | Pts | Tipo | Dueño |
|---|---|---|---|---|---|---|
| 30 | No hay "pueblo" ni personajes entre arenas | Entre arena y arena | Un campamento de una pantalla (el Hechicero, un herrero, una vidente) con 2-3 líneas nuevas por acto | +1,5 | C + A | Diseño |
| 31 | Las Crónicas no se ven al levantarlas | Página en el piso | Al tocarla, mostrar el texto 3 s en pausa suave (hoy va directo al Códice) | +0,3 | C | T7 |
| 32 | Sin partidas públicas ni búsqueda | Sala online | Lista de salas abiertas ("Ciudad · 2/4 · Nv. 10-20") | +1 | C | T7 |
| 33 | Sin intercambio | Co-op | Intercambio de objetos entre jugadores de la misma sala (sin plata real) | +1 | C / D | T7 / Diseño |

### G. Técnico

| # | Problema | Dónde | Propuesta | Pts | Tipo | Dueño |
|---|---|---|---|---|---|---|
| 34 | Las fuentes venían de Google Fonts | `index.html` | **Arreglado:** servidas desde `assets/fonts` (OFL). Sin red, el HUD caía a Georgia y se desarmaba | +0,5 | C | T1 ✔ |
| 35 | Carga inicial larga | 17-48 s en esta máquina saturada (no representativo) | Medir en teléfono real con `tools/audit/loadtime.js`; si pasa de 8 s, cargar el arte de cada arena al entrar | ? | C | T7 |

**Suma de la lista:** unos 45 puntos posibles.
- Con lo de **código** de las secciones A, B, C, E y F (unos 28 puntos) el juego llega a **80-85**.
- Para **90** hace falta además arte y audio profesional (sección D, unos 8 puntos). Sin eso, el techo realista
  es 85.

---

## 4. Lo que arreglé en esta rama (seguro, sin tocar áreas de otros)

| Qué | Dónde | Antes → después |
|---|---|---|
| Mayúsculas acentuadas en la fuente pixel | `js/ui/pixel-font-fix.js` (nuevo) | Press Start 2P no las trae: se veía "CóDICE", "VOLVIó", "ARENA GéLIDA". Ahora, en los textos con esa fuente, van sin tilde ("CODICE"), como en los carteles de 8 bits |
| Fuentes locales | `assets/fonts/*.woff2`, `css/base.css`, `index.html` | De Google Fonts a archivos del juego (subconjunto latino, SIL OFL 1.1, 30 KB) |
| HUD en una sola familia | `css/hud.css` | Mezclaba Georgia, VT323 y Press Start. Ahora VT323 en todo lo chico y la fuente de títulos en el nombre del jefe. Íconos pixel de habilidad en los botones cuando existen. "Ultimate" → "Definitiva". Renglones sin cortes |
| Guía del jefe | `css/hud.css` | Tapaba al jefe y la barra de estado de la arena. En el teléfono ahora va abajo al centro, y el Hechicero se esconde mientras se ve |
| Refuerzos | `buff-choice.js`, `overlays.css`, `index.html` | Las tres cartas en una fila, con marco pixel, título más grande y voseo ("elegí"). Fuera de línea se oculta la nota "se decide por voto", que era falsa: cada uno elige el suyo |
| Victoria | `end-screens.js`, `panels.css` | "VICTORIA" grande en pixel. Las últimas palabras del jefe van arriba de la tabla (antes quedaban bajo "Continuar"). Tabla en dos columnas en el teléfono. Cofre con ancho para la ficha. "Performance" → "Calificación". Todo en letra pixel |
| Derrota | `panels.css` | El golpe ("La Horda te ha consumido") es el título grande; el resultado va debajo, en letra de cuerpo |
| Códice | `codex-preview.js` | Tope de ampliación: los bichos comunes se veían como un mosaico borroso a ×8 |
| Ciudad | `cm-render.js` | La aguja de las torres era un triángulo liso de un color que parecía un error; ahora tiene tejas, una cara en sombra y borde |
| Textos chicos | `mobile.css` | Rótulos de la historia de 6-8 px pasan a 11 px. Botón "¡A LA BATALLA!" legible (contorno sobre dorado) |
| Pruebas | `t_campaign`, `t_resonance`, `t_story` | Aceptan los carteles pixel sin tilde |

---

## 5. Resumen para el dueño

- La Horda es **un muy buen "arena ARPG" cooperativo para el teléfono**. Los jefes tienen mecánicas, cada arena
  tiene su regla, el Hechicero enseña bien y la historia integrada ya tiene voz propia.
- **Contra Diablo II le faltan el loot y las builds:**
  - nada cae al piso;
  - los objetos tienen un solo número;
  - los talentos se abren en el nivel 40;
  - los refuerzos son porcentajes.
- Si en la próxima iteración se hace solo lo de la sección A (loot en el piso, afijos, talentos tempranos y
  refuerzos que cambian habilidades), el juego pasa de 59 a unos 72.
- **Con las secciones B, C y E llega a 80-85. El 90 necesita arte y audio profesional.**
