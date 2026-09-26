// Reacciones entre estados (Conducción, Quiebre, Vapor, Hemorragia, combo de equipo) y resistencias.
//   (python3 -m http.server 8771 &) ; node tools/items/t_reactions.js
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
  await page.addInitScript(() => { window.__campaignMode = true; });
  await page.goto(`${BASE}/index.html`, { waitUntil: 'load' });
  for (let k = 0; k < 300; k++) { if (await page.evaluate(() => !document.getElementById('title-continue-btn').disabled)) break; await sleep(100); }
  const E = (fn, a) => page.evaluate(fn, a);
  await E(() => { loop = function(){};
    window.__start = (arena, champ) => { for (const k of Object.keys(save.champions)) save.champions[k].unlocked = true; save.stash = []; for (const k in save.champions) save.champions[k].equipment = mkEquipment();
      selectedClass = champ || 'mago'; currentArena = arena || 'laberinto'; lobbyAllies = ['tanque','guerrero','soporte']; startRun(3); spawnTimer = 1e12; enemies.length = 0; levelDuration = 9e9; invalidatePassiveCache(); runElapsedMs = 5000; };
    window.__foe = (dx, dy, t) => { const e = spawnEnemy(t || 'escorpion_gigante', false); e.x = player.x + dx; e.y = player.y + dy; e.hp = e.maxHp = 5000; return e; };
  });
  const cond = await E(() => { __start('laberinto'); const a = __foe(60, 0), b = __foe(120, 0), c = __foe(400, 0); a.wetTimer = 2000; b.wetTimer = 2000; c.wetTimer = 2000;
    damageEnemy(a, 100, {src:player, chain:true}); return { b: b.hp < 5000, bStun: b.stunTimer > 0, farSafe: c.hp === 5000 }; });
  check('REACT.conduccion_salta_a_los_mojados_cercanos', cond.b && cond.bStun && cond.farSafe, cond);
  const dry = await E(() => { __start('laberinto'); const a = __foe(60, 0), b = __foe(120, 0); b.wetTimer = 2000; damageEnemy(a, 100, {src:player, chain:true}); return b.hp === 5000; });
  check('REACT.sin_mojado_no_hay_conduccion', dry);
  const sh = await E(() => { __start('laberinto', 'tanque'); const a = __foe(60, 0), n = __foe(100, 0); a.frozenTimer = 1500; const h0 = a.hp;
    damageEnemy(a, 100, {src:player, heavy:true, critChanceOverride:0}); const frozenHit = h0 - a.hp; const b = __foe(-60, 0); damageEnemy(b, 100, {src:player, heavy:true, critChanceOverride:0});
    return { ratio: frozenHit / (5000 - b.hp), unfrozen: !(a.frozenTimer > 0), shard: n.hp < 5000 }; });
  check('REACT.quiebre_golpe_pesado_sobre_congelado', sh.ratio > 1.6 && sh.unfrozen && sh.shard, sh);
  const va = await E(() => { __start('laberinto'); const a = __foe(60, 0); a.slowAmt = 0.9; a.slowTimer = 2000; const h0 = a.hp; damageEnemy(a, 100, {src:player, burn:true}); const d1 = h0 - a.hp;
    const b = __foe(-60, 0); damageEnemy(b, 100, {src:player, burn:true}); return { ratio: d1 / (5000 - b.hp), wet: a.wetTimer > 0, thawed: !(a.slowAmt > 0) }; });
  check('REACT.vapor_fuego_sobre_congelado_deja_mojado', va.ratio > 1.4 && va.wet && va.thawed, va);
  const hm = await E(() => { __start('laberinto', 'guerrero'); const a = __foe(60, 0); a.bleedTimer = 3000; a.bleedDmg = 50; damageEnemy(a, 10, {src:player, forceCrit:true}); updateRunTimers(16); return { gone: a.bleedTimer === 0, hp: a.hp }; });
  check('REACT.hemorragia_el_sangrado_entra_de_golpe', hm.gone && hm.hp < 5000 - 200, hm);
  const combo = await E(() => { __start('laberinto', 'mago'); const tank = heroes.find(h=>h.classKey==='tanque'); const a = __foe(60, 0); a.frozenTimer = 1500; a.frozenBy = player;
    tank.stats.teamCombos = 0; damageEnemy(a, 100, {src:tank, heavy:true, critChanceOverride:0}); return { tank: tank.stats.teamCombos, mago: player.stats.teamCombos }; });
  check('REACT.combo_de_equipo_cuando_otro_puso_el_estado', combo.tank === 1 && combo.mago === 1, combo);
  const res = await E(() => { __start('hielo'); const a = __foe(60, 0, 'lobo_artico'); const b = __foe(-60, 0, 'lobo_artico'); a.hp = a.maxHp = b.hp = b.maxHp = 5000;
    damageEnemy(a, 100, {src:player, slow:0.3, critChanceOverride:0}); damageEnemy(b, 100, {src:player, burn:true, critChanceOverride:0}); return { ice: 5000 - a.hp, fire: 5000 - b.hp }; });
  check('RES.horda_de_hielo_resiste_hielo_y_teme_al_fuego', res.fire > res.ice * 1.8, res);
  const hr = await E(() => { __start('infernal', 'tanque'); const d = __foe(60, 0, 'demonio_menor'); player.def = 0; player.shield = 0; player.itemShield = 0; const hp0 = player.hp; damageHero(player, 20, d); const plain = hp0 - player.hp;
    const it = makeItem('pechera', 'raro'); it.passives = [{id:'x', name:'x', effect:'res_fire', value:0.1}]; stashItems().push(it); equipItem('tanque', it.uid); invalidatePassiveCache();
    player.hp = hp0; damageHero(player, 20, d); return { plain, resisted: hp0 - player.hp, type: enemyDmgType(d) }; });
  check('RES.objetos_con_resistencia_al_fuego_protegen', hr.type === 'fire' && hr.resisted < hr.plain * 0.85, hr);
  const wet = await E(() => { __start('acuatica'); const s = __foe(60, 0, 'tiburon_joven'); enemyResist(s, 'physical'); return { innate: !!s.innateWet, weak: enemyResist(s, 'lightning') < 0 }; });
  check('RES.criaturas_acuaticas_mojadas_y_debiles_al_rayo', wet.innate && wet.weak, wet);
  check('REACT.sin_errores', errors.length === 0, errors);
  console.log(`SUMMARY ${fails === 0 ? 'OK' : 'FAIL'} fails=${fails}`);
  await browser.close(); process.exit(fails ? 1 : 0);
})();
