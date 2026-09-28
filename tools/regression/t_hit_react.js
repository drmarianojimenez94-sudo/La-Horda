// Reacción al golpe y lectura de la pelea (reseña del crítico #7, #9, #10, #18, #28):
//   - retroceso por peso: el liviano vuela más, el pesado menos, jefes y estructuras nada;
//   - el empujón se desliza con colisión: no atraviesa muros;
//   - Abismo: un básico no tira a nadie al vacío; un golpe fuerte sí (recompensa);
//   - cadáveres despedidos por el remate fuerte (sin explosión: no dañan a nadie), sin arco con
//     "Reducir movimiento";
//   - destello blanco en TODOS los cuerpos (también los que no pasan por los primitivos de sprites);
//   - cámara anclada según el alto (844x390, 915x412, 1440x810): el guardián queda en la franja libre
//     entre el HUD de arriba y la voz del Hechicero, el cartel central no lo tapa;
//   - la voz del Hechicero se agacha al recibir daño y vuelve con el mismo texto;
//   - nombre corto del guardián en el HUD ("Segador"), completo en los menús.
//   (python3 -m http.server 8824 &) ; SE_BASE_URL=http://127.0.0.1:8824 node tools/regression/t_hit_react.js [carpeta_capturas]
let chromium, devices;
try { ({ chromium, devices } = require('playwright')); } catch (e) { ({ chromium, devices } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const BASE = process.env.SE_BASE_URL || process.env.REGRESSION_BASE_URL || 'http://127.0.0.1:8824';
const OUT = process.argv[2];
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 420) : '')); if (!ok) fails++; };

async function boot(browser, opts) {
  const ctx = await browser.newContext(opts);
  await ctx.addInitScript(() => { window.__campaignMode = true; try { if (!sessionStorage.getItem('__s')) { localStorage.clear(); sessionStorage.setItem('__s', '1'); } localStorage.removeItem('horda_motion'); } catch (e) {} });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  await page.goto(`${BASE}/index.html`, { waitUntil: 'load', timeout: 120000 });
  for (let k = 0; k < 600; k++) { if (await page.evaluate(() => { const b = document.getElementById('title-continue-btn'); return b && !b.disabled; })) break; await sleep(100); }
  await page.evaluate(() => {
    for (const k in save.champions) { save.champions[k].unlocked = true; save.champions[k].level = 30; }
    save.starterChosen = true; persistNow();
    window.__start = (arena, champ, lvl) => { loop = function(){}; save.stash = []; for (const k in save.champions) save.champions[k].equipment = mkEquipment();
      selectedClass = champ || 'guerrero'; currentArena = arena || 'laberinto'; lobbyAllies = ['tanque','mago','soporte']; startRun(lvl || 3); spawnTimer = 1e12; enemies.length = 0; levelDuration = 9e9; invalidatePassiveCache(); runElapsedMs = 5000;
      setReduceMotion(false); resetFeedback(); state = 'playing'; for (const k in HIT_STATS) HIT_STATS[k] = 0; for (const k in DEATH_FLY_STATS) DEATH_FLY_STATS[k] = 0; };
    window.__foe = (dx, dy, t) => { const e = spawnEnemy(t || 'esqueleto', false); e.x = player.x + dx; e.y = player.y + dy; e.hp = e.maxHp = 50000; e.stunTimer = 0; return e; };
    window.__settle = (e, ms) => { for (let t = 0; t < (ms || 600); t += 16) updateHitKnock(e, 16); };
  });
  return { ctx, page, errors, E: (fn, a) => page.evaluate(fn, a) };
}

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  {
    const { ctx, page, errors, E } = await boot(browser, { viewport: { width: 900, height: 506 } });

    // 1) retroceso por peso: mismo golpe crítico desde la misma dirección
    const w = await E(() => { __start('bosque');
      const push = (radius, mod) => { const e = __foe(0, -70); e.radius = radius; if (mod) mod(e); const x0 = e.x, y0 = e.y;
        damageEnemy(e, 50, { src: player, forceCrit: true, heavy: true }); __settle(e); return Math.round(Math.hypot(e.x - x0, e.y - y0) * 10) / 10; };
      const r = { light: push(12), normal: push(22), heavy: push(46), elite: push(22, e => { e.rank = 'elite'; }) };
      r.boss = push(40, e => { e.rank = 'jefe'; }); r.sub = push(30, e => { e.rank = 'subjefe'; });
      r.structure = push(26, e => { e.structure = true; });
      const b = __foe(0, -70); b.radius = 22; const x0 = b.x, y0 = b.y; damageEnemy(b, 5, { src: player, fromBasic: true, critChanceOverride: 0 }); __settle(b); r.basic = Math.round(Math.hypot(b.x - x0, b.y - y0) * 10) / 10;
      // se desliza (no es un salto): al primer cuadro recorrió solo una parte
      const s = __foe(0, -70); s.radius = 22; const sy = s.y; damageEnemy(s, 50, { src: player, forceCrit: true, heavy: true }); const st0 = Math.abs(s.y - sy); updateHitKnock(s, 16); r.firstFrame = Math.round(Math.abs(s.y - sy) * 10) / 10; r.firstBefore = st0; __settle(s); r.slideTotal = Math.round(Math.abs(s.y - sy) * 10) / 10;
      return r; });
    check('HIT.retroceso_por_peso_liviano_mas_que_pesado', w.light > w.normal && w.normal > w.heavy && w.heavy > 0, w);
    check('HIT.elite_pesa_mas_que_comun', w.elite > 0 && w.elite < w.normal * 0.6, w);
    check('HIT.jefes_subjefes_y_estructuras_no_se_mueven', w.boss === 0 && w.sub === 0 && w.structure === 0, w);
    check('HIT.basico_empuja_poco_el_fuerte_mucho', w.basic > 0 && w.basic < w.normal * 0.5, w);
    check('HIT.se_desliza_no_teletransporta', w.firstBefore === 0 && w.firstFrame > 0 && w.firstFrame < w.slideTotal * 0.6, w);

    // 2) no atraviesa muros: enemigo pegado a un muro del Laberinto, empujado contra él una y otra vez
    const wall = await E(() => { __start('laberinto');
      const W = labyrinthWalls.find(w => w.len > 120 && w.thick >= 12); if (!W) return { none: true };
      const c = Math.cos(W.rot), s = Math.sin(W.rot), nx = -s, ny = c; // normal del muro
      const e = __foe(0, 0); e.radius = 12; const side = W.thick / 2 + e.radius + 4;
      e.x = W.x + nx * side; e.y = W.y + ny * side;
      const src = { x: e.x + nx * 60, y: e.y + ny * 60, classKey: 'guerrero', stats: {}, baseDmg: 10, ultCharge: 0, ultMax: 100 };
      const localY = () => { const dx = e.x - W.x, dy = e.y - W.y; return dx * nx + dy * ny; };
      const y0 = localY(); let minY = y0;
      for (let i = 0; i < 12; i++) { hitKnock(e, -nx, -ny, 60, 3, src); for (let t = 0; t < 200; t += 16) { updateHitKnock(e, 16); minY = Math.min(minY, localY()); } }
      damageEnemy(e, 5, { src: player, knockback: true }); // empujón de habilidad (46) también se desliza con colisión
      const pl = { x: e.x + nx * 60, y: e.y + ny * 60 }; const oldP = { x: player.x, y: player.y }; player.x = pl.x; player.y = pl.y;
      damageEnemy(e, 5, { src: player, knockback: true }); for (let t = 0; t < 600; t += 16) { updateHitKnock(e, 16); minY = Math.min(minY, localY()); }
      player.x = oldP.x; player.y = oldP.y;
      return { y0: Math.round(y0), minY: Math.round(minY), end: Math.round(localY()), half: W.thick / 2, blocked: HIT_STATS.blocked }; });
    check('HIT.no_atraviesa_muros', !wall.none && wall.minY > wall.half && wall.end > 0 && wall.blocked > 0, wall);

    // 3) cadáver despedido por el remate fuerte (en la dirección del golpe); el básico no lo lanza
    const fly = await E(() => { __start('bosque');
      const kill = (opts, dx) => { const e = __foe(dx, -60); e.radius = 16; e.hp = 5; const x0 = e.x, y0 = e.y; damageEnemy(e, 999, Object.assign({ src: player }, opts));
        const d = vfxDying.find(s => s.e === e); for (let t = 0; t < 700; t += 16) vfxUpdate(16);
        return { fly: !!(d && d.fly), dx: Math.round(e.x - x0), dy: Math.round(e.y - y0), corpse: corpseList.some(c => c.e === e) }; };
      const heavy = kill({ forceCrit: true, heavy: true }, 0);
      const basic = kill({ fromBasic: true, critChanceOverride: 0 }, 40);
      const alive = __foe(30, -70); const hp0 = alive.hp; const dmgHero = player.hp;
      setReduceMotion(true); const e3 = __foe(-40, -60); e3.radius = 16; e3.hp = 5; damageEnemy(e3, 999, { src: player, forceCrit: true, heavy: true }); const d3 = vfxDying.find(s => s.e === e3); const calm = d3 && d3.fly ? { vz: d3.fly.vz, spin: d3.fly.spin } : null; setReduceMotion(false);
      return { heavy, basic, launched: DEATH_FLY_STATS.launched, noDamage: alive.hp === hp0 && player.hp === dmgHero, calm }; });
    check('HIT.cadaver_despedido_con_el_golpe_fuerte', fly.heavy.fly && fly.heavy.dy < -15 && fly.heavy.corpse, fly);
    check('HIT.cadaver_no_vuela_con_el_basico', !fly.basic.fly && Math.abs(fly.basic.dy) < 4, fly);
    check('HIT.cadaver_no_explota_ni_dania', fly.noDamage, fly);
    check('HIT.reducir_movimiento_sin_arco_ni_giro', fly.calm && fly.calm.vz === 0 && fly.calm.spin === 0, fly);

    // 4) Abismo: el básico nunca tira al vacío; el golpe fuerte sí (recompensa)
    const ab = await E(() => { __start('abismo', 'guerrero', 2);
      let P = null, d = null;
      for (let a = 0; a < 6.28 && !P; a += 0.2) { const dx = Math.cos(a), dy = Math.sin(a); for (let r = 20; r < 900; r += 4) { if (!abWalkable(player.x + dx * r, player.y + dy * r, 0)) { P = { x: player.x + dx * (r - 14), y: player.y + dy * (r - 14) }; d = { x: dx, y: dy }; break; } } }
      if (!P) return { none: true };
      const type = Object.keys(ENEMY_BASE).find(k => k.indexOf('ab_') === 0 && ENEMY_BASE[k].rank === 'normal' && ENEMY_BASE[k].speed > 0) || 'esqueleto';
      const src = { x: P.x - d.x * 80, y: P.y - d.y * 80, classKey: 'guerrero', stats: {}, baseDmg: 10, ultCharge: 0, ultMax: 100, cds: [] };
      const run = (opts) => { const e = __foe(0, 0, type); e.x = P.x; e.y = P.y; e.radius = 14; e.hp = e.maxHp = 50000; e.stunTimer = 0;
        for (let i = 0; i < 6; i++) { damageEnemy(e, 1, Object.assign({ src }, opts)); for (let t = 0; t < 300; t += 16) { runElapsedMs += 16; if (e._kbRx || e._kbRy) updateHitKnock(e, 16); abShoveUpdate(e, 16); abClamp(e); } }
        const r = { alive: e.alive, fell: !!e.abFall, onGround: abWalkable(e.x, e.y, 0) }; e.alive = false; return r; };
      return { type, basic: run({ fromBasic: true, critChanceOverride: 0 }), heavy: run({ forceCrit: true, heavy: true }), shoves: HIT_STATS.voidShoves }; });
    check('HIT.abismo_basico_no_tira_al_vacio', !ab.none && ab.basic.alive && !ab.basic.fell && ab.basic.onGround, ab);
    check('HIT.abismo_golpe_fuerte_tira_al_vacio', !ab.none && ab.heavy.fell && ab.shoves > 0, ab);

    // 5) destello blanco en todos: cuerpos de caminos distintos (atlas, arenas con dibujo propio)
    const flash = [];
    for (const [arena, lvl] of [['laberinto', 3], ['micelial', 3], ['abismo', 3], ['acuatica', 3], ['ciudad', 3]]) {
      await E(([a, l]) => { __start(a, 'guerrero', l); spawnTimer = 0; levelDuration = 9e9; }, [arena, lvl]);
      await E(() => { for (let i = 0; i < 200; i++) { spawnTimer = Math.min(spawnTimer, 0); update(16); } });
      await sleep(900); // imágenes perezosas de la arena
      const r = await E(() => {
        const out = []; const seen = new Set();
        const pool = enemies.filter(e => e.alive && e.rank !== 'jefe' && !e.structure && !seen.has(e.type) && seen.add(e.type)).slice(0, 3);
        for (const e of enemies) if (!pool.includes(e)) e.alive = false;
        for (const h of heroes) if (h !== player) { h.x = player.x - 2000; }
        for (const e of pool) {
          for (const o of pool) { o.x = player.x - 3000; }
          e.x = player.x; e.y = player.y - 90; e.stunTimer = 0; e.attackAnim = 0; e.fxAnim = null;
          // solo el cuerpo (sin escenario: en el Abismo un cristal o una columna lo pueden tapar)
          const count = () => { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.restore();
            ctx.save(); ctx.imageSmoothingEnabled = false; ctx.scale(CAM_ZOOM, CAM_ZOOM); ctx.translate(VW / 2 / CAM_ZOOM - player.x, (VH / 2 - CAM_Y_ANCHOR) / CAM_ZOOM - player.y);
            animNow = performance.now(); animFlashBudget = 30; whiteFrameBegin(); drawEnemy(e); ctx.restore();
            const s = worldToScreen(e.x, e.y), R = Math.max(18, (e.radius || 20)) * CAM_ZOOM, k = canvas.width / VW;
            const x0 = Math.max(0, Math.round((s.x - R * 2.5) * k)), y0 = Math.max(0, Math.round((s.y - R * 4.5) * k)), w = Math.round(R * 5 * k), h = Math.round(R * 5.5 * k);
            const px = ctx.getImageData(x0, y0, w, h).data; let n = 0; // casi blanco (la luz/color de cada arena se aplica encima del mundo: el blanco llega a ~225-245)
            for (let i = 0; i < px.length; i += 4) { const a = px[i], b = px[i + 1], c = px[i + 2]; if (a > 212 && b > 212 && c > 212 && Math.max(a, b, c) - Math.min(a, b, c) < 40) n++; } return n; };
          e.hitFlash = 0; const base = count();
          let lit = 0; for (let i = 0; i < 4; i++) { e._lastHitPow = 2; e.lastHitBy = player; e.hitFlash = IMPACT_FLASH_MS[2]; lit = count(); }
          // el camino del lienzo aparte (cuerpos que no pasan por los primitivos) también da blanco
          const ap = animProfileOf(e), was = ap.whiteOff; ap.whiteOff = true; const o0 = FLASH_STATS.off; e.hitFlash = IMPACT_FLASH_MS[2]; const litOff = count(); const usedOff = FLASH_STATS.off > o0; ap.whiteOff = was;
          e.hitFlash = 0; out.push({ type: e.type, base, lit, off: !!was, litOff, usedOff });
          e.x = player.x - 3000;
        }
        return out; });
      for (const x of r) flash.push(Object.assign({ arena }, x));
    }
    const dark = flash.filter(f => !(f.lit >= 25 && f.lit > f.base * 1.8 + 20 && f.usedOff && f.litOff > f.base * 1.8 + 20));
    check('HIT.destello_blanco_en_todos_los_cuerpos', flash.length >= 8 && dark.length === 0, { n: flash.length, dark, sample: flash.slice(0, 12) });
    check('HIT.sin_errores_de_consola_combate', errors.length === 0, errors.slice(0, 3));
    await ctx.close();
  }

  // 6) cámara, cartel central, voz del Hechicero y nombre corto, en tres pantallas
  const VPS = [{ name: 'iphone_844x390', w: 844, h: 390, dev: 'iPhone 13' }, { name: 'pixel_915x412', w: 915, h: 412, dev: 'Pixel 7' }, { name: 'escritorio_1440x810', w: 1440, h: 810 }];
  for (const v of VPS) {
    let opts;
    if (v.dev && devices[v.dev]) { opts = Object.assign({}, devices[v.dev]); delete opts.defaultBrowserType; opts.viewport = { width: v.w, height: v.h }; opts.screen = { width: v.w, height: v.h }; opts.deviceScaleFactor = 2; }
    else opts = { viewport: { width: v.w, height: v.h } };
    const { ctx, page, errors, E } = await boot(browser, opts);
    const r = await E(async () => {
      __start('ciudad', 'segador', 1); loop = function(){};
      render(); updateHUD();
      tutSay('~t_hit', 'Cada habilidad necesita recargarse: esperá a que el botón se llene otra vez para volver a usarla.', null, 60000, true);
      _arenaTitleUntil = 0; showBanner('RUNA ACTIVA: ¡CORRÉ!');
      await new Promise(r => setTimeout(r, 450));
      const s = worldToScreen(player.x, player.y), head = s.y - 64 * CAM_ZOOM;
      const rc = el => { const b = el.getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom }; };
      const tut = rc(document.getElementById('tut-panel')), ban = rc(document.getElementById('center-banner'));
      const topHud = Math.max(52, VH * 0.085) + 28;
      const plevel = document.getElementById('plevel'); const plh = plevel.getBoundingClientRect().height, lh = parseFloat(getComputedStyle(plevel).lineHeight) || parseFloat(getComputedStyle(plevel).fontSize) * 1.3;
      const text0 = document.querySelector('#tut-panel .tut-text').textContent, until0 = TUT.until;
      // daño: se agacha (invisible), no pierde el texto, y su tiempo no corre mientras está escondido
      const foe = __foe(60, 0); registerPlayerHurt(player.maxHp * 0.06, foe); tutTick();
      await new Promise(r => setTimeout(r, 300)); tutTick();
      const ducked = document.getElementById('tut-panel').classList.contains('duck'), op = getComputedStyle(document.getElementById('tut-panel')).opacity;
      const keyKept = TUT.key === '~t_hit', text1 = document.querySelector('#tut-panel .tut-text').textContent, until1 = TUT.until;
      TUT.duckUntil = performance.now() - 1; tutTick();
      const back = !document.getElementById('tut-panel').classList.contains('duck') && TUT.key === '~t_hit';
      return { VH, heroY: Math.round(s.y), heroFrac: +(s.y / VH).toFixed(3), head: Math.round(head), topHud: Math.round(topHud), tut, ban,
        plevel: plevel.textContent, oneLine: plh < lh * 1.6, full: CLASSES.segador.name, ducked, op, keyKept, sameText: text0 === text1, extended: until1 > until0, back };
    });
    const overlap = (a, b) => a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;
    const heroBox = { l: 0, r: 0, t: r.head, b: r.heroY + 6 }; heroBox.l = v.w / 2 - 22; heroBox.r = v.w / 2 + 22;
    check(`CAM.${v.name}.heroe_en_la_franja_libre`, r.head > r.topHud && r.heroY < r.tut.t - 4, r);
    if (v.h <= 500) check(`CAM.${v.name}.pantalla_baja_heroe_mas_abajo_que_antes`, r.heroFrac >= 0.5 && r.heroFrac <= 0.6, { heroFrac: r.heroFrac, antes: +((v.h / 2 - 34) / v.h).toFixed(3) });
    check(`CAM.${v.name}.hechicero_no_tapa_al_heroe`, !overlap(r.tut, heroBox), { tut: r.tut, heroBox });
    check(`CAM.${v.name}.cartel_central_no_tapa_al_heroe`, !overlap(r.ban, heroBox), { ban: r.ban, heroBox });
    check(`CAM.${v.name}.hechicero_se_agacha_al_recibir_danio_y_vuelve`, r.ducked && Number(r.op) < 0.2 && r.keyKept && r.sameText && r.extended && r.back, r);
    check(`HUD.${v.name}.nombre_corto_en_una_linea`, /^Segador · Nv\./.test(r.plevel) && r.oneLine && r.full === 'Segador Olvidado', { plevel: r.plevel, oneLine: r.oneLine });
    if (OUT) { await page.evaluate(() => { tutSay('~t_hit2', 'Cada habilidad necesita recargarse: esperá a que el botón se llene otra vez para volver a usarla.', null, 60000, true); render(); }); await sleep(400); await page.screenshot({ path: `${OUT}/hit_react_${v.name}.png` }); }
    check(`CAM.${v.name}.sin_errores`, errors.length === 0, errors.slice(0, 3));
    await ctx.close();
  }
  await browser.close();
  console.log('SUMMARY ' + (fails ? 'FAIL' : 'OK') + ' fails=' + fails);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
