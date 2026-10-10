'use strict';
/* FILTRO DE HABILIDADES (Game Bible: docs/bible/ABILITY_GATE.md).
   Cada habilidad se lanza en el motor real contra 10 muñecos agrupados y 3 aliados heridos, con medición DIFERENCIAL
   (misma partida y mismo RNG con y sin el lanzamiento). Las CATEGORÍAS salen de lo que la habilidad HIZO, no de
   etiquetas declaradas:
     AREA        daña (o aplica estados) a 4+ enemigos agrupados
     MULTIPLE    daña a 2+ enemigos
     POTENCIA    potencia al propio campeón o a aliados (velocidad, daño, armadura, bendición, furia…)
     CURA        cura o da escudo (a aliados o a sí mismo)
     CONTROL     aplica estados a enemigos (frenar, aturdir, marcar, sangrar…)
     MOVILIDAD   desplaza al campeón
     INVOCA      crea entidades (torres, zonas, objetos, aliados)
   PREMARCADO: si el lanzamiento consulta el punto/dirección apuntados (aimPoint/aimDir/aimTarget), la habilidad
   DEBE tener perfil de apuntado (aimProfileOf), para que el jugador vea y elija dónde cae antes de soltar.
   REGLAS (campeones nuevos: los que no están en knownChampions del balance; los clásicos se informan):
     - entre sus 3 habilidades: una de AREA, otra (distinta) que dañe a varios (MULTIPLE) y una de POTENCIA o CURA;
     - la definitiva suma 3+ categorías;
     - toda habilidad con efecto visible (VFX) y premarcado cuando apunta.
   Uso: node tools/bible/ability-gate.js [--strict]   (ONLY=a,b para filtrar; --strict sale 1 si un campeón nuevo falla)
   Escribe docs/bible/generated/ability-gate.json y ABILITY_GATE.md (sin ONLY). */
const fs = require('node:fs'), path = require('node:path'), {spawn} = require('node:child_process');
let chromium; try { ({chromium} = require('playwright')); } catch (e) { ({chromium} = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const ROOT = path.resolve(__dirname, '../..'), PORT = +(process.env.ABILITY_GATE_PORT || 8833), OUT = path.join(ROOT, process.argv.includes('--workshop-quality')?'docs/production/quality-five/ability':'docs/bible/generated');
const server = process.env.ABILITY_BASE_URL ? null : spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], {cwd: ROOT, stdio: 'ignore'});
const BASE = process.env.ABILITY_BASE_URL || `http://127.0.0.1:${PORT}/`;
process.on('exit', () => server && server.kill());
const sleep = ms => new Promise(r => setTimeout(r, ms));
const CATS = ['AREA', 'MULTIPLE', 'POTENCIA', 'CURA', 'CONTROL', 'MOVILIDAD', 'INVOCA'];

(async () => {
  await sleep(server ? 600 : 0);
  const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || chromium.executablePath(), args: ['--no-sandbox']});
  try {
    const page = await browser.newPage({viewport: {width: 844, height: 390}}), pageErrors = [];
    page.on('pageerror', e => pageErrors.push(e.message));
    await page.goto(BASE, {waitUntil: 'domcontentloaded', timeout: 120000});
    await page.waitForFunction(() => typeof startRun === 'function' && typeof CHAMPION_BALANCE_REFERENCE !== 'undefined' && typeof aimProfileOf === 'function', null, {timeout: 120000});
    await page.waitForTimeout(1500);
    if(process.argv.includes('--workshop-quality'))for(const file of ['js/champions/quality-five/solciju.js','tools/quality-five/register-fixture.js','js/champions/quality-five/veyra.js','tools/quality-five/register-veyra-fixture.js','js/champions/quality-five/brakk.js','tools/quality-five/register-brakk-fixture.js'])await page.addScriptTag({path:path.join(ROOT,file)});
    const roster = (await page.evaluate(() => Object.keys(CLASSES))).filter(k => !process.env.ONLY || process.env.ONLY.split(',').includes(k));
    const known = await page.evaluate(() => CHAMPION_BALANCE_REFERENCE.knownChampions || []);
    const results = [];
    for (const k of ['__canary__', ...roster]) {
      const r = await page.evaluate(k0 => {
        // CANARIO: el Caballero con un kit sin efecto y una habilidad que apunta sin perfil: el filtro DEBE rechazarlo.
        const canary = k0 === '__canary__', k = canary ? 'tanque' : k0, saved = CLASSES.tanque.skills, savedU = CLASSES.tanque.ultimate;
        if (canary) { CLASSES.tanque.skills = saved.map(x => ({...x, kind: '__qa_noop__'})); CLASSES.tanque.ultimate = {...savedU, kind: '__qa_noop__'}; }
        try {
          const counts = {}, orig = {};
          const vfxNames = Object.getOwnPropertyNames(window).filter(n => /^(vfx[A-Z]|push[A-Z]|spawn[A-Z].*(Fx|FX|Burst|Ring)|portadorFx|exFx|seFx)/.test(n) && typeof window[n] === 'function');
          for (const n of vfxNames) { orig[n] = window[n]; window[n] = function (...a) { counts.vfx = (counts.vfx || 0) + 1; return orig[n].apply(this, a); }; }
          // premarcado: ¿el lanzamiento consulta el punto/dirección apuntados?
          const aimFns = ['aimPoint', 'aimDir', 'aimTarget'];
          for (const n of aimFns) { orig[n] = window[n]; window[n] = function (...a) { counts.aim = (counts.aim || 0) + 1; return orig[n].apply(this, a); }; }
          const oDmg = window.damageEnemy; let hitMap = new Map();
          const statusRe = /slow|stun|freeze|frozen|bleed|poison|burn|root|curse|plague|taunt|vuln|mark|stitch|defDown|wet|stagger|knock|Sentenced|Silence|Mass|Terror/i;
          const buffRe = /speed|Speed|dmgMult|DmgMult|dmgBonus|atk|Atk|armor|Armor|defBonus|DefBonus|invuln|Invuln|bless|Bless|haste|Haste|crit|Crit|regen|Regen|lifesteal|Lifesteal|fury|Fury|empower|Empower|buff|Buff|Inspire|rage|Rage|frenzy|Frenzy|immune|Immune|power|Power|stealth|Stealth/;
          const snapEnemy = e => { const o = {}; for (const p in e) { const v = e[p]; if (statusRe.test(p) && v && typeof v !== 'function' && typeof v !== 'object') o[p] = v; } return o; };
          // potenciación medida por EFECTO: daño de un golpe de prueba, daño recibido y velocidad (más las claves de buff)
          let probe = null;
          const probeHit = h => { if (!probe) { probe = spawnEnemy('esqueleto'); const i = enemies.indexOf(probe); if (i >= 0) enemies.splice(i, 1); }
            Object.assign(probe, {x: -9999, y: -9999, hp: 1e9, maxHp: 1e9, alive: true, cineT: 0}); const hp = probe.hp, s0 = hitMap;
            hitMap = new Map(); const sv = {vfx: counts.vfx, sfx: window.__abSfx}; const rnd = Math.random; Math.random = () => 0.999; try { oDmg(probe, 100, {src: h, fromProc: true, noFx: true}); } catch (e) {} Math.random = rnd; hitMap = s0; counts.vfx = sv.vfx; return Math.round(hp - probe.hp); };
          const snapBuff = h => { const o = {}; for (const p in h) { const v = h[p]; if ((typeof v === 'number' || typeof v === 'boolean') && buffRe.test(p) && !/^(baseSpeed|speed|attackSpeed)$/.test(p)) o[p] = v; }
            try { o.__taken = Math.round(100 * (typeof portadorTakenMult === 'function' ? portadorTakenMult(h, {}) : 1)); } catch (e) {}
            try { o.__speed = Math.round(100 * (typeof portadorSpeedMult === 'function' ? portadorSpeedMult(h) : 1)); } catch (e) {}
            o.__shield = Math.round((h.shield || 0) + (h.itemShield || 0)); o.__out = probeHit(h); return o; };
          const lens = () => ({proj: (projectiles || []).length, walls: (fireWalls || []).length, traps: (traps || []).length,
            zones: (typeof axiomZones !== 'undefined' ? axiomZones.length : 0) + (typeof sylvaRainZones !== 'undefined' ? sylvaRainZones.length : 0),
            port: typeof portadorObjects !== 'undefined' ? portadorObjects.length : 0, champFx: typeof champFx !== 'undefined' && champFx ? champFx.length : 0, allies: allies.length});
          function start() {
            netMatch = null; save.stash = []; save.relics = {hp: 0, dmg: 0, def: 0, vel: 0};
            for (const ck in save.champions) { const s = save.champions[ck]; s.unlocked = true; s.level = 20; s.xp = 0; s.equipment = {}; s.inventory = []; s.talents = {nodes: {}, mastery: null, masteryNodes: {}}; s.skillMastery = [0, 1, 2].map(() => ({...mkMastery(), alloc: 0})); s.ultMastery = {...mkMastery(), alloc: 0}; }
            selectedClass = k; currentArena = 'bosque'; lobbyAllies = ['tanque', 'soporte', 'mago'].filter(x => x !== k).slice(0, 3); startRun(3);
            enemies = []; spawnTimer = 1e9; arenaHazardTimer = 1e9; player.fx = 1; player.fy = 0; state = 'playing';
            runLevel = Math.max(runLevel || 1, typeof ULT_MIN_ARENA_LEVEL !== 'undefined' ? ULT_MIN_ARENA_LEVEL : 1);
            // grupo compacto a ~110 u (donde se apunta) + 2 sueltos: un área real alcanza 4+, un golpe único 1
            const spots = [[100, 0], [118, -16], [118, 16], [134, 0], [92, -20], [92, 20], [140, -24], [140, 24], [60, 0], [200, 0]];
            for (const [dx, dy] of spots) { const e = spawnEnemy('esqueleto'); Object.assign(e, {x: player.x + dx, y: player.y + dy, hp: 1e7, maxHp: 1e7, speed: 0, baseSpeed: 0, dmg: 0}); }
            for (let i = 0; i < allies.length; i++) { allies[i].x = player.x - 35 - i * 24; allies[i].y = player.y + 15; allies[i].hp = allies[i].maxHp * 0.5; }
            player.hp = player.maxHp * 0.6; player.energy = 1e4; player.ultCharge = player.ultMax;
            if (k === 'eren') player.erenFury = 1e4;
          }
          const oRand = Math.random;
          // daño por enemigo, contado al entrar cada golpe (los muñecos se regeneran entre cuadros)
          window.damageEnemy = function (e, amount, opts) { const hp = e.hp; const r = oDmg.apply(this, arguments); if ((!opts || !opts.src || opts.src === player) && e.hp < hp) hitMap.set(e, (hitMap.get(e) || 0) + hp - e.hp); return r; };
          function seed(n) { let x = n >>> 0; Math.random = () => { x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }
          function run(slot, onAllies) {
            let err = null; seed(1234);
            try { start(); } catch (e) { err = 'start: ' + e.message; }
            for (const a of allies) a.stunTimer = 1e9;
            for (const kk in counts) counts[kk] = 0; hitMap = new Map();
            const l0 = lens(), a0 = allies.map(a => ({hp: a.hp, sh: (a.shield || 0) + (a.itemShield || 0)})), p0 = [player.x, player.y], s0 = player.hp + (player.shield || 0) + (player.itemShield || 0);
            let sk = null, aimCalls = 0, maxMove = 0;
            try {
              if (slot !== null) {
                sk = slot === 'ult' ? player.cls.ultimate : player.cls.skills[slot];
                player.aim = onAllies && allies[0] ? {x: allies[0].x, y: allies[0].y, dx: -1, dy: 0} : {x: player.x + 115, y: player.y, dx: 1, dy: 0};
                if (onAllies) { player.fx = -1; player.fy = 0; }
                castAbility(player, sk, slot === 'ult', slot === 'ult' ? undefined : slot);
                aimCalls = counts.aim || 0;
              }
              const snaps = [];
              for (let f = 0; f < 280; f++) { update(16); maxMove = Math.max(maxMove, Math.hypot(player.x - p0[0], player.y - p0[1]));
                if (f === 20 || f === 90 || f === 200) snaps.push({self: snapBuff(player), allies: allies.map(snapBuff), enemies: enemies.map(e => JSON.stringify(snapEnemy(e)))}); }
              return {err, sk, aimCalls, maxMove, vfx: counts.vfx || 0, snaps, hp: enemies.map(e => hitMap.get(e) || 0), l1: lens(), l0,
                allyGain: allies.map((a, i) => (a.hp - a0[i].hp) + ((a.shield || 0) + (a.itemShield || 0) - a0[i].sh)), selfGain: player.hp + (player.shield || 0) + (player.itemShield || 0) - s0};
            } catch (e) { return {err: (err ? err + '; ' : '') + e.message, sk, aimCalls, maxMove, vfx: 0, snaps: [], hp: enemies.map(e => hitMap.get(e) || 0), l1: lens(), l0, allyGain: []}; }
          }
          const ctl = run(null), out = [];
          for (const slot of [0, 1, 2, 'ult']) {
            const r = run(slot), sk = r.sk;
            const damaged = r.hp.filter((d, i) => d > (ctl.hp[i] || 0) + 1).length;
            const statused = new Set();
            r.snaps.forEach((s, j) => s.enemies.forEach((x, i) => { if (ctl.snaps[j] && x !== ctl.snaps[j].enemies[i]) statused.add(i); }));
            // habilidades que apuntan: segunda pasada apuntando a los aliados (curas, auras y bendiciones se miden ahí)
            const rs = r.aimCalls > 0 ? [r, run(slot, true)] : [r];
            const noSh = o => { const c = {...o}; delete c.__shield; return JSON.stringify(c); };
            const selfBuff = rs.some(q => q.snaps.some((s, j) => ctl.snaps[j] && noSh(s.self) !== noSh(ctl.snaps[j].self)));
            const allyBuff = rs.some(q => q.snaps.some((s, j) => ctl.snaps[j] && s.allies.some((a, i) => noSh(a) !== noSh(ctl.snaps[j].allies[i]))));
            const shielded = rs.some(q => q.snaps.some((s, j) => ctl.snaps[j] && (s.self.__shield > ctl.snaps[j].self.__shield || s.allies.some((a, i) => a.__shield > ctl.snaps[j].allies[i].__shield))));
            const heal = shielded || rs.some(q => q.allyGain.some((g, i) => g > (ctl.allyGain[i] || 0) + 0.5) || (q.selfGain || 0) > (ctl.selfGain || 0) + 0.5);
            const cats = [];
            if (damaged >= 4 || statused.size >= 4) cats.push('AREA');
            if (damaged >= 2) cats.push('MULTIPLE');
            if (selfBuff || allyBuff) cats.push('POTENCIA');
            if (heal) cats.push('CURA');
            if (statused.size >= 1) cats.push('CONTROL');
            if (r.maxMove > 40) cats.push('MOVILIDAD');
            if (['walls', 'traps', 'zones', 'port', 'champFx', 'allies'].some(q => (r.l1[q] - r.l0[q]) > (ctl.l1[q] - ctl.l0[q]))) cats.push('INVOCA');
            const prof = sk ? aimProfileOf(sk, player) : null;
            out.push({slot, name: sk && sk.name, kind: sk && (sk.kind === 'ascension' || sk.kind === 'expedition' ? sk.kind + ':' + sk.action : sk.kind), err: r.err,
              damaged, statused: statused.size, cats, vfx: Math.max(0, r.vfx - ctl.vfx), aims: r.aimCalls > 0, aimProfile: prof ? prof.type : null});
          }
          for (const n of vfxNames) window[n] = orig[n];
          for (const n of aimFns) window[n] = orig[n];
          Math.random = oRand; window.damageEnemy = oDmg; state = 'menu';
          return {key: k0, name: CLASSES[k].name, role: CLASSES[k].roleCategory, abilities: out};
        } finally { if (canary) { CLASSES.tanque.skills = saved; CLASSES.tanque.ultimate = savedU; } }
      }, k).catch(e => ({key: k, name: k, role: '?', abilities: [], error: e.message}));
      // reglas
      const sk3 = r.abilities.filter(a => a.slot !== 'ult'), ult = r.abilities.find(a => a.slot === 'ult');
      const problems = [];
      if (r.error) problems.push('error: ' + r.error);
      for (const a of r.abilities) {
        const lbl = (a.slot === 'ult' ? 'Definitiva' : 'Hab. ' + (a.slot + 1)) + ' ' + a.name;
        if (a.err) problems.push(lbl + ': error ' + a.err);
        if (!a.cats.length) problems.push(lbl + ': sin efecto medible');
        if (!a.vfx && a.cats.length) problems.push(lbl + ': sin efecto visual');
        if (a.aims && !a.aimProfile) problems.push(lbl + ': apunta pero no tiene premarcado (' + a.kind + ')');
      }
      const area = sk3.filter(a => a.cats.includes('AREA'));
      if (!area.length) problems.push('ninguna habilidad de ÁREA (4+ enemigos)');
      if (!sk3.some(a => a.cats.includes('MULTIPLE') && (area.length > 1 || !area.includes(a)))) problems.push('falta otra habilidad (distinta de la de área) que dañe a varios enemigos');
      if (!sk3.some(a => a.cats.includes('POTENCIA') || a.cats.includes('CURA'))) problems.push('ninguna habilidad de POTENCIACIÓN (buff propio o de aliados) ni cura/escudo');
      const ultCats = ult ? ult.cats.filter(c => c !== 'MULTIPLE' || !ult.cats.includes('AREA')) : [];
      if (!ult || ultCats.length < 3) problems.push('la definitiva suma ' + ultCats.length + ' categorías (' + ultCats.join(', ') + '); se piden 3+');
      r.isNew = !known.includes(k) && k !== '__canary__';
      r.problems = problems; r.status = problems.length ? (r.isNew ? 'FAIL' : 'INFO') : 'PASS';
      if (k === '__canary__') {
        if (problems.length < 4) { console.error('FAIL: el canario pasó el filtro: el filtro es decorativo'); process.exitCode = 1; }
        else console.log('canario rechazado (' + problems.length + ' problemas)');
        continue;
      }
      results.push(r);
      console.log(`${r.status.padEnd(5)} ${k.padEnd(11)} ${r.isNew ? 'nuevo ' : 'clásico'} ` + r.abilities.map(a => `[${a.cats.join('+') || '—'}${a.aims ? (a.aimProfile ? ' ◎' : ' ✗apunta') : ''}]`).join(' '));
      for (const p of problems) console.log('       · ' + p);
    }
    if (!process.env.ONLY || process.argv.includes('--workshop-quality')) {
      fs.mkdirSync(OUT, {recursive: true});
      fs.writeFileSync(path.join(OUT, 'ability-gate.json'), JSON.stringify({schemaVersion: 1, categories: CATS, champions: results, pageErrors}, null, 1) + '\n');
      fs.writeFileSync(path.join(OUT, 'ABILITY_GATE.md'), md(results));
    }
    const failed = results.filter(r => r.status === 'FAIL');
    console.log(`\n${results.length} campeones · nuevos que no pasan: ${failed.length} · page errors: ${pageErrors.length}`);
    if (process.argv.includes('--strict') && (failed.length || pageErrors.length)) process.exitCode = 1;
  } finally { await browser.close(); if (server) server.kill(); }
})().catch(e => { console.error(e); process.exitCode = 1; if (server) server.kill(); });

function md(results) {
  const L = ['# Filtro de habilidades (generado por tools/bible/ability-gate.js)', '',
    'Categorías medidas en el motor: ' + CATS.join(', ') + '. ◎ = apunta con premarcado. Reglas en docs/bible/ABILITY_GATE.md.', '',
    '| Campeón | Estado | Hab. 1 | Hab. 2 | Hab. 3 | Definitiva |', '|---|---|---|---|---|---|'];
  for (const r of results) L.push(`| ${r.key} | ${r.status} | ` + r.abilities.map(a => `${a.name}: ${a.cats.join('+') || '—'}${a.aims ? (a.aimProfile ? ' ◎' : ' ✗') : ''}`).join(' | ') + ' |');
  L.push('', '## Problemas', '');
  for (const r of results) if (r.problems.length) { L.push(`### ${r.key} (${r.status})`); for (const p of r.problems) L.push('- ' + p); L.push(''); }
  return L.join('\n') + '\n';
}
