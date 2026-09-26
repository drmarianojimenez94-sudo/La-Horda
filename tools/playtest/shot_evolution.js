// Playtest visual (herramienta de desarrollo): cada habilidad de cada campeón en Nv. 1/3/5/7/10.
// Uso: (python3 -m http.server 8771 &) ; node tools/playtest/shot_evolution.js <carpeta> [campeon1,campeon2]
// Deja una captura por habilidad y nivel + report.json; las hojas armadas están en docs/playtest/evolucion/.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const out = process.argv[2]; const only = process.argv[3];
  const b = await chromium.launch({ args: ['--no-sandbox'] });
  const p = await (await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1 })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { window.__campaignMode = true; });
  await p.goto('http://127.0.0.1:8771/index.html', { waitUntil: 'load' });
  for (let k = 0; k < 300; k++) { if (await p.evaluate(() => !document.getElementById('title-continue-btn').disabled)) break; await sleep(100); }
  await sleep(800);
  const champs = await p.evaluate(() => Object.keys(CLASSES).filter(k => save.champions[k]));
  const report = {};
  for (const ck of champs) {
    if (only && !only.split(',').includes(ck)) continue;
    report[ck] = [];
    for (const slot of [0, 1, 2, 'ult']) {
      for (const lvl of [1, 3, 5, 7, 10]) {
        const info = await p.evaluate(([ck, slot, lvl]) => { loop = function(){};
          const c = save.champions[ck]; c.unlocked = true; c.level = 99;
          for (const i of [0,1,2]) c.skillMastery[i].alloc = lvl; c.ultMastery.alloc = lvl;
          selectedClass = ck; currentArena = 'laberinto'; lobbyAllies = []; startRun(4); spawnTimer = 1e12; enemies.length = 0; levelDuration = 9e9;
          for (const id of ['arena-title-card','tut-panel','center-banner','boss-intro']) { const el=document.getElementById(id); if(el) el.style.display='none'; }
          heroes.length = 1; if (typeof allies!=='undefined') allies.length = 0; // solo el campeón: sin bots que lancen lo suyo
          player.energy = 9999; player.fx = 1; player.fy = 0;
          const foes = []; for (let i = 0; i < 7; i++){ const e = spawnEnemy('esqueleto', false); e.x = player.x + 90 + (i%3)*55; e.y = player.y - 60 + Math.floor(i/3)*60; e.hp = e.maxHp = 1e7; e.speed = 0; foes.push(e); }
          // evolución Nv.10: la 3ra lanzada sale potenciada -> lanzar 2 veces antes (sin capturar)
          const sk = slot==='ult' ? CLASSES[ck].ultimate : CLASSES[ck].skills[slot];
          const step = (ms) => { let t = 0; while (t < ms) { player.hp = player.maxHp; update(16); t += 16; } };
          let err = null;
          try {
            if (lvl === 10) { for (let k = 0; k < 2; k++){ castAbility(player, sk, slot==='ult', slot==='ult' ? undefined : slot); step(900); } }
            castAbility(player, sk, slot==='ult', slot==='ult' ? undefined : slot);
          } catch (e) { err = String(e).slice(0, 120); }
          step(sk.kind && /channel|spin|beam|rain|storm|zone|field|aura/.test(sk.kind) ? 600 : 260);
          render();
          return { name: sk.name, kind: sk.kind, err };
        }, [ck, slot, lvl]);
        await p.screenshot({ path: `${out}/${ck}_${slot}_${lvl}.png`, clip: { x: 422 - 200, y: 195 - 170, width: 420, height: 300 } });
        report[ck].push(Object.assign({ slot, lvl }, info));
      }
    }
  }
  require('fs').writeFileSync(`${out}/report.json`, JSON.stringify({ report, errs }, null, 1));
  console.log('errors', errs.length, errs.slice(0, 5));
  await b.close();
})();
