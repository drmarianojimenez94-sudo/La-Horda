# Informe Q1 — Primera sesión y menús

Área: lo que ve un jugador nuevo desde el título hasta volver al menú (cuenta/invitado, regalo inicial,
entrenamiento, primera arena, victoria/derrota, Campamento, menú, Tienda, Inventario, Talentos, Códice).
Probado en celular apaisado 844×390 táctil y en compu 1280×720, desde un perfil limpio.

## Reparaciones (en palabras simples)

1. **Regalo inicial — aviso encima del texto.** Antes, al elegir guardián aparecía arriba a la derecha
   "X es tuyo" y tapaba el final del subtítulo. → Ahora el subtítulo mismo dice "¡X se une a tu equipo!
   Ahora elegí su skin…" (neutro, porque hay guardianas) y no hay aviso encima.
2. **Regalo inicial — barra de confirmar encima de las cartas.** Antes, en el celular la barra de
   "¡La quiero! / Elegir después" tapaba el último renglón de la carta. → Ahora la barra es una sola
   fila más baja que entra debajo de las cartas sin pisarlas (también con skins de set de 3 renglones).
3. **Regalo inicial — "Ver habilidades".** Antes, al abrir "Ver habilidades" la ficha era más alta que la
   pantalla del celular: se cortaba arriba y abajo y no se podía cerrar ni leer la Definitiva. → Ahora la
   ficha se desliza por dentro y los botones quedan siempre a la vista.
4. **Regalo inicial — la skin de regalo había desaparecido.** Con el cambio del dueño "menú inicial"
   (#41), sin querer se apagó el paso 2: el jugador elegía guardián y nunca recibía su skin ni el vale.
   → Ahora vuelve el paso "Tu skin de regalo" (y "Elegir después" guarda el vale), y después sigue el
   entrenamiento nuevo.
5. **Regalo inicial — detalles.** Antes decía "Tanque / Tanque" (nombre y rol repetidos) y en la compu
   la descripción de las cartas tenía letra de ~9 px. → Ahora el rol no se repite y la letra se lee.
   Al elegir una carta, la pantalla baja lo justo para que la barra no tape la carta elegida.
6. **Título.** Antes decía "Toca para continuar". → Ahora "Tocá para continuar" (voseo como todo el juego).
7. **Victoria en el celular — avisos encima de los resultados.** Antes los avisos de botín y del pase
   aparecían arriba a la derecha, encima de "Las últimas palabras" y de Dificultad/Guardián. → Ahora van
   abajo, a los costados del botón "Continuar", donde no tapan nada.
8. **Campamento en el celular.** Antes el título "EL CAMPAMENTO DE LOS PORTADORES" se encimaba con el
   nombre "EL HECHICERO". → Ahora el título se parte en dos renglones y no lo toca.
9. **Códice.** Antes el último botón de animaciones aparecía cortado ("★ Pestilenc") y parecía un error.
   → Ahora el borde se desvanece para mostrar que se puede deslizar y hay más.
10. **Tienda.** Antes el guardián de regalo mostraba su precio (2.500) al lado de "Ver ficha", como si
    hubiera que pagarlo. → Ahora dice "✔ Tuyo".

Capturas antes/después en `docs/alfa/q1/` (archivos `*_antes_*` y `*_despues_*`).

## Recorrido probado (jugador nuevo)

Título → Tocá para continuar → Entrar / Crear cuenta / Jugar como invitado → Tu primer guardián (12
cartas, "Ver habilidades") → Tu skin de regalo (también "Elegir después" y recargar a mitad: vuelve a la
skin sin repetir el guardián) → entrenamiento (Saltar tutorial disponible) → menú. Con la base anterior
también: prólogo → Ciudad (autopiloto hasta la victoria contra El Presentador) → Calificación →
Recompensas → XP → Campamento → menú → Tienda (Destacados, Guardianes, Objetos, Skins; compra de un
objeto) → Guardianes/Códice. Sin errores de página en el camino.

## Pendiente / no arreglado (y por qué)

- **Carga del juego bajo prueba automática:** con webdriver el juego pide las ~1.400 imágenes juntas; el
  servidor simple de Python (cola de 5 conexiones) corta y Chromium da `ERR_INSUFFICIENT_RESOURCES`.
  A un jugador real no le pasa (carga en dos tandas), pero conviene servir el alfa con un servidor de
  verdad. Para mis pruebas usé uno con cola grande.
- **Entrenamiento obligatorio para perfiles viejos:** un guardado veterano sin el entrenamiento hecho
  entra al entrenamiento al tocar el título (se puede saltar). Es decisión del cambio #41; no lo toqué.
- **Mensaje "Playtest V1: recibiste 2.000 de oro"** y precios: son de economía (Q4), no los toqué.
- **Pantalla de cuenta:** "Jugar como invitado" tiene letra más chica que "Entrar". Es de red/cuentas
  (Q3); detalle menor.
- Falta repetir con la base nueva el recorrido completo de inventario lleno, perder 3 veces y girar el
  celular a mitad de cada pantalla (ver "Pruebas").

## Pruebas corridas

- `tools/items/t_starter_gift.js` (regalo inicial, actualizada al camino nuevo con entrenamiento):
  **TODO OK**.
- Recorridos manuales automatizados con Playwright (844×390 táctil y 1280×720) por cada pantalla de
  arriba, midiendo que la barra de confirmar no pise las cartas y que los botones no queden tapados.

## Nota del área para el alfa: 7/10

El camino del jugador nuevo no tiene trabas ni errores de página, y lo que se veía roto o encimado en
el regalo inicial, la victoria y el Campamento quedó prolijo. Le falta: probar en iPhone real, y repasar
con la base nueva (muy cambiada a último momento) inventario/talentos/derrotas seguidas.

---

## Detalle técnico

| Arreglo | Archivos |
|---|---|
| 1, 2, 5 | `js/ui/starter-select.js` (`_starterJustGot`, sin `showNetToast` en el paso 2, rol sin repetir, scroll al elegir), `css/onboarding.css` (barra en fila con `@media (max-height:520px)`, arte 96 px, letra en `min-height:521px`) |
| 3 | `css/onboarding.css` (`.starter-confirm{max-height:calc(100dvh - 48px); overflow-y:auto}`, `:has(details[open])`) |
| 4 | `js/systems/starter-gift.js` (`starterGiftEnabled` ya no depende de `firstRunEnabled()`, que #41 dejó en `false`); `tools/items/t_starter_gift.js` lee el guardado real con `ALPHA_TRAINING.snapshot.save` durante el entrenamiento |
| 6 | `js/assets/preload.js`; pruebas que buscaban `/Toca/` aceptan `/Toc[aá]/` |
| 7 | `css/onboarding.css` (`#toast-stack.end` abajo; `#loot-toasts` a la izquierda) |
| 8 | `css/camp.css` (`.camp-head` con `max-width:calc(50vw - 96px)`) |
| 9 | `js/ui/codex/codex.js` (`codexScrollHints`), `css/codex.css` (`.cx-scroll-x.fade-r`) |
| 10 | `js/ui/shop-ui.js` |

Commits: b581550, 1f63d93, d7df6fd, 99a23b1, 6d0d72d (merge main), 376b4bb, f1c4488.
