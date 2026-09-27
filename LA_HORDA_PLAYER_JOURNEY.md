# LA HORDA — PLAYER JOURNEY (auditoría pre-alfa)

Recorrido de **un jugador que nunca vio La Horda** y recibe el enlace. Todo lo de abajo se jugó en
un **perfil limpio**, en un **iPhone horizontal emulado** (844×390, táctil, DPR 2), con toques reales.
Herramientas: `tools/audit/journey.js` (navegación con capturas y botones visibles) y
`tools/audit/play.js` (partida en tiempo real, una captura cada 15 s).

La progresión larga (30 min o más) se midió con `tools/playtest/campaign.js`: partidas completas
jugadas por el piloto automático, con el guardado real de campaña, sin trucos.

> **Aclaración honesta.** El piloto automático no es un humano: se mueve, ataca y usa habilidades,
> pero no "entiende" una mecánica nueva ni se frustra. Los tiempos de 15 y 30 minutos son una
> **estimación con datos de simulación**, no una observación de personas reales. Todo lo que
> necesita ojos u oídos humanos (sensación, audio, lectura bajo presión) está marcado
> **NOT VERIFIED IN RUNTIME**.

Estado de la columna **Hoy**: ✅ bien · ⚠️ molesta · ❌ se pierde gente. Entre paréntesis, lo que
arregló esta auditoría.

---

## 00:00 → 00:30 · Abrir el enlace

| t | Qué ve / hace | Hoy |
|---|---|---|
| 0 s | Pantalla de título con el ejército de guardianes en pixel art y el botón "Cargando… N %". | ✅ Hay indicador de carga. |
| ~14 s (4G simulado) | El botón pasa a "Toca para continuar". Antes del título baja solo lo necesario (14 MB, WebP); el arte de las arenas sigue bajando mientras mirás el menú. | ✅ (Antes: 1.366 imágenes y 51 MB antes del título, 52 s en 4G simulado.) En un teléfono real: **NOT VERIFIED IN RUNTIME**. |
| ~12 s | "**Tu primer guardián**": 10 tarjetas con rol y frase (Tanque, Asesino, Mago…). Elige y confirma con "¡Lo quiero!". | ✅ Clara, linda, bien explicada. |

**Antes de esta auditoría**, un perfil nuevo recibía de entrada:
- todos los guardianes en **nivel 90**;
- **todas las arenas** abiertas, más la Divina;
- **todas las skins** puestas.

Así el jugador nuevo se salteaba esta pantalla y toda la progresión (❌). Ahora eso solo pasa con `?dev=1`.

## 00:30 → 02:00 · Menú y primera partida

| t | Qué ve / hace | Hoy |
|---|---|---|
| 0:30 | Menú principal: MODOS DE JUEGO / CÓDICE / TIENDA. Aviso "🎁 Regalo de bienvenida: 10.000 de oro". | ✅ (Antes decía "Etapa de prueba".) |
| 0:35 | Modos → Arena → **Elegí la arena**: solo la 01 Ciudad Maldita abierta, las demás dicen qué completar. | ✅ (Antes era una tarjeta por pantalla, 5 pantallas de scroll; ahora son 2 columnas.) |
| 0:40 | Elegir guardián: 12 tarjetas, 11 con candado "Tienda · 2.500". | ✅ Sprites más grandes (64 px) y el rol de cada uno. |
| 0:45 | **La Sala**: 4 lugares (vos + 3 bots), "Crear sala online", "Unirse con código", equipamiento y talentos. | ✅ (Antes "Comenzar" quedaba abajo de 4 pantallas de inventario; ahora queda fijo abajo.) |
| 0:50 | **El Hechicero**, primera vez: el **prólogo** de la campaña ("La noche en que volvió la Horda") y después la **ficha de la arena**: qué te mata, qué te ayuda y el objetivo. | ✅ (Antes la Ciudad no tenía ficha y el prólogo, de 70 palabras, aparecía **a los 5,6 s de combate** tapando media pantalla mientras te pegaban ❌.) |
| 1:00 | Empieza la partida. Cartel "CIUDAD MALDITA · No podés salvarlos a todos". El Hechicero guía: "Movete con el joystick". | ✅ (El joystick estaba descentrado y medio cortado por el borde; arreglado.) |
| 1:00–1:45 | Horda, números de daño, bots que pelean, contador de civiles y estructuras arriba. Nivel 1 superado a los ~45 s: **3 cartas de refuerzo**. | ✅ Legible. Sensación de golpe: **NOT VERIFIED IN RUNTIME**. |

## 02:00 → 05:00

- Un nivel cada 30–45 s: carta de refuerzo en cada uno. Aparecen los "+" para subir habilidades.
- Primer civil encontrado: el Hechicero explica RESCATAR (mantener la acción) y dónde llevarlo.
- En la primera partida de Tanque (150 s reales) se llegó a **nivel 5** con **234 bajas** y **0 errores**.
- A los 2–3 minutos se juntaban tutorial, alertas de civiles, carteles y el "+" de habilidades. Ahora hay
  como mucho **2 alertas a la vez** (1 si habla el Hechicero), primero las urgentes. ✅

## 05:00 → 08:00 · El nivel 9 de la Arena 01

- Nivel 9 de la Ciudad: subjefes (Maestro + Tramoyista → apagón → Dama del Telón) + saqueadores.
- La Ciudad quedó más amable **solo para ella**:
  - el daño enemigo crece más lento;
  - −12 % de vida enemiga;
  - más pociones;
  - subjefes con −25 % de vida.
- **Simulación (perfil nuevo, guardián en nivel 1):**

| Caso | Antes | Ahora |
|---|---|---|
| Campaña completa, Mago y Tanque | 5 intentos cada uno para la Ciudad | **gana al primer intento** los dos |
| 12 guardianes, 1 intento en nivel 1 | 6 de 12 ganan | **7 de 12** ganan; casi todas las derrotas son en el nivel 9 (Saqueador) |

- Si perdés, la pantalla de derrota es clara: dice que "desde el nivel 6 te llevás un objeto aunque
  pierdas" y ofrece "Reintentar desde el Nivel 1".

## 08:00 → 15:00

- Segunda y tercera partida: llegan los primeros objetos y se prueba la Tienda.
- **Tienda con precios por rareza** (150 / 400 / 900 / 2.500; guardián 2.500; sets 1.200). Míticos y Únicos
  no se venden: se ganan jugando.
  - Con el regalo de 10.000, el jugador compra 2–4 cosas buenas, no todo el catálogo.
  - Un guardián nuevo cuesta 2–3 victorias al principio.
- Códice: 4 secciones (Guardianes 1/12, Bestiario 0/69, Jefes 0/22, Arenas 0/10), todo en español, con
  arte real. ✅ Motiva a descubrir.

## 15:00 → 30:00

- En simulación, la Ciudad cae al primer intento y en ~10 min se abre la **Fábrica Sin Fin** (02), con su
  ficha del Hechicero y la Cicatriz como hilo de historia.
- En 30 minutos un jugador que va bien está en la 03–04.

## 30:00+ · Campaña completa (simulación, perfil nuevo desde nivel 1)

| Arena | Mago: intentos | Tanque: intentos | Nota |
|---|---|---|---|
| 01 Ciudad Maldita | 1 | 1 | Antes, 5 y 5. |
| 02 Fábrica Sin Fin | 2 | 1 | |
| 03 Ruinas | 1 | 4 | |
| 04 Reino Fúngico | 1 | 1 | |
| 05 Gélida | 2 | 1 | |
| 06 Acuática | 1 | 1 | |
| 07 Laberinto | 1 | 1 | |
| 08 Abismo | 1 | **7** | El Tanque cae al vacío y los bots no llegan a rescatarlo cuando el derrumbe corta los puentes (DECISIÓN abierta). |
| 09 Minas | 1 | 1 | **Ahora el piloto cruza el Portal.** Se arregló una traba real que dejaba al guardián fuera del mapa. |
| 10 Infernal | 1 | 1 | **La campaña se completa de punta a punta.** |
| **Total** | **12 partidas, ~79 min** | **19 partidas, ~140 min** | Nivel del guardián al final: 42 y 40. |

---

## Puntos de abandono, ordenados (después de la segunda pasada)

1. **Abismo (Arena 08) jugando solo con un guardián lento**: caer al vacío termina la partida si nadie llega
   a rescatarte.
2. **Primer contacto en un teléfono real**: sensación con el dedo, audio y fluidez siguen **NOT VERIFIED IN
   RUNTIME** (la emulación dio 60 FPS en la Ciudad y, con resolución adaptable, en el Micelial).
3. **Nivel 9 de la Arena 01** para algunos guardianes (Musashi, Guerrero): perder a los ~7 min, aunque
   ahora el primer intento se gana en la mayoría de los casos.
4. **Portal de las Minas**: si alguien no lee el cartel, puede no entender que hay que cruzarlo. El
   Hechicero lo explica y el marcador del objetivo apunta ahí.

Ya no están en la lista: la carga de 51 MB (ahora 14 MB hasta el título), el relay que no dejaba crear
salas (arreglado y verificado en vivo), la Tienda que regalaba todo y la Arena 01 de 45–60 minutos.

## Qué hace volver

- El arte y la identidad de cada arena: cada una tiene una regla propia que ninguna otra tiene.
- El Códice por descubrir, las 12 fichas de guardianes y los jefes con regla.
- Jugar con amigos en la misma sala con código.
- La Cicatriz como hilo: cada victoria abre la próxima arena con una línea de historia.
