# Fundadores, permisos y panel — guía de operación

## 1. Vincular las cuentas Fundadoras (server-side, por ID estable)

`server/operator-config.json`:

```json
{
  "ownerAccount": "NanoGM",
  "founders": {
    "nano": { "account": "NanoGM", "accountId": null },
    "facu": { "account": "FacuGM", "accountId": null }
  },
  "roles": {
    "FacuGM": ["ADMIN"]
  }
}
```

- **Nano GM** queda vinculado a la cuenta existente **NanoGM** (usuario de login, resuelto UNA vez al
  arrancar a su ID numérico). Cambiar el nombre visible no afecta nada.
- **Facu GM → cuenta `FacuGM`** (decisión del operador; los usuarios no admiten espacios). Se resuelve a
  su ID al arrancar el relay. El log `FOUNDER_POLICY` informa `bound:true` y Usuarios → Fundadores
  muestra `VINCULADO`. Si la cuenta todavía no existe, queda **sin vincular** (nunca se crea sola).
- **Panel de administración para FacuGM:** `"roles"` asigna roles estáticos por cuenta, resueltos al ID
  estable al arrancar (log `ROLE_POLICY`). `ADMIN` = todos los permisos menos `MANAGE_ROLES`; nunca da
  `OWNER` y, como a cualquiera, no le permite conceder campeones FOUNDER. Se suma a los roles que el
  OWNER asigne en el panel (quitarlo del panel no lo quita de la configuración: se edita este archivo).
- **Nombres reservados:** cada `account` de `founders` y cada cuenta de `roles` quedan reservados en el
  registro. Si `FacuGM` no existe todavía, el operador define en el servidor la variable secreta
  `FOUNDER_SIGNUP_CODE` (≥ 8 caracteres) y Facu se registra una vez enviando ese código:

  ```bash
  curl -X POST https://<servidor>/api/register -H 'content-type: application/json' \
    -d '{"user":"FacuGM","pass":"<contraseña>","signupCode":"<FOUNDER_SIGNUP_CODE>"}'
  ```

  El vínculo de Fundador y el rol ADMIN se aplican en el acto (sin reiniciar). Después conviene borrar
  la variable. Sin ella, nadie puede ocupar el nombre. Opcional: pasar a `"facu": { "accountId": <ID> }`
  (ID interno visible en Usuarios → ficha), que gana sobre `account`.
- **No transferibles:** no hay endpoint de transferencia. Una delegación futura debe ser una operación
  aparte, explícita y auditada.

## 2. Cómo se hace cumplir (el cliente pide, el servidor decide)

| Riesgo | Control |
|---|---|
| Cliente manipulado marca `nano_gm` como desbloqueado | `server/entitlements.js` sanea **todo** guardado aceptado (PUT, beacon) y servido (GET): los campeones FOUNDER / no publicados quedan `unlocked:false` salvo concesión del servidor. La respuesta trae `enforced` y el cliente lo aplica. |
| "Comprar" un Fundador por 9.999 de oro | No existe compra: el cliente lo rechaza y, aunque se fuerce, el servidor revierte la propiedad al guardar. |
| Admin intenta conceder un Fundador | `POST /api/gm/user/champion` → 403 `FOUNDER_NOT_GRANTABLE` (incluso para OWNER). |
| Alguien se pone "NanoGM" como nombre en la sala | La identidad Fundadora sale de la **sesión de cuenta** verificada por el relay (`identify`), nunca del nombre del slot. Banners y badge solo con esa verificación. |
| Elegir `nano_gm` en una sala sin derecho | El relay (`server/presence.js`) rechaza campeones de concesión exclusiva sin derecho verificado (`CHAMP_NOT_OWNED`). |
| Fundador en rankings | Cliente y servidor (`NOT_COMPETITIVE`) lo excluyen. |

**Riesgo conocido:** el oro y las compras de campeones STANDARD siguen siendo autoritativos del cliente
(diseño previo de la Alpha; la simulación corre en el anfitrión). Hacer autoritativa toda la economía
excede este trabajo y queda como pendiente.

## 3. Roles y permisos (`server/rbac.js`)

| Rol | Permisos |
|---|---|
| OWNER (cuenta del operador) | Todos, incluido `MANAGE_ROLES` |
| ADMIN | Todos salvo `MANAGE_ROLES` |
| SUPPORT | `VIEW_USERS`, `VIEW_AUDIT_LOG`, `GRANT_CONTENT` |
| TESTER | `TEST_CONTENT` |

Permisos: `VIEW_USERS, EDIT_USER_PROGRESS, GRANT_CONTENT, REVOKE_CONTENT, MODIFY_CURRENCY, TEST_CONTENT,
MANAGE_EVENTS, MANAGE_CHAMPIONS, MANAGE_CONFIG, VIEW_AUDIT_LOG, MANAGE_ROLES`. FOUNDER es **identidad**,
no permiso: Facu GM no tiene acceso al panel salvo que el OWNER le asigne un rol.

## 4. Endpoints nuevos (todos exigen sesión + permiso)

| Método y ruta | Permiso | Uso |
|---|---|---|
| `GET /api/gm/users?q=&filter=` | VIEW_USERS | Lista real (founder/staff/recent) |
| `GET /api/gm/user?id=` | VIEW_USERS | Ficha completa |
| `GET /api/gm/user/save?id=` | EDIT_USER_PROGRESS | Inspeccionar guardado (auditado) |
| `POST /api/gm/user/champion` | GRANT_CONTENT (+REVOKE_CONTENT) | Conceder/revocar; revocar exige `confirm:true` |
| `POST /api/gm/user/cosmetic` | GRANT_CONTENT (+REVOKE_CONTENT) | Skins/cromas |
| `POST /api/gm/user/currency` | MODIFY_CURRENCY | Oro/gemas; bajar exige confirmación |
| `POST /api/gm/user/level` | EDIT_USER_PROGRESS | Nivel; bajar exige confirmación |
| `POST /api/gm/user/arena` | EDIT_USER_PROGRESS | Desbloquear/bloquear arenas |
| `POST /api/gm/user/mailbox` | GRANT_CONTENT | Ítems y Sets por buzón (claves de catálogo validadas) |
| `POST /api/gm/user/repair` | EDIT_USER_PROGRESS | Reparar valores inválidos |
| `POST /api/gm/roles` | MANAGE_ROLES | Asignar roles (no al OWNER) |
| `GET /api/gm/audit` | VIEW_AUDIT_LOG | Registro con filtros |
| `GET /api/gm/founders` | VIEW_USERS | Estado de vinculación |
| `POST /api/gm/testlab/start` | TEST_CONTENT | Autoriza y audita una sesión de test |

Todas las escrituras usan **CAS** (`baseVersion`) y registran en el audit log: timestamp, actor, acción,
target, tipo, contenido, origen (`ADMIN_GRANT`, `EVENT_REWARD`, `PROGRESSION`, `PURCHASE`,
`FOUNDER_ENTITLEMENT`), motivo, valor anterior y nuevo. El log se guarda en el servidor (últimas 5000
entradas) y el panel solo lo lee.

## 5. Test Lab
Panel → Test Lab. Copia el guardado, bloquea `persistNow`, arma el escenario en memoria y al volver al
menú restaura la copia. Permite cualquier categoría y estado de publicación, sin poseerlo. No persiste
recursos, XP, botín ni progreso (la opción de "conservar con confirmación expresa" no se implementó a
propósito: hoy nunca persiste).

## 6. Infraestructura EVENT (sin campeones EVENT todavía)
`CHAMPION_EVENT_WINDOWS` en `js/data/champion-taxonomy.js`: `visible`, `start`, `end` (en datos, nunca en
código), `purchasableDuringEvent`, `specialPrice`, `grantable`, `keepAfterEvent`, `exclusiveSkin`,
`challengeReward`. La disponibilidad se calcula con `championAvailability(id, now)`; la propiedad de un
campeón EVENT requiere concesión del servidor (origen `EVENT_REWARD`), igual que los Fundadores.

## 7. Configuración de GitHub
El workflow `Champion entry balance` incluye las pruebas nuevas. Para bloquear merges con el check en
rojo, configurarlo como **requerido** en la protección de `main`.
