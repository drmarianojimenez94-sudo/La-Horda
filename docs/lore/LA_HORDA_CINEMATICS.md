# LA HORDA — Cinemáticas y transiciones

> Estado de cada escena del canon. Hoy todas se resuelven con **carteles de título, banners, el cuadro de voz
> (Hechicero, jefes, Forjador) y pantallas de texto** (`js/systems/campaign-story.js`, `js/systems/story.js`,
> `arenaTitleCard`, `tutSay`). Las cinemáticas con arte
> propio están pendientes: cada una lleva el pedido de arte como **hoja completa** (sin placeholders).

| # | Escena | Momento | Hoy (implementado) | Pendiente |
|---|---|---|---|---|
| P | **Prólogo — La Ciudad Maldita** | Primera partida del perfil, en la Ciudad Maldita | 3 pantallas de texto en la ficha previa (`CAMPAIGN_PROLOGUE_PAGES`), una vez por perfil | Escena de la ciudad atacada, humo, proyección del Hechicero, primera Cicatriz |
| A | **Carteles de acto** (I El Guía · II Los Ecos · III El Descenso) | Primera entrada a 01, 04 y 08 | Pantalla de texto en la ficha previa (`STORY_ACTS`) | — |
| 1 | Título de arena | Nivel 1 de cada arena | Cartel "ARENA NN — NOMBRE" + subtítulo (propio en Fábrica, Reino Fúngico y Abismo) | — |
| 2 | Cicatriz que se abre | Victoria de cada arena (01–09) | Escena de salida en la última pantalla de la victoria: "✦ ACTO N · LA CICATRIZ" + línea del Hechicero + Crónica encontrada | VFX de grieta en el aire (hoja: grieta violeta-negra, 8 frames de apertura + loop) |
| 3 | Guardián se corrompe (Ruinas) | Guardián Ancestral al 65 % | Banner "NACE LA BESTIA DEL BOSQUE" + transformación existente | Hoja de la **Bestia del Bosque** (forma corrupta del Guardián) |
| 4 | Guardián se corrompe (Gélida) | Mago Gélido al caer | Banner "NACE EL DEMONIO GÉLIDO" + arte del Ángel Caído | Hoja del **Demonio Gélido** si se decide separarlo del Ángel Caído |
| 5 | Cristal liberado | Victoria en 03 / 05 / 08 | Ceremonia de cristal (vuela al campeón) + línea del Hechicero | — |
| 6 | Advertencia del Guardián del Laberinto | Muerte del subjefe (nivel 6) | Su voz en el cuadro ("«El que te guía… no le entregues los cristales. Las llaves eran cuatro…»") + banner | Primer plano del Guardián (retrato) |
| 7 | Cruce al Abismo | Victoria del Abismo | Banner "Los campeones cruzan hacia la dimensión de la Horda" | Transición de cruce (pantalla que se rasga) |
| 8 | Revelación del Hechicero | Infernal nivel 9 | Cartel "EL CUARTO GUARDIÁN" + diálogo (líder de los Cuatro) | — |
| 9 | El Forjador | Minas (al caer el Titán y Cerbero), al huir el Hechicero (nivel 9) y epílogo | "UNA VOZ ENCADENADA" en el cuadro de voz (retrato de brasa y cadenas, CSS) + Páginas del Forjador | Hoja del **Forjador** encadenado (idle, cadenas, hablar) |
| 10 | Fusión fallida / Rey de la Horda | Jefe final, formas 1→3 | Carteles de forma + "NACE EL REY DE LA HORDA" | — |
| 11 | **Final — Los nuevos Guardianes** | Victoria de la Infernal (primera vez; se repite desde el Códice) | **Epílogo por pantallas** (`STORY_EPILOGUE`): texto sobre el arte de la Infernal, las Minas y la Ciudad + los cuatro cristales dibujados en vivo; "Fin del Libro Primero" | Escena de los campeones con los cristales |
| 11b | **Post-créditos** | Después del epílogo | 2 pantallas (`STORY_POSTCREDITS`): gradas de oro → Arena Divina; la Horda sin rey en el Abismo → Horda Infinita | Arte de las gradas de la Arena Divina |
| 12 | Puente al Coliseo | Arena Divina | Tarjeta "COLISEO — PRÓXIMAMENTE" | Cuando exista el PvP |

## Prompts de arte (hoja completa, pixel art 16-bit dark fantasy, fondo transparente)
- **Bestia del Bosque (Guardián Ancestral corrompido):** hoja completa — idle, caminar, 3 ataques
  (zarpazo, embestida, rugido de raíces), transformación desde el Guardián (8 frames), golpe recibido,
  muerte. Corteza podrida, runas verdes que se apagan, astas rotas.
- **El Forjador encadenado:** hoja completa — idle encadenado, forcejeo, hablar, cadenas que se rompen.
  Enano/gigante herrero, fragua apagada, cadenas infernales.
- **Cicatriz de la Horda (VFX):** apertura (8 frames), loop (6), cierre (6). Grieta en el aire, bordes
  violeta y negro, partículas que caen hacia arriba.
- **Ciudad Maldita / Minas Profundas:** implementadas por código con el arte de sus hojas. Minas: descenso entre sectores (fundido + cartel de profundidad), muerte de Cerbero en 3 tiempos y apertura del Portal Infernal (procedural, ver `LA_HORDA_MINES_MISSING_ASSETS.md`).
