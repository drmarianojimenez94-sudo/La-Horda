// Pruebas de los REFUERZOS DE HABILIDAD (js/data/boons.js + js/systems/boons.js) y de los
// TALENT GATE (árbol desde el nivel 40 con su propia bolsa, js/systems/talents.js).
//   Por cada guardián y cada refuerzo (también los dúos): se lanza la habilidad SIN y CON el
//   refuerzo, en la misma escena (muñecos quietos alrededor), y se mide que transforme algo
//   medible (daño, enemigos alcanzados, estado aplicado, zona en el piso, escudo, curación,
//   atracción). Además: oferta de cartas (1-2 refuerzos en campaña, 1 en la Horda Infinita, el dúo
//   primero), rareza, aplicación a otro héroe (como el anfitrión con el invitado), tooltip del
//   botón, y la migración de talentos de un guardado viejo.
//   (python3 -m http.server 8822 &) ; SE_BASE_URL=http://127.0.0.1:8822 node tools/items/t_boons.js
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const BASE = process.env.SE_BASE_URL || 'http://127.0.0.1:8822';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 500) : '')); if (!ok) fails++; };
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || chromium.executablePath(), args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: 900, height: 506 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_CERT|fonts\.g|net::|404/.test(m.text())) errors.push('console: ' + m.text().slice(0, 300)); });
  await page.addInitScript(() => { window.__campaignMode = true; });
  await page.goto(`${BASE}/index.html`, { waitUntil: 'load' });
  for (let k = 0; k < 300; k++) { if (await page.evaluate(() => !document.getElementById('title-continue-btn').disabled)) break; await sleep(100); }
  const E = (fn, a) => page.evaluate(fn, a);
  await E(() => { loop = function(){};
    window.__start = (lv, arena, cls, allies) => { for (const k of Object.keys(save.champions)) save.champions[k].unlocked = true; save.stash = []; for (const k in save.champions) save.champions[k].equipment = mkEquipment();
      selectedClass = cls || 'guerrero'; currentArena = arena || 'bosque'; lobbyAllies = allies || ['tanque','soporte','mago']; startRun(lv || 5); spawnTimer = 1e12; enemies.length = 0; levelDuration = 9e9; invalidatePassiveCache(); updateAllies = function(){}; };
    window.__dummy = (dx, dy) => { const e = spawnEnemy('duende_bosque', false); e.x = player.x + dx; e.y = player.y + dy; e.atkCd = 1e9; e.hp = e.maxHp = 1e6; e.speed = 0; e.baseSpeed = 0; return e; };
    window.__lvl = (cls, n) => { const c = save.champions[cls]; for (const m of c.skillMastery) m.alloc = n; c.ultMastery.alloc = n; };
    // Escena fija: 9 muñecos (adelante en fila, alrededor cerca y lejos), aliados al lado, mira a la derecha.
    window.__scene = (cls) => {
      __lvl(cls, 3); __start(6, 'bosque', cls, cls === 'soporte' ? ['tanque','mago','guerrero'] : ['soporte','tanque','mago']);
      runStats.critChance = 0; champFx.length = 0; projectiles.length = 0;
      for (const h of heroes){ h.speed = 0; h.baseSpeed = 0; h.energy = h.maxEnergy = 9999; if (h !== player){ h.x = player.x + (h === heroes[1] ? -60 : 40); h.y = player.y + (h === heroes[2] ? 60 : -50); h.hp = h.maxHp*0.5; } }
      player.hp = player.maxHp*0.5; player.fx = 1; player.fy = 0;
      const pos = [[70,0],[120,10],[170,-10],[230,5],[60,70],[-70,40],[-60,-60],[20,-110],[300,0]];
      return pos.map(([x,y]) => __dummy(x, y));
    };
    window.__measure = (cls, boonId, rar, skill) => {
      const foes = __scene(cls);
      if (boonId) player.boons = {[boonId]: rar};
      const b = boonId ? BOON_BY_ID[boonId] : null;
      const hp0 = heroes.map(h => h.hp), d0 = foes.reduce((s,e)=>s+Math.hypot(e.x-player.x, e.y-player.y), 0);
      const seen = {poison:0, bleed:0, burn:0, stun:0, slow:0, vuln:0};
      const dmg0 = player.stats ? player.stats.dmgDealt : 0; let stunMs = 0;
      const mark = () => { for (const e of foes){ if (e.poisonTimer>0) e._p=1; if (e.bleedTimer>0) e._b=1; if (e.burnTimer>0) e._u=1; if (e.stunTimer>0) e._s=1; const dot = (e.poisonTimer>0 ? e.poisonDmg||0 : 0) + (e.bleedTimer>0 ? e.bleedDmg||0 : 0) + (e.burnTimer>0 ? e.burnDmg||0 : 0); e._dot = Math.max(e._dot||0, dot); if ((e.stunTimer||0) > (e._sm||0)){ stunMs += e.stunTimer - (e._sm||0); } e._sm = e.stunTimer||0; if (e.slowTimer>0 && e.slowAmt>0) e._w=1; if (e._seVulnUntil > runElapsedMs) e._v=1; } };
      let zones = 0, shield = 0, dist = 0;
      if (skill === 'minion'){
        spawnNigroSkeleton(player, 'warrior', {}); const sk = player.skeletons[player.skeletons.length-1]; sk.x = player.x + 120; sk.y = player.y; sk.hp = 0; killNigroSkeleton(sk);
      } else {
        const sk = skill === 'ult' ? player.cls.ultimate : player.cls.skills[skill];
        player.aim = {x: player.x + 150, y: player.y, dx: 1, dy: 0};
        if (sk.kind === 'summon_golem'){ castAbility(player, sk, false, skill); } // arma el gólem; el refuerzo sale al armarse
        try { castAbility(player, sk, skill === 'ult', skill === 'ult' ? undefined : skill); } finally { player.aim = null; }
      }
      zones = champFx.filter(f => f.type === 'boonZone').length;
      mark();
      dist = foes.reduce((s,e)=>s+Math.hypot(e.x-player.x, e.y-player.y), 0);
      shield = heroes.reduce((s,h)=>s+(h.shield||0), 0);
      let t = 0; while (t < 2600 && state === 'playing'){ for (const h of heroes){ h.energy = h.maxEnergy; } update(16); mark(); t += 16; }
      const heal = heroes.reduce((s,h,i)=>s+(h.hp-hp0[i]), 0);
      for (const e of foes){ if (e._p) seen.poison++; if (e._b) seen.bleed++; if (e._u) seen.burn++; if (e._s) seen.stun++; if (e._w) seen.slow++; if (e._v) seen.vuln++; }
      // daño útil del jugador (stats) y enemigos que golpeó: la arena puede regenerar vida a la horda
      return { dmg: Math.round((player.stats ? player.stats.dmgDealt : 0) - dmg0), hits: foes.filter(e=>e.lastHitBy===player).length, stunMs: Math.round(stunMs), dot: Math.round(foes.reduce((s,e)=>s+(e._dot||0), 0)*10)/10, zones, shield: Math.round(shield), heal: Math.round(heal), pull: Math.round(d0 - dist), ...seen };
    };
  });

  // ---- datos: al menos 4 por guardián, rareza con valores distintos y dúos que apuntan a refuerzos del mismo guardián
  const data = await E(() => { const out = {}; for (const k of Object.keys(CLASSES)){ const L = BOONS.filter(b=>b.champ===k); out[k] = { n: L.filter(b=>!b.duo).length, duos: L.filter(b=>b.duo).length,
      rarityOk: L.filter(b=>!b.duo).every(b => b.fx.some(fx => Object.values(fx).some(v => Array.isArray(v) && new Set(v).size > 1) || (fx.status && Object.values(fx.status).some(v => Array.isArray(v) && new Set(v).size > 1)))),
      duoOk: L.filter(b=>b.duo).every(b => b.duo.every(id => BOON_BY_ID[id] && BOON_BY_ID[id].champ === k)),
      skillOk: L.every(b => !!boonSkillOf(b)), descOk: L.every(b => [0,1,2].every(r => typeof b.desc(r) === 'string' && !/undefined|NaN/.test(b.desc(r)))) }; } return out; });
  const badData = Object.entries(data).filter(([k,v]) => v.n < 4 || v.duos < 1 || !v.rarityOk || !v.duoOk || !v.skillOk || !v.descOk);
  check('DATA.todos_los_guardianes_con_4+_refuerzos_rareza_y_duo', Object.keys(data).length >= 38 && badData.length === 0, badData.length ? badData : Object.fromEntries(Object.entries(data).map(([k,v])=>[k, v.n+'+'+v.duos])));

  // ---- cada refuerzo transforma algo medible
  const list = await E(() => BOONS.map(b => ({ id: b.id, champ: b.champ, skill: b.minion ? 'minion' : b.skill, test: b.test })));
  const byChamp = {};
  for (const b of list){
    const res = await E(([b]) => { try { return { a: __measure(b.champ, null, 0, b.skill), z: __measure(b.champ, b.id, 2, b.skill) }; } catch (err) { return { err: err.message + ' ' + (err.stack||'').split('\n')[1] }; } }, [b]);
    if (res.err){ check(`BOON.${b.champ}.${b.id}`, false, res); continue; }
    const { a, z } = res; let ok;
    switch (b.test){
      case 'zone': ok = z.zones > 0 && (z.dmg > a.dmg || z.heal > a.heal || z.slow > a.slow); break;
      case 'hits': ok = z.hits > a.hits || (z.dmg > a.dmg*1.05 && z.hits >= a.hits); break;
      case 'dmg': ok = z.dmg > a.dmg*1.05; break;
      case 'minion': ok = z.dmg > a.dmg && (z.zones > 0 || z.poison > a.poison); break;
      case 'pull': ok = z.pull > a.pull + 20; break;
      case 'shield': ok = z.shield > a.shield; break;
      case 'heal': ok = z.heal > a.heal; break;
      case 'stun': ok = z.stunMs > a.stunMs + 150; break; // más aturdimiento total (la habilidad puede aturdir por su cuenta)
      case 'poison': case 'bleed': case 'burn': ok = z[b.test] > a[b.test] || z.dot > a.dot*1.1; break; // más enemigos con el estado, o más fuerte
      default: ok = z[b.test] > a[b.test]; // slow / vuln
    }
    (byChamp[b.champ] = byChamp[b.champ] || []).push(ok);
    check(`BOON.${b.champ}.${b.id} (${b.test})`, ok, { sin: a, con: z });
  }
  check('BOON.todos_los_guardianes_probados', Object.keys(byChamp).length === Object.keys(data).length, Object.keys(byChamp));

  // ---- rareza: el épico rinde más que el común (mismo refuerzo)
  const rar = await E(() => ({ c: __measure('segador', 'sg_rebote', 0, 0).hits, e: __measure('segador', 'sg_rebote', 2, 0).hits,
    zc: (__measure('mago', 'mg_escarcha', 0, 1), champFx.find(f=>f.type==='boonZone')), ze: (__measure('mago', 'mg_escarcha', 2, 1), champFx.find(f=>f.type==='boonZone')) }));
  check('RAREZA.epico_mas_fuerte_que_comun', rar.e > rar.c, { c: rar.c, e: rar.e });

  // ---- oferta de cartas
  const offer = await E(() => { __scene('mago'); const camp = [], end = []; for (let i = 0; i < 60; i++){ camp.push(boonBuildOffers(player, BUFF_POOL, false).filter(o=>o.startsWith('boon:')).length); end.push(boonBuildOffers(player, endlessBuffPool(), true).filter(o=>o.startsWith('boon:')).length); }
    const sizes = new Set([...Array(20)].map(() => boonBuildOffers(player, BUFF_POOL, false).length));
    player.boons = {mg_escarcha: 0, mg_bifurcada: 1}; const duoFirst = [...Array(20)].every(() => boonBuildOffers(player, BUFF_POOL, false).includes('boon:mg_duo:2'));
    const other = [...Array(20)].every(() => boonBuildOffers(player, BUFF_POOL, false).filter(o=>o.startsWith('boon:')).every(o => BOON_BY_ID[o.split(':')[1]].champ === 'mago'));
    return { campMin: Math.min(...camp), campMax: Math.max(...camp), endMax: Math.max(...end), endMin: Math.min(...end), sizes: [...sizes], duoFirst, other }; });
  check('OFERTA.campania_1_a_2_refuerzos_de_3', offer.campMin >= 1 && offer.campMax === 2 && offer.sizes.length === 1 && offer.sizes[0] === 3, offer);
  check('OFERTA.horda_infinita_1_refuerzo', offer.endMin === 1 && offer.endMax === 1, offer);
  check('OFERTA.duo_habilitado_sale_primero_y_solo_del_guardian', offer.duoFirst && offer.other, offer);

  // ---- pantalla de refuerzo real: cartas, elegir aplica y la habilidad lo muestra en el tooltip
  const ui = await E(() => { __scene('mago'); state = 'playing'; openBuffChoice(); const cards = [...document.querySelectorAll('#buff-cards .buff-card')];
    const boonCard = cards.find(c => c.classList.contains('boon')); const out = { n: cards.length, boonCards: cards.filter(c => c.classList.contains('boon')).length, txt: boonCard ? boonCard.textContent.replace(/\s+/g,' ').slice(0, 160) : '' };
    const lvl0 = runLevel; boonCard.click(); out.after = Object.keys(player.boons||{}); out.next = runLevel === lvl0 + 1 && state === 'playing';
    boonHudTick(); const btns = ['btn-s1','btn-s2','btn-s3','btn-ult'].map(id => document.getElementById(id)); out.title = btns.map(b => b.title).join(' | ').slice(0, 400); out.pip = btns.some(b => b.querySelector('.boon-pip'));
    renderStatsPanel(); out.pause = (document.getElementById('stats-panel')||{}).textContent.includes('Refuerzos de habilidad');
    return out; });
  check('UI.pausa_lista_los_refuerzos', ui.pause, ui.pause);
  check('UI.cartas_con_refuerzo_y_eleccion_aplica', ui.n === 3 && ui.boonCards >= 1 && /Transforma:/.test(ui.txt) && ui.after.length === 1 && ui.next, ui);
  check('UI.tooltip_y_marca_en_el_boton', /✦ /.test(ui.title) && ui.pip, ui);

  // ---- otro héroe (como el anfitrión con el invitado): el refuerzo es SUYO y se dispara con SU lanzamiento
  const other = await E(() => { const foes = __scene('guerrero'); const ally = heroes.find(h => h.classKey === 'mago');
    const okGrant = buffApplyOpt(ally, 'boon:mg_escarcha:1'); const mine = boonOwned(player, 'mg_escarcha');
    ally.x = foes[1].x; ally.y = foes[1].y; castAbility(ally, ally.cls.skills[1], false, 1);
    const z = champFx.filter(f => f.type === 'boonZone'); const wrong = buffApplyOpt(player, 'boon:mg_escarcha:1'); // no es de su guardián
    return { okGrant, mine, zones: z.length, owner: z[0] && z[0].owner === ally, wrongChamp: !!wrong && boonOwned(player, 'mg_escarcha') >= 0 }; });
  check('COOP.refuerzo_de_otro_heroe_se_aplica_a_el', other.okGrant && other.mine < 0 && other.zones === 1 && other.owner && !other.wrongChamp, other);

  // ---- sin fuego amigo: zonas y estallidos nunca lastiman a los aliados
  const ff = await E(() => { __scene('tanque'); player.boons = {tq_estela: 2, tq_trueno: 2, tq_duo: 2}; for (const h of heroes){ h.hp = h.maxHp; h.x = player.x + 10; } const hp = heroes.map(h => h.hp);
    castAbility(player, player.cls.skills[0], false, 0); castAbility(player, player.cls.skills[2], false, 2); for (let i = 0; i < 200; i++) update(16); return heroes.every((h,i) => h.hp >= hp[i] - 1); });
  check('REGLAS.sin_fuego_amigo', ff, ff);

  // ---- Horda Infinita: la elección propia muestra 1 refuerzo y se sigue jugando
  const en = await E(() => { if (typeof endlessOn !== 'function') return { skip: true }; __scene('segador');
    endlessOpenBuffChoice(); const cards = [...document.querySelectorAll('#buff-cards .buff-card')]; const out = { n: cards.length, boons: cards.filter(c => c.classList.contains('boon')).length };
    state = 'playing'; return out; });
  check('ENDLESS.eleccion_con_1_refuerzo', en.n === 3 && en.boons === 1, en);

  // ---- Talent Gate 40: la bolsa del árbol no consume puntos del kit
  const tal = await E(() => { const k = 'mago', c = save.champions[k]; c.talents = mkTalentState(); c.treeBonus = 0;
    const tree = talentTreeFor(k), roots = tree.nodes.filter(n => !n.requires), c2 = tree.nodes.find(n => n.requires === roots[0].id);
    c.level = 39; const at39 = { pts: treePointsAvailable(k), buy: buyTalentNode(k, roots[0].id, true).ok };
    c.level = 40; const tp0 = c.talentPoints; const at40 = { pts: treePointsAvailable(k), buy: buyTalentNode(k, roots[0].id, true).ok, left: treePointsAvailable(k), tpSame: c.talentPoints === tp0 };
    c.level = 44; for (let i = 0; i < 3; i++) buyTalentNode(k, roots[0].id, true); const c2at44 = talentNodeLockReason(k, c2);
    c.level = 45; const c2at45 = talentNodeLockReason(k, c2);
    c.level = 46; const c2at46 = talentNodeLockReason(k, c2);
    const curve = [1,39,40,60,90,99].map(l => treePointsEarned(l)); const tiers = tree.nodes.map(n => talentNodeMinLevel(k, n));
    c.level=39; const d = document.createElement('div'); document.body.appendChild(d); renderTalentTree(d, k, () => {}); const banner = (d.querySelector('.talent-lock-banner')||{}).textContent || ''; d.remove();
    return { at39, at40, c2at44, c2at45, c2at46, curve, maxTier: Math.max(...tiers), banner: banner.slice(0, 200) }; });
  check('TALENTOS.primer_punto_exclusivamente_en_40', !tal.at39.buy && tal.at39.pts === 0 && tal.at40.pts === 1 && tal.at40.buy && tal.at40.left === 0 && tal.at40.tpSame, tal);
  check('TALENTOS.escalon_y_presupuesto_independientes', /nivel 45/.test(tal.c2at44||'') && /Sin puntos/.test(tal.c2at45||'') && tal.c2at46 === null && tal.maxTier <= 75, tal);
  check('TALENTOS.curva_hasta_99_y_previsualizacion_bloqueada', JSON.stringify(tal.curve) === '[0,0,1,11,26,30]' && /nivel 40/.test(tal.banner), tal);

  // ---- migración de un guardado viejo (árbol pagado con la bolsa compartida)
  const mig = await E(() => { const old = JSON.parse(JSON.stringify(save)); delete old.talentTreeV2; delete old.talentGate40V1;
    const c = old.champions.axiom; c.level = 40; c.xp = 0; c.talentPoints = 3; c.unlocked = true;
    c.skillMastery = [{useXp:0,useLvl:1,alloc:10},{useXp:0,useLvl:1,alloc:10},{useXp:0,useLvl:1,alloc:6}]; c.ultMastery = {useXp:0,useLvl:1,alloc:0};
    c.talents = { nodes: {ax_sis_c1:3, ax_sis_c2:3, ax_sis_c3:3, ax_sis_s1:1}, picks:{}, mastery:null, masteryNodes:{} }; // 13 puntos gastados
    const g = old.champions.guerrero; g.level = 12; g.talentPoints = 11; g.talents = { nodes:{}, picks:{}, mastery:null, masteryNodes:{} };
    const h = old.champions.tanque; h.level = 9; h.talentPoints = 0; h.skillMastery = [{useXp:0,useLvl:1,alloc:3},{useXp:0,useLvl:1,alloc:3},{useXp:0,useLvl:1,alloc:0}];
    h.talents = { nodes: {tq_x:0}, picks:{}, mastery:null, masteryNodes:{} };
    const tn = talentTreeFor('tanque').nodes.filter(n => !n.requires).slice(0, 2); h.talents.nodes = {[tn[0].id]:3, [tn[1].id]:2}; // inversión histórica: se respalda, no se activa antes de 40
    localStorage.setItem(SAVE_KEY, JSON.stringify(old)); loadSave();
    const A = save.champions.axiom, G = save.champions.guerrero, T = save.champions.tanque;
    const out = { flag: save.talentTreeV2 && save.talentGate40V1, axBackup:A.talentGate40Legacy.nodes, axTP: A.talentPoints, axNodes: A.talents.nodes, axTree: treePointsAvailable('axiom'), axBonus: A.treeBonus||0,
      gTP: G.talentPoints, gTree: treePointsAvailable('guerrero'), tTP: T.talentPoints, tTree: treePointsAvailable('tanque'), tNodes: Object.values(T.talents.nodes).reduce((a,b)=>a+b,0), tBackup:Object.values(T.talentGate40Legacy.nodes).reduce((a,b)=>a+b,0) };
    loadSave(); out.again = save.champions.axiom.talentPoints; return out; });
  check('MIGRACION.respaldo_y_reembolso_legacy_una_vez', mig.flag === true && mig.axTP === 16 && Object.keys(mig.axNodes).length === 0 && mig.axBackup.ax_sis_s1 === 1 && mig.axBackup.ax_sis_c1 === 3 && mig.axTree === 1 && mig.axBonus === 0 && mig.again === 16, mig);
  check('MIGRACION.nivel_bajo_conserva_respaldo_sin_habilitar_arbol', mig.gTP === 11 && mig.gTree === 0 && mig.tTP === 5 && mig.tTree === 0 && mig.tNodes === 0 && mig.tBackup === 5, mig);

  // ---- partida real con bots que tienen refuerzos: nada se rompe
  const real = await E(() => { let casts = 0; for (const [cls, arena] of [['mago','bosque'], ['nigromante','hielo'], ['libertador','acuatica'], ['eren','infernal']]){
      __lvl(cls, 5); __start(6, arena, cls, ['profeta','cazadora','musashi']); spawnTimer = 0;
      for (const h of heroes){ h.boons = {}; for (const b of BOONS.filter(b => b.champ === h.classKey)) h.boons[b.id] = 2; }
      for (let i = 0; i < 1200 && state === 'playing'; i++){ for (const h of heroes) h.hp = h.maxHp; if (i % 40 === 0){ for (let s = 0; s < 3; s++) if (useSkill(s)) casts++; } update(16); if (i % 200 === 0) render(); } }
    return { casts, zones: champFx.filter(f => f.type === 'boonZone').length }; });
  check('PARTIDA.real_con_todos_los_refuerzos', real.casts > 20, real);
  check('SIN_ERRORES', errors.length === 0, errors.slice(0, 5));
  console.log(`SUMMARY ${fails === 0 ? 'OK' : 'FAIL'} fails=${fails}`);
  await browser.close();
  process.exit(fails ? 1 : 0);
})();
