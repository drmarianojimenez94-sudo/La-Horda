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
| 6–10 s (local) | El botón pasa a "Toca para continuar". Se precargan **1.366 imágenes, 50,9 MB**. | ⚠️ En 4G real pueden ser **30–90 s**: **NOT VERIFIED IN RUNTIME**, pero es el primer lugar donde se va gente. |
| ~12 s | "**Tu primer guardián**": 10 tarjetas con rol y frase (Tanque, Asesino, Mago…). Elige y confirma con "¡Lo quiero!". | ✅ Clara, linda, bien explicada. |

**Antes de esta auditoría**, un perfil nuevo recibía de entrada:
- todos los guardianes en **nivel 90**;
- **todas las arenas** abiertas, más la Divina;
- **todas las skins** puestas.

Así el jugador nuevo se salteaba esta pantalla y toda la progresión (❌). Ahora eso solo pasa con `?dev=1`.

## 00:30 → 02:00 · Menú y primera partida

| t | Qué ve / hace | Hoy |
|---|---|---|
| 0:30 | Menú principal: MODOS DE JUEGO / CÓDICE / TIENDA. Aviso "🎁 Etapa de prueba: recibiste 10.000 de oro". | ⚠️ El aviso usa lenguaje de desarrollo (aceptable en una alfa cerrada). |
| 0:35 | Modos → Arena → **Elegí la arena**: solo la 01 Ciudad Maldita abierta, las demás dicen qué completar. | ✅ (Antes era una tarjeta por pantalla, 5 pantallas de scroll; ahora son 2 columnas.) |
| 0:40 | Elegir guardián: 12 tarjetas, 11 con candado "Tienda · 1.000". | ⚠️ Los sprites se ven chicos (52 px). (Ahora muestra el rol; el subtítulo pasó de "HORDE SURVIVAL" a español.) |
| 0:45 | **La Sala**: 4 lugares (vos + 3 bots), "Crear sala online", "Unirse con código", equipamiento y talentos. | ✅ (Antes "Comenzar" quedaba abajo de 4 pantallas de inventario; ahora queda fijo abajo.) |
| 0:50 | **El Hechicero**, primera vez: el **prólogo** de la campaña ("La noche en que volvió la Horda") y después la **ficha de la arena**: qué te mata, qué te ayuda y el objetivo. | ✅ (Antes la Ciudad no tenía ficha y el prólogo, de 70 palabras, aparecía **a los 5,6 s de combate** tapando media pantalla mientras te pegaban ❌.) |
| 1:00 | Empieza la partida. Cartel "CIUDAD MALDITA · No podés salvarlos a todos". El Hechicero guía: "Movete con el joystick". | ✅ (El joystick estaba descentrado y medio cortado por el borde; arreglado.) |
| 1:00–1:45 | Horda, números de daño, bots que pelean, contador de civiles y estructuras arriba. Nivel 1 superado a los ~45 s: **3 cartas de refuerzo**. | ✅ Legible. Sensación de golpe: **NOT VERIFIED IN RUNTIME**. |

## 02:00 → 05:00

- Un nivel cada 30–45 s: carta de refuerzo en cada uno. Aparecen los "+" para subir habilidades.
- Primer civil encontrado: el Hechicero explica RESCATAR (mantener la acción) y dónde llevarlo.
- En la primera partida de Tanque (150 s reales) se llegó a **nivel 5** con **234 bajas** y **0 errores**.
- Riesgo ⚠️: a los 2–3 minutos hay **muchos textos a la vez**: tutorial, alertas de civiles, carteles de
  estructura y el "+" de habilidades. Es legible, pero en un teléfono chico se acumula.

## 05:00 → 08:00 · El primer muro

- Nivel 9 de la Ciudad: subjefes (Maestro + Tramoyista → apagón → Dama del Telón) + saqueadores.
- **Datos de simulación (perfil nuevo, guardián en nivel 1–14):**

| Guardián (progresión) | Intentos hasta ganar la Ciudad | Dónde muere |
|---|---|---|
| Tanque | 5 (4 derrotas + 1 partida que no terminó en 22 min) | nivel 9 (saqueador, jefe) |
| Mago | 5 (4 derrotas) | nivel 9 y 10 |
| Cazadora | 1 | — |
| 12 guardianes, 1 intento en nivel 1 | 6 ganan · 5 pierden · 1 sin terminar | Axiom en el **nivel 2** (52 s); Soporte en el 6; el resto en el 9 |

- **Punto de abandono ❌:** perder a los ~7 minutos, en el nivel 9, y leer "perdiste el 50 % de lo ganado".
  La pantalla de derrota es clara y buena: dice que "desde el nivel 6 te llevás un objeto aunque
  pierdas" y ofrece "Reintentar desde el Nivel 1". Pero el nivel 9 de la primera arena es un salto duro.

## 08:00 → 15:00

- Segunda y tercera partida: el guardián ya está en nivel 7–12, llegan los primeros objetos y se
  prueba la Tienda.
- Con **10.000 de oro y todo a 1.000**, el jugador puede comprar **9 guardianes, o sets, legendarios,
  míticos y hasta Únicos** en 2 minutos. Lo pidió el dueño (etapa de prueba), pero **aplasta la curva
  de loot** que el juego construye después (ver la propuesta en el informe de auditoría).
- Códice: 4 secciones (Guardianes 1/12, Bestiario 0/69, Jefes 0/22, Arenas 0/10), todo en español, con
  arte real. ✅ Motiva a descubrir.

## 15:00 → 30:00

- Simulación: la Ciudad cae entre los **45 y los 60 minutos acumulados** (Tanque y Mago) o en el primer
  intento (Cazadora).
- **Punto de abandono ❌ #2:** un jugador que no gana la Arena 01 en su primera sesión de ~30 min
  probablemente no vuelve. Hace falta observar a humanos reales antes de retocar el balance.
- La victoria abre la **Fábrica Sin Fin** (02) con su ficha del Hechicero y la Cicatriz como hilo de
  historia. Con el nivel que deja la Ciudad (22–26), la 02 se gana en 1–4 intentos y de ahí en
  adelante el ritmo mejora mucho: casi todas se ganan al primer intento.

## 30:00+ · Campaña completa (simulación)

| Arena | Nivel del guardián (Tanque / Mago / Cazadora) | Intentos | Nota |
|---|---|---|---|
| 01 Ciudad Maldita | 1→22 / 1→17 / 1 | 5 / 5 / 1 | El muro más duro de toda la campaña. |
| 02 Fábrica Sin Fin | 26 / 22 / 18→22 | 1 / 2 / 4 | |
| 03 Ruinas | 28 / 28 / 27 | 1 / 1 / 1 | |
| 04 Reino Fúngico | 31 / 31 / 30 | 1 / 1 / 1 | |
| 05 Gélida | 32 / 33 / 32 | 1 / 1 / 2+ | |
| 06 Acuática | 34 / 35 / 36 | 1 / 1 / 1 | |
| 07 Laberinto | 35 / 37 / 38 | 1 / 1 / 1 | |
| 08 Abismo | 37 / 39 / 39 | 4 / 1 / 2 | Segundo muro (Tanque). |
| 09 Minas | 38–46 / 41–43 / 41–44 | — | Cerbero cae (7–159 s) pero **el piloto no sabe cruzar el Portal**: la partida no termina. Es una limitación de la herramienta; el cruce humano está probado en `tools/minas/smoke.js`. |
| 10 Infernal | — | — | No alcanzada por simulación (bloqueada por lo de arriba): **NOT VERIFIED IN RUNTIME** como parte de una campaña continua. |

---

## Puntos de abandono, ordenados

1. **Carga inicial de 51 MB** en datos móviles (antes de ver nada jugable).
2. **Nivel 9 de la Arena 01**: derrota a los ~7 min, con pérdida del 50 %.
3. **Arena 01 larga**: 45–60 min hasta la primera victoria, en simulación.
4. **Multijugador con el servidor dormido**: si el relay público está en un plan gratuito que se duerme,
   la primera sala tarda o falla (**NOT VERIFIED IN RUNTIME**).
5. **La Tienda trivializa el loot** (10.000 de oro, todo a 1.000).
6. **Portal de las Minas**: si alguien no lee el cartel, puede no entender que hay que cruzarlo. El
   Hechicero lo explica con un cartel de 12 s y el marcador del objetivo apunta ahí.

## Qué hace volver

- El arte y la identidad de cada arena: cada una tiene una regla propia que ninguna otra tiene.
- El Códice por descubrir, las 12 fichas de guardianes y los jefes con regla.
- Jugar con amigos en la misma sala con código.
- La Cicatriz como hilo: cada victoria abre la próxima arena con una línea de historia.
