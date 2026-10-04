// LA HORDA — REFUERZOS DE HABILIDAD en cooperativo (2 clientes reales contra el relay):
//   - al superar un nivel, el invitado recibe SUS cartas (armadas con su guardián) con 1-2 refuerzos
//   - elige un refuerzo de habilidad -> el ANFITRIÓN lo aplica a su héroe (y a nadie más)
//   - el refuerzo llega al invitado por el snapshot (tooltip/marca de su botón) y se dispara cuando
//     el invitado lanza esa habilidad (zona/efecto visible en los dos)
// uso: SITE=http://127.0.0.1:8822 RELAY=ws://127.0.0.1:8832 node tools/net-test/boons_coop.js
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const SITE = process.env.SITE || 'http://127.0.0.1:8822';
const RELAY = process.env.RELAY || 'ws://127.0.0.1:8832';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0;
const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 500) : '')); if (!ok) fails++; };
async function client(browser, name, champ) {
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 560 } });
  await ctx.addInitScript(([n]) => { try { if (!localStorage.getItem('__s')) { localStorage.clear(); localStorage.setItem('__s', '1'); localStorage.setItem('horda_name', n); } } catch (e) {} }, [name]);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
  await page.goto(`${SITE}/index.html?server=${encodeURIComponent(RELAY)}`, { waitUntil: 'load', timeout: 240000 });
  for (let k = 0; k < 600; k++) { if (await page.evaluate(() => { const b = document.getElementById('title-continue-btn'); return b && !b.disabled; })) break; await sleep(100); }
  await page.evaluate(([c]) => { for (const k in save.champions) save.champions[k].level = 20; save.champions[c].unlocked = true; save.starterChosen = true; save.tut = Object.assign(save.tut || {}, { training: 1 }); selectedClass = c; save.lastChamp = c; save.stash = []; persistNow(); }, [champ]);
  return { ctx, page, errors, name };
}
const ev = (c, fn, a) => c.page.evaluate(fn, a);
async function press(c, sel) { await c.page.evaluate(s => { if (typeof prepSecReveal === 'function') prepSecReveal(s); }, sel).catch(() => {}); await c.page.click(sel); await sleep(450); } // prepSecReveal: pestaña de la Sala que lo contiene
async function waitFor(c, fn, a, ms) { for (let k = 0; k < (ms || 20000)/150; k++) { if (await ev(c, fn, a)) return true; await sleep(150); } return false; }
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const A = await client(browser, 'Ana', 'guerrero');
  await press(A, '#title-continue-btn'); await press(A, '#mainmenu-jugar-btn'); await press(A, '#mode-arena-btn');
  await press(A, '.arena-card[data-arena="ciudad"]'); await press(A, '#start-btn');
  await press(A, '#net-create-btn');
  await waitFor(A, () => !!net.code);
  const code = await ev(A, () => net.code);
  const B = await client(browser, 'Beto', 'mago');
  await press(B, '#title-continue-btn'); await press(B, '#mainmenu-jugar-btn');
  await B.page.fill('#mode-join-code', code); await press(B, '#mode-join-btn');
  await waitFor(B, () => net.role === 'guest' && state === 'prep');
  await ev(B, () => { document.getElementById('net-ready-btn').click(); });
  await sleep(800);
  await ev(A, () => { document.getElementById('prep-start-btn').click(); });
  const both = await waitFor(A, () => state === 'playing', null, 60000) && await waitFor(B, () => state === 'playing', null, 60000);
  check('partida.arranca_para_los_dos', both);
  await sleep(2000);
  await ev(A, () => { for (const h of heroes) h.invulnTimer = 1e9; levelTimer = levelDuration + 1; });
  const gBuff = await waitFor(B, () => state === 'buff' && document.querySelectorAll('#buff-cards .buff-card').length === 3, null, 30000);
  const hBuff = await waitFor(A, () => state === 'buff');
  const gCards = await ev(B, () => [...document.querySelectorAll('#buff-cards .buff-card')].map(c => ({ boon: c.classList.contains('boon'), t: c.textContent.replace(/\s+/g, ' ').trim().slice(0, 90) })));
  const opts = await ev(A, () => { const o = (netMatch && netMatch.buffOpts1) || []; return { o, champs: o.filter(x => x.startsWith('boon:')).map(x => BOON_BY_ID[x.split(':')[1]].champ) }; });
  check('invitado.cartas_con_refuerzo_de_SU_guardian', gBuff && hBuff && gCards.filter(c => c.boon).length >= 1 && opts.champs.length >= 1 && opts.champs.every(c => c === 'mago'), { gCards, opts });
  // el anfitrión elige genérico; el invitado, el refuerzo de habilidad
  await ev(A, () => { const c = [...document.querySelectorAll('#buff-cards .buff-card')].find(c => !c.classList.contains('boon')) || document.querySelector('#buff-cards .buff-card'); c.click(); });
  await ev(B, () => { document.querySelector('#buff-cards .buff-card.boon').click(); });
  const resumed = await waitFor(A, () => state === 'playing') && await waitFor(B, () => state === 'playing');
  const hostSide = await ev(A, () => ({ guest: Object.keys(heroes[1].boons || {}), host: Object.keys(player.boons || {}).filter(id => BOON_BY_ID[id]), guestChamp: heroes[1].classKey }));
  check('anfitrion.aplica_el_refuerzo_al_heroe_del_invitado', resumed && hostSide.guest.length === 1 && hostSide.guestChamp === 'mago', hostSide);
  const synced = await waitFor(B, () => Object.keys(player.boons || {}).length === 1, null, 8000);
  const gHud = await ev(B, () => { boonHudTick(); return { boons: player.boons, pip: !!document.querySelector('.ability-btn .boon-pip'), title: [...document.querySelectorAll('.ability-btn')].map(b => b.title).join(' | ').includes('✦') }; });
  check('invitado.ve_su_refuerzo_en_el_boton', synced && gHud.pip && gHud.title, gHud);
  // el invitado lanza la habilidad transformada: el efecto sale del anfitrión y se ve en los dos
  const id = hostSide.guest[0];
  const skillIdx = await ev(A, ([id]) => { const b = BOON_BY_ID[id]; return b.skill; }, [id]);
  await ev(A, ([idx]) => { const g = heroes[1]; g.energy = g.maxEnergy; g.cds = [0,0,0]; for (let i = 0; i < 6; i++){ const e = spawnEnemy('duende_bosque', false); e.x = g.x + 60 + i*25; e.y = g.y + (i%2?20:-20); e.hp = e.maxHp = 1e6; e.speed = 0; e.atkCd = 1e9; } }, [skillIdx]);
  await sleep(400);
  await ev(B, ([idx]) => { player.cds = [0,0,0]; player.energy = player.maxEnergy; useSkill(idx); }, [skillIdx]);
  await sleep(1200);
  const fx = { host: await ev(A, () => ({ zones: champFx.filter(f => f.type === 'boonZone').length, hit: enemies.filter(e => e.maxHp === 1e6 && e.hp < e.maxHp).length })),
    guest: await ev(B, () => ({ zones: champFx.filter(f => f.type === 'boonZone').length })) };
  check('invitado.lanza_y_el_refuerzo_se_dispara', fx.host.hit > 0 || fx.host.zones > 0, { id, fx });
  // zona en el piso: el anfitrión le da "Escarcha Persistente" al héroe del invitado; el invitado lanza la Nova y ve la escarcha
  await ev(A, () => { boonGrant(heroes[1], 'mg_escarcha', 2); });
  await waitFor(B, () => boonOwned(player, 'mg_escarcha') >= 0, null, 8000);
  await ev(B, () => { player.cds = [0,0,0]; player.energy = player.maxEnergy; useSkill(1); });
  const gz = await waitFor(B, () => champFx.some(f => f.type === 'boonZone' && f.look === 'frost'), null, 6000);
  const hz = await ev(A, () => champFx.filter(f => f.type === 'boonZone' && f.look === 'frost').map(f => f.owner === heroes[1]));
  check('invitado.ve_la_zona_de_su_refuerzo', gz && hz.length >= 1 && hz.every(Boolean), { gz, hz });
  if (process.env.SHOT) { await B.page.screenshot({ path: process.env.SHOT }); }
  check('sin_errores', A.errors.length === 0 && B.errors.length === 0, { A: A.errors.slice(0, 3), B: B.errors.slice(0, 3) });
  console.log(`SUMMARY ${fails === 0 ? 'OK' : 'FAIL'} fails=${fails}`);
  await browser.close();
  process.exit(fails ? 1 : 0);
})();
