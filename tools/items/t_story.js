// LA HISTORIA JUGANDO (js/systems/story.js + js/data/story-text.js): actos, prólogo por pantallas, voces
// de los jefes en el cuadro de voz (con la regla de "no más de 2 textos a la vez"), voces de los guardianes,
// Crónicas (piso / subjefe / victoria) y su lectura en el Códice, escenas de salida en la pantalla de
// victoria, voz al caer en la de derrota y el epílogo con post-créditos al completar la Infernal.
//   (python3 -m http.server 8821 &) ; SE_BASE_URL=http://127.0.0.1:8821 node tools/items/t_story.js [carpeta_capturas]
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const BASE = process.env.SE_BASE_URL || 'http://127.0.0.1:8821';
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
  await page.goto(`${BASE}/index.html`, { waitUntil: 'load', timeout: 180000 });
  for (let k = 0; k < 300; k++) { if (await page.evaluate(() => !document.getElementById('title-continue-btn').disabled)) break; await sleep(100); }
  await sleep(600);
  const E = (fn, a) => page.evaluate(fn, a);
  await E(() => { loop = function(){};
    window.__start = (a, lv, cls) => { for (const k of Object.keys(save.champions)) save.champions[k].unlocked = true;
      selectedClass = cls || 'guerrero'; currentArena = a; lobbyAllies = ['tanque','soporte','mago']; startRun(lv || 1); spawnTimer = 1e12; enemies.length = 0; };
    // un cuadro = simulación + HUD (el HUD corre tutTick → storyTick: la cola de voces y las páginas)
    window.__step = (ms) => { let t = 0; while (t < ms && state === 'playing') { for (const h of heroes){ h.hp = h.maxHp; } update(16); updateHUD(); t += 16; } };
    window.__kill = (e) => { e.hp = 1; damageEnemy(e, 999999, {src:player}); };
    window.__tut = () => ({ who: document.querySelector('#tut-panel .tut-who').textContent, text: document.querySelector('#tut-panel .tut-text').textContent,
      face: document.getElementById('tut-panel').dataset.face, key: TUT.key });
    window.__read = () => { TUT.until = 0; }; // "ya se leyó": libera el cuadro para la próxima línea
    save.tut = save.tut || {}; ['basics','b_move','b_attack','b_skill','b_end','cooldown','hurt','energy','elite','boss','levelup','skillup','revive'].forEach(k => save.tut[k] = 1);
    window.__quiet = () => { _arenaTitleUntil = 0; const b = document.getElementById('center-banner'); b.classList.remove('show'); const bi = document.getElementById('boss-intro'); bi.classList.add('hidden'); };
  });

  // ---------------- DATOS ----------------
  const d = await E(() => {
    const acts = STORY_ACTS.flatMap(a => a.arenas);
    const pages = CHRONICLE_PAGES, ids = new Set(pages.map(p => p.id));
    const badPages = pages.filter(p => !chronicleBook(p.book) || !ARENA_ORDER.includes(p.arena) || !['world','sub','boss'].includes(p.src) || !p.text || p.text.length < 200).map(p => p.id);
    const perArena = Object.fromEntries(ARENA_ORDER.map(a => [a, pages.filter(p => p.arena === a).length]));
    const emptyBooks = CHRONICLE_BOOKS.filter(b => !pages.some(p => p.book === b.id)).map(b => b.id);
    const champs = CHAMPION_CATALOG.map(c => c.id), noVoice = champs.filter(k => !(HERO_VOICES[k] && HERO_VOICES[k].pick && HERO_VOICES[k].win && HERO_VOICES[k].fall));
    const ghostVoice = Object.keys(HERO_VOICES).filter(k => !CLASSES[k]);
    const badBoss = Object.keys(BOSS_VOICES).filter(id => id !== 'rey_horda' && id !== 'cm_funcion' && id !== 'dobladores' && !ENEMY_BASE[id]);
    const bossesNoVoice = CODEX_BOSSES.filter(b => b.arena !== 'divina').filter(b => !b.forms.some(f => { const t = f.split('#')[0]; return BOSS_VOICES[STORY_VOICE_ALIAS[t] || t] || (t === 'demonio_mayor'); })).map(b => b.id);
    // la Horda nunca habla: ninguna voz la tiene como hablante
    const hordeSpeaks = Object.values(BOSS_VOICES).some(V => /^LA HORDA$/i.test((typeof V.who === 'string' ? '' : V.who.name) || ''));
    return { acts, dup: ids.size !== pages.length, n: pages.length, badPages, perArena, emptyBooks, noVoice, ghostVoice, badBoss, bossesNoVoice, hordeSpeaks };
  });
  check('DATOS.tres_actos_cubren_las_diez_arenas_en_orden', JSON.stringify(d.acts) === JSON.stringify(await E(() => ARENA_ORDER.slice())), d.acts);
  check('DATOS.cronicas_validas', !d.dup && d.n >= 20 && d.badPages.length === 0 && d.emptyBooks.length === 0, d);
  check('DATOS.cada_arena_con_al_menos_dos_paginas', Object.values(d.perArena).every(n => n >= 2), d.perArena);
  check('DATOS.cada_guardian_jugable_con_sus_3_lineas', d.noVoice.length === 0 && d.ghostVoice.length === 0, d);
  check('DATOS.cada_jefe_de_campaña_tiene_voz', d.badBoss.length === 0 && d.bossesNoVoice.length === 0 && !d.hordeSpeaks, d);

  // ---------------- PRÓLOGO + ACTO I + FICHA ----------------
  const pro = await E(() => { save.storyPrologueSeen = false; save.storyActsSeen = {}; selectedClass = 'tanque'; state = 'menu';
    const el = document.getElementById('run-intro'), seen = []; let went = 0;
    runIntroShow('ciudad', () => { went++; });
    for (let i = 0; i < 6 && RUN_INTRO.open; i++){
      seen.push({ who: el.querySelector('.ri-who').textContent, t: el.querySelector('.ri-arena').textContent, pro: el.classList.contains('ri-prologue') });
      if (!el.classList.contains('ri-prologue')) break;
      RUN_INTRO.t0 = 0; runIntroGo();
    }
    const ficha = { act: (el.querySelector('.ri-act')||{}).textContent, hero: (el.querySelector('.ri-hero')||{}).textContent, say: el.querySelector('.ri-say').textContent };
    RUN_INTRO.t0 = 0; runIntroGo();
    return { seen, ficha, went, again: (() => { runIntroShow('ciudad', () => {}); const p = el.classList.contains('ri-prologue'); RUN_INTRO.t0 = 0; runIntroGo(); return p; })() }; });
  check('PROLOGO.tres_pantallas_y_despues_el_acto_I', pro.seen.length === 5 && pro.seen.slice(0, 3).every(s => s.who === 'PRÓLOGO' && s.pro) && pro.seen[3].who === 'ACTO I' && /GUÍA/.test(pro.seen[3].t) && !pro.seen[4].pro, pro.seen);
  check('FICHA.dice_el_acto_y_habla_tu_guardian', /ACTO I/.test(pro.ficha.act) && /puerta norte/.test(pro.ficha.hero) && /Esta es tu ciudad/.test(pro.ficha.say), pro.ficha);
  check('PROLOGO.una_sola_vez_por_perfil', pro.again === false, pro.again);
  const act2 = await E(() => { state = 'menu'; runIntroShow('micelial', () => {}); const el = document.getElementById('run-intro');
    const r = { who: el.querySelector('.ri-who').textContent, t: el.querySelector('.ri-arena').textContent, txt: el.querySelector('.ri-say').textContent };
    while (RUN_INTRO.open){ RUN_INTRO.t0 = 0; runIntroGo(); if (!el.classList.contains('ri-prologue')) { RUN_INTRO.t0 = 0; runIntroGo(); } } return r; });
  check('ACTO_II.cartel_al_entrar_al_Reino_Fungico', act2.who === 'ACTO II' && /ECOS/.test(act2.t) && /esporas/.test(act2.txt), act2);

  // ---------------- VOCES DE LOS JEFES ----------------
  const v1 = await E(() => { __start('hielo', 10); runLevel = LEVEL_COUNT; levelTimer = levelDuration + 1; __step(64); __quiet();
    const t = boss && boss.type; __step(64); const intro = __tut(); return { t, intro }; });
  check('VOZ.presentacion_del_jefe_con_su_nombre_y_retrato', v1.t === 'mago_hielo_cristal' && v1.intro.who === 'EL MAGO GÉLIDO' && /espero a otro/.test(v1.intro.text) && v1.intro.face === 'guardian', v1);
  const v2 = await E(() => { __read(); __quiet(); boss.hp = boss.maxHp*0.55; __step(80); __quiet(); __step(64); return __tut(); });
  check('VOZ.frase_al_cambiar_de_fase', /todavía me obedece/.test(v2.text), v2);
  const v3 = await E(() => { __read(); __quiet(); __kill(boss); __step(48); __quiet(); __step(48); return { tut: __tut(), t: boss && boss.type }; });
  check('VOZ.muerte_que_es_transformacion', v3.t === 'angel_caido_hielo' && /por qué no volviste/.test(v3.tut.text), v3);
  const v4 = await E(() => { __read(); __quiet(); __step(48); return __tut(); });
  check('VOZ.el_demonio_gelido_se_presenta', v4.who === 'EL DEMONIO GÉLIDO' && /NADIE ADENTRO/.test(v4.text), v4);
  // regla: no más de 2 textos a la vez (cartel grande + cartel del centro ya en pantalla → la voz espera)
  const g = await E(() => { __read(); __step(16); STORY.q.length = 0;
    arenaTitleCard('PRUEBA', 'TÍTULO', 'sub', 3000); showBanner('CARTEL');
    const n = storyOtherTexts(); storySay('hech', 'Línea de prueba que tiene que esperar su turno.'); STORY.gateT = 0; __step(32);
    const blocked = __tut().text !== 'Línea de prueba que tiene que esperar su turno.';
    _arenaTitleUntil = 0; STORY.gateT = 0; __step(32);
    return { n, blocked, after: __tut().text }; });
  check('REGLA.no_mas_de_2_textos_a_la_vez', g.n === 2 && g.blocked && /Línea de prueba/.test(g.after), g);
  const vOld = await E(() => { __read(); __quiet(); STORY.q.length = 0; storySay('hech', 'Línea vieja', {wait:1}); const t0 = performance.now(); while (performance.now() - t0 < 5); __step(32); return __tut().text; });
  check('REGLA.una_linea_vieja_no_aparece_tarde', vOld !== 'Línea vieja', vOld);

  // ---------------- SUBJEFE: advertencia + página ----------------
  const s1 = await E(() => { save.chronicles = {}; __start('laberinto', 6); __step(32); __quiet();
    const g = spawnEnemy('guardian_laberinto', false, false); g.x = player.x + 140; g.y = player.y; activeChampion = g; __step(32); __quiet(); __step(32);
    const intro = __tut(); __read(); __kill(g); __step(32); __quiet(); __step(32);
    return { intro, death: __tut(), pages: STORY.pages.map(p => p.src) }; });
  check('SUBJEFE.guardian_del_laberinto_se_presenta_y_advierte', /Cerré mil caminos/.test(s1.intro.text) && /llaves eran cuatro/.test(s1.death.text), s1);
  check('CRONICAS.el_subjefe_suelta_una_pagina', JSON.stringify(s1.pages) === '["sub"]', s1.pages);
  const s2 = await E(() => { __read(); __quiet(); const p = STORY.pages[0]; player.x = p.x; player.y = p.y; __step(32); __quiet(); __step(32);
    const cc = document.getElementById('chron-card');
    const card = cc ? { on: !cc.classList.contains('hidden'), title: cc.querySelector('.cc-title').textContent, t: cc.querySelector('.cc-t').textContent } : null;
    if (typeof chronCardReset === 'function') chronCardReset();
    return { has: chronicleHas('laberinto_2'), left: STORY.pages.length, tut: __tut(), card }; });
  // (la página se lee al levantarla: tarjeta de la Crónica, camp.js; la prueba completa es tools/items/t_camp.js)
  check('CRONICAS.se_junta_al_pisarla_y_se_avisa', s2.has && s2.left === 0 && s2.card && s2.card.on && /Las llaves/.test(s2.card.title) && /muros corridos/.test(s2.card.t), s2);
  // páginas del piso: nivel 4 (y solo si te falta alguna)
  const w1 = await E(() => { __start('bosque', 4); __step(48); const n = STORY.pages.filter(p => p.src === 'world').length;
    save.chronicles.cantos_1 = 1; save.chronicles.cantos_2 = 1; __start('bosque', 4); __step(48); const n2 = STORY.pages.length;
    divinaMode = false; return { n, n2 }; });
  check('CRONICAS.pagina_en_el_piso_del_nivel_4', w1.n === 1, w1);
  check('CRONICAS.no_aparece_si_ya_tenes_todas', w1.n2 === 0, w1);
  const eco = await E(() => { const g0 = save.gold, x0 = save.champions.guerrero.xp; __start('micelial', 4); __step(32); const p = STORY.pages[0];
    player.x = p.x; player.y = p.y; __step(32); return { gold: save.gold - g0, has: chronicleHas('ecos_1') }; });
  check('CRONICAS.no_tocan_la_economia', eco.has && eco.gold === 0, eco);

  // ---------------- VICTORIA: últimas palabras, voz del guardián, Cicatriz y Crónica ----------------
  const vic = await E(async () => { __start('laberinto', 10, 'cazadora'); state = 'playing'; boss = null; finishBossVictory();
    __step(4200); await new Promise(r => setTimeout(r, 200));
    const b0 = document.getElementById('victory-step-body').innerHTML;
    victoryStep = VICTORY_STEPS.length - 1; renderVictoryStep();
    const b3 = document.getElementById('victory-step-body').innerHTML;
    return { st: state, b0, b3, page: chronicleHas('laberinto_3') }; });
  check('VICTORIA.ultimas_palabras_y_voz_del_guardian', vic.st === 'victory' && /LAS [ÚU]LTIMAS PALABRAS/.test(vic.b0) && /Cerré mil caminos/.test(vic.b0) && /Una presa menos/.test(vic.b0), vic.b0.slice(-600));
  check('VICTORIA.escena_de_salida_cicatriz_hechicero_y_cronica', /ACTO II/.test(vic.b3) && /solo el Abismo/.test(vic.b3) && /Cristal de Piedra/.test(vic.b3) && /La piedra/.test(vic.b3) && vic.page, vic.b3.slice(0, 700));
  if (OUT) await page.screenshot({ path: OUT + '/story_victory.png' });
  // ---------------- DERROTA: la voz de tu guardián al caer ----------------
  const def = await E(() => { __start('fortaleza', 3, 'soporte'); showGameOverScreen(); return document.getElementById('go-progress').innerHTML; });
  check('DERROTA.voz_del_guardian_al_caer', /no llegué a todos/.test(def), def.slice(0, 200));

  // ---------------- HECHICERO: huida con la voz del Forjador ----------------
  const hf = await E(() => { __start('infernal', 9); runLevel = 9; STORY.q.length = 0; const h = hechSpawnSubboss(); h.cineT = 0; __step(32); __kill(h);
    return STORY.q.map(x => x.who.name + ': ' + x.text); });
  check('HECHICERO.huye_y_se_oye_al_Forjador', hf.some(t => /EL HECHICERO SUPREMO: Todavía no/.test(t)) && hf.some(t => /UNA VOZ ENCADENADA: .*Me negué a fundirlos/.test(t)), hf);

  // ---------------- EPÍLOGO + POST-CRÉDITOS ----------------
  const ep = await E(async () => { save.storyEpilogueSeen = false; __start('infernal', 10); state = 'playing'; boss = null; finishBossVictory();
    __step(4200); await new Promise(r => setTimeout(r, 1200));
    const el = document.getElementById('story-cine'), open = !!el && !el.classList.contains('hidden');
    const screens = [];
    for (let i = 0; i < 20 && STORY_CINE.open; i++){ screens.push((el.querySelector('.sc-kicker').textContent + ' ' + el.querySelector('.sc-text').textContent + ' ' + el.querySelector('.sc-say').textContent + ' ' + el.querySelector('.sc-note').textContent).trim()); STORY_CINE.t0 = 0; storyCineNext(); }
    return { open, screens, closed: !STORY_CINE.open, seen: !!save.storyEpilogueSeen, st: state, b0: document.getElementById('victory-step-body').innerHTML }; });
  check('EPILOGO.se_abre_al_completar_la_Infernal', ep.open && ep.st === 'victory' && /EP[ÍI]LOGO/.test(ep.screens[0] || ''), ep.screens[0]);
  check('EPILOGO.cuenta_el_final_canon', ep.screens.some(s => /Yo elegí quedarme/.test(s)) && ep.screens.some(s => /siguen necesitando portadores/.test(s)) && ep.screens.some(s => /nuevos Guardianes|NUEVOS GUARDIANES/.test(s)), ep.screens);
  check('EPILOGO.post_creditos_Arena_Divina_y_Horda_Infinita', ep.screens.some(s => /ARENA DIVINA/.test(s)) && ep.screens.some(s => /HORDA INFINITA/.test(s)) && ep.closed && ep.seen, ep.screens.slice(-2));
  check('EPILOGO.ultimas_palabras_del_Rey', /Yo elegí quedarme/.test(ep.b0), ep.b0.slice(-300));
  const ep2 = await E(async () => { const n0 = document.querySelectorAll('#story-cine').length; __start('infernal', 10); state = 'playing'; boss = null; finishBossVictory();
    __step(4200); await new Promise(r => setTimeout(r, 1200)); return { again: STORY_CINE.open, n0 }; });
  check('EPILOGO.solo_la_primera_vez_automatico', ep2.again === false, ep2);

  // ---------------- CÓDICE › CRÓNICAS ----------------
  const cx = await E(() => { state = 'menu'; openCodex(); const strip = document.querySelector('#codex-body .cx-home-chron');
    const home = [...document.querySelectorAll('#codex-body .cx-home-card .cx-home-title')].map(e => e.textContent.replace(/[^A-ZÁÉÍÓÚÑ ]/g, '').trim());
    strip.click(); const list = document.getElementById('codex-body').textContent;
    const btn = document.querySelector('#codex-body .cx-chron-page[data-go="chron:laberinto_2"]'); if (btn) btn.click();
    const art = document.querySelector('#codex-body .cx-parchment'); const txt = art ? art.textContent : '';
    const epi = !!document.querySelector('[data-story-epilogue]');
    return { strip: !!strip, home, head: /CRÓNICAS/.test(list), book: /Diario del Guardián del Laberinto/.test(list), hint: /se encuentra al completar la arena/.test(list), btn: !!btn,
      read: /Las llaves/.test(txt) && /Siempre me sobra una/.test(txt), txt: txt.slice(0, 160), crumbs: document.getElementById('codex-crumbs').textContent, epiInList: /Ver el epílogo/.test(list) }; });
  check('CODICE.franja_de_cronicas_sin_tocar_las_4_secciones', cx.strip && JSON.stringify(cx.home) === '["GUARDIANES","BESTIARIO","JEFES","ARENAS"]', cx.home);
  check('CODICE.lista_por_libro_con_pistas', cx.head && cx.book && cx.hint && cx.epiInList, cx);
  check('CODICE.se_lee_la_pagina', cx.btn && cx.read && /CRÓNICAS/.test(cx.crumbs), cx);
  if (OUT) { await sleep(300); await page.screenshot({ path: OUT + '/story_codex_page.png' }); }
  const cv = await E(() => { codexLink('champ:libertador'); return document.getElementById('codex-body').textContent; });
  check('CODICE.la_ficha_del_guardian_muestra_su_voz', /Su voz/.test(cv) && /Seamos libres/.test(cv), cv.slice(0, 120));
  // ---------------- red ----------------
  const net = await E(() => ({ fns: ['storyVoice','storyPageDrop'].every(n => NET_EVENT_FNS.includes(n)), wrapped: typeof NET_ORIG.storyVoice === 'function' && typeof NET_ORIG.storyPageDrop === 'function' }));
  check('RED.voces_y_paginas_viajan_a_los_invitados', net.fns && net.wrapped, net);
  check('SIN_ERRORES', errors.length === 0, errors);
  await browser.close();
  console.log(fails ? `${fails} FALLAS` : 'OK');
  process.exit(fails ? 1 : 0);
})();
