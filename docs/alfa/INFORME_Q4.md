# Informe Q4: botín, economía y progresión (alfa)

Este informe es para leer sin saber programar. El detalle técnico está al final, en la §7, y todos los números
están en [`q4_economia.md`](q4_economia.md).

## 1. Qué cambia para el jugador

| Antes | Ahora |
|---|---|
| En la primera partida caían 12 objetos: casi todos blancos (Comunes) y todos peores que lo que ya tenías | Cae lo mismo, pero ya no tanta basura: en la Ciudad los Comunes bajan del 67 % al 39 % y el amarillo (Muy Raro) por partida se duplica |
| Una **élite con nombre**, con el doble de vida, podía tirar un objeto blanco, igual que un esqueleto | Su primer objeto es, como mínimo, **Raro** (azul). El subjefe también; el **jefe**, como mínimo, **Muy Raro**; el cofre de victoria, como mínimo, Raro. Los Legendarios **no** se vuelven más comunes |
| Al ganar la primera arena podía no haber nada que te sirviera | La **primera victoria** de la cuenta trae un **Muy Raro para una ranura vacía** de tu guardián (el arma, si no tenés nada puesto): una mejora que se ve en la comparación ▲. Pasa una sola vez y las cuentas que ya habían ganado no lo reciben |
| Un objeto de la arena 10 valía lo mismo que el de la arena 1 | Cada objeto recuerda en qué arena cayó y vale **+5 % por arena** (en la arena 10, ×1,45). La ficha muestra «Arena 7 · +30 %» y la comparación ▲▼ lo refleja. Los objetos viejos, los de la tienda y los regalados valen como arena 1. **No se perdió ni cambió nada de lo guardado** |
| La arena 3 (Bosque) pagaba como la 1, la 6 menos que la 2 y la 8 menos que la 7: las tablas estaban en el orden viejo | Cada arena paga un poco más que la anterior, en botín y en Gemas |
| Con el inventario lleno, el juego podía **reciclar solo un objeto que compraste con oro** o que mejoraste en la Mística | Lo pagado con oro nunca se recicla solo |
| La primera partida daba ~3.000 de oro y solo el 22 % salía de pelear. Con eso se compraban dos Legendarios después de la tercera partida | Logros y desafíos pagan la **mitad**, y parte del pase paga **Gemas** (sirven para mejorar objetos). La primera partida da ~1.770 de oro y el 37 % sale de pelear. Un Legendario de la tienda pasa de ~1 partida de oro a ~3,7 |
| El cofre de desafío con el inventario lleno pagaba 150 de oro por objeto: convenía jugar con el inventario lleno | Paga lo que vale vender ese objeto |
| La tienda vendía todo y el botín no le podía ganar | La tienda **sigue completa**: guardianes, todos los objetos, todos los sets y las skins. Subieron solo los legendarios y los básicos más altos; **las skins y los guardianes cuestan lo mismo**. Lo comprado vale como arena 1, así que lo que cae en arenas altas le gana |

## 2. Para que decida el dueño: el regalo inicial (no lo toqué)

A 9 de 12 guardianes el regalo les ofrece su skin de set con las 4 piezas. **En la versión nueva de main la skin
ya es solo aspecto** y no se equipa sola, pero las 4 piezas se siguen regalando en el inventario.

| | Daño | Vida |
|---|---|---|
| Set regalado puesto (nivel 1) | **+45 a +54 %** | **+59 a +70 %** (o +0 %, según el set) |
| Mejor botín sin set tras ganar las arenas 1 a 3, antes | +24 a +34 % | +53 a +59 % |
| Mejor botín sin set tras ganar las arenas 1 a 3, ahora | **+37 a +40 %** | **+60 a +73 %** |

- **En números crudos**, el botín ahora alcanza al set en vida en la arena 3 y queda a ~10 puntos en daño.
- **Lo que el botín no iguala** son los bonos del set: la transformación de una habilidad con 2 piezas y el
  efecto de 4.
- **Algo que caiga le gana a una pieza del set** entre la partida 4 y la 6. Antes, entre la 6 y la 8.

Opciones:

- **(a)** Regalar solo el aspecto, sin las piezas.
- **(b)** Regalar 2 piezas en lugar de 4.
- **(c)** Dejarlo como está.

Además, las piezas regaladas se pueden vender a 200 cada una.

## 3. Lo que quedó pendiente, y por qué

- **Bloquear sets y legendarios de la tienda hasta haber llegado a su arena.** Necesita pantallas nuevas en la
  tienda, que son de otro equipo (Q1). Lo cubre en parte el nivel de objeto: lo comprado vale como arena 1.
- **Un guardián cada 4-6 partidas, como pidió el crítico.** Hoy sale uno cada ~3. El oro que se gana peleando
  no es de mi área, y subir el precio del guardián es decisión del dueño.
- **Botón «reciclar todo lo gris» y marca ▲ en el ícono del inventario.** Son pantallas de Q1.
- **La fila «Dificultad» de la pantalla de victoria muestra la etiqueta del botín.** La pantalla es de Q1; las
  etiquetas, al menos, ya siguen el orden de la campaña.

## 4. Pruebas

- **Prueba nueva `tools/items/t_q4_economia.js`:** 23 de 23 PASS, sobre la base vieja y sobre main fusionado.
  Cubre:
  - nivel de objeto, recorte contra trampas por intercambio, ficha y comparación;
  - pisos de rareza;
  - primera victoria;
  - orden de las tablas;
  - reciclado;
  - Gemas del pase y cofre lleno;
  - que la tienda siga completa.
- **Pruebas existentes sobre la base vieja: todas en verde.**

  | Prueba | PASS |
  |---|---|
  | t_ground_loot | 44 |
  | t_items | 60 |
  | t_itemization | 28 |
  | t_quests | 32 |
  | t_build_uniques | 36 |
  | t_sets | 48 |
  | t_starter_gift | 31 |
  | t_difficulty | 57 |
  | t_camp | 31 |
  | t_endless | 29 (una falla suelta de mutadores que pasa al repetirla sola) |

- **Sobre la base integrada:** se están corriendo. El resultado está en la §6, al final.
- **Simulación antes y después** con `tools/balance/q4_econ.js`, sobre las funciones reales del juego y 600
  partidas por arena: [`q4_economia.md`](q4_economia.md).

## 5. Nota del área para el alfa: 7/10

- **Lo que mejoró:** el botín de los primeros 20 minutos ya emociona (un amarillo garantizado al ganar la
  primera arena, élites que no tiran basura), farmear arenas altas tiene sentido y el oro dejó de comprar todo.
- **Lo que falta:** el regalo de set sigue dominando las primeras 3 arenas (§2), la tienda sigue vendiendo la
  persecución (más cara, pero se puede comprar) y el inventario sigue siendo incómodo en el teléfono (Q1).

## 6. Pruebas sobre la base integrada

(se completa al terminar la corrida)

## 7. Detalle técnico

- **Nivel de objeto:**
  - `it.ilvl` = `campaignNumber(arena)` (Divina = 10), asignado en `materializeLoot`;
  - `itemLevelMult` = Gemas × (1 + 0,05 × (ilvl − 1));
  - `itemIlvl` recorta a 1-10;
  - constantes `ITEM_ILVL_MAX` e `ITEM_ILVL_STEP` en `js/data/item-identity.js`;
  - la fusión y la reforja conservan el ilvl.
- **Pisos:**
  - `lootApplyFloor` pasa el peso de las categorías inferiores a la del piso, sin cambiar las superiores;
  - `GROUND_LOOT_CFG.floor` y `LOOT_VICTORY_FLOOR`;
  - el piso viaja al invitado como 9.º argumento de `groundLootDrop`, después de `eventSetId`, el de main.
- **Primera victoria:** `firstWinLootDue` y `firstWinLootSpec` (`js/systems/loot.js`); bandera `save.firstWinLoot`.
- **Tablas:** `ARENA_LOOT` y `GEMS_PER_VICTORY` en `CAMPAIGN_ORDER`, con fila propia para el Abismo.
- **Reciclado:** `recyclable()` excluye `bought` y `rerolls > 0`.
- **Retención:**
  - logros ×0,5 y desafíos ×0,55, incluidos los textos nuevos de main;
  - el pase da `gems` en los niveles 3, 9, 14, 22 y 27;
  - `questsGrant` y `questsRewardText` soportan `gems`;
  - el pase muestra el ícono de cristal;
  - el cofre con el inventario lleno paga `sellValueOf`.
- **Tienda:** en `SHOP_PRICES` subieron legendario a 4.000, campeón a 1.800, básico Muy Raro a 1.100 y básico
  Legendario a 3.200. Set y guardianes quedan igual. Al fusionar main se respetó la decisión del dueño: las
  skins son cosméticas (`skinCosmeticEquip`) y los precios se pueden configurar desde el servidor.

**Commits:**

- `da4340e` Botín y economía del alfa
- `386980f` Pruebas y simulador
- `14d3bbc` Números antes y después
- `9c8379c` Merge de main
- `6255c75` Tolerancia a la carga
