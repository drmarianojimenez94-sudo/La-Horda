// Pruebas de las SINERGIAS DE BUILDS (reseña del crítico §6.4 #4):
//   1) SINERGIAS al estilo Diablo II (TALENT_SYNERGIES en js/data/talent-trees.js): por cada guardián y
//      cada sinergia se lanza la habilidad con los nodos fuente al máximo, SIN y CON la sinergia (misma
//      escena, mismo azar), y se mide que cambie de verdad: daño, curación, escudo o duración. El
//      modificador por habilidad sube exactamente per × puntos. Tooltips: nodo, panel de Habilidades y
//      botón del HUD dicen "Sinergia(s)" con el valor actual.
//   2) RESPEC POR ORO: el primero gratis, después cuesta según el nivel (y crece), pide confirmación,
//      devuelve todos los puntos (nunca se pierden), no se puede en partida ni sin oro.
//   3) SET DE 2 PIEZAS QUE TRANSFORMA UNA HABILIDAD (CHAMPION_SET_TRANSFORMS en js/data/champion-sets.js):
//      por cada uno de los 12 sets, con 2 piezas la habilidad hace algo medible que con 1 pieza (o sin la
//      transformación) no hace; la ficha del set lo cuenta.
//   4) COOPERATIVO: el anfitrión simula al invitado con SU loadout (talentos y equipo): la sinergia y la
//      transformación son del invitado, no del anfitrión.
//   (python3 -m http.server 8842 &) ; SE_BASE_URL=http://127.0.0.1:8842 node tools/items/t_synergies.js
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const BASE = process.env.SE_BASE_URL || 'http://127.0.0.1:8822';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 500) : '')); if (!ok) fails++; };
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: 900, height: 506 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_CERT|fonts\.g|net::|404/.test(m.text())) errors.push('console: ' + m.text().slice(0, 300)); });
  await page.addInitScript(() => { window.__campaignMode = true; });
  await page.goto(`${BASE}/index.html`, { waitUntil: 'load' });
  for (let k = 0; k < 300; k++) { if (await page.evaluate(() => !document.getElementById('title-continue-btn').disabled)) break; await sleep(100); }
  const E = (fn, a) => page.evaluate(fn, a);
  await E(() => { loop = function(){};
    const _rand = Math.random;
    window.__seed = (s) => { let a = s >>> 0; Math.random = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
    window.__unseed = () => { Math.random = _rand; };
    window.__start = (lv, arena, cls, allies) => { for (const k of Object.keys(save.champions)) save.champions[k].unlocked = true; save.stash = []; for (const k in save.champions) save.champions[k].equipment = mkEquipment();
      selectedClass = cls || 'guerrero'; currentArena = arena || 'bosque'; lobbyAllies = allies || ['tanque','soporte','mago']; startRun(lv || 5); spawnTimer = 1e12; enemies.length = 0; levelDuration = 9e9; invalidatePassiveCache(); updateAllies = function(){}; };
    window.__dummy = (dx, dy) => { const e = spawnEnemy('duende_bosque', false); e.x = player.x + dx; e.y = player.y + dy; e.atkCd = 1e9; e.hp = e.maxHp = 1e6; e.speed = 0; e.baseSpeed = 0; return e; };
    window.__lvl = (cls, n) => { const c = save.champions[cls]; for (const m of c.skillMastery) m.alloc = n; c.ultMastery.alloc = n; };
    window.__scene = (cls, pieces) => {
      __lvl(cls, 3); save.champions[cls].level = 40;
      __start(6, 'bosque', cls, cls === 'soporte' ? ['tanque','mago','guerrero'] : ['soporte','tanque','mago']);
      if (pieces){ setPieceIds(championSetOf(cls)).slice(0, pieces).forEach(p => { const it = makeDesignedItem(p); stashItems().push(it); equipItem(cls, it.uid); }); invalidatePassiveCache(); }
      runStats.critChance = 0; champFx.length = 0; projectiles.length = 0;
      for (const h of heroes){ h.speed = 0; h.baseSpeed = 0; h.energy = h.maxEnergy = 9999; h.boons = {}; if (h !== player){ h.x = player.x + (h === heroes[1] ? -60 : 40); h.y = player.y + (h === heroes[2] ? 60 : -50); h.hp = h.maxHp*0.5; } }
      player.hp = player.maxHp*0.5; player.fx = 1; player.fy = 0;
      const pos = [[70,0],[120,10],[170,-10],[230,5],[60,70],[-70,40],[-60,-60],[20,-110],[300,0]];
      return pos.map(([x,y]) => __dummy(x, y));
    };
    // Los muñecos no se regeneran (algunas arenas curan a la horda): así la vida perdida es el daño real.
    const _am = arenaMods, _amCopy = new WeakMap();
    arenaMods = function(){ const m = _am.apply(this, arguments); if (!m || typeof m !== 'object') return m; let c = _amCopy.get(m); if (!c){ c = Object.assign({}, m, { enemyRegenPct: 0 }); _amCopy.set(m, c); } return c; };
    const timerSum = () => heroes.reduce((s,h) => s + Object.keys(h).filter(k => /Timer$/.test(k) && typeof h[k] === 'number' && h[k] > 0).reduce((a,k) => a + h[k], 0), 0);
    // Lanza la habilidad `skill` del jugador en la escena y mide lo que hizo (daño, curación, escudo, zonas, atracción, duraciones).
    window.__cast = (cls, skill, pieces, win) => {
      __seed(1234);
      const foes = __scene(cls, pieces);
      const hp0 = heroes.map(h => h.hp), d0 = foes.reduce((s,e)=>s+Math.hypot(e.x-player.x, e.y-player.y), 0);
      const dmg0 = player.stats ? player.stats.dmgDealt : 0;
      const sk = skill === 'ult' ? player.cls.ultimate : player.cls.skills[skill];
      const t0 = timerSum();
      player.aim = {x: player.x + 150, y: player.y, dx: 1, dy: 0};
      try { castAbility(player, sk, skill === 'ult', skill === 'ult' ? undefined : skill); } finally { player.aim = null; }
      const dur = timerSum() - t0;
      const zones = champFx.filter(f => f.type === 'boonZone').length;
      const zoneOwner = (champFx.find(f => f.type === 'boonZone') || {}).owner === player;
      const shield = heroes.reduce((s,h)=>s+(h.shield||0), 0);
      const dist = foes.reduce((s,e)=>s+Math.hypot(e.x-player.x, e.y-player.y), 0);
      let t = 0; const W = win || 2600; while (t < W && state === 'playing'){ for (const h of heroes) h.energy = h.maxEnergy; update(16); t += 16; }
      const heal = heroes.reduce((s,h,i)=>s+(h.hp-hp0[i]), 0);
      __unseed();
      // daño = vida que perdieron los muñecos (incluye los estados de daño en el tiempo, como la maldición de la Plaga)
      return { dmg: Math.round(foes.reduce((s,e)=>s+(e.maxHp-Math.max(0,e.hp)), 0)), statDmg: Math.round((player.stats ? player.stats.dmgDealt : 0) - dmg0), heal: Math.round(heal), shield: Math.round(shield), dur: Math.round(dur), zones, zoneOwner, pull: Math.round(d0 - dist), hits: foes.filter(e=>e.lastHitBy===player).length };
    };
    // Sinergia: nodos fuente al máximo; `on` false = misma build pero sin la tabla de sinergias (control).
    window.__synMeasure = (cls, i, on) => {
      const syn = TALENT_SYNERGIES[cls][i], c = save.champions[cls];
      c.talents = mkTalentState(); for (const id of syn.from) c.talents.nodes[id] = talentNodeById(cls, id).maxRank;
      const keep = TALENT_SYNERGIES[cls]; if (!on) TALENT_SYNERGIES[cls] = [];
      delete TALENT_MODS_CACHE[cls];
      try {
        const mods = talentSkillMods(cls, syn.skill)[syn.key];
        const r = __cast(cls, syn.skill, 0, syn.skill === 'ult' ? 5400 : 2600);
        r.mod = mods; return r;
      } finally { TALENT_SYNERGIES[cls] = keep; delete TALENT_MODS_CACHE[cls]; c.talents = mkTalentState(); }
    };
  });

  // ---------------- 1) SINERGIAS ----------------
  const data = await E(() => { const out = {}; for (const k of Object.keys(CLASSES)){ const L = TALENT_SYNERGIES[k] || [];
      out[k] = { n: L.length, nodesOk: L.every(s => s.from.every(id => !!talentNodeById(k, id))), skillOk: L.every(s => s.skill === 'ult' || !!CLASSES[k].skills[s.skill]),
        textOk: L.every(s => { const t = talentSynergyText(k, s); return /^\+\d/.test(t) && /por punto en/.test(t) && !/undefined|NaN|\?/.test(t); }),
        crossOk: L.every(s => s.from.some(id => { const n = talentNodeById(k, id); return !(n.mods(1)||[]).some(m => m.targetSkill === s.skill && m.key === s.key); })) }; }
    return out; });
  const bad = Object.entries(data).filter(([k,v]) => v.n < 2 || v.n > 4 || !v.nodesOk || !v.skillOk || !v.textOk || !v.crossOk);
  check('SINERGIAS.12_guardianes_con_2_a_4', Object.keys(data).length === 12 && !bad.length, bad.length ? bad : Object.fromEntries(Object.entries(data).map(([k,v])=>[k,v.n])));

  const synList = await E(() => Object.keys(TALENT_SYNERGIES).flatMap(k => TALENT_SYNERGIES[k].map((s,i) => ({ k, i, skill: s.skill, key: s.key, per: s.per, test: s.test, pts: s.from.reduce((a,id)=>a+talentNodeById(k,id).maxRank,0), txt: talentSynergyText(k, s, false) }))));
  const byChamp = {};
  for (const s of synList){
    const res = await E(([s]) => { try { return { a: __synMeasure(s.k, s.i, false), z: __synMeasure(s.k, s.i, true) }; } catch (err) { return { err: err.message + ' ' + (err.stack||'').split('\n')[1] }; } }, [s]);
    if (res.err){ check(`SINERGIA.${s.k}.${s.i}`, false, res); continue; }
    const { a, z } = res, expect = s.per * s.pts;
    const modOk = Math.abs((z.mod - a.mod) - expect) < 1e-6;
    let ok;
    switch (s.test){
      case 'dmg': ok = z.dmg > a.dmg*1.04 && a.dmg > 0; break;
      case 'heal': ok = z.heal > a.heal && a.heal > 0; break;
      case 'shield': ok = z.shield > a.shield && a.shield > 0; break;
      case 'dur': ok = z.dur > a.dur*1.03 && a.dur > 0; break;
    }
    (byChamp[s.k] = byChamp[s.k] || []).push(ok && modOk);
    const ratio = s.test === 'dmg' ? +(z.dmg/Math.max(1,a.dmg)).toFixed(3) : s.test === 'dur' ? +(z.dur/Math.max(1,a.dur)).toFixed(3) : s.test === 'heal' ? +(z.heal/Math.max(1,a.heal)).toFixed(3) : +(z.shield/Math.max(1,a.shield)).toFixed(3);
    check(`SINERGIA.${s.k}.${s.i} ${s.txt} [${s.test}] ×${ratio}`, ok && modOk, { mod: +(z.mod - a.mod).toFixed(3), expect: +expect.toFixed(3), sin: a[s.test], con: z[s.test] });
  }
  check('SINERGIA.todos_los_guardianes_medidos', Object.keys(byChamp).length === 12 && Object.values(byChamp).every(v => v.every(Boolean)), Object.fromEntries(Object.entries(byChamp).map(([k,v])=>[k, v.filter(Boolean).length+'/'+v.length])));

  // Tooltips: nodo del árbol, panel de Habilidades y botón del HUD, con el valor actual
  const tips = await E(() => {
    const k = 'mago', c = save.champions[k]; c.level = 30; c.talents = mkTalentState(); c.talents.nodes = { mg_tem_c1: 3, mg_tem_c2: 2 }; delete TALENT_MODS_CACHE[k];
    const d = document.createElement('div'); document.body.appendChild(d);
    renderTalentTree(d, k, () => {});
    const node = d.querySelector('[data-node="mg_tem_c1"]');
    const out = { nodeLine: (node.querySelector('.tt-syn')||{}).textContent || '', nodeTitle: node.getAttribute('title') || '',
      summary: (d.querySelector('.tt-synergies')||{}).textContent || '', respecBtn: !!d.querySelector('.tt-respec-btn') };
    renderSkillsPanel(d, k, () => {});
    out.skill = [...d.querySelectorAll('.mastery-syn')].map(x => x.textContent).join(' | ');
    d.remove();
    selectedClass = k; updateAbilityButtons();
    out.hud = document.getElementById('btn-s2').title;
    c.talents = mkTalentState(); delete TALENT_MODS_CACHE[k];
    return out; });
  check('TOOLTIP.nodo_dice_sinergia_con_valor_actual', /Sinergia: cada punto da \+6% daño a Nova de Escarcha \(ahora \+30%\)/.test(tips.nodeLine) && /Sinergias:/.test(tips.nodeTitle), tips);
  check('TOOLTIP.resumen_de_sinergias_en_el_arbol', /Nova de Escarcha por punto en Voltaje y Conductividad \(ahora \+30%\)/.test(tips.summary) && tips.respecBtn, tips.summary.slice(0, 200));
  check('TOOLTIP.habilidad_panel_y_hud', /Sinergias: \+6% daño por punto en Voltaje y Conductividad \(ahora \+30%\)/.test(tips.skill) && /Sinergias: \+6% daño/.test(tips.hud) && /ahora \+30%/.test(tips.hud), { skill: tips.skill.slice(0, 200), hud: tips.hud.slice(0, 300) });

  // ---------------- 2) RESPEC POR ORO ----------------
  const rs = await E(() => {
    state = 'prep'; heroes.length = 0;
    const k = 'segador', c = save.champions[k]; c.level = 20; c.talents = mkTalentState(); c.talentRespecs = 0; c.treeBonus = 2; save.gold = 5000;
    const tree = talentTreeFor(k), roots = tree.nodes.filter(n => !n.requires);
    const total0 = treePointsAvailable(k);
    for (const r of roots) for (let i = 0; i < 3; i++) buyTalentNode(k, r.id, true);
    const spent = treePointsSpent(k), avail1 = treePointsAvailable(k);
    const out = { total0, spent, avail1, cost1: talentRespecCost(k) };
    const ask = talentRespec(k, false); out.ask = ask;
    out.stillSpent = treePointsSpent(k); // pedir confirmación no toca nada
    const r1 = talentRespec(k, true); out.r1 = r1; out.after1 = { avail: treePointsAvailable(k), spent: treePointsSpent(k), gold: save.gold };
    out.empty = talentRespecLockReason(k);
    for (const r of roots) buyTalentNode(k, r.id, true);
    out.cost2 = talentRespecCost(k); const g2 = save.gold; const r2 = talentRespec(k, true); out.paid2 = g2 - save.gold; out.after2 = treePointsAvailable(k);
    buyTalentNode(k, roots[0].id, true); out.cost3 = talentRespecCost(k);
    c.level = 40; out.cost3lv40 = talentRespecCost(k); c.level = 20;
    save.gold = 10; out.poor = talentRespecLockReason(k); out.poorTry = talentRespec(k, true).ok;
    save.gold = 99999; state = 'playing'; out.inRun = talentRespecLockReason(k); state = 'prep';
    // UI: botón + confirmación real (diálogo del juego)
    const d = document.createElement('div'); document.body.appendChild(d);
    const draw = () => renderTalentTree(d, k, draw); draw();
    out.uiText = (d.querySelector('.tt-respec')||{}).textContent || '';
    d.querySelector('.tt-respec-btn').click();
    out.dialog = (document.querySelector('#game-dialog .gd-msg')||{}).textContent || '';
    // el diálogo ignora el toque de los primeros 250 ms (no se contesta con el mismo toque que lo abrió)
    return new Promise(res => setTimeout(() => { const okBtn = document.querySelector('#game-dialog .gd-ok'); if (okBtn) okBtn.click(); setTimeout(() => { out.uiAfter = { spent: treePointsSpent(k), respecs: c.talentRespecs, rootsLabel: (d.querySelector('.tt-respec')||{}).textContent || '' }; d.remove();
      out.persisted = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}').champions ? true : false;
      c.talents = mkTalentState(); c.treeBonus = 0; res(out); }, 200); }, 350));
  });
  check('RESPEC.primero_gratis_con_confirmacion', rs.cost1 === 0 && rs.ask.needsConfirm && rs.ask.refund === rs.spent && rs.stillSpent === rs.spent && rs.r1.ok && rs.after1.gold === 5000, rs);
  check('RESPEC.nunca_se_pierden_puntos', rs.after1.avail === rs.total0 && rs.after1.spent === 0 && rs.r1.lost === 0 && rs.after2 === rs.total0, { total0: rs.total0, after1: rs.after1, after2: rs.after2 });
  check('RESPEC.costo_por_nivel_y_creciente', rs.cost2 > 0 && rs.paid2 === rs.cost2 && rs.cost3 > rs.cost2 && rs.cost3lv40 > rs.cost3, { cost2: rs.cost2, cost3: rs.cost3, lv40: rs.cost3lv40 });
  check('RESPEC.bloqueos_sin_oro_sin_puntos_en_partida', /Oro insuficiente/.test(rs.poor||'') && !rs.poorTry && /durante una partida/.test(rs.inRun||'') && /No hay puntos/.test(rs.empty||''), { poor: rs.poor, inRun: rs.inRun, empty: rs.empty });
  check('RESPEC.ui_boton_y_confirmacion', /Reiniciar/.test(rs.uiText) && /reiniciar el árbol/.test(rs.dialog) && rs.uiAfter.spent === 0, { ui: rs.uiText.slice(0, 120), dialog: rs.dialog.slice(0, 160), after: rs.uiAfter });

  // ---------------- 3) SET DE 2 PIEZAS QUE TRANSFORMA ----------------
  const sets = await E(() => Object.keys(CHAMPION_SET_TRANSFORMS).map(id => ({ id, cls: SET_DB[id].champion, skill: CHAMPION_SET_TRANSFORMS[id].skill, test: CHAMPION_SET_TRANSFORMS[id].test,
    desc: SET_DB[id].thresholds.find(t=>t.count===2).desc, sheet: /TRANSFORMA/.test(setDetailHTML(SET_DB[id].champion, id)) && /TRANSFORMA/.test(codexSetHtml(id)) })));
  check('SET2.los_12_sets_de_guardian', sets.length === 12 && new Set(sets.map(s=>s.cls)).size === 12, sets.map(s=>s.id));
  const setOk = [];
  for (const s of sets){
    const res = await E(([s]) => { try {
      const T = CHAMPION_SET_TRANSFORMS[s.id], win = s.skill === 'ult' ? 3000 : 2600;
      const one = __cast(s.cls, s.skill, 1, win);
      const two = __cast(s.cls, s.skill, 2, win);
      delete CHAMPION_SET_TRANSFORMS[s.id]; delete _CHAMP_SET_TRANSFORM_BOON[s.id];
      let off; try { off = __cast(s.cls, s.skill, 2, win); } finally { CHAMPION_SET_TRANSFORMS[s.id] = T; }
      return { one, two, off }; } catch (err) { return { err: err.message + ' ' + (err.stack||'').split('\n')[1] }; } }, [s]);
    if (res.err){ check(`SET2.${s.id}`, false, res); setOk.push(false); continue; }
    const { one, two, off } = res; let ok;
    switch (s.test){
      case 'zone': ok = two.zones > 0 && one.zones === 0 && off.zones === 0 && two.zoneOwner; break;
      case 'heal': ok = two.heal > off.heal && two.heal > one.heal && two.zones > 0; break;
      case 'dmg': ok = two.dmg > off.dmg*1.05 && two.dmg > one.dmg; break;
      case 'pull': ok = two.pull > off.pull + 20 && two.pull > one.pull + 20; break;
    }
    ok = ok && s.sheet;
    setOk.push(ok);
    check(`SET2.${s.id} (${s.cls}, ${s.test})`, ok, { una: one[s.test==='zone'?'zones':s.test], dos: two[s.test==='zone'?'zones':s.test], sinTransformar: off[s.test==='zone'?'zones':s.test], ficha: s.sheet, desc: s.desc.slice(0, 140) });
  }
  check('SET2.todos_transforman', setOk.length === 12 && setOk.every(Boolean), setOk.filter(Boolean).length + '/12');

  // HUD: el botón de la habilidad transformada lo cuenta (marca verde y texto del set)
  const hud = await E(() => { __scene('mago', 2); selectedClass = 'mago'; updateAbilityButtons(); const b = document.getElementById('btn-s3');
    return { title: b.title, pip: !!b.querySelector('.boon-pip') }; });
  check('SET2.hud_tooltip_y_marca', /◆ Esfera de Tormenta \(set, 2 piezas\)/.test(hud.title) && hud.pip, hud.title.slice(0, 300));

  // ---------------- 4) COOPERATIVO: el loadout del invitado ----------------
  const coop = await E(() => {
    // anfitrión con Guerrero sin nada; el invitado juega Mago y trae sus talentos y 2 piezas de su set
    const out = {};
    __scene('guerrero'); const foesRef = enemies.slice();
    const ally = heroes.find(h => h.classKey === 'mago');
    const guestItems = setPieceIds('convergencia').slice(0, 2).map(p => makeDesignedItem(p));
    const eq = mkEquipment(); guestItems.forEach(it => { eq[it.type] = it.uid; });
    const L = { champ: 'mago', level: 30, xp: 0, talentPoints: 0, skillMastery: [{alloc:3},{alloc:3},{alloc:3}], ultMastery: {alloc:3},
      talents: { nodes: { mg_tem_c1: 3, mg_tem_c2: 3 }, picks: {}, mastery: null, masteryNodes: {} }, equipment: eq, items: guestItems };
    const backup = save.champions.mago;
    save.champions.mago = netLoadoutRecord(L); delete TALENT_MODS_CACHE.mago; invalidatePassiveCache();
    try {
      out.guestNova = talentSkillMods('mago', 1).powerMult; out.hostNova = talentSkillMods('guerrero', 1).powerMult;
      out.guestSet = setN(ally, 'convergencia'); out.hostSet = setN(player, 'convergencia');
      champFx.length = 0; ally.x = foesRef[1].x - 40; ally.y = foesRef[1].y; ally.fx = 1; ally.fy = 0;
      castAbility(ally, ally.cls.skills[2], false, 2);
      const z = champFx.filter(f => f.type === 'boonZone'); out.zones = z.length; out.owner = !!z.length && z.every(f => f.owner === ally);
      // el anfitrión no hereda nada del invitado
      champFx.length = 0; castAbility(player, player.cls.skills[2], false, 2); out.hostZones = champFx.filter(f => f.type === 'boonZone').length;
    } finally { save.champions.mago = backup; delete TALENT_MODS_CACHE.mago; invalidatePassiveCache(); }
    return out; });
  check('COOP.sinergia_del_invitado_es_suya', Math.abs(coop.guestNova - 0.36) < 1e-6 && coop.hostNova === 0, coop);
  check('COOP.set_de_2_del_invitado_transforma_su_habilidad', coop.guestSet === 2 && coop.hostSet === 0 && coop.zones === 1 && coop.owner && coop.hostZones === 0, coop);

  // El loadout que manda el invitado lleva lo que hace falta (talentos + equipo + objetos equipados)
  const lo = await E(() => { const k = 'mago', c = save.champions[k]; selectedClass = k; __start(6, 'bosque', k);
    const its = setPieceIds('convergencia').slice(0, 2).map(p => { const it = makeDesignedItem(p); stashItems().push(it); equipItem(k, it.uid); return it; });
    c.talents = mkTalentState(); c.talents.nodes = { mg_tem_c1: 2 };
    const L = netBuildLoadout(); const rec = netLoadoutRecord(JSON.parse(JSON.stringify(L)));
    const out = { nodes: rec.talents.nodes, items: rec.loadoutItems.length, eq: Object.values(rec.equipment).filter(Boolean).length };
    c.talents = mkTalentState(); return out; });
  check('COOP.loadout_viaja_con_talentos_y_set', lo.nodes.mg_tem_c1 === 2 && lo.items === 2 && lo.eq === 2, lo);

  check('SIN_ERRORES', errors.length === 0, errors.slice(0, 5));
  console.log(`SUMMARY ${fails === 0 ? 'OK' : 'FAIL'} fails=${fails}`);
  await browser.close();
  process.exit(fails ? 1 : 0);
})();
