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

  if (want('hie')) {
    // ---------------- Gélida: moverse es sobrevivir ----------------
    await E(() => { __start('hielo', 3); __calm(); window.__ua = window.__ua || updateAllies; updateAllies = function(){}; player.x = 0; player.y = 120; for (const h of allies){ h.x = 700; h.y = 0; } __step(100); });
    const still = await E(() => { const c0 = player._cold; __step(900); const c1 = player._cold; __step(6000); const c2 = player._cold; let fr = 0; for (let i = 0; i < 20; i++){ __step(500); fr = Math.max(fr, player.frostStacks||0); } return { c0, c1: +c1.toFixed(1), c2: +c2.toFixed(1), fr, near: !!hieNearLit(player.x, player.y) }; });
    check('HIE.quieto_se_enfria_tras_un_respiro', still.c1 < 2 && still.c2 > 50 && !still.near, still);
    check('HIE.el_frio_suma_escarcha', still.fr >= 1, still);
    const nofreeze = await E(() => { player.frostStacks = 0; player._cold = 0; player.stunTimer = 0; let maxSt = 0, stunned = false; for (let i = 0; i < 80; i++){ __step(500); maxSt = Math.max(maxSt, player.frostStacks||0); if (player.stunTimer > 0) stunned = true; } return { maxSt, stunned }; });
    check('HIE.el_frio_solo_nunca_congela', nofreeze.maxSt <= 2 && !nofreeze.stunned, nofreeze);
    const mv = await E(() => { player._cold = 80; player.frostStacks = 0; for (let i = 0; i < 180; i++){ player.x += (i%120 < 60 ? 1.6 : -1.6); update(16); player.hp = player.maxHp; } return +player._cold.toFixed(1); });
    check('HIE.moverse_calienta', mv < 40, mv);
    const warm = await E(() => { const b = HIE.br[0]; b.lit = true; b.fuel = 30000; player.x = b.x + 40; player.y = b.y + 10; player._cold = 90; player.frostStacks = 2; player.frostTimer = 3000; __step(1500); return { cold: +player._cold.toFixed(1), fst: player.frostStacks }; });
    check('HIE.el_brasero_calienta_y_derrite', warm.cold < 10 && warm.fst === 0, warm);
    await shot('hie_brasero_encendido');
    const out = await E(() => { const b = HIE.br[0]; b.fuel = 200; __step(400); const off = !b.lit; player.x = b.x + 30; player.y = b.y + 12; updateReviveBtn(); const btn = document.getElementById('btn-revive'); return { off, ctx: ctxTargets().map(t=>t.id), lbl: btn.querySelector('.lbl').textContent, ready: btn.classList.contains('ready') }; });
    check('HIE.el_brasero_se_apaga_y_se_puede_encender', out.off && out.ctx.includes('hb0') && out.lbl === 'Encender' && out.ready, out);
    await shot('hie_brasero_apagado');
    const light = await E(() => { const b = HIE.br[0]; const btn = document.getElementById('btn-revive'); btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles:true })); __step(1700); btn.dispatchEvent(new PointerEvent('pointerup', { bubbles:true })); return { lit: b.lit, fuel: b.fuel|0 }; });
    check('HIE.encender_con_el_boton', light.lit && light.fuel > 30000, light);
    const fire = await E(() => { const b = HIE.br[1]; b.lit = false; b.fuel = 0; fireWalls.push({x:b.x+40, y:b.y, innerR:20, outerR:70, timer:2000, maxTimer:2000, tick:0, tickInterval:500, dmg:1, src:player, tier:1}); __step(100); const byWall = b.lit; const c = HIE.br[2]; c.lit = false; c.fuel = 0; projectiles.push({x:c.x, y:c.y-20, vx:0, vy:0, life:500, dmg:1, radius:6, burn:{dmg:1, dur:1000}, src:player, hitSet:new Set()}); __step(50); return { byWall, byProj: c.lit }; });
    check('HIE.el_fuego_enciende_braseros', fire.byWall && fire.byProj, fire);
    const lv1 = await E(() => { __start('hielo', 1); __calm(); updateAllies = function(){}; for (const b of HIE.br) b.lit = false; player.x = 0; player.y = 120; __step(100); __step(6000); return +player._cold.toFixed(1); });
    const lv3 = await E(() => { __start('hielo', 3); __calm(); updateAllies = function(){}; for (const b of HIE.br) b.lit = false; player.x = 0; player.y = 120; __step(100); __step(6000); return +player._cold.toFixed(1); });
    check('HIE.nivel1_mas_suave', lv1 < lv3*0.75 && lv1 > 0, { lv1, lv3 });
    // bots: con frío se mueven; encienden braseros cuando hace falta
    await E(() => { updateAllies = __ua; });
    const bn = await E(() => { const h = allies[0]; h._cold = 70; const m = botMove(h, 16); return { mx: +m.mx.toFixed(2), my: +m.my.toFixed(2) }; });
    check('HIE.bot_con_frio_se_mueve', Math.hypot(bn.mx, bn.my) > 0.5, bn);
    const bl = await E(() => {
      __calm(); for (const b of HIE.br){ b.lit = false; b.fuel = 0; } player.x = HIE.br[0].x - 250; player.y = HIE.br[0].y; for (const h of allies){ h.x = player.x + (Math.random()-0.5)*80; h.y = player.y + 60; h._cold = 50; }
      let t = 0; while (!HIE.br.some(b=>b.lit) && t < 30000){ __step(250); t += 250; enemies.length = 0; }
      return { lit: HIE.br.filter(b=>b.lit).length, t };
    });
    check('HIE.los_bots_encienden_braseros', bl.lit >= 1, bl);
    // partida corrida (niveles 2-4) con bots: sin errores y sin congelarse sin parar
    const run = await E(() => {
      __start('hielo', 2); let t = 0, freezes = 0, prev = heroes.map(()=>0), maxCold = 0, lit = 0;
      while (state === 'playing' && runLevel <= 4 && t < 300000) {
        __step(250); t += 250;
        heroes.forEach((h, i) => { if (h !== player && h.stunTimer > 700 && prev[i] <= 0) freezes++; prev[i] = h.stunTimer||0; if (h !== player) maxCold = Math.max(maxCold, h._cold||0); });
        lit = Math.max(lit, HIE.br.filter(b=>b.lit).length);
      }
      return { lv: runLevel, t: t/1000, freezes, maxCold: Math.round(maxCold), st: state };
    });
    check('HIE.partida_real_niveles_2_a_4', run.lv >= 4 && run.st !== 'menu', run);
    check('HIE.los_bots_no_viven_congelados', run.freezes <= 6, run);
  }

  if (want('bos')) {
    // ---------------- Ruinas: runas y emboscadas ----------------
    await E(() => { __start('bosque', 1); __calm(); window.__ua = window.__ua || updateAllies; updateAllies = function(){}; });
    const rn = await E(() => ({ n: BOS.runes.length, ready0: BOS.runes.filter(bosReady).length, pos: BOS.runes.map(r => aidInside(r.x, r.y, 20)) }));
    check('BOS.cuatro_runas_en_los_menhires', rn.n === 4 && rn.ready0 === 0 && rn.pos.every(Boolean), rn);
    const ch = await E(() => { let t = 0; while (!BOS.runes.some(bosReady) && t < 30000){ __step(500); t += 500; } return { t, ready: BOS.runes.filter(bosReady).map(r=>r.id) }; });
    check('BOS.la_primera_runa_se_carga_pronto', ch.ready.length >= 1 && ch.t <= 14000, ch);
    const use = await E(async () => {
      const r = BOS.runes.find(bosReady); player.x = r.x; player.y = r.y + 10;
      const foes = []; for (let i = 0; i < 6; i++){ const e = spawnEnemy('duende_bosque', false); e.x = r.x + (Math.random()-0.5)*300; e.y = r.y + (Math.random()-0.5)*200; e.speed = 0; foes.push(e); }
      const far = spawnEnemy('duende_bosque', false); far.x = r.x + 700; far.y = r.y; far.speed = 0;
      const hp0 = foes.map(e => e.hp);
      updateReviveBtn(); const b = document.getElementById('btn-revive'); const lbl = b.querySelector('.lbl').textContent;
      b.dispatchEvent(new PointerEvent('pointerdown', { bubbles:true })); for (let i = 0; i < 70; i++) update(16); b.dispatchEvent(new PointerEvent('pointerup', { bubbles:true }));
      const stunned = foes.filter(e => e.alive ? e.stunTimer > 1000 : true).length, hurt = foes.filter((e, i) => !e.alive || e.hp < hp0[i]).length;
      const res = { lbl, charge: r.charge, stunned, hurt, farStun: far.stunTimer||0 }; enemies.length = 0; return res;
    });
    check('BOS.activar_runa_con_el_boton', use.lbl === 'Activar' && use.charge < 0.1, use);
    check('BOS.la_runa_atrapa_y_lastima_alrededor', use.stunned === 6 && use.hurt === 6 && use.farStun === 0, use);
    await shot('bos_runa');
    const boss = await E(() => { const r = BOS.runes[0]; r.charge = 1; const e = spawnEnemy('duende_bosque', false); e.rank = 'jefe'; e.hp = e.maxHp = 10000; e.x = r.x + 50; e.y = r.y; e.speed = 0; const hp = e.hp; CTX_KINDS.bos_rune.onComplete(r, [player]); const out = { stun: e.stunTimer, pct: +(1 - e.hp/hp).toFixed(3) }; enemies.length = 0; return out; });
    check('BOS.el_jefe_apenas_se_frena', boss.stun <= 400 && boss.pct <= 0.02, boss);
    const rech = await E(() => { const r = BOS.runes[0]; r.charge = 0; __step(16000); const half = r.charge; __step(17000); return { half: +half.toFixed(2), full: bosReady(r) }; });
    check('BOS.la_runa_se_recarga', rech.half > 0.4 && rech.half < 0.6 && rech.full, rech);
    // emboscada: aviso y después la jauría sale de la maleza
    const amb = await E(() => {
      __start('bosque', 3); __calm(); updateAllies = function(){}; BOS.ambT = 10; __step(50);
      const spots = BOS.amb.map(a => ({ x:a.x, y:a.y, t:a.t })); const e0 = enemies.filter(e=>e.alive).length;
      __step(1500); const mid = enemies.filter(e=>e.alive).length; __step(1400); const after = enemies.filter(e=>e.alive);
      const near = after.filter(e => spots.some(p => Math.hypot(e.x-p.x, e.y-p.y) < 60)).length;
      const minD = spots.length ? Math.min(...spots.map(p => Math.hypot(p.x-player.x, p.y-player.y))) : 0;
      return { spots: spots.length, e0, mid, after: after.length, near, minD: Math.round(minD), types: [...new Set(after.map(e=>e.type))] };
    });
    check('BOS.emboscada_con_aviso_previo', amb.spots >= 2 && amb.mid === amb.e0 && amb.minD >= 200, amb);
    check('BOS.la_jauria_sale_de_la_maleza', amb.after > amb.mid && amb.near >= amb.spots, amb);
    const amb1 = await E(() => { __start('bosque', 1); __calm(); updateAllies = function(){}; __step(60000); return BOS.amb.length; });
    check('BOS.nivel1_sin_emboscadas', amb1 === 0, amb1);
    const ambB = await E(() => { __start('bosque', 3); __calm(); updateAllies = function(){}; activeChampion = {alive:true}; BOS.ambT = 10; __step(2000); const n = BOS.amb.length; activeChampion = null; return n; });
    check('BOS.sin_emboscadas_con_subjefe', ambB === 0, ambB);
    // bots: activan la runa si hay horda encima
    await E(() => { updateAllies = __ua; });
    const bot = await E(() => {
      __start('bosque', 3); __calm(); BOS.ambT = 1e12; const r = BOS.runes[1]; r.charge = 1; for (const x of BOS.runes) if (x !== r) x.charge = 0;
      player.x = r.x - 150; player.y = r.y; for (const h of allies){ h.x = r.x - 120 + (Math.random()-0.5)*60; h.y = r.y + 40; }
      const foes = []; for (let i = 0; i < 6; i++){ const e = spawnEnemy('duende_bosque', false); e.x = r.x + 80 + (Math.random()-0.5)*80; e.y = r.y + (Math.random()-0.5)*80; e.speed = 0; e.dmg = 0; e.hp = e.maxHp = 1e6; foes.push(e); }
      let t = 0; while (bosReady(r) && t < 20000){ __step(250); t += 250; }
      return { used: !bosReady(r), t };
    });
    check('BOS.los_bots_usan_la_runa_con_horda', bot.used, bot);
    const run = await E(() => { __start('bosque', 2); let t = 0, runes = 0, ambs = 0, seen = new Set(); while (state === 'playing' && runLevel <= 4 && t < 300000){ __step(500); t += 500; for (const a of BOS.amb) if (!seen.has(a.id)){ seen.add(a.id); ambs++; } for (const h of heroes) runes = Math.max(runes, 0) + 0; } const used = heroes.reduce((s, h) => s + ((h.stats && h.stats.runes)||0), 0); return { lv: runLevel, t: t/1000, ambs, used, st: state }; });
    check('BOS.partida_real_niveles_2_a_4', run.lv >= 4 && run.ambs >= 1 && run.st !== 'menu', run);
  }

  if (want('tut')) {
    // ---------------- tutorial: la voz del Hechicero ----------------
    const t = {};
    const txt = () => E(() => document.querySelector('#tut-panel .tut-goal').textContent);
    await E(() => { save.tut = {}; __start('bosque', 1); __calm(); window.__ua = window.__ua || updateAllies; updateAllies = function(){}; __step(200); });
    t.first = await txt(); t.vis = await E(() => !document.getElementById('tut-panel').classList.contains('hidden'));
    await sleep(600); await shot('tut_hechicero_mover');
    await E(() => { for (let i = 0; i < 200; i++){ player.x += 2; update(16); } }); t.moved = await E(() => !!save.tut.b_move);
    await sleep(1800); await E(() => __step(50)); t.second = await txt();
    await E(() => { const e = spawnEnemy('duende_bosque', false); e.x = player.x + 30; e.y = player.y; e.hp = 1; damageEnemy(e, 10, {src:player}); __step(50); });
    t.attack = await E(() => !!save.tut.b_attack); await sleep(1800); await E(() => __step(50)); t.third = await txt();
    await E(() => { player.cds[0] = 1000; __step(50); }); t.skill = await E(() => !!save.tut.b_skill);
    await sleep(1800); await E(() => __step(50)); t.basics = await E(() => !!save.tut.basics);
    await sleep(5500); await E(() => __step(50));
    await E(() => { const a = heroes[1]; a.alive = false; a.hp = 0; a.x = player.x + 30; a.y = player.y; __step(100); });
    await sleep(200); await E(() => __step(50)); t.revive = await txt();
    await E(() => { const a = heroes[1]; a.alive = true; a.hp = a.maxHp; player.stats.revives = 1; __step(50); }); t.reviveDone = await E(() => !!save.tut.revive);
    await E(() => { __start('bosque', 1); __calm(); updateAllies = function(){}; __step(500); });
    t.again = await E(() => document.getElementById('tut-panel').classList.contains('hidden') || !/joystick/.test(document.querySelector('#tut-panel .tut-goal').textContent));
    await shot('tut_hechicero');
    check('TUT.empieza_con_moverse', /joystick/.test(t.first) && t.vis, t);
    check('TUT.moverse_atacar_habilidad_en_orden', t.moved && /Ataque/.test(t.second) && t.attack && /habilidad/.test(t.third) && t.skill && t.basics, t);
    check('TUT.revivir_se_ensena_al_primer_caido', /✚/.test(t.revive) && t.reviveDone, t);
    check('TUT.lo_aprendido_no_se_repite', t.again, t);
    await E(() => { updateAllies = __ua; });
  }

  if (want('acu')) {
    // ---------------- Acuática: corrientes y charcos conductores ----------------
    const lay = await E(() => { const r = {}; for (const lv of [1, 2, 3, 4, 5, 7]) { __start('acuatica', lv); r[lv] = ACU.zones.map(z => z.type).sort().join(','); } return r; });
    check('ACU.las_zonas_se_suman_por_nivel', lay[1] === 'lineal' && /remolino/.test(lay[2]) && /charco/.test(lay[3]) && /anillo/.test(lay[4]) && /chorro/.test(lay[5]) && lay[7].split(',').length >= 8, lay);
    await E(() => { __start('acuatica', 1); __calm(); window.__ua = window.__ua || updateAllies; updateAllies = function(){}; for (const h of allies){ h.x = 900; h.y = 0; } acuaCurrent.active = false; });
    const lin = await E(() => {
      ACU.zones = []; const z = acuAdd('lineal'); z.x = 0; z.y = 200; z.dx = 1; z.dy = 0;
      player.x = -120; player.y = 200; const e = spawnEnemy('tiburon_joven', false); e.x = -120; e.y = 220; e.speed = 0; e.dmg = 0;
      const b = spawnEnemy('tiburon_joven', false); b.rank = 'jefe'; b.x = -100; b.y = 190; b.speed = 0; b.dmg = 0;
      __step(1000); const r = { px: Math.round(player.x + 120), ex: Math.round(e.x + 120), bx: Math.round(b.x + 100), py: Math.round(player.y - 200) }; enemies.length = 0; return r;
    });
    check('ACU.la_corriente_lineal_arrastra_heroes_y_enemigos', lin.px > 55 && lin.ex > 30 && lin.ex < lin.px && Math.abs(lin.py) < 5, lin);
    check('ACU.los_jefes_no_se_mueven', lin.bx === 0, lin);
    const rem = await E(() => { ACU.zones = []; const z = acuAdd('remolino'); z.x = 0; z.y = 200; player.x = 110; player.y = 200; const d0 = Math.hypot(player.x - z.x, player.y - z.y); __step(1000); const d1 = Math.hypot(player.x - z.x, player.y - z.y); return { d0: Math.round(d0), d1: Math.round(d1), dy: Math.round(player.y - 200) }; });
    check('ACU.el_remolino_tira_y_gira', rem.d1 < rem.d0 - 15 && Math.abs(rem.dy) > 5, rem);
    const ring = await E(() => { ACU.zones = []; acuAdd('anillo'); player.x = 585*1.18; player.y = 0; __step(1000); return { dx: Math.round(player.x - 585*1.18), dy: Math.round(player.y) }; });
    check('ACU.el_anillo_empuja_alrededor', Math.abs(ring.dy) > 30 && Math.abs(ring.dx) < Math.abs(ring.dy), ring);
    const jet = await E(() => { ACU.zones = []; const z = acuAdd('chorro'); z.x = 0; z.y = 200; z.dx = 0; z.dy = -1; z.t = 50; player.x = 0; player.y = 120; __step(200); const warned = z.warn > 0 && vfxTeles.some(s => s.on && s.shape === 2); const y0 = player.y; __step(900); const early = Math.round(player.y - y0); __step(400); return { warned, early, moved: Math.round(y0 - player.y) }; });
    check('ACU.el_chorro_avisa_y_despues_empuja', jet.warned && jet.early === 0 && jet.moved > 100, jet);
    const zap = await E(() => {
      ACU.zones = []; const z = acuAdd('charco'); z.x = 0; z.y = 200; z.t = 50; player.x = 20; player.y = 200; player.hp = player.maxHp;
      const foes = []; for (let i = 0; i < 4; i++){ const e = spawnEnemy('tiburon_joven', false); e.x = (Math.random()-0.5)*100; e.y = 200 + (Math.random()-0.5)*60; e.speed = 0; e.dmg = 0; e.hp = e.maxHp = 1000; foes.push(e); }
      __step(200); const warned = z.warn > 0; const hp0 = player.hp; __step(1200);
      const r = { warned, heroLost: +((hp0 - player.hp)/player.maxHp).toFixed(3), stunned: foes.filter(e => e.stunTimer > 300).length, hurt: foes.filter(e => e.hp < 1000).length }; enemies.length = 0; return r;
    });
    check('ACU.el_charco_avisa_y_descarga', zap.warned && zap.stunned === 4 && zap.hurt === 4, zap);
    check('ACU.al_heroe_le_pega_poco', zap.heroLost > 0 && zap.heroLost <= 0.06, zap);
    const eel = await E(() => {
      ACU.zones = []; const z = acuAdd('charco'); z.x = 0; z.y = 200; z.t = 1e9;
      const h1 = heroes[1], h2 = heroes[2]; player.x = 0; player.y = 200; h1.x = 220; h1.y = 200; h2.x = 900; h2.y = 0; heroes[3].x = -900;
      const hp1 = h1.hp; const e = { dmg: 10, x: -40, y: 200 }; applyEelChain(e, player); const wet = h1.hp < hp1;
      player.x = 0; player.y = -300; h1.x = 220; h1.y = -300; const hp2 = h1.hp; applyEelChain(e, player); const dry = h1.hp < hp2;
      return { wet, dry };
    });
    check('ACU.la_anguila_salta_mas_lejos_en_el_charco', eel.wet && !eel.dry, eel);
    await E(() => { ACU.zones = []; acuLayout(7); player.x = ACU.zones[0].x; player.y = ACU.zones[0].y; __step(300); });
    await shot('acu_zonas');
    await E(() => { updateAllies = __ua; });
    const bd = await E(() => { ACU.zones = []; const z = acuAdd('remolino'); z.x = 0; z.y = 200; return !!acuBotDanger(10, 205, 20); });
    check('ACU.bots_evitan_el_ojo_del_remolino', bd);
    const run = await E(() => { __start('acuatica', 2); let t = 0, maxE = 0; while (state === 'playing' && runLevel <= 5 && t < 300000){ __step(500); t += 500; maxE = Math.max(maxE, enemies.length); } return { lv: runLevel, t: t/1000, maxE, st: state, zones: ACU.zones.length }; });
    check('ACU.partida_real_niveles_2_a_5', run.lv >= 5 && run.st !== 'menu', run);
  }

  if (want('lab')) {
    // ---------------- Laberinto: sellos en orden ----------------
    await E(() => { __start('laberinto', 1); __calm(); window.__ua = window.__ua || updateAllies; updateAllies = function(){}; });
    const l1 = await E(() => { __step(40000); return LAB.seals.length; });
    check('LAB.nivel1_sin_sellos', l1 === 0, l1);
    const set = await E(() => { __start('laberinto', 3); __calm(); updateAllies = function(){}; LAB.spawnT = 10; __step(100); const s = LAB.seals; let apart = Infinity; for (let i = 0; i < s.length; i++) for (let j = i+1; j < s.length; j++) apart = Math.min(apart, Math.hypot(s[i].x-s[j].x, s[i].y-s[j].y)); return { n: s.length, nums: s.map(x=>x.n).join(''), apart: Math.round(apart), free: s.every(x => labFree(x.x, x.y, 30)) }; });
    check('LAB.aparecen_3_sellos_separados_y_libres', set.n === 3 && set.nums === '123' && set.apart >= 380 && set.free, set);
    const hold = async (n) => E(async (n) => { const s = LAB.seals.find(x => x.n === n); player.x = s.x; player.y = s.y + 8; updateReviveBtn(); const b = document.getElementById('btn-revive'); const lbl = b.querySelector('.lbl').textContent; b.dispatchEvent(new PointerEvent('pointerdown', { bubbles:true })); for (let i = 0; i < 80; i++) update(16); b.dispatchEvent(new PointerEvent('pointerup', { bubbles:true })); return { lbl, lit: LAB.seals.filter(x=>x.lit).map(x=>x.n).join(''), next: LAB.next, strikes: bossStrikes.length, left: LAB.seals.length }; }, n);
    const w1 = await hold(1);
    check('LAB.el_primero_se_enciende', w1.lbl === 'Sello' && w1.lit === '1' && w1.next === 2, w1);
    await shot('lab_sellos');
    const wrong = await hold(3);
    check('LAB.orden_equivocado_castiga_y_reinicia', wrong.lit === '' && wrong.next === 1 && wrong.strikes >= 1, wrong);
    await E(() => { bossStrikes.length = 0; for (const h of heroes) h.hp = h.maxHp; });
    await hold(1); await hold(2);
    const fin = await E(async () => { const foes = []; for (let i = 0; i < 3; i++){ const e = spawnEnemy('escorpion_gigante', false); e.x = player.x + 200; e.y = player.y; e.speed = 0; e.dmg = 0; foes.push(e); } for (const h of heroes) h.hp = h.maxHp*0.5; window.__drops = 0; const dp = window.__dp0 || (window.__dp0 = dropPotion); dropPotion = function(){ __drops++; return dp.apply(this, arguments); }; return true; });
    const w3 = await hold(3);
    const sol = await E(() => ({ stunned: enemies.filter(e => e.alive && e.stunTimer > 800 && e.slowTimer > 3000).length, healed: heroes.every(h => h.hp > h.maxHp*0.6), potions: __drops }));
    check('LAB.los_tres_en_orden_resuelven', w3.left === 0 && sol.stunned === 3 && sol.healed && sol.potions >= 1, { w3, sol });
    const win = await E(() => { LAB.spawnT = 10; __step(100); const s = LAB.seals.find(x=>x.n===1); s.lit = true; LAB.next = 2; LAB.winT = 40000; __step(41000); return { lit: LAB.seals.filter(x=>x.lit).length, next: LAB.next, n: LAB.seals.length }; });
    check('LAB.la_ventana_vence_y_vuelve_a_cero', win.lit === 0 && win.next === 1 && win.n === 3, win);
    const ch = await E(() => { LAB.seals = []; activeChampion = {alive:true}; LAB.spawnT = 10; __step(2000); const n = LAB.seals.length; activeChampion = null; return n; });
    check('LAB.sin_sellos_con_subjefe', ch === 0, ch);
    await E(() => { updateAllies = __ua; });
    const bot = await E(() => { __start('laberinto', 3); __calm(); LAB.spawnT = 10; __step(100); player.x = LAB.seals[0].x - 100; player.y = LAB.seals[0].y; let t = 0; const order = []; while (LAB.seals.length && t < 90000){ __step(250); t += 250; enemies.length = 0; for (const s of LAB.seals) if (s.lit && !order.includes(s.n)) order.push(s.n); } return { solved: LAB.solved > 0, order: order.join(''), t: t/1000, wrong: LAB.wrongs }; });
    check('LAB.los_bots_resuelven_en_orden', bot.solved && bot.wrong === 0, bot);
    const run = await E(() => { __start('laberinto', 2); let t = 0, sets = 0, last = 0; while (state === 'playing' && runLevel <= 4 && t < 300000){ __step(500); t += 500; if (LAB.set !== last){ last = LAB.set; sets++; } } return { lv: runLevel, t: t/1000, sets, solved: LAB.solved, wrongs: LAB.wrongs, st: state }; });
    check('LAB.partida_real_niveles_2_a_4', run.lv >= 4 && run.sets >= 1 && run.st !== 'menu', run);
  }

  if (want('env')) {
    // ---------------- etiquetas ambientales con habilidades REALES del Mago ----------------
    await E(() => { window.__ua = window.__ua || updateAllies; });
    const ice = await E(() => { __start('infernal', 4, 'mago'); __calm(); updateAllies = function(){}; INF.openT = 1e12; INF.fis.length = 0; const f = infMakeFissure(player.x + 90, player.y); f.warn = 0; f.reacted = true; player.energy = player.maxEnergy; player.cds[1] = 0; const ok = useSkill(1, null); return { ok, prog: Math.round(f.prog), dur: f.dur }; });
    check('ENV.nova_de_escarcha_enfria_la_fisura', ice.ok && ice.prog >= ice.dur*0.3, ice);
    const fire = await E(() => { __start('hielo', 3, 'mago'); __calm(); updateAllies = function(){}; const b = HIE.br[0]; b.lit = false; b.fuel = 0; player.x = b.x - 120; player.y = b.y; player.energy = player.maxEnergy; player.cds[0] = 0; const ok = useSkill(0, {x:b.x, y:b.y, dx:1, dy:0}); return { ok, lit: b.lit }; });
    check('ENV.muro_de_fuego_enciende_el_brasero', fire.ok && fire.lit, fire);
    const bolt = await E(() => {
      __start('acuatica', 3, 'mago'); __calm(); updateAllies = function(){}; ACU.zones = []; const z = acuAdd('charco'); z.x = player.x + 200; z.y = player.y; z.t = 1e9;
      const foes = []; for (let i = 0; i < 3; i++){ const e = spawnEnemy('tiburon_joven', false); e.x = z.x + (i-1)*40; e.y = z.y + (i%2)*20; e.speed = 0; e.dmg = 0; e.hp = e.maxHp = 5000; foes.push(e); }
      player.energy = player.maxEnergy; player.cds[2] = 0; const hp0 = foes.map(e=>e.hp); const ok = useSkill(2, null);
      const r = { ok, stunned: foes.filter(e => e.stunTimer > 300).length, hurt: foes.filter((e,i) => e.hp < hp0[i]).length, heroHp: player.hp === player.maxHp || true }; enemies.length = 0; return r;
    });
    check('ENV.cadena_de_relampago_conduce_en_el_charco', bolt.ok && bolt.stunned === 3 && bolt.hurt === 3, bolt);
    const bush = await E(() => { __start('bosque', 3); __calm(); updateAllies = function(){}; BOS.ambT = 10; __step(50); const a = BOS.amb[0]; envEmit('fire', a.x, a.y, player, {r:60}); __step(2800); const out = enemies.filter(e => e.alive && Math.hypot(e.x-a.x, e.y-a.y) < 80); return { burnt: !!a.burnt, n: out.length, burning: out.filter(e => e.burnTimer > 0).length }; });
    check('ENV.el_fuego_quema_la_maleza_de_la_emboscada', bush.burnt && bush.n > 0 && bush.burning === bush.n, bush);
    const div = await E(() => { __start('hielo', 3); divinaMode = true; const b = HIE.br[0]; b.lit = false; envEmit('fire', b.x, b.y, player, {r:60}); const lit = b.lit; divinaMode = false; return lit; });
    check('ENV.sin_efecto_fuera_de_su_arena', !div, div);
    await E(() => { updateAllies = __ua; });
  }

  // ---------------- (todas las arenas del camino de siempre tienen ya su mecánica propia) ----------------
  const other = await E(() => { const r = {}; for (const a of []) { __start(a, 2); __step(3000); r[a] = { ctx: ctxTargets(), btn: document.getElementById('btn-revive').classList.contains('ready') }; } return r; });
  

  check('SIN_ERRORES', errors.length === 0, errors.slice(0, 5));
  console.log(fails ? `FALLAS: ${fails}` : 'OK todas');
  await browser.close();
  process.exit(fails ? 1 : 0);
})();
