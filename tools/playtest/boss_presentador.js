// Pelea contra EL PRESENTADOR (Ciudad Maldita, nivel 10) con el piloto automático "jugador competente".
// Mide lo que pidió la reseña (§6.4 #5): ¿el primer jefe es un muro? Cuánto dura la pelea, cuánto daño le
// hace al guardián y, sobre todo, si un jugador que SE CUBRE en la Ovación Final gana y uno que no, pierde a veces.
//
//   (servir el repo) SE_BASE_URL=http://127.0.0.1:8843 node tools/playtest/boss_presentador.js [intentos] [clase] [nivel]
//
// MODE=full (por defecto): partida REAL desde el nivel 1 de la Ciudad con un perfil nuevo (el guardián en el
//   nivel del guardado nuevo, sin objetos, los aliados que da la Sala y los refuerzos que se eligen en cada
//   nivel). Así el jefe se mide con el nivel y los refuerzos que tendría un jugador de verdad al llegar.
//   En los niveles 1-9 el piloto no muere: si queda por debajo del 30 % de vida se lo cura y se cuenta
//   ("rescates": las veces que un humano habría usado una poción o perdido y reintentado). Con el jefe, no.
// MODE=boss: como la versión vieja, directo al nivel 10 con [nivel] y 9 refuerzos al azar.
// COVER=si|no|ambos (por defecto ambos): "si" = el piloto lee el aviso de la Ovación (con un tiempo de
//   reacción humano) y va detrás del pilar más cercano; "no" = el piloto de siempre, que no sabe cubrirse.
// DIFF_TIER=pesadilla|infierno para medir en esas dificultades.
// Sale una línea por intento y la tabla por modo: ganó / cayó, segundos, % de vida perdida (golpes / vida máx.),
// vida mínima, Ovaciones (a cubierto / sin cobertura) y el % de vida con que quedó el jefe si ganó él.
const { chromium } = (() => { try { return require('playwright'); } catch (e) { return require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright'); } })();
const path = require('path');
const BASE = process.env.SE_BASE_URL || 'http://127.0.0.1:8823';
const N = +(process.argv[2] || 4), CLS = process.argv[3] || 'mago', LVL = +(process.argv[4] || 6);
const DIFFK = process.env.DIFF_TIER || 'normal';
const MODE = process.env.MODE || 'full';
const COVERS = (process.env.COVER || 'ambos') === 'ambos' ? [true, false] : [(process.env.COVER === 'si')];
const REACT_MS = +(process.env.REACT_MS || 700);
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const rows = [];
  for (const cover of COVERS) for (let i = 0; i < N; i++) {
    const ctx = await browser.newContext({ viewport: { width: 844, height: 390 } });
    await ctx.addInitScript(() => { window.__campaignMode = true; });
    const page = await ctx.newPage(); const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    await page.goto(`${BASE}/index.html`, { waitUntil: 'load', timeout: 180000 });
    for (let k = 0; k < 400; k++) { if (await page.evaluate(() => { const b = document.getElementById('title-continue-btn'); return b && !b.disabled; })) break; await sleep(100); }
    // El "cubrirse" va POR DEBAJO del piloto: el piloto decide su movimiento y, durante la Ovación, esto lo pisa.
    await page.evaluate(([cover, react, dbg]) => {
      window.__DBG = dbg; window.__cov = { on: cover, t: 0, ovs: 0, covered: 0, exposed: 0, prevOv: false };
      const upd = window.update;
      window.update = function (dt) {
        const C = window.__cov, b = (typeof boss !== 'undefined' && boss && boss.type === 'cm_presentador' && boss.alive) ? boss : null;
        if (b && b.ov) { if (!C.prevOv) { C.ovs++; C.t = 0; } C.prevOv = true; C.t += dt; }
        else if (C.prevOv) { C.prevOv = false; }
        if (C.on && b && b.ov && player.alive && C.t > react) {
          // el lugar detrás del pilar (mirando desde el Presentador) más cercano; si el pilar queda en el medio, se lo rodea
          let best = null, bd = Infinity;
          // con la marca del piso (cmCoverSpot) el jugador va a la sombra marcada; sin ella (versión vieja), al pilar más cercano
          if (typeof cmCoverSpot === 'function') { best = cmCoverSpot(b, player.x, player.y); bd = best ? best.d : Infinity; }
          else for (const p of cmS.pillars) { if (p.t < 0) continue; const dx = p.x - b.x, dy = p.y - b.y, L = Math.hypot(dx, dy) || 1, sx = p.x + dx / L * (p.r + 34), sy = p.y + dy / L * (p.r + 34), d = Math.hypot(sx - player.x, sy - player.y); if (d < bd) { bd = d; best = { x: sx, y: sy, p, ux: dx / L, uy: dy / L }; } }
          if (best) {
            const tx = best.x, ty = best.y, p = best.p;
            let vx = tx - player.x, vy = ty - player.y; const d = Math.hypot(vx, vy) || 1; vx /= d; vy /= d;
            // si el pilar queda en el medio, se lo rodea por el lado más corto (tangente + un poco hacia afuera)
            const l2 = (tx - player.x) ** 2 + (ty - player.y) ** 2 || 1, t = Math.max(0, Math.min(1, ((p.x - player.x) * (tx - player.x) + (p.y - player.y) * (ty - player.y)) / l2));
            const qx = player.x + (tx - player.x) * t - p.x, qy = player.y + (ty - player.y) * t - p.y;
            if (Math.hypot(qx, qy) < p.r + 26) {
              const rx = player.x - p.x, ry = player.y - p.y, rl = Math.hypot(rx, ry) || 1, side = (rx * (ty - p.y) - ry * (tx - p.x)) >= 0 ? 1 : -1;
              vx = -ry / rl * side + rx / rl * 0.35; vy = rx / rl * side + ry / rl * 0.35; const vl = Math.hypot(vx, vy) || 1; vx /= vl; vy /= vl;
            }
            joyVec = d > 8 ? { x: vx, y: vy } : { x: 0, y: 0 };
            if (window.__DBG && ((C.t / 250) | 0) !== C._lt) { C._lt = (C.t / 250) | 0; (C.tr = C.tr || []).push([C.t | 0, Math.round(player.x), Math.round(player.y), Math.round(tx), Math.round(ty), Math.round(best.x), Math.round(best.y)]); }
          }
        }
        const wasOv = !!(b && b.ov), alive0 = player.alive;
        const r = upd(dt);
        // la Ovación se resolvió en este paso: ¿quedó detrás de un pilar?
        if (wasOv && b && !b.ov && alive0) { if (cmCovered(b, player)) C.covered++; else C.exposed++;
          if (window.__DBG) (C.log = C.log || []).push({ cov: cmCovered(b, player), px: Math.round(player.x), py: Math.round(player.y), bx: Math.round(b.x), by: Math.round(b.y), pil: cmS.pillars.filter(p => p.t >= 0).map(p => [Math.round(p.x), Math.round(p.y)]), stun: player.stunTimer | 0, slow: player.slowTimer | 0 }); }
        return r;
      };
    }, [cover, REACT_MS, !!process.env.DBG]);
    await page.addScriptTag({ path: path.join(__dirname, 'autopilot.js') });
    const r = await page.evaluate(([cls, lvl, dk, mode]) => {
      loop = function () {};
      const ch = save.champions[cls]; ch.unlocked = true;
      if (mode === 'boss') { for (const k in save.champions) { const c = save.champions[k]; c.unlocked = true; c.level = lvl; const al = Math.min(10, Math.floor(lvl / 3)); c.skillMastery.forEach(m => m.alloc = al); c.ultMastery.alloc = al; } }
      // DIFF_TIER=pesadilla|infierno: se abre esa dificultad en todas las arenas (difficulty-tiers.js)
      if (typeof diffSetSelected === 'function' && dk !== 'normal') { for (const a of ARENA_ORDER) { save.arenasCleared[a] = true; save.diffCleared.pesadilla[a] = true; if (dk === 'infierno') save.diffCleared.infierno[a] = true; } diffSetSelected(dk); }
      lobbyAllies = mode === 'boss' ? ['tanque', 'guerrero', 'soporte'].filter(k => k !== cls).slice(0, 3) : pickLobbyAllies(cls);
      const B = { taken: 0, minHp: 100, bossAt: null, deadAt: null, fell: false, rescues: 0, lvlAtBoss: null, lvl0: save.champions[cls].level };
      const dh = window.damageHero;
      window.damageHero = function (h, amount, src) {
        if (h === player && B.bossAt === null && h.alive && h.hp < h.maxHp * 0.3) { h.hp = h.maxHp; B.rescues++; }
        const hp0 = h.hp; dh(h, amount, src);
        if (h === player && boss && boss.type === 'cm_presentador' && B.bossAt !== null) { B.taken += Math.max(0, hp0 - h.hp); }
      };
      __AP.start(cls, 'ciudad', mode === 'boss' ? 10 : 1);
      if (mode === 'boss') for (let j = 0; j < 9; j++) { const b = BUFF_POOL[(Math.random() * BUFF_POOL.length) | 0]; try { b.apply(runStats); } catch (e) {} }
      let t = 0; const CAP = (mode === 'boss' ? 8 : 30) * 60000;
      while (t < CAP) {
        __AP.sim(500); t += 500;
        if (typeof campClose === 'function' && document.getElementById('camp-overlay') && !document.getElementById('camp-overlay').classList.contains('hidden')) try { campClose(true); } catch (e) {}
        if (boss && boss.type === 'cm_presentador' && B.bossAt === null) { B.bossAt = t; B.lvlAtBoss = save.champions[cls].level; }
        if (B.bossAt !== null && player.alive) B.minHp = Math.min(B.minHp, Math.round(100 * player.hp / player.maxHp));
        if (B.bossAt !== null && !player.alive) { B.fell = true; }
        if (B.bossAt !== null && B.deadAt === null && (!boss || !boss.alive || (cmS.pr && cmS.pr.st !== 'fight' && cmS.pr.st !== 'transform'))) { B.deadAt = t; break; }
        if (B.fell && heroes.every(h => !h.alive)) break;
        if (state !== 'playing' && state !== 'buff') break;
      }
      return { lvl0: B.lvl0, lvl: B.lvlAtBoss, hp: Math.round(player.maxHp), rescues: B.rescues, fightS: B.bossAt === null ? null : Math.round(((B.deadAt || t) - B.bossAt) / 1000), won: B.deadAt !== null,
        reached: B.bossAt !== null, lostPct: Math.round(100 * B.taken / player.maxHp), minHp: B.minHp, fell: B.fell, state, runLevel,
        bossHpLeft: boss && boss.alive ? Math.round(100 * boss.hp / boss.maxHp) : 0, act: cmS.pr && cmS.pr.act,
        ovs: __cov.ovs, dbg: __cov.log, tr: __DBG ? __cov.tr : undefined, ovCub: __cov.covered, ovExp: __cov.exposed, tier: runDifficulty.tier || 'normal' };
    }, [CLS, LVL, DIFFK, MODE]);
    r.cover = cover; r.errs = errs.slice(0, 2);
    rows.push(r); console.log(JSON.stringify(r));
    await ctx.close();
  }
  await browser.close();
  const med = a => { const s = a.filter(x => x !== null && x !== undefined).sort((x, y) => x - y); return s.length ? s[(s.length - 1) >> 1] : null; };
  for (const cover of COVERS) {
    const R = rows.filter(r => r.cover === cover), F = R.filter(r => r.reached);
    console.log('RESUMEN', JSON.stringify({ cls: CLS, mode: MODE, diff: DIFFK, cubre: cover ? 'si' : 'no', n: R.length, llegaron: F.length, ganaron: F.filter(r => r.won && !r.fell).length,
      cayeron: F.filter(r => r.fell).length, lvl_med: med(F.map(r => r.lvl)), fightS_med: med(F.map(r => r.fightS)), lostPct_med: med(F.map(r => r.lostPct)), minHp_med: med(F.map(r => r.minHp)),
      ovaciones: F.reduce((a, r) => a + r.ovs, 0), ovCubierto: F.reduce((a, r) => a + r.ovCub, 0), ovSinCobertura: F.reduce((a, r) => a + r.ovExp, 0), jefeQuedo: F.filter(r => r.fell).map(r => r.bossHpLeft), rescates_med: med(R.map(r => r.rescues)) }));
  }
})();
