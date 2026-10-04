'use strict';
// PROYECTILES CON IDENTIDAD — cada guardián que dispara tiene una forma PROPIA (ninguna compartida, ninguna
// genérica). Juega a cada campeón del roster en una partida real (bot de su clase contra un enemigo quieto)
// hasta que dispare, toma los proyectiles REALES que salen de su código y comprueba:
//   1. todo campeón que dispara tiene forma propia (drawProjStyle la dibuja; nunca el cuadrado genérico),
//   2. ninguna forma se repite entre campeones distintos,
//   3. los dibujos son distintos píxel a píxel (no dos nombres para el mismo dibujo),
//   4. las variantes (Disparo de Oficial, Flecha Perforante, flecha de hueso) tienen su propia forma.
//   node tools/quality/test-projectile-identity.js      (levanta su servidor; PROJ_PORT, CHROMIUM_PATH)
const assert = require('node:assert/strict'), {spawn} = require('node:child_process'), path = require('node:path');
let chromium; try { ({chromium} = require('playwright')); } catch (e) { ({chromium} = require('/opt/node22/lib/node_modules/playwright')); }
const ROOT = path.resolve(__dirname, '../..'), PORT = +(process.env.PROJ_PORT || 8841);
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], {cwd: ROOT, stdio: 'ignore'});
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  await sleep(500);
  const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || chromium.executablePath(), args: ['--no-sandbox']});
  try {
    const page = await browser.newPage({viewport: {width: 844, height: 390}}), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`http://127.0.0.1:${PORT}/`, {waitUntil: 'domcontentloaded'});
    await page.waitForFunction(() => typeof startRun === 'function' && typeof drawProjStyle === 'function' && typeof CHAMPION_IDENTITY !== 'undefined', null, {timeout: 120000});
    await sleep(1500);
    const keys = await page.evaluate(() => Object.keys(CHAMPION_IDENTITY));
    const fired = {};
    for (const k of keys) {
      fired[k] = await page.evaluate(k => {
        for (const ck in save.champions) { save.champions[ck].unlocked = true; save.champions[ck].level = 10; }
        selectedClass = 'tanque'; currentArena = 'bosque'; lobbyAllies = [k]; netMatch = null; startRun(1); setState('playing');
        const bot = heroes.find(h => h !== player && h.classKey === k); if (!bot) return {err: 'sin bot'};
        enemies.length = 0;
        const foe = spawnEnemy('esqueleto', false, false); foe.x = bot.x + 220; foe.y = bot.y; foe.speed = 0; foe.maxHp = foe.hp = 1e7;
        const seen = {};
        for (let f = 0; f < 600; f++) {
          for (const h of heroes) { h.hp = h.maxHp; }
          foe.hp = 1e7; foe.x = bot.x + 220; foe.y = bot.y;
          update(16);
          for (const p of projectiles) { if (p.enemy || !p.src || p.src.classKey !== k) continue; const st = projStyleOf(p) || 'GENERICO'; seen[st] = (seen[st] || 0) + 1; }
          if (Object.keys(seen).length && f > 120) break;
        }
        return {seen, ranged: !!(bot.cls && bot.cls.ranged)};
      }, k);
    }
    // forma por campeón que dispara (la más usada = su básico)
    const shooters = Object.entries(fired).filter(([, r]) => r.seen && Object.keys(r.seen).length);
    console.log('disparan:', shooters.map(([k, r]) => k + '→' + Object.keys(r.seen).join('/')).join('  '));
    const own = {};
    for (const [k, r] of shooters) {
      assert(!r.seen.GENERICO, `${k}: un proyectil sin forma propia (cuadrado genérico)`);
      own[k] = Object.entries(r.seen).sort((a, b) => b[1] - a[1])[0][0];
    }
    const byStyle = {};
    for (const [k, st] of Object.entries(own)) (byStyle[st] = byStyle[st] || []).push(k);
    const shared = Object.entries(byStyle).filter(([, ks]) => ks.length > 1);
    assert.deepEqual(shared, [], 'formas compartidas entre campeones: ' + JSON.stringify(shared));
    assert(shooters.length >= 15, `se esperaba que dispararan al menos 15 campeones (${shooters.length})`);
    console.log(`PASS ${shooters.length} campeones disparan, cada uno con forma propia`);
    // dibujos distintos píxel a píxel (+ variantes)
    const styles = [...new Set(Object.values(own).concat(['officer', 'arrow_heavy', 'bone_arrow']))];
    const sig = await page.evaluate(styles => {
      const out = {}, cv = document.createElement('canvas'); cv.width = cv.height = 48; const g = cv.getContext('2d');
      const saved = ctx; ctx = g; const t0 = animNow; animNow = 1000;
      for (const st of styles) {
        g.clearRect(0, 0, 48, 48);
        const p = {x: 24, y: 24, vx: 300, vy: 0, color: '#c08040', radius: 6, src: {classKey: st === 'exglyph' ? 'vesper' : 'x'}};
        const ok = drawProjStyle(p, st, 6);
        const d = g.getImageData(0, 0, 48, 48).data; let h = 0, n = 0;
        for (let i = 3; i < d.length; i += 4) if (d[i] > 40) { n++; h = (h * 31 + i * 7 + d[i - 3] + d[i - 2] * 3 + d[i - 1] * 5) >>> 0; }
        out[st] = {ok, n, h};
      }
      ctx = saved; animNow = t0; return out;
    }, styles);
    for (const st of styles) assert(sig[st].ok && sig[st].n > 12, `la forma ${st} no se dibuja (${JSON.stringify(sig[st])})`);
    const hashes = new Map(); for (const st of styles) { const k = sig[st].h; assert(!hashes.has(k), `${st} dibuja igual que ${hashes.get(k)}`); hashes.set(k, st); }
    console.log(`PASS ${styles.length} formas distintas píxel a píxel (incluye Disparo de Oficial, Flecha Perforante y flecha de hueso)`);
    assert.deepEqual(errors, [], 'sin errores de página');
  } finally { await browser.close(); server.kill(); }
})().catch(e => { console.error(e.message || e); process.exitCode = 1; server.kill(); });
