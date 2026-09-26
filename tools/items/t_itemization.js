// Pruebas de la itemización maestra: identidad fija por pieza, roll de stats, nivel con Gemas,
// duplicados, familias por arena, pasivas reparadas, auras de set, íconos y vista previa.
// Regla que se valida: "si el objeto dice que hace algo, tiene que hacerlo" (sin equipar vs equipado).
//   (python3 -m http.server 8771 &) ; node tools/items/t_itemization.js
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const BASE = process.env.SE_BASE_URL || 'http://127.0.0.1:8771';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 400) : '')); if (!ok) fails++; };
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: 900, height: 506 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_CERT|fonts\.g|net::|404/.test(m.text())) errors.push('console: ' + m.text().slice(0, 300)); });
  await page.addInitScript(() => { window.__campaignMode = true; });
  await page.goto(`${BASE}/index.html`, { waitUntil: 'load' });
  for (let k = 0; k < 300; k++) { if (await page.evaluate(() => !document.getElementById('title-continue-btn').disabled)) break; await sleep(100); }
  const E = (fn, a) => page.evaluate(fn, a);
  await E(() => { loop = function(){};
    window.__start = (arena, lv, champ) => { for (const k of Object.keys(save.champions)) save.champions[k].unlocked = true;
      selectedClass = champ || 'guerrero'; currentArena = arena; lobbyAllies = ['tanque','mago','soporte']; startRun(lv || 1); spawnTimer = 1e12; enemies.length = 0; levelDuration = 9e9; };
    window.__clear = () => { save.stash = []; for (const k in save.champions) save.champions[k].equipment = mkEquipment(); invalidatePassiveCache(); };
    window.__put = (it, champ) => { stashItems().push(it); equipItem(champ || player.classKey, it.uid); invalidatePassiveCache(); return it; };
    window.__foe = (type, dx, dy) => { const e = spawnEnemy(type || 'zombie', false); e.x = player.x + (dx||40); e.y = player.y + (dy||0); e.hp = e.maxHp = 5000; return e; };
  });

  // ---------- identidad fija + RNG solo en stats ----------
  const id = await E(() => {
    let bad = 0, n = 0, rollOut = 0; const nouns = new Set();
    for (const type of EQUIP_SLOT_TYPES) for (const r of ['raro','muyraro','legendario','mitico']) for (let i = 0; i < 40; i++) {
      const it = makeItem(type, r, null, { arena: 'hielo' }); n++; nouns.add(type + ':' + it.noun);
      if (it.passives[0].id !== ITEM_ARCHETYPE_PASSIVE[type][it.noun]) bad++;
      if (it.roll < ITEM_ROLL_RANGE[0] - 1e-9 || it.roll > ITEM_ROLL_RANGE[1] + 1e-9) rollOut++;
    }
    const c = makeItem('arma', 'comun');
    return { n, bad, rollOut, nouns: nouns.size, comunNoPassive: c.passives.length === 0, lvl: c.level };
  });
  check('ID.pasiva_fija_por_arquetipo', id.bad === 0 && id.nouns >= 20, id);
  check('ID.stats_varian_dentro_del_rango', id.rollOut === 0, id);
  check('ID.comun_solo_numeros_nivel_1', id.comunNoPassive && id.lvl === 1, id);
  const fam = await E(() => {
    const cnt = {}; let procOk = 0, famPas = 0, N = 300;
    for (let i = 0; i < N; i++) { const it = makeItem('arma', 'legendario', null, { arena: 'hielo' }); cnt[it.family] = (cnt[it.family]||0) + 1;
      if (ITEM_FAMILIES[it.family].procs[it.legendProc]) procOk++; if (it.passives.some(p => p.id === ITEM_FAMILIES[it.family].passive)) famPas++; }
    const my = makeItem('guantes', 'muyraro', null, { family: 'plaga' });
    return { hielo: cnt.hielo || 0, N, procOk, famPas, myFam: my.family, myHasProc: !!legendProcOf(my), myName: my.name };
  });
  check('FAM.arena_de_hielo_da_familia_hielo', fam.hielo / fam.N > 0.7, fam);
  check('FAM.proc_y_pasiva_de_la_familia', fam.procOk === fam.N && fam.famPas === fam.N, fam);
  check('FAM.muy_raro_tiene_primera_mecanica', fam.myFam === 'plaga' && fam.myHasProc, fam);
  const uq = await E(() => { const it = makeItem('arma', 'unico'); return { rar: it.rarity, unique: !!it.unique }; });
  check('UNIQ.nunca_procedural', uq.rar === 'mitico' && !uq.unique, uq);

  // ---------- duplicados: la pasiva igual no se suma, el stat sí ----------
  await E(() => { __start('bosque', 3, 'guerrero'); });
  const dup = await E(() => { __clear();
    const eff = _passiveById('pas_crit').effect;
    const a = makeItem('arma', 'raro'); a.passives = [instancePassive(_passiveById('pas_crit'))]; a.roll = 1;
    const b = makeItem('casco', 'raro'); b.passives = [instancePassive(_passiveById('pas_crit'))]; b.roll = 1;
    __put(a); const one = passiveSum('guerrero', eff); const st1 = computePlayerStats('guerrero').dmg;
    __put(b); const two = passiveSum('guerrero', eff);
    __clear(); const p1 = makeItem('arma', 'legendario'); p1.legendProc = 'bleed_basic'; const p2 = makeItem('guantes', 'legendario'); p2.legendProc = 'bleed_basic';
    __put(p1); const pr1 = heroProcs('guerrero').bleed_basic; __put(p2); const pr2 = heroProcs('guerrero').bleed_basic;
    return { one, two, pr1, pr2 };
  });
  check('DUP.pasiva_identica_no_se_apila', dup.one > 0 && Math.abs(dup.two - dup.one) < 1e-9, dup);
  check('DUP.proc_identico_no_se_apila', dup.pr1 > 0 && dup.pr1 === dup.pr2, dup);

  // ---------- Gemas: solo suben nivel; nunca fallan, costo creciente ----------
  const gem = await E(() => { __clear(); state = 'prep';
    const it = makeItem('arma', 'legendario'); it.roll = 1; stashItems().push(it); save.gems = 1000;
    const c1 = gemUpgradeCost(it), s1 = itemStat(it), pv1 = itemPassiveValue(it, it.passives[0]);
    const r = upgradeItemLevel(it.uid); const c2 = gemUpgradeCost(it), s2 = itemStat(it), pv2 = itemPassiveValue(it, it.passives[0]);
    for (let i = 0; i < 20; i++) upgradeItemLevel(it.uid);
    const max = it.level, atMax = gemUpgradeCost(it);
    save.gems = 0; const it2 = makeItem('casco', 'comun'); stashItems().push(it2); const poor = upgradeItemLevel(it2.uid);
    save.gems = 99; state = 'playing'; const inRun = upgradeItemLevel(it2.uid); state = 'prep';
    const cm = makeItem('arma', 'comun'); cm.level = 5; const f1 = makeItem('arma', 'comun'), f2 = makeItem('arma', 'comun'); [cm, f1, f2].forEach(x => stashItems().push(x));
    const fu = fuseItems(null, [cm.uid, f1.uid, f2.uid]);
    return { c1, c2, s1, s2, pv1, pv2, ok: r.ok, max, atMax, poor: poor.ok, inRun: inRun.ok, lvKept: fu.ok && fu.item.level, fuRar: fu.ok && fu.item.rarity, base: GEM_UPGRADE_BASE.legendario };
  });
  check('GEM.subir_nivel_sube_stats_y_pasivas_4pct', gem.ok && Math.abs(gem.s2 / gem.s1 - 1.04) < 1e-6 && gem.pv2 > gem.pv1, gem);
  check('GEM.costo_crece_con_el_nivel', gem.c1 === gem.base && gem.c2 > gem.c1, gem);
  check('GEM.tope_nivel_10_sin_perdidas', gem.max === 10 && gem.atMax === null, gem);
  check('GEM.sin_gemas_o_en_partida_no_mejora', !gem.poor && !gem.inRun, gem);
  check('FUSION.conserva_el_nivel', gem.lvKept === 5 && gem.fuRar === 'raro', gem);
  const gw = await E(() => ({ win: runGemReward('infernal', 'S', true, 10), easy: runGemReward('bosque', 'C', true, 10), lose: runGemReward('bosque', 'B', false, 1),
    loseLate: runGemReward('bosque', 'B', false, 10) }));
  check('GEM.se_ganan_jugando_mas_en_arenas_dificiles', gw.win > gw.easy && gw.easy >= 1 && gw.lose === 0 && gw.loseLate === 1, gw);
  const gEnd = await E(() => { __start('bosque', 3, 'guerrero'); save.gems = 0; const r = grantEndOfRunLoot('guerrero', { grade: 'A' }, true); return { gems: r.gems, saved: save.gems }; });
  check('GEM.cofre_final_entrega_gemas', gEnd.gems >= 1 && gEnd.saved === gEnd.gems, gEnd);

  // ---------- pasivas reparadas / nuevas: sin equipar vs equipado ----------
  await E(() => { __start('bosque', 3, 'guerrero'); });
  const spore = await E(() => { __clear(); enemies.length = 0;
    const e0 = __foe(); damageEnemy(e0, 5, { src: player, fromBasic: true }); const before = !!e0.cursed;
    const it = makeItem('arma', 'legendario', null, { family: 'plaga' }); it.legendProc = 'spore_rot'; __put(it);
    const e1 = __foe(); damageEnemy(e1, 5, { src: player, fromBasic: true });
    return { before, after: !!e1.cursed && e1.curseTimer > 0 && e1.curseDmg > 0 };
  });
  check('PROC.esporas_putridas_maldicen_solo_equipado', !spore.before && spore.after, spore);
  const mh = await E(() => { __clear(); enemies.length = 0; const e = __foe();
    player.hp = player.maxHp * 0.3; const m0 = itemDamageMult(player, e, {});
    const it = makeItem('pechera', 'raro'); it.passives = [{ id: 'test_mh', name: 'Furia herida', effect: 'missinghp_dmg_bonus', value: 0.3 }]; __put(it);
    const m1 = itemDamageMult(player, e, {}); player.hp = player.maxHp; const m2 = itemDamageMult(player, e, {});
    return { m0, m1, m2 };
  });
  check('PASS.dano_por_vida_faltante_funciona_fuera_del_segador', mh.m1 > mh.m0 && Math.abs(mh.m2 - mh.m0) < 1e-9, mh);
  const luc = await E(() => { __clear(); enemies.length = 0;
    const e0 = __foe(); damageEnemy(e0, 5, { src: player, fromBasic: true }); const before = e0.burnTimer > 0;
    const ids = setPieceIds('lucifer').slice(0, 4); for (const pid of ids) __put(makeDesignedItem(pid)); resetSetRunState(player);
    const e1 = __foe(); damageEnemy(e1, 5, { src: player, fromBasic: true });
    return { before, after: e1.burnTimer > 0, n: setN(player, 'lucifer') };
  });
  check('SET.lucifer_4_quema_como_dice_el_texto', !luc.before && luc.after && luc.n === 4, luc);
  const aura = await E(() => { __clear(); const ids = setPieceIds('lucifer');
    __put(makeDesignedItem(ids[0])); const a1 = heroMainSet(player);
    __put(makeDesignedItem(ids[1])); const a2 = heroMainSet(player);
    let threw = null; try { drawSetAuras(); } catch (e) { threw = e.message; }
    return { a1, a2, threw, skin: typeof drawSetSkin === 'function' && drawSetSkin(player, 1, 1) === false };
  });
  check('SET.aura_parcial_desde_2_piezas_sin_skin', aura.a1 === null && aura.a2 === 'lucifer' && !aura.threw && aura.skin, aura);

  // ---------- visual: íconos distintos + vista previa completa ----------
  const ic = await E(() => {
    const ids = Object.keys(DESIGNED_ITEMS); const urls = new Set(); let gen = 0;
    for (const k of ids) { const u = itemIconURL(makeDesignedItem(k)); if (u && u.startsWith('data:image/png')) gen++; urls.add(u); }
    const pr = new Set(); for (const t of EQUIP_SLOT_TYPES) for (const n of ITEM_NOUNS[t]) { const it = makeItem(t, 'raro'); it.noun = n; it.name = n; pr.add(itemIconURL(it)); }
    return { n: ids.length, gen, unique: urls.size, proc: pr.size };
  });
  check('ICON.todos_los_objetos_diseñados_tienen_icono', ic.gen === ic.n, ic);
  check('ICON.identidad_visual_distinta', ic.unique >= ic.n * 0.95 && ic.proc >= 20, ic);
  const pv = await E(() => { __clear(); state = 'prep';
    const pid = setPieceIds('lucifer')[0]; const it = makeDesignedItem(pid); stashItems().push(it);
    openItemPreview(it.uid, 'guerrero', () => {}); const el = document.getElementById('item-preview'); const t = el.innerText;
    const secs = ['ESTADÍSTICAS', 'EFECTO', 'SET', 'MEJORAR'].filter(s => t.includes(s));
    const r = { secs, img: !!el.querySelector('img.item-icon-img'), lvl: /Nv\. 1\/10/.test(t), pieces: el.querySelectorAll('.ip-piece').length, equipBtn: !!el.querySelector('[data-ip-equip]') };
    el.querySelector('[data-ip-equip]').click(); r.equipped = itemEquippedBy(it.uid) === 'guerrero';
    el.querySelector('[data-ip-close]').click(); r.closed = el.classList.contains('hidden');
    const lg = makeItem('arma', 'legendario'); stashItems().push(lg); openItemPreview(lg.uid, 'guerrero'); r.legEffect = document.querySelectorAll('#item-preview .ip-line.item-proc').length === 1;
    document.querySelector('#item-preview [data-ip-close]').click();
    return r;
  });
  check('UI.vista_previa_con_arte_stats_efecto_set_mejora', pv.secs.length === 4 && pv.img && pv.lvl && pv.pieces === 6, pv);
  check('UI.vista_previa_equipa_y_cierra', pv.equipBtn && pv.equipped && pv.closed, pv);
  check('UI.legendario_muestra_su_mecanica', pv.legEffect, pv);
  const card = await E(() => { const it = makeItem('botas', 'muyraro'); it.level = 3; const h = itemCardHTML(it, {}); return { img: h.includes('item-icon-img'), lv: h.includes('Nv.3'), stat: h.includes(Math.round(itemStat(it)*100) + '%') }; });
  check('UI.tarjeta_con_icono_nivel_y_stat_real', card.img && card.lv && card.stat, card);
  const txt = await E(() => ({ designed: Object.keys(DESIGNED_ITEMS).filter(k => DESIGNED_ITEMS[k].skillMods && !DESIGNED_EFFECT_TEXT[k] && !DESIGNED_ITEMS[k].set).length }));
  check('TEXT.todo_skillmod_tiene_efecto_escrito', txt.designed === 0, txt);

  check('ITEMIZATION.sin_errores', errors.length === 0, errors);
  console.log(`SUMMARY ${fails === 0 ? 'OK' : 'FAIL'} fails=${fails}`);
  await browser.close();
  process.exit(fails ? 1 : 0);
})();
