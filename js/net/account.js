"use strict";
/* ============================================================
   js/net/account.js
   CUENTAS DE USUARIO + GUARDADO EN LA NUBE (servidor: server/accounts.js, el mismo del relay).

   Pantalla de cuenta entre el título ("Toca para continuar") y el menú principal:
   ENTRAR · CREAR CUENTA · JUGAR COMO INVITADO (offline, como siempre). La sesión queda recordada
   (token en localStorage) y la próxima vez se entra directo, sin esperar a la red.

   Sincronización (el guardado sigue siendo el de siempre en localStorage; esto lo copia a la nube):
   - Al persistir (gancho en persistNow de js/storage/save.js) se marca "pendiente" y se sube con
     demora (debounce); al terminar la partida y al ocultar/cerrar la pestaña se sube enseguida.
   - Al entrar (y al abrir el juego con la sesión recordada) se baja lo de la nube.
   - Sin conexión se juega igual: queda pendiente y se sube cuando vuelve la red (cola).
   - Cada subida lleva la versión de la nube que conocía este dispositivo; si otro dispositivo subió
     algo más nuevo, el servidor responde 409 y se pregunta: NUBE o ESTE DISPOSITIVO (con resumen).
     Lo que se descarta queda respaldado en localStorage (nunca se pierde progreso en silencio).

   API pública (para el menú principal / chip de perfil):
     window.accountOpen()   abre la pantalla de cuenta (entrar/crear) o el perfil si ya entró
     window.accountState()  {logged, name, user, syncing, pending, online, lastSync}
     evento "account-change" en window (detail = accountState()) cada vez que algo cambia
   Si el menú no trae su propio chip (un elemento con [data-account-chip]), se agrega uno mínimo.

   Pruebas automáticas: con navigator.webdriver la pantalla de cuenta NO se interpone (las pruebas
   viejas tocan "Toca para continuar" y esperan el menú), salvo con ?account=1 en la URL o
   window.__accountTest = true antes de cargar.
   ============================================================ */

const ACCOUNT_KEY = "horda_account";           // {token, user, name, expiresAt}
const ACCOUNT_SYNC_KEY = "horda_account_sync"; // {user, version, hash, dirty, updatedAt, lastOk}
const ACCOUNT_GUEST_KEY = "horda_guest_tab";   // sessionStorage: esta pestaña eligió invitado
const ACCOUNT_DEBOUNCE_MS = 6000, ACCOUNT_DEBOUNCE_PLAYING_MS = 30000;
const ACCOUNT_BEACON_MAX = 60000;              // navigator.sendBeacon no acepta mucho más de 64 KB
const acct = {
  session: null, sync: null, online: null, uploading: false, pulling: false, timer: null, retryMs: 0,
  applying: false, conflict: null, pendingApply: null, view: "login", back: null, after: null, busy: false, warm: null,
  el: null
};

/* ---------------- almacenamiento local ---------------- */
function _acctLoad(key, store){ try{ const s = (store || localStorage).getItem(key); return s ? JSON.parse(s) : null; }catch(e){ return null; } }
function _acctStore(key, val, store){ try{ const s = store || localStorage; if(val == null) s.removeItem(key); else s.setItem(key, JSON.stringify(val)); }catch(e){} }
function _acctSaveSession(){ _acctStore(ACCOUNT_KEY, acct.session); }
function _acctSaveSync(){ _acctStore(ACCOUNT_SYNC_KEY, acct.sync); }
function _acctKey(u){ return String(u || "").normalize("NFC").toLowerCase(); }
// hash rápido (FNV-1a) para saber si el guardado cambió desde la última subida
function _acctHash(str){ let h = 0x811c9dc5; for(let i = 0; i < str.length; i++){ h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(16) + ":" + str.length; }
function _acctLocalRaw(){ try{ return localStorage.getItem(SAVE_KEY) || ""; }catch(e){ return ""; } }
function _acctEsc(s){ return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

/* ---------------- estado público ---------------- */
function accountState(){
  const s = acct.session, y = acct.sync || {};
  return { logged: !!s, name: s ? (s.name || s.user) : "", user: s ? s.user : "",
    syncing: acct.uploading || acct.pulling, pending: !!(s && y.dirty && y.user === _acctKey(s.user)),
    online: acct.online, lastSync: y.lastOk || 0, conflict: !!acct.conflict };
}
function _acctEmit(){
  try{ window.dispatchEvent(new CustomEvent("account-change", { detail: accountState() })); }catch(e){}
  _acctRenderChip();
  if(acct.el && !acct.el.classList.contains("hidden") && acct.view === "profile") _acctRenderProfileStatus();
}

/* ---------------- servidor ---------------- */
// La API vive en el mismo servidor del relay: wss://host -> https://host (?api=... para probar otro).
function accountApiBase(){
  try{ const q = new URLSearchParams(location.search).get("api"); if(q) return q.replace(/\/+$/, ""); }catch(e){}
  const ws = (typeof netServerUrl === "function") ? netServerUrl() : ((typeof NET_CONFIG !== "undefined" && NET_CONFIG.serverUrl) || "");
  if(!ws) return "";
  return String(ws).replace(/^ws(s?):\/\//i, "http$1://").replace(/\/+$/, "");
}
function accountAvailable(){ return !!accountApiBase(); }
async function accountFetch(method, path, body, opts){
  opts = opts || {};
  const base = accountApiBase();
  if(!base){ const e = new Error("NO_SERVER"); e.code = "NO_SERVER"; e.offline = true; throw e; }
  const ctl = (typeof AbortController !== "undefined") ? new AbortController() : null;
  const t = setTimeout(() => { if(ctl) ctl.abort(); }, opts.timeout || 20000);
  const headers = {};
  if(body !== undefined) headers["content-type"] = "application/json";
  if(opts.auth !== false && acct.session) headers.authorization = "Bearer " + acct.session.token;
  try{
    const r = await fetch(base + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body),
      signal: ctl ? ctl.signal : undefined, cache: "no-store", mode: "cors" });
    let j = null; try{ j = await r.json(); }catch(e){}
    acct.online = true;
    return { status: r.status, j: j || {} };
  }catch(e){
    acct.online = false;
    const x = new Error(ctl && ctl.signal.aborted ? "TIMEOUT" : "OFFLINE"); x.code = x.message; x.offline = true; throw x;
  }finally{ clearTimeout(t); }
}
// despierta al servidor (plan gratuito: se duerme y tarda ~1 min en arrancar) sin bloquear nada
function accountWarmup(){
  if(!accountAvailable()) return Promise.resolve(false);
  if(acct.warm && Date.now() - acct.warm.at < 60000) return acct.warm.p;
  const p = accountFetch("GET", "/api/health", undefined, { auth: false, timeout: 90000 })
    .then(r => { acct.health = r.status === 200 ? r.j : null; return !!(acct.health && acct.health.ok); }).catch(() => false);
  acct.warm = { at: Date.now(), p };
  return p;
}

/* ---------------- resumen del guardado ---------------- */
// Mismo cálculo que summarize() del servidor
function accountSummarize(sv){
  const s = { guardians: 0, maxLevel: 0, gold: 0, arenas: 0 };
  try{
    const ch = sv && sv.champions || {};
    for(const k in ch){ const c = ch[k] || {}; if(c.unlocked){ s.guardians++; s.maxLevel = Math.max(s.maxLevel, c.level | 0); } }
    s.gold = Math.max(0, Math.floor(+sv.gold || 0));
    const ac = sv && sv.arenasCleared || {};
    for(const k in ac) if(ac[k]) s.arenas++;
  }catch(e){}
  return s;
}
// ¿Este guardado tiene progreso de verdad? (un perfil recién creado no: no eligió ni su guardián)
function _acctMeaningful(sv){
  if(!sv) return false;
  const s = accountSummarize(sv);
  return s.guardians > 0 || s.arenas > 0 || (Array.isArray(sv.stash) && sv.stash.length > 0);
}
function _acctSummaryHtml(s){
  if(!s) return `<div class="acc-sum-empty">sin datos</div>`;
  const n = v => Number(v || 0).toLocaleString("es-AR");
  return `<div class="acc-sum-row"><span>Guardianes</span><b>${n(s.guardians)}</b></div>
    <div class="acc-sum-row"><span>Nivel más alto</span><b>${n(s.maxLevel)}</b></div>
    <div class="acc-sum-row"><span>Oro</span><b>${n(s.gold)}</b></div>
    <div class="acc-sum-row"><span>Arenas superadas</span><b>${n(s.arenas)}</b></div>`;
}
function _acctWhen(ts){
  if(!ts) return "";
  const d = Math.round((Date.now() - ts) / 1000);
  if(d < 45) return "recién";
  if(d < 3600) return "hace " + Math.max(1, Math.round(d / 60)) + " min";
  if(d < 86400) return "hace " + Math.round(d / 3600) + " h";
  try{ return new Date(ts).toLocaleDateString("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); }catch(e){ return ""; }
}

/* ---------------- aplicar lo de la nube / subir ---------------- */
function _acctCanApplyNow(){
  if(typeof net !== "undefined" && net.room) return false;   // en una Sala online no se toca el guardado
  return typeof state === "undefined" || ["title", "mainmenu", "account", "codex", "shop", "modeselect", "arenaselect", "inventory", "champdetail", "starter"].includes(state);
}
function _acctRefreshUi(){
  try{ if(typeof ensurePlayableArena === "function") ensurePlayableArena(); }catch(e){}
  try{ if(typeof netRestoreLastChamp === "function") netRestoreLastChamp(); }catch(e){}
  try{ if(typeof renderChampGrid === "function") renderChampGrid(); }catch(e){}
  try{ if(typeof renderSaveLine === "function") renderSaveLine(); }catch(e){}
  try{ if(typeof updateMenuBrandSub === "function") updateMenuBrandSub(); }catch(e){}
  try{ if(typeof state !== "undefined" && state === "mainmenu" && typeof renderMainMenu === "function") renderMainMenu(); }catch(e){}
  try{ if(typeof state !== "undefined" && state === "codex" && typeof codexRender === "function") codexRender(); }catch(e){}
}
function _acctBackup(suffix, raw){ if(!raw) return; try{ localStorage.setItem(SAVE_KEY + suffix, raw); }catch(e){} }
// Reemplaza el guardado local por el de la nube (el local queda respaldado en SAVE_KEY_antesDeNube).
function accountApplyCloud(cloud){
  const raw = _acctLocalRaw();
  const cloudRaw = JSON.stringify(cloud.data);
  if(raw && raw !== cloudRaw) _acctBackup("_antesDeNube", raw);
  acct.applying = true;
  try{
    localStorage.setItem(SAVE_KEY, cloudRaw);
    loadSave();              // misma carga (y migraciones) que al abrir el juego
    _acctRefreshUi();
  }catch(e){ console.error("No se pudo aplicar el guardado de la nube", e); }
  finally{ acct.applying = false; }
  const y = acct.sync;
  y.version = cloud.version | 0; y.hash = _acctHash(cloudRaw); y.updatedAt = cloud.updatedAt || 0; y.lastOk = Date.now(); y.beacon = null;
  y.dirty = _acctHash(_acctLocalRaw()) !== y.hash; // si una migración lo tocó al cargar, queda para subir
  _acctSaveSync();
  if(y.dirty) _acctSchedule(ACCOUNT_DEBOUNCE_MS);
  _acctEmit();
}
function _acctSchedule(ms){
  if(acct.timer) clearTimeout(acct.timer);
  acct.timer = setTimeout(() => { acct.timer = null; _acctTick(); }, ms);
}
// Lo que toque hacer en el próximo intento: si este dispositivo todavía no se reconcilió con la
// cuenta (ej. se cortó la red justo después de entrar), bajar; si no, subir lo pendiente.
function _acctTick(){
  const s = acct.session, y = acct.sync;
  if(!s || acct.conflict) return;
  if(!y || y.user !== _acctKey(s.user)) accountPull("reintento");
  else if(y.dirty) accountUpload("demora");
}
// Gancho de js/storage/save.js (persistNow): el guardado local cambió.
function accountOnPersist(){
  if(acct.applying) return;
  const y = acct.sync || (acct.sync = { user: "", version: 0, hash: "", dirty: false });
  const h = _acctHash(_acctLocalRaw());
  if(h === y.hash) return;
  if(!y.dirty){ y.dirty = true; _acctSaveSync(); _acctEmit(); }
  if(acct.session && !acct.conflict) _acctSchedule(typeof state !== "undefined" && state === "playing" ? ACCOUNT_DEBOUNCE_PLAYING_MS : ACCOUNT_DEBOUNCE_MS);
}
// Gancho de setState (js/ui/screens.js): al terminar la partida se sube enseguida; lo que quedó
// pendiente de aplicar/preguntar se hace al volver a un menú.
function accountOnState(s){
  if(s === "gameover" || s === "victory"){ if(acct.session && acct.sync && acct.sync.dirty) _acctSchedule(1500); return; }
  if(s === "mainmenu") _acctRenderChip();
  if(!_acctCanApplyNow() || s === "title") return;
  if(acct.pendingApply){ const c = acct.pendingApply; acct.pendingApply = null; setTimeout(() => _acctReconcile(c), 0); }
  else if(acct.conflict && !acct.conflict.shown) setTimeout(_acctShowConflict, 0);
}
async function accountUpload(reason){
  const s = acct.session, y = acct.sync;
  if(!s || !y || acct.uploading || acct.conflict) return false;
  if(y.user !== _acctKey(s.user)) return false;   // todavía no se reconcilió este dispositivo con esta cuenta
  const raw = _acctLocalRaw(); if(!raw) return false;
  let data; try{ data = JSON.parse(raw); }catch(e){ return false; }
  acct.uploading = true; _acctEmit();
  try{
    const r = await accountFetch("PUT", "/api/save", { data, baseVersion: y.version | 0 });
    if(r.status === 200){
      y.version = r.j.version | 0; y.hash = _acctHash(raw); y.updatedAt = r.j.updatedAt || Date.now(); y.lastOk = Date.now();
      y.dirty = _acctHash(_acctLocalRaw()) !== y.hash; y.beacon = null;
      acct.retryMs = 0; _acctSaveSync();
      if(y.dirty) _acctSchedule(ACCOUNT_DEBOUNCE_MS);
      return true;
    }
    if(r.status === 409){ acct.uploading = false; await accountPull("conflicto"); return false; }
    if(r.status === 401){ _acctSessionLost(); return false; }
    if(r.status === 413){ if(typeof showNetToast === "function") showNetToast("⚠ Tu guardado es demasiado grande para la nube: queda en este dispositivo."); return false; }
    _acctRetryLater();
    return false;
  }catch(e){ _acctRetryLater(); return false; }
  finally{ acct.uploading = false; _acctEmit(); }
}
function _acctRetryLater(){
  acct.retryMs = Math.min(300000, acct.retryMs ? acct.retryMs * 2 : 20000);
  _acctSchedule(acct.retryMs);
}
function _acctSessionLost(){
  acct.session = null; _acctSaveSession();
  if(typeof showNetToast === "function") showNetToast("Tu sesión venció: entrá de nuevo desde tu perfil. El progreso sigue en este dispositivo.");
  _acctEmit();
}
// Baja lo de la nube y lo reconcilia con lo local.
async function accountPull(reason){
  if(!acct.session || acct.pulling) return;
  acct.pulling = true; _acctEmit();
  try{
    const r = await accountFetch("GET", "/api/save", undefined, { timeout: reason === "login" ? 90000 : 30000 });
    if(r.status === 401){ _acctSessionLost(); return; }
    if(r.status !== 200){ _acctRetryLater(); return; }
    acct.lastPull = Date.now();
    const cloud = { version: r.j.version | 0, updatedAt: r.j.updatedAt || 0, summary: r.j.summary || null, data: r.j.data || null };
    if(!_acctCanApplyNow() && reason !== "login"){ acct.pendingApply = cloud; return; }
    await _acctReconcile(cloud);
  }catch(e){ _acctRetryLater(); }
  finally{ acct.pulling = false; _acctEmit(); }
}
async function _acctReconcile(cloud){
  const s = acct.session; if(!s) return;
  const key = _acctKey(s.user);
  const y = acct.sync || (acct.sync = { user: "", version: 0, hash: "", dirty: true });
  const raw = _acctLocalRaw();
  let local = null; try{ local = raw ? JSON.parse(raw) : null; }catch(e){}
  const firstHere = y.user !== key;
  // 1) la nube está vacía: se sube lo de este dispositivo (el invitado que crea su cuenta)
  if(!cloud.data){
    y.user = key; y.version = cloud.version | 0; y.dirty = true; _acctSaveSync();
    await accountUpload("primera");
    return;
  }
  // 2) ya son iguales: solo se anota la versión
  if(local && JSON.stringify(cloud.data) === JSON.stringify(local)){
    Object.assign(y, { user: key, version: cloud.version, hash: _acctHash(raw), dirty: false, beacon: null, updatedAt: cloud.updatedAt, lastOk: Date.now() });
    _acctSaveSync(); return;
  }
  // 2b) la nube tiene justo lo que se mandó con el beacon al cerrar la pestaña (sin respuesta):
  //     es nuestra propia versión, no un conflicto
  const bc = y.beacon;
  if(!firstHere && bc && cloud.version === bc.base + 1 && _acctHash(JSON.stringify(cloud.data)) === bc.hash){
    Object.assign(y, { version: cloud.version, hash: bc.hash, beacon: null, updatedAt: cloud.updatedAt, lastOk: Date.now() });
    y.dirty = _acctHash(raw) !== y.hash; _acctSaveSync();
    if(y.dirty) await accountUpload("tras-beacon");
    return;
  }
  // 3) este dispositivo ya estaba al día con esta cuenta y no cambió nada: gana la nube
  if(!firstHere && !y.dirty){ if(cloud.version !== y.version) accountApplyCloud(cloud); return; }
  // 4) lo local no tiene progreso real (perfil recién creado): gana la nube
  if(!_acctMeaningful(local)){ y.user = key; accountApplyCloud(cloud); return; }
  // 5) cambios locales sobre la misma versión que tiene la nube: se suben
  if(!firstHere && y.dirty && cloud.version === y.version){ await accountUpload("pendiente"); return; }
  // 6) los dos cambiaron: se pregunta
  acct.conflict = { cloud, local, localRaw: raw, shown: false };
  _acctEmit();
  // en el título no se interrumpe: se pregunta al tocar "Toca para continuar" (accountGate)
  if(_acctCanApplyNow() && !(typeof state !== "undefined" && state === "title")) _acctShowConflict();
}
// El jugador eligió en el aviso de conflicto.
async function accountResolveConflict(choice){
  const c = acct.conflict; if(!c || !acct.session) return;
  const y = acct.sync, key = _acctKey(acct.session.user);
  if(choice === "cloud"){
    acct.conflict = null; y.user = key;
    accountApplyCloud(c.cloud);
    if(typeof showNetToast === "function") showNetToast("☁ Usando el progreso de la nube (el de este dispositivo quedó respaldado).");
    return true;
  }
  // este dispositivo: se sube forzando (la copia de la nube queda respaldada acá)
  _acctBackup("_nubeReemplazada", JSON.stringify(c.cloud.data));
  const raw = _acctLocalRaw();
  let data; try{ data = JSON.parse(raw); }catch(e){ return false; }
  try{
    const r = await accountFetch("PUT", "/api/save", { data, baseVersion: c.cloud.version | 0, force: true });
    if(r.status === 200){
      acct.conflict = null;
      Object.assign(y, { user: key, version: r.j.version | 0, hash: _acctHash(raw), dirty: false, updatedAt: r.j.updatedAt, lastOk: Date.now() });
      _acctSaveSync(); _acctEmit();
      if(typeof showNetToast === "function") showNetToast("📱 Se subió el progreso de este dispositivo a la nube.");
      return true;
    }
    if(r.status === 401) _acctSessionLost();
  }catch(e){}
  return false;
}

/* ---------------- entrar / crear / salir ---------------- */
function _acctSetSession(j){
  acct.session = { token: j.token, user: j.user.user, name: j.user.name || j.user.user, expiresAt: j.expiresAt };
  _acctSaveSession();
  try{ sessionStorage.removeItem(ACCOUNT_GUEST_KEY); }catch(e){}
  // el nombre de la cuenta pasa a ser el de la Sala multijugador
  if(typeof netSetPlayerName === "function") netSetPlayerName(acct.session.name);
  _acctEmit();
}
async function accountLogin(user, pass){
  const r = await accountFetch("POST", "/api/login", { user, pass }, { auth: false, timeout: 90000 });
  if(r.status !== 200) return { ok: false, status: r.status, error: r.j.error, msg: r.j.msg || "No se pudo entrar." };
  _acctSetSession(r.j);
  await accountPull("login");
  return { ok: true };
}
async function accountRegister(user, pass, email){
  const r = await accountFetch("POST", "/api/register", { user, pass, email: email || undefined }, { auth: false, timeout: 90000 });
  if(r.status !== 201) return { ok: false, status: r.status, error: r.j.error, msg: r.j.msg || "No se pudo crear la cuenta." };
  _acctSetSession(r.j);
  await accountPull("login");
  return { ok: true };
}
async function accountLogout(){
  if(!acct.session) return;
  if(acct.sync && acct.sync.dirty && !acct.conflict) await accountUpload("salir");
  const token = acct.session.token;
  try{ await fetch(accountApiBase() + "/api/logout", { method: "POST", headers: { authorization: "Bearer " + token }, cache: "no-store" }); }catch(e){}
  acct.session = null; acct.conflict = null; acct.pendingApply = null;
  if(acct.timer){ clearTimeout(acct.timer); acct.timer = null; }
  _acctSaveSession();
  _acctEmit();
}
async function accountRename(name){
  const r = await accountFetch("PUT", "/api/profile", { name });
  if(r.status === 200){
    acct.session.name = r.j.user.name; _acctSaveSession();
    if(typeof netSetPlayerName === "function") netSetPlayerName(acct.session.name);
    _acctEmit(); return { ok: true };
  }
  if(r.status === 401) _acctSessionLost();
  return { ok: false, msg: r.j.msg || "No se pudo guardar el nombre." };
}

/* ============================================================
   PANTALLA DE CUENTA
   ============================================================ */
function _acctBuild(){
  if(acct.el) return acct.el;
  const el = document.createElement("div");
  el.id = "account-screen";
  el.className = "screen hidden";
  el.innerHTML = `<div class="acc-panel" role="dialog" aria-labelledby="acc-title">
    <div class="acc-brand">LA HORDA</div>
    <div class="acc-title" id="acc-title">Tu cuenta</div>
    <div class="acc-body"></div>
  </div>`;
  (document.getElementById("stage") || document.body).appendChild(el);
  if(typeof screens !== "undefined") screens.account = el;
  for(const t of ["pointerdown", "touchstart"]) el.addEventListener(t, ev => ev.stopPropagation(), { passive: true });
  acct.el = el;
  return el;
}
function _acctShow(){
  const el = _acctBuild();
  if(typeof setState === "function") setState("account");
  el.classList.remove("hidden");
}
function _acctStatus(text, kind){
  const s = acct.el && acct.el.querySelector(".acc-status");
  if(!s) return;
  s.textContent = text || "";
  s.className = "acc-status" + (kind ? " " + kind : "");
}
function _acctRenderAuth(mode){
  acct.view = mode;
  const el = _acctBuild(), body = el.querySelector(".acc-body");
  el.querySelector(".acc-title").textContent = mode === "register" ? "Crear cuenta" : "Entrar";
  const noServer = !accountAvailable();
  const reg = mode === "register";
  body.innerHTML = `
    <div class="acc-tabs" role="tablist">
      <button type="button" class="acc-tab ${reg ? "" : "on"}" data-acc-tab="login" role="tab" aria-selected="${!reg}">Entrar</button>
      <button type="button" class="acc-tab ${reg ? "on" : ""}" data-acc-tab="register" role="tab" aria-selected="${reg}">Crear cuenta</button>
    </div>
    <form class="acc-form" autocomplete="on" novalidate>
      <label class="acc-field"><span>Usuario</span>
        <input name="user" id="acc-user" maxlength="16" autocomplete="username" autocapitalize="off" spellcheck="false" placeholder="3 a 16 letras o números" required></label>
      <label class="acc-field"><span>Contraseña</span>
        <input name="pass" id="acc-pass" type="password" maxlength="128" autocomplete="${reg ? "new-password" : "current-password"}" placeholder="${reg ? "6 caracteres o más" : ""}" required></label>
      ${reg ? `<label class="acc-field"><span>Repetir contraseña</span>
        <input name="pass2" id="acc-pass2" type="password" maxlength="128" autocomplete="new-password" required></label>
      <label class="acc-field"><span>Correo <i>(opcional)</i></span>
        <input name="email" id="acc-email" type="email" maxlength="170" autocomplete="email" placeholder="por si algún día hace falta"></label>` : ""}
      <button type="submit" class="btn wide acc-submit" id="acc-submit">${reg ? "Crear cuenta" : "Entrar"}</button>
      <div class="acc-status" role="status" aria-live="polite"></div>
    </form>
    <div class="acc-or"><span>o</span></div>
    <button type="button" class="btn secondary wide acc-guest" id="acc-guest-btn">Jugar como invitado</button>
    <div class="acc-note">${reg
      ? "Tu progreso (guardianes, objetos, oro y campaña) queda guardado en la nube y lo seguís en cualquier dispositivo."
      : "Como invitado se juega igual, sin conexión: el progreso queda solo en este dispositivo. Podés crear la cuenta más tarde y se sube."}</div>`;
  body.querySelectorAll("[data-acc-tab]").forEach(b => b.addEventListener("click", () => { if(!acct.busy){ _acctRenderAuth(b.dataset.accTab); const u = document.getElementById("acc-user"); if(u) u.focus(); } }));
  body.querySelector(".acc-form").addEventListener("submit", ev => { ev.preventDefault(); _acctSubmit(reg); });
  body.querySelector("#acc-guest-btn").addEventListener("click", _acctGuest);
  if(noServer){
    body.querySelectorAll(".acc-form input, .acc-form button").forEach(x => { x.disabled = true; });
    _acctStatus("Las cuentas necesitan el servidor online (no configurado en esta versión). Jugá como invitado.", "warn");
  } else {
    // se despierta mientras escribe; si el servidor no tiene base de datos, se avisa con honestidad
    accountWarmup().then(() => {
      const h = acct.health;
      if(!h || h.persistent !== false || acct.view !== mode || !acct.el || acct.el.querySelector(".acc-warn-db")) return;
      const n = document.createElement("div");
      n.className = "acc-note acc-warn-db";
      n.textContent = "⚠ Servidor de prueba sin base de datos: las cuentas pueden borrarse. Tu progreso igual queda en este dispositivo.";
      const form = acct.el.querySelector(".acc-form"); if(form) form.after(n);
    });
  }
  _acctShowBack();
}
function _acctShowBack(){
  // si se abrió desde el menú (no desde el título), también se puede volver sin elegir
  const body = acct.el.querySelector(".acc-body");
  const old = body.querySelector(".acc-back"); if(old) old.remove();
  if(!acct.back || acct.view === "conflict") return;
  const b = document.createElement("button");
  b.type = "button"; b.className = "btn secondary acc-back"; b.textContent = "Volver";
  b.addEventListener("click", _acctClose);
  body.appendChild(b);
}
async function _acctSubmit(reg){
  if(acct.busy) return;
  const user = (document.getElementById("acc-user").value || "").trim();
  const pass = document.getElementById("acc-pass").value || "";
  if(user.length < 3){ _acctStatus("Escribí tu usuario (3 a 16 letras o números).", "err"); document.getElementById("acc-user").focus(); return; }
  if(!pass){ _acctStatus("Escribí tu contraseña.", "err"); document.getElementById("acc-pass").focus(); return; }
  let email = "";
  if(reg){
    if(!/^[\p{L}\p{N}_.-]{3,16}$/u.test(user)){ _acctStatus("El usuario solo puede tener letras, números y _ . - (3 a 16).", "err"); return; }
    if(pass.length < 6){ _acctStatus("La contraseña tiene que tener 6 caracteres o más.", "err"); return; }
    if(pass !== document.getElementById("acc-pass2").value){ _acctStatus("Las contraseñas no coinciden.", "err"); document.getElementById("acc-pass2").focus(); return; }
    email = (document.getElementById("acc-email").value || "").trim();
  }
  acct.busy = true;
  const btn = document.getElementById("acc-submit");
  const inputs = acct.el.querySelectorAll(".acc-form input, .acc-tab");
  inputs.forEach(x => { x.disabled = true; }); btn.disabled = true;
  const t0 = Date.now();
  _acctStatus(reg ? "Creando tu cuenta…" : "Entrando…");
  // plan gratuito: el servidor dormido tarda en despertar; se muestra cuánto va
  const tick = setInterval(() => {
    const s = Math.round((Date.now() - t0) / 1000);
    if(s >= 3) _acctStatus(`Despertando el servidor… ${s} s (la primera vez puede tardar hasta un minuto)`);
  }, 1000);
  let res;
  try{ res = reg ? await accountRegister(user, pass, email) : await accountLogin(user, pass); }
  catch(e){ res = { ok: false, msg: e.code === "TIMEOUT" ? "El servidor no respondió. Probá de nuevo o jugá como invitado." : "Sin conexión con el servidor. Podés jugar como invitado y entrar después." }; }
  clearInterval(tick);
  acct.busy = false;
  if(!acct.el || acct.view === "conflict") return;
  inputs.forEach(x => { x.disabled = false; }); btn.disabled = false;
  if(!res.ok){
    _acctStatus(res.msg, "err");
    const f = document.getElementById(res.error === "BAD_PASS" || res.error === "BAD_CREDENTIALS" ? "acc-pass" : "acc-user");
    if(f){ f.focus(); if(res.error === "BAD_CREDENTIALS") f.select(); }
    return;
  }
  if(acct.conflict){ _acctShowConflict(); return; }
  _acctFinish(reg ? `¡Cuenta creada! Bienvenido, ${acct.session.name}.` : `Hola, ${acct.session.name}. Progreso sincronizado.`);
}
function _acctGuest(){
  try{ sessionStorage.setItem(ACCOUNT_GUEST_KEY, "1"); }catch(e){}
  _acctFinish(null);
}
// Sale de la pantalla de cuenta hacia donde iba (menú principal / guardián de regalo) o de vuelta.
function _acctFinish(toast){
  const after = acct.after; acct.after = null;
  const back = acct.back; acct.back = null;
  if(acct.el) acct.el.classList.add("hidden");
  if(toast && typeof showNetToast === "function") showNetToast(toast);
  if(after){ after(); return; }
  _acctGoBack(back);
}
function _acctGoBack(back){
  const s = back || "mainmenu";
  if(typeof setState === "function") setState(s);
  if(s === "mainmenu" && typeof renderMainMenu === "function") renderMainMenu();
  if(s === "codex" && typeof codexRender === "function") codexRender();
}
function _acctClose(){
  if(acct.busy) return;
  const back = acct.back; acct.back = null; acct.after = null;
  if(acct.el) acct.el.classList.add("hidden");
  _acctGoBack(back);
}

/* ---------------- perfil (ya entró) ---------------- */
function _acctRenderProfile(){
  acct.view = "profile";
  const el = _acctBuild(), body = el.querySelector(".acc-body"), s = acct.session;
  el.querySelector(".acc-title").textContent = "Tu perfil";
  body.innerHTML = `
    <div class="acc-who"><span class="acc-avatar" aria-hidden="true">${_acctEsc((s.name || s.user).charAt(0).toUpperCase())}</span>
      <div><div class="acc-who-name">${_acctEsc(s.name || s.user)}</div><div class="acc-who-user">usuario: ${_acctEsc(s.user)}</div></div></div>
    <div class="acc-sync" id="acc-sync"></div>
    <form class="acc-form acc-rename" novalidate>
      <label class="acc-field"><span>Nombre visible (en la Sala)</span>
        <div class="acc-inline"><input id="acc-name" maxlength="16" value="${_acctEsc(s.name || s.user)}" autocomplete="nickname"><button type="submit" class="btn small">Guardar</button></div></label>
      <div class="acc-status" role="status" aria-live="polite"></div>
    </form>
    <div class="acc-actions">
      <button type="button" class="btn secondary" id="acc-sync-btn">☁ Sincronizar ahora</button>
      <button type="button" class="btn secondary acc-danger" id="acc-logout-btn">Cerrar sesión</button>
    </div>`;
  body.querySelector(".acc-rename").addEventListener("submit", async ev => {
    ev.preventDefault();
    const n = document.getElementById("acc-name").value.trim();
    if(!n){ _acctStatus("Poné un nombre.", "err"); return; }
    _acctStatus("Guardando…");
    try{ const r = await accountRename(n); _acctStatus(r.ok ? "Nombre guardado." : r.msg, r.ok ? "ok" : "err"); }
    catch(e){ _acctStatus("Sin conexión: probá más tarde.", "err"); }
  });
  body.querySelector("#acc-sync-btn").addEventListener("click", async () => {
    _acctStatus("Sincronizando…");
    await accountSyncNow();
    if(acct.conflict){ _acctShowConflict(); return; }
    _acctStatus(acct.online === false ? "Sin conexión: se sube solo cuando vuelva la red." : "Listo.", acct.online === false ? "warn" : "ok");
  });
  body.querySelector("#acc-logout-btn").addEventListener("click", async () => {
    const pending = acct.sync && acct.sync.dirty;
    const ok = typeof gameConfirm === "function"
      ? await gameConfirm(pending ? "Hay progreso que todavía no se subió a la nube. Se intenta subir ahora; si no hay conexión, queda en este dispositivo.\n\n¿Cerrar sesión?" : "Tu progreso queda guardado en la nube. ¿Cerrar sesión?", { okText: "Cerrar sesión", cancelText: "Cancelar" })
      : true;
    if(!ok) return;
    _acctStatus("Cerrando sesión…");
    await accountLogout();
    if(typeof showNetToast === "function") showNetToast("Sesión cerrada. Seguís como invitado en este dispositivo.");
    _acctRenderAuth("login");
  });
  _acctRenderProfileStatus();
  _acctShowBack();
}
function _acctRenderProfileStatus(){
  const box = acct.el && acct.el.querySelector("#acc-sync"); if(!box) return;
  const st = accountState();
  let txt, cls;
  if(st.conflict){ txt = "⚠ Hay que elegir qué progreso usar (nube o este dispositivo)."; cls = "warn"; }
  else if(st.syncing){ txt = "⏳ Sincronizando…"; cls = ""; }
  else if(st.pending){ txt = acct.online === false ? "📴 Sin conexión: el progreso se sube solo cuando vuelva la red." : "⏳ Hay progreso por subir."; cls = "warn"; }
  else if(st.lastSync){ txt = "☁ Progreso guardado en la nube · " + _acctWhen(st.lastSync); cls = "ok"; }
  else { txt = "☁ Guardado en la nube activado."; cls = "ok"; }
  box.textContent = txt; box.className = "acc-sync " + cls;
}

/* ---------------- conflicto: nube vs este dispositivo ---------------- */
function _acctShowConflict(){
  const c = acct.conflict; if(!c) return;
  c.shown = true;
  if(!acct.el || acct.el.classList.contains("hidden")){
    acct.back = acct.back || ((typeof state !== "undefined" && state !== "account") ? state : "mainmenu");
    _acctShow();
  }
  acct.view = "conflict";
  const el = acct.el, body = el.querySelector(".acc-body");
  el.querySelector(".acc-title").textContent = "¿Qué progreso usamos?";
  const localSum = accountSummarize(c.local);
  body.innerHTML = `
    <div class="acc-note acc-conflict-note">Tu cuenta tiene progreso guardado en la nube y este dispositivo tiene otro distinto. Elegí con cuál seguir: el otro queda respaldado en este dispositivo.</div>
    <div class="acc-conflict">
      <button type="button" class="acc-choice" id="acc-use-cloud">
        <div class="acc-choice-title">☁ La nube</div>
        <div class="acc-choice-when">${c.cloud.updatedAt ? "guardado " + _acctEsc(_acctWhen(c.cloud.updatedAt)) : ""}</div>
        ${_acctSummaryHtml(c.cloud.summary || accountSummarize(c.cloud.data))}
        <div class="acc-choice-go">Usar la nube</div>
      </button>
      <button type="button" class="acc-choice" id="acc-use-local">
        <div class="acc-choice-title">📱 Este dispositivo</div>
        <div class="acc-choice-when">jugado acá</div>
        ${_acctSummaryHtml(localSum)}
        <div class="acc-choice-go">Usar este dispositivo</div>
      </button>
    </div>
    <div class="acc-status" role="status" aria-live="polite"></div>`;
  const pick = async choice => {
    if(acct.busy) return;
    acct.busy = true;
    body.querySelectorAll(".acc-choice").forEach(b => { b.disabled = true; });
    _acctStatus(choice === "cloud" ? "Cargando el progreso de la nube…" : "Subiendo el progreso de este dispositivo…");
    const ok = await accountResolveConflict(choice);
    acct.busy = false;
    if(!ok){
      body.querySelectorAll(".acc-choice").forEach(b => { b.disabled = false; });
      _acctStatus("Sin conexión con el servidor. Probá de nuevo en un rato.", "err");
      return;
    }
    _acctFinish(null);
  };
  body.querySelector("#acc-use-cloud").addEventListener("click", () => pick("cloud"));
  body.querySelector("#acc-use-local").addEventListener("click", () => pick("local"));
}

/* ---------------- API pública ---------------- */
function accountOpen(){
  if(acct.busy) return;
  const cur = (typeof state !== "undefined") ? state : "mainmenu";
  if(cur !== "account") acct.back = cur === "title" ? "mainmenu" : cur;
  acct.after = null;
  _acctShow();
  if(acct.conflict){ _acctShowConflict(); return; }
  if(acct.session) _acctRenderProfile(); else _acctRenderAuth("login");
}
const ACCOUNT_STALE_MS = 20000;
function _acctPullIfStale(reason){
  const s = acct.session, y = acct.sync;
  if(!s || !y || y.user !== _acctKey(s.user) || y.dirty || acct.uploading || acct.pulling || acct.conflict) return;
  if(Date.now() - Math.max(y.lastOk || 0, acct.lastPull || 0) < ACCOUNT_STALE_MS) return;
  accountPull(reason);
}
async function accountSyncNow(){
  if(!acct.session) return;
  if(acct.sync && acct.sync.dirty && acct.sync.user === _acctKey(acct.session.user)){ const ok = await accountUpload("manual"); if(ok || acct.conflict) return; }
  await accountPull("manual");
}
function _acctAutoSkip(){
  try{
    if(window.__accountTest) return false;
    if(/[?&]account=1\b/.test(location.search)) return false;
    return !!navigator.webdriver;
  }catch(e){ return false; }
}
// Gancho del botón "Toca para continuar" (js/ui/menus.js). Devuelve true si se muestra la pantalla
// de cuenta (y next() se llama después); false para seguir directo como siempre.
function accountGate(next){
  if(acct.session){ if(acct.conflict && !acct.conflict.shown){ acct.after = next; acct.back = null; _acctShow(); _acctShowConflict(); return true; } return false; }
  let guestTab = false; try{ guestTab = sessionStorage.getItem(ACCOUNT_GUEST_KEY) === "1"; }catch(e){}
  if(guestTab || _acctAutoSkip()) return false;
  acct.after = next; acct.back = null;
  _acctShow();
  _acctRenderAuth("login");
  return true;
}

/* ---------------- chip mínimo en el menú principal ---------------- */
// Solo si el menú no trae uno propio (cualquier elemento con [data-account-chip]).
function _acctRenderChip(){
  const menu = document.getElementById("mainmenu-screen"); if(!menu) return;
  const external = document.querySelector("[data-account-chip]:not(#account-chip)");
  let chip = document.getElementById("account-chip");
  if(external){ if(chip) chip.remove(); return; }
  if(!chip){
    chip = document.createElement("button");
    chip.type = "button"; chip.id = "account-chip"; chip.className = "account-chip";
    chip.addEventListener("click", () => accountOpen());
    menu.appendChild(chip);
  }
  const st = accountState();
  const mark = st.conflict ? "⚠" : st.syncing ? "⏳" : st.pending ? (acct.online === false ? "📴" : "⏳") : "☁";
  chip.innerHTML = st.logged
    ? `<span class="acc-chip-av">${_acctEsc(st.name.charAt(0).toUpperCase())}</span><span class="acc-chip-name">${_acctEsc(st.name)}</span><span class="acc-chip-sync" title="Guardado en la nube">${mark}</span>`
    : `<span class="acc-chip-av">?</span><span class="acc-chip-name">Invitado</span><span class="acc-chip-sync">Entrar</span>`;
  chip.setAttribute("aria-label", st.logged ? `Perfil de ${st.name}` : "Entrar o crear cuenta");
}

/* ---------------- arranque ---------------- */
(function accountInit(){
  acct.session = _acctLoad(ACCOUNT_KEY);
  if(acct.session && (!acct.session.token || !acct.session.user)) acct.session = null;
  acct.sync = _acctLoad(ACCOUNT_SYNC_KEY) || { user: "", version: 0, hash: "", dirty: false };
  window.accountOpen = accountOpen;
  window.accountState = accountState;
  window.accountSyncNow = accountSyncNow;
  window.__account = acct; // diagnóstico / pruebas
  // al cerrar u ocultar la pestaña: se sube lo pendiente (beacon si es chico; si no, queda en cola)
  window.addEventListener("pagehide", () => {
    const s = acct.session, y = acct.sync;
    if(!s || !y || !y.dirty || acct.conflict || y.user !== _acctKey(s.user) || !navigator.sendBeacon) return;
    const raw = _acctLocalRaw(); if(!raw) return;
    const body = '{"token":' + JSON.stringify(s.token) + ',"baseVersion":' + (y.version | 0) + ',"data":' + raw + "}";
    if(body.length > ACCOUNT_BEACON_MAX) return;
    try{
      // la respuesta no llega nunca: se anota qué se mandó, para reconocer esa versión al volver
      if(navigator.sendBeacon(accountApiBase() + "/api/save-beacon", new Blob([body], { type: "text/plain" }))){ y.beacon = { base: y.version | 0, hash: _acctHash(raw) }; _acctSaveSync(); }
    }catch(e){}
  });
  document.addEventListener("visibilitychange", () => {
    if(document.visibilityState === "hidden" && acct.session && acct.sync && acct.sync.dirty && !acct.uploading) accountUpload("oculta");
    // al volver a la pestaña (o al juego en el celular): si otro dispositivo subió algo mientras tanto,
    // se baja ANTES de que un cambio de acá choque con esa versión (antes: conflicto falso o beacon rechazado)
    else if(document.visibilityState === "visible") _acctPullIfStale("vuelve");
  });
  window.addEventListener("focus", () => _acctPullIfStale("foco"));
  window.addEventListener("online", () => { if(acct.session && acct.sync && acct.sync.dirty){ acct.retryMs = 0; _acctSchedule(1000); } });
  // sesión recordada: se entra directo y la nube se baja en segundo plano (nunca frena el arranque)
  setTimeout(() => { _acctRenderChip(); if(acct.session) accountPull("inicio"); }, 0);
})();
