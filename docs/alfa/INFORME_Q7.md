# Informe Q7 — Controles y accesibilidad (alfa Comic Con)

Área: joystick táctil, botones de habilidad, apuntado, teclado/mouse, mando, vibración y pantalla de Opciones.

## Resumen para no técnicos

### Qué se arregló ("antes pasaba X → ahora Y")

1. **Joystick que obligaba a apuntar justo al círculo** → antes, si el pulgar apoyaba un poco fuera del círculo, el guardián salía corriendo a fondo hacia una dirección que el jugador no eligió. Ahora el joystick es "flotante": el círculo salta abajo del pulgar donde lo apoyes (en toda la mitad izquierda de abajo) y al soltar vuelve a su lugar.
2. **Controles que quedaban "pegados"** → antes, si entraba una notificación, se cambiaba de app/pestaña, se pausaba con el dedo apoyado o el dedo se salía por el borde, al volver el guardián seguía caminando o pegando solo. Ahora todo se suelta solo (joystick, ataque, apuntado, revivir, carga de la flecha de Sylva y la ficha de la Definitiva).
3. **Ataque pegado con el mouse** → antes, apretar "Ataque" con el mouse y soltar afuera del botón dejaba al guardián atacando para siempre. Ahora se suelta.
4. **En la compu no había forma de moverse con el teclado** → antes solo existían Q (curación) y E (acción); para caminar había que arrastrar el joystick con el mouse y no se podía atacar a la vez. Ahora: WASD o flechas para moverse, Espacio (o clic en el mapa) para atacar, 1/2/3 habilidades (apuntan al mouse), R Definitiva, Q curación, E acción, F Pacto, Esc pausa/continuar. Las teclas se ven en una etiqueta sobre cada botón.
5. **Sin soporte de mando** → ahora un mando (Xbox/PlayStation genérico por USB o Bluetooth) mueve con el stick o la cruceta, A ataca, X/Y/B habilidades, RB/RT Definitiva, LB curación, LT acción/revivir, stick derecho apunta, Start pausa. Se muestran las letras del mando en los botones.
6. **Espacio volvía a "apretar" la pausa** → antes, después de tocar Pausa/Continuar con el mouse, apretar Espacio para atacar volvía a abrir la pausa. Ahora el foco no queda en esos botones.
7. **Opciones mínimas que faltaban** → antes solo había volumen y "reducir movimiento" (este último solo en la pausa). Ahora Opciones tiene además: **modo zurdo**, **vibración sí/no**, **sacudida de pantalla Normal/Poca/No**, **reducir movimiento**, **texto grande** y **avisos de peligro de alto contraste** (borde negro, filo blanco punteado y rayado: se distinguen por la forma, no solo por el color, útil con daltonismo). Todo queda guardado en el aparato (como el volumen) y no toca la partida guardada. Se abren desde el ⚙ del menú y desde la Pausa ("⚙ Opciones: zurdo, texto, vibración…").
8. **Modo zurdo** → espeja todo: joystick a la derecha, botones a la izquierda, y el resto del HUD (vida, arena, aliados, pausa, Definitiva, avisos, minimapas de las arenas grandes y el contador de racha) cambia de lado para que nada quede tapado.
9. **Vibración** → antes no existía. Ahora vibra corto con un golpe fuerte y al lanzar la Definitiva (en Android; iPhone no permite vibrar desde una página web).
10. **Primera partida: no se sabía qué tocar** → ahora, mientras el Hechicero dice "movete / atacá / usá una habilidad", un aro dorado late sobre el joystick (y la perilla muestra el gesto), sobre Ataque o sobre las habilidades, y desaparece apenas el jugador lo hace. El texto del objetivo se adapta: "Movete con el joystick (pulgar izquierdo/derecho)", "Movete con WASD o las flechas" o "Movete con el stick izquierdo" según con qué juegue.
11. **Botones chicos para dedos grandes** → los "+" para subir habilidad se ven igual pero ahora se tocan en 44 px; Pausa y Sonido tienen 44 px también en tablets; Curación/Pacto 46 px.
12. **Menús del navegador al mantener apretado** → mantener un botón ya no abre el menú de Android ni la lupa/copiar de iPhone, ni selecciona texto.
13. **Teclado en Opciones** → al abrir Opciones con teclado el foco entra al panel, Esc las cierra y el foco vuelve al botón que las abrió.
14. **Cooperativo (invitado con Sylva)** → antes, si el invitado cancelaba la Flecha Perforante, el anfitrión la disparaba igual. Ahora se cancela de verdad.

### Lo que quedó pendiente y por qué

- **El joystick (en reposo) se dibuja encima de la lista de aliados** en celulares apaisados (la lista baja hasta donde está el joystick). No traba nada (la lista no se toca) pero se lee peor. Arreglarlo bien requiere mover la lista de aliados o el cuadro del Hechicero, que son del HUD (equipo Q5). Recomendación: compactar la lista de aliados en pantallas de menos de 420 px de alto.
- **Alto contraste** cubre los avisos de peligro comunes (círculos, conos, líneas, anillos y zona segura). Algunos jefes dibujan avisos propios en su archivo y no lo toman.
- **Mando**: sirve para jugar la partida y pausar/continuar; los menús todavía se manejan con toque o mouse.
- **Vibración en iPhone**: no se puede (limitación de Safari).
- Probado en navegador emulado (Chromium con toques reales simulados); **no probado en un teléfono físico ni con un mando físico** (el mando se probó simulado).

### Pruebas corridas

- Nueva: `tools/alfa/q7_controls.js` (5 pantallas × normal/zurdo, multitouch, joystick flotante, dedo que sale, cambio de pestaña, pausa con el dedo apoyado, apuntado cortado, sin zoom/selección, mouse, teclado, foco, Opciones y persistencia, mando simulado, guía de primera vez, vibración, sacudida, alto contraste). Resultado: ver detalle técnico.
- Existentes: `tools/regression/t_drag_aim.js` (apuntado arrastrando y tocando), `tools/regression/t_juice.js` (sacudida). Resultado: ver detalle técnico.

### Nota de mi área para el alfa: **7,5 / 10**

Los controles táctiles ya no se traban, se pueden jugar con teclado y mando, y hay opciones de accesibilidad reales. Resta pulir la superposición joystick/aliados y probar en teléfonos y mandos físicos.

---

## Detalle técnico

### Archivos nuevos
- `js/core/prefs.js` — opciones por aparato (`localStorage["horda_prefs"]`: vibrate, shake, textLg, lefty, contrast), `prefSet`, `prefShakeMult`, `hapticPulse`, `hudLefty`/`hudMirrorX`, enlace de la pantalla de Opciones (`optionsSync`).
- `js/core/input-desk.js` — teclado, mouse, mando (Gamepad API, mapeo estándar), etiquetas de teclas (`.kh`), guía de primera vez (`deskOnboardTick`, clases `onb-move/onb-attack/onb-skill`), `ctlHint()` para los objetivos del tutorial, `deskInputReset`.
- `css/controls.css` — higiene táctil, blancos de 44 px, joystick encendido, etiquetas de teclas, aros de la guía, modo zurdo (espejo de controles y HUD), texto grande, estilos de Opciones.
- `tools/alfa/q7_controls.js` — prueba.

### Cambios en archivos existentes
- `js/core/input.js` — joystick flotante (`joyOrigin`/`joyOff`), zona muerta de 5 px, `lostpointercapture` en joystick y Ataque, captura de puntero en Ataque, `inputResetAll()` en blur/pagehide/visibilitychange, `contextmenu` bloqueado en los controles.
- `js/core/aim.js` — `aimCancelActive()` (también cierra la ficha de habilidad), `lostpointercapture` cancela sin lanzar, el invitado avisa la cancelación de Sylva.
- `js/ui/ability-inspector.js` — la Definitiva cancela si se pierde la captura.
- `js/ui/screens.js` — `setState` fuera de "playing" llama a `inputResetAll()`.
- `js/net/net-game.js` — `{k:"sylva", cancel:true}` corta la carga en el anfitrión.
- `js/rendering/juice.js` — sacudida multiplicada por la opción; racha del lado que toca en modo zurdo.
- `js/rendering/vfx.js` — avisos de alto contraste (`VFX_HICON`, `vfxHiConMarks`).
- `js/rendering/feedback.js`, `js/skills/abilities.js` — vibración en golpe fuerte y Definitiva.
- `js/systems/tutorial.js` — objetivos de los básicos según táctil/teclado/mando (`_ctl`).
- `js/ui/hub.js` — Opciones: sincroniza, foco entra/vuelve.
- `js/arenas/{micelial,abismo,ciudad,fortaleza,minas}/*-render.js` — minimapa con `hudMirrorX` (modo zurdo).
- `index.html` — filas nuevas de Opciones, botón de Opciones en la Pausa, carga de `prefs.js`, `input-desk.js`, `controls.css`.

### Commits (rama del worktree, integrados como "Integración alfa: Q7")
- 04a10dc Controles: joystick flotante, nada queda pegado, teclado/mouse/mando, opciones de accesibilidad y modo zurdo
- (prueba) Prueba de controles: soltar solo el dedo de la habilidad en el multitouch
- edbdc2d Merge origin/main en la rama de controles (Q7)
- ae00eba Controles: el mouse apunta en toda la pantalla y el clic en el hueco de los botones ataca; la ficha de habilidad y la Definitiva se sueltan si se pierde el dedo; prueba robusta tras recargar

### Resultados de pruebas
(se completa abajo con la última corrida)
