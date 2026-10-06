# Precios de La Horda: oro y Brasas ✦

Una sola fuente por moneda, que cliente y servidor ejecutan (no copian):

| Moneda | Fuente de verdad | Quién decide | Prueba de que coinciden |
|---|---|---|---|
| Brasas ✦ y oro de apariencias/campeones base | `js/data/pricing.js` (`PRICING`) | **Servidor** (`server/wallet.js` ejecuta este mismo archivo en un contexto aislado) | `tools/collection/pricing-sync.js` (62 apariencias, colecciones por campeón, oro de campeones, Pack de bienvenida) |
| Dólares de los packs de Brasas | `server/premium-packs.json` (precios **sugeridos**; el dueño confirma en su proveedor) | Servidor | `server/test-wallet.js`, `tools/collection/brasas-store.js` |
| Oro de equipo, sets, talentos, Mística | `js/systems/shop.js` (`SHOP_PRICES`), `talents.js`, `affixes.js` | Cliente (el guardado de oro es del cliente; ver riesgos) | `tools/collection/shop-pricing-browser.js` |

Regla de oro: **el cliente PIDE; el servidor DECIDE.** El cliente manda el precio que vio (`expectedPrice`); si no coincide con el del servidor, 409 `PRICE_CHANGED` y no se cobra. Toda operación lleva una referencia única (idempotente) y deja un asiento en el libro mayor de la billetera.

Los cobros con dinero real siguen **desactivados** ("Muy pronto") hasta que el dueño conecte un proveedor. No hay claves ni secretos en el repositorio; los tests simulan el webhook firmado.

## 1. Política

1. **Campeones: siempre se compran con oro.** Brasas no compran campeones. La única forma de recibir campeones "sin oro" es el regalo del Pack de bienvenida (3 elecciones, ver §4), que es un regalo del servidor, no una compra con Brasas.
2. **Ascensión**: oro propio por campeón según lo difícil que es ganarlo; **conservan su vía de logros** (`js/systems/ascension-unlocks.js`). **Fundadores**: sin cambios (solo se conceden, `showcasePrice` 9999 es de vitrina, nunca se cobra).
3. **Brasas ✦ compran apariencia** (skins de colección, skins con diseño propio, cromas, colecciones) y nada más. Jamás poder: ni estadísticas, ni equipo, ni talentos, ni ventajas competitivas. Comprar una skin no entrega las piezas del set (probado: *skin purchase is appearance only*).
4. **Oro compra** campeones, equipo, sets, talentos (reinicio), Mística (re-tirada) y utilidades de progreso. Lo que se gana jugando se gasta en jugar.
5. Sin cajas sorpresa, sin probabilidades ocultas, sin temporizadores falsos, sin precio "tachado" inflado. Las ofertas del día rotan a la medianoche y el descuento se calcula sobre el precio real. Cada colección muestra el precio suelto real de las piezas que faltan y el ahorro exacto.
6. Menores: no hay compras de un toque ni cargos automáticos. Toda compra de apariencia pide confirmación con el precio; toda compra de dinero real pasa por la página del proveedor.

## 2. Tabla completa: cosa → moneda → precio → por qué

Tiempo de obtención con oro: **crucero ≈ 835 de oro por partida** (jugador sostenido, 4 partidas por día; `docs/alfa/q4_economia.md` §4, medido con el sistema real de logros, desafíos y pase). La primera partida rinde ~1.638 en total (mismo documento). "Casual" = **1 partida por día con el mismo oro por partida: es un escenario supuesto, no medido.** Partidas = precio ÷ 835.

| Cosa | Moneda | Precio | Partidas (crucero) | Días: crucero / casual | Por qué |
|---|---|---|---|---|---|
| Campeón STANDARD / Familia / Portador / Expedición | 🪙 oro | **2.500** (`PRICING.gold.champion`) | 3,0 | 0,8 / 3,0 | Meta de las primeras sesiones; el regalo inicial es uno y el segundo se gana jugando (Q4). Sin cambios. |
| Ascensión: Khepri (Horda Infinita, ronda 10) | 🪙 oro | **8.000** | 9,6 | 2,4 / 9,6 | El logro más corto de la lista. |
| Ascensión: Bront (3 victorias cooperativas) | 🪙 oro | **9.000** | 10,8 | 2,7 / 10,8 | Requiere compañía; precio base histórico. |
| Ascensión: Velmira (derribar el castillo de la Arena Divina) | 🪙 oro | **10.000** | 12,0 | 3,0 / 12,0 | Exige abrir la Arena Divina antes. |
| Ascensión: Aurelia (ganar la campaña) | 🪙 oro | **12.000** | 14,4 | 3,6 / 14,4 | La meta más larga y la más cinematográfica. |
| Ascensión: Saelis (3 arenas sin caer) | 🪙 oro | **12.000** | 14,4 | 3,6 / 14,4 | Habilidad pura: conviene que el atajo cueste. |
| Ascensión: Vhal (3 arenas en Pesadilla) | 🪙 oro | **13.000** | 15,6 | 3,9 / 15,6 | Dificultad alta sostenida. |
| Ascensión: Oriel (una arena en Infierno) | 🪙 oro | **14.000** | 16,8 | 4,2 / 16,8 | La dificultad más alta. |
| Fundadores | — | no se compran | — | — | Solo por concesión del sistema. |
| Skin de colección (skin de set) | ✦ **800** · o 🪙 9.000 | `brasas.set` / `gold.cosmetic.set` | 10,8 | 2,7 / 10,8 | Transformación del set. También se gana reuniendo el set. |
| Skin con diseño propio (independiente) | ✦ **1.200** · o 🪙 12.000 | `brasas.autor` / `gold.cosmetic.autor` | 14,4 | 3,6 / 14,4 | Arte propio, solo se compra. 23 en el catálogo. |
| Croma (otra paleta) | ✦ **300** · o 🪙 su precio propio (1.000) | `brasas.croma` | 1,2–1,8 | 0,3–0,45 / 1,2–1,8 | Recolor simple: el escalón más bajo, a propósito. 10 en el catálogo. |
| Colección de un campeón (2 apariencias o más que te falten) | ✦ suma suelta − **15 % (2 piezas) / 20 % (3 o más)** | `PRICING.collection` | — | — | Ejemplo medido: 3 apariencias de Aldric sueltas ✦ 3.200 → ✦ 2.560 (ahorro ✦ 640). Solo Brasas. |
| Pack de bienvenida | US$ 6,99 (una vez) | 500 + 200 ✦ y **3 campeones a elección** | — | — | Ver §4. |
| Equipo: arquetipo (común/raro/muy raro/legendario) | 🪙 oro | 150 / 400 / 1.100 / 3.200 | 0,2 / 0,5 / 1,3 / 3,8 | — | Q4: el poder se gana jugando. |
| Objetos de campeón / legendarios con nombre | 🪙 oro | 1.800 / 4.000 | 2,2 / 4,8 | — | Sin cambios. |
| Pieza de set | 🪙 oro | 1.200 | 1,4 | — | Sin cambios; las piezas nunca se venden por Brasas. |
| Ofertas del día | 🪙 oro | −15/20/25/30 % sobre el precio de catálogo | — | — | Rotan a la medianoche; sin contadores falsos. |
| Reinicio de talentos, Mística (re-tirada) | 🪙 oro | fórmulas en `talents.js` / `affixes.js` | — | — | Sumideros de oro: poder, nunca Brasas. |
| Míticos y Únicos | — | no se venden | — | — | Se fabrican o se ganan peleando. |

### ¿Algún cosmético también con oro? Sí: todos, a ~11× el precio en Brasas

Decisión: **todas las apariencias en venta se pueden comprar también con oro** (skin de colección 9.000, diseño propio 12.000, croma su precio de siempre). Razones: (1) es el camino del jugador gratuito, que mantiene la confianza ("todo se gana jugando"); (2) ya existía así y quitarlo sería una pérdida para quien ya ahorraba; (3) el precio en oro equivale a 11 a 14 partidas de jugador sostenido, así que no compite con la comodidad de pagar ✦ 800 y la comodidad es lo que se vende. Riesgo: canibaliza algo de ventas. Se acepta porque el oro no se acelera con dinero y porque el valor de la Brasa está en el ahorro de tiempo, las colecciones y el descuento por cantidad.

Los croma de Expedición (1.000 de oro) quedan a una relación oro/✦ de 3,3 a 1, no 11 a 1: son recolores baratos que ya estaban en venta con ese precio. Subirlos queda como decisión del dueño.

**Skins que demuestran habilidad (maestría/logros) no se venden directo.** Hoy no hay ninguna a la venta: el catálogo del servidor (`skinCatalog()`) tiene solo skins de colección (29), de diseño propio (23) y cromas (10). Si se agrega una skin de maestría, no debe entrar a `SET_SKINS`/`CROMA_SKINS` con precio: se concede por logro (mismo camino que Ascensión) y el servidor no la vende.

### Marcos, títulos, emblemas

No existen hoy en la Tienda; no se inventó nada. Cuando existan van a ✦ (apariencia) con un escalón nuevo en `PRICING.brasas`; el servidor ya rechaza lo que no está en su catálogo.

## 3. Packs de Brasas (precios sugeridos en US$; los confirma el dueño)

Valor por dólar **creciente** entre packs (anclaje: el pack más caro es la mejor tarifa; el más barato, la referencia de 100 ✦ por US$):

| Pack | Brasas (base + regalo) | US$ | ✦ por US$ | Qué alcanza (a precios de §2) |
|---|---|---|---|---|
| `brasas_500` | 500 | 4,99 | 100 | 1 croma + sobra |
| `brasas_1000` | 1.000 + 100 | 9,99 | 110 | 1 skin de colección + 1 croma |
| `brasas_2500` | 2.500 + 300 | 24,99 | 112 | 2 skins con diseño propio + 1 skin de colección |
| `brasas_5000` | 5.000 + 1.000 | 49,99 | 120 | una colección completa grande + varias sueltas |
| `brasas_10000` | 10.000 + 3.000 | 99,99 | 130 | colecciones de varios campeones |
| `brasas_bienvenida` (una vez) | 500 + 200 | 6,99 | 100 + 3 campeones | ver §4 |

Antes: 1.000+200 por US$ 4,99 (240 ✦/US$) y packs de 100 a 115 ✦/US$. El pack de bienvenida regalaba 2,4 veces el valor del pack base y no había pack alto.

Cifras de mercado: no se citan. Los US$ son una propuesta a validar con el proveedor y con datos reales de conversión; la tabla solo garantiza coherencia interna (valor creciente, ahorro real).

## 4. Pack de bienvenida = 3 campeones

- **Qué recibe el jugador:** 700 ✦ (500 + 200 de regalo) y **3 campeones a elección** entre los STANDARD publicados que todavía no tiene (no Ascensión, no Fundadores, no Evento, no Familia: Familia y Ascensión tienen reglas propias y se compran con oro). Valor en oro de los 3: 3 × 2.500 = **7.500**, unas 9 partidas de jugador sostenido (el pack no promete poder: son campeones que se consiguen jugando).
- **Dónde se ve:** la tarjeta del pack dice "3 campeones de regalo, a tu elección (en la Tienda valen 7.500 de oro)". Tras el pago, la Tienda abre sola la pantalla "Elegí tus 3 campeones de regalo" (una vez por sesión) y deja un cartel permanente "Reclamar mis 3 campeones" en todas las pestañas mientras queden elecciones.
- **Autoridad (`POST /api/wallet/welcome/claim`):** el derecho es la compra del pack (referencia `once:brasas_bienvenida:<cuenta>` del libro); cada elección es un asiento de monto 0 con referencia única `welcome:<cuenta>:<campeón>`; un candado por cuenta impide pasar de 3 con pedidos simultáneos; la elección se registra **antes** de entregar, así que si falla la entrega (conflicto de guardado) no se pierde ni se cobra otra: reintentar la completa. Abrir la billetera reentrega lo que falte (si otro dispositivo subió un guardado viejo). Sin compra: 403 `NOT_PURCHASED`. Cuarto campeón: 409 `NO_PICKS_LEFT`. Ya lo tenés: 409 `OWNED`. Un segundo pago del pack no suma elecciones.
- **Ruta de entrega:** reutiliza el camino de los regalos del servidor (guardado en la nube con control de versión, igual que `grantSkin` y los premios del Game Master). Los STANDARD no requieren concesión de ledger (`championRequiresServerGrant` es falso), así que el estado `unlocked` del guardado alcanza.
- **Precio:** sube de US$ 4,99 a US$ 6,99 porque el pack ahora entrega 7.500 de oro de valor además de las Brasas; las Brasas bajan de 1.200 a 700 para que el pack no regale el doble de lo que vale. Es una propuesta: el dueño decide el precio final.

## 5. Riesgo pay-to-win

| Riesgo | Estado | Mitigación / decisión |
|---|---|---|
| Las Brasas compran poder | **No**: el servidor solo vende skins, cromas y colecciones; `Brasas → campeón`, ítem o talento no existe. | Prueba: `pricing-sync.js` ("Brasas no compran campeones") y `test-wallet.js` (BAD_SKU en cualquier otro id). |
| El Pack de bienvenida acelera campeones | **Atajo de unas 9 partidas**, no ventaja exclusiva: los 3 se compran con oro a 2.500. Solo STANDARD (nunca los de perfil `ascension`, que son más fuertes). | Aceptado por pedido del dueño; son tres elecciones, una sola vez por cuenta. |
| Ascensión comprable con oro | Más fuertes y mejor logrados, pero solo con oro o logros (nunca Brasas ni pack). | Precios de oro propios por dificultad; vía de logros intacta. |
| Skin con ventaja jugable | No: las skins son cosméticas (AGENTS.md) y el test confirma que comprar una skin no entrega piezas ni cambia estadísticas. | Cualquier skin nueva pasa por el visual gate; nunca cambia estadísticas. |
| **Brasas que aceleren la compra de campeones** | **No implementado.** | Ver propuesta abajo. |
| El oro lo guarda el cliente | El guardado de oro es del cliente (se puede editar); la billetera de Brasas **no**. | Fuera de este alcance: los precios de oro los valida el cliente. El oro nunca se vende por dinero real, así que editar el guardado no mueve ingresos, solo el juego propio. |
| Cromas de Expedición muy baratos en oro | 1.000 de oro vs ✦ 300. | Decisión del dueño: subirlos a 3.000 igualaría la relación de las demás. |

### Propuesta (NO implementada): Brasas que aceleran campeones

Idea: permitir "completar" un campeón con Brasas cuando falten pocas partidas de oro. Riesgos: (1) convierte las Brasas en poder, rompe la regla 1 y la promesa pública ("Las Brasas solo compran apariencia. Nunca poder."); (2) los campeones Ascensión, que son más fuertes, quedarían comprables con dinero; (3) enfrenta a quien paga con quien juega en competitivo. Si el dueño igual lo quiere: solo STANDARD, con tope por cuenta, sin Ascensión ni competitivo, con aviso visible y revisión legal para menores. Recomendación: **no hacerlo**; vender comodidad cosmética y colecciones.

## 6. Qué se verificó

Ver el informe de la rama `claude/pricing-overhaul`. Pruebas que fijan estos precios: `server/test-wallet.js` (`cd server && npm test`), `tools/collection/shop-pricing-browser.js`, `tools/collection/pricing-sync.js`, `tools/collection/brasas-store.js`, `tools/collection/welcome-picks.js`. Todas corren en `.github/workflows/champion-entry-balance.yml`.
