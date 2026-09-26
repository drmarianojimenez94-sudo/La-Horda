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

_(Simulación de progresión en curso: esta sección se completa con los datos medidos.)_

## 2. Oro y la meta de 5.000

- Campeón nuevo en la Tienda: **5.000** de oro (`CHAMPION_PRICE_GOLD`). Es una meta real: vender basura no lo
  paga (`SELL_VALUE`: común 3, raro 10, muy raro 35, legendario 320, mítico 1.100, Único no se vende).
- Tienda diaria de objetos: raro 260–360, muy raro 950–1.300, legendario 4.600–5.600 (compite con comprar un
  campeón: es una decisión, no un trámite).
- Derrota o abandono: se cobra una parte del oro y la XP de la partida (penalidad por arena), así que perder
  sigue sumando un poco pero no "farmea".

_(Simulación de progresión en curso: esta sección se completa con los datos medidos.)_

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

_(Simulación de progresión en curso: esta sección se completa con los datos medidos.)_

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
