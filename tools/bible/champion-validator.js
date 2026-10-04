'use strict';
/* CHAMPION + ABILITY VALIDATOR (Game Bible: docs/bible/QA.md).
   Carga el juego real en Chromium, enumera TODOS los campeones registrados y, por cada uno:
     - CONSISTENCIA: nombre/título según el estándar, lore y frase en banda, rol, pasiva, talentos,
       set, skins, sprite, metadata de habilidades (validateAbilityDefinition).
     - HABILIDADES (cast real en el motor, contra 10 muñecos inmóviles + 3 aliados heridos):
       efecto de juego medible, VFX, SFX, feedback, eventos replicados a invitados (red), errores.
   Resultado por chequeo PASS / WARNING / FAIL y estado por campeón PASS / FIX / REDRAW / REWORK / REJECT.
   PASS automático != aprobación de diseño: el informe lo dice explícitamente.
   Uso: node tools/bible/champion-validator.js [--strict]   (sale con código 1 si hay FAIL) */
const fs = require('node:fs'), path = require('node:path'), {spawn} = require('node:child_process');
let chromium; try { ({chromium} = require('playwright')); } catch (e) { ({chromium} = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const ROOT = path.resolve(__dirname, '../..'), PORT = +(process.env.BIBLE_PORT || 8831);
const OUT = path.join(ROOT, 'docs/bible/generated');
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], {cwd: ROOT, stdio: 'ignore'});
process.on('exit', () => server.kill());
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  await sleep(600);
  const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || chromium.executablePath(), args: ['--no-sandbox']});
  try {
    const page = await browser.newPage({viewport: {width: 844, height: 390}}), pageErrors = [];
    page.on('pageerror', e => pageErrors.push(e.message));
    console.log('loading…'); await page.goto(`http://127.0.0.1:${PORT}/`, {waitUntil: 'domcontentloaded', timeout: 120000}); console.log('loaded');
    await page.waitForFunction(() => typeof championAbilityDefinitions === 'function' && typeof CHAMPION_IDENTITY !== 'undefined' && typeof startRun === 'function', null, {timeout: 120000});
    await page.waitForTimeout(1500);
    const roster = (await page.evaluate(() => Object.keys(CLASSES))).filter(k => !process.env.ONLY || process.env.ONLY.split(',').includes(k));
    const results = [];
    console.log('roster', roster.length);
    roster.unshift('__canary__');
    for (const key of roster) {
      const r = await page.evaluate(async k0 => {
        // CANARIO: Aldric con sus 4 habilidades reemplazadas por un "kind" que el motor no conoce.
        // El validador DEBE marcarlas FAIL; si no, el validador es decorativo y la corrida falla.
        const canary = k0 === '__canary__', k = canary ? 'tanque' : k0, saved = CLASSES.tanque.skills, savedU = CLASSES.tanque.ultimate;
        if (canary) { CLASSES.tanque.skills = saved.map(x => ({...x, kind: '__qa_noop__'})); CLASSES.tanque.ultimate = {...savedU, kind: '__qa_noop__'}; }
        try {
        const checks = [], S = CHAMPION_STANDARD, c = CLASSES[k], id = CHAMPION_IDENTITY[k];
        const add = (area, name, level, detail) => checks.push({area, name, level, detail: detail || ''});
        /* ---------- consistencia ---------- */
        if (!id) add('identity', 'identidad registrada', 'FAIL', 'falta CHAMPION_IDENTITY.' + k);
        else {
          add('identity', 'nombre propio', id.name.split(/\s+/).length <= S.nameMaxWords ? 'PASS' : 'FAIL', id.name);
          add('identity', 'título', S.titlePattern.test(id.title || '') ? 'PASS' : 'FAIL', id.title);
          add('identity', 'nombre de menú = "Nombre, título"', c.name === id.name + ', ' + id.title ? 'PASS' : 'FAIL', c.name);
        }
        const lore = (CODEX_CHAMP_LORE[k] || {}).history || '';
        add('lore', 'largo de historia', lore.length >= S.loreMin && lore.length <= S.loreMax ? 'PASS' : (lore ? 'WARNING' : 'FAIL'), lore.length + ' caracteres (banda ' + S.loreMin + '-' + S.loreMax + ')');
        const origin = (CODEX_CHAMP_LORE[k] || {}).origin || '';
        add('lore', 'origen legible', origin && /[A-ZÁÉÍÓÚ ]/.test(origin) && !/^[a-z]+$/.test(origin) ? 'PASS' : 'FAIL', origin);
        const tag = c.tagline || '';
        add('lore', 'frase de catálogo', tag.length >= S.taglineMin && tag.length <= S.taglineMax ? 'PASS' : 'WARNING', tag.length + ' caracteres');
        add('lore', 'la frase nombra al campeón', id && tag.includes(id.name) ? 'PASS' : 'FAIL', id ? id.name : '');
        add('role', 'rol', S.roleCategories.includes(c.roleCategory) && c.role ? 'PASS' : 'FAIL', c.roleCategory);
        add('kit', 'pasiva', c.passive && c.passive.desc ? 'PASS' : 'WARNING', c.passive ? c.passive.name : 'sin pasiva propia (no se inventa: pendiente de diseño)');
        add('kit', 'kit completo 3+1', (c.skills || []).length === 3 && c.ultimate ? 'PASS' : 'FAIL');
        add('progression', 'árbol de talentos', typeof TALENT_TREES !== 'undefined' && TALENT_TREES[k] ? 'PASS' : 'FAIL');
        const sets = typeof CHAMPION_SETS === 'undefined' ? [] : Object.entries(CHAMPION_SETS).filter(([, s]) => s.champion === k).map(([s]) => s);
        add('loot', 'set propio', sets.length ? 'PASS' : 'WARNING', sets.join(','));
        const skins = typeof codexSkinIds === 'function' ? codexSkinIds(k).length : 0, cromas = typeof cromaIdsFor === 'function' ? cromaIdsFor(k).length : 0;
        add('art', 'skins', skins + cromas > 0 ? 'PASS' : 'WARNING', skins + ' skins, ' + cromas + ' cromas');
        const defs = championAbilityDefinitions(k);
        for (const d of defs) for (const i of validateAbilityDefinition(d)) add('metadata', d.name + ': ' + i.msg, i.level);
        const dupNames = defs.map(d => d.name).filter((n, i, a) => a.indexOf(n) !== i);
        add('metadata', 'nombres de habilidad únicos', dupNames.length ? 'FAIL' : 'PASS', dupNames.join(','));
        /* ---------- casts reales ---------- */
        const abilities = [];
        const wrapNames = Object.getOwnPropertyNames(window).filter(n => /^(vfx[A-Z]|push[A-Z]|spawn[A-Z].*(Fx|FX|Burst|Ring)|portadorFx|exFx|seFx)/.test(n) && typeof window[n] === 'function');
        const counts = {};
        const orig = {};
        for (const n of wrapNames) { orig[n] = window[n]; window[n] = function (...a) { counts.vfx = (counts.vfx || 0) + 1; return orig[n].apply(this, a); }; }
        const oSfx = window.playSfx; window.playSfx = function (...a) { counts.sfx = (counts.sfx || 0) + 1; return oSfx.apply(this, a); };
        const oFt = window.floatText; window.floatText = function (...a) { counts.ft = (counts.ft || 0) + 1; return oFt.apply(this, a); };
        const statusRe = /slow|stun|freeze|frozen|bleed|poison|burn|root|curse|plague|taunt|vuln|mark|stitch|defDown|wet|stagger|knock/i;
        const snapEnemy = e => { const o = {}; for (const p in e) { const v = e[p]; if (statusRe.test(p) && v && typeof v !== 'function' && typeof v !== 'object') o[p] = v; } return o; };
        const snapHero = h => { const o = {}; for (const p in h) { const v = h[p]; if ((typeof v === 'number' || typeof v === 'boolean') && !/^(x|y|vx|vy|t|anim|frame|energy|walk|bob|face|cds|aim|_)/.test(p)) o[p] = v; } return o; };
        const lens = () => ({proj: (projectiles || []).length, part: (particles || []).length, walls: (fireWalls || []).length, traps: (traps || []).length,
          zones: (axiomZones || []).length + (sylvaRainZones || []).length, port: typeof portadorObjects !== 'undefined' ? portadorObjects.length : 0,
          champFx: typeof champFx !== 'undefined' && champFx ? champFx.length : 0, allies: allies.length, sig: championSignatures.filter(s => s.on).length});
        function start() {
          netMatch = null; save.stash = []; save.relics = {hp: 0, dmg: 0, def: 0, vel: 0};
          for (const ck in save.champions) { const s = save.champions[ck]; s.unlocked = true; s.level = 20; s.xp = 0; s.equipment = {}; s.inventory = []; s.talents = {nodes: {}, mastery: null, masteryNodes: {}}; s.skillMastery = [0, 1, 2].map(() => ({...mkMastery(), alloc: 0})); s.ultMastery = {...mkMastery(), alloc: 0}; }
          selectedClass = k; currentArena = 'bosque'; lobbyAllies = ['tanque', 'soporte', 'mago'].filter(x => x !== k).slice(0, 3); startRun(3);
          enemies = []; spawnTimer = 1e9; arenaHazardTimer = 1e9; player.fx = 1; player.fy = 0; state = 'playing';
          runLevel = Math.max(runLevel || 1, typeof ULT_MIN_ARENA_LEVEL !== 'undefined' ? ULT_MIN_ARENA_LEVEL : 1);
          for (let i = 0; i < 10; i++) { const e = spawnEnemy('esqueleto'); Object.assign(e, {x: player.x + 60 + (i % 5) * 26, y: player.y + (Math.floor(i / 5) * 2 - 1) * 24, hp: 1e7, maxHp: 1e7, speed: 0, baseSpeed: 0, dmg: 0}); }
          for (let i = 0; i < allies.length; i++) { allies[i].x = player.x - 35 - i * 24; allies[i].y = player.y + 15; allies[i].hp = allies[i].maxHp * 0.5; }
          player.hp = player.maxHp * 0.6; player.energy = 1e4; player.ultCharge = player.ultMax;
          if (k === 'eren') player.erenFury = 1e4;
        }
        // Medición DIFERENCIAL: misma partida, mismo RNG sembrado, con y sin el cast. Lo que cambia es
        // el efecto de la habilidad (los bots, la regeneración y el ambiente se cancelan).
        const oRand = Math.random, oDmg = window.damageEnemy;
        let dmgBy = 0;
        window.damageEnemy = function (e, amount, opts) { const hp = e.hp; const r = oDmg.apply(this, arguments); if ((!opts || !opts.src || opts.src === player) && e.hp < hp) dmgBy += hp - e.hp; return r; };
        function seed(n) { let x = n >>> 0; Math.random = () => { x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }
        function run(slot) {
          let err = null; seed(1234);
          try { start(); } catch (e) { err = 'start: ' + e.message; }
          for (const a of allies) a.stunTimer = 1e9; // los aliados no actúan: solo reciben
          for (const kk in counts) counts[kk] = 0; dmgBy = 0;
          const l0 = lens(), a0 = allies.map(a => ({hp: a.hp, sh: (a.shield || 0) + (a.itemShield || 0)}));
          let netN = 0, sk = null;
          try {
            if (slot !== null) {
              sk = slot === 'ult' ? player.cls.ultimate : player.cls.skills[slot];
              netHookEvents(); netMatch = {role: 'host', recording: true}; _netEvents = [];
              player.aim = {x: player.x + 110, y: player.y};
              castAbility(player, sk, slot === 'ult', slot === 'ult' ? undefined : slot);
              netN = _netEvents.length; netMatch = null;
            }
            for (let f = 0; f < 280; f++) update(16);
          } catch (e) { err = (err ? err + '; ' : '') + e.message; netMatch = null; }
          const l1 = lens();
          return {err, sk, netN, dmg: dmgBy, vfx: counts.vfx || 0, sfx: counts.sfx || 0, ft: counts.ft || 0,
            part: l1.part - l0.part, sig: l1.sig, spawned: ['proj', 'walls', 'traps', 'zones', 'port', 'champFx', 'allies'].reduce((s, q) => s + Math.max(0, l1[q] - l0[q]), 0),
            enemies: enemies.map(e => JSON.stringify(snapEnemy(e))), allyGain: allies.map((a, i) => (a.hp - a0[i].hp) + ((a.shield || 0) + (a.itemShield || 0) - a0[i].sh)),
            allyState: allies.map(a => JSON.stringify(snapHero(a))), self: snapHero(player), pos: [player.x, player.y]};
        }
        const ctl = run(null);
        // SPRITE: espera a que baje su arte (carga diferida) y dibuja el cuerpo real en un canvas aparte.
        for (let w = 0; w < 80 && typeof champPackPending === 'function' && champPackPending(k); w++) await new Promise(res => setTimeout(res, 100));
        { const cv = document.createElement('canvas'); cv.width = cv.height = 220; const g = cv.getContext('2d'), oc = ctx; let px = 0;
          try { ctx = g; ctx.setTransform(1, 0, 0, 1, 110 - player.x, 150 - player.y); drawHeroBody(player, 1, false, false); } catch (e) {} finally { ctx = oc; }
          const d = g.getImageData(0, 0, 220, 220).data; for (let i = 3; i < d.length; i += 4) if (d[i] > 16) px++;
          add('art', 'sprite visible en partida', px > 150 ? 'PASS' : 'FAIL', px + ' píxeles'); }
        for (const slot of [0, 1, 2, 'ult']) {
          const r = run(slot), sk = r.sk, def = abilityDefinition(k, slot), err = r.err;
          const dmg = Math.max(0, r.dmg - ctl.dmg);
          const statusHit = r.enemies.filter((x, i) => x !== ctl.enemies[i]).length;
          const allyHelp = r.allyGain.filter((g, i) => g > (ctl.allyGain[i] || 0) + 0.5).length + r.allyState.filter((x, i) => x !== ctl.allyState[i]).length;
          const selfKeys = Object.keys(r.self).filter(q => r.self[q] !== ctl.self[q] && !/energy|ultCharge|Cd$|cd$|momentum|[Gg]race|^last|castAnim|castFlash|pose/.test(q));
          const selfChanged = selfKeys.length + (Math.hypot(r.pos[0] - ctl.pos[0], r.pos[1] - ctl.pos[1]) > 20 ? 1 : 0);
          const spawned = Math.max(0, r.spawned - ctl.spawned);
          const effect = dmg > 0 || statusHit > 0 || allyHelp > 0 || selfChanged > 0 || spawned > 0;
          const vfx = Math.max(0, r.vfx - ctl.vfx) + Math.max(0, r.part - ctl.part) + Math.max(0, r.sig - ctl.sig) + spawned;
          const sfx = Math.max(0, r.sfx - ctl.sfx), ft = Math.max(0, r.ft - ctl.ft);
          abilities.push({slot, name: sk && sk.name, kind: sk && sk.kind, targeting: def && def.targetingType, status: def && def.statusEffects,
            effect, selfKeys, dmg: Math.round(dmg), enemiesAffected: statusHit, alliesHelped: allyHelp, selfChanged, spawned, vfx, sfx, floatText: ft, netEvents: r.netN, error: err});
          const lbl = (slot === 'ult' ? 'Definitiva ' : 'Hab. ' + (slot + 1) + ' ') + (sk && sk.name);
          add('ability', lbl + ': efecto de juego', err ? 'FAIL' : effect ? 'PASS' : 'FAIL', err || ('daño ' + Math.round(dmg) + ', enemigos con estado ' + statusHit + ', aliados ' + allyHelp + ', propio ' + selfChanged + ', entidades ' + spawned));
          add('ability', lbl + ': VFX', vfx > 0 ? 'PASS' : 'FAIL', String(vfx));
          add('ability', lbl + ': SFX', sfx > 0 ? 'PASS' : 'WARNING', String(sfx));
          add('ability', lbl + ': feedback (números/avisos)', ft > 0 || statusHit > 0 || allyHelp > 0 || selfChanged > 0 ? 'PASS' : 'WARNING', String(ft));
          add('ability', lbl + ': replicado a invitados', r.netN > 0 || spawned > 0 ? 'PASS' : 'WARNING', r.netN + ' eventos de red');
        }
        Math.random = oRand; window.damageEnemy = oDmg;
        for (const n of wrapNames) window[n] = orig[n];
        window.playSfx = oSfx; window.floatText = oFt;
        state = 'menu';
        return {key: k0, name: c.name, role: c.roleCategory, checks, abilities};
        } finally { if (canary) { CLASSES.tanque.skills = saved; CLASSES.tanque.ultimate = savedU; } }
      }, key).catch(e => ({key, name: key, role: '?', checks: [{area: 'load', name: 'evaluación', level: 'FAIL', detail: e.message}], abilities: []}));
      const fails = r.checks.filter(c => c.level === 'FAIL'), warns = r.checks.filter(c => c.level === 'WARNING');
      const abilityFails = new Set(fails.filter(c => c.area === 'ability' && /efecto/.test(c.name)).map(c => c.name)).size;
      const vfxFails = fails.filter(c => c.area === 'ability' && /VFX/.test(c.name)).length;
      r.status = r.checks.some(c => c.area === 'load') ? 'REJECT' : abilityFails >= 2 ? 'REWORK' : (vfxFails || fails.some(c => c.area === 'art')) ? 'REDRAW' : fails.length ? 'FIX' : warns.length ? 'PASS*' : 'PASS';
      r.summary = {fail: fails.length, warning: warns.length, pass: r.checks.length - fails.length - warns.length};
      if (key === '__canary__') {
        const caught = r.checks.filter(c => c.area === 'ability' && /efecto/.test(c.name) && c.level === 'FAIL').length;
        console.log(r.abilities.map(a=>a.selfKeys.join(',')).join(' | '));console.log(`canario: ${caught}/4 habilidades sin efecto detectadas`);
        if (caught < 4) { console.error('FAIL: el validador no detecta habilidades sin efecto'); process.exitCode = 1; }
        continue;
      }
      results.push(r);
      process.stdout.write(`${r.status.padEnd(7)} ${key.padEnd(11)} fail=${fails.length} warn=${warns.length}\n`);
    }
    fs.mkdirSync(OUT, {recursive: true});
    const report = {schemaVersion: 1, generatedBy: 'tools/bible/champion-validator.js',
      scope: 'Automated runtime checks. PASS = no automated failures; it is NOT human design, balance or art approval. PASS* = passes with warnings.',
      champions: results, pageErrors};
    if (!process.env.ONLY) { // con filtro no se pisa la auditoría completa
      fs.writeFileSync(path.join(OUT, 'champion-audit.json'), JSON.stringify(report, null, 1) + '\n');
      fs.writeFileSync(path.join(OUT, 'CHAMPION_AUDIT.md'), renderMd(report));
    }
    console.log(`\n${results.length} campeones · page errors: ${pageErrors.length}`);
    if (pageErrors.length) console.log(pageErrors.slice(0, 5).join('\n'));
    if (process.argv.includes('--strict') && (pageErrors.length || results.some(r => r.summary.fail))) process.exitCode = 1;
  } finally { await browser.close(); server.kill(); }
})().catch(e => { console.error(e); process.exitCode = 1; server.kill(); });

function renderMd(rep) {
  const L = [];
  L.push('# Auditoría de campeones (AUTO-GENERADO)', '', '> Generado por `node tools/bible/champion-validator.js`. No editar a mano: corregir datos y volver a correr.', '> ' + rep.scope, '');
  L.push('| Campeón | Rol | Estado | FAIL | WARN | Básico/Pasiva | Hab. 1 | Hab. 2 | Hab. 3 | Definitiva |', '|---|---|---|---|---|---|---|---|---|---|');
  for (const c of rep.champions) {
    const pas = c.checks.find(x => x.name === 'pasiva');
    const cell = a => a ? `${a.effect ? '✔' : '✘'}efecto ${a.vfx ? '✔' : '✘'}VFX ${a.sfx ? '✔' : '·'}SFX ${a.netEvents ? '✔' : '·'}red` : '—';
    L.push(`| ${c.name} (\`${c.key}\`) | ${c.role} | **${c.status}** | ${c.summary.fail} | ${c.summary.warning} | ${pas && pas.level === 'PASS' ? '✔' : '·'} | ${c.abilities.map(cell).join(' | ')} |`);
  }
  L.push('', '## Detalle de FAIL / WARNING', '');
  for (const c of rep.champions) {
    const bad = c.checks.filter(x => x.level !== 'PASS'); if (!bad.length) continue;
    L.push(`### ${c.name} — ${c.status}`);
    for (const b of bad) L.push(`- **${b.level}** [${b.area}] ${b.name}${b.detail ? ' — ' + b.detail : ''}`);
    L.push('');
  }
  if (rep.pageErrors.length) L.push('## Errores de página', '', ...rep.pageErrors.map(e => '- ' + e));
  return L.join('\n') + '\n';
}
