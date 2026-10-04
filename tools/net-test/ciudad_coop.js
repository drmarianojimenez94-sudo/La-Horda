// LA HORDA — CIUDAD MALDITA en cooperativo (2 clientes reales contra el relay):
//   - el invitado recibe el estado de la arena (civiles, estructuras, zonas) y lo dibuja sin errores
//   - el invitado RESCATA un civil con la acción contextual (la autoridad es del anfitrión)
//   - dos campeones que rescatan al MISMO civil a la vez: un solo líder, nunca un doble rescate
//   - escolta hasta la zona segura: el contador sube igual en los dos clientes
//   - un Raptor secuestra y la alerta llega al invitado
// uso: node tools/net-test/ciudad_coop.js [carpeta_capturas]
//   requiere: python3 -m http.server 8771 (raíz) y PORT=8799 node server/relay.js
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const SITE = process.env.SITE || 'http://127.0.0.1:8771';
const RELAY = process.env.RELAY || 'ws://127.0.0.1:8799';
const OUT = process.argv[2];
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0;
const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 400) : '')); if (!ok) fails++; };
const PHONE = { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };
const DESK = { viewport: { width: 1000, height: 560 } };
async function client(browser, mobile, name, champ) {
  const ctx = await browser.newContext(Object.assign({}, mobile ? PHONE : DESK));
  await ctx.addInitScript(([n]) => { try { if (!localStorage.getItem('__s')) { localStorage.clear(); localStorage.setItem('__s', '1'); localStorage.setItem('horda_name', n); } } catch (e) {} }, [name]);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${SITE}/index.html?server=${encodeURIComponent(RELAY)}`);
  for (let k = 0; k < 300; k++) { if (await page.evaluate(() => { const b = document.getElementById('title-continue-btn'); return b && !b.disabled; })) break; await sleep(100); }
  await page.evaluate(([c]) => { for (const k in save.champions) save.champions[k].level = 12; save.champions[c].unlocked = true; save.starterChosen = true; save.tut = Object.assign(save.tut || {}, { training: 1 }); selectedClass = c; save.lastChamp = c; persistNow(); }, [champ]);
  return { ctx, page, errors, mobile, name };
}
const ev = (c, fn, a) => c.page.evaluate(fn, a);
async function press(c, sel) {
  await c.page.evaluate(s => { if (typeof prepSecReveal === 'function') prepSecReveal(s); }, sel).catch(() => {}); // pestaña de la Sala que lo contiene (js/ui/prep-sections.js)
  if (c.mobile) await c.page.tap(sel); else await c.page.click(sel); await sleep(450); }
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const A = await client(browser, false, 'Ana', 'guerrero');
  await press(A, '#title-continue-btn'); await press(A, '#mainmenu-jugar-btn'); await press(A, '#mode-arena-btn');
  await press(A, '.arena-card[data-arena="ciudad"]'); await press(A, '#start-btn');
  await press(A, '#net-create-btn');
  for (let k = 0; k < 60; k++) { if (await ev(A, () => !!net.code)) break; await sleep(100); }
  const code = await ev(A, () => net.code);
  check('sala.creada_en_la_ciudad', /^[A-Z2-9]{6}$/.test(code || '') && await ev(A, () => currentArena === 'ciudad'), code);
  const B = await client(browser, true, 'Beto', 'mago');
  await press(B, '#title-continue-btn'); await press(B, '#mainmenu-jugar-btn');
  await B.page.fill('#mode-join-code', code); await press(B, '#mode-join-btn');
  for (let k = 0; k < 60; k++) { if (await ev(B, () => net.role === 'guest' && state === 'prep')) break; await sleep(100); }
  await ev(B, () => { document.getElementById('net-ready-btn').click(); });
  await sleep(600);
  await ev(A, () => netHostStartGame());
  for (let k = 0; k < 80; k++) { if (await ev(B, () => state === 'playing') && await ev(A, () => state === 'playing')) break; await sleep(150); }
  await sleep(3000);
  await ev(A, () => { for (const h of heroes) h.invulnTimer = 1e9; });
  const st0 = { host: await ev(A, () => ({ arena: currentArena, total: cmS.total, civ: cmS.civ.length, st: cmS.st.map(s => s.st).join('') })),
    guest: await ev(B, () => ({ arena: currentArena, has: !!cmS, total: cmS && cmS.total, civ: cmS && cmS.civ.length, st: cmS && cmS.st.map(s => s.st).join('') })) };
  check('red.invitado_recibe_el_estado', st0.guest.has && st0.guest.arena === 'ciudad' && st0.guest.total === st0.host.total && st0.guest.civ === st0.host.civ && st0.guest.st === st0.host.st, st0);
  // ---- el invitado rescata un civil (acción contextual -> anfitrión) ----
  const gi = await ev(A, () => heroes.findIndex(h => h.isRemote));
  await ev(A, (gi) => { for (const e of enemies) e.alive = false; enemies = []; const g = heroes[gi]; const p = cmNearestFree(g.x + 60, g.y, 16);
    cmS.civ.push({id:9001, k:1, st:CIV.IDLE, x:p.x, y:p.y, hp:60, t:0, lead:-1, fx:1}); cmS.total++; }, gi);
  await sleep(700);
  const seen = await ev(B, () => !!cmS.ctx.find(t => t.cid === 9001) && !!ctxNearest(player));
  check('red.invitado_ve_el_rescatar', seen);
  await ev(B, () => { const t = cmS.ctx.find(q => q.cid === 9001); ctxSetHold(t); });
  await sleep(1800);
  const r1 = { host: await ev(A, (gi) => { const c = cmCivById(9001); return c && { st: CIV_NAME[c.st], lead: c.lead === gi }; }, gi), guest: await ev(B, () => { const c = cmS.civ.find(o => o.id === 9001); return c && CIV_NAME[c.st]; }) };
  check('red.rescate_del_invitado_autoridad_anfitrion', r1.host && r1.host.st === 'FOLLOW' && r1.host.lead && r1.guest === 'FOLLOW', r1);
  // ---- los dos rescatan al mismo civil a la vez: un solo líder ----
  await ev(A, (gi) => { const g = heroes[gi]; player.x = g.x - 50; player.y = g.y; const p = cmNearestFree(g.x - 10, g.y + 40, 16);
    cmS.civ.push({id:9002, k:0, st:CIV.IDLE, x:p.x, y:p.y, hp:60, t:0, lead:-1, fx:1}); cmS.total++; }, gi);
  await sleep(700);
  await ev(B, () => { const t = cmS.ctx.find(q => q.cid === 9002); if (t) ctxSetHold(t); });
  await ev(A, () => { const t = cmS.ctx.find(q => q.cid === 9002); if (t) player._ctxHold = t.id; });
  await sleep(1600);
  const r2 = await ev(A, () => { const c = cmCivById(9002); return { st: c && CIV_NAME[c.st], lead: c && c.lead, followers: cmS.civ.filter(o => o.id === 9002).length, saved: cmS.saved }; });
  check('red.sin_doble_rescate', r2.st === 'FOLLOW' && r2.lead >= 0 && r2.followers === 1, r2);
  // ---- escolta a la zona segura: el contador sube en los dos ----
  const saved0 = await ev(A, () => cmS.saved);
  await ev(A, (gi) => { const z = CM_SAFE.find(q => q.id === 'puerta'); for (const h of [heroes[gi], player]) { h.x = z.x; h.y = z.y - 10; } for (const c of cmS.civ) if (c.st === CIV.FOLLOW) { c.x = z.x + 20; c.y = z.y; } }, gi);
  await sleep(1500);
  const r3 = { host: await ev(A, () => cmS.saved), guest: await ev(B, () => cmS.saved) };
  check('red.rescatados_iguales_en_los_dos', r3.host >= saved0 + 2 && r3.guest === r3.host, { saved0, r3 });
  // ---- secuestro: la alerta llega al invitado ----
  await ev(A, () => { const p = cmNearestFree(-1100, -120, 16);
    cmS.civ.push({id:9003, k:2, st:CIV.IDLE, x:p.x, y:p.y, hp:60, t:0, lead:-1, fx:1}); cmS.total++; const r = cmSpawnAt('cm_raptor', p.x + 30, p.y); cmId(r); });
  let kid = false, alert = '';
  for (let k = 0; k < 25 && !kid; k++) { await sleep(200); const g = await ev(B, () => { const c = cmS.civ.find(o => o.id === 9003); return { kid: !!c && c.st === CIV.KIDNAPPED, al: cmS.alerts.map(a => a.txt).join(' | ') }; }); kid = g.kid; if (g.al) alert += g.al + ' '; }
  check('red.secuestro_visible_en_el_invitado', kid && /Raptor|Secuestro/.test(alert), { kid, alert });
  if (OUT) { await B.page.screenshot({ path: OUT + '/ciudad_invitado.png' }); await A.page.screenshot({ path: OUT + '/ciudad_anfitrion.png' }); }
  check('sin_errores', A.errors.length === 0 && B.errors.length === 0, { A: A.errors.slice(0, 5), B: B.errors.slice(0, 5) });
  console.log(fails ? `${fails} FALLAS` : 'OK');
  await browser.close();
  process.exit(fails ? 1 : 0);
})();
