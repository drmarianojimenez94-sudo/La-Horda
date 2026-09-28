// CUENTAS DE USUARIO (js/net/account.js + server/accounts.js), con navegadores independientes
// (cada "dispositivo" es un contexto de Chromium con su propio localStorage):
//   invitado sin red (arranca sin demoras) · compatibilidad con las pruebas viejas (sin pantalla de
//   cuenta con webdriver) · crear cuenta · el nombre de la cuenta va a la Sala · subida con demora ·
//   subida al terminar la partida · sesión recordada (entra directo, también sin red) · sincronización
//   entre dos navegadores · contraseña incorrecta · límite de intentos · cola sin conexión · conflicto
//   (nube vs este dispositivo, con resumen) en los dos sentidos · invitado con progreso que crea cuenta
//   (se sube) · invitado con progreso que entra a una cuenta con progreso (pregunta) · cerrar sesión ·
//   subida al cerrar la pestaña (beacon) sin conflicto falso al volver.
// Por defecto levanta su propio servidor (server/relay.js) en RELAY_PORT con una carpeta temporal.
//   (python3 -m http.server 8802 &) ; SITE=http://127.0.0.1:8802 RELAY_PORT=8812 node tools/net-test/accounts.js [capturas]
//   RELAY=ws://127.0.0.1:8812 usa un servidor ya levantado (con REGISTER_MAX_IP alto).
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const path = require('path'), fs = require('fs'), os = require('os'), { spawn } = require('child_process');
const SITE = process.env.SITE || process.env.SE_BASE_URL || 'http://127.0.0.1:8802';
const RELAY_PORT = process.env.RELAY_PORT || '8812';
const RELAY = process.env.RELAY || ('ws://127.0.0.1:' + RELAY_PORT);
const API = RELAY.replace(/^ws/, 'http');
const OUT = process.argv[2];
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 400) : '')); if (!ok) fails++; };
const RUN = Date.now().toString(36).slice(-5);
const U_A = 'Ana' + RUN, U_V = 'Vic' + RUN, U_D = 'Dani' + RUN, PASS = 'espada-123';
const URL_ACC = `${SITE}/index.html?server=${encodeURIComponent(RELAY)}&account=1`;

async function startRelay(){
  if (process.env.RELAY) return null;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'horda-acc-e2e-'));
  const env = Object.assign({}, process.env, { PORT: RELAY_PORT, DATA_DIR: dir, ALLOWED_ORIGINS: new URL(SITE).origin, REGISTER_MAX_IP: '500', DATABASE_URL: '' });
  const logFile = path.join(dir, 'relay.log'), fd = fs.openSync(logFile, 'a');
  const cp = spawn(process.execPath, [path.join(__dirname, '../../server/relay.js')], { env, stdio: ['ignore', fd, fd] });
  cp.on('exit', code => { if (code) console.log('RELAY_EXIT', code, fs.readFileSync(logFile, 'utf8').split('\n').slice(-5).join(' | ')); });
  process.on('exit', () => { try { cp.kill(); } catch (e) {} });
  const log = () => fs.readFileSync(logFile, 'utf8');
  for (let i = 0; i < 50; i++) { try { const r = await fetch(API + '/api/health'); if (r.ok && (await r.json()).ok) break; } catch (e) {} await sleep(100); }
  return { cp, dir, log };
}
async function cloudSave(token){ const r = await fetch(API + '/api/save', { headers: { authorization: 'Bearer ' + token } }); return r.json(); }

(async () => {
  const relay = await startRelay();
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const errors = [];
  async function device(name, opts){
    const ctx = await browser.newContext(Object.assign({ viewport: { width: 844, height: 390 }, hasTouch: true }, opts || {}));
    await ctx.addInitScript(() => { window.__campaignMode = true; });
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push(name + ' pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error' && !/ERR_CERT|fonts\.g|net::|404|Failed to load resource|ERR_INTERNET_DISCONNECTED|ERR_FAILED/.test(m.text())) errors.push(name + ': ' + m.text().slice(0, 200)); });
    const d = { name, ctx, page, E: (fn, a) => d.page.evaluate(fn, a) };
    d.boot = async (url, clear) => {
      await d.page.goto(url || URL_ACC, { waitUntil: 'domcontentloaded', timeout: 120000 });
      if (clear) { await d.E(() => { localStorage.clear(); sessionStorage.clear(); }); await d.page.goto(url || URL_ACC, { waitUntil: 'domcontentloaded', timeout: 120000 }); }
      for (let k = 0; k < 900; k++) { if (await d.E(() => !document.getElementById('title-continue-btn').disabled)) break; await sleep(100); }
    };
    d.shot = async (n) => { if (OUT) { fs.mkdirSync(OUT, { recursive: true }); await d.page.screenshot({ path: path.join(OUT, n + '.png') }); } };
    d.vis = sel => d.page.isVisible(sel).catch(() => false);
    d.state = () => d.E(() => state);
    d.token = () => d.E(() => (JSON.parse(localStorage.getItem('horda_account') || 'null') || {}).token);
    d.waitFor = async (fn, ms, arg) => { const t0 = Date.now(); while (Date.now() - t0 < (ms || 10000)) { if (await d.E(fn, arg).catch(() => false)) return true; await sleep(100); } return false; };
    d.progress = (gold, lvl) => d.E(([g, l]) => { const k = Object.keys(save.champions)[0]; save.champions[k].unlocked = true; save.champions[k].level = l; save.starterChosen = true; save.gold = g; persist(); }, [gold, lvl]);
    // "sin conexión" con el servidor: se cortan solo los pedidos al servidor (el juego sigue servido)
    const cut = r => r.abort('internetdisconnected');
    d.offline = async on => { if (on) await ctx.route(API + '/**', cut); else await ctx.unroute(API + '/**', cut); };
    d.fill = async (user, pass, extra) => {
      await d.page.fill('#acc-user', user); await d.page.fill('#acc-pass', pass);
      if (extra && extra.pass2 !== undefined) await d.page.fill('#acc-pass2', extra.pass2);
      await d.page.click('#acc-submit');
    };
    return d;
  }

  // ---------- 1) invitado sin red: arranca igual y sin demoras ----------
  {
    const off = await device('offline');
    await off.ctx.route('**/*', r => r.request().url().startsWith(SITE) ? r.continue() : r.abort());
    await off.boot(`${SITE}/index.html?account=1`, true); // servidor por defecto (Render), bloqueado
    // se mide DENTRO de la página: el cambio de pantalla es sincrónico (no espera a la red)
    const clickSync = sel => off.E(q => { const t = performance.now(); document.querySelector(q).click(); return { ms: Math.round(performance.now() - t), st: state }; }, sel);
    const c1 = await clickSync('#title-continue-btn');
    check('invitado_sin_red.pantalla_al_instante', c1.st === 'account' && c1.ms < 1000 && await off.vis('#acc-guest-btn'), c1);
    await off.shot('01_cuenta_sin_red');
    const c2 = await clickSync('#acc-guest-btn');
    check('invitado_sin_red.entra_al_instante', ['starter', 'mainmenu'].includes(c2.st) && c2.ms < 1000, c2);
    await off.E(() => { const k = Object.keys(save.champions)[0]; save.champions[k].unlocked = true; setState('title'); });
    await off.page.click('#title-continue-btn'); await sleep(200);
    check('invitado.recordado_en_la_pestania', (await off.state()) === 'mainmenu');
    check('invitado.chip_invitado', /Invitado/.test(await off.E(() => (document.getElementById('account-chip') || {}).textContent || '')));
    // pruebas viejas (webdriver, sin ?account=1): la pantalla de cuenta no se interpone
    await off.boot(`${SITE}/index.html`, true);
    await off.E(() => { const k = Object.keys(save.champions)[0]; save.champions[k].unlocked = true; persist(); });
    await off.page.click('#title-continue-btn'); await sleep(200);
    check('compat.pruebas_viejas_van_directo_al_menu', (await off.state()) === 'mainmenu', await off.state());
    await off.ctx.close();
  }

  // ---------- 2) crear cuenta (dispositivo A, perfil nuevo) ----------
  const A = await device('A');
  await A.boot(URL_ACC, true);
  await A.page.click('#title-continue-btn');
  await A.page.waitForSelector('#account-screen:not(.hidden)');
  await A.page.click('[data-acc-tab="register"]');
  await A.fill(U_A, PASS, { pass2: 'otra-cosa' });
  check('registro.claves_distintas', /no coinciden/.test(await A.E(() => document.querySelector('.acc-status').textContent)));
  await A.shot('02_crear_cuenta');
  await A.page.fill('#acc-pass2', PASS); await A.page.fill('#acc-email', 'ana@ejemplo.com');
  await A.page.click('#acc-submit');
  const regOk = await A.waitFor(() => state === 'starter' || state === 'mainmenu', 15000);
  check('registro.entra_al_juego', regOk, await A.state());
  const acA = await A.E(() => accountState());
  check('registro.sesion', acA.logged && acA.name === U_A && acA.user === U_A, acA);
  check('registro.nombre_de_la_sala', (await A.E(() => netPlayerName())) === U_A);
  const tokA = await A.token();
  check('registro.token_en_localStorage', /^[a-f0-9]{64}$/.test(tokA || ''));
  await A.waitFor(() => !accountState().pending && !accountState().syncing, 8000);
  let cs = await cloudSave(tokA);
  check('registro.sube_el_guardado_inicial', cs.version === 1 && cs.data && cs.data.champions, cs.version);
  // progreso -> subida con demora (debounce)
  await A.E(() => setState('mainmenu'));
  await A.progress(12345, 7);
  check('sync.pendiente_al_persistir', await A.E(() => accountState().pending));
  await A.waitFor(() => !accountState().pending, 12000);
  cs = await cloudSave(tokA);
  check('sync.sube_con_demora', cs.version === 2 && cs.data.gold === 12345, { v: cs.version, gold: cs.data && cs.data.gold });
  await A.shot('03_menu_con_chip');
  check('chip.muestra_nombre', (await A.E(() => document.getElementById('account-chip').textContent)).includes(U_A));
  // al terminar la partida se sube enseguida (sin esperar la demora larga)
  await A.E(() => { save.gold = 13000; persist(); setState('gameover'); });
  const tGo = Date.now();
  await A.waitFor(() => !accountState().pending, 6000);
  cs = await cloudSave(tokA);
  check('sync.fin_de_partida_sube_ya', cs.data.gold === 13000 && Date.now() - tGo < 5000, { ms: Date.now() - tGo, gold: cs.data.gold });
  await A.E(() => setState('mainmenu'));

  // ---------- 3) sesión recordada ----------
  await A.boot(URL_ACC);
  await A.page.click('#title-continue-btn'); await sleep(250);
  check('sesion_recordada.entra_directo', (await A.state()) === 'mainmenu' && (await A.E(() => accountState().logged)), await A.state());
  // y sin red también entra directo, sin esperar
  await A.offline(true);
  await A.boot(URL_ACC);
  const cOff = await A.E(() => { const t = performance.now(); document.getElementById('title-continue-btn').click(); return { ms: Math.round(performance.now() - t), st: state }; });
  check('sesion_recordada.sin_red_sin_demora', cOff.st === 'mainmenu' && cOff.ms < 1000, cOff);
  // cola sin conexión: progreso offline queda pendiente y se sube al volver la red
  await A.progress(14000, 8);
  await sleep(800);
  check('cola.pendiente_sin_red', await A.E(() => accountState().pending));
  await A.offline(false);
  await A.E(() => window.dispatchEvent(new Event('online')));
  await A.waitFor(() => !accountState().pending, 10000);
  cs = await cloudSave(tokA);
  check('cola.sube_al_volver_la_red', cs.data.gold === 14000 && cs.data.champions[Object.keys(cs.data.champions)[0]].level === 8, cs.data.gold);

  // ---------- 4) dispositivo B entra y ve el progreso de A ----------
  const B = await device('B');
  await B.boot(URL_ACC, true);
  await B.page.click('#title-continue-btn');
  await B.page.waitForSelector('#account-screen:not(.hidden)');
  // contraseña incorrecta
  await B.fill(U_A, 'no-es-esta');
  await B.waitFor(() => /incorrectos/.test(document.querySelector('.acc-status').textContent), 8000);
  check('login.clave_incorrecta', (await B.state()) === 'account' && !(await B.E(() => accountState().logged)));
  await B.shot('04_clave_incorrecta');
  await B.page.fill('#acc-pass', PASS); await B.page.click('#acc-submit');
  await B.waitFor(() => state === 'mainmenu', 15000);
  const bView = await B.E(() => ({ gold: save.gold, lvl: save.champions[Object.keys(save.champions)[0]].level, st: state }));
  check('sync.B_ve_el_progreso_de_A', bView.gold === 14000 && bView.lvl === 8 && bView.st === 'mainmenu', bView);

  // ---------- 5) conflicto: A juega sin red mientras B sube otra cosa ----------
  await A.offline(true);
  await A.progress(55555, 12);
  await sleep(500);
  await B.progress(22222, 9);
  await B.waitFor(() => !accountState().pending, 12000);
  await A.offline(false);
  await A.E(() => accountSyncNow());
  const conflictShown = await A.waitFor(() => !!document.querySelector('#account-screen:not(.hidden) #acc-use-local'), 8000);
  check('conflicto.pregunta', conflictShown);
  const txt = await A.E(() => document.querySelector('.acc-conflict').textContent.replace(/\s+/g, ' '));
  check('conflicto.resumen_nube_y_dispositivo', /22\.222/.test(txt) && /55\.555/.test(txt) && /Nivel más alto\s*9/.test(txt) && /Nivel más alto\s*12/.test(txt), txt.slice(0, 200));
  await A.shot('05_conflicto');
  await A.page.click('#acc-use-local');
  await A.waitFor(() => state === 'mainmenu' && !accountState().conflict, 8000);
  cs = await cloudSave(tokA);
  check('conflicto.gana_este_dispositivo', cs.data.gold === 55555, cs.data.gold);
  check('conflicto.respaldo_de_la_nube', (await A.E(() => JSON.parse(localStorage.getItem('laHordaSave_v1_nubeReemplazada')).gold)) === 22222);
  await B.E(() => accountSyncNow());
  await B.waitFor(() => save.gold === 55555, 8000);
  check('conflicto.B_recibe_lo_elegido', (await B.E(() => save.gold)) === 55555);
  // ahora al revés: gana la nube
  await B.offline(true); await B.progress(66666, 13); await sleep(400);
  await A.progress(77777, 14); await A.waitFor(() => !accountState().pending, 12000);
  await B.offline(false); await B.E(() => accountSyncNow());
  await B.waitFor(() => !!document.querySelector('#account-screen:not(.hidden) #acc-use-cloud'), 8000);
  await B.page.click('#acc-use-cloud');
  await B.waitFor(() => state === 'mainmenu' && !accountState().conflict, 8000);
  check('conflicto.gana_la_nube', (await B.E(() => save.gold)) === 77777 && (await B.E(() => JSON.parse(localStorage.getItem('laHordaSave_v1_antesDeNube')).gold)) === 66666);

  // ---------- 6) límite de intentos ----------
  {
    const V = await device('V');
    await V.boot(URL_ACC, true);
    await V.page.click('#title-continue-btn');
    await V.page.click('[data-acc-tab="register"]');
    await V.fill(U_V, PASS, { pass2: PASS });
    await V.waitFor(() => state === 'starter' || state === 'mainmenu', 15000);
    await V.E(() => { localStorage.removeItem('horda_account'); });
    await V.boot(URL_ACC);
    await V.page.click('#title-continue-btn');
    let msg = '';
    for (let i = 0; i < 9; i++) {
      await V.fill(U_V, 'mala' + i);
      await V.waitFor(() => { const s = document.querySelector('.acc-status'); return s && /incorrectos|Demasiados/.test(s.textContent) && !document.getElementById('acc-submit').disabled; }, 8000);
      msg = await V.E(() => document.querySelector('.acc-status').textContent);
    }
    check('limite.demasiados_intentos', /Demasiados intentos/.test(msg), msg);
    await V.fill(U_V, PASS); await sleep(1200);
    check('limite.bloquea_aun_con_la_clave_buena', (await V.state()) === 'account' && /Demasiados/.test(await V.E(() => document.querySelector('.acc-status').textContent)));
    await V.shot('06_limite');
    await V.ctx.close();
  }

  // ---------- 7) invitado con progreso crea cuenta (se sube) y después entra a otra con progreso ----------
  {
    const D = await device('D');
    await D.boot(URL_ACC, true);
    await D.page.click('#title-continue-btn');
    await D.page.click('#acc-guest-btn');
    await D.E(() => setState('mainmenu'));
    await D.progress(4444, 5);
    await D.page.click('#account-chip');
    await D.page.waitForSelector('#account-screen:not(.hidden)');
    await D.page.click('[data-acc-tab="register"]');
    await D.fill(U_D, PASS, { pass2: PASS });
    await D.waitFor(() => state === 'mainmenu' && accountState().logged && !accountState().syncing, 15000);
    const tokD = await D.token();
    const csD = await cloudSave(tokD);
    check('invitado_crea_cuenta.sube_su_progreso', csD.version === 1 && csD.data.gold === 4444, { v: csD.version, gold: csD.data && csD.data.gold });
    // perfil -> cerrar sesión
    await D.page.click('#account-chip');
    await D.page.waitForSelector('#acc-logout-btn');
    await D.shot('07_perfil');
    await D.page.click('#acc-logout-btn');
    await sleep(350); await D.page.click('#game-dialog .gd-ok');
    await D.waitFor(() => !accountState().logged && !!document.getElementById('acc-user'), 8000);
    check('logout.cierra_sesion', !(await D.E(() => accountState().logged)) && !(await D.E(() => localStorage.getItem('horda_account'))));
    check('logout.token_invalido_en_el_servidor', (await fetch(API + '/api/me', { headers: { authorization: 'Bearer ' + tokD } })).status === 401);
    check('logout.progreso_queda_en_el_dispositivo', (await D.E(() => save.gold)) === 4444);
    // entra a la cuenta de A (que tiene otro progreso): pregunta
    await D.fill(U_A, PASS);
    const q = await D.waitFor(() => !!document.querySelector('#acc-use-cloud'), 15000);
    check('invitado_entra_a_cuenta_con_progreso.pregunta', q);
    await D.page.click('#acc-use-cloud');
    await D.waitFor(() => state === 'mainmenu' && !accountState().conflict, 8000);
    check('invitado_entra_a_cuenta_con_progreso.usa_la_nube', (await D.E(() => save.gold)) === 77777);
    await D.ctx.close();
  }

  // ---------- 8) cerrar la pestaña sube lo pendiente (beacon) y al volver no hay conflicto falso ----------
  {
    const vBefore = (await cloudSave(tokA)).version;
    await A.E(() => { save.gold = 88888; persist(); });
    await A.page.close();
    let v = null;
    for (let i = 0; i < 30; i++) { const c = await cloudSave(tokA); if (c.version > vBefore) { v = c; break; } await sleep(100); }
    check('beacon.sube_al_cerrar', v && v.data.gold === 88888, v && v.version);
    A.page = await A.ctx.newPage();
    await A.boot(URL_ACC);
    await A.page.click('#title-continue-btn');
    await sleep(2500);
    const after = await A.E(() => ({ st: state, conflict: accountState().conflict, pending: accountState().pending, gold: save.gold }));
    check('beacon.sin_conflicto_falso_al_volver', after.st === 'mainmenu' && !after.conflict && !after.pending && after.gold === 88888, after);
  }

  check('sin_errores_de_pagina', errors.length === 0, errors.slice(0, 5));
  console.log('SUMMARY', JSON.stringify({ fails }));
  await browser.close();
  if (relay) { relay.cp.kill(); try { fs.rmSync(relay.dir, { recursive: true, force: true }); } catch (e) {} }
  process.exit(fails ? 1 : 0);
})().catch(e => { console.log('FAIL exception', e.stack || e.message); process.exit(1); });
