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
14. **Mouse en la compu** → antes el mouse solo "apuntaba" sobre la parte libre del mapa (las zonas invisibles del joystick y de los botones tapan media pantalla cada una). Ahora las habilidades apuntan al mouse en cualquier lugar y el clic en el hueco de la zona de botones también ataca.
15. **Modo zurdo con el HUD nuevo** → pausa/sonido y la Definitiva también cambian de lado.
16. **Cooperativo (invitado con Sylva)** → antes, si el invitado cancelaba la Flecha Perforante, el anfitrión la disparaba igual. Ahora se cancela de verdad.

### Lo que quedó pendiente y por qué

- **Mantener una habilidad sin arrastrar no la lanza**: desde la rama principal, mantener un botón de habilidad medio segundo abre su ficha ("inspector") y al soltar NO se lanza. Un jugador nuevo que deja el dedo apoyado puede creer que no anda. Es una decisión de diseño de la rama principal y no la cambié; recomendación: que el mantener sin arrastrar lance igual al soltar cuando la habilidad está lista, y dejar la ficha solo para cuando está en enfriamiento (o desde la pausa/panel táctico).
- **Alto contraste** cubre los avisos de peligro comunes (círculos, conos, líneas, anillos y zona segura). Algunos jefes dibujan avisos propios en su archivo y no lo toman.
- **Mando**: sirve para jugar la partida y pausar/continuar; los menús todavía se manejan con toque o mouse.
- **Vibración en iPhone**: no se puede (limitación de Safari).
- El joystick encima de la lista de aliados (que había visto al principio) ya no pasa con el HUD nuevo que integró el equipo de HUD.
- Probado en navegador emulado (Chromium con toques reales simulados por el protocolo del navegador); **no probado en un teléfono físico ni con un mando físico** (el mando se probó simulado).

### Pruebas corridas

- Nueva: `tools/alfa/q7_controls.js` (5 pantallas × normal/zurdo, multitouch, joystick flotante, dedo que sale, cambio de pestaña, pausa con el dedo apoyado, apuntado cortado, sin zoom/selección, mouse, teclado, foco, Opciones y persistencia, mando simulado, guía de primera vez, vibración, sacudida, alto contraste). Resultado: ver detalle técnico.
- Existentes: `tools/regression/t_drag_aim.js` (apuntado arrastrando y tocando, 12 controles) y `tools/regression/t_juice.js` (sacudida y efectos): **pasan**.
- Nueva `q7_controls.js`: **81 controles, todos pasan** sobre la rama integrada (última corrida por partes: disposición 40/40, táctil, opciones, teclado y mando OK).

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

### Commits
- 04a10dc Controles: joystick flotante, nada queda pegado, teclado/mouse/mando, opciones de accesibilidad y modo zurdo
- (prueba) Prueba de controles: soltar solo el dedo de la habilidad en el multitouch
- edbdc2d Merge origin/main en la rama de controles (Q7)
- ae00eba Controles: el mouse apunta en toda la pantalla y el clic en el hueco de los botones ataca; la ficha de habilidad y la Definitiva se sueltan si se pierde el dedo; prueba robusta tras recargar
- (todo lo anterior entró en "Integración alfa: Q7", 4fdd58c). Después de integrar:
- ba79843 Informe Q7; prueba del mando con más margen
- f30d4f2 Prueba Q7: esperas más largas para el mando con la máquina cargada
- 66d6fc8 Pruebas: el arrastre de la Custodia (apunta a un aliado) no se mide con señuelos enemigos; t_juice espera más la carga
- 4ca3535 Modo zurdo con el HUD nuevo: pausa/sonido y Definitiva espejados; sin pisar el diseño 44x44 de pausa y sonido
- 14c92cc Guía de primera vez: sin aro en el joystick cuando se juega con teclado o mando
- ae10780 Prueba Q7: el toque del multitouch es corto

### Resultados de pruebas (rama integrada `claude/horda-latest-updates-gv4tlf` + estos commits)
- `SE_BASE_URL=http://127.0.0.1:8907 node tools/alfa/q7_controls.js` → TODO OK (81 PASS). Secciones: `ONLY=layout|touch|options|keyboard|gamepad`.
- `node tools/regression/t_drag_aim.js` → TODO OK (había 1 falla por un campeón nuevo de la rama principal, la Custodia del Eslabón, que apunta a un ALIADO: la prueba ahora lo reconoce; no era un error del juego).
- `node tools/regression/t_juice.js` → SUMMARY OK fails=0 (se le subió el tiempo de carga: con la máquina cargada no llegaba en 30 s).
- Nota: con 5 agentes a la vez la máquina estaba muy cargada (y el disco casi lleno, por archivos de otros equipos); algunas esperas de las pruebas se alargaron para no dar falsos rojos.
