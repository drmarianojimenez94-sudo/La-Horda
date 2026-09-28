// LEGENDARIOS QUE CAMBIAN LA BUILD (js/data/legendaries.js BUILD_LEGENDARIES, js/systems/build-powers.js):
// cada uno de los 10 poderes hace algo MEDIBLE en combate con el código real, caen desde la arena 3 de la
// campaña (piso y cofre), no se venden en la tienda ni tienen poder legendario al azar, y se ven en la ficha.
// Además: élites con nombre con tope por partida y una sola placa (elite-affixes.js), el reciclaje con el
// inventario lleno y la XP de victoria medida en niveles (progression.js, victoryXpFor).
//   (python3 -m http.server 8841 &) ; SE_BASE_URL=http://127.0.0.1:8841 node tools/items/t_build_uniques.js
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const BASE = process.env.SE_BASE_URL || 'http://127.0.0.1:8841';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 400) : '')); if (!ok) fails++; };
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: 844, height: 390 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_CERT|fonts\.g|net::|404/.test(m.text())) errors.push('console: ' + m.text().slice(0, 300)); });
  await page.addInitScript(() => { window.__campaignMode = true; });
  await page.goto(`${BASE}/index.html`, { waitUntil: 'load' });
  for (let k = 0; k < 300; k++) { if (await page.evaluate(() => !document.getElementById('title-continue-btn').disabled)) break; await sleep(100); }
  const E = (fn, a) => page.evaluate(fn, a);
  await E(() => { loop = function(){};
    // partida limpia de prueba: sin horda propia, el guardián al nivel 20, sin bots que se metan
    window.__start = (arena, champ) => { for (const k of Object.keys(save.champions)) { save.champions[k].unlocked = true; save.champions[k].level = 20; }
      save.stash = []; for (const k in save.champions) save.champions[k].equipment = { arma:null, escudo:null, casco:null, pechera:null, guantes:null, botas:null };
      selectedClass = champ || 'mago'; currentArena = arena || 'bosque'; lobbyAllies = []; startRun(1); spawnTimer = 1e12; enemies.length = 0; levelDuration = 9e9;
      for (const h of heroes) if (h !== player) h.alive = false; player.hp = player.maxHp; player.energy = player.maxEnergy = 9999; };
    window.__equip = (id) => { const it = makeDesignedItem(id); it.affixes = []; stashItems().push(it); equipItem(player.classKey, it.uid); invalidatePassiveCache(); return it; };
    window.__foe = (dx, dy, hp, type) => { const e = spawnEnemy(type || 'zombie', false); e.x = player.x + (dx||60); e.y = player.y + (dy||0); e.hp = e.maxHp = hp || 1e6; e.stunTimer = 1e9; e.atkCd = 1e9; return e; };
    window.__step = (ms) => { let t = 0; while (t < ms && state === 'playing') { player.hp = Math.max(player.hp, player.maxHp*0.9); update(16); t += 16; } };
  });

  // ---------- 1) datos, ficha, tienda y poder legendario ----------
  {
    const r = await E(() => {
      const ids = Object.keys(BUILD_LEGENDARIES);
      const bad = ids.filter(id => { const d = DESIGNED_ITEMS[id]; return !d || d.rarity !== 'legendario' || !BUILD_POWERS[d.buildPower] || d.champion; });
      const it = makeDesignedItem('bleg_cometa');
      const lines = itemEffectLines(it).map(l => l.cls + ':' + l.txt);
      const shop = shopCatalog().filter(e => e.kind === 'designed' && DESIGNED_ITEMS[e.id].buildPower).length;
      const types = new Set(ids.map(id => DESIGNED_ITEMS[id].type));
      return { n: ids.length, powers: Object.keys(BUILD_POWERS).length, bad, proc: legendProcOf(it), line: lines.find(l => l.startsWith('item-build')), shop, types: types.size,
        allowed: ['ciudad','fortaleza','bosque','micelial','infernal'].map(a => buildLegendAllowed(a)) };
    });
    check('BUILD.10_legendarios_con_poder_propio', r.n >= 8 && r.n <= 12 && r.powers === r.n && r.bad.length === 0, r);
    check('BUILD.sirven_a_cualquier_guardian_y_cubren_las_ranuras', r.types >= 5, r.types);
    check('BUILD.la_ficha_dice_que_cambia_la_build', /CAMBIA TU BUILD — Cometa/.test(r.line || ''), r.line);
    check('BUILD.sin_poder_legendario_al_azar', r.proc === null, r.proc);
    check('BUILD.no_se_venden_en_la_tienda', r.shop === 0, r.shop);
    check('BUILD.desde_la_arena_3_de_la_campania', r.allowed.join() === 'false,false,true,true,true', r.allowed);
  }

  // ---------- 2) cada poder hace algo MEDIBLE ----------
  // Eco Gemelo: la habilidad 1 se lanza dos veces y su enfriamiento dura 40% más
  {
    const r = await E(() => {
      __start('bosque', 'mago'); const f = __foe(90, 0);
      let casts = 0; const oc = castAbility; castAbility = function (h, sk) { if (h === player && sk === player.cls.skills[0]) casts++; return oc.apply(this, arguments); };
      player.cds = [0,0,0]; useSkill(0, null); const cdBase = player.cds[0]; __step(600); const castsBase = casts; casts = 0;
      __equip('bleg_eco_gemelo'); player.cds = [0,0,0]; player._bpTwins = 0;
      useSkill(0, null); const cdTwin = player.cds[0]; __step(700); castAbility = oc;
      return { cdBase: Math.round(cdBase), cdTwin: Math.round(cdTwin), twins: player._bpTwins, castsBase, casts };
    });
    check('POWER.eco_gemelo_repite_la_habilidad_1', r.twins === 1 && r.castsBase === 1 && r.casts === 2, r);
    check('POWER.eco_gemelo_enfriamiento_mas_40', Math.abs(r.cdTwin / r.cdBase - 1.4) < 0.02, r);
  }
  // Cataclismo: el 5.º básico estalla alrededor del objetivo
  {
    const r = await E(() => {
      __start('bosque', 'guerrero'); __equip('bleg_cataclismo');
      const a = __foe(60, 0), b = __foe(110, 30), c = __foe(90, -40), far = __foe(600, 0);
      const hp = [b.hp, c.hp, far.hp]; player._bpNovas = 0;
      for (let i = 0; i < 4; i++) damageEnemy(a, 5, { fromBasic: true, src: player });
      const before = [b.hp === hp[0], c.hp === hp[1]];
      damageEnemy(a, 5, { fromBasic: true, src: player });
      return { novas: player._bpNovas, untouchedBefore: before, hitB: hp[0] - b.hp, hitC: hp[1] - c.hp, hitFar: hp[2] - far.hp };
    });
    check('POWER.cataclismo_nova_en_el_5to_basico', r.novas === 1 && r.untouchedBefore.every(x => x) && r.hitB > 0 && r.hitC > 0 && r.hitFar === 0, r);
  }
  // Rayo Cautivo: el crítico salta a otros enemigos
  {
    const r = await E(() => {
      __start('bosque', 'guerrero');
      const a = __foe(60, 0), b = __foe(160, 0), c = __foe(260, 0);
      damageEnemy(a, 5, { src: player, forceCrit: true }); const noItem = (b.maxHp - b.hp) + (c.maxHp - c.hp);
      __equip('bleg_rayo_cautivo'); runElapsedMs += 1000;
      damageEnemy(a, 5, { src: player, forceCrit: true });
      return { noItem, b: b.maxHp - b.hp, c: c.maxHp - c.hp };
    });
    check('POWER.rayo_cautivo_el_critico_encadena', r.noItem === 0 && r.b > 0 && r.c > 0, r);
  }
  // Cometa: caminar carga; la próxima habilidad explota alrededor tuyo
  {
    const r = await E(() => {
      __start('bosque', 'mago'); __equip('bleg_cometa');
      const f = __foe(80, 0); player._bpComet = 0;
      for (let i = 0; i < 40; i++) { player.x += 25; f.x += 25; updateBuildPowers(player, 16); }
      const charge = Math.round(player._bpComet);
      player.cds = [0,0,0]; const h0 = f.hp; itemProcsOnCast(player, player.cls.skills[1], false);
      return { charge, dmg: Math.round(h0 - f.hp), after: player._bpComet, comets: player._bpComets };
    });
    check('POWER.cometa_caminar_carga', r.charge >= 99, r);
    check('POWER.cometa_la_habilidad_descarga_la_explosion', r.dmg > 0 && r.after === 0 && r.comets === 1, r);
  }
  // Espino Negro: espinas a quien te pega y furia por golpe recibido
  {
    const r = await E(() => {
      __start('bosque', 'tanque'); __equip('bleg_espino');
      const f = __foe(50, 0); const m0 = itemDamageMult(player, f, {});
      damageHero(player, 30, f);
      return { thorns: f.maxHp - f.hp, fury: player._bpFury, mult: itemDamageMult(player, f, {}) / m0 };
    });
    check('POWER.espino_negro_devuelve_espinas', r.thorns > 0, r);
    check('POWER.espino_negro_furia_por_golpe', r.fury === 1 && Math.abs(r.mult - 1.06) < 0.001, r);
  }
  // Último Aliento: sobrevive a un golpe mortal (1 de vida, invulnerable) una vez cada 60 s
  {
    const r = await E(() => {
      __start('bosque', 'guerrero'); __equip('bleg_ultimo_aliento');
      player.shield = 0; // sin fuente: el tope por golpe de la horda no lo achica
      damageHero(player, player.maxHp * 5, null);
      const first = { alive: player.alive, hp: Math.round(player.hp), inv: player.invulnTimer > 0 };
      player.invulnTimer = 0; runElapsedMs += 5000; player.hp = 10; player.shield = 0;
      damageHero(player, player.maxHp * 5, null);
      return { first, secondAlive: player.alive && player.hp > 0 };
    });
    check('POWER.ultimo_aliento_salva_del_golpe_mortal', r.first.alive && r.first.hp === 1 && r.first.inv, r);
    check('POWER.ultimo_aliento_una_vez_cada_60s', r.secondAlive === false, r);
  }
  // Reloj del Condenado: las bajas acortan los enfriamientos
  {
    const r = await E(() => {
      __start('bosque', 'guerrero'); __equip('bleg_reloj');
      player.cds = [5000, 5000, 5000];
      const a = __foe(60, 0, 10); a.lastHitBy = player; killEnemy(a); const afterNormal = player.cds.slice();
      const b = __foe(60, 0, 10, 'zombie'); b.rank = 'elite'; b.lastHitBy = player; killEnemy(b);
      return { afterNormal, afterElite: player.cds.slice() };
    });
    check('POWER.reloj_cada_baja_acorta_enfriamientos', r.afterNormal.every(c => c === 4600) && r.afterElite.every(c => c === 1600), r);
  }
  // Última Palabra: definitiva al doble de carga, habilidades +25% de enfriamiento
  {
    const r = await E(() => {
      __start('bosque', 'guerrero'); const f = __foe(60, 0);
      player.ultCharge = 0; player._ultLockUntil = 0; damageEnemy(f, 10, { src: player, critChanceOverride: 0 }); const base = player.ultCharge;
      player.cds = [0,0,0]; useSkill(1, null); const cd0 = player.cds[1]; __step(300);
      __equip('bleg_ultima_palabra');
      player.ultCharge = 0; player._ultLockUntil = 0; damageEnemy(f, 10, { src: player, critChanceOverride: 0 }); const withItem = player.ultCharge;
      player.cds = [0,0,0]; useSkill(1, null);
      return { ratio: withItem / base, cdRatio: player.cds[1] / cd0 };
    });
    check('POWER.ultima_palabra_definitiva_al_doble', Math.abs(r.ratio - 2) < 0.05, r);
    check('POWER.ultima_palabra_habilidades_mas_lentas', Math.abs(r.cdRatio - 1.25) < 0.02, r);
  }
  // Imán Hambriento: cada 5 s atrae a la horda cercana y escuda
  {
    const r = await E(() => {
      __start('bosque', 'tanque'); __equip('bleg_iman');
      const fs = [__foe(200, 0), __foe(-180, 40), __foe(0, 190)]; const d0 = fs.map(f => Math.hypot(f.x - player.x, f.y - player.y));
      player.shield = 0; updateBuildPowers(player, 5100);
      const d1 = fs.map(f => Math.hypot(f.x - player.x, f.y - player.y));
      return { d0: d0.map(Math.round), d1: d1.map(Math.round), shield: Math.round(player.shield), pct: player.shield / player.maxHp };
    });
    check('POWER.iman_atrae_a_la_horda', r.d1.every((d, i) => d < r.d0[i] * 0.6), r);
    check('POWER.iman_escuda_por_cada_uno', Math.abs(r.pct - 0.09) < 0.005, r);
  }
  // Alquimia Loca: cada golpe aplica fuego, hielo o rayo
  {
    const r = await E(() => {
      __start('bosque', 'guerrero'); __equip('bleg_alquimia');
      const kinds = { fuego: 0, hielo: 0, rayo: 0 };
      for (let i = 0; i < 40; i++) { const f = __foe(60, 0); f.burnTimer = 0; f.slowTimer = 0; f.shockedTimer = 0; damageEnemy(f, 1, { src: player, fromBasic: true });
        if (f.burnTimer > 0) kinds.fuego++; if (f.slowTimer > 0) kinds.hielo++; if (f.shockedTimer > 0) kinds.rayo++; f.alive = false; }
      return kinds;
    });
    check('POWER.alquimia_aplica_los_tres_elementos', r.fuego > 3 && r.hielo > 3 && r.rayo > 3 && r.fuego + r.hielo + r.rayo === 40, r);
  }

  // ---------- 3) caen del piso desde la arena 3 (y se anuncian) ----------
  {
    const r = await E(() => {
      __start('bosque', 'guerrero');
      const g = groundLootDrop(player.x + 80, player.y, 'A', 0.2, 'bosque', 'jefe', 1);
      // Monte Carlo: legendarios que cambian la build por partida con las bajas típicas de la arena 3
      let seed = 99; const rng = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
      const K = { named: 5, subjefe: 3, jefe: 1 }; let n = 0; const N = 4000;
      for (let run = 0; run < N; run++) for (const rk in K) { const src = _glSource({ rank: rk === 'named' ? 'elite' : rk, eliteName: rk === 'named' ? 'x' : null }); for (let i = 0; i < K[rk]; i++) if (rng() < src.build) n++; }
      return { build: g && itemBuildPower(g.item), tier: g && g.tier, flagged: g && g.build, perRun: n / N };
    });
    check('DROP.el_piso_suelta_legendarios_que_cambian_la_build', !!r.build && r.tier === 'legendario' && r.flagged, r);
    check('DROP.chance_real_por_partida_desde_la_arena_3', r.perRun > 0.2 && r.perRun < 0.6, r);
  }

  // ---------- 4) inventario lleno: los Comunes y Raros se reciclan en Gemas ----------
  {
    const r = await E(() => {
      __start('bosque', 'guerrero');
      save.stash = []; save.gems = 0; save.recycleDust = 0;
      for (let i = 0; i < INVENTORY_CAPACITY; i++) stashItems().push(makeItem(EQUIP_SLOT_TYPES[i % 6], i < 3 ? 'comun' : 'muyraro'));
      const c = makeItem('arma', 'comun'); groundLoot.push({ item: c, tier: 'comun', x: player.x, y: player.y, t0: 0, id: 991 });
      const okCommon = groundLootPick(groundLoot[groundLoot.length - 1]);
      const afterCommon = { n: stashItems().length, dust: save.recycleDust, has: !!findStashItem(c.uid) };
      const l = makeDesignedItem('bleg_espino'); groundLoot.push({ item: l, tier: 'legendario', x: player.x, y: player.y, t0: 0, id: 992 });
      const okLeg = groundLootPick(groundLoot[groundLoot.length - 1]);
      const afterLeg = { n: stashItems().length, has: !!findStashItem(l.uid), commons: stashItems().filter(i => i.rarity === 'comun').length, dust: save.recycleDust, gems: save.gems };
      const toast = [...document.querySelectorAll('#loot-toasts .loot-toast')].map(e => e.textContent).join(' | ');
      // lleno de Muy Raros y sin Comunes: el Legendario queda en el piso (no se pierde nada bueno)
      save.stash = []; for (let i = 0; i < INVENTORY_CAPACITY; i++) stashItems().push(makeItem(EQUIP_SLOT_TYPES[i % 6], 'muyraro'));
      const l2 = makeDesignedItem('bleg_iman'); const g2 = { item: l2, tier: 'legendario', x: player.x, y: player.y, t0: 0, id: 993 }; groundLoot.push(g2);
      const okFull = groundLootPick(g2);
      return { okCommon, afterCommon, okLeg, afterLeg, toast, okFull, stillOnFloor: groundLoot.includes(g2) };
    });
    check('FULL.comun_levantado_se_recicla_en_polvo_de_gema', r.okCommon && r.afterCommon.n === 30 && !r.afterCommon.has && Math.abs(r.afterCommon.dust - 0.25) < 1e-6, r);
    check('FULL.lo_bueno_hace_lugar_reciclando_un_comun', r.okLeg && r.afterLeg.has && r.afterLeg.n === 30 && r.afterLeg.commons === 2 && Math.abs(r.afterLeg.dust - 0.5) < 1e-6, r.afterLeg);
    check('FULL.se_avisa_en_pantalla', /se recicló/.test(r.toast) && /polvo de Gema/.test(r.toast), r.toast);
    check('FULL.sin_comunes_lo_bueno_queda_en_el_piso', r.okFull === false && r.stillOnFloor, r);
    const g = await E(() => { save.recycleDust = 0.75; save.gems = 0; const got = recycleItemValue({ rarity: 'comun' }); return { got, gems: save.gems, dust: save.recycleDust }; });
    check('FULL.cuatro_comunes_son_una_gema', g.got === 1 && g.gems === 1 && g.dust < 1e-6, g);
  }

  // ---------- 5) élites con nombre: tope por partida y una sola placa, fuera del HUD ----------
  {
    const r = await E(() => {
      const caps = {};
      for (const a of CAMPAIGN_ORDER) { currentArena = a; caps[a] = eliteNamedCap(); }
      __start('infernal', 'guerrero'); eliteNamedReset();
      const oc = eliteNamedChance; eliteNamedChance = () => 1;
      let named = 0; const perLevel = [];
      for (let lv = 1; lv <= 9; lv++) { runLevel = lv; for (let i = 0; i < 12; i++) { const e = spawnEnemy('zombie', false); e.rank = 'elite'; e.eliteName = null; if (eliteMaybeName(e)) named++; e.alive = false; } perLevel.push(named); }
      eliteNamedChance = oc;
      return { caps, named, perLevel, cap: eliteNamedCap() };
    });
    const capVals = Object.values(r.caps);
    check('ELITE.tope_4_a_8_segun_arena', capVals.every(c => c >= 4 && c <= 8) && r.caps.ciudad === 4 && r.caps.infernal === 7, r.caps);
    check('ELITE.nunca_mas_que_el_tope_y_repartidas', r.named === r.cap && r.perLevel[0] < r.cap && r.perLevel[0] >= 1, r);
    const p = await E(() => {
      __start('bosque', 'guerrero'); state = 'playing';
      document.getElementById('hud').classList.remove('hidden');
      const e = __foe(0, -60); e.rank = 'elite'; eliteMaybeName(e, ['rapido']);
      let floats = 0; const of = floatText; floatText = function (x, y, t) { if (String(t).indexOf(e.eliteName) >= 0) floats++; return of.apply(this, arguments); };
      eliteTick(e, 16); floatText = of;
      _hudRectsAt = -1e9; eliteDrawScreenNames(); const visible = { drawn: eliteNameplatesDrawn, hidden: eliteNameplatesHidden, alive: e.alive, inView: inView(e.x, e.y, 0) };
      // la placa cae debajo del panel de estado (arriba a la izquierda): se oculta
      const r = document.getElementById('player-status').getBoundingClientRect(), cr = canvas.getBoundingClientRect();
      const tx = (r.left + r.width / 2 - cr.left) * VW / cr.width, ty = (r.top + r.height / 2 - cr.top) * VH / cr.height;
      const s0 = worldToScreen(player.x, player.y), R = e.radius || 20;
      e.x = player.x + (tx - s0.x) / CAM_ZOOM; e.y = player.y + (ty + 14 - s0.y) / CAM_ZOOM + R * 2.3 + 14;
      _hudRectsAt = -1e9; eliteDrawScreenNames();
      return { floats, visible, under: { drawn: eliteNameplatesDrawn, hidden: eliteNameplatesHidden }, rects: hudRects().length };
    });
    check('ELITE.una_sola_placa_sin_texto_flotante_repetido', p.floats === 0 && p.visible.drawn === 1, p);
    check('ELITE.la_placa_se_oculta_bajo_el_hud', p.rects > 0 && p.under.hidden === 1 && p.under.drawn === 0, p);
  }

  // ---------- 6) XP de victoria: 0,5-1,4 niveles al nivel esperado ----------
  {
    const r = await E(() => {
      const lv = a => VICTORY_XP_CFG.ref[a];
      const ciudad = victoryXpFor('ciudad', 100, 18, 'normal'), ciudadLv = ciudad / xpToNext(lv('ciudad'));
      const worst = victoryXpFor('infernal', 0, 37, 'normal') / xpToNext(lv('infernal'));
      const pes = victoryXpFor('bosque', 100, 60, 'pesadilla'), pesLv = pes / xpToNext(lv('bosque') + diffTier('pesadilla').lvlOffset);
      // un guardián Nv. 18 que gana la Ciudad con puntaje alto: antes +5554 (Nv. 18 → 23)
      const old = Math.round(40 * 88 * 1.88); const st = { lv: 18, xp: 0 }; let x = ciudad; while (x >= xpToNext(st.lv)) { x -= xpToNext(st.lv); st.lv++; }
      return { ciudad, ciudadLv, worst, pesLv, old, lvAfter18: st.lv };
    });
    check('XP.victoria_max_1_5_niveles_al_nivel_esperado', r.ciudadLv <= 1.5 && r.ciudadLv >= 1 && r.worst >= 0.45 && r.pesLv <= 1.5, r);
    check('XP.ciudad_ya_no_sube_5_niveles', r.lvAfter18 <= 19 && r.ciudad < r.old / 3, r);
  }

  check('SIN_ERRORES', errors.length === 0, errors.slice(0, 4));
  await browser.close();
  console.log(fails ? `\n${fails} FALLAS` : '\nTODO OK');
  process.exit(fails ? 1 : 0);
})();
