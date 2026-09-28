# LA HORDA — Reseña de crítico (retro / indie)

> **Versión 1 (primera hora de juego, en curso).** Se actualiza al final de la sesión con más arenas, jefes,
> escritorio, Pixel 7 y la sala de a dos.

Jugado con Playwright/Chromium en **iPhone 14 acostado (844×390, táctil, dpr 2)**, perfil nuevo desde el título,
con toques reales (joystick y botones por eventos táctiles) y, para las partidas largas, el piloto automático
"jugador competente" de `tools/playtest/autopilot.js`. Fuentes reales (Press Start 2P y VT323) servidas
localmente: sin eso Chromium las reemplaza por monoespaciada y las capturas mienten.

Referencias con las que se compara: Hades, Vampire Survivors, Dead Cells, Enter the Gungeon, Diablo II,
Children of Morta, Hyper Light Drifter.

## Puntaje provisorio: **63 / 100**

(Se completa en la versión final.)

## Lo primero que se ve (v1)

- El título tiene vida (desfile de guardianes con brasas), pero el logo es texto plano y el pie dice en inglés
  "B1 COOPERATIVE PLAYTEST" en otra tipografía.
- Del título a la primera pelea hay **6 pantallas** (título → primer guardián → menú → modos → arenas →
  guardián → Sala → ficha del Hechicero ×2).
- Tres tipografías mezcladas en todas las pantallas: pixel (Press Start 2P), VT323 y **Georgia con serifas**
  (el cuerpo por defecto). En el HUD en partida conviven las tres.
- **Press Start 2P no tiene mayúsculas acentuadas**: "CóDICE", "VOLVIó", "ARENA GéLIDA" se dibujan con la
  minúscula. Se ve en el Códice, en la ficha del Hechicero y en los carteles de arena.
- En el teléfono la cámara deja al jugador en el tercio superior y el HUD de arriba (vida, contador de civiles,
  barra del jefe, guía del jefe, avisos) le cae encima; la mitad inferior de la pantalla queda vacía.
- Morí en el nivel 2 de la primera arena (Mago, primer intento) y el juego me sacó el 50 % de lo ganado y me
  bajó de nivel.
- El primer jefe (El Presentador) apenas le sacó 9 de 179 de vida al Mago en toda la pelea.
- La pantalla del cofre en el teléfono aprieta la ficha del objeto en una columna de 160 px y el botón
  pegajoso "Continuar" tapa "Equipar / Guardar".

## Lista priorizada (v1, se amplía en la versión final)

| # | Problema | Dónde / cómo reproducir | Propuesta | Impacto | Tipo | Dueño |
|---|---|---|---|---|---|---|
| 1 | Mayúsculas acentuadas rotas en la fuente pixel | Códice (título), ficha del Hechicero, cartel de arena | Normalizar solo las mayúsculas acentuadas en los textos pixel | +1 | código | T1 |
| 2 | La ficha del objeto queda tapada por "Continuar" en el cofre | Ganar una arena en el teléfono, paso "Recompensas" | Cuerpo de la victoria más ancho en horizontal y la ficha con lugar | +1 | código | T1 |
| 3 | Tipografía Georgia en el HUD, refuerzos, victoria, Sala | Todo | Unificar en VT323 (cuerpo) + Press Start (títulos) | +2 | código | T1 (partida) / T3 (menús) |
| 4 | Cámara deja al jugador debajo del HUD superior | Cualquier partida en 844×390 | Anclar los pies un poco por debajo del centro en pantallas bajas | +1,5 | código | T4 |
| 5 | Castigo de la primera derrota (−50 % y baja de nivel) | Morir en la Ciudad nivel 2 | Sin pérdida en la primera arena / primeras N partidas | +1,5 | código | T7 / diseño |
| 6 | Primer jefe sin amenaza | Ciudad nivel 10 | Más daño en los telegrafiados del Acto III | +1 | código | T4 |
| 7 | Refuerzos entre niveles planos (3 cartas de +%) | Fin de cada nivel | Rarezas, sinergias con habilidades | +2 | código | T5 |
| 8 | Talentos bloqueados hasta el nivel 40 | Sala → Talentos | Primer punto en el nivel 10 | +1,5 | código | T5 |
| 9 | 10.000 de oro de regalo con guardianes a 2.500 | Menú al empezar | Regalo = 1 guardián | +1 | código | T3/T6 |
| 10 | Emojis como íconos (⚡❄🔥 🌵 🎽🧤👢) | HUD, refuerzos, equipo | Íconos pixel ya existentes donde los haya | +1 | código/arte | T1 (HUD) / arte |
