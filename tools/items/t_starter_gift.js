// REGALO INICIAL (js/systems/starter-gift.js): un guardián + UNA skin de ese guardián, sin oro de regalo.
// Verifica con toques reales: perfil nuevo → guardián → skin (animada, "¡Es tuya!") → equipada → menú y
// entrenamiento (desde #41 el primer ingreso ya no salta a la Ciudad: el entrenamiento cambia `save` por uno
// de práctica, por eso lo guardado se lee de ALPHA_TRAINING.snapshot.save mientras dura);
// skin de set (trae las piezas y la skin se ve); cerrar entre el guardián y la skin (vuelve a la skin);
// guardián sin skins → vale; "Elegir después" → vale; canje del vale en la Tienda (sin cobrar oro);
// guardados viejos (con los 10.000 de oro: los conservan y reciben el vale UNA vez; sin guardián: camino
// nuevo sin vale); pruebas viejas con webdriver siguen el camino de antes (guardián solo).
//   (python3 -m http.server 8771 &) ; node tools/items/t_starter_gift.js
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const BASE = process.env.SE_BASE_URL || 'http://127.0.0.1:8771';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 500) : '')); if (!ok) fails++; };

// flags: {firstRun} = camino nuevo (window.__firstRun); save = guardado inicial (una sola vez por contexto)
async function boot(browser, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_CERT|fonts\.g|net::|404/.test(m.text())) errors.push('console: ' + m.text().slice(0, 300)); });
  await ctx.addInitScript(([fr, s]) => {
    window.__campaignMode = true; window.__autoConfirm = true;
    if (fr) window.__firstRun = true;
    try { if (!sessionStorage.getItem('__sg')) { localStorage.clear(); if (s) localStorage.setItem('laHordaSave_v1', JSON.stringify(s)); sessionStorage.setItem('__sg', '1'); } } catch (e) {}
  }, [opts.firstRun !== false, opts.save || null]);
  const E = (fn, a) => page.evaluate(fn, a);
  const ready = async () => { for (let k = 0; k < 300; k++) { if (await E(() => { const b = document.getElementById('title-continue-btn'); return !!b && !b.disabled; }).catch(() => false)) break; await sleep(100); } };
  await page.goto(`${BASE}/index.html`, { waitUntil: 'load', timeout: 180000 });
  await ready();
  const tap = async (sel) => {
    let el = null;
    for (let i = 0; i < 40 && !el; i++) { el = await page.$(sel); if (el && !(await el.boundingBox())) el = null; if (!el) await sleep(100); }
    if (!el) throw new Error('no aparece ' + sel);
    await el.evaluate(e => e.scrollIntoView({ block: 'center', inline: 'center' })); await sleep(120);
    const b = await el.boundingBox(); await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); await sleep(350);
  };
  const vis = (sel) => E(s => { const e = document.querySelector(s); return !!(e && e.offsetParent !== null && !e.closest('.hidden')); }, sel);
  const reload = async () => { await page.reload({ waitUntil: 'load' }); await ready(); };
  return { ctx, page, E, tap, vis, reload, errors };
}
// el guardado REAL (durante el entrenamiento `save` es uno de práctica: js/systems/alpha-training.js)
const REAL = '(typeof ALPHA_TRAINING!=="undefined" && ALPHA_TRAINING.active ? ALPHA_TRAINING.snapshot.save : save)';
const waitFor = async (E, fn, ms = 8000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await E(fn).catch(() => false)) return true; await sleep(100); } return false; };

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });

  // ---------- 1. perfil nuevo: guardián → croma → equipada → Ciudad ----------
  {
    const B = await boot(browser);
    const { E, tap, vis } = B;
    const g0 = await E(() => ({ gold: save.gold, def: defaultSave().gold, tsg: typeof TEST_START_GOLD, notice: 'startGoldNotice' in save, v: save.skinVoucher, flag: save.starterGiftV1 }));
    check('ORO.perfil_nuevo_arranca_sin_regalo_de_oro', g0.gold === 0 && g0.def === 0 && g0.tsg === 'undefined' && !g0.notice && g0.v === 0 && g0.flag === true, g0);
    await tap('#title-continue-btn');
    check('FLUJO.primer_ingreso_lleva_a_elegir_guardian', await vis('#starter-step-champ') && !(await vis('#starter-step-skin')));
    await tap('.starter-card[data-champ="musashi"]');
    await tap('#starter-yes-btn');
    const st = await E(() => ({ state, pending: save.starterSkinPending, unlocked: save.champions.musashi.unlocked,
      cards: [...document.querySelectorAll('#starter-skin-grid [data-skin-gift]')].map(c => ({ id: c.dataset.skinGift, sel: c.classList.contains('sel'), anim: !!c.querySelector('canvas.champ-anim[data-skin="' + c.dataset.skinGift + '"][data-idle]'), name: c.querySelector('.gallery-card-name').textContent })),
      opts: starterSkinOptions('musashi').map(o => o.id), kinds: starterSkinOptions('musashi').map(o => o.kind), sub: document.getElementById('starter-skin-sub').textContent, confirm: document.getElementById('starter-skin-confirm-text').textContent }));
    check('FLUJO.despues_del_guardian_va_a_la_skin', st.state === 'starter' && st.pending === true && st.unlocked && await vis('#starter-step-skin') && !(await vis('#starter-step-champ')), st);
    check('SKIN.muestra_sus_skins_de_set_y_cromas_animadas', st.cards.length === st.opts.length && st.opts.includes('errante') && st.kinds.includes('croma') && st.cards.every(c => c.anim && c.name.length > 2), st.cards);
    check('SKIN.solo_skins_de_ese_guardian', await E(() => starterSkinOptions('musashi').every(o => (o.kind === 'croma' ? CROMA_SKINS[o.id].champ : skinSetChamp(o.id)) === 'musashi')), st.opts);
    check('SKIN.la_primera_ya_marcada_un_toque_alcanza', st.cards[0] && st.cards[0].sel && /¿Te quedás con/.test(st.confirm) && /Musashi/i.test(st.sub), st);
    // la animación dibuja algo (canvas con píxeles)
    await sleep(500);
    const drawn = await E(() => { const c = document.querySelector('#starter-skin-grid canvas.champ-anim'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++; return n; });
    check('SKIN.vista_previa_animada_dibuja', drawn > 200, drawn);
    const croma = await E(() => starterSkinOptions('musashi').find(o => o.kind === 'croma').id);
    await tap(`#starter-skin-grid [data-skin-gift="${croma}"]`);
    await tap('#starter-skin-yes-btn');
    const own = await E((id) => ({ owned: cromaOwned(id), eq: cromaEquippedId('musashi'), pending: save.starterSkinPending, chosen: save.starterSkin, gold: save.gold, v: save.skinVoucher,
      stamp: !document.querySelector(`#starter-skin-grid [data-skin-gift="${id}"] .starter-skin-own`).classList.contains('hidden'), txt: document.getElementById('starter-skin-confirm-text').textContent,
      stored: JSON.parse(localStorage.getItem('laHordaSave_v1')).champions.musashi.croma }), croma);
    check('SKIN.es_tuya_y_queda_equipada', own.owned && own.eq === croma && own.stored === croma && own.pending === false && own.chosen === croma && own.stamp && /¡Es tuya!/.test(own.txt), own);
    check('SKIN.regalo_no_cobra_oro_ni_da_vale', own.gold === 0 && own.v === 0, own);
    const next = await waitFor(E, () => state === 'mainmenu' || (state === 'playing' && typeof ALPHA_TRAINING !== 'undefined' && ALPHA_TRAINING.active), 8000);
    check('FLUJO.sigue_al_menu_o_al_entrenamiento', next && await E((R) => eval(R).starterSkin && !eval(R).starterSkinPending, REAL), await E(() => ({ state, arena: currentArena })));
    check('FLUJO.sin_errores', B.errors.length === 0, B.errors);
    await B.ctx.close();
  }

  // ---------- 2. skin de set: trae las piezas y la skin se ve en el guardián ----------
  {
    const B = await boot(browser);
    const { E, tap } = B;
    await tap('#title-continue-btn');
    await tap('.starter-card[data-champ="mago"]');
    await tap('#starter-yes-btn');
    const opts = await E(() => starterSkinOptions('mago').map(o => o.id + ':' + o.kind));
    check('SET.mago_ofrece_su_skin_de_set', opts.includes('convergencia:set'), opts);
    await tap('#starter-skin-grid [data-skin-gift="convergencia"]');
    await tap('#starter-skin-yes-btn');
    const r = await E(() => ({ active: skinIsActiveOn('convergencia', 'mago'), miss: shopSetMissing('convergencia').length, n: setPieceIds('convergencia').length,
      gift: stashItems().filter(it => it.set === 'convergencia' && it.gift).length, gold: save.gold, chosen: save.starterSkin }));
    check('SET.skin_de_set_equipada_con_sus_piezas', r.active && r.miss === 0 && r.gift === r.n && r.gold === 0 && r.chosen === 'convergencia', r);
    check('SET.sin_errores', B.errors.length === 0, B.errors);
    await B.ctx.close();
  }

  // ---------- 3. cerrar el juego entre el guardián y la skin: vuelve directo a la skin ----------
  {
    const B = await boot(browser);
    const { E, tap, vis } = B;
    await tap('#title-continue-btn');
    await tap('.starter-card[data-champ="cazadora"]');
    await tap('#starter-yes-btn');
    await B.reload();
    const pre = await E(() => ({ pending: save.starterSkinPending, need: needsStarterSkin(), champ: needsStarterChampion() }));
    await tap('#title-continue-btn');
    check('RECARGA.vuelve_a_la_skin_sin_repetir_el_guardian', pre.pending && pre.need && !pre.champ && await vis('#starter-step-skin') && !(await vis('#starter-step-champ')), pre);
    await tap('#starter-skin-later-btn');
    const r = await E((R) => { const S = eval(R); return { v: S.skinVoucher, pending: S.starterSkinPending, chosen: S.starterSkin, state }; }, REAL);
    check('DESPUES.elegir_despues_guarda_un_vale', r.v === 1 && r.pending === false && r.chosen === 'vale', r);
    await sleep(800);
    await B.ctx.close();
  }

  // ---------- 4. guardián sin skins: vale; canje en la Tienda ----------
  {
    const B = await boot(browser);
    const { E, tap, vis } = B;
    await E(() => { for (const id of Object.keys(CROMA_SKINS)) if (CROMA_SKINS[id].champ === 'tanque') delete CROMA_SKINS[id];
      for (const id of Object.keys(SET_SKINS)) if (skinSetChamp(id) === 'tanque') delete SET_SKINS[id]; }); // simula un guardián nuevo sin arte de skin
    await tap('#title-continue-btn');
    await tap('.starter-card[data-champ="tanque"]');
    await tap('#starter-yes-btn');
    const s = await E(() => ({ sub: document.getElementById('starter-skin-sub').textContent, vale: !!document.querySelector('#starter-skin-grid .starter-skin-vale'), later: document.getElementById('starter-skin-later-btn').classList.contains('hidden') }));
    check('VALE.guardian_sin_skins_lo_explica', /todavía no tiene skins/.test(s.sub) && /vale de skin/.test(s.sub) && s.vale && s.later, s);
    await tap('#starter-skin-yes-btn');
    await waitFor(E, () => state === 'mainmenu' || state === 'playing', 5000);
    check('VALE.queda_guardado', await E((R) => { const S = eval(R); return S.skinVoucher === 1 && S.starterSkin === 'vale' && !S.starterSkinPending; }, REAL));
    // Tienda: cartel + canje sin oro (se sale del entrenamiento si arrancó)
    await E(() => { if (typeof ALPHA_TRAINING !== 'undefined' && ALPHA_TRAINING.active) alphaTrainingSkip(); setState('shop'); shopTab = 'destacados'; renderShop(); });
    const sh = await E(() => ({ banner: (document.querySelector('.shop-vale-banner') || {}).textContent || '', btns: document.querySelectorAll('[data-voucher]').length }));
    check('TIENDA.cartel_y_botones_de_canje', /Tenés una skin de regalo: elegila/.test(sh.banner) && sh.btns >= 5, sh);
    const tgt = await E(() => Object.keys(CROMA_SKINS).find(id => CROMA_SKINS[id].champ === 'nigromante'));
    await tap(`.shop-croma-card[data-croma-card="${tgt}"] [data-voucher]`);
    await sleep(300);
    const r = await E((id) => ({ owned: cromaOwned(id), v: save.skinVoucher, gold: save.gold, banner: !!document.querySelector('.shop-vale-banner'), btns: document.querySelectorAll('[data-voucher]').length }), tgt);
    check('TIENDA.canje_cubre_el_precio_y_se_usa_una_vez', r.owned && r.v === 0 && r.gold === 0 && !r.banner && r.btns === 0, r);
    check('TIENDA.vale_no_se_canjea_sin_vale', await E(() => skinVoucherRedeem('errante').ok === false));
    // canje por skin de set (otro vale): trae las piezas que faltan
    const r2 = await E(() => { save.skinVoucher = 1; const r = skinVoucherRedeem('errante'); return { ok: r.ok, miss: shopSetMissing('errante').length, v: save.skinVoucher, again: skinVoucherCanRedeem('errante') }; });
    check('TIENDA.canje_por_skin_de_set', r2.ok && r2.miss === 0 && r2.v === 0 && !r2.again, r2);
    check('VALE.sin_errores', B.errors.length === 0, B.errors);
    await B.ctx.close();
  }

  // ---------- 5. guardados viejos ----------
  const legacy = (withChamp) => {
    const champs = {};
    for (const k of ['tanque', 'guerrero', 'mago', 'soporte', 'segador', 'axiom', 'profeta', 'musashi', 'cazadora', 'nigromante', 'libertador', 'eren'])
      champs[k] = { level: withChamp && k === 'mago' ? 12 : 1, xp: 0, unlocked: withChamp && k === 'mago', equipment: { arma: null, casco: null, escudo: null, pechera: null, guantes: null, botas: null } };
    return { itemSchemaV: 2, stashV1: true, affixV1: true, testStageV1: true, campaignResetV1: true, campaignResetV2: true, campaignResetV3: true, fortalezaMigrated: true, micelialMigrated: true,
      abismoMigrated: true, campaignV2: true, ciudadV1: true, talentTreeV2: true, minasV1: true, playtestV1Bonus: true, startGoldNotice: false,
      starterChosen: withChamp, lastChamp: withChamp ? 'mago' : null, gold: 10000, gems: 0, stash: [], champions: champs, arenasCleared: { ciudad: withChamp } };
  };
  {
    const B = await boot(browser, { save: legacy(true) });
    const { E, tap } = B;
    const r = await E(() => ({ gold: save.gold, v: save.skinVoucher, notice: save.skinVoucherNotice, flag: save.starterGiftV1, lvl: save.champions.mago.level, pend: save.starterSkinPending, sgn: 'startGoldNotice' in save }));
    check('VIEJO.conserva_sus_10000_y_recibe_un_vale', r.gold >= 10000 /* + logros retroactivos */ && r.v === 1 && r.notice === true && r.flag === true && r.lvl === 12 && !r.pend && !r.sgn, r);
    await tap('#title-continue-btn');
    await E(() => { if (typeof ALPHA_TRAINING !== 'undefined' && ALPHA_TRAINING.active) alphaTrainingSkip(); }); // perfil sin entrenamiento: se saltea (#41)
    const hub = await E(() => ({ state, toast: (document.getElementById('net-toast') || {}).textContent || '', badge: document.getElementById('hub-badge-shop').textContent, badgeOn: !document.getElementById('hub-badge-shop').classList.contains('hidden'),
      sub: document.querySelector('#mainmenu-tienda-btn .hub-tile-sub').textContent, notice: save.skinVoucherNotice }));
    check('VIEJO.aviso_en_el_hub', hub.state === 'mainmenu' && /Tenés una skin de regalo: elegila/.test(hub.toast) && hub.badgeOn && /REGALO/.test(hub.badge) && /Tenés una skin de regalo: elegila/.test(hub.sub) && hub.notice === false, hub);
    await B.reload();
    check('VIEJO.el_vale_no_se_repite_al_recargar', await E(() => save.skinVoucher === 1 && save.gold >= 10000));
    await tap('#title-continue-btn');
    await E(() => { if (typeof ALPHA_TRAINING !== 'undefined' && ALPHA_TRAINING.active) alphaTrainingSkip(); });
    await tap('#mainmenu-tienda-btn');
    check('VIEJO.la_tienda_muestra_el_vale', await E(() => !!document.querySelector('.shop-vale-banner') && document.querySelectorAll('[data-voucher]').length > 0));
    check('VIEJO.sin_errores', B.errors.length === 0, B.errors);
    await B.ctx.close();
  }
  {
    const B = await boot(browser, { save: legacy(false) });
    const { E, tap, vis } = B;
    const r = await E(() => ({ v: save.skinVoucher, need: needsStarterChampion(), gold: save.gold }));
    check('VIEJO_SIN_GUARDIAN.sin_vale_hace_el_camino_nuevo', r.v === 0 && r.need && r.gold >= 10000, r);
    await tap('#title-continue-btn');
    await tap('.starter-card[data-champ="profeta"]');
    await tap('#starter-yes-btn');
    check('VIEJO_SIN_GUARDIAN.elige_skin', await vis('#starter-step-skin'));
    await B.ctx.close();
  }

  // ---------- 6. pruebas viejas (webdriver sin __firstRun): camino de antes, sin paso de skin ----------
  {
    const B = await boot(browser, { firstRun: false });
    const { E, tap } = B;
    await tap('#title-continue-btn');
    await tap('.starter-card[data-champ="guerrero"]');
    await tap('#starter-yes-btn');
    const r = await E((R) => { const S = eval(R); return { state, pending: S.starterSkinPending, need: needsStarterSkin(), skin: !document.getElementById('starter-step-skin').offsetParent }; }, REAL);
    check('WEBDRIVER.camino_viejo_sin_paso_de_skin', r.state !== 'starter' && !r.pending && !r.need, r);
    await B.ctx.close();
  }

  await browser.close();
  console.log(fails ? `\n${fails} FALLAS` : '\nTODO OK');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
