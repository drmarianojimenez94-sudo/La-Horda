// Resonancia de los Cristales (js/systems/crystal-resonance.js): el guardián lleva UNO de los cristales
// que juntó y entra con el don de ese Guardián. Se elige en la pantalla previa y viaja en el loadout.
//   (python3 -m http.server 8771 &) ; node tools/items/t_resonance.js
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const BASE = process.env.SE_BASE_URL || 'http://127.0.0.1:8771';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 400) : '')); if (!ok) fails++; };
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 900, height: 506 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_CERT|fonts\.g|net::|404/.test(m.text())) errors.push('console: ' + m.text().slice(0, 300)); });
  await page.addInitScript(() => { window.__campaignMode = true; });
  await page.goto(`${BASE}/index.html`, { waitUntil: 'load' });
  for (let k = 0; k < 300; k++) { if (await page.evaluate(() => !document.getElementById('title-continue-btn').disabled)) break; await sleep(100); }
  await sleep(500);
  const E = (fn, a) => page.evaluate(fn, a);
  await E(() => { loop = function(){};
    window.__start = (a) => { for (const k of Object.keys(save.champions)) save.champions[k].unlocked = true;
      selectedClass = 'guerrero'; currentArena = a; lobbyAllies = ['tanque','soporte','mago']; startRun(1); spawnTimer = 1e12; enemies.length = 0; };
    window.__step = (ms, keepAlive) => { let t = 0; while (t < ms) { if (keepAlive) for (const h of heroes) if (h !== player) h.hp = h.maxHp; update(16); t += 16; } };
    window.__foe = (type, dx) => { const e = spawnEnemy(type || 'esqueleto', false, false); e.x = player.x + dx; e.y = player.y; e.speed = 0; e.atkCd = 1e9; e.hp = e.maxHp = 1e9; return e; };
  });

  const r0 = await E(() => { save.crystals = {}; save.crystalWorn = undefined; __start('bosque'); __step(32, true);
    return { k: player._res, av: resonanceAvailable(), L: netBuildLoadout().crystal }; });
  check('RES.sin_cristales_no_hace_nada', r0.k === null && r0.av.length === 0 && r0.L === null, r0);

  const r1 = await E(() => { save.crystals = { ancestral: true, escarcha: true, piedra: true }; save.crystalWorn = undefined;
    __start('bosque'); __step(32, true);
    const bots = heroes.filter(h => h !== player).map(h => h._res);
    player.shield = 0; __step(3200, true);
    return { k: player._res && player._res.k, bots, sh: player.shield / player.maxHp, L: netBuildLoadout().crystal }; });
  check('RES.por_defecto_el_ultimo_cristal', r1.k === 'piedra' && r1.L === 'piedra', r1);
  check('RES.bots_sin_cristal', r1.bots.every(b => b === null), r1.bots);
  check('RES.piedra_escudo_15', r1.sh >= 0.149, r1.sh);

  const r2 = await E(() => { resonanceSetWorn('ancestral'); __start('bosque'); __step(32, true);
    const e = __foe('esqueleto', 90), far = __foe('esqueleto', 400);
    player.invulnTimer = 0; player.hp = player.maxHp * 0.4; damageHero(player, player.maxHp * 0.2, e);
    const st = { near: e.stunTimer > 0, far: !(far.stunTimer > 0), cd: player._res.cd > 0 };
    st.hpPct = player.hp / player.maxHp;
    enemies.length = 0; player.hp = player.maxHp * 0.3; __step(5200, true); const withC = player.hp / player.maxHp;
    resonanceSetWorn('none'); __start('bosque'); __step(32, true); player.hp = player.maxHp * 0.3; __step(5200, true); const noC = player.hp / player.maxHp;
    resonanceSetWorn('ancestral');
    return Object.assign(st, { k: 'ancestral', regen: withC - noC, saved: save.crystalWorn }); });
  check('RES.ancestral_raices_bajo_35', r2.k === 'ancestral' && r2.near && r2.far && r2.cd, r2);
  check('RES.ancestral_regenera_en_calma', r2.regen > 0.01 && r2.regen < 0.05, r2.regen);
  check('RES.eleccion_guardada', r2.saved === 'ancestral');

  const r3 = await E(() => { resonanceSetWorn('escarcha'); __start('bosque'); __step(32, true);
    const e = __foe('esqueleto', 60), far = __foe('esqueleto', 420); __step(600, true);
    return { k: player._res.k, slow: e.slowAmt, far: far.slowTimer > 0 ? far.slowAmt : 0, m: resonanceDmgMult(player, e), mFar: resonanceDmgMult(player, Object.assign({}, far, { slowTimer: 0 })) }; });
  check('RES.escarcha_frena_cercanos', r3.k === 'escarcha' && r3.slow >= 0.15 && r3.far === 0, r3);
  check('RES.escarcha_mas_dano_a_frenados', Math.abs(r3.m - 1.06) < 1e-6 && r3.mFar === 1, r3);

  const r4 = await E(() => { const had = save.arenasCleared.infernal; save.arenasCleared.infernal = false;
    const noJ = resonanceAvailable().includes('juicio');
    save.arenasCleared.infernal = true; resonanceSetWorn('juicio'); __start('bosque'); __step(32, true);
    const r = { noJ, k: player._res.k, boss: resonanceDmgMult(player, { rank: 'jefe' }), minion: resonanceDmgMult(player, { rank: 'normal' }) };
    resonanceSteal(); r.keepsJuicio = !!player._res;
    save.arenasCleared.infernal = had; resonanceSetWorn('escarcha'); __start('bosque'); __step(32, true);
    resonanceSteal(); r.stolen = player._res; __step(1100, true); r.stillStolen = player._res; return r; });
  check('RES.juicio_solo_tras_el_final', !r4.noJ && r4.k === 'juicio' && Math.abs(r4.boss - 1.12) < 1e-6 && r4.minion === 1, r4);
  check('RES.el_hechicero_apaga_la_resonancia', r4.keepsJuicio && r4.stolen === null && r4.stillStolen === null, r4);

  const r5 = await E(() => { state = 'menu'; let went = 0; runIntroShow('bosque', () => { went++; });
    const el = document.getElementById('run-intro'); const btns = [...el.querySelectorAll('.res-pick')].map(b => b.dataset.res);
    el.querySelector('.res-pick[data-res="ancestral"]').click();
    const on = (el.querySelector('.res-pick.on') || {}).dataset; const desc = (el.querySelector('.res-desc') || {}).textContent;
    const r = { btns, on: on && on.res, desc, worn: save.crystalWorn, open: RUN_INTRO.open, went };
    RUN_INTRO.open = false; el.classList.add('hidden'); return r; });
  check('RES.pantalla_previa_elige_cristal', r5.btns.join() === 'ancestral,escarcha,piedra,none' && r5.on === 'ancestral' && r5.worn === 'ancestral' && /Raíz viva/.test(r5.desc), r5);
  check('RES.elegir_no_arranca_la_partida', r5.open && r5.went === 0, r5);

  const r7 = await E(() => { __start('bosque'); __step(32, true); crystalAward('escarcha', player.x, player.y);
    const el = document.getElementById('arena-title-card');
    return { k: el.querySelector('.atc-kicker').textContent, t: el.querySelector('.atc-title').textContent, s: el.querySelector('.atc-sub').textContent, end: /Juicio/.test(CAMPAIGN_ENDING) }; });
  check('RES.ultimas_palabras_del_guardian', r7.k === 'LAS ÚLTIMAS PALABRAS' && r7.t === 'MAGO GÉLIDO' && /eligió quedarse/.test(r7.s) && r7.end, r7);

  const r6 = await E(() => { __start('bosque'); __step(32, true); render(); return { ok: true }; });
  check('RES.dibuja_sin_errores', r6.ok && errors.length === 0, errors.slice(0, 3));
  await browser.close();
  console.log('SUMMARY ' + (fails ? 'FAIL' : 'OK') + ' fails=' + fails);
  process.exit(fails ? 1 : 0);
})();
