# Ynara — El Ángel del Silencio

Médica y soporte de área inspirada en las referencias del usuario. Chomba rosa chicle, pantalón blanco, pelo castaño largo, capa blanca y halo nacarado. Escucha en silencio, cuida a sus aliados y no pide perdón.

## Kit

- **Impecable:** tras ocho segundos sin golpes, escudo del 8% de vida durante nueve segundos, sin acumularse. Su ruptura por daño libera una pequeña represalia.
- **Mirada fulminante:** cono de luz con daño, ralentización y empuje de comunes cercanos. Jefes sin empuje y con ralentización limitada al 12%.
- **Estrogonof reparador:** una fuente de pollo al estrogonof por propietaria; cura aliados, daña con vapor y reduce un 8% el daño recibido dentro del área. Curación por pulso limitada y vida máxima respetada.
- **No quiero seguir esta conversación:** desplazamiento barrido que limpia ralentización y deja una cortina de agua. Respeta paredes y pisos seguros.
- **Santa Paciencia:** santuario móvil con alas blancas, pulsos de curación y daño. Hasta ocho cargas por golpes aliados, una cada 400 ms; onda final al expirar. Muerte y reinicio cancelan los efectos.

Set **Santa Paciencia**: dos piezas +8% vida, tres +10% curación del estrogonof, cuatro +10% daño de la onda final. Skin cosmética **Guardia Celeste**. Se registra antes del normalizador y de la carga de partidas guardadas; no cambia el progreso previo.

## Validación

- `tools/balance/check-entry-reference.js`: PASS; referencia y lista de campeones conocidos sin cambios.
- `tools/balance/entry-gate.js`: PASS; semillas 117, 431 y 991, 150 segundos cada una, nivel 20 sin equipo. Daño 6713,66 / 5661,32 / 7850,80; media 6741,92, por debajo del techo de soporte 8803,53. Dos supervivencias, una derrota; no se interpreta el gate como garantía de victoria ni de equilibrio competitivo.
- `tools/portadores/test-ynara.js`: 37 comprobaciones, cero fallos ni errores de página. Incluye límites, jefes, curación, talentos, set, muerte, reinicio, serialización y diez arenas.
- `tools/portadores/online-ynara.js`: dos clientes independientes contra el relay real, con Ynara como anfitriona y como invitada; construcciones, propietarias, habilidades, definitiva y skin replicadas.
- **Visual gate: PASS** tras inspección visual de `visual-gate.png` con Tanque, Soporte y Myla a la misma escala. Contorno oscuro, lectura chibi, pies alineados y alpha binaria. Juego: `gameplay.png`.

## Arte reproducible

`art-source/ynara/source.png` conserva la comisión original sin fotografías personales. `python3 tools/art/build_ynara.py` reconstruye atlas, preview y metadatos. Atlas 384×576, celdas 96×96, 24 poses: cuatro de movimiento y cuatro de lanzamiento por frente, lateral y espalda; izquierda por espejo. Ataque y definitiva usan lanzamiento; golpe y muerte usan una pose estática con los efectos generales del motor. Las alas de la definitiva y el plato se dibujan en tiempo de ejecución, también en invitados.

Los scripts de navegador admiten `CHROMIUM_PATH`; el workflow ejecuta pruebas funcionales y online junto al gate de entrada. Evidencia JSON y capturas guardadas en este directorio y en `docs/portadores/ynara-*`.
