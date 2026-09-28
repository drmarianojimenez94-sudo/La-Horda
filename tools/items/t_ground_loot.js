// Botín de verdad (U1): objetos que caen al piso con haz de luz y se levantan, afijos al azar con efecto
// real y rango visible, la Mística (re-tirar un afijo por oro), élites con nombre y guardados viejos.
// Corre el juego real en Chromium.
//   (python3 -m http.server 8821 &) ; SE_BASE_URL=http://127.0.0.1:8821 node tools/items/t_ground_loot.js
//   SHOTS=1 guarda capturas en teléfono apaisado (844×390) en SHOT_DIR (por defecto /tmp).
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const BASE = process.env.SE_BASE_URL || 'http://127.0.0.1:8821';
const SHOT_DIR = process.env.SHOT_DIR || '/tmp';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 400) : '')); if (!ok) fails++; };
async function boot(browser, initSave, vp){
  const page = await (await browser.newContext({ viewport: vp || { width: 844, height: 390 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_CERT|fonts\.g|net::|404/.test(m.text())) errors.push('console: ' + m.text().slice(0, 300)); });
  await page.addInitScript((s) => { window.__campaignMode = true; if (s) localStorage.setItem('laHordaSave_v1', JSON.stringify(s)); }, initSave || null);
  await page.goto(`${BASE}/index.html`, { waitUntil: 'load' });
  for (let k = 0; k < 300; k++) { if (await page.evaluate(() => !document.getElementById('title-continue-btn').disabled)) break; await sleep(100); }
  await page.evaluate(() => { loop = function(){};
    window.__start = (arena, lv, champ) => { for (const k of Object.keys(save.champions)) save.champions[k].unlocked = true;
      selectedClass = champ || 'guerrero'; currentArena = arena; lobbyAllies = ['tanque','mago','soporte']; startRun(lv || 1); spawnTimer = 1e12; enemies.length = 0; levelDuration = 9e9; };
    window.__foe = (type, dx, dy) => { const e = spawnEnemy(type || 'zombie', false); e.x = player.x + (dx||40); e.y = player.y + (dy||0); e.hp = e.maxHp = 5000; return e; };
    window.__step = (ms) => { let t = 0; while (t < ms && state === 'playing') { for (const h of heroes) h.hp = Math.max(h.hp, h.maxHp*0.8); update(16); t += 16; } };
    eliteNamedChance = () => 0; // las élites con nombre se fuerzan en cada prueba (eliteMaybeName(e, [...]))
    window.__item = (type, rarity, affixes) => { const it = makeItem(type, rarity, null, {noAffixes:true}); it.affixes = affixes || []; stashItems().push(it); return it; };
  });
  return { page, errors, E: (fn, a) => page.evaluate(fn, a) };
}
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });

  // ---------- 1) guardado viejo: los objetos siguen valiendo y reciben sus afijos ----------
  {
    const it = (uid, type, rar, extra) => Object.assign({ uid, type, rarity: rar, name: 'Hacha Vieja '+uid, noun:'Hacha', icon: '⚔', statKey: type, value: 0.2, roll:1, level:3, passives: [], champion: null }, extra || {});
    const legacy = { itemSchemaV: 2, stashV1: true, testStageV1: true, campaignResetV1: true, campaignResetV2: true, campaignResetV3: true, fortalezaMigrated: true, micelialMigrated: true, abismoMigrated:true, campaignV2:true, ciudadV1:true, minasV1:true, starterChosen: true, gold: 500,
      stash: [it('o1','arma','raro'), it('o2','casco','comun'), it('o3','botas','muyraro'), Object.assign(it('o4','escudo','legendario'), {designed:true, designId:'tanque_leg', champion:'tanque', name:'Escudo del Juggernaut'})],
      champions: { guerrero: { level: 5, xp: 0, unlocked: true, equipment: { arma:'o1', casco:'o2', escudo:null, pechera:null, guantes:null, botas:null } } } };
    const { E, errors } = await boot(browser, legacy);
    const m = await E(() => ({ n: save.stash.length, names: save.stash.map(i=>i.name), lv: save.stash.map(i=>i.level), aff: save.stash.map(i=>(i.affixes||[]).length),
      eq: save.champions.guerrero.equipment.arma + ',' + save.champions.guerrero.equipment.casco, flag: JSON.parse(localStorage.getItem(SAVE_KEY)).affixV1 === true,
      persistedAff: (JSON.parse(localStorage.getItem(SAVE_KEY)).stash||[]).every(i=>Array.isArray(i.affixes)), rar: save.stash.map(i=>i.rarity).join() }));
    check('SAVE.objetos_viejos_quedan_validos', m.n === 4 && m.names[0] === 'Hacha Vieja o1' && m.names[3] === 'Escudo del Juggernaut' && m.lv.every(l=>l===3) && m.eq === 'o1,o2' && m.rar === 'raro,comun,muyraro,legendario', m);
    check('SAVE.reciben_afijos_por_rareza', m.aff[0] >= 2 && m.aff[0] <= 3 && m.aff[1] === 2 && m.aff[2] >= 3 && m.aff[3] >= 1 && m.aff[3] <= 2, m);
    check('SAVE.migracion_guardada_una_vez', m.flag && m.persistedAff, m);
    // determinística: recargar no vuelve a tirar
    const again = await E(() => { const before = JSON.stringify(save.stash.map(i=>i.affixes)); loadSave(); return before === JSON.stringify(save.stash.map(i=>i.affixes)); });
    check('SAVE.no_se_vuelve_a_tirar_al_recargar', again);
    check('SAVE.sin_errores', errors.length === 0, errors);
  }

  const { page, E, errors } = await boot(browser);

  // ---------- 2) afijos: cantidad por rareza, nombre D2, rango y comparación ----------
  {
    const r = await E(() => {
      const cnt = {comun:[], raro:[], muyraro:[]};
      for (const rar of Object.keys(cnt)) for (let i = 0; i < 60; i++) cnt[rar].push(makeItem(EQUIP_SLOT_TYPES[i%6], rar).affixes.length);
      const leg = []; for (let i = 0; i < 40; i++) { const it = materializeLoot({tier:'legendario'}, 'guerrero', 'infernal'); leg.push({n:it.affixes.length, designed:!!it.designed, name:it.name}); }
      const sets = []; for (let i = 0; i < 10; i++) { const it = materializeLoot({tier:'set', designId: Object.keys(DESIGNED_ITEMS).find(k=>DESIGNED_ITEMS[k].set)}, 'guerrero', 'infernal'); sets.push({n:it.affixes.length, name:it.name, set:it.set}); }
      const named = []; for (let i = 0; i < 40; i++) { const it = makeItem('arma', 'raro'); named.push(it.name); }
      // un afijo fuera de su ranura nunca sale (daño solo en arma/guantes)
      let bad = 0; for (let i = 0; i < 300; i++) { const it = makeItem('botas', 'muyraro'); for (const a of it.affixes) if (AFFIX_DB[a.id].slots.indexOf('botas') < 0) bad++; const ef = it.affixes.map(a=>AFFIX_DB[a.id].effect); if (new Set(ef).size !== ef.length) bad++; }
      const it = __item('arma', 'raro', [{id:'afx_dmg', v:0.1}]); const txt = affixText(it, it.affixes[0]);
      return { cnt, leg, sets, named, bad, txt };
    });
    const rng = (a, lo, hi) => a.every(n => n >= lo && n <= hi);
    check('AFX.comun_2_raro_2a3_muyraro_3a4', rng(r.cnt.comun, 2, 2) && rng(r.cnt.raro, 2, 3) && rng(r.cnt.muyraro, 3, 4) && r.cnt.raro.includes(3) && r.cnt.muyraro.includes(4), r.cnt);
    check('AFX.legendarios_y_sets_suman_1a2_sin_perder_identidad', r.leg.every(l => l.n >= 1 && l.n <= 2) && r.sets.every(s => s.n >= 1 && s.n <= 2 && s.set) && r.leg.some(l=>l.designed), { leg: r.leg.slice(0, 4), sets: r.sets.slice(0, 2) });
    check('AFX.nombre_d2_prefijo_y_sufijo', r.named.some(n => / de(l| la) /.test(n) && n.split(' ').length >= 4), r.named.slice(0, 8));
    check('AFX.solo_en_su_ranura_y_sin_repetir_efecto', r.bad === 0, r.bad);
    check('AFX.rango_visible_en_el_tooltip', /\+10% daño .*\[5-10\]/.test(r.txt), r.txt); // raro: rango [6-12] × 0,8
    // comparación ▲▼ contra lo equipado + filas nuevas en la comparación de estadísticas
    const c = await E(() => { save.stash = []; __start('bosque', 1, 'guerrero');
      const a = __item('guantes', 'raro', [{id:'afx_dmg', v:0.06}, {id:'afx_speed', v:0.05}]); equipItem('guerrero', a.uid);
      const b = __item('guantes', 'raro', [{id:'afx_dmg', v:0.10}, {id:'afx_crit', v:0.03}]);
      const L = affixLines(b, 'guerrero').map(l=>l.cmp); const html = itemDetailHTML(b, 'guerrero');
      return { L, arrows: /▲/.test(html) && /▼/.test(html), rng: /\[\d+-\d+\]/.test(html), cmp: compareItemsHTML('guerrero', b) }; });
    check('AFX.compara_con_lo_equipado', c.L.join() === 'up,new,lost' && c.arrows && c.rng, c.L);
  }

  // ---------- 3) los afijos tienen efecto REAL en las estadísticas y en combate ----------
  {
    const r = await E(() => {
      save.stash = []; __start('bosque', 1, 'guerrero'); for (const k in save.champions) save.champions[k].equipment = mkEquipment();
      invalidatePassiveCache();
      const base = { dmg: passiveSum('guerrero', 'dmg_mult'), hp: computePlayerStats('guerrero').hp, fire: passiveSum('guerrero', 'res_fire') };
      const w = __item('arma', 'raro', [{id:'afx_dmg', v:0.10}]); equipItem('guerrero', w.uid);
      const c = __item('pechera', 'raro', [{id:'afx_hp', v:0.08}, {id:'afx_resfire', v:0.15}]); equipItem('guerrero', c.uid);
      invalidatePassiveCache();
      const after = { dmg: passiveSum('guerrero', 'dmg_mult'), hp: computePlayerStats('guerrero').hp, fire: passiveSum('guerrero', 'res_fire') };
      const keepW = w.affixes; w.affixes = []; invalidatePassiveCache(); after.dmgNoAffix = passiveSum('guerrero', 'dmg_mult'); w.affixes = keepW; invalidatePassiveCache();
      // combate: el mismo golpe de fuego duele menos con la resistencia del afijo
      const fireFoe = { type:'demonio_menor', dmgType:'fire', rank:'normal', x:player.x+30, y:player.y, alive:true };
      const t = typeof enemyDmgType==='function' ? enemyDmgType(fireFoe) : null;
      const m1 = heroResistMult(player, fireFoe);
      // combate: golpes básicos contra un muñeco, sin críticos, con y sin el afijo de daño
      const hit = (withAffix) => { w.affixes = withAffix ? keepW : []; invalidatePassiveCache();
        for (const h of heroes) if (h !== player) { h.alive = false; h.x = player.x - 3000; }
        enemies.length = 0; const e = __foe('zombie', 40, 0); e.speed = 0; e.stunTimer = 1e9; runStats.critChance = -1; player.atkCd = 0; player.basicCd = 0;
        const R = Math.random; Math.random = ()=>0.5; basicHeld = true; try { __step(3000); } finally { basicHeld = false; Math.random = R; } return e.maxHp - e.hp; };
      const d0 = hit(false), d1 = hit(true);
      return { base, after, v: affixValue(w, w.affixes[0]), t, m1, d0, d1 };
    });
    check('STAT.afijo_de_danio_suma_en_passiveSum', Math.abs((r.after.dmg - r.after.dmgNoAffix) - r.v) < 1e-6, r);
    check('STAT.afijo_de_vida_sube_la_vida_maxima', r.after.hp > r.base.hp, r);
    check('STAT.afijo_de_resistencia_suma', Math.abs(r.after.fire - r.base.fire - 0.15) < 1e-6, r);
    check('COMBAT.afijo_de_danio_pega_mas_fuerte', r.d0 > 0 && r.d1 > r.d0 * 1.04, { d0: r.d0, d1: r.d1, ratio: r.d1/r.d0 });
    const res = await E(() => { const src = { type:'demonio_menor', rank:'normal', alive:true, x:0, y:0 }; const t = enemyDmgType(src);
      if (!t) return { skip:true };
      const w = stashItems().find(i=>i.type==='pechera'); const m1 = heroResistMult(player, src); unequipItem('guerrero', 'pechera'); invalidatePassiveCache(); const m0 = heroResistMult(player, src); equipItem('guerrero', w.uid); invalidatePassiveCache();
      const aff = __item('pechera', 'raro', [{id:'afx_res'+(t==='lightning'?'ltg':t==='physical'?'phys':t), v:0.15}]); equipItem('guerrero', aff.uid); invalidatePassiveCache(); const m2 = heroResistMult(player, src); return { t, m0, m2 }; });
    check('COMBAT.resistencia_del_afijo_reduce_el_golpe', res.skip || res.m2 < res.m0, res);
  }

  // ---------- 4) botín en el piso: cae, tiene haz, se levanta al pasar y con el botón ----------
  {
    const r = await E(() => {
      save.stash = []; __start('infernal', 5, 'guerrero'); for (const h of heroes) if (h !== player) h.alive = false;
      const out = {};
      // subjefe: siempre suelta; élite con nombre con probabilidad forzada; comunes casi nunca
      const sub = __foe('zombie', 200, 0); sub.rank = 'subjefe'; sub.lastHitBy = player; killEnemy(sub);
      out.afterSub = groundLoot.length;
      const cmn = []; let commonDrops = 0; const n0 = groundLoot.length;
      for (let i = 0; i < 400; i++) { const e = __foe('zombie', 400, 0); e.lastHitBy = player; killEnemy(e); }
      commonDrops = groundLoot.length - n0; groundLoot.length = n0;
      out.commonDrops = commonDrops;
      const g = groundLoot[0];
      out.first = g && { tier: g.tier, name: g.item.name, beam: GROUND_BEAM[g.tier], x: g.x, y: g.y, aff: g.item.affixes.length };
      out.allBeams = ['comun','raro','muyraro','legendario','mitico','set','unico'].every(t=>GROUND_BEAM[t] && GROUND_SFX[t]);
      return out;
    });
    check('DROP.subjefe_suelta_siempre', r.afterSub >= 1 && r.first && r.first.aff >= 1, r);
    check('DROP.comunes_casi_nunca', r.commonDrops <= 8, r.commonDrops);
    check('DROP.haz_y_sonido_por_rareza', r.allBeams && !!r.first.beam, r.first);
    // el haz se ve: píxeles más brillantes arriba del objeto que en el mismo lugar sin objeto
    const beam = await E(() => {
      groundLoot.length = 0; for (const e of enemies) e.alive = false; enemies.length = 0;
      particles.length = 0; potions.length = 0;
      const it = materializeLoot({tier:'legendario'}, 'guerrero', 'infernal');
      const gx = player.x + 150, gy = player.y + 40;
      const sample = () => { render(); const s = worldToScreen(gx, gy - 130); const d = DPR||1; const px = ctx.getImageData(Math.round(s.x*d)-3, Math.round(s.y*d)-3, 7, 7).data; let sum = 0; for (let i = 0; i < px.length; i += 4) sum += px[i] + px[i+1]; return sum; };
      const before = sample();
      groundLoot.push({item:it, tier:itemTier(it), x:gx, y:gy, t0:animNow - 5000, id:999});
      const after = sample();
      return { before, after };
    });
    check('DROP.haz_de_luz_visible', beam.after > beam.before * 1.08, beam);
    const pick = await E(() => {
      groundLoot.length = 0; save.stash = [];
      const g = groundLootDrop(player.x + 300, player.y, 'A', 1, 'infernal', 'elite');
      const onFloor = groundLoot.length === 1, inStash0 = stashItems().length;
      // lejos: no se levanta
      __step(100); const still = groundLoot.length === 1;
      // pasar por encima
      player.x = g.x; player.y = g.y; __step(50);
      const toast = document.querySelector('#loot-toasts .loot-toast .lt-name');
      const r = { onFloor, inStash0, still, picked: groundLoot.length === 0 && stashItems().some(i=>i.uid===g.item.uid),
        toast: toast && toast.textContent, toastColor: toast && toast.style.color, color: itemColor(g.item) };
      // botón contextual: a 90 px (fuera del radio de paso) lo levanta de un toque
      const g2 = groundLootDrop(player.x + 90, player.y, 'A', 1, 'infernal', 'elite');
      updateReviveBtn(); r.btnLabel = document.querySelector('#btn-revive .lbl') && document.querySelector('#btn-revive .lbl').textContent;
      document.getElementById('btn-revive').dispatchEvent(new PointerEvent('pointerdown', {bubbles:true}));
      document.getElementById('btn-revive').dispatchEvent(new PointerEvent('pointerup', {bubbles:true}));
      r.btnPicked = !groundLoot.includes(g2) && stashItems().some(i=>i.uid===g2.item.uid);
      return r;
    });
    check('PICK.cae_y_espera_en_el_piso', pick.onFloor && pick.inStash0 === 0 && pick.still, pick);
    check('PICK.se_levanta_al_pasar_por_encima', pick.picked, pick);
    check('PICK.toast_con_nombre_coloreado', !!pick.toast && pick.toast.length > 2 && !!pick.toastColor, pick);
    check('PICK.boton_contextual_levantar', pick.btnLabel === 'Levantar' && pick.btnPicked, pick);
    const full = await E(() => { groundLoot.length = 0; save.stash = []; for (let i = 0; i < INVENTORY_CAPACITY; i++) stashItems().push(makeItem('arma','muyraro')); // sin Comunes/Raros que reciclar (t_build_uniques: reciclaje)
      const g = groundLootDrop(player.x, player.y, 'A', 1, 'infernal', 'elite', 1); __step(50); const stays = groundLoot.includes(g); save.stash = []; __step(50);
      return { stays, pickedLater: !groundLoot.includes(g) }; });
    check('PICK.inventario_lleno_queda_en_el_piso', full.stays && full.pickedLater, full);
    // pity: si cae un Legendario en el piso, su protección vuelve a cero
    const pity = await E(() => { save.lootPity = {legendario:9, set:3, mitico:2, unico:1}; let got = null, setDrop = false;
      for (let i = 0; i < 400 && !got; i++){ const g = groundLootDrop(player.x+500, player.y, 'S', 1, 'infernal', 'jefe'); if (g && g.item.lootTier === 'legendario') got = g; if (g && g.item.lootTier === 'set') setDrop = true; }
      groundLoot.length = 0; return { got: !!got, setDrop, pity: save.lootPity }; });
    check('PITY.legendario_del_piso_reinicia_su_proteccion', pity.got && pity.pity.legendario === 0 && (pity.setDrop ? pity.pity.set === 0 : pity.pity.set === 3), pity);
    // victoria: lo que quedó en el piso se junta solo
    const vic = await E(() => { groundLoot.length = 0; save.stash = []; groundLootDrop(player.x+600, player.y, 'A', 1, 'infernal', 'elite'); groundLootDrop(player.x+650, player.y, 'A', 1, 'infernal', 'elite');
      const got = groundLootCollectAll(); return { got: got.length, stash: stashItems().length, floor: groundLoot.length }; });
    check('PICK.al_ganar_se_junta_lo_que_quedo', vic.got === 2 && vic.stash === 2 && vic.floor === 0, vic);
  }

  // ---------- 4b) Horda Infinita: la ronda sube la calificación y lo levantado entra en los resultados ----------
  {
    const r = await E(() => {
      const was = endlessActive, local = EN.local, round = EN.round;
      endlessActive = true; EN.round = 20; EN.local = { loot: [] };
      const el = { rank:'elite', eliteName:null }, sub = { rank:'subjefe' };
      const s1 = _glSource(el), s2 = _glSource(sub);
      groundLoot.length = 0; save.stash = []; const g = groundLootDrop(player.x, player.y, s2.grade, s2.hm, currentArena, s2.rk); __step(50);
      const out = { eliteGrade: s1.grade, subGrade: s2.grade, eliteChance: s1.chance, inResults: EN.local.loot.length };
      endlessActive = was; EN.local = local; EN.round = round;
      return out; });
    check('ENDLESS.la_ronda_mejora_el_botin_del_piso', r.eliteGrade === 'S' && r.subGrade === 'S' && r.eliteChance > 0.05, r);
    check('ENDLESS.lo_levantado_entra_en_los_resultados', r.inResults === 1, r);
  }

  // ---------- 5) Mística: re-tirar UN afijo por oro ----------
  {
    const r = await E(() => {
      save.stash = []; save.gold = 100000;
      const it = __item('arma', 'raro', [{id:'afx_dmg', v:0.08}, {id:'afx_atk', v:0.05}]); it.affixName = true; it.baseName = it.name;
      const c0 = affixRerollCost(it), g0 = save.gold;
      const s1 = affixRerollStart(it.uid, 0, ()=>0.3);
      const paid = g0 - save.gold, c1 = affixRerollCost(it);
      const optIds = s1.opts.map(o=>o.id);
      affixRerollChoose(it.uid, 0);
      const changed = it.affixes[0].id === optIds[0] && it.affixes[1].id === 'afx_atk';
      const other = affixRerollStart(it.uid, 1); // atado al afijo 0
      const s2 = affixRerollStart(it.uid, 0); const before = JSON.stringify(it.affixes[0]); affixRerollChoose(it.uid, -1); const kept = JSON.stringify(it.affixes[0]) === before;
      // legendario con nombre: la re-tirada no cambia su identidad; un Único nunca sale de acá
      const leg = makeDesignedItem('tanque_leg'); rollItemAffixes(leg); stashItems().push(leg);
      const id0 = leg.designId, r0 = leg.rarity, n0 = leg.name;
      for (let i = 0; i < 12; i++){ const s = affixRerollStart(leg.uid, 0); if (s.ok) affixRerollChoose(leg.uid, 0); }
      const poor = (()=>{ save.gold = 0; return affixRerollStart(it.uid, 0); })();
      return { c0, paid, c1, changed, noDupEffect: new Set(it.affixes.map(a=>AFFIX_DB[a.id].effect)).size === it.affixes.length, other: other.ok, kept, s2: s2.ok,
        leg: { same: leg.designId === id0 && leg.rarity === r0 && leg.name === n0, rerolls: leg.rerolls }, poor: poor.ok, name: it.name, uniq: stashItems().some(i=>i.rarity==='unico') };
    });
    check('MISTICA.cobra_oro_y_el_costo_crece', r.paid === r.c0 && r.c1 > r.c0, r);
    check('MISTICA.cambia_solo_ese_afijo_sin_repetir_efecto', r.changed && r.noDupEffect, r);
    check('MISTICA.queda_atada_a_ese_afijo', r.other === false && r.s2 === true, r);
    check('MISTICA.se_puede_conservar_el_original', r.kept, r);
    check('MISTICA.no_cambia_la_identidad_ni_crea_unicos', r.leg.same && r.leg.rerolls >= 5 && !r.uniq, r.leg);
    check('MISTICA.sin_oro_no_se_puede', r.poor === false, r);
    // desde la ficha del objeto: botón, confirmación y elección (UI real)
    const ui = await E(async () => { setState('menu'); save.gold = 100000; save.stash = []; const it = makeItem('casco', 'raro'); stashItems().push(it);
      openItemPreview(it.uid, 'guerrero'); const btn = document.querySelector('#item-preview [data-afx-reroll]'); if (!btn) return { btn:false };
      window.__autoConfirm = true; btn.click(); await new Promise(r=>setTimeout(r, 300));
      const gd = document.querySelector('#game-dialog .gd-ok'); if (gd) gd.click(); await new Promise(r=>setTimeout(r, 300));
      const opts = document.querySelectorAll('#affix-reroll [data-afx-choose]').length; const g = save.gold;
      const pickNew = document.querySelector('#affix-reroll [data-afx-choose="0"]'); if (pickNew) pickNew.click(); await new Promise(r=>setTimeout(r, 200));
      return { btn:true, opts, paid: 100000 - g, rerolls: it.rerolls, hidden: document.getElementById('affix-reroll').classList.contains('hidden') }; });
    check('MISTICA.ui_desde_la_ficha', ui.btn && ui.opts >= 2 && ui.paid > 0 && ui.rerolls === 1 && ui.hidden, ui);
  }

  // ---------- 6) élites con nombre ----------
  {
    const r = await E(() => {
      __start('bosque', 6, 'guerrero'); for (const h of heroes) if (h !== player) h.alive = false;
      const e = spawnEnemy('ent', false); const hp0 = e.maxHp; eliteMaybeName(e, ['blindado', 'vampirico', 'fuego']);
      e.x = player.x + 60; e.y = player.y;
      const out = { name: e.eliteName, mods: e.eliteMods, hpUp: e.maxHp > hp0 };
      // blindado: recibe menos daño
      const plain = spawnEnemy('ent', false); plain.x = player.x + 400; plain.hp = plain.maxHp = 1e6; e.hp = e.maxHp = 1e6;
      window.__origRandom = Math.random; Math.random = ()=>0.99;
      damageEnemy(plain, 100, {src:player}); damageEnemy(e, 100, {src:player});
      Math.random = window.__origRandom;
      out.armor = { plain: 1e6 - plain.hp, elite: 1e6 - e.hp };
      // vampírico + encantado de fuego: al pegarle a un guardián se cura y lo quema
      e.hp = e.maxHp * 0.5; const hpE = e.hp; player.burnTimer = 0; damageHero(player, 50, e);
      out.vamp = e.hp > hpE; out.burn = player.burnTimer > 0;
      // espejo: se desdobla al bajar de la mitad (el reflejo no suelta botín)
      const m = spawnEnemy('ent', false); eliteMaybeName(m, ['espejo']); m.x = player.x + 300; m.hp = m.maxHp * 0.4; const n0 = enemies.length; eliteTick(m, 16);
      const copy = enemies[enemies.length-1]; out.mirror = enemies.length === n0 + 1 && copy._eliteMirror && copy.noLoot && !copy.eliteName;
      // aura de escarcha: ralentiza a quien está cerca
      const f = spawnEnemy('ent', false); eliteMaybeName(f, ['escarcha']); f.x = player.x + 50; f.y = player.y; player.slowAmt = 0; eliteTick(f, 16); out.frost = player.slowAmt > 0;
      // mejor botín: la élite con nombre usa la fila "named"
      out.src = _glSource(f); out.srcPlain = _glSource(plain);
      return out;
    });
    check('ELITE.nombre_generado_y_modificadores', /^\S+,? (el|la)? ?.+/.test(r.name) && r.mods.length === 3 && r.hpUp, r);
    check('ELITE.blindado_recibe_menos', r.armor.elite < r.armor.plain * 0.8, r.armor);
    check('ELITE.vampirico_y_encantado_de_fuego', r.vamp && r.burn, r);
    check('ELITE.espejo_se_desdobla_sin_botin', r.mirror, r);
    check('ELITE.aura_de_escarcha_ralentiza', r.frost, r);
    check('ELITE.mejor_botin', r.src.rk === 'named' && r.src.chance > r.srcPlain.chance && r.src.grade >= 'A', { src: r.src, plain: r.srcPlain });
    const kill = await E(() => { Math.random = window.__origRandom || Math.random; groundLoot.length = 0; GROUND_LOOT_CFG.chance.named = 1;
      const e = spawnEnemy('ent', false); eliteMaybeName(e, ['rapido']); e.x = player.x+80; e.y = player.y; e.lastHitBy = player; killEnemy(e); return groundLoot.length; });
    check('ELITE.al_morir_suelta_objeto', kill >= 1, kill);
  }

  // ---------- 7) capturas en el teléfono apaisado ----------
  if (process.env.SHOTS) {
    await E(() => { const ip = document.getElementById('item-preview'); if (ip) { ip.classList.add('hidden'); ip.innerHTML = ''; }
      const lt = document.getElementById('loot-toasts'); if (lt) lt.innerHTML = '';
      groundLoot.length = 0; save.stash = []; __start('infernal', 4, 'mago'); for (const h of heroes) if (h !== player) { h.x = player.x - 200; h.y = player.y + 120; }
      document.querySelectorAll('#center-banner,#tut-box,.tut-box,#tut-panel,#qs-toasts').forEach(x=>x.style.display='none');
      const tiers = ['comun','raro','muyraro','legendario','set'];
      const specs = { comun:{tier:'comun'}, raro:{tier:'raro'}, muyraro:{tier:'muyraro'}, legendario:{tier:'legendario'}, set:{tier:'set', designId: Object.keys(DESIGNED_ITEMS).find(k=>DESIGNED_ITEMS[k].set)} };
      tiers.forEach((t, i) => { const it = materializeLoot(specs[t], 'mago', 'infernal'); groundLoot.push({item:it, tier:itemTier(it), x:player.x - 260 + i*130, y:player.y + 90 + (i%2)*40, t0:animNow - 5000, id:i+1}); });
      const e = spawnEnemy('demonio_mago', false); eliteMaybeName(e, ['fuego','escarcha']); e.x = player.x + 170; e.y = player.y - 90; e.stunTimer = 1e9;
      player.x += 10; render(); });
    await sleep(600); await E(() => render());
    await page.screenshot({ path: SHOT_DIR + '/u1_ground_loot_844x390.png' });
    await E(() => { const g = groundLoot.find(x=>x.tier==='legendario') || groundLoot[0]; player.x = g.x; player.y = g.y; __step(32); render(); });
    await sleep(300);
    await page.screenshot({ path: SHOT_DIR + '/u1_pickup_toast_844x390.png' });
    await E(() => { save.stash = []; save.gold = 5000; const a = makeItem('guantes','raro'); stashItems().push(a); equipItem('mago', a.uid); const b = makeItem('guantes','muyraro'); stashItems().push(b); setState('menu'); openItemPreview(b.uid, 'mago'); });
    await sleep(500);
    await page.screenshot({ path: SHOT_DIR + '/u1_item_affixes_844x390.png' });
    console.log('capturas en ' + SHOT_DIR);
  }

  check('SIN_ERRORES', errors.length === 0, errors.slice(0, 4));
  await browser.close();
  console.log('SUMMARY ' + (fails ? 'FAIL' : 'OK') + ' fails=' + fails);
  process.exit(fails ? 1 : 0);
})();
