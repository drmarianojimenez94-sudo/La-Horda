// Simulación de BOTÍN v2 con el código real del juego (rollLoot + materializeLoot + recetas + reforja).
// Mide, para un jugador que avanza por la campaña y después farmea el final:
//   - objetos por victoria y reparto por categoría en cada arena (y cuánto es "basura" común),
//   - victorias hasta: 1er legendario, 1er legendario con nombre, 1ª pieza de set de SU campeón,
//     set completo de su campeón (con reforja de repetidas), 1er Mítico (de botín o fabricado por
//     receta: 3 legendarios específicos) y 1er Único (jackpot: puede no salir nunca),
//   - presión sobre el inventario de 30 lugares.
// usage: (python3 -m http.server 8771 &) ; node tools/balance/lootsim2.js [carreras] [campeón]
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const CAREERS = +(process.argv[2] || 200), CLS = process.argv[3] || 'mago';
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await (await browser.newContext()).newPage();
  await page.addInitScript(() => { window.__campaignMode = true; });
  await page.goto(process.env.GAME_URL || 'http://127.0.0.1:8771/index.html', { waitUntil: 'load' });
  await sleep(1200);
  const res = await page.evaluate(([CAREERS, CLS]) => {
    const ARENAS = ["bosque","acuatica","fortaleza","micelial","hielo","laberinto","infernal"];
    const GR = () => { const x = Math.random(); return x < 0.12 ? "B" : (x < 0.55 ? "A" : (x < 0.9 ? "S" : "S+")); };
    const out = { perArena: {}, career: {}, cls: CLS };
    // 1) por victoria en cada arena (grado típico mezclado, 2 subjefes)
    for (const a of ARENAS) {
      let pity = {}, n = 0; const cnt = {}; const N = 20000;
      for (let i = 0; i < N; i++) { const r = rollLoot({ arena: a, grade: GR(), victory: true, subjefes: 2, owned: new Set(), pity, classKey: CLS }); pity = r.pity; for (const it of r.items) { cnt[it.tier] = (cnt[it.tier] || 0) + 1; n++; } }
      const pct = {}; for (const k in cnt) pct[k] = +(100 * cnt[k] / n).toFixed(3);
      out.perArena[a] = { itemsPerWin: +(n / N).toFixed(2), pct };
    }
    // 2) carreras: 8 victorias por arena en orden (campaña) y después farmeo de la Infernal
    const mySet = championSetOf(CLS);
    const ev = { firstLeg: [], firstNamed: [], firstMySetPiece: [], fullMySet: [], firstMythicDrop: [], firstCrafted: [], firstMythicAny: [], firstUnique: [], invFullAt: [] };
    const saveStash = save.stash;
    for (let c = 0; c < CAREERS; c++) {
      save.stash = []; save.collection = {}; let pity = {}, v = 0; const got = {};
      const seq = []; for (const a of ARENAS) for (let i = 0; i < 8; i++) seq.push(a); while (seq.length < 600) seq.push("infernal");
      for (const a of seq) {
        v++;
        const r = rollLoot({ arena: a, grade: GR(), victory: true, subjefes: 2, owned: ownedDesignIds(), pity, classKey: CLS });
        pity = r.pity;
        for (const spec of r.items) {
          const it = materializeLoot(spec, CLS, a);
          if (it.rarity === "comun" || it.rarity === "raro") continue; // basura: se vende al toque
          save.stash.push(it); collectionRegister(it, true);
          if (it.rarity === "legendario" && !got.leg) got.leg = v;
          if (it.designId && NAMED_LEGENDARIES[it.designId] && !got.named) got.named = v;
          if (it.set === mySet && !got.piece) got.piece = v;
          if (it.mythic && !got.myth) got.myth = v;
          if (it.unique && !got.uni) got.uni = v;
        }
        // reforja de repetidas del set propio
        if (mySet) { let info = setDuplicateInfo(CLS, mySet); while (info.dupes.length >= 2 && info.missing.length) { reforgeSetDuplicates(CLS, mySet); info = setDuplicateInfo(CLS, mySet); } }
        if (mySet && !got.full && setDuplicateInfo(CLS, mySet).missing.length === 0 && save.stash.some(it => it.set === mySet)) got.full = v;
        // fabricar un Mítico apenas una receta esté 3/3
        if (!got.craft) { const ready = sortedRecipes().find(p => p.ready); if (ready) { craftMythic(ready.mythicId); got.craft = v; } }
        if (!got.inv && save.stash.length >= INVENTORY_CAPACITY) got.inv = v;
        if (got.leg && got.named && got.piece && got.full && got.myth && got.craft && got.uni) break;
      }
      const cap = 600;
      ev.firstLeg.push(got.leg || cap); ev.firstNamed.push(got.named || cap); ev.firstMySetPiece.push(got.piece || cap); ev.fullMySet.push(got.full || cap);
      ev.firstMythicDrop.push(got.myth || cap); ev.firstCrafted.push(got.craft || cap); ev.firstMythicAny.push(Math.min(got.myth || cap, got.craft || cap)); ev.firstUnique.push(got.uni || cap); ev.invFullAt.push(got.inv || cap);
    }
    save.stash = saveStash;
    const q = (arr, p) => { const s = arr.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * p))]; };
    for (const k in ev) out.career[k] = { p10: q(ev[k], 0.1), median: q(ev[k], 0.5), p90: q(ev[k], 0.9), never600: +(100 * ev[k].filter(x => x >= 600).length / ev[k].length).toFixed(1) };
    return out;
  }, [CAREERS, CLS]);
  console.log(JSON.stringify(res, null, 1));
  await browser.close();
})();
