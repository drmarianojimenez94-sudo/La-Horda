"use strict";
// Prueba de la API de cuentas (sin navegador), contra el MISMO servidor del relay:
// registro, usuario repetido (sin distinguir mayúsculas), login, contraseña incorrecta, límite de
// intentos, sesión (/api/me, logout, vencida), guardado en la nube con versión y conflicto (409),
// tamaño máximo, beacon de cierre de pestaña, perfil, CORS, contraseñas con scrypt, persistencia en
// disco y que el WebSocket de salas siga andando en el mismo puerto.
// Uso: node test-accounts.js                        (archivo en disco, carpeta temporal)
//      DATABASE_URL=postgres://... node test-accounts.js   (Postgres: usa tablas horda_*; BORRA sus filas)
process.env.PORT = process.env.PORT || "8812";
process.env.ALLOWED_ORIGINS = "http://127.0.0.1:8802";
process.env.REGISTER_MAX_IP = process.env.REGISTER_MAX_IP || "8";
const os = require("os"), fs = require("fs"), path = require("path");
const PG = !!process.env.DATABASE_URL;
if(!PG) process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "horda-acc-"));
const { server, accounts } = require("./relay.js");
const WebSocket = require("ws");
const BASE = "http://127.0.0.1:" + process.env.PORT;
const ORIGIN = "http://127.0.0.1:8802";
let fails = 0;
const check = (name, ok, extra) => { console.log((ok ? "PASS " : "FAIL ") + name + (extra !== undefined ? "  " + JSON.stringify(extra) : "")); if(!ok) fails++; };
async function api(method, p, body, token, headers){
  const h = Object.assign({ origin: ORIGIN }, headers || {});
  if(body !== undefined && !h["content-type"]) h["content-type"] = "application/json";
  if(token) h.authorization = "Bearer " + token;
  const r = await fetch(BASE + p, { method, headers: h, body: body === undefined ? undefined : (typeof body === "string" ? body : JSON.stringify(body)) });
  let j = null; const txt = await r.text(); try{ j = JSON.parse(txt); }catch(e){ j = txt; }
  return { status: r.status, j, h: r.headers };
}
const SAVE = (gold, lvl) => ({ gold, gems: 0, champions: { tanque: { unlocked: true, level: lvl }, mago: { unlocked: false, level: 1 } }, arenasCleared: { ciudad: true, bosque: false } });

(async () => {
  await accounts.ready;
  if(PG){ const pg = accounts.store; if(pg.kind === "postgres"){ const { Pool } = require("pg"); const p = new Pool({ connectionString: process.env.DATABASE_URL }); await p.query("TRUNCATE horda_saves, horda_sessions, horda_users RESTART IDENTITY CASCADE"); await p.end(); } }
  const health = await (await fetch(BASE + "/health")).text();
  check("health.relay_line_intacta", /^LA HORDA relay OK · protocolo 1 · salas \d+\n/.test(health), health.split("\n")[0]);
  check("health.avisa_almacenamiento", PG ? /cuentas: base de datos Postgres OK/.test(health) : /ARCHIVO EN DISCO.*se BORRAN/.test(health), health.split("\n")[1]);
  const hj = await api("GET", "/api/health");
  check("api_health.json", hj.status === 200 && hj.j.ok && hj.j.store === (PG ? "postgres" : "file") && hj.j.persistent === PG, hj.j);

  // --- registro
  const r1 = await api("POST", "/api/register", { user: "Mariano", pass: "espada123", email: "m@ejemplo.com" });
  check("register.ok", r1.status === 201 && /^[a-f0-9]{64}$/.test(r1.j.token) && r1.j.user.user === "Mariano" && r1.j.user.name === "Mariano", r1.status);
  check("register.expira", r1.j.expiresAt > Date.now() + 24 * 3600e3);
  const dup = await api("POST", "/api/register", { user: "mARIANO", pass: "otraclave1" });
  check("register.repetido_sin_mayusculas", dup.status === 409 && dup.j.error === "USER_TAKEN", dup.j);
  check("register.usuario_invalido", (await api("POST", "/api/register", { user: "a", pass: "espada123" })).j.error === "BAD_USER");
  check("register.usuario_con_html", (await api("POST", "/api/register", { user: "<b>x</b>", pass: "espada123" })).j.error === "BAD_USER");
  check("register.clave_corta", (await api("POST", "/api/register", { user: "Facundo", pass: "123" })).j.error === "BAD_PASS");
  check("register.correo_invalido", (await api("POST", "/api/register", { user: "Facundo", pass: "espada123", email: "no-es-correo" })).j.error === "BAD_EMAIL");
  check("register.json_roto", (await api("POST", "/api/register", "{nope")).status === 400);
  const u = await accounts.store.getUserByKey("mariano");
  check("password.scrypt_con_sal", u && /^scrypt\$16384\$8\$1\$[A-Za-z0-9+/=]{20,}\$/.test(u.passHash) && !u.passHash.includes("espada123"));

  // --- login
  const bad = await api("POST", "/api/login", { user: "Mariano", pass: "incorrecta" });
  check("login.clave_incorrecta", bad.status === 401 && bad.j.error === "BAD_CREDENTIALS", bad.j);
  const noUser = await api("POST", "/api/login", { user: "NoExiste", pass: "loquesea1" });
  check("login.usuario_inexistente_mismo_error", noUser.status === 401 && noUser.j.error === "BAD_CREDENTIALS");
  const l1 = await api("POST", "/api/login", { user: "MARIANO", pass: "espada123" });
  check("login.ok_sin_mayusculas", l1.status === 200 && /^[a-f0-9]{64}$/.test(l1.j.token) && l1.j.token !== r1.j.token, l1.status);
  const TA = l1.j.token;

  // --- sesión
  const me = await api("GET", "/api/me", undefined, TA);
  check("me.ok", me.status === 200 && me.j.user.user === "Mariano" && me.j.save === null, me.j);
  check("me.sin_token", (await api("GET", "/api/me")).status === 401);
  check("me.token_falso", (await api("GET", "/api/me", undefined, "ab".repeat(32))).status === 401);

  // --- guardado en la nube
  const g0 = await api("GET", "/api/save", undefined, TA);
  check("save.vacio_v0", g0.status === 200 && g0.j.version === 0 && g0.j.data === null, g0.j);
  const p1 = await api("PUT", "/api/save", { data: SAVE(100, 3), baseVersion: 0 }, TA);
  check("save.put_v1", p1.status === 200 && p1.j.version === 1, p1.j);
  const p1b = await api("PUT", "/api/save", { data: SAVE(5, 1), baseVersion: 0 }, r1.j.token);
  check("save.conflicto_409", p1b.status === 409 && p1b.j.error === "CONFLICT" && p1b.j.version === 1 && p1b.j.summary && p1b.j.summary.gold === 100, p1b.j);
  const p2 = await api("PUT", "/api/save", { data: SAVE(250, 7), baseVersion: 1 }, r1.j.token);
  check("save.put_v2_otro_dispositivo", p2.status === 200 && p2.j.version === 2 && p2.j.summary.maxLevel === 7 && p2.j.summary.guardians === 1 && p2.j.summary.arenas === 1, p2.j);
  const g2 = await api("GET", "/api/save", undefined, TA);
  check("save.get_ve_lo_ultimo", g2.j.version === 2 && g2.j.data.gold === 250 && g2.j.updatedAt > 0, g2.j.version);
  const pf = await api("PUT", "/api/save", { data: SAVE(9, 2), baseVersion: 1, force: true }, TA);
  check("save.forzar_este_dispositivo", pf.status === 200 && pf.j.version === 3);
  check("save.sin_version_base", (await api("PUT", "/api/save", { data: SAVE(1, 1) }, TA)).j.error === "BAD_VERSION");
  check("save.formato_invalido", (await api("PUT", "/api/save", { data: [1, 2], baseVersion: 3 }, TA)).j.error === "BAD_SAVE");
  const big = { gold: 1, champions: {}, pad: "x".repeat(520 * 1024) };
  const pb = await api("PUT", "/api/save", { data: big, baseVersion: 3 }, TA);
  check("save.demasiado_grande_413", pb.status === 413, pb.j && pb.j.error);
  const huge = await api("PUT", "/api/save", { data: { pad: "x".repeat(2 * 1024 * 1024) }, baseVersion: 3 }, TA).catch(e => ({ status: "exc:" + e.message }));
  check("save.cuerpo_enorme_cortado", huge.status === 413, huge.status);
  check("save.sin_sesion", (await api("PUT", "/api/save", { data: SAVE(1, 1), baseVersion: 3 })).status === 401);
  // beacon (cierre de pestaña): text/plain sin encabezado de autorización, token en el cuerpo
  const bc = await api("POST", "/api/save-beacon", JSON.stringify({ token: TA, data: SAVE(777, 9), baseVersion: 3, force: true }), null, { "content-type": "text/plain;charset=UTF-8" });
  check("beacon.sube", bc.status === 200 && bc.j.version === 4, bc.j);
  const bc2 = await api("POST", "/api/save-beacon", JSON.stringify({ token: TA, data: SAVE(1, 1), baseVersion: 1, force: true }), null, { "content-type": "text/plain" });
  check("beacon.nunca_fuerza", bc2.status === 409);
  const meta = await api("GET", "/api/me", undefined, TA);
  check("me.resumen_del_guardado", meta.j.save && meta.j.save.version === 4 && meta.j.save.summary.gold === 777, meta.j.save);
  // dos dispositivos suben A LA VEZ sobre la misma versión: uno gana, el otro recibe 409 (nadie pisa a nadie)
  const race = await Promise.all([api("PUT", "/api/save", { data: SAVE(801, 9), baseVersion: 4 }, TA), api("PUT", "/api/save", { data: SAVE(802, 9), baseVersion: 4 }, r1.j.token)]);
  check("save.carrera_uno_gana", race.map(r => r.status).sort().join(",") === "200,409", race.map(r => r.status));
  const after = await api("GET", "/api/save", undefined, TA);
  check("save.carrera_version_5", after.j.version === 5 && [801, 802].includes(after.j.data.gold) && after.j.data.gold === (race[0].status === 200 ? 801 : 802));

  // --- perfil
  const pr = await api("PUT", "/api/profile", { name: "  Mariano <el> Grande del Sur " }, TA);
  check("profile.nombre_saneado_16", pr.status === 200 && pr.j.user.name === "Mariano el Grand", pr.j.user && pr.j.user.name);
  check("profile.nombre_vacio", (await api("PUT", "/api/profile", { name: "  " }, TA)).j.error === "BAD_NAME");

  // --- CORS
  const pre = await fetch(BASE + "/api/save", { method: "OPTIONS", headers: { origin: ORIGIN, "access-control-request-method": "PUT", "access-control-request-headers": "authorization,content-type" } });
  check("cors.preflight_permitido", pre.status === 204 && pre.headers.get("access-control-allow-origin") === ORIGIN && /authorization/.test(pre.headers.get("access-control-allow-headers")));
  const gh = await api("GET", "/api/health", undefined, null, { origin: "https://drmarianojimenez94-sudo.github.io" });
  check("cors.juego_publicado_permitido", gh.h.get("access-control-allow-origin") === "https://drmarianojimenez94-sudo.github.io");
  const evil = await api("POST", "/api/login", { user: "Mariano", pass: "espada123" }, null, { origin: "https://malo.example" });
  check("cors.origen_ajeno_403", evil.status === 403 && !evil.h.get("access-control-allow-origin"));
  const evil2 = await api("GET", "/api/health", undefined, null, { origin: "https://drmarianojimenez94-sudo.github.io.malo.example" });
  check("cors.sufijo_tramposo_403", evil2.status === 403);

  // --- límite de intentos (8 fallidos por usuario -> 429, incluso con la clave correcta)
  await api("POST", "/api/register", { user: "Victima", pass: "clave-buena" });
  let last = null;
  for(let i = 0; i < 8; i++) last = await api("POST", "/api/login", { user: "victima", pass: "mala" + i });
  check("limite.intentos_fallidos_401", last.status === 401);
  const blocked = await api("POST", "/api/login", { user: "Victima", pass: "clave-buena" });
  check("limite.bloquea_429", blocked.status === 429 && blocked.j.error === "TOO_MANY" && +blocked.h.get("retry-after") > 0 && /minutos/.test(blocked.j.msg), blocked.j);
  check("limite.otro_usuario_sigue", (await api("POST", "/api/login", { user: "Mariano", pass: "espada123" })).status === 200);
  // cuentas nuevas por IP (REGISTER_MAX_IP=8 en esta prueba)
  let reg = null, n = 0;
  for(let i = 0; i < 12 && (!reg || reg.status !== 429); i++){ reg = await api("POST", "/api/register", { user: "Spam" + i, pass: "spamspam" }); n++; }
  check("limite.registros_por_ip", reg.status === 429, n);

  // --- logout y sesión vencida
  check("logout.ok", (await api("POST", "/api/logout", undefined, TA)).status === 200);
  check("logout.token_invalido_despues", (await api("GET", "/api/me", undefined, TA)).status === 401);
  const crypto = require("crypto");
  const oldTok = crypto.randomBytes(32).toString("hex");
  await accounts.store.createSession({ tokenHash: crypto.createHash("sha256").update(oldTok).digest("hex"), userId: u.id, createdAt: Date.now() - 1e9, expiresAt: Date.now() - 1000 });
  const ex = await api("GET", "/api/me", undefined, oldTok);
  check("sesion.vencida", ex.status === 401 && ex.j.error === "SESSION_EXPIRED", ex.j);
  check("sesion.token_no_se_guarda_en_claro", !(await accounts.store.getSession(oldTok)));

  // --- el relay de salas sigue andando en el mismo puerto
  const ws = new WebSocket("ws://127.0.0.1:" + process.env.PORT, { origin: ORIGIN });
  const joined = await new Promise(res => {
    ws.on("open", () => ws.send(JSON.stringify({ t: "create", protocol: 1, arena: "bosque", name: "X", champ: "tanque", clientId: "c1" })));
    ws.on("message", b => { const m = JSON.parse(b.toString()); if(m.t === "joined") res(m); });
    setTimeout(() => res(null), 3000);
  });
  check("relay.salas_siguen_andando", joined && /^[A-Z2-9]{6}$/.test(joined.room.code));
  ws.close();

  // --- persistencia en disco: otra instancia sobre la misma carpeta ve todo (simula reiniciar)
  if(!PG){
    const files = fs.readdirSync(process.env.DATA_DIR);
    check("archivo.sin_temporales", files.includes("accounts.json") && !files.some(f => f.endsWith(".tmp")), files);
    const again = require("./accounts.js").create({ dataDir: process.env.DATA_DIR, databaseUrl: "", log: () => {} });
    await again.ready;
    const u2 = await again.store.getUserByKey("mariano");
    const s2 = u2 && await again.store.getSave(u2.id);
    check("archivo.sobrevive_reinicio", u2 && u2.name === "Mariano el Grand" && s2 && s2.version === 5);
    await again.close();
  }
  console.log("SUMMARY", JSON.stringify({ fails, store: PG ? "postgres" : "file" }));
  await accounts.close().catch(() => {});
  if(!PG) try{ fs.rmSync(process.env.DATA_DIR, { recursive: true, force: true }); }catch(e){}
  server.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.log("FAIL exception", e.stack || e.message); process.exit(1); });
