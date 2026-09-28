// RANKING SEMANAL DE LA HORDA INFINITA (js/net/leaderboard.js + server/accounts.js /api/leaderboard),
// con el relay REAL (server/relay.js, cuentas en archivo en una carpeta temporal) y navegadores
// independientes (cada "dispositivo" es un contexto de Chromium con su propio localStorage):
//   invitado: ve la tabla desde el hub, su récord queda local con "Creá una cuenta para entrar al ranking"
//   (y no manda nada) · con cuenta: al terminar la partida se manda y los resultados dicen "Puesto #N esta
//   semana" · dos cuentas: orden, "me" resaltado, filtro por guardián · puntaje imposible: rechazado con
//   el mensaje del servidor · sin conexión: queda pendiente y se manda al abrir el ranking · recompensa
//   cosmética de la semana que cerró (título + marco, una sola vez) · sin errores de consola.
// Por defecto levanta su propio servidor en RELAY_PORT (o usa RELAY=ws://... si ya hay uno).
//   (python3 -m http.server 8844 &) ; SITE=http://127.0.0.1:8844 RELAY_PORT=8854 node tools/net-test/leaderboard.js [capturas]
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const path = require('path'), fs = require('fs'), os = require('os'), { spawn } = require('child_process');
const SITE = process.env.SITE || process.env.SE_BASE_URL || 'http://127.0.0.1:8844';
const RELAY_PORT = process.env.RELAY_PORT || '8854';
const RELAY = process.env.RELAY || ('ws://127.0.0.1:' + RELAY_PORT);
const API = RELAY.replace(/^ws/, 'http');
const OUT = process.argv[2];
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 500) : '')); if (!ok) fails++; };
const RUN = Date.now().toString(36).slice(-5);
const URL_GAME = `${SITE}/index.html?server=${encodeURIComponent(RELAY)}`;

async function startRelay(){
  if (process.env.RELAY) return null;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'horda-lb-e2e-'));
  const env = Object.assign({}, process.env, { PORT: RELAY_PORT, DATA_DIR: dir, ALLOWED_ORIGINS: new URL(SITE).origin, REGISTER_MAX_IP: '500', DATABASE_URL: '' });
  const logFile = path.join(dir, 'relay.log'), fd = fs.openSync(logFile, 'a');
  const cp = spawn(process.execPath, [path.join(__dirname, '../../server/relay.js')], { env, stdio: ['ignore', fd, fd] });
  cp.on('exit', code => { if (code) console.log('RELAY_EXIT', code, fs.readFileSync(logFile, 'utf8').split('\n').slice(-5).join(' | ')); });
  process.on('exit', () => { try { cp.kill(); } catch (e) {} try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) {} });
  for (let i = 0; i < 50; i++) { try { const r = await fetch(API + '/api/health'); if (r.ok && (await r.json()).ok) break; } catch (e) {} await sleep(100); }
  return { cp, dir, log: () => fs.readFileSync(logFile, 'utf8') };
}
async function register(user){
  const r = await fetch(API + '/api/register', { method: 'POST', headers: { 'content-type': 'application/json', origin: new URL(SITE).origin }, body: JSON.stringify({ user, pass: 'ranking-123' }) });
  const j = await r.json(); return { token: j.token, user: j.user.user, name: j.user.name, expiresAt: j.expiresAt };
}
async function board(q, token){ const r = await fetch(API + '/api/leaderboard' + (q || ''), { headers: Object.assign({ origin: new URL(SITE).origin }, token ? { authorization: 'Bearer ' + token } : {}) }); return r.json(); }

(async () => {
  const relay = await startRelay();
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const errors = [];
  async function device(name, session){
    const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true });
    await ctx.addInitScript(s => { window.__campaignMode = true; if (s && !localStorage.getItem('horda_account')) localStorage.setItem('horda_account', JSON.stringify(s)); }, session || null);
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push(name + ' pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error' && !/ERR_CERT|fonts\.g|net::|404|Failed to load resource|ERR_INTERNET_DISCONNECTED|ERR_FAILED|status of 4\d\d/.test(m.text())) errors.push(name + ': ' + m.text().slice(0, 200)); });
    const d = { name, ctx, page, E: (fn, a) => page.evaluate(fn, a) };
    await page.goto(URL_GAME, { waitUntil: 'load', timeout: 240000 });
    for (let k = 0; k < 900; k++) { if (await d.E(() => !document.getElementById('title-continue-btn').disabled)) break; await sleep(100); }
    await d.E(() => { loop = function(){}; for (const k of Object.keys(save.champions)) save.champions[k].unlocked = true; save.starterChosen = true; save.arenasCleared = Object.assign({}, save.arenasCleared, { ciudad: true, fortaleza: true }); persist(); });
    d.waitFor = async (fn, ms, arg) => { const t0 = Date.now(); while (Date.now() - t0 < (ms || 10000)) { if (await d.E(fn, arg).catch(() => false)) return true; await sleep(100); } return false; };
    d.shot = async n => { if (OUT) { fs.mkdirSync(OUT, { recursive: true }); await page.screenshot({ path: path.join(OUT, n + '.png') }); } };
    // una partida de la Horda Infinita que termina con este puntaje (flujo real: Sala -> Comenzar -> abandonar)
    d.play = (score, round, ms, cls) => d.E(([score, round, ms, cls]) => {
      save.stash = []; selectedClass = cls; lobbyAllies = Object.keys(CLASSES).filter(k => k !== cls).slice(0, 3);
      window.endlessOpen(); document.getElementById('start-btn').click(); document.getElementById('prep-start-btn').click();
      for (let i = 0; i < 30; i++) update(16);
      EN.score = score; EN.round = round; runElapsedMs = ms; runEnding = true;
      endlessEndRun('quit');
      return { st: state, active: endlessActive, cls: EN.local && EN.local.cls };
    }, [score, round, ms, cls]);
    d.line = () => d.E(() => { const l = document.getElementById('en-lb-line'); return { txt: l ? l.textContent : '', st: EN.local && EN.local.lb && EN.local.lb.st, vis: !!l && !l.classList.contains('hidden') }; });
    d.back = () => d.E(() => { document.getElementById('en-back-btn').click(); setState('mainmenu'); renderMainMenu(); return state; });
    return d;
  }

  // ---------- 1) invitado: ve la tabla, su récord queda local y no manda nada ----------
  {
    const g = await device('invitado');
    const hub = await g.E(() => { setState('mainmenu'); renderMainMenu(); const b = document.getElementById('hub-endless-rank-btn'); return { btn: !!b && !b.classList.contains('hidden'), txt: b && b.textContent }; });
    check('LB.hub_boton_ranking_junto_a_la_horda_infinita', hub.btn && /RANKING/.test(hub.txt), hub);
    await g.E(() => document.getElementById('hub-endless-rank-btn').click());
    const opened = await g.waitFor(() => { const d = window.__lb && __lb.data; return !!d && !__lb.loading; }, 15000);
    const tab = await g.E(() => { const el = document.getElementById('lb-screen'); return { vis: !!el && !el.classList.contains('hidden'), txt: el ? el.textContent : '', week: __lb.data && __lb.data.week, now: endlessWeekKey(new Date()), chips: el.querySelectorAll('.lb-chip').length }; });
    check('LB.invitado_ve_la_tabla_de_la_semana', opened && tab.vis && tab.week === tab.now && /Nadie entró todavía/.test(tab.txt) && /Creá una cuenta para entrar al ranking/.test(tab.txt) && tab.chips > 5, tab);
    await g.shot('lb1_invitado_tabla');
    await g.E(() => lbClose());
    const p = await g.play(4200, 4, 3 * 60000, 'mago');
    const line = await g.line();
    check('LB.invitado_record_local_con_aviso', p.st === 'endless' && line.vis && line.st === 'guest' && /Creá una cuenta para entrar al ranking/.test(line.txt), { p, line });
    const loc = await g.E(() => ({ wk: endlessSave().week, pend: endlessSave().lbPending || null }));
    check('LB.invitado_record_en_el_dispositivo', loc.wk.score === 4200 && !loc.pend, loc);
    await g.shot('lb2_invitado_resultados');
    const b0 = await board();
    check('LB.invitado_no_entra_al_servidor', b0.total === 0, b0);
    await g.ctx.close();
  }

  // ---------- 2) dos cuentas: puesto, orden, "me", filtro por guardián ----------
  const sA = await register('Ana' + RUN), sB = await register('Beto' + RUN);
  const A = await device('A', sA);
  await A.waitFor(() => window.accountState && accountState().logged && !accountState().syncing, 20000);
  await A.play(9000, 6, 5 * 60000, 'mago');
  const okA = await A.waitFor(() => EN.local.lb && EN.local.lb.st === 'ok', 15000);
  const lA = await A.line();
  check('LB.con_cuenta_puesto_en_resultados', okA && /Puesto #1 esta semana/.test(lA.txt), lA);
  await A.shot('lb3_cuenta_puesto');
  const B = await device('B', sB);
  await B.waitFor(() => window.accountState && accountState().logged && !accountState().syncing, 20000);
  await B.play(15000, 8, 7 * 60000, 'tanque');
  await B.waitFor(() => EN.local.lb && EN.local.lb.st === 'ok', 15000);
  const lB = await B.line();
  check('LB.segunda_cuenta_pasa_primera', /Puesto #1 esta semana/.test(lB.txt) && /de 2/.test(lB.txt), lB);
  // A abre el ranking desde los resultados: B primero, A segundo y resaltado
  await A.E(() => document.getElementById('en-lb-open').click());
  await A.waitFor(() => __lb.data && !__lb.loading && __lb.data.entries.length === 2, 15000);
  const tA = await A.E(() => ({ rows: [...document.querySelectorAll('#lb-screen .lb-row')].map(r => ({ me: r.classList.contains('me'), t: r.textContent.replace(/\s+/g, ' ').trim() })), guest: !!document.querySelector('#lb-screen .lb-guest') }));
  check('LB.tabla_ordenada_y_me_resaltado', tA.rows.length === 2 && /Beto/.test(tA.rows[0].t) && /15\.000/.test(tA.rows[0].t) && tA.rows[1].me && /Ana/.test(tA.rows[1].t) && !tA.guest, tA);
  await A.shot('lb4_tabla_dos_cuentas');
  await A.E(() => document.querySelector('#lb-screen .lb-chip[data-lb-g="mago"]').click());
  await A.waitFor(() => __lb.guardian === 'mago' && __lb.data && !__lb.loading && __lb.data.guardian === 'mago', 15000);
  const tM = await A.E(() => ({ n: __lb.data.entries.length, first: __lb.data.entries[0] && __lb.data.entries[0].name, me: __lb.data.me && __lb.data.me.rank }));
  check('LB.filtro_por_guardian', tM.n === 1 && /Ana/.test(tM.first) && tM.me === 1, tM);
  await A.E(() => lbClose());

  // ---------- 3) puntaje imposible: el servidor lo rechaza y los resultados lo dicen ----------
  await A.back();
  await sleep(8500); // freno entre envíos del servidor
  await A.play(5e6, 3, 3 * 60000, 'mago');
  await A.waitFor(() => EN.local.lb && EN.local.lb.st !== 'sending', 15000);
  const lX = await A.line();
  check('LB.puntaje_imposible_rechazado', lX.st === 'rejected' && /no es posible/.test(lX.txt), lX);
  const bX = await board();
  check('LB.el_imposible_no_entra', bX.entries.every(e => e.score < 1e6), bX.entries.map(e => e.score));

  // ---------- 4) sin conexión: queda pendiente y se manda al abrir el ranking ----------
  await A.back();
  await sleep(8500);
  const cut = r => r.abort('internetdisconnected');
  await A.ctx.route(API + '/**', cut);
  await A.play(21000, 4, 90000, 'mago'); // corta: el servidor pide que la partida entre en el tiempo desde el envío anterior
  await A.waitFor(() => EN.local.lb && EN.local.lb.st !== 'sending', 15000);
  const lO = await A.line(), pend = await A.E(() => endlessSave().lbPending || null);
  check('LB.sin_conexion_queda_pendiente', lO.st === 'offline' && /cuando vuelva la red/.test(lO.txt) && pend && pend.score === 21000, { lO, pend });
  await A.ctx.unroute(API + '/**', cut);
  await A.back();
  await A.E(() => lbOpen({ guardian: '' }));
  await A.waitFor(() => !endlessSave().lbPending && __lb.data && !__lb.loading && __lb.data.entries[0] && __lb.data.entries[0].score === 21000, 20000);
  const tO = await A.E(() => ({ pend: !!endlessSave().lbPending, first: __lb.data && __lb.data.entries[0] }));
  check('LB.pendiente_se_manda_y_pasa_primera', !tO.pend && tO.first && tO.first.me && tO.first.score === 21000, tO);
  await A.E(() => lbClose());

  // ---------- 5) recompensa cosmética de la semana que cerró (una sola vez) ----------
  {
    const prev = await A.E(() => lbWeekPrev());
    let asked = 0;
    await A.ctx.route(API + '/api/leaderboard?limit=1&week=' + encodeURIComponent(prev), r => { asked++; r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': new URL(SITE).origin }, body: JSON.stringify({ week: prev, entries: [], total: 30, me: { rank: 7, name: 'x', guardian: 'mago', score: 1, round: 1, durationMs: 1 } }) }); });
    const rw = await A.E(async (prev) => { __lb.claimTried = false; delete endlessSave().lbClaimed[prev]; /* al abrir ya se miró: esa semana no había entrado (0) */ const q = questsState(); const t0 = q.titles.slice(), f0 = q.frames.slice(); const r = await lbCheckWeeklyReward(); __lb.claimTried = false; const r2 = await lbCheckWeeklyReward();
      return { r, r2, newT: q.titles.filter(t => !t0.includes(t)), newF: q.frames.filter(f => !f0.includes(f)), claimed: endlessSave().lbClaimed, power: JSON.stringify(Object.keys(QUEST_FRAMES.cicatriz)) }; }, prev);
    check('LB.recompensa_top10_titulo_y_marco', rw.r && rw.r.title === 'lb_elite' && rw.newT.join() === 'lb_elite' && rw.newF.join() === 'cicatriz' && rw.claimed[prev] === 7, rw);
    check('LB.recompensa_una_sola_vez', rw.r2 === null && asked === 1, { r2: rw.r2, asked });
    check('LB.recompensa_solo_cosmetica', !/dmg|hp|stat|mult/i.test(rw.power), rw.power);
    const prof = await A.E(() => { questsSetCosmetic('title', 'lb_elite'); questsSetCosmetic('frame', 'cicatriz'); return { title: questsState().title, frame: questsState().frame }; });
    check('LB.recompensa_se_equipa_en_el_perfil', prof.title === 'lb_elite' && prof.frame === 'cicatriz', prof);
  }

  // ---------- 6) servidor: todo quedó registrado ----------
  const fin = await board('', sA.token);
  check('LB.servidor_tabla_final', fin.total === 2 && fin.entries[0].score === 21000 && fin.me && fin.me.rank === 1, { total: fin.total, e: fin.entries.map(e => e.name + ':' + e.score), me: fin.me });
  if (relay) { const log = relay.log(); check('LB.servidor_registra_envios_y_rechazos', /LB_SUBMIT/.test(log) && /LB_REJECT/.test(log)); }

  check('LB.sin_errores_de_consola', errors.length === 0, errors.slice(0, 6));
  console.log('SUMMARY', fails ? 'FAIL' : 'OK', 'fails=' + fails);
  await browser.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.log('FAIL exception', e.stack || e.message); process.exit(1); });
