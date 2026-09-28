// CUERPOS PRESTADOS (js/data/body-swaps.js): cada entrada arma su atlas, se dibuja sin errores, camina con
// más de un cuadro, ataca con cuadros distintos de la caminata, tiene golpe y muerte, y ?bodyswap=0 vuelve al
// arte original. Además, cada tipo se pone en partida (en su arena) y se lo mata para ver su muerte.
//   (python3 -m http.server 8771 --bind 127.0.0.1 &) ; SE_BASE_URL=http://127.0.0.1:8771 node tools/art/t_body_swaps.js [outdir]
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const fs = require('fs'), path = require('path');
const BASE = process.env.SE_BASE_URL || 'http://127.0.0.1:8771';
const OUT = process.argv[2] || null; if (OUT) fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 300) : '')); if (!ok) fails++; };

async function open(browser, q) {
  const page = await (await browser.newContext({ viewport: { width: 1000, height: 600 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if ((m.type() === 'error' || /body-swaps/.test(m.text())) && !/ERR_CERT|fonts\.g|net::/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.goto(`${BASE}/index.html?dev=1${q || ''}`, { waitUntil: 'load', timeout: 180000 });
  for (let i = 0; i < 400; i++) { if (await page.evaluate(() => { const b = document.getElementById('title-continue-btn'); return b && !b.disabled; })) break; await sleep(100); }
  return { page, errors };
}

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const { page, errors } = await open(browser);
  for (let i = 0; i < 200; i++) { if (await page.evaluate(() => bodySwapsReady())) break; await sleep(150); }
  check('atlas_prestados_listos', await page.evaluate(() => bodySwapsReady()));
  // cuadros por estado del atlas prestado y lo que dibuja drawEnemyAtlasPack en cada estado
  const info = await page.evaluate(() => {
    const out = {};
    for (const k in BODY_SWAPS) {
      const P = ENEMY_ATLAS_PACK['bs_' + k];
      const n = s => (P.sets[s] ? new Set(P.sets[s]).size : 0);
      out[k] = { ready: P.ready, body: BODY_SWAPS[k].body, walk: n('walk'), atk: n('atk'), hit: n('hit'), death: n('death'), key: bodySwapKey(k), isType: !!ENEMY_BASE[k],
        atkDiffers: !!(P.sets.atk && P.sets.walk && P.sets.atk.some(v => !P.sets.walk.includes(v))) };
    }
    return out;
  });
  for (const k in info) {
    const r = info[k];
    check(`atlas.${k}`, r.ready && r.key === 'bs_' + k, r);
    check(`animado.${k}`, r.walk >= 3 && r.atk >= 2 && r.atkDiffers, { walk: r.walk, atk: r.atk });
    // la Sirena y el Maestro usan tiras del Laberinto sin muerte propia (la muerte la hace la animación genérica) y la
    // tira de la Druida (Maestro) tampoco trae golpe: clona el quieto
    check(`golpe_muerte.${k}`, (r.hit >= 1 || k === 'cm_maestro') && (r.death >= 2 || ['sirena_abisal', 'cm_maestro'].includes(k)), { hit: r.hit, death: r.death });
  }
  // en partida: cada tipo en su arena, vivo, atacando y muriendo, sin errores
  const ARENA = { golem_cuerpos: 'infernal', cm_presentador: 'ciudad', cm_dama: 'ciudad', cm_espejismo: 'ciudad', cm_maestro: 'ciudad', cm_tramoyista: 'ciudad',
    tiburon_joven: 'acuatica', tiburon_blanco: 'acuatica', cangrejo_acorazado: 'acuatica', medusa_electrica: 'acuatica', sirena_abisal: 'acuatica',
    ab_jinete: 'abismo', ab_carcelero: 'abismo', esfinge: 'laberinto' };
  const byArena = {};
  for (const t in ARENA) (byArena[ARENA[t]] = byArena[ARENA[t]] || []).push(t);
  for (const a in byArena) {
    await page.evaluate((a) => { save.crystalWorn = 'none'; selectedClass = 'guerrero'; currentArena = a; lobbyAllies = []; startRun(1); }, a);
    await sleep(1500);
    const r = await page.evaluate((types) => {
      for (const h of heroes) h.invulnTimer = 1e9;
      const res = {};
      types.forEach((t, i) => {
        const e = spawnEnemy(t, false, false);
        e.x = player.x - 260 + i * 130; e.y = player.y + 60; e.stunTimer = 1e9; e.abEmerge = 0; e.mnEmerge = 0; e.abRise = 0; e.cmRoof = false;
        res[t] = { name: e.name, drawnBy: null };
        // qué atlas usa el dibujo (se intercepta drawAnimFrameSized un cuadro)
        const f0 = window.drawAnimFrameSized; let used = null;
        window.drawAnimFrameSized = function (img) { if (!used) used = img; return f0.apply(this, arguments); };
        try { drawEnemyBody(e); } finally { window.drawAnimFrameSized = f0; }
        // (el Espejismo se dibuja con el atlas prestado de la Dama: cualquier atlas "bs_" vale)
        const bs = Object.keys(ENEMY_ATLAS_PACK).filter(k => k.startsWith('bs_')).map(k => ENEMY_ATLAS_PACK[k].atlas);
        res[t].drawnBy = used && bs.includes(used) ? 'prestado' : (used ? 'otro' : 'nada');
      });
      return res;
    }, byArena[a]);
    for (const t in r) check(`dibuja_prestado.${t}`, r[t].drawnBy === 'prestado', r[t]);
    await sleep(700);
    if (OUT) await page.screenshot({ path: path.join(OUT, `vivos_${a}.png`) });
    // muerte: se matan y se mira que el cadáver/la muerte se dibuje sin errores
    await page.evaluate((types) => { for (const e of enemies) if (types.includes(e.type) && e.alive) { e.stunTimer = 0; e.lastHitBy = player; damageEnemy(e, 1e9, { src: player }); } }, byArena[a]);
    await sleep(900);
    if (OUT) await page.screenshot({ path: path.join(OUT, `muertes_${a}.png`) });
  }
  // nombres del Códice
  const names = await page.evaluate(() => ({ tj: ENEMY_BASE.tiburon_joven.name, tb: ENEMY_BASE.tiburon_blanco.name, cg: ENEMY_BASE.cangrejo_acorazado.name, lore: CODEX_CREATURES.tiburon_joven.lore.slice(0, 40) }));
  check('nombres_nuevos', names.tj === 'Ahogado de las Ruinas' && names.tb === 'Tritón de las Fosas' && names.cg === 'Cangrejo Araña', names);
  check('sin_errores_de_pagina', errors.length === 0, errors.slice(0, 5));
  // ?bodyswap=0: vuelve el arte y el nombre original
  const off = await open(browser, '&bodyswap=0');
  const o = await off.page.evaluate(() => ({ key: bodySwapKey('cm_presentador'), name: ENEMY_BASE.tiburon_joven.name }));
  check('apagado_con_bodyswap0', o.key === null && o.name === 'Tiburón Joven', o);
  await browser.close();
  console.log(fails ? `FALLAS: ${fails}` : 'OK: todo pasó');
  process.exit(fails ? 1 : 0);
})();
