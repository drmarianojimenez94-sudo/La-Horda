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
   ============================================================ */
const crypto = require("crypto");
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
  async function loadMeta(id){
    if(saveMeta.has(id)) return saveMeta.get(id);
    let meta = null;
    try{ const j = JSON.parse(await fsp.readFile(saveFile(id), "utf8")); meta = { version: j.version | 0, updatedAt: +j.updatedAt || 0, summary: j.summary || null }; }catch(e){}
    if(!saveMeta.has(id)) saveMeta.set(id, meta);
    return saveMeta.get(id);
  }
  return {
    kind: "file", persistent: false,
    async init(){
      await fsp.mkdir(savesDir, { recursive: true });
      try{ db = JSON.parse(await fsp.readFile(file, "utf8")); }
      catch(e){ if(e.code !== "ENOENT") throw new Error("accounts.json ilegible: " + e.message); }
      db.users = db.users || {}; db.sessions = db.sessions || {}; db.nextId = db.nextId || 1;
      for(const id in db.users) byKey.set(db.users[id].userKey, +id);
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
    async close(){ if(writing) await writing; }
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
  pool.on("error", () => {}); // una conexión inactiva que se corta no tumba el servidor
  const q = (text, params) => pool.query(text, params);
  const rowUser = r => r && { id: Number(r.id), userKey: r.user_key, user: r.username, name: r.display_name, email: r.email,
    passHash: r.pass_hash, createdAt: Number(r.created_at), lastLogin: Number(r.last_login || 0) };
  const rowMeta = r => r && { version: r.version | 0, updatedAt: Number(r.updated_at), summary: r.summary ? JSON.parse(r.summary) : null };
  return {
    kind: "postgres", persistent: true,
    async init(){
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
    async close(){ await pool.end(); }
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
  let store = null, status = "starting", lastError = "";
  try{ store = url ? pgStore(url) : fileStore(dataDir); }
  catch(e){ status = "error"; lastError = String(e.message || e); }
  const fails = new Limiter(), registers = new Limiter(), apiHits = new Limiter();

  async function init(){
    if(!store) return;
    try{
      await store.init();
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
    fails.sweep(); registers.sweep(); apiHits.sweep();
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
    if(i.persistent) return `cuentas: base de datos Postgres ${i.status === "ready" ? "OK" : "conectando…"}`;
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

  const routes = {
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
    }
  };

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

module.exports = { create, summarize, hashPassword, verifyPassword, SAVE_MAX_BYTES };
