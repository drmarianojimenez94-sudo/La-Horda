# Game Master and Alpha operations

Implemented in `server/game-master.js`, with the existing account bearer authentication,
CORS policy, body limits, and global IP limiter. No payment processing exists.

## Deployment and authorization

`ADMIN_USERS` is the existing comma-separated account username allowlist. Only these
accounts receive role `OWNER`; an empty value disables owner access. Use an already
registered owner account. Usernames are matched server-side; frontend visibility never
grants permission. Existing `/api/admin/profile` and `/api/admin/level` remain compatible.

`DATABASE_URL` selects PostgreSQL. Without it, `DATA_DIR` must be on a persistent volume
for production. Ephemeral Render disks remain unsuitable for persistent accounts or
operations. No production reset, migration of existing progress, or live gift was run.

Two additive PostgreSQL tables are created: `horda_operations` (one JSONB state row) and
`horda_operation_snapshots` (immutable backup JSONB by UUID). No existing table is dropped,
rewritten, or emptied. File mode uses atomic `operations.json` plus separate atomic
`operation-snapshot-<uuid>.json` backups. Backups are not served over HTTP.

## HTTP contracts

All requests/responses are JSON. Owner endpoints return 401 without a session and 403
for a normal account. Account endpoints use `Authorization: Bearer <session token>`.

| Route | Contract |
|---|---|
| `GET /api/gm/status` | Authenticated player; `{owner,role}` (`OWNER` or null). |
| `GET /api/gm/config` | `{version,config,defaults}`. |
| `PUT /api/gm/config` | `{version,config}`; stale version returns 409. |
| `POST /api/gm/config/defaults` | `{version}`; explicit CAS restore to all multipliers 1. |
| `GET /api/world` | Public `{normalConfig,config,events,messages,serverTime,version}`. `config` is the normal base. Client applies active event modifiers for its arena/wave using server clock offset. |
| `GET/POST /api/gm/events` | List `{events}` or save an event by optional `id`. |
| `GET/POST /api/gm/messages` | List `{messages}` or save a scheduled message by optional `id`. |
| `GET /api/gm/catalog` | Trusted repository arena IDs, safe normal/elite enemy IDs, boss IDs. |
| `GET /api/gm/cosmetics` | Trusted repository cosmetics `{id,name,champion,type}`; 30 currently. |
| `GET /api/gm/dashboard` | Accounts, login activity, estimated active sessions/runs, product counters, dimensions and recent admin audit. |
| `GET /api/gm/players?q=` | At most 100 matching public account summaries; no email/password/session data. |
| `POST /api/gm/gift` | `{user:<username or all>,cosmetic:<catalog id>}` → `{granted,conflicts,missingSave}`. |
| `POST /api/gm/reset/preview` | `{user,fields}` → `{token,confirmation,fields,accounts:1,version,expires}`. |
| `POST /api/gm/reset/confirm` | `{token,confirmation}` → `{ok,version,snapshot}`. |
| `GET /api/chat` | Authenticated; `{messages,pinned}`. |
| `POST /api/chat` | Authenticated `{text}` → `{message}`; 8 messages per 10 seconds/account. |
| `POST /api/gm/chat/pin` | Owner `{id}`; null clears pin. |
| `POST /api/telemetry` | Public `{session,build,version,alpha,events:[...]}`; 30 events/batch, 60 batches/min/IP. |

Config supports `xp`, `gold`, `drop`, `difficulty`, `enemyHp`, `enemyDamage`, `bossHp`,
`eliteRate`, `spawnRate`. Ranges: 0.1–10, XP/gold up to 20. Unknown keys are rejected.
Normal configuration is never overwritten when an event starts or expires.

Event schema: `{id?,name,description,start,end,enabled,arenas:[],wave,multipliers:{},
enemies:[],announcement,banner}`. Times are epoch milliseconds; maximum interval 366 days.
Wave is integer 1–400. Invalid arena/enemy IDs and malformed lists are rejected, never
silently widened to all arenas. An empty arena list intentionally applies to all arenas.
Custom boss injection and automatic Set/cosmetic rewards are **not yet implemented**:
nonempty `boss`, `set`, or `cosmetic` return 422 `UNSUPPORTED_EVENT_REWARD_BOSS`. They require
arena-controller integration and trustworthy completion validation before activation.

Message schema: `{id?,type:news|banner|global,text,image,start,end,enabled}`. Images support
repository assets and HTTPS only. Rendering uses text content; remote images still contact
the selected image host. At most 100 events and 100 messages are retained; disable/edit an
existing entry by its ID. No accidental deletion on expiration.

## Progress safety

Gifts only grant cosmetic ownership (`cosmeticUnlocks`; `cromas` for chromas). They do not
change stats, gold, equipment or Set pieces. Each save uses its actual version as a CAS;
a concurrent device edit reports a conflict. Accounts without cloud saves are reported
as `missingSave`, not silently created with incomplete defaults. Bulk gifts are explicitly
best effort and report partial success; rerunning is idempotent for existing ownership.

Reset supports `championProgress`, `arenas`, `gold`, `inventory`, `cosmetics`, `codex`.
It applies to one account. Mass reset and champion-unlock reset are deliberately absent.
Inventory reset also removes legacy per-champion `inventory` / `_legacyInventory`, so
load-time migration cannot resurrect removed items. Champion progress resets the actual
`useLvl` / `useXp` skill and ultimate mastery fields. Arena reset clears legacy open flags
and marks arena migrations current, preventing legacy unlock resurrection. Cosmetics reset
selects the original appearance and removes direct ownership; it **preserves** inventory
and collection history. Completed Sets in either can grant their cosmetic again. Preview
returns this warning; permanent revocation of earned Set rewards is not implemented.
A preview lasts five minutes, belongs to the requesting owner, binds the save version,
and requires exact `REINICIAR <username>`. Confirmation is consumed once. A durable snapshot
is written **before** CAS changes the save; a race returns 409 without overwriting progress.
A snapshot may remain from a failed CAS, providing evidence rather than losing a backup.
Snapshots are stored separately so telemetry never rewrites progress backup payloads.
The accumulated backup cap is 20 MiB: reaching it fails closed and needs operator archival;
there is no automatic backup pruning or restore button. Existing local Alpha unlock flags
can still re-open content on the client and should not be confused with cloud reset failure.

## Telemetry and interpretation

Product telemetry contains aggregate counts only: no account ID, username, email, token,
IP address, session ID, message, stack trace, or freeform payload is persisted. `session`
is an ephemeral 32-hex client identifier used only in memory for 120-second presence.
Server restart clears presence. Chat and admin audit are separate operational records and
are not described as anonymous telemetry. Backups naturally contain player save data.

Event names are allowlisted. Accepted aliases: `run_started` → `arena_started`, `defeat` →
`death`, `skill` → `ability`; `pickup` is accepted separately. `tutorial_step`, `tutorial_step_complete`, and `tutorial_abandoned` aggregate a bounded `step` dimension keyed by event and step, enabling per-step funnel comparison. Unknown payload fields are
discarded. Safe scalar dimensions and numeric duration/level/wave are bounded. Daily
aggregates retain 400 days; lifetime totals survive progress resets and daily rolloff.
Each dimension is capped at 500 unique keys. Admin audit retains the most recent 2,000
entries; chat retains 200 (latest 80 returned), with one pinned message while retained.

Presence measures browser sessions, not unique people; active runs are estimates, not
unique multiplayer rooms. Login activity uses real account last-login timestamps (today
UTC, rolling 7 and 30 days); it does not claim anonymous unique visitors. Product events
are client-reported and untrusted, never authoritative for rewards or competitive ranking.
Counters for deaths count death events; callers should send one terminal outcome per run.
Averages use durations on terminal outcomes. No spectating is included.

## Verification

`node server/test-game-master.js` always uses a fresh temporary file store, ignoring any
production `DATABASE_URL`. It tests authentication, CORS, owner authorization, invalid
catalog IDs/config/schedules, event expiration, default restore, chat spam/pin, telemetry
payload privacy, lifecycle presence, gifts without stat changes, granular reset, backup
durability, replay rejection, stale CAS and concurrent config writes, and restart recovery.
The server npm suite includes it alongside accounts, relay and trades regression.
PostgreSQL adapter logic is implemented but was not exercised against a live PostgreSQL
instance in this execution environment. Do not claim a PostgreSQL integration pass.
