// EL CÓDICE (js/ui/codex/): menú MODOS DE JUEGO · CÓDICE · TIENDA, las 4 secciones, todas las fichas,
// previews con arte real, navegación cruzada + migas + atrás, descubrimiento (DESCONOCIDO → DESCUBIERTO →
// DERROTADO) sin spoilers, migración de la gestión de campeones (elegir, equipo, talentos, maestría,
// skins), rendimiento y maquetación en celular horizontal (sin desbordes ni botones fuera de pantalla).
//   (python3 -m http.server 8771 &) ; node tools/items/t_codex.js [carpeta_capturas]
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const BASE = process.env.SE_BASE_URL || 'http://127.0.0.1:8771';
const OUT = process.argv[2];
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 500) : '')); if (!ok) fails++; };
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if ((m.type() === 'error' || (m.type() === 'warning' && /codex preview/.test(m.text()))) && !/ERR_CERT|fonts\.g|net::|404/.test(m.text())) errors.push(m.type() + ': ' + m.text().slice(0, 300)); });
  await page.addInitScript(() => { window.__campaignMode = true; });
  const E = (fn, a) => page.evaluate(fn, a);
  const boot = async (raw) => {
    await page.goto(`${BASE}/index.html`, { waitUntil: 'load' });
    await E((r) => { localStorage.clear(); if (r) localStorage.setItem('laHordaSave_v1', r); }, raw || null);
    await page.goto(`${BASE}/index.html`, { waitUntil: 'load' });
    for (let k = 0; k < 300; k++) { if (await E(() => !document.getElementById('title-continue-btn').disabled)) break; await sleep(100); }
    await sleep(1500);
  };
  const vis = sel => page.isVisible(sel).catch(() => false);
  const noOverflow = () => E(() => {
    const scr = document.getElementById('codex-screen'), W = innerWidth, H = innerHeight, bad = [];
    for (const el of scr.querySelectorAll('button, .cx-sec, .cx-card, .cx-stage')) {
      const r = el.getBoundingClientRect(); if (!r.width || el.closest('.cx-scroll-x')) continue;
      if (r.right > W + 1 || r.left < -1) bad.push((el.className || el.tagName) + ':' + Math.round(r.left) + '-' + Math.round(r.right));
    }
    return { hscroll: document.documentElement.scrollWidth > W + 1 || scr.scrollWidth > W + 1, bad: bad.slice(0, 5) };
  });

  // ---------------- perfil nuevo ----------------
  await boot(null);
  await page.click('#title-continue-btn'); await sleep(300);
  // (el regalo de campeón: si aparece la pantalla de elegir, se elige el primero)
  if (await vis('#starter-screen')) { await E(() => { const c = document.querySelector('#starter-grid [data-champ], #starter-grid .starter-card'); if (c) c.click(); }); await sleep(200); if (await vis('#starter-yes-btn')) await page.click('#starter-yes-btn'); await sleep(300); }
  if (!(await vis('#mainmenu-screen'))) await E(() => { setState('mainmenu'); renderMainMenu(); });
  const menu = await E(() => [...document.querySelectorAll('#mainmenu-screen .mode-card-title')].map(e => e.textContent.trim()));
  check('MENU.tres_pilares', JSON.stringify(menu) === '["MODOS DE JUEGO","CÓDICE","TIENDA"]', menu);
  check('MENU.sin_pestana_campeones', !(await E(() => !!document.getElementById('mainmenu-campeones-btn'))));
  const pillars = await E(() => [...document.querySelectorAll('.mainmenu-pillars .mode-card')].map(b => { const r = b.getBoundingClientRect(); return [Math.round(r.top), Math.round(r.bottom)]; }));
  check('MENU.en_fila_y_a_la_vista', pillars.length === 3 && pillars.every(p => p[0] === pillars[0][0] && p[1] <= 390), pillars);
  await page.click('#mainmenu-codex-btn'); await sleep(400);
  check('HOME.abre', await vis('#codex-screen'));
  const home = await E(() => [...document.querySelectorAll('#codex-body .cx-home-title')].map(e => e.textContent.replace(/[^A-ZÁÉÍÓÚ]/g, '')));
  check('HOME.cuatro_secciones', JSON.stringify(home) === '["GUARDIAS","BESTIARIO","JEFES","ARENAS"]', home);
  const homeArt = await E(() => document.querySelectorAll('#codex-body .cx-home-card canvas').length);
  check('HOME.arte_real_animado', homeArt >= 5, homeArt);
  if (OUT) await page.screenshot({ path: OUT + '/codex_home.png' });
  check('HOME.sin_desbordes', !(await noOverflow()).hscroll, await noOverflow());

  // ---------------- datos: todo ENEMY_BASE ubicado, lore completo ----------------
  const data = await E(() => {
    const placed = new Set([...Object.values(CODEX_ARENA_ROSTER).flat(), ...CODEX_BOSSES.flatMap(b => b.forms.map(f => f.split('#')[0])), ...Object.keys(CODEX_EXCLUDED)]);
    return { missing: Object.keys(ENEMY_BASE).filter(t => !placed.has(t)),
      noLore: Object.values(CODEX_ARENA_ROSTER).flat().filter(t => !CODEX_CREATURES[t] || !CODEX_CREATURES[t].lore || !CODEX_CREATURES[t].behavior),
      noBoss: CODEX_BOSSES.filter(b => !CODEX_BOSS_LORE[b.id] || !(CODEX_BOSS_LORE[b.id].abilities || []).length).map(b => b.id),
      badForms: CODEX_BOSSES.flatMap(b => b.forms.map(f => f.split('#')[0])).filter(t => !ENEMY_BASE[t]),
      noArena: [...CAMPAIGN_ORDER, 'divina'].filter(a => !CODEX_ARENA_LORE[a]),
      noChamp: CHAMPION_CATALOG.map(c => c.id).filter(k => !CODEX_CHAMP_LORE[k]),
      order: [...CAMPAIGN_ORDER] };
  });
  check('DATOS.todo_enemigo_en_el_codice', data.missing.length === 0, data.missing);
  check('DATOS.lore_de_criaturas', data.noLore.length === 0, data.noLore);
  check('DATOS.lore_y_habilidades_de_jefes', data.noBoss.length === 0 && data.badForms.length === 0, data);
  check('DATOS.arenas_y_campeones', data.noArena.length === 0 && data.noChamp.length === 0, data);

  // ---------------- descubrimiento en perfil nuevo ----------------
  const fresh = await E(() => ({ c: codexCreatureState('carcelero'), b: codexBossState(codexBossDef('caballero')), fin: codexBossState(codexBossDef('hechicero_final')) }));
  check('DESC.perfil_nuevo_desconocido', fresh.c === 'unknown' && fresh.b === 'unknown' && fresh.fin === 'unknown', fresh);
  await E(() => codexGo('list', 'bestiario', 'BESTIARIO')); await sleep(300);
  const unk = await E(() => { const c = document.querySelector('[data-go="creature:carcelero"]'); return { name: c.querySelector('.cx-card-name').textContent, sil: JSON.parse(c.querySelector('canvas').dataset.pv).silhouette }; });
  check('DESC.silueta_y_signos', unk.name === '???' && unk.sil === true, unk);
  await E(() => codexLink('creature:carcelero')); await sleep(250);
  const unkEntry = await E(() => document.getElementById('codex-body').textContent);
  check('DESC.ficha_desconocida_sin_lore', /Sin descubrir/.test(unkEntry) && !/cadenas a la carne/.test(unkEntry));
  await E(() => { codexNoteSeen('carcelero'); codexRender(); }); await sleep(200);
  const seen = await E(() => ({ st: codexCreatureState('carcelero'), t: document.getElementById('codex-body').textContent }));
  check('DESC.encontrada_muestra_lo_basico', seen.st === 'seen' && /Carcelero Deforme/.test(seen.t) && /cadenas a la carne/.test(seen.t) && /Derrotala para ver sus ataques/.test(seen.t), seen.st);
  await E(() => { codexNoteKill('carcelero'); codexRender(); }); await sleep(200);
  const beat = await E(() => ({ st: codexCreatureState('carcelero'), t: document.getElementById('codex-body').textContent }));
  check('DESC.derrotada_ficha_completa', beat.st === 'defeated' && /Tirón de Cadena/.test(beat.t) && /Botín/.test(beat.t), beat.st);
  // el Jinete Sin Cabeza solo vive en la Arena Divina (que no se "completa"): matarlo ahí lo marca derrotado
  const jin = await E(() => { const b = codexBossDef('jinete_sin_cabeza'), s0 = codexBossState(b); codexNoteKill('jinete_sin_cabeza'); return { s0, s1: codexBossState(b) }; });
  check('DESC.jefe_divina_derrotable', jin.s0 === 'unknown' && jin.s1 === 'defeated', jin);
  // jefe descubierto pero no derrotado: sin transformación ni revelación
  await E(() => { save.codex.seen.mago_hielo_cristal = 1; codexLink('boss:mago_gelido'); }); await sleep(250);
  const mg = await E(() => ({ t: document.getElementById('codex-body').textContent, forms: [...document.querySelectorAll('[data-anim]')].map(b => b.textContent) }));
  check('SPOILER.sin_forma_oculta_ni_revelacion', !/Demonio Gélido/.test(mg.t) && !/Forma:/.test(mg.forms.join()) && /Derrotalo para saberlo/.test(mg.t), mg.forms);
  await E(() => codexLink('boss:hechicero_final')); await sleep(250);
  const hf = await E(() => ({ t: document.getElementById('codex-body').textContent, pv: JSON.parse(document.querySelector('.cx-stage-pv').dataset.pv) }));
  check('SPOILER.jefe_final_velado', /\?\?\?/.test(hf.t) && !/Rey de la Horda|Cuarto Guardián|Ángel/.test(hf.t) && hf.pv.kind === 'ambient' && hf.pv.veil === true, hf.pv);

  // ---------------- registro real en partida ----------------
  const run = await E(() => {
    for (const k of Object.keys(save.champions)) save.champions[k].unlocked = true;
    loop = function(){}; selectedClass = 'guerrero'; currentArena = 'fortaleza'; lobbyAllies = ['tanque', 'mago', 'soporte']; startRun(1); spawnTimer = 1e12;
    const e = spawnEnemy('dragon_bronce', false, false); const seen = !!save.codex.seen.dragon_bronce;
    e.hp = 1; damageEnemy(e, 99999, { src: player });
    const k = save.codex.kills.dragon_bronce || 0; state = 'menu'; return { seen, k };
  });
  check('REGISTRO.partida_real_ve_y_cuenta_muertes', run.seen && run.k === 1, run);

  // ---------------- perfil veterano (campaña completa) ----------------
  const vet = await E(() => { const s = defaultSave(); for (const k in s.champions) s.champions[k].unlocked = true; for (const a of ARENA_ORDER) s.arenasCleared[a] = true; s.divineArenaUnlocked = true; s.starterChosen = true; s.lastChamp = 'mago'; return JSON.stringify(s); });
  await boot(vet);
  await page.click('#title-continue-btn'); await sleep(250);
  await E(() => { if (state !== 'mainmenu') { setState('mainmenu'); renderMainMenu(); } });
  await page.click('#mainmenu-codex-btn'); await sleep(300);
  // todas las fichas se dibujan sin errores
  const all = await E(async () => {
    const out = { n: 0, err: [] };
    const go = (v, id) => { try { codexStack = [codexStack[0]]; codexGo(v, id, codexLinkLabel(v, id)); out.n++; } catch (e) { out.err.push(v + ':' + id + ' ' + e.message); } };
    for (const c of CHAMPION_CATALOG) go('champ', c.id);
    for (const t of Object.values(CODEX_ARENA_ROSTER).flat()) go('creature', t);
    for (const b of CODEX_BOSSES) go('boss', b.id);
    for (const a of [...CAMPAIGN_ORDER, 'divina']) go('arena', a);
    for (const id of Object.keys(SET_DB).slice(0, 6)) go('set', id);
    for (const s of CODEX_SECTIONS) { codexStack = [codexStack[0]]; codexGo('list', s.id, s.label); out.n++; }
    return out;
  });
  check('FICHAS.todas_se_dibujan', all.err.length === 0 && all.n > 100, all);
  // ninguna preview de criatura o jefe queda vacía (el sprite real dibuja píxeles; _cxMeasure es null si no)
  let blank = [];
  for (let k = 0; k < 20; k++) {
    blank = await E(() => { const types = [...Object.values(CODEX_ARENA_ROSTER).flat(), ...CODEX_BOSSES.flatMap(b => b.forms.map(f => f.split('#')[0]))];
      return [...new Set(types)].filter(t => !_cxMeasure(t)); });
    if (!blank.length) break; await sleep(300);
  }
  check('FICHAS.ninguna_preview_vacia', blank.length === 0, blank);
  const vetStates = await E(() => ({ c: codexCreatureState('ab_heraldo'), b: codexBossState(codexBossDef('hechicero_final')), n: codexCounts() }));
  check('DESC.progreso_real_revela_todo', vetStates.c === 'defeated' && vetStates.b === 'defeated' && vetStates.n.creatures[2] === vetStates.n.creatures[1], vetStates);

  // campeones: galería → ficha → elegir → equipo/talentos/maestría → skins
  await E(() => { codexStack = [codexStack[0]]; codexGo('list', 'campeones', 'GUARDIAS'); }); await sleep(250);
  await page.click('#codex-body .cx-champ-card[data-go="champ:musashi"]'); await sleep(300);
  check('CAMP.ficha_con_preview', await vis('#codex-body .cx-entry-champ .cx-stage-pv'));
  await page.click('#cx-pick-btn'); await sleep(200);
  const picked = await E(() => ({ sel: selectedClass, last: save.lastChamp, active: !!document.querySelector('.cx-active') }));
  check('CAMP.elegir_para_jugar', picked.sel === 'musashi' && picked.last === 'musashi' && picked.active, picked);
  await page.locator('#codex-body [data-skill]').nth(0).click(); await sleep(250);
  const sk = await E(() => { const p = CODEX_PV.get(document.querySelector('.cx-stage-pv')); return p && p.spec; });
  check('CAMP.preview_de_habilidad', sk && sk.anim === 'skill' && sk.skill.fx === 'dash', sk);
  if (OUT) { await sleep(900); await page.screenshot({ path: OUT + '/codex_skill.png' }); }
  const ult = await E(() => { const b = [...document.querySelectorAll('[data-anim]')].find(x => /★/.test(x.textContent)); b.click(); const p = CODEX_PV.get(document.querySelector('.cx-stage-pv')); return p.spec.skill && p.spec.skill.fx; });
  check('CAMP.preview_de_definitiva', ult === 'ult', ult);
  for (const [tab, sel, n] of [['equipo', '#cx-hub-panel .inv-capacity', 1], ['talentos', '#cx-hub-panel .tt-node', 12], ['habilidades', '#cx-hub-panel .mastery-row', 4]]) {
    await page.click(`#codex-body [data-ctab="${tab}"]`); await sleep(200);
    const c = await page.locator(sel).count();
    check('CAMP.pestana_' + tab, c >= n, c);
  }
  await page.click('#codex-body [data-ctab="ficha"]'); await sleep(200);
  const skins = await E(() => ({ n: document.querySelectorAll('#codex-body [data-skin]').length }));
  check('CAMP.skins_listadas', skins.n >= 2, skins);
  await page.locator('#codex-body [data-skin]').nth(1).click(); await sleep(250);
  const skinPv = await E(() => ({ skin: CODEX_PV.get(document.querySelector('.cx-stage-pv')).spec.skin, box: !!document.querySelector('#cx-skin-detail .cx-skin-box'), btn: !!document.querySelector('#cx-skin-shop, #cx-skin-equip, .cx-skin-box .cx-active') }));
  check('CAMP.skin_cambia_la_preview', skinPv.skin === 'errante' && skinPv.box && skinPv.btn, skinPv);
  // skin → Tienda real y vuelta al Códice
  if (await vis('#cx-skin-shop')) {
    await page.click('#cx-skin-shop'); await sleep(250);
    const inShop = await E(() => ({ st: state, tab: shopTab }));
    await page.click('#shop-back-btn'); await sleep(250);
    check('CAMP.skin_abre_la_tienda_real_y_vuelve', inShop.st === 'shop' && inShop.tab === 'skins' && await vis('#codex-screen'), inShop);
  }
  // Mi Inventario desde el Códice
  await E(() => { codexStack = [codexStack[0]]; codexGo('list', 'campeones', 'GUARDIAS'); }); await sleep(200);
  await page.click('#codex-inv-btn'); await sleep(250);
  const invOk = await vis('#inventory-screen');
  await page.click('#myinv-back-btn'); await sleep(250);
  check('CAMP.mi_inventario_ida_y_vuelta', invOk && await vis('#codex-screen'));

  // navegación cruzada: criatura → arena → jefe → arena, migas y atrás
  await E(() => { codexStack = [codexStack[0]]; codexGo('list', 'bestiario', 'BESTIARIO'); }); await sleep(200);
  await page.click('#codex-body [data-go="creature:automata"]'); await sleep(250);
  await page.click('#codex-body .cx-links [data-go="arena:fortaleza"]'); await sleep(250);
  const crumbs1 = await E(() => codexStack.map(s => s.label).join(' > '));
  check('NAV.criatura_a_arena', (await E(() => codexCur().view)) === 'arena', crumbs1);
  await page.click('#codex-body [data-go="boss:caballero"]'); await sleep(250);
  const crumbs2 = await E(() => ({ c: codexStack.map(s => s.label).join(' > '), v: codexCur().view }));
  check('NAV.arena_a_jefe_con_migas', crumbs2.v === 'boss' && /CÓDICE > .* > Caballero/.test(crumbs2.c), crumbs2);
  await page.locator('#codex-body .cx-skill').nth(1).click(); await sleep(200);
  const bs = await E(() => CODEX_PV.get(document.querySelector('.cx-stage-pv')).spec);
  check('JEFE.preview_de_habilidad', bs.anim === 'skill' && bs.skill.set === 'shield', bs);
  if (OUT) { await sleep(900); await page.screenshot({ path: OUT + '/codex_boss.png' }); }
  await page.click('#codex-body .cx-links [data-go="arena:fortaleza"]'); await sleep(250);
  check('NAV.jefe_a_arena', (await E(() => codexCur().view)) === 'arena');
  const depth = await E(() => codexStack.length);
  await page.click('#codex-back-btn'); await sleep(150);
  check('NAV.atras', (await E(() => codexStack.length)) === depth - 1);
  await E(() => codexCrumbTo(0)); await sleep(150);
  check('NAV.miga_al_inicio', (await E(() => codexCur().view)) === 'home');
  await page.click('#codex-back-btn'); await sleep(200);
  check('NAV.atras_vuelve_al_menu', await vis('#mainmenu-screen'));
  // flechas ‹ › entre fichas
  await E(() => { openCodex(); codexLink('boss:minotauro'); }); await sleep(200);
  await page.click('#codex-body [data-step="1"]'); await sleep(200);
  check('NAV.siguiente_ficha', (await E(() => codexCur().id)) === 'ab_carcelero');

  // maquetación en celular horizontal (844×390 y 667×375)
  for (const [w, h] of [[844, 390], [667, 375]]) {
    await page.setViewportSize({ width: w, height: h });
    for (const v of [['list', 'bestiario'], ['boss', 'mago_gelido'], ['champ', 'eren'], ['arena', 'abismo'], ['creature', 'ab_jinete']]) {
      await E(([v, id]) => { codexStack = [{ view: 'home', label: 'CÓDICE' }]; if (v === 'list') codexGo('list', id, id.toUpperCase()); else codexLink(v + ':' + id); }, v); await sleep(250);
      const o = await noOverflow();
      const back = await E(() => { const r = document.getElementById('codex-back-btn').getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight && r.height >= 34; });
      check(`LAYOUT.${w}x${h}.${v.join(':')}`, !o.hscroll && o.bad.length === 0 && back, o);
    }
  }
  if (OUT) await page.screenshot({ path: OUT + '/codex_667.png' });
  await page.setViewportSize({ width: 844, height: 390 });

  // rendimiento: el Bestiario completo (muchas previews) sigue fluido
  await E(() => { codexStack = [{ view: 'home', label: 'CÓDICE' }]; codexFilter.bestiario = 'todas'; codexGo('list', 'bestiario', 'BESTIARIO'); }); await sleep(600);
  const perf = await E(() => new Promise(res => { const ts = []; let last = performance.now();
    const f = () => { const n = performance.now(); ts.push(n - last); last = n; if (ts.length < 90) requestAnimationFrame(f); else { ts.sort((a, b) => a - b); res({ med: ts[45], p90: ts[81], canvases: document.querySelectorAll('#codex-body canvas').length }); } };
    requestAnimationFrame(f); }));
  check('PERF.bestiario_fluido', perf.med < 34, perf);
  const lazy = await E(() => [...document.querySelectorAll('#codex-body img')].every(im => im.loading === 'lazy'));
  check('PERF.carga_diferida_de_imagenes', lazy);

  // no rompe el inicio de partida: elegir en el Códice → Modos de juego → arena → sala con ese campeón
  await E(() => { codexStack = [{ view: 'home', label: 'CÓDICE' }]; codexLink('champ:cazadora'); }); await sleep(200);
  await page.click('#cx-pick-btn'); await sleep(150);
  await E(() => { setState('mainmenu'); renderMainMenu(); });
  await page.click('#mainmenu-jugar-btn'); await page.click('#mode-arena-btn'); await sleep(150);
  await page.click('.arena-card[data-arena="fortaleza"]'); await sleep(250);
  const sel = await E(() => ({ st: state, sel: selectedClass, card: !!document.querySelector('#champ-grid .champ-card.selected') }));
  check('REGRESION.eleccion_llega_a_la_sala', sel.sel === 'cazadora' && sel.st === 'menu' && sel.card, sel);

  check('SIN_ERRORES', errors.length === 0, errors);
  await browser.close();
  console.log(fails ? `${fails} FALLAS` : 'OK');
  process.exit(fails ? 1 : 0);
})();
