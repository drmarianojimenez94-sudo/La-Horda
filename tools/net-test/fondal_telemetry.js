// AVISOS AL PANEL DEL ESTUDIO (js/net/fondal-telemetry.js): /medir.js + /api/presencia.
// Levanta su propio servidor: sirve el juego en "/" (como GitHub Pages o un servidor local) y en
// "/la-horda/jugar/" (como fondalstudios.com), con un /medir.js de mentira que anota cada llamada
// y un /api/presencia que anota cada aviso. Chequea:
//   modos     los textos de modo son válidos (minúsculas y guiones, hasta 24 caracteres; el pedido
//             decía hasta 32, y el panel acepta 24 en presencia: se cumple el más estricto)
//   fuera     fuera de fondal el juego NO pide /medir.js ni /api/presencia y juega igual
//   fondal    abierto → listo → inicio {modo, mapa, especie, control, bots} → pausa → fin, la
//             presencia ("menu" / el modo de la partida / salir) y que no viaja ningún dato personal
//   sin_medir en fondal SIN /medir.js y con /api/presencia roto (404 / 429) el juego arranca y se
//             juega igual, sin errores ni avisos al jugador
//   privado   el id de presencia no se guarda en localStorage ni sessionStorage, y con la opción
//             "Compartir métricas" apagada no sale nada
// uso:  node tools/net-test/fondal_telemetry.js            (PORT=8791 por defecto)
// Sale con código 1 si falla algo (imprime PASS/FAIL por chequeo y "SUMMARY fails=N").
let pw;
try { pw = require('playwright'); } catch (e) { pw = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright'); }
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const PORT = +(process.env.PORT || 8791);
const BASE = 'http://127.0.0.1:' + PORT;
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0;
const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 400) : '')); if (!ok) fails++; };

// ---------------------------------------------------------------- servidor de prueba
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg' };
// El medidor de mentira: la misma forma que el de fondalstudios.com (window.fondalMedir.juego).
const MEDIR_FALSO = `window.__medir = []; window.fondalMedir = { activo: true, juego: {} };
for (const n of ['abierto','listo','inicio','fin','senal','pausa','control','camara','error'])
  window.fondalMedir.juego[n] = function(){ window.__medir.push([n].concat(Array.prototype.slice.call(arguments))); };`;
const modo = { medir: 'ok', presencia: 200 };  // cada escenario lo cambia
const pedidos = [];                             // {metodo, ruta, cuerpo}
const servidor = http.createServer((req, res) => {
  const ruta = decodeURIComponent(req.url.split('?')[0]);
  let cuerpo = '';
  req.on('data', b => { cuerpo += b; });
  req.on('end', () => {
    if (ruta === '/medir.js' || ruta === '/api/presencia') pedidos.push({ metodo: req.method, ruta, cuerpo });
    if (ruta === '/medir.js') {
      if (modo.medir !== 'ok') { res.writeHead(404); res.end('no esta'); return; }
      res.writeHead(200, { 'Content-Type': TIPOS['.js'] }); res.end(MEDIR_FALSO); return;
    }
    if (ruta === '/api/presencia') { res.writeHead(modo.presencia, { 'Content-Type': 'application/json' }); res.end(modo.presencia === 200 ? '{"ok":true}' : '{"error":"espera"}'); return; }
    let rel = ruta.indexOf('/la-horda/jugar/') === 0 ? ruta.slice('/la-horda/jugar'.length) : ruta;
    if (rel.endsWith('/')) rel += 'index.html';
    const archivo = path.join(ROOT, rel);
    if (archivo !== ROOT && !archivo.startsWith(ROOT + path.sep)) { res.writeHead(403); res.end(); return; }
    fs.readFile(archivo, (err, datos) => {
      if (err) { res.writeHead(404); res.end('no esta'); return; }
      res.writeHead(200, { 'Content-Type': TIPOS[path.extname(archivo)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(datos);
    });
  });
});

// ---------------------------------------------------------------- ayudas del navegador
async function abrir(browser, ruta, { prueba = true, antes = null } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  // navigator.webdriver es true acá: sin esta marca los avisos se callan (no ensuciar los números).
  if (prueba) await ctx.addInitScript(() => { window.__fondalTelemetryTest = true; });
  await ctx.addInitScript(() => { window.__campaignMode = true; window.__autoConfirm = true; });
  if (antes) await ctx.addInitScript(antes);
  const page = await ctx.newPage();
  const errores = [], dialogos = [];
  page.on('pageerror', e => errores.push(e.message));
  page.on('dialog', d => { dialogos.push(d.message()); d.dismiss().catch(() => {}); });
  await page.goto(BASE + ruta, { waitUntil: 'load' });
  for (let k = 0; k < 300; k++) { if (await page.evaluate(() => { const b = document.getElementById('title-continue-btn'); return b && !b.disabled; })) break; await sleep(100); }
  return { ctx, page, errores, dialogos };
}
// Arranca una partida de campaña como lo haría el flujo (guardián elegido, arte de la arena bajado).
async function empezarPartida(page, champ = 'mago', arena = 'ciudad') {
  for (let k = 0; k < 600; k++) { if (await page.evaluate(() => typeof assetsAllReady !== 'function' || assetsAllReady())) break; await sleep(100); }
  return page.evaluate(([c, a]) => {
    try {
      save.starterChosen = true; save.champions[c].unlocked = true; persist();
      selectedClass = c; currentArena = a;
      startRun(1);
      return { state, clase: player && player.classKey, heroes: heroes.length };
    } catch (e) { return { error: String(e && e.message || e) }; }
  }, [champ, arena]);
}
const medir = page => page.evaluate(() => (window.__medir || []).slice());
const llamadas = (lista, nombre) => lista.filter(x => x[0] === nombre);
const presencias = () => pedidos.filter(p => p.ruta === '/api/presencia').map(p => { try { return JSON.parse(p.cuerpo); } catch (e) { return { roto: p.cuerpo }; } });

(async () => {
  await new Promise(r => servidor.listen(PORT, '127.0.0.1', r));
  const browser = await pw.chromium.launch({ args: ['--no-sandbox'] });
  const VALIDO = /^[a-z0-9-]{1,24}$/;
  try {
    // ============================================================ modos
    console.log('== modos: textos válidos ==');
    {
      const { ctx, page } = await abrir(browser, '/index.html');
      const modos = await page.evaluate(() => Object.values(FondalTelemetry.MODOS));
      check('modos.hay_varios', modos.length >= 5, modos);
      check('modos.minusculas_y_guiones_hasta_24', modos.every(m => VALIDO.test(m)), modos.filter(m => !VALIDO.test(m)));
      check('modos.hasta_32_como_pide_el_panel', modos.every(m => /^[a-z0-9-]{1,32}$/.test(m)));
      check('modos.sin_repetir', new Set(modos).size === modos.length);
      check('modos.menu_solo_para_presencia', modos.includes('menu') && !modos.includes('lobby'));
      check('modos.regla_del_juego_es_la_misma', await page.evaluate(() => String(FondalTelemetry.MODO_VALIDO) === '/^[a-z0-9-]{1,24}$/'));
      await ctx.close();
    }

    // ============================================================ fuera de fondalstudios.com
    console.log('== fuera: en "/" (GitHub Pages, servidor local) no se pide nada ==');
    {
      pedidos.length = 0; modo.medir = '404'; modo.presencia = 404;
      const { ctx, page, errores, dialogos } = await abrir(browser, '/index.html');
      check('fuera.inactivo', await page.evaluate(() => FondalTelemetry.activo === false));
      const r = await empezarPartida(page);
      check('fuera.la_partida_arranca', r.state === 'playing' && r.clase === 'mago', r);
      await sleep(1500);
      await page.evaluate(() => { setState('paused'); setState('playing'); setState('menu'); });
      await sleep(500);
      check('fuera.no_pide_medir_js', !pedidos.some(p => p.ruta === '/medir.js'), pedidos.map(p => p.ruta));
      check('fuera.no_avisa_presencia', !pedidos.some(p => p.ruta === '/api/presencia'), pedidos.map(p => p.ruta));
      check('fuera.sin_errores', errores.length === 0, errores);
      check('fuera.sin_avisos_al_jugador', dialogos.length === 0, dialogos);
      await ctx.close();
    }

    // ============================================================ en fondalstudios.com
    console.log('== fondal: en "/la-horda/jugar/" con /medir.js y /api/presencia ==');
    {
      pedidos.length = 0; modo.medir = 'ok'; modo.presencia = 200;
      // datos "personales" de mentira en el guardado: no tienen que aparecer en ningún aviso
      const { ctx, page, errores } = await abrir(browser, '/la-horda/jugar/', { antes: () => { try { localStorage.setItem('horda_player_name', 'NombreSecreto77'); } catch (e) {} } });
      check('fondal.activo', await page.evaluate(() => FondalTelemetry.activo === true));
      await sleep(600);
      let m = await medir(page);
      const abierto = llamadas(m, 'abierto');
      check('fondal.pide_medir_js', pedidos.some(p => p.ruta === '/medir.js' && p.metodo === 'GET'));
      check('fondal.abierto_una_vez', abierto.length === 1 && abierto[0][1] && abierto[0][1].juego === 'la-horda', abierto);
      check('fondal.abierto_con_version', abierto.length === 1 && /^\d+\.\d+\.\d+$/.test(abierto[0][1].version || ''), abierto[0] && abierto[0][1]);
      check('fondal.abierto_es_lo_primero', m.length > 0 && m[0][0] === 'abierto', m.map(x => x[0]).slice(0, 4));
      for (let k = 0; k < 40 && !llamadas(m, 'listo').length; k++) { await sleep(100); m = await medir(page); }
      check('fondal.listo_al_terminar_la_carga', llamadas(m, 'listo').length === 1, m.map(x => x[0]));
      check('fondal.sin_inicio_en_el_menu', llamadas(m, 'inicio').length === 0);
      let pres = presencias();
      check('fondal.presencia_menu_al_abrir', pres.length >= 1 && pres[0].juego === 'la-horda' && pres[0].modo === 'menu', pres[0]);
      const id = pres[0] && pres[0].id;
      check('fondal.presencia_id_al_azar', typeof id === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(id), id);

      const r = await empezarPartida(page);
      check('fondal.la_partida_arranca', r.state === 'playing', r);
      await sleep(400);
      m = await medir(page);
      const inicio = llamadas(m, 'inicio');
      const d = inicio[0] && inicio[0][1] || {};
      check('fondal.inicio_una_vez', inicio.length === 1, inicio);
      check('fondal.inicio_modo', d.modo === 'historia' && VALIDO.test(d.modo) && d.modo !== 'menu' && d.modo !== 'lobby', d);
      check('fondal.inicio_mapa', d.mapa === 'ciudad', d);
      check('fondal.inicio_especie', d.especie === 'mago', d);
      check('fondal.inicio_control', d.control === 'tactil' || d.control === 'teclado', d);
      check('fondal.inicio_bots', d.bots === r.heroes - 1 && d.bots === 3, { bots: d.bots, heroes: r.heroes });
      check('fondal.inicio_solo_esos_datos', Object.keys(d).sort().join() === 'bots,control,especie,mapa,modo', Object.keys(d));
      pres = presencias();
      check('fondal.presencia_modo_de_la_partida', pres.some(p => p.modo === d.modo && p.id === id), pres.map(p => p.modo));

      // señales de control (toques reales) y el dedo quieto en el joystick
      const antes = llamadas(m, 'senal').length;
      await page.touchscreen.tap(700, 300);
      await sleep(200);
      m = await medir(page);
      check('fondal.senal_con_cada_toque', llamadas(m, 'senal').length > antes, { antes, ahora: llamadas(m, 'senal').length });

      // subir de nivel (elección de mejora) NO corta la partida
      await page.evaluate(() => { setState('buff'); setState('playing'); });
      // pausa y vuelta
      await page.evaluate(() => { setState('paused'); });
      await sleep(100);
      m = await medir(page);
      check('fondal.pausa_true', llamadas(m, 'pausa').some(x => x[1] === true));
      await page.evaluate(() => { setState('playing'); });
      await sleep(100);
      m = await medir(page);
      const pausas = llamadas(m, 'pausa').map(x => x[1]);
      check('fondal.pausa_false_al_volver', pausas[pausas.length - 1] === false, pausas);
      check('fondal.mejora_y_pausa_no_reinician', llamadas(m, 'inicio').length === 1 && llamadas(m, 'fin').length === 0, m.map(x => x[0]).filter(n => n === 'inicio' || n === 'fin'));

      // abandonar: vuelve al menú antes del final
      await page.evaluate(() => { setState('menu'); });
      await sleep(300);
      m = await medir(page);
      check('fondal.fin_salida', llamadas(m, 'fin').length === 1 && llamadas(m, 'fin')[0][1] === 'salida', llamadas(m, 'fin'));
      pres = presencias();
      check('fondal.presencia_vuelve_a_menu', pres[pres.length - 1].modo === 'menu', pres.map(p => p.modo));

      // otra partida que termina según las reglas (derrota)
      await empezarPartida(page);
      await sleep(200);
      await page.evaluate(() => { setState('gameover'); });
      await sleep(200);
      m = await medir(page);
      check('fondal.segunda_partida_inicio', llamadas(m, 'inicio').length === 2);
      check('fondal.fin_completada', llamadas(m, 'fin').length === 2 && llamadas(m, 'fin')[1][1] === 'completada', llamadas(m, 'fin'));
      // y una en que al invitado se le corta la conexión
      await empezarPartida(page);
      await sleep(200);
      await page.evaluate(() => { netMatch = { role: 'guest', slots: [{ kind: 'human' }, { kind: 'human' }, { kind: 'bot' }, { kind: 'bot' }], ended: false }; netOnMatchClosed('host_left', 'guest'); });
      await sleep(200);
      m = await medir(page);
      check('fondal.fin_desconexion', llamadas(m, 'fin').length === 3 && llamadas(m, 'fin')[2][1] === 'desconexion', llamadas(m, 'fin'));
      const resultados = llamadas(m, 'fin').map(x => x[1]);
      check('fondal.resultados_validos', resultados.every(x => ['completada', 'salida', 'desconexion', 'error'].includes(x)), resultados);

      // nada personal en ningún aviso
      const todo = JSON.stringify(m) + JSON.stringify(pedidos.map(p => p.cuerpo));
      check('fondal.sin_datos_personales', !/NombreSecreto77|@|token|email|user/i.test(todo));
      pres = presencias();
      check('fondal.presencia_solo_id_juego_modo', pres.every(p => Object.keys(p).sort().join() === 'id,juego,modo'), pres.find(p => Object.keys(p).sort().join() !== 'id,juego,modo'));
      check('fondal.presencia_mismo_id_siempre', pres.every(p => p.id === id));
      check('fondal.presencia_modos_validos', pres.every(p => VALIDO.test(p.modo)), pres.map(p => p.modo));

      // privado: el id no se guarda en el navegador
      const guardado = await page.evaluate(() => { const o = {}; for (const s of [localStorage, sessionStorage]) for (let i = 0; i < s.length; i++) o[s.key(i)] = s.getItem(s.key(i)); return o; });
      check('privado.id_no_esta_en_localStorage', !JSON.stringify(guardado).includes(id), Object.keys(guardado).filter(k => String(guardado[k]).includes(id)));
      check('privado.sin_clave_de_presencia', !Object.keys(guardado).some(k => /presencia|presence/i.test(k)), Object.keys(guardado).filter(k => /presencia|presence/i.test(k)));
      check('privado.sin_cookies', (await ctx.cookies()).length === 0);
      // al recargar es otro id
      pedidos.length = 0;
      await page.reload({ waitUntil: 'load' });
      await sleep(800);
      const nuevo = presencias().find(p => p.modo);
      check('privado.al_recargar_es_otro_id', !!nuevo && nuevo.id !== id, { antes: id, ahora: nuevo && nuevo.id });
      // al cerrar la pestaña: "me fui"
      pedidos.length = 0;
      await page.close({ runBeforeUnload: true });
      await sleep(800);
      const salio = presencias().find(p => p.salir === true);
      check('fondal.al_cerrar_avisa_salir', !!salio && salio.id === (nuevo && nuevo.id) && Object.keys(salio).sort().join() === 'id,salir', presencias());
      check('fondal.sin_errores', errores.length === 0, errores);
      await ctx.close();
    }

    // ============================================================ en fondal, pero todo roto
    console.log('== sin_medir: en fondal sin /medir.js y con /api/presencia roto ==');
    for (const codigo of [404, 429]) {
      pedidos.length = 0; modo.medir = '404'; modo.presencia = codigo;
      const { ctx, page, errores, dialogos } = await abrir(browser, '/la-horda/jugar/');
      check(`sin_medir.${codigo}.llega_al_titulo`, await page.evaluate(() => { const b = document.getElementById('title-continue-btn'); return !!b && !b.disabled; }));
      const r = await empezarPartida(page);
      check(`sin_medir.${codigo}.la_partida_arranca`, r.state === 'playing' && r.heroes === 4, r);
      await page.touchscreen.tap(700, 300);
      await sleep(1200);
      const vivo = await page.evaluate(() => ({ state, vivo: !!(player && player.alive), t: runElapsedMs }));
      check(`sin_medir.${codigo}.se_sigue_jugando`, vivo.state === 'playing' && vivo.vivo && vivo.t > 0, vivo);
      await page.evaluate(() => { setState('paused'); setState('playing'); setState('menu'); });
      await sleep(300);
      check(`sin_medir.${codigo}.sin_errores`, errores.length === 0, errores);
      check(`sin_medir.${codigo}.sin_avisos_al_jugador`, dialogos.length === 0 && await page.evaluate(() => !document.querySelector('#toast-stack .toast, .net-toast:not(.hidden)')), dialogos);
      check(`sin_medir.${codigo}.fondalMedir_no_existe`, await page.evaluate(() => typeof window.fondalMedir === 'undefined'));
      await ctx.close();
    }

    // ============================================================ quien no quiere compartir métricas
    console.log('== privado: con "Compartir métricas" apagado, o sin la marca de prueba, no sale nada ==');
    {
      pedidos.length = 0; modo.medir = 'ok'; modo.presencia = 200;
      const { ctx, page, errores } = await abrir(browser, '/la-horda/jugar/', { antes: () => { try { localStorage.setItem('horda_telemetry', 'off'); } catch (e) {} } });
      await empezarPartida(page);
      await sleep(1500);
      await page.evaluate(() => { setState('menu'); });
      await sleep(300);
      const m = await medir(page);
      check('privado.apagado_sin_llamadas_al_medidor', m.length === 0, m.map(x => x[0]));
      check('privado.apagado_sin_presencia', presencias().length === 0, presencias());
      check('privado.apagado_sin_errores', errores.length === 0, errores);
      await ctx.close();
    }
    {
      pedidos.length = 0;
      const { ctx, page } = await abrir(browser, '/la-horda/jugar/', { prueba: false });
      await empezarPartida(page);
      await sleep(1200);
      check('privado.navegador_automatico_no_cuenta', (await medir(page)).length === 0 && presencias().length === 0, { medir: (await medir(page)).length, presencia: presencias().length });
      await ctx.close();
    }
  } catch (e) {
    check('la_prueba_corre_hasta_el_final', false, String(e && e.stack || e).slice(0, 600));
  }
  await browser.close();
  servidor.close();
  console.log('SUMMARY fails=' + fails);
  process.exit(fails ? 1 : 0);
})();
