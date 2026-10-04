'use strict';
/* BOSS VALIDATOR (Game Bible: BOSS_BIBLE.md, ARENA_BIBLE §5, QA.md).
   BOSS + ARENA = ENCUENTRO. Por cada arena del orden de campaña simula, con el motor real y un equipo de
   bots invulnerables (azar con semilla fija):
     - cada nivel con SUBJEFE de su ficha (BOSS_BLUEPRINTS, rank "subjefe") ~45 s desde que el nivel pasa
       el 46 % (todos los directores ya lo lanzaron), y
     - el nivel 10: deja que el motor lance la pelea del jefe y la corre ~42 s.
   Por cada ficha mide: que la ficha sea válida (validateBossBlueprint), que el jefe aparezca, sus AVISOS
   (vfxTelegraph / bossStrike) y patrones distintos, que el equipo pueda dañarlo, que no muera trivialmente,
   errores, y LOS GANCHOS CON LA ARENA (bossArenaEvent): los de modo "auto" tienen que dispararse en la
   pelea real (si no, FAIL: la ficha promete algo que el código no hace); los "player"/"phase" se informan.
   Las formas que llegan después de vencer otra (Ángel Gélido, Gólem, Rey de la Horda) no se alcanzan en
   la ventana: quedan como "no alcanzada" (sus ganchos los cubre tools/bosses/t_boss_arena_hooks.js).
   Salida: docs/bible/generated/boss-audit.json + BOSS_AUDIT.md.
   Uso: node tools/bible/boss-validator.js [--strict]   (ARENAS=a,b para limitar; no escribe la salida) */
const fs = require('node:fs'), path = require('node:path'), {spawn} = require('node:child_process');
let chromium; try { ({chromium} = require('playwright')); } catch (e) { ({chromium} = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const ROOT = path.resolve(__dirname, '../..'), PORT = +(process.env.BIBLE_PORT || 8837), OUT = path.join(ROOT, 'docs/bible/generated');
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], {cwd: ROOT, stdio: 'ignore'});

// Corre una pelea (en el navegador). mode "boss": nivel 10, el motor lanza al jefe. mode "sub": nivel N al 46 %.
function simFight({key, level, mode, frames}) {
  let seedX = 4242 + level; const oRand = Math.random;
  Math.random = () => { seedX ^= seedX << 13; seedX >>>= 0; seedX ^= seedX >> 17; seedX ^= seedX << 5; seedX >>>= 0; return seedX / 4294967296; };
  const tele = [], strikes = [], seen = {}, errs = [];
  const oT = window.vfxTelegraph, oS = window.bossStrike;
  window.vfxTelegraph = function (o) { tele.push((o && (o.rgb + '|' + o.shape)) || '?'); return oT.apply(this, arguments); };
  window.bossStrike = function (x, y, r, d, dmg, kind) { strikes.push(kind || '?'); return oS.apply(this, arguments); };
  let n = 0, endState = '';
  try {
    for (const ck in save.champions) { const s = save.champions[ck]; s.unlocked = true; s.level = 30; }
    selectedClass = 'tanque'; currentArena = key; lobbyAllies = ['soporte', 'mago', 'guerrero']; netMatch = null;
    startRun(level); setState('playing');
    // nivel 10: se lo termina para que el motor lance al jefe (salvo arenas cuyo nivel 10 no termina por tiempo:
    // la Fábrica pone levelDuration = 9e9 y el Caballero despierta cuando el equipo entra a su cámara)
    if (mode === 'boss') { if (levelDuration < 1e8) levelTimer = levelDuration; } else levelTimer = levelDuration * 0.46;
    const seenDrops = new WeakSet();
    for (let f = 0; f < frames; f++) {
      for (const h of heroes) { h.maxHp = Math.max(h.maxHp, 5e5); h.hp = h.maxHp; h.alive = true; }
      if (state === 'buff') { const c = document.querySelector('#buff-cards > *'); if (c) c.click(); }
      if (state !== 'playing') break;
      if (mode === 'sub' && levelTimer > levelDuration * 0.9) levelTimer = levelDuration * 0.9; // que el nivel no termine
      // jugador mínimo: el local no tiene IA; si queda lejos del jefe, camina hacia él (los bots lo siguen).
      // Sin esto, un jefe que no persigue (Cerbero encadenado) daba "no se lo puede dañar" por artefacto.
      { let foe = null; for (const e of enemies) if (e.alive && (e.rank === 'jefe' || e.rank === 'subjefe') && !e.fortDormant && (!foe || Math.hypot(e.x - player.x, e.y - player.y) < Math.hypot(foe.x - player.x, foe.y - player.y))) foe = e;
        if (foe && player.alive && !(player.stunTimer > 0)) { const dx = foe.x - player.x, dy = foe.y - player.y, d = Math.hypot(dx, dy); if (d > 260) { const st = (player.speed || 200) * 0.016; player.x += dx / d * st; player.y += dy / d * st; player.fx = dx / d; player.fy = dy / d; if (typeof clampToArena === 'function') clampToArena(player); if (typeof resolveWallCollision === 'function') resolveWallCollision(player); } } }
      update(16); n++;
      // las Minas avisan con su propio sistema (mnS.drops: círculos/líneas/conos marcados en el piso)
      if (typeof mnS !== 'undefined' && mnS && mnS.drops) for (const D of mnS.drops) { if (!seenDrops.has(D)) { seenDrops.add(D); strikes.push('mn:' + (D.k || D.sh || '?')); } }
      for (const e of enemies) {
        if (!e.alive || (e.rank !== 'jefe' && e.rank !== 'subjefe')) continue;
        const r = seen[e.type] || (seen[e.type] = {hp0: e.maxHp, min: 1, frames: 0});
        r.min = Math.min(r.min, e.hp / e.maxHp); r.frames++;
      }
    }
    endState = state;
  } catch (e) { errs.push(e.message); }
  window.vfxTelegraph = oT; window.bossStrike = oS; Math.random = oRand;
  const hooks = {}; for (const k in BOSS_ARENA_LOG) hooks[k] = BOSS_ARENA_LOG[k].n;
  state = 'menu';
  return {frames: n, tele: tele.length, strikes: strikes.length, kinds: new Set([...tele, ...strikes]).size, seen, hooks, errs, endState};
}

(async () => {
  await new Promise(r => setTimeout(r, 600));
  const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || chromium.executablePath(), args: ['--no-sandbox']});
  try {
    const page = await browser.newPage({viewport: {width: 844, height: 390}}), pageErrors = [];
    page.on('pageerror', e => pageErrors.push(e.message));
    await page.goto(`http://127.0.0.1:${PORT}/`, {waitUntil: 'domcontentloaded', timeout: 120000});
    await page.waitForFunction(() => typeof startRun === 'function' && typeof BOSS_BLUEPRINTS !== 'undefined' && typeof bossArenaEvent === 'function', null, {timeout: 120000});
    await page.waitForTimeout(1500);
    const keys = (await page.evaluate(() => ARENA_ORDER.slice())).filter(k => !process.env.ARENAS || process.env.ARENAS.split(',').includes(k));
    const BP = await page.evaluate(() => { const o = {}; for (const t of BOSS_BLUEPRINT_ORDER) o[t] = Object.assign({}, BOSS_BLUEPRINTS[t], {issues: validateBossBlueprint(t)}); return o; });
    const runs = {}, results = [];
    for (const key of keys) {
      const subLevels = [...new Set(Object.values(BP).filter(b => b.arena === key && b.rank === 'subjefe').map(b => b.level))];
      for (const lv of subLevels) {
        runs[key + ':' + lv] = await page.evaluate(simFight, {key, level: lv, mode: 'sub', frames: 2800}).catch(e => ({errs: [e.message], seen: {}, hooks: {}}));
      }
      runs[key + ':10'] = await page.evaluate(simFight, {key, level: 10, mode: 'boss', frames: 4400}).catch(e => ({errs: [e.message], seen: {}, hooks: {}}));
      // ficha de arena (relación general) y botín
      const arenaInfo = await page.evaluate(k => { const B = arenaBlueprint(k); return {name: B ? B.name : k, boss: B && B.boss ? B.boss.name : '', bossOk: !!(B && B.boss && B.boss.arena && B.boss.teaches), loot: typeof SET_ARENA_WEIGHTS !== 'undefined' && !!SET_ARENA_WEIGHTS[k]}; }, key);
      for (const [type, B] of Object.entries(BP).filter(([, b]) => b.arena === key)) {
        const R = runs[key + ':' + (B.rank === 'jefe' ? 10 : B.level)] || {seen: {}, hooks: {}, errs: []};
        const checks = [], add = (n, l, d) => checks.push({name: n, level: l, detail: d || ''});
        const fails = B.issues.filter(i => i.level === 'FAIL'), warns = B.issues.filter(i => i.level === 'WARNING');
        add('ficha (BOSS_BLUEPRINTS)', fails.length ? 'FAIL' : warns.length ? 'WARNING' : 'PASS', [...fails, ...warns].map(i => i.msg).join('; '));
        if (B.rank === 'jefe') add('relación jefe-arena en ARENA_BLUEPRINTS', arenaInfo.bossOk ? 'PASS' : 'FAIL', arenaInfo.boss);
        add('sin errores en la pelea', R.errs && R.errs.length ? 'FAIL' : 'PASS', (R.errs || []).join('; ') || (R.frames + ' cuadros'));
        const S = R.seen[type];
        const later = !S && !!B.after;   // forma/pelea que llega después de vencer a otra (ficha: after)
        if (!S) add('aparece en la simulación', later ? 'WARNING' : 'FAIL', later ? 'forma posterior: no se alcanza en la ventana (la cubre t_boss_arena_hooks.js)' : 'no apareció');
        else {
          add('aparece en la simulación', 'PASS', `${(S.frames * 16 / 1000).toFixed(0)} s en pelea`);
          add('telegraphs (avisos antes del golpe)', R.tele + R.strikes >= 3 ? 'PASS' : R.tele + R.strikes ? 'WARNING' : 'FAIL', `${R.tele} avisos, ${R.strikes} golpes diferidos en la pelea`);
          add('patrones distintos', R.kinds >= 3 ? 'PASS' : R.kinds >= 2 ? 'WARNING' : 'FAIL', R.kinds + ' tipos de aviso/golpe');
          add('el equipo puede dañarlo', S.min < 0.999 ? 'PASS' : 'FAIL', `vida mínima ${(S.min * 100).toFixed(1)}%`);
          add('no es trivial', S.min <= 0 ? 'WARNING' : 'PASS', S.min <= 0 ? 'cayó en la ventana' : `queda ${(S.min * 100).toFixed(1)}%`);
        }
        const hooks = (B.hooks || []).map(h => ({id: h.id, mode: h.mode, n: R.hooks[h.id] || 0}));
        for (const h of hooks) {
          if (h.mode !== 'auto') continue;
          if (!S) continue;
          add('gancho de arena: ' + h.id, h.n > 0 ? 'PASS' : 'FAIL', h.n > 0 ? `${h.n} vez/veces` : 'la ficha lo promete y la pelea real no lo hizo');
        }
        if (!(B.hooks || []).length) add('usa su arena', 'WARNING', 'ningún gancho declarado');
        if (B.rank === 'jefe') add('botín relacionado', arenaInfo.loot ? 'PASS' : 'WARNING', '');
        const f = checks.filter(c => c.level === 'FAIL').length, w = checks.filter(c => c.level === 'WARNING').length;
        const r = {type, arena: key, arenaName: arenaInfo.name, rank: B.rank, level: B.rank === 'jefe' ? 10 : B.level, name: B.name, rule: B.rule,
          design: B.status.grade, art: B.art.grade, artWhy: B.art.why, brief: B.art.brief || null, hooks, checks,
          status: f >= 2 ? 'REWORK' : f ? 'FIX' : w ? 'PASS*' : 'PASS', tele: R.tele, strikes: R.strikes, kinds: R.kinds};
        results.push(r);
        console.log(`${r.status.padEnd(7)} ${key.padEnd(10)} ${type.padEnd(20)} ganchos ${hooks.map(h => (h.n ? '✓' : '·') + h.id.split('.')[1] + '(' + h.mode[0] + ')').join(' ') || '—'}`);
        for (const c of checks.filter(c => c.level !== 'PASS')) console.log(`   ${c.level} ${c.name} — ${c.detail}`);
      }
    }
    // fichas de modos propios (Arena Divina): no hay pelea de campaña que simular; se informan
    if (!process.env.ARENAS) for (const [type, B] of Object.entries(BP).filter(([, b]) => !keys.includes(b.arena))) {
      const fails = B.issues.filter(i => i.level === 'FAIL');
      const checks = [{name: 'ficha (BOSS_BLUEPRINTS)', level: fails.length ? 'FAIL' : 'WARNING', detail: B.issues.map(i => i.msg).join('; ') || 'ok'}, {name: 'simulación', level: 'WARNING', detail: 'modo propio (' + B.arena + '): sin pelea de campaña que simular'}];
      results.push({type, arena: B.arena, arenaName: B.arena, rank: B.rank, level: B.level, name: B.name, rule: B.rule, design: B.status.grade, art: B.art.grade, artWhy: B.art.why, brief: B.art.brief || null, hooks: (B.hooks || []).map(h => ({id: h.id, mode: h.mode, n: 0})), checks, status: fails.length ? 'FIX' : 'PASS*', tele: 0, strikes: 0, kinds: 0});
      console.log(`PASS*   ${B.arena.padEnd(10)} ${type.padEnd(20)} (modo propio: sin simulación)`);
    }
    const rep = {schemaVersion: 2, generatedBy: 'tools/bible/boss-validator.js', scope: 'Pelea real por jefe/subjefe (~42–45 s, bots invulnerables, azar con semilla). Evidencia automática, no aprobación de diseño.', bosses: results, pageErrors};
    if (!process.env.ARENAS) {
      fs.writeFileSync(path.join(OUT, 'boss-audit.json'), JSON.stringify(rep, null, 1) + '\n');
      const L = ['# Auditoría de jefes (AUTO-GENERADO)', '', '> `node tools/bible/boss-validator.js`. ' + rep.scope + ' Ganchos: ✓ se disparó en la pelea · · no (a = auto, exigido; p = decisión del jugador; f = fase). Diseño y arte: BOSS_BLUEPRINTS (js/arenas/common/boss-blueprints.js); densidad de píxel: `tools/art/arena_lineup.js`.', '',
        '| Arena | Nivel | Jefe | Validación | Diseño | Arte | Ganchos con la arena | Avisos | Detalle |', '|---|---|---|---|---|---|---|---|---|'];
      for (const b of results) L.push(`| ${b.arenaName} | ${b.level} | ${b.name} | **${b.status}** | ${b.design} | ${b.art}${b.brief ? ' (' + b.brief + ')' : ''} | ${b.hooks.map(h => (h.n ? '✓' : '·') + ' `' + h.id.split('.')[1] + '`(' + h.mode[0] + ')').join(' ') || '—'} | ${b.tele}/${b.strikes} | ${b.checks.filter(c => c.level !== 'PASS').map(c => c.level + ': ' + c.name + ' (' + c.detail + ')').join('; ') || '—'} |`);
      fs.writeFileSync(path.join(OUT, 'BOSS_AUDIT.md'), L.join('\n') + '\n');
    }
    console.log('page errors: ' + pageErrors.length); if (pageErrors.length) console.log(pageErrors.slice(0, 5).join('\n'));
    if (process.argv.includes('--strict') && (pageErrors.length || results.some(r => r.checks.some(c => c.level === 'FAIL')))) process.exitCode = 1;
  } finally { await browser.close(); server.kill(); }
})().catch(e => { console.error(e); process.exitCode = 1; server.kill(); });
