// APUNTAR HABILIDADES ARRASTRANDO EL BOTÓN (js/core/aim.js + js/skills/aim-targeting.js), con toques REALES
// (Input.dispatchTouchEvent de Chromium: touchStart / touchMove / touchEnd, como un dedo) en un teléfono
// acostado 844x390:
//   - TOQUE rápido = se lanza con el autoapuntado de siempre (al grupo más denso / al más cercano);
//   - MANTENER Y ARRASTRAR = se ve la previsualización en el mundo y, al soltar, sale hacia donde se arrastró
//     (aunque los enemigos estén del otro lado);
//   - volver el dedo al CENTRO del botón antes de soltar = se cancela (no gasta energía ni enfriamiento);
//   - las 12 fichas: cada habilidad apuntable (dirección, punto, área, objetivo) respeta el arrastre;
//   - cooperativo: el invitado le manda al anfitrión el apuntado ({k:"cast", idx, aim}) y el anfitrión lo usa.
//   (python3 -m http.server 8843 &) ; SE_BASE_URL=http://127.0.0.1:8843 node tools/regression/t_drag_aim.js
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const BASE = process.env.SE_BASE_URL || process.env.REGRESSION_BASE_URL || 'http://127.0.0.1:8771';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 500) : '')); if (!ok) fails++; };
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  await page.addInitScript(() => { window.__campaignMode = true; });
  await page.goto(`${BASE}/index.html`, { waitUntil: 'load', timeout: 180000 });
  for (let k = 0; k < 400; k++) { if (await page.evaluate(() => { const b = document.getElementById('title-continue-btn'); return b && !b.disabled; })) break; await sleep(100); }
  const E = (fn, a) => page.evaluate(fn, a);
  // Partida real (el bucle del juego corre y dibuja): sin horda que aparezca sola, guardián que no muere.
  await E(() => {
    window.__casts = [];
    const us = window.useSkill;
    window.useSkill = function (idx, aim) { const r = us(idx, aim); __casts.push({ idx, aim: aim ? { x: aim.x, y: aim.y, dx: aim.dx, dy: aim.dy } : null, ok: r, fx: player.fx, fy: player.fy, px: player.x, py: player.y, pt: player._lastAimPt ? { x: player._lastAimPt.x, y: player._lastAimPt.y } : null }); return r; };
    const sy = window.useSylvaPiercingShot;
    window.useSylvaPiercingShot = function (c, ms, aim) { const cd0 = c.cds[0]; sy(c, ms, aim); __casts.push({ idx: 0, aim: aim ? { x: aim.x, y: aim.y, dx: aim.dx, dy: aim.dy } : null, ok: c.cds[0] > cd0, fx: c.fx, fy: c.fy, pt: null }); };
    window.__start = (champ) => {
      for (const k of Object.keys(save.champions)) save.champions[k].unlocked = true;
      selectedClass = champ; currentArena = 'laberinto'; lobbyAllies = [];
      startRun(3); spawnTimer = 1e12; levelDuration = 9e9; runElapsedMs = 20000;
      enemies.length = 0; allies.length = 0; heroes.length = 0; heroes.push(player);
      player.x = 0; player.y = 0; player.fx = 1; player.fy = 0; player.invulnTimer = 1e9;
      player.energy = player.maxEnergy = 9999; player.cds = [0, 0, 0]; player.ultCharge = 0;
      __casts.length = 0; player._lastAimPt = null;
    };
    window.__foe = (x, y, t) => { const e = spawnEnemy(t || 'esqueleto', false); e.x = x; e.y = y; e.hp = e.maxHp = 1e7; e.speed = 0; e.baseSpeed = 0; e.atkCd = 1e9; return e; };
    window.__still = () => { for (const e of enemies) { e.speed = 0; e.baseSpeed = 0; e.stunTimer = 1e6; } };
    window.__btn = (i) => { const r = document.getElementById(['btn-s1', 'btn-s2', 'btn-s3'][i]).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width }; };
  });
  const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
  async function drag(i, dx, dy, opts) {
    opts = opts || {};
    const b = await E(i => __btn(i), i);
    await touch('touchStart', [{ x: b.x, y: b.y, id: 1 }]); await sleep(60);
    const steps = 8;
    for (let s = 1; s <= steps; s++) { await touch('touchMove', [{ x: b.x + dx * s / steps, y: b.y + dy * s / steps, id: 1 }]); await sleep(25); }
    if (opts.back) { for (let s = steps - 1; s >= 0; s--) { await touch('touchMove', [{ x: b.x + dx * s / steps, y: b.y + dy * s / steps, id: 1 }]); await sleep(25); } }
    if (opts.hold) await sleep(opts.hold);
    const mid = opts.probe ? await E(opts.probe) : null;
    await touch('touchEnd', []); await sleep(120);
    return mid;
  }
  async function tap(i) { const b = await E(i => __btn(i), i); await page.touchscreen.tap(b.x, b.y); await sleep(150); }
  const lastCast = () => E(() => __casts[__casts.length - 1] || null);

  // ---- 0) los controles táctiles se ven y los botones de habilidad no dejan que el navegador robe el gesto
  const lay = await E(() => { __start('mago'); const out = {};
    for (const id of ['btn-s1', 'btn-s2', 'btn-s3']) { const el = document.getElementById(id), r = el.getBoundingClientRect(); out[id] = { vis: r.width > 30 && getComputedStyle(el).display !== 'none', ta: getComputedStyle(el).touchAction, r: [Math.round(r.left), Math.round(r.top), Math.round(r.width)] }; }
    return out; });
  check('AIM.botones_visibles_y_touch_action_none', Object.values(lay).every(o => o.vis && o.ta === 'none'), lay);

  // ---- 1) TOQUE rápido: autoapuntado al grupo (Mago, Muro de Fuego = punto)
  await E(() => { __start('mago'); for (let k = 0; k < 4; k++) __foe(220 + k * 12, 10 - k * 8); __still(); });
  await tap(0);
  let c = await lastCast();
  check('AIM.toque_lanza_con_autoapuntado', c && c.ok && c.aim === null && c.pt && c.pt.x > 120, c);

  // ---- 2) ARRASTRE: hacia arriba a la izquierda, con los enemigos a la derecha -> el muro cae arriba a la izquierda
  await E(() => { __start('mago'); for (let k = 0; k < 4; k++) __foe(220 + k * 12, 10 - k * 8); __still(); });
  const mid = await drag(0, -70, -45, { hold: 250, probe: () => ({ st: aimState && { manual: aimState.manual, idx: aimState.idx }, pad: !document.getElementById('aim-pad').classList.contains('hidden'), cd: player.cds[0] }) });
  c = await lastCast();
  check('AIM.arrastre_muestra_pad_y_estado_manual', mid && mid.st && mid.st.manual && mid.pad && mid.cd === 0, mid);
  check('AIM.arrastre_lanza_hacia_donde_se_arrastro', c && c.ok && c.aim && c.aim.dx < -0.6 && c.aim.dy < -0.3 && c.pt && c.pt.x < -60 && c.pt.y < -30, c);

  // ---- 3) CANCELAR: arrastrar y volver al centro del botón -> no sale, no gasta
  await E(() => { __start('mago'); __foe(200, 0); __still(); });
  const e0 = await E(() => player.energy);
  await drag(0, 60, -30, { back: true });
  const can = await E((e0) => ({ n: __casts.length, cd: player.cds[0], e: player.energy, e0 }), e0);
  check('AIM.volver_al_centro_cancela', can.n === 0 && can.cd === 0 && can.e === can.e0, can);

  // ---- 4) las 12 fichas: cada habilidad con apuntado respeta el arrastre (enemigo señuelo del otro lado)
  const roster = await E(() => Object.keys(CLASSES).filter(k => k !== 'ultimate' && CLASSES[k].skills));
  const table = [];
  const jobs = [];
  for (const cls of roster) for (let i = 0; i < 3; i++) jobs.push({ cls, i });
  for (let i = 0; i < 3; i++) jobs.push({ cls: 'eren', i, titan: true });   // Eren transformado: Sismo, Terremoto, Retumbar
  for (const { cls, i, titan } of jobs) {
    {
      const info = await E(([cls, i, titan]) => { __start(cls);
        if (titan) erenEnterTitan(player);
        const sk0 = player.cls.skills[i];
        if (sk0.kind === 'summon_golem') { useSkill(i); player.cds[i] = 0; __casts.length = 0; }   // con el gólem en pie se apunta "¡Aplasta!"
        const sk = player.cls.skills[i]; const prof = aimProfileOf(sk, player); return { kind: sk.kind, type: prof ? prof.type : null }; }, [cls, i, !!titan]);
      if (!info.type) { table.push({ cls, i, kind: info.kind, type: 'propia' }); continue; }
      // señuelo MÁS CERCA a la derecha (el que elegiría el autoapuntado) y el enemigo buscado arriba a la
      // izquierda, hacia donde se arrastra; los dos al alcance de la habilidad
      await E(([i]) => { const sk = player.cls.skills[i], R = aimRangeOf(player, sk, i) || 200;
        window.__decoy = __foe(Math.max(50, R * 0.35), 0); window.__want = __foe(-0.83 * R * 0.7, -0.55 * R * 0.7); __still(); __casts.length = 0; }, [i]);
      const pre = await drag(i, -66, -44, { hold: 200, probe: () => { let err = null; try { render(); } catch (e) { err = String(e); } return { manual: !!(aimState && aimState.manual), err }; } });
      await sleep(450);
      const r = await E(() => { const c = __casts[__casts.length - 1] || null; return { c, fx: player.fx, fy: player.fy, want: __want.hp < __want.maxHp, wx: __want.x, wy: __want.y, decoy: __decoy.hp < __decoy.maxHp }; });
      const cc = r.c;
      // dirección real del lanzamiento: el punto (área) o hacia donde quedó mirando el guardián
      let vx, vy;
      if (cc && cc.pt && (info.type === 'point')) { vx = cc.pt.x; vy = cc.pt.y; } else { vx = r.fx; vy = r.fy; }
      const l = Math.hypot(vx, vy) || 1, dot = (vx / l) * (-0.83) + (vy / l) * (-0.55);
      // las dirigidas: le pegó al elegido (el señuelo más cercano puede recibir un rebote, no el golpe principal)
      //   (el guardián puede volver a mirar al más cercano con el básico: en las dirigidas cuenta a quién le pegó;
      //   el Paso Fantasma no pega, aparece junto al elegido)
      const nearWant = cc && cc.px !== undefined && Math.hypot(cc.px - r.wx, cc.py - r.wy) < 90;
      const aimedOk = info.type === 'target' ? (r.want || (info.kind === 'ghost_step' && nearWant)) : dot > 0.6;
      const ok = !!(pre && pre.manual && !pre.err && cc && cc.ok && cc.aim && aimedOk);
      await E(() => { enemies.length = 0; });
      table.push({ cls, i, kind: info.kind, type: info.type, ok, dot: Math.round(dot * 100) / 100, want: r.want, decoy: r.decoy, err: pre && pre.err });
    }
  }
  const bad = table.filter(t => t.type !== 'propia' && !t.ok);
  console.log(table.map(t => `${t.cls}.${t.i} ${t.kind} [${t.type}] ${t.type === 'propia' ? '' : (t.ok ? 'ok' : 'MAL') + ' dot=' + t.dot + (t.type === 'target' ? ' elegido=' + t.want + ' señuelo=' + t.decoy : '')}`).join('\n'));
  check('AIM.las_12_fichas_respetan_el_arrastre', bad.length === 0 && table.filter(t => t.type !== 'propia').length >= 20, bad);

  // ---- 5) cooperativo: el invitado manda el apuntado al anfitrión; el toque manda aim:null
  const netr = await (async () => {
    await E(() => { __start('mago'); __foe(200, 0); __still(); window.__sent = []; window.__ng = window.netIsGuest; window.__ns = window.netSendToHost; window.netIsGuest = () => true; window.netSendToHost = m => __sent.push(JSON.parse(JSON.stringify(m))); });
    await drag(2, -60, 40, { hold: 150 });
    await tap(2);
    return E(() => { const s = __sent.slice(); window.netIsGuest = __ng; window.netSendToHost = __ns; return s; });
  })();
  const dragMsg = netr.find(m => m.k === 'cast' && m.aim), tapMsg = netr.find(m => m.k === 'cast' && m.aim === null);
  check('AIM.invitado_manda_el_apuntado_al_anfitrion', dragMsg && dragMsg.idx === 2 && dragMsg.aim.dx < -0.5 && dragMsg.aim.dy > 0.3 && Number.isFinite(dragMsg.aim.x), netr);
  check('AIM.invitado_toque_manda_autoapuntado', !!tapMsg, netr);

  // ---- 5b) anfitrión: usa el apuntado que llega del invitado ({k:"cast"} -> netHostOnMsg) y descarta uno roto
  const host = await E(() => {
    for (const k of Object.keys(save.champions)) save.champions[k].unlocked = true;
    selectedClass = 'mago'; currentArena = 'laberinto'; lobbyAllies = ['guerrero']; startRun(3); spawnTimer = 1e12; levelDuration = 9e9; enemies.length = 0;
    const g = heroes.find(h => h !== player && h.classKey === 'guerrero'); g.x = 0; g.y = 0; g.invulnTimer = 1e9; g.energy = g.maxEnergy = 9999; g.cds = [0, 0, 0];
    __foe(180, 0); __still();
    const prev = netMatch; netMatch = { role: 'host', recording: false, slots: [], last: {} }; g._net = { runStats, basic: false }; g.isRemote = true;
    const from = heroes.indexOf(g), out = {};
    try {
      netHostOnMsg(from, { k: 'cast', idx: 2, aim: { x: -150, y: -100, dx: -0.83, dy: -0.55 } });
      out.pt = g._lastAimPt ? { x: Math.round(g._lastAimPt.x), y: Math.round(g._lastAimPt.y) } : null; out.cd = g.cds[2] > 0;
      g.cds = [0, 0, 0]; g._lastAimPt = null;
      netHostOnMsg(from, { k: 'cast', idx: 2, aim: { x: 'x', y: null, dx: NaN, dy: 0 } });
      out.bad = g._lastAimPt ? { x: Math.round(g._lastAimPt.x), y: Math.round(g._lastAimPt.y) } : null;
      out.safe = [netAimSafe(null), netAimSafe({ x: 1, y: 2, dx: 0, dy: 0 }), netAimSafe({ x: 1, y: 2, dx: 3, dy: 4 })];
    } finally { netMatch = prev; g.isRemote = false; delete g._net; }
    return out; });
  check('AIM.anfitrion_usa_el_apuntado_del_invitado', host.cd && host.pt && host.pt.x < -80 && host.pt.y < -50, host);
  check('AIM.anfitrion_descarta_apuntado_roto_y_autoapunta', host.bad && host.bad.x > 80 && host.safe[0] === null && host.safe[1] === null && Math.abs(host.safe[2].dx - 0.6) < 1e-6, host);

  // ---- 6) toque en una dirigida: sigue yendo al más cercano (Guerrero, Corte Sangrante)
  await E(() => { __start('guerrero'); window.__near = __foe(70, 0); window.__far = __foe(-90, -60); __still(); });
  await tap(0); await sleep(300);
  const tp = await E(() => ({ near: __near.hp < __near.maxHp, far: __far.hp < __far.maxHp, c: __casts[__casts.length - 1] }));
  check('AIM.toque_en_dirigida_va_al_mas_cercano', tp.near && tp.c && tp.c.aim === null, tp);

  check('AIM.sin_errores_de_pagina', errors.length === 0, errors.slice(0, 4));
  await browser.close();
  console.log(fails ? `\n${fails} FALLAS` : '\nTODO OK');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
