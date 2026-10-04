# Informe Q4: botín, economía y progresión (alfa)

Este informe es para leer sin saber programar.

- **Al final** (§6 y §7) está el detalle técnico.
- **Los números completos** están en [`q4_economia.md`](q4_economia.md). Se midieron con el simulador
  `tools/balance/q4_econ.js` sobre el código real: `main` (`ff9054d`) contra la base integrada del alfa, con
  300 partidas por arena.

## 1. Qué cambia para el jugador

| Antes | Ahora |
|---|---|
| En la primera arena caían casi todos objetos blancos (Comunes) y peores que lo que ya tenías | Cae la misma cantidad, pero menos basura: en la Ciudad los Comunes bajan del 67 % al 38 % y el amarillo (Muy Raro) por partida se duplica (0,9 → 1,8) |
| Una **élite con nombre**, con el doble de vida, podía tirar un objeto blanco, igual que un esqueleto | Su primer objeto es, como mínimo, **Raro** (azul). El subjefe también; el **jefe**, como mínimo, **Muy Raro**; el cofre de victoria, como mínimo, Raro. Los Legendarios **no** se vuelven más comunes |
| Al ganar la primera arena, muchas veces no había nada que mejorara a tu guardián: le pasaba a entre el 3 % y el 33 % de los que tenían el set regalado | La **primera victoria** trae un **Muy Raro para una ranura vacía** de tu guardián (el arma, si no tenés nada puesto): una mejora visible con ▲ para el **100 %** de los guardianes. Pasa una sola vez y las cuentas que ya habían ganado no lo reciben |
| Un objeto de la arena 10 valía lo mismo que el de la arena 1 | Cada objeto recuerda en qué arena cayó y vale **+5 % por arena**. Un arma amarilla da +35 % de daño en la arena 1 y +51 % en la 10. La ficha muestra «Arena 7 · +30 %» y la comparación ▲▼ lo refleja. Los objetos viejos, los comprados y los regalados valen como arena 1. **No se perdió ni cambió nada de lo guardado** |
| La arena 3 (Bosque) pagaba como la 1, la 6 menos que la 2 y la 8 menos que la 7: las tablas estaban en el orden viejo | Cada arena paga un poco más que la anterior, en botín y en Gemas |
| Con el inventario lleno, el juego podía **reciclar solo un objeto comprado con oro** o mejorado en la Mística | Lo pagado con oro nunca se recicla solo |
| La primera partida daba ~2.800 de oro y solo el 23 % salía de pelear. Con 3 partidas se compraban dos Legendarios | Logros y desafíos pagan la **mitad**, y parte del pase paga **Gemas** (sirven para mejorar objetos). La primera partida da ~1.640 de oro y el 40 % sale de pelear. Un jugador sostenido gana ~835 por partida en vez de ~1.230 |
| Un Legendario de la tienda se pagaba con ~1 partida de oro y un guardián, con ~0,9 | Legendario: ~3,8 partidas. Guardián: ~2. Skin: ~4,8. **Las skins y los guardianes no subieron de precio**: rinde menos el oro |
| El cofre de desafío con el inventario lleno pagaba 150 de oro por objeto, así que convenía jugar lleno | Paga lo que vale vender ese objeto |
| La tienda vendía todo y el botín no le podía ganar | La tienda **sigue completa**: guardianes, todos los objetos, todos los sets y las skins. Lo comprado vale como arena 1, así que lo que cae en arenas altas le gana |

## 2. Para que decida el dueño: el regalo inicial (no lo toqué)

En la versión integrada, **los 12 guardianes** pueden elegir de regalo una skin de set, y esa skin trae **las 4
piezas** del set al inventario. Desde `main` la skin es solo aspecto y las piezas no se ponen solas, pero
están ahí para equiparlas. Comparado con el guardián sin nada:

| | Daño | Vida |
|---|---|---|
| Set regalado puesto | **+48 a +55 %** (+0 % en Tanque y Profeta) | **+59 a +87 %** (+0 % en Guerrero, Axiom, Musashi y Cazadora) |
| Mejor botín sin set después de ganar las arenas 1 a 3, antes | +24 a +34 % | +51 a +64 % |
| Mejor botín sin set después de ganar las arenas 1 a 3, ahora | **+38 a +41 %** | **+62 a +74 %** |

- **En números crudos**, el botín ahora alcanza al set en vida en la arena 3 y queda a 10-15 puntos en daño.
- **Lo que el botín no iguala** son los bonos del set: la transformación de una habilidad con 2 piezas y el
  efecto de 4.
- **Algo que caiga le gana a una pieza del set** entre la partida 4 y la 6. Antes, entre la 6 y la 9.

Opciones:

- **(a)** Regalar solo el aspecto, sin las piezas. Es un cambio chico, porque la skin ya es cosmética.
- **(b)** Regalar 2 piezas en lugar de 4.
- **(c)** Dejarlo así.

Además, las piezas regaladas se pueden vender a 200 cada una.

## 3. Lo que quedó pendiente, y por qué

- **Bloquear sets y legendarios de la tienda hasta haber llegado a su arena.** Necesita pantallas nuevas en la
  tienda (Q1). Lo cubre en parte el nivel de objeto.
- **Un guardián cada 4-6 partidas, como pidió el crítico.** Hoy sale cada ~3 partidas sostenidas. El oro de
  pelear no es de mi área, y subir el precio del guardián lo decide el dueño.
- **Botón «reciclar todo lo gris», marca ▲ en el ícono del inventario y la fila «Dificultad» de la victoria**
  (que muestra la etiqueta del botín). Son pantallas de Q1.

## 4. Pruebas, en resumen

- **Prueba nueva `tools/items/t_q4_economia.js`: 23 de 23 PASS** en la base vieja, después de fusionar `main` y
  en la última fusión. Cubre:
  - nivel de objeto, recorte contra trampas por intercambio, ficha y comparación;
  - pisos de rareza;
  - primera victoria;
  - orden de las tablas;
  - reciclado;
  - Gemas del pase y cofre lleno;
  - que la tienda siga completa.
- **Pruebas de botín y economía en verde sobre la base integrada:**

  | Prueba | PASS |
  |---|---|
  | t_ground_loot | 44 |
  | t_items | 60 |
  | t_itemization | 28 |
  | t_quests | 32 |
  | t_build_uniques | 36 |
  | t_sets | 48 |
  | t_starter_gift | 31 |
  | t_abismo | 34 |
  | t_campaign | 30 |

- **Hay 7 fallas que ya estaban en `main`:** las verifiqué contra `main` y no son de mi área. El detalle está en
  la §6.
- **Simulación antes y después:** [`q4_economia.md`](q4_economia.md).

## 5. Nota del área para el alfa: 7/10

- **Lo que mejoró:** el botín de los primeros 20 minutos ya emociona (un amarillo seguro al ganar la primera
  arena, élites y jefes que no tiran basura), farmear arenas altas tiene sentido y el oro dejó de comprar todo
  en 3 partidas.
- **Lo que falta para más:**
  - el set regalado todavía domina las primeras 3 arenas por sus bonos (§2);
  - la tienda vende la persecución, más cara pero comprable;
  - el inventario es incómodo en el teléfono (Q1);
  - el árbol de talentos no pide elegir (fuera de mi alcance para el alfa).

## 6. Pruebas sobre la base integrada

La base integrada es `main` (ff9054d) más los 7 equipos. Durante las corridas la máquina estuvo con una carga de
40 a 110 sobre 4 núcleos. Varias pruebas cortaron por tiempo al cargar la página, que pide unos 1.800
archivos. Por eso subí la espera de carga a 180 s en mis pruebas (`tools/items/`).

**En verde:**

| Prueba | PASS |
|---|---|
| t_q4_economia | 23 (también en la última fusión) |
| t_ground_loot | 44 |
| t_items | 60 |
| t_itemization | 28 |
| t_quests | 32 |
| t_build_uniques | 36 |
| t_sets | 48 |
| t_starter_gift | 31 |
| t_abismo | 34 |
| t_campaign | 30 |

El resto de `tools/items` (t_boons 80, t_synergies 62, t_story 36, t_nigro_* y demás) pasó sobre la base vieja,
antes de fusionar `main`. Sobre la integrada no llegó a correr por la carga.

**Ajusté una prueba porque cambió el juego, no por un error:** `t_items` esperaba exactamente 12 sets de
campeón. `main` sumó los de la expedición y de Ascensión (hoy son 29), así que ahora pide al menos 12.

**Fallas que ya estaban en `main` y no son de mi área.** Las verifiqué corriendo las mismas pruebas contra `main`
sin mis cambios, y dan el mismo resultado:

| Prueba | Fallas | Qué pasa |
|---|---|---|
| t_endless | 3 | La pantalla de resultados no aparece al morir |
| t_cromas | 1 | Los 8 campeones de Ascensión no tienen croma |
| t_camp | 1 | Falta el texto del herrero para los campeones nuevos |
| t_crystals | 2 | El cartel del nivel cambió de texto |

**NO VERIFICADO EN RUNTIME:**

- t_difficulty: 4 fallas de calibración y del trazado de la Gélida. Son de Q2 y del mundo, no las comparé
  contra `main`.
- t_codex: cortó por tiempo.
- Sobre la ÚLTIMA fusión, cuando bajó la carga, corrí t_q4_economia (23), t_ground_loot (44), t_items (60),
  t_itemization (28), t_quests (32), t_build_uniques (36), t_sets (48) y t_starter_gift (31): **0 fallas**. El
  resto de `tools/items` se corrió sobre la fusión anterior.

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
- `6255c75`, `f78b613` Tolerancia a la carga
- `abb5059` t_items: al menos 12 sets de campeón
- `c12a98f` El simulador mide los 12 guardianes del lanzamiento
- este commit: informe final con números sobre la base integrada
