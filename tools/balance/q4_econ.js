// ECONOMÍA DEL ALFA (Q4): botín por arena, nivel de objeto, primeras mejoras, oro por fuente y tienda, con el
// código REAL del juego (sin partidas: Monte Carlo sobre las funciones puras y el guardado en memoria).
// Sirve los archivos desde el disco (page.route), así que mide cualquier árbol sin levantar servidor:
//   node tools/balance/q4_econ.js [raíz=repo] [N=2000]            -> JSON con todo
//   node tools/balance/q4_econ.js /ruta/al/arbol/viejo 2000        -> lo mismo con el código de antes
// Supuestos (declarados, iguales antes y después):
//   - bajas por partida (reseña de economía, §2.2): 500 comunes, 15 sub-élites, 3 élites, 2 élites con nombre,
//     2 subjefes y 1 jefe, más el cofre de victoria con calificación A;
//   - un jugador nuevo gana una arena por partida en el orden de la campaña (partidas 1-10) y después farmea la 10;
//   - equipa lo que mejora el stat de la ranura (o llena una vacía) y no rompe su set regalado;
//   - oro peleando por partida: lo medido por la reseña (658 en la Ciudad; ~550 de promedio); no lo toca Q4.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright');
const path = require('path'), fs = require('fs');
const ROOT = path.resolve(process.argv[2] || path.join(__dirname, '..', '..'));
const N = +(process.argv[3] || 2000);
const MIME = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.json': 'application/json', '.svg': 'image/svg+xml', '.gif': 'image/gif', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.woff2': 'font/woff2' };
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 } });
  await ctx.route('http://q4.local/**', route => {
    const u = new URL(route.request().url()); let f = path.join(ROOT, decodeURIComponent(u.pathname));
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) return route.fulfill({ status: 404, body: '' });
    route.fulfill({ status: 200, body: fs.readFileSync(f), headers: { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' } });
  });
  await ctx.route(/^https?:\/\/(?!q4\.local)/, r => r.abort());
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => { window.__campaignMode = true; });
  page.setDefaultTimeout(0); // el Monte Carlo tarda; y con la máquina cargada la página (~1.800 archivos) también
  await page.goto('http://q4.local/index.html', { waitUntil: 'load', timeout: 300000 });
  for (let i = 0; i < 1200; i++) { const ok = await page.evaluate(() => { const b = document.getElementById('title-continue-btn'); return b && !b.disabled; }); if (ok) break; await new Promise(r => setTimeout(r, 100)); }
  const out = await page.evaluate((N) => {
    loop = function () {};
    let seed = 20260929; const rng = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    const R = Math.random; Math.random = rng; // todo el azar del juego con semilla: antes y después comparables
    const KILLS = { normal: 500, subelite: 15, elite: 3, named: 2, subjefe: 2, jefe: 1 };
    const HIGH = { legendario: 1, mitico: 1, set: 1, unico: 1 };
    const ORDER = CAMPAIGN_ORDER.slice();
    const r2 = x => Math.round(x * 100) / 100;
    const hasIlvl = typeof itemIlvl === 'function';
    const res = { tieneNivelDeObjeto: hasIlvl, porArena: {}, primeraMejora: {}, setRegaladoVsBotin: {}, oro: {}, tienda: {} };
    // --- botín de UNA partida en `arena` para `classKey` (piso + cofre); devuelve objetos reales ---
    function runLoot(arena, classKey, pity, victory, withChest) {
      currentArena = arena; const items = [];
      for (const rk in KILLS) {
        const e = { rank: rk === 'named' ? 'elite' : rk, eliteName: rk === 'named' ? 'x' : null };
        const src = _glSource(e); if (!src) continue;
        for (let k = 0; k < KILLS[rk]; k++) {
          const n = groundLootRollCount(src, rng);
          const build = src.build > 0 && buildLegendAllowed(arena) && rng() < src.build;
          for (let i = 0; i < n + (build ? 1 : 0); i++) {
            const b = build && i === n;
            let tier = b ? 'legendario' : groundLootRollTier(arena, src.grade, src.hm, pity, rng, i === 0 ? src.floor : null);
            let spec = b ? { tier, build: true } : { tier };
            if (tier === 'set') { const sp = _rollSetPiece(arena, ownedDesignIds(), rng, classKey); spec = sp ? { tier, setId: sp.setId, designId: sp.designId, type: sp.type } : { tier: 'legendario' }; }
            if (LOOT_PITY[spec.tier]) pity[spec.tier] = 0;
            const it = materializeLoot(spec, classKey, arena); if (!it) continue;
            it.lootTier = spec.tier; it._src = rk; items.push(it);
          }
        }
      }
      if (withChest) {
        runLevel = LEVEL_COUNT; subjefesDefeated = 2; save.lootPity = Object.assign({}, pity);
        const L = grantEndOfRunLoot(classKey, { grade: 'A' }, victory);
        Object.assign(pity, save.lootPity);
        const got = new Set(L.items.map(it => it.uid));
        for (const it of L.items) { it._src = 'cofre'; items.push(it); }
        save.stash = save.stash.filter(it => it && !got.has(it.uid)); // el cofre ya se guardó: se saca para que la simulación decida qué se queda
      }
      return items;
    }
    const tierOf = it => itemTier(it);
    // ============ A) qué cae por arena (N partidas, perfil que ya ganó antes: sin el regalo de primera victoria) ============
    save.firstWinLoot = true; save.stash = [];
    for (const arena of ORDER) {
      let pity = {}, cnt = {}, total = 0, hi = 0, mr = 0, runsMR = 0, statMR = 0, nMR = 0, ilvlSum = 0, bySrc = {};
      for (let r = 0; r < N; r++) {
        const items = runLoot(arena, 'guerrero', pity, true, true); save.stash = [];
        let got = false;
        for (const it of items) {
          const t = tierOf(it); cnt[t] = (cnt[t] || 0) + 1; total++;
          if (HIGH[t]) hi++; if (t === 'muyraro') { mr++; if (it.type === 'arma') { statMR += itemStat(it); nMR++; } }
          if ((TIER_ORDER[t] || 0) >= 2) got = true;
          ilvlSum += hasIlvl ? itemIlvl(it) : 1;
          const s = bySrc[it._src] = bySrc[it._src] || {}; s[t] = (s[t] || 0) + 1;
        }
        if (got) runsMR++;
      }
      const pct = {}; for (const t in cnt) pct[t] = Math.round(cnt[t] / total * 1000) / 10;
      const src = {}; for (const s in bySrc) { const tt = Object.values(bySrc[s]).reduce((a, b) => a + b, 0); src[s] = { porPartida: r2(tt / N), comunPct: Math.round(((bySrc[s].comun || 0) / tt) * 1000) / 10, rarosOMasPct: Math.round((1 - (bySrc[s].comun || 0) / tt) * 1000) / 10 }; }
      res.porArena[arena] = { n: campaignNumber(arena), objetosPorPartida: r2(total / N), pct, muyRaroOMasPorPartida: r2((cnt.muyraro || 0 + 0) / N + hi / N), legendarioOMasPorPartida: r2(hi / N),
        partidasConMuyRaroOMasPct: Math.round(runsMR / N * 1000) / 10, statMedioArmaMuyRaro: nMR ? Math.round(statMR / nMR * 1000) / 10 + '%' : '-', nivelObjetoMedio: r2(ilvlSum / total), porFuente: src };
    }
    // ============ B) partidas hasta la primera mejora (perfil nuevo) ============
    const giftSetOf = k => (typeof SET_SKINS !== 'undefined') ? Object.keys(SET_SKINS).find(id => SET_DB[id] && skinSetChamp(id) === k) : null;
    function freshChamp(k, withGift) {
      save.stash = []; save.firstWinLoot = undefined; save.arenasCleared = {}; save.gold = 0; save.lootPity = {};
      try { const q = questsState(); q.stats.wins = 0; } catch (e) {}
      for (const c in save.champions) save.champions[c].equipment = mkEquipment();
      save.champions[k].unlocked = true;
      const gift = withGift ? giftSetOf(k) : null; const giftUids = new Set();
      if (gift) for (const p of setPieceIds(gift)) { const it = makeDesignedItem(p); it.bought = true; it.gift = true; save.stash.push(it); save.champions[k].equipment[it.type] = it.uid; giftUids.add(it.uid); }
      return { gift, giftUids };
    }
    const CHAMPS = Object.keys(CLASSES).filter(k => save.champions[k]);
    const RUNS = 15, SIMS = Math.max(40, Math.round(N / 20));
    for (const withGift of [false, true]) {
      const agg = {}; // por guardián: medianas
      for (const k of CHAMPS) {
        const firstAny = [], firstOverGift = [], upgradesFirst3 = [], firstMR = [];
        let hadGift = false;
        for (let s = 0; s < SIMS; s++) {
          const F = freshChamp(k, withGift); hadGift = hadGift || !!F.gift;
          let pity = {}, fa = 0, fg = 0, up3 = 0, fmr = 0;
          for (let run = 1; run <= RUNS; run++) {
            const arena = ORDER[Math.min(run, ORDER.length) - 1];
            if (run > 1) save.arenasCleared[ORDER[Math.min(run - 1, ORDER.length) - 1]] = true;
            save.arenasCleared[arena] = true; // la victoria marca la arena antes del cofre (run.js)
            const items = runLoot(arena, k, pity, true, true);
            try { questsState().stats.wins = run; } catch (e) {}
            save.firstWinLoot = save.firstWinLoot || 'sim';
            for (const it of items) {
              if (!canEquipItem(k, it)) continue;
              const cur = equippedItem(k, it.type);
              const better = !cur || itemStat(it) > itemStat(cur) + 1e-9;
              if (cur && F.giftUids.has(cur.uid) && itemStat(it) > itemStat(cur) + 1e-9 && !fg) fg = run;
              if (better && !(cur && F.giftUids.has(cur.uid))) {
                if (!fa) fa = run; if (run <= 3) up3++; if (!fmr && (TIER_ORDER[itemTier(it)] || 0) >= 2) fmr = run;
                save.stash.push(it); save.champions[k].equipment[it.type] = it.uid;
              }
            }
            if (save.stash.length > 40) save.stash = save.stash.filter(x => itemEquippedBy(x.uid));
          }
          firstAny.push(fa || 99); firstOverGift.push(fg || 99); upgradesFirst3.push(up3); firstMR.push(fmr || 99);
        }
        const med = a => { const x = a.slice().sort((p, q) => p - q); return x[Math.floor(x.length / 2)]; };
        const mean = a => r2(a.reduce((p, q) => p + q, 0) / a.length);
        agg[k] = { setRegalado: withGift ? (giftSetOf(k) || '(solo cromas)') : '-', primeraMejoraPartida: med(firstAny), primeraMejoraMuyRaroOMas: med(firstMR), pctConMejoraMuyRaroEnPartida1: Math.round(firstMR.filter(x => x === 1).length / firstMR.length * 100) + '%', mejorasEnPartidas1a3: mean(upgradesFirst3) };
        if (withGift && giftSetOf(k)) { agg[k].primeraVezQueAlgoLeGanaAUnaPiezaDelSet = med(firstOverGift) === 99 ? '>15' : med(firstOverGift); }
      }
      res.primeraMejora[withGift ? 'conRegaloDeSet' : 'sinSet'] = agg;
    }
    // ============ C) set regalado vs botín de las primeras 3 arenas (poder) ============
    for (const k of CHAMPS) {
      const gift = giftSetOf(k); if (!gift) continue;
      const F0 = freshChamp(k, false); const base = computePlayerStats(k); const hp0 = base.hp, dmg0 = base.dmg;
      // mejor equipo SIN set tras 3 partidas (promedio de SIMS perfiles)
      let dmgL = 0, hpL = 0, n = 0;
      for (let s = 0; s < SIMS; s++) {
        freshChamp(k, false); let pity = {};
        for (let run = 1; run <= 3; run++) { const arena = ORDER[run - 1]; save.arenasCleared[arena] = true; const items = runLoot(arena, k, pity, true, true); save.firstWinLoot = 'sim';
          for (const it of items) { if (!canEquipItem(k, it)) continue; const cur = equippedItem(k, it.type); if (!cur || itemStat(it) > itemStat(cur)) { save.stash.push(it); save.champions[k].equipment[it.type] = it.uid; } } }
        invalidatePassiveCache(); const st = computePlayerStats(k); dmgL += st.dmg; hpL += st.hp; n++;
      }
      freshChamp(k, true); invalidatePassiveCache(); const sg = computePlayerStats(k);
      res.setRegaladoVsBotin[k] = { set: gift, sinNada: { dmg: Math.round(dmg0), hp: hp0 }, conSetRegalado: { dmg: Math.round(sg.dmg), hp: sg.hp, dmgPct: '+' + Math.round((sg.dmg / dmg0 - 1) * 100) + '%', hpPct: '+' + Math.round((sg.hp / hp0 - 1) * 100) + '%' },
        conBotin3Arenas: { dmg: Math.round(dmgL / n), hp: Math.round(hpL / n), dmgPct: '+' + Math.round((dmgL / n / dmg0 - 1) * 100) + '%', hpPct: '+' + Math.round((hpL / n / hp0 - 1) * 100) + '%' } };
    }
    // ============ D) oro de logros/desafíos/pase en la primera partida (sistema real de desafíos) ============
    Math.random = R;
    function questGoldFirstRun() {
      localStorage.removeItem('laHordaQuests');
      const q = questsState();
      // cuenta nueva: reinicia lo que acumuló la simulación
      Object.assign(q, { ach: {}, xp: 0, level: 1, seen: {}, chests: [] }); q.season.xp = 0; q.season.granted = 1; q.titles = q.titles.slice(0, 1);
      for (const kk in q.stats) if (typeof q.stats[kk] === 'number') q.stats[kk] = 0; else if (typeof q.stats[kk] === 'boolean') q.stats[kk] = false;
      q.stats.byChamp = {}; q.stats.byArena = {}; q.stats.resoBy = {}; q.stats.fastWinMs = 0;
      for (const kind of ['daily', 'weekly']) { q[kind].bonus = false; for (const c of q[kind].list) { c.done = false; if (c.set) c.set = []; } }
      save.arenasCleared = {}; save.gold = 0; save.gems = 0; save.divineArenaUnlocked = false;
      if (save.codex) save.codex.kills = {};
      // cuenta nueva: un solo guardián (el de regalo), nivel 12 al terminar la Ciudad (lo medido por la reseña)
      for (const c in save.champions) { save.champions[c].unlocked = c === 'mago'; save.champions[c].level = c === 'mago' ? 12 : 1; }
      const by = { logros: 0, desafios: 0, bonus: 0, pase: 0, gemas: 0, lista: [] };
      const og = questsGrant;
      questsGrant = function (r, silent) { if (r) { const kind = ACHIEVEMENTS.some(a => a.reward === r) ? 'logros' : (SEASON_REWARDS.includes(r) ? 'pase' : ((r === CHALLENGE_BONUS.daily || r === CHALLENGE_BONUS.weekly) ? 'bonus' : 'desafios')); by[kind] += r.gold || 0; by.gemas += r.gems || 0; const a = ACHIEVEMENTS.find(x => x.reward === r); by.lista.push((a ? a.id : kind) + ':' + (r.gold || 0) + (r.gems ? '+' + r.gems + 'g' : '')); } return og.apply(this, arguments); };
      // lo que dejó la primera partida de la reseña: Ciudad ganada con A, 7:11, 520 bajas, 25 civiles, sin caer, 2 subjefes
      const st = q.stats; save.arenasCleared.ciudad = true;
      Object.assign(st, { runs: 1, wins: 1, bosses: 1, kills: 520, maxRunKills: 520, civ: 25, subjefes: 2, timeMs: 431000, gradeA: 1, deathless: 1, fastWinMs: 431000 });
      st.byChamp.mago = { runs: 1, wins: 1, kills: 520, timeMs: 431000 }; st.byArena.ciudad = { runs: 1, wins: 1, best: 67, grade: 'A', bestLevel: LEVEL_COUNT };
      questsAddXp(questsRunXp({ victory: true, kills: 520, level: LEVEL_COUNT, grade: 'A' }), true);
      questsEvaluate(true);
      questsGrant = og;
      return by;
    }
    let qg = null; try { qg = questGoldFirstRun(); } catch (e) { qg = { error: String(e) }; }
    const fight1 = 658; // medido por la reseña (Ciudad, primera partida)
    const tot1 = fight1 + (qg.logros || 0) + (qg.desafios || 0) + (qg.pase || 0) + (qg.bonus || 0);
    res.oro.primeraPartida = { peleando: fight1, logros: qg.logros, desafios: qg.desafios + (qg.bonus || 0), pase: qg.pase, total: tot1, gemasDeRetencion: qg.gemas, detalle: qg.lista || qg.error, pctPeleando: Math.round(fight1 / tot1 * 100) + '%' };
    // crucero: 4 partidas por día y 20 por semana, ya sin logros fáciles
    const avg = (ix) => { const v = CHALLENGE_TEMPLATES.map(t => t.gold[ix]).filter(Boolean); return v.reduce((a, b) => a + b, 0) / v.length; };
    let passGold = 0, passGems = 0; for (let l = 2; l <= SEASON_DEF.levels; l++) { const r = SEASON_REWARDS[l] || {}; passGold += r.gold || 0; passGems += r.gems || 0; }
    let passXp = 0; for (let l = 1; l < SEASON_DEF.levels; l++) passXp += seasonXpToNext(l);
    const xpRun = questsRunXp({ victory: true, kills: 520, level: LEVEL_COUNT, grade: 'A' }) + (3 * QUEST_XP.daily + QUEST_XP.dailyAll) / 4 + (3 * QUEST_XP.weekly + QUEST_XP.weeklyAll) / 20;
    const passPerRun = passGold / (passXp / xpRun), fightAvg = 550;
    const crucero = fightAvg + 3 * avg(0) / 4 + 3 * avg(1) / 20 + passPerRun;
    res.oro.crucero = { peleando: fightAvg, desafiosDiarios: Math.round(3 * avg(0) / 4), desafiosSemanales: Math.round(3 * avg(1) / 20), pase: Math.round(passPerRun), total: Math.round(crucero), paseOroTotal: passGold, paseGemasTotal: passGems, xpCuentaPorPartida: Math.round(xpRun), partidasParaTerminarElPase: Math.round(passXp / xpRun) };
    // ============ E) tienda: cuántas partidas para comprar X ============
    const champPrice = (CHAMPION_CATALOG.find(c => c.priceGold) || {}).priceGold || 2500;
    const P = typeof SHOP_PRICES !== 'undefined' ? SHOP_PRICES : null;
    const after3 = tot1 + 2 * (Math.round(crucero)); // la reseña: 3 partidas ≈ primera + 2 de crucero
    const buy = price => ({ precio: price, partidasDesdeCero: r2(price <= tot1 ? price / tot1 : 1 + (price - tot1) / crucero) });
    if (P) res.tienda = { oroTras3Partidas: after3, guardian: buy(champPrice), legendarioConNombre: buy(P.legendario), piezaDeSet: buy(P.set), skinDeSet4Piezas: buy(4 * P.set), muyRaroBasico: buy(P.base.muyraro), legendarioBasico: buy(P.base.legendario) };
    return res;
  }, N);
  out.errores = errors.slice(0, 5);
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})();
