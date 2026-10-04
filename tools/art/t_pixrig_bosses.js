// JEFES REDIBUJADOS CON PIXRIG (tools/art/pixrig): cada hoja carga, no queda ningún cuerpo prestado, trae TODOS los
// estados que pide su código (con cuadros distintos para caminar y atacar), su densidad de píxel queda < ×2,5 la del
// roster, y en partida (en su arena) se dibuja con SU atlas, ataca y muere sin errores.
//   node tools/art/t_pixrig_bosses.js [outdir]   (sirve el repo en SE_BASE_URL, default http://127.0.0.1:8771; lo levanta si no hay nada)
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const fs = require('fs'), path = require('path'), http = require('http'), { spawn } = require('child_process');
const BASE = process.env.SE_BASE_URL || 'http://127.0.0.1:8771';
const OUT = process.argv[2] || null; if (OUT) fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 300) : '')); if (!ok) fails++; };

// clave del atlas → [tipo, arena, radio (si el acto cambia el radio), estados que pide su código]
const BOSSES = {
  cm_presentador: ['cm_presentador', 'ciudad', 0, ['idle', 'walk', 'atk', 'hit', 'death', 'cast', 'transform']],
  cm_presentador2: ['cm_presentador', 'ciudad', 52, ['idle', 'walk', 'atk', 'hit', 'death', 'cast']],
  cm_presentador3: ['cm_presentador', 'ciudad', 60, ['idle', 'walk', 'atk', 'hit', 'death', 'cast']],
  cm_maestro: ['cm_maestro', 'ciudad', 0, ['idle', 'walk', 'atk', 'hit', 'death', 'cast', 'tp']],
  cm_dama: ['cm_dama', 'ciudad', 0, ['idle', 'walk', 'atk', 'hit', 'death', 'cast', 'summon', 'mirror']],
  cm_tramoyista: ['cm_tramoyista', 'ciudad', 0, ['idle', 'walk', 'atk', 'hit', 'death', 'heavy', 'drag', 'wreck', 'throw']],
  ab_carcelero: ['ab_carcelero', 'abismo', 0, ['idle', 'walk', 'atk', 'hit', 'death', 'chain', 'drag', 'slam', 'break']],
  mn_titan: ['mn_titan', 'minas', 0, ['idle', 'walk', 'run', 'atk', 'hit', 'death', 'slam', 'throw', 'stomp']],
  mn_cerbero: ['mn_cerbero', 'minas', 0, ['idle', 'walk', 'run', 'atk', 'hit', 'death', 'flame', 'stomp', 'bite', 'summon']],
  angel_corrompido: ['angel_corrompido', 'infernal', 0, ['idle', 'walk', 'atk', 'hit', 'death', 'cast', 'cast0']],
  golem_cuerpos: ['golem_cuerpos', 'infernal', 0, ['idle', 'walk', 'atk', 'hit', 'death', 'slam', 'tf', 'pre']],
};

function ping(url) { return new Promise(res => { const r = http.get(url, x => { x.resume(); res(x.statusCode < 500); }); r.on('error', () => res(false)); r.setTimeout(1500, () => { r.destroy(); res(false); }); }); }
async function ensureServer() {
  if (await ping(BASE + '/index.html')) return null;
  const u = new URL(BASE);
  const srv = spawn('python3', ['-m', 'http.server', u.port || '80', '--bind', u.hostname], { cwd: path.resolve(__dirname, '..', '..'), stdio: 'ignore' });
  for (let i = 0; i < 50 && !(await ping(BASE + '/index.html')); i++) await sleep(100);
  return srv;
}

(async () => {
  const srv = await ensureServer();
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: 1000, height: 600 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  await page.goto(`${BASE}/index.html?dev=1`, { waitUntil: 'load', timeout: 180000 });
  for (let i = 0; i < 400; i++) { if (await page.evaluate(() => { const b = document.getElementById('title-continue-btn'); return b && !b.disabled; })) break; await sleep(100); }
  for (let i = 0; i < 300; i++) { if (await page.evaluate((ks) => ks.every(k => ENEMY_ATLAS_PACK[k] && ENEMY_ATLAS_PACK[k].ready), Object.keys(BOSSES))) break; await sleep(150); }
  const info = await page.evaluate((B) => {
    const out = {};
    for (const k in B) {
      const [t, , rad, need] = B[k], P = ENEMY_ATLAS_PACK[k];
      if (!P) { out[k] = { missing: true }; continue; }
      const n = s => (P.sets[s] ? new Set(P.sets[s]).size : 0);
      const radius = rad || (ENEMY_BASE[t] ? ENEMY_BASE[t].radius : 0);
      const upx = radius * (P.hMul || 2.6) / P.refH;
      out[k] = { ready: P.ready, swap: typeof bodySwapKey === 'function' ? bodySwapKey(t) : null, missingSets: need.filter(s => !n(s)),
        walk: n('walk'), death: n('death'), atkDiffers: !!(P.sets.atk && P.sets.walk && P.sets.atk.some(v => !P.sets.walk.includes(v))),
        upx: +upx.toFixed(2), cell: [P.fw, P.fh], frames: P.atlas && P.atlas.naturalWidth ? (P.atlas.naturalWidth / P.fw) * (P.atlas.naturalHeight / P.fh) : 0 };
    }
    return out;
  }, BOSSES);
  const ROSTER_UPX = 0.953; // mediana del roster (docs/bible/generated/art/density.json)
  for (const k in info) {
    const r = info[k];
    check(`atlas.${k}`, !r.missing && r.ready, r);
    if (r.missing) continue;
    check(`sin_prestado.${k}`, !r.swap, { swap: r.swap });
    check(`estados.${k}`, r.missingSets.length === 0, { faltan: r.missingSets });
    check(`animado.${k}`, r.walk >= 4 && r.death >= 4 && r.atkDiffers, { walk: r.walk, death: r.death, atkDiffers: r.atkDiffers });
    check(`densidad.${k}`, r.upx / ROSTER_UPX < 2.5, { upx: r.upx, x: +(r.upx / ROSTER_UPX).toFixed(2), cell: r.cell });
  }
  // en partida: en su arena, dibujado con su propio atlas, atacando y muriendo
  const byArena = {};
  for (const k in BOSSES) (byArena[BOSSES[k][1]] = byArena[BOSSES[k][1]] || []).push(k);
  for (const a in byArena) {
    await page.evaluate((a) => { save.crystalWorn = 'none'; selectedClass = 'guerrero'; currentArena = a; lobbyAllies = []; startRun(1); }, a);
    await sleep(1500);
    const r = await page.evaluate(({ keys, B }) => {
      for (const h of heroes) h.invulnTimer = 1e9;
      const res = {};
      keys.forEach((k, i) => {
        const [t] = B[k];
        const e = spawnEnemy(t, false, false);
        if (k !== t) e.atlasKey = k;
        e.cine = null; e.cineT = 0;
        e.x = player.x - 300 + i * 120; e.y = player.y + 80; e.stunTimer = 1e9; e.abEmerge = 0; e.mnEmerge = 0; e.abRise = 0; e.cmRoof = false;
        const f0 = window.drawAnimFrameSized, used = [];
        window.drawAnimFrameSized = function (img) { used.push(img); return f0.apply(this, arguments); };
        try { drawEnemyBody(e); e.attackAnim = 300; e.stunTimer = 0; drawEnemyBody(e); } finally { window.drawAnimFrameSized = f0; }
        res[k] = { own: used.includes(ENEMY_ATLAS_PACK[k].atlas), n: used.length };
      });
      return res;
    }, { keys: byArena[a], B: BOSSES });
    for (const k in r) check(`dibuja_propio.${k}`, r[k].own, r[k]);
    if (a === 'ciudad') {  // los espejismos de la Dama: su mismo cuerpo, translúcido (cm-render.js)
      const m = await page.evaluate(() => { const e = spawnEnemy('cm_espejismo', false, false); e.x = player.x; e.y = player.y - 120; e.stunTimer = 1e9;
        const f0 = window.drawAnimFrameSized; let used = null; window.drawAnimFrameSized = function (img) { if (!used) used = img; return f0.apply(this, arguments); };
        try { drawEnemyBody(e); } finally { window.drawAnimFrameSized = f0; } return { dama: used === ENEMY_ATLAS_PACK.cm_dama.atlas }; });
      check('espejismo_usa_la_dama', m.dama, m);
    }
    await sleep(600);
    if (OUT) await page.screenshot({ path: path.join(OUT, `vivos_${a}.png`) });
    await page.evaluate((keys) => { for (const e of enemies) if (e.alive) { e.stunTimer = 0; e.lastHitBy = player; damageEnemy(e, 1e9, { src: player }); } }, byArena[a]);
    await sleep(1200);
    if (OUT) await page.screenshot({ path: path.join(OUT, `muertes_${a}.png`) });
  }
  check('sin_errores_de_pagina', errors.length === 0, errors.slice(0, 5));
  await browser.close(); if (srv) srv.kill();
  console.log(`SUMMARY ${fails ? 'FALLAS: ' + fails : 'OK'}`);
  process.exit(fails ? 1 : 0);
})();
