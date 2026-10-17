# Unificación estética de Campaña, Coliseo y Guerra de Cristales

Capturas reales (Chromium, 844x390): `antes/` = origin/main, `despues/` = esta rama. Mismo guion para ambas (`hub`, `*_juego`, `*_pausa`, `*_lobby`, `cristales_suministros`, `coliseo_cuenta`).

## Auditoría (antes)
Los tres modos ya compartían el HUD de campaña (barras de vida/maná, botones de habilidad, joystick, pausa). Las diferencias reales estaban en lo que cada modo dibuja por su cuenta:

| Zona | Campaña | Coliseo / Cristales (antes) |
|---|---|---|
| Paneles del HUD (marcador, mapa rival, ficha de suministros, cartas) | marrón cálido `rgba(10,6,4,.72)`, borde `--panel-b`, radio 12 | azul marino `rgba(11,16,32,.9)`, borde `#5a6b88`, radio 8-14 |
| Botones propios (suministros, volver, cartas, espectador) | `--ui-btn*` con bisel y sombra dura | planos azul `#1c2a44`, borde fino |
| Resultado de partida | `ui-bg` con borde negro 3 px y sombra dura | `#171e2f` azul con borde dorado fino, título VT323 30 px |
| Lobby (`#crystalwars-screen`) | paleta ui-kit marrón/brasa | gradiente azul pizarra, botones azules, ~45 colores literales |
| Barras de equipo | pista `--hp-dim` con degradé | color plano sin borde |
| Título del modo en el HUD | una línea | "Guerra de Cri…" cortado con elipsis |
| Aviso central | -- | se superponía al marcador (top 62 px) |
| Identidad | brasa | ninguna (copiaba el azul) |

## Cambios
- `css/ui-kit.css`: tokens `--hud-*`, `--team-a..d`, `--mode-accent`, `--mode-accent-2`; acento por modo con `body[data-mode]` (Campaña = brasa por defecto, Coliseo = arena dorada, Cristales = celeste).
- `js/arenas/lanes/lanes-hud.js`, `js/arenas/coliseum/coliseum-hud.js`: ponen/quitan `body.dataset.mode`. `js/modes/crystal-wars/client.js`: `data-mode` en el lobby.
- `css/lanes.css`: todo el HUD de Coliseo/Cristales usa los tokens (paneles, barras, botones, cartas, resultado, pausa). El nombre del modo ocupa su fila; el aviso baja a 70 px. Pausa: mismo menú, rótulo y acento del modo.
- `css/crystal-wars.css`: variables locales apuntan a tokens; botones, paneles, inputs y diálogos con la paleta y el bisel de ui-kit. Tipografías sin cambio (Press Start 2P marcas y títulos, VT323 el resto).

Cada modo mantiene identidad con un solo acento (filo superior de paneles, títulos, cartas, borde del lobby, resalte del botón Continuar en la pausa). Sin cambios de estadísticas, daño, kits ni lógica de juego.

## Visual gate
No se agregó ningún asset visual (sin PNG, atlas ni skins): solo CSS y atributos `data-mode`. El gate de assets (sección 8 de ART_BIBLE) no aplica a esta entrega; la validación es la revisión de capturas y las pruebas de abajo.

## Pruebas (Chromium /opt/pw-browsers/chromium)
Ver el cuerpo del PR para el detalle y los resultados.
