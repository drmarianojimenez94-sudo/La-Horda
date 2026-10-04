# Alfa · Q4: botín, economía y progresión

Qué se cambió, por qué y con qué números. Todo se midió **antes y después** con el código real del juego
(`tools/balance/q4_econ.js`): un Monte Carlo en Chromium con 300 partidas por arena, sobre los 12 guardianes
del lanzamiento.

- **Antes:** `main` en `ff9054d`.
- **Después:** la base integrada del alfa, que es `main` más los 7 equipos.

En la base vieja (`91e6ba9`) los resultados fueron prácticamente los mismos (±0,1 objetos por partida).

Los cambios son **conservadores**:

- no se rediseñó ningún sistema;
- no se sacó nada de la tienda;
- no se tocó el regalo inicial;
- los guardados viejos siguen iguales.

## 1. Qué cambió

| # | Cambio | Dónde | Guardados viejos |
|---|---|---|---|
| 1 | **Nivel de objeto por arena.** Lo que cae nace con `it.ilvl` igual al número de la arena de la campaña (1 a 10; la Divina cuenta como 10). Cada nivel suma +5 % a **todos** los números del objeto: el stat garantizado, las pasivas y los afijos. En la arena 10 vale ×1,45. Es un eje **aparte** del nivel de Gemas: no cambia el costo de mejorar | `js/data/item-identity.js` (`ITEM_ILVL_*`), `js/systems/items.js` (`itemIlvl`, `itemLevelMult`), `js/systems/loot.js` (`lootItemLevelFor`, `materializeLoot`) | Sin campo = nivel 1: nada cambia. Se recorta a 1-10 al leer, así que un objeto que llega por intercambio no se puede inflar |
| 2 | **Se ve en la ficha y en el inventario.** La ficha dice «Arena 7 · +30 %» y la tarjeta, «Arena 7». La comparación ▲▼ ya lo refleja | `js/ui/item-preview.js`, `js/ui/inventory-ui.js` (un renglón cada uno) | — |
| 3 | **Pisos de rareza.** El primer objeto de cada fuente tiene un mínimo: élite con nombre y subjefe, Raro; jefe, Muy Raro; cofre de victoria, Raro. Lo que iba a salir por debajo **sube al piso**: la probabilidad de Legendario o más **no cambia** | `js/data/ground-loot.js` (`floor`), `js/data/loot.js` (`LOOT_VICTORY_FLOOR`), `lootApplyFloor` | — |
| 4 | **Mejora segura en la primera victoria de la campaña.** El primer objeto del cofre es un **Muy Raro** para una ranura **vacía** del guardián; si no tiene ninguna vacía, para la más floja. Una sola vez por cuenta (`save.firstWinLoot`). Las cuentas que ya ganaron no lo reciben (queda `"previa"`) y una derrota no lo gasta | `js/systems/loot.js` (`firstWinLootDue`, `firstWinLootSpec`) | Sí, marcado sin regalo |
| 5 | **Tablas de botín y Gemas en el orden de la campaña** (bug B1). Antes, la arena 3 pagaba como la 1, la 6 menos que la 2 y la 8 menos que la 7. Ahora cada arena paga un poco más que la anterior. El Abismo (8) tiene fila propia | `js/data/loot.js` (`ARENA_LOOT`, `ARENA_LOOT_LABEL`), `GEMS_PER_VICTORY` | — |
| 6 | **Reciclado automático** (arreglo del crítico, verificado). Nunca recicla lo comprado (`it.bought`) ni lo pasado por la Mística (`it.rerolls > 0`) | `js/systems/ground-loot.js` (`recyclable`) | — |
| 7 | **Menos oro de retención.** Los logros pagan la mitad y los desafíos, ×0,55; también los textos nuevos de `main`. En el pase, 5 niveles pasaron de oro a **Gemas** (20 en total) y el resto paga la mitad | `js/data/quests.js`; `js/systems/quests.js` (recompensa `gems`); `js/ui/quests-ui.js` (ícono) | Los desafíos ya sorteados conservan su premio hasta rotar |
| 8 | **Cofre de desafío con el inventario lleno:** paga el valor de venta, no 150 fijos (bug B3) | `js/systems/quests.js` (`questsOpenChest`) | — |
| 9 | **Tienda completa** (guardianes, todos los objetos, todos los sets y las skins). Suben los legendarios con nombre (3.000 → 4.000), los de guardián (1.500 → 1.800), el Muy Raro básico (900 → 1.100) y el Legendario básico (2.500 → 3.200). **La pieza de set (las skins) y los guardianes cuestan lo mismo.** Lo comprado nace con nivel de objeto 1. Los precios siguen pudiéndose configurar desde el servidor, como en `main` | `js/systems/shop.js` (`SHOP_PRICES`) | — |
| 10 | Conservan el nivel de objeto: la fusión (el mayor) y la reforja de set (el menor) | `js/systems/items.js`, `js/systems/loot.js` | — |

**No se tocó:**

- el regalo inicial (§6);
- el oro de pelear;
- el precio de los guardianes;
- la cantidad de objetos que caen.

Al fusionar `main` se respetaron sus decisiones nuevas: las skins son solo cosméticas (`skinCosmeticEquip`), los
sets de evento caen desde el jefe y los precios se pueden configurar.

## 2. Qué cae por arena (por partida)

Supuestos de la reseña (§2.2), iguales antes y después:

- **Bajas por partida:** 500 comunes, 15 sub-élites, 3 élites, 2 élites con nombre, 2 subjefes y 1 jefe.
- **Cofre:** calificación A.
- **Perfil:** uno que ya había ganado antes, así que sin el regalo de primera victoria.

| Arena | Objetos | % Común | Muy Raro o más | Legendario o más | Partidas con al menos un Muy Raro | Arma Muy Raro (stat medio) |
|---|---|---|---|---|---|---|
| 1 Ciudad | 12,6 → 12,7 | 67 → **38** | 0,93 → **1,80** | 0,07 → 0,07 | 61 % → **100 %** | 35 % → 35 % |
| 2 Fortaleza | 12,6 → 12,5 | 48 → 31 | 2,05 → 2,35 | 0,23 → 0,13 | 88 % → 100 % | 35 % → 37 % |
| 3 Bosque | 12,8 → 12,5 | 66 → **27** | 1,10 → **2,89** | 0,33 → 0,39 | 67 % → 100 % | 36 % → 39 % |
| 4 Micelial | 12,9 → 12,9 | 43 → 25 | 2,34 → 3,28 | 0,41 → 0,54 | 93 % → 100 % | 35 % → 40 % |
| 5 Gélida | 12,9 → 12,6 | 41 → 23 | 2,57 → 3,32 | 0,50 → 0,47 | 93 % → 100 % | 35 % → 42 % |
| 6 Acuática | 12,9 → 13,0 | 53 → 21 | 1,81 → 4,11 | 0,41 → 0,58 | 86 % → 100 % | 35 % → 44 % |
| 7 Laberinto | 12,9 → 13,1 | 30 → 18 | 4,12 → 4,81 | 0,66 → 0,71 | 100 % → 100 % | 35 % → 46 % |
| 8 Abismo | 12,9 → 12,9 | 35 → 16 | 3,35 → 5,07 | 0,55 → 0,74 | 98 % → 100 % | 35 % → 47 % |
| 9 Minas | 13,0 → 13,1 | 25 → 14 | 4,83 → 5,40 | 0,73 → 0,85 | 100 % → 100 % | 35 % → 49 % |
| 10 Infernal | 13,1 → 13,0 | 18 → 11 | 5,75 → 6,30 | 1,00 → 1,05 | 100 % → 100 % | 35 % → **51 %** |

**Qué se lee:**

- **No llueve más.** Se tira la misma cantidad de objetos y el Legendario sigue igual de raro. En la Fortaleza
  bajó un poco por el reorden: pagaba como la arena 5.
- **Cae menos basura.** En la Ciudad, los Comunes pasan del 67 % al 38 % y el Muy Raro por partida se duplica.
- **La curva ya no tiene pozos:** el Bosque (3) y la Acuática (6) dejaron de pagar como arenas anteriores.
- **Farmear arriba tiene sentido.** Antes, el arma Muy Raro valía +35 % de daño en cualquier arena. Ahora vale
  +35 % en la 1 y +51 % en la 10.

**Ciudad, por fuente** (% de Raro o mejor):

| Fuente | Antes | Después |
|---|---|---|
| Élite con nombre | ~34 % | **78 %** |
| Subjefe | ~33 % | 79 % |
| Jefe | ~37 % | 62 % (el primero de cada jefe: Muy Raro o más) |
| Cofre | ~33 % | 69 % |
| Horda común | 28 % | 28 % (sin cambios) |

## 3. Primeras mejoras (perfil nuevo)

Supuestos:

- una victoria por partida en el orden de la campaña;
- el jugador equipa lo que sube el stat de la ranura o llena una vacía;
- nunca rompe el set regalado.

| Guardián (set de regalo) | Muy Raro que mejora en la partida 1 | Primera vez que algo le gana en stat a una pieza del set |
|---|---|---|
| Sin set (los 12) | 45-68 % → **100 %** | — |
| Tanque (Baluarte) | 25 % → **100 %** | partida 8 → **4** |
| Guerrero (Nocturno) | 18 % → 100 % | 6 → 6 |
| Mago (Convergencia) | 33 % → 100 % | 6 → **4** |
| Soporte (Custodio) | 25 % → 100 % | 7 → **4** |
| Segador (Marea) | 28 % → 100 % | 9 → 5 |
| Axiom (Sistema) | 20 % → 100 % | 6 → 5 |
| Profeta (Profecía) | 33 % → 100 % | 7 → 5 |
| Musashi (Errante) | 8 % → 100 % | 7 → 5 |
| Cazadora (Manada) | 23 % → 100 % | 7 → 5 |
| Nigromante (Réquiem) | 13 % → 100 % | 6 → 4 |
| Libertador (Granadero) | 15 % → 100 % | 7 → 5 |
| Eren (Legión) | 3 % → 100 % | 9 → 5 |

## 4. Oro por partida y por fuente

**Primera partida.** Es una partida sintética con el sistema real de logros, desafíos y pase: Ciudad ganada con
A en 7:11, 520 bajas, 25 civiles, sin caer y 2 subjefes. El oro de pelear es el que midió la reseña (658).

| Fuente | Antes | Después |
|---|---|---|
| Peleando | 658 | 658 |
| Logros | 1.390 | 710 |
| Desafíos | 220 | 120 |
| Pase | 550 | 150 + 2 Gemas |
| **Total** | **2.818** | **1.638** |
| Parte que sale de pelear | 23 % | **40 %** |

**Crucero.** Es un jugador sostenido, ya sin logros fáciles: 4 partidas por día y 20 por semana. Con 603 de XP
de cuenta por partida, el pase se termina en ~22 partidas.

| Fuente | Antes | Después |
|---|---|---|
| Peleando | ~550 | ~550 |
| Desafíos diarios | 167 | 92 |
| Desafíos semanales | 166 | 91 |
| Pase | 346 | 102 (+20 Gemas en todo el pase) |
| **Total por partida** | **~1.230** | **~835** (−32 %) |

## 5. Cuánto tarda comprar cada cosa (partidas desde cero)

| Compra | Precio (antes → después) | Antes | Después |
|---|---|---|---|
| Guardián | 2.500 | 0,9 | **2,0** |
| Legendario con nombre | 3.000 → 4.000 | 1,2 | **3,8** |
| Pieza de set | 1.200 | 0,4 | 0,7 |
| Skin de set (4 piezas) | 4.800 | 2,6 | 4,8 |
| Muy Raro básico | 900 → 1.100 | 0,3 | 0,7 |
| Legendario básico | 2.500 → 3.200 | 0,9 | 2,9 |

Oro acumulado después de 3 partidas: ~5.270 → ~3.310.

## 6. Regalo inicial: números para que decida el dueño (no se tocó)

En la base integrada, **los 12 guardianes** tienen skin de set para el regalo; `main` sumó las de Tanque,
Nigromante y Libertador. Elegirla regala las **4 piezas** del set al inventario. Desde `main` la skin es solo
aspecto y **no se equipa sola**, pero las piezas quedan para ponérselas.

La tabla compara, sobre el guardián sin nada, el set regalado puesto (nivel de objeto 1) con el mejor botín
**sin set** después de ganar las arenas 1-3:

| Guardián | Set regalado (daño / vida) | Botín de 3 arenas, antes | Botín de 3 arenas, después |
|---|---|---|---|
| Tanque | +0 % / +87 % | +24 % / +63 % | +38 % / +74 % |
| Guerrero | +49 % / +0 % | +31 % / +57 % | +39 % / +64 % |
| Mago | +53 % / +64 % | +33 % / +59 % | +38 % / +72 % |
| Soporte | +52 % / +59 % | +26 % / +61 % | +38 % / +68 % |
| Segador | +49 % / +68 % | +26 % / +59 % | +39 % / +73 % |
| Axiom | +53 % / +0 % | +31 % / +54 % | +41 % / +67 % |
| Profeta | +0 % / +61 % | +28 % / +64 % | +38 % / +72 % |
| Musashi | +51 % / +0 % | +32 % / +53 % | +39 % / +62 % |
| Cazadora | +54 % / +0 % | +32 % / +51 % | +39 % / +67 % |
| Nigromante | +50 % / +60 % | +31 % / +59 % | +39 % / +68 % |
| Libertador | +48 % / +59 % | +34 % / +59 % | +40 % / +69 % |
| Eren | +55 % / +70 % | +33 % / +55 % | +40 % / +71 % |

**Qué no entra en la tabla, y pesa:** los bonos del set, que son la transformación de una habilidad con 2 piezas,
un bono con 3 y el efecto completo con 4.

- **En números crudos**, el botín de 3 arenas ya iguala o supera al set en vida, porque llena 6 ranuras contra
  4, y queda a ~10-15 puntos en daño.
- **Algo que caiga le gana en stat a una pieza del set** entre la partida 4 y la 6. Antes, entre la 6 y la 9.

**Opciones para el dueño** (ninguna aplicada):

- **(a)** Regalar solo el aspecto, sin las piezas. Con la skin cosmética de `main`, es un cambio chico en
  `_giftSkin`.
- **(b)** Regalar 2 piezas: la transformación sí, el efecto de 4 no.
- **(c)** Dejarlo como está.

**Otro detalle:** las piezas regaladas se venden a 200 cada una (B4).

## 7. Lo que NO se hizo

- **Condicionar sets y legendarios de la tienda a la arena desbloqueada.** Pide UI de Q1 en la tienda. Lo
  cubre en parte que lo comprado vale como arena 1.
- **«Un guardián cada 4-6 partidas».** Hoy sale cada ~3 de crucero. El oro de pelear no es de Q4 y el precio
  del guardián lo decide el dueño.
- **Fila «Dificultad» de la victoria (B6), marca ▲ en el inventario y «reciclar todo lo gris».** Son UI de Q1.

## 8. Cómo reproducirlo

```
node tools/balance/q4_econ.js [árbol=repo] [N]       # JSON con todo lo de arriba (Q4_CHAMPS=a,b,c para otros guardianes)
# antes: extraer otro commit a una carpeta y pasarla como árbol
SE_BASE_URL=http://127.0.0.1:8904 node tools/items/t_q4_economia.js   # prueba (23 PASS)
```
