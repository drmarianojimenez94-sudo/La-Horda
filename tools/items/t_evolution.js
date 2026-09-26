// Pruebas de la EVOLUCIÓN de habilidades (Nv.3 Firma, Nv.5 Ímpetu, Nv.7 Resonancia, Nv.10 Forma
// final) y de la IDENTIDAD de proyectiles por campeón (js/systems/skill-evolution.js).
//   (python3 -m http.server 8771 &) ; node tools/items/t_evolution.js
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
    window.__start = (lv, arena, cls) => { for (const k of Object.keys(save.champions)) save.champions[k].unlocked = true; save.stash = []; for (const k in save.champions) save.champions[k].equipment = mkEquipment();
      selectedClass = cls || 'guerrero'; currentArena = arena || 'bosque'; lobbyAllies = ['tanque','soporte','mago']; startRun(lv || 5); spawnTimer = 1e12; enemies.length = 0; levelDuration = 9e9; invalidatePassiveCache(); updateAllies = function(){}; };
    window.__foe = (dx, dy, t) => { const e = spawnEnemy(t || 'duende_bosque', false); e.x = player.x + dx; e.y = player.y + dy; e.atkCd = 1e9; return e; };
    window.__role = (dx, dy, role, t) => { const e = __foe(dx, dy, t); applyRole(e, role); e.roleT = 0; return e; };
    window.__step = (ms, keepHp) => { let t = 0; while (t < ms && state === 'playing') { if (keepHp) for (const h of heroes) h.hp = Math.max(h.hp, h.maxHp*0.9); update(16); t += 16; } };
    window.__freeze = () => { for (const h of heroes){ h.speed = 0; } };
    window.__lvl = (cls, n) => { const c = save.champions[cls]; for (const m of c.skillMastery) m.alloc = n; c.ultMastery.alloc = n; };
    window.__dummy = (dx, dy) => { const e = __foe(dx, dy, 'duende_bosque'); e.hp = e.maxHp = 1e6; e.speed = 0; return e; };
  });


  // Firma: Nv.2 nada, Nv.3 el estado propio (y nunca en básicos)
  const r1 = await E(() => { __lvl('guerrero', 2); __start(5); runStats.critChance = 0; const sk = player.cls.skills[0]; const a = __dummy(60, 0); skillEvoOnCast(player, 0, sk, false); damageEnemy(a, 50, {src:player});
    const lv2 = a.bleedTimer > 0; __lvl('guerrero', 3); __start(5); runStats.critChance = 0; const b = __dummy(60, 0), c = __dummy(80, 0); skillEvoOnCast(player, 0, sk, false); damageEnemy(b, 50, {src:player}); damageEnemy(c, 50, {src:player, fromBasic:true});
    return { lv2, lv3: b.bleedTimer > 0, basic: c.bleedTimer > 0 }; });
  check('EVO.firma_desde_nivel_3_y_solo_en_habilidades', !r1.lv2 && r1.lv3 && !r1.basic, r1);
  const r2 = await E(() => { __lvl('mago', 3); __start(5, 'bosque', 'mago'); runStats.critChance = 0; const out = {};
    for (const el of ['fire', 'ice', 'lightning']){ const e = __dummy(60, 0); e.slowTimer = 0; skillEvoOnCast(player, 0, {element:el}, false); damageEnemy(e, 10, {src:player}); out[el] = { burn: e.burnTimer > 0, chill: e.slowTimer > 0, shock: e.shockedTimer > 0 }; }
    __lvl('cazadora', 3); __start(5, 'bosque', 'cazadora'); const m = __dummy(60, 0); skillEvoOnCast(player, 0, player.cls.skills[0], false); damageEnemy(m, 10, {src:player}); const h0 = m.hp; damageEnemy(m, 100, {src:player, fromBasic:true, critChanceOverride:0}); const marked = h0 - m.hp;
    const n = __dummy(90, 0); const h1 = n.hp; damageEnemy(n, 100, {src:player, fromBasic:true, critChanceOverride:0}); return { out, marked: Math.round(marked), plain: Math.round(h1 - n.hp) }; });
  check('EVO.mago_firma_segun_elemento', r2.out.fire.burn && r2.out.ice.chill && r2.out.lightning.shock, r2);
  check('EVO.marca_de_la_cazadora_suma_10pct', Math.abs(r2.marked / r2.plain - 1.1) < 0.02, r2);

  // Ímpetu (Nv.5): rematar con la habilidad recorta 25% su enfriamiento, una vez por lanzamiento
  const r3 = await E(() => { __lvl('guerrero', 5); __start(5); runStats.critChance = 0; skillEvoOnCast(player, 1, player.cls.skills[1], false); player.cds[1] = 8000;
    const a = __foe(60, 0), b = __foe(70, 10); damageEnemy(a, a.hp*3 + 99, {src:player}); const cd1 = player.cds[1]; damageEnemy(b, b.hp*3 + 99, {src:player}); const cd2 = player.cds[1];
    __lvl('guerrero', 4); __start(5); skillEvoOnCast(player, 1, player.cls.skills[1], false); player.cds[1] = 8000; const c = __foe(60, 0); damageEnemy(c, c.hp*3 + 99, {src:player}); return { cd1, cd2, lv4: player.cds[1] }; });
  check('EVO.impetu_recorta_una_vez', r3.cd1 === 6000 && r3.cd2 === 6000 && r3.lv4 === 8000, r3);

  // Resonancia (Nv.7): golpear a quien ya tiene tu firma estalla alrededor
  const r4 = await E(() => { const run = (lv) => { __lvl('guerrero', lv); __start(5); runStats.critChance = 0; const t = __dummy(60, 0), n = __dummy(100, 0); skillEvoOnCast(player, 0, player.cls.skills[0], false);
      damageEnemy(t, 100, {src:player}); const n0 = n.hp; player._evoResoAt = undefined; damageEnemy(t, 100, {src:player}); return n0 - n.hp; };
    return { lv6: run(6), lv7: run(7) }; });
  check('EVO.resonancia_estalla_desde_nivel_7', r4.lv6 === 0 && r4.lv7 > 20, r4);

  // Forma final (Nv.10): cada 3er lanzamiento +50% poder / +20% área
  const r5 = await E(() => { __lvl('guerrero', 10); __start(5); const ks = [1,2,3,4,5,6].map(() => skillEvoOnCast(player, 2, player.cls.skills[2], false)); __lvl('guerrero', 9); __start(5); const k9 = [1,2,3].map(() => skillEvoOnCast(player, 2, player.cls.skills[2], false));
    return { p10: ks.map(k => k.power), a10: ks[2].area, p9: k9.map(k => k.power) }; });
  check('EVO.forma_final_cada_3_lanzamientos', JSON.stringify(r5.p10) === '[1,1,1.5,1,1,1.5]' && r5.a10 === 1.2 && r5.p9.every(p => p === 1), r5);

  // lanzamientos reales: cada campeón con todo en Nv.3 deja su firma con alguna habilidad
  const r6 = await E(() => { const out = {};
    for (const k of Object.keys(CHAMP_IDENTITY)){
      __lvl(k, 3); __start(5, 'bosque', k); __freeze(); runStats.critChance = 0; const foes = []; for (let i = 0; i < 6; i++) foes.push(__dummy(50 + (i%3)*25, -30 + Math.floor(i/3)*60));
      player.fx = 1; player.fy = 0; player.aim = {x: player.x + 70, y: player.y};
      for (let i = 0; i < 3; i++){ try { castAbility(player, player.cls.skills[i], false, i); } catch (err) { out[k] = 'ERR ' + err.message; } __step(700, true); }
      const sig = evoSigFor(player, player.cls.skills[0]); if (!out[k]) out[k] = foes.some(f => evoHasSig(f, sig, player) || f.bleedTimer > 0 || f.burnTimer > 0 || (f._evoMarkT||0) > 0 || (f._evoStagT||0) > 0 || f.shockedTimer > 0 || f.slowTimer > 0) ? 'ok' : 'none';
    } return out; });
  const bad6 = Object.entries(r6).filter(([k, v]) => v !== 'ok');
  check('EVO.todos_los_campeones_dejan_su_firma', bad6.length <= 1, r6);

  // identidad de proyectiles
  const r7 = await E(() => { __start(5, 'bosque', 'cazadora'); const st = {}; for (const k of Object.keys(CHAMP_IDENTITY)) st[k] = projStyleOf({src:{classKey:k}});
    const en = projStyleOf({enemy:true, src:{classKey:'mago'}}); const kinds = new Set(Object.values(st)).size;
    // dibujar un proyectil de cada campeón
    projectiles.length = 0; let i = 0; for (const k of Object.keys(CHAMP_IDENTITY)) projectiles.push({x:player.x - 200 + (i++)*35, y:player.y - 40, vx:300, vy:40, dmg:1, life:5000, radius:6, color:CLASSES[k].glow, src:{classKey:k}});
    render(); return { st, en, kinds }; });
  check('PROJ.cada_campeon_con_forma_propia', r7.en === null && r7.kinds >= 10 && r7.st.cazadora === 'arrow' && r7.st.libertador === 'bullet', r7);

  // UI: hitos en el panel de habilidades
  const r8 = await E(() => { __lvl('musashi', 5); const d = document.createElement('div'); document.body.appendChild(d); renderSkillsPanel(d, 'musashi', () => {}); const rows = d.querySelectorAll('.mastery-row'); const r0 = rows[0];
    const out = { rows: rows.length, chips: r0.querySelectorAll('.evo').length, on: r0.querySelectorAll('.evo.on').length, next: (r0.querySelector('.evo.next')||{}).textContent }; d.remove(); return out; });
  check('UI.hitos_visibles_con_el_proximo_explicado', r8.rows === 4 && r8.chips === 4 && r8.on === 2 && /Nv\.7 Resonancia: /.test(r8.next||''), r8);

  // partida real con bots y todo en Nv.10: nada se rompe
  const r9 = await E(() => { let casts = 0; for (const k of ['mago','soporte','axiom','nigromante','libertador','eren','profeta','segador']) __lvl(k, 10);
    for (const [a, cls] of [['bosque','mago'], ['infernal','axiom'], ['hielo','nigromante'], ['acuatica','libertador']]){ __start(6, a, cls); lobbyAllies = ['eren','profeta','segador']; spawnTimer = 0;
      for (let i = 0; i < 1500 && state === 'playing'; i++){ for (const h of heroes) h.hp = h.maxHp; if (i % 40 === 0){ for (let s = 0; s < 3; s++) if (useSkill(s)) casts++; } update(16); if (i % 300 === 0) render(); } }
    return { casts }; });
  check('EVO.partidas_reales_nivel_10', r9.casts > 20, r9);
  const r10 = await E(() => { __lvl('guerrero', 10); __start(5); divinaMode = true; const k = [1,2,3].map(() => skillEvoOnCast(player, 0, player.cls.skills[0], false)); divinaMode = false; return k.map(x => x.power); });
  check('EVO.sin_evolucion_en_la_divina', r10.every(p => p === 1), r10);
  check('EVO.sin_errores', errors.length === 0, errors);
  console.log(`SUMMARY ${fails === 0 ? 'OK' : 'FAIL'} fails=${fails}`);
  await browser.close();
  process.exit(fails ? 1 : 0);
})();
