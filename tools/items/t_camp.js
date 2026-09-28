// EL CAMPAMENTO DE LOS PORTADORES y LA CRÓNICA LEGIBLE (js/systems/camp.js + js/data/camp-text.js).
//   - DATOS: una línea por personaje en cada arena, pistas de sets del herrero que de verdad caen en la arena
//     siguiente, línea de herrero para cada guardián, cierre de los tres actos, sin "el cuarto" en boca de nadie.
//   - SOLO: victoria -> "Continuar" abre el campamento (antes de la Sala) -> tocar a cada uno -> línea
//     reactiva (civiles perdidos, cristal que llevás) -> "Seguir" (1 toque) -> Sala con la próxima arena.
//     "Repetir esta arena" no pasa por el campamento. Fin de acto: cartel + cierre. Tras el final: el humo.
//   - CÓDICE: Crónicas › Voces del Campamento guarda lo escuchado.
//   - CRÓNICA: al pisar la página, tarjeta 3-4 s (solo: pausa suave; en red: sin pausa) y "Leer en el Códice".
//   (python3 -m http.server 8826 &) ; SE_BASE_URL=http://127.0.0.1:8826 node tools/items/t_camp.js [carpeta_capturas]
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const BASE = process.env.SE_BASE_URL || 'http://127.0.0.1:8826';
const OUT = process.argv[2];
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 400) : '')); if (!ok) fails++; };
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_CERT|fonts\.g|net::|404/.test(m.text())) errors.push('console: ' + m.text().slice(0, 300)); });
  await page.addInitScript(() => { window.__campaignMode = true; });
  await page.goto(`${BASE}/index.html`, { waitUntil: 'load', timeout: 180000 });
  for (let k = 0; k < 400; k++) { if (await page.evaluate(() => !document.getElementById('title-continue-btn').disabled)) break; await sleep(100); }
  await sleep(600);
  const E = (fn, a) => page.evaluate(fn, a);
  const shot = async (n) => { if (OUT) await page.screenshot({ path: `${OUT}/${n}.png` }); };
  // toque real de celular sobre un elemento (como en tools/net-test)
  const tap = async (sel) => { const el = await page.$(sel); if (!el) throw new Error('no existe ' + sel); const b = await el.boundingBox(); if (!b) throw new Error('invisible ' + sel);
    await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); await sleep(350); };
  await E(() => { loop = function(){};
    for (const k of Object.keys(save.champions)) save.champions[k].unlocked = true;
    save.tut = save.tut || {}; ['basics','b_move','b_attack','b_skill','b_end','cooldown','hurt','energy','elite','boss','levelup','skillup','revive'].forEach(k => save.tut[k] = 1);
    window.__start = (a, lv, cls) => { selectedClass = cls || 'guerrero'; currentArena = a; lobbyAllies = ['tanque','soporte','mago']; startRun(lv || 1); spawnTimer = 1e12; enemies.length = 0; };
    window.__step = (ms) => { let t = 0; while (t < ms && state === 'playing') { for (const h of heroes){ h.hp = h.maxHp; } update(16); updateHUD(); t += 16; } };
    // gana la arena de verdad (el cierre real) y deja la victoria en su último paso
    window.__win = async (a, cls) => { __start(a, 10, cls); state = 'playing'; boss = null; finishBossVictory(); __step(4200); await new Promise(r => setTimeout(r, 250));
      if (typeof STORY_CINE !== 'undefined' && STORY_CINE.open) storyCineClose();
      victoryStep = VICTORY_STEPS.length - 1; renderVictoryStep(); };
    window.__camp = () => { const el = document.getElementById('camp'); if (!el) return { open: false };
      return { open: !el.classList.contains('hidden') && CAMP.open, who: el.querySelector('.camp-box-who').textContent, t: el.querySelector('.camp-box-t').textContent,
        sub: el.querySelector('.camp-sub').textContent, actEnd: el.classList.contains('act-end'), names: [...el.querySelectorAll('.camp-who .cw-n')].map(e => e.textContent),
        news: [...el.querySelectorAll('.camp-who.has-new')].map(e => e.dataset.campWho), state, arena: currentArena }; };
  });

  // ---------------- DATOS ----------------
  const d = await E(() => {
    const arenas = ARENA_ORDER.slice(), miss = arenas.filter(a => !CAMP_LINES[a] || !['hech','smith','seer'].every(w => CAMP_LINES[a][w] && CAMP_LINES[a][w].length >= 60 && CAMP_LINES[a][w].length <= 330));
    const setBad = [];
    for (const a of arenas) { const i = ARENA_ORDER.indexOf(a), next = ARENA_ORDER[i + 1] || 'divina', W = SET_ARENA_WEIGHTS[next] || {};
      for (const id of (CAMP_SMITH_SETS[a] || [])) { const nm = SET_DB[id] && SET_DB[id].name, short = nm && nm.replace(/^Set de /, '');
        if (!nm || !(W[id] >= 2) || !CAMP_LINES[a].smith.includes(short)) setBad.push(a + ':' + id + ':' + next); } }
    const heroMiss = CHAMPION_CATALOG.map(c => c.id).filter(k => !CAMP_SMITH_HERO[k]);
    const all = [].concat(...Object.values(CAMP_LINES).map(o => Object.values(o)), Object.values(CAMP_HECH_CRYSTAL), Object.values(CAMP_SMITH_HERO), CAMP_SEER_FALLEN, [CAMP_SEER_AFTER]);
    const cuarto = all.filter(t => /\bel cuarto\b/i.test(t)), outros = STORY_ACTS.filter(A => !A.outro || A.outro.length < 80).map(A => A.n);
    const closing = ARENA_ORDER.filter(a => storyActClosing(a)).join();
    const lore = { mago: GUARDIAN_LAST_WORDS.escarcha, bosque: CAMPAIGN_STORY.bosque.sub, book: chronicleBook('cantos').name };
    return { miss, setBad, heroMiss, cuarto, outros, closing, total: campAllIds().length, lore };
  });
  check('DATOS.tres_voces_en_cada_arena', d.miss.length === 0, d.miss);
  check('DATOS.pistas_del_herrero_son_verdad', d.setBad.length === 0, d.setBad);
  check('DATOS.herrero_para_cada_guardian', d.heroMiss.length === 0, d.heroMiss);
  check('DATOS.cierre_de_los_tres_actos', d.outros.length === 0 && d.closing === 'bosque,laberinto,infernal', d);
  check('LORE.el_Primero_es_el_Hechicero', d.cuarto.length === 0 && /El Primero no cayó/.test(d.lore.mago) && !/primero de los Cuatro/.test(d.lore.bosque) && !/Primer Guardián/.test(d.lore.book), d.lore);

  // ---------------- SOLO: Ciudad -> campamento -> Sala ----------------
  const c0 = await E(async () => { save.campHeard = {}; save.arenasCleared = {}; save.crystals = {}; save.storyEpilogueSeen = false; await __win('ciudad', 'guerrero');
    // tres civiles perdidos en esta partida (la vidente los llora)
    CAMP.pending && (CAMP.pending.lost = 3);
    return { st: state, pending: !!CAMP.pending, next: document.getElementById('victory-next-btn').textContent }; });
  check('SOLO.victoria_con_campamento_pendiente', c0.st === 'victory' && c0.pending && /Continuar ▶/.test(c0.next), c0);
  await tap('#victory-next-btn');
  await sleep(1400);
  let c = await E(() => __camp());
  check('SOLO.continuar_abre_el_campamento_antes_de_la_Sala', c.open && c.state === 'victory' && /EL HECHICERO/.test(c.who) && /yo te encuentro/.test(c.t) && c.names.join() === 'VEDA,EL HECHICERO,ANSELMO', c);
  const seguir = await E(() => { const r = document.querySelector('#camp .camp-go').getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, h: r.height, vis: r.bottom <= innerHeight && r.right <= innerWidth && r.top >= 0 }; });
  check('SOLO.seguir_siempre_visible_y_tocable', seguir.vis && seguir.h >= 40, seguir);
  await shot('camp_01_ciudad_hechicero');
  await tap('[data-camp-who="seer"]'); c = await E(() => __camp());
  check('SOLO.tocar_a_la_vidente', /VEDA/.test(c.who) && /lloro antes/.test(c.t), c);
  await tap('[data-camp-who="seer"]'); c = await E(() => __camp());
  check('SOLO.reacciona_a_los_civiles_perdidos', /lloro a 3 de la Ciudad/.test(c.t), c);
  await tap('[data-camp-who="smith"]'); c = await E(() => __camp());
  check('SOLO.herrero_da_pista_de_sets', /ANSELMO/.test(c.who) && /Corazón del Coloso/.test(c.t), c);
  await shot('camp_02_ciudad_herrero');
  await tap('[data-camp-who="smith"]'); c = await E(() => __camp());
  check('SOLO.herrero_reacciona_a_tu_guardian', /mala guarda/.test(c.t), c);
  const heard = await E(() => Object.keys(save.campHeard || {}).sort());
  check('SOLO.lo_escuchado_queda_guardado', ['ciudad_hech','ciudad_seer','ciudad_smith','x_seer_civ_lost','x_smith_guerrero'].every(k => heard.includes(k)), heard);
  await tap('#camp .camp-go');
  await sleep(500);
  c = await E(() => __camp());
  const sala = await E(() => ({ state, arena: currentArena, lobby: lobbyNextArena }));
  check('SOLO.seguir_en_un_toque_lleva_a_la_Sala_con_la_siguiente', !c.open && sala.state === 'prep' && sala.arena === 'fortaleza', { c, sala });

  // "Repetir esta arena": sin campamento
  const rep = await E(async () => { await __win('fortaleza', 'tanque'); document.getElementById('again-btn').click(); await new Promise(r => setTimeout(r, 300));
    return { st: state, open: CAMP.open, pending: CAMP.pending }; });
  check('SOLO.repetir_no_pasa_por_el_campamento', rep.st !== 'victory' && !rep.open && !rep.pending, rep);

  // ---------------- FIN DEL ACTO I + cristal que llevás ----------------
  const b = await E(async () => { save.crystals = {}; save.crystalWorn = null; await __win('bosque', 'cazadora');
    const scar = document.getElementById('victory-step-body').innerHTML; return { scar: /FIN DEL ACTO I\b/.test(scar) && /Nadie pregunta quién encontró a quién/.test(scar), crystals: crystalsOwned() }; });
  check('ACTO.la_victoria_que_cierra_el_acto_lo_dice', b.scar && b.crystals.includes('ancestral'), b);
  await tap('#victory-next-btn'); await sleep(1300);
  c = await E(() => __camp());
  check('ACTO.el_campamento_abre_con_el_cartel_y_el_cierre', c.open && c.actEnd && /FIN DEL ACTO I/.test(c.who) && /FIN DEL ACTO I/.test(c.sub) && /ternura/.test(c.t), c);
  await shot('camp_03_fin_del_acto_I');
  await tap('#camp .camp-box'); c = await E(() => __camp());
  check('ACTO.tocar_el_cartel_pasa_al_Hechicero', /EL HECHICERO/.test(c.who) && /primer cristal/.test(c.t), c);
  await tap('[data-camp-who="hech"]'); c = await E(() => __camp());
  check('REACTIVO.el_Hechicero_habla_del_cristal_que_llevas', /Cristal Ancestral encima/.test(c.t), c);
  await tap('[data-camp-who="seer"]'); await tap('[data-camp-who="seer"]'); c = await E(() => __camp());
  check('REACTIVO.la_vidente_cuenta_los_Guardianes_que_duermen', /Uno de los Cuatro ya duerme/.test(c.t), c);
  await tap('#camp .camp-go'); await sleep(300);

  // ---------------- DESPUÉS DEL FINAL: el humo ----------------
  const inf = await E(async () => { save.storyEpilogueSeen = true; await __win("infernal", "mago"); const r = campOpenFromVictory(()=>{}); const act = __camp(); campTalk("hech"); return { r, act, c: __camp() }; });
  check("FINAL.el_campamento_de_la_Infernal_sin_Hechicero", inf.r && /FIN DEL ACTO III/.test(inf.act.who) && inf.c.open && /EL HUMO/.test(inf.c.who) && /nadie habla desde adentro/.test(inf.c.t) && /FIN DEL ACTO III/.test(inf.c.sub), inf.c);
  await E(() => campTalk('smith')); await shot('camp_04_final_herrero');
  await E(() => campClose(true));
  const post = await E(async () => { await __win('hielo', 'mago'); campOpenFromVictory(()=>{}); const r = __camp(); campClose(true); return r; });
  check('FINAL.rejugar_una_arena_el_humo_repite_lo_que_dijo', /EL HUMO/.test(post.who) && /repite lo que dijo/.test(post.t) && /El Mago preguntó/.test(post.t), post);

  // ---------------- NO en la Divina ni en la Horda Infinita ----------------
  const nodiv = await E(() => { campNoteVictory({ arena: 'divina', classKey: 'mago' }); const a = CAMP.pending; return { a }; });
  check('MODOS.sin_campamento_en_la_Divina', nodiv.a === null, nodiv);

  // ---------------- CÓDICE ----------------
  const cx = await E(() => { state = 'menu'; openCodex(); document.querySelector('#codex-body .cx-home-chron').click();
    const list = document.getElementById('codex-body').textContent; const btn = document.querySelector('[data-go="chron:__camp"]'); if (btn) btn.click();
    const art = document.querySelector('#codex-body .cx-parchment'); return { list: /Voces del Campamento/.test(list) && /\d+\/\d+ diálogos/.test(list), btn: !!btn,
      txt: art ? art.textContent : '', crumbs: document.getElementById('codex-crumbs').textContent }; });
  check('CODICE.voces_del_campamento_en_Cronicas', cx.list && cx.btn && /Junto al fuego/.test(cx.txt) && /lloro a 3 de la Ciudad/.test(cx.txt) && /ANSELMO/.test(cx.txt) && /Voces del Campamento/.test(cx.crumbs), { crumbs: cx.crumbs, txt: cx.txt.slice(0, 200) });
  await shot('camp_05_codice_voces');

  // ---------------- CRÓNICA LEGIBLE AL LEVANTARLA ----------------
  const cr = await E(() => { save.chronicles = {}; __start('laberinto', 6); __step(32);
    storyPageDrop(Math.round(player.x + 30), Math.round(player.y), 'laberinto', 'sub'); const p = STORY.pages[0]; player.x = p.x; player.y = p.y; __step(32);
    const el = document.getElementById('chron-card');
    return { has: chronicleHas('laberinto_2'), on: !!el && !el.classList.contains('hidden'), title: el && el.querySelector('.cc-title').textContent, t: el && el.querySelector('.cc-t').textContent,
      slow: slowMoScale, slowT: slowMoTimer, btn: !!(el && el.querySelector('.cc-read')) }; });
  check('CRONICA.se_lee_al_levantarla', cr.has && cr.on && /Las llaves/.test(cr.title) && /muros corridos/.test(cr.t) && cr.btn, cr);
  check('CRONICA.pausa_suave_en_solitario', cr.slow > 0 && cr.slow < 0.5 && cr.slowT >= 3000 && cr.slowT <= 4200, cr);
  await shot('camp_06_cronica_tarjeta');
  await tap('#chron-card .cc-read');
  const rd = await E(() => { const el = document.getElementById('chron-read'); return { on: !!el && !el.classList.contains('hidden'), txt: el ? el.textContent : '', slow: slowMoScale }; });
  check('CRONICA.leer_en_el_Codice_abre_la_pagina_entera_y_detiene', rd.on && /Siempre me sobra una/.test(rd.txt) && /C[ÓO]DICE › CR[ÓO]NICAS/.test(rd.txt) && rd.slow < 0.01, { on: rd.on, slow: rd.slow });
  await shot('camp_07_cronica_leer');
  await tap('#chron-read .cr-close');
  const back = await E(() => ({ on: !document.getElementById('chron-read').classList.contains('hidden'), slow: slowMoScale, t: slowMoTimer }));
  check('CRONICA.volver_a_la_pelea_devuelve_el_tiempo', !back.on && back.slow === 1 && back.t === 0, back);
  // la tarjeta sola se va a los 3-4 s y el tiempo vuelve
  const gone = await E(async () => { chronCardReset(); save.chronicles = {}; __start('laberinto', 6); __step(32); storyPageDrop(Math.round(player.x + 30), Math.round(player.y), 'laberinto', 'sub');
    const p = STORY.pages[0]; player.x = p.x; player.y = p.y; __step(32); await new Promise(r => setTimeout(r, 4300));
    const el = document.getElementById('chron-card'); return { hidden: el.classList.contains('hidden'), slow: slowMoScale }; });
  check('CRONICA.la_tarjeta_se_va_sola_en_3_4_s', gone.hidden && gone.slow === 1, gone);
  // en red: sin pausa
  const net = await E(() => { chronCardReset(); const saved = netMatch; netMatch = { role: 'host' }; slowMoScale = 1; slowMoTimer = 0;
    const ok = campChronCard('ecos_1'); const r = { ok, slow: slowMoScale, t: slowMoTimer, on: !document.getElementById('chron-card').classList.contains('hidden') }; chronCardReset(); netMatch = saved; return r; });
  check('CRONICA.en_cooperativo_sin_pausa', net.ok && net.on && net.slow === 1 && net.t === 0, net);

  check('ERRORES', errors.length === 0, errors.slice(0, 5));
  console.log('SUMMARY', JSON.stringify({ fails }));
  await browser.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.log('FAIL exception', e.stack); process.exit(1); });
