# Game Master and Alpha operations

Implemented in `server/game-master.js` using existing account bearer authentication,
CORS, body limits and IP limits. The premium currency (Brasas ✦, cosmetics only) lives in
`server/wallet.js`; real-money payments (`server/payments.js`) stay **disabled** until the owner
configures a provider. See `docs/production/PREMIUM_CURRENCY.md`.

## Deployment and owner policy

`server/operator-config.json` configures fallback operator **NanoGM**. At startup, the
server resolves that name to an **already existing** account ID and authorizes the immutable
ID thereafter. Missing account means no owner; public registration of that reserved name
is rejected, preventing signup takeover. No account, password or production environment was
created or modified. Explicit `ADMIN_USERS` overrides the fallback, including an empty
value which disables owners. The relay serves no static server files; deployments must
exclude the server directory from frontend static publication. UI visibility grants nothing.
Existing `/api/admin/profile` and `/api/admin/level` remain compatible.

`DATABASE_URL` selects PostgreSQL. Otherwise `DATA_DIR` must reside on persistent storage
for production. Ephemeral Render disks remain unsuitable. PostgreSQL adds only
`horda_operations` (JSONB state row) and `horda_operation_snapshots` (immutable backup by
UUID). No existing table is dropped or emptied. File mode writes atomic `operations.json`
and separate atomic `operation-snapshot-<uuid>.json` backups. Backups have no public route.
Operations serialize per process before PostgreSQL row locking, preventing pool exhaustion
by lock waiters while a mutation reads a save. Shutdown waits for queued writes.

## HTTP contracts

All payloads are JSON. Owner endpoints return 401 without a session or 403 for normal
accounts. Authenticated endpoints use `Authorization: Bearer <session token>`.

| Route | Contract |
|---|---|
| `GET /api/gm/status` | Authenticated `{owner,role}` (`OWNER` or null). |
| `GET /api/gm/config` | `{version,config,defaults}`. |
| `PUT /api/gm/config` | `{version,config}`; stale version returns 409. |
| `POST /api/gm/config/defaults` | `{version}`; restores normal multipliers and price overrides using CAS. |
| `GET /api/world` | Public `{normalConfig,config,events,messages,serverTime,version}`. `config` is the normal base; client applies active modifiers for its arena/wave with server clock offset. |
| `GET/POST /api/gm/events` | List `{events}` or save by optional `id`. |
| `GET/POST /api/gm/messages` | List `{messages}` or save scheduled message by optional `id`. |
| `GET /api/gm/catalog` | Trusted `arenas`, safe normal/elite `enemies`, `bosses`, `bossArenaMap`, `sets`, `priceCatalog`. |
| `GET /api/gm/cosmetics` | Trusted `{cosmetics:[{id,name,champion,type}]}`. |
| `GET /api/gm/dashboard` | Accounts, login activity, estimated active sessions/runs, anonymous product counters and recent administrative audit. |
| `GET /api/gm/players?q=` | At most 100 public account summaries, no email/password/session data. |
| `POST /api/gm/gift` | `{user:<name or all>,cosmetic}`; alternatively `users:[]` or `cohort:{eventId}` / `cohort:{createdBefore}` → `{granted,conflicts,missingSave}`. |
| `POST /api/gm/reset/preview` | `{user,fields}`, `user:"all"`, `users:[]` or `cohort` → frozen `{token,confirmation,fields,accounts,players,missingSave,expires,warnings}`. |
| `POST /api/gm/reset/confirm` | `{token,confirmation}` → `{ok,batchId,completed,conflicts,results}`; single account also returns `{version,snapshot}`. |
| `GET /api/gm/reset/batches` | Latest 50 reports by this owner; durable per-account results and snapshot IDs for recovery after network interruption. |
| `POST /api/events/start` | Authenticated `{eventId,arena}` → `{ticket,event,minDurationMs,expires,alreadyCompleted}`. |
| `POST /api/events/complete` | Authenticated `{ticket,wave,outcome:"victory",bossDefeated}` → `{ok,granted,alreadyGranted,cosmetic,cosmeticType,baseVersion,saveVersion}`. |
| `GET /api/chat` | Authenticated `{messages,pinned}`. |
| `POST /api/chat` | Authenticated `{text}` → `{message}`; 8 messages/10 seconds/account. |
| `POST /api/gm/chat/pin` | Owner `{id}`; null clears pin. |
| `POST /api/telemetry` | Public `{session,build,version,alpha,events:[]}`; 30 events/batch, 60 batches/min/IP. |

## Configuration and prices

Normal multipliers: `xp`, `gold`, `drop`, `difficulty`, `enemyHp`, `enemyDamage`, `bossHp`,
`eliteRate`, `spawnRate`. Ranges 0.1–10, XP/gold up to 20. Unknown keys are rejected. Events
never overwrite normal configuration, so expiration cannot leave temporary values behind.

`itemPrices`, `cosmeticPrices`, `championPrices` are maps from trusted keys in
`docs/production/shop-catalog.json` to integer gold prices 0–10,000,000. Unknown keys,
negative/fractional values are rejected. Empty maps restore authored defaults. Event
multipliers cannot change prices. Archetype keys apply across rarity choices. A skin
override prices the complete package; partial collections pay proportionally for missing
pieces. Without a skin override the cost sums effective missing-piece prices. Equipment
Set purchases use item prices, not cosmetic package prices. Discounts apply to the effective
price without reshuffling offers. Package purchases check funds/capacity before mutation;
a changed confirmation quote is rejected. No real currency is involved.

## Events, rewards and announcements

Event: `{id?,name,description,start,end,enabled,arenas:[],wave,multipliers:{},enemies:[],
boss,set,cosmetic,announcement,banner}`. Times are epoch milliseconds; interval at most
366 days. Wave is 1–10. Malformed lists and unknown IDs are rejected, never broadened
silently to every arena. An empty arena list intentionally means all arenas.

Boss events reuse the native encounter director. `bossArenaMap` advertises nine supported
boss IDs and their sole compatible arena; boss events require exactly that arena and wave
10. This is an event version of an existing boss, not a promise of a new exclusive boss.
Infernal's transforming director is deliberately excluded. Hielo accepts its terminal
`angel_caido_hielo` as completion of the `mago_hielo_cristal` encounter. Runtime Set selection
directs Set-tier rolls and guarantees the selected Set's first boss-drop piece. `cosmetic`
is a separate, purely visual ownership reward.

Tickets bind the account, arena and immutable event snapshot. Editing an event cannot
swap the reward of an in-flight ticket. Minimum server time is max(15 seconds, wave × 5
seconds); expiry is six hours or event end plus one hour, whichever is earlier. Completion
requires final victory, sufficient wave and matching boss outcome. The last three pending
tickets per player/event are retained to allow delayed retries. A durable claim is unique
per account/event. Concurrent and replayed claims never duplicate ownership. Saves use CAS;
the response supplies exact base/result versions. Boolean ownership remains idempotent
if a process fails between save persistence and receipt persistence. No stats/gold are
awarded by the claim API.

Combat remains Alpha client/host-authoritative: elapsed time and ticket validation are
**not anti-cheat or independently verified combat**. Anonymous telemetry grants nothing.
Authenticated participation is recorded separately from anonymous product metrics and
supports gifts to actual participants. A date cohort uses real account creation timestamps.

Message: `{id?,type:news|banner|global,text,image,start,end,enabled}`. Images accept repository
assets or HTTPS only. Text renders as text content. Remote images contact their selected
host. Up to 100 events and 100 messages are retained; edit/disable existing IDs. Expiration
does not erase operational records.

## Gifts and reset safety

Gifts write `cosmeticUnlocks` and, for chromas, `cromas`. They never alter stats, gold,
equipment or Set pieces. Each save uses CAS. Accounts without cloud saves are reported as
`missingSave`, not fabricated with incomplete defaults. Bulk gifts report partial success
and may be retried safely because ownership is boolean.

Reset fields: `championProgress`, `arenas`, `gold`, `inventory`, `cosmetics`, `codex`. Scope
can be one player, an explicit list, all existing accounts or a real cohort, up to 100
accounts. Champion-unlock reset remains absent. Preview freezes exact IDs and versions;
accounts created afterward are not added. All versions are preflighted before changing
any account, then **all** snapshots persist before save changes. Per-save CAS still applies.
A later race produces explicit partial results, not a false claim of cross-account atomicity.
Reports survive disconnection/restart; inspect prepared/failed/conflicted rows before a new
preview. A batch interrupted between save and report persistence may require comparing the
snapshot with the current save; it is never automatically replayed destructively.

Preview expires in five minutes, is owner-bound, and requires exact `REINICIAR <username>`
or `REINICIAR N CUENTAS`. Tokens are consumed once. Backup accumulation is capped at 20 MiB;
capacity fails closed and requires operator archival. There is no automatic pruning or
restore button. Snapshots live separately so telemetry does not rewrite save backups.

Inventory reset removes legacy champion `inventory` / `_legacyInventory`, preventing load
migration from resurrecting items. Progress resets real skill/ultimate `useLvl` / `useXp`.
Arena reset clears legacy unlock flags and marks arena migrations current. Client Alpha
unlock rules may still intentionally expose all arenas; that is separate from cloud reset.
Cosmetic reset selects the original appearance and clears direct ownership, preserving
inventory and collection history. Completed Sets can therefore grant their skin again;
preview explicitly warns about this. Permanent revocation of earned Set eligibility is
not implemented. Historical anonymous product counts survive every progress reset.

## Telemetry and limits

Persistent product telemetry is aggregate: no account ID, username, email, session token,
IP address, chat text, stack trace or arbitrary payload is saved. A 32-hex ephemeral client
`session` is held only in memory for 120-second presence; restart clears it. Chat, snapshots,
reward receipts and administrative audit are operational data, not anonymous telemetry.

Names are allowlisted. Aliases: `run_started`→`arena_started`, `defeat`→`death`, `skill`→
`ability`. `pickup` is separate. `tutorial_step`, `tutorial_step_complete`,
`tutorial_abandoned` aggregate `step` as `event:step`, allowing funnel comparison. Payload
fields and scalar dimensions are bounded; unknown fields are discarded. Daily counts keep
400 days, lifetime totals survive rolloff. Each dimension caps at 500 keys. Admin audit
keeps 2,000 entries; chat keeps 200 (latest 80 returned), one pin while its message remains.

Presence counts browser sessions, not unique people; active runs are estimates, not rooms.
Activity counts real account last-login (UTC today; rolling 7/30 days), not anonymous unique
visitors. Product events are client-reported, not authority for ranking or rewards. Send one
terminal outcome per run for accurate average duration and outcome counters. No spectating.

## Verification

`node server/test-game-master.js` always uses fresh temporary file storage, ignoring any
production DATABASE_URL. It covers auth/CORS, invalid config/catalogs, schedule expiration,
chat rate limits, telemetry privacy, persistence, gifts without stat changes, backup
correctness, granular/batch reset, stale and concurrent CAS, explicit partial results,
replayed/concurrent reward claims, account/ticket binding and immutable reward snapshots.

`node server/test-owner-policy.js` verifies existing NanoGM ID binding, missing-operator
fail-closed behavior, reserved registration, override/disable, relay non-exposure and
accurate persistent-file health. `npm test` includes both alongside accounts/relay/trades.
PostgreSQL logic is implemented but has not been exercised against a live PostgreSQL
instance here; no PostgreSQL integration pass is claimed. No production destructive action
or test-account creation was performed.

## Cloud playtest recovery and NanoGM login

Normal save loading no longer grants every champion level 40 or opens all arenas.
Existing progress is not silently deleted. In Cuenta, including the cloud/device conflict
screen, the authenticated player can choose **Borrar progreso de prueba y empezar de cero**.
After explicit confirmation, both copies are backed up in that browser before a fresh save
is uploaded with the cloud version (CAS, no forced write). A concurrent device change
refuses the reset. The account, password and OWNER identity remain intact. This resets
all game progress including inventory/cosmetics; backups remain local to the initiating
browser. The player chooses a new starter; other champions are locked at level 1.
The conflict screen also identifies the account/server, offers account switching, and
shows the admin shortcut only after the server confirms OWNER.

If NanoGM cannot log in, a main-branch merge does not create the reserved account or
change its password. The infrastructure operator must run `node server/recover-owner.js`
in the **principal Fondal relay** with its existing `DATABASE_URL` (or explicit persistent
`DATA_DIR`). Supply the new 12–128 character password through stdin from a secret manager;
never use a command-line argument, commit it, or paste it into logs. The CLI creates only
the reserved configured operator if missing, or rotates that account's password while
retaining its ID and save. Old sessions are revoked. Restart the relay afterward to bind
the operator ID. Public registration cannot claim this name. An `ADMIN_USERS` override
must be absent or explicitly include NanoGM; an empty value intentionally disables OWNER.
Do not run against a separate Render test database to recover a Fondal account.

Validation: `node server/test-owner-recovery.js` and
`CHROMIUM_PATH=/path/to/chromium node tools/alpha/cloud-recovery.js` cover account retention,
session revocation, no automatic level grants, backups, CAS rejection, explicit reset,
and the owner shortcut during a sync conflict. Production credentials and data are not
modified by these tests.

### Visible operator entry and diagnostics

After a successful NanoGM login, the account view offers **Entrar al panel de
administración** and **Continuar como jugador** before completing the player flow.
The operator entry remains visible even if the capability request fails; the view
explains startup/unavailability (503), expired authentication (401), an older relay
without the GM route (404), or a missing owner binding. The GM route rechecks the
capability and never renders protected panels without server-confirmed OWNER.
Showing the entry based on the reserved username grants no authorization.

Authenticated `/api/gm/status` now includes `reason`: `OWNER`, `PLAYER`,
`OWNER_EXCLUDED`, `OWNER_NOT_BOUND`, or `OWNER_ID_MISMATCH`. This diagnostic exposes
no credentials or administrator list. Explicit `ADMIN_USERS` and immutable ID
checks retain their existing behavior. A retry can recover from a failed capability
request without logging out or duplicating denial dialogs.
