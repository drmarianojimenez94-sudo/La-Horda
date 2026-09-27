// Arte del gólem del Nigromante (hoja IMG 1 / IMG 3, tools/art/nigromante_golems): para cada rama de
// la Maestría "Maestro de Gólems" invoca el gólem y comprueba que su atlas propio está cargado y es
// el que se dibuja (nunca el de otro elemento ni un respaldo), con sus estados reales: se arma,
// camina, golpea (con su efecto), muere con sus cuadros; y que el ejército se dibuja ordenado por
// profundidad con el resto de las entidades.
//   (python3 -m http.server 8771 &) ; node tools/items/t_nigro_golems.js [carpeta_capturas]
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const BASE = process.env.SE_BASE_URL || 'http://127.0.0.1:8771';
const OUT = process.argv[2];
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 400) : '')); if (!ok) fails++; };
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: 900, height: 506 } })).newPage();
  const errors = [], missing = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_CERT|fonts\.g|net::|404/.test(m.text())) errors.push('console: ' + m.text().slice(0, 300)); });
  page.on('response', r => { if (r.status() >= 400 && /nigromante\/golems?\//.test(r.url())) missing.push(r.url()); });
  await page.addInitScript(() => { window.__campaignMode = true; });
  await page.goto(`${BASE}/index.html`, { waitUntil: 'load' });
  for (let k = 0; k < 300; k++) { if (await page.evaluate(() => !document.getElementById('title-continue-btn').disabled)) break; await sleep(100); }
  for (let k = 0; k < 100; k++) { if (await page.evaluate(() => ['stone','fire','ice','storm','plague'].every(s => NIGRO_GOLEM_ATLAS[s] && NIGRO_GOLEM_ATLAS[s].ready))) break; await sleep(100); }
  const E = (fn, a) => page.evaluate(fn, a);

  // carga: un atlas por gólem, en el manifiesto y en la primera tanda (nunca se juega con el arte a medio cargar)
  const ld = await E(() => ({
    atlases: ['stone','fire','ice'].map(k => { const A = NIGRO_GOLEM_ATLAS[k]; return { k, ready: A.ready, w: A.img.naturalWidth, src: A.meta.src,
      inManifest: ASSET_MANIFEST.includes(A.meta.src), deferred: LAZY_IMG.isDeferred(A.meta.src),
      inBounds: A.meta.frames.every(f => f[0] >= 0 && f[1] >= 0 && f[0] + f[2] <= A.img.naturalWidth && f[1] + f[3] <= A.img.naturalHeight),
      setsOk: Object.values(A.meta.sets).every(arr => arr.length && arr.every(i => i >= 0 && i < A.meta.frames.length)) }; }),
    tinted: ['storm','plague'].map(k => ({ k, ready: NIGRO_GOLEM_ATLAS[k].ready, canvas: NIGRO_GOLEM_ATLAS[k].img instanceof HTMLCanvasElement, sameMeta: NIGRO_GOLEM_ATLAS[k].meta === NIGRO_GOLEM_ATLAS.stone.meta })),
    stoneSets: Object.keys(NIGRO_GOLEM_META.stone.sets), fireSets: Object.keys(NIGRO_GOLEM_META.fire.sets), iceSets: Object.keys(NIGRO_GOLEM_META.ice.sets),
    oldImgsGone: !('stone' in NIGRO_GOLEM_IMG) && !('fire' in NIGRO_GOLEM_IMG) && !('ice' in NIGRO_GOLEM_IMG)
  }));
  for (const a of ld.atlases) check(`NGOL.atlas_${a.k}_cargado_y_registrado`, a.ready && a.w > 0 && a.inManifest && !a.deferred && a.inBounds && a.setsOk, a);
  for (const t of ld.tinted) check(`NGOL.${t.k}_usa_la_piedra_recoloreada`, t.ready && t.canvas && t.sameMeta, t);
  check('NGOL.piedra_tiene_4_direcciones_caminata_golpe_escombros_e_impacto',
    ['idle_down','idle_side','idle_up','walk_side','walk_down','walk_up','atk','rise','death','fx_slam'].every(k => ld.stoneSets.includes(k)), ld.stoneSets);
  check('NGOL.fuego_y_hielo_tienen_idle_caminata_ataque_y_muerte',
    ['idle','walk','atk','death','fx_stream'].every(k => ld.fireSets.includes(k)) && ['idle','walk','atk','death','fx_bolt','fx_burst'].every(k => ld.iceSets.includes(k)), { f: ld.fireSets, i: ld.iceSets });
  check('NGOL.sin_el_arte_viejo_del_golem', ld.oldImgsGone, ld.oldImgsGone);

  await E(() => { loop = function(){};
    window.__setEl = (id) => { const c = save.champions.nigromante; c.unlocked = true; c.level = 100; const st = c.talents; st.mastery = 'golem'; st.masteryNodes = id ? {[id]:1} : {}; };
    window.__start = () => { selectedClass = 'nigromante'; currentArena = 'bosque'; lobbyAllies = ['tanque','guerrero','soporte']; startRun(3); spawnTimer = 1e12; enemies.length = 0; levelDuration = 9e9; updateAllies = function(){}; };
    window.__step = (ms) => { let t = 0; while (t < ms && state === 'playing') { for (const h of heroes) h.hp = h.maxHp; update(16); t += 16; } };
    // qué imagen y qué cuadro se usa al dibujar el gólem
    window.__spy = () => { const log = []; const orig = drawAnimFrameSized;
      drawAnimFrameSized = function(img, clip){ log.push({ img, f: clip.frames[0] }); return orig.apply(this, arguments); };
      return { log, stop(){ drawAnimFrameSized = orig; } }; };
    window.__frameOf = (A, f) => A.meta.frames.findIndex(q => q[0] === f.x && q[1] === f.y && q[2] === f.w && q[3] === f.h);
  });
  const ids = { stone: null, fire: 'ng_m_gol_fuego', ice: 'ng_m_gol_hielo', storm: 'ng_m_gol_tormenta', plague: 'ng_m_gol_plaga' };
  for (const [skin, id] of Object.entries(ids)) {
    const r = await E(([skin, id]) => { __setEl(id); __start();
      spawnOrRenewGolem(player); const g = player.golem; g.x = player.x + 60; g.y = player.y;
      const A = NIGRO_GOLEM_ATLAS[skin], S = A.meta.sets;
      const drawn = (fn) => { const sp = __spy(); try { fn(); } finally { sp.stop(); } return sp.log.filter(l => l.img === A.img).map(l => __frameOf(A, l.f)); };
      const other = (fn) => { const sp = __spy(); try { fn(); } finally { sp.stop(); } return sp.log.filter(l => l.img !== A.img && Object.values(NIGRO_GOLEM_ATLAS).some(o => o.img === l.img)).length; };
      const rise = nigroGolemRiseSet(A);
      const riseF = drawn(() => drawGolemReal(g));
      __step(900); g.target = null; g.moving = false;
      const idleF = drawn(() => drawGolemReal(g));
      g.moving = true; g.fx = 1; g.fy = 0.05; g._pdir = 'side';
      const walkF = drawn(() => drawGolemReal(g));
      const wrong = other(() => drawGolemReal(g));
      g.moving = false; g.attackAnim = 320; g.target = { x: g.x + 50, y: g.y, alive: true };
      const fx0 = nigroGolemFx.length;
      const atkF = drawn(() => drawGolemReal(g));
      const fxKinds = nigroGolemFx.slice(fx0).map(f => f.kind);
      // el render real lo dibuja dentro del orden por profundidad (sin errores)
      let renderOk = true; try { render(); } catch (e) { renderOk = String(e); }
      // muere: se deshace con sus cuadros
      const x = g.x, y = g.y; killNigroGolem(player);
      const rem = nigroGolemRemains[nigroGolemRemains.length - 1];
      const deathF = rem && rem.kind === 'golem' && rem.A === A ? drawn(() => drawNigroRemains(rem)) : [];
      return { skin: g.skin, want: skin, riseF, rise, idleF, walkF, atkF, deathF, fxKinds, wrong, renderOk, dead: player.golem === null,
        idleSet: S.idle || [].concat(S.idle_down, S.idle_side, S.idle_up), walkSet: S.walk_side || S.walk, atkSet: S.atk, deathSet: S.death };
    }, [skin, id]);
    const inSet = (fs, set) => fs.length > 0 && fs.every(i => set.includes(i));
    check(`NGOL.${skin}_elige_su_gólem`, r.skin === skin, { skin: r.skin });
    check(`NGOL.${skin}_se_arma_al_aparecer`, inSet(r.riseF, r.rise), { f: r.riseF, set: r.rise });
    check(`NGOL.${skin}_quieto_con_su_atlas`, inSet(r.idleF, r.idleSet), { f: r.idleF, set: r.idleSet });
    check(`NGOL.${skin}_camina_con_su_atlas`, inSet(r.walkF, r.walkSet), { f: r.walkF, set: r.walkSet });
    check(`NGOL.${skin}_nunca_dibuja_otro_gólem`, r.wrong === 0, r.wrong);
    check(`NGOL.${skin}_golpea_con_su_pose_y_su_efecto`, inSet(r.atkF, r.atkSet) && r.fxKinds.length > 0, { f: r.atkF, fx: r.fxKinds });
    check(`NGOL.${skin}_muere_con_sus_cuadros`, r.dead && inSet(r.deathF, r.deathSet), { f: r.deathF, set: r.deathSet });
    check(`NGOL.${skin}_render_sin_errores`, r.renderOk === true, r.renderOk);
    if (OUT) { await E(() => { spawnOrRenewGolem(player); player.golem.x = player.x + 60; __step(900); render(); }); await page.screenshot({ path: `${OUT}/golem_${skin}.png` }); }
  }

  // ejército: gólem y esqueletos entran al orden por profundidad (antes se dibujaban encima de todo)
  const ord = await E(() => { __setEl(null); __start(); spawnOrRenewGolem(player); const g = player.golem; g.x = player.x + 60; g.y = player.y;
    const f = talentSkillMods('nigromante', 0).flags; spawnNigroSkeleton(player, 'warrior', f); const sk = player.skeletons[0]; sk.x = player.x - 40; sk.y = player.y + 30;
    const e = spawnEnemy('zombie', false); e.x = g.x + 10; e.y = g.y + 40; e.speed = 0; __step(400);
    const seq = []; const oG = drawGolemReal, oS = drawSkeletonMinion, oE = drawEnemy;
    drawGolemReal = function(o){ seq.push('golem'); return oG.apply(this, arguments); };
    drawSkeletonMinion = function(o){ seq.push('skel'); return oS.apply(this, arguments); };
    drawEnemy = function(o){ if (o === e) seq.push('foe'); return oE.apply(this, arguments); };
    try { render(); } finally { drawGolemReal = oG; drawSkeletonMinion = oS; drawEnemy = oE; }
    // esqueleto que cae: queda un resto que se hunde
    const n0 = nigroGolemRemains.length; killNigroSkeleton(sk);
    return { seq, skelRemains: nigroGolemRemains.length > n0 && nigroGolemRemains[nigroGolemRemains.length - 1].kind === 'skel' }; });
  check('NGOL.el_golem_se_ordena_por_profundidad_con_los_enemigos', ord.seq.indexOf('golem') >= 0 && ord.seq.indexOf('golem') < ord.seq.indexOf('foe'), ord.seq);
  check('NGOL.el_esqueleto_se_dibuja_en_el_orden', ord.seq.includes('skel'), ord.seq);
  check('NGOL.el_esqueleto_que_cae_se_desarma', ord.skelRemains, ord);
  check('NGOL.sin_404_del_arte', missing.length === 0, missing);
  check('NGOL.sin_errores', errors.length === 0, errors);
  await browser.close();
  console.log(fails ? `${fails} FALLAS` : 'OK');
  process.exit(fails ? 1 : 0);
})();
