// ORDEN CANÓNICO de la campaña (docs/lore/LA_HORDA_LORE_BIBLE.md): 01 Ciudad Maldita … 10 Arena Infernal,
// slots en construcción (Ciudad, Minas), desbloqueo secuencial, Arena Divina postgame, migración de
// guardados del orden anterior, Guardianes solo en 03/05/08/10 y cristales en sus arenas.
//   (python3 -m http.server 8771 &) ; node tools/items/t_campaign.js [carpeta_capturas]
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const BASE = process.env.SE_BASE_URL || 'http://127.0.0.1:8771';
const OUT = process.argv[2];
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 500) : '')); if (!ok) fails++; };
const CANON = ['ciudad','fortaleza','bosque','micelial','hielo','acuatica','minas','laberinto','abismo','infernal'];
const NAMES = ['01 — Ciudad Maldita','02 — Fábrica Sin Fin','03 — Ruinas Célticas / Élficas','04 — Reino Fúngico','05 — Arena Gélida',
  '06 — Arena Acuática','07 — Minas Profundas','08 — Laberinto','09 — Abismo','10 — Arena Infernal'];
const PLAYABLE = ['fortaleza','bosque','micelial','hielo','acuatica','laberinto','abismo','infernal'];
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 900, height: 506 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_CERT|fonts\.g|net::|404/.test(m.text())) errors.push('console: ' + m.text().slice(0, 300)); });
  await page.addInitScript(() => { window.__campaignMode = true; });
  const E = (fn, a) => page.evaluate(fn, a);
  // Arranca con el guardado que se le pase (null = perfil nuevo)
  const boot = async (rawSave) => {
    await page.goto(`${BASE}/index.html`, { waitUntil: 'load' });
    await E((raw) => { localStorage.clear(); if (raw) localStorage.setItem('laHordaSave_v1', raw); }, rawSave ? JSON.stringify(rawSave) : null);
    await page.goto(`${BASE}/index.html`, { waitUntil: 'load' });
    for (let k = 0; k < 300; k++) { if (await E(() => !document.getElementById('title-continue-btn').disabled)) break; await sleep(100); }
    await sleep(400);
    await E(() => { loop = function(){};
      window.__open = () => PLAYABLE_ORDER().filter(k => isArenaUnlocked(k));
      window.PLAYABLE_ORDER = () => ARENA_ORDER.slice();
      window.__start = (a, lv) => { for (const k of Object.keys(save.champions)) save.champions[k].unlocked = true;
        selectedClass = 'guerrero'; currentArena = a; lobbyAllies = ['tanque','soporte','mago']; startRun(lv); spawnTimer = 1e12; enemies.length = 0; };
      window.__step = (ms) => { let t = 0; while (t < ms) { for (const h of heroes){ h.hp = h.maxHp; } update(16); t += 16; } };
    });
  };
  // Un guardado "del orden anterior" (antes de campaignV2), armado sobre defaultSave()
  const legacySave = async (cleared, crystals, extra) => {
    await boot(null);
    return E(([cl, cr, ex]) => { const s = defaultSave(); delete s.campaignV2; delete s.legacyOpenArenas;
      s.arenasCleared = Object.assign(s.arenasCleared || {}, cl); s.crystals = cr; Object.assign(s, ex || {}); return s; }, [cleared, crystals, extra]);
  };

  // ---------------- perfil nuevo ----------------
  await boot(null);
  const r0 = await E(() => ({ canon: CAMPAIGN_ORDER.slice(), playable: ARENA_ORDER.slice(), cur: currentArena, open: __open(),
    soon: CAMPAIGN_ORDER.filter(k => ARENA_MODS[k].comingSoon), soonOpen: ['ciudad','minas'].some(k => isArenaUnlocked(k)), divina: isDivinaUnlocked(),
    nums: CAMPAIGN_ORDER.map(k => campaignNumberLabel(k) + ' — ' + ARENA_MODS[k].label) }));
  check('ORDEN.canon_01_a_10', JSON.stringify(r0.canon) === JSON.stringify(CANON), r0.canon);
  check('ORDEN.nombres_y_numeros', JSON.stringify(r0.nums) === JSON.stringify(NAMES), r0.nums);
  check('ORDEN.jugables_en_orden', JSON.stringify(r0.playable) === JSON.stringify(PLAYABLE), r0.playable);
  check('ORDEN.en_construccion_ciudad_y_minas', JSON.stringify(r0.soon) === '["ciudad","minas"]' && !r0.soonOpen, r0.soon);
  check('NUEVO.solo_la_primera_arena_jugable', JSON.stringify(r0.open) === '["fortaleza"]' && r0.cur === 'fortaleza', r0);
  check('NUEVO.divina_bloqueada', r0.divina === false);
  // arena guardada bloqueada -> se corrige a la frontera
  const r0b = await E(() => { currentArena = 'infernal'; ensurePlayableArena(); const a = currentArena; currentArena = 'minas'; ensurePlayableArena(); return [a, currentArena]; });
  check('NUEVO.no_arranca_en_arena_bloqueada', r0b[0] === 'fortaleza' && r0b[1] === 'fortaleza', r0b);

  // ---------------- selector (DOM) ----------------
  const g0 = await E(() => { setState('arenaselect'); renderArenaGrid();
    return [...document.querySelectorAll('#arena-grid .arena-card')].map(c => ({ k: c.dataset.arena, t: c.querySelector('.arena-card-title').textContent.trim(), dis: c.disabled, soon: c.classList.contains('soon') })); });
  check('UI.lista_01_a_10_y_despues_divina', JSON.stringify(g0.slice(0, 10).map(c => c.t)) === JSON.stringify(NAMES) && g0[10].k === 'divina' && g0[11].k === 'coliseo', g0.map(c => c.t));
  check('UI.solo_fabrica_elegible', JSON.stringify(g0.filter(c => !c.dis).map(c => c.k)) === '["fortaleza"]', g0.filter(c => !c.dis));
  check('UI.en_construccion_y_proximamente', g0.filter(c => c.soon).map(c => c.k).join() === 'ciudad,minas,coliseo', g0.filter(c => c.soon).map(c => c.k));
  if (OUT) { await sleep(200); await page.screenshot({ path: OUT + '/arena_select_nuevo.png', fullPage: true }); }
  const g1 = await E(() => { const c = document.querySelector('#arena-grid [data-arena="ciudad"]'); c.click(); document.querySelector('#arena-grid [data-arena="bosque"]').click(); return currentArena; });
  check('UI.no_se_puede_saltear_ni_elegir_en_construccion', g1 === 'fortaleza', g1);

  // ---------------- cadena secuencial ----------------
  const chain = await E(() => { const log = []; for (const k of ARENA_ORDER){ const open = __open(); log.push({ k, open: open.slice(), ok: open[open.length-1] === k && !isDivinaUnlocked() }); save.arenasCleared[k] = true; }
    return { log, divina: isDivinaUnlocked() }; });
  check('CADENA.se_abre_de_a_una_en_orden', chain.log.every(x => x.ok) && chain.log.every((x, i) => x.open.length === i + 1), chain.log.map(x => x.open.length));
  check('CADENA.abismo_abre_infernal_e_infernal_abre_divina', chain.log[7].k === 'infernal' && chain.log[7].open.includes('infernal') && chain.divina, chain);

  // ---------------- victoria real: banner, frontera, Divina ----------------
  await boot(null);
  const v1 = await E(() => { __start('fortaleza', 1); boss = null; finishBossVictory(); return { next: save.justUnlockedArena, open: __open(), fx: CRYSTAL_FX.on }; });
  await sleep(2900);
  const v1b = await E(() => (document.getElementById('center-banner')||{}).textContent || '');
  check('VICTORIA.fabrica_abre_ruinas_03', v1.next === 'bosque' && JSON.stringify(v1.open) === '["fortaleza","bosque"]' && !v1.fx && /03 — Ruinas/.test(v1b), { v1, v1b });
  const v2 = await E(() => { for (const k of ['bosque','micelial','hielo']) save.arenasCleared[k] = true; __start('acuatica', 1); boss = null; finishBossVictory(); return { next: save.justUnlockedArena, fx: CRYSTAL_FX.on }; });
  check('VICTORIA.acuatica_salta_minas_y_abre_laberinto_08', v2.next === 'laberinto' && !v2.fx, v2);
  const v3 = await E(() => { for (const k of ['laberinto','abismo']) save.arenasCleared[k] = true; __start('infernal', 1); boss = null; finishBossVictory(); return { div: save.divineArenaUnlocked, open: isDivinaUnlocked() }; });
  check('VICTORIA.infernal_abre_divina', v3.div && v3.open, v3);

  // ---------------- Guardianes y cristales ----------------
  const gd = await E(() => ({ story: Object.fromEntries(Object.entries(CAMPAIGN_STORY).filter(([k, v]) => v.guardian).map(([k, v]) => [k, v.guardian])),
    byArena: Object.assign({}, CRYSTAL_BY_ARENA), nums: Object.keys(CAMPAIGN_STORY).filter(k => CAMPAIGN_STORY[k].guardian).map(k => campaignNumber(k)) }));
  check('GUARDIANES.solo_en_03_05_08_10', JSON.stringify(gd.story) === '{"bosque":1,"hielo":2,"laberinto":3,"infernal":4}' && gd.nums.join() === '3,5,8,10', gd);
  check('CRISTALES.solo_ruinas_gelida_laberinto', JSON.stringify(gd.byArena) === '{"bosque":"ancestral","hielo":"escarcha","laberinto":"piedra"}', gd.byArena);
  await boot(null);
  const cr = await E(() => { const out = {};
    for (const k of ARENA_ORDER){ __start(k, 1); boss = null; CRYSTAL_FX.on = false; finishBossVictory(); out[k] = CRYSTAL_FX.on ? CRYSTAL_FX.key : null; CRYSTAL_FX.on = false; }
    return out; });
  check('CRISTALES.victoria_por_arena', JSON.stringify(cr) === JSON.stringify({ fortaleza:null, bosque:'ancestral', micelial:null, hielo:'escarcha', acuatica:null, laberinto:'piedra', abismo:null, infernal:null }), cr);
  // jefes de cada arena intactos
  const bosses = await E(() => { const out = {}; for (const k of ['bosque','hielo','acuatica','laberinto']){ __start(k, 10); runLevel = LEVEL_COUNT; levelTimer = levelDuration + 1; __step(64); for (let i = 0; i < 900 && !boss; i++) __step(16); out[k] = boss && boss.type; } return out; }); // (el Bosque tiene intro antes del jefe)
  check('JEFES.siguen_en_su_arena', JSON.stringify(bosses) === '{"bosque":"guardian_ancestral","hielo":"mago_hielo_cristal","acuatica":"leviatan","laberinto":"minotauro"}', bosses);
  // cartel de título "ARENA NN" al entrar
  await E(() => { __start('hielo', 1); __step(32); });
  await sleep(120); // el cartel sale un tick después de startRun (ver campaignTitleCard)
  const tc = await E(() => { const el = document.getElementById('arena-title-card');
    return { k: el.querySelector('.atc-kicker').textContent, t: el.querySelector('.atc-title').textContent }; });
  check('HISTORIA.cartel_de_arena', tc.k === 'ARENA 05' && /GÉLIDA/.test(tc.t), tc);

  // ---------------- migración del orden anterior ----------------
  // (a) Bosque + Acuática completas (orden viejo: la Fortaleza estaba abierta)
  let raw = await legacySave({ bosque: true, acuatica: true }, { espora: false, escarcha: false, piedra: false });
  await boot(raw);
  const m1 = await E(() => ({ open: __open(), leg: save.legacyOpenArenas, v2: save.campaignV2, cr: Object.assign({}, save.crystals),
    stored: JSON.parse(localStorage.getItem('laHordaSave_v1')).campaignV2 }));
  check('MIGRA.lo_completado_sigue_abierto', ['fortaleza','bosque','acuatica'].every(k => m1.open.includes(k)) && m1.open.length === 3 && m1.v2 && m1.stored, m1);
  check('MIGRA.cristal_ancestral_por_ruinas_completas', m1.cr.ancestral === true && m1.cr.escarcha === false && !('espora' in m1.cr), m1.cr);
  // (b) hasta el Reino Micelial con el Cristal de Espora (Madre Espora era Guardiana en el canon viejo)
  raw = await legacySave({ bosque: true, acuatica: true, fortaleza: true, micelial: true }, { espora: true, escarcha: false, piedra: false });
  await boot(raw);
  const m2 = await E(() => ({ open: __open(), cr: Object.assign({}, save.crystals), old: save.crystalsLegacyV1, owned: crystalsOwned() }));
  check('MIGRA.frontera_nueva_gelida', m2.open.includes('hielo') && !m2.open.includes('laberinto') && !m2.open.includes('abismo'), m2.open);
  check('MIGRA.cristal_de_espora_se_remapea', m2.cr.ancestral && !('espora' in m2.cr) && m2.old && m2.old.espora === true && JSON.stringify(m2.owned) === '["ancestral"]', m2);
  // (c) campaña vieja completa -> Divina abierta
  raw = await legacySave({ bosque: true, acuatica: true, fortaleza: true, micelial: true, hielo: true, abismo: true, laberinto: true, infernal: true }, { espora: true, escarcha: true, piedra: true });
  await boot(raw);
  const m3 = await E(() => ({ open: __open().length, div: isDivinaUnlocked(), owned: crystalsOwned() }));
  check('MIGRA.campaña_completa_conserva_todo', m3.open === 8 && m3.div && m3.owned.length === 3, m3);
  // (d) guardado viejo sin nada completado -> solo la primera arena
  raw = await legacySave({}, { espora: false, escarcha: false, piedra: false });
  await boot(raw);
  const m4 = await E(() => ({ open: __open(), cur: currentArena }));
  check('MIGRA.sin_progreso_solo_fabrica', JSON.stringify(m4.open) === '["fortaleza"]' && m4.cur === 'fortaleza', m4);
  // (e) el guardado ya migrado no se vuelve a migrar
  const m5 = await E(() => { save.arenasCleared.fortaleza = true; persistNow(); return true; });
  await page.goto(`${BASE}/index.html`, { waitUntil: 'load' }); await sleep(900);
  const m5b = await E(() => ({ open: ARENA_ORDER.filter(k => isArenaUnlocked(k)), leg: save.legacyOpenArenas }));
  check('MIGRA.idempotente', m5 && JSON.stringify(m5b.open) === '["fortaleza","bosque"]' && Array.isArray(m5b.leg) && m5b.leg.length === 0, m5b);

  check('SIN_ERRORES', errors.length === 0, errors);
  await browser.close();
  console.log(fails ? `${fails} FALLAS` : 'OK');
  process.exit(fails ? 1 : 0);
})();
