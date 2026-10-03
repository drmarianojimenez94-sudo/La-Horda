# UX Bible

Viewport de referencia: **844×390** (iPhone 13 Pro horizontal). También 667×375 y escritorio 1280×800.
Fuentes: `--font-pixel` (Press Start 2P) para títulos chicos, `--font-retro` (VT323) para nombres,
`--font-body` (VT323 Texto) para texto. Todo texto queda dentro de su marco (`overflow-wrap:anywhere`,
alturas máximas con scroll interno). Nunca texto azul de enlace en UI de juego.

## HUD

- Vida (rojo, ♥) y energía/Furia (azul, ✦) arriba a la izquierda; aliados debajo; botones a la derecha.
- Botón de habilidad: ícono + barrido radial de enfriamiento + nombre corto. `+` dorado = punto para subirla.
- Definitiva: aro dorado que se llena con la carga; candado hasta `ULT_MIN_ARENA_LEVEL`.

## Long press (inspector de habilidades) — `js/ui/ability-inspector.js`

| Gesto | Resultado |
|---|---|
| Toque | Lanza. Las habilidades sin apuntado se lanzan al **soltar** (para distinguir el toque del long press). |
| Mantener 480 ms sin arrastrar | Abre la ficha. **Soltar no lanza** (nunca un lanzamiento accidental). |
| Mantener y arrastrar | Apuntado manual de siempre; si la ficha estaba abierta, se cierra y soltar lanza. |
| Mantener una habilidad en enfriamiento o sin energía | Abre la ficha con lo que falta (`⏳ 3,2 s`, "Falta energía"). |
| Definitiva | Igual: toque lanza al soltar, mantener consulta sin gastar la carga. |
| Flecha Perforante (Sylva) | Mantener = cargar (excepción documentada); se consulta en el panel táctico. |

Contenido de la ficha (de `abilityCardHTML`, misma función que usa el panel táctico): ícono, ranura,
nombre, forma de apuntado (`○ △ → ↝ ⌖ ◎ ◉ ✚`), estado actual, descripción, enfriamiento, costo, área y
alcance **efectivos** (maestría y talentos aplicados), duración, daño, curación y chips de estados
(glifo + nombre + color). Se ubica sobre el botón, dentro de la pantalla y de la zona segura.
Es UI local: no pausa, no viaja por red.

## Botones táctiles

Mínimo 44×44 px de área, separación ≥ 6 px, nada debajo del notch (`env(safe-area-inset-*)`).
Multi-touch: joystick y botones capturan su propio puntero (`setPointerCapture`).

## Panel táctico (botón ❚❚) — `js/ui/tactical-panel.js`

| Modo | Comportamiento |
|---|---|
| Partida sola | Pausa (como siempre) + panel. |
| Multijugador | **No pausa a nadie.** El panel se abre semitransparente sobre la partida (título "Panel táctico", aviso "La partida sigue"); el anfitrión sigue simulando. Tocar el fondo o "Continuar" lo cierra. |

Contenido: nombre y rol, vida/energía/nivel/nivel de arena, **estados activos** (chips del lenguaje de
combate con tiempo restante), **kit completo** (básico, pasiva, 3 habilidades, definitiva) con la misma
ficha del long press y enfriamientos en vivo (se refresca cada 0,4 s), talentos elegidos (y maestría),
equipo y progreso de cada set (umbrales ✔/·). Debajo siguen audio, movimiento reducido y estadísticas.
No da ventaja: no muestra información del enemigo ni detiene la simulación en línea; el héroe propio
queda quieto mientras se consulta.

## Briefing pre-arena — `js/ui/run-intro.js` + `js/ui/arena-briefing.js`

Tarjeta del Hechicero (lore, lo que te mata / ayuda, objetivo, cristales) + imagen de la arena + grilla de
4 fichas cortas desde la Arena Factory: **✦ Mecánica** (nombre + regla corta), **⚠ Peligro** (nombre +
"Aviso: …"), **♛ Jefe** (nombre + qué usa del escenario), **◆ Botín destacado** (set de afinidad que te
falta, `n/total`, piezas `✓`/`?`, dónde más cae). Si la arena tiene micro-tutorial pendiente: "▶ Primera
vez…". En pantallas angostas la grilla pasa a 1 columna y el botón queda fijo abajo.

## Micro-tutoriales de arena — `js/systems/arena-tutorials.js`

Voz del Hechicero (mismo cuadro que el tutorial general), ENSEÑAR → HACER → CONFIRMAR → CONTINUAR. Cada
paso espera a que el jugador lo haga (tope 30 s: nunca traba). Objetivo marcado en el mundo con el
lenguaje "objetivo" (anillo cian ◎ + flecha al borde). Guardado en `save.tut.arena[clave]`; se puede
saltar (`arenaTutSkip`) y volver a ver (`arenaTutorialReplay`). Drivers jugables: **Gélida** (moverse baja el
frío → encender un brasero apagado a propósito), **Infernal** (fisura de práctica → cerrarla) y Reino Fúngico: núcleo de práctica (los
bots no lo rompen por vos) → ver la colonia → sentir la lentitud del territorio → romper el núcleo → ver
cómo se retira la infección.

## Tutorial general — Arena de entrenamiento (`js/systems/alpha-training.js`)

13 pasos jugables, sin límite de tiempo, con "Saltar" siempre visible; cada uno señala su botón
(`.alpha-training-target`), pide hacerlo y confirma ✓ antes de seguir (progressive disclosure: lo
permanente —talentos, sets, fusión— se enseña después en la Guía del Hechicero por nivel):

1 movimiento · 2 ataque básico · 3 habilidades (tocar / mantener y arrastrar) · 4 **long press** (leer sin
lanzar) · 5 recarga · 6 definitiva · 7 **peligro** (marca roja real que se llena: salir a tiempo; si te
alcanza, se repite) · 8 vida y pociones · 9 XP y nivel (permanente vs. nivel de arena) · 10 botín ·
11 **panel táctico** (sola pausa; en multijugador la partida sigue) · 12 **reanimar** (aliada caída real,
mantener ✚ ~5 s, un golpe no corta) · 13 objetivo de arena.
Guardado: `save.tut.training`; partida de práctica aislada (nunca escribe el guardado real).
Validación: `tools/alpha/training-test.js` (13 pasos con el motor real) y `tools/alpha/training-player.js`
(novato que solo usa controles táctiles: ~47 s automatizado en 844×390 y 667×375).
