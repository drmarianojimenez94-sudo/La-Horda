// Capturas del nivel 10: revelación de la Madre, sus 3 fases y la secuencia de muerte (con dibujo real).
//   node tools/micelial/shots_boss.js <outdir>
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const fs = require('fs'), path = require('path');
const BASE = process.env.SE_BASE_URL || 'http://127.0.0.1:8771';
const outdir = process.argv[2] || '/tmp/mic_boss'; fs.mkdirSync(outdir, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: +(process.env.VW||1000), height: +(process.env.VH||560) } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message + ' @ ' + (e.stack || '').split('\n').slice(1,3).join(' | ')));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_CERT|fonts\.g|net::/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.goto(`${BASE}/index.html`, { waitUntil: 'load' });
  for (let k = 0; k < 300; k++) { if (await page.evaluate(() => !document.getElementById('title-continue-btn').disabled)) break; await sleep(100); }
  const E = (fn, a) => page.evaluate(fn, a);
  const shot = n => page.screenshot({ path: path.join(outdir, n + '.png') });
  const god = () => E(() => { for (const h of heroes) { h.maxHp = h.hp = 5e6; } });
  await E(() => { selectedClass = 'guerrero'; currentArena = 'micelial'; lobbyAllies = ['tanque','mago','soporte']; startRun(10); });
  await sleep(1500); await god();
  await E(() => { for (const h of heroes) { h.x = (Math.random()-0.5)*200; h.y = 330 + Math.random()*60; } });
  await sleep(3000); await shot('b0_stir_early');
  await E(() => { micS.mo.t = MIC_STIR_MS - 3000; });
  await sleep(2500); await shot('b1_stir_late');
  await sleep(2500); await shot('b2_reveal_crack');
  await sleep(3000); await shot('b3_reveal_rise');
  await sleep(4000); await god(); await E(() => { for (const h of heroes) { h.x = (Math.random()-0.5)*260; h.y = 215 + Math.random()*60; } }); await sleep(700); await shot('b4_fight_p1');
  await sleep(3000); await shot('b5_fight_p1b');
  await E(() => { const b = micMotherEntity(); b.hp = b.maxHp*0.59; });
  await sleep(1400); await shot('b6_trans_dark');
  await sleep(2600); await god(); await shot('b7_bloom');
  await E(() => { const b = micMotherEntity(); b.halCd = 0; b.mcd = 0; b.cloudCd = 0; });
  await sleep(2500); await shot('b8_bloom_hal');
  await E(() => { const b = micMotherEntity(); b.hp = b.maxHp*0.29; });
  await sleep(3500); await god(); await shot('b9_heart');
  await E(() => { micS.mo.inf = 0.7; });
  await sleep(2000); await shot('b10_heart_infect');
  await E(() => { const b = micMotherEntity(); damageEnemy(b, b.hp + 10, {src:player}); });
  await sleep(1500); await shot('b11_death_a');
  await sleep(3000); await shot('b12_death_b');
  await sleep(3000); await shot('b13_death_c');
  await sleep(4000); await shot('b14_after');
  const info = await E(() => ({ state, mo: micS && micS.mo.st, dead: micS && micS.dead, cleared: save.arenasCleared.micelial }));
  console.log(JSON.stringify(info));
  console.log('ERRORS', errors.length); errors.slice(0, 20).forEach(e => console.log(e));
  await browser.close();
})();
