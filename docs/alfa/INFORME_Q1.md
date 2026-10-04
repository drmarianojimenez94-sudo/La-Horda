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
11. **Menú en el celular — "Explorar".** Antes, al abrir "Explorar · Códice y desafíos", Códice quedaba
    angosto y Desafíos se iba abajo de la pantalla (había que deslizar el menú para encontrarlo). → Ahora
    los dos aparecen lado a lado dentro de su lugar.
12. **Inventario.** Antes el botón decía "Vender (+1100o)". → Ahora "Vender · +1.100 🪙".

Capturas antes/después en `docs/alfa/q1/` (archivos `*_antes_*` y `*_despues_*`).

## Prueba automática nueva

`tools/alfa/q1_first_session.js` juega como un jugador nuevo en el celular (844×390, toques reales; con
`DESKTOP=1` en 1280×720 con mouse): título, invitado, regalo (guardián, Ver habilidades, Elegir otro, skin),
entrenamiento (Saltar), menú, Guardianes (todas las pestañas), Tienda (4 pestañas), recargar la página en la
Tienda y en la Sala, Explorar/Códice, Sala → prólogo → Ciudad hasta ganarle a El Presentador (piloto
automático), todas las páginas de la victoria, Campamento, perder 3 veces seguidas (Reintentar / Volver al
menú) y abandonar desde la pausa. Falla si aparece un error de página o una pantalla sin ningún botón que
se pueda tocar. Uso: `GAME_URL=http://127.0.0.1:8901/index.html node tools/alfa/q1_first_session.js`
(`SKIP_WIN=1` saltea la partida larga; `SHOTS=carpeta` guarda una captura por paso).

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
- **Sala en el celular:** el botón fijo "Comenzar" tapa a medias el desplegable "Equipamiento, talentos…"
  hasta que uno desliza la pantalla. Probé desvanecerlo, pero quedaba un recuadro vacío que confunde más;
  hace falta acomodar la Sala (diseño de #41) para que todo entre en 390 px.
- **Textos en mayúscula pixel sin tilde** ("PROLOGO", "VOLVIO", "GUIA"): es la tipografía de títulos
  (Q5).
- **Inventario lleno / girar el celular:** el inventario lleno (30/30) se ve y se puede vender, descartar y
  equipar; al girar a vertical aparece "girá el teléfono" y al volver sigue en la misma pantalla. No probé
  levantar botín con el inventario lleno dentro de la partida (es de botín, Q4).

## Pruebas corridas

- `tools/items/t_starter_gift.js` (regalo inicial, actualizada al camino nuevo con entrenamiento):
  **TODO OK**.
- `tools/alfa/q1_first_session.js` (nueva), sobre la base anterior a la última integración:
  - corrida completa 1: **59 PASS**, ganó la Ciudad, recorrió victoria y Campamento; solo falló un chequeo
    de la propia prueba (esperaba el menú y el juego, con razón, vuelve a la Sala de la arena siguiente).
    Corregido en la prueba.
  - corrida completa 2: el piloto perdió la Ciudad porque cayeron las estructuras (no es un error del juego,
    es puntería del piloto). Ahora la prueba también repara las estructuras.
  - corrida rápida (`SKIP_WIN=1`, sin la partida larga): **TODO OK** (regalo, entrenamiento, menús, Tienda,
    recargas, 3 derrotas seguidas, abandonar desde la pausa).
  - **NO VERIFICADO EN RUNTIME sobre la base integrada final** (merge de `claude/horda-latest-updates-gv4tlf`
    con los controles de Q7 y la carga diferida de skins de Q5): la máquina quedó sin memoria (16 GB usados,
    dos procesos de Chromium de la simulación de economía de Q4, `q4_econ.js`, ocupan ~13 GB y carga 50 en 4
    núcleos) y Chromium ni siquiera llega a abrir. No maté procesos ajenos. Hay que correr:
    `GAME_URL=http://127.0.0.1:8901/index.html node tools/alfa/q1_first_session.js` cuando la máquina esté libre.
  - Chequeo estático sobre la base integrada: mis cambios siguen presentes después del merge (sin conflictos).
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
| 11 | `css/onboarding.css` (`.hub-more[open] .hub-actions` en grilla de 2; `#mainmenu-screen .hub-more summary` porque `duo-ux.css` se carga después) |
| 12 | `js/ui/inventory-ui.js` |
| prueba | `tools/alfa/q1_first_session.js` |

Commits: b581550, 1f63d93, d7df6fd, 99a23b1, 6d0d72d (merge main), 376b4bb, f1c4488, e9c9487 (informe), e5ead42, 2a6faf7 (prueba), 874bca5, db2b44f (prueba/informe), 0118718 (merge de la integración).
