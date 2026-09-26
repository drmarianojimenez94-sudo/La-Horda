# LA HORDA — Informe de progresión, botín y economía

> Todo lo que sigue se midió con el **código real** del juego en Chromium (Playwright), sin fórmulas en una
> planilla aparte:
> - **Progresión:** `tools/playtest/campaign.js` con el piloto automático ("jugador competente": se mueve,
>   esquiva los avisos, usa habilidades y la curación de emergencia, patea destructibles, elige refuerzos, se
>   equipa lo mejor y gasta los puntos de talento que sugiere el HUD). Guardado vacío, campaña en orden.
> - **Botín:** `tools/balance/lootsim2.js` (`rollLoot` + `materializeLoot` + recetas + reforja de repetidos),
>   200 carreras de un mago que juega la campaña (8 victorias por arena) y después farmea la Infernal.
> - Lo que depende de cómo se siente (¿la Gélida es un desafío o un muro?) está marcado **HUMAN TEST REQUIRED**.

## 1. Curva de XP

`xpToNext(L) = 90 + 26·L + 0,16·L³` (`js/systems/progression.js`). Rápida al principio (cada victoria temprana
sube varios niveles) y lenta al final (los últimos niveles piden varias partidas).

Campaña completa desde un guardado vacío (piloto automático, 31–40 partidas por campeón, 0 errores de página):

| Campeón | Partidas hasta terminar la campaña | Nivel al terminar | Nivel tras 30 partidas | Intentos por arena (Ruinas · Acuática · Fortaleza · Micelial · Gélida · Laberinto · Infernal) |
|---|---|---|---|---|
| Tanque | 11 | 35 | 53 | 4 · 1 · 1 · 1 · **2** · 1 · 1 |
| Mago | 10 | 39 | 59 | 2 · 1 · 1 · 1 · **1** · 3 · 1 |
| Cazadora | 15 | 39 | 52 | 1 · 3 · 2 · 1 · **1** · 6 · 1 |

Nivel del campeón partida a partida (Mago): 4 → 19 → 25 → 28 → 31 → 34 → 34 → 35 → 37 → 39 (campaña terminada) → 42
(partida 12) → 47 (16) → 52 (21) → 57 (26) → 61 (31) → 65 (40).

- **Rápida al principio:** la primera victoria sube de 4 a 19 niveles; a la mitad de la campaña ya se está en 30.
- **Lenta al final:** después de la campaña cuesta ~1 nivel por partida entre el 40 y el 50, y ~0,5 entre el 55 y el 65.
- **Arreglo de la simulación:** el piloto no gastaba los puntos de talento que un jugador real sube con el botón
  del HUD. Con eso la Gélida parecía un muro (0/14 del Mago); ahora `campaign.js` los gasta como una persona.

## 2. Oro y la meta de 5.000

- Campeón nuevo en la Tienda: **5.000** de oro (`CHAMPION_PRICE_GOLD`). Es una meta real: vender basura no lo
  paga (`SELL_VALUE`: común 3, raro 10, muy raro 35, legendario 320, mítico 1.100, Único no se vende).
- Tienda diaria de objetos: raro 260–360, muy raro 950–1.300, legendario 4.600–5.600 (compite con comprar un
  campeón: es una decisión, no un trámite).
- Derrota o abandono: se cobra una parte del oro y la XP de la partida (penalidad por arena), así que perder
  sigue sumando un poco pero no "farmea".

| Campeón | Oro medio por victoria | Oro medio por derrota | Llega a 5.000 en la partida | Oro al terminar la campaña |
|---|---|---|---|---|
| Tanque | 1.780 (696–2.613) | 345 | 7 (nivel 29) | 9.514 |
| Mago | 2.064 (931–3.050) | 471 | 6 (nivel 34) | 10.440 |
| Cazadora | 1.691 (889–2.402) | 583 | 7 (nivel 32) | 12.680 |

- El **primer campeón comprado** llega hacia la partida 6–7 (≈ 45 minutos de juego, entre la Fortaleza y el
  Micelial): una meta real sin volverse un muro. Al terminar la campaña alcanza para 2 campeones.
- En el juego tardío el oro se acumula (40.000–78.000 tras 30–40 partidas). Tiene dónde ir: 11 campeones a 5.000 y
  legendarios en la tienda diaria a ~5.000. **HUMAN TEST REQUIRED:** si hace falta otro sumidero de oro a largo plazo.

## 3. Botín (200 carreras simuladas)

### Por victoria, según la arena (2,06 objetos por victoria)

| Arena | Común | Raro | Muy raro | Legendario | Set | Mítico | Único |
|---|---|---|---|---|---|---|---|
| Ruinas del Bosque | 64,3% | 26,6% | 7,1% | 1,7% | 0,18% | 0,08% | 0,002% |
| Acuática | 50,0% | 34,4% | 11,7% | 3,3% | 0,43% | 0,14% | 0,012% |
| Fortaleza | 42,7% | 36,9% | 15,0% | 4,5% | 0,72% | 0,16% | 0,024% |
| Micelial | 40,0% | 37,6% | 16,5% | 4,9% | 0,78% | 0,20% | 0,019% |
| Gélida | 36,9% | 38,0% | 18,1% | 5,8% | 0,96% | 0,19% | 0,024% |
| Laberinto | 26,2% | 36,1% | 26,8% | 8,0% | 2,4% | 0,49% | 0,077% |
| Infernal | 14,4% | 31,9% | 35,4% | 12,4% | 4,4% | 1,27% | 0,133% |

Cada arena nueva **se siente** más generosa: la basura común baja de 64% a 14% y el legendario sube ×7.

### Hitos de una carrera (victorias hasta conseguirlo)

| Hito | p10 | Mediana | p90 | Nunca en 600 victorias |
|---|---|---|---|---|
| 1er legendario | 4 | 14 | 29 | 0% |
| 1er legendario con nombre | 8 | 20 | 39 | 0% |
| 1ª pieza del set de SU campeón | 23 | 51 | 92 | 0% |
| Set completo de su campeón (con reforja de repetidos) | 93 | 157 | 280 | 0% |
| 1er Mítico de botín | 43 | 74 | 163 | 0% |
| 1er Mítico fabricado (receta de 3 legendarios) | 64 | 101 | 140 | 0% |
| 1er Mítico por cualquier vía | 39 | 68 | 108 | 0% |
| 1er Único | 94 | 295 | 600+ | 11% |
| Inventario lleno (30 lugares) | 51 | 56 | 62 | — |

Lectura:
- El **legendario** llega en la campaña (mediana 14 victorias ≈ Acuática/Fortaleza).
- El **set propio** es la meta del juego tardío: la 1ª pieza aparece al terminar la campaña y el set completo
  pide farmear (mediana 157 victorias). `SET_CHAMPION_BIAS = 14` hace que las piezas de set caigan sobre todo del
  campeón que jugás; las repetidas se reforjan (2 repetidas → la pieza que falta).
- El **Mítico** tiene dos caminos que se equilibran: suerte (botín) o constancia (receta).
- El **Único** es un jackpot de verdad: 11% de las carreras simuladas no lo vio en 600 victorias. El pity sube
  +1% por victoria sin Único (tope ×3) para que no sea imposible, y **no se fabrica** (regla del diseño).
- El inventario se llena hacia la victoria 56: aparece la decisión de vender/reforjar/fabricar justo cuando las
  recetas empiezan a completarse.

## 4. La pared de la Gélida

**Objetivo:** que la Arena Gélida se pase en **2–4 intentos**, no a fuerza de grind.

**Qué pasaba:** en la simulación de progresión el Mago iba 0/14 y la Cazadora 1/8 en la Gélida. Se investigó
con A/B de partidas reales (Gélida, nivel 31, equipo automático, maestría 10 en cada habilidad):

| Versión | Tanque | Mago | Cazadora | Total |
|---|---|---|---|---|
| Sin ajustes de la Gélida | 4/4 | 3/4 | 2/4 | 9/12 |
| Avisos de 0,9 s + tope de 2 demonios | 6/6* | 7/8 | 8/8 | 21/22* |
| **Final: avisos de 0,9 s (sin tope)** | 3/4 | 4/4 | 2/4 | **9/12** |

\* Sin contar 2 derrotas por el bug de abajo.

- **La "pared" era de la simulación, no del juego:** (1) el piloto no gastaba puntos de talento; (2) un **bug
  real** del Tanque: elegir un refuerzo entre niveles con el Grito de Guerra activo dejaba la vida máxima rota
  (bajaba nivel a nivel hasta quedar **negativa**). Arreglado, con el test `tools/items/t_hpbonus.js`.
- Se mantuvo solo el cambio de legibilidad: los ataques del Demonio de Hielo y Fuego (élite) avisan 0,9 s, la
  norma de élite. El tope de 2 demonios se **quitó**: la A/B mostró que solo facilitaba la arena.
- **Resultado en la campaña simulada:** Gélida en 1–2 intentos (Tanque 2, Mago 1, Cazadora 1). El piloto esquiva los
  avisos a la perfección; una persona debería necesitar más intentos, así que el objetivo de 2–4 es plausible pero
  **no está verificado con personas (HUMAN TEST REQUIRED)**. Si resulta fácil, la palanca es `ARENA_MODS.hielo`
  (vida/daño de la arena), no el diseño de los enemigos.
- El que sí pide más intentos es el **Laberinto** con la Cazadora (6), por la cantidad de enemigos a distancia.
  Queda anotado para la próxima pasada; con Tanque y Mago salió en 1 y 3.

## 5. Calificación de la partida (performance score)

- Nota por **rol** (tanque: daño mitigado y amenazas controladas; soporte: curación efectiva y aliados
  salvados; daño: daño a prioritarios...). Umbrales: S+ ≥ 93, S ≥ 83, A ≥ 67.
- A prueba de exploits (`tools/items/t_perf_exploits.js`, 8/8): quedarse quieto no pasa de C; la sobrecuración
  no cuenta (solo la curación efectiva); el sobredaño tampoco; los procs no inflan el "área" del mago; las
  caídas y la muerte castigan; la curación de emergencia no suma. **S+ exige cero caídas.**
- La nota mejora el botín (grado S/S+ = más chance de rarezas altas en el cofre).

## 6. Pay-to-win

No hay. No existe moneda premium ni compra con dinero real; el oro solo se gana jugando y el Único no se compra
ni se fabrica.

## 7. Qué queda para una persona (HUMAN TEST REQUIRED)

- [ ] ¿La mediana de 157 victorias para el set completo se siente como una meta o como un grind?
- [ ] ¿5.000 de oro por campeón se siente alcanzable al terminar la campaña?
- [ ] ¿La Gélida se siente como un desafío de 2–4 intentos?
