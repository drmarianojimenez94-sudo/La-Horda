// Gólem elemental del Nigromante (js/champions/nigro-elements.js): la Maestría "Maestro de Gólems"
// elige para siempre Fuego, Hielo, Tormenta o Plaga; cada uno cambia lo que hace el gólem.
//   (python3 -m http.server 8771 &) ; node tools/items/t_nigro_elements.js [carpeta_capturas]
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const BASE = process.env.SE_BASE_URL || 'http://127.0.0.1:8771';
const OUT = process.argv[2];
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
  await sleep(500);
  const E = (fn, a) => page.evaluate(fn, a);
  await E(() => { loop = function(){};
    window.__setEl = (id) => { const c = save.champions.nigromante; c.unlocked = true; c.level = 100; const st = c.talents; st.mastery = 'golem'; st.masteryNodes = id ? {[id]:1} : {}; };
    window.__start = () => { selectedClass = 'nigromante'; currentArena = 'bosque'; lobbyAllies = ['tanque','guerrero','soporte']; startRun(3); spawnTimer = 1e12; enemies.length = 0; levelDuration = 9e9; };
    window.__step = (ms) => { let t = 0; while (t < ms && state === 'playing') { for (const h of heroes) h.hp = h.maxHp; update(16); t += 16; } };
  });
  const ids = { fire:'ng_m_gol_fuego', ice:'ng_m_gol_hielo', storm:'ng_m_gol_tormenta', plague:'ng_m_gol_plaga' };
  for (const [skin, id] of Object.entries(ids)) {
    const r = await E(([skin, id]) => { __setEl(id); __start();
      spawnOrRenewGolem(player); const g = player.golem; g.x = player.x + 80; g.y = player.y;
      const foes = []; for (let i = 0; i < 4; i++){ const e = spawnEnemy('zombie', false); e.x = g.x + 50 + i*40; e.y = g.y + (i%2)*20; e.hp = e.maxHp = 99999; e.speed = 0; foes.push(e); }
      const hitSet = new Set(); const _de = damageEnemy; damageEnemy = function(e, d, o){ if (foes.includes(e) && d > 0) hitSet.add(e); return _de.apply(this, arguments); };
      let cursed = 0, burnt = 0, slowed = 0; const bolts0 = chainFX.length; let bolts = 0;
      for (let i = 0; i < 260; i++){ __step(16); if (chainFX.length > bolts0) bolts = Math.max(bolts, chainFX.length - bolts0);
        for (const e of foes){ if (e.cursed) cursed++; if (e.burnTimer > 0 || e.burning) burnt++; if (e.slowTimer > 0 || (e.slowAmt||0) > 0) slowed++; } }
      const hurt = hitSet.size; damageEnemy = _de;
      render();
      return { skin: g.skin, want: skin, hurt, cursed, burnt, slowed, bolts, hp: Math.round(g.maxHp) }; }, [skin, id]);
    check(`NGEL.${skin}_elige_el_elemento`, r.skin === skin, r);
    if (skin === 'storm') check('NGEL.tormenta_encadena_rayos', r.bolts > 0 && r.hurt >= 3, r);
    if (skin === 'plague') check('NGEL.plaga_maldice_al_golpear', r.cursed > 0, r);
    if (skin === 'fire') check('NGEL.fuego_quema', r.burnt > 0 || r.hurt > 0, r);
    if (skin === 'ice') check('NGEL.hielo_ralentiza', r.slowed > 0, r);
    if (OUT) await page.screenshot({ path: `${OUT}/golem_${skin}.png` });
  }
  const ex = await E(() => { __setEl('ng_m_gol_tormenta');
    const t = talentTreeFor('nigromante').masteries.golem.miniTree;
    const locks = t.filter(n => /gol_(fuego|hielo|plaga)/.test(n.id)).map(n => masteryMiniLockReason('nigromante', n));
    return { locks }; });
  check('NGEL.los_4_elementos_son_excluyentes', ex.locks.length === 3 && ex.locks.every(l => /Bloqueado/.test(l || '')), ex);
  const ui = await E(() => { const t = talentTreeFor('nigromante').masteries.golem.miniTree; const st = talentState('nigromante');
    const html = talentChainHTML('nigromante', t, n => st.masteryNodes[n.id]||0, n => masteryMiniLockReason('nigromante', n), true);
    const d = document.createElement('div'); d.innerHTML = html; const f = d.querySelector('.tt-fork');
    return { forks: d.querySelectorAll('.tt-fork').length, inFork: f ? f.querySelectorAll('[data-node], .tt-node').length : 0, text: d.textContent.includes('Tormenta') && d.textContent.includes('Plaga') }; });
  check('NGEL.arbol_muestra_una_bifurcacion_de_4', ui.forks === 1 && ui.text, ui);
  check('NGEL.sin_errores', errors.length === 0, errors);
  await browser.close();
  console.log(fails ? `${fails} FALLAS` : 'OK');
  process.exit(fails ? 1 : 0);
})();
