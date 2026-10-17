// EL LIBRO DE LA HORDA — capturas de todas las páginas (844×390, Playwright) para revisar el arte y la maquetación.
//   (python3 -m http.server 8821 &) ; node tools/items/capture_codex_book.js <carpeta_de_salida>
// Saca: intro (8 páginas, con un giro a mitad de camino), los 10 fragmentos (historia + lección + resumen),
// la carga corta desde la Sala real, el paso de la victoria, el Códice y la versión vertical.
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const BASE = process.env.SE_BASE_URL || 'http://127.0.0.1:8821', EXE = process.env.PW_EXE || '/opt/pw-browsers';
const OUT = process.argv[2]; if (!OUT) { console.error('Falta la carpeta de salida'); process.exit(2); }
const sleep = ms => new Promise(r => setTimeout(r, ms));
const PART = process.env.CAP_PART || 'all'; // 'rest' = sin la intro ni los fragmentos (ya sacados)
async function boot(browser, opts) {
  const page = await (await browser.newContext(Object.assign({ viewport: { width: 844, height: 390 } }, opts || {}))).newPage();
  await page.addInitScript(() => { window.__campaignMode = true; window.__codexBook = true; });
  await page.goto(`${BASE}/index.html`, { waitUntil: 'load', timeout: 180000 });
  for (let k = 0; k < 300; k++) { if (await page.evaluate(() => { const b = document.getElementById('title-continue-btn'); return !!b && !b.disabled; })) break; await sleep(100); }
  await sleep(600);
  await page.evaluate(() => { loop = function () {}; for (const k of Object.keys(save.champions)) save.champions[k].unlocked = true; save.codexBook.introSeen = true;
    save.tut = save.tut || {}; ['basics','b_move','b_attack','b_skill','b_end','cooldown','hurt','energy','elite','boss','levelup','skillup','revive'].forEach(k => save.tut[k] = 1); });
  return page;
}
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_EXE || '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const page = await boot(browser), E = (fn, a) => page.evaluate(fn, a), shot = n => page.screenshot({ path: `${OUT}/${n}.png` });
  const waitOpen = async v => { for (let k = 0; k < 100; k++) { if ((await E(() => BOOK.open)) === v) return; await sleep(50); } };
  await E(() => { setState('mainmenu'); renderMainMenu(); });
  if (PART === 'all') {
  // intro
  await E(() => { codexBookOpenIntro(); }); await sleep(1300); await shot('intro_01');
  for (let i = 2; i <= 8; i++) { await page.click('#codex-book .bk-next'); if (i === 2) { await E(async () => { const leaf = document.querySelector('#codex-book .bk-leaf'); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); const a = leaf.getAnimations()[0]; if (a) { a.pause(); a.currentTime = 420; } await new Promise(r => requestAnimationFrame(r)); }); await shot('intro_giro_de_pagina'); await E(() => { const a = document.querySelector('#codex-book .bk-leaf').getAnimations()[0]; if (a) a.finish(); }); await sleep(900); } else await sleep(1300); await shot('intro_0' + i); }
  await page.keyboard.press('Escape'); await waitOpen(false);
  // fragmentos
  for (const a of await E(() => Object.keys(BOOK_FRAGMENTS))) {
    await E(a => { codexBookOpenFragment(a, null, { force: true }); }, a); await sleep(1300); await shot('fragmento_' + a + '_1');
    await page.click('#codex-book .bk-next'); await sleep(1500); await shot('fragmento_' + a + '_2');
    if (a === 'infernal') { await page.click('#codex-book .bk-next'); await sleep(1500); await shot('fragmento_infernal_3'); }
    await page.keyboard.press('Escape'); await waitOpen(false);
  }
  }
  if (PART === 'rest') { await E(() => { codexBookOpenFragment('minas', null, { force: true }); }); await sleep(900); await page.click('#codex-book .bk-next'); await sleep(1500); await shot('fragmento_minas_2'); await page.keyboard.press('Escape'); await waitOpen(false); }
  // carga corta desde la Sala (pantalla real de preparación)
  await E(() => { save.storyPrologueSeen = true; save.tut.goalMission = 1; save.storyActsSeen = { I: 1, II: 1, III: 1 }; save.codexBook.shortCount = {}; currentArena = 'laberinto'; selectedClass = 'mago'; lobbyAllies = pickLobbyAllies('mago'); setState('prep'); renderPrepSummary(); });
  await sleep(600); await shot('carga_00_sala');
  await page.click('#prep-start-btn'); await sleep(250); await shot('carga_01_tapa'); await sleep(750); await shot('carga_02_pasando'); await sleep(1100); await shot('carga_03_pagina');
  await waitOpen(false); await sleep(500); await shot('carga_04_ficha_de_la_arena');
  // victoria real
  await E(() => { RUN_INTRO.t0 = 0; runIntroGo(); RUN_INTRO.t0 = 0; runIntroGo(); });
  await E(async () => { window.__start = (a, lv, cls) => { selectedClass = cls || 'guerrero'; currentArena = a; lobbyAllies = ['tanque', 'soporte', 'mago']; startRun(lv || 1); spawnTimer = 1e12; enemies.length = 0; };
    window.__step = ms => { let t = 0; while (t < ms && state === 'playing') { for (const h of heroes) h.hp = h.maxHp; update(16); updateHUD(); t += 16; } };
    __start('hielo', 10, 'mago'); state = 'playing'; boss = null; finishBossVictory(); __step(4200); await new Promise(r => setTimeout(r, 250));
    if (typeof STORY_CINE !== 'undefined' && STORY_CINE.open) storyCineClose(); victoryStep = 3; renderVictoryStep(); });
  await sleep(1500); await shot('victoria_fragmento');
  // Códice
  await E(() => { setState('mainmenu'); renderMainMenu(); }); await sleep(300); await shot('menu_con_insignia_nuevo');
  await E(() => { save.arenasCleared.ciudad = true; save.arenasCleared.hielo = true; delete save.codexBook.frag.ciudad; save.codexBook.introSeen = false; openCodex(); }); await sleep(500);
  await E(() => { document.getElementById('codex-body').scrollTop = 9999; }); await sleep(200); await shot('codice_home_franja_el_libro');
  await page.click('.cx-home-book'); await sleep(500); await shot('codice_el_libro_1'); await E(() => { document.getElementById('codex-body').scrollTop = 9999; }); await sleep(200); await shot('codice_el_libro_2');
  // vertical
  const por = await boot(browser, { viewport: { width: 390, height: 844 } });
  await por.evaluate(() => { codexBookOpenIntro(); }); await sleep(900); await por.click('#codex-book .bk-next'); await sleep(500); await por.screenshot({ path: `${OUT}/vertical_intro.png` });
  await browser.close(); console.log('listo');
})().catch(e => { console.error(e); process.exit(2); });
