# LA HORDA · Pasos del dueño para el alfa (Comic Con)

Esta guía es para vos, sin saber nada de servidores. Cada paso dice **dónde tocar** y **qué tiene que
aparecer**. Si algo no coincide, pará y mirá la sección **F (si algo falla)**.

> **Regla de oro:** las direcciones de base de datos, contraseñas y códigos secretos **no se pegan en
> ningún chat** (ni con Claude, ni WhatsApp, ni capturas). Se pegan **solo** en Neon / Render / Fly.io.

---

## 0. Qué es cada cosa (leelo una vez)

El juego tiene **dos partes**:

1. **La página del juego** (lo que abre la gente en el celular).
2. **El servidor** (una compu en Internet que arma las salas multijugador, guarda las cuentas, el
   ranking, los intercambios y el panel de administración).

Hoy hay **dos servidores**:

| Nombre | Dirección del juego | Dirección del servidor | Para qué |
|---|---|---|---|
| **Principal (Fondal)** | https://fondalstudios.com/la-horda/jugar/ | `wss://fondalstudios.com/la-horda/red` | **El que usa el juego publicado.** Es el de la Comic Con. Está alojado en **Fly.io**. |
| **Anterior (Render)** | el de GitHub Pages con `?server=wss://la-horda-relay.onrender.com` | `wss://la-horda-relay.onrender.com` | El servidor viejo, servicio **la-horda-relay** en Render. Se conserva con sus cuentas. |

Las cuentas **no se pasan solas** de un servidor al otro: una cuenta creada en Render no existe en
Fondal (y al revés).

**Lo que el jugador nunca pierde:** su progreso queda guardado **en su propio celular**. Si el servidor
falla, "Jugar como invitado" y el modo SOLO andan igual, sin Internet.

---

## Lista corta (si tenés 5 minutos)

1. Abrí **https://fondalstudios.com/la-horda/red/api/health** y fijate que diga `"ok":true` y
   `"persistent":true` (paso **C**).
2. Si dice `"persistent":false` → hacé los pasos **A** y **B** en el servidor que corresponda.
3. Cargá las 4 variables "del evento" (paso **B.3**) para que el wifi de la Comic Con no frene a nadie.
4. El día del evento, 10 minutos antes: abrí la página de health otra vez y armá una sala de prueba
   con dos celulares (paso **E** y **F**).

---

## A. Crear la base de datos gratis en Neon (solo si hace falta)

Hace falta **solo si** el paso **C** dice `"persistent": false`. Sin base de datos (o sin disco
persistente), cada vez que el servidor se reinicia **se borran las cuentas, el ranking y los
intercambios pendientes**. (El juego le explica al jugador lo que pasó y su progreso sigue en su
celular, pero tiene que crear la cuenta de nuevo.)

1. Entrá a **https://neon.tech** → botón **Sign up** → elegí **Continue with Google** (o GitHub).
2. Si te pregunta, poné tu nombre y aceptá. Llegás al panel ("Console").
3. Tocá **Create project** (o **New project**):
   - **Project name**: `la-horda`
   - **Region**: elegí la más cercana al servidor. Render: la ves en la página del servicio (arriba
     dice *Oregon*, *Ohio*, *Virginia*, *Frankfurt* o *Singapore*); elegí en Neon la que tenga el mismo
     nombre (ej. *AWS US West 2 (Oregon)*). Si no sabés, dejá la que viene.
   - Lo demás, como viene → **Create project**.
4. En la página del proyecto tocá el botón **Connect** (arriba a la derecha).
5. Aparece un cuadro con una dirección larga que empieza con `postgresql://` y termina con
   `?sslmode=require`. Tocá **Show password** (así la contraseña queda adentro de la dirección) y
   después **Copy snippet** / el ícono de copiar.
6. **No la pegues en ningún chat.** Si la querés guardar, en un gestor de contraseñas o un papel.
   La vas a pegar en el paso B como `DATABASE_URL`.

> Neon gratis: alcanza de sobra para el alfa y no vence. Si un día no entra nadie, la base "se duerme"
> y la primera vez tarda 1–2 segundos más: no hay que hacer nada.

---

## B. Cargar las variables en el servidor

Una **variable** es un par **nombre = valor** que el servidor lee al arrancar. Se cargan una vez.

### B.1 En Render (servicio `la-horda-relay`)

1. Entrá a **https://dashboard.render.com** e iniciá sesión.
2. En la lista, tocá el servicio **la-horda-relay**.
3. En el menú de la izquierda tocá **Environment**.
4. Para **cada** variable de la tabla B.3 que corresponda:
   - Tocá **+ Add Environment Variable** (o **Edit** → **+ Add**).
   - En **Key** escribí el nombre **exacto** (mayúsculas, guiones bajos, sin espacios).
   - En **Value** pegá o escribí el valor.
5. Cuando terminaste, tocá **Save Changes**. Si pregunta, elegí **Save, rebuild, and deploy**.
6. Esperá 1 a 3 minutos (arriba aparece **Deploy live** en verde) y hacé el paso **C**.

### B.2 En Fly.io (servidor principal Fondal)

> El servidor principal está en **Fly.io**. Si el que lo instaló fue otra persona, pedile acceso a la
> cuenta de Fly.io o pasale esta tabla: los nombres y valores son los mismos que en Render.

1. Entrá a **https://fly.io/dashboard** e iniciá sesión.
2. Tocá la app del juego (la que atiende `fondalstudios.com/la-horda/red`).
3. En el menú de la app buscá **Secrets**.
4. Para cada variable: **New secret** (o **Add secret**) → **Name** = el nombre exacto, **Value** = el
   valor → guardar.
5. Fly.io reinicia la app sola al guardar un secreto (tarda ~1 minuto). Después, paso **C**.

### B.3 Todas las variables (cuáles cargar)

**Imprescindibles (si no están):**

| Nombre (Key) | Valor | Para qué |
|---|---|---|
| `DATABASE_URL` | la dirección de Neon del paso A (empieza con `postgresql://`) | Guarda cuentas, ranking, panel y eventos **para siempre**. **Secreto.** No hace falta si el servidor ya dice `"persistent":true` (ver C). |
| `ALLOWED_ORIGINS` | `https://fondalstudios.com,https://drmarianojimenez94-sudo.github.io,https://rawcdn.githack.com,https://raw.githack.com` | Desde qué páginas se puede usar el servidor. (Fondal y GitHub Pages ya se aceptan siempre, pero dejala así.) |

**Para la Comic Con (recomendadas):** en un evento **todos los celulares del wifi del lugar salen a
Internet con la misma dirección**, y el servidor tiene frenos "por dirección" contra abusos. Con los
valores normales, después de 10 cuentas nuevas en una hora **nadie más podría crear cuenta**.

| Nombre (Key) | Valor para el evento | Normal | Qué frena |
|---|---|---|---|
| `REGISTER_MAX_IP` | `300` | 10 | cuentas nuevas por hora desde un mismo wifi |
| `AUTH_MAX_FAILS_IP` | `300` | 30 | contraseñas equivocadas cada 15 min desde un mismo wifi |
| `API_MAX_IP` | `3000` | 300 | pedidos por minuto desde un mismo wifi (guardado en la nube, ranking, chat…) |
| `ROOMS_MAX_IP` | `300` | 30 | consultas a "Salas abiertas" cada 10 segundos desde un mismo wifi |

Después del evento podés borrarlas (vuelven a los valores normales).

**Administración y Fundadores (solo si hace falta):**

| Nombre (Key) | Valor | Cuándo |
|---|---|---|
| `FOUNDER_SIGNUP_CODE` | un código inventado por vos, de **8 o más** letras y números | **Solo** si la cuenta `FacuGM` todavía no existe: permite crearla una vez (ver `docs/founders/OPERACION.md`). Después de crearla, **borrá esta variable**. |
| `ADMIN_USERS` | — | **No la crees.** El dueño (**NanoGM**) y los roles ya vienen en `server/operator-config.json`. Si la creás, **reemplaza** esa lista: si te olvidás de poner `NanoGM`, perdés el panel. |
| `FOUNDERS_JSON` | — | **No la crees** (reemplaza la lista de Fundadores de `server/operator-config.json`; es para pruebas). |

**Solo si usás un DISCO en lugar de base de datos** (Fly.io con volumen, o Render pago con Disk):

| Nombre (Key) | Valor | Para qué |
|---|---|---|
| `DATA_DIR` | la carpeta del disco (ej. `/data` en Fly.io, `/var/data` en Render) | dónde se guardan los archivos |
| `DATA_PERSISTENT` | `1` | le dice al servidor que ese disco sobrevive a los reinicios (en Fly.io con `DATA_DIR` ya lo asume solo). Así `/api/health` dice `"persistent":true` y el juego no avisa "servidor de prueba". |

**Opcionales (no hace falta tocarlas):** `SESSION_DAYS` (días que dura la sesión, 60), `AUTH_MAX_FAILS`
(contraseñas mal por usuario, 8), `MAX_ROOMS` (salas a la vez, 300), `CHAT_BLOCKLIST` (palabras a tapar
en el chat, separadas por comas), `PGSSL` (no tocar), `TRUST_PROXY` (no tocar: en Render y Fly.io es
automático).

**Nunca** cargues `SIM_LATENCY_MS`, `TRADE_DELIVER_TIMEOUT_MS` ni `HORDA_TEST_PG_URL`: son solo para
pruebas y harían el juego más lento. `PORT` lo pone Render/Fly.io solos.

---

## C. Comprobar que funcionó

1. En el navegador (compu o celular) abrí:
   - Principal: **https://fondalstudios.com/la-horda/red/api/health**
   - Render: **https://la-horda-relay.onrender.com/api/health**
2. Si el servidor estaba dormido puede tardar **hasta 1 minuto** en contestar: esperá y recargá.
3. Tiene que aparecer un texto así (el orden puede cambiar):

| Si dice… | Significa | Qué hacer |
|---|---|---|
| `"ok":true,"store":"postgres","persistent":true,"status":"ready"` | Perfecto: base de datos conectada | Nada |
| `"ok":true,"store":"file","persistent":true` | Perfecto: guarda en un disco que sobrevive | Nada |
| `"store":"file","persistent":false` y un `"warning"` | **Sin base de datos**: las cuentas se borran al reiniciar | Pasos A y B (`DATABASE_URL`) |
| `"status":"error"` y un `"error":"…"` | La dirección de la base está mal copiada o la base no responde | Volvé a copiarla de Neon con **Show password** y pegala de nuevo en `DATABASE_URL`. Si dice `password authentication failed`, quedó mal la contraseña |
| `"status":"starting"` / `"ok":false` | Está arrancando | Recargá en 30 segundos |
| Página en blanco, "Not Found" o 404 | El servidor tiene una versión vieja (sin cuentas) | Paso D (actualizarlo) |
| No carga nunca | Servidor caído | Paso F |

4. También podés abrir **…/health** (sin `/api`): la segunda línea dice
   `cuentas: base de datos Postgres OK` (bien), `cuentas: ARCHIVO EN DISCO PERSISTENTE OK` (bien) o
   `cuentas: ARCHIVO EN DISCO (sin DATABASE_URL) · AVISO…` (falta la base).
5. Prueba real en el juego: en un celular **Crear cuenta**, jugá un minuto; en otro celular **Entrar**
   con el mismo usuario: tiene que aparecer el mismo oro y guardianes.

---

## D. Actualizar el servidor (redeploy manual)

Hace falta cuando hay cambios nuevos del juego en GitHub que el servidor todavía no tiene.

### En Render
1. **https://dashboard.render.com** → servicio **la-horda-relay**.
2. **Ojo con la rama:** menú izquierdo **Settings** → sección **Build & Deploy** → **Branch**. Ahí dice
   de qué rama de GitHub se actualiza (hoy: `claude/horda-latest-updates-gv4tlf`). Si querés que siga
   a `main`, tocá **Edit**, elegí `main` y **Save Changes**.
3. Arriba a la derecha, botón **Manual Deploy** → **Deploy latest commit**.
4. Abajo, en **Events**, aparece "Deploy started". Esperá hasta **Deploy live** (2 a 5 minutos).
5. Hacé el paso **C**.

> Mientras se actualiza, las salas abiertas en ese momento se cierran. El juego avisa ("el servidor se
> reinició") y cada uno vuelve a un lugar donde puede seguir: **no actualices durante el evento**.

### En Fly.io
La actualización la hace quien instaló el servidor principal (desde su compu). No hay botón equivalente
seguro en el panel: pedíselo **antes** del evento, nunca durante.

---

## E. Mantenerlo despierto durante la Comic Con

**Render plan gratis** apaga el servidor después de **15 minutos sin nadie** y tarda **~50 segundos en
despertar**. El juego lo maneja (muestra "Despertando el servidor… 23 s" y reintenta solo), pero en un
stand es mejor que esté despierto.

**Opción 1 (lo mínimo):** 1 o 2 minutos antes de que empiece a jugar la gente, abrí la página de
health (paso C) y esperá a que conteste.

**Opción 2 (automático y gratis): UptimeRobot** visita el servidor cada 5 minutos y así no se duerme.
1. Entrá a **https://uptimerobot.com** → **Register for FREE** → creá la cuenta y confirmá el correo.
2. En el panel tocá **+ New monitor** (o **Add New Monitor**).
3. **Monitor type**: `HTTP(s)`.
4. **Friendly name**: `La Horda servidor`.
5. **URL**: la de health **sin `/api`**:
   - Render: `https://la-horda-relay.onrender.com/health`
   - Principal: `https://fondalstudios.com/la-horda/red/health`
6. **Monitoring interval**: `5 minutes` (el mínimo gratis).
7. Si te ofrece avisos por correo, dejá tu correo: te escribe si el servidor se cae.
8. **Create monitor**. En un minuto tiene que aparecer **Up** en verde.

Límites a tener en cuenta:
- Render gratis da **750 horas por mes** por cuenta. Un servicio despierto todo el mes usa ~744: alcanza
  **si es el único servicio gratis** que tenés despierto. Si tenés otro, pausá el monitor después del
  evento (en UptimeRobot: el monitor → **Pause**).
- Aunque esté despierto, Render puede reiniciarlo alguna vez por su cuenta: con base de datos no se
  pierde nada; las partidas en curso se cortan y el juego lo explica.
- Fly.io: depende de cómo lo configuró quien lo instaló (si apaga máquinas sin uso). El monitor de
  UptimeRobot no hace daño: dejalo igual.

---

## F. El día del evento: qué hacer si algo falla

**Antes de abrir el stand (10 minutos):**
- [ ] Abrí la página de health (C): `"ok":true` y `"persistent":true`.
- [ ] En dos celulares: uno **Crear sala online** (Arena → Sala → pestaña Sala online), el otro
      **Multijugador → Unirse con código**. Comenzar, jugar 1 minuto.
- [ ] Probá **Crear cuenta** en un celular (con el wifi del lugar).
- [ ] Wifi del lugar flojo: tené un celular con datos para compartir Internet.

**Si pasa esto…**

| Lo que ves | Qué hacer |
|---|---|
| "Despertando el servidor… N s" | Normal la primera vez (hasta 1 minuto). Esperá: se conecta solo. |
| "El servidor no respondió" después de 1–2 minutos | Abrí la página de health. Si no carga: en Render → **Logs** (mirar el último error) y **Manual Deploy → Restart service** si aparece; si sigue, que la gente juegue **SOLO** (no depende del servidor). |
| "El servidor se reinició" / "La sala ya no existe" | El servidor se reinició. El anfitrión toca **Crear sala online** de nuevo y pasa el **código nuevo**. |
| "Reconectando con la partida… (intento N de 8)" | Corte de red de ese celular: esperá unos segundos, vuelve solo. |
| "Esperando al anfitrión…" | El celular del anfitrión bloqueó la pantalla o perdió señal: que la desbloquee. |
| "No se pudo crear la cuenta" / "Muchos intentos" | Faltan las variables del evento (B.3: `REGISTER_MAX_IP`, `AUTH_MAX_FAILS_IP`, `API_MAX_IP`). Mientras tanto: **Jugar como invitado**. |
| "El servidor de prueba se reinició y borró las cuentas" | El servidor no tiene base de datos (C dice `"persistent":false`). Hacé A y B después del evento; hoy, la gente crea la cuenta de nuevo (su progreso sigue en su celular). |
| "Esta función todavía no está disponible en el servidor" | El servidor tiene una versión vieja: paso D (fuera del horario del evento). El resto del juego anda. |
| "SALA COMPLETA" | Una sala admite 4 jugadores: el 5º crea otra sala. |
| Nada anda online | Todos a **SOLO**: el juego entero funciona sin servidor. |

---

## Referencia técnica (para quien ayude)

- Variables leídas por el servidor: `server/relay.js` (cabecera), `server/accounts.js` (cabecera),
  `server/operator-config.json` (dueño NanoGM, Fundadores, roles), `docs/founders/OPERACION.md`.
- Endpoints de control: `GET /health` (texto), `GET /api/health` (JSON: `ok`, `store`
  = `postgres`|`file`, `persistent`, `status` = `starting`|`ready`|`error`, `warning`, `error`),
  `GET /api/rooms` (salas públicas).
- Guías previas: `docs/ACCOUNTS_DEPLOY.md` (cuentas y Neon/Supabase/Render Postgres),
  `docs/MULTIPLAYER_B1.md` (multijugador y Render).
- Pruebas del comportamiento "Render plan gratis" (dormido, reinicio en sala y en partida, servidor
  viejo): `tools/net-test/server_restart.js`, `tools/net-test/old_server.js`, `tools/net-test/coldstart.js`.
