// AUDITORÍA DE TEXTO EN PANTALLA DURANTE LA PARTIDA (iPhone 14 acostado, 844×390): arma los momentos más
// cargados que se ven jugando y mide cuántos textos GRANDES hay a la vez, dónde caen y si se pisan.
//   A) jefe + élite con nombre + botín común + voz del Hechicero + números de daño (Arena Gélida)
//   B) Horda Infinita: cartel de la Cicatriz + "RONDA N — EL JEFE DE LA ARENA" + sinergia + botín
// Textos grandes (DOM): cartel central, cartel de arena/jefe, guía del jefe, voz del Hechicero, avisos de
// botín, página de la Crónica, cartel de caído. En el canvas: placas de élite con nombre y textos
// flotantes que no son números (se calculan desde el estado del juego, antes y después son iguales).
// Por cada instante: cuántos grandes se ven, cuántos caen en el CENTRO (20-80 % de ancho, 22-78 % de
// alto), pares que se pisan y si un aviso de botín común quedó en el centro. Captura por instante.
//   node tools/audit/center_text.js [outdir=/tmp/center_text]      (SE_BASE_URL, por defecto 127.0.0.1:8783)
// Termina con "SUMMARY maxBig=N maxCenter=N overlaps=N lootCenter=N" y sale con 1 si el diseño se
// rompe (más de 2 grandes a la vez, pisadas, o botín común en el centro) salvo con REPORT_ONLY=1.
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const fs = require('fs'), path = require('path');
const BASE = process.env.SE_BASE_URL || 'http://127.0.0.1:8783';
const OUT = process.argv[2] || '/tmp/center_text'; fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));

// corre en la página: los rectángulos de los textos grandes visibles
function collect() {
  const vw = innerWidth, vh = innerHeight, out = [];
  const shown = el => {
    if (!el) return null;
    const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return null;
    for (let p = el; p && p !== document.body; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (cs.display === 'none' || cs.visibility === 'hidden') return null;
      // entrando (animación de aparición corriendo; con la máquina cargada va lenta): cuenta como visible
      const anim = p.getAnimations && p.getAnimations().some(a => a.playState === 'running' || a.playState === 'pending');
      if (parseFloat(cs.opacity) < 0.05 && !anim) return null;
      if (p.classList.contains('out') || (p.classList.contains('fade') && p.id === 'boss-intro')) return null;
    }
    return r;
  };
  const add = (kind, el, txt) => { const r = shown(el); if (r) out.push({ kind, x: r.left, y: r.top, w: r.width, h: r.height, t: (txt || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40) }); };
  add('banner', document.getElementById('center-banner'));
  add('titlecard', document.getElementById('arena-title-card'));
  add('bossguide', document.getElementById('boss-intro'));
  add('voz', document.getElementById('tut-panel'));
  add('cronica', document.getElementById('chron-card'));
  add('caido', document.getElementById('downed-overlay'));
  document.querySelectorAll('#loot-toasts .loot-toast, .loot-toast').forEach(el => {
    const common = !el.classList.contains('lt-warn') && !el.classList.contains('lt-big');
    add(common ? 'botin' : 'botin_raro', el);
  });
  // canvas: placas de élite con nombre (misma cuenta que eliteDrawScreenNames) y textos flotantes de palabras
  try {
    const cv = document.getElementById('game'), cr = cv.getBoundingClientRect(), sx = cr.width / VW, sy = cr.height / VH;
    const g = cv.getContext('2d');
    const plates = (typeof hudEliteNamesShown === 'function') ? enemies.filter(e => e.alive && e._plateAt) : enemies.filter(e => e.alive && e.eliteName && inView(e.x, e.y, 0));
    g.save(); g.font = "18px 'VT323', monospace";
    for (const e of plates) {
      const R = e.radius || 20, s = worldToScreen(e.x, e.y - R * 2.3 - (e.role ? 34 : 14));
      const w = g.measureText(e.eliteName).width + 10;
      const p = e._plateAt || { x: s.x, y: s.y - 14 };
      out.push({ kind: 'elite', x: cr.left + (p.x - w / 2) * sx, y: cr.top + (p.y - 9) * sy, w: w * sx, h: 32 * sy, t: e.eliteName });
    }
    g.restore();
    for (const f of floatTexts) {
      if (!f.on || f.kind !== 4) continue;
      const s = worldToScreen(f.x, f.y), size = 15 * (f.sc || 1);
      const w = String(f.text).length * size * 0.55;
      out.push({ kind: 'flotante', x: cr.left + (s.x - w / 2) * sx, y: cr.top + (s.y - 30 - size / 2) * sy, w: w * sx, h: size * sy, t: String(f.text) });
    }
  } catch (err) { out.push({ kind: 'error', x: 0, y: 0, w: 0, h: 0, t: String(err) }); }
  const cx0 = vw * 0.2, cx1 = vw * 0.8, cy0 = vh * 0.22, cy1 = vh * 0.78;
  const inCenter = r => { const mx = r.x + r.w / 2, my = r.y + r.h / 2; return mx > cx0 && mx < cx1 && my > cy0 && my < cy1; };
  const ov = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  const pairs = [];
  for (let i = 0; i < out.length; i++) for (let j = i + 1; j < out.length; j++) {
    const a = out[i], b = out[j];
    if (a.kind === 'botin' && b.kind === 'botin') continue; // una pila de avisos no se "pisa"
    const o = ov(a, b); if (o > 0.08 * Math.min(a.w * a.h, b.w * b.h)) pairs.push(`${a.kind}×${b.kind}`);
  }
  const BIG = { banner: 1, titlecard: 1, bossguide: 1, voz: 1, cronica: 1, caido: 1, botin_raro: 1 };
  const big = out.filter(r => BIG[r.kind]);
  return {
    items: out.map(r => ({ ...r, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.w), h: Math.round(r.h), center: inCenter(r) })),
    big: big.length, center: out.filter(inCenter).length, centerBig: big.filter(inCenter).length, overlaps: pairs,
    lootCenter: out.filter(r => r.kind === 'botin' && inCenter(r)).length,
  };
}

async function boot(browser) {
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await ctx.addInitScript(() => { window.__autoConfirm = true; try { localStorage.clear(); } catch (e) {} });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto(BASE + '/index.html?dev=1', { timeout: 120000 });
  for (let k = 0; k < 600; k++) { if (await page.evaluate(() => { const b = document.getElementById('title-continue-btn'); return !!b && !b.disabled; })) break; await sleep(100); }
  await page.evaluate(() => { for (const k in save.champions) { save.champions[k].level = 30; save.champions[k].unlocked = true; } save.starterChosen = true; save.tut = {}; persistNow(); document.getElementById('title-continue-btn').click(); });
  await sleep(500);
  return { ctx, page, errs };
}

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const res = {}; let allErrs = [];
  try {
    // ---- A) jefe + élite + botín + voz
    {
      const { ctx, page, errs } = await boot(browser);
      await page.evaluate(async () => {
        selectedClass = 'mago'; currentArena = 'hielo'; startRun(1);
        await new Promise(r => setTimeout(r, 1500));
        if (typeof campClose === 'function') campClose(true);
        player.hp = player.maxHp = 1e7; // que nadie se muera en la captura
        startBossFight();
        const e = spawnEnemy(enemies.length && enemies[0].type !== boss.type ? enemies[0].type : 'esqueleto', false, false) || spawnEnemy(boss.type, false, false);
        if (e) { e.rank = 'elite'; e.x = player.x + 90; e.y = player.y - 30; eliteMaybeName(e, ['fuego', 'escarcha']); e.speed = 0; e.hp = e.maxHp = 1e7; }
        const e2 = spawnEnemy(e ? e.type : boss.type, false, false);
        if (e2) { e2.rank = 'elite'; e2.x = player.x - 110; e2.y = player.y - 50; eliteMaybeName(e2, ['vampirico']); e2.speed = 0; e2.hp = e2.maxHp = 1e7; }
        for (let i = 0; i < 3; i++) { const it = materializeLoot({ tier: i < 2 ? 'comun' : 'raro' }, player.classKey, currentArena); if (it) groundLootToast(it); }
        tutSay('~prueba_voz', 'El frío te frena: movete entre los cristales y no te quedes en el hielo azul.', null, 6000, true);
        showBanner('¡ÉLITE CON NOMBRE!');
        for (let i = 0; i < 12; i++) floatText(boss.x + (i % 3) * 20, boss.y - 30, String(80 + i * 7), i % 4 ? null : 'crit', null, boss);
      });
      const r = [];
      for (const t of [150, 700, 1400, 2300, 3200]) {
        await sleep(t - (r.length ? [150, 700, 1400, 2300, 3200][r.length - 1] : 0));
        const m = await page.evaluate(collect); m.t = t; r.push(m);
        await page.screenshot({ path: path.join(OUT, `A_jefe_elite_botin_voz_${t}ms.png`) });
      }
      res.A = r; allErrs = allErrs.concat(errs);
      await ctx.close();
    }
    // ---- B) Horda Infinita: cambio de arena + ronda de jefe + sinergia + botín
    {
      const { ctx, page, errs } = await boot(browser);
      await page.evaluate(async () => {
        selectedClass = 'mago'; currentArena = 'hielo'; startRun(1);
        await new Promise(r => setTimeout(r, 1500));
        if (typeof campClose === 'function') campClose(true);
        player.hp = player.maxHp = 1e7;
        arenaTitleCard('LA CICATRIZ TE LLEVA', 'Arena Gélida', 'Ronda 10 · el jefe de la arena espera', 3600);
        showBanner('RONDA 10 — EL JEFE DE LA ARENA');
        showBanner('¡SINERGIA I: ESCARCHA VIVA! (Vos)');
        for (let i = 0; i < 2; i++) { const it = materializeLoot({ tier: 'comun' }, player.classKey, currentArena); if (it) groundLootToast(it); }
        tutSay('~prueba_voz2', 'Cada cinco rondas, un jefe. La Cicatriz no perdona a los lentos.', null, 6000, true);
      });
      const r = [];
      const T = [150, 900, 1800, 2800, 4000];
      for (let i = 0; i < T.length; i++) {
        await sleep(T[i] - (i ? T[i - 1] : 0));
        const m = await page.evaluate(collect); m.t = T[i]; r.push(m);
        await page.screenshot({ path: path.join(OUT, `B_horda_infinita_${T[i]}ms.png`) });
      }
      res.B = r; allErrs = allErrs.concat(errs);
      await ctx.close();
    }
  } finally { await browser.close(); }
  let maxBig = 0, maxCenter = 0, overlaps = 0, lootCenter = 0;
  for (const [k, list] of Object.entries(res)) for (const m of list) {
    maxBig = Math.max(maxBig, m.big); maxCenter = Math.max(maxCenter, m.centerBig); overlaps += m.overlaps.length; lootCenter += m.lootCenter;
    console.log(`${k} t=${String(m.t).padStart(4)}ms grandes=${m.big} centro=${m.centerBig} (con flotantes y botín: ${m.center}) pisadas=[${m.overlaps.join(', ')}] botinCentro=${m.lootCenter}`);
    for (const it of m.items) console.log(`     ${it.center ? '●' : '○'} ${it.kind.padEnd(10)} [${it.x},${it.y} ${it.w}x${it.h}] ${it.t}`);
  }
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(res, null, 1));
  if (allErrs.length) console.log('pageErrors', allErrs.slice(0, 5));
  console.log(`SUMMARY maxBig=${maxBig} maxCenter=${maxCenter} overlaps=${overlaps} lootCenter=${lootCenter} errors=${allErrs.length}`);
  const bad = maxCenter > 2 || overlaps > 0 || lootCenter > 0 || allErrs.length;
  process.exit(bad && !process.env.REPORT_ONLY ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
