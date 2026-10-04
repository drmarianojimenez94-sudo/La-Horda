# Brasas ✦ — moneda premium

## Reglas
- **Toda skin** (apariencia con arte propio) cuesta **9000 de oro o 1000 Brasas** y da **solo la apariencia**
  (`js/systems/premium.js`). Las piezas de set se compran aparte como equipo; completar el set sigue regalando la skin.
- Los **cromas** (cambios de paleta) conservan su precio propio en oro.
- Las Brasas viven en el **servidor** (`server/wallet.js`): el cliente solo muestra el saldo y pide compras.

## Servidor
| Ruta | Qué hace |
|---|---|
| `GET /api/wallet` | saldo, libro, precios, packs de pago (apagados por defecto) |
| `POST /api/wallet/buy {sku, ref, expectedPrice}` | debita 1000 ✦ (ref idempotente), entrega la skin en el guardado de la nube con CAS y reintegra si no pudo |
| `POST /api/gm/user/premium {id, amount, reason, ref, confirm?}` | panel de administración (permiso `MODIFY_CURRENCY`): acredita o descuenta con motivo obligatorio, queda en el registro (`currency.premium`) |
| `POST /api/wallet/checkout {pack}` | inicia un pago (501 si no hay proveedor) |
| `POST /api/payments/webhook` | acredita un pago verificado una sola vez (`pay:<id>`) |

- Libro de movimientos append-only con `ref` única: reintentar nunca cobra ni acredita dos veces.
- Saldo nunca negativo (CHECK en Postgres, verificación en el archivo).
- Postgres: `horda_wallet`, `horda_wallet_ledger` (transacción con `FOR UPDATE`). Archivo: `data/wallet.json`.

## Conectar una billetera / pasarela de pago
Los pagos están **apagados** hasta que el dueño los configure:
1. Elegir proveedor (Mercado Pago, Stripe, etc.) y crear los productos de `server/premium-packs.json`
   (500, 1000, 2500+250, 5000+750 Brasas; poné los precios en `price`).
2. Variables del servidor: `PAYMENTS_PROVIDER=hmac`, `PAYMENTS_WEBHOOK_SECRET` (≥16 caracteres, el secreto de firma
   del webhook) y `PAYMENTS_CHECKOUT_URL` (la página de pago del proveedor).
3. El proveedor (o un puente mínimo) envía `POST /api/payments/webhook` con el cuerpo
   `{"pack":"brasas_1000","userId":<id>,"paymentId":"<id único>"}` y la cabecera `x-horda-signature` =
   HMAC-SHA256 hex del cuerpo con el secreto. El servidor verifica la firma y acredita una sola vez por `paymentId`.
4. Probar con `node server/test-wallet.js` (cubre firma inválida, repetición y acreditación única).

Antes de cobrar de verdad: términos de uso, política de reembolsos, facturación y edad mínima son decisiones del dueño.
