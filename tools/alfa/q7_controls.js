// CONTROLES Y ACCESIBILIDAD (alfa): js/core/input.js, js/core/aim.js, js/core/input-desk.js, js/core/prefs.js.
//   - disposición en 5 pantallas (844x390, 667x375 iPhone SE, 932x430 Pro Max, 800x360 Android chico, tablet
//     1180x820), normal y ZURDO: botones de 44 px o más, dentro de la pantalla, sin pisarse entre sí ni con el HUD;
//   - MULTITOUCH real (Input.dispatchTouchEvent): caminar con un dedo y lanzar una habilidad con otro a la vez;
//   - joystick flotante: apoyar lejos de la base la trae abajo del dedo; soltar la devuelve;
//   - nada queda "pegado": dedo que se cancela (sale de la pantalla), cambio de pestaña, pausa con el dedo
//     apoyado, mouse que suelta afuera de Ataque, apuntado cortado sin soltar;
//   - el navegador no hace zoom/scroll/selección con doble toque o mantener;
//   - modo zurdo, opciones (texto grande, sacudida, vibración, alto contraste, reducir movimiento) guardadas
//     y recuperadas al recargar, sin tocar el guardado de la partida;
//   - teclado (WASD, Espacio, 1/2/3, R, Esc) con las teclas a la vista y el foco que no "reaprieta" botones;
//   - mando simulado (Gamepad API): mover, atacar, habilidades, Definitiva, pausa;
//   - guía de primera vez sobre el joystick que se va apenas se usa.
//   (python3 -m http.server 8907 &) ; SE_BASE_URL=http://127.0.0.1:8907 node tools/alfa/q7_controls.js
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const BASE = process.env.SE_BASE_URL || process.env.REGRESSION_BASE_URL || 'http://127.0.0.1:8907';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined && !ok ? '  ' + JSON.stringify(x).slice(0, 700) : '')); if (!ok) fails++; };
const errors = [];

async function boot(browser, vp, opts) {
  opts = opts || {};
  const ctx = await browser.newContext(opts.desk ? { viewport: vp } : { viewport: vp, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(vp.width + 'x' + vp.height + ' pageerror: ' + e.message));
  await page.addInitScript((o) => {
    window.__campaignMode = true;
    if (o.prefs && !sessionStorage.getItem('__q7booted')) { try { localStorage.setItem('horda_prefs', JSON.stringify(o.prefs)); } catch (e) { } }
    try { sessionStorage.setItem('__q7booted', '1'); } catch (e) { }
    if (o.gamepad) {
      window.__pad = { id: 'Mando de prueba', index: 0, connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) };
      navigator.getGamepads = () => [window.__pad, null, null, null];
    }
    window.__vib = []; navigator.vibrate = (p) => { window.__vib.push(p); return true; };
    // ayudantes (en el script de inicio: siguen existiendo después de recargar)
    window.__start = (champ, keepTut) => {
      for (const k of Object.keys(save.champions)) save.champions[k].unlocked = true;
      if (!keepTut) { save.tut = save.tut || {}; for (const k of ['basics', 'b_move', 'b_attack', 'b_skill', 'b_end', 'cooldown', 'hurt', 'energy', 'elite', 'boss', 'levelup', 'skillup', 'revive']) save.tut[k] = 1; }
      selectedClass = champ; currentArena = 'laberinto'; lobbyAllies = [];
      startRun(3); spawnTimer = 1e12; levelDuration = 9e9; runElapsedMs = 20000;
      if (typeof RUN_INTRO !== 'undefined' && RUN_INTRO.open && typeof runIntroGo === 'function') runIntroGo();
      if (state !== 'playing') setState('playing');
      enemies.length = 0; allies.length = 0; heroes.length = 0; heroes.push(player);
      player.x = 0; player.y = 0; player.fx = 1; player.fy = 0; player.invulnTimer = 1e9;
      player.energy = player.maxEnergy = 9999; player.cds = [0, 0, 0]; player.ultCharge = 0;
    };
    window.__rect = id => { const el = typeof id === 'string' ? (document.getElementById(id) || document.querySelector(id)) : id; if (!el) return null; const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height, vis: cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0.05 && r.width > 0 }; };
  }, opts);
  await page.goto(`${BASE}/index.html`, { waitUntil: 'load', timeout: 240000 });
  for (let k = 0; k < 400; k++) { if (await page.evaluate(() => { const b = document.getElementById('title-continue-btn'); return b && !b.disabled; })) break; await sleep(100); }
  const cdp = opts.desk ? null : await ctx.newCDPSession(page);
  return { ctx, page, cdp, E: (fn, a) => page.evaluate(fn, a), touch: (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts }) };
}

// ---------------- 1) disposición en 5 pantallas, normal y zurdo ----------------
async function layout(browser) {
  const VPS = [[844, 390], [667, 375], [932, 430], [800, 360], [1180, 820]];
  for (const lefty of [false, true]) {
    for (const [w, h] of VPS) {
      const S = await boot(browser, { width: w, height: h }, { prefs: lefty ? { lefty: true } : null });
      const r = await S.E(() => {
        __start('nigromante');
        const ids = ['btn-basic', 'btn-s1', 'btn-s2', 'btn-s3', 'btn-ult', 'btn-emerg', 'btn-pact'];
        const btns = ids.map(id => ({ id, ...__rect(id) })).filter(b => b.vis);
        const hud = ['player-status', '#hud .top', 'ult-meter'].map(id => ({ id, ...__rect(id) })).filter(b => b && b.vis);
        const jb = __rect('joy-base'), W = innerWidth, H = innerHeight;
        const hit = (a, b, pad) => a.l < b.r - pad && b.l < a.r - pad && a.t < b.b - pad && b.t < a.b - pad;
        const small = btns.filter(b => b.w < 44 || b.h < 44).map(b => b.id + ':' + Math.round(b.w));
        const out = btns.concat([{ id: 'joy', ...jb }]).filter(b => b.l < 0 || b.t < 0 || b.r > W || b.b > H).map(b => b.id);
        const over = [];
        for (let i = 0; i < btns.length; i++) for (let j = i + 1; j < btns.length; j++) if (hit(btns[i], btns[j], 2)) over.push(btns[i].id + '/' + btns[j].id);
        for (const b of btns.concat([{ id: 'joy', ...jb }])) for (const x of hud) if (hit(b, x, 2)) over.push(b.id + '~' + x.id);
        const side = { joyLeft: jb.l + jb.w / 2 < W / 2, basicLeft: (__rect('btn-basic').l + 36) < W / 2 };
        const pause = __rect('pause-btn');
        const ta = getComputedStyle(document.getElementById('btn-s1')).touchAction, us = getComputedStyle(document.getElementById('btn-basic')).webkitUserSelect || getComputedStyle(document.getElementById('btn-basic')).userSelect;
        return { small, out, over, side, pause: [Math.round(pause.w), Math.round(pause.h)], ta, us, scrollW: document.documentElement.scrollWidth, W };
      });
      const tag = `${lefty ? 'ZURDO' : 'NORMAL'} ${w}x${h}`;
      check(`LAYOUT.${tag}.blancos_44px`, r.small.length === 0 && r.pause[0] >= 44 && r.pause[1] >= 44, r);
      check(`LAYOUT.${tag}.dentro_de_pantalla_y_sin_pisarse`, r.out.length === 0 && r.over.length === 0, r);
      check(`LAYOUT.${tag}.lado_correcto`, lefty ? (!r.side.joyLeft && r.side.basicLeft) : (r.side.joyLeft && !r.side.basicLeft), r.side);
      check(`LAYOUT.${tag}.sin_gestos_del_navegador`, r.ta === 'none' && r.us === 'none' && r.scrollW <= r.W + 1, r);
      await S.ctx.close();
    }
  }
}

// ---------------- 2) táctil: multitouch, flotante, nada pegado ----------------
async function touchTests(browser) {
  const S = await boot(browser, { width: 844, height: 390 });
  const { E, touch, page } = S;
  const jc = async () => E(() => { const r = document.getElementById('joy-base').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  const bc = async (id) => E((id) => { const r = document.getElementById(id).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, id);

  // multitouch: dedo 1 camina a la derecha y, sin soltarlo, dedo 2 toca la habilidad 1
  await E(() => { __start('mago'); const e = spawnEnemy('esqueleto', false); e.x = 200; e.y = 0; e.hp = e.maxHp = 1e7; e.speed = e.baseSpeed = 0; e.atkCd = 1e9; });
  const j = await jc(), s1 = await bc('btn-s1');
  const x0 = await E(() => player.x);
  await touch('touchStart', [{ x: j.x, y: j.y, id: 1 }]);
  for (let k = 1; k <= 5; k++) { await touch('touchMove', [{ x: j.x + 7 * k, y: j.y, id: 1 }]); await sleep(20); }
  await sleep(250);
  await touch('touchStart', [{ x: j.x + 35, y: j.y, id: 1 }, { x: s1.x, y: s1.y, id: 2 }]);
  await sleep(80);
  await touch('touchEnd', [{ x: s1.x, y: s1.y, id: 2 }]);   // se levanta el dedo 2 (CDP suelta los puntos listados), el 1 sigue
  await sleep(300);
  const mt = await E(() => ({ jx: joyVec.x, cd: player.cds[0], x: player.x, act: joyActive }));
  check('TOUCH.multitouch_camina_y_lanza_a_la_vez', mt.jx > 0.6 && mt.act && mt.cd > 0 && mt.x > x0 + 20, { mt, x0 });
  await touch('touchEnd', []);
  await sleep(80);
  check('TOUCH.soltar_frena', await E(() => joyVec.x === 0 && joyVec.y === 0 && !joyActive));

  // atacar (mantener) + caminar a la vez
  const bb = await bc('btn-basic');
  await touch('touchStart', [{ x: j.x, y: j.y, id: 1 }]);
  await touch('touchMove', [{ x: j.x, y: j.y - 30, id: 1 }]);
  await touch('touchStart', [{ x: j.x, y: j.y - 30, id: 1 }, { x: bb.x, y: bb.y, id: 2 }]);
  await sleep(120);
  const both = await E(() => ({ held: basicHeld, jy: joyVec.y }));
  await touch('touchEnd', []);
  await sleep(80);
  const both2 = await E(() => ({ held: basicHeld, jy: joyVec.y }));
  check('TOUCH.atacar_mientras_camina', both.held && both.jy < -0.6 && !both2.held && both2.jy === 0, { both, both2 });

  // joystick flotante: apoyar arriba a la derecha de la base (dentro de la zona) -> la base viene al dedo
  await E(() => __start('mago'));
  const home = await jc();
  const p = { x: home.x + 150, y: home.y - 60 };
  await touch('touchStart', [{ x: p.x, y: p.y, id: 1 }]);
  await sleep(60);
  const fl1 = await E(() => ({ jx: joyVec.x, jy: joyVec.y, c: (() => { const r = document.getElementById('joy-base').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })() }));
  await touch('touchMove', [{ x: p.x + 30, y: p.y, id: 1 }]);
  await sleep(60);
  const fl2 = await E(() => ({ jx: joyVec.x, knob: (() => { const r = document.getElementById('joy-knob').getBoundingClientRect(); return r.left + r.width / 2; })() }));
  await touch('touchEnd', []);
  await sleep(60);
  const back = await jc();
  check('TOUCH.joystick_flotante_viene_al_dedo', Math.hypot(fl1.c.x - p.x, fl1.c.y - p.y) < 3 && Math.hypot(fl1.jx, fl1.jy) < 0.05 && fl2.jx > 0.7 && Math.abs(fl2.knob - (p.x + 30)) < 8, { fl1, fl2, p });
  check('TOUCH.joystick_vuelve_a_su_lugar', Math.hypot(back.x - home.x, back.y - home.y) < 1, { back, home });

  // dedo que se sale de la pantalla: el navegador manda touchcancel
  await touch('touchStart', [{ x: j.x, y: j.y, id: 1 }]);
  await touch('touchMove', [{ x: j.x - 20, y: j.y + 10, id: 1 }]);
  await sleep(60);
  await touch('touchCancel', []);
  await sleep(60);
  check('TOUCH.dedo_que_sale_no_queda_pegado', await E(() => joyVec.x === 0 && joyVec.y === 0 && !joyActive));

  // cambio de pestaña / notificación con el dedo apoyado (joystick + ataque + apuntando)
  await touch('touchStart', [{ x: j.x, y: j.y, id: 1 }]);
  await touch('touchMove', [{ x: j.x + 30, y: j.y, id: 1 }]);
  await touch('touchStart', [{ x: j.x + 30, y: j.y, id: 1 }, { x: bb.x, y: bb.y, id: 2 }]);
  await sleep(60);
  const held = await E(() => ({ j: joyVec.x, b: basicHeld }));
  await E(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
  await sleep(60);
  const after = await E(() => { const r = { j: joyVec.x, b: basicHeld, act: joyActive, st: state }; delete document.visibilityState; setState('playing'); return r; });
  check('TOUCH.cambio_de_pestaña_suelta_todo', held.j > 0.5 && held.b && after.j === 0 && !after.b && !after.act, { held, after });
  await touch('touchEnd', []);
  await sleep(60);

  // pausa con el dedo apoyado: al volver, el guardián no camina solo
  await touch('touchStart', [{ x: j.x, y: j.y, id: 1 }]);
  await touch('touchMove', [{ x: j.x + 30, y: j.y, id: 1 }]);
  await sleep(60);
  await E(() => setState('paused'));
  await touch('touchEnd', []);
  await E(() => setState('playing'));
  await sleep(120);
  check('TOUCH.pausa_con_el_dedo_no_queda_caminando', await E(() => joyVec.x === 0 && !joyActive));

  // apuntado cortado (se esconden los controles con el dedo apoyado): no lanza, no gasta
  await E(() => { __start('mago'); });
  const s2 = await bc('btn-s1');
  await touch('touchStart', [{ x: s2.x, y: s2.y, id: 3 }]);
  await touch('touchMove', [{ x: s2.x - 50, y: s2.y - 30, id: 3 }]);
  await sleep(80);
  const aiming = await E(() => !!(aimState && aimState.manual));
  await E(() => setState('paused'));
  await touch('touchEnd', []);
  await E(() => setState('playing'));
  await sleep(80);
  const ac = await E(() => ({ st: aimState, cd: player.cds[0], pad: document.getElementById('aim-pad').classList.contains('hidden') }));
  check('TOUCH.apuntado_cortado_se_cancela_sin_lanzar', aiming && ac.st === null && ac.cd === 0 && ac.pad, { aiming, ac });

  // doble toque / mantener sobre los botones y el mapa: sin zoom ni selección
  for (let k = 0; k < 2; k++) { await page.touchscreen.tap(bb.x, bb.y); await sleep(90); }
  for (let k = 0; k < 2; k++) { await page.touchscreen.tap(420, 150); await sleep(90); }
  await touch('touchStart', [{ x: bb.x, y: bb.y, id: 1 }]); await sleep(900); await touch('touchEnd', []);
  const z = await E(() => ({ scale: window.visualViewport ? visualViewport.scale : 1, sel: String(window.getSelection()), sx: scrollX, sy: scrollY }));
  check('TOUCH.sin_zoom_scroll_ni_seleccion', z.scale === 1 && z.sel === '' && z.sx === 0 && z.sy === 0, z);

  // mouse: apretar Ataque, salir del botón y soltar afuera
  await E(() => __start('mago'));
  await page.mouse.move(bb.x, bb.y); await page.mouse.down(); await sleep(60);
  const mh = await E(() => basicHeld);
  await page.mouse.move(420, 120, { steps: 4 }); await page.mouse.up(); await sleep(60);
  check('MOUSE.soltar_afuera_de_ataque_no_queda_pegado', mh && !(await E(() => basicHeld)));

  // guía de primera vez: aro sobre el joystick que se va apenas se apoya el dedo
  await E(() => { save.tut = {}; __start('mago', true); });
  await sleep(400);
  const g1 = await E(() => ({ onb: document.body.classList.contains('onb-move'), key: TUT.key, goal: document.querySelector('#tut-panel .tut-goal').textContent }));
  await touch('touchStart', [{ x: j.x, y: j.y, id: 1 }]); await touch('touchMove', [{ x: j.x + 30, y: j.y, id: 1 }]);
  await sleep(120);
  const g2 = await E(() => document.body.classList.contains('onb-move'));
  await touch('touchEnd', []);
  check('ONBOARD.aro_en_el_joystick_y_se_va_al_usarlo', g1.onb && g1.key === 'b_move' && /joystick/.test(g1.goal) && /pulgar izquierdo/.test(g1.goal) && !g2, { g1, g2 });

  // vibración: golpe fuerte -> vibra; con la opción apagada, no
  await E(() => { __start('mago'); __vib.length = 0; _hapticLast = 0; registerPlayerHurt(player.maxHp * 0.3, null); });
  const v1 = await E(() => __vib.length);
  await E(() => { prefSet('vibrate', false); _hapticLast = 0; registerPlayerHurt(player.maxHp * 0.3, null); });
  const v2 = await E(() => __vib.length);
  await E(() => prefSet('vibrate', true));
  check('A11Y.vibracion_on_off', v1 === 1 && v2 === 1, { v1, v2 });

  // alto contraste: se dibujan avisos de todas las formas sin errores
  const hc = await E(() => { __start('mago'); prefSet('contrast', true); let err = null;
    try { for (const sh of [0, 1, 2, 3, 4]) vfxTelegraph({ shape: sh, r: 90, r2: 40, len: 200, x: 60, y: 0, dur: 900 }); for (let k = 0; k < 5; k++) render(); } catch (e) { err = String(e); }
    prefSet('contrast', false); return err; });
  check('A11Y.alto_contraste_dibuja_sin_errores', hc === null, hc);
  // sacudida: apagada -> sin desplazamiento aunque haya sacudida
  const sk = await E(() => { prefSet('shake', 'off'); screenShake = 10; const o = juiceShakeOffset(); const off = { x: o.x, y: o.y }; prefSet('shake', 'reducida'); screenShake = 10; animNow = 1234; const red = Math.hypot(juiceShakeOffset().x, juiceShakeOffset().y); prefSet('shake', 'normal'); screenShake = 10; const nor = Math.hypot(juiceShakeOffset().x, juiceShakeOffset().y); screenShake = 0; return { off, red, nor }; });
  check('A11Y.sacudida_normal_reducida_apagada', sk.off.x === 0 && sk.off.y === 0 && sk.red > 0 && sk.red < sk.nor, sk);
  await S.ctx.close();
}

// ---------------- 3) opciones: pantalla, zurdo y persistencia ----------------
async function optionsTests(browser) {
  const S = await boot(browser, { width: 667, height: 375 });
  const { E, page } = S;
  const saveBefore = await E(() => localStorage.getItem('laHordaSave_v1'));
  await E(() => openHubOptions());
  await sleep(700);   // la ventana entra con una animación de escala: se mide quieta
  const vis = await E(() => { const box = document.getElementById('hub-options'); const p = box.querySelector('.ui-modal-panel').getBoundingClientRect();
    const sm = [...box.querySelectorAll('.opt-switch, .opt-seg button')].map(b => ({ t: b.textContent, w: b.offsetWidth, h: b.offsetHeight })).filter(r => r.h < 44 || r.w < 44);
    return { anim: getComputedStyle(box.querySelector('.ui-modal-panel')).transform, open: !box.classList.contains('hidden'), fits: p.bottom <= innerHeight + 1 && p.right <= innerWidth + 1, sm, n: box.querySelectorAll('.opt-switch, .opt-seg').length }; });
  check('OPTIONS.pantalla_abre_entra_y_blancos_44px', vis.open && vis.fits && vis.sm.length === 0 && vis.n >= 6, vis); console.log('  (transform del panel al medir: ' + vis.anim + ')');
  // tocar las opciones como un jugador
  for (const sel of ['.opt-switch[data-pref="lefty"]', '.opt-seg[data-pref="textLg"] button[data-v="1"]', '.opt-seg[data-pref="shake"] button[data-v="reducida"]', '.opt-switch[data-pref="vibrate"]', '.opt-switch[data-pref="contrast"]', '.opt-switch[data-pref="motion"]']) {
    await page.locator('#hub-options ' + sel).scrollIntoViewIfNeeded();
    await page.locator('#hub-options ' + sel).tap();
    await sleep(60);
  }
  const st = await E(() => ({ p: JSON.parse(localStorage.getItem('horda_prefs')), motion: localStorage.getItem('horda_motion'), body: document.body.className,
    aria: document.querySelector('#hub-options .opt-switch[data-pref="lefty"]').getAttribute('aria-checked') }));
  check('OPTIONS.se_guardan_al_tocar', st.p.lefty === true && st.p.textLg === true && st.p.shake === 'reducida' && st.p.vibrate === false && st.p.contrast === true && st.motion === '1'
    && /lefty/.test(st.body) && /text-lg/.test(st.body) && /hi-contrast/.test(st.body) && st.aria === 'true', st);
  await E(() => closeHubOptions());
  await page.reload({ waitUntil: 'load', timeout: 240000 });
  for (let k = 0; k < 400; k++) { if (await page.evaluate(() => { const b = document.getElementById('title-continue-btn'); return b && !b.disabled; })) break; await sleep(100); }
  const re = await E(() => ({ P: Object.assign({}, PREFS), rm: JUICE.reduceMotion, body: document.body.className }));
  check('OPTIONS.persisten_al_recargar', re.P.lefty && re.P.textLg && re.P.shake === 'reducida' && !re.P.vibrate && re.P.contrast && re.rm && /lefty/.test(re.body) && /text-lg/.test(re.body), re);
  const saveAfter = await E(() => localStorage.getItem('laHordaSave_v1'));
  check('OPTIONS.no_tocan_el_guardado', saveBefore === saveAfter || (saveBefore && saveAfter && JSON.parse(saveAfter).version === JSON.parse(saveBefore).version && !/lefty|textLg/.test(saveAfter)), null);
  // texto grande en partida: el cuadro del Hechicero no se sale de la pantalla
  const tl = await E(() => { save.tut = {}; __start('mago', true); return new Promise(r => setTimeout(() => { const t = document.getElementById('tut-panel').getBoundingClientRect(); r({ t: [t.left, t.top, t.right, t.bottom], W: innerWidth, H: innerHeight, sz: getComputedStyle(document.querySelector('#tut-panel .tut-text')).fontSize }); }, 400)); });
  check('OPTIONS.texto_grande_entra_en_pantalla', tl.t[0] >= 0 && tl.t[1] >= 0 && tl.t[2] <= tl.W && tl.t[3] <= tl.H && parseFloat(tl.sz) > 13, tl);
  // zurdo en partida: el joystick de la derecha mueve
  const cdp = S.cdp;
  const j = await E(() => { __start('mago'); const r = document.getElementById('joy-base').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, W: innerWidth }; });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: j.x, y: j.y, id: 1 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: j.x - 30, y: j.y, id: 1 }] });
  await sleep(250);
  const lz = await E(() => ({ jx: joyVec.x, x: player.x }));
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  check('OPTIONS.zurdo_joystick_derecho_mueve', j.x > j.W / 2 && lz.jx < -0.6 && lz.x < -5, { j, lz });
  // la pausa abre Opciones encima
  await E(() => { setState('paused'); document.getElementById('pause-opts-btn').click(); });
  const po = await E(() => { const b = document.getElementById('hub-options'); const r = b.getBoundingClientRect(); const top = document.elementFromPoint(innerWidth / 2, innerHeight / 2); return { open: !b.classList.contains('hidden'), onTop: b.contains(top) }; });
  check('OPTIONS.se_abren_desde_la_pausa', po.open && po.onTop, po);
  await E(() => { closeHubOptions(); prefSet('lefty', false); prefSet('textLg', false); prefSet('contrast', false); prefSet('vibrate', true); prefSet('shake', 'normal'); setReduceMotion(false); });
  await S.ctx.close();
}

// ---------------- 4) teclado + mouse (escritorio) ----------------
async function keyboardTests(browser) {
  const S = await boot(browser, { width: 1280, height: 720 }, { desk: true });
  const { E, page } = S;
  await E(() => __start('mago'));
  await page.mouse.move(900, 200);
  const hints = await E(() => ({ kb: document.body.classList.contains('inp-kb'), kh: getComputedStyle(document.querySelector('#btn-s1 .kh')).display, txt: getComputedStyle(document.querySelector('#btn-s1 .kh'), '::before').content }));
  check('KB.teclas_a_la_vista', hints.kb && hints.kh === 'block' && /1/.test(hints.txt), hints);
  const x0 = await E(() => player.x);
  await page.keyboard.down('d'); await page.keyboard.down('w'); await sleep(300);
  const mv = await E(() => ({ jx: joyVec.x, jy: joyVec.y, x: player.x }));
  await page.keyboard.up('d'); await page.keyboard.up('w'); await sleep(50);
  const st = await E(() => ({ jx: joyVec.x, jy: joyVec.y }));
  check('KB.wasd_mueve_y_frena', mv.jx > 0.6 && mv.jy < -0.6 && mv.x > x0 + 5 && st.jx === 0 && st.jy === 0, { mv, st });
  await page.keyboard.down('ArrowLeft'); await sleep(60);
  const ar = await E(() => joyVec.x); await page.keyboard.up('ArrowLeft');
  check('KB.flechas_mueven', ar < -0.9, ar);
  await page.keyboard.down(' '); await sleep(40);
  const sp = await E(() => basicHeld); await page.keyboard.up(' '); await sleep(40);
  check('KB.espacio_ataca_mientras_se_mantiene', sp && !(await E(() => basicHeld)));
  // 1 = habilidad hacia el mouse (enemigos del otro lado: tiene que ir hacia el mouse)
  await E(() => { __start('mago'); const e = spawnEnemy('esqueleto', false); e.x = -200; e.y = 0; e.hp = e.maxHp = 1e7; e.speed = e.baseSpeed = 0; window.__c = []; const us = window.useSkill; window.useSkill = function (i, a) { const r = us(i, a); __c.push({ i, a: a ? { dx: a.dx, dy: a.dy } : null, r }); return r; }; });
  await page.mouse.move(1100, 360); await sleep(50);
  await page.keyboard.press('1'); await sleep(80);
  const k1 = await E(() => ({ c: __c.slice(), cd: player.cds[0] }));
  check('KB.1_lanza_hacia_el_mouse', k1.cd > 0 && k1.c.length === 1 && k1.c[0].a && k1.c[0].a.dx > 0.8, k1);
  await page.keyboard.press('2'); await page.keyboard.press('3'); await sleep(60);
  check('KB.2_y_3_lanzan', await E(() => player.cds[1] > 0 && player.cds[2] > 0));
  // clic sobre el mapa = atacar
  await page.mouse.move(700, 250); await page.mouse.down(); await sleep(40);
  const cl = await E(() => basicHeld); await page.mouse.up(); await sleep(40);
  check('MOUSE.clic_en_el_mapa_ataca', cl && !(await E(() => basicHeld)));
  // Esc = pausa y continuar; tras continuar con el mouse, Espacio no vuelve a apretar la pausa
  await page.keyboard.press('Escape'); await sleep(60);
  const p1 = await E(() => state);
  await page.keyboard.press('Escape'); await sleep(60);
  const p2 = await E(() => state);
  check('KB.esc_pausa_y_continua', p1 === 'paused' && p2 === 'playing', { p1, p2 });
  await page.click('#pause-btn'); await sleep(60);
  await page.click('#resume-btn'); await sleep(60);
  await page.keyboard.press(' '); await sleep(60);
  const f = await E(() => ({ st: state, ae: document.activeElement && document.activeElement.id }));
  check('KB.foco_no_reaprieta_botones', f.st === 'playing' && f.ae !== 'pause-btn' && f.ae !== 'resume-btn', f);
  // Opciones con teclado: el foco entra al panel, Esc cierra y vuelve al botón que las abrió
  await E(() => setState('mainmenu'));
  await page.click('#hub-options-btn').catch(() => { });
  await sleep(120);
  const o1 = await E(() => ({ open: !document.getElementById('hub-options').classList.contains('hidden'), inPanel: document.getElementById('hub-options').contains(document.activeElement) }));
  await page.keyboard.press('Escape'); await sleep(80);
  const o2 = await E(() => ({ open: !document.getElementById('hub-options').classList.contains('hidden'), ae: document.activeElement && document.activeElement.id }));
  check('KB.opciones_foco_y_esc', o1.open && o1.inPanel && !o2.open && o2.ae === 'hub-options-btn', { o1, o2 });
  // teclas con un diálogo abierto: no hacen nada detrás
  await E(() => { __start('mago'); gameConfirm('¿Prueba?'); });
  await sleep(80);
  await page.keyboard.down('d'); await sleep(80); const dj = await E(() => joyVec.x); await page.keyboard.up('d');
  await page.keyboard.press('Escape'); await sleep(60);
  check('KB.dialogo_abierto_no_mueve', dj === 0 && (await E(() => state)) === 'playing', dj);
  await S.ctx.close();
}

// ---------------- 5) mando simulado ----------------
async function gamepadTests(browser) {
  const S = await boot(browser, { width: 1280, height: 720 }, { desk: true, gamepad: true });
  const { E } = S;
  await E(() => { __start('mago'); const e = spawnEnemy('esqueleto', false); e.x = 150; e.y = 40; e.hp = e.maxHp = 1e7; e.speed = e.baseSpeed = 0; e.atkCd = 1e9; });
  const x0 = await E(() => player.x);
  await E(() => { __pad.axes[0] = 1; __pad.axes[1] = 0; });
  await sleep(300);
  const m = await E(() => ({ jx: joyVec.x, x: player.x, pad: document.body.classList.contains('inp-pad'), txt: getComputedStyle(document.querySelector('#btn-s1 .kh'), '::before').content }));
  await E(() => { __pad.axes[0] = 0; });
  await sleep(80);
  const m2 = await E(() => joyVec.x);
  check('PAD.stick_mueve_y_frena', m.jx > 0.9 && m.x > x0 + 5 && m2 === 0, { m, m2 });
  check('PAD.letras_del_mando_en_los_botones', m.pad && /X/.test(m.txt), m);
  const press = async (i, on) => { await E(([i, on]) => { __pad.buttons[i] = { pressed: on, value: on ? 1 : 0 }; }, [i, on]); await sleep(60); };
  await press(0, true); const a = await E(() => basicHeld); await press(0, false);
  check('PAD.A_ataca', a && !(await E(() => basicHeld)));
  await press(2, true); await press(2, false); await press(3, true); await press(3, false); await press(1, true); await press(1, false);
  check('PAD.XYB_habilidades', await E(() => player.cds[0] > 0 && player.cds[1] > 0 && player.cds[2] > 0), await E(() => player.cds));
  await E(() => { player.ultCharge = player.ultMax; player.ultCd = 0; runLevel = Math.max(runLevel, typeof ULT_MIN_ARENA_LEVEL !== 'undefined' ? ULT_MIN_ARENA_LEVEL : 1); });
  await press(5, true); await press(5, false);
  check('PAD.RB_definitiva', await E(() => player.ultCharge === 0));
  await press(9, true); await press(9, false);
  const s1 = await E(() => state);
  await press(9, true); await press(9, false);
  const s2 = await E(() => state);
  check('PAD.start_pausa_y_continua', s1 === 'paused' && s2 === 'playing', { s1, s2 });
  // se desconecta el mando con el stick apretado: no queda caminando
  await E(() => { __pad.axes[0] = -1; }); await sleep(80);
  await E(() => { navigator.getGamepads = () => [null, null, null, null]; }); await sleep(80);
  check('PAD.desconectar_no_deja_caminando', await E(() => joyVec.x === 0));
  await S.ctx.close();
}

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
  const run = async (name, fn) => { if (only && !only.includes(name)) return; try { await fn(browser); } catch (e) { check(name + '.sin_excepcion', false, String(e && e.stack || e)); } };
  await run('layout', layout);
  await run('touch', touchTests);
  await run('options', optionsTests);
  await run('keyboard', keyboardTests);
  await run('gamepad', gamepadTests);
  check('SIN_ERRORES_DE_PAGINA', errors.length === 0, errors.slice(0, 5));
  await browser.close();
  console.log(fails ? `\n${fails} FALLAS` : '\nTODO OK');
  process.exit(fails ? 1 : 0);
})();
