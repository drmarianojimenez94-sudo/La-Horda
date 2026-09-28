// CROMAS (js/systems/cromas.js): variantes de color por recoloreo del atlas base, compradas con oro del
// juego y equipadas por guardián. Verifica: registro completo (cada guardián sin skin tiene al menos
// una; imágenes del mismo tamaño que la base), compra / equipar / quitar con sus reglas, que la skin de
// set completo manda sobre la croma, que se DIBUJA con otra paleta (píxeles distintos, misma silueta),
// que no cambia ninguna estadística, que viaja en el loadout del invitado, guardado y Tienda.
//   (python3 -m http.server 8771 &) ; node tools/items/t_cromas.js
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const BASE = process.env.SE_BASE_URL || 'http://127.0.0.1:8771';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 500) : '')); if (!ok) fails++; };
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: 900, height: 506 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_CERT|fonts\.g|net::|404/.test(m.text())) errors.push('console: ' + m.text().slice(0, 300)); });
  await page.addInitScript(() => { window.__campaignMode = true; });
  await page.goto(`${BASE}/index.html`, { waitUntil: 'load', timeout: 180000 });
  for (let k = 0; k < 300; k++) { if (await page.evaluate(() => !document.getElementById('title-continue-btn').disabled)) break; await sleep(100); }
  const E = (fn, a) => page.evaluate(fn, a);
  await E(() => { loop = function(){}; cromaLoadAll(); });
  // todas las imágenes de las cromas cargadas
  for (let k = 0; k < 200; k++) {
    const n = await E(() => { let p = 0; for (const id in CROMA_SKINS) { const d = CROMA_SKINS[id]; for (const k in d.packs) { const P = CHAMP_PACK[d.packs[k]]; if (P && !P.ready && !P.failed) p++; } for (const k in d.imgs) if (!d.imgs[k].complete) p++; } return p; });
    if (!n) break; await sleep(100);
  }

  // ---------- registro ----------
  const reg = await E(() => {
    const ids = Object.keys(CROMA_SKINS), bad = [], sizes = [];
    const withSet = new Set(Object.values(SET_SKINS).map(d => d.champ));
    const noSkin = Object.keys(CLASSES).filter(k => !withSet.has(k));
    for (const id of ids) {
      const d = CROMA_SKINS[id];
      if (!CLASSES[d.champ] || !CROMA_CRYSTALS[d.crystal] || !(d.price > 0) || !d.name || !d.lore || !d.preview) bad.push(id);
      for (const k in d.packs) { const P = CHAMP_PACK[d.packs[k]], B = CHAMP_PACK[k];
        if (!P || !P.ready) { bad.push(id + ':' + k + ' sin cargar'); continue; }
        if (P.atlas.naturalWidth !== B.atlas.naturalWidth || P.atlas.naturalHeight !== B.atlas.naturalHeight || P.fw !== B.fw || P.refH !== B.refH) sizes.push(id + ':' + k); }
      for (const k in d.imgs) { const im = d.imgs[k]; if (!im.naturalWidth) bad.push(id + ':' + k + ' sin cargar'); }
      if (!Object.keys(d.packs).length && !Object.keys(d.imgs).length) bad.push(id + ' vacía');
    }
    const tq = CROMA_SKINS.tanque_ancestral, tb = tq && tq.imgs.tanque_atlas;
    if (tb && (tb.naturalWidth !== TANQUE_IMG.naturalWidth || tb.naturalHeight !== TANQUE_IMG.naturalHeight)) sizes.push('tanque_atlas');
    const cover = noSkin.map(k => [k, ids.filter(id => CROMA_SKINS[id].champ === k).length]);
    return { n: ids.length, bad, sizes, cover, noSkin };
  });
  check('REGISTRO.datos_completos_y_cargadas', reg.n >= 3 && reg.bad.length === 0, reg.bad);
  check('REGISTRO.mismo_tamano_y_grilla_que_la_base', reg.sizes.length === 0, reg.sizes);
  check('REGISTRO.cada_guardian_sin_skin_tiene_croma', reg.cover.every(c => c[1] >= 1), reg.cover);

  // ---------- compra y equipar ----------
  const shop = await E(() => {
    for (const k in save.champions) { save.champions[k].unlocked = true; save.champions[k].croma = null; save.champions[k].equipment = mkEquipment(); }
    save.cromas = {}; state = 'menu'; invalidatePassiveCache();
    const id = 'nigromante_escarcha', out = {};
    save.gold = 100; out.sinOro = cromaBuy(id).ok === false && !cromaOwned(id);
    out.noEquipaSinComprar = cromaEquip('nigromante', id) === false;
    save.gold = 5000; const r = cromaBuy(id); out.compra = r.ok && save.gold === 5000 - cromaPrice(id) && cromaOwned(id);
    out.noDosVeces = cromaBuy(id).ok === false && save.gold === 5000 - cromaPrice(id);
    out.otroGuardianNo = cromaEquip('tanque', id) === false;
    out.equipa = cromaEquip('nigromante', id) && cromaEquippedId('nigromante') === id && champSkinId('nigromante') === id;
    out.quita = cromaEquip('nigromante', null) && cromaEquippedId('nigromante') === null && champSkinId('nigromante') === null;
    state = 'playing'; out.noEnPartida = cromaBuy('tanque_juicio').ok === false; state = 'menu';
    return out;
  });
  for (const k in shop) check('TIENDA.' + k, shop[k] === true);

  // ---------- la skin de set completo manda ----------
  const pri = await E(() => {
    const id = Object.keys(SET_SKINS).find(s => CROMA_SKINS && Object.values(CROMA_SKINS).some(d => d.champ === SET_SKINS[s].champ));
    if (!id) return { skip: true };
    const k = SET_SKINS[id].champ, cid = Object.keys(CROMA_SKINS).find(c => CROMA_SKINS[c].champ === k);
    save.cromas[cid] = true; cromaEquip(k, cid);
    const a = champSkinId(k);
    save.stash = []; setPieceIds(id).forEach(p => { const it = makeDesignedItem(p); stashItems().push(it); equipItem(k, it.uid); }); invalidatePassiveCache();
    const b = champSkinId(k);
    save.champions[k].equipment = mkEquipment(); save.stash = []; invalidatePassiveCache();
    const c = champSkinId(k);
    cromaEquip(k, null);
    return { k, cid, set: id, conCroma: a, conSet: b, sinSet: c, ok: a === cid && b === id && c === cid };
  });
  check('REGLA.skin_de_set_completo_tapa_la_croma', pri.skip || pri.ok, pri);

  // ---------- dibujo: otra paleta, misma silueta; sin cambios de estadísticas ----------
  const draw = await E(() => {
    const out = {};
    const shot = (k, cid) => {
      if (cid) { save.cromas[cid] = true; cromaEquip(k, cid); } else cromaEquip(k, null);
      selectedClass = k; currentArena = 'bosque'; lobbyAllies = []; startRun(1); spawnTimer = 1e12; enemies.length = 0; levelDuration = 9e9;
      const h = player; h.x = 60; h.y = 100; h.fx = 0; h.fy = 1; h.moving = false; h.attackAnim = 0; h.hurtTimer = 0; h.animT = 0;
      const stats = [h.maxHp, h.dmg, h.def, h.speed, h.maxEnergy].map(v => Math.round((v || 0) * 1000));
      const c = document.createElement('canvas'); c.width = 120; c.height = 120;
      const g = c.getContext('2d', { willReadFrequently: true }); const saved = ctx; ctx = g; const an = animNow; animNow = 100000;
      try { drawHeroBody(h, h.scale || 2, false, false); } finally { ctx = saved; animNow = an; }
      return { d: g.getImageData(0, 0, 120, 120).data, stats, skin: activeSetSkinId(h) };
    };
    for (const cid in CROMA_SKINS) {
      const k = CROMA_SKINS[cid].champ;
      const A = shot(k, null), B = shot(k, cid);
      let diff = 0, solidA = 0, sameAlpha = 0;
      for (let i = 0; i < A.d.length; i += 4) {
        if (A.d[i + 3] > 128) solidA++;
        if ((A.d[i + 3] > 128) === (B.d[i + 3] > 128)) sameAlpha++;
        if (A.d[i + 3] > 128 && B.d[i + 3] > 128 && (Math.abs(A.d[i] - B.d[i]) + Math.abs(A.d[i + 1] - B.d[i + 1]) + Math.abs(A.d[i + 2] - B.d[i + 2])) > 40) diff++;
      }
      out[cid] = { solidA, diffPct: +(diff / Math.max(1, solidA) * 100).toFixed(1), silueta: +(sameAlpha / (A.d.length / 4) * 100).toFixed(2),
        skin: B.skin, mismasStats: A.stats.join() === B.stats.join() };
      cromaEquip(k, null);
    }
    return out;
  });
  const dv = Object.entries(draw);
  check('DIBUJO.otra_paleta_se_ve', dv.every(([, o]) => o.solidA > 200 && o.diffPct >= 4), draw);
  check('DIBUJO.misma_silueta', dv.every(([, o]) => o.silueta >= 99.5), dv.map(([k, o]) => [k, o.silueta]));
  check('DIBUJO.skin_activa_es_la_croma', dv.every(([k, o]) => o.skin === k));
  check('PODER.croma_no_cambia_estadisticas', dv.every(([, o]) => o.mismasStats));

  // poses de habilidad del Tanque con croma: las imágenes del módulo vuelven a la base al terminar
  const knight = await E(() => {
    save.cromas.tanque_ancestral = true; cromaEquip('tanque', 'tanque_ancestral');
    selectedClass = 'tanque'; startRun(1); enemies.length = 0; const h = player; h.spinTimer = 800; h.spinMaxTimer = 2400;
    const before = CaballeritoHabilidades.images.torbellino; let during = null;
    const orig = CaballeritoHabilidades.draw; CaballeritoHabilidades.draw = function(){ during = CaballeritoHabilidades.images.torbellino; return orig.apply(this, arguments); };
    try { drawHeroBody(h, 2, true, false); } finally { CaballeritoHabilidades.draw = orig; }
    const after = CaballeritoHabilidades.images.torbellino; h.spinTimer = 0; cromaEquip('tanque', null);
    return { cambio: during === CROMA_SKINS.tanque_ancestral.imgs.torbellino, restaurada: after === before };
  });
  check('DIBUJO.tanque_torbellino_con_croma_y_restaurado', knight.cambio && knight.restaurada, knight);

  // ---------- red: loadout del invitado ----------
  const net1 = await E(() => {
    save.cromas.libertador_escarcha = true; cromaEquip('libertador', 'libertador_escarcha'); selectedClass = 'libertador';
    const L = netBuildLoadout();
    const rec = netLoadoutRecord(L);
    const bad = netLoadoutRecord(Object.assign({}, L, { croma: 'tanque_juicio' }));
    const fake = netLoadoutRecord(Object.assign({}, L, { croma: 'no_existe' }));
    // el anfitrión simula al invitado con SU registro: la skin del héroe es la croma y viaja como skinSet
    const back = save.champions.libertador; save.champions.libertador = rec;
    const sid = activeSetSkinId({ classKey: 'libertador' });
    save.champions.libertador = back; cromaEquip('libertador', null);
    return { enLoadout: L.croma === 'libertador_escarcha' && L.skin === 'libertador_escarcha', registro: rec.croma === 'libertador_escarcha',
             ajenaNo: !bad.croma, inexistenteNo: !fake.croma, skinDelHeroe: sid };
  });
  check('RED.croma_en_el_loadout', net1.enLoadout && net1.registro && net1.skinDelHeroe === 'libertador_escarcha', net1);
  check('RED.croma_ajena_o_inexistente_se_descarta', net1.ajenaNo && net1.inexistenteNo, net1);

  // ---------- guardado ----------
  const sv = await E(() => {
    state = 'menu'; save.cromas = { axiom_piedra: true }; save.champions.axiom.croma = 'axiom_piedra'; persistNow();
    save.cromas = {}; save.champions.axiom.croma = null;
    loadSave();
    const ok = cromaOwned('axiom_piedra') && cromaEquippedId('axiom') === 'axiom_piedra';
    cromaEquip('axiom', null); return ok;
  });
  check('GUARDADO.cromas_compradas_y_equipada_sobreviven', sv);

  // ---------- Tienda (pestaña Skins) ----------
  const ui = await E(() => {
    save.gold = 20000; save.cromas = {}; for (const k in save.champions) save.champions[k].unlocked = true;
    setState('shop'); shopTab = 'skins'; renderShop();
    const cards = document.querySelectorAll('#shop-panel [data-croma-card]').length;
    const buy = document.querySelector('#shop-panel [data-croma-buy="tanque_juicio"]');
    return { cards, total: Object.keys(CROMA_SKINS).length, hayBoton: !!buy, precio: buy ? buy.textContent : '' };
  });
  check('UI.tarjetas_de_cromas_en_la_tienda', ui.cards === ui.total && ui.hayBoton && /1\.?500/.test(ui.precio), ui);
  await page.click('#shop-panel [data-croma-buy="tanque_juicio"]');
  await sleep(200);
  const ok = await page.$('.game-modal .btn, #game-modal-ok, [data-modal-ok]');
  if (ok) await ok.click(); else await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(b => /^Comprar$/.test(b.textContent.trim()) && b.offsetParent); if (b) b.click(); });
  await sleep(300);
  const after = await E(() => ({ owned: cromaOwned('tanque_juicio'), eq: cromaEquippedId('tanque'), gold: save.gold,
    card: !!document.querySelector('#shop-panel [data-croma-card="tanque_juicio"].active') }));
  check('UI.comprar_desde_la_tienda_equipa', after.owned && after.eq === 'tanque_juicio' && after.gold === 20000 - 1500 && after.card, after);
  if (process.env.SHOT) { await page.evaluate(() => { const c = document.querySelector('.shop-croma-box'); if (c) c.scrollIntoView(); }); await sleep(400); await page.screenshot({ path: process.env.SHOT }); }

  // ---------- Códice (ficha del guardián): chips de croma y su ficha con comprar / usar ----------
  const cx = await E(() => {
    save.cromas = {}; cromaEquip('nigromante', null);
    const html = codexChampSkinsHtml('nigromante'), chips = (html.match(/Croma · /g) || []).length;
    const el = document.createElement('div'); el.innerHTML = '<div id="cx-skin-detail"></div>'; document.body.appendChild(el);
    codexSkinDetail(el, 'nigromante', 'nigromante_piedra');
    const buyBtn = !!el.querySelector('#cx-croma-buy');
    save.cromas.nigromante_piedra = true; codexSkinDetail(el, 'nigromante', 'nigromante_piedra');
    const useBtn = el.querySelector('#cx-croma-on'); const origR = codexRender; codexRender = () => {};
    try { useBtn && useBtn.click(); } finally { codexRender = origR; }
    const eq = cromaEquippedId('nigromante'); cromaEquip('nigromante', null); el.remove();
    return { chips, esperadas: cromaIdsFor('nigromante').length, buyBtn, usar: !!useBtn, eq };
  });
  check('CODICE.chips_y_ficha_de_croma', cx.chips === cx.esperadas && cx.buyBtn && cx.usar && cx.eq === 'nigromante_piedra', cx);

  check('sin_errores_de_pagina', errors.length === 0, errors.slice(0, 5));
  await browser.close();
  console.log(fails ? `\n${fails} FALLAS` : '\nTODO OK');
  process.exit(fails ? 1 : 0);
})();
