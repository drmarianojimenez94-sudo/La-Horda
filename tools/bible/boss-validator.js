'use strict';
/* BOSS VALIDATOR (Game Bible: ARENA_BIBLE §5, QA.md).
   Por cada arena del orden de campaña: arranca el nivel 10 real, deja que el motor lance la pelea del jefe
   (startBossFight / flujo propio de la arena) y la simula ~40 s con el equipo de bots invulnerable.
   Mide: el jefe aparece; cuántos AVISOS usa (vfxTelegraph / bossStrike) y cuántos patrones DISTINTOS
   (decisiones tácticas, no una barra de vida); que el equipo pueda dañarlo; que no muera trivialmente;
   errores. Junta la ficha de diseño (ARENA_BLUEPRINTS: relación jefe-arena, qué examina, botín).
   Salida: docs/bible/generated/boss-audit.json + BOSS_AUDIT.md.  Uso: node tools/bible/boss-validator.js [--strict] */
const fs = require('node:fs'), path = require('node:path'), {spawn} = require('node:child_process');
let chromium; try { ({chromium} = require('playwright')); } catch (e) { ({chromium} = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const ROOT = path.resolve(__dirname, '../..'), PORT = +(process.env.BIBLE_PORT || 8837), OUT = path.join(ROOT, 'docs/bible/generated');
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], {cwd: ROOT, stdio: 'ignore'});
(async () => {
  await new Promise(r => setTimeout(r, 600));
  const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || chromium.executablePath(), args: ['--no-sandbox']});
  try {
    const page = await browser.newPage({viewport: {width: 844, height: 390}}), pageErrors = [];
    page.on('pageerror', e => pageErrors.push(e.message));
    await page.goto(`http://127.0.0.1:${PORT}/`, {waitUntil: 'domcontentloaded', timeout: 120000});
    await page.waitForFunction(() => typeof startRun === 'function' && typeof ARENA_BLUEPRINTS !== 'undefined', null, {timeout: 120000});
    await page.waitForTimeout(1500);
    const keys = (await page.evaluate(() => ARENA_ORDER.slice())).filter(k => !process.env.ARENAS || process.env.ARENAS.split(',').includes(k));
    const results = [];
    for (const key of keys) {
      const r = await page.evaluate(key => {
        const checks = [], add = (n, l, d) => checks.push({name: n, level: l, detail: d || ''});
        const B = arenaBlueprint(key);
        let seedX = 4242; const oRand = Math.random;
        Math.random = () => { seedX ^= seedX << 13; seedX >>>= 0; seedX ^= seedX >> 17; seedX ^= seedX << 5; seedX >>>= 0; return seedX / 4294967296; };
        const tele = [], strikes = [];
        const oT = window.vfxTelegraph, oS = window.bossStrike;
        window.vfxTelegraph = function (o) { tele.push((o && (o.rgb + '|' + o.shape)) || '?'); return oT.apply(this, arguments); };
        window.bossStrike = function (x, y, r, d, dmg, kind) { strikes.push(kind || '?'); return oS.apply(this, arguments); };
        let err = null, bossSeen = null, bossHp0 = 0, bossHpMin = Infinity, frames = 0, aliveAtEnd = false, maxLevel = 0;
        try {
          for (const ck in save.champions) { const s = save.champions[ck]; s.unlocked = true; s.level = 30; }
          selectedClass = 'tanque'; currentArena = key; lobbyAllies = ['soporte', 'mago', 'guerrero']; netMatch = null;
          startRun(LEVEL_COUNT); setState('playing');
          levelTimer = levelDuration; // el nivel 10 llega a su fin: el motor lanza al jefe
          for (let f = 0; f < 2600; f++) { // ~42 s
            for (const h of heroes) { h.maxHp = Math.max(h.maxHp, 5e5); h.hp = h.maxHp; h.alive = true; }
            if (state === 'buff') { const c = document.querySelector('#buff-cards > *'); if (c) c.click(); }
            if (state !== 'playing') break;
            update(16); frames++;
            const b = (typeof boss !== 'undefined' && boss && boss.alive) ? boss : enemies.find(e => e.alive && e.rank === 'jefe');
            if (b) { if (!bossSeen) { bossSeen = b.type; bossHp0 = b.maxHp; } bossHpMin = Math.min(bossHpMin, b.hp / b.maxHp); }
          }
          const b = enemies.find(e => e.alive && e.rank === 'jefe');
          aliveAtEnd = !!b || state === 'victory';
        } catch (e) { err = e.message; }
        window.vfxTelegraph = oT; window.bossStrike = oS; Math.random = oRand;
        const kinds = new Set([...tele, ...strikes]).size;
        add('ficha: identidad y relación con la arena', B && B.boss && B.boss.arena && B.boss.teaches ? 'PASS' : 'FAIL', B && B.boss ? B.boss.name : '—');
        add('sin errores en la pelea', err ? 'FAIL' : 'PASS', err || frames + ' cuadros');
        add('el jefe aparece', bossSeen ? 'PASS' : 'FAIL', bossSeen || 'no apareció en ~42 s');
        add('telegraphs (avisos antes del golpe)', tele.length + strikes.length >= 3 ? 'PASS' : tele.length + strikes.length ? 'WARNING' : 'FAIL', `${tele.length} avisos, ${strikes.length} golpes diferidos`);
        add('patrones distintos (decisiones tácticas)', kinds >= 3 ? 'PASS' : kinds >= 2 ? 'WARNING' : 'FAIL', kinds + ' tipos de aviso/golpe');
        if (bossSeen) {
          add('el equipo puede dañarlo', bossHpMin < 0.999 ? 'PASS' : 'FAIL', `vida mínima ${(bossHpMin * 100).toFixed(1)}%`);
          add('no es trivial (no cae en 42 s ante 4 bots)', state === 'victory' || (bossHpMin <= 0) ? 'WARNING' : 'PASS', state === 'victory' ? 'cayó' : `queda ${(bossHpMin * 100).toFixed(1)}%`);
        }
        add('botín relacionado', typeof SET_ARENA_WEIGHTS !== 'undefined' && SET_ARENA_WEIGHTS[key] ? 'PASS' : 'WARNING', B && B.loot ? B.loot.focus : '');
        state = 'menu';
        return {key, arena: B ? B.name : key, boss: B && B.boss ? B.boss.name : '', type: bossSeen, checks, tele: tele.length, strikes: strikes.length, kinds};
      }, key).catch(e => ({key, arena: key, checks: [{name: 'evaluación', level: 'FAIL', detail: e.message}]}));
      const f = r.checks.filter(c => c.level === 'FAIL').length, w = r.checks.filter(c => c.level === 'WARNING').length;
      r.status = f >= 2 ? 'REWORK' : f ? 'FIX' : w ? 'PASS*' : 'PASS';
      results.push(r);
      console.log(`${r.status.padEnd(7)} ${key.padEnd(10)} ${String(r.boss).slice(0, 40).padEnd(40)} avisos=${r.tele}/${r.strikes} tipos=${r.kinds}`);
      for (const c of r.checks.filter(c => c.level !== 'PASS')) console.log(`   ${c.level} ${c.name} — ${c.detail}`);
    }
    const rep = {schemaVersion: 1, generatedBy: 'tools/bible/boss-validator.js', scope: '~42 s real boss fight per arena with an invulnerable bot team. Automated evidence, not a design approval.', bosses: results, pageErrors};
    if (!process.env.ARENAS) {
      fs.writeFileSync(path.join(OUT, 'boss-audit.json'), JSON.stringify(rep, null, 1) + '\n');
      const L = ['# Auditoría de jefes (AUTO-GENERADO)', '', '> `node tools/bible/boss-validator.js`. ' + rep.scope, '', '| Arena | Jefe | Estado | Avisos | Golpes diferidos | Patrones | Detalle |', '|---|---|---|---|---|---|---|'];
      for (const b of results) L.push(`| ${b.arena} | ${b.boss} | **${b.status}** | ${b.tele} | ${b.strikes} | ${b.kinds} | ${b.checks.filter(c => c.level !== 'PASS').map(c => c.level + ': ' + c.name + ' (' + c.detail + ')').join('; ') || '—'} |`);
      fs.writeFileSync(path.join(OUT, 'BOSS_AUDIT.md'), L.join('\n') + '\n');
    }
    console.log('page errors: ' + pageErrors.length); if (pageErrors.length) console.log(pageErrors.slice(0, 5).join('\n'));
    if (process.argv.includes('--strict') && (pageErrors.length || results.some(r => r.checks.some(c => c.level === 'FAIL')))) process.exitCode = 1;
  } finally { await browser.close(); server.kill(); }
})().catch(e => { console.error(e); process.exitCode = 1; server.kill(); });
