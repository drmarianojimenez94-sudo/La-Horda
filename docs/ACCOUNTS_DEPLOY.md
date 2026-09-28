# Cuentas de usuario: cómo dejarlas andando (paso a paso)

Esta guía es para quien maneja el juego, sin saber de servidores. Se hace **una sola vez**
y lleva unos 15 minutos.

## Qué hace esto

- Al tocar **"Toca para continuar"** aparece la pantalla **Entrar / Crear cuenta / Jugar como invitado**.
- Con cuenta, el progreso (guardianes, objetos, oro, campaña) se guarda **en la nube**: entrás desde
  otro celular o compu con tu usuario y contraseña y seguís donde estabas.
- La próxima vez que abrís el juego entra directo (la sesión queda recordada).
- **Jugar como invitado** anda siempre, aunque el servidor esté apagado o no haya internet: es el juego
  de siempre, con el progreso solo en ese dispositivo. Si después crea su cuenta, su progreso se sube.
- El nombre de la cuenta se usa como nombre en la Sala multijugador.
- **Ranking semanal de la Horda Infinita**: con cuenta, cada partida entra a la tabla de la semana
  (top 50, también por guardián). Los invitados ven la tabla, pero su récord queda en el dispositivo.

Las cuentas viven en **el mismo servidor del multijugador** (el servicio `la-horda-relay` de Render).
No hay que crear otro servidor ni tocar el juego publicado en GitHub Pages: usa la misma dirección
que ya tiene para las salas (`js/net/net-config.js`).

## Lo único que falta: una base de datos

El servidor necesita un lugar donde guardar las cuentas **para siempre**. Sin base de datos el
servidor las guarda en su propio disco, pero en el plan gratuito de Render ese disco **se borra
cada vez que el servidor se duerme** (15 minutos sin jugadores), se reinicia o se actualiza. O sea:
sin base de datos las cuentas se pierden a cada rato. El juego lo avisa en la pantalla de cuenta
("Servidor de prueba sin base de datos") y el servidor en `/health`. El progreso de cada jugador
**no** se pierde (queda en su dispositivo), pero tiene que volver a crear la cuenta.

### Opción recomendada: Neon (gratis, no vence)

> Precios y condiciones a septiembre de 2026; revisá la página de cada servicio por si cambiaron.

1. Entrá a **https://neon.tech** y tocá **Sign up**. Podés entrar con tu cuenta de GitHub o de Google.
2. Creá un proyecto (**Create project**):
   - Nombre: `la-horda`.
   - Región: elegí la **misma zona** que tu servicio de Render (en Render la ves en la página del
     servicio, arriba: *Oregon*, *Ohio*, *Virginia*, *Frankfurt* o *Singapore*). Por ejemplo, Render
     *Oregon* → Neon *AWS US West 2 (Oregon)*; Render *Frankfurt* → Neon *AWS Europe Central 1 (Frankfurt)*.
     Si no sabés, dejá la que viene: anda igual, apenas un poco más lento.
   - Lo demás, como viene.
3. En la página del proyecto tocá **Connect**. Aparece la *connection string*: una dirección larga
   que empieza con `postgresql://` y termina con `?sslmode=require`.
   Tocá **Show password** (para que se vea la contraseña adentro de la dirección) y después **Copy**.
4. Guardá esa dirección en un lugar seguro (es como una llave: **no** la pegues en el repositorio,
   en chats públicos ni en capturas de pantalla).

### Pegar la dirección en Render

1. Entrá a **https://dashboard.render.com** y abrí el servicio **la-horda-relay**.
2. En el menú de la izquierda, **Environment**.
3. **Add Environment Variable** (o *+ Add*):
   - **Key**: `DATABASE_URL`
   - **Value**: pegá la dirección que copiaste de Neon.
4. **Save Changes** (si pregunta, elegí **Save, rebuild, and deploy**). Render reinicia el servidor
   solo; tarda entre 1 y 3 minutos. Las tablas de la base se crean solas al arrancar.

> ¿El servicio se creó con el Blueprint (`render.yaml`) y es nuevo? Entonces Render te pide
> `DATABASE_URL` en el momento de crearlo: pegá ahí la misma dirección.

## Cómo probar que anda

1. Abrí en el navegador: **https://la-horda-relay.onrender.com/health**
   (si está dormido tarda hasta un minuto en contestar: esperá y recargá).
2. Tiene que decir dos líneas:

   ```
   LA HORDA relay OK · protocolo 1 · salas 0
   cuentas: base de datos Postgres OK
   ```

   | Si dice… | Significa | Qué hacer |
   |---|---|---|
   | `cuentas: base de datos Postgres OK` | Todo bien | Nada |
   | `cuentas: ARCHIVO EN DISCO (sin DATABASE_URL)…` | Falta la variable | Revisá el paso "Pegar la dirección en Render" (que el Key sea exactamente `DATABASE_URL`) |
   | `cuentas: ERROR (postgres): …` | La dirección está mal copiada o la base no responde | Volvé a copiarla de Neon (con **Show password**) y pegala de nuevo. Si dice `password authentication failed`, la contraseña quedó mal |
   | `cuentas: base de datos Postgres conectando…` | Está arrancando | Recargá en unos segundos |
   | No carga | El servidor está dormido o caído | Esperá un minuto y recargá; si sigue, mirá **Logs** en Render |

3. Probá en el juego (el publicado):
   - Tocá **Toca para continuar** → **Crear cuenta** → usuario y contraseña → **Crear cuenta**.
   - Jugá un rato (o comprá algo en la Tienda para que cambie el oro).
   - En **otro** celular o navegador: abrí el juego → **Entrar** con el mismo usuario y contraseña.
     Tiene que aparecer el mismo oro y los mismos guardianes.
   - Arriba a la derecha del menú aparece tu nombre: tocándolo ves el perfil, el estado del guardado
     en la nube, el nombre visible y **Cerrar sesión**.

## Otras opciones de base de datos

- **Supabase** (gratis): creá un proyecto en https://supabase.com, tocá **Connect** y copiá la
  dirección del **Session pooler** (la *Direct connection* no anda desde Render). Reemplazá
  `[YOUR-PASSWORD]` por la contraseña que elegiste al crear el proyecto. Ojo: en el plan gratis,
  si nadie juega por una semana el proyecto se *pausa* y hay que entrar a Supabase a reactivarlo.
- **Render Postgres** (todo en Render): **New → Postgres**, en la **misma región** que el servicio.
  Copiá la **Internal Database URL** y pegala como `DATABASE_URL`. La base gratis de Render **vence
  a los 30 días** (se borra): para usarla en serio hace falta un plan pago (el más chico cuesta
  unos pocos dólares por mes).
- **Sin base de datos pero con disco** (pago): un servicio de Render con plan pago y un **Disk**
  montado, por ejemplo, en `/var/data`, más la variable `DATA_DIR=/var/data`. Las cuentas quedan en
  archivos en ese disco.

## Qué pasa si…

- **…el servidor está dormido** (plan gratuito, 15 min sin uso): la primera vez que alguien entra tarda
  hasta un minuto en despertar. La pantalla de cuenta muestra "Despertando el servidor… N s". Quien
  ya tenía la sesión recordada entra directo y juega igual; el guardado se sincroniza en segundo plano.
- **…no hay internet**: se juega igual. El progreso queda pendiente y se sube solo cuando vuelve la red.
- **…juego en dos dispositivos a la vez**: si los dos cambiaron el progreso, el juego pregunta cuál
  usar (**La nube** o **Este dispositivo**) mostrando guardianes, nivel, oro y arenas de cada uno.
  El que no se elige queda guardado como respaldo en ese dispositivo.
- **…alguien se olvida la contraseña**: por ahora no hay recuperación automática por correo. Puede
  crear otra cuenta: su progreso sigue en su dispositivo y se sube a la cuenta nueva.
- **…se filtró la dirección de la base**: en Neon, cambiá la contraseña del usuario de la base (opción **Reset password**), copiá la dirección nueva
  y reemplazala en Render (Environment → `DATABASE_URL`).

## Seguridad (resumen)

- Las contraseñas **nunca** se guardan: se guarda una huella (scrypt con sal única por usuario).
  Nadie, ni el dueño del juego, puede leerlas.
- La sesión es un código aleatorio que vence si no se usa en 60 días; en la base solo queda su huella.
- Muchos intentos fallidos seguidos frenan el ingreso por 15 minutos (por usuario y por conexión).
- Solo el juego publicado y sus vistas previas pueden usar la API (la misma lista `ALLOWED_ORIGINS`
  del multijugador).
- El guardado en la nube tiene un tope de ~512 KB por jugador (el de un jugador avanzado ocupa mucho menos).

---

## Para técnicos

Servidor: `server/accounts.js` (montado por `server/relay.js` en el mismo puerto, bajo `/api/`).

| Método y ruta | Qué hace |
|---|---|
| `GET /api/health` | `{ok, store: "postgres"\|"file", persistent, status, warning?}` |
| `POST /api/register` `{user, pass, email?}` | 201 `{token, expiresAt, user}` · 409 `USER_TAKEN` (sin distinguir mayúsculas) |
| `POST /api/login` `{user, pass}` | 200 `{token, expiresAt, user}` · 401 `BAD_CREDENTIALS` · 429 `TOO_MANY` |
| `POST /api/logout` | borra la sesión |
| `GET /api/me` | `{user, expiresAt, save: {version, updatedAt, summary} \| null}` |
| `GET /api/save` | `{version, updatedAt, summary, data}` (versión 0 y `data: null` si no hay) |
| `PUT /api/save` `{data, baseVersion, force?}` | 200 `{version, updatedAt}` · 409 `CONFLICT` con la versión y el resumen de la nube · 413 |
| `POST /api/save-beacon` (text/plain, `{token, data, baseVersion}`) | igual que PUT, nunca fuerza (cierre de pestaña con `navigator.sendBeacon`) |
| `PUT /api/profile` `{name?, email?}` | nombre visible (16 letras) |
| `GET /api/leaderboard?week=&guardian=&limit=` | top 50 de la semana ISO en UTC (la actual por defecto): el mejor de cada cuenta (o con ese guardián), `total`, `endsAt` y, con sesión, `me` (tu puesto) |
| `POST /api/leaderboard/submit` `{score, round, guardian, week, durationMs}` | con sesión. 200 `{rank, total, improved, best}` · 422 `IMPLAUSIBLE` (duración por ronda, techo de puntaje por ronda y minuto, o la partida no entra en el tiempo desde tu envío anterior) · 409 `WEEK_CLOSED` (la semana anterior entra 6 h después del cambio) · 429 (8 s entre envíos, 10 cada 10 min) |

Autorización: `Authorization: Bearer <token>`. Control de versión optimista: cada subida manda la
versión de la nube que conocía; si no coincide, 409 y el cliente pregunta.

Variables de entorno: `DATABASE_URL`, `PGSSL` (`0`/`1`, por defecto automático: SSL salvo en
direcciones internas de Render), `DATA_DIR`, `SESSION_DAYS` (60), `AUTH_MAX_FAILS` (8 por usuario
cada 15 min), `AUTH_MAX_FAILS_IP` (30), `REGISTER_MAX_IP` (10 por hora), `TRUST_PROXY` (automático en Render).

Tablas (se crean solas): `horda_users`, `horda_sessions` (hash SHA-256 del token), `horda_saves`,
`horda_leaderboard` (sin base de datos: `leaderboard.json` en `DATA_DIR`, últimas 12 semanas).

Cliente: `js/net/account.js` y `css/account.css`. API para el menú: `window.accountOpen()`,
`window.accountState()` → `{logged, name, user, syncing, pending, online, lastSync, conflict}` y el
evento `account-change` en `window`. Si el menú trae su propio chip de perfil, marcarlo con el
atributo `data-account-chip` y el chip mínimo de `account.js` se retira solo.

Pruebas:

```bash
cd server && npm install
node test-relay.js                                   # protocolo de salas (sigue igual)
node test-accounts.js                                # API de cuentas con archivos en disco
DATABASE_URL=postgres://... node test-accounts.js    # la misma prueba contra Postgres (usa tablas horda_*, BORRA sus filas: usar una base de prueba)
cd .. && python3 -m http.server 8802 &
SITE=http://127.0.0.1:8802 RELAY_PORT=8812 node tools/net-test/accounts.js   # navegadores: registro, sync entre dos, conflicto, sin red...
```
