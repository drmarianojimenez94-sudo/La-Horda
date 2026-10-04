// Economía del alfa (Q4): nivel de objeto por arena, pisos de rareza, mejora segura en la primera victoria,
// tablas en el orden de la campaña, reciclado que respeta lo pagado, oro/Gemas de retención y la tienda.
// Corre el juego real en Chromium.
//   (python3 -m http.server 8904 &) ; SE_BASE_URL=http://127.0.0.1:8904 node tools/items/t_q4_economia.js
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const BASE = process.env.SE_BASE_URL || 'http://127.0.0.1:8904';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 400) : '')); if (!ok) fails++; };
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_CERT|fonts\.g|net::|404/.test(m.text())) errors.push('console: ' + m.text().slice(0, 300)); });
  await page.addInitScript(() => { window.__campaignMode = true; });
  page.setDefaultTimeout(180000); // con la máquina cargada la carga (~1.800 archivos) pasa los 30 s por defecto
  await page.goto(`${BASE}/index.html?dev=1`, { waitUntil: 'load', timeout: 180000 });
  for (let k = 0; k < 1200; k++) { if (await page.evaluate(() => !document.getElementById('title-continue-btn').disabled)) break; await sleep(100); }
  const E = (fn, a) => page.evaluate(fn, a);
  await E(() => { loop = function(){};
    window.__start = (arena, lv, champ) => { for (const k of Object.keys(save.champions)) save.champions[k].unlocked = true;
      selectedClass = champ || 'guerrero'; currentArena = arena; lobbyAllies = ['tanque','mago','soporte']; startRun(lv || 1); spawnTimer = 1e12; enemies.length = 0; levelDuration = 9e9; };
    window.__foe = (type, dx, dy) => { const e = spawnEnemy(type || 'zombie', false); e.x = player.x + (dx||40); e.y = player.y + (dy||0); e.hp = e.maxHp = 5000; return e; };
    eliteNamedChance = () => 0;
  });

  // ---------- 1) nivel de objeto ----------
  {
    const r = await E(() => {
      const a = makeItem('arma', 'muyraro', null, { noAffixes: true }); a.roll = 1; a.affixes = [{ id: 'afx_dmg', v: 0.10 }];
      const b = JSON.parse(JSON.stringify(a)); b.uid = a.uid + 'b'; b.ilvl = 8;
      const old = JSON.parse(JSON.stringify(a)); delete old.ilvl; old.uid = a.uid + 'o';
      const cheat = JSON.parse(JSON.stringify(a)); cheat.ilvl = 5000;
      const lv = CAMPAIGN_ORDER.map(lootItemLevelFor);
      // lo que cae en la arena 7 nace con nivel de objeto 7 (piso, cofre y cofres de desafío pasan por materializeLoot)
      const drop = materializeLoot({ tier: 'raro' }, 'guerrero', 'laberinto');
      const setDrop = materializeLoot({ tier: 'set', designId: setPieceIds(Object.keys(SET_DB)[0])[0] }, 'guerrero', 'infernal');
      return { s1: itemStat(a), s8: itemStat(b), sOld: itemStat(old), sCheat: itemStat(cheat), af1: affixValue(a, a.affixes[0]), af8: affixValue(b, b.affixes[0]),
        lv, drop: drop.ilvl, setDrop: setDrop.ilvl, gemCostSame: gemUpgradeCost(a) === gemUpgradeCost(b) };
    });
    check('ILVL.sin_campo_vale_como_nivel_1_(objetos_viejos_y_tienda)', Math.abs(r.sOld - r.s1) < 1e-9, r);
    check('ILVL.arena_8_vale_+35%_en_stat_y_afijos', Math.abs(r.s8 / r.s1 - 1.35) < 1e-6 && Math.abs(r.af8 / r.af1 - 1.35) < 1e-6, r);
    check('ILVL.se_recorta_al_tope_(no_se_infla_por_intercambio)', Math.abs(r.sCheat / r.s1 - 1.45) < 1e-6, r);
    check('ILVL.una_por_arena_en_el_orden_de_la_campania', JSON.stringify(r.lv) === JSON.stringify([1,2,3,4,5,6,7,8,9,10]), r.lv);
    check('ILVL.lo_que_cae_trae_el_nivel_de_su_arena_(tambien_sets)', r.drop === 7 && r.setDrop === 10, r);
    check('ILVL.no_cambia_el_costo_en_Gemas', r.gemCostSame, r);
  }
  // ---------- 2) comparación ▲ y ficha: un objeto de arena más alta se ve mejor ----------
  {
    const r = await E(() => {
      save.stash = []; for (const k in save.champions) save.champions[k].equipment = mkEquipment();
      const a = makeItem('arma', 'muyraro', null, { noAffixes: true }); a.roll = 1; a.affixes = []; stashItems().push(a); equipItem('guerrero', a.uid);
      const b = JSON.parse(JSON.stringify(a)); b.uid = 'it_q4_b'; b.ilvl = 9; stashItems().push(b);
      const html = compareItemsHTML('guerrero', b), det = itemDetailHTML(b, 'guerrero'), card = itemCardHTML(b, { classKey: 'guerrero' });
      return { up: /Daño[^<]*▲/.test(html), det: /Arena 9 · \+40%/.test(det), card: /Arena 9/.test(card), oldCard: /Arena/.test(itemCardHTML(a, { classKey: 'guerrero' })) };
    });
    check('UI.comparacion_marca_▲_el_mismo_objeto_de_arena_mas_alta', r.up, r);
    check('UI.ficha_y_tarjeta_muestran_la_arena_del_objeto', r.det && r.card && !r.oldCard, r);
  }
  // ---------- 3) pisos de rareza: élite con nombre, subjefe, jefe y cofre ----------
  {
    const r = await E(() => {
      save.stash = []; __start('ciudad', 5, 'guerrero'); for (const h of heroes) if (h !== player) h.alive = false;
      const R = Math.random; let worstNamed = 9, worstSub = 9, worstBoss = 9, namedN = 0;
      const low = () => Math.min(...groundLoot.map(g => TIER_ORDER[g.tier]));
      for (let i = 0; i < 40; i++) {
        groundLoot.length = 0; const e = __foe('zombie', 200, 0); e.rank = 'elite'; eliteMaybeName(e, true); e.lastHitBy = player;
        Math.random = () => 0.01; // la peor tirada posible para todo lo que no es el piso... salvo la probabilidad de soltar
        try { groundLootOnKill(e); } finally { Math.random = R; }
        if (groundLoot.length) { namedN++; worstNamed = Math.min(worstNamed, Math.max(...groundLoot.map(g => TIER_ORDER[g.tier]))); }
      }
      for (let i = 0; i < 40; i++) { groundLoot.length = 0; const e = __foe('zombie', 200, 0); e.rank = 'subjefe'; groundLootOnKill(e); worstSub = Math.min(worstSub, Math.max(...groundLoot.map(g => TIER_ORDER[g.tier]))); }
      for (let i = 0; i < 40; i++) { groundLoot.length = 0; const e = __foe('zombie', 200, 0); e.rank = 'jefe'; groundLootOnKill(e); worstBoss = Math.min(worstBoss, Math.max(...groundLoot.map(g => TIER_ORDER[g.tier]))); }
      groundLoot.length = 0;
      // el piso NO regala Legendarios: la probabilidad de Legendario o más es la misma con y sin piso
      const w0 = lootTierWeights('ciudad', 'S', {}, false), w1 = lootApplyFloor(Object.assign({}, w0), 'muyraro');
      const sum = w => Object.values(w).reduce((a, b) => a + b, 0), hi = w => w.legendario + w.mitico + w.set + w.unico;
      // cofre de victoria: el primero nunca es Común
      let chestWorst = 9; for (let i = 0; i < 300; i++) { const res = rollLoot({ arena: 'ciudad', grade: 'C', victory: true, subjefes: 0, floor: LOOT_VICTORY_FLOOR }); chestWorst = Math.min(chestWorst, TIER_ORDER[res.items[0].tier]); }
      return { namedN, worstNamed, worstSub, worstBoss, sameHigh: Math.abs(hi(w0) / sum(w0) - hi(w1) / sum(w1)) < 1e-9, chestWorst };
    });
    check('PISO.elite_con_nombre_suelta_al_menos_un_Raro', r.namedN > 0 && r.worstNamed >= 1, r);
    check('PISO.subjefe_al_menos_un_Raro_y_jefe_al_menos_un_Muy_Raro', r.worstSub >= 1 && r.worstBoss >= 2, r);
    check('PISO.no_cambia_la_probabilidad_de_Legendario_o_mas', r.sameHigh, r);
    check('PISO.el_primer_objeto_del_cofre_de_victoria_no_es_Comun', r.chestWorst >= 1, r);
  }
  // ---------- 4) primera victoria: Muy Raro para una ranura vacía, una sola vez; guardados viejos no ----------
  {
    const r = await E(() => {
      const setup = (cleared, wins) => { save.stash = []; for (const k in save.champions) save.champions[k].equipment = mkEquipment(); save.firstWinLoot = undefined;
        save.arenasCleared = cleared; questsState().stats.wins = wins; currentArena = 'ciudad'; runLevel = LEVEL_COUNT; subjefesDefeated = 2; };
      // mago con 4 piezas puestas (arma, casco, pechera, guantes): el regalo va a una ranura libre
      setup({ ciudad: true }, 0);
      for (const t of ['arma', 'casco', 'pechera', 'guantes']) { const it = makeItem(t, 'legendario'); stashItems().push(it); save.champions.mago.equipment[t] = it.uid; }
      const L1 = grantEndOfRunLoot('mago', { grade: 'C' }, true);
      const first = L1.items[0], flag = save.firstWinLoot;
      const L2 = grantEndOfRunLoot('mago', { grade: 'C' }, true); // ya no: la segunda victoria tira como siempre
      // sin nada puesto: el arma
      setup({ ciudad: true }, 0); const L3 = grantEndOfRunLoot('guerrero', { grade: 'C' }, true);
      // guardado que ya había ganado (otra arena superada o victorias contadas): nada
      setup({ ciudad: true, fortaleza: true }, 3); const L4 = grantEndOfRunLoot('guerrero', { grade: 'C' }, true); const oldFlag = save.firstWinLoot;
      // derrota: nada
      setup({}, 0); const L5 = grantEndOfRunLoot('guerrero', { grade: 'C' }, false);
      return { first: [first.rarity, first.type, !!equippedItem('mago', first.type)], flag, second0: L2.items[0] && L2.items[0].rarity, n1: L1.items.length,
        l3: L3.items[0] && [L3.items[0].rarity, L3.items[0].type], oldFlag, defeatFlag: save.firstWinLoot, l5: L5.items.length };
    });
    check('PRIMERA_VICTORIA.Muy_Raro_para_una_ranura_vacia', r.first[0] === 'muyraro' && ['botas', 'escudo'].includes(r.first[1]) && !r.first[2], r);
    check('PRIMERA_VICTORIA.sin_equipo_va_al_arma', r.l3 && r.l3[0] === 'muyraro' && r.l3[1] === 'arma', r);
    check('PRIMERA_VICTORIA.una_sola_vez_y_guardados_viejos_no', r.flag === true && r.oldFlag === 'previa', r);
    check('PRIMERA_VICTORIA.la_derrota_no_la_consume', r.defeatFlag === undefined, r);
  }
  // ---------- 5) tablas en el orden de la campaña ----------
  {
    const r = await E(() => { const L = CAMPAIGN_ORDER.map(a => ARENA_LOOT[a].legendario), G = CAMPAIGN_ORDER.map(a => GEMS_PER_VICTORY[a]);
      const mono = arr => arr.every((v, i) => i === 0 || v >= arr[i - 1]); return { L, G, mL: mono(L), mG: mono(G), strict: L.every((v, i) => i === 0 || v > L[i - 1]) }; });
    check('TABLAS.Legendario_y_Gemas_suben_arena_por_arena', r.mL && r.mG && r.strict, r);
  }
  // ---------- 6) reciclado con inventario lleno: nunca lo pagado ----------
  {
    const r = await E(() => {
      save.stash = []; for (const k in save.champions) save.champions[k].equipment = mkEquipment();
      const bought = makeItem('casco', 'comun'); bought.bought = true; stashItems().push(bought);
      const mist = makeItem('casco', 'comun'); mist.rerolls = 1; stashItems().push(mist);
      while (stashItems().length < INVENTORY_CAPACITY) stashItems().push(makeItem('arma', 'muyraro'));
      const room1 = stashMakeRoomFor(makeItem('botas', 'muyraro')); // nada reciclable: no entra
      const junk = makeItem('casco', 'comun'); stashItems().pop(); stashItems().push(junk);
      const room2 = stashMakeRoomFor(makeItem('botas', 'muyraro'));
      return { room1: room1.ok, room2: room2.ok && room2.recycled && room2.recycled.uid === junk.uid, kept: !!findStashItem(bought.uid) && !!findStashItem(mist.uid) };
    });
    check('RECICLADO.no_recicla_lo_comprado_ni_lo_pasado_por_la_Mistica', r.room1 === false && r.room2 && r.kept, r);
  }
  // ---------- 7) retención: Gemas en el pase y cofre con inventario lleno a precio de venta ----------
  {
    const r = await E(() => {
      const g0 = save.gems || 0; questsGrant({ gems: 3 }, true); const gotGems = (save.gems || 0) - g0;
      const txt = questsRewardText({ gems: 3 });
      const passGems = SEASON_REWARDS.filter(x => x && x.gems).length;
      save.stash = []; while (stashItems().length < INVENTORY_CAPACITY) stashItems().push(makeItem('arma', 'muyraro'));
      const q = questsState(); q.chests.push(1); const gold0 = save.gold; const res = questsOpenChest();
      save.stash = [];
      return { gotGems, txt, passGems, chestGold: res.gold, gold: save.gold - gold0, items: res.items.length };
    });
    check('RETENCION.el_pase_paga_Gemas_y_se_ven', r.gotGems === 3 && /3 Gemas/.test(r.txt) && r.passGems >= 4, r);
    check('RETENCION.cofre_lleno_paga_el_valor_de_venta_no_150', r.items === 0 && r.chestGold > 0 && r.chestGold !== 150 && r.chestGold <= 220, r);
  }
  // ---------- 8) la tienda sigue completa ----------
  {
    const r = await E(() => { const c = shopCatalog(); return { sets: c.filter(e => e.cat === 'set').length, leg: c.filter(e => e.cat === 'legendario').length, base: c.filter(e => e.cat === 'base').length, champs: CHAMPION_CATALOG.filter(x => x.priceGold).length,
      bought: (() => { setState('menu'); save.gold = 1e6; save.stash = []; const e = c.find(x => x.cat === 'set'); const b = shopBuyCatalog(e.key); return b.ok && !b.item.ilvl; })() }; });
    check('TIENDA.sigue_vendiendo_sets_legendarios_basicos_y_guardianes', r.sets > 50 && r.leg >= 20 && r.base > 20 && r.champs >= 10, r);
    check('TIENDA.lo_comprado_nace_con_nivel_de_objeto_1', r.bought, r);
  }
  check('SIN_ERRORES_DE_PAGINA', errors.length === 0, errors.slice(0, 5));
  await browser.close();
  console.log(fails ? `\n${fails} FALLA(S)` : '\nTODO OK');
  process.exit(fails ? 1 : 0);
})();
