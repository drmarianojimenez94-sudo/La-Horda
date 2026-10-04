# Alfa · Q4: botín, economía y progresión

Qué se cambió para el alfa, por qué y con qué números. Todo se midió antes y después con el código real del
juego (`tools/balance/q4_econ.js`, Monte Carlo en Chromium, 600 partidas por arena).

- **Antes:** `91e6ba9`.
- **Después:** esta rama.

Los cambios son **conservadores**:

- no se rediseñó ningún sistema;
- no se sacó nada de la tienda;
- no se tocó el regalo inicial;
- los guardados viejos siguen iguales.

## 1. Qué cambió

| # | Cambio | Dónde | Guardados viejos |
|---|---|---|---|
| 1 | **Nivel de objeto por arena.** Lo que cae nace con `it.ilvl` igual al número de la arena de la campaña (1 a 10; la Arena Divina cuenta como 10). Cada nivel suma +5 % a **todos** los números del objeto: el stat garantizado, las pasivas y los afijos. Un objeto de la arena 10 vale ×1,45 lo mismo caído en la arena 1. Es un eje **aparte** del nivel de Gemas: no cambia el costo de mejorar | `js/data/item-identity.js` (`ITEM_ILVL_*`), `js/systems/items.js` (`itemIlvl`, `itemLevelMult`), `js/systems/loot.js` (`lootItemLevelFor`, `materializeLoot`) | Sin campo = nivel 1: nada cambia. Se recorta a 1-10 al leer, así que un objeto que llega por intercambio no se puede inflar |
| 2 | **Se ve en la ficha y en el inventario.** La ficha muestra «Arena 7 · +30 %» y la tarjeta, «Arena 7». La comparación ▲▼ ya lo refleja porque usa `itemStat` | `js/ui/item-preview.js`, `js/ui/inventory-ui.js` (un renglón cada uno) | — |
| 3 | **Pisos de rareza.** El primer objeto que suelta cada fuente tiene un mínimo: élite con nombre y subjefe, Raro; jefe, Muy Raro; cofre de victoria, Raro. Lo que iba a salir por debajo **sube al piso**: la probabilidad de Legendario o más **no cambia** | `js/data/ground-loot.js` (`floor`), `js/data/loot.js` (`LOOT_VICTORY_FLOOR`), `lootApplyFloor` | — |
| 4 | **Mejora segura en la primera victoria de la campaña.** El primer objeto del cofre es un **Muy Raro** para una ranura **vacía** del guardián que jugás. Si no tiene ninguna vacía, va a la más floja. Pasa una sola vez por cuenta (`save.firstWinLoot`). Los guardados que ya ganaron alguna arena no lo reciben (queda `"previa"`) y una derrota no lo gasta | `js/systems/loot.js` (`firstWinLootDue`, `firstWinLootSpec`) | Sí, marcado sin regalo |
| 5 | **Tablas de botín y Gemas en el orden de la campaña.** Antes estaban en el orden viejo de las arenas. La arena 3 (Bosque) pagaba como la 1, la 6 menos que la 2 y la 8 menos que la 7 (bug B1 de la reseña). Ahora cada arena paga un poco más que la anterior. El Abismo (8) tiene su fila propia, entre la 7 y la 9 | `js/data/loot.js` (`ARENA_LOOT`, `ARENA_LOOT_LABEL`), `GEMS_PER_VICTORY` | — |
| 6 | **Reciclado automático** (arreglo del crítico, verificado). Con el inventario lleno, nunca recicla lo comprado (`it.bought`) ni lo pasado por la Mística (`it.rerolls > 0`) | `js/systems/ground-loot.js` (`recyclable`) | — |
| 7 | **Menos oro de logros, desafíos y pase.** Los logros pagan la mitad. Los desafíos, ×0,55. En el pase, 5 niveles de oro pasaron a **Gemas** (20 en total) y el resto paga la mitad | `js/data/quests.js`; `js/systems/quests.js` (recompensa `gems`); `js/ui/quests-ui.js` (ícono del nivel del pase) | Los desafíos ya sorteados conservan su premio hasta que roten |
| 8 | **Cofre de desafío con el inventario lleno:** paga el **valor de venta** del objeto, no 150 fijos (bug B3: convenía abrirlo con el inventario lleno) | `js/systems/quests.js` (`questsOpenChest`) | — |
| 9 | **Tienda:** el catálogo sigue **completo** (guardianes, todos los objetos, los 94 sets y las skins). Suben los legendarios con nombre (3.000 → 4.000), los de guardián (1.500 → 1.800), el Muy Raro básico (900 → 1.100) y el Legendario básico (2.500 → 3.200). **La pieza de set (el precio de las skins) y los guardianes no cambian.** Lo que se compra nace con nivel de objeto 1: el mismo objeto caído en una arena alta vale más | `js/systems/shop.js` (`SHOP_PRICES`) | — |
| 10 | Conservan el nivel de objeto: la fusión (el mayor de los tres), la reforja de set (el menor de los dos) y el autoequipado de skins, que ahora elige la pieza con más Gemas × nivel de objeto | `js/systems/items.js`, `js/systems/loot.js`, `js/systems/shop.js` | — |

**No se tocó:** el regalo inicial (ver §5), el oro de pelear (bajas, victoria y civiles), el precio de los
guardianes ni la cantidad de objetos que caen.

## 2. Qué cae por arena (por partida)

Supuestos, iguales antes y después (los de la reseña, §2.2):

- **Bajas por partida:** 500 comunes, 15 sub-élites, 3 élites, 2 élites con nombre, 2 subjefes y 1 jefe.
- **Cofre:** calificación A.
- **Perfil:** uno que ya había ganado antes, así que sin el regalo de primera victoria.

| Arena | Objetos | % Común | Muy Raro o más | Legendario o más | Partidas con al menos un Muy Raro | Arma Muy Raro (stat medio) |
|---|---|---|---|---|---|---|
| 1 Ciudad | 12,6 → 12,7 | 67,5 → **39** | 0,88 → **1,83** | 0,06 → 0,07 | 59 % → **100 %** | 35 % → 35 % |
| 2 Fortaleza | 12,6 → 12,6 | 47 → 31 | 2,01 → 2,35 | 0,21 → 0,16 | 88 % → 100 % | 35 % → 37 % |
| 3 Bosque | 12,9 → 13,0 | 66 → **27** | 1,18 → **2,96** | 0,33 → 0,45 | 72 % → 100 % | 35 % → 38 % |
| 4 Micelial | 12,8 → 13,0 | 45 → 26 | 2,43 → 3,13 | 0,44 → 0,44 | 92 % → 100 % | 35 % → 40 % |
| 5 Gélida | 13,0 → 12,9 | 41 → 23 | 2,71 → 3,44 | 0,54 → 0,51 | 95 % → 100 % | 35 % → 42 % |
| 6 Acuática | 13,0 → 12,8 | 53 → 20 | 1,82 → 4,11 | 0,39 → 0,60 | 84 % → 100 % | 35 % → 44 % |
| 7 Laberinto | 12,8 → 12,9 | 31 → 18 | 4,07 → 4,77 | 0,71 → 0,74 | 99 % → 100 % | 35 % → 45 % |
| 8 Abismo | 12,9 → 13,1 | 35 → 17 | 3,41 → 5,10 | 0,62 → 0,77 | 97 % → 100 % | 35 % → 47 % |
| 9 Minas | 12,9 → 12,9 | 25 → 15 | 4,84 → 5,44 | 0,87 → 0,80 | 100 % → 100 % | 35 % → 49 % |
| 10 Infernal | 12,9 → 12,7 | 19 → 11 | 5,80 → 6,29 | 0,99 → 1,05 | 100 % → 100 % | 35 % → **51 %** |

**Qué se lee:**

- **No llueve más.** Se tira la misma cantidad de objetos y el Legendario sigue igual de raro. En la Fortaleza
  bajó un poco por el reorden: pagaba como la arena 5.
- **Cae menos basura.** En la Ciudad, los Comunes pasan del 67 % al 39 % y el Muy Raro por partida se duplica
  (0,9 → 1,8).
- **La curva ya no tiene pozos:** el Bosque (3) y la Acuática (6) dejaron de pagar como arenas anteriores.
- **Farmear arriba tiene sentido.** Antes, el arma Muy Raro valía +35 % de daño en cualquier arena. Ahora vale
  +35 % en la 1 y +51 % en la 10.

**Ciudad, por fuente** (% de Raro o mejor):

| Fuente | Antes | Después |
|---|---|---|
| Élite con nombre | 34 % | **78 %** |
| Subjefe | 33 % | 78 % |
| Jefe | 37 % | 61 % (el primero de cada jefe: 100 % Muy Raro o más) |
| Cofre | 33 % | 69 % |
| Horda común | 27 % | 28 % (sin cambios) |

## 3. Primeras mejoras (perfil nuevo)

Supuestos:

- una victoria por partida en el orden de la campaña;
- el jugador equipa lo que sube el stat de la ranura o llena una vacía;
- nunca rompe el set regalado.

| Guardián | Regalo | Muy Raro que mejora en la partida 1 | Primera vez que algo le gana a una pieza del set (en stat) |
|---|---|---|---|
| Sin set (los 12) | croma o nada | 55-73 % → **100 %** | — |
| Guerrero | set Nocturno | 18 % → **100 %** | partida 7 → **6** |
| Mago | set Convergencia | 30 % → 100 % | 6 → **4** |
| Soporte | set Custodio | 18 % → 100 % | 6 → 5 |
| Segador | set Marea | 20 % → 100 % | 7 → 5 |
| Axiom | set Sistema | 20 % → 100 % | 6 → 5 |
| Profeta | set Profecía | 23 % → 100 % | 8 → 4 |
| Musashi | set Errante | 28 % → 100 % | 7 → 5 |
| Cazadora | set Manada | 15 % → 100 % | 7 → 5 |
| Eren | set Legión | 8 % → 100 % | 6 → 5 |

«La primera mejora» a secas sale en la partida 1 antes y después, porque cualquier objeto llena una ranura
vacía. Por eso la tabla mide lo que se **siente**: un Muy Raro que mejora de verdad.

## 4. Oro por partida y por fuente

**Primera partida.** Es una partida sintética con el sistema real de logros, desafíos y pase: Ciudad ganada con
A en 7:11, 520 bajas, 25 civiles, sin caer y 2 subjefes. El oro de pelear es el que midió la reseña (658). Es
un techo: la reseña midió 2.268 con menos bajas, porque no cobró «Carnicería», el logro de 300 bajas en una
partida.

| Fuente | Antes | Después |
|---|---|---|
| Peleando (bajas, victoria, civiles) | 658 | 658 |
| Logros | 1.390 | 710 |
| Desafíos | 450 | 250 |
| Pase | 550 | 150 + 2 Gemas |
| **Total** | **3.048** | **1.768** |
| Parte que sale de pelear | 22 % | **37 %** |

**Crucero.** Es un jugador sostenido, ya sin logros fáciles: 4 partidas por día, 20 por semana y 603 de XP de
cuenta por partida, así que el pase se termina en ~22 partidas.

| Fuente | Antes | Después |
|---|---|---|
| Peleando | ~550 | ~550 |
| Desafíos diarios | 167 | 92 |
| Desafíos semanales | 166 | 91 |
| Pase | 346 | 102 (+20 Gemas en todo el pase) |
| **Total por partida** | **~1.230** | **~835** (−32 %) |

## 5. Cuánto tarda comprar cada cosa

Partidas desde cero: la primera, más partidas de crucero. Con ~7-10 minutos por partida.

| Compra | Precio (antes → después) | Partidas antes | Partidas después |
|---|---|---|---|
| Guardián | 2.500 | 0,8 | **1,9** |
| Legendario con nombre | 3.000 → 4.000 | 1,0 | **3,7** |
| Pieza de set | 1.200 | 0,4 | 0,7 |
| Skin de set (4 piezas) | 4.800 | 2,4 | 4,6 |
| Muy Raro básico | 900 → 1.100 | 0,3 | 0,6 |
| Legendario básico | 2.500 → 3.200 | 0,8 | 2,7 |

Después de 3 partidas, el oro acumulado pasa de ~5.500 a ~3.400 (la reseña midió 3.892 antes).

## 6. Regalo inicial: números para que decida el dueño (no se tocó)

A 9 de 12 guardianes el regalo les ofrece la skin de set, que trae las 4 piezas del set del guardián. Tanque,
Nigromante y Libertador solo tienen cromas.

La tabla compara el set regalado (nivel de objeto 1) con el mejor botín **sin set** después de ganar las
arenas 1-3. Mide el daño base (`computePlayerStats`) y la vida máxima, sobre el guardián sin nada:

| Guardián | Set regalado | Botín de 3 arenas, antes | Botín de 3 arenas, después |
|---|---|---|---|
| Guerrero | +48 % daño, +0 % vida | +29 % / +55 % | +39 % / +60 % |
| Mago | +53 % / +59 % | +34 % / +53 % | +40 % / +63 % |
| Soporte | +48 % / +68 % | +27 % / +59 % | +37 % / +73 % |
| Segador | +53 % / +70 % | +30 % / +57 % | +39 % / +67 % |
| Axiom | +54 % / +0 % | +30 % / +57 % | +38 % / +66 % |
| Profeta | +0 % / +70 % | +24 % / +59 % | +40 % / +71 % |
| Musashi | +52 % / +0 % | +34 % / +56 % | +39 % / +66 % |
| Cazadora | +49 % / +0 % | +32 % / +56 % | +39 % / +65 % |
| Eren | +53 % / +67 % | +34 % / +55 % | +40 % / +68 % |

**Qué no entra en la tabla, y pesa:** los bonos del set.

- 2 piezas: la **transformación** de una habilidad y +10 % de daño de habilidades, entre otros.
- 3 piezas: un bono más.
- 4 piezas: el efecto completo, por ejemplo el estallido del 250 % del Mago.

En números crudos, después de 3 arenas el botín ya **iguala o supera** al set regalado en vida, porque llena 6
ranuras contra 4, y queda **a ~10 puntos** en daño. Lo que el botín no puede igualar en la campaña temprana es
el poder de los bonos. Con el nivel de objeto, una pieza caída le gana en stat a una pieza del set entre la
partida 4 y la 6 (antes, entre la 6 y la 8).

**Opciones para el dueño** (ninguna aplicada):

- **(a)** Separar aspecto de poder: el regalo da la skin, no las piezas; es la #2 de la reseña, con impacto en
  `activeSetSkinId`.
- **(b)** Regalar 2 piezas en lugar de 4: la transformación sí, el efecto de 4 no.
- **(c)** Dejarlo como está: el botín ahora lo alcanza antes.

**Otro detalle:** las piezas regaladas se venden a 200 cada una (B4), así que el regalo vale 800 de oro.

## 7. Lo que NO se hizo (y qué haría falta)

- **Condicionar sets y legendarios de la tienda a la arena desbloqueada.** Pide UI de «bloqueado hasta la arena
  N» en la tienda, que es territorio de Q1. El nivel de objeto 1 de lo comprado ya hace que el botín de arena
  alta le gane a la tienda.
- **Llegar a «un guardián cada 4-6 partidas»** (meta de la reseña). Hoy sale uno cada ~3 partidas de crucero.
  El oro de pelear (~550 por partida) no es de Q4. Para llegar haría falta bajar el oro de las bajas o subir el
  precio del guardián, y lo segundo es decisión del dueño.
- **La fila «Dificultad» de la victoria muestra la etiqueta de botín** (B6). Ahora las etiquetas siguen el
  orden de la campaña, pero la fila está en `end-screens.js` (Q1).
- **Marca ▲ de mejora en el ícono del inventario y en el haz del piso, y «vender o reciclar todo lo gris».**
  Son UI de inventario (Q1).
- **No se puede vender lo regalado** (B4): queda para la decisión del §6.

## 8. Cómo reproducirlo

```
node tools/balance/q4_econ.js [árbol=repo] [N]              # JSON con todo lo de arriba
git archive 91e6ba9 | tar -x -C /tmp/antes && node tools/balance/q4_econ.js /tmp/antes 600   # antes
SE_BASE_URL=http://127.0.0.1:8904 node tools/items/t_q4_economia.js                        # prueba (23 PASS)
```
