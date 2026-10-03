"use strict";
/* ============================================================
   LA HORDA — CUENTAS DE USUARIO (API HTTP en el MISMO servidor del relay)

   Qué hace:
   - Crear cuenta, entrar, salir y "¿quién soy?" (sesión con token aleatorio que vence).
   - Guardado en la nube: el progreso del juego (el mismo JSON que queda en localStorage)
     con número de versión, para que dos dispositivos no se pisen sin avisar (409 CONFLICT).
   - Nombre visible (el que se usa en la Sala multijugador).

   Seguridad:
   - Contraseñas con crypto.scrypt y una sal aleatoria por usuario; nunca se guardan en claro.
     Se comparan en tiempo constante (crypto.timingSafeEqual).
   - Tokens de sesión de 32 bytes aleatorios (crypto.randomBytes). En el almacenamiento solo
     queda su SHA-256: si alguien se lleva la base, no se lleva las sesiones.
   - Límite de intentos fallidos por usuario y por IP (entrar) y de cuentas nuevas por IP.
   - Tamaños acotados (el guardado, como mucho SAVE_MAX_BYTES) y CORS solo para los orígenes
     permitidos (la misma lista ALLOWED_ORIGINS del relay).

   Dónde se guarda (adaptador):
   - DATABASE_URL presente  -> Postgres (las tablas se crean solas al arrancar).
   - sin DATABASE_URL       -> archivos JSON en DATA_DIR (default server/data), escritos de forma
                               atómica (archivo temporal + rename). OJO: en el plan gratuito de
                               Render el disco se BORRA en cada redeploy, reinicio o cuando el
                               servicio se duerme (15 min sin uso): las cuentas se pierden. Sirve
                               para probar en la compu o con un Disco persistente de Render (pago)
                               montado en DATA_DIR. /health lo avisa. Ver docs/ACCOUNTS_DEPLOY.md.

   Variables de entorno (todas opcionales):
     DATABASE_URL        postgres://usuario:clave@host:5432/base (Render Postgres, Neon, Supabase...)
     PGSSL               "0" para no usar SSL con la base, "1" para forzarlo (default: automático)
     DATA_DIR            carpeta de los archivos cuando no hay base de datos
     SESSION_DAYS        días que dura una sesión sin usarse (default 60)
     AUTH_MAX_FAILS      intentos fallidos por usuario antes de frenar (default 8 cada 15 min)
     AUTH_MAX_FAILS_IP   intentos fallidos por IP antes de frenar (default 30 cada 15 min)
     REGISTER_MAX_IP     cuentas nuevas por IP por hora (default 10)
     TRUST_PROXY         "1" para leer la IP real de los encabezados del proxy (en Render es automático)

   RANKING SEMANAL DE LA HORDA INFINITA (mismo adaptador: Postgres o archivo leaderboard.json):
   - GET  /api/leaderboard[?week=2026-W40&guardian=mago&limit=50]  top 50 de la semana (la actual por
     defecto), el mejor puntaje de cada cuenta (o el mejor con ese guardián). Lo ve cualquiera; con
     sesión, además devuelve "me" (tu puesto aunque estés fuera del top).
   - POST /api/leaderboard/submit  (con sesión) {score, round, guardian, week, durationMs}. Solo se
     guarda si mejora lo tuyo de esa semana con ese guardián. Validación de plausibilidad en el servidor
     (lbCheck): la semana es la actual (o la anterior, unas horas después del cambio), la duración alcanza
     para las rondas jugadas, el puntaje no supera un techo por ronda y por minuto, y la partida entra en
     el tiempo que pasó desde tu envío anterior. Límite de envíos por cuenta.
   - La semana es la ISO en UTC, la MISMA de los mutadores semanales (js/systems/endless.js).
   ============================================================ */
const crypto = require("crypto");
const adminLevels=require("./admin-levels");
const gameMaster = require("./game-master");
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");

const SAVE_MAX_BYTES = 512 * 1024;                  // guardado serializado, como mucho ~512 KB
const BODY_MAX_BYTES = SAVE_MAX_BYTES + 16 * 1024;  // cuerpo del pedido (guardado + campos)
const SMALL_BODY_BYTES = 4 * 1024;                  // registro, login, perfil
const SESSION_TTL_MS = Math.max(1, parseFloat(process.env.SESSION_DAYS || "60")) * 24 * 3600 * 1000;
const FAIL_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS_USER = parseInt(process.env.AUTH_MAX_FAILS || "8", 10);
const MAX_FAILS_IP = parseInt(process.env.AUTH_MAX_FAILS_IP || "30", 10);
const REGISTER_WINDOW_MS = 60 * 60 * 1000;
const MAX_REGISTER_IP = parseInt(process.env.REGISTER_MAX_IP || "10", 10);
const API_WINDOW_MS = 60 * 1000, MAX_API_IP = 300; // freno general contra inundaciones
const TRUST_PROXY = process.env.TRUST_PROXY === "1" || !!process.env.RENDER;
// scrypt: N=16384 r=8 p=1 (16 MB de memoria, ~50-150 ms por intento: caro para fuerza bruta)
const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };
const USER_RE = /^[\p{L}\p{N}_.-]{3,16}$/u;
const EMAIL_RE = /^[^\s@<>]{1,64}@[^\s@<>]{1,100}\.[^\s@<>]{2,20}$/;

/* ---------------- utilidades ---------------- */
function scryptAsync(pass, salt, o){
  return new Promise((ok, ko) => crypto.scrypt(pass, salt, o.keylen, { N: o.N, r: o.r, p: o.p, maxmem: 64 * 1024 * 1024 },
    (err, key) => err ? ko(err) : ok(key)));
}
async function hashPassword(pass){
  const salt = crypto.randomBytes(16);
  const key = await scryptAsync(pass, salt, SCRYPT);
  return ["scrypt", SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString("base64"), key.toString("base64")].join("$");
}
async function verifyPassword(pass, stored){
  const parts = String(stored || "").split("$");
  if(parts.length !== 6 || parts[0] !== "scrypt") return false;
  const o = { N: +parts[1], r: +parts[2], p: +parts[3] };
  const want = Buffer.from(parts[5], "base64");
  const got = await scryptAsync(pass, Buffer.from(parts[4], "base64"), Object.assign(o, { keylen: want.length }));
  return got.length === want.length && crypto.timingSafeEqual(got, want);
}
// hash de relleno: si el usuario no existe se hace el mismo trabajo (no se delata por el tiempo)
let DUMMY_HASH = null;
async function dummyHash(){ if(!DUMMY_HASH) DUMMY_HASH = await hashPassword("la-horda-" + crypto.randomBytes(8).toString("hex")); return DUMMY_HASH; }
function sha256(s){ return crypto.createHash("sha256").update(s).digest("hex"); }
function newToken(){ return crypto.randomBytes(32).toString("hex"); }
function userKey(u){ return String(u || "").normalize("NFC").toLowerCase(); }
function cleanName(s, max){ return String(s == null ? "" : s).normalize("NFC").replace(/[<>\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim().slice(0, max); }

// Resumen del guardado (para el aviso de conflicto: "nube vs este dispositivo"). Tolerante: si el
// formato cambia, devuelve lo que pueda.
function summarize(save){
  const s = { guardians: 0, maxLevel: 0, gold: 0, arenas: 0 };
  try{
    const ch = save && save.champions || {};
    for(const k in ch){ const c = ch[k] || {}; if(c.unlocked){ s.guardians++; s.maxLevel = Math.max(s.maxLevel, c.level | 0); } }
    s.gold = Math.max(0, Math.floor(+save.gold || 0));
    const ac = save && save.arenasCleared || {};
    for(const k in ac) if(ac[k]) s.arenas++;
  }catch(e){}
  return s;
}

/* ---------------- ranking semanal: semana, orden y plausibilidad ---------------- */
const LB_TOP = 50;
const LB_KEEP_WEEKS = 12;                         // archivo: semanas que se conservan
const LB_GRACE_MS = 6 * 3600 * 1000;              // una partida que cruzó el cambio de semana todavía entra
const LB_WINDOW_MS = 10 * 60 * 1000, LB_MAX_SUBMITS = 10, LB_MIN_GAP_MS = 8000;
const LB_ROUND_MIN_MS = 10000;                    // una ronda dura 26 s (20,8 s con "Sin respiro"): 10 s es holgado
const LB_MAX_ROUND = 400, LB_MAX_MS = 12 * 3600 * 1000;
const WEEK_RE = /^\d{4}-W\d{2}$/;
const GUARDIAN_RE = /^[a-z][a-z0-9_]{1,23}$/;
// Semana ISO en UTC ("2026-W40"): la misma cuenta que endlessWeekKey del cliente.
function lbWeekKey(date){
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7; d.setUTCDate(d.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const wk = Math.ceil(((d - y0) / 86400000 + 1) / 7);
  return d.getUTCFullYear() + "-W" + String(wk).padStart(2, "0");
}
// Lunes 00:00 UTC de la semana de `now` (ms).
function lbWeekStart(now){
  const d = new Date(now), day = d.getUTCDay() || 7;
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - (day - 1));
}
// Techo de puntaje para una ronda y una duración. Generoso a propósito (x10-20 sobre lo que se ve
// jugando): frena lo imposible, no al que juega muy bien. Espeja js/data/endless.js (score):
//   bajas: hasta ~400 por minuto a ~70 pts de base (élite con rol) -> 28.000/min
//   jefes y subjefes, rescates y cierre de ronda: hasta ~4.000 por ronda
//   todo por (1 + 0,10 por ronda) y por el mutador más caro de dos (x1,5)
function lbMaxScore(round, ms){
  const min = Math.max(0, ms) / 60000, mult = 1.5 * (1 + 0.10 * (round - 1));
  return Math.ceil(mult * (28000 * min + 4000 * round) + 1.5 * 150 * round * (round + 1) / 2);
}
// Devuelve null si el envío es creíble, o {error, msg}.
function lbCheck(e, now){
  if(!Number.isInteger(e.round) || e.round < 1 || e.round > LB_MAX_ROUND) return { error: "BAD_ROUND", msg: "Ronda inválida." };
  if(!Number.isInteger(e.score) || e.score < 0 || e.score > 2e9) return { error: "BAD_SCORE", msg: "Puntaje inválido." };
  if(!Number.isInteger(e.durationMs) || e.durationMs < 0 || e.durationMs > LB_MAX_MS) return { error: "BAD_DURATION", msg: "Duración inválida." };
  if(!GUARDIAN_RE.test(e.guardian)) return { error: "BAD_GUARDIAN", msg: "Guardián inválido." };
  const cur = lbWeekKey(new Date(now)), prev = lbWeekKey(new Date(now - 7 * 86400000));
  if(e.week !== cur && !(e.week === prev && now - lbWeekStart(now) < LB_GRACE_MS)) return { error: "WEEK_CLOSED", msg: "Esa semana del ranking ya cerró." };
  if(e.durationMs < (e.round - 1) * LB_ROUND_MIN_MS) return { error: "IMPLAUSIBLE", msg: "Demasiadas rondas para tan poco tiempo." };
  if(e.score > lbMaxScore(e.round, e.durationMs)) return { error: "IMPLAUSIBLE", msg: "Ese puntaje no es posible para esa ronda y ese tiempo." };
  return null;
}
// Orden de la tabla: puntaje, después ronda, después el más rápido, después el primero en llegar.
function lbCmp(a, b){ return (b.score - a.score) || (b.round - a.round) || (a.durationMs - b.durationMs) || (a.at - b.at); }
// El mejor de cada cuenta (filas de todas sus combinaciones cuenta+guardián), ordenado.
function lbBestPerUser(rows){
  const best = new Map();
  for(const r of rows){ const o = best.get(r.userId); if(!o || lbCmp(r, o) < 0) best.set(r.userId, r); }
  return [...best.values()].sort(lbCmp);
}

/* ---------------- límite de intentos (en memoria) ---------------- */
class Limiter {
  constructor(){ this.m = new Map(); }
  count(key){ const e = this.m.get(key); return e && e.until > Date.now() ? e.n : 0; }
  retryAfter(key){ const e = this.m.get(key); return e ? Math.max(1, Math.ceil((e.until - Date.now()) / 1000)) : 0; }
  hit(key, windowMs){
    const now = Date.now(); let e = this.m.get(key);
    if(!e || e.until <= now){ e = { n: 0, until: now + windowMs }; this.m.set(key, e); }
    e.n++; return e.n;
  }
  reset(key){ this.m.delete(key); }
  sweep(){ const now = Date.now(); for(const [k, e] of this.m) if(e.until <= now) this.m.delete(k); }
}

/* ============================================================
   ALMACENAMIENTO: archivos JSON (sin base de datos)
   accounts.json = usuarios + sesiones; saves/<id>.json = un guardado por usuario.
   ============================================================ */
async function writeAtomic(file, str){
  const tmp = file + "." + process.pid + "." + crypto.randomBytes(4).toString("hex") + ".tmp";
  const fh = await fsp.open(tmp, "w");
  try{ await fh.writeFile(str); await fh.sync(); } finally { await fh.close(); }
  await fsp.rename(tmp, file); // rename es atómico: nunca queda un archivo a medio escribir
}
function fileStore(dir){
  const file = path.join(dir, "accounts.json");
  const savesDir = path.join(dir, "saves");
  let db = { nextId: 1, users: {}, sessions: {} };
  const byKey = new Map();          // usuario en minúsculas -> id
  const saveMeta = new Map();       // id -> {version, updatedAt, summary} (en memoria, para el control de versión)
  let gmChain = Promise.resolve();
  let writing = null, again = false;
  function flush(){
    if(writing){ again = true; return writing; }
    writing = (async () => {
      do { again = false; await writeAtomic(file, JSON.stringify(db)); } while(again);
    })().finally(() => { writing = null; });
    return writing;
  }
  const saveFile = id => path.join(savesDir, String(id) + ".json");
  const saveChains = new Map();     // escrituras de un mismo guardado, en fila
  // ranking: leaderboard.json = {weeks: {"2026-W40": {"<id>|<guardián>": {score, round, durationMs, at}}}}
  const lbFile = path.join(dir, "leaderboard.json");
  let lb = { weeks: {} }, lbWriting = null, lbAgain = false;
  function lbFlush(){
    if(lbWriting){ lbAgain = true; return lbWriting; }
    lbWriting = (async () => {
      do { lbAgain = false; await writeAtomic(lbFile, JSON.stringify(lb)); } while(lbAgain);
    })().finally(() => { lbWriting = null; });
    return lbWriting;
  }
  function lbRows(week, guardian){
    const W = lb.weeks[week] || {}, out = [];
    for(const k in W){
      const i = k.indexOf("|"), userId = +k.slice(0, i), g = k.slice(i + 1);
      if(guardian && g !== guardian) continue;
      out.push(Object.assign({ userId, guardian: g }, W[k]));
    }
    return lbBestPerUser(out);
  }
  const lbName = id => { const u = db.users[id]; return u ? (u.name || u.user) : "?"; };
  async function loadMeta(id){
    if(saveMeta.has(id)) return saveMeta.get(id);
    let meta = null;
    try{ const j = JSON.parse(await fsp.readFile(saveFile(id), "utf8")); meta = { version: j.version | 0, updatedAt: +j.updatedAt || 0, summary: j.summary || null }; }catch(e){}
    if(!saveMeta.has(id)) saveMeta.set(id, meta);
    return saveMeta.get(id);
  }
  return {
    kind: "file", persistent: false,
    async listUsers(){ return Object.values(db.users).map(u=>({...u})); },
    async gmRead(){ try{return JSON.parse(await fsp.readFile(path.join(dir,"operations.json"),"utf8"));}catch(e){if(e.code!=="ENOENT")throw e;return null;} },
    async gmUpdate(fn){
      const job=gmChain.catch(()=>{}).then(async()=>{const state=await this.gmRead();const result=await fn(state, snapshot=>writeAtomic(path.join(dir,"operation-snapshot-"+snapshot.id+".json"),JSON.stringify(snapshot)));await writeAtomic(path.join(dir,"operations.json"),JSON.stringify(result.state));return result.value;});
      gmChain=job;return job;
    },
    async init(){
      await fsp.mkdir(savesDir, { recursive: true });
      try{ db = JSON.parse(await fsp.readFile(file, "utf8")); }
      catch(e){ if(e.code !== "ENOENT") throw new Error("accounts.json ilegible: " + e.message); }
      db.users = db.users || {}; db.sessions = db.sessions || {}; db.nextId = db.nextId || 1;
      for(const id in db.users) byKey.set(db.users[id].userKey, +id);
      try{ lb = JSON.parse(await fsp.readFile(lbFile, "utf8")); }
      catch(e){ if(e.code !== "ENOENT") throw new Error("leaderboard.json ilegible: " + e.message); }
      if(!lb || typeof lb.weeks !== "object") lb = { weeks: {} };
      // restos de una escritura cortada a la mitad
      for(const d of [dir, savesDir]) for(const f of await fsp.readdir(d)) if(f.endsWith(".tmp")) fsp.unlink(path.join(d, f)).catch(() => {});
    },
    async createUser(u){
      if(byKey.has(u.userKey)) { const e = new Error("EXISTS"); e.code = "EXISTS"; throw e; }
      const id = db.nextId++;
      db.users[id] = Object.assign({ id }, u);
      byKey.set(u.userKey, id);
      await flush();
      return db.users[id];
    },
    async getUserByKey(k){ const id = byKey.get(k); return id ? db.users[id] : null; },
    async getUser(id){ return db.users[id] || null; },
    async updateUser(id, fields){ if(!db.users[id]) return null; Object.assign(db.users[id], fields); await flush(); return db.users[id]; },
    async createSession(s){ db.sessions[s.tokenHash] = s; await flush(); },
    async getSession(h){ return db.sessions[h] || null; },
    async touchSession(h, expiresAt){ if(db.sessions[h]){ db.sessions[h].expiresAt = expiresAt; await flush(); } },
    async deleteSession(h){ if(db.sessions[h]){ delete db.sessions[h]; await flush(); } },
    async deleteUserSessions(id){ for(const h in db.sessions) if(db.sessions[h].userId === id) delete db.sessions[h]; await flush(); },
    async sweepSessions(now){ let n = 0; for(const h in db.sessions) if(db.sessions[h].expiresAt <= now){ delete db.sessions[h]; n++; } if(n) await flush(); return n; },
    async getSaveMeta(id){ return loadMeta(id); },
    async getSave(id){
      const meta = await loadMeta(id);
      if(!meta) return null;
      try{ const j = JSON.parse(await fsp.readFile(saveFile(id), "utf8")); return { data: j.data, version: j.version | 0, updatedAt: +j.updatedAt || 0, summary: j.summary || null }; }
      catch(e){ return null; }
    },
    // control de versión optimista: solo escribe si la versión de la nube es la que el cliente conocía
    async putSave(id, dataStr, summary, baseVersion, force){
      const meta = await loadMeta(id);
      const cur = meta ? meta.version : 0;
      if(!force && cur !== baseVersion) return { conflict: true, current: meta };
      const next = { version: cur + 1, updatedAt: Date.now(), summary };
      saveMeta.set(id, next);    // se reserva la versión ANTES de esperar al disco (atómico en un proceso)
      const prev = saveChains.get(id) || Promise.resolve();
      const job = prev.catch(() => {}).then(() => writeAtomic(saveFile(id), JSON.stringify(Object.assign({ data: dataStr }, next))));
      saveChains.set(id, job);
      await job;
      if(saveChains.get(id) === job) saveChains.delete(id);
      return { ok: true, version: next.version, updatedAt: next.updatedAt };
    },
    // ranking: guarda solo si mejora lo de esa cuenta con ese guardián esa semana
    async lbPut(week, userId, guardian, e){
      const W = lb.weeks[week] || (lb.weeks[week] = {}), k = userId + "|" + guardian, prev = W[k];
      const row = { score: e.score, round: e.round, durationMs: e.durationMs, at: e.at };
      const improved = !prev || lbCmp(row, prev) < 0;
      if(improved){
        W[k] = row;
        const weeks = Object.keys(lb.weeks).sort();
        while(weeks.length > LB_KEEP_WEEKS) delete lb.weeks[weeks.shift()];
        await lbFlush();
      }
      return { improved };
    },
    async lbTop(week, guardian, limit){
      return lbRows(week, guardian).slice(0, limit).map(r => Object.assign({ name: lbName(r.userId) }, r));
    },
    async lbRank(week, guardian, userId){
      const rows = lbRows(week, guardian), i = rows.findIndex(r => r.userId === userId);
      return { total: rows.length, rank: i + 1, row: i >= 0 ? Object.assign({ name: lbName(userId) }, rows[i]) : null };
    },
    async lastSubmitAt(userId){
      let t = 0;
      for(const w in lb.weeks){ const W = lb.weeks[w]; for(const k in W) if(k.startsWith(userId + "|") && W[k].at > t) t = W[k].at; }
      return t;
    },
    async close(){ await gmChain.catch(()=>{}); if(writing) await writing; if(lbWriting) await lbWriting; }
  };
}

/* ============================================================
   ALMACENAMIENTO: Postgres (DATABASE_URL)
   ============================================================ */
function pgConfig(url){
  // el SSL lo decidimos acá (y no con ?sslmode= en la URL, que cada versión de "pg" interpreta
  // distinto): las direcciones internas de Render (sin puntos, ej. dpg-xxxx-a) van sin SSL; las
  // externas (Neon, Supabase, Render desde afuera) con SSL.
  let u; try{ u = new URL(url); }catch(e){ throw new Error("DATABASE_URL no es una dirección válida"); }
  const mode = (u.searchParams.get("sslmode") || "").toLowerCase();
  u.searchParams.delete("sslmode");
  let ssl;
  if(process.env.PGSSL === "0" || mode === "disable") ssl = false;
  else if(process.env.PGSSL === "1" || mode) ssl = { rejectUnauthorized: false };
  else ssl = (u.hostname.includes(".") && u.hostname !== "127.0.0.1") ? { rejectUnauthorized: false } : false;
  if(u.searchParams.get("host")) ssl = false; // socket local (pruebas)
  return { connectionString: u.toString(), ssl, max: 5, idleTimeoutMillis: 30000, connectionTimeoutMillis: 10000 };
}
function pgStore(url){
  const { Pool } = require("pg");
  const pool = new Pool(pgConfig(url));
  let gmChain = Promise.resolve(); // avoid exhausting the pool with row-lock waiters
  pool.on("error", () => {}); // una conexión inactiva que se corta no tumba el servidor
  const q = (text, params) => pool.query(text, params);
  const rowUser = r => r && { id: Number(r.id), userKey: r.user_key, user: r.username, name: r.display_name, email: r.email,
    passHash: r.pass_hash, createdAt: Number(r.created_at), lastLogin: Number(r.last_login || 0) };
  const rowMeta = r => r && { version: r.version | 0, updatedAt: Number(r.updated_at), summary: r.summary ? JSON.parse(r.summary) : null };
  return {
    kind: "postgres", persistent: true,
    async listUsers(){return (await q("SELECT * FROM horda_users ORDER BY id")).rows.map(rowUser);},
    async gmRead(){const r=await q("SELECT data FROM horda_operations WHERE id=1");return r.rows[0]?.data||null;},
    async gmUpdate(fn){const job=gmChain.catch(()=>{}).then(async()=>{const c=await pool.connect();try{
      await c.query("BEGIN");await c.query("INSERT INTO horda_operations(id,data) VALUES(1,'null'::jsonb) ON CONFLICT DO NOTHING");
      const r=await c.query("SELECT data FROM horda_operations WHERE id=1 FOR UPDATE");
      const result=await fn(r.rows[0].data, snapshot=>c.query("INSERT INTO horda_operation_snapshots(id,data) VALUES($1,$2::jsonb)",[snapshot.id,JSON.stringify(snapshot)]));await c.query("UPDATE horda_operations SET data=$1::jsonb WHERE id=1",[JSON.stringify(result.state)]);
      await c.query("COMMIT");return result.value;
    }catch(e){await c.query("ROLLBACK");throw e;}finally{c.release();}});gmChain=job;return job;},
    async init(){
      await q(`CREATE TABLE IF NOT EXISTS horda_operations (id INTEGER PRIMARY KEY CHECK(id=1), data JSONB NOT NULL)`);
      await q(`CREATE TABLE IF NOT EXISTS horda_operation_snapshots (id TEXT PRIMARY KEY, data JSONB NOT NULL)`);
      await q(`CREATE TABLE IF NOT EXISTS horda_users (
        id BIGSERIAL PRIMARY KEY, user_key TEXT UNIQUE NOT NULL, username TEXT NOT NULL, display_name TEXT,
        email TEXT, pass_hash TEXT NOT NULL, created_at BIGINT NOT NULL, last_login BIGINT)`);
      await q(`CREATE TABLE IF NOT EXISTS horda_sessions (
        token_hash TEXT PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES horda_users(id) ON DELETE CASCADE,
        created_at BIGINT NOT NULL, expires_at BIGINT NOT NULL)`);
      await q(`CREATE INDEX IF NOT EXISTS horda_sessions_exp ON horda_sessions (expires_at)`);
      await q(`CREATE TABLE IF NOT EXISTS horda_saves (
        user_id BIGINT PRIMARY KEY REFERENCES horda_users(id) ON DELETE CASCADE, data TEXT NOT NULL,
        summary TEXT, version INTEGER NOT NULL, updated_at BIGINT NOT NULL)`);
      // ranking semanal de la Horda Infinita: una fila por cuenta + guardián + semana (la mejor)
      await q(`CREATE TABLE IF NOT EXISTS horda_leaderboard (
        week TEXT NOT NULL, user_id BIGINT NOT NULL REFERENCES horda_users(id) ON DELETE CASCADE, guardian TEXT NOT NULL,
        score BIGINT NOT NULL, round INTEGER NOT NULL, duration_ms BIGINT NOT NULL, created_at BIGINT NOT NULL,
        PRIMARY KEY (week, user_id, guardian))`);
      await q(`CREATE INDEX IF NOT EXISTS horda_leaderboard_week_score ON horda_leaderboard (week, score DESC)`);
    },
    async createUser(u){
      try{
        const r = await q(`INSERT INTO horda_users (user_key, username, display_name, email, pass_hash, created_at, last_login)
          VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`, [u.userKey, u.user, u.name, u.email || null, u.passHash, u.createdAt, u.lastLogin || null]);
        return rowUser(r.rows[0]);
      }catch(e){ if(e.code === "23505"){ const x = new Error("EXISTS"); x.code = "EXISTS"; throw x; } throw e; }
    },
    async getUserByKey(k){ return rowUser((await q(`SELECT * FROM horda_users WHERE user_key=$1`, [k])).rows[0]); },
    async getUser(id){ return rowUser((await q(`SELECT * FROM horda_users WHERE id=$1`, [id])).rows[0]); },
    async updateUser(id, f){
      const map = { name: "display_name", email: "email", lastLogin: "last_login", passHash: "pass_hash" };
      const sets = [], vals = [id];
      for(const k in f) if(map[k]){ vals.push(f[k]); sets.push(`${map[k]}=$${vals.length}`); }
      if(!sets.length) return this.getUser(id);
      return rowUser((await q(`UPDATE horda_users SET ${sets.join(",")} WHERE id=$1 RETURNING *`, vals)).rows[0]);
    },
    async createSession(s){ await q(`INSERT INTO horda_sessions (token_hash, user_id, created_at, expires_at) VALUES ($1,$2,$3,$4)`, [s.tokenHash, s.userId, s.createdAt, s.expiresAt]); },
    async getSession(h){
      const r = (await q(`SELECT * FROM horda_sessions WHERE token_hash=$1`, [h])).rows[0];
      return r && { tokenHash: r.token_hash, userId: Number(r.user_id), createdAt: Number(r.created_at), expiresAt: Number(r.expires_at) };
    },
    async touchSession(h, exp){ await q(`UPDATE horda_sessions SET expires_at=$2 WHERE token_hash=$1`, [h, exp]); },
    async deleteSession(h){ await q(`DELETE FROM horda_sessions WHERE token_hash=$1`, [h]); },
    async deleteUserSessions(id){ await q(`DELETE FROM horda_sessions WHERE user_id=$1`, [id]); },
    async sweepSessions(now){ return (await q(`DELETE FROM horda_sessions WHERE expires_at <= $1`, [now])).rowCount; },
    async getSaveMeta(id){ return rowMeta((await q(`SELECT version, updated_at, summary FROM horda_saves WHERE user_id=$1`, [id])).rows[0]); },
    async getSave(id){
      const r = (await q(`SELECT * FROM horda_saves WHERE user_id=$1`, [id])).rows[0];
      return r ? Object.assign({ data: r.data }, rowMeta(r)) : null;
    },
    async putSave(id, dataStr, summary, baseVersion, force){
      const now = Date.now(), sum = JSON.stringify(summary);
      let r;
      if(force){
        r = await q(`INSERT INTO horda_saves (user_id, data, summary, version, updated_at) VALUES ($1,$2,$3,1,$4)
          ON CONFLICT (user_id) DO UPDATE SET data=EXCLUDED.data, summary=EXCLUDED.summary, version=horda_saves.version+1, updated_at=EXCLUDED.updated_at
          RETURNING version, updated_at`, [id, dataStr, sum, now]);
      } else if(baseVersion === 0){
        r = await q(`INSERT INTO horda_saves (user_id, data, summary, version, updated_at) VALUES ($1,$2,$3,1,$4)
          ON CONFLICT (user_id) DO NOTHING RETURNING version, updated_at`, [id, dataStr, sum, now]);
      } else {
        // UPDATE condicional: si otro dispositivo ya subió una versión nueva, no pisa nada
        r = await q(`UPDATE horda_saves SET data=$2, summary=$3, version=version+1, updated_at=$4
          WHERE user_id=$1 AND version=$5 RETURNING version, updated_at`, [id, dataStr, sum, now, baseVersion]);
      }
      if(!r.rows.length) return { conflict: true, current: await this.getSaveMeta(id) };
      return { ok: true, version: r.rows[0].version | 0, updatedAt: Number(r.rows[0].updated_at) };
    },
    // ranking: UPSERT condicional (mismo orden que lbCmp: puntaje, ronda, el más rápido)
    async lbPut(week, userId, guardian, e){
      const r = await q(`INSERT INTO horda_leaderboard (week, user_id, guardian, score, round, duration_ms, created_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        ON CONFLICT (week, user_id, guardian) DO UPDATE SET score=EXCLUDED.score, round=EXCLUDED.round,
          duration_ms=EXCLUDED.duration_ms, created_at=EXCLUDED.created_at
        WHERE EXCLUDED.score > horda_leaderboard.score
           OR (EXCLUDED.score = horda_leaderboard.score AND EXCLUDED.round > horda_leaderboard.round)
           OR (EXCLUDED.score = horda_leaderboard.score AND EXCLUDED.round = horda_leaderboard.round AND EXCLUDED.duration_ms < horda_leaderboard.duration_ms)
        RETURNING week`, [week, userId, guardian, e.score, e.round, e.durationMs, e.at]);
      return { improved: r.rows.length > 0 };
    },
    // el mejor de cada cuenta (DISTINCT ON) de esa semana, opcionalmente con un guardián
    _lbBest(guardian){
      return `SELECT DISTINCT ON (user_id) user_id, guardian, score, round, duration_ms, created_at FROM horda_leaderboard
        WHERE week=$1 ${guardian ? "AND guardian=$2" : ""} ORDER BY user_id, score DESC, round DESC, duration_ms ASC, created_at ASC`;
    },
    _lbRow(r){ return r && { userId: Number(r.user_id), guardian: r.guardian, score: Number(r.score), round: r.round | 0,
      durationMs: Number(r.duration_ms), at: Number(r.created_at), name: r.display_name || r.username || "?" }; },
    async lbTop(week, guardian, limit){
      const p = guardian ? [week, guardian, limit] : [week, limit];
      const r = await q(`WITH best AS (${this._lbBest(guardian)})
        SELECT b.*, u.display_name, u.username FROM best b JOIN horda_users u ON u.id=b.user_id
        ORDER BY b.score DESC, b.round DESC, b.duration_ms ASC, b.created_at ASC LIMIT $${p.length}`, p);
      return r.rows.map(x => this._lbRow(x));
    },
    async lbRank(week, guardian, userId){
      const p = guardian ? [week, guardian] : [week];
      const tot = await q(`WITH best AS (${this._lbBest(guardian)}) SELECT count(*)::int AS n FROM best`, p);
      const me = await q(`WITH best AS (${this._lbBest(guardian)})
        SELECT b.*, u.display_name, u.username FROM best b JOIN horda_users u ON u.id=b.user_id WHERE b.user_id=$${p.length + 1}`, p.concat([userId]));
      const row = this._lbRow(me.rows[0]), total = tot.rows[0].n | 0;
      if(!row) return { total, rank: 0, row: null };
      const ahead = await q(`WITH best AS (${this._lbBest(guardian)}) SELECT count(*)::int AS n FROM best b
        WHERE b.score > $${p.length + 1} OR (b.score = $${p.length + 1} AND (b.round > $${p.length + 2}
          OR (b.round = $${p.length + 2} AND (b.duration_ms < $${p.length + 3} OR (b.duration_ms = $${p.length + 3} AND b.created_at < $${p.length + 4})))))`,
        p.concat([row.score, row.round, row.durationMs, row.at]));
      return { total, rank: (ahead.rows[0].n | 0) + 1, row };
    },
    async lastSubmitAt(userId){
      const r = await q(`SELECT max(created_at) AS t FROM horda_leaderboard WHERE user_id=$1`, [userId]);
      return Number(r.rows[0] && r.rows[0].t || 0);
    },
    async close(){ await gmChain.catch(()=>{}); await pool.end(); }
  };
}

/* ============================================================
   API HTTP
   ============================================================ */
function create(opts){
  opts = opts || {};
  const log = opts.log || ((ev, d) => console.log(new Date().toISOString(), ev, d ? JSON.stringify(d) : ""));
  const originAllowed = opts.originAllowed || (() => true);
  const url = opts.databaseUrl !== undefined ? opts.databaseUrl : process.env.DATABASE_URL;
  const dataDir = opts.dataDir || process.env.DATA_DIR || path.join(__dirname, "data");
  // Server-only operator policy. The fallback resolves an EXISTING account once at
  // startup, then checks its immutable numeric ID. A missing operator is never auto-created.
  const operatorConfig = require("./operator-config.json");
  const configuredOwner = userKey(opts.ownerAccount !== undefined ? opts.ownerAccount : operatorConfig.ownerAccount);
  const explicitAdmins = opts.adminUsers !== undefined ? opts.adminUsers : process.env.ADMIN_USERS;
  const adminOverride = explicitAdmins !== undefined;
  const adminNames = String(explicitAdmins || "").split(",").map(s=>userKey(s.trim())).filter(Boolean);
  let ownerId = null;
  const isOwner = user => !!user && (adminOverride ? adminNames.includes(userKey(user.user)) : ownerId !== null && user.id === ownerId);

  let store = null, status = "starting", lastError = "";
  try{ store = url ? pgStore(url) : fileStore(dataDir); }
  catch(e){ status = "error"; lastError = String(e.message || e); }
  const fails = new Limiter(), registers = new Limiter(), apiHits = new Limiter(), lbHits = new Limiter();
  const lbLast = new Map();   // cuenta -> último envío al ranking (ms), para el "¿entra en el tiempo que pasó?"
  const now0 = () => (opts.now ? opts.now() : Date.now()); // las pruebas mueven el reloj del ranking

  async function init(){
    if(!store) return;
    try{
      await store.init();
      if(!adminOverride && configuredOwner){ const owner = await store.getUserByKey(configuredOwner); ownerId = owner ? owner.id : null; log("OWNER_POLICY", { bound: ownerId !== null }); }
      status = "ready"; lastError = "";
      if(store.persistent) log("ACCOUNTS_READY", { store: store.kind });
      else log("ACCOUNTS_READY", { store: store.kind, dir: dataDir,
        warning: "SIN BASE DE DATOS: las cuentas se guardan en el disco del servidor. En el plan gratuito de Render se BORRAN en cada redeploy, reinicio o cuando el servicio se duerme. Configurá DATABASE_URL (ver docs/ACCOUNTS_DEPLOY.md)." });
    }catch(e){
      status = "error"; lastError = String(e.message || e);
      log("ACCOUNTS_ERROR", { store: store.kind, err: lastError });
      const t = setTimeout(init, 30000); if(t.unref) t.unref(); // reintenta (ej. la base todavía está arrancando)
    }
  }
  const ready = init();
  const sweeper = setInterval(() => {
    fails.sweep(); registers.sweep(); apiHits.sweep(); lbHits.sweep();
    const old = now0() - 24 * 3600 * 1000; for(const [k, t] of lbLast) if(t < old) lbLast.delete(k);
    if(status === "ready") store.sweepSessions(Date.now()).catch(() => {});
  }, 10 * 60 * 1000);
  if(sweeper.unref) sweeper.unref();

  function info(){
    const s = { store: store ? store.kind : "none", persistent: !!(store && store.persistent), status };
    if(status === "error") s.error = lastError;
    if(store && !store.persistent) s.warning = "Sin base de datos: en el plan gratuito de Render las cuentas se pierden al redeployar, reiniciar o cuando el servidor se duerme. Ver docs/ACCOUNTS_DEPLOY.md";
    return s;
  }
  function healthLine(){
    const i = info();
    if(i.status === "error") return `cuentas: ERROR (${i.store}): ${i.error}`;
    if(i.store === "postgres") return `cuentas: base de datos Postgres ${i.status === "ready" ? "OK" : "conectando…"}`;
    if(i.persistent) return `cuentas: ARCHIVO EN DISCO PERSISTENTE ${i.status === "ready" ? "OK" : "conectando…"}`;
    return "cuentas: ARCHIVO EN DISCO (sin DATABASE_URL) · AVISO: en el plan gratuito de Render las cuentas se BORRAN en cada redeploy/reinicio o cuando el servidor se duerme · ver docs/ACCOUNTS_DEPLOY.md";
  }

  function clientIp(req){
    if(TRUST_PROXY){
      const h = req.headers["cf-connecting-ip"] || req.headers["true-client-ip"] || String(req.headers["x-forwarded-for"] || "").split(",")[0];
      if(h && String(h).trim()) return String(h).trim().slice(0, 64);
    }
    return req.socket.remoteAddress || "?";
  }
  function corsHeaders(req){
    const origin = req.headers.origin;
    const h = { "vary": "Origin" };
    if(origin && originAllowed(origin)){
      h["access-control-allow-origin"] = origin;
      h["access-control-allow-methods"] = "GET, POST, PUT, OPTIONS";
      h["access-control-allow-headers"] = "content-type, authorization";
      h["access-control-max-age"] = "600";
    }
    return h;
  }
  function send(req, res, code, obj, extra){
    if(res.headersSent) return;
    const body = JSON.stringify(obj);
    res.writeHead(code, Object.assign({ "content-type": "application/json; charset=utf-8", "cache-control": "no-store",
      "x-content-type-options": "nosniff" }, corsHeaders(req), extra || {}));
    res.end(body);
  }
  const err = (req, res, code, error, msg, extra) => send(req, res, code, Object.assign({ error, msg }, extra && extra.body || {}), extra && extra.headers);

  function readBody(req, max){
    return new Promise((ok, ko) => {
      const len = parseInt(req.headers["content-length"] || "0", 10);
      if(len > max){ const e = new Error("TOO_BIG"); e.code = "TOO_BIG"; req.resume(); return ko(e); }
      const chunks = []; let size = 0, dead = false;
      req.on("data", c => {
        if(dead) return;
        size += c.length;
        if(size > max){ dead = true; chunks.length = 0; const e = new Error("TOO_BIG"); e.code = "TOO_BIG"; ko(e); return; }
        chunks.push(c);
      });
      req.on("end", () => {
        if(dead) return;
        const raw = Buffer.concat(chunks).toString("utf8");
        if(!raw) return ok({});
        try{ const j = JSON.parse(raw); ok(j && typeof j === "object" && !Array.isArray(j) ? j : {}); }
        catch(e){ const x = new Error("BAD_JSON"); x.code = "BAD_JSON"; ko(x); }
      });
      req.on("error", ko);
    });
  }

  function publicUser(u){ return { user: u.user, name: u.name || u.user, email: u.email || null, createdAt: u.createdAt }; }
  async function newSession(u){
    const token = newToken(), now = Date.now();
    const s = { tokenHash: sha256(token), userId: u.id, createdAt: now, expiresAt: now + SESSION_TTL_MS };
    await store.createSession(s);
    return { token, expiresAt: s.expiresAt };
  }
  async function auth(req, bodyToken){
    const m = /^Bearer\s+([a-f0-9]{64})$/i.exec(String(req.headers.authorization || ""));
    const token = m ? m[1].toLowerCase() : (typeof bodyToken === "string" && /^[a-f0-9]{64}$/i.test(bodyToken) ? bodyToken.toLowerCase() : null);
    if(!token) return { error: "NO_SESSION" };
    const h = sha256(token);
    const s = await store.getSession(h);
    // lookup por hash + comparación en tiempo constante del hash guardado (defensa extra)
    if(!s || !crypto.timingSafeEqual(Buffer.from(s.tokenHash, "hex"), Buffer.from(h, "hex"))) return { error: "NO_SESSION" };
    const now = Date.now();
    if(s.expiresAt <= now){ await store.deleteSession(h); return { error: "SESSION_EXPIRED" }; }
    const u = await store.getUser(s.userId);
    if(!u){ await store.deleteSession(h); return { error: "NO_SESSION" }; }
    // vencimiento deslizante: una sesión que se usa no vence (se renueva al pasar la mitad)
    if(s.expiresAt - now < SESSION_TTL_MS / 2){ s.expiresAt = now + SESSION_TTL_MS; await store.touchSession(h, s.expiresAt); }
    return { user: u, session: s, tokenHash: h };
  }
  const authFail = (req, res, a) => err(req, res, 401, a.error, a.error === "SESSION_EXPIRED" ? "Tu sesión venció. Entrá de nuevo." : "Tenés que entrar a tu cuenta.");

  function tooMany(req, res, secs){
    return err(req, res, 429, "TOO_MANY", `Demasiados intentos. Probá de nuevo en ${secs >= 90 ? Math.ceil(secs / 60) + " minutos" : secs + " segundos"}.`,
      { headers: { "retry-after": String(secs) }, body: { retryAfter: secs } });
  }

  async function putSaveCommon(req, res, u, body){
    const data = body.data;
    if(!data || typeof data !== "object" || Array.isArray(data)) return err(req, res, 400, "BAD_SAVE", "El guardado no tiene el formato esperado.");
    const dataStr = JSON.stringify(data);
    if(Buffer.byteLength(dataStr) > SAVE_MAX_BYTES) return err(req, res, 413, "SAVE_TOO_BIG", "El guardado es demasiado grande.");
    const base = Number.isInteger(body.baseVersion) && body.baseVersion >= 0 ? body.baseVersion : -1;
    if(base < 0 && !body.force) return err(req, res, 400, "BAD_VERSION", "Falta la versión base del guardado.");
    const summary = summarize(data);
    const r = await store.putSave(u.id, dataStr, summary, base, !!body.force);
    if(r.conflict){
      const c = r.current || { version: 0, updatedAt: 0, summary: null };
      return send(req, res, 409, { error: "CONFLICT", msg: "La nube tiene un progreso más nuevo de otro dispositivo.", version: c.version, updatedAt: c.updatedAt, summary: c.summary });
    }
    log("SAVE_PUT", { user: u.id, v: r.version, bytes: dataStr.length });
    return send(req, res, 200, { ok: true, version: r.version, updatedAt: r.updatedAt, summary });
  }

  async function adminAuth(req,res){
    const a=await auth(req); if(!a.user){authFail(req,res,a);return null;}
    if(!isOwner(a.user)){err(req,res,403,"FORBIDDEN","Acceso exclusivo de administración.");return null;} return a.user;
  }
  async function adminTarget(body){ const u=await store.getUserByKey(userKey(body.user)); if(!u)return null;const s=await store.getSave(u.id);if(!s)return null;return {u,s,data:JSON.parse(s.data)}; }
  function adminProfile(t,version){return {user:t.u.user,version:version??t.s.version,champions:Object.entries(t.data.champions||{}).map(([key,c])=>({key,level:c.level,unlocked:!!c.unlocked}))};}
  const routes = {
    "GET /api/admin/status":async(req,res)=>{const a=await auth(req);if(!a.user)return authFail(req,res,a);return send(req,res,200,{admin:isOwner(a.user)});},
    "POST /api/admin/profile":async(req,res)=>{if(!await adminAuth(req,res))return;const body=await readBody(req,SMALL_BODY_BYTES),t=await adminTarget(body);if(!t)return err(req,res,404,"NOT_FOUND","No hay perfil guardado de ese usuario.");return send(req,res,200,adminProfile(t));},
    "POST /api/admin/level":async(req,res)=>{
      const admin=await adminAuth(req,res);if(!admin)return;
      const body=await readBody(req,SMALL_BODY_BYTES),t=await adminTarget(body);if(!t)return err(req,res,404,"NOT_FOUND","No hay perfil guardado de ese usuario.");
      if(!Number.isInteger(body.baseVersion)||body.baseVersion!==t.s.version)return err(req,res,409,"CONFLICT","El perfil cambió. Consultalo de nuevo.");
      const old=t.data.champions?.[body.champion]?.level;
      try{t.data=adminLevels.editLevel(t.data,body.champion,body.level);}catch(e){return err(req,res,400,"BAD_LEVEL","Elegí un campeón desbloqueado y un nivel entero de 1 a 99.");}
      const put=await store.putSave(t.u.id,JSON.stringify(t.data),summarize(t.data),body.baseVersion,false);
      if(!put.ok)return err(req,res,409,"CONFLICT","El perfil cambió. Consultalo de nuevo.");
      log("ADMIN_LEVEL",{admin:admin.id,user:t.u.id,champion:body.champion,from:old,to:body.level,version:put.version});return send(req,res,200,adminProfile(t,put.version));
    },
    "GET /api/health": async (req, res) => send(req, res, 200, Object.assign({ ok: status === "ready" }, info())),
    "POST /api/register": async (req, res, ip) => {
      const body = await readBody(req, SMALL_BODY_BYTES);
      if(registers.count("ip:" + ip) >= MAX_REGISTER_IP) return tooMany(req, res, registers.retryAfter("ip:" + ip));
      const user = cleanName(body.user, 40), pass = typeof body.pass === "string" ? body.pass : "";
      const email = cleanName(body.email, 170);
      if(!USER_RE.test(user)) return err(req, res, 400, "BAD_USER", "El usuario tiene que tener de 3 a 16 letras o números (se permiten _ . -).");
      if(pass.length < 6 || pass.length > 128) return err(req, res, 400, "BAD_PASS", "La contraseña tiene que tener entre 6 y 128 caracteres.");
      if(userKey(pass) === userKey(user)) return err(req, res, 400, "BAD_PASS", "La contraseña no puede ser igual al usuario.");
      if(email && !EMAIL_RE.test(email)) return err(req, res, 400, "BAD_EMAIL", "El correo no parece válido (podés dejarlo vacío).");
      registers.hit("ip:" + ip, REGISTER_WINDOW_MS);
      const key = userKey(user);
      if(!adminOverride && configuredOwner && key === configuredOwner) return err(req, res, 403, "RESERVED_USER", "Ese nombre está reservado para la cuenta del operador existente.");
      if(await store.getUserByKey(key)) return err(req, res, 409, "USER_TAKEN", "Ese nombre de usuario ya existe. Probá con otro.");
      const now = Date.now();
      let u;
      try{
        u = await store.createUser({ userKey: key, user, name: cleanName(body.name, 16) || user.slice(0, 16), email: email || null,
          passHash: await hashPassword(pass), createdAt: now, lastLogin: now });
      }catch(e){ if(e.code === "EXISTS") return err(req, res, 409, "USER_TAKEN", "Ese nombre de usuario ya existe. Probá con otro."); throw e; }
      const s = await newSession(u);
      log("ACCOUNT_CREATED", { user: u.id });
      return send(req, res, 201, Object.assign({ user: publicUser(u) }, s));
    },
    "POST /api/login": async (req, res, ip) => {
      const body = await readBody(req, SMALL_BODY_BYTES);
      const user = cleanName(body.user, 40), pass = typeof body.pass === "string" ? body.pass.slice(0, 256) : "";
      const key = userKey(user), kU = "u:" + key, kI = "ip:" + ip;
      if(fails.count(kU) >= MAX_FAILS_USER) return tooMany(req, res, fails.retryAfter(kU));
      if(fails.count(kI) >= MAX_FAILS_IP) return tooMany(req, res, fails.retryAfter(kI));
      const u = key ? await store.getUserByKey(key) : null;
      const ok = u ? await verifyPassword(pass, u.passHash) : (await verifyPassword(pass, await dummyHash()), false);
      if(!ok){
        fails.hit(kU, FAIL_WINDOW_MS); fails.hit(kI, FAIL_WINDOW_MS);
        log("LOGIN_FAILED", { known: !!u });
        return err(req, res, 401, "BAD_CREDENTIALS", "Usuario o contraseña incorrectos.");
      }
      fails.reset(kU);
      await store.updateUser(u.id, { lastLogin: Date.now() });
      const s = await newSession(u);
      return send(req, res, 200, Object.assign({ user: publicUser(u) }, s));
    },
    "POST /api/logout": async (req, res) => {
      const a = await auth(req);
      if(a.tokenHash) await store.deleteSession(a.tokenHash);
      return send(req, res, 200, { ok: true });
    },
    "GET /api/me": async (req, res) => {
      const a = await auth(req); if(!a.user) return authFail(req, res, a);
      const meta = await store.getSaveMeta(a.user.id);
      return send(req, res, 200, { user: publicUser(a.user), expiresAt: a.session.expiresAt, save: meta || null });
    },
    "GET /api/save": async (req, res) => {
      const a = await auth(req); if(!a.user) return authFail(req, res, a);
      const s = await store.getSave(a.user.id);
      if(!s) return send(req, res, 200, { version: 0, updatedAt: 0, summary: null, data: null });
      let data = null; try{ data = JSON.parse(s.data); }catch(e){}
      return send(req, res, 200, { version: s.version, updatedAt: s.updatedAt, summary: s.summary, data });
    },
    "PUT /api/save": async (req, res) => {
      const a = await auth(req); if(!a.user) return authFail(req, res, a);
      return putSaveCommon(req, res, a.user, await readBody(req, BODY_MAX_BYTES));
    },
    // Al cerrar la pestaña: navigator.sendBeacon manda un POST "simple" (text/plain, sin encabezados
    // propios) con el token en el cuerpo. Nunca fuerza: si hay conflicto, se resuelve al volver.
    "POST /api/save-beacon": async (req, res) => {
      const body = await readBody(req, BODY_MAX_BYTES);
      const a = await auth(req, body.token); if(!a.user) return authFail(req, res, a);
      delete body.force;
      return putSaveCommon(req, res, a.user, body);
    },
    "PUT /api/profile": async (req, res) => {
      const a = await auth(req); if(!a.user) return authFail(req, res, a);
      const body = await readBody(req, SMALL_BODY_BYTES);
      const f = {};
      if(body.name !== undefined){ const n = cleanName(body.name, 16); if(!n) return err(req, res, 400, "BAD_NAME", "Poné un nombre (hasta 16 letras)."); f.name = n; }
      if(body.email !== undefined){ const e = cleanName(body.email, 170); if(e && !EMAIL_RE.test(e)) return err(req, res, 400, "BAD_EMAIL", "El correo no parece válido."); f.email = e || null; }
      const u = await store.updateUser(a.user.id, f);
      return send(req, res, 200, { user: publicUser(u) });
    },

    /* ---------- ranking semanal de la Horda Infinita ---------- */
    // Público. Con sesión (opcional) agrega "me": tu puesto, aunque estés fuera del top.
    "GET /api/leaderboard": async (req, res) => {
      const qs = new URL(req.url, "http://x").searchParams, now = now0();
      const current = lbWeekKey(new Date(now));
      const week = qs.get("week") || current;
      if(!WEEK_RE.test(week)) return err(req, res, 400, "BAD_WEEK", "Semana inválida.");
      const guardian = qs.get("guardian") || "";
      if(guardian && !GUARDIAN_RE.test(guardian)) return err(req, res, 400, "BAD_GUARDIAN", "Guardián inválido.");
      const limit = Math.max(1, Math.min(LB_TOP, parseInt(qs.get("limit") || String(LB_TOP), 10) || LB_TOP));
      const top = await store.lbTop(week, guardian || null, limit);
      let me = null, total = null, uid = 0;
      if(req.headers.authorization){ const a = await auth(req); if(a.user) uid = a.user.id; }
      const rk = await store.lbRank(week, guardian || null, uid || -1);
      total = rk.total;
      if(uid) me = rk.row ? { rank: rk.rank, name: rk.row.name, guardian: rk.row.guardian, score: rk.row.score, round: rk.row.round, durationMs: rk.row.durationMs } : { rank: 0 };
      const entries = top.map((r, i) => ({ rank: i + 1, name: r.name, guardian: r.guardian, score: r.score, round: r.round, durationMs: r.durationMs, at: r.at, me: !!uid && r.userId === uid }));
      return send(req, res, 200, { week, current, guardian: guardian || null, total, entries, me, endsAt: lbWeekStart(now) + 7 * 86400000 });
    },
    // Con sesión: {score, round, guardian, week, durationMs}. Los invitados no entran (su récord queda local).
    "POST /api/leaderboard/submit": async (req, res) => {
      const a = await auth(req); if(!a.user) return authFail(req, res, a);
      const body = await readBody(req, SMALL_BODY_BYTES), now = now0(), uid = a.user.id, kU = "u:" + uid;
      if(lbHits.count(kU) >= LB_MAX_SUBMITS) return tooMany(req, res, lbHits.retryAfter(kU));
      const last = Math.max(lbLast.get(uid) || 0, await store.lastSubmitAt(uid));
      if(last && now - last < LB_MIN_GAP_MS) return tooMany(req, res, Math.ceil((LB_MIN_GAP_MS - (now - last)) / 1000));
      lbHits.hit(kU, LB_WINDOW_MS);
      const e = { score: body.score, round: body.round, durationMs: body.durationMs, guardian: typeof body.guardian === "string" ? body.guardian : "",
        week: typeof body.week === "string" ? body.week : "", at: now };
      let bad = lbCheck(e, now);
      // la partida tiene que entrar en el tiempo que pasó desde tu envío anterior (con 2 min de margen)
      if(!bad && last && e.durationMs > now - last + 120000) bad = { error: "IMPLAUSIBLE", msg: "Esa partida no entra en el tiempo desde tu envío anterior." };
      if(bad){
        log("LB_REJECT", { user: uid, why: bad.error, score: e.score, round: e.round, ms: e.durationMs });
        return err(req, res, bad.error === "WEEK_CLOSED" ? 409 : bad.error === "IMPLAUSIBLE" ? 422 : 400, bad.error, bad.msg);
      }
      lbLast.set(uid, now);
      const put = await store.lbPut(e.week, uid, e.guardian, e);
      const all = await store.lbRank(e.week, null, uid), mine = await store.lbRank(e.week, e.guardian, uid);
      log("LB_SUBMIT", { user: uid, week: e.week, score: e.score, round: e.round, improved: put.improved, rank: all.rank });
      return send(req, res, 200, { ok: true, week: e.week, improved: put.improved, rank: all.rank, total: all.total,
        guardianRank: mine.rank, guardianTotal: mine.total, best: all.row ? { score: all.row.score, round: all.row.round, guardian: all.row.guardian } : null });
    }
  };

  Object.assign(routes, gameMaster.routes({getStore:()=>store,auth,send,err,readBody,summarize,now:now0,isOwner}));

  // Devuelve true si atendió el pedido (todo lo que empieza con /api/).
  function handle(req, res){
    let pathname; try{ pathname = new URL(req.url, "http://x").pathname; }catch(e){ return false; }
    if(!pathname.startsWith("/api/")) return false;
    const origin = req.headers.origin;
    if(origin && !originAllowed(origin)){ log("NETWORK_ERROR", { api_origin_rejected: origin }); err(req, res, 403, "ORIGIN", "Origen no permitido."); req.resume(); return true; }
    if(req.method === "OPTIONS"){ res.writeHead(204, corsHeaders(req)); res.end(); return true; }
    const route = routes[req.method + " " + pathname.replace(/\/+$/, "")];
    if(!route){ err(req, res, 404, "NOT_FOUND", "No existe."); req.resume(); return true; }
    const ip = clientIp(req);
    if(apiHits.hit("ip:" + ip, API_WINDOW_MS) > MAX_API_IP){ tooMany(req, res, apiHits.retryAfter("ip:" + ip)); req.resume(); return true; }
    if(pathname !== "/api/health" && status !== "ready"){
      err(req, res, 503, "ACCOUNTS_DOWN", status === "error" ? "Las cuentas no están disponibles ahora (problema con la base de datos)." : "El servidor está arrancando, probá en unos segundos.");
      req.resume(); return true;
    }
    Promise.resolve().then(() => route(req, res, ip)).catch(e => {
      if(e && e.code === "TOO_BIG") return err(req, res, 413, "TOO_BIG", "El pedido es demasiado grande.", { headers: { connection: "close" } });
      if(e && e.code === "BAD_JSON") return err(req, res, 400, "BAD_JSON", "Pedido mal formado.");
      log("ACCOUNTS_ERROR", { route: pathname, err: String(e && e.message || e) });
      err(req, res, 500, "SERVER_ERROR", "Error del servidor. Probá de nuevo.");
    });
    return true;
  }

  return { handle, healthLine, info, ready, get store(){ return store; },
    async close(){ clearInterval(sweeper); if(store && store.close) await store.close(); } };
}

module.exports = { create, summarize, hashPassword, verifyPassword, SAVE_MAX_BYTES, lbWeekKey, lbWeekStart, lbMaxScore, lbCheck };
