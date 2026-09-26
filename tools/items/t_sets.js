// Auditoría de SETS: cada umbral (2 / 3 / 4 piezas) de cada set de campeón y de los universales se
// dispara de verdad (no solo figura en el texto), el set de campeón solo lo equipa su dueño, la
// skin solo aparece con el set COMPLETO del dueño y el color de la skin viaja a los invitados.
//   (python3 -m http.server 8771 &) ; node tools/items/t_sets.js
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const BASE = process.env.SE_BASE_URL || 'http://127.0.0.1:8771';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 400) : '')); if (!ok) fails++; };
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
    window.__clear = () => { save.stash = []; for (const k in save.champions) save.champions[k].equipment = mkEquipment(); invalidatePassiveCache(); };
    // champ con `n` piezas del set (en el orden de sus piezas) y una partida con un aliado Tanque
    window.__run = (champ, set, n, allies) => {
      for (const k of Object.keys(save.champions)) save.champions[k].unlocked = true;
      __clear();
      setPieceIds(set).slice(0, n).forEach(p => { const it = makeDesignedItem(p); stashItems().push(it); equipItem(champ, it.uid); });
      invalidatePassiveCache();
      selectedClass = champ; currentArena = 'bosque'; lobbyAllies = allies || ['tanque']; startRun(1); spawnTimer = 1e12; enemies.length = 0; levelDuration = 9e9;
      runElapsedMs = 100000; _passiveFrame++;
      return player;
    };
    window.__foe = (dx, dy, rank) => { const e = spawnEnemy('zombie', false); e.x = player.x + (dx||40); e.y = player.y + (dy||0); e.hp = e.maxHp = 50000; if (rank) e.rank = rank; return e; };
    window.__tick = (ms) => { for (let t = 0; t < ms; t += 16){ runElapsedMs += 16; update(16); } };
  });

  // ---------- reglas de equipo ----------
  const eq = await E(() => {
    const out = {};
    for (const id in CHAMPION_SETS) {
      const S = CHAMPION_SETS[id], it = makeDesignedItem(setPieceIds(id)[0]);
      const other = S.champion === 'tanque' ? 'mago' : 'tanque';
      out[id] = { owner: canEquipItem(S.champion, it), other: canEquipItem(other, it) };
    }
    const uni = makeDesignedItem(setPieceIds('glaciar')[0]);
    return { champ: out, universalAll: ['tanque','mago','eren','soporte'].every(c => canEquipItem(c, uni)) };
  });
  check('REGLA.set_de_campeon_solo_su_dueno', Object.values(eq.champ).every(o => o.owner && !o.other), eq.champ);
  check('REGLA.set_universal_lo_usa_cualquiera', eq.universalAll);

  // ---------- 2 piezas: estadística / bonus de cada set de campeón ----------
  const two = await E(() => {
    const out = {};
    const stat = { baluarte:['hp_mult',0.15], nocturno:['crit_chance_add',0.08], convergencia:['skilldmg_mult',0.10], custodio:['heal_mult',0.12],
      sistema:['cd_mult',0.08], profecia:['heal_mult',0.12], errante:['atkspeed_mult',0.10], manada:['speed_mult',0.08], granadero:['dmg_mult',0.10] };
    for (const id in stat) {
      const c = CHAMPION_SETS[id].champion; __run(c, id, 1); const a = passiveSum(c, stat[id][0]);
      __run(c, id, 2); const b = passiveSum(c, stat[id][0]);
      out[id] = Math.abs((b - a) - stat[id][1]) < 1e-6;
    }
    __run('segador', 'marea', 2); out.marea = setFuryMult(player) === 1.2;
    __run('eren', 'legion', 2); out.legion = setFuryMult(player) === 1.15;
    __run('nigromante', 'requiem', 2); out.requiem = champSetExtraSkeletons(player) === 1;
    return out;
  });
  check('2P.todos_los_sets_de_campeon', Object.values(two).every(Boolean), two);

  // ---------- 3 y 4 piezas: comportamiento ----------
  const r = await E(() => {
    const out = {};
    // Baluarte 3: habilidad del Tanque aturde/empuja · 4: cada 3er básico = pisotón
    __run('tanque', 'baluarte', 4); let e = __foe(40); let hp0 = e.hp;
    champSetsOnHit(player, e, 10, false, {}); out.baluarte3 = e.stunTimer > 0;
    e.stunTimer = 0;
    for (let i = 0; i < 3; i++){ runElapsedMs += 50; champSetsOnHit(player, e, 10, false, {fromBasic:true}); }
    out.baluarte4 = e.hp < hp0;
    // Sombra Nocturna 3: habilidad contra sangrante = crítico · 4: baja de élite = sigilo + reinicia Triple Golpe
    __run('guerrero', 'nocturno', 4); e = __foe(40); e.bleedTimer = 2000;
    const cb = champSetCritBonus(player, e, {}); out.nocturno3 = !!cb && cb.chance === 1;
    player.cds[1] = 5000; e.rank = 'elite'; champSetsOnKill(player, e); out.nocturno4 = player.stealthTimer > 0 && player.cds[1] === 0;
    // Convergencia 3: cambiar de elemento = +25% · 4: fuego+hielo+rayo = estallido
    __run('mago', 'convergencia', 4); e = __foe(60);
    champSetsOnCast(player, {element:'fire'}, false); champSetsOnCast(player, {element:'ice'}, false);
    out.convergencia3 = player._elemSwapT > 0 && champSetDamageMult(player, e, {}) > 1.2;
    hp0 = e.hp; champSetsOnHit(player, e, 1, false, {burn:true}); champSetsOnHit(player, e, 1, false, {slow:0.3}); champSetsOnHit(player, e, 1, false, {chain:true});
    out.convergencia4 = e.hp < hp0 && e.frozenTimer > 0;
    // Custodio 3: Bendición/Escudo curan en el tiempo · 4: Ángel Guardián a un aliado bajo 30%
    __run('soporte', 'custodio', 4); const ally = heroes.find(h => h !== player);
    ally.x = player.x + 60; ally.y = player.y;
    champSetsOnCast(player, {kind:'team_atk_buff', radius:300}, false); out.custodio3 = ally.regenTimer > 0 && ally.regenPerSec > 0;
    ally.hp = ally.maxHp*0.2; ally.shield = 0; champSetsOnHurt(ally, 10); out.custodio4 = ally.shield > 0 && ally._guardDRT > 0;
    // Marea Roja 3: con +50% de Furia el básico sangra · 4: bajas con poca vida suman Sangre y el Tajo remata
    __run('segador', 'marea', 4); e = __foe(50); player.energy = player.maxEnergy;
    champSetsOnHit(player, e, 10, false, {fromBasic:true}); out.marea3 = e.bleedTimer > 0;
    player.hp = player.maxHp*0.3; for (let i = 0; i < 10; i++) champSetsOnKill(player, __foe(400));
    out.marea4_cargas = player._tide === 10;
    const w = __foe(80); w.hp = w.maxHp*0.2; player.fx = 1; player.fy = 0;
    champSetsOnCast(player, {kind:'cone_slash'}, false); out.marea4_tajo = !w.alive || w.hp <= 0;
    // Acceso Raíz 3: el teletransporte deja un glitch que daña · 4: infectados contagian y bajan Error 404
    __run('axiom', 'sistema', 4, []); allies.length = 0; heroes = [player]; e = __foe(20); e.speed = 0; hp0 = e.hp;   // sin bots que lo saquen del radio
    const od = damageEnemy; let glitch = 0; damageEnemy = function(t, d, o){ if (t === e && o && o.fromProc && o.slow) glitch++; return od.apply(this, arguments); };
    try { champSetsOnCast(player, {kind:'teleport_blink'}, false); __tick(900); } finally { damageEnemy = od; }
    out.sistema3 = glitch > 0;
    const inf = __foe(300), n1 = __foe(330); inf._overwriteBy = player; player.cds[0] = 5000;
    champSetsOnKill(player, inf); out.sistema4 = n1._overwriteBy === player && player.cds[0] <= 4000;
    // La Última Profecía 3: el Giro cura a los cercanos · 4: salva de un golpe letal
    __run('profeta', 'profecia', 4); const a2 = heroes.find(h => h !== player); a2.x = player.x + 50; a2.y = player.y; a2.hp = a2.maxHp*0.5;
    const before = a2.hp; champSetOnPresagio(player); out.profecia3 = a2.hp > before;
    a2.hp = 0.5; out.profecia4 = heroPreventDeath(a2, null) === true && a2.invulnTimer > 0;
    // El Rōnin Errante 3: Paso Perfecto reinicia Corte · 4: Iaijutsu tras 1,2 s sin atacar
    __run('musashi', 'errante', 4); player.cds[0] = 4000; champSetOnPerfectStep(player); out.errante3 = player.cds[0] === 0;
    player._lastBasicAt = runElapsedMs - 2000; out.errante4 = champSetIaijutsu(player) === true && champSetIaijutsu(player) === false;
    // La Manada 3: lo atrapado pasa a ser Presa y las flechas contra la presa atrapada son críticas · 4: lobo
    __run('cazadora', 'manada', 4); e = __foe(120); champSetOnTrapRoot(player, e); e.stunTimer = 1000;
    const mc = champSetCritBonus(player, player.huntTarget || e, {fromBasic:true});
    out.manada3 = player.huntTarget === e && !!mc && mc.chance === 1;
    champSetOnCornered(player); out.manada4 = !!player.wolf;
    // Granadero 3: el fusil aturde · 4: disparo que mata recarga
    __run('libertador', 'granadero', 4); e = __foe(120); player.smMounted = false;
    champSetsOnHit(player, e, 10, false, {fromBasic:true}); out.granadero3 = e.stunTimer > 0;
    player.basicCd = 900; champSetsOnKill(player, e); out.granadero4 = player.basicCd <= 60;
    // Réquiem 3: gastar almas cura · 4: legión (con 5 esqueletos) reduce el daño recibido
    __run('nigromante', 'requiem', 4); player.hp = player.maxHp*0.5; const h0 = player.hp;
    champSetOnSoulsSpent(player, 3); out.requiem3 = player.hp > h0;
    while (player.skeletons.length < 5) spawnNigroSkeleton(player, 'warrior', {});
    out.requiem4 = champSetLegion(player) && setDmgTakenMult(player) < 1;
    // Legión 3: gancho que corta a 3+ baja el enfriamiento · 4: titán dura +30% y cura por baja
    __run('eren', 'legion', 4); player.cds[0] = 4000; champSetOnHookEnd(player, 3); out.legion3 = player.cds[0] === 2000;
    player.erenTitan = true; player.hp = player.maxHp*0.5; const h1 = player.hp; champSetsOnKill(player, __foe(300));
    out.legion4 = champSetTitanDurMult(player) === 1.3 && player.hp > h1; player.erenTitan = false;
    return out;
  });
  for (const k in r) check('SET.' + k, r[k] === true, r[k]);

  // ---------- universales (4 piezas) ----------
  const u = await E(() => {
    const out = {};
    __run('guerrero', 'glaciar', 4); let e = __foe(40);
    setsOnHit(player, e, 10, false, {}); out.glaciar2 = e.slowTimer > 0; out.glaciar3 = setDamageMult(player, e, {}) >= 1.12;
    let hp0 = e.hp; for (let i = 0; i < 6; i++){ runElapsedMs += 200; setsOnHit(player, e, 10, false, {}); } out.glaciar4 = e.hp < hp0;
    __run('tanque', 'coloso', 4); player.hp = player.maxHp; e = __foe(60); hp0 = e.hp;
    setsOnHurt(player, 1, player.maxHp*0.35, 0); out.coloso4 = e.hp < hp0;
    __run('mago', 'tempestad', 4); for (let i = 0; i < 30; i++) setsOnHit(player, __foe(500), 1, false, {}); out.tempestad4 = player._stormReady === true;
    __run('guerrero', 'berserker', 4); player.hp = player.maxHp*0.25; setsOnHurt(player, 1, 0, 0); out.berserker4 = player._berserkT > 0 && setAtkSpeedMult(player) > 1;
    __run('tanque', 'guardian', 4); out.guardian3 = setReviveHpPct(player) === 0.6;
    __run('soporte', 'alba', 4); setsOnHeal(player, player.maxHp); out.alba4 = player._albaReady === true;
    __run('guerrero', 'cazador', 4); e = __foe(40, 0, 'elite'); out.cazador2 = setDamageMult(player, e, {}) >= 1.1;
    setsOnHit(player, e, 1, false, {}); for (let i = 0; i < 5; i++){ runElapsedMs += 200; setsOnHit(player, e, 1, false, {}); } out.cazador4 = player._focus >= 4;
    __run('mago', 'arcano', 4); const sk = player.cls.skills; setsOnCast(player, sk[0], false); setsOnCast(player, sk[1], false); setsOnCast(player, sk[2], false); out.arcano4 = player._arcaneT > 0;
    __run('guerrero', 'laberinto', 4); __tick(3200); out.laberinto4 = (player._momentum||0) >= 1;
    __run('nigromante', 'sepulturero', 4); out.sepulturero2 = setSummonMult(player) === 1.2;
    __run('mago', 'tempestad', 3); out.tempestad3 = Math.abs(passiveSum('mago', 'onhit_proc') - 0.10) < 1e-6;
    // Lucifer (6 piezas): 4 = los básicos queman (y nada más: sin descarga eléctrica escondida) · 6 = infierno
    const L = setPieceIds('lucifer'); __clear(); L.forEach(p => { const it = makeDesignedItem(p); stashItems().push(it); equipItem('guerrero', it.uid); }); invalidatePassiveCache();
    selectedClass = 'guerrero'; lobbyAllies = []; startRun(1); enemies.length = 0; runElapsedMs = 100000; _passiveFrame++;
    e = __foe(40); setsOnHit(player, e, 10, false, {fromBasic:true});
    out.lucifer4_quema = e.burnTimer > 0; out.lucifer4_sin_rayo_oculto = passiveSum('guerrero', 'onhit_proc') === 0;
    out.lucifer6 = passiveSum('guerrero', 'dmg_mult') >= 0.15 && passiveSum('guerrero', 'lifesteal_add') >= 0.08;
    return out;
  });
  for (const k in u) check('UNI.' + k, u[k] === true, u[k]);

  // ---------- skins: solo el dueño con el set completo; con 3 piezas no hay skin ----------
  const sk = await E(() => {
    const out = {};
    for (const id in SET_SKINS) {
      const c = SET_SKINS[id].champ;
      __run(c, id, 3); const three = !!activeSetSkin(player);
      __run(c, id, 4); const four = activeSetSkin(player) === SET_SKINS[id];
      updateSets(player, 16);
      out[id] = !three && four && player.skinSet === id;
    }
    return out;
  });
  check('SKIN.solo_con_set_completo_y_sincronizada', Object.values(sk).every(Boolean), sk);

  // ---------- color de la skin en los efectos (viaja en los argumentos) ----------
  const tint = await E(() => {
    __run('segador', 'marea', 4); for (let i = 0; i < 4; i++) __foe(50 + i*20, i*10 - 15);
    const rec = []; const orig = NET_ORIG.vfxBurst || vfxBurst;
    const save0 = netMatch; netMatch = {role:'host', recording:true};
    const oldRec = netRecord; netRecord = (n, a) => rec.push([n, n === 'vfxShock' ? a[4] : a[3]]);
    try { for (const i of [0,1,2]) castAbility(player, player.cls.skills[i], false, i); castAbility(player, player.cls.ultimate, true); } finally { netRecord = oldRec; netMatch = save0; }
    const bursts = rec.filter(r => r[0] === 'vfxBurst'), shocks = rec.filter(r => r[0] === 'vfxShock');
    const base = hexToRgb(player.cls.glow);
    return { n: bursts.length, tinted: bursts.every(b => String(b[1]).startsWith('t_#') || ['blood','flesh','bone','rot','rock','gore'].includes(b[1])),
             shocks: shocks.length, shockTinted: shocks.every(x => x[1] !== base) };
  });
  check('SKIN.color_en_los_eventos_de_red', tint.n > 0 && tint.tinted && tint.shocks > 0 && tint.shockTinted, tint);

  check('sin_errores_de_pagina', errors.length === 0, errors.slice(0, 5));
  await browser.close();
  console.log(fails ? `\n${fails} FALLAS` : '\nTODO OK');
  process.exit(fails ? 1 : 0);
})();
