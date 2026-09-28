// LA HORDA — SINERGIAS DE BUILDS en cooperativo (2 clientes reales contra el relay):
//   - el invitado (Mago) trae SUS talentos con sinergia (Voltaje + Conductividad -> Nova) y 2 piezas de SU
//     set (Convergencia Elemental): viajan en el loadout y el ANFITRIÓN los aplica a SU héroe, a nadie más
//   - el invitado lanza la Cadena de Relámpago: la transformación del set (Esfera de Tormenta) sale del
//     anfitrión con dueño = héroe del invitado y se ve en los dos
//   - el botón del invitado cuenta la sinergia y la transformación; al terminar, el guardado del
//     anfitrión no se quedó con nada del invitado
// uso: SITE=http://127.0.0.1:8842 RELAY=ws://127.0.0.1:8852 node tools/net-test/synergies_coop.js
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
  await page.evaluate(([c]) => { for (const k in save.champions) save.champions[k].level = 20; save.champions[c].unlocked = true; save.starterChosen = true; selectedClass = c; save.lastChamp = c; save.stash = []; persistNow(); }, [champ]);
  return { ctx, page, errors, name };
}
const ev = (c, fn, a) => c.page.evaluate(fn, a);
async function press(c, sel) { await c.page.evaluate(s => { if (typeof prepSecReveal === 'function') prepSecReveal(s); }, sel).catch(() => {}); await c.page.click(sel); await sleep(450); }
async function waitFor(c, fn, a, ms) { for (let k = 0; k < (ms || 20000)/150; k++) { if (await ev(c, fn, a)) return true; await sleep(150); } return false; }
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const A = await client(browser, 'Ana', 'guerrero');
  // el anfitrión también tiene un Mago en su guardado, SIN talentos ni set: no tiene que heredar nada
  await ev(A, () => { save.champions.mago.talents = mkTalentState(); save.champions.mago.equipment = mkEquipment(); persistNow(); });
  await press(A, '#title-continue-btn'); await press(A, '#mainmenu-jugar-btn'); await press(A, '#mode-arena-btn');
  await press(A, '.arena-card[data-arena="ciudad"]'); await press(A, '#start-btn');
  await press(A, '#net-create-btn');
  await waitFor(A, () => !!net.code);
  const code = await ev(A, () => net.code);
  const B = await client(browser, 'Beto', 'mago');
  await ev(B, () => { const c = save.champions.mago; c.talents = mkTalentState(); c.talents.nodes = { mg_tem_c1: 3, mg_tem_c2: 3 };
    setPieceIds('convergencia').slice(0, 2).forEach(p => { const it = makeDesignedItem(p); stashItems().push(it); equipItem('mago', it.uid); }); invalidatePassiveCache(); persistNow(); });
  await press(B, '#title-continue-btn'); await press(B, '#mainmenu-jugar-btn');
  await B.page.fill('#mode-join-code', code); await press(B, '#mode-join-btn');
  await waitFor(B, () => net.role === 'guest' && state === 'prep');
  await ev(B, () => { document.getElementById('net-ready-btn').click(); });
  await sleep(800);
  await ev(A, () => { document.getElementById('prep-start-btn').click(); });
  const both = await waitFor(A, () => state === 'playing', null, 60000) && await waitFor(B, () => state === 'playing', null, 60000);
  check('partida.arranca_para_los_dos', both);
  await sleep(1500);
  const host = await ev(A, () => { const g = heroes[1]; return { guestChamp: g.classKey, nova: talentSkillMods('mago', 1).powerMult, hostNova: talentSkillMods('guerrero', 1).powerMult,
    guestSet: setN(g, 'convergencia'), hostSet: setN(player, 'convergencia'), transform: !!champSetTransformOnSkill(g, g.cls.skills[2]) }; });
  check('anfitrion.sinergia_del_invitado_en_SU_heroe', host.guestChamp === 'mago' && Math.abs(host.nova - 0.36) < 1e-6 && host.hostNova === 0, host);
  check('anfitrion.set_de_2_del_invitado_en_SU_heroe', host.guestSet === 2 && host.hostSet === 0 && host.transform, host);
  const gHud = await ev(B, () => { updateAbilityButtons(); return { s2: document.getElementById('btn-s2').title, s3: document.getElementById('btn-s3').title, pip: !!document.querySelector('#btn-s3 .boon-pip') }; });
  check('invitado.boton_con_sinergia_y_transformacion', /Sinergias: \+6% daño .*ahora \+36%/.test(gHud.s2) && /◆ Esfera de Tormenta/.test(gHud.s3) && gHud.pip, gHud);
  // el invitado lanza la Cadena de Relámpago contra muñecos: la esfera de tormenta sale del anfitrión, con dueño = su héroe
  await ev(A, () => { const g = heroes[1]; for (const h of heroes) h.invulnTimer = 1e9; g.energy = g.maxEnergy; g.cds = [0,0,0];
    for (let i = 0; i < 6; i++){ const e = spawnEnemy('duende_bosque', false); e.x = g.x + 60 + i*25; e.y = g.y + (i%2?20:-20); e.hp = e.maxHp = 1e6; e.speed = 0; e.atkCd = 1e9; } });
  await sleep(400);
  await ev(B, () => { player.cds = [0,0,0]; player.energy = player.maxEnergy; useSkill(2); });
  const gz = await waitFor(B, () => champFx.some(f => f.type === 'boonZone' && f.look === 'storm'), null, 6000);
  const hz = await ev(A, () => champFx.filter(f => f.type === 'boonZone' && f.look === 'storm').map(f => f.owner === heroes[1]));
  check('invitado.lanza_y_su_set_transforma_la_habilidad', gz && hz.length >= 1 && hz.every(Boolean), { gz, hz });
  // al terminar, el guardado del anfitrión conserva SU Mago (sin los talentos ni el equipo del invitado)
  const after = await ev(A, () => { netRestoreBackups(); const c = save.champions.mago; return { nodes: Object.keys(c.talents.nodes||{}).length, eq: Object.values(c.equipment||{}).filter(Boolean).length }; });
  check('anfitrion.su_guardado_intacto', after.nodes === 0 && after.eq === 0, after);
  check('sin_errores', A.errors.length === 0 && B.errors.length === 0, { A: A.errors.slice(0, 3), B: B.errors.slice(0, 3) });
  console.log(`SUMMARY ${fails === 0 ? 'OK' : 'FAIL'} fails=${fails}`);
  await browser.close();
  process.exit(fails ? 1 : 0);
})();
