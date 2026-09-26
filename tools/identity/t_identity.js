// Pruebas de las mecánicas de identidad de las arenas del camino de siempre (ARENA_EXT) y del
// sistema de acción contextual (js/systems/context-actions.js). Sin dibujar salvo las capturas.
//   (python3 -m http.server 8771 &) ; node tools/identity/t_identity.js [carpeta_capturas]
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const path = require('path');
const BASE = process.env.SE_BASE_URL || 'http://127.0.0.1:8771';
const OUT = process.argv[2] || null;
const ONLY = process.env.ONLY || '';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 400) : '')); if (!ok) fails++; };
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: 900, height: 506 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_CERT|fonts\.g|net::/.test(m.text())) errors.push('console: ' + m.text().slice(0, 300)); });
  await page.addInitScript(() => { window.__campaignMode = true; });
  await page.goto(`${BASE}/index.html`, { waitUntil: 'load' });
  for (let k = 0; k < 300; k++) { if (await page.evaluate(() => !document.getElementById('title-continue-btn').disabled)) break; await sleep(100); }
  await page.evaluate(() => { loop = function(){}; });
  const E = (fn, a) => page.evaluate(fn, a);
  await E(() => {
    window.__start = (arena, lv, champ) => {
      for (const k of Object.keys(save.champions)) save.champions[k].unlocked = true;
      selectedClass = champ || 'guerrero'; currentArena = arena; lobbyAllies = ['tanque','mago','soporte'];
      startRun(lv || 1);
    };
    window.__step = (ms, god) => { let t = 0; while (t < ms) { if (state === 'buff') { const c = document.querySelector('#buff-cards > *'); if (c) c.click(); continue; } if (state !== 'playing') break; if (god !== false) for (const h of heroes) h.hp = Math.max(h.hp, h.maxHp*0.8); update(16); t += 16; } };
    window.__calm = () => { spawnTimer = 1e12; enemies.length = 0; levelDuration = 9e9; };
  });
  const shot = async (n) => { if (!OUT) return; await E(() => { render(); }); await page.screenshot({ path: path.join(OUT, n + '.png') }); };
  const want = k => !ONLY || ONLY.split(',').includes(k);

  // ---------------- registro ----------------
  const reg = await E(() => {
    const r = {};
    for (const a of ['bosque','acuatica','hielo','laberinto','infernal','fortaleza','micelial']) { currentArena = a; r[a] = { def: !!arenaDef(), upd: arenaHas('update'), ctx: arenaHas('ctxTargets') }; }
    currentArena = 'infernal'; divinaMode = true; const dv = arenaHas('update'); divinaMode = false;
    return { r, dv };
  });
  check('REG.infernal_extension_sin_tocar_arenaDef', !reg.r.infernal.def && reg.r.infernal.upd && reg.r.infernal.ctx, reg.r.infernal);
  check('REG.registradas_siguen_igual', reg.r.fortaleza.def && reg.r.micelial.def, reg.r);
  check('REG.divina_no_ve_extensiones', !reg.dv);

  if (want('inf')) {
    // ---------------- Infernal: fisuras ----------------
    await E(() => { __start('infernal', 1); __calm(); });
    const l1 = await E(() => { __step(40000); return INF.fis.length; });
    check('INF.nivel1_sin_fisuras', l1 === 0, l1);
    await E(() => { __start('infernal', 3); __calm(); window.__ua = updateAllies; updateAllies = function(){}; for (const h of heroes){ h.x = (Math.random()-0.5)*80; h.y = 200 + (Math.random()-0.5)*80; } });
    const op = await E(() => { let t = 0; while (!INF.fis.length && t < 40000) { __step(500); t += 500; } const f = INF.fis[0]; return f ? { t, x:f.x|0, y:f.y|0, warn:f.warn, inside:aidInside(f.x, f.y, 60), heroD: Math.min(...heroes.map(h=>Math.hypot(h.x-f.x, h.y-f.y)))|0 } : { t }; });
    check('INF.se_abre_una_fisura_con_aviso', op.x !== undefined && op.warn > 0 && op.inside && op.heroD >= 170, op);
    const ctxWarn = await E(() => ctxTargets().length);
    check('INF.mientras_se_forma_no_se_puede_cerrar', ctxWarn === 0, ctxWarn);
    await E(() => __step(2000));
    await shot('inf_fisura_etapa1');
    // aparición por la fisura
    const sp = await E(() => { const f = INF.fis[0]; let near = 0; for (let i = 0; i < 80; i++) { const e = spawnEnemy('esqueleto', false); if (Math.hypot(e.x-f.x, e.y-f.y) < 80) near++; } enemies.length = 0; return { near, share: near/80 }; });
    check('INF.parte_de_la_horda_sale_de_la_fisura', sp.share > 0.15 && sp.share < 0.5, sp);
    const ch = await E(() => { enemies.length = 0; const e = spawnEnemy('golem', false, true); const f = INF.fis[0]; const d = Math.hypot(e.x-f.x, e.y-f.y); enemies.length = 0; activeChampion = null; return d|0; });
    check('INF.el_campeon_no_sale_por_la_fisura', ch > 80, ch);
    // crecimiento y escupida
    const gr = await E(() => { const f = INF.fis[0]; const st = [f.stage]; let spit = 0; for (let i = 0; i < 70; i++) { const n0 = enemies.length; __step(500); if (enemies.length > n0) spit += enemies.length - n0; if (st[st.length-1] !== f.stage) st.push(f.stage); if (enemies.length > 10) enemies.length = 0; } return { st, spit, dur:f.dur, r:f.r }; });
    check('INF.crece_en_3_etapas', JSON.stringify(gr.st.slice(0, 3)) === '[1,2,3]', gr);
    check('INF.madura_escupe_demonios', gr.spit >= 2, gr);
    const er = await E(() => { const f = INF.fis.find(x=>!x.done && x.stage===3); if (!f) return null; let seen = 0; for (let i = 0; i < 30; i++) { __step(500); if (bossStrikes.some(s => Math.hypot(s.x-f.x, s.y-f.y) < 10)) seen++; } enemies.length = 0; return seen; });
    check('INF.etapa3_erupciona_telegrafiada', er > 0, er);
    await shot('inf_fisura_etapa3');
    // el botón contextual: lejos = nada; cerca = "Cerrar"
    const btn = await E(() => {
      const f = INF.fis.find(x=>!x.done); enemies.length = 0; spawnTimer = 1e12;
      player.x = f.x + 900; player.y = f.y; updateReviveBtn();
      const b = document.getElementById('btn-revive'); const far = b.classList.contains('ready');
      player.x = f.x + 30; player.y = f.y + 10; updateReviveBtn();
      return { far, near: b.classList.contains('ready'), lbl: b.querySelector('.lbl').textContent, ico: b.querySelector('.ico').textContent };
    });
    check('INF.boton_contextual_aparece_solo_cerca', !btn.far && btn.near && btn.lbl === 'Cerrar', btn);
    await shot('inf_boton_cerrar');
    // revivir tiene prioridad sobre cerrar
    const pri = await E(() => { const a = heroes[1]; a.x = player.x + 20; a.y = player.y; a.alive = false; a.hp = 0; updateReviveBtn(); const b = document.getElementById('btn-revive'); const lbl = b.querySelector('.lbl').textContent; a.alive = true; a.hp = a.maxHp; a.x += 400; updateReviveBtn(); return { lbl, after: b.querySelector('.lbl').textContent }; });
    check('INF.revivir_tiene_prioridad', pri.lbl === 'Revivir' && pri.after === 'Cerrar', pri);
    // cerrar manteniendo el botón (evento real de puntero): quema, reacciona y sella
    const cl = await E(async () => {
      const f = INF.fis.find(x=>!x.done); enemies.length = 0;
      const b = document.getElementById('btn-revive');
      const hp0 = player.hp; window.__drops = 0; const dp = dropPotion; dropPotion = function(){ __drops++; return dp.apply(this, arguments); };
      b.dispatchEvent(new PointerEvent('pointerdown', { bubbles:true }));
      const hold = player._ctxHold;
      let reacted = false, spawned = 0, burned = false, t = 0, minHp = player.hp;
      while (!f.done && t < 8000) { update(16); t += 16; minHp = Math.min(minHp, player.hp); if (f.reacted && !reacted){ reacted = true; spawned = enemies.filter(e=>e.alive).length; for (const e of enemies) e.alive = false; } }
      burned = minHp < hp0;
      await new Promise(r => requestAnimationFrame(()=>requestAnimationFrame(r)));
      const pct = b.querySelector('.ico').textContent;
      b.dispatchEvent(new PointerEvent('pointerup', { bubbles:true }));
      return { hold, done: f.done, t, reacted, spawned, burned, potion: __drops > 0, holdAfter: player._ctxHold, sealed: f.sealedBy, pct };
    });
    check('INF.cerrar_con_el_boton_sella', cl.hold && cl.done && cl.sealed === 'hero' && cl.holdAfter == null, cl);
    check('INF.cerrar_tiene_riesgo_calor_y_reaccion', cl.burned && cl.reacted && cl.spawned >= 2, cl);
    check('INF.sellar_deja_pocion', cl.potion, cl);
    // soltar a mitad: el progreso baja de a poco, no se pierde de golpe
    const dec = await E(() => {
      INF.fis.length = 0; const f = infMakeFissure(player.x + 30, player.y); f.warn = 0;
      const b = document.getElementById('btn-revive'); updateReviveBtn();
      b.dispatchEvent(new PointerEvent('pointerdown', { bubbles:true })); __step(1000); const p1 = f.prog;
      b.dispatchEvent(new PointerEvent('pointerup', { bubbles:true })); __step(500); const p2 = f.prog; __step(3000);
      return { p1: p1|0, p2: p2|0, p3: f.prog|0, hold: player._ctxHold };
    });
    check('INF.soltar_pausa_y_decae', dec.p1 > 800 && dec.p2 < dec.p1 && dec.p2 > 0 && dec.p3 === 0 && dec.hold == null, dec);
    // alejarse corta
    const away = await E(() => { const f = INF.fis[0]; player._ctxHold = f.id; __step(300); player.x += 400; __step(100); return player._ctxHold; });
    check('INF.alejarse_corta_la_accion', away == null, away);
    // varios a la vez cierran más rápido
    const coop = await E(() => {
      INF.fis.length = 0; const f = infMakeFissure(player.x, player.y + 20); f.warn = 0; f.reacted = true;
      const g = infMakeFissure(player.x + 600, player.y + 20); g.warn = 0; g.reacted = true;
      player.x = f.x; player.y = f.y; heroes[1].x = g.x; heroes[1].y = g.y; heroes[2].x = g.x+10; heroes[2].y = g.y;
      player._ctxHold = f.id; heroes[1]._ctxHold = g.id; heroes[2]._ctxHold = g.id;
      __step(1500); return { solo: f.prog|0, duo: g.prog|0 };
    });
    check('INF.cooperar_cierra_mas_rapido', coop.duo > coop.solo*1.4, coop);
    // cambio de nivel: bajan una etapa
    const lv = await E(() => { for (const h of heroes) h._ctxHold = null; INF.fis.length = 0; const a = infMakeFissure(0, 300); a.warn = 0; const b = infMakeFissure(400, 300); b.warn = 0; b.stage = 3; infSyncStage(b); runLevel = 5; infBeginLevel(); return { a: a.done, b: b.stage, bdur: b.dur, want: INF_CFG.closeMs[2] }; });
    check('INF.al_cambiar_de_nivel_bajan_una_etapa', lv.a && lv.b === 2 && lv.bdur === lv.want, lv);
    // bots: van a cerrarla solos
    await E(() => { updateAllies = __ua; });
    const bot = await E(() => {
      INF.fis.length = 0; enemies.length = 0; spawnTimer = 1e12; INF.openT = 1e12;
      player.x = 0; player.y = 250; for (const h of allies){ h.x = (Math.random()-0.5)*120; h.y = 250 + (Math.random()-0.5)*60; }
      const f = infMakeFissure(260, 330); f.warn = 0; f.stage = 2; infSyncStage(f);
      let t = 0, goers = 0; while (!f.done && t < 25000) { __step(250); t += 250; enemies.length = 0; goers = Math.max(goers, heroes.filter(h=>h._ctxGoal===f.id).length); }
      return { done: f.done, t, sealed: f.sealedBy, goers, playerHeld: player._ctxHold };
    });
    check('INF.los_bots_cierran_fisuras', bot.done && bot.sealed === 'hero' && bot.goers >= 1 && bot.goers <= 2, bot);
    const botSafe = await E(() => {
      INF.fis.length = 0; enemies.length = 0; const f = infMakeFissure(260, 330); f.warn = 0;
      for (let i = 0; i < 8; i++){ const e = spawnEnemy('esqueleto', false); e.x = f.x + (Math.random()-0.5)*60; e.y = f.y + (Math.random()-0.5)*60; e.speed = 0; e.dmg = 0; }
      const w = allies.map(h => CTX_KINDS.inf_fissure.botWorth(h, f)); enemies.length = 0; return w;
    });
    check('INF.bots_no_cierran_rodeados', botSafe.every(w => w === 0), botSafe);
    // partida corrida: nivel 2 a 5 sin ayuda de pruebas, sin errores y con fisuras abriéndose y cerrándose
    const run = await E(() => {
      __start('infernal', 2); let opened = new Set(), closed = 0, maxOpen = 0, t = 0;
      while (state === 'playing' && runLevel <= 5 && t < 360000) {
        __step(500); t += 500;
        for (const f of INF.fis) { opened.add(f.id); if (f.done && f.sealedBy === 'hero' && !f._c) { f._c = 1; closed++; } }
        maxOpen = Math.max(maxOpen, INF.fis.filter(f=>!f.done).length);
      }
      return { lv: runLevel, t: t/1000, opened: opened.size, closed, maxOpen, st: state, enemies: enemies.length };
    });
    check('INF.partida_real_niveles_2_a_5', run.opened >= 3 && run.maxOpen <= 2 && run.st !== 'menu', run);
    check('INF.en_partida_los_bots_sellan', run.closed >= 1, run);
  }

  // ---------------- otras arenas: sin objetivos, sin cambios ----------------
  const other = await E(() => { const r = {}; for (const a of ['bosque','hielo','laberinto','acuatica']) { __start(a, 2); __step(3000); r[a] = { ctx: ctxTargets(), btn: document.getElementById('btn-revive').classList.contains('ready') }; } return r; });
  check('OTRAS.sin_acciones_contextuales_propias_todavia', Object.values(other).every(o => !o.ctx || o.ctx.length === 0), other);

  check('SIN_ERRORES', errors.length === 0, errors.slice(0, 5));
  console.log(fails ? `FALLAS: ${fails}` : 'OK todas');
  await browser.close();
  process.exit(fails ? 1 : 0);
})();
