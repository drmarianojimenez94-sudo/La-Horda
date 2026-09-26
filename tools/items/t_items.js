// Pruebas del sistema de objetos (inventario de la cuenta, botín cruzado, recetas, poderes de
// legendarios, míticos y únicos). Corre el juego real en Chromium.
//   (python3 -m http.server 8771 &) ; node tools/items/t_items.js
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const BASE = process.env.SE_BASE_URL || 'http://127.0.0.1:8771';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 400) : '')); if (!ok) fails++; };
async function boot(browser, initSave){
  const page = await (await browser.newContext({ viewport: { width: 900, height: 506 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_CERT|fonts\.g|net::|404/.test(m.text())) errors.push('console: ' + m.text().slice(0, 300)); });
  await page.addInitScript((s) => { window.__campaignMode = true; if (s) localStorage.setItem('laHordaSave_v1', JSON.stringify(s)); }, initSave || null);
  await page.goto(`${BASE}/index.html`, { waitUntil: 'load' });
  for (let k = 0; k < 300; k++) { if (await page.evaluate(() => !document.getElementById('title-continue-btn').disabled)) break; await sleep(100); }
  await page.evaluate(() => { loop = function(){};
    window.__start = (arena, lv, champ) => { for (const k of Object.keys(save.champions)) save.champions[k].unlocked = true;
      selectedClass = champ || 'guerrero'; currentArena = arena; lobbyAllies = ['tanque','mago','soporte']; startRun(lv || 1); spawnTimer = 1e12; enemies.length = 0; levelDuration = 9e9; };
    window.__equip = (id, champ) => { const it = makeDesignedItem(id); stashItems().push(it); equipItem(champ || player.classKey, it.uid); invalidatePassiveCache(); return it; };
    window.__foe = (type, dx, dy) => { const e = spawnEnemy(type || 'zombie', false); e.x = player.x + (dx||40); e.y = player.y + (dy||0); e.hp = e.maxHp = 5000; return e; };
    window.__step = (ms) => { let t = 0; while (t < ms && state === 'playing') { for (const h of heroes) h.hp = Math.max(h.hp, h.maxHp*0.8); update(16); t += 16; } };
  });
  return { page, errors, E: (fn, a) => page.evaluate(fn, a) };
}
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });

  // ---------- migración de un guardado viejo (inventario por campeón) ----------
  {
    const it = (uid, type, rar, extra) => Object.assign({ uid, type, rarity: rar, name: 'x', icon: '⚔', statKey: type, value: 0.2, passives: [], champion: 'mago' }, extra || {});
    const legacy = { itemSchemaV: 2, testStageV1: true, campaignResetV1: true, campaignResetV2: true, campaignResetV3: true, fortalezaMigrated: true, micelialMigrated: true, starterChosen: true, gold: 500,
      champions: { mago: { level: 5, xp: 0, unlocked: true, inventory: [it('a1','arma','raro'), it('a2','casco','legendario'), it('a3','botas','unico',{placeholder:true})], equipment: { arma:'a1', casco:null, escudo:null, pechera:null, guantes:null, botas:null } },
                   tanque: { level: 3, xp: 0, unlocked: true, inventory: [it('b1','escudo','comun',{champion:'tanque'})], equipment: { arma:'zzz', escudo:'b1', casco:null, pechera:null, guantes:null, botas:null } } } };
    const { E, errors, page } = await boot(browser, legacy);
    const m = await E(() => ({ n: save.stash.length, uids: save.stash.map(i=>i.uid).sort(), generic: save.stash.filter(i=>!i.designed).every(i=>i.champion===null),
      noPlaceholder: !save.stash.some(i=>i.placeholder || i.rarity==='unico'), eqMago: save.champions.mago.equipment.arma, eqTanq: save.champions.tanque.equipment,
      noInv: !('inventory' in save.champions.mago), persisted: JSON.parse(localStorage.getItem(SAVE_KEY)).stashV1 === true }));
    check('STASH.migra_todo_sin_perder_objetos', m.n === 4 && m.uids.join() === 'a1,a2,a3,b1', m);
    check('STASH.genericos_pasan_a_universales', m.generic, m);
    check('STASH.unico_de_prueba_pasa_a_legendario', m.noPlaceholder, m);
    check('STASH.equipo_valido_se_conserva_e_invalido_se_limpia', m.eqMago === 'a1' && m.eqTanq.escudo === 'b1' && m.eqTanq.arma === null, m);
    check('STASH.sin_inventario_por_campeon_y_guardado', m.noInv && m.persisted, m);
    const mv = await E(() => { const r = equipItem('tanque', 'a1'); return { r, mago: save.champions.mago.equipment.arma, tanq: save.champions.tanque.equipment.arma, by: itemEquippedBy('a1') }; });
    check('STASH.equipar_en_otro_campeon_lo_mueve', mv.r && mv.mago === null && mv.tanq === 'a1' && mv.by === 'tanque', mv);
    const cp = await E(() => { const t = makeDesignedItem('tanque_leg'); stashItems().push(t); const r1 = equipItem('mago', t.uid); const r2 = equipItem('tanque', t.uid); return { r1, r2 }; });
    check('STASH.objeto_de_campeon_solo_para_ese_campeon', cp.r1 === false && cp.r2 === true, cp);
    const cap = await E(() => { save.stash = []; for (let i = 0; i < 30; i++) addItemToInventory('mago', makeItem('arma','comun')); const full = stashFull(); const r = addItemToInventory('mago', makeItem('arma','comun'));
      equipItem('mago', save.stash[0].uid); const after = stashFull(); return { full, rejected: r === null, used: stashUsedSlots(), after }; });
    check('STASH.30_espacios_y_lo_equipado_no_ocupa', cap.full && cap.rejected && cap.used === 29 && !cap.after, cap);
    const sell = await E(() => { save.stash = []; save.gold = 0; const c = makeItem('arma','comun'), l = makeItem('arma','legendario'); addItemToInventory(null, c); addItemToInventory(null, l);
      sellItem(null, c.uid); const g1 = save.gold; sellItem(null, l.uid); const u = makeDesignedItem('uniq_yelmo_coloso'); stashItems().push(u); const su = sellItem(null, u.uid);
      return { g1, g2: save.gold, uniqueStays: su === null && stashItems().includes(u), price: (typeof CHAMPION_PRICE_GOLD_FINAL!=='undefined' ? CHAMPION_PRICE_GOLD_FINAL : CHAMPION_PRICE_GOLD) }; });
    check('ECON.basura_casi_no_paga_y_legendario_duele', sell.g1 <= 5 && sell.g2 - sell.g1 >= 200 && sell.g2 < sell.price*0.2, sell);
    check('ECON.unico_no_se_vende', sell.uniqueStays, sell);
    const fu = await E(() => { save.stash = []; const mk = r => { const i = makeItem('casco', r); addItemToInventory(null, i); return i.uid; };
      const a = [mk('comun'), mk('comun'), mk('comun')]; const r1 = fuseItems(null, a); const b = [mk('muyraro'), mk('muyraro'), mk('muyraro')]; const r2 = fuseItems(null, b);
      return { r1: r1.ok && r1.item.rarity, r2: r2.ok }; });
    check('ITEMS.fusion_solo_para_basura', fu.r1 === 'raro' && fu.r2 === false, fu);
    check('STASH.sin_errores', errors.length === 0, errors);
    await page.context().close();
  }
  // ---------- etapa de prueba (BUGFIX 01): un guardado viejo pasa UNA vez por el reinicio ----------
  {
    const old = { itemSchemaV: 3, stashV1: true, campaignResetV1: true, campaignResetV2: true, campaignResetV3: true, fortalezaMigrated: true, micelialMigrated: true, starterChosen: true, gold: 123456,
      arenasCleared: { bosque:true, acuatica:true, fortaleza:false, micelial:false, hielo:false, laberinto:false, infernal:false },
      champions: { mago: { level: 25, xp: 0, unlocked: true, equipment: { arma:null, casco:null, escudo:null, pechera:null, guantes:null, botas:null } } }, stash: [] };
    const { E, errors, page } = await boot(browser, old);
    const r = await E(() => ({ gold: save.gold, lvl: save.champions.mago.level, open: ARENA_ORDER.filter(isArenaUnlocked), flag: save.testStageV1,
      backup: !!localStorage.getItem(SAVE_KEY + '_antesDeEtapaPrueba') }));
    check('TEST.reinicio_unico_de_la_etapa_de_prueba', r.gold === 10000 && r.lvl === 1 && r.open.join() === 'bosque' && r.flag === true, r);
    check('TEST.respaldo_del_guardado_anterior', r.backup, r);
    // volver a cargar el guardado (como al reabrir el juego): el regalo no se repite
    check('TEST.el_regalo_no_se_repite_al_recargar', await E(() => { save.gold = 42; persist(); loadSave(); return save.gold; }) === 42, null);
    check('TEST.sin_errores', errors.length === 0, errors);
    await page.context().close();
  }

  const { E, errors } = await boot(browser, null);
  // ---------- nombres, botín cruzado y recetas ----------
  const nm = await E(() => { const out = []; for (const r of ['comun','raro','muyraro','legendario']) out.push(makeItem('casco', r).name); return out; });
  check('ITEMS.objetos_procedurales_tienen_nombre', nm.every(n => n && !/cualquier|PLACEHOLDER|Común Casco/.test(n)) && /de /.test(nm[3]), nm);
  const lt = await E(() => { const c = { named:0, champ:0, proc:0, other:0, myth:0, uniq:0, total:0 };
    for (let i = 0; i < 600; i++){ const it = materializeLoot({ tier:'legendario' }, 'mago', 'hielo'); c.total++;
      if (NAMED_LEGENDARIES[it.designId]) c.named++; else if (it.designed && it.champion) { c.champ++; if (it.champion !== 'mago') c.other++; } else c.proc++; }
    for (let i = 0; i < 100; i++){ const it = materializeLoot({ tier:'mitico' }, 'mago', 'hielo'); if (it.rarity === 'mitico' && it.designed) c.myth++; }
    for (let i = 0; i < 60; i++){ const it = materializeLoot({ tier:'unico' }, 'mago', 'hielo'); if (it.rarity === 'unico' && it.unique) c.uniq++; }
    const hielo = {}; for (let i = 0; i < 800; i++){ const it = materializeLoot({ tier:'legendario' }, 'mago', 'hielo'); if (NAMED_LEGENDARIES[it.designId]) hielo[it.element] = (hielo[it.element]||0) + 1; }
    return { c, hielo }; });
  check('LOOT.legendarios_mayormente_con_nombre', lt.c.named/lt.c.total > 0.5 && lt.c.proc/lt.c.total < 0.35, lt.c);
  check('LOOT.botin_cruzado_de_otros_campeones', lt.c.other > 0 && lt.c.other < lt.c.champ, lt.c);
  check('LOOT.miticos_y_unicos_siempre_disenados', lt.c.myth === 100 && lt.c.uniq === 60, lt.c);
  check('LOOT.afinidad_por_arena_hielo_da_mas_hielo', (lt.hielo.ice||0) > (lt.hielo.fire||0)*2, lt.hielo);
  const rc = await E(() => { save.stash = []; const ids = MYTHIC_RECIPES.myth_hoja_eclipse; addItemToInventory(null, makeDesignedItem(ids[0])); addItemToInventory(null, makeDesignedItem(ids[1]));
    const p2 = recipeProgress('myth_hoja_eclipse').n; const top = sortedRecipes()[0].mythicId; const fail = craftMythic('myth_hoja_eclipse').ok;
    addItemToInventory(null, makeDesignedItem('leg_tundraverx')); const wrong = craftMythic('myth_hoja_eclipse').ok;
    addItemToInventory(null, makeDesignedItem(ids[2])); equipItem('guerrero', stashItems().find(i=>i.designId===ids[2]).uid);
    const res = craftMythic('myth_hoja_eclipse'); const left = stashItems().filter(i=>ids.includes(i.designId)).length;
    return { p2, top, fail, wrong, ok: res.ok, mythic: res.item && res.item.mythic, left, eqCleared: !Object.values(save.champions.guerrero.equipment).some(u=>u && !findStashItem(u)), coll: collectionHas('myth_hoja_eclipse') }; });
  check('RECIPE.progreso_y_orden_por_cercania', rc.p2 === 2 && rc.top === 'myth_hoja_eclipse', rc);
  check('RECIPE.no_se_fabrica_incompleta_ni_con_otros', rc.fail === false && rc.wrong === false, rc);
  check('RECIPE.fabrica_consume_los_3_especificos', rc.ok && rc.mythic === 'myth_eclipse' && rc.left === 0 && rc.eqCleared && rc.coll, rc);

  // ---------- poderes de legendario ----------
  await E(() => { __start('bosque', 3, 'guerrero'); });
  const procOf = async (legId, fn) => E(([legId, fn]) => { save.stash = []; for (const k in save.champions) save.champions[k].equipment = mkEquipment(); invalidatePassiveCache();
    enemies.length = 0; __equip(legId); return (new Function('return (' + fn + ')()'))(); }, [legId, fn]);
  check('PROC.brasa_viva_quema_con_basicos', await procOf('leg_herrero_caido', `()=>{ const e = __foe(); damageEnemy(e, 5, {src:player, fromBasic:true}); return e.burnTimer > 0; }`));
  check('PROC.filo_sediento_sangra', await procOf('leg_morrah', `()=>{ const e = __foe(); damageEnemy(e, 5, {src:player, fromBasic:true}); return e.bleedTimer > 0; }`));
  check('PROC.descarga_arcana_electrocuta_con_habilidades', await procOf('leg_descarga', `()=>{ let n = 0; for (let i = 0; i < 60; i++){ const e = __foe(); runElapsedMs += 400; damageEnemy(e, 5, {src:player}); if (e.shockedTimer > 0) n++; } return n > 3; }`));
  check('PROC.avivar_las_llamas_mas_danio_a_quemados', await procOf('leg_brasa_viva', `()=>{ const a = __foe(), b = __foe(); b.burnTimer = 2000; return itemDamageMult(player, b, {}) > itemDamageMult(player, a, {}) * 1.2; }`));
  check('PROC.verdugo_remata_bajo_20', await procOf('leg_carnicero', `()=>{ const e = __foe(); e.hp = e.maxHp*0.1; const lo = itemDamageMult(player, e, {}); e.hp = e.maxHp; return lo > 1.5 && itemDamageMult(player, e, {}) === 1; }`));
  check('PROC.frio_que_quiebra_critico_a_ralentizados', await procOf('leg_ventisquero', `()=>{ const e = __foe(); const a = itemCritMultBonus(player, e); e.slowTimer = 1000; return a === 0 && itemCritMultBonus(player, e) >= 0.5; }`));
  check('PROC.paso_del_cazador_velocidad_al_matar', await procOf('leg_relampago_errante', `()=>{ for (let i = 0; i < 3; i++){ const e = __foe(); e.hp = 1; damageEnemy(e, 50, {src:player}); } return player._hasteStacks === 3 && itemSpeedMult(player) > 1.08; }`));
  check('PROC.represalia_devuelve_y_aturde', await procOf('leg_juramento_roto', `()=>{ const e = __foe('zombie', 30, 0); const hp0 = e.hp; damageHero(player, 40, e); return e.hp < hp0 && e.stunTimer > 0; }`));
  check('PROC.aliento_glacial_ralentiza_cerca', await procOf('leg_glaciar_manto', `()=>{ const e = __foe('zombie', 60, 0); player._frostAuraT = 0; updateItemProcTimers(player, 16); return e.slowAmt > 0.1; }`));
  check('PROC.gracia_veloz_al_curar', await procOf('leg_alba_sandalias', `()=>{ const a = heroes.find(h=>h!==player); a.hp = a.maxHp*0.5; trackHeal(player, a, 40); return player._healHasteT > 0 && a._healHasteT > 0; }`));
  const ward = await E(() => { save.stash = []; for (const k in save.champions) save.champions[k].equipment = mkEquipment(); const ally = heroes.find(h=>h!==player); __equip('leg_centinela', ally.classKey); ally.x = player.x + 50; ally.y = player.y;
    const near = itemDmgTakenMult(player); ally.x = player.x + 900; const far = itemDmgTakenMult(player); return { near, far }; });
  check('PROC.guardia_juramentada_protege_aliados_cerca', ward.near < 0.95 && ward.far === 1, ward);

  // ---------- poderes míticos ----------
  const myth = async (mythId, champ, fn) => E(([mythId, champ, fn]) => { __start('bosque', 3, champ); save.stash = []; for (const k in save.champions) save.champions[k].equipment = mkEquipment();
    invalidatePassiveCache(); __equip(mythId); invalidatePassiveCache(); return (new Function('return (' + fn + ')()'))(); }, [mythId, champ, fn]);
  const w = await myth('myth_corona_invierno', 'mago', `()=>{ const e = __foe(); e.slowTimer = 2000; for (let i = 0; i < 3; i++){ runElapsedMs += 300; damageEnemy(e, 5, {src:player}); }
    const frozen = e.frozenTimer > 0; const o = __foe('zombie', 70, 0); e.hp = 1; runElapsedMs += 500; damageEnemy(e, 50, {src:player}); return { frozen, shard: o.hp < o.maxHp && o.slowTimer > 0 }; }`);
  check('MYTH.invierno_congela_al_3er_golpe_y_estalla', w.frozen && w.shard, w);
  const inf = await myth('myth_corazon_averno', 'mago', `()=>{ const a = __foe('zombie', 40, 0), b = __foe('zombie', 90, 0), c = __foe('zombie', 140, 0); a.burnTimer = 5000; a.burnDmg = 1; player._infernoT = 0;
    for (let i = 0; i < 3; i++){ player._infernoT = 0; updateMythicPowers(player, 16); } const spread = [b,c].filter(o=>o.burnTimer>0).length; a.hp = 1; b.hp = b.maxHp; runElapsedMs += 500; damageEnemy(a, 50, {src:player}); return { spread, boom: b.hp < b.maxHp }; }`);
  check('MYTH.combustion_contagia_y_explota', inf.spread >= 1 && inf.boom, inf);
  const st = await myth('myth_martillo_tormenta', 'mago', `()=>{ for (let i = 0; i < 3; i++) mythicOnCast(player, player.cls.skills[0], false); const on = player._stormT > 0; const e = __foe('zombie', 80, 0); __step(1200); return { on, hit: e.hp < e.maxHp }; }`);
  check('MYTH.tormenta_cada_3_habilidades', st.on && st.hit, st);
  const ba = await myth('myth_egida_bastion', 'tanque', `()=>{ player.def = 0; const big = __foe('golem', 300, 0); damageHero(player, player.maxHp*0.2, big); const stored = player._bastionStore; const e = __foe('zombie', 60, 0); mythicOnCast(player, player.cls.skills[2], false);
    const ally = heroes.find(h=>h!==player); ally.x = player.x + 60; ally.y = player.y; return { stored: stored > 1, released: e.hp < e.maxHp && player._bastionStore === 0, allyDR: itemDmgTakenMult(ally) < 0.95 }; }`);
  check('MYTH.bastion_acumula_libera_y_protege', ba.stored && ba.released && ba.allyDR, ba);
  const hv = await myth('myth_guadana_roja', 'guerrero', `()=>{ const e = __foe(); damageEnemy(e, 5, {src:player, fromBasic:true}); const bleed = e.bleedTimer > 0; const n1 = __foe('zombie', 70, 0), n2 = __foe('zombie', 90, 10);
    player.hp = player.maxHp*0.5; const hp0 = player.hp; e.hp = 1; damageEnemy(e, 50, {src:player}); return { bleed, heal: player.hp > hp0, spread: [n1,n2].filter(o=>o.bleedTimer>0).length }; }`);
  check('MYTH.cosecha_sangra_cura_y_contagia', hv.bleed && hv.heal && hv.spread >= 1, hv);
  const dw = await myth('myth_baculo_alba', 'soporte', `()=>{ const a = heroes.find(h=>h!==player); a.hp = a.maxHp*0.5; trackHeal(player, a, 40); const n = mythGrounds.length; const e = __foe('zombie', 0, 0); e.x = mythGrounds[0].x; e.y = mythGrounds[0].y; updateMythicGrounds(16); return { n, burn: e.hp < e.maxHp }; }`);
  check('MYTH.alba_deja_suelo_consagrado', dw.n === 1 && dw.burn, dw);
  const ec = await myth('myth_grimorio_vacio', 'mago', `()=>{ let echoes = 0; const orig = Math.random; for (let i = 0; i < 40; i++){ const n0 = runTimers.length; mythicOnCast(player, player.cls.skills[2], false); if (runTimers.length > n0) echoes++; } return echoes; }`);
  check('MYTH.eco_repite_alrededor_de_25', ec >= 3 && ec <= 20, ec);
  const ecl = await myth('myth_hoja_eclipse', 'guerrero', `()=>{ const e = __foe(); damageEnemy(e, 5, {src:player, forceCrit:true}); const marked = e._eclipseBy === player; e.hp = e.maxHp*0.2; damageEnemy(e, 1, {src:player, critChanceOverride:0}); const boss = __foe('zombie'); boss.rank = 'jefe'; return { marked, executed: !e.alive, bossCrit: itemCritMultBonus(player, boss) >= 0.25 }; }`);
  check('MYTH.eclipse_marca_y_ejecuta', ecl.marked && ecl.executed && ecl.bossCrit, ecl);

  // ---------- únicos ----------
  const u1 = await myth('uniq_corona_archimago', 'mago', `()=>{ const e = __foe(); damageEnemy(e, 5, {src:player, burn:true}); return { burn: e.burnTimer >= 5000, chain: uniqueChainBonus(player), key: heroUniqueKey(player) }; }`);
  check('UNIQ.archimago_fuego_doble_y_cadena_larga', u1.burn && u1.chain === 3 && u1.key === 'uniq_archimago', u1);
  const u2 = await myth('uniq_yelmo_coloso', 'tanque', `()=>{ const e = __foe('zombie', 120, 0); player.fx = 1; player.fy = 0; player.aim = null; castAbility(player, player.cls.skills[1], false, 1); const n = uniqueFissures.length; return { scale: uniqueScaleMult(player), n }; }`);
  check('UNIQ.coloso_mas_grande_y_grieta', u2.scale > 1.1 && u2.n === 1, u2);
  const u3 = await myth('uniq_arco_lunaroja', 'cazadora', `()=>{ const e = __foe('zombie', 100, 0); damageEnemy(e, 5, {src:player, fromBasic:true}); return { bleed: e.bleedTimer > 0 }; }`);
  check('UNIQ.luna_roja_flechas_de_sangre', u3.bleed, u3);
  const wrong = await myth('uniq_corona_archimago', 'tanque', `()=>heroUniqueKey(player)`);
  check('UNIQ.solo_funciona_en_su_campeon', wrong === null, wrong);
  // ---------- sets de campeón ----------
  const cs = async (setId, champ, fn) => E(([setId, champ, fn]) => { __start('bosque', 3, champ); save.stash = []; for (const k in save.champions) save.champions[k].equipment = mkEquipment();
    for (const pid of setPieceIds(setId)) __equip(pid, champ); invalidatePassiveCache(); resetSetRunState(player); return (new Function('return (' + fn + ')()'))(); }, [setId, champ, fn]);
  const lock = await E(() => { const it = makeDesignedItem('baluarte_casco'); return { tank: canEquipItem('tanque', it), mago: canEquipItem('mago', it), n: Object.keys(CHAMPION_SETS).length }; });
  check('CSET.piezas_solo_para_su_campeon', lock.tank && !lock.mago && lock.n === 12, lock);
  check('CSET.baluarte_pisoton_cada_3_basicos', await cs('baluarte', 'tanque', `()=>{ const e = __foe(); const o = __foe('zombie', 90, 30); for (let i = 0; i < 3; i++){ runElapsedMs += 700; damageEnemy(e, 5, {src:player, fromBasic:true}); } return o.stunTimer > 0 && o.hp < o.maxHp; }`));
  check('CSET.nocturno_critico_a_sangrantes_y_sombra', await cs('nocturno', 'guerrero', `()=>{ const e = __foe(); e.bleedTimer = 2000; const c = champSetCritBonus(player, e, {}); const el = __foe('golem'); el.rank = 'elite'; el.hp = 1; player.cds[1] = 5000; damageEnemy(el, 50, {src:player}); return c && c.chance === 1 && player.stealthTimer > 0 && player.cds[1] === 0; }`));
  check('CSET.convergencia_fuego_hielo_rayo_estalla', await cs('convergencia', 'mago', `()=>{ const e = __foe(); const o = __foe('zombie', 80, 0); damageEnemy(e, 5, {src:player, burn:true}); damageEnemy(e, 5, {src:player, slow:0.5}); damageEnemy(e, 5, {src:player, chain:true}); return e.frozenTimer > 0 && o.hp < o.maxHp; }`));
  check('CSET.custodio_angel_guardian', await cs('custodio', 'soporte', `()=>{ const a = heroes.find(h=>h!==player); a.x = player.x + 100; a.y = player.y; a.def = 0; a.shield = 0; a.itemShield = 0; a.hp = a.maxHp*0.35; damageHero(a, a.maxHp*0.1, null); return a.shield > 0; }`));
  check('CSET.marea_furia_sangrado_y_tajo', await cs('marea', 'segador', `()=>{ const fm = setFuryMult(player); player.energy = player.maxEnergy; const e = __foe(); damageEnemy(e, 5, {src:player, fromBasic:true}); const bl = e.bleedTimer > 0;
    player.hp = player.maxHp*0.3; for (let i = 0; i < 10; i++){ player.hp = player.maxHp*0.3; const k = __foe(); k.hp = 1; damageEnemy(k, 50, {src:player}); } const t = player._tide; player.fx = 1; player.fy = 0; const v = __foe('zombie', 120, 0); v.hp = v.maxHp*0.2; champSetsOnCast(player, player.cls.skills[0], false);
    return { fm, bl, t, exec: !v.alive, after: player._tide }; }`).then(r => { if (!(r.fm === 1.2 && r.bl && r.t === 10 && r.exec && r.after < 10)) console.log('marea', JSON.stringify(r)); return r.fm === 1.2 && r.bl && r.t === 10 && r.exec && r.after < 10; }));
  check('CSET.acceso_raiz_glitch_y_recursion', await cs('sistema', 'axiom', `()=>{ const n0 = runTimers.length; champSetsOnCast(player, player.cls.skills[2], false); const g = runTimers.length > n0; const e = __foe(); e._overwriteBy = player; const o = __foe('zombie', 90, 0); player.cds[0] = 5000; e.hp = 1; damageEnemy(e, 50, {src:player}); return g && o._overwriteBy === player && player.cds[0] <= 4000; }`));
  check('CSET.profecia_salva_de_un_golpe_letal', await cs('profecia', 'profeta', `()=>{ const a = heroes.find(h=>h!==player); a.x = player.x + 80; a.y = player.y; a.def = 0; a.shield = 0; a.itemShield = 0; a.hp = 5; damageHero(a, 500, null); const saved = a.alive && a.hp >= 1; a.hp = 5; a.invulnTimer = 0; damageHero(a, 500, null); return {saved, alive:a.alive, hp:a.hp, cls:a.classKey}; }`).then(r => { if (!(r.saved && !r.alive)) console.log('prof', JSON.stringify(r)); return r.saved && !r.alive; }));
  check('CSET.errante_iaijutsu_tras_pausa', await cs('errante', 'musashi', `()=>{ runElapsedMs += 2000; const a = champSetIaijutsu(player); runElapsedMs += 300; const b = champSetIaijutsu(player); player.cds[0] = 3000; champSetOnPerfectStep(player); return a && !b && player.cds[0] === 0; }`));
  check('CSET.manada_trampa_marca_y_lobo', await cs('manada', 'cazadora', `()=>{ const e = __foe(); champSetOnTrapRoot(player, e); const marked = player.huntTarget === e; sylvaAddTrack(player, e, 5); return marked && !!player.wolf; }`));
  check('CSET.granadero_aturde_y_recarga', await cs('granadero', 'libertador', `()=>{ const e = __foe(); damageEnemy(e, 5, {src:player, fromBasic:true}); const st = e.stunTimer > 0; const k = __foe(); k.hp = 1; player.basicCd = 1400; damageEnemy(k, 50, {src:player, fromBasic:true}); return st && player.basicCd <= 60; }`));
  check('CSET.legion_furia_y_titan_mas_largo', await cs('legion', 'eren', `()=>setFuryMult(player) === 1.15 && champSetTitanDurMult(player) === 1.3`));
  check('ITEMS.sin_errores', errors.length === 0, errors);
  console.log(`SUMMARY ${fails === 0 ? 'OK' : 'FAIL'} fails=${fails}`);
  await browser.close();
  process.exit(fails ? 1 : 0);
})();
