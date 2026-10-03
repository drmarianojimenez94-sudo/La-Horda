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
