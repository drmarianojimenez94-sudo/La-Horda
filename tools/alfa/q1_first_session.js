// PRIMERA SESIÓN DE UN JUGADOR NUEVO (alfa, Q1): perfil limpio, celular apaisado 844×390 táctil, toques reales.
// Recorre el camino completo y FALLA (código 1) si aparece un error de página (pageerror / console.error / 404
// del propio juego) o si alguna pantalla queda SIN SALIDA (ningún botón visible, habilitado y sin tapar).
//
//   Título → "Tocá para continuar" → Jugar como invitado → Tu primer guardián (Ver habilidades, Elegir otro)
//   → Tu skin de regalo → entrenamiento (Saltar tutorial) → menú → Guardianes → Tienda (4 pestañas, compra)
//   → Explorar: Códice y Desafíos → JUGAR → Sala → Comenzar → prólogo → Ciudad (piloto automático) → victoria
//   (todas sus páginas) → Campamento → menú; derrota 3 veces seguidas (Reintentar / Volver al menú);
//   abandonar una partida desde la pausa; recargar la página en la Tienda y en la Sala; "atrás" en cada pantalla.
//
//   (servir el repo)  GAME_URL=http://127.0.0.1:8901/index.html node tools/alfa/q1_first_session.js
//   DESKTOP=1 -> 1280×720 con mouse      SHOTS=carpeta -> guarda una captura por paso
//   SKIP_WIN=1 -> no juega la Ciudad hasta la victoria (más rápido: solo derrotas y abandono)
const { chromium } = (() => { try { return require('playwright'); } catch (e) { return require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright'); } })();
const fs = require('fs'), path = require('path');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const GAME = process.env.GAME_URL || 'http://127.0.0.1:8901/index.html';
const DESKTOP = !!process.env.DESKTOP, SHOTS = process.env.SHOTS || '';
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
let fails = 0, step = 0;
const check = (name, ok, extra) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra !== undefined && !ok ? '  ' + JSON.stringify(extra).slice(0, 600) : '')); if (!ok) fails++; return ok; };

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await browser.newContext(DESKTOP ? { viewport: { width: 1280, height: 720 } }
    : { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  // camino real de un jugador: regalo con skin (__firstRun) y diálogos propios aceptados solos
  await ctx.addInitScript(() => { window.__firstRun = true; window.__autoConfirm = true; });
  const page = await ctx.newPage();
  const errors = [];
  const origin = new URL(GAME).origin;
  page.on('pageerror', e => errors.push('pageerror: ' + (e.message || e)));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_|fonts\.g|WebSocket/.test(m.text())) errors.push('console: ' + m.text().slice(0, 300)); });
  page.on('response', r => { if (r.status() >= 400 && r.url().startsWith(origin)) errors.push('http ' + r.status() + ' ' + r.url()); });
  const E = (fn, a) => page.evaluate(fn, a);
  let lastErr = 0;
  const noNewErrors = (label) => { const n = errors.slice(lastErr); lastErr = errors.length; check(label + ' · sin errores de página', n.length === 0, n); };

  // ---- toques reales ----
  const tapEl = async (el) => {
    await el.evaluate(e => e.scrollIntoView({ block: 'center', inline: 'center' })); await sleep(150);
    const b = await el.boundingBox(); if (!b) return false;
    if (DESKTOP) await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2); else await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
    await sleep(450); return true;
  };
  const tap = async (sel, ms = 6000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) { const el = await page.$(sel); if (el && await el.boundingBox()) return tapEl(el); await sleep(120); }
    check('existe y se puede tocar: ' + sel, false); return false;
  };
  const tapText = async (re, scope = 'button, summary', ms = 6000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      const h = await page.evaluateHandle(([src, sc]) => { const r = new RegExp(src, 'i'); return [...document.querySelectorAll(sc)].find(b => { const x = b.getBoundingClientRect(); return x.width > 0 && x.height > 0 && !b.disabled && r.test(b.innerText || b.getAttribute('aria-label') || ''); }) || null; }, [re, scope]);
      const el = h.asElement(); if (el) return tapEl(el); await sleep(120);
    }
    check('existe un botón "' + re + '"', false); return false;
  };
  const state = () => E(() => state);
  const waitState = async (st, ms = 10000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const s = await state(); if ((Array.isArray(st) ? st : [st]).includes(s)) return s; await sleep(120); } return await state(); };
  const shot = async (label) => { step++; if (SHOTS) await page.screenshot({ path: path.join(SHOTS, String(step).padStart(2, '0') + '_' + label + '.png') }); };
  // ¿pantalla sin salida? Fuera de la partida tiene que haber al menos un botón visible, habilitado, dentro de la
  // pantalla y que no esté tapado por otra cosa (se mira el centro con elementFromPoint, deslizando si hace falta).
  const exits = () => E(() => {
    const ok = [];
    for (const b of document.querySelectorAll('button, [role=button], summary, a[href]')) {
      const s = getComputedStyle(b); if (b.disabled || s.visibility === 'hidden' || s.pointerEvents === 'none') continue;
      const r = b.getBoundingClientRect(); if (r.width < 8 || r.height < 8) continue;
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      if (cx < 0 || cy < 0 || cx > innerWidth || cy > innerHeight) { if (b.closest('.screen, #camp, #run-intro, [role=dialog]')) ok.push((b.id || b.innerText || '').slice(0, 24) + '(deslizando)'); continue; }
      const top = document.elementFromPoint(cx, cy);
      if (top && (b === top || b.contains(top) || top.contains(b))) ok.push((b.id || b.innerText || '').trim().slice(0, 24));
    }
    return ok;
  });
  const noDeadEnd = async (label) => {
    await sleep(250);
    const st = await state();
    if (st === 'playing') return true;
    const ex = await exits();
    return check(label + ' · tiene salida', ex.length > 0, { state: st });
  };
  const skipTraining = () => E(() => { if (typeof ALPHA_TRAINING !== 'undefined' && ALPHA_TRAINING.active && typeof alphaTrainingSkip === 'function') alphaTrainingSkip(); });
  const REAL = () => E(() => { const S = (typeof ALPHA_TRAINING !== 'undefined' && ALPHA_TRAINING.active) ? ALPHA_TRAINING.snapshot.save : save; return { champs: Object.keys(S.champions).filter(k => S.champions[k].unlocked), skin: S.starterSkin, pending: !!S.starterSkinPending, voucher: S.skinVoucher | 0, gold: S.gold }; });
  const boot = async (qs) => {
    await page.goto(GAME + (qs || ''), { waitUntil: 'domcontentloaded', timeout: 180000 });
    for (let i = 0; i < 1800; i++) { if (await E(() => { const b = document.getElementById('title-continue-btn'); return !!b && !b.disabled; }).catch(() => false)) break; await sleep(100); }
  };
  // vuelve al menú principal desde cualquier pantalla tocando "atrás" (lo que haría un jugador)
  const backToMenu = async (label) => {
    for (let i = 0; i < 6; i++) {
      const st = await state(); if (st === 'mainmenu') return true;
      const sel = await E(() => { const c = ['#codex-back-btn', '#shop-back-btn', '#prep-back-btn', '#champdetail-back-btn', '#quests-close', '#inv-back-btn'];
        for (const s of c) { const e = document.querySelector(s); if (e && e.getBoundingClientRect().width > 0) return s; }
        const b = [...document.querySelectorAll('.screen:not(.hidden) button')].find(b => /‹|volver|menú|cerrar|atrás/i.test(b.innerText + ' ' + (b.getAttribute('aria-label') || '')) && b.getBoundingClientRect().width > 0);
        if (b) { b.setAttribute('data-q1-back', '1'); return '[data-q1-back]'; } return null; });
      if (!sel) break;
      await tap(sel); await E(() => document.querySelectorAll('[data-q1-back]').forEach(e => e.removeAttribute('data-q1-back')));
      await sleep(300);
    }
    return check(label + ' · "atrás" lleva al menú', (await state()) === 'mainmenu', await state());
  };

  // ================= 1. título → cuenta → invitado =================
  await boot('?account=1&lazy=1');
  await shot('titulo');
  check('TITULO.dice_Tocá_para_continuar', /Tocá para continuar/.test(await E(() => document.getElementById('title-continue-btn').textContent)));
  await tap('#title-continue-btn');
  const s1 = await waitState(['account', 'starter']);
  await shot('cuenta');
  if (s1 === 'account') { await noDeadEnd('CUENTA'); await tap('#acc-guest-btn'); }
  check('CUENTA.invitado_lleva_al_regalo', (await waitState('starter')) === 'starter');
  noNewErrors('CUENTA');

  // ================= 2. regalo inicial: guardián =================
  await shot('guardian');
  const nCards = await E(() => document.querySelectorAll('#starter-grid .starter-card').length);
  check('REGALO.muestra_guardianes', nCards >= 2, nCards);
  const champ = await E(() => document.querySelector('#starter-grid .starter-card').dataset.champ);
  await tap(`.starter-card[data-champ="${champ}"]`);
  await noDeadEnd('REGALO.confirmar');
  // la barra de confirmar no tapa la carta elegida
  const cov = await E(() => { const c = document.getElementById('starter-confirm').getBoundingClientRect(), k = document.querySelector('.starter-card.sel').getBoundingClientRect(); return { conf: Math.round(c.top), card: Math.round(k.bottom), cardTop: Math.round(k.top) }; });
  check('REGALO.la_barra_no_tapa_la_carta_elegida', cov.conf >= cov.card - 2 || cov.cardTop >= 0 && cov.conf > cov.cardTop + 120, cov);
  if (await page.$('#starter-confirm summary')) {
    await tap('#starter-confirm summary'); await shot('ver_habilidades');
    const vh = await E(() => { const c = document.getElementById('starter-confirm').getBoundingClientRect(), y = document.getElementById('starter-yes-btn').getBoundingClientRect(); return { top: c.top, bottom: c.bottom, yes: y.bottom, h: innerHeight }; });
    check('REGALO.ver_habilidades_entra_en_pantalla', vh.top >= 0 && vh.bottom <= vh.h && vh.yes <= vh.h, vh);
    await tap('#starter-confirm summary');
  }
  await tap('#starter-no-btn');
  check('REGALO.elegir_otro_cierra_la_barra', await E(() => document.getElementById('starter-confirm').classList.contains('hidden')));
  await tap(`.starter-card[data-champ="${champ}"]`);
  await tap('#starter-yes-btn');
  // ================= 3. regalo inicial: skin =================
  const skinStep = await E(() => !document.getElementById('starter-step-skin').classList.contains('hidden'));
  check('REGALO.despues_del_guardian_viene_la_skin', skinStep);
  if (skinStep) {
    await shot('skin');
    await noDeadEnd('SKIN');
    const sk = await E(() => { const c = document.getElementById('starter-skin-confirm').getBoundingClientRect(); const cards = [...document.querySelectorAll('.starter-skin-card')].map(e => e.getBoundingClientRect().bottom); const sub = document.getElementById('starter-skin-sub').getBoundingClientRect(); const ts = document.getElementById('toast-stack'); const t = ts && ts.innerText.trim() ? ts.getBoundingClientRect() : null; return { conf: c.top, cards: Math.max(...cards), toastOverSub: !!(t && t.left < sub.right && t.bottom > sub.top && t.top < sub.bottom) }; });
    check('SKIN.la_barra_no_tapa_las_cartas', sk.conf >= sk.cards - 1, sk);
    check('SKIN.ningún_aviso_tapa_el_subtítulo', !sk.toastOverSub, sk);
    await tap('#starter-skin-yes-btn');
    await sleep(1600);
  }
  const g = await REAL();
  check('REGALO.guardián_propio_y_skin_guardada', g.champs.includes(champ) && !g.pending && !!g.skin, g);
  noNewErrors('REGALO');

  // ================= 4. entrenamiento → menú =================
  const s4 = await waitState(['playing', 'mainmenu'], 15000);
  await shot('despues_del_regalo');
  if (s4 === 'playing') {
    const skipBtn = await page.$('button[aria-label="Saltar tutorial"]');
    check('ENTRENAMIENTO.tiene_Saltar_tutorial', !!skipBtn);
    if (skipBtn) await tapEl(skipBtn); else await skipTraining();
  }
  check('MENU.se_llega_al_menú', (await waitState('mainmenu')) === 'mainmenu');
  await shot('menu'); await noDeadEnd('MENU');
  noNewErrors('ENTRENAMIENTO');

  // ================= 5. menús: Guardianes, Tienda, Explorar =================
  await tap('#mainmenu-guardianes-btn'); await waitState('codex'); await shot('guardianes'); await noDeadEnd('GUARDIANES');
  for (const t of ['Equipo', 'Talentos', 'Maestría', 'Skins', 'Ficha']) { if (await E((t) => [...document.querySelectorAll('.cx-tab')].some(b => b.innerText.trim() === t), t)) { await tapText('^\\s*' + t + '\\s*$', '.cx-tab'); await noDeadEnd('GUARDIANES.' + t); } }
  await backToMenu('GUARDIANES');
  await tap('#mainmenu-tienda-btn'); await waitState('shop'); await shot('tienda');
  for (const t of ['Guardianes', 'Objetos', 'Skins', 'Destacados']) { await tapText(t, '#shop-screen .shop-tab'); await noDeadEnd('TIENDA.' + t); }
  check('TIENDA.el_guardián_propio_no_muestra_precio', await E((k) => { const r = document.querySelector(`.shop-champ-row[data-champ="${k}"] .shop-price`); return !r || /Tuyo/.test(r.textContent); }, champ));
  // recargar en la Tienda: vuelve al título y de ahí al menú, sin repetir el regalo
  await boot('?lazy=1'); await tap('#title-continue-btn');
  const sR = await waitState(['mainmenu', 'starter', 'playing']);
  if (sR === 'playing') await skipTraining();
  check('RECARGA.en_la_Tienda_vuelve_al_menú_sin_repetir_el_regalo', (await waitState('mainmenu')) === 'mainmenu', sR);
  if (await page.$('.hub-more summary')) {
    await tap('.hub-more summary'); await shot('explorar');
    const ex = await E(() => ['mainmenu-codex-btn', 'mainmenu-quests-btn'].map(id => { const e = document.getElementById(id); if (!e || e.classList.contains('hidden')) return 'oculto'; const r = e.getBoundingClientRect(); return r.bottom <= innerHeight && r.top >= 0 ? 'ok' : 'fuera:' + Math.round(r.bottom); }));
    check('MENU.explorar_entra_en_pantalla', ex.every(x => x === 'ok' || x === 'oculto'), ex);
    await tap('#mainmenu-codex-btn'); await waitState('codex'); await noDeadEnd('CODICE'); await backToMenu('CODICE');
  }
  noNewErrors('MENUS');

  // ================= 6. primera arena: Sala → prólogo → Ciudad → victoria → Campamento → menú =================
  const play = async () => {
    await tap('#hub-play-btn'); await waitState(['prep', 'playing']);
    if ((await state()) === 'prep') { await shot('sala'); await noDeadEnd('SALA'); await tap('#prep-start-btn'); }
    for (let i = 0; i < 14 && (await state()) !== 'playing'; i++) {
      const open = await E(() => { const r = document.getElementById('run-intro'); return !!r && !r.classList.contains('hidden'); });
      if (open) { await noDeadEnd('PROLOGO'); const b = await page.$('#run-intro button.ri-go'); if (b && await b.boundingBox()) await tapEl(b); }
      await sleep(500);
    }
    return check('ARENA.empieza_la_partida', (await waitState('playing', 30000)) === 'playing', await state());
  };
  await page.addScriptTag({ path: path.join(__dirname, '..', 'playtest', 'autopilot.js') });
  if (!process.env.SKIP_WIN && await play()) {
    await shot('ciudad');
    // piloto automático con el motor real; el guardián no cae (se cura bajo 30 %): se mide el camino, no la puntería
    await E(() => { window.__AP.on = true; });
    let res = null;
    for (let i = 0; i < 90; i++) {
      // también se reparan las estructuras de la Ciudad que no cayeron (si caen todas se pierde: no es lo que se mide acá)
      res = await E(() => { if (player && player.alive && player.hp < player.maxHp * 0.3) player.hp = player.maxHp;
        if (typeof cmS !== 'undefined' && cmS && cmS.st) for (const q of cmS.st) if (q.hp > 0 && q.hp < q.max * 0.5) q.hp = q.max;
        window.__AP.sim(15000); return { st: state, lvl: runLevel }; });
      if (res.st !== 'playing' && res.st !== 'buff') break;
    }
    await E(() => { window.__AP.on = false; });
    check('CIUDAD.se_gana', res && res.st === 'victory', res);
    await shot('victoria');
    for (let i = 0; i < 10 && (await state()) === 'victory'; i++) {
      const camp = await E(() => { const c = document.getElementById('camp'); return !!c && !c.classList.contains('hidden'); });
      if (camp) break;
      await noDeadEnd('VICTORIA.' + await E(() => document.getElementById('victory-step-title').innerText));
      await tap('#victory-next-btn'); await sleep(900);
    }
    if (await E(() => { const c = document.getElementById('camp'); return !!c && !c.classList.contains('hidden'); })) {
      await shot('campamento'); await noDeadEnd('CAMPAMENTO');
      await tapText('Seguir', '#camp button');
    }
    // del Campamento se vuelve a la Sala (lista para la arena siguiente) o al menú; de ahí, "atrás" al menú
    const sc = await waitState(['mainmenu', 'prep']);
    check('CAMPAMENTO.sigue_a_la_Sala_o_al_menú', sc === 'mainmenu' || sc === 'prep', sc);
    if (sc === 'prep') { await shot('sala_arena2'); check('SALA.ofrece_la_arena_siguiente', await E(() => currentArena !== 'ciudad'), await E(() => currentArena)); await noDeadEnd('SALA.arena2'); }
    await backToMenu('CAMPAMENTO');
    noNewErrors('CIUDAD');
  }

  // ================= 7. perder 3 veces seguidas =================
  // caer con todo el equipo (los aliados mantienen viva la partida: onPlayerDeath, js/core/run.js) y dejar correr
  // la simulación hasta la pantalla de derrota
  const die = () => E(() => { for (let i = 0; i < 400 && (state === 'playing' || state === 'buff'); i++) { if (state === 'buff') { window.__AP.pickBuff(); continue; }
      for (const h of (heroes.length ? heroes : [player])) if (h && h.alive) { h.hp = 0; h.alive = false; }
      if (!runEnding) onPlayerDeath(); update(16.67); } return state; });
  for (let n = 1; n <= 3; n++) {
    if (n === 1) { if (!(await play())) break; } else { await tap('#retry-btn'); for (let i = 0; i < 14 && (await state()) !== 'playing'; i++) { const b = await page.$('#run-intro:not(.hidden) button.ri-go'); if (b) await tapEl(b); await sleep(400); } }
    const st = await die();
    await sleep(800);
    check(`DERROTA.${n}_muestra_la_pantalla_de_derrota`, (await waitState('gameover', 8000)) === 'gameover', st);
    await shot('derrota_' + n); await noDeadEnd('DERROTA.' + n);
  }
  await tap('#menu-btn-1');
  check('DERROTA.volver_al_menú', (await waitState(['mainmenu', 'prep'])) !== 'gameover', await state());
  await backToMenu('DERROTA');
  noNewErrors('DERROTAS');

  // ================= 8. abandonar una partida desde la pausa =================
  if (await play()) {
    await tap('#pause-btn'); await waitState('paused'); await shot('pausa'); await noDeadEnd('PAUSA');
    await tap('#quit-btn');
    const sq = await waitState(['mainmenu', 'prep', 'gameover'], 8000);
    check('PAUSA.abandonar_sale_de_la_partida', sq !== 'playing' && sq !== 'paused', sq);
    if (sq === 'gameover') await tap('#menu-btn-1');
    await backToMenu('ABANDONO');
  }
  // recargar en la Sala
  await tap('#hub-play-btn'); await waitState('prep');
  await boot('?lazy=1'); await tap('#title-continue-btn');
  if ((await waitState(['mainmenu', 'playing'])) === 'playing') await skipTraining();
  check('RECARGA.en_la_Sala_vuelve_al_menú', (await waitState('mainmenu')) === 'mainmenu');
  noNewErrors('FINAL');

  await browser.close();
  console.log(fails ? `\n${fails} FALLAS` : '\nTODO OK');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
