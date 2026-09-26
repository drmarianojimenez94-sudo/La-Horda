# LA HORDA — Cinemáticas y transiciones

> Estado de cada escena del canon. Hoy todas se resuelven con **carteles de título, banners y la voz del
> Hechicero** (`js/systems/campaign-story.js`, `arenaTitleCard`, `tutSay`). Las cinemáticas con arte
> propio están pendientes: cada una lleva el pedido de arte como **hoja completa** (sin placeholders).

| # | Escena | Momento | Hoy (implementado) | Pendiente |
|---|---|---|---|---|
| P | **Prólogo — La Ciudad Maldita** | Primera partida del perfil, al entrar a la Fábrica | Voz del Hechicero (`CAMPAIGN_PROLOGUE`), una vez por perfil | Escena de la ciudad atacada, humo, proyección del Hechicero, primera Cicatriz |
| 1 | Título de arena | Nivel 1 de cada arena | Cartel "ARENA NN — NOMBRE" + subtítulo (propio en Fábrica, Reino Fúngico y Abismo) | — |
| 2 | Cicatriz que se abre | Victoria de cada arena (01–09) | Banner "✦ …" + línea del Hechicero (primera vez) | VFX de grieta en el aire (hoja: grieta violeta-negra, 8 frames de apertura + loop) |
| 3 | Guardián se corrompe (Ruinas) | Guardián Ancestral al 65 % | Banner "NACE LA BESTIA DEL BOSQUE" + transformación existente | Hoja de la **Bestia del Bosque** (forma corrupta del Guardián) |
| 4 | Guardián se corrompe (Gélida) | Mago Gélido al caer | Banner "NACE EL DEMONIO GÉLIDO" + arte del Ángel Caído | Hoja del **Demonio Gélido** si se decide separarlo del Ángel Caído |
| 5 | Cristal liberado | Victoria en 03 / 05 / 08 | Ceremonia de cristal (vuela al campeón) + línea del Hechicero | — |
| 6 | Advertencia del Guardián del Laberinto | Muerte del subjefe (nivel 6) | Texto flotante "«El que te guía… no le entregues los cristales…»" + banner | Primer plano del Guardián (retrato) |
| 7 | Cruce al Abismo | Victoria del Abismo | Banner "Los campeones cruzan hacia la dimensión de la Horda" | Transición de cruce (pantalla que se rasga) |
| 8 | Revelación del Hechicero | Infernal nivel 9 | Cartel "EL CUARTO GUARDIÁN" + diálogo (líder de los Cuatro) | — |
| 9 | El Forjador | Al huir el Hechicero (nivel 9) | Banner con la voz encadenada | Hoja del **Forjador** encadenado (idle, cadenas, hablar) |
| 10 | Fusión fallida / Rey de la Horda | Jefe final, formas 1→3 | Carteles de forma + "NACE EL REY DE LA HORDA" | — |
| 11 | **Final — Los nuevos Guardianes** | Victoria de la Infernal | Voz (`CAMPAIGN_ENDING`) + "POSTGAME: ARENA DIVINA" | Escena de los campeones con los cristales |
| 12 | Puente al Coliseo | Arena Divina | Tarjeta "COLISEO — PRÓXIMAMENTE" | Cuando exista el PvP |

## Prompts de arte (hoja completa, pixel art 16-bit dark fantasy, fondo transparente)
- **Bestia del Bosque (Guardián Ancestral corrompido):** hoja completa — idle, caminar, 3 ataques
  (zarpazo, embestida, rugido de raíces), transformación desde el Guardián (8 frames), golpe recibido,
  muerte. Corteza podrida, runas verdes que se apagan, astas rotas.
- **El Forjador encadenado:** hoja completa — idle encadenado, forcejeo, hablar, cadenas que se rompen.
  Enano/gigante herrero, fragua apagada, cadenas infernales.
- **Cicatriz de la Horda (VFX):** apertura (8 frames), loop (6), cierre (6). Grieta en el aire, bordes
  violeta y negro, partículas que caen hacia arriba.
- **Ciudad Maldita / Minas Profundas:** se piden con sus arenas (mapa, enemigos, jefe) cuando se diseñen.
