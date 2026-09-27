// AUDITORÍA ALPHA — primera partida REAL de un jugador nuevo (tiempo real, iPhone horizontal).
// Perfil limpio en modo campaña, elige su guardián de regalo por la UI, entra a la Arena 01 y juega con el
// autopiloto "humano competente". Capturas periódicas + métricas de lo que vive el jugador.
//   node tools/audit/play.js <outdir> <champ> <arena> <segundos> [nivel]
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const fs = require('fs'), path = require('path');
const BASE = process.env.SE_BASE_URL || 'http://127.0.0.1:8771';
const [out, champ, arena, secs, lvl] = [process.argv[2] || '/tmp/play', process.argv[3] || 'tanque', process.argv[4] || 'ciudad', +(process.argv[5] || 120), +(process.argv[6] || 0)];
fs.mkdirSync(out, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => { window.__campaignMode = true; });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message + ' ' + (e.stack || '').split('\n')[1]));
  page.on('console', m => { if (m.type() === 'error' && !/fonts\.g|ERR_CERT/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.goto(BASE + '/index.html', { waitUntil: 'load' });
  for (let k = 0; k < 200; k++) { if (await page.evaluate(() => { const b = document.getElementById('title-continue-btn'); return b && !b.disabled; })) break; await sleep(100); }
  await page.addScriptTag({ path: path.join(__dirname, '../playtest/autopilot.js') });
  // arranca como lo haría el flujo: guardián de regalo elegido y (opcional) nivel/arena pedidos
  await page.evaluate(([c, a, l]) => {
    save.starterChosen = true; save.champions[c].unlocked = true;
    if (l > 0) save.champions[c].level = l;
    if (a !== 'ciudad') { save.legacyOpenArenas = save.legacyOpenArenas || []; if (!save.legacyOpenArenas.includes(a)) save.legacyOpenArenas.push(a); }
    persist();
    __AP.start(c, a, 1);
  }, [champ, arena, lvl]);
  const t0 = Date.now(); const samples = [];
  let shot = 0;
  while ((Date.now() - t0) / 1000 < secs) {
    await sleep(1000);
    const s = await page.evaluate(() => {
      const b = document.querySelector('#buff-cards .buff-card'); let picked = null;
      if (b && state === 'buff') { picked = (b.querySelector('.buff-name') || {}).textContent; b.click(); }
      return { st: state, lvl: runLevel, hp: player ? Math.round(100 * player.hp / player.maxHp) : 0, alive: player && player.alive, kills, en: enemies.filter(e => e.alive).length,
        boss: !!(bossActive && boss && boss.alive), heroLv: player && player.level, fps: typeof __fps !== 'undefined' ? __fps : null, picked,
        banner: (document.getElementById('banner') || {}).textContent || '' };
    });
    samples.push(Object.assign({ t: Math.round((Date.now() - t0) / 1000) }, s));
    if (samples.length % 15 === 1) await page.screenshot({ path: path.join(out, 'p' + String(++shot).padStart(2, '0') + '_t' + samples[samples.length - 1].t + '.png') });
    if (s.st !== 'playing' && s.st !== 'buff') { await page.screenshot({ path: path.join(out, 'fin_' + s.st + '.png') }); break; }
  }
  const summary = await page.evaluate(() => ({ state, runLevel, kills, player: player && { lv: player.level, alive: player.alive, dmg: Math.round((player.stats || {}).dmgDealt || 0), taken: Math.round((player.stats || {}).dmgTaken || 0), casts: (player.stats || {}).skillCasts } }));
  fs.writeFileSync(path.join(out, 'samples.json'), JSON.stringify({ samples, summary, errors }, null, 1));
  console.log('SUMMARY', JSON.stringify(summary));
  console.log('timeline', samples.filter((s, i) => i % 10 === 0 || s.picked).map(s => `${s.t}s L${s.lvl} hp${s.hp} k${s.kills} e${s.en}${s.boss ? ' BOSS' : ''}${s.picked ? ' +' + s.picked : ''}`).join(' | '));
  console.log('ERRORS', errors.length); for (const e of errors.slice(0, 10)) console.log('  ', e);
  await browser.close();
})();
