// EL LIBRO DE LA HORDA — lógica pura (sin navegador): disparo, omisión, persistencia, migración y cobertura de contenido.
// Carga js/data/codex-book-text.js y js/systems/codex-narrative.js en un contexto de `vm` con el estado del juego simulado.
//   node tools/items/t_codex_book_logic.js
const vm = require('vm'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (!ok && x !== undefined ? '  ' + JSON.stringify(x).slice(0, 300) : '')); if (!ok) fails++; };

const ARENAS = ['ciudad', 'fortaleza', 'bosque', 'micelial', 'hielo', 'acuatica', 'laberinto', 'abismo', 'minas', 'infernal']; // orden canónico (docs/lore/LA_HORDA_LORE_BIBLE.md §2)
const KNOWN_ART = ['tapa', 'guardianes', 'horda', 'cicatriz', 'hechicero', 'mision', 'libro', 'modos', 'progreso', 'equipo', 'maestria', 'talentos', 'dificultad', 'cooperativo', 'tienda', 'brasas', 'postgame', 'recap'];

// contexto limpio por caso: `save` y compañía simulados, con contador de persist()
function ctx(over) {
  const c = { persisted: 0, console };
  vm.createContext(c);
  const pre = `var save = {arenasCleared:{}, champions:{}}; var state = "mainmenu"; var persist = function(){ persisted++; };
    var netInRoom = function(){ return false; }; var netMatch = null; var endlessOn = function(){ return false; }; var divinaMode = false;
    var campaignNumberLabel = function(a){ return String(${JSON.stringify(ARENAS)}.indexOf(a) + 1).padStart(2, "0"); };
    var ARENA_MODS = ${JSON.stringify(Object.fromEntries(ARENAS.map(a => [a, { label: 'Arena ' + a }])))};`;
  vm.runInContext(pre, c);
  for (const f of ['js/data/codex-book-text.js', 'js/systems/codex-narrative.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), c, { filename: f });
  if (over) vm.runInContext(over, c);
  return c;
}
const run = (c, code) => vm.runInContext(code, c);
const J = (c, code) => JSON.parse(run(c, 'JSON.stringify(' + code + ')'));

/* ---------------- CONTENIDO ---------------- */
{
  const c = ctx();
  const frags = J(c, 'BOOK_FRAGMENTS'), intro = J(c, 'BOOK_INTRO_PAGES'), short = J(c, 'BOOK_SHORT_LINES'), req = J(c, 'BOOK_REQUIRED_TOPICS');
  check('CONTENIDO.un_fragmento_por_cada_arena_de_la_campaña', JSON.stringify(Object.keys(frags)) === JSON.stringify(ARENAS), Object.keys(frags));
  check('CONTENIDO.carga_corta_para_cada_arena', JSON.stringify(Object.keys(short)) === JSON.stringify(ARENAS) && Object.values(short).every(t => t.length >= 30 && t.length <= 110), short);
  check('CONTENIDO.introduccion_de_8_paginas_completas', intro.length === 8 && intro.every(p => p.title && p.kicker && p.text && p.art), intro.map(p => p.title));
  const arts = [...intro.map(p => p.art), ...Object.values(frags).map(f => f.topicArt), ...Object.values(frags).flatMap(f => (f.extra || []).map(p => p.art))];
  check('CONTENIDO.toda_ilustracion_existe_o_es_una_arena', arts.every(a => KNOWN_ART.includes(a) || /^arena:/.test(a)), arts.filter(a => !KNOWN_ART.includes(a) && !/^arena:/.test(a)));
  const texts = [...intro.map(p => p.text), ...Object.values(frags).flatMap(f => [f.lore, f.lesson, ...(f.extra || []).map(p => p.text)])];
  check('CONTENIDO.cada_pagina_entra_en_el_libro_(<=360_caracteres)', texts.every(t => t.length >= 120 && t.length <= 360), texts.filter(t => t.length < 120 || t.length > 360).map(t => t.length + ':' + t.slice(0, 30)));
  const cov = J(c, 'codexBookCoverage()');
  check('CONTENIDO.la_campaña_cubre_modos_progresion_talentos_maestria_Brasas_y_mas', cov.missing.length === 0 && req.length >= 10, cov);
  check('CONTENIDO.un_tema_distinto_por_fragmento', new Set(Object.values(frags).map(f => f.topic)).size === ARENAS.length);
  const brasas = frags.minas.lesson, tienda = frags.abismo.lesson;
  check('CONTENIDO.Brasas_y_tienda_sin_presionar_a_comprar', /solo compran apariencia/.test(brasas) && /Nunca compran poder/.test(brasas) && /no hacen falta|ni hacen falta/.test(brasas) && /Nada de eso es obligatorio/.test(tienda) && !/(comprá|conseguí ya|oferta|últim[oa]s|no te lo pierdas|aprovechá)/i.test(brasas + tienda), { brasas, tienda });
  const all = JSON.stringify([intro, frags, short]);
  check('CONTENIDO.voseo_rioplatense_sin_tuteo', !/\b(tienes|puedes|haz clic|elige tu|pulsa|vosotros|ustedes puedes)\b/i.test(all) && /Pasá|Podés|Acordate|mantené/.test(all));
  check('CONTENIDO.sin_spoiler_del_Hechicero_antes_del_fragmento_final', !/(traici|traidor|Rey de la Horda)/i.test(JSON.stringify([intro, Object.fromEntries(Object.entries(frags).filter(([a]) => a !== 'infernal'))])));
  check('CONTENIDO.el_resumen_final_nombra_historia_modos_y_progresion', (frags.infernal.extra || []).length === 1 && /HISTORIA/.test(frags.infernal.extra[0].text) && /MODOS/.test(frags.infernal.extra[0].text) && /PROGRESI/.test(frags.infernal.extra[0].text));
}

/* ---------------- MIGRACIÓN (guardados existentes, sin perder datos) ---------------- */
{
  const c = ctx();
  const fresh = J(c, 'codexBookMigrate({})');
  check('MIGRACION.perfil_nuevo_ve_la_intro', fresh.introSeen === false && fresh.v === 1 && Object.keys(fresh.frag).length === 0 && fresh.shortOff === false, fresh);
  const vet = J(c, 'codexBookMigrate({starterChosen:true, champions:{mago:{unlocked:true}}, arenasCleared:{ciudad:true,fortaleza:true,bosque:false}})');
  check('MIGRACION.guardado_viejo_con_campeon_no_fuerza_la_intro', vet.introSeen === true, vet);
  check('MIGRACION.arenas_ya_superadas_quedan_como_fragmentos_leidos', vet.frag.ciudad === 1 && vet.frag.fortaleza === 1 && !('bosque' in vet.frag), vet.frag);
  const onlyChamp = J(c, 'codexBookMigrate({champions:{mago:{unlocked:true}}})');
  check('MIGRACION.con_campeon_pero_sin_arenas_tampoco_fuerza_la_intro', onlyChamp.introSeen === true);
  const noChampLocked = J(c, 'codexBookMigrate({champions:{mago:{unlocked:false}}, arenasCleared:{}})');
  check('MIGRACION.sin_campeon_desbloqueado_si_ve_la_intro', noChampLocked.introSeen === false);
  const keep = J(c, 'codexBookMigrate({codexBook:{v:1,introSeen:true,introAt:123,frag:{bosque:999},shortCount:{ciudad:2},shortOff:true,futuro:"x"}})');
  check('MIGRACION.lo_ya_guardado_se_conserva_y_no_se_pierden_campos_nuevos', keep.introSeen && keep.introAt === 123 && keep.frag.bosque === 999 && keep.shortCount.ciudad === 2 && keep.shortOff && keep.futuro === 'x', keep);
  const bad = J(c, 'codexBookMigrate({codexBook:{introSeen:"si",frag:[1,2],shortCount:{ciudad:"7",bosque:-3},shortOff:0}})');
  check('MIGRACION.datos_corruptos_se_normalizan', bad.introSeen === true && typeof bad.frag === 'object' && !Array.isArray(bad.frag) && bad.shortCount.ciudad === 7 && bad.shortCount.bosque === 0 && bad.shortOff === false, bad);
  const rt = J(c, 'codexBookMigrate(JSON.parse(JSON.stringify({codexBook:codexBookMigrate({champions:{a:{unlocked:true}},arenasCleared:{ciudad:true}})})))');
  check('MIGRACION.ida_y_vuelta_por_JSON_es_estable', JSON.stringify(rt) === JSON.stringify(J(c, 'codexBookMigrate({champions:{a:{unlocked:true}},arenasCleared:{ciudad:true}})')));
  // codexBookSave: arma/repara save.codexBook sin tocar el resto del guardado
  run(c, 'save.gold = 777; save.codexBook = {v:1, introSeen:true}; codexBookSave();');
  check('MIGRACION.codexBookSave_repara_formas_incompletas_sin_tocar_el_resto', run(c, 'save.gold') === 777 && run(c, 'typeof save.codexBook.frag') === 'object' && run(c, 'save.codexBook.introSeen') === true);
  run(c, 'delete save.codexBook; codexBookSave();');
  check('MIGRACION.sin_campo_lo_crea_con_valores_por_defecto', run(c, 'save.codexBook.introSeen') === false && run(c, 'save.codexBook.v') === 1);
}

/* ---------------- INTRODUCCIÓN: disparo y omisión ---------------- */
{
  const c = ctx();
  check('INTRO.toca_la_primera_vez', run(c, 'codexBookIntroDue()') === true);
  check('INTRO.no_toca_si_el_camino_es_unirse_a_una_sala', run(c, 'codexBookIntroDue({joinsRoom:true})') === false);
  check('INTRO.joinsRoom_no_la_marca_como_vista', run(c, 'save.codexBook.introSeen') === false);
  run(c, 'netInRoom = function(){ return true; }');
  check('INTRO.no_toca_dentro_de_una_sala_(cooperativo)', run(c, 'codexBookIntroDue()') === false);
  run(c, 'netInRoom = function(){ return false; }; netMatch = {};');
  check('INTRO.no_toca_en_partida_online', run(c, 'codexBookIntroDue()') === false);
  run(c, 'netMatch = null; state = "playing";');
  check('INTRO.no_toca_jugando', run(c, 'codexBookIntroDue()') === false);
  run(c, 'state = "paused";'); check('INTRO.no_toca_en_pausa', run(c, 'codexBookIntroDue()') === false);
  run(c, 'state = "starter"; var lanesOn = function(){ return true; };'); check('INTRO.no_toca_en_Guerra_de_Cristales', run(c, 'codexBookIntroDue()') === false);
  run(c, 'lanesOn = function(){ return false; }; var testLabActive = function(){ return true; };'); check('INTRO.no_toca_en_el_Test_Lab', run(c, 'codexBookIntroDue()') === false);
  run(c, 'testLabActive = function(){ return false; };');
  const before = c.persisted;
  run(c, 'codexBookMarkIntro()');
  check('INTRO.omitir_cuenta_como_visto_y_se_guarda', run(c, 'save.codexBook.introSeen') === true && run(c, 'save.codexBook.introAt') > 0 && c.persisted === before + 1);
  check('INTRO.no_vuelve_a_tocar', run(c, 'codexBookIntroDue()') === false);
  run(c, 'codexBookMarkIntro()');
  check('INTRO.marcar_dos_veces_no_reescribe', c.persisted === before + 1);
  check('INTRO.siempre_se_puede_releer_desde_el_Codice_(paginas_disponibles)', J(c, 'codexBookIntroPages()').length === 8);
  const p0 = J(c, 'codexBookIntroPages()'); run(c, 'codexBookIntroPages()[0].title = "X"');
  check('INTRO.las_paginas_son_copias_(editar_no_ensucia_los_datos)', J(c, 'BOOK_INTRO_PAGES')[0].title === p0[0].title);
  const none = J(c, '(function(){ var s = save; save = undefined; var r = codexBookSave(); save = s; return r; })()');
  check('INTRO.sin_guardado_cargado_no_rompe', none && none.introSeen === false);
}

/* ---------------- PRUEBAS AUTOMÁTICAS VIEJAS (webdriver): camino de antes, sin libro por iniciativa propia ---------------- */
{
  const c = ctx('var window = {}; var navigator = {webdriver:true}; var location = {search:""};');
  check('WEBDRIVER.sin_banderas_no_hay_libro_automatico_(intro_ni_carga)', run(c, 'codexBookIntroDue()') === false && run(c, 'codexBookShortDue("bosque")') === false);
  run(c, 'window.__codexBook = true;');
  check('WEBDRIVER.__codexBook_lo_habilita', run(c, 'codexBookIntroDue()') === true && run(c, 'codexBookShortDue("bosque")') === true);
  run(c, 'window.__codexBook = undefined; window.__firstRun = true;');
  check('WEBDRIVER.__firstRun_lo_habilita_(camino_nuevo)', run(c, 'codexBookIntroDue()') === true);
  run(c, 'window.__firstRun = false; location.search = "?primera=1";');
  check('WEBDRIVER.?primera=1_lo_habilita', run(c, 'codexBookIntroDue()') === true);
  run(c, 'location.search = ""; window.__codexBook = false; navigator.webdriver = false;');
  check('WEBDRIVER.__codexBook=false_lo_apaga_siempre', run(c, 'codexBookIntroDue()') === false);
  run(c, 'window.__codexBook = undefined;');
  check('JUGADOR_REAL.sin_webdriver_toca_normalmente', run(c, 'codexBookIntroDue()') === true);
  // los fragmentos y el Códice no dependen de esto: son contenido a pedido
  run(c, 'navigator.webdriver = true; save.arenasCleared.ciudad = true;');
  check('WEBDRIVER.los_fragmentos_siguen_disponibles_(son_a_pedido)', run(c, 'codexBookFragmentUnlocked("ciudad")') === true && J(c, 'codexBookFragmentPages("ciudad")').length === 2);
}

/* ---------------- FRAGMENTOS ---------------- */
{
  const c = ctx();
  check('FRAGMENTO.bloqueado_hasta_completar_la_arena', run(c, 'codexBookFragmentUnlocked("ciudad")') === false);
  run(c, 'save.arenasCleared.ciudad = true; save.arenasCleared.fortaleza = true;');
  check('FRAGMENTO.se_abre_al_completarla', run(c, 'codexBookFragmentUnlocked("ciudad")') === true && run(c, 'codexBookFragmentUnlocked("bosque")') === false);
  check('FRAGMENTO.sin_leer_figura_como_nuevo', JSON.stringify(J(c, 'codexBookUnread()')) === JSON.stringify(['ciudad', 'fortaleza']));
  const n = c.persisted; run(c, 'codexBookMarkFragment("ciudad")');
  check('FRAGMENTO.leerlo_lo_marca_y_guarda', run(c, 'codexBookFragmentSeen("ciudad")') === true && JSON.stringify(J(c, 'codexBookUnread()')) === JSON.stringify(['fortaleza']) && c.persisted === n + 1);
  run(c, 'codexBookMarkFragment("ciudad")');
  check('FRAGMENTO.releer_no_reescribe_el_guardado', c.persisted === n + 1);
  run(c, 'codexBookMarkFragment("noexiste")');
  check('FRAGMENTO.arena_inexistente_se_ignora', run(c, '"noexiste" in save.codexBook.frag') === false);
  const pg = J(c, 'codexBookFragmentPages("ciudad")');
  check('FRAGMENTO.dos_paginas_historia_y_leccion', pg.length === 2 && /ARENA 01/.test(pg[0].kicker) && pg[0].art === 'arena:ciudad' && pg[1].kicker === 'LO QUE APRENDISTE' && /MODO CAMPA/.test(pg[1].text), pg);
  check('FRAGMENTO.la_Infernal_suma_el_resumen_del_libro', J(c, 'codexBookFragmentPages("infernal")').length === 3);
  check('FRAGMENTO.arena_sin_fragmento_devuelve_null', run(c, 'codexBookFragmentPages("divina")') === null);
  check('FRAGMENTO.contador_de_ganados', run(c, 'codexBookFragmentCount()') === 2);
  // un guardado viejo (valor 1) no se muestra como "NUEVO" pero se puede releer, y leerlo lo pasa a fecha real
  const c2 = ctx('save.arenasCleared = {ciudad:true}; save.codexBook = codexBookMigrate({champions:{m:{unlocked:true}}, arenasCleared:{ciudad:true}});');
  check('FRAGMENTO.save_viejo_no_marca_nuevo', J(c2, 'codexBookUnread()').length === 0 && run(c2, 'codexBookFragmentUnlocked("ciudad")') === true);
  run(c2, 'codexBookMarkFragment("ciudad")');
  check('FRAGMENTO.releerlo_en_save_viejo_registra_la_fecha', run(c2, 'save.codexBook.frag.ciudad') > 1);
}

/* ---------------- CARGA CORTA ---------------- */
{
  const c = ctx();
  check('CARGA.toca_en_una_arena_de_campaña', run(c, 'codexBookShortDue("bosque")') === true);
  check('CARGA.arena_fuera_de_campaña_no', run(c, 'codexBookShortDue("divina")') === false);
  const pages = J(c, 'codexBookShortPages("bosque")');
  check('CARGA.es_una_sola_pagina_con_el_nombre_de_la_arena', pages.length === 1 && /ARENA 03/.test(pages[0].kicker) && /BOSQUE/.test(pages[0].title) && pages[0].text.length > 20, pages);
  for (let i = 1; i <= 3; i++) run(c, 'codexBookShortMark("bosque")');
  check('CARGA.tope_de_3_veces_por_arena', run(c, 'codexBookShortDue("bosque")') === false && run(c, 'codexBookShortDue("hielo")') === true && run(c, 'save.codexBook.shortCount.bosque') === 3);
  run(c, 'codexBookSetShortOff(true)');
  check('CARGA.se_puede_apagar_desde_el_Codice', run(c, 'codexBookShortDue("hielo")') === false && run(c, 'save.codexBook.shortOff') === true);
  run(c, 'codexBookSetShortOff(false)');
  check('CARGA.y_volver_a_prender', run(c, 'codexBookShortDue("hielo")') === true);
  run(c, 'netInRoom = function(){ return true; }');
  check('CARGA.nunca_en_una_sala_cooperativa', run(c, 'codexBookShortDue("hielo")') === false);
  run(c, 'netInRoom = function(){ return false; }; endlessOn = function(){ return true; }');
  check('CARGA.no_en_la_Horda_Infinita', run(c, 'codexBookShortDue("hielo")') === false);
  run(c, 'endlessOn = function(){ return false; }; divinaMode = true;');
  check('CARGA.no_en_la_Arena_Divina', run(c, 'codexBookShortDue("hielo")') === false);
  run(c, 'divinaMode = false; state = "playing";');
  check('CARGA.no_durante_una_partida', run(c, 'codexBookShortDue("hielo")') === false);
}

/* ---------------- INTEGRACIÓN ESTÁTICA (los enganches existen) ---------------- */
{
  const rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
  const html = rd('index.html'), save = rd('js/storage/save.js');
  const order = ['js/data/codex-book-text.js', 'js/ui/codex/codex-book-art.js', 'js/ui/codex/codex-book.js', 'js/systems/codex-narrative.js'].map(f => html.indexOf('<script src="' + f + '"></script>'));
  check('ENGANCHE.scripts_y_css_cargados_en_index.html', order.every(i => i > 0) && html.includes('css/codex-book.css'), order);
  check('ENGANCHE.los_datos_cargan_antes_que_la_logica_y_antes_de_main.js', order[0] < order[3] && html.indexOf('js/main.js') > Math.max(...order), order);
  check('ENGANCHE.save.js_trae_el_campo_y_migra', /codexBook:\{v:1/.test(save) && /codexBookMigrate\(parsed\)/.test(save));
  check('ENGANCHE.starter_dispara_la_intro_y_las_salas_la_esquivan', /codexBookMaybeIntro\(go/.test(rd('js/ui/starter-select.js')) && (rd('js/net/net-lobby.js').match(/joinsRoom:true/g) || []).length === 2 && /joinsRoom:true/.test(rd('js/net/net-rooms.js')));
  check('ENGANCHE.run_intro_usa_la_carga_corta', /codexBookShort\(arena/.test(rd('js/ui/run-intro.js')));
  check('ENGANCHE.la_victoria_tiene_su_paso_Fragmento_del_Libro_y_se_omite_solo', /storyVictoryBookHtml/.test(rd('js/systems/story.js')) && /Fragmento del Libro/.test(rd('js/ui/end-screens.js')) && /VICTORY_STEPS\[3\]\.skip/.test(rd('js/ui/end-screens.js')));
  check('ENGANCHE.el_menu_muestra_la_insignia_NUEVO_del_Codice', /codexBookBadgeSync/.test(rd('js/ui/menus.js')) && /function codexBookBadgeSync/.test(rd('js/ui/codex/codex-book.js')));
  check('ENGANCHE.el_Codice_tiene_la_seccion_El_Libro', /codexBookListHtml/.test(rd('js/ui/codex/codex.js')) && /BOOK_SECTION/.test(rd('js/ui/codex/codex.js')));
  const nonet = ['js/systems/codex-narrative.js', 'js/ui/codex/codex-book.js'].map(rd).join('\n');
  check('RED.el_libro_es_local_(nada_viaja_por_la_red)', !/NET_EVENT_FNS|netBroadcast|netSend|fetch\(|WebSocket/.test(nonet));
}

console.log(fails ? '\n' + fails + ' FALLAS' : '\nTODO OK');
process.exit(fails ? 1 : 0);
