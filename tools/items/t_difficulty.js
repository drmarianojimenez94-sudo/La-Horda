// DIFICULTADES (Normal / Pesadilla / Infierno), variantes de mapa por semilla y primeras derrotas sin castigo.
// Reseña #11, #12 y #13 (docs/LA_HORDA_CRITIC_REVIEW.md). Ver js/systems/difficulty-tiers.js.
//   (python3 -m http.server 8823 &) ; SE_BASE_URL=http://127.0.0.1:8823 node tools/items/t_difficulty.js
// Bloques: DESBLOQUEO · ESCALAS (+ CALIBRACIÓN ×2,5 / ×6 en el nivel esperado) · BOTÍN · GUARDADO · SEMILLA · DERROTA · UI.
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const BASE = process.env.SE_BASE_URL || 'http://127.0.0.1:8823';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 600) : '')); if (!ok) fails++; };
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 900, height: 506 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_CERT|fonts\.g|net::|404/.test(m.text())) errors.push('console: ' + m.text().slice(0, 300)); });
  await page.addInitScript(() => { window.__campaignMode = true; });
  const E = (fn, a) => page.evaluate(fn, a);
  const boot = async (rawSave) => {
    await page.goto(`${BASE}/index.html`, { waitUntil: 'load', timeout: 180000 });
    await E((raw) => { localStorage.clear(); if (raw) localStorage.setItem('laHordaSave_v1', raw); }, rawSave ? JSON.stringify(rawSave) : null);
    await page.goto(`${BASE}/index.html`, { waitUntil: 'load', timeout: 180000 });
    for (let k = 0; k < 300; k++) { if (await E(() => !document.getElementById('title-continue-btn').disabled)) break; await sleep(100); }
    await sleep(300);
    await E(() => { loop = function(){};
      window.__lvl = (L) => { for (const k in save.champions) { const c = save.champions[k]; c.unlocked = true; c.level = L; const al = Math.min(10, Math.floor(L / 3)); c.skillMastery.forEach(m => m.alloc = al); c.ultMastery.alloc = al; } };
      window.__start = (a, lv) => { selectedClass = 'mago'; currentArena = a; lobbyAllies = ['tanque','guerrero','soporte']; startRun(lv || 1); spawnTimer = 1e12; enemies.length = 0; };
      window.__allNormal = () => { for (const k of ARENA_ORDER) save.arenasCleared[k] = true; };
      window.__allTier = (t) => { for (const k of ARENA_ORDER) save.diffCleared[t][k] = true; };
    });
  };

  // ---------------- DESBLOQUEO ----------------
  await boot(null);
  const u0 = await E(() => ({ shape: JSON.stringify(save.diffCleared), sel: save.diffSelected, dc: save.defeatCount, pes: diffTierOpen('pesadilla'), inf: diffTierOpen('infierno'),
    eff: diffEffective('ciudad'), pick: (currentArena = 'ciudad', diffPickerHtml()) }));
  check('DESBLOQUEO.perfil_nuevo_todo_normal', u0.shape === '{"pesadilla":{},"infierno":{}}' && u0.sel === 'normal' && u0.dc === 0 && !u0.pes && !u0.inf && u0.eff === 'normal', u0);
  check('DESBLOQUEO.selector_oculto_hasta_terminar_normal', u0.pick === '', u0.pick.slice(0, 80));
  const u1 = await E(() => {
    const r = {};
    for (const k of ARENA_ORDER.slice(0, -1)) save.arenasCleared[k] = true;
    r.pesAntesDelFinal = diffTierOpen('pesadilla');
    save.arenasCleared.infernal = true;
    r.pes = diffTierOpen('pesadilla'); r.inf = diffTierOpen('infierno');
    r.pesOpen = ARENA_ORDER.filter(k => diffArenaUnlocked(k, 'pesadilla'));
    diffSetSelected('pesadilla'); r.effCiudad = diffEffective('ciudad'); r.effBosque = diffEffective('bosque');
    currentArena = 'ciudad'; const dv = diffMarkCleared('ciudad', 'pesadilla');
    r.dv = dv; r.pesOpen2 = ARENA_ORDER.filter(k => diffArenaUnlocked(k, 'pesadilla'));
    for (const k of ARENA_ORDER.slice(1, -1)) diffMarkCleared(k, 'pesadilla');
    r.infAntes = diffTierOpen('infierno');
    r.last = diffMarkCleared('infernal', 'pesadilla');
    r.infOpen = ARENA_ORDER.filter(k => diffArenaUnlocked(k, 'infierno'));
    r.noCredit = diffMarkCleared('fortaleza', 'infierno', false); r.noCreditSaved = !!save.diffCleared.infierno.fortaleza;
    return r;
  });
  check('DESBLOQUEO.pesadilla_al_terminar_la_campania_normal', !u1.pesAntesDelFinal && u1.pes && !u1.inf, u1);
  check('DESBLOQUEO.pesadilla_secuencial_desde_la_primera', JSON.stringify(u1.pesOpen) === '["ciudad"]' && u1.effCiudad === 'pesadilla' && u1.effBosque === 'normal', u1);
  check('DESBLOQUEO.victoria_abre_la_siguiente', u1.dv.firstClear && JSON.stringify(u1.pesOpen2) === '["ciudad","fortaleza"]', u1.pesOpen2);
  check('DESBLOQUEO.infierno_al_terminar_pesadilla', !u1.infAntes && u1.last.opened === 'infierno' && JSON.stringify(u1.infOpen) === '["ciudad"]', u1);
  check('DESBLOQUEO.invitado_sin_abrirla_no_suma', !u1.noCreditSaved && !u1.noCredit.firstClear, u1.noCredit);

  // ---------------- ESCALAS ----------------
  const sc = await E(() => {
    const out = {};
    __lvl(40); __allNormal(); __allTier('pesadilla'); __allTier('infierno');
    for (const t of ['normal', 'pesadilla', 'infierno']) {
      diffSetSelected(t); __start('hielo', 1);
      const e = spawnEnemy('lobo_hielo' in ENEMY_BASE ? 'lobo_hielo' : Object.keys(ENEMY_BASE)[0], false);
      out[t] = { tier: runDifficulty.tier, hp: +runDifficulty.hp.toFixed(3), dmg: +runDifficulty.dmg.toFixed(3), avgHp: Math.round(runDifficulty.avgHp), cap: runDifficulty.hitCapMult || 1,
        fire: enemyResist(e, 'fire'), phys: enemyResist(e, 'physical'), xp: +runDifficulty.xp.toFixed(2) };
      // élites: peso relativo en el pool del nivel 8
      const pool = spawnPoolFor(8); let el = 0, tot = 0; for (const p of pool) { const w = p.w * diffEliteWeight(p.t); tot += w; const b = ENEMY_BASE[p.t]; if (b && (b.rank === 'elite' || b.rank === 'subelite')) el += w; }
      out[t].eliteShare = tot ? +(el / tot).toFixed(3) : 0;
      const w = lootTierWeights('hielo', 'A', null, false); let s = 0; for (const k in w) s += w[k];
      out[t].legShare = +((w.legendario + w.set + w.mitico) / s).toFixed(4);
    }
    return out;
  });
  check('ESCALAS.hud_de_la_partida_toma_la_dificultad', sc.pesadilla.tier === 'pesadilla' && sc.infierno.tier === 'infierno' && sc.normal.tier === 'normal', sc);
  check('ESCALAS.vida_y_danio_suben', sc.pesadilla.hp > sc.normal.hp * 1.4 && sc.infierno.hp > sc.pesadilla.hp * 1.4 && sc.pesadilla.dmg > sc.normal.dmg * 1.3 && sc.infierno.dmg > sc.pesadilla.dmg * 1.3 && sc.infierno.avgHp > sc.normal.avgHp, sc);
  check('ESCALAS.resistencia_elemental_no_fisica', Math.abs((sc.pesadilla.fire - sc.normal.fire) - 0.15) < 1e-6 && Math.abs((sc.infierno.fire - sc.normal.fire) - 0.3) < 1e-6 && sc.infierno.phys === sc.normal.phys, sc);
  check('ESCALAS.elites_mas_frecuentes', sc.pesadilla.eliteShare > sc.normal.eliteShare && sc.infierno.eliteShare > sc.pesadilla.eliteShare, [sc.normal.eliteShare, sc.pesadilla.eliteShare, sc.infierno.eliteShare]);
  check('ESCALAS.tope_por_golpe_y_xp', sc.pesadilla.cap > 1 && sc.infierno.cap > sc.pesadilla.cap && sc.pesadilla.xp > sc.normal.xp && sc.infierno.xp > sc.pesadilla.xp, sc);
  check('BOTIN.mejor_rareza', sc.pesadilla.legShare > sc.normal.legShare * 1.3 && sc.infierno.legShare > sc.pesadilla.legShare * 1.2, [sc.normal.legShare, sc.pesadilla.legShare, sc.infierno.legShare]);

  // CALIBRACIÓN "relativa al nivel esperado": (a) con el MISMO equipo en el nivel esperado de cada dificultad,
  // la horda de Pesadilla/Infierno contra la de Normal (objetivo ~×2,5 / ~×6); (b) lo que SE SIENTE (vida
  // enemiga / poder ofensivo del equipo y golpe enemigo / vida del equipo) contra Normal en SU nivel esperado.
  const cal = await E(() => {
    const out = {};
    __allNormal(); __allTier('pesadilla'); __allTier('infierno');
    const at = (a, t, L) => { __lvl(L); diffSetSelected(t); __start(a, 1); return { hp: runDifficulty.hp, dmg: runDifficulty.dmg, off: runDifficulty.off, def: runDifficulty.def, boss: runDifficulty.avgHp / (runDifficulty.avgHp / (DIFF_TIERS[t].bossDmg)) }; };
    for (const a of ['ciudad', 'hielo', 'minas']) {
      const lv = t => Math.min(99, (DIFF.arenaLevel[a] || 1) + DIFF_TIERS[t].lvlOffset + (a === 'ciudad' ? 5 : 0));
      const N0 = at(a, 'normal', lv('normal')), NP = at(a, 'normal', lv('pesadilla')), P = at(a, 'pesadilla', lv('pesadilla')), NI = at(a, 'normal', lv('infierno')), I = at(a, 'infierno', lv('infierno'));
      const felt = (x) => ({ hp: +((x.hp / x.off) / (N0.hp / N0.off)).toFixed(2), dmg: +((x.dmg / x.def) / (N0.dmg / N0.def)).toFixed(2) });
      out[a] = { lv: [lv('normal'), lv('pesadilla'), lv('infierno')],
        sameP: { hp: +(P.hp / NP.hp).toFixed(2), dmg: +(P.dmg / NP.dmg).toFixed(2) }, sameI: { hp: +(I.hp / NI.hp).toFixed(2), dmg: +(I.dmg / NI.dmg).toFixed(2) },
        feltP: felt(P), feltI: felt(I), absP: +(P.hp / N0.hp).toFixed(1), absI: +(I.hp / N0.hp).toFixed(1) };
    }
    return out;
  });
  console.log('CALIBRACION ' + JSON.stringify(cal));
  const inR = (v, lo, hi) => v >= lo && v <= hi;
  // (a) ~×2,5 / ~×6: el "Normal" de comparación ya trae el seguimiento de REJUGAR (+15 % por ir sobrenivelado),
  // por eso el cociente queda un poco abajo del multiplicador de la dificultad.
  check('CALIBRACION.pesadilla_x2_5_en_su_nivel', Object.values(cal).every(c => inR(c.sameP.hp, 1.8, 3.0) && inR(c.sameP.dmg, 1.8, 3.0)), cal);
  check('CALIBRACION.infierno_x6_en_su_nivel', Object.values(cal).every(c => inR(c.sameI.hp, 3.6, 7) && inR(c.sameI.dmg, 3.6, 7)), cal);
  // (b) sin equipo (el equipo de Pesadilla/Infierno es lo que lo compensa, como en Diablo II)
  check('CALIBRACION.se_siente_mas_dificil_sin_ser_un_muro', Object.values(cal).every(c => inR(c.feltP.hp, 1.2, 2.5) && inR(c.feltP.dmg, 1.2, 2.5) && c.feltI.hp > c.feltP.hp && c.feltI.dmg > c.feltP.dmg && c.feltI.hp < 5.5 && c.feltI.dmg < 5.5), cal);

  // ---------------- BOTÍN (nivel de objeto) ----------------
  const lo = await E(() => {
    __lvl(40); __allNormal(); __allTier('pesadilla'); __allTier('infierno'); save.stash = [];
    const lv = {};
    for (const t of ['normal', 'pesadilla', 'infierno']) {
      diffSetSelected(t); __start('hielo', 10);
      const got = []; for (let i = 0; i < 6; i++) { const r = grantEndOfRunLoot('mago', { grade: 'A', score: 80 }, true); got.push(...r.items.map(it => itemLevel(it))); }
      lv[t] = Math.min(...got); save.stash = [];
    }
    return lv;
  });
  check('BOTIN.objetos_caen_con_nivel', lo.normal === 1 && lo.pesadilla === 3 && lo.infierno === 5, lo);

  // ---------------- GUARDADO ----------------
  const sv = await E(() => { diffSetSelected('pesadilla'); save.defeatCount = 2; persistNow(); return localStorage.getItem('laHordaSave_v1'); });
  await boot(JSON.parse(sv));
  const g1 = await E(() => ({ sel: save.diffSelected, n: Object.keys(save.diffCleared.pesadilla).length, dc: save.defeatCount, inf: diffTierOpen('infierno') }));
  check('GUARDADO.progreso_por_dificultad_sobrevive', g1.sel === 'pesadilla' && g1.n === 10 && g1.dc === 2 && g1.inf, g1);
  // guardado viejo (sin los campos nuevos, o con basura): no se rompe
  const old = JSON.parse(sv); delete old.diffCleared; delete old.diffSelected; delete old.defeatCount;
  await boot(old);
  const g2 = await E(() => ({ shape: JSON.stringify(save.diffCleared), sel: save.diffSelected, dc: save.defeatCount, cleared: !!save.arenasCleared.infernal, pes: diffTierOpen('pesadilla') }));
  check('GUARDADO.migracion_guardado_viejo', g2.shape === '{"pesadilla":{},"infierno":{}}' && g2.sel === 'normal' && g2.dc === 0 && g2.cleared && g2.pes, g2);
  const bad = JSON.parse(sv); bad.diffCleared = 'x'; bad.diffSelected = 'dios';
  await boot(bad);
  const g3 = await E(() => ({ shape: JSON.stringify(save.diffCleared), sel: save.diffSelected, eff: diffEffective('ciudad') }));
  check('GUARDADO.valores_invalidos_se_corrigen', g3.shape === '{"pesadilla":{},"infierno":{}}' && g3.sel === 'normal' && g3.eff === 'normal', g3);

  // ---------------- SEMILLA (variantes de mapa) ----------------
  const sd = await E(() => {
    const snap = () => ({ runes: BOS.runes ? BOS.runes.map(r => r.id).join() : '', solids: JSON.stringify(aidSolids), decals: aidDecals.slice(0, 40).map(d => Math.round(d.x) + ',' + Math.round(d.y)).join(';') });
    const withSeed = (seed, a) => { const o = diffNewSoloSeed; diffNewSoloSeed = () => (_soloMapSeed = seed); try { __start(a, 1); } finally { diffNewSoloSeed = o; } };
    const r = {};
    withSeed(1234, 'bosque'); const b1 = snap(); withSeed(1234, 'bosque'); const b2 = snap();
    r.estable = b1.runes === b2.runes && b1.decals === b2.decals;
    const variants = new Set(), decals = new Set(); let solidsSame = true;
    for (let s = 1; s <= 24; s++) { withSeed(s * 7919, 'bosque'); const q = snap(); variants.add(q.runes); decals.add(q.decals); if (q.solids !== b1.solids) solidsSame = false; }
    r.variants = [...variants]; r.decals = decals.size; r.solidsSame = solidsSame;
    // Hielo: cada giro de los braseros cae libre (dentro del lago y lejos de sólidos)
    withSeed(55, 'hielo');
    r.hielo = HIE_CFG.brazierTurns.map(t => HIE_CFG.braziers.map(a => { const p = aidOnRing(HIE_CFG.ring, HIE_CFG.ring, a + t); return aidInside(p.x, p.y, 60) && !aidBlocked(p.x, p.y, 50); }).every(Boolean));
    const turns = new Set(); for (let s = 1; s <= 24; s++) { withSeed(s * 104729, 'hielo'); turns.add(HIE.br.map(b => b.x + ',' + b.y).join(';')); }
    r.hieloVariants = turns.size;
    // cooperativo: la semilla sale de netMatch (la del anfitrión), no del azar local
    netMatch = { seed: 4242 }; const s1 = runMapSeed(), p1 = mapVariantPick('bos_runes', 2); netMatch = null;
    r.coop = s1 === 4242 && p1 === mapVariantPick.call(null, 'bos_runes', 2) || s1 === 4242;
    return r;
  });
  check('SEMILLA.misma_semilla_mismo_mapa', sd.estable, sd);
  check('SEMILLA.bosque_dos_variantes_de_runas', sd.variants.length === 2, sd.variants);
  check('SEMILLA.decorado_varia_y_los_solidos_no', sd.decals > 10 && sd.solidsSame, { decals: sd.decals, solidsSame: sd.solidsSame });
  check('SEMILLA.hielo_giros_libres_y_variados', sd.hielo.every(Boolean) && sd.hieloVariants >= 3, sd);
  check('SEMILLA.cooperativo_usa_la_del_anfitrion', sd.coop, sd.coop);

  // ---------------- TRAZADO AL AZAR (js/arenas/arena-layouts.js) ----------------
  const ly = await E(() => {
    const ARENAS = ['bosque', 'hielo', 'laberinto', 'acuatica', 'infernal'];
    const withSeed = (seed, a) => { const o = diffNewSoloSeed; diffNewSoloSeed = () => (_soloMapSeed = seed); try { __start(a, 1); } finally { diffNewSoloSeed = o; } };
    // celdas libres del campo de flujo de los enemigos que NO se alcanzan desde el centro
    const unreachable = () => { const N = AID_NAV; if (!N.on) return 0; const seen = new Uint8Array(N.W*N.H), q = [];
      const c0 = aidNavCell(0, 0); if (!N.blocked[c0]) { seen[c0] = 1; q.push(c0); }
      while (q.length) { const c = q.pop(), i = c % N.W, j = (c - i)/N.W; for (const k of [i>0?c-1:-1, i<N.W-1?c+1:-1, j>0?c-N.W:-1, j<N.H-1?c+N.W:-1]) if (k >= 0 && !N.blocked[k] && !seen[k]) { seen[k] = 1; q.push(k); } }
      let n = 0; for (let c = 0; c < seen.length; c++) if (!N.blocked[c] && !seen[c]) n++; return n; };
    const r = { normal: {}, arenas: {} };
    __allNormal(); __allTier('pesadilla'); diffSetSelected('normal');
    for (const a of ARENAS) { withSeed(99, a); r.normal[a] = { lay: aidSolids.filter(s => s.lay).length, un: unreachable(), info: aidLayoutInfo }; }
    diffSetSelected('pesadilla');
    for (const a of ARENAS) {
      const R = r.arenas[a] = { minPlaced: 99, sigs: new Set(), unMax: 0, spawnOk: true, collide: true, enemy: true, why: {} };
      for (let s = 1; s <= 24; s++) {
        withSeed(s * 7919, a);
        const lay = aidSolids.filter(x => x.lay), I = aidLayoutInfo || { placed: 0, rejected: [] };
        R.minPlaced = Math.min(R.minPlaced, lay.length); R.sigs.add(I.pattern + (I.mirror ? 'm' : ''));
        for (const x of I.rejected) R.why[x.why] = (R.why[x.why] || 0) + 1;
        R.unMax = Math.max(R.unMax, unreachable() - r.normal[a].un);
        for (const h of heroes) if (aidSolids.some(x => Math.hypot(x.x - h.x, x.y - h.y) < x.r + (h.radius || 18))) R.spawnOk = false;
        if (a === 'hielo') for (const b of HIE.br) if (aidBlocked(b.x, b.y, 50)) R.spawnOk = false;
        const p = lay[s % lay.length];
        if (p) {
          player.x = p.x + 1; player.y = p.y; for (let k = 0; k < 4; k++) resolveWallCollision(player);
          if (Math.hypot(player.x - p.x, player.y - p.y) < (p.r + player.radius) * 0.85) R.collide = false;
          const e = spawnEnemy(pickFromPool(spawnPoolFor(1)), false); e.x = p.x; e.y = p.y + 1; for (let k = 0; k < 4; k++) clampToArena(e);
          if (Math.hypot(e.x - p.x, e.y - p.y) < p.r) R.enemy = false;
          enemies.length = 0;
        }
      }
      R.sigs = R.sigs.size;
    }
    // misma semilla, mismo trazado; en cooperativo el invitado arma lo del anfitrión (lay viaja en {k:"start"})
    withSeed(4242, 'infernal'); const a1 = JSON.stringify(aidSolids); withSeed(4242, 'infernal'); r.estable = a1 === JSON.stringify(aidSolids);
    currentArena = 'acuatica';
    netMatch = { role: 'host', seed: 777, diff: 'pesadilla', slots: [] }; netWithSeed(777, () => buildArenaDecor()); const host = JSON.stringify(aidSolids); r.hostLay = mapLayoutOn();
    netMatch = { role: 'guest', seed: 777, diff: 'pesadilla', lay: true }; netWithSeed(777, () => buildArenaDecor()); r.guestSame = JSON.stringify(aidSolids) === host && aidSolids.some(x => x.lay);
    netMatch = { role: 'guest', seed: 777, diff: 'pesadilla', lay: false }; netWithSeed(777, () => buildArenaDecor()); r.guestNoLay = !aidSolids.some(x => x.lay);
    netMatch = null;
    // Horda Infinita: siempre (aunque la dificultad sea Normal)
    diffSetSelected('normal'); endlessActive = true; r.endless = mapLayoutOn(); withSeed(31, 'bosque'); r.endlessLay = aidSolids.filter(x => x.lay).length; endlessActive = false;
    r.normalNoLayAfter = (withSeed(31, 'bosque'), !aidSolids.some(x => x.lay));
    return r;
  });
  check('TRAZADO.normal_sin_cambios', Object.values(ly.normal).every(n => n.lay === 0 && !n.info), ly.normal);
  for (const a of Object.keys(ly.arenas)) {
    const R = ly.arenas[a];
    check('TRAZADO.' + a + '_pilares_y_patrones', R.minPlaced >= 4 && R.sigs >= 4, R);
    check('TRAZADO.' + a + '_navegacion_sin_bolsillos_nuevos', R.unMax === 0, R);
    check('TRAZADO.' + a + '_salida_y_mecanicas_libres', R.spawnOk, R);
    check('TRAZADO.' + a + '_colision_heroe_y_enemigo', R.collide && R.enemy, R);
  }
  check('TRAZADO.misma_semilla_mismo_trazado', ly.estable);
  check('TRAZADO.invitado_arma_lo_del_anfitrion', ly.hostLay && ly.guestSame && ly.guestNoLay, ly);
  check('TRAZADO.horda_infinita_siempre', ly.endless && ly.endlessLay >= 4 && ly.normalNoLayAfter, ly);

  // ---------------- DERROTA SIN CASTIGO ----------------
  await boot(null);
  const dv = await E(() => {
    const r = {};
    __lvl(5); selectedClass = 'mago';
    const run = (a, fn) => { __start(a, 1); fn(); return applyArenaFailurePenalty('mago'); };
    const earn = () => { grantXP('mago', 900); grantGold(500); };
    // 1) Ciudad (primera arena, Normal): perdona aunque ya haya muchas derrotas
    save.defeatCount = 7; const lv0 = save.champions.mago.level;
    r.ciudad = run('ciudad', earn); r.ciudadLv = save.champions.mago.level > lv0;
    // 2) otra arena: las 3 primeras derrotas de la cuenta se perdonan; la 4ta se castiga
    save.defeatCount = 0; save.arenasCleared.ciudad = true;
    r.seq = [];
    for (let i = 0; i < 4; i++) { const p = run('fortaleza', earn); r.seq.push([p.forgiven, p.xpLost > 0, p.goldLost > 0, p.forgivenLeft]); }
    // 3) la Ciudad en Pesadilla ya no está en el perdón de "primera arena"
    __allNormal(); save.diffCleared.pesadilla = {}; diffSetSelected('pesadilla');
    r.ciudadPes = run('ciudad', earn).forgiven;
    diffSetSelected('normal');
    // 4) pantalla de derrota
    save.defeatCount = 0; __start('fortaleza', 1); showGameOverScreen();
    r.go = document.getElementById('go-progress').textContent;
    return r;
  });
  check('DERROTA.primera_arena_sin_castigo', dv.ciudad.forgiven === 'arena' && dv.ciudad.xpLost === 0 && dv.ciudad.goldLost === 0 && dv.ciudadLv, dv.ciudad);
  check('DERROTA.tres_primeras_perdonadas_la_cuarta_no', JSON.stringify(dv.seq.map(s => s[0])) === '["primeras","primeras","primeras",null]' && dv.seq[3][1] && dv.seq[3][2], dv.seq);
  check('DERROTA.ciudad_en_pesadilla_castiga', dv.ciudadPes === null, dv.ciudadPes);
  check('DERROTA.mensaje_claro', /Esta vez la Horda te perdona/.test(dv.go) && /2 derrotas sin castigo/.test(dv.go), dv.go.slice(0, 300));

  // ---------------- UI (Sala, HUD, resultados) ----------------
  const ui = await E(() => {
    __lvl(40); __allNormal(); save.diffCleared.pesadilla = {}; diffSetSelected('normal');
    currentArena = 'ciudad'; selectedClass = 'mago'; lobbyAllies = ['tanque','guerrero','soporte'];
    setState('prep'); renderPrepSummary();
    const btns = [...document.querySelectorAll('#lobby-arena .diff-pick')].map(b => ({ k: b.dataset.diff, dis: b.disabled, on: b.classList.contains('on') }));
    document.querySelector('#lobby-arena .diff-pick[data-diff="pesadilla"]').click();
    const after = { sel: save.diffSelected, on: (document.querySelector('#lobby-arena .diff-pick.on') || {}).dataset };
    __start('ciudad', 1);
    const hud = (document.getElementById('hud-diff') || {}).textContent || '';
    const row = diffResultRowHTML(true);
    diffSetSelected('normal'); __start('ciudad', 1);
    const hudN = document.getElementById('hud-diff');
    return { btns, after: { sel: after.sel, on: after.on && after.on.diff }, hud, row, hudNormalHidden: !hudN };
  });
  check('UI.sala_muestra_las_tres', ui.btns.length === 3 && !ui.btns[0].dis && !ui.btns[1].dis && ui.btns[2].dis && ui.btns[0].on, ui.btns);
  check('UI.elegir_pesadilla', ui.after.sel === 'pesadilla' && ui.after.on === 'pesadilla', ui.after);
  check('UI.hud_y_resultados', /PESADILLA/.test(ui.hud) && /Pesadilla/.test(ui.row) && ui.hudNormalHidden, ui);

  check('SIN_ERRORES', errors.length === 0, errors.slice(0, 5));
  await browser.close();
  console.log(fails ? `FALLAS: ${fails}` : 'OK');
  process.exit(fails ? 1 : 0);
})();
