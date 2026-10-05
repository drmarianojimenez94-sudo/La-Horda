# Brasas ✦ — moneda premium

## Reglas
- **Toda skin** (apariencia con arte propio) cuesta **9000 de oro o 1000 Brasas** y da **solo la apariencia**
  (`js/systems/premium.js`). Las piezas de set se compran aparte como equipo; completar el set sigue regalando la skin.
- Los **cromas** (cambios de paleta) conservan su precio propio en oro.
- Las Brasas viven en el **servidor** (`server/wallet.js`): el cliente solo muestra el saldo y pide compras.
- Las Brasas **solo compran apariencia, nunca poder**. Sin cajas sorpresa ni gacha: se compra exactamente lo que se ve,
  con el precio siempre a la vista (en moneda real con su código, p. ej. `US$ 4,99`).

## Paquetes (precios sugeridos, `server/premium-packs.json`)
| Paquete | Brasas | Precio sugerido |
|---|---|---|
| `brasas_bienvenida` — Pack de bienvenida (`once: true`, una vez por cuenta) | 1000 + 200 | US$ 4,99 |
| `brasas_500` | 500 | US$ 4,99 |
| `brasas_1000` | 1000 | US$ 9,99 |
| `brasas_2500` | 2500 + 250 | US$ 24,99 |
| `brasas_5000` | 5000 + 750 | US$ 49,99 |

Cada precio lleva su moneda explícita (`{"currency":"USD","amount":4.99}`). Un paquete sin precio no se ofrece ni se
acredita. El dueño confirma los montos finales en su proveedor antes de cobrar.

## Cliente
- **Tienda → ✦ Brasas** (`js/ui/shop-ui.js`): saldo, la regla "Las Brasas solo compran apariencia. Nunca poder.", el
  Pack de bienvenida destacado arriba **solo si el servidor dice que no se compró** (`available` en `GET /api/wallet`),
  los paquetes con su precio y tres skins de guardianes que el jugador tiene ("¿Qué compro con Brasas?").
  Sin sesión: "Iniciá sesión para comprar Brasas". Sin pasarela: botones deshabilitados "Muy pronto" (nunca una compra simulada).
- **Hub**: el chip ✦ se ve siempre (`✦ —` sin sesión); su "+" abre la Tienda en ✦ Brasas. La ficha TIENDA lleva
  la etiqueta OFERTA mientras haya ofertas del día (rotan a la medianoche, sin contadores falsos).
- **Fin de partida** (`js/ui/end-screens.js`): debajo del oro, un botón discreto "Ver apariencias de <guardián>" abre
  Skins con foco en ese guardián, solo si tiene skins que no tenés, jugando solo y fuera de la primera partida.

## Servidor
| Ruta | Qué hace |
|---|---|
| `GET /api/wallet` | saldo, libro, precios y `payments: {enabled, currency, packs:[{id, premium, bonus, once, available, price:{currency, amount}}]}` (`enabled` es false sin proveedor) |
| `POST /api/wallet/buy {sku, ref, expectedPrice}` | debita 1000 ✦ (ref idempotente), entrega la skin en el guardado de la nube con CAS y reintegra si no pudo |
| `POST /api/gm/user/premium {id, amount, reason, ref, confirm?}` | panel de administración (permiso `MODIFY_CURRENCY`): acredita o descuenta con motivo obligatorio, queda en el registro (`currency.premium`) |
| `POST /api/wallet/checkout {pack}` | inicia un pago; sin proveedor: 501 `PAYMENTS_DISABLED` con "Los pagos todavía no están conectados…"; pack de una vez ya comprado: 409 |
| `POST /api/payments/webhook` | acredita un pago verificado una sola vez (`pay:<paymentId>`; pack `once`: `once:<pack>:<userId>`). Rechaza firma inválida, paquete desconocido o sin precio (400) y cuentas inexistentes (404) |

- Libro de movimientos append-only con `ref` única: reintentar nunca cobra ni acredita dos veces.
- Saldo nunca negativo (CHECK en Postgres, verificación en el archivo).
- Postgres: `horda_wallet`, `horda_wallet_ledger` (transacción con `FOR UPDATE`). Archivo: `data/wallet.json`.

## Conectar una billetera / pasarela de pago
Los pagos están **apagados** hasta que el dueño los configure:
1. Elegir proveedor (Mercado Pago, Stripe, etc.) y crear los productos de `server/premium-packs.json`
   (bienvenida 1000+200 una vez, 500, 1000, 2500+250, 5000+750 Brasas) con los precios de `price`.
2. Variables del servidor: `PAYMENTS_PROVIDER=hmac`, `PAYMENTS_WEBHOOK_SECRET` (≥16 caracteres, el secreto de firma
   del webhook) y `PAYMENTS_CHECKOUT_URL` (la página de pago del proveedor).
3. El proveedor (o un puente mínimo) envía `POST /api/payments/webhook` con el cuerpo
   `{"pack":"brasas_1000","userId":<id>,"paymentId":"<id único>"}` y la cabecera `x-horda-signature` =
   HMAC-SHA256 hex del cuerpo con el secreto. El servidor verifica la firma y acredita una sola vez por `paymentId`.
4. Probar con `node server/test-wallet.js` (firma inválida, repetición, acreditación única, pack de bienvenida una sola
   vez, cuenta inexistente, paquete sin precio, packs con moneda) y `node tools/collection/brasas-store.js` (tienda en el navegador).

Antes de cobrar de verdad: términos de uso, política de reembolsos, facturación y edad mínima son decisiones del dueño.
